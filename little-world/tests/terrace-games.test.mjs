import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {register} from 'node:module';
import {decryptGamePackage,GAME_PACKAGE_ITERATIONS,GAME_PACKAGE_MAGIC} from '../game-package.js';
register('./three-test-loader.mjs',import.meta.url);
const THREE=await import('../vendor/three.module.js');
const {setupTerrace}=await import('../terrace-v7.js');
const {setupTerraceLife}=await import('../terrace-life.js');
const {registerTerraceGameObjects}=await import('../terrace-games.js');
const {optimizeScene}=await import('../optimize-scene.js');

async function seal(plain,password){
  const salt=webcrypto.getRandomValues(new Uint8Array(16)),iv=webcrypto.getRandomValues(new Uint8Array(12));
  const source=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:GAME_PACKAGE_ITERATIONS,hash:'SHA-256'},source,{name:'AES-GCM',length:256},false,['encrypt']);
  const encrypted=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(plain));
  return new Uint8Array([...new TextEncoder().encode(GAME_PACKAGE_MAGIC),...salt,...iv,...new Uint8Array(encrypted)]);
}
test('game content decrypts only with matching password and unmodified ciphertext',async()=>{
  const html='<!doctype html><title>Private game 游戏</title><canvas></canvas>',sealed=await seal(html,'test-password');
  assert.equal(await decryptGamePackage(sealed,'test-password',webcrypto),html);
  await assert.rejects(decryptGamePackage(sealed,'wrong',webcrypto),{name:'OperationError'});
  sealed[sealed.length-1]^=1;
  await assert.rejects(decryptGamePackage(sealed,'test-password',webcrypto),{name:'OperationError'});
});
test('reject invalid or unsupported packages before trying to render them',async()=>{
  await assert.rejects(decryptGamePackage(new Uint8Array(5),'anything',webcrypto),/invalid-game-package/);
  await assert.rejects(decryptGamePackage(new Uint8Array(60),'anything',webcrypto),/invalid-game-package/);
  await assert.rejects(decryptGamePackage(new Uint8Array(60),'anything',{}),/secure-context-required/);
});
test('tent, both chairs and table retain game picking after scene optimization',()=>{
  const model=new THREE.Group(),terrace=setupTerrace({THREE,model}),terraceLife=setupTerraceLife({THREE,model,terrace}),records=[];let opened=0;
  registerTerraceGameObjects({THREE,terrace,terraceLife,register:r=>{records.push(r);r.object.traverse(o=>{if(o.isMesh)o.userData.interactionId=r.id;});},open:()=>opened++});
  assert.equal(records.length,4);assert.equal(records.filter(r=>r.hotspot).length,2);
  const picked=records.map(r=>{const list=[];r.object.traverse(o=>{if(o.isMesh)list.push(o);});assert.ok(list.length);return list;});
  optimizeScene({THREE,model});
  records.forEach((r,i)=>{r.click();assert.ok(picked[i].every(o=>o.parent&&o.userData.interactionId===r.id));assert.ok(r.anchor.toArray().every(Number.isFinite));});
  assert.equal(opened,4);terraceLife.dispose();terrace.dispose();
});
