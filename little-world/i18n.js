import {ENGLISH} from './i18n-dictionary.js?v=14';

const KEY='little-world.language';
let language='zh',started=false,observer=null,originalTitle=null;
let cleanupListeners=[];
try{if(localStorage.getItem(KEY)==='en')language='en';}catch{}
const copies=new WeakMap(),attributes=new WeakMap(),dictionary={...ENGLISH};
const bilingual=new Set(['HCI · 人机交互','Responsible AI · 负责任的 AI','Everyday care · 日常关怀','作品集 · Prototype Studio','观察 / OBSERVE','尝试 / MAKE','复盘 / REFLECT']);
const skip='script,style,textarea,input,canvas,svg,[contenteditable],.brand,[data-i18n-skip],.postcard p,.postcard strong,.ps-track-title,.ps-track strong,.ps-favorite>a';
export const getLanguage=()=>language;
export function addTranslations(entries){Object.assign(dictionary,entries);}

export function translate(text,lang=language){
 if(typeof text!=='string'||lang!=='en'||!/[\u3400-\u9fff]/.test(text))return text;
 const source=text.trim();
 if(bilingual.has(source))return text;
 const wrap=value=>text.slice(0,text.indexOf(source))+value+text.slice(text.indexOf(source)+source.length);
 if(dictionary[source])return wrap(dictionary[source]);
 const rules=[
  [/^悉尼 · 日出 ([\d:—]+) · 日落 ([\d:—]+)$/,(_,rise,set)=>`Sydney · Sunrise ${rise} · Sunset ${set}`],
  [/^相伴第 (\d+) 天$/,(_,n)=>`Day ${n} together`],
  [/^(早上好|下午好|晚上好)，可爱的朋友$/,(_,g)=>`${dictionary[g]}, lovely friend`],
  [/^生活记录 · (.+)$/,(_,s)=>`Home journal · ${translate(s,lang)}`],
  [/^今天的你是「(.+)」$/,(_,name)=>`Today you are “${translate(name,lang)}”`],
  [/^今天在这里坐过 (\d+) 次$/,(_,n)=>`${n} visit${n==='1'?'':'s'} here today`],
  [/^今天有 (\d+) 条到访记录$/,(_,n)=>`${n} visit${n==='1'?'':'s'} today`],
  [/^今天来了 (\d+) 位朋友$/,(_,n)=>`${n} friend${n==='1'?'':'s'} visited today`],
  [/^已经收下 (\d+) 朵小花。$/,(_,n)=>`${n} flower${n==='1'?'':'s'} gathered so far.`],
  [/^已经养开了 (\d+) 朵花，小屋记得你的照顾。$/,(_,n)=>`${n} flowers have bloomed with your care.`],
  [/^便签 (\d+)( 内容)?$/,(_,n,content)=>`Note ${n}${content?' contents':''}`],
  [/^删除便签 (\d+)$/,(_,n)=>`Delete note ${n}`],
  [/^阅读：(.+)$/,(_,title)=>`Read: ${title}`],
  [/^查看 (.+) 项目，在新标签页打开$/,(_,title)=>`View ${translate(title,lang)} in a new tab`],
  [/^查看(.+)，在新标签页打开$/,(_,title)=>`View ${translate(title,lang)} in a new tab`],
  [/^花箱 (\d+) · (.+)$/,(_,n,name)=>`Planter ${n} · ${translate(name,lang)}`],
  [/^(.+衣柜|.+柜|餐椅)(\s*\d+)$/,(_,name,n)=>`${translate(name,lang)} ${n.trim()}`],
  [/^(关闭|展开|收起|打开)(.+)$/,(_,verb,n)=>`${dictionary[verb]} ${translate(n,lang)}`],
  [/^种下(.+)$/,(_,name)=>`Plant ${translate(name,lang)}`],
  [/^(.+?)(已打开|已关闭|已出水)$/,(_,name,s)=>`${translate(name,lang)} · ${dictionary[s]}`],
  [/^(.+)蹭了蹭你的手。$/,(_,name)=>`${translate(name,lang)} nuzzles your hand.`],
  [/^(.+)去食盆边吃两口，今天的照顾已经记好啦。$/,(_,name)=>`${translate(name,lang)} heads to her bowl. Today's care is already recorded.`],
  [/^给(.+)添好猫粮了，她去食盆边吃饭啦。$/,(_,name)=>`Fresh food for ${translate(name,lang)}. She's off to her bowl.`],
  [/^她的新名字是(.+)。$/,(_,name)=>`Her new name is ${name}.`],
  [/^正在播放：(.+)。文件只在你的浏览器临时播放，不会上传。$/,(_,name)=>`Now playing: ${name}. This file only plays in this browser and isn't uploaded.`],
  [/^(.+) 不是可识别的音频文件。$/,(_,name)=>`${name} isn't a recognised audio file.`],
  [/^(.+)：点击一步，长按连续移动$/,(_,name)=>`${translate(name,lang)}: tap to step, hold to walk`],
  [/^(.+?) · 点击( \/ 拖动)?$/,(_,name,drag)=>`${translate(name,lang)} · Click${drag?' / drag':''}`],
  [/^(.+) · 摸摸她$/,(_,name)=>`${translate(name,lang)} · A little pat`],
  [/^(\d[\d.-]*) (次|位|份来访)$/,(_,n)=>`${n} visits`],
 ];
 for(const [pattern,replace] of rules)if(pattern.test(source))return wrap(source.replace(pattern,replace));
 // Anonymous generated nicknames remain recognisable across languages.
 const adjectives={'晒太阳的':'Sunbathing ','软乎乎的':'Soft ','爱发呆的':'Daydreaming ','慢慢走的':'Unhurried ','捧着花的':'Flower-holding ','带星星的':'Starry ','会做梦的':'Dreaming ','听海的':'Sea-listening ','暖烘烘的':'Cosy ','刚睡醒的':'Sleepy '};
 const animals={'小海獭':'Otter','小兔子':'Bunny','小雪兔':'Snow Bunny','小橘子':'Tangerine','小团子':'Dumpling','小熊猫':'Red Panda','小松鼠':'Squirrel','小云朵':'Cloud','小布丁':'Pudding','小狐狸':'Fox','小奶猫':'Kitten'};
 for(const [prefix,en] of Object.entries(adjectives))if(source.startsWith(prefix)&&animals[source.slice(prefix.length)])return wrap(en+animals[source.slice(prefix.length)]);
 if(source.includes(' · '))return wrap(source.split(' · ').map(part=>translate(part,lang)).join(' · '));
 const sentences=source.match(/[^。]+。?/g);
 if(sentences?.length>1)return wrap(sentences.map(part=>translate(part,lang)).join(' '));
 return text;
}

