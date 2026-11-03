/* Dropdown coordination only. Authentication and role-specific navigation stay in their existing modules. */
window.EdunexusNavigation=(()=>{
 'use strict';
 const menu=document.getElementById('menu'),account=document.getElementById('account-menu');
 const hamburger=document.querySelector('[data-action="menu"]'),accountButton=document.getElementById('account-button');
 const panels=[menu,account].filter(Boolean);
 let saved=null,opener=null;
 const properties=['position','top','left','right','width','overflow','padding-right'];
 function lock(){if(saved)return;const style=document.body.style;const gap=Math.max(0,innerWidth-document.documentElement.clientWidth);
  saved={x:scrollX,y:scrollY,styles:properties.map(p=>[p,style.getPropertyValue(p),style.getPropertyPriority(p)])};
  const padding=parseFloat(getComputedStyle(document.body).paddingRight)||0;
  style.position='fixed';style.top=-saved.y+'px';style.left='0';style.right='0';style.width='100%';style.overflow='hidden';
  if(gap)style.paddingRight=padding+gap+'px';
 }
 function unlock(){if(!saved)return;const before=saved;saved=null;
  for(const [p,value,priority] of before.styles){if(value)document.body.style.setProperty(p,value,priority);else document.body.style.removeProperty(p);}
  // Do not animate scroll restoration when the site/device uses smooth scrolling.
  const root=document.documentElement.style,value=root.getPropertyValue('scroll-behavior'),priority=root.getPropertyPriority('scroll-behavior');
  root.setProperty('scroll-behavior','auto','important');window.scrollTo(before.x,before.y);
  if(value)root.setProperty('scroll-behavior',value,priority);else root.removeProperty('scroll-behavior');
 }
 function controls(){hamburger?.setAttribute('aria-expanded',String(!!menu&&!menu.hidden));accountButton?.setAttribute('aria-expanded',String(!!account&&!account.hidden));}
 function layout(){const viewport=window.visualViewport,offset=viewport?.offsetTop||0,height=viewport?.height||innerHeight;
  const header=document.querySelector('header'),bottom=header?.getBoundingClientRect().bottom||69;
  for(const p of panels){const top=Math.max(offset+8,bottom+8);p.style.setProperty('--navigation-top',top+'px');p.style.setProperty('--navigation-available',Math.max(0,offset+height-top-12)+'px');}
 }
 function close(restoreFocus=false){for(const p of panels)p.hidden=true;controls();unlock();if(restoreFocus)opener?.focus({preventScroll:true});opener=null;}
 function sync(){controls();if(panels.every(p=>p.hidden))unlock();active();}
 function toggle(id){const panel=document.getElementById(id);if(!panels.includes(panel))return;
  if(!panel.hidden){close();return;}

  close();opener=id==='menu'?hamburger:accountButton;layout();panel.hidden=false;panel.scrollTop=0;lock();controls();active();
 }
 function canonical(hash){const c=window.EdunexusSubjectData?.state();
  const assessment=/^#assessment\/([^/]+)\//.exec(hash);if(assessment)try{hash='#learn/'+decodeURIComponent(assessment[1]);}catch{}
  if(hash==='#dashboard'){const r=window.EdunexusLMSData?.state().role;return r==='admin'?'#admin-dashboard':r==='teacher'?'#teacher-dashboard':'#student-dashboard';}
  const s=/^#subject\/(.+)$/.exec(hash);if(s){const subject=c?.subjects.find(x=>x.id===s[1]);if(subject?.legacy_module)return '#module/'+subject.legacy_module;}
  return hash;
 }
 function active(){const target=canonical(location.hash||'#home');let subjectHash=null;
  if(/^#module\/(101|102)$/.test(target))subjectHash=target;
  const old=/^#lesson\/(101|102)\//.exec(target);if(old)subjectHash='#module/'+old[1];
  const learned=/^#learn\/(.+)$/.exec(target);if(learned){const c=window.EdunexusSubjectData?.state(),lesson=c?.lessons.find(x=>x.id===learned[1]),s=c?.subjects.find(x=>x.id===lesson?.subject_id);if(s)subjectHash=s.legacy_module?'#module/'+s.legacy_module:'#subject/'+s.id;}
  for(const p of panels)for(const a of p.querySelectorAll('a[href]')){const hash=new URL(a.href,location.href).hash;const matches=canonical(hash)===target||!!subjectHash&&(canonical(hash)===subjectHash||hash==='#my-subjects');
   if(matches)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  }
 }
 function sessionMenu(){menu?.querySelectorAll('[data-navigation-logout]').forEach(el=>el.remove());active();}
 hamburger?.setAttribute('aria-controls','menu');hamburger?.setAttribute('aria-expanded','false');
 // Capture before individual feature handlers. Never intercept their action or permissions.
 document.addEventListener('click',e=>{const el=e.target;if(!(el instanceof Element))return;
  if(el.closest('[data-action="menu"],[data-account="menu"]'))return;
  const inside=panels.find(p=>!p.hidden&&p.contains(el));
  if(inside){if(el.closest('a[href],button:not(:disabled)'))close();}
  else if(panels.some(p=>!p.hidden))close();
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panels.some(p=>!p.hidden)){close(true);}});
 window.addEventListener('hashchange',()=>{close();active();});
 window.addEventListener('popstate',()=>{close();active();});
 window.addEventListener('edunexus-refresh-view',()=>{close();active();});
 window.addEventListener('edunexus-verified',()=>{sessionMenu();});
 window.addEventListener('edunexus-catalog',()=>{sessionMenu();});
 window.addEventListener('edunexus-lms',()=>{sessionMenu();});
 window.addEventListener('resize',layout);window.visualViewport?.addEventListener('resize',layout);window.visualViewport?.addEventListener('scroll',layout);
 const observer=new MutationObserver(sync);for(const p of panels)observer.observe(p,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 layout();controls();active();return {toggle,close,active};
})();
