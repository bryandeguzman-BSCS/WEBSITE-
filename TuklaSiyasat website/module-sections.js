/* Partition published reading without changing or dropping any source nodes. */
(function(root){
 'use strict';
 const order=['layunin','paunang_pagtataya','diskusyon','pinal_na_pagsusulit','aplikasyon','talasalitaan','sanggunian','teachers_toolkit'];
 const textOf=node=>typeof node==='string'?node:(node?.children||[]).map(textOf).join('');
 function headingKey(value){
  const text=value.replace(/\u200e|\u200f/g,'').trim().replace(/^\d+[.)]\s*/,'').replace(/[:.]\s*$/,'').toLowerCase().replace(/[\s’']/g,'');
  if(['layunin','mgalayunin','layuninngaralin','mgalayuninngaralin'].includes(text))return 'layunin';
  if(['paunangpagsusulit','paunangpagtataya','paunangpagsusulit/pagtataya'].includes(text))return 'paunang_pagtataya';
  if(['diskusyon','mganilalamanngaralin','nilalamanngaralin','nilalamanngmodyul','mganilalaman'].includes(text))return 'diskusyon';
  if(['pinalnapagsusulit','pagsusulit','pinalnapagtataya'].includes(text))return 'pinal_na_pagsusulit';
  if(['aplikasyon','mgagawain'].includes(text))return 'aplikasyon';
  if(['talasalitaan','mgatalasalitaan'].includes(text))return 'talasalitaan';
  if(['sanggunian','mgasanggunian','sangguniangginamit','mgasangguniangginamit'].includes(text))return 'sanggunian';
  if(['teacherstoolkit','teacherstoolkit(guro)'].includes(text))return 'teachers_toolkit';
  return null;
 }
 function partition(nodes){
  const sections=Object.fromEntries(order.map(key=>[key,[]]));let current='layunin',discussionStarted=false;
  for(const node of nodes){
   const text=textOf(node).trim(),key=headingKey(text);
   if(key){current=key;if(key==='diskusyon')discussionStarted=true;}
   else if(!discussionStarted&&current==='layunin'&&/^Panuto\s*:/i.test(text))current='paunang_pagtataya';
   sections[current].push(node);
  }
  return sections;
 }
 const isPre=section=>/:pre(?:$|[:/-])/i.test(section.id)||/paunang|pre[- ]?(?:test|assessment)/i.test(section.title);
 function practiceFor(practice,key){return practice.filter(item=>key==='aplikasyon'?item.section.kind==='activity':item.section.kind==='assessment'&&(key==='paunang_pagtataya'?isPre(item.section):key==='pinal_na_pagsusulit'?!isPre(item.section):false));}
 root.TuklaModuleSections={order,textOf,partition,practiceFor};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.TuklaModuleSections;
})(typeof window==='undefined'?globalThis:window);
