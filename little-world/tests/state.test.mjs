import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../state.js?v=14';
import fs from 'node:fs';

test('laundry, garden and curtains survive browser reload and exported-backup import with personal notes intact',async()=>{
 const values=new Map();
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const options={storage,pageURL:'https://example.test/little-world/',communityClient:{stateTransport:{enabled:false}},fetchImpl:async()=>new Response('[]'),now:()=>new Date('2026-09-07T04:00:00Z')};
 const first=await createStore(()=>{},()=>{},options);
 const laundry={version:1,nextBatchAt:1789963200000,sequence:1,batch:{phase:'washing',startedAt:1788753600000,garments:['shirt','towel']}};
 const gardenWorld={version:1,beds:{'indoor-planter':{species:'sunflower',plantedAt:1788753600000}}};
 const notes=[{id:'personal',text:'我的生活记录：厨房与书房',color:'sage',x:12,y:25}];
 first.set({laundry,gardenWorld,bedroomCurtains:{master:false},notes});
 const backup=first.export();first.dispose();
 const reloaded=await createStore(()=>{},()=>{},options);
 for(const [key,expected] of Object.entries({laundry,gardenWorld,bedroomCurtains:{master:false},notes}))assert.deepEqual(reloaded.get()[key],expected);
 reloaded.dispose();values.clear();
 const imported=await createStore(()=>{},()=>{},options);imported.import(JSON.parse(backup));
 assert.deepEqual(imported.get().laundry,laundry);assert.deepEqual(imported.get().gardenWorld,gardenWorld);assert.deepEqual(imported.get().notes,notes);imported.dispose();
});

test('published books reach new and returning readers without duplicating the host’s saved links',async()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../books/catalog.json',import.meta.url),'utf8'));
 assert.equal(catalog.length,6);
 const makeOptions=(saved)=>{const values=new Map(saved?[['little-world-browser-state-v7',JSON.stringify(saved)]]:[]);return {storage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},pageURL:'https://example.test/little-world/',communityClient:{stateTransport:{enabled:false}},fetchImpl:async(_url,options)=>{assert.equal(options.cache,'no-cache');return Response.json(catalog);}};};
 const fresh=await createStore(null,null,makeOptions());assert.deepEqual(fresh.get().papers.map(p=>p.id),catalog.map(p=>p.id));fresh.dispose();
 const personal={id:'mine',title:'My reading',url:'https://example.test/reading'};
 const legacy={version:5,notes:[],libraryInitialized:true,papers:[{...catalog[0],title:'My Flatland title'},catalog[1],personal]};
 const options=makeOptions(legacy),returning=await createStore(null,null,options);
 assert.deepEqual(returning.get().papers.map(p=>p.id),['pg97','pg35','mine','pg1661','pg1342']);assert.equal(returning.get().papers[0].title,'My Flatland title');
 returning.set({papers:returning.get().papers.filter(p=>p.id!=='pg1661')});returning.dispose();
 const again=await createStore(null,null,options);assert.ok(!again.get().papers.some(p=>p.id==='pg1661'),'a removed published book stays removed');assert.ok(again.get().papers.some(p=>p.id==='mine'));again.dispose();
 const host=await createStore(null,null,makeOptions({version:5,notes:[],papers:[...catalog.slice(0,4),{...catalog[4],id:'user-sherlock'},{...catalog[5],id:'user-pride'}]}));
 assert.equal(host.get().papers.length,6);assert.equal(host.get().papers[4].id,'user-sherlock');host.dispose();
});

test('catalogue updates survive offline reloads and an older personal backup import',async()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../books/catalog.json',import.meta.url),'utf8')),values=new Map();let online=true;
 const options={storage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},pageURL:'https://example.test/little-world/',communityClient:{stateTransport:{enabled:false}},fetchImpl:async()=>{if(!online)throw Error('offline');return Response.json(catalog);}};
 const first=await createStore(null,null,options);const notes=[{id:'private',text:'Only for me'}];first.import({version:5,notes,papers:catalog.slice(0,4)});assert.equal(first.get().papers.length,6);assert.deepEqual(first.get().notes,notes);first.dispose();
 online=false;const offline=await createStore(null,null,options);assert.equal(offline.get().papers.length,6);assert.deepEqual(offline.get().notes,notes);offline.dispose();
});
