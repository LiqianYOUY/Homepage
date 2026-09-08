import test from 'node:test';
import assert from 'node:assert/strict';
import {connectYouTube} from '../youtube-playback.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({loaded=true,callback}={}){
 const states=[],players=[],scripts=[],jobs=new Map();let nextJob=0;
 const timers={setTimeout(fn,ms){const id=++nextJob;jobs.set(id,{fn,ms});return id;},clearTimeout(id){jobs.delete(id);}};
 const documentRef={createElement:()=>({remove(){this.removed=true;}}),head:{append(script){scripts.push(script);}}};
 class Player{
  constructor(iframe,{events}){this.events=events;this.iframe=iframe;this.calls=[];this.state=-1;this.time=0;this.volume=100;this.muted=true;players.push(this);}
  seekTo(...args){this.calls.push(['seekTo',...args]);this.time=args[0];}
  setVolume(volume){this.calls.push(['setVolume',volume]);this.volume=volume;}
  mute(){this.calls.push(['mute']);this.muted=true;}
  unMute(){this.calls.push(['unMute']);this.muted=false;}
  playVideo(){this.calls.push(['playVideo']);}
  pauseVideo(){this.calls.push(['pauseVideo']);this.state=2;}
  getPlayerState(){return this.state;}
  getCurrentTime(){return this.time;}
  getVolume(){return this.volume;}
  isMuted(){return this.muted;}
  destroy(){this.destroyed=true;}
  emit(name,data){if(name==='onStateChange')this.state=data;this.events[name]({target:this,data});}
 }
 const windowRef={};if(loaded)windowRef.YT={Player};if(callback)windowRef.onYouTubeIframeAPIReady=callback;
 function connect(options={}){return connectYouTube({iframe:{id:'test-player'},onStatus:status=>states.push(status),windowRef,documentRef,timers,...options});}
 function expire(){for(const [id,job] of [...jobs]){jobs.delete(id);job.fn();}}
 function load(){windowRef.YT={Player};windowRef.onYouTubeIframeAPIReady();}
 return {connect,states,players,scripts,windowRef,jobs,expire,load,Player};
}

test('default timers keep the browser global receiver instead of binding the timers object',()=>{
 const originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout;
 const calls=[];let connection;
 try{
  globalThis.setTimeout=function(fn,ms){assert.equal(this,globalThis,'browser setTimeout requires its Window receiver');calls.push(['set',ms]);return 724;};
  globalThis.clearTimeout=function(id){assert.equal(this,globalThis,'browser clearTimeout requires its Window receiver');calls.push(['clear',id]);};
  const f=fixture();connection=f.connect({timers:undefined});connection.destroy();
  assert.deepEqual(calls,[['set',15000],['clear',724]]);
 }finally{
  try{connection?.destroy();}finally{globalThis.setTimeout=originalSetTimeout;globalThis.clearTimeout=originalClearTimeout;}
 }
});

test('a ready player is connected even when it has not started playback',async()=>{
 const f=fixture(),connection=f.connect();assert.equal(connection.getSnapshot(),null);await flush();
 f.players[0].emit('onReady');assert.deepEqual(f.states,[{state:'loading'},{state:'ready'}]);
 assert.equal(f.jobs.size,0);f.expire();assert.equal(f.states.at(-1).state,'ready');
 assert.deepEqual(f.players[0].calls,[['mute'],['playVideo']]);connection.destroy();
});

test('onReady discovers an iframe already playing or buffering before API subscription',async()=>{
 for(const state of [1,3]){
  const f=fixture(),connection=f.connect();await flush();const player=f.players[0];player.state=state;
  player.emit('onReady');assert.equal(f.states.at(-1).state,state===1?'playing':'buffering');
  assert.equal(f.jobs.size,0);connection.destroy();
 }
 const f=fixture(),connection=f.connect({resume:{time:12,paused:true,muted:true,volume:40}});await flush();const player=f.players[0];player.state=1;
 player.pauseVideo=function(){this.calls.push(['pauseVideo']);}; // The real pause command is asynchronous.
 player.emit('onReady');assert.equal(f.states.at(-1).state,'ready','an explicit restored pause wins over the old playing state');connection.destroy();
});

