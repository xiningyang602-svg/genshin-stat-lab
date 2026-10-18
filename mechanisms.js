/* Stateful lunar/stellar adapters, pinned mature GO sheets; no automatic aura or timing simulation. */
(function(g){
  'use strict';
  const F=g.GCharacterFixes,R=g.GRULES,{B,N,S,cap,patch,extra,edit,add,tal,sum,repeat}=F,fields=F.fieldsMap;
  const elements=[['pyro','火'],['hydro','水'],['electro','雷'],['cryo','冰']],mode=[['none','未生效'],['sc','辉映·星超导'],['ss','辉映·星扩散']];
  fields['桑多涅']=[S('sandroneRadiance','桑多涅：当前辉映',mode),B('sandroneDecodingActive','桑多涅：解算模式有效'),B('sandronePrismPowerOver50','桑多涅：本次第二枚棱晶弹功率超过50'),N('sandroneTactics','桑多涅：本次Q清除战术层数',10),N('sandroneBeamC2Stacks','桑多涅：冷凝射线C2额外层数',3),N('sandroneC6ExtraHits','桑多涅：本次C6额外段数',4),B('sandroneC4Available','桑多涅：本次C4额外攻击可触发')];
  fields['奥黛塔']=[S('odetteRadiance','奥黛塔：当前辉映',mode),N('odetteSelfSplendor','奥黛塔：自己实际剩余华彩',6),B('odetteBurstDreamActive','奥黛塔：雪鹄之梦有效'),B('odetteImageActive','奥黛塔：独舞倒影存在')];
  fields['沃雅妮莎']=[B('vodySongActive','沃雅：遥久之歌有效'),B('vodyShredActive','沃雅：水冰减抗有效'),B('vodyC1HealActive','沃雅：治疗后5秒C1攻击有效'),S('vodyC2Voice','沃雅：当前双音模式',[['off','未触发'],['voice','水冰双音'],['vortex','风旋双音']]),N('vodyC4Stacks','沃雅：C4生命层数',3),N('vodyResources','沃雅：领唱/重唱实际剩余资源',25),B('vodyResourcesActive','沃雅：领唱/重唱30秒效果有效'),S('vodyFeatherMode','沃雅：本次羽毛适用模式',[['normal','普通水冰'],['vortex','星扩散']])];
  fields['杜林']=[S('durinForm','杜林：当前形态',[['white','白化'],['dark','黑度']]),['durinWhiteElements','杜林：白态实际已减抗的元素','elements'],N('durinA4Remaining','杜林：剩余肇象（周期攻击次数）',10),N('durinC1Remaining','杜林：C1剩余轮变启迪',20),B('durinC2Active','杜林：C2反应后增伤有效'),B('durinC6WhiteShredActive','杜林：白态C6命中后减防有效')];
  fields['布伦妮']=[S('pruneAbsorbedElement','布伦妮：实际转化元素',[['none','未转化'],...elements]),B('pruneHuntActive','布伦妮：寻猎状态有效'),N('pruneC2HitStacks','布伦妮：C2实际命中层数',6),B('pruneRallyReactionActive','布伦妮：魔导反应触发攻击加成有效'),B('pruneC6Active','布伦妮：振铃持有者触发C6攻击有效')];
  fields['法尔伽']=[N('varkaOathStacks','法尔伽：苍牙之誓实际层数',4),B('varkaC1WineAvailable','法尔伽：本次四风/苍噬消耗首个佳酿'),B('varkaC4SwirlActive','法尔伽：C4真实扩散后增伤有效')];
  fields['雅珂达']=[S('jahodaFlaskElement','雅珂达：瓶中实际元素',[['none','尚未转化'],...elements]),B('jahodaFlaskFullActive','雅珂达：秘藏瓶装满后20秒有效'),S('jahodaRobotElement','雅珂达：本次协调器攻击元素',[['none','未转化'],...elements]),B('jahodaHealEmActive','雅珂达：本人接受治疗且高于70%生命的精通有效')];
  fields['哥伦比娅']=[N('columbinaMoonlitStacks','哥伦比娅：月引有效层数',3),B('columbinaBrillianceActive','哥伦比娅：C2皎辉8秒有效'),S('columbinaBrillianceType','哥伦比娅：C2主导月反应',[['off','无'],['lunarCharged','月感电：攻击'],['lunarBloom','月绽放：精通'],['lunarCrystallize','月结晶：防御']]),N('columbinaDewRemaining','哥伦比娅：可用草露',100),B('columbinaC4ProcAvailable','哥伦比娅：本次干涉可触发C4'),['columbinaC6Reactions','哥伦比娅：C6近8秒参与月反应','reactions'],B('columbinaDomainActive','哥伦比娅：Q领域有效')];
  fields['伊涅芙']=[B('ineffaReconfigureActive','伊涅芙：Q后20秒精通重构有效'),B('ineffaCompositeActive','伊涅芙：载流复合护盾状态有效'),B('ineffaBirgittaActive','伊涅芙：薇尔琪塔实际放电'),B('ineffaThundercloudActive','伊涅芙：附近有月感电雷暴云'),B('ineffaC2Available','伊涅芙：本次Q命中敕谕可触发'),B('ineffaC6Available','伊涅芙：本次雷击后额外C6可触发')];
  fields['菈乌玛']=[N('laumaDewSpent','菈乌玛：本次长按E实际消耗草露',3),B('laumaSkillActive','菈乌玛：E后20秒状态有效'),B('laumaShredActive','菈乌玛：E命中后的水草减抗有效'),N('laumaHymnRemaining','菈乌玛：实际剩余祷歌（本段开始）',100),B('laumaHymnActive','菈乌玛：祷歌已获得且可用')];
  // Reaction selectors share the element-checkbox renderer but retain reaction keys.
  fields['哥伦比娅']=fields['哥伦比娅'].map(f=>f[2]==='reactions'?S(f[0],f[1],[['off','未发生'],['lunarCharged','月感电'],['lunarBloom','月绽放'],['lunarCrystallize','月结晶'],['all','三种都发生']]):f);
  const active=k=>({params})=>params[k]===true;
  const stars=['stellarConduct','stellarSwirl'],moons=['lunarCharged','lunarBloom','lunarCrystallize'];
  patch('桑多涅',1,{stellarConductBase:({attr,calc})=>Math.min(.007*calc(attr.atk),14),stellarSwirlBase:({attr,calc})=>Math.min(.007*calc(attr.atk),14)});
  patch('桑多涅',3,{stellarConduct:30,stellarSwirl:30},active('sandroneDecodingActive'));
  patch('桑多涅',4,{cdmg:({params})=>40+(params.sandroneRadiance!=='none'?20*params.sandroneBeamC2Stacks:0)},({params})=>params.sandroneBeam);
  patch('桑多涅',5,{stellarConductElevated:20,stellarSwirlElevated:20});
  const sandRx=p=>p.sandroneRadiance==='ss'?'stellarSwirl':p.sandroneRadiance==='sc'?'stellarConduct':false;
  function sand(ds,d,part,second=false){const {talent:t,params:p}=ds,rx=sandRx(p),suffix=rx==='stellarSwirl'?'星扩散伤害':rx?'星超导伤害':'伤害';let v=part==='beam'?t.a['重击冷凝射线'+suffix]:part==='prism'?t.e['棱晶弹'+suffix]:t.q['聚能光束'+suffix];if(part==='prism'&&second&&rx&&p.sandronePrismPowerOver50)v*=4;if(part==='burst'&&rx)v*=1+.1*p.sandroneTactics;return d(v,rx?'':part==='beam'?'a2':part==='prism'?'e':'q',rx);}
  edit('桑多涅',1,(s,d)=>sand(s,d,'beam'),'重击冷凝射线（按当前辉映）',{mode:'sandroneBeam'});
  edit('桑多涅',3,(s,d)=>sand(s,d,'prism',true),'E第二枚棱晶弹（按功率/辉映）');
  edit('桑多涅',5,(s,d)=>sand(s,d,'burst'),'Q聚能光束（按战术/辉映）');
  edit('桑多涅',6,({params},d)=>d(params.sandroneRadiance==='ss'?187.5:125,'',sandRx(params)),'C4额外攻击（一次）',{cons:4,requires:'sandroneC4'});
  edit('桑多涅',7,({params},d)=>repeat(params.sandroneC6ExtraHits,()=>d(params.sandroneRadiance==='ss'?120:params.sandroneRadiance==='sc'?80:100,'',sandRx(params))),'C6额外攻击（实际段数）',{cons:6});
  tal('桑多涅','e','棱晶弹伤害');
  F.defaults['桑多涅']=[[2,1]];
  patch('奥黛塔',1,Object.fromEntries(stars.map(rx=>[rx,({talent})=>talent.q['雪鹄之梦星烁反应伤害提升']])),active('odetteBurstDreamActive'));
  patch('奥黛塔',2,{stellarConduct:({params})=>15*params.odetteSelfSplendor,stellarSwirl:({params})=>15*params.odetteSelfSplendor});
  patch('奥黛塔',3,Object.fromEntries(stars.map(rx=>[rx+'Multi',({attr,calc})=>cap((calc(attr.atk)-1000)*.015,0,30)])));
  patch('奥黛塔',4,{stellarConductBase:({attr,calc})=>Math.min(.007*calc(attr.atk),14),stellarSwirlBase:({attr,calc})=>Math.min(.007*calc(attr.atk),14)});
  patch('奥黛塔',5,{atkPct:({params})=>7*params.odetteSelfSplendor});patch('奥黛塔',7,{});
  patch('奥黛塔',6,{res_cryo:20,res_electro:({params})=>params.odetteRadiance==='sc'?20:0,res_anemo:({params})=>params.odetteRadiance==='ss'?20:0},({params})=>params.odetteImageActive&&params.odetteRadiance!=='none');
  patch('奥黛塔',8,{stellarConductElevated:({params})=>20+(params.odetteSelfSplendor>0?25:0),stellarSwirlElevated:({params})=>20+(params.odetteSelfSplendor>0?25:0)});
  function odette(ds,d,part){const {talent:t,params:p}=ds,ss=p.odetteRadiance==='ss',rx=ss?'stellarSwirl':'stellarConduct';if(part!=='破晓终奏'&&p.odetteRadiance==='none')return d(t.e[part+'伤害'],'e');return d(t.e[part+'星超导/星扩散伤害'][ss?1:0],'',rx);}
  for(const [i,part]of [[0,'破晓终奏'],[1,'破晓终奏'],[2,'拂羽舞步'],[3,'旋翼舞步'],[4,'拂羽舞步'],[5,'旋翼舞步']])edit('奥黛塔',i,(s,d)=>odette(s,d,part),part+'（实际辉映/华彩状态）');
  edit('奥黛塔',6,({params},d)=>d(params.odetteRadiance==='ss'?450:300,'',params.odetteRadiance==='ss'?'stellarSwirl':'stellarConduct'),'C1共舞结束额外星烁攻击',{cons:1});
  edit('奥黛塔',7,({params},d)=>d(params.odetteRadiance==='ss'?99:66,'',params.odetteRadiance==='ss'?'stellarSwirl':'stellarConduct'),'C4星烁触发的协同攻击（实际次数）',{cons:4});
  tal('奥黛塔','e','技能伤害');
  F.defaults['奥黛塔']=[[R['奥黛塔'].details.length-1,1]];
  patch('沃雅妮莎',0,{res_hydro:({talent})=>talent.e['水元素/冰元素抗性降低'],res_cryo:({talent})=>talent.e['水元素/冰元素抗性降低']},active('vodyShredActive'));
  patch('沃雅妮莎',1,{qMulti:({talent})=>talent.q['遥久之歌伤害加成']},active('vodySongActive'));
  patch('沃雅妮莎',2,{hpPct:({params})=>20*params.vodyC4Stacks});
  patch('沃雅妮莎',3,{dmg_hydro:60,dmg_cryo:60,stellarSwirlElevated:25},active('vodySongActive'));patch('沃雅妮莎',4,{});
  extra('沃雅妮莎','沃雅C1：本人治疗触发的攻击加成',{atkPlus:({attr,calc})=>.008*calc(attr.hp)},{cons:1,check:active('vodyC1HealActive'),sort:9});
  extra('沃雅妮莎','沃雅C2：双音的对应暴伤',{cdmg_hydro:({params})=>params.vodyC2Voice==='voice'?50:0,cdmg_cryo:({params})=>params.vodyC2Voice==='voice'?50:0,stellarSwirlCdmg:({params})=>params.vodyC2Voice==='vortex'?60:0},{cons:2,check:({params,cons})=>!params.off_field||cons>=6});
  F.defaults['沃雅妮莎']=[[1,1]];
  patch('杜林',0,Object.fromEntries(['pyro','hydro','cryo','electro','anemo','geo','dendro'].map(e=>['res_'+e,({params})=>params.durinForm==='white'&&params.durinWhiteElements.includes(e)?20*(params.Hexenzirkel?1.75:1):0])));
  patch('杜林',1,{vaporize:({params})=>40*(params.Hexenzirkel?1.75:1),melt:({params})=>40*(params.Hexenzirkel?1.75:1)},({params})=>params.durinForm==='dark');
  patch('杜林',2,{qMulti:({attr,calc})=>Math.min(.03*calc(attr.atk),75)},({params})=>params.durinPeriodic&&params.durinA4Remaining>0);
  patch('杜林',3,{});patch('杜林',4,{dmg_pyro:50},active('durinC2Active'));patch('杜林',7,{enemyDef:30},({params})=>params.durinForm==='white'&&params.durinC6WhiteShredActive);patch('杜林',8,{qIgnore:40},({params})=>params.durinForm==='dark');
  for(const [i,name]of [[0,'白化法·如光流变伤害2'],[1,'黑度法·如星阴燃伤害2']])edit('杜林',i,({talent},d)=>sum(talent.q[name].map(v=>d(v,'q'))));
  F.defaults['杜林']=[[0,1]];
  patch('布伦妮',0,{atkPct:90},({params})=>params.homework&&params.Hexenzirkel&&params.pruneRallyReactionActive);
  patch('布伦妮',1,{atkPct:({params})=>10+5*params.pruneC2HitStacks},active('pruneHuntActive'));patch('布伦妮',2,{atkPlus:350},({params})=>(params.partySize>1||params.metricAssumeParty)&&params.pruneC6Active);
  // Use per-call element override instead of coloringDmg so ordinary elemental goblets are handled once.
  edit('布伦妮',2,({talent,params},d)=>d.dynamic(talent.e['咚锵锵·裁魔之惩伤害'],'e',{},false,{damageElement:params.pruneAbsorbedElement==='none'?'anemo':params.pruneAbsorbedElement}),'E第二段（按真实转化元素）');
  add('布伦妮','A1转化狩灾誓锤',({params},d)=>d.dynamic(150,'q',{},false,{damageElement:params.pruneAbsorbedElement}),{requires:'pruneElement'});
  add('布伦妮','C4转化誓锤弹跳',({params},d)=>d.dynamic(80,'q',{},false,{damageElement:params.pruneAbsorbedElement}),{cons:4,requires:'pruneElement'});
  patch('法尔伽',0,{multi:({params})=>100*(params.varkaA1Multiplier*(params.varkaWineHit?2:1)-1)},({params})=>params.varkaEligibleHit);
  patch('法尔伽',1,{allDmg:({params})=>7.5*params.varkaOathStacks},({params})=>params.varkaEligibleHit);
  patch('法尔伽',2,{dmg_anemo:({attr,calc})=>Math.min(.01*calc(attr.atk),25),allElementDmg:0},({params})=>!!params.varkaElement);
  patch('法尔伽',3,{});patch('法尔伽',4,{dmg_anemo:20},active('varkaC4SwirlActive'));patch('法尔伽',5,{cdmg:({params})=>20*params.varkaOathStacks},({params})=>params.varkaEligibleHit);
  // Typed counterpart of his Anemo bonus, resolved for the actual party element.
  extra('法尔伽','法尔伽：队伍对应元素伤害加成',Object.fromEntries(elements.map(([e])=>['dmg_'+e,({attr,calc,params,cons})=>(params.varkaElement===e?Math.min(.01*calc(attr.atk),25)+(cons>=4&&params.varkaC4SwirlActive?20:0):0)])),{sort:9});
  for(const i of [1,2,4,5])R['法尔伽'].details[i].requires='varkaPhec';R['法尔伽'].details[4].cons=1;R['法尔伽'].details[5].cons=1;R['法尔伽'].details[6].cons=2;
  const ve=tal('法尔伽','e','技能伤害');F.defaults['法尔伽']=[[ve,1]];
  edit('雅珂达',1,({talent,params},d)=>d.dynamic(talent.e['猫猫球伤害'],'e',{},false,{damageElement:params.jahodaFlaskElement}),'E猫猫球（满辉/实际瓶中元素）',{requires:'jahodaBall'});
  patch('雅珂达',0,{cpct:5,cdmg:40},({params})=>params.Moonsign>=2&&params.jahodaFlaskFullActive);
  extra('雅珂达','雅珂达A4：本人受治疗后的精通100',{mastery:100},{check:({params})=>params.jahodaHealEmActive&&params.currentHpPct>70});
  add('雅珂达','Q协调器转化攻击（一次）',({talent,params},d)=>d.dynamic(talent.q['猫型家用互助协调器伤害']*(params.jahodaPyroRobot?1.3:1),'q',{},false,{damageElement:params.jahodaRobotElement}),{requires:'jahodaRobot'});
  F.defaults['雅珂达']=[[0,1],[2,1]];
  patch('哥伦比娅',0,Object.fromEntries(moons.map(rx=>[rx,({talent})=>talent.q['月曜反应伤害提升']])),active('columbinaDomainActive'));
  patch('哥伦比娅',1,{cpct:({params})=>5*params.columbinaMoonlitStacks});
  patch('哥伦比娅',2,Object.fromEntries(moons.map(rx=>[rx+'Base',({attr,calc})=>Math.min(.0002*calc(attr.hp),7)])));
  patch('哥伦比娅',4,{lunarChargedElevated:7,lunarBloomElevated:7,lunarCrystallizeElevated:7,hpPct:({params})=>params.columbinaBrillianceActive?40:0});
  patch('哥伦比娅',5,{atkPlus:({attr,calc,params})=>params.columbinaBrillianceType==='lunarCharged'?.01*calc(attr.hp):0,mastery:({attr,calc,params})=>params.columbinaBrillianceType==='lunarBloom'?.0035*calc(attr.hp):0,defPlus:({attr,calc,params})=>params.columbinaBrillianceType==='lunarCrystallize'?.01*calc(attr.hp):0},({params})=>params.columbinaBrillianceActive&&params.Moonsign>=2&&!params.off_field);
  for(const i of [3,6,7,9]){const v=R['哥伦比娅'].buffs[i].data.elevated;patch('哥伦比娅',i,Object.fromEntries(moons.map(rx=>[rx+'Elevated',v])));}
  patch('哥伦比娅',8,{});
  patch('哥伦比娅',10,{lunarChargedElevated:7,lunarBloomElevated:7,lunarCrystallizeElevated:7,...Object.fromEntries(['hydro','electro','dendro','geo'].map(e=>['cdmg_'+e,({params})=>{const rx=params.columbinaC6Reactions;return rx==='all'||e==='hydro'&&rx!=='off'||e==='electro'&&rx==='lunarCharged'||e==='dendro'&&rx==='lunarBloom'||e==='geo'&&rx==='lunarCrystallize'?80:0;}]))});
  edit('哥伦比娅',0,({talent,attr,calc},d)=>repeat(3,()=>d.basic(calc(attr.hp)*talent.a['月露涤荡伤害2'][0]/100,'','lunarBloom')),'特殊重击·月露涤荡（三段，消耗1草露）',{resource:'columbinaDew'});
  for(const [i,rx]of [[3,'lunarCharged'],[4,'lunarBloom'],[5,'lunarCrystallize'],[6,'lunarCharged'],[7,'lunarBloom'],[8,'lunarCrystallize']]){const names={lunarCharged:'月感电',lunarBloom:'月绽放',lunarCrystallize:'月结晶'};edit('哥伦比娅',i,({attr,calc,talent,params,cons},d)=>d.basic(calc(attr.hp)*talent.e['引力干涉·'+names[rx]+'伤害']/100,'',rx,{specialFlat:cons>=4&&params.columbinaC4ProcAvailable?calc(attr.hp)*(rx==='lunarBloom'?.025:.125):0}),'引力干涉·'+names[rx]+'（按实际状态）',{...(i>=6?{cons:4}:{}),resource:'columbinaInterference'});}
  add('哥伦比娅','Q施放水伤',({attr,calc,talent},d)=>d.basic(calc(attr.hp)*talent.q['技能伤害']/100,'q'));
  F.defaults['哥伦比娅']=[[1,1],[2,1]];
  patch('伊涅芙',0,{mastery:({attr,calc})=>.06*calc(attr.atk)},active('ineffaReconfigureActive'));
  patch('伊涅芙',1,{lunarChargedBase:({attr,calc})=>Math.min(.007*calc(attr.atk),14)});
  patch('伊涅芙',2,{lunarCharged:({attr,calc})=>Math.min(.025*calc(attr.atk),50)},active('ineffaCompositeActive'));
  R['伊涅芙'].details[4].requires='ineffaA1';R['伊涅芙'].details[6].requires='ineffaC2';R['伊涅芙'].details[6].cons=2;R['伊涅芙'].details[7].requires='ineffaC6';R['伊涅芙'].details[7].cons=6;
  F.defaults['伊涅芙']=[[0,1],[1,1],[3,1]];
  patch('菈乌玛',0,{lunarBloomCpct:10,lunarBloomCdmg:20},({params})=>params.Moonsign>=2&&params.laumaSkillActive);
  patch('菈乌玛',2,{lunarBloomBase:({attr,calc})=>Math.min(.0175*calc(attr.mastery),14)});
  patch('菈乌玛',3,{res_hydro:({talent})=>talent.e['元素抗性降低'],res_dendro:({talent})=>talent.e['元素抗性降低']},active('laumaShredActive'));patch('菈乌玛',4,{});patch('菈乌玛',5,{});
  edit('菈乌玛',1,({talent,attr,calc,params},d)=>d.basic(calc(attr.mastery)*talent.e['长按二段伤害']*params.laumaDewSpent/100,'','lunarBloom'),'长按E第二段（实际消耗草露）',{requires:'laumaHold'});
  R['菈乌玛'].details[5].cons=6;R['菈乌玛'].details[5].resource='laumaC6E';R['菈乌玛'].details[5].title='C6额外月绽放（不吃祷歌，增加2层）';
  R['菈乌玛'].details[6].cons=6;R['菈乌玛'].details[6].resource='laumaC6N';R['菈乌玛'].details[6].title='C6普攻额外月绽放（消耗1祷歌）';
  tal('菈乌玛','e','点按伤害');tal('菈乌玛','e','长按一段伤害');F.defaults['菈乌玛']=[[2,1]];

  const originalParams=F.params;
  F.params=function(config,c,detail,scope,p){p=originalParams(config,c,detail,scope,p);const k=c.key,idx=R[k].details.indexOf(detail),party=[c,...(scope==='solo'?[]:(config.teammates||[]).map(t=>g.GDATA.characters.find(c=>c.key===t.character)).filter(Boolean))],counts={};for(const member of party)counts[member.element]=(counts[member.element]||0)+1;
    if(k==='桑多涅')p.sandroneBeam=detail.mode==='sandroneBeam'||idx===7&&p.sandroneRadiance!=='none';
    if(k==='杜林'){p.durinPeriodic=idx>=2&&idx<=5;p.durinForm=idx===0||idx===2?'white':idx===1||idx===3||idx===4||idx===5?'dark':p.durinForm;}
    if(k==='法尔伽'){p.varkaElement=p.metricAssumeParty?'cryo':['pyro','hydro','electro','cryo'].find(e=>counts[e]>0)||'';p.varkaA1Multiplier=p.metricAssumeParty?2.2:[1,1.4,2.2][(counts.anemo>=2?1:0)+(counts[p.varkaElement]>=2?1:0)];p.varkaEligibleHit=idx<=2||idx===4||idx===5;p.varkaWineHit=config.cons>=1&&(idx===1||idx===2||idx===4||idx===5)&&p.varkaC1WineAvailable;if(p.varkaElement)p.absorbedElement=p.varkaElement;}
    if(k==='雅珂达'){const ranked=['pyro','hydro','electro','cryo'].filter(e=>counts[e]).sort((a,b)=>counts[b]-counts[a]);p.jahodaPyroRobot=ranked[0]==='pyro'||config.cons>=2&&p.Moonsign>=2&&ranked[1]==='pyro';}
    if(k==='恰斯卡')p.chascaEligibleRounds=idx>=0&&idx<=3;
    return p;};
  const originalValidate=F.validate;
  F.validate=function(config,c,detail,p,item,scope){originalValidate(config,c,detail,p,item,scope);const r=detail.requires,valid={sandroneC4:p.sandroneC4Available&&p.sandroneRadiance!=='none',odetteStar:p.odetteRadiance!=='none',pruneElement:p.pruneAbsorbedElement!=='none',varkaPhec:!!p.varkaElement,jahodaBall:p.Moonsign>=2&&p.jahodaFlaskElement!=='none',jahodaRobot:p.Moonsign>=2&&p.jahodaRobotElement!=='none',ineffaA1:p.ineffaBirgittaActive&&p.ineffaThundercloudActive,ineffaC2:p.ineffaC2Available,ineffaC6:p.ineffaCompositeActive&&p.ineffaThundercloudActive&&p.ineffaC6Available,laumaHold:p.laumaDewSpent>=1};
    if(r&&valid[r]===false)throw new Error(c.key+'「'+detail.title+'」缺少实际形态、队伍资格、触发或资源条件，请在技能状态中填写。');
    if(c.key==='奥黛塔'&&p.odetteSelfSplendor>(config.cons>=1?6:4))throw new Error('奥黛塔C0自身最多4层华彩，C1起最多6层。');
    if(c.key==='沃雅妮莎'&&p.vodyResources>(p.off_field?10:25))throw new Error('沃雅领唱前台最多25层，后台重唱最多10层。');
    if(c.key==='杜林'&&p.durinC1Remaining%2!==0)throw new Error('杜林黑态每次消耗2层轮变启迪，请填偶数剩余层数。');
    if(config.sets?.some(s=>s.name==='烬城勇者绘卷'&&s.count>=4)&&(p.scrollActive||p.scrollNightsoulActive)){
      if(!Array.isArray(p.scrollElements)||p.scrollElements.length<2||!p.scrollElements.includes(c.element))throw new Error('烬城需要至少两种实际反应元素，且包括装备者自身元素。');
      if(p.scrollNightsoulActive&&!g.GTeam?.NIGHTS.includes(c.key))throw new Error('该角色不能进入夜魂加持，无法触发烬城额外28%。');
    }
  };
  F.resources=function(ds,detail,item,used){const p=ds.params,n=Number(item.count),k=ds.characterName,consume=(name,cost,quota)=>{used[name]=(used[name]||0)+cost*n;if(used[name]>quota+1e-8)throw new Error(name+'超过可用资源 '+quota+'，请拆分实际状态或补入合法资源获取。');};
    const event=ds.params.metricEvent;
    if(k==='兹白'&&ds.cons>=1&&event==='zibai-first')consume('兹白本轮C1首次飞踏',1,1);
    if(k==='玛拉妮'&&ds.cons>=1&&ds.cons<6&&event==='mualani-first')consume('玛拉妮本轮C1首次巨浪',1,1);
    if(k==='法尔伽'&&ds.cons>=1&&event==='varka-enhanced')consume('法尔伽本轮C1佳酿',1,1);
    if(k==='神里绫华'&&event==='ayaka-enhanced')consume('绫华当前C6薄冰重击',1,1);
    if(k==='迪希雅'&&event==='dehya-enhanced')consume('迪希雅当前C2待触发协同',1,1);
    if(k==='瓦雷莎'&&event==='varesa-enhanced')consume('瓦雷莎当前C4精进勇猛',1,1);
    if(k==='兹白'&&event==='zibai-n4-enhanced')consume('兹白当前C4月涣华',1,1);
    if(event==='yelan-c6')consume('夜兰本轮C6特殊破局矢',1,5);
    if(event==='clorinde-c6')consume('克洛琳德本轮C6明烛之影',1,6);
    if(event==='ningguang-c6')consume('凝光本轮C6七星璇重击组',1,1);
    if(event==='shenhe-enhanced')consume('申鹤当前C4霜霄诀',1,1);
    if(event==='mona-enhanced')consume('莫娜当前C6蓄力重击',1,1);
    if(detail.resource==='columbinaDew')consume('哥伦比娅草露',1,p.columbinaDewRemaining);
    if(detail.resource==='columbinaInterference'&&ds.cons>=4&&p.columbinaC4ProcAvailable)consume('哥伦比娅C4当前15秒事件',1,1);
    if(k==='杜林'&&p.durinPeriodic&&p.durinA4Remaining>0)consume('杜林肇象',1,p.durinA4Remaining);
    if(detail.resource==='laumaC6E'){consume('菈乌玛C6圣域事件',1,8);used['菈乌玛新增祷歌']=(used['菈乌玛新增祷歌']||0)+2*n;}
    if(detail.resource==='laumaC6N'){if(!p.laumaHymnActive)throw new Error('菈乌玛C6普攻需要先获得祷歌。');consume('菈乌玛祷歌',1,p.laumaHymnRemaining+(used['菈乌玛新增祷歌']||0));}
  };
  F.flats=function(ds,detail,config,used){const {params:p,attr,calc,talent:t,cons,characterName:k}=ds,out=[];
    if(k==='杜林'&&cons>=1&&p.durinForm==='dark'&&p.durinC1Remaining>0)out.push({id:'durin-c1',source:'杜林C1轮变启迪',skills:['q'],value:1.5*calc(attr.atk),quota:p.durinC1Remaining/2});
    if(k==='沃雅妮莎'&&p.vodyResourcesActive&&p.vodyResources>0){const vortex=p.vodyFeatherMode==='vortex';out.push({id:'vody-feather',source:'沃雅领唱/重唱',...(vortex?{reactions:['stellarSwirl']}:{elements:['hydro','cryo']}),value:cap((calc(attr.hp)-40000)*(vortex?.26:.14),0,vortex?6500:3500),quota:p.vodyResources});}
    if(k==='菈乌玛'&&p.laumaHymnActive&&detail.resource!=='laumaC6E'){const quota=p.laumaHymnRemaining+(used['菈乌玛新增祷歌']||0),em=calc(attr.mastery);if(quota>0){out.push({id:'lauma-hymn-core',source:'菈乌玛祷歌',reactions:['bloom','hyperBloom','burgeon'],value:em*(t.q['绽放、超绽放、烈绽放反应伤害提升']/100+(cons>=2?5:0)),quota});out.push({id:'lauma-hymn-moon',source:'菈乌玛祷歌',reactions:['lunarBloom'],value:em*(t.q['月绽放反应伤害提升']/100+(cons>=2?4:0)),quota,preconsumed:detail.resource==='laumaC6N'});}}
    return out;};
  F.hasFlat=config=>config.character==='杜林'&&config.cons>=1||config.character==='沃雅妮莎'&&config.conditions?.vodyResourcesActive||config.character==='菈乌玛'&&config.conditions?.laumaHymnActive;
})(typeof globalThis!=='undefined'?globalThis:this);
