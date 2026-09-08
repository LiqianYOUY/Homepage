import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {correctFurnitureScale}=await import('../furniture-scale.js');
const {setupRoomRenovation}=await import('../room-renovation.js');
const {setupHouseInteractions}=await import('../home-interactions.js');
const {setupBathroomRefinement}=await import('../bathroom-refinement.js');
const {setupCabinetryV7}=await import('../cabinetry-v7.js');
const {setupBathroomAccessories}=await import('../bathroom-accessories.js');
const raw=o=>o.userData?.name||o.name||'',bounds=o=>new THREE.Box3().setFromObject(o);
const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
const depth=(a,b)=>['x','y','z'].map(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k]));
async function fixture(){
 const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
 const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new THREE.Scene();scene.add(model);let state={};const params={THREE,scene,model,register:()=>{},getState:()=>state,setState:p=>state={...state,...p}};
 correctFurnitureScale(params);const renovation=setupRoomRenovation(params),house=setupHouseInteractions(params),bath=setupBathroomRefinement({...params,house}),cabinetry=setupCabinetryV7({...params,house});bath.finalizeCabinetry();
 const existing=meshes(model),accessories=setupBathroomAccessories(params);model.updateMatrixWorld(true);
 return {...params,renovation,house,bath,cabinetry,existing,accessories};
}
const f=await fixture();

test('all requested bathroom accessories exist against the refined real apartment model',()=>{
 assert.equal(f.accessories.rolls.length,3);assert.equal(f.accessories.showerShelves.length,3);
 assert.equal(f.accessories.towelRails.filter(x=>x.name.includes('shower')).length,3);
 assert.equal(f.accessories.towelRails.filter(x=>x.name.includes('basin')).length,4);
 assert.equal(f.accessories.sleepwear.length,2);assert.equal(f.accessories.slippers.length,2);
 assert.equal(f.accessories.slippers.reduce((sum,p)=>sum+p.pieces,0),4);
});

// These bounds come from the transformed GLB and generated hollow fixtures,
// rather than from plan coordinates or hand-written collision rectangles.
const solidCategories=new Set(['wall','upperWall','furniture','serviceBacker','door','window','glass']);
const intersections=(objects,obstacles)=>{
 const indexed=obstacles.map(object=>({object,box:bounds(object)})),hits=[];
 for(const object of objects){const box=bounds(object);for(const item of indexed){const d=depth(box,item.box);if(d.every(v=>v>.002))hits.push({addition:raw(object),existing:raw(item.object),overlap_mm:d.map(x=>Math.round(x*10000)/10)});}}
 return hits;
};

test('accessories clear the actual walls, shower dividers, vanity bodies, basins and freestanding bath',()=>{
 const solids=f.existing.filter(o=>solidCategories.has(o.userData.category)&&!/shower riser$/.test(raw(o)));
 const hits=intersections(meshes(f.accessories.root),solids);
 assert.deepEqual(hits,[],'fixture meshes intersect the refined apartment: '+JSON.stringify(hits));
 // Bathroom 3 has a masonry divider overlapping the original glass plane. The
 // installed rail must start at the nearer masonry face, not inside the wall.
 const rail=f.accessories.towelRails.find(r=>r.name==='Bathroom3 shower towel rail').object;
 const divider=f.existing.find(o=>raw(o)==='Bathroom3 shower divider · upper');
 assert.ok(bounds(rail).max.x<bounds(divider).min.x+.002,'Bathroom 3 rail must stay on the room-facing divider surface');
});

test('all three toiletry shelves and bottles are beside the real shower risers',()=>{
 const risers=f.existing.filter(o=>/^(Master|Bathroom2|Bathroom3) shower riser$/.test(raw(o)));
 assert.equal(risers.length,3);
 const hits=intersections(f.accessories.showerShelves.flatMap(s=>meshes(s.object)),risers);
 assert.deepEqual(hits,[],'shower plumbing crosses shelf or bottle geometry: '+JSON.stringify(hits));
 for(const shelf of f.accessories.showerShelves){
  assert.equal(meshes(shelf.object).filter(o=>raw(o).endsWith('rounded bottle')).length,2);
  assert.equal(shelf.openFront,true);
  // The raised front retainer is well below the tops of both bottles.
  const rail=meshes(shelf.object).find(o=>raw(o).endsWith('niche retaining rail'));
  for(const bottle of meshes(shelf.object).filter(o=>raw(o).endsWith('rounded bottle')))assert.ok(bounds(bottle).max.y-bounds(rail).max.y>.08);
 }
});


