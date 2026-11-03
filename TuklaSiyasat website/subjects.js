window.EdunexusSubjects = (() => {
  'use strict';
  const db=new Proxy({}, {get:(_,key)=>window.EdunexusSubjectData[key]}),$=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons=['book-open','brain','landmark','flask','calculator','laptop-code','language','palette','globe','atom','music','seedling'];
  let originalModules={},selectedSubject=null,editor=null,working=false,study={id:null,tab:0,answers:{},checked:false};
  function published(){return db.state().subjects.filter(s=>!s.archived);}
  function lessons(subject,all=false){return db.state().lessons.filter(l=>l.subject_id===subject.id&&(all||!l.archived)).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id));}
  const subjectRoute=s=>s.legacy_module?`#module/${s.legacy_module}`:`#subject/${s.id}`;
  const lessonRoute=l=>{const s=db.state().subjects.find(s=>s.id===l.subject_id);return s?.legacy_module&&l.legacy_index!==null&&l.legacy_index!==undefined?`#lesson/${s.legacy_module}/${l.legacy_index}`:`#learn/${l.id}`;};
  const progressKey=l=>{const s=db.state().subjects.find(s=>s.id===l.subject_id);return s?.legacy_module&&l.legacy_index!==null&&l.legacy_index!==undefined?`${s.legacy_module}-${l.legacy_index}`:`db:${l.id}`;};
  function progress(){if(window.EdunexusLMSData?.state().source==='cloud')return EdunexusLMS.progressKeys();try{const data=JSON.parse(localStorage.getItem('edunexus-progress')||'[]');return Array.isArray(data)?data.filter(x=>typeof x==='string'):[];}catch{return [];}}
  function publicRoutes(){return published().flatMap(s=>[subjectRoute(s),...lessons(s).map(lessonRoute)]);}
  function findSubject(hash){return published().find(s=>subjectRoute(s)===hash);}
  function findLesson(hash){return db.state().lessons.find(l=>(!l.archived||(l.can_manage&&window.EdunexusModules?.moduleFor(l.id)))&&published().some(s=>s.id===l.subject_id)&&lessonRoute(l)===hash);}
  function card(s,oldOnly=false){
    const imported=window.EdunexusModules?.records().filter(m=>m.subject_id===s.id&&m.published)||[],list=oldOnly?lessons(s).filter(l=>!window.EdunexusModules?.moduleFor(l.id)):imported.length?EdunexusModules.orderedLessons(s.id).filter(l=>!l.archived):lessons(s),done=progress(),finished=list.filter(l=>done.includes(progressKey(l))).length;
    const color=/^#[a-f\d]{6}$/i.test(s.theme_color)?s.theme_color:'#35caff',icon=icons.includes(s.icon)?s.icon:'book-open';
    return `<article class="card subject-card" data-subject-module="${['101','102'].includes(String(s.legacy_module))?s.legacy_module:'custom'}" style="--subject-color:${color}"><div class="subject-card-heading"><span class="badge">${esc(s.code)}</span><i class="fa-solid fa-${icon} subject-icon" aria-hidden="true"></i></div><h2>${esc(s.title)}</h2><div class="english">${esc(s.title_en)}</div><p>${esc(s.description)}</p><div class="label">${!oldOnly&&imported.length?'MGA MODYUL SA ASIGNATURA':'MGA ARALIN SA ASIGNATURA'}</div><div class="lesson-list">${list.map((l,i)=>`<a href="${lessonRoute(l)}"><i>${done.includes(progressKey(l))?'✓':i+1}</i><span>${esc(window.EdunexusModules?.moduleFor(l.id)?.title||l.title)}</span>›</a>`).join('')||'<p>Wala pang inilathalang aralin.</p>'}</div><div class="progress"><div style="width:${list.length?finished/list.length*100:0}%"></div></div><div class="card-bottom"><a class="btn ghost" href="${subjectRoute(s)}">Buksan ang Asignatura →</a><small>${finished}/${list.length} tapos</small></div></article>`;
  }
  function statusBlock(){const state=db.state();return `<div class="content subject-status" role="status"><h2>${state.source==='loading'?'Kinukuha ang mga asignatura…':'Hindi makuha ang mga asignatura'}</h2><p>${esc(state.error||'Sandali lamang habang kinukuha ang pinakabagong talaan sa database.')}</p><button class="btn" data-subject="refresh">Subukang Muli</button></div>`;}
  function navigation(){
    const el=$('subject-navigation');if(el)el.innerHTML=published().filter(s=>!['101','102'].includes(String(s.legacy_module))).map(s=>`<a href="${subjectRoute(s)}"><i class="fa-solid fa-${icons.includes(s.icon)?s.icon:'book-open'}" aria-hidden="true"></i> ${esc(s.code)}: ${esc(s.title)}</a>`).join('');
    const admin=$('subject-admin-link');if(admin)admin.hidden=!db.state().admin;
  }
  function decorateHome(){
    const container=document.querySelector('.wrap .cards');if(!container)return;
    const available=published(),all=available.flatMap(s=>lessons(s)),done=progress();
    container.innerHTML=['loading','error'].includes(db.state().source)?statusBlock():available.map(s=>card(s)).join('')||'<p>Wala pang inilathalang asignatura.</p>';
    const stats=document.querySelectorAll('.hero .stats strong');if(stats.length===3){stats[0].textContent=available.length;stats[1].textContent=all.length;stats[2].textContent=`${all.length?Math.round(all.filter(l=>done.includes(progressKey(l))).length/all.length*100):0}%`;}
    const actions=document.querySelector('.hero .actions');if(actions)actions.innerHTML=available.slice(0,2).map((s,i)=>`<a class="btn ${i===1?'gold':''}" href="${subjectRoute(s)}"><i class="fa-solid fa-${icons.includes(s.icon)?s.icon:'book-open'}" aria-hidden="true"></i> Simulan ang ${esc(s.code)}</a>`).join('')+'<a class="btn ghost" href="#links"><i class="fa-solid fa-qrcode" aria-hidden="true"></i> Mga Link at QR Code</a>';
    const visual=document.querySelector('.visual');if(visual){visual.querySelectorAll('a').forEach(a=>a.remove());available.forEach(s=>{const a=document.createElement('a');a.href=subjectRoute(s);a.textContent=`${s.code} · ${s.title} →`;visual.append(a);});const a=document.createElement('a');a.href='#glossary';a.textContent='Bilingguwal na Glosaryo →';visual.append(a);}
  }
  function listPage(){
    $('app').innerHTML=`<section class="wrap"><span class="eyebrow subject-eyebrow">Pagkatuto para sa lahat</span><h1>Mga Asignatura</h1>${db.state().source==='builtin'?'<p class="subject-note">Orihinal na mga aralin ang ipinapakita. Hindi pa naka-configure ang online database.</p>':''}<div class="cards" id="student-subject-cards"></div></section>`;
    const update=()=>{const q='';$('student-subject-cards').innerHTML=['loading','error'].includes(db.state().source)?statusBlock():published().filter(s=>`${s.code} ${s.title} ${s.title_en} ${s.description}`.toLowerCase().includes(q)).map(s=>card(s)).join('')||'<p>Walang nahanap na asignatura.</p>';};
    update();
  }
  function renderSubject(s){if(s.can_access===false){EdunexusLMS.enrollmentRequired(null,s);return;}if(window.EdunexusModules?.renderSubject(s,card(s,true)))return;$('app').innerHTML=`<section class="wrap"><div class="module-intro"><a href="#subjects">← Mga Asignatura</a><h1>${esc(s.code)}: ${esc(s.title)}</h1><p>Pumili ng aralin upang magsimula.</p></div>${card(s)}</section>`;}
  function textContent(text){return String(text||'').split(/\n\s*\n/).map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('');}
  function renderLesson(l){
    if(window.EdunexusLMS)return EdunexusLMS.renderLesson(l);
    const s=published().find(s=>s.id===l.subject_id);if(!s)return unavailable();
    if(study.id!==l.id)study={id:l.id,tab:0,answers:{},checked:false};
    const done=progress().includes(progressKey(l)),ordered=lessons(s),index=ordered.findIndex(x=>x.id===l.id);
    let body='';
    if(study.tab===0)body=`<span class="eyebrow subject-eyebrow">Basahin at unawain</span><h2>Akademikong Talakayan sa Wikang Filipino</h2>${textContent(l.content)}`;
    if(study.tab===1)body=`<h2>Talasalitaan</h2>${l.glossary.map(t=>`<div class="term"><strong>${esc(t.term)} <span>— ${esc(t.english)}</span></strong><p>${esc(t.definition)}</p></div>`).join('')||'<p>Wala pang idinagdag na termino.</p>'}`;
    if(study.tab===2)body=`<h2>Maikling Pagsasanay</h2>${l.quiz.map((q,i)=>`<section class="study-question"><h3>${i+1}. ${esc(q.question)}</h3>${q.options.map((option,j)=>`<button class="choice ${study.answers[i]===j?'selected':''}" data-subject="answer" data-question="${i}" data-answer="${j}" aria-pressed="${study.answers[i]===j}">${String.fromCharCode(65+j)}. ${esc(option)}</button>`).join('')}${study.checked?`<p class="feedback">${study.answers[i]===q.answer?'✓ Tama!':'Subukang muli.'} ${esc(q.explanation)}</p>`:''}</section>`).join('')}${l.quiz.length?'<button class="btn" data-subject="check-quiz">Suriin ang mga Sagot</button>':'<p>Wala pang idinagdag na pagsusulit.</p>'}`;
    if(study.tab===3)body=`<h2>Iyong Pagninilay</h2><p>${esc(l.reflection_prompt)}</p><textarea id="reflection" rows="7" placeholder="Isulat ang iyong pagninilay…" aria-label="Iyong pagninilay">${esc(localStorage.getItem('reflection-'+progressKey(l))||'')}</textarea><div class="actions"><button class="btn" data-subject="save-reflection">I-save ang Pagninilay</button></div><small>Naka-save sa browser na ito ang iyong sagot.</small>`;
    $('app').innerHTML=`<section class="lesson-hero"><div class="crumb"><a href="${subjectRoute(s)}">← Bumalik sa ${esc(s.code)}</a><span>Link: ${esc(lessonRoute(l))}</span></div><div class="eyebrow" style="margin-top:30px">${esc(s.code)} · ARALIN ${index+1}</div><h1>${esc(l.title)}</h1><p class="english">${esc(s.title_en)}</p><div class="actions"><button class="btn gold" data-action="copy">Kopyahin ang Link ng Aralin</button><button class="btn ghost" data-action="share">Ibahagi</button><button class="btn ghost" data-action="qr-current"><i class="fa-solid fa-qrcode" aria-hidden="true"></i> QR Code</button><button class="btn ghost" data-subject="complete">${done?'✓ Natapos na · Alisin ang marka':'○ Markahan bilang Natapos'}</button></div></section><section class="wrap"><div class="tabs">${['1. Diskurso sa Filipino','2. Talasalitaan','3. Pagsasanay','4. Pagninilay'].map((label,i)=>`<button class="${study.tab===i?'active':''}" data-subject="study-tab" data-tab="${i}">${label}</button>`).join('')}</div><article class="content">${body}</article><div class="actions">${index>0?`<a class="btn" href="${lessonRoute(ordered[index-1])}">← Nakaraang Aralin</a>`:''}<a class="btn gold" href="${ordered[index+1]?lessonRoute(ordered[index+1]):subjectRoute(s)}">${ordered[index+1]?'Susunod na Aralin →':'Bumalik sa Asignatura →'}</a></div></section>`;
  }
  function unavailable(){ $('app').innerHTML='<section class="wrap"><article class="content"><h1>Hindi available ang aralin o asignatura</h1><p>Maaaring naka-archive, nabura, o hindi pa nailalathala ang hinahanap mong pahina.</p><a class="btn" href="#subjects">Tingnan ang mga Asignatura</a></article></section>'; }
  function toast(text){const el=$('toast');if(el){el.textContent=text;el.style.display='block';setTimeout(()=>el.style.display='none',4000);}}
  async function management(){
    $('app').innerHTML='<section class="wrap"><p role="status">Sinusuri ang pahintulot ng tagapangasiwa…</p></section>';
    try{await db.requireAdmin();await db.refresh();if(location.hash!=='#manage-subjects')return;adminPage();}
    catch(error){if(location.hash==='#manage-subjects')$('app').innerHTML=`<section class="wrap"><article class="content"><h1>Pamamahala ng Asignatura</h1><p role="alert">${esc(error.message)}</p><p>Ang online na pagdaragdag at pag-edit ay nangangailangan ng Supabase database at opisyal na pahintulot ng admin. Walang lokal na pagbabago na ipinapanggap na online.</p><a class="btn" href="#login">Pumasok sa Account</a> <a class="btn gold" href="#subjects">Tingnan ang mga Asignatura</a></article></section>`;}
  }
  function adminPage(){
    if(!db.state().admin)return void management();
    $('app').innerHTML=`<section class="wrap subject-admin"><div class="subject-page-heading"><div><span class="eyebrow subject-eyebrow">Para sa tagapangasiwa</span><h1>Pamamahala ng Asignatura</h1></div><button class="btn gold" data-subject="new-subject"><i class="fa-solid fa-plus" aria-hidden="true"></i> Bagong Asignatura</button></div><div class="subject-toolbar"><input id="admin-subject-search" type="search" placeholder="Hanapin ang code o pamagat…" aria-label="Maghanap sa mga asignatura"><select id="subject-status-filter" aria-label="Salain ang mga asignatura"><option value="all">Lahat</option><option value="active">Inilathala</option><option value="archived">Naka-archive</option></select><button class="btn" data-subject="refresh">I-refresh</button></div><p id="management-message" role="status"></p><div id="admin-subject-list"></div><section id="admin-lessons"></section></section>`;
    $('admin-subject-search').addEventListener('input',adminList);$('subject-status-filter').addEventListener('change',adminList);adminList();if(selectedSubject)lessonList(selectedSubject);
  }
  function adminList(){
    const q=$('admin-subject-search').value.toLowerCase(),filter=$('subject-status-filter').value;
    $('admin-subject-list').innerHTML=db.state().subjects.filter(s=>`${s.code} ${s.title} ${s.title_en}`.toLowerCase().includes(q)&&(filter==='all'||s.archived===(filter==='archived'))).map(s=>`<article class="content subject-admin-row"><div><span class="badge">${esc(s.code)}</span><h2>${esc(s.title)}</h2><p>${lessons(s,true).length} aralin · ${s.archived?'Naka-archive':'Inilathala'}${s.protected?' · Orihinal na asignatura':''}</p></div><div class="actions"><button class="btn" data-subject="edit-subject" data-id="${esc(s.id)}">I-edit</button><button class="btn" data-subject="lessons" data-id="${esc(s.id)}">Mga Aralin</button><button class="btn ghost" data-subject="archive-subject" data-id="${esc(s.id)}">${s.archived?'Ibalik':'I-archive'}</button>${s.archived&&!s.protected?`<button class="btn danger" data-subject="delete-subject" data-id="${esc(s.id)}">Burahin</button>`:''}</div></article>`).join('')||'<p>Walang nahanap na asignatura.</p>';
  }
  function lessonList(id){
    selectedSubject=id;const s=db.state().subjects.find(s=>s.id===id),root=$('admin-lessons');if(!root||!s)return;
    root.innerHTML=`<div class="subject-page-heading"><h2>Mga Aralin: ${esc(s.code)}</h2><button class="btn gold" data-subject="new-lesson" data-id="${esc(s.id)}">Magdagdag ng Aralin</button></div><p>Ang paglilipat ng pagkakasunod ay hindi nagbabago sa permanenteng URL ng aralin.</p>${lessons(s,true).map((l,i,all)=>`<article class="content subject-admin-row"><div><h3>${i+1}. ${esc(l.title)}</h3><p>${l.archived?'Naka-archive':'Inilathala'} · ${l.glossary.length} termino · ${l.quiz.length} tanong</p></div><div class="actions"><button class="btn" data-subject="edit-lesson" data-id="${esc(l.id)}">I-edit</button><button class="btn ghost" data-subject="move" data-id="${esc(l.id)}" data-direction="-1" ${i===0?'disabled':''} aria-label="Itaas ang aralin">↑</button><button class="btn ghost" data-subject="move" data-id="${esc(l.id)}" data-direction="1" ${i===all.length-1?'disabled':''} aria-label="Ibaba ang aralin">↓</button><button class="btn ghost" data-subject="archive-lesson" data-id="${esc(l.id)}">${l.archived?'Ibalik':'I-archive'}</button>${l.archived&&!l.protected?`<button class="btn danger" data-subject="delete-lesson" data-id="${esc(l.id)}">Burahin</button>`:''}</div></article>`).join('')||'<p>Wala pang aralin sa asignaturang ito.</p>'}`;
  }
  function dialog(title,body){
    let el=$('subject-editor');if(!el){el=document.createElement('dialog');el.id='subject-editor';el.className='subject-editor';document.body.append(el);el.addEventListener('cancel',event=>{if(working)event.preventDefault();});}
    el.innerHTML=`<div class="subject-page-heading"><h2 id="subject-editor-title">${title}</h2><button class="qr-icon-button" type="button" data-subject="close" aria-label="Isara">×</button></div><div id="subject-editor-error" class="account-message is-error" role="alert"></div>${body}`;el.setAttribute('aria-labelledby','subject-editor-title');if(!el.open)el.showModal();
  }
  function subjectForm(row){
    editor={kind:'subject',row};const x=row||{code:'',title:'',title_en:'',description:'',icon:'book-open',theme_color:'#35caff'};
    dialog(row?'I-edit ang Asignatura':'Bagong Asignatura',`<form data-subject-form="subject" novalidate><label>Code ng asignatura<input name="code" value="${esc(x.code)}" placeholder="GE 103" maxlength="24" required></label><label>Pamagat<input name="title" value="${esc(x.title)}" maxlength="200" required></label><label>Pamagat sa Ingles<input name="title_en" value="${esc(x.title_en)}" maxlength="200" required></label><label>Paglalarawan<textarea name="description" rows="4" maxlength="5000">${esc(x.description)}</textarea></label><div class="subject-form-columns"><label>Icon<select name="icon">${icons.map(icon=>`<option value="${icon}" ${icon===x.icon?'selected':''}>${({ 'book-open':'Aklat',brain:'Isipan',landmark:'Kasaysayan',flask:'Agham',calculator:'Matematika','laptop-code':'Kompyuter',language:'Wika',palette:'Sining',globe:'Daigdig',atom:'Atomo',music:'Musika',seedling:'Kalikasan'})[icon]}</option>`).join('')}</select></label><label>Kulay<input type="color" name="theme_color" value="${esc(x.theme_color)}"></label></div><div class="actions"><button class="btn gold" type="submit">I-save ang Asignatura</button><button class="btn" type="button" data-subject="close">Kanselahin</button></div></form>`);
  }
  function termRow(t={term:'',english:'',definition:''}){return `<div class="subject-field-group" data-term-row><label>Termino<input data-field="term" value="${esc(t.term)}" maxlength="200"></label><label>Katumbas sa Ingles<input data-field="english" value="${esc(t.english)}" maxlength="200"></label><label>Kahulugan<textarea data-field="definition" maxlength="5000">${esc(t.definition)}</textarea></label><button class="btn danger" type="button" data-subject="remove-row">Alisin ang Termino</button></div>`;}
  function quizRow(q={question:'',options:['',''],answer:0,explanation:''}){return `<div class="subject-field-group" data-quiz-row><label>Tanong<textarea data-field="question" maxlength="2000">${esc(q.question)}</textarea></label><label>Mga pagpipilian — isa sa bawat linya<textarea data-field="options" rows="4">${esc(q.options.join('\n'))}</textarea></label><label>Bilang ng tamang sagot (simula sa 1)<input type="number" data-field="answer" min="1" max="6" value="${q.answer+1}"></label><label>Paliwanag<textarea data-field="explanation" maxlength="5000">${esc(q.explanation)}</textarea></label><button class="btn danger" type="button" data-subject="remove-row">Alisin ang Tanong</button></div>`;}
  function lessonForm(row,subject){
    editor={kind:'lesson',row,subject};const x=row||{title:'',content:'',glossary:[],quiz:[],reflection_prompt:'Ano ang pinakamahalagang natutuhan mo? Magbigay ng halimbawa.'};
    dialog(row?'I-edit ang Aralin':'Bagong Aralin',`<form data-subject-form="lesson" novalidate><p>Asignatura: <strong>${esc(subject.code)} — ${esc(subject.title)}</strong></p><label>Pamagat ng aralin<input name="title" value="${esc(x.title)}" maxlength="200" required></label><label>Nilalaman — mga talata, walang HTML<textarea name="content" rows="10" maxlength="100000" required>${esc(x.content)}</textarea></label><label>Tanong sa pagninilay<textarea name="reflection_prompt" maxlength="5000">${esc(x.reflection_prompt)}</textarea></label><h3>Talasalitaan</h3><div id="lesson-terms">${x.glossary.map(termRow).join('')}</div><button class="btn" type="button" data-subject="add-term">Magdagdag ng Termino</button><h3>Pagsusulit</h3><div id="lesson-quiz">${x.quiz.map(quizRow).join('')}</div><button class="btn" type="button" data-subject="add-question">Magdagdag ng Tanong</button><div class="actions"><button class="btn gold" type="submit">I-save ang Aralin</button><button class="btn" type="button" data-subject="close">Kanselahin</button></div></form>`);
  }
  function confirmation(kind,row){
    editor={kind,row};const subject=kind.includes('subject'),archiving=kind.startsWith('archive'),expected=subject?row.code:row.title;
    const action=archiving?(row.archived?'Ibalik':'I-archive'):'Permanenteng Burahin';
    const detail=archiving?(row.archived?'Muling makikita ng mga mag-aaral ang nilalamang ito.':'Itatago ito sa mga mag-aaral. Mananatili ang datos at maaari itong ibalik.'):(subject?`Mabubura rin ang lahat ng ${lessons(row,true).length} aralin, termino, pagsusulit, enrollment, progreso, komento at kaugnay na tala nito. Hindi ito maibabalik sa karaniwang interface.`:'Mabubura ang aralin kasama ang mga termino, pagsusulit, progreso, komento at kaugnay na tala nito. Hindi ito maibabalik sa karaniwang interface.');
    dialog(action,`<form data-subject-form="confirm" novalidate><p><strong>${esc(expected)}</strong></p><p>${esc(detail)}</p><label>I-type ang “${esc(expected)}” upang kumpirmahin<input name="confirmation" autocomplete="off" required></label><label class="subject-confirm-check"><input type="checkbox" name="acknowledge" required> Naiintindihan ko ang magiging epekto.</label><div class="actions"><button class="btn ${archiving?'gold':'danger'}" type="submit">${action}</button><button class="btn" type="button" data-subject="close">Kanselahin</button></div></form>`);
  }
  async function submit(event){
    const form=event.target.closest('form[data-subject-form]');if(!form)return;event.preventDefault();if(working)return;
    const e=editor;working=true;form.querySelectorAll('button').forEach(b=>b.disabled=true);$('subject-editor-error').textContent='';
    try{
      const data=new FormData(form);
      if(e.kind==='subject'){
        const payload={code:String(data.get('code')).trim().toUpperCase(),title:String(data.get('title')).trim(),title_en:String(data.get('title_en')).trim(),description:String(data.get('description')).trim(),icon:String(data.get('icon')),theme_color:String(data.get('theme_color'))};
        if(!/^[A-Z0-9][A-Z0-9 ._-]{1,23}$/.test(payload.code)||payload.title.length<2||payload.title.length>200||!payload.title_en||payload.title_en.length>200||payload.description.length>5000||!icons.includes(payload.icon)||!/^#[\da-f]{6}$/i.test(payload.theme_color))throw new Error('Suriin ang code, mga pamagat, paglalarawan, icon, at kulay.');
        await db.saveSubject(payload,e.row);
      }else if(e.kind==='lesson'){
        const payload={title:String(data.get('title')).trim(),content:String(data.get('content')).trim(),reflection_prompt:String(data.get('reflection_prompt')).trim(),glossary:[],quiz:[]};
        if(!payload.title||payload.title.length>200||!payload.content||payload.content.length>100000||payload.reflection_prompt.length>5000)throw new Error('Suriin ang pamagat at nilalaman ng aralin.');
        form.querySelectorAll('[data-term-row]').forEach(row=>{const t={};['term','english','definition'].forEach(key=>t[key]=row.querySelector(`[data-field="${key}"]`).value.trim());if(!t.term||t.term.length>200||t.english.length>200||!t.definition||t.definition.length>5000)throw new Error('Kumpletuhin ang bawat termino at kahulugan.');payload.glossary.push(t);});
        form.querySelectorAll('[data-quiz-row]').forEach(row=>{const q={question:row.querySelector('[data-field="question"]').value.trim(),options:row.querySelector('[data-field="options"]').value.split('\n').map(x=>x.trim()).filter(Boolean),answer:Number(row.querySelector('[data-field="answer"]').value)-1,explanation:row.querySelector('[data-field="explanation"]').value.trim()};if(!q.question||q.question.length>2000||q.options.length<2||q.options.length>6||q.options.some(x=>x.length>2000)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length||q.explanation.length>5000)throw new Error('Suriin ang tanong, 2–6 na pagpipilian, at bilang ng tamang sagot.');payload.quiz.push(q);});
        if(payload.glossary.length>100||payload.quiz.length>50)throw new Error('Hanggang 100 termino at 50 tanong lamang bawat aralin.');
        if(!e.row){payload.subject_id=e.subject.id;payload.position=Math.max(-1,...lessons(e.subject,true).map(l=>l.position))+1;}
        await db.saveLesson(payload,e.row);
      }else{
        const subject=e.kind.includes('subject'),expected=subject?e.row.code:e.row.title;
        if(data.get('confirmation')!==expected||!data.get('acknowledge'))throw new Error('I-type nang eksakto ang hinihinging kumpirmasyon at lagyan ng tsek ang pahayag.');
        if(e.kind==='archive-subject')await db.saveSubject({archived:!e.row.archived},e.row);
        else if(e.kind==='archive-lesson')await db.saveLesson({archived:!e.row.archived},e.row);
        else if(e.kind==='delete-subject')await db.deleteSubject(e.row,expected);
        else await db.deleteLesson(e.row,expected);
      }
      $('subject-editor').close();toast('Na-save sa online database ang pagbabago.');if(location.hash==='#manage-subjects')adminPage();else window.dispatchEvent(new CustomEvent('edunexus-refresh-view'));
    }catch(error){if($('subject-editor-error'))$('subject-editor-error').textContent=error.message;}
    finally{working=false;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  function renderRoute(hash){
    const alias=/^#lesson\/(ge10[12]-l[0-6])$/.exec(hash);if(alias){const row=db.state().lessons.find(l=>l.id===alias[1]);if(row)hash=lessonRoute(row);else hash='#learn/'+alias[1];history.replaceState(null,'',hash);}
    if(hash==='#manage-subjects'){void management();return true;}
    if(hash==='#subjects'){listPage();return true;}
    const custom=/^#(?:subject|learn)\/[A-Za-z0-9_-]+$/.test(hash),legacy=/^#(?:module\/(101|102)|lesson\/(101|102)\/[0-6])$/.test(hash);
    if(!custom&&!legacy)return false;
    if(['loading','error'].includes(db.state().source)){$('app').innerHTML=`<section class="wrap">${statusBlock()}</section>`;return true;}
    const subject=findSubject(hash),lesson=findLesson(hash);if(subject)renderSubject(subject);else if(lesson)renderLesson(lesson);else unavailable();return true;
  }
  function glossary(base){const all=[...base,...(db.state().glossary||[]).map(t=>[t.term,t.english,t.definition])];const map=new Map(all.map(t=>[JSON.stringify(t),t]));for(const s of published())for(const l of lessons(s))for(const t of l.glossary){const term=[t.term,t.english,t.definition];map.set(JSON.stringify(term),term);}return [...map.values()];}
  function search(q){return published().flatMap(s=>[`${s.code} ${s.title}`.toLowerCase().includes(q)?`<a href="${subjectRoute(s)}">${esc(s.code)} · ${esc(s.title)}</a>`:'',...lessons(s).filter(l=>l.title.toLowerCase().includes(q)).map(l=>`<a href="${lessonRoute(l)}">${esc(s.code)} · ${esc(l.title)}</a>`)]).filter(Boolean);}
  function qrOptions(){return published().map(s=>`<optgroup label="${esc(s.code)}"><option value="${subjectRoute(s)}">${esc(s.code)} — ${esc(s.title)}</option>${lessons(s).map((l,i)=>`<option value="${lessonRoute(l)}">${esc(s.code)} · ${i+1}. ${esc(l.title)}</option>`).join('')}</optgroup>`).join('');}
  document.addEventListener('submit',event=>{void submit(event);});
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-subject]');if(!button)return;const action=button.dataset.subject,id=button.dataset.id;
    const s=db.state().subjects.find(s=>s.id===id),l=db.state().lessons.find(l=>l.id===id);
    if(action==='refresh'){await db.refresh();if(location.hash==='#manage-subjects')void management();else window.dispatchEvent(new CustomEvent('edunexus-refresh-view'));return;}
    if(action==='study-tab'){study.tab=Number(button.dataset.tab);const l=findLesson(location.hash);if(l)renderLesson(l);return;}
    if(action==='answer'){study.answers[Number(button.dataset.question)]=Number(button.dataset.answer);study.checked=false;const l=findLesson(location.hash);if(l)renderLesson(l);return;}
    if(action==='check-quiz'){const l=findLesson(location.hash);if(l&&l.quiz.some((_,i)=>study.answers[i]===undefined)){toast('Sagutan muna ang lahat ng tanong.');return;}study.checked=true;if(l)renderLesson(l);return;}
    if(action==='complete'){const l=findLesson(location.hash);if(l){const key=progressKey(l),done=progress(),next=done.includes(key)?done.filter(x=>x!==key):[...done,key];localStorage.setItem('edunexus-progress',JSON.stringify(next));renderLesson(l);}return;}
    if(action==='save-reflection'){const l=findLesson(location.hash);if(l){localStorage.setItem('reflection-'+progressKey(l),$('reflection').value);toast('Na-save ang iyong pagninilay sa browser na ito.');}return;}
    if(working)return;
    if(action==='close'){$('subject-editor')?.close();return;}
    if(action==='remove-row'){button.closest('[data-term-row],[data-quiz-row]').remove();return;}
    if(action==='add-term'){$('lesson-terms').insertAdjacentHTML('beforeend',termRow());return;}
    if(action==='add-question'){$('lesson-quiz').insertAdjacentHTML('beforeend',quizRow());return;}
    try{
      await db.requireAdmin();
      if(action==='new-subject')subjectForm(null);
      if(action==='edit-subject'&&s)subjectForm(s);
      if(action==='lessons'&&s)lessonList(s.id);
      if(action==='new-lesson'&&s)lessonForm(null,s);
      if(action==='edit-lesson'&&l)lessonForm(l,db.state().subjects.find(s=>s.id===l.subject_id));
      if(action==='archive-subject'&&s)confirmation(action,s);
      if(action==='archive-lesson'&&l)confirmation(action,l);
      if(action==='delete-subject'&&s&&!s.protected&&s.archived)confirmation(action,s);
      if(action==='delete-lesson'&&l&&!l.protected&&l.archived)confirmation(action,l);
      if(action==='move'&&l){const parent=db.state().subjects.find(s=>s.id===l.subject_id),all=lessons(parent,true),index=all.findIndex(x=>x.id===l.id),to=index+Number(button.dataset.direction);if(to<0||to>=all.length)return;[all[index],all[to]]=[all[to],all[index]];working=true;try{await db.reorder(parent,all.map(x=>x.id));if(location.hash==='#manage-subjects')adminPage();}finally{working=false;}}
    }catch(error){toast(error.message);}
  });
  window.addEventListener('hashchange',()=>{study={id:null,tab:0,answers:{},checked:false};$('subject-editor')?.close();});
  window.addEventListener('edunexus-catalog',()=>{navigation();EdunexusLinks.register(originalModules);});
  return {editLesson:async(row,subject)=>{await db.requireManager(subject.id);if(!EdunexusAccess.user())throw new Error('Pumasok muli.');lessonForm(row,subject);},initialize(modules){originalModules=modules;navigation();EdunexusLinks.register(modules);},renderRoute,decorateHome,publicRoutes,qrOptions,glossary,search,isAdmin:()=>db.state().admin,source:()=>db.state().source,refresh:db.refresh,navigation};
})();
