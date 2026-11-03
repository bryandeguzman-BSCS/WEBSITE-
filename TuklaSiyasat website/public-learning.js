/* Published GE 101/102 content snapshot. No fabricated account or database permissions. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const get=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 const put=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
 let snapshot={modules:[],documents:{}},catalog={source:'loading',subjects:[],lessons:[],glossary:[],admin:false};
 let current=null,selectedTab=6,mountedQuizTab=null;
 const retired=new Set(['#login','#register','#forgot-password','#reset-password','#profile','#account']);
 const ready=fetch('public-content.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Hindi mabuksan ang mga aralin.');return r.json();}).then(data=>{
  snapshot=data;
  const titles={'101':['Understanding the Self','Sikolohikal, pilosopikal, at sosyolohikal na pagtalakay sa identidad at kakayahan ng tao.','brain','#35caff'],'102':['Readings in Philippine History','Pagsusuri sa mga primaryang batis, dokumento ng ating nakaraan, at mga kritikal na yugto ng bansa.','landmark','#ffce48']};
  catalog={source:'cloud',admin:false,subjects:['101','102'].map(n=>{const m=data.modules.find(x=>x.legacy_module===n),t=titles[n];return {id:'ge'+n,code:'GE '+n,title:m.subject_title,title_en:t[0],description:t[1],icon:t[2],theme_color:t[3],legacy_module:n,archived:false,can_access:true,can_manage:false};}),lessons:data.modules.map(m=>({id:m.lesson_id,subject_id:m.subject_id,title:m.title,content:'',glossary:[],quiz:[],reflection_prompt:'Ano ang pinakamahalagang natutuhan mo sa modyul na ito?',position:m.module_number,legacy_index:m.module_number-1,archived:false,locked:false,can_manage:false})),glossary:[...new Map(Object.values(data.documents).flatMap(d=>d.glossary||[]).map(t=>[t.term,t])).values()]};
  // Extract available vocabulary from the published reading; keep full source documents intact.
  window.dispatchEvent(new CustomEvent('edunexus-catalog'));
  return catalog;
 }).catch(error=>{catalog={...catalog,source:'error',error:error.message};return catalog;});
 const denied=async()=>{throw Error('Ang pamamahala ng database ay hindi bahagi ng pampublikong website.');};
 window.EdunexusSubjectData={state:()=>catalog,ready,refresh:async()=>{await ready;window.dispatchEvent(new CustomEvent('edunexus-catalog'));return catalog;},lock:()=>{},requireAdmin:denied,requireManager:denied,saveSubject:denied,saveLesson:denied,deleteSubject:denied,deleteLesson:denied,reorder:denied};
 window.EdunexusAccess={user:()=>null,authorize:async hash=>{document.body.dataset.auth='public';if(retired.has(hash)){history.replaceState(null,'','#home');setTimeout(()=>window.dispatchEvent(new CustomEvent('edunexus-refresh-view')),0);return false;}return true;},signedOut:()=>{},landing:async()=> '#home'};
 const bell=$('lms-bell');if(bell)bell.style.display='none';
 const navigation=$('lms-navigation');if(navigation)navigation.innerHTML='<a href="#home">Tahanan</a><a href="#student-dashboard">Talaan ng Estudyante</a><a href="#subjects">Mga Asignatura</a><a href="#glossary">Bilingguwal na Glosaryo</a><a href="#links">Mga Link at QR Code</a>';
 const oldAccount=window.EdunexusAccount;
 window.EdunexusAccount={handles:hash=>hash==='#appearance',render:hash=>oldAccount.render(hash),publicRoute:()=>true};
 const records=()=>snapshot.modules.map(m=>({...m,published:true,allow_download:false}));
 const modules=window.EdunexusModules;
 modules.refresh=async()=>{await ready;};modules.records=records;modules.moduleFor=id=>records().find(m=>m.lesson_id===id);
 modules.orderedLessons=sid=>catalog.lessons.filter(l=>l.subject_id===sid).sort((a,b)=>a.position-b.position);
 modules.renderSubject=()=>false;
 function state(){const progress=get('edunexus-progress',[]),reflections=get('tuklasiyasat-reflections',{});return {source:'public',role:'student',progress:catalog.lessons.map(l=>({lesson_id:l.id,completed:progress.includes(progressKey(l)),reflection:reflections[l.id]||''})),bookmarks:get('tuklasiyasat-bookmarks',[]).map(lesson_id=>({lesson_id})),attempts:[],notifications:[],announcements:[],materials:[],activity:[],enrollments:[],assignments:[]};}
 function progressKey(l){return l.subject_id.slice(2)+'-'+l.legacy_index;}
 window.EdunexusLMSData.state=state;
 window.EdunexusLMSData.refresh=async()=>state();
 const folderDefinitions=[['layunin','Layunin'],['paunang_pagtataya','Paunang Pagsusulit / Pagtataya'],['diskusyon','Diskusyon'],['pinal_na_pagsusulit','Pinal na Pagsusulit'],['aplikasyon','Aplikasyon'],['talasalitaan','Talasalitaan'],['sanggunian','Sanggunian'],['teachers_toolkit',"Mga Kagamitan ng Guro"]];
 function materialsFolders(doc){return `<h2>Mga Folder ng Modyul</h2><p class="lms-lead">Mga materyales na nakaayos ayon sa bahagi ng modyul.</p><div id="module-drive-folders" class="module-drive-folders">${folderDefinitions.filter(([key])=>key!=='teachers_toolkit').map(([key,label])=>`<section class="module-folder" data-folder="${key}"><div class="lms-title-line"><h3>${esc(label)}</h3></div><p class="lms-note">Wala pang naka-upload na materyales sa pampublikong kopyang ito.</p></section>`).join('')}</div>`;}
 const primaryTabs=[{i:6,key:'layunin',t:'Layunin'},{i:7,key:'paunang_pagtataya',t:'Paunang Pagsusulit / Pagtataya'},{i:8,key:'diskusyon',t:'Diskusyon'},{i:9,key:'pinal_na_pagsusulit',t:'Pinal na Pagsusulit'},{i:10,key:'aplikasyon',t:'Aplikasyon'},{i:1,key:'talasalitaan',t:'Talasalitaan'},{i:11,key:'sanggunian',t:'Sanggunian'},{i:12,key:'teachers_toolkit',t:'Mga Kagamitan ng Guro'}];
 const quizTabs=new Set([2,7,9,10]);
 function renderReading(doc,nodes){return modules.renderDocument(nodes,doc.assets.map(a=>({...a,url:new URL(a.url,location.href).href}))).html;}
 function sourceSection(doc,key){const nodes=TuklaModuleSections.partition(doc.document)[key];return nodes.some(n=>TuklaModuleSections.textOf(n).trim())?renderReading(doc,nodes):'';}
 function lessonNavigation(){return `<nav class="module-section-nav" role="tablist" aria-label="Mga bahagi ng modyul">${primaryTabs.map(({t,i},index)=>`<button id="module-tab-${i}" role="tab" type="button" aria-selected="${selectedTab===i}" aria-controls="module-section-panel" tabindex="${selectedTab===i?0:-1}" data-public="tab" data-tab="${i}" class="module-section-tab ${selectedTab===i?'active':''}"><span class="module-section-number" aria-hidden="true">${index+1}</span><span>${t}</span></button>`).join('')}</nav><div class="module-secondary-nav" role="group" aria-label="Iba pang opsiyon ng modyul">${[{i:3,t:'Pagninilay'}].map(({i,t})=>`<button id="module-tab-${i}" type="button" data-public="tab" data-tab="${i}" aria-pressed="${selectedTab===i}" class="${selectedTab===i?'active':''}">${t}</button>`).join('')}</div>`;}
 function tabBody(l){const doc=snapshot.documents[l.id];if(!doc)return '<p>Hindi available ang modyul.</p>';
  if(selectedTab===0)return renderReading(doc,doc.document);
  if(quizTabs.has(selectedTab)){
   const key=primaryTabs.find(t=>t.i===selectedTab)?.key;
   const intro=key?sourceSection(doc,key):'';
   return `${intro?`<div class="module-section-intro">${intro}</div>`:''}<div id="student-quiz-root"></div>`;
  }
  if(selectedTab===12)return materialsFolders(doc);
  const section=primaryTabs.find(t=>t.i===selectedTab);
  if(section){
   const body=sourceSection(doc,section.key);
   if(body)return body;
   if(section.key==='talasalitaan')return (doc.glossary||[]).map(t=>`<div class="term"><strong>${esc(t.term)}</strong><span>${esc(t.english)}</span><p>${esc(t.definition)}</p></div>`).join('')||'<h2>Talasalitaan</h2><p>Wala pang hiwalay na talasalitaan sa modyul na ito.</p>';
   return `<h2>${esc(section.t)}</h2><p>Wala pang hiwalay na materyal na kasama sa pampublikong kopyang ito.</p>`;
  }
  if(selectedTab===3)return `<h2>Iyong Pagninilay</h2><p>${esc(l.reflection_prompt)}</p><textarea id="public-reflection" rows="7">${esc(get('tuklasiyasat-reflections',{})[l.id]||'')}</textarea><button class="btn gold" data-public="save-reflection">I-save sa Browser</button>`;
  if(selectedTab===4)return '<p>Ang mga talakayan ng account ay nananatili sa database. Walang pampublikong talakayang kasama sa inilathalang mga materyal.</p>';
  return '<h2>Mga Materyal</h2><p>Makikita ang mga folder sa Mga Kagamitan ng Guro.</p>';
 }
 function renderLesson(l){if(current===l.id&&mountedQuizTab===selectedTab&&quizTabs.has(selectedTab)&&window.TuklaStudentQuiz?.isMounted())return true;window.TuklaStudentQuiz?.unmount();mountedQuizTab=null;if(current!==l.id){current=l.id;selectedTab=6;}
  const s=catalog.subjects.find(s=>s.id===l.subject_id),m=modules.moduleFor(l.id),ordered=modules.orderedLessons(s.id),index=ordered.indexOf(l),done=get('edunexus-progress',[]).includes(progressKey(l)),saved=get('tuklasiyasat-bookmarks',[]).includes(l.id);
  $('app').innerHTML=`<section class="lesson-hero"><div class="crumb"><a href="#module/${s.legacy_module}">← Bumalik sa ${esc(s.code)}</a><span>Link: #learn/${esc(l.id)}</span></div><div class="eyebrow" style="margin-top:30px">${esc(s.code)} · MODYUL ${m.module_number}</div><h1 class="lesson-title">${esc(l.title)}</h1><p class="english">${esc(s.title_en)}</p><div class="actions"><button class="btn gold" data-action="copy">Kopyahin ang Link</button><button class="btn ghost" data-action="share">Ibahagi</button><button class="btn ghost" data-action="qr-current">QR Code</button><button class="btn ghost" data-public="complete">${done?'✓ Natapos na · Alisin ang Marka':'Markahan bilang Natapos'}</button><button class="btn ghost" data-public="bookmark">${saved?'Alisin ang Bookmark':'I-bookmark'}</button></div></section><section class="wrap">${lessonNavigation()}<p id="public-status" role="status"></p><article id="module-section-panel" role="tabpanel" aria-labelledby="module-tab-${selectedTab}" class="content module-document" lang="fil">${tabBody(l)}</article><div class="lms-actions">${index>0?`<a class="btn" href="#lesson/${s.legacy_module}/${ordered[index-1].legacy_index}">← Nakaraang Aralin</a>`:''}</div></section>`;
  if(quizTabs.has(selectedTab)){const doc=snapshot.documents[l.id],key=primaryTabs.find(t=>t.i===selectedTab)?.key,practice=selectedTab===2?doc.practice:TuklaModuleSections.practiceFor(doc.practice,key);window.TuklaStudentQuiz.mount($('student-quiz-root'),practice,{title:selectedTab===10?'Aplikasyon':selectedTab===7?'Paunang Pagsusulit / Pagtataya':selectedTab===9?'Pinal na Pagsusulit':'Mga Pagtataya'});mountedQuizTab=selectedTab;}

  document.querySelectorAll('[data-public-practice]').forEach(f=>{const answers=get('tuklasiyasat-practice:'+f.dataset.publicPractice,{});for(const [name,value] of Object.entries(answers)){const el=f.elements.namedItem(name);if(el)el.value=value;}});
  return true;
 }
 window.addEventListener('edunexus-catalog',()=>{if(navigation)navigation.innerHTML='<a href="#home">Tahanan</a><a href="#student-dashboard">Talaan ng Estudyante</a><a href="#subjects">Mga Asignatura</a><a href="#glossary">Bilingguwal na Glosaryo</a><a href="#links">Mga Link at QR Code</a>';if(bell)bell.style.display='none';});
 window.EdunexusLMS.renderLesson=renderLesson;
 function renderSeparateQuiz(l,key){
  window.TuklaStudentQuiz?.unmount();mountedQuizTab=null;current=null;
  const tab=primaryTabs.find(t=>t.key===key),doc=snapshot.documents[l.id];
  $('app').innerHTML=`<section class="wrap"><p><a class="btn ghost" href="#lesson/102/${l.legacy_index}">← Bumalik sa Modyul</a></p><div class="eyebrow">GE 102 · ${esc(l.title)}</div><h1>${esc(tab.t)}</h1><div id="student-quiz-root"></div>${sourceSection(doc,key)?`<article class="content module-document">${sourceSection(doc,key)}</article>`:''}</section>`;
  window.TuklaStudentQuiz.mount($('student-quiz-root'),TuklaModuleSections.practiceFor(doc.practice,key),{title:tab.t});return true;
 }
 window.EdunexusLMS.renderRoute=async hash=>{if(hash==='#student-dashboard'){TuklaStudentDashboard.render();return true;}const match=/^#module-quiz\/(ge102-doc-m[1-7])\/(paunang_pagtataya|pinal_na_pagsusulit)$/.exec(hash);if(!match)return false;await ready;const l=catalog.lessons.find(l=>l.id===match[1]);return l?renderSeparateQuiz(l,match[2]):false;};
 window.EdunexusAssessments.renderPage=async hash=>{const match=/^#assessment\/([^/]+)\/(.+)$/.exec(hash);if(!match)return false;let lid,aid;try{lid=decodeURIComponent(match[1]);aid=decodeURIComponent(match[2]);}catch{return false;}const l=catalog.lessons.find(x=>x.id===lid);if(!l)return false;const assessment=snapshot.documents[l.id]?.practice.find(a=>a.section.id===aid);if(l.subject_id==='ge102'&&assessment?.section.kind==='assessment')return renderSeparateQuiz(l,TuklaModuleSections.practiceFor([assessment],'paunang_pagtataya').length?'paunang_pagtataya':'pinal_na_pagsusulit');current=l.id;selectedTab=assessment?(assessment.section.kind==='activity'?10:TuklaModuleSections.practiceFor([assessment],'paunang_pagtataya').length?7:9):2;return renderLesson(l);};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-public]');if(!b)return;const l=catalog.lessons.find(l=>l.id===current);if(!l)return;const action=b.dataset.public;if(action==='tab'){const target=Number(b.dataset.tab);if(l.subject_id==='ge102'&&[7,9].includes(target)){location.hash='#module-quiz/'+l.id+'/'+primaryTabs.find(t=>t.i===target).key;return;}selectedTab=target;}if(action==='open-practice')selectedTab=2;if(action==='complete'){const key=progressKey(l),list=get('edunexus-progress',[]);put('edunexus-progress',list.includes(key)?list.filter(x=>x!==key):[...list,key]);}if(action==='bookmark'){const list=get('tuklasiyasat-bookmarks',[]);put('tuklasiyasat-bookmarks',list.includes(l.id)?list.filter(x=>x!==l.id):[...list,l.id]);}if(action==='save-reflection'){const all=get('tuklasiyasat-reflections',{});all[l.id]=$('public-reflection').value;put('tuklasiyasat-reflections',all);$('public-status').textContent='Na-save sa browser na ito.';return;}renderLesson(l);});
 document.addEventListener('keydown',event=>{const tab=event.target.closest?.('.module-section-nav [role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=primaryTabs.findIndex(t=>t.i===Number(tab.dataset.tab)),next=event.key==='Home'?0:event.key==='End'?primaryTabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+primaryTabs.length)%primaryTabs.length;selectedTab=primaryTabs[next].i;const l=catalog.lessons.find(l=>l.id===current);if(l?.subject_id==='ge102'&&[7,9].includes(selectedTab)){location.hash='#module-quiz/'+l.id+'/'+primaryTabs[next].key;return;}if(l){renderLesson(l);$('module-tab-'+selectedTab)?.focus({preventScroll:true});$('module-tab-'+selectedTab)?.scrollIntoView({block:'nearest',inline:'nearest'});}});
 document.addEventListener('submit',e=>{const f=e.target.closest('[data-public-practice]');if(!f)return;e.preventDefault();put('tuklasiyasat-practice:'+f.dataset.publicPractice,Object.fromEntries(new FormData(f)));f.querySelector('[data-practice-status]').textContent='Na-save sa browser na ito. Hindi ito ipinapadala bilang opisyal na marka.';});
})();
