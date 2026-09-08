import {LAND} from './world-land.js';
import {HOME_LOCATION} from './daylight.js?v=14';
import {addTranslations,getLanguage,translate} from './i18n.js?v=14';
import {raiseDialog,consumeDialogEscape,isTopDialog} from './dialog-stack.js?v=22';

addTranslations({
 '世界地图 · 我们的距离':'World map · The distance between us','隔着世界，也像坐在一起':'A whole world, a little closer',
 '关闭世界地图':'Close world map','用我的当前位置':'Use my current location','选择你所在的城市':'Choose your city',
 '在地图上选一个位置':'Pick a place on the map','等待你放下一个坐标':'A place waiting for your pin',
 '选择城市或允许定位，看看你与悉尼的小屋相隔多远。':'Choose a city or allow location access to see how far you are from our home in Sydney.',
 '位置只用于这次计算，不会上传或保存。':'Your location is used for this calculation only. It is never uploaded or saved.',
 '屋主的位置是悉尼市中心；这里显示地球表面的最短距离，不是驾车或飞行里程。':'The host’s pin is central Sydney. This is the shortest distance over the Earth, not a driving or flight itinerary.',
 '正在寻找你的位置…':'Finding your location…','暂时无法定位，可以选择城市或在地图上选点。':'Location is unavailable. Choose a city or pick a place on the map.',
 '没有获得定位许可，可以选择城市或在地图上选点。':'Location permission was not granted. Choose a city or pick a place on the map.',
 '轻点地图，放下你的坐标。':'Tap the map to place your pin.','你在地图上选择的位置':'Your place on the map',
 '你的当前位置':'Your current location','基于城市中心的估算':'Estimate between city centres','根据你选择的地图位置':'Based on the point you chose',
 '清除我的位置':'Clear my location','悉尼的小屋':'Our home in Sydney','约':'About','公里':'km','你':'You',
 '世界陆地地图':'Map of the world’s land','正在浏览小屋的你':'You, visiting the little world'
});

