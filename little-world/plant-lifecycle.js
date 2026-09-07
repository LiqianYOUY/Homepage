// Real elapsed days, never clicks. See PLANT-LIFECYCLE.md for horticultural
// sources and the explicit sheltered-container / seasonal-display assumptions.
export const DAY=86400000;
export const PLANTS={
 mint:{name:'薄荷',nameEn:'Mint',germination:14,young:35,flower:120,bloom:45,water:3,drought:12,feed:180,depletion:540,vase:7},
 rosemary:{name:'迷迭香',nameEn:'Rosemary',germination:28,young:90,flower:730,bloom:45,water:7,drought:35,feed:365,depletion:1095,vase:14},
 daisy:{name:'雏菊',nameEn:'Daisy',germination:14,young:42,flower:270,bloom:60,water:3,drought:12,feed:60,depletion:240,vase:7},
 lavender:{name:'薰衣草',nameEn:'Lavender',germination:45,young:100,flower:365,bloom:45,water:7,drought:35,feed:365,depletion:1095,vase:10},
 sunflower:{name:'向日葵',nameEn:'Sunflower',germination:10,young:25,flower:85,bloom:21,water:3,drought:12,feed:21,depletion:90,vase:7},
 tulip:{name:'郁金香',nameEn:'Tulip',germination:28,young:70,flower:120,bloom:21,water:7,drought:28,feed:30,depletion:150,vase:7,bulb:true}
};
export const VASES={living:{name:'客厅花瓶',nameEn:'Living room vase'},dining:{name:'餐厅花瓶',nameEn:'Dining room vase'},balcony:{name:'室内阳台花瓶',nameEn:'Indoor balcony vase'}};
export const PLANT_TRANSLATIONS={
 '土壤还湿润，等它需要水时再来。':'The soil is still moist. Come back when it needs water.',
 '盆土里还有养分，暂时不用施肥。':'The potting mix still has nutrients. No feed is needed yet.',
 '先清理花盆，再种下新的植物吧。':'Clear the planter before starting a new plant.',
 '先清理凋谢的植物，再重新种植。':'Clear the withered plant before planting again.',
 '这盆植物还在生长，先好好照顾它吧。':'This plant is still growing. Keep looking after it.',
 '等真正开花后，再剪下一枝。':'Wait until it flowers before cutting a stem.',
 '植物还在生长，不需要清理。':'This plant is still growing and does not need clearing.',
 '暂时没有可用的花枝。':'There are no fresh cut stems available yet.',
 '浇好水了，它会按自己的节奏慢慢长大。':'Watered. It will grow in its own time.',
 '添好了养分，等它慢慢吸收。':'Fed. Give it time to absorb the nutrients.',
 '种下了新的植物，一起等它发芽。':'Planted. Let us wait for the first sprout.',
 '种好了，给它一点时间慢慢长大。':'Planted. Give it time to grow.',
 '剪下一枝，可以放进家里的花瓶。':'One stem cut, ready for a vase at home.',
 '花箱清理好了，可以重新播种。':'The planter is clear and ready for new seeds.',
 '花盆清理好了，可以重新播种。':'The pot is clear and ready for new seeds.',
 '把这一枝放进花瓶，让家里多一点颜色。':'A fresh stem in the vase adds a little colour to the room.',
 '先等花开，剪下一枝后就可以插花了。':'Wait for a bloom, then cut a stem to arrange in a vase.',
 '凋谢植物已清理，机器人返回充电座。':'The withered plant is cleared. The robot is returning to its dock.',
 '客厅花瓶':'Living room vase','餐厅花瓶':'Dining room vase','室内阳台花瓶':'Indoor balcony vase','室内阳台推拉门':'Indoor balcony sliding door',
 '薄荷':'Mint','迷迭香':'Rosemary','雏菊':'Daisy','小雏菊':'Daisy','薰衣草':'Lavender','向日葵':'Sunflower','郁金香':'Tulip','空花盆':'Empty planter',
 '种子':'Seed','发芽':'Sprout','生长':'Growing','开花':'Flowering','凋谢':'Withered','等待播种':'Ready to plant'
};
const phases={empty:['等待播种','Ready to plant'],seed:['种子','Seed'],sprout:['发芽','Sprout'],growing:['生长','Growing'],flowering:['开花','Flowering'],withered:['凋谢','Withered']};
const number=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const clampedTime=(v,now,fallback=now)=>Math.min(now,Math.max(0,number(v,fallback)));

