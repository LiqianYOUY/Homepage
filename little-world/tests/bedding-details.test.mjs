import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {correctFurnitureScale}=await import('../furniture-scale.js');
const {setupRoomRenovation}=await import('../room-renovation.js');
const {setupBeddingDetails}=await import('../bedding-details.js');
const {optimizeScene}=await import('../optimize-scene.js');
const raw=o=>o.userData?.name||o.name;
const meshes=root=>{const items=[];root.traverse(o=>{if(o.isMesh)items.push(o);});return items;};
const bounds=o=>new THREE.Box3().setFromObject(o);

async function fixture(){
  const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
  const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  correctFurnitureScale({THREE,model});setupRoomRenovation({THREE,model,getState:()=>({}),setState:()=>{},register:()=>{}});
  const source=meshes(model),before=new Map(source.map(o=>[o,{parent:o.parent,matrix:o.matrix.clone()}]));
  const details=setupBeddingDetails({THREE,model});return {model,source,before,details};
}

// Separating axes distinguish the real inclined ladder stiles from the large
// empty corners of their world AABBs, which overlap the lower mattress visually.
function orientedBox(mesh){
  mesh.geometry.computeBoundingBox();mesh.updateWorldMatrix(true,false);const b=mesh.geometry.boundingBox,e=mesh.matrixWorld.elements;
  const axes=[new THREE.Vector3(e[0],e[1],e[2]),new THREE.Vector3(e[4],e[5],e[6]),new THREE.Vector3(e[8],e[9],e[10])].map(v=>v.normalize()),points=[];
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld));
  return {points,axes};
}
function overlaps(a,b,tolerance=.002){
  const axes=[...a.axes,...b.axes];for(const aa of a.axes)for(const bb of b.axes){const c=new THREE.Vector3().crossVectors(aa,bb);if(c.lengthSq()>1e-12)axes.push(c.normalize());}
  return axes.every(axis=>{const ap=a.points.map(p=>p.dot(axis)),bp=b.points.map(p=>p.dot(axis));return Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp))>tolerance;});
}

test('four measured beds receive supported pillows and layered bedding without moving their mattresses',async()=>{
  const {details,before}=await fixture();assert.equal(details.audit.bedCount,4);assert.equal(details.audit.pillowCount,7);
  const expected=[[1.80,2.03],[1.60,1.95],[1.28,1.92],[.90,1.92]];
  for(const [i,bed] of details.beds.entries()){
    assert.deepEqual(bed.mattress.matrix.elements,before.get(bed.mattress).matrix.elements);
    assert.equal(bed.mattress.parent,before.get(bed.mattress).parent);
    for(let axis=0;axis<2;axis++)assert.ok(Math.abs(bed.mattressDimensionsM[axis]-expected[i][axis])<.001);
    const mattress=bounds(bed.mattress),b=bounds(bed.object);
    assert.ok(b.min.x>=mattress.min.x-.015&&b.max.x<=mattress.max.x+.015,'textiles fit the real mattress width');
    assert.ok(b.min.z>=mattress.min.z-.008&&b.max.z<=mattress.max.z+.008,'textiles stay clear of bed ends');
    assert.ok(b.min.y>mattress.min.y+.05&&b.max.y<mattress.max.y+.15);
    const pillows=meshes(bed.object).filter(o=>/plump pillowcase/.test(raw(o)));assert.equal(pillows.length,bed.pillowCount);
    for(const pillow of pillows)assert.ok(bounds(pillow).min.y>=mattress.max.y&&bounds(pillow).max.y<mattress.max.y+.15);
    for(const o of meshes(bed.object)){assert.equal(o.userData.category,'decor');assert.equal(o.userData.noMerge,true);}
  }
  assert.equal(details.audit.addsColliders,false);
});

test('bed textiles clear actual frames, headboards, upper guards and the inclined bunk ladder',async()=>{
  const {details,source}=await fixture();
  const obstacles=source.filter(o=>o.parent&&['furniture','wall','upperWall','glass','window'].includes(o.userData.category)&&!/mattress/.test(raw(o))).map(o=>({o,box:orientedBox(o),aabb:bounds(o)}));
  for(const textile of meshes(details.root)){
    const aabb=bounds(textile),box=orientedBox(textile);
    for(const obstacle of obstacles){if(!aabb.intersectsBox(obstacle.aabb))continue;assert.equal(overlaps(box,obstacle.box),false,raw(textile)+' intersects '+raw(obstacle.o));}
  }
});

test('local batching preserves all details and disposal restores original textiles after full-scene optimization',async()=>{
  const {details,model,source,before}=await fixture(),removed=source.filter(o=>!o.parent),beforeTriangles=details.audit.triangles;
  assert.equal(removed.length,15);
  const result=details.finalize();assert.equal(result.failedGroups.length,0);assert.equal(details.audit.triangles,beforeTriangles);assert.ok(details.audit.meshCount<=12);assert.ok(details.audit.triangles<50000);
  const names=meshes(details.root).flatMap(o=>o.userData.sourceNames||[raw(o)]);
  assert.equal(names.filter(n=>/softly billowing duvet/.test(n)).length,4);assert.equal(names.filter(n=>/plump pillowcase/.test(n)).length,7);assert.equal(names.filter(n=>/tonal embroidered star/.test(n)).length,6);
  const owned=meshes(details.root),geometryDisposed=new Set(),materialDisposed=new Set();for(const o of owned){o.geometry.addEventListener('dispose',()=>geometryDisposed.add(o.geometry));o.material.addEventListener('dispose',()=>materialDisposed.add(o.material));}
  optimizeScene({THREE,model});assert.ok(owned.every(o=>o.parent&&o.userData.noMerge));assert.equal(details.finalize(),result);
  details.dispose();assert.equal(details.root.parent,null);
  for(const o of removed){assert.equal(o.parent,before.get(o).parent);assert.deepEqual(o.matrix.elements,before.get(o).matrix.elements);}
  assert.equal(geometryDisposed.size,new Set(owned.map(o=>o.geometry)).size);assert.equal(materialDisposed.size,new Set(owned.map(o=>o.material)).size);
  assert.doesNotThrow(()=>details.dispose());
});
