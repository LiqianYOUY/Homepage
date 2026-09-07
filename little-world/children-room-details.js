import {optimizeScene} from './optimize-scene.js';

// Small, reversible belongings for the window desks and entrance storage.
// Furniture owns the placement anchors, keeping belongings on their supporting surfaces.
export function setupChildrenRoomDetails({THREE,model,renovation}){
  const root=new THREE.Group();root.name='Children room · soft toys and study belongings';root.userData.category='decor';model.add(root);
  const geometries=new Set(),materials=new Set(),studySets=[],toys=[];let disposed=false,finalized=false;
  function material(name,color,roughness=.88){const m=new THREE.MeshStandardMaterial({color,roughness});m.name='Children belongings '+name;materials.add(m);return m;}
  const cream=material('warm cotton',0xeee5d3,1),paper=material('ivory pages',0xf6f0df),mint=material('mint canvas',0x97b1a1,1),blue=material('mist blue',0x91a9b8),sand=material('teddy honey',0xb99874,1),pink=material('blush stitching',0xc99786),graphite=material('graphite',0x454840),oak=material('pencil wood',0xc6ad87),rule=material('soft ruled lines',0xa5b5ad);
  const sphere=new THREE.SphereGeometry(1,12,8),cube=new THREE.BoxGeometry(1,1,1);geometries.add(sphere);geometries.add(cube);
  function group(name,parent=root){const g=new THREE.Group();g.name=name;g.userData.category='decor';parent.add(g);return g;}
  function mesh(parent,name,geometry,m){geometries.add(geometry);const o=new THREE.Mesh(geometry,m);o.name=name;o.userData={name,category:'decor'};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(parent,name,w,h,d,m,at){const o=mesh(parent,name,cube,m);o.scale.set(w,h,d);o.position.set(...at);return o;}
  function soft(parent,name,size,m,at){const o=mesh(parent,name,sphere,m);o.scale.set(...size);o.position.set(...at);return o;}
  function rod(parent,name,start,end,r,m,segments=6){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),direction=b.clone().sub(a);const o=mesh(parent,name,new THREE.CylinderGeometry(r,r,direction.length(),segments),m);o.position.copy(a.add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return o;}
  function tube(parent,name,points,r,m){return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,5,false),m);}
  function roundedBox(parent,name,w,h,d,m,at){const radius=Math.min(w,h)*.18,s=new THREE.Shape(),x=-w/2,y=-h/2;
    s.moveTo(x+radius,y);s.lineTo(x+w-radius,y);s.quadraticCurveTo(x+w,y,x+w,y+radius);s.lineTo(x+w,y+h-radius);s.quadraticCurveTo(x+w,y+h,x+w-radius,y+h);s.lineTo(x+radius,y+h);s.quadraticCurveTo(x,y+h,x,y+h-radius);s.lineTo(x,y+radius);s.quadraticCurveTo(x,y,x+radius,y);
    const bevel=Math.min(.007,d/4),g=new THREE.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,steps:1,curveSegments:3});g.translate(0,0,-d/2+bevel);const o=mesh(parent,name,g,m);o.position.set(...at);return o;
  }
  // Copy the furniture frame into our root so disposal removes every addition together.
  function aligned(name,reference){model.updateWorldMatrix(true,true);const g=group(name),matrix=new THREE.Matrix4().multiplyMatrices(root.matrixWorld.clone().invert(),reference.matrixWorld);matrix.decompose(g.position,g.quaternion,g.scale);return g;}
  const boxData=b=>({min:b.min.toArray(),max:b.max.toArray()});
  function localBounds(object,reference){reference.updateWorldMatrix(true,false);object.updateWorldMatrix(true,true);const inverse=reference.matrixWorld.clone().invert(),b=new THREE.Box3();object.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();b.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));});return b;}

  function pencil(parent,name,x,y,z,m,length=.15){const g=group(name,parent);g.position.set(x,y,z);
    rod(g,name+' painted hexagonal body',[0,0,0],[0,length-.022,0],.004,m);
    const wood=mesh(g,name+' sharpened wood',new THREE.ConeGeometry(.004,.018,6),oak);wood.position.y=length-.014;
    const point=mesh(g,name+' graphite point',new THREE.ConeGeometry(.0015,.006,6),graphite);point.position.y=length-.002;
    return g;
  }
  function closedBook(parent,name,x,y,z,m,angle=0){const g=group(name,parent);g.position.set(x,y,z);g.rotation.y=angle;
    box(g,name+' bottom cover',.17,.003,.115,m,[0,.0015,0]);box(g,name+' paper block',.160,.011,.106,paper,[.002,.010,0]);box(g,name+' top cover',.17,.003,.115,m,[0,.0185,0]);box(g,name+' cloth spine',.007,.02,.115,m,[-.0815,.010,0]);
    box(g,name+' cover title line',.070,.001,.004,cream,[.012,.0205,-.011]);box(g,name+' cover short line',.041,.001,.003,cream,[.012,.0205,.007]);return g;
  }
  for(const [index,deskFrame] of (renovation?.childrenDesks||[]).entries()){
    const desk=deskFrame.desktop,notebook=deskFrame.notebook;if(!desk||!notebook)continue;
    const g=aligned('Children window desk '+(index+1)+' study supplies',deskFrame),deskBounds=localBounds(desk,deskFrame),y=deskBounds.max.y;
    if(deskFrame.studyWidth){deskBounds.min.x=Math.max(deskBounds.min.x,-deskFrame.studyWidth/2);deskBounds.max.x=Math.min(deskBounds.max.x,deskFrame.studyWidth/2);}
    const accent=index===0?mint:blue;
    // Enrich the existing open notebook instead of stacking a second book in the writing space.
    const n=localBounds(notebook,deskFrame),c=n.getCenter(new THREE.Vector3()),top=n.max.y+.001;
    for(const side of [-1,1]){
      const page=box(g,'Children open homework page',.079,.0015,.129,paper,[c.x+side*.044,top,c.z]);page.rotation.z=side*.018;
      for(let line=0;line<4;line++)box(g,'Children workbook handwriting guide',.054,.0007,.0011,rule,[c.x+side*.044,top+.0016,c.z-.042+line*.021]);
      box(g,'Children workbook page margin',.001,.0007,.102,pink,[c.x+side*.069,top+.0017,c.z]);
    }
    box(g,'Children workbook sum horizontal',.012,.0008,.0012,graphite,[c.x+.025,top+.0022,c.z-.012]);box(g,'Children workbook sum vertical',.0012,.0008,.012,graphite,[c.x+.025,top+.0022,c.z-.012]);
    for(const dz of [-.0025,.0025])box(g,'Children workbook equals mark',.011,.0008,.0012,graphite,[c.x+.055,top+.0022,c.z-.012+dz]);
    const stackX=deskBounds.min.x+.16,stackZ=deskBounds.min.z+.128;
    closedBook(g,'Children study reading book',stackX,y,stackZ,accent,-.045);closedBook(g,'Children study slim exercise book',stackX+.012,y+.021,stackZ+.008,cream,.075);
    const cup=group('Children open pencil cup',g);cup.position.set(deskBounds.max.x-.21,y,deskBounds.min.z+.13);
    const profile=[[0,0],[.041,0],[.045,.088],[.039,.09],[.035,.009],[0,.009]].map(p=>new THREE.Vector2(...p));mesh(cup,'Children pencil cup hollow shell',new THREE.LatheGeometry(profile,12),accent);
    for(let i=0;i<4;i++){const a=i*Math.PI/2,p=pencil(cup,'Children upright coloured pencil '+(i+1),Math.cos(a)*.021,.011,Math.sin(a)*.021,[pink,blue,mint,oak][i],.14+i*.012);p.rotation.z=Math.cos(a)*.07;p.rotation.x=Math.sin(a)*.055;}
    const writing=pencil(g,'Children loose writing pencil',c.x+.14,y+.006,c.z-.078,oak,.145);writing.rotation.x=Math.PI/2;writing.rotation.z=-.11;
    const rulerX=c.x+.30,rulerZ=deskBounds.max.z-.051;box(g,'Children wooden ruler',.205,.005,.024,oak,[rulerX,y+.0025,rulerZ]);
    for(let i=0;i<=10;i++)box(g,'Children ruler measurement tick',.001,.0007,i%5===0?.010:.005,graphite,[rulerX-.09+i*.018,y+.0055,rulerZ-.005]);
    box(g,'Children two-tone eraser',.036,.013,.024,cream,[c.x-.18,y+.0065,c.z+.015]);box(g,'Children eraser paper sleeve',.021,.014,.0245,accent,[c.x-.18,y+.007,c.z+.015]);
    studySets.push({object:g,deskFrame,desktop:deskBounds});
  }

  let rabbit=null,bear=null,backpack=null;
  const anchors=renovation?.childrenBelongingAnchors;
  if(renovation?.childrenDropZone&&anchors){
    const quiet=aligned('Children entrance little companions',renovation.childrenDropZone);
    const place=(object,anchor)=>{object.position.set(...anchor.position);object.rotation.y=anchor.rotationY||0;};
    rabbit=group('Children entrance plush rabbit',quiet);place(rabbit,anchors.rabbit);
    soft(rabbit,'Plush rabbit pear-shaped body',[.091,.121,.079],cream,[0,.126,0]);soft(rabbit,'Plush rabbit round head',[.099,.091,.084],cream,[0,.285,.004]);
    for(const side of [-1,1]){
      const ear=soft(rabbit,'Plush rabbit long floppy ear',[.026,.112,.022],cream,[side*.043,.414,.005]);ear.rotation.z=side*-.14;
      const inside=soft(rabbit,'Plush rabbit pink inner ear',[.013,.080,.008],pink,[side*.044,.416,.023]);inside.rotation.z=side*-.14;
      soft(rabbit,'Plush rabbit seated foot',[.043,.029,.056],cream,[side*.055,.029,.058]);const arm=soft(rabbit,'Plush rabbit soft arm',[.031,.068,.031],cream,[side*.092,.148,.026]);arm.rotation.z=side*.35;
      soft(rabbit,'Plush rabbit stitched eye',[.005,.006,.003],graphite,[side*.033,.292,.083]);
    }
    soft(rabbit,'Plush rabbit stitched nose',[.008,.006,.005],pink,[0,.268,.09]);rod(rabbit,'Plush rabbit mouth stitch',[0,.264,.090],[0,.253,.090],.0014,graphite);
    soft(rabbit,'Plush rabbit cotton belly',[.058,.073,.008],mint,[0,.125,.077]);soft(rabbit,'Plush rabbit pom-pom tail',[.033,.033,.033],cream,[0,.102,-.082]);toys.push(rabbit);
    bear=group('Children entrance plush teddy bear',quiet);place(bear,anchors.bear);
    soft(bear,'Teddy bear soft body',[.084,.105,.073],sand,[0,.112,0]);soft(bear,'Teddy bear round head',[.084,.078,.073],sand,[0,.255,0]);
    for(const side of [-1,1]){
      soft(bear,'Teddy bear round ear',[.031,.031,.022],sand,[side*.066,.31,0]);soft(bear,'Teddy bear inner ear',[.018,.018,.006],cream,[side*.066,.311,.019]);
      soft(bear,'Teddy bear seated paw',[.038,.028,.052],sand,[side*.049,.028,.053]);const arm=soft(bear,'Teddy bear soft arm',[.029,.066,.030],sand,[side*.082,.137,.008]);arm.rotation.z=side*.29;
      soft(bear,'Teddy bear stitched eye',[.0048,.0056,.003],graphite,[side*.031,.269,.069]);
    }
    soft(bear,'Teddy bear cream muzzle',[.034,.025,.020],cream,[0,.239,.070]);soft(bear,'Teddy bear stitched nose',[.009,.006,.005],graphite,[0,.249,.089]);rod(bear,'Teddy bear mouth stitch',[0,.244,.091],[0,.234,.091],.0013,graphite);
    for(const side of [-1,1]){const bow=soft(bear,'Teddy bear mist-blue ribbon',[.031,.016,.012],blue,[side*.026,.188,.067]);bow.rotation.z=side*.32;}soft(bear,'Teddy bear ribbon knot',[.011,.013,.011],blue,[0,.188,.075]);toys.push(bear);
    const bagShelf=renovation.childrenBookcases?.[1]?aligned('Children window bookcase schoolbag',renovation.childrenBookcases[1]):quiet;
    backpack=group('Children small mint backpack on bookcase shelf',bagShelf);place(backpack,anchors.backpack);
    roundedBox(backpack,'Children backpack padded main bag',.22,.285,.102,mint,[0,.150,0]);roundedBox(backpack,'Children backpack front zip pocket',.156,.090,.024,blue,[0,.076,.062]);
    rod(backpack,'Children backpack pocket zip',[-.062,.114,.081],[.062,.114,.081],.0023,cream);
    tube(backpack,'Children backpack little zipper pull',[[.052,.114,.085],[.058,.098,.089],[.063,.102,.090]],.0023,oak);
    for(const side of [-1,1])tube(backpack,'Children backpack curved shoulder strap',[[side*.068,.267,-.052],[side*.095,.223,-.083],[side*.093,.115,-.088],[side*.068,.045,-.052]],.009,blue);
    tube(backpack,'Children backpack top carry loop',[[-.037,.294,0],[-.035,.327,0],[.035,.327,0],[.037,.294,0]],.006,blue);
    roundedBox(backpack,'Children backpack cream name patch',.073,.034,.002,cream,[0,.212,.057]);rod(backpack,'Children backpack name patch stitch',[-.022,.212,.061],[.022,.212,.061],.0013,rule);
  }
  model.updateWorldMatrix(true,true);
  let meshCount=0,triangles=0;root.traverse(o=>{if(!o.isMesh)return;meshCount++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  const audit={studySets:studySets.map(s=>({name:s.object.name,desktopInDesk:boxData(s.desktop),suppliesInDesk:boxData(localBounds(s.object,s.deskFrame))})),plushToys:toys.map(o=>({name:o.name,bounds:boxData(new THREE.Box3().setFromObject(o))})),backpack:backpack?{name:backpack.name,bounds:boxData(new THREE.Box3().setFromObject(backpack))}:null,meshCount,triangles,category:'decor',addsColliders:false,externalAssets:0};
  // Run after spatial checks/collision capture, before the apartment-wide optimizer.
  // Local batches stay owned by this module, including any unmerged single mesh.
  function finalize(){
    if(disposed||finalized)return audit.optimization||null;
    const optimization=optimizeScene({THREE,model:root});
    root.traverse(o=>{if(o.isMesh){o.userData.noMerge=true;geometries.add(o.geometry);}});
    finalized=true;audit.optimization=optimization;audit.meshCount=optimization.after.meshes;audit.triangles=optimization.after.triangles;
    return optimization;
  }
  return {root,audit,studySets,toys,backpack,finalize,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
