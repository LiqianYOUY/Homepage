import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommunityClient, validateSharedBookURL} from '../community-client.js';
const visitorResponse={visitor:{storageKey:'guest-device-123',name:'Friend',avatar:5},community:{today:1,total:1,history:[],postcards:[]},stateEnabled:false};
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
const response=value=>Response.json(value);
const remote={apiBase:'https://community.example.com/api/',pageURL:'https://home.example.com/little-world/'};
const book={id:'e8de6163-967d-416a-9c11-de8586681dc9',title:'A book',url:'https://books.example.com/a?edition=2',created:'2026-09-07T00:00:00Z'};

test('a public library requires an explicitly configured remote HTTPS community',async()=>{
 for(const options of [{pageURL:remote.pageURL},{pageURL:'http://127.0.0.1:8766/little-world/'},{apiBase:'http://127.0.0.1:8766/little-world/api/',pageURL:'http://127.0.0.1:8766/little-world/'}]){
  const calls=[];const client=await createCommunityClient({...options,storage:storage(),fetchImpl:async(url)=>{calls.push(url);return response(visitorResponse);}});
  assert.equal(client.library.configured,false);assert.equal(client.library.enabled,false);assert.equal(await client.library.read(),null);
  await assert.rejects(client.library.publish(book),/没有分享/);assert.ok(calls.every(url=>url.endsWith('/visitor')));client.dispose();
 }
 const client=await createCommunityClient({...remote,pageURL:'http://127.0.0.1:8766/little-world/',storage:storage(),fetchImpl:async()=>response(visitorResponse)});
 assert.equal(client.library.configured,true);assert.equal(client.library.enabled,true,'an explicitly configured remote backend may also be used from local preview');client.dispose();
});

test('shared books reject private, credentialed, non-HTTPS and IP literal destinations',()=>{
 for(const url of ['http://books.example.com/a','file:///book.pdf','javascript:alert(1)','https://localhost/a','https://localhost./a','https://room.local/a','https://room.internal/a','https://192.168.1.2/a','https://8.8.8.8/a','https://0x7f000001/a','https://2130706433/a','https://[::1]/a','https://[2606:4700:4700::1111]/a','https://user:secret@books.example.com/a','https://books.example.com/a b','https://books.example.com/'+('a'.repeat(2048))])assert.equal(validateSharedBookURL(url),null,url);
 assert.equal(validateSharedBookURL('https://BOOKS.example.com:443/a?edition=2#chapter3'),book.url);
});

test('library reads are site-wide, and explicit publishes send only the chosen book with a stable retry ID',async()=>{
 const calls=[];const client=await createCommunityClient({...remote,storage:storage(),fetchImpl:async(url,options)=>{calls.push({url,options});return response(url.endsWith('/visitor')?visitorResponse:{books:[book],scope:'site'});}});
 assert.deepEqual(await client.library.read(),{books:[book],scope:'site'});assert.equal(calls.filter(c=>c.options.method==='POST').length,0,'merely reading never publishes private state');
 const payload={...book,notes:[{text:'private'}],musicFavorites:['private']};
 await client.library.publish(payload);await client.library.publish(payload);
 const writes=calls.filter(c=>c.options.method==='POST');assert.equal(writes.length,2);
 assert.deepEqual(JSON.parse(writes[0].options.body),{id:book.id,title:book.title,url:book.url});assert.equal(writes[0].options.body,writes[1].options.body);
 for(const {url,options} of calls){assert.ok(url.startsWith(remote.apiBase));assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.ok(options.headers['X-Little-World-Device']);}
 const count=calls.length;
 await assert.rejects(client.library.publish({...book,url:'https://192.168.1.2/a'}),/HTTPS/);
 await assert.rejects(client.library.publish({...book,title:'🪴'.repeat(401)}),/HTTPS/);
 await assert.rejects(client.library.publish({...book,title:'title\nline'}),/HTTPS/);
 assert.equal(calls.length,count);await client.library.publish({...book,title:'🪴'.repeat(400)});client.dispose();assert.equal(client.library.enabled,false);await assert.rejects(client.library.publish(book),/没有分享/);
});

test('public library startup can reconnect and API failures never become a local sharing success',async()=>{
 let available=false,failWrite=false;
 const client=await createCommunityClient({...remote,storage:storage(),fetchImpl:async(url,options)=>{
  if(!available)throw Error('offline');
  if(url.endsWith('/visitor'))return response(visitorResponse);
  if(options.method==='POST'&&failWrite)return Response.json({error:'Too many books today'},{status:429});
  return response({books:[book],scope:'site'});
 }});
 assert.equal(client.mode,'browser');assert.equal(client.library.enabled,false);available=true;
 assert.deepEqual(await client.library.read(),{books:[book],scope:'site'});assert.equal(client.library.enabled,true);
 failWrite=true;await assert.rejects(client.library.publish(book),/Too many books/);client.dispose();
});

test('malformed or unsafe shared records are rejected before rendering',async()=>{
 for(const value of [{books:[{...book,url:'https://127.0.0.1/a'}],scope:'site'},{books:[book],scope:'browser'},{books:[{...book,title:23}],scope:'site'},{books:[{...book,created:'never'}],scope:'site'}]){
  const client=await createCommunityClient({...remote,storage:storage(),fetchImpl:async(url)=>response(url.endsWith('/visitor')?visitorResponse:value)});
  await assert.rejects(client.library.read(),/无法识别/);client.dispose();
 }
});
