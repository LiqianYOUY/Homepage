/** Ground arrows and accessible hold controls for a Y-up apartment.
 * The host owns walk/orbit mode and supplies its existing collision(position).
 * No teleport, scene picking registration, storage, network or external assets.
 */
const DIRECTIONS=Object.freeze({forward:{f:1,r:0,label:'向前走',symbol:'↑',x:0,z:-1,rotation:0},backward:{f:-1,r:0,label:'向后退',symbol:'↓',x:0,z:1,rotation:Math.PI},left:{f:0,r:-1,label:'向左走',symbol:'←',x:-1,z:0,rotation:Math.PI/2},right:{f:0,r:1,label:'向右走',symbol:'→',x:1,z:0,rotation:-Math.PI/2}});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/** Pure movement controller: also usable in a Node collision regression test. */
export function createGroundMovement({getPosition,getYaw,collision,speed=1.05,fastSpeed=1.8,clickDistance=.30,onMove=()=>{}}){
  if(typeof getPosition!=='function'||typeof getYaw!=='function'||typeof collision!=='function')throw Error('Ground navigation needs position, yaw and collision callbacks.');
  let held={forward:0,right:0,fast:false},tap=null,totalMoved=0,lastMoved=0;
  function direction(f,r){const yaw=Number(getYaw())||0,n=Math.hypot(f,r)||1;return {x:(-Math.sin(yaw)*f+Math.cos(yaw)*r)/n,z:(-Math.cos(yaw)*f-Math.sin(yaw)*r)/n};}
  function sweep(start,dx,dz){const p={x:start.x,y:start.y,z:start.z},n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.025)),sx=dx/n,sz=dz/n;
    for(let i=0;i<n;i++){
      const both={x:p.x+sx,y:p.y,z:p.z+sz};
      if(!collision(both)){p.x=both.x;p.z=both.z;continue;}
      // Slide as the original walk controller did, but sample the whole step.
      const x={x:p.x+sx,y:p.y,z:p.z};if(Math.abs(sx)>1e-9&&!collision(x))p.x=x.x;
      const z={x:p.x,y:p.y,z:p.z+sz};if(Math.abs(sz)>1e-9&&!collision(z))p.z=z.z;
    }return p;
  }
  function update(dt){lastMoved=0;dt=clamp(Number(dt)||0,0,.05);const f=held.forward||0,r=held.right||0;let d,length;
    if(f||r){d=direction(f,r);length=(held.fast?fastSpeed:speed)*dt;}
    else if(tap){d=direction(tap.f,tap.r);length=Math.min(tap.remaining,speed*dt);tap.remaining-=length;if(tap.remaining<1e-6)tap=null;}
    else return 0;
    const position=getPosition(),end=sweep(position,d.x*length,d.z*length);lastMoved=Math.hypot(end.x-position.x,end.z-position.z);position.x=end.x;position.z=end.z;totalMoved+=lastMoved;if(lastMoved>0)onMove(lastMoved);return lastMoved;
  }
  function setHeld(value={}){held={forward:clamp(Number(value.forward)||0,-1,1),right:clamp(Number(value.right)||0,-1,1),fast:!!value.fast};if(held.forward||held.right)tap=null;}
  function queueTap(name,distance=clickDistance){const d=DIRECTIONS[name];if(!d)return false;tap={f:d.f,r:d.r,remaining:clamp(Number(distance)||0,0,clickDistance)};return true;}
  function canMove(name){const d=DIRECTIONS[name];if(!d)return false;const p=getPosition(),v=direction(d.f,d.r),q=sweep(p,v.x*.13,v.z*.13);return Math.hypot(p.x-q.x,p.z-q.z)>.012;}
  function cancel(){held={forward:0,right:0,fast:false};tap=null;lastMoved=0;}
  return {update,setHeld,queueTap,canMove,cancel,getStatus:()=>({held:{...held},queuedDistance:tap?.remaining||0,totalMoved,lastMoved})};
}

