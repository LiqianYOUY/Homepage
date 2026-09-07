import {addTranslations} from './i18n.js?v=14';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

addTranslations({
  '休憩椅 · 打开阅读灯':'Rest chair · Turn on reading light',
  '休憩椅 · 关闭阅读灯':'Rest chair · Turn off reading light'
});

/** Reversible, local furnishings in the measured master-suite reading/dressing corners.
 * Install after room renovation/cabinetry and before walking bounds are captured.
 * The open shell is a reading chair, without medical or oxygen-delivery claims.
 */
export function setupBedroomDetails({THREE,model,renovation,cabinetry,register=()=>{},getState=()=>({}),setState=()=>{},turnLightsOn}={}){
  if(!THREE||!model?.isObject3D)throw new TypeError('Bedroom details need THREE and the apartment model.');
  const raw=o=>o.userData?.name||o.name||'',geometries=new Set(),materials=new Set(),originals=[];
  const source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  // This original chair is static: home-interactions only adopts the dining chairs.
  for(const object of source.filter(o=>raw(o).startsWith('Master reading chair '))){originals.push({object,parent:object.parent});object.removeFromParent();}
  const root=new THREE.Group();root.name='Master suite · quiet reading and dressing details';model.add(root);
  const group=(name,parent=root)=>{const g=new THREE.Group();g.name=name;parent.add(g);return g;};
  function material(name,color,roughness=.65,metalness=0){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name=name;materials.add(m);return m;}
  const ivory=material('Bedroom details warm ivory shell',0xe7e1d6,.45),sage=material('Bedroom details grey sage upholstery',0x849488,.96),linen=material('Bedroom details soft cream linen',0xcfc7b6,1),oak=material('Bedroom details pale oak',0xbfa681,.69),champagne=material('Bedroom details satin champagne',0xb6ac95,.33,.7),graphite=material('Bedroom details graphite controls',0x34423d,.34),clay=material('Bedroom details muted terracotta',0xb38b75,.90),amber=material('Bedroom details amber perfume',0x886644,.30);
  const glow=material('Bedroom details gentle warm rim',0xe9c799,.38);glow.emissive.setHex(0xffc280);glow.emissiveIntensity=.32;
  const display=material('Bedroom details reading light indicator',0x93b7a8,.28);display.emissive.setHex(0x91d5ad);
  function mesh(parent,name,geometry,mat,category='decor'){
    geometries.add(geometry);const object=new THREE.Mesh(geometry,mat);object.name=name;object.userData={name,category,noMerge:true};
    // These small owned meshes stay together for disposal and light-state changes.
    object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
  }
  function box(parent,name,w,h,d,mat,at=[0,0,0],category='furniture'){const o=mesh(parent,name,new THREE.BoxGeometry(w,h,d),mat,category);o.position.set(...at);return o;}
  function cylinder(parent,name,r,h,mat,at=[0,0,0],category='decor',top=r){const o=mesh(parent,name,new THREE.CylinderGeometry(top,r,h,16),mat,category);o.position.set(...at);return o;}
  function oval(parent,name,radii,mat,at,category='decor',segments=24){const o=mesh(parent,name,new THREE.SphereGeometry(1,segments,14),mat,category);o.scale.set(...radii);o.position.set(...at);return o;}
  function rod(parent,name,a,b,r,mat,category='decor'){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const o=cylinder(parent,name,r,delta.length(),mat,start.add(end).multiplyScalar(.5).toArray(),category);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  }
  function curve(parent,name,points,r,mat){return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,r,6,false),mat);}
  function garment(parent,name,points,mat,at){
    const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();
    const o=mesh(parent,name,new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:1,steps:1}),mat);o.position.set(...at);return o;
  }

  // The west curtain rail is x=-11.35. Opening the chair towards the room leaves
  // the window fabric, console at z<=1.201, and bed beginning at z=2.785 clear.
  const chair=group('Master open pod rest chair');chair.position.set(-10.52,0,1.73);chair.rotation.y=.28;
  cylinder(chair,'Master pod broad pedestal foot',.365,.055,champagne,[0,.029,-.07],'furniture');
  cylinder(chair,'Master pod connected pedestal stem',.072,.255,champagne,[0,.176,-.07],'furniture',.092);
  const shell=mesh(chair,'Master pod open egg outer shell',new THREE.SphereGeometry(1,32,22,Math.PI,Math.PI),ivory,'furniture');shell.scale.set(.51,.79,.55);shell.position.set(0,1.015,0);shell.material.side=THREE.DoubleSide;
  const inner=mesh(chair,'Master pod padded inner shell',new THREE.SphereGeometry(1,28,18,Math.PI,Math.PI),sage);inner.scale.set(.477,.745,.507);inner.position.set(0,1.015,.018);inner.material.side=THREE.DoubleSide;
  const trim=mesh(chair,'Master pod continuous shell lip',new THREE.TorusGeometry(1,.024,8,56),champagne);trim.scale.set(.51,.79,1);trim.position.set(0,1.015,.009);
  const rim=mesh(chair,'Master pod warm edge light',new THREE.TorusGeometry(1,.007,6,56),glow);rim.scale.set(.482,.757,1);rim.position.set(0,1.015,.041);rim.castShadow=false;
  oval(chair,'Master pod deep seat cushion',[.365,.11,.405],sage,[0,.474,.075],'furniture');
  const back=oval(chair,'Master pod reclining back cushion',[.362,.365,.135],sage,[0,.869,-.275]);back.rotation.x=-.15;
  oval(chair,'Master pod soft headrest',[.242,.12,.07],linen,[0,1.373,-.232]);
  for(const sign of [-1,1])oval(chair,'Master pod padded armrest '+sign,[.070,.070,.255],sage,[sign*.369,.668,.002],'furniture');
  const throwCloth=oval(chair,'Master pod casually folded linen throw',[.094,.031,.234],linen,[-.365,.735,.02]);throwCloth.rotation.z=-.20;
  for(let i=0;i<4;i++)rod(chair,'Master pod throw fringe',[-.398+i*.018,.72,.22],[-.398+i*.018,.684,.242],.0027,linen);
  const control=group('Master pod small reading-light control',chair);control.position.set(.398,.728,.188);control.rotation.x=-Math.PI/3;
  box(control,'Master pod control screen surround',.136,.089,.022,graphite,[0,0,0],'decor');
  box(control,'Master pod control display',.118,.071,.003,display,[0,0,.013],'decor');
  // A familiar power icon and tiny open-book glyph work in either language.
  const power=mesh(control,'Master pod power icon',new THREE.TorusGeometry(.015,.0022,5,18,Math.PI*1.55),ivory);power.rotation.z=.71;power.position.set(-.033,0,.017);
  box(control,'Master pod power icon stem',.003,.020,.002,ivory,[-.033,.014,.017],'decor');
  for(const sign of [-1,1]){const page=box(control,'Master pod open-book display page',.021,.027,.002,ivory,[.028+sign*.011,0,.017],'decor');page.rotation.z=-sign*.09;}
  cylinder(chair,'Master pod reading-light inset',.035,.019,graphite,[-.115,1.554,-.091]);
  const lampLens=oval(chair,'Master pod reading-light lens',[.025,.006,.025],glow,[-.115,1.543,-.082]);lampLens.castShadow=false;
  const readingLight=new THREE.SpotLight(0xffd2a0,0,1.7,.69,.72,2);readingLight.name='Master pod focused reading light';readingLight.position.set(-.11,1.51,-.075);readingLight.castShadow=false;chair.add(readingLight);
  const lightTarget=new THREE.Object3D();lightTarget.position.set(0,.46,.20);chair.add(lightTarget);readingLight.target=lightTarget;
  const initialState=getState()||{};
  let lightOn=initialState.settings?.bedroomReadingLight===true,houseLightsOn=initialState.smart?.lightsOn!==false,disposed=false;
  const record={id:'master-rest-chair',label:'休憩椅 · 打开阅读灯',kind:'light',object:chair,anchor:chair.localToWorld(new THREE.Vector3(.22,1.11,.25)),hotspot:true};
  function applyLight(){
    const effectiveOn=lightOn&&houseLightsOn;
    readingLight.intensity=effectiveOn?2.4:0;glow.emissiveIntensity=effectiveOn?.32:0;
    display.emissiveIntensity=houseLightsOn?(lightOn?.52:.10):0;
    record.label=lightOn?'休憩椅 · 关闭阅读灯':'休憩椅 · 打开阅读灯';
  }
  record.click=()=>{
    if(disposed)return;const state=getState()||{},saved=state.settings?.bedroomReadingLight;
    lightOn=!(typeof saved==='boolean'?saved:lightOn);houseLightsOn=state.smart?.lightsOn!==false;
    const patch={settings:{...(state.settings||{}),bedroomReadingLight:lightOn}};
    // An explicit local "on" also wakes the house lighting, as the studio lamp does.
    if(lightOn&&!houseLightsOn){turnLightsOn?.();houseLightsOn=true;patch.smart={...(state.smart||{}),lightsOn:true};}
    applyLight();setState(patch);
  };
  function update(){
    if(disposed)return;const state=getState()||{},saved=state.settings?.bedroomReadingLight;
    const nextLocal=typeof saved==='boolean'?saved:lightOn,nextHouse=state.smart?.lightsOn!==false;
    if(nextLocal===lightOn&&nextHouse===houseLightsOn)return;
    lightOn=nextLocal;houseLightsOn=nextHouse;applyLight();
  }
  chair.traverse(o=>{o.userData.noMerge=true;if(o.isMesh)o.userData.interactionId=record.id;});applyLight();register(record);

  // Inside the bedroom, on the viewer's right when facing the north-wall console.
  // Its right end is x=-7.921; the dressing partition starts at x=-7.018.
  // The stand faces into the room (+z), away from every bedroom/ensuite doorway.
  const rack=group('Master dressing slim valet stand');rack.position.set(-7.53,0,1.25);
  box(rack,'Master valet slim oak base',.46,.043,.28,oak,[0,.023,0]);
  for(const x of [-.145,.145])rod(rack,'Master valet freestanding upright',[x,.043,-.065],[x,1.63,-.065],.011,champagne,'furniture');
  rod(rack,'Master valet upper crossbar',[-.19,1.62,-.065],[.19,1.62,-.065],.012,champagne,'furniture');
  box(rack,'Master valet useful shallow tray',.40,.020,.235,oak,[0,.335,.002]);
  for(const x of [-.195,.195])box(rack,'Master valet tray side rim',.012,.033,.235,oak,[x,.353,.002],'decor');
  for(const z of [-.11,.114])box(rack,'Master valet tray end rim',.39,.033,.012,oak,[0,.353,z],'decor');
  box(rack,'Master valet lower woven storage basket',.33,.175,.202,linen,[0,.139,0]);
  for(let i=0;i<5;i++)box(rack,'Master valet basket woven rib',.009,.164,.006,oak,[-.128+i*.064,.139,.104],'decor');
  // The hanger, shirt and scarf have distinct silhouettes but no new floor blockers.
  curve(rack,'Master valet coat hanger hook',[[0,1.53,-.02],[0,1.65,-.02],[.025,1.668,-.02],[.042,1.643,-.02],[.024,1.624,-.02]],.004,champagne);
  for(const [a,b] of [[[0,1.54,-.02],[-.177,1.447,-.02]],[[-.177,1.447,-.02],[.177,1.447,-.02]],[[.177,1.447,-.02],[0,1.54,-.02]]])rod(rack,'Master valet triangular clothes hanger',a,b,.004,oak);
  garment(rack,'Master valet linen overshirt',[[-.038,0],[-.104,.011],[-.176,-.071],[-.206,-.315],[-.153,-.33],[-.112,-.17],[-.112,-.62],[.112,-.62],[.112,-.17],[.153,-.33],[.206,-.315],[.176,-.071],[.104,.011],[.038,0],[0,-.055]],sage,[0,1.452,-.014]);
  for(const sign of [-1,1])garment(rack,'Master valet shirt collar',[[sign*.031,0],[sign*.086,-.045],[sign*.035,-.09],[0,-.035]],linen,[0,1.452,.010]);
  for(let i=0;i<4;i++)oval(rack,'Master valet shirt front button',[.004,.004,.003],ivory,[0,1.32-i*.107,.011],'decor',8);
  const scarf=box(rack,'Master valet draped sand scarf',.068,.62,.021,linen,[-.113,1.147,.029],'decor');scarf.rotation.z=-.06;
  rod(rack,'Master valet hat hook',[-.145,1.55,-.065],[-.145,1.70,-.025],.006,champagne);
  const hat=group('Master valet soft brimmed hat',rack);hat.position.set(-.121,1.726,-.018);hat.rotation.z=-.17;
  const brim=cylinder(hat,'Master valet hat wide brim',.123,.014,linen);brim.scale.z=.79;
  const crown=cylinder(hat,'Master valet hat crown',.073,.076,linen,[0,.039,0],'decor',.065);crown.scale.z=.84;
  const band=cylinder(hat,'Master valet hat band',.074,.013,clay,[0,.014,0]);band.scale.z=.845;
  const bag=oval(rack,'Master valet small shoulder bag',[.078,.102,.034],clay,[.125,1.025,.066]);bag.rotation.z=-.09;
  curve(rack,'Master valet shoulder-bag leather strap',[[.056,1.085,.067],[.078,1.535,.067],[.15,1.59,.067],[.193,1.527,.067],[.193,1.085,.067]],.006,clay);
  box(rack,'Master valet bag flap clasp',.019,.013,.005,champagne,[.126,1.023,.10],'decor');
  cylinder(rack,'Master valet amber perfume bottle',.023,.073,amber,[-.108,.390,.036]);
  cylinder(rack,'Master valet perfume bottle cap',.014,.017,champagne,[-.108,.435,.036]);
  box(rack,'Master valet perfume paper label',.026,.026,.003,ivory,[-.108,.389,.060],'decor');
  box(rack,'Master valet soft accessories pouch',.115,.039,.072,clay,[.057,.367,.027],'decor');
  const ring=mesh(rack,'Master valet jewellery ring on tray',new THREE.TorusGeometry(.014,.0025,5,14),champagne);ring.rotation.x=Math.PI/2;ring.position.set(.062,.389,.024);

  // The dressing room has 1.24 m between the two banks' complete door sweeps.
  // A low, narrow dressing perch fills its centre without hiding the mirror or
  // occupying the bath route along the east side. The west end is a soft seat;
  // the east end holds the accessories one takes off at the end of the day.
  const island=group('Master dressing low rounded accessory island');island.position.set(-5.40,0,2.66);
  function roundedBox(parent,name,w,h,d,r,mat,at,category='decor'){
    const shape=new THREE.Shape(),x=w/2,z=d/2;
    shape.moveTo(-x+r,-z);shape.lineTo(x-r,-z);shape.quadraticCurveTo(x,-z,x,-z+r);
    shape.lineTo(x,z-r);shape.quadraticCurveTo(x,z,x-r,z);shape.lineTo(-x+r,z);
    shape.quadraticCurveTo(-x,z,-x,z-r);shape.lineTo(-x,-z+r);shape.quadraticCurveTo(-x,-z,-x+r,-z);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:4,steps:1});
    geometry.rotateX(-Math.PI/2);geometry.translate(0,-h/2,0);
    const o=mesh(parent,name,geometry,mat,category);o.position.set(...at);return o;
  }
  roundedBox(island,'Master island recessed plinth',.82,.068,.35,.065,graphite,[0,.034,0],'furniture');
  roundedBox(island,'Master island rounded oak storage body',.92,.325,.42,.067,oak,[0,.231,0],'furniture');
  roundedBox(island,'Master island softly rounded ivory top',.96,.027,.46,.082,ivory,[0,.407,0],'furniture');
  // Recessed seams and finger pulls imply the two shallow accessory drawers.
  box(island,'Master island drawer dividing shadow',.012,.234,.002,graphite,[.034,.247,.211],'decor');
  for(const x of [-.203,.228]){
    box(island,'Master island drawer bottom shadow',.385,.003,.002,graphite,[x,.122,.211],'decor');
    box(island,'Master island inset drawer finger pull',.115,.014,.006,champagne,[x,.341,.214],'decor');
  }
  roundedBox(island,'Master island upholstered sitting pad',.40,.060,.40,.074,sage,[-.244,.450,0],'decor');
  roundedBox(island,'Master island fabric seat piping',.408,.006,.408,.076,linen,[-.244,.429,0],'decor');
  const tray=group('Master island leather-lined accessories tray',island);tray.position.set(.232,.424,.034);
  roundedBox(tray,'Master island shallow oak tray base',.335,.012,.272,.047,oak,[0,.006,0]);
  roundedBox(tray,'Master island camel suede tray lining',.313,.005,.25,.037,clay,[0,.014,0]);
  // A raised, continuous rounded lip leaves the middle genuinely open.
  const lipPath=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,xx=Math.cos(a),zz=Math.sin(a);lipPath.push([Math.sign(xx)*(.12+.042*Math.abs(xx)),.027,Math.sign(zz)*(.089+.042*Math.abs(zz))]);}
  curve(tray,'Master island raised continuous tray lip',lipPath,.006,oak);
  const watch=group('Master island watch and stitched strap',tray);watch.position.set(-.076,.023,.004);watch.rotation.y=.16;
  roundedBox(watch,'Master island flat leather watch strap',.023,.005,.174,.008,clay,[0,0,0]);
  cylinder(watch,'Master island round watch bezel',.026,.009,champagne,[0,.007,0]);
  cylinder(watch,'Master island inset watch dial',.021,.003,ivory,[0,.013,0]);
  box(watch,'Master island watch hour hand',.0025,.002,.015,graphite,[0,.015,-.004],'decor');
  const minute=box(watch,'Master island watch minute hand',.002,.002,.021,graphite,[.004,.015,.003],'decor');minute.rotation.y=-.73;
  for(const z of [-.059,.059])box(watch,'Master island watch strap keeper',.026,.009,.008,champagne,[0,.001,z],'decor');
  const bracelet=mesh(tray,'Master island simple bracelet',new THREE.TorusGeometry(.033,.003,6,18),champagne);bracelet.rotation.x=Math.PI/2;bracelet.position.set(.046,.021,-.047);
  const earrings=group('Master island paired earrings',tray);earrings.position.set(.079,.023,.065);
  for(const x of [-.019,.019]){const hoop=mesh(earrings,'Master island jewellery hoop',new THREE.TorusGeometry(.010,.002,5,12),champagne);hoop.rotation.x=Math.PI/2;hoop.position.x=x;}
  // The folded scarf lives on the slim rear edge, leaving the sitting pad clear.
  for(let layer=0;layer<2;layer++)roundedBox(island,'Master island folded sand scarf layer',.255,.017,.094,.011,linen,[.211,.432+layer*.018,-.169]);
  for(let i=0;i<6;i++)rod(island,'Master island scarf soft fringe',[.084+i*.010,.442,-.189],[.062+i*.010,.440,-.205],.0018,linen);

  // Batch each fixed furnishing in its own coordinates, preserving ownership
  // so disposal still removes every detail after the apartment's optimizer.
  for(const [fixed,label] of [[rack,'Master valet'],[island,'Master island']]){
    fixed.updateWorldMatrix(true,true);const inverse=fixed.matrixWorld.clone().invert(),batches=new Map();
    fixed.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+'|'+o.userData.category+'|'+!!o.geometry.index;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});
    for(const parts of batches.values()){
      if(parts.length<2)continue;const copies=parts.map(o=>o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
      const combined=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(!combined)continue;
      const first=parts[0],batch=mesh(fixed,label+' grouped '+first.userData.category+' · '+first.material.name,combined,first.material,first.userData.category);batch.userData.sourceNames=parts.map(o=>o.name);parts.forEach(o=>o.removeFromParent());
    }
  }

  model.updateWorldMatrix(true,true);
  const bounds=object=>{const b=new THREE.Box3().setFromObject(object);return {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()};};
  const chairBounds=bounds(chair),rackBounds=bounds(rack),islandBounds=bounds(island),masterCurtain=renovation?.curtains?.find(c=>c.id==='curtain-master'),mirror=cabinetry?.mirrors?.[0]?.object;
  const rackBox=new THREE.Box3().setFromObject(rack),console=source.find(o=>raw(o)==='Master console'),bed=source.find(o=>raw(o)==='Master king bed frame');
  const planGap=(a,b)=>Math.hypot(Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x),Math.max(0,a.min.z-b.max.z,b.min.z-a.max.z));
  // Measure the real wardrobe panels/handles, including the mirror leaf, and
  // restore each saved pose after this one-off audit. No saved door state changes.
  const islandClearance={};
  for(const side of ['north','south']){
    const bank=cabinetry?.cabinets?.find(c=>c.id==='wardrobe-master-'+side);if(!bank)continue;
    const closed=new THREE.Box3().setFromObject(bank.body),sweep=new THREE.Box3();
    for(const door of bank.doors){
      const amount=door.amount;
      for(let step=0;step<=90;step++){door.apply(step/90);const b=new THREE.Box3().setFromObject(door.object);sweep.union(b);if(step===0)closed.union(b);}
      door.apply(amount);
    }
    islandClearance[side+'ClosedWardrobeClearanceM']=side==='north'?islandBounds.min[2]-closed.max.z:closed.min.z-islandBounds.max[2];
    islandClearance[side+'FullDoorSweepClearanceM']=side==='north'?islandBounds.min[2]-sweep.max.z:sweep.min.z-islandBounds.max[2];
  }
  let meshCount=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  const audit={sourceGLBUnchanged:true,replacedStaticChairParts:originals.length,chair:{position:chair.position.toArray(),rotationY:chair.rotation.y,bounds:chairBounds,seatHeightM:.474,style:'Open ivory egg shell, sage cushion, warm edge, focused reading light'},valet:{position:rack.position.toArray(),bounds:rackBounds,baseFootprintM:[.46,.28],placement:'Inside the master bedroom, viewer-right of the north-wall console, facing into the room',consoleClearanceM:console?planGap(rackBox,new THREE.Box3().setFromObject(console)):null,bedFootClearanceM:bed?new THREE.Box3().setFromObject(bed).min.z-rackBox.max.z:null,contents:['linen overshirt','scarf','brimmed hat','shoulder bag','tray','perfume','storage basket']},dressingIsland:{position:island.position.toArray(),bounds:islandBounds,footprintM:[.96,.46],seatHeightM:.48,placement:'Low rounded centre perch; clear east bath route and west bedroom route',contents:['upholstered sitting pad','accessory drawers','leather-lined tray','watch','bracelet','paired earrings','folded scarf'],...islandClearance},curtainClearanceM:masterCurtain?chairBounds.min[0]-new THREE.Box3().setFromObject(masterCurtain.object).max.x:null,mirrorClearanceM:mirror?planGap(rackBox,new THREE.Box3().setFromObject(mirror)):null,meshCount,triangles,collision:{solid:'furniture',accessories:'decor',installBeforeCollision:true},savedSetting:'settings.bedroomReadingLight'};
  return {root,chair,rack,island,readingLight,record,audit,getStatus:()=>({readingLight:lightOn,effectiveReadingLight:lightOn&&houseLightsOn,houseLightsOn}),update,dispose(){if(disposed)return;disposed=true;record.disabled=true;readingLight.intensity=0;root.removeFromParent();for(const {object,parent} of originals)parent?.add(object);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
