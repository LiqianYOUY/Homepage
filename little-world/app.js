import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {createStore,localDay} from './state.js';
import {createPersonalSpace} from './personal-space.js';
import {createCat} from './cat.js';
import {setupHouseInteractions} from './home-interactions.js';
import {setupStudio} from './studio.js';
import {createWalkCollision} from './walk-collision.js';
import {optimizeScene} from './optimize-scene.js';
import {setupSmartHome} from './smart-home.js';
import {setupTerrace} from './terrace-v7.js';
import {setupCabinetryV7} from './cabinetry-v7.js';
import {createCommunityClient} from './community-client.js?v=8.1';
import {communityAPI} from './community-config.js?v=8.1';
import {createWelcomeWorld} from './welcome-world.js?v=8.1';
import {setupTelevision} from './television.js?v=8.1';
import {houseIcon,visitorAvatar} from './little-icons.js?v=8.1';
import {raiseDialog,consumeDialogEscape,topDialog} from './dialog-stack.js';
import {createGroundNavigation} from './ground-navigation.js?v=8.1';

const $=s=>document.querySelector(s);const S=.022381665533985514;
const P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
let terrace=null,cabinetry=null,smart=null,worldUI=null,tv=null,visitor=null,community=null,lightingReady=false,pointerFloor=null,pointerUpdated=0;
let studio=null,cat=null,house=null,model=null,personal=null,walk=false,currentRoom='overview',showHotspots=true;
let walkCollision=null,watchingCat=false;
let stateStore,moveTween=null,toastTimer=null;const records=new Map(),hotspotEntries=[],wallBoxes=[];let loadDone=false;
const diagnostics={loaded:false,errors:[],recoveredNodes:1459,interactionCount:0};
window.addEventListener('error',e=>diagnostics.errors.push(e.message));
window.addEventListener('unhandledrejection',e=>diagnostics.errors.push(String(e.reason)));
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2700);}
function refreshCare(){if(!stateStore)return;const c=stateStore.get().cat;$('#cat-name').textContent=c.name||'小橘';$('#rename-cat').value=c.name||'小橘';const fed=(c.fedDays||[]).includes(localDay());$('#cat-fed').textContent=fed?'✓ 今天已添粮':'今日还没喂食';$('#feed-cat').textContent=fed?'陪她吃两口':'添一碗猫粮';const start=new Date(c.adopted+'T00:00:00Z');const today=new Date(localDay()+'T00:00:00Z');const days=Math.max(1,Math.round((today-start)/86400000)+1);$('#cat-days').textContent=`相伴第 ${days} 天`;$('#cat-follow').checked=c.following!==false;$('#cat-mute').textContent=c.muted?'♩':'♪';$('#cat-mute').setAttribute('aria-pressed',String(!!c.muted));const catRecord=records.get('cat');if(catRecord){catRecord.label=(c.name||'小橘')+' · 摸摸她';const h=hotspotEntries.find(x=>x.record.id==='cat');if(h){h.button.textContent=catRecord.label;h.button.setAttribute('aria-label',catRecord.label);}}}
const communityClient=await createCommunityClient({apiBase:communityAPI()});visitor=communityClient.visitor;community=communityClient.community;
async function refreshCommunity(){community=await communityClient.refresh();visitor=communityClient.visitor;worldUI?.updateTop();return community;}
async function postcard(kind,text=''){community=await communityClient.postcard(kind,text);return community;}
$('#house-icon').innerHTML=houseIcon;document.querySelector('link[rel=icon]').href='data:image/svg+xml,'+encodeURIComponent(houseIcon.replace('aria-hidden="true"','xmlns="http://www.w3.org/2000/svg"'));$('#cat-avatar-button').innerHTML=visitorAvatar(48);
stateStore=await createStore(()=>{refreshCare();studio?.updateNotes();studio?.refreshBooks?.();if(lightingReady)applyLighting();},message=>$('#save-status').textContent=message,{visitor,communityClient});
const state=()=>stateStore.get(),setState=patch=>stateStore.set(patch);
personal=createPersonalSpace({getState:state,setState,onNotesChange:notes=>studio?.updateNotes(notes),onMusicState:info=>{document.body.dataset.musicPlaying=String(info.playing===true);},toast});
refreshCare();
worldUI=createWelcomeWorld({getVisitor:()=>visitor,getCommunity:()=>community,refreshCommunity,postcard,getSmart:()=>smart,getTerrace:()=>terrace,toast,onStateChange:()=>applyLighting(),onTV:()=>tv?.open(),onMusic:()=>personal.openMusic(),onBooks:()=>{go('study');personal.openLibrary();},onCat:()=>{petCat();$('#focus-cat').click();},onWave:()=>cat?.greet()});
$('#my-world').onclick=()=>worldUI.openProfile();$('#garden-shortcut').onclick=()=>{go('terrace');worldUI.openTerrace();};$('#postcard-shortcut').onclick=()=>worldUI.openPostcards();
$('#cat-avatar-button').onclick=()=>{cat?.greet();$('#focus-cat').click();};$('#water-cat').onclick=()=>cat?.water();
$('#cat-mute').onclick=()=>{const muted=!state().cat.muted;setState({cat:{muted}});$('#cat-mute').textContent=muted?'♩':'♪';$('#cat-mute').setAttribute('aria-pressed',String(muted));toast(muted?'小橘的声音轻轻关上了。':'可以听见小橘打招呼啦。');};
let welcomed=false;document.addEventListener('pointerdown',e=>{if(!welcomed&&cat&&e.isTrusted){welcomed=true;cat.greet();}}, {capture:true});

