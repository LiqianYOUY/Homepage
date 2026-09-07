import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupRoomRenovation}=await import('../room-renovation.js');
const {setupChildrenRoomDetails}=await import('../children-room-details.js');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupBathroomRefinement}=await import('../bathroom-refinement.js');
const {setupCabinetryV7}=await import('../cabinetry-v7.js');
const {createWalkCollision}=await import('../walk-collision.js');
const raw=o=>o.userData?.name||o.name;
const meshes=object=>{const result=[];object.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
const bounds=o=>new THREE.Box3().setFromObject(o);
const positiveOverlap=(a,b,tolerance=.002)=>['x','y','z'].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>tolerance);
// The rotating entrance leaf needs oriented bounds: world AABBs alone include
// empty corners and can falsely report a furniture collision during the swing.
function obb(mesh){mesh.geometry.computeBoundingBox();mesh.updateWorldMatrix(true,false);const b=mesh.geometry.boundingBox,e=mesh.matrixWorld.elements,axes=[new THREE.Vector3(e[0],e[1],e[2]),new THREE.Vector3(e[4],e[5],e[6]),new THREE.Vector3(e[8],e[9],e[10])].map(v=>v.normalize()),points=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld));return {points,axes,bounds:new THREE.Box3().setFromPoints(points)};}
function orientedOverlap(a,b,tolerance=.002){if(!a.bounds.intersectsBox(b.bounds))return false;const axes=[...a.axes,...b.axes];for(const aa of a.axes)for(const bb of b.axes){const axis=new THREE.Vector3().crossVectors(aa,bb);if(axis.lengthSq()>1e-12)axes.push(axis.normalize());}for(const axis of axes){const ap=a.points.map(p=>p.dot(axis)),bp=b.points.map(p=>p.dot(axis));if(Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))<=tolerance)return false;}return true;}
async function fixture(initial={}){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state=structuredClone(initial);const records=new Map(),params={THREE,scene,model,register:r=>records.set(r.id,r),getState:()=>state,setState:p=>state={...state,...p}};
 const renovation=setupRoomRenovation(params),details=setupChildrenRoomDetails({...params,renovation}),house=setupHouseInteractions(params),bath=setupBathroomRefinement({...params,house}),cabinetry=setupCabinetryV7({...params,house});bath.finalizeCabinetry();house.colliderRoots=cabinetry.colliderRoots;
 const walk=createWalkCollision({...params,house});model.updateMatrixWorld(true);
 return {...params,house,bath,cabinetry,renovation,details,walk,meshes:meshes(model),records,state:()=>state};
}
const f=await fixture();

function walkRoute(walk,route){for(let i=1;i<route.length;i++){const a=new THREE.Vector3(route[i-1][0],1.57,route[i-1][1]),b=new THREE.Vector3(route[i][0],1.57,route[i][1]);const steps=Math.ceil(a.distanceTo(b)/.02);for(let j=0;j<=steps;j++){const p=a.clone().lerp(b,j/steps);assert.equal(walk.collision(p),false,'route obstructed at '+p.x.toFixed(3)+','+p.z.toFixed(3));}}}
const entryRoute=[[8.25,-1.07],[8.81,-1.07],[8.95,-.72],[9.17,-.60],[9.68,-.59]];
const studyRoutes=[[[9.68,-.59],[10.35,-.45],[10.43,.05]],[[9.68,-.59],[10.35,.20],[10.43,1.15]]];
const storageRoute=[[9.68,-.56],[10.25,-.56],[11.0,-.56]];

