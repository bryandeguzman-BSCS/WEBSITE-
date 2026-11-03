window.EdunexusAssessmentParser=(()=>{
 'use strict';
 const text=n=>typeof n==='string'?n:(n.children||[]).map(text).join('');
 const clean=s=>s.replace(/[\u200e\u200f\ufeff]/g,'').trim();
 const headingText=n=>typeof n==='string'?n:(n.children||[]).filter(x=>x?.attrs?.class!=='doc-list-marker').map(text).join('').trim();
 const topHeading=t=>/^(?:\d+[.]\s*)?(?:(?:mga\s*)?nilalaman ng aralin|talasalitaan|aplikasyon|sanggunian)/i.test(t);
function questions(nodes){
 const qs=[];let current=null,option=null,pending=[],intro=[];
 function options(line){for(const m of line.matchAll(/(?:^|\s)([A-H])[.)]\s*(.+?)(?=\s+[A-H][.)]\s*|$)/g)){option=m[1].charCodeAt(0)-65;current.options[option]=m[2];current.type='choice';}}
 for(const raw of nodes.map(text).flatMap(x=>x.split(/(?<=\.)\s+(?=10\. Masusuri ang bisa)/))){
  const line=clean(raw);if(!line)continue;
  const normalized=line.replace(/^\d+\.\s+(?=\d+\.\s)/,'');let m=/^(\d(?:\s*\d)?)\s*[.]\s*(.+)$/.exec(normalized);
  if(m){let content=m[2],inline=/\s+A[.)]\s+/.exec(content);let opts='';if(inline){opts=content.slice(inline.index).trim();content=content.slice(0,inline.index);}
   current={source_number:Number(m[1].replace(/\s/g,'')),source_label:line.slice(0,line.indexOf(m[2])),type:'essay',question:content,options:[],answer:null,points:1,explanation:'',instructions:pending.join('\n')};qs.push(current);pending=[];option=null;if(opts)options(opts);continue;}
  if(/^Panuto\b|^[IVX]+[.]\s+(?:Tama o Mali|May Pagpipilian)|^May pagpipilian$/i.test(line)){if(qs.length)pending.push(raw);else intro.push(raw);option=null;continue;}
  if(current&&/^[A-H][.)]/.test(line)){options(line);continue;}
  if(!current){intro.push(raw);continue;}
  if(pending.length){pending.push(raw);continue;}
  if(line==='Ibigay')pending.push(line); // Keep and flag an unmatched fragment for source review.
  if(option!==null)current.options[option]+=' '+line;else current.question+=' '+line;
 }
 return {questions:qs,instructions:intro.join('\n'),trailing:pending};
}
function answerKeys(nodes){const keys=new Map();
 for(const node of nodes){const line=clean(text(node));
  const m=/^(\d(?:\s*\d)?)\s*[.\-–]\s*(TAMA|MALI|[A-H])(?:\b|$)(.*)$/i.exec(line);
  if(m)keys.set(Number(m[1].replace(/\s/g,'')),{answer:m[2].toUpperCase(),explanation:m[3].replace(/^\s*[.—–-]\s*/,'').trim()});
  if(/^\d+\.[A-H]\d+\./.test(line))for(const x of line.matchAll(/(\d+)\.([A-H])/g))keys.set(Number(x[1]),{answer:x[2],explanation:''});
  if(node.tag==='table')for(const row of node.children.flatMap(x=>x.tag==='tbody'?x.children:[x])){const c=row.children||[],n=Number(clean(text(c[0]||'')).replace(/\s/g,'')),letter=clean(text(c[1]||''));if(n&&/^[A-H]$/.test(letter))keys.set(n,{answer:letter,explanation:clean(text(c[2]||''))});}
 }return keys;
}
function applyKeys(qs,keys){for(const q of qs){if(/^Tama o Mali:/i.test(q.question)&&!q.options.length){q.type='choice';q.options=['Tama','Mali'];}const key=keys.get(q.source_number);if(key&&/^(TAMA|MALI)$/.test(key.answer)){q.type='choice';q.options=['TAMA','MALI'];q.answer=key.answer==='TAMA'?0:1;}else if(q.type==='choice'&&key&&/^[A-H]$/.test(key.answer))q.answer=key.answer.charCodeAt(0)-65;
 q.explanation=key?.explanation||'';if(q.type==='choice'&&(q.answer===null||q.answer>=q.options.length))q.answer=null;}}

 function extract(nodes,lid,hash){
  const lines=nodes.map(n=>clean(text(n))),sections=[],warnings=[];
  const pre=lines.findIndex(x=>/^(?:\d+[.]\s*)?paunang (?:pagtataya|pagsusulit)$/i.test(x));
  const last=lines.findLastIndex(x=>/^(?:\d+[.]\s*)?pagsusulit$/i.test(x));
  for(const [kind,start] of [['pre',pre],['main',last]]){
   if(start<0)continue;
   let end=lines.findIndex((x,i)=>i>start&&(/^(?:\d+[.]\s*)?susi sa /i.test(x)||topHeading(x)||/^Gawain\s*\d*\s*[:.]/i.test(x)));
   if(end<0)end=lines.length;
   const parsed=questions(nodes.slice(start+1,end)),keyStart=/susi sa /i.test(lines[end]||'')?end:-1;
   let keyEnd=keyStart<0?end:lines.findIndex((x,i)=>i>keyStart&&topHeading(x));
   if(keyEnd<0)keyEnd=nodes.length;
   if(keyStart>=0)applyKeys(parsed.questions,answerKeys(nodes.slice(keyStart+1,keyEnd)));
   const notes=[];
   if(parsed.trailing.length)notes.push('May hindi malinaw na teksto/panuto sa hulihan. Suriin ang source bago ilathala.');
   if(!parsed.questions.length)notes.push('Walang matiyak na hiwalay na tanong. Kailangan ang manual extraction.');
   if(parsed.questions.some((q,i)=>q.source_number!==i+1))notes.push('Hindi tuloy-tuloy ang orihinal na bilang; hindi awtomatikong binago.');
   if(new Set(parsed.questions.map(q=>q.source_number)).size!==parsed.questions.length){notes.push('Dobleng bilang: kailangang itugma muli ang mga susi.');for(const q of parsed.questions){q.answer=null;q.explanation='';}}
   for(const q of parsed.questions){
    const instruction=parsed.instructions+' '+q.instructions;
    if(q.type==='essay'&&/tama\s*o\s*mali/i.test(instruction)){q.type='choice';q.options=['Tama','Mali'];q.answer=null;}
    if(q.type==='essay'&&/maikli|pagkilala|identification|punan|patlang/i.test(instruction))q.type='text';
    if(q.type==='choice'&&/piliin (?:ang )?lahat|mahigit (?:sa )?isang sagot|multiple answers/i.test(instruction)){q.type='multiple';q.answer=null;notes.push('Maramihang sagot: kailangang beripikahin ang kumpletong susi.');}
    if(['choice','multiple'].includes(q.type)&&(!q.options||q.options.length<2||q.options.some(x=>!x)))notes.push('Hindi kumpleto ang mga opsiyon; suriin ang orihinal.');
   }
   sections.push({id:kind==='main'?lid:lid+':pre',lesson_id:lid,title:headingText(nodes[start]),group_title:null,kind:'assessment',source_position:start,source_hash:hash,instructions:parsed.instructions,questions:parsed.questions,source_start:start,source_end:end,source_body:nodes.slice(start+1,end).map(text).join('\n'),warnings:notes});
  }
  const app=lines.findIndex(x=>/^(?:\d+[.]\s*)?aplikasyon$/i.test(x));
  if(app>=0||lines.some((x,i)=>i>last&&/^Gawain(?:\s+\d+)?\s*[:.]/i.test(x))){const applicationStart=app>=0?app:last;let end=lines.findIndex((x,i)=>i>applicationStart&&/^(?:\d+[.]\s*)?(?:sanggunian|talasalitaan)/i.test(x));if(end<0)end=nodes.length;
   const tasks=lines.map((x,i)=>i>applicationStart&&i<end&&/^Gawain(?:\s+\d+)?\s*[:.]/i.test(x)?i:-1).filter(i=>i>=0),starts=tasks.length?tasks:[app];
   starts.forEach((start,i)=>{const stop=starts[i+1]??end,body=nodes.slice(start+1,stop).map(text),panuto=body.findIndex(x=>/^Panuto\b/i.test(clean(x))),prompt=panuto>=0?body[panuto]:body.join('\n');
    const fullPrompt=/^Panuto\s*:?\s*$/i.test(prompt.trim())?body.slice(panuto,panuto+2).join('\n'):prompt;
    const qs=fullPrompt.trim()?[{type:'essay',question:fullPrompt.slice(0,10000),points:1,explanation:'',source_number:null,options:[],answer:null}]:[];
    const reflection=body.findIndex(x=>/^(?:Mga tanong sa )?[Rr]eplek(?:s|sy|si)/.test(clean(x)));
    if(reflection>=0)for(const q of questions(nodes.slice(start+reflection+2,stop)).questions)if(q.question.includes('?'))qs.push({...q,type:'essay',answer:null,options:[]});
    sections.push({id:lid+':activity-'+(i+1),lesson_id:lid,title:headingText(nodes[start]),group_title:app<0||start===app?null:headingText(nodes[app]),kind:'activity',source_position:start,source_hash:hash,instructions:body.join('\n'),questions:qs,source_start:start,source_end:stop,source_body:body.join('\n'),warnings:prompt.length>10000?['Mahabang gawain: kumpletong teksto sa source; repasuhin ang input controls.']:[]});
   });
  }
  if(pre<0&&lines.some(x=>/susi sa.*paunang/i.test(x)))warnings.push('May paunang tanong na walang sariling heading: hindi inimbentuhan ng pamagat at hindi itinago sa reader.');
  sections.sort((a,b)=>a.source_position-b.source_position);
  if(!sections.length)warnings.push('Walang matiyak na assessment heading. Hindi binago ang reading content.');
  return {schema:1,source_hash:hash,sections,warnings};
 }
 return {extract,text,headingText};
})();
