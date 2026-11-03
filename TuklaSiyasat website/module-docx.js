/* DOCX -> structured, escaped reader nodes. No document scripts/HTML are executed. */
window.EdunexusDocx=(()=>{
 'use strict';
 const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
 const children=e=>Array.from(e?.children||[]),local=e=>e.localName,attr=(e,n)=>e?.getAttributeNS(W,n)||e?.getAttribute(n)||'';
 const find=(e,n)=>children(e).find(c=>local(c)===n),all=(e,n)=>Array.from(e.getElementsByTagNameNS('*',n));
 const node=(tag,children=[],attrs={})=>({tag,children,...(Object.keys(attrs).length?{attrs}:{})});
 const textOf=n=>typeof n==='string'?n:(n.children||[]).map(textOf).join('');
 const parse=s=>{if(/<!DOCTYPE|<!ENTITY/i.test(s))throw Error('Hindi pinapayagan ang XML entities.');const d=new DOMParser().parseFromString(s,'application/xml');if(d.getElementsByTagName('parsererror').length)throw Error('Hindi mabasa ang DOCX XML.');return d;};
 const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
 const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('');
 function resolve(part,target){const p=part.split('/').slice(0,-1);for(const bit of target.replaceAll('\\','/').split('/')){if(bit==='..'){if(!p.length)throw Error('Hindi wastong DOCX path.');p.pop();}else if(bit&&bit!=='.')p.push(bit);}return p.join('/');}
 async function convert(input,{subject='101',number=1,filename='module.docx',title='',description=''}={}){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);if(bytes.length>10485760)throw Error('Hanggang 10 MB ang module DOCX.');
  if(!/^(101|102)$/.test(subject)||!Number.isInteger(number)||number<1||number>7)throw Error('Piliin ang GE 101/102 at bilang 1–7.');
  const zip=await JSZip.loadAsync(bytes,{checkCRC32:true}),entries=Object.values(zip.files).filter(f=>!f.dir);let expanded=0;
  if(entries.length>2000)throw Error('Napakaraming DOCX entries.');
  for(const f of entries){expanded+=f._data?.uncompressedSize||0;if(/(^|\/)\.\.(\/|$)|vbaProject|\.exe$|\.html?$/i.test(f.name))throw Error('Hindi pinapayagang DOCX entry.');}
  if(expanded>104857600)throw Error('Masyadong malaki ang expanded DOCX.');
  if(!zip.file('word/document.xml')||!zip.file('[Content_Types].xml'))throw Error('Hindi ito wastong DOCX.');
  const warnings=[],assets=[],assetMap=new Map(),styleMap=new Map(),numbering=new Map(),counters=new Map();
  const xml=async p=>zip.file(p)?parse(await zip.file(p).async('string')):null;
  const styles=await xml('word/styles.xml');if(styles)for(const s of all(styles,'style'))styleMap.set(attr(s,'styleId'),s);
  function styleProps(id,seen=new Set()){if(!id||seen.has(id))return [];seen.add(id);const s=styleMap.get(id);return s?[...styleProps(attr(find(s,'basedOn'),'val'),seen),s]:[];}
  const nums=await xml('word/numbering.xml');if(nums){const abstract=new Map(all(nums,'abstractNum').map(a=>[attr(a,'abstractNumId'),a]));for(const n of all(nums,'num')){const a=abstract.get(attr(find(n,'abstractNumId'),'val'));if(a)numbering.set(attr(n,'numId'),{abstract:a,overrides:children(n).filter(c=>local(c)==='lvlOverride')});}}
  function levelDef(def,level){const override=def.overrides.find(c=>Number(attr(c,'ilvl'))===level),lvl=find(override,'lvl')||children(def.abstract).find(l=>local(l)==='lvl'&&Number(attr(l,'ilvl'))===level);return {lvl,start:Number(attr(find(override,'startOverride'),'val')||attr(find(lvl,'start'),'val')||1)};}
  function numberLabel(value,format){if(/Letter$/.test(format)){let s='',n=value;while(n>0){n--;s=String.fromCharCode(97+n%26)+s;n=Math.floor(n/26);}return format==='upperLetter'?s.toUpperCase():s;}if(/Roman$/.test(format)){let n=value,s='';for(const [v,t] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=t;n-=v;}return format==='lowerRoman'?s.toLowerCase():s;}return format==='decimalZero'?String(value).padStart(2,'0'):String(value);}
  let sourceTokens=[],parts=[],sourceTables=0,sourceImages=0,sourceTextboxes=0,sourceParagraphs=0;
  async function partRead(part){
   const d=await xml(part);if(!d)return [];
   const relfile=part.split('/').slice(0,-1).join('/')+'/_rels/'+part.split('/').at(-1)+'.rels',rels=await xml(relfile),relMap=new Map();
   if(rels)for(const r of all(rels,'Relationship'))relMap.set(r.getAttribute('Id'),{target:r.getAttribute('Target'),external:r.getAttribute('TargetMode')==='External'});
   let currentTokens=[];
   async function image(e){const rid=e.getAttributeNS(R,'embed')||e.getAttributeNS(R,'id')||e.getAttribute('r:id'),r=relMap.get(rid);if(!r){warnings.push('Hindi mare-resolve ang isang image relationship sa '+part);return node('span',['[Larawang hindi mare-resolve; tingnan ang orihinal na DOCX.]']);}if(r.external){warnings.push('External image hindi kinopya: '+r.target);return node('span',['[External na larawan: '+r.target+']']);}
    const path=resolve(part,r.target);if(!assetMap.has(path)){const f=zip.file(path);if(!f){warnings.push('Nawawalang larawan: '+path);return node('span',['[Nawawalang larawan: '+path+']']);}const data=await f.async('uint8array');const mime=/\.png$/i.test(path)?'image/png':/\.jpe?g$/i.test(path)?'image/jpeg':null;if(!mime){warnings.push('Hindi suportadong larawan: '+path);return node('span',['[Larawang '+path+' ay nasa orihinal na DOCX.]']);}const id='img-'+assets.length;assetMap.set(path,id);assets.push({id,mime,sha256:await hash(data),base64:base64(data),source:path});}
    sourceImages++;return node('img',[],{asset:assetMap.get(path),alt:'Larawan mula sa '+filename});
   }
   async function inline(e){
    const tag=local(e);if(tag==='AlternateContent'){const c=find(e,'Choice')||find(e,'Fallback');return c?inline(c):[];}
    if(tag==='t'||tag==='delText'){currentTokens.push(e.textContent);return [e.textContent];}
    if(['rPr','pPr','tblPr','tcPr','trPr','sectPr','instrText'].includes(tag))return [];
    if(tag==='tab')return ['\t'];if(tag==='br'||tag==='cr')return [node('br')];
    if(tag==='blip'||tag==='imagedata')return [await image(e)];
    if(tag==='footnoteReference'||tag==='endnoteReference')return [node('sup',['['+attr(e,'id')+']'])];
    if(tag==='txbxContent'){sourceTextboxes++;warnings.push('Text box sa '+part+' ay linear na ipinapakita; orihinal na geometry ay nasa DOCX.');const out=[];for(const c of children(e)){out.push(...await inline(c));out.push(node('br'));}return [node('span',out,{class:'doc-textbox'})];}
    let values=[];for(const c of children(e))values.push(...await inline(c));
    if(tag==='r'){
     const p=find(e,'rPr'),fmt=[...(styleProps(attr(find(p,'rStyle'),'val')).map(s=>find(s,'rPr'))),p].filter(Boolean);
     for(const [name,html] of [['b','strong'],['i','em'],['u','u'],['strike','s']]){let enabled=false;for(const f of fmt){const v=find(f,name);if(v)enabled=!['0','false','none'].includes(attr(v,'val'));}if(enabled&&values.length)values=[node(html,values)];}
     const vert=attr(find(p,'vertAlign'),'val');if(['superscript','subscript'].includes(vert))values=[node(vert==='superscript'?'sup':'sub',values)];
    }
    if(tag==='hyperlink'){const r=relMap.get(e.getAttributeNS(R,'id'));if(r?.external&&/^https?:\/\//i.test(r.target))values=[node('a',values,{href:r.target})];}
    return values;
   }
   async function block(e){
    const tag=local(e);
    if(tag==='p'){
     sourceParagraphs++;const p=find(e,'pPr'),st=attr(find(p,'pStyle'),'val'),style=styleProps(st),props=[...style.map(s=>find(s,'pPr')),p].filter(Boolean);const content=await inline(e);let heading=0;
     for(const pr of props){const h=find(pr,'outlineLvl');if(h)heading=Math.min(6,Number(attr(h,'val'))+1);}
     const txt=content.map(textOf).join('');if(!heading&&txt.trim().length<140&&txt.trim().length>2&&((/heading|title|subtitle/i.test(st))||(/^[^a-zà-öø-ÿ]*[A-ZÁÉÍÓÚÑ]/.test(txt)&&txt===txt.toUpperCase()&&txt.trim().split(/\s+/).length<20)))heading=/title/i.test(st)?1:2;
     const fieldTargets=new Set(all(e,'instrText').map(n=>/HYPERLINK\s+"([^"]+)"/i.exec(n.textContent)?.[1]).filter(t=>/^https?:\/\//i.test(t||'')));
     for(const href of fieldTargets){content.push(node('span',[' ',node('a',[href],{href})],{class:'doc-field-link'}));warnings.push('Ang complex Word hyperlink ay ipinapakita rin bilang buong reference URL.');}
     let num;for(const pr of props)if(find(pr,'numPr'))num=find(pr,'numPr');
     const attrs={};const align=attr(find(p,'jc'),'val');if(['center','right'].includes(align))attrs.class='doc-'+align;
     if(num){const id=attr(find(num,'numId'),'val'),level=Number(attr(find(num,'ilvl'),'val')||0),def=numbering.get(id),definition=def&&levelDef(def,level),lvl=definition?.lvl;if(lvl){const fmt=attr(find(lvl,'numFmt'),'val'),key=id+':'+level,start=definition.start,n=counters.has(key)?counters.get(key)+1:start;counters.set(key,n);for(const k of counters.keys())if(k.startsWith(id+':')&&Number(k.split(':')[1])>level)counters.delete(k);let label=attr(find(lvl,'lvlText'),'val')||'%1.';if(fmt==='bullet')label='•';else label=label.replace(/%([1-9])/g,(_,v)=>{const ref=Number(v)-1,other=levelDef(def,ref);return numberLabel(counters.get(id+':'+ref)||other.start,attr(find(other.lvl,'numFmt'),'val'));});content.unshift(node('span',[label+' '],{class:'doc-list-marker'}));attrs.class='doc-list doc-level-'+Math.min(level,8);}}
     return [node(heading?'h'+heading:'p',content,attrs)];
    }
    if(tag==='tbl'){
     sourceTables++;const rows=[];let active=new Map();
     for(const tr of children(e).filter(x=>local(x)==='tr')){const cells=[];let col=Number(attr(find(find(tr,'trPr'),'gridBefore'),'val')||0);const next=new Map();
      for(const tc of children(tr).filter(x=>local(x)==='tc')){const p=find(tc,'tcPr'),span=Math.max(1,Number(attr(find(p,'gridSpan'),'val')||1)),vm=find(p,'vMerge'),continuation=vm&&attr(vm,'val')!=='restart';const contents=await blocks(tc);
       if(continuation&&active.has(col)){const owner=active.get(col);owner.attrs.rowspan=(owner.attrs.rowspan||1)+1;if(contents.some(n=>textOf(n).trim()))owner.children.push(...contents);for(let i=col;i<col+span;i++)next.set(i,owner);}
       else{const cell=node(find(find(tr,'trPr'),'tblHeader')?'th':'td',contents,{...(span>1?{colspan:span}:{}),...(vm?{rowspan:1}:{})});cells.push(cell);if(vm)for(let i=col;i<col+span;i++)next.set(i,cell);}
       col+=span;
      }active=next;rows.push(node('tr',cells));
     }return [node('table',[node('tbody',rows)])];
    }
    if(tag==='AlternateContent'){const choice=find(e,'Choice')||find(e,'Fallback');return choice?blocks(choice):[];}
    if(['sectPr','pPr','tblPr','tblGrid','tcPr','trPr'].includes(tag))return [];
    return blocks(e);
   }
   async function blocks(parent){let values=[];for(const c of children(parent))values.push(...await block(c));return values;}
   const root=Array.from(d.getElementsByTagNameNS(W,'body'))[0]||d.documentElement;
   const result=await blocks(root);parts.push({part,textTokens:currentTokens.length,textCharacters:currentTokens.join('').length});sourceTokens.push(...currentTokens);return result;
  }
  const document=await partRead('word/document.xml');
  for(const part of entries.map(f=>f.name).filter(n=>/^word\/(?:header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(n)).sort()){
   const d=await xml(part),text=all(d,'t').map(t=>t.textContent).join('');if(!text.trim())continue;
   const supplement=await partRead(part);if(supplement.length){warnings.push('Ang '+part+' ay pinagsama sa hulihan, hindi inuulit sa bawat pahina.');document.push(node('section',[node('h2',['Mula sa '+part.replace('word/','')]),...supplement],{class:'doc-supplement'}));}
  }
  const flatten=n=>typeof n==='string'?n:(n.children||[]).map(flatten).join('');const allText=document.map(flatten).join('');
  const missing=sourceTokens.filter(t=>t&&!allText.includes(t));if(missing.length)throw Error('May text na hindi naisama sa conversion.');
  const opening=document.filter(n=>/^h[1-6]$/.test(n.tag)||n.tag==='p').map(textOf).map(t=>t.trim()).filter(Boolean).slice(0,20),labelAt=opening.findIndex(t=>/^PAMAGAT NG ARALIN$/i.test(t)),named=opening.find(t=>/^Pamagat ng Aralin:\s*\S/i.test(t));
  const sourceTitle=title||(named?named.replace(/^Pamagat ng Aralin:\s*/i,''):labelAt>=0?opening[labelAt+1]:opening.find(t=>!/^\s*(?:(?:ARALIN|MODYUL)\s*\d*|MODYUL SA PAGKATUTO)\s*$/i.test(t)))||filename.replace(/\.docx$/i,'');
  const audit={parts,paragraphs:sourceParagraphs,tables:sourceTables,imageReferences:sourceImages,textboxes:sourceTextboxes,textCharacters:sourceTokens.join('').length,textSHA256:await hash(new TextEncoder().encode(sourceTokens.join(''))),warnings:[...new Set(warnings)],unsupported:[]};
  for(const f of entries)if(/word\/(?:embeddings|charts|diagrams)\//.test(f.name))audit.unsupported.push(f.name);
  if(audit.unsupported.length)audit.warnings.push('May embedded objects/chart/diagram resources; tingnan ang orihinal na DOCX para sa buong layout.');
  const bundle={schema:1,subject,number,title:sourceTitle.slice(0,500),description:description.slice(0,1000),filename,source_hash:await hash(bytes),original:base64(bytes),document,assets,audit};
  bundle.extraction=window.EdunexusAssessmentParser.extract(document,'ge'+subject+'-doc-m'+number,bundle.source_hash);
  audit.warnings.push(...bundle.extraction.warnings,...bundle.extraction.sections.flatMap(s=>s.warnings));return bundle;
 }
 return {convert,textOf};
})();
