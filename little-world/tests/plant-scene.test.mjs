import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupLivingRoom}=await import('../living-room.js');
const {setupRoomRenovation}=await import('../room-renovation.js?v=14');
const {setupSmartHome}=await import('../smart-home.js?v=14');
const {setupTerrace}=await import('../terrace-v7.js?v=14');
const {createPlantLifecycle,DAY}=await import('../plant-lifecycle.js?v=14');
const {createWalkCollision}=await import('../walk-collision.js?v=14');

async function fixture(){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
 // Keep every real mesh and transform; image decoding is irrelevant to collision.
 const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state={};
 const getState=()=>state,setState=patch=>{for(const [key,value] of Object.entries(patch))state[key]={...state[key],...value};};
 const life=createPlantLifecycle({getState,setState});setupLivingRoom({THREE,model});setupRoomRenovation({THREE,model});
 const smart=setupSmartHome({THREE,scene,model,getState,setState,plantLife:life,navigation:JSON.parse(fs.readFileSync(new URL('../cat-navigation.json',import.meta.url),'utf8'))});
 const terrace=setupTerrace({THREE,model,getState,setState,plantLife:life,onDoorOpen:()=>smart.setCurtains(true)});smart.setGardenTerrace(terrace);
 let elapsed=0;return {scene,model,life,smart,terrace,state,step(){elapsed+=.1;terrace.update(.1,elapsed);smart.update(.1,elapsed);},wither(id){const t=Date.now();state.gardenWorld.beds[id]={id,species:'lavender',plantedAt:t-60*DAY,lastWateredAt:t-30*DAY,lastFertilizedAt:t-30*DAY,witheredAt:t-2*DAY,witherCause:'dry'};life.refresh();},dispose(){smart.dispose();terrace.dispose();}};
}

test('all eight real terrace beds are reached, cleaned on arrival, then the robot returns without jumps',async()=>{
 const f=await fixture();for(let i=0;i<8;i++)f.wither('terrace-bed-'+i);const last=f.smart.vacuum.position.clone();let travelled=0,visitedTerrace=false,maxStep=0;
 for(let i=0;i<20000;i++){const before=f.terrace.listBeds().filter(b=>b.canClear).length;f.step();const d=last.distanceTo(f.smart.vacuum.position);maxStep=Math.max(maxStep,d);travelled+=d;last.copy(f.smart.vacuum.position);visitedTerrace ||=last.z< -4.8;
   if(f.terrace.listBeds().filter(b=>b.canClear).length<before)assert.ok(last.z< -6.0,'cleanup must occur at a planter, not at the dock');
   if(f.terrace.listBeds().every(b=>b.phase==='empty')&&f.smart.getStatus().vacuum.mode==='docked')break;
 }
 assert.equal(f.smart.getStatus().vacuum.cleaned,8);assert.ok(f.terrace.listBeds().every(b=>b.clearedBy==='robot'));assert.equal(f.smart.getStatus().vacuum.mode,'docked');assert.ok(visitedTerrace);assert.ok(travelled>80);assert.ok(maxStep<.05,`largest step: ${maxStep}`);assert.ok(f.smart.audit.vacuum.terrace.lastRoutePoints>20);f.dispose();
});

test('a closed sliding leaf obstructs a queued cleaning route instead of being ignored',async()=>{
 const f=await fixture();f.wither('terrace-bed-3');const door=f.terrace.doors.find(d=>d.id==='terrace-living');
 for(let i=0;i<20;i++){f.step();door.target=0;door.amount=0;door.object.position.x=door.baseX;door.object.updateMatrixWorld(true);}
 assert.equal(f.life.getBed('terrace-bed-3').phase,'withered');
 assert.ok(f.smart.vacuum.position.z> -4.8,'the robot must remain inside while the leaf is closed');
 // Release the real door and let the normal route complete.
 f.terrace.requestRobotAccess();for(let i=0;i<1500;i++){f.step();if(f.life.getBed('terrace-bed-3').phase==='empty'&&f.smart.getStatus().vacuum.mode==='docked')break;}
 assert.equal(f.life.getBed('terrace-bed-3').phase,'empty');f.dispose();
});

