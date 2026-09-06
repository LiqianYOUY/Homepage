/** Smooth, compact cat anatomy with original procedural coat textures. No media assets. */
export function buildCatVisuals({THREE,root,geometries,materials,textures}) {
  const palette={cream:new THREE.Color('#f6e7d1'),ginger:new THREE.Color('#cf8747'),stripe:new THREE.Color('#9f6236')};
  const remember=g=>(geometries.add(g),g),rememberMaterial=m=>(materials.add(m),m);
  const furData=new Uint8Array(256*256*4);let seed=17031;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const noise=Array.from({length:256*256},random);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const n=noise[y*256+x]*.38+noise[((y+1)%256)*256+x]*.24+noise[((y+2)%256)*256+x]*.18+noise[((y+4)%256)*256+x]*.2;
    const v=Math.round(83+n*102),i=(y*256+x)*4;furData[i]=furData[i+1]=furData[i+2]=v;furData[i+3]=255;
  }
  const furTexture=new THREE.DataTexture(furData,256,256,THREE.RGBAFormat);furTexture.name='Original fine directional cat undercoat';furTexture.wrapS=furTexture.wrapT=THREE.RepeatWrapping;furTexture.repeat.set(3,2);furTexture.minFilter=THREE.LinearMipmapLinearFilter;furTexture.magFilter=THREE.LinearFilter;furTexture.generateMipmaps=true;furTexture.needsUpdate=true;textures.add(furTexture);
  const fur=rememberMaterial(new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.93,metalness:0,sheen:.38,sheenColor:new THREE.Color('#edcea8'),sheenRoughness:.95,bumpMap:furTexture,bumpScale:.002}));fur.name='Cotton-soft orange and cream undercoat';
  const solid=(color,roughness=.8)=>rememberMaterial(new THREE.MeshStandardMaterial({color,roughness}));
  const cream=solid('#fff2dc'),pink=solid('#e1a5a3'),noseMat=solid('#cc9190',.53),dark=solid('#372723',.65),mouthMat=solid('#854b50',.93),whiskerMat=solid('#c9b8a2');
  const irisMat=rememberMaterial(new THREE.MeshPhysicalMaterial({color:'#b5a76e',roughness:.27,clearcoat:.55,clearcoatRoughness:.14}));
  const highlight=solid('#fffdf8',.2),pupilMat=solid('#252522',.25);
  const sphere=remember(new THREE.SphereGeometry(1,32,22));
  function mesh(name,geometry,material,parent,pos=[0,0,0],scale=[1,1,1]){const o=new THREE.Mesh(geometry,material);o.name=name;o.position.set(...pos);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;o.userData.interactable='cat';parent.add(o);return o;}
  function group(name,parent,pos=[0,0,0]){const o=new THREE.Group();o.name=name;o.position.set(...pos);parent.add(o);return o;}
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  function coat(x,y,z,region){
    let amount=0,bands=0;
    if(region==='body'){
      const saddle=smooth(.285,.37,y)*(1-smooth(.07,.18,z));
      const rump=(1-smooth(-.19,-.13,z))*smooth(.24,.33,y);
      amount=Math.max(saddle,rump)*(.87+.13*Math.sin(z*17+x*8));
      bands=Math.pow(Math.max(0,Math.sin(z*72+x*22)),14)*smooth(.01,.09,Math.abs(x))*.22;
    }else if(region==='head'){
      const blaze=1-smooth(.012,.055,Math.abs(x)+.018*Math.sin(y*35));
      amount=smooth(-.01,.04,y)*(1-blaze*.98);
      bands=Math.pow(Math.max(0,Math.sin(x*165+y*25)),15)*smooth(.035,.07,y)*.16;
    }else if(region==='ear')amount=.65;
    else if(region==='tail'){amount=1-smooth(.31,.375,y);bands=Math.pow(Math.max(0,Math.cos(y*77)),12)*.24;}
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
  const bodyGeometry=loft([[-.3,0,0,.276],[-.273,.075,.091,.276],[-.20,.13,.128,.281],[-.105,.139,.131,.281],[0,.126,.124,.29],[.10,.114,.122,.305],[.18,.083,.100,.327],[.225,0,0,.338]],42,36,'z','body');
  const body=mesh('smooth cotton-soft body',bodyGeometry,fur,torso);
  const legs=[];
  const legGeometry=loft([[.025,0,0,0],[.006,.035,.034,0],[-.052,.043,.044,.001],[-.12,.033,.034,.002],[-.174,.032,.038,.009],[-.205,.045,.058,.029],[-.228,.04,.053,.033],[-.247,0,0,.032]],26,22,'y','leg');
  for(const [i,x,z] of [[0,-.085,.15],[1,.085,.15],[2,-.09,-.195],[3,.09,-.195]]){const leg=group('Mochi '+(i<2?'front':'back')+' leg '+i,root,[x,.25,z]);mesh('continuous sock and soft paw '+i,legGeometry,fur,leg);legs.push(leg);}
  const head=group('Mochi expressive head',root,[0,.347,.227]);
  const headGeometry=remember(new THREE.SphereGeometry(1,48,34));
  const hp=headGeometry.attributes.position;
  for(let i=0;i<hp.count;i++){
    const nx=hp.getX(i),ny=hp.getY(i),nz=hp.getZ(i);let x=nx*.11,y=ny*.100,z=nz*.105;
    const lower=Math.exp(-Math.pow((y+.024)/.047,2))*smooth(.01,.065,z);
    x*=1+lower*.115;z+=lower*.011;
    if(y<-.052)z-=smooth(.052,.091,-y)*smooth(.010,.055,z)*.020;
    hp.setXYZ(i,x,y,z);
  }headGeometry.computeVertexNormals();colorGeometry(headGeometry,'head');
  const face=mesh('single sculpted soft face',headGeometry,fur,head);
  // Short tapered fibres form a delicate silhouette, in just two extra meshes.
  const fibreMaterial=rememberMaterial(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,roughness:1}));fibreMaterial.name='Fine short undercoat fibres';
  function fuzz(surface,count,region,parent){
    const g=surface.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,pos=[],colors=[],indices=[];const v=new THREE.Vector3(),normal=new THREE.Vector3(),side=new THREE.Vector3();
    for(let k=0;k<count;k++){
      const i=Math.floor(random()*p.count);v.fromBufferAttribute(p,i);normal.fromBufferAttribute(n,i).normalize();
      if(region==='head'&&v.z>.050&&v.y<.058)continue;
      if(region==='body'&&v.y<.19)continue;
      side.set(normal.y,-normal.x,.18).cross(normal).normalize();const length=.0014+random()*.0023,width=.00025+random()*.00018;
      const c=coat(v.x,v.y,v.z,region).lerp(palette.cream,.17),j=pos.length/3;
      pos.push(v.x-side.x*width,v.y-side.y*width,v.z-side.z*width,v.x+side.x*width,v.y+side.y*width,v.z+side.z*width,v.x+normal.x*length,v.y+normal.y*length,v.z+normal.z*length);
      for(let q=0;q<3;q++)colors.push(c.r,c.g,c.b);indices.push(j,j+1,j+2);
    }
    const fg=remember(new THREE.BufferGeometry());fg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));fg.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));fg.setIndex(indices);fg.computeVertexNormals();const m=mesh(region+' fine short fibres',fg,fibreMaterial,parent);m.castShadow=false;return m;
  }
  const bodyFuzz=fuzz(body,1050,'body',torso),headFuzz=fuzz(face,680,'head',head);
  function ear(name,x,tilt,orange){
    const g=group(name,head,[x,.064,-.012]);g.rotation.z=tilt;
    const shape=new THREE.Shape();shape.moveTo(-.039,0);shape.bezierCurveTo(-.048,.03,-.025,.082,-.005,.11);shape.bezierCurveTo(.004,.12,.012,.096,.018,.08);shape.bezierCurveTo(.037,.044,.046,.016,.037,0);shape.quadraticCurveTo(0,-.014,-.039,0);
    const geo=remember(new THREE.ExtrudeGeometry(shape,{depth:.016,bevelEnabled:true,bevelThickness:.007,bevelSize:.006,bevelSegments:3,steps:1,curveSegments:9}));geo.translate(0,0,-.012);geo.computeVertexNormals();colorGeometry(geo,orange?'ear':'white');mesh(name+' rounded coat',geo,fur,g);
    const inner=shape.clone();const innerGeo=remember(new THREE.ShapeGeometry(inner,12));const inside=mesh(name+' soft inner ear',innerGeo,pink,g,[0,.013,.012],[.62,.74,1]);inside.castShadow=false;return g;
  }
  const ears=[ear('left ear',-.071,.16,true),ear('right ear',.071,-.16,false)];
  const eyeGroups=[];
  for(const side of [-1,1]){
    const e=group('Mochi eye '+side,head,[side*.046,.013,.089]);e.rotation.y=side*.23;
    mesh('soft almond eye rim',sphere,dark,e,[0,0,0],[.0278,.022,.012]);
    mesh('warm hazel iris',sphere,irisMat,e,[0,.0005,.006],[.0228,.020,.008]);
    mesh('soft vertical pupil',sphere,pupilMat,e,[0,0,.013],[.010,.018,.003]);
    mesh('main eye catchlight',sphere,highlight,e,[-.007,.008,.016],[.0044,.0044,.0017]);
    mesh('small eye catchlight',sphere,highlight,e,[.006,-.006,.016],[.0017,.0017,.001]);eyeGroups.push(e);
  }
  const noseShape=new THREE.Shape();noseShape.moveTo(-.011,.004);noseShape.quadraticCurveTo(0,.008,.011,.004);noseShape.quadraticCurveTo(.009,-.002,0,-.009);noseShape.quadraticCurveTo(-.009,-.002,-.011,.004);
  const noseGeo=remember(new THREE.ExtrudeGeometry(noseShape,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.0018,bevelSegments:3,steps:1,curveSegments:8}));
  mesh('soft pink triangular nose',noseGeo,noseMat,head,[0,-.028,.112]);
  function curveMesh(name,points,radius,mat,parent){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=remember(new THREE.TubeGeometry(curve,12,radius,5,false));return mesh(name,g,mat,parent);}
  const mouth=mesh('soft opening mouth cavity',sphere,mouthMat,head,[0,-.059,.105],[.025,.001,.011]);mouth.visible=false;
  const jaw=group('hinged lower jaw',head,[0,-.052,.046]);
  mesh('rounded lower muzzle and chin',sphere,cream,jaw,[0,-.012,.031],[.053,.017,.034]);
  curveMesh('upper lip center',[[0,-.036,.117],[0,-.048,.115]],.00105,noseMat,head);
  for(const side of [-1,1]){
    curveMesh('soft upper smile',[[0,-.048,.115],[side*.013,-.052,.115],[side*.026,-.047,.109]],.00105,noseMat,head);
    for(let j=0;j<3;j++)curveMesh('fine whisker '+side+' '+j,[[side*.051,-.027-j*.011,.105],[side*.10,-.019-j*.014,.118],[side*.163,-.012-j*.02,.103]],.00055,whiskerMat,head);
  }
  const tongue=mesh('little movable pink tongue',sphere,pink,jaw,[0,-.006,.062],[.010,.0035,.013]);tongue.visible=false;
  const tailBase=group('Mochi waving tail',root,[0,.287,-.257]);
  const tailSegments=40,tailSides=12,tailPositions=new Float32Array((tailSegments+1)*(tailSides+1)*3),tailNormals=new Float32Array(tailPositions.length),tailUV=[],tailColors=[],tailIndices=[];
  for(let i=0;i<=tailSegments;i++)for(let j=0;j<=tailSides;j++){tailUV.push(j/tailSides,i/tailSegments);const c=coat(0,i/tailSegments*.39,0,'tail');tailColors.push(c.r,c.g,c.b);if(i<tailSegments&&j<tailSides){const a=i*(tailSides+1)+j,b=a+tailSides+1;tailIndices.push(a,a+1,b,b,a+1,b+1);}}
  const tailGeo=remember(new THREE.BufferGeometry());tailGeo.setAttribute('position',new THREE.BufferAttribute(tailPositions,3).setUsage(THREE.DynamicDrawUsage));tailGeo.setAttribute('normal',new THREE.BufferAttribute(tailNormals,3).setUsage(THREE.DynamicDrawUsage));tailGeo.setAttribute('uv',new THREE.Float32BufferAttribute(tailUV,2));tailGeo.setAttribute('color',new THREE.Float32BufferAttribute(tailColors,3));tailGeo.setIndex(tailIndices);const tailMesh=mesh('continuous silky curled tail',tailGeo,fur,tailBase);tailMesh.frustumCulled=false;
  const center=new THREE.Vector3(),before=new THREE.Vector3(),after=new THREE.Vector3(),tangent=new THREE.Vector3(),right=new THREE.Vector3(),binormal=new THREE.Vector3();
  function tailPoint(t,time,reduced,out){return out.set((reduced?0:Math.sin(time*1.7+t*4))*.011*t,.39*t,.070*Math.sin(t*Math.PI*.9)*t);}
  function animateTail(time,reduced){for(let i=0;i<=tailSegments;i++){const t=i/tailSegments;tailPoint(t,time,reduced,center);tailPoint(Math.max(0,t-.005),time,reduced,before);tailPoint(Math.min(1,t+.005),time,reduced,after);tangent.copy(after).sub(before).normalize();right.set(1,0,0).addScaledVector(tangent,-tangent.x).normalize();binormal.crossVectors(tangent,right).normalize();const radius=.026*(1-.68*t)*Math.pow(Math.max(0,1-t*t*t*t),.45);for(let j=0;j<=tailSides;j++){const a=j/tailSides*Math.PI*2,nx=right.x*Math.cos(a)+binormal.x*Math.sin(a),ny=right.y*Math.cos(a)+binormal.y*Math.sin(a),nz=right.z*Math.cos(a)+binormal.z*Math.sin(a),k=(i*(tailSides+1)+j)*3;tailPositions[k]=center.x+nx*radius;tailPositions[k+1]=center.y+ny*radius;tailPositions[k+2]=center.z+nz*radius;tailNormals[k]=nx;tailNormals[k+1]=ny;tailNormals[k+2]=nz;}}tailGeo.attributes.position.needsUpdate=true;tailGeo.attributes.normal.needsUpdate=true;tailGeo.computeBoundingBox();tailGeo.computeBoundingSphere();}
  function setMouth(amount,drinking,time){const open=clamp(amount);jaw.rotation.x=open*.43;mouth.visible=open>.055;mouth.scale.y=.001+open*.017;mouth.position.y=-.052-open*.010;tongue.visible=open>.12&&(drinking||open>.55);tongue.scale.z=.013*(drinking?1+Math.max(0,Math.sin(time*12))*.42:1);tongue.position.z=.059+(drinking?Math.max(0,Math.sin(time*12))*.008:0);}
  animateTail(0,true);setMouth(0,false,0);
  const metrics={style:'continuous sculpted orange-and-cream cat',bodySurfaceMeshes:1,headSurfaceMeshes:1,legSurfaceMeshes:4,tailSurfaceMeshes:1,fibreMeshes:2,fibreTriangles:bodyFuzz.geometry.index.count/3+headFuzz.geometry.index.count/3,textureSize:[256,256],mouth:'hinged lower jaw + internal mouth + moving tongue'};
  root.userData.visualDesign=metrics;
  return {torso,legs,head,ears,eyeGroups,tailBase,animateTail,setMouth,metrics};
}
