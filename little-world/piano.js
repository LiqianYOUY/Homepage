import {consumeDialogEscape,isTopDialog,raiseDialog} from './dialog-stack.js';
import {addTranslations,translate} from './i18n.js?v=14';

addTranslations({
 '钢琴 · 弹一会儿':'Piano · Play a little',
 '窗边的钢琴':'The piano by the window',
 '留一小段时间，弹给自己听。':'Take a little time to play, just for yourself.',
 '关闭钢琴':'Close piano',
 '轻触琴键，或用电脑键盘弹奏。':'Touch the keys, or play with your computer keyboard.',
 '左右箭头选琴键 · 回车弹奏 · 按住空格延音':'Left / Right to select · Enter to play · Hold Space to sustain',
 '左移琴键':'Scroll keys left','右移琴键':'Scroll keys right',
 '延音踏板':'Sustain pedal',
 '音量':'Volume',
 '准备好，奏出第一颗音符。':'Ready for your first note.',
 '这个浏览器暂时无法播放钢琴声音。':'This browser cannot play piano audio at the moment.',
 '请再次轻触琴键以开启声音。':'Touch a key again to enable sound.',
 '正在弹奏':'Playing',
 '两组八度琴键':'Two-octave keyboard',
});

export const PIANO_KEYS=Array.from({length:25},(_,index)=>{
 const midi=60+index,names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
 return {midi,name:names[midi%12]+(Math.floor(midi/12)-1),black:[1,3,6,8,10].includes(midi%12)};
});
const COMPUTER_KEYS={KeyA:60,KeyW:61,KeyS:62,KeyE:63,KeyD:64,KeyF:65,KeyT:66,KeyG:67,KeyY:68,KeyH:69,KeyU:70,KeyJ:71,KeyK:72,KeyO:73,KeyL:74,KeyP:75,Semicolon:76,Quote:77};
const KEY_HINTS={Semicolon:';',Quote:"'"};
export const frequencyForMidi=midi=>440*2**((midi-69)/12);

/** A small synthesized piano: audio starts only after a visitor plays a note. */
export function createPianoAudio({AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,onError=()=>{}}={}){
 let context=null,master=null,sustain=false,volume=.65;
 const voices=new Map();
 function ensureAudio(){
  if(!AudioContextClass){onError('这个浏览器暂时无法播放钢琴声音。');return null;}
  try{
   if(!context){context=new AudioContextClass();master=context.createGain();master.gain.value=volume*.25;master.connect(context.destination);}
   if(context.state==='suspended')context.resume().catch(()=>onError('请再次轻触琴键以开启声音。'));
   return context;
  }catch{onError('这个浏览器暂时无法播放钢琴声音。');return null;}
 }
 function stopVoice(midi,immediate=false){
  const voice=voices.get(midi);if(!voice)return;
  voices.delete(midi);const now=context.currentTime,duration=immediate ? .025 : .18;
  voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(.0001,now,duration/4);
  for(const oscillator of voice.oscillators){try{oscillator.stop(now+duration);}catch{}}
 }
 function start(midi){
  const ctx=ensureAudio();if(!ctx)return false;
  stopVoice(midi,true);if(voices.size>=16)stopVoice(voices.keys().next().value,true);
  const now=ctx.currentTime,frequency=frequencyForMidi(midi),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
  filter.type='lowpass';filter.frequency.setValueAtTime(Math.min(10000,frequency*10),now);filter.frequency.exponentialRampToValueAtTime(Math.max(900,frequency*2.5),now+1.7);filter.Q.value=.25;
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.75,now+.009);gain.gain.exponentialRampToValueAtTime(.32,now+.15);gain.gain.exponentialRampToValueAtTime(.0001,now+7);
  gain.connect(filter);filter.connect(master);
  const oscillators=[1,2,3,4].map((harmonic,index)=>{
   const oscillator=ctx.createOscillator(),partial=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=frequency*harmonic;partial.gain.value=[1,.26,.11,.035][index];oscillator.connect(partial);partial.connect(gain);oscillator.start(now);oscillator.stop(now+7.1);return oscillator;
  });
  const voice={gain,oscillators,released:false};voices.set(midi,voice);
  oscillators[0].onended=()=>{if(voices.get(midi)===voice)voices.delete(midi);gain.disconnect();filter.disconnect();};
  return true;
 }
 function release(midi){const voice=voices.get(midi);if(!voice)return;voice.released=true;if(!sustain)stopVoice(midi);}
 function setSustain(value){sustain=!!value;if(!sustain)for(const [midi,voice] of voices)if(voice.released)stopVoice(midi);}
 function stopAll(){sustain=false;for(const midi of [...voices.keys()])stopVoice(midi,true);}
 return {start,release,setSustain,stopAll,setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.setTargetAtTime(volume*.25,context.currentTime,.03);},dispose(){stopAll();context?.close();context=null;},get activeVoiceCount(){return voices.size;}};
}

