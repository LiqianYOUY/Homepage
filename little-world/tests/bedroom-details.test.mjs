import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupRoomRenovation}=await import('../room-renovation.js');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupCabinetryV7}=await import('../cabinetry-v7.js');
const {setupBedroomDetails}=await import('../bedroom-details.js');
const {createWalkCollision}=await import('../walk-collision.js');
const {optimizeScene}=await import('../optimize-scene.js');
const {translate}=await import('../i18n.js?v=14');
const raw=o=>o.userData?.name||o.name;
const meshes=object=>{const result=[];object.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
const bounds=o=>new THREE.Box3().setFromObject(o);
const overlap=(a,b)=>['x','y','z'].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>.002);

async function fixture({turnLightsOn}={}){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state={settings:{deskLight:true}};const records=new Map();
 const params={THREE,scene,model,register:r=>records.set(r.id,r),getState:()=>state,setState:p=>state={...state,...p}};
 const renovation=setupRoomRenovation(params),house=setupHouseInteractions(params),cabinetry=setupCabinetryV7({...params,house});
 house.colliderRoots=cabinetry.colliderRoots;
 const oldChair=meshes(model).filter(o=>raw(o).startsWith('Master reading chair '));
 const existing=meshes(model);
 const details=setupBedroomDetails({...params,renovation,cabinetry,turnLightsOn});
 const walk=createWalkCollision({...params,house});
 return {...params,renovation,house,cabinetry,oldChair,existing,details,walk,records,state:()=>state};
}
const f=await fixture();

test('the pod upgrades a static reading chair with a practical seat and clear curtain pocket',()=>{
 assert.equal(f.oldChair.length,6);assert.ok(f.oldChair.every(o=>o.parent===null));
 assert.ok(!f.house.chairs.some(c=>c.parts.some(o=>f.oldChair.includes(o))),'no removed chair may survive as a dynamic drag/collision record');
 const b=bounds(f.details.chair),floor=f.existing.find(o=>raw(o)==='Master suite · oak floor');
 assert.ok(bounds(floor).containsPoint(new THREE.Vector3(b.min.x,0,b.min.z)));
 assert.ok(bounds(floor).containsPoint(new THREE.Vector3(b.max.x,0,b.max.z)));
 assert.ok(b.getSize(new THREE.Vector3()).x<1.20&&b.getSize(new THREE.Vector3()).z<1.25&&b.max.y<1.90);
 assert.ok(f.details.audit.curtainClearanceM>.15);
 const seat=f.details.chair.getObjectByName('Master pod deep seat cushion');assert.ok(seat.position.y>.43&&seat.position.y<.50);
 assert.ok(f.details.audit.meshCount<50,'fixed details should be grouped into a modest draw-call budget');
 assert.ok(f.details.audit.triangles<15000);
});

test('new meshes clear fixed bedroom structure, existing furniture and both curtain positions',()=>{
 const additions=meshes(f.details.root),structure=f.existing.filter(o=>o.parent&&['wall','upperWall','glass','window'].includes(o.userData.category));
 const furniture=f.existing.filter(o=>o.parent&&o.userData.category==='furniture'&&bounds(o).max.y>.13&&!/leaf \d/.test(raw(o)));
 for(const a of additions)for(const b of [...structure,...furniture])assert.equal(overlap(bounds(a),bounds(b)),false,raw(a)+' intersects '+raw(b));
 const curtain=f.renovation.curtains.find(c=>c.id==='curtain-master'),saved=curtain.amount;
 for(const amount of [0,1]){curtain.setOpen(Boolean(amount),true);for(const a of additions)for(const b of meshes(curtain.object))assert.equal(overlap(bounds(a),bounds(b)),false,raw(a)+' intersects '+raw(b));}
 curtain.setOpen(saved>.5,true);
 const rack=bounds(f.details.rack),console=bounds(f.existing.find(o=>raw(o)==='Master console')),bed=bounds(f.existing.find(o=>raw(o)==='Master king bed frame')),partition=bounds(f.existing.find(o=>raw(o)==='Master dressing wall upper · cutaway'));
 assert.ok(rack.min.x>console.max.x+.10,'the whole valet stand is to the viewer-right of the bedroom console');
 assert.ok(rack.max.x<partition.min.x-.10,'the stand remains inside the bedroom, before the dressing partition');
 assert.ok(rack.min.z>=console.min.z&&rack.max.z<bed.min.z-.70,'the north-wall placement leaves the bed-foot passage clear');
 assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(f.details.rack.getWorldQuaternion(new THREE.Quaternion())).z>.99,'clothes and tray face into the bedroom');
});

