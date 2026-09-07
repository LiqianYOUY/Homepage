import {createPlantUI} from './plant-ui.js?v=14';
import {getLanguage} from './i18n.js?v=14';
import {raiseDialog, topDialog, consumeDialogEscape, flattenDialogRoot} from './dialog-stack.js?v=22';
import {hostAvatar,visitorAvatar,postcardIcon} from './little-icons.js?v=9';
const $=(s,r=document)=>r.querySelector(s);
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
// Small and large screens keep separate disclosure preferences.
export function setupWelcomeCards(){
 const storageKey='little-world.card-disclosures.v8';
 const media=window.matchMedia('(max-width: 760px)');
 const items=[
  {name:'friend',title:'朋友卡片',card:$('.friend-card'),toggle:$('#welcome-card-toggle'),body:$('#welcome-card-body')},
  {name:'cat',title:'猫咪卡片',card:$('.cat-card'),toggle:$('#cat-card-toggle'),body:$('#cat-card-body')}
 ].filter(item=>item.card&&item.toggle&&item.body);
 let saved={};
 try{const value=JSON.parse(window.localStorage.getItem(storageKey)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
 const mode=()=>media.matches?'mobile':'desktop';
 const defaults=()=>({friend:!media.matches,cat:!media.matches});
 let current=defaults();
 function persist(){saved[mode()]={...current};try{window.localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}}
 function render(){
  const friend=items.find(item=>item.name==='friend');
  for(const item of items){
   // The welcome message gets the whole reading area. Keep the cat's saved
   // disclosure preference, but remove its entire card while the friend is open.
   const covered=item.name==='cat'&&!!current.friend&&!!friend;
   if(covered&&item.card.contains(document.activeElement))friend.toggle.focus({preventScroll:true});
   const open=!!current[item.name]&&!covered;
   if(!open&&item.body.contains(document.activeElement))item.toggle.focus({preventScroll:true});
   item.card.hidden=covered;
   item.card.inert=covered;
   item.body.hidden=!open;
   item.toggle.setAttribute('aria-expanded',String(open));
   const title=(open?'收起':'展开')+item.title;
   item.toggle.title=title;
   const status=$('.card-toggle-status',item.toggle);if(status)status.textContent=title;
   item.card.classList.toggle('is-expanded',open);
   item.card.classList.toggle('is-collapsed',!open);
   item.card.classList.add('cards-ready');
  }
 }
 function restore(){
  current=defaults();const value=saved[mode()];
  if(value&&typeof value==='object')for(const item of items)if(typeof value[item.name]==='boolean')current[item.name]=value[item.name];
  render();
 }
 function setExpanded(name,open){
  if(!items.some(item=>item.name===name))return;
  current[name]=!!open;
  // Opening the cat reveals it; opening the friend temporarily covers it.
  if(name==='cat'&&open)current.friend=false;
  render();persist();
 }
 const listeners=items.map(item=>{const click=()=>setExpanded(item.name,!current[item.name]);item.toggle.addEventListener('click',click);return()=>item.toggle.removeEventListener('click',click);});
 const onEscape=e=>{
  if(e.key!=='Escape'||e.defaultPrevented)return;
  const item=items.find(item=>current[item.name]&&item.card.contains(e.target));
  if(item){e.preventDefault();setExpanded(item.name,false);item.toggle.focus({preventScroll:true});}
 };
 document.addEventListener('keydown',onEscape);
 if(media.addEventListener)media.addEventListener('change',restore);else media.addListener(restore);
 restore();
 return {setExpanded,getState:()=>({...current,layout:mode()}),dispose(){listeners.forEach(fn=>fn());document.removeEventListener('keydown',onEscape);if(media.removeEventListener)media.removeEventListener('change',restore);else media.removeListener(restore);}};
}

export function createWelcomeWorld({getVisitor,getCommunity,refreshCommunity,postcard,getSmart,getTerrace,toast,onStateChange,onTV,onMusic,onBooks,onCat,onWave}){
 const cards=setupWelcomeCards();
 const root=node('div','world-ui');root.dataset.homeUi='';flattenDialogRoot(root);document.body.append(root);const panels=new Map();
 function close(name){const p=panels.get(name);if(p){p.dispatchEvent(new Event('home:close'));p.remove();panels.delete(name);}}
 function panel(name,title,subtitle,width=610){close(name);const p=node('section','home-dialog');p.setAttribute('role','dialog');p.setAttribute('aria-label',title);p.tabIndex=-1;p.style.setProperty('--dialog-width',width+'px');const h=node('header','dialog-header'),t=node('div');t.append(node('h2','',title),node('p','',subtitle));const x=node('button','dialog-close','×');x.setAttribute('aria-label','关闭'+title);x.onclick=()=>close(name);h.append(t,x);const content=node('div','dialog-body');p.append(h,content);root.append(p);panels.set(name,p);let drag=null;h.onpointerdown=e=>{if(e.target.closest('button'))return;const r=p.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};h.setPointerCapture(e.pointerId);};h.onpointermove=e=>{if(!drag)return;p.style.transform='none';p.style.left=Math.max(8,Math.min(innerWidth-180,drag.left+e.clientX-drag.x))+'px';p.style.top=Math.max(8,Math.min(innerHeight-60,drag.top+e.clientY-drag.y))+'px';};h.onpointerup=h.onpointercancel=()=>drag=null;p.onpointerdown=()=>raiseDialog(p);p.onfocusin=()=>raiseDialog(p);raiseDialog(p);p.focus();return{p,content};}
 function button(label,fn,primary=false){const b=node('button',primary?'world-button primary':'world-button',label);b.onclick=fn;return b;}
 function updateTop(){const v=getVisitor();const chip=$('#visitor-chip');if(chip){chip.replaceChildren();const a=node('span','tiny-avatar');a.innerHTML=visitorAvatar(v?.avatar);chip.append(a,node('span','',v?.name||'一位可爱的朋友'));}$('#profile-icon').innerHTML=hostAvatar;const envelope=$('#postcard-icon');if(envelope)envelope.innerHTML=postcardIcon;}
 async function renderProfile(){const {content}=panel('profile','关于这间小屋','认识一点点，再一起玩一会儿。',650);const intro=node('div','host-intro'),avatar=node('div','host-portrait');avatar.innerHTML=hostAvatar;const copy=node('div');copy.append(node('span','dialog-eyebrow','YOUR HOST'),node('h3','','你好呀，我是小尤。'),node('p','','喜欢做原型、研究人与技术如何相处。关心负责任的 AI，也关心吃饭、吃药和情绪这些日常小事。'));intro.append(avatar,copy);content.append(intro,node('p','gentle-note','好好吃饭，好好睡觉，越来越好。——这是我想送给每一位朋友的祝愿。不用急着做什么，坐坐、看看，摸摸小橘的头，就很好。'));
  const tags=node('div','interest-tags');['HCI · 人机交互','做能用好用的原型','把科技做得温柔一点'].forEach(t=>tags.append(node('span','',t)));content.append(tags);
  const invite=node('div','guest-identity');const g=node('span','visitor-avatar');g.innerHTML=visitorAvatar(getVisitor()?.avatar);invite.append(g,node('div','',`今天的你是「${getVisitor()?.name||'一位可爱的朋友'}」`));content.append(invite);
  const guide=node('div','visit-guide');guide.append(node('h3','','随手玩一玩'),node('p','','拖动看看家，点亮小物件。摸摸猫、浇浇花，临走时留一句话。'));const actions=node('div','world-actions');actions.append(button('摸摸小橘',onCat),button('读两页书',onBooks),button('听点音乐',onMusic),button('留张明信片',openPostcards));guide.append(actions);content.append(guide);
  const stat=node('div','visit-stats');content.append(stat);try{await refreshCommunity();}catch{}if(!content.isConnected)return;const c=getCommunity();if(!c){stat.append(node('p','gentle-note','到访记录暂时没连上，欢迎依然算数。'));return;}const site=c.scope==='site';const counts=node('div','stat-numbers');counts.append(node('div','',c.scope==='browser'?`今天在这里坐过 ${c.today} 次`:site?`今天有 ${c.today} 条到访记录`:`今天来了 ${c.today} 位朋友`));stat.append(counts,node('p','stats-caption',c.notice||(c.scope==='browser'?'只记录这台浏览器 · 同一天只算一次':site?'按悉尼日期，同一 IP 每天记一次到访；原始 IP 不落库。':'按悉尼日期记录 · 同一浏览器当天只算一次')));const chart=node('div','visit-chart');chart.setAttribute('aria-label','最近七天来访记录');const max=Math.max(1,...c.history.map(v=>v.count));c.history.forEach(v=>{const bar=node('div','visit-day');bar.title=v.day+'：'+v.count+(site?' 份来访':c.scope==='browser'?' 次':' 位');bar.append(node('span','visit-number',String(v.count)));const fill=node('i');fill.style.height=(6+v.count/max*52)+'px';bar.append(fill,node('span','visit-date',v.day.slice(5)));chart.append(bar);});stat.append(chart,node('p','stats-caption',c.scope==='browser'?'这是你的本机到访日记，并非全站人数。昵称也留在这台浏览器，不需要填写真名。':site?'同一 Wi-Fi 下的朋友可能共用 IP。这是相遇的痕迹，不是精确人数。':'这是访问当前小屋服务的匿名记录。昵称会留在这台浏览器，不需要填写真名。'));
 }
 async function openPostcards(){const {content}=panel('postcards','门边的明信片',getCommunity()?.scope==='browser'?'你的本机留言簿 · 留一点好心情。':'把一点好心情，留在这里。',580);content.append(node('p','gentle-note',getCommunity()?.scope==='browser'?'最近在好奇什么？写给小尤，也写给今天的自己。这本留言簿只保存在你的浏览器；屋主和其他访客暂时看不到。':'最近在好奇什么？或是只留一句「来坐过啦」，我都会很开心。'));if(getCommunity()?.scope==='site')content.append(node('p','stats-caption','寄出后，来访的朋友都能看见。'));const form=node('form','postcard-form'),input=node('textarea');input.maxLength=160;input.placeholder='给小屋留一句话……';input.setAttribute('aria-label','明信片内容');const count=node('small','','0 / 160');input.oninput=()=>count.textContent=input.value.length+' / 160';const submit=button('寄出这张明信片',()=>{},true);submit.type='submit';form.append(input,count,submit);const quick=node('div','world-actions');quick.append(button('挥挥手 👋',()=>send('wave')),button('留一朵小花 🌼',()=>send('flower')));const list=node('div','postcard-list');content.append(form,quick,list);
  async function send(kind,text=''){submit.disabled=true;try{await postcard(kind,text);input.value='';count.textContent='0 / 160';toast(getCommunity()?.scope==='browser'?'这份心意已记在你的本机留言簿。':'心意收到了，留在小屋里啦。');if(kind==='wave')onWave?.();draw();}catch(e){toast(e.message||'还没寄出去，稍后再试一下吧。');}finally{submit.disabled=false;}}
  form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(text)send('message',text);else toast('写一句想说的话吧。');};function draw(){list.replaceChildren();const cards=getCommunity()?.postcards||[];if(!cards.length){list.append(node('p','empty-postcards','信箱还是空的，第一张明信片会是谁留下的呢？'));return;}cards.forEach(card=>{const row=node('article','postcard'),av=node('span','tiny-avatar');av.innerHTML=visitorAvatar(card.avatar);const txt=node('div');txt.append(node('strong','',card.name),node('p','',card.text));const d=new Date(card.created);txt.append(node('small','',new Intl.DateTimeFormat(getLanguage()==='en'?'en-AU':'zh-CN',{timeZone:'Australia/Sydney',month:'short',day:'numeric'}).format(d)));row.append(av,txt);list.append(row);});}try{await refreshCommunity();}catch{}draw();
 }
 function openControls(){const smart=getSmart();if(!smart){toast('正在唤醒家里的小设备……');return;}const {content}=panel('controls','家的小管家','灯光、窗帘，还有一点日常照顾。',460);const status=smart.getStatus();content.append(node('span','dialog-eyebrow','SMART HOME'));
  function toggle(title,hint,checked,fn){const row=node('label','device-row'),copy=node('span');copy.append(node('strong','',title),node('small','',hint));const check=node('input');check.type='checkbox';check.checked=checked;check.onchange=()=>{fn(check.checked);onStateChange?.();};row.append(copy,check);content.append(row);}
  toggle('房间灯光','留一盏暖暖的灯',status.lightsOn!==false,v=>smart.setLights(v));toggle('窗帘打开','让窗外的光进来',status.curtainsOpen!==false,v=>smart.setCurtains(v));toggle('自动打扫','小橘玩累了，它来收拾',status.vacuumAuto!==false,v=>smart.setVacuumAuto(v));
  const action=node('div','world-actions');action.append(button('现在打扫一下',()=>smart.clean()),button('打开电视',()=>{close('controls');onTV();}));content.append(action,node('p','gentle-note','也可以直接点家里的中控屏、电视或花盆，轻轻一点就能用。'));
 }
 const plantUI=createPlantUI({getSmart,getTerrace,panel,node,button,toast});
 const {openTerrace,openGarden,openFlowerVases}=plantUI;
 const key=e=>{if(e.key!=='Escape'||!panels.size)return;const top=topDialog();const entry=[...panels.entries()].find(([,p])=>p===top);if(entry&&consumeDialogEscape(e,entry[1]))close(entry[0]);};document.addEventListener('keydown',key,true);
 updateTop();return {openProfile:renderProfile,openPostcards,openControls,openGarden,openTerrace,openFlowerVases,updateTop,cards,closeAll(){[...panels.keys()].forEach(close);},dispose(){cards.dispose();[...panels.keys()].forEach(close);document.removeEventListener('keydown',key,true);root.remove();}};
}
