import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupLivingRoom}=await import('../living-room.js');
const {setupRoomRenovation}=await import('../room-renovation.js');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupBathroomRefinement}=await import('../bathroom-refinement.js');
const {setupCabinetryV7}=await import('../cabinetry-v7.js');
const {setupSmartHome}=await import('../smart-home.js?v=14');
const {setupTerrace}=await import('../terrace-v7.js?v=14');
const {setupHousePropDetails}=await import('../house-prop-details.js');
const {createPlantLifecycle}=await import('../plant-lifecycle.js?v=14');
const {createWalkCollision}=await import('../walk-collision.js');
const {optimizeScene}=await import('../optimize-scene.js');
const raw=o=>o.userData?.name||o.name||'',meshes=root=>{const a=[];root.traverse(o=>{if(o.isMesh)a.push(o);});return a;},bounds=o=>new THREE.Box3().setFromObject(o);
async function fixture(){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url)),loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const scene=new THREE.Scene();scene.add(model);let state={};
 const getState=()=>state,setState=p=>{for(const [key,value]of Object.entries(p))state[key]={...state[key],...value};},records=new Map(),params={THREE,model,scene,getState,setState,register:r=>records.set(r.id,r),toast:()=>{}};
 setupLivingRoom(params);setupRoomRenovation(params);const house=setupHouseInteractions(params),bath=setupBathroomRefinement({...params,house}),plantLife=createPlantLifecycle(params),smart=setupSmartHome({...params,plantLife,navigation:JSON.parse(fs.readFileSync(new URL('../cat-navigation.json',import.meta.url),'utf8'))}),cabinetry=setupCabinetryV7({...params,house});bath.finalizeCabinetry();const terrace=setupTerrace({...params,plantLife});house.colliderRoots=[...smart.colliderRoots,...cabinetry.colliderRoots,...terrace.colliderRoots];
 const previous=meshes(model),beforeWalk=createWalkCollision({...params,house}),beforeState=JSON.stringify(state),dynamic=meshes(smart.gardenRoot),details=setupHousePropDetails(params),walk=createWalkCollision({...params,house});smart.setGardenTerrace(terrace);
 return {...params,house,smart,cabinetry,terrace,details,previous,beforeWalk,walk,beforeState,dynamic,state:()=>state};
}
const f=await fixture();

test('cups, cookware and planters have measurable hollow interiors with actual closed floors',()=>{
 assert.equal(f.details.audit.teaCups,2);assert.equal(f.details.audit.cupboardMugs,4);assert.equal(f.details.audit.diningSettings,3);assert.equal(f.details.plants.length,5);
 assert.equal(f.details.vessels.length,19);
 const ray=new THREE.Raycaster();
 for(const v of f.details.vessels){const origin=v.object.localToWorld(new THREE.Vector3(0,v.rimY+.03,0)),direction=new THREE.Vector3(0,-1,0).transformDirection(v.object.matrixWorld);ray.set(origin,direction);const hit=ray.intersectObject(v.object,false)[0];assert.ok(hit,v.name+' requires a closed floor');const p=v.object.worldToLocal(hit.point.clone());assert.ok(Math.abs(p.y-v.floorY)<.00001,v.name+' has no cap over its opening');assert.ok(v.rimY-p.y>.025,v.name+' is a dimensional cavity');
   const atRim=v.object.localToWorld(new THREE.Vector3(v.radius-v.wallThickness*.70,v.rimY+.012,0));ray.set(atRim,direction);const lip=ray.intersectObject(v.object,false)[0];assert.ok(lip,v.name+' rim has real thickness');assert.ok(v.object.worldToLocal(lip.point.clone()).y>v.rimY-.02,v.name+' has a raised rim');
 }
 const cup=f.details.root.getObjectByName('Terrace hollow tea cup 1'),handle=cup.getObjectByName('Terrace tea cup 1 open loop handle');assert.ok(handle);ray.set(cup.localToWorld(new THREE.Vector3(.061,.034,.06)),new THREE.Vector3(0,0,-1));assert.equal(ray.intersectObject(handle,false).length,0,'the cup handle aperture is genuinely empty');
 const spout=f.details.root.getObjectByName('Teapot inner and outer spout wall');ray.set(spout.localToWorld(new THREE.Vector3(0,.12,0)),new THREE.Vector3(0,-1,0).transformDirection(spout.matrixWorld));assert.equal(ray.intersectObject(spout,false).length,0,'the spout bore is open end to end');
});