test('all master room doors and wardrobe leaves clear the details throughout their full sweeps',()=>{
 const additions=meshes(f.details.root).map(object=>({object,box:bounds(object)}));
 const doors=[...f.house.doors.filter(d=>d.id.includes('master')),...f.cabinetry.doors.filter(d=>d.id.includes('master'))];assert.equal(doors.length,9);
 for(const door of doors){
  const saved=door.amount??door.openAmount;
  for(let step=0;step<=36;step++){
   if(door.apply)door.apply(step/36);else door.setOpen(step/36,true);
   for(const part of meshes(door.object))for(const detail of additions)assert.equal(overlap(bounds(part),detail.box),false,door.id+' at fraction '+step+'/36 intersects '+raw(detail.object));
  }
  if(door.apply)door.apply(saved);else door.setOpen(saved,true);
 }
 const rack=bounds(f.details.rack);
 for(const mirror of f.cabinetry.mirrors)assert.equal(bounds(mirror.object).intersectsBox(rack),false,'the relocated stand must not overlap the actual mirror surface');
});

test('entry, wardrobe mirror, bed-side aisles and chair approach remain reachable with walking body radius',()=>{
 const routes=[
  [[-3.9,.70],[-3.9,1.20],[-4.1,1.75],[-4.6,2.30],[-4.6,3.30],[-5.06,3.80]],
  [[-4.6,3.30],[-6.0,3.25],[-6.5,3.10],[-7.4,3.10],[-7.55,3.70]],
  [[-4.3,2.10],[-6.3,2.10],[-6.3,3.10]],
  [[-4.6,2.40],[-3.7,2.40]],
  [[-7.4,3.10],[-8.0,2.48],[-9.0,2.45],[-10.12,2.45]],
  [[-10.12,2.45],[-10.75,2.70],[-10.90,3.10],[-10.90,4.00]]
 ];
 for(const route of routes)for(let i=1;i<route.length;i++){
  const a=new THREE.Vector3(route[i-1][0],1.57,route[i-1][1]),b=new THREE.Vector3(route[i][0],1.57,route[i][1]);
  for(let j=0;j<=40;j++){const p=a.clone().lerp(b,j/40);assert.equal(f.walk.collision(p),false,'blocked at '+p.x.toFixed(3)+','+p.z.toFixed(3));}
 }
 assert.equal(f.walk.collision(new THREE.Vector3(-10.52,1.57,1.73)),true,'the chair is solid furniture');
 const stand=f.details.rack.getWorldPosition(new THREE.Vector3()).setY(1.57);
 assert.equal(f.walk.collision(stand),true,'the relocated valet stand and shelf are solid furniture');
 assert.equal(f.walk.collision(new THREE.Vector3(-3.64,1.57,2.03)),false,'the former doorway placement is completely clear again');
});

test('the compact dressing island provides seating and accessories with usable circulation around both sides',()=>{
 const {island,audit}=f.details,b=bounds(island),size=b.getSize(new THREE.Vector3());
 assert.ok(size.x<=.961&&size.z<=.461&&b.max.y<=.501,'a low, narrow furnishing leaves the full-length mirror in view');
 const floor=bounds(f.existing.find(o=>raw(o)==='Master suite · oak floor'));
 assert.ok(floor.containsPoint(new THREE.Vector3(b.min.x,0,b.min.z))&&floor.containsPoint(new THREE.Vector3(b.max.x,0,b.max.z)));
 const names=meshes(island).flatMap(o=>o.userData.sourceNames||[raw(o)]);
 for(const detail of ['upholstered sitting pad','leather watch strap','inset watch dial','simple bracelet','folded sand scarf layer','paired']){
  if(detail==='paired')assert.equal(names.filter(n=>n==='Master island jewellery hoop').length,2);
  else assert.ok(names.some(n=>n.includes(detail)),detail+' should survive batching');
 }
 assert.ok(audit.dressingIsland.northClosedWardrobeClearanceM>.86);
 assert.ok(audit.dressingIsland.southClosedWardrobeClearanceM>1.45);
 assert.equal(f.walk.collision(island.getWorldPosition(new THREE.Vector3()).setY(1.57)),true,'the island is actual solid furniture');
 assert.ok(b.min.x>-6.25&&b.max.x<-4.55,'both east and west aisles remain open, as the route test verifies with the walking body radius');
 for(const bank of ['north','south']){
  const sweep=new THREE.Box3();
  for(const door of f.cabinetry.doors.filter(d=>d.id.startsWith('wardrobe-master-'+bank))){
   const saved=door.amount;
   for(let step=0;step<=90;step++){door.apply(step/90);sweep.union(bounds(door.object));}
   door.apply(saved);
  }
  assert.ok(bank==='north'?b.min.z-sweep.max.z>.35:sweep.min.z-b.max.z>.40,bank+' wardrobe full sweep leaves a real gap');
 }
 assert.deepEqual(f.details.rack.position.toArray(),[-7.53,0,1.25],'the user-approved TV-side stand stays put');
 assert.deepEqual(f.details.chair.position.toArray(),[-10.52,0,1.73],'the pod remains in its existing reading corner');
});

