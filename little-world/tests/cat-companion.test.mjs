import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {buildCatVisuals} from '../cat-visuals.js';
import {createCat} from '../cat.js';

const results=[];
const originalRandom=Math.random;
Math.random=()=>.5;

function finiteTree(root,geometry=false){
  root.updateMatrixWorld(true);
  const checked=new Set();
  root.traverse(o=>{
    for(const values of [o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.matrixWorld.elements])
      assert.ok(values.every(Number.isFinite),`${o.name}: finite transforms`);
    if(geometry&&o.geometry&&!checked.has(o.geometry)){
      checked.add(o.geometry);
      for(const [key,attribute] of Object.entries(o.geometry.attributes))
        assert.ok(Array.from(attribute.array).every(Number.isFinite),`${o.name}: finite ${key}`);
    }
  });
}
function check(name,run){run();results.push({name,status:'PASS'});}
function makeFixture({reduced=false,following=false,pointer=null}={}){
  const scene=new THREE.Scene();
  let time=0,frames=0,saved={following},motionReduced=reduced;
  const cat=createCat({THREE,scene,initialPosition:[-6,.03,-1.2],navigation:{points:[[-6,-1.2],[-5.2,-1.2],[-4.4,-1.2]],edges:[[0,1],[1,2]]},getPointerPosition:()=>pointer,getMuted:()=>true,reducedMotion:()=>motionReduced,store:{getCatState:()=>saved,setCatState:next=>{saved=next;}}});
  function step(seconds,onFrame){for(let i=0;i<Math.ceil(seconds*60);i++){time+=1/60;frames++;cat.update(1/60,time);onFrame?.(cat.getStatus());if(frames%12===0)finiteTree(cat.root,frames%120===0);}if(seconds>=.1)finiteTree(cat.root,true);}
  function until(action,seconds=12){let reached=false;for(let i=0;i<Math.ceil(seconds*60);i++){step(1/60);if(cat.getStatus().action===action){reached=true;break;}}assert.ok(reached,`expected ${action}; got ${JSON.stringify(cat.getStatus())}`);}
  return {scene,cat,step,until,setReduced:value=>{motionReduced=value;},setPointer:value=>{pointer=value;},get saved(){return saved;}};
}

