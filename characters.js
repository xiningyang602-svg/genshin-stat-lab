/* Explicit state adapters. Formula references: research/primary-final-batch-{a,b,c}.md.
 * No stack, aura, constellation trigger or external teammate is inferred from an attack count. */
(function(g){
  'use strict';
  const R=g.GRULES,cap=(n,a,b)=>Math.max(a,Math.min(b,n)),sum=xs=>xs.reduce((a,x)=>({avg:a.avg+x.avg,dmg:a.dmg+(x.dmg??x.avg)}),{avg:0,dmg:0});
  const repeat=(n,fn)=>sum(Array.from({length:n},(_,i)=>fn(i)));
  const B=(key,label)=>[key,label,'bool'],N=(key,label,max,initial=0)=>[key,label,0,max,initial],S=(key,label,items)=>[key,label,'select',items];
  const enemyHp=['enemyHpPct','敌人当前生命 %',0,100,100,false];
  const fields={
    '神里绫华':[B('ayakaEActive','绫华：E后6秒普重增伤有效'),B('ayakaDashActive','绫华：霰步冰伤10秒有效'),B('ayakaC4Active','绫华：Q命中后6秒减防有效'),B('ayakaC6Active','绫华：本次重击有C6加成')],
    '甘雨':[B('ganyuA1Active','甘雨：前次霜华矢后的5秒暴率有效'),B('ganyuQFieldActive','甘雨：在自己的Q领域中'),B('ganyuC1Active','甘雨：C1减冰抗有效'),N('ganyuC4Stacks','甘雨：C4领域受伤层数',5)],
    '莱欧斯利':[B('wrioSkillActive','莱欧：E强化普攻条件有效'),B('wrioGraceActive','莱欧：恩典之诫强化重击有效'),N('wrioEdictStacks','莱欧：检偿之敕层数',5),B('wrioRevelationUnlocked','莱欧：新天赋已解锁'),B('wrioRadianceActive','莱欧：辉映·星超导有效'),B('wrioC1FifthActive','莱欧：本次第五段触发C1星增伤'),B('wrioC1ChargeActive','莱欧：本次重击触发C1星增伤')],
    '刻晴':[B('keqingQActive','刻晴：Q后8秒暴率/充能有效'),B('keqingInfused','刻晴：雷附魔有效'),B('keqingC4Active','刻晴：雷反应后C4攻击有效'),N('keqingC6Stacks','刻晴：C6有效层数',4)],
    '宵宫':[B('yoimiyaSkillActive','宵宫：E炽焰箭有效'),N('yoimiyaA1Stacks','宵宫：袖火百景图实际层数',10),B('yoimiyaC1Active','宵宫：C1击败后攻击有效'),B('yoimiyaC2Active','宵宫：C2火暴击后火伤有效')],
    '魈':[B('xiaoBurstActive','魈：靖妖傩舞有效'),N('xiaoA1Stacks','魈：Q天赋增伤层数',5),N('xiaoEStacks','魈：本次E之前的有效连续E层数',3)],
    '流浪者':[B('wandererSkillActive','流浪者：空居力状态有效'),B('wandererPyroContact','流浪者：已真实接触火元素'),B('wandererCryoContact','流浪者：已真实接触冰元素'),N('wandererPointsSpent','流浪者：C2已消耗空居力',50)],
    '荒泷一斗':[B('ittoBurstActive','一斗：怒目鬼王有效'),B('ittoC4Active','一斗：Q结束后C4攻击/防御有效')],
    '雷泽':[enemyHp,B('razorC1Active','雷泽：拾取元素球后C1有效'),B('razorC4Active','雷泽：点按E后的C4减防有效'),B('razorC6SigilActive','雷泽：消耗雷之印后C6有效'),B('razorMagicAvailable','雷泽：本次秘仪落雷实际可触发'),B('razorC6LightningAvailable','雷泽：C6落雷本次可触发')],
    '赛诺':[B('cynoBurstActive','赛诺：启途誓使状态有效'),N('cynoC2Stacks','赛诺：普通C2雷伤层数',5),N('cynoStellarStacks','赛诺：独立星超导C2层数',5),B('cynoRevelationUnlocked','赛诺：新天赋已解锁'),B('cynoRadianceActive','赛诺：辉映·星超导有效'),B('cynoC1TogetherActive','赛诺：C1偕日共升精通有效')],
    '林尼':[B('lyneyA1HatBuffActive','林尼：这顶帽由消耗生命的隐具箭产生'),N('lyneyPropStacks','林尼：本次E消耗隐具余数',5),N('lyneyC2Stacks','林尼：C2实际在场层数',3),B('lyneyC4Active','林尼：C4减火抗有效')],
    '千织':[B('chioriConstructActive','千织：实际岩造物触发的岩伤仍有效'),B('chioriSkillActive','千织：E状态有效'),B('chioriInfused','千织：岩附魔有效')],
    '阿贝多':[enemyHp,B('albedoSilverActive','阿贝多：自己创造的瑰银存在'),B('albedoSkillActive','阿贝多：E后20秒状态有效'),N('albedoC2Stacks','阿贝多：C2生灭计数',4),N('albedoFatalHits','阿贝多：本次Q实际生灭之花命中数',7),B('albedoC6Active','阿贝多：C6瑰银被摧毁的强化有效')],
    '诺艾尔':[B('noelleBurstActive','诺艾尔：大扫除状态有效')],
    '神里绫人':[enemyHp,N('ayatoNamisenStacks','绫人：当前浪闪层数（C2最多5）',5),B('ayatoSkillActive','绫人：瞬水剑状态有效'),B('ayatoQFieldActive','绫人：处于自己的Q领域')],
    '珊瑚宫心海':[B('kokomiBurstActive','心海：仪来羽衣有效'),B('kokomiC6Active','心海：Q治疗后C6水伤有效')],
    '八重神子':[B('yaeRevelationUnlocked','八重：新天赋已解锁'),B('yaeRadianceActive','八重：辉映·星超导有效'),N('yaeRank','八重：杀生樱当前阶位',4,3),B('yaeEnhancedActive','八重：本次杀生樱强化落雷有效'),B('yaeC1Active','八重：C1新雷伤/星增伤有效'),B('yaeC4Active','八重：旧C4雷伤有效'),N('yaeFoxBolts','八重：本次Q天狐霆雷数量',3)],
    '提纳里':[B('tighnariA1Active','提纳里：先前发射花筥箭的精通有效'),B('tighnariC2Active','提纳里：E范围中存在敌人/离开后有效'),S('tighnariC4Stage','提纳里：当前C4阶段',[['off','未触发'],['cast','Q已施放：60精通'],['reaction','已发生反应：120精通']])],
    '迪希雅':[B('dehyaC2Active','迪希雅：下次协同的C2增伤有效'),N('dehyaPriorCritStacks','迪希雅：本拳之前C6暴伤层数',4),N('dehyaPunches','迪希雅：一轮实际炽鬃拳数量',15,10)],
    '嘉明':[B('gamingC2Active','嘉明：受到溢出治疗后的C2攻击有效')],
    '迪卢克':[enemyHp,B('dilucQAfterActive','迪卢克：Q后火伤/火附魔有效'),N('dilucC2Stacks','迪卢克：C2受伤攻击层数',3),B('dilucC4Active','迪卢克：本段E已满足C4间隔'),B('dilucC6NormalActive','迪卢克：本次普攻有C6加成')],
    '可莉':[B('kleeSparkActive','可莉：本次重击消耗爆裂火花'),N('kleeBadges','可莉：当前轰轰勋章层数',3),B('kleeC1Active','可莉：课业C1火花触发后的攻击有效'),B('kleeC2Active','可莉：C2减防有效'),B('kleeQAfterActive','可莉：C6施放Q后的火伤有效')],
    '艾梅莉埃':[B('emilieBurning','艾梅莉埃：目标正处于燃烧状态'),B('emilieC2Active','艾梅莉埃：C2减草抗有效'),B('emilieC6Active','艾梅莉埃：C6香氛在有效时间/次数内'),N('emilieQHits','艾梅莉埃：本次Q实际命中次数',30,1)]
  };
  const patches={},extras={},defaults={};
  function patch(key,i,data,check,title){(patches[key]??={})[i]=b=>({...b,data,check:check||(()=>true),...(title?{title}:{} )});}
  function extra(key,title,data,more={}){const list=extras[key]??=[];list.push({id:'self:explicit:'+list.length,title,data,...more});}
  function edit(key,i,fn,title,meta={}){const d=R[key].details[i];R[key].details[i]={...(typeof d==='object'?d:{}),...meta,title:title||d.title,dmg:fn};}
  function add(key,title,fn,meta={}){const index=R[key].details.length;R[key].details.push({title,dmg:fn,...meta});return index;}
  function tal(key,t,name,tag=t,meta={}){return add(key,name,({talent},d)=>d(talent[t][name],tag),meta);}
  const active=k=>({params})=>params[k]===true,all=(k,v)=>({[k]:v});
  patch('神里绫华',0,{aDmg:30,a2Dmg:30},active('ayakaEActive'));
  patch('神里绫华',1,{dmg_cryo:18},active('ayakaDashActive'));
  patch('神里绫华',2,{enemyDef:30},active('ayakaC4Active'));
  patch('神里绫华',3,{a2Dmg:298},active('ayakaC6Active'));
  edit('神里绫华',0,({talent},d)=>repeat(3,()=>d(talent.a['重击伤害2'][0],'a2')),'冰附魔重击（三段）');
  tal('神里绫华','q','绽放伤害');
  add('神里绫华','C2小霜见雪关扉·切割一段',({talent},d)=>d(.2*talent.q['切割伤害'],'q'),{cons:2});
  add('神里绫华','C2小霜见雪关扉·绽放',({talent},d)=>d(.2*talent.q['绽放伤害'],'q'),{cons:2});
  patch('甘雨',0,{a2Cpct:20},active('ganyuA1Active'));
  patch('甘雨',1,{res_cryo:15},active('ganyuC1Active'));
  patch('甘雨',2,{allDmg:({params})=>5*params.ganyuC4Stacks});
  extra('甘雨','自己的Q领域：在场冰伤20%',{dmg_cryo:20},{check:({params})=>params.ganyuQFieldActive&&!params.off_field});
  edit('甘雨',1,({talent},d)=>sum([d(talent.a['霜华矢命中伤害'],'a2'),d(talent.a['霜华矢·霜华绽发伤害'],'a2')]));
  edit('甘雨',2,({talent},d)=>sum([d(talent.a['霜华矢命中伤害'],'a2','melt'),d(talent.a['霜华矢·霜华绽发伤害'],'a2','melt')]));
  tal('甘雨','a','霜华矢命中伤害','a2');
  patch('莱欧斯利',0,{aMulti:({talent,params:p,cons})=>{const skill=p.wrioSkillActive&&p.currentHpPct>50,m=skill?talent.e['强化斥逐拳伤害']:100;return m*(skill&&p.wrioRevelationUnlocked&&!p.wrioRadianceActive&&cons>=2&&p.wrioEdictStacks===5?1.25:1)-100;}});
  patch('莱欧斯利',1,{a2Dmg:50},active('wrioGraceActive'));
  patch('莱欧斯利',2,{atkPct:({params})=>6*params.wrioEdictStacks});
  patch('莱欧斯利',3,{a2Dmg:150},active('wrioGraceActive'));
  patch('莱欧斯利',5,{qDmg:({params})=>40*params.wrioEdictStacks});
  patch('莱欧斯利',6,{a2Multi:30},({params})=>params.wrioRevelationUnlocked&&!params.wrioRadianceActive&&params.wrioEdictStacks===5);
  patch('莱欧斯利',10,{stellarConduct:30},({params})=>params.wrioRevelationUnlocked&&params.wrioRadianceActive);
  patch('莱欧斯利',11,{aCpct:10,aCdmg:80},({params})=>params.wrioRevelationUnlocked&&params.wrioRadianceActive);
  function wrioCombo(ds,d,star=false,melt=false){const {talent:t,params:p,cons}=ds;const rx=melt?'melt':false;const hits=[d(t.a['一段伤害'],'a',rx),d(t.a['二段伤害'],'a'),d(t.a['三段伤害'],'a'),sum(t.a['四段伤害2'].map((v,i)=>d(v,'a',i===0?rx:false))),d(t.a['五段伤害'],'a')];
    if(!star){hits.push(d(t.a['重击伤害'],'a2',rx));if(cons>=6)hits.push(d(t.a['重击伤害'],'a2',rx));}
    else{const boost=cons>=2&&p.wrioEdictStacks===5?1.5:1;for(const [name,scale,tag,c1]of [['三段伤害',.6,'a',false],['五段伤害',.8,'a',p.wrioC1FifthActive],['重击伤害',1,'a2',p.wrioC1ChargeActive]]){const c6=cons>=6&&name!=='三段伤害';const dyn={specialBonus:cons>=1&&c1?50:0,dynamicCpct:c6?10:0,dynamicCdmg:c6?80:0};const m=tag==='a'&&p.wrioSkillActive&&p.currentHpPct>50?t.e['强化斥逐拳伤害']/100:1,base=ds.calc(ds.attr.atk)*t.a[name]/100*m*scale*boost;hits.push(d.basic(base,'','stellarConduct',dyn));if(c6)hits.push(d.basic(base*.2,'','stellarConduct',dyn));}}
    return sum(hits);}
  edit('莱欧斯利',5,(s,d)=>wrioCombo(s,d),'E后5A接强化重击（普通模式）');
  edit('莱欧斯利',6,(s,d)=>wrioCombo(s,d,false,true),'E后5A接强化重击（N1/N4首拳/重击融化样本）',{fixedReactionPattern:true});
  edit('莱欧斯利',7,(s,d)=>wrioCombo(s,d,true),'E后5A接天辉·凌跃拳（星超导）',{requires:'wrioStar'});
  defaults['莱欧斯利']=[[0,1],[1,1]];
  R['莱欧斯利'].details[1].title='E后强化重击本体（C6冰锥另列）';
  add('莱欧斯利','C6普通冰锥（强化重击额外命中）',({talent},d)=>d(talent.a['重击伤害'],'a2'),{cons:6,mode:'wrioC6Ice'});
  patch('刻晴',0,{cpct:15,recharge:15},active('keqingQActive'));
  patch('刻晴',1,{atkPct:25},active('keqingC4Active'));
  patch('刻晴',2,{dmg_electro:({params})=>6*params.keqingC6Stacks});
  edit('刻晴',0,({talent,params},d)=>sum(talent.a['重击伤害2'].map(v=>d(v,'a2',params.keqingInfused?false:'phy'))),'重击两段（按雷附魔状态）');
  tal('刻晴','e','雷楔伤害');tal('刻晴','e','斩击伤害');
  add('刻晴','C1归位斩额外雷伤（一段）',(_,d)=>d(50),{cons:1});
  patch('达达利亚',0,{});
  edit('达达利亚',0,({talent},d)=>sum(talent.e['重击伤害2'].map(v=>d(v,'a2'))));
  tal('达达利亚','q','技能伤害·远程');tal('达达利亚','q','断流·爆 伤害');tal('达达利亚','e','状态激发伤害');
  for(const name of ['一段伤害','二段伤害','三段伤害','四段伤害','五段伤害'])tal('达达利亚','e',name,'a');
  add('达达利亚','近战普攻第六段（两次命中）',({talent},d)=>sum(talent.e['六段伤害2'].map(v=>d(v,'a'))));
  patch('宵宫',0,{aMulti:({talent,params})=>params.yoimiyaSkillActive?talent.e['炽焰箭伤害']-100:0});
  patch('宵宫',1,{dmg_pyro:({params})=>2*params.yoimiyaA1Stacks});
  patch('宵宫',2,{dmg_pyro:25},active('yoimiyaC2Active'));
  extra('宵宫','宵宫C1：击败后攻击20%',{atkPct:20},{cons:1,check:active('yoimiyaC1Active')});
  edit('宵宫',0,({talent},d)=>repeat(talent.a['一段伤害2'][1],()=>d(talent.a['一段伤害2'][0],'a')),'开E后普攻第一段（两箭）');
  R['宵宫'].details[1].title='开E后普攻第五段';R['宵宫'].details[2].title='开E后普攻第五段·蒸发';
  tal('宵宫','q','技能伤害');tal('宵宫','q','琉金火光爆炸伤害');
  add('宵宫','C6额外炽焰箭（首段动作60%；按实际/期望数量录入）',({talent},d)=>d(.6*talent.a['一段伤害'],'a'),{cons:6});
  patch('魈',0,Object.fromEntries(['aDmg','a2Dmg','a3Dmg'].map(k=>[k,({talent,params})=>params.xiaoBurstActive?talent.q['普通攻击/重击/下落攻击伤害提升']:0])));
  patch('魈',1,{allDmg:({params})=>params.xiaoBurstActive?5*params.xiaoA1Stacks:0});
  patch('魈',2,{eDmg:({params})=>15*params.xiaoEStacks});
  R['魈'].details[1].title='靖妖傩舞状态下E';R['魈'].details[2].title='靖妖傩舞·高空坠地';R['魈'].details[3].title='靖妖傩舞·高空坠地（相同状态备用项）';
  patch('流浪者',0,{aMulti:({talent,params})=>params.wandererSkillActive?talent.e['空居·不生断伤害']-100:0,a2Multi:({talent,params})=>params.wandererSkillActive?talent.e['空居·刀风界伤害']-100:0});
  patch('流浪者',1,{atkPct:({params})=>params.wandererSkillActive&&params.wandererPyroContact?30:0,cpct:({params})=>params.wandererSkillActive&&params.wandererCryoContact?20:0});
  patch('流浪者',2,{qDmg:({params})=>params.wandererSkillActive?Math.min(200,4*params.wandererPointsSpent):0});
  R['流浪者'].details[2].title='开E后首段普攻（按实际接触元素）';
  add('流浪者','C6额外普攻（首段原伤害40%）',({talent},d)=>d(talent.a['一段伤害']*.4,'a'),{cons:6,mode:'wandererE'});
  add('流浪者','A4疾风箭（一枚；实际四枚分别计数）',({cons},d)=>d(cons>=1?60:35));
  patch('荒泷一斗',0,{a2Plus:({attr,calc})=>.35*calc(attr.def)},({params})=>params.ittoKesagiri);
  patch('荒泷一斗',2,{atkPlus:({attr,calc,talent})=>talent.q['攻击力提高']*calc(attr.def)/100},active('ittoBurstActive'));
  extra('荒泷一斗','一斗C4：Q结束后的攻击/防御20%',{atkPct:20,defPct:20},{cons:4,check:active('ittoC4Active')});
  patch('雷泽',0,{allDmg:10},active('razorC1Active'));patch('雷泽',1,{enemyDef:15},active('razorC4Active'));patch('雷泽',2,{cpct:10,cdmg:50},({params})=>params.homework&&params.razorC6SigilActive);
  extra('雷泽','雷泽C2：敌人生命低于30%时暴率10%',{cpct:10},{cons:2,check:({params})=>params.enemyHpPct<30});
  edit('雷泽',3,({talent,params},d)=>d(talent.q['狼魂伤害']*talent.a['一段伤害']/100+(params.homework?70:0),'q'));
  R['雷泽'].details[4].requires='razorMagic';R['雷泽'].details[5].requires='razorC6';R['雷泽'].details[5].cons=6;
  patch('赛诺',0,{mastery:100},active('cynoBurstActive'));patch('赛诺',1,{mastery:200},({params})=>params.cynoRevelationUnlocked&&params.cynoRadianceActive&&params.cynoC1TogetherActive);
  patch('赛诺',2,{dmg_electro:({params})=>10*params.cynoC2Stacks});patch('赛诺',3,{stellarConduct:({params})=>16*params.cynoStellarStacks},({params})=>params.cynoRevelationUnlocked&&params.cynoRadianceActive);
  patch('赛诺',5,{aPlus:({attr,calc})=>1.5*calc(attr.mastery)},active('cynoBurstActive'));
  const cynoStar=({attr,calc},d)=>d.basic(2*calc(attr.atk),'','stellarConduct',{specialFlat:6*calc(attr.mastery)});
  edit('赛诺',3,cynoStar,undefined,{requires:'cynoStar'});
  for(const i of [8,9])edit('赛诺',i,(ds,d)=>sum([d.dynamic(ds.talent.e['冥祭伤害'],'e',{dynamicDmg:35}),repeat(i===9?7:3,()=>cynoStar(ds,d)),...['一段伤害','二段伤害','三段伤害'].map(k=>d(ds.talent.q[k],'a')),sum(ds.talent.q['四段伤害2'].map(v=>d(v,'a'))),d(ds.talent.q['五段伤害'],'a')]),undefined,{requires:'cynoStar'});
  add('赛诺','传统渡荒之雷（一发）',({attr,calc},d)=>d.basic(calc(attr.atk)+2.5*calc(attr.mastery),'e'));
  edit('林尼',1,({talent,params},d)=>d(talent.a['礼花术弹伤害']+(params.lyneyA1HatBuffActive?80:0),'a2'));
  edit('林尼',2,({talent,params},d)=>d(talent.e['技能伤害']+params.lyneyPropStacks*talent.e['技能伤害加成'],'e'),'E（按实际隐具余数）');
  edit('林尼',3,({talent},d)=>sum([d(talent.q['技能伤害'],'q'),d(talent.q['引爆礼花伤害'],'q')]));
  patch('林尼',3,{cdmg:({params})=>20*params.lyneyC2Stacks});patch('林尼',4,{res_pyro:20},active('lyneyC4Active'));patch('林尼',5,{});
  add('林尼','C6礼花术弹·重奏（独立命中）',({talent},d)=>d(.8*talent.a['礼花术弹伤害'],'a2'),{cons:6});
  patch('千织',0,{dmg_geo:20},({params,cons})=>params.chioriConstructActive||cons>=1&&params.otherGeoMembers>0&&params.chioriSkillActive);
  R['千织'].details[3].cons=2;
  patch('阿贝多',0,{eDmg:25},({params})=>params.albedoFlower&&params.enemyHpPct<50);
  patch('阿贝多',1,{ePlus:({attr,calc})=>2.4*calc(attr.def)},({params})=>params.albedoFlower&&params.albedoSilverActive);
  patch('阿贝多',2,Object.fromEntries(['aDmg','a2Dmg','a3Dmg','eDmg','qDmg'].map(k=>[k,({attr,calc,params})=>Math.min(12,.004*calc(attr.def))+(params.albedoSilverActive?Math.min(30,.01*calc(attr.def)):0)])),({params})=>params.homework&&params.Hexenzirkel&&params.albedoSkillActive);
  patch('阿贝多',3,{defPct:50},({params})=>params.homework&&params.albedoSkillActive);patch('阿贝多',4,{});
  function albedoQ({attr,calc,talent,params,cons},d){const df=calc(attr.def),c2=cons>=2?.3*params.albedoC2Stacks*df:0;return sum([d.basic(calc(attr.atk)*talent.q['爆发伤害']/100+c2,'q'),repeat(params.albedoFatalHits,()=>d.basic(calc(attr.atk)*talent.q['生灭之花伤害']/100+c2+(cons>=6&&params.albedoC6Active?2.5*df:0),'q'))]);}
  edit('阿贝多',2,albedoQ,'Q（实际C2层数/生灭之花命中数）');edit('阿贝多',3,albedoQ,'Q（相同状态备用项）');
  R['阿贝多'].details[2].check=undefined;R['阿贝多'].details[3].check=undefined;
  edit('阿贝多',4,({attr,calc,cons,params},d)=>repeat(3,()=>d.basic(calc(attr.def)*(3+(cons>=6&&params.albedoC6Active?2.5:0)),'q')),'C2自动生灭之花（三次）',{cons:2});
  patch('诺艾尔',0,{atkPlus:({attr,calc,talent})=>talent.q['攻击力提高']*calc(attr.def)/100},active('noelleBurstActive'));
  patch('诺艾尔',1,{atkPlus:({attr,calc})=>.5*calc(attr.def)},active('noelleBurstActive'));
  extra('诺艾尔','诺艾尔C2：重击伤害15%',{a2Dmg:15},{cons:2});
  add('诺艾尔','E护心铠施放伤害',({talent,attr,calc},d)=>d.basic(calc(attr.def)*talent.e['技能伤害']/100,'e'));
  tal('诺艾尔','q','爆发伤害');tal('诺艾尔','q','技能伤害');add('诺艾尔','C4护心铠破裂',(_,d)=>d(400),{cons:4});
  patch('神里绫人',0,{hpPct:50},({params})=>params.ayatoNamisenStacks>=3&&params.ayatoSkillActive);
  patch('神里绫人',1,{aDmg:40},({params})=>params.ayatoShunsuiken&&params.enemyHpPct<=50);
  patch('神里绫人',2,{aPlus:({attr,calc,talent,params})=>calc(attr.hp)*talent.e['浪闪伤害值提高']/100*params.ayatoNamisenStacks},({params})=>params.ayatoShunsuiken);
  patch('神里绫人',3,{});extra('神里绫人','绫人：自己的Q领域普攻增伤',{aDmg:({talent})=>talent.q['普通攻击伤害提升']},{check:active('ayatoQFieldActive')});
  tal('神里绫人','e','水影伤害');add('神里绫人','C6额外瞬水剑（一发，不受浪闪；C1未验证不自动计入）',(_,d)=>d(450,'a'),{cons:6});
  edit('神里绫人',3,({talent,params},d)=>params.ayatoSkillActive?d(talent.e['一段瞬水剑伤害'],'a'):d(talent.a['一段伤害'],'a','phy'),'普攻首段（按瞬水剑状态）');
  for(const i of [1,2,3])patch('珊瑚宫心海',i,R['珊瑚宫心海'].buffs[i].data,active('kokomiBurstActive'));
  patch('珊瑚宫心海',5,{dmg_hydro:40},({params})=>params.kokomiBurstActive&&params.kokomiC6Active);
  add('珊瑚宫心海','化海月一次伤害',({attr,calc,talent,params},d)=>d.basic(calc(attr.atk)*talent.e['波纹伤害']/100+(params.kokomiBurstActive?calc(attr.hp)*talent.q['化海月伤害提升']/100:0),'e'));
  add('珊瑚宫心海','Q施放伤害',({attr,calc,talent},d)=>d.basic(calc(attr.hp)*talent.q['技能伤害']/100,'q'));
  add('珊瑚宫心海','C1游鱼（Q状态）',({attr,calc},d)=>d.basic(.3*calc(attr.hp)),{cons:1,requires:'kokomiQ'});
  patch('八重神子',0,{eDmg:({attr,calc})=>.15*calc(attr.mastery)},({params})=>params.yaeTotem);
  patch('八重神子',1,{dmg_electro:50,stellarConduct:50},({params})=>params.yaeRevelationUnlocked&&params.yaeC1Active);
  patch('八重神子',2,{mastery:({params})=>[0,60,90,120,200][params.yaeRank]},({params})=>params.yaeRevelationUnlocked);
  patch('八重神子',3,{dmg_electro:20},active('yaeC4Active'));patch('八重神子',4,{qDmg:100},active('yaeRevelationUnlocked'));patch('八重神子',5,{eIgnore:60},({params})=>params.yaeTotem);
  for(const i of [0,1,2,3,4,5])edit('八重神子',i,({talent,params},d)=>d(talent.e[['','杀生樱伤害·壹阶','杀生樱伤害·贰阶','杀生樱伤害·叁阶','杀生樱伤害·肆阶'][params.yaeRank]]+(params.yaeRevelationUnlocked&&params.yaeEnhancedActive?80:0),'e',i>=4?'aggravate':false),'杀生樱（实际阶位/强化状态）'+(i>=4?'·超激化':''));
  for(const i of [0,1,2,3,4,5])R['八重神子'].details[i].check=undefined;
  for(const i of [6,8])R['八重神子'].details[i].requires='yaeStar';
  R['八重神子'].details[7].requires='yaeNewBolt';
  edit('八重神子',9,({talent,params},d)=>sum([d(talent.q['技能伤害'],'q'),repeat(params.yaeFoxBolts,()=>d(talent.q['天狐霆雷伤害'],'q'))]),'Q（起手 + 实际天狐霆雷数）');
  edit('八重神子',10,({talent,params},d)=>sum([d(talent.q['技能伤害'],'q','aggravate'),repeat(params.yaeFoxBolts,()=>d(talent.q['天狐霆雷伤害'],'q','aggravate'))]),'Q（各段超激化样本）',{fixedReactionPattern:true});
  patch('提纳里',0,{mastery:50},active('tighnariA1Active'));patch('提纳里',3,{dmg_dendro:20},active('tighnariC2Active'));patch('提纳里',4,{mastery:({params})=>params.tighnariC4Stage==='reaction'?120:params.tighnariC4Stage==='cast'?60:0});
  edit('提纳里',1,({talent,cons},d)=>sum([d(talent.a['花筥箭伤害'],'a2'),repeat(4,()=>d(talent.a['藏蕴花矢伤害'],'a2')),...(cons>=6?[d(150,'a2')]:[])]));
  edit('提纳里',2,({talent,cons},d)=>sum([d(talent.a['花筥箭伤害'],'a2','spread'),repeat(3,()=>d(talent.a['藏蕴花矢伤害'],'a2')),d(talent.a['藏蕴花矢伤害'],'a2','spread'),...(cons>=6?[d(150,'a2','spread')]:[])]),undefined,{fixedReactionPattern:true});
  tal('提纳里','a','花筥箭伤害','a2');tal('提纳里','a','藏蕴花矢伤害','a2');tal('提纳里','q','缠藤箭伤害');tal('提纳里','q','次级缠藤箭伤害');R['提纳里'].details[4].fixedReactionPattern=true;
  patch('迪希雅',2,{eDmg:50},({params})=>params.dehyaCoordinated&&params.dehyaC2Active);patch('迪希雅',3,{qCpct:10,qCdmg:({params})=>params.dehyaBatch?0:15*params.dehyaPriorCritStacks});
  tal('迪希雅','e','剑域炽焰伤害');
  function dehyaKick({talent,attr,calc},d){const t=talent.q['焚落踢伤害2'];return d.basic(t[0]*calc(attr.atk)/100+t[1]*calc(attr.hp)/100,'q');}
  add('迪希雅','Q焚落踢',dehyaKick);
  add('迪希雅','一轮Q炽鬃拳 + 焚落踢（C6逐拳期望）',(ds,d)=>{const {attr,calc,talent,params:p,cons}=ds,t=talent.q['炽鬃拳伤害2'],b=t[0]*calc(attr.atk)/100+t[1]*calc(attr.hp)/100;let prob=[0,0,0,0,0];prob[p.dehyaPriorCritStacks]=1;const crit=cap((calc(attr.cpct)+attr.q.cpct+(attr.cpct_pyro||0))/100,0,1),out=[];
    for(let i=0;i<p.dehyaPunches;i++){const mean=prob.reduce((a,v,j)=>a+v*j,0);out.push(d.basic(b,'q',false,{dynamicCdmg:cons>=6?15*mean:0}));if(cons>=6){const next=[0,0,0,0,0];prob.forEach((v,j)=>{next[j]+=v*(1-crit);next[Math.min(4,j+1)]+=v*crit;});prob=next;}}
    const k=talent.q['焚落踢伤害2'];out.push(d.basic(k[0]*calc(attr.atk)/100+k[1]*calc(attr.hp)/100,'q',false,{dynamicCdmg:cons>=6?15*prob.reduce((a,v,j)=>a+v*j,0):0}));return sum(out);},{mode:'dehyaBatch'});
  patch('嘉明',0,{a3Dmg:20},({params})=>params.gamingSpecial&&params.currentHpPct>=50);patch('嘉明',1,{atkPct:20},active('gamingC2Active'));patch('嘉明',2,{a3Cpct:20,a3Cdmg:40},({params})=>params.gamingSpecial);
  patch('迪卢克',0,{dmg_pyro:20},active('dilucQAfterActive'));patch('迪卢克',1,{allDmg:15},({params})=>params.enemyHpPct>50);patch('迪卢克',2,{atkPct:({params})=>10*params.dilucC2Stacks});patch('迪卢克',3,{eDmg:40},({params})=>params.dilucC4Eligible&&params.dilucC4Active);
  extra('迪卢克','迪卢克C6：两次后续普攻伤害30%',{aDmg:30},{cons:6,check:active('dilucC6NormalActive')});
  R['迪卢克'].details[0].title='E第三段伤害';R['迪卢克'].details[1].title='E第三段·蒸发';tal('迪卢克','e','一段伤害');tal('迪卢克','e','二段伤害');tal('迪卢克','q','持续伤害');tal('迪卢克','q','爆裂伤害');
  patch('可莉',0,{a2Dmg:50},active('kleeSparkActive'));patch('可莉',1,{a2Multi:({params})=>[0,15,30,50][params.kleeBadges]},({params})=>params.homework&&params.Hexenzirkel&&params.kleeSparkActive);
  patch('可莉',2,{atkPct:60},({params})=>params.homework&&params.kleeC1Active);patch('可莉',3,{enemyDef:23},active('kleeC2Active'));patch('可莉',4,{allDmg:100},({params})=>params.kleeC4Explosion&&params.homework&&!params.off_field);patch('可莉',5,{dmg_pyro:({params})=>params.homework?50:10},active('kleeQAfterActive'));
  for(const i of [0,1,4,5])R['可莉'].details[i].title=(i%2?'重击·蒸发':'重击')+'（按火花/勋章实际状态）';R['可莉'].details[3].cons=4;
  tal('可莉','e','蹦蹦炸弹伤害');tal('可莉','e','诡雷伤害');add('可莉','C1额外火花（一发）',({talent},d)=>d(1.2*talent.q['轰轰火花伤害'],'q'),{cons:1});
  patch('艾梅莉埃',0,{allDmg:({attr,calc})=>Math.min(36,.015*calc(attr.atk))},active('emilieBurning'));patch('艾梅莉埃',1,{allDmg:20},({params})=>params.emilieEorPassive);patch('艾梅莉埃',2,{res_dendro:30},active('emilieC2Active'));patch('艾梅莉埃',3,{aPlus:({attr,calc})=>3*calc(attr.atk),a2Plus:({attr,calc})=>3*calc(attr.atk)},active('emilieC6Active'));
  edit('艾梅莉埃',5,({talent,params},d)=>repeat(params.emilieQHits,()=>d(talent.q['柔灯之匣·三阶攻击伤害'],'q')),'Q（实际命中次数）');

  // Skirk: preserve actual damage instances for limited per-hit additions.
  for(const i of [1,2])R['玛拉妮'].details[i].check=undefined;
  add('夜兰','C6特殊破局矢（单发，Q后最多5发）',({talent,attr,calc},d)=>d.basic(1.56*talent.a['破局矢伤害']*calc(attr.hp)/100,'a2'),{cons:6,event:'yelan-c6',params:{q:true}});
  add('克洛琳德','C6明烛之影（单次，最多6次）',(_,d)=>d(200,'a'),{cons:6,event:'clorinde-c6'});
  add('凝光','星璇（单枚）',({talent},d)=>d(talent.a['星璇伤害'],'a2'),{event:'ningguang-star'});
  add('凝光','C6七枚星璇（同状态合计，不含重击本体）',({talent},d)=>repeat(7,()=>d(talent.a['星璇伤害'],'a2')),{cons:6,event:'ningguang-c6'});
  fields['申鹤']=[N('shenheC4Stacks','申鹤C4本次已有霜霄诀层数',50,50)];
  extra('申鹤','申鹤C4：下一次E消费霜霄诀，每层5%增伤',{eDmg:({params})=>5*params.shenheC4Stacks},{cons:4,check:({params})=>params.shenheC4Consume});
  patch('莫娜',5,{a2Dmg:({params})=>60*params.monaC6ChargedStacks});
  patch('莫娜',6,{a2Multi:100},({params})=>params.q===true);
  fields['莫娜']=[N('monaC6ChargedStacks','莫娜C6强化重击已有蓄力层数',3,3)];
  edit('丝柯克',3,({talent},d)=>sum([...Array.from({length:5},()=>d(talent.q['斩击伤害']/5,'q')),d(talent.q['斩击最终段伤害'],'q')]),'极恶技·灭（六段本体总伤）',{skirkBurstBody:true});
  edit('丝柯克',5,({},d)=>d(750,'q'),'C6极恶技·斩（一层，750%攻击）',{cons:6});
  edit('丝柯克',6,({},d)=>repeat(3,()=>d(180,'a')),'C6普攻协同（一层，3次180%攻击）',{cons:6});
  edit('丝柯克',7,({},d)=>repeat(3,()=>d(180,'a2')),'C6受击协同（一层，3次180%攻击）',{cons:6});
  const skirkN5=add('丝柯克','开E后N1至N5（一套，7次伤害）',({talent:t},d)=>sum(['一段伤害','二段伤害','三段伤害2','四段伤害2','五段伤害'].flatMap(k=>(Array.isArray(t.e[k])?t.e[k]:[t.e[k]]).map(v=>d(v,'a')))),{metricKey:'skirk-n5'});
  for(const vape of [false,true])add('宵宫',vape?'开E后一套普攻·标准三箭蒸发':'开E后一套普攻（N1—N5，7箭）',({talent:t},d)=>{const a=[t.a['一段伤害2'][0],t.a['一段伤害2'][0],t.a['二段伤害'],t.a['三段伤害'],t.a['四段伤害2'][0],t.a['四段伤害2'][0],t.a['五段伤害']];return sum(a.map((v,i)=>d(v,'a',vape&&[0,3,6].includes(i)?'vaporize':false)));},{metricKey:vape?'yoimiya-n5-vape':'yoimiya-n5',fixedReactionPattern:vape});

  function params(config,c,detail,scope,p){const k=c.key,title=detail.title||'',idx=R[k].details.indexOf(detail);
    if(k==='莱欧斯利'){if(idx<=2||idx>=5&&idx<=7)p.wrioSkillActive=true;if(idx===1||idx===2||idx===5||idx===6||detail.mode==='wrioC6Ice')p.wrioGraceActive=true;}
    if(k==='刻晴'&&[1,2,3].includes(idx))p.keqingQActive=true;
    if(k==='宵宫'&&idx<=2)p.yoimiyaSkillActive=true;
    if(k==='魈'&&idx>=1&&idx<=3)p.xiaoBurstActive=true;
    if(k==='流浪者'&&(idx<=2||detail.mode==='wandererE'))p.wandererSkillActive=true;
    if(k==='荒泷一斗'){if(idx<=2)p.ittoBurstActive=true;p.ittoKesagiri=idx===0||idx===1;}
    if(k==='赛诺'&&idx<=9)p.cynoBurstActive=true;
    if(k==='阿贝多')p.albedoFlower=idx===0||idx===1;
    if(k==='诺艾尔'&&(idx===2||idx===3))p.noelleBurstActive=true;
    if(k==='神里绫人'){p.ayatoShunsuiken=idx===0||idx===1||idx===3&&p.ayatoSkillActive;if(p.ayatoShunsuiken)p.ayatoSkillActive=true;}
    if(k==='珊瑚宫心海'&&idx>=2&&idx<=4)p.kokomiBurstActive=true;
    if(k==='八重神子')p.yaeTotem=idx>=0&&idx<=5;
    if(k==='迪希雅'){p.dehyaCoordinated=idx===1;p.dehyaBatch=detail.mode==='dehyaBatch';}
    if(k==='嘉明')p.gamingSpecial=idx===0||idx===1;
    if(k==='迪卢克')p.dilucC4Eligible=idx===0||idx===1||title==='二段伤害';
    if(k==='可莉')p.kleeC4Explosion=idx===3;
    if(k==='艾梅莉埃')p.emilieEorPassive=idx<=3;
    return p;
  }
  function validate(config,c,detail,p,item){
    if(detail.fixedReactionPattern&&!['native','none',undefined].includes(item.reaction))throw new Error('该合计是固定附着样本，请选择“技能原生反应”，或把单独攻击分行后设置反应。');
    const requirements={wrioStar:p.wrioRevelationUnlocked&&p.wrioRadianceActive,cynoStar:p.cynoRevelationUnlocked&&p.cynoRadianceActive,yaeStar:p.yaeRevelationUnlocked&&p.yaeRadianceActive,yaeNewBolt:p.yaeRevelationUnlocked&&p.yaeRank>=3,razorMagic:p.homework&&p.Hexenzirkel&&p.razorMagicAvailable,razorC6:p.razorC6LightningAvailable,kokomiQ:p.kokomiBurstActive};
    if(detail.requires&&requirements[detail.requires]===false)throw new Error(c.key+'「'+detail.title+'」需要先填写相应解锁、辉映、触发或资源状态。');
    if(c.key==='神里绫人'&&p.ayatoNamisenStacks>(config.cons>=2?5:4))throw new Error('绫人C0/C1最多4层浪闪，C2起最多5层。');
    if(c.key==='八重神子'&&(p.yaeRank<1||p.yaeRank>(config.cons>=2?4:3)))throw new Error('杀生樱阶位需在1–3之间；C2可到4阶。');
    if(c.key==='莱欧斯利'&&p.wrioRadianceActive&&!p.wrioRevelationUnlocked)throw new Error('莱欧斯利辉映需要先解锁对应新天赋。');
  }
  const infusion={千织:['chioriInfused','geo'],诺艾尔:['noelleBurstActive','geo'],荒泷一斗:['ittoBurstActive','geo'],刻晴:['keqingInfused','electro'],迪卢克:['dilucQAfterActive','pyro'],艾梅莉埃:['emilieC6Active','dendro']};
  for(const k of Object.keys(infusion)){const d=R[k].details.find(d=>d.title==='基础普攻首段（物理）');if(d)d.title='普通攻击首段（按附魔状态）';}
  g.GCharacterFixes={fields:config=>fields[config.character]||[],buff:(k,i,b)=>patches[k]?.[i]?.(b)||b,extraBuffs:k=>extras[k]||[],params,validate,flats:()=>[],hasFlat:()=>false,defaults,fieldsMap:fields,patch,extra,edit,add,tal,sum,repeat,B,N,S,cap,element:(ds,element,rx,tag)=>{const x=infusion[ds.characterName];return x&&element==='physical'&&['a','a2','a3'].includes(tag)&&ds.params[x[0]]?x[1]:element;}};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof require==='function')require('./mechanisms.js');
