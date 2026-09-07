import {addTranslations} from './i18n.js?v=13';
import {createPlantLifecycle,PLANTS,VASES,PLANT_TRANSLATIONS} from './plant-lifecycle.js?v=13';
addTranslations(PLANT_TRANSLATIONS);
// Runtime additions anchored to the recovered GLB; call before static batching.
export function setupSmartHome({THREE,scene,model,register=()=>{},getState=()=>({}),setState=()=>{},toast=()=>{},openControls=()=>{},openGarden=()=>{},openVases=openGarden,navigation={},plantLife=createPlantLifecycle({getState,setState})}){
  const S=.022381665533985514,P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),raw=o=>o.userData?.name||o.name||'';
  const roots=[],colliderRoots=[],materials=new Set(),geometries=new Set(),originals=new Map(),records=[];
  const all=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)all.push(o);});
  const find=n=>all.find(o=>raw(o)===n),starts=p=>all.filter(o=>raw(o).startsWith(p));
  let disposed=false,clockSecond=-1,elapsedNow=0;
  function remember(o){if(!originals.has(o))originals.set(o,{parent:o.parent,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),visible:o.visible,material:o.material,noMerge:o.userData.noMerge,interaction:o.userData.interactionId});}
  function group(name,parent=scene){const g=new THREE.Group();g.name=name;g.userData.noMerge=true;parent.add(g);if(parent===scene)roots.push(g);return g;}
  function mat(name,params){const m=new THREE.MeshStandardMaterial(params);m.name=name;materials.add(m);return m;}
  function mesh(g,m,p,name){geometries.add(g);const o=new THREE.Mesh(g,m);o.name=name;o.userData.noMerge=true;for(let ancestor=p;ancestor;ancestor=ancestor.parent){if(ancestor.userData.interactionId){o.userData.interactionId=ancestor.userData.interactionId;break;}}o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
  const ivory=mat('SmartHome warm ivory enamel',{color:0xede6d8,metalness:.22,roughness:.32});
  const metal=mat('SmartHome pale champagne metal',{color:0xb6ac96,metalness:.78,roughness:.31});
  const dark=mat('SmartHome soft charcoal',{color:0x343832,metalness:.1,roughness:.60});
  const oak=mat('SmartHome warm timber',{color:0xb19b78,roughness:.63});
  const green=mat('SmartHome sage green',{color:0x667853,roughness:.8});
  const box=(p,n,w,h,d,m=ivory)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,n);
  const cyl=(p,n,rt,rb,h,m=ivory,segments=24)=>mesh(new THREE.CylinderGeometry(rt,rb,h,segments),m,p,n);
  const ball=(p,n,r,m)=>mesh(new THREE.SphereGeometry(r,16,10),m,p,n);
  function adopt(g,objects){g.updateWorldMatrix(true,true);for(const o of objects){remember(o);g.attach(o);o.userData.noMerge=true;}}
  function removeOriginal(o){remember(o);o.removeFromParent();}
  function record(r){r.object.traverse(o=>{o.userData.noMerge=true;});records.push(r);register(r);return r;}
  function persist(section,values){const current=getState()?.[section]||{};if(Object.entries(values).some(([k,v])=>current[k]!==v))setState({[section]:{...current,...values}});}
  const initial=getState()?.smart||{};
  let curtainsOpen=initial.curtainsOpen!==false,lightsOn=initial.lightsOn!==false,vacuumAuto=initial.vacuumAuto!==false;

  // Reuse the mounted entry control screen, including its original casing.
  const controlPanel=group('Smart home control screen');
  adopt(controlPanel,[find('Entry smart scene panel'),find('Entry smart panel display')].filter(Boolean));
  if(controlPanel.children.length)record({id:'smart-controls',label:'智能家居',kind:'controls',object:controlPanel,anchor:P(1090,553,1.43),click:()=>openControls()});

  // Continuous pleated fabric slides on the original fixed rail. The frame/rail never scales.
  const oldCurtains=all.filter(o=>o.userData.category==='curtain');oldCurtains.forEach(removeOriginal);
  const linenSource=oldCurtains.find(o=>raw(o)==='Living curtain fold')?.material;
  const linen=linenSource?.clone()||new THREE.MeshStandardMaterial({color:0xe6e0d2,roughness:.98});
  linen.name='SmartHome continuous pleated linen';linen.side=THREE.DoubleSide;materials.add(linen);
  const curtains=[],leftX=P(594,0).x,rightX=P(1156,0).x,halfSpan=(rightX-leftX)/2;
  const trackZ=P(0,310).z,openWidth=.39;
  for(const [id,side,x] of [['left',1,leftX],['right',-1,rightX]]){
    const g=group('Moving curtain '+id);g.position.set(x,.10,trackZ);
    const divisions=144,positions=[],uv=[],indices=[];
    // Local x is always positive; the right curtain has a reflected geometry rather than a negative scale.
    for(let row=0;row<2;row++)for(let i=0;i<=divisions;i++){const t=i/divisions;positions.push(side*t,row*2.50,Math.cos(t*Math.PI*2*24)*.029);uv.push(t*4,row);}
    for(let i=0;i<divisions;i++){const a=i,b=i+1,c=i+divisions+1,d=c+1;indices.push(a,b,c,b,d,c);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const cloth=mesh(geometry,linen,g,'Pleated linen curtain '+id);cloth.userData.category='curtain';
    const hem=box(g,'Curtain bottom sewn hem '+id,1,.022,.018,linen);hem.position.set(side*.5,.015,0);
    for(let i=0;i<=16;i++){const glider=cyl(g,'Curtain rail glider '+id,.008,.008,.05,metal,8);glider.position.set(side*i/16,2.52,0);}
    const c={object:g,side,openAmount:curtainsOpen?1:0,target:curtainsOpen?1:0,closedWidth:halfSpan};
    c.apply=()=>{g.scale.x=halfSpan+(openWidth-halfSpan)*c.openAmount;for(const child of g.children)if(child.name.startsWith('Curtain rail glider'))child.scale.x=1/g.scale.x;g.updateMatrixWorld(true);};c.apply();curtains.push(c);colliderRoots.push(g);
    record({id:'curtains-'+id,label:'电动窗帘',kind:'curtain',object:g,anchor:new THREE.Vector3(x+side*.18,1.45,trackZ+.03),click:()=>setCurtains(!curtainsOpen)});
  }
  function setCurtains(open){curtainsOpen=!!open;curtains.forEach(c=>c.target=curtainsOpen?1:0);persist('smart',{curtainsOpen});return curtainsOpen;}

  // Open the original southern divider leaf; no fixed glazing remains in its doorway.
  const indoorDivider=group('Indoor balcony sliding door'),dividerX=-9.33315452767196,dividerStart=-.6378774677185871,dividerEnd=.828121624757464,dividerWidth=dividerEnd-dividerStart;
  indoorDivider.position.set(dividerX-.032,0,(dividerStart+dividerEnd)/2);
  const dividerPane=find('Wintergarden sliding divider glazing 3');if(dividerPane){adopt(indoorDivider,[dividerPane]);dividerPane.position.x=0;}
  const dividerFrameSource=find('Wintergarden sliding divider mullion 3')?.material||metal;
  for(const z of [-dividerWidth/2+.022,dividerWidth/2-.022]){const upright=box(indoorDivider,'Indoor balcony sliding leaf upright',.044,2.59,.044,dividerFrameSource);upright.position.set(0,1.375,z);upright.userData.category='door';}
  for(const y of [.052,2.66]){const bar=box(indoorDivider,'Indoor balcony sliding leaf horizontal',.044,.044,dividerWidth,dividerFrameSource);bar.position.set(0,y,0);bar.userData.category='door';}
  const dividerHandle=box(indoorDivider,'Indoor balcony sliding door handle',.070,.28,.025,metal);dividerHandle.position.set(-.035,1.12,dividerWidth/2-.12);
  const oldDividerRail=starts('Wintergarden sliding divider horizontal frame').find(o=>new THREE.Box3().setFromObject(o).max.y<.2);
  if(oldDividerRail){const bounds=new THREE.Box3().setFromObject(oldDividerRail),rail=group('Indoor balcony fixed divider rail');
    const fixed=box(rail,'Preserved fixed divider bottom frame',bounds.max.x-bounds.min.x,bounds.max.y-bounds.min.y,dividerStart-bounds.min.z,oldDividerRail.material);fixed.position.set(dividerX,(bounds.max.y+bounds.min.y)/2,(bounds.min.z+dividerStart)/2);fixed.userData.category='window';
    const flush=box(rail,'Indoor balcony flush sliding track',.14,.012,dividerWidth,metal);flush.position.set(dividerX,.006,(dividerStart+dividerEnd)/2);flush.userData.category='decoration';removeOriginal(oldDividerRail);colliderRoots.push(rail);
  }
  const indoorDoor={object:indoorDivider,baseZ:indoorDivider.position.z,amount:getState().doors?.['indoor-balcony']?1:0,target:getState().doors?.['indoor-balcony']?1:0,width:dividerWidth};
  function setIndoorDoor(open){indoorDoor.target=open?1:0;setState({doors:{'indoor-balcony':!!open}});return !!open;}
  function applyIndoorDoor(){indoorDivider.position.z=indoorDoor.baseZ-indoorDoor.amount*(dividerWidth+.035);indoorDivider.updateMatrixWorld(true);}
  applyIndoorDoor();colliderRoots.push(indoorDivider);
  record({id:'indoor-balcony-door',label:'室内阳台推拉门',kind:'door',object:indoorDivider,anchor:new THREE.Vector3(dividerX,1.2,indoorDoor.baseZ),click:()=>setIndoorDoor(indoorDoor.target<.5)});

  // One cabinet-height, side-by-side smart refrigerator fills the cold-appliance bay beside the oven.
  const refrigerators=[];
  for(const prefix of ['Integrated fridge','Integrated freezer'])starts(prefix+' · ').forEach(removeOriginal);
  {
    const x1=888,x2=958,label='双开门智能冰箱',g=group('Cabinet-height side-by-side smart refrigerator'),w=(x2-x1)*S-.04,d=.595,height=2.46;
    const steel=mat('Smart refrigerator satin pearl metal',{color:0xc5cfca,metalness:.53,roughness:.26});
    const displayMat=mat('Smart refrigerator glass display',{color:0x203e42,roughness:.15,metalness:.23,emissive:0x16333a,emissiveIntensity:.25});
    const lightMat=mat('Smart refrigerator soft display pixels',{color:0xc9eee0,roughness:.4,emissive:0xb9e6db,emissiveIntensity:.28});
    g.position.copy(P((x1+x2)/2,548.8));g.userData.category='appliance';
    const body=box(g,label+' full-height insulated case',w,height-.11,d,steel);body.position.y=(height+.11)/2;
    const footOffset=w/2-.055;
    for(const xx of [-footOffset,footOffset])for(const zz of [-d/2+.06,d/2-.06]){const foot=cyl(g,label+' adjustable foot',.024,.027,.11,dark,12);foot.position.set(xx,.055,zz);}
    const doorWidth=(w-.022)/2,doorHeight=height-.15;
    for(const side of [-1,1]){
      const x=side*(doorWidth/2+.0055),seal=box(g,label+' full-height door gasket',doorWidth,doorHeight+.004,.012,dark);seal.position.set(x,.115+doorHeight/2,-d/2-.006);
      const door=box(g,label+' '+(side<0?'left freezer door':'right refrigerator door'),doorWidth-.009,doorHeight,.042,steel);door.position.set(x,.115+doorHeight/2,-d/2-.032);
      const handleX=side*.057,handle=cyl(g,label+' long vertical handle',.011,.011,.86,metal,14);handle.position.set(handleX,1.26,-d/2-.103);
      for(const yy of [.86,1.66]){const mount=box(g,label+' handle mounting',.019,.023,.048,metal);mount.position.set(handleX,yy,-d/2-.079);}
    }
    const screenX=-w*.265,screenY=1.48,screenZ=-d/2-.06;
    const bezel=box(g,label+' large portrait touchscreen bezel',.48,.85,.021,dark);bezel.position.set(screenX,screenY,screenZ);
    const screen=box(g,label+' large glass touchscreen',.442,.803,.005,displayMat);screen.position.set(screenX,screenY,screenZ-.013);
    // Universal numerals and icon tiles keep the appliance legible in either interface language.
    const pixelZ=screenZ-.017;
    for(let i=0;i<3;i++){const tile=box(g,label+' touchscreen care tile',.107,.122,.003,i===1?green:ivory);tile.position.set(screenX+(i-1)*.135,1.235,pixelZ);}
    const line=box(g,label+' touchscreen divider',.357,.003,.003,lightMat);line.position.set(screenX,1.374,pixelZ);
    const segments={0:[0,1,2,3,4,5],1:[1,2],4:[1,2,5,6],8:[0,1,2,3,4,5,6]};
    function digit(n,x,y,scale=.075){for(const s of segments[n]){const horizontal=[0,3,6].includes(s),dy=({0:1,1:.5,2:-.5,3:-1,4:-.5,5:.5,6:0})[s]*scale,dx=horizontal?0:([1,2].includes(s)?1:-1)*scale*.51;const part=box(g,label+' temperature digit',horizontal?scale*.91:.009,horizontal?.009:scale*.80,.003,lightMat);part.position.set(x+dx,y+dy,pixelZ);}}
    digit(0,screenX-.067,1.677,.062);digit(4,screenX+.029,1.677,.062);
    const degree=mesh(new THREE.TorusGeometry(.012,.003,6,12),lightMat,g,label+' temperature degree');degree.position.set(screenX+.111,1.722,pixelZ);
    const freezerMinus=box(g,label+' freezer minus sign',.025,.006,.003,lightMat);freezerMinus.position.set(screenX-.105,1.482,pixelZ);digit(1,screenX-.05,1.482,.035);digit(8,screenX+.011,1.482,.035);
    const badge=box(g,label+' small metal badge',.09,.012,.003,metal);badge.position.set(w*.265,2.23,-d/2-.055);
    const vent=box(g,label+' recessed ventilation grille',w-.12,.043,.016,dark);vent.position.set(0,.058,-d/2+.01);
    refrigerators.push({object:g,label,planBounds:[x1,x2],sideGapM:.02,heightM:height,doors:2,screenDiagonalInches:23.7});colliderRoots.push(g);
  }

  // End the cabinet toe-kick at the cold-appliance bays; their real adjustable feet remain exposed.
  const oldPlinth=find('Tall kitchen appliance bank · recessed plinth');
  if(oldPlinth){const bounds=new THREE.Box3().setFromObject(oldPlinth),p=group('Cabinet plinth outside refrigerator bays');
    for(const [a,b] of [[bounds.min.x,P(888,0).x],[P(958,0).x,bounds.max.x]]){const part=box(p,'Preserved recessed cabinet toe-kick',b-a,bounds.max.y-bounds.min.y,bounds.max.z-bounds.min.z,oldPlinth.material);part.position.set((a+b)/2,(bounds.min.y+bounds.max.y)/2,(bounds.min.z+bounds.max.z)/2);}
    removeOriginal(oldPlinth);colliderRoots.push(p);
  }

  // Slim freestanding utility caddy left of the laundry sink, clear of the doorway.
  const utility=group('Laundry cleaning tools');utility.position.copy(P(1014.3,447,.015));utility.userData.category='furniture';
  const rack=box(utility,'Cleaning caddy floor base',.23,.045,.30,dark);rack.position.y=.0225;
  for(const xx of [-.10,.10]){const post=box(utility,'Cleaning caddy upright support',.018,1.38,.023,metal);post.position.set(xx,.69,.13);}
  for(const yy of [.57,1.20]){const clip=box(utility,'Cleaning caddy holding rail',.23,.04,.023,metal);clip.position.set(0,yy,.13);}
  const bristles=mat('SmartHome broom natural bristle',{color:0xbaa67c,roughness:1});
  const mopCloth=mat('SmartHome mop cotton',{color:0xd4d6cb,roughness:1});
  function pole(name,x,z,height,m=oak){const o=cyl(utility,name,.010,.010,height,m,10);o.position.set(x,height/2+.045,z);return o;}
  pole('Broom shaft',-.066,.052,1.49);const broom=box(utility,'Broom supported brush head',.105,.070,.052,oak);broom.position.set(-.066,.084,.052);
  for(let i=0;i<9;i++){const br=box(utility,'Broom bristle bundle',.008,.055,.047,bristles);br.position.set(-.110+i*.011,.0275,.052);}
  pole('Mop shaft',.045,.042,1.39,metal);
  for(let i=0;i<9;i++){const strand=cyl(utility,'Mop cotton strand',.007,.014,.065,mopCloth,8);strand.position.set(.045+Math.cos(i)*.028,.033,Math.sin(i)*.026+.042);strand.rotation.z=Math.sin(i)*.17;}
  const pan=box(utility,'Dustpan floor tray',.15,.014,.14,green);pan.position.set(-.018,.008,-.077);
  const panBack=box(utility,'Dustpan back lip',.15,.055,.012,green);panBack.position.set(-.018,.034,-.017);
  pole('Dustpan handle',-.018,-.007,.90,green);
  const vacuumFoot=box(utility,'Stick vacuum standing floorhead',.105,.038,.10,dark);vacuumFoot.position.set(.054,.020,-.105);
  const vacuumNeck=cyl(utility,'Stick vacuum floorhead connection',.014,.017,.030,metal,12);vacuumNeck.position.set(.054,.044,-.105);
  pole('Stick vacuum wand',.054,-.105,1.06,metal);
  const handheld=cyl(utility,'Stick vacuum motor body',.035,.035,.23,green,20);handheld.position.set(.054,1.02,-.105);
  const handle=mesh(new THREE.TorusGeometry(.047,.009,8,18),dark,utility,'Stick vacuum handle');handle.position.set(.054,1.16,-.105);
  colliderRoots.push(utility);

  // Fixture emission and local light sources really turn off; daylight remains a separate root control.
  const fixtureEmission=[];
  for(const o of all){if(!o.material||!['ceilingFixture','furniture'].includes(o.userData.category))continue;
    if(!/lamp shade|pendant light|Ceiling accent.* light/i.test(raw(o)))continue;
    remember(o);const m=o.material.clone();materials.add(m);o.material=m;o.userData.noMerge=true;
    fixtureEmission.push({object:o,material:m,color:m.emissive.clone(),intensity:m.emissiveIntensity||1});
  }
  const lighting=group('Controllable warm room lights'),roomLights=[];
  for(const [x,z,y,power] of [[624,433,2.35,7.5],[776,423,2.10,5],[871,463,2.32,4],[525,634,2.32,4]]){
    const l=new THREE.PointLight(0xffdfb1,power,6,2);l.position.copy(P(x,z,y));l.userData.homePower=power;lighting.add(l);roomLights.push(l);
  }
  function setLights(on){lightsOn=!!on;for(const f of fixtureEmission){f.material.emissive.copy(f.color);f.material.emissiveIntensity=lightsOn?f.intensity:0;}for(const l of roomLights)l.intensity=lightsOn?l.userData.homePower:0;persist('smart',{lightsOn});return lightsOn;}
  setLights(lightsOn);

  // A wall-mounted analogue clock shares the top-bar's Sydney time zone.
  const clock=group('Sydney wall clock');clock.position.copy(P(1089.7,553,2.10));clock.rotation.y=-Math.PI/2;
  const frame=cyl(clock,'Clock champagne rim',.174,.174,.049,metal,64);frame.rotation.x=Math.PI/2;
  const mountWall=find('Entry wall west');
  if(mountWall){const wallFace=new THREE.Box3().setFromObject(mountWall).min.x,depth=Math.max(.003,wallFace-clock.position.x-.0245);const mount=cyl(clock,'Clock concealed wall mounting peg',.017,.017,depth+.002,metal,12);mount.rotation.x=Math.PI/2;mount.position.z=-.0245-depth/2;}
  const face=mesh(new THREE.CircleGeometry(.163,64),ivory,clock,'Clock ivory face');face.position.z=.025;
  for(let i=0;i<12;i++){const mark=box(clock,'Clock hour marker',i%3===0?.009:.005,i%3===0?.025:.014,.002,dark);const a=i*Math.PI/6;mark.position.set(Math.sin(a)*.137,Math.cos(a)*.137,.027);mark.rotation.z=-a;}
  const hourHand=group('Sydney hour hand',clock),minuteHand=group('Sydney minute hand',clock),secondHand=group('Sydney second hand',clock);
  for(const [g,len,w,z,m] of [[hourHand,.083,.009,.033,dark],[minuteHand,.120,.006,.039,dark],[secondHand,.132,.0025,.045,metal]]){const h=box(g,g.name,w,len,.003,m);h.position.set(0,len*.38,z);}
  const hub=ball(clock,'Clock hand axle',.008,metal);hub.position.z=.048;
  const sydneyClock=new Intl.DateTimeFormat('en-AU',{timeZone:'Australia/Sydney',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  function updateClock(now=new Date()){const seconds=Math.floor(now.getTime()/1000);if(seconds===clockSecond)return;clockSecond=seconds;const parts=Object.fromEntries(sydneyClock.formatToParts(now).map(p=>[p.type,p.value]));const h=Number(parts.hour),m=Number(parts.minute),s=Number(parts.second);hourHand.rotation.z=-(h%12+m/60)*Math.PI/6;minuteHand.rotation.z=-(m+s/60)*Math.PI/30;secondHand.rotation.z=-s*Math.PI/30;}
  updateClock();

  // Planting game: all growth grows out of the same supported pot and soil surface.
  const gardenRoot=group('Interactive wintergarden planter');gardenRoot.position.copy(P(420,439,0));gardenRoot.userData.category='furniture';gardenRoot.userData.interactionId='garden-planter';
  const terracotta=mat('SmartHome warm clay pot',{color:0xb87558,roughness:.86});
  const soilMat=mat('SmartHome potting soil',{color:0x4b3727,roughness:1});
  const leafMat=mat('SmartHome living plant leaf',{color:0x4f7743,roughness:.8});
  const petalMaterials={daisy:mat('SmartHome daisy petals',{color:0xfff1dc,roughness:.75}),tulip:mat('SmartHome tulip petals',{color:0xdf9a88,roughness:.72}),sunflower:mat('SmartHome sunflower petals',{color:0xe7bb48,roughness:.76})};
  const pollen=mat('SmartHome flower centre',{color:0xa27a38,roughness:1});
  const pot=mesh(new THREE.CylinderGeometry(.18,.13,.25,32,1,true),terracotta,gardenRoot,'Garden pot open sides');pot.position.y=.125;
  const potBottom=cyl(gardenRoot,'Garden pot supported bottom',.13,.13,.012,terracotta);potBottom.position.y=.006;
  const rim=mesh(new THREE.TorusGeometry(.177,.009,10,40),terracotta,gardenRoot,'Garden pot rolled rim');rim.rotation.x=Math.PI/2;rim.position.y=.25;
  const soil=cyl(gardenRoot,'Garden soil surface',.164,.164,.022,soilMat,40);soil.position.y=.224;
  const growth=group('Plant growth stages',gardenRoot),waterFX=group('Garden watering drops',gardenRoot);
  const waterMat=mat('SmartHome watering droplets',{color:0x95cbd1,roughness:.15,metalness:.12});
  for(let i=0;i<12;i++){const d=ball(waterFX,'Garden falling water droplet',.005,waterMat);d.position.set(Math.sin(i*2.1)*.09,.35+i*.025,Math.cos(i*2.1)*.09);}
  waterFX.visible=false;let wateringUntil=0;
  const gardenId='indoor-planter';plantLife.ensureBed(gardenId,{legacy:getState()?.garden||{},species:null});
  let garden=plantLife.getBed(gardenId),gardenSignature='';
  const seedNames={daisy:'雏菊',tulip:'郁金香',sunflower:'向日葵'};
  const dryLeaf=mat('SmartHome withered foliage',{color:0x9a8765,roughness:1});
  function clearGrowth(){for(const o of [...growth.children]){o.traverse(m=>{if(m.isMesh){m.geometry.dispose();geometries.delete(m.geometry);}});o.removeFromParent();}}
  function rebuildPlant(){clearGrowth();garden=plantLife.getBed(gardenId);if(!garden.species)return;
    const stage=garden.stage,dead=stage===4;if(stage===0){const seed=ball(growth,garden.bulb?'Tulip bulb':'Visible planted seed',garden.bulb?.027:.012,oak);seed.position.set(0,.241,0);return;}
    const height=[0,.12,.38,.61,.46][stage],stem=cyl(growth,'Growing continuous plant stem',.005,.008,height,dead?dryLeaf:leafMat,10);stem.position.y=.235+height/2;if(dead)stem.rotation.z=.35;
    for(let i=0;i<Math.min(stage,3)*2;i++){const leaf=ball(growth,'Growing plant leaf',1,dead?dryLeaf:leafMat);const direction=i%2?1:-1;leaf.scale.set(.065,.014,.025);leaf.position.set(direction*.041,.257+height*(i+1)/(Math.min(stage,3)*2+1),Math.sin(i)*.015);leaf.rotation.z=direction*(dead?-.7:.40);}
    if(stage===3&&!garden.harvestedAt){const bloom=group('Collectable '+seedNames[garden.species]+' blossom',growth);bloom.position.y=.235+height;
      const center=ball(bloom,'Flower pollen centre',garden.species==='sunflower'?.037:.021,pollen);center.scale.y=.6;
      const petals=garden.species==='tulip'?6:12;
      for(let i=0;i<petals;i++){const a=i/petals*Math.PI*2,r=garden.species==='sunflower'?.052:.040;const petal=ball(bloom,'Flower petal',1,petalMaterials[garden.species]||petalMaterials.daisy);petal.scale.set(.031,garden.species==='tulip'?.048:.012,.021);petal.position.set(Math.cos(a)*r,garden.species==='tulip'?.026:0,Math.sin(a)*r);petal.rotation.y=-a;}
    }
  }
  function plantAction(result,message){if(result.ok){toast(message);syncGarden();return result.bed||result.gift||true;}toast({moist:'土壤还湿润，等它需要水时再来。',fed:'盆土里还有养分，暂时不用施肥。',inactive:'先清理花盆，再种下新的植物吧。','clear-first':'先清理凋谢的植物，再重新种植。',occupied:'这盆植物还在生长，先好好照顾它吧。','not-flowering':'等真正开花后，再剪下一枝。','not-withered':'植物还在生长，不需要清理。'}[result.reason]||'暂时没有可用的花枝。');return false;}
  function plant(seed='daisy'){return plantAction(plantLife.plant(gardenId,seed),'种好了，给它一点时间慢慢长大。');}
  function water(){const result=plantAction(plantLife.water(gardenId),'浇好水了，它会按自己的节奏慢慢长大。');if(result){wateringUntil=elapsedNow+1.4;waterFX.visible=true;}return result;}
  function fertilize(){return plantAction(plantLife.fertilize(gardenId),'添好了养分，等它慢慢吸收。');}
  function harvest(){return plantAction(plantLife.harvest(gardenId),'剪下一枝，可以放进家里的花瓶。');}
  function clearPlant(){return plantAction(plantLife.clear(gardenId),'花盆清理好了，可以重新播种。');}
  function getGardenStatus(){const g=plantLife.getBed(gardenId);return {...g,flowersCollected:g.flowers,seeds:Object.entries(seedNames).map(([id,label])=>({id,label,nameEn:PLANTS[id].nameEn,bulb:!!PLANTS[id].bulb}))};}
  function syncGarden(){const g=plantLife.getBed(gardenId),signature=[g.species,g.phase,g.harvestedAt].join(':');if(signature!==gardenSignature){gardenSignature=signature;rebuildPlant();}syncVases();}
  rebuildPlant();colliderRoots.push(gardenRoot);
  record({id:'garden-planter',label:'我的小花园',kind:'garden',object:gardenRoot,anchor:P(420,439,.45),click:()=>openGarden()});

  // Three supported table vases share harvested stems with both gardens.
  const vaseObjects=[];
  for(const [id,tableName,dx,dz] of [['living','Living coffee table rounded solid oak top',-.68,.37],['dining','Dining table top',-.23,-.78],['balcony','Wintergarden table top',.20,.10]]){
    const table=find(tableName);if(!table)continue;const bounds=new THREE.Box3().setFromObject(table),centre=bounds.getCenter(new THREE.Vector3());
    const g=group('Flower vase '+id);g.position.set(centre.x+dx,bounds.max.y+.002,centre.z+dz);g.userData.interactionId='flower-vase-'+id;
    const profile=[[.05,0],[.075,.015],[.084,.08],[.060,.17],[.036,.23],[.035,.245],[.029,.245],[.030,.225],[.052,.17],[.075,.08],[.064,.019],[.05,.014]].map(p=>new THREE.Vector2(...p));
    mesh(new THREE.LatheGeometry(profile,24),ivory,g,'Hand-thrown ceramic vase');const stems=group('Vase arrangement '+id,g);vaseObjects.push({id,object:g,stems,signature:''});
    record({id:'flower-vase-'+id,label:VASES[id].name,kind:'garden',object:g,hotspot:false,anchor:g.position.clone().add(new THREE.Vector3(0,.4,0)),click:()=>openVases()});
  }
  function syncVases(){for(const vase of vaseObjects){const v=plantLife.getVase(vase.id),signature=[v.species,v.cuttingId,v.withered].join(':');if(signature===vase.signature)continue;vase.signature=signature;for(const child of [...vase.stems.children]){child.traverse(o=>{if(o.isMesh){geometries.delete(o.geometry);o.geometry.dispose();}});child.removeFromParent();}if(v.empty)continue;
    for(let i=0;i<3;i++){const g=group('Cut stem '+i,vase.stems),h=.35+i*.035;g.position.set((i-1)*.025,.14,(i%2)*.025);g.rotation.z=(i-1)*(v.withered?.32:.12);const stem=cyl(g,'Cut flower stem',.003,.004,h,v.withered?dryLeaf:leafMat,8);stem.position.y=h/2;for(const side of [-1,1]){const leaf=ball(g,'Cut flower leaf',.036,v.withered?dryLeaf:leafMat);leaf.scale.set(1,.18,.45);leaf.position.set(side*.03,h*.4,0);leaf.rotation.z=side*.4;}
      if(!v.withered){if(['mint','rosemary','lavender'].includes(v.species)){for(let k=0;k<4;k++){const bud=ball(g,'Herb flowering tip',.012,petalMaterials.tulip);bud.position.set(Math.sin(k)*.011,h+k*.013,0);}}else{const center=ball(g,'Cut flower pollen',.018,pollen);center.position.y=h;for(let k=0;k<8;k++){const a=k*Math.PI/4,petal=ball(g,'Cut flower petal',.026,petalMaterials[v.species]||petalMaterials.daisy);petal.scale.set(.6,v.species==='tulip'?1.2:.22,1.2);petal.position.set(Math.sin(a)*.034,h,Math.cos(a)*.034);petal.rotation.y=-a;}}}
    }
  }}
  function arrangeFlowers(vaseId,cuttingId){const result=plantLife.arrange(vaseId,cuttingId);if(result.ok){syncVases();toast('把这一枝放进花瓶，让家里多一点颜色。');}else toast('先等花开，剪下一枝后就可以插花了。');return result;}
  const unsubscribePlants=plantLife.subscribe(syncGarden);syncGarden();let lastPlantMinute=-1;

  // The robot uses graph edges, plus a validated low-height connector beneath the floating TV bench.
  const vacuum=group('Automatic robot vacuum'),dock=group('Robot vacuum charging station');
  const oldVac=find('Robot vacuum'),oldDock=find('Robot vacuum dock');
  const dockPosition=P(699,532.8,.001);
  vacuum.position.copy(dockPosition);
  if(oldVac){adopt(vacuum,[oldVac]);oldVac.position.set(0,.0425,0);oldVac.quaternion.identity();}
  else{const body=cyl(vacuum,'Robot vacuum body',.17,.17,.085,dark,40);body.position.y=.0425;}
  dock.position.copy(P(699,542.2,0));
  if(oldDock){adopt(dock,[oldDock]);oldDock.position.set(0,.145,0);oldDock.rotation.y=-Math.PI/2;}
  else{const body=box(dock,'Robot dock',.31,.29,.08,dark);body.position.y=.145;}
  const robotLid=cyl(vacuum,'Robot vacuum ivory lid',.156,.156,.006,ivory,40);robotLid.position.y=.082;
  const indicatorMat=mat('SmartHome vacuum indicator',{color:0x88b894,emissive:0x3b784c,emissiveIntensity:.6,roughness:.3});
  const indicator=box(vacuum,'Robot cleaning status lamp',.033,.004,.010,indicatorMat);indicator.position.set(0,.087,-.075);
  const brush=group('Robot rotating side brush',vacuum);brush.position.set(.125,.009,-.08);
  for(let i=0;i<3;i++){const b=box(brush,'Robot side brush bristles',.065,.007,.012,dark);const a=i*Math.PI*2/3;b.position.set(Math.cos(a)*.024,0,Math.sin(a)*.024);b.rotation.y=-a;}
  colliderRoots.push(vacuum,dock);
  record({id:'vacuum-robot',label:'扫地机器人',kind:'vacuum',object:vacuum,anchor:dockPosition.clone().setY(.22),click:()=>clean()});
  const messGroup=group('Cat mess spots'),messes=[];
  const messMat=mat('SmartHome cleanable spill',{color:0x807342,roughness:1});
  const radius=.18,robotTop=.105;
  const floors=all.filter(o=>o.userData.category==='floor').map(o=>new THREE.Box3().setFromObject(o));
  const staticObstacles=[];
  for(const o of all){if(!o.parent||[oldVac,oldDock].includes(o)||o.userData.category==='floor'||/rug|carpet/i.test(raw(o)))continue;
    const b=new THREE.Box3().setFromObject(o);if(b.min.y>=robotTop||b.max.y<=.018||b.isEmpty())continue;staticObstacles.push({name:raw(o),bounds:b});}
  const points=(navigation.points||[]).map(p=>new THREE.Vector3(Number(p[0]),.001,Number(p[1]))).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
  const edges=(navigation.edges||[]).filter(e=>Number.isInteger(e[0])&&Number.isInteger(e[1])&&points[e[0]]&&points[e[1]]);
  const distanceXZ=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  function circleBox(point,b,r=b.robotSafetyRadius??radius){if(b.robotCatCentre)return Math.hypot(point.x-b.robotCatCentre.x,point.z-b.robotCatCentre.z)<.60-1e-7;const dx=Math.max(b.min.x-point.x,0,point.x-b.max.x),dz=Math.max(b.min.z-point.z,0,point.z-b.max.z);return dx*dx+dz*dz<r*r-1e-7;}
  function floorSupported(p){for(const [dx,dz] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){if(!floors.some(b=>p.x+dx>=b.min.x-.002&&p.x+dx<=b.max.x+.002&&p.z+dz>=b.min.z-.002&&p.z+dz<=b.max.z+.002))return false;}return true;}
  function staticClear(p){return floorSupported(p)&&!staticObstacles.some(o=>circleBox(p,o.bounds));}
  function segmentClear(a,b,obstacles=null){const steps=Math.max(1,Math.ceil(distanceXZ(a,b)/.015));for(let j=0;j<=steps;j++){const p=a.clone().lerp(b,j/steps);if(obstacles?obstacles.some(o=>circleBox(p,o)):!staticClear(p))return false;}return true;}
  const validEdges=edges.filter(([a,b])=>segmentClear(points[a],points[b]));
  let dockNode=points.length?points.reduce((best,p,i)=>distanceXZ(p,dockPosition)<distanceXZ(points[best],dockPosition)?i:best,0):-1;
  const connector=dockNode<0?[]:[dockPosition.clone(),new THREE.Vector3(points[dockNode].x,.001,dockPosition.z),points[dockNode].clone()];
  let connectorClear=connector.length>0&&connector.slice(1).every((p,i)=>segmentClear(connector[i],p));
  // The robot fits below the floating media bench. A second checked connection reaches
  // the same graph's left end, so a stationary cat cannot split its only access route.
  const dockConnections=[];
  function rebuildDockConnections(){dockConnections.length=0;
    for(const node of [...new Set([dockNode,points.length?points.reduce((best,p,i)=>p.x<points[best].x?i:best,0):-1])]){
      if(node<0)continue;const path=[dockPosition.clone(),new THREE.Vector3(points[node].x,.001,dockPosition.z),points[node].clone()];
      const clear=path.slice(1).every((p,i)=>segmentClear(path[i],p));if(clear)dockConnections.push({node,path});
    }
  }
  rebuildDockConnections();
  let externalObstacles=[],obstacleBoxes=[],robotMode='docked',route=[],routeIndex=0,returnRoute=[],activeMess=null,cleaningTime=0,blockedTime=0,retryAfter=0,yieldDestination=null,resumeReturn=null,yieldCount=0;
  function setObstacles(objects=[]){externalObstacles=objects.map(o=>o?.object||o?.group||o).filter(o=>o?.isObject3D&&o!==vacuum&&o!==dock);refreshObstacles();}
  function refreshObstacles(){obstacleBoxes=externalObstacles.filter(o=>o.visible!==false).map(o=>{o.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(o);bounds.robotSafetyRadius=radius+(o.userData?.interactable==='cat'?.12:0);if(o.userData?.interactable==='cat')bounds.robotCatCentre=o.getWorldPosition(new THREE.Vector3());return bounds;}).filter(b=>!b.isEmpty()&&b.min.y<robotTop&&b.max.y>.018);}
  function projectOnGraph(p){let best=null;for(const [a,b] of validEdges){const start=points[a],end=points[b],dx=end.x-start.x,dz=end.z-start.z,t=clamp(((p.x-start.x)*dx+(p.z-start.z)*dz)/(dx*dx+dz*dz));const position=start.clone().lerp(end,t),distance=distanceXZ(position,p);if(!best||distance<best.distance)best={a,b,t,position,distance};}return best;}
  function shortestPath(start,end){const distances=points.map(()=>Infinity),previous=points.map(()=>-1),open=new Set(points.map((_,i)=>i));distances[start]=0;
    while(open.size){let u=-1;for(const i of open)if(u<0||distances[i]<distances[u])u=i;if(u<0||!Number.isFinite(distances[u]))break;open.delete(u);if(u===end)break;
      for(const [a,b] of validEdges){const v=a===u?b:b===u?a:-1;if(v<0||!open.has(v)||!segmentClear(points[u],points[v],obstacleBoxes))continue;const next=distances[u]+distanceXZ(points[u],points[v]);if(next<distances[v]){distances[v]=next;previous[v]=u;}}
    }
    if(!Number.isFinite(distances[end]))return null;const path=[];for(let u=end;u>=0;u=previous[u]){path.unshift(u);if(u===start)break;}return {path,cost:distances[end]};
  }
  function pathToMess(m){if(!dockConnections.length)return null;refreshObstacles();const options=[];
    for(const connection of dockConnections){const approach=connection.path;if(!approach.slice(1).every((p,i)=>segmentClear(approach[i],p,obstacleBoxes)))continue;
      const approachCost=approach.slice(1).reduce((sum,p,i)=>sum+distanceXZ(approach[i],p),0);
      for(const end of [m.projection.a,m.projection.b]){const found=shortestPath(connection.node,end);if(!found||!segmentClear(points[end],m.projection.position,obstacleBoxes))continue;
        options.push({cost:approachCost+found.cost+distanceXZ(points[end],m.projection.position),path:[...approach.map(p=>p.clone()),...found.path.slice(1).map(i=>points[i].clone()),m.projection.position.clone()]});
      }
    }
    options.sort((a,b)=>a.cost-b.cost);return options[0]?.path||null;
  }
  let gardenTerrace=null,gardenFloorBoxes=[],gardenStaticBoxes=[],gardenDynamicRoots=[],gardenGrid=null,gardenRequestAt=-Infinity;
  function setGardenTerrace(terrace){gardenTerrace=terrace;gardenFloorBoxes=[];gardenStaticBoxes=[];gardenDynamicRoots=[...terrace.doors.map(d=>d.object),...curtains.map(c=>c.object),indoorDivider];
    const dynamic=new Set();[...gardenDynamicRoots,...externalObstacles,vacuum,dock,messGroup].forEach(g=>g.traverse(o=>dynamic.add(o)));scene.updateMatrixWorld(true);
    scene.traverse(o=>{if(!o.isMesh||dynamic.has(o))return;const b=new THREE.Box3().setFromObject(o);if(o.userData.category==='floor'){gardenFloorBoxes.push(b);return;}if(/rug|carpet|plank|groove/i.test(raw(o))||b.min.y>=robotTop||b.max.y<=.018||b.isEmpty())return;b.robotObstacleName=raw(o);gardenStaticBoxes.push(b);});
    // Studio furniture is replaced after this module starts. Revalidate ordinary
    // spill routes against the same final scene, including every new desk foot.
    floors.splice(0,floors.length,...gardenFloorBoxes);
    staticObstacles.splice(0,staticObstacles.length,...gardenStaticBoxes.map(bounds=>({name:bounds.robotObstacleName,bounds})));
    validEdges.splice(0,validEdges.length,...edges.filter(([a,b])=>segmentClear(points[a],points[b])));
    connectorClear=connector.length>0&&connector.slice(1).every((p,i)=>segmentClear(connector[i],p));rebuildDockConnections();
    for(const m of messes){if(m.garden||m.cleaned)continue;m.projection=projectOnGraph(m.position);m.reachable=!!m.projection&&m.projection.distance<=.14&&connectorClear;}
    Object.assign(vacuumAudit,{acceptedEdges:validEdges.length,obstacleCount:staticObstacles.length,dockConnectorClear:connectorClear,dockConnections:dockConnections.map(c=>({node:c.node,path:c.path.map(p=>p.toArray()),clear:true})),staticGeometrySource:'Final furnished scene'});
    gardenGrid=null;vacuumAudit.terrace={connected:true,gridStepM:.18,obstacleCount:gardenStaticBoxes.length,floorCount:gardenFloorBoxes.length,cleanAfterHours:24,lastRoutePoints:0,rule:'Supported floor and individual low-level mesh bounds; sliding doors and curtains remain live obstacles.'};return true;
  }
  function gardenMovingBoxes(){const boxes=[];for(const root of gardenDynamicRoots){root.updateWorldMatrix(true,true);root.traverse(o=>{if(!o.isMesh)return;const b=new THREE.Box3().setFromObject(o);if(b.min.y<robotTop&&b.max.y>.018)boxes.push(b);});}return boxes;}
  function gardenSupported(p){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>gardenFloorBoxes.some(b=>p.x+dx>=b.min.x-.002&&p.x+dx<=b.max.x+.002&&p.z+dz>=b.min.z-.002&&p.z+dz<=b.max.z+.002));}
  function gardenStaticClear(p){return gardenSupported(p)&&!gardenStaticBoxes.some(b=>circleBox(p,b));}
  function gardenSegmentClear(a,b,dynamic=[]){const steps=Math.max(1,Math.ceil(distanceXZ(a,b)/.035));for(let i=0;i<=steps;i++){const p=a.clone().lerp(b,i/steps);if(!gardenStaticClear(p)||dynamic.some(o=>circleBox(p,o)))return false;}return true;}
  function gardenPath(target){
    if(!gardenTerrace)return null;const step=.18,minX=-12.15,maxX=5.4,minZ=-7.65,maxZ=.62,nx=Math.ceil((maxX-minX)/step),nz=Math.ceil((maxZ-minZ)/step);
    if(!gardenGrid){const points=[],valid=[];for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const p=new THREE.Vector3(minX+x*step,.001,minZ+z*step);points.push(p);valid.push(gardenStaticClear(p));}gardenGrid={points,valid,nx:nx+1,nz:nz+1};}
    const {points:grid,valid,nx:cols,nz:rows}=gardenGrid,dynamic=[...obstacleBoxes,...gardenMovingBoxes()],near=position=>grid.map((p,i)=>({i,d:distanceXZ(p,position)})).filter(o=>valid[o.i]&&o.d<step*2.2).sort((a,b)=>a.d-b.d).find(o=>gardenSegmentClear(position,grid[o.i],dynamic))?.i;
    const start=near(vacuum.position),end=near(target);if(start===undefined||end===undefined)return null;
    const open=new Set([start]),cost=new Map([[start,0]]),prev=new Map(),closed=new Set();
    while(open.size){let u=-1,score=Infinity;for(const i of open){const f=cost.get(i)+distanceXZ(grid[i],grid[end]);if(f<score){score=f;u=i;}}if(u===end){const path=[target.clone()];for(let i=end;i!==undefined;i=prev.get(i))path.unshift(grid[i].clone());path.unshift(vacuum.position.clone());vacuumAudit.terrace.lastRoutePoints=path.length;return path;}
      open.delete(u);closed.add(u);const x=u%cols,z=Math.floor(u/cols);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=cols||zz>=rows)continue;const v=zz*cols+xx;if(!valid[v]||closed.has(v)||!gardenSegmentClear(grid[u],grid[v],dynamic))continue;const c=cost.get(u)+distanceXZ(grid[u],grid[v]);if(c<(cost.get(v)??Infinity)){cost.set(v,c);prev.set(v,u);open.add(v);}}
    }return null;
  }
  function queueGardenCleanup(){if(!gardenTerrace)return;const ids=new Set(plantLife.cleanupCandidates().map(b=>b.id));for(const target of [...gardenTerrace.cleanupTargets(),{id:gardenId,position:gardenRoot.position.clone().add(new THREE.Vector3(0,0,-.43))}]){
    if(!ids.has(target.id)||messes.some(m=>m.bedId===target.id&&!m.cleaned))continue;const g=group('Fallen leaves from '+target.id,messGroup);g.position.copy(target.position);g.position.y=.007;for(let i=0;i<7;i++){const leaf=mesh(new THREE.CircleGeometry(.022,8),dryLeaf,g,'Withered fallen leaf');leaf.rotation.x=-Math.PI/2;leaf.scale.set(.7,1.6,1);leaf.position.set(Math.sin(i*2.4)*.11,.001*i,Math.cos(i*2.4)*.10);leaf.castShadow=false;}messes.push({id:'garden-clean-'+target.id,bedId:target.id,position:target.position.clone(),object:g,reachable:true,cleaned:false,garden:true});
  }}
  function addMess(pos){if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.z))return null;const p=new THREE.Vector3(pos.x,.001,pos.z),projection=projectOnGraph(p);
    const reachable=!!projection&&projection.distance<=.14&&connectorClear;
    const g=group('Cleanable cat mess',messGroup);g.position.copy(p);g.position.y=.007;
    for(let i=0;i<5;i++){const spot=mesh(new THREE.CircleGeometry(.028+(i%2)*.014,14),messMat,g,'Small cleanable spill');spot.rotation.x=-Math.PI/2;spot.position.set(Math.sin(i*2.4)*.035,i*.0002,Math.cos(i*2.4)*.035);spot.castShadow=false;}
    const m={id:'mess-'+Date.now()+'-'+messes.length,position:p,projection,reachable,object:g,cleaned:false};messes.push(m);
    if(vacuumAuto&&robotMode==='docked')startNext();return m;
  }
  function startNext(){if(robotMode!=='docked'||elapsedNow<retryAfter)return false;
    queueGardenCleanup();for(const m of messes){if(m.cleaned||!m.reachable)continue;if(m.garden&&!plantLife.getBed(m.bedId).canClear){m.cleaned=true;m.object.removeFromParent();continue;}if(m.garden&&elapsedNow-gardenRequestAt>2){if(m.bedId===gardenId)setIndoorDoor(true);else gardenTerrace.requestRobotAccess();gardenRequestAt=elapsedNow;}refreshObstacles();const path=m.garden?gardenPath(m.position):pathToMess(m);if(!path)continue;activeMess=m;route=path;returnRoute=path.slice().reverse().map(p=>p.clone());routeIndex=1;robotMode='outbound';blockedTime=0;return true;}return false;
  }
  function clean(){if(robotMode!=='docked'){toast(robotMode==='cleaning'?'正在清理污点':'机器人正在工作');return true;}const started=startNext();if(!started)toast(messes.some(m=>!m.cleaned)?'暂时没有可安全到达的污点':'地面很干净，机器人正在待机');return started;}
  function setVacuumAuto(on){vacuumAuto=!!on;persist('smart',{vacuumAuto});if(vacuumAuto&&robotMode==='docked')startNext();return vacuumAuto;}
  function completeCleaning(){const gardenMess=activeMess.garden;if(gardenMess)plantLife.clear(activeMess.bedId,{by:'robot'});activeMess.cleaned=true;activeMess.object.removeFromParent();toast(gardenMess?'凋谢植物已清理，机器人返回充电座。':'污点已清理，机器人返回充电座');activeMess=null;route=returnRoute;routeIndex=1;robotMode='returning';}
  function yieldAlongTravelledRoute(){
    if(!['outbound','returning'].includes(robotMode))return;
    const retreat=[vacuum.position.clone(),...route.slice(0,routeIndex).reverse().map(p=>p.clone())];
    if(retreat.length<2)return;
    yieldDestination=robotMode==='outbound'?'dock':'return-start';
    resumeReturn=robotMode==='returning'?route.map(p=>p.clone()):null;
    if(robotMode==='outbound')activeMess=null; // Keep the uncleaned spill in the queue.
    route=retreat;routeIndex=1;robotMode='yielding';blockedTime=0;yieldCount++;
  }
  const vacuumAudit={bodyRadiusM:.17,navigationRadiusM:radius,catActualFootRadiusM:.337,catCentreWaitingDistanceM:.60,blockedYieldAfterSeconds:3,bodyTopM:.086,checkedTopM:robotTop,sourceNodes:points.length,sourceEdges:edges.length,acceptedEdges:validEdges.length,dockPlan:[699,542.2],parkPlan:[699,532.8],dockConnector:connector.map(p=>p.toArray()),dockConnectorClear:connectorClear,dockConnections:dockConnections.map(c=>({node:c.node,path:c.path.map(p=>p.toArray()),clear:true})),obstacleCount:staticObstacles.length,rule:'Cat spills use validated graph edges and checked dock connectors. Terrace plants use supported-floor grid routes with live door checks; cleanup is recorded only after arrival.'};
  function getStatus(){return {curtainsOpen,lightsOn,vacuumAuto,garden:getGardenStatus(),vacuum:{mode:robotMode,waiting:blockedTime>.3||robotMode==='waiting',yields:yieldCount,pending:messes.filter(m=>!m.cleaned).length,reachable:messes.filter(m=>!m.cleaned&&m.reachable).length,cleaned:messes.filter(m=>m.cleaned).length,ready:connectorClear&&validEdges.length>0},clockTimeZone:'Australia/Sydney'};}
  function update(dt,elapsed){if(disposed)return;dt=clamp(Number(dt)||0,0,.1);elapsedNow=Number.isFinite(elapsed)?elapsed:elapsedNow+dt;
    indoorDoor.amount+=(indoorDoor.target-indoorDoor.amount)*(1-Math.exp(-dt*4));applyIndoorDoor();
    for(const c of curtains){c.openAmount+=(c.target-c.openAmount)*(1-Math.exp(-dt*3.4));if(Math.abs(c.target-c.openAmount)<.0001)c.openAmount=c.target;c.apply();}
    const minute=Math.floor(Date.now()/60000);if(minute!==lastPlantMinute){lastPlantMinute=minute;plantLife.refresh();syncGarden();}
    updateClock();if(waterFX.visible){waterFX.visible=elapsedNow<wateringUntil;waterFX.children.forEach((d,i)=>d.position.y=.245+((1-(elapsedNow*2+i/12)%1)*.39));}
    if(robotMode==='docked'){if(vacuumAuto&&Math.floor(elapsedNow*2)!==Math.floor((elapsedNow-dt)*2))startNext();return;}
    refreshObstacles();
    if(robotMode==='waiting'){if(elapsedNow>=retryAfter&&resumeReturn?.slice(1).every((p,i)=>segmentClear(resumeReturn[i],p,obstacleBoxes))){route=resumeReturn;resumeReturn=null;routeIndex=1;robotMode='returning';blockedTime=0;}return;}
    if(robotMode==='cleaning'){brush.rotation.y-=dt*18;cleaningTime+=dt;if(cleaningTime>=1.4)completeCleaning();return;}
    const target=route[routeIndex];if(!target){if(robotMode==='outbound'){robotMode='cleaning';cleaningTime=0;}else if(robotMode==='yielding'&&yieldDestination==='return-start'){robotMode='waiting';retryAfter=elapsedNow+4;}else{robotMode='docked';vacuum.position.copy(dockPosition);vacuum.rotation.y=0;retryAfter=elapsedNow+(yieldDestination==='dock'?4:0);yieldDestination=null;}return;}
    const dist=distanceXZ(vacuum.position,target),step=Math.min(dist,dt*.48),candidate=vacuum.position.clone();if(dist>.00001)candidate.lerp(target,step/dist);
    if([...obstacleBoxes,...(gardenTerrace?gardenMovingBoxes():[])].some(b=>circleBox(candidate,b))){blockedTime+=dt;if(blockedTime>=3)yieldAlongTravelledRoute();return;}blockedTime=0;
    if(dist>.001)vacuum.rotation.y=Math.atan2(target.x-vacuum.position.x,target.z-vacuum.position.z);
    vacuum.position.copy(candidate);brush.rotation.y-=dt*18;if(dist<=step+.001){vacuum.position.copy(target);routeIndex++;}vacuum.updateMatrixWorld(true);
  }
  function dispose(){if(disposed)return;disposed=true;unsubscribePlants();for(const [o,s] of originals){s.parent?.add(o);o.position.copy(s.position);o.quaternion.copy(s.quaternion);o.scale.copy(s.scale);o.visible=s.visible;o.material=s.material;if(s.noMerge===undefined)delete o.userData.noMerge;else o.userData.noMerge=s.noMerge;if(s.interaction===undefined)delete o.userData.interactionId;else o.userData.interactionId=s.interaction;}
    roots.forEach(g=>g.removeFromParent());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  return {update,setCurtains,setLights,setVacuumAuto,addMess,clean,plant,water,fertilize,harvest,clearPlant,arrangeFlowers,plantLife,vaseObjects,getStatus,getGardenStatus,setObstacles,setGardenTerrace,setIndoorDoor,indoorDoor,roomLights,colliderRoots,curtains,refrigerators,utility,controlPanel,clock,vacuum,dock,gardenRoot,records,audit:{vacuum:vacuumAudit,refrigeratorSideGapM:.02,refrigeratorHeightM:2.46,doubleDoorRefrigerator:true,curtain:{bottomM:.10,topM:2.60,railUnmodified:true,openStackWidthM:openWidth,closedSpanM:rightX-leftX},planter:{positionPlan:[420,439],potBottomM:0,soilTopM:.235},clockTimeZone:'Australia/Sydney'},dispose};
}
