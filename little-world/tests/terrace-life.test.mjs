import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {setupTerrace}=await import('../terrace-v7.js');
const {setupTerraceLife}=await import('../terrace-life.js');
const {createWalkCollision}=await import('../walk-collision.js');
const {optimizeScene}=await import('../optimize-scene.js');
const S=.022381665533985514,P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
const meshes=root=>{const result=[];root.traverse(o=>{if(o.isMesh)result.push(o);});return result;};
function fixture(){
 const model=new THREE.Group(),terrace=setupTerrace({THREE,model});
 const life=setupTerraceLife({THREE,model,terrace});
 // A small continuation of the interior slab supports the circular walking body
 // as it crosses each real terrace sliding door threshold.
 const interior=new THREE.Mesh(new THREE.BoxGeometry(13.2,.10,.65),new THREE.MeshBasicMaterial());interior.userData.category='floor';interior.position.copy(P(875.5,303,-.05));interior.position.z+=.32;model.add(interior);
 for(const d of terrace.doors){d.amount=d.target=1;d.object.position.x=d.baseX-(d.width+.015);}
 const walk=createWalkCollision({THREE,model,house:{colliderRoots:[...terrace.colliderRoots,...life.colliderRoots]}});
 return {model,terrace,life,walk};
}
const f=fixture();

test('tent has a visible furnished opening, stays inside the terrace and preserves the facade aisle',()=>{
 const tentBox=new THREE.Box3().setFromObject(f.life.tent),deckBox=new THREE.Box3().setFromObject(f.terrace.root.getObjectByName('Terrace continuous supported floor'));
 assert.ok(tentBox.min.x>deckBox.min.x&&tentBox.max.x<deckBox.max.x);
 assert.ok(tentBox.min.z>deckBox.min.z&&tentBox.max.z<deckBox.max.z);
 assert.ok(f.life.audit.facadeWalkwayClearanceM>.80);
 assert.ok(f.life.audit.planterClearanceM>.04);
 assert.equal(f.life.audit.tentEntrance,'west');
 const materialNames=meshes(f.life.tent).map(m=>m.material.name);
 assert.ok(materialNames.includes('Tent sage sleeping mat'));
 assert.ok(materialNames.includes('Tent cream pillow and blanket'));
 assert.ok(materialNames.includes('Tent terracotta blanket stripes'));
 // A low eye ray sees the interior sleeping mat through the west entrance.
 f.model.updateWorldMatrix(true,true);
 const eye=f.life.tent.localToWorld(new THREE.Vector3(0,.58,2));
 const target=f.life.tent.localToWorld(new THREE.Vector3(0,.095,.3));
 const ray=new THREE.Raycaster(eye,target.clone().sub(eye).normalize());
 const hits=ray.intersectObject(f.life.tent,true);
 assert.ok(hits.length>0);
 assert.match(hits[0].object.material.name,/sleeping mat|pillow and blanket/);
 for(const door of f.terrace.doors){
  for(let i=0;i<=30;i++){
   const point=new THREE.Vector3(door.baseX,1.57,P(0,303).z+.25-i*.70/30);
   assert.equal(f.walk.collision(point),false,'terrace doorway must remain passable: '+door.id+' '+i);
  }
 }
 const z=P(0,303).z-.40;
 for(let i=0;i<=100;i++)assert.equal(f.walk.collision(new THREE.Vector3(P(820,0).x+i*(P(1120,0).x-P(820,0).x)/100,1.57,z)),false,'facade route blocked at sample '+i);
 assert.equal(f.walk.collision(f.life.tent.position.clone().setY(1.57)),true,'low tent is solid to standing walkers');
});

test('exactly three moving butterflies stay outside the facade, inside the rail and above plants',()=>{
 assert.equal(f.life.butterflies.length,3);
 assert.equal(f.life.root.children.filter(g=>g.userData.butterfly).length,3);
 const before=f.life.butterflies.map(b=>b.object.position.clone());
 const bounds=new THREE.Box3(),margin=.02,tentBox=new THREE.Box3().setFromObject(f.life.tent);
 for(let step=0;step<=1600;step++){
  f.life.update(.075,step*.075,false);f.life.root.updateWorldMatrix(true,true);
  for(const b of f.life.butterflies){
   bounds.setFromObject(b.object);
   assert.ok(bounds.min.x>P(581,0).x+margin&&bounds.max.x<P(1170,0).x-margin,'wing crosses side rail');
   assert.ok(bounds.min.z>P(0,166).z+margin&&bounds.max.z<P(0,303).z-margin,'wing crosses facade or north rail');
   assert.ok(bounds.min.y>1.0,'wings should clear the tallest established flowers');
   assert.equal(bounds.intersectsBox(tentBox),false,'flight must clear the tent');
  }
 }
 assert.ok(f.life.butterflies.every((b,i)=>b.object.position.distanceTo(before[i])>.02));
});

test('reduced motion freezes position and wings; animation survives optimization without allocating geometry',()=>{
 const originalMeshes=meshes(f.life.root),geometry=originalMeshes.map(m=>m.geometry),ids=geometry.map(g=>g.uuid);
 assert.ok(originalMeshes.every(m=>m.userData.noMerge));
 optimizeScene({THREE,model:f.model});
 assert.ok(originalMeshes.every(m=>m.parent),'global batching must preserve wing pivots and local transforms');
 const pose=()=>f.life.butterflies.map(b=>[...b.object.position.toArray(),...b.object.quaternion.toArray(),...b.pivots.map(p=>p.rotation.z)]);
 const before=pose();for(let i=0;i<80;i++)f.life.update(.045,120+i*.045,true);
 assert.deepEqual(pose(),before);
 f.life.update(.045,125,false);assert.notDeepEqual(pose(),before);
 assert.deepEqual(originalMeshes.map(m=>m.geometry.uuid),ids);
 for(const g of geometry)for(const value of g.attributes.position.array)assert.ok(Number.isFinite(value));
 assert.ok(f.life.audit.meshCount<=36&&f.life.audit.triangles<10000);
});

test('disposing detaches both decorations and collider and releases each owned geometry once',()=>{
 const local=fixture(),owned=new Set(meshes(local.life.root).map(m=>m.geometry));let disposed=0;
 for(const g of owned)g.addEventListener('dispose',()=>disposed++);
 local.life.dispose();local.life.dispose();local.life.update(.1,50,false);
 assert.equal(local.life.root.parent,null);
 assert.equal(disposed,owned.size);
 assert.ok(!local.model.getObjectByName('Terrace tent solid footprint'));
 local.terrace.dispose();
});
