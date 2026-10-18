/* Shared buffs are recorded at the same point that their numeric values are added. */
(function(global){
  'use strict';
  const E=global.GEngine,D=global.GDATA;
  if(typeof module!=='undefined'){require('./support-presets.js');require('./support-panels.js');}
  const P=global.GSupport;
  const MOON=['爱诺','菲林斯','哥伦比娅','菈乌玛','莉奈娅','奈芙尔','雅珂达','叶洛亚','伊涅芙','兹白'];
  const moonStat=key=>{const e=E.character(key)?.element;return ['pyro','electro','cryo'].includes(e)?'atk':e==='hydro'?'hp':e==='geo'?'def':'mastery';};
  const moonValue=(key,value)=>Math.min(36,Math.max(0,value)*({atk:.009,hp:.0006,def:.01,mastery:.0225})[moonStat(key)]);
  function moonCandidates(c){const people=[{id:'primary',character:c.character},...(c.teammates||[]).map((t,i)=>({...t,id:String(i+1)}))].filter(t=>E.character(t.character));if(people.filter(t=>MOON.includes(t.character)).length<2)return [];return people.filter(t=>!MOON.includes(t.character)&&(t.id==='primary'||c.supportMode==='full'||t.castE||t.castQ)).map(t=>({...t,stat:moonStat(t.character)}));}
  const HEX=['阿贝多','布伦妮','杜林','法尔伽','菲谢尔','可莉','雷泽','洛恩','莫娜','尼可','砂糖','温迪'];
  const NIGHTS=['玛薇卡','卡齐娜','希诺宁','茜特菈莉','伊安珊','欧洛伦','玛拉妮','基尼奇','恰斯卡','瓦雷莎','伊法'];
  const num=(x,d=0)=>Number.isFinite(Number(x))&&x!==''?Number(x):d;
  const clone=o=>JSON.parse(JSON.stringify(o));
  const fieldNames={atk:'攻击力',hp:'生命值',def:'防御力',mastery:'元素精通',cpct:'暴击率',recharge:'充能效率'};
  const descriptions={
    '班尼特':'Q增攻按90级角色+武器白字计算。C0需主C生命高于70%，C6火伤对所有武器类型生效。',
    '芙宁娜':'层数填实际气氛值，C0上限300、C1起上限400；不默认满气氛。',
    '枫原万叶':'填写可转化精通，设置实际扩散元素。C2前台200精通需Q领域。',
    '纳西妲':'Q精通分享动态比较主C与队友可转化精通；填写她的精通并设置蕴种印/激化条件。',
    '砂糖':'可转化精通20%分享、同扩散元素50精通；C6与魔导增益需要相应条件。',
    '申鹤':'冰翎动态读取当前总攻击；辅助在后台时不保留班尼特前台领域。点按5翎/长按7翎。',
    '云堇':'旗阵动态读取允许用于增幅的当前防御，每角色30次，仅普通攻击。',
    '五郎':'E固定防御按天赋，Q额外25%防御；岩伤/岩暴伤按队伍岩人数。',
    '九条裟罗':'E/Q同类增攻不重复；C6只雷元素伤害暴伤。',
    '珐露珊':'Q风增伤和减抗；A4每0.8秒最多一次，请填实际附加伤害命中次数。',
    '希诺宁':'至少两枚转换采样时全部采样（含剩余岩采样）可激活；C2岩采样另有常驻机制，C4每角色6次。',
    '茜特菈莉':'A1需要冻结/融化；C2精通、C6层数按实际状态；C1附加伤害次数需要另填。',
    '伊安珊':'攻击输入可用于转化的实际值；层数填当前夜魂0–54。Q受天赋上限约束。',
    '爱可菲':'E/Q降水冰抗按实际水冰人数；只有四水冰才生效C1冰暴伤。',
    '菈乌玛':'实际精通决定祝赐与祷歌；Q剩余祷歌层数请填，初始18层。',
    '伊涅芙':'攻击→精通分享取可转化攻击；祝赐/C1取实际总攻击。她的额外月攻击不算主C增益。',
    '哥伦比娅':'生命决定三种月基础提升；C2皎辉类型、Q、擢升与C6需实际触发。',
    '莉奈娅':'防御决定精通/祝赐/编录；月笼与剩余编录层数需要确认。',
    '叶洛亚':'精通决定普通岩/月结晶平铺；Q夜莺剩余层数需要填，初始21。C6替代原双暴。',
    '尼可':'E取施放时可转化攻击并受天赋上限；投影另用伤害时尼可总攻击。Q与C1投影可作为独立技能项添加，不吃技能类型增伤或反应。',
    '沃雅妮莎':'HP决定领唱。普通水冰/星扩散模式二选一；Q的86.4%仅自己，不能传给主C。',
    '奥黛塔':'层数填已转移到主C的华彩数量，不能默认刚开E就满层。C4才分享一半Q反应增伤。',
    '薇斯纳':'只有星扩散基础提升共享，人数、整肃等攻击/精通收益只作用她自己。',
    '罗莎莉亚':'填写施放Q时暴击率；全队获得其15%，上限15%。',
    '夜兰':'层数填玲珑骰当前已持续秒数0–14；前台伤害加成为1%+3.5%/秒，上限50%。',
    '坎蒂丝':'Q给元素普通攻击增伤，HP天赋加成为每1000HP增加0.5%。',
    '夏沃蕾':'四人仅火雷且两种均存在；需实际超载/超量弹条件，层数填C6治疗层数0–3。',
    '钟离':'E护盾存在才共享20%全元素/物理减抗。'
  };
  const simpleNames=['阿贝多','达达利亚','神里绫人','丽莎','北斗','行秋','香菱','辛焱','安柏','可莉','琴','迪奥娜','重云','凝光','莫娜','雷电将军','流浪者','优菈','珊瑚宫心海','胡桃','甘雨','迪卢克','神里绫华','刻晴','魈','提纳里','艾尔海森','娜维娅','诺艾尔','荒泷一斗','阿蕾奇诺','玛拉妮','基尼奇','菲米尼','凯亚','埃洛伊','赛索斯','赛诺','久岐忍','多莉','七七','早柚','菲林斯','奈芙尔','兹白','桑多涅','旅行者·冰'];
  const supported=new Set([...Object.keys(descriptions),...simpleNames,...P.fixed,...P.neutral,'七七','甘雨','赛诺','多莉','莫娜']);
  const partialCoverage={伊法:'夜魂在场资格与星扩散系数尚未核实，不能自动填入不确定的团队加成'};
  for(const name of Object.keys(partialCoverage))supported.delete(name);
  const baseInputs={阿贝多:['def'],枫原万叶:['mastery'],纳西妲:['mastery'],砂糖:['mastery'],申鹤:['atk'],希诺宁:['def'],茜特菈莉:['mastery'],伊安珊:['atk'],菈乌玛:['mastery'],伊涅芙:['atk'],菲林斯:['atk'],奈芙尔:['mastery'],兹白:['def'],哥伦比娅:['hp'],莉奈娅:['def'],叶洛亚:['mastery'],尼可:['atk'],沃雅妮莎:['hp'],奥黛塔:['atk'],薇斯纳:['atk'],桑多涅:['atk'],'旅行者·冰':['atk'],罗莎莉亚:['cpct'],坎蒂丝:['hp'],夏沃蕾:['hp'],云堇:['def']};
  const convertedInputs={云堇:['def'],布伦妮:['atk'],枫原万叶:['mastery'],纳西妲:['mastery'],砂糖:['mastery'],伊安珊:['atk'],伊涅芙:['atk'],莉奈娅:['def'],尼可:['atk'],哥伦比娅:['hp']};
  const resourceNames={申鹤:['冰翎剩余次数',5],云堇:['飞云旗阵剩余次数',30],希诺宁:['C4剩余次数',6],茜特菈莉:['C1星刃剩余次数',10],菈乌玛:['苍色祷歌剩余层数',18],莉奈娅:['历览编录剩余层数',6],叶洛亚:['夜莺剩余层数',21],尼可:['C4剩余次数',8],沃雅妮莎:['领唱/重唱剩余层数',25]};
  const stackNames={芙宁娜:'实际气氛值',伊安珊:'当前夜魂值（0–54）',茜特菈莉:'C6秘律层数（0–40）',奥黛塔:'已转移到主C的华彩层数',夜兰:'玲珑骰已持续秒数（0–14）',夏沃蕾:'C6治疗层数（0–3）',漩流颂歌:'治疗层数（0–3）'};
  function rawSupportInputs(t,config) {
    const keys=new Set(baseInputs[t.character]||[]);
    if(['圣显之钥','漩流颂歌'].includes(t.weapon))keys.add('hp');
    if(['西福斯的月光','流浪的晚星','玛海菈的水色'].includes(t.weapon))keys.add('mastery');
    if(t.weapon==='岩峰巡歌')keys.add('def');
    if(config?._metric?.reaction?.startsWith('lunar')&&config.conditions?.lastNonMoonCaster!=='none'&&moonCandidates(config).some(x=>x.character===t.character&&(!config.conditions?.lastNonMoonCaster||config.conditions.lastNonMoonCaster==='auto'||config.conditions.lastNonMoonCaster===x.id)))keys.add(moonStat(t.character));
    if(t.weapon==='尘光七谕')keys.add('atk');
    return config?P.inputs(t,config,[...keys]):[...new Set([...keys,...(P.extraInputs[t.character]||[])])];
  }
  function supportInputs(t,config){return config?.supportPanelMode==='base'&&!config._supportPanelPass&&global.GSupportPanels?global.GSupportPanels.requirements(config)[t.character]||[]:rawSupportInputs(t,config);}
  function supportDescription(k){return partialCoverage[k]||descriptions[k]||(supported.has(k)?'已适配基础队伍效果；技能/武器/套装需要按实际触发状态勾选。':'角色团队增益未专项适配。只能在明确手动补齐增益后使用，不能默认为已全部自动计入。');}
  function affix(w,index,errors) {
    const v=w.passive?.datas?.[String(index)]?.[w.refine-1];
    const value=v===undefined?NaN:parseFloat(String(v).replace(/,/g,''));
    if(!Number.isFinite(value)){errors.push(w.name+' 缺少精炼被动数据 A'+index);return 0;}return value;
  }
  function resolve(input,{strict=true}={}) {
    const config=P.preset(clone(input)),primary=E.character(config.character),recipient=E.character(config._statRecipient)||primary,team={},notes=[],errors=[],flat=[],dynamic=[],projections=[],group=new Map(),effects=[],snapshots=[],reactionBonuses=[];
    let owner='共鸣与队伍',category='队伍',sequence=0;const identities=new Map();
    const disabled=new Set(config.disabledTeamEffects||[]);
    const record=(key,value,source,more={})=>{source=source||category+'共享效果';const identity=owner+':'+category+':'+source+':'+key,n=identities.get(identity)||0;identities.set(identity,n+1);const e={id:identity+':'+n,legacyId:owner+':'+category+':'+sequence++,owner,category,key,value,source,status:'applied',...more};if(disabled.has(e.id)||!config._supportPanelPass&&disabled.has(e.legacyId))e.status='disabled';if(config._supportPanelPass&&!global.GSupportPanels.recipientAllows(e,recipient.key,config))e.status='inapplicable';effects.push(e);return e;};
    const apply=(key,value,source)=>{if(Number.isFinite(value)&&value){team[key]=(team[key]||0)+value;if(source)notes.push(source+'：'+(E.LABELS[key]||key)+' '+Number(value.toFixed(3)));}};
    const manualTeam=input._teamResolved?input.manualTeam||{}:input.team||{};
    const members=[{c:primary,t:config._supportPanelPass?global.GSupportPanels.primarySource(config):{character:primary.key,homework:!!config.conditions?.homework}}];
    const teammates=(config.teammates||[]).filter(t=>t?.character);
    const distinct=new Set([primary.id]);
    for(const t of teammates){const c=E.character(t.character);if(!c){errors.push('队友角色不存在');continue;}if(distinct.has(c.id)){errors.push('队伍不能重复选择同一角色，旅行者的不同元素也不能同时上场。');continue;}distinct.add(c.id);members.push({c,t});}
    if(members.length>4)errors.push('队伍最多四名角色。');
    const count={};for(const {c} of members)count[c.element]=(count[c.element]||0)+1;
    const moonCount=members.filter(({c})=>MOON.includes(c.key)).length,hexCount=members.filter(({c,t})=>HEX.includes(c.key)&&t.homework).length;
    let skirkTraining=members.some(({c})=>c.key==='丝柯克')&&members.every(({c})=>['hydro','cryo'].includes(c.element))&&count.hydro>0&&count.cryo>0;
    if(skirkTraining&&primary.key!=='丝柯克'){owner='丝柯克';category='角色';const e=record('talentE',1,'丝柯克诸武相授',{type:'talent'});if(e.status==='disabled')skirkTraining=false;owner='共鸣与队伍';category='队伍';}
    config.extraTalent={...(config.extraTalent||{}),e:skirkTraining?1:0};
    if(skirkTraining)notes.push('丝柯克诸武相授：全水冰且各至少一名，全队战技天赋+1');
    if(primary.key==='达达利亚')config.extraTalent={...config.extraTalent,a:1};
    const full=members.length===4,cond=config.conditions||{},onField=cond.onField!==false&&recipient.key===(config._panelActive||primary.key);
    const moonsign=moonCount>=2?2:1,hex=hexCount>=2;
    config.conditions={...cond,moonsign,hexerei:hex,partySize:members.length,partyElements:Object.keys(count).length,pyroMembers:count.pyro||0,hydroMembers:count.hydro||0,hydroCryoMembers:(count.hydro||0)+(count.cryo||0),geoMembers:count.geo||0,
      sameElements:members.slice(1).filter(({c})=>c.element===primary.element).length,differentElements:members.slice(1).filter(({c})=>c.element!==primary.element).length,liyueCount:members.filter(({c})=>c.region==='璃月').length,
      vesnaCryoAnemo:(count.cryo||0)+(count.anemo||0),vesnaOthers:members.length-(count.cryo||0)-(count.anemo||0),otherPyro:(count.pyro||0)-(primary.element==='pyro'?1:0),naviaElements:members.filter(({c})=>c.key!==primary.key&&['pyro','hydro','cryo','electro'].includes(c.element)).length};
    const add=(key,value,source)=>{if(!Number.isFinite(value)||!value)return;const e=record(key,value,source);if(e.status==='applied')apply(key,value,source);};
    const once=(g,key,value,source)=>{if(!Number.isFinite(value)||!value)return;const e=record(key,value,source,{group:g});if(e.status!=='applied')return;const old=group.get(g);if(!old||value>old.value){if(old)old.status='overridden';group.set(g,e);}else e.status='overridden';};
    const elementBonus=(ele,value,source)=>add('dmg_'+ele,value,source);
    const lunarBonus=(value,source)=>{for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])add(rx,value,source);};
    const stellarBonus=(value,source)=>{for(const rx of ['stellarConduct','stellarSwirl','stellarVortex'])add(rx,value,source);};
    const graph=config.supportPanelMode==='base'&&!config._supportPanelPass&&config._scope!=='solo'?global.GSupportPanels.build(config):null;if(graph)errors.push(...graph.errors);
    const need=(t,k)=>{if(config._supportPanelPass)return num(config._sourcePanels?.[t.character]?.total?.[k]);if(config.supportMode==='full'&&!supportInputs(t,config).includes(k))return 0;const p=graph?.panels[t.character],v=p?.total?.[k]??t.panel?.[k];if(v===undefined||v===''||!Number.isFinite(Number(v))||['atk','hp','def'].includes(k)&&Number(v)<=0){errors.push(t.character+' 需要填写用于增益计算的'+fieldNames[k]+'。');return 0;}if(p)global.GSupportPanels.track(p,k,Number(v),'total');return Number(v);};
    const eligible=(t,k,policy='general')=>{if(config._supportPanelPass){const sample=policy==='weaponRefresh'?config._sourceRefreshPanels?.[t.character]:global.GSupportPanels.snapshotPolicies.has(policy)?config._sourceCastPanels?.[t.character]:null;return global.GSupportPanels.read(sample||config._sourcePanels?.[t.character],k,policy);}if(graph){const p=graph.panels[t.character],value=global.GSupportPanels.read(p,k,policy);global.GSupportPanels.track(p,k,value,policy);return value;}if(t.premod?.[k]!==undefined&&t.premod[k]!==''&&!['keySnapshot','peakSnapshot'].includes(policy))return num(t.premod[k]);return need(t,k);};
    const stacks=(t,fallback=0)=>num(t.stacks,fallback);
    const pushFlat=b=>{if(!(b.value>0))return;const e=record('flat',b.value,b.source,{quota:b.quota,type:'flat',scope:b.scope,reactions:b.reactions,skills:b.skills,elements:b.elements});if(e.status==='applied')flat.push({...b,auditId:e.id,owner,category});};
    const addFlat=(t,scope,value,quota,extra={})=>{const resource=config.supportMode==='full'?quota:t.resources===undefined||t.resources===''?quota:num(t.resources);pushFlat({source:t.character,id:t.character,scope,value,quota:resource,...extra});};
    const addDynamic=b=>{const e=record('dynamic',null,b.title,{type:'dynamic',keys:Object.keys(b.data||{})});if(e.status==='applied')dynamic.push({...b,data:Object.fromEntries(Object.entries(b.data||{}).filter(([k])=>!disabled.has(e.id+'|'+k))),auditId:e.id,owner,category});};
    const limitedReaction=b=>{const e=record(b.reaction,b.value,b.source+' '+b.title,{type:'limitedReaction',quota:b.quota});if(e.status==='applied')reactionBonuses.push({...b,auditId:e.id,owner,category});};
    if(full) {
      if(count.pyro>=2)add('atkPct',25,'双火共鸣');
      if(count.hydro>=2)add('hpPct',25,'双水共鸣');
      if(count.cryo>=2&&cond.cryoAura)add('cpct',15,'双冰共鸣（目标冰附着）');
      if(count.geo>=2&&(cond.shielded||cond.moonCage)){add('allDmg',15,'双岩共鸣（盾/月笼）');if(cond.geoShredActive)add('res_geo',20,'双岩减岩抗已施加');}
      if(count.dendro>=2){add('mastery',50,'双草共鸣');if(cond.dendroFirst)add('mastery',30,'双草燃烧/原激化/绽放层');if(cond.dendroSecond)add('mastery',20,'双草激化/超绽/烈绽/月绽层');}
      if(count.electro>=2)notes.push('双雷共鸣：影响产球，未伪造为充能百分比');
      if(count.anemo>=2)notes.push('双风共鸣：影响体力/移动/冷却，伤害按所填循环次数计算');
    }else if(members.length>1)notes.push('队伍未满四人：元素共鸣不生效');
    if(moonCount)notes.push('月兆 '+(moonsign===2?'满辉':'初辉')+'（'+moonCount+'名月兆角色）');
    if(hex)notes.push('魔导秘仪：'+hexCount+'名已完成课业的魔导角色');
    for(const {c,t} of members.slice(config._supportPanelPass?0:1)) {
      if(!t.weapon){errors.push(c.key+' 需要选择武器。');continue;}
      let w;try{w=E.getWeapon({weapon:t.weapon,refine:t.refine||1},c);}catch(e){errors.push(c.key+'：'+e.message);continue;}
      const tc={character:c.key,level:90,cons:num(t.cons),talents:t.talents||{a:1,e:10,q:10},extraTalent:{e:(skirkTraining?1:0)+(c.key==='洛恩'&&(config.supportMode==='full'||t.lohenHighSpirits)?1:0)}},talent=E.talentFor(c,tc),cons=tc.cons,name=c.key;
      owner=name;category='角色';snapshots.push({owner:name,cons,weapon:w.name,refine:w.refine,set:t.set||'none',talents:talent.talentLevel,inputs:Object.fromEntries(supportInputs(t,config).map(k=>[k,t.panel?.[k]])),panelDetails:graph?.panels[name],stacks:t.stacks,mode:t.mode,auto:config.supportMode==='full'});
      const T=(type,key)=>{const value=talent[type]?.[key];if(typeof value!=='number'){errors.push(name+' 缺少天赋表 '+type+'.'+key);return 0;}return value;};
      const baseAtk=E.getStats(c,90).atkBase+w.base;
      const inactive=num(t.uptime,100)===0;
      const active=!inactive&&(t.characterActive??t.effectsActive)===true,castE=!inactive&&t.castE===true,castQ=!inactive&&t.castQ===true;
      const weaponActive=!inactive&&(t.weaponActive??t.effectsActive)===true,setActive=!inactive&&(t.setActive??t.effectsActive)===true;
      if(num(t.uptime,100)!==100&&num(t.uptime)!==0)errors.push(name+' 的临时增益覆盖不是100%。请把输出循环拆成增益生效/未生效的技能项，不能用平均面板代替准确伤害。');
      if(!supported.has(name)&&!t.manualVerified)errors.push(name+(config.supportMode==='full'?' 的角色团队增益尚未专项适配：'+(partialCoverage[name]||'尚有数据缺口')+'。为避免漏算，本次不输出不完整的组队伤害。':' 的角色团队增益尚未专项适配，请补充真实增益并勾选“已手动补齐”。元素、共鸣、武器和套装仍可自动计算。'));
      if(!supported.has(name))notes.push(name+'：角色增益由手动补充，未声称自动覆盖');
      if(['枫原万叶','砂糖'].includes(name)&&active&&!['pyro','hydro','cryo','electro'].includes(t.element))errors.push(name+' 必须选择实际扩散的火/水/雷/冰元素，不能把主角色的风/岩/草元素当作扩散。');
      switch(name) {
        case '班尼特':if(castQ&&onField&&(cons>=1||num(cond.currentHpPct,100)>70)){add('atkPlus',baseAtk*(T('q','攻击力加成比例')+(cons>=1?20:0))/100,name+'Q');if(cons>=6)elementBonus('pyro',15,name+'C6');}break;
        case '芙宁娜':if(castQ){const n=stacks(t,cons>=1?150:0);if(n>(cons>=1?400:300)||n<0)errors.push('芙宁娜气氛值超过当前命座上限。');add('allDmg',T('q','气氛值转化提升伤害比例')*n,name+'Q实际气氛 '+n);}break;
        case '枫原万叶':if(castE||castQ){const em=eligible(t,'mastery','kazuhaA4');if(active)elementBonus(t.element||primary.element,em*.04,name+'扩散');if(cons>=2&&castQ&&onField)add('mastery',200,name+'C2领域');}break;
        case '纳西妲':if(castQ&&onField){const em=eligible(t,'mastery');addDynamic({id:'team:nahida',title:'纳西妲Q：按当前候选与队友最高可转化精通分享',sort:7,data:{masteryBorrowed:({attr,calc})=>Math.min(250,.25*(graph?Math.max(...Object.values(graph.panels).map(p=>global.GSupportPanels.read(p,'mastery'))):Math.max(em,calc(attr.mastery)-num(attr.borrowedMastery),...(teammates.map(x=>num(x.premod?.mastery??x.panel?.mastery))))))}});}if(cons>=2&&castE){{const e=record('transformCrit',20,name+'C2：指定燃烧/绽放20%暴率、100%暴伤',{type:'condition'});config.conditions.nahidaC2=e.status==='applied';}if(cond.quicken)add('enemyDef',30,name+'C2激化');add('lunarBloomCpct',10,name+'C2月绽');add('lunarBloomCdmg',20);}break;
        case '砂糖':if(castE||castQ){add('masteryBorrowed',eligible(t,'mastery','sucroseA4')*.2,name+'A4');if(active&&(t.element||primary.element)===recipient.element)add('mastery',50,name+'同元素扩散');if(cons>=6&&castQ&&active)elementBonus(t.element||primary.element,20+(hex&&HEX.includes(primary.key)?8.57142:0),name+'C6转化');if(hex&&t.homework){if(castE)for(const k of ['aDmg','a2Dmg','a3Dmg','eDmg','qDmg'])add(k,5.71428,name+'秘仪E');if(castQ&&HEX.includes(primary.key))for(const k of ['aDmg','a2Dmg','a3Dmg','eDmg','qDmg'])add(k,7.14285,name+'秘仪Q');}}break;
        case '申鹤':if(castE){addFlat(t,'all',need(t,'atk')*T('e','伤害值提升')/100,t.mode==='hold'?7:5,{elements:['cryo'],freeNormal:cons>=6});for(const k of (t.mode==='hold'?['aDmg','a2Dmg','a3Dmg']:['eDmg','qDmg']))add(k,15,name+'E');}if(castQ){elementBonus('cryo',15,name+'Q');add('res_cryo',T('q','抗性降低'),name+'Q');add('res_physical',T('q','抗性降低'));if(cons>=2)add('cdmg_cryo',15,name+'C2');}break;
        case '云堇':if(castQ){addFlat(t,'a',eligible(t,'def')*(T('q','伤害值提升')/100+[.025,.05,.075,.115][Object.keys(count).length-1]),stacks(t,30));if(cons>=2)add('aDmg',15,name+'C2');}break;
        case '五郎':if(castE||castQ){if(onField)add('defPlus',T('e','防御力提升'),name+'领域');if(castQ)add('defPct',25,name+'Q');if(count.geo>=3)elementBonus('geo',15,name+'三岩');if(cons>=6)add('cdmg_geo',count.geo>=3?40:count.geo===2?20:10,name+'C6');}break;
        case '九条裟罗':if(castE||castQ){add('atkPlus',baseAtk*T('e','攻击力加成比例')/100,name+'天狗咒雷');if(cons>=6)add('cdmg_electro',60,name+'C6');}break;
        case '珐露珊':if(castQ){elementBonus('anemo',T('q','风元素伤害加成'),name+'Q');add('res_anemo',30,name+'Q');addFlat(t,'all',.32*baseAtk,Infinity,{elements:['anemo'],interval:.8});if(cons>=6)add('cdmg_anemo',40,name+'C6');}break;
        case '希诺宁':if(castE&&active){const converted=members.filter(({c})=>c.key!==name&&['pyro','hydro','cryo','electro'].includes(c.element)).length;const samples=new Set(['geo',...members.filter(({c})=>c.key!==name&&['pyro','hydro','cryo','electro'].includes(c.element)).map(({c})=>c.element)]);for(const ele of samples)if(converted>=2||ele==='geo'&&cons>=2)add('res_'+ele,T('e','元素抗性降低'),name+'已激活采样');if(cons>=2&&samples.has(primary.element)){const f={geo:['dmg_geo',50],pyro:['atkPct',45],hydro:['hpPct',45],cryo:['cdmg_cryo',60]};if(f[primary.element])add(...f[primary.element],name+'C2');}if(cons>=4)addFlat(t,'normal',need(t,'def')*.65,6);}break;
        case '茜特菈莉':if(castE&&active){add('res_pyro',20+(cons>=2?20:0),name+'冻结/融化');add('res_hydro',20+(cons>=2?20:0));if(cons>=1&&onField)addFlat(t,'all',need(t,'mastery')*2,stacks(t,10));if(cons>=2)add('mastery',250,name+'C2');if(cons>=6){const n=Math.min(40,stacks(t));elementBonus('pyro',n*1.5,name+'C6');elementBonus('hydro',n*1.5);}}break;
        case '伊安珊':if(castQ&&onField){const n=stacks(t);if(n<0||n>54)errors.push('伊安珊夜魂需要在0–54。');add('atkPlus',Math.min(T('q','最大攻击力加成'),eligible(t,'atk')*(n>=42?.27:.005*n)),name+'Q夜魂 '+n);if(cons>=2&&active)add('atkPct',30,name+'C2');if(cons>=6&&active)add('allDmg',25,name+'C6溢出');}break;
        case '爱可菲':if(castE||castQ){const n=(count.hydro||0)+(count.cryo||0);add('res_cryo',[0,5,10,15,55][n],name+'水冰人数');add('res_hydro',[0,5,10,15,55][n]);if(cons>=1&&n===4)add('cdmg_cryo',60,name+'C1');}break;
        case '伊涅芙':{const atk=need(t,'atk');add('lunarChargedBase',Math.min(14,.007*atk),name+'月兆祝赐');if(castQ&&(onField||config._supportPanelPass&&recipient.key===name))add('masteryBorrowed',.06*eligible(t,'atk'),name+'Q');if(cons>=1&&castE)add('lunarCharged',Math.min(50,.025*atk),name+'C1');break;}
        case '菲林斯':add('lunarChargedBase',Math.min(14,.007*need(t,'atk')),name+'月兆祝赐');break;
        case '奈芙尔':add('lunarBloomBase',Math.min(14,.0175*need(t,'mastery')),name+'月兆祝赐');break;
        case '兹白':add('lunarCrystallizeBase',Math.min(14,.007*need(t,'def')),name+'月兆祝赐');break;
        case '菈乌玛':{const em=need(t,'mastery');add('lunarBloomBase',Math.min(14,.0175*em),name+'月兆祝赐');if(castE){add('res_hydro',T('e','元素抗性降低'),name+'E');add('res_dendro',T('e','元素抗性降低'));if(moonsign===2){add('lunarBloomCpct',10,name+'满辉');add('lunarBloomCdmg',20);}else{const e=record('transformCrit',15,name+'初辉：绽放系15%暴率、100%暴伤',{type:'condition'});config.conditions.laumaInitialCrit=e.status==='applied';}}if(castQ){const quota=stacks(t,18);addFlat(t,'reaction',em*(T('q','绽放、超绽放、烈绽放反应伤害提升')/100+(cons>=2?5:0)),quota,{reactions:['bloom','hyperBloom','burgeon']});addFlat(t,'reaction',em*(T('q','月绽放反应伤害提升')/100+(cons>=2?4:0)),quota,{reactions:['lunarBloom']});}if(moonsign===2&&cons>=2)add('lunarBloom',40,name+'C2');if(moonsign===2&&cons>=6)add('lunarBloomElevated',25,name+'C6');break;}
        case '哥伦比娅':{const hp=need(t,'hp');for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])add(rx+'Base',Math.min(7,.0002*hp));notes.push(name+'：三种月基础提升 '+Math.min(7,.0002*hp)+'%');if(castQ&&onField)lunarBonus(T('q','月曜反应伤害提升'),name+'Q');const increments=[1.5,7,1.5,1.5,1.5,7];for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])add(rx+'Elevated',increments.slice(0,cons).reduce((a,b)=>a+b,0));if(cons>=2&&active&&moonsign===2&&onField){const p=eligible(t,'hp');if(t.mode==='lunarBloom')add('mastery',p*.0035,name+'C2皎辉');else if(t.mode==='lunarCrystallize')add('defPlus',p*.01,name+'C2皎辉');else add('atkPlus',p*.01,name+'C2皎辉');}if(cons>=6&&active){const map={lunarCharged:['hydro','electro'],lunarBloom:['hydro','dendro'],lunarCrystallize:['hydro','geo'],all:['hydro','electro','dendro','geo']};for(const ele of map[t.c6Reaction]||[])add('cdmg_'+ele,80,name+'C6实际参与元素');}break;}
        case '莉奈娅':{const def=need(t,'def');add('lunarCrystallizeBase',Math.min(14,.007*def),name+'月兆祝赐');if(castE){add('res_geo',moonsign===2?30:15,name+'露米');if(onField&&MOON.includes(primary.key))add('masteryBorrowed',eligible(t,'def')*.05,name+'A4');if(cons>=1){const resource=t.resources===undefined||t.resources===''?6:num(t.resources);pushFlat({source:name,id:name,scope:'reaction',value:def*(cons>=6?1.125:.75),quota:resource/(cons>=6?2:1),reactions:['lunarCrystallize']});}}if(cons>=2&&active&&['hydro','geo'].includes(primary.element))add('cdmg_'+primary.element,40,name+'C2月笼');if(cons>=4&&active&&onField)add('defPct',25,name+'C4');if(cons>=6&&moonsign===2)add('lunarCrystallizeElevated',25,name+'C6');break;}
        case '叶洛亚':if(castE||castQ){add('cpct_geo',cons>=6?10:5,name+'A1');add('cdmg_geo',cons>=6?30:10,name+'A1');if(moonsign===2)add('mastery',cons>=6?80:50,name+'满辉');if(castQ){const em=need(t,'mastery'),n=Math.min(3,(count.hydro||0)+(count.geo||0)),quota=t.resources===undefined||t.resources===''?21:num(t.resources);addFlat(t,'all',em*(T('q','岩元素伤害增加')+[7,14,24][n-1])/100,quota,{elements:['geo']});addFlat(t,'reaction',em*(T('q','月结晶反应伤害增加')+[48,96,160][n-1])/100,quota,{reactions:['lunarCrystallize'],directOnly:true});if(cons>=4&&onField)add('defPlus',200,name+'C4');}}break;
        case '尼可':{
          if(castE){add('atkPlus',Math.min(eligible(t,'atk','nicoleE')*T('e','虚己之赐攻击力加成比例')/100,T('e','虚己之赐攻击力加成上限')),name+'E虚己');if(active&&(onField||config._supportPanelPass&&recipient.key===name))add('atkPlus',300,name+'圣祝');if(cons>=2){add('atkPlus',300,name+'C2');if(active)add('res_'+primary.element,25,name+'C2');}if(cons>=4&&active)addFlat(t,'all',need(t,'atk')*.7,8);if(cons>=6&&active)add('enemyIgnore',40,name+'C6');}
          const extra=hex&&t.homework&&HEX.includes(primary.key)&&config.conditions.homework?3*need(t,'atk'):0;
          if(castQ)projections.push({id:'nicole-q',title:'尼可Q投影（由主角色造成）',coefficient:T('q','奥迹造影伤害'),flat:extra,quota:4*Math.max(1,num(t.projectionCasts,1)),timingVerified:t.projectionTimingVerified===true});
          if(cons>=1)projections.push({id:'nicole-c1',title:'尼可C1合一投影（由主角色造成）',coefficient:600,flat:extra,quota:Infinity,timingVerified:t.projectionTimingVerified===true});
          if(castQ||cons>=1)notes.push('尼可投影：在输出手法中另加独立事件，次数需按实际全队触发核对；未选事件不会自动加入');break;
        }
        case '沃雅妮莎':if(castE){const hp=need(t,'hp'),vortex=cond.vortexActive===true;add('res_hydro',T('e','水元素/冰元素抗性降低'),name+'E');add('res_cryo',T('e','水元素/冰元素抗性降低'));if(vortex)add('res_anemo',35,name+'风旋');if(vortex)addFlat(t,'reaction',Math.min(6500,Math.max(0,hp-40000)*.26),stacks(t,onField?25:10),{reactions:['stellarSwirl','stellarVortex']});else addFlat(t,'all',Math.min(3500,Math.max(0,hp-40000)*.14),stacks(t,onField?25:10),{elements:['hydro','cryo']});if(cons>=1&&active)add('atkPlus',hp*.008,name+'C1治疗');if(cons>=2&&(onField||cons>=6)){if(vortex){add('stellarSwirlCdmg',60,name+'C2');add('stellarVortexCdmg',60);}else{add('cdmg_hydro',50,name+'C2');add('cdmg_cryo',50);}}if(cons>=6){add('stellarSwirlElevated',25,name+'C6');add('stellarVortexElevated',25);elementBonus('hydro',60,name+'C6');elementBonus('cryo',60);}}break;
        case '奥黛塔':{const blessing=config.supportMode==='full'?14:Math.min(14,.007*need(t,'atk'));for(const rx of ['stellarConduct','stellarSwirl','stellarVortex'])add(rx+'Base',blessing,name+(config.supportMode==='full'?'祝赐默认满14%（≥2000攻击）':'星辉祝赐'));const n=stacks(t);if(n<0||n>(cons>=1?6:4))errors.push('奥黛塔华彩层数超过命座上限。');stellarBonus(n*15,name+'已转移华彩 '+n);if(cons>=2){add('atkPct',n*7,name+'C2华彩');if(castE&&active&&t.mode!=='off')for(const ele of t.mode==='stellarSwirl'?['cryo','anemo']:['cryo','electro'])add('res_'+ele,20,name+'C2辉映');}if(cons>=4&&castQ)stellarBonus(T('q','雪鹄之梦星烁反应伤害提升')*.5,name+'C4');if(cons>=6&&n>0)for(const rx of ['stellarConduct','stellarSwirl','stellarVortex'])add(rx+'Elevated',25,name+'C6');break;}
        case '薇斯纳':for(const rx of ['stellarSwirl','stellarVortex'])add(rx+'Base',Math.min(14,.007*need(t,'atk')),name+'星扩散祝赐');break;
        case '桑多涅':case '旅行者·冰':for(const rx of ['stellarConduct','stellarSwirl','stellarVortex'])add(rx+'Base',Math.min(name==='桑多涅'?14:7,(name==='桑多涅'?.007:.0035)*need(t,'atk')),name+'星辉祝赐');if(name==='桑多涅'&&cons>=1&&castE&&active)stellarBonus(30,name+'C1解算');break;
        case '钟离':if(castE&&cond.shielded)add('kx',20,name+'玉璋护盾');break;
        case '罗莎莉亚':if(castQ){add('cpct',Math.min(15,eligible(t,'cpct','rosariaQ')*.15),name+'Q');if(cons>=6)add('res_physical',20,name+'C6');}break;
        case '夜兰':if(castQ&&onField)add('allDmg',Math.min(50,1+3.5*stacks(t)),name+'玲珑骰时点');if(cons>=4&&castE&&active)add('hpPct',40,name+'C4满四层');break;
        case '坎蒂丝':if(castQ)add('aElementDmg',20+need(t,'hp')*.0005,name+'Q与A4');break;
        case '夏沃蕾':if(full&&count.pyro&&count.electro&&Object.keys(count).every(k=>['pyro','electro'].includes(k))&&active){add('res_pyro',40,name+'超载');add('res_electro',40);if(castE)add('atkPct',Math.min(40,need(t,'hp')/1000),name+'超量弹');if(cons>=6){elementBonus('pyro',20*Math.min(3,stacks(t)),name+'C6');elementBonus('electro',20*Math.min(3,stacks(t)));}}break;
        case '阿贝多':if(castQ||t.transientWisdomActive)add('mastery',125,name+'天慧');if(cons>=4&&castE&&active)add('a3Dmg',30,name+'C4阳华领域');if(cons>=4&&t.silverPlungeActive)add('a3Dmg',30,name+'C4瑰银跳跃');if(cons>=6&&castE&&active&&(cond.crystallizeShield||cond.moonCage))add('allDmg',17,name+'C6结晶盾/月笼');if(hex&&t.homework){const def=need(t,'def');for(const k of ['aDmg','a2Dmg','a3Dmg','eDmg','qDmg']){if(castE)add(k,Math.min(12,def*.004),name+'秘仪阳华');if(t.silverActive&&HEX.includes(primary.key)&&config.conditions.homework)add(k,Math.min(30,def*.01),name+'秘仪瑰银');}}break;
        case '达达利亚':{const e=record('talentA',1,'达达利亚诸武精通',{type:'talent'});if(e.status==='applied')config.extraTalent={...config.extraTalent,a:1};notes.push('达达利亚：全队普通攻击天赋+1');break;}
        case '神里绫人':if(castQ)add('aDmg',T('q','普通攻击伤害提升'),name+'Q');break;
        case '丽莎':if(castQ)add('enemyDef',15,name+'Q');break;
        case '行秋':if(castQ&&cons>=2)add('res_hydro',15,name+'C2');break;
        case '北斗':if(castQ&&cons>=6)add('res_electro',15,name+'C6');break;
        case '香菱':if(castE&&cons>=1)add('res_pyro',15,name+'C1');if(active)add('atkPct',10,name+'锅巴辣椒');if(castQ&&cons>=6)elementBonus('pyro',15,name+'C6');break;
        case '辛焱':if(castE&&cond.shielded)elementBonus('physical',15,name+'盾');if(castE&&cons>=4)add('res_physical',15,name+'C4');break;
        case '安柏':if(castQ&&cons>=6)add('atkPct',15,name+'C6');break;
        case '可莉':if(castE&&cons>=2)add('enemyDef',23,name+'C2');if(castQ&&cons>=6)elementBonus('pyro',10,name+'C6');break;
        case '琴':if(castQ&&cons>=4)add('res_anemo',40,name+'C4');break;
        case '迪奥娜':if(castQ&&cons>=6&&num(cond.currentHpPct,100)>50&&onField)add('mastery',200,name+'C6');break;
        case '重云':if(castE&&active)add('res_cryo',10,name+'A4灵刃');break;
        case '凝光':if(castE&&active)elementBonus('geo',12,name+'穿过璇玑屏');break;
        case '甘雨':if(castQ&&onField)elementBonus('cryo',20,name+'Q领域');break;
        case '莫娜':if(castQ){add('allDmg',T('q','伤害加成'),name+'星异');if(cons>=4){add('cpct',15,name+'C4');if(HEX.includes(primary.key)&&cond.homework)add('cdmg',15,name+'C4魔导');}}if(cons>=1&&active){const n=onField?15:24;add('vaporize',n,name+'C1');add('electroCharged',n);add('lunarCharged',n);add('lunarCrystallize',n);if(cond.swirlElement==='hydro')add('swirl',n);}if(cons>=2&&active)add('mastery',80,name+'C2重击');break;
        case '雷电将军':if(castE){const ownCost={雷电将军:90,优菈:80,神里绫华:80,香菱:80,行秋:80,赛诺:80,北斗:80,九条裟罗:80,珐露珊:80};const cost=num(cond.burstCost,ownCost[primary.key]);if(!Number.isFinite(cost))errors.push('雷电E爆发增伤需要填写主C爆发能量消耗。');else add('qDmg',T('e','元素爆发伤害提高')*cost,name+'E');}break;
        case '优菈':if(castE&&active){add('res_physical',T('e','物理抗性降低'),name+'长E');add('res_cryo',T('e','冰元素抗性降低'));}break;
        case '胡桃':if(active)add('cpct',12,name+'E结束');break;
        case '神里绫华':if(castQ&&cons>=4)add('enemyDef',30,name+'C4');break;
        case '提纳里':if(castQ&&cons>=4)add('mastery',active?120:60,name+'C4');break;
        case '艾尔海森':if(castQ&&cons>=4)add('mastery',30*Math.min(3,stacks(t)),name+'C4消耗镜');break;
        case '娜维娅':if(castQ&&cons>=4)add('res_geo',20,name+'C4');break;
        case '荒泷一斗':if(castQ&&cons>=4&&active){add('atkPct',20,name+'C4爆发结束');add('defPct',20);}break;
        case '基尼奇':if(castE&&cons>=2)add('res_dendro',30,name+'C2');break;
        case '埃洛伊':if(castE&&active)add('atkPct',8,name+'A1驰冰');break;
        case '赛索斯':if(cons>=4&&active)add('mastery',80,name+'C4');break;
      }
      if(name==='菲林斯'){if(cons>=2&&moonsign===2&&active)add('res_electro',25,name+'C2雷命中');if(cons>=6&&moonsign===2)add('lunarChargedElevated',10,name+'C6满辉');}
      if(name==='兹白'&&cons>=2&&castE)add('lunarCrystallize',30,name+'C2月转时隙');
      if(name==='雷电将军'&&cons>=4&&castQ&&active)add('atkPct',30,name+'C4爆发结束');
      if(name==='迪奥娜'&&cons>=6&&castQ&&onField){if(cond.radianceConduct){add('superConduct',40,name+'C6星超导辉映');add('stellarConduct',40);}if(cond.radianceSwirl){add('swirlCryo',40,name+'C6冰扩散辉映');add('stellarSwirl',40);add('stellarVortex',40);}}
      P.effects({config,c,t,primary,cons,name,T,add,addFlat,elementBonus,stellarBonus,need,eligible,onField,castE,castQ,active,moonsign,hex,count,notes,flat,limitedReaction});
      category='武器';
      // Shared weapon effects only. The supplied support panel already includes the wielder's own effects.
      if(weaponActive&&(!config._supportPanelPass||name!==primary.key||!['苍古自由之誓','终末嗟叹之诗','松籁响起之时'].includes(w.name))) {
        const A=i=>affix(w,i,errors),weapon=w.name;
        if(weapon==='讨龙英杰谭'&&(config._supportPanelPass||config.supportPanelMode==='base'?(t.buffTarget||config.character)===recipient.key:onField))once('ttds','atkPct',A(0),weapon+'接棒给'+(t.buffTarget||'主C'));
        if(weapon==='苍古自由之誓'){once('millennial-atk','atkPct',A(2),weapon);for(const k of ['aDmg','a2Dmg','a3Dmg'])once('millennial-'+k,k,A(1),weapon);}
        if(weapon==='终末嗟叹之诗'){once('millennial-atk','atkPct',A(2),weapon);once('millennial-em','mastery',A(1),weapon);}
        if(weapon==='松籁响起之时')once('millennial-atk','atkPct',A(2),weapon);
        if(weapon==='圣显之钥')once('key-share','masteryBorrowed',eligible(t,'hp','keySnapshot')*A(2)/100,weapon);
        if(weapon==='西福斯的月光')add('rechargeBorrowed',eligible(t,'mastery','weaponRefresh')*A(0)*.3,weapon);
        if(weapon==='流浪的晚星'||weapon==='玛海菈的水色')add('atkBorrowed',eligible(t,'mastery','weaponRefresh')*A(0)/100*.3,weapon);
        if(weapon==='千夜浮梦')add('mastery',A(2),weapon);
        if(weapon==='岩峰巡歌')add('allElementDmg',Math.min(A(3),eligible(t,'def','peakSnapshot')/1000*A(2)),weapon);
        if(weapon==='祭星者之望'&&onField)add('allDmg',A(1),weapon);
        if(weapon==='支离轮光')add('lunarCharged',A(1),weapon);
        if(weapon==='纺夜天镜'){once('nightweaver-bloom','bloom',A(2),weapon);once('nightweaver-hyper','hyperBloom',A(3),weapon);once('nightweaver-burgeon','burgeon',A(3),weapon);once('nightweaver-lunar','lunarBloom',A(4),weapon);}
        if(weapon==='霜结的誓金枝'){elementBonus('geo',A(3),weapon);add('lunarCrystallize',A(4),weapon);}
        if(weapon==='尘光七谕'&&(onField||hex&&HEX.includes(primary.key)))add('allDmg',Math.min(A(2),eligible(t,'atk')/1000*A(1))*(onField?1:.5),weapon);
        if(weapon==='柔风游弦')stellarBonus(A(1),weapon);
        if(weapon==='白辰之环'){
          const elements=t.reactionElements||[];
          if(!Array.isArray(elements)||!elements.includes('electro')||elements.length<2||elements.some(k=>!E.ELEMENT[k]||k==='physical'))errors.push('白辰之环需要填写实际雷相关反应涉及的全部元素。');
          else for(const ele of elements)once('hakushin-'+ele,'dmg_'+ele,A(0),weapon);
        }
        if(weapon==='狼的末路')once('wolf-team','atkPct',A(1),weapon);
        if(weapon==='黑蚀'&&onField)add('atkPct',A(2)*(hex?1.75:1),weapon);
        if(weapon==='鹤鸣余音')add('a3Dmg',A(0),weapon);
        if(weapon==='漩流颂歌'&&onField){const n=Math.min(3,num(t.weaponStacks)),enhanced=cond.vortexActive||cond.cryoAura;add('atkPct',n*Math.min(A(3),Math.max(0,need(t,'hp')-40000)/1000*A(2))*(enhanced?1.75:1),weapon);}
        const canInfuse=['sword','claymore','polearm'].includes(c.weapon)&&teammates.some(x=>x.character==='坎蒂丝'||x.character==='班尼特'&&num(x.cons)>=6);
        const leafReaction=!!count.dendro&&['pyro','hydro','electro'].some(e=>count[e])&&(['dendro','pyro','hydro','electro'].includes(c.element)||canInfuse);
        if(['原木刀','森林王器'].includes(weapon)&&leafReaction)once('forest-leaf','mastery',A(0),weapon+'种识之叶已由主C拾取');
        if(weapon==='贯月矢'&&leafReaction)once('moonpiercer-leaf','atkPct',A(0),weapon+'苏生之叶已由主C拾取');
        const canHeal=['瑶瑶','米卡','夏沃蕾','伊安珊'].includes(name)||name==='阿罗夏'&&cons>=4||name==='钟离'&&cons>=6;
        if(weapon==='香韵奏者'&&canHeal&&primary.key!=='阿蕾奇诺'&&onField)once('symphonist','atkPct',A(2),weapon+'持有者已治疗主C');
      }
      category='圣遗物';
      if(setActive&&(!config._supportPanelPass||name!==primary.key)) {
        // Team artifact effects use their own deduplication groups.
        const set=t.set,ele=t.element;
        if(['翠绿之影','悠古的磐岩'].includes(set)&&!['pyro','hydro','cryo','electro'].includes(ele))errors.push(set+'需要选择真实扩散或结晶的火/水/冰/雷元素。');
        if(set==='昔日宗室之仪'&&castQ)once('noblesse','atkPct',20,set);
        if(set==='千岩牢固'&&castE)once('tenacity','atkPct',20,set);
        if(set==='教官')once('instructor','mastery',120,set);
        if(set==='翠绿之影'){if(['pyro','hydro','cryo','electro'].includes(ele))once('vv-'+ele,'res_'+ele,40,set);if(cond.vortexActive)once('vv-cryo','res_cryo',40,set+'星扩散');}
        if(set==='深林的记忆'&&(castE||castQ))once('deepwood','res_dendro',30,set);
        if(set==='烬城勇者绘卷'){
          const elements=t.scrollElements||[];
          if(t.scrollNightsoulActive&&!NIGHTS.includes(name))errors.push(name+'不能进入夜魂加持，无法触发烬城额外28%。');
          if(!Array.isArray(elements)||elements.length<2||!elements.includes(c.element)||elements.some(k=>!E.ELEMENT[k]||k==='physical'))errors.push('烬城需要勾选本次真实反应涉及的全部元素，至少两种且包括装备者元素。');
          else for(const e of elements)once('scroll-'+e,'dmg_'+e,(t.scrollBaseExpired?0:12)+(NIGHTS.includes(name)&&t.scrollNightsoulActive?28:0),set);
        }
        if(set==='悠古的磐岩')once('petra-'+ele,'dmg_'+ele,35,set);
        if(set==='纺月的夜歌'){once('silken-em','mastery',moonsign===2?120:60,set);for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])once('gleam-devotion-'+rx,rx,10,set);}
        if(set==='穹境示现之夜')for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])once('gleam-yearning-'+rx,rx,10,set);
        if(set==='天之美赐'&&t.homework&&castE){once('celestial-'+c.element,'dmg_'+c.element,hex?40:20,set);if(hex)once('celestial-'+primary.element,'dmg_'+primary.element,40,set);}
        if(set==='炉火融炼之心')for(const rx of ['stellarConduct','stellarSwirl','stellarVortex'])once('hearth-'+rx,rx,50,set);
      }
    }
    owner='共鸣与队伍';category='队伍';
    // Default peak scenario: the selected highest source must actually cast E/Q last.
    // The buff follows that actor's current non-extra stats during its 20-second window.
    const candidates=moonsign===2?moonCandidates(config):[],choice=cond.lastNonMoonCaster||'auto';
    if(candidates.length&&choice!=='none'){
      const selected=choice==='auto'?candidates:candidates.filter(x=>x.id===choice);
      if(!selected.length)errors.push('满辉最后施法者不在当前非月兆角色中，请重新选择来源。');
      const samples=selected.map(t=>({...t,fixed:t.id==='primary'?null:eligible(t,t.stat,'ascendantGleam')}));
      const choose=ds=>samples.map(t=>({...t,value:moonValue(t.character,t.id==='primary'?Math.max(0,E.calc(ds.attr[t.stat])-num(ds.attr['borrowed'+({atk:'Atk',mastery:'Mastery',def:'Def',hp:'Hp'})[t.stat]])-num(ds.attr.moonExcluded?.[t.stat])):t.fixed)})).sort((a,b)=>b.value-a.value)[0];
      if(samples.length){const formula=ds=>choose(ds)?.value||0;addDynamic({id:'team:ascendant-gleam',title:'满辉非月兆额外月伤（20秒；不叠加）',sourceFor:ds=>{const t=choose(ds);return '满辉：'+t.character+'须最后施放E/Q，按当前合格'+fieldNames[t.stat]+'计算'+(choice==='auto'?'（默认最高可用来源）':'');},sort:10,data:{lunarCharged:formula,lunarBloom:formula,lunarCrystallize:formula}});}
    }
    // The main character's shared sets participate in the same groups as teammate sets.
    for(const s of config.sets||[])if(s.count>=4){
      const disabled=(config.disabledBuffs||[]).some(id=>id.startsWith('set:'+s.name+':4:'));if(disabled)continue;
      if(s.name==='昔日宗室之仪')once('noblesse','atkPct',20,'主角色宗室');
      if(s.name==='千岩牢固')once('tenacity','atkPct',20,'主角色千岩');
      if(s.name==='教官')once('instructor','mastery',120,'主角色教官');
      if(s.name==='纺月的夜歌'&&cond.gleamDevotionActive){once('silken-em','mastery',moonsign===2?120:60,'主角色纺月');for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])once('gleam-devotion-'+rx,rx,10,'主角色崇信');}
      if(s.name==='穹境示现之夜'&&cond.gleamYearningActive)for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])once('gleam-yearning-'+rx,rx,10,'主角色蓄念');
      if(s.name==='炉火融炼之心')for(const rx of ['stellarConduct','stellarSwirl','stellarVortex'])once('hearth-'+rx,rx,50,'主角色炉火');
      if(s.name==='深林的记忆'&&cond.deepwoodActive)once('deepwood','res_dendro',30,'主角色深林');
      if(s.name==='天之美赐'&&cond.celestialActive&&cond.homework)once('celestial-'+primary.element,'dmg_'+primary.element,hex?40:20,'主角色天之美赐');
      if(s.name==='烬城勇者绘卷'&&(cond.scrollActive||cond.scrollNightsoulActive)){
        if(!Array.isArray(cond.scrollElements)||cond.scrollElements.length<2||!cond.scrollElements.includes(primary.element))errors.push('主角色烬城需要勾选至少两种实际反应元素，且包括自身元素。');
        else for(const e of cond.scrollElements)once('scroll-'+e,'dmg_'+e,(cond.scrollActive?12:0)+(NIGHTS.includes(primary.key)&&cond.scrollNightsoulActive?28:0),'主角色烬城');
      }
    }
    try{
      const pw=E.getWeapon(config,primary);
      if(['苍古自由之誓','终末嗟叹之诗','松籁响起之时'].includes(pw.name))for(const b of E.buffList(config))if(b.id.startsWith('weapon:')&&!b.isStatic&&!config.disabledBuffs?.includes(b.id)){
        for(const [key,value]of Object.entries(b.data||{}))if(typeof value==='number'){
          if(key==='atkPct')once('millennial-atk',key,value,'主角色'+pw.name);
          if(['aDmg','a2Dmg','a3Dmg'].includes(key))once('millennial-'+key,key,value,'主角色'+pw.name);
          if(key==='mastery')once('millennial-em',key,value,'主角色'+pw.name);
        }
      }
    }catch{}
    const stellarEnabler=members.some(({c})=>['桑多涅','奥黛塔','旅行者·冰'].includes(c.key))||config._metric?.reaction==='stellarConduct';
    if(cond.stellarField&&stellarEnabler){const r=E.specialFactor('stellarConduct',{stellarConductCount:num(cond.stellarHits)});elementBonus('cryo',r*20,'星超导领域');elementBonus('electro',r*20,'星超导领域');}
    if(cond.superconductActive||cond.stellarField&&stellarEnabler)add('res_physical',40,cond.stellarField&&stellarEnabler?'极星辉域物抗降低':'普通超导减物抗已生效');
    config.soloArea=cond.stellarField&&(['桑多涅','奥黛塔','旅行者·冰'].includes(primary.key)||config._metric?.reaction==='stellarConduct')?{dmg_cryo:E.specialFactor('stellarConduct',{stellarConductCount:num(cond.stellarHits)})*20,dmg_electro:E.specialFactor('stellarConduct',{stellarConductCount:num(cond.stellarHits)})*20,res_physical:40}:{};
    if(cond.superconductActive)config.soloArea.res_physical=40;
    for(const {key,value,source}of group.values())apply(key,value,source);
    config.dedupGroups=[...group.keys()];
    config.autoTeam={...team};
    config.team={...team};owner='手动补充';category='补充';for(const [k,v]of Object.entries(manualTeam)){if(!num(v))continue;const e=record(k,num(v),'手动填写');if(e.status==='applied')config.team[k]=(config.team[k]||0)+num(v);}
    config.manualTeam={...manualTeam};config._teamResolved=true;
    config.teamEffects=effects;config.supportSnapshots=snapshots;config.reactionBonuses=reactionBonuses;
    config.flatBuffs=flat;config.teamDynamic=dynamic;config.teamProjections=projections;config.teamNotes=[...new Set(notes)];config.teamErrors=[...new Set(errors)];
    if(strict&&errors.length)throw new Error(config.teamErrors.join('\n'));
    return config;
  }
  function hasFlatBuffs(config){try{return resolve(config,{strict:false}).flatBuffs.length>0;}catch{return false;}}
  function audit(config,result,rolls={},panel=null,mains=config.mains){
    const records=new Map(),snapshots=new Map();
    for(const [index,d]of (result.details||[]).entries()){for(const s of d.supportSnapshots||[])snapshots.set(s.owner,s);for(const e of d.teamEffects||[]){const id=e.id+':'+e.key+':'+e.value;if(!records.has(id))records.set(id,{...e,targets:[],targetIndexes:[],count:0});const r=records.get(id);if(!r.targets.includes(d.title))r.targets.push(d.title);if(!r.targetIndexes.includes(index))r.targetIndexes.push(index);r.count+=e.count||0;}}
    const values=[...records.values()],cache=new Map();
    for(const e of values){
      if(e.status==='overridden'){e.applied=false;e.reason='同类效果已由较高值或先采用者覆盖';continue;}
      if(e.status==='disabled'){e.applied=false;e.reason='自定义关闭';continue;}
      e.applied=true;
      const probe=e.type==='dynamic'?e.id+'|'+e.key:e.id;
      if(!cache.has(probe)){try{const next=E.prepare({...config,disabledTeamEffects:[...(config.disabledTeamEffects||[]),probe]},'team',panel,mains).evaluate(rolls,true);cache.set(probe,{delta:result.total-next.total,criticalDelta:result.critical-next.critical,without:next.total,targetDeltas:(result.details||[]).map((d,i)=>({index:i,title:d.title,delta:d.total-(next.details[i]?.total||0),criticalDelta:num(d.critical)-num(next.details[i]?.critical)}))});}catch(err){cache.set(probe,{error:err.message});}}
      Object.assign(e,cache.get(probe));
      const affected=(e.targetDeltas||[]).filter(d=>e.targetIndexes.includes(d.index)&&(Math.abs(d.delta)>Math.max(1,result.total)*1e-9||Math.abs(d.criticalDelta)>Math.max(1,result.critical)*1e-9));
      e.affectsDamage=affected.length>0;e.usedTargets=affected.map(d=>d.title);e.delta=affected.reduce((n,d)=>n+d.delta,0);
      e.criticalOnly=e.affectsDamage&&Math.abs(e.delta)<=Math.max(1,result.total)*1e-9&&Math.abs(e.criticalDelta)>Math.max(1,result.critical)*1e-9;
      if(!e.affectsDamage)e.reason=e.error?'移除该效果后的资格不同；已保留实际加入记录':'已加入计算属性，但当前指标未使用、已封顶或存在同类替代';
    }
    // Removing the chosen member of a non-stacking group may activate a backup.
    // Probe the whole group before mistaking the actually adopted effect for an unused one.
    const groupCache=new Map();
    for(const e of values.filter(e=>e.applied&&!e.affectsDamage&&e.group)){
      const alternatives=values.filter(x=>x.group===e.group&&x.key===e.key&&x.status==='overridden');if(!alternatives.length)continue;
      if(!groupCache.has(e.group))try{const ids=[...new Set(values.filter(x=>x.group===e.group).map(x=>x.id))],next=E.prepare({...config,disabledTeamEffects:[...(config.disabledTeamEffects||[]),...ids]},'team',panel,mains).evaluate(rolls,true);groupCache.set(e.group,(result.details||[]).map((d,i)=>({index:i,title:d.title,delta:d.total-(next.details[i]?.total||0),criticalDelta:num(d.critical)-num(next.details[i]?.critical)})));}catch{groupCache.set(e.group,[]);}
      const affected=groupCache.get(e.group).filter(d=>e.targetIndexes.includes(d.index)&&(Math.abs(d.delta)>Math.max(1,result.total)*1e-9||Math.abs(d.criticalDelta)>Math.max(1,result.critical)*1e-9));
      if(affected.length){e.groupAffectsDamage=true;e.usedTargets=affected.map(d=>d.title);e.reason='本次已采用；同类增益不叠加，移除此来源后可由'+[...new Set(alternatives.map(x=>x.owner))].join('、')+'替代';}
    }
    const targets=(result.details||[]).map((d,index)=>({index,title:d.title,calls:d.calls.map(c=>({kind:c.kind,rx:c.rx,element:c.element,tags:c.tags,cr:c.cr,cd:c.cd,coverage:c.coverage}))}));
    return {records:values,snapshots:[...snapshots.values()],targets,total:result.total,critical:result.critical,mode:config.supportMode||'manual'};
  }
  // Report scope is taken from this result's actual calls, never the current form.
  // Keep the complete numeric ledger above; only omit unrelated/no-effect rows from the user-facing report.
  function effectApplies(e,c){
    const normal=['normal','amplifying','additive'].includes(c.kind),key=e.key;
    if(key==='swirlCryo')return c.rx==='swirl'&&c.element==='cryo';
    const reactions=[...E.SPECIAL,...Object.keys(E.TRANSFORM),'vaporize','melt','aggravate','spread'];
    for(const rx of reactions)if(key===rx||['Base','Elevated','Cpct','Cdmg','Multi','Flat'].some(s=>key===rx+s))return c.rx===rx;
    const element=/^(res|dmg|cpct|cdmg)_(.+)$/.exec(key);
    if(element)return c.element===element[2]&&(element[1]==='dmg'?normal:element[1]==='res'||c.kind!=='transformative');
    if(['allDmg','allElementDmg','dmg','phy','enemyDef','enemyIgnore','ignore'].includes(key))return normal&&(key!=='phy'||c.element==='physical')&&(key!=='allElementDmg'||c.element!=='physical');
    const skill=/^(a2|a3|a|e2|e|q2|q3|q|nightsoul)(Dmg|Cpct|Cdmg|Def|Ignore|Pct|Multi|Plus|Elevated)$/.exec(key);
    if(skill)return (c.tags||[]).includes(skill[1])&&(!['Dmg','Def','Ignore'].includes(skill[2])||normal);
    if(['fypct','fyplus','elevated'].includes(key))return E.SPECIAL.has(c.rx);
    if(key==='cpct'||key==='cdmg')return c.kind!=='transformative';
    if(key==='transformCrit')return c.kind==='transformative'&&['burning','bloom','hyperBloom','burgeon'].includes(c.rx);
    return true; // Attribute conversions can use a stat indirectly; actual damage probes decide those.
  }
  function report(audit){
    if(!audit)return {records:[],snapshots:[]};
    const records=[],seen=new Set(),raw=audit.records||[];
    for(const source of raw){
      const e={...source},matching=(audit.targets||[]).filter(t=>(e.targetIndexes||[]).includes(t.index)&&t.calls.some(c=>effectApplies(e,c)));
      const effective=e.applied&&(e.affectsDamage||e.groupAffectsDamage);
      if(!effective&&audit.targets&&!matching.length)continue;
      e.targets=matching.length?matching.map(t=>t.title):e.targets||[];
      if(effective){e.displayStatus='used';e.usedTargets=e.usedTargets?.length?e.usedTargets:e.targets;if(e.affectsDamage)e.reason=e.criticalOnly?'本次期望伤害未提高；该增益计入全暴击伤害':'';}
      else if(e.status==='overridden'){
        const winner=raw.find(x=>x.group&&x.group===e.group&&x.key===e.key&&x.applied);
        if(winner&&!winner.affectsDamage&&!winner.groupAffectsDamage&&!['recharge','rechargeBorrowed'].includes(winner.key))continue;
        e.displayStatus='other';e.reason=winner?'同类增益不叠加；已采用'+winner.owner+'的'+effectLabel(winner.key)+' '+winner.value+(winner.key==='mastery'?'点':'%'):'同类效果已被覆盖';
      }else if(e.status==='disabled'){e.displayStatus='other';e.reason='本项已手动关闭，未计入伤害';}
      else if(/^(?:cpct|cpct_.+|.+Cpct)$/.test(e.key)&&matching.length&&matching.flatMap(t=>t.calls.filter(c=>effectApplies(e,c))).every(c=>c.cr>=100)){
        e.displayStatus='other';e.reason='当前适用伤害已满暴；这部分额外暴击率没有提高伤害';
      }else if(e.key==='recharge'||e.key==='rechargeBorrowed'){
        e.displayStatus='other';e.reason='已加入充能属性；用于循环，本指标伤害未因此提高';
      }else if(e.error){e.displayStatus='other';e.reason='已加入计算；单独移除会改变触发资格，保留此记录供核对';}
      else continue;
      const identity=JSON.stringify([e.id,e.key,e.value,e.status,e.targets,e.count,e.quota]);if(seen.has(identity))continue;seen.add(identity);records.push(e);
    }
    return {...audit,records};
  }
  function effectLabel(key){
    const direct={allDmg:'通用伤害加成',allElementDmg:'所有元素伤害加成',enemyDef:'敌人防御降低',enemyIgnore:'无视敌人防御',kx:'全抗性降低',flat:'附加基础伤害',masteryBorrowed:'元素精通分享',atkBorrowed:'固定攻击分享',rechargeBorrowed:'元素充能分享',aElementDmg:'普攻元素伤害加成',talentA:'普通攻击天赋',talentE:'元素战技天赋',talentQ:'元素爆发天赋',transformCrit:'指定剧变固定暴击率'};
    if(direct[key])return direct[key];if(E.LABELS[key])return E.LABELS[key];
    const ele=/^(res_|dmg_|cdmg_|cpct_)(.+)$/.exec(key);if(ele)return (E.ELEMENT[ele[2]]||ele[2])+({res_:'抗性降低',dmg_:'伤害加成',cdmg_:'暴击伤害',cpct_:'暴击率'})[ele[1]];
    const m=/^(.*?)(Base|Elevated|Cpct|Cdmg|Dmg)$/.exec(key),names={stellarConduct:'星超导',stellarSwirl:'星扩散',stellarVortex:'星辉冰旋',lunarCharged:'月感电',lunarBloom:'月绽放',lunarCrystallize:'月结晶',a:'普攻',a2:'重击',a3:'下落',e:'战技',q:'爆发'};
    if(m&&names[m[1]])return names[m[1]]+({Base:'基础提升',Elevated:'擢升',Cpct:'暴击率',Cdmg:'暴击伤害',Dmg:'伤害加成'})[m[2]];
    return ({stellarConduct:'星超导增伤',stellarSwirl:'星扩散增伤',stellarVortex:'星辉冰旋增伤',lunarCharged:'月感电增伤',lunarBloom:'月绽放增伤',lunarCrystallize:'月结晶增伤',vaporize:'蒸发反应加成',melt:'融化反应加成',bloom:'绽放增伤',hyperBloom:'超绽放增伤',burgeon:'烈绽放增伤',burning:'燃烧增伤',aggravate:'超激化加成',spread:'蔓激化加成',swirl:'扩散增伤',swirlCryo:'冰扩散增伤',superConduct:'超导增伤',electroCharged:'感电增伤'})[key]||key;
  }
  global.GTeam={MOON,HEX,NIGHTS,moonCandidates,moonStat,moonValue,supported,partialCoverage,supportDescription,rawSupportInputs,supportInputs,convertedInputs,resourceNames,stackNames,resolve,hasFlatBuffs,audit,report,effectLabel,talentInfo:P.talentInfo};
  if(typeof module!=='undefined')module.exports=global.GTeam;
})(typeof globalThis!=='undefined'?globalThis:this);