// A rotated slipper's world AABB includes empty triangular corners. Compare
// convex hulls projected from the real sole/strap vertices to avoid that false hit.
function footprint(root){
 const points=[],v=new THREE.Vector3();root.updateWorldMatrix(true,true);
 for(const o of meshes(root)){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);points.push([v.x,v.z]);}}
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const unique=points.filter((p,i)=>!i||p[0]!==points[i-1][0]||p[1]!==points[i-1][1]);
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const lower=[],upper=[];for(const p of unique){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}
 for(const p of unique.toReversed()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}
 lower.pop();upper.pop();return [...lower,...upper];
}
function footprintGap(a,b){
 let best=-Infinity;for(const hull of[a,b])for(let i=0;i<hull.length;i++){const p=hull[i],q=hull[(i+1)%hull.length],length=Math.hypot(q[0]-p[0],q[1]-p[1]),axis=[(q[1]-p[1])/length,-(q[0]-p[0])/length];const pa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),pb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);best=Math.max(best,Math.min(...pa)-Math.max(...pb),Math.min(...pb)-Math.max(...pa));}return best;
}

test('two plastic slipper pairs rest within the master ensuite floor and remain separate from the bath',()=>{
 const floor=bounds(f.existing.find(o=>raw(o)==='Master ensuite · limestone floor'));
 const tub=bounds(f.bath.fixtures.find(o=>o.kind==='bath').object);
 for(const pair of f.accessories.slippers){
  const b=bounds(pair.object);
  assert.ok(b.min.x>floor.min.x&&b.max.x<floor.max.x&&b.min.z>floor.min.z&&b.max.z<floor.max.z,pair.name+' is outside the ensuite floor');
  assert.ok(b.min.y>=floor.max.y-.002&&b.min.y<=floor.max.y+.008,pair.name+' floats or sinks through floor');
  assert.equal(b.intersectsBox(tub),false,pair.name+' intersects freestanding bath');
  assert.equal(pair.object.children.length,2);
  const [a,c]=pair.object.children.map(footprint);assert.ok(footprintGap(a,c)>0,'paired slippers should not intersect; real hull gap '+footprintGap(a,c));
 }
 assert.equal(bounds(f.accessories.slippers[0].object).intersectsBox(bounds(f.accessories.slippers[1].object)),false);
});

test('room and cabinetry doors clear every accessory throughout their full opening sweep',()=>{
 const additions=meshes(f.accessories.root).map(object=>({object,box:bounds(object)})),hits=[];
 const doors=[...f.house.doors,...f.cabinetry.doors];
 assert.ok(doors.some(d=>d.id==='door-master-bath'));
 assert.ok(doors.some(d=>d.id==='door-bathroom2'));
 assert.ok(doors.some(d=>d.id==='door-bathroom3'));
 for(const door of doors){
  const saved=door.amount??door.openAmount;
  for(let step=0;step<=36;step++){
   if(door.apply)door.apply(step/36);else door.setOpen(step/36,true);
   for(const part of meshes(door.object)){
    const b=bounds(part);
    for(const a of additions)if(depth(a.box,b).every(v=>v>.002))hits.push({door:door.id,step,part:raw(part),addition:raw(a.object)});
   }
  }
  if(door.apply)door.apply(saved);else door.setOpen(saved,true);
 }
 assert.deepEqual(hits,[],'door sweep intersects an accessory: '+JSON.stringify(hits));
});

test('local batching preserves actual accessory geometry and ownership',async()=>{
 const local=await fixture(),a=local.accessories,original=meshes(a.root),before=bounds(a.root),triangles=original.reduce((sum,o)=>sum+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0);
 a.finalize();const after=meshes(a.root),afterBounds=bounds(a.root);
 assert.ok(afterBounds.min.distanceTo(before.min)<1e-6&&afterBounds.max.distanceTo(before.max)<1e-6);
 assert.equal(a.audit.triangles,triangles);
 assert.ok(after.every(o=>o.userData.noMerge));
 assert.ok(after.length<original.length/2,'static accessory meshes should be batched');
 assert.ok(after.every(o=>Array.from(o.geometry.attributes.position.array).every(Number.isFinite)));
 const poses=after.map(o=>o.geometry.uuid);a.finalize();assert.deepEqual(meshes(a.root).map(o=>o.geometry.uuid),poses);
 a.dispose();a.dispose();assert.equal(a.root.parent,null);
});
