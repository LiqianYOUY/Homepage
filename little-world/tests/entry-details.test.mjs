import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupEntryDetails}=await import('../entry-details.js');
const {createWalkCollision}=await import('../walk-collision.js?v=14');
const S=.022381665533985514,P=(x,z,y=1.57)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
const nameOf=o=>o.userData?.name||o.name||'';
async function fixture(initial={}){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url)),loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state=structuredClone(initial);const getState=()=>state,setState=patch=>{state={...state,...patch};};
 const originals=[];model.traverse(o=>{if(/^Entry door (leaf|hinge)$/.test(nameOf(o)))originals.push({object:o,position:o.position.clone(),scale:o.scale.clone()});});
 const records=[],house=setupHouseInteractions({THREE,scene,model,register:r=>records.push(r),getState,setState});
 const details=setupEntryDetails({THREE,model,house,register:r=>records.push(r),getState,setState});house.colliderRoots=[...details.colliderRoots];
 const door=house.doors.find(d=>d.id==='door-entry');return {scene,model,house,details,door,originals,records,get state(){return state;},dispose(){details.dispose();house.dispose();}};
}
// SAT on all 15 axes of the actual transformed geometry bounds. Unlike world
// AABBs this does not report false wall hits in the diagonal door's empty corners.
function obb(mesh){mesh.geometry.computeBoundingBox();mesh.updateWorldMatrix(true,false);const b=mesh.geometry.boundingBox,e=mesh.matrixWorld.elements,axes=[new THREE.Vector3(e[0],e[1],e[2]),new THREE.Vector3(e[4],e[5],e[6]),new THREE.Vector3(e[8],e[9],e[10])].map(v=>v.normalize()),points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld));return {points,axes,bounds:new THREE.Box3().setFromPoints(points)};}
function overlap(a,b,tolerance=1e-6){if(!a.bounds.intersectsBox(b.bounds))return false;const axes=[...a.axes,...b.axes];for(const aa of a.axes)for(const bb of b.axes){const axis=new THREE.Vector3().crossVectors(aa,bb);if(axis.lengthSq()>1e-12)axes.push(axis.normalize());}for(const axis of axes){const ap=a.points.map(p=>p.dot(axis)),bp=b.points.map(p=>p.dot(axis));if(Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))<=tolerance)return false;}return true;}

test('entry swing follows the source exterior lock, clears every fixed mesh for the complete 84-degree sweep and preserves the closed aperture',async()=>{
 const f=await fixture(),moving=[];f.door.object.traverse(o=>{if(o.isMesh)moving.push(o);});f.door.setOpen(0,true);
 const leafStart=new THREE.Box3().setFromObject(f.door.leaf),inside=moving.find(o=>nameOf(o)==='Entry interior door handle'),outside=moving.find(o=>nameOf(o)==='Smart lock at entry');assert.ok(inside.getWorldPosition(new THREE.Vector3()).z<outside.getWorldPosition(new THREE.Vector3()).z);assert.ok(f.door.maxAngle>0);assert.equal(f.door.swing,'outward');
 const near=new THREE.Box3(new THREE.Vector3(3.7,-.1,.1),new THREE.Vector3(5.4,2.3,2.8)),obstacles=[];
 f.model.traverse(o=>{if(o.isMesh){const shape=obb(o);if(shape.bounds.intersectsBox(near))obstacles.push({object:o,shape});}});
 assert.ok(obstacles.some(o=>nameOf(o.object)==='Entry door jamb'));assert.ok(obstacles.some(o=>nameOf(o.object).startsWith('Entry shoe cupboard')));
 for(let step=0;step<=336;step++){
   f.door.setOpen(step/336,true);
   for(const mesh of moving){const shape=obb(mesh);for(const obstacle of obstacles)assert.equal(overlap(shape,obstacle.shape),false,`${nameOf(mesh)} hits ${nameOf(obstacle.object)} at ${step/4} degrees`);}
 }
 const leafOpen=new THREE.Box3().setFromObject(f.door.leaf);assert.ok(leafOpen.getCenter(new THREE.Vector3()).z>leafStart.getCenter(new THREE.Vector3()).z+.4);assert.ok(leafOpen.min.z>f.door.closedPlaneZ,'open leaf stays outside the inside face');assert.ok(f.door.widthMetres>1.01);
 f.dispose();for(const original of f.originals){assert.ok(original.object.position.distanceTo(original.position)<1e-9);assert.ok(original.object.scale.distanceTo(original.scale)<1e-9);}
});