test('slotted spatula has open slots and dining props stay supported inside the actual tabletop',()=>{
 const spatula=f.details.root.getObjectByName('Spatula head with three real slots'),ray=new THREE.Raycaster();for(const x of [-.016,0,.016]){ray.set(spatula.localToWorld(new THREE.Vector3(x,.25,.030)),new THREE.Vector3(0,0,-1).transformDirection(spatula.matrixWorld));assert.equal(ray.intersectObject(spatula,false).length,0,'spatula slot is an opening');}
 const table=f.previous.find(o=>raw(o)==='Dining table top'),b=bounds(table);for(let i=1;i<=3;i++){const g=f.details.root.getObjectByName('Dining crafted place setting '+i),gb=bounds(g);assert.ok(gb.min.x>b.min.x&&gb.max.x<b.max.x&&gb.min.z>b.min.z&&gb.max.z<b.max.z);assert.ok(Math.abs(gb.min.y-b.max.y)<.000001);}
 const whisk=f.details.root.getObjectByName('Kitchen wire balloon whisk');assert.equal(meshes(whisk).filter(o=>raw(o).startsWith('Whisk open wire')).length,3);
 assert.ok(f.details.root.getObjectByName('Kitchen deep serving ladle'));assert.ok(f.details.root.getObjectByName('Kitchen silicone tipped tongs'));
});

test('refined static plants preserve room placement and floor footprint, while growth interactions and navigation stay intact',()=>{
 for(const plant of f.details.plants){const b=bounds(plant.object);assert.ok(plant.originalBounds.clone().expandByScalar(.003).containsBox(b),plant.name+' expands into previously clear space');assert.ok(Math.abs(b.min.y)<.00001,'planter rests on original floor');assert.equal(plant.leafCount,8);const leaves=meshes(plant.object).filter(o=>raw(o).includes('pointed sculpted leaf'));assert.equal(leaves.length,8);assert.ok(leaves.every(o=>o.geometry.attributes.position.count<100),'foliage is purpose-built low-poly geometry');}
 assert.equal(JSON.stringify(f.state()),f.beforeState);assert.ok(f.dynamic.every(o=>o.parent),'interactive flower growth is untouched');
 const sampleRoutes=[[-5.70,-.20],[-5.75,.45],[10.03,-3.85],[10.07,-3.55],[-.52,3.85],[-10.61,-3.90],[-9.58,.16]];for(const [x,z]of sampleRoutes){const p=new THREE.Vector3(x,1.57,z);assert.equal(f.walk.collision(p),f.beforeWalk.collision(p),'walkability changed at '+x+','+z);}
 assert.ok(f.smart.audit.vacuum.dockConnectorClear);
});

test('refined greenery and dining settings clear neighbouring furniture and the redundant vase',()=>{
 const overlap=(a,b)=>['x','y','z'].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>.004);
 const structure=f.previous.filter(o=>o.parent&&['wall','upperWall','glass','window','furniture','kitchenCabinet'].includes(o.userData.category)&&!/^Living rug$/.test(raw(o)));
 structure.push(...meshes(f.smart.vaseObjects.find(v=>v.id==='dining').object));
 const additions=meshes(f.details.root);for(const a of additions)for(const b of structure)assert.equal(overlap(bounds(a),bounds(b)),false,raw(a)+' overlaps '+raw(b));
 assert.ok(f.scene.getObjectByName('Flower vase dining'),'the functional flower vase stays in place');assert.equal(meshes(f.model).some(o=>raw(o)==='Dining vase'),false,'the old solid vase no longer intersects the middle plate');
});

test('all replaced coarse meshes are removed once and batching keeps local disposal reversible',()=>{
 assert.equal(f.details.audit.removedMeshes,f.previous.filter(o=>!o.parent).length,'every removed original is accounted for exactly once');
 const remaining=meshes(f.model);assert.equal(remaining.filter(o=>/^(?:Terrace outdoor tea cup|Terrace tea surface|Dining place setting|Hob cooking pot |Hob shallow frying pan |Countertop nested serving bowl|Utensil crock hollow sides)/.test(raw(o))).length,0);
 const expected=f.previous.filter(o=>!o.parent),originalMaterials=new Set(expected.map(o=>o.material)),originalGeometry=new Set(expected.map(o=>o.geometry));let accidentalDisposals=0;for(const m of originalMaterials)m.addEventListener('dispose',()=>accidentalDisposals++);for(const g of originalGeometry)g.addEventListener('dispose',()=>accidentalDisposals++);
 const before=f.details.audit.beforeBatch;f.details.finalize();assert.equal(f.details.audit.afterBatch.triangles,before.triangles);assert.ok(f.details.audit.afterBatch.meshes<32,JSON.stringify(f.details.audit.afterBatch));assert.deepEqual(f.details.audit.afterBatch.failedGroups,[]);assert.ok(before.triangles<60000);const owned=meshes(f.details.root);optimizeScene({THREE,model:f.model});assert.ok(owned.every(o=>o.parent),'global optimizer must retain local ownership');
 f.details.dispose();f.details.dispose();assert.equal(f.details.root.parent,null);assert.ok(expected.every(o=>o.parent),'all coarse props restore to their original parents');assert.equal(accidentalDisposals,0,'shared/source materials and geometries must not be disposed');
});
