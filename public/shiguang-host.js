import {createShiguangSkin} from '/shiguang-runtime.js'

// Original skin geometry/art; this adapter only handles host DOM and lifetime.
const documents=new WeakMap(), bubbles=new WeakMap()
const assets='/shiguang/assets/'
function markup(doc,html){const t=doc.createElement('template');t.innerHTML=html;return t.content.firstElementChild}
function install(doc){
 if(documents.has(doc))return documents.get(doc)
 const win=doc.defaultView,K=createShiguangSkin(win).init({particles:false,assets:{sticker:assets+'shiguang-sticker.webp',figure:assets+'shiguang-figure.webp',sun:assets+'sg-sunburst.svg',wax:assets+'sg-wax-seal.svg',reply:assets+'reply.webp'}})
 for(const href of ['/shiguang/css/shiguang-skin.css','/shiguang-host.css'])if(!doc.querySelector(`link[href="${href}"]`)){const link=doc.createElement('link');link.rel='stylesheet';link.href=href;doc.head.append(link)}
 const live=new Map(),life=new win.AbortController()
 const update=(el,inside)=>{
  if(!el.isConnected||el.ownerDocument!==doc)return
  const row=el.closest('.cm-row'),state=bubbles.get(el)
  const active=inside&&!doc.hidden&&doc.documentElement.dataset.pageHidden!=='true'&&doc.documentElement.dataset.bubbleMotion!=='pause'&&(!row||row.dataset.bubbleLive==='true')
  el.classList.toggle('sg-paused',!active)
  const image=el.querySelector('.sg-reply__anim'),src=assets+(active?'reply.webp':'reply-still.png')
  if(image&&image.getAttribute('src')!==src)image.setAttribute('src',src)
  if(!active&&state){K.showFull(state.bubble);state.bubble.style.setProperty('--sg-rx','0deg');state.bubble.style.setProperty('--sg-ry','0deg')}
  if(active&&el.dataset.sgNew==='1'&&state){delete el.dataset.sgNew;if(state.plain)K.enhance(el,{level:el.dataset.sgLevel,animate:true})}
 }
 const sync=()=>{
  for(const [el,inside] of live)update(el,inside)
  const defs=doc.getElementById('sg-defs'),moving=[...live.keys()].some(el=>el.classList.contains('sg-ge6')&&!el.classList.contains('sg-paused'))
  if(moving)defs?.unpauseAnimations?.();else defs?.pauseAnimations?.()
  if(doc.hidden||doc.documentElement.dataset.bubbleMotion==='pause')K.cancelCeremony()
 }
 const io=new win.IntersectionObserver(entries=>{for(const e of entries){live.set(e.target,e.isIntersecting);update(e.target,e.isIntersecting)}sync()},{threshold:0})
 const visit=(root,fn)=>{if(root.nodeType!==1)return;if(root.matches('.sg-skin'))fn(root);root.querySelectorAll('.sg-skin').forEach(fn)}
 const add=el=>{if(live.has(el))return;live.set(el,false);io.observe(el);update(el,false)}
 const remove=el=>{if(el.isConnected&&el.ownerDocument===doc)return;io.unobserve(el);live.delete(el);K.destroy(el)}
 const observer=new win.MutationObserver(records=>{for(const r of records){r.removedNodes.forEach(n=>visit(n,remove));r.addedNodes.forEach(n=>visit(n,add))}})
 observer.observe(doc.body,{childList:true,subtree:true})
 const prefs=new win.MutationObserver(sync);prefs.observe(doc.documentElement,{attributes:true,attributeFilter:['data-bubble-motion','data-page-hidden']})
 doc.addEventListener('visibilitychange',sync,{signal:life.signal});doc.addEventListener('bubblevisibilitychange',sync,{signal:life.signal})
 const dispose=()=>{life.abort();observer.disconnect();prefs.disconnect();io.disconnect();for(const el of live.keys())K.destroy(el);live.clear();K.cancelCeremony();documents.delete(doc)}
 win.addEventListener('pagehide',event=>{if(!event.persisted){dispose();return}for(const [el] of live)update(el,false);K.cancelCeremony()},{signal:life.signal})
 win.addEventListener('pageshow',sync,{signal:life.signal})
 const untrack=el=>{io.unobserve(el);live.delete(el);K.destroy(el)}
 const api={K,sync,dispose,track:add,untrack};documents.set(doc,api);doc.querySelectorAll('.sg-skin').forEach(add)
 return api
}
export function initializeShiguang(doc=document){return install(doc)}
function identity(doc,level,kind){
 const {K}=install(doc),el=doc.createElement('span')
 el.className='sg-skin sg-identity sg-'+kind;el.title='拾光司书 · Lv'+level
 el.append(markup(doc,kind==='nameplate'?K.html.badge(level):K.html.sticker()))
 K.applyLevel(el,level);return el
}
export const shiguangNameplate=(doc,level)=>identity(doc,level,'nameplate')
export const shiguangSticker=(doc,level)=>identity(doc,level,'portrait')

