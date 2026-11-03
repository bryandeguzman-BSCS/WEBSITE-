window.EdunexusLMSData=(()=>{
 'use strict';
 let client=null;try{client=EdunexusAuthClient.get();}catch{}
 const empty=()=>({source:'locked',role:'student',profile:null,enrollments:[],assignments:[],progress:[],bookmarks:[],attempts:[],notifications:[],announcements:[],materials:[],activity:[]});
 let state=empty(),epoch=0,pending=null;
 const emit=()=>window.dispatchEvent(new CustomEvent('edunexus-lms'));
 function lock(){epoch++;pending=null;state=empty();emit();}
 function failure(error){
  if(['PGRST202','PGRST205','42P01','42703'].includes(error?.code))return new Error('Kailangan munang patakbuhin ang bagong LMS database migrations (005 at 006).');
  if(error?.code==='42501')return new Error('Wala kang pahintulot o wala nang aktibong sesyon. Pumasok muli o makipag-ugnayan sa guro.');
  if(error?.code==='P0001')return new Error(error.message);
  return new Error('Hindi makumpleto ang kahilingan. Suriin ang koneksiyon at Supabase setup.');
 }
 async function call(action,payload={}){
  if(!client)throw new Error('Hindi pa naka-configure ang Supabase.');
  const {data,error}=await client.rpc('edunexus_lms',{p_action:action,p_payload:payload});
  if(error)throw failure(error);if(data?.error)throw new Error(data.error);return data;
 }
 async function refresh(force=false){
  if(!client){lock();return state;}if(pending&&!force)return pending;
  const token=++epoch;
  pending=(async()=>{try{const data=await call('snapshot');if(token===epoch){state={...empty(),...data,notificationsMore:data.notifications.length===500,source:'cloud'};emit();}}catch(error){if(token===epoch){state={...empty(),source:'error',error:error.message};emit();}throw error;}return state;})();
  try{return await pending;}finally{if(token===epoch)pending=null;}
 }
 async function action(name,payload={},reload=true){const result=await call(name,payload);if(reload)await refresh(true);return result;}
 async function moduleLibrary(action,payload={}){
  if(!client)throw new Error('Hindi pa handa ang Supabase.');
  const {data,error}=await client.rpc('edunexus_module_library',{p_action:action,p_payload:payload});
  if(error&&error.code==='PGRST202')throw new Error('Kailangang patakbuhin muna ang migration 016 para sa mga folder ng modyul.');
  if(error)throw failure(error);return data;
 }
 async function file(operation,payload,file){
  if(!client)throw new Error('Hindi pa handa ang Supabase.');
  let body={...payload,operation};
  if(file){body=new FormData();body.append('file',file);body.append('metadata',JSON.stringify(payload));}
  const {data,error}=await client.functions.invoke('edunexus-materials-dashboard',{body});
  if(error){let text='Hindi makumpleto ang file request. Tiyaking naka-deploy ang edunexus-materials-dashboard Edge Function.';try{const detail=await error.context?.json();if(detail?.error)text=detail.error;}catch{}throw new Error(text);}
  if(data?.error)throw new Error(data.error);if(operation==='upload'||operation==='delete')await refresh(true);return data;
 }
 window.addEventListener('edunexus-verified',e=>{if(!e.detail.user)lock();});
 async function moreNotifications(){const last=state.notifications.at(-1);if(!last)return;const token=epoch;const rows=await call('notifications_page',{before:last.created_at,before_id:last.id});if(token!==epoch)return;const ids=new Set(state.notifications.map(n=>n.id));state.notifications.push(...rows.filter(n=>!ids.has(n.id)));state.notificationsMore=rows.length===500;emit();}
 return {state:()=>state,refresh,lock,action,call,moduleLibrary,file,moreNotifications};
})();