const scene=new THREE.Scene();scene.background=new THREE.Color('#e7e8df');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('#world').append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','拖动旋转三维家；点击门、龙头、电脑、书籍或猫咪');renderer.domElement.tabIndex=0;
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.04,200);camera.position.set(15,22,27);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.085;controls.minDistance=.75;controls.maxDistance=70;controls.maxPolarAngle=Math.PI*.487;controls.target.set(-1,.4,0);
const hemi=new THREE.HemisphereLight('#f8fbff','#b09b7c',2.5);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff1d6',3.15);sun.position.set(-7,16,-7);sun.castShadow=true;sun.shadow.mapSize.set(3072,3072);Object.assign(sun.shadow.camera,{left:-19,right:19,top:15,bottom:-15,near:1,far:50});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
const fill=new THREE.DirectionalLight('#dce7f2',.75);fill.position.set(12,8,9);scene.add(fill);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e4e6db',roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.23;ground.receiveShadow=true;scene.add(ground);
const nightLights=[];for(const [x,z] of [[620,420],[777,421],[873,407],[1040,365],[529,669],[1380,380],[1380,533]]){const l=new THREE.PointLight('#ffc97e',0,8,1.5);l.position.copy(P(x,z,2.4));scene.add(l);nightLights.push(l);}