test('quick projection changes preserve play and mute intent while queued commands are pending',async()=>{
 for(const state of [-1,5])for(const resume of [null,{time:27,paused:false,muted:true,volume:36},{time:31,paused:true,muted:false,volume:0}]){
  const f=fixture(),connection=f.connect({resume});await flush();const player=f.players[0];player.state=state;
  // Emulate iframe commands sent through postMessage before getters catch up.
  for(const method of ['seekTo','setVolume','mute','unMute','playVideo','pauseVideo'])player[method]=()=>{};
  player.muted=false;player.emit('onReady');
  const expected=resume||{time:0,paused:false,muted:true,volume:100};
  assert.deepEqual(connection.getSnapshot(),expected,`pending state ${state} retains intended playback`);
  player.state=2;player.time=43;player.muted=false;player.volume=67;
  assert.deepEqual(connection.getSnapshot(),{time:43,paused:true,muted:false,volume:67},'a settled state uses actual player values');connection.destroy();
 }
});

test('autoplay blocking preserves the player and is not a connection error',async()=>{
 const f=fixture(),connection=f.connect();await flush();const player=f.players[0];
 player.emit('onReady');player.emit('onAutoplayBlocked');f.expire();
 assert.deepEqual(f.states.at(-1),{state:'autoplay-blocked'});assert.ok(!player.destroyed);
 player.emit('onStateChange',1);assert.deepEqual(f.states.at(-1),{state:'playing'});connection.destroy();
});

test('a slow API can recover after the advisory timeout',async()=>{
 const f=fixture({loaded:false}),connection=f.connect();f.expire();
 assert.deepEqual(f.states.at(-1),{state:'slow'});assert.ok(!f.scripts[0].removed);
 f.load();await flush();f.players[0].emit('onReady');assert.deepEqual(f.states.at(-1),{state:'ready'});connection.destroy();
});

test('valid player states clear the connection timer without requiring PLAYING',async()=>{
 for(const state of [-1,0,1,2,3,5]){
  const f=fixture(),connection=f.connect();await flush();f.players[0].emit('onStateChange',state);f.expire();
  assert.equal(f.states.at(-1).state,state===1?'playing':state===3?'buffering':'ready');assert.equal(f.jobs.size,0);connection.destroy();
 }
});

test('real YouTube errors retain the specific diagnostic code',async()=>{
 for(const code of [2,5,100,101,150,153]){
  const f=fixture(),connection=f.connect();await flush();f.players[0].emit('onError',code);f.expire();
  assert.deepEqual(f.states.at(-1),{state:'error',code});connection.destroy();
 }
});

test('closing while API loading suppresses old asynchronous work',async()=>{
 const f=fixture({loaded:false}),connection=f.connect(),oldReady=f.windowRef.onYouTubeIframeAPIReady;
 connection.destroy();oldReady();await flush();f.expire();assert.ok(f.scripts[0].removed);
 assert.equal(f.players.length,0);assert.deepEqual(f.states,[{state:'loading'}]);assert.equal(connection.getSnapshot(),null);
});

test('retry after a stalled request creates a new script and ignores old load events',async()=>{
 let called=0;const callback=()=>called++;
 const f=fixture({loaded:false,callback}),first=f.connect(),oldReady=f.windowRef.onYouTubeIframeAPIReady,oldError=f.scripts[0].onerror;
 f.expire();assert.deepEqual(f.states.at(-1),{state:'slow'});first.destroy();
 assert.ok(f.scripts[0].removed);assert.equal(f.windowRef.onYouTubeIframeAPIReady,callback);
 const states=[],retry=f.connect({onStatus:status=>states.push(status)}),newReady=f.windowRef.onYouTubeIframeAPIReady;
 assert.equal(f.scripts.length,2);oldReady();oldError();await flush();
 assert.equal(f.windowRef.onYouTubeIframeAPIReady,newReady);assert.equal(called,0);assert.ok(!f.scripts[1].removed);
 assert.deepEqual(states,[{state:'loading'}]);assert.equal(f.players.length,0);
 f.load();await flush();assert.equal(called,1);f.players[0].emit('onReady');assert.equal(states.at(-1).state,'ready');retry.destroy();
});

