// V7 runtime cabinetry. The source apartment GLB remains unchanged.
export function setupCabinetryV7({THREE,scene,model,register=()=>{},getState=()=>({}),setState=()=>{},toast=()=>{},house=null}){
  const S=.022381665533985514,P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S),raw=o=>o.userData?.name||o.name||'';
  const all=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)all.push(o);});
  const find=n=>all.find(o=>raw(o)===n),starts=p=>all.filter(o=>raw(o).startsWith(p));
  const originals=new Map(),geometries=new Set(),materials=new Set(),roots=[],doors=[],colliderRoots=[],cabinets=[],repairs=[],appliances=[],mirrors=[];
  let disposed=false,pendingDoor=null;
  const remember=o=>{if(!originals.has(o))originals.set(o,{parent:o.parent,position:o.position.clone(),rotation:o.quaternion.clone(),scale:o.scale.clone(),visible:o.visible});};
  const remove=o=>{remember(o);o.removeFromParent();};
  function material(name,p){const m=new THREE.MeshStandardMaterial(p);m.name=name;materials.add(m);return m;}
  const oak=find('Master wardrobe north case')?.material||material('V7 natural oak',{color:0xb79b74,roughness:.65});
  const cream=material('V7 warm ivory cabinet fronts',{color:0xe6dfd1,roughness:.52});
  const innerOak=material('V7 warm cabinet interior',{color:0xbda886,roughness:.67});
  const metal=material('V7 brushed champagne hardware',{color:0xaca390,roughness:.34,metalness:.75});
  const dark=material('V7 soft dark appliance trim',{color:0x343831,roughness:.48});
  const white=material('V7 glazed ceramic',{color:0xf0ede2,roughness:.23});
  const graphite=material('V7 cookware graphite',{color:0x52534d,metalness:.68,roughness:.32});
  const cloth=[material('V7 cream folded cotton',{color:0xded8cb,roughness:1}),material('V7 sage clothing',{color:0x889080,roughness:1}),material('V7 terracotta clothing',{color:0xb88874,roughness:1}),material('V7 blue grey clothing',{color:0x7e8c92,roughness:1})];
  const dressSage=material('V7 sage linen dress',{color:0x779382,roughness:1});
  const eveningRose=material('V7 dusty rose evening gown',{color:0xb67980,roughness:.64});
  const suitNavy=material('V7 tailored navy suit',{color:0x384b63,roughness:.92});
  const labelPaper=material('V7 pantry cream paper labels',{color:0xf4e9cf,roughness:.87});
  const amber=material('V7 amber condiment bottles',{color:0x98622f,roughness:.31});
  const olive=material('V7 olive oil green bottles',{color:0x526a3d,roughness:.31});
  const snackGold=material('V7 golden snack packets',{color:0xd6ab58,roughness:.78});
  const snackCoral=material('V7 coral snack packets',{color:0xc77d66,roughness:.78});
  const grain=material('V7 dry goods oat jars',{color:0xd0b58b,roughness:.72});
  const plaster=find('TV wall · cutaway')?.material||cream;
  function group(name,parent=model){const g=new THREE.Group();g.name=name;parent.add(g);roots.push(g);return g;}
  function mesh(g,m,p,name,category='furniture'){geometries.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.userData={name,category};for(let a=p;a;a=a.parent){if(a.userData.cabinetContent){o.userData.cabinetContent=true;o.userData.category='cabinetContents';}if(a.userData.interactionId){o.userData.interactionId=a.userData.interactionId;o.userData.noMerge=true;break;}}o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  function contents(name,parent){const g=group(name,parent);g.userData.cabinetContent=true;return g;}
  const box=(p,n,w,h,d,m=oak,c='furniture')=>mesh(new THREE.BoxGeometry(w,h,d),m,p,n,c);
  const cylinder=(p,n,r,h,m=metal,segments=16)=>mesh(new THREE.CylinderGeometry(r,r,h,segments),m,p,n);
  function rod(p,n,a,b,r=.006,m=metal){const d=new THREE.Vector3().subVectors(b,a),o=cylinder(p,n,r,d.length(),m,10);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
  function tube(p,n,points,r=.004,m=metal){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,r,6,false),m,p,n);}
  function patchWall(name,x1,z1,x2,z2,t=.16){const g=group(name),cx=(x1+x2)/2,cz=(z1+z2)/2,w=x1===x2?t:Math.abs(x2-x1)*S,d=z1===z2?t:Math.abs(z2-z1)*S;g.position.copy(P(cx,cz));
    const lower=box(g,name+' · cutaway',w,.62,d,plaster,'wall');lower.position.y=.31;
    const upper=box(g,name+' · upper',w,2.18,d,plaster,'upperWall');upper.position.y=1.71;upper.visible=all.find(o=>o.userData.category==='upperWall')?.visible!==false;
    const skirt=box(g,name+' · skirting',w+.016,.085,d+.016,oak,'wall');skirt.position.y=.046;
    repairs.push({name,plan:[x1,z1,x2,z2],thicknessM:t});return g;
  }
  // The marked opening below the master bathroom jamb was an omitted solid wall segment.
  patchWall('V7 master bathroom west wall connection',791,653.75,791,692);
  patchWall('V7 master bathroom upper jamb connection',791,608,791,610.30);
  // A structural rear liner puts bedroom 2's wardrobe against a real partition.
  patchWall('V7 bedroom2 wardrobe rear partition',1278.4,319.915,1278.4,387,.10);
  // Close the small fixed-sidelight/head gap without changing the entry door hinge.
  const entryTrim=group('V7 fixed sidelight head closure');entryTrim.position.copy(P(1105.5,579,2.19));box(entryTrim,'V7 fixed sidelight head closure',17*S,.02,.065,oak,'door');
  // Keep foliage to the dressing side of the repaired bathroom wall.
  const plantParts=starts('Master plant');for(const o of plantParts){remember(o);o.position.x-=8*S;}
  // Keep the floor plant beside the new window desk and clear of its chair.
  for(const o of starts('Bedroom2 plant')){remember(o);o.position.x+=68*S;o.position.z-=4*S;}
  // A compact bedside pedestal leaves a real opening arc for bedroom 3's south wardrobe leaf.
  for(const o of starts('Bedroom 3 queen bed ')){if(!/bedside|lamp /.test(raw(o))||o.position.x>=P(1382,0).x)continue;remember(o);o.position.x=P(1329.5,0).x;o.position.z=P(0,588).z;if(raw(o).endsWith('lamp base'))o.position.y=.4625;if(raw(o).endsWith('bedside')){o.scale.x*=.11/.25;o.scale.z*=.11/.25;}}

  function persistDoor(d){const state=getState()||{};setState({doors:{...(state.doors||{}),[d.id]:d.target}});}
  function addDoor({id,label,owner,centerX,width,bottom,top,front,hinge='left',family='kitchen',material:faceMat=cream}){
    const pivot=group('V7 moving '+label,scene);pivot.userData.interactionId=id;pivot.userData.category='cabinetDoor';pivot.userData.noMerge=true;
    owner.updateWorldMatrix(true,true);const hingeX=centerX+(hinge==='left'?-width/2:width/2);
    const world=owner.localToWorld(new THREE.Vector3(hingeX,0,front));pivot.position.copy(world);pivot.quaternion.copy(owner.getWorldQuaternion(new THREE.Quaternion()));
    const moving=new THREE.Group();moving.name=label+' moving leaf';moving.userData.interactionId=id;pivot.add(moving);
    const sign=hinge==='left'?1:-1,leaf=box(moving,label+' door panel',width,top-bottom,.024,faceMat);leaf.position.set(sign*width/2,(bottom+top)/2,0);
    const pullX=sign*(width-.075),pullY=Math.max(bottom+.14,Math.min(top-.14,Math.min(1.14,(bottom+top)/2)));
    const handle=cylinder(moving,label+' metal handle',.009,Math.min(.20,(top-bottom)*.48),metal,12);handle.position.set(pullX,pullY,.048);
    for(const yy of [pullY-.065,pullY+.065]){if(yy<bottom+.04||yy>top-.04)continue;rod(moving,label+' handle support',new THREE.Vector3(pullX,yy,.011),new THREE.Vector3(pullX,yy,.048),.006,metal);}
    for(const yy of [bottom+.12,top-.12]){const hingeBarrel=cylinder(moving,label+' hinge barrel',.007,.042,metal,10);hingeBarrel.position.set(0,yy,-.003);}
    const d={id,label,kind:'cabinet',object:moving,pivot,leaf,handle,owner,family,base:pivot.quaternion.clone(),target:0,amount:0,sign,anchor:new THREE.Vector3(),maxAngle:Math.PI/2,blocked:false,hotspot:/(?:-0|-upper)$/.test(id)};
    d.apply=a=>{d.amount=a;const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-sign*a*d.maxAngle);pivot.quaternion.copy(d.base).multiply(q);pivot.updateWorldMatrix(true,true);handle.getWorldPosition(d.anchor);};
    d.click=()=>{if(d.target>.01||d.amount>.01||pendingDoor===d){d.target=0;pendingDoor=null;persistDoor(d);toast('收起'+label);return;}
      // Close other leaves first; opposing kitchen banks cannot swing into each other.
      const changed={};for(const other of doors)if(other!==d&&other.family===family&&(other.target>.001||other.amount>.001)){other.target=0;changed[other.id]=0;}if(Object.keys(changed).length)setState({doors:{...(getState()?.doors||{}),...changed}});pendingDoor=d;toast('打开'+label);
    };
    d.drag=(dx,dy,ctx={})=>{if(ctx.phase==='start'){pendingDoor=null;d.dragStart=d.amount;const changed={};for(const other of doors)if(other!==d&&other.family===family&&(other.target>.001||other.amount>.001)){other.target=0;changed[other.id]=0;}if(Object.keys(changed).length)setState({doors:{...(getState()?.doors||{}),...changed}});return;}if(ctx.phase==='move'&&!doors.some(other=>other!==d&&other.family===family&&other.amount>.01))d.target=Math.max(0,Math.min(d.maxAllowed,(d.dragStart??d.amount)+dx/150));if(ctx.phase==='end')persistDoor(d);};
    d.setOpen=(amount,instant=false)=>{d.target=Math.max(0,Math.min(1,amount));if(instant)d.apply(d.target);};d.apply(0);doors.push(d);colliderRoots.push(pivot);register(d);return d;
  }
  function liveMirror(parent,width,height,position){
    // Planar reflected-camera rendering follows Three's Reflector approach:
    // https://github.com/mrdoob/three.js/blob/r170/examples/jsm/objects/Reflector.js
    // One small, throttled target is allocated only when the real mirror first becomes visible.
    const textureMatrix=new THREE.Matrix4(),virtualCamera=new THREE.PerspectiveCamera();
    const shader=new THREE.ShaderMaterial({name:'Wardrobe live planar mirror',uniforms:{reflection:{value:null},textureMatrix:{value:textureMatrix},ready:{value:0}},vertexShader:`
      uniform mat4 textureMatrix;
      varying vec4 reflectedUv;
      void main(){
        reflectedUv=textureMatrix*vec4(position,1.0);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,fragmentShader:`
      uniform sampler2D reflection;
      uniform float ready;
      varying vec4 reflectedUv;
      void main(){
        vec3 reflected=texture2DProj(reflection,reflectedUv).rgb;
        gl_FragColor=vec4(mix(vec3(0.54,0.61,0.60),reflected*vec3(0.96,0.985,0.98),ready),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});materials.add(shader);
    const surface=mesh(new THREE.PlaneGeometry(width,height),shader,parent,'Master wardrobe full-length floor mirror','decor');surface.position.copy(position);surface.castShadow=false;surface.receiveShadow=false;surface.userData.noMerge=true;
    const mirrorPoint=new THREE.Vector3(),eye=new THREE.Vector3(),normal=new THREE.Vector3(),rotation=new THREE.Matrix4(),view=new THREE.Vector3(),look=new THREE.Vector3(),reflectedLook=new THREE.Vector3();
    const mirrorPlane=new THREE.Plane(),clip=new THREE.Vector4(),corner=new THREE.Vector4(),viewport=new THREE.Vector4();
    const info={object:surface,type:'live-planar',renderCount:0,width:0,height:0,maxHz:0,target:null,lastUpdate:-Infinity};mirrors.push(info);
    surface.onBeforeRender=(renderer,renderScene,camera)=>{
      if(disposed||camera===virtualCamera)return;
      mirrorPoint.setFromMatrixPosition(surface.matrixWorld);eye.setFromMatrixPosition(camera.matrixWorld);
      rotation.extractRotation(surface.matrixWorld);normal.set(0,0,1).applyMatrix4(rotation).normalize();
      view.subVectors(mirrorPoint,eye);if(view.dot(normal)>=0)return;
      const compact=(renderer.domElement.clientWidth||renderer.domElement.width/renderer.getPixelRatio())<760;
      const interval=compact?160:100,now=globalThis.performance?.now?.()??Date.now();
      if(now-info.lastUpdate<interval)return;
      if(!info.target){
        info.width=compact?256:512;info.height=compact?512:1024;info.maxHz=1000/interval;
        const type=renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType;
        info.target=new THREE.WebGLRenderTarget(info.width,info.height,{type,depthBuffer:true,stencilBuffer:false,samples:0});
        info.target.texture.name='Wardrobe mirror live room reflection';info.target.texture.generateMipmaps=false;shader.uniforms.reflection.value=info.target.texture;
      }
      // Mirror both the eye and its forward target around the moving wardrobe door plane.
      virtualCamera.position.copy(view.reflect(normal).negate().add(mirrorPoint));
      rotation.extractRotation(camera.matrixWorld);look.set(0,0,-1).applyMatrix4(rotation).add(eye);
      reflectedLook.subVectors(mirrorPoint,look).reflect(normal).negate().add(mirrorPoint);
      virtualCamera.up.set(0,1,0).applyMatrix4(rotation).reflect(normal);virtualCamera.lookAt(reflectedLook);
      virtualCamera.near=camera.near;virtualCamera.far=camera.far;virtualCamera.layers.mask=camera.layers.mask;virtualCamera.updateMatrixWorld();virtualCamera.projectionMatrix.copy(camera.projectionMatrix);
      textureMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(virtualCamera.projectionMatrix).multiply(virtualCamera.matrixWorldInverse).multiply(surface.matrixWorld);
      // Oblique near clipping keeps the cabinet and space behind the glass out of its reflection.
      mirrorPlane.setFromNormalAndCoplanarPoint(normal,mirrorPoint).applyMatrix4(virtualCamera.matrixWorldInverse);
      clip.set(mirrorPlane.normal.x,mirrorPlane.normal.y,mirrorPlane.normal.z,mirrorPlane.constant);
      const p=virtualCamera.projectionMatrix.elements;corner.set((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);
      clip.multiplyScalar(2/clip.dot(corner));p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1-.003;p[14]=clip.w;
      virtualCamera.projectionMatrixInverse.copy(virtualCamera.projectionMatrix).invert();
      const previousTarget=renderer.getRenderTarget(),previousXR=renderer.xr.enabled,previousShadowUpdate=renderer.shadowMap.autoUpdate;renderer.getViewport(viewport);
      surface.visible=false;renderer.xr.enabled=false;renderer.shadowMap.autoUpdate=false;
      try{
        renderer.setRenderTarget(info.target);renderer.state.buffers.depth.setMask(true);if(!renderer.autoClear)renderer.clear();renderer.render(renderScene,virtualCamera);
        shader.uniforms.ready.value=1;info.renderCount++;info.lastUpdate=now;
      }finally{
        renderer.xr.enabled=previousXR;renderer.shadowMap.autoUpdate=previousShadowUpdate;renderer.setRenderTarget(previousTarget);renderer.setViewport(viewport);surface.visible=true;
      }
    };
    return surface;
  }
  function cabinet({name,id,x1,z1,x2,z2,height=2.45,front='south',count=2,wardrobe=false,lower=0,faceTop=null,content='kitchen',doorBottom=null,doorHinges=null,mirrorBay=null}){
    const body=group('V7 '+name);body.userData.category='furniture';const w=(front==='east'||front==='west'?z2-z1:x2-x1)*S,d=(front==='east'||front==='west'?x2-x1:z2-z1)*S;
    body.position.copy(P((x1+x2)/2,(z1+z2)/2));body.rotation.y={south:0,north:Math.PI,east:Math.PI/2,west:-Math.PI/2}[front];
    const t=.018,base=lower+.10,top=height-.025,innerW=w-2*t;
    for(const xx of [-w/2+t/2,w/2-t/2]){const side=box(body,name+' structural side',t,height-lower,d,oak);side.position.set(xx,(height+lower)/2,0);}
    const back=box(body,name+' full cabinet backing',innerW,height-lower,.016,innerOak);back.position.set(0,(height+lower)/2,-d/2+.008);
    for(const yy of [base,top]){const shelf=box(body,name+' fixed case shelf',innerW,t,d-.016,oak);shelf.position.set(0,yy,-.004);}
    const plinth=box(body,name+' floor support plinth',w-.06,base-lower-.009,d-.065,dark);plinth.position.set(0,lower+(base-lower-.009)/2,-.02);
    if(wardrobe)for(const xx of [-w*.32,w*.32]){const cleat=box(body,name+' concealed wall mounting cleat',.10,.06,.016,metal);cleat.position.set(xx,height-.16,-d/2-.004);}
    const clearW=w-.12,bay=clearW/count;
    for(const xx of [-w/2+.03,w/2-.03]){const jamb=box(body,name+' inset door side stile',.06,height-lower-.025,.035,oak);jamb.position.set(xx,(height+lower)/2,d/2+.006);}
    for(let i=1;i<count;i++){const divider=box(body,name+' internal divider',t,top-base,d-.032,innerOak);divider.position.set(-clearW/2+bay*i,(base+top)/2,-.01);}
    const c={name,id,body,width:w,depth:d,bottom:lower,height,front,plan:[x1,z1,x2,z2],doors:[]};cabinets.push(c);
    for(let i=0;i<count;i++){
      const x=-clearW/2+bay*(i+.5),label=name+(count>1?' '+(i+1):'');
      const door=addDoor({id:id+'-'+i,label,owner:body,centerX:x,width:bay-.006,bottom:doorBottom??base+.012,top:faceTop??height-.04,front:d/2+.022,hinge:doorHinges?.[i]||(i%2?'right':'left'),family:wardrobe?id:'kitchen'});c.doors.push(door);
      if(i===mirrorBay){
        // The real reflected room travels with the middle wardrobe leaf as it opens.
        const mirror=liveMirror(door.object,bay-.045,height-.145,new THREE.Vector3(door.sign*(bay-.006)/2,height/2+.015,.023));
        const edgeMat=material('V8 mirror silver edging',{color:0xc1c4bb,metalness:.85,roughness:.19});
        for(const edgeX of [-1,1]){const edge=box(door.object,'Master mirror slender full-height edge',.007,height-.13,.012,edgeMat);edge.position.set(door.sign*(bay-.006)/2+edgeX*(bay-.037)/2,height/2+.015,.018);edge.userData.category='decor';}
        door.mirror=mirror;
      }
      if(wardrobe){if(i%2===0)hanging(body,name,x,bay-.03,d,height);else folded(body,name,x,bay-.03,d,height,base);}
      else kitchenContents(body,name,x,bay-.04,d,height,base,content,i);
    }
    return c;
  }
  function folded(body,name,x,w,d,h,base){for(const [i,level] of [base+.36,base+.77,base+1.18,base+1.59].filter(v=>v<h-.15).entries()){
    const shelf=box(body,name+' folded clothing shelf',w,.018,d-.04,innerOak);shelf.position.set(x,level,-.01);
    for(let k=0;k<3;k++){const fold=box(body,name+' folded cotton stack',Math.min(.34,w-.035),.052,Math.min(.28,d-.06),cloth[(i+k)%cloth.length]);fold.position.set(x,level+.009+.026+k*.052,.018);}
  }}
  let garmentIndex=0;
  function clothingPanel(parent,name,points,mat,depth=.018,z=0){
    const shape=new THREE.Shape();shape.moveTo(...points[0]);points.slice(1).forEach(p=>shape.lineTo(...p));shape.closePath();
    const panel=mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1}),mat,parent,name);panel.position.z=z;return panel;
  }
  function hanging(body,name,x,w,d,h){const level=h-.50;
    rod(body,name+' supported hanging rail',new THREE.Vector3(x-w/2,level,0),new THREE.Vector3(x+w/2,level,0),.011,metal);
    for(const xx of [x-w/2,x+w/2]){const bracket=box(body,name+' rail mounting block',.023,.050,.042,metal);bracket.position.set(xx,level,0);}
    const shelf=box(body,name+' high wardrobe shelf',w,.018,d-.035,innerOak);shelf.position.set(x,h-.25,-.007);
    // Two angled hangers leave each silhouette readable through an open leaf.
    // Scale against the narrowest bay; hems remain clear of dividers and the back.
    for(let i=0;i<2;i++){
      const kind=['linen dress','evening gown','collared shirt','tailored suit'][garmentIndex++%4];
      const angle=kind==='linen dress'||kind==='evening gown'?.22:.97;
      const garment=contents(name+' hanging clothing · '+kind,body);garment.position.set(x+(i?1:-1)*w*.22,level-.17,0);garment.rotation.y=-angle;
      garment.scale.x=Math.min(1,(w*.28-.022)/(.232*Math.cos(angle)+.021*Math.sin(angle)));
      tube(garment,name+' clothing curved hanger hook',[new THREE.Vector3(0,.075,0),new THREE.Vector3(0,.17,.023),new THREE.Vector3(0,.193,0),new THREE.Vector3(0,.17,-.019)],.004,metal);
      for(const [a,b] of [[[0,.075,0],[-.175,-.005,0]],[[-.175,-.005,0],[.175,-.005,0]],[[.175,-.005,0],[0,.075,0]]])rod(garment,name+' clothing triangular hanger',new THREE.Vector3(...a),new THREE.Vector3(...b),.004,metal);
      if(kind==='linen dress'||kind==='evening gown'){
        const formal=kind==='evening gown',hem=formal?1.36:1.02,mat=formal?eveningRose:dressSage;
        clothingPanel(garment,name+' clothing '+kind,[[-.034,.018],[-.09,.027],[-.13,-.055],[-.094,-.36],[-.225,-hem],[.225,-hem],[.094,-.36],[.13,-.055],[.09,.027],[.034,.018],[0,-.07]],mat);
        const belt=box(garment,name+' clothing dress waist ribbon',.194,.035,.012,formal?metal:cloth[0]);belt.position.set(0,-.355,.025);
        for(const side of [-1,1])rod(garment,name+' clothing skirt seam',new THREE.Vector3(side*.07,-.40,.022),new THREE.Vector3(side*.145,-hem+.04,.022),.003,formal?eveningRose:cloth[1]);
        if(formal){const clasp=mesh(new THREE.SphereGeometry(.012,8,6),metal,garment,name+' clothing evening gown clasp');clasp.position.set(.01,-.354,.037);}
      }else{
        const suit=kind==='tailored suit',mat=suit?suitNavy:white,hem=suit?.70:.58;
        clothingPanel(garment,name+' clothing '+kind,[[-.033,.018],[-.11,.028],[-.17,-.035],[-.218,-.44],[-.16,-.46],[-.12,-.15],[-.12,-hem],[.12,-hem],[.12,-.15],[.16,-.46],[.218,-.44],[.17,-.035],[.11,.028],[.033,.018],[0,-.015]],mat);
        if(suit){
          clothingPanel(garment,name+' clothing suit shirt front',[[-.057,.013],[.057,.013],[0,-.30]],white,.005,.022);
          for(const side of [-1,1])clothingPanel(garment,name+' clothing suit tailored lapel',[[side*.06,.013],[side*.11,-.09],[side*.037,-.30],[0,-.22]],cloth[3],.006,.027);
          for(const side of [-1,1]){const trouser=box(garment,name+' clothing suit trouser leg',.098,.64,.026,suitNavy);trouser.position.set(side*.057,-.95,.004);}
          const tie=box(garment,name+' clothing suit silk tie',.020,.21,.005,eveningRose);tie.position.set(0,-.13,.035);
        }else{
          for(const side of [-1,1])clothingPanel(garment,name+' clothing shirt pointed collar',[[side*.029,.025],[side*.083,-.012],[side*.039,-.081],[0,-.012]],cloth[0],.007,.024);
          const pocket=box(garment,name+' clothing shirt chest pocket',.047,.051,.006,cloth[0]);pocket.position.set(-.071,-.16,.026);
        }
        for(const yy of (suit?[-.36,-.49]:[-.11,-.23,-.35,-.47])){const button=mesh(new THREE.SphereGeometry(.005,6,4),suit?metal:cloth[3],garment,name+' clothing front button');button.position.set(suit?.025:0,yy,.031);}
      }
    }
  }
  function bowl(body,name,x,y,z,r=.10,m=white){const profile=[[0,0],[r*.59,0],[r*.75,.009],[r,.07],[r*.95,.076],[r*.88,.064],[r*.57,.010],[0,.010]].map(([x,y])=>new THREE.Vector2(x,y));const o=mesh(new THREE.LatheGeometry(profile,24),m,body,name);o.position.set(x,y,z);return o;}
  function plate(body,name,x,y,z,r=.11){const profile=[[0,0],[r*.78,0],[r,.014],[r,.020],[r*.77,.012],[0,.012]].map(([x,y])=>new THREE.Vector2(x,y));const o=mesh(new THREE.LatheGeometry(profile,24),white,body,name);o.position.set(x,y,z);return o;}
  function mug(body,name,x,y,z){const shell=mesh(new THREE.CylinderGeometry(.035,.030,.081,20,1,true),white,body,name+' cup wall');shell.position.set(x,y+.0405,z);const bottom=cylinder(body,name+' cup bottom',.030,.008,white,20);bottom.position.set(x,y+.004,z);const handle=mesh(new THREE.TorusGeometry(.024,.006,8,16),white,body,name+' cup handle');handle.position.set(x+.035,y+.043,z);handle.rotation.y=Math.PI/2;}
  function cookingPot(body,name,x,y,z,r=.095,h=.12){const shell=mesh(new THREE.CylinderGeometry(r,r*.92,h,24,1,true),graphite,body,name+' hollow pot wall');shell.position.set(x,y+h/2,z);const bottom=cylinder(body,name+' flat pot base',r*.92,.009,graphite,24);bottom.position.set(x,y+.0045,z);
    for(const zz of [-1,1]){const handle=mesh(new THREE.TorusGeometry(.035,.007,8,18,Math.PI*1.5),metal,body,name+' loop handle');handle.rotation.set(Math.PI/2,0,zz>0?-.75:2.39);handle.position.set(x,y+h*.72,z+zz*(r+.012));}
  }
  function pantryJar(parent,name,x,y,z,r=.046,height=.16,mat=grain){
    const jar=cylinder(parent,name+' storage jar',r,height,mat,16);jar.position.set(x,y+height/2,z);
    const lid=cylinder(parent,name+' storage jar oak lid',r+.003,.018,oak,16);lid.position.set(x,y+height+.009,z);
    const label=box(parent,name+' storage jar paper label',r*1.3,height*.38,.008,labelPaper);label.position.set(x,y+height*.52,z+r-.001);
    const mark=box(parent,name+' storage jar label stripe',r*.63,.009,.002,mat===grain?olive:snackCoral);mark.position.set(x,y+height*.52,z+r+.004);
  }
  function condimentBottle(parent,name,x,y,z,height=.22,mat=olive){
    const radius=.030,bodyHeight=height-.064;
    const vessel=cylinder(parent,name+' seasoning bottle body',radius,bodyHeight,mat,12);vessel.position.set(x,y+bodyHeight/2,z);
    const shoulder=mesh(new THREE.CylinderGeometry(.013,radius,.028,12),mat,parent,name+' seasoning bottle shoulder');shoulder.position.set(x,y+bodyHeight+.014,z);
    const neck=cylinder(parent,name+' seasoning bottle neck',.013,.030,mat,12);neck.position.set(x,y+height-.021,z);
    const cap=cylinder(parent,name+' seasoning bottle cap',.016,.018,dark,12);cap.position.set(x,y+height-.009,z);
    const label=box(parent,name+' seasoning bottle paper label',.044,.053,.006,labelPaper);label.position.set(x,y+bodyHeight*.52,z+radius-.001);
    const stripe=box(parent,name+' seasoning bottle label stripe',.027,.010,.002,mat);stripe.position.set(x,y+bodyHeight*.52,z+radius+.003);
  }
  function snackPacket(parent,name,x,y,z,width=.10,height=.17,mat=snackGold){
    const pack=box(parent,name+' snack packet',width,height,.061,mat);pack.position.set(x,y+height/2,z);pack.rotation.z=-.025;
    for(const yy of [y+.009,y+height-.009]){const seam=box(parent,name+' snack packet sealed edge',width+.004,.012,.065,mat);seam.position.set(x,yy,z);}
    const label=box(parent,name+' snack packet cream label',width*.70,height*.37,.005,labelPaper);label.position.set(x,y+height*.55,z+.033);
    const biscuit=cylinder(parent,name+' snack packet biscuit emblem',width*.18,.004,mat===snackGold?snackCoral:grain,12);biscuit.rotation.x=Math.PI/2;biscuit.position.set(x,y+height*.55,z+.038);
  }
  function cutleryTray(parent,name,x,y,z,width=.28){
    const tray=box(parent,name+' cutlery tray base',width,.014,.20,oak);tray.position.set(x,y+.007,z);
    for(const dx of [-width/2+.006,width/2-.006]){const edge=box(parent,name+' cutlery tray edge',.012,.028,.20,oak);edge.position.set(x+dx,y+.021,z);}
    for(const dz of [-.094,.094]){const edge=box(parent,name+' cutlery tray rim',width,.028,.012,oak);edge.position.set(x,y+.021,z+dz);}
    for(let i=0;i<3;i++){
      const xx=x+(i-1)*width*.27,yy=y+.023;
      const grip=box(parent,name+' cutlery '+['fork','knife','spoon'][i]+' handle',.011,.007,.082,metal);grip.position.set(xx,yy,z+.030);
      if(i===0){const shoulder=box(parent,name+' cutlery fork shoulder',.028,.007,.018,metal);shoulder.position.set(xx,yy,z-.019);for(let k=0;k<4;k++){const tine=box(parent,name+' cutlery fork tine',.004,.007,.029,metal);tine.position.set(xx+(k-1.5)*.007,yy,z-.04);}}
      else if(i===1){const blade=box(parent,name+' cutlery knife blade',.021,.008,.072,metal);blade.position.set(xx-.005,yy,z-.042);}
      else{const spoon=mesh(new THREE.SphereGeometry(1,10,6),metal,parent,name+' cutlery spoon bowl');spoon.scale.set(.018,.005,.025);spoon.position.set(xx,yy,z-.036);}
    }
  }
  function kitchenContents(body,name,x,w,d,h,base,kind,index){const span=h-base;const levels=span>1?[base+.30,base+.76,base+1.22,base+1.70].filter(v=>v<h-.12):[base+.21];
    const items=contents(name+' organized cabinet contents '+index,body),front=Math.min(.085,d*.14);
    for(let j=0;j<levels.length;j++){const yy=levels[j],s=box(body,name+' storage shelf',w,.018,d-.04,innerOak);s.position.set(x,yy,-.004);const top=yy+.009;
      if(kind==='pantry'){
        if(j===0){for(let k=0;k<3;k++)snackPacket(items,name+' biscuits and crisps',x+(k-1)*w*.28,top,front,Math.min(.10,w*.23),.17+(k%2)*.03,k%2?snackCoral:snackGold);}
        else if(j===1){for(let k=0;k<3;k++)pantryJar(items,name+' oats nuts and dried fruit',x+(k-1)*w*.28,top,front,Math.min(.047,w*.11),.15+(k%2)*.035,k%2?amber:grain);}
        else if(j===2){for(let k=0;k<3;k++)condimentBottle(items,name+' soy sauce oil and vinegar',x+(k-1)*w*.28,top,front,.21+(k%2)*.025,k%2?amber:olive);}
        else{pantryJar(items,name+' tea jar',x-w*.23,top,front,.047,.16,olive);snackPacket(items,name+' crackers',x+w*.16,top,front,Math.min(.13,w*.28),.21,snackCoral);}
      }
      else if(kind==='services'){const bin=box(items,name+' laundry storage basket',Math.min(w-.025,.40),.20,Math.min(.32,d-.06),cloth[j%4]);bin.position.set(x,top+.10,0);}
      else if(kind==='comms'){if(j===0){const router=box(items,name+' router on shelf',Math.min(.26,w-.025),.04,.16,white);router.position.set(x,top+.02,0);for(const dx of [-.08,.08])rod(items,name+' router aerial',new THREE.Vector3(x+dx,top+.04,-.055),new THREE.Vector3(x+dx,top+.16,-.055),.004,dark);}else{const storage=box(items,name+' labelled household box',Math.min(.27,w-.025),.15,.20,cloth[0]);storage.position.set(x,top+.075,0);}}
      else{
        const arrangement=span>1?(index*2+j)%6:index%4;
        if(arrangement===0){for(let k=0;k<5;k++)plate(items,name+' stacked dinner plate',x-w*.18,top+k*.017,front,Math.min(.108,w*.26));pantryJar(items,name+' salt seasoning',x+w*.28,top,front,.035,.115,white);}
        else if(arrangement===1){for(const offset of [-1,1])mug(items,name+' stored ceramic mug',x+offset*Math.min(.10,w*.22),top,front);}
        else if(arrangement===2){cutleryTray(items,name+' fork knife spoon organizer',x,top,front,Math.min(.31,w-.045));}
        else if(arrangement===3){cookingPot(items,name+' stored saucepan',x-w*.17,top,front,Math.min(.09,w*.23),.105);for(let k=0;k<2;k++)bowl(items,name+' stacked serving bowl',x+w*.27,top+k*.022,front,.065);}
        else if(arrangement===4){for(let k=0;k<3;k++)condimentBottle(items,name+' kitchen spices and oil',x+(k-1)*w*.27,top,front,.20+(k%2)*.035,k%2?amber:olive);}
        else{snackPacket(items,name+' pantry snack biscuits',x-w*.19,top,front,.115,.19,snackGold);pantryJar(items,name+' tea and coffee canister',x+w*.23,top,front,.05,.165,amber);}
      }
    }
  }

  // The dressing-room south bank is continuous: three leaves, with a full-length centre mirror.
  const wardrobeSpecs=[
    {name:'主卧长衣柜',id:'wardrobe-master-north',prefix:'Master wardrobe north',x1:630,z1:553.00,x2:738,z2:578.00,height:2.45,front:'south',count:4},
    {name:'主卧联排衣柜',id:'wardrobe-master-south',prefix:'Master wardrobe south',x1:632,z1:710,x2:786,z2:738.05,height:2.45,front:'north',count:3,mirrorBay:1,doorBottom:.065},
    {name:'次卧二衣柜',id:'wardrobe-bedroom2',prefix:'Bedroom2 wardrobe',x1:1281,z1:320.30,x2:1311,z2:389,height:2.40,front:'east',count:3}
  ];
  for(const s of wardrobeSpecs){starts(s.prefix+' ').forEach(remove);cabinet({...s,wardrobe:true});}

  // Kitchen pantry and household cupboards retain their plan bays and gain opening fronts.
  for(const s of [
    {name:'食品储藏柜',id:'cabinet-pantry',prefix:'Pantry',x1:828,x2:854,count:1,content:'pantry'},
    {name:'厨房餐具高柜',id:'cabinet-storage',prefix:'Storage',x1:958,x2:1024,count:2,content:'kitchen'},
    {name:'家务储物柜',id:'cabinet-services',prefix:'Services cupboard',x1:1024,x2:1057,count:1,content:'services'},
    {name:'家居通讯柜',id:'cabinet-comms',prefix:'Comms cupboard',x1:1057,x2:1091,count:1,content:'comms'}
  ]){starts(s.prefix+' · ').forEach(remove);cabinet({...s,z1:535.7,z2:563.65,height:2.45,front:'north'});}
  // The cold appliances/wine glazing/ovens remain exactly where smart-home placed them.
  const rightBody=find('Kitchen right base');if(rightBody)remove(rightBody);
  const rightCounter=find('Kitchen right counter');if(rightCounter)remove(rightCounter);
  cabinet({name:'灶台下橱柜',id:'cabinet-cooktop',x1:937.03,z1:361.82,x2:972.04,z2:476.18,height:.87,front:'west',count:4});
  const counter=group('V7 kitchen counter extended to wall');counter.position.copy(P((935.47+972.18)/2,419,.90));box(counter,'V7 kitchen supported stone counter',(972.18-935.47)*S,.055,2.60,find('Kitchen island stone waterfall top')?.material||white);
  const oldIsland=find('Kitchen island body');if(oldIsland)remove(oldIsland);
  cabinet({name:'中岛储物柜',id:'cabinet-island',x1:851.79,z1:349.35,x2:890.21,z2:469.65,height:.86,front:'east',count:4});

  // Remove the former continuous toe-kick only below the newly rebuilt tall bays.
  // smart-home already split it around the refrigerators; retain the wine/oven support portions.
  const previousPlinths=[];scene.traverse(o=>{if(o.isMesh&&o.name==='Preserved recessed cabinet toe-kick')previousPlinths.push(o);});
  const keptPlinths=group('V7 preserved wine and oven toe-kicks');
  for(const old of previousPlinths){const bounds=new THREE.Box3().setFromObject(old);let spans=[[bounds.min.x,bounds.max.x]];
    for(const [cutA,cutB] of [[P(828,0).x,P(854,0).x],[P(958,0).x,P(1091,0).x]]){const next=[];for(const [a,b] of spans){if(b<=cutA||a>=cutB)next.push([a,b]);else{if(a<cutA)next.push([a,cutA]);if(b>cutB)next.push([cutB,b]);}}spans=next;}
    for(const [a,b] of spans){if(b-a<.001)continue;const part=box(keptPlinths,'V7 retained appliance toe-kick',b-a,bounds.max.y-bounds.min.y,bounds.max.z-bounds.min.z,old.material);part.position.set((a+b)/2,(bounds.min.y+bounds.max.y)/2,(bounds.min.z+bounds.max.z)/2);}remove(old);
  }

  // Small upper cupboard doors above the original wine fridge and double ovens.
  for(const s of [{prefix:'Wine fridge',name:'酒柜上方杯具柜',id:'cabinet-wine-upper',x1:792,x2:828,bottom:2.07},{prefix:'Double oven',name:'烤箱上方餐具柜',id:'cabinet-oven-upper',x1:857.6,x2:884.4,bottom:1.84}]){
    const old=starts(s.prefix+' · upper cupboard panel');old.forEach(remove);
    // A shallow lined upper bay shares the existing carcass; do not duplicate its sides/back.
    const body=group('V7 '+s.name);body.position.copy(P((s.x1+s.x2)/2,548.8));body.rotation.y=Math.PI;
    const w=(s.x2-s.x1)*S-.035,depth=.56;
    for(const xx of [-w/2+.025,w/2-.025]){const stile=box(body,s.name+' fixed side stile',.05,2.438-s.bottom,.025,cream);stile.position.set(xx,(2.438+s.bottom)/2,(548.8-535.5)*S);}
    const shelf=box(body,s.name+' supported inner shelf',w,.018,depth-.02,innerOak);shelf.position.set(0,s.bottom+.035,0);
    addDoor({id:s.id,label:s.name,owner:body,centerX:0,width:w-.10,bottom:s.bottom+.006,top:2.438,front:(548.8-535.5)*S,hinge:'left'});
    for(const x of [-.13,.13]){if(w>.40)mug(body,s.name+' stored cup',x,s.bottom+.044,0);}
  }

  // Countertop appliances rest on the real .9275 m worktop and face the working aisle.
  const worktop=.9275;
  const microwave=group('V7 countertop microwave');microwave.position.copy(P(954,461,worktop));microwave.rotation.y=-Math.PI/2;appliances.push(microwave);
  const mwW=.47,mwH=.29,mwD=.36;
  for(const xx of [-mwW/2+.009,mwW/2-.009]){const side=box(microwave,'Microwave insulated side',.018,mwH,mwD,cream);side.position.set(xx,.018+mwH/2,0);}
  for(const yy of [.027,.299]){const surface=box(microwave,'Microwave case horizontal',mwW-.025,.018,mwD,cream);surface.position.set(0,yy,0);}
  const mwBack=box(microwave,'Microwave cavity backing',mwW-.025,mwH-.025,.016,metal);mwBack.position.set(0,.165,-mwD/2+.008);
  for(const xx of [-.18,.18])for(const zz of [-.12,.12]){const foot=cylinder(microwave,'Microwave countertop foot',.015,.018,dark,12);foot.position.set(xx,.009,zz);}
  const glassMat=material('V7 microwave smoke glass',{color:0x718280,roughness:.18,metalness:.12,transparent:true,opacity:.38,side:THREE.DoubleSide});
  const glass=box(microwave,'Microwave transparent door glass',.352,.223,.008,glassMat);glass.position.set(-.035,.1665,.186);
  for(const yy of [.047,.286]){const frame=box(microwave,'Microwave slim door frame',.37,.016,.014,dark);frame.position.set(-.035,yy,.186);}
  for(const xx of [-.219,.150]){const frame=box(microwave,'Microwave vertical door frame',.016,.248,.014,dark);frame.position.set(xx,.166,.186);}
  const control=box(microwave,'Microwave ivory control column',.064,.264,.022,cream);control.position.set(.199,.165,.184);
  const doorSeal=box(microwave,'Microwave door control seam seal',.009,.264,.008,dark);doorSeal.position.set(.1625,.165,.184);
  const display=box(microwave,'Microwave small display',.046,.035,.004,dark);display.position.set(.199,.225,.198);
  const knob=cylinder(microwave,'Microwave setting knob',.016,.014,metal,16);knob.rotation.x=Math.PI/2;knob.position.set(.199,.105,.203);
  const handle=cylinder(microwave,'Microwave pull handle',.009,.14,metal,12);handle.position.set(.119,.162,.214);
  for(const yy of [.108,.215])rod(microwave,'Microwave handle mount',new THREE.Vector3(.119,yy,.187),new THREE.Vector3(.119,yy,.214),.005,metal);
  const turntableHub=cylinder(microwave,'Microwave turntable supporting hub',.023,.007,dark,16);turntableHub.position.set(-.040,.0395,0);
  const turntable=cylinder(microwave,'Microwave glass turntable',.126,.008,glassMat,28);turntable.position.set(-.040,.047,0);
  const cooker=group('V7 countertop rice cooker');cooker.position.copy(P(954,375,worktop));appliances.push(cooker);
  const cookerBase=cylinder(cooker,'Rice cooker supported base',.111,.018,dark,32);cookerBase.position.y=.009;
  const cookerBody=cylinder(cooker,'Rice cooker cream insulated body',.129,.177,cream,32);cookerBody.position.y=.1065;
  const cookerLid=mesh(new THREE.SphereGeometry(1,24,12),white,cooker,'Rice cooker curved lid');cookerLid.scale.set(.130,.036,.130);cookerLid.position.y=.202;
  const lidGrip=box(cooker,'Rice cooker lid handle',.064,.022,.023,metal);lidGrip.position.y=.240;
  for(const xx of [-.138,.138]){const grip=box(cooker,'Rice cooker side grip',.040,.022,.069,dark);grip.position.set(xx,.15,0);}
  const cookerSwitch=box(cooker,'Rice cooker front switch',.044,.025,.011,dark);cookerSwitch.position.set(-.123,.080,0);cookerSwitch.rotation.y=-Math.PI/2;
  const hobProps=group('V7 everyday kitchen cookware');
  const potPos=P(959,429,.9515);cookingPot(hobProps,'Hob cooking pot',potPos.x,potPos.y,potPos.z,.092,.12);
  const panPos=P(944,411,.9515);cookingPot(hobProps,'Hob shallow frying pan',panPos.x,panPos.y,panPos.z,.105,.035);
  const handleStart=panPos.clone().add(new THREE.Vector3(-.09,.025,0)),handleEnd=panPos.clone().add(new THREE.Vector3(-.24,.035,0));rod(hobProps,'Frying pan insulated long handle',handleStart,handleEnd,.015,dark);
  const bowlsPos=P(954,394,worktop);for(let i=0;i<3;i++)bowl(hobProps,'Countertop nested serving bowl',bowlsPos.x,bowlsPos.y+i*.024,bowlsPos.z,.083);
  const tools=group('V7 countertop utensil crock');tools.position.copy(P(964,443,worktop));const crock=mesh(new THREE.CylinderGeometry(.052,.045,.13,24,1,true),white,tools,'Utensil crock hollow sides');crock.position.y=.065;const crockBase=cylinder(tools,'Utensil crock bottom',.045,.009,white,20);crockBase.position.y=.0045;
  for(let i=0;i<4;i++){const x=(i-1.5)*.018;rod(tools,'Wooden utensil handle',new THREE.Vector3(x,.012,0),new THREE.Vector3(x,.26,.01),.007,oak);const head=mesh(new THREE.SphereGeometry(1,12,8),oak,tools,i%2?'Wooden cooking spatula':'Wooden serving spoon');head.scale.set(i%2?.021:.018,i%2?.032:.022,.007);head.position.set(x,.27,.010);}

  // Door motion keeps the actual wall/furniture footprints; one kitchen leaf opens at a time.
  const blockers=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(!o.isMesh||o.userData.cabinetContent||o.userData.category==='floor'||o.material?.transparent||/skirting|folded|hanging|hanger|rail mounting|pantry jar|cup|plate|pot|saucepan|bowl|shelf|router|aerial|clothing/i.test(raw(o)))return;const b=new THREE.Box3().setFromObject(o);if(!b.isEmpty()&&b.max.y>.11&&b.min.y<2.5)blockers.push({object:o,owner:o.parent,bounds:b});});
  function polygon(o){o.updateWorldMatrix(true,false);o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;return [[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]].map(([x,z])=>new THREE.Vector3(x,0,z).applyMatrix4(o.matrixWorld));}
  function overlap(a,b,tolerance=.002){const axes=[new THREE.Vector2(1,0),new THREE.Vector2(0,1)];for(let i=0;i<2;i++){const dx=a[i+1].x-a[i].x,dz=a[i+1].z-a[i].z;axes.push(new THREE.Vector2(-dz,dx).normalize());}for(const axis of axes){const pa=a.map(p=>p.x*axis.x+p.z*axis.y),pb=b.map(p=>p.x*axis.x+p.z*axis.y);if(Math.min(Math.max(...pa),Math.max(...pb))-Math.max(Math.min(...pa),Math.min(...pb))<=tolerance)return false;}return true;}
  function clashes(d){const hits=[];
    for(const part of [d.leaf,d.handle]){const b=new THREE.Box3().setFromObject(part),p=polygon(part);
      for(const obstacle of blockers){if(obstacle.owner===d.owner)continue;const q=obstacle.bounds;if(b.max.y<=q.min.y+.002||b.min.y>=q.max.y-.002||!b.intersectsBox(q))continue;const rect=[{x:q.min.x,z:q.min.z},{x:q.max.x,z:q.min.z},{x:q.max.x,z:q.max.z},{x:q.min.x,z:q.max.z}];if(overlap(p,rect))hits.push(raw(obstacle.object));}
      for(const roomDoor of house?.doors||[]){if(!roomDoor.leaf?.isMesh)continue;const q=new THREE.Box3().setFromObject(roomDoor.leaf);if(b.intersectsBox(q)&&overlap(p,polygon(roomDoor.leaf)))hits.push(roomDoor.label);}
    }
    return [...new Set(hits)];
  }
  const sweep=[];for(const d of doors){const findings=[];let limit=1;for(let step=0;step<=18;step++){d.apply(step/18);const hits=clashes(d);if(hits.length){findings.push({angleDegrees:step*5,hits});limit=Math.max(0,(step-1)/18);break;}}d.maxAllowed=limit;d.apply(0);sweep.push({id:d.id,maxOpenDegrees:Math.round(limit*90),collisions:findings});}
  // Restored fractions are clamped to the checked arc; one active leaf per family is retained.
  const restored=new Map();for(const d of doors){const value=Number(getState()?.doors?.[d.id]??0);if(Number.isFinite(value)&&value>.001)restored.set(d.family,{door:d,value:Math.min(value,d.maxAllowed)});}
  for(const {door,value} of restored.values()){door.target=value;door.apply(value);}
  function update(dt){if(disposed)return;dt=Math.max(0,Math.min(.05,Number(dt)||0));
    if(pendingDoor&&!doors.some(d=>d!==pendingDoor&&d.family===pendingDoor.family&&d.amount>.01)){pendingDoor.target=Math.min(1,pendingDoor.maxAllowed);persistDoor(pendingDoor);pendingDoor=null;}
    for(const d of doors){if(Math.abs(d.amount-d.target)<.0001)continue;const before=d.amount,next=before+(d.target-before)*(1-Math.exp(-dt*8));d.apply(Math.abs(next-d.target)<.0002?d.target:next);if(clashes(d).length){d.apply(before);if(!d.blocked){toast('柜门前有物品，先保留当前开度');d.blocked=true;}}else d.blocked=false;}
  }
  function reset(){pendingDoor=null;for(const d of doors){d.target=0;d.apply(0);}const values={...(getState()?.doors||{})};for(const d of doors)values[d.id]=0;setState({doors:values});}
  const audit={sourceGLBUnchanged:true,wardrobes:wardrobeSpecs.map(s=>({name:s.name,boundsPlan:[s.x1,s.z1,s.x2,s.z2]})),repairs,cabinetCount:cabinets.length,interactiveDoors:doors.length,contents:['linen dresses','evening gowns','collared shirts','tailored suits with trousers','oil and seasoning bottles','dry goods jars','ceramic mugs and tableware','fork knife spoon trays','biscuits and snack packets'],doorSweep:sweep,appliances:['countertop microwave','rice cooker','hob pot','frying pan','serving bowls','utensil crock'],notes:['All geometry is conceptual and follows the recovered plan; no construction dimensions are implied.','Wardrobe doors use 60mm side stiles so open handles remain within adjacent-wall clearances.','Opposing kitchen doors open sequentially to preserve hinge clearance.','Fixed cabinet cases and contents live in model for pre-optimization collision capture; moving leaves remain outside static batching.']};
  audit.mirror={type:'live-planar',count:mirrors.length,mobileTarget:[256,512],desktopTarget:[512,1024],mobileMaxHz:6.25,desktopMaxHz:10,shadowMapsReused:true};
  function dispose(){if(disposed)return;disposed=true;for(const [o,s] of originals){s.parent?.add(o);o.position.copy(s.position);o.quaternion.copy(s.rotation);o.scale.copy(s.scale);o.visible=s.visible;}mirrors.forEach(m=>m.target?.dispose());roots.forEach(r=>r.removeFromParent());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  return {update,colliderRoots,doors,cabinets,repairs,appliances,mirrors,audit,reset,dispose};
}
