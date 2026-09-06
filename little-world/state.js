const KEY='liqian-3d-home-v5';
const DICTIONARIES=['cat','furniture','doors','taps','settings','smart','garden','terrace'];
const ARRAYS=['notes','papers','musicFavorites'];
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const localDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const defaults={version:5,updatedAt:0,notes:[{id:'n-observe',text:'观察\n\n今天注意到了什么？',color:'cream',x:20,y:20},{id:'n-make',text:'尝试\n\n把一个小问题做成原型。',color:'sage',x:260,y:35},{id:'n-reflect',text:'复盘\n\n哪些地方让人更自在？',color:'rose',x:20,y:260}],papers:[],libraryInitialized:false,musicFavorites:[{id:'flower-dance',title:'Flower Dance · DJ Okawari',url:'https://open.spotify.com/track/6RaJbbhKDOuBGQhbZCubCW'}],cat:{name:'小橘',adopted:localDay(),fedDays:[],pets:0,following:true,muted:false},smart:{curtainsOpen:true,lightsOn:true,vacuumAuto:true},garden:{},terrace:{},furniture:{},doors:{},taps:{},settings:{night:false,reducedMotion:false,deskLight:true,moodIndex:0}};
function defaultStorage(){try{return globalThis.localStorage;}catch{return null;}}
function fallbackTransport({visitor,pageURL,fetchImpl}){
 const page=new URL(pageURL||'https://static.invalid/');
 let enabled=['localhost','127.0.0.1','[::1]'].includes(page.hostname)&&['http:','https:'].includes(page.protocol)&&!!visitor;
 async function request(method,value){
  const r=await fetchImpl(new URL('./api/state',page).href,{method,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(5000),...(value===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(value)})});
  if(!r.ok)throw Error('个人记录暂时没有连上。');return r.json();
 }
 return {get enabled(){return enabled;},get isLocalServer(){return enabled;},async read(){if(!enabled)return null;try{return await request('GET');}catch(e){enabled=false;throw e;}},async write(value){if(!enabled)return false;try{await request('POST',value);return true;}catch(e){enabled=false;throw e;}}};
}
export async function createStore(onChange,onStatus,{visitor,communityClient,storage=defaultStorage(),fetchImpl=globalThis.fetch?.bind(globalThis),pageURL=globalThis.location?.href,now=()=>new Date()}={}){
 const storageKey=visitor?.storageKey?'little-world-'+visitor.storageKey:'little-world-browser-state-v7';
 const transport=communityClient?.stateTransport||fallbackTransport({visitor,pageURL,fetchImpl});
 // Only the local backend's confirmed owner can inherit pre-identity notes.
 const allowLegacy=visitor?.isOwner===true&&transport.isLocalServer;
 let state=structuredClone(defaults),timer=null,browserSaved=false,disposed=false;
 state.cat.adopted=localDay(now());
 function merge(candidate){
  if(!isObject(candidate))return;
  for(const k of ARRAYS)if(Array.isArray(candidate[k]))state[k]=candidate[k].filter(isObject).slice(0,200);
  for(const k of DICTIONARIES)if(isObject(candidate[k]))state[k]={...state[k],...candidate[k]};
  if(candidate.libraryInitialized===true||Array.isArray(candidate.papers))state.libraryInitialized=true;
  if(Number.isFinite(candidate.updatedAt))state.updatedAt=candidate.updatedAt;
 }
 try{merge(JSON.parse((storage?.getItem(storageKey)||(allowLegacy?storage?.getItem(KEY):null))||'null'));}catch{}
 if(transport.enabled){try{const disk=await transport.read();if(isObject(disk)&&(Number(disk.updatedAt)||0)>=state.updatedAt)merge(disk);}catch{}}
 if(!state.libraryInitialized){try{const r=await fetchImpl(new URL('./books/catalog.json',pageURL||globalThis.document?.baseURI||'https://static.invalid/').href);if(r.ok){const catalog=await r.json();if(Array.isArray(catalog)){state.papers=catalog.filter(isObject);state.libraryInitialized=true;}}}catch{}}
 function browserStatus(){return browserSaved?'只保存在这台浏览器，可导出备份':'当前记录仅在此页面，请导出备份';}
 async function writeServer(){
  if(disposed||!transport.enabled){onStatus?.(browserStatus());return false;}
  try{const saved=await transport.write(state);onStatus?.(saved?(transport.isLocalServer?'已保存在本机':'已保存到个人档案'):browserStatus());return saved;}
  catch{onStatus?.(browserStatus());return false;}
 }
 function save({immediate=false}={}){
  if(disposed)return Promise.resolve(false);
  state.updatedAt=now().getTime();browserSaved=false;
  try{if(!storage)throw Error();storage.setItem(storageKey,JSON.stringify(state));browserSaved=true;}catch{}
  clearTimeout(timer);onStatus?.(browserStatus());
  if(!transport.enabled)return Promise.resolve(browserSaved);
  if(immediate)return writeServer();
  timer=setTimeout(writeServer,350);return Promise.resolve(browserSaved);
 }
 const store={
  get:()=>state,
  set(partial){if(!isObject(partial))return;for(const [k,v] of Object.entries(partial)){if(DICTIONARIES.includes(k)){if(isObject(v))state[k]={...state[k],...v};}else if(ARRAYS.includes(k)){if(Array.isArray(v))state[k]=v.filter(isObject).slice(0,200);}else if(k==='libraryInitialized')state[k]=v===true;}save();onChange?.(state);},
  import(candidate){if(!isObject(candidate)||candidate.version!==5||!Array.isArray(candidate.notes))throw Error('请选择3D家导出的备份文件');merge(candidate);save();onChange?.(state);},
  export:()=>JSON.stringify(state,null,2),flush:()=>save({immediate:true}),
  getStatus:()=>({browserSaved,serverEnabled:transport.enabled,storageKey}),
  dispose(){disposed=true;clearTimeout(timer);}
 };
 save();return store;
}
