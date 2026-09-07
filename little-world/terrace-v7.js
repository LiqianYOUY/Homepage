import {addTranslations} from './i18n.js?v=14';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {createPlantLifecycle,PLANT_TRANSLATIONS} from './plant-lifecycle.js?v=14';
addTranslations(PLANT_TRANSLATIONS);
// A roofless, walkable terrace along the living / dining / study facade.
export function setupTerrace({THREE,model,register=()=>{},getState=()=>({}),setState=()=>{},toast=()=>{},openGarden=()=>{},onDoorOpen=()=>{},plantLife=createPlantLifecycle({getState,setState})}){
 const S=.022381665533985514,P=(x,z,y=0)=>new THREE.Vector3((x-935)*S,y,(z-512)*S);
 const root=new THREE.Group();root.name='Open air terrace';model.add(root);
 const materials=[],geometries=[],colliderRoots=[],doors=[],beds=[],removed=[];
 const mat=(name,color,roughness=.75,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness,...extra});m.name=name;materials.push(m);return m;};
 const stone=mat('Terrace warm limestone',0xc4baaa),wood=mat('Terrace weathered oak',0xb6a080),metal=mat('Terrace bronze frame',0x635f50,.38,{metalness:.55}),soil=mat('Terrace dark earth',0x645543),clay=mat('Terrace chalk planters',0xdbd1bd),glass=mat('Terrace clear glass',0xc5dde0,.10,{transparent:true,opacity:.15,depthWrite:false,side:THREE.DoubleSide}),leafMats=[0x738b5a,0x859d69,0x536c4e,0xa1ac7e].map((c,i)=>mat('Terrace leaf '+i,c,.93)),petals=mat('Terrace lavender flowers',0xad91b1),cream=mat('Terrace daisy petals',0xfaf1d6),yellow=mat('Terrace pollen',0xdab55f),waterMat=mat('Terrace water drops',0x97c4d5,.20,{transparent:true,opacity:.7});
 function group(name,parent=root){const o=new THREE.Group();o.name=name;parent.add(o);return o;}
 function mesh(parent,name,geo,m,category='decoration'){geometries.push(geo);const o=new THREE.Mesh(geo,m);o.name=name;o.userData.category=category;o.castShadow=!m.transparent;o.receiveShadow=true;if(m.transparent)o.renderOrder=2;parent.add(o);return o;}
 function box(parent,name,w,h,d,m,category){return mesh(parent,name,new THREE.BoxGeometry(w,h,d),m,category);}
 function sphere(parent,name,r,m){return mesh(parent,name,new THREE.SphereGeometry(r,12,8),m);}
 function cyl(parent,name,rt,rb,h,m,category){return mesh(parent,name,new THREE.CylinderGeometry(rt,rb,h,20),m,category);}
 const width=(1170-581)*S,depth=(303-166)*S,cx=P(875.5,0).x,cz=P(0,234.5).z;
 const slab=box(root,'Terrace continuous supported floor',width,.16,depth,stone,'floor');slab.position.set(cx,-.08,cz);
 // Plank tops are flush with the original interior floor; grooves are shallow.
 for(let i=0;i<18;i++){const plank=box(root,'Terrace outdoor oak plank '+i,width-.04,.025,(depth-.07)/18-.007,wood);plank.castShadow=false;plank.position.set(cx,.008,P(0,166).z+.035+(i+.5)*(depth-.07)/18);}
 const old=[];model.traverse(o=>{if(o.isMesh&&(o.userData.name||o.name).startsWith('North panoramic glazing'))old.push(o);});old.forEach(o=>{removed.push(o);o.removeFromParent();});
 const facadeZ=P(0,303).z;
 function frame(parent,name,w,z=0){const g=group(name,parent);for(const y of [.027,2.635]){const bar=box(g,name+' horizontal frame',w,.054,.05,metal,'window');bar.position.set(0,y,z);}for(const x of [-w/2+.022,w/2-.022]){const bar=box(g,name+' upright frame',.044,2.61,.05,metal,'window');bar.position.set(x,1.33,z);}const pane=box(g,name+' clear glazing',w-.060,2.55,.015,glass,'glass');pane.position.set(0,1.33,z);return g;}
 for(const [a,b] of [[581,792],[850,1091],[1149,1170]]){const n=Math.ceil((b-a)*S/1.65);for(let i=0;i<n;i++){const w=(b-a)*S/n,g=frame(root,'North fixed pane '+a+'-'+i,w);g.position.copy(P(a+(i+.5)*(b-a)/n,303));}}
 for(const [id,a,b,label] of [['living',792,850,'客餐厅露台门'],['study',1091,1149,'书房露台门']]){
   const w=(b-a)*S,g=frame(root,label+' sliding leaf',w-.016);g.position.copy(P((a+b)/2,303));g.position.z+=.056;
   const handle=box(g,label+' handle',.025,.32,.055,metal,'door');handle.position.set(w/2-.10,1.05,.055);
   const track=box(root,label+' recessed track',w*2,.012,.13,metal);track.position.set(P((a+b)/2,0).x-w/2,.006,facadeZ+.03);
   const key='terrace-'+id,initial=getState().doors?.[key]?1:0,d={id:key,object:g,baseX:g.position.x,width:w,amount:initial,target:initial};
   const apply=()=>{g.position.x=d.baseX-d.amount*(w+.015);g.updateMatrixWorld(true);};apply();
   let start=0,startWorld=null;
   const record={id:key,label,kind:'door',object:g,anchor:P((a+b)/2,303,1.35),click:()=>{d.target=d.target>.5?0:1;if(d.target)onDoorOpen();setState({doors:{[key]:!!d.target}});},drag:(dx,dy,ctx)=>{if(ctx.phase==='start'){start=d.amount;startWorld=ctx.worldPoint?.clone();}else if(ctx.phase==='move'){const delta=startWorld&&ctx.worldPoint?(startWorld.x-ctx.worldPoint.x)/w:-dx/180;d.target=THREE.MathUtils.clamp(start+delta,0,1);d.amount=d.target;if(d.target>.1)onDoorOpen();apply();}else if(ctx.phase==='end'){d.target=d.amount>.5?1:0;setState({doors:{[key]:!!d.target}});}}};
   g.traverse(o=>o.userData.noMerge=true);register(record);doors.push(d);colliderRoots.push(g);
 }
 // The three exposed edges have continuous glass and a 1.15 m top rail.
 for(const [axis,length,x,z] of [['x',width,cx,P(0,166).z],['z',depth,P(581,0).x,cz],['z',depth,P(1170,0).x,cz]]){
   const rail=box(root,'Terrace continuous safety top rail',axis==='x'?length:.045,.045,axis==='z'?length:.045,metal,'wall');rail.position.set(x,1.15,z);
   const count=Math.ceil(length/1.5);for(let i=0;i<count;i++){const offset=-length/2+(i+.5)*length/count;const pane=box(root,'Terrace balustrade glazing',axis==='x'?length/count-.035:.018,1.06,axis==='z'?length/count-.035:.018,glass,'glass');pane.position.set(x+(axis==='x'?offset:0),.574,z+(axis==='z'?offset:0));}
   for(let i=0;i<=count;i++){const offset=-length/2+i*length/count,p=box(root,'Terrace guardrail post',.035,1.16,.035,metal,'wall');p.position.set(x+(axis==='x'?offset:0),.58,z+(axis==='z'?offset:0));}
 }
 const names={mint:'薄荷',rosemary:'迷迭香',daisy:'雏菊',lavender:'薰衣草'},dryLeaf=mat('Terrace dry leaves',0x928069),seedMat=mat('Terrace seeds',0xb39d72);
 function saved(id){const d=getState().terrace?.[id];return d&&typeof d==='object'?d:null;}
 function persist(b){setState({terrace:{[b.id]:{...b.state}}});}
 function registerBed(b){b.object.traverse(o=>{o.userData.noMerge=true;if(o.isMesh)o.userData.interactionId=b.id;});}
 function grow(b){
   if(b.plant){b.plant.traverse(o=>{if(o.isMesh)o.geometry.dispose();});b.plant.removeFromParent();}
   const p=group(b.id+' growing plants',b.object);b.plant=p;const status=plantLife.getBed(b.id),stage=status.stage,scale=[.08,.28,.70,1,.65][stage];b.state=status;if(b.record)b.record.label='花箱 '+(b.index+1)+' · '+status.name;
   if(status.phase==='empty')return;
   if(stage===0){for(let i=0;i<5;i++){const seed=sphere(p,'Visible terrace seed',.018,seedMat);seed.scale.y=.6;seed.position.set((i-2)*.18,.443,0);}registerBed(b);return;}
   for(let stem=0;stem<5;stem++){
     const g=group(b.id+' botanical stem '+stem,p),h=(.38+(stem%3)*.13)*scale;g.position.set((stem-2)*.20,.42,(stem%2-.5)*.14);
     if(stage===4)g.rotation.z=(stem%2?.6:-.5);
     const stalk=cyl(g,'Plant stem',.008,.011,h,stage===4?dryLeaf:leafMats[2]);stalk.position.y=h/2;
     const sprigs=b.state.species==='rosemary'?7:4;
     for(let k=0;k<sprigs;k++)for(const side of [-1,1]){const leaf=sphere(g,'Plant leaf '+k,.105,stage===4?dryLeaf:leafMats[(stem+k)%4]);leaf.scale.set(b.state.species==='rosemary'?.32:.66,.27,1);leaf.rotation.set(side*.32,side*(k*.8+.6),side*.6);leaf.position.set(side*.061,h*(.22+k/sprigs*.65),side*.025);}
     if(stage===3&&!status.harvestedAt){
       if(['lavender','mint','rosemary'].includes(b.state.species)){for(let k=0;k<5;k++){const flower=sphere(g,'Lavender bloom',.034,petals);flower.scale.set(1,.9,1);flower.position.set(Math.sin(k*2.4)*.018,h+k*.026,Math.cos(k*2.4)*.018);}}
       else{const center=sphere(g,'Daisy pollen',.035,yellow);center.position.y=h+.02;for(let k=0;k<8;k++){const f=sphere(g,'Daisy petal',.04,cream),a=k*Math.PI/4;f.scale.set(.6,.28,1.4);f.rotation.y=-a;f.position.set(Math.sin(a)*.057,h+.012,Math.cos(a)*.057);}}
     }
   }
   // Batch each botanical material inside one bed; plants still rebuild on care.
   p.updateWorldMatrix(true,true);const inverse=p.matrixWorld.clone().invert(),byMaterial=new Map(),sources=[];p.traverse(o=>{if(!o.isMesh)return;sources.push(o);const copy=o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(copy);});
   for(const o of sources){o.removeFromParent();o.geometry.dispose();}for(const [m,list] of byMaterial){const merged=mergeGeometries(list,false);list.forEach(g=>g.dispose());mesh(p,'Terrace botanical surface',merged,m);}
   if(b.record)b.record.label='花箱 '+(b.index+1)+' · '+names[b.state.species];registerBed(b);
 }
 for(let i=0;i<8;i++){
   const id='terrace-bed-'+i,g=group('露台花箱 '+(i+1));g.position.copy(P(615+i*74,190));
   const body=box(g,'Terrace planter solid case '+i,1.22,.41,.52,clay,'furniture');body.position.y=.205;
   const dirt=box(g,'Terrace soil '+i,1.14,.024,.44,soil);dirt.position.y=.414;
   const foot=box(g,'Terrace planter recessed foot '+i,1.12,.045,.42,metal);foot.position.y=.0225;
   const old=saved(id)||{},species=Object.keys(names).includes(old.species)?old.species:Object.keys(names)[i%4];
   plantLife.ensureBed(id,{species,legacy:Object.keys(old).length?old:null,established:true});
   const b={id,object:g,index:i,state:plantLife.getBed(id),plant:null};beds.push(b);grow(b);
   b.record={id,label:'花箱 '+(i+1)+' · '+names[species],kind:'garden',object:g,hotspot:false,anchor:g.position.clone().add(new THREE.Vector3(0,.9,0)),click:()=>openGarden(id)};register(b.record);
 }
 // The west-end outdoor dining set leaves both sliding doors and the facade aisle clear.
 const teak=mat('Terrace honey teak furniture',0x98734e),teakLight=mat('Terrace teak alternate grain',0xad8a61),rattan=mat('Terrace natural rattan weave',0xbf9868),rattanShade=mat('Terrace rattan cross weave',0x9e774e),linen=mat('Terrace oatmeal outdoor cushions',0xeee7d6,.98),grillBlack=mat('Terrace barbecue charcoal enamel',0x303936,.38,{metalness:.3}),steel=mat('Terrace barbecue brushed steel',0xa9aaa0,.30,{metalness:.75}),rubber=mat('Terrace barbecue wheels',0x34332d,.95),pepper=mat('Terrace barbecue pepper skewers',0xb56d48),herb=mat('Terrace barbecue vegetable skewers',0x78814d);
 function roundedSlab(parent,name,w,h,d,r,m,category='decoration'){
   const s=new THREE.Shape(),x=-w/2,z=-d/2;
   s.moveTo(x+r,z);s.lineTo(x+w-r,z);s.quadraticCurveTo(x+w,z,x+w,z+r);s.lineTo(x+w,z+d-r);s.quadraticCurveTo(x+w,z+d,x+w-r,z+d);s.lineTo(x+r,z+d);s.quadraticCurveTo(x,z+d,x,z+d-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
   const geometry=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:4});geometry.rotateX(-Math.PI/2);geometry.translate(0,-h/2,0);return mesh(parent,name,geometry,m,category);
 }
 function wickerTube(parent,name,points,radius,m,category='decoration'){
   return mesh(parent,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(8,points.length*2),radius,5,false),m,category);
 }
 const table=group('Terrace slatted teak dining table');table.position.copy(P(661,249,.025));
 for(let i=0;i<5;i++){const plank=roundedSlab(table,'Terrace teak tabletop plank '+i,1.04,.055,.122,.025,i%2?teak:teakLight,'furniture');plank.position.set(0,.71,(i-2)*.134);}
 for(const z of [-.23,.23]){const apron=box(table,'Terrace table support apron',.93,.09,.035,teak,'furniture');apron.position.set(0,.63,z);}
 for(const x of [-.43,.43])for(const z of [-.23,.23]){const leg=box(table,'Terrace tapered teak table leg',.05,.64,.05,teak,'furniture');leg.position.set(x,.32,z);leg.rotation.z=-Math.sign(x)*.045;}
 const tray=roundedSlab(table,'Terrace tea tray',.30,.025,.21,.04,rattanShade);tray.position.set(.19,.752,.02);
 for(const x of [.10,.26]){const cup=cyl(table,'Terrace outdoor tea cup',.043,.034,.065,cream);cup.position.set(x,.795,.02);const tea=cyl(table,'Terrace tea surface',.034,.034,.004,soil);tea.position.set(x,.829,.02);}
 for(const [index,dx,angle] of [[0,-.91,-Math.PI/2],[1,.91,Math.PI/2]]){
   const g=group('Terrace woven rattan armchair '+(index+1));g.position.set(table.position.x+dx,table.position.y,table.position.z);g.rotation.y=angle;
   const seat=roundedSlab(g,'Terrace rattan chair seat frame',.60,.065,.56,.12,rattanShade,'furniture');seat.position.y=.415;
   const cushion=roundedSlab(g,'Terrace linen seat cushion',.51,.08,.46,.10,linen,'furniture');cushion.position.set(0,.481,-.012);
   for(const x of [-.22,.22])for(const z of [-.19,.19]){const leg=cyl(g,'Terrace rattan chair teak leg',.020,.029,.40,teak,'furniture');leg.position.set(x,.20,z);leg.rotation.z=-Math.sign(x)*.075;leg.rotation.x=Math.sign(z)*.075;}
   // A curved, open-front basket: crossed cane stays legible from the overhead views.
   const weavePoint=(angle,t,offset=0)=>{const spread=.91+.12*t+offset,height=.66+.32*Math.max(0,Math.cos(angle));return new THREE.Vector3(Math.sin(angle)*.33*spread,.43+(height-.43)*t,Math.cos(angle)*.29*spread);};
   for(let row=0;row<12;row++){const t=row/11,points=[];for(let k=0;k<=18;k++)points.push(weavePoint(-2.08+k*4.16/18,t));wickerTube(g,'Terrace rattan horizontal woven cane '+row,points,row===0||row===11?.016:.0095,rattan,row===11?'furniture':'decoration');}
   for(let rib=0;rib<23;rib++){const angle=-2.08+rib*4.16/22,points=[];for(let k=0;k<=6;k++)points.push(weavePoint(angle,k/6,k%2?.012:-.004));wickerTube(g,'Terrace rattan vertical woven cane '+rib,points,.008,rattanShade);}
 }
 // A compact barbecue cart occupies the spare bay west of the living-room door.
 const bbq=group('Terrace outdoor barbecue cart');bbq.position.copy(P(749,249,.025));
 const firebox=roundedSlab(bbq,'Terrace barbecue firebox',.80,.23,.54,.07,grillBlack,'furniture');firebox.position.y=.84;
 const grate=box(bbq,'Terrace barbecue recessed cooking bed',.69,.025,.43,soil);grate.position.y=.958;
 for(let i=0;i<15;i++){const bar=box(bbq,'Terrace barbecue stainless grill grate '+i,.016,.015,.44,steel);bar.position.set((i-7)*.045,.984,0);}
 for(const x of [-.33,.33])for(const z of [-.20,.20]){const leg=box(bbq,'Terrace barbecue cart leg',.032,.65,.032,steel,'furniture');leg.position.set(x,.395,z);}
 const shelf=roundedSlab(bbq,'Terrace barbecue lower storage shelf',.74,.035,.45,.035,teak,'furniture');shelf.position.y=.22;
 for(const x of [-.35,.35]){const wheel=cyl(bbq,'Terrace barbecue wheel',.075,.075,.04,rubber,'furniture');wheel.rotation.z=Math.PI/2;wheel.position.set(x,.077,.20);const hub=cyl(bbq,'Terrace barbecue wheel hub',.026,.026,.044,steel);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);}
 const sideShelf=roundedSlab(bbq,'Terrace barbecue teak preparation shelf',.30,.04,.46,.035,teakLight,'furniture');sideShelf.position.set(.56,.93,0);
 const lid=group('Terrace barbecue raised lid',bbq);lid.position.set(0,.968,-.27);lid.rotation.x=-1.15;
 const lidShell=roundedSlab(lid,'Terrace barbecue open enamel hood',.82,.07,.54,.08,grillBlack,'furniture');lidShell.position.z=.27;
 const lidHandle=box(lid,'Terrace barbecue lid handle',.35,.028,.035,steel);lidHandle.position.set(0,.092,.43);
 for(const x of [-.145,.145]){const mount=box(lid,'Terrace barbecue lid handle mount',.025,.075,.025,steel);mount.position.set(x,.058,.43);}
 const controls=box(bbq,'Terrace barbecue steel control fascia',.73,.105,.026,steel);controls.position.set(0,.854,.28);
 for(const x of [-.22,0,.22]){const knob=cyl(bbq,'Terrace barbecue burner knob',.031,.031,.025,grillBlack);knob.rotation.x=Math.PI/2;knob.position.set(x,.854,.308);}
 for(let skewer=0;skewer<3;skewer++){const z=(skewer-1)*.10,stick=box(bbq,'Terrace barbecue bamboo skewer',.45,.009,.009,teakLight);stick.position.set(-.06,1.008,z);for(let bite=0;bite<4;bite++){const food=box(bbq,'Terrace barbecue vegetable bite',.065,.032,.066,(bite+skewer)%2?pepper:herb);food.position.set(-.20+bite*.081,1.013,z);food.rotation.y=(bite%2-.5)*.3;}}
 const board=roundedSlab(bbq,'Terrace barbecue chopping board',.24,.018,.28,.025,rattan);board.position.set(.56,.959,.015);
 for(const x of [.53,.57]){const tong=box(bbq,'Terrace barbecue serving tongs',.014,.012,.22,steel);tong.position.set(x,.975,.025);tong.rotation.y=x===.53?.10:-.10;}
 const can=group('Terrace watering can');can.position.copy(P(1160,276));const canBody=cyl(can,'Watering can body',.105,.12,.20,leafMats[0]);canBody.position.y=.10;const spout=cyl(can,'Watering can spout',.026,.018,.27,metal);spout.rotation.z=-.85;spout.position.set(.14,.17,0);const handle=mesh(can,'Watering can loop',new THREE.TorusGeometry(.10,.012,8,20),metal);handle.position.set(-.075,.16,0);register({id:'terrace-garden',label:'露台 · 浇水施肥',kind:'garden',object:can,anchor:P(860,190,1.12),click:()=>openGarden()});can.traverse(o=>o.userData.noMerge=true);
 let wateredBed=null,waterUntil=0,time=0;const spray=group('Terrace watering droplets');spray.visible=false;spray.userData.noMerge=true;for(let i=0;i<12;i++){const d=sphere(spray,'Watering droplet',.013,waterMat);d.scale.y=2;d.userData.phase=i/12;d.userData.noMerge=true;}
 function getBed(id){const b=target(id);return {...plantLife.getBed(b.id),index:b.index};}
 const target=id=>beds.find(b=>b.id===id)||beds[0];
 function careResult(result,message){if(result.ok){toast(message);syncBeds();return true;}toast({moist:'土壤还湿润，等它需要水时再来。',fed:'盆土里还有养分，暂时不用施肥。',inactive:'先清理花盆，再种下新的植物吧。','clear-first':'先清理凋谢的植物，再重新种植。',occupied:'这盆植物还在生长，先好好照顾它吧。','not-flowering':'等真正开花后，再剪下一枝。','not-withered':'植物还在生长，不需要清理。'}[result.reason]||'暂时没有可用的花枝。');return false;}
 function waterBed(id){const b=target(id),ok=careResult(plantLife.water(b.id),'浇好水了，它会按自己的节奏慢慢长大。');if(ok){wateredBed=b;waterUntil=time+1.7;spray.visible=true;}return ok;}
 function fertilizeBed(id){return careResult(plantLife.fertilize(target(id).id),'添好了养分，等它慢慢吸收。');}
 function plantBed(id,species){return careResult(plantLife.plant(target(id).id,species),'种下了新的植物，一起等它发芽。');}
 function harvestBed(id){return careResult(plantLife.harvest(target(id).id),'剪下一枝，可以放进家里的花瓶。');}
 function clearBed(id,options){return careResult(plantLife.clear(target(id).id,options),'花箱清理好了，可以重新播种。');}
 function syncBeds(){for(const b of beds){const next=plantLife.getBed(b.id),signature=[next.species,next.phase,next.harvestedAt].join(':');if(signature!==b.signature){b.signature=signature;grow(b);}}}
 const unsubscribe=plantLife.subscribe(syncBeds);syncBeds();let lastPlantMinute=-1;
 function requestRobotAccess(){onDoorOpen();for(const d of doors){if(d.id==='terrace-living'){d.target=1;setState({doors:{[d.id]:true}});}}}
 function cleanupTargets(){return beds.filter(b=>plantLife.getBed(b.id).canClear).map(b=>({id:b.id,position:b.object.position.clone().add(new THREE.Vector3(0,0,.67))}));}
 function update(dt,elapsed){time=elapsed;const minute=Math.floor(Date.now()/60000);if(minute!==lastPlantMinute){lastPlantMinute=minute;plantLife.refresh();syncBeds();}for(const d of doors){d.amount=THREE.MathUtils.damp(d.amount,d.target,7,dt);d.object.position.x=d.baseX-d.amount*(d.width+.015);}if(spray.visible&&wateredBed){spray.position.copy(wateredBed.object.position);for(const drop of spray.children){const t=(elapsed*1.5+drop.userData.phase)%1;drop.position.set(Math.sin(drop.userData.phase*23)*.43,1.08-t*.63,Math.cos(drop.userData.phase*17)*.15);}if(elapsed>waterUntil)spray.visible=false;}}
 return {root,doors,beds,colliderRoots,getBed,listBeds:()=>beds.map(b=>getBed(b.id)),waterBed,fertilizeBed,plantBed,harvestBed,clearBed,plantLife,requestRobotAccess,cleanupTargets,update,audit:{deckPlan:[581,166,1170,303],deckAreaM2:width*depth,roof:false,railHeightM:1.15,slidingDoorClearWidthM:(850-792)*S-.06,planters:8,originalFacadeMeshesRemoved:removed.length},dispose(){unsubscribe();root.removeFromParent();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
