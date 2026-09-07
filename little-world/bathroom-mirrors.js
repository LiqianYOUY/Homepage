// A shared, small environment map supplies a stable room-like reflection without
// re-rendering the apartment for each mirror. The warm rear panel remains readable
// in the dollhouse cutaway; only the face pointing into the bathroom is silvered.
export function setupBathroomMirrors({THREE,model}){
  const source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  const raw=o=>o.userData?.name||o.name||'',find=name=>source.find(o=>raw(o)===name),bounds=o=>new THREE.Box3().setFromObject(o);
  const root=new THREE.Group();root.name='Bathroom mirrors · framed reflective glass';model.add(root);
  const originals=[],geometries=new Set(),materials=new Set(),mirrors=[];

  // The broad sky/window highlights move with the viewing angle. One 128 × 64
  // environment is shared by every glass face and is convolved once by Three.js.
  const width=128,height=64,data=new Uint8Array(width*height*4);
  const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const v=y/(height-1),u=x/(width-1),sky=smooth(.46,.86,v),floor=1-smooth(.13,.43,v);
    const windowOffset=Math.abs((u+.125)%.25-.125),window=(1-smooth(.043,.055,windowOffset))*smooth(.34,.39,v)*(1-smooth(.83,.87,v));
    const mullion=(1-smooth(.003,.007,windowOffset))+(1-smooth(.006,.015,Math.abs(v-.61)));
    const color=[155+61*sky-29*floor,171+48*sky-40*floor,166+66*sky-46*floor],windowColor=mullion>.5?[178,189,183]:[241,247,249];
    for(let c=0;c<3;c++)data[(y*width+x)*4+c]=Math.min(255,color[c]*(1-window)+windowColor[c]*window);
    data[(y*width+x)*4+3]=255;
  }
  const environment=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);environment.name='Bathroom shared soft room reflection';environment.mapping=THREE.EquirectangularReflectionMapping;environment.colorSpace=THREE.SRGBColorSpace;environment.magFilter=THREE.LinearFilter;environment.minFilter=THREE.LinearFilter;environment.needsUpdate=true;
  const material=(name,options)=>{const m=new THREE.MeshStandardMaterial(options);m.name=name;materials.add(m);return m;};
  const silver=material('Bathroom silvered glass',{color:0xf0f6f5,metalness:1,roughness:.09,envMap:environment,envMapIntensity:1.04,emissive:0x8a9b98,emissiveIntensity:.025,side:THREE.FrontSide});
  const edging=material('Bathroom brushed silver frame',{color:0xb8c0b8,metalness:.65,roughness:.26,envMap:environment,envMapIntensity:.8});
  const backing=material('Bathroom warm sealed rear panel',{color:0xdddcd0,roughness:.58,metalness:0});
  const glow=material('Bathroom soft edge light',{color:0xfff4dc,emissive:0xffe1a8,emissiveIntensity:.24,roughness:.4});
  function outline(w,h,r,Type=THREE.Shape){const p=new Type(),l=-w/2,t=h/2;p.moveTo(l+r,-t);p.lineTo(-l-r,-t);p.quadraticCurveTo(-l,-t,-l,-t+r);p.lineTo(-l,t-r);p.quadraticCurveTo(-l,t,-l-r,t);p.lineTo(l+r,t);p.quadraticCurveTo(l,t,l,t-r);p.lineTo(l,-t+r);p.quadraticCurveTo(l,-t,l+r,-t);p.closePath();return p;}
  function mesh(parent,name,geometry,mat,z){const m=new THREE.Mesh(geometry,mat);m.name=name;m.position.z=z;m.userData={name,category:'decor'};m.castShadow=false;m.receiveShadow=false;geometries.add(geometry);parent.add(m);return m;}
  function ring(w,h,inset,depth){const shape=outline(w,h,.037);shape.holes.push(outline(w-inset*2,h-inset*2,Math.max(.004,.037-inset),THREE.Path));return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:8,steps:1});}
  const specs=[
    {name:'Bathroom2 mirror',wall:'Bathroom2 north wall · upper',axis:'z',normal:1,rotation:0,tap:'Bathroom2 vanity spout'},
    {name:'Bathroom3 mirror',wall:'Bathroom3 divider · upper',axis:'x',normal:-1,rotation:-Math.PI/2,tap:'Bathroom3 vanity spout'},
    {name:'Master vanity mirror',wall:'Master ensuite exterior · upper',axis:'x',normal:-1,rotation:-Math.PI/2,tap:'Master tap wall connection'},
    {name:'Laundry sink mirror',wall:'Study laundry north divider · upper',axis:'z',normal:1,rotation:0,tap:'Laundry sink spout',newSize:[.60,.78],vanity:'Laundry sink countertop'}
  ];
  for(const spec of specs){
    const old=find(spec.name),wall=find(spec.wall),vanity=find(spec.vanity)||find(spec.vanity+' · real bowl cutout');if(!wall||(!old&&!vanity))continue;
    const b=bounds(old||vanity),wallBounds=bounds(wall),center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()),w=spec.newSize?.[0]??(spec.axis==='x'?size.z:size.x),h=spec.newSize?.[1]??size.y;
    const tap=find(spec.tap),bottom=Math.max(old?b.min.y:1.05,(tap?bounds(tap).max.y:1)+.055);
    center.y=bottom+h/2;const wallFace=spec.normal>0?wallBounds.max[spec.axis]:wallBounds.min[spec.axis];center[spec.axis]=wallFace+spec.normal*.020;
    const group=new THREE.Group();group.name=spec.name+' · refined';group.position.copy(center);group.rotation.y=spec.rotation;root.add(group);
    mesh(group,spec.name+' warm rear backing',new THREE.ExtrudeGeometry(outline(w-.005,h-.005,.035),{depth:.011,bevelEnabled:false,curveSegments:8}),backing,-.018);
    mesh(group,spec.name+' concealed soft edge',ring(w+.003,h+.003,.007,.003),glow,-.0185);
    mesh(group,spec.name+' slender rounded frame',ring(w,h,.012,.026),edging,-.013);
    const face=mesh(group,spec.name+' reflective face',new THREE.ShapeGeometry(outline(w-.022,h-.022,.026),8),silver,.011);
    face.userData.noMerge=true; // Preserve the front-only surface and its environment lookup.
    if(old){originals.push({object:old,parent:old.parent});old.removeFromParent();}
    mirrors.push({name:spec.name,object:group,face,wall,width:w,height:h,normal:new THREE.Vector3(0,0,1).applyQuaternion(group.quaternion),wallGapM:.0015,bottomM:bottom});
  }
  let disposed=false;
  return {root,mirrors,audit:{count:mirrors.length,reflection:'shared low-resolution environment; no live room render passes',environmentSize:[width,height],liveRenderTargets:0,mirrors:mirrors.map(m=>({name:m.name,widthM:m.width,heightM:m.height,bottomM:m.bottomM,wallGapM:m.wallGapM,normal:m.normal.toArray()}))},dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const original of originals)original.parent?.add(original.object);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());environment.dispose();}};
}
