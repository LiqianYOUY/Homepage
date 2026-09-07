import {getLanguage,translate} from './i18n.js?v=13';
import {PLANTS,DAY} from './plant-lifecycle.js?v=13';

export function createPlantUI({getSmart,getTerrace,panel,node,button,toast}){
 const copy=(zh,en)=>getLanguage()==='en'?en:zh;
 const label=bed=>getLanguage()==='en'?bed.nameEn:bed.name;
 const due=days=>days<=0?copy('今天可以照顾','Ready for care today'):copy(`约 ${Math.ceil(days)} 天后`,`In about ${Math.ceil(days)} days`);
 function watch(p,life,draw){
  let drawing=false;
  const refresh=()=>{if(!p.isConnected||drawing)return;drawing=true;try{draw();}finally{drawing=false;}};
  const unsubscribe=life.subscribe(refresh),timer=setInterval(refresh,60000);
  window.addEventListener('little-world:languagechange',refresh);
  p.addEventListener('home:close',()=>{unsubscribe();clearInterval(timer);window.removeEventListener('little-world:languagechange',refresh);},{once:true});
  refresh();
 }
 function details(container,b){
  container.replaceChildren(node('span','dialog-eyebrow','A LITTLE CARE, EVERY DAY'),node('h3','',label(b)),node('p','',getLanguage()==='en'?b.labelEn:b.label));
  if(!b.species)return;
  const progress=node('div','plant-growth');progress.setAttribute('role','progressbar');progress.setAttribute('aria-label',translate('植物长大进度'));progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax','100');progress.setAttribute('aria-valuenow',String(Math.round(b.progress*100)));const fill=node('i');fill.style.width=b.progress*100+'%';progress.append(fill);container.append(progress);
  const stages=node('div','plant-stages');
  for(const [key,zh,en] of [['seed',b.bulb?'球茎':'种子',b.bulb?'Bulb':'Seed'],['sprout','发芽','Sprout'],['growing','生长','Grow'],['flowering','开花','Bloom'],['withered','凋谢','Wither']]){const item=node('span',key===b.phase?'current':'',copy(zh,en));if(key===b.phase)item.setAttribute('aria-current','step');stages.append(item);}
  container.append(stages);
  const stats=node('dl','plant-care-facts');
  const fact=(name,value)=>stats.append(node('dt','',name),node('dd','',value));
  fact(copy('已经生长','Age'),copy(`${Math.floor(b.ageDays)} 天`,`${Math.floor(b.ageDays)} days`));
  if(!b.canClear){
   fact(copy('下一次浇水','Next watering'),due(b.waterDueInDays));
   fact(copy('下一次施肥','Next feeding'),b.canFertilize?due(b.fertilizerDueInDays):copy('幼苗暂不施肥','No feeding while young'));
   if(b.flowerInDays>0)fact(copy('预计开花','Expected flowers'),copy(`约 ${Math.ceil(b.flowerInDays)} 天后`,`In about ${Math.ceil(b.flowerInDays)} days`));
   else fact(copy('花期','Flowering window'),copy(`约 ${b.bloomDays} 天`,`About ${b.bloomDays} days`));
  }
  container.append(stats,node('p','stats-caption',copy('按真实经过的天数生长。时间为适宜盆栽环境下的模拟周期，浇水和施肥不会跳过生长阶段。','Growth follows real elapsed days. These are simulated cycles for suitable container conditions; care does not skip growth stages.')));
 }
 function actions(container,b,api,draw){
  container.replaceChildren();
  if(b.canClear)container.append(button(copy('清理凋谢植物','Clear withered plant'),()=>{api.clear();draw();},true));
  else if(b.species){
   const water=button(copy('浇一点水 💧','Add a little water 💧'),()=>{api.water();draw();},true);water.disabled=!b.canWater||b.waterDueInDays>0;
   const feed=button(copy('添一点肥 🌱','Add some nutrients 🌱'),()=>{api.feed();draw();});feed.disabled=!b.canFertilize||b.fertilizerDueInDays>0;
   container.append(water,feed);
   if(b.canHarvest)container.append(button(copy('剪下一枝 ✂','Cut a stem ✂'),()=>{api.harvest();draw();}));
  }
  container.append(button(copy('把花带进家里','Arrange flowers indoors'),openFlowerVases));
 }
 function planting(container,b,ids,plant,draw){
  container.replaceChildren();
  if(!b.canPlant){container.hidden=true;return;}container.hidden=false;
  const select=node('select');select.setAttribute('aria-label',copy('选择要种的植物','Choose a plant'));
  for(const id of ids){const species=PLANTS[id],option=node('option','',copy(species.name+(species.bulb?' · 球茎':''),species.nameEn+(species.bulb?' · bulb':'')));option.value=id;select.append(option);}
  container.append(select,button(copy('开始新的种植','Start a new plant'),()=>{plant(select.value);draw();},true));
 }
 function openTerrace(selectedId){
  const terrace=getTerrace();if(!terrace){toast('露台还在准备中……');return;}
  let id=selectedId||terrace.listBeds()[0].id;
  const {p,content}=panel('terrace','风吹过的小花园','露台上有阳光，也有等你照顾的一点绿。',570);
  const choices=node('div','planter-choices'),desc=node('div','planter-detail'),buttons=node('div','world-actions'),seeds=node('div','seed-options'),note=node('p','stats-caption');content.append(choices,desc,buttons,seeds,note);
  function draw(){
   choices.replaceChildren();for(const b of terrace.listBeds()){const option=button(`${String(b.index+1).padStart(2,'0')} · ${label(b)}`,()=>{id=b.id;draw();});option.setAttribute('aria-pressed',String(b.id===id));choices.append(option);}
   const b=terrace.getBed(id);details(desc,b);actions(buttons,b,{water:()=>terrace.waterBed(id),feed:()=>terrace.fertilizeBed(id),harvest:()=>terrace.harvestBed(id),clear:()=>terrace.clearBed(id)},draw);planting(seeds,b,['mint','rosemary','daisy','lavender'],species=>terrace.plantBed(id,species),draw);
   note.textContent=copy('凋谢后一天还没有人清理，开启自动打扫的机器人会沿通畅的路线来照顾花箱。','If a withered plant is left for a day, the robot can come and clear it when automatic cleaning is on and the route is clear.');
  }
  watch(p,terrace.plantLife,draw);
 }
 function openGarden(){
  const smart=getSmart();if(!smart){toast('花盆还在准备中……');return;}
  const {p,content}=panel('garden','窗边的小花园','照顾一点绿色，也给自己放个小假。',540);
  const desc=node('div','planter-detail'),buttons=node('div','world-actions'),seeds=node('div','seed-options');content.append(desc,buttons,seeds);
  function draw(){const b=smart.getGardenStatus();details(desc,b);actions(buttons,b,{water:()=>smart.water(),feed:()=>smart.fertilize(),harvest:()=>smart.harvest(),clear:()=>smart.clearPlant()},draw);planting(seeds,b,['daisy','sunflower','tulip'],species=>smart.plant(species),draw);}
  watch(p,smart.plantLife,draw);
 }
 function openFlowerVases(){
  const smart=getSmart();if(!smart)return;const life=smart.plantLife;
  const {p,content}=panel('vases','给家插一瓶花','剪下的花枝，陪你在屋里坐一会儿。',590);
  function draw(){
   content.replaceChildren();const cuttings=life.availableCuttings();
   content.append(node('p','gentle-note',cuttings.length?copy(`有 ${cuttings.length} 枝鲜花可以插瓶，选一个舒服的位置。`,`${cuttings.length} fresh stem${cuttings.length===1?'':'s'} ready. Choose a cosy spot.`):copy('等花开后剪下一枝，就可以放进客厅、餐厅或室内阳台的花瓶。','Cut a stem when a plant blooms, then place it in a living room, dining room or indoor balcony vase.')));
   for(const vase of life.listVases()){
    const row=node('section','vase-choice'),heading=node('h3','',getLanguage()==='en'?vase.nameEn:vase.name);row.append(heading);
    const species=PLANTS[vase.species];
    row.append(node('p','',vase.empty?copy('空花瓶，等一枝花。','An empty vase, waiting for a flower.'):vase.withered?copy('花枝已经凋谢，可以清理。','These flowers have faded and can be cleared.'):copy(`${species.name} · 还能陪你约 ${Math.max(1,Math.ceil((vase.expiresAt-Date.now())/DAY))} 天`,`${species.nameEn} · About ${Math.max(1,Math.ceil((vase.expiresAt-Date.now())/DAY))} fresh days left`)));
    const controls=node('div','world-actions');
    if(cuttings.length){const select=node('select');select.setAttribute('aria-label',copy('选择花枝','Choose a stem'));for(const cutting of cuttings){const species=PLANTS[cutting.species],option=node('option','',getLanguage()==='en'?species.nameEn:species.name);option.value=cutting.id;select.append(option);}controls.append(select,button(copy('插入这只花瓶','Arrange in this vase'),()=>smart.arrangeFlowers(vase.id,select.value),true));}
    if(!vase.empty)controls.append(button(copy('清理花瓶','Clear vase'),()=>{life.clearVase(vase.id);draw();}));row.append(controls);content.append(row);
   }
  }
  watch(p,life,draw);
 }
 return {openTerrace,openGarden,openFlowerVases};
}
