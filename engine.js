/* Damage engine. Character functions are MIT adapters; common multipliers follow the pinned sources. */
(function (global) {
  'use strict';
  const DATA=global.GDATA, RULES=global.GRULES;
  if(typeof require==='function'&&!global.GCharacterFixes)require('./characters.js');
  const ELEMENT={pyro:'火',hydro:'水',cryo:'冰',electro:'雷',dendro:'草',anemo:'风',geo:'岩',physical:'物理'};
  const WEAPON={sword:'单手剑',claymore:'双手剑',polearm:'长柄武器',bow:'弓',catalyst:'法器'};
  const ROLLS=Object.fromEntries(Object.entries(DATA.substatTiers).map(([k,v])=>[k,Number((v.reduce((a,b)=>a+b,0)/v.length).toFixed(8))]));
  const MAX_ROLLS=Object.fromEntries(Object.entries(DATA.substatTiers).map(([k,v])=>[k,Math.max(...v)]));
  const LABELS={atkPct:'攻击力%',hpPct:'生命值%',defPct:'防御力%',mastery:'元素精通',cpct:'暴击率',cdmg:'暴击伤害',recharge:'元素充能效率',atkPlus:'固定攻击力',hpPlus:'固定生命值',defPlus:'固定防御力',dmg:'元素伤害加成',allDmg:'通用伤害加成',allElementDmg:'所有元素伤害加成',masteryBorrowed:'不可再次转化的精通分享',rechargeBorrowed:'只计回能的充能分享',atkBorrowed:'不可再次转化的攻击分享',defBorrowed:'不可再次转化的防御分享',phy:'物理伤害加成',heal:'治疗加成'};
  const MAIN={atkPct:46.6,hpPct:46.6,defPct:58.3,mastery:186.5,recharge:51.8,dmg:46.6,phy:58.3,cpct:31.1,cdmg:62.2,heal:35.9};
  for(const ele of ['pyro','hydro','cryo','electro','anemo','geo','dendro']){MAIN['dmg_'+ele]=46.6;LABELS['dmg_'+ele]=ELEMENT[ele]+'元素伤害加成';}
  const ALIAS={'蒸发':'vaporize','融化':'melt','蔓激化':'spread','超激化':'aggravate','扩散':'swirl','感电':'electroCharged','月感电':'lunarCharged','月绽放':'lunarBloom','月结晶':'lunarCrystallize','星超导':'stellarConduct','星扩散':'stellarSwirl','星辉冰旋':'stellarVortex'};
  const RX_ELEMENT={burning:'pyro',overloaded:'pyro',superConduct:'cryo',electroCharged:'electro',shatter:'physical',bloom:'dendro',hyperBloom:'dendro',burgeon:'dendro',lunarCharged:'electro',lunarBloom:'dendro',lunarCrystallize:'geo',stellarConduct:'cryo',stellarSwirl:'anemo',stellarVortex:'cryo'};
  const TRANSFORM={burning:0.25,overloaded:2.75,superConduct:1.5,electroCharged:2,shatter:3,swirl:0.6,bloom:2,hyperBloom:3,burgeon:3};
  const SPECIAL=new Set(['lunarCharged','lunarBloom','lunarCrystallize','stellarConduct','stellarSwirl','stellarVortex']);
  const REACTIVE=new Set([...Object.keys(TRANSFORM),'vaporize','melt','aggravate','spread']);
  const PART_KEYS=['atk','hp','def','mastery','recharge','cpct','cdmg','dmg','phy','coloringDmg','heal','shield'];
  const SKILLS=['a','a2','a3','e','e2','q','q2','q3','nightsoul','fy'];
  const defaultWeapon={sword:'天目影打刀',claymore:'试作古华',polearm:'「渔获」',bow:'试作澹月',catalyst:'流浪乐章'};
  const signatures={'那维莱特':'万世流涌大典','胡桃':'护摩之杖','艾尔海森':'裁叶萃光','兹白':'朏魄含光','菲林斯':'血染荒城','雷电将军':'薙草之稻光','诺艾尔':'白影剑','荒泷一斗':'赤角石溃杵','玛薇卡':'焚曜千阳','丝柯克':'苍耀','阿蕾奇诺':'赤月之形','珊瑚宫心海':'不灭月华','奈芙尔':'真语秘匣'};
  const clone=o=>JSON.parse(JSON.stringify(o));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const num=(x,d=0)=>Number.isFinite(Number(x))?Number(x):d;
  const STATE_FIELDS={
    characters:{
      '胡桃':[['hutaoSkillActive','蝶引来生E状态仍有效','bool'],['hutaoC6Active','C6百蝶触发后的10秒仍有效','bool']],
      '艾尔海森':[['haithamC2Stacks','C2产生镜后有效层数',0,4],['haithamC4Generated','C4当前增益对应产生镜数',0,3],['haithamC6Active','C6双暴效果仍有效','bool']],
      '雷电将军':[['raidenEyeActive','雷罚恶曜之眼已生效','bool']],
      '玛拉妮':[['mualaniWaveStacks','鲨咬当前浪势层数',0,3],['mualaniWaveWisdom','本次Q消耗逐浪心得层数',0,3],['mualaniFirstBite','C1首次巨浪已满足','bool']],
      '兹白':[['zibaiShiftActive','月转时隙状态有效','bool'],['zibaiMoonfallActive','太阴降后4秒增伤有效','bool'],['zibaiC4Splendor','本次第四击拥有月涣华','bool'],['zibaiRadianceSpent','C6本次消耗时隙浮光',70,100],['zibaiC6Active','C6擢升的3秒效果有效','bool']],
      '奈芙尔':[['neferShadowDanceActive','C4影舞降草抗仍有效','bool']],
      '菲林斯':[['flinsC2ShredActive','C2命中后7秒减雷抗有效','bool']],
      '恰斯卡':[['chascaShadowStacks','实际焕影之灵层数',0,3],['chascaC6OnslaughtActive','C6下一轮瞄准效果有效','bool']],
      '基尼奇':[['kinichHunterStacks','本炮消耗猎人心得层数',0,2],['kinichC2ShredActive','C2命中后6秒减草抗有效','bool']],
      '瓦雷莎':[['nightsoulBursts','当前夜魂迸发攻击层数',0,2],['varesaRainbowAvailable','本次坠地可用虹色坠击','bool'],['varesaC4PlungeAvailable','本次坠地可用C4平铺','bool'],['varesaC4BurstEligible','本次Q处于炽热/极限','bool']]
    },
    weapons:{
      '超越之匙':[['transcendenceStacks','超越之匙：5秒内有效层数',0,3]],
      '飞雷之弦振':[['thunderingStacks','飞雷：当前有效飞雷之巴印层数',0,3]],
      '万世流涌大典':[['tomeHpStacks','专武当前生命变化层数',0,3]],'冲浪时光':[['surfingStacks','专武当前夏日灼景层数',0,4]],
      '裁叶萃光':[['foliarActive','裁叶效果已触发且未超时','bool'],['foliarResources','裁叶剩余生效次数',0,28]],
      '薙草之稻光':[['engulfingBurstActive','薙草Q后12秒充能有效','bool']],
      '朏魄含光':[['lightbearingSkillActive','专武E后5秒效果有效','bool']],
      '真语秘匣':[['trueWordSkillActive','专武E后12秒精通有效','bool'],['trueWordLunarActive','专武月绽后4秒暴伤有效','bool']],
      '血染荒城':[['bloodBurstActive','专武Q后3.5秒月伤有效','bool'],['bloodLunarActive','专武月感电后6秒暴伤有效','bool']],
      '星鹫赤羽':[['plumageSwirlActive','专武扩散后12秒攻击有效','bool']],
      '山王长牙':[['mountainStacks','专武悬木祝赐当前层数',0,6]],
      '溢彩心念':[['vividPlungeActive','专武下落触发暴伤有效','bool'],['vividSkillBurstActive','专武E/Q触发暴伤有效','bool']],
      '苍耀':[['azureSkillActive','专武E后12秒效果有效','bool'],['energyZero','当前元素能量为0','bool']],
      '雾切之回光':[['mistsplitterStacks','当前雾切印记层数',0,3]],
      '赤沙之杖':[['scarletStacks','当前赤沙之梦层数',0,3]],
      '狼的武功歌':[['wolfSongStacks','狼的武功歌实际四风诗系层数',0,4]],
      '流浪乐章':[['widsithMode','当前乐章曲目','select',[['off','未触发 / 已结束'],['atk','宣叙调：攻击'],['dmg','咏叹调：元素伤'],['em','间奏曲：精通']]]]
    },
    sets:{
      '影中沉凝的幻灭':[['shadowAffected','目标受超导/星超导影响','bool']],
      '追忆之注连':[['shimenawaActive','追忆：已消耗15能量，10秒效果有效','bool']],
      '谐律异想断章':[['harmonicStacks','谐律当前有效层数',0,3]],
      '冰风迷途的勇士':[['blizzardMode','冰套目标状态','select',[['off','未受冰影响'],['cryo','冰附着：20%暴率'],['frozen','冻结：40%暴率']]]],
      '饰金之梦':[['gildedActive','饰金反应后8秒效果有效','bool']],
      '炽烈的炎之魔女':[['crimsonStacks','魔女当前E叠层',0,3]],'逐影猎人':[['marechausseeStacks','逐影当前生命变化层数',0,3]],
      '黑曜秘典':[['obsidianActive','已消耗夜魂，6秒暴率有效','bool']],
      '长夜之誓':[['longNightStacks','长夜当前永明流辉层数',0,5]],
      '深廊终曲':[['energyZero','当前元素能量为0','bool'],['finaleNormalActive','终曲普攻加成当前有效','bool'],['finaleBurstActive','终曲爆发加成当前有效','bool']],
      '穹境示现之夜':[['gleamYearningActive','在场月反应后4秒暴率有效','bool']],
      '纺月的夜歌':[['gleamDevotionActive','元素伤害命中后8秒精通有效','bool']],
      '回声之林夜话':[['whispersSkillActive','E后10秒岩伤有效','bool'],['whispersShieldActive','结晶盾/月笼额外岩伤仍有效','bool']],
      '华馆梦醒形骸记':[['huskStacks','华馆当前问答层数',0,4]],
      '辰砂往生录':[['vermillionBurstActive','Q后16秒潜光且角色在场','bool'],['vermillionStacks','当前生命降低层数',0,4]],
      '未竟的遐思':[['unfinishedDmg','当前遐思实际加伤 %',0,50]],
      '花海甘露之光':[['vourukashaStacks','花海当前受伤层数',0,5]],
      '深林的记忆':[['deepwoodActive','E/Q命中后8秒减草抗有效','bool']],
      '风起之日':[['windRisingActive','命中后6秒风与牧歌增益有效','bool']],
      '天之美赐':[['celestialActive','已完成课业且E后20秒天光之引有效','bool']],
      '烬城勇者绘卷':[['scrollActive','烬城反应的12%增伤仍有效','bool'],['scrollNightsoulActive','夜魂反应额外28%仍有效','bool'],['scrollElements','烬城本次反应涉及元素','elements']],
      '昔时之歌':[['songHealing','套装本轮记录治疗量',0,15000],['songResources','当前余音剩余次数',0,5],['songActive','六秒记录结束，余音已生效','bool']]
    }
  };
  function stateFields(config){const fields=[...(STATE_FIELDS.characters[config.character]||[]),...(STATE_FIELDS.weapons[config.weapon]||[]),...(global.GCharacterFixes?.fields(config)||[]),...((config._metric||config.metricSettings)?global.GMetrics?.extraFields(config)||[]:[])];for(const s of config.sets||[])if(s.count>=4)fields.push(...STATE_FIELDS.sets[s.name]||[]);return [...new Map(fields.map(f=>[f[0],f])).values()];}
  class Stat {constructor(base=0,plus=0,pct=0){this.base=base;this.plus=plus;this.pct=pct;this.inc=0;} valueOf(){return this.base*(1+this.pct/100)+this.plus;} toString(){return String(this.valueOf());}}
  const calc=x=>x instanceof Stat?x.valueOf():num(x);
  const character=k=>DATA.characters.find(c=>c.key===k);
  function getStats(c,level=90) {
    const precise=c.rawStats?.[String(level)];
    if(precise)return {hpBase:precise.baseHP,atkBase:precise.baseAtk,defBase:precise.baseDEF,[precise.growth.key]:precise.growth.value};
    const values=c.stats?.details?.[String(level)];
    if(!values) throw new Error('没有该角色等级的基础数据，请选择数据中列出的等级。');
    return Object.fromEntries(c.stats.keys.map((k,i)=>[k,values[i]]));
  }
  function talentFor(c,config) {
    const result={},levels={};
    for(const k of ['a','e','q']) {
      const uplift=c.talentCons?.[k]>0 && config.cons>=c.talentCons[k]?3:0;
      const level=clamp(num(config.talents?.[k],10)+uplift+num(config.extraTalent?.[k]),1,15);levels[k]=level;
      const source=config.travelerGender==='male'&&c.talentMale?c.talentMale:c.talent;
      result[k]=Object.fromEntries(Object.entries(source?.[k]||{}).map(([name,list])=>[name,list[Math.min(level-1,list.length-1)]]));
    }
    result.talentLevel=levels; return result;
  }
  function getWeapon(config,c) {
    if(config.weapon==='custom') return {name:'自定义武器',type:c.weapon,base:num(config.customWeapon?.base,510),bonusKey:config.customWeapon?.bonusKey||'none',bonus:num(config.customWeapon?.bonus),refine:config.refine||1};
    const w=DATA.weapons.find(w=>w.name===config.weapon && w.type===c.weapon);
    if(!w) throw new Error('武器与角色武器类型不匹配。');
    const level=w.maxLevel||90;
    return {...w,level,base:w.rawStats?.baseAtk??w.attr.atk[String(level)],bonusKey:w.rawStats?.bonusKey??w.attr.bonusKey,bonus:w.rawStats?.bonus??w.attr.bonusData?.[String(level)]??0,refine:config.refine||1};
  }
  function rollUnits(config,normalized=true) {
    const raw={...(config.customUnits|| (config.rollQuality==='max'?MAX_ROLLS:ROLLS))};
    if(!normalized||config.normalizedBudget===false)return raw;
    const c=character(config.character),base=getStats(c,90),w=getWeapon(config,c);
    return {...raw,atkPlus:(base.atkBase+w.base)*raw.atkPct/100,hpPlus:base.hpBase*raw.hpPct/100,defPlus:base.defBase*raw.defPct/100};
  }
  function rollCosts(config) {const raw=rollUnits(config,false),normalized=rollUnits(config,true);return Object.fromEntries(Object.keys(raw).map(k=>[k,raw[k]/normalized[k]]));}
  const step=(v,inc=v/4)=>[0,1,2,3,4].map(i=>v+i*inc);
  const staticStep=(key,value,inc=value/4)=>({title:'常驻'+(LABELS[key]||key),isStatic:true,refine:{[key]:step(value,inc)}});
  const weaponCache={};
  function weaponBuffs(w) {
    if(w.name==='自定义武器') return [];
    if(!weaponCache[w.type]) weaponCache[w.type]=global.GWEAPONS[w.type](step,staticStep);
    const list=weaponCache[w.type][w.name]||[];
    const result=(Array.isArray(list)?list:[list]).map((b,i)=>{
      b={...b,id:'weapon:'+i,data:{...(b.data||{}),...Object.fromEntries(Object.entries(b.refine||{}).map(([k,values])=>[k,values[(w.refine||1)-1]*(b.buffCount||1)]))}};
      const refine=(w.refine||1)-1;
      if(w.name==='千夜浮梦'){b.title='千夜浮梦：按实际其他队友的同/异元素人数计算';b.data={mastery:({params})=>step(32,8)[refine]*params.mArtisSameCount,dmg:({params})=>step(10,4)[refine]*params.mArtisDiffCount};}
      if(w.name==='最初的大魔术'&&b.data.atkPct!==undefined)b.data.atkPct=({params})=>[16,20,24,28,32][refine]*Math.min(3,1+params.mArtisSameCount);
      if(['千岩长枪','千岩古剑'].includes(w.name)){b.title='千岩武器：按实际璃月角色数计算';b.data={atkPct:({params})=>[7,8,9,10,11][refine]*params.liyueCount,cpct:({params})=>[3,4,5,6,7][refine]*params.liyueCount};}
      if(w.name==='峡湾长歌')b.check=({params})=>params.partyElements>=3;
      if(w.name==='碎链'){b.data.atkPct=({params})=>[4.8,6,7.2,8.4,9.6][refine]*params.mArtisDiffCount;b.data.mastery=({params})=>params.mArtisDiffCount>=3?step(24)[refine]:0;}
      if(w.name==='星鹫赤羽'&&b.data.a2Dmg!==undefined)b.check=({params})=>params.partyElements>=3;
      if(w.name==='悬黎千钧'){b.data.mastery=({params})=>step(64)[refine]*params.mArtisSameCount;b.data.atkPct=({params})=>step(12)[refine]*params.mArtisDiffCount;}
      if(w.name==='西福斯的月光'&&b.data.recharge){b.data.rechargeBorrowed=b.data.recharge;delete b.data.recharge;}
      if(['流浪的晚星','玛海菈的水色','赤沙之杖'].includes(w.name)&&b.data.atkPlus){b.data.atkBorrowed=b.data.atkPlus;delete b.data.atkPlus;}
      if(w.name==='护摩之杖'&&/低于50%/.test(b.title||''))b.check=({params})=>params.currentHpPct<50;
      if(w.name==='黎明神剑')b.check=({params})=>params.currentHpPct>90;
      if(w.name==='万世流涌大典'&&!b.isStatic)b.data.a2Dmg=({params})=>[14,18,22,26,30][refine]*params.tomeHpStacks;
      if(w.name==='冲浪时光'&&!b.isStatic)b.data.aDmg=({params})=>step(12)[refine]*params.surfingStacks;
      if(w.name==='裁叶萃光'&&!b.isStatic)b.data={};
      if(w.name==='薙草之稻光'&&b.data.rechargePlus!==undefined)b.check=({params})=>params.engulfingBurstActive===true;
      if(w.name==='赤月之形')b.data.dmg=({params})=>params.BondOfLife>=30?step(36,12)[refine]:params.BondOfLife>0?step(12,4)[refine]:0;
      if(w.name==='朏魄含光'&&!b.isStatic)b.check=({params})=>params.lightbearingSkillActive===true;
      if(w.name==='真语秘匣'&&!b.isStatic)b.data={mastery:({params})=>params.trueWordSkillActive?step(80)[refine]*(params.trueWordLunarActive?1.5:1):0,cdmg:({params})=>params.trueWordLunarActive?step(24)[refine]*(params.trueWordSkillActive?1.5:1):0};
      if(w.name==='血染荒城')b.data={lunarCharged:({params})=>params.bloodBurstActive?[36,48,60,72,84][refine]:0,cdmg:({params,element})=>params.bloodLunarActive&&['水','雷','风'].includes(element)?step(28)[refine]:0};
      if(w.name==='星鹫赤羽'){
        if(b.data.atkPct!==undefined)b.check=({params})=>params.plumageSwirlActive===true;
        else{b.check=()=>true;b.data={a2Dmg:({params})=>[0,step(20)[refine],step(48)[refine]][Math.min(2,params.mArtisDiffCount)],qDmg:({params})=>[0,step(10)[refine],step(24)[refine]][Math.min(2,params.mArtisDiffCount)]};}
      }
      if(w.name==='山王长牙')b.data={eDmg:({params})=>step(10)[refine]*params.mountainStacks,qDmg:({params})=>step(10)[refine]*params.mountainStacks};
      if(w.name==='溢彩心念'&&!b.isStatic)b.data={a3Cdmg:({params})=>(params.vividPlungeActive?step(28)[refine]:0)+(params.vividSkillBurstActive?step(40)[refine]:0)};
      if(w.name==='苍耀')b.data={atkPct:({params})=>params.azureSkillActive?step(24)[refine]*(params.energyZero?2:1):0,cdmg:({params})=>params.azureSkillActive&&params.energyZero?step(40)[refine]:0};
      if(w.name==='雾切之回光'&&!b.isStatic){b.data={};b.data.dmg=({params})=>[0,step(8)[refine],step(16)[refine],step(28)[refine]][params.mistsplitterStacks];}
      if(w.name==='赤沙之杖')b.data={atkBorrowed:({attr,calc,params})=>(step(52)[refine]+step(28)[refine]*params.scarletStacks)*calc(attr.mastery)/100};
      if(w.name==='流浪乐章')b.data={atkPct:({params})=>params.widsithMode==='atk'?step(60)[refine]:0,allElementDmg:({params})=>params.widsithMode==='dmg'?step(48)[refine]:0,mastery:({params})=>params.widsithMode==='em'?step(240)[refine]:0};
      if(w.name==='超越之匙'&&!b.isStatic)b.data={stellarConduct:({params})=>step(16)[refine]*params.transcendenceStacks,stellarSwirl:({params})=>step(16)[refine]*params.transcendenceStacks};
      if(w.name==='飞雷之弦振'&&b.data.aDmg!==undefined)b.data.aDmg=({params})=>[0,step(12)[refine],step(24)[refine],step(40)[refine]][params.thunderingStacks];
      if(w.name==='狼的武功歌')b.data={allDmg:({params})=>step(7.5,2)[refine]*params.wolfSongStacks,cdmg:({params})=>params.Hexenzirkel?step(7.5,2)[refine]*params.wolfSongStacks:0};
      if(b.data.dmg!==undefined){
        const key=w.name==='雾切之回光'&&!b.isStatic?'nativeDmg':w.name==='霜结的誓金枝'?'dmg_geo':w.name==='烈阳之嗣'?'a2Dmg':/元素伤害|全元素|元素反应加成/.test(b.title||'')?'allElementDmg':'allDmg';
        b.data[key]=b.data.dmg;delete b.data.dmg;
      }
      if(w.name==='风鹰剑'){delete b.data._atkPct;b.isStatic=true;}
      return b;
    });
    if(w.name==='若水')result.push({id:'weapon:permanent-hp',title:'若水常驻生命提升',isStatic:true,data:{hpPct:step(16)[w.refine-1]}});
    return result;
  }
  function artifactBuffs(config) {
    const sets=Array.isArray(config.sets)?config.sets:[];const result=[];
    for(const s of sets) {
      const rules=global.GARTIFACTS[s.name];if(!rules)continue;
      for(const count of [2,4]) if(s.count>=count && rules[count]) {
        for(let b of (Array.isArray(rules[count])?rules[count]:[rules[count]])) {
          b={...b,data:{...(b.data||{})}};
          if(s.name==='黄金剧团'&&count===4)b.data.eDmg=({params})=>params.off_field||params.goldenGrace?50:25;
          if(s.name==='晨星与月的晓歌'&&count===4)b.check=({params})=>params.off_field===true;
          if(s.name==='风起之日'&&count===4)b.data={atkPct:({params})=>params.windRisingActive?25:0,cpct:({params})=>params.windRisingActive&&params.homework?20:0};
          if(s.name==='天之美赐'&&count===4)b.data={nativeDmg:({params})=>params.celestialActive&&params.homework?(params.Hexenzirkel?40:20):0};
          if(s.name==='饰金之梦'&&count===4)b.data={mastery:({params})=>params.gildedActive?50*params.mArtisDiffCount:0,atkPct:({params})=>params.gildedActive?14*params.mArtisSameCount:0};
          if(s.name==='逐影猎人'&&count===4)b.data={cpct:({params})=>12*params.marechausseeStacks};
          if(s.name==='影中沉凝的幻灭'&&count===4){delete b.check;b.data={superConduct:80,stellarConduct:40,cpct:({params})=>params.shadowAffected?16:0};}
          if(s.name==='谐律异想断章'&&count===4){delete b.check;b.data={allDmg:({params})=>18*params.harmonicStacks};}
          if(s.name==='追忆之注连'&&count===4)b.check=({params})=>params.shimenawaActive===true;
          if(s.name==='冰风迷途的勇士'&&count===4){delete b.check;b.data={cpct:({params})=>params.blizzardMode==='frozen'?40:params.blizzardMode==='cryo'?20:0};}
          if(s.name==='炉火融炼之心'&&count===4){const old=b.data.stellarConduct;if(old!==undefined)b.data.stellarSwirl=old;}
          if(s.name==='炽烈的炎之魔女'&&count===4){delete b.elem;b.data={dmg_pyro:({params})=>7.5*params.crimsonStacks,vaporize:15,melt:15,overloaded:40,burning:40,burgeon:40};}
          if(s.name==='黑曜秘典'&&count===4){b.check=({params})=>params.obsidianActive;b.data={cpct:40};}
          if(s.name==='黑曜秘典'&&count===2)b.check=({params})=>params.Nightsoul&&!params.off_field;
          if(s.name==='长夜之誓'&&count===4)b.data={a3Dmg:({params})=>15*params.longNightStacks};
          if(s.name==='深廊终曲'&&count===4)b.data={aDmg:({params})=>params.energyZero&&params.finaleNormalActive?60:0,qDmg:({params})=>params.energyZero&&params.finaleBurstActive?60:0};
          if(s.name==='穹境示现之夜'&&count===4){b.data.cpct=({params})=>params.gleamYearningActive&&!params.off_field?15*params.Moonsign:0;for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])b.data[rx]=({params})=>params.gleamYearningActive?10:0;}
          if(s.name==='纺月的夜歌'&&count===4){b.data.mastery=({params})=>params.gleamDevotionActive?60*params.Moonsign:0;for(const rx of ['lunarCharged','lunarBloom','lunarCrystallize'])b.data[rx]=({params})=>params.gleamDevotionActive?10:0;}
          if(s.name==='回声之林夜话'&&count===4)b.data={dmg_geo:({params})=>params.whispersSkillActive?(params.whispersShieldActive?50:20):0};
          if(s.name==='华馆梦醒形骸记'&&count===4)b.data={defPct:({params})=>6*params.huskStacks,dmg_geo:({params})=>6*params.huskStacks};
          if(s.name==='辰砂往生录'&&count===4)b.data={atkPct:({params})=>params.vermillionBurstActive&&!params.off_field?8+10*params.vermillionStacks:0};
          if(s.name==='未竟的遐思'&&count===4)b.data={allDmg:({params})=>params.unfinishedDmg};
          if(s.name==='花海甘露之光'&&count===4)b.data={eDmg:({params})=>10+8*params.vourukashaStacks,qDmg:({params})=>10+8*params.vourukashaStacks};
          if(s.name==='深林的记忆'&&count===4){delete b.elem;b.check=({params})=>params.deepwoodActive;b.data={res_dendro:30};}
          if(s.name==='昔时之歌'&&count===4)b.data={};
          if(s.name==='烬城勇者绘卷'&&count===4)b.data=Object.fromEntries(['pyro','hydro','cryo','electro','anemo','geo','dendro'].map(k=>['dmg_'+k,({params,characterName})=>params.scrollElements.includes(k)?(params.scrollActive?12:0)+(params.scrollNightsoulActive&&global.GTeam?.NIGHTS.includes(characterName)?28:0):0]));
          result.push({...b,id:'set:'+s.name+':'+count+':'+result.length,title:s.name+' '+count+'件：'+b.title,staticSet:count===2});
        }
      }
    }
    return result;
  }
  function selfBuffs(key) {
    const list=(RULES[key]?.buffs||[]).filter(b=>typeof b==='object').map((b,i)=>{
      b={...b,data:{...(b.data||{})},id:'self:'+i};const title=b.title||'';
      if(key==='那维莱特'&&title.includes('那维2命'))b.data.a2Cdmg=({params})=>14*params.neuvStacks;
      if(key==='那维莱特'&&title.includes('古海孑遗'))b.title='那维莱特古海孑遗：按实际反应层数计算独立倍率';
      if(key==='那维莱特'&&title.includes('至高仲裁'))b.data.dmg=({params})=>clamp((num(params.currentHpPct,100)-30)*.6,0,30);
      if(key==='胡桃'&&title.includes('半血'))b.check=({params})=>num(params.currentHpPct,50)<=50;
      if(key==='胡桃'&&title.includes('蝶引来生'))b.check=({params})=>params.hutaoSkillActive===true;
      if(key==='菲林斯'&&title.includes('菲林斯2命')){b.data={res_electro:25};}
      if(key==='菲林斯'&&title.includes('菲林斯2命'))b.check=({params})=>params.Moonsign>=2&&params.flinsC2ShredActive;
      if(key==='菲林斯'&&title.includes('菲林斯6命'))b.data={lunarChargedElevated:({params})=>35+(params.Moonsign>=2?10:0)};
      if(key==='薇斯纳'&&title.includes('每有一位')) {
        b.title='薇斯纳天赋：按设置的冰/风人数与其他元素人数计算攻击力和精通';
        b.data.atkPct=({params,cons})=>params.num1*(cons>=4?18:6);b.data.mastery=({params,cons})=>params.num2*(cons>=4?75:25);
        b.check=({params})=>params.vesnaRadiance===true;
      }
      if(key==='薇斯纳'&&title.includes('1命')){b.check=({params})=>params.vesnaArmed===true;b.data={stellarSwirl:20};}
      if(key==='薇斯纳'&&title.includes('2命'))b.check=({params})=>params.vesnaOrder===6;
      if(key==='薇斯纳'&&title.includes('6命'))b.data={stellarSwirlElevated:20};
      if(key==='丝柯克') {
        if(title.includes('汲取3枚')){b.title='丝柯克特殊Q尽：按吸收裂隙提升普攻伤害';b.data.aDmg=({talent,params})=>params.skirkSpecialQActive&&params.skirkWitherActive!==false?talent.q['汲取0/1/2/3枚虚境裂隙伤害提升'][params.skirkRifts]:0;}
        if(title.includes('3层死河渡断时')){b.title='丝柯克天赋：按设置的死河渡断层数计算独立倍率';b.data.aMulti=({params})=>[0,10,20,70][params.skirkStacks];b.data.qMulti=({params})=>[0,5,15,60][params.skirkStacks];}
        if(title.includes('蛇之狡谋超过50'))b.data.qPct=({talent,params,cons})=>params.skirkBurstBody?clamp(params.skirkSerpent-50,0,cons>=2?22:12)*talent.q['蛇之狡谋加成']:0;
        if(title.includes('丝柯克4命'))b.data.atkPct=({params})=>[0,10,20,40][params.skirkStacks];
      }
      if(key==='洛恩'&&title.includes('洛恩6命'))b.cons=6;
      if(key==='洛恩'&&title.includes('其他角色触发'))b.check=({params})=>params.lohenCryoReactionActive===true;
      if(key==='洛恩'&&title.includes('上限的50%'))b.check=({params})=>params.Hexenzirkel&&params.homework&&params['奇谋']&&params.lohenNormalBuffActive===true;
      if(key==='洛恩'&&title.includes('洛恩6命')){b.check=()=>true;b.data={eCdmg:175,qCdmg:({params})=>params['奇谋']?175:0};}
      if(key==='艾尔海森'){
        if(title.includes('基于元素精通'))b.data={eDmg:({calc,attr,params})=>params.haithamProjection?Math.min(100,calc(attr.mastery)*.1):0,qDmg:({calc,attr})=>Math.min(100,calc(attr.mastery)*.1)};
        if(title.includes('海森2命'))b.data={mastery:({params})=>50*params.haithamC2Stacks};
        if(title.includes('海森4命')){b.check=()=>true;b.data={dmg_dendro:({params})=>10*params.haithamC4Generated};}
        if(title.includes('六命'))b.check=({params})=>params.haithamC6Active;
      }
      if(key==='雷电将军'&&title.includes('恶曜开眼'))b.check=({params})=>params.raidenEyeActive;
      if(key==='玛拉妮'){
        if(title.includes('浪势充能'))b.data={aPlus:({talent,calc,attr,params})=>calc(attr.hp)*talent.e['浪势充能伤害提升']/100*params.mualaniWaveStacks};
        if(title.includes('逐浪心得'))b.data={qPlus:({calc,attr,params})=>calc(attr.hp)*.15*params.mualaniWaveWisdom};
        if(title.includes('玛拉妮1命'))b.check=({params,cons})=>params.mualaniWaveStacks===3&&(params.mualaniFirstBite||cons>=6);
      }
      if(key==='兹白'){
        if(title.includes('灵驹飞踏第二段')&&title.includes('60%'))b.check=({params})=>params.skills_1&&params.zibaiMoonfallActive;
        if(title.includes('每存在一名')){b.title='兹白A4：按实际其他岩/水队友计算防御和精通';b.data={mastery:({params})=>60*params.otherHydroMembers,defPct:({params})=>15*params.otherGeoMembers};}
        if(title.includes('兹白2命')){b.check=({params})=>params.skills_1&&params.zibaiMoonfallActive&&params.Moonsign>=2;b.title='兹白C2：太阴降平铺由60%提升至550%防御（补足490%）';b.data={fyplus:({attr,calc})=>calc(attr.def)*4.9};}
        if(title.includes('兹白6命')){b.check=({params})=>params.zibaiC6Active;b.data={lunarCrystallizeElevated:({params})=>Math.max(0,params.zibaiRadianceSpent-70)*1.6};}
      }
      if(key==='奈芙尔'){
        if(title.includes('奈芙尔1命'))b.data={};
        if(title.includes('奈芙尔技能'))b.data.qDmg=({params,talent,cons})=>params.Moonsign>=2?talent.q['伤害提升']*Math.min(params.Veil_of_Falsehood,cons>=2?5:3):0;
        if(title.includes('奈芙尔2命'))b.check=({params})=>params.Moonsign>=2;
        if(title.includes('奈芙尔4命')){b.data={res_dendro:20};b.check=({params})=>params.neferShadowDanceActive;}
      }
      if(key==='恰斯卡'){
        if(title.includes('焕影之灵'))b.data={a2Dmg:({params})=>[0,15,35,65][params.chascaShadowStacks]};
        if(title.includes('恰斯卡6命'))b.check=({params})=>params.chascaC6OnslaughtActive&&params.chascaEligibleRounds;
      }
      if(key==='基尼奇'){
        if(title.includes('焰灵的契约'))b.data.ePlus=({calc,attr,params})=>calc(attr.atk)*3.2*params.kinichHunterStacks;
        if(title.includes('基尼奇2命')){delete b.data.kx;b.data.res_dendro=({params})=>params.kinichC2ShredActive?30:0;}
      }
      if(key==='瓦雷莎'){
        if(i<2){const oldCheck=b.check;b.check=ds=>ds.params.varesaRainbowAvailable&&(!oldCheck||oldCheck(ds));}
        if(title.includes('瓦雷莎4命')&&b.data.a3Plus)b.check=({params})=>params.varesaC4PlungeAvailable;
        if(title.includes('瓦雷莎4命')&&b.data.dmg){b.check=({params})=>params.varesaC4BurstEligible;b.data={qDmg:100};}
      }
      if(key==='纳西妲'){
        if(title.includes('2命')){b.check=({params})=>params.nahidaMarked===true&&params.nahidaQuickenActive===true;}
        if(title.includes('4命')){b.title='纳西妲C4：按实际标记敌人数提升精通';b.data.mastery=({params})=>[0,100,120,140,160][Math.min(4,params.nahidaMarkedEnemies)];}
        if(title.includes('开Q元素精通')){b.data={masteryBorrowed:({attr,params,calc})=>params.q===false||!params.nahidaQFieldActive||!params.nahidaOnField?0:Math.min(250,.25*Math.max(calc(attr.mastery)-num(attr.borrowedMastery),params.nahidaTeamMastery))};}
        if(title.includes('基于元素精通')){b.data={eDmg:({attr,params,calc})=>params.e?0:clamp(calc(attr.mastery)-200,0,800)*.1,eCpct:({attr,params,calc})=>params.e?0:clamp(calc(attr.mastery)-200,0,800)*.03};}
        if(title.includes('草神Q')){b.data.eDmg=({cons,talent,params})=>params.q===false||params.e||!params.nahidaQFieldActive?0:[0,talent.q['火1伤害提升'],talent.q['火2伤害提升']][Math.min(2,params.nahidaPyroMembers+(cons>=1?1:0))];}
      }
      if(key==='阿蕾奇诺'){
        if(title.includes('最大生命值的生命之契'))b.check=({params})=>params.BondOfLife>=30;
        if(title.includes('在战斗状态'))b.data={dmg_pyro:40};
        if(title.includes('6命')){b.data={qPlus:b.data.qPlus,aCpct:({params})=>params.arleC6SkillBuff?10:0,aCdmg:({params})=>params.arleC6SkillBuff?70:0,qCpct:({params})=>params.arleC6SkillBuff?10:0,qCdmg:({params})=>params.arleC6SkillBuff?70:0};}
      }
      if(key==='玛薇卡'){
        if(title.includes('玛薇卡元素爆发')){b.check=({params})=>params.mavuikaSunfell||params.mavuikaBurstActive&&params.Flamestrider;b.data=Object.fromEntries(['q','a','a2'].map((s,i)=>[s+'Plus',({talent,attr,calc,params})=>(s==='q'||params.mavuikaBurstActive?params.mavuikaFightingSpirit:0)*talent.q[['坠日斩伤害提升','驰轮车普通攻击伤害提升','驰轮车重击伤害提升'][i]]*calc(attr.atk)/100]));}
        if(title.includes('夜魂迸发'))b.check=({params})=>params.mavuikaNightsoulBurstActive===true;
        if(title.includes('拥有满层战意'))b.data.dmg=({params,cons})=>params.mavuikaSunfell?params.mavuikaFightingSpirit*.2:params.mavuikaBurstActive?(cons>=4?params.mavuikaFightingSpirit*.2:params.mavuikaQBuffDmg):0;
        if(title.includes('玛薇卡1命'))b.check=({params})=>params.mavuikaC1Active===true;
        if(title.includes('玛薇卡4命'))b.check=({params})=>params.mavuikaSunfell||params.mavuikaBurstActive===true;
      }
      if(key==='菲谢尔'&&i===0)b.cons=2;
      if(key==='菲谢尔'&&i===1)b.cons=4;
      if(key==='阿贝多'&&i===3)b.cons=1;
      if(key==='林尼'&&title.includes('完场喝彩')) {b.title='林尼天赋：目标火附着时，60%基础增伤 + 其他火队友每人20%，至多100%';b.data.dmg=({params})=>params.pyroAura?60+Math.min(2,params.otherPyro)*20:0;}
      if(key==='娜维娅'&&title.includes('隊伍中存在')||key==='娜维娅'&&title.includes('队伍中存在')) {b.title='娜维娅天赋：火/雷/冰/水队友每人20%攻击力，最多40%';b.data.atkPct=({params})=>Math.min(2,params.naviaElements)*20;}
      if(key==='瓦雷莎'&&title.includes('夜魂迸发'))b.data.atkPct=({params})=>35*params.nightsoulBursts;
      if(key==='爱可菲'&&title.includes('4名水/冰')){b.title='爱可菲天赋：按水/冰角色人数计算自身降抗';b.data.kx=({params})=>[0,5,10,15,55][params.hydroCryoMembers];}
      if(key==='芙宁娜') {
        if(title.includes('天赋Q')){b.title='芙宁娜Q：按设置的气氛值计算增伤';delete b.data.dmg;b.data.allDmg=({talent,params})=>talent.q['气氛值转化提升伤害比例']*params.fanfare;b.data.healInc=({talent,params})=>talent.q['气氛值转化受治疗加成比例']*params.fanfare;}
        if(title.includes('芙宁娜1命'))b.data={};
        if(title.includes('芙宁娜2命'))b.data.hpPct=({params})=>params.furinaC2HP;
      }
      if(key==='琳妮特'&&title.includes('四色队')){b.title='琳妮特Q后：按队伍不同元素数获得攻击力';b.data.atkPct=({params})=>4+4*params.partyElements;}
      if(key==='五郎'&&b.data.dmg===15)b.data.dmg=({params})=>params.geoMembers>=3?15:0;
      if(key==='五郎'&&title.includes('6命')){b.data={cdmg:({params})=>params.geoMembers>=3?40:params.geoMembers===2?20:10};}
      if(key==='夏洛蒂') {if(b.data.atk===30){delete b.data.atk;b.data.atkPct=30;}if(title.includes('其他枫丹')||title.includes('非枫丹'))b.check=({params})=>params.partySize>1;}
    return global.GCharacterFixes?.buff(key,i,b)||b;
    });
    if(key==='胡桃')list.push({id:'self:hutao-c6',title:'胡桃C6：百蝶触发后的10秒暴率',cons:6,check:({params})=>params.hutaoC6Active,data:{cpct:100}});
    if(key==='兹白')list.push({id:'self:zibai-c2',title:'兹白C2：月转时隙时月结晶增伤30%',cons:2,check:({params})=>params.zibaiShiftActive,data:{lunarCrystallize:30}});
    return [...list,...(global.GCharacterFixes?.extraBuffs(key)||[])];
  }
  function buffList(config) {const c=character(config.character);return [...selfBuffs(c.key),...weaponBuffs(getWeapon(config,c)),...artifactBuffs(config)];}
  function isTeamBuff(b,c) {
    const t=typeof b.title==='string'?b.title:'';
    return /双.{0,3}共鸣|双水[Bb]uff|双水BUFF|双水Buff|班玛希茜|班尼特6命风鹰|队伍中存在三位火雷冰水/.test(t) ||
      false;
  }
  function paramsFor(config,c,detail,scope) {
    let def=RULES[c.key].defParams||{};
    if(typeof def==='function') def=def({weapon:getWeapon(config,c),cons:config.cons||0});
    const rawDetail=typeof detail.params==='function'?detail.params({cons:config.cons||0}):detail.params;
    const p={...def,...(rawDetail||{})};
    const solo=scope==='solo';
    p.Moonsign=solo?1:num(config.conditions?.moonsign,1);
    p.Hexenzirkel=solo?false:!!config.conditions?.hexerei;
    p.stellarConductCount=num(config.conditions?.stellarHits,12);
    p.stellarVortexCount=num(config.conditions?.vortexHits,3);
    p.mArtisDiffCount=solo?0:num(config.conditions?.differentElements,2);
    p.mArtisSameCount=solo?0:num(config.conditions?.sameElements,0);
    p.liyueCount=solo?Number(c.region==='璃月'):num(config.conditions?.liyueCount);
    p.off_field=solo?false:config.conditions?.onField===false;
    p.homework=!!config.conditions?.homework&&(!global.GTeam||global.GTeam.HEX.includes(c.key));
    p.goldenGrace=!!config.conditions?.goldenGrace;
    p.partySize=solo?1:num(config.conditions?.partySize,4);
    p.partyElements=solo?1:num(config.conditions?.partyElements,1);
    p.geoMembers=solo?Number(c.element==='geo'):num(config.conditions?.geoMembers,Number(c.element==='geo'));
    p.otherGeoMembers=solo?0:Math.max(0,p.geoMembers-(c.element==='geo'?1:0));p.otherHydroMembers=solo?0:Math.max(0,num(config.conditions?.hydroMembers)-(c.element==='hydro'?1:0));
    p.hydroCryoMembers=solo?Number(['hydro','cryo'].includes(c.element)):num(config.conditions?.hydroCryoMembers,Number(['hydro','cryo'].includes(c.element)));
    p.fanfare=num(config.conditions?.[solo?'soloFanfare':'teamFanfare'],config.cons>=1?150:0);
    p.furinaDrainers=solo?(num(config.conditions?.currentHpPct,100)>50?1:0):num(config.conditions?.furinaDrainers,0);
    p.furinaC2HP=num(config.conditions?.furinaC2HP,0);
    p.currentHpPct=num(config.conditions?.currentHpPct,c.key==='胡桃'?50:100);
    if(c.key==='雷电将军') p.num=solo?num(config.conditions?.soloResolve,0):num(config.conditions?.teamResolve,60);
    if(c.key==='那维莱特') p.neuvStacks=solo?(config.cons>=1?1:0):Math.min(3,num(config.conditions?.neuvStacks,0)+(config.cons>=1?1:0));
    if(c.key==='薇斯纳') {p.num1=solo?1:num(config.conditions?.vesnaCryoAnemo,3);p.num2=solo?0:num(config.conditions?.vesnaOthers,1);}
    if(c.key==='奈芙尔') p.Veil_of_Falsehood=solo?0:num(config.conditions?.veil,3);
    if(c.key==='丝柯克') p.skirkStacks=solo?0:num(config.conditions?.skirkStacks,3);
    if(c.key==='丝柯克') {p.skirkRifts=num(config.conditions?.skirkRifts,0);p.skirkSerpent=num(config.conditions?.skirkSerpent,config.cons>=2?55:45);p.skirkBurstBody=detail.skirkBurstBody===true;}
    if(c.key==='洛恩') {p['争胜']=num(config.conditions?.lohenStacks,0);p['奇谋']=config.conditions?.lohenMasterful===true;p.lohenCryoReactionActive=!solo&&config.conditions?.lohenCryoReactionActive===true;p.lohenNormalBuffActive=config.conditions?.lohenNormalBuffActive===true;p.lohenHighSpirits=config.conditions?.lohenHighSpirits===true;}
    p.vesnaOrder=num(config.conditions?.vesnaOrder,0);p.vesnaRadiance=config.conditions?.vesnaRadiance===true&&(solo?!!config.conditions?.soloAura:true);p.vesnaArmed=config.conditions?.vesnaArmed===true;
    p.nahidaQFieldActive=config.conditions?.nahidaQFieldActive===true;p.nahidaOnField=config.conditions?.onField!==false;p.nahidaMarked=config.conditions?.nahidaMarked===true;
    p.nahidaQuickenActive=(scope==='team'||config.conditions?.soloAura)&&config.conditions?.quicken===true;
    p.nahidaMarkedEnemies=num(config.conditions?.nahidaMarkedEnemies,0);p.nahidaPyroMembers=solo?0:num(config.conditions?.pyroMembers,0);
    p.nahidaTeamMastery=solo?0:Math.max(0,...(config.teammates||[]).map(t=>num(t.premod?.mastery??t.panel?.mastery)));
    p.BondOfLife=num(config.conditions?.arleBond,0);p.arleC6SkillBuff=config.conditions?.arleC6SkillBuff===true;
    p.mavuikaFightingSpirit=num(config.conditions?.mavuikaFightingSpirit,100);p.mavuikaQBuffDmg=num(config.conditions?.mavuikaQBuffDmg,0);p.mavuikaBurstActive=config.conditions?.mavuikaBurstActive===true;
    p.mavuikaSunfell=c.key==='玛薇卡'&&/Q/.test(detail.title||'');
    p.mavuikaNightsoulBurstActive=config.conditions?.mavuikaNightsoulBurstActive===true;p.mavuikaC1Active=config.conditions?.mavuikaC1Active===true;
    p.skirkSpecialQActive=config.conditions?.skirkSpecialQActive===true;
    p.neuvChargedHits=num(config.conditions?.neuvChargedHits,8);p.neuvC6ExtraStreams=num(config.conditions?.neuvC6ExtraStreams,0);
    p.absorbedElement=config.conditions?.absorbedElement||'pyro';p.swirlElement=config.conditions?.swirlElement||'pyro';
    for(const [key,,type,options,fallback]of stateFields(config))p[key]=config.conditions?.[key]??fallback??(type==='bool'?false:type==='elements'?[]:type==='select'?options[0][0]:type||0);
    if(c.key==='胡桃'&&/开E/.test(detail.title||''))p.hutaoSkillActive=true;
    if(c.key==='艾尔海森')p.haithamProjection=/(光幕)/.test(detail.title||'');
    if(c.key==='丝柯克'){if(p.Havoc_Ruin)p.skirkSpecialQActive=false;p.cons_2=p.skirkSpecialQActive;}
    if(c.key==='林尼') {p.otherPyro=solo?0:num(config.conditions?.otherPyro,2);p.pyroAura=config.conditions?.pyroAura!==false;}
    if(c.key==='娜维娅')p.naviaElements=solo?0:num(config.conditions?.naviaElements,2);
    p.nightsoulBursts=num(config.conditions?.nightsoulBursts,0);if(solo)p.nightsoulBursts=Math.min(1,p.nightsoulBursts);
    if(c.key==='法尔伽'&&solo){p.skills_1=false;p.skills_2=false;p.cons_6=false;}
    if(c.key==='恰斯卡'&&solo)p.ShadowSpirit=false;
    if(c.key==='流浪者'&&solo){p.pyro=false;p.cryo=false;}
    const merged={...p,...(config.parameters?.[scope]||{}),Moonsign:p.Moonsign,Hexenzirkel:p.Hexenzirkel,partySize:p.partySize,partyElements:p.partyElements,mArtisDiffCount:p.mArtisDiffCount,mArtisSameCount:p.mArtisSameCount,liyueCount:p.liyueCount};
    const metricParams=global.GMetrics?.params(config,c,detail,scope,merged)||merged;
    return global.GCharacterFixes?.params(config,c,detail,scope,metricParams)||metricParams;
  }
  function add(attr,key,value) {
    const v=num(value);
    if(key==='nativeDmg'){const own=character(attr.characterName)?.element;if(own)attr['dmg_'+own]=(attr['dmg_'+own]||0)+v;return;}
    if(key==='rechargeBorrowed'){attr.borrowedRecharge=(attr.borrowedRecharge||0)+v;return;}
    if(key==='masteryBorrowed'){attr.mastery.plus+=v;attr.borrowedMastery=(attr.borrowedMastery||0)+v;return;}
    if(key==='atkBorrowed'){attr.atk.plus+=v;attr.borrowedAtk=(attr.borrowedAtk||0)+v;return;}
    if(key==='defBorrowed'){attr.def.plus+=v;attr.borrowedDef=(attr.borrowedDef||0)+v;return;}
    if(key.startsWith('_')||key==='buffCount'||key==='buff')return;
    const skill=/^(a2|a3|a|e2|e|q2|q3|q|nightsoul|fy)(Pct|Multi|Plus|Dmg|Cpct|Cdmg|Def|Ignore|Elevated)$/.exec(key);
    if(skill) {attr[skill[1]][skill[2].toLowerCase()]+=v;return;}
    const stat=/^(hp|def|atk)(Base|Plus|Pct|Inc)?$/.exec(key);
    if(stat) {attr[stat[1]][(stat[2]||'Plus').toLowerCase()]+=v;return;}
    const simple=/^(mastery|recharge|cpct|cdmg|dmg|phy|coloringDmg|heal|shield)(Plus|Pct|Inc)?$/.exec(key);
    if(simple) {attr[simple[1]][(simple[2]||'Plus').toLowerCase()]+=v;return;}
    if(key==='enemyDef')attr.enemy.def+=v;
    else if(key==='ignore'||key==='enemyIgnore')attr.enemy.ignore+=v;
    else attr[key]=(attr[key]||0)+v;
  }
  function constellationAllows(b,cons){return (!b.cons||num(cons)>=b.cons)&&(b.maxCons===undefined||num(cons)<=b.maxCons);}
  function buffAllowed(b,ds,scope,config,c) {
    if(config.disabledBuffs?.includes(b.id))return false;
    if(!constellationAllows(b,ds.cons))return false;
    if(b.elem && b.elem!==ds.element)return false;
    if(b.check && !b.check(ds))return false;
    // External team buffs are exclusively supplied in the team's buff editor.
    if(isTeamBuff(b,c))return false;
    if(c.key==='菲林斯' && b.cons!==6 && /处于满辉/.test(b.title||'') && ds.params.Moonsign<2)return false;
    if(c.key==='奈芙尔' && /伪秘之帷/.test(b.title||'') && ds.params.Moonsign<2)return false;
    if(/满辉/.test(b.title||'')&&ds.params.Moonsign<2&&!(c.key==='菲林斯'&&b.cons===6))return false;
    if(b.requiresHexerei&&!ds.params.Hexenzirkel)return false;
    if(c.key==='爱可菲'&&/爱可菲1命/.test(b.title||'')&&ds.params.hydroCryoMembers<4)return false;
    if(scope==='solo' && c.key==='娜维娅' && /队伍中存在/.test(b.title||''))return false;
    return true;
  }
  function createAttr(config,c,w,rolls={},panel=null,mains=config.mains) {
    const base=getStats(c,config.level||90),attr={};
    for(const k of PART_KEYS)attr[k]=new Stat(k==='shield'?100:0);
    attr.atk.base=base.atkBase+w.base;attr.hp.base=base.hpBase;attr.def.base=base.defBase;
    attr.cpct.base=5;attr.cdmg.base=50;attr.recharge.base=100;
    if(panel&&panel.mode!=='artifacts') {
      for(const k of ['atk','hp','def'])attr[k].plus=num(panel[k])-attr[k].base;
      for(const k of ['mastery','cpct','cdmg','recharge','dmg','phy','heal'])attr[k].base=num(panel[k],k==='recharge'?100:0);
    } else {
      for(const [k,v] of Object.entries(base))if(!k.endsWith('Base'))add(attr,k,v);
      if(w.bonusKey && w.bonusKey!=='none')add(attr,w.bonusKey,w.bonus);
      if(panel?.mode==='artifacts')for(const [key,value]of Object.entries(panel.stats||{}))add(attr,key,num(value));
      else {add(attr,'hpPlus',4780);add(attr,'atkPlus',311);for(const key of Object.values(mains||{}))if(MAIN[key])add(attr,key,MAIN[key]);}
    }
    const unit=config._rollUnits||rollUnits(config);
    if(!panel)add(attr,'recharge',num(config.reservedRechargeRolls?.[config._scope||'solo'])*unit.recharge);
    for(const [key,count] of Object.entries(rolls))add(attr,key,num(count)*unit[key]);
    attr.staticAttr={atk:{pct:attr.atk.pct},hp:{pct:attr.hp.pct},def:{pct:attr.def.pct},dmg:{plus:calc(attr.dmg)}};
    for(const k of SKILLS)attr[k]={pct:0,multi:0,plus:0,dmg:0,cpct:0,cdmg:0,def:0,ignore:0,elevated:0};
    attr.enemy={def:0,ignore:0};
    for(const k of ['multi','kx','fykx','fypct','fyplus','elevated',...Object.keys(ALIAS).map(k=>ALIAS[k]),...Object.keys(TRANSFORM)])attr[k]=0;
    attr.refine=(w.refine||1)-1;attr.element=ELEMENT[c.element];attr.weapon=w;attr.weaponTypeName=WEAPON[c.weapon];attr.characterName=c.key;
    return attr;
  }
  function prepare(config,scope='solo',panel=null,mains=config.mains) {
    if(panel?.mode==='resident'){
      if(!global.GResident&&typeof require==='function')require('./resident-panel.js');
      return prepare(config,scope,global.GResident.infer(config,panel.values||panel,mains),mains);
    }
    if(scope==='team'&&!config._supportRuntimeDone&&global.GSupportPanels?.runtimeKeys(config).length){
      const original=config,keys=global.GSupportPanels.runtimeKeys(config),cache=new Map(),base=prepare({...config,_supportRuntimeDone:true},scope,panel,mains);
      return {...base,evaluate(rolls={},trace=false){const raw=outOfCombatPanel(original,rolls,panel,mains),key=JSON.stringify(keys.map(k=>raw[k]));if(!cache.has(key))cache.set(key,prepare({...original,_supportRuntimeDone:true,_supportRuntimePanel:raw},scope,panel,mains));return cache.get(key).evaluate(rolls,trace);}};
    }
    config={...config,_scope:scope};
    if(global.GTeam)config=global.GTeam.resolve(config,{strict:false});
    config._scope=scope;
    const c=character(config.character);if(!c||!RULES[c.key])throw new Error('尚未找到该角色的技能公式。');
    if(panel&&panel.mode!=='artifacts'){
      const permanentRoles=['菲林斯','桑多涅','薇斯纳','雷电将军','莫娜','梦见月瑞希'];
      const permanentWeapons=['护摩之杖','磐岩结绿','薙草之稻光','赤沙之杖','西福斯的月光','流浪的晚星','玛海菈的水色'];
      if(permanentRoles.includes(c.key)||permanentWeapons.includes(config.weapon)||c.key==='玛薇卡'&&config.cons>=2)throw new Error('该角色/武器有常驻属性转化或基础属性变化。为避免重复计入，请切换「圣遗物属性合计」输入，再由程序完整构建面板。');
    }
    if(scope==='solo')config.extraTalent=c.key==='达达利亚'?{a:1}:{};
    if(config._metric&&scope==='solo'&&c.key==='丝柯克'&&config.metricSettings?.talentMode!=='actual')config.extraTalent={...config.extraTalent,e:1};
    const w=getWeapon(config,c),talent=talentFor(c,config);
    config._rollUnits=rollUnits(config);
    const buffs=[...buffList(config),...(scope==='team'?config.teamDynamic||[]:[])].sort((a,b)=>num(a.sort,1)-num(b.sort,1));
    const plan=(config.goal==='single'?[{index:config.singleIndex??config.rotation?.[0]?.index??0,count:1,reaction:config.singleReaction||'native',coverage:num(config.singleCoverage,100),params:config.singleParams||{},teamState:config.singleTeamStateEnabled?config.singleTeamState:undefined,contributorFlatHits:config.singleContributorFlatHits}]:config.rotation||[]).filter(x=>num(x.count)>0);
    if(!plan.length)throw new Error('输出循环中至少需要一个技能。');
    const rows=plan.map(item=>{
      const phase=item.teamStateEnabled===false?null:item.teamState;
      let rowConfig=config;
      if(phase||item.params?.currentHpPct!==undefined){
        const teammates=(config.teammates||[]).map((t,i)=>{const o=phase?.teammates?.[i]||{};const panel=Object.fromEntries(Object.entries(o.panel||{}).filter(([,v])=>v!==''&&v!==undefined));return {...t,...o,character:t.character,weapon:t.weapon,cons:t.cons,refine:t.refine,panel:{...t.panel,...panel}};});
        rowConfig={...config,conditions:{...config.conditions,...phase?.conditions,...(item.params?.currentHpPct!==undefined?{currentHpPct:item.params.currentHpPct}:{})},teammates,manualTeam:{...config.manualTeam,...phase?.manualTeam}};
      }
      if(global.GTeam)rowConfig=global.GTeam.resolve(rowConfig,{strict:scope==='team'});
      const detail=resolveDetail(rowConfig,item.index);if(!detail)throw new Error('技能不存在，请重新选择。');
      const base=paramsFor(rowConfig,c,detail,scope),params={...base,...(item.params||{})};
      for(const k of ['Moonsign','Hexenzirkel','partySize','partyElements','mArtisDiffCount','mArtisSameCount','liyueCount','mavuikaSunfell'])params[k]=base[k];
      const ranges={currentHpPct:[0,100],vesnaOrder:[0,6,true],num1:[1,4,true],num2:[0,3,true],nahidaMarkedEnemies:[0,20,true],BondOfLife:[0,200],mavuikaFightingSpirit:[0,200],mavuikaQBuffDmg:[0,40],neuvChargedHits:[1,100,true],neuvC6ExtraStreams:[0,100,true],skirkSerpent:[0,100],skirkRifts:[0,3,true],skirkStacks:[0,3,true],争胜:[0,config.cons>=1?300:100]};
      if(c.key==='芙宁娜'){ranges.fanfare=[0,config.cons>=1?400:300];ranges.furinaDrainers=[0,base.partySize,true];}
      for(const [k,,type,max,,integer=true]of stateFields(config))if(typeof type==='number')ranges[k]=[type,max,integer];
      for(const [k,,type,options]of stateFields(config)){
        if(type==='bool'&&typeof params[k]!=='boolean')throw new Error('技能状态 '+k+' 需为已生效或未生效。');
        if(type==='select'&&!options.some(([value])=>value===params[k]))throw new Error('技能模式 '+k+' 无效，请重新选择。');
        if(type==='elements'&&(!Array.isArray(params[k])||params[k].some(e=>!ELEMENT[e]||e==='physical')))throw new Error('技能元素列表 '+k+' 需从实际元素中选择。');
      }
      for(const [k,[min,max,int]]of Object.entries(ranges))if(params[k]!==undefined&&(params[k]===''||params[k]===null||!Number.isFinite(Number(params[k]))||params[k]<min||params[k]>max||int&&!Number.isInteger(Number(params[k]))))throw new Error('技能参数 '+k+' 需要在 '+min+'–'+max+' 范围'+(int?'的整数':'')+'。');
      global.GCharacterFixes?.validate(rowConfig,c,detail,params,item,scope);
      if(c.key==='丝柯克'&&params.Havoc_Ruin&&params.skirkSerpent<50)throw new Error('丝柯克普通爆发·灭需要至少50蛇之狡谋，请填写实际资源或选择特殊爆发后的普攻目标。');
      if(params.mavuikaSunfell&&params.mavuikaFightingSpirit<100)throw new Error('玛薇卡本次Q至少需要100战意，请填写施放时的真实战意。');
      if(c.key==='阿蕾奇诺'&&Number(item.index)===0&&num(item.count)>1&&!params.fixedSnapshot)throw new Error('红死普攻会逐击消耗生命之契；请拆成每击次数1并填写 BondOfLife，或明确选择固定状态快照。');
      return {item,detail,params,rowConfig,rowBuffs:[...buffList(rowConfig),...(scope==='team'?rowConfig.teamDynamic||[]:[])].sort((a,b)=>num(a.sort,1)-num(b.sort,1))};
    });
    const team=scope==='team'?(config.team||{}):{};
    const disabled=[];
    function evaluate(rolls={},trace=false) {
      let total=0,critical=0;const details=[],activeBuffs=new Set(),usedFlat={};let lastAttr=null;
      for(const {item,detail,params,rowConfig,rowBuffs} of rows) {
        for(const source of item.resourceReset||[])delete usedFlat[source];
        if(detail.cons && num(config.cons)<detail.cons)throw new Error('「'+detail.title+'」至少需要C'+detail.cons+'，请检查所选技能与命座。');
        const attr=createAttr(config,c,w,rolls,panel,mains),artifactCritBonuses=[],teamApplications=[];
        const rowTalent=c.key==='洛恩'&&params.lohenHighSpirits?talentFor(c,{...config,extraTalent:{...config.extraTalent,e:num(config.extraTalent?.e)+1}}):talent;
        const ds={characterName:c.key,level:num(String(config.level||90).replace('+',''),90),cons:num(config.cons),talent:rowTalent,weapon:w,attr,calc,params,refine:(w.refine||1)-1,
          element:ELEMENT[c.element],weaponTypeName:WEAPON[c.weapon],currentTalent:detail.talent||'',artis:{},trees:{},mastery:item.reaction};
        for(const [key,value] of Object.entries(scope==='team'?rowConfig.team||{}:{}))if(!key.startsWith('res_'))add(attr,key==='dmg'?'allDmg':key,value);
        if(scope==='team'&&rowConfig.supportPanelMode==='base')for(const e of rowConfig.teamEffects||[])if(e.status==='applied'&&e.key==='atkPlus'&&!['direct','columbinaC2'].includes(global.GSupportPanels.policy(e)))attr.borrowedAtk=(attr.borrowedAtk||0)+e.value;
        if(c.key==='纳西妲'&&config.cons>=2&&params.nahidaMarked){add(attr,'lunarBloomCpct',10);add(attr,'lunarBloomCdmg',20);}
        if(scope==='solo')for(const [key,value]of Object.entries(rowConfig.soloArea||{}))add(attr,key,value);
        for(const b of rowBuffs) {
          if(panel&&panel.mode!=='artifacts'&&(b.isStatic||b.staticSet))continue;
          if(panel&&panel.mode!=='artifacts'&&c.key==='珊瑚宫心海'&&/暴击率降低100/.test(b.title||''))continue;
          if(!buffAllowed(b,ds,scope,rowConfig,c))continue;
          let conversionDs=ds;
          const restrictEM= b.id?.startsWith('weapon:')&&['赤沙之杖','西福斯的月光','流浪的晚星','玛海菈的水色'].includes(w.name) || c.key==='枫原万叶'&&/精通.*元素伤|精通.*增伤/.test(b.title||'');
          if(restrictEM&&attr.borrowedMastery){const eligibleAttr={...attr,mastery:new Stat(attr.mastery.base,attr.mastery.plus-attr.borrowedMastery,attr.mastery.pct)};conversionDs={...ds,attr:eligibleAttr};}
          if((['菲林斯','伊涅芙','尼可'].includes(c.key)||rowConfig.supportPanelMode==='base'&&['桑多涅','旅行者·冰'].includes(c.key))&&typeof b.data?.mastery==='function'&&attr.borrowedAtk){const eligibleAttr={...conversionDs.attr,atk:new Stat(attr.atk.base,attr.atk.plus-attr.borrowedAtk,attr.atk.pct)};conversionDs={...conversionDs,attr:eligibleAttr};}
          if(c.key==='莉奈娅'&&typeof b.data?.mastery==='function'&&attr.borrowedDef){const eligibleAttr={...conversionDs.attr,def:new Stat(attr.def.base,attr.def.plus-attr.borrowedDef,attr.def.pct)};conversionDs={...conversionDs,attr:eligibleAttr};}
          const appliedParts=[];
          for(const [key,value] of Object.entries(b.data||{})){
            const groups=rowConfig.dedupGroups||[];
            const duplicate=scope==='team'&&(
              b.id?.startsWith('weapon:')&&!b.isStatic&&['苍古自由之誓','终末嗟叹之诗','松籁响起之时'].includes(w.name)&&
                (key==='atkPct'&&groups.includes('millennial-atk')||key==='mastery'&&groups.includes('millennial-em')||groups.includes('millennial-'+key))||
              b.id?.startsWith('set:')&&b.id.includes(':4:')&&(
              b.id.includes('昔日宗室之仪')&&key==='atkPct'&&groups.includes('noblesse')||
              b.id.includes('千岩牢固')&&key==='atkPct'&&groups.includes('tenacity')||
              b.id.includes('教官')&&key==='mastery'&&groups.includes('instructor')||
              b.id.includes('纺月的夜歌')&&(key==='mastery'&&groups.includes('silken-em')||groups.includes('gleam-devotion-'+key))||
              b.id.includes('穹境示现之夜')&&groups.includes('gleam-yearning-'+key)||
              b.id.includes('炉火融炼之心')&&groups.includes('hearth-'+key)||
              b.id.includes('深林的记忆')&&key==='res_dendro'&&groups.includes('deepwood')||
              b.id.includes('烬城勇者绘卷')&&groups.includes('scroll-'+key.replace('dmg_',''))||
              b.id.includes('天之美赐')&&key==='nativeDmg'&&groups.includes('celestial-'+c.element)));
            if(!duplicate){const amount=typeof value==='function'?value(conversionDs):value;add(attr,key,amount);if(b.staticSet&&key==='dmg')attr.staticAttr.dmg.plus+=num(amount);if(num(amount)!==0)appliedParts.push((LABELS[key]||key)+' '+Number(num(amount).toFixed(4)));
              if(typeof value==='function'&&(key==='atkPlus'&&(b.id?.startsWith('weapon:')&&['护摩之杖','磐岩结绿','赤沙之杖','玛海菈的水色','流浪的晚星'].includes(w.name)||b.id?.startsWith('self:')&&['胡桃','诺艾尔','荒泷一斗'].includes(c.key))||key==='mastery'&&b.id?.startsWith('weapon:')&&w.name==='圣显之钥')){attr.moonExcluded??={};const k=key==='atkPlus'?'atk':'mastery';attr.moonExcluded[k]=num(attr.moonExcluded[k])+num(amount);}
              if(trace&&!b.staticSet&&b.id?.startsWith('set:')&&/^(cpct|cdmg|.+Cpct|.+Cdmg)$/.test(key)&&num(amount)!==0)artifactCritBonuses.push({source:b.id.split(':')[1],key,value:num(amount)});
              if(trace&&scope==='team'&&b.auditId&&num(amount)!==0)teamApplications.push({id:b.auditId,owner:b.owner,source:b.sourceFor?b.sourceFor(ds):b.title,category:b.category||'角色',key,value:num(amount),type:'dynamic'});
            }
          }
          if(trace&&appliedParts.length)activeBuffs.add((typeof b.title==='function'?b.title(ds):b.title)+' · 实际 '+appliedParts.join('，'));
        }
        lastAttr=attr;
        if(detail.check&&!detail.check(ds))throw new Error('「'+detail.title+'」不满足当前命座或技能模式，请选择对应的攻击项。');
        global.GCharacterFixes?.resources?.(ds,detail,item,usedFlat);
        const calls=[],flats=scope==='team'?[...(rowConfig.flatBuffs||[])]:[];
        flats.push(...(global.GCharacterFixes?.flats(ds,detail,config,usedFlat)||[]));
        if(w.name==='裁叶萃光'&&params.foliarActive&&!config.disabledBuffs?.includes('weapon:1'))flats.push({source:'裁叶萃光',id:'裁叶萃光',skills:['a','e'],value:Math.max(0,calc(attr.mastery))*step(120)[w.refine-1]/100,quota:params.foliarResources});
        if(config.sets?.some(s=>s.name==='昔时之歌'&&s.count>=4)&&params.songActive&&!params.off_field&&!config.disabledBuffs?.some(id=>id.startsWith('set:昔时之歌:4:')))flats.push({source:'昔时之歌',id:'昔时之歌',skills:['a','a2','a3','e','q'],value:params.songHealing*.08,quota:params.songResources});
        const forced=item.reaction&& !['native','none'].includes(item.reaction);
        const dmg=getDmgFn(attr,ds,rowConfig,scope,item,calls,trace||flats.length>0||forced,usedFlat);
        if(detail.teamOnly&&scope==='solo')continue;
        if(detail.projection){const pr=rowConfig.teamProjections?.find(p=>p.id===detail.projection);if(!pr)throw new Error('尼可投影需要相应命座/爆发生效状态。');if(!rowConfig.conditions.onField)throw new Error('投影由前台角色造成，请核对主角色在场状态。');if(!pr.timingVerified)throw new Error('请在尼可队友选项中核对投影次数与全队触发间隔。');usedFlat[pr.id]=(usedFlat[pr.id]||0)+num(item.count);if(usedFlat[pr.id]>pr.quota)throw new Error('尼可Q投影总次数超过所填Q施放次数的四次上限。');}
        const result=detail.dmg(ds,dmg);
        if(!result||!Number.isFinite(result.avg)||result.avg<0)throw new Error(c.key+'「'+detail.title+'」没有返回有效伤害；请检查技能参数。');
        if(result.kind==='heal'||result.kind==='shield'||typeof result.avg!=='number')throw new Error('治疗或护盾不能作为伤害优化目标。');
        if(forced&&!calls.some(c=>c.forcedApplied))throw new Error('「'+detail.title+'」的实际伤害元素不能触发所选反应，或单人异元素附着尚未开启。混合技能只对可反应的分项应用增幅。');
        for(const f of flats) {
          const eligible=calls.map((call,i)=>({call,i})).filter(({call})=>{
            if(call.projection)return false;
            if(call.kind==='indirect'||f.indirectOnly)return false;
            if(f.reactions)return f.reactions.includes(call.rx);
            if(!['normal','amplifying','additive'].includes(call.kind))return false;
            if(f.elements&&!f.elements.includes(call.element))return false;
            const tags=call.tags||[];
            if(f.skills)return tags.some(t=>f.skills.includes(t));
            if(f.scope==='a')return tags.includes('a');
            if(f.scope==='normal')return tags.some(t=>['a','a2','a3'].includes(t));
            return f.anyDamage===true||tags.some(t=>['a','a2','a3','e','q'].includes(t));
          });
          if(!eligible.length)continue;
          let inputHits=item.flatHits??(config.goal==='single'?config.singleFlatHits:undefined);
          if((inputHits===undefined||inputHits==='')&&config._metric){let remaining=Math.max(0,f.quota-(usedFlat[f.source]||0));inputHits=calls.map((call,i)=>{if(!eligible.some(e=>e.i===i))return 0;const free=f.freeNormal&&call.tags.some(t=>['a','a2'].includes(t));if(!free&&remaining<=0)return 0;const take=free?1:Math.min(1,remaining/Math.max(1,num(item.count)));if(!free)remaining-=take*Math.max(1,num(item.count));return take;});}
          if(inputHits===undefined||inputHits==='')throw new Error(f.source+' 提供限次附加伤害：请填写「'+detail.title+'」每个技能项的实际生效次数，可填0。多种乘区时按分项填数组。');
          if(typeof inputHits==='string'){try{inputHits=JSON.parse(inputHits);}catch{throw new Error('附加伤害次数应填数字或JSON数组，例如 5 或 [3,2]。');}}
          if(inputHits&&typeof inputHits==='object'&&!Array.isArray(inputHits))inputHits=inputHits[f.id];
          let counts;
          if(Array.isArray(inputHits)){if(inputHits.length!==calls.length)throw new Error('「'+detail.title+'」有'+calls.length+'个公式分项，附加伤害次数数组需要对应'+calls.length+'项。');counts=inputHits;}
          else {
            const n=num(inputHits,NaN);if(!Number.isFinite(n)||n<0)throw new Error('附加伤害实际命中次数须为非负数。');
            if(eligible.some(({call})=>Math.abs(call.flatFactor-eligible[0].call.flatFactor)>1e-8)&&n>0)throw new Error('「'+detail.title+'」有不同伤害乘区；请按'+calls.length+'个分项分别填附加伤害次数数组。');
            counts=calls.map(()=>0);counts[eligible[0].i]=n;
          }
          let consumed=0;
          for(const {call,i}of eligible){const n=num(counts[i]);if(n<0)throw new Error('附加伤害生效次数不得为负。');consumed+=n;result.avg+=f.value*n*call.flatFactor;result.dmg=(result.dmg??result.avg)+f.value*n*call.flatCritFactor;call.avg+=f.value*n*call.flatFactor;call.hit+=f.value*n*call.flatCritFactor;call.flatBaseAdded=(call.flatBaseAdded||0)+f.value*n;if(f.auditId&&n>0){call.teamFlatApplications??=[];call.teamFlatApplications.push({id:f.auditId,owner:f.owner,source:f.source,category:f.category||'角色',key:'flat',value:f.value,count:n*num(item.count),appliedBase:f.value*n,quota:f.quota,type:'flat'});}}
          if(f.freeNormal)consumed=eligible.reduce((sum,{call,i})=>sum+(call.tags.some(t=>['a','a2'].includes(t))?0:num(counts[i])),0);
          if(f.preconsumed&&consumed>1+1e-8)throw new Error(f.source+' 本次攻击最多受益一次，不能超过本次已消耗资源。');
          usedFlat[f.source]=(usedFlat[f.source]||0)+(f.preconsumed?0:consumed*num(item.count));
          if(usedFlat[f.source]>f.quota+1e-8)throw new Error(f.source+' 在所选循环使用了'+usedFlat[f.source]+'次附加伤害，超过当前资源 '+f.quota+' 次。请填实际资源或减少受益次数。');
          if(trace&&consumed)activeBuffs.add(f.source+' 限次附加伤害：此项实际 '+consumed+' 次，单次基础值 '+f.value.toFixed(2));
        }
        for(const call of calls)for(const use of call.indirectFlatUsage||[]){usedFlat[use.source]=(usedFlat[use.source]||0)+use.count*num(item.count);if(usedFlat[use.source]>use.quota+1e-8)throw new Error(use.source+' 间接/直接平铺合计超过资源上限 '+use.quota+' 次。');}
        const count=num(item.count);total+=result.avg*count;critical+=(result.dmg??result.avg)*count;
        if(trace)details.push({title:detail.title,count,avg:result.avg,total:result.avg*count,critical:(result.dmg??result.avg)*count,calls,params,talentLevels:rowTalent.talentLevel,panel:panelValues(attr),artifactCritBonuses,team:scope==='team'?rowConfig.autoTeam:{},teamEffects:scope==='team'?[...(rowConfig.teamEffects||[]).filter(e=>!e.type||e.type==='talent'||e.type==='condition'),...teamApplications,...calls.flatMap(c=>[...(c.teamFlatApplications||[]),...(c.teamReactionApplications||[])])]:[],supportSnapshots:scope==='team'?rowConfig.supportSnapshots||[]:[],source:detail.dmg.toString()});
      }
      if(total<=0)throw new Error('当前命座或条件下，该输出循环没有可计算的伤害。');
      if(!trace)return total;
      const reference=outOfCombatPanel(config,rolls,panel,mains);
      return {total,critical,details,buffs:[...activeBuffs],panel:panelValues(lastAttr),referenceCrit:{cpct:reference.cpct,cdmg:reference.cdmg},scope};
    }
    return {evaluate,character:c,weapon:w,mains,scope,config,disabled};
  }
  function panelValues(a) {const values=a?Object.fromEntries(PART_KEYS.map(k=>[k,calc(a[k])])):{};if(a){values.recharge+=num(a.borrowedRecharge);const own=character(a.characterName)?.element;values.dmg+=num(a.allElementDmg)+num(a['dmg_'+own]);}return values;}
  function resistance(r) {return r<0?1-r/2:r<0.75?1-r:1/(1+4*r);}
  function getRes(element,attr,config,scope) {
    let r=num(config.enemy?.resistances?.[element],num(config.enemy?.resistance,10));
    r-=attr.kx||0;r-=num(attr['res_'+element]);
    if(scope==='team')r-=num(config.team?.['res_'+element]);
    if(element===(config.conditions?.swirlElement||'pyro'))r-=attr.fykx||0;
    return resistance(r/100);
  }
  function levelMultiplier(level) {return DATA.levels[level]*4;}
  function crit(cr,cd,can=true) {return can?1+clamp(cr/100,0,1)*Math.max(0,cd/100):1;}
  function specialFactor(rx,params,indirect=false) {
    if(rx==='lunarCharged')return 3;
    if(rx==='lunarCrystallize')return 1.6;
    if(rx==='lunarBloom')return 1;
    if(rx==='stellarConduct') {const n=clamp(num(params.stellarConductCount),0,12);return n===0?1:Math.min(2,1.4+0.05*n);}
    if(rx==='stellarSwirl')return indirect?0.75:1;
    if(rx==='stellarVortex')return num(params.stellarVortexCount)>=3?3:2;
    return 1;
  }
  function specialUncrit(rx,base,em,bonus,bbase,flat,res,elevation,params,indirect=false) {
    return (specialFactor(rx,params,indirect)*base*(1+bbase/100)*(1+6*em/(2000+em)+bonus/100)+flat)*res*(1+elevation/100);
  }
  function indirectExpected(people,ownerOnly=false) {
    if(!people.length)return 0;
    let expected=0;const weights=[0.6,0.3,0.05,0.05];
    for(let mask=0;mask<(1<<people.length);mask++) {
      let probability=1;
      const values=people.map((p,i)=>{const hit=!!(mask&(1<<i)),cr=clamp(p.cr/100,0,1);probability*=hit?cr:1-cr;return {value:p.base*(hit?1+p.cd/100:1),i};});
      values.sort((a,b)=>b.value-a.value||a.i-b.i);
      expected+=probability*values.reduce((sum,p,i)=>sum+(!ownerOnly||p.i===0?p.value*weights[i]:0),0);
    }
    return expected;
  }
  function getDmgFn(attr,ds,config,scope,item,calls,trace,reactionUsage={}) {
    const useReaction=scope==='team'?config.conditions?.teamAura===true:config.conditions?.soloAura===true;
    const ownTalentAssumed=scope==='solo'&&config._metric&&config.metricSettings?.talentMode!=='actual';
    function damage(pct=0,talent=false,rx=false,base=0,mode='talent',dynamic={},paramsOverride={}) {
      rx=ALIAS[rx]||rx;dynamic=dynamic||{};const params={...ds.params,...(paramsOverride||{})};
      const rxRequested=rx,scene=String(rx).split(',').includes('scene');
      if(scene)rx=String(rx).split(',').filter(x=>x!=='scene').join(',')||false;
      const originalRx=rx,ownElement=character(config.character).element;
      let element;
      if(talent==='fy')element=rx==='stellarSwirl'?'anemo':RX_ELEMENT[rx]||(rx==='swirl'?params.swirlElement||'pyro':ownElement);
      else if(SPECIAL.has(rx))element=rx==='stellarConduct'||rx==='stellarSwirl'?ownElement:RX_ELEMENT[rx];
      else element=rx==='phy'?'physical':rx==='coloringDmg'||scene?params.absorbedElement||params.swirlElement||'pyro':ownElement;
      if(params.damageElement&&ELEMENT[params.damageElement])element=params.damageElement;
      element=global.GCharacterFixes?.element?.(ds,element,originalRx,talent)||element;
      if(scope==='solo'&&!ownTalentAssumed&&config.character==='法尔伽'&&originalRx==='coloringDmg'){rx=false;element='anemo';}
      const canReact=type=>type==='vaporize'?['pyro','hydro'].includes(element):type==='melt'?['pyro','cryo'].includes(element):type==='aggravate'?element==='electro':type==='spread'?element==='dendro':TRANSFORM[type]!==undefined;
      let forcedApplied=false;
      if(!SPECIAL.has(rx)&&item.reaction&&!['native','none'].includes(item.reaction)){
        if(canReact(item.reaction)&&useReaction){rx=item.reaction;forcedApplied=true;}else if(REACTIVE.has(rx))rx=false;
      }
      if(REACTIVE.has(rx)&&(!useReaction||item.reaction==='none'||talent!=='fy'&&!canReact(rx)))rx=false;
      if(SPECIAL.has(rx)&&talent==='fy'&&!useReaction)rx=false;
      const tags=(talent||'').split(',').filter(Boolean);
      let baseDmg=mode==='basic'?base:calc(attr.atk)*num(pct)/100;
      let multi=attr.multi||0,plus=0,dmgBonus=calc(attr.dmg)+num(dynamic.dynamicDmg),cr=calc(attr.cpct)+num(dynamic.dynamicCpct),cd=calc(attr.cdmg)+num(dynamic.dynamicCdmg);
      let defDown=attr.enemy.def,ignore=attr.enemy.ignore;
      if(element==='physical')dmgBonus=calc(attr.phy)+num(dynamic.dynamicPhy);
      if((originalRx==='coloringDmg'||scene||params.damageElement&&element!==ownElement)&&!(scope==='solo'&&!ownTalentAssumed&&config.character==='法尔伽'))dmgBonus-=attr.staticAttr.dmg.plus;
      if(originalRx==='coloringDmg'&&element!==ownElement)dmgBonus+=calc(attr.coloringDmg);
      for(const t of tags)if(attr[t]){const b=attr[t];baseDmg+=calc(attr.atk)*b.pct/100;multi+=b.multi;plus+=b.plus;dmgBonus+=b.dmg;cr+=b.cpct;cd+=b.cdmg;defDown+=b.def;ignore+=b.ignore;}
      baseDmg=baseDmg*(1+multi/100)+plus;
      cr+=num(attr['cpct_'+element]);cd+=num(attr['cdmg_'+element]);
      if(SPECIAL.has(rx)){cr+=num(attr[rx+'Cpct']);cd+=num(attr[rx+'Cdmg']);}
      else {dmgBonus+=num(attr.allDmg)+(element==='physical'?0:num(attr.allElementDmg))+num(attr['dmg_'+element]);if(element!=='physical'&&tags.includes('a'))dmgBonus+=num(attr.aElementDmg);}
      const res=getRes(element,attr,config,scope),lv=ds.level;
      const def=(lv+100)/((lv+100)+(num(config.enemy?.level,100)+100)*(1-clamp(defDown/100,0,1))*(1-clamp(ignore/100,0,1)));
      const critical=1+Math.max(cd,0)/100,em=Math.max(0,calc(attr.mastery)),critMult=crit(cr,cd);
      const normal=baseDmg*Math.max(0,1+dmgBonus/100)*def*res;
      let avg=normal*critMult,hit=normal*critical,kind='normal',reactionTrace={},indirectFlatUsage=[],flatFactor=Math.max(0,1+dmgBonus/100)*def*res*critMult,flatCritFactor=Math.max(0,1+dmgBonus/100)*def*res*critical;
      const coverage=clamp(num(item.coverage,100)/100,0,1);
      if(rx==='vaporize'||rx==='melt') {
        const ratio=rx==='vaporize'?(element==='hydro'?2:1.5):(element==='pyro'?2:1.5);
        let extra=0;const applications=[];
        for(const b of scope==='team'?config.reactionBonuses||[]:[])if(b.reaction===rx&&coverage>0){const used=num(reactionUsage['reaction:'+b.auditId]),n=Math.min(Math.max(0,b.quota-used),num(item.count,1));if(n>0){extra+=b.value*n/num(item.count,1);reactionUsage['reaction:'+b.auditId]=used+n;applications.push({id:b.auditId,owner:b.owner,source:b.title,category:b.category||'角色',key:rx,value:b.value,count:n,quota:b.quota,type:'limitedReaction'});}}
        const mult=ratio*(1+25*em/(9*(1400+em))+(num(attr[rx])+extra)/100);
        reactionTrace={amplificationFactor:1+coverage*(mult-1),...(applications.length?{teamReactionApplications:applications}:{})};
        avg*=1+coverage*(mult-1);hit*=1+coverage*(mult-1);kind='amplifying';
        flatFactor*=1+coverage*(mult-1);flatCritFactor*=1+coverage*(mult-1);
      } else if(rx==='aggravate'||rx==='spread') {
        const additive=(rx==='aggravate'?1.15:1.25)*levelMultiplier(lv)*(1+5*em/(1200+em)+num(attr[rx])/100);
        reactionTrace={additiveBase:additive*coverage};
        const extra=additive*Math.max(0,1+dmgBonus/100)*def*res*coverage;
        avg+=extra*critMult;hit+=extra*critical;kind='additive';
      } else if(TRANSFORM[rx]!==undefined) {
        const trans=TRANSFORM[rx]*levelMultiplier(lv)*(1+16*em/(2000+em)+(num(attr[rx])+num(rx==='swirl'&&element==='cryo'?attr.swirlCryo:0))/100)+num(attr.fyplus);
        const nahida=!!config.conditions?.nahidaC2 && ['bloom','hyperBloom','burgeon','burning'].includes(rx) && scope==='team';
        const lauma=(scope==='team'&&config.conditions?.laumaInitialCrit||config.character==='菈乌玛'&&params.Moonsign<2&&params.laumaSkillActive===true)&&['bloom','hyperBloom','burgeon'].includes(rx);
        const fixedCrit=1+(nahida?0.2:0)+(lauma?0.15:0);
        reactionTrace={reactionBonus:num(attr[rx])+num(rx==='swirl'&&element==='cryo'?attr.swirlCryo:0),fixedCritRate:(nahida?20:0)+(lauma?15:0),fixedCritDamage:nahida||lauma?100:0};
        avg=trans*res*fixedCrit*coverage;hit=trans*res*(nahida||lauma?2:1)*coverage;kind='transformative';flatFactor=res*fixedCrit;flatCritFactor=res*(nahida||lauma?2:1);
      } else if(SPECIAL.has(rx)) {
        const boost=num(attr.fypct)+num(attr[rx+'Base']),flat=num(attr.fyplus)+num(attr[rx+'Flat'])+num(dynamic.specialFlat),elev=num(attr.elevated)+num(attr[rx+'Elevated']);
        const specialBase=talent==='fy'?levelMultiplier(lv):baseDmg*(1+num(attr[rx+'Multi'])/100);
        const b=specialUncrit(rx,specialBase,em,num(attr[rx])+num(dynamic.specialBonus),boost,flat,res,elev,params,talent==='fy');
        reactionTrace={specialBase,baseBonus:boost,specialBonus:num(attr[rx])+num(dynamic.specialBonus),specialFlat:flat,elevation:elev,masteryBonus:6*em/(2000+em)};
        flatFactor=critMult*res*(1+elev/100);flatCritFactor=critical*res*(1+elev/100);
        if(talent==='fy') {
          const people=[{base:b,cr,cd,elevation:elev}];
          if(scope==='team')for(const p of (config.contributors||[]).filter(p=>p.enabled!==false).slice(0,3)) {
            const teammateRes=res;
            people.push({base:specialUncrit(rx,levelMultiplier(num(p.level,90)),num(p.mastery),num(p.bonus),num(p.baseBonus),num(p.flat),teammateRes,num(p.elevation),params,true),cr:num(p.cpct),cd:num(p.cdmg),elevation:num(p.elevation)});
          }
          for(const f of (scope==='team'?config.flatBuffs||[]:[]).filter(f=>!f.directOnly&&f.reactions?.includes(rx))){
            let assigned=item.contributorFlatHits;
            if(assigned===undefined&&config._metric)assigned=people.map((_,i)=>i===0?1:0);
            if(typeof assigned==='string'){try{assigned=JSON.parse(assigned);}catch{throw new Error('间接反应平铺分配需要JSON数组或按来源的对象。');}}
            const vector=Array.isArray(assigned)?assigned:assigned?.[f.id];
            if(!Array.isArray(vector)||vector.length!==people.length)throw new Error(f.source+' 对间接反应提供平铺增益：请按主角色及已填贡献人顺序给出 '+people.length+' 项分配，例如 [1,0]；必须在贡献排序之前计算，不能作为最终统一加伤。');
            let consumed=0;
            vector.forEach((n,i)=>{if(!Number.isFinite(Number(n))||n<0||n>1)throw new Error('每个间接反应贡献人本次平铺次数需在0–1之间；多个反应事件请使用循环次数。');consumed+=Number(n);people[i].base+=f.value*Number(n)*res*(1+people[i].elevation/100);});
            indirectFlatUsage.push({source:f.source,count:consumed,quota:f.quota});
            if(f.auditId&&consumed>0){reactionTrace.teamFlatApplications??=[];reactionTrace.teamFlatApplications.push({id:f.auditId,owner:f.owner,source:f.source,category:f.category||'角色',key:'flat',value:f.value,count:consumed*num(item.count),quota:f.quota,type:'flat'});}
          }
          avg=indirectExpected(people,config.conditions?.reactionOwnership==='owner')*coverage;
          hit=indirectExpected(people.map(p=>({...p,cr:100})),config.conditions?.reactionOwnership==='owner')*coverage;kind='indirect';
        }else{avg=b*critMult;hit=b*critical;kind='direct';}
      }else if(talent==='fy'){avg=0;hit=0;kind='inactive';}
      if(trace)calls.push({kind,rx:rx||'none',requested:rxRequested||'none',forcedApplied,element,tags,base:baseDmg,pct,attack:calc(attr.atk),hp:calc(attr.hp),defense:calc(attr.def),recharge:calc(attr.recharge),independentMultiplier:1+multi/100,dmgBonus,cr,cd,em,def,res,avg,hit,...reactionTrace,indirectFlatUsage,flatFactor,flatCritFactor,coverage:coverage*100,specialFactor:SPECIAL.has(rx)?specialFactor(rx,params,talent==='fy'):undefined});
      return {avg,dmg:hit};
    }
    damage.basic=(base=0,talent=false,rx=false,dynamic=false,params=false)=>damage(0,talent,rx,base,'basic',dynamic,params);
    damage.reaction=(rx=false,params=false,talent='fy')=>damage(0,talent,rx,0,'basic',false,params);
    damage.dynamic=(pct=0,talent=false,dynamic=false,rx=false,params=false)=>damage(pct,talent,rx,0,'talent',dynamic,params);
    damage.swirl=()=>damage.reaction('swirl');
    damage.heal=n=>({avg:n*(1+calc(attr.heal)/100+attr.heal.inc/100),kind:'heal'});
    damage.shield=n=>({avg:n*calc(attr.shield)/100*attr.shield.inc/100,kind:'shield'});
    damage.projection=(base,coefficient,flat)=>{
      if(item.reaction&&!['native','none'].includes(item.reaction))throw new Error('尼可投影没有元素附着，不能触发所选反应。');
      const element=character(config.character).element,cr=calc(attr.cpct)+num(attr['cpct_'+element]),cd=calc(attr.cdmg)+num(attr['cdmg_'+element]);
      const dmgBonus=calc(attr.dmg)+num(attr.allDmg)+num(attr.allElementDmg)+num(attr['dmg_'+element]);
      const level=ds.level,def=(level+100)/((level+100)+(num(config.enemy?.level,100)+100)*(1-clamp(attr.enemy.def/100,0,1))*(1-clamp(attr.enemy.ignore/100,0,1))),res=getRes(element,attr,config,scope);
      const uncrit=base*Math.max(0,1+dmgBonus/100)*def*res,avg=uncrit*crit(cr,cd),hit=uncrit*(1+Math.max(0,cd)/100);
      if(trace)calls.push({kind:'normal',projection:true,rx:'独立投影',element,tags:[],base,pct:coefficient,projectionFlat:flat,attack:calc(attr.atk),hp:calc(attr.hp),defense:calc(attr.def),recharge:calc(attr.recharge),dmgBonus,cr,cd,em:calc(attr.mastery),def,res,avg,hit,flatFactor:0,flatCritFactor:0,coverage:0});
      return {avg,dmg:hit};
    };
    return damage;
  }
  function isDamageDetail(detail) {if(typeof detail==='function')return true;return detail.damageMetric!==false&&!/治疗|治愈|护盾|盾量|伤害减免|体力恢复|充能.*加成|能量恢复|提升队友伤害|提供.*(?:加成|伤害)|羽毛提升|攻击力提升|基础伤害提升值|伤害增加|伤害提升值|每层羽毛/.test(detail.title||'');}
  function resolveDetail(config,index) {
    if(['nicole-q','nicole-c1'].includes(index)){
      const resolved=config._teamResolved?config:global.GTeam?.resolve(config,{strict:false});
      const p=resolved?.teamProjections?.find(p=>p.id===index);
      return {title:index==='nicole-q'?'尼可Q投影（由主角色造成）':'尼可C1合一投影（由主角色造成）',teamOnly:true,projection:index,dmg:({attr,calc},dmg)=>{if(!p)throw new Error('尼可投影对应的技能或命座状态尚未生效。');return dmg.projection(calc(attr.atk)*p.coefficient/100+p.flat,p.coefficient,p.flat);}};
    }
    const raw=RULES[config.character]?.details[index];
    if(typeof raw!=='function')return raw;
    const c=character(config.character);let weapon;try{weapon=getWeapon(config,c);}catch{weapon={name:config.weapon||'',affix:config.refine||1,refine:config.refine||1};}return raw({cons:config.cons,weapon:{...weapon,affix:weapon.refine},talent:talentFor(c,config),profile:config});
  }
  function defaultRotation(key,cons=0) {
    const r=RULES[key];
    const presets={
      '那维莱特':[[0,1],[1,1],[3,1]],'胡桃':[[1,8],[2,1]],'艾尔海森':[[3,12],[2,6],[1,1],[4,1]],
      '兹白':[[0,12],[2,4],[3,4],[4,1],[5,1]],'奈芙尔':[[0,3],[1,3],[2,3],[3,3],[4,3],[5,1],[6,1]],
      '菲林斯':[[0,3],[1,1],[2,2],[3,1]],'薇斯纳':[[2,1],[3,1]],'奥黛塔':[[1,1]],
      '荒泷一斗':[[0,8],[1,2],[2,2]],'诺艾尔':[[2,8],[3,8]],'珊瑚宫心海':[[4,5]],
      '玛薇卡':[[1,8],[3,1]],'丝柯克':[[0,12],[1,3]],'阿蕾奇诺':[[0,1],[2,1]],
      '雷电将军':[[1,1],[2,6]],'宵宫':[[0,6],[2,3]],'娜维娅':[[3,2],[0,8],[4,8]],'久岐忍':[[1,1],[3,10]],'早柚':[[r.details.length-1,1]],'布伦妮':[[1,1],[2,1],[3,1],[4,4]],'多莉':[[0,1]],'旅行者·雷':[[0,1]]
    };
    let list=global.GCharacterFixes?.defaults[key]||presets[key];
    if(!list){let idx=typeof r.defDmgIdx==='number'?r.defDmgIdx:0;if(!isDamageDetail(r.details[idx]||{})||(r.details[idx]?.cons||0)>cons)idx=r.details.findIndex(d=>isDamageDetail(d)&&(d.cons||0)<=cons);list=[[Math.max(0,idx),1]];}
    return list.filter(([index])=>r.details[index]&&isDamageDetail(r.details[index])&&(r.details[index].cons||0)<=cons).map(([index,count])=>({index,count,reaction:'native',coverage:100}));
  }
  function defaultConfig(key='那维莱特') {
    const c=character(key)||DATA.characters[0];const attrs=RULES[c.key].mainAttr||'atk';
    const scale=attrs.startsWith('hp')?'hpPct':attrs.startsWith('def')?'defPct':c.key==='奈芙尔'?'mastery':'atkPct';
    let weapon=signatures[c.key]||defaultWeapon[c.weapon];
    if(!DATA.weapons.some(w=>w.name===weapon&&w.type===c.weapon))weapon=defaultWeapon[c.weapon];
    return {character:c.key,travelerGender:'female',level:90,cons:0,talents:{a:10,e:10,q:10},weapon,refine:weapon==='「渔获」'?5:1,
      customWeapon:{base:510,bonusKey:'none',bonus:0},mains:{sands:scale,goblet:c.key==='奈芙尔'?'mastery':'dmg',circlet:c.key==='珊瑚宫心海'?'heal':'cdmg'},sets:[],
      budget:30,allocationView:'both',artifactStarts:[4,4,4,4,4],rollQuality:'average',autoMains:false,physical:false,minRecharge:{solo:100,team:100},rotation:defaultRotation(c.key),
      team:{},contributors:[],disabledBuffs:[],parameters:{solo:{},team:{}},enemy:{level:100,resistance:10,resistances:{}},
      normalizedBudget:true,goal:'rotation',singleIndex:c.key==='那维莱特'?0:defaultRotation(c.key)[0]?.index||0,singleReaction:'native',singleCoverage:100,singleParams:{},
      panelMode:'artifacts',panelSettings:{hpPct:100},panelExtra:{atkPct:''},artifactPanel:artifactMainStats({sands:scale,goblet:c.key==='奈芙尔'?'mastery':'dmg',circlet:c.key==='珊瑚宫心海'?'heal':'cdmg'}),
      supportMode:'full',teammates:[],teamRows:[],reservedRechargeRolls:{solo:0,team:0},conditions:{onField:true,currentHpPct:c.key==='胡桃'?49:100,moonsign:1,hexerei:false,homework:false,stellarHits:0,vortexHits:0,neuvStacks:0,skirkStacks:0,skirkRifts:0,skirkSerpent:45,lohenStacks:0,lohenMasterful:false,lohenCryoReactionActive:false,lohenNormalBuffActive:false,lohenHighSpirits:false,vesnaOrder:0,vesnaRadiance:false,vesnaArmed:false,nahidaQFieldActive:false,nahidaMarked:false,nahidaMarkedEnemies:0,arleBond:0,arleC6SkillBuff:false,mavuikaFightingSpirit:100,mavuikaQBuffDmg:0,mavuikaBurstActive:false,mavuikaNightsoulBurstActive:false,mavuikaC1Active:false,skirkSpecialQActive:false,veil:0,soloResolve:0,teamResolve:0,vesnaCryoAnemo:1,vesnaOthers:0,otherPyro:0,naviaElements:0,pyroAura:true,swirlElement:'pyro',absorbedElement:'pyro',reactionOwnership:'owner'},
      panel:{hp:'',atk:'',def:'',mastery:'',cpct:'',cdmg:'',recharge:'',dmg:'',phy:0,heal:0}};
  }
  function marginal(config,panel=config.panel) {
    if(config.panelMode==='artifacts')panel={mode:'artifacts',stats:config.artifactPanel||{}};
    else panel={mode:'resident',values:panel};
    const unit=rollUnits(config),costs=rollCosts(config),result={};
    for(const scope of ['solo','team']) {
      try {
      const ctx=prepare(config,scope,panel),base=ctx.evaluate({},true);
      const changes=Object.keys(unit).map(key=>{const next=ctx.evaluate({[key]:1}),rawNext=ctx.evaluate({[key]:costs[key]});return {key,name:LABELS[key],increment:unit[key],rawCost:costs[key],rawRate:100*(rawNext/base.total-1),rawIncrement:rollUnits(config,false)[key],after:next,delta:next-base.total,rate:100*(next/base.total-1)};});
      changes.sort((a,b)=>b.rate-a.rate);if(scope==='team'&&global.GTeam)base.teamAudit=global.GTeam.audit(config,base,{},panel,config.mains);result[scope]={base,changes,inputMains:{...config.mains}};
      } catch(error){result[scope]={error:error.message};}
    }
    return result;
  }
  function capacity(mains,key,config) {
    if(config&&global.GArtifact)return global.GArtifact.capacity(config,mains,key);
    const blocked=Object.values(mains||{}).filter(x=>x===key).length+(key==='hpPlus'||key==='atkPlus'?1:0);
    return (5-blocked)*6*(config?rollCosts(config)[key]:1);
  }
  // Construct a witness: four different substats per artifact and at most five upgrades.
  function distributeRolls(allocation,mains,maxNodes=80000) {
    const keys=Object.keys(allocation).filter(k=>allocation[k]>0);
    const slots=[{name:'生之花',main:'hpPlus'},{name:'死之羽',main:'atkPlus'},{name:'时之沙',main:mains.sands},{name:'空之杯',main:mains.goblet},{name:'理之冠',main:mains.circlet}];
    let nodes=0;const memo=new Set();
    function dfs(i,remaining) {
      if(++nodes>maxNodes)return null;
      if(i===5)return remaining.every(v=>v===0)?[]:null;
      const signature=i+':'+remaining.join(',');if(memo.has(signature))return null;
      if(remaining.reduce((a,b)=>a+b,0)>(5-i)*9)return null;
      for(let k=0;k<keys.length;k++){const future=slots.slice(i).filter(s=>s.main!==keys[k]).length*6;if(remaining[k]>future)return null;}
      const patterns=[];
      function gen(k,values,total,distinct,extra) {
        if(distinct>4||extra>5||total>9)return;
        if(k===keys.length){patterns.push({values:values.slice(),total,distinct});return;}
        const max=slots[i].main===keys[k]?0:Math.min(6,remaining[k],9-total);
        for(let n=max;n>=0;n--){values[k]=n;gen(k+1,values,total+n,distinct+(n>0?1:0),extra+Math.max(0,n-1));}
      }
      gen(0,[],0,0,0);
      patterns.sort((a,b)=>b.total-a.total||b.distinct-a.distinct);
      for(const p of patterns){const rem=remaining.map((v,k)=>v-p.values[k]);const next=dfs(i+1,rem);if(next){const useful=Object.fromEntries(keys.map((k,j)=>[k,p.values[j]]).filter(([,n])=>n));return [{...slots[i],useful,otherInitial:Math.max(0,4-p.distinct)},...next];}}
      memo.add(signature);return null;
    }
    const witness=dfs(0,keys.map(k=>allocation[k]));return {witness,nodes,exhausted:nodes>maxNodes};
  }
  async function optimize(config,scope='solo',onProgress=()=>{}) {
    const budget=num(config.budget);if(budget<0||budget>60)throw new Error('有效等效副词条总数需在0–60之间，可填写小数。');
    const unit=config._rollUnits||rollUnits(config);
    let calls=0,best=null;
    const pool=Object.keys(ROLLS);
    const initialCtx=prepare(config,scope),initial=initialCtx.evaluate({});
    const probe=Object.fromEntries(pool.map(k=>[k,Math.min(Math.max(10,budget),capacity(config.mains,k,config))]));
    const active=pool.filter(k=>initialCtx.evaluate({[k]:Math.max(10,capacity(config.mains,k,config))})>initial*(1+1e-10)||initialCtx.evaluate(probe)>initialCtx.evaluate({...probe,[k]:0})*(1+1e-10)),effectiveKeys=active.slice();
    const merged={};
    for(const [pct,flat]of [['atkPct','atkPlus'],['hpPct','hpPlus'],['defPct','defPlus']])if(active.includes(pct)&&active.includes(flat)){
      const a=initialCtx.evaluate({[pct]:10}),b=initialCtx.evaluate({[flat]:10});
      if(Math.abs(a-b)<Math.max(1,initial)*1e-10){merged[pct]=flat;active.splice(active.indexOf(flat),1);}
    }
    if(!active.length&&budget>0)throw new Error('当前目标没有能继续提升伤害的有效副词条，请检查输出技能或属性封顶。');
    const mainCandidates=config.autoMains?generateMainCandidates(config,active):[config.mains];
    const yieldFrame=()=>new Promise(r=>setTimeout(r,0));
    for(let m=0;m<mainCandidates.length;m++) {
      const mains=mainCandidates[m],ctx=prepare(config,scope,null,mains),caps=Object.fromEntries(active.map(k=>[k,capacity(mains,k,config)+(merged[k]?capacity(mains,merged[k],config):0)]));
      const checkER=num(config.minRecharge?.[scope],100)>100;
      const expanded=a=>{const out={...a};for(const [pct,flat]of Object.entries(merged)){const n=a[pct]||0,max=capacity(mains,pct,config);out[pct]=Math.min(n,max);if(n>max)out[flat]=n-max;}return out;};
      const evaluate=a=>{calls++;if(global.GArtifact&&!global.GArtifact.checkBounds(config,expanded(a),mains,scope).ok)return -Infinity;if(!checkER)return ctx.evaluate(a);const res=ctx.evaluate(a,true);if(num(res.panel.recharge)<num(config.minRecharge?.[scope],100)-1e-8)return -Infinity;return res.total;};
      const cache=new Map();
      const score=a=>{const k=active.map(t=>a[t]||0).join(',');if(cache.has(k))return cache.get(k);const v=evaluate(a);cache.set(k,v);return v;};
      const starts=[];
      const basePanel=ctx.evaluate({},true).panel;
      const required=num(config.minRecharge?.[scope],100);
      if(num(basePanel.recharge)<required-1e-8&&!active.includes('recharge'))throw new Error('当前固定充能只有'+basePanel.recharge.toFixed(2)+'%，低于所设 '+required+'%。请单独增加保留的充能词条，不消耗直接增伤预算。');
      for(let focus=-1;focus<active.length;focus++) {
        const a=Object.fromEntries(active.map(k=>[k,0]));let left=budget;
        if(focus>=0){const k=active[focus],n=Math.min(left,caps[k]);a[k]=n;left-=n;}
        for(let pass=0;pass<10&&left>1e-8;pass++){
          const available=active.filter(k=>a[k]<caps[k]-1e-8);if(!available.length)break;
          const part=left/available.length;for(const k of available){const n=Math.min(part,caps[k]-a[k]);a[k]+=n;left-=n;}
        }
        if(left<1e-6)starts.push(a);
      }
      let local=null;
      for(const start of starts) {
        let a={...start},value=score(a);
        for(let iteration=0;iteration<(mainCandidates.length>1?5:12);iteration++) {
          let improved=false;
          for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++) {
            const x=active[i],y=active[j],sum=a[x]+a[y];let chosen=a[x],next=value;
            const lo=Math.max(0,sum-caps[y]),hi=Math.min(caps[x],sum);
            const sample=n=>{const v=score({...a,[x]:n,[y]:sum-n});if(v>next+1e-8){next=v;chosen=n;}return v;};
            sample(lo);sample(hi);for(let n=Math.ceil(lo);n<hi;n++)sample(n);
            let l=Math.max(lo,chosen-1),r=Math.min(hi,chosen+1);
            for(let refine=0;refine<17&&r-l>.0005;refine++){const p=l+(r-l)*.38196601125,q=l+(r-l)*.61803398875;const vp=sample(p),vq=sample(q);if(vp>vq)r=q;else l=p;}
            if(Math.abs(chosen-a[x])>.0001){a[x]=chosen;a[y]=sum-chosen;value=next;improved=true;}
          }
          if(!improved)break;
        }
        if(Number.isFinite(value)&&(!local||value>local.value))local={allocation:a,value};
      }
      if(local&&config.physical&&config.normalizedBudget===false){
        let placement=distributeRolls(local.allocation,mains);
        if(!placement.witness){
          // Search nearby feasible allocations; unlike pool optimization, this is explicitly a numerical recommendation.
          const ranked=[];
          for(const x of active)for(const y of active)if(x!==y&&local.allocation[x]>0&&local.allocation[y]<caps[y]) {
            for(let n=1;n<=Math.min(4,local.allocation[x],caps[y]-local.allocation[y]);n++){
              const a={...local.allocation,[x]:local.allocation[x]-n,[y]:local.allocation[y]+n};ranked.push({allocation:a,value:score(a)});
            }
          }
          ranked.sort((a,b)=>b.value-a.value);
          for(const candidate of ranked.slice(0,60)){const p=distributeRolls(candidate.allocation,mains,18000);if(p.witness){local=candidate;placement=p;break;}}
        }
        if(!placement.witness)local=null;else local.placement=placement.witness;
      }
      if(local&&(!best||local.value>best.value))best={...local,mains:{...mains}};
      if(m%2===0){onProgress((m+1)/mainCandidates.length);await yieldFrame();}
    }
    if(!best)throw new Error('当前有效预算、五件副词条数量限制与额外保留充能无法同时满足。请核对预算、主属性、初始词条数和保留充能。');
    for(const [pct,flat]of Object.entries(merged)){const n=best.allocation[pct]||0,max=capacity(best.mains,pct,config);best.allocation[pct]=Math.min(n,max);if(n>max)best.allocation[flat]=n-max;}
    const ctx=prepare(config,scope,null,best.mains),ret=ctx.evaluate(best.allocation,true);
    const placement=config.normalizedBudget===false?(best.placement||distributeRolls(best.allocation,best.mains).witness):null;
    const costs=rollCosts(config);
    const marg=Object.keys(unit).map(key=>{const after=ctx.evaluate({...best.allocation,[key]:(best.allocation[key]||0)+1}),rawAfter=ctx.evaluate({...best.allocation,[key]:(best.allocation[key]||0)+costs[key]});return {key,name:LABELS[key],increment:unit[key],rawCost:costs[key],rawIncrement:rollUnits(config,false)[key],rawRate:(rawAfter/ret.total-1)*100,rate:(after/ret.total-1)*100};}).sort((a,b)=>b.rate-a.rate);
    const material=global.GArtifact?.recommend(config,scope,best.allocation,effectiveKeys,best.mains);
    if(scope==='team'&&global.GTeam){ret.teamAudit=global.GTeam.audit(config,ret,best.allocation,null,best.mains);if(material&&!material.error)material.teamAudit=global.GTeam.audit(config,material,material.effectiveAll||material.allocation,null,best.mains);}
    return {...best,...ret,placement,active,calls,material,method:'多起点连续分配搜索，包含五件总数和共同强化的必要约束；未宣称严格全局最优',mainCandidates:mainCandidates.length,marginal:marg};
  }
  function generateMainCandidates(config,active) {
    const scale=active.filter(k=>['atkPct','hpPct','defPct','mastery'].includes(k));
    const sands=[...new Set([...scale,...(active.includes('recharge')?['recharge']:[])])];
    const goblets=[...new Set(['dmg',...(config.mains.goblet==='phy'?['phy']:[]),...scale])];
    const circlets=[...new Set([...active.filter(k=>['cpct','cdmg'].includes(k)),...scale,...(config.character==='珊瑚宫心海'?['heal']:[])])];
    const result=[];for(const s of sands)for(const g of goblets)for(const c of circlets)result.push({sands:s,goblet:g,circlet:c});
    return result.length?result:[config.mains];
  }
  function outOfCombatPanel(config,rolls={},panel=null,mains=config.mains) {
    if(global.GResident&&(!panel||['artifacts','resident'].includes(panel.mode)))return global.GResident.forward(config,rolls,panel,mains);
    const c=character(config.character),w=getWeapon(config,c),attr=createAttr(config,c,w,rolls,panel,mains);
    const ds={characterName:c.key,attr,calc,element:ELEMENT[c.element],params:paramsFor(config,c,{},'solo'),cons:config.cons,refine:w.refine-1,weapon:w,talent:talentFor(c,config),weaponTypeName:WEAPON[c.weapon]};
    if(!panel||panel.mode==='artifacts')for(const b of buffList(config))if((b.isStatic||b.staticSet||c.key==='珊瑚宫心海'&&/暴击率降低100/.test(b.title||''))&&buffAllowed(b,ds,'solo',config,c))for(const [k,v] of Object.entries(b.data||{}))add(attr,k,typeof v==='function'?v(ds):v);
    return panelValues(attr);
  }
  function artifactMainStats(mains){const stats=Object.fromEntries([...Object.keys(ROLLS),'dmg','phy','heal'].map(k=>[k,0]));stats.hpPlus=4780;stats.atkPlus=311;for(const k of Object.values(mains||{}))if(MAIN[k])stats[k]+=MAIN[k];return stats;}
  global.GEngine={ELEMENT,WEAPON,ROLLS,MAX_ROLLS,MAIN,LABELS,TRANSFORM,SPECIAL,character,getStats,getWeapon,talentFor,calc,Stat,defaultConfig,defaultRotation,outOfCombatPanel,resolveDetail,rollUnits,rollCosts,
    selfBuffs,buffList,weaponBuffs,artifactBuffs,createAttr,add,buffAllowed,isDamageDetail,isTeamBuff,constellationAllows,paramsFor,prepare,optimize,marginal,resistance,levelMultiplier,specialFactor,specialUncrit,indirectExpected,distributeRolls,capacity,panelValues,artifactMainStats,stateFields,STATE_FIELDS,hasFlatBuffs:config=>global.GTeam?.hasFlatBuffs(config)||global.GCharacterFixes?.hasFlat(config)||config.weapon==='裁叶萃光'||config.sets?.some(s=>s.name==='昔时之歌'&&s.count>=4)};
  if(typeof module!=='undefined')module.exports=global.GEngine;
  if(typeof require==='function'&&!global.GResident)require('./resident-panel.js');
})(typeof globalThis!=='undefined'?globalThis:this);
