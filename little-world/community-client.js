/** Community transport: local Python API, configured HTTPS API, or honest browser-only records. */
const BROWSER_KEY='little-world-browser-community-v1';
const DEVICE_KEY='little-world-device-v1';
const OLD_GUEST_KEY='little-world-local-guest';
const ADJECTIVES=['晒太阳的','软乎乎的','爱发呆的','慢慢走的','捧着花的','带星星的','会做梦的','听海的','暖烘烘的','刚睡醒的'];
const ANIMALS=['小海獭','小兔子','小橘子','小团子','小熊猫','小松鼠','小云朵','小布丁','小狐狸','小奶猫'];
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const loopback=hostname=>['localhost','127.0.0.1','[::1]'].includes(hostname.toLowerCase());
const id=()=>globalThis.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dayAt=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Sydney',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
function defaultStorage(){try{return globalThis.localStorage;}catch{return null;}}
function readJSON(storage,key){try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}}
function visitorValid(v){return isObject(v)&&typeof v.storageKey==='string'&&/^[a-zA-Z0-9_-]{8,128}$/.test(v.storageKey)&&typeof v.name==='string'&&Number.isFinite(v.avatar);}
function historyDays(day){const end=new Date(day+'T12:00:00Z');return Array.from({length:7},(_,i)=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()-6+i);return d.toISOString().slice(0,10);});}
function message(kind,text){
 if(!['message','flower','wave'].includes(kind))throw Error('这张明信片暂时不能寄出。');
 if(typeof text!=='string')throw Error('留言请使用纯文本。');
 text=text.replace(/[\u0000-\u0009\u000b-\u001f]/g,'').trim();
 if(kind==='message'&&([...text].length<1||[...text].length>160))throw Error('写下 1～160 个字就好。');
 if(kind==='flower')return '留下一朵小花，愿你今天也有好心情。';
 if(kind==='wave')return '来坐了一会儿，向你挥挥手。';
 return text;
}
export function resolveCommunityConfig({apiBase,pageURL=globalThis.location?.href||'https://static.invalid/'}={}){
 const page=new URL(pageURL);
 if(apiBase!=null&&apiBase!==''){
  const base=new URL(String(apiBase),page);
  if(base.username||base.password||base.search||base.hash||!(base.protocol==='https:'||(base.protocol==='http:'&&loopback(base.hostname)&&base.origin===page.origin)))throw Error('社区 API 需要 HTTPS 地址，且不能包含账号、密码或查询参数。');
  if(!base.pathname.endsWith('/'))base.pathname+='/';
  return {apiBase:base.href,isLocalServer:loopback(base.hostname)&&base.origin===page.origin,configured:true};
 }
 if(['http:','https:'].includes(page.protocol)&&loopback(page.hostname))return {apiBase:new URL('./api/',page).href,isLocalServer:true,configured:false};
 return {apiBase:null,isLocalServer:false,configured:false};
}

