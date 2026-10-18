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
    if(/暴击.{0,2}伤/.test(t))return {stat:'cdmg',certain:t.includes('暴击伤'),labelChars:4};
    const exact=[['暴击伤','cdmg'],['暴击率','cpct'],['生命','hp'],['攻击','atk'],['防御','def'],['精通','mastery'],['能效率','recharge'],['充能','recharge']].find(([s])=>t.includes(s));
    if(exact)return {stat:exact[1],certain:true};
    const chinese=(t.split(/[+十\d]/)[0].match(/[\u3400-\u9fff]/g)||[]).join('').replace(/[一二]+$/,'');
    const candidates=Object.entries(labelNames).map(([key,value])=>({key,score:distance(chinese,value)})).sort((a,b)=>a.score-b.score);
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
  const median=values=>{const s=values.slice().sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:0;};
  function normalizeTsv(tsv,rect,scale){
    return String(tsv||'').split('\n').map(line=>{const c=line.split('\t');if(c.length>=12&&/^\d+$/.test(c[0])){c[6]=String(+c[6]/scale+rect.x);c[7]=String(+c[7]/scale+rect.y);c[8]=String(+c[8]/scale);c[9]=String(+c[9]/scale);}return c.join('\t');}).join('\n');
  }
  function ocrScale(rect,width,height,opt={}){return rect&&!opt.overview?Math.min(6,Math.max(.5,48/(rect.font||rect.h*.75))):Math.min(3,1280/(rect?.w||width),2800/(rect?.h||height));}
  function mergeTsv(sources){
    const seen=new Set(),lines=[];
    for(const source of sources)for(const line of tsvLines(source)){const id=line.text+':'+Math.round(line.x/3)+':'+Math.round(line.y/3);if(seen.has(id))continue;seen.add(id);lines.push(line);}
    return 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'+lines.sort((a,b)=>a.y-b.y||a.x-b.x).flatMap((line,i)=>line.words.map((word,j)=>[5,1,i+1,1,1,j+1,word.x,word.y,word.w,word.h,word.confidence,word.text].join('\t'))).join('\n');
  }
  function overviewTiles(width,height){
    const w=Math.min(width,1280),h=Math.min(height,1280),xs=[],ys=[];
    for(let x=0;;x+=w*.75){const start=Math.min(x,width-w);if(xs[xs.length-1]!==start)xs.push(start);if(start+w>=width)break;}
    for(let y=0;;y+=h*.75){const start=Math.min(y,height-h);if(ys[ys.length-1]!==start)ys.push(start);if(start+h>=height)break;}
    return ys.flatMap(y=>xs.map(x=>({x,y,w,h})));
  }
  function fieldLine(line){
    const first=line.words.find(w=>/[生攻防暴元充火水冰雷风岩草物治]/.test(w.text));
    const numbers=line.words.filter(w=>/\d/.test(w.text)&&w.h>3);
    const font=median(line.words.filter(w=>w.h>4).map(w=>w.h))||median(numbers.map(w=>w.h));
    const y=median(line.words.filter(w=>w.h<font*1.45).map(w=>w.y))||line.y;
    return {...line,x:first?.x??line.x,y,font};
  }
  function scopeLines(lines,region){return lines.flatMap(line=>{const words=line.words.filter(word=>word.x>=region.x-region.font*.5&&word.x<region.x+region.w);return words.length?[fieldLine({...line,words,text:words.map(word=>word.text).join('')})]:[];});}
  function locate(tsv,width,height){
    const lines=tsvLines(tsv),fields=lines.map(fieldLine);
    let flower=fields.find(l=>/生命/.test(l.text)&&/4[,.]?780/.test(l.text));
    if(!flower){
      const featherAnchor=fields.find(l=>/攻/.test(l.text)&&/311/.test(l.text));
      if(featherAnchor){const f=Math.max(7,featherAnchor.font),right=fields.filter(l=>l.x>featherAnchor.x+f*4&&Math.abs(l.y-featherAnchor.y)<f*1.6&&label(l.text).stat&&!/[+十]/.test(l.text)).sort((a,b)=>a.x-b.x)[0];const left=fields.filter(l=>l.x<featherAnchor.x-f*4&&Math.abs(l.y-featherAnchor.y)<f*5.5&&label(l.text).stat);const gap=right?right.x-featherAnchor.x:left.length?featherAnchor.x-median(left.map(l=>l.x)):0;if(gap>f*4&&featherAnchor.x-gap>=-f)flower={...featherAnchor,x:Math.max(0,featherAnchor.x-gap),inferred:true};}
    }
    if(!flower)throw Error('尚未定位五件圣遗物。请保留完整属性文字，使用清晰原图或裁掉外围内容后重试。');
    const font=Math.max(7,flower.font),top=flower.y;
    const nearby=fields.filter(l=>l.y>=top-font&&l.y<top+font*16&&l.x>=flower.x-font&&label(l.text).stat);
    const clusters=[];
    for(const l of nearby.filter(l=>l.y<top+font*5.8).sort((a,b)=>a.x-b.x)){
      const cluster=clusters.find(c=>Math.abs(median(c)-l.x)<font*1.1);
      if(cluster)cluster.push(l.x);else clusters.push([l.x]);
    }
    let xs=clusters.filter(c=>c.length>=2||Math.abs(median(c)-flower.x)<font).map(median).filter(x=>x>=flower.x-font*.6);
    const feather=fields.find(l=>/攻/.test(l.text)&&/311/.test(l.text)&&Math.abs(l.y-top)<font*1.6&&l.x>flower.x+font*4);
    if(feather&&!xs.some(x=>Math.abs(x-feather.x)<font))xs.push(feather.x);
    if(!xs.some(x=>Math.abs(x-flower.x)<font))xs.push(flower.x);
    xs.sort((a,b)=>a-b);
    if(Math.abs(xs[0]-flower.x)<font)xs[0]=flower.x;
    // Column positions come from several property rows, rather than requiring
    // the feather's title to be recognized in the overview.
    if(xs.length>=2)xs=xs.filter((x,i)=>i===0||x-xs[i-1]>font*4);
    xs=xs.slice(0,5);
    const mainValues={hp:[4780,46.6],atk:[311,46.6],def:[58.3],cpct:[31.1],cdmg:[62.2],mastery:[186.5],recharge:[51.8],heal:[35.9],phy:[58.3]};
    const mainFields=fields.filter(l=>{const stat=label(l.text).stat,values=stat.startsWith('dmg_')?[46.6]:mainValues[stat]||[],numbers=(l.text.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>Number(n.replace(',','.')));return !/[+十]/.test(l.text)&&numbers.some(n=>values.some(v=>Math.abs(n-v)<.18))&&l.y>=top-font&&l.y<top+font*40;});
    const rowTops=[top];
    while(rowTops.length*xs.length<5){
      const previous=rowTops[rowTops.length-1];
      const next=mainFields.filter(l=>l.y>previous+font*5.2&&xs.some(x=>Math.abs(x-l.x)<font*1.8)).sort((a,b)=>a.y-b.y)[0];
      if(!next){const step=median(rowTops.slice(1).map((y,i)=>y-rowTops[i])),predicted=previous+step;if(!step||predicted+font*5.4>height||fields.filter(l=>l.y>predicted-font&&l.y<predicted+font*5.5&&xs.some(x=>Math.abs(x-l.x)<font)&&label(l.text).stat).length<2)break;rowTops.push(predicted);}else rowTops.push(next.y);
    }
    if(!xs.length||xs.length*rowTops.length<5)throw Error('没有定位到完整的五件属性区域。请使用清晰原图，保留五件主属性和全部副属性。');
    const gap=xs.length>1?median(xs.slice(1).map((x,i)=>x-xs[i])):font*12;
    const regions=slots.map((slot,i)=>{const x=xs[i%xs.length],y=rowTops[Math.floor(i/xs.length)];return {slot,x:Math.max(0,x-1.5),y:Math.max(0,y-3),w:Math.min(width-x+1.5,gap*.78),h:Math.min(height-y+3,font*7.1),font,step:font*1.24};});
    return {regions,lines:fields};
  }
  function textPixel(r,g,b){return (Math.max(r,g,b)-Math.min(r,g,b)<40&&Math.min(r,g,b)>80)||(r>145&&g>120&&g>r*.65&&b<g*.85);}
  function digitThreshold(pixels){
    const hist=new Uint32Array(256);let sum=0,total=0;for(let i=0;i<pixels.length;i+=4){const v=Math.round(.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2]);hist[v]++;sum+=v;total++;}
    let count=0,weighted=0,best=-1,threshold=115;for(let t=0;t<255;t++){count+=hist[t];weighted+=t*hist[t];if(!count||count===total)continue;const difference=weighted/count-(sum-weighted)/(total-count),score=count*(total-count)*difference*difference;if(score>best){best=score;threshold=t;}}
    return Math.max(55,Math.min(185,threshold));
  }
  function preparePixels(image,opt={}){
    const pixels=image.data;if(opt.raw)return image;const threshold=opt.digits?digitThreshold(pixels):0;
    for(let i=0;i<pixels.length;i+=4){if(opt.digits){const gray=.299*pixels[i]+.587*pixels[i+1]+.114*pixels[i+2],ink=opt.soft?Math.round(255-gray):gray>threshold+(opt.thresholdOffset||0)?0:255;pixels[i]=pixels[i+1]=pixels[i+2]=ink;}else if(opt.binary){const ink=textPixel(pixels[i],pixels[i+1],pixels[i+2])?0:255;pixels[i]=pixels[i+1]=pixels[i+2]=ink;}else{pixels[i]=255-pixels[i];pixels[i+1]=255-pixels[i+1];pixels[i+2]=255-pixels[i+2];}}return image;
  }
  function segmentRows(image,region){
    const {data,width,height}=image,font=region.font,span=Math.min(width,Math.ceil(font*4.6)),counts=[];
    for(let y=0;y<height;y++){let n=0;for(let x=0;x<span;x++){const i=(y*width+x)*4;if(textPixel(data[i],data[i+1],data[i+2]))n++;}counts.push(n);}
    const ink=counts.map(n=>n>=Math.max(2,font*.20));
    for(let y=1;y<height-1;y++)if(!ink[y]&&ink[y-1]&&ink[y+1])ink[y]=true;
    const bands=[];for(let y=0;y<height;){if(!ink[y]){y++;continue;}const top=y;while(y<height&&ink[y])y++;if(y-top>=font*.35&&y-top<font*1.9)bands.push({top,bottom:y});}
    let best;
    for(let i=0;i+4<bands.length;i++){const chosen=bands.slice(i,i+5),gaps=chosen.slice(1).map((b,j)=>b.top-chosen[j].top),step=median(gaps);if(step<font*.8||step>font*1.8)continue;const cost=chosen[0].top+gaps.reduce((n,g)=>n+Math.abs(g-step),0)*2;if(!best||cost<best.cost)best={cost,chosen};}
    if(!best)return Array.from({length:5},(_,j)=>{const y=Math.min(j*region.step,Math.max(0,Math.min(height,region.h)-1));return {x:region.x,y:region.y+y,w:region.w,h:Math.max(1,Math.min(region.step,Math.min(height,region.h)-y)),font:font*.9};});
    return best.chosen.map(b=>({x:region.x,y:region.y+Math.max(0,b.top-2),w:region.w,h:Math.min(height,b.bottom+2)-Math.max(0,b.top-2),font:b.bottom-b.top}));
  }
  function numericRegion(data,row,padding=.3){
    const font=row.font,n=row.labelChars||labelNames[row.stat]?.length||3;
    const words=tsvLines(data.tsv).flatMap(l=>l.words).filter(w=>/^[+\d.%％,\s-]+$/.test(w.text)&&/\d/.test(w.text)&&w.x>row.rect.x+n*font*.65).sort((a,b)=>a.x-b.x);
    if(words.length){const group=[words[0]];for(const word of words.slice(1)){const last=group[group.length-1];if(word.x-last.x-last.w>font*.85)break;group.push(word);}const x=Math.max(row.rect.x,group[0].x-font*padding),right=Math.min(row.rect.x+row.rect.w,Math.max(...group.map(w=>w.x+w.w))+font*.6);return {...row.rect,x,w:Math.max(font,right-x)};}
    const offset=n*font+font*.25;return {...row.rect,x:row.rect.x+offset,w:Math.max(font*1.5,row.rect.w-offset)};
  }
  function numeric(text){
    const cleaned=compact(text).replace(/[|()]/g,''),marker=cleaned.lastIndexOf('+');
    const t=(marker>=0?cleaned.slice(marker+1):cleaned).replace(/^[+%.-]+/,'').replace(/(%).*$/,'$1').replace(/\.(?=%|$)/g,'');
    if(!/^\d+(?:\.\d+)?%?$/.test(t))return null;
    const value=Number(t.replace('%',''));return Number.isFinite(value)?{value,percent:t.endsWith('%')}:null;
  }
  function statKey(stat,percent){return ['hp','atk','def'].includes(stat)?stat+(percent?'Pct':'Plus'):stat;}
  function mainKeyFromNumber(index,value){
    const E=g.GEngine,keys=index===2?['atkPct','hpPct','defPct','mastery','recharge']:index===3?['atkPct','hpPct','defPct','mastery','phy',...Object.keys(E.MAIN).filter(k=>k.startsWith('dmg_'))]:['atkPct','hpPct','defPct','mastery','cpct','cdmg','heal'];
    const matches=keys.filter(key=>Math.abs(E.MAIN[key]-value)<.18);return matches.length===1?matches[0]:'';
  }
  function numberChoice(text,stat,raw=''){
    const direct=numeric(text),marker=String(text).lastIndexOf('+'),fragment=String(text).slice(marker>=0?marker+1:0),match=fragment.match(/\d+(?:[.,]\d+)?/);
    const parsed=direct||(match?{value:Number(match[0].replace(',','.')),percent:/[%％]/.test(fragment)}:null);
    if(!parsed||!stat)return null;
    const percentage=parsed.percent||/%/.test(raw),key=statKey(stat,percentage),attempts=[{...parsed,key,percent:percentage}];
    if((key.endsWith('Pct')||['cpct','cdmg','recharge'].includes(key))&&/\.\d{2,}/.test(String(parsed.value)))attempts.push({value:Math.floor(parsed.value*10+1e-7)/10,key,percent:percentage,normalized:true});
    if(parsed.value>Math.max(...(g.GDATA?.substatTiers[key]||[Infinity]))*6)attempts.push({value:parsed.value/10,key,percent:percentage,normalized:true});
    for(const value of attempts)if(g.GDATA?.substatTiers[value.key]&&possibleCounts(value.key,value.value).length)return value;
    if(['hp','atk','def'].includes(stat)){const alternate=statKey(stat,!percentage);if(g.GDATA?.substatTiers[alternate]&&possibleCounts(alternate,parsed.value).length)return {...parsed,key:alternate,percent:!percentage,normalized:true};}
    return null;
  }
  function reconcilePiece(piece){
    const rows=piece.rows.slice(1),main=piece.rows[0].key,solutions=[];
    for(const row of rows){const normalized=new Map();for(const candidate of row.numberCandidates||[]){const value=['hpPlus','atkPlus','defPlus','mastery'].includes(candidate.key)?Math.round(candidate.value):Math.round(candidate.value*10)/10,id=candidate.key+':'+value;if(!normalized.has(id))normalized.set(id,{key:candidate.key,value,sources:[]});const target=normalized.get(id);for(const source of candidate.sources)if(!target.sources.includes(source))target.sources.push(source);}row.numberCandidates=[...normalized.values()];}
    function visit(index,selected,used,counts){
      if(index===4){if(counts.has(8)||counts.has(9))solutions.push(selected);return;}
      for(const candidate of rows[index].numberCandidates||[]){if(used.has(candidate.key))continue;const possible=possibleCounts(candidate.key,candidate.value),next=new Set([...counts].flatMap(n=>possible.map(k=>n+k)).filter(n=>n<=9));if(!next.size)continue;visit(index+1,[...selected,candidate],new Set([...used,candidate.key]),next);}
    }
    visit(0,[],new Set([main]),new Set([0]));
    if(!solutions.length){for(const row of rows){const candidates=row.numberCandidates||[];if(candidates.length===1){row.key=candidates[0].key;row.value=candidates[0].value;}else{row.value='';row.ambiguous=true;}}return;}
    const ranked=solutions.map(solution=>({solution,score:solution.reduce((n,c)=>n+c.sources.length,0)})).sort((a,b)=>b.score-a.score),best=ranked.filter(r=>r.score===ranked[0].score);
    for(let i=0;i<4;i++){const values=new Map(best.map(r=>[r.solution[i].key+':'+r.solution[i].value,r.solution[i]]));if(values.size===1){const value=[...values.values()][0];if(rows[i].key!==value.key||rows[i].value!==value.value)rows[i].reconciled=true;rows[i].key=value.key;rows[i].value=value.value;delete rows[i].ambiguous;}else{rows[i].value='';rows[i].ambiguous=true;}}
  }
  function configuration(text,config){
    const s=compact(text),out={},cons=s.match(/命[座之]?[:：]?(\d)命/),refine=s.match(/精[炼練](\d)[阶階]/),level=s.match(/等[级級][:：]?Lv[.：:]?(\d+)/i),talent=s.match(/天[赋賦][:：]?(\d{1,2})[-一·](\d{1,2})[-一·](\d{1,2})/);
    if(cons&&Number(cons[1])<=6)out.cons=Number(cons[1]);if(refine&&Number(refine[1])>=1&&Number(refine[1])<=5)out.refine=Number(refine[1]);if(level)out.level=Number(level[1]);if(talent)out.actualTalents={a:+talent[1],e:+talent[2],q:+talent[3]};
    if(g.GDATA){const type=g.GEngine.character(config.character)?.weapon,ws=g.GDATA.weapons.filter(w=>w.type===type),exact=ws.filter(w=>s.includes(w.name));if(exact.length===1)out.weapon=exact[0].name;else{const near=ws.filter(w=>w.name.length>=4&&Array.from({length:Math.max(0,s.length-w.name.length+1)},(_,i)=>s.slice(i,i+w.name.length)).some(t=>distance(t,w.name)<=1));if(near.length===1){out.weapon=near[0].name;out.weaponUncertain=true;}}}
    return out;
  }
  async function scan(adapter,config,onProgress=()=>{}){
    onProgress('定位五件圣遗物…',8);await adapter.language('chi_sim');
    let full=await adapter.read(null,{psm:'11'}),layout;
    try{layout=locate(full.tsv,adapter.width,adapter.height);}catch(first){
      full=await adapter.read(null,{psm:'11',raw:true});
      try{layout=locate(full.tsv,adapter.width,adapter.height);}catch(second){
        const tiles=overviewTiles(adapter.width,adapter.height),sources=[];
        if(tiles.length===1)throw second;
        for(let i=0;i<tiles.length;i++){onProgress('分区查找五件圣遗物（'+(i+1)+'/'+tiles.length+'）…',8+2*i/tiles.length);const part=await adapter.read(tiles[i],{psm:'11',overview:true});sources.push(part.tsv);const combined=mergeTsv(sources);try{layout=locate(combined,adapter.width,adapter.height);full={text:sources.map(t=>tsvLines(t).map(l=>l.text).join('\n')).join('\n'),tsv:combined};break;}catch(error){if(i===tiles.length-1)throw error;}}
      }
    }
    const pieces=[];
    for(let i=0;i<5;i++){
      const region=layout.regions[i],rows=[],scoped=scopeLines(layout.lines,region),rects=adapter.rows?await adapter.rows(region):Array.from({length:5},(_,j)=>({...region,y:region.y+j*region.step,h:region.step+2}));
      for(let j=0;j<5;j++){
        const rect=rects[j];
        let data=await adapter.read(rect,{psm:'7'});const matches=scoped.filter(l=>l.y>=rect.y-region.font*.45&&l.y<rect.y+rect.h-region.font*.2);
        let detected=label(data.text);const fallback=matches.map(l=>label(l.text)).filter(x=>x.stat).sort((a,b)=>Number(b.certain)-Number(a.certain))[0];
        if(!detected.stat&&!fallback){const retry=await adapter.read(rect,{psm:'7',binary:true}),candidate=label(retry.text);if(candidate.stat){data=retry;detected=candidate;}}
        const chosen=detected.certain?detected:fallback?.certain?fallback:detected.stat?detected:fallback||detected;
        const row={rect,stat:chosen.stat,certain:chosen.certain,labelChars:chosen.labelChars,raw:compact(data.text),confidence:data.confidence??0,font:rect.font||region.font};
        row.overviewText=matches.find(l=>label(l.text).stat===chosen.stat)?.text||'';
        row.numericRect=numericRegion(data,row);row.numericRectBare=numericRegion(data,row,0);row.numericRectWide=numericRegion(data,row,.85);rows.push(row);
        onProgress('读取'+slots[i]+'的主副属性…',10+(i*5+j)*1.8);
      }
      pieces.push({slot:slots[i],rows});
    }
    await adapter.language('eng');
    for(let i=0;i<5;i++)for(let j=0;j<5;j++){
      const row=pieces[i].rows[j],rect=row.numericRect,raw=compact(row.raw);
      let data=await adapter.read(rect,{psm:'7',digits:true}),parsed=numeric(data.text),choice=j>0?numberChoice(data.text,row.stat,raw):null;
      if(j>0&&row.stat&&!choice){for(const options of [{psm:'7',bare:true},{psm:'7'},{psm:'13'},{psm:'7',soft:true},{psm:'7',thresholdOffset:-20}]){const retry=await adapter.read(options.bare?row.numericRectBare:row.numericRectWide,{...options,digits:true}),candidate=numberChoice(retry.text,row.stat,raw);if(candidate){data=retry;choice=candidate;row.numberRetried=true;break;}}}
      if(j>0&&!choice&&row.stat){const candidate=numberChoice(raw,row.stat,raw);if(candidate){choice=candidate;row.numberFromLabel=true;}}
      const percent=choice?.percent||parsed?.percent||/%/.test(raw);
      row.value=choice?.value??parsed?.value??'';row.key=choice?.key||(row.stat?statKey(row.stat,percent):'');row.numberRaw=compact(data.text);if(choice?.normalized)row.repairedNumber=true;
      if(j>0){const options=[['digits',choice],['label',numberChoice(raw,row.stat,raw)],['overview',numberChoice(row.overviewText,row.stat,row.overviewText)]],candidates=new Map();for(const [source,value]of options){if(!value)continue;const id=value.key+':'+value.value;if(!candidates.has(id))candidates.set(id,{key:value.key,value:value.value,sources:[]});candidates.get(id).sources.push(source);}row.numberCandidates=[...candidates.values()];}
      if(j===0){
        if(i<2){row.key=i===0?'hpPlus':'atkPlus';row.value=i===0?4780:311;}
        else{if(!row.key&&parsed){row.key=mainKeyFromNumber(i,parsed.value);if(row.key)row.mainIdentifiedByValue=true;}if(row.key){if(['atkPlus','hpPlus','defPlus'].includes(row.key))row.key=row.key.replace('Plus','Pct');const expected=g.GEngine?.MAIN[row.key];if(expected!==undefined)row.value=expected;}}
      }else if(row.key&&row.value!==''){
        const max=Math.max(...(g.GDATA?.substatTiers[row.key]||[Infinity]))*6;
        if(row.value>max&&possibleCounts(row.key,row.value/10).length){row.value/=10;row.repairedDecimal=true;}
      }
      onProgress('核对数字与小数点…',56+(i*5+j)*1.65);
    }
    for(const piece of pieces)reconcilePiece(piece);
    for(const piece of pieces){const pending=piece.rows.slice(1).filter(row=>row.value===''&&row.stat);for(const row of pending){onProgress('复核不确定的数字…',97);for(const [rect,options]of [[row.numericRectBare,{psm:'13'}],[row.numericRect,{psm:'7',soft:true}],[row.numericRectWide,{psm:'7',thresholdOffset:-20}],[row.numericRect,{psm:'7',thresholdOffset:20}]]){const data=await adapter.read(rect,{...options,digits:true}),choice=numberChoice(data.text,row.stat,row.raw);if(!choice)continue;const value=['hpPlus','atkPlus','defPlus','mastery'].includes(choice.key)?Math.round(choice.value):Math.round(choice.value*10)/10;let candidate=row.numberCandidates.find(c=>c.key===choice.key&&c.value===value);if(!candidate){candidate={key:choice.key,value,sources:[]};row.numberCandidates.push(candidate);}if(!candidate.sources.includes('digits'))candidate.sources.push('digits');}row.numberRefined=true;}if(pending.length)reconcilePiece(piece);}
    onProgress('交叉核对五件属性…',98);
    const unresolved=pieces.flatMap(piece=>piece.rows.slice(1).filter(row=>row.value==='').map(row=>({slot:piece.slot,stat:row.stat,key:row.key,raw:row.raw,number:row.numberRaw,overview:row.overviewText,candidates:row.numberCandidates})));
    if(unresolved.length&&typeof console?.debug==='function')console.debug('[StatLab OCR] unconfirmed '+JSON.stringify(unresolved));
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
  function fitImageDimensions(width,height,limit=24000000){const scale=Math.min(1,Math.sqrt(limit/(width*height)));return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale)),scaled:scale<1};}
  async function load(){if(g.Tesseract)return;if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('vendor/ocr/tesseract.min.js',document.baseURI).href;s.onload=resolve;s.onerror=()=>{scriptPromise=null;reject(Error('识别引擎加载失败，请检查网络或手动填写面板。'));};document.head.appendChild(s);});await scriptPromise;}
  async function recognize(file,config,onProgress=()=>{},signal){
    if(location.protocol==='file:')throw Error('截图识别请使用在线网站；离线包仍可手填面板或圣遗物合计计算。');
    if(file.size>15*1024*1024)throw Error('截图请小于15MB。');
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('请选择PNG、JPG或WebP截图。');
    let bitmap=await createImageBitmap(file);const fitted=fitImageDimensions(bitmap.width,bitmap.height);
    if(fitted.scaled){onProgress('自动适配大尺寸图片…',1);try{const resized=await createImageBitmap(bitmap,{resizeWidth:fitted.width,resizeHeight:fitted.height,resizeQuality:'high'});bitmap.close();bitmap=resized;}catch(error){bitmap.close();throw Error('当前设备无法处理这张大图，请裁掉无关区域后重试。');}}
    let worker;onProgress('准备本地识别，首次需要加载约8MB数据…',1);
    const cancelled=()=>{if(signal?.aborted)throw Error('已取消识别。');};
    try{
      await load();cancelled();const base=new URL('vendor/ocr/',document.baseURI).href;
      worker=await g.Tesseract.createWorker('chi_sim',1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base+'lang',workerBlobURL:false,logger:m=>{if(m.status==='recognizing text')cancelled();}});
      signal?.addEventListener('abort',()=>worker.terminate(),{once:true});let language='chi_sim';
      const adapter={width:bitmap.width,height:bitmap.height,async rows(region){const canvas=document.createElement('canvas');canvas.width=Math.ceil(region.w);canvas.height=Math.ceil(region.h);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,region.x,region.y,region.w,region.h,0,0,canvas.width,canvas.height);return segmentRows(ctx.getImageData(0,0,canvas.width,canvas.height),region);},async language(name){cancelled();if(language!==name){await worker.reinitialize(name,1);language=name;}},async read(rect,opt){cancelled();const r=rect||{x:0,y:0,w:bitmap.width,h:bitmap.height},scale=ocrScale(rect,bitmap.width,bitmap.height,opt),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(r.w*scale));canvas.height=Math.max(1,Math.round(r.h*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,r.x,r.y,r.w,r.h,0,0,canvas.width,canvas.height);const image=ctx.getImageData(0,0,canvas.width,canvas.height);preparePixels(image,opt);ctx.putImageData(image,0,0);await worker.setParameters({tessedit_pageseg_mode:opt.psm,tessedit_char_whitelist:opt.digits?'0123456789.%+-':'',preserve_interword_spaces:'0'});const {data}=await worker.recognize(canvas,{},{text:true,tsv:true});data.tsv=normalizeTsv(data.tsv,r,scale);return data;}};
      const draft=await scan(adapter,config,onProgress);
      for(let i=0;i<5;i++){const r=draft.regions[i],w=Math.min(r.w,r.font*8.5),canvas=document.createElement('canvas');canvas.width=Math.round(w*2);canvas.height=Math.round(r.h*2);canvas.getContext('2d').drawImage(bitmap,r.x,r.y,w,r.h,0,0,canvas.width,canvas.height);draft.pieces[i].preview=canvas.toDataURL('image/jpeg',.92);}
      delete draft.regions;
      return draft;
    }finally{bitmap.close();if(worker)await worker.terminate().catch(()=>{});}
  }
  g.GPanelImport={compact,label,numeric,tsvLines,normalizeTsv,ocrScale,mergeTsv,overviewTiles,scopeLines,locate,textPixel,digitThreshold,preparePixels,segmentRows,numericRegion,mainKeyFromNumber,numberChoice,reconcilePiece,fitImageDimensions,scan,configuration,possibleCounts,validate,recognize};
  if(typeof module!=='undefined')module.exports=g.GPanelImport;
})(typeof globalThis!=='undefined'?globalThis:this);
