import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../vendor/three.module.js';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,nextResolve){return nextResolve(specifier==='three'?new URL('../vendor/three.module.js',import.meta.url).href:specifier,context);}});
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
import {createPianoAudio,frequencyForMidi,PIANO_KEYS} from '../piano.js?v=14';
import {setupStudio} from '../studio.js?v=14';
import {createWalkCollision} from '../walk-collision.js?v=14';

class AudioParameter {
 constructor(){this.value=0;this.calls=[];}
 setValueAtTime(...args){this.calls.push(['set',...args]);}
 exponentialRampToValueAtTime(...args){this.calls.push(['ramp',...args]);}
 setTargetAtTime(...args){this.calls.push(['target',...args]);}
 cancelScheduledValues(...args){this.calls.push(['cancel',...args]);}
}
class AudioNode {
 constructor(){this.gain=new AudioParameter();this.frequency=new AudioParameter();this.Q={value:0};this.stops=[];}
 connect(){} disconnect(){} start(){} stop(time){this.stops.push(time);}
}
class FakeAudioContext {
 static contexts=[];
 constructor(){FakeAudioContext.contexts.push(this);this.currentTime=10;this.state='running';this.destination={};this.oscillators=[];this.closed=false;}
 createGain(){return new AudioNode();}
 createBiquadFilter(){return new AudioNode();}
 createOscillator(){const oscillator=new AudioNode();this.oscillators.push(oscillator);return oscillator;}
 close(){this.closed=true;}
}

test('the two-octave piano has correctly tuned pitches and the physical white/black arrangement',()=>{
 assert.equal(frequencyForMidi(69),440);
 assert.ok(Math.abs(frequencyForMidi(60)-261.6255653)<.00001);
 assert.equal(frequencyForMidi(72),2*frequencyForMidi(60));
 assert.equal(PIANO_KEYS.length,25);assert.equal(PIANO_KEYS.filter(key=>!key.black).length,15);assert.equal(PIANO_KEYS.filter(key=>key.black).length,10);
 assert.deepEqual([PIANO_KEYS[0].name,PIANO_KEYS.at(-1).name],['C4','C6']);
});

test('audio is gesture-created, supports chords, and releases held and sustained notes',()=>{
 FakeAudioContext.contexts=[];const audio=createPianoAudio({AudioContextClass:FakeAudioContext});
 assert.equal(FakeAudioContext.contexts.length,0);
 [60,64,67].forEach(note=>assert.equal(audio.start(note),true));
 assert.equal(FakeAudioContext.contexts.length,1);assert.equal(audio.activeVoiceCount,3);
 audio.release(60);assert.equal(audio.activeVoiceCount,2);
 audio.setSustain(true);audio.release(64);audio.release(67);assert.equal(audio.activeVoiceCount,2);
 audio.setSustain(false);assert.equal(audio.activeVoiceCount,0);
 audio.start(72);audio.setSustain(true);audio.release(72);audio.stopAll();assert.equal(audio.activeVoiceCount,0);
 const context=FakeAudioContext.contexts[0];assert.ok(context.oscillators.every(oscillator=>oscillator.stops.some(time=>time<context.currentTime+1)));
 audio.dispose();assert.equal(context.closed,true);
});

test('polyphony remains bounded and missing browser audio has a useful message',()=>{
 const audio=createPianoAudio({AudioContextClass:FakeAudioContext});for(let midi=48;midi<80;midi++)audio.start(midi);assert.equal(audio.activeVoiceCount,16);audio.dispose();
 let error='';const unsupported=createPianoAudio({AudioContextClass:null,onError:message=>error=message});assert.equal(unsupported.start(60),false);assert.match(error,/无法播放/);assert.equal(unsupported.activeVoiceCount,0);
});

