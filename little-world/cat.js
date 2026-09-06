import {createCatAudio} from './cat-audio.js';
import {buildCatVisuals} from './cat-visuals.js';

/** A small, entirely mesh-built companion. Coordinates use glTF/Three.js Y-up.
 * Optional navigation = {points: [[x,z], ...], edges: [[a,b], ...]}.
 * Edges must be confirmed clear on the apartment floor. No straight-line pursuit
 * is used outside this graph. Feed-calendar persistence belongs to the host UI.
 * getPointerPosition returns a recent ground-plane Vector3/null. onMess receives
 * a ground Vector3; onWelcome receives {cat,name,position}. reducedMotion and
 * getMuted are live boolean getters. update always needs real elapsed dt.
 * getRobotPosition optionally returns the vacuum floor position; the cat waits
 * on its current validated edge while the robot yields along its own route.
 * bowls.food/water are permanent clickable Groups; route food clicks through the
 * host feed calendar, then call feed(). setFollowing(false) allows free roaming.
 * getStatus reports action, locomotion, levels, route goal and sound state.
 */
export function createCat({THREE, scene, onInteract, getPlayerPosition, getPointerPosition, getRobotPosition, store,
  onMess, onWelcome, reducedMotion = () => false, getMuted = () => false,
  navigation = null, initialPosition = [-6, .03, -1.2]}) {
  const root = new THREE.Group();
  root.name = 'Mochi · white and ginger companion';
  root.position.set(...initialPosition);
  root.userData.interactable = 'cat';
  root.userData.label = '摸摸小猫';
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const material = (color, roughness = .85) => {
    const m = new THREE.MeshStandardMaterial({color, roughness});
    materials.add(m); return m;
  };
  const bowlMat=material('#799586',.35),foodMat=material('#87633f');
  const sphere = new THREE.SphereGeometry(1,20,14);geometries.add(sphere);
  function mesh(name,mat,parent,pos,scale,geometry=sphere) {
    const obj=new THREE.Mesh(geometry,mat);obj.name=name;obj.position.set(...pos);obj.scale.set(...scale);
    obj.castShadow=true;obj.receiveShadow=true;obj.userData.interactable='cat';parent.add(obj);return obj;
  }
  const {torso,legs,head,ears,eyeGroups,tailBase,animateTail,setMouth}=buildCatVisuals({THREE,root,geometries,materials,textures});
  const readState=()=> {
    try {
      if(store?.getCatState)return store.getCatState()||{};
      if(store?.get){const value=store.get('cat');return value?.cat||value||{};}
      return store?.cat||{};
    } catch{return {};}
  };
  function persist(patch) {
    try {
      const next={...readState(),...patch};
      if(store?.setCatState)store.setCatState(next);
      else if(store?.set)store.set('cat',next);
      else if(store)store.cat=next;
    } catch { /* Visual behaviour remains available without persistent storage. */ }
  }
  const flag = value => {try{return typeof value==='function'?!!value():!!value;}catch{return false;}};
  let voiceElapsed=Infinity,lastVisualVoice=-Infinity;
  const sound=createCatAudio({getMuted:()=>flag(getMuted),onVoice:()=>{voiceElapsed=0;lastVisualVoice=clock;}});
  const saved=readState(), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let foodLevel=clamp(Number.isFinite(saved.foodLevel)?saved.foodLevel:.28,0,1);
  let waterLevel=clamp(Number.isFinite(saved.waterLevel)?saved.waterLevel:.82,0,1);
  const bowls={},kibble=[];
  function makeBowl(kind,mat) {
    const b=new THREE.Group();b.name='Permanent cat '+kind+' bowl';scene.add(b);
    b.userData.interactable='cat-'+kind;b.userData.label=kind==='food'?'给小猫添粮':'给小猫换水';
    const rimGeo=new THREE.TorusGeometry(.092,.012,8,32);geometries.add(rimGeo);
    const rim=mesh(kind+' ceramic rim',mat,b,[0,.038,0],[1,1,1],rimGeo);rim.rotation.x=Math.PI/2;
    const baseGeo=new THREE.CylinderGeometry(.086,.077,.025,32);geometries.add(baseGeo);
    mesh(kind+' ceramic dish',mat,b,[0,.019,0],[1,1,1],baseGeo);
    b.traverse(o=>{if(o.isMesh)o.userData.interactable='cat-'+kind;});return b;
  }
  bowls.food=makeBowl('food',bowlMat);
  bowls.water=makeBowl('water',material('#91acb3',.28));
  for(let i=0;i<22;i++) {
    const a=i*2.399963,r=.008+Math.sqrt(i/22)*.057;
    const bit=mesh('cat kibble '+i,foodMat,bowls.food,[Math.cos(a)*r,.041,Math.sin(a)*r],[.010,.006,.009]);
    bit.userData.interactable='cat-food';kibble.push(bit);
  }
  const waterMat=new THREE.MeshStandardMaterial({color:'#7fabbb',roughness:.14,metalness:.08,transparent:true,opacity:.82});materials.add(waterMat);
  const waterGeo=new THREE.CircleGeometry(.078,32);geometries.add(waterGeo);
  const waterSurface=mesh('fresh water surface',waterMat,bowls.water,[0,.040,0],[1,1,1],waterGeo);
  waterSurface.rotation.x=-Math.PI/2;waterSurface.userData.interactable='cat-water';
  const rippleMat=new THREE.MeshStandardMaterial({color:'#d9edf0',transparent:true,opacity:0,roughness:.3});materials.add(rippleMat);
  const rippleGeo=new THREE.TorusGeometry(.033,.0017,5,28);geometries.add(rippleGeo);
  const ripple=mesh('soft drinking ripple',rippleMat,bowls.water,[0,.043,0],[1,1,1],rippleGeo);ripple.rotation.x=Math.PI/2;
  const safeBox={minX:-8.5,maxX:-2.5,minZ:-4.1,maxZ:.5};
  let following=saved.following!==false,graph=null,currentNode=0,dockNode=0,route=[],goal=null,timed=null,pausedTimed=null;
  let disposed=false,clock=0,poseClock=0,travelPhase=0,idleWait=5+Math.random()*5,pointerWait=0;
  let nextBlink=2.8,blinkStart=-10,nextMess=120+Math.random()*120,lastWelcome=-Infinity,lastBeg=-Infinity;
  let lastApproach=null,lastApproachAt=-Infinity,walkSpeed=.48,usedSavedPosition=false;
  let eatWeight=0,petWeight=0,begWeight=0,currentAction='idle',locomotion='rest',waitingForRobot=false,robotWait=0;
  const notify=type=>onInteract?.({type:'cat-action',action:type,cat:root});
  const position2=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)?{x:p.x,z:p.z}:null;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function closestNode(p) {
    let best=0,d=Infinity;graph.points.forEach((v,i)=>{const q=distance(v,p);if(q<d){d=q;best=i;}});return best;
  }
  function shortestPath(start,end) {
    const n=graph.points.length,dist=Array(n).fill(Infinity),prev=Array(n).fill(-1),used=new Set();dist[start]=0;
    for(let k=0;k<n;k++) {
      let u=-1;for(let i=0;i<n;i++)if(!used.has(i)&&(u<0||dist[i]<dist[u]))u=i;
      if(u<0||!Number.isFinite(dist[u])||u===end)break;used.add(u);
      for(const [v,w] of graph.adjacent[u])if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u;}
    }
    if(!Number.isFinite(dist[end]))return null;
    const result=[];for(let u=end;u!==start;u=prev[u]){if(u<0)return null;result.unshift(u);}return result;
  }
  function segmentDistance(p,a,b) {
    const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
    const t=l?clamp(((p.x-a.x)*dx+(p.z-a.z)*dz)/l,0,1):0;
    return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
  }
  function robotBlocksStep(from,to) {
    const robot=position2(getRobotPosition?.());
    if(!robot)return false;
    // The combined foot/robot circle is 0.507m; 0.62m also covers a turn and
    // the next frame. Check the complete step, and always allow moving away.
    return segmentDistance(robot,from,to)<.62 && distance(to,robot)<=distance(from,robot)+1e-7;
  }
  function placeBowls() {
    const dock=graph?graph.points[dockNode]:{x:initialPosition[0],z:initialPosition[2]};
    let best=null;
    // Put the bowls outside through-routes, but within the audited 0.5m disk at
    // the fixed docking vertex. The two ceramic bowls never follow the cat.
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4,forward={x:Math.sin(a),z:Math.cos(a)},side={x:forward.z,z:-forward.x};
      const centers=[-1,1].map(sign=>({x:dock.x+forward.x*.36+side.x*.125*sign,z:dock.z+forward.z*.36+side.z*.125*sign}));
      const score=graph?.edges.length?Math.min(...centers.flatMap(p=>graph.edges.map(([a,b])=>segmentDistance(p,graph.points[a],graph.points[b])))):.36;
      if(!best||score>best.score+1e-6)best={score,centers};
    }
    bowls.food.position.set(best.centers[0].x,initialPosition[1],best.centers[0].z);
    bowls.water.position.set(best.centers[1].x,initialPosition[1],best.centers[1].z);
    bowls.food.userData.dock=[dock.x,initialPosition[1],dock.z];bowls.water.userData.dock=bowls.food.userData.dock.slice();
  }
  function setNavigation(value) {
    if(!value?.points?.length){graph=null;route=[];goal=null;placeBowls();return;}
    const points=value.points.map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:{x:p.x,z:p.z});
    if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x<safeBox.minX||p.x>safeBox.maxX||p.z<safeBox.minZ||p.z>safeBox.maxZ))throw new Error('Cat navigation points must stay in the audited living area.');
    const adjacent=points.map(()=>[]),edges=[];
    for(const [a,b] of value.edges||[]) {
      if(!points[a]||!points[b]||a===b)continue;const d=distance(points[a],points[b]);
      if(d>0){adjacent[a].push([b,d]);adjacent[b].push([a,d]);edges.push([a,b]);}
    }
    graph={points,adjacent,edges};dockNode=closestNode({x:initialPosition[0],z:initialPosition[2]});
    const previous=!usedSavedPosition&&position2(saved.position)?saved.position:root.position;
    currentNode=closestNode(previous);usedSavedPosition=true;
    root.position.x=points[currentNode].x;root.position.z=points[currentNode].z;route=[];goal=null;timed=null;placeBowls();
  }
  function requestGoal(node,kind,target=null,trot=false) {
    if(!graph)return false;
    // A new mouse/food request never cuts diagonally out of a half-travelled edge.
    const first=route.length?route[0]:currentNode;
    const rest=shortestPath(first,node);if(rest===null)return false;
    const midEdge=route.length&&distance(root.position,graph.points[currentNode])>.001;
    route=midEdge?[first,...rest]:shortestPath(currentNode,node);
    goal={node,kind,target};walkSpeed=trot&&!flag(reducedMotion)?.90:.48;
    return true;
  }
  function cancelSocialGoal() {
    if(!goal||!['pointer','welcome'].includes(goal.kind))return;
    if(route.length&&distance(root.position,graph.points[currentNode])>.001){goal={node:route[0],kind:'settle'};route=route.slice(0,1);}
    else {goal=null;route=[];}
  }
  function setFollowing(value){following=!!value;persist({following});if(!following)cancelSocialGoal();pointerWait=0;notify(following?'follow':'free-roam');}
  function vocalize() {
    const played=sound.meow();
    // Muting sound keeps the same expressive response, without creating audio.
    if(!played&&clock-lastVisualVoice>=12){voiceElapsed=0;lastVisualVoice=clock;}
  }
  function beginTimed(type,seconds) {timed={type,total:seconds,left:seconds};if(type==='beg'){lastBeg=clock;vocalize();}}
  function actionTarget() {return goal?.kind==='food'?bowls.food.position:goal?.kind==='water'?bowls.water.position:goal?.target;}
  function rotateToward(p,dt) {
    if(!p||distance(p,root.position)<1e-7)return true;const a=Math.atan2(p.x-root.position.x,p.z-root.position.z);
    const d=Math.atan2(Math.sin(a-root.rotation.y),Math.cos(a-root.rotation.y));root.rotation.y+=d*(1-Math.exp(-dt*9));return Math.abs(d)<.015;
  }
  function feed() {
    if(disposed)return false;sound.unlockFromGesture();foodLevel=1;persist({foodLevel});timed=null;pausedTimed=null;
    if(!requestGoal(dockNode,'food',bowls.food.position)){goal={node:currentNode,kind:'food',target:bowls.food.position};}
    notify('feed');vocalize();return true;
  }
  function water() {
    if(disposed)return false;sound.unlockFromGesture();waterLevel=1;persist({waterLevel});timed=null;pausedTimed=null;
    if(!requestGoal(dockNode,'water',bowls.water.position)){goal={node:currentNode,kind:'water',target:bowls.water.position};}
    notify('water');return true;
  }
  function pet() {
    if(disposed)return;sound.unlockFromGesture();
    if(timed&&['eat','drink'].includes(timed.type))pausedTimed=timed;
    if(goal&&['pointer','welcome'].includes(goal.kind))cancelSocialGoal();
    beginTimed('pet',3.2);idleWait=14+Math.random()*8;notify('pet');vocalize();
  }
  function projectedGoal(p) {
    if(!graph||!position2(p))return null;
    const closest=closestNode(p),nearest=distance(graph.points[closest],p);
    if(nearest>.95)return {node:closest,close:false};
    let best=closest,score=Infinity;
    graph.points.forEach((v,i)=>{if(shortestPath(currentNode,i)===null)return;
      const d=distance(v,p),q=Math.abs(d-.55)+distance(v,root.position)*.025;
      if(q<score){score=q;best=i;}});
    return {node:best,close:true};
  }
  function greet() {
    if(disposed)return;sound.unlockFromGesture();
    if(clock-lastWelcome<45)return;lastWelcome=clock;
    const p=position2(getPointerPosition?.())||position2(getPlayerPosition?.());
    const projected=projectedGoal(p);
    if(!timed&&!['food','water'].includes(goal?.kind)&&projected)requestGoal(projected.node,'welcome',p,true);
    else if(!timed&&!goal)beginTimed('beg',3.6);
    onWelcome?.({cat:root,name:readState().name||'小橘',position:root.position.clone()});vocalize();
  }
  function wander() {
    if(!graph)return;
    const candidates=graph.points.map((p,i)=>({p,i})).filter(({p,i})=>i!==dockNode&&distance(p,root.position)>.65&&shortestPath(currentNode,i)!==null);
    if(!candidates.length){idleWait=10;return;}
    const choice=candidates[Math.floor(Math.random()*candidates.length)];requestGoal(choice.i,'wander',null,Math.random()<.30);
  }
  function finishTimed() {
    const type=timed.type;timed=null;
    if(type==='pet'&&pausedTimed){timed=pausedTimed;pausedTimed=null;return;}
    if(type==='eat'){foodLevel=.28;persist({foodLevel,lastMealAt:new Date().toISOString()});goal=null;}
    else if(type==='drink'){waterLevel=Math.max(.5,waterLevel-.08);persist({waterLevel});goal=null;}
    else if(type==='beg')goal=null;
    idleWait=8+Math.random()*14;
  }
  function getStatus() {
    return {action:currentAction,locomotion,following,goingTo:goal?.kind||null,
      foodLevel,waterLevel,needsAttention:timed?.type==='beg',position:root.position.toArray(),
      safeNode:currentNode,dockNode,waitingForRobot,soundUnlocked:sound.isUnlocked(),muted:sound.isMuted()};
  }
  function update(dt,elapsed) {
    if(disposed)return;dt=clamp(Number(dt)||0,0,.08);clock+=dt;voiceElapsed+=dt;
    const reduced=flag(reducedMotion);if(!reduced)poseClock+=dt;
    const t=poseClock;let moving=false,running=false;locomotion='rest';waitingForRobot=false;sound.update();
    if(timed){timed.left-=dt;if(timed.left<=0)finishTimed();}
    if(!timed&&goal) {
      if(route.length) {
        const dest=graph.points[route[0]],dx=dest.x-root.position.x,dz=dest.z-root.position.z,d=Math.hypot(dx,dz);
        const step=Math.min(d,(reduced?.38:walkSpeed)*dt);
        const candidate={x:root.position.x+(d>.00001?dx/d*step:0),z:root.position.z+(d>.00001?dz/d*step:0)};
        waitingForRobot=d>.00001&&robotBlocksStep(root.position,candidate);
        robotWait=waitingForRobot?robotWait+dt:0;
        if(robotWait>3&&['wander','pointer','welcome'].includes(goal.kind)) {
          // A vacuum can be blocked at a corner while retreating. Yield a short
          // distance along the edge we already walked, never across furniture.
          const robot=position2(getRobotPosition?.());
          let retreat=currentNode;
          if(robot&&distance(root.position,graph.points[currentNode])<.001) {
            const farther=graph.adjacent[currentNode].map(([i])=>i).filter(i=>distance(graph.points[i],robot)>distance(root.position,robot)+.08);
            farther.sort((a,b)=>distance(graph.points[b],robot)-distance(graph.points[a],robot));retreat=farther[0]??currentNode;
          }
          if(robot&&distance(graph.points[retreat],robot)>distance(root.position,robot)+.005) {
            route=[retreat];goal={node:retreat,kind:'robot-yield'};walkSpeed=.38;robotWait=0;
          }
        }
        if(!waitingForRobot) {
          if(d>.00001){root.position.x=candidate.x;root.position.z=candidate.z;rotateToward(dest,dt);moving=step>0;running=walkSpeed>.7&&!reduced;travelPhase+=step*(running?29:24);}
          if(d<=step+.0001){currentNode=route.shift();root.position.x=dest.x;root.position.z=dest.z;
            if(!route.length)persist({position:{x:root.position.x,z:root.position.z}});}
        }
      }
      if(!route.length) {
        if(['food','water'].includes(goal.kind)) {
          if(rotateToward(actionTarget(),dt))beginTimed(goal.kind==='food'?'eat':'drink',goal.kind==='food'?6.5:4.8);
        } else if(['pointer','welcome'].includes(goal.kind)) {
          const near=goal.target&&distance(root.position,goal.target)<1.2;
          if(rotateToward(goal.target,dt)){if(near&&clock-lastBeg>18)beginTimed('beg',3.4);else {goal=null;idleWait=10;}}
        } else {const yielded=goal.kind==='robot-yield';goal=null;idleWait=yielded?12:7+Math.random()*15;if(yielded)pointerWait=4;}
      }
    }
    if(!timed&&!goal) {
      idleWait-=dt;pointerWait-=dt;
      if(following&&pointerWait<=0&&graph) {
        pointerWait=1.1;
        const pointer=getPointerPosition?.();
        const pointerOnFloor=position2(pointer)&&(!Number.isFinite(pointer.y)||Math.abs(pointer.y-initialPosition[1])<.3);
        const p=pointerOnFloor?position2(pointer):position2(getPlayerPosition?.());
        if(p&&(!lastApproach||distance(p,lastApproach)>.45||clock-lastApproachAt>22)) {
          const projected=projectedGoal(p);
          if(projected){lastApproach=p;lastApproachAt=clock;
            if(distance(graph.points[projected.node],root.position)>.20||projected.close&&clock-lastBeg>18)requestGoal(projected.node,'pointer',p);}
        }
      }
      if(!goal&&idleWait<=0&&!reduced)wander();
    }
    if(clock>=nextMess) {
      nextMess=clock+180+Math.random()*160;
      if(onMess&&graph&&distance(root.position,graph.points[dockNode])>.65)onMess(new THREE.Vector3(root.position.x,.018,root.position.z));
    }
    const eating=timed?.type==='eat',drinking=timed?.type==='drink',petting=timed?.type==='pet',begging=timed?.type==='beg';
    const blend=1-Math.exp(-dt*8);eatWeight+=((eating||drinking?1:0)-eatWeight)*blend;
    petWeight+=((petting?1:0)-petWeight)*blend;begWeight+=((begging?1:0)-begWeight)*blend;
    if(eating)foodLevel=.28+.72*clamp(timed.left/timed.total,0,1);
    kibble.forEach((bit,i)=>bit.visible=i<Math.round(foodLevel*kibble.length));
    waterSurface.position.y=.032+waterLevel*.009;ripple.position.y=waterSurface.position.y+.003;
    ripple.scale.setScalar(1+(Math.sin(t*5)+1)*.55);rippleMat.opacity=drinking&&!reduced?.3:0;
    torso.scale.y=1+(!reduced?Math.sin(t*2.3)*.012:0)-eatWeight*.09;
    torso.position.y=(moving&&!reduced?Math.abs(Math.sin(travelPhase))*(running?.018:.008):0)+begWeight*.055;
    torso.rotation.x=-begWeight*.18;
    for(let i=0;i<4;i++) {
      const phase=travelPhase+(i===0||i===3?0:Math.PI);
      legs[i].position.y=.25+(i<2?begWeight*.035:0);
      legs[i].rotation.x=moving&&!reduced?Math.sin(phase)*(running?.46:.29):(i<2?eatWeight*.08-begWeight*.56:begWeight*.035);
      legs[i].scale.y=i<2?1-eatWeight*.07:1;
    }
    head.position.y=.347-eatWeight*.187+begWeight*.095+petWeight*Math.sin(t*4)*.009;
    head.position.z=.227+eatWeight*.105-begWeight*.025;
    head.rotation.x=eatWeight*(.64+(!reduced?Math.sin(t*(drinking?12:8))*.018:0))-petWeight*.12-begWeight*.26;
    head.rotation.y=petWeight*Math.sin(t*3.5)*.15+(moving||eating||drinking||begging?0:!reduced?Math.sin(t*.5)*.065:0);
    head.rotation.z=petWeight*Math.sin(t*3.5)*.10;
    const talking=voiceElapsed<.76?Math.pow(Math.max(0,Math.sin(Math.PI*voiceElapsed/.76)),.7)*(.72+.28*Math.sin(voiceElapsed*14)):0;
    const chewing=eating?.17+.23*(.5+.5*Math.sin(t*8)):drinking?.28+.32*(.5+.5*Math.sin(t*12)):0;
    setMouth(Math.max(talking,chewing),drinking,t);
    ears[0].rotation.z=.16+(!reduced?Math.sin(t*.7)*.02:0);ears[1].rotation.z=-.16-(!reduced?Math.sin(t*.8)*.02:0);
    if(t>=nextBlink){blinkStart=t;nextBlink=t+3.1+Math.random()*2;}
    const blink=t-blinkStart,open=!reduced&&blink>=0&&blink<.2?Math.max(.05,Math.abs(blink-.1)*10):1;
    eyeGroups.forEach(e=>e.scale.y=(petting?.45:eating||drinking?.68:1)*open);
    tailBase.position.y=.287+begWeight*.025;tailBase.rotation.x=petting||begging?-.30:-1.05;
    tailBase.rotation.z=!reduced?Math.sin(t*(moving?4:1.8))*(petting?.2:.12):0;
    animateTail(t,reduced);
    locomotion=moving?(running?'trot':'walk'):'rest';
    currentAction=timed?.type||(moving?(running?'trot':'walk'):goal&&['food','water'].includes(goal.kind)?'align':'idle');
    root.userData.catState=getStatus();
  }
  function dispose(){if(disposed)return;disposed=true;sound.dispose();root.removeFromParent();bowls.food.removeFromParent();bowls.water.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  root.userData.onInteract=pet;root.userData.interactionRadius=.7;
  bowls.food.userData.onInteract=feed;bowls.water.userData.onInteract=water;
  scene.add(root);setNavigation(navigation);update(0,0);
  return {root,update,feed,pet,setFollowing,setNavigation,greet,water,bowls,getStatus,dispose};
}
