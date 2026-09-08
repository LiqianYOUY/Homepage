import {decryptGamePackage} from './game-package.js?v=20260908-games1';
import {getLanguage,addTranslations} from './i18n.js?v=14';
import {raiseDialog,consumeDialogEscape,isTopDialog} from './dialog-stack.js?v=22';

addTranslations({'露台茶桌 · 玩一会儿':'Terrace table · Play a little','帐篷 · 露台游戏':'Tent · Terrace games','藤椅 · 露台游戏':'Rattan chair · Terrace games'});
const GAMES={
  'juice-bay':{zh:'饮料合成',en:'Juice Bay',mark:'01',detail:['让同样的饮料碰一碰，合成下一杯。','Slide matching drinks together and make the next cup.']},
  'sling-birds':{zh:'愤怒的小鸟',en:'Sling Birds',mark:'02',detail:['拉开弹弓，试试这一关。','Pull back the slingshot and try a level.']}
};
const copy=(zh,en)=>getLanguage()==='en'?en:zh;
const title=id=>GAMES[id][getLanguage()==='en'?'en':'zh'];
const node=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const packageURL=id=>new URL(`./assets/games/${id}.bin?v=20260908-games1`,import.meta.url);

export function registerTerraceGameObjects({THREE,terrace,terraceLife,register,open}){
  const table=terrace?.root.getObjectByName('Terrace slatted teak dining table');
  const chairs=[1,2].map(i=>terrace?.root.getObjectByName('Terrace woven rattan armchair '+i));
  const objects=[['terrace-games-table',table,'露台茶桌 · 玩一会儿',true],['terrace-games-tent',terraceLife?.tent,'帐篷 · 露台游戏',true],...chairs.map((o,i)=>['terrace-games-chair-'+i,o,'藤椅 · 露台游戏',false])];
  for(const[id,object,label,hotspot]of objects){
    if(!object)continue;
    object.traverse(o=>{o.userData.noMerge=true;});
    const anchor=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());anchor.y+=.35;
    register({id,object,label,kind:'games',hotspot,anchor,click:open});
  }
  return objects.filter(([,o])=>o).map(([id])=>id);
}

