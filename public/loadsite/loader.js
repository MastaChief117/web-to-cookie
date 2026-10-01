'use strict';
const PREFIX='cookiehost_', COUNT='cookiehost_count';
const MAX_CHUNKS=22;
const $=id=>document.getElementById(id);
function cookies(){const m=new Map();for(const p of (document.cookie||'').split(';')){const i=p.indexOf('=');if(i>=0)m.set(p.slice(0,i).trim(),p.slice(i+1).trim())}return m}
function fail(s){$('loaderStatus').textContent='Failed. See error below.';$('spinner').textContent='🧂';$('spinner').classList.add('done');$('err').textContent=s;$('err').className='status error'}
function b64(s){s=s.replace(/-/g,'+').replace(/_/g,'/');s+='='.repeat((4-s.length%4)%4);let b;try{b=atob(s)}catch{throw Error('Invalid Base64\n\nCookieHost data is corrupted.')}return Uint8Array.from(b,c=>c.charCodeAt(0))}
async function gunzip(bytes){if(typeof DecompressionStream==='undefined')throw Error('This browser lacks DecompressionStream (gzip).');const ds=new DecompressionStream('gzip');return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer())}
function external(x){x=x.trim().toLowerCase();return !x||/^(https?:|\/\/|data:|blob:|mailto:|tel:|#)/.test(x)}
function norm(p){const a=[];for(const x of p.split('/')){if(!x||x==='.');else if(x==='..')a.pop();else a.push(x)}return a.join('/')}
function resolve(dir,href){if(external(href))return null;return norm((href[0]=='/'?'':dir+'/')+href.split(/[?#]/)[0])}
function dir(p){const i=p.lastIndexOf('/');return i<0?'':p.slice(0,i)}
function entry(files){return files.find(f=>f.path.toLowerCase()==='index.html')||files.find(f=>/\/index\.html$/i.test(f.path))||files.find(f=>/\.html?$/i.test(f.path))}
function inline(html,base,map){const d=new DOMParser().parseFromString(html,'text/html');let css=0,js=0;
for(const l of [...d.querySelectorAll('link[rel="stylesheet"][href]')]){const r=resolve(base,l.getAttribute('href'));const f=r&&(map.get(r)||map.get(r.toLowerCase()));if(f){const s=d.createElement('style');s.textContent=f.content;l.replaceWith(s);css++}}
for(const s of [...d.querySelectorAll('script[src]')]){const r=resolve(base,s.getAttribute('src'));const f=r&&(map.get(r)||map.get(r.toLowerCase()));if(f){const n=d.createElement('script');for(const a of s.attributes)if(a.name!=='src')n.setAttribute(a.name,a.value);n.textContent=f.content.replace(/<\/script/gi,'<\\/script');s.replaceWith(n);js++}}
return{html:'<!DOCTYPE html>\n'+d.documentElement.outerHTML,css,js}}
async function load(){ $('err').textContent='';$('err').className='status';$('frameWrap').classList.remove('show');const j=cookies(),rawCount=j.get(COUNT),n=Number(rawCount);
if(!Number.isSafeInteger(n)||n<1||n>MAX_CHUNKS){fail('Invalid or oversized CookieHost package.\n\nExpected 1–'+MAX_CHUNKS+' cookie chunks.');return}{fail('No CookieHost website was found in this browser.\n\nGo to /builder and bake a website first.');return}
let s='';for(let i=0;i<n;i++){const v=j.get(PREFIX+String(i).padStart(4,'0'));if(v==null){fail('CookieHost data is incomplete.\nMissing chunk: '+PREFIX+String(i).padStart(4,'0'));return}s+=v}
try{ $('loaderStatus').textContent=`Found ${n} cookie chunk(s). Decoding…`;let bytes=b64(s),pkg;
try{pkg=JSON.parse(new TextDecoder().decode(await gunzip(bytes)))}catch{pkg=JSON.parse(new TextDecoder().decode(bytes))}
if(!pkg||!Array.isArray(pkg.files))throw Error('Invalid CookieHost package.\n\nDecompressed data is not valid JSON.');
const e=entry(pkg.files);if(!e)throw Error('No HTML file found in the CookieHost package.');
const map=new Map(pkg.files.map(f=>[f.path,f]));const r=inline(e.content,dir(e.path),map);
$('loaderStatus').textContent='Website reconstructed from cookies!';$('spinner').textContent='🍪';$('spinner').classList.add('done');
$('meta').innerHTML='';for(const x of [`${pkg.files.length} files`,`${n} cookies`,`CSS inlined: ${r.css}`,`JS inlined: ${r.js}`]){const c=document.createElement('span');c.className='chip';c.textContent=x;$('meta').appendChild(c)}
$('frameLabel').textContent='🌐 '+e.path;$('siteFrame').srcdoc=r.html;$('frameWrap').classList.add('show')
}catch(e){fail(e.message||String(e))}}
$('clearBtn').onclick=()=>{for(const k of cookies().keys())if(k===COUNT||k.startsWith(PREFIX))document.cookie=k+'=; Path=/; Max-Age=0; SameSite=Strict';location.reload()};
$('retryBtn').onclick=load;load();