export const MAP_CITIES=[
 ['悉尼','Sydney',-33.869,151.209],['墨尔本','Melbourne',-37.814,144.963],['布里斯班','Brisbane',-27.470,153.026],['珀斯','Perth',-31.953,115.861],['阿德莱德','Adelaide',-34.929,138.601],
 ['北京','Beijing',39.904,116.407],['上海','Shanghai',31.230,121.474],['广州','Guangzhou',23.129,113.264],['深圳','Shenzhen',22.543,114.058],['成都','Chengdu',30.572,104.066],['杭州','Hangzhou',30.274,120.155],['香港','Hong Kong',22.319,114.169],['台北','Taipei',25.033,121.565],
 ['新加坡','Singapore',1.352,103.820],['东京','Tokyo',35.676,139.650],['首尔','Seoul',37.566,126.978],['曼谷','Bangkok',13.756,100.502],['孟买','Mumbai',19.076,72.878],
 ['伦敦','London',51.507,-.128],['巴黎','Paris',48.857,2.352],['柏林','Berlin',52.520,13.405],['纽约','New York',40.713,-74.006],['洛杉矶','Los Angeles',34.052,-118.244],['多伦多','Toronto',43.653,-79.383],['温哥华','Vancouver',49.283,-123.121],['奥克兰','Auckland',-36.849,174.763],['开普敦','Cape Town',-33.925,18.424],['圣保罗','São Paulo',-23.551,-46.633]
];
const RAD=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function validPoint(p){return !!p&&Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;}
export function distanceKm(a,b){
 if(!validPoint(a)||!validPoint(b))return null;
 const p=a.latitude*RAD,q=b.latitude*RAD,dl=(b.longitude-a.longitude)*RAD,dp=q-p;
 const h=Math.sin(dp/2)**2+Math.cos(p)*Math.cos(q)*Math.sin(dl/2)**2;
 return 6371.0088*2*Math.asin(Math.sqrt(clamp(h,0,1)));
}
// Equal angular steps along the great circle; split across the map's date line.
export function routePoints(a,b,steps=100){
 if(!validPoint(a)||!validPoint(b))return [];
 const vec=p=>[Math.cos(p.latitude*RAD)*Math.cos(p.longitude*RAD),Math.sin(p.latitude*RAD),Math.cos(p.latitude*RAD)*Math.sin(p.longitude*RAD)];
 const u=vec(a),v=vec(b),omega=Math.acos(clamp(u.reduce((n,x,i)=>n+x*v[i],0),-1,1)),sin=Math.sin(omega),result=[];
 if(omega<1e-8)return [a,b];
 // The antipodal case has no unique shortest route. Choose one stable perpendicular.
 let normal=null;if(Math.abs(sin)<1e-7){normal=[-u[2],0,u[0]];const l=Math.hypot(...normal);normal=l>1e-8?normal.map(x=>x/l):[1,0,0];}
 for(let i=0;i<=steps;i++){const t=i/steps,xyz=normal?u.map((x,j)=>x*Math.cos(Math.PI*t)+normal[j]*Math.sin(Math.PI*t)):u.map((x,j)=>(Math.sin((1-t)*omega)*x+Math.sin(t*omega)*v[j])/sin);result.push({latitude:Math.atan2(xyz[1],Math.hypot(xyz[0],xyz[2]))/RAD,longitude:Math.atan2(xyz[2],xyz[0])/RAD});}
 return result;
}
function drawMap(canvas,{friend=null,poster=false}={}){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height,pad=w*.05,top=poster?h*.17:h*.07,mapW=w-2*pad,mapH=poster?h*.65:h*.82;
 const xy=(lon,lat)=>[pad+(lon+180)/360*mapW,top+(90-lat)/180*mapH];
 ctx.fillStyle='#f4efe3';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e5ecdf';ctx.fillRect(pad,top,mapW,mapH);
 ctx.strokeStyle='#d0dacb';ctx.lineWidth=w*.0007;
 for(let lon=-150;lon<180;lon+=30){ctx.beginPath();ctx.moveTo(...xy(lon,90));ctx.lineTo(...xy(lon,-90));ctx.stroke();}
 for(let lat=-60;lat<=60;lat+=30){ctx.beginPath();ctx.moveTo(...xy(-180,lat));ctx.lineTo(...xy(180,lat));ctx.stroke();}
 ctx.fillStyle='#a7b997';ctx.strokeStyle='#829777';ctx.lineWidth=w*.0007;
 for(const ring of LAND){ctx.beginPath();ring.forEach(([lon,lat],i)=>{const p=xy(lon,lat);i?ctx.lineTo(...p):ctx.moveTo(...p);});ctx.closePath();ctx.fill();ctx.stroke();}
 if(friend){ctx.beginPath();ctx.strokeStyle='#b87854';ctx.lineWidth=w*.0028;ctx.setLineDash([w*.006,w*.005]);let last=null;for(const p of routePoints(HOME_LOCATION,friend)){const [x,y]=xy(p.longitude,p.latitude);if(!last||Math.abs(x-last[0])>mapW/2)ctx.moveTo(x,y);else ctx.lineTo(x,y);last=[x,y];}ctx.stroke();ctx.setLineDash([]);}
 function pin(p,color,label){const [x,y]=xy(p.longitude,p.latitude);ctx.fillStyle='#fff9ed';ctx.beginPath();ctx.arc(x,y,w*.010,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,w*.0055,0,Math.PI*2);ctx.fill();ctx.font=`600 ${w*.016}px sans-serif`;ctx.textAlign=x>w*.78?'right':'left';ctx.fillStyle='#3f503d';ctx.fillText(label,x+(x>w*.78?-1:1)*w*.014,clamp(y-w*.015,top+w*.02,top+mapH));}
 pin(HOME_LOCATION,'#617d52','SYDNEY');if(friend)pin(friend,'#b87854',getLanguage()==='en'?'YOU':'你');
 if(poster){ctx.textAlign='left';ctx.fillStyle='#506746';ctx.font=`500 ${w*.031}px sans-serif`;ctx.fillText('YOU’S HOME · TOGETHER',pad,h*.10);ctx.font=`400 ${w*.015}px sans-serif`;ctx.fillText('Somewhere on this planet, you are here.',pad,h*.90);}
 return {pad,top,mapW,mapH};
}

