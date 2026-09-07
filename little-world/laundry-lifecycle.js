export const LAUNDRY_DAY=86400000;
export const LAUNDRY_PERIOD=14*LAUNDRY_DAY;
// The home's chosen programmes, rather than a claim about a particular machine.
export const WASH_DURATION=45*60000;
export const DRY_DURATION=60*60000;
export const GARMENTS={tshirt:{name:'T恤',nameEn:'T-shirt'},shirt:{name:'衬衫',nameEn:'Shirt'},trousers:{name:'长裤',nameEn:'Trousers'},towel:{name:'毛巾',nameEn:'Towel'},socks:{name:'袜子',nameEn:'Socks'}};
export const LAUNDRY_COLORS=['#8eaaa1','#d3b58c','#b5bfd2','#d3a4a0','#e3dfcf'];
const PHASES=['dirty','washing','washed','in-dryer','drying','dry'];
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const time=(value,fallback)=>Number.isFinite(value)&&value>=0?value:fallback;
const integer=(value,fallback=0)=>Number.isInteger(value)&&value>=0?value:fallback;

/** One real-time load at a time. Missed fortnightly deliveries coalesce into one
 * latest load; reopening a tab cannot produce another pile or restart a timer. */
export function createLaundryLifecycle({getState=()=>({}),setState=()=>{},now=()=>Date.now(),random=Math.random}={}){
 const subscribers=new Set();let notifying=false;
 const read=()=>object(getState().laundry);
 const randomUnit=()=>{const value=Number(random());return Number.isFinite(value)?Math.min(.999999,Math.max(0,value)):.5;};
 function notify(){if(notifying)return;notifying=true;try{for(const fn of subscribers)fn();}finally{notifying=false;}}
 function write(state){setState({laundry:state});notify();}
 function normalise(source,at){
  const legacyGarments=source.garments||source.clothes||source.items,hasExistingLoad=!!source.batch||(Array.isArray(legacyGarments)&&legacyGarments.length>0);
  const anchor=time(source.cycleAnchorAt,time(source.firstBatchAt,time(source.batch?.createdAt??source.createdAt,at))),next=time(source.nextBatchAt,anchor+(hasExistingLoad?LAUNDRY_PERIOD:0));
  let batch=source.batch&&typeof source.batch==='object'?source.batch:Array.isArray(legacyGarments)&&legacyGarments.length?{id:source.id,garments:legacyGarments,phase:source.phase||source.status,createdAt:source.createdAt,startedAt:source.startedAt,endsAt:source.endsAt}:null;
  if(batch){
   const raw=Array.isArray(batch.garments)?batch.garments:[],sequence=integer(source.sequence,1),id=typeof batch.id==='string'?batch.id:`laundry-${sequence}-${anchor}`;
   const garments=raw.slice(0,5).map((item,index)=>{const value=object(item),kind=typeof item==='string'?item:value.kind||value.type;return {id:typeof value.id==='string'?value.id:`${id}-item-${index}`,kind:GARMENTS[kind]?kind:'tshirt',color:LAUNDRY_COLORS.includes(value.color)?value.color:LAUNDRY_COLORS[index%LAUNDRY_COLORS.length]};});
   if(!garments.length)batch=null;
   else{
    let phase=PHASES.includes(batch.phase)?batch.phase:'dirty',startedAt=time(batch.startedAt,null),endsAt=null;
    if(['washing','drying'].includes(phase)){
     // An old/incomplete save without a start time cannot prove a finished cycle.
     if(startedAt===null)phase=phase==='washing'?'dirty':'in-dryer';
     else endsAt=startedAt+(phase==='washing'?WASH_DURATION:DRY_DURATION);
    }
    batch={id,garments,phase,createdAt:time(batch.createdAt,at),scheduledAt:time(batch.scheduledAt,anchor),startedAt:['washing','drying'].includes(phase)?startedAt:null,endsAt,washedAt:time(batch.washedAt,null),driedAt:time(batch.driedAt,null)};
   }
  }
  return {version:1,cycleAnchorAt:anchor,nextBatchAt:next,sequence:integer(source.sequence,batch?1:0),batch,collectedBatches:integer(source.collectedBatches),totalGarments:integer(source.totalGarments),lastCollectedAt:time(source.lastCollectedAt,null)};
 }
 function settle(){
  const at=now(),previous=read(),state=normalise(previous,at);
  if(state.batch?.phase==='washing'&&at>=state.batch.endsAt){state.batch={...state.batch,phase:'washed',washedAt:state.batch.endsAt,startedAt:null,endsAt:null};}
  else if(state.batch?.phase==='drying'&&at>=state.batch.endsAt){state.batch={...state.batch,phase:'dry',driedAt:state.batch.endsAt,startedAt:null,endsAt:null};}
  if(!state.batch&&at>=state.nextBatchAt){
   const periods=Math.floor((at-state.nextBatchAt)/LAUNDRY_PERIOD),scheduledAt=state.nextBatchAt+periods*LAUNDRY_PERIOD;
   const sequence=state.sequence+1,id=`laundry-${sequence}-${scheduledAt}`,count=2+Math.floor(randomUnit()*4),kinds=Object.keys(GARMENTS);
   const garments=Array.from({length:count},(_,i)=>({id:`${id}-item-${i}`,kind:kinds[Math.floor(randomUnit()*kinds.length)],color:LAUNDRY_COLORS[Math.floor(randomUnit()*LAUNDRY_COLORS.length)]}));
   state.sequence=sequence;state.nextBatchAt=scheduledAt+LAUNDRY_PERIOD;state.batch={id,garments,phase:'dirty',createdAt:at,scheduledAt,startedAt:null,endsAt:null,washedAt:null,driedAt:null};
  }
  if(JSON.stringify(previous)!==JSON.stringify(state))write(state);
  return state;
 }
 function snapshot(state=settle()){
  const at=now(),batch=state.batch?{...state.batch,garments:state.batch.garments.map(g=>({...g}))}:null,phase=batch?.phase||'empty';
  const running=['washing','drying'].includes(phase),duration=phase==='washing'?WASH_DURATION:DRY_DURATION,remainingMs=running?Math.max(0,batch.endsAt-at):0;
  return {...state,batch,phase,garments:batch?.garments||[],running,remainingMs,progress:running?Math.max(0,Math.min(1,1-remainingMs/duration)):['washed','dry'].includes(phase)?1:0,washerOccupied:!!batch&&['dirty','washing','washed'].includes(phase),dryerOccupied:!!batch&&['in-dryer','drying','dry'].includes(phase),canStartWash:phase==='dirty',canTransfer:phase==='washed',canStartDry:phase==='in-dryer',canCollect:phase==='dry',nextBatchInMs:Math.max(0,state.nextBatchAt-at),overdueBatchWaiting:!!batch&&at>=state.nextBatchAt,washDurationMs:WASH_DURATION,dryDurationMs:DRY_DURATION};
 }
 function act(action){
  const state=settle(),batch=state.batch,at=now(),expected={wash:'dirty',transfer:'washed',dry:'in-dryer',collect:'dry'}[action];
  if(!expected||!batch||batch.phase!==expected)return {ok:false,reason:'wrong-phase',state:snapshot(state)};
  if(action==='wash')state.batch={...batch,phase:'washing',startedAt:at,endsAt:at+WASH_DURATION};
  if(action==='transfer')state.batch={...batch,phase:'in-dryer',startedAt:null,endsAt:null};
  if(action==='dry')state.batch={...batch,phase:'drying',startedAt:at,endsAt:at+DRY_DURATION};
  if(action==='collect'){state.batch=null;state.collectedBatches++;state.totalGarments+=batch.garments.length;state.lastCollectedAt=at;}
  write(state);return {ok:true,action,garmentCount:batch.garments.length,state:snapshot()};
 }
 return {getStatus:()=>snapshot(),refresh:()=>snapshot(),startWash:()=>act('wash'),transferToDryer:()=>act('transfer'),startDry:()=>act('dry'),collect:()=>act('collect'),subscribe(fn){subscribers.add(fn);return ()=>subscribers.delete(fn);},dispose(){subscribers.clear();}};
}
