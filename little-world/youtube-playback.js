// Loading the API is shared by every television instance in this window. The
// iframe itself stays usable even when its optional JavaScript API cannot load.
const apiLoads=new WeakMap();

function subscribe(entry){
 entry.subscribers++;
 let released=false;
 return {promise:entry.promise,release(){
  if(released)return;released=true;entry.subscribers--;
  if(!entry.settled&&entry.subscribers===0)entry.cancel();
 }};
}

function loadYouTubeAPI(windowRef,documentRef){
 if(windowRef.YT?.Player)return {promise:Promise.resolve(windowRef.YT),release(){}};
 const pending=apiLoads.get(windowRef);if(pending)return subscribe(pending);
 const script=documentRef.createElement('script');
 const hadCallback=Object.prototype.hasOwnProperty.call(windowRef,'onYouTubeIframeAPIReady');
 const previous=windowRef.onYouTubeIframeAPIReady;
 let resolve,reject;
 const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 const entry={promise,subscribers:0,settled:false,cancel:()=>finish(Error('YouTube API request cancelled'))};apiLoads.set(windowRef,entry);
 function finish(error){
  if(entry.settled)return;entry.settled=true;script.onerror=null;
  if(windowRef.onYouTubeIframeAPIReady===ready){
   if(hadCallback)windowRef.onYouTubeIframeAPIReady=previous;
   else delete windowRef.onYouTubeIframeAPIReady;
  }
  if(apiLoads.get(windowRef)===entry)apiLoads.delete(windowRef);
  if(error){script.remove();reject(error);}else resolve(windowRef.YT);
 }
 function ready(...args){
  if(entry.settled)return;
  // Preserve another embed's ready callback, including its `this` value. A
  // failure in that integration must not break this player or the page.
  try{if(typeof previous==='function')previous.apply(windowRef,args);}catch{}
  finish(windowRef.YT?.Player?null:Error('YouTube API unavailable'));
 }
 windowRef.onYouTubeIframeAPIReady=ready;
 script.src='https://www.youtube.com/iframe_api';script.async=true;
 script.onerror=()=>finish(Error('YouTube API request failed'));
 const subscription=subscribe(entry);
 try{documentRef.head.append(script);}catch(error){finish(error);}
 return subscription;
}

export function connectYouTube({iframe,resume=null,onStatus=()=>{},windowRef=window,documentRef=document,timeoutMs=15000,timers={setTimeout:(fn,ms)=>globalThis.setTimeout(fn,ms),clearTimeout:id=>globalThis.clearTimeout(id)}}){
 let disposed=false,player=null,ready=false;
 const notify=status=>{if(!disposed)onStatus(status);};
 let connectionTimer=timers.setTimeout(()=>{connectionTimer=null;notify({state:'slow'});},timeoutMs);
 const connected=()=>{if(connectionTimer!==null){timers.clearTimeout(connectionTimer);connectionTimer=null;}};
 notify({state:'loading'});
 const api=loadYouTubeAPI(windowRef,documentRef);
 api.promise.then(YT=>{
  if(disposed)return;
  player=new YT.Player(iframe,{events:{
   onReady:event=>{
    if(disposed)return;ready=true;connected();notify({state:'ready'});
    const target=event.target;
    if(resume){
     target.seekTo(Math.max(0,Number(resume.time)||0),true);
     target.setVolume(Number.isFinite(resume.volume)?Math.max(0,Math.min(100,resume.volume)):100);
     if(resume.muted)target.mute();else target.unMute();
     if(resume.paused)target.pauseVideo();else target.playVideo();
    }else{target.mute();target.playVideo();}
    // An existing iframe may have started before the API subscribed, so it
    // will not necessarily send another PLAYING event after playVideo().
    if(!resume?.paused){
     try{const state=target.getPlayerState();if(state===1||state===3)notify({state:state===1?'playing':'buffering'});}catch{}
    }
   },
   onStateChange:event=>{
    if(disposed||![-1,0,1,2,3,5].includes(event.data))return;
    connected();notify({state:event.data===1?'playing':event.data===3?'buffering':'ready'});
   },
   onAutoplayBlocked:()=>{if(disposed)return;connected();notify({state:'autoplay-blocked'});},
   onError:event=>{if(disposed)return;connected();notify({state:'error',code:event.data});}
  }});
 }).catch(()=>{if(disposed)return;connected();notify({state:'api-unavailable'});});
 return {
  getSnapshot(){
   if(disposed||!ready||!player)return null;
   try{
    const state=player.getPlayerState(),pending=state===-1||state===5;
    // Until playback starts, queued seek/mute/volume commands may not yet be
    // reflected in API getters. A quick projection change keeps that intent.
    const time=pending&&Number.isFinite(resume?.time)?resume.time:player.getCurrentTime();
    const volume=pending&&Number.isFinite(resume?.volume)?resume.volume:player.getVolume();
    return {time:Number.isFinite(time)?Math.max(0,time):0,paused:pending?!!resume?.paused:state!==1&&state!==3,muted:pending?(resume?.muted??true):player.isMuted()!==false,volume:Number.isFinite(volume)?volume:100};
   }catch{return null;}
  },
  destroy(){
   if(disposed)return;disposed=true;connected();api.release();
   try{player?.destroy();}catch{}player=null;
  }
 };
}