function isVisible(o){for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;}
const hotspotLineLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');hotspotLineLayer.classList.add('hotspot-lines');hotspotLineLayer.setAttribute('aria-hidden','true');$('#hotspots').append(hotspotLineLayer);
function register(record){if(!record?.object||!record.id)return;record.object.traverse(o=>{if(o.isMesh)o.userData.interactionId=record.id;});records.set(record.id,record);record.initialPosition=record.object.position.clone();record.initialAnchor=(record.anchor||new THREE.Box3().setFromObject(record.object).getCenter(new THREE.Vector3())).clone();if(record.hotspot!==false&&record.kind!=='chair'){const b=document.createElement('button');b.className='hotspot';b.type='button';b.textContent=record.label;b.setAttribute('aria-label',record.label);b.addEventListener('click',e=>{e.stopPropagation();record.click?.();});$('#hotspots').append(b);const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.style.display='none';hotspotLineLayer.append(line);const size=b.getBoundingClientRect();hotspotEntries.push({record,button:b,line,width:size.width,height:size.height});}diagnostics.interactionCount=records.size;}
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),floorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function setRay(event){const r=renderer.domElement.getBoundingClientRect();pointer.set(((event.clientX-r.left)/r.width)*2-1,-((event.clientY-r.top)/r.height)*2+1);ray.setFromCamera(pointer,camera);}
function pick(event){setRay(event);const hits=ray.intersectObjects(scene.children,true);for(const hit of hits){if(!isVisible(hit.object)||hit.object===ground)continue;const id=hit.object.userData.interactionId;if(id&&records.has(id))return records.get(id);const material=hit.object.material;if((Array.isArray(material)?material.every(m=>m.transparent):material?.transparent)||hit.object.userData.category==='rug')continue;return null;}return null;}
function floorPoint(e){setRay(e);return ray.ray.intersectPlane(floorPlane,new THREE.Vector3());}
let gesture=null,lookYaw=0,lookPitch=0;
const groundNavigation=createGroundNavigation({
 THREE,scene,camera,controls,domElement:renderer.domElement,collision,
 getYaw:()=>lookYaw,isEnabled:()=>walk&&loadDone,isBlocked:()=>!!topDialog(),
 onInputStart:()=>{
  watchingCat=false;moveTween=null;
  if(gesture){const old=gesture;gesture=null;old.record?.drag?.(0,0,{phase:'end',worldPoint:null});try{renderer.domElement.releasePointerCapture(old.id);}catch{}}
  controls.enabled=false;
 }
});
renderer.domElement.addEventListener('pointerdown',e=>{if(groundNavigation.blocksSceneInput()){e.preventDefault();return;}if(e.button!==0)return;watchingCat=false;const rec=pick(e);gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,record:rec,moved:0,maxMoved:0};if(rec||walk){controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);}rec?.drag?.(0,0,{phase:'start',worldPoint:floorPoint(e)});},true);
renderer.domElement.addEventListener('pointermove',e=>{if(groundNavigation.blocksSceneInput()){e.preventDefault();return;}if(!gesture){pointerFloor=floorPoint(e);pointerUpdated=performance.now();}if(gesture&&gesture.id===e.pointerId){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture.moved=Math.hypot(dx,dy);gesture.maxMoved=Math.max(gesture.maxMoved,gesture.moved);if(gesture.record?.drag&&gesture.moved>4){gesture.record.drag(dx,dy,{phase:'move',worldPoint:floorPoint(e)});}else if(walk&&gesture.moved>4&&!gesture.record?.drag){lookYaw-=(e.clientX-gesture.lastX)*.004;lookPitch=THREE.MathUtils.clamp(lookPitch-(e.clientY-gesture.lastY)*.004,-1.18,1.18);camera.rotation.set(lookPitch,lookYaw,0,'YXZ');}gesture.lastX=e.clientX;gesture.lastY=e.clientY;$('#hover-label').hidden=true;return;}const rec=pick(e);renderer.domElement.style.cursor=rec?(rec.drag?'grab':'pointer'):(walk?'crosshair':'grab');const tip=$('#hover-label');tip.hidden=!rec;if(rec){tip.textContent=rec.label+(rec.drag?' · 点击 / 拖动':' · 点击');tip.style.left=Math.min(innerWidth-230,e.clientX+14)+'px';tip.style.top=Math.max(75,e.clientY-32)+'px';}});
function release(e){if(!gesture||gesture.id!==e.pointerId)return;const g=gesture;gesture=null;if(g.maxMoved<5)g.record?.click?.();g.record?.drag?.(e.clientX-g.x,e.clientY-g.y,{phase:'end',worldPoint:floorPoint(e)});controls.enabled=!walk;try{renderer.domElement.releasePointerCapture(e.pointerId);}catch{}}
renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',e=>{gesture=null;controls.enabled=!walk;});renderer.domElement.addEventListener('pointerleave',()=>{$('#hover-label').hidden=true;pointerFloor=null;});