export function createPiano({THREE,piano,register}={}){
 if(!document.querySelector('link[data-piano-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./piano.css?v=14',import.meta.url).href;link.dataset.pianoStyle='';document.head.append(link);}
 const overlay=document.createElement('div');overlay.className='piano-overlay';overlay.hidden=true;overlay.dataset.homeUi='';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','piano-title');overlay.tabIndex=-1;
 overlay.innerHTML=`<section class="piano-dialog"><header class="piano-heading"><div><span class="piano-eyebrow">A LITTLE MUSIC AT HOME</span><h2 id="piano-title" data-copy="窗边的钢琴"></h2><p data-copy="留一小段时间，弹给自己听。"></p></div><button class="piano-close" type="button" data-label="关闭钢琴">×</button></header><div class="piano-instrument"><div class="piano-console"><span class="piano-brand">LITTLE HOME <i>88</i></span><span class="piano-indicator" aria-hidden="true"></span><output class="piano-note">—</output></div><div class="piano-key-scroll"><div class="piano-keys" role="group" data-label="两组八度琴键"></div></div><div class="piano-instrument-edge"></div></div><div class="piano-key-travel"><button type="button" data-scroll="-1" data-label="左移琴键">←</button><span>C4 — C6</span><button type="button" data-scroll="1" data-label="右移琴键">→</button></div><div class="piano-controls"><button type="button" class="piano-sustain" aria-pressed="false"><span aria-hidden="true">♩</span> <span data-copy="延音踏板"></span></button><label class="piano-volume"><span data-copy="音量"></span><input type="range" min="0" max="100" value="65" data-label="音量"></label></div><p class="piano-instructions" data-copy="轻触琴键，或用电脑键盘弹奏。"></p><p class="piano-help" data-copy="左右箭头选琴键 · 回车弹奏 · 按住空格延音"></p><p class="piano-status" role="status" data-copy="准备好，奏出第一颗音符。"></p></section>`;
 document.body.append(overlay);
 const panel=overlay,keybed=overlay.querySelector('.piano-keys'),status=overlay.querySelector('.piano-status'),noteDisplay=overlay.querySelector('.piano-note'),sustainButton=overlay.querySelector('.piano-sustain');
 const scroll=overlay.querySelector('.piano-key-scroll'),travel=overlay.querySelector('.piano-key-travel'),travelButtons=[...travel.querySelectorAll('button')];
 const sourceNotes=new Map(),keyButtons=new Map();let previousFocus=null,sustainLatched=false,spaceHeld=false,focusedMidi=60;
 let whiteIndex=0;
 for(const key of PIANO_KEYS){
  const button=document.createElement('button');button.type='button';button.className='piano-key '+(key.black?'piano-key-black':'piano-key-white');button.dataset.midi=key.midi;button.setAttribute('aria-label',key.name);button.setAttribute('aria-pressed','false');
  button.tabIndex=key.midi===focusedMidi?0:-1;
  button.addEventListener('focus',()=>{focusedMidi=key.midi;for(const [midi,node] of keyButtons)node.tabIndex=midi===focusedMidi?0:-1;});
  const binding=Object.entries(COMPUTER_KEYS).find(([,midi])=>midi===key.midi)?.[0],hint=binding?(KEY_HINTS[binding]||binding.replace('Key','')):'';
  button.innerHTML=`<span class="piano-key-note">${key.name}</span><kbd>${hint}</kbd>`;
  if(key.black)button.style.left=`calc(${whiteIndex} * (100% / 15) - (100% / 15) * .31)`;else whiteIndex++;
  keybed.append(button);keyButtons.set(key.midi,button);
 }
 const audio=createPianoAudio({onError:message=>{status.dataset.copy=message;status.textContent=translate(message);}});
 function paintKey(midi){const active=[...sourceNotes.values()].includes(midi);keyButtons.get(midi)?.classList.toggle('is-playing',active);keyButtons.get(midi)?.setAttribute('aria-pressed',String(active));}
 function press(source,midi){
  if(sourceNotes.get(source)===midi)return;release(source);
  sourceNotes.set(source,midi);audio.start(midi);paintKey(midi);
  noteDisplay.value=PIANO_KEYS.find(key=>key.midi===midi).name;noteDisplay.textContent=noteDisplay.value;
 }
 function release(source){const midi=sourceNotes.get(source);if(midi===undefined)return;sourceNotes.delete(source);if(![...sourceNotes.values()].includes(midi))audio.release(midi);paintKey(midi);}
 function setSustain(){const active=sustainLatched||spaceHeld;audio.setSustain(active);sustainButton.setAttribute('aria-pressed',String(active));}
 function releaseAll(){sourceNotes.clear();for(const midi of keyButtons.keys())paintKey(midi);spaceHeld=false;sustainLatched=false;setSustain();audio.stopAll();noteDisplay.textContent='—';}
 function refreshLanguage(){overlay.querySelectorAll('[data-copy]').forEach(node=>{node.textContent=translate(node.dataset.copy);});overlay.querySelectorAll('[data-label]').forEach(node=>node.setAttribute('aria-label',translate(node.dataset.label)));if(record)record.label='钢琴 · 弹一会儿';}
 function focusKey(midi){focusedMidi=Math.max(PIANO_KEYS[0].midi,Math.min(PIANO_KEYS.at(-1).midi,midi));for(const [note,node] of keyButtons)node.tabIndex=note===focusedMidi?0:-1;const key=keyButtons.get(focusedMidi);key.focus({preventScroll:true});key.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});}
 function open(){previousFocus=document.activeElement;overlay.hidden=false;refreshLanguage();raiseDialog(panel);focusKey(focusedMidi);updateTravel();}
 function close(){if(overlay.hidden)return;releaseAll();overlay.hidden=true;previousFocus?.focus?.({preventScroll:true});}
 overlay.querySelector('.piano-close').addEventListener('click',close);overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 keybed.addEventListener('pointerdown',event=>{const key=event.target.closest('[data-midi]');if(!key||event.button>0)return;event.preventDefault();focusKey(Number(key.dataset.midi));key.setPointerCapture?.(event.pointerId);press('pointer:'+event.pointerId,Number(key.dataset.midi));});
 const releasePointer=event=>release('pointer:'+event.pointerId);keybed.addEventListener('pointerup',releasePointer);keybed.addEventListener('pointercancel',releasePointer);keybed.addEventListener('lostpointercapture',releasePointer);
 // Clicks generated by assistive technology do not have a preceding pointerdown.
 keybed.addEventListener('click',event=>{if(event.detail!==0)return;const key=event.target.closest('[data-midi]');if(!key)return;const source='accessible:'+key.dataset.midi;press(source,Number(key.dataset.midi));setTimeout(()=>release(source),300);});
 function updateTravel(){const maximum=scroll.scrollWidth-scroll.clientWidth;travel.hidden=maximum<=1;travelButtons[0].disabled=scroll.scrollLeft<=1;travelButtons[1].disabled=scroll.scrollLeft>=maximum-1;const bounds=scroll.getBoundingClientRect(),visible=PIANO_KEYS.filter(key=>{if(key.black)return false;const r=keyButtons.get(key.midi).getBoundingClientRect();return r.left+r.width/2>=bounds.left&&r.left+r.width/2<=bounds.right;});if(visible.length)travel.querySelector('span').textContent=visible[0].name+' — '+visible.at(-1).name;}
 travelButtons.forEach(button=>button.addEventListener('click',()=>scroll.scrollBy({left:Number(button.dataset.scroll)*Math.max(110,scroll.clientWidth*.8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})));
 scroll.addEventListener('scroll',updateTravel,{passive:true});window.addEventListener('resize',updateTravel);const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(updateTravel):null;resizeObserver?.observe(scroll);
 sustainButton.addEventListener('click',()=>{sustainLatched=!sustainLatched;setSustain();});
 overlay.querySelector('input[type="range"]').addEventListener('input',event=>audio.setVolume(Number(event.target.value)/100));
 function keydown(event){
  if(overlay.hidden||!isTopDialog(panel))return;
  if(consumeDialogEscape(event,panel)){close();return;}
  if(event.key==='Tab'){
   const focusable=[...panel.querySelectorAll('button,input,[tabindex="0"]')].filter(node=>node.tabIndex>=0&&node.getClientRects().length),first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}return;
  }
  if(event.ctrlKey||event.metaKey||event.altKey||event.target.matches('input'))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();focusKey(focusedMidi+(event.key==='ArrowRight'?1:-1));return;}
  if(event.code==='Space'){if(event.target.closest('button')&&!event.target.closest('.piano-key'))return;event.preventDefault();event.stopImmediatePropagation();spaceHeld=true;setSustain();return;}
  const midi=COMPUTER_KEYS[event.code];if(midi===undefined)return;event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)press('keyboard:'+event.code,midi);
 }
 function keyup(event){if(overlay.hidden)return;if(event.code==='Space'){spaceHeld=false;setSustain();event.preventDefault();}release('keyboard:'+event.code);}
 const blur=()=>releaseAll(),visibility=()=>{if(document.hidden)releaseAll();};
 document.addEventListener('keydown',keydown,true);document.addEventListener('keyup',keyup,true);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);window.addEventListener('little-world:languagechange',refreshLanguage);
 const record=piano&&register?{id:'piano',label:translate('钢琴 · 弹一会儿'),kind:'music',object:piano,anchor:new THREE.Box3().setFromObject(piano).getCenter(new THREE.Vector3()).setY(1.3),click:open}:null;
 if(record)register(record);refreshLanguage();
 return {open,close,refreshLanguage,panel,audio,dispose(){close();audio.dispose();resizeObserver?.disconnect();window.removeEventListener('resize',updateTravel);overlay.remove();document.removeEventListener('keydown',keydown,true);document.removeEventListener('keyup',keyup,true);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('little-world:languagechange',refreshLanguage);}};
}
