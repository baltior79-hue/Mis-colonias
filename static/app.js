if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let photo=null, current=null;
const BRANDS=["Dior","Chanel","Zara","Mercadona","Deliplus","Yves Saint Laurent","YSL","Giorgio Armani","Armani","Paco Rabanne","Rabanne","Jean Paul Gaultier","Carolina Herrera","Hugo Boss","Boss","Versace","Dolce & Gabbana","Dolce Gabbana","Gucci","Prada","Tom Ford","Creed","Guerlain","Lancôme","Lancome","Givenchy","Hermès","Hermes","Calvin Klein","Azzaro","Valentino","Burberry","Montblanc","Mont Blanc","Bvlgari","Bulgari","Loewe","Adolfo Dominguez","Antonio Banderas","Banderas","Lattafa","Armaf","Afnan","Maison Francis Kurkdjian","Kenzo","Issey Miyake","Davidoff","Lacoste","Diesel","Viktor&Rolf","Viktor & Rolf","Mugler","Narciso Rodriguez","Jo Malone","Byredo","Le Labo","Parfums de Marly","Xerjoff","Nishane","Initio","Ralph Lauren","Tommy Hilfiger","Massimo Dutti","Primark","Rochas","Cartier","Chloé","Chloe","Marc Jacobs","Moschino","Nina Ricci","Jimmy Choo","Coach","Ferrari","Police","Myrurgia","Agua Brava","Puig","Halloween","Tous","Equivalenza","Al Haramain","Rasasi","Maison Alhambra","French Avenue"];
const ES={'fresh spicy':'especiado fresco','warm spicy':'especiado cálido','citrus':'cítrico','woody':'amaderado','amber':'ámbar','aromatic':'aromático','musky':'almizclado','lavender':'lavanda','herbal':'herbal','floral':'floral','white floral':'floral blanco','sweet':'dulce','vanilla':'vainilla','fruity':'afrutado','powdery':'atalcado','leather':'cuero','leathery':'cuero','fresh':'fresco','spicy':'especiado','synthetic':'sintético','earthy':'terroso','patchouli':'pachulí','green':'verde','marine':'marino','aquatic':'acuático','ozonic':'ozónico','oud':'oud','smoky':'ahumado','tobacco':'tabaco','balsamic':'balsámico','rose':'rosa','iris':'iris','coffee':'café','tropical':'tropical','caramel':'caramelo','honey':'miel','oriental':'oriental','gourmand':'gourmand','chypre':'chipre','resinous':'resinoso','animalic':'animal','cinnamon':'canela','soft spicy':'especiado suave','violet':'violeta','yellow floral':'floral amarillo','salty':'salado','mossy':'musgoso','creamy':'cremoso','coconut':'coco','almond':'almendra','cherry':'cereza','rum':'ron','whiskey':'whisky','metallic':'metálico','mineral':'mineral','soapy':'jabonoso','clean':'limpio','cacao':'cacao','chocolate':'chocolate','nutty':'frutos secos','tuberose':'nardo','beeswax':'cera de abeja','bitter':'amargo','sour':'ácido','aldehydic':'aldehídico','camphor':'alcanforado'};
const tr=s=>{const t=ES[(s||'').toLowerCase()];return t?t:s};
const FAM={'Aromatic Fougere':'Fougère aromático','Woody':'Amaderado','Woody Spicy':'Amaderado especiado','Woody Aromatic':'Amaderado aromático','Amber':'Ámbar (oriental)','Amber Spicy':'Ámbar especiado','Amber Vanilla':'Ámbar vainilla','Amber Floral':'Ámbar floral','Amber Woody':'Ámbar amaderado','Floral':'Floral','Floral Fruity':'Floral afrutado','Floral Fruity Gourmand':'Floral afrutado gourmand','Citrus':'Cítrico','Citrus Aromatic':'Cítrico aromático','Chypre':'Chipre','Chypre Floral':'Chipre floral','Chypre Fruity':'Chipre afrutado','Leather':'Cuero','Aromatic Aquatic':'Aromático acuático','Aromatic Spicy':'Aromático especiado','Aromatic Green':'Aromático verde','Floral Woody Musk':'Floral amaderado almizclado','Woody Floral Musk':'Amaderado floral almizclado','Aromatic':'Aromático','Green':'Verde'};

// --- pestañas
$('#tNew').onclick=()=>{$('#tNew').classList.add('on');$('#tList').classList.remove('on');$('#vNew').classList.remove('hide');$('#vList').classList.add('hide')};
$('#tList').onclick=()=>{$('#tList').classList.add('on');$('#tNew').classList.remove('on');$('#vList').classList.remove('hide');$('#vNew').classList.add('hide');renderList()};

