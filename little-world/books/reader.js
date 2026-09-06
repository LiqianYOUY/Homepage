(() => {
  'use strict';
  const bookId=document.documentElement.dataset.bookId;
  const stateKey='warm-home:reader:'+bookId;
  const prefsKey='warm-home:reader:prefs';
  const $=id=>document.getElementById(id);
  const blocks=Array.from(document.querySelectorAll('#book .book-block'));
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* private storage can be disabled */}};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const prefs=read(prefsKey)||{};
  let size=clamp(Number(prefs.size)||20,16,30);
  let spacing=['compact','normal','airy'].includes(prefs.spacing)?prefs.spacing:'normal';
  let restoring=true,saveTimer=0,progressQueued=false;
  const headerHeight=()=>document.querySelector('.reader-bar').offsetHeight+20;
  function capture(){
    const y=scrollY+headerHeight();let lo=0,hi=blocks.length-1,index=-1;
    while(lo<=hi){const mid=(lo+hi)>>1;if(blocks[mid].offsetTop<=y){index=mid;lo=mid+1;}else hi=mid-1;}
    if(index<0)return {y:scrollY,anchor:null};
    const el=blocks[index];return {anchor:index,offset:(y-el.offsetTop)/Math.max(1,el.offsetHeight),y:scrollY};
  }
  function restore(position){
    if(!position)return;
    if(Number.isInteger(position.anchor)&&blocks[position.anchor]){
      const el=blocks[position.anchor],offset=Number(position.offset)||0;
      window.scrollTo(0,Math.max(0,el.offsetTop+offset*el.offsetHeight-headerHeight()));
    } else window.scrollTo(0,Math.max(0,Number(position.y)||0));
  }
  function applyPrefs(keepPosition=false){
    const position=keepPosition?capture():null;
    document.documentElement.style.setProperty('--font-size',size+'px');
    document.documentElement.style.setProperty('--paragraph-gap',{compact:'.65em',normal:'1.1em',airy:'1.7em'}[spacing]);
    document.documentElement.style.setProperty('--leading',{compact:'1.65',normal:'1.8',airy:'1.95'}[spacing]);
    $('font-size').textContent=String(size);$('spacing').value=spacing;
    $('smaller').disabled=size<=16;$('larger').disabled=size>=30;
    write(prefsKey,{size,spacing});
    if(position)restore(position);updateProgress();
  }
  function updateProgress(){
    const article=$('book'),start=article.offsetTop-headerHeight();
    const distance=Math.max(1,article.offsetHeight-innerHeight+headerHeight());
    const progress=clamp((scrollY-start)/distance*100,0,100);
    $('progress').value=progress;$('progress-label').textContent=Math.round(progress)+'%';
  }
  function save(){if(!restoring)write(stateKey,{...capture(),updatedAt:new Date().toISOString()});}
  $('smaller').addEventListener('click',()=>{size=clamp(size-2,16,30);applyPrefs(true);save();});
  $('larger').addEventListener('click',()=>{size=clamp(size+2,16,30);applyPrefs(true);save();});
  $('spacing').addEventListener('change',e=>{spacing=e.target.value;applyPrefs(true);save();});
  $('top').addEventListener('click',()=>{window.scrollTo({top:0,behavior:'auto'});save();});
  document.querySelectorAll('.toc a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('.toc').open=false;}));
  window.addEventListener('scroll',()=>{
    if(!progressQueued){progressQueued=true;requestAnimationFrame(()=>{updateProgress();progressQueued=false;});}
    clearTimeout(saveTimer);saveTimer=setTimeout(save,180);
  },{passive:true});
  // Keyboard events inside an iframe do not bubble into the surrounding room.
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && window.parent!==window){
      event.preventDefault();event.stopPropagation();
      window.parent.postMessage({type:'little-home-reader:close'},location.origin);
    }
  });
  window.addEventListener('resize',updateProgress);
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
  if('scrollRestoration' in history)history.scrollRestoration='manual';
  applyPrefs(false);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!location.hash)restore(read(stateKey));
    restoring=false;updateProgress();
  }));
})();
