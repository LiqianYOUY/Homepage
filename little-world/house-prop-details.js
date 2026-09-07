import {optimizeScene} from './optimize-scene.js';

/** Refine fixed household props after bathroom/cabinetry/terrace setup.
 * Capture walking/robot bounds before finalize(); planted flowers and their state are untouched.
 */
export function setupHousePropDetails({THREE,model}={}){
  if(!THREE||!model?.isObject3D)throw new TypeError('House prop details need THREE and the apartment model.');
  const root=new THREE.Group();root.name='House · crafted tableware and living greenery';model.add(root);
  const originals=[],geometries=new Set(),materials=new Set(),vessels=[],plants=[],source=[];let disposed=false,finalized=false;
  const raw=o=>o.userData?.name||o.name||'';model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  const find=name=>source.find(o=>o.parent&&raw(o)===name),all=name=>source.filter(o=>o.parent&&raw(o)===name),boxOf=o=>new THREE.Box3().setFromObject(o);
  const remove=o=>{if(o?.parent){originals.push({object:o,parent:o.parent});o.removeFromParent();}};
  function material(name,color,roughness=.55,metalness=0){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name='House props '+name;materials.add(m);return m;}
  const cream=material('warm glazed porcelain',0xf0e9d7,.24),sage=material('celadon glaze',0x97ad9d,.29),steel=material('brushed stainless steel',0xb3b8b2,.27,.78),dark=material('charcoal enamel',0x414843,.37,.22),black=material('non-stick cooking surface',0x262d29,.58),wood=material('oiled beech handles',0xb39164,.61),soil=material('visible dark potting soil',0x514338,1),clay=material('warm stoneware planter',0xc5b6a0,.9),tea=material('amber tea',0x735035,.19),linen=material('woven sage napkin',0xaab8a2,1),stemMat=material('woody stems',0x797350,.91),veinMat=material('leaf midrib',0x748961,.85),leafMats=[0x678465,0x7c9772,0x567653].map((c,i)=>material('sculpted leaf '+i,c,.84));
  function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  function mesh(parent,name,geometry,mat,category='decor'){geometries.add(geometry);const o=new THREE.Mesh(geometry,mat);o.name=name;o.userData={name,category};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(parent,name,w,h,d,mat,at=[0,0,0]){const o=mesh(parent,name,new THREE.BoxGeometry(w,h,d),mat);o.position.set(...at);return o;}
  function cylinder(parent,name,r,h,mat,at=[0,0,0],segments=20){const o=mesh(parent,name,new THREE.CylinderGeometry(r,r,h,segments),mat);o.position.set(...at);return o;}
  function lathe(parent,name,profile,mat,at=[0,0,0],segments=28,category='decor'){const o=mesh(parent,name,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),segments),mat,category);o.position.set(...at);return o;}
  function rod(parent,name,a,b,r,mat){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),v=end.clone().sub(start),o=cylinder(parent,name,r,v.length(),mat,start.add(end).multiplyScalar(.5).toArray(),8);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
  function tube(parent,name,points,r,mat,closed=false,segments=18){return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),segments,r,6,closed),mat);}
  function atWorld(name,point){const g=group(name);g.position.copy(root.worldToLocal(point.clone()));return g;}
  function vessel(parent,name,r,h,mat,{thickness=.004,category='decor',baseRadius=r*.76}={}){
    const t=thickness,floor=t*1.7;
    const shell=lathe(parent,name+' continuous hollow shell',[[0,0],[baseRadius,0],[baseRadius,.004],[r*.97,h*.80],[r,h-t],[r-.001,h],[r-t,h],[r-t*1.25,h-t],[baseRadius-t,floor],[0,floor]],mat,[0,0,0],28,category);
    vessels.push({name,object:shell,radius:r,rimY:h,floorY:floor,wallThickness:t});return shell;
  }
  function mug(parent,name,r=.043,h=.065,mat=cream){vessel(parent,name,r,h,mat);
    tube(parent,name+' open loop handle',[[r*.84,h*.81,0],[r+.025,h*.82,0],[r+.031,h*.47,0],[r+.018,h*.19,0],[r*.79,h*.20,0]],.0045,mat);
  }
  function shallowDish(parent,name,r,h,mat=cream){return lathe(parent,name,[[0,0],[r*.57,0],[r*.59,.004],[r*.80,.007],[r,h*.70],[r,h],[r*.93,h],[r*.73,.009],[0,.007]],mat);}

  // The original terrace cups were filled cylinders. Their replacements have
  // porcelain thickness, handles, visible liquid below the lip and real bases.
  const terraceCups=all('Terrace outdoor tea cup');all('Terrace tea surface').forEach(remove);
  for(const [i,old] of terraceCups.entries()){const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),g=atWorld('Terrace hollow tea cup '+(i+1),new THREE.Vector3(c.x,b.min.y,c.z));mug(g,'Terrace tea cup '+(i+1));cylinder(g,'Terrace recessed tea surface',.035,.0015,tea,[0,.051,0]);remove(old);}
  const terraceTable=model.getObjectByName('Terrace slatted teak dining table');
  if(terraceTable){const planks=[];terraceTable.traverse(o=>{if(o.isMesh&&raw(o).startsWith('Terrace teak tabletop plank'))planks.push(o);});if(planks.length){const top=Math.max(...planks.map(o=>boxOf(o).max.y)),p=terraceTable.localToWorld(new THREE.Vector3(-.22,0,.02)),g=atWorld('Terrace ceramic tea pot',new THREE.Vector3(p.x,top,p.z));
      cylinder(g,'Teapot cork coaster',.093,.006,wood,[0,.003,0]);
      const shell=lathe(g,'Teapot hollow rounded body',[[0,.006],[.048,.006],[.068,.020],[.076,.061],[.068,.103],[.043,.126],[.037,.126],[.059,.101],[.067,.061],[.059,.025],[.044,.014],[0,.014]],sage);
      vessels.push({name:'Teapot',object:shell,radius:.043,rimY:.126,floorY:.014,wallThickness:.006});
      tube(g,'Teapot arch handle',[[-.059,.030,0],[-.110,.037,0],[-.121,.079,0],[-.107,.115,0],[-.056,.107,0]],.007,sage);
      const spout=group('Teapot genuinely open spout',g);spout.position.set(.057,.059,0);spout.rotation.z=-.90;
      lathe(spout,'Teapot inner and outer spout wall',[[.024,0],[.022,.026],[.014,.081],[.010,.083],[.009,.078],[.017,.021],[.019,0],[.024,0]],sage);
      lathe(g,'Teapot fitted lid',[[0,.129],[.039,.129],[.045,.132],[.039,.139],[0,.146]],sage);cylinder(g,'Teapot lid knob',.010,.014,wood,[0,.149,0]);
  }}

  // Replace all upper-cupboard mug parts in one pass, preserving the original
  // cabinet orientation and shelf height. Sliding and hinged fronts are separate.
  const oldMugs=source.filter(o=>o.parent&&raw(o).endsWith('stored cup cup wall'));
  for(const [i,old] of oldMugs.entries()){const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),g=atWorld('Upper cupboard porcelain mug '+(i+1),new THREE.Vector3(c.x,b.min.y,c.z));g.quaternion.copy(old.getWorldQuaternion(new THREE.Quaternion()));mug(g,'Upper cupboard mug '+(i+1),.035,.081);}
  source.filter(o=>o.parent&&/stored cup cup (?:wall|bottom|handle)$/.test(raw(o))).forEach(remove);

  // Three simple solid disks become recognisable shallow plates with foot rings,
  // folded napkins and cutlery. Everything remains supported by the dining top.
  // The interactive flower vase already occupies the dining table's corner.
  // Remove the old solid vase that otherwise passes through the middle plate.
  const diningFlowerVase=(model.parent||model).getObjectByName('Flower vase dining');
  if(diningFlowerVase)remove(find('Dining vase'));
  const settings=all('Dining place setting');
  for(const [i,old] of settings.entries()){const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),g=atWorld('Dining crafted place setting '+(i+1),new THREE.Vector3(c.x+(i===0&&diningFlowerVase ? .07 : 0),b.min.y,c.z));shallowDish(g,'Dining plate recessed centre',.135,.022);
    const napkin=box(g,'Dining folded linen napkin',.091,.005,.138,linen,[.015,.013,0]);napkin.rotation.y=-.13;
    for(const z of [-.036,.039])box(g,'Dining subtle napkin fold',.076,.001,.0018,sage,[.015,.016,z]);
    box(g,'Dining knife handle',.014,.010,.070,wood,[.176,.005,.056]);box(g,'Dining knife blade',.018,.002,.098,steel,[.178,.008,-.023]);
    box(g,'Dining fork handle',.012,.006,.115,steel,[-.175,.003,.030]);box(g,'Dining fork shoulder',.029,.003,.032,steel,[-.175,.005,-.043]);
    for(let k=0;k<4;k++)box(g,'Dining four separate fork tines',.003,.003,.034,steel,[-.187+k*.008,.005,-.074]);remove(old);
  }

  const potOld=find('Hob cooking pot hollow pot wall'),panOld=find('Hob shallow frying pan hollow pot wall');
  for(const [name,old,r,h] of [['Stockpot',potOld,.092,.12],['Frying pan',panOld,.105,.035]])if(old){const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),g=atWorld('Kitchen refined '+name,new THREE.Vector3(c.x,b.min.y,c.z));vessel(g,name,r,h,dark,{thickness:.0045,baseRadius:r*.89});
    cylinder(g,name+' inset non-stick cooking floor',r*.81,.0012,black,[0,.0085,0]);
    lathe(g,name+' rolled steel rim',[[r-.003,h-.004],[r+.001,h-.003],[r+.002,h],[r-.002,h+.001],[r-.003,h-.004]],steel);
    if(name==='Stockpot'){
      for(const side of [-1,1]){tube(g,'Stockpot open side loop handle',[[0,h*.75,side*r*.94],[.045,h*.78,side*(r+.019)],[.043,h*.78,side*(r+.051)],[-.043,h*.78,side*(r+.051)],[-.045,h*.78,side*(r+.019)],[0,h*.75,side*r*.94]],.0055,steel,true);}
      // A tipped lid leaves a visible opening at the front of the cooking pot.
      const lid=group('Stockpot tipped lid',g);lid.position.set(0,h+.014,-.027);lid.rotation.x=-.30;
      lathe(lid,'Stockpot lid rolled edge and dome',[[0,0],[r*.95,0],[r,.003],[r*.94,.009],[r*.68,.018],[0,.023]],dark);tube(lid,'Stockpot lid bridge handle',[[-.027,.022,0],[-.023,.048,0],[.023,.048,0],[.027,.022,0]],.0055,wood);
    }else{rod(g,'Pan steel handle attachment',[-r*.90,.022,0],[-r-.034,.035,0],.007,steel);const handle=box(g,'Pan long beech grip',.120,.022,.030,wood,[-r-.089,.037,0]);handle.rotation.z=-.06;for(const x of [-r-.045,-r-.115])cylinder(g,'Pan handle rivet',.0032,.0015,steel,[x,.049,0],8);}
  }
  source.filter(o=>o.parent&&/^(?:Hob cooking pot |Hob shallow frying pan |Frying pan insulated long handle$)/.test(raw(o))).forEach(remove);
  for(const [i,old] of all('Countertop nested serving bowl').entries()){const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),g=atWorld('Countertop glazed serving bowl '+(i+1),new THREE.Vector3(c.x,b.min.y,c.z));vessel(g,'Serving bowl '+(i+1),.083,.076,i===1?sage:cream,{thickness:.003,baseRadius:.043});lathe(g,'Serving bowl slender foot ring',[[.041,0],[.044,.002],[.044,.008],[.041,.009],[.041,0]],cream);remove(old);}

  const oldCrock=find('Utensil crock hollow sides');
  if(oldCrock){const b=boxOf(oldCrock),c=b.getCenter(new THREE.Vector3()),g=atWorld('Kitchen useful cooking utensils',new THREE.Vector3(c.x,b.min.y,c.z));vessel(g,'Utensil crock',.052,.13,cream,{thickness:.0045,baseRadius:.045});
    for(let i=0;i<3;i++)lathe(g,'Utensil crock ceramic groove',[[.048,.020+i*.014],[.050,.021+i*.014],[.050,.024+i*.014],[.048,.025+i*.014]],sage);
    const spatula=group('Kitchen slotted wooden spatula',g);spatula.position.set(-.027,.011,0);spatula.rotation.z=.11;
    rod(spatula,'Spatula continuous handle',[0,0,0],[0,.230,0],.006,wood);
    const shape=new THREE.Shape();shape.moveTo(-.027,.222);shape.lineTo(-.031,.282);shape.quadraticCurveTo(0,.295,.031,.282);shape.lineTo(.027,.222);shape.closePath();
    for(const x of [-.016,0,.016]){const hole=new THREE.Path();hole.moveTo(x-.003,.238);hole.lineTo(x-.003,.275);hole.lineTo(x+.003,.275);hole.lineTo(x+.003,.238);hole.closePath();shape.holes.push(hole);}
    const head=mesh(spatula,'Spatula head with three real slots',new THREE.ExtrudeGeometry(shape,{depth:.005,bevelEnabled:true,bevelThickness:.0007,bevelSize:.0007,bevelSegments:1,curveSegments:5}),wood);head.position.z=-.0025;
    const ladle=group('Kitchen deep serving ladle',g);ladle.position.set(.022,.011,-.020);ladle.rotation.z=-.12;
    rod(ladle,'Ladle steel handle',[0,0,0],[0,.211,0],.0045,steel);const scoop=group('Ladle open scoop',ladle);scoop.position.set(0,.231,0);scoop.rotation.x=.8;vessel(scoop,'Ladle bowl',.027,.033,steel,{thickness:.002,baseRadius:.011});
    const whisk=group('Kitchen wire balloon whisk',g);whisk.position.set(.017,.011,.019);whisk.rotation.x=.10;rod(whisk,'Whisk beech grip',[0,0,0],[0,.137,0],.0065,wood);rod(whisk,'Whisk neck',[0,.137,0],[0,.169,0],.0045,steel);
    for(let i=0;i<3;i++){const a=i*Math.PI/3,points=[[0,.16,0],[-.023*Math.cos(a),.196,-.023*Math.sin(a)],[-.016*Math.cos(a),.253,-.016*Math.sin(a)],[0,.270,0],[.016*Math.cos(a),.253,.016*Math.sin(a)],[.023*Math.cos(a),.196,.023*Math.sin(a)],[0,.16,0]];tube(whisk,'Whisk open wire loop '+i,points,.0015,steel,false,22);}
    const tongs=group('Kitchen silicone tipped tongs',g);tongs.position.set(-.010,.011,.024);tongs.rotation.x=-.10;
    tube(tongs,'Tongs connected spring arms',[[-.010,.242,0],[-.008,.015,0],[0,.002,0],[.008,.015,0],[.010,.242,0]],.0035,steel);
    for(const x of [-.011,.011])box(tongs,'Tongs scalloped silicone tips',.011,.032,.019,sage,[x,.235,0]);
    source.filter(o=>o.parent&&(raw(o).startsWith('Utensil crock ')||raw(o).startsWith('Wooden utensil ')||raw(o)==='Wooden cooking spatula'||raw(o)==='Wooden serving spoon')).forEach(remove);
  }

  // Closed, curved leaf surfaces with a raised midrib replace ellipsoids. Each
  // canopy fits inside its predecessor's world bounds; pots keep their
  // original centre, height and footprint, including the relocated ensuite plant.
  function leafGeometry(){const positions=[],indices=[],n=10;
    for(const side of [1,-1])for(let j=0;j<=n;j++){const t=j/n,x=(t-.5)*2,width=Math.sin(Math.PI*t)*.80;for(const across of [-1,0,1])positions.push(x,side*.012+Math.sin(Math.PI*t)*(.17-Math.abs(across)*.19)+.10*t*t,across*width);}
    const layer=(n+1)*3;
    for(let side=0;side<2;side++)for(let j=0;j<n;j++)for(let k=0;k<2;k++){const a=side*layer+j*3+k,b=a+3;if(side===0)indices.push(a,a+1,b,b,a+1,b+1);else indices.push(a,b,a+1,b,b+1,a+1);}
    for(let j=0;j<n;j++)for(const k of [0,2]){const a=j*3+k,b=a+3;indices.push(a,a+layer,b,b,a+layer,b+layer);}
    for(const j of [0,n])for(let k=0;k<2;k++){const a=j*3+k;indices.push(a,a+1,a+layer,a+layer,a+1,a+layer+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();geo.computeBoundingBox();return geo;
  }
  const leafGeo=leafGeometry();geometries.add(leafGeo);
  const prefixes=['Living olive plant','Bedroom2 plant','Ensuite corner plant','Wintergarden tall planting','Wintergarden south planting'];
  for(const prefix of prefixes){const oldPot=find(prefix+' pot');if(!oldPot)continue;const pieces=source.filter(o=>o.parent&&raw(o).startsWith(prefix+' ')),pb=boxOf(oldPot),centre=pb.getCenter(new THREE.Vector3()),g=atWorld(prefix+' · detailed greenery',new THREE.Vector3(centre.x,pb.min.y,centre.z));const previous=new THREE.Box3();pieces.forEach(o=>previous.union(boxOf(o)));
    const radius=(pb.max.x-pb.min.x)/2,height=pb.max.y-pb.min.y;vessel(g,prefix+' planter',radius,height,clay,{thickness:.014,category:'furniture',baseRadius:radius*.77});cylinder(g,prefix+' recessed visible soil',radius-.022,.012,soil,[0,height-.031,0],28);
    lathe(g,prefix+' planter foot',[[radius*.72,0],[radius*.75,0],[radius*.75,.010],[radius*.72,.012],[radius*.72,0]],clay,[0,0,0],24,'furniture');
    const trunk=find(prefix+' trunk'),tb=trunk?boxOf(trunk):null,top=tb?.max.y??previous.max.y;
    const trunkHeight=top-pb.min.y;rod(g,prefix+' continuous woody trunk',[0,height-.024,0],[.014,trunkHeight,0],.012,stemMat);
    const leafOld=pieces.filter(o=>/ leaf \d+$/.test(raw(o)));
    for(const [i,old] of leafOld.entries()){const oldBounds=boxOf(old),worldCenter=oldBounds.getCenter(new THREE.Vector3());
      // Pull the balcony corner canopy inward: its former broad leaves crossed
      // the neighbouring beanbag and the TV timber screen. The pot stays put.
      const corner=prefix==='Wintergarden south planting';if(corner){worldCenter.x=centre.x+(worldCenter.x-centre.x)*.68;worldCenter.z=centre.z+(worldCenter.z-centre.z)*.68;}
      const localCenter=g.worldToLocal(worldCenter.clone()),size=oldBounds.getSize(new THREE.Vector3()),leaf=mesh(g,prefix+' pointed sculpted leaf '+i,leafGeo,leafMats[i%3]);
      // Rotation follows the original leaf, with scale fitted to its measured
      // bounds and an additional trim for the balcony corner's tighter pocket.
      leaf.quaternion.copy(old.getWorldQuaternion(new THREE.Quaternion()));leaf.scale.set(.23,.06,.11);leaf.position.copy(localCenter);g.updateWorldMatrix(true,true);
      const initial=boxOf(leaf).getSize(new THREE.Vector3()),factor=Math.min(size.x*.82/initial.x,size.y*.76/initial.y,size.z*.82/initial.z);leaf.scale.multiplyScalar(factor*(corner?.70:1));
      const leafCenter=boxOf(leaf).getCenter(new THREE.Vector3());leaf.position.add(g.worldToLocal(worldCenter.clone()).sub(g.worldToLocal(leafCenter)));
      const end=localCenter.clone().multiply(new THREE.Vector3(.48,1,.48));rod(g,prefix+' connected leaf stalk '+i,[.006,localCenter.y-.020,0],end.toArray(),.004,stemMat);rod(g,prefix+' leaf petiole '+i,end.toArray(),localCenter.toArray(),.0032,stemMat);
      // A thin vein follows the actual centre ridge instead of floating on top.
      const vein=mesh(leaf,prefix+' raised leaf midrib '+i,new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.88,.018,0),new THREE.Vector3(0,.205,0),new THREE.Vector3(.87,.15,0)]),10,.012,4,false),veinMat);vein.castShadow=false;leaf.updateWorldMatrix(true,true);g.attach(vein);
    }
    pieces.forEach(remove);g.updateWorldMatrix(true,true);plants.push({name:prefix,object:g,originalBounds:previous,potCentre:[centre.x,pb.min.y,centre.z],potRadius:radius,leafCount:leafOld.length});
  }
  model.updateWorldMatrix(true,true);
  function counts(){let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});return {meshes,triangles};}
  const audit={sourceGLBUnchanged:true,removedNames:originals.map(x=>raw(x.object)),removedMeshes:originals.length,teaCups:terraceCups.length,cupboardMugs:oldMugs.length,diningSettings:settings.length,cookingTools:['slotted spatula','deep ladle','wire balloon whisk','silicone tongs'],staticPlants:plants.map(p=>({name:p.name,potCentre:p.potCentre,leafCount:p.leafCount})),dynamicPlantLifecycleUnchanged:true,hollowVessels:vessels.length,beforeBatch:counts(),afterBatch:null};
  function finalize(){if(disposed||finalized)return audit.afterBatch;finalized=true;const stats=optimizeScene({THREE,model:root});root.traverse(o=>{if(o.isMesh){o.userData.noMerge=true;geometries.add(o.geometry);}});audit.afterBatch={...counts(),failedGroups:stats.failedGroups};return audit.afterBatch;}
  function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const {object,parent}of originals)parent.add(object);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  return {root,vessels,plants,audit,finalize,dispose};
}
