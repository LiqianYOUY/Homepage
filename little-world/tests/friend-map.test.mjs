import test from 'node:test';
import assert from 'node:assert/strict';
import {distanceKm,routePoints,validPoint,MAP_CITIES} from '../friend-map.js';
import {HOME_LOCATION} from '../daylight.js?v=14';
const point=(latitude,longitude)=>({latitude,longitude});
test('great-circle distance handles coincident places, poles and the date line',()=>{
 assert.equal(distanceKm(HOME_LOCATION,HOME_LOCATION),0);
 assert.ok(Math.abs(distanceKm(point(0,0),point(0,90))-10007.557221)<.001);
 assert.ok(Math.abs(distanceKm(point(0,179),point(0,-179))-222.39016)<.001);
 assert.ok(distanceKm(point(90,-120),point(90,70))<1e-8);
 assert.ok(Math.abs(distanceKm(point(0,0),point(0,180))-20015.114442)<.001);
});
test('the Sydney host and city choices are valid, with independent inter-city sanity checks',()=>{
 assert.equal(HOME_LOCATION.label,'悉尼');assert.ok(validPoint(HOME_LOCATION));
 for(const c of MAP_CITIES)assert.ok(validPoint(point(c[2],c[3])));
 const distance=name=>{const c=MAP_CITIES.find(c=>c[1]===name);return distanceKm(HOME_LOCATION,point(c[2],c[3]));};
 assert.ok(distance('Melbourne')>710&&distance('Melbourne')<715);
 assert.ok(distance('London')>16980&&distance('London')<17020);
 for(const p of [null,{},point(NaN,0),point(0,Infinity),point(91,0),point(0,-181)]){assert.equal(validPoint(p),false);assert.equal(distanceKm(HOME_LOCATION,p),null);assert.deepEqual(routePoints(HOME_LOCATION,p),[]);}
});
test('map arcs terminate at both pins and follow a shortest route even for antipodes',()=>{
 for(const [a,b] of [[HOME_LOCATION,point(51.507,-.128)],[point(0,179),point(0,-179)],[point(0,0),point(0,180)],[point(90,0),point(-90,0)]]){
  const route=routePoints(a,b);assert.ok(route.every(validPoint));assert.ok(distanceKm(route[0],a)<.001);assert.ok(distanceKm(route.at(-1),b)<.001);
  const length=route.slice(1).reduce((sum,p,i)=>sum+distanceKm(route[i],p),0);assert.ok(Math.abs(length-distanceKm(a,b))<.001);
 }
});
