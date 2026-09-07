import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {GLTFLoader}=await import('../vendor/GLTFLoader.js');
const {correctFurnitureScale}=await import('../furniture-scale.js');
const bytes=fs.readFileSync(new URL('../apartment.glb',import.meta.url));
const loader=new GLTFLoader().register(()=>({name:'HeadlessTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const {scene:model}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const parts=[];model.traverse(o=>{if(o.isMesh)parts.push(o);});
const raw=o=>o.userData.name||o.name,bounds=o=>new THREE.Box3().setFromObject(o);
test('source dining seats, sofa cushions and tabletop have measured domestic heights and keep their support relationships',()=>{
 const originals=parts.map(o=>({o,y:o.position.y,scale:o.scale.clone()}));
 const props=parts.filter(o=>/^Dining (?:plate|vase|flower|stem|leaf|table runner|bowl|cup)/i.test(raw(o))).map(o=>({o,bottom:bounds(o).min.y}));
 const fix=correctFurnitureScale({THREE,model});
 const chairs=parts.filter(o=>/^Dining (?:west|east|north|south) .*seat$/.test(raw(o)));assert.equal(chairs.length,8);
 for(const o of chairs)assert.ok(Math.abs(bounds(o).max.y-.46)<.002,raw(o));
 const sofa=parts.filter(o=>raw(o).startsWith('Living sofa ')&&raw(o).includes('seat'));
 assert.ok(sofa.length>0);for(const o of sofa)assert.ok(Math.abs(bounds(o).max.y-.46)<.002,raw(o));
 assert.ok(Math.abs(bounds(parts.find(o=>raw(o)==='Dining table top')).max.y-.76)<.001);
 for(const p of props)assert.ok(Math.abs(bounds(p.o).min.y-(p.bottom-.035))<1e-6,'table prop preserves its tabletop offset');
 fix.dispose();for(const p of originals){assert.equal(p.o.position.y,p.y);assert.ok(p.o.scale.equals(p.scale));}
});
