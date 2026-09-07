import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {setupBathroomMirrors}=await import('../bathroom-mirrors.js');
const {setupBathroomRefinement}=await import('../bathroom-refinement.js');

async function fixture(refine=false){const data=fs.readFileSync(new URL('../apartment.glb',import.meta.url)),loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));const {scene:model}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');if(refine)setupBathroomRefinement({THREE,model});return {model,mirrors:setupBathroomMirrors({THREE,model})};}
test('all bathroom and laundry mirrors face the basins and sit within 2 mm of their real walls',async()=>{
  const {model,mirrors}=await fixture(true);model.updateWorldMatrix(true,true);
  assert.deepEqual(mirrors.mirrors.map(m=>m.name),['Bathroom2 mirror','Bathroom3 mirror','Master vanity mirror','Laundry sink mirror']);
  const ray=new THREE.Raycaster();
  for(const mirror of mirrors.mirrors){
    const b=new THREE.Box3().setFromObject(mirror.object),w=new THREE.Box3().setFromObject(mirror.wall),axis=Math.abs(mirror.normal.x)>.9?'x':'z',gap=mirror.normal[axis]>0?b.min[axis]-w.max[axis]:w.min[axis]-b.max[axis];
    assert.ok(gap>.001&&gap<.002,mirror.name+' is mounted against the wall');
    const faceCenter=mirror.face.getWorldPosition(new THREE.Vector3());
    ray.set(faceCenter.clone().addScaledVector(mirror.normal,.5),mirror.normal.clone().negate());assert.ok(ray.intersectObject(mirror.face).length,mirror.name+' glass faces into the room');
    ray.set(faceCenter.clone().addScaledVector(mirror.normal,-.5),mirror.normal.clone());assert.equal(ray.intersectObject(mirror.face).length,0,mirror.name+' back is not silvered');
    assert.ok(b.min.y>1.04&&b.max.y<2.1,mirror.name+' clears the taps');
    const rear=mirror.object.children.find(o=>o.name.endsWith('warm rear backing'));assert.ok(rear.material.color.r>.5&&rear.material.metalness===0,'cutaway back is a warm opaque panel');
  }
  mirrors.dispose();const old=[];model.traverse(o=>{if(/^(Bathroom[23] mirror|Master vanity mirror)$/.test(o.userData.name||o.name))old.push(o);});assert.equal(old.length,3,'source meshes are restored');
});
test('mirror reflections share one small environment and allocate no live room render passes',async()=>{
  const {mirrors}=await fixture(),maps=mirrors.mirrors.map(m=>m.face.material.envMap);assert.equal(new Set(maps).size,1);assert.equal(maps[0].image.width,128);assert.equal(maps[0].image.height,64);assert.equal(maps[0].mapping,THREE.EquirectangularReflectionMapping);
  const pixels=maps[0].image.data;assert.ok(pixels.some(v=>v>220)&&pixels.some(v=>v<170),'reflection contains bright window highlights and warm room tones');
  assert.equal(mirrors.audit.liveRenderTargets,0);for(const mirror of mirrors.mirrors){assert.ok(mirror.face.material.roughness<.15);assert.equal(mirror.face.material.side,THREE.FrontSide);}mirrors.dispose();
});
