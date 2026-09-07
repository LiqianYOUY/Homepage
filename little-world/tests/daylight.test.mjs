import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import * as THREE from '../vendor/three.module.js';
import {HOME_LOCATION, solarTimes, solarPosition, daylightState, createDaylight} from '../daylight.js?v=13';

const minute=60_000;
const dateParts=(date,timeZone=HOME_LOCATION.timeZone)=>{
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
};
const localMinutes=date=>{
  const parts=new Intl.DateTimeFormat('en-AU',{timeZone:HOME_LOCATION.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  return Number(parts.find(part=>part.type==='hour').value)*60+Number(parts.find(part=>part.type==='minute').value);
};
const timesFor=date=>solarTimes(new Date(`${date}T01:00:00Z`));

test('Sydney solstices have the expected seasons, daylight duration and sun direction',()=>{
  const winter=timesFor('2026-06-21'),summer=timesFor('2026-12-21');
  // Broad real-world bounds rather than snapshots of this implementation.
  // Sydney June sunrise is about 07:00 and sunset 16:54 AEST;
  // December sunrise is about 05:41 and sunset 20:05 AEDT.
  assert.ok(Math.abs(localMinutes(winter.sunrise)-420)<=3);
  assert.ok(Math.abs(localMinutes(winter.sunset)-1014)<=3);
  assert.ok(Math.abs(localMinutes(summer.sunrise)-341)<=3);
  assert.ok(Math.abs(localMinutes(summer.sunset)-1205)<=3);
  const winterLength=(winter.sunset-winter.sunrise)/minute;
  const summerLength=(summer.sunset-summer.sunrise)/minute;
  assert.ok(winterLength>590&&winterLength<600);
  assert.ok(summerLength>860&&summerLength<870);
  assert.ok(solarPosition(winter.noon).altitude>32&&solarPosition(winter.noon).altitude<33);
  assert.ok(solarPosition(summer.noon).altitude>79&&solarPosition(summer.noon).altitude<80);
  for(const {sunrise,sunset,noon} of [winter,summer]){
    assert.ok(sunrise<noon&&noon<sunset);
    assert.ok(solarPosition(sunrise).azimuth>45&&solarPosition(sunrise).azimuth<135);
    assert.ok(solarPosition(sunset).azimuth>225&&solarPosition(sunset).azimuth<315);
  }
});

test('every Sydney sunrise and sunset in 2026 crosses the NOAA -0.833 degree horizon on the intended local day',()=>{
  for(let day=0;day<365;day++){
    const date=new Date(Date.UTC(2026,0,1+day,1));
    const times=solarTimes(date),expectedDay=dateParts(date);
    for(const [event,rising] of [['sunrise',true],['sunset',false]]){
      const instant=times[event];
      assert.ok(instant instanceof Date,`${event}: ${expectedDay}`);
      assert.equal(dateParts(instant),expectedDay);
      assert.ok(Math.abs(solarPosition(instant).altitude+.833)<.001,`${event} altitude: ${expectedDay}`);
      const before=solarPosition(new Date(+instant-minute)).altitude;
      const after=solarPosition(new Date(+instant+minute)).altitude;
      assert.ok(rising?before<-.833&&after>-.833:before>-.833&&after<-.833);
    }
  }
});

test('Sydney DST transitions shift wall-clock sunrise while UTC progression remains continuous',()=>{
  const autumnBefore=timesFor('2026-04-04'),autumnAfter=timesFor('2026-04-05');
  const springBefore=timesFor('2026-10-03'),springAfter=timesFor('2026-10-04');
  assert.ok(localMinutes(autumnAfter.sunrise)-localMinutes(autumnBefore.sunrise)<-55);
  assert.ok(localMinutes(springAfter.sunrise)-localMinutes(springBefore.sunrise)>55);
  for(const [before,after] of [[autumnBefore,autumnAfter],[springBefore,springAfter]]){
    assert.ok(Math.abs((after.sunrise-before.sunrise)/minute-1440)<2);
    assert.ok(Math.abs((after.sunset-before.sunset)/minute-1440)<2);
  }
});

test('solar results are independent of the browser or process default time zone',()=>{
  const moduleUrl=new URL('../daylight.js?v=13',import.meta.url).href;
  const script=`import {solarTimes,solarPosition,daylightState} from ${JSON.stringify(moduleUrl)};
    const dates=['2026-04-04T16:30:00Z','2026-10-03T16:30:00Z','2026-12-31T14:00:00Z'];
    console.log(JSON.stringify(dates.map(value=>{const date=new Date(value);return [solarTimes(date),solarPosition(date),daylightState(date)];})));`;
  const results=['UTC','Australia/Sydney','America/Los_Angeles','Asia/Shanghai'].map(TZ=>execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,TZ}}).trim());
  assert.ok(results.every(result=>result===results[0]));
});

test('polar day and polar night have no fabricated events or invalid lighting values',()=>{
  const locations=[
    {latitude:90,longitude:0,timeZone:'UTC'},
    {latitude:-90,longitude:0,timeZone:'UTC'},
    {latitude:69.6492,longitude:18.9553,timeZone:'Europe/Oslo'}
  ];
  for(const location of locations)for(const season of ['2026-06-21','2026-12-21']){
    const date=new Date(`${season}T12:00:00Z`),times=solarTimes(date,location);
    assert.equal(times.sunrise,null);
    assert.equal(times.sunset,null);
    assert.ok(Number.isFinite(+times.noon));
    for(let hour=0;hour<24;hour++){
      const state=daylightState(new Date(`${season}T${String(hour).padStart(2,'0')}:00:00Z`),location);
      for(const key of ['altitude','azimuth','daylight','golden','direct'])assert.ok(Number.isFinite(state[key]),key);
      for(const key of ['daylight','golden','direct'])assert.ok(state[key]>=0&&state[key]<=1,key);
      if(Math.abs(location.latitude)===90){
        const summer=location.latitude>0?season.includes('06-21'):season.includes('12-21');
        assert.equal(state.night,!summer);
        assert.equal(state.phase,summer?'day':'night');
      }
    }
  }
});

