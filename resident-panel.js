/* Recover an equipment anchor from a solo resident panel, then use the normal
 * damage engine. No temporary or team effect is baked into the anchor. */
(function(g){
  'use strict';
  const E=g.GEngine,keys=['hp','def','recharge','atk','mastery','cpct','cdmg','dmg','phy','heal'];
  const permanent={桑多涅:[2],菲林斯:[1,4],'旅行者·冰':[1],雷电将军:[3],莫娜:[1],梦见月瑞希:[3],妮露:[5],迪希雅:[0],'旅行者·风':[0],茜特菈莉:[1],夜兰:[0]};
  const converters=new Set(['护摩之杖','磐岩结绿','薙草之稻光','赤沙之杖','西福斯的月光','流浪的晚星','玛海菈的水色']);
  function baselineConfig(config){
    const c={...config,conditions:{},parameters:{solo:{},team:{}},disabledBuffs:[],teammates:[],team:{},soloArea:{},extraTalent:{}};
    delete c._metric;delete c.metricSettings;
    // Read the panel alone, without skills, auras, shields or nearby enemies.
    c.conditions.currentHpPct=Number(config.panelSettings?.hpPct??100);
    c.conditions.onField=true;c.conditions.moonsign=1;c.conditions.hexerei=false;
    return c;
  }
  function residentFields(b,config){
    if(b.isStatic||b.staticSet)return b.data;
    const id=Number(b.id.split(':').at(-1)),role=config.character;
    if(b.id.startsWith('self:')){
      if(permanent[role]?.includes(id))return b.data;
      if(role==='胡桃'&&/半血/.test(b.title)||role==='那维莱特'&&/至高仲裁/.test(b.title))return b.data;
      return null;
    }
    if(!b.id.startsWith('weapon:'))return null;
    if(converters.has(config.weapon)){
      if(config.weapon==='薙草之稻光'&&id===0)return null;
      return b.data;
    }
    if(['黎明神剑','决斗之枪','最初的大魔术','千夜浮梦','千岩长枪','千岩古剑','碎链','悬黎千钧','峡湾长歌'].includes(config.weapon))return b.data;
    if(config.weapon==='苇海信标'&&id===1)return b.data;
    if(config.weapon==='漩流颂歌')return {heal:b.data.heal};
    return null;
  }
  function forward(config,rolls={},panel=null,mains=config.mains,withAudit=false){
    if(panel?.mode==='resident')panel=infer(config,panel.values||panel,mains);
    const c=E.character(config.character),w=E.getWeapon(config,c),cfg=baselineConfig(config),attr=E.createAttr(cfg,c,w,rolls,panel,mains);
    const params=E.paramsFor(cfg,c,{},'solo');params.currentHpPct=cfg.conditions.currentHpPct;
    params.skirkSpecialQActive=false;params.scarletStacks=0;params.engulfingBurstActive=false;
    const ds={characterName:c.key,attr,calc:E.calc,element:E.ELEMENT[c.element],params,cons:config.cons,refine:w.refine-1,weapon:w,talent:E.talentFor(c,cfg),weaponTypeName:E.WEAPON[c.weapon],artis:{},trees:{}};
    const audit=[];
    for(const b of E.buffList(cfg).slice().sort((a,b)=>(a.sort??1)-(b.sort??1))){
      const fields=residentFields(b,cfg);if(!fields||!E.buffAllowed(b,ds,'solo',cfg,c))continue;
      let use=ds;
      if(b.id.startsWith('weapon:')&&['赤沙之杖','西福斯的月光','流浪的晚星','玛海菈的水色'].includes(w.name)&&attr.borrowedMastery)use={...ds,attr:{...attr,mastery:new E.Stat(attr.mastery.base,attr.mastery.plus-attr.borrowedMastery,attr.mastery.pct)}};
      if(['菲林斯','桑多涅','旅行者·冰'].includes(c.key)&&typeof fields.mastery==='function'&&attr.borrowedAtk)use={...use,attr:{...use.attr,atk:new E.Stat(attr.atk.base,attr.atk.plus-attr.borrowedAtk,attr.atk.pct)}};
      for(const [key,fn]of Object.entries(fields)){
        // Yelan's panel is read in a genuinely solo party: one element, 6% HP.
        const value=c.key==='夜兰'&&b.id==='self:0'&&key==='hpPct'?6:typeof fn==='function'?fn(use):fn;
        if(!Number.isFinite(Number(value)))throw Error('无法重建 '+(b.title||b.id)+' 的常驻属性。');
        E.add(attr,key,value);if(Number(value))audit.push({id:b.id,key,value:Number(value),source:b.id.startsWith('weapon:')?w.name:b.id.startsWith('set:')?b.id.split(':')[1]:c.key});
      }
    }
    const values=E.panelValues(attr);return withAudit?{values,audit}:values;
  }
  function infer(config,values,mains=config.mains){
    const hpPct=config.panelSettings?.hpPct??100;if(hpPct===''||!Number.isFinite(Number(hpPct))||Number(hpPct)<0||Number(hpPct)>100)throw Error('读取面板时的生命比例需为0–100之间的数值。');
    for(const k of keys){const v=values[k]??(['phy','heal'].includes(k)?0:undefined);if(v===''||v===null||!Number.isFinite(Number(v)))throw Error('请填写单人常驻面板的'+(E.LABELS[k]||k)+'。');}
    for(const k of ['hp','atk','def'])if(Number(values[k])<=0)throw Error('单人常驻'+E.LABELS[k]+'需大于0。');
    if(Number(values.recharge)<100)throw Error('常驻充能效率不能低于100%，请检查是否漏写百分号前的数值。');
    if(config.weapon==='金律铸影')throw Error('金律铸影会自动轮换属性，单份面板不能确定读取阶段；请用「圣遗物属性合计」或截图识别。');
    if(config.weapon==='四风原典')throw Error('四风原典的站场层数会进入面板；请用「圣遗物属性合计」或截图识别，避免重复叠加。');
    const stats=E.artifactMainStats(mains),element=E.character(config.character).element,map={hp:'hpPlus',atk:'atkPlus',def:'defPlus',dmg:'dmg_'+element};
    const special=config.character==='玛薇卡'&&Number(config.cons)>=2;
    if(special){const v=config.panelExtra?.atkPct;if(v===''||v===undefined||!Number.isFinite(Number(v))||Number(v)<Number(stats.atkPct))throw Error('玛薇卡2命战斗中会改变基础攻击，请补填五件圣遗物的攻击力%合计，或改用截图识别。');stats.atkPct=Number(v);}
    const input=Object.fromEntries(keys.map(k=>[k,Number(values[k]??0)])),anchor={mode:'artifacts',stats};let max=Infinity;
    for(let pass=0;pass<32;pass++){
      max=0;
      for(const k of keys){const actual=forward(config,{},anchor,mains)[k],diff=input[k]-actual;max=Math.max(max,Math.abs(diff));stats[map[k]||k]=(stats[map[k]||k]||0)+diff;}
      if(max<1e-8)break;
    }
    const check=forward(config,{},anchor,mains),main=E.artifactMainStats(mains);
    for(const k of keys)if(Math.abs(check[k]-input[k])>1e-5)throw Error('常驻面板的属性转化未能唯一重建，请使用圣遗物合计或截图识别。');
    for(const k of ['hpPlus','atkPlus','defPlus','mastery','cpct','cdmg','recharge'])if((stats[k]||0)<(main[k]||0)-(['hpPlus','atkPlus','defPlus','mastery'].includes(k)?1.1:.16))throw Error('常驻面板与当前角色、武器或主词条不符：'+E.LABELS[k]+'低于已装备属性。若是小助手截图，请使用「识别圣遗物截图」，不要把其未触发面板当作游戏常驻面板。');
    const nativeMinimum=Number(main.dmg||0)+Number(main['dmg_'+element]||0);
    if(Number(stats['dmg_'+element]||0)+Number(stats.dmg||0)<nativeMinimum-.16)throw Error('本元素伤害加成不足以包含当前配置的常驻效果，请核对面板和装备。');
    anchor.residentAnchor={input,verified:check,baseHpPct:Number(config.panelSettings?.hpPct??100)};
    return anchor;
  }
  g.GResident={keys,forward,infer,residentFields};
  if(typeof module!=='undefined')module.exports=g.GResident;
})(typeof globalThis!=='undefined'?globalThis:this);
