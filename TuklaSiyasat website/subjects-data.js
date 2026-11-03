/* Shared catalogue is Supabase/PostgreSQL. No localStorage CRUD or administrator role. */
window.EdunexusSubjectData = (() => {
  let client = null; try { client = window.EdunexusAuthClient?.get(); } catch {}
  let state = {source:'locked',subjects:[],lessons:[],glossary:[],admin:false,error:''};
  let pending = null, epoch = 0;
  function lock(){window.EdunexusModules?.lock();window.EdunexusLMSData?.lock();epoch++;pending=null;state={source:'locked',subjects:[],lessons:[],glossary:[],admin:false,error:''};emit();}
  function emit() { window.dispatchEvent(new CustomEvent('edunexus-catalog')); }
  function errorMessage(error) {
    if (error?.code === '23505') return 'May asignatura nang gumagamit ng code na ito.';
    if (error?.code === '42501') return 'Wala kang pahintulot na baguhin ang mga asignatura.';
    if (['42P01','PGRST202','PGRST205'].includes(error?.code)) return 'Hindi pa handa ang database. Kailangang patakbuhin ng may-ari ang database setup.';
    if (/refresh|bagong pagbabago|I-refresh/i.test(error?.message || '')) return 'May mas bagong pagbabago. I-refresh ang talaan bago mag-save muli.';
    return 'Hindi nakumpleto ang kahilingan sa database. Suriin ang koneksiyon, database setup, at pahintulot.';
  }
  async function requireAdmin() {
    if (!client) throw new Error('Hindi pa naka-configure ang Supabase at database. Walang pagbabagong mase-save online.');
    const {data:userData,error:userError} = await client.auth.getUser();
    if (userError || !userData?.user) throw new Error('Pumasok muna gamit ang account ng tagapangasiwa.');
    const {data,error} = await client.rpc('edunexus_is_admin');
    if (error) throw new Error(errorMessage(error));
    if (data !== true) throw new Error('Para lamang sa awtorisadong tagapangasiwa ang pamamahala ng asignatura.');
    return userData.user;
  }
  async function readAll(table,order) {
    const rows=[];
    for(let offset=0;;offset+=500){
      const {data,error}=await client.from(table).select('*').order(order,{ascending:true}).order('id',{ascending:true}).range(offset,offset+499);
      if(error)throw error;rows.push(...data);if(data.length<500)break;
    }
    return rows;
  }
  async function refresh(force=false) {
    if(!client){lock();return state;}
    if(force){epoch++;pending=null;}
    if(pending)return pending;
    const token=++epoch;
    pending=(async()=>{
      try{
        const {data:userData,error:userError}=await client.auth.getUser();
        if(userError||!userData?.user){if(token===epoch){state={source:'locked',subjects:[],lessons:[],glossary:[],admin:false,error:''};emit();}return state;}
        const [result]=await Promise.all([client.rpc('edunexus_catalog'),window.EdunexusLMSData?.refresh(force),window.EdunexusModules?.refresh()]);
        if(result.error)throw result.error;
        if(token!==epoch)return state;
        const next={source:'cloud',...result.data,error:''};
        const changed=JSON.stringify(state)!==JSON.stringify(next);state=next;if(changed)emit();
      }catch(error){if(token===epoch){state={source:'error',subjects:[],lessons:[],admin:false,error:errorMessage(error)};emit();}}
      return state;
    })();
    try{return await pending;}finally{if(token===epoch)pending=null;}
  }
  const ready=refresh();
  if(client){
    client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')lock();else setTimeout(()=>{lock();void refresh();},0);});
    window.addEventListener('focus',()=>{void refresh();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
    setInterval(()=>{if(!document.hidden)void refresh();},60000);
  }
  async function saveSubject(payload,existing) {
    await requireAdmin();
    const request=existing?client.from('edunexus_subjects').update(payload).eq('id',existing.id).eq('updated_at',existing.updated_at):client.from('edunexus_subjects').insert(payload);
    const {data,error}=await request.select().maybeSingle();
    if(error)throw new Error(errorMessage(error));if(!data)throw new Error('May mas bagong pagbabago. I-refresh ang talaan.');
    await refresh(true);return data;
  }
  async function requireManager(subjectId){
    if(!client)throw new Error('Hindi pa naka-configure ang Supabase.');
    const {data,error}=await client.rpc('edunexus_can_manage_subject',{p_subject:subjectId});
    if(error||data!==true)throw new Error('Walang pahintulot na baguhin ang asignaturang ito.');
  }
  async function saveLesson(payload,existing){
    await requireManager(existing?.subject_id||payload.subject_id);
    const {data,error}=await client.rpc('edunexus_save_lesson',{p_payload:payload,p_id:existing?.id||null,p_version:existing?.updated_at||null});
    if(error)throw new Error(error.code==='P0001'?error.message:errorMessage(error));
    await refresh(true);return data;
  }
  async function rpc(name,args){await requireAdmin();const {error}=await client.rpc(name,args);if(error)throw new Error(errorMessage(error));await refresh(true);}
  return {
    state:()=>state,ready,refresh,lock,requireAdmin,requireManager,saveSubject,saveLesson,
    deleteSubject:(row,text)=>rpc('edunexus_delete_subject',{p_id:row.id,p_confirmation:text,p_version:row.updated_at}),
    deleteLesson:async(row,text)=>{await requireManager(row.subject_id);const {error}=await client.rpc('edunexus_delete_lesson',{p_id:row.id,p_confirmation:text,p_version:row.updated_at});if(error)throw new Error(error.message);await refresh(true);},
    reorder:async(subject,ids)=>{await requireManager(subject.id);const {error}=await client.rpc('edunexus_reorder_lessons',{p_subject_id:subject.id,p_ids:ids,p_version:subject.updated_at});if(error)throw new Error(error.message);await refresh(true);}
  };
})();