export function getPlantSnapshot(record={},now=Date.now()){
 const species=PLANTS[record.species]?record.species:null,p=PLANTS[species];
 if(!p)return {...record,species:null,seed:null,phase:'empty',stage:0,progress:0,name:'空花盆',nameEn:'Empty planter',label:'一盆新土，等一颗种子。',labelEn:'Fresh soil, ready for a seed.',stageName:phases.empty[0],stageNameEn:phases.empty[1],canPlant:true,canClear:false,canWater:false,canFertilize:false,canHarvest:false,flowers:number(record.flowers),ageDays:0};
 const plantedAt=clampedTime(record.plantedAt,now),ageDays=Math.max(0,(now-plantedAt)/DAY);
 const lastWateredAt=clampedTime(record.lastWateredAt,now,plantedAt),lastFertilizedAt=clampedTime(record.lastFertilizedAt,now,plantedAt);
 // Young roots need more frequent care, even in drought-tolerant herbs.
 const waterDays=ageDays<p.young?Math.min(2,p.water):p.water,droughtDays=ageDays<p.young?Math.min(7,p.drought):p.drought;
 const droughtAt=lastWateredAt+((lastWateredAt-plantedAt)/DAY<p.young?Math.min(7,p.drought):p.drought)*DAY;
 const depletionAt=lastFertilizedAt+p.depletion*DAY,seasonEndAt=plantedAt+(p.flower+p.bloom)*DAY;
 const witheredAt=record.witheredAt?clampedTime(record.witheredAt,now):Math.min(droughtAt,depletionAt,seasonEndAt);
 const withered=!!record.witheredAt||now>=witheredAt;
 let phase=withered?'withered':ageDays<p.germination?'seed':ageDays<p.young?'sprout':ageDays<p.flower?'growing':'flowering';
 const stage=['seed','sprout','growing','flowering','withered'].indexOf(phase),cause=record.witherCause||(witheredAt===droughtAt?'dry':witheredAt===depletionAt?'nutrients':'season');
 const label=phase==='withered'?(cause==='season'?'这一季的花期结束了，可以清理后重新种植。':cause==='dry'?'太久没有水，植物已枯萎。清理后再种新的吧。':'盆土养分长期耗尽，植物已枯萎。清理并换土后再种吧。'):p.name+' · '+(p.bulb&&phase==='seed'?'球茎扎根':phases[phase][0]);
 const labelEn=phase==='withered'?(cause==='season'?'This flowering season has ended. Clear the planter to start again.':cause==='dry'?'The plant dried out after too long without water. Clear it and plant again.':'The potting mix has been depleted for a long time. Clear and refresh the soil to start again.'):p.nameEn+' · '+(p.bulb&&phase==='seed'?'Bulb rooting':phases[phase][1]);
 return {...record,species,seed:species,name:p.name,nameEn:p.nameEn,seedName:p.name,phase,stage,stageName:phases[phase][0],stageNameEn:phases[phase][1],label,labelEn,ageDays,progress:Math.min(1,ageDays/p.flower),plantedAt,lastWateredAt,lastFertilizedAt,waterDays,droughtDays,feedDays:p.feed,waterDueInDays:(lastWateredAt+waterDays*DAY-now)/DAY,fertilizerDueInDays:(lastFertilizedAt+p.feed*DAY-now)/DAY,flowerInDays:Math.max(0,p.flower-ageDays),flowerDays:p.flower,germinationDays:p.germination,bloomDays:p.bloom,bulb:!!p.bulb,canPlant:false,canClear:withered,canWater:!withered,canFertilize:!withered&&ageDays>=p.young,canHarvest:phase==='flowering'&&!record.harvestedAt,flowers:number(record.flowers),witheredAt:withered?witheredAt:null,witherCause:withered?cause:null};
}