export function createGroundNavigation({THREE,scene,camera,controls,domElement,collision,getYaw,
  isEnabled=()=>false,isBlocked=()=>false,onInputStart=()=>{},onMove=()=>{},getGroundHeight=()=>0,
  keyboard=true,speed=1.05,fastSpeed=1.8,clickDistance=.30,
  documentRef=globalThis.document,windowRef=globalThis.window}={}) {
  const doc=documentRef,win=windowRef;if(!THREE||!scene||!camera||!domElement||!doc||!win)throw Error('Ground navigation requires Three.js, the camera, canvas and DOM.');
  const worldDirection=new THREE.Vector3();getYaw ||=()=>{camera.getWorldDirection(worldDirection);return Math.atan2(-worldDirection.x,-worldDirection.z);};
  let explicitEnabled=null,disposed=false,pointer=null,clock=0,layoutDue=0,lastLayoutPosition=new THREE.Vector3(Infinity,0,0),lastYaw=Infinity;
  const keys=new Set(),listeners=[],available={},markers=new Map(),buttons=new Map();
  const root=new THREE.Group();root.name='Walkable ground direction arrows';root.userData.noMerge=true;root.visible=false;scene.add(root);
  const shape=new THREE.Shape();shape.moveTo(0,.14);shape.lineTo(-.115,.018);shape.quadraticCurveTo(-.12,.008,-.103,.008);shape.lineTo(-.047,.008);shape.lineTo(-.047,-.105);shape.quadraticCurveTo(0,-.125,.047,-.105);shape.lineTo(.047,.008);shape.lineTo(.103,.008);shape.quadraticCurveTo(.12,.008,.115,.018);shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape,8);geometry.rotateX(-Math.PI/2);geometry.computeBoundingBox();
  const materials=[];
  for(const [name,d] of Object.entries(DIRECTIONS)){const mat=new THREE.MeshBasicMaterial({color:0x78936d,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});materials.push(mat);const m=new THREE.Mesh(geometry,mat);m.name='Ground arrow '+name;m.userData.groundNavigation=true;m.userData.noMerge=true;m.rotation.y=d.rotation;m.renderOrder=4;root.add(m);markers.set(name,m);}
  const overlay=doc.createElement('div');overlay.className='ground-navigation';overlay.dataset.groundNavigation='';overlay.hidden=true;overlay.setAttribute('role','group');overlay.setAttribute('aria-label','地面方向控制，点击走一步，长按连续行走');
  const status=doc.createElement('span');status.className='ground-navigation-status';status.setAttribute('aria-live','polite');status.textContent='点击走一步 · 长按连续走';overlay.append(status);
  const style=doc.createElement('style');style.textContent=`
.ground-navigation{position:fixed;inset:0;z-index:24;pointer-events:none;touch-action:none;user-select:none;-webkit-user-select:none}.ground-navigation[hidden]{display:none!important}.ground-direction{position:absolute;width:48px;height:48px;min-width:48px;min-height:48px;padding:0;border:2px solid transparent;border-radius:50%;clip-path:ellipse(50% 50%);transform:translate(-50%,-50%);background:transparent;color:#52684a;pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font:600 23px/1 system-ui;box-sizing:border-box}.ground-direction>span{opacity:0}.ground-direction:focus-visible{outline:none;box-shadow:inset 0 0 0 3px #415d34;background:#fff9e7b8}.ground-direction[data-pressed=true]{background:#ecf5d7b8;border-color:#7e976d}.ground-direction[aria-disabled=true]{cursor:not-allowed}.ground-navigation[data-layout=dock] .ground-direction{background:#fffcefec;border-color:#d4dfc5;box-shadow:0 3px 12px #2e432c25}.ground-navigation[data-layout=dock] .ground-direction>span{opacity:1}.ground-navigation[data-layout=dock] .ground-direction[aria-disabled=true]{opacity:.45}.ground-navigation-status{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);font:11px/1.4 system-ui;color:#637457;background:#fffbedcf;padding:5px 10px;border-radius:15px;white-space:nowrap}.ground-navigation[data-layout=projected] .ground-navigation-status{background:#fffbedb5}.ground-direction[aria-disabled=true]:focus-visible{outline-color:#9a907c}
.ground-navigation[data-layout=projected] .ground-direction:hover,.ground-navigation[data-layout=projected] .ground-direction:active,.ground-navigation[data-layout=projected] .ground-direction[data-pressed=true]{background:transparent;border-color:transparent;box-shadow:none}
.ground-navigation[data-layout=projected] .ground-direction:focus-visible{background:transparent;border-color:#7e976d}
@media(max-height:500px){.ground-navigation-status{bottom:91px;font-size:10px}.ground-direction{width:44px;height:44px;min-width:44px;min-height:44px}}
`;
  doc.head.append(style);doc.body.append(overlay);
  const movement=createGroundMovement({getPosition:()=>camera.position,getYaw,collision,speed,fastSpeed,clickDistance,onMove:d=>{if(pointer)pointer.distance+=d;onMove(d);}});
  function on(target,type,handler,options){target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));}
  const editing=target=>!!target&&(target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||!!target.closest?.('[contenteditable="true"]'));
  function blocked(){return doc.hidden||editing(doc.activeElement)||!!isBlocked();}
  function enabled(){return !disposed&&(explicitEnabled===null?!!isEnabled():explicitEnabled);}
  function cancelInput(){keys.clear();movement.cancel();if(pointer){const old=pointer;pointer=null;buttons.get(old.name)?.setAttribute('data-pressed','false');try{old.button.releasePointerCapture(old.id);}catch{}}}
  function prepareInput(){if(!enabled()||blocked())return false;onInputStart();if(controls)controls.enabled=false;return true;}
  function press(name,event){if(event.button!==0||pointer||!prepareInput())return;event.preventDefault();event.stopImmediatePropagation();if(!movement.canMove(name)){status.textContent='这个方向有物品，换个方向走吧';return;}const button=buttons.get(name);pointer={id:event.pointerId,name,button,started:clock,distance:0};button.setAttribute('data-pressed','true');try{button.setPointerCapture(event.pointerId);}catch{}keys.clear();const d=DIRECTIONS[name];movement.setHeld({forward:d.f,right:d.r});}
  function release(event,cancelled=false){if(!pointer||event.pointerId!==pointer.id)return;event.preventDefault();event.stopImmediatePropagation();const old=pointer;pointer=null;old.button.setAttribute('data-pressed','false');movement.setHeld({});try{old.button.releasePointerCapture(old.id);}catch{}if(!cancelled&&enabled()&&!blocked()&&clock-old.started<.22)movement.queueTap(old.name,Math.max(0,clickDistance-old.distance));else movement.cancel();}
  for(const [name,d] of Object.entries(DIRECTIONS)){const b=doc.createElement('button');b.type='button';b.className='ground-direction';b.dataset.direction=name;b.setAttribute('aria-label',d.label+'：点击一步，长按连续移动');b.title=d.label;const icon=doc.createElement('span');icon.textContent=d.symbol;icon.setAttribute('aria-hidden','true');b.append(icon);buttons.set(name,b);overlay.append(b);
    on(b,'pointerdown',e=>press(name,e));on(b,'pointerup',e=>release(e));on(b,'pointercancel',e=>release(e,true));on(b,'lostpointercapture',e=>{if(pointer?.id===e.pointerId)cancelInput();});
    on(b,'click',e=>{e.preventDefault();e.stopImmediatePropagation();if(e.detail===0&&prepareInput()&&movement.canMove(name)){movement.cancel();movement.queueTap(name);}});on(b,'contextmenu',e=>e.preventDefault());
  }
  const moveKeys=new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift']);
  on(win,'keydown',e=>{const k=e.key?.toLowerCase();if(!keyboard||!moveKeys.has(k)||e.defaultPrevented||!enabled()||blocked()||editing(e.target)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(pointer)return;if(!keys.size)prepareInput();keys.add(k);});
  on(win,'keyup',e=>{const k=e.key?.toLowerCase();if(moveKeys.has(k))keys.delete(k);},true);
  on(doc,'focusin',e=>{if(editing(e.target)||isBlocked())cancelInput();},true);on(win,'blur',cancelInput);on(doc,'visibilitychange',()=>{if(doc.hidden)cancelInput();});
  const ray=new THREE.Raycaster(),world=new THREE.Vector3(),projected=new THREE.Vector3(),cameraWorld=new THREE.Vector3();
  function visibleObject(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}
  function occluded(point){camera.getWorldPosition(cameraWorld);const length=cameraWorld.distanceTo(point);ray.set(cameraWorld,world.copy(point).sub(cameraWorld).normalize());ray.far=Math.max(.01,length-.06);for(const hit of ray.intersectObjects(scene.children,true)){if(hit.object.userData.groundNavigation||!visibleObject(hit.object))continue;const m=hit.object.material;if((Array.isArray(m)?m.every(v=>v.transparent):m?.transparent)||hit.object.userData.category==='rug')continue;return true;}return false;}
  function clearGround(point){const height=Number(getGroundHeight(point));return Number.isFinite(height)&&!collision({x:point.x,y:camera.position.y,z:point.z});}
  function layout(){const yaw=Number(getYaw())||0,forward={x:-Math.sin(yaw),z:-Math.cos(yaw)},right={x:Math.cos(yaw),z:-Math.sin(yaw)},foot=camera.position,spacing=.27;let best=null;
    // Prefer one clear floor patch in front; never place an arrow on a cabinet.
    for(const distance of [2.8,2.3,1.85,1.35,.85,.4,0]){for(const lateral of [0,-.25,.25]){const center={x:foot.x+forward.x*distance+right.x*lateral,z:foot.z+forward.z*distance+right.z*lateral},locations={};let score=0;
      const steps=Math.max(1,Math.ceil(Math.hypot(center.x-foot.x,center.z-foot.z)/.10));let connected=true;for(let i=1;i<=steps;i++){if(collision({x:foot.x+(center.x-foot.x)*i/steps,y:foot.y,z:foot.z+(center.z-foot.z)*i/steps})){connected=false;break;}}if(!connected)continue;
      for(const [name,d] of Object.entries(DIRECTIONS)){const p={x:center.x+right.x*d.x*spacing-forward.x*d.z*spacing,z:center.z+right.z*d.x*spacing-forward.z*d.z*spacing};const ok=clearGround(p);locations[name]={...p,ok};if(ok)score++;}
      if(!best||score>best.score)best={center,locations,score};if(score===4)break;}
      if(best?.score===4)break;
    }
    if(!best)best={locations:Object.fromEntries(Object.keys(DIRECTIONS).map(name=>[name,{x:foot.x,z:foot.z,ok:false}]))};
    root.position.set(0,0,0);root.rotation.y=0;const r=domElement.getBoundingClientRect(),positions=[];let allProjected=true;
    for(const [name,d] of Object.entries(DIRECTIONS)){const marker=markers.get(name),p=best.locations[name],button=buttons.get(name);available[name]=movement.canMove(name);button.setAttribute('aria-disabled',String(!available[name]));marker.visible=p.ok;marker.rotation.y=yaw+d.rotation;marker.position.set(p.x,(Number(getGroundHeight(p))||0)+.045,p.z);marker.material.color.set(available[name]?0x78936d:0xb5b4a2);marker.material.opacity=available[name]?.88:.48;marker.updateWorldMatrix(true,false);
      projected.copy(marker.position).project(camera);const x=r.left+(projected.x*.5+.5)*r.width,y=r.top+(-projected.y*.5+.5)*r.height;const bounds=geometry.boundingBox,corner=new THREE.Vector3();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const lx of [bounds.min.x,bounds.max.x])for(const lz of [bounds.min.z,bounds.max.z]){corner.set(lx,0,lz).applyMatrix4(marker.matrixWorld).project(camera);const px=r.left+(corner.x*.5+.5)*r.width,py=r.top+(-corner.y*.5+.5)*r.height;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}const w=Math.max(48,maxX-minX+14),h=Math.max(48,maxY-minY+14);positions.push({name,x,y,w,h});if(w>150||h>110||!p.ok||projected.z< -1||projected.z>1||x<r.left+30||x>r.right-30||y<r.top+80||y>r.bottom-126||occluded(marker.position))allProjected=false;
    }
    for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)if(((positions[i].x-positions[j].x)/((positions[i].w+positions[j].w)/2+2))**2+((positions[i].y-positions[j].y)/((positions[i].h+positions[j].h)/2+2))**2<1.12)allProjected=false;
    root.userData.projectedTargets=positions.map(p=>({...p}));overlay.dataset.layout=allProjected?'projected':'dock';
    const size=win.innerHeight<500?48:54,cx=r.left+r.width/2,cy=r.bottom-(win.innerHeight<500?175:210);
    for(const p of positions){const d=DIRECTIONS[p.name],b=buttons.get(p.name);b.style.left=(allProjected?p.x:cx+d.x*size)+'px';b.style.top=(allProjected?p.y:cy+d.z*size)+'px';b.style.width=(allProjected?p.w:48)+'px';b.style.height=(allProjected?p.h:48)+'px';}
    lastLayoutPosition.copy(camera.position);lastYaw=yaw;layoutDue=clock+.15;
  }
  function update(dt){if(disposed)return;clock+=clamp(Number(dt)||0,0,.05);const active=enabled();root.visible=active&&!blocked();overlay.hidden=!root.visible;if(!active||blocked()){cancelInput();return;}if(controls)controls.enabled=false;
    if(!pointer){const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),right=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));movement.setHeld({forward,right,fast:keys.has('shift')});}
    movement.update(dt);camera.updateWorldMatrix(true,false);const yaw=Number(getYaw())||0;if(clock>=layoutDue||camera.position.distanceToSquared(lastLayoutPosition)>.008||Math.abs(yaw-lastYaw)>.035)layout();
  }
  function setEnabled(value){explicitEnabled=!!value;if(!value){cancelInput();root.visible=false;overlay.hidden=true;}else layoutDue=0;}
  function dispose(){if(disposed)return;disposed=true;cancelInput();listeners.forEach(remove=>remove());root.removeFromParent();overlay.remove();style.remove();geometry.dispose();materials.forEach(m=>m.dispose());}
  return {root,overlay,buttons,update,setEnabled,cancelInput,isInteracting:()=>!!pointer,blocksSceneInput:()=>enabled()&&(!!pointer||blocked()),ownsEvent:e=>!!e?.target?.closest?.('[data-ground-navigation]'),getStatus:()=>({enabled:enabled(),blocked:blocked(),layout:overlay.dataset.layout||null,heldPointer:pointer?.name||null,available:{...available},...movement.getStatus()}),dispose};
}