function translateText(node){
 if(node.parentElement?.closest(skip)||!node.nodeValue?.trim())return;
 const old=copies.get(node),value=node.nodeValue;
 const source=old&&value===old.rendered?old.source:value;
 const rendered=translate(source);
 copies.set(node,{source,rendered});
 if(value!==rendered)node.nodeValue=rendered;
}
function translateAttributes(element){
 if(element.closest('[data-i18n-skip],.postcard p,.postcard strong'))return;
 const saved=attributes.get(element)||{};
 for(const name of ['title','aria-label','placeholder','alt']){
  const value=element.getAttribute(name);if(value===null)continue;
  const old=saved[name],source=old&&value===old.rendered?old.source:value,rendered=translate(source);
  saved[name]={source,rendered};if(value!==rendered)element.setAttribute(name,rendered);
 }
 attributes.set(element,saved);
}
function walk(root){
 if(root.nodeType===3){translateText(root);return;}
 if(root.nodeType!==1)return;
 translateAttributes(root);
 if(root.closest(skip))return;
 for(const child of root.childNodes)walk(child);

}
const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']};
function apply(roots=[document.body]){
 observer?.disconnect();
 for(const root of roots)if(root?.isConnected)walk(root);
 observer?.observe(document.body,options);
}
export function setLanguage(next,{broadcast=true}={}){
 language=next==='en'?'en':'zh';
 try{localStorage.setItem(KEY,language);}catch{}
 document.documentElement.lang=language==='en'?'en':'zh-CN';
 if(originalTitle!==null)document.title=translate(originalTitle);
 const toggle=document.querySelector('#language-toggle');
 if(toggle){toggle.textContent=language==='en'?'中文':'EN';toggle.setAttribute('aria-label',language==='en'?'切换到中文':'Switch to English');toggle.title=language==='en'?'切换到中文':'Switch to English';}
 if(started)apply();
 window.dispatchEvent(new CustomEvent('little-world:languagechange',{detail:{language}}));
 if(broadcast)for(const iframe of document.querySelectorAll('iframe')){try{if(new URL(iframe.src,location.href).origin===location.origin)iframe.contentWindow?.postMessage({type:'little-world:language',language},location.origin);}catch{}}
}
export function initI18n(){
 if(started)return;started=true;originalTitle=document.title;
 observer=new MutationObserver(records=>{
  const roots=new Set();
  for(const record of records){if(record.type==='childList')record.addedNodes.forEach(node=>roots.add(node));else roots.add(record.target);}
  if(roots.size)apply(roots);
 });
 const toggle=document.querySelector('#language-toggle');
 const click=()=>setLanguage(language==='zh'?'en':'zh');
 const storage=event=>{if(event.key===KEY)setLanguage(event.newValue,{broadcast:false});};
 const message=event=>{if(event.origin===location.origin&&event.source===window.parent&&event.data?.type==='little-world:language')setLanguage(event.data.language,{broadcast:false});};
 toggle?.addEventListener('click',click);window.addEventListener('storage',storage);window.addEventListener('message',message);
 cleanupListeners=[()=>toggle?.removeEventListener('click',click),()=>window.removeEventListener('storage',storage),()=>window.removeEventListener('message',message)];
 setLanguage(language);
 return {dispose(){observer?.disconnect();cleanupListeners.forEach(fn=>fn());cleanupListeners=[];started=false;}};
}
