/* Artifact structure and discrete tier witnesses, separate from damage formulas. */
(function(global){
  'use strict';
  const E=global.GEngine,D=global.GDATA,keys=Object.keys(E.ROLLS);
  function slots(mains,starts=[4,4,4,4,4]){return ['生之花','死之羽','时之沙','空之杯','理之冠'].map((name,i)=>({name,main:['hpPlus','atkPlus',mains.sands,mains.goblet,mains.circlet][i],initial:starts[i]===3?3:4,upgrades:starts[i]===3?4:5}));}
  function checkBounds(config,allocation,mains,scope='solo',integer=false){
    const parts=slots(mains,config.artifactStarts),units=E.rollUnits(config),counts={};
    for(const key of keys){let value=(allocation[key]||0)*units[key];if(key==='recharge')value+=(config.reservedRechargeRolls?.[scope]||0)*E.ROLLS.recharge;counts[key]=value/E.MAX_ROLLS[key];if(integer)counts[key]=Math.ceil(counts[key]-1e-9);}
    const total=Object.values(counts).reduce((a,b)=>a+b,0),maximum=parts.reduce((a,s)=>a+4+s.upgrades,0);
    if(total>maximum+1e-8)return {ok:false,reason:'分配与保留充能超过五件圣遗物的总数值次数上限。'};
    let minimumUpgrades=0;
    for(const key of keys){const allowed=parts.filter(s=>s.main!==key),cap=allowed.reduce((n,s)=>n+1+s.upgrades,0);if(counts[key]>cap+1e-8)return {ok:false,reason:E.LABELS[key]+'超过可出现件数与强化次数上限。'};minimumUpgrades+=Math.max(0,counts[key]-allowed.length);}
    if(minimumUpgrades>parts.reduce((n,s)=>n+s.upgrades,0)+1e-8)return {ok:false,reason:'这些属性与保留充能共同需要的强化次数超过五件可用次数。'};
    const active=keys.filter(k=>counts[k]>1e-9);
    for(let mask=1;mask<1<<active.length;mask++){
      const selected=active.filter((_,i)=>mask>>i&1),sum=selected.reduce((n,k)=>n+counts[k],0);
      const cap=parts.reduce((n,s)=>{const types=selected.filter(k=>k!==s.main).length;return n+(types?s.upgrades+Math.min(4,types):0);},0);
      if(sum>cap+1e-8)return {ok:false,reason:'多种副词条共同占用的初值和强化次数超过五件上限。'};
    }
    return {ok:true,total,minimumUpgrades,maximum};
  }
  function capacity(config,mains,key){return slots(mains,config.artifactStarts).filter(s=>s.main!==key).reduce((n,s)=>n+1+s.upgrades,0)*E.MAX_ROLLS[key]/E.rollUnits(config)[key];}
  function structure(counts,mains,inactive,starts,maxNodes=15000){
    const parts=slots(mains,starts),used=Object.keys(counts).filter(k=>counts[k]>0).sort((a,b)=>counts[b]-counts[a]);
    const memo=new Set();let nodes=0,exhausted=false;
    function search(i,left){
      if(++nodes>maxNodes){exhausted=true;return null;}
      if(i===5)return left.every(n=>n===0)?[]:null;
      const signature=i+':'+left.join(',');if(memo.has(signature))return null;
      const future=parts.slice(i),total=left.reduce((a,b)=>a+b,0);
      if(total>future.reduce((n,s)=>n+4+s.upgrades,0))return null;
      let minUp=0;for(let k=0;k<used.length;k++){const available=future.filter(s=>s.main!==used[k]);if(left[k]>available.reduce((n,s)=>n+1+s.upgrades,0))return null;minUp+=Math.max(0,left[k]-available.length);}
      if(minUp>future.reduce((n,s)=>n+s.upgrades,0))return null;
      const part=parts[i],patterns=[];
      function build(k,a,sum,distinct,up){
        if(distinct>4||up>part.upgrades||sum>4+part.upgrades)return;
        if(k===used.length){
          const fillers=inactive.filter(key=>key!==part.main&&!used.some((u,j)=>u===key&&a[j]>0));
          if(fillers.length<4-distinct||sum+(4-distinct)>4+part.upgrades)return;
          if(sum+(4-distinct)<4+part.upgrades&&fillers.length===0)return;
          patterns.push({a:a.slice(),sum,distinct,fillers});return;
        }
        const max=part.main===used[k]?0:Math.min(left[k],1+part.upgrades,4+part.upgrades-sum);
        for(let n=max;n>=0;n--){a[k]=n;build(k+1,a,sum+n,distinct+(n>0),up+Math.max(0,n-1));}
      }
      build(0,[],0,0,0);patterns.sort((a,b)=>b.sum-a.sum||b.distinct-a.distinct);
      for(const p of patterns){const next=search(i+1,left.map((n,k)=>n-p.a[k]));if(next){
        const stats=Object.fromEntries(used.map((k,j)=>[k,p.a[j]]).filter(([,n])=>n)),fillerKeys=p.fillers.slice(0,4-p.distinct);
        for(const k of fillerKeys)stats[k]=1;
        const spare=4+part.upgrades-Object.values(stats).reduce((a,b)=>a+b,0);
        if(spare){const target=fillerKeys[0]||Object.keys(stats).find(k=>inactive.includes(k));if(!target)continue;stats[target]+=spare;}
        return [{...part,stats},...next];
      }if(exhausted)return null;}
      memo.add(signature);return null;
    }
    const witness=search(0,used.map(k=>counts[k]));return {witness,nodes,exhausted};
  }
  function tierPack(key,target,above=false,maxCount=30){
    if(target<=1e-8)return {values:[],value:0,count:0};
    const tiers=D.substatTiers[key],max=tiers[3],min=tiers[0],first=Math.max(1,Math.ceil(target/max-1e-8));
    if(first>maxCount)return null;
    const lowerCount=first-1,fallback={values:Array(lowerCount).fill(max),value:lowerCount*max,count:lowerCount};
    for(let n=first;n<=maxCount;n++){
      if(!above&&n*min>target+1e-8)break;
      let best=null,distance=Infinity;
      for(let a=0;a<=n;a++)for(let b=0;b<=n-a;b++)for(let c=0;c<=n-a-b;c++){
        const d=n-a-b-c,value=a*tiers[0]+b*tiers[1]+c*tiers[2]+d*tiers[3];
        if(above?value<target-1e-8:value>target+1e-8)continue;
        const gap=Math.abs(value-target);if(gap<distance-1e-9){distance=gap;best={values:[...Array(a).fill(tiers[0]),...Array(b).fill(tiers[1]),...Array(c).fill(tiers[2]),...Array(d).fill(tiers[3])],value,count:n};}
      }
      if(best)return best;
    }
    return above?null:fallback;
  }
  function recommend(config,scope,allocation,active,mains){
    const units=E.rollUnits(config),reserve=(config.reservedRechargeRolls?.[scope]||0)*E.ROLLS.recharge;
    const packs={},inactive=keys.filter(k=>!active.includes(k));
    for(const key of keys){let target=(allocation[key]||0)*units[key];if(key==='recharge')target+=reserve;
      packs[key]=tierPack(key,target,false,slots(mains,config.artifactStarts).filter(s=>s.main!==key).reduce((n,s)=>n+s.upgrades+1,0));
      if(key==='recharge'&&(!packs[key]||packs[key].value<reserve-1e-8))packs[key]=tierPack(key,reserve,true);
      if(!packs[key])return {error:'保留充能无法由五件圣遗物的四档数值满足。'};
    }
    const cfg={...config,mains,reservedRechargeRolls:{...config.reservedRechargeRolls,[scope]:0}},ctx=E.prepare(cfg,scope);
    function evaluate(p){const a=Object.fromEntries(keys.map(k=>[k,p[k].value/units[k]]));return ctx.evaluate(a);}
    let placement=null;
    for(let attempt=0;attempt<45;attempt++){
      const counts=Object.fromEntries(keys.map(k=>[k,packs[k].count])),ret=structure(counts,mains,inactive,config.artifactStarts);
      if(ret.witness){placement=ret.witness;break;}
      if(ret.exhausted)return {error:'逐件分配搜索达到限制，尚未找到见证；不能据此断言实物不可能。'};
      let choice=null;const before=evaluate(packs);
      for(const key of active){if(!packs[key].count||key==='recharge'&&packs[key].value-packs[key].values.at(-1)<reserve-1e-8)continue;
        const values=packs[key].values.slice(0,-1),pack={values,value:values.reduce((a,b)=>a+b,0),count:values.length};
        const lost=before-evaluate({...packs,[key]:pack});if(!choice||lost<choice.lost)choice={key,pack,lost};
      }
      if(!choice)return {error:'当前预算与保留充能未找到可落入五件的方案。'};packs[choice.key]=choice.pack;
    }
    if(!placement)return {error:'尚未找到可实现的逐件方案。'};
    const queues=Object.fromEntries(keys.map(k=>[k,packs[k].values.slice()])),rawTotals=Object.fromEntries(keys.map(k=>[k,0])),rawCounts=Object.fromEntries(keys.map(k=>[k,0]));
    for(const part of placement){part.tiers={};for(const [k,n]of Object.entries(part.stats)){const values=[];for(let j=0;j<n;j++){const v=queues[k].length?queues[k].shift():D.substatTiers[k][0];values.push(v);rawTotals[k]+=v;rawCounts[k]++;}part.tiers[k]=values;}}
    const effectiveAll=Object.fromEntries(keys.map(k=>[k,rawTotals[k]/units[k]]));
    const useful=Object.fromEntries(active.map(k=>[k,Math.max(0,effectiveAll[k]-(k==='recharge'?reserve/units.recharge:0))]));
    const used=Object.values(useful).reduce((a,b)=>a+b,0);
    if(used>config.budget+1e-7)return {error:'离散方案超过有效词条预算，未将其作为推荐结果。'};
    const result=ctx.evaluate(effectiveAll,true);
    if(result.panel.recharge<(config.minRecharge?.[scope]||100)-1e-8)return {error:'离散方案没有满足所设最低充能。'};
    const costs=E.rollCosts(config),marginal=keys.map(key=>({key,name:E.LABELS[key],increment:units[key],rawCost:costs[key],rawIncrement:E.ROLLS[key],rate:(ctx.evaluate({...effectiveAll,[key]:effectiveAll[key]+1})/result.total-1)*100,rawRate:(ctx.evaluate({...effectiveAll,[key]:effectiveAll[key]+costs[key]})/result.total-1)*100})).sort((a,b)=>b.rate-a.rate);
    return {...result,allocation:useful,effectiveAll,rawTotals,rawCounts,placement,mains,used,budgetLeft:config.budget-used,active,marginal,method:'实际四档数值的逐件见证；接近连续搜索结果的可实现推荐，未宣称离散全局最优'};
  }
  global.GArtifact={slots,checkBounds,capacity,structure,tierPack,recommend};
  if(typeof module!=='undefined')module.exports=global.GArtifact;
})(typeof globalThis!=='undefined'?globalThis:this);