export async function createCommunityClient({apiBase,pageURL=globalThis.location?.href,storage=defaultStorage(),fetchImpl=globalThis.fetch?.bind(globalThis),now=()=>new Date()}={}){
 const config=resolveCommunityConfig({apiBase,pageURL});
 let mode='browser',visitor=null,community=null,startupError=null,stateEnabled=false,disposed=false;
 let memory=null,persisted=true;
 const previous=readJSON(storage,BROWSER_KEY);
 let device=visitorValid(previous?.visitor)?previous.visitor.storageKey:null;
 try{device=device||storage?.getItem(DEVICE_KEY);}catch{}
 const legacyDevice=readJSON(storage,OLD_GUEST_KEY);
 if(!device&&visitorValid(legacyDevice))device=legacyDevice.storageKey;
 if(!device||!/^[a-zA-Z0-9_-]{8,128}$/.test(device))device=id();
 try{storage?.setItem(DEVICE_KEY,device);}catch{}
 async function request(name,{method='GET',body}={}){
  if(!config.apiBase||!fetchImpl)throw Error('当前没有连接共享社区服务。');
  const response=await fetchImpl(new URL(name,config.apiBase).href,{method,credentials:config.isLocalServer?'include':'omit',cache:'no-store',signal:AbortSignal.timeout(config.isLocalServer?5000:20000),headers:{...(!config.isLocalServer?{'X-Little-World-Device':device}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let value=null;try{value=await response.json();}catch{throw Error('社区服务返回了无法识别的内容。');}
  if(!response.ok)throw Error(value?.error||'社区服务暂时没有连上，请稍后再试。');
  return value;
 }
 function sharedSummary(value){
  if(!isObject(value)||!Number.isFinite(value.today)||!Number.isFinite(value.total)||!Array.isArray(value.history)||!Array.isArray(value.postcards))throw Error('社区记录格式不正确。');
  return {...value,scope:config.isLocalServer?'same-server':'site',timezone:'Australia/Sydney'};
 }
 let connecting=null;
 async function connect(){
  if(connecting)return connecting;
  connecting=(async()=>{
   const result=await request('visitor');
   if(!visitorValid(result?.visitor))throw Error('匿名身份没有正确载入。');
   community=sharedSummary(result.community);visitor={...result.visitor,isOwner:config.isLocalServer&&result.visitor.isOwner===true};mode='server';stateEnabled=result.stateEnabled!==false;startupError=null;return community;
  })();
  try{return await connecting;}finally{connecting=null;}
 }
 if(config.apiBase){try{await connect();}catch(error){startupError=error.message;}}
 function freshRecord(){
  const saved=readJSON(storage,BROWSER_KEY);
  if(isObject(saved)&&visitorValid(saved.visitor))return saved;
  const old=readJSON(storage,OLD_GUEST_KEY),seed=Math.floor(Math.random()*10000);
  const v=visitorValid(old)?old:{name:ADJECTIVES[seed%10]+ANIMALS[Math.floor(seed/10)%10],avatar:seed,storageKey:id()};
  return {version:1,visitor:{name:v.name,avatar:v.avatar,storageKey:device,isOwner:false},visits:[],postcards:[]};
 }
 function readRecord(){
  const disk=readJSON(storage,BROWSER_KEY);
  if(isObject(disk)&&visitorValid(disk.visitor)&&disk.visitor.storageKey===visitor?.storageKey)memory=disk;
  if(!memory)memory=freshRecord();
  memory.visits=[...new Set((Array.isArray(memory.visits)?memory.visits:[]).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))];
  memory.postcards=(Array.isArray(memory.postcards)?memory.postcards:[]).filter(c=>isObject(c)&&typeof c.text==='string'&&Number.isFinite(Date.parse(c.created)));
  return memory;
 }
 function persistRecord(record){
  try{if(!storage)throw Error();storage.setItem(BROWSER_KEY,JSON.stringify(record));persisted=true;memory=record;return true;}
  catch{persisted=false;return false;}
 }
 function browserSummary(record){
  const day=dayAt(now()),visits=new Set(record.visits);
  return {today:visits.has(day)?1:0,total:1,visitDays:visits.size,history:historyDays(day).map(d=>({day:d,count:visits.has(d)?1:0})),postcards:[...record.postcards].sort((a,b)=>Date.parse(b.created)-Date.parse(a.created)).slice(0,24),day,scope:'browser',timezone:'Australia/Sydney',persisted,notice:persisted?'这些到访与留言只保存在这台浏览器，不是全站访客统计。':'浏览器存储不可用，当前记录仅保留在此页面。'};
 }
 function browserVisit(){
  const record=readRecord(),day=dayAt(now());
  if(!record.visits.includes(day)){record.visits.push(day);persistRecord(record);}
  community=browserSummary(record);return community;
 }
 if(mode==='browser'){
  memory=freshRecord();visitor={...memory.visitor,isOwner:false};memory.visitor=visitor;
  // Preserve the pre-v7 browser fallback identity, but never import an owner flag.
  persistRecord(memory);browserVisit();
 }
 const stateTransport={
  get enabled(){return !disposed&&mode==='server'&&stateEnabled;},
  get isLocalServer(){return this.enabled&&config.isLocalServer;},
  async read(){if(!this.enabled)return null;try{const value=await request('state');if(!isObject(value))throw Error('个人记录格式不正确。');return value;}catch(error){stateEnabled=false;throw error;}},
  async write(value){if(!this.enabled)return false;try{await request('state',{method:'POST',body:value});return true;}catch(error){stateEnabled=false;throw error;}}
 };
 const client={
  get visitor(){return visitor;},get community(){return community;},get mode(){return mode;},get apiBase(){return config.apiBase;},stateTransport,
  getStatus(){return {mode,scope:mode==='browser'?'browser':config.isLocalServer?'same-server':'site',apiBase:config.apiBase,isLocalServer:config.isLocalServer&&mode==='server',startupError,persisted:mode==='browser'?persisted:true};},
  async refresh(){if(disposed)throw Error('窗口已关闭。');if(mode==='browser'){if(config.configured&&!config.isLocalServer){try{return await connect();}catch(error){startupError=error.message;throw Error('共享信箱连接得慢了一点，请稍后再打开。');}}return browserVisit();}community=sharedSummary(await request('community'));return community;},
  async postcard(kind,text=''){
   if(disposed)throw Error('窗口已关闭。');const clean=message(kind,text);
   if(mode==='server'){community=sharedSummary(await request('community',{method:'POST',body:{kind,text:clean,...(!config.isLocalServer?{id:id()}: {})}}));return community;}
   const save=()=>{
    const record=readRecord(),time=now();
    const latest=Math.max(0,...record.postcards.map(c=>Date.parse(c.created)));
    if(time.getTime()-latest<15000)throw Error('心意已经收到啦，过一小会儿再寄一张吧。');
    const card={id:id(),kind,text:clean,created:time.toISOString(),name:visitor.name,avatar:visitor.avatar};
    const next={...record,postcards:[...record.postcards,card].slice(-200)};
    if(!persistRecord(next))throw Error('浏览器没有保存这张留言，请检查存储空间后重试。');
    community=browserSummary(next);return community;
   };
   return globalThis.navigator?.locks?.request?globalThis.navigator.locks.request(BROWSER_KEY,save):save();
  },
  dispose(){disposed=true;}
 };
 return client;
}
