// Solar position equations: NOAA / Jean Meeus.
// https://gml.noaa.gov/grad/solcalc/calcdetails.html
// Computed on device: no weather service, location request, or network dependency.
export const HOME_LOCATION={latitude:-33.8688,longitude:151.2093,timeZone:'Australia/Sydney',label:'悉尼'};
const RAD=Math.PI/180,MINUTE=60000,DAY=86400000;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

function solarTerms(date){
 const t=(date.getTime()/DAY+2440587.5-2451545)/36525;
 const meanLongitude=(280.46646+t*(36000.76983+t*.0003032))%360;
 const anomaly=(357.52911+t*(35999.05029-.0001537*t))*RAD;
 const eccentricity=.016708634-t*(.000042037+.0000001267*t);
 const center=Math.sin(anomaly)*(1.914602-t*(.004817+.000014*t))+Math.sin(2*anomaly)*(.019993-.000101*t)+Math.sin(3*anomaly)*.000289;
 const omega=(125.04-1934.136*t)*RAD;
 const longitude=(meanLongitude+center-.00569-.00478*Math.sin(omega))*RAD;
 const obliquity=(23+(26+(21.448-t*(46.815+t*(.00059-t*.001813)))/60)/60+.00256*Math.cos(omega))*RAD;
 const declination=Math.asin(Math.sin(obliquity)*Math.sin(longitude));
 const y=Math.tan(obliquity/2)**2,l=meanLongitude*RAD;
 const equation=4/RAD*(y*Math.sin(2*l)-2*eccentricity*Math.sin(anomaly)+4*eccentricity*y*Math.sin(anomaly)*Math.cos(2*l)-.5*y*y*Math.sin(4*l)-1.25*eccentricity*eccentricity*Math.sin(2*anomaly));
 return {declination,equation};
}

export function solarPosition(date,location=HOME_LOCATION){
 const {declination,equation}=solarTerms(date),lat=location.latitude*RAD;
 const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60+date.getUTCMilliseconds()/60000;
 const solarMinutes=((minutes+equation+4*location.longitude)%1440+1440)%1440;
 const hourAngle=(solarMinutes/4-180)*RAD;
 const altitude=Math.asin(clamp(Math.sin(lat)*Math.sin(declination)+Math.cos(lat)*Math.cos(declination)*Math.cos(hourAngle),-1,1));
 const azimuth=(Math.atan2(Math.sin(hourAngle),Math.cos(hourAngle)*Math.sin(lat)-Math.tan(declination)*Math.cos(lat))+Math.PI)%(2*Math.PI);
 return {altitude:altitude/RAD,azimuth:azimuth/RAD,morning:hourAngle<0};
}

export function solarTimes(date,location=HOME_LOCATION){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:location.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const value=type=>Number(parts.find(p=>p.type===type).value);
 const midnight=Date.UTC(value('year'),value('month')-1,value('day'));
 let noon=midnight+(720-4*location.longitude)*MINUTE;
 for(let i=0;i<3;i++)noon=midnight+(720-4*location.longitude-solarTerms(new Date(noon)).equation)*MINUTE;
 function event(direction){
  let time=noon;
  for(let i=0;i<4;i++){
   const {declination,equation}=solarTerms(new Date(time)),lat=location.latitude*RAD;
   const cosine=(Math.sin(-.833*RAD)-Math.sin(lat)*Math.sin(declination))/(Math.cos(lat)*Math.cos(declination));
   if(cosine>1||cosine< -1)return null; // Polar night / midnight sun.
   time=midnight+(720-4*location.longitude-equation+direction*4*Math.acos(cosine)/RAD)*MINUTE;
  }
  return new Date(time);
 }
 return {sunrise:event(-1),sunset:event(1),noon:new Date(noon),dateKey:`${value('year')}-${value('month')}-${value('day')}`};
}

export function daylightState(date,location=HOME_LOCATION){
 const position=solarPosition(date,location),height=position.altitude;
 const daylight=smooth(-6,9,height);
 const golden=smooth(-5,0,height)*(1-smooth(3,15,height));
 const direct=smooth(-.833,5,height);
 const phase=height< -6?'night':height<12?(position.morning?'dawn':'dusk'):'day';
 return {...position,daylight,golden,direct,phase,night:height<-.833};
}

