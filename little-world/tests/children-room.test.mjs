import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupRoomRenovation}=await import('../room-renovation.js');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupBathroomRefinement}=await import('../bathroom-refinement.js');
const {setupCabinetryV7}=await import('../cabinetry-v7.js');
const {createWalkCollision}=await import('../walk-collision.js');
const raw=o=>o.userData?.name||o.name;

async function fixture(){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state={};const records=new Map(),params={THREE,scene,model,register:r=>records.set(r.id,r),getState:()=>state,setState:p=>state={...state,...p}};
 const renovation=setupRoomRenovation(params),house=setupHouseInteractions(params),bath=setupBathroomRefinement({...params,house}),cabinetry=setupCabinetryV7({...params,house});bath.finalizeCabinetry();house.colliderRoots=cabinetry.colliderRoots;
 const walk=createWalkCollision({...params,house});model.updateMatrixWorld(true);const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
 return {model,scene,house,bath,cabinetry,renovation,walk,meshes,records,state:()=>state};
}
const f=await fixture(),bounds=o=>new THREE.Box3().setFromObject(o);

test('the two systems include joined sleeping, long study and end-wardrobe structures with the requested orientation',()=>{
 assert.equal(f.renovation.loftBeds.length,2);assert.equal(f.renovation.childrenWardrobes.length,2);
 const [north,east]=f.renovation.loftBeds;
 assert.ok(Math.abs(north.rotation.y)<1e-8);assert.ok(Math.abs(east.rotation.y+Math.PI/2)<1e-8);
 for(const bed of f.renovation.loftBeds){const parts=[];bed.traverse(o=>{if(o.isMesh)parts.push(o);});assert.equal(parts.filter(o=>raw(o).endsWith('continuous load-bearing loft deck')).length,1);assert.equal(parts.filter(o=>raw(o).endsWith('integrated long writing surface')).length,1);assert.equal(parts.filter(o=>raw(o).endsWith('wardrobe bearing side')).length,2);const desk=parts.find(o=>raw(o).endsWith('integrated long writing surface'));desk.geometry.computeBoundingBox();assert.ok(desk.geometry.boundingBox.max.x-desk.geometry.boundingBox.min.x>1.40);assert.ok(bounds(bed).max.y<2.21);}
 assert.equal(f.renovation.childrenLadders.length,2);assert.equal(f.renovation.childrenChairs.length,2);
 const westLadder=bounds(f.renovation.childrenLadders[0]);assert.ok(westLadder.max.x<9.30);
 const inwardLadder=bounds(f.renovation.childrenLadders[1]);assert.ok(inwardLadder.min.x<10.65);
});

test('old independent wardrobe/bed meshes, wardrobe doors and interaction records are absent',()=>{
 assert.equal(f.meshes.filter(o=>raw(o).startsWith('Bedroom3 wardrobe ')||raw(o).startsWith('Bedroom 3 queen bed ')).length,0);
 assert.ok(!f.cabinetry.cabinets.some(c=>c.id==='wardrobe-bedroom3'));
 assert.ok(![...f.records.keys()].some(id=>id.startsWith('wardrobe-bedroom3')));
 assert.equal(f.walk.collision(new THREE.Vector3(8.24,1.57,.85)),false,'the old independent wardrobe footprint must not leave a phantom blocker');
});

test('the open entrance leads around the west ladder to the central aisle and both study areas',()=>{
 const route=[[8.25,-1.07],[8.56,-1.07],[8.81,-1.07],[8.81,-.78],[8.81,-.42],[8.81,.06],[9.38,.18],[10.12,.18],[10.39,.46],[10.39,.82]];
 for(let i=1;i<route.length;i++){const a=new THREE.Vector3(route[i-1][0],1.57,route[i-1][1]),b=new THREE.Vector3(route[i][0],1.57,route[i][1]);for(let j=0;j<=20;j++){const p=a.clone().lerp(b,j/20);assert.equal(f.walk.collision(p),false,'route obstructed at '+p.x.toFixed(3)+','+p.z.toFixed(3));}}
 const door=f.house.doors.find(d=>d.id==='door-bedroom3');door.setOpen(0,true);assert.equal(f.walk.collision(new THREE.Vector3(8.56,1.57,-1.07)),true,'closed original door stays solid');door.setOpen(1,true);
});

test('the two units and fixed room structure do not intersect at human height or on the upper beds',()=>{
 const sets=f.renovation.loftBeds.map(bed=>{const parts=[];bed.traverse(o=>{if(o.isMesh&&o.userData.category==='furniture')parts.push(o);});return parts;});
 const overlaps=(a,b)=>Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>.003&&Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y)>.003&&Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>.003;
 for(const a of sets[0])for(const b of sets[1])assert.ok(!overlaps(bounds(a),bounds(b)),raw(a)+' overlaps '+raw(b));
 const structure=f.meshes.filter(o=>['wall','upperWall','glass','column'].includes(o.userData.category));
 for(const set of sets)for(const p of set)for(const wall of structure)assert.ok(!overlaps(bounds(p),bounds(wall)),raw(p)+' overlaps '+raw(wall));
});

test('integrated wardrobe fronts slide within each case, persist and preserve the central walkway',()=>{
 for(const c of f.renovation.childrenWardrobes){c.setOpen(true);for(let i=0;i<150;i++)f.renovation.update(.05);assert.ok(c.amount>.999);assert.equal(f.state().doors[c.id],1);assert.ok(c.panels[0].position.x>.115);c.setOpen(false,true);assert.equal(c.amount,0);assert.equal(f.state().doors[c.id],0);}
 assert.equal(f.walk.collision(new THREE.Vector3(9.40,1.57,.18)),false);
 assert.ok(f.meshes.some(o=>raw(o)==='Children quiet corner woven rug'));assert.ok(f.meshes.some(o=>raw(o)==='Children quiet corner soft floor cushion'));assert.ok(bounds(f.renovation.relaxation).max.x<10.5);
});