export function createPlantLifecycle({getState=()=>({}),setState=()=>{},now=()=>Date.now()}={}){
 const read=()=>getState().gardenWorld||{},subscribers=new Set();
 const save=patch=>{setState({gardenWorld:{...read(),...patch,version:1}});for(const fn of subscribers)fn();};
 function ensureBed(id,{species=null,legacy=null,established=false}={}){
  if(read().beds?.[id])return getBed(id);
  const t=now(),old=legacy||{},kind=PLANTS[old.species||old.seed]?old.species||old.seed:species,p=PLANTS[kind];
  // Old click-grown displays become already established plants; no fabricated
  // historical neglect is applied during this one-time migration.
  const legacyAge=p&&(established||number(old.stage)>0)?(established||number(old.stage)>=3?p.flower:p.young):0;
  const plantedAt=p?t-legacyAge*DAY:null;
  const record={id,species:p?kind:null,plantedAt,lastWateredAt:t,lastFertilizedAt:t,flowers:number(old.flowers||old.flowersCollected),migratedFromClicks:!!legacy,clearedAt:null};
  save({beds:{...read().beds,[id]:record}});return getBed(id);
 }
 function getBed(id){const stored=read().beds?.[id]||{id};return {...getPlantSnapshot(stored,now()),id};}
 function writeBed(id,record,patch={}){save({beds:{...read().beds,[id]:record},...patch});return getBed(id);}
 function settled(id){const b=getBed(id);if(b.witheredAt&&!read().beds?.[id]?.witheredAt)writeBed(id,{...read().beds[id],witheredAt:b.witheredAt,witherCause:b.witherCause});return b;}
 function plant(id,species){if(!PLANTS[species])return {ok:false,reason:'species'};const b=settled(id);if(!b.canPlant)return {ok:false,reason:b.canClear?'clear-first':'occupied'};const t=now();return {ok:true,bed:writeBed(id,{id,species,plantedAt:t,lastWateredAt:t,lastFertilizedAt:t,harvestedAt:null,witheredAt:null,witherCause:null,flowers:number(b.flowers),clearedAt:null})};}
 function care(id,type){const b=settled(id);if(!b.species||b.canClear)return {ok:false,reason:'inactive'};const watering=type==='water',due=watering?b.waterDueInDays:b.fertilizerDueInDays;if(due>0||(!watering&&!b.canFertilize))return {ok:false,reason:watering?'moist':'fed'};return {ok:true,bed:writeBed(id,{...read().beds[id],[watering?'lastWateredAt':'lastFertilizedAt']:now()})};}
 function harvest(id){const b=settled(id);if(!b.canHarvest)return {ok:false,reason:'not-flowering'};const t=now(),gift={id:`stem-${id}-${t}`,species:b.species,cutAt:t,expiresAt:t+PLANTS[b.species].vase*DAY,usedIn:null};return {ok:true,gift,bed:writeBed(id,{...read().beds[id],harvestedAt:t,flowers:b.flowers+1},{cuttings:[...(read().cuttings||[]),gift].slice(-100)})};}
 function clear(id,{by='visitor'}={}){const b=settled(id);if(!b.canClear)return {ok:false,reason:'not-withered'};return {ok:true,bed:writeBed(id,{id,species:null,flowers:b.flowers,clearedAt:now(),clearedBy:by})};}
 function arrange(vaseId,cuttingId){if(!VASES[vaseId])return {ok:false,reason:'vase'};const t=now(),cuttings=read().cuttings||[],gift=cuttings.find(c=>(cuttingId?c.id===cuttingId:true)&&!c.usedIn&&c.expiresAt>t);if(!gift)return {ok:false,reason:'no-cuttings'};save({cuttings:cuttings.map(c=>c.id===gift.id?{...c,usedIn:vaseId}:c),vases:{...read().vases,[vaseId]:{species:gift.species,cuttingId:gift.id,arrangedAt:t,expiresAt:gift.expiresAt}}});return {ok:true,vase:getVase(vaseId)};}
 function getVase(id){const v=read().vases?.[id];return {id,...VASES[id],...v,empty:!v?.species,withered:!!v?.species&&now()>=v.expiresAt};}
 function clearVase(id){if(!VASES[id])return false;save({vases:{...read().vases,[id]:null}});return true;}
 function refresh(){let changed=false;const beds={...read().beds};for(const [id,b] of Object.entries(beds)){const current=getPlantSnapshot(b,now());if(current.witheredAt&&!b.witheredAt){beds[id]={...b,witheredAt:current.witheredAt,witherCause:current.witherCause};changed=true;}}if(changed)save({beds});else for(const fn of subscribers)fn();}
 return {ensureBed,getBed,listBeds:()=>Object.keys(read().beds||{}).map(getBed),plant,water:id=>care(id,'water'),fertilize:id=>care(id,'fertilize'),harvest,clear,arrange,getVase,clearVase,listVases:()=>Object.keys(VASES).map(getVase),availableCuttings:()=>[...(read().cuttings||[])].filter(c=>!c.usedIn&&c.expiresAt>now()),refresh,subscribe(fn){subscribers.add(fn);return ()=>subscribers.delete(fn);},cleanupCandidates:()=>Object.keys(read().beds||{}).map(getBed).filter(b=>b.canClear&&now()-b.witheredAt>=DAY)};
}