try{
  check('visual rig interface, eyes/legs, mouth/tail limits and finite geometry',()=>{
    const root=new THREE.Group(),geometries=new Set(),materials=new Set(),textures=new Set();
    const rig=buildCatVisuals({THREE,root,geometries,materials,textures});
    for(const name of ['torso','head','tailBase'])assert.ok(rig[name]?.isObject3D,name);
    for(const [name,count] of [['legs',4],['ears',2],['eyeGroups',2]]){
      assert.equal(rig[name]?.length,count,name);assert.ok(rig[name].every(o=>o.isObject3D),name);
      assert.equal(new Set(rig[name]).size,count,`${name} distinct pivots`);
    }
    assert.equal(typeof rig.setMouth,'function');assert.equal(typeof rig.animateTail,'function');
    for(const amount of [-1,0,.15,.55,1,2])for(const drinking of [false,true]){rig.setMouth(amount,drinking,2.1);rig.animateTail(2.1,false);finiteTree(root,true);}
    rig.setMouth(0,false,0);rig.animateTail(0,true);finiteTree(root,true);
    assert.ok(geometries.size&&materials.size,'resources registered');
    for(const collection of [geometries,materials,textures])collection.forEach(resource=>resource.dispose());
  });

  check('curved eyes stay above the actual face through squint, blink and recovery without redundant updates',()=>{
    const root=new THREE.Group(),geometries=new Set(),materials=new Set(),textures=new Set();
    const rig=buildCatVisuals({THREE,root,geometries,materials,textures});
    const face=root.getObjectByName('single sculpted soft face'),point=new THREE.Vector3(),origin=new THREE.Vector3(),ray=new THREE.Raycaster();
    const eyeMeshes=rig.eyeGroups.flatMap(eye=>eye.children.filter(o=>o.isMesh));
    const versions=()=>eyeMeshes.map(o=>({positions:o.geometry.attributes.position.version,normals:o.geometry.attributes.normal.version,origin:o.position.toArray()}));
    assert.ok(face?.isMesh);assert.equal(typeof rig.setEyeOpen,'function');assert.ok(eyeMeshes.length>0);
    try{
      for(const [pose,open] of [['open',1],['eating',.68],['petting',.45],['blink',.05],['petting blink',.0225],['recovered',1]]){
        rig.setEyeOpen(open);root.updateMatrixWorld(true);
        rig.eyeGroups.forEach(eye=>assert.equal(eye.scale.y,open,`${pose}: preserve eye-pivot scaling`));
        // Raycast against the rendered head triangles, independently of the
        // projection formula. Check highlights as well as every eye-lens vertex.
        for(const mesh of eyeMeshes){
          const positions=mesh.geometry.attributes.position;
          for(let i=0;i<positions.count;i++){
            point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
            origin.copy(point);origin.z+=1;ray.set(origin,new THREE.Vector3(0,0,-1));
            const hit=ray.intersectObject(face,false)[0];
            assert.ok(hit,`${pose}: ${mesh.name} must remain over the face`);
            const gap=point.z-hit.point.z;
            assert.ok(gap>=.00025&&gap<.025,`${pose}: ${mesh.name} vertex ${i} face gap ${gap} must clear the skin without floating away`);
          }
        }
        const unchanged=versions();rig.setEyeOpen(open);
        assert.deepEqual(versions(),unchanged,`${pose}: unchanged openness must skip geometry, normal and highlight updates`);
      }
      finiteTree(root,true);
    }finally{for(const collection of [geometries,materials,textures])collection.forEach(resource=>resource.dispose());}
  });

  check('feeding reaches bowl, pet interrupts and resumes meal, bowl remains fixed',()=>{
    const f=makeFixture(),foodPosition=f.cat.bowls.food.position.clone(),waterPosition=f.cat.bowls.water.position.clone();
    assert.equal(f.cat.feed(),true);f.until('eat');f.step(.5);const eatingLevel=f.cat.getStatus().foodLevel;
    f.cat.pet();f.step(.1);assert.equal(f.cat.getStatus().action,'pet');f.until('eat',4);assert.ok(f.cat.getStatus().foodLevel<=eatingLevel+.02,'meal resumes remaining progress');
    f.until('idle',8);assert.equal(f.cat.getStatus().goingTo,null);assert.ok(Math.abs(f.cat.getStatus().foodLevel-.28)<1e-9);assert.ok(f.saved.lastMealAt);
    assert.ok(f.cat.bowls.food.position.equals(foodPosition));assert.ok(f.cat.bowls.water.position.equals(waterPosition));f.cat.dispose();
  });

  check('drinking resumes after petting, restores idle and preserves bounded water level',()=>{
    const f=makeFixture();assert.equal(f.cat.water(),true);f.until('drink');f.step(.5);f.cat.pet();f.step(.1);assert.equal(f.cat.getStatus().action,'pet');f.until('drink',4);f.until('idle',7);
    const s=f.cat.getStatus();assert.equal(s.goingTo,null);assert.ok(s.waterLevel>=.5&&s.waterLevel<=1);f.cat.dispose();
  });

  check('visible head, chin and licking tongue stay above the floor through eating and drinking',()=>{
    for(const [method,action] of [['feed','eat'],['water','drink']]){
      const f=makeFixture(),point=new THREE.Vector3(),head=f.cat.root.getObjectByName('Mochi expressive head');let minimumY=Infinity,samples=0;
      assert.ok(head);f.cat[method]();f.step(9,s=>{
        if(s.action!==action)return;samples++;f.cat.root.updateMatrixWorld(true);
        head.traverse(o=>{if(!o.isMesh||!o.visible)return;for(let parent=o.parent;parent;parent=parent.parent)if(!parent.visible)return;const attribute=o.geometry.attributes.position;
          for(let i=0;i<attribute.count;i++){point.fromBufferAttribute(attribute,i).applyMatrix4(o.matrixWorld);minimumY=Math.min(minimumY,point.y);}
        });
      });
      assert.ok(samples>120,`${action} sampled through complete pose`);assert.ok(minimumY>=.03,`${action} head minimum ${minimumY} must clear floor y=.03`);f.cat.dispose();
    }
  });

  check('welcome beg, blink and closed-eye pet response are animated',()=>{
    const f=makeFixture();f.cat.greet();f.step(.1);assert.equal(f.cat.getStatus().action,'beg');assert.ok(f.cat.getStatus().needsAttention);f.until('idle',5);
    // Eye pivots are the paired mesh-bearing Groups whose vertical scale changes
    // together during a natural blink; avoid coupling this to geometry names.
    const blinkCandidates=new Set();f.step(5,()=>{f.cat.root.traverse(o=>{if(o.isGroup&&o.scale.y<.2)blinkCandidates.add(o);});});
    assert.ok(blinkCandidates.size>=2,'both eyes blink');f.cat.pet();f.step(.3);assert.ok([...blinkCandidates].filter(o=>o.scale.y<=.45).length>=2,'petting squints both eyes');f.cat.dispose();
  });

  check('following uses graph, feet animate while walking and reduced motion stays stable',()=>{
    const f=makeFixture({following:true,pointer:new THREE.Vector3(-4.4,.03,-1.2)}),start=f.cat.root.position.clone();
    let walked=false,animated=false,maxStep=0,previous=start.clone();
    f.step(1,s=>{walked ||=s.locomotion==='walk';maxStep=Math.max(maxStep,f.cat.root.position.distanceTo(previous));previous.copy(f.cat.root.position);if(s.locomotion==='walk')animated ||=f.cat.root.children.filter(o=>o.isGroup&&Math.abs(o.rotation.x)>.05).length>=2;});
    assert.ok(walked&&animated,'walking and alternating leg motion observed');assert.ok(f.cat.root.position.distanceTo(start)>.2);assert.ok(maxStep<=.48/60+.00001,'no graph jumps');assert.ok(Math.abs(f.cat.root.position.z+1.2)<1e-9);
    f.setReduced(true);let reducedWalk=false;f.step(.4,s=>{reducedWalk ||=s.locomotion==='walk';});assert.ok(reducedWalk,'reduced motion still permits navigation');
    const phase=f.cat.root.children.map(o=>[o.position.y,o.rotation.x]);f.step(.2);f.cat.root.children.forEach((o,i)=>{assert.ok(Math.abs(o.position.y-phase[i][0])<1e-9,'reduced motion removes walking bounce');assert.ok(Math.abs(o.rotation.x-phase[i][1])<1e-9,'reduced motion removes leg swing');});
    assert.notEqual(f.cat.getStatus().locomotion,'trot');f.cat.dispose();
  });

  check('dispose removes cat and bowls, releases all visible resources exactly once',()=>{
    const f=makeFixture(),resources=new Set(),counts=new Map();
    f.scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);}});
    resources.forEach(r=>r.addEventListener('dispose',()=>counts.set(r,(counts.get(r)||0)+1)));
    f.cat.dispose();assert.equal(f.scene.children.length,0);assert.equal(f.cat.root.parent,null);assert.equal(f.cat.bowls.food.parent,null);assert.equal(f.cat.bowls.water.parent,null);
    resources.forEach(r=>assert.equal(counts.get(r),1,`${r.type||r.constructor.name} disposed once`));
    const before=f.cat.root.position.clone();f.cat.dispose();f.cat.update(.08,99);assert.ok(before.equals(f.cat.root.position));assert.equal(f.cat.feed(),false);assert.equal(f.cat.water(),false);resources.forEach(r=>assert.equal(counts.get(r),1,'second dispose is harmless'));
  });
  console.log(JSON.stringify({status:'PASS',checks:results},null,2));
}finally{Math.random=originalRandom;}