test('closing one subscriber keeps a shared request alive for the other player',async()=>{
 const f=fixture({loaded:false}),first=f.connect(),states=[],second=f.connect({onStatus:status=>states.push(status)});
 assert.equal(f.scripts.length,1);const ready=f.windowRef.onYouTubeIframeAPIReady;first.destroy();first.destroy();
 assert.ok(!f.scripts[0].removed);assert.equal(f.windowRef.onYouTubeIframeAPIReady,ready);
 f.load();await flush();assert.equal(f.players.length,1);f.players[0].emit('onReady');
 assert.equal(states.at(-1).state,'ready');assert.deepEqual(f.states,[{state:'loading'}]);second.destroy();
});

test('channel changes ignore stale player events and destroy each player once',async()=>{
 const f=fixture(),first=f.connect();await flush();const old=f.players[0];old.emit('onReady');first.destroy();first.destroy();
 const states=[];const second=f.connect({onStatus:status=>states.push(status)});await flush();const next=f.players[1];
 for(const name of ['onReady','onAutoplayBlocked','onError','onStateChange'])old.emit(name,153);
 assert.ok(old.destroyed);assert.equal(first.getSnapshot(),null);assert.deepEqual(states,[{state:'loading'}]);
 next.emit('onReady');assert.equal(states.at(-1).state,'ready');second.destroy();
});

test('failed shared API loading cleans its script and supports retry',async()=>{
 let called=0;const callback=function(){called++;assert.equal(this,f.windowRef);};
 const f=fixture({loaded:false,callback}),first=f.connect(),second=f.connect();assert.equal(f.scripts.length,1);
 f.scripts[0].onerror();await flush();assert.ok(f.scripts[0].removed);
 assert.equal(f.windowRef.onYouTubeIframeAPIReady,callback);assert.equal(f.states.filter(s=>s.state==='api-unavailable').length,2);
 first.destroy();second.destroy();const retry=f.connect();assert.equal(f.scripts.length,2);f.load();await flush();
 assert.equal(called,1);assert.equal(f.windowRef.onYouTubeIframeAPIReady,callback);assert.equal(f.players.length,1);retry.destroy();
});

test('another integration replacing the ready callback is not overwritten during cleanup',async()=>{
 const f=fixture({loaded:false}),connection=f.connect(),ours=f.windowRef.onYouTubeIframeAPIReady;
 const external=()=>ours();f.windowRef.onYouTubeIframeAPIReady=external;f.load();await flush();
 assert.equal(f.windowRef.onYouTubeIframeAPIReady,external);assert.equal(f.players.length,1);connection.destroy();
});

test('an exception in another integration does not escape or prevent API readiness',async()=>{
 const callback=()=>{throw Error('An unrelated embed failed');};
 const f=fixture({loaded:false,callback}),connection=f.connect();assert.doesNotThrow(()=>f.load());await flush();
 assert.equal(f.windowRef.onYouTubeIframeAPIReady,callback);assert.equal(f.players.length,1);
 f.players[0].emit('onReady');assert.equal(f.states.at(-1).state,'ready');connection.destroy();
});

test('a restored paused video keeps its timestamp, mute and zero volume',async()=>{
 const f=fixture(),resume={time:82.5,paused:true,muted:false,volume:0},connection=f.connect({resume});await flush();const player=f.players[0];
 player.emit('onReady');assert.deepEqual(player.calls,[['seekTo',82.5,true],['setVolume',0],['unMute'],['pauseVideo']]);
 assert.deepEqual(connection.getSnapshot(),resume);f.expire();assert.equal(f.states.at(-1).state,'ready');connection.destroy();
});

test('a restored playing video resumes and a buffering snapshot stays in playback',async()=>{
 const f=fixture(),connection=f.connect({resume:{time:14,paused:false,muted:true,volume:36}});await flush();const player=f.players[0];
 player.emit('onReady');assert.deepEqual(player.calls,[['seekTo',14,true],['setVolume',36],['mute'],['playVideo']]);
 player.emit('onStateChange',3);assert.deepEqual(connection.getSnapshot(),{time:14,paused:false,muted:true,volume:36});connection.destroy();
});
