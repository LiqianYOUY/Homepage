import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundMovement,isEditingNavigationTarget} from '../ground-navigation.js';
import {createWalkCollision} from '../walk-collision.js';
import * as THREE from '../vendor/three.module.js';
const target=(tagName,type='',hidden=false)=>({tagName,type,closest:selector=>selector==='[hidden]'&&hidden?{}:null,getClientRects:()=>[{}]});
test('display checkboxes and hidden focused text do not trap movement after settings close',()=>{
 for(const type of ['checkbox','radio','button','hidden'])assert.equal(isEditingNavigationTarget(target('INPUT',type)),false,type);
 for(const type of ['text','number','search','email'])assert.equal(isEditingNavigationTarget(target('INPUT',type)),true,type);
 assert.equal(isEditingNavigationTarget(target('TEXTAREA')),true);assert.equal(isEditingNavigationTarget(target('SELECT')),true);
 assert.equal(isEditingNavigationTarget(target('INPUT','text',true)),false);assert.equal(isEditingNavigationTarget(null),false);
 assert.equal(isEditingNavigationTarget({...target('INPUT','text'),getClientRects:()=>[]}),false,'CSS-hidden fields also relinquish input');
});
test('movement sweeps do not cross a thin wall and diagonal movement can slide along it',()=>{
 const position={x:0,y:1.57,z:0},movement=createGroundMovement({getPosition:()=>position,getYaw:()=>0,collision:p=>p.x>.05&&p.x<.15});
 movement.setHeld({right:1});for(let i=0;i<60;i++)movement.update(.05);assert.ok(position.x<=.05);
 movement.setHeld({right:1,forward:1});for(let i=0;i<20;i++)movement.update(.05);assert.ok(position.x<=.05&&position.z<-.5);
 movement.cancel();const before={...position};movement.update(.05);assert.deepEqual(position,before);
});
function fixture(){
 const model=new THREE.Group(),floor=new THREE.Mesh(new THREE.BoxGeometry(10,.04,10));floor.position.y=-.02;floor.userData.category='floor';model.add(floor);
 const root=new THREE.Group(),leaf=new THREE.Mesh(new THREE.BoxGeometry(.8,2,.08));leaf.position.y=1;root.add(leaf);model.add(root);
 const walk=createWalkCollision({THREE,model,house:{doors:[{object:root}],chairs:[],colliderRoots:[]}});return {walk,root,leaf};
}
test('a moving door panel under an unchanged parent updates the live collision shape',()=>{
 const {walk,root,leaf}=fixture(),at=x=>({x,y:1.57,z:0});assert.equal(walk.collision(at(0)),true);assert.equal(walk.collision(at(2)),false);
 const parent=root.matrixWorld.clone();leaf.position.x=2;assert.equal(walk.collision(at(0)),false);assert.equal(walk.collision(at(2)),true);assert.ok(root.matrixWorld.equals(parent));
});
test('one snapshot serves hundreds of frame probes without retraversing the moving furniture',()=>{
 const {walk,root,leaf}=fixture();let updates=0;const update=root.updateWorldMatrix;root.updateWorldMatrix=function(...args){updates++;return update.apply(this,args);};
 walk.withSnapshot(()=>{const first=updates;for(let i=0;i<300;i++)assert.equal(walk.collision({x:2,y:1.57,z:0}),false);assert.equal(updates,first);});
 leaf.position.x=2;assert.equal(walk.collision({x:2,y:1.57,z:0}),true);
 assert.throws(()=>walk.withSnapshot(()=>{throw Error('test abort');}),/test abort/);leaf.position.x=3;assert.equal(walk.collision({x:2,y:1.57,z:0}),false,'failed batches release their snapshot');
});
