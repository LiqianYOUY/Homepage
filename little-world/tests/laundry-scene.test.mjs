import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupLaundry}=await import('../laundry.js?v=14');
const {createLaundryLifecycle,WASH_DURATION,DRY_DURATION}=await import('../laundry-lifecycle.js?v=14');

test('actual GLB washer and dryer show the same clothes moving between their drums',async()=>{
 const data=fs.readFileSync(new URL('../apartment.glb',import.meta.url));const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));const {scene:model}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 let state={},at=Date.UTC(2026,8,7);const getState=()=>state,setState=patch=>state={...state,...patch},now=()=>at,lifecycle=createLaundryLifecycle({getState,setState,now,random:()=>.4});const records=[],laundry=setupLaundry({THREE,model,getState,setState,now,lifecycle,ui:false,register:r=>records.push(r)});
 assert.equal(laundry.audit.washerFound,true);assert.equal(laundry.audit.dryerFound,true);assert.deepEqual(records.map(r=>r.id),['laundry-washer','laundry-dryer']);
 const [washer,dryer]=laundry.machines;assert.ok(Math.abs(washer.object.position.y-.49)<.001);assert.ok(Math.abs(dryer.object.position.y-1.29)<.001);const ids=washer.clothes.children.map(o=>o.userData.garmentId);assert.equal(ids.length,laundry.getStatus().garments.length);assert.equal(dryer.clothes.children.length,0);
 for(const machine of laundry.machines){const b=new THREE.Box3().setFromObject(machine.clothes);if(!b.isEmpty()){const c=machine.object.position;assert.ok(b.min.x>c.x-.17&&b.max.x<c.x+.17);assert.ok(b.min.y>c.y-.17&&b.max.y<c.y+.17);}assert.ok(machine.object.children.some(o=>o.material?.transparent&&o.material.opacity<.2));}
 lifecycle.startWash();laundry.update(.1);assert.notEqual(washer.clothes.rotation.z,0);at+=WASH_DURATION;laundry.update(.1);lifecycle.transferToDryer();assert.equal(washer.clothes.children.length,0);assert.deepEqual(dryer.clothes.children.map(o=>o.userData.garmentId),ids);lifecycle.startDry();at+=DRY_DURATION;laundry.update(.1);lifecycle.collect();assert.equal(dryer.clothes.children.length,0);
 laundry.dispose();let restored=0;model.traverse(o=>{if((o.userData.name||o.name)==='Laundry glass door')restored++;});assert.equal(restored,2,'disposing restores original model faces');
});

test('both laundry drums are recessed through real case openings with no detached rings',async()=>{
 const data=fs.readFileSync(new URL('../apartment.glb',import.meta.url)),loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));const {scene:model}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const source=[];model.traverse(o=>{if((o.userData.name||o.name)==='Laundry stacked machines')source.push(o);});const original=source[0],originalBox=new THREE.Box3().setFromObject(original);
 let state={};const laundry=setupLaundry({THREE,model,getState:()=>state,setState:patch=>state={...state,...patch},ui:false});model.updateWorldMatrix(true,true);assert.equal(laundry.audit.realFrontApertures,2);
 const ray=new THREE.Raycaster();
 for(const machine of laundry.machines){
  const position=machine.object.getWorldPosition(new THREE.Vector3()),rim=new THREE.Box3().setFromObject(machine.rim),collar=new THREE.Box3().setFromObject(machine.collar),barrel=new THREE.Box3().setFromObject(machine.barrel);
  assert.ok(Math.abs(position.z-originalBox.min.z)<1e-8,'door anchor is the measured case front');
  assert.ok(originalBox.min.z-rim.min.z<.037,'door projects only 36 mm');
  assert.ok(collar.max.z>originalBox.min.z+.027&&collar.min.z<rim.max.z,'seal physically spans the door and case front');
  assert.ok(barrel.min.z>originalBox.min.z&&barrel.max.z<originalBox.max.z,'drum lives inside the appliance');
  ray.set(position.clone().add(new THREE.Vector3(0,0,-.30)),new THREE.Vector3(0,0,1));assert.equal(ray.intersectObject(machine.frontPanel).length,0,'case front has a real circular hole');assert.ok(ray.intersectObject(machine.back).length,'looking into the hole reaches the recessed drum back');
  const clothes=new THREE.Box3().setFromObject(machine.clothes);if(!clothes.isEmpty())assert.ok(clothes.min.z>originalBox.min.z+.05&&clothes.max.z<barrel.max.z,'clothes remain inside the real drum');
 }
 assert.equal(original.parent,null,'solid source block cannot cap the holes');laundry.dispose();assert.ok(original.parent,'disposing restores the complete original appliance');assert.deepEqual(new THREE.Box3().setFromObject(original).min.toArray(),originalBox.min.toArray());
});
