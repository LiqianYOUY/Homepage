import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupRoomRenovation}=await import('../room-renovation.js?v=13');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupBathroomRefinement}=await import('../bathroom-refinement.js?v=13');
const {setupCabinetryV7}=await import('../cabinetry-v7.js?v=13');
const {createWalkCollision}=await import('../walk-collision.js?v=13');

async function fixture(){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state={};const params={THREE,scene,model,register:()=>{},getState:()=>state,setState:p=>state={...state,...p}};
 setupRoomRenovation(params);const house=setupHouseInteractions(params),bath=setupBathroomRefinement({...params,house}),cabinetry=setupCabinetryV7({...params,house});bath.finalizeCabinetry();house.colliderRoots=cabinetry.colliderRoots;
 const walk=createWalkCollision({...params,house});model.updateMatrixWorld(true);const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
 return {model,scene,house,bath,cabinetry,walk,meshes};
}
const f=await fixture(),raw=o=>o.userData?.name||o.name;

test('all 13 bath and sink fixtures have measurable open cavities, with no former cap beneath them',()=>{
 assert.equal(f.bath.fixtures.length,13);const ray=new THREE.Raycaster();
 for(const fixture of f.bath.fixtures){
  for(const dx of [0,fixture.innerX?fixture.innerX*.45:0]){
   ray.set(new THREE.Vector3(fixture.x+dx,fixture.top+.015,fixture.z),new THREE.Vector3(0,-1,0));
   const hits=ray.intersectObjects(f.meshes,false).filter(h=>h.object.visible&&h.point.y<fixture.top+.014);
   assert.ok(hits.length,fixture.name+' must have a closed interior floor');
   const depth=fixture.top-hits[0].point.y;
   assert.ok(depth>=(fixture.kind==='shower'?.022:.085),`${fixture.name}: cavity obscured by ${raw(hits[0].object)} at depth ${depth}`);
  }
 }
 assert.equal(f.meshes.filter(o=>/^(Master bath (inner|water)|Master basin inset|Island sink (bowl|rim)|(?:Bathroom[23] toilet|Master WC) opening)$/.test(raw(o))).length,0);
});

test('the kitchen bowl cuts through both the counter and the new cabinetry shelf/divider',()=>{
 const sink=f.bath.fixtures.find(x=>x.name==='Kitchen island sink'),ray=new THREE.Raycaster();
 for(const [dx,dz] of [[0,0],[.08,-.20],[-.08,.13]]){
  ray.set(new THREE.Vector3(sink.x+dx,1.00,sink.z+dz),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(f.meshes,false)[0];
  assert.ok(hit.point.y<.79,`bowl blocked by ${raw(hit.object)} at ${hit.point.y}`);
 }
 assert.ok(f.bath.audit.countertopAndCabinetCutouts.some(c=>c.name==='中岛储物柜 fixed case shelf'));
});

test('laundry tile covers the formerly exposed west-side oak strip and remains walkable',()=>{
 const floor=f.meshes.find(o=>raw(o)==='Laundry continuous limestone tile floor'),b=new THREE.Box3().setFromObject(floor);
 assert.ok(b.min.x<1.01);assert.ok(b.max.x>3.5);const ray=new THREE.Raycaster(new THREE.Vector3(1.22,.09,-1.3),new THREE.Vector3(0,-1,0)),first=ray.intersectObjects(f.meshes,false)[0];assert.equal(first.object,floor);assert.ok(Math.abs(first.point.y-.015)<1e-6);
 assert.equal(f.walk.collision(new THREE.Vector3(1.25,1.57,-1.0)),false);
});

test('active taps end on the actual inner porcelain/steel floor, rather than floating above the basin',()=>{
 assert.equal(f.bath.audit.updatedTapImpacts.length,3);
 for(const {id,newY,oldY} of f.bath.audit.updatedTapImpacts){assert.ok(oldY-newY>.10,id);const tap=f.house.taps.find(t=>t.id===id);tap.stream.geometry.computeBoundingBox();const b=new THREE.Box3().setFromObject(tap.stream);assert.ok(Math.abs(b.min.y-newY)<1e-6,id+' stream bottom');assert.ok(Math.abs(b.max.y-tap.nozzle.y)<1e-6,id+' stream top');assert.ok(Math.abs(tap.ripple.position.y-newY)<1e-6);}
});

test('the dressing-room plant leaves no old collision and does not obstruct a wardrobe door sweep',()=>{
 assert.ok(['moved','removed'].includes(f.bath.audit.plant.action));
 assert.equal(f.meshes.filter(o=>raw(o).startsWith('Master plant ')).length,0);
 const oldSpot=new THREE.Vector3(-3.7601198097,1.57,3.0886698437);assert.equal(f.walk.collision(oldSpot),false);
 const sweep=f.cabinetry.audit.doorSweep.filter(d=>d.id.startsWith('wardrobe-master-south'));
 assert.ok(sweep.every(d=>d.maxOpenDegrees===90),JSON.stringify(sweep));
 if(f.bath.audit.plant.action==='moved')assert.ok(f.bath.audit.plant.center[2]>4.1);
});
