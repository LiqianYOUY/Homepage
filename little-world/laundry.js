import {createLaundryLifecycle,GARMENTS,WASH_DURATION,DRY_DURATION,LAUNDRY_DAY} from './laundry-lifecycle.js?v=13';
import {addTranslations,translate,getLanguage} from './i18n.js?v=13';
import {consumeDialogEscape,isTopDialog,raiseDialog} from './dialog-stack.js';

const TEXT={
 '洗衣机 · 照顾衣物':'Washer · Care for your clothes','烘干机 · 温暖蓬松':'Dryer · Warm and soft',
 '洗好，烘暖，慢慢收好。':'Wash, warm, and fold away.',
 '洗衣日的小仪式':'A little laundry ritual','关闭洗衣面板':'Close laundry',
 '每两周，几件日常衣物。':'Every two weeks, a few everyday clothes.',
 '洗衣机':'Washer','烘干机':'Dryer','待清洗':'Ready to wash','洗涤中':'Washing','已洗净，等待转移':'Washed, ready to transfer','已放入烘干机':'In the dryer','烘干中':'Drying','温暖干燥，可以收好':'Dry and ready to put away','这批衣物已经收好了':'This load has been put away',
 '开始洗涤 · 45 分钟':'Start wash · 45 minutes','移入上方烘干机':'Move to the upper dryer','开始烘干 · 60 分钟':'Start dry · 60 minutes','叠好收起来':'Fold and put away',
 '等洗衣机完成，再把衣服移过来。':'Wait for the wash to finish, then move the clothes over.',
 '留在洗衣机里，等这一轮洗好。':'The clothes stay in the washer until this cycle finishes.',
 '留在烘干机里，等衣物慢慢变暖。':'The clothes stay in the dryer while this cycle runs.',
 '洗涤与烘干按真实时间进行，离开网页后也会继续计时。':'Washing and drying use real time and keep counting while the page is closed.',
 '最多保留一批待处理衣物，错过的周期不会堆成大山。':'One load at a time. Missed cycles do not pile up.',
 '洗涤开始了，45 分钟后可以转移衣物。':'The wash has started. The clothes can be moved in 45 minutes.',
 '衣物移进烘干机了，可以开始烘干。':'The clothes are in the dryer, ready to start.',
 '烘干开始了，60 分钟后就能收好。':'Drying has started. The clothes will be ready in 60 minutes.',
 '衣服收好了，小家又整齐了一点。':'The clothes are put away. Home feels a little tidier.',
 '这一步已经处理好了，继续下一步吧。':'This step has already been handled. Continue with the next one.',
 'T恤':'T-shirt','衬衫':'Shirt','长裤':'Trousers','毛巾':'Towel','袜子':'Socks'
};
addTranslations(TEXT);
const phaseCopies={dirty:'待清洗',washing:'洗涤中',washed:'已洗净，等待转移','in-dryer':'已放入烘干机',drying:'烘干中',dry:'温暖干燥，可以收好',empty:'这批衣物已经收好了'};
const garmentPaths={tshirt:'M15 8 6 14l5 9 6-3v25h26V20l6 3 5-9-9-6-9 4h-6Z',shirt:'M15 8 6 14l5 9 6-3v25h26V20l6 3 5-9-9-6-9 4h-6Zm15 5v31',trousers:'M18 8h24l4 37H34l-4-24-4 24H14Z',towel:'M16 8h28v37H16Z',socks:'M22 8h17v23l-5 13H12V34l10-7Z'};

