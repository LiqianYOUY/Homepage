import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../state.js?v=13';

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