test('sunrise, midday, sunset and night select appropriate light phases',()=>{
  const {sunrise,noon,sunset}=timesFor('2026-09-07');
  const dawn=daylightState(new Date(+sunrise+15*minute));
  const dusk=daylightState(new Date(+sunset-15*minute));
  const day=daylightState(noon),night=daylightState(new Date(+sunset+120*minute));
  assert.equal(dawn.phase,'dawn');
  assert.equal(dusk.phase,'dusk');
  assert.ok(dawn.golden>0&&dusk.golden>0);
  assert.ok(dawn.direct>0&&dusk.direct>0);
  assert.equal(day.phase,'day');
  assert.equal(day.golden,0);
  assert.equal(night.phase,'night');
  assert.equal(night.night,true);
  assert.equal(night.direct,0);
});

test('real Three.js lighting follows the sun, smart switches and animated curtains, then disposes cleanly',t=>{
  let controller,controllerDisposed=false;
  const original=new Map(['document','window','setInterval','clearInterval'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const classes=new Map(),listeners=new Map(),timers=new Set();
  const eventTarget=prefix=>({
    addEventListener(type,callback){listeners.set(`${prefix}:${type}`,callback);},
    removeEventListener(type,callback){if(listeners.get(`${prefix}:${type}`)===callback)listeners.delete(`${prefix}:${type}`);}
  });
  globalThis.document={hidden:false,body:{dataset:{},classList:{toggle(name,on){classes.set(name,on);}}},...eventTarget('document')};
  globalThis.window=eventTarget('window');
  globalThis.setInterval=callback=>{const timer={callback};timers.add(timer);return timer;};
  globalThis.clearInterval=timer=>timers.delete(timer);
  t.after(()=>{
    if(controller&&!controllerDisposed)controller.dispose();
    for(const [key,descriptor] of original)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  });
  const scene=new THREE.Scene();scene.background=new THREE.Color('#ffffff');
  const hemi=new THREE.HemisphereLight(),sun=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight();
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial());
  const renderer={toneMappingExposure:1},nightLights=[new THREE.PointLight(),new THREE.PointLight()];
  const studio={lampLight:new THREE.PointLight()},smart={curtains:[{openAmount:1},{openAmount:1}]};
  const settings={smart:{lightsOn:true},settings:{deskLight:true,night:true}};
  let changed;
  controller=createDaylight({THREE,scene,renderer,hemi,sun,fill,ground,nightLights,getState:()=>settings,getStudio:()=>studio,getSmart:()=>smart,onChange:value=>{changed=value;}});
  const {sunrise,noon,sunset}=timesFor('2026-09-07');
  controller.refresh(noon);
  assert.equal(classes.get('night'),false,'old manually stored night preference does not override daylight');
  const daySun=sun.intensity,dayAmbient=hemi.intensity;
  assert.ok(sun.position.y>0&&Number.isFinite(sun.position.length()));
  settings.settings.night=false;
  controller.refresh(new Date(+sunset+180*minute));
  assert.equal(classes.get('night'),true);
  assert.ok(sun.intensity<daySun&&hemi.intensity<dayAmbient);
  assert.ok(nightLights.every(light=>light.intensity>0));
  assert.ok(studio.lampLight.intensity>0);
  settings.smart.lightsOn=false;
  controller.refresh(new Date(+sunset+180*minute));
  assert.ok(nightLights.every(light=>light.intensity===0));
  assert.equal(studio.lampLight.intensity,0);
  settings.smart.lightsOn=true;settings.settings.deskLight=false;
  controller.refresh(new Date(+sunrise+30*minute));
  assert.equal(studio.lampLight.intensity,0);
  const shafts=scene.children.find(child=>child.name==='Morning and evening window light');
  assert.ok(shafts.visible&&shafts.children.length>0);
  const openStrength=shafts.children[0].material.uniforms.strength.value;
  for(const curtain of smart.curtains)curtain.openAmount=.5;
  controller.update();
  const halfStrength=shafts.children[0].material.uniforms.strength.value;
  assert.ok(halfStrength>0&&halfStrength<openStrength);
  for(const curtain of smart.curtains)curtain.openAmount=0;
  controller.update();
  assert.equal(shafts.visible,false);
  assert.ok(shafts.children.every(shaft=>shaft.material.uniforms.strength.value===0));
  assert.equal(dateParts(changed.sunrise),'2026-09-07');
  assert.equal(changed.location.timeZone,'Australia/Sydney');
  assert.equal(timers.size,1);
  assert.equal(listeners.size,2);
  let disposed=0;
  for(const shaft of shafts.children){shaft.geometry.addEventListener('dispose',()=>disposed++);shaft.material.addEventListener('dispose',()=>disposed++);}
  controller.dispose();
  controllerDisposed=true;
  assert.equal(disposed,shafts.children.length*2);
  assert.equal(timers.size,0);
  assert.equal(listeners.size,0);
  assert.equal(shafts.parent,null);
});