export function createDaylight({THREE,scene,renderer,hemi,sun,fill,ground,nightLights,getState,getStudio,getSmart,onChange,location=HOME_LOCATION}){
 let current=null,times=null,lastDay='';
 const color=(target,night,day,daylight,warm,golden)=>target.set(night).lerp(new THREE.Color(day),daylight).lerp(new THREE.Color(warm),golden);
 // Translucent shafts start at the existing terrace glazing and fade into the room.
 // They are scene geometry, so furniture still occludes them and controls stay clear.
 const shafts=new THREE.Group();shafts.name='Morning and evening window light';scene.add(shafts);
 for(const [x,width] of [[-6.7,1.4],[-3.8,1.3],[1.7,1.25]]){
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(12),3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));geometry.setIndex([0,2,1,2,3,1]);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
   uniforms:{tint:{value:new THREE.Color('#ffcd95')},strength:{value:0}},
   vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'uniform vec3 tint; uniform float strength; varying vec2 vUv; void main(){float edge=smoothstep(0.0,0.14,vUv.x)*(1.0-smoothstep(0.86,1.0,vUv.x));float fade=(1.0-smoothstep(0.12,1.0,vUv.y))*smoothstep(0.0,0.06,vUv.y);gl_FragColor=vec4(tint,strength*edge*fade);}'
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.userData={x,width};mesh.raycast=()=>{};mesh.frustumCulled=false;shafts.add(mesh);
 }
 function refresh(date=new Date()){
  current=daylightState(date,location);
  const key=new Intl.DateTimeFormat('en-CA',{timeZone:location.timeZone}).format(date);
  if(key!==lastDay){times=solarTimes(date,location);lastDay=key;}
  const {daylight,golden,direct,azimuth,altitude,night,phase}=current;
  const settings=getState(),lightsOn=settings.smart.lightsOn;
  document.body.classList.toggle('night',night);document.body.dataset.dayPhase=phase;
  hemi.intensity=mix(.5,2.5,daylight);sun.intensity=mix(.12,3.15,direct);fill.intensity=mix(.23,.75,daylight);
  color(hemi.color,'#b7c7e1','#f8fbff',daylight,'#edc2b1',golden*.42);
  color(sun.color,'#c1cce6','#fff1d6',daylight,current.morning?'#ffcd97':'#ffb17d',golden*.85);
  color(fill.color,'#a8bbdc','#dce7f2',daylight,'#eec4cb',golden*.48);
  color(scene.background,'#586878','#e7e8df',daylight,current.morning?'#e8c7b9':'#d6acaa',golden*.62);
  color(ground.material.color,'#667367','#e4e6db',daylight,'#dbc1a0',golden*.3);
  const elevation=Math.max(altitude,8)*RAD,az=azimuth*RAD;
  sun.position.set(Math.sin(az)*24*Math.cos(elevation),Math.sin(elevation)*24,-Math.cos(az)*24*Math.cos(elevation));
  nightLights.forEach(light=>light.intensity=lightsOn?mix(9,1.5,daylight):0);
  const studio=getStudio();if(studio?.lampLight)studio.lampLight.intensity=lightsOn&&settings.settings.deskLight?3:0;
  renderer.toneMappingExposure=mix(1.24,1.16,daylight);
  for(const shaft of shafts.children){
   const {x,width}=shaft.userData,drift=-Math.sin(az)*3.2,length=mix(6.2,3.8,smooth(0,15,altitude));
   shaft.geometry.attributes.position.array.set([x-width/2,2.35,-4.49,x+width/2,2.35,-4.49,x-width*.85+drift,.07,-4.49+length,x+width*.85+drift,.07,-4.49+length]);
   shaft.geometry.attributes.position.needsUpdate=true;
   shaft.material.uniforms.tint.value.copy(sun.color);
  }
  update();onChange?.({...current,...times,location});return current;
 }
 function update(){
  if(!current)return;
  const curtains=getSmart()?.curtains||[],open=curtains.length?curtains.reduce((n,c)=>n+c.openAmount,0)/curtains.length:1;
  const strength=current.golden*current.direct*open*.085;
  shafts.visible=strength>.0001;
  for(const shaft of shafts.children)shaft.material.uniforms.strength.value=strength;
 }
 function resume(){if(!document.hidden)refresh();}
 refresh();const timer=setInterval(()=>{if(!document.hidden)refresh();},30000);
 document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);
 return {refresh,update,getState:()=>({...current,...times,location}),dispose(){clearInterval(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);shafts.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});shafts.removeFromParent();}};
}
