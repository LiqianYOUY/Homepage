import {addTranslations} from './i18n.js?v=14';
import {optimizeScene} from './optimize-scene.js';

addTranslations({'玄关鞋柜 1':'Entry shoe cupboard 1','玄关鞋柜 2':'Entry shoe cupboard 2','玄关鞋柜 3':'Entry shoe cupboard 3'});

// Dimensions below are furniture additions fitted to the actual entrance walls.
// They do not extend the recovered apartment footprint or its walkable floor.
export function setupEntryDetails({THREE,model,house,register=()=>{},getState=()=>({}),setState=()=>{}}){
 const nameOf=o=>o.userData?.name||o.name||'',objects=[];
 model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)objects.push(o);});
 const find=name=>objects.find(o=>nameOf(o)===name),wall=find('Bedroom3 west boundary · cutaway'),bench=find('Entry bench'),entry=house?.doors?.find(d=>d.id==='door-entry');
 const root=new THREE.Group();root.name='Entry slim shoe cupboards and everyday tray';model.add(root);
 const geometry=new Set(),materials=new Set(),records=[],colliderRoots=[];let disposed=false,finalized=false;
 if(!wall||!bench||!entry)return {root,colliderRoots,audit:{installed:false,reason:'Source entrance wall, bench or interactive door is missing'},finalize(){return null;},dispose(){root.removeFromParent();}};
 const material=(name,values)=>{const m=new THREE.MeshStandardMaterial(values);m.name=name;materials.add(m);return m;};
 const oak=material('Entry natural oak',{color:0xc0aa89,roughness:.66}),ivory=material('Entry warm ivory fronts',{color:0xe5dfd2,roughness:.63});
 const interior=material('Entry cupboard interior',{color:0xb09b7c,roughness:.78}),dark=material('Entry recessed trim',{color:0x5b5b4f,roughness:.78});
 const brass=material('Entry brushed key brass',{color:0xc7a35f,metalness:.83,roughness:.27}),steel=material('Entry keyring steel',{color:0xa6ada8,metalness:.9,roughness:.25});
 const leather=material('Entry cognac leather wallet',{color:0x855940,roughness:.8}),stitch=material('Entry leather seam',{color:0xb48a68,roughness:1});
 const cardMaterial=material('Entry plain sage access card',{color:0x90a99c,roughness:.37}),cardInk=material('Entry access card contactless symbol',{color:0xe9f0e5,roughness:.48});
 const trayMaterial=material('Entry ceramic catchall',{color:0xc8b6a3,roughness:.69}),sole=material('Entry shoe rubber soles',{color:0xd8d5c8,roughness:1});
 const shoes=[material('Entry sage everyday shoes',{color:0x798a78,roughness:1}),material('Entry cream everyday shoes',{color:0xd1c5b2,roughness:1}),material('Entry warm brown shoes',{color:0x906a50,roughness:1})];
 function mesh(g,m,parent,name,category='furniture'){geometry.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.userData={name,category};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const box=(p,n,w,h,d,m=oak,c='furniture')=>mesh(new THREE.BoxGeometry(w,h,d),m,p,n,c);
 const group=(p,n)=>{const g=new THREE.Group();g.name=n;p.add(g);return g;};
 const wallBox=new THREE.Box3().setFromObject(wall),benchBox=new THREE.Box3().setFromObject(bench),S=.022381665533985514;
 const width=1.38,depth=.23,bodyDepth=depth-.038,bodyZ=-.019,height=.94,gap=.008,moduleWidth=(width-2*gap)/3;
 const endZ=entry.closedPlaneZ-.24,startZ=endZ-width,wallGap=.012,backX=wallBox.min.x-wallGap;
 const cabinet=group(root,'Three slim entrance shoe cupboards');cabinet.position.set(backX-depth/2,0,(startZ+endZ)/2);cabinet.rotation.y=-Math.PI/2;
 // Sliding fronts stack within each cabinet, leaving the narrow aisle unchanged.
 for(let i=0;i<3;i++){
   const unit=group(cabinet,'Entry shoe cupboard '+(i+1)),cx=-width/2+moduleWidth/2+i*(moduleWidth+gap);unit.position.x=cx;
   for(const x of [-moduleWidth/2+.009,moduleWidth/2-.009]){const side=box(unit,'Entry shoe cupboard '+(i+1)+' side',.018,height-.075,bodyDepth,oak);side.position.set(x,(height+.075)/2,bodyZ);}
   const back=box(unit,'Entry shoe cupboard '+(i+1)+' back',moduleWidth-.036,height-.11,.013,interior);back.position.set(0,(height+.07)/2,-depth/2+.0065);
   for(const y of [.085,.49]){const shelf=box(unit,'Entry shoe cupboard '+(i+1)+' shelf',moduleWidth-.036,.018,bodyDepth-.014,interior);shelf.position.set(0,y,bodyZ);}
   const plinth=box(unit,'Entry shoe cupboard '+(i+1)+' inset plinth',moduleWidth-.045,.075,bodyDepth-.045,dark);plinth.position.set(0,.0375,bodyZ-.013);
   const right=box(unit,'Entry shoe cupboard '+(i+1)+' fixed sliding front',moduleWidth/2-.009,.81,.017,ivory);right.position.set(moduleWidth/4,.508,depth/2-.0015);
   const id='entry-shoe-cupboard-'+(i+1),moving=group(unit,'Entry shoe cupboard '+(i+1)+' sliding leaf');moving.userData={interactionId:id,noMerge:true};moving.position.x=-moduleWidth/4;
   const leaf=box(moving,'Entry shoe cupboard '+(i+1)+' sliding front',moduleWidth/2-.011,.81,.017,ivory);leaf.position.set(0,.508,depth/2-.0255);
   const pull=box(moving,'Entry shoe cupboard '+(i+1)+' recessed pull',.008,.13,.007,dark,'decoration');pull.position.set(-moduleWidth/4+.028,.53,depth/2-.0135);
   const saved=Number(getState()?.doors?.[id]),amount=Number.isFinite(saved)?Math.max(0,Math.min(1,saved)):0;
   unit.userData.interactionId=id;
   const record={id,label:'玄关鞋柜 '+(i+1),kind:'cabinet',object:unit,moving,anchor:new THREE.Vector3(),target:amount,amount,travel:moduleWidth/2-.012};
   const apply=value=>{record.amount=value;moving.position.x=-moduleWidth/4+record.travel*value;moving.updateWorldMatrix(true,true);pull.getWorldPosition(record.anchor);};
   const persist=()=>setState({doors:{...(getState()?.doors||{}),[id]:record.target}});
   record.click=()=>{record.target=record.target>.5?0:1;persist();};record.setOpen=(value,immediate=false)=>{record.target=Math.max(0,Math.min(1,value));if(immediate)apply(record.target);};record.apply=apply;
   apply(amount);records.push(record);colliderRoots.push(moving);register(record);
   // Adult-length shoes sit on sloping racks, appropriate for a 23 cm slim case.
   for(const level of [0,1])for(const side of [-1,1]){
     const shoe=group(unit,'Entry stored shoe '+(i+1)+'-'+level+'-'+side);shoe.position.set(-moduleWidth/4+side*.047,.17+level*.405,.009);shoe.rotation.x=-1.05;
     const soleMesh=mesh(new THREE.SphereGeometry(1,12,8),sole,shoe,'Entry shoe sole','cabinetContents');soleMesh.scale.set(.040,.012,.118);
     const upper=mesh(new THREE.SphereGeometry(1,12,8),shoes[i],shoe,'Entry shoe upper','cabinetContents');upper.scale.set(.039,.033,.111);upper.position.set(0,.026,-.003);
     const opening=mesh(new THREE.SphereGeometry(1,10,6),dark,shoe,'Entry shoe opening','cabinetContents');opening.scale.set(.019,.006,.037);opening.position.set(0,.055,-.05);
     for(let lace=0;lace<3;lace++){const l=box(shoe,'Entry shoe lace',.044,.003,.004,sole,'cabinetContents');l.position.set(0,.056,.009+lace*.013);}
   }
 }
 const top=box(cabinet,'Entry continuous oak counter',width+.012,.025,depth+.012,oak);top.position.set(0,height+.0125,0);
 const tray=group(cabinet,'Entry keys access card and wallet catchall');tray.position.set(width/2-moduleWidth/2,height+.027,0);
 const trayBottom=box(tray,'Entry ceramic tray base',.414,.008,.184,trayMaterial,'decoration');trayBottom.position.y=.004;
 for(const x of [-.208,.208]){const rim=box(tray,'Entry catchall side rim',.008,.018,.19,trayMaterial,'decoration');rim.position.set(x,.009,0);}
 for(const z of [-.093,.093]){const rim=box(tray,'Entry catchall edge rim',.408,.018,.008,trayMaterial,'decoration');rim.position.set(0,.009,z);}
 const wallet=group(tray,'Entry folded leather wallet');wallet.position.set(-.137,.008,.014);wallet.rotation.y=-.10;
 for(const y of [.004,.010]){const flap=box(wallet,'Entry leather wallet flap',.108,.006,.080,leather,'decoration');flap.position.y=y;}
 const fold=box(wallet,'Entry wallet fold',.006,.012,.078,leather,'decoration');fold.position.set(-.052,.006,0);
 for(const z of [-.035,.035]){const seam=box(wallet,'Entry wallet visible stitching',.096,.0008,.001,stitch,'decoration');seam.position.set(0,.0135,z);}
 const card=group(tray,'Entry unmarked contactless access card');card.position.set(-.018,.009,-.012);card.rotation.y=.12;
 const plastic=box(card,'Entry blank access card',.0856,.0016,.054,cardMaterial,'decoration');plastic.position.y=.0008;
 for(const radius of [.004,.007,.010]){const arc=mesh(new THREE.TorusGeometry(radius,.0007,6,14,Math.PI*.65),cardInk,card,'Entry contactless symbol arc','decoration');arc.rotation.x=-Math.PI/2;arc.rotation.z=-Math.PI*.325;arc.position.set(.022,.002,-.006);}
 const keyring=group(tray,'Entry keyring and three keys');keyring.position.set(.112,.012,-.030);
 const ring=mesh(new THREE.TorusGeometry(.019,.0021,8,28),steel,keyring,'Entry visible keyring','decoration');ring.rotation.x=Math.PI/2;
 for(const [i,angle] of [-.60,0,.60].entries()){
   const key=group(keyring,'Entry brass key '+(i+1));key.rotation.y=angle;key.position.set(0,i*.0017,.013);
   const head=mesh(new THREE.TorusGeometry(.007,.002,8,16),brass,key,'Entry key bow','decoration');head.rotation.x=Math.PI/2;
   const shaft=box(key,'Entry key shaft',.005,.0025,.031,brass,'decoration');shaft.position.z=.020;
   for(let tooth=0;tooth<3;tooth++){const bit=box(key,'Entry key tooth',tooth===1?.009:.012,.0025,.003,brass,'decoration');bit.position.set(.002,0,.026+tooth*.005);}
 }
 root.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3().setFromObject(cabinet),doorInside=entry.closedPlaneZ-.19;
 const audit={installed:true,sourceWall:nameOf(wall),sourceBench:nameOf(bench),doorSwing:entry.swing,cabinetCount:3,shoePairs:6,cabinetWidthM:width,cabinetDepthM:depth,counterHeightM:height+.025,wallGapM:wallGap,clearAisleAtBenchM:bounds.min.x-benchBox.max.x,doorPlaneZ:entry.closedPlaneZ,cabinetBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},countertopObjects:['three keys on a ring','blank contactless door card','folded wallet','ceramic catchall tray'],personalInformation:false,doorMechanism:'Three independent fronts slide within the cabinet footprint',floorExtended:false,sourceFloorLimitPlanZ:582,insideRoutePlan:[[1134,569],[1134,552],[1134,534],[1134,511],[1134,495]],insideDoorApproach:[(1134-935)*S,1.57,doorInside],notes:['The source outside landing is not modelled; walking remains inside the original floor boundary.','Furniture dimensions are fitted concept additions, not surveyed building dimensions.']};
 // Defer local batching until after collisions are captured. Interactive cupboard
 // groups are skipped by the optimizer, retaining their moving fronts and records.
 function finalize(){
   if(disposed||finalized)return audit.optimization||null;
   const optimization=optimizeScene({THREE,model:root});
   root.traverse(o=>{if(o.isMesh){o.userData.noMerge=true;geometry.add(o.geometry);}});
   finalized=true;audit.optimization=optimization;return optimization;
 }
 return {root,records,colliderRoots,audit,finalize,update(dt){if(disposed)return;const t=Math.max(0,Math.min(.1,Number(dt)||0));for(const r of records){const next=r.amount+(r.target-r.amount)*(1-Math.exp(-t*12));if(Math.abs(next-r.amount)>1e-6)r.apply(Math.abs(next-r.target)<1e-4?r.target:next);}},dispose(){if(disposed)return;disposed=true;records.forEach(r=>r.disabled=true);root.removeFromParent();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