export function setupFriendMap({THREE,model,register=()=>{}}){
 const root=new THREE.Group();root.name='Children framed world map';root.position.set(10.25,1.68,1.826);root.rotation.y=Math.PI;model.add(root);
 const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=880;drawMap(canvas,{poster:true});
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const wood=new THREE.MeshStandardMaterial({color:'#bca07b',roughness:.72}),paper=new THREE.MeshBasicMaterial({map:texture});
 const geometries=[],materials=[wood,paper];
 const add=(name,w,h,d,x,y,z,material)=>{const g=new THREE.PlaneGeometry(w,h);geometries.push(g);const m=new THREE.Mesh(g,material);m.name=name;m.position.set(x,y,z);m.userData={name,category:'decor',noMerge:true,interactionId:'friend-world-map'};root.add(m);return m;};
 // Single-sided wall art stays out of the way when the south wall is cut away.
 const width=1.46,height=.93;
 add('World map framed back',width,height,.022,0,0,0,wood);
 add('World map printed canvas',width-.05,height-.05,.002,0,0,.012,paper);
 for(const side of [-1,1]){add('World map oak vertical frame',.022,height,.028,side*(width-.022)/2,0,.016,wood);add('World map oak horizontal frame',width-.044,.022,.028,0,side*(height-.022)/2,.016,wood);}
 const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./friend-map.css?v=21',import.meta.url).href;document.head.append(link);
 let panel=null,mapCanvas=null,friend=null,mode='',status='',selectedCity=null,picking=false,request=0,returnFocus=null,disposed=false;
 const record={id:'friend-world-map',label:'世界地图 · 我们的距离',kind:'map',object:root,anchor:new THREE.Vector3(10.25,1.68,1.76),hotspot:true,click:open};register(record);
 function text(selector,value){panel.querySelector(selector).textContent=value;}
 function statusText(key){status=key;text('.friend-map-status',key?translate(key):'');}
 function render(){
   if(!panel)return;drawMap(mapCanvas,{friend});const en=getLanguage()==='en';
   for(const o of panel.querySelectorAll('[data-copy]'))o.textContent=translate(o.dataset.copy);
   panel.querySelector('.friend-map-close').setAttribute('aria-label',translate('关闭世界地图'));
   mapCanvas.setAttribute('aria-label',translate('世界陆地地图'));
   statusText(status);
   const citySelect=panel.querySelector('#friend-map-city');const value=citySelect.value;citySelect.replaceChildren();
   const blank=document.createElement('option');blank.value='';blank.textContent=translate('选择你所在的城市');citySelect.append(blank);
   MAP_CITIES.forEach((c,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=c[en?1:0];citySelect.append(o);});citySelect.value=value;
   const distance=friend?distanceKm(HOME_LOCATION,friend):null;
   text('.friend-map-distance',distance===null?translate('等待你放下一个坐标'):`${translate('约')} ${new Intl.NumberFormat(en?'en':'zh').format(Math.round(distance))} ${translate('公里')}`);
   text('.friend-map-person',selectedCity!==null?MAP_CITIES[selectedCity][en?1:0]:translate(mode==='gps'?'你的当前位置':mode==='point'?'你在地图上选择的位置':'正在浏览小屋的你'));
   panel.querySelector('.friend-map-clear').hidden=!friend;panel.querySelector('.friend-map-pick').setAttribute('aria-pressed',String(picking));
 }
 function choose(point,type,city=null){request++;friend=validPoint(point)?point:null;mode=type;selectedCity=city;picking=false;panel.querySelector('.friend-map-locate').disabled=false;render();statusText(type==='city'?'基于城市中心的估算':type==='point'?'根据你选择的地图位置':'位置只用于这次计算，不会上传或保存。');}
 function locate(){
   const token=++request;picking=false;render();const button=panel.querySelector('.friend-map-locate');button.disabled=true;statusText('正在寻找你的位置…');
   const fail=error=>{if(token!==request||panel.hidden||disposed)return;button.disabled=false;statusText(error?.code===1?'没有获得定位许可，可以选择城市或在地图上选点。':'暂时无法定位，可以选择城市或在地图上选点。');};
   if(!globalThis.navigator?.geolocation){fail();return;}
   try{navigator.geolocation.getCurrentPosition(position=>{if(token!==request||panel.hidden||disposed)return;const p={latitude:position.coords.latitude,longitude:position.coords.longitude};if(!validPoint(p)){fail();return;}choose(p,'gps');},fail,{enableHighAccuracy:false,timeout:12000,maximumAge:0});}catch{fail();}
 }
 function close(){if(!panel)return;request++;panel.hidden=true;friend=null;mode='';status='';selectedCity=null;picking=false;panel.querySelector('#friend-map-city').value='';render();returnFocus?.focus?.();}
 function onKey(e){if(consumeDialogEscape(e,panel)){close();return;}if(e.key==='Tab'&&isTopDialog(panel)){const focusable=[...panel.querySelectorAll('button,select')].filter(o=>!o.hidden&&!o.disabled),first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 function open(){
   if(disposed)return;
   if(!panel){panel=document.createElement('section');panel.className='friend-map-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','friend-map-title');panel.setAttribute('data-i18n-skip','');
    panel.innerHTML=`<header><div><small>YOU’S HOME / DISTANCE</small><h2 id="friend-map-title" data-copy="隔着世界，也像坐在一起"></h2></div><button class="friend-map-close" aria-label="${translate('关闭世界地图')}">×</button></header><div class="friend-map-body"><p class="friend-map-intro" data-copy="选择城市或允许定位，看看你与悉尼的小屋相隔多远。"></p><canvas class="friend-map-canvas" width="1200" height="650" role="img" aria-label="${translate('世界陆地地图')}"></canvas><div class="friend-map-result"><span><i></i><span data-copy="悉尼的小屋"></span></span><strong class="friend-map-distance" aria-live="polite"></strong><span><i></i><span class="friend-map-person"></span></span></div><div class="friend-map-actions"><button class="friend-map-locate" data-copy="用我的当前位置"></button><label><span class="sr-only" data-copy="选择你所在的城市"></span><select id="friend-map-city"></select></label><button class="friend-map-pick" aria-pressed="false" data-copy="在地图上选一个位置"></button><button class="friend-map-clear" data-copy="清除我的位置"></button></div><p class="friend-map-status" role="status"></p><p class="friend-map-note" data-copy="屋主的位置是悉尼市中心；这里显示地球表面的最短距离，不是驾车或飞行里程。"></p><p class="friend-map-note" data-copy="位置只用于这次计算，不会上传或保存。"></p><small class="friend-map-credit">Made with Natural Earth · Public domain</small></div>`;
    document.body.append(panel);mapCanvas=panel.querySelector('canvas');panel.querySelector('.friend-map-close').onclick=close;panel.querySelector('.friend-map-locate').onclick=locate;
    panel.querySelector('#friend-map-city').onchange=e=>{if(e.target.value==='')return;const i=Number(e.target.value),city=MAP_CITIES[i];if(city)choose({latitude:city[2],longitude:city[3]},'city',i);};
    panel.querySelector('.friend-map-clear').onclick=()=>{panel.querySelector('#friend-map-city').value='';choose(null,'');};
    panel.querySelector('.friend-map-pick').onclick=()=>{request++;picking=!picking;panel.querySelector('.friend-map-locate').disabled=false;render();statusText(picking?'轻点地图，放下你的坐标。':'');};
    mapCanvas.onclick=e=>{if(!picking)return;const r=mapCanvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*mapCanvas.width,y=(e.clientY-r.top)/r.height*mapCanvas.height,area=drawMap(mapCanvas,{friend});if(x<area.pad||x>area.pad+area.mapW||y<area.top||y>area.top+area.mapH)return;panel.querySelector('#friend-map-city').value='';choose({longitude:(x-area.pad)/area.mapW*360-180,latitude:90-(y-area.top)/area.mapH*180},'point');};
    panel.addEventListener('keydown',onKey);
   }
   returnFocus=document.activeElement;panel.hidden=false;panel.querySelector('.friend-map-locate').disabled=false;render();raiseDialog(panel);panel.querySelector('.friend-map-close').focus();
 }
 window.addEventListener('little-world:languagechange',render);
 return {root,record,open,close,audit:{widthM:width,heightM:height,ownerCity:'Sydney',locationConsent:'Explicit button only',locationStorage:'None',distance:'Spherical great-circle km'},dispose(){disposed=true;record.disabled=true;request++;panel?.remove();root.removeFromParent();link.remove();texture.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());window.removeEventListener('little-world:languagechange',render);}};
}
