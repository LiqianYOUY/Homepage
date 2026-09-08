import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Install after the hollow fixture refinements, before scene/collision capture.
// All fittings are shallow wall/cabinet-mounted details, with local ownership.
export function setupBathroomAccessories({THREE,model}={}){
  const root=new THREE.Group();root.name='Bathrooms · everyday linen and accessories';model.add(root);
  const geometries=new Set(),materials=new Set(),sets=[],rolls=[],showerShelves=[],towelRails=[],sleepwear=[],slippers=[];
  let finalized=false,disposed=false;
  const raw=o=>o.userData?.name||o.name||'',source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  const find=name=>source.find(o=>raw(o)===name),bounds=o=>new THREE.Box3().setFromObject(o);
  const serial=o=>{const b=bounds(o);return {min:b.min.toArray(),max:b.max.toArray()};};
  function mat(name,color,roughness=.7,metalness=0){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name='Bathroom accessories '+name;materials.add(m);return m;}
  const steel=mat('satin nickel',0xaab2ab,.31,.72),paper=mat('soft ivory paper',0xf5f0e3,.99),core=mat('cardboard roll core',0xa68a67,1),stone=mat('warm limestone',0xc2b49e,.81),shadow=mat('recessed stone',0x998e7d,.91),cream=mat('cotton cream',0xe9dfca,1),sage=mat('sage terry cotton',0x91a395,1),rose=mat('dusty rose cotton',0xc39589,1),stripe=mat('woven edging',0xc2b398,1),amber=mat('amber body wash',0xa87b4c,.30),green=mat('sage shampoo',0x657f6d,.40),plasticSage=mat('sage moulded EVA',0x809b91,.52),plasticRose=mat('rose moulded EVA',0xcba99d,.52),sole=mat('cream rubber footbed',0xdcd6c2,.71);
  function group(name,at=[0,0,0],angle=0,parent=root){const g=new THREE.Group();g.name=name;g.position.set(...at);g.rotation.y=angle;parent.add(g);if(parent===root)sets.push(g);return g;}
  function mesh(parent,name,geometry,material){geometries.add(geometry);const o=new THREE.Mesh(geometry,material);o.name=name;o.userData={name,category:'decor',noMerge:true};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(parent,name,w,h,d,material,at=[0,0,0]){const o=mesh(parent,name,new THREE.BoxGeometry(w,h,d),material);o.position.set(...at);return o;}
  function cylinder(parent,name,r,h,material,at=[0,0,0],segments=16){const o=mesh(parent,name,new THREE.CylinderGeometry(r,r,h,segments),material);o.position.set(...at);return o;}
  function tube(parent,name,points,r,material,closed=false){return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed),Math.max(8,points.length*2),r,5,closed),material);}
  function rod(parent,name,a,b,r,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),o=cylinder(parent,name,r,delta.length(),material,start.add(end).multiplyScalar(.5).toArray(),10);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
  function surface(parent,name,nu,nv,point,material){const verts=[],uv=[],indices=[];for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){verts.push(...point(u/nu,v/nv));uv.push(u/nu,v/nv);}for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const a=v*(nu+1)+u,b=a+1,c=a+nu+1,d=c+1;indices.push(a,b,c,b,d,c);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();material.side=THREE.DoubleSide;return mesh(parent,name,g,material);}
  function mount(parent,name,x,y,z){const o=cylinder(parent,name+' round wall rose',.021,.012,steel,[x,y,z]);o.rotation.x=Math.PI/2;return o;}
  function towel(parent,name,width,drop,material,x=0){
    const g=group(name,[x,0,.088],0,parent),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.16,-.024),new THREE.Vector3(0,-.035,-.024),new THREE.Vector3(0,.021,0),new THREE.Vector3(0,-.03,.024),new THREE.Vector3(0,-drop*.55,.033),new THREE.Vector3(0,-drop,.047)]);
    const point=(u,v)=>{const p=curve.getPoint(v),fold=Math.sin(u*Math.PI*8+.5)*.008+Math.sin(u*Math.PI*17)*.002;return [(u-.5)*width,p.y+Math.sin(u*9)*.004*v,p.z+fold*(.25+v*.75)];};
    surface(g,name+' draped terry cloth',20,24,point,material);
    for(const v of [0,1])tube(g,name+' stitched hem',Array.from({length:15},(_,i)=>point(i/14,v)),.0025,stripe);
    for(const u of [0,1])tube(g,name+' bound side',Array.from({length:19},(_,i)=>point(u,i/18)),.002,material);
    for(const lift of [.027,.043])tube(g,name+' woven border',Array.from({length:15},(_,i)=>{const p=point(i/14,1);return [p[0],p[1]+lift,p[2]+.001];}),.003,stripe);
    return g;
  }
  function rail(name,at,angle,width,material,drop=.39,double=false){
    const g=group(name,at,angle);for(const x of [-width/2,width/2]){mount(g,name,x,0,.008);rod(g,name+' wall standoff',[x,0,.015],[x,0,.088],.008,steel);}rod(g,name+' continuous towel bar',[-width/2-.009,0,.088],[width/2+.009,0,.088],.010,steel);
    if(double){towel(g,name+' cream hand towel',.245,drop,cream,-.19);towel(g,name+' sage hand towel',.245,drop,sage,.19);}else towel(g,name+' hanging towel',Math.min(width*.75,.38),drop,material);
    towelRails.push({name,object:g});return g;
  }
  function toiletRoll(name,at,angle){
    const g=group(name,at,angle);mount(g,name,-.074,0,.009);rod(g,name+' bent holder arm',[-.074,0,.02],[-.074,0,.084],.006,steel);rod(g,name+' spindle',[-.074,0,.084],[.069,0,.084],.005,steel);rod(g,name+' end stop',[.069,-.006,.084],[.069,.016,.084],.005,steel);
    const profile=[[.020,-.052],[.051,-.052],[.053,-.049],[.053,.049],[.051,.052],[.020,.052],[.020,-.052]];
    const roll=mesh(g,name+' open paper roll',new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),32),paper);roll.rotation.z=Math.PI/2;roll.position.z=.084;
    const coreTube=mesh(g,name+' visible cardboard tube',new THREE.CylinderGeometry(.0198,.0198,.105,24,1,true),core);coreTube.rotation.z=Math.PI/2;coreTube.position.z=.084;
    for(const x of [-.053,.053])for(const r of [.027,.039,.048]){const ring=mesh(g,name+' concentric paper layers',new THREE.TorusGeometry(r,.00065,3,28),cream);ring.rotation.y=Math.PI/2;ring.position.set(x,0,.084);}
    surface(g,name+' loose curved paper tail',10,14,(u,v)=>[(u-.5)*.100,-v*.145,.136+Math.sin(v*Math.PI)*.012+Math.sin(u*7)*v*.003],paper);
    for(let i=0;i<9;i++)box(g,name+' perforation',.005,.0007,.0008,stripe,[-.044+i*.011,-.107,.146]);
    rolls.push({name,object:g});return g;
  }
  // Each roll is reachable at the side of the pan and mounted on an actual wall.
  const bath2Wall=find('Bathroom2 north wall · cutaway'),bath3Wall=find('Bathroom3 north left · cutaway'),masterWall=find('Master ensuite exterior · cutaway');
  if(bath2Wall)toiletRoll('Bathroom 2 toilet paper',[5.71,.65,bounds(bath2Wall).max.z+.001],0);
  if(bath3Wall)toiletRoll('Bathroom 3 toilet paper',[5.66,.65,bounds(bath3Wall).max.z+.001],0);
  if(masterWall)toiletRoll('Master toilet paper',[bounds(masterWall).min.x-.001,.65,1.80],-Math.PI/2);

  function bottle(parent,name,x,material,height,pump){
    const p=group(name,[x,.02,.086],0,parent),profile=[[0,0],[.031,0],[.036,.011],[.036,height-.027],[.025,height-.010],[.014,height],[0,height]];
    mesh(p,name+' rounded bottle',new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),20),material);
    cylinder(p,name+' cap',.017,.016,steel,[0,height+.008,0]);
    if(pump){cylinder(p,name+' pump stem',.005,.024,steel,[0,height+.027,0]);box(p,name+' pump spout',.048,.011,.012,steel,[.013,height+.042,0]);}
    box(p,name+' cream label',.038,.049,.003,cream,[0,height*.48,.036]);
    // Small raised droplets distinguish shower gel and shampoo without tiny text.
    const icon=mesh(p,name+' embossed droplet',new THREE.SphereGeometry(.008,8,6),material);icon.scale.set(.65,1.25,.18);icon.position.set(0,height*.49,.039);
  }
  for(const prefix of ['Master','Bathroom2','Bathroom3']){
    const backer=find(prefix==='Master'?'Master shower tile backer':prefix+' shower plumbing backer'),tray=find(prefix+' shower sloped shower tray');if(!backer||!tray)continue;
    // Put the caddy beside the riser, within the tiled backing's side edge.
    const b=bounds(backer),g=group(prefix+' shower open toiletry niche',[b.max.x+.002,1.37,(b.min.z+b.max.z)/2+.235],Math.PI/2),width=.38;
    box(g,prefix+' niche recessed back',width,.305,.012,shadow,[0,.1525,.006]);
    box(g,prefix+' niche supported stone base',width,.020,.162,stone,[0,.010,.081]);
    for(const x of [-width/2+.009,width/2-.009])box(g,prefix+' niche side cheek',.018,.305,.162,stone,[x,.1525,.081]);
    box(g,prefix+' niche slim upper edge',width,.018,.045,stone,[0,.298,.0225]);
    rod(g,prefix+' niche retaining rail',[-width/2+.012,.067,.158],[width/2-.012,.067,.158],.0045,steel);
    bottle(g,prefix+' shampoo',-.105,green,.182,false);bottle(g,prefix+' body wash',.015,amber,.165,true);
    const soap=mesh(g,prefix+' niche oval soap',new THREE.SphereGeometry(1,16,8),cream);soap.scale.set(.039,.018,.026);soap.position.set(.122,.038,.090);
    showerShelves.push({name:prefix,object:g,openFront:true,bottles:2});
    const tb=bounds(tray);
    if(prefix==='Bathroom2'){const wall=find('Bathroom2 shower return · cutaway');rail(prefix+' shower towel rail',[(tb.min.x+tb.max.x)/2,1.26,bounds(wall).min.z-.002],Math.PI,.62,sage,.37);}
    else {const glass=find(prefix+' shower glass'),divider=find(prefix+' shower divider · upper'),face=Math.min(bounds(glass).min.x,divider?bounds(divider).min.x:Infinity);rail(prefix+' shower towel rail',[face-.005,1.28,(tb.min.z+tb.max.z)/2],-Math.PI/2,prefix==='Master'?.61:.62,prefix==='Master'?cream:rose,.40);}
  }
  // Hand towels hang below each basin lip, outside the cabinet front and away from taps.
  for(const spec of [
    {prefix:'Bathroom2 vanity',name:'Bathroom 2 basin hand towel rail',axis:'z',angle:0,width:.43},
    {prefix:'Bathroom3 vanity',name:'Bathroom 3 basin hand towel rail',axis:'x',angle:-Math.PI/2,width:.35},
    {prefix:'Master double',name:'Master double basin hand towel rail',axis:'x',angle:-Math.PI/2,width:.86,double:true},
    {prefix:'Laundry sink',name:'Laundry basin hand towel rail',axis:'z',angle:0,width:.40}
  ]){
    const old=find(spec.prefix+' vanity · real bowl cutout');if(!old)continue;const b=bounds(old),c=b.getCenter(new THREE.Vector3());
    const at=spec.axis==='x'?[b.min.x-.002,.665,c.z]:[c.x,.64,b.max.z+.002];rail(spec.name,at,spec.angle,spec.width,cream,.31,spec.double);
  }

  function garment(parent,name,points,material,at=[0,0,0]){
    const shape=new THREE.Shape();shape.moveTo(...points[0]);for(const p of points.slice(1))shape.lineTo(...p);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:2,steps:1});
    const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,pos.getZ(i)+Math.sin(x*42+y*3)*.006*Math.min(1,Math.abs(y)*5));}g.computeVertexNormals();const o=mesh(parent,name,g,material);o.position.set(...at);return o;
  }
  const clothingWall=find('Master bath divider bottom · cutaway');
  if(clothingWall){const x=bounds(clothingWall).max.x+.003;
    for(const [i,z] of [4.29,4.80].entries()){
      const name='Master hanging sleep shirt '+(i+1),g=group(name,[x,1.63,z],Math.PI/2),fabric=i?sage:rose;
      mount(g,name,0,.13,.011);tube(g,name+' coat hook',[[0,.13,.02],[0,.10,.047],[0,.13,.077],[0,.153,.077]],.006,steel);
      tube(g,name+' hanger hook',[[0,.038,.062],[0,.112,.062],[.022,.139,.062],[.041,.12,.062],[.025,.102,.062]],.0035,steel);
      for(const [a,b] of [[[0,.042,.061],[-.173,-.039,.061]],[[-.173,-.039,.061],[.173,-.039,.061]],[[.173,-.039,.061],[0,.042,.061]]])rod(g,name+' wooden hanger',a,b,.004,stripe);
      garment(g,name+' softly folded cotton',[[-.04,0],[-.14,-.012],[-.211,-.065],[-.250,-.44],[-.190,-.453],[-.135,-.225],[-.148,-.74],[.142,-.747],[.135,-.225],[.190,-.453],[.250,-.44],[.211,-.065],[.14,-.012],[.04,0],[0,-.053]],fabric,[0,-.022,.069]);
      for(const sign of [-1,1])garment(g,name+' piped lapel',[[sign*.038,0],[sign*.101,-.049],[sign*.045,-.137],[0,-.070]],cream,[0,-.022,.090]);
      tube(g,name+' button placket',[[0,-.095,.095],[.004,-.37,.099],[0,-.73,.094]],.0027,cream);
      for(let j=0;j<5;j++){const button=cylinder(g,name+' pearl button',.005,.003,cream,[.002,-.18-j*.109,.103],8);button.rotation.x=Math.PI/2;}
      garment(g,name+' breast pocket',[[0,0],[.070,0],[.064,-.073],[.007,-.077]],fabric,[-.111,-.218,.102]);
      rod(g,name+' pocket piping',[-.110,-.216,.108],[-.039,-.216,.108],.0027,cream);
      for(const sign of [-1,1])rod(g,name+' cuff piping',[sign*.193,-.449,.09],[sign*.244,-.437,.09],.003,cream);
      tube(g,name+' soft lower hem',[[-.144,-.750,.084],[-.07,-.754,.077],[0,-.750,.087],[.075,-.756,.079],[.140,-.757,.088]],.003,cream);
      sleepwear.push({name,object:g});
    }
  }
  function slipper(parent,name,x,material,angle){
    const g=group(name,[x,0,0],angle,parent),shape=new THREE.Shape();shape.moveTo(-.043,-.11);shape.bezierCurveTo(-.068,-.05,-.064,.113,-.024,.139);shape.bezierCurveTo(.027,.16,.065,.119,.059,.043);shape.bezierCurveTo(.052,-.013,.052,-.104,.035,-.12);shape.quadraticCurveTo(0,-.14,-.043,-.11);shape.closePath();
    const geom=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.005,bevelThickness:.004,bevelSegments:2,curveSegments:8,steps:1});geom.rotateX(-Math.PI/2);const base=mesh(g,name+' moulded sole',geom,material);base.position.y=.008;
    const footbed=mesh(g,name+' cushioned footbed',geom.clone(),sole);footbed.scale.set(.86,.29,.91);footbed.position.y=.027;
    surface(g,name+' open arched slide strap',18,5,(u,v)=>{const a=u*Math.PI;return [Math.cos(a)*.052,.041+Math.sin(a)*.062,.016+v*.079+Math.sin(a)*.008];},material);
    for(const z of [.016,.095])tube(g,name+' strap rolled rim',Array.from({length:15},(_,i)=>{const a=i/14*Math.PI;return [Math.cos(a)*.052,.041+Math.sin(a)*.062,z+Math.sin(a)*.008];}),.0028,material);
    for(let i=0;i<5;i++)rod(g,name+' footbed grip rib',[-.028,.035,-.093+i*.015],[.027,.035,-.093+i*.015],.0016,material);
    return g;
  }
  for(const [i,z] of [4.25,4.79].entries()){
    const g=group('Master plastic slippers pair '+(i+1),[-2.963,0,z]);for(const [j,x] of [-.070,.070].entries())slipper(g,'Master slipper '+(i*2+j+1),x,i?plasticSage:plasticRose,j?.06:-.06);slippers.push({name:g.name,object:g,pieces:2});
  }
  const audit={toiletPaperRolls:rolls.length,showerToiletryNiches:showerShelves.length,shampooAndBodyWashBottles:showerShelves.length*2,showerTowelRails:towelRails.filter(r=>r.name.includes('shower')).length,basinTowelRails:towelRails.filter(r=>r.name.includes('basin')).length,sleepShirts:sleepwear.length,plasticSlipperPairs:slippers.length,plasticSlippers:slippers.length*2,sourceGLBUnchanged:true};
  function finalize(){if(finalized||disposed)return;finalized=true;model.updateWorldMatrix(true,true);
    audit.placements=sets.map(g=>({name:g.name,...serial(g)}));
    // Batch inside each fixture, retaining independent placement and disposal.
    for(const g of sets){const inverse=g.matrixWorld.clone().invert(),batches=new Map();g.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+'|'+!!o.geometry.index;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});for(const list of batches.values()){if(list.length<2)continue;const copies=list.map(o=>o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld))),merged=mergeGeometries(copies,false);copies.forEach(c=>c.dispose());if(!merged)continue;const out=mesh(g,g.name+' · '+list[0].material.name,merged,list[0].material);out.userData.sourceNames=list.map(o=>o.name);list.forEach(o=>o.removeFromParent());}}
    audit.meshes=0;audit.triangles=0;root.traverse(o=>{if(o.isMesh){audit.meshes++;audit.triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});
  }
  return {root,rolls,showerShelves,towelRails,sleepwear,slippers,audit,finalize,dispose(){if(disposed)return;disposed=true;root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
