import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlantLifecycle,getPlantSnapshot,PLANTS,DAY} from '../plant-lifecycle.js?v=13';

function fixture(){let date=Date.UTC(2026,8,7),state={gardenWorld:{}};const life=createPlantLifecycle({getState:()=>state,setState:patch=>state={...state,...patch},now:()=>date});return {life,get state(){return state;},advance:days=>date+=days*DAY,get now(){return date;}};}
function tend(f,days){for(let i=0;i<days;i++){f.advance(1);f.life.water('test');f.life.fertilize('test');}}

test('growth follows calendar days, repeated watering cannot force flowering',()=>{const f=fixture();f.life.ensureBed('test');assert.ok(f.life.plant('test','sunflower').ok);for(let i=0;i<100;i++)f.life.water('test');assert.equal(f.life.getBed('test').phase,'seed');tend(f,10);assert.equal(f.life.getBed('test').phase,'sprout');tend(f,15);assert.equal(f.life.getBed('test').phase,'growing');tend(f,60);assert.equal(f.life.getBed('test').phase,'flowering');});

test('offline drought catches up immediately and late watering cannot revive dead plants',()=>{const f=fixture();f.life.ensureBed('test');f.life.plant('test','daisy');f.advance(14);assert.equal(f.life.getBed('test').witherCause,'dry');assert.equal(f.life.water('test').ok,false);assert.equal(f.life.getBed('test').phase,'withered');assert.equal(f.life.plant('test','mint').reason,'clear-first');assert.ok(f.life.clear('test').ok);assert.ok(f.life.plant('test','mint').ok);assert.equal(f.life.getBed('test').phase,'seed');});

test('feeding omission depletes container mix over months despite continued water',()=>{const f=fixture();f.life.ensureBed('test');f.life.plant('test','daisy');for(let i=0;i<PLANTS.daisy.depletion;i++){f.advance(1);f.life.water('test');}assert.equal(f.life.getBed('test').witherCause,'nutrients');});

test('a flowering display ends without declaring a perennial species biologically annual',()=>{const f=fixture();f.life.ensureBed('test');f.life.plant('test','sunflower');tend(f,PLANTS.sunflower.flower+PLANTS.sunflower.bloom);assert.equal(f.life.getBed('test').phase,'withered');assert.equal(f.life.getBed('test').witherCause,'season');assert.equal(f.life.cleanupCandidates().length,0);f.advance(1);assert.equal(f.life.cleanupCandidates().length,1);});

test('cut stems are finite inventory, survive reload, and cannot be duplicated across vases',()=>{const f=fixture();f.life.ensureBed('test');f.life.plant('test','sunflower');tend(f,85);assert.ok(f.life.harvest('test').ok);assert.equal(f.life.getBed('test').phase,'flowering');assert.equal(f.life.harvest('test').ok,false);assert.ok(f.life.arrange('living').ok);assert.equal(f.life.arrange('dining').ok,false);const restored=createPlantLifecycle({getState:()=>f.state,now:()=>f.now});assert.equal(restored.getVase('living').species,'sunflower');f.advance(8);assert.equal(restored.getVase('living').withered,true);assert.equal(restored.availableCuttings().length,0);});

test('legacy click-grown flowers migrate once without immediate historical neglect',()=>{const f=fixture();f.life.ensureBed('test',{legacy:{seed:'daisy',stage:3,flowersCollected:5}});assert.equal(f.life.getBed('test').phase,'flowering');assert.equal(f.life.getBed('test').flowers,5);const plantedAt=f.life.getBed('test').plantedAt;f.advance(2);f.life.ensureBed('test',{species:'mint',established:true});assert.equal(f.life.getBed('test').plantedAt,plantedAt);assert.equal(f.life.getBed('test').species,'daisy');});

test('long-lived herbs and tulip bulbs retain species-specific times and feeding intervals',()=>{assert.ok(PLANTS.rosemary.flower>=365);assert.ok(PLANTS.lavender.germination>PLANTS.sunflower.germination);assert.ok(PLANTS.rosemary.feed>PLANTS.sunflower.feed);const f=fixture();f.life.ensureBed('test');f.life.plant('test','tulip');assert.equal(f.life.getBed('test').bulb,true);assert.equal(f.life.getBed('test').flowerDays,120);});

test('corrupt timestamps cannot produce negative ages or NaN display state',()=>{const s=getPlantSnapshot({species:'mint',plantedAt:Infinity,lastWateredAt:'bad',lastFertilizedAt:null},Date.UTC(2026,8,7));assert.ok(Number.isFinite(s.ageDays));assert.ok(s.ageDays>=0);assert.ok(Number.isFinite(s.waterDueInDays));});
