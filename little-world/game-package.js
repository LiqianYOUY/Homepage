// The public site holds ciphertext only. Game HTML is decrypted in memory.
export const GAME_PACKAGE_MAGIC='YOUHOME1';
export const GAME_PACKAGE_ITERATIONS=210000;
export async function decryptGamePackage(buffer,password,cryptoRef=globalThis.crypto){
  if(!cryptoRef?.subtle)throw new Error('secure-context-required');
  const bytes=new Uint8Array(buffer);
  if(bytes.length<52||new TextDecoder().decode(bytes.slice(0,8))!==GAME_PACKAGE_MAGIC)throw new Error('invalid-game-package');
  const material=await cryptoRef.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
  const key=await cryptoRef.subtle.deriveKey({name:'PBKDF2',salt:bytes.slice(8,24),iterations:GAME_PACKAGE_ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
  const plain=await cryptoRef.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(24,36)},key,bytes.slice(36));
  return new TextDecoder('utf-8',{fatal:true}).decode(plain);
}
