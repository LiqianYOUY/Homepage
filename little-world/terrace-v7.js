import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
// A roofless, walkable terrace along the living / dining / study facade.
export function setupTerrace({THREE,model,register=()=>{},getState=()=>({}),setState=()=>{},toast=()=>{},openGarden=()=>{},onDoorOpen=()=>{}}){
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
 const names={mint:'薄荷',rosemary:'迷迭香',daisy:'小雏菊',lavender:'薰衣草'};
 function saved(id){const d=getState().terrace?.[id];return d&&typeof d==='object'?d:null;}
 function persist(b){setState({terrace:{[b.id]:{...b.state}}});}
 function registerBed(b){b.object.traverse(o=>{o.userData.noMerge=true;if(o.isMesh)o.userData.interactionId=b.id;});}
 function grow(b){
   if(b.plant){b.plant.traverse(o=>{if(o.isMesh)o.geometry.dispose();});b.plant.removeFromParent();}
   const p=group(b.id+' growing plants',b.object);b.plant=p;const stage=b.state.stage,scale=.50+Math.min(4,stage)*.15;
   for(let stem=0;stem<5;stem++){
     const g=group(b.id+' botanical stem '+stem,p),h=(.38+(stem%3)*.13)*scale;g.position.set((stem-2)*.20,.42,(stem%2-.5)*.14);
     const stalk=cyl(g,'Plant stem',.008,.011,h,leafMats[2]);stalk.position.y=h/2;
     const sprigs=b.state.species==='rosemary'?7:4;
     for(let k=0;k<sprigs;k++)for(const side of [-1,1]){const leaf=sphere(g,'Plant leaf '+k,.105,leafMats[(stem+k)%4]);leaf.scale.set(b.state.species==='rosemary'?.32:.66,.27,1);leaf.rotation.set(side*.32,side*(k*.8+.6),side*.6);leaf.position.set(side*.061,h*(.22+k/sprigs*.65),side*.025);}
     if(stage>=3&&['lavender','daisy'].includes(b.state.species)){
       if(b.state.species==='lavender'){for(let k=0;k<5;k++){const flower=sphere(g,'Lavender bloom',.034,petals);flower.scale.set(1,.9,1);flower.position.set(Math.sin(k*2.4)*.018,h+k*.026,Math.cos(k*2.4)*.018);}}
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
   const b={id,object:g,index:i,state:{species,stage:Number.isFinite(old.stage)?THREE.MathUtils.clamp(old.stage,0,4):3,watered:Number(old.watered)||0,fertilized:Number(old.fertilized)||0,flowers:Number(old.flowers)||0},plant:null};beds.push(b);grow(b);
   b.record={id,label:'花箱 '+(i+1)+' · '+names[species],kind:'garden',object:g,hotspot:false,anchor:g.position.clone().add(new THREE.Vector3(0,.9,0)),click:()=>openGarden(id)};register(b.record);
 }
 // Two quiet seats, clear of the sliding doors and the planting aisle.
 const table=group('Terrace little tea table');table.position.copy(P(659,249));const top=cyl(table,'Terrace cafe tabletop',.33,.33,.04,stone,'furniture');top.position.y=.68;const stem=cyl(table,'Terrace cafe table leg',.034,.042,.65,metal,'furniture');stem.position.y=.325;const base=cyl(table,'Terrace cafe table foot',.22,.24,.03,metal,'furniture');base.position.y=.015;
 for(const [dx,dz,angle] of [[-.63,.15,Math.PI/2],[.55,-.19,-Math.PI/2]]){const g=group('Terrace cafe chair');g.position.set(table.position.x+dx,0,table.position.z+dz);g.rotation.y=angle;const seat=box(g,'Terrace chair seat',.43,.06,.42,wood,'furniture');seat.position.y=.43;const back=box(g,'Terrace chair back',.43,.30,.045,wood,'furniture');back.position.set(0,.70,.18);for(const x of [-.17,.17])for(const z of [-.15,.15]){const leg=cyl(g,'Terrace chair leg',.014,.018,.41,metal,'furniture');leg.position.set(x,.205,z);}}
 const can=group('Terrace watering can');can.position.copy(P(1160,276));const canBody=cyl(can,'Watering can body',.105,.12,.20,leafMats[0]);canBody.position.y=.10;const spout=cyl(can,'Watering can spout',.026,.018,.27,metal);spout.rotation.z=-.85;spout.position.set(.14,.17,0);const handle=mesh(can,'Watering can loop',new THREE.TorusGeometry(.10,.012,8,20),metal);handle.position.set(-.075,.16,0);register({id:'terrace-garden',label:'露台 · 浇水施肥',kind:'garden',object:can,anchor:P(860,190,1.12),click:()=>openGarden()});can.traverse(o=>o.userData.noMerge=true);
 let wateredBed=null,waterUntil=0,time=0;const spray=group('Terrace watering droplets');spray.visible=false;spray.userData.noMerge=true;for(let i=0;i<12;i++){const d=sphere(spray,'Watering droplet',.013,waterMat);d.scale.y=2;d.userData.phase=i/12;d.userData.noMerge=true;}
 function getBed(id){const b=beds.find(b=>b.id===id)||beds[0],s=b.state;return{id:b.id,index:b.index,...s,name:names[s.species],canHarvest:s.stage>=4&&['lavender','daisy'].includes(s.species),label:s.stage===0?'一颗种子，等着探头。':s.stage<2?'小苗慢慢长高了。':s.stage<3?'叶子舒展开，绿意正好。':s.stage<4?(['daisy','lavender'].includes(s.species)?'长得很好，花也悄悄开了。':'枝叶长得很好，空气里有草木香。'):'满满的生命力，今天也越来越好。'};}
 const target=id=>beds.find(b=>b.id===id)||beds[0];
 function waterBed(id){const b=target(id),now=Date.now();if(now-b.state.watered<8000){toast('土壤还润润的，让它慢慢喝。');return false;}b.state.watered=now;b.state.stage=Math.min(4,b.state.stage+.4);persist(b);grow(b);wateredBed=b;waterUntil=time+1.7;spray.visible=true;toast(names[b.state.species]+'喝到水啦，谢谢你的照顾。');return true;}
 function fertilizeBed(id){const b=target(id),now=Date.now();if(now-b.state.fertilized<30000){toast('营养已经够啦，等一会儿再来照顾它。');return false;}b.state.fertilized=now;b.state.stage=Math.min(4,b.state.stage+.6);persist(b);grow(b);toast('添了一点养分，叶子会更有精神。');return true;}
 function plantBed(id,species){if(!names[species])return false;const b=target(id);b.state={species,stage:0,watered:0,fertilized:0,flowers:b.state.flowers};persist(b);grow(b);toast('种下'+names[species]+'，一起等它长大。');return true;}
 function harvestBed(id){const b=target(id);if(!getBed(id).canHarvest)return false;b.state.flowers++;b.state.stage=1;persist(b);grow(b);toast('收下一朵小花，送给今天的好心情。');return true;}
 function update(dt,elapsed){time=elapsed;for(const d of doors){d.amount=THREE.MathUtils.damp(d.amount,d.target,7,dt);d.object.position.x=d.baseX-d.amount*(d.width+.015);}if(spray.visible&&wateredBed){spray.position.copy(wateredBed.object.position);for(const drop of spray.children){const t=(elapsed*1.5+drop.userData.phase)%1;drop.position.set(Math.sin(drop.userData.phase*23)*.43,1.08-t*.63,Math.cos(drop.userData.phase*17)*.15);}if(elapsed>waterUntil)spray.visible=false;}}
 return {root,doors,beds,colliderRoots,getBed,listBeds:()=>beds.map(b=>getBed(b.id)),waterBed,fertilizeBed,plantBed,harvestBed,update,audit:{deckPlan:[581,166,1170,303],deckAreaM2:width*depth,roof:false,railHeightM:1.15,slidingDoorClearWidthM:(850-792)*S-.06,planters:8,originalFacadeMeshesRemoved:removed.length},dispose(){root.removeFromParent();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