function applyVisibility(){if(!model)return;const wall=$('#full-walls').checked,glass=$('#show-glass').checked,ceiling=$('#show-ceiling').checked;model.traverse(o=>{if(!o.isMesh)return;const c=o.userData.category;if(c==='upperWall')o.visible=wall;else if(['ceilingMain','soffit','ceilingFixture'].includes(c)||c?.startsWith('hvac'))o.visible=ceiling;else if(['glass','window','curtain'].includes(c))o.visible=glass;});for(const curtain of smart?.curtains||[])curtain.object.visible=glass;}
function applyLighting(){if(studio?.lampLight)studio.lampLight.intensity=state().smart.lightsOn&&state().settings.deskLight?3:0;const night=!!state().settings.night;document.body.classList.toggle('night',night);$('#light-mode').innerHTML=night?'☾ <span>夜晚</span>':'☀ <span>日间</span>';hemi.intensity=night?.5:2.5;sun.intensity=night?.5:3.15;fill.intensity=night?.23:.75;sun.color.set(night?'#e4b57b':'#fff1d6');scene.background.set(night?'#717e74':'#e7e8df');ground.material.color.set(night?'#727e6d':'#e4e6db');nightLights.forEach(l=>l.intensity=state().smart.lightsOn?(night?9:1.5):0);renderer.toneMappingExposure=night?1.24:1.16;}
lightingReady=true;applyLighting();
function setReduced(on){setState({settings:{reducedMotion:on}});document.body.dataset.reducedMotion=String(on);$('#reduce-motion').checked=on;}
document.body.dataset.reducedMotion=String(!!state().settings.reducedMotion);$('#reduce-motion').checked=!!state().settings.reducedMotion;
$('#light-mode').onclick=()=>{setState({settings:{night:!state().settings.night}});applyLighting();};$('#reduce-motion').onchange=e=>setReduced(e.target.checked);for(const id of ['full-walls','show-glass','show-ceiling'])$('#'+id).onchange=applyVisibility;

const views={terrace:{eye:[-5.5,5.4,-12.4],target:[-1.2,.45,-6.3]},overview:{eye:[15,22,27],target:[-1,.6,0]},television:{eye:[-7.117,1.65,-3.9],target:[-7.117,1.42,.683]},living:{eye:[-6.8,3.8,-5.3],target:[-6.6,.65,-1.5]},study:{eye:[4.2,2.35,-4.4],target:[1.65,1.14,-3.18]},kitchen:{eye:[-4.8,3.7,-4.6],target:[-1.0,.8,-1.6]},master:{eye:[-9.0,4.5,.1],target:[-6.7,.55,3.43]},garden:{eye:[-6.7,4.8,1.8],target:[-10.8,.6,-1.6]}};
function go(room,instant=false){if(!model)return;watchingCat=false;if(walk)exitWalk(false);currentRoom=room==='television'?'living':room;const v=views[room]||views.overview;let eye=new THREE.Vector3(...v.eye),target=new THREE.Vector3(...v.target);if(room==='overview'){const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());center.y=.5;const direction=eye.clone().sub(target).normalize();const right=new THREE.Vector3().crossVectors(camera.up,direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect;const safeX=innerWidth>1000?.76:.9;let distance=0;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const d=new THREE.Vector3(x,y,z).sub(center);distance=Math.max(distance,d.dot(direction)+Math.abs(d.dot(right))/(tanH*safeX),d.dot(direction)+Math.abs(d.dot(up))/(tanV*.78));}target=center;eye=center.clone().addScaledVector(direction,distance);}
 if(innerWidth<760&&room!=='overview')eye=target.clone().add(eye.sub(target).multiplyScalar(1.18));
 document.body.classList.toggle('close-view',room!=='overview');document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room===currentRoom));
 if(instant||state().settings.reducedMotion){camera.position.copy(eye);controls.target.copy(target);camera.lookAt(target);controls.update();moveTween=null;}else moveTween={start:performance.now(),from:camera.position.clone(),to:eye,lookFrom:controls.target.clone(),lookTo:target};
}
document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>go(b.dataset.room));
$('#desk-shortcut').onclick=()=>{go('study');personal.openNotes();};$('#book-shortcut').onclick=()=>{go('study');personal.openLibrary();};$('#music-shortcut').onclick=()=>personal.openMusic();
const PORTFOLIO='https://liqianyouy.github.io/Homepage/portfolio/';
function openPortfolio(url=PORTFOLIO){$('#portfolio-window').hidden=false;$('#portfolio-frame').src='./portfolio-room.html';$('#portfolio-external').href=url;raiseDialog($('#portfolio-window'));$('#portfolio-close').focus();}
function closePortfolio(){$('#portfolio-window').hidden=true;$('#portfolio-frame').src='about:blank';}
$('#portfolio-shortcut').onclick=()=>{go('study');openPortfolio();};$('#portfolio-close').onclick=closePortfolio;
let floatingDrag=null;$('#portfolio-drag').addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=$('#portfolio-window').getBoundingClientRect();floatingDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};e.currentTarget.setPointerCapture(e.pointerId);});$('#portfolio-drag').addEventListener('pointermove',e=>{if(!floatingDrag||e.pointerId!==floatingDrag.id)return;const panel=$('#portfolio-window');panel.style.left=THREE.MathUtils.clamp(floatingDrag.left+e.clientX-floatingDrag.x,0,innerWidth-180)+'px';panel.style.top=THREE.MathUtils.clamp(floatingDrag.top+e.clientY-floatingDrag.y,0,innerHeight-70)+'px';});$('#portfolio-drag').addEventListener('pointerup',()=>floatingDrag=null);

