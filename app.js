(function(){
  'use strict';
  const E=window.GEngine,D=window.GDATA,R=window.GRULES,Guides=window.GRecommendations,M=window.GMetrics;
  const root=document.getElementById('app'),storageKey='teyvat-stat-lab-v7';
  const openedCards=new Map();
  const invalidInputs=new Map();
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const copy=o=>JSON.parse(JSON.stringify(o));
  let config=E.defaultConfig('那维莱特'),tab='optimize',goal='',results={optimize:{},marginal:{}},dirty=false,busy=false,error='',progress=0;
  const ocr={busy:false,progress:0,message:'',draft:null,error:'',confirmed:false,controller:null,editTotals:false};
  let ocrDragDepth=0;
  config.panelMode='character';
  config.teammates=[];config.teamRows=[];config.supportPanelMode='base';config.metricRevision=1;
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('teyvat-stat-lab-v6')||localStorage.getItem('teyvat-stat-lab-v5')||localStorage.getItem('teyvat-stat-lab-v4')||'null');if(saved?.character){config=readConfig(saved);}}catch{}
  config.metricSettings=M.settings(config);
  function readConfig(input){
    if(!input||typeof input!=='object'||Array.isArray(input)||!E.character(input.character))throw new Error('配置中的角色不存在。');
    function safe(value,depth=0){
      if(depth>12)throw new Error('配置嵌套过深。');
      if(typeof value==='number'&&!Number.isFinite(value))throw new Error('配置包含无效数字。');
      if(typeof value==='string'&&value.length>20000)throw new Error('配置字段过长。');
      if(value&&typeof value==='object')for(const [key,v]of Object.entries(value)){
        if(['__proto__','constructor','prototype'].includes(key))throw new Error('配置包含不允许的字段。');
        safe(v,depth+1);
      }
    }
    safe(input);
    const base=E.defaultConfig(input.character),out={...base,...input};
    out.supportPanelMode=input.supportPanelMode||((input.teammates||[]).some(t=>Object.values(t.panel||{}).some(v=>v!==''&&v!==undefined))?'combat':'base');
    if(!['base','combat'].includes(out.supportPanelMode))throw new Error('辅助面板口径无效。');
    for(const key of ['conditions','mains','panel','panelSettings','panelExtra','artifactPanel','talents','minRecharge','reservedRechargeRolls','customWeapon'])out[key]={...base[key],...(input[key]||{})};
    out.parameters={solo:{},team:{},...(input.parameters||{})};
    out.metricSettings=M.settings(out);
    if(out.metricIds!==undefined&&(!Array.isArray(out.metricIds)||out.metricIds.length>40||out.metricIds.some(id=>typeof id!=='string')))throw new Error('伤害指标列表无效。');
    if(!input.metricRevision&&Array.isArray(out.metricIds)){
      const ids=new Set(out.metricIds),addPair=(old,id)=>{if(ids.has(old))ids.add(id);},cons=Number(out.cons)||0;
      if(out.character==='兹白'){addPair('detail-3','detail-6');if(cons>=4)addPair('detail-1','zibai-n4-c4');}
      if(out.character==='玛拉妮')addPair('detail-1','detail-2');
      if(out.character==='法尔伽'&&cons>=1){addPair('detail-1','detail-4');addPair('detail-2','detail-5');}
      if(out.character==='神里绫华'&&cons>=6)addPair('detail-0','ayaka-ca-c6');
      if(out.character==='迪希雅'&&cons>=2)addPair('detail-1','dehya-e-c2');
      if(out.character==='瓦雷莎'&&cons>=4){addPair('detail-3','detail-4');addPair('detail-4','detail-3');}
      if(out.character==='莫娜'&&cons>=6)for(const i of [0,1,2])addPair('detail-'+i,'mona-c6-'+i);
      if(out.character==='恰斯卡'&&cons>=6)for(const i of [0,1,2,3])addPair('detail-'+i,'chasca-c6-'+i);
      out.metricIds=[...ids];
    }
    if(out.character==='奈芙尔'&&Array.isArray(out.metricIds))out.metricIds=[...new Set(out.metricIds.map(id=>/^detail-[0-48]$/.test(id)?'nefer-ca':/^detail-[56]$/.test(id)?'nefer-q':id))];
    out.metricRevision=1;
    for(const key of ['rotation','teammates','teamRows','contributors','disabledBuffs','sets'])if(!Array.isArray(out[key]))throw new Error(key+' 应是列表。');
    if(out.rotation.length>160||out.teammates.length>3||out.contributors.length>3||out.teamRows.length>100)throw new Error('配置中的技能项、队友或增益过多。');
    for(const t of out.teammates)if(t?.character&&!E.character(t.character))throw new Error('配置含未知队友。');
    return out;
  }
  function get(path,obj=config){return path.split('.').reduce((o,k)=>o?.[k],obj);}
  function set(path,value,obj=config){const keys=path.split('.');let a=obj;for(let i=0;i<keys.length-1;i++){const k=keys[i];if(a[k]===undefined)a[k]=/^\d+$/.test(keys[i+1])?[]:{};a=a[k];}a[keys.at(-1)]=value;}
  function clear(path){const keys=path.split('.'),key=keys.pop(),parent=get(keys.join('.'));if(parent)delete parent[key];}
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(config));}catch{}}
  const fmt=(n,d=0)=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:d,minimumFractionDigits:d});
  const pct=n=>(n>0?'+':'')+fmt(n,Math.abs(n)>0&&Math.abs(n)<.01?4:2)+'%';
  function option(value,label,selected){return '<option value="'+esc(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+esc(label)+'</option>';}
  function optionsHTML(items,selected){return items.map(o=>Array.isArray(o)?option(o[0],o[1],selected):'<optgroup label="'+esc(o.label)+'">'+optionsHTML(o.options,selected)+'</optgroup>').join('');}
  function field(label,path,type='number',extra={}) {
    let input='';const value=Object.hasOwn(extra,'value')?extra.value:get(path)??'',id='field-'+path.replaceAll('.','-');
    if(path.startsWith('metricSettings.states.')&&M.fieldMinCons(path.split('.').at(-1))>Number(config.cons||0))return '<div class="field wide disabled-state"><label>'+esc(label)+'</label><span class="muted">未解锁，需'+M.fieldMinCons(path.split('.').at(-1))+'命；不计入计算</span></div>';
    if(extra.options)input='<select id="'+id+'" data-path="'+esc(path)+'"'+(extra.numeric?' data-number="true"':'')+'>'+optionsHTML(extra.options,value)+'</select>';
    else input='<input id="'+id+'" type="'+type+'" data-path="'+esc(path)+'" value="'+esc(value)+'"'+(extra.talentUplift!==undefined?' data-talent-uplift="'+extra.talentUplift+'"':'')+(type==='number'?' step="'+(extra.step||'any')+'"':'')+(extra.min!==undefined?' min="'+extra.min+'"':'')+(extra.max!==undefined?' max="'+extra.max+'"':'')+(extra.placeholder?' placeholder="'+esc(extra.placeholder)+'"':'')+'>';
    return '<div class="field'+(extra.wide?' wide':'')+'"><label for="'+id+'">'+esc(label)+'</label>'+input+(extra.help?'<p class="help">'+esc(extra.help)+'</p>':'')+'</div>';
  }
  function customSelfFor(path){
    const top=['sandroneTactics','skirkSerpent','skirkRifts','skirkSpecialQActive','skirkWitherActive','skirkC6Stacks'];
    if(!path.startsWith('metricSettings.states.')&&!top.some(k=>path==='metricSettings.'+k)&&path!=='metricSettings.ownBuffMode')return;
    if(M.settings(config).ownBuffMode!=='full')return;
    const metric=activeMetric(),preview=metric?{...config,_metric:metric}:config,current=M.settings(preview);
    config.metricSettings={...current,ownBuffMode:'custom',states:{...M.defaultStates(preview),...current.states}};
    config.disabledBuffs=(config.disabledBuffs||[]).filter(id=>!id.startsWith('self:'));
  }
  function controlValue(el){if(el.dataset.boolean==='true')return el.value===''?undefined:el.value==='true';if(el.type==='checkbox')return el.checked;if((el.type==='number'||el.dataset.number==='true')&&el.value!==''&&!el.value.startsWith('nicole-'))return Number(el.value)-Number(el.dataset.talentUplift||0);return el.value;}
  function talentFields(index=null){
    const T=window.GTeam,scope=index===null&&!config.teammates?.some(t=>t.character)?'solo':'team',info=T.talentInfo(config,index,scope);if(!info)return '';
    const path=index===null?'talents.':'teammates.'+index+'.talents.',keys=index===null?['a','e','q']:['e','q'];
    return '<div class="fields '+(index===null?'three':'')+'">'+keys.map(k=>field(({a:'普通攻击',e:'战技 E',q:'爆发 Q'})[k]+'实际等级',path+k,'number',{value:info.levels[k],min:1+info.uplift[k],max:10+info.uplift[k],step:1,talentUplift:info.uplift[k],help:'培养等级 '+info.base[k]+(info.uplift[k]?' + 自动加级 '+info.uplift[k]:'')})).join('')+'</div>';
  }
  function check(label,path,value=get(path)){
    const need=path.startsWith('metricSettings.states.')?M.fieldMinCons(path.split('.').at(-1)):0,unavailable=need>Number(config.cons||0);
    const preset=/^teammates\.\d+\.setActive$/.test(path)&&M.settings(config).artifactMode==='full'||/^teammates\.\d+\.weaponActive$/.test(path)&&M.settings(config).weaponMode==='full';
    return '<label class="check-row'+(unavailable?' disabled-state':'')+'"><input type="checkbox" data-path="'+path+'"'+(!unavailable&&(preset||value)?' checked':'')+(preset||unavailable?' disabled':'')+'>'+esc(label)+(unavailable?'（未解锁，需'+need+'命；不计入）':preset?'（满效果预设）':'')+'</label>';
  }
  function elementChecks(label,path){const selected=get(path)||[];return '<fieldset class="element-picker"><legend>'+esc(label)+'</legend>'+['pyro','hydro','cryo','electro','anemo','geo','dendro'].map(k=>'<label><input type="checkbox" data-list-path="'+esc(path)+'" data-list-value="'+k+'"'+(selected.includes(k)?' checked':'')+'>'+E.ELEMENT[k]+'</label>').join('')+'</fieldset>';}
  function card(title,body,{detail=false,open=false,tag='',stateKey=title}={}){const expanded=openedCards.get(stateKey)??open;return detail?'<details class="card details-card" data-card-title="'+esc(stateKey)+'"'+(expanded?' open':'')+'><summary>'+esc(title)+'</summary><div class="card-body">'+body+'</div></details>':'<section class="card"><div class="card-head"><h3>'+esc(title)+'</h3>'+(tag?'<span class="section-tag">'+esc(tag)+'</span>':'')+'</div><div class="card-body">'+body+'</div></section>';}
  const mainOptions={sands:['atkPct','hpPct','defPct','mastery','recharge'],goblet:['dmg',...['pyro','hydro','cryo','electro','anemo','geo','dendro'].map(k=>'dmg_'+k),'phy','atkPct','hpPct','defPct','mastery'],circlet:['cpct','cdmg','atkPct','hpPct','defPct','mastery','heal']};
  function skillOptions(selected) {
    let html=R[config.character].details.map((d,index)=>({d:E.resolveDetail(config,index),index})).filter(({d})=>E.isDamageDetail(d)).map(({d,index})=>option(index,(d.cons?'C'+d.cons+' · ':'')+d.title,selected)).join('');
    const nicole=config.teammates?.find(t=>t.character==='尼可');
    if(nicole){html+=option('nicole-q','组队：尼可Q投影',selected);if(nicole.cons>=1)html+=option('nicole-c1','组队：尼可C1合一投影',selected);}
    return html;
  }
  const reactions=[['native','按技能公式'],['none','不反应'],['vaporize','蒸发'],['melt','融化'],['aggravate','超激化'],['spread','蔓激化']];
  function momentFields(path){
    const keys=[['currentHpPct','此段生命比例 %',0,100],...({阿蕾奇诺:[['BondOfLife','此击生命之契 %',0,200]],那维莱特:[],奈芙尔:[['Veil_of_Falsehood','此段伪秘之帷层数',0,5]],薇斯纳:[['vesnaOrder','此段整肃层数',0,6]],洛恩:[['争胜','此段实际争胜',0,config.cons>=1?300:100]],雷电将军:[['num','此段已有愿力',0,60]],丝柯克:[['skirkSerpent','此段蛇之狡谋',0,100]],玛拉妮:[['mualaniWaveStacks','此击浪势层数',0,3],['mualaniWaveWisdom','本次Q消耗心得',0,3]],基尼奇:[['kinichHunterStacks','本炮猎人心得层数',0,2]]}[config.character]||[])];
    const existing=new Set(keys.map(x=>x[0]));
    const states=E.stateFields(config).filter(f=>!existing.has(f[0])&&f[2]!=='elements').map(([key,label,type,max,,integer=true])=>{
      if(type==='bool'){const value=get(path+'.'+key);return '<div class="field wide"><label>'+esc(label)+'</label><select data-path="'+path+'.'+key+'" data-boolean="true">'+option('','沿用全局状态',value===undefined?'':String(value))+option('true','本项已生效',String(value))+option('false','本项未生效',String(value))+'</select></div>';}
      if(type==='select')return field(label,path+'.'+key,'text',{options:[['','沿用全局状态'],...max]});
      return field(label,path+'.'+key,'number',{min:type,max,step:integer?'1':'any',placeholder:'留空沿用全局状态'});
    }).join('');
    return '<div class="fields">'+keys.map(([key,label,min,max])=>field(label,path+'.'+key,'number',{min,max,placeholder:'留空沿用技能状态'})).join('')+'</div>'+(states?'<details class="method-details"><summary>本项的角色 / 武器 / 套装状态</summary><div class="fields">'+states+'</div></details>':'');
  }
  function phaseFields(path,enabledPath){
    const enabled=get(enabledPath);let html=check('为此项单独设置队友增益状态',enabledPath);
    if(enabled)for(let i=0;i<3;i++){const t=config.teammates?.[i];if(!t?.character)continue;html+='<div class="contributor"><strong>'+esc(t.character)+'</strong>'+[['castE','战技效果生效'],['castQ','爆发效果生效'],['characterActive','额外角色条件成立'],['weaponActive','武器共享效果生效'],['setActive','套装共享效果生效']].map(([k,l])=>check(l,path+'.teammates.'+i+'.'+k)).join('')+'<div class="fields" style="margin-top:8px">'+window.GTeam.supportInputs(t).map(k=>field('此项队友'+({atk:'攻击',hp:'生命',def:'防御',mastery:'精通',cpct:'暴率 %'})[k],path+'.teammates.'+i+'.panel.'+k,'number',{placeholder:'留空沿用队友面板'})).join('')+'</div></div>';}
    return html;
  }
  function characterCard() {
    const c=E.character(config.character);
    const chars=['那维莱特','胡桃','艾尔海森','兹白','菲林斯','奈芙尔','薇斯纳','桑多涅'];
    const levels=Object.keys(c.stats.details).filter(k=>['80','80+','90','100'].includes(k));
    return card('角色与武器','<div class="character-box"><input id="character-search" aria-label="搜索角色名称" value="'+esc(config.character)+'" autocomplete="off"><span class="search-mark">⌕</span><div id="character-results" class="character-results hidden"></div></div>'+
      '<div class="character-meta"><span class="element '+c.element+'">'+E.ELEMENT[c.element]+'</span>'+c.star+'星 · '+E.WEAPON[c.weapon]+'<span> / '+esc(c.title)+'</span></div>'+
      (c.talentMale?'<div class="fields">'+field('旅行者','travelerGender','text',{wide:true,options:[['female','荧'],['male','空']]})+'</div>':'')+
      '<div class="quick-chars">'+chars.map(k=>'<button class="chip'+(k===config.character?' selected':'')+'" data-character="'+k+'">'+k+'</button>').join('')+'</div>'+
      '<div class="fields">'+field('角色等级','level','text',{options:levels.map(k=>[k,k+'级'])})+field('命座','cons','number',{numeric:true,options:[0,1,2,3,4,5,6].map(n=>[n,n+'命'])})+'</div>'+
      '<div class="divider"></div><div class="fields">'+field('武器（90级）','weapon','text',{wide:true,options:Guides.weaponOptions(c.key,{custom:true})})+
      field('武器精炼','refine','number',{numeric:true,options:[1,2,3,4,5].map(n=>[n,'精炼'+n])})+'<div class="field"><label>一个词条的单位</label><span class="stat-pill">五星四档平均 · 暴率 3.305%</span></div></div>'+
      (config.weapon==='custom'?'<div class="divider"></div><div class="fields">'+field('武器基础攻击','customWeapon.base')+field('武器副属性','customWeapon.bonusKey','text',{options:[['none','无'],...Object.keys(E.ROLLS).filter(k=>!k.endsWith('Plus')).map(k=>[k,E.LABELS[k]])]})+field('副属性数值','customWeapon.bonus')+'</div>':D.weapons.find(w=>w.name===config.weapon)?.maxLevel===70?'<p class="help">这把低星武器最高70级，按实际满级数值计算。</p>':'')+
      '<div class="divider"></div>'+talentFields()+'<p class="help">显示命座与当前队伍加级后的实际等级，修改命座会自动更新。内部保留培养等级，避免重复加级；单人、组队资格不同时，各项计算依据分别列明实际等级。</p>',{tag:'01 / CHARACTER'});
  }
  function artifactsCard() {
    return card('五件圣遗物','<div class="stat-pills"><span class="stat-pill">生之花 · 生命值 +4,780</span><span class="stat-pill">死之羽 · 攻击力 +311</span></div>'+
      '<div class="fields">'+Object.keys(mainOptions).map(slot=>field(({sands:'时之沙主属性',goblet:'空之杯主属性',circlet:'理之冠主属性'})[slot],'mains.'+slot,'text',{wide:slot==='circlet',options:[['','请选择主属性'],...mainOptions[slot].map(k=>[k,E.LABELS[k]+' +'+E.MAIN[k]+(k==='mastery'?'':'%')])]})).join('')+'</div>'+
      '<div class="divider"></div><div class="fields">'+field('套装效果','setChoice','text',{wide:true,options:Guides.artifactOptions(config.character)})+
      (config.setChoice==='two'?['0','1'].map(i=>field('两件套 '+(Number(i)+1),'sets.'+i+'.name','text',{wide:true,options:[['','请选择两件套'],...D.artifacts.filter(a=>a.maxRarity===5).map(a=>[a.name,a.name])]})).join(''):'')+'</div><p class="help">主角色按五星、20级圣遗物计算。伤害杯可选择具体元素；月/星伤害不直接使用普通元素伤害加成。推荐四件套包含条件项，请核对下方触发状态；二加二仍按两件套效果另选。</p>',{tag:'02 / ARTIFACTS'});
  }
  function budgetCard() {
    return card('有效副词条预算','<div class="budget-line"><div><h3>等效词条总数</h3><small>花、羽、沙、杯、冠的有效副词条合计</small></div><input type="number" min="0" max="60" step="0.1" data-path="budget" id="budget-number" value="'+esc(config.budget)+'" aria-label="有效词条总数"></div><input class="range" id="budget-range" type="range" min="0" max="60" step="0.5" value="'+esc(config.budget)+'" aria-label="有效词条滑动条"><div class="range-label"><span>0</span><span>20</span><span>40</span><span>60</span></div>'+
      '<div class="divider"></div><div class="fields">'+field('单人额外保留充能词条','reservedRechargeRolls.solo','number',{min:0})+field('组队额外保留充能词条','reservedRechargeRolls.team','number',{min:0})+field('单人最低充能 %','minRecharge.solo','number',{min:100})+field('组队最低充能 %','minRecharge.team','number',{min:100})+'</div>'+
      '<div class="divider"></div><div class="fields">'+field('分配结果的显示方式','allocationView','text',{wide:true,options:[['both','连续分配 + 可实现的五件方案'],['theory','连续分配方向'],['material','只显示可实现的五件方案']]})+['生之花','死之羽','时之沙','空之杯','理之冠'].map((label,i)=>field(label+'起始副词条','artifactStarts.'+i,'number',{numeric:true,options:[[4,'4条初始（理论上限）'],[3,'3条初始']]})).join('')+'</div>'+
      '<p class="help">额外保留的充能不占上方有效预算；每条为5.505%充能。若充能本身能转伤，进一步优化的充能才计入直接增伤预算。三个主词条固定后，只搜索确实影响所选目标的属性。</p>'+rollConversionInfo(),{tag:'03 / SUBSTATS'});
  }
  function rollConversionInfo(){try{const costs=E.rollCosts(config);return '<details class="method-details"><summary>平均词条单位与小词条折算</summary><p>攻击/生命 '+E.ROLLS.atkPct+'%；防御 '+E.ROLLS.defPct+'%；暴率 '+E.ROLLS.cpct+'%；暴伤 '+E.ROLLS.cdmg+'%；精通 '+E.ROLLS.mastery+'；充能 '+E.ROLLS.recharge+'%。</p><p>小攻击平均'+E.ROLLS.atkPlus+'点 = '+fmt(costs.atkPlus,4)+'条大攻击；小生命平均'+E.ROLLS.hpPlus+'点 = '+fmt(costs.hpPlus,4)+'条大生命；小防御平均'+E.ROLLS.defPlus+'点 = '+fmt(costs.defPlus,4)+'条大防御。</p><p>攻击基数是90级角色 + 所选武器基础攻击；生命与防御基数为90级角色本体。花和羽毛主属性不计入副词条预算。</p></details>';}catch{return '<p class="help">选择武器后显示小词条折算值。</p>';}}
  function activeMetric(){return M.selected(config).find(m=>m.id===goal)||M.selected(config)[0];}
  function metricsCard(){
    const list=M.definitions(config),selected=new Set(M.selected(config).map(m=>m.id));
    return card('角色伤害指标','<p class="panel-intro">可多选。每个指标分别优化期望伤害，并同时显示暴击伤害。单人、组队使用完全相同的指标定义。</p><div class="metric-choices">'+list.map(m=>'<label class="metric-choice"><input type="checkbox" data-metric-id="'+esc(m.id)+'"'+(selected.has(m.id)?' checked':'')+'><span>'+esc(m.title)+(m.reaction?'<small>'+esc(M.names[m.reaction])+'场景自动成立</small>':'')+'</span></label>').join('')+'</div><p class="help">固定攻击段数与技能分支；无需编写输出手法。只有对应指标需要的反应现场会自动开启，不添加虚拟队友增益。</p>',{tag:'DAMAGE BENCHMARKS'});
  }
  function metricSettingsCard(){
    const selected=M.selected(config),first=activeMetric()||M.definitions(config)[0],preview=first?{...config,_metric:first}:config,s=M.settings(preview),v={...M.defaultStates(preview),...M.gearStates(preview,first||{}),...s.states};
    let extra='';
    if(selected.some(m=>m.reaction==='stellarConduct'))extra+=field('极星辉域：上一周期有效附着次数','metricSettings.stellarHits','number',{min:0,max:12,step:1,wide:true,help:'默认10次，对应1.9倍；12次对应2倍。不是本周期刚清零的记录。'});
    if(config.character==='桑多涅')extra+=field('大招清除的改进战术层数','metricSettings.sandroneTactics','number',{min:0,max:10,step:1,wide:true,value:s.sandroneTactics,help:'E转化功率可积累改进战术；默认Q清除满10层，0命也可取得，相对0层倍率×2。手动修改会切换自定义。'});
    if(config.character==='丝柯克')extra+=field('普通Q灭：施放时蛇之狡谋','metricSettings.skirkSerpent','number',{min:0,max:100,step:1,wide:true,value:s.skirkSerpent,help:'从0狡谋长E吸3枚裂隙：C0/C1为45+24=69，C2起55+24=79。满倍率门槛分别62/72，只计超额12/22点。手动修改可按实际施放资源计算。'})+field('死河渡断目标层数（组队按合格人数封顶）','metricSettings.states.skirkStacks','number',{min:0,max:3,step:1,value:s.states.skirkStacks??3})+(config.cons>=6?field('本次可用C6斩层数','metricSettings.skirkC6Stacks','number',{min:0,max:3,step:1}):'')+check('本次E状态内已施放特殊Q尽','metricSettings.skirkSpecialQActive')+(s.skirkSpecialQActive?check('凋尽仍有效，7次主体命中均满足生效条件','metricSettings.skirkWitherActive',s.skirkWitherActive!==false)+field('特殊Q尽当次吸收的裂隙','metricSettings.skirkRifts','number',{min:0,max:3,step:1,wide:true}):'');
    const fixed=new Set(['sandroneRadiance','odetteRadiance','sandroneTactics','sandroneDecodingActive','sandroneC4Available','sandroneC6ExtraHits','vesnaRadiance','wrioRevelationUnlocked','wrioRadianceActive','cynoRevelationUnlocked','cynoRadianceActive','ineffaBirgittaActive','ineffaThundercloudActive','ineffaC2Available','ineffaC6Available','columbinaC4ProcAvailable','mualaniFirstBite','varkaC1WineAvailable','ayakaC6Active','dehyaC2Active','zibaiC4Splendor','varesaC4PlungeAvailable','chascaC6OnslaughtActive']);
    const fields=E.stateFields(config).filter(([key])=>!fixed.has(key)).map(([key,label,type,max,fallback])=>{
      const value=v[key]??config.conditions?.[key]??fallback??(type==='bool'?false:type==='select'?max[0][0]:type==='elements'?[]:type||0),path='metricSettings.states.'+key;
      if(type==='bool')return check(label,path,value);
      if(type==='select')return field(label,path,'text',{wide:true,options:max,value});
      if(type==='elements')return '';
      return field(label,path,'number',{min:type,max,step:1,value});
    }).join('');
    return card('指标条件与装备效果','<div class="fields">'+field('单人角色天赋前提','metricSettings.talentMode','text',{wide:true,options:[['benchmark','默认满足组队触发资格'],['actual','严格按实际单人资格']]})+field('角色自身增益','metricSettings.ownBuffMode','text',{wide:true,options:[['full','默认合法满效果'],['custom','自定义自身增益']]})+field('圣遗物效果','metricSettings.artifactMode','text',{wide:true,options:[['full','默认满层 / 已触发'],['manual','使用自定义状态']]})+field('武器被动','metricSettings.weaponMode','text',{wide:true,options:[['full','默认满足条件并满层'],['manual','使用自定义状态']]})+field('敌人等级','enemy.level','number',{min:1,max:200,step:1})+field('附近敌人数（影响辅助层数）','enemy.count','number',{value:config.enemy.count??1,min:1,max:20,step:1})+field('敌人基础抗性 %','enemy.resistance')+extra+'</div><p class="help">单人默认满足角色自身天赋需要的满辉、魔导等组队资格，仍不计队友直接增益和元素共鸣；组队按真实成员判断。绝缘仍读取实际充能。详细条件的手动修改优先。</p><details class="method-details"><summary>调整角色与装备的具体状态</summary><div class="fields">'+field('当前生命比例 %','metricSettings.states.currentHpPct','number',{min:0,max:100,value:v.currentHpPct??config.conditions.currentHpPct})+fields+'</div>'+check('已完成角色魔女课业','metricSettings.states.homework',s.states.homework??(s.talentMode==='benchmark'&&window.GTeam?.HEX.includes(config.character)?true:config.conditions.homework))+'<p class="help">所选反应指标的必要辉映和攻击分支由指标决定；队友实际属性与增益在队友区域设置。</p></details>',{detail:true,open:true});
  }
  function metricOverview(mode){
    const rows=M.selected(config).filter(m=>results[mode]?.[m.id]);if(!rows.length)return '';
    const cell=(r,k)=>r?.error?'<span class="muted">条件不满足</span>':r?fmt((mode==='marginal'?r.base:r)?.[k]):'—';
    return card(mode==='optimize'?'各指标独立最优 · 伤害对照':'当前圣遗物 · 各指标伤害','<div class="table-wrap"><table class="metric-overview"><thead><tr><th>指标</th><th>单人期望</th><th>单人暴击</th><th>组队期望</th><th>组队暴击</th></tr></thead><tbody>'+rows.map(m=>{const d=results[mode][m.id];return '<tr class="'+(goal===m.id?'selected':'')+'"><td><button data-goal="'+esc(m.id)+'">'+esc(m.title)+'</button></td><td>'+cell(d.solo,'total')+'</td><td>'+cell(d.solo,'critical')+'</td><td>'+cell(d.team,'total')+'</td><td>'+cell(d.team,'critical')+'</td></tr>';}).join('')+'</tbody></table></div><p class="help">'+(mode==='optimize'?'每行各自优化期望伤害，分配可能不同，不能把这些行合并成同一套圣遗物。':'各指标使用同一份已输入圣遗物属性。')+'暴击栏表示本指标所有可暴击伤害均暴击的总值。</p>');
  }
  const buffFields={...E.LABELS,aDmg:'普攻伤害加成 %',a2Dmg:'重击伤害加成 %',a3Dmg:'下落伤害加成 %',eDmg:'战技伤害加成 %',qDmg:'爆发伤害加成 %',aPlus:'普攻附加基础伤害',a2Plus:'重击附加基础伤害',a3Plus:'下落附加基础伤害',ePlus:'战技附加基础伤害',qPlus:'爆发附加基础伤害',aCpct:'普攻暴击率 %',aCdmg:'普攻暴击伤害 %',a2Cpct:'重击暴击率 %',a2Cdmg:'重击暴击伤害 %',eCpct:'战技暴击率 %',eCdmg:'战技暴击伤害 %',qCpct:'爆发暴击率 %',qCdmg:'爆发暴击伤害 %',enemyDef:'减防 %',enemyIgnore:'无视防御 %',kx:'全元素/物理减抗 %',res_pyro:'火减抗 %',res_hydro:'水减抗 %',res_cryo:'冰减抗 %',res_electro:'雷减抗 %',res_geo:'岩减抗 %',res_anemo:'风减抗 %',res_dendro:'草减抗 %',res_physical:'物理减抗 %',multi:'独立倍率加成 %',vaporize:'蒸发反应增伤 %',melt:'融化反应增伤 %',aggravate:'超激化反应增伤 %',spread:'蔓激化反应增伤 %',bloom:'绽放反应增伤 %',hyperBloom:'超绽放反应增伤 %',burgeon:'烈绽放反应增伤 %',swirl:'扩散反应增伤 %',lunarCharged:'月感电增伤 %',lunarBloom:'月绽放增伤 %',lunarCrystallize:'月结晶增伤 %',stellarConduct:'星超导增伤 %',stellarSwirl:'星扩散增伤 %',stellarVortex:'星辉冰旋增伤 %',fypct:'月/星基础伤害提升 %',fyplus:'月/星专属固定基础伤害',elevated:'月/星擢升 %',lunarChargedBase:'月感电基础伤害提升 %',lunarBloomBase:'月绽放基础伤害提升 %',lunarCrystallizeBase:'月结晶基础伤害提升 %',stellarConductBase:'星超导基础伤害提升 %',stellarSwirlBase:'星扩散基础伤害提升 %',stellarConductFlat:'星超导专属固定增伤',stellarSwirlFlat:'星扩散专属固定增伤'};
  buffFields.dmg='通用伤害加成 %（含物理）';
  function autoSupportSummary(t,ctx,i){
    let html='';const T=window.GTeam,needed=T.supportInputs(t,ctx);
    if(t.character==='奥黛塔')html+='<p class="help">祝赐默认按≥2000攻击吃满14%，不把2000当作实际面板；华彩自动满'+(t.cons>=1?6:4)+'层。'+(t.cons>=2?'C2攻击加成与本指标对应的辉映减抗自动计入。':'')+'</p>';
    if(T.stackNames[t.character]&&t.stacks!=='')html+='<span class="stat-pill">'+esc(T.stackNames[t.character])+'：'+esc(t.stacks)+'</span>';
    if(T.resourceNames[t.character])html+='<span class="stat-pill">'+esc(T.resourceNames[t.character][0])+'：'+esc(t.resources)+'</span>';
    if(!needed.length)html+='<p class="help">本指标的已适配增益无需填写该队友面板。</p>';
    if(T.partialCoverage[t.character])html+='<p class="warnings">'+esc(T.partialCoverage[t.character])+'</p>';
    if(config.supportPanelMode!=='base'&&(T.convertedInputs[t.character]||[]).some(k=>needed.includes(k)))html+='<details class="method-details"><summary>面板包含百分比转移时的转化基数</summary><p>仅在实际面板含不能再次转化的分享属性时填写，否则留空。</p><div class="fields">'+T.convertedInputs[t.character].filter(k=>needed.includes(k)).map(k=>field('可再次转化的'+({atk:'攻击力',hp:'生命值',def:'防御力',mastery:'精通'})[k],'teammates.'+i+'.premod.'+k,'number')).join('')+'</div></details>';
    return html;
  }
  function supportInputOptions(t,ctx,i){
    if(config.supportPanelMode!=='base')return '';
    let html='';
    if(t.weapon==='讨龙英杰谭')html+=field('讨龙接棒角色','teammates.'+i+'.buffTarget','text',{wide:true,value:t.buffTarget||config.character,options:[config.character,...(config.teammates||[]).map(x=>x.character)].filter(n=>n&&n!==t.character).map(n=>[n,n+(n===config.character?'（主角色）':'')]),help:'同一份讨龙只给接棒者；可给辅助后保留其仍有效的加攻，不会同时给所有人。'});
    if(window.GSupportPanels.autoWeapons.has(t.weapon))html+='<div class="field"><label for="field-auto-'+i+'">输入是否已包含自动武器被动</label><select id="field-auto-'+i+'" data-path="teammates.'+i+'.baseAutoPassive" data-boolean="true">'+optionsHTML([['true','已包含（通常脱战已自动生效）'],['false','尚未包含']],t.baseAutoPassive===false?'false':'true')+'</select><small>仅拆分本武器自动触发的属性转化，避免重复；不是其他队友的增益。</small></div>';
    if(window.GSupportPanels.autoWeapons.has(t.weapon))html+=field('最近一次武器刷新时的位置','teammates.'+i+'.weaponRefreshPhase','text',{wide:true,value:t.weaponRefreshPhase||'offField',options:[['offField','后台刷新（默认）'],['onField','前台获得增益后刷新']],help:'西福斯、晚星等每10秒记录一次合格精通，保持12秒；这里按所选位置、当前已选增益完成最近一次刷新，不模拟更早的属性历史。'});
    if(['圣显之钥','岩峰巡歌'].includes(t.weapon))html+='<p class="help">'+esc(t.weapon)+'默认已在持有者前台、所选队伍增益有效时满层触发；采用触发时属性，退场后保留武器增益，不把前台限定属性永久留给辅助。</p>';
    if(['护摩之杖','黎明神剑'].includes(t.weapon))html+=field('辅助当前生命比例 %','teammates.'+i+'.currentHpPct','number',{value:t.currentHpPct??100,min:0,max:100,help:'单人常驻输入基准为满血；当前条件与基准不同时，计算被动的差额。'});
    const fields=E.STATE_FIELDS.weapons[t.weapon]||[],states=fields.length?window.GSupportPanels.parameters(ctx,t):{};
    if(fields.length)html+='<details class="method-details"><summary>辅助自身武器状态（默认满足条件并满层）</summary><div class="fields">'+fields.map(([key,label,type,options])=>{const p='teammates.'+i+'.ownStates.'+key,value=states[key];if(type==='bool')return '<div class="field"><label>'+esc(label)+'</label><select data-path="'+p+'" data-boolean="true">'+optionsHTML([['true','已触发'],['false','未触发']],String(value))+'</select></div>';return field(label,p,typeof type==='number'?'number':'text',{value,min:typeof type==='number'?type:undefined,max:typeof type==='number'?options:undefined,options:type==='select'?options:undefined});}).join('')+'</div><p class="help">前后台和队伍资格仍按本次场景判断，互斥效果只选择一项。</p></details>';
    return html;
  }
  function teammatesCard() {
    const full=config.supportMode==='full',nilouChoice=config.character==='奈芙尔'&&(config.teammates||[]).some(t=>t.character==='妮露');let ctx=config;try{if(activeMetric())ctx=M.configFor(config,activeMetric());}catch{}
    const current=window.GSupport.preset(copy(ctx));let slots='';
    for(let i=0;i<3;i++) {
      const t=(full?current.teammates:config.teammates)?.[i]||{},c=E.character(t.character);
      slots+='<div class="contributor"><div class="field"><label>队友 '+(i+1)+'</label><select data-path="teammates.'+i+'.character">'+optionsHTML(Guides.teammateOptions(config.character,{selected:t.character}),t.character||'')+'</select></div>';
      if(c) {
        slots+='<div class="fields" style="margin-top:8px">'+field('命座','teammates.'+i+'.cons','number',{numeric:true,options:[0,1,2,3,4,5,6].map(n=>[n,n+'命'])})+field('精炼','teammates.'+i+'.refine','number',{numeric:true,options:[1,2,3,4,5].map(n=>[n,n])})+field('武器（90级）','teammates.'+i+'.weapon','text',{wide:true,options:Guides.weaponOptions(c.key)})+'</div>'+
          '<div style="margin-top:8px">'+talentFields(i)+'</div>'+
          '<div class="fields" style="margin-top:8px">'+(window.GTeam?.supportInputs(t,full||config.supportPanelMode==='base'?current:undefined)||[]).map(k=>field((config.supportPanelMode==='base'?'单人常驻':'增益计算时')+({atk:'攻击力',hp:'生命值',def:'防御力',mastery:'元素精通',cpct:'暴击率 %',recharge:'充能效率 %'})[k],'teammates.'+i+'.panel.'+k,'number',{placeholder:config.supportPanelMode==='base'?'不含队友、共鸣、临时效果':'填写实际值'})).join('')+field('队友套装','teammates.'+i+'.set','text',{wide:true,options:Guides.artifactOptions(c.key,{support:true})})+'</div>'+supportInputOptions(t,current,i)+
          (config.character==='奈芙尔'&&c.key==='妮露'?field('金杯天赋 · 100元素精通','teammates.'+i+'.nilouGoldenEmMode','text',{wide:true,value:window.GSupport.nilouGoldenState(current,t).mode,options:[['off','不触发'],['on','触发']],help:'默认不触发；选择触发时，按受到草元素攻击后10秒内的全队100精通计算，同时重算辅助的属性联动。妮露C2减抗、圣显之钥和教官套分别计算。'}):'')+
          '<p class="help">'+esc(full?(nilouChoice&&c.key==='妮露'?'妮露其他可用增益默认满效果；金杯100精通以独立选项为准。':'角色、已选武器与套装的可用增益默认满足触发条件。'):window.GTeam?.supportDescription?.(c.key)||'队友面板与技能状态用于核算实际增益。')+'</p>'+
          (full?autoSupportSummary(t,current,i):'<div class="fields" style="margin-top:8px">'+(window.GTeam?.stackNames[c.key]?field(window.GTeam.stackNames[c.key],'teammates.'+i+'.stacks','number',{min:0}):c.key==='艾尔海森'?field('Q消耗琢光镜数量（0–3）','teammates.'+i+'.stacks','number',{min:0,max:3}):'')+
          (window.GTeam?.resourceNames[c.key]?field(window.GTeam.resourceNames[c.key][0],'teammates.'+i+'.resources','number',{min:0,placeholder:'起手值 '+window.GTeam.resourceNames[c.key][1]+'，按实际修改'}):'')+
          (['枫原万叶','砂糖'].includes(c.key)||['翠绿之影','悠古的磐岩'].includes(t.set)?field('实际扩散/反应元素','teammates.'+i+'.element','text',{options:[['','请选择实际元素'],...['pyro','hydro','cryo','electro'].map(k=>[k,E.ELEMENT[k]+'元素'])]}):'')+
          (c.key==='申鹤'?field('战技类型','teammates.'+i+'.mode','text',{options:[['tap','点按：5冰翎，EQ增伤'],['hold','长按：7冰翎，普重下增伤']]}):'')+
          (c.key==='哥伦比娅'?field('C2皎辉主导反应','teammates.'+i+'.mode','text',{options:[['lunarCharged','月感电：攻击'],['lunarBloom','月绽放：精通'],['lunarCrystallize','月结晶：防御']]}):'')+
          (c.key==='哥伦比娅'&&t.cons>=6?field('C6近8秒实际参与反应','teammates.'+i+'.c6Reaction','text',{wide:true,options:[['off','未发生'],['lunarCharged','月感电：水雷暴伤'],['lunarBloom','月绽放：水草暴伤'],['lunarCrystallize','月结晶：水岩暴伤'],['all','三种均已发生']]}):'')+
          (c.key==='奥黛塔'?field('倒影辉映模式','teammates.'+i+'.mode','text',{options:[['stellarConduct','星超导'],['stellarSwirl','星扩散']]}):'')+
          (t.weapon==='漩流颂歌'?field('专武治疗层数（独立资源）','teammates.'+i+'.weaponStacks','number',{min:0,max:3}):'')+'</div>'+check('战技 E 的相关效果已生效','teammates.'+i+'.castE')+check('爆发 Q 的相关效果已生效','teammates.'+i+'.castQ')+check('角色额外触发条件已满足','teammates.'+i+'.characterActive')+check('武器共享被动已触发','teammates.'+i+'.weaponActive')+check('套装共享效果已触发','teammates.'+i+'.setActive')+
          (window.GTeam?.HEX.includes(c.key)?check('已完成本角色魔女课业','teammates.'+i+'.homework'):'')+
          (c.key==='尼可'?'<div class="fields" style="margin-top:10px">'+field('本循环尼可Q施放次数','teammates.'+i+'.projectionCasts','number',{min:1,max:20,step:1})+'</div>'+check('已按实际手法核对投影次数和全队触发间隔','teammates.'+i+'.projectionTimingVerified')+'<p class="help">Q每次最多4投影，间隔至少3秒；C1间隔至少6秒。两种投影可在技能列表添加独立项，不默认加入次数。投影时尼可总攻击与E施放时可转化攻击不同，变化时请分段输入。</p>':'')+
          (c.key==='阿贝多'?check('瑰银秘仪增伤仍在20秒内','teammates.'+i+'.silverActive')+check('C2天慧精通增益已触发','teammates.'+i+'.transientWisdomActive')+check('C4瑰银跳跃后的下落加成已生效','teammates.'+i+'.silverPlungeActive'):'')+
          (t.set==='烬城勇者绘卷'?elementChecks('烬城：实际涉及的元素','teammates.'+i+'.scrollElements')+check('烬城：12%部分已过15秒失效','teammates.'+i+'.scrollBaseExpired')+check('烬城：夜魂反应额外28%仍有效','teammates.'+i+'.scrollNightsoulActive'):'')+
          (t.weapon==='白辰之环'?elementChecks('白辰：本次雷相关反应涉及的元素','teammates.'+i+'.reactionElements'):'')+
          (!window.GTeam?.supported.has(c.key)?check('已在补充增益中手动补齐该角色效果','teammates.'+i+'.manualVerified'):'')+
          (config.supportPanelMode!=='base'&&(window.GTeam?.convertedInputs[c.key]||[]).length?'<details class="method-details"><summary>面板包含百分比转移时：可再次转化的属性</summary><p>若此面板含砂糖、圣显等百分比转移，填写剔除不能继续转化部分后的数值。一般固定属性、共鸣和宗室等可以参与转换。</p><div class="fields">'+window.GTeam.convertedInputs[c.key].map(k=>field('可再次转化的'+({atk:'攻击力',hp:'生命值',def:'防御力',mastery:'精通'})[k],'teammates.'+i+'.premod.'+k,'number',{placeholder:'无百分比转移可留空'})).join('')+'</div></details>':''));
      }
      slots+='</div>';
    }
    if(current._metric?.reaction?.startsWith('lunar')&&[config.character,...(config.teammates||[]).map(t=>t.character)].filter(n=>window.GTeam.MOON.includes(n)).length>=2){const candidates=window.GTeam.moonCandidates(current);slots+='<div class="divider"></div>'+(candidates.length?field('满辉额外月伤来源','conditions.lastNonMoonCaster','text',{wide:true,value:config.conditions.lastNonMoonCaster||'auto',options:[['auto','默认最高可用者（须由其最后施放E/Q）'],...candidates.map(t=>[t.id,t.character+'最后施放E/Q']),['none','当前未触发 / 已过20秒']],help:'不同来源不叠加，实际由最后一名非月兆施法者覆盖；按其当前合格属性计算，最多36%。计算清单会注明采用者。'}):'<p class="help">本队全为月兆角色：没有非月兆E/Q来源，满辉额外公共月伤为0；角色自身的满辉天赋仍分别计入。</p>');}
    return card('队友与自动共鸣','<p class="panel-intro">辅助默认填写穿好装备后的单人常驻面板，不含队友、共鸣及临时效果。网站按来源和技能规则计算其他队友对辅助的增益，再转化给主角色。</p>'+field('辅助面板输入口径','supportPanelMode','text',{wide:true,options:[['base','单人常驻面板 → 自动计算属性联动'],['combat','增益生效时实战面板（旧配置兼容）']]})+(config.supportPanelMode==='combat'?'<p class="warnings">此配置保留旧实战面板口径，不会再自动叠加辅助属性。要使用新联动，请切换常驻口径并核对原输入。</p>':'<p class="help">辅助动态增益按后台属性计算；尼可E等已核实锁定属性的技能，另按施放时取样。接棒增益只给所选的一人。</p>')+field('队友增益状态','supportMode','text',{wide:true,options:[['full','可用增益默认满效果'],['manual','自定义触发状态']],help:nilouChoice?'默认满效果只取当前条件下可用的增益。妮露金杯100精通按下方独立选项计算，默认不触发；选择默认满效果也不会自动开启。':undefined})+slots+(full?'<p class="help">前后台、队伍组成、反应类型、命座上限及有限次数仍按规则判断。与当前指标无关的效果会在计算记录中另行说明。</p>':'<div class="divider"></div>'+check('当前角色有护盾','conditions.shielded')+check('附近存在月笼','conditions.moonCage')+check('双岩减抗已施加','conditions.geoShredActive')+check('目标冰附着或冻结','conditions.cryoAura')+check('双草第一层已触发','conditions.dendroFirst')+check('双草第二层已触发','conditions.dendroSecond')+check('主角色正在场上','conditions.onField')+check('目标处于激化状态','conditions.quicken')+check('星扩散旋涡已成立','conditions.vortexActive')),{detail:true,open:true});
  }
  function manualBuffCard() {
    const rows=config.teamRows||[];
    return card('补充队友增益','<p class="panel-intro">用于手动补充自动模块之外的效果。这里填额外部分，避免重复输入已经自动计算的同一增益。</p>'+rows.map((row,i)=>'<div class="buff-row"><select data-path="teamRows.'+i+'.key" aria-label="增益类型">'+Object.entries(buffFields).map(([k,l])=>option(k,l,row.key)).join('')+'</select><input type="number" data-path="teamRows.'+i+'.value" value="'+esc(row.value)+'" step="any" aria-label="增益数值"><button class="remove-btn" data-remove-buff="'+i+'" aria-label="删除增益">×</button></div>').join('')+'<button class="add-btn" data-action="add-buff">＋ 添加一项额外增益</button><p class="help">百分比填百分点，例如 25% 填 25；攻击、生命、防御、精通及附加伤害填实际点数。</p>',{detail:true});
  }
  function panelCard() {
    if(ocr.busy||ocr.draft)return card(ocr.busy?'正在识别五件圣遗物':'已识别五件 · 待核对采用',ocrPanel(),{tag:'SCREENSHOT / REVIEW'});
    const mode=ocrPanel()+field('当前属性的输入方式','panelMode','text',{wide:true,options:[['character','填写游戏单人常驻面板'],['artifacts','圣遗物主副属性合计 / 截图识别结果']]});
    if(config.panelMode==='artifacts'){
      const keys=Object.keys(E.ROLLS);
      if(config.artifactInputSource==='截图识别后已核对'&&!ocr.editTotals){
        const percent=k=>k.endsWith('Pct')||['cpct','cdmg','recharge'].includes(k),rows=keys.map(k=>'<tr><th scope="row">'+esc(E.LABELS[k])+'</th><td class="num">'+Number(config.artifactPanel?.[k]||0).toLocaleString('zh-CN',{maximumFractionDigits:3})+(percent(k)?'%':'')+'</td></tr>').join('');
        return card('已采用截图 · 五件自动合计',mode+'<p class="panel-intro applied-totals-note">识别结果已采用。下面是五件主属性与副属性的自动合计，直接用于本次计算，无需重复填写。</p><table class="ocr-applied-totals"><tbody>'+rows+'</tbody></table><p class="help">这里仅包含圣遗物原始属性；角色、武器、套装效果及属性转化由网站计算。</p><button class="add-btn" data-action="artifact-edit">需要修正时，手动修改合计</button>',{tag:'SCREENSHOT / APPLIED'});
      }
      return card('手动填写五件圣遗物合计',mode+'<p class="panel-intro">仅在手动输入时填写五件主词条和副词条的总和。采用截图后会自动生成这些合计，不用再填一次。此处不包括角色本体、武器、角色被动与套装效果，它们由程序添加。花4780生命、羽311攻击也计入这里。</p><div class="fields">'+keys.map(k=>field(E.LABELS[k]+(['cpct','cdmg','recharge'].includes(k)?' %':''),'artifactPanel.'+k,'number',{min:0})).join('')+'</div><p class="help">杯的元素/物理伤害与冠的治疗加成由所选主词条确定；请确认三个主属性与实际装备一致。</p><button class="add-btn" data-action="artifact-example" style="margin-top:12px">填入只有五件主词条的示例，再修改副属性合计</button>'+rollConversionInfo(),{tag:'MANUAL TOTALS / INPUT'});
    }
    const names={hp:'生命值',atk:'攻击力',def:'防御力',mastery:'元素精通',cpct:'暴击率 %',cdmg:'暴击伤害 %',recharge:'元素充能效率 %',dmg:E.ELEMENT[E.character(config.character).element]+'元素伤害加成 %',phy:'物理伤害加成 %',heal:'治疗加成 %'};
    return card('你的单人常驻面板',mode+'<p class="panel-intro">先选好角色、武器、命座、套装和三个主属性，再填写游戏角色详情数值：只留主C一人，等待E/Q与临时增益结束。装备常驻被动和永久转化已经包含在面板里，网站会拆分后重算，组队只补本次可用的额外增益。</p><p class="help">幻灭、黑曜、逐影、冰套等条件暴击不要加进这里。小助手的“未触发面板”可能连武器常驻被动都没加，请用上方圣遗物截图识别入口。</p><div class="fields">'+Object.entries(names).map(([k,l])=>field(l,'panel.'+k,'number',{placeholder:'填写游戏面板',min:k==='cpct'?-100:0})).join('')+field('读取面板时的生命比例 %','panelSettings.hpPct','number',{min:0,max:100,wide:true,help:'默认满生命、无护盾、远离敌人；与实战指标里的生命状态分开。'})+(config.character==='玛薇卡'&&config.cons>=2?field('五件圣遗物的攻击力%合计','panelExtra.atkPct','number',{min:0,wide:true,help:'2命在夜魂中改变白字，仅总攻击不能区分原有大攻击和小攻击；截图识别可自动提供这个值。'}):'')+'</div><button class="add-btn" data-action="example-panel" style="margin-top:12px">填入无副词条示例，再按实际修改</button><p class="help">每次追加一条后重新计算转化与封顶。面板显示存在舍入；输入截图或显示数值时，结果也受该显示精度限制。</p>',{tag:'RESIDENT PANEL / INPUT'});
  }
  function ocrField(label,path,value,options){return '<div class="field"><label>'+esc(label)+'</label>'+(options?'<select aria-label="'+esc(label)+'" data-ocr-path="'+path+'">'+optionsHTML(options,value)+'</select>':'<input aria-label="'+esc(label)+'" type="number" step="any" data-ocr-path="'+path+'" value="'+esc(value??'')+'" placeholder="待核对">')+'</div>';}
  function ocrPanel(){
    const imageInput='<input class="hidden" type="file" id="artifact-image" accept="image/png,image/jpeg,image/webp">';
    const draft=ocr.draft,upload='<div class="ocr-upload" role="region" aria-label="圣遗物截图拖放识别区域" aria-busy="'+(ocr.busy||busy?'true':'false')+'"><strong>也可以识别圣遗物截图</strong><p class="ocr-drop-hint"><span class="ocr-drop-idle">'+(ocr.busy||busy?'正在识别，请稍候…':'将一张截图拖到这里，或点击下方按钮')+'</span><span class="ocr-drop-active" aria-hidden="true">松开图片开始识别</span></p><p class="help">支持小助手含完整五件主、副属性的清晰截图：可用完整长图或裁剪图，自动适配尺寸和常见排列。只读取装备原始属性，再由网站算转化；角色头像与未显示的套装沿用你的选择。识别在浏览器内运行，截图不会上传。首次加载约9–10MB识别数据。</p><button class="add-btn" data-action="ocr-upload"'+(ocr.busy||busy?' disabled':'')+'>选择圣遗物截图</button>'+(ocr.busy?'<div class="ocr-progress" role="status"><span>'+esc(ocr.message)+'</span><progress max="100" value="'+ocr.progress+'"></progress></div><button class="soft-btn" data-action="ocr-cancel">取消识别</button>':'')+(ocr.error?'<p class="error" role="alert">'+esc(ocr.error)+'</p>':'')+'</div>';
    if(!draft)return imageInput+upload;
    const allSubs=[['','待核对属性'],...Object.keys(E.ROLLS).map(k=>[k,E.LABELS[k]])],selected={...config,...draft.configuration},weaponOptions=Guides.weaponOptions(config.character,{custom:true});
    const unread=draft.pieces.reduce((n,p,i)=>n+(i>=2&&!p.main.key?1:0)+p.subs.filter(s=>!s.key||s.value==='').length,0),unreadNotice=unread?'<p class="warnings" role="status">有 '+unread+' 项属性未能可靠确认，已留空或标记待核对。请对照裁图补充后再采用。</p>':'';
    const pieces=draft.pieces.map((p,i)=>'<details class="ocr-piece" open><summary>'+esc(p.slot)+'</summary>'+(p.preview?'<img class="ocr-crop" src="'+p.preview+'" alt="'+esc(p.slot)+'截图原文">':'')+(i<2?'<p class="help">主属性：'+(i===0?'生命值4780':'攻击力311')+'</p>':ocrField(p.slot+'主属性','pieces.'+i+'.main.key',p.main.key,[['','待核对主属性'],...mainOptions[['sands','goblet','circlet'][i-2]].map(k=>[k,E.LABELS[k]+' '+E.MAIN[k]+(k==='mastery'?'':'%')])]))+'<div class="ocr-substats">'+p.subs.map((s,j)=>'<div class="ocr-row">'+ocrField(p.slot+'副属性'+(j+1),'pieces.'+i+'.subs.'+j+'.key',s.key,allSubs)+ocrField(p.slot+'副属性'+(j+1)+'数值','pieces.'+i+'.subs.'+j+'.value',s.value)+'</div>').join('')+'</div></details>').join('');
    return imageInput+upload+'<div class="ocr-review"><h4>识别结果 · 核对后再计算</h4><p class="help">主角色：'+esc(draft.character)+'（沿用所选角色）。识别完成后还需采用：核对五件属性，勾选下方“我已核对”，点击“采用这些圣遗物并计算收益”。采用后自动汇总，无需另填合计。未读到的内容保留当前配置。</p><div class="fields">'+ocrField('识别配置：命座','configuration.cons',selected.cons,[0,1,2,3,4,5,6].map(n=>[n,n+'命']))+ocrField('识别配置：武器精炼','configuration.refine',selected.refine,[1,2,3,4,5].map(n=>[n,'精炼'+n]))+ocrField('识别配置：角色等级','configuration.level',selected.level)+['a','e','q'].map(k=>ocrField(({a:'普攻',e:'战技',q:'爆发'})[k]+'实际等级','configuration.actualTalents.'+k,selected.actualTalents?.[k])).join('')+'</div>'+ocrField('识别配置：武器','configuration.weapon',selected.weapon,weaponOptions)+'<p class="help">套装仍使用当前已选的'+esc(config.setChoice==='none'?'未选套装':config.setChoice)+'。未读到的等级与天赋沿用已选配置；实际等级由网站扣除命座/队伍加级后保存。'+(draft.detected.weaponUncertain?'武器名称有近似识别，请重点核对。':'')+'</p>'+unreadNotice+pieces+'<label class="check-row ocr-confirm"><input type="checkbox" data-ocr-confirm'+(ocr.confirmed?' checked':'')+'>我已核对角色配置、套装和五件属性</label><button class="primary ocr-apply" data-action="ocr-apply"'+(!ocr.confirmed||busy?' disabled':'')+'>采用这些圣遗物并计算收益 →</button><button class="soft-btn" data-action="ocr-dismiss">放弃此次识别</button></div>';
  }
  async function recognizeScreenshot(file){
    if(ocr.busy||busy)return;
    const fileError=!/^image\/(png|jpeg|webp)$/.test(file?.type||'')?'请选择PNG、JPG或WebP截图。':file.size>15*1024*1024?'截图请小于15MB。':'';
    if(fileError){ocr.error=fileError;render();return;}
    ocr.busy=true;ocr.error='';ocr.draft=null;ocr.confirmed=false;ocr.editTotals=false;ocr.progress=0;ocr.message='准备识别…';ocr.controller=new AbortController();render();
    const snapshot=copy(config);
    try{
      const draft=await window.GPanelImport.recognize(file,snapshot,(message,p)=>{ocr.message=message;ocr.progress=p;const status=root.querySelector('.ocr-progress');if(status){status.querySelector('span').textContent=message;status.querySelector('progress').value=p;}},ocr.controller.signal);
      if(config.character!==snapshot.character)throw Error('识别期间主角色发生变化，请重新上传。');
      const info=window.GTeam.talentInfo(snapshot,null,snapshot.teammates.some(t=>t.character)?'team':'solo');
      draft.configuration={cons:snapshot.cons,refine:snapshot.refine,weapon:snapshot.weapon,level:snapshot.level,actualTalents:{...info.levels},...draft.detected};ocr.draft=draft;
    }catch(e){ocr.error=ocr.controller.signal.aborted?'识别已取消。':e.message||'识别失败，请改用手动填写。';}finally{ocr.busy=false;ocr.controller=null;render();root.querySelector('.ocr-review, .ocr-upload')?.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  async function applyScreenshot(){
    try{
      if(!ocr.draft||!ocr.confirmed)throw Error('请先核对识别结果。');const parsed=window.GPanelImport.validate(ocr.draft,config),v=ocr.draft.configuration;
      if(!D.weapons.some(w=>w.name===v.weapon&&w.type===E.character(config.character).weapon)&&v.weapon!=='custom')throw Error('请核对识别配置中的武器。');
      const next={...copy(config),cons:Number(v.cons),refine:Number(v.refine),weapon:v.weapon,level:v.level};E.getStats(E.character(next.character),v.level);
      if(v.actualTalents){const info=window.GTeam.talentInfo(next,null,next.teammates.some(t=>t.character)?'team':'solo');for(const k of ['a','e','q']){const level=Number(v.actualTalents[k])-Number(info.uplift[k]||0);if(!Number.isInteger(level)||level<1||level>10)throw Error('请核对识别配置的天赋等级与命座是否一致。');next.talents[k]=level;}}
      config=next;
      config.mains=parsed.mains;config.artifactPanel=parsed.stats;config.panelExtra={...config.panelExtra,atkPct:parsed.stats.atkPct};config.panelMode='artifacts';config.artifactInputSource='截图识别后已核对';ocr.draft=null;ocr.confirmed=false;ocr.editTotals=false;tab='marginal';markDirty();render();await calculate();
    }catch(e){ocr.error=e.message;render();root.querySelector('.ocr-review, .ocr-upload')?.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function buffsCard() {
    let list=[];try{list=E.buffList(config);}catch{}
    const full=M.settings(config).ownBuffMode==='full';
    return card('角色、武器与套装触发','<p class="panel-intro">这里是允许触发的开关，勾选不等于一定生效。未解锁命座灰显且不计入；实际应用数值以本次计算依据为准。自身满效果预设仍受命座和技能适用条件限制。</p>'+list.map(b=>{
      const teamOnly=E.isTeamBuff(b,E.character(config.character)),unlocked=E.constellationAllows(b,config.cons),disabled=teamOnly||!unlocked;
      const checked=!disabled&&(full&&b.id.startsWith('self:')||!config.disabledBuffs?.includes(b.id));
      let title=typeof b.title==='string'?b.title:'动态角色条件';const first=Object.keys(b.data||{})[0];title=title.replace(/undefined提高/g,(E.LABELS[first]||window.GTeam?.effectLabel(first)||'属性').replace(/%$/,'')+'提高').replace(/\[([^\]]+)\](%?)/g,(_,key,suffix)=>typeof b.data?.[key]==='number'?Number(b.data[key]).toLocaleString('zh-CN',{maximumFractionDigits:4})+suffix:suffix?'（随当前条件计算）':'（按当前属性计算）');
      const status=!unlocked?(b.cons>config.cons?'未解锁 / 不计入（需'+b.cons+'命，当前'+config.cons+'命）':'不适用当前命座 / 不计入（仅至'+b.maxCons+'命）'):teamOnly?'由队伍模块判断':checked?'允许触发（实际按条件判断）':'已关闭 / 不计入';
      return '<label class="buff-check'+(disabled?' disabled':'')+'"><input type="checkbox" data-buff-id="'+esc(b.id)+'"'+(checked?' checked':'')+(disabled?' disabled':'')+'><span>'+esc(title)+'<small class="buff-status">'+esc(status)+'</small></span></label>';
    }).join('')+'<div class="divider"></div><div class="fields">'+['solo','team'].map(s=>'<div class="field wide"><label>'+({solo:'单人',team:'组队'})[s]+'高级技能参数（JSON）</label><textarea data-json-scope="'+s+'">'+esc(invalidInputs.get('scope:'+s)?.raw??JSON.stringify(config.parameters?.[s]||{},null,2))+'</textarea></div>').join('')+'</div><p class="help">自身增益可在“指标条件与装备效果”选择满效果或自定义。手动修改自身状态会自动切为自定义，保留其他参数；不改变命座门槛。</p>',{detail:true});
  }
  function contributorsCard() {
    return card('间接月/星反应贡献人','<p class="panel-intro">仅对雷云、月笼与旋涡等间接反应使用。填写实际参与该反应的其他角色最终战斗数据；未填写者按0贡献处理，不能代表完整队伍反应伤害。</p>'+field('间接反应目标','conditions.reactionOwnership','text',{wide:true,options:[['owner','只计算主角色的加权贡献'],['team','计算该间接反应的全队总伤害']]})+(config.contributors||[]).map((p,i)=>'<div class="contributor"><div class="fields">'+[['level','等级'],['mastery','精通'],['cpct','暴击率 %'],['cdmg','暴击伤害 %'],['bonus','该反应增伤 %'],['baseBonus','该反应基础提升 %'],['flat','专属固定增伤'],['elevation','擢升 %']].map(([k,l])=>field(l,'contributors.'+i+'.'+k)).join('')+'</div><button class="soft-btn" data-remove-contributor="'+i+'" style="margin-top:8px">删除贡献人</button></div>').join('')+'<button class="add-btn" data-action="add-contributor"'+((config.contributors||[]).length>=3?' disabled':'')+'>＋ 添加贡献人（最多3名）</button><p class="help">每次暴击组合先按完整伤害排序，再按 0.6 / 0.3 / 0.05 / 0.05 加权。期望枚举最多16种组合；星扩散采用独立暴击假设。队友直接技能伤害不混入本角色循环。</p>',{detail:true});
  }
  function goalSwitch(){return '<div class="goal-switch metric-switch">'+M.selected(config).map(m=>'<button data-goal="'+esc(m.id)+'" class="'+(goal===m.id?'active':'')+'">'+esc(m.title)+'</button>').join('')+'</div>';}
  function emptyResult(mode) {return '<section class="card empty"><div class="empty-symbol">✧</div><h3>'+(mode==='marginal'?'把每一个词条，放在更有收益的地方':'找到这套配置下的词条分配')+'</h3><p>'+(mode==='marginal'?'输入当前面板，比较十种副词条在单人、组队和所选伤害指标下的提升率。':'确定角色、命座、武器和三个主词条，再按有效副词条预算比较单人和组队结果。')+'</p><div class="empty-steps"><span><b>1</b>确定配置</span><span><b>2</b>选择指标</span><span><b>3</b>比较收益</span></div></section>';}
  function critPanel(r){
    const reference=r.referenceCrit||r.panel,details=r.details||[];
    const calls=details.flatMap(d=>d.calls||[]).filter(c=>c.avg>0&&['normal','amplifying','additive','direct','indirect'].includes(c.kind)&&Number.isFinite(c.cr));
    const range=(key,cap=false)=>{const values=calls.map(c=>cap?Math.min(100,Math.max(0,c[key])):Math.max(0,c[key])).filter(Number.isFinite),lo=Math.min(...values),hi=Math.max(...values);return fmt(lo,1)+(hi-lo>=.05?'–'+fmt(hi,1):'')+'%';};
    const bonuses=new Map();for(const d of details)for(const b of d.artifactCritBonuses||[]){const id=b.source+':'+b.key;if(!bonuses.has(id))bonuses.set(id,{...b,values:new Set()});bonuses.get(id).values.add(b.value);}
    const label=key=>{const m=/^(.*?)(Cpct|Cdmg)$/.exec(key);return key==='cpct'?'暴击率':key==='cdmg'?'暴击伤害':(({a:'普攻',a2:'重击',a3:'下落',e:'战技',q:'爆发',stellarConduct:'星超导',stellarSwirl:'星扩散',stellarVortex:'星辉冰旋',lunarCharged:'月感电',lunarBloom:'月绽放',lunarCrystallize:'月结晶'})[m?.[1]]||m?.[1]||'')+(m?.[2]==='Cdmg'?'暴击伤害':'暴击率');};
    const bonusText=[...bonuses.values()].map(b=>esc(b.source)+' '+[...b.values].sort((a,b)=>a-b).map(n=>'+'+fmt(n,1)+'%').join(' / ')+esc(label(b.key))).join('；');
    return '<div class="crit-panel"><p class="crit-heading">配装双暴 · 常驻数值</p><div class="result-mini reference-crit"><span>暴击率 <strong class="num">'+fmt(reference.cpct,1)+'%</strong></span><span>暴击伤害 <strong class="num">'+fmt(reference.cdmg,1)+'%</strong></span></div><p class="crit-heading">伤害计算 · 当前生效状态</p><div class="result-mini calculation-crit">'+(calls.length?'<span>有效暴击率 <strong class="num">'+range('cr',true)+'</strong></span><span>暴击伤害 <strong class="num">'+range('cd')+'</strong></span>':'<span>此指标不使用常规双暴</span>')+'<span>充能 '+fmt(r.panel.recharge,1)+'%</span></div>'+(bonusText?'<p class="crit-note artifact-crit">套装条件加成：'+bonusText+'（已计入适用伤害）</p>':'')+'<p class="crit-note">配装双暴只含基础、突破、装备主副属性及常驻效果；条件与队友增益在计算时加入。不同伤害段有差异时显示范围，有效暴击率按0–100%计。</p></div>';
  }
  function skirkResultState(r){
    const d=(r.details||[]).find(d=>d.params?.skirkEffectiveExtra!==undefined);if(!d)return '';
    const p=d.params,body=p.skirkBurstBody,calls=d.calls||[],factor=calls[0]?.independentMultiplier;
    let html='<p class="help skirk-state">本次状态：死河渡断目标 '+p.skirkStacks+'层；本体实际独立倍率 ×'+fmt(factor,2)+(body?'；狡谋 '+p.skirkSerpent+'，超额资源 '+p.skirkEffectiveExtra+' / '+p.skirkExtraCap:p.skirkSpecialQActive?'；已施Q尽，吸收 '+p.skirkRifts+'枚裂隙':'；未施Q尽')+'。</p>';
    if(body&&calls.length===6){const hits=calls.map(c=>c.hit),same=hits.slice(0,5).every(n=>Math.abs(n-hits[0])<.01);html+='<p class="help skirk-hits">Q灭本体逐段暴击：'+(same?'前5段各 <strong class="num">'+fmt(hits[0])+'</strong>；末段 <strong class="num">'+fmt(hits[5])+'</strong>':hits.map(n=>fmt(n)).join(' / '))+'。</p>';}
    return html;
  }
  function resultSummary(s,r) {return '<section class="card result-card '+(s==='team'?'team':'')+'"><div class="result-topline"><span>'+(s==='solo'?'单人 · 仅角色自身增益':'组队 · 实际选择的队伍')+'</span><span class="scope-chip">期望伤害</span></div><div class="damage-big num">'+fmt(r.total)+'<small>'+esc(activeMetric()?.title||'所选伤害指标')+'</small></div><div class="critical-value">全暴击伤害 <strong class="num">'+fmt(r.critical)+'</strong></div>'+skirkResultState(r)+critPanel(r)+'<div class="result-bottom"><span>沙 '+E.LABELS[r.mains.sands]+' / 杯 '+E.LABELS[r.mains.goblet]+' / 冠 '+E.LABELS[r.mains.circlet]+'</span></div></section>';}
  function allocationCard(data) {
    const keys=[...new Set([...Object.keys(data.solo?.allocation||{}),...Object.keys(data.team?.allocation||{})])].filter(k=>(data.solo?.allocation[k]||data.team?.allocation[k]||0)>0);
    const max=Math.max(1,...keys.flatMap(k=>[data.solo?.allocation[k]||0,data.team?.allocation[k]||0]));
    return card('有效副词条分配','<div class="allocation-legend"><span><i class="legend-dot"></i>单人</span><span><i class="legend-dot team"></i>组队</span><span style="margin-left:auto">单位：等效词条</span></div>'+keys.map(k=>'<div class="allocation-row"><span>'+E.LABELS[k]+'</span><div class="bar-duo"><div class="bar-track"><div class="bar-fill" style="width:'+100*(data.solo?.allocation[k]||0)/max+'%"></div></div><div class="bar-track"><div class="bar-fill team" style="width:'+100*(data.team?.allocation[k]||0)/max+'%"></div></div></div><span class="roll-count num">'+fmt(data.solo?.allocation[k]||0,2)+'</span><span class="roll-count team num">'+fmt(data.team?.allocation[k]||0,2)+'</span></div>').join('')+'<div class="divider"></div><p class="help">'+(data.team?'组队':'单人')+'计算时属性 · 含已生效增益</p><div class="stat-pills">'+Object.entries((data.team||data.solo).panel).filter(([k])=>['hp','atk','def','mastery'].includes(k)).map(([k,n])=>'<span class="stat-pill">'+({hp:'生命',atk:'攻击',def:'防御',mastery:'精通'})[k]+' '+fmt(n)+'</span>').join('')+'</div><p class="help">展示的是固定主词条、武器及输出条件下的分配。小词条在等效预算模型中合并为对应百分比词条，避免重复消耗预算。</p>',{tag:'ALLOCATION'});
  }
  function materialCards(data){
    return Object.entries(data).map(([scope,r])=>{
      if(r.error)return '';const p=r.material||r;if(p.error)return card(({solo:'单人',team:'组队'})[scope]+' · 可实现方案','<p class="warnings">'+esc(p.error)+'</p>');
      if(!p.placement)return '';
      const theoretical=r.material?r.total:r.sourceTheoretical;
      const body='<div class="stat-pills"><span class="stat-pill">期望伤害 '+fmt(p.total)+'</span><span class="stat-pill">实际使用 '+fmt(p.used,4)+' 有效条</span><span class="stat-pill">剩余预算 '+fmt(p.budgetLeft,4)+'</span>'+(theoretical?'<span class="stat-pill">较连续结果 '+pct((p.total/theoretical-1)*100)+'</span>':'')+'</div><p class="help">下方每份初值和强化均取真实四档，五件各四种副词条，主副同类排斥，并计入额外保留充能。余下无效属性只用于补齐真实装备结构，不占有效预算。</p>'+p.placement.map(part=>'<details class="method-details"><summary>'+part.name+' · '+E.LABELS[part.main]+'主属性 · 起始'+part.initial+'条</summary><table class="data-table">'+Object.entries(part.tiers).map(([key,values])=>'<tr><td>'+E.LABELS[key]+'<br>'+values.length+'份（含初值）</td><td>'+values.map(v=>fmt(v,2)).join(' + ')+' = '+fmt(values.reduce((a,b)=>a+b,0),2)+(key.endsWith('Pct')||['cpct','cdmg','recharge'].includes(key)?'%':'')+'</td></tr>').join('')+'</table><p class="help">'+(part.initial===3?'+4新增第四种副词条，之后4次提升。':'初始四种副词条，之后5次提升。')+'每种第一份作为初值，其余份数作为强化；实际档位可按所列数值安排。</p></details>').join('')+'<p class="help">这是有逐件见证的数值推荐；连续目标和四档数值通常不能恰好使用同一预算，未将附近方案称为已证明的离散全局最优。</p>';
      return card(({solo:'单人',team:'组队'})[scope]+' · 可实现的五件方案',body,{detail:true,open:false});
    }).join('');
  }
  function settlementCaption(data,optimized){
    const result=optimized?data.team:data.team?.base,changes=optimized?data.team?.marginal:data.team?.changes,view=window.GSettlement?.describe(result,changes);
    if(!view)return '';
    const value=x=>{const number=n=>fmt(n,x.unit==='×'?2:1),different=Math.abs(x.max-x.min)>.0001;return (x.unit==='×'?'×':'')+number(x.min)+(different?'–'+(x.unit==='×'?'×':'')+number(x.max):'')+(x.unit==='×'?'':x.unit);};
    const stats=items=>items.map(x=>'<span class="settlement-stat" data-settlement-stat="'+esc(x.key)+'">'+esc(x.label)+' <strong class="num">'+value(x)+'</strong></span>').join('');
    const single=view.groups.length===1,body=single?stats([...view.shared,...view.groups[0].stats]):stats(view.shared)+view.groups.map(group=>'<div class="settlement-group"><span>'+esc(group.label)+'：</span>'+stats(group.stats)+'</div>').join('');
    return '<div class="settlement-caption" role="note"><span class="settlement-label">组队伤害结算属性（含面板外加成）：</span>'+body+(view.hasRange?'<span class="settlement-range-note">不同伤害段采用值不同时显示范围。</span>':'')+'</div>';
  }
  function gainTable(data,optimized=false) {
    const s=optimized?data.solo?.marginal:data.solo?.changes,t=optimized?data.team?.marginal:data.team?.changes;
    if(!s&&!t)return '';
    const map=(rows)=>Object.fromEntries((rows||[]).map(r=>[r.key,r]));const sm=map(s),tm=map(t);
    const all=[...new Set([...(t||[]),...(s||[])].map(x=>x.key))].filter(k=>Math.abs(sm[k]?.rate||0)>1e-9||Math.abs(tm[k]?.rate||0)>1e-9).sort((a,b)=>(tm[b]?.rawRate??sm[b]?.rawRate)-(tm[a]?.rawRate??sm[a]?.rawRate));
    const inactive=Object.keys(E.ROLLS).filter(k=>!all.includes(k));
    const max=Math.max(.01,...[...(s||[]),...(t||[])].map(r=>r.rate));
    const top=all[0];
    const cell=r=>r?'<strong>'+pct(r.rawRate)+'</strong><small class="gain-equivalent">每等效有效条 '+pct(r.rate)+'</small>':'—';
    return card(optimized?'参考分配后，再强化一次':'当前面板 · 一次平均强化的提升',settlementCaption(data,optimized)+'<div class="table-wrap"><table class="gain-table"><thead><tr><th>副词条类型</th><th>实际平均强化值</th><th style="text-align:right">单人 / 强化一次</th><th style="text-align:right">组队 / 强化一次</th></tr></thead><tbody>'+all.map(k=>{const r=tm[k]||sm[k];return '<tr><td>'+(k===top?'<span class="rank-star">✧</span>':'')+E.LABELS[k]+'</td><td class="unit num">+'+fmt(r.rawIncrement??r.increment,4)+(k.endsWith('Pct')||['cpct','cdmg','recharge'].includes(k)?'%':'')+(k.endsWith('Plus')?'<br>折 '+fmt(r.rawCost,4)+' 有效条':'')+'</td><td class="rate num">'+cell(sm[k])+'<div class="rate-bar"><div style="width:'+Math.max(0,100*(sm[k]?.rate||0)/max)+'%"></div></div></td><td class="rate team num">'+cell(tm[k])+'<div class="rate-bar team"><div style="width:'+Math.max(0,100*(tm[k]?.rate||0)/max)+'%"></div></div></td></tr>';}).join('')+'</tbody></table></div><p class="help">粗体是追加一次真实平均强化的提升；下方小字是统一等效有效词条的提升。小攻/小生/小防先按90级基数折算，因此两种单位不同；两种收益均独立重算，未按比例近似。</p>'+(inactive.length?'<p class="help">当前目标无收益或已封顶：'+inactive.map(k=>E.LABELS[k]).join('、')+'。</p>':'')+'<p class="help">提升率 = 追加后的目标期望伤害 ÷ 当前目标期望伤害 − 1。此表比较追加属性；换掉现有属性时，两边的净变化需要一起计算。</p>',{tag:'MARGINAL GAIN'});
  }
  function callFormula(c){
    if(['indirect','transformative'].includes(c.kind))return '<p>'+esc(c.rx)+'：期望 '+fmt(c.avg,2)+'；全暴击/指定暴击规则 '+fmt(c.hit,2)+'</p>';
    const expected=1+Math.min(1,Math.max(0,c.cr/100))*Math.max(0,c.cd/100),crit=1+Math.max(0,c.cd/100);
    let formula;
    if(c.kind==='direct')formula='［'+fmt(c.specialBase??c.base,4)+' × '+fmt(c.specialFactor,4)+' × '+fmt(1+c.baseBonus/100,4)+' × '+fmt(1+c.masteryBonus+c.specialBonus/100,6)+' + '+fmt((c.specialFlat||0)+(c.flatBaseAdded||0),4)+'］ × '+fmt(c.res,4)+' × '+fmt(1+c.elevation/100,4);
    else formula='（'+fmt(c.base,4)+(c.additiveBase?' + '+fmt(c.additiveBase,4)+' 激化基础值':'')+' + '+fmt(c.flatBaseAdded||0,4)+'） × '+fmt(1+c.dmgBonus/100,4)+' × '+fmt(c.def,6)+' × '+fmt(c.res,4)+(c.kind==='amplifying'?' × '+fmt(c.amplificationFactor,6)+' 反应乘区':'');
    const label=M.names[c.rx]||({none:'普通伤害',vaporize:'蒸发',melt:'融化',aggravate:'超激化',spread:'蔓激化'})[c.rx]||c.rx;
    return '<p>'+esc(label)+'：'+formula+'<br>暴击 × '+fmt(crit,4)+' = '+fmt(c.hit,2)+'；期望 × '+fmt(expected,6)+' = '+fmt(c.avg,2)+(Number.isFinite(c.independentMultiplier)&&c.independentMultiplier!==1?'<br>上方基础区已包含独立倍率 × '+fmt(c.independentMultiplier,4):'')+'</p>';
  }
  function traceCard(data,optimized=true) {
    return card('计算依据与实际增益',Object.entries(data).map(([scope,r])=>{
      const v=optimized?r:r.base;
      return '<details class="method-details"><summary>'+({solo:'单人',team:'组队'})[scope]+' · 技能分项与伤害乘区</summary>'+critPanel(v)+v.details.map(d=>'<details class="trace-row"><summary><span>'+esc(d.title)+' × '+fmt(d.count,2)+'</span><span class="num">'+fmt(d.total)+'</span></summary><div class="table-wrap"><table><thead><tr><th>伤害类型</th><th>基础伤害</th><th>精通</th><th>计算暴击率</th><th>计算暴伤</th><th>防御乘区</th><th>抗性乘区</th></tr></thead><tbody>'+d.calls.map(c=>'<tr><td>'+esc(c.rx)+'</td><td>'+fmt(c.base,2)+'</td><td>'+fmt(c.em,1)+'</td><td>'+fmt(c.cr,1)+'%</td><td>'+fmt(c.cd,1)+'%</td><td>'+(c.kind==='direct'||c.kind==='indirect'||c.kind==='transformative'?'不适用':fmt(c.def,4))+'</td><td>'+fmt(c.res,4)+'</td></tr>').join('')+'</tbody></table></div><div class="call-formulas">'+d.calls.map(callFormula).join('')+'</div><p class="help">实际天赋：普攻 '+esc(d.talentLevels?.a??'—')+' / 战技 '+esc(d.talentLevels?.e??'—')+' / 爆发 '+esc(d.talentLevels?.q??'—')+'</p><p class="help">实际技能参数</p><pre>'+esc(JSON.stringify(d.params,null,2))+'</pre><details><summary>查看角色公式函数</summary><pre>'+esc(d.source)+'</pre></details></details>').join('')+'<p class="help">已应用的自身/武器/套装增益</p><ul>'+v.buffs.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul></details>';
    }).join('')+'<details class="method-details"><summary>模型、词条折算与搜索边界</summary><p>花与羽毛固定，沙杯冠按输入选择。优化按有效等效副词条预算进行；每次改属性会重新计算所有自身转化和封顶。</p><p>每个伤害指标使用固定的攻击分支和命中段数。期望伤害用于优化，暴击栏为所有可暴击段均暴击时的总值。反应现场与装备预设会列明；未模拟产球、动作耗时、走位或敌人时序。</p><p>搜索使用多起点优化和属性之间的分配扫描。结果称为“搜索最优”，不能把数值搜索当成已证明的严格全局最优。实际五件圣遗物还有副词条种类与强化限制，等效分配主要用于判断属性方向。</p></details>',{detail:true});
  }
  function resultContent(mode) {
    let data=results[mode]?.[goal];
    if(!data)return emptyResult(mode);
    if(mode==='optimize'&&config.allocationView==='material')data=Object.fromEntries(Object.entries(data).map(([s,r])=>[s,r.error?r:r.material&&!r.material.error?{...r.material,sourceTheoretical:r.total}:{error:r.material?.error||'尚未找到可实现方案。'}]));
    const complete=Object.fromEntries(Object.entries(data).filter(([,r])=>!r.error));
    if(!Object.keys(complete).length)return Object.entries(data).filter(([,r])=>r.error).map(([s,r])=>'<div class="error">'+({solo:'单人',team:'组队'})[s]+'：'+esc(r.error)+'</div>').join('')+emptyResult(mode);
    let result='';
    if(mode==='optimize') {
      result='<div class="result-grid">'+Object.entries(complete).map(([s,r])=>resultSummary(s,r)).join('')+'</div>'+teamReport(complete.team)+allocationCard(complete)+(config.allocationView!=='theory'?materialCards(complete):'')+gainTable(complete,true)+traceCard(complete);
    } else {
      const target=[...(complete.team||complete.solo).changes].sort((a,b)=>b.rawRate-a.rawRate)[0];
      result='<div class="recommendation"><strong>当前更值得强化：'+esc(target?.name||'当前无可提升属性')+' · '+pct(target?.rawRate||0)+'</strong><p>针对'+(complete.team?'组队':'单人')+'与'+(activeMetric()?.title||'所选指标')+'目标，追加一次平均强化的收益最高。切换目标后排名可能变化。</p></div>'+teamReport(complete.team)+gainTable(complete)+traceCard(complete,false);
    }
    if(mode==='marginal')result='<div class="result-grid">'+Object.entries(complete).map(([s,r])=>resultSummary(s,{...r.base,mains:r.inputMains})).join('')+'</div>'+result;
    for(const [scope,r]of Object.entries(data))if(r.error)result+='<div class="error">'+({solo:'单人',team:'组队'})[scope]+'：'+esc(r.error)+'</div>';
    return result;
  }
  function supportPanelReport(t){
    const p=t?.panelDetails;if(!p||!p.required?.length)return '';
    const names={atk:'攻击力',hp:'生命值',def:'防御力',mastery:'精通',cpct:'暴击率',recharge:'充能'},views={total:'总属性用于伤害/平铺',general:'一般转化允许值',nicoleE:'E施放时合格攻击',kazuhaA4:'扩散时可转化精通',sucroseA4:'分享取样时可转化精通',rosariaQ:'Q施放时面板暴率',pruneA4:'鼓舞允许攻击（含已核例外）',ascendantGleam:'满辉公共增益采用的合格属性',keySnapshot:'圣显三层触发时生命',peakSnapshot:'岩峰满层触发时防御',weaponRefresh:'最近一次武器刷新时合格精通'},value=(k,v)=>v===undefined?'—':fmt(v,3)+(['cpct','recharge'].includes(k)?'%':'');
    const rows=p.required.map(k=>'<tr><td>'+names[k]+'</td><td>'+value(k,p.resident[k])+'</td><td>'+value(k,p.total[k])+'</td><td>'+(p.reads||[]).filter(r=>r.key===k).map(r=>esc(views[r.consumer]||r.consumer)+'：'+value(k,r.value)).join('<br>')+'</td></tr>').join('');
    const identity=e=>JSON.stringify([e.id,e.stat,e.points]),current=new Set((p.sources||[]).map(identity)),sources=(p.sources||[]).filter(e=>p.required.includes(e.stat)&&Math.abs(e.points)>1e-8),cast=(p.castSources||[]).filter(e=>p.required.includes(e.stat)&&Math.abs(e.points)>1e-8&&!current.has(identity(e))),refresh=(p.refreshSources||[]).filter(e=>p.required.includes(e.stat)&&Math.abs(e.points)>1e-8&&!current.has(identity(e)));
    const sourceRows=list=>list.map(e=>'<tr><td>'+esc(e.owner||t.owner)+' · '+esc(e.source)+'</td><td>'+esc(names[e.stat])+' '+(e.points>=0?'+':'')+value(e.stat,e.points)+(e.key?.endsWith('Pct')?'（白字×'+fmt(e.value,3)+'%）':'')+'</td><td>'+esc(e.policy==='baseline-excluded'?'常驻已包含，先拆分后重算':e.policy==='direct'||e.policy==='columbinaC2'?'允许一般转化':e.policy==='nicoleC2'?'借入属性；布伦妮鼓舞有单独例外':'计入总属性，按具体技能判断能否再转化')+'</td></tr>').join('');
    return '<details class="method-details support-panel-details"><summary>辅助属性如何得到 · 常驻输入 → 本次采用值</summary><p class="help">'+esc(p.timing)+'。数值来自本次结果；输入已含装备常驻属性，以下只补临时变化并按来源限制转化。</p><div class="table-wrap"><table class="data-table"><thead><tr><th>属性</th><th>常驻输入</th><th>命中时总值</th><th>本次技能采用</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+(sources.length?'<div class="table-wrap"><table class="data-table"><thead><tr><th>属性来源</th><th>实际变化</th><th>转化规则</th></tr></thead><tbody>'+sourceRows(sources)+'</tbody></table></div>':'<p class="help">本次没有额外的相关属性变化。</p>')+(cast.length?'<p class="help">施放取样时另有的来源（只对相应锁定属性的技能生效）：</p><div class="table-wrap"><table class="data-table"><tbody>'+sourceRows(cast)+'</tbody></table></div>':'')+(refresh.length?'<p class="help">最近一次武器刷新时另有的来源（只保存在该轮武器增益内）：</p><div class="table-wrap"><table class="data-table"><tbody>'+sourceRows(refresh)+'</tbody></table></div>':'')+'</details>';
  }
  function teamReport(r){
    const v=r?.base||r,a=window.GTeam.report(v?.teamAudit);if(!v?.teamAudit)return '';
    const records=a.records||[],people=new Map((a.snapshots||[]).map(t=>[t.owner,t]));for(const e of records)if(!people.has(e.owner))people.set(e.owner,null);
    const unit=k=>k.startsWith('talent')?'级':['mastery','masteryBorrowed','atkPlus','atkBorrowed','hpPlus','defPlus','flat'].includes(k)?'':'%';
    const table=(items,other=false)=>'<div class="table-wrap"><table class="data-table support-effects"><thead><tr><th>来源</th><th>'+(other?'受限或未采用的增益':'本次采用的增益')+'</th><th>适用分项 / 次数</th></tr></thead><tbody>'+items.map(e=>'<tr><td>'+esc(e.category)+'<br>'+esc(e.source)+'</td><td>'+esc(window.GTeam.effectLabel(e.key))+' <strong class="num">'+(e.value>=0?'+':'')+Number(e.value).toLocaleString('zh-CN',{maximumFractionDigits:4})+unit(e.key)+'</strong></td><td>'+(e.displayStatus==='used'?e.usedTargets:e.targets).map(esc).join('、')+(e.count?'<br>实际 '+fmt(e.count,2)+' 次'+(Number.isFinite(e.quota)?' / '+fmt(e.quota,2)+' 次可用':''):'')+(e.reason?'<br><span class="help">'+esc(e.reason)+'</span>':'')+'</td></tr>').join('')+'</tbody></table></div>';
    const body=[...people].map(([name,t])=>{const rows=records.filter(e=>e.owner===name),used=rows.filter(e=>e.displayStatus==='used'),other=rows.filter(e=>e.displayStatus==='other');return '<section class="support-report"><h4>'+esc(name)+'</h4>'+(t?'<p class="help">'+t.cons+'命 · '+esc(t.weapon)+' 精'+t.refine+' · E'+t.talents.e+' / Q'+t.talents.q+' · '+esc(t.set==='none'?'未选套装':t.set)+'</p><div class="stat-pills">'+Object.entries(t.inputs||{}).filter(([,n])=>n!==undefined&&n!=='').map(([k,n])=>'<span class="stat-pill">'+esc(({atk:'攻击',hp:'生命',def:'防御',mastery:'精通',cpct:'暴率',recharge:'充能'})[k]||k)+' '+fmt(n,2)+(['cpct','recharge'].includes(k)?'%':'')+'</span>').join('')+'</div>'+supportPanelReport(t):'')+(used.length?table(used):'<p class="help">此来源没有直接用于本指标的额外伤害增益。对其他辅助的属性影响，可在相应辅助的属性明细中查看。</p>')+(other.length?'<details class="method-details"><summary>本指标的覆盖与限制说明 · '+other.length+'项</summary>'+table(other,true)+'</details>':'')+'</section>';}).join('');
    const geoNote=(v.teamAudit.records||[]).some(e=>/双岩共鸣/.test(e.source||''))&&(v.teamAudit.targets||[]).some(t=>(t.calls||[]).some(c=>c.rx==='lunarCrystallize'))?'<p class="help">双岩的15%普通伤害加成不作用于月结晶伤害；20%岩减抗仍按触发状态计入，下方只列本指标实际采用项。</p>':'';
    return card('本次组队计算 · 实际增益清单','<p class="panel-intro">只展示本次指标使用的增益与来源；其他反应、其他元素及未改变本指标的无关记录不重复列出。有限次数按实际使用量列出；同类覆盖、暴击封顶和循环充能另附原因。修改配置后需重新计算。</p>'+geoNote+body,{tag:'TEAM BUFFS / THIS RESULT',detail:true,stateKey:'team-report:'+tab});
  }
  function formulasPage() {
    function formula(title,eq,body){return '<section class="card formula-card"><div class="card-head"><h3>'+title+'</h3><span class="section-tag">FORMULA</span></div><div class="formula-body"><div class="equation">'+eq+'</div>'+body+'</div></section>';}
    return '<div class="formula-layout"><div>'+formula('普通直接伤害','（Σ 属性 × 天赋倍率 × 独立倍率 + 附加基础伤害）<br>×（1 + 适用伤害加成）× 暴击期望 × 防御乘区 × 抗性乘区','<ul><li>攻击 =（角色基础攻击 + 武器基础攻击）×（1 + 攻击%）+ 固定攻击。</li><li>生命与防御按各自角色基础值计算，混合模组逐项相加。</li><li>暴击期望 = 1 + clamp（暴击率，0，100%）× 暴击伤害。</li><li>防御乘区 =（角色等级+100）/［角色等级+100 +（敌人等级+100）×（1−减防）×（1−无视防御）］。</li><li>抗性 r&lt;0：1−r/2；0≤r&lt;75%：1−r；r≥75%：1/（1+4r）。</li></ul>')+
      formula('蒸发与融化','普通伤害 × r ×［1 + 25EM /（9 ×（EM+1400））+ 反应增伤］','<ul><li>水打火蒸发 / 火打冰融化：r = 2。</li><li>火打水蒸发 / 冰打火融化：r = 1.5。</li><li>反应覆盖率作用于实际参与反应的伤害段，不能把整套循环默认全算反应。</li></ul>')+
      formula('激化与剧变','激化附加基础值 = r × L ×［1 + 5EM/（EM+1200）+ 反应增伤］<br><br>剧变 = r × L ×［1 + 16EM/（EM+2000）+ 反应增伤］× 抗性','<table><tr><td>超激化 / 蔓激化</td><td>r = 1.15 / 1.25；附加值加入普通伤害基础区</td></tr><tr><td>超载 / 感电 / 超导</td><td>r = 2.75 / 2 / 1.5</td></tr><tr><td>绽放 / 超绽放 / 烈绽放</td><td>r = 2 / 3 / 3</td></tr><tr><td>碎冰 / 扩散 / 燃烧</td><td>r = 3 / 0.6 / 0.25</td></tr></table><p class="formula-data">L 为角色等级常量。普通剧变不吃通常双暴与普通增伤，特例使用专门的固定暴击规则。</p>')+'</div><div>'+
      formula('月反应与星辉直接伤害','［r × 属性基础值 ×（1+基础提升）<br>×（1 + 6EM/（EM+2000）+ 指定反应增伤）<br>+ 专属固定基础伤害］<br>× 暴击期望 × 抗性 ×（1+擢升之和）','<table><tr><td>直接月感电 / 月绽放 / 月结晶</td><td>r = 3 / 1 / 1.6</td></tr><tr><td>直接星扩散</td><td>r = 1</td></tr><tr><td>直接星超导</td><td>n=0 时 r=1；否则 min（2，1.4+0.05n）</td></tr></table><ul><li>普通元素、通用与技能增伤、减防均不适用于这类伤害。</li><li>专属固定增伤加入精通乘区之后。</li><li>直接技能不额外乘等级系数；防御型角色的“防御属性”仍能作为伤害基础。</li></ul>')+
      formula('间接月/星反应','每名实际贡献人先计算完整伤害 u<br>按伤害排序：0.6u₁ + 0.3u₂ + 0.05u₃ + 0.05u₄','<ul><li>基础属性换为每位贡献人的等级常量 L。</li><li>间接月感电/月结晶 r = 3 / 1.6；星扩散初始风伤 r=0.75，一级/二级冰旋 r=2/3。</li><li>期望枚举各人的暴击组合后再排序。需要贡献人面板和实际触发次数。</li><li>星超导反应本身不造成独立伤害，星超导伤害来自角色技能。</li></ul>')+
      '<section class="card formula-card"><div class="card-head"><h3>数据范围与逐角色公式</h3><span class="section-tag">7.1 / 2026.10.14</span></div><div class="formula-body"><p class="formula-data">已载入 '+D.characters.length+' 个角色/旅行者元素模型、'+D.weapons.length+' 件武器和 '+D.artifacts.length+' 种套装。倍率与角色模板固定到 2026-10-12 的数据提交，已修正常见单人队伍假设。每个技能的实际参数与函数可在计算结果中展开核对。</p><div class="divider"></div><p class="formula-data">当前角色：'+esc(config.character)+'。角色模板不等于完整战斗模拟；新角色与条件技能依然需要输入准确资源、技能次数和触发条件。</p><div class="divider"></div><a class="source-link" href="THIRD_PARTY_NOTICES.txt" target="_blank">数据许可 ↗</a></div></section></div></div>';
  }
  function pendingOcrUi(){
    if(!ocr.draft&&!ocr.busy)return;
    root.querySelector('.results')?.classList.add('stale');
    const status=root.querySelector('.status-msg');if(status)status.textContent=ocr.busy?'正在识别截图…':'截图待核对；采用后再计算新结果';
    const csv=root.querySelector('[data-action="csv"]');if(csv)csv.disabled=true;
    for(const b of root.querySelectorAll('[data-action="calculate"]')){b.disabled=ocr.busy;b.textContent=ocr.busy?'正在识别截图…':ocr.confirmed?'采用截图并计算 →':'先核对截图识别结果 →';}
  }
  function render() {
    ocrDragDepth=0;
    for(const d of root.querySelectorAll('details[data-card-title]'))openedCards.set(d.dataset.cardTitle,d.open);
    config.setChoice=config.setChoice||'none';
    if(!M.selected(config).some(m=>m.id===goal))goal=M.selected(config)[0]?.id||'';
    root.innerHTML='<header class="topbar"><div class="topbar-inner"><div class="brand"><div class="brand-icon">✧</div><div><h1>提瓦特词条实验室</h1><p>TEYVAT · ARTIFACT STAT LAB</p></div></div><div class="top-actions"><span class="badge">原神 '+D.version+' · 月 / 星反应</span><button class="soft-btn" data-action="import">导入配置</button><button class="soft-btn" data-action="export">保存配置 ↓</button></div></div></header><main class="workspace"><nav class="main-nav">'+[['optimize','最优分配'],['marginal','词条收益'],['formulas','公式与数据']].map(([k,l],i)=>'<button class="nav-btn '+(tab===k?'active':'')+'" data-tab="'+k+'"><span class="nav-num">0'+(i+1)+'</span>'+l+'</button>').join('')+'</nav>'+
      (tab==='formulas'?formulasPage():'<div class="layout"><aside class="sidebar">'+characterCard()+(tab==='marginal'?panelCard():'')+artifactsCard()+(tab==='optimize'?budgetCard():'')+metricsCard()+metricSettingsCard()+teammatesCard()+manualBuffCard()+buffsCard()+contributorsCard()+'</aside><section class="results '+(dirty?'stale':'')+'"><div class="results-top"><div><h3>'+(tab==='optimize'?'各伤害指标 · 分别求最优':'一个词条，会带来多少提升')+'</h3><p>固定主词条与实际配置，比较单人和组队。</p></div>'+goalSwitch()+'</div><div class="calculate-line" style="margin-bottom:15px"><span class="status-msg">'+(busy?'正在计算…':dirty?'配置已变化，请重新计算':'可展开计算依据核对每个乘区')+'</span><div style="margin-left:auto;display:flex;gap:7px"><button class="soft-btn" data-action="csv" '+(!results[tab]?.[goal]||dirty||busy?'disabled':'')+'>导出结果</button><button class="primary" data-action="calculate"'+(busy?' disabled':'')+'>'+(busy?'计算中…':tab==='marginal'?'比较所选指标收益':'分别优化所选指标')+'<span class="arrow">→</span></button></div></div>'+(busy?'<div class="progress"><div style="width:'+progress+'%"></div></div>':'')+(error?'<div class="error" role="alert">'+esc(error)+'</div>':'')+metricOverview(tab)+(activeMetric()?'<div class="metric-assumptions"><strong>'+esc(activeMetric().title)+'</strong><ul>'+M.describe(config,activeMetric()).map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul></div>':'')+resultContent(tab)+'</section></div>')+
      '<footer class="footer"><span>五星圣遗物 · 花与羽毛固定 · 输入的技能条件与增益决定结果</span><span><a href="USER_GUIDE.html" target="_blank">使用说明与覆盖范围</a> · '+(window.location.protocol==='file:'?'':'<a href="teyvat-offline.zip" download>下载离线版</a> · ')+'<a href="THIRD_PARTY_NOTICES.txt" target="_blank">许可信息</a> · 本地保存</span></footer></main>'+(tab==='formulas'?'':'<div class="mobile-actions"><button class="soft-btn" data-action="view-results">查看结果 ↑</button><button class="primary" data-action="calculate"'+(busy?' disabled':'')+'>'+(busy?'计算中…':'计算所选指标 →')+'</button></div>')+'<button type="button" class="back-to-top'+(tab==='formulas'?'':' above-mobile-actions')+'" data-action="back-to-top" aria-label="返回顶部" title="返回顶部"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 14l6-6 6 6M6 4h12"/></svg><span>顶部</span></button>'+'<input class="hidden" type="file" id="config-file" accept=".json">';
    pendingOcrUi();
  }
  function sync() {
    config.metricSettings=M.settings(config);config.supportMode=config.supportMode||'full';
    if(Array.isArray(config.metricIds)){const allowed=new Set(M.definitions(config).map(m=>m.id));config.metricIds=config.metricIds.filter(id=>allowed.has(id));}
    config.rollQuality='average';config.normalizedBudget=true;
    config.team={};for(const r of config.teamRows||[])config.team[r.key]=(config.team[r.key]||0)+Number(r.value||0);
    if(config.setChoice==='none')config.sets=[];
    else if(config.setChoice==='two')config.sets=(config.sets||[{name:'',count:2},{name:'',count:2}]).map(s=>({...s,count:2}));
    else if(config.setChoice)config.sets=[{name:config.setChoice,count:4}];
    config.autoMains=false;save();
  }
  function markDirty(){dirty=true;sync();root.querySelector('.results')?.classList.add('stale');const s=root.querySelector('.status-msg');if(s&&!busy)s.textContent='配置已变化，请重新计算';}
  function selectCharacter(key) {
    ocr.controller?.abort();ocr.draft=null;ocr.error='';ocr.confirmed=false;ocr.editTotals=false;
    const old=config;config=E.defaultConfig(key);config.metricRevision=1;config.budget=old.budget;config.rollQuality=old.rollQuality;config.teammates=old.teammates||[];config.teamRows=old.teamRows||[];config.team=old.team||{};config.supportMode=old.supportMode||'full';config.supportPanelMode=old.supportPanelMode||'base';
    config.panelMode='character';
    config.metricSettings=M.settings({metricSettings:{artifactMode:old.metricSettings?.artifactMode||'full',weaponMode:old.metricSettings?.weaponMode||'full',stellarHits:old.metricSettings?.stellarHits??10}});goal='';
    config.mains={sands:'',goblet:'',circlet:''};config.weapon='';config.setChoice='none';results={optimize:{},marginal:{}};error='';dirty=true;save();render();
  }
  function showSearch(query) {
    const box=document.getElementById('character-results');const hits=D.characters.filter(c=>c.key.includes(query.trim())||c.name.includes(query.trim())).slice(0,25);
    box.innerHTML=hits.length?hits.map(c=>'<button data-character="'+esc(c.key)+'"><span class="element '+c.element+'">'+E.ELEMENT[c.element]+'</span><span>'+esc(c.key)+'</span><small style="margin-left:auto">'+E.WEAPON[c.weapon]+'</small></button>').join(''):'<div class="card-body" style="padding-top:12px">未找到已实装角色</div>';box.classList.remove('hidden');
  }
  function toast(s){document.querySelector('.save-toast')?.remove();const el=document.createElement('div');el.className='save-toast';el.textContent=s;document.body.appendChild(el);setTimeout(()=>el.remove(),2300);}
  function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
  function validate() {
    if(invalidInputs.size)throw new Error('请先修正尚未有效填写的技能参数 JSON。');
    if(!config.weapon)throw new Error('请先选择主角色的武器和精炼等级。');
    if(!M.selected(config).length)throw new Error('请至少选择一个角色伤害指标。');
    if(Object.keys(mainOptions).some(k=>!mainOptions[k].includes(config.mains[k])))throw new Error('请先选择时之沙、空之杯、理之冠的三个有效主属性。');
    function numeric(label,value,min=-Infinity,max=Infinity,integer=false){if(value===''||value===null||!Number.isFinite(Number(value))||value<min||value>max||integer&&!Number.isInteger(Number(value)))throw new Error(label+'需为'+(integer?'整数':'数字')+'，范围 '+min+'–'+max+'。');}
    if(!['full','manual'].includes(config.supportMode))throw new Error('队友增益状态无效。');
    numeric('命座',config.cons,0,6,true);numeric('武器精炼',config.refine,1,5,true);
    E.getStats(E.character(config.character),config.level);
    numeric('有效词条总数',config.budget,0,60);
    if(!Array.isArray(config.artifactStarts)||config.artifactStarts.length!==5||config.artifactStarts.some(n=>![3,4].includes(n)))throw new Error('请确认五件圣遗物起始副词条各为3条或4条。');
    numeric('敌人等级',config.enemy.level,1,200,true);numeric('附近敌人数',config.enemy.count??1,1,20,true);numeric('敌人抗性',config.enemy.resistance,-100,1000);
    for(const k of ['a','e','q'])numeric('主角色天赋',config.talents[k],1,10,true);
    for(const s of ['solo','team']){numeric('额外保留充能词条',config.reservedRechargeRolls[s],0,45);numeric('最低充能',config.minRecharge[s],100,1000);}
    for(const r of config.teamRows||[])if(!buffFields[r.key]||r.value===''||!Number.isFinite(Number(r.value)))throw new Error('补充增益的类型和数值需要有效填写。');
    for(const s of config.sets||[])if(!D.artifacts.some(a=>a.name===s.name&&a.maxRarity===5))throw new Error('主角色请选择五星套装。本计算的词条单位与主属性为五星20级。');
    if(config.weapon==='custom')numeric('自定义武器白字',config.customWeapon.base,1,2000);
    if(tab==='marginal'&&config.panelMode==='artifacts'){
      const totals=config.artifactPanel||{},main=E.artifactMainStats(config.mains);
      for(const k of Object.keys(E.ROLLS))if(!Number.isFinite(Number(totals[k]))||totals[k]<main[k]-1e-8)throw new Error('圣遗物合计的'+E.LABELS[k]+'不足以包含已选主词条，请核对五件属性总和。');
      for(const k of ['dmg','phy','heal',...Object.keys(E.MAIN).filter(k=>k.startsWith('dmg_'))])totals[k]=main[k]||0;
    }
  }
  async function calculate() {
    if(ocr.busy||ocr.draft){error=ocr.busy?'正在识别截图，请等待或取消识别。':'请先核对并采用截图识别结果，或者放弃此次识别后再计算。';render();root.querySelector(ocr.draft?'.ocr-confirm':'.ocr-upload')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    try{validate();}catch(e){error=e.message;render();root.querySelector('.error')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    error='';busy=true;progress=0;render();
    const snapshot=copy(config),mode=tab;
    results[mode]={};let task=0;const metrics=M.selected(snapshot),tasks=metrics.length*2;
    for(const metric of metrics) {
      const g=metric.id;
      results[mode][g]={};
      if(mode==='optimize')for(const scope of ['solo','team']) {
        try{if(scope==='team'&&!snapshot.teammates?.some(t=>t.character))throw new Error('请先选择队友，再计算相同指标的组队结果。');const cfg=M.configFor(snapshot,metric);results[mode][g][scope]=await E.optimize(cfg,scope,p=>{progress=100*(task+p)/tasks;const bar=root.querySelector('.progress div');if(bar)bar.style.width=progress+'%';});}
        catch(e){results[mode][g][scope]={error:e.message};}task++;
        await new Promise(r=>setTimeout(r,0));
      } else {
        try{results[mode][g]=E.marginal(M.configFor(snapshot,metric),snapshot.panel);if(!snapshot.teammates?.some(t=>t.character))results[mode][g].team={error:'选择队友后可同时计算组队收益。'};}catch(e){results[mode][g]={solo:{error:e.message},team:{error:e.message}};}
        task+=2;progress=100*task/tasks;await new Promise(r=>setTimeout(r,0));
      }
    }
    if(config.character!==snapshot.character)results[mode]={};busy=false;dirty=JSON.stringify(snapshot)!==JSON.stringify(config);render();if(window.matchMedia('(max-width: 1000px)').matches)root.querySelector('.results')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function imageDropZone(event){return event.target?.closest?.('.ocr-upload')||event.target?.parentElement?.closest?.('.ocr-upload');}
  function draggingFiles(data){return Array.from(data?.types||[]).includes('Files')||Array.from(data?.items||[]).some(item=>item.kind==='file')||!!data?.files?.length;}
  function clearImageDrag(zone=root.querySelector('.ocr-upload')){ocrDragDepth=0;zone?.classList.remove('drag-over');}
  document.addEventListener('dragenter',event=>{
    const zone=imageDropZone(event);if(!zone||!draggingFiles(event.dataTransfer)||ocr.busy||busy)return;
    event.preventDefault();ocrDragDepth++;zone.classList.add('drag-over');
  });
  document.addEventListener('dragover',event=>{
    const zone=imageDropZone(event),files=draggingFiles(event.dataTransfer);if(!zone&&!files)return;
    event.preventDefault();const accepted=!!zone&&files&&!ocr.busy&&!busy;
    if(event.dataTransfer)event.dataTransfer.dropEffect=accepted?'copy':'none';
    if(accepted){ocrDragDepth=Math.max(1,ocrDragDepth);zone.classList.add('drag-over');}
    else if(!zone)clearImageDrag();
  });
  document.addEventListener('dragleave',event=>{
    const zone=imageDropZone(event);if(!zone)return;ocrDragDepth=Math.max(0,ocrDragDepth-1);
    if(!ocrDragDepth&&!zone.contains(event.relatedTarget))zone.classList.remove('drag-over');
  });
  document.addEventListener('drop',event=>{
    const zone=imageDropZone(event);if(!zone&&!draggingFiles(event.dataTransfer))return;
    event.preventDefault();clearImageDrag(zone||undefined);if(!zone||ocr.busy||busy)return;
    let files=Array.from(event.dataTransfer?.files||[]);
    if(!files.length)files=Array.from(event.dataTransfer?.items||[]).filter(item=>item.kind==='file').map(item=>item.getAsFile?.()).filter(Boolean);
    if(files.length!==1){ocr.error=files.length?'一次请拖入一张截图。':'请拖入PNG、JPG或WebP图片文件。';render();return;}
    recognizeScreenshot(files[0]);
  });
  root.addEventListener('input',event=>{
    const el=event.target;
    if(el.dataset.ocrPath){set(el.dataset.ocrPath,el.type==='number'&&el.value!==''?Number(el.value):el.value,ocr.draft);ocr.confirmed=false;const b=root.querySelector('.ocr-apply');if(b)b.disabled=true;const check=root.querySelector('[data-ocr-confirm]');if(check)check.checked=false;pendingOcrUi();return;}
    if(el.id==='character-search'){showSearch(el.value);return;}
    if(el.id==='budget-range'){config.budget=Number(el.value);const input=document.getElementById('budget-number');if(input)input.value=el.value;markDirty();return;}
    if(el.dataset.path&&el.type!=='checkbox'&&el.tagName!=='SELECT') {if(el.dataset.path.startsWith('artifactPanel.'))config.artifactInputSource='手动填写';customSelfFor(el.dataset.path);if(el.value===''&&(el.dataset.path.includes('.params.')||el.dataset.path.startsWith('singleParams.')||el.dataset.path.includes('teamState.')))clear(el.dataset.path);else set(el.dataset.path,controlValue(el));markDirty();}
  });
  root.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='artifact-image'&&el.files[0]){recognizeScreenshot(el.files[0]);return;}
    if(el.hasAttribute('data-ocr-confirm')){ocr.confirmed=el.checked;const b=root.querySelector('.ocr-apply');if(b)b.disabled=!ocr.confirmed;pendingOcrUi();return;}
    if(el.dataset.ocrPath){set(el.dataset.ocrPath,/configuration\.(cons|refine)$|\.value$/.test(el.dataset.ocrPath)&&el.value!==''?Number(el.value):el.value,ocr.draft);ocr.confirmed=false;const b=root.querySelector('.ocr-apply');if(b)b.disabled=true;const check=root.querySelector('[data-ocr-confirm]');if(check)check.checked=false;pendingOcrUi();return;}
    if(el.dataset.metricId){const ids=new Set(M.selected(config).map(m=>m.id));el.checked?ids.add(el.dataset.metricId):ids.delete(el.dataset.metricId);config.metricIds=[...ids];markDirty();render();return;}
    if(el.dataset.listPath){const values=new Set(get(el.dataset.listPath)||[]);el.checked?values.add(el.dataset.listValue):values.delete(el.dataset.listValue);set(el.dataset.listPath,[...values]);markDirty();return;}
    if(el.dataset.path) {
      const path=el.dataset.path;
      if(path.startsWith('artifactPanel.'))config.artifactInputSource='手动填写';
      if(path!=='metricSettings.ownBuffMode'||el.value==='custom')customSelfFor(path);
      set(path,controlValue(el));
      if(el.value===''&&(path.includes('.params.')||path.startsWith('singleParams.')||path.includes('teamState.')))clear(path);
      if(path==='allocationView'){save();render();return;}
      if(path.endsWith('teamStateEnabled')||path==='singleTeamStateEnabled'){
        const target=path==='singleTeamStateEnabled'?'singleTeamState':path.replace('teamStateEnabled','teamState');
        if(el.checked&&!get(target))set(target,{teammates:Object.fromEntries((config.teammates||[]).map((t,i)=>[i,Object.fromEntries(['castE','castQ','characterActive','weaponActive','setActive'].map(k=>[k,!!t[k]]))]))});
      }
      if(/^teammates\.\d\.character$/.test(path)){
        const i=Number(path.split('.')[1]),key=el.value;config.teammates[i]=key?{character:key,cons:0,weapon:'',refine:1,talents:{a:1,e:10,q:10},panel:{},premod:{},set:'none',stacks:'',resources:'',weaponStacks:0,projectionCasts:1,projectionTimingVerified:false,uptime:100,mode:key==='申鹤'?'tap':key==='哥伦比娅'?'lunarCharged':key==='奥黛塔'?'stellarConduct':'',element:'',castE:false,castQ:false,characterActive:false,weaponActive:false,setActive:false,homework:false,manualVerified:false}:{};
      }
      if(/^teammates\.\d\.character$/.test(path)){const names=[config.character,...config.teammates.map(t=>t.character)];for(const t of config.teammates)if(t.buffTarget&&(!names.includes(t.buffTarget)||t.buffTarget===t.character))t.buffTarget=config.character;}
      if(path==='setChoice')config.sets=el.value==='two'?[{name:'',count:2},{name:'',count:2}]:[];
      markDirty();if(el.tagName==='SELECT'||el.type==='checkbox'||el.dataset.talentUplift!==undefined||path.startsWith('metricSettings.'))render();
    }
    if(el.dataset.buffId){if(el.dataset.buffId.startsWith('self:'))customSelfFor('metricSettings.ownBuffMode');const ids=new Set(config.disabledBuffs||[]);el.checked?ids.delete(el.dataset.buffId):ids.add(el.dataset.buffId);config.disabledBuffs=[...ids];markDirty();render();}
    if(el.dataset.jsonScope||el.dataset.rowParams!==undefined||el.hasAttribute('data-single-params')){
      const key=el.dataset.jsonScope?'scope:'+el.dataset.jsonScope:el.dataset.rowParams!==undefined?'row:'+el.dataset.rowParams:'single';
      try{const p=JSON.parse(el.value||'{}');if(!p||typeof p!=='object'||Array.isArray(p))throw new Error();readConfig({...config,singleParams:p});if(key==='single')config.singleParams=p;else if(el.dataset.jsonScope)config.parameters[el.dataset.jsonScope]=p;else config.rotation[Number(el.dataset.rowParams)].params=p;invalidInputs.delete(key);markDirty();error='';}
      catch{invalidInputs.set(key,{raw:el.value});error='技能参数需要有效JSON对象，修正后才能计算。';render();}
    }
    if(el.id==='config-file'&&el.files[0])el.files[0].text().then(text=>{try{if(text.length>3000000)throw new Error('配置文件过大');const parsed=JSON.parse(text);config=readConfig(parsed.config||parsed);invalidInputs.clear();sync();results={optimize:{},marginal:{}};dirty=true;error='';render();toast('配置已导入');}catch(e){error='无法导入配置：'+e.message;render();}});
  });
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.character){selectCharacter(button.dataset.character);return;}
    if(button.dataset.tab){tab=button.dataset.tab;error='';render();return;}
    if(button.dataset.goal){goal=button.dataset.goal;render();return;}

    if(button.dataset.removeBuff!==undefined){config.teamRows.splice(Number(button.dataset.removeBuff),1);markDirty();render();return;}
    if(button.dataset.removeContributor!==undefined){config.contributors.splice(Number(button.dataset.removeContributor),1);markDirty();render();return;}
    switch(button.dataset.action) {
      case 'ocr-upload':document.getElementById('artifact-image').click();break;
      case 'ocr-cancel':ocr.controller?.abort();break;
      case 'ocr-dismiss':ocr.draft=null;ocr.error='';ocr.confirmed=false;error='';render();break;
      case 'ocr-apply':applyScreenshot();break;
      case 'calculate':if(ocr.draft&&ocr.confirmed)applyScreenshot();else calculate();break;
      case 'back-to-top':window.scrollTo({top:0,left:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});break;
      case 'view-results':root.querySelector('.results')?.scrollIntoView({behavior:'smooth',block:'start'});break;


      case 'add-buff':config.teamRows.push({key:'atkPct',value:0});markDirty();render();break;
      case 'add-contributor':config.contributors.push({level:90,mastery:0,cpct:5,cdmg:50,bonus:0,baseBonus:0,flat:0,elevation:0});markDirty();render();break;
      case 'example-panel':try{config.panel=window.GResident.forward(config);markDirty();render();toast('已填入无副词条的示例面板，请按你的实际面板修改');}catch(e){error=e.message;render();}break;
      case 'artifact-edit':ocr.editTotals=true;render();break;
      case 'artifact-example':config.artifactPanel=E.artifactMainStats(config.mains);config.artifactInputSource='手动填写';markDirty();render();toast('已填入五件主词条合计，请按实际副属性修改');break;
      case 'export':download('原神词条配置-'+config.character+'.json',JSON.stringify({schema:'teyvat-stat-lab-v7',version:D.version,date:D.asOf,config},null,2));toast('配置已保存');break;
      case 'import':document.getElementById('config-file').click();break;
      case 'csv':{
        if(!results[tab])break;
        const rows=[['角色',config.character],['资料快照',D.asOf],['有效预算',config.budget],['沙/杯/冠',...Object.values(config.mains).map(k=>E.LABELS[k])],['目标','范围','结果类型','属性/部位','数量/属性值','一次真实平均强化提升%','每等效有效条提升%','期望伤害','全暴击伤害','预算差/说明']];
        for(const [target,data]of Object.entries(results[tab]))for(const [scope,r]of Object.entries(data||{})){
          const label=M.definition(config,target)?.title||target,name=scope==='solo'?'单人':'组队';
          if(r.error){rows.push([label,name,'错误','','','','','','',r.error]);continue;}
          if(tab==='optimize'){
            for(const [k,v]of Object.entries(r.allocation))rows.push([label,name,'连续分配',E.LABELS[k],v,'','',r.total,r.critical,r.method]);
            const m=r.material;if(m?.error)rows.push([label,name,'五件方案','','','','','','',m.error]);
            else if(m){for(const [k,v]of Object.entries(m.allocation))rows.push([label,name,'五件方案',E.LABELS[k],v,'','',m.total,m.critical,m.budgetLeft]);for(const p of m.placement||[])for(const [k,values]of Object.entries(p.tiers))rows.push([label,name,'逐件四档',p.name+' / '+E.LABELS[k],values.join(' + '),'','',m.total,m.critical,'起始'+p.initial+'条；第一份为初值']);}
          }
          for(const e of window.GTeam.report(r.teamAudit||r.base?.teamAudit).records)rows.push([label,name,e.displayStatus==='used'?'本次实际采用增益':'覆盖或限制说明',e.owner+' / '+e.source+' / '+window.GTeam.effectLabel(e.key),e.value,'','',r.total??r.base?.total,r.critical??r.base?.critical,(e.displayStatus==='used'?e.usedTargets:e.targets).join('、')+(e.count?'；实际'+e.count+'次':'')+(e.reason?'；'+e.reason:'')]);
          for(const t of (r.teamAudit||r.base?.teamAudit)?.snapshots||[]){const p=t.panelDetails;if(!p)continue;for(const key of p.required||[]){rows.push([label,name,'辅助常驻面板',t.owner+' / '+key,p.resident[key],'','',r.total??r.base?.total,r.critical??r.base?.critical,'命中时总值 '+p.total[key]]);for(const read of (p.reads||[]).filter(x=>x.key===key))rows.push([label,name,'辅助转化采用值',t.owner+' / '+key+' / '+read.consumer,read.value,'','',r.total??r.base?.total,r.critical??r.base?.critical,p.timing]);}const sourceId=e=>JSON.stringify([e.id,e.stat,e.points]),current=new Set((p.sources||[]).map(sourceId));for(const [phase,list] of [['辅助属性来源',p.sources],['施放取样专属来源',p.castSources],['武器刷新专属来源',p.refreshSources]])for(const e of list||[])if((p.required||[]).includes(e.stat)&&(phase==='辅助属性来源'||!current.has(sourceId(e))))rows.push([label,name,phase,t.owner+' / '+e.source+' / '+e.stat,e.points,'','',r.total??r.base?.total,r.critical??r.base?.critical,e.policy]);}
          for(const c of (tab==='optimize'?r.marginal:r.changes)||[])rows.push([label,name,'追加收益',c.name,c.rawIncrement,c.rawRate,c.rate,tab==='optimize'?r.total:r.base.total,tab==='optimize'?r.critical:r.base.critical,'真实平均强化值；有效条按90级基数折算']);
        }
        download('原神词条结果-'+config.character+'.csv','\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8');break;
      }
    }
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.character-box'))document.getElementById('character-results')?.classList.add('hidden');});
  sync();render();
  window.StatLab={getConfig:()=>copy(config),getResults:()=>copy(results),calculate,selectCharacter,engine:E};
})();
