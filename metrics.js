/* Fixed damage benchmarks. Each benchmark uses the same definition in solo/team.
 * References and independent checks: research/*-metrics-audit.md and
 * research/sandrone-crosscheck.md. No player rotation is inferred. */
(function(g){
  'use strict';
  const E=g.GEngine,R=g.GRULES,D=g.GDATA,clone=o=>JSON.parse(JSON.stringify(o));
  const row=(index,params={},count=1)=>({index,count,reaction:'native',coverage:100,params});
  const ownDefaults={
    '胡桃':{hutaoSkillActive:true,currentHpPct:49},
    '神里绫华':{ayakaEActive:true,ayakaDashActive:true},
    '甘雨':{ganyuA1Active:true},
    '刻晴':{keqingInfused:true},
    '宵宫':{yoimiyaSkillActive:true,yoimiyaA1Stacks:10,yoimiyaC2Active:true},
    '魈':{xiaoBurstActive:true},
    '流浪者':{wandererSkillActive:true},
    '荒泷一斗':{ittoBurstActive:true},
    '诺艾尔':{noelleBurstActive:true},
    '神里绫人':{ayatoSkillActive:true,ayatoNamisenStacks:4},
    '珊瑚宫心海':{kokomiBurstActive:true},
    '八重神子':{yaeRank:3},
    '纳西妲':{nahidaMarked:true},
    '雷电将军':{raidenEyeActive:true},
    '阿蕾奇诺':{BondOfLife:145},
    '玛薇卡':{mavuikaFightingSpirit:100,mavuikaBurstActive:true},'玛拉妮':{mualaniWaveStacks:3},
    '薇斯纳':{vesnaArmed:true},
    '洛恩':{奇谋:true,lohenMasterful:true},
    '可莉':{kleeSparkActive:true},
    '艾梅莉埃':{emilieBurning:true},
    '布伦妮':{pruneHuntActive:true},
    '兹白':{zibaiShiftActive:true},
    '菈乌玛':{laumaDewSpent:3},
    '哥伦比娅':{columbinaDewRemaining:1}
  };
  const lunar={
    '菲林斯':{2:'lunarCharged',3:'lunarCharged',4:'lunarCharged',5:'lunarCharged',6:'lunarCharged',7:'lunarCharged',8:'lunarCharged'},
    '伊涅芙':{4:'lunarCharged',5:'lunarCharged',6:'lunarCharged',7:'lunarCharged'},
    '奈芙尔':{2:'lunarBloom',3:'lunarBloom',4:'lunarBloom',8:'lunarBloom'},
    '兹白':{1:'lunarCrystallize',3:'lunarCrystallize',5:'lunarCrystallize',6:'lunarCrystallize'},
    '哥伦比娅':{0:'lunarBloom',3:'lunarCharged',4:'lunarBloom',5:'lunarCrystallize',6:'lunarCharged',7:'lunarBloom',8:'lunarCrystallize'},
    '莉奈娅':{1:'lunarCrystallize',2:'lunarCrystallize'},
    '菈乌玛':{1:'lunarBloom',5:'lunarBloom',6:'lunarBloom'},'爱诺':{4:'lunarCharged'}
  };
  const stellar={'薇斯纳':{4:'stellarSwirl',5:'stellarSwirl',6:'stellarSwirl',8:'stellarSwirl'},'旅行者·冰':{2:'stellarConduct',4:'stellarConduct'},'莱欧斯利':{7:'stellarConduct'},'赛诺':{3:'stellarConduct',8:'stellarConduct',9:'stellarConduct'},'八重神子':{6:'stellarConduct',8:'stellarConduct'},'七七':{2:'stellarConduct'},'梦见月瑞希':{2:'stellarSwirl',6:'stellarSwirl',9:'stellarSwirl'}};
  const names={stellarConduct:'星超导',stellarSwirl:'星扩散',lunarCharged:'月感电',lunarBloom:'月绽放',lunarCrystallize:'月结晶'};
  function fieldMinCons(key){return ({zibaiRadianceSpent:6})[key]||Number(/C([1-6])/.exec(key)?.[1]||0);}
  function skirkResourceInfo(config){const fromE=45+(Number(config.cons)>=2?10:0),extraCap=Number(config.cons)>=2?22:12,threshold=50+extraCap,requiredRifts=Math.max(0,Math.ceil((threshold-fromE)/8));return {fromE,extraCap,threshold,requiredRifts,defaultSerpent:fromE+8*requiredRifts};}
  function fullSelfStates(config){
    const c=Number(config.cons)||0,key=config.character,metric=config._metric||{},states=config.metricSettings?.states||{};
    const maps={
      '胡桃':{hutaoSkillActive:true,currentHpPct:49,hutaoC6Active:c>=6},
      '神里绫华':{ayakaEActive:true,ayakaDashActive:true,ayakaC4Active:c>=4,ayakaC6Active:c>=6},
      '甘雨':{ganyuA1Active:true,ganyuQFieldActive:true,ganyuC1Active:c>=1,ganyuC4Stacks:c>=4?5:0},
      '莱欧斯利':{wrioSkillActive:true,wrioGraceActive:true,wrioEdictStacks:5,wrioRevelationUnlocked:true,currentHpPct:c>=1?100:59,wrioC1FifthActive:c>=1,wrioC1ChargeActive:c>=1},
      '刻晴':{keqingInfused:true,keqingQActive:true,keqingC4Active:c>=4,keqingC6Stacks:c>=6?4:0},
      '宵宫':{yoimiyaSkillActive:true,yoimiyaA1Stacks:10,yoimiyaC1Active:c>=1,yoimiyaC2Active:c>=2},
      '魈':{xiaoBurstActive:true,xiaoA1Stacks:5,xiaoEStacks:c>=6&&Number(config.enemy?.count||1)>=2?3:c>=1?2:1},
      '流浪者':{wandererSkillActive:true,wandererPointsSpent:c>=2?50:0,wandererPyroContact:true,wandererCryoContact:true},
      '那维莱特':{neuvStacks:3},'雷电将军':{raidenEyeActive:true,num:60},
      '丝柯克':{skirkStacks:3},
      '薇斯纳':{vesnaArmed:true,vesnaOrder:6},'洛恩':{奇谋:true,lohenMasterful:true,lohenHighSpirits:true,lohenNormalBuffActive:true,争胜:c>=1?300:100},
      '芙宁娜':{fanfare:c>=1?400:300,furinaC2HP:c>=2?140:0},
      '荒泷一斗':{ittoBurstActive:true,ittoC4Active:c>=4},'诺艾尔':{noelleBurstActive:true},
      '雷泽':{razorC1Active:c>=1,razorC4Active:c>=4,razorC6SigilActive:c>=6},
      '赛诺':{cynoBurstActive:true,cynoC2Stacks:c>=2?5:0,cynoStellarStacks:c>=2?5:0,cynoC1TogetherActive:c>=1},
      '林尼':{lyneyA1HatBuffActive:true,lyneyPropStacks:5,lyneyC2Stacks:c>=2?3:0,lyneyC4Active:c>=4},
      '千织':{chioriSkillActive:true},
      '阿贝多':{albedoSkillActive:true,albedoSilverActive:true,albedoC2Stacks:c>=2?4:0,albedoC6Active:c>=6},
      '神里绫人':{ayatoSkillActive:true,ayatoQFieldActive:true,ayatoNamisenStacks:c>=2?5:4},
      '珊瑚宫心海':{kokomiBurstActive:true,kokomiC6Active:c>=6},
      '八重神子':{yaeRevelationUnlocked:true,yaeRank:c>=2?4:3,yaeC1Active:c>=1,yaeC4Active:c>=4,yaeEnhancedActive:metric.requires==='yaeNewBolt'},
      '提纳里':{tighnariA1Active:true,tighnariC2Active:c>=2,tighnariC4Stage:c>=4?'reaction':'off'},
      '迪希雅':{dehyaC2Active:c>=2},'嘉明':{gamingC2Active:c>=2},
      '迪卢克':{dilucQAfterActive:true,dilucC2Stacks:c>=2?3:0,dilucC4Active:c>=4,dilucC6NormalActive:c>=6},
      '可莉':{kleeSparkActive:true,kleeBadges:3,kleeC1Active:c>=1,kleeC2Active:c>=2,kleeQAfterActive:c>=6},
      '艾梅莉埃':{emilieBurning:true,emilieC2Active:c>=2,emilieC6Active:c>=6},
      '艾尔海森':{haithamC2Stacks:c>=2?4:0,haithamC4Generated:0,haithamC6Active:c>=6},
      '玛拉妮':{mualaniWaveStacks:3,mualaniWaveWisdom:3,mualaniFirstBite:c>=1},
      '阿蕾奇诺':{BondOfLife:200},
      '玛薇卡':{mavuikaFightingSpirit:200,mavuikaQBuffDmg:c>=4?50:40,mavuikaBurstActive:true,mavuikaC1Active:c>=1,mavuikaNightsoulBurstActive:true},
      '兹白':{zibaiShiftActive:true,zibaiMoonfallActive:true,zibaiC4Splendor:c>=4,zibaiC6Active:c>=6,zibaiRadianceSpent:c>=6?100:70},
      '奈芙尔':{Veil_of_Falsehood:c>=2?5:3,neferShadowDanceActive:c>=4},'菲林斯':{flinsC2ShredActive:c>=2},
      '恰斯卡':{chascaC6OnslaughtActive:c>=6},'基尼奇':{kinichC2ShredActive:c>=2,kinichHunterStacks:2},
      '桑多涅':{sandronePrismPowerOver50:true,sandroneBeamC2Stacks:c>=2?3:0},
      '奥黛塔':{odetteSelfSplendor:c>=1?6:4,odetteBurstDreamActive:true,odetteImageActive:true},
      '沃雅妮莎':{vodySongActive:true,vodyShredActive:true,vodyC1HealActive:c>=1,vodyC4Stacks:c>=4?3:0,vodyResourcesActive:true,vodyResources:25},
      '杜林':{durinA4Remaining:10,durinC1Remaining:c>=1?20:0,durinC2Active:c>=2,durinC6WhiteShredActive:c>=6},
      '布伦妮':{pruneHuntActive:true,pruneC2HitStacks:c>=2?6:0,pruneRallyReactionActive:true,pruneC6Active:c>=6},
      '法尔伽':{varkaOathStacks:4,varkaC1WineAvailable:c>=1,varkaC4SwirlActive:c>=4},
      '雅珂达':{jahodaHealEmActive:true,jahodaFlaskFullActive:c>=6},
      '哥伦比娅':{columbinaMoonlitStacks:3,columbinaDomainActive:true,columbinaBrillianceActive:c>=2},
      '伊涅芙':{ineffaReconfigureActive:true,ineffaCompositeActive:true},
      '菈乌玛':{laumaSkillActive:true,laumaShredActive:true,laumaHymnActive:true,laumaHymnRemaining:18}
    };
    const v={...(maps[key]||{})};
    if(key==='沃雅妮莎'&&c>=2)v.vodyC2Voice=metric.reaction==='stellarSwirl'?'vortex':'voice';
    if(key==='哥伦比娅'&&c>=2&&metric.reaction?.startsWith('lunar'))v.columbinaBrillianceType=metric.reaction;
    if(key==='艾尔海森'&&c>=4&&metric.entries?.every(e=>{const d=E.resolveDetail(config,e.index);return !['q','q2','q3'].includes(d?.talent)&&!/["']q["']|talent\.q\b/.test(d?.dmg?.toString()||'');}))v.haithamC4Generated=3;
    if(key==='奥黛塔'&&/后台/.test(metric.title||'')&&c<6)v.odetteSelfSplendor=0;
    if(key==='沃雅妮莎'&&/后台/.test(metric.title||''))v.vodyResources=10;
    if(key==='杜林'&&states.durinForm==='dark')v.durinC6WhiteShredActive=false;
    return v;
  }
  function settings(config){
    const s={artifactMode:'full',weaponMode:'full',talentMode:'benchmark',ownBuffMode:'full',stellarHits:10,sandroneTactics:10,skirkSerpent:50,skirkSpecialQActive:false,skirkRifts:0,skirkC6Stacks:0,states:{},...(config.metricSettings||{}),states:{...(config.metricSettings?.states||{})}};
    if(s.ownBuffMode==='full'){Object.assign(s.states,fullSelfStates(config));s.sandroneTactics=10;s.skirkSerpent=skirkResourceInfo(config).defaultSerpent;s.skirkSpecialQActive=true;s.skirkRifts=3;}
    return s;
  }
  function defaultStates(config){
    const v={...(ownDefaults[config.character]||{})},s=settings(config),b=s.talentMode==='benchmark',c=config.conditions||{},key=config.character;
    if(key==='那维莱特')v.neuvStacks=b?3:Math.min(3,Number(c.neuvStacks||0)+(config.cons>=1?1:0));
    if(key==='雷电将军')v.num=b?60:Number(c.soloResolve||0);
    if(key==='薇斯纳'){v.vesnaOrder=b?6:Number(c.vesnaOrder||0);v.num1=b?3:Number(c.vesnaCryoAnemo||1);v.num2=b?1:Number(c.vesnaOthers||0);}
    if(key==='奈芙尔')v.Veil_of_Falsehood=b?(config.cons>=2?5:3):Number(c.veil||0);
    if(key==='洛恩')Object.assign(v,{争胜:b?(config.cons>=1?300:100):Number(c.lohenStacks||0),lohenHighSpirits:b||!!c.lohenHighSpirits,lohenNormalBuffActive:b||!!c.lohenNormalBuffActive});
    if(key==='纳西妲')Object.assign(v,{nahidaQFieldActive:true,nahidaMarked:true,nahidaMarkedEnemies:1});
    if(key==='芙宁娜')Object.assign(v,{fanfare:b?(config.cons>=1?400:300):Number(c.soloFanfare||0),furinaC2HP:b&&config.cons>=2?140:Number(c.furinaC2HP||0),furinaDrainers:b?4:1});
    if(key==='玛薇卡')Object.assign(v,{mavuikaFightingSpirit:b?200:Number(c.mavuikaFightingSpirit||100),mavuikaQBuffDmg:b?40:Number(c.mavuikaQBuffDmg||0),mavuikaNightsoulBurstActive:b||!!c.mavuikaNightsoulBurstActive});
    return s.ownBuffMode==='full'?{...v,...fullSelfStates(config)}:v;
  }
  function extraFields(config){
    const n=(key,label,max)=>[key,label,0,max,defaultStates(config)[key]??0];
    const fields={
      '那维莱特':[n('neuvStacks','古海孑遗目标总层数（包含C1；组队按可触发种类封顶）',3)],
      '雷电将军':[n('num','本次Q已有愿力（预叠状态）',60)],
      '薇斯纳':[n('vesnaOrder','本次技能整肃层数',6),['num1','天赋计数：冰/风人数',1,4,3],n('num2','天赋计数：其他元素人数',3)],
      '奈芙尔':[n('Veil_of_Falsehood','伪秘之帷层数（随命座上限；需满辉）',config.cons>=2?5:3)],
      '洛恩':[n('争胜','本次技能已有争胜',config.cons>=1?300:100),['lohenHighSpirits','乘兴：战技天赋+1有效','bool'],['lohenNormalBuffActive','已触发普重增伤','bool']],
      '纳西妲':[['nahidaQFieldActive','摩耶之殿领域有效','bool'],['nahidaMarked','目标带有蕴种印','bool'],n('nahidaMarkedEnemies','带有标记的敌人数',20)],
      '芙宁娜':[n('fanfare','本次已有气氛值',config.cons>=1?400:300),n('furinaC2HP','C2已获得生命提升 %',140),n('furinaDrainers','本次可消耗生命的角色数（组队按人数封顶）',4)],
      '玛薇卡':[n('mavuikaFightingSpirit','本次战意',200),n('mavuikaQBuffDmg','Q后当前伤害加成 %',config.cons>=4?50:40),['mavuikaNightsoulBurstActive','夜魂迸发攻击加成有效','bool']]
    };
    return fields[config.character]||[];
  }
  function definitions(config){
    const key=config.character,cons=Number(config.cons)||0;
    const make=(id,title,entries,extra={})=>({id,title,entries,...extra});
    if(key==='桑多涅'){
      const result=[];
      for(const [mode,rx]of [['sc','stellarConduct'],['ss','stellarSwirl']])for(const [part,index,label]of [['ca',1,'重击'],['q',5,'元素爆发'],['e',3,'第二枚棱晶弹']])result.push(make('sandrone-'+mode+'-'+part,label+names[rx]+'伤害',[row(index)],{reaction:rx,mode,recommended:mode==='sc'&&part!=='e',note:part==='q'?'只计算聚能光束；前三段轰炸是普通冰伤。':part==='ca'?'一次冷凝射线，不含普通冰伤扫射。':'本项是第二枚弹丸，功率强化条件可在详细条件调整。'}));
      if(cons>=4)result.push(make('sandrone-sc-c4','C4额外星超导（一次）',[row(6)],{reaction:'stellarConduct',mode:'sc'}));
      if(cons>=6)result.push(make('sandrone-sc-c6','C6额外星超导（单段）',[row(7,{sandroneC6ExtraHits:1})],{reaction:'stellarConduct',mode:'sc'}));
      result.push(make('sandrone-sweep','重击扫射（普通冰伤）',[row(0)]));
      return result;
    }
    if(key==='奈芙尔'){
      const c6=cons>=6;
      return [make('nefer-ca',c6?'开E后一次重击·月绽放总伤害（6命5段）':'开E后一次重击·三段月绽放总伤害',[row(2),row(3),row(4),...(c6?[row(1),row(8)]:[])],{reaction:'lunarBloom',partyReaction:'lunarBloom',recommended:true,note:c6?'统计虚影三段、6命转化的自身第二击和6命追加月绽放；不含自身第一击普通草伤。':'统计一次幻戏的虚影第1、2、3段月绽放；不含自身两次普通草伤。各段独立结算倍率和辅助限次附加伤害。'}),make('nefer-q','大招总伤害（两段，默认满帷增益）',[row(5),row(6)],{reaction:null,partyReaction:'lunarBloom',recommended:true,note:'大招两段均为普通草元素伤害，按施放前伪秘之帷计算增伤；队伍按月绽放状态准备辅助，不把大招转成月绽放。'})];
    }
    if(key==='丝柯克'){
      const i=R[key].details.findIndex(d=>d.metricKey==='skirk-n5');
      const special=settings(config).skirkSpecialQActive===true;
      const list=[make('skirk-n5',special?'点E → Q尽后一套普攻（N1—N5，7次）':'点E后一套普攻（未施放Q尽，7次）',[row(i)],{recommended:true,note:'默认点E后施放特殊Q尽，吸收3枚裂隙再打N1—N5。本指标只计7次普攻主体；吸收时C1晶刃与C6协同不混入。'}),make('skirk-q','长E吸裂隙 → Q灭（5段斩击＋末段）',[row(3)],{recommended:true,note:'默认从0狡谋长E吸足3枚裂隙，再施放普通Q灭；只计六段本体，不含吸收时的C1晶刃。普通Q不领取特殊Q尽的C2攻击。'})];
      if(cons>=6){const n=Math.max(0,Math.min(3,Number(settings(config).skirkC6Stacks)||0));list.push(make('skirk-n5-c6','一套普攻及当前C6协同',[row(i),...(n?[row(6,{},Math.min(n,2))]:[])],{note:'一套N5最多在N3、N5各消耗一层斩；不计受击分支。'}));list.push(make('skirk-q-c6','Q灭六段及当前C6斩层协同',[row(3),...(n?[row(5,{},n)]:[])],{note:'六段本体与每层750%攻击协同分别计算；协同不重复领取超额狡谋。'}));}
      return list;
    }
    if(key==='宵宫')return ['yoimiya-n5','yoimiya-n5-vape'].map(id=>make(id,id.endsWith('vape')?'开E一套普攻·标准三箭蒸发':'开E一套普攻总伤害（N1—N5，7箭）',[row(R[key].details.findIndex(d=>d.metricKey===id))],{recommended:true,note:'默认预叠A1十层；C2起预设已发生火暴击。蒸发项仅N1第一箭、N3、N5蒸发；不含Q和C6额外箭。'}));
    if(key==='兹白'){
      const note='每次E进入月转时隙后分别计首次/后续，其他属性与辅助状态相同；C1仅首次反应增伤+220%，不额外放大平铺。';
      return [make('detail-6','首次「灵驹飞踏」第二段伤害',[row(3)],{reaction:'lunarCrystallize',event:'zibai-first',recommended:true,note:cons>=1?note:'未解锁C1；同状态下首次与后续相同。'}),make('detail-3','后续「灵驹飞踏」第二段伤害',[row(3)],{reaction:'lunarCrystallize',event:'zibai-later',recommended:true,note}),make('detail-0','「月转时隙」普攻首段伤害',[row(0)]),make('detail-1','普攻第四击额外月伤（未持有月涣华）',[row(1)],{reaction:'lunarCrystallize',needsMoonsign2:true,event:'zibai-n4-normal'}),...(cons>=4?[make('zibai-n4-c4','C4月涣华强化·下一次普攻第四击额外月伤',[row(1)],{reaction:'lunarCrystallize',needsMoonsign2:true,event:'zibai-n4-enhanced',note:'灵驹命中取得月涣华，仅下一次N4消费，不将后续N4全部强化。'})]:[]),make('detail-2','「灵驹飞踏」第一段伤害',[row(2)]),make('detail-4','Q第一段伤害',[row(4)]),make('detail-5','Q第二段月结晶伤害',[row(5)],{reaction:'lunarCrystallize'})];
    }
    if(key==='玛拉妮'){
      const note=cons>=6?'C6每次巨浪均可触发C1，故其他条件相同时首次/后续相同。':'C1只提高每次E状态内首次巨浪；后续不领取这次66%生命平铺。';
      return [make('detail-2','首次巨浪鲨鲨撕咬·蒸发',[row(2)],{event:'mualani-first',recommended:true,note}),make('detail-1','后续巨浪鲨鲨撕咬·蒸发',[row(1)],{event:'mualani-later',recommended:true,note}),make('mualani-first-normal','首次巨浪鲨鲨撕咬（不蒸发）',[row(0)],{event:'mualani-first',note}),make('detail-0','后续巨浪鲨鲨撕咬（不蒸发）',[row(0)],{event:'mualani-later',note}),make('detail-3','爆瀑飞弹伤害',[row(3)]),make('detail-4','爆瀑飞弹·蒸发',[row(4)])];
    }
    const result=[];
    const helperIndices={'九条裟罗':[0],'坎蒂丝':[2],'砂糖':[2],'塔利雅':[3],'伊安珊':[3],'多莉':[1]};
    const minCons={'阿蕾奇诺':{1:2},'爱诺':{3:2},'艾梅莉埃':{6:6},'珐露珊':{2:6},'基尼奇':{1:2},'玛拉妮':{2:1},'尼可':{5:1},'赛诺':{7:6,9:6},'夏沃蕾':{3:2}};
    for(let i=0;i<R[key].details.length;i++){
      const d=E.resolveDetail(config,i);if(!d||!E.isDamageDetail(d)||d.cons>cons||/^基础普攻/.test(d.title||'')||/每层|提升值|伤害增加|持续时间|上限|恢复量/.test(d.title||''))continue;
      if(helperIndices[key]?.includes(i)||cons<(minCons[key]?.[i]||0))continue;
      if(key==='艾梅莉埃'&&i===2&&config.weapon!=='息灾')continue;
      if(key==='那维莱特'&&i===4||key==='菲米尼'&&i===6)continue; // old window samples are not fixed attacks
      if(d.maxCons!==undefined&&cons>d.maxCons||key==='玛拉妮'&&cons>=6&&i===1)continue;
      if(key==='菲林斯'&&i===6)continue; // duplicate source entry
      let reaction=lunar[key]?.[i]||stellar[key]?.[i]||null;
      if(key==='奈芙尔'&&i===1&&cons>=6)reaction='lunarBloom';
      const base=String(d.title||'技能伤害').replace(/按实际(?:整肃|帷层)/g,'').replace(/满辉/g,'月反应');
      const extra={reaction,sourceIndex:i,requires:d.requires,event:d.event};
      if(key==='法尔伽'&&[1,2,4,5].includes(i)){extra.event=i>=4?'varka-enhanced':'varka-normal';extra.note='C1佳酿仅给本轮首次四风/苍噬；普通项不消费佳酿。';}
      if(key==='神里绫华'&&i===0){extra.event='ayaka-normal';if(cons>=6)result.push(make('ayaka-ca-c6','C6薄冰舞踏·强化重击（三段）',[row(0)],{event:'ayaka-enhanced',note:'每10秒获得一次强化，重击命中0.5秒后清除；不默认强化所有后续重击。'}));}
      if(key==='迪希雅'&&i===1){extra.event='dehya-normal';if(cons>=2)result.push(make('dehya-e-c2','C2受击触发·下一次E协同伤害',[row(1)],{event:'dehya-enhanced',note:'领域内角色受击后，下一次协同增伤50%；此项与普通协同分别计算。'}));}
      if(key==='瓦雷莎'&&[2,3,4].includes(i)){extra.event=i===4?'varesa-enhanced':'varesa-normal';extra.note=i===4?'普通状态施Q获得的下一次坠地平铺，15秒内或命中后结束；不与本次强化Q分支混算。':'未消费C4下一次坠地平铺。';}
      if(key==='申鹤'&&[1,2].includes(i)){extra.event='shenhe-normal';if(cons>=4)result.push(make('shenhe-c4-'+i,'C4霜霄诀强化·'+base,[row(i)],{event:'shenhe-enhanced',note:'本次消费已有霜霄诀，默认50层；每层5%普通E增伤，可调整层数。'}));}
      if(key==='莫娜'&&[0,1,2].includes(i)){extra.event='mona-normal';if(cons>=6)result.push(make('mona-c6-'+i,'C6蓄力强化·'+base,[row(i)],{event:'mona-enhanced',note:'当前场上处于替代冲刺或附近存在星异目标时，每秒预叠一层，默认3层；本次重击后消费。星异目标上的C6原本200%独立判断。'}));}
      if(key==='恰斯卡'&&i<=3){extra.event='chasca-normal';if(cons>=6)result.push(make('chasca-c6-'+i,'C6命袭强化·'+base,[row(i)],{...extra,event:'chasca-enhanced',note:'下一轮对应追影弹/焕光追影弹领取120%暴伤；不作用C2/C4独立爆炸和Q。'}));}
      if(key==='奥黛塔'){
        for(const [mode,rx]of [['sc','stellarConduct'],['ss','stellarSwirl']])result.push(make('odette-'+mode+'-'+i,base.replace(/星超导\/星扩散|星烁/g,names[rx])+' · '+names[rx],[row(i)],{...extra,reaction:rx,mode}));
      }else result.push(make('detail-'+i,base,[row(i)],extra));
    }
    const preferred=typeof R[key].defDmgIdx==='number'?R[key].defDmgIdx:null;
    result.sort((a,b)=>(a.sourceIndex===preferred?-1:0)-(b.sourceIndex===preferred?-1:0));
    if(!result.length){const i=R[key].details.findIndex(d=>E.isDamageDetail(d)&&(d.cons||0)<=cons);if(i>=0)result.push(make('detail-'+i,E.resolveDetail(config,i).title,[row(i)]));}
    return result;
  }
  function selected(config){const list=definitions(config),ids=config.metricIds;if(Array.isArray(ids))return list.filter(m=>ids.includes(m.id));const recommended=list.filter(m=>m.recommended);return recommended.length?recommended:list.slice(0,2);}
  function definition(config,id){return definitions(config).find(m=>m.id===id);}
  function configFor(config,metric){
    const m=typeof metric==='string'?definition(config,metric):metric;if(!m)throw Error('请选择当前角色有效的伤害指标。');
    const cfg=clone(config);cfg._metric=clone(m);cfg.goal='rotation';cfg.rotation=clone(m.entries);cfg.conditions={...cfg.conditions};
    if(/激化/.test(m.title))cfg.conditions.quicken=true;
    if(m.reaction||/蒸发|融化|激化|扩散|绽放|感电|燃烧|丰穰|超载|碎冰|超导/.test(m.title)){cfg.conditions.soloAura=true;cfg.conditions.teamAura=true;}
    if(m.reaction==='stellarConduct'){cfg.conditions.stellarField=true;cfg.conditions.stellarHits=Number(settings(config).stellarHits);}
    if(m.reaction==='stellarSwirl')cfg.conditions.stellarField=false;
    const s=settings(config);cfg.teammates=(cfg.teammates||[]).map(t=>({...t,...(s.artifactMode==='full'?{setActive:true}:{}),...(s.weaponMode==='full'?{weaponActive:true,...(t.weapon==='漩流颂歌'?{weaponStacks:3}:{})}:{})}));
    if(s.states.currentHpPct!==undefined)cfg.conditions.currentHpPct=Number(s.states.currentHpPct);
    if(s.ownBuffMode==='full')cfg.disabledBuffs=(cfg.disabledBuffs||[]).filter(id=>!id.startsWith('self:'));
    if(s.artifactMode==='full'&&cfg.sets?.some(a=>a.name==='冰风迷途的勇士'&&a.count>=4))cfg.conditions.cryoAura=true;
    if(s.artifactMode==='full'&&cfg.sets?.some(a=>a.name==='影中沉凝的幻灭'&&a.count>=4))cfg.conditions.superconductActive=true;
    if(g.GTeam?.HEX.includes(config.character))cfg.conditions.homework=s.states.homework??(s.talentMode==='benchmark'?true:cfg.conditions.homework);
    if(m.id==='skirk-n5-c6'&&s.skirkSpecialQActive&&s.skirkWitherActive!==false&&Number(s.skirkC6Stacks)>0)throw Error('含C6普攻协同与凋尽重叠时，需要逐次触发时点；请查看七段主体指标，或关闭已结束的凋尽效果后计算含C6项。');
    return cfg;
  }
  function gearStates(config,metric){
    const s=settings(config),v={};
    if(s.weaponMode==='full')for(const [key,,type,max]of E.STATE_FIELDS.weapons[config.weapon]||[]){if(type==='bool')v[key]=true;else if(typeof type==='number')v[key]=max;else if(type==='select')v[key]=key==='widsithMode'?'atk':max[0][0];}
    if(s.artifactMode==='full'){
      for(const set of config.sets||[])if(set.count>=4)for(const [key,,type,max]of E.STATE_FIELDS.sets[set.name]||[]){if(type==='bool')v[key]=true;else if(typeof type==='number')v[key]=max;}
      Object.assign(v,{goldenGrace:true});
      if(config.sets?.some(a=>a.name==='冰风迷途的勇士'&&a.count>=4))v.blizzardMode='frozen';
      if(config.sets?.some(a=>a.name==='深廊终曲'&&a.count>=4)){const q=metric.id.startsWith('skirk-q')||/元素爆发|^Q/.test(metric.title);v.energyZero=true;v.finaleNormalActive=!q;v.finaleBurstActive=q;}
      if(config.sets?.some(a=>a.name==='烬城勇者绘卷'&&a.count>=4)){const ele=E.character(config.character).element,other=metric.reaction==='lunarBloom'?'hydro':ele==='hydro'?'electro':ele==='geo'?'hydro':ele==='anemo'?'cryo':'hydro';v.scrollElements=[...new Set([ele,other])];v.scrollNightsoulActive=!!g.GTeam?.NIGHTS.includes(config.character);}
      v.Nightsoul=!!g.GTeam?.NIGHTS.includes(config.character);
    }
    return v;
  }
  function params(config,c,detail,scope,p){
    const metric=config._metric;if(!metric)return p;
    const s=settings(config),v={...defaultStates(config),...gearStates(config,metric),...s.states};
    const assumeParty=scope==='solo'&&s.talentMode==='benchmark';
    v.metricAssumeParty=assumeParty;
    let moonsign=p.Moonsign,hex=p.Hexenzirkel;
    if(assumeParty){
      if(g.GTeam?.MOON.includes(c.key)||s.artifactMode==='full'&&config.sets?.some(a=>a.count>=4&&['穹境示现之夜','纺月的夜歌','晨星与月的晓歌'].includes(a.name)))moonsign=2;
      if(g.GTeam?.HEX.includes(c.key)){hex=true;v.homework=s.states.homework??true;}
      if(c.key==='爱可菲')v.hydroCryoMembers=4;
      if(c.key==='林尼')v.otherPyro=2;
      if(c.key==='娜维娅')v.naviaElements=2;
      if(c.key==='薇斯纳'){v.num1=s.states.num1??3;v.num2=s.states.num2??1;}
      if(c.key==='恰斯卡')v.ShadowSpirit=true;
      if(c.key==='纳西妲')v.nahidaPyroMembers=2;
      if(c.key==='洛恩')v.lohenCryoReactionActive=true;
    }
    if(c.key==='薇斯纳'&&!assumeParty){v.num1=scope==='solo'?1:Number(config.conditions?.vesnaCryoAnemo||1);v.num2=scope==='solo'?0:Number(config.conditions?.vesnaOthers||0);}
    if(c.key==='那维莱特'){const target=Number(v.neuvStacks),c1=config.cons>=1?1:0,possible=new Set((config.teammates||[]).map(t=>E.character(t.character)?.element).filter(e=>e&&e!=='hydro')).size+c1;v.neuvStacks=scope==='solo'?(assumeParty?Math.max(c1,Math.min(3,target)):c1):Math.max(c1,Math.min(3,target,possible));}
    if(c.key==='奈芙尔')v.Veil_of_Falsehood=moonsign<2?0:Math.max(0,Math.min(config.cons>=2?5:3,Number(v.Veil_of_Falsehood??0)));
    if(c.key==='芙宁娜'){if(scope==='team')v.furinaDrainers=Math.min(p.partySize,Number(v.furinaDrainers));if(p.currentHpPct<=50&&scope==='solo'&&!assumeParty)v.furinaDrainers=0;}
    if(c.key==='八重神子'&&s.states.yaeRank===undefined)v.yaeRank=config.cons>=2?4:3;
    if(c.key==='神里绫人'&&s.states.ayatoNamisenStacks===undefined)v.ayatoNamisenStacks=config.cons>=2?5:4;
    if(c.key==='丝柯克'){v.skirkSerpent=Number(s.skirkSerpent);v.skirkRifts=Number(s.skirkRifts);v.skirkSpecialQActive=metric.id.startsWith('skirk-n5')&&s.skirkSpecialQActive===true;v.skirkWitherActive=s.skirkWitherActive!==false;v.cons_2=v.skirkSpecialQActive;v.skirkC2AttackActive=Number(config.cons)>=2&&v.skirkSpecialQActive;const info=skirkResourceInfo(config);v.skirkExtraCap=info.extraCap;v.skirkEffectiveExtra=Math.max(0,Math.min(info.extraCap,v.skirkSerpent-50));const eligible=(config.teammates||[]).filter(t=>['hydro','cryo'].includes(E.character(t.character)?.element)).length,target=Number(s.states.skirkStacks??3);v.skirkStacks=assumeParty?target:scope==='solo'?0:Math.min(eligible,target);}
    if(c.key==='桑多涅'){v.sandroneRadiance=metric.mode||'none';v.sandroneDecodingActive=!!metric.reaction;v.sandroneTactics=Number(s.sandroneTactics);v.sandroneC4Available=true;}
    if(s.ownBuffMode==='full'){
      if(c.key==='恰斯卡'){const count=new Set((config.teammates||[]).map(t=>E.character(t.character)?.element).filter(e=>['pyro','hydro','cryo','electro'].includes(e))).size;v.chascaShadowStacks=assumeParty?3:scope==='solo'?Math.min(3,config.cons>=2?1:0):Math.min(3,count+(config.cons>=2?1:0));}
      if(c.key==='千织'){const constructs=['钟离','阿贝多','凝光','旅行者·岩','荒泷一斗'];v.chioriConstructActive=assumeParty||scope==='team'&&(config.teammates||[]).some(t=>constructs.includes(t.character));}
      if(c.key==='瓦雷莎')v.nightsoulBursts=assumeParty?2:scope==='solo'?1:Math.min(2,1+(config.teammates||[]).filter(t=>g.GTeam?.NIGHTS.includes(t.character)).length);
      if(c.key==='奥黛塔'&&v.off_field&&config.cons<6)v.odetteSelfSplendor=0;
    }
    if(c.key==='奥黛塔')v.odetteRadiance=metric.mode||'sc';
    if(c.key==='八重神子'&&metric.requires==='yaeNewBolt')v.yaeRevelationUnlocked=true;
    if(c.key==='布伦妮'&&metric.requires==='pruneElement'&&s.states.pruneAbsorbedElement===undefined)v.pruneAbsorbedElement='cryo';
    if(c.key==='雅珂达'){if(metric.requires==='jahodaBall'&&s.states.jahodaFlaskElement===undefined)v.jahodaFlaskElement='cryo';if(metric.requires==='jahodaRobot'&&s.states.jahodaRobotElement===undefined)v.jahodaRobotElement='cryo';}
    if(c.key==='雷泽'&&metric.requires==='razorMagic')v.razorMagicAvailable=true;
    if(/后台/.test(metric.title))v.off_field=true;
    if(c.key==='奥黛塔'&&s.ownBuffMode==='full'&&(v.off_field??p.off_field)&&config.cons<6)v.odetteSelfSplendor=0;
    if(metric.reaction?.startsWith('stellar')){
      Object.assign(v,{Stellar:true,stellarConductCount:Number(s.stellarHits)});
      if(c.key==='薇斯纳')v.vesnaRadiance=true;
      if(c.key==='莱欧斯利')Object.assign(v,{wrioRevelationUnlocked:true,wrioRadianceActive:true,wrioSkillActive:true});
      if(c.key==='赛诺')Object.assign(v,{cynoRevelationUnlocked:true,cynoRadianceActive:true,cynoBurstActive:true});
      if(c.key==='八重神子')Object.assign(v,{yaeRevelationUnlocked:true,yaeRadianceActive:true});
    }
    if(metric.reaction?.startsWith('lunar'))v.Lunar=true;
    if(c.key==='伊涅芙'&&metric.reaction)Object.assign(v,{ineffaBirgittaActive:true,ineffaThundercloudActive:true,ineffaCompositeActive:true,ineffaC2Available:true,ineffaC6Available:true});
    if(c.key==='哥伦比娅'&&metric.reaction)Object.assign(v,{columbinaDewRemaining:Math.max(1,Number(v.columbinaDewRemaining)||0),columbinaC4ProcAvailable:true});
    if(c.key==='菈乌玛'&&detail.resource==='laumaC6N')Object.assign(v,{laumaHymnActive:true,laumaHymnRemaining:1});
    // A fixed benchmark determines the one-use event after full/default/custom state merging.
    if(c.key==='兹白'){v.cons_1=metric.event==='zibai-first'&&config.cons>=1;v.skills_1=['zibai-first','zibai-later'].includes(metric.event);v.cons_2=v.skills_1&&config.cons>=2;v.zibaiC4Splendor=metric.event==='zibai-n4-enhanced'&&config.cons>=4;}
    if(c.key==='玛拉妮')v.mualaniFirstBite=metric.event==='mualani-first';
    if(c.key==='法尔伽')v.varkaC1WineAvailable=metric.event==='varka-enhanced';
    if(c.key==='神里绫华')v.ayakaC6Active=metric.event==='ayaka-enhanced';
    if(c.key==='迪希雅')v.dehyaC2Active=metric.event==='dehya-enhanced';
    if(c.key==='瓦雷莎')v.varesaC4PlungeAvailable=metric.event==='varesa-enhanced';
    if(c.key==='申鹤')v.shenheC4Consume=metric.event==='shenhe-enhanced';
    if(c.key==='莫娜')v.monaC6ChargedStacks=metric.event==='mona-enhanced'?Math.max(0,Math.min(3,Number(s.states.monaC6ChargedStacks??3))):0;
    if(c.key==='恰斯卡')v.chascaC6OnslaughtActive=metric.event==='chasca-enhanced';
    v.metricEvent=metric.event;
    if(metric.needsMoonsign2&&moonsign<2)throw Error('该指标需要满辉；当前真实队伍或严格单人模式不满足，请调整天赋前提或队伍。');
    if(/蒸发|融化|蔓激化|超激化/.test(metric.title))v.soloAura=true;
    if(!g.GTeam?.HEX.includes(c.key))v.homework=false;
    for(const [key,,type,options]of E.stateFields(config))if(fieldMinCons(key)>Number(config.cons||0))v[key]=type==='bool'?false:type==='select'?options[0][0]:typeof type==='number'?type:0;
    return {...p,...v,Moonsign:moonsign,Hexenzirkel:hex,partySize:p.partySize,partyElements:p.partyElements,mArtisDiffCount:p.mArtisDiffCount,mArtisSameCount:p.mArtisSameCount,liyueCount:p.liyueCount};
  }
  function describe(config,metric){
    const s=settings(config),notes=[];
    notes.push(s.ownBuffMode==='full'?'自身天赋与可用增伤采用合法满效果；命座未解锁、互斥分支、额外攻击段数和真实属性转化不因此放宽。':'自身增益使用自定义状态。');
    notes.push(s.talentMode==='benchmark'?'单人默认满足自身天赋所需组队资格；组队按真实成员判断。两者均不虚构队友直接增益。':'使用严格单人资格，不假设组队天赋前提。');
    const state={...defaultStates(config),...s.states};
    if(config.character==='那维莱特')notes.push('古海孑遗目标总层数'+state.neuvStacks+'（包含C1）；组队按可触发水反应种类封顶');
    if(config.character==='雷电将军')notes.push('本次已有愿力'+state.num+'层');
    if(config.character==='薇斯纳')notes.push('本次整肃'+state.vesnaOrder+'层；组队人数按实际成员');
    if(config.character==='芙宁娜')notes.push('本次气氛'+state.fanfare+'；C2生命提升目标'+state.furinaC2HP+'%（按命座生效）');
    if(config.character==='洛恩')notes.push('本次争胜'+state.争胜+'；乘兴状态'+(state.lohenHighSpirits?'已生效，战技天赋+1':'未生效'));
    if(config.character==='玛薇卡')notes.push('本次战意'+state.mavuikaFightingSpirit+'；Q后增伤目标'+state.mavuikaQBuffDmg+'%');
    if(metric.reaction==='stellarConduct')notes.push('极星辉域已存在；上一结算周期'+s.stellarHits+'次有效附着，反应倍率'+E.specialFactor('stellarConduct',{stellarConductCount:s.stellarHits}).toFixed(2));
    if(metric.reaction==='stellarSwirl')notes.push('对应辉映与星扩散现场已成立');
    if(metric.reaction?.startsWith('lunar'))notes.push('对应月反应场景及本次攻击资源已具备；默认单人满足满辉天赋前提');
    if(config.character==='桑多涅'&&metric.id.endsWith('-q'))notes.push('聚能光束清除'+s.sandroneTactics+'层改进战术，倍率×'+(1+.1*s.sandroneTactics).toFixed(1)+'；10层在0命也可取得');
    if(config.character==='魈')notes.push('满Q增伤5层；连续E增伤按当前充能与敌人数限制，未增加E次数');
    if(config.character==='胡桃'&&config.cons>=6&&s.ownBuffMode==='full')notes.push('C6按已触发后的10秒窗口计算，当前生命49%');
    if(config.character==='八重神子'&&config.cons>=1&&s.ownBuffMode==='full')notes.push('C1按已先触发超导/星超导后的10秒状态；普通雷伤也可受益，普通杀生樱指标不暗中替换为强化落雷');
    if(config.character==='流浪者'&&s.ownBuffMode==='full')notes.push('预设E已接触火、冰两种元素，可来自环境或附着；不增加队伍人数或元素共鸣');
    if(config.character==='丝柯克'){
      notes.push(s.talentMode==='benchmark'?'默认单人满足诸武相授（E+1）和死河渡断'+(s.states.skirkStacks??3)+'层；组队受成员资格限制':'死河与战技加级按实际资格');
      const info=skirkResourceInfo(config);notes.push(metric.id.startsWith('skirk-q')?'普通Q灭：施放时'+s.skirkSerpent+'蛇之狡谋，实际计入超额'+Math.max(0,Math.min(info.extraCap,Number(s.skirkSerpent)-50))+'点（上限'+info.extraCap+'）；不混入特殊Q尽的普攻增益':s.skirkSpecialQActive?s.skirkWitherActive!==false?'已施放特殊Q尽并吸收'+s.skirkRifts+'枚裂隙；本指标7次命中均满足凋尽生效条件':'已施放特殊Q尽，但凋尽增伤已结束；C2状态单独保留':'未计特殊Q尽增益');
      if(metric.id.startsWith('skirk-q'))notes.push('从0狡谋长E：'+info.fromE+'＋'+info.requiredRifts+'枚裂隙×8＝'+info.defaultSerpent+'；满倍率门槛'+info.threshold+'，C0/C1与C2以上都需要3枚裂隙。');
    }
    notes.push(config.sets?.length?(s.artifactMode==='full'?'圣遗物采用已触发满层预设，详细手动条件可覆盖；属性转化仍读取当前面板':'圣遗物使用自定义状态'):'未选择套装；当前只计算装备主副属性');
    notes.push(s.weaponMode==='full'?'武器采用已触发满层预设；详细手动条件可覆盖':'武器使用自定义状态');
    if(metric.note)notes.push(metric.note);
    return notes;
  }
  g.GMetrics={settings,definitions,selected,definition,configFor,params,gearStates,describe,ownDefaults,defaultStates,fullSelfStates,fieldMinCons,extraFields,names,skirkResourceInfo};
})(typeof window==='undefined'?globalThis:window);