function feedCat(){const c=state().cat,day=localDay();const already=(c.fedDays||[]).includes(day);if(!already)setState({cat:{fedDays:[...(c.fedDays||[]),day].slice(-730)}});cat?.feed();toast(already?`${c.name}去食盆边吃两口，今天的照顾已经记好啦。`:`给${c.name}添好猫粮了，她去食盆边吃饭啦。`);}

function petCat(){cat?.pet();setState({cat:{pets:(state().cat.pets||0)+1}});$('#cat-status').textContent='呼噜呼噜，她在你身边放松下来。';toast(`${state().cat.name}蹭了蹭你的手。`);}
$('#feed-cat').onclick=feedCat;$('#pet-cat').onclick=petCat;$('#cat-follow').onchange=e=>{cat?.setFollowing(e.target.checked);setState({cat:{following:e.target.checked}});$('#cat-status').textContent=e.target.checked?'在客厅里陪你走走。':'找个舒服的地方歇一会儿。';};
$('#focus-cat').onclick=()=>{if(!cat)return;watchingCat=true;if(walk)exitWalk(false);currentRoom='living';document.body.classList.add('close-view');document.querySelectorAll('[data-room]').forEach(b=>b.classList.toggle('active',b.dataset.room==='living'));const p=cat.root.position;moveTween={start:performance.now(),from:camera.position.clone(),to:p.clone().add(new THREE.Vector3(.4,1.65,-1.2)),lookFrom:controls.target.clone(),lookTo:p.clone().add(new THREE.Vector3(0,.25,0))};};
$('#rename-cat').addEventListener('change',e=>{const name=e.target.value.trim().slice(0,16)||'小橘';setState({cat:{name}});toast('她的新名字是'+name+'。');});
setInterval(refreshCare,60000);

$('#show-settings').onclick=()=>{$('#settings').hidden=!$('#settings').hidden;if(!$('#settings').hidden)raiseDialog($('#settings'));};for(const selector of ['#portfolio-window','#settings']){const panel=$(selector);panel.addEventListener('pointerdown',()=>raiseDialog(panel));panel.addEventListener('focusin',()=>raiseDialog(panel));}$('#close-settings').onclick=()=>$('#settings').hidden=true;
$('#toggle-hotspots').onclick=()=>{showHotspots=!showHotspots;$('#toggle-hotspots').textContent=showHotspots?'隐藏提示':'显示物品提示';};
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('可使用浏览器的全屏功能。');}};
$('#reset-furniture').onclick=()=>{cabinetry?.reset();house?.reset();toast('家具回到最初的位置了。');};
$('#export-data').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([stateStore.export()],{type:'application/json'}));a.href=url;a.download='小小栖居-生活记录-'+localDay()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#import-data').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>2_000_000)throw Error('备份文件太大');const backup=JSON.parse(await file.text());if(backup.version!==5||!Array.isArray(backup.notes))throw Error('请选择有效的生活记录备份');personal.closeAll();worldUI.closeAll();stateStore.import(backup);location.reload();}catch(err){toast(err.message||'无法读取备份');}e.target.value='';};

