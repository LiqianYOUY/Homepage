import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Small outdoor details use the same drawing-to-world transform as terrace-v7.
// The tent fits between the north flower boxes and the clear facade walkway.
export function setupTerraceLife({THREE,model,terrace}){
  if(!THREE||!model?.isObject3D||!terrace?.root)throw new TypeError('setupTerraceLife needs THREE, model and the installed terrace.');
  const S=.022381665533985514,P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
  const root=new THREE.Group();root.name='Terrace tent and three butterflies';model.add(root);
  const geometries=new Set(),materials=new Set(),butterflies=[];
  const material=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.93,...extra});m.name=name;materials.add(m);return m;};
  const canvas=material('Tent golden sand woven canvas',0xcaa06a,{side:THREE.DoubleSide});
  const inner=material('Tent cream inner lining',0xe8d6b5,{side:THREE.DoubleSide});
  const trim=material('Tent dark olive bindings',0x57594a),poles=material('Tent champagne aluminium poles',0xa7a496,{metalness:.6,roughness:.38});
  const mattressMat=material('Tent sage sleeping mat',0x919f84),linen=material('Tent cream pillow and blanket',0xf2e5c9),stripe=material('Tent terracotta blanket stripes',0xb77d5c);
  const bodyMat=material('Butterfly warm brown body and wing edges',0x4f382c),spotMat=material('Butterfly pale wing spots',0xffedbe);
  function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  function mesh(parent,name,geometry,mat){geometries.add(geometry);const m=new THREE.Mesh(geometry,mat);m.name=name;m.userData.category='decoration';m.userData.noMerge=true;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const box=(p,n,w,h,d,m)=>mesh(p,n,new THREE.BoxGeometry(w,h,d),m);
  const ellipsoid=(p,n,x,y,z,m)=>{const o=mesh(p,n,new THREE.SphereGeometry(1,16,10),m);o.scale.set(x,y,z);return o;};
  function tube(parent,name,points,radius,mat){return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*3),radius,6,false),mat);}
  function surface(parent,name,verts,indices,mat){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));geometry.setIndex(indices);geometry.computeVertexNormals();return mesh(parent,name,geometry,mat);}
  // Keep each static assembly inexpensive without letting the app's global
  // optimizer detach any animated wing from its hinge.
  function batch(parent,label){
    parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),groups=new Map(),sources=[];
    parent.traverse(o=>{if(!o.isMesh)return;sources.push(o);let g=o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);});
    for(const o of sources){o.removeFromParent();geometries.delete(o.geometry);o.geometry.dispose();}
    for(const [mat,parts]of groups){const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());mesh(parent,label+' · '+mat.name,merged,mat);}
  }

  const tent=group('Terrace open canvas camping tent');tent.position.copy(P(948,235,.029));tent.rotation.y=-Math.PI/2;
  // Local +z is the open entrance. Turning west keeps the whole entrance away
  // from either sliding door and makes the interior visible from the terrace view.
  const halfWidth=.645,halfLength=1.02,height=1.20;
  const base=box(tent,'Tent sewn waterproof groundsheet',1.32,.025,2.08,trim);base.position.y=.016;
  for(const side of[-1,1]){
    const x=side*halfWidth;
    surface(tent,'Tent draped canvas roof '+side,[[0,height,-halfLength],[0,height,halfLength],[x,.08,-halfLength],[x,.08,halfLength],[x*.53,.61,-halfLength],[x*.53,.61,halfLength]],[0,4,1,1,4,5,4,2,5,5,2,3],canvas);
    tube(tent,'Tent reinforced eave seam '+side,[[x,.082,-halfLength],[x,.075,0],[x,.082,halfLength]],.014,trim);
    for(const z of[-halfLength,halfLength])tube(tent,'Tent A frame sloping pole',[[x,.052,z],[x*.5,.64,z],[0,height+.018,z]],.013,poles);
    // A loosely tied triangular door panel leaves a large, unobstructed opening.
    surface(tent,'Tent entrance tied canvas flap '+side,[[side*.018,1.15,halfLength+.01],[side*.565,.36,halfLength+.038],[x,.065,halfLength+.025],[side*.40,.24,halfLength+.045]],[0,1,3,1,2,3],inner);
    tube(tent,'Tent entrance flap rolled edge '+side,[[side*.024,1.145,halfLength+.015],[side*.27,.74,halfLength+.03],[side*.565,.36,halfLength+.045]],.017,inner);
    tube(tent,'Tent flap tie '+side,[[side*.48,.43,halfLength+.05],[side*.60,.38,halfLength+.055],[side*.50,.34,halfLength+.05]],.009,trim);
    for(const z of[-.91,.91]){
      const foot=box(tent,'Tent corner webbing strap',.11,.012,.05,trim);foot.position.set(side*.637,.045,z);
      const buckle=mesh(tent,'Tent corner tension buckle',new THREE.TorusGeometry(.019,.004,5,10),poles);buckle.rotation.x=Math.PI/2;buckle.position.set(side*.675,.050,z);
    }
  }
  surface(tent,'Tent closed rear lining',[[-halfWidth,.06,-halfLength+.009],[halfWidth,.06,-halfLength+.009],[0,height-.006,-halfLength+.009]],[0,1,2],inner);
  // Mesh vent, trimmed in a small triangle at the closed end.
  surface(tent,'Tent rear triangular ventilation panel',[[-.17,.76,-halfLength-.005],[.17,.76,-halfLength-.005],[0,1.055,-halfLength-.005]],[0,1,2],trim);
  tube(tent,'Tent continuous ridge seam',[[0,height+.013,-halfLength-.025],[0,height+.02,0],[0,height+.013,halfLength+.025]],.014,trim);
  const mat=box(tent,'Tent visible sage sleeping pad',1.13,.062,1.83,mattressMat);mat.position.set(0,.062,-.006);
  const pad=ellipsoid(tent,'Tent soft sleeping pad rounded top',.563,.028,.907,mattressMat);pad.position.set(0,.094,-.006);
  for(const x of[-.24,.24]){const pillow=ellipsoid(tent,'Tent plump linen pillow',.20,.07,.145,linen);pillow.position.set(x,.155,-.67);pillow.rotation.y=x>0?.06:-.08;}
  const blanket=box(tent,'Tent folded camp blanket',.98,.055,.56,linen);blanket.position.set(0,.135,.53);
  for(const z of[.37,.40,.65,.68]){const band=box(tent,'Tent woven blanket stripe',.985,.008,.012,stripe);band.position.set(0,.167,z);}
  for(let i=0;i<14;i++){const tassel=box(tent,'Tent blanket fringe',.013,.011,.065,linen);tassel.position.set(-.45+i*.069,.124,.835);}
  batch(tent,'Terrace camping tent');
  // One invisible footprint is intentional: the low roof is too small to walk
  // inside at standing height. It also avoids the triangular shell's AABB seams.
  const collider=group('Terrace tent solid footprint');collider.position.copy(tent.position);collider.rotation.copy(tent.rotation);
  const collisionMat=material('Tent invisible collision material',0x000000);collisionMat.visible=false;
  const colliderMesh=box(collider,'Terrace tent walk blocker',1.32,1.20,2.10,collisionMat);colliderMesh.position.y=.61;colliderMesh.userData.category='furniture';collider.visible=false;
  const colliderRoots=[collider];

  const wingOutline=new THREE.Shape();wingOutline.moveTo(0,.034);wingOutline.bezierCurveTo(.029,.091,.124,.153,.147,.111);wingOutline.bezierCurveTo(.174,.054,.123,.006,.080,-.009);wingOutline.bezierCurveTo(.144,-.024,.139,-.080,.093,-.104);wingOutline.bezierCurveTo(.051,-.12,.017,-.061,0,-.034);wingOutline.closePath();
  const flightSettings=[
    {bed:1,name:'Amber monarch butterfly',color:0xe8a347,rx:.54,rz:.21,height:1.35,phase:.20,speed:.27},
    {bed:3,name:'Cream gold butterfly',color:0xe9cb74,rx:.59,rz:.23,height:1.60,phase:2.3,speed:.22},
    {bed:7,name:'Coral painted lady butterfly',color:0xd99076,rx:.46,rz:.20,height:1.39,phase:4.35,speed:.25}
  ];
  for(const [index,config]of flightSettings.entries()){
    const insect=group(config.name);insect.userData.butterfly=true;
    const wingMat=material(config.name+' wing pigment',config.color,{side:THREE.DoubleSide});
    const wingEdge=material(config.name+' soft brown wing margin',0x604331,{side:THREE.DoubleSide});
    const pivots=[];
    for(const side of[-1,1]){
      const pivot=group(config.name+(side<0?' left wing hinge':' right wing hinge'),insect);pivot.scale.x=side;pivots.push(pivot);
      const edge=mesh(pivot,'Butterfly scalloped wing outline',new THREE.ShapeGeometry(wingOutline,12),wingEdge);edge.rotation.x=Math.PI/2;
      const pigment=mesh(pivot,'Butterfly translucent warm wing field',new THREE.ShapeGeometry(wingOutline,12),wingMat);pigment.scale.set(.89,.89,1);pigment.rotation.x=Math.PI/2;pigment.position.set(.005,.0012,0);
      for(const [x,z,r]of[[.125,.082,.009],[.116,.048,.007],[.11,-.054,.007],[.082,-.085,.006]]){
        const spot=mesh(pivot,'Butterfly ivory marginal wing spot',new THREE.CircleGeometry(r,10),spotMat);spot.rotation.x=-Math.PI/2;spot.position.set(x,.0025,z);
      }
      for(const[x,z]of[[.13,.104],[.115,.044],[.11,-.057]])tube(pivot,'Butterfly fine wing vein',[[.004,.003,.006],[x*.5,.003,z*.7],[x,.003,z]],.0015,bodyMat);
      batch(pivot,config.name+' articulated wing');
    }
    const body=group(config.name+' body',insect);
    ellipsoid(body,'Butterfly narrow abdomen',.009,.009,.047,bodyMat).position.z=-.023;
    ellipsoid(body,'Butterfly thorax',.013,.012,.020,bodyMat).position.z=.013;
    ellipsoid(body,'Butterfly head',.011,.010,.011,bodyMat).position.z=.039;
    for(const side of[-1,1])tube(body,'Butterfly curved antenna',[[side*.005,0,.044],[side*.012,.013,.070],[side*.023,.014,.078]],.0018,bodyMat);
    batch(body,config.name+' body');
    // Each loop remains over flower boxes, north of the tent and far from glass.
    const bed=terrace.beds[config.bed]?.object;
    const center=bed?bed.position.clone():P(615+config.bed*74,190);
    const path=new THREE.CatmullRomCurve3(Array.from({length:12},(_,i)=>{
      const a=i/12*Math.PI*2;
      return new THREE.Vector3(center.x+config.rx*Math.cos(a),config.height+.14*Math.sin(a*2+config.phase),center.z+config.rz*Math.sin(a));
    }),true,'centripetal');
    butterflies.push({object:insect,pivots,path,config,index});
  }
  const tangent=new THREE.Vector3();let disposed=false,flightTime=0,lastElapsed=null;
  function update(dt,elapsed,reducedMotion=false){
    if(disposed)return;
    // Freeze at the current pose under reduced motion. Initial placement still
    // uses three distinct positions so enabling it before loading stays legible.
    if(lastElapsed!==null&&!reducedMotion)flightTime+=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.10));
    lastElapsed=elapsed;
    for(const b of butterflies){
      const t=(flightTime*b.config.speed/Math.PI/2+b.config.phase/Math.PI/2)%1;
      b.path.getPoint(t,b.object.position);b.path.getTangent(t,tangent);
      b.object.rotation.set(.08*Math.sin(flightTime*.9+b.config.phase),Math.atan2(tangent.x,tangent.z),.12*Math.sin(flightTime*1.2+b.config.phase));
      const flap=.27+.67*(.5+.5*Math.sin(flightTime*(14.5+b.index)+b.config.phase));
      b.pivots[0].rotation.z=-flap;b.pivots[1].rotation.z=flap;
    }
  }
  update(0,0,false);root.updateWorldMatrix(true,true);
  const tentBounds=new THREE.Box3().setFromObject(tent),facadeZ=P(0,303).z,planterFront=P(0,190).z+.26;
  let meshCount=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  const audit={tentCount:1,butterflyCount:butterflies.length,tentPlanCenter:[948,235],tentEntrance:'west',tentFootprintM:[2.10,1.32],tentHeightM:1.23,facadeWalkwayClearanceM:facadeZ-tentBounds.max.z,planterClearanceM:tentBounds.min.z-planterFront,slidingDoorsKeptClear:['terrace-living','terrace-study'],butterflyBedIndices:flightSettings.map(b=>b.bed),motion:'Three closed flower-box loops with articulated wings; frozen by reduced motion',meshCount,triangles};
  return {root,tent,butterflies,colliderRoots,audit,update,dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}};
}
