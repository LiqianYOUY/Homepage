// Local, reversible furnishing updates. Install before interactions and collision capture.
// Coordinates follow the source apartment; they are scene units, not construction drawings.
export function setupRoomRenovation({THREE,model,register=()=>{},getState=()=>({}),setState=()=>{},toast=()=>{}}){
  const originals=new Map(),geometries=new Set(),materials=new Set(),curtains=[],removed=[];
  const raw=o=>o.userData?.name||o.name||'';
  const source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
  const root=new THREE.Group();root.name='Home renovation · bedrooms and wintergarden';model.add(root);
  function remember(o){if(!originals.has(o))originals.set(o,{parent:o.parent,position:o.position.clone(),scale:o.scale.clone(),quaternion:o.quaternion.clone()});}
  function remove(o){remember(o);removed.push(raw(o));o.removeFromParent();}
  function material(name,color,roughness=.7,metalness=0){const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name=name;materials.add(m);return m;}
  const oak=material('Renovation pale natural oak',0xbfa783),cream=material('Renovation warm ivory',0xe9e3d5),sage=material('Renovation sage linen',0x879985,.97),sand=material('Renovation sand canvas',0xc2b49b,1),clay=material('Renovation muted clay',0xc4927b),blue=material('Renovation pale blue',0x8aa3ad),charcoal=material('Renovation warm graphite',0x414b48,.45),metal=material('Renovation brushed aluminium',0xaeb7b2,.3,.7),ceramic=material('Renovation cream ceramic',0xf4efe3,.28),amber=material('Renovation amber toiletries',0xb77841,.3),green=material('Renovation green toiletries',0x738f75,.4);
  const wallMaterial=source.find(o=>raw(o)==='Bedroom2 south wall · cutaway')?.material||cream;
  function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  function mesh(parent,name,geometry,mat,category='decor'){geometries.add(geometry);const o=new THREE.Mesh(geometry,mat);o.name=name;o.userData={name,category};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  function box(p,n,w,h,d,m,at=[0,0,0],category='furniture'){const o=mesh(p,n,new THREE.BoxGeometry(w,h,d),m,category);o.position.set(...at);return o;}
  function cylinder(p,n,r,h,m,at=[0,0,0],category='decor',top=r){const o=mesh(p,n,new THREE.CylinderGeometry(top,r,h,16),m,category);o.position.set(...at);return o;}
  function ellipsoid(p,n,scale,m,at,category='decor'){const o=mesh(p,n,new THREE.SphereGeometry(1,24,16),m,category);o.scale.set(...scale);o.position.set(...at);return o;}
  function rod(p,n,a,b,r,m,category='decor'){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);const o=cylinder(p,n,r,d.length(),m,start.clone().add(end).multiplyScalar(.5).toArray(),category);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
  function tube(p,n,points,r,m){const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));return mesh(p,n,new THREE.TubeGeometry(path,32,r,6,false),m);}
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return {min:b.min.toArray(),max:b.max.toArray()};};

  // Remove all three layers of the wall which was standing in front of bedroom 3's glazing.
  source.filter(o=>raw(o).startsWith('Bedroom3 east return · ')).forEach(remove);
  function extendWall(prefix,endX){for(const o of source.filter(o=>raw(o).startsWith(prefix+' · '))){remember(o);const b=new THREE.Box3().setFromObject(o),delta=endX-b.max.x;o.position.x+=delta/2;o.scale.x*=(b.max.x-b.min.x+delta)/(b.max.x-b.min.x);}}
  // End both bedroom partitions at the glass mullion, closing the screenshot's floating joints.
  extendWall('Bedroom2 south wall',12.098);
  extendWall('South bedroom boundary',12.098);
  const joint=group('Bedroom 2 north facade continuous wall joint');joint.position.set(8.438,0,-4.527);
  box(joint,'Bedroom 2 north facade joint cutaway',.16,.62,.36,wallMaterial,[0,.31,0],'wall');
  box(joint,'Bedroom 2 north facade joint upper',.16,2.18,.36,wallMaterial,[0,1.71,0],'upperWall');
  box(joint,'Bedroom 2 north facade joint skirting',.176,.085,.37,oak,[0,.046,0],'wall');
  source.filter(o=>raw(o)==='Master dressing ottoman').forEach(remove);

  // Reclining, filled-fabric loungers replace the four upright wintergarden chairs.
  source.filter(o=>/^Wintergarden chair (?:west|east) /.test(raw(o))).forEach(remove);
  const loungers=[];
  function beanbag(name,x,z,rotation,m){
    const g=group(name);g.position.set(x,0,z);g.rotation.y=rotation;
    const body=mesh(g,name+' soft reclining shell',new THREE.SphereGeometry(1,36,22),m,'furniture');
    const positions=body.geometry.attributes.position;
    // A low foot end and fuller raised back form one continuous, slightly slumped fabric bag.
    for(let i=0;i<positions.count;i++){const vx=positions.getX(i),vy=positions.getY(i),vz=positions.getZ(i),back=(1-vz)/2;const y=.24+vy*(.22+.17*back)+.14*back;positions.setXYZ(i,vx*.56*(1-.10*back),Math.max(.025,y),vz*.82);}
    positions.needsUpdate=true;body.geometry.computeVertexNormals();
    const head=ellipsoid(g,name+' loose head cushion',[.36,.095,.24],m,[0,.54,-.45]);head.rotation.x=-.27;
    for(const side of [-1,1])tube(g,name+' sewn side seam',[ [side*.035,.57,-.74],[side*.40,.42,-.42],[side*.53,.23,.02],[side*.43,.16,.53],[side*.04,.13,.79] ],.004,cream);
    box(g,name+' small woven fabric tab',.045,.019,.007,oak,[.545,.23,.10],'decor');
    loungers.push(g);return g;
  }
  beanbag('Wintergarden reclining beanbag sage',-10.73,-3.35,0,sage);
  beanbag('Wintergarden reclining beanbag sand',-11.00,-.20,Math.PI,sand);

  function chair(parent,name,x,z,m=sage){
    const g=group(name,parent);g.position.set(x,0,z);
    ellipsoid(g,name+' upholstered seat',[.235,.052,.215],m,[0,.465,0],'furniture');
    const back=ellipsoid(g,name+' curved upholstered back',[.235,.205,.048],m,[0,.704,.168],'furniture');back.rotation.x=.10;
    for(const xx of [-.166,.166])for(const zz of [-.132,.132])rod(g,name+' oak leg',[xx,.015,zz],[xx*.88,.443,zz*.9],.017,oak,'furniture');
    return g;
  }
  function desk(parent,name,x,z,width=1.22){
    const g=group(name,parent);g.position.set(x,0,z);
    box(g,name+' rounded-edge oak worktop',width,.04,.50,oak,[0,.745,0]);
    for(const xx of [-width/2+.075,width/2-.075])for(const zz of [-.18,.18])box(g,name+' slim frame leg',.028,.72,.028,cream,[xx,.36,zz]);
    box(g,name+' rear frame rail',width-.12,.038,.025,cream,[0,.65,-.19]);
    // A notebook and task lamp keep the extra room ready for reading or working.
    const book=box(g,name+' open notebook',.20,.012,.145,ceramic,[.10,.774,0],'decor');book.rotation.y=-.12;
    box(g,name+' notebook spine',.008,.014,.145,sage,[.10,.775,0],'decor');
    cylinder(g,name+' task lamp foot',.063,.015,charcoal,[-width*.32,.773,-.12]);
    rod(g,name+' task lamp upright',[-width*.32,.78,-.12],[-width*.32,.99,-.12],.009,metal);
    const lamp=cylinder(g,name+' task lamp shade',.061,.075,cream,[-width*.32,.996,-.09],'decor',.035);lamp.rotation.x=-.42;
    return g;
  }
  // Bedroom 2 retains the double bed, with a compact desk at its north window.
  const guestDesk=desk(root,'Bedroom 2 window writing desk',9.39,-4.78,1.18);
  const guestChair=chair(root,'Bedroom 2 writing chair',9.39,-4.23,sage);

  // Two joined bed/desk/wardrobe systems follow the user's north/east layout.
  // Structural reference: IKEA SMÅSTAD, whose end wardrobe supports a single loft bed,
  // with a parallel under-bed desk and a ladder configurable to either side.
  // https://www.ikea.com/au/en/p/smastad-loft-bed-frame-w-desk-and-storage-white-70454040/
  source.filter(o=>raw(o).startsWith('Bedroom 3 queen bed ')||raw(o).startsWith('Bedroom3 wardrobe ')).forEach(remove);
  const childrenRoom=group('Children room · integrated loft study wardrobes'),loftBeds=[],childrenWardrobes=[],childrenLadders=[],childrenChairs=[];
  const childReferences=['https://www.ikea.com/au/en/p/smastad-loft-bed-frame-w-desk-and-storage-white-70454040/','https://www.ikea.com/au/en/files/pdf/37/43/37438516/smastad_fy22_oct21.pdf'];
  function integratedLoft({name,x,z,angle=0,colour,ladderSide,id,label}){
    const g=group(name,childrenRoom);g.position.set(x,0,z);g.rotation.y=angle;
    const length=2.03,depth=1.01,left=-length/2,right=length/2,front=depth/2,back=-depth/2;
    // Shared posts and one continuous deck visibly join storage, study and sleeping space.
    for(const xx of [left+.025,right-.025])for(const zz of [back+.025,front-.025])box(g,name+' continuous floor-to-guard post',.05,2.20,.05,oak,[xx,1.10,zz]);
    box(g,name+' continuous load-bearing loft deck',length,.105,depth,oak,[0,1.6225,0]);
    for(const zz of [back+.02,front-.02])box(g,name+' bed frame side apron',length,.16,.035,cream,[0,1.61,zz]);
    box(g,name+' single mattress',1.90,.15,.91,ceramic,[0,1.76,0],'decor');
    box(g,name+' soft fitted duvet',1.47,.045,.89,colour,[.205,1.856,0],'decor');
    const pillow=ellipsoid(g,name+' soft bed pillow',[.18,.072,.33],ceramic,[-.64,1.854,0]);
    box(g,name+' folded foot blanket',.30,.025,.91,sand,[.77,1.89,0],'decor');
    // Long rails, closed end rails, and a proper opening only at the assigned ladder.
    for(const yy of [1.99,2.155]){
      box(g,name+' wall-side guard rail',length,.06,.032,cream,[0,yy,back]);
      if(ladderSide==='front')for(const [a,b] of [[left,.17],[.65,right]])box(g,name+' inner guard beside ladder',b-a,.06,.032,cream,[(a+b)/2,yy,front]);
      else box(g,name+' room-side guard rail',length,.06,.032,cream,[0,yy,front]);
      box(g,name+' east foot guard rail',.032,.06,depth,cream,[right,yy,0]);
      if(ladderSide==='west')for(const [a,b] of [[back,-.025],[.425,front]])box(g,name+' west guard beside ladder',.032,.06,b-a,cream,[left,yy,(a+b)/2]);
      else box(g,name+' wardrobe-end guard rail',.032,.06,depth,cream,[left,yy,0]);
    }
    const wardrobe=group(name+' integrated end wardrobe',g),wardrobeX=left+.28;
    wardrobe.position.set(wardrobeX,0,0);
    for(const xx of [-.27,.27])box(wardrobe,name+' wardrobe bearing side',.02,1.57,.98,oak,[xx,.785,0]);
    box(wardrobe,name+' wardrobe rear panel',.52,1.53,.018,cream,[0,.805,back+.025]);
    for(const yy of [.09,1.555])box(wardrobe,name+' wardrobe fixed shelf',.52,.025,.96,oak,[0,yy,0]);
    box(wardrobe,name+' wardrobe inset plinth',.50,.075,.90,charcoal,[0,.0375,0]);
    box(wardrobe,name+' wardrobe folded shelf',.50,.025,.88,cream,[0,.44,-.015]);
    for(let i=0;i<3;i++)box(wardrobe,name+' wardrobe folded cotton',.32,.053,.29,[sage,sand,blue][i],[0,.48+i*.053,.06],'decor');
    rod(wardrobe,name+' wardrobe hanging rail',[-.24,1.35,.05],[.24,1.35,.05],.008,metal);
    for(const [i,m] of [colour,clay].entries()){
      const xx=(i-.5)*.21;rod(wardrobe,name+' clothes hanger',[xx-.08,1.21,.05],[xx,1.30,.05],.005,oak);rod(wardrobe,name+' clothes hanger',[xx,1.30,.05],[xx+.08,1.21,.05],.005,oak);
      box(wardrobe,name+' hanging child shirt',.16,.35,.032,m,[xx,1.055,.05],'decor');
      for(const side of [-1,1]){const sleeve=box(wardrobe,name+' child shirt sleeve',.065,.16,.032,m,[xx+side*.096,1.17,.05],'decor');sleeve.rotation.z=side*.25;}
    }
    // Sliding fronts stay inside the wardrobe's footprint, keeping the compact aisle usable.
    const moving=group(name+' sliding wardrobe fronts',wardrobe);moving.userData.noMerge=true;
    const panels=[];for(const side of [-1,1]){
      const p=group(name+' wardrobe sliding leaf '+side,moving);p.position.set(side*.129,0,front+(side<0?.023:.002));
      box(p,name+' wardrobe sliding door panel',.253,1.423,.019,cream,[0,.817,0]);
      box(p,name+' wardrobe recessed oak pull',.011,.20,.012,oak,[side<0?-.079:.079,.84,.018],'decor');panels.push(p);
    }
    let amount=Number(getState()?.doors?.[id]??0);if(!Number.isFinite(amount))amount=0;amount=Math.max(0,Math.min(1,amount));
    const record={id,label,kind:'cabinet',object:moving,anchor:g.localToWorld(new THREE.Vector3(wardrobeX,1.05,front+.08)),amount,target:amount,panels,hotspot:true};
    record.apply=()=>{panels[0].position.x=-.129+record.amount*.245;moving.updateWorldMatrix(true,true);};
    record.setOpen=(open,instant=false)=>{record.target=open?1:0;setState({doors:{...(getState()?.doors||{}),[id]:record.target}});if(instant){record.amount=record.target;record.apply();}};
    record.click=()=>{record.setOpen(record.target<.5);toast(record.target?'拉开一体衣柜。':'收好一体衣柜。');};record.apply();register(record);childrenWardrobes.push(record);
    // The long desk is fixed to the end wardrobe and the far bed post, rather than a separate table.
    const deskLeft=left+.57,deskRight=right-.035,deskWidth=deskRight-deskLeft,deskX=(deskLeft+deskRight)/2,deskZ=back+.292;
    box(g,name+' integrated long writing surface',deskWidth,.038,.55,oak,[deskX,.741,deskZ]);
    box(g,name+' under-desk rear crossrail',deskWidth,.055,.028,cream,[deskX,.64,back+.036]);
    box(g,name+' desk end support panel',.025,.716,.53,cream,[deskRight-.008,.358,deskZ]);
    box(g,name+' shallow desk drawer',.37,.10,.41,cream,[deskRight-.205,.666,deskZ+.025]);
    box(g,name+' desk drawer front',.38,.093,.018,colour,[deskRight-.205,.666,deskZ+.282]);
    box(g,name+' desk drawer oak pull',.11,.012,.018,oak,[deskRight-.205,.666,deskZ+.298],'decor');
    box(g,name+' shared desk pinboard',deskWidth-.09,.35,.018,colour,[deskX,1.13,back+.026],'decor');
    box(g,name+' desk drawing pinned up',.15,.22,.004,ceramic,[deskX-.26,1.15,back+.038],'decor');
    box(g,name+' desk shelf fixed to bed frame',deskWidth-.10,.025,.14,cream,[deskX,1.455,back+.088]);
    for(let i=0;i<5;i++)box(g,name+' desk shelf book',.031,.13+(i%2)*.025,.09,[sage,blue,clay][i%3],[deskX+.08+i*.037,1.54,back+.089],'decor');
    cylinder(g,name+' study lamp foot',.052,.013,charcoal,[deskLeft+.12,.768,back+.15]);
    rod(g,name+' study lamp neck',[deskLeft+.12,.77,back+.15],[deskLeft+.12,.98,back+.15],.007,metal);
    const shade=cylinder(g,name+' study lamp shade',.048,.067,ceramic,[deskLeft+.12,.992,back+.18],'decor',.031);shade.rotation.x=-.30;
    box(g,name+' open study notebook',.18,.010,.14,ceramic,[deskX-.02,.765,deskZ+.075],'decor');
    box(g,name+' notebook binding',.006,.013,.14,colour,[deskX-.02,.766,deskZ+.075],'decor');
    const seat=chair(g,name+' tucked study chair',deskX-.13,front-.15,colour);childrenChairs.push(seat);
    const ladder=group(name+' attached access ladder',g);const steps=6;
    if(ladderSide==='west'){
      for(const zz of [0,.40])rod(ladder,name+' angled ladder stile',[left-.205,.026,zz],[left-.006,1.88,zz],.019,oak,'furniture');
      for(let i=0;i<steps;i++)box(ladder,name+' broad ladder tread',.085,.036,.44,cream,[left-.185+i*.029,.22+i*.275,.20]);
    }else{
      for(const xx of [.20,.62])rod(ladder,name+' angled ladder stile',[xx,.026,front+.225],[xx,1.88,front+.005],.019,oak,'furniture');
      for(let i=0;i<steps;i++)box(ladder,name+' broad ladder tread',.45,.036,.085,cream,[.41,.22+i*.275,front+.20-i*.032]);
    }
    childrenLadders.push(ladder);loftBeds.push(g);return g;
  }
  // The entrance stays west of the northern unit; the east unit leaves a narrow curtain pocket.
  integratedLoft({name:'Children north integrated loft',x:10.245,z:-.81,colour:sage,ladderSide:'west',id:'children-wardrobe-north',label:'儿童房北侧一体衣柜'});
  integratedLoft({name:'Children east integrated loft',x:11.33,z:.795,angle:-Math.PI/2,colour:blue,ladderSide:'front',id:'children-wardrobe-east',label:'儿童房东侧一体衣柜'});
  const relaxation=group('Children room · southwest quiet corner',childrenRoom);
  box(relaxation,'Children quiet corner woven rug',1.56,.016,1.00,sand,[9.57,.009,1.17],'rug');
  const seatPad=ellipsoid(relaxation,'Children quiet corner soft floor cushion',[.36,.13,.32],sage,[9.25,.135,1.15],'furniture');
  const lean=ellipsoid(relaxation,'Children quiet corner reclining back cushion',[.37,.24,.10],cream,[9.25,.33,1.51],'furniture');lean.rotation.x=-.25;
  ellipsoid(relaxation,'Children quiet corner round floor pouf',[.23,.13,.23],clay,[9.90,.135,1.34],'furniture');
  box(relaxation,'Children quiet corner picture book',.21,.018,.18,ceramic,[9.63,.029,.88],'decor');
  box(relaxation,'Children quiet corner book cover',.205,.004,.175,blue,[9.63,.041,.88],'decor');

  // Toiletries sit on the existing stone surfaces, away from the basin openings.
  const bathrooms=[];
  function bottle(g,name,x,z,m,h=.14,pump=false){
    cylinder(g,name+' bottle',.024,h,m,[x,h/2,z]);
    cylinder(g,name+' cap',.014,.022,ceramic,[x,h+.011,z]);
    if(pump){cylinder(g,name+' pump neck',.008,.025,metal,[x,h+.033,z]);box(g,name+' pump spout',.057,.011,.015,charcoal,[x+.017,h+.048,z],'decor');}
    box(g,name+' cream label',.033,.046,.003,ceramic,[x,h*.50,z+.024],'decor');
  }
  function toothbrush(g,name,x,z){
    cylinder(g,name+' ceramic tumbler',.026,.077,ceramic,[x,.0385,z]);
    for(const [i,m] of [sage,blue].entries()){
      const xx=x+(i?1:-1)*.008;rod(g,name+' toothbrush handle',[xx,.024,z],[xx+(i?-.013:.012),.185,z],.004,m);
      box(g,name+' toothbrush bristles',.011,.033,.009,ceramic,[xx+(i?-.013:.012),.184,z+.002],'decor');
    }
  }
  function toiletries(name,x,z,y,angle=0,compact=false){
    const g=group(name);g.position.set(x,y,z);g.rotation.y=angle;
    if(compact){bottle(g,name+' hand soap',0,0,amber,.11,true);toothbrush(g,name+' dental care',-.06,0);}
    else{box(g,name+' stone tray',.30,.012,.16,cream,[0,.006,0],'decor');bottle(g,name+' hand soap',-.105,0,amber,.15,true);bottle(g,name+' lotion',-.035,0,green,.17);toothbrush(g,name+' dental care',.065,0);box(g,name+' toothpaste',.036,.022,.090,ceramic,[.12,.021,0],'decor');}
    bathrooms.push(g);return g;
  }
  toiletries('Master bathroom daily toiletries',-.39,3.10,.83,Math.PI/2);
  toiletries('Bathroom 2 daily toiletries',7.45,-4.272,.7825,0,true);
  toiletries('Bathroom 3 daily toiletries',7.626,.385,.7825,Math.PI/2,true);
  // Rolled towels on shallow holders add everyday detail without narrowing the floor route.
  for(const spec of [{name:'Master bathroom',x:-.12,z:3.835,y:.83},{name:'Bathroom 2',x:6.89,z:-4.235,y:.7825}]){
    const g=group(spec.name+' folded face towels');g.position.set(spec.x,spec.y,spec.z);
    for(let i=0;i<2;i++){const towel=cylinder(g,spec.name+' rolled face towel',.029,.11,cream,[0,.029+i*.044,0]);towel.rotation.z=Math.PI/2;}
  }

  // Bedroom curtains are separate from the living-room motorised rail, with saved open/close states.
  // The distinct category prevents SmartHome's living-curtain replacement from adopting them.
  const linen=material('Renovation bedroom linen curtains',0xe4dbc9,.98);linen.side=THREE.DoubleSide;
  const curtainTracks=[
    {id:'curtain-master',label:'主卧窗帘',a:[-11.35,1.04],b:[-11.35,5.07]},
    {id:'curtain-bedroom2-north',label:'次卧北侧窗帘',a:[8.52,-4.98],b:[11.95,-4.98]},
    {id:'curtain-bedroom2-east',label:'次卧东侧窗帘',a:[11.93,-5.02],b:[11.93,-1.64]},
    {id:'curtain-children',label:'儿童房窗帘',a:[11.93,-1.43],b:[11.93,1.83]}
  ];
  for(const spec of curtainTracks){
    const dx=spec.b[0]-spec.a[0],dz=spec.b[1]-spec.a[1],length=Math.hypot(dx,dz),g=group(spec.label+' · sliding linen');
    g.position.set(spec.a[0],0,spec.a[1]);g.rotation.y=-Math.atan2(dz,dx);g.userData.noMerge=true;
    box(g,spec.label+' fixed ceiling track',length+.06,.036,.052,metal,[length/2,2.646,0],'bedroomCurtain');
    const panels=[],width=length/2;let current=Number(getState()?.bedroomCurtains?.[spec.id]??1);if(!Number.isFinite(current))current=1;current=Math.max(0,Math.min(1,current));
    for(const side of [1,-1]){
      const panel=group(spec.id+' '+(side===1?'left':'right')+' fabric',g);panel.position.set(side===1?0:length,.085,0);panel.userData.noMerge=true;
      const segments=96,points=[],indices=[];
      for(let row=0;row<2;row++)for(let i=0;i<=segments;i++){const u=i/segments;points.push(side*u,row*2.515,Math.cos(u*Math.PI*24)*.027);}
      for(let i=0;i<segments;i++){const c=i+segments+1;indices.push(i,i+1,c,i+1,c+1,c);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();
      const cloth=mesh(panel,spec.label+' pleated linen panel',geometry,linen,'bedroomCurtain');cloth.userData.noMerge=true;
      panels.push(panel);
    }
    const record={...spec,kind:'curtain',object:g,anchor:new THREE.Vector3(spec.a[0]+dx*.10,1.48,spec.a[1]+dz*.10),hotspot:true,amount:current,target:current,panels};
    record.apply=()=>{for(const p of panels){p.scale.x=width+(.25-width)*record.amount;p.updateMatrixWorld(true);}};
    record.setOpen=(open,instant=false)=>{record.target=open?1:0;setState({bedroomCurtains:{...(getState()?.bedroomCurtains||{}),[spec.id]:record.target}});if(instant){record.amount=record.target;record.apply();}};
    record.click=()=>{record.setOpen(record.target<.5);toast(record.target?'窗帘缓缓拉开。':'窗帘缓缓合上。');};
    record.apply();curtains.push(record);register(record);
  }
  model.updateWorldMatrix(true,true);
  const audit={sourceGLBUnchanged:true,removedMeshes:removed.length,removedNames:removed,removedWintergardenChairs:4,recliningBeanbags:loungers.map(bounds),childrenRoom:'Bedroom 3, nearest the entrance',loftBeds:loftBeds.map(bounds),childrenLayout:{orientation:['north wall east-west','east wall north-south'],integratedWardrobes:childrenWardrobes.length,removedIndependentWardrobe:true,deskWidthsM:[1.425,1.425],ladders:childrenLadders.map(bounds),relaxation:bounds(relaxation),references:childReferences},guestDesk:bounds(guestDesk),guestChair:bounds(guestChair),toiletrySets:bathrooms.length,bedroomCurtainTracks:curtains.length,bedroomCurtainPanels:curtains.length*2,wallRepairs:['Bedroom 2 north facade joint','Bedroom 2 partition extended to east glazing','Bedroom 3 south boundary extended to east glazing'],removedGlassSideWall:'Bedroom3 east return',collision:{solidFurnitureCategory:'furniture',wallCategories:['wall','upperWall'],curtainsAreDecorative:true}};
  return {root,curtains,loftBeds,childrenWardrobes,childrenLadders,childrenChairs,relaxation,loungers,audit,update(dt){for(const wardrobe of childrenWardrobes){if(Math.abs(wardrobe.amount-wardrobe.target)<.0001)continue;wardrobe.amount+=(wardrobe.target-wardrobe.amount)*(1-Math.exp(-dt*6));if(Math.abs(wardrobe.amount-wardrobe.target)<.0002)wardrobe.amount=wardrobe.target;wardrobe.apply();}for(const c of curtains){if(Math.abs(c.amount-c.target)<.0001)continue;c.amount+=(c.target-c.amount)*(1-Math.exp(-dt*4));if(Math.abs(c.amount-c.target)<.0002)c.amount=c.target;c.apply();}},dispose(){root.removeFromParent();for(const [o,s] of originals){s.parent.add(o);o.position.copy(s.position);o.scale.copy(s.scale);o.quaternion.copy(s.quaternion);}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
