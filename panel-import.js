/* Local screenshot OCR and review data. Images never leave the browser. */
(function(g){
  'use strict';
  const compact=s=>String(s||'').replace(/\s/g,'').replace(/％/g,'%').replace(/[，,](?=\d{3}(?:\D|$))/g,'');
  const slots=['生之花','死之羽','时之沙','空之杯','理之冠'];
  const labelNames={hp:'生命值',atk:'攻击力',def:'防御力',cpct:'暴击率',cdmg:'暴击伤害',mastery:'元素精通',recharge:'充能效率'};
  function distance(a,b){const p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let old=p[0];p[0]=i;for(let j=1;j<=b.length;j++){const v=p[j];p[j]=Math.min(p[j]+1,p[j-1]+1,old+(a[i-1]!==b[j-1]));old=v;}}return p[b.length];}
  function label(text){
    const t=compact(text).replace(/^[.，、]+/,'');
    const elemental=t.match(/([火水冰雷风岩草])(?:元素)?(?:伤害|伤)加成/),elements={火:'pyro',水:'hydro',冰:'cryo',雷:'electro',风:'anemo',岩:'geo',草:'dendro'};
    if(elemental)return {stat:'dmg_'+elements[elemental[1]],certain:true,labelChars:elemental[0].length};
    if(t.includes('物理伤害'))return {stat:'phy',certain:true,labelChars:6};
    if(t.includes('治疗加成'))return {stat:'heal',certain:true,labelChars:4};
    const exact=[['暴击伤','cdmg'],['暴击率','cpct'],['生命','hp'],['攻击','atk'],['防御','def'],['精通','mastery'],['能效率','recharge'],['充能','recharge']].find(([s])=>t.includes(s));
    if(exact)return {stat:exact[1],certain:true};
    const chinese=(t.match(/[\u3400-\u9fff]/g)||[]).join('');
    const candidates=Object.entries(labelNames).map(([key,value])=>({key,score:Math.min(...Array.from({length:Math.min(chinese.length,6)},(_,i)=>distance(chinese.slice(0,i+1),value)))})).sort((a,b)=>a.score-b.score);
    return candidates[0]?.score<=2&&candidates[0].score<candidates[1].score?{stat:candidates[0].key,certain:false}:{stat:'',certain:false};
  }
  function tsvLines(tsv){
    const lines=new Map();
    for(const row of String(tsv||'').trim().split(/\r?\n/)){
      const r=row.split('\t');if(r[0]!=='5'||r.length<12||!r[11]?.trim())continue;
      const key=r.slice(1,5).join(':'),word={x:+r[6],y:+r[7],w:+r[8],h:+r[9],confidence:+r[10],text:r.slice(11).join('\t')};
      if(!lines.has(key))lines.set(key,[]);lines.get(key).push(word);
    }
    return [...lines.values()].map(words=>{const x=Math.min(...words.map(w=>w.x)),y=Math.min(...words.map(w=>w.y)),right=Math.max(...words.map(w=>w.x+w.w)),bottom=Math.max(...words.map(w=>w.y+w.h));return {x,y,w:right-x,h:bottom-y,text:words.map(w=>w.text).join(''),words,confidence:words.reduce((a,w)=>a+w.confidence,0)/words.length};});
  }
  function locate(tsv,width,height){
    const lines=tsvLines(tsv),flower=lines.find(l=>/生命/.test(l.text)&&/4780/.test(l.text)),feather=lines.find(l=>/攻/.test(l.text)&&/311/.test(l.text)&&(!flower||Math.abs(l.y-flower.y)<30));
    if(!flower||!feather||feather.x<=flower.x+width*.15)throw Error('没有找到五件圣遗物区域。请使用包含花4780、羽311和五件完整主副属性的小助手截图。');
    const heights=[...flower.words,...feather.words].map(w=>w.h).sort((a,b)=>a-b),font=Math.max(10,heights[Math.floor((heights.length-1)/2)]),textY=l=>{const ys=l.words.filter(w=>w.h<font*1.5).map(w=>w.y).sort((a,b)=>a-b);return ys[Math.floor(ys.length/2)]??l.y;},top=Math.min(textY(flower),textY(feather)),mainCandidates=lines.filter(l=>l.y>top+font*3&&l.y<height*.8&&!/[+十]/.test(l.text)&&/\d/.test(l.text)&&/攻击力|生命值|防御力|暴击伤|暴击率|精通|伤害加成|充能效率/.test(l.text));
    const row2=mainCandidates.find(l=>l.x<feather.x+font&&l.y>top+font*5.5);
    if(!row2)throw Error('未找到下排空之杯和理之冠。请上传五件属性完整、未被遮挡的截图。');
    const sands=lines.find(l=>Math.abs(l.y-top)<font&&l.x>feather.x+width*.18&&/\d/.test(l.text));
    const xs=[flower.x,feather.x,sands?sands.x-font*.3:Math.min(width-font*3,feather.x+feather.x-flower.x)];
    const step=font*1.25,regions=slots.map((slot,i)=>{const col=i<3?i:i-3,x=xs[col],y=i<3?top:textY(row2);return {slot,x:Math.max(0,x-2),y:Math.max(0,y-3),w:Math.min(width-x,(xs[col+1]||width+font)-x-font*.4),h:step*5.12,font:font*1.1,step};});
    return {regions,lines};
  }
  function numeric(text){
    const t=compact(text).replace(/[|()]/g,'').replace(/^[+%.-]+/,'').replace(/(%).*$/,'$1');
    if(!/^\d+(?:\.\d+)?%?$/.test(t))return null;
    const value=Number(t.replace('%',''));return Number.isFinite(value)?{value,percent:t.endsWith('%')}:null;
  }
  function statKey(stat,percent){return ['hp','atk','def'].includes(stat)?stat+(percent?'Pct':'Plus'):stat;}
  function configuration(text,config){
    const s=compact(text),out={},cons=s.match(/命[座之]?[:：]?(\d)命/),refine=s.match(/精[炼練](\d)[阶階]/),level=s.match(/等[级級][:：]?Lv[.：:]?(\d+)/i),talent=s.match(/天[赋賦][:：]?(\d{1,2})[-一·](\d{1,2})[-一·](\d{1,2})/);
    if(cons&&Number(cons[1])<=6)out.cons=Number(cons[1]);if(refine&&Number(refine[1])>=1&&Number(refine[1])<=5)out.refine=Number(refine[1]);if(level)out.level=Number(level[1]);if(talent)out.actualTalents={a:+talent[1],e:+talent[2],q:+talent[3]};
    if(g.GDATA){const type=g.GEngine.character(config.character)?.weapon,ws=g.GDATA.weapons.filter(w=>w.type===type),exact=ws.filter(w=>s.includes(w.name));if(exact.length===1)out.weapon=exact[0].name;else{const near=ws.filter(w=>w.name.length>=4&&Array.from({length:Math.max(0,s.length-w.name.length+1)},(_,i)=>s.slice(i,i+w.name.length)).some(t=>distance(t,w.name)<=1));if(near.length===1){out.weapon=near[0].name;out.weaponUncertain=true;}}}
    return out;
  }
  async function scan(adapter,config,onProgress=()=>{}){
    onProgress('定位五件圣遗物…',8);await adapter.language('chi_sim');
    const full=await adapter.read(null,{psm:'11'}),layout=locate(full.tsv,adapter.width,adapter.height),pieces=[];
    for(let i=0;i<5;i++){
      const region=layout.regions[i],rows=[];
      for(let j=0;j<5;j++){
        const rect={x:region.x,y:region.y+j*region.step,w:region.w,h:region.step+3};
        const data=await adapter.read(rect,{psm:'7'}),matches=layout.lines.filter(l=>l.y+l.h/2>=rect.y&&l.y+l.h/2<rect.y+rect.h&&l.x>=region.x-region.font&&l.x<region.x+region.w);
        const detected=label(data.text),fallback=matches.map(l=>label(l.text)).find(x=>x.stat),chosen=detected.stat?detected:fallback||detected;
        rows.push({rect,stat:chosen.stat,certain:chosen.certain,labelChars:chosen.labelChars,raw:compact(data.text),confidence:data.confidence??0,font:region.font});
        onProgress('读取'+slots[i]+'的主副属性…',10+(i*5+j)*1.8);
      }
      pieces.push({slot:slots[i],rows});
    }
    await adapter.language('eng');
    for(let i=0;i<5;i++)for(let j=0;j<5;j++){
      const row=pieces[i].rows[j],n=row.labelChars||labelNames[row.stat]?.length||3,offset=n*row.font*(j===0?1.1:.955)+(j===0?0:row.font*.455);
      const rect={...row.rect,x:row.rect.x+offset,w:Math.max(row.font*1.5,Math.min(row.font*4.2,row.rect.w-offset))};
      const data=await adapter.read(rect,{psm:'7',digits:true}),parsed=numeric(data.text),raw=compact(row.raw),percent=parsed?.percent||/%|[.][0-9]9?6/.test(raw);
      row.value=parsed?.value??'';row.key=row.stat?statKey(row.stat,percent):'';row.numberRaw=compact(data.text);
      if(j===0){
        if(i<2){row.key=i===0?'hpPlus':'atkPlus';row.value=i===0?4780:311;}
        else if(row.key){if(['atkPlus','hpPlus','defPlus'].includes(row.key))row.key=row.key.replace('Plus','Pct');const expected=g.GEngine?.MAIN[row.key];if(expected!==undefined)row.value=expected;}
      }else if(row.key&&row.value!==''){
        const max=Math.max(...(g.GDATA?.substatTiers[row.key]||[Infinity]))*6;
        if(row.value>max&&row.value/10<=max){row.value/=10;row.repairedDecimal=true;}
      }
      onProgress('核对数字与小数点…',56+(i*5+j)*1.65);
    }
    return {character:config.character,pieces:pieces.map(p=>({slot:p.slot,main:p.rows[0],subs:p.rows.slice(1)})),detected:configuration(full.text,config),regions:layout.regions};
  }
  const tierCache={};
  function possibleCounts(key,value){
    if(!tierCache[key]){
      const tiers=g.GDATA.substatTiers[key],rows=[];let current=new Set([0]);
      for(let n=1;n<=6;n++){const next=new Set();for(const v of current)for(const t of tiers)next.add(Math.round((v+t)*100)/100);rows.push([...next]);current=next;}tierCache[key]=rows;
    }
    const flat=['hpPlus','atkPlus','defPlus','mastery'].includes(key);
    return tierCache[key].flatMap((sums,i)=>sums.some(sum=>Math.abs(value-sum)<.0051||Math.abs(value-(flat?Math.round(sum):Math.round(sum*10)/10))<.0051)?[i+1]:[]);
  }
  function validate(draft,config){
    const E=g.GEngine;if(draft.character!==config.character)throw Error('主角色已变化，请重新识别截图。');
    const mains={},stats=Object.fromEntries([...Object.keys(E.ROLLS),'dmg','phy','heal',...Object.keys(E.MAIN).filter(k=>k.startsWith('dmg_'))].map(k=>[k,0]));
    if(draft.pieces.length!==5)throw Error('需要完整的五件圣遗物。');
    for(let i=0;i<5;i++){
      const p=draft.pieces[i],key=i===0?'hpPlus':i===1?'atkPlus':p.main.key,allowed=i===2?['atkPct','hpPct','defPct','mastery','recharge']:i===3?['atkPct','hpPct','defPct','mastery','dmg','phy',...Object.keys(E.MAIN).filter(k=>k.startsWith('dmg_'))]:i===4?['atkPct','hpPct','defPct','mastery','cpct','cdmg','heal']:[key];
      if(!allowed.includes(key))throw Error(p.slot+'的主属性需要核对。');
      stats[key]+=(i===0?4780:i===1?311:E.MAIN[key]);if(i>=2)mains[['sands','goblet','circlet'][i-2]]=key;
      const seen=new Set([key]);if(p.subs.length!==4)throw Error(p.slot+'需要四种副属性。');
      let counts=new Set([0]);
      for(const s of p.subs){const v=Number(s.value);if(!Object.hasOwn(E.ROLLS,s.key)||s.value===''||!Number.isFinite(v)||v<=0||v>Math.max(...g.GDATA.substatTiers[s.key])*6+.51)throw Error(p.slot+'有未识别或超出范围的副属性，请核对。');if(seen.has(s.key))throw Error(p.slot+'的主副属性或副属性之间有重复，请核对。');const options=possibleCounts(s.key,v);if(!options.length)throw Error(p.slot+'的'+E.LABELS[s.key]+'数值与五星强化档位不符，请重点核对小数点。');counts=new Set([...counts].flatMap(n=>options.map(m=>m+n)));seen.add(s.key);stats[s.key]+=v;}
      if(!counts.has(8)&&!counts.has(9))throw Error(p.slot+'的四项副属性无法放进一件五星20级圣遗物，请核对识别结果。');
    }
    for(const k of Object.keys(stats))stats[k]=Number(stats[k].toFixed(6));
    return {mains,stats};
  }
  let scriptPromise;
  async function load(){if(g.Tesseract)return;if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/ocr/tesseract.min.js',document.baseURI).href;s.onload=resolve;s.onerror=()=>{scriptPromise=null;reject(Error('识别引擎加载失败，请检查网络或手动填写面板。'));};document.head.appendChild(s);});await scriptPromise;}
  async function recognize(file,config,onProgress=()=>{},signal){
    if(location.protocol==='file:')throw Error('截图识别请使用在线网站；离线包仍可手填面板或圣遗物合计计算。');
    if(file.size>15*1024*1024)throw Error('截图请小于15MB。');
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('请选择PNG、JPG或WebP截图。');
    const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>24000000){bitmap.close();throw Error('截图尺寸过大，请裁掉无关区域后重试。');}
    let worker;onProgress('准备本地识别，首次需要加载约8MB数据…',1);
    const cancelled=()=>{if(signal?.aborted)throw Error('已取消识别。');};
    try{
      await load();cancelled();const base=new URL('vendor/ocr/',document.baseURI).href;
      worker=await g.Tesseract.createWorker('chi_sim',1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')cancelled();}});
      signal?.addEventListener('abort',()=>worker.terminate(),{once:true});let language='chi_sim';
      const adapter={width:bitmap.width,height:bitmap.height,async language(name){cancelled();if(language!==name){await worker.reinitialize(name,1);language=name;}},async read(rect,opt){cancelled();const r=rect||{x:0,y:0,w:bitmap.width,h:bitmap.height},scale=rect?3:Math.min(1,1800/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(r.w*scale));canvas.height=Math.max(1,Math.round(r.h*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,r.x,r.y,r.w,r.h,0,0,canvas.width,canvas.height);if(rect){const image=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<image.data.length;i+=4){if(opt.digits){const v=255-(.299*image.data[i]+.587*image.data[i+1]+.114*image.data[i+2]),ink=v<140?0:255;image.data[i]=image.data[i+1]=image.data[i+2]=ink;}else{image.data[i]=255-image.data[i];image.data[i+1]=255-image.data[i+1];image.data[i+2]=255-image.data[i+2];}}ctx.putImageData(image,0,0);}await worker.setParameters({tessedit_pageseg_mode:opt.psm,tessedit_char_whitelist:opt.digits?'0123456789.%+-':'',preserve_interword_spaces:'0'});const {data}=await worker.recognize(canvas,{},{text:true,tsv:true});if(!rect&&scale!==1){data.tsv=data.tsv.split('\n').map(line=>{const cols=line.split('\t');if(cols.length>=12)for(let i=6;i<10;i++)cols[i]=String(Math.round(Number(cols[i])/scale));return cols.join('\t');}).join('\n');}return data;}};
      const draft=await scan(adapter,config,onProgress);
      for(let i=0;i<5;i++){const r=draft.regions[i],w=Math.min(r.w,r.font*8.5),canvas=document.createElement('canvas');canvas.width=Math.round(w*2);canvas.height=Math.round(r.h*2);canvas.getContext('2d').drawImage(bitmap,r.x,r.y,w,r.h,0,0,canvas.width,canvas.height);draft.pieces[i].preview=canvas.toDataURL('image/jpeg',.92);}
      delete draft.regions;
      return draft;
    }finally{bitmap.close();if(worker)await worker.terminate().catch(()=>{});}
  }
  g.GPanelImport={compact,label,numeric,tsvLines,locate,scan,configuration,possibleCounts,validate,recognize};
  if(typeof module!=='undefined')module.exports=g.GPanelImport;
})(typeof globalThis!=='undefined'?globalThis:this);
