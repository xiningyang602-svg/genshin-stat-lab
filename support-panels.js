/* Support attributes are evaluated once from their resident anchors, with source-level reuse rules. */
(function(g){
  'use strict';
  const E=g.GEngine,K=['atk','hp','def','mastery','cpct','recharge'],num=(x,d=0)=>x!==''&&Number.isFinite(Number(x))?Number(x):d;
  const clone=o=>JSON.parse(JSON.stringify(o)),labels={atk:'攻击力',hp:'生命值',def:'防御力',mastery:'元素精通',cpct:'暴击率',recharge:'充能效率'};
  const sharedWeapons=new Set(['苍古自由之誓','终末嗟叹之诗','松籁响起之时','狼的末路','讨龙英杰谭']),snapshotPolicies=new Set(['nicoleE','kazuhaA4','sucroseA4','rosariaQ','keySnapshot','peakSnapshot']);
  const autoWeapons=new Set(['西福斯的月光','流浪的晚星','玛海菈的水色']);
  function primarySource(c){let panel=c._supportRuntimePanel;if(!panel){try{panel=E.outOfCombatPanel(c);}catch(e){if(c.weapon)throw e;panel={};}}return {character:c.character,level:c.level,cons:c.cons,weapon:c.weapon,refine:c.refine,talents:c.talents,panel,constructed:true,set:(c.sets||[]).find(s=>s.count>=4)?.name||'none',castE:true,castQ:true,characterActive:true,weaponActive:true,setActive:true,homework:c.conditions?.homework,uptime:100,stacks:3};}
  function isStat(key){return /^(atk|hp|def)(Pct|Plus|Borrowed)?$/.test(key)||/^(mastery|cpct|recharge)(Plus|Borrowed)?$/.test(key);}
  function statKey(key){return key.startsWith('mastery')?'mastery':key.startsWith('recharge')?'recharge':key.startsWith('cpct')?'cpct':key.slice(0,3)==='atk'?'atk':key.startsWith('hp')?'hp':'def';}
  function policy(e){
    if(e.owner==='哥伦比娅'&&/C2皎辉/.test(e.source))return 'columbinaC2';
    if(e.owner==='尼可'&&e.key==='atkPlus')return /C2/.test(e.source)?'nicoleC2':/圣祝/.test(e.source)?'nicoleA1':'nicoleE';
    if(e.key.includes('Borrowed'))return 'borrowed';
    if(e.key==='atkPlus'&&['班尼特','九条裟罗','伊安珊','沃雅妮莎'].includes(e.owner))return 'borrowed';
    return 'direct';
  }
  function recipientAllows(e,target,c){
    if(!isStat(e.key))return true;
    if(e.owner===target&&e.category==='角色'){
      if(['砂糖','叶洛亚','艾尔海森','茜特菈莉'].includes(e.owner)&&e.key.startsWith('mastery')||['胡桃','罗莎莉亚'].includes(e.owner)&&e.key==='cpct'||e.owner==='宵宫'&&e.key==='atkPct'||e.owner==='枫原万叶'&&e.key==='mastery'||e.owner==='莉奈娅'&&e.key==='defPct')return false;
    }
    if(e.owner===target&&e.category==='武器'&&['千夜浮梦','西福斯的月光','流浪的晚星','玛海菈的水色'].includes(e.source))return false;
    if(e.owner===target&&/讨龙英杰谭/.test(e.source))return false;
    if(/双冰共鸣/.test(e.source))return false; // Conditional target CR is not the holder's shareable panel CR.
    if(target!==c.character&&(e.owner==='九条裟罗'||/锅巴辣椒|种识之叶|苏生之叶/.test(e.source)))return false;
    return true;
  }
  function read(panel,key,consumer='general'){
    if(!panel)return 0;
    const base=num((consumer==='weaponRefresh'?panel.refreshEligible:snapshotPolicies.has(consumer)?panel.castEligible:panel.eligible)?.[key]??panel.eligible?.[key]);
    return base+(consumer==='pruneA4'?(panel.sources||[]).filter(e=>e.stat===key&&e.policy==='nicoleC2').reduce((s,e)=>s+e.points,0):0);
  }
  function track(panel,key,value,consumer){if(!panel)return;panel.reads??=[];if(!panel.reads.some(x=>x.key===key&&x.consumer===consumer&&x.value===value))panel.reads.push({key,value,consumer});}
  function actors(c){return [primarySource(c),...(c.teammates||[]).filter(t=>t.character)];}
  function guaranteedMaxEM(c){
    const list=actors(c),full=c.supportMode==='full',moon=list.filter(t=>g.GTeam.MOON.includes(t.character)).length>=2,hasSet=name=>list.some(t=>t.set===name&&(full||t.setActive)),fixed=(hasSet('纺月的夜歌')?(moon?120:60):0)+(hasSet('教官')?120:0)+(list.some(t=>t.character==='阿贝多'&&(full||t.castQ))?125:0);
    return Math.max(0,...list.filter(t=>t.panel?.mastery!==undefined&&t.panel.mastery!=='').map(t=>{let v=num(t.panel.mastery);if(!t.constructed&&['桑多涅','菲林斯','旅行者·冰'].includes(t.character))v-=Math.min(num(t.panel.atk)*(t.character==='菲林斯'&&t.cons>=4?.1:.08),t.character==='菲林斯'&&t.cons>=4?220:160);if(t.character==='纳西妲'&&t.cons>=4&&(full||t.characterActive))v+=[100,120,140,160][Math.min(4,Math.max(1,num(c.enemy?.count,1)))-1];return v+fixed;}));
  }
  function requirements(c){
    const T=g.GTeam,result={};if(!T)return result;const people=(c.teammates||[]).filter(t=>t.character);
    for(const t of people)result[t.character]=new Set(T.rawSupportInputs(t,c));
    if(Object.values(result).some(v=>v.has('mastery')))for(const t of people)if(t.character==='砂糖')result[t.character].add('mastery');
    const nahida=people.find(t=>t.character==='纳西妲');if(nahida&&guaranteedMaxEM(c)<1000)for(const t of people)result[t.character].add('mastery');
    for(let pass=0;pass<5;pass++)for(const t of people){const s=result[t.character];
      if(s.has('atk')){if(['护摩之杖','磐岩结绿'].includes(t.weapon))s.add('hp');if(['赤沙之杖','流浪的晚星','玛海菈的水色'].includes(t.weapon))s.add('mastery');if(t.weapon==='薙草之稻光')s.add('recharge');}
      if(s.has('recharge')&&t.weapon==='西福斯的月光')s.add('mastery');
      if(s.has('mastery')&&['桑多涅','菲林斯','旅行者·冰'].includes(t.character))s.add('atk');
      // Non-static holder effects can introduce an additional source attribute.
      try{const cc=E.defaultConfig(t.character);cc.weapon=t.weapon;cc.refine=t.refine||1;for(const b of E.weaponBuffs(E.getWeapon(cc,E.character(t.character))))for(const [key,value]of Object.entries(b.data||{}))if(isStat(key)&&s.has(statKey(key))&&typeof value==='function')for(const match of value.toString().matchAll(/attr\.(hp|atk|def|mastery|recharge|cpct)\b/g))s.add(match[1]);}catch{}
    }
    return Object.fromEntries(Object.entries(result).map(([n,s])=>[n,[...s]]));
  }
  function ownParameters(c,t){
    const roster=[{character:c.character},...(c.teammates||[]).filter(t=>t.character)],person=E.character(t.character),other=roster.filter(x=>x.character!==t.character).map(x=>E.character(x.character)),p={};
    for(const f of [...(E.STATE_FIELDS.weapons[t.weapon]||[]),...(E.STATE_FIELDS.sets[t.set]||[])]){const [key,,type,max,,fallback]=f;p[key]=c.supportMode==='full'?type==='bool'?true:typeof type==='number'?max:type==='select'?max[0][0]:fallback: t.ownStates?.[key]??fallback??(type==='bool'?false:typeof type==='number'?type:type==='select'?max[0][0]:[]);}
    return {...p,partySize:other.length+1,partyElements:new Set([person.element,...other.map(x=>x.element)]).size,mArtisSameCount:other.filter(x=>x.element===person.element).length,mArtisDiffCount:other.filter(x=>x.element!==person.element).length,liyueCount:[person,...other].filter(x=>x.region==='璃月').length,Moonsign:roster.filter(x=>g.GTeam.MOON.includes(x.character)).length>=2?2:1,Hexenzirkel:roster.filter(x=>g.GTeam.HEX.includes(x.character)).length>=2,off_field:t.character!==(c._panelActive||c.character),currentHpPct:num(t.currentHpPct,100),shielded:!!c.conditions?.shielded,engulfingBurstActive:c.supportMode==='full'||!!t.castQ,scarletStacks:c.supportMode==='full'?3:num(t.weaponStacks),widsithMode:t.ownStates?.widsithMode||'atk',Nightsoul:g.GTeam.NIGHTS.includes(t.character),...t.ownStates};
  }
  function ownDirect(c,t,white){
    const effects=[],add=(key,value,source)=>{if(value)effects.push({id:t.character+':self:'+source+':'+key,owner:t.character,category:'自身',key,value,source,policy:'direct'});},cons=num(t.cons),full=c.supportMode==='full',active=full||t.characterActive;
    if(active){
    const atkPct=n=>add('atkPct',n,t.character+'自身天赋'),defPct=n=>add('defPct',n,t.character+'自身天赋'),hpPct=n=>add('hpPct',n,t.character+'自身天赋');
    if(t.character==='枫原万叶'&&cons>=2&&(full||t.castQ))add('mastery',200,'枫原万叶C2自身');
    if(t.character==='纳西妲'&&cons>=4)add('mastery',[100,120,140,160][Math.min(4,Math.max(1,num(c.enemy?.count,1)))-1],'纳西妲C4标记');
    if(t.character==='罗莎莉亚')add('cpct',12,'罗莎莉亚A1');
    if(t.constructed&&t.character==='菲林斯'&&cons>=4)atkPct(20);
    if(t.constructed&&t.character==='茜特菈莉'&&cons>=2)add('mastery',125,'茜特菈莉常驻C2');
    if(t.character==='伊安珊')atkPct(20);
    if(t.character==='云堇'&&cons>=4)defPct(20);
    if(t.character==='坎蒂丝'&&cons>=2)hpPct(20);
    if(t.character==='希诺宁')defPct(20);
    if(t.character==='闲云'&&cons>=2)atkPct(20);
    if(t.character==='哥伦比娅'&&cons>=2)hpPct(40);
    if(t.character==='莉奈娅'&&cons>=4)defPct(cons>=6?50:25);
    if(t.character==='阿贝多'&&cons>=1&&c.conditions?.hexerei)defPct(50);
    if(t.character==='兹白'){const other=actors(c).filter(x=>x.character!==t.character).map(x=>E.character(x.character));defPct(15*other.filter(x=>x.element==='geo').length);add('mastery',60*other.filter(x=>x.element==='hydro').length,'兹白A4水队友');}
    if(t.character==='奈芙尔'&&actors(c).filter(x=>g.GTeam.MOON.includes(x.character)).length>=2)add('mastery',cons>=2?200:100,'奈芙尔满帷');
    if(t.character==='沃雅妮莎'&&cons>=4)hpPct(60);
    if(t.character==='布伦妮'){if(c.conditions?.hexerei)atkPct(90);if(cons>=2)atkPct(10+5*Math.min(6,Math.max(0,num(t.ownStates?.pruneC2HitStacks,6))));}
    if(t.character==='芙宁娜'&&cons>=2)hpPct(140);
    if(t.character==='神里绫人'&&cons>=2&&t.character===(c._panelActive||c.character)&&(full||t.castE))hpPct(50);
    if(t.character==='薇斯纳'&&g.GSupport.scene(c).ss){const people=actors(c).map(x=>E.character(x.character)),n=people.filter(x=>['cryo','anemo'].includes(x.element)).length;atkPct(n*(cons>=4?18:6)+(cons>=2?40:0));add('mastery',(people.length-n)*(cons>=4?75:25),'薇斯纳人数天赋');}
    }
    const cfg={...E.defaultConfig(t.character),level:t.level||90,weapon:t.weapon,refine:t.refine,sets:t.set&&t.set!=='none'?[{name:t.set,count:4}]:[]},p=ownParameters(c,t),base=t.panel||{},all=Object.fromEntries(K.map(k=>[k,num(base[k],k==='recharge'?100:0)])),attr=E.createAttr(cfg,E.character(t.character),E.getWeapon(cfg,E.character(t.character)),{},{...all,mode:'total'}),ds={attr,calc:E.calc,params:p,refine:num(t.refine,1)-1,cons,element:E.ELEMENT[E.character(t.character).element],weaponTypeName:E.WEAPON[E.character(t.character).weapon],artis:{}};
    const permanentConverters=new Set(['护摩之杖','磐岩结绿','赤沙之杖','薙草之稻光','西福斯的月光','流浪的晚星','玛海菈的水色','圣显之钥','决斗之枪','黎明神剑']),countWeapons=new Set(['千夜浮梦','千岩长枪','千岩古剑','碎链','悬黎千钧','峡湾长歌','最初的大魔术']);
    if(t.weapon==='决斗之枪'){const pair=num(c.enemy?.count,1)>=2,r=num(t.refine,1)-1;add('atkPct',(pair?[16,20,24,28,32][r]:[24,30,36,42,48][r])-(t.constructed?0:[24,30,36,42,48][r]),'决斗之枪敌人数档位差额');if(pair)add('defPct',[16,20,24,28,32][r],'决斗之枪双敌防御');}
    if(t.weapon==='黎明神剑'){const v=[14,17.5,21,24.5,28][num(t.refine,1)-1];add('cpct',(num(t.currentHpPct,100)>90?v:0)-(t.constructed?0:v),'黎明神剑生命档位差额');}
    for(const b of [...E.weaponBuffs(E.getWeapon(cfg,E.character(t.character))),...E.artifactBuffs(cfg)]){
      if(!full&&(b.id.startsWith('weapon:')?!t.weaponActive:!t.setActive))continue;
      if(b.isStatic||b.staticSet||/常驻/.test(b.title||'')||b.id.startsWith('weapon:')&&(permanentConverters.has(t.weapon)||sharedWeapons.has(t.weapon)))continue;
      if(b.id.startsWith('set:')&&['昔日宗室之仪','千岩牢固','教官','纺月的夜歌'].includes(t.set))continue;
      if(b.check&&!b.check(ds))continue;
      for(const [key,value]of Object.entries(b.data||{})){if(!isStat(key)||key==='cpct'&&b.id.startsWith('set:')&&['冰风迷途的勇士','影中沉凝的幻灭','黑曜秘典'].includes(t.set))continue;let v=typeof value==='function'?value(ds):value;if(!t.constructed&&b.id.startsWith('weapon:')&&countWeapons.has(t.weapon)){const solo={...ds,params:{...p,partySize:1,partyElements:1,mArtisSameCount:0,mArtisDiffCount:0,liyueCount:E.character(t.character).region==='璃月'?1:0}};v-=b.check&&!b.check(solo)?0:typeof value==='function'?value(solo):value;}if(!Number.isFinite(v))throw Error(t.character+'的'+(t.weapon||t.set)+'自身属性尚缺明确状态，请使用实战面板模式');add(key,v,(b.id.startsWith('weapon:')?t.weapon:t.set)+'自身临时效果');}
    }
    return effects;
  }
  function baselineConversions(t,p){
    if(t.constructed)return [];
    const r=num(t.refine,1)-1,hp=num(p.hp),er=num(p.recharge,100),list=[],add=(stat,value,source,allowed=false)=>{if(value&&p[stat]!==undefined)list.push({stat,value,source,allowed});};
    let baseEM=0,eligibleAtk=num(p.atk),em=num(p.mastery);
    if(['菲林斯','桑多涅','旅行者·冰'].includes(t.character)){
      const k=t.character==='菲林斯'&&t.cons>=4?.1:.08,cap=t.character==='菲林斯'&&t.cons>=4?220:160,a=t.weapon==='赤沙之杖'?[.52,.65,.78,.91,1.04][r]:t.baseAutoPassive!==false&&['流浪的晚星','玛海菈的水色'].includes(t.weapon)?[.24,.3,.36,.42,.48][r]:0,b=t.weapon==='护摩之杖'?hp*[.008,.01,.012,.014,.016][r]:t.weapon==='磐岩结绿'?hp*[.012,.015,.018,.021,.024][r]:0;
      eligibleAtk-=b;if(a){const cappedEM=em-cap,cappedAtk=eligibleAtk-a*cappedEM;em=cappedEM>=0&&k*cappedAtk>=cap?cappedEM:(em-k*eligibleAtk)/(1-k*a);eligibleAtk-=a*em;}baseEM=Math.min(k*eligibleAtk,cap);add('mastery',baseEM,t.character+'常驻攻击转精通');em=num(p.mastery)-baseEM;
    }
    if(t.weapon==='护摩之杖')add('atk',hp*[.008,.01,.012,.014,.016][r],'护摩常驻生命转攻击');
    if(t.weapon==='磐岩结绿')add('atk',hp*[.012,.015,.018,.021,.024][r],'绿剑常驻生命转攻击');
    if(t.weapon==='赤沙之杖')add('atk',em*[.52,.65,.78,.91,1.04][r],'赤沙常驻精通转攻击');
    if(t.weapon==='薙草之稻光')add('atk',Math.min([80,90,100,110,120][r],Math.max(0,er-100)*[.28,.35,.42,.49,.56][r])/100*p._white.atk,'薙草常驻充能转攻击',true);
    if(t.baseAutoPassive!==false){if(['流浪的晚星','玛海菈的水色'].includes(t.weapon))add('atk',em*[.24,.3,.36,.42,.48][r],t.weapon+'自动精通转攻击');if(t.weapon==='西福斯的月光')add('recharge',em*[.036,.045,.054,.063,.072][r],'西福斯自动精通转充能');}
    return list;
  }
  function runtimeKeys(c){
    if(c.supportPanelMode!=='base'||c._supportPanelPass)return [];
    const keys=new Set(),byRole={砂糖:'mastery',尼可:'atk',伊涅芙:'atk',莉奈娅:'def',哥伦比娅:'hp',沃雅妮莎:'hp',罗莎莉亚:'cpct',伊安珊:'atk'};if(byRole[c.character])keys.add(byRole[c.character]);
    if(['圣显之钥','漩流颂歌'].includes(c.weapon))keys.add('hp');if(['西福斯的月光','流浪的晚星','玛海菈的水色'].includes(c.weapon))keys.add('mastery');
    const n=(c.teammates||[]).find(t=>t.character==='纳西妲');if(n&&guaranteedMaxEM(c)<1000)keys.add('mastery');return [...keys];
  }
  function apply(list,base,white,layer){const out={...base};for(const e of list){if(!isStat(e.key)||e.status&&e.status!=='applied')continue;const stat=statKey(e.key),points=e.key.endsWith('Pct')?white[stat]*e.value/100:e.value;out[stat]=num(out[stat])+points;if(layer)layer.push({...e,stat,points,policy:e.policy||policy(e)});}return out;}
  function build(c){
    const people=actors(c),req=requirements(c),panels={},errors=[];
    for(const t of people){const char=E.character(t.character),w=E.getWeapon({weapon:t.weapon,refine:t.refine},char),s=E.getStats(char,t.constructed?c.level||90:90),white={atk:s.atkBase+w.base,hp:s.hpBase,def:s.defBase},raw={...t.panel};
      for(const key of req[t.character]||[])if(raw[key]===''||raw[key]===undefined||!Number.isFinite(Number(raw[key]))||['atk','hp','def'].includes(key)&&raw[key]<=0)errors.push(t.character+'需要填写常驻'+labels[key]+'（包括属性转化所需的来源数值）');
      const resident=Object.fromEntries(K.filter(k=>raw[k]!==undefined&&raw[k]!=='').map(k=>[k,num(raw[k])])),anchor={...resident},sources=[];
      for(const b of baselineConversions(t,{...resident,_white:white})){anchor[b.stat]=num(anchor[b.stat])-b.value;sources.push({id:t.character+':baseline:'+b.source,owner:t.character,source:b.source,stat:b.stat,points:-b.value,policy:'baseline-excluded'});}
      for(const key of req[t.character]||[])if(num(anchor[key])<-.01)errors.push(t.character+'常驻'+labels[key]+'不足以包含已选装备的常驻转化，请核对输入口径');
      panels[t.character]={resident,eligible:{...anchor},total:{...anchor},anchor,white,sources,required:req[t.character]||[],timing:t.character==='尼可'?'E施放时合格攻击；默认先触发可用队伍增益':'伤害发生时；辅助按后台处理'};
    }
    function collect(name,views,active=c.character,castViews,refreshViews){return g.GTeam.resolve({...c,_scope:'team',_supportPanelPass:true,_statRecipient:name,_panelActive:active,_sourcePanels:views,_sourceCastPanels:castViews,_sourceRefreshPanels:refreshViews,_teamResolved:true,manualTeam:{},team:{},conditions:{...c.conditions,currentHpPct:num(people.find(t=>t.character===active)?.currentHpPct,c.conditions?.currentHpPct??100)}},{strict:false}).teamEffects.filter(e=>isStat(e.key)&&e.status==='applied');}
    function eligiblePhase(active){
      const views=clone(panels);for(const t of people){const p=views[t.character];p.eligible=apply(ownDirect({...c,_panelActive:active},t,p.white),p.anchor,p.white,p.sources);p.total={...p.eligible};}
      const initial=clone(views);for(const t of people){const p=views[t.character];p.eligible=apply(collect(t.character,initial,active).filter(e=>policy(e)==='direct'),p.eligible,p.white,p.sources);p.total={...p.eligible};}
      // Explicit allowed conversion: Engulfing ER→ATK is premod, and Columbina C2 outputs are non-extra.
      for(const t of people){const p=views[t.character],r=num(t.refine,1)-1;if(t.weapon==='薙草之稻光'){const bonus=t.weaponActive===false?0:[30,35,40,45,50][r];p.eligible.recharge=num(p.eligible.recharge,100)+bonus;p.sources.push({owner:t.character,source:'薙草Q充能',stat:'recharge',points:bonus,policy:'direct'});const v=Math.min([80,90,100,110,120][r],Math.max(0,p.eligible.recharge-100)*[.28,.35,.42,.49,.56][r])/100*p.white.atk;p.eligible.atk=num(p.eligible.atk)+v;p.sources.push({owner:t.character,source:'薙草当前充能转攻击',stat:'atk',points:v,policy:'direct'});}p.total={...p.eligible};}
      const before=clone(views);for(const t of people){const p=views[t.character];p.eligible=apply(collect(t.character,before,active).filter(e=>policy(e)==='columbinaC2'),p.eligible,p.white,p.sources);p.total={...p.eligible};}return views;
    }
    const current=eligiblePhase(c.character),castViews={},refreshViews={};
    for(const t of people){
      if(['尼可','枫原万叶','砂糖','罗莎莉亚'].includes(t.character)||['圣显之钥','岩峰巡歌'].includes(t.weapon))castViews[t.character]=eligiblePhase(t.character)[t.character];
      if(autoWeapons.has(t.weapon))refreshViews[t.character]=eligiblePhase(t.weaponRefreshPhase==='onField'?t.character:c.character)[t.character];
    }
    for(const t of people){const p=current[t.character];p.castEligible=castViews[t.character]?.eligible;p.castSources=castViews[t.character]?.sources;p.refreshEligible=refreshViews[t.character]?.eligible;p.refreshSources=refreshViews[t.character]?.sources;
      if(['圣显之钥','岩峰巡歌'].includes(t.weapon))p.timing+='；'+t.weapon+'已在持有者前台、上述队伍增益有效时满层触发并保存取样值，不随后续属性实时改变';
      if(autoWeapons.has(t.weapon))p.timing+='；'+t.weapon+'采用最近一次10秒刷新值，刷新时持有者在'+(t.weaponRefreshPhase==='onField'?'前台':'后台')+'，该轮固定增益保留12秒';
      panels[t.character]=p;
    }
    const eligible=clone(panels);for(const t of people){const p=panels[t.character];p.total=apply(collect(t.character,eligible,c.character,castViews,refreshViews).filter(e=>!['direct','columbinaC2'].includes(policy(e))),p.eligible,p.white,p.sources);}
    for(const t of people){const p=panels[t.character],r=num(t.refine,1)-1,em=num(p.eligible.mastery),hp=num(p.eligible.hp),extra=[],add=(stat,value,source)=>{if(value)extra.push({id:t.character+':self-derived:'+source,owner:t.character,stat,points:value,source,policy:'borrowed'});};
      if(t.weapon==='护摩之杖')add('atk',hp*([.008,.01,.012,.014,.016][r]+(num(t.currentHpPct,100)<50?[.01,.012,.014,.016,.018][r]:0)),'护摩当前生命转攻击');
      if(t.weapon==='磐岩结绿')add('atk',hp*[.012,.015,.018,.021,.024][r],'绿剑当前生命转攻击');
      if(t.weapon==='赤沙之杖')add('atk',em*([.52,.65,.78,.91,1.04][r]+[.28,.35,.42,.49,.56][r]*(c.supportMode==='full'?3:num(t.weaponStacks))),'赤沙当前精通转攻击');
      if(['流浪的晚星','玛海菈的水色'].includes(t.weapon))add('atk',read(p,'mastery','weaponRefresh')*[.24,.3,.36,.42,.48][r],t.weapon+'刷新取样·自身精通转攻击');
      if(t.weapon==='西福斯的月光')add('recharge',read(p,'mastery','weaponRefresh')*[.036,.045,.054,.063,.072][r],'西福斯刷新取样·自身精通转充能');
      if(t.weapon==='圣显之钥'&&(c.supportMode==='full'||t.weaponActive))add('mastery',read(p,'hp','keySnapshot')*[.0012,.0015,.0018,.0021,.0024][r]*3,'圣显三层触发取样·自身精通');
      for(const e of extra){p.total[e.stat]=num(p.total[e.stat])+e.points;p.sources.push(e);}
    }
    for(const t of people)if(['桑多涅','菲林斯','旅行者·冰'].includes(t.character)){const p=panels[t.character],n=Math.min(num(p.eligible.atk)*(t.character==='菲林斯'&&t.cons>=4?.1:.08),t.character==='菲林斯'&&t.cons>=4?220:160);p.total.mastery=num(p.total.mastery)+n;p.sources.push({owner:t.character,source:t.character+'当前合格攻击转精通',stat:'mastery',points:n,policy:'borrowed'});}
    return {panels,errors:[...new Set(errors)]};
  }
  g.GSupportPanels={requirements,primarySource,isStat,policy,recipientAllows,read,track,build,autoWeapons,snapshotPolicies,runtimeKeys,parameters:ownParameters};
  if(typeof module!=='undefined')module.exports=g.GSupportPanels;
})(typeof globalThis!=='undefined'?globalThis:this);