test('one bunk has a wider lower mattress and rests along the bathroom wall, leaving the window facade open',()=>{
 const bunk=f.renovation.childrenBunkBed;assert.ok(bunk);
 const b=bounds(bunk),bathroomWall=bounds(f.meshes.find(o=>raw(o)==='Bathroom3 divider · upper'));
 assert.ok(b.min.x>bathroomWall.max.x+.02&&b.max.x<9.60,'bunk belongs beside the bathroom wall in the west of the room');
 assert.ok(b.min.z>-.40&&b.max.z<1.82&&b.max.y<2.35,'bunk fits below the ceiling and inside both end boundaries');
 const mattresses=meshes(bunk).filter(o=>/mattress/.test(raw(o)));assert.equal(mattresses.length,2);
 mattresses.sort((a,b)=>bounds(a).min.y-bounds(b).min.y);const lower=bounds(mattresses[0]),upper=bounds(mattresses[1]);
 assert.ok(lower.getSize(new THREE.Vector3()).x>=1.20&&upper.getSize(new THREE.Vector3()).x<=1.0);
 assert.ok(lower.getSize(new THREE.Vector3()).x-upper.getSize(new THREE.Vector3()).x>.25,'upper berth is visibly narrower');
 assert.ok(lower.getSize(new THREE.Vector3()).z>1.80&&upper.getSize(new THREE.Vector3()).z>1.80);
 assert.ok(upper.min.y>lower.max.y+.85,'two real sleeping levels replace the former loft desks');
 assert.equal(f.renovation.childrenLadders.length,1);assert.equal(f.renovation.childrenChairs.length,2);
 assert.ok(meshes(bunk).some(o=>/guard/.test(raw(o))),'upper bunk includes guards');
 assert.ok(!meshes(f.renovation.root).some(o=>/integrated loft|under-desk rear|integrated long writing surface/.test(raw(o))));
});

test('bunk platforms and aprons have no exposed coplanar faces with their posts',()=>{
 const bunk=f.renovation.childrenBunkBed,structure=meshes(bunk).filter(o=>o.geometry.type==='BoxGeometry'&&o.userData.category==='furniture');
 for(const deck of [bunk.lowerDeck,bunk.upperDeck,...structure.filter(o=>/side apron/.test(raw(o)))]){
  const a=bounds(deck);
  for(const trim of structure.filter(o=>o!==deck)){
   const b=bounds(trim);
   for(const axis of ['x','y','z'])for(const side of ['min','max']){
    const sharedPlane=Math.abs(a[side][axis]-b[side][axis])<.0001;
    const faceOverlap=['x','y','z'].filter(k=>k!==axis).every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>.001);
    assert.equal(sharedPlane&&faceOverlap,false,raw(deck)+' shares an exposed '+axis+' '+side+' face with '+raw(trim));
   }
  }
 }
});

test('two complete window study places sit below the glazing and their supplies rest on their own desktops',()=>{
 assert.equal(f.renovation.childrenDesks.length,2);assert.equal(f.details.studySets.length,2);
 const glazing=f.meshes.filter(o=>/^Bedroom3 east glazing/.test(raw(o))),windowX=Math.min(...glazing.map(o=>bounds(o).min.x));
 const desktops=f.renovation.childrenDesks.map(d=>bounds(d.desktop));
 for(const [i,desk] of f.renovation.childrenDesks.entries()){
  const b=desktops[i];assert.ok(b.min.x>11.15&&b.max.x<windowX-.15,'desk stays in front of the east window with a curtain pocket');
  assert.ok(b.max.y>.72&&b.max.y<.80);assert.ok(b.getSize(new THREE.Vector3()).z>1.0);
  const chair=bounds(f.renovation.childrenChairs[i]);assert.ok(chair.max.x<b.min.x+.04,'each chair is on the room side of its desk');
  const supplies=f.details.audit.studySets[i],top=supplies.desktopInDesk,items=supplies.suppliesInDesk;
  assert.ok(items.min[0]>=top.min[0]-.002&&items.max[0]<=top.max[0]+.002,'study belongings fit across the desktop');
  assert.ok(items.min[2]>=top.min[2]-.002&&items.max[2]<=top.max[2]+.002,'study belongings fit within desktop depth');
  assert.ok(items.min[1]>=top.max[1]-.006,'belongings sit on, rather than below, the desktop');
 }
 assert.equal(f.renovation.childrenDesks[0].desktop,f.renovation.childrenDesks[1].desktop,'both places share one unbroken top');
 const top=desktops[0],bookcase=bounds(f.renovation.childrenBookcase),size=top.getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.z-2.46)<.001&&Math.abs(size.x-.60)<.001);
 assert.ok(Math.abs(top.min.z-bookcase.max.z)<.002,'desktop meets window bookcase exactly');
 assert.ok(Math.abs(top.max.x-bookcase.max.x)<.002,'outer edges form one continuous return');
 assert.ok(bounds(f.renovation.childrenChairs[0]).min.z-bounds(f.renovation.childrenWardrobes[0].object).max.z>.60,'at least 60 cm clear between the chair and the storage front');
 // At window height there should be no tall bed or storage immediately behind the glass.
 const windowLightZone=new THREE.Box3(new THREE.Vector3(11.65,1.20,-.78),new THREE.Vector3(12.04,2.40,1.55));
 const roomFurniture=meshes(f.renovation.root).filter(o=>/^Children/.test(raw(o)));
 for(const o of roomFurniture)assert.equal(positiveOverlap(bounds(o),windowLightZone),false,raw(o)+' blocks the central window light');
});