export function setupLaundry({THREE,model,scene=model,register=()=>{},getState=()=>({}),setState=()=>{},toast=()=>{},now=()=>Date.now(),lifecycle=createLaundryLifecycle({getState,setState,now}),ui=true}={}){
 const root=new THREE.Group();root.name='Laundry · fortnightly care';root.userData.noMerge=true;model.add(root);
 const originals=[],materials=new Set(),geometries=new Set(),machines=[],records=[];
 const raw=o=>o.userData?.name||o.name||'',source=[];model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh)source.push(o);});
 const named=(...names)=>source.filter(o=>names.includes(raw(o))),centre=o=>new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
 const doors=named('Laundry round dark door').sort((a,b)=>centre(a).y-centre(b).y),panes=named('Laundry glass door').sort((a,b)=>centre(a).y-centre(b).y),controls=named('Laundry controls').sort((a,b)=>centre(a).y-centre(b).y);
 const mat=(name,color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.65,...extra});m.name=name;materials.add(m);return m;};
 const metal=mat('Laundry brushed rim',0xb5bab5,{metalness:.6,roughness:.29}),dark=mat('Laundry recessed drum',0x303e40),glass=mat('Laundry clear porthole',0xb7d6df,{transparent:true,opacity:.12,roughness:.12,depthWrite:false,side:THREE.DoubleSide}),linenMats=new Map();
 const linen=color=>{if(!linenMats.has(color))linenMats.set(color,mat('Laundry woven cloth '+color,color,{roughness:.96,side:THREE.DoubleSide}));return linenMats.get(color);};
 function mesh(parent,name,geometry,material){geometries.add(geometry);const object=new THREE.Mesh(geometry,material);object.name=name;object.userData={noMerge:true,category:'decoration'};object.castShadow=!material.transparent;object.receiveShadow=true;parent.add(object);return object;}
 function saveOriginal(o){if(!o||originals.some(s=>s.object===o))return;originals.push({object:o,parent:o.parent,position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone(),userData:{...o.userData}});}
 const legacy=[];model.traverse(o=>{if(/^Laundry[_ ](?:Washer|Dryer)$/i.test(raw(o)))legacy.push(o);});
 for(let index=0;index<2;index++){
  const kind=index?'dryer':'washer',legacyObject=legacy.find(o=>raw(o).toLowerCase().endsWith(kind)),originalDoor=doors[index],originalPane=panes[index];
  if(!originalDoor&&!legacyObject)continue;
  const bounds=new THREE.Box3().setFromObject(originalPane||originalDoor||legacyObject),position=bounds.getCenter(new THREE.Vector3()),radius=originalPane?(bounds.max.x-bounds.min.x)/2:.17;
  position.z=bounds.min.z-.009;
  const machine=new THREE.Group();machine.name=index?'Laundry_Dryer':'Laundry_Washer';machine.position.copy(position);machine.userData={noMerge:true,interactionId:'laundry-'+kind};root.add(machine);
  for(const old of [originalDoor,originalPane])if(old){saveOriginal(old);old.removeFromParent();}
  const rim=mesh(machine,'Laundry '+kind+' metal door rim',new THREE.TorusGeometry(radius+.023,.024,12,40),metal);
  const back=mesh(machine,'Laundry '+kind+' recessed drum back',new THREE.CircleGeometry(radius,40),dark);back.rotation.y=Math.PI;back.position.z=.025;
  const clothes=new THREE.Group();clothes.name='Visible '+kind+' garments';clothes.userData.noMerge=true;machine.add(clothes);
  const porthole=mesh(machine,'Laundry '+kind+' transparent door',new THREE.CircleGeometry(radius,40),glass);porthole.position.z=-.024;porthole.rotation.y=Math.PI;porthole.renderOrder=3;
  const inner=mesh(machine,'Laundry '+kind+' inner drum lip',new THREE.TorusGeometry(radius-.006,.006,8,40),metal);inner.position.z=.012;
  if(controls[index]){saveOriginal(controls[index]);machine.updateWorldMatrix(true,true);machine.attach(controls[index]);controls[index].userData.noMerge=true;}
  const lightMat=mat('Laundry '+kind+' programme lamp',0x869787,{emissive:0x416653,emissiveIntensity:.08}),light=mesh(machine,'Laundry '+kind+' running indicator',new THREE.CircleGeometry(.012,16),lightMat);light.position.set(.17,.265,.058);light.rotation.y=Math.PI;
  const record={id:'laundry-'+kind,label:index?'烘干机 · 温暖蓬松':'洗衣机 · 照顾衣物',kind:'laundry',object:machine,anchor:position.clone().add(new THREE.Vector3(0,.10,-.02)),click:()=>open(kind)};machine.traverse(o=>{if(o.isMesh)o.userData.interactionId=record.id;});register(record);records.push(record);
  machines.push({kind,object:machine,clothes,lightMat,radius,signature:'',record});
 }
 function clearClothes(group){for(const object of [...group.children]){object.traverse(o=>{if(o.isMesh){geometries.delete(o.geometry);o.geometry.dispose();}});object.removeFromParent();}}
 function makeGarment(parent,item,index,count,radius){
  const group=new THREE.Group();group.name=`Laundry ${item.kind} · ${item.id}`;group.userData.garmentId=item.id;parent.add(group);
  const angle=(index+.2)*Math.PI*2/count,offset=count>3?.073:.061;group.position.set(Math.cos(angle)*offset,Math.sin(angle)*offset-.015,-.009-index*.0008);group.rotation.z=(index%3-1)*.48;
  const shape=new THREE.Shape();
  if(item.kind==='trousers'){shape.moveTo(-.038,.052);shape.lineTo(.038,.052);shape.lineTo(.05,-.055);shape.lineTo(.014,-.055);shape.lineTo(0,.015);shape.lineTo(-.014,-.055);shape.lineTo(-.05,-.055);}
  else if(item.kind==='socks'){shape.moveTo(-.014,.049);shape.lineTo(.022,.049);shape.lineTo(.022,-.025);shape.lineTo(-.001,-.047);shape.lineTo(-.055,-.047);shape.lineTo(-.055,-.016);shape.lineTo(-.014,-.006);}
  else if(item.kind==='towel'){shape.moveTo(-.043,.055);shape.lineTo(.043,.049);shape.lineTo(.041,-.051);shape.lineTo(-.039,-.055);}
  else{shape.moveTo(-.027,.045);shape.lineTo(-.065,.023);shape.lineTo(-.048,-.004);shape.lineTo(-.033,.007);shape.lineTo(-.03,-.05);shape.lineTo(.033,-.046);shape.lineTo(.033,.007);shape.lineTo(.05,-.003);shape.lineTo(.065,.024);shape.lineTo(.026,.045);shape.quadraticCurveTo(0,.023,-.027,.045);}
  shape.closePath();const garment=mesh(group,'Visible cloth '+item.kind,new THREE.ShapeGeometry(shape,5),linen(item.color));garment.userData.garmentId=item.id;garment.userData.interactionId=parent.parent.userData.interactionId;
  // A subtle raised fold gives the garment volume while retaining a readable outline.
  const fold=mesh(group,'Soft cloth fold',new THREE.CapsuleGeometry(.005,.055,3,6),linen(item.color));fold.rotation.z=.19;fold.position.set(.006,-.003,-.003);fold.userData.interactionId=parent.parent.userData.interactionId;
  if(radius<.16)group.scale.setScalar(radius/.17);
 }
 let overlay=null,content=null,previousFocus=null,disposed=false,lastSecond=-1,lastUiSignature='',selected='washer',currentStatus=null;
 function syncVisuals(status=lifecycle.getStatus()){
  currentStatus=status;
  for(const machine of machines){const occupied=machine.kind==='washer'?status.washerOccupied:status.dryerOccupied,signature=occupied?status.batch.id+':'+status.phase:'empty';
   if(machine.signature!==signature){machine.signature=signature;clearClothes(machine.clothes);if(occupied)status.garments.forEach((item,i)=>makeGarment(machine.clothes,item,i,status.garments.length,machine.radius));}
   const running=(machine.kind==='washer'&&status.phase==='washing')||(machine.kind==='dryer'&&status.phase==='drying');machine.lightMat.emissiveIntensity=running?.9:occupied?.2:.05;
   if(!running)machine.clothes.rotation.z=0;
  }
 }
 const copy=(zh,en)=>getLanguage()==='en'?en:zh;
 function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 function action(label,fn){const button=element('button','laundry-action',translate(label));button.type='button';button.onclick=()=>{const result=fn();toast(translate(result.ok?{wash:'洗涤开始了，45 分钟后可以转移衣物。',transfer:'衣物移进烘干机了，可以开始烘干。',dry:'烘干开始了，60 分钟后就能收好。',collect:'衣服收好了，小家又整齐了一点。'}[result.action]:'这一步已经处理好了，继续下一步吧。'));draw(true);};return button;}
 const clockText=ms=>{const seconds=Math.ceil(ms/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;};
 function garmentIcon(item){const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 60 54');icon.setAttribute('aria-hidden','true');const path=document.createElementNS(icon.namespaceURI,'path');path.setAttribute('d',garmentPaths[item.kind]||garmentPaths.tshirt);path.setAttribute('fill',item.color);path.setAttribute('stroke','#64716b');path.setAttribute('stroke-width','1.4');path.setAttribute('stroke-linejoin','round');icon.append(path);return icon;}
 function draw(force=false,status=currentStatus||lifecycle.getStatus()){if(!overlay||overlay.hidden)return;const signature=[status.batch?.id,status.phase,getLanguage(),selected,status.nextBatchAt].join(':');
  if(force||signature!==lastUiSignature){const restoreActionFocus=content.contains(document.activeElement)&&document.activeElement.classList.contains('laundry-action');lastUiSignature=signature;content.replaceChildren();
   const eyebrow=element('span','laundry-eyebrow','A LITTLE CARE AT HOME'),title=element('h2','',translate('洗衣日的小仪式'));title.id='laundry-title';content.append(eyebrow,title,element('p','laundry-intro',translate('洗好，烘暖，慢慢收好。')));
   const steps=element('ol','laundry-steps');for(const [phases,zh,en] of [[['dirty','washing'],'洗涤','Wash'],[['washed','in-dryer'],'转移','Move'],[['drying'],'烘干','Dry'],[['dry','empty'],'收好','Put away']]){const step=element('li','',copy(zh,en));if(phases.includes(status.phase))step.setAttribute('aria-current','step');steps.append(step);}content.append(steps);
   const machinesRow=element('div','laundry-machine-row');for(const kind of ['washer','dryer']){const card=element('section','laundry-machine-card'+(kind===selected?' is-selected':'')),occupied=kind==='washer'?status.washerOccupied:status.dryerOccupied;card.append(element('span','laundry-machine-label',translate(kind==='washer'?'洗衣机':'烘干机')));const drum=element('div','laundry-ui-drum');drum.dataset.machine=kind;if(occupied)status.garments.forEach(item=>drum.append(garmentIcon(item)));card.append(drum,element('span','laundry-cycle-note',kind==='washer'?copy('日常洗 · 45 分钟','Everyday wash · 45 min'):copy('温和烘 · 60 分钟','Gentle dry · 60 min')));machinesRow.append(card);}content.append(machinesRow);
   const phase=element('p','laundry-phase',translate(phaseCopies[status.phase]));phase.setAttribute('role','status');content.append(phase);
   if(status.garments.length){const garments=element('ul','laundry-garments');status.garments.forEach(item=>{const row=element('li','',getLanguage()==='en'?GARMENTS[item.kind].nameEn:GARMENTS[item.kind].name);const dot=element('i');dot.style.background=item.color;row.prepend(dot);garments.append(row);});content.append(garments);}
   if(status.running){const track=element('div','laundry-progress');track.setAttribute('role','progressbar');track.setAttribute('aria-label',translate(phaseCopies[status.phase]));track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.append(element('i'));const remaining=element('output','laundry-remaining');remaining.setAttribute('aria-live','off');content.append(track,remaining);}
   const actions=element('div','laundry-actions');if(status.canStartWash)actions.append(action('开始洗涤 · 45 分钟',()=>lifecycle.startWash()));if(status.canTransfer)actions.append(action('移入上方烘干机',()=>lifecycle.transferToDryer()));if(status.canStartDry)actions.append(action('开始烘干 · 60 分钟',()=>lifecycle.startDry()));if(status.canCollect)actions.append(action('叠好收起来',()=>lifecycle.collect()));content.append(actions);
   content.append(element('p','laundry-timing-note',translate('洗涤与烘干按真实时间进行，离开网页后也会继续计时。')),element('p','laundry-next'),element('p','laundry-small',translate('最多保留一批待处理衣物，错过的周期不会堆成大山。')));
   if(restoreActionFocus)(content.querySelector('.laundry-action')||overlay).focus({preventScroll:true});
  }
  const progress=content.querySelector('.laundry-progress');if(progress){progress.setAttribute('aria-valuenow',String(Math.floor(status.progress*100)));progress.querySelector('i').style.width=status.progress*100+'%';content.querySelector('.laundry-remaining').textContent=copy(`还剩 ${clockText(status.remainingMs)}`,`${clockText(status.remainingMs)} remaining`);}
  content.querySelectorAll('.laundry-ui-drum').forEach(drum=>drum.classList.toggle('is-running',status.running&&(drum.dataset.machine==='washer'?status.phase==='washing':status.phase==='drying')));
  const next=content.querySelector('.laundry-next');if(next)next.textContent=status.overdueBatchWaiting?copy('下一批已到时间，收好这批后再慢慢处理。','The next load is due. Put this one away before starting another.'):copy(`下一批衣物约 ${Math.max(1,Math.ceil(status.nextBatchInMs/LAUNDRY_DAY))} 天后到。`,`The next load is due in about ${Math.max(1,Math.ceil(status.nextBatchInMs/LAUNDRY_DAY))} days.`);
 }
 function close(){if(!overlay||overlay.hidden)return;overlay.hidden=true;previousFocus?.focus?.({preventScroll:true});}
 function keydown(event){if(!overlay||overlay.hidden||!isTopDialog(overlay))return;if(consumeDialogEscape(event,overlay)){close();return;}if(event.key==='Tab'){const focusable=[...overlay.querySelectorAll('button:not([disabled]),[tabindex="0"]')],first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===overlay)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}}
 function open(kind='washer'){
  if(!ui||typeof document==='undefined')return false;selected=kind==='dryer'?'dryer':'washer';previousFocus=document.activeElement;
  if(!overlay){if(!document.querySelector('link[data-laundry-style]')){const link=element('link');link.rel='stylesheet';link.href=new URL('./laundry.css?v=13',import.meta.url).href;link.dataset.laundryStyle='';document.head.append(link);}overlay=element('div','laundry-overlay');overlay.dataset.homeUi='';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','laundry-title');overlay.tabIndex=-1;const panel=element('section','laundry-dialog'),closeButton=element('button','laundry-close','×');closeButton.type='button';closeButton.setAttribute('aria-label',translate('关闭洗衣面板'));closeButton.onclick=close;content=element('div','laundry-content');panel.append(closeButton,content);overlay.append(panel);overlay.addEventListener('click',event=>{if(event.target===overlay)close();});document.body.append(overlay);document.addEventListener('keydown',keydown,true);}
  overlay.hidden=false;syncVisuals(lifecycle.refresh());draw(true);raiseDialog(overlay);overlay.focus({preventScroll:true});return true;
 }
 function languageChanged(){if(overlay)overlay.querySelector('.laundry-close').setAttribute('aria-label',translate('关闭洗衣面板'));draw(true);}
 const unsubscribe=lifecycle.subscribe(()=>{syncVisuals();draw();});if(typeof window!=='undefined')window.addEventListener('little-world:languagechange',languageChanged);
 function update(dt=0){if(disposed)return;const second=Math.floor(now()/1000);if(second!==lastSecond){lastSecond=second;syncVisuals(lifecycle.refresh());draw();}const status=currentStatus||lifecycle.getStatus();if(!getState().settings?.reducedMotion)for(const machine of machines){if((machine.kind==='washer'&&status.phase==='washing')||(machine.kind==='dryer'&&status.phase==='drying'))machine.clothes.rotation.z+=Math.min(.1,Math.max(0,dt))*(machine.kind==='washer'?.9:.55);}}
 syncVisuals();
 return {root,machines,records,lifecycle,colliderRoots:[root],open,close,update,getStatus:()=>lifecycle.getStatus(),audit:{washerFound:machines.some(m=>m.kind==='washer'),dryerFound:machines.some(m=>m.kind==='dryer'),sourceDoorCentres:machines.map(m=>({kind:m.kind,position:m.object.position.toArray(),radius:m.radius})),periodDays:14,washMinutes:WASH_DURATION/60000,dryMinutes:DRY_DURATION/60000,maximumActiveGarments:5},dispose(){if(disposed)return;disposed=true;unsubscribe();close();overlay?.remove();if(typeof document!=='undefined')document.removeEventListener('keydown',keydown,true);if(typeof window!=='undefined')window.removeEventListener('little-world:languagechange',languageChanged);for(const saved of originals){saved.parent?.add(saved.object);saved.object.position.copy(saved.position);saved.object.quaternion.copy(saved.quaternion);saved.object.scale.copy(saved.scale);saved.object.userData=saved.userData;}root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
