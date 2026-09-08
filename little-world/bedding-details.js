import {optimizeScene} from './optimize-scene.js';

/** Tailored, reversible textiles fitted to the actual four mattresses.
 * Install after room-renovation and furniture scaling, before optimizeScene.
 * All additions are decor: the existing bed frames keep owning walk collisions.
 */
export function setupBeddingDetails({THREE,model}={}){
  if(!THREE||!model?.isObject3D)throw new TypeError('Bedding details need THREE and the apartment model.');
  const root=new THREE.Group();root.name='Bedrooms · layered cotton bedding';root.userData.category='decor';model.add(root);
  const geometries=new Set(),materials=new Set(),originals=[],beds=[];let disposed=false,finalized=false;
  const raw=o=>o.userData?.name||o.name||'',source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  const group=(name,parent=root)=>{const g=new THREE.Group();g.name=name;g.userData.category='decor';parent.add(g);return g;};
  function material(name,color){const m=new THREE.MeshStandardMaterial({color,roughness:1});m.name='Bedding '+name;materials.add(m);return m;}
  const ivory=material('warm ivory cotton',0xeae3d6),cream=material('cream pillow piping',0xf3ecdf),sand=material('oatmeal woven linen',0xc7b395),sage=material('sage cotton duvet',0xa2b2a0),sageSeam=material('sage topstitch',0x8e9e8c),blue=material('mist blue cotton duvet',0x96aebc),blueSeam=material('mist blue topstitch',0x7f99a9),clay=material('dusty terracotta weave',0xb88b78),claySeam=material('terracotta topstitch',0xc99f8b),sandSeam=material('oatmeal topstitch',0xddcbb0);
  function mesh(parent,name,geometry,mat){geometries.add(geometry);const o=new THREE.Mesh(geometry,mat);o.name=name;o.userData={name,category:'decor',noMerge:true};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function tube(parent,name,points,r,mat,closed=false){return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed,'centripetal'),Math.max(4,points.length),r,4,closed),mat);}
  const bounds=o=>new THREE.Box3().setFromObject(o),boxData=b=>({min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()});

  // A closed cloth volume with compressed edges, rounded corners and irregular
  // shallow folds. Top and underside meet at their own seam, without open faces.
  function cloth(parent,name,{width,length,base=0,thickness=.018,puff=.04,wrinkle=.004,phase=0,nx=20,nz=18},mat,at=[0,0,0]){
    const edge=(u,v)=>Math.pow(Math.max(0,(1-u*u)*(1-v*v)),.45);
    function point(u,v,top=true){
      const e=edge(u,v),x=u*width/2*(1-.035*Math.pow(Math.abs(v),8)),z=v*length/2*(1-.035*Math.pow(Math.abs(u),8));
      const fold=wrinkle*(Math.sin(14*u+3*v+phase)+.45*Math.sin(23*v-4*u+phase))*e;
      const y=top?base+thickness+puff*e+fold:base+.002*e;
      return [x,y,z];
    }
    const positions=[],indices=[],stride=nx+1,layer=(nx+1)*(nz+1);
    for(const top of [true,false])for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)positions.push(...point(i/nx*2-1,j/nz*2-1,top));
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
      const a=j*stride+i,b=a+1,c=a+stride,d=c+1;
      indices.push(a,c,b,b,c,d,a+layer,b+layer,c+layer,b+layer,d+layer,c+layer);
    }
    const perimeter=[];for(let i=0;i<=nx;i++)perimeter.push(i);for(let j=1;j<=nz;j++)perimeter.push(j*stride+nx);for(let i=nx-1;i>=0;i--)perimeter.push(nz*stride+i);for(let j=nz-1;j>0;j--)perimeter.push(j*stride);
    for(let i=0;i<perimeter.length;i++){const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];indices.push(a,b,a+layer,b,b+layer,a+layer);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const object=mesh(parent,name,geometry,mat);object.position.set(...at);
    return {object,point:(u,v,lift=0)=>{const p=point(u,v);return [p[0]+at[0],p[1]+at[1]+lift,p[2]+at[2]];},width,length};
  }
  function hem(parent,name,pad,mat,r=.0024){const points=[];for(let i=0;i<12;i++)points.push(pad.point(-1+i/6,-1));for(let i=0;i<12;i++)points.push(pad.point(1,-1+i/6));for(let i=0;i<12;i++)points.push(pad.point(1-i/6,1));for(let i=0;i<12;i++)points.push(pad.point(-1,1-i/6));tube(parent,name,points,r,mat,true);}
  function surfaceLine(parent,name,pad,mat,u,vStart=-.95,vEnd=.95,r=.0015){const points=[];for(let j=0;j<=14;j++)points.push(pad.point(u,vStart+(vEnd-vStart)*j/14,.001));tube(parent,name,points,r,mat);}
  const specs=[
    {id:'master',label:'Master king',match:n=>n==='Master king bed mattress',textiles:n=>/^Master king bed (pillow|duvet|throw)$/.test(n),duvet:sage,seam:sageSeam,throw:sand,throwSeam:sandSeam},
    {id:'guest',label:'Bedroom 2 queen',match:n=>n==='Bedroom 2 queen bed mattress',textiles:n=>/^Bedroom 2 queen bed (pillow|duvet|throw)$/.test(n),duvet:ivory,seam:sandSeam,throw:blue,throwSeam:blueSeam},
    {id:'children-lower',label:'Children lower bunk',match:n=>n==='Children bunk lower wide mattress',textiles:n=>/^Children bunk lower (sage duvet|soft pillow|folded foot blanket)$/.test(n),duvet:sage,seam:sageSeam,throw:sand,throwSeam:sandSeam,child:true},
    {id:'children-upper',label:'Children upper bunk',match:n=>n==='Children bunk upper single mattress',textiles:n=>/^Children bunk upper (blue duvet|soft pillow|folded foot blanket)$/.test(n),duvet:blue,seam:blueSeam,throw:clay,throwSeam:claySeam,child:true}
  ];
  for(const spec of specs){
    const mattress=source.find(o=>spec.match(raw(o)));if(!mattress)continue;
    const replaced=source.filter(o=>spec.textiles(raw(o))),oldPillows=replaced.filter(o=>/pillow/.test(raw(o)));
    const mattressBounds=bounds(mattress),center=mattressBounds.getCenter(new THREE.Vector3());
    // Derive the bed head from its existing pillows. This also handles the
    // renovated bunk's rotated parent, without baking in room coordinates.
    const up=new THREE.Vector3(0,1,0).transformDirection(model.matrixWorld),head=new THREE.Vector3();
    for(const pillow of oldPillows)head.add(bounds(pillow).getCenter(new THREE.Vector3()));
    if(oldPillows.length)head.multiplyScalar(1/oldPillows.length).sub(center);else head.set(0,0,1).transformDirection(model.matrixWorld);
    head.addScaledVector(up,-head.dot(up)).normalize();const right=new THREE.Vector3().crossVectors(up,head).normalize();
    const basis=new THREE.Matrix4().makeBasis(right,up,head);basis.setPosition(center);
    const g=group(spec.label+' tailored bedding'),localMatrix=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),basis);localMatrix.decompose(g.position,g.quaternion,g.scale);g.updateWorldMatrix(true,false);
    const inverse=basis.clone().invert(),localMattress=new THREE.Box3();mattress.geometry.computeBoundingBox();const mb=mattress.geometry.boundingBox;
    for(const x of [mb.min.x,mb.max.x])for(const y of [mb.min.y,mb.max.y])for(const z of [mb.min.z,mb.max.z])localMattress.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(mattress.matrixWorld).applyMatrix4(inverse));
    const size=localMattress.getSize(new THREE.Vector3()),w=size.x,l=size.z,top=localMattress.max.y;
    basis.setPosition(center.clone().addScaledVector(up,top));localMatrix.multiplyMatrices(root.matrixWorld.clone().invert(),basis).decompose(g.position,g.quaternion,g.scale);g.updateWorldMatrix(true,true);
    for(const object of replaced){originals.push({object,parent:object.parent});object.removeFromParent();}

    const sheet=cloth(g,spec.label+' fitted sheet and tucked corners',{width:w+.006,length:l+.006,base:-.075,thickness:.078,puff:.003,wrinkle:.001,nx:12,nz:16},ivory);
    hem(g,spec.label+' fitted sheet perimeter seam',sheet,cream,.0015);
    const quiltLength=l*.735,quiltZ=-l*.115,quiltWidth=spec.child?w-.040:w+.020;
    const quilt=cloth(g,spec.label+' softly billowing duvet',{width:quiltWidth,length:quiltLength,base:.007,thickness:.017,puff:spec.child?.047:.073,wrinkle:.004,phase:beds.length*.8},spec.duvet,[0,0,quiltZ]);
    hem(g,spec.label+' duvet bound edge',quilt,spec.seam);
    for(const u of [-.66,-.33,0,.33,.66])surfaceLine(g,spec.label+' fine quilted channel',quilt,spec.seam,u,-.92,.88,.00125);
    // The turned-back cotton lip lies on the head end of the duvet. A broad
    // soft roll and its double seam read clearly without rigid rectangular slabs.
    const foldZ=quiltZ+quiltLength/2-.105;
    const fold=cloth(g,spec.label+' turned-back cotton duvet cuff',{width:quiltWidth-.008,length:.22,base:.033,thickness:.018,puff:.023,wrinkle:.002,nx:20,nz:6},spec.id==='guest'?sand:ivory,[0,0,foldZ]);
    hem(g,spec.label+' duvet cuff double stitching',fold,spec.id==='guest'?sandSeam:cream,.0019);

    const pillowCount=w<1.05?1:2,pillowWidth=Math.min(.70,(w-.12)/pillowCount-.045),pillowDepth=spec.child?.40:.44;
    for(let i=0;i<pillowCount;i++){
      const pillow=group(spec.label+' cotton pillow '+(i+1),g),px=pillowCount===1?0:(i-.5)*w*.49;
      pillow.position.set(px,.012,l/2-pillowDepth/2-.055);pillow.rotation.y=(i===0?1:-1)*.028;
      const pad=cloth(pillow,spec.label+' plump pillowcase '+(i+1),{width:pillowWidth,length:pillowDepth,base:0,thickness:.020,puff:spec.child?.071:.10,wrinkle:.0018,nx:16,nz:12},ivory);
      hem(pillow,spec.label+' pillowcase piped border '+(i+1),pad,cream,.003);
      surfaceLine(pillow,spec.label+' pillowcase envelope seam '+(i+1),pad,sandSeam,.77,-.9,.9,.0014);
      // Short asymmetrical creases pinch towards the piped corners.
      for(const [u,v,sign] of [[-.83,-.69,-1],[.82,.64,1]]){
        const points=[];for(let step=0;step<=5;step++)points.push(pad.point(u+(sign*.10)*step/5,v+(sign*.20)*step/5,.0008));
        tube(pillow,spec.label+' pillowcase corner crease',points,.0012,sandSeam);
      }
    }

    const throwLength=spec.child?.29:.40,throwZ=-l/2+throwLength/2+.065,throwWidth=spec.child?w-.06:w-.01;
    const throwBase=.041;
    const throwPad=cloth(g,spec.label+' folded woven bed-end blanket',{width:throwWidth,length:throwLength,base:throwBase,thickness:.019,puff:.036,wrinkle:.003,phase:.4,nx:22,nz:8},spec.throw,[0,0,throwZ]);
    hem(g,spec.label+' blanket folded selvedge',throwPad,spec.throwSeam,.0025);
    const ribs=Math.round(throwWidth/.062);
    for(let i=1;i<ribs;i++)surfaceLine(g,spec.label+' subtle woven blanket rib',throwPad,spec.throwSeam,-1+2*i/ribs,-.91,.91,.0012);
    for(let i=0;i<Math.floor(throwWidth/.045);i++){
      const u=-.90+1.8*i/Math.max(1,Math.floor(throwWidth/.045)-1),p=throwPad.point(u,-1,.002);
      tube(g,spec.label+' short cotton blanket fringe',[p,[p[0]+.003,p[1]-.004,p[2]-.011],[p[0]-.002,p[1]-.010,p[2]-.024]],.0016,spec.throwSeam);
    }
    // Three small appliqued stars distinguish each child's bedding using calm
    // tonal thread. They sit on the measured duvet surface, clear of the guard.
    if(spec.child)for(const [u,v] of [[-.45,-.22],[.35,.09],[-.1,.48]]){
      const points=[];for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?.017:.035;points.push(quilt.point(u+Math.cos(a)*r*2/quilt.width,v+Math.sin(a)*r*2/quilt.length,.0025));}
      tube(g,spec.label+' tonal embroidered star',points,.0018,cream,true);
    }
    model.updateWorldMatrix(true,true);
    beds.push({id:spec.id,object:g,mattress,pillowCount,child:!!spec.child,mattressDimensionsM:[w,l],mattressTopWorldM:bounds(mattress).max.y,bounds:boxData(bounds(g)),replacedParts:replaced.map(raw),features:['fitted sheet','softly billowing duvet','bound and quilted seams','turned-back cotton cuff','plump piped pillowcases','woven bed-end blanket','short cotton fringe',...(spec.child?['tonal embroidered stars']:[])]});
  }
  let meshCount=0,triangles=0;root.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  const audit={sourceGLBUnchanged:true,bedCount:beds.length,pillowCount:beds.reduce((sum,b)=>sum+b.pillowCount,0),replacedTextileParts:originals.length,beds:beds.map(({object,mattress,...bed})=>bed),category:'decor',addsColliders:false,externalAssets:0,meshCount,triangles};
  function finalize(){
    if(disposed||finalized)return audit.optimization||null;
    root.traverse(o=>{if(o.isMesh)o.userData.noMerge=false;});
    const optimization=optimizeScene({THREE,model:root});root.traverse(o=>{if(o.isMesh){o.userData.noMerge=true;geometries.add(o.geometry);}});
    finalized=true;audit.optimization=optimization;audit.meshCount=optimization.after.meshes;audit.triangles=optimization.after.triangles;return optimization;
  }
  return {root,beds,audit,finalize,dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const {object,parent} of originals)parent?.add(object);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
