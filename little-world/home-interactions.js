// Interactive components built around the recovered apartment's real mesh positions.
// Room-door locations are concept additions to existing openings, not surveyed dimensions.
export function setupHouseInteractions({THREE,scene,model,register,toast=()=>{},getState=()=>({}),setState=()=>{}}){
  const S=.022381665533985514,P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const raw=o=>o.userData?.name||o.name||'';
  const all=[];model.updateMatrixWorld(true);model.traverse(o=>{if(o.isMesh)all.push(o);});
  const find=name=>all.find(o=>raw(o)===name||o.name===THREE.PropertyBinding.sanitizeNodeName(name));
  const starts=prefix=>all.filter(o=>raw(o).startsWith(prefix)||o.name.startsWith(THREE.PropertyBinding.sanitizeNodeName(prefix)));
  const createdGeometries=new Set(),createdMaterials=new Set(),createdGroups=[],originals=new Map();
  const records=[],doors=[],taps=[],chairs=[];let elapsed=0,disposed=false;
  const remember=o=>{if(!originals.has(o))originals.set(o,{parent:o.parent,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),interaction:o.userData.interactionId});};
  const ownMaterial=m=>(createdMaterials.add(m),m);
  const bronze=ownMaterial(new THREE.MeshStandardMaterial({color:0x665d4d,metalness:.78,roughness:.28}));
  const entry=find('Entry door leaf');
  const oak=entry?.material||ownMaterial(new THREE.MeshStandardMaterial({color:0xc5ab83,roughness:.52}));
  const group=(name,parent=scene)=>{const g=new THREE.Group();g.name=name;parent.add(g);createdGroups.push(g);return g;};
  function mesh(geometry,material,parent,name){createdGeometries.add(geometry);const o=new THREE.Mesh(geometry,material);o.name=name;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(parent,name,w,h,d,material=bronze){return mesh(new THREE.BoxGeometry(w,h,d),material,parent,name);}
  function cylinder(parent,name,radius,height,material=bronze){return mesh(new THREE.CylinderGeometry(radius,radius,height,16),material,parent,name);}
  function adopt(parent,objects){parent.updateMatrixWorld(true);for(const o of objects){remember(o);parent.attach(o);}}
  function persist(section,id,value){const current=getState()||{};setState({[section]:{...(current[section]||{}),[id]:value}});}
  function addRecord(r){records.push(r);register(r);return r;}
  function saved(section,id,fallback){const value=getState()?.[section]?.[id];return value===undefined?fallback:value;}
  function addDoor({id,label,x,z,width,direction=1,axis='x',sign=1,angle=84,existing=[]}){
    const pivot=group('Interactive door · '+id);pivot.position.copy(P(x,z));pivot.userData.category='door';
    const leafGroup=group('Door moving parts · '+id,pivot);let leaf,handle;
    if(existing.length){adopt(leafGroup,existing);leaf=entry;handle=find('Entry interior door handle');}
    else{
      const w=width*S;
      leaf=box(leafGroup,label+' · door leaf',w,2.12,.038,oak);
      leaf.position.set(direction*w/2,1.08,0);
      const metalPlate=box(leafGroup,label+' · handle escutcheon',.037,.13,.047);
      metalPlate.position.set(direction*(w-.115),1.025,0);
      handle=box(leafGroup,label+' · door handle',.12,.018,.025);
      handle.position.set(direction*(w-.15),1.015,-.040);
      const opposite=handle.clone();opposite.name=label+' · reverse handle';opposite.position.z=.040;leafGroup.add(opposite);
      for(const face of [-1,1]){const stem=box(leafGroup,label+' · handle spindle',.017,.019,.055);stem.position.set(direction*(w-.105),1.015,face*.026);}
      const frame=group('Door frame · '+id);frame.position.copy(P(x,z));frame.rotation.y=axis==='z'?-Math.PI/2:0;frame.userData.category='doorFrame';
      for(const xx of [-direction*.025,direction*(w+.025)]){const jamb=box(frame,label+' · frame jamb',.026,2.20,.082,oak);jamb.position.set(xx,1.10,0);}
      const head=box(frame,label+' · frame head',w+.076,.045,.082,oak);head.position.set(direction*w/2,2.18,0);
      for(const yy of [.35,1.06,1.83]){const hinge=cylinder(leafGroup,label+' · hinge',.009,.082);hinge.position.set(0,yy,0);}
    }
    const base=axis==='z'?-Math.PI/2:0,maxAngle=sign*THREE.MathUtils.degToRad(angle);
    let initial=clamp(Number(saved('doors',id,1)));if(!Number.isFinite(initial))initial=1;
    const door={id,label,kind:'door',object:leafGroup,leaf,pivot,anchor:new THREE.Vector3(),initial:1,openAmount:initial,target:initial,maxAngle,base,pivotPlan:[x,z],widthMetres:width*S};
    door.click=()=>{door.target=door.target>.5?0:1;persist('doors',id,door.target);toast(door.target?'已打开'+label:'已关闭'+label);};
    door.drag=(dx,dy,ctx={})=>{if(ctx.phase==='start'){door.dragStart=door.target;return;}if(ctx.phase==='move'){door.target=clamp((door.dragStart??door.target)+dx/180);}if(ctx.phase==='end')persist('doors',id,door.target);};
    door.setOpen=(amount,immediate=false)=>{door.target=clamp(amount);if(immediate){door.openAmount=door.target;pivot.rotation.y=base+maxAngle*door.target;pivot.updateMatrixWorld(true);}};
    door._anchorObject=handle||leaf;door.setOpen(initial,true);door._anchorObject.getWorldPosition(door.anchor);
    doors.push(door);addRecord(door);return door;
  }
  // Move the original leaf, both sides of its lock and all hinge barrels together.
  if(entry){
    const moving=[entry,find('Smart lock at entry'),find('Entry interior lock plate'),find('Entry interior door handle'),...starts('Entry door hinge')].filter(Boolean);
    // A 22 mm inward hinge rebate keeps the swing clear of the simplified full-depth wall.
    for(const o of moving){remember(o);o.position.x-=.022;}
    addDoor({id:'door-entry',label:'入户门',x:1160.95-.022/S,z:579,width:46,direction:-1,sign:-1,angle:84,existing:moving});
  }
  addDoor({id:'door-master',label:'主卧门',x:786.3,z:553.5,width:40.5,direction:-1,sign:1,angle:84});
  addDoor({id:'door-master-bath',label:'主卫门',x:791,z:612,width:40,direction:1,axis:'z',sign:1,angle:84});
  addDoor({id:'door-bedroom2',label:'次卧二门',x:1270.7,z:442.5,width:33.5,direction:-1,sign:-1,angle:84});
  addDoor({id:'door-bathroom2',label:'次卫二门',x:1237.5,z:388.5,width:39,direction:1,sign:1,angle:84});
  addDoor({id:'door-bedroom3',label:'次卧三门',x:1317.5,z:449.3,width:35,direction:1,axis:'z',sign:1,angle:84});
  addDoor({id:'door-bathroom3',label:'次卫三门',x:1213,z:489,width:36,direction:1,sign:-1,angle:84});

  // Park the cleaning station beside the TV bench, with its back against the slatted wall.
  // Its old location protruded into the narrow route from the entry to the kitchen.
  const vacuumDock=find('Robot vacuum dock'),vacuum=find('Robot vacuum');
  if(vacuumDock){remember(vacuumDock);vacuumDock.position.copy(P(699,542.2,.145));vacuumDock.rotation.y=-Math.PI/2;vacuumDock.updateMatrixWorld(true);}
  if(vacuum){remember(vacuum);vacuum.position.copy(P(699,532.8,.0425));vacuum.updateMatrixWorld(true);}

  const waterMaterial=ownMaterial(new THREE.MeshPhysicalMaterial({color:0xb9e4ee,roughness:.09,transmission:.60,transparent:true,opacity:.64,metalness:0,ior:1.333,thickness:.025,depthWrite:false}));
  function addTap({id,label,parts,nozzle,impact,leverPoint,leverAxis='z',extension=null}){
    if(!parts.length)return;
    const tapGroup=group('Interactive tap · '+id);adopt(tapGroup,parts);
    if(extension){const e=box(tapGroup,label+' · continuous spout extension',extension.length,.026,.028,bronze);e.position.copy(extension.center);}
    const end=cylinder(tapGroup,label+' · aerator',.014,.026);end.position.copy(nozzle).add(new THREE.Vector3(0,.013,0));
    const lever=group(label+' · rotating lever',tapGroup);lever.position.copy(leverPoint);
    const leverHandle=box(lever,label+' · lever handle',.073,.013,.023);leverHandle.position.x=-.032;
    const leverMount=cylinder(tapGroup,label+' · lever mount',.020,.025);leverMount.position.copy(leverPoint).add(new THREE.Vector3(0,-.012,0));
    const water=group(label+' · water flow',tapGroup),length=nozzle.y-impact.y;
    const stream=cylinder(water,label+' · falling water',.0055,length,waterMaterial);stream.position.copy(nozzle).addScaledVector(new THREE.Vector3(0,-1,0),length/2);stream.castShadow=false;
    const rippleMaterial=ownMaterial(new THREE.MeshBasicMaterial({color:0xbeeaf2,transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false}));
    const ripple=mesh(new THREE.RingGeometry(.015,.019,24),rippleMaterial,water,label+' · sink ripple');ripple.position.copy(impact);ripple.rotation.x=-Math.PI/2;ripple.castShadow=false;
    const drops=[];for(let i=0;i<4;i++){const d=mesh(new THREE.SphereGeometry(.0023,8,6),waterMaterial,water,label+' · flow highlight');d.position.copy(nozzle);d.castShadow=false;drops.push(d);}
    const active=Boolean(saved('taps',id,false));water.visible=active;
    const tap={id,label,kind:'tap',object:tapGroup,anchor:nozzle.clone(),active,water,lever,leverAxis,angle:active?.55:0,nozzle:nozzle.clone(),impact:impact.clone(),stream,ripple,drops};
    tap.click=()=>{tap.active=!tap.active;water.visible=tap.active;persist('taps',id,tap.active);toast(tap.active?label+'已出水':label+'已关闭');};
    taps.push(tap);addRecord(tap);
  }
  const islandParts=[find('Island faucet upright'),find('Island faucet spout')].filter(Boolean);
  addTap({id:'tap-kitchen',label:'厨房龙头',parts:islandParts,nozzle:P(866,384.45,1.215),impact:P(866,384.45,.974),leverPoint:P(866,375,1.125)});
  const masterTaps=all.filter(o=>raw(o)==='Master tap').sort((a,b)=>a.position.z-b.position.z);
  const connections=all.filter(o=>raw(o)==='Master tap wall connection');
  masterTaps.forEach((tap,i)=>{
    const z=633+i*35,connection=connections.find(o=>Math.abs(o.position.z-tap.position.z)<.02);
    addTap({id:'tap-master-'+(i+1),label:'主卫'+(i===0?'左':'右')+'龙头',parts:[tap,connection].filter(Boolean),nozzle:P(917,z,.963),impact:P(917,z,.914),leverPoint:P(928,z,1.01),extension:{length:(924.10-917)*S,center:P((924.10+917)/2,z,.99)}});
  });

  // A chair remains one group containing its original seat, back and all four legs.
  const diningPrefixes=['Dining west 382','Dining east 382','Dining west 423','Dining east 423','Dining west 464','Dining east 464','Dining north','Dining south'];
  const movableMeshes=new Set();
  for(const prefix of diningPrefixes){
    const parts=starts(prefix+' ');if(parts.length!==6)continue;
    const seat=parts.find(o=>raw(o).endsWith(' seat')||o.name.endsWith('_seat'));if(!seat)continue;
    const origin=seat.getWorldPosition(new THREE.Vector3());origin.y=0;
    const chairGroup=group('Movable chair · '+prefix);chairGroup.position.copy(origin);adopt(chairGroup,parts);parts.forEach(o=>movableMeshes.add(o));
    chairGroup.updateMatrixWorld(true);
    const id='chair-'+prefix.toLowerCase().replaceAll(' ','-');
    const chair={id,label:'餐椅',kind:'chair',object:chairGroup,anchor:origin.clone().setY(.65),initialPosition:origin.clone(),seat,parts,bounds:new THREE.Box3().setFromObject(chairGroup),dragOrigin:null,lastValid:origin.clone()};
    chairs.push(chair);
  }
  const room={minX:P(713,0).x,maxX:P(843,0).x,minZ:P(0,329).z,maxZ:P(0,526).z};
  const staticObstacles=[];
  for(const o of all){
    if(movableMeshes.has(o)||originals.has(o)||o.userData.category==='floor'||['ceiling','ceilingFixture','soffit','hvac'].includes(o.userData.category))continue;
    const b=new THREE.Box3().setFromObject(o);if(b.max.y<.14||b.min.y>1.04||b.isEmpty())continue;
    if(b.max.x<room.minX||b.min.x>room.maxX||b.max.z<room.minZ||b.min.z>room.maxZ)continue;
    staticObstacles.push({object:o,bounds:b});
  }
  function intersectsFootprint(a,b,margin=.005){return a.min.x<b.max.x+margin&&a.max.x>b.min.x-margin&&a.min.z<b.max.z+margin&&a.max.z>b.min.z-margin;}
  function validPosition(chair,position){
    const b=chair.bounds.clone().translate(position.clone().sub(chair.initialPosition));
    if(b.min.x<room.minX||b.max.x>room.maxX||b.min.z<room.minZ||b.max.z>room.maxZ)return false;
    if(staticObstacles.some(o=>intersectsFootprint(b,o.bounds)))return false;
    for(const other of chairs){if(other===chair)continue;other.object.updateMatrixWorld(true);if(intersectsFootprint(b,new THREE.Box3().setFromObject(other.object),.015))return false;}
    return true;
  }
  function moveChair(chair,requested){
    requested.y=0;
    const begin=chair.object.position.clone(),distance=begin.distanceTo(requested),steps=Math.max(1,Math.ceil(distance/.035));
    let accepted=begin.clone();
    for(let step=1;step<=steps;step++){
      const candidate=begin.clone().lerp(requested,step/steps);
      if(!validPosition(chair,candidate))break;
      accepted.copy(candidate);
    }
    chair.object.position.copy(accepted);chair.object.updateMatrixWorld(true);chair.lastValid.copy(accepted);chair.anchor.copy(accepted).setY(.65);return accepted.distanceTo(requested)<.01;
  }
  for(const chair of chairs){
    const position=saved('furniture',chair.id,null);
    if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z)){const target=new THREE.Vector3(position.x,0,position.z);if(validPosition(chair,target)){chair.object.position.copy(target);chair.lastValid.copy(target);chair.anchor.copy(target).setY(.65);}}
    chair.click=()=>toast('按住餐椅拖动，可在餐区内调整位置');
    chair.drag=(dx,dy,ctx={})=>{
      if(ctx.phase==='start'){chair.dragOrigin=chair.object.position.clone();chair.dragPoint=ctx.worldPoint?.clone()||null;chair.warned=false;return;}
      if(ctx.phase==='move'&&chair.dragOrigin){
        let desired=chair.dragOrigin.clone();
        if(ctx.worldPoint&&chair.dragPoint)desired.add(ctx.worldPoint.clone().sub(chair.dragPoint));else desired.add(new THREE.Vector3(dx*.008,0,dy*.008));
        if(!moveChair(chair,desired)&&!chair.warned){toast('此处靠近桌子或墙面，已保留通行位置');chair.warned=true;}
      }
      if(ctx.phase==='end'){persist('furniture',chair.id,{x:chair.object.position.x,z:chair.object.position.z});chair.dragOrigin=null;}
    };
    addRecord(chair);
  }
  function update(dt){
    if(disposed)return;dt=clamp(Number(dt)||0,0,.1);elapsed+=dt;
    for(const door of doors){door.openAmount+=(door.target-door.openAmount)*(1-Math.exp(-dt*10));if(Math.abs(door.target-door.openAmount)<.0001)door.openAmount=door.target;door.pivot.rotation.y=door.base+door.maxAngle*door.openAmount;door.pivot.updateMatrixWorld(true);door._anchorObject.getWorldPosition(door.anchor);}
    for(const tap of taps){tap.angle+=((tap.active?.55:0)-tap.angle)*(1-Math.exp(-dt*12));tap.lever.rotation[tap.leverAxis]=tap.angle;if(!tap.active)continue;tap.stream.scale.x=tap.stream.scale.z=1+Math.sin(elapsed*17)*.05;const cycle=(elapsed*.85)%1;tap.ripple.scale.setScalar(.7+cycle*1.1);tap.ripple.material.opacity=.30*(1-cycle);tap.drops.forEach((d,i)=>{const t=(elapsed*2.6+i/4)%1;d.position.copy(tap.nozzle).lerp(tap.impact,t);});}
  }
  function reset(){
    const state=getState()||{},doorState={...(state.doors||{})},tapState={...(state.taps||{})},furniture={...(state.furniture||{})};
    for(const door of doors){door.setOpen(1,true);doorState[door.id]=1;}
    for(const tap of taps){tap.active=false;tap.water.visible=false;tap.angle=0;tap.lever.rotation[tap.leverAxis]=0;tapState[tap.id]=false;}
    for(const chair of chairs){chair.object.position.copy(chair.initialPosition);chair.lastValid.copy(chair.initialPosition);chair.anchor.copy(chair.initialPosition).setY(.65);furniture[chair.id]={x:chair.initialPosition.x,z:chair.initialPosition.z};}
    setState({doors:doorState,taps:tapState,furniture});update(0);
  }
  function dispose(){
    if(disposed)return;disposed=true;records.forEach(r=>r.disabled=true);
    for(const [object,original] of originals){original.parent.add(object);object.position.copy(original.position);object.quaternion.copy(original.quaternion);object.scale.copy(original.scale);if(original.interaction===undefined)delete object.userData.interactionId;else object.userData.interactionId=original.interaction;object.updateMatrixWorld(true);}
    for(const g of createdGroups)g.removeFromParent();createdGeometries.forEach(g=>g.dispose());createdMaterials.forEach(m=>m.dispose());
  }
  update(0);
  return {update,doors,taps,chairs,reset,dispose};
}