export function createTerraceGames(options={}){
  let overlay,body,heading,back,closeButton,password='',selected=null,previousFocus=null,request=null,revision=0,disposed=false;
  let phase='locked',message='',loading=false;
  const copyMessage=()=>({wrong:copy('密码不对，再试一次。','That password did not work. Try again.'),network:copy('游戏暂时没加载好，请重试。','The game could not load. Please try again.'),secure:copy('请通过 HTTPS 或本地预览打开。','Please open this page over HTTPS or localhost.'),opening:copy('正在打开游戏…','Opening the game…')})[message]||'';
  const button=(text,action,cls='terrace-game-button')=>{const b=node('button',cls,text);b.type='button';b.onclick=action;return b;};
  function cancel(){revision++;request?.abort();request=null;loading=false;}
  function ensure(){
    if(overlay)return;
    overlay=node('div','terrace-games-overlay');overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','terrace-games-title');overlay.dataset.i18nSkip='';
    const panel=node('section','terrace-games-panel'),header=node('header','terrace-games-header');
    back=button('',lobby,'terrace-games-back');heading=node('h2','','');heading.id='terrace-games-title';closeButton=button('×',close,'terrace-games-close');
    header.append(back,heading,closeButton);body=node('div','terrace-games-body');panel.append(header,body);overlay.append(panel);document.body.append(overlay);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    document.addEventListener('keydown',onKey,true);window.addEventListener('little-world:languagechange',languageChanged);
  }
  function updateHeader(){
    heading.textContent=selected?title(selected):copy('露台游戏','Terrace games');back.textContent=copy('‹ 换个游戏','‹ Choose a game');back.hidden=phase!=='game';closeButton.setAttribute('aria-label',copy('关闭露台游戏','Close terrace games'));
  }
  function status(){const p=node('p','terrace-games-status',copyMessage());p.setAttribute('role',message==='wrong'?'alert':'status');return p;}
  function render(){
    updateHeader();overlay.dataset.phase=phase;body.replaceChildren();
    if(phase==='locked'){
      const form=node('form','terrace-games-lock'),mark=node('span','terrace-games-lock-mark','⌑');mark.setAttribute('aria-hidden','true');
      const intro=node('p','terrace-games-intro',copy('输入密码，打开露台里的小游戏。','Enter the password to open the terrace games.'));
      const label=node('label','',copy('游戏密码','Game password'));label.htmlFor='terrace-game-password';
      const input=node('input','');input.id='terrace-game-password';input.type='password';input.inputMode='numeric';input.autocomplete='off';input.required=true;input.maxLength=64;input.disabled=loading;
      const submit=node('button','terrace-game-button primary',loading?copy('正在解锁…','Unlocking…'):copy('进入游戏','Unlock games'));submit.type='submit';submit.disabled=loading;
      form.append(mark,intro,label,input,submit,status());form.addEventListener('submit',e=>{e.preventDefault();unlock(input.value);});body.append(form);
      if(!loading)input.focus();
    }else if(phase==='lobby'){
      const grid=node('div','terrace-games-choices');
      for(const[id,game]of Object.entries(GAMES)){const card=button('',()=>play(id),'terrace-game-choice');card.append(node('span','terrace-game-number',game.mark),node('strong','',title(id)),node('span','',copy(...game.detail)),node('span','terrace-game-start',copy('开始玩 ↗','Play ↗')));grid.append(card);}
      body.append(grid);
    }else{
      const loader=node('div','terrace-games-loading');loader.append(status());if(!loading)loader.append(button(copy('重试','Retry'),()=>play(selected)));body.append(loader);
    }
  }
  async function readPackage(id,secret,signal){
    const response=await fetch(packageURL(id),{signal});if(!response.ok)throw new Error('game-fetch-failed');
    return decryptGamePackage(await response.arrayBuffer(),secret);
  }
  async function unlock(value){
    if(loading||!value)return;
    cancel();const turn=revision;request=new AbortController();loading=true;message='';render();
    try{
      const token=await readPackage('access',value,request.signal);if(turn!==revision||disposed)return;
      if(token!=='YOUHOME:terrace-games')throw new Error('invalid-game-package');
      password=value;lobby();
    }catch(error){
      if(turn!==revision||disposed)return;
      message=error.name==='OperationError'?'wrong':error.message==='secure-context-required'?'secure':'network';loading=false;render();
    }finally{value='';}
  }
  function lobby(){cancel();selected=null;phase=password?'lobby':'locked';message='';render();body.querySelector('button,input')?.focus();}
  async function play(id){
    if(!password||!GAMES[id])return;
    cancel();const turn=revision;request=new AbortController();selected=id;phase='game';loading=true;message='opening';render();back.focus();
    try{
      const html=await readPackage(id,password,request.signal);if(turn!==revision||disposed)return;
      const frame=node('iframe','terrace-game-frame');frame.title=title(id);frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.setAttribute('allow','autoplay; fullscreen');frame.allowFullscreen=true;frame.referrerPolicy='no-referrer';
      frame.addEventListener('load',()=>{if(turn!==revision)return;loading=false;body.querySelector('.terrace-games-loading')?.remove();frame.focus();},{once:true});
      // srcdoc is created only after authenticated decryption; no unprotected
      // game URL or HTML is written to storage or served by GitHub Pages.
      frame.srcdoc=html;body.append(frame);
    }catch(error){if(turn!==revision||disposed)return;loading=false;message='network';render();}
  }
  function open(){if(disposed)return;ensure();if(!overlay.hidden)return;previousFocus=document.activeElement;overlay.hidden=false;phase='locked';selected=null;message='';password='';render();raiseDialog(overlay);}
  function close(){if(!overlay||overlay.hidden)return;cancel();password='';selected=null;phase='locked';body.replaceChildren();overlay.hidden=true;previousFocus?.focus?.();}
  function languageChanged(){if(!overlay||overlay.hidden)return;if(phase==='game'){updateHeader();return;}render();}
  function onKey(event){
    if(consumeDialogEscape(event,overlay)){close();return;}
    if(event.key!=='Tab'||!isTopDialog(overlay))return;
    const focusables=[...overlay.querySelectorAll('button,input,iframe')].filter(el=>!el.hidden&&!el.disabled&&el.getClientRects().length);
    const first=focusables[0],last=focusables.at(-1);if(!first)return;
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  const interactionIds=registerTerraceGameObjects({...options,open});
  return {open,close,interactionIds,isPlaying:()=>!!overlay&&!overlay.hidden&&phase==='game',dispose(){close();disposed=true;overlay?.remove();document.removeEventListener('keydown',onKey,true);window.removeEventListener('little-world:languagechange',languageChanged);}};
}