// --- foto + OCR
function resize(file){return new Promise(r=>{const img=new Image();img.onload=()=>{const m=1280,s=Math.min(1,m/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);r(c.toDataURL('image/jpeg',0.82))};img.src=URL.createObjectURL(file)})}
async function onFile(e){const f=e.target.files[0];if(!f)return;photo=await resize(f);$('#preview').src=photo;$('#preview').classList.remove('hide');$('#ficha').innerHTML='';$('#results').innerHTML='';
  $('#ocrStatus').textContent='Leyendo la etiqueta… (la primera vez tarda un poco)';
  try{const {data}=await Tesseract.recognize(photo,'eng');const guess=guessName(data.text);
    $('#q').value=guess;$('#ocrStatus').textContent=guess?'He leído: «'+guess+'». Si no es correcto, corrígelo y pulsa Buscar.':'No he podido leer la etiqueta. Escribe la marca y el nombre.';
    if(guess) search();
  }catch(err){$('#ocrStatus').textContent='No se pudo leer la etiqueta ('+err.message+'). Escribe el nombre a mano.'}}
$('#cam').onchange=onFile;$('#gal').onchange=onFile;
function guessName(text){
  const lines=text.split('\n').map(l=>l.replace(/[^A-Za-zÀ-ÿ0-9&' .-]/g,' ').replace(/\s+/g,' ').trim()).filter(l=>l.length>=3&&/[A-Za-z]{3}/.test(l));
  const low=text.toLowerCase();let brand=BRANDS.find(b=>new RegExp('\\b'+b.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(low))||'';
  const stop=/^(eau de|parfum|toilette|cologne|vaporisateur|spray|natural|ml|fl\.? ?oz|paris|made in|pour homme|pour femme|edt|edp|for men|for women)/i;
  const cand=lines.filter(l=>!stop.test(l)&&l.toLowerCase()!==brand.toLowerCase()&&!/\d{2,}\s*ml/i.test(l)).map(l=>l.replace(new RegExp(brand,'i'),'').trim()).filter(l=>l.length>=3);
  const name=cand.sort((a,b)=>b.replace(/[^A-Za-z]/g,'').length-a.replace(/[^A-Za-z]/g,'').length)[0]||'';
  return (brand+' '+(brand?name.split(' ').slice(0,4).join(' '):name)).trim();
}

// --- búsqueda
$('#bSearch').onclick=search;$('#q').onkeydown=e=>{if(e.key==='Enter')search()};
async function search(){const q=$('#q').value.trim();if(!q)return;$('#results').innerHTML='<p class="muted">Buscando en Parfumo…</p>';$('#ficha').innerHTML='';
  try{const r=await fetch('/api/search?q='+encodeURIComponent(q));const d=await r.json();if(d.error)throw new Error(d.error);
    if(d.used&&d.used!==q)$('#ocrStatus').textContent+=' (Sin resultados exactos; he buscado «'+d.used+'».)';if(!d.results.length){$('#results').innerHTML='<p class="err">No se ha encontrado ninguna colonia con ese nombre. Prueba con menos palabras (por ejemplo solo el nombre).</p>';return}
    $('#results').innerHTML='<p class="muted">Elige la tuya:</p>'+d.results.map((x,i)=>`<div class="res" data-i="${i}"><img src="${esc(x.img)}" loading="lazy"><div><b>${esc(x.name)}</b><br><span class="muted">${esc(x.brand)} ${x.year?'· '+esc(x.year):''}</span></div></div>`).join('');
    document.querySelectorAll('.res').forEach(el=>el.onclick=()=>loadFicha(d.results[+el.dataset.i]));
  }catch(e){$('#results').innerHTML='<p class="err">Error al buscar: '+esc(e.message)+'</p>'}}
async function loadFicha(x){$('#results').innerHTML='';$('#ficha').innerHTML='<p class="muted">Leyendo Fragrantica y Parfumo…</p>';
  try{const r=await fetch(`/api/perfume?url=${encodeURIComponent(x.url)}&brand=${encodeURIComponent(x.brand)}&name=${encodeURIComponent(x.name)}`);const d=await r.json();
    current={id:Date.now(),brand:x.brand,name:x.name,year:x.year,img:x.img,photo:photo,data:d,saved:new Date().toISOString()};
    $('#ficha').innerHTML=fichaHTML(current,false);$('#bSave').onclick=save;$('#ficha').scrollIntoView({behavior:'smooth'});
  }catch(e){$('#ficha').innerHTML='<p class="err">Error: '+esc(e.message)+'</p>'}}

function pyr(p){if(!p||!Object.keys(p).length)return '<p class="muted">Sin datos de pirámide.</p>';
  const L={salida:'Notas de salida',corazon:'Notas de corazón',fondo:'Notas de fondo',lineal:'Notas (sin pirámide: el perfume es lineal)'};
  return ['salida','corazon','fondo','lineal'].filter(k=>p[k]&&p[k].length).map(k=>`<div><b>${L[k]}</b><br>${p[k].map(n=>`<span class="chip">${esc(n)}</span>`).join('')}</div>`).join('')}
function simList(a,empty){return a&&a.length?a.map(s=>`<div class="res"><img src="${esc(s.img)}" loading="lazy"><div><b>${esc(s.name)}</b><br><span class="muted">${esc(s.brand)}${s.pct?' · parecido '+Math.round(s.pct)+'%':''}</span></div></div>`).join(''):`<p class="muted">${empty}</p>`}
function fichaHTML(c,saved){const d=c.data,f=d.fragrantica,p=d.parfumo;
  let h=`<div class="card">${c.photo?`<img src="${c.photo}" style="width:100%;border-radius:10px">`:''}<h2 style="margin:8px 0 2px">${esc(c.name)}</h2><div class="muted">${esc(c.brand)} ${c.year?'· '+esc(c.year):''}</div>`;
  h+=`<h3>Familia olfativa</h3>`+(f&&f.family?`<span class="chip">${esc(FAM[f.family]||f.family)}</span> <span class="muted">(Fragrantica: ${esc(f.family)})</span>`:'<p class="muted">Fragrantica no da familia para esta colonia o no se ha encontrado.</p>');
  h+=`<h3>Acordes principales</h3>`;
  if(f&&f.accords&&f.accords.length) h+=f.accords.map(a=>`<div class="bar" style="width:${Math.max(a.w||30,30)}%">${esc(tr(a.n))}</div>`).join('')+'<div class="muted">Fuente: Fragrantica (la barra indica la intensidad)</div>';
  else if(p&&p.accords&&p.accords.length) h+=p.accords.map(a=>`<span class="chip">${esc(tr(a))}</span>`).join('')+'<div class="muted">Fuente: Parfumo</div>';
  else h+='<p class="muted">No encontrado.</p>';
  h+=`<h3>Pirámide olfativa</h3>`+(f&&f.pyramid&&Object.keys(f.pyramid).length?pyr(f.pyramid)+'<div class="muted">Fuente: Fragrantica</div>':(p?pyr(p.pyramid)+'<div class="muted">Fuente: Parfumo</div>':'<p class="muted">No encontrado.</p>'));
  if(f&&p&&f.pyramid&&p.pyramid&&Object.keys(f.pyramid).length&&p.pyramid.lineal) h+=`<details><summary class="muted">Notas según Parfumo</summary>${pyr(p.pyramid)}</details>`;
  h+=`<h3>${d.self_cheap?'Se parece a (posibles originales)':'Se parece a'}</h3>`+simList(d.similar?.slice(0,10),'No se han encontrado perfumes parecidos.');
  h+=`<h3>${d.self_cheap?'Otras alternativas baratas parecidas':'Alternativas baratas / clones (Zara, Armaf, Lattafa…)'}</h3>`+simList(d.cheap?.slice(0,12),'No se han encontrado alternativas baratas en la lista de parecidos de Parfumo.');
  h+='<div class="muted">Los parecidos salen de los votos de la comunidad de Parfumo («Smells similar»).</div>';
  const errs=[d.fragrantica_error&&'Fragrantica: '+d.fragrantica_error,d.parfumo_error&&'Parfumo: '+d.parfumo_error,p&&p.sim_error&&'Parecidos: '+p.sim_error].filter(Boolean);
  if(errs.length) h+=`<p class="err">${errs.map(esc).join('<br>')}</p>`;
  h+=`<h3>Fuentes</h3>${f?`<a href="${esc(f.url)}" target="_blank">Fragrantica</a> · `:''}${p?`<a href="${esc(p.url)}" target="_blank">Parfumo</a>`:''}`;
  h+=saved?`<button class="btn sec" id="bBack">← Volver</button><button class="btn del" id="bDel">🗑️ Borrar de Mis colonias</button>`:`<button class="btn" id="bSave">💾 Guardar en Mis colonias</button>`;
  return h+'</div>'}

// --- IndexedDB
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('colonias',1);r.onupgradeneeded=()=>r.result.createObjectStore('c',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function tx(mode,fn){const db=await idb();return new Promise((res,rej)=>{const t=db.transaction('c',mode);const s=t.objectStore('c');const r=fn(s);t.oncomplete=()=>res(r&&r.result);t.onerror=()=>rej(t.error)})}
async function save(){await tx('readwrite',s=>s.put(current));$('#bSave').textContent='✅ Guardada';$('#bSave').disabled=true}
async function renderList(){const all=(await tx('readonly',s=>s.getAll()))||[];all.sort((a,b)=>b.id-a.id);
  $('#list').innerHTML=all.length?all.map(c=>`<div class="card res" data-id="${c.id}"><img class="thumb" src="${c.photo||esc(c.img)}"><div><b>${esc(c.name)}</b><br><span class="muted">${esc(c.brand)} · ${esc((c.data.fragrantica&&(FAM[c.data.fragrantica.family]||c.data.fragrantica.family))||'')}</span></div></div>`).join(''):'<p class="muted">Aún no has guardado ninguna colonia.</p>';
  document.querySelectorAll('#list .res').forEach(el=>el.onclick=()=>{const c=all.find(x=>x.id==el.dataset.id);$('#list').innerHTML=fichaHTML(c,true);$('#bBack').onclick=renderList;$('#bDel').onclick=async()=>{if(confirm('¿Borrar «'+c.name+'»?')){await tx('readwrite',s=>s.delete(c.id));renderList()}}})}
