/* Qualified, full support snapshots; retained manual mode is an explicit override. */
(function(g){
  'use strict';
  const E=g.GEngine,num=(v,d=0)=>v!==''&&Number.isFinite(Number(v))?Number(v):d;
  const fixed=['艾梅莉埃','爱诺','八重神子','芭芭拉','白术','布伦妮','杜林','法尔伽','菲谢尔','卡齐娜','柯莱','莱依拉','蓝砚','雷泽','林尼','琳妮特','鹿野院平藏','旅行者·草','旅行者·风','旅行者·火','旅行者·雷','旅行者·岩','洛恩','玛薇卡','米卡','妮露','欧洛伦','绮良良','托马','温迪','希格雯','闲云','宵宫','雅珂达','瑶瑶','阿罗夏'];
  const neutral=['迪希雅','嘉明','克洛琳德','旅行者·水','那维莱特','奇偶·男性','奇偶·女性','恰斯卡','千织','瓦雷莎','夏洛蒂','烟绯','莱欧斯利','塔利雅','丝柯克','卡维','梦见月瑞希'];
  const extraInputs={白术:['hp'],布伦妮:['atk'],杜林:['atk'],莱依拉:['hp'],'旅行者·雷':['recharge'],妮露:['hp'],七七:['atk'],希格雯:['hp'],闲云:['atk'],'梦见月瑞希':['mastery']};
  function scene(c){const rx=c._metric?.reaction||'',cond=c.conditions||{},indirect=(c._metric?.entries||[]).some(x=>/\.reaction\(|['"]fy['"]/.test(E.resolveDetail(c,x.index)?.dmg?.toString()||''));return {rx,indirect,star:['stellarConduct','stellarSwirl','stellarVortex'].includes(rx),moon:rx.startsWith('lunar'),sc:rx==='stellarConduct'||!rx&&!!cond.stellarField,ss:['stellarSwirl','stellarVortex'].includes(rx)||!rx&&!cond.stellarField&&!!cond.vortexActive,title:c._metric?.title||'',element:E.character(c.character)?.element};}
  function reactionElement(c){const s=scene(c);if(['pyro','hydro','cryo','electro'].includes(s.element))return s.element;if(s.ss)return 'cryo';return (c.teammates||[]).map(t=>E.character(t.character)?.element).find(e=>['pyro','hydro','cryo','electro'].includes(e))||'cryo';}
  function nilouGoldenState(c,t={}){
    const people=[{character:c.character,castE:true},...(c.teammates||[])].filter(x=>E.character(x.character)),fullMoon=people.filter(x=>g.GTeam?.MOON.includes(x.character)).length>=2;
    const elements=people.map(x=>E.character(x.character).element),eligible=(c.supportMode==='full'||t.castE)&&elements.every(e=>['hydro','dendro'].includes(e))&&elements.includes('hydro')&&elements.includes('dendro');
    const conversion=fullMoon&&people.some(x=>x.character==='奈芙尔'&&(c.supportMode==='full'||x.castE)),mode=c.character==='奈芙尔'&&t.character==='妮露'?(t.nilouGoldenEmMode==='on'?'on':'off'):'auto';
    const active=!!eligible&&(mode==='on'||mode==='auto'&&!conversion);
    const reason=!eligible?'水草队伍或E舞步条件未满足，不计金杯100精通':mode==='on'?'已确认受到草元素攻击，100精通仍在10秒内':mode==='off'?'未触发或100精通已过10秒':conversion?'奈芙尔满辉开E后种子不迸发，默认未触发100精通；开E前自伤或敌方草攻击仍可另行触发':'按丰穰之核自伤触发100精通，持续10秒';
    return {active,conversion,eligible:!!eligible,mode,reason};
  }
  function preset(c){
    if(c.supportMode!=='full'||c._scope==='solo'||!(c.teammates||[]).some(t=>t.character))return c;
    const T=g.GTeam,s=scene(c),people=[c.character,...(c.teammates||[]).map(t=>t.character)].map(E.character).filter(Boolean),elements=new Set(people.map(x=>x.element)),cond=c.conditions||(c.conditions={});
    const shielders=['钟离','迪奥娜','莱依拉','绮良良','蓝砚','托马','辛焱','诺艾尔','茜特菈莉','塔利雅','希格雯','尼可'];
    cond.onField=cond.onField!==false;cond.enemyCount=Math.max(1,num(c.enemy?.count,1));
    if(T?.HEX.includes(c.character))cond.homework=true;
    cond.radianceConduct=s.sc;cond.radianceSwirl=s.ss;
    if(s.ss)cond.vortexActive=true;
    if(people.some(p=>shielders.includes(p.key))||elements.has('geo')&&['pyro','hydro','cryo','electro'].some(e=>elements.has(e)))cond.shielded=true;
    if(elements.has('cryo'))cond.cryoAura=true;
    if(elements.has('dendro')&&elements.has('electro'))cond.quicken=true;
    if(elements.has('dendro')){cond.dendroFirst=['pyro','hydro','electro'].some(e=>elements.has(e));cond.dendroSecond=elements.has('electro');}
    if(cond.shielded&&elements.has('geo')){cond.geoShredActive=true;cond.crystallizeShield=true;}
    if((c.teammates||[]).some(t=>t.character==='多莉'&&num(t.cons)>=4))cond.currentEnergyPct=c.weapon==='破魔之弓'?100:0;
    if(people.filter(p=>T?.MOON.includes(p.key)).length>=2)cond.lastNonMoonCaster??='auto';
    c.teammates=(c.teammates||[]).map(t=>{
      if(!t.character)return t;
      const x={...t,panel:{...t.panel},premod:{...t.premod},castE:true,castQ:true,characterActive:true,weaponActive:true,setActive:true,uptime:100,homework:T?.HEX.includes(t.character)||false,weaponStacks:3,scrollBaseExpired:false,scrollNightsoulActive:T?.NIGHTS.includes(t.character)||false,silverActive:true,transientWisdomActive:true,silverPlungeActive:true};
      const caps={芙宁娜:num(t.cons)>=1?400:300,伊安珊:54,茜特菈莉:40,奥黛塔:num(t.cons)>=1?6:4,夜兰:14,夏沃蕾:3,艾尔海森:3,菈乌玛:18,云堇:30,沃雅妮莎:cond.onField?25:10};
      if(Object.hasOwn(caps,t.character))x.stacks=caps[t.character];
      if(T?.resourceNames[t.character])x.resources=t.character==='申鹤'?(/普攻|普通攻击|重击|下落|N1/.test(s.title)?7:5):T.resourceNames[t.character][1];
      x.element=reactionElement(c);const own=E.character(t.character)?.element;
      x.scrollElements=[...new Set([own,x.element, ...(s.ss?['cryo','anemo']:s.sc?['cryo','electro']:[])])].filter(Boolean);
      if(x.scrollElements.length<2)x.scrollElements.push(own==='hydro'?'electro':'hydro');
      x.reactionElements=[...new Set(['electro',x.element])];if(x.reactionElements.length<2)x.reactionElements.push('hydro');
      if(t.character==='申鹤')x.mode=/普攻|普通攻击|重击|下落|N1/.test(s.title)?'hold':'tap';
      if(t.character==='哥伦比娅'){const reaction=s.rx||c._metric?.partyReaction;x.mode=reaction==='lunarCrystallize'?'lunarCrystallize':reaction==='lunarBloom'?'lunarBloom':'lunarCharged';x.c6Reaction='all';}
      if(t.character==='奥黛塔'){x.mode=s.ss?'stellarSwirl':s.sc?'stellarConduct':'off';x.blessingFull=true;}
      return x;
    });
    return c;
  }
  function inputs(t,c,base=[]){
    const keys=new Set([...base,...(extraInputs[t.character]||[])]),s=scene(c||{}),cons=num(t.cons),normal=!s.star&&!s.moon,ele=s.element;
    if(t.character==='奥黛塔')keys.delete('atk');
    if(t.character==='七七'&&(cons<6||!s.star))keys.delete('atk');
    if(t.character==='希诺宁'&&cons<4)keys.delete('def');
    if(t.character==='茜特菈莉'&&(cons<1||!normal))keys.delete('mastery');
    if(t.character==='杜林'&&(cons<1||!normal))keys.delete('atk');
    if(t.character==='布伦妮'&&!normal)keys.delete('atk');
    if(t.character==='莱依拉'&&(cons<4||!normal||!/普攻|普通攻击|重击|N1/.test(s.title)))keys.delete('hp');
    if(t.character==='希格雯'&&c?.conditions?.onField!==false)keys.delete('hp');
    if(t.character==='闲云'&&(!normal||!/下落|坠地|低空|高空/.test(s.title)))keys.delete('atk');
    if(t.character==='枫原万叶'&&!normal)keys.delete('mastery');
    if(['菲林斯','奈芙尔','兹白','薇斯纳','桑多涅','旅行者·冰'].includes(t.character)&&!s.star&&!s.moon)for(const k of ['atk','def','mastery'])keys.delete(k);
    if(t.character==='菲林斯'&&s.rx!=='lunarCharged')keys.delete('atk');
    if(t.character==='奈芙尔'&&s.rx!=='lunarBloom')keys.delete('mastery');
    if(t.character==='兹白'&&s.rx!=='lunarCrystallize')keys.delete('def');
    if(t.character==='薇斯纳'&&!s.ss)keys.delete('atk');
    if(t.character==='申鹤'&&(!normal||ele!=='cryo'))keys.delete('atk');
    if(t.character==='云堇'&&(!normal||!/普攻|普通攻击|N1/.test(s.title)))keys.delete('def');
    if(t.character==='白术'&&!['bloom','hyperBloom','burgeon','burning','spread','aggravate','lunarBloom'].includes(s.rx))keys.delete('hp');
    if(t.character==='妮露'&&s.rx!=='bloom')keys.delete('hp');
    if(t.character==='菈乌玛'&&!['bloom','hyperBloom','burgeon','lunarBloom'].includes(s.rx))keys.delete('mastery');
    if(t.character==='哥伦比娅'&&!s.moon&&cons<2)keys.delete('hp');
    if(t.character==='莉奈娅'&&s.rx!=='lunarCrystallize'&&!g.GTeam?.MOON.includes(c.character))keys.delete('def');
    if(t.character==='叶洛亚'&&s.rx!=='lunarCrystallize'&&ele!=='geo')keys.delete('mastery');
    if(t.character==='阿贝多'&&[c.character,...(c.teammates||[]).map(x=>x.character)].filter(k=>g.GTeam?.HEX.includes(k)).length<2)keys.delete('def');
    if(t.character==='梦见月瑞希'&&(cons<1||!['swirl','stellarSwirl'].includes(s.rx)||s.rx==='stellarSwirl'&&!s.indirect))keys.delete('mastery');
    if(['圣显之钥','漩流颂歌'].includes(t.weapon))keys.add('hp');
    if(['西福斯的月光','流浪的晚星','玛海菈的水色'].includes(t.weapon))keys.add('mastery');
    if(t.weapon==='岩峰巡歌')keys.add('def');if(t.weapon==='尘光七谕')keys.add('atk');
    return [...keys];
  }
  function talentInfo(config,index=null,scope='team'){
    const t=index===null?config:config.teammates?.[index],c=E.character(t?.character);if(!c)return null;
    const people=scope==='solo'?[E.character(config.character)]:[E.character(config.character),...(config.teammates||[]).map(x=>E.character(x.character))].filter(Boolean),els=new Set(people.map(x=>x.element));
    const training=people.some(x=>x.key==='丝柯克')&&people.every(x=>['hydro','cryo'].includes(x.element))&&els.has('hydro')&&els.has('cryo');
    const extra={a:people.some(x=>x.key==='达达利亚')?1:0,e:training?1:0};
    if(index===null&&scope==='solo'&&c.key==='丝柯克'&&config.metricSettings?.talentMode!=='actual')extra.e=1;
    if(c.key==='洛恩'){const state=index===null?{...(g.GMetrics?.defaultStates(config)||config.conditions||{}),...(g.GMetrics?.settings(config)?.states||config.metricSettings?.states||{})}:{lohenHighSpirits:config.supportMode==='full'||t.lohenHighSpirits};if(state.lohenHighSpirits)extra.e+=1;}
    const tc={...t,extraTalent:extra},levels=E.talentFor(c,tc).talentLevel,base=Object.fromEntries(['a','e','q'].map(k=>[k,num(t.talents?.[k],index!==null&&k==='a'?1:10)]));
    return {base,levels,uplift:Object.fromEntries(['a','e','q'].map(k=>[k,levels[k]-base[k]]))};
  }
  function effects(ctx){
    const {config,c,t,primary,cons,name,T,add,addFlat,elementBonus,stellarBonus,need,eligible,onField,castE,castQ,active,moonsign,hex,count,notes,flat,limitedReaction}=ctx,s=scene(config),nEnemies=Math.max(1,num(config.conditions?.enemyCount,1)),cryoReaction=!!count.cryo&&(!!count.pyro||!!count.hydro||!!count.electro||!!count.anemo)||s.star;
    switch(name){
      case '阿罗夏':if(onField&&(castE||castQ)){const n=cons>=6?2:1;add('atkPct',T('e','猎者之准攻击力提升')*n,name+'猎者之准 '+n+'层');if(s.sc)add('stellarConduct',20*n,name+'辉映·星超导');if(cons>=6)add('mastery',100,name+'C6双层');}break;
      case '艾梅莉埃':if(cons>=2&&(castE||castQ))add('res_dendro',30,name+'C2');break;
      case '爱诺':if(onField&&(castE||castQ)){if(cons>=1)add('mastery',80,name+'C1');if(cons>=6&&castQ)for(const k of ['electroCharged','bloom','lunarCharged','lunarBloom','lunarCrystallize'])add(k,moonsign===2?35:15,name+'C6');}break;
      case '八重神子':if(cons>=1&&s.sc){elementBonus('electro',50,name+'C1超导/星超导');add('stellarConduct',50,name+'C1');}if(cons>=2&&castE&&onField)add('mastery',200,name+'C2四阶杀生樱');if(cons>=4&&castQ)elementBonus('electro',20,name+'C4');break;
      case '芭芭拉':if(cons>=2&&castE&&onField)elementBonus('hydro',15,name+'C2');break;
      case '白术':if(castQ){const hp=Math.min(50000,need(t,'hp'));for(const k of ['burning','bloom','hyperBloom','burgeon'])add(k,hp*.002,name+'在地为化');for(const k of ['aggravate','spread'])add(k,hp*.0008,name+'在地为化');add('lunarBloom',hp*.0007,name+'在地为化');if(cons>=4)add('mastery',80,name+'C4');}break;
      case '布伦妮':if(castE||castQ){const v=Math.min(50,Math.max(0,eligible(t,'atk','pruneA4')-2000)*.025);for(const k of ['aDmg','a2Dmg','a3Dmg','eDmg','qDmg'])add(k,v,name+'鼓舞');if(cons>=6&&onField)add('atkPlus',350,name+'C6');}break;
      case '杜林':if(castQ){const ele=primary.element,eligible=['dendro','electro','anemo','geo'].filter(e=>count[e]);if(eligible.length){add('res_pyro',hex?35:20,name+'白龙祝福');for(const e of eligible)add('res_'+e,hex?35:20,name+'白龙祝福');}if(cons>=1&&onField)addFlat(t,'all',need(t,'atk')*.6,20,{skills:['a','a2','a3','e','q']});if(cons>=2){elementBonus('pyro',50,name+'C2白龙');if(['hydro','cryo','electro','dendro','anemo','geo'].includes(ele))elementBonus(ele,50,name+'C2反应');}if(cons>=6)add('enemyDef',30,name+'C6白龙');}break;
      case '法尔伽':if(cons>=4&&(castE||castQ)){elementBonus('anemo',20,name+'C4');elementBonus(t.element,20,name+'C4扩散元素');}break;
      case '菲谢尔':if(hex&&t.homework&&castE&&onField){if(count.pyro)add('atkPct',cons>=6?45:22.5,name+'秘仪超载');if(count.hydro)add('mastery',cons>=6?180:90,name+'秘仪感电/月感电');}break;
      case '卡齐娜':if(cons>=4&&castQ&&onField)add('defPct',[8,12,16,20][Math.min(4,nEnemies)-1],name+'C4 '+nEnemies+'名敌人');break;
      case '柯莱':case '蓝砚':if(cons>=4&&castQ)add('mastery',60,name+'C4');break;
      case '莱依拉':if(cons>=4&&castE)addFlat(t,'normal',need(t,'hp')*.05,1,{skills:['a','a2']});break;
      case '雷泽':if(cons>=4&&castE)add('enemyDef',15,name+'C4点按E');break;
      case '林尼':if(cons>=4&&active)add('res_pyro',20,name+'C4火重击');break;
      case '琳妮特':if(castQ)add('atkPct',[8,12,16,20][Math.min(4,Object.keys(count).length)-1],name+'巧施协同');break;
      case '鹿野院平藏':if(castE)add('mastery',80,name+'因由勘破');break;
      case '旅行者·草':if(castQ&&onField){add('mastery',60,name+'十层草灯');if(cons>=6){elementBonus('dendro',12,name+'C6');if(['hydro','electro','pyro'].includes(t.element))elementBonus(t.element,12,name+'C6莲光转化');}}break;
      case '旅行者·风':if(castQ&&cons>=6){add('res_anemo',20,name+'C6');add('res_'+t.element,20,name+'C6元素转化');}break;
      case '旅行者·火':if(castE&&cons>=1&&onField)add('allDmg',g.GTeam.NIGHTS.includes(primary.key)?15:6,name+'C1');break;
      case '旅行者·雷':if(castE)add('recharge',20+need(t,'recharge')*.1,name+'E勾玉与天赋');if(castQ&&cons>=2)add('res_electro',15,name+'C2');break;
      case '旅行者·岩':if(castQ&&cons>=1&&onField)add('cpct',10,name+'C1岩嶂');break;
      case '洛恩':if(castE&&cryoReaction)add('atkPct',15,name+'冰相关反应');if(cons>=2&&active)add('mastery',200,name+'C2');break;
      case '玛薇卡':if(castQ&&onField)add('allDmg',cons>=4?50:40,name+'Q满200战意'+(cons>=4?' C4':'初始时点'));if(castE&&cons>=2)add('enemyDef',20,name+'C2火环');break;
      case '米卡':if(castE&&onField){const cap=cons>=6?5:4,n=Math.min(cap,Math.max(0,nEnemies-1)+1+(cons>=2?1:0));elementBonus('physical',n*10,name+'侦明 '+n+'层（'+nEnemies+'目标）');if(cons>=6)add('cdmg_physical',60,name+'C6');notes.push(name+'攻速不增加固定段数指标的命中数');}break;
      case '妮露':if(Object.keys(count).every(e=>['hydro','dendro'].includes(e))&&count.hydro&&count.dendro&&castE){const golden=nilouGoldenState(config,t);if(golden.active)add('mastery',100,name+'金杯');else notes.push(name+'金杯：'+golden.reason);add('bloom',Math.min(400,Math.max(0,need(t,'hp')-30000)*.009),name+'丰穰之核');if(cons>=2){add('res_hydro',35,name+'C2');add('res_dendro',35,name+'C2');}}break;
      case '欧洛伦':if(cons>=6&&active&&onField)add('atkPct',30,name+'C6三层');break;
      case '绮良良':if(cons>=6&&(castE||castQ))add('allElementDmg',12,name+'C6');break;
      case '托马':if(cons>=6&&castQ)for(const k of ['aDmg','a2Dmg','a3Dmg'])add(k,15,name+'C6');break;
      case '温迪':if(cons>=2&&castE){add('res_anemo',24,name+'C2');add('res_physical',24,name+'C2');}if(cons>=4&&onField&&(castE||castQ))elementBonus('anemo',25,name+'C4');if(cons>=6&&castQ){add('res_anemo',20,name+'C6');add('res_'+t.element,20,name+'C6转化');}if(hex&&t.homework&&castQ&&(primary.element==='anemo'||s.ss))add('allDmg',50,name+'秘仪当前主C扩散');break;
      case '希格雯':if(castE&&onField===false)addFlat(t,'e',Math.min(cons>=1?3500:2800,Math.max(0,need(t,'hp')-30000)*(cons>=1?.1:.08)),10);if(cons>=2&&(castE||castQ))add('res_hydro',35,name+'C2');break;
      case '闲云':if(castQ&&onField){add('a3Cpct',[4,6,8,10][Math.min(4,nEnemies)-1],name+'霜翎 '+nEnemies+'目标');addFlat(t,'a3',Math.min(cons>=2?18000:9000,need(t,'atk')*(cons>=2?4:2)),8,{plungeImpactOnly:true});}break;
      case '宵宫':if(castQ)add('atkPct',20,name+'Q满袖火');break;
      case '雅珂达':if(castQ&&onField&&num(config.conditions.currentHpPct,100)>70)add('mastery',100,name+'Q治疗后生命高于70%');if(cons>=6&&castE&&moonsign===2&&g.GTeam.MOON.includes(primary.key)){add('cpct',5,name+'C6满辉月兆角色');add('cdmg',40,name+'C6满辉月兆角色');}break;
      case '瑶瑶':if(cons>=1&&castE&&onField)elementBonus('dendro',15,name+'C1');break;
    }
    if(name==='甘雨'){if(cons>=1&&active)add('res_cryo',15,name+'C1');if(cons>=4&&castQ)add('allDmg',25,name+'C4领域12秒满层');}
    if(name==='赛诺'&&s.sc&&cons>=1&&active&&onField){add('mastery',200,name+'C1继承启途');if(cons>=2)add('stellarConduct',80,name+'C2继承者普重已触发五层');}
    if(name==='七七'&&castE){if(s.sc){add('superConduct',50,name+'七宝奉真·星超导');add('stellarConduct',50,name+'七宝奉真·星超导');}if(s.ss)for(const k of ['swirlCryo','stellarSwirl','stellarVortex'])add(k,50,name+'七宝奉真·星扩散');if(cons>=6&&castQ&&onField)addFlat(t,'reaction',need(t,'atk')*6,4,{reactions:['stellarConduct','stellarSwirl'],directOnly:true});}
    if(name==='多莉'&&cons>=4&&castQ&&num(config.conditions.currentEnergyPct,100)<50)add('recharge',30,name+'C4当前能量低于50%');
    if(name==='莫娜'&&hex&&t.homework&&active)limitedReaction({source:name,title:'水星天三层，仅下一次蒸发',reaction:'vaporize',value:15,quota:1});
    if(name==='梦见月瑞希'&&cons>=1&&active&&['swirl','stellarSwirl'].includes(s.rx))addFlat(t,'reaction',need(t,'mastery')*(s.rx==='swirl'?11:5.5),1,{reactions:[s.rx],residualMark:true,indirectOnly:s.rx==='stellarSwirl'});
    if(neutral.includes(name))notes.push(name+'：'+(name==='丝柯克'?'诸武相授按真实全水冰资格计算':name==='卡维'||name==='梦见月瑞希'?'本人站场状态不与前台主C同时计入':name==='莱欧斯利'||name==='塔利雅'?'攻速不增加当前固定命中数':'角色本体无额外共享伤害数值；仍计算已选武器、套装及共鸣'));
  }
  g.GSupport={fixed,neutral,extraInputs,scene,preset,inputs,talentInfo,effects,reactionElement,nilouGoldenState};
  if(typeof module!=='undefined')module.exports=g.GSupport;
})(typeof globalThis!=='undefined'?globalThis:this);
