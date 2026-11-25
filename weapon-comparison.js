/* Equal-budget weapon comparison. Every entry re-prepares its own weapon,
 * average roll conversions, legal main stats, team buffs, and allocation. */
(function(g){
  'use strict';
  const E=g.GEngine,D=g.GDATA,M=g.GMetrics;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const pools={
    sands:['atkPct','hpPct','defPct','mastery','recharge'],
    goblet:['dmg',...Object.keys(E.ELEMENT).filter(k=>k!=='physical').map(k=>'dmg_'+k),'phy','atkPct','hpPct','defPct','mastery'],
    circlet:['cpct','cdmg','atkPct','hpPct','defPct','mastery','heal']
  };
  function catalog(config){const c=E.character(config.character);return D.weapons.filter(w=>w.type===c.weapon);}
  function defaults(config){
    const valid=new Set(catalog(config).map(w=>w.name)),names=[];
    const add=name=>{if(valid.has(name)&&!names.includes(name))names.push(name);};
    add(config.weapon);add(E.defaultConfig(config.character).weapon);
    function visit(items){for(const item of items||[])if(Array.isArray(item))add(item[0]);else visit(item.options);}
    visit(g.GRecommendations?.weaponOptions(config.character));
    for(const w of catalog(config))add(w.name);
    return names.slice(0,3).map(weapon=>({weapon,refine:weapon===config.weapon?Number(config.refine)||1:1,enabled:true}));
  }
  function settings(config){
    const value=config.weaponComparison||{},metrics=M.definitions(config),allowed=new Set(metrics.map(m=>m.id));
    const rows=Array.isArray(value.rows)?value.rows.slice(0,60).map(row=>({weapon:String(row?.weapon||''),refine:Number(row?.refine??1),enabled:row?.enabled!==false})):defaults(config);
    const mains=Object.fromEntries(Object.entries(pools).map(([slot,list])=>[slot,list.includes(value.mains?.[slot])?value.mains[slot]:'auto']));
    return {rows,mains,metricId:allowed.has(value.metricId)?value.metricId:M.selected(config)[0]?.id||metrics[0]?.id||''};
  }
  function cancelled(signal){if(signal?.aborted){const error=new Error('已取消武器对比。');error.name='AbortError';throw error;}}
  function candidates(config,locks,active){
    const neutral={sands:'',goblet:'',circlet:''},probe=Object.fromEntries(active.map(key=>[key,Math.max(12,Number(config.budget)||0)]));
    const ctx=E.prepare(config,'team',null,neutral),base=[ctx.evaluate({}),ctx.evaluate(probe)];
    const choices={};
    for(const [slot,pool]of Object.entries(pools)){
      if(locks[slot]!=='auto'){choices[slot]=[locks[slot]];continue;}
      // Generic elemental damage and the character's explicit elemental cup are
      // equivalent. Keep the explicit cup, including non-native damage branches.
      const list=pool.filter(key=>key!=='dmg');
      choices[slot]=list.filter(key=>{
        const target=E.prepare(config,'team',null,{...neutral,[slot]:key});
        return target.evaluate({})>base[0]+Math.max(1,base[0])*1e-10||target.evaluate(probe)>base[1]+Math.max(1,base[1])*1e-10;
      });
      // A slot can be damage-neutral (for example sands on a pure transformative
      // metric). Its legal main still affects substat exclusions and capacities.
      if(!choices[slot].length)choices[slot]=list.slice();
    }
    const out=[];
    for(const sands of choices.sands)for(const goblet of choices.goblet)for(const circlet of choices.circlet)out.push({sands,goblet,circlet});
    return out;
  }
  function validate(config,value=settings(config)){
    if(!config.teammates?.some(t=>t.character))throw new Error('请先选择队友，再进行组队武器对比。');
    if(!Number.isFinite(Number(config.budget))||config.budget<0||config.budget>60)throw new Error('有效副词条总数需在0–60之间。');
    if(!M.definition(config,value.metricId))throw new Error('请先选择伤害指标。');
    const selected=value.rows.filter(row=>row.enabled),names=new Set(catalog(config).map(w=>w.name)),seen=new Set();
    if(!selected.length)throw new Error('请至少勾选一把对比武器。');
    for(const row of selected){
      if(!names.has(row.weapon))throw new Error('请为当前角色选择有效武器。');
      if(!Number.isInteger(row.refine)||row.refine<1||row.refine>5)throw new Error('武器精炼需为1–5的整数。');
      const key=row.weapon+':'+row.refine;if(seen.has(key))throw new Error('同一把武器、相同精炼重复，请移除重复项。');seen.add(key);
    }
    return value;
  }
  async function compare(config,onProgress=()=>{},options={}){
    const snapshot=copy(config),value=validate(snapshot),selected=value.rows.filter(row=>row.enabled),rows=[];
    cancelled(options.signal);
    for(let index=0;index<selected.length;index++){
      cancelled(options.signal);
      const entry=selected[index];
      try{
        // M.configFor must run AFTER selecting this weapon so its legal default
        // passive conditions are derived for this weapon, not the equipped one.
        const cfg=M.configFor({...copy(snapshot),weapon:entry.weapon,refine:entry.refine,mains:{sands:'',goblet:'',circlet:''},autoMains:false},value.metricId);
        const active=E.effectiveKeys(cfg,'team',Number(cfg.budget));
        const mains=candidates(cfg,value.mains,active);
        const result=await E.optimize(cfg,'team',p=>{cancelled(options.signal);onProgress((index+p)/selected.length,{weapon:entry.weapon,index,total:selected.length});},{mainCandidates:mains,active,iterations:12,material:false});
        if(!Number.isFinite(result.total)||result.total<=0)throw new Error('当前配置下，此指标未产生正伤害。');
        rows.push({...entry,result,rollUnits:E.rollUnits(cfg),rollCosts:E.rollCosts(cfg)});
      }catch(error){if(error.name==='AbortError')throw error;rows.push({...entry,error:error.message});}
      onProgress((index+1)/selected.length,{weapon:entry.weapon,index,total:selected.length});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    const highest=Math.max(0,...rows.filter(row=>row.result).map(row=>row.result.total));
    rows.sort((a,b)=>(b.result?.total??-1)-(a.result?.total??-1));
    for(const row of rows)row.percentage=row.result&&highest>0?100*row.result.total/highest:null;
    return {character:snapshot.character,metricId:value.metricId,budget:Number(snapshot.budget),highest,rows,settings:value};
  }
  g.GWeaponComparison={pools,catalog,defaults,settings,validate,candidates,compare};
  if(typeof module!=='undefined')module.exports=g.GWeaponComparison;
})(typeof window!=='undefined'?window:globalThis);
