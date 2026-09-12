// LifeKey automatic category/section article library
(function(){
const el=document.currentScript, category=el&&el.dataset.lifekeyCategory;if(!category)return;
fetch(new URL('articles.json',location.href)).then(r=>r.json()).then(items=>{
const list=items.filter(a=>a.category===category);if(!list.length)return;
const section=document.createElement('section');section.className='lifekey-generated-articles glass';
section.innerHTML='<h2>📝 LifeKey Articles</h2>';
const groups={};list.forEach(a=>(groups[a.subcategory||'General']??=[]).push(a));
Object.entries(groups).forEach(([name,arr])=>{
const h=document.createElement('h3');h.textContent=name;section.appendChild(h);
arr.sort((a,b)=>(Number(a.articleNumber)||0)-(Number(b.articleNumber)||0));
arr.forEach(a=>{const d=document.createElement('article');d.style.cssText='padding:14px;margin:10px 0;border:1px solid #ffffff18;border-radius:12px;background:#0c0814';
d.innerHTML='<strong>#'+String(a.articleNumber||'').padStart(3,'0')+' — '+esc(a.title)+'</strong><p>'+esc(a.description||'')+'</p><a href="'+esc(a.url)+'">Read Article →</a>';section.appendChild(d)})});
document.body.appendChild(section);
}).catch(()=>{});
function esc(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
})();