function insideFloor(x,z){const px=x/S+935,pz=z/S+512;return (px>=393&&px<=1163&&pz>=279&&pz<=583)||(px>=418&&px<=945&&pz>=551&&pz<=740)||(px>=1166&&px<=1478&&pz>=280&&pz<=600);}
function blockers(){const list=wallBoxes.slice();if(house?.doors)for(const d of house.doors){const o=d.object||d.pivot||d.root;if(o)list.push(new THREE.Box3().setFromObject(o));}return list;}
function collision(position){if(walkCollision)return walkCollision.collision(position);if(!insideFloor(position.x,position.z))return true;const radius=.18;for(const b of blockers()){if(b.max.y<.12||b.min.y>1.73)continue;if(position.x>b.min.x-radius&&position.x<b.max.x+radius&&position.z>b.min.z-radius&&position.z<b.max.z+radius)return true;}return false;}
function enterWalk(){if(!loadDone)return;watchingCat=false;walk=true;moveTween=null;controls.enabled=false;camera.position.copy(P(1130,542,1.57));groundNavigation.cancelInput();lookYaw=0;lookPitch=-.32;camera.rotation.set(lookPitch,lookYaw,0,'YXZ');document.body.classList.add('walk-mode');$('#walk-mode').classList.add('active');$('#walk-mode').innerHTML='⌂ <span>退出行走</span>';$('#controls-help').textContent='点击地面箭头走一步 · 长按连续走 · 拖动转头 · WASD 也可以';toast('点地上的方向箭头走一步，按住就能一直走。');}
function exitWalk(restore=true){walk=false;groundNavigation.cancelInput();controls.enabled=true;document.body.classList.remove('walk-mode');$('#walk-mode').classList.remove('active');$('#walk-mode').innerHTML='♧ <span>走进家里</span>';$('#controls-help').textContent='拖动旋转 · 滚轮缩放 · 点击物品使用 · 拖动门和椅子';if(restore)go('overview');}
$('#walk-mode').onclick=()=>walk?exitWalk():enterWalk();
function typing(e){return /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable||e.target.closest('[data-personal-space],[data-home-ui],.studio-window');}
document.addEventListener('keydown',e=>{if(consumeDialogEscape(e,$('#portfolio-window')))closePortfolio();else if(consumeDialogEscape(e,$('#settings')))$('#settings').hidden=true;},true);
window.addEventListener('keydown',e=>{if(e.defaultPrevented||typing(e))return;if(e.key==='Escape'){if(!$('#portfolio-window').hidden)closePortfolio();else if(walk)exitWalk();}});

const sydneyTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Australia/Sydney',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}),sydneyDate=new Intl.DateTimeFormat('zh-CN',{timeZone:'Australia/Sydney',month:'long',day:'numeric',weekday:'short'});
function updateClock(){const now=new Date();const time=sydneyTime.format(now);$('#clock').replaceChildren();const t=document.createElement('strong');t.textContent=time;const d=document.createElement('small');d.textContent='悉尼 · '+sydneyDate.format(now);$('#clock').append(t,d);const hour=Number(time.slice(0,2));$('#greeting').textContent=(hour<12?'早上好':hour<18?'下午好':'晚上好')+'，可爱的朋友';}updateClock();setInterval(updateClock,1000);

