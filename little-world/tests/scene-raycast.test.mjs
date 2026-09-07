import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return next(specifier==='three'?new URL('../vendor/three.module.js',import.meta.url).href:specifier,context);}});
const {optimizeScene}=await import('../optimize-scene.js');

function fixture(nonIndexed=false){
 const model=new THREE.Group(),material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});
 for(let i=0;i<9;i++){
  let geometry=i%2?new THREE.SphereGeometry(.45,16,10):new THREE.BoxGeometry(.8,1,.65);
  if(nonIndexed)geometry=geometry.toNonIndexed();
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Spatial source '+i;mesh.userData.category='furniture';mesh.position.set((i%3-1)*3,.5,Math.floor(i/3)*3);mesh.rotation.y=i*.27;mesh.scale.x=i===2?-1:1;model.add(mesh);
 }
 model.position.set(2,.2,-1);model.rotation.y=.37;model.scale.set(1.3,.9,.8);model.updateMatrixWorld(true);
 const stats=optimizeScene({THREE,model}),merged=model.children.find(o=>o.userData.optimizedStatic);assert.ok(merged);
 return {model,stats,merged};
}
const plain=hits=>hits.map(hit=>({distance:hit.distance,point:hit.point.toArray(),faceIndex:hit.faceIndex,face:hit.face?{a:hit.face.a,b:hit.face.b,c:hit.face.c,normal:hit.face.normal.toArray(),materialIndex:hit.face.materialIndex}:null,uv:hit.uv?.toArray(),uv1:hit.uv1?.toArray()}));
function compare(mesh,raycaster){
 const range={...mesh.geometry.drawRange},expected=[],actual=[];
 THREE.Mesh.prototype.raycast.call(mesh,raycaster,expected);mesh.raycast(raycaster,actual);
 assert.deepEqual(plain(actual),plain(expected),'exact native triangle, face, UV, distance and hit order');assert.deepEqual(mesh.geometry.drawRange,range);
 return actual.length;
}
for(const nonIndexed of [false,true])test(`partitioned ${nonIndexed?'non-indexed':'indexed'} batches preserve exact raycast hits and rendering geometry`,()=>{
 const {model,stats,merged}=fixture(nonIndexed);assert.equal(stats.triangles.unchanged,true);assert.equal(stats.after.meshes,1);assert.equal(merged.geometry.groups.length,0);
 const ray=new THREE.Raycaster(),target=new THREE.Vector3();let hits=0;
 for(let x=-4;x<=4;x+=.4)for(let z=-1;z<=7;z+=.4){
  target.set(x,.4,z).applyMatrix4(model.matrixWorld);
  ray.set(target.clone().add(new THREE.Vector3(.3,5,.1)),new THREE.Vector3(-.3,-5,-.1).normalize());hits+=compare(merged,ray);
  ray.far=2;compare(merged,ray);ray.far=Infinity;
 }
 assert.ok(hits>20);assert.equal(merged.geometry.drawRange.count,Infinity);
 const center=new THREE.Vector3(-3,.5,0).applyMatrix4(model.matrixWorld);
 for(const side of [THREE.FrontSide,THREE.BackSide,THREE.DoubleSide]){
  merged.material.side=side;ray.set(center.clone().add(new THREE.Vector3(0,0,5)),new THREE.Vector3(0,0,-1));compare(merged,ray);
  ray.set(center,new THREE.Vector3(1,0,0));compare(merged,ray);
 }
 ray.set(center.clone().add(new THREE.Vector3(0,5,0)),new THREE.Vector3(0,-1,0));
 for(const [near,far] of [[0,3],[4.7,5.2],[5.2,8],[0,Infinity]]){ray.near=near;ray.far=far;compare(merged,ray);}ray.near=0;ray.far=Infinity;
 merged.geometry.setDrawRange(3,90);assert.ok(compare(merged,ray)>0);merged.geometry.setDrawRange(1,91);compare(merged,ray);
 merged.geometry.setDrawRange(0,Infinity);model.scale.x*=-1;model.updateMatrixWorld(true);
 const reflectedCenter=new THREE.Vector3(-3,.5,0).applyMatrix4(model.matrixWorld);ray.set(reflectedCenter.clone().add(new THREE.Vector3(0,5,0)),new THREE.Vector3(0,-1,0));assert.ok(compare(merged,ray)>0);
 merged.geometry.translate(.2,0,.1);compare(merged,ray);
});

test('a raycast exception restores the original range for the next render',()=>{
 const {merged,model}=fixture(),center=new THREE.Vector3(-3,.5,0).applyMatrix4(model.matrixWorld),ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,5,0)),new THREE.Vector3(0,-1,0));
 const geometry=merged.geometry,range={...geometry.drawRange},index=geometry.index,getX=index.getX;
 index.getX=()=>{throw new Error('probe failed');};assert.throws(()=>merged.raycast(ray,[]),/probe failed/);assert.deepEqual(geometry.drawRange,range);index.getX=getX;
 assert.ok(compare(merged,ray)>0);
});