test('house lighting gates the pod lights without erasing local preference or rewriting unchanged frames',async()=>{
 let houseWakeups=0;
 const local=await fixture({turnLightsOn:()=>{houseWakeups++;}}),{details}=local,{record,readingLight}=details;
 const rim=details.chair.getObjectByName('Master pod warm edge light').material;
 const display=details.chair.getObjectByName('Master pod control display').material;
 record.click();assert.equal(local.state().settings.bedroomReadingLight,true);assert.ok(readingLight.intensity>0);assert.ok(rim.emissiveIntensity>0);assert.equal(houseWakeups,0,'an already-lit house does not need waking');
 local.setState({smart:{lightsOn:false,vacuumAuto:true}});details.update();
 assert.equal(readingLight.intensity,0);assert.equal(rim.emissiveIntensity,0);assert.equal(display.emissiveIntensity,0);
 assert.equal(local.state().settings.bedroomReadingLight,true);assert.equal(details.getStatus().effectiveReadingLight,false);
 assert.equal(translate(record.label,'en'),'Rest chair · Turn off reading light','the label describes the retained local preference');
 let writes=0;const tracked=[[readingLight,'intensity'],[rim,'emissiveIntensity'],[display,'emissiveIntensity']];
 const restore=tracked.map(([object,key])=>{const descriptor=Object.getOwnPropertyDescriptor(object,key);let value=object[key];Object.defineProperty(object,key,{configurable:true,get:()=>value,set:next=>{writes++;value=next;}});return ()=>Object.defineProperty(object,key,{...descriptor,value});});
 for(let frame=0;frame<120;frame++)details.update();assert.equal(writes,0,'idle animation frames do not rewrite the light or materials');
 local.setState({smart:{...local.state().smart,lightsOn:true}});details.update();assert.ok(writes>0);assert.ok(readingLight.intensity>0);assert.ok(rim.emissiveIntensity>0);
 const changedWrites=writes;for(let frame=0;frame<120;frame++)details.update();assert.equal(writes,changedWrites);
 record.click();assert.equal(local.state().settings.bedroomReadingLight,false);assert.equal(readingLight.intensity,0);assert.equal(rim.emissiveIntensity,0);
 local.setState({smart:{...local.state().smart,lightsOn:false}});details.update();record.click();
 assert.equal(houseWakeups,1,'local switch-on wakes the actual SmartHome fixture system through its callback');
 assert.equal(local.state().smart.lightsOn,true,'explicitly switching the local light on wakes the total lighting');
 assert.equal(local.state().smart.vacuumAuto,true);assert.equal(local.state().settings.deskLight,true);
 assert.equal(local.state().settings.bedroomReadingLight,true);assert.ok(readingLight.intensity>0);assert.ok(rim.emissiveIntensity>0);
 restore.forEach(fn=>fn());details.dispose();
});

test('the reading-light interaction persists within settings, remains bilingual and survives optimization',()=>{
 const {record,readingLight}=f.details;assert.equal(readingLight.intensity,0);assert.equal(f.records.get('master-rest-chair'),record);
 assert.equal(translate(record.label,'en'),'Rest chair · Turn on reading light');record.click();assert.ok(readingLight.intensity>0);
 assert.equal(f.state().settings.bedroomReadingLight,true);assert.equal(f.state().settings.deskLight,true);
 assert.equal(translate(record.label,'en'),'Rest chair · Turn off reading light');
 const owned=meshes(f.details.root);optimizeScene({THREE,model:f.model});
 assert.ok(owned.every(o=>o.parent&&meshes(f.details.root).includes(o)),'all owned geometry stays removable after optimization');
 record.click();assert.equal(readingLight.intensity,0);assert.equal(f.state().settings.bedroomReadingLight,false);
 f.setState({settings:{...f.state().settings,bedroomReadingLight:true}});f.details.update();assert.ok(readingLight.intensity>0);
 f.details.dispose();assert.equal(f.details.root.parent,null);assert.equal(record.disabled,true);assert.equal(readingLight.intensity,0);assert.ok(f.oldChair.every(o=>o.parent===f.model));
 f.details.dispose();assert.equal(meshes(f.model).filter(o=>raw(o).startsWith('Master reading chair ')).length,6,'disposal restores each original mesh once');
});