export function syncShiguangBubble(el){
 const existing=bubbles.get(el),enabled=el.classList.contains('rt-bubble')&&el.classList.contains('rt-claude')
 if(!enabled){
  if(existing){install(el.ownerDocument).untrack(el);el.replaceChildren(...existing.content);el.classList.remove('sg-skin','sg-host','sg-paused','sg-enter',...Array.from({length:5},(_,i)=>'sg-ge'+(i+2)));bubbles.delete(el)}
  return false
 }
 const {K}=install(el.ownerDocument),level=Number(el.dataset.sgLevel)||1
 if(existing){K.applyLevel(el,level);return true}
 const content=[...el.childNodes].filter(n=>!n.classList?.contains('rt-detail'))
 // Only inert text wrappers may be replaced by the source typewriter. Links,
 // emoji images and other rich nodes retain identity/listeners and render once.
 const inert=n=>n.nodeType===3||(n.nodeType===1&&n.tagName==='SPAN'&&!n.classList.contains('edited')&&[...n.attributes].every(a=>a.name==='class')&&[...n.childNodes].every(inert))
 const plain=content.every(inert),text=content.map(n=>n.textContent).join(''),wrap=markup(el.ownerDocument,K.html.bubble(plain?text:''))
 // A gradient clipped to the glyph turns native color emoji monochrome.
 // Keep that treatment for ordinary text, but let emoji render normally.
 el.classList.toggle('sg-has-unicode-emoji',plain&&/[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(text))
 const bubble=wrap.querySelector('.sg-bubble')
 if(!plain){const p=bubble.querySelector('.sg-text'),rich=el.ownerDocument.createElement('div');rich.className='sg-rich';rich.append(...content);p.replaceWith(rich)}
 el.replaceChildren(wrap);el.classList.add('sg-host');bubbles.set(el,{content,plain,bubble})
 K.enhance(el,{level,animate:false});if(el.isConnected)install(el.ownerDocument).track(el);return true
}
export function animateShiguangMessage(root){root.querySelectorAll('.sg-host').forEach(el=>{el.dataset.sgNew='1'});documents.get(root.ownerDocument)?.sync()}

export async function shiguangCeremony({document:doc=document,container=doc.body,from=5199,signal}={}){
 const {K}=install(doc)
 if(signal?.aborted||doc.hidden||doc.documentElement.dataset.bubbleMotion==='pause'||!container.isConnected)return
 const life=new doc.defaultView.AbortController(),cancel=()=>life.abort()
 signal?.addEventListener('abort',cancel,{once:true})
 const observer=new doc.defaultView.MutationObserver(()=>{if(!container.isConnected)cancel()})
 observer.observe(doc.body,{childList:true,subtree:true})
 try{return await K.ceremony({container,from,signal:life.signal})}
 finally{observer.disconnect();signal?.removeEventListener('abort',cancel)}
}
