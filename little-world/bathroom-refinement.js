// Replace capped primitives with hollow, continuous fixture shells before collision capture.
// Original GLB meshes and transforms are retained for disposal; no source asset is rewritten.
export function setupBathroomRefinement({THREE,model,house=null}){
  const root=new THREE.Group();root.name='Bathroom refinement · hollow fixtures';model.add(root);
  const source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  const raw=o=>o.userData?.name||o.name||'',find=n=>source.find(o=>raw(o)===n),named=n=>source.filter(o=>raw(o)===n);
  const originals=new Map(),geometries=new Set(),materials=new Set(),tapOriginals=[],fixtures=[],replaced=[],cutouts=[];
  const boxOf=o=>new THREE.Box3().setFromObject(o),serialBox=b=>({min:b.min.toArray(),max:b.max.toArray()});
  function remember(o){if(!originals.has(o))originals.set(o,{parent:o.parent,position:o.position.clone(),scale:o.scale.clone(),quaternion:o.quaternion.clone(),name:o.name,dataName:o.userData.name});}
  function remove(o){if(!o)return;remember(o);replaced.push(raw(o));o.removeFromParent();}
  function material(name,options){const m=new THREE.MeshStandardMaterial(options);m.name=name;materials.add(m);return m;}
  const ceramic=material('Bath warm glazed porcelain',{color:0xf1eee3,roughness:.26}),seatMaterial=material('Bath soft ivory toilet seat',{color:0xf5f0e4,roughness:.34}),steel=material('Bath brushed sink steel',{color:0x9aa6a4,roughness:.31,metalness:.72}),drainMetal=material('Bath drain brushed metal',{color:0x777d75,roughness:.38,metalness:.72});
  function group(name,position=[0,0,0]){const g=new THREE.Group();g.name=name;g.position.set(...position);root.add(g);return g;}
  function mesh(parent,name,geometry,mat,category='furniture'){geometries.add(geometry);const o=new THREE.Mesh(geometry,mat);o.name=name;o.userData={name,category};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(parent,name,w,h,d,mat,x,y,z,category='furniture'){const o=mesh(parent,name,new THREE.BoxGeometry(w,h,d),mat,category);o.position.set(x,y,z);return o;}
  function contour(rx,rz,count=64,power=.55,cx=0,cz=0){const points=[];for(let i=0;i<count;i++){const t=i/count*Math.PI*2,c=Math.cos(t),s=Math.sin(t);points.push([cx+rx*Math.sign(c)*Math.abs(c)**power,cz+rz*Math.sign(s)*Math.abs(s)**power]);}return points;}
  // Each profile walks from the underside, around the exterior/lip, then down the inner wall.
  // A centre floor is included, so looking into a bowl reveals depth rather than the room below it.
  function shellGeometry(profile,power=.55,count=64){
    const vertices=[],indices=[];for(const [rx,rz,y] of profile)for(const [x,z] of contour(rx,rz,count,power))vertices.push(x,y,z);
    for(let row=0;row<profile.length-1;row++)for(let i=0;i<count;i++){const a=row*count+i,b=row*count+(i+1)%count,c=a+count,d=b+count;indices.push(a,c,b,b,c,d);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function drain(g,name,x,y,z,r=.019){const d=mesh(g,name+' recessed drain',new THREE.CylinderGeometry(r,r,.004,20),drainMetal,'decor');d.position.set(x,y,z);for(const dx of [-.007,0,.007])box(g,name+' drain slot',.002,.001,r*1.10,steel,x+dx,y+.0025,z,'decor');return d;}
  function bowl({name,x,z,outerX,outerZ,top,bottom,floor,lip=.025,power=.55,mat=ceramic,kind='basin'}){
    const innerX=outerX-lip,innerZ=outerZ-lip,g=group(name,[x,0,z]);
    const profile=[[0,0,bottom],[outerX*.70,outerZ*.70,bottom],[outerX*.94,outerZ*.94,bottom+(top-bottom)*.38],[outerX,outerZ,top-.014],[outerX*.988,outerZ*.988,top],[innerX,innerZ,top],[innerX*.97,innerZ*.97,top-.027],[innerX*.73,innerZ*.72,floor+.018],[innerX*.63,innerZ*.63,floor],[0,0,floor]];
    const shell=mesh(g,name+' continuous hollow shell',shellGeometry(profile,power),mat);drain(g,name,0,floor+.002,0,kind==='bath'?.028:.017);
    const f={name,kind,object:g,shell,x,z,top,bottom,floor,depth:top-floor,innerX,innerZ,power};fixtures.push(f);return f;
  }
  function path(points){const p=new THREE.Path();p.moveTo(...points[0]);for(const v of points.slice(1))p.lineTo(...v);p.closePath();return p;}
  function perforatedSlab(old,holes,name=raw(old)){
    const b=boxOf(old),shape=new THREE.Shape();shape.moveTo(b.min.x,b.min.z);shape.lineTo(b.max.x,b.min.z);shape.lineTo(b.max.x,b.max.z);shape.lineTo(b.min.x,b.max.z);shape.closePath();
    for(const h of holes)shape.holes.push(path(contour(h.rx,h.rz,64,h.power??.55,h.x,h.z).reverse()));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:b.max.y-b.min.y,bevelEnabled:false,steps:1,curveSegments:1});geometry.rotateX(Math.PI/2);geometry.translate(0,b.max.y,0);
    const result=mesh(root,name+' · real bowl cutout',geometry,old.material,old.userData.category||'furniture');remove(old);cutouts.push({name,holes:holes.length,bounds:serialBox(b)});return result;
  }

  // The old tile stopped 64 cm short of the laundry's west wall, revealing the shared oak slab.
  const laundry=find('Laundry tile');let laundryFloor=null;
  if(laundry){const old=boxOf(laundry),west=boxOf(find('Kitchen study spine · cutaway')).max.x,east=old.max.x;
    laundryFloor=box(root,'Laundry continuous limestone tile floor',east-west,old.max.y-old.min.y,old.max.z-old.min.z,laundry.material,(east+west)/2,(old.min.y+old.max.y)/2,(old.min.z+old.max.z)/2,'floor');remove(laundry);
  }

  // Three small vanity basins are recessed into both the countertop and the cabinet's top mass.
  for(const prefix of ['Laundry sink','Bathroom2 vanity','Bathroom3 vanity']){
    const old=find(prefix+' basin'),top=find(prefix+' countertop'),body=find(prefix+' vanity');if(!old||!top||!body)continue;
    const bounds=boxOf(old),center=bounds.getCenter(new THREE.Vector3()),outerX=(bounds.max.x-bounds.min.x)/2,outerZ=(bounds.max.z-bounds.min.z)/2;
    const f=bowl({name:prefix+' inset basin',x:center.x,z:center.z,outerX,outerZ,top:.816,bottom:.602,floor:.622,lip:.022});
    const hole={x:center.x,z:center.z,rx:outerX-.012,rz:outerZ-.012,power:.55};perforatedSlab(top,[hole]);perforatedSlab(body,[hole]);remove(old);remove(find(prefix+' basin inset'));
  }
  // Both master basins share a genuinely perforated stone top; no flat cap remains beneath either.
  const masterHoles=[];
  for(const [i,old] of named('Master basin').sort((a,b)=>a.position.z-b.position.z).entries()){
    const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),outerX=(b.max.x-b.min.x)/2,outerZ=(b.max.z-b.min.z)/2;
    bowl({name:'Master basin '+(i+1),x:c.x,z:c.z,outerX,outerZ,top:.915,bottom:.716,floor:.736,lip:.026});
    masterHoles.push({x:c.x,z:c.z,rx:outerX-.012,rz:outerZ-.012});remove(old);
  }
  named('Master basin inset').forEach(remove);
  if(masterHoles.length){perforatedSlab(find('Master vanity stone'),masterHoles);perforatedSlab(find('Master double vanity'),masterHoles);}

  // A deep steel kitchen bowl also cuts through the stone and the new cabinet's fixed upper shelf.
  const island=find('Island sink rim');if(island){const b=boxOf(island),c=b.getCenter(new THREE.Vector3());
    bowl({name:'Kitchen island sink',x:c.x,z:c.z,outerX:.24,outerZ:.315,top:.9615,bottom:.690,floor:.715,lip:.026,power:.30,mat:steel});
    const hole={x:c.x,z:c.z,rx:.231,rz:.306,power:.30};perforatedSlab(find('Kitchen island stone waterfall top'),[hole]);
    // Source island mass exists before V7 cabinetry is installed; preserve its name for that replacement.
    // The sink bottom stays below the future upper shelf; that shelf is patched by finalizeCabinetry().
    remove(island);remove(find('Island sink bowl'));
  }

  // Re-proportion each toilet; keep a hollow ceramic pan and a separate open seat.
  for(const prefix of ['Bathroom2 toilet','Bathroom3 toilet','Master WC']){
    const old=find(prefix+' bowl'),seat=find(prefix+' seat');if(!old||!seat)continue;
    const c=seat.getWorldPosition(new THREE.Vector3()),q=seat.getWorldQuaternion(new THREE.Quaternion()),forward=new THREE.Vector3(0,0,.06).applyQuaternion(q);c.add(forward);const g=group(prefix+' hollow bowl',[c.x,0,c.z]);g.quaternion.copy(q);
    // Local axes also cover the sideways bathroom 3 toilet.
    // A domestic pan is roughly 400 mm high before its seat, not the former 563 mm.
    // Keep the bowl/seat as one open profile, with a low pedestal below the water trap.
    const shell=mesh(g,prefix+' continuous porcelain bowl',shellGeometry([[0,0,.18],[.128,.16,.18],[.172,.223,.275],[.190,.257,.366],[.186,.252,.402],[.132,.180,.402],[.129,.176,.386],[.092,.126,.270],[.057,.077,.240],[0,0,.240]],1),ceramic);
    const seatRing=mesh(g,prefix+' open annular toilet seat',shellGeometry([[.182,.245,.404],[.190,.252,.416],[.184,.247,.435],[.130,.177,.435],[.126,.173,.422],[.130,.177,.404],[.182,.245,.404]],1),seatMaterial);
    for(const xx of [-.10,.10])box(g,prefix+' seat hinge',.035,.021,.040,drainMetal,xx,.4245,-.227,'decor');
    drain(g,prefix,0,.243,.018,.023);fixtures.push({name:prefix,kind:'toilet',object:g,shell,x:c.x,z:c.z,top:.435,floor:.240,depth:.195,innerX:.126,innerZ:.173,power:1,seat:seatRing});
    const pedestal=find(prefix+' pedestal');if(pedestal){remember(pedestal);pedestal.scale.y*=.225/.4;pedestal.scale.x*=.88;pedestal.scale.z*=.86;pedestal.position.add(forward);pedestal.position.y=.1125;}
    const cistern=find(prefix+' cistern');if(cistern){remember(cistern);cistern.scale.y*=.40/.61;cistern.position.y=.60;}
    remove(old);remove(seat);remove(find(prefix+' opening'));
  }
  const bath=find('Master freestanding bath shell');if(bath){const b=boxOf(bath),c=b.getCenter(new THREE.Vector3());
    bowl({name:'Master freestanding bath',kind:'bath',x:c.x,z:c.z,outerX:.83,outerZ:.41,top:.605,bottom:.015,floor:.12,lip:.052,power:.72});
    remove(bath);remove(find('Master bath inner'));remove(find('Master bath water'));
  }
  // Shower floors slope down to a low drain instead of placing a dark dot over a flat box.
  for(const prefix of ['Master shower','Bathroom2 shower','Bathroom3 shower']){
    const old=find(prefix+' tray');if(!old)continue;const b=boxOf(old),c=b.getCenter(new THREE.Vector3()),rx=(b.max.x-b.min.x)/2,rz=(b.max.z-b.min.z)/2,g=group(prefix+' recessed tray',[c.x,0,c.z]);
    const shell=mesh(g,prefix+' sloped shower tray',shellGeometry([[0,0,.016],[rx,rz,.016],[rx,rz,.052],[rx-.028,rz-.028,.052],[rx-.047,rz-.047,.036],[.065,.065,.020],[0,0,.020]],.12),old.material);
    drain(g,prefix,0,.024,0,.032);fixtures.push({name:prefix,kind:'shower',object:g,shell,x:c.x,z:c.z,top:.052,floor:.02,depth:.032});remove(old);remove(find(prefix+' drain'));
  }
  model.updateWorldMatrix(true,true);

  // Keep running tap effects in the actual cavity: stream length, ripple and drops share its new impact.
  const ray=new THREE.Raycaster();
  for(const tap of house?.taps||[]){const f=tap.id==='tap-kitchen'?fixtures.find(f=>f.name==='Kitchen island sink'):fixtures.find(f=>f.name==='Master basin '+tap.id.match(/^tap-master-(\d)$/)?.[1]);if(!f)continue;
    ray.set(tap.nozzle.clone(),new THREE.Vector3(0,-1,0));const hit=ray.intersectObject(f.shell,false)[0];if(!hit)continue;
    tapOriginals.push({tap,impact:tap.impact.clone(),scale:tap.stream.scale.clone(),streamPosition:tap.stream.position.clone(),ripplePosition:tap.ripple.position.clone()});
    const oldLength=tap.nozzle.y-tap.impact.y;tap.impact.copy(hit.point).add(new THREE.Vector3(0,.003,0));const length=tap.nozzle.y-tap.impact.y;tap.stream.scale.y*=length/oldLength;tap.stream.position.copy(tap.nozzle).add(new THREE.Vector3(0,-length/2,0));tap.ripple.position.copy(tap.impact);
  }

  // The tub/vanity corner has just enough room for the original pot. Check every part at its true height.
  const plant=source.filter(o=>raw(o).startsWith('Master plant ')),pot=find('Master plant pot');let plantAudit={action:'absent'};
  if(pot){const oldCenter=pot.getWorldPosition(new THREE.Vector3()),target=new THREE.Vector3(-.59,oldCenter.y,4.53),delta=target.clone().sub(oldCenter),candidateBoxes=plant.map(o=>({object:o,bounds:boxOf(o).translate(delta)}));
    const obstacles=[];model.traverse(o=>{if(!o.isMesh||plant.includes(o)||['floor','decor','rug','ceilingMain','bedroomCurtain'].includes(o.userData.category)||o.userData.category?.startsWith('hvac'))return;const b=boxOf(o);if(b.min.y>1.5||b.max.y<.03)return;obstacles.push({name:raw(o),bounds:b});});
    const overlap=(a,b)=>Math.min(a.max.x,b.max.x)-Math.max(a.min.x,b.min.x)>.002&&Math.min(a.max.y,b.max.y)-Math.max(a.min.y,b.min.y)>.002&&Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)>.002;
    const collisions=[...new Set(candidateBoxes.flatMap(p=>obstacles.filter(o=>overlap(p.bounds,o.bounds)).map(o=>o.name)))];
    if(collisions.length){plant.forEach(remove);plantAudit={action:'removed',reason:'Tub/vanity corner has insufficient clearance',obstructions:collisions,previousCenter:oldCenter.toArray()};}
    else{for(const o of plant){remember(o);const position=o.getWorldPosition(new THREE.Vector3()).add(delta);o.position.copy(o.parent.worldToLocal(position));o.name=raw(o).replace('Master plant','Ensuite corner plant');o.userData.name=o.name;}
      plantAudit={action:'moved',previousCenter:oldCenter.toArray(),center:target.toArray(),obstructions:[]};}
  }
  // V7 rebuilds the kitchen island after this module. Remove only its shelf area over the sink cavity.
  function finalizeCabinetry(){const sink=fixtures.find(f=>f.name==='Kitchen island sink');if(!sink)return;const parts=[],dividers=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(!o.isMesh)return;const b=boxOf(o);if(raw(o)==='中岛储物柜 fixed case shelf'&&b.max.y>sink.floor&&b.min.y<sink.top)parts.push(o);
      if(raw(o)==='中岛储物柜 internal divider'&&b.max.y>sink.bottom&&b.min.x<sink.x+.24&&b.max.x>sink.x-.24&&b.min.z<sink.z+.315&&b.max.z>sink.z-.315)dividers.push(o);
    });
    for(const old of parts)perforatedSlab(old,[{x:sink.x,z:sink.z,rx:sink.innerX+.014,rz:sink.innerZ+.014,power:.30}]);
    for(const old of dividers){const b=boxOf(old),height=sink.bottom-.012-b.min.y;box(root,raw(old)+' · below sink bowl',b.max.x-b.min.x,height,b.max.z-b.min.z,old.material,(b.min.x+b.max.x)/2,b.min.y+height/2,(b.min.z+b.max.z)/2);remove(old);}
    model.updateWorldMatrix(true,true);audit.removedMeshes=replaced.length;
  }
  const audit={fixtures:fixtures.map(f=>({name:f.name,kind:f.kind,rimY:f.top,interiorFloorY:f.floor,depthM:f.depth})),continuousHollowShells:fixtures.length,removedMeshes:replaced.length,removedNames:replaced,countertopAndCabinetCutouts:cutouts,laundryFloor:laundryFloor?serialBox(boxOf(laundryFloor)):null,plant:plantAudit,updatedTapImpacts:tapOriginals.map(t=>({id:t.tap.id,oldY:t.impact.y,newY:t.tap.impact.y})),sourceGLBUnchanged:true};
  return {root,fixtures,audit,finalizeCabinetry,dispose(){root.removeFromParent();for(const [o,s] of originals){s.parent?.add(o);o.position.copy(s.position);o.scale.copy(s.scale);o.quaternion.copy(s.quaternion);o.name=s.name;if(s.dataName===undefined)delete o.userData.name;else o.userData.name=s.dataName;}for(const s of tapOriginals){s.tap.impact.copy(s.impact);s.tap.stream.scale.copy(s.scale);s.tap.stream.position.copy(s.streamPosition);s.tap.ripple.position.copy(s.ripplePosition);}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
