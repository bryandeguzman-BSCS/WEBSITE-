/* A destination is a local hash, never an arbitrary redirect URL or auth token. */
window.EdunexusAuthRoute = (() => {
  'use strict';
  const key='edunexus-login-destination';
  const publicRoutes=new Set(['#login','#register','#forgot-password']);
  function safe(hash) {
    if(typeof hash!=='string'||hash.length>200)return null;
    if(['#home','#subjects','#glossary','#links','#profile','#account','#appearance','#manage-subjects','#reset-password','#dashboard','#student-dashboard','#teacher-dashboard','#admin-dashboard','#my-subjects','#quizzes','#progress','#bookmarks','#notifications','#announcements','#materials','#discussions'].includes(hash))return hash;
    if(/^#assessment\/(?:[a-f0-9-]{36}|ge10[12](?:-l[0-6]|-doc-m[1-7]))\/[a-zA-Z0-9:%-]{1,120}$/.test(hash))return hash;
    return /^#(?:module\/(?:101|102)|lesson\/(?:101|102)\/[0-6]|lesson\/ge10[12]-l[0-6]|(?:subject|learn|class)\/(?:[a-f0-9-]{36}|ge10[12](?:-l[0-6]|-doc-m[1-7])?))$/.test(hash)?hash:null;
  }
  function remember(hash) { const value=safe(hash);if(value&&value!=='#reset-password')try{sessionStorage.setItem(key,value);}catch{} }
  function pending() { try{return safe(sessionStorage.getItem(key))||'#dashboard';}catch{return '#dashboard';} }
  function consume() {const value=pending();clear();return value;}
  function clear(){try{sessionStorage.removeItem(key);}catch{}}
  return {safe,remember,pending,consume,clear,isPublic:hash=>publicRoutes.has(hash)};
})();

window.EdunexusAccess={user:()=>null,authorize:async()=>true};
