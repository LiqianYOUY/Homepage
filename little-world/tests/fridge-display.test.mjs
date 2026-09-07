import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupSmartHome}=await import('../smart-home.js');

const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene();scene.add(model);
let state={};
const smart=setupSmartHome({THREE,scene,model,getState:()=>state,setState:patch=>{state={...state,...patch};}});
const fridge=smart.refrigerators[0].object;
scene.updateMatrixWorld(true);
const parts=[];fridge.traverse(o=>{if(o.isMesh)parts.push(o);});
const screen=parts.find(o=>o.name.endsWith('large glass touchscreen'));
const degree=parts.find(o=>o.name.endsWith('temperature degree'));
const minus=parts.find(o=>o.name.endsWith('freezer minus sign'));
const digits=n=>parts.filter(o=>o.userData.digit===n);
const world=o=>o.getWorldPosition(new THREE.Vector3());
const centre=objects=>objects.reduce((p,o)=>p.add(world(o)),new THREE.Vector3()).divideScalar(objects.length);

// This tests the rendered view convention rather than duplicating the pixel-placement formula.
// The refrigerator's front surface looks towards -Z, so the camera must stand on that side.
const front=fridge.localToWorld(new THREE.Vector3(0,0,-1)).sub(fridge.getWorldPosition(new THREE.Vector3())).normalize();
function cameraAt(yaw){
 const camera=new THREE.PerspectiveCamera(42,1,.01,20),target=world(screen);
 const direction=front.clone().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
 camera.position.copy(target).addScaledVector(direction,1.8);camera.position.y+=.12;
 camera.lookAt(target);camera.updateMatrixWorld(true);return camera;
}
const cameras=[0,-Math.PI/6,Math.PI/6].map(cameraAt);
const project=(point,camera)=>point.clone().project(camera);
const projectedCentre=(objects,camera)=>project(centre(objects),camera);
after(()=>smart.dispose());

test('the domestic fridge and display fit below the full-height cupboard surround',()=>{
 const size=new THREE.Box3().setFromObject(fridge).getSize(new THREE.Vector3());
 assert.ok(Math.abs(size.x-.96)<.001&&Math.abs(size.y-1.83)<.001&&size.z<.80);
 const display=new THREE.Box3().setFromObject(screen).getSize(new THREE.Vector3());
 assert.ok(Math.abs(Math.hypot(display.x,display.y)/.0254-21.6)<.1);
 const surround=scene.getObjectByName('Smart fridge full-height surrounding storage');assert.ok(surround);assert.ok(Math.abs(new THREE.Box3().setFromObject(surround).max.y-2.46)<.001);
});

test('the front and two oblique views read the refrigerator and freezer numbers from left to right',()=>{
 assert.ok(screen&&degree&&minus);
 assert.deepEqual([0,4,1,8].map(n=>digits(n).length),[6,4,2,7]);
 for(const camera of cameras){
  const zero=projectedCentre(digits(0),camera),four=projectedCentre(digits(4),camera),unit=project(world(degree),camera);
  assert.ok(zero.x<four.x&&four.x<unit.x,'upper row must read 04° in viewer coordinates');
  const negative=project(world(minus),camera),one=projectedCentre(digits(1),camera),eight=projectedCentre(digits(8),camera);
  assert.ok(negative.x<one.x&&one.x<eight.x,'lower row must read −18 in viewer coordinates');
  assert.ok(zero.y>one.y&&four.y>eight.y,'refrigerator temperature stays above freezer temperature');
 }
});

test('the numeral 4 has an upper left stroke and a complete right side rather than a mirrored form',()=>{
 const four=digits(4),segment=id=>four.find(o=>o.userData.segment===id);
 for(const camera of cameras){
  const upperLeft=project(world(segment(5)),camera),upperRight=project(world(segment(1)),camera),lowerRight=project(world(segment(2)),camera),middle=project(world(segment(6)),camera);
  assert.ok(upperLeft.x<middle.x&&middle.x<upperRight.x&&middle.x<lowerRight.x,'4 must have both long strokes on its viewer-right side');
  assert.ok(upperLeft.y>middle.y&&upperRight.y>middle.y&&lowerRight.y<middle.y,'4 must retain its vertical orientation');
 }
});

test('every illuminated digit is in front of the glass and visible from the front camera',()=>{
 const camera=cameras[0],ray=new THREE.Raycaster();
 for(const pixel of parts.filter(o=>Number.isInteger(o.userData.digit))){
  const point=world(pixel);
  assert.ok(point.clone().sub(world(screen)).dot(front)>0,'digit must sit outside the glass');
  ray.set(camera.position,point.clone().sub(camera.position).normalize());
  const hit=ray.intersectObject(fridge,true)[0];
  assert.equal(hit?.object,pixel,'digit must not be hidden behind an appliance panel');
 }
});