function updateHotspots(){
 const primary=new Set(['desk-notes','book-0','speaker','portfolio','cat','tap-kitchen','door-entry','television','smart-controls','garden-planter','terrace-garden','terrace-living']);
 const occupied=[],blocked=['.welcome','.cat-card','.topbar','.room-nav','.interaction-help'].map(selector=>document.querySelector(selector)?.getBoundingClientRect()).filter(r=>r&&r.width>0&&r.height>0);
 const overlaps=(a,b,gap=7)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
 const offsets=[[0,0]];for(let r=1;r<=5;r++)for(const [x,y] of [[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]])offsets.push([x*r*47,y*r*31]);
 for(const entry of hotspotEntries){const {record,button,line}=entry;if(button.textContent!==record.label){button.textContent=record.label;button.setAttribute('aria-label',record.label);entry.width=0;}
  const p=(record.anchor||record.initialAnchor).clone();if(record.kind==='cat'&&cat)p.copy(cat.root.position).add(new THREE.Vector3(0,.77,0));const v=p.clone().project(camera);
  let show=showHotspots&&loadDone&&!walk&&v.z<1&&v.z>-1&&Math.abs(v.x)<.95&&Math.abs(v.y)<.91;
  if(currentRoom==='overview')show=show&&primary.has(record.id);else show=show&&p.distanceTo(controls.target)<(currentRoom==='study'?2.4:6);
  line.style.display='none';if(!show){button.hidden=true;continue;}button.hidden=false;
  if(!entry.width){const r=button.getBoundingClientRect();entry.width=r.width;entry.height=r.height;}
  const sx=(v.x*.5+.5)*innerWidth,sy=(-v.y*.5+.5)*innerHeight;let placed=null;
  for(const [dx,dy] of offsets){const x=sx+dx,y=sy+dy,b={left:x-entry.width/2,right:x+entry.width/2,top:y-entry.height,bottom:y};
   if(b.left<10||b.right>innerWidth-10||b.top<78||b.bottom>innerHeight-60||blocked.some(r=>overlaps(b,r,6))||occupied.some(r=>overlaps(b,r)))continue;
   placed={x,y,b,dx,dy};break;
  }
  if(!placed){button.hidden=true;continue;}occupied.push(placed.b);button.style.left=placed.x+'px';button.style.top=placed.y+'px';
  if(Math.abs(placed.dx)+Math.abs(placed.dy)>8){line.setAttribute('x1',sx);line.setAttribute('y1',sy);line.setAttribute('x2',placed.x);line.setAttribute('y2',placed.y-entry.height/2);line.style.display='';}
 }
}