test('the main monitor opens the portfolio, a 61-key keyboard replaces the slab, and desktop props and anchors rise together',async()=>{
 const bytes=await readFile(new URL('../apartment.glb',import.meta.url));
 const gltf=await new GLTFLoader().register(()=>({name:'test_texture_stub',loadTexture:()=>Promise.resolve(new THREE.Texture())})).parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const model=gltf.scene,scene=new THREE.Scene();scene.add(model);model.updateMatrixWorld(true);
 const previousDocument=globalThis.document,previousWindow=globalThis.window;
 globalThis.document={createElement:()=>{const text=[],context=new Proxy({fillText:value=>text.push(value)},{get:(target,key)=>target[key]||(()=>{})});return {width:0,height:0,text,getContext:()=>context};}};globalThis.window={addEventListener(){}};
 try{
  let openedPortfolio=0,openedNotes=0;const records=new Map(),state={settings:{},notes:[],papers:[],smart:{lightsOn:true}};
  const studio=setupStudio({THREE,scene,model,register:record=>{records.set(record.id,record);record.object.traverse(object=>{if(object.isMesh)object.userData.interactionId=record.id;});},openNotes(){openedNotes++;},openLibrary(){},openMusic(){},openPortfolio(){openedPortfolio++;},getState:()=>state,setState:patch=>Object.assign(state.settings,patch.settings),toast(){}});
  const position=name=>scene.getObjectByName(name).getWorldPosition(new THREE.Vector3()).y;
  const names=['Study_monitor','Main monitor portfolio screen','Study compact keyboard with individual keys','MoodBall studio companion','Study reading lamp','Study noise cancelling headphones and stand'],before=names.map(position);
  const feet=position('Study electric desk fixed feet'),chair=position('Study ergonomic mesh task chair'),anchor=records.get('portfolio').anchor.y;
  assert.ok(studio.audit.removedMeshes.length>=9);assert.equal(model.getObjectByName('Study_chair_seat'),undefined);
  assert.equal(scene.getObjectByName('Portfolio desktop display'),undefined);assert.equal(scene.getObjectByName('Portfolio tablet frame'),undefined);assert.equal(scene.getObjectByName('Study_keyboard'),undefined);assert.equal(records.has('desk-notes'),false);
  assert.equal(records.get('portfolio').label,'作品集');records.get('portfolio').click();assert.equal(openedPortfolio,1);assert.equal(openedNotes,0);records.get('inspiration').click();assert.equal(openedNotes,1);
  const drawn=studio.portfolioTexture.canvas.text;assert.ok(drawn.includes('作品集'));assert.ok(!drawn.includes('A few little ideas'));const drawCount=drawn.length;studio.updateNotes([{text:'A note must not replace the portfolio screen'}]);assert.equal(drawn.length,drawCount);
  const keycaps=scene.getObjectByName('Study keyboard individual keycaps');assert.equal(keycaps.count,61);assert.equal(keycaps.userData.interactionId,'portfolio');assert.equal(studio.audit.portfolioMonitorCount,1);
  const keyBoxes=[];for(let i=0;i<keycaps.count;i++){const matrix=new THREE.Matrix4();keycaps.getMatrixAt(i,matrix);keyBoxes.push(new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(matrix));}
  for(let i=0;i<keyBoxes.length;i++){const box=keyBoxes[i];assert.ok(box.min.x>=-.195&&box.max.x<=.195);assert.ok(box.min.z>=-.075&&box.max.z<=.075);for(let j=0;j<i;j++)assert.equal(box.intersectsBox(keyBoxes[j]),false,'every key is separated from its neighbours');}
  const headsetBounds=new THREE.Box3().setFromObject(studio.headphones),desktopBounds=new THREE.Box3().setFromObject(scene.getObjectByName('Study graphite sit stand desktop'));
  assert.ok(Math.abs(headsetBounds.min.y-desktopBounds.max.y)<.0001,'the headphone stand rests on the desktop');
  for(const axis of ['x','z'])assert.ok(headsetBounds.min[axis]>desktopBounds.min[axis]&&headsetBounds.max[axis]<desktopBounds.max[axis],'the full headset stays inside the desktop');
  for(const name of names.slice(0,-1))assert.equal(headsetBounds.intersectsBox(new THREE.Box3().setFromObject(scene.getObjectByName(name))),false,'the headphones stay clear of '+name);

  const walker=createWalkCollision({THREE,model,house:{colliderRoots:studio.colliderRoots}});
  // This aisle is clear of the real desk and chair. A raw 1m instancing cube would incorrectly block it.
  const keyboardAisle=new THREE.Vector3(2.14,1.57,-2.72),desktopInterior=new THREE.Vector3(1.69,1.57,-3.0);
  assert.equal(walker.collision(keyboardAisle),false,'the instanced keyboard must not create a unit-box obstacle in the aisle');
  assert.equal(walker.collision(desktopInterior),true,'the real desk still blocks walking through its footprint');
  records.get('desk-lift').click();for(let i=0;i<180;i++)studio.update(1/60,i/60);
  assert.equal(walker.collision(keyboardAisle),false,'raising the keyboard must keep the adjacent aisle clear');
  assert.equal(walker.collision(desktopInterior),true,'the raised desk must remain a real obstacle');
  names.forEach((name,i)=>assert.ok(Math.abs(position(name)-before[i]-.34)<.0002,name));
  assert.ok(Math.abs(records.get('portfolio').anchor.y-anchor-.34)<.0002);
  assert.equal(position('Study electric desk fixed feet'),feet);assert.equal(position('Study ergonomic mesh task chair'),chair);
  assert.equal(scene.getObjectByName('Study desk height keypad').userData.interactionId,'desk-lift');assert.equal(scene.getObjectByName('Main monitor portfolio screen').userData.interactionId,'portfolio');assert.equal(scene.getObjectByName('Study lamp stem').userData.interactionId,'desk-lamp');
  assert.ok(studio.colliderRoots.includes(studio.workstation));assert.ok(studio.colliderRoots.includes(studio.chair));
  records.get('desk-lift').click();state.settings.reducedMotion=true;studio.update(1/60,4);assert.equal(studio.workstation.position.y,0);
 }finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});
