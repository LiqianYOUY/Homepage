import {addTranslations} from './i18n.js?v=14';

addTranslations({'儿童房衣柜':'Children’s wardrobe','拉开儿童房衣柜。':'Opening the children’s wardrobe.','收好儿童房衣柜。':'Closing the children’s wardrobe.'});

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

  // The bunk follows the bathroom wall; low window desks preserve the full glazed outlook.
  // Keep the door's swept north-west corner clear, and place the storage row on the north wall.
  source.filter(o=>raw(o).startsWith('Bedroom 3 queen bed ')||raw(o).startsWith('Bedroom3 wardrobe ')).forEach(remove);
  const childrenRoom=group('Children room · family bunk and sunny study desks'),childrenWardrobes=[],childrenLadders=[],childrenChairs=[],childrenDesks=[];
  const childrenBunkBed=group('Children bathroom-wall family bunk bed',childrenRoom);
  childrenBunkBed.position.set(8.64,0,.725);childrenBunkBed.rotation.y=Math.PI/2;
  const bunkLength=2.05,lowerWidth=1.38,upperWidth=1.00,upperZ=-.19;
  // Narrow upper berth and wider lower berth share an oak frame, with no desks underneath.
  const lowerDeck=box(childrenBunkBed,'Children bunk lower continuous bed frame',bunkLength,.105,lowerWidth,oak,[0,.2825,0]);
  const upperDeck=box(childrenBunkBed,'Children bunk upper continuous bed frame',bunkLength,.10,upperWidth,oak,[0,1.565,upperZ]);
  childrenBunkBed.lowerDeck=lowerDeck;childrenBunkBed.upperDeck=upperDeck;
  for(const xx of [-.9975,.9975]){
    for(const zz of [-.6625,.2825])box(childrenBunkBed,'Children bunk tall corner post',.055,2.21,.055,oak,[xx,1.105,zz]);
    box(childrenBunkBed,'Children bunk lower outer corner post',.055,.68,.055,oak,[xx,.34,.6625]);
    box(childrenBunkBed,'Children bunk lower end board',.03,.235,1.28,cream,[xx,.6325,0]);
    for(const yy of [1.98,2.15])box(childrenBunkBed,'Children bunk upper end guard',.032,.065,.985,cream,[xx,yy,upperZ]);
  }
  for(const zz of [-.676,.676])box(childrenBunkBed,'Children bunk lower upholstered side apron',2.015,.17,.028,cream,[0,.30,zz]);
  for(const zz of [upperZ-upperWidth/2+.014,upperZ+upperWidth/2-.014])box(childrenBunkBed,'Children bunk upper ivory side apron',2.015,.15,.028,cream,[0,1.555,zz]);
  childrenBunkBed.lowerMattress=box(childrenBunkBed,'Children bunk lower wide mattress',1.92,.15,1.28,ceramic,[0,.412,0],'decor');
  childrenBunkBed.upperMattress=box(childrenBunkBed,'Children bunk upper single mattress',1.92,.145,.90,ceramic,[0,1.696,upperZ],'decor');
  box(childrenBunkBed,'Children bunk lower sage duvet',1.44,.045,1.255,sage,[.23,.505,0],'decor');
  box(childrenBunkBed,'Children bunk upper blue duvet',1.44,.037,.885,blue,[.23,1.787,upperZ],'decor');
  for(const zz of [-.30,.30])ellipsoid(childrenBunkBed,'Children bunk lower soft pillow',[.20,.067,.24],ceramic,[-.675,.522,zz]);
  ellipsoid(childrenBunkBed,'Children bunk upper soft pillow',[.20,.064,.32],ceramic,[-.675,1.798,upperZ]);
  box(childrenBunkBed,'Children bunk lower folded foot blanket',.30,.027,1.275,sand,[.78,.540,0],'decor');
  box(childrenBunkBed,'Children bunk upper folded foot blanket',.28,.021,.90,clay,[.79,1.816,upperZ],'decor');
  // A generous ladder opening is at the southern end, away from the entrance passage.
  for(const yy of [1.98,2.15]){
    box(childrenBunkBed,'Children bunk continuous wall guard',2.025,.065,.032,cream,[0,yy,-.69]);
    box(childrenBunkBed,'Children bunk room-side guard rail',1.41,.065,.032,cream,[.315,yy,.31]);
    box(childrenBunkBed,'Children bunk guard beside ladder end',.125,.065,.032,cream,[-.9575,yy,.31]);
  }
  for(const xx of [-.19,.20,.60])box(childrenBunkBed,'Children bunk guard vertical spindle',.025,.285,.025,oak,[xx,2.06,.31]);
  const ladder=group('Children bunk south-side inclined ladder',childrenBunkBed);
  for(const xx of [-.875,-.435])rod(ladder,'Children bunk rounded ladder stile',[xx,.02,.845],[xx,1.95,.33],.020,oak,'furniture');
  for(let i=0;i<6;i++){const y=.21+i*.283,z=.845-(y-.02)/1.93*.515;box(ladder,'Children bunk broad ladder tread',.47,.038,.10,cream,[-.655,y,z]);}
  childrenLadders.push(ladder);childrenBunkBed.ladder=ladder;
  // Inset lower drawers provide extra bedding storage without protruding into the aisle.
  for(const xx of [-.48,.48]){
    box(childrenBunkBed,'Children bunk inset bedding drawer',.91,.17,.46,cream,[xx,.128,.40]);
    box(childrenBunkBed,'Children bunk drawer oak pull',.13,.018,.015,oak,[xx,.15,.638],'decor');
  }

  // Two independent child-sized desks sit side by side along the east window.
  for(const [i,z] of [-.21,1.02].entries()){
    const name='Children window study desk '+(i+1),g=group(name,childrenRoom),colour=i===0?sage:blue;
    g.position.set(11.59,0,z);g.rotation.y=-Math.PI/2;
    g.desktop=box(g,name+' rounded-edge writing surface',1.10,.04,.50,oak,[0,.73,0]);
    for(const xx of [-.465,.465])for(const zz of [-.183,.183])box(g,name+' slim oak leg',.035,.71,.035,cream,[xx,.355,zz]);
    box(g,name+' low rear frame rail',.97,.045,.025,cream,[0,.625,-.20]);
    box(g,name+' shallow stationery drawer',.29,.09,.33,cream,[.375,.664,-.01]);
    box(g,name+' drawer colour front',.30,.083,.02,colour,[.375,.664,.16]);
    box(g,name+' small drawer pull',.10,.012,.018,oak,[.375,.67,.178],'decor');
    g.notebook=box(g,name+' open study notebook',.18,.010,.14,ceramic,[-.045,.756,.047],'decor');
    box(g,name+' notebook binding',.006,.013,.14,colour,[-.045,.757,.047],'decor');
    cylinder(g,name+' study lamp foot',.045,.012,charcoal,[-.15,.756,-.18]);
    rod(g,name+' study lamp neck',[-.15,.762,-.18],[-.15,.983,-.18],.006,metal);
    const lamp=cylinder(g,name+' study lamp shade',.042,.058,ceramic,[-.15,.994,-.153],'decor',.029);lamp.rotation.x=-.30;
    childrenDesks.push(g);
    const seat=chair(childrenRoom,'Children window study chair '+(i+1),10.99,z,colour);seat.rotation.y=-Math.PI/2;childrenChairs.push(seat);
  }

  // Continuous wall storage: a low belongings cubby, a full-height sliding wardrobe, and books.
  const childrenStorage=group('Children entrance toy and schoolbag cubby',childrenRoom),childrenDropZone=childrenStorage;
  childrenStorage.position.set(9.76,0,-1.165);
  for(const xx of [-.251,.251])box(childrenStorage,'Children entrance storage oak side',.018,.51,.48,oak,[xx,.275,0]);
  box(childrenStorage,'Children entrance storage back',.484,.482,.014,cream,[0,.274,-.233]);
  box(childrenStorage,'Children entrance storage recessed plinth',.47,.032,.41,charcoal,[0,.016,0]);
  box(childrenStorage,'Children entrance storage cubby floor',.484,.016,.455,oak,[0,.037,0]);
  box(childrenStorage,'Children entrance storage toy display top',.52,.025,.48,oak,[0,.5275,0]);
  // Open front lets the schoolbag remain visible and easy to reach from the door.
  const childrenBelongingAnchors={rabbit:{position:[-.13,.54,0],rotationY:0},bear:{position:[.13,.54,0],rotationY:0},backpack:{position:[0,.045,.02],rotationY:0}};

  const wardrobe=group('Children north-wall sliding wardrobe',childrenRoom);wardrobe.position.set(10.56,0,-1.165);
  for(const xx of [-.53,.53])box(wardrobe,'Children wardrobe full-height side',.02,2.22,.48,oak,[xx,1.16,0]);
  box(wardrobe,'Children wardrobe recessed plinth',1.025,.085,.43,charcoal,[0,.0425,0]);
  box(wardrobe,'Children wardrobe back',1.04,2.16,.014,cream,[0,1.17,-.233]);
  for(const yy of [.105,.52,1.78,2.26])box(wardrobe,'Children wardrobe fixed shelf',1.04,.022,.432,oak,[0,yy,-.011]);
  box(wardrobe,'Children wardrobe interior division',.018,1.237,.43,cream,[.14,1.15,-.01]);
  rod(wardrobe,'Children wardrobe hanging rail',[-.485,1.63,0],[.102,1.63,0],.009,metal);
  for(const [i,m] of [sage,blue,clay].entries()){
    const xx=-.365+i*.17;rod(wardrobe,'Children wardrobe oak hanger',[xx-.085,1.49,.02],[xx,1.58,.02],.005,oak);rod(wardrobe,'Children wardrobe oak hanger',[xx,1.58,.02],[xx+.085,1.49,.02],.005,oak);
    box(wardrobe,'Children wardrobe hanging cotton shirt',.15,.41,.035,m,[xx,1.275,.02],'decor');
    for(const side of [-1,1]){const sleeve=box(wardrobe,'Children wardrobe short shirt sleeve',.06,.145,.033,m,[xx+side*.087,1.423,.02],'decor');sleeve.rotation.z=side*.28;}
  }
  for(const yy of [.91,1.31])box(wardrobe,'Children wardrobe small folded shelf',.365,.020,.43,cream,[.3375,yy,0]);
  for(const [j,y] of [.58,.97,1.37].entries())for(let i=0;i<2;i++)box(wardrobe,'Children wardrobe folded cotton stack',.29,.05,.29,[sage,cream,blue][j],[.335,y+i*.052,.04],'decor');
  for(const x of [-.27,.27])box(wardrobe,'Children wardrobe upper storage box',.42,.26,.32,[sand,blue][x<0?0:1],[x,1.924,.012],'decor');
  const moving=group('Children wardrobe sliding fronts',wardrobe);moving.userData.noMerge=true;const panels=[];
  for(const side of [-1,1]){
    const p=group('Children wardrobe sliding leaf '+side,moving);p.position.set(side*.255,0,side<0?.255:.228);
    box(p,'Children wardrobe sliding ivory door',.525,2.095,.022,cream,[0,1.1775,0]);
    box(p,'Children wardrobe recessed oak pull',.014,.24,.002,oak,[side<0?-.19:.19,1.16,.0116],'decor');panels.push(p);
  }
  const id='children-wall-wardrobe';let amount=Number(getState()?.doors?.[id]??0);if(!Number.isFinite(amount))amount=0;amount=Math.max(0,Math.min(1,amount));
  const wardrobeRecord={id,label:'儿童房衣柜',kind:'cabinet',object:wardrobe,moving,anchor:wardrobe.localToWorld(new THREE.Vector3(0,1.23,.31)),amount,target:amount,panels,hotspot:true};
  wardrobeRecord.apply=()=>{panels[0].position.x=-.255+wardrobeRecord.amount*.505;moving.updateWorldMatrix(true,true);};
  wardrobeRecord.setOpen=(open,instant=false)=>{wardrobeRecord.target=open?1:0;setState({doors:{...(getState()?.doors||{}),[id]:wardrobeRecord.target}});if(instant){wardrobeRecord.amount=wardrobeRecord.target;wardrobeRecord.apply();}};
  wardrobeRecord.click=()=>{wardrobeRecord.setOpen(wardrobeRecord.target<.5);toast(wardrobeRecord.target?'拉开儿童房衣柜。':'收好儿童房衣柜。');};wardrobeRecord.apply();register(wardrobeRecord);childrenWardrobes.push(wardrobeRecord);

  const childrenBookcase=group('Children north-wall open bookcase',childrenRoom);childrenBookcase.position.set(11.32,0,-1.165);
  for(const xx of [-.21,.21])box(childrenBookcase,'Children bookcase oak side',.02,2.22,.48,oak,[xx,1.16,0]);
  box(childrenBookcase,'Children bookcase soft blue back',.40,2.16,.014,blue,[0,1.17,-.233]);
  box(childrenBookcase,'Children bookcase recessed plinth',.39,.085,.43,charcoal,[0,.0425,0]);
  for(const y of [.105,.55,1.00,1.45,1.90,2.26])box(childrenBookcase,'Children bookcase oak shelf',.40,.022,.455,oak,[0,y,-.004]);
  for(let shelf=0;shelf<4;shelf++)for(let i=0;i<6;i++){
    const h=.20+(i%3)*.035,w=.037,x=-.139+i*.052,y=.55+shelf*.45+.011;
    box(childrenBookcase,'Children bookcase upright book',w,h,.145,[sage,ceramic,clay,blue][(i+shelf)%4],[x,y+h/2,.075],'decor');
    for(const dy of [.032,h-.034])box(childrenBookcase,'Children bookcase book spine stripe',w*.68,.008,.002,sand,[x,y+dy,.1485],'decor');
  }
  box(childrenBookcase,'Children bookcase low woven storage basket',.31,.27,.34,sand,[0,.251,.025],'decor');
  box(childrenBookcase,'Children bookcase basket fabric pull',.09,.025,.009,cream,[0,.30,.200],'decor');

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
  const audit={sourceGLBUnchanged:true,removedMeshes:removed.length,removedNames:removed,removedWintergardenChairs:4,recliningBeanbags:loungers.map(bounds),childrenRoom:'Bedroom 3, nearest the entrance',childrenBunkBed:bounds(childrenBunkBed),childrenLayout:{bedWall:'west · shared bathroom wall',bedOrientation:'north-south',lowerMattressWidthM:1.28,upperMattressWidthM:.90,windowDesks:childrenDesks.map(bounds),deskWidthsM:[1.10,1.10],storageWall:'north wall',wardrobes:childrenWardrobes.length,wardrobe:bounds(wardrobe),toyStorage:bounds(childrenStorage),bookcase:bounds(childrenBookcase),ladders:childrenLadders.map(bounds),removedIndependentWardrobe:true,removedIntegratedLofts:true,windowTallFurniture:false},guestDesk:bounds(guestDesk),guestChair:bounds(guestChair),toiletrySets:bathrooms.length,bedroomCurtainTracks:curtains.length,bedroomCurtainPanels:curtains.length*2,wallRepairs:['Bedroom 2 north facade joint','Bedroom 2 partition extended to east glazing','Bedroom 3 south boundary extended to east glazing'],removedGlassSideWall:'Bedroom3 east return',collision:{solidFurnitureCategory:'furniture',wallCategories:['wall','upperWall'],curtainsAreDecorative:true}};
  return {root,curtains,childrenRoom,childrenBunkBed,childrenDesks,childrenWardrobes,childrenStorage,childrenBookcase,childrenChairs,childrenLadders,childrenDropZone,childrenBelongingAnchors,loungers,audit,update(dt){for(const wardrobe of childrenWardrobes){if(Math.abs(wardrobe.amount-wardrobe.target)<.0001)continue;wardrobe.amount+=(wardrobe.target-wardrobe.amount)*(1-Math.exp(-dt*6));if(Math.abs(wardrobe.amount-wardrobe.target)<.0002)wardrobe.amount=wardrobe.target;wardrobe.apply();}for(const c of curtains){if(Math.abs(c.amount-c.target)<.0001)continue;c.amount+=(c.target-c.amount)*(1-Math.exp(-dt*4));if(Math.abs(c.amount-c.target)<.0002)c.amount=c.target;c.apply();}},dispose(){root.removeFromParent();for(const [o,s] of originals){s.parent.add(o);o.position.copy(s.position);o.scale.copy(s.scale);o.quaternion.copy(s.quaternion);}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
