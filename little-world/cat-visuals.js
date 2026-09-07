/** A plush orange-and-white kitten, sculpted in meshes with original coat textures. */
export function buildCatVisuals({THREE,root,geometries,materials,textures}) {
  const palette={cream:new THREE.Color('#fff7e9'),ginger:new THREE.Color('#cf8b47'),stripe:new THREE.Color('#ae7139')};
  const remember=g=>(geometries.add(g),g),rememberMaterial=m=>(materials.add(m),m);
  const furData=new Uint8Array(256*256*4);let seed=17031;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const noise=Array.from({length:256*256},random);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const n=noise[y*256+x]*.38+noise[((y+1)%256)*256+x]*.24+noise[((y+2)%256)*256+x]*.18+noise[((y+4)%256)*256+x]*.2;
    const v=Math.round(83+n*102),i=(y*256+x)*4;furData[i]=furData[i+1]=furData[i+2]=v;furData[i+3]=255;
  }
  const furTexture=new THREE.DataTexture(furData,256,256,THREE.RGBAFormat);furTexture.name='Original fine directional cat undercoat';furTexture.wrapS=furTexture.wrapT=THREE.RepeatWrapping;furTexture.repeat.set(3,2);furTexture.minFilter=THREE.LinearMipmapLinearFilter;furTexture.magFilter=THREE.LinearFilter;furTexture.generateMipmaps=true;furTexture.needsUpdate=true;textures.add(furTexture);
  const fur=rememberMaterial(new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.86,metalness:0,sheen:.65,sheenColor:new THREE.Color('#fff0d9'),sheenRoughness:.88,bumpMap:furTexture,bumpScale:.0011}));fur.name='Soft peach ginger and milky white plush coat';
  const solid=(color,roughness=.8)=>rememberMaterial(new THREE.MeshStandardMaterial({color,roughness}));
  const cream=solid('#fff8ec'),pink=solid('#edb8b2'),noseMat=solid('#d98f96',.43),dark=solid('#3c2d27',.5),mouthMat=solid('#74414b',.84),whiskerMat=solid('#f0ddc4');
  const irisMat=rememberMaterial(new THREE.MeshPhysicalMaterial({color:'#91673e',roughness:.16,clearcoat:1,clearcoatRoughness:.10}));
  const highlight=rememberMaterial(new THREE.MeshBasicMaterial({color:'#fffdf7'}));
  const pupilMat=rememberMaterial(new THREE.MeshPhysicalMaterial({color:'#171a19',roughness:.09,clearcoat:1,clearcoatRoughness:.06}));
  const blushMat=rememberMaterial(new THREE.MeshStandardMaterial({color:'#edb3a4',roughness:1,transparent:true,opacity:.28,depthWrite:false}));
  const sphere=remember(new THREE.SphereGeometry(1,32,22));
  function mesh(name,geometry,material,parent,pos=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;o.userData.interactable='cat';parent.add(o);return o;}
  function group(name,parent,pos=[0,0,0]){const o=new THREE.Group();o.name=name;o.position.set(...pos);parent.add(o);return o;}
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  function coat(x,y,z,region){
    let amount=0,bands=0;
    if(region==='body'){
      const saddle=smooth(.285,.345,y)*(1-smooth(.025,.13,z));
      const rump=(1-smooth(-.18,-.11,z))*smooth(.235,.31,y);
      amount=Math.max(saddle,rump)*(.87+.13*Math.sin(z*17+x*8));
      bands=Math.pow(Math.max(0,Math.sin(z*72+x*22)),14)*smooth(.01,.09,Math.abs(x))*.22;
    }else if(region==='head'){
      const blaze=1-smooth(.016,.065,Math.abs(x)+.012*Math.sin(y*25));
      amount=smooth(-.022,.060,y)*(1-blaze*.98);
      bands=Math.pow(Math.max(0,Math.sin(x*115+y*20)),15)*smooth(.065,.115,y)*.11;
    }else if(region==='ear')amount=.65;
    else if(region==='tail'){amount=1-smooth(.22,.275,y);bands=Math.pow(Math.max(0,Math.cos(y*65)),12)*.20;}
    else if(region==='leg')amount=smooth(-.11,-.025,y)*.45;
    return palette.cream.clone().lerp(palette.ginger,clamp(amount)).lerp(palette.stripe,clamp(bands*amount));
  }
  function colorGeometry(g,region){const p=g.attributes.position,colors=[];for(let i=0;i<p.count;i++){const c=coat(p.getX(i),p.getY(i),p.getZ(i),region);colors.push(c.r,c.g,c.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;}
  function loft(profiles,longSegments,radialSegments,axis,region){
    const curve=new THREE.CatmullRomCurve3(profiles.map(p=>new THREE.Vector3(p[0],p[1],p[2])),false,'catmullrom',.35);
    const centers=new THREE.CatmullRomCurve3(profiles.map(p=>new THREE.Vector3(p[0],p[3],0)),false,'catmullrom',.35);
    const pos=[],uv=[],indices=[];
    for(let i=0;i<=longSegments;i++){const t=i/longSegments,p=curve.getPoint(t),center=centers.getPoint(t);for(let j=0;j<=radialSegments;j++){const a=j/radialSegments*Math.PI*2,rx=Math.max(0,p.y),ry=Math.max(0,p.z);if(axis==='z')pos.push(Math.cos(a)*rx,center.y+Math.sin(a)*ry,p.x);else pos.push(Math.cos(a)*rx,p.x,center.y+Math.sin(a)*ry);uv.push(j/radialSegments,t);}}
    for(let i=0;i<longSegments;i++)for(let j=0;j<radialSegments;j++){const a=i*(radialSegments+1)+j,b=a+radialSegments+1;indices.push(a,a+1,b,b,a+1,b+1);}
    const g=remember(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();colorGeometry(g,region);return g;
  }
  const torso=group('Mochi continuous torso',root);
  const bodyGeometry=loft([[-.285,0,0,.26],[-.26,.084,.104,.26],[-.19,.143,.139,.265],[-.10,.153,.145,.265],[0,.143,.141,.274],[.095,.129,.134,.286],[.165,.10,.11,.31],[.215,0,0,.328]],42,36,'z','body');
  bodyGeometry.translate(0,-.030,0);
  const body=mesh('smooth cotton-soft body',bodyGeometry,fur,torso);
  const legs=[];
  const legGeometry=loft([[.025,0,0,0],[.006,.044,.042,0],[-.052,.051,.048,.001],[-.12,.043,.041,.002],[-.174,.040,.042,.009],[-.205,.052,.060,.029],[-.228,.047,.054,.033],[-.247,0,0,.032]],26,22,'y','leg');
  legGeometry.scale(1,.78,1);
  for(const [i,x,z] of [[0,-.085,.15],[1,.085,.15],[2,-.09,-.195],[3,.09,-.195]]){const leg=group('Mochi '+(i<2?'front':'back')+' leg '+i,root,[x,.195,z]);mesh('continuous sock and soft paw '+i,legGeometry,fur,leg);legs.push(leg);}
  const head=group('Mochi expressive head',root,[0,.330,.205]);
  const headGeometry=remember(new THREE.SphereGeometry(1,48,34));
  const hp=headGeometry.attributes.position;
  for(let i=0;i<hp.count;i++){
    const nx=hp.getX(i),ny=hp.getY(i),nz=hp.getZ(i);let x=nx*.151,y=ny*.132,z=nz*.118;
    const lower=Math.exp(-Math.pow((y+.030)/.060,2))*smooth(.008,.065,z);
    x*=1+lower*.095;z+=lower*.008;
    if(y<-.078)z-=smooth(.078,.125,-y)*smooth(.010,.060,z)*.010;
    hp.setXYZ(i,x,y,z);
  }headGeometry.computeVertexNormals();colorGeometry(headGeometry,'head');
  const face=mesh('single sculpted soft face',headGeometry,fur,head);
  // Short tapered fibres form a delicate silhouette, in just two extra meshes.
  const fibreMaterial=rememberMaterial(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.FrontSide,roughness:1}));fibreMaterial.name='Fine short undercoat fibres';
  function fuzz(surface,count,region,parent){
    const g=surface.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,pos=[],colors=[],normals=[],indices=[];const v=new THREE.Vector3(),normal=new THREE.Vector3(),side=new THREE.Vector3();
    for(let k=0;k<count;k++){
      const i=Math.floor(random()*p.count);v.fromBufferAttribute(p,i);normal.fromBufferAttribute(n,i).normalize();
      if(region==='head'&&v.z>.050&&v.y<.058)continue;
      if(region==='body'&&v.y<.19)continue;
      side.set(normal.y,-normal.x,.18).cross(normal).normalize();const length=.0017+random()*.0030,width=.00025+random()*.00020;
      const c=coat(v.x,v.y,v.z,region).lerp(palette.cream,.17),j=pos.length/3;
      pos.push(v.x-side.x*width,v.y-side.y*width,v.z-side.z*width,v.x+side.x*width,v.y+side.y*width,v.z+side.z*width,v.x+normal.x*length,v.y+normal.y*length,v.z+normal.z*length);
      for(let q=0;q<3;q++){colors.push(c.r,c.g,c.b);normals.push(normal.x,normal.y,normal.z);}indices.push(j,j+1,j+2);
    }
    const fg=remember(new THREE.BufferGeometry());fg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));fg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));fg.setIndex(indices);fg.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));const m=mesh(region+' fine short fibres',fg,fibreMaterial,parent);m.castShadow=false;m.receiveShadow=false;return m;
  }
  const bodyFuzz=fuzz(body,1350,'body',torso),headFuzz=fuzz(face,1050,'head',head);
  function ear(name,x,tilt,orange){
    const g=group(name,head,[x,.080,-.015]);g.rotation.z=tilt;g.rotation.x=-.10;
    const shape=new THREE.Shape();shape.moveTo(-.041,0);shape.bezierCurveTo(-.046,.026,-.024,.065,-.009,.084);shape.bezierCurveTo(.002,.098,.012,.084,.020,.066);shape.bezierCurveTo(.039,.035,.045,.014,.040,0);shape.quadraticCurveTo(0,-.014,-.041,0);
    const geo=remember(new THREE.ExtrudeGeometry(shape,{depth:.016,bevelEnabled:true,bevelThickness:.009,bevelSize:.009,bevelSegments:3,steps:1,curveSegments:9}));geo.translate(0,0,-.012);geo.computeVertexNormals();colorGeometry(geo,orange?'ear':'white');mesh(name+' rounded coat',geo,fur,g);
    const inner=shape.clone();const innerGeo=remember(new THREE.ShapeGeometry(inner,12));const inside=mesh(name+' soft inner ear',innerGeo,pink,g,[0,.013,.015],[.62,.74,1]);inside.castShadow=false;return g;
  }
  const ears=[ear('left ear',-.105,.16,true),ear('right ear',.105,-.16,true)];
  // Eye lenses follow the sculpted face, with embedded edges and a soft convex centre.
  // This avoids separate round eyeballs protruding from the forehead in side views.
  function faceSurface(x,y){
    const cheek=Math.exp(-Math.pow((y+.030)/.060,2));
    const x0=x/(1+cheek*.095);
    const z=.118*Math.sqrt(Math.max(.002,1-(x0/.151)**2-(y/.132)**2));
    return z+cheek*smooth(.008,.065,z)*.008;
  }
  const eyeSurfaces=[],eyeHighlights=[];
  function eyeLens(parent,name,rx,ry,lift,bulge,material){
    const positions=[],surfaceOffsets=[],indices=[],rings=16,sides=48;
    for(let i=0;i<=rings;i++)for(let j=0;j<=sides;j++){
      const radius=i/rings,theta=j/sides*Math.PI*2,x=Math.cos(theta)*rx*radius,y=Math.sin(theta)*ry*radius;
      const offset=lift+bulge*(1-radius*radius);
      positions.push(x,y,faceSurface(parent.position.x+x,parent.position.y+y)+offset);surfaceOffsets.push(offset);
    }
    for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=remember(new THREE.BufferGeometry());geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    eyeSurfaces.push({parent,geometry,offsets:new Float32Array(surfaceOffsets)});
    const lens=mesh(name,geometry,material,parent);lens.castShadow=false;return lens;
  }
  const eyeGroups=[];
  for(const side of [-1,1]){
    const e=group('Mochi eye '+side,head,[side*.063,.018,0]);
    eyeLens(e,'round kitten eye rim',.0435,.047,.001,.005,dark);
    eyeLens(e,'warm amber iris ring',.0415,.045,.002,.006,irisMat);
    eyeLens(e,'wide round curious pupil',.0375,.0415,.003,.008,pupilMat);
    for(const [name,x,y,rx,ry] of [['main eye catchlight',-.011,.016,.0065,.008],['small eye catchlight',.011,-.015,.0027,.0027]]){
      const z=faceSurface(e.position.x+x,e.position.y+y)+.012;
      const glint=mesh(name,sphere,highlight,e,[x,y,z],[rx,ry,.0015]);glint.castShadow=false;
      eyeHighlights.push({parent:e,mesh:glint,x,y});
    }
    eyeGroups.push(e);
    mesh('soft rosy cheek '+side,sphere,blushMat,head,[side*.106,-.033,.092],[.025,.013,.006]).castShadow=false;
    mesh('milky plush muzzle '+side,sphere,cream,head,[side*.030,-.052,.114],[.039,.027,.021]);
  }
  let lastEyeOpen=1;
  function setEyeOpen(amount){
    const open=clamp(Number.isFinite(amount)?amount:1);
    eyeGroups.forEach(e=>{e.scale.y=open;});
    if(Math.abs(open-lastEyeOpen)<1e-6)return;
    lastEyeOpen=open;
    // Scaling Y moves the lids onto a different part of the curved face. Follow
    // that surface in Z so squints do not bury the iris or leave floating glints.
    for(const {parent,geometry,offsets} of eyeSurfaces){
      const positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++)positions.setZ(i,faceSurface(parent.position.x+positions.getX(i),parent.position.y+positions.getY(i)*open)+offsets[i]);
      positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    }
    for(const {parent,mesh,x,y} of eyeHighlights)mesh.position.z=faceSurface(parent.position.x+x,parent.position.y+y*open)+.012;
  }
  const noseShape=new THREE.Shape();noseShape.moveTo(-.013,.004);noseShape.quadraticCurveTo(-.007,.011,0,.005);noseShape.quadraticCurveTo(.007,.011,.013,.004);noseShape.quadraticCurveTo(.012,-.002,0,-.011);noseShape.quadraticCurveTo(-.012,-.002,-.013,.004);
  const noseGeo=remember(new THREE.ExtrudeGeometry(noseShape,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.0018,bevelSegments:3,steps:1,curveSegments:8}));
  mesh('tiny rose pink kitten nose',noseGeo,noseMat,head,[0,-.037,.137]);
  function curveMesh(name,points,radius,mat,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=remember(new THREE.TubeGeometry(curve,12,radius,5,false));return mesh(name,g,mat,parent);}
  const mouth=mesh('soft opening mouth cavity',sphere,mouthMat,head,[0,-.073,.124],[.026,.001,.013]);mouth.visible=false;
  const jaw=group('hinged lower jaw',head,[0,-.066,.065]);
  mesh('rounded lower muzzle and chin',sphere,cream,jaw,[0,-.014,.038],[.052,.024,.033]);
  curveMesh('upper lip center',[[0,-.047,.143],[0,-.059,.143]],.0012,noseMat,head);
  for(const side of [-1,1]){
    curveMesh('soft upper smile',[[0,-.059,.143],[side*.014,-.065,.142],[side*.026,-.058,.136]],.0012,noseMat,head);
    for(let j=0;j<2;j++)curveMesh('fine whisker '+side+' '+j,[[side*.070,-.043-j*.013,.112],[side*.13,-.035-j*.019,.121],[side*.186,-.028-j*.025,.106]],.0006,whiskerMat,head);
  }
  const tongue=mesh('little movable pink tongue',sphere,pink,jaw,[0,-.006,.072],[.013,.0045,.014]);tongue.visible=false;
  const tailBase=group('Mochi waving tail',root,[0,.257,-.248]);
  const tailSegments=40,tailSides=12,tailPositions=new Float32Array((tailSegments+1)*(tailSides+1)*3),tailNormals=new Float32Array(tailPositions.length),tailUV=[],tailColors=[],tailIndices=[];
  for(let i=0;i<=tailSegments;i++)for(let j=0;j<=tailSides;j++){tailUV.push(j/tailSides,i/tailSegments);const c=coat(0,i/tailSegments*.29,0,'tail');tailColors.push(c.r,c.g,c.b);if(i<tailSegments&&j<tailSides){const a=i*(tailSides+1)+j,b=a+tailSides+1;tailIndices.push(a,a+1,b,b,a+1,b+1);}}
  const tailGeo=remember(new THREE.BufferGeometry());tailGeo.setAttribute('position',new THREE.BufferAttribute(tailPositions,3).setUsage(THREE.DynamicDrawUsage));tailGeo.setAttribute('normal',new THREE.BufferAttribute(tailNormals,3).setUsage(THREE.DynamicDrawUsage));tailGeo.setAttribute('uv',new THREE.Float32BufferAttribute(tailUV,2));tailGeo.setAttribute('color',new THREE.Float32BufferAttribute(tailColors,3));tailGeo.setIndex(tailIndices);const tailMesh=mesh('continuous silky curled tail',tailGeo,fur,tailBase);tailMesh.frustumCulled=false;
  const center=new THREE.Vector3(),before=new THREE.Vector3(),after=new THREE.Vector3(),tangent=new THREE.Vector3(),right=new THREE.Vector3(),binormal=new THREE.Vector3();
  function tailPoint(t,time,reduced,out){return out.set((reduced?0:Math.sin(time*1.7+t*4))*.013*t,.29*t,.085*Math.sin(t*Math.PI*.95)*t);}
  function animateTail(time,reduced){for(let i=0;i<=tailSegments;i++){const t=i/tailSegments;tailPoint(t,time,reduced,center);tailPoint(Math.max(0,t-.005),time,reduced,before);tailPoint(Math.min(1,t+.005),time,reduced,after);tangent.copy(after).sub(before).normalize();right.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();binormal.crossVectors(tangent,right).normalize();const radius=.034*(1-.45*t)*Math.pow(Math.max(0,1-t*t*t*t),.45);for(let j=0;j<=tailSides;j++){const a=j/tailSides*Math.PI*2,nx=right.x*Math.cos(a)+binormal.x*Math.sin(a),ny=right.y*Math.cos(a)+binormal.y*Math.sin(a),nz=right.z*Math.cos(a)+binormal.z*Math.sin(a),k=(i*(tailSides+1)+j)*3;tailPositions[k]=center.x+nx*radius;tailPositions[k+1]=center.y+ny*radius;tailPositions[k+2]=center.z+nz*radius;tailNormals[k]=nx;tailNormals[k+1]=ny;tailNormals[k+2]=nz;}}tailGeo.attributes.position.needsUpdate=true;tailGeo.attributes.normal.needsUpdate=true;tailGeo.computeBoundingBox();tailGeo.computeBoundingSphere();}
  function setMouth(amount,drinking,time){const open=clamp(amount);jaw.rotation.x=open*.40;mouth.visible=open>.055;mouth.scale.y=.001+open*.020;mouth.position.y=-.068-open*.010;tongue.visible=open>.12&&(drinking||open>.55);tongue.scale.z=.014*(drinking?1+Math.max(0,Math.sin(time*12))*.42:1);tongue.position.z=.070+(drinking?Math.max(0,Math.sin(time*12))*.010:0);}
  animateTail(0,true);setMouth(0,false,0);
  const metrics={style:'plush round-faced orange-and-white kitten',headWidthM:.31,eyes:'large round pupils with two catchlights',bodySurfaceMeshes:1,headSurfaceMeshes:1,legSurfaceMeshes:4,tailSurfaceMeshes:1,fibreMeshes:2,fibreTriangles:bodyFuzz.geometry.index.count/3+headFuzz.geometry.index.count/3,textureSize:[256,256],mouth:'hinged lower jaw + internal mouth + moving tongue'};
  root.userData.visualDesign=metrics;
  return {torso,legs,head,ears,eyeGroups,tailBase,animateTail,setMouth,setEyeOpen,metrics};
}
