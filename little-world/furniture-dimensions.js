/** Capture the furnished scene before batching. X/Z are scene axes; dimensions
 * are not guessed from a perspective screenshot. This is a model-scale audit.
 */
export function measureFurnishings({THREE,scene,renovation,livingRoom,studio,bathroom,cabinetry,smart,entryDetails,bedroomDetails,laundry}){
 scene.updateWorldMatrix(true,true);const meshes=[],entries=[],covered=new Set();scene.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const raw=o=>o.userData?.name||o.name||'',round=n=>Math.round(n*1000)/1000;
 function add(name,objects,notes='',measure={}){
   const parts=[];for(const o of objects.filter(Boolean))o.traverse(p=>{if(p.isMesh){parts.push(p);covered.add(p);}});
   if(!parts.length)return;const bounds=new THREE.Box3();for(const p of parts)bounds.union(new THREE.Box3().setFromObject(p));
   const size=bounds.getSize(new THREE.Vector3());entries.push({name,dimensionsXYZm:size.toArray().map(round),bottomM:round(bounds.min.y),topM:round(bounds.max.y),notes,...measure});
 }
 function named(name,predicate,notes='',measure){add(name,meshes.filter(o=>predicate(raw(o),o)),notes,measure);}
 named('客厅沙发',n=>n.startsWith('Living sofa '),'三人沙发；座高含坐垫',{seatHeightM:.46});
 add('客厅茶几 / 棋牌桌',[livingRoom?.table],'包围盒含桌上棋牌；桌面尺寸另列',{worktopM:[1.72,1.18],surfaceHeightM:.465});
 add('电子钢琴',[livingRoom?.piano]);add('钢琴琴凳',[livingRoom?.bench],'可调琴凳造型');
 named('餐桌',n=>/^Dining table (top|leg)$/.test(n),'桌面厚度约 67 mm',{surfaceHeightM:.76});
 const chairs=[...new Set(meshes.map(o=>raw(o).match(/^Dining ((?:west|east) \d+|north|south) /)?.[1]).filter(Boolean))];
 for(const id of chairs)named('餐椅 '+id,n=>n.startsWith('Dining '+id+' '),'拖动后的朝向会改变 X/Z 包围盒',{seatHeightM:.46});
 for(const [label,prefix] of [['客厅电视','Large television'],['客厅电视柜','TV floating media bench'],['回音壁','Soundbar'],['室内阳台茶桌','Wintergarden table '],['入户换鞋凳','Entry bench'],['厨房灶具','Induction cooktop']])named(label,n=>n.startsWith(prefix));
 add('双层洗烘机外壳',[scene.getObjectByName('Laundry stacked machine case')],'含机壳；前方门圈另突出约 36 mm');
 named('恒温酒柜',n=>n.startsWith('Wine fridge · ')&&!/carcass|cream filler/.test(n),'本体含门与把手，不含顶柜');
 named('烤箱外围高柜',n=>n.startsWith('Double oven · '));
 for(const level of ['Lower','Upper'])named(level==='Lower'?'下层嵌入式烤箱':'上层嵌入式烤箱',n=>n.startsWith(level+' built-in oven · '));
 add('冰箱本体',[smart?.refrigerators?.[0]?.object],'含门把手；2.46 m 是外部储物柜总高',{nominalWidthM:.96,nominalHeightM:1.83,surroundHeightM:2.46});
 named('冰箱外围储物柜',n=>/^Fridge (side|upper) /.test(n));
 add('书房升降桌',[studio?.workstation,...(studio?.colliderRoots||[]).slice(0,2)],'包围盒含屏幕、桌面物件及桌腿；桌面另列',{worktopM:[1.80,.76],surfaceHeightM:.7925,standingHeightM:1.1325});
 add('书房人体工学椅',[studio?.chair]);add('书房降噪耳机及支架',[studio?.headphones]);
 for(const [label,prefix] of [['主卧大床','Master king bed '],['次卧双人床','Bedroom 2 queen bed ']]){
   named(label,n=>n.startsWith(prefix)&&!/bedside|lamp/.test(n));named(label+' 床垫',n=>n===prefix+'mattress');
   meshes.filter(o=>raw(o)===prefix+'bedside').forEach((o,i)=>add(label+' 床头柜 '+(i+1),[o]));
 }
 named('主卧电视柜',n=>n.startsWith('Master console'));
 add('主卧休憩椅',[bedroomDetails?.chair],'含坐垫和灯',{seatHeightM:bedroomDetails?.audit.chair.seatHeightM});add('主卧衣帽架',[bedroomDetails?.rack]);add('衣帽间收纳岛台',[bedroomDetails?.island],'包围盒含衣物；台面高 850 mm',{worktopM:[1.50,.72],surfaceHeightM:.85,clearances:bedroomDetails?.audit?.dressingIsland});
 add('次卧书桌',[renovation?.root?.getObjectByName('Bedroom 2 window writing desk')]);add('次卧座椅',[renovation?.root?.getObjectByName('Bedroom 2 writing chair')]);
 add('儿童房子母上下铺',[renovation?.childrenBunkBed],'含护栏和侧梯；床垫分别列出');
 add('儿童下铺床垫',[renovation?.childrenBunkBed?.lowerMattress]);add('儿童上铺床垫',[renovation?.childrenBunkBed?.upperMattress]);
 add('儿童窗边整体长桌',[renovation?.childrenStudy],'一个连续桌面，两个学习位',{surfaceHeightM:.75});
 (renovation?.childrenChairs||[]).forEach((o,i)=>add('儿童学习椅 '+(i+1),[o],'含坐垫',{seatHeightM:.467}));
 (renovation?.childrenBookcases||[]).forEach((o,i)=>add('儿童对称书柜 '+(i+1),[o],'含两侧板；有效书架深度 320 mm'));
 (renovation?.childrenWardrobes||[]).forEach(c=>add('儿童中央衣柜',[c.object],'含两扇推拉门'));
 (renovation?.loungers||[]).forEach((o,i)=>add('阳台懒人沙发 '+(i+1),[o]));
 for(const c of cabinetry?.cabinets||[])add(c.name,[c.body,...c.doors.map(d=>d.pivot)],'当前柜门姿态的尺寸；柜体标称另列',{caseWidthM:round(c.width),caseDepthM:round(c.depth),caseHeightM:round(c.height)});
 (entryDetails?.records||[]).forEach((c,i)=>add('入户鞋柜 '+(i+1),[c.object]));
 for(const f of bathroom?.fixtures||[])if(f.kind==='toilet')add(f.name+' 完整马桶',[f.object,...meshes.filter(o=>[f.name+' cistern',f.name+' pedestal'].includes(raw(o)))],'含水箱、底座、座圈',{seatHeightM:f.top});else add(f.name,[f.object],'外壳尺寸；顶边离地高度另列',{rimHeightM:f.top,cavityDepthM:f.depth});
 for(const [label,name] of [['露台柚木餐桌','Terrace slatted teak dining table'],['露台藤椅 1','Terrace woven rattan armchair 1'],['露台藤椅 2','Terrace woven rattan armchair 2'],['露台烧烤车','Terrace outdoor barbecue cart']])add(label,[scene.getObjectByName(name)],'包围盒含桌上物品；藤椅座面距露台地板 455 mm');
 named('微波炉',n=>n.startsWith('Microwave '));named('电饭煲',n=>n.startsWith('Rice cooker '));
 named('厨房操作台面',n=>n==='V7 kitchen supported stone counter');named('厨房中岛台面',n=>n.startsWith('Kitchen island stone waterfall top'));
 named('书房墙上书架',n=>n.startsWith('Study shelf'));
 for(const name of ['Living olive plant','Bedroom2 plant','Ensuite corner plant','Wintergarden tall planting','Wintergarden south planting'])named(name+' 花盆',n=>n.startsWith(name+' planter'));
 for(let i=0;i<8;i++)named('露台花箱 '+(i+1),n=>n==='Terrace planter solid case '+i);
 for(const prefix of ['Laundry sink','Bathroom2 vanity','Bathroom3 vanity','Master double vanity','Master vanity stone'])named(prefix+' 柜 / 台',n=>n.startsWith(prefix)&&!/basin|tap|spout|tooth|drain/.test(n));
 // Leave a machine-readable inventory of every remaining furniture/appliance
 // component so the summary never silently omits an unrecognised source mesh.
 const remaining=meshes.filter(o=>!covered.has(o)&&['furniture','appliance','applianceWine','applianceOven','kitchenCabinet'].includes(o.userData.category));
 return {units:'metres',method:'World bounds before static scene optimization; seated and worktop heights measured separately.',entries,remainingComponents:remaining.map(o=>{const b=new THREE.Box3().setFromObject(o);return {name:raw(o),dimensionsXYZm:b.getSize(new THREE.Vector3()).toArray().map(round),topM:round(b.max.y)};}),totalFurnitureMeshes:meshes.filter(o=>['furniture','appliance','applianceWine','applianceOven','kitchenCabinet'].includes(o.userData.category)).length};
}