test('old independent bedroom furniture and interaction records are removed without removing the real structure',()=>{
 assert.equal(f.meshes.filter(o=>raw(o).startsWith('Bedroom3 wardrobe ')||raw(o).startsWith('Bedroom 3 queen bed ')).length,0);
 assert.ok(!f.cabinetry.cabinets.some(c=>c.id==='wardrobe-bedroom3'));
 assert.ok(![...f.records.keys()].some(id=>id.startsWith('wardrobe-bedroom3')||id==='children-wardrobe-north'||id==='children-wardrobe-east'));
 assert.ok(f.meshes.some(o=>raw(o)==='Bathroom3 divider · upper'));assert.ok(f.meshes.some(o=>raw(o)==='Bedroom3 east glazing 1'));
});

test('the new furniture clears the fixed room structure, neighboring furniture and both curtain positions',()=>{
 const additions=meshes(f.renovation.root).filter(o=>/^Children/.test(raw(o))),belongings=meshes(f.details.root),owned=new Set([...additions,...belongings]);
 const structure=f.meshes.filter(o=>['wall','upperWall','glass','window','column'].includes(o.userData.category));
 const existingFurniture=f.meshes.filter(o=>!owned.has(o)&&o.userData.category==='furniture'&&bounds(o).max.y>.13);
 const staticShapes=[...structure,...existingFurniture].map(object=>({object,shape:obb(object)}));
 for(const object of [...additions,...belongings]){const a=obb(object);for(const b of staticShapes)assert.equal(orientedOverlap(a,b.shape),false,raw(object)+' intersects '+raw(b.object));}
 const groups=f.renovation.childrenFurnitureRoots||f.renovation.childrenRoom.children;
 for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++)for(const first of meshes(groups[a]))for(const second of meshes(groups[b]))assert.equal(orientedOverlap(obb(first),obb(second)),false,raw(first)+' intersects separate furniture '+raw(second));
 const curtain=f.renovation.curtains.find(c=>c.id==='curtain-children'),saved=curtain.amount;
 for(const amount of [0,1]){curtain.setOpen(Boolean(amount),true);for(const object of [...additions,...belongings])for(const panel of meshes(curtain.object))assert.equal(orientedOverlap(obb(object),obb(panel)),false,raw(object)+' intersects '+raw(panel));}
 curtain.setOpen(saved>.5,true);
});

test('the full entrance door sweep clears the bunk, row of cabinets, toys and backpack',()=>{
 const door=f.house.doors.find(d=>d.id==='door-bedroom3'),saved=door.openAmount;
 const additions=[...meshes(f.renovation.root).filter(o=>/^Children/.test(raw(o))),...meshes(f.details.root)].map(object=>({object,shape:obb(object)}));
 for(let step=0;step<=180;step++){door.setOpen(step/180,true);for(const part of meshes(door.object)){const a=obb(part);for(const b of additions)assert.equal(orientedOverlap(a,b.shape),false,raw(part)+' hits '+raw(b.object)+' at door fraction '+step+'/180');}}
 door.setOpen(saved,true);
});

test('walking with the real body radius reaches both study seats, the bunk and every storage section',()=>{
 const door=f.house.doors.find(d=>d.id==='door-bedroom3');door.setOpen(0,true);assert.equal(f.walk.collision(new THREE.Vector3(8.56,1.57,-1.07)),true,'closed door remains solid');door.setOpen(1,true);
 walkRoute(f.walk,entryRoute);for(const route of studyRoutes)walkRoute(f.walk,route);walkRoute(f.walk,storageRoute);
 walkRoute(f.walk,[[9.68,-.59],[9.85,.20],[9.85,1.30]]);
 const mattress=meshes(f.renovation.childrenBunkBed).find(o=>/mattress/.test(raw(o))),b=bounds(mattress).getCenter(new THREE.Vector3());
 assert.equal(f.walk.collision(b.setY(1.57)),true,'the new bed frame remains solid furniture');
});