test('three vases sit on the actual tabletop surfaces and share one cutting inventory',async()=>{
 const f=await fixture();assert.deepEqual(f.smart.vaseObjects.map(v=>v.id),['living','dining','balcony']);
 const tops=['Living coffee table rounded solid oak top','Dining table top','Wintergarden table top'];
 f.smart.vaseObjects.forEach((v,i)=>{let table;f.model.traverse(o=>{if((o.userData?.name||o.name)===tops[i])table=o;});const b=new THREE.Box3().setFromObject(table);assert.ok(Math.abs(v.object.position.y-b.max.y-.002)<1e-6);assert.ok(v.object.position.x>b.min.x&&v.object.position.x<b.max.x);assert.ok(v.object.position.z>b.min.z&&v.object.position.z<b.max.z);});
 const bed=f.terrace.getBed('terrace-bed-0');assert.equal(bed.phase,'flowering');assert.ok(f.life.harvest(bed.id).ok);assert.ok(f.smart.arrangeFlowers('living').ok);assert.equal(f.life.availableCuttings().length,0);assert.ok(f.smart.vaseObjects[0].stems.children.length>0);assert.equal(f.smart.arrangeFlowers('dining').ok,false);f.dispose();
});

test('the indoor balcony uses a real moving door for both walking and robot cleanup',async()=>{
 const f=await fixture(),walk=createWalkCollision({THREE,model:f.model,house:{colliderRoots:[...f.smart.colliderRoots,...f.terrace.colliderRoots]}}),doorway=new THREE.Vector3(-9.33315452767196,1.57,.095);
 assert.equal(walk.collision(doorway),true,'closed glass must block walking');
 f.smart.setIndoorDoor(true);for(let i=0;i<30;i++)f.step();assert.equal(walk.collision(doorway),false,'opened leaf must not leave a phantom glass collider');
 f.smart.setIndoorDoor(false);for(let i=0;i<30;i++)f.step();assert.equal(walk.collision(doorway),true);
 f.wither('indoor-planter');let entered=false,previous=f.smart.vacuum.position.clone(),maxStep=0;
 for(let i=0;i<2000;i++){f.step();const position=f.smart.vacuum.position;entered ||=position.x< -10;maxStep=Math.max(maxStep,position.distanceTo(previous));previous.copy(position);if(f.life.getBed('indoor-planter').phase==='empty'&&f.smart.getStatus().vacuum.mode==='docked')break;}
 assert.ok(entered);assert.ok(maxStep<.05);assert.equal(f.life.getBed('indoor-planter').clearedBy,'robot');assert.equal(f.smart.getStatus().vacuum.mode,'docked');f.dispose();
});

test('ordinary spill routes use final furniture and drop removed furniture colliders',async()=>{
 const f=await fixture(),baseline=f.smart.audit.vacuum.acceptedEdges;
 f.smart.setVacuumAuto(false);
 const foot=new THREE.Mesh(new THREE.BoxGeometry(.20,.25,.20),new THREE.MeshStandardMaterial());foot.name='Replacement studio desk foot';foot.position.set(-7,.125,-.4);foot.userData.category='furniture';f.scene.add(foot);
 f.smart.setGardenTerrace(f.terrace);
 assert.ok(f.smart.audit.vacuum.acceptedEdges<baseline,'new solid furniture must remove blocked graph edges');
 const spill=f.smart.addMess(foot.position);assert.equal(spill.reachable,false,'a spill beneath an actual solid must not be silently cleaned');
 foot.removeFromParent();f.smart.setGardenTerrace(f.terrace);
 assert.equal(f.smart.audit.vacuum.acceptedEdges,baseline,'removed furniture must leave no ghost collider');
 assert.equal(spill.reachable,true,'existing spills must be reprojected onto the refreshed graph');
 assert.equal(f.smart.audit.vacuum.staticGeometrySource,'Final furnished scene');
 foot.geometry.dispose();foot.material.dispose();f.dispose();
});