test('actual GLB walking reaches the entrance and cupboard aisle while all shoe doors slide, without extending the floor boundary',async()=>{
 const f=await fixture(),walk=createWalkCollision({THREE,model:f.model,house:f.house});assert.equal(f.details.audit.floorExtended,false);assert.ok(f.details.audit.clearAisleAtBenchM>.70);
 const approach=new THREE.Vector3(...f.details.audit.insideDoorApproach);f.door.setOpen(0,true);assert.equal(walk.collision(approach),true,'the real closed entrance leaf blocks the approach');f.door.setOpen(1,true);assert.equal(walk.collision(approach),false,'the outside swing releases the indoor approach');
 for(const r of f.details.records)r.setOpen(1,true);
 const path=[...f.details.audit.insideRoutePlan.map(([x,z])=>P(x,z)),approach];
 for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1],steps=Math.ceil(a.distanceTo(b)/.025);for(let n=0;n<=steps;n++)assert.equal(walk.collision(a.clone().lerp(b,n/steps)),false,'actual indoor walking path remains clear');}
 assert.equal(walk.collision(P(1156,549)),true,'shoe furniture remains a real obstacle');assert.equal(walk.collision(P(1134,600)),true,'unmodelled exterior must not become walkable');
 f.dispose();
});

test('three independent cupboard fronts persist and slide inside their cases without occupying the aisle',async()=>{
 const f=await fixture({doors:{'entry-shoe-cupboard-2':1,'door-master':.4}});assert.equal(f.details.records.length,3);assert.equal(f.details.records[1].amount,1);assert.equal(f.details.records[0].amount,0);
 const closed=f.details.records.map(r=>{r.setOpen(0,true);return new THREE.Box3().setFromObject(r.moving);});
 for(const [i,r] of f.details.records.entries()){assert.ok(r.object.children.some(o=>o.name.includes('fixed sliding front')),'fixed cabinet remains clickable when the moving leaf is concealed');r.click();assert.equal(f.state.doors[r.id],1);for(let frame=0;frame<100;frame++)f.details.update(.016);assert.ok(r.amount>.999);const open=new THREE.Box3().setFromObject(r.moving);assert.ok(Math.abs(open.min.x-closed[i].min.x)<1e-8,'fronts travel parallel to the wall');assert.ok(Math.abs(open.max.x-closed[i].max.x)<1e-8);assert.ok(open.getCenter(new THREE.Vector3()).z>closed[i].getCenter(new THREE.Vector3()).z+.19);}
 assert.equal(f.state.doors['door-master'],.4,'other saved door positions survive');const saved=structuredClone(f.state);f.dispose();const reloaded=await fixture(saved);assert.ok(reloaded.details.records.every(r=>r.amount===1));reloaded.dispose();
});

test('six pairs fit inside the slim cupboards, and the countertop carries anonymous physical keys, card, wallet and tray',async()=>{
 const f=await fixture(),audit=f.details.audit;assert.equal(audit.shoePairs,6);assert.equal(audit.personalInformation,false);assert.equal(audit.countertopObjects.length,4);
 const shoes=[],keys=[];let tray,card,wallet,counter;f.details.root.traverse(o=>{if(o.name.startsWith('Entry stored shoe '))shoes.push(o);if(o.name.startsWith('Entry brass key '))keys.push(o);if(o.name==='Entry keys access card and wallet catchall')tray=o;if(o.name==='Entry unmarked contactless access card')card=o;if(o.name==='Entry folded leather wallet')wallet=o;if(o.name==='Entry continuous oak counter')counter=o;});
 assert.equal(shoes.length,12);assert.equal(keys.length,3);assert.ok(tray&&card&&wallet&&counter);
 const counterBox=new THREE.Box3().setFromObject(counter),trayBox=new THREE.Box3().setFromObject(tray);assert.ok(trayBox.min.y>=counterBox.max.y-1e-6);assert.ok(trayBox.min.x>=counterBox.min.x&&trayBox.max.x<=counterBox.max.x);assert.ok(trayBox.min.z>=counterBox.min.z&&trayBox.max.z<=counterBox.max.z);
 for(const shoe of shoes){const unit=shoe.parent,b=new THREE.Box3().setFromObject(shoe);for(const corner of [b.min,b.max]){const local=unit.worldToLocal(corner.clone());assert.ok(Math.abs(local.z)<.104,'sloped shoes fit behind closed fronts and in front of the cabinet back');}}
 f.dispose();assert.equal(f.details.root.parent,null);assert.ok(f.details.records.every(r=>r.disabled));
});

test('shoe fronts and their pulls clear the cabinet cases and stored shoes throughout their sliding travel',async()=>{
 const f=await fixture();
 for(const r of f.details.records){const moving=[],fixed=[];r.moving.traverse(o=>{if(o.isMesh)moving.push(o);});r.object.traverse(o=>{if(o.isMesh&&!moving.includes(o))fixed.push(obb(o));});
   for(let step=0;step<=40;step++){r.setOpen(step/40,true);for(const o of moving)for(const obstacle of fixed)assert.equal(overlap(obb(o),obstacle),false,'sliding front must not cut into the case, other front or stored shoes');}
 }
 f.dispose();
});