test('wardrobe doors slide without stealing the aisle and retain saved state after a reload',async()=>{
 assert.ok(f.renovation.childrenWardrobes.length>=1);
 for(const c of f.renovation.childrenWardrobes){assert.equal(c.kind,'cabinet');assert.equal(f.records.get(c.id),c);c.setOpen(true);for(let i=0;i<150;i++)f.renovation.update(.05);assert.ok(c.amount>.999);assert.equal(f.state().doors[c.id],1);walkRoute(f.walk,storageRoute);c.setOpen(false,true);assert.equal(c.amount,0);assert.equal(f.state().doors[c.id],0);}
 const saved={doors:{'door-master':.4}};for(const c of f.renovation.childrenWardrobes)saved.doors[c.id]=1;
 const reloaded=await fixture(saved);assert.ok(reloaded.renovation.childrenWardrobes.every(c=>c.amount===1));
 assert.equal(reloaded.state().doors['door-master'],.4);
 reloaded.details.dispose();reloaded.renovation.dispose();
});

test('matching bookcases flank the wardrobe, with small belongings on the lowest bookshelves and no toy cabinet',()=>{
 assert.equal(f.renovation.childrenStorage,null);assert.equal(f.renovation.childrenBookcases.length,2);
 const [left,right]=f.renovation.childrenBookcases.map(bounds),wardrobe=bounds(f.renovation.childrenWardrobes[0].object);
 assert.deepEqual(left.getSize(new THREE.Vector3()).toArray().map(v=>Math.round(v*1000)),right.getSize(new THREE.Vector3()).toArray().map(v=>Math.round(v*1000)));
 assert.ok(Math.abs((left.min.x+left.max.x)/2+(right.min.x+right.max.x)/2-2*(wardrobe.min.x+wardrobe.max.x)/2)<.001);
 assert.ok(Math.abs(left.max.x-wardrobe.min.x)<.002&&Math.abs(right.min.x-wardrobe.max.x)<.002,'case sides form a fitted symmetrical run');
 assert.equal(f.details.toys.length,2);assert.ok(f.details.backpack);
 for(const [object,support] of [...f.details.toys.map(o=>[o,left]),[f.details.backpack,right]]){const b=bounds(object);assert.ok(b.min.x>=support.min.x&&b.max.x<=support.max.x);assert.ok(b.min.z>=support.min.z&&b.max.z<=support.max.z);assert.ok(Math.abs(b.min.y-.116)<.008,'belongings rest on the bottom bookshelves');}
 assert.ok(!meshes(f.renovation.childrenRoom).some(o=>/toy display|toy and schoolbag cubby|basket/.test(raw(o))));
 for(const c of f.renovation.childrenBookcases)assert.ok(meshes(c).filter(o=>raw(o)==='Children bookcase upright book').length>=20);
});

test('wardrobe sliding panels clear shelves, case and each other through the complete travel',()=>{
  for(const c of f.renovation.childrenWardrobes){
   const sliding=meshes(c.panels[0]),moving=new Set(sliding),fixed=meshes(c.object).filter(o=>!moving.has(o)).map(object=>({object,shape:obb(object)})),saved=c.amount;
   for(let step=0;step<=80;step++){c.amount=step/80;c.apply();for(const object of sliding){const a=obb(object);for(const b of fixed)assert.equal(orientedOverlap(a,b.shape,.001),false,raw(object)+' intersects '+raw(b.object)+' at travel '+step+'/80');}}
   c.amount=saved;c.apply();
   const fixedPanel=meshes(c.panels[1]),otherFixed=meshes(c.object).filter(o=>!meshes(c.moving).includes(o));
   for(const a of fixedPanel)for(const b of otherFixed)assert.equal(orientedOverlap(obb(a),obb(b),.001),false,raw(a)+' intersects '+raw(b));
  }
 });