try{
 const loaded=await new GLTFLoader().loadAsync('./apartment.glb',e=>{if(e.total)$('#load-detail').textContent='恢复的模型 '+Math.round(e.loaded/e.total*100)+'%';});model=loaded.scene;scene.add(model);model.updateMatrixWorld(true);
 model.traverse(o=>{if(!o.isMesh)return;o.castShadow=!o.material?.transparent;o.receiveShadow=true;if(o.material?.transparent){o.material.depthWrite=false;o.renderOrder=2;}const c=o.userData.category;if(['wall','upperWall'].includes(c)){const b=new THREE.Box3().setFromObject(o);if(b.max.y>.2)wallBoxes.push(b);}});
 applyVisibility();house=setupHouseInteractions({THREE,scene,model,register,toast,getState:state,setState});
 let navigation=null;try{const r=await fetch('./cat-navigation.json');if(r.ok)navigation=await r.json();}catch{}
 smart=setupSmartHome({THREE,scene,model,register,getState:state,setState,toast,openControls:()=>worldUI.openControls(),openGarden:()=>{go('garden');worldUI.openGarden();},navigation:navigation||{}});cabinetry=setupCabinetryV7({THREE,scene,model,register,getState:state,setState,toast,house});diagnostics.cabinetry=cabinetry.audit;terrace=setupTerrace({THREE,model,register,getState:state,setState,toast,openGarden:id=>worldUI.openTerrace(id),onDoorOpen:()=>smart.setCurtains(true)});house.colliderRoots=[...smart.colliderRoots,...cabinetry.colliderRoots,...terrace.colliderRoots];diagnostics.terrace=terrace.audit;applyVisibility();
 walkCollision=createWalkCollision({THREE,model,house});diagnostics.walk=walkCollision.audit;
 studio=setupStudio({THREE,scene,model,register,openNotes:()=>personal.openNotes(),openLibrary:id=>personal.openLibrary(id),openMusic:()=>personal.openMusic(),openPortfolio,getState:state,setState,toast,turnLightsOn:()=>smart.setLights(true)});
 tv=setupTelevision({THREE,scene,model,camera,register,go,toast});diagnostics.optimization=optimizeScene({THREE,model});
 cat=createCat({THREE,scene,initialPosition:navigation?.initialPosition||[-6,.03,-.8],navigation,getPlayerPosition:()=>walk?camera.position:controls.target,getRobotPosition:()=>smart?.vacuum?.position,getPointerPosition:()=>!gesture&&performance.now()-pointerUpdated<4000?pointerFloor:null,onMess:p=>smart.addMess(p),onWelcome:()=>toast('小橘来迎接你啦，靠近后摸摸她的头。'),reducedMotion:()=>state().settings.reducedMotion,getMuted:()=>state().cat.muted,store:{getCatState:()=>state().cat,setCatState:c=>setState({cat:c})}});
 register({id:'cat',label:'小橘 · 摸摸头',kind:'cat',object:cat.root,anchor:cat.root.position.clone().add(new THREE.Vector3(0,.7,0)),click:petCat});
 register({id:'cat-food',label:'给小橘添猫粮',kind:'cat-bowl',object:cat.bowls.food,anchor:new THREE.Box3().setFromObject(cat.bowls.food).getCenter(new THREE.Vector3()).add(new THREE.Vector3(0,.2,0)),hotspot:false,click:feedCat});
 register({id:'cat-water',label:'给小橘添清水',kind:'cat-bowl',object:cat.bowls.water,anchor:new THREE.Box3().setFromObject(cat.bowls.water).getCenter(new THREE.Vector3()).add(new THREE.Vector3(0,.2,0)),hotspot:false,click:()=>cat.water()});smart.setObstacles([cat.root,cat.bowls.food,cat.bowls.water]);
 cat.setFollowing(state().cat.following!==false);diagnostics.loaded=true;loadDone=true;$('#loading').hidden=true;go('overview',true);refreshCare();
 window.homeApp={scene,model,camera,controls,groundNavigation,records,cat,house,smart,terrace,cabinetry,tv,visitor,state:stateStore,go,diagnostics,openNotes:()=>personal.openNotes(),openLibrary:()=>personal.openLibrary(),openMusic:()=>personal.openMusic(),openPortfolio};document.body.dataset.ready='true';
}catch(e){console.error(e);diagnostics.errors.push(String(e));$('#load-detail').textContent='载入未完成：'+e.message;$('#loading h2').textContent='请使用「打开3D家」启动';}
let last=performance.now(),elapsed=0,lastCatAction='';
function tick(now){requestAnimationFrame(tick);const dt=Math.min(.045,(now-last)/1000);last=now;if(document.hidden)return;elapsed+=dt;if(moveTween){const u=Math.min(1,(now-moveTween.start)/850),t=u*u*(3-2*u);camera.position.lerpVectors(moveTween.from,moveTween.to,t);controls.target.lerpVectors(moveTween.lookFrom,moveTween.lookTo,t);if(u===1)moveTween=null;}if(!walk)controls.update();if(watchingCat&&!moveTween&&cat){const target=cat.root.position.clone().add(new THREE.Vector3(0,.25,0));camera.position.add(target.clone().sub(controls.target));controls.target.copy(target);camera.lookAt(target);}groundNavigation.update(dt);house?.update(dt);terrace?.update(dt,elapsed);cabinetry?.update(dt);cat?.update(dt,elapsed);smart?.update(dt,elapsed);tv?.update();studio?.update(dt,elapsed);const action=cat?.root.userData.catState?.action;if(action&&action!==lastCatAction){lastCatAction=action;$('#cat-status').textContent=({drink:'咕嘟咕嘟，喝一点清水。',beg:'踮起脚来：可以摸摸我的头吗？',align:'走到自己的小碗前，准备开饭。',greet:'听见你来了，她跑来打招呼。',trot:'在小屋里轻快地跑几步。',eat:'低头认真吃饭，尾巴轻轻摆着。',pet:'呼噜呼噜，在你身边放松下来。',walk:'在客厅里陪你走走。',idle:'找个舒服的地方，安静陪着你。'})[action]||'在家里伸个懒腰。';}updateHotspots();renderer.render(scene,camera);}
requestAnimationFrame(tick);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(currentRoom==='overview'&&!walk)go('overview',true);});
