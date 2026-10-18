/* Display only values from the completed damage trace; never re-read form state. */
(function(g){
  'use strict';
  const normal=new Set(['normal','amplifying','additive']),special=new Set(['direct','indirect']),kinds=new Set([...normal,...special,'transformative']);
  const reactions={stellarConduct:'星超导',stellarSwirl:'星扩散',stellarVortex:'星辉冰旋',lunarCharged:'月感电',lunarBloom:'月绽放',lunarCrystallize:'月结晶',burning:'燃烧',overloaded:'超载',superConduct:'超导',electroCharged:'感电',shatter:'碎冰',swirl:'扩散',bloom:'绽放',hyperBloom:'超绽放',burgeon:'烈绽放'};
  const elements={pyro:'火伤',hydro:'水伤',cryo:'冰伤',electro:'雷伤',anemo:'风伤',geo:'岩伤',dendro:'草伤',physical:'物理伤害'};
  const finite=x=>typeof x==='number'&&Number.isFinite(x),clip=x=>Math.min(100,Math.max(0,x));
  function describe(result,changes=result?.marginal||[]){
    if(!result||result.error)return null;
    const calls=(result.details||[]).flatMap(d=>(d.calls||[]).filter(c=>kinds.has(c.kind)&&c.avg>0).map(call=>({call,panel:d.panel||{}})));
    if(!calls.length)return null;
    const active=new Set(result.active||[]);for(const x of changes||[])if(Math.abs(x.rate||0)>1e-9||Math.abs(x.rawRate||0)>1e-9)active.add(x.key);
    const affects=(...keys)=>keys.some(k=>active.has(k));
    function range(list,key,label,get,unit='',nonzero=false,neutral=0){const values=list.map(get).filter(finite);if(!values.length||nonzero&&values.every(n=>Math.abs(n-neutral)<1e-9))return null;return {key,label,min:Math.min(...values),max:Math.max(...values),unit};}
    const shared=[],addShared=(...args)=>{const value=range(calls,...args);if(value)shared.push(value);};
    if(affects('atkPct','atkPlus')||calls.some(({call:c})=>(normal.has(c.kind)||special.has(c.kind))&&finite(Number(c.pct))&&Number(c.pct)!==0))addShared('attack','攻击力',({call:c,panel:p})=>c.attack??p.atk);
    if(affects('hpPct','hpPlus'))addShared('hp','生命值',({call:c,panel:p})=>c.hp??p.hp);
    if(affects('defPct','defPlus'))addShared('defense','防御力',({call:c,panel:p})=>c.defense??p.def);
    if(affects('mastery')||calls.some(({call:c})=>special.has(c.kind)||['amplifying','additive','transformative'].includes(c.kind)))addShared('em','元素精通',({call:c})=>c.em);
    if(affects('recharge'))addShared('recharge','增伤采用充能',({call:c})=>c.recharge,'%');
    const grouped=new Map();
    for(const entry of calls){const c=entry.call,key=(special.has(c.kind)?'special:'+c.rx:c.kind==='transformative'?'reaction:'+c.rx:'normal')+':'+c.element;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(entry);}
    const groups=[...grouped].map(([key,list])=>{
      const first=list[0].call,isSpecial=special.has(first.kind),isTransform=first.kind==='transformative',name=isSpecial||isTransform?reactions[first.rx]||first.rx:elements[first.element]||first.element,stats=[];
      const add=(...args)=>{const value=range(list,...args);if(value)stats.push(value);};
      if(!isTransform){add('cr','有效暴击率',({call:c})=>clip(c.cr),'%');add('cd','结算暴击伤害',({call:c})=>Math.max(0,c.cd),'%');}
      else if(list.some(({call:c})=>c.fixedCritRate>0)){add('fixedCr','反应固定暴击率',({call:c})=>c.fixedCritRate,'%');add('fixedCd','反应固定暴伤',({call:c})=>c.fixedCritDamage,'%');}
      if(isSpecial){
        add('specialBonus',name+'增伤',({call:c})=>c.specialBonus,'%');
        add('baseBonus',name+'基础提升',({call:c})=>c.baseBonus,'%',true);
        add('elevation','擢升',({call:c})=>c.elevation,'%',true);
        add('specialFlat','反应基础附加',({call:c})=>(c.specialFlat||0)+(c.flatBaseAdded||0),'',true);
      }else if(isTransform){add('reactionBonus',name+'增伤',({call:c})=>c.reactionBonus,'%',true);}
      else{
        add('dmgBonus',name+'适用增伤',({call:c})=>c.dmgBonus,'%');
        add('flatBaseAdded','本段基础附加',({call:c})=>c.flatBaseAdded||0,'',true);
      }
      if(!isTransform&&first.kind!=='indirect')add('independentMultiplier','独立倍率',({call:c})=>c.independentMultiplier,'×',true,1);
      return {key,label:name,stats};
    });
    return {shared,groups,hasRange:[...shared,...groups.flatMap(x=>x.stats)].some(x=>x.max-x.min>.0001)};
  }
  g.GSettlement={describe};if(typeof module!=='undefined')module.exports=g.GSettlement;
})(typeof globalThis!=='undefined'?globalThis:this);
