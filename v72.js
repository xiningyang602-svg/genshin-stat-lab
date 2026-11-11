/* 7.2 fixed damage benchmarks. Source revisions are pinned in GDATA.v72. */
(function(g){
  'use strict';
  const F=g.GCharacterFixes,R=g.GRULES,{B,N,extra,repeat}=F,{mitya:M,valeriy:V}=g.GDATA.v72;
  const stellar='stellarConduct',beacons=cons=>cons>=1?M.c1Beacons:M.beacons;
  const momentumCap=cons=>V.maxMomentum+(cons>=4?V.c4ExtraMomentum:0);
  const mityaBlessing=em=>Math.min(M.baseCap,Math.max(0,em)*M.basePerMastery);
  const directive=(atk,talent,momentum,star)=>Math.max(0,atk)*(talent.a[star?'星超导反应伤害增加':'雷元素伤害增加']/100+momentum*(star?V.starMomentumRate:V.normalMomentumRate));
  g.GV72={M,V,beacons,momentumCap,mityaBlessing,directive};

  F.fieldsMap['米提亚']=[B('mityaCoreActive','侦测炉心仍有效'),N('mityaCritStacks','超限易爆试剂暴击层数',M.critStacks),N('mityaBeaconsHeld','稳态结算时持有的递变信标',M.c1Beacons),N('mityaBeaconsSpent','本次消耗的递变信标',M.c1Beacons,1)];
  F.fieldsMap['瓦列里']=[B('valeriySkillActive','2命：战技后18秒内的精通仍有效'),B('valeriyFieldActive','处于极星辉域（指令转为星超导）'),B('valeriyDirective','之前获得的攻斥指令仍有效'),N('valeriyMomentum','攻斥指令消耗的冲击势能',momentumCap(6),V.minMomentum),N('valeriyDirectiveHits','攻斥指令剩余层数',V.directiveHits),B('valeriyC6Marked','C6强化攻击已标记该敌人（7秒内）')];
  const baseFields=F.fields;
  F.fields=config=>baseFields(config).map(f=>['mityaBeaconsHeld','mityaBeaconsSpent'].includes(f[0])?[...f.slice(0,3),beacons(config.cons),...f.slice(4)]:f[0]==='valeriyMomentum'?[...f.slice(0,3),momentumCap(config.cons),...f.slice(4)]:f);

  const starHit=(d,base)=>d.basic(base,'',stellar),coreMulti=ds=>ds.cons>=6?M.c6SteadyMultiplier:1;
  const normal=(slot,key,tag,rx=false)=>({talent},d)=>d(talent[slot][key],tag,rx);
  const detail=(title,dmg,meta={})=>({title,dmg,...meta});
  const mityaStar=(s,d,slot,key,mult=1)=>starHit(d,s.calc(s.attr.mastery)*s.talent[slot][key]/100*mult);
  R['米提亚']={mainAttr:'mastery,cpct,cdmg',defDmgIdx:0,buffs:[],details:[
    detail('递变聚爆·信标星超导',(s,d)=>repeat(s.params.mityaBeaconsSpent,()=>mityaStar(s,d,'a','递变聚爆星超导伤害')),{mityaCore:'overload',requires:'mityaOverload'}),
    detail('递变聚爆·普通雷伤起手',normal('a','递变聚爆伤害','a2'),{mityaCore:'overload',requires:'mityaOverload'}),
    detail('点按E·施放雷伤',normal('e','短按技能伤害','e'),{mityaCore:'steady'}),
    detail('长按E·施放雷伤',normal('e','长按技能伤害','e'),{mityaCore:'overload'}),
    detail('稳态炉心·周期普通雷伤',(s,d)=>d(s.talent.e['稳态炉心伤害']*coreMulti(s),'e'),{mityaCore:'steady',requires:'mityaSteady'}),
    detail('稳态炉心·消耗信标星超导（单次）',(s,d)=>mityaStar(s,d,'e','稳态炉心消耗递变信标伤害',coreMulti(s)),{mityaCore:'steady',requires:'mityaSteady'}),
    detail('稳态炉心·信标引爆星超导',(s,d)=>mityaStar(s,d,'e','稳态炉心引爆伤害',coreMulti(s)*s.params.mityaBeaconsSpent),{mityaCore:'steady',requires:'mityaDetonation'}),
    detail('Q解析·递变之理（普通雷伤）',({talent,attr,calc},d)=>d.basic((calc(attr.atk)*talent.q['技能伤害2'][0]+calc(attr.mastery)*talent.q['技能伤害2'][1])/100,'q')),
    detail('C4消耗五枚信标·额外星超导',({attr,calc},d)=>starHit(d,calc(attr.mastery)*M.c4Coeff),{cons:4,requires:'mityaCore'}),
    detail('普通攻击首段',normal('a','一段伤害','a')),
    detail('普通重击',normal('a','重击伤害','a2')),
    detail('高空坠地冲击',({talent},d)=>d(talent.a['低空/高空坠地冲击伤害2'][1],'a3'))
  ]};
  const activeCore=({params:p})=>p.mityaCoreActive;
  extra('米提亚','常驻基础元素精通',{mastery:M.baseMastery},{isStatic:true});
  extra('米提亚','基准承压测验 · 稳态信标精通',{mastery:({params:p})=>p.mityaBeaconsHeld*M.steadyMastery},{check:({params:p})=>p.mityaCoreActive&&p.mityaCore==='steady'});
  extra('米提亚','超限易爆试剂 · 递变信标暴击率',{cpct:({params:p})=>p.mityaCritStacks*M.critPerStack});
  extra('米提亚','星耀祝礼 · 星超导基础伤害提升',{stellarConductBase:({attr,calc})=>mityaBlessing(calc(attr.mastery))},{sort:20});
  extra('米提亚','C1炉心 · 前台暴击伤害',{cdmg:M.c1Cdmg},{cons:1,check:({params:p})=>p.mityaCoreActive&&!p.off_field});
  extra('米提亚','C2炉心 · 稳态全队精通／过载前台精通',{mastery:({params:p})=>p.mityaCore==='steady'?M.c2Steady:!p.off_field?M.c2Overload:0},{cons:2,check:activeCore});
  extra('米提亚','C2极星辉域 · 降低冰抗与雷抗',{res_cryo:M.c2Res,res_electro:M.c2Res},{cons:2,check:({params:p})=>p.mityaCoreActive&&p.mityaRadiance});
  extra('米提亚','C6全队星超导擢升',{stellarConductElevated:M.c6Elevated},{cons:6});

  const enhancedValeriy=(slot,key,tag)=>({talent,cons},d)=>d.dynamic(talent[slot][key],tag,{dynamicDmg:cons>=6?V.c6Dmg:0});
  R['瓦列里']={mainAttr:'atk,cpct,cdmg',defDmgIdx:0,buffs:[],details:[
    detail('战技·堡垒骤进（雷伤）',normal('e','技能伤害','e')),
    detail('特殊重击·臼炮直射（雷伤）',enhancedValeriy('a','臼炮直射·抵近轰击伤害','a2')),
    detail('元素爆发·施放雷伤',normal('q','技能伤害','q')),
    detail('雷霰重弹（单发雷伤）',enhancedValeriy('q','雷霰重弹伤害','q')),
    detail('普通攻击首段（物理）',normal('a','一段伤害','a','phy')),
    detail('普通重击（物理）',normal('a','重击伤害','a2','phy')),
    detail('高空坠地冲击（物理）',({talent},d)=>d(talent.a['低空/高空坠地冲击伤害2'][1],'a3','phy'))
  ]};
  extra('瓦列里','C2战技 · 全队元素精通',{mastery:V.c2Mastery},{cons:2,check:({params:p})=>p.valeriySkillActive});
  extra('瓦列里','C6强化攻击已命中 · 雷伤暴率／雷星超导暴伤',{cpct_electro:V.c6Cpct,stellarConductCdmg_electro:V.c6StarCdmg},{cons:6,check:({params:p})=>p.valeriyC6Marked});

  const baseParams=F.params,baseValidate=F.validate,baseFlats=F.flats;
  F.params=(config,c,detail,scope,params)=>{
    const p=baseParams(config,c,detail,scope,params);
    if(c.key==='米提亚'){
      const metric=config._metric;
      p.mityaCore=metric?.mityaCore||detail.mityaCore||'overload';
      p.mityaRadiance=!!config.conditions?.stellarField;
      if(!metric&&detail.mityaCore)p.mityaCoreActive=true;
    }
    if(c.key==='瓦列里')p.valeriyRadiance=!!config.conditions?.stellarField;
    p.starsealedRadiance=p.mityaRadiance||p.yaeRadianceActive&&p.yaeRevelationUnlocked;
    return p;
  };
  F.validate=(config,c,detail,p,item,scope)=>{
    baseValidate(config,c,detail,p,item,scope);
    if(c.key==='米提亚'){
      const max=beacons(config.cons),need=detail.requires;
      if(p.mityaBeaconsHeld>max||p.mityaBeaconsSpent>max)throw Error('递变信标超过当前命座上限 '+max+' 枚。');
      if(need?.startsWith('mitya')&&!p.mityaCoreActive||need==='mityaOverload'&&(p.mityaCore!=='overload'||p.mityaBeaconsSpent<1)||['mityaSteady','mityaDetonation'].includes(need)&&p.mityaCore!=='steady'||need==='mityaDetonation'&&p.mityaBeaconsSpent<1)throw Error('请确认对应炉心有效，并填写本次消耗的信标。');
    }
    if(c.key==='瓦列里'&&(p.valeriyMomentum>momentumCap(config.cons)||p.valeriyDirective&&p.valeriyDirectiveHits>0&&p.valeriyMomentum<V.minMomentum))throw Error('攻斥指令须由消耗 '+V.minMomentum+'–'+momentumCap(config.cons)+' 点冲击势能的特殊重击触发。');
  };
  F.flats=(ds,detail,config,used)=>{
    const out=baseFlats(ds,detail,config,used),{params:p,attr,calc,talent}=ds;
    if(ds.characterName==='瓦列里'&&!p.off_field&&p.valeriyDirective&&p.valeriyDirectiveHits>0){
      const star=p.valeriyRadiance;
      out.push({id:'valeriy-directive',source:'瓦列里攻斥指令',elements:['electro'],...(star?{reactions:[stellar],directOnly:true}:{}),value:directive(calc(attr.atk)-(attr.borrowedAtk||0),talent,p.valeriyMomentum,star),quota:p.valeriyDirectiveHits});
    }
    return out;
  };
})(typeof globalThis!=='undefined'?globalThis:this);
