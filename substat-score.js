/* Compare the equipped substats with a fixed-main, equal-budget damage search. */
(function(g){
  'use strict';
  const E=g.GEngine,keys=Object.keys(E.ROLLS);

  function equipment(config){
    if(config.panelMode==='artifacts')return {mode:'artifacts',stats:{...config.artifactPanel}};
    if(Number(config.level)!==90)throw Error('常驻面板在90级时可折算词条数；当前等级请用圣遗物合计或截图。');
    return g.GResident.infer(config,config.panel);
  }

  function summarize(config,scope='solo'){
    const cfg={...config,autoMains:false,normalizedBudget:true,rollQuality:'average',customUnits:undefined,
      minRecharge:{solo:100,team:100},reservedRechargeRolls:{solo:0,team:0}};
    const anchor=equipment(cfg),main=E.artifactMainStats(cfg.mains),units=E.rollUnits(cfg),substats={};
    for(const key of keys){
      const value=Number(anchor.stats[key]||0)-Number(main[key]||0);
      const tolerance=cfg.panelMode==='artifacts'?1e-6:['hpPlus','atkPlus','defPlus','mastery'].includes(key)?1.1:.16;
      if(!Number.isFinite(value)||value < -tolerance)throw Error('圣遗物'+E.LABELS[key]+'不足以包含主属性，请核对输入。');
      substats[key]=Math.max(0,value);
    }
    const active=E.effectiveKeys(cfg,scope),allocation=Object.fromEntries(active.map(key=>[key,substats[key]/units[key]]));
    const fixed={mode:'artifacts',stats:{...anchor.stats}};
    for(const key of active)fixed.stats[key]=Number(main[key]||0);
    const count=Object.values(allocation).reduce((sum,n)=>sum+n,0);
    return {cfg:{...cfg,budget:count},count,active,allocation,substats,units,fixed,estimated:config.panelMode!=='artifacts'};
  }

  async function compare(config,scope,current,onProgress=()=>{}){
    const summary=summarize(config,scope);
    try{
      const optimum=await E.optimize(summary.cfg,scope,onProgress,{
        panel:summary.fixed,active:summary.active,seed:summary.allocation,material:false,
      });
      if(!(current.total>0)||!(optimum.total>0))throw Error('当前指标没有正伤害，无法计算最优占比。');
      if(optimum.total<current.total*(1-1e-7))throw Error('现有属性超出当前搜索约束，请核对面板或使用截图。');
      return {count:summary.count,active:summary.active,allocation:summary.allocation,substats:summary.substats,
        estimated:summary.estimated,optimum:{total:optimum.total,critical:optimum.critical,allocation:optimum.allocation},
        percentage:100*current.total/optimum.total,method:optimum.method};
    }catch(error){
      return {count:summary.count,active:summary.active,allocation:summary.allocation,estimated:summary.estimated,error:error.message};
    }
  }
  g.GSubstatScore={summarize,compare};
  if(typeof module!=='undefined')module.exports=g.GSubstatScore;
})(typeof globalThis!=='undefined'?globalThis:this);
