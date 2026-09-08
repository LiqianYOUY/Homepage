import {raiseDialog,consumeDialogEscape} from './dialog-stack.js?v=22';
import {connectYouTube} from './youtube-playback.js?v=20260908-tv4';
import {addTranslations} from './i18n.js?v=14';

const TV_COPY={
 "loading": [
  [
   "正在加载 YouTube 播放器…",
   "画面出现后，可以直接点播放。"
  ],
  [
   "Loading the YouTube player…",
   "When the player appears, tap its play button."
  ]
 ],
 "ready": [
  [
   "播放器已就绪",
   "点一下画面中的播放键即可观看。"
  ],
  [
   "The player is ready",
   "Tap the play button inside the video to watch."
  ]
 ],
 "playing": [
  [
   "正在播放",
   ""
  ],
  [
   "Playing",
   ""
  ]
 ],
 "buffering": [
  [
   "视频正在缓冲",
   "可以稍等一会儿，播放器控件仍然可以使用。"
  ],
  [
   "The video is buffering",
   "Give it a moment. The player controls are still available."
  ]
 ],
 "autoplay-blocked": [
  [
   "点一下播放",
   "浏览器需要你手动开始视频，画面中的播放键可以直接使用。"
  ],
  [
   "Tap to play",
   "Your browser needs a tap to start this video. Use the play button inside the picture."
  ]
 ],
 "slow": [
  [
   "加载时间有点长",
   "播放器仍在尝试连接。可以点画面的播放键，或重试。"
  ],
  [
   "This is taking a little longer",
   "The player is still connecting. Try its play button, or retry."
  ]
 ],
 "api-unavailable": [
  [
   "播放控制暂时未连接",
   "可以先点画面中的播放键。若 YouTube 页面也打不开，请在系统浏览器检查网络后再试。"
  ],
  [
   "Playback controls have not connected",
   "Try the play button inside the video. If YouTube will not open either, check the connection in your main browser and try again."
  ]
 ],
 "error": [
  [
   "这段视频暂时无法播放",
   "可以重试、去 YouTube 观看，或换一段小屋里的旅行影像。"
  ],
  [
   "This video cannot play right now",
   "Retry, watch it on YouTube, or choose a travel video hosted here."
  ]
 ],
 "error-2": [
  [
   "视频地址暂时不可用",
   "请换一个节目，或去 YouTube 打开这段视频。"
  ],
  [
   "This video address is unavailable",
   "Choose another programme or open this video on YouTube."
  ]
 ],
 "error-5": [
  [
   "浏览器暂时无法播放这段视频",
   "请在系统浏览器或 YouTube 打开，也可以选择 Uluru。"
  ],
  [
   "This browser cannot play the video right now",
   "Open it in your main browser or on YouTube, or choose Uluru."
  ]
 ],
 "error-100": [
  [
   "这段视频已下架或不再公开",
   "请换一个节目，或去 YouTube 查看原视频。"
  ],
  [
   "This video was removed or is no longer public",
   "Choose another programme or check the original on YouTube."
  ]
 ],
 "error-101": [
  [
   "这段视频需要在 YouTube 观看",
   "发布者限制了网页内播放，请点「去原平台观看」。"
  ],
  [
   "Watch this video on YouTube",
   "The publisher has restricted embedded playback. Select “Watch on the original platform”."
  ]
 ],
 "error-153": [
  [
   "当前浏览器没有提供播放所需的来源信息",
   "请在系统浏览器或 YouTube 打开这段视频。"
  ],
  [
   "This browser did not provide the required playback identity",
   "Open this video in your main browser or on YouTube."
  ]
 ]
};
export const TV_TRANSLATIONS=Object.fromEntries(Object.values(TV_COPY).flatMap(([zh,en])=>zh.map((text,i)=>[text,en[i]])));
TV_TRANSLATIONS["视频由 YouTube 提供；微信等浏览器可能需要点一下播放。原平台无法访问时，可看 Uluru 或播放自己的文件。"]="Videos are provided by YouTube; browsers such as WeChat may need a tap to play. If YouTube is unavailable, choose Uluru or play your own file.";
addTranslations(TV_TRANSLATIONS);
export function youtubeStatusCopy({state,code}={}){const key=state==='error'?'error-'+(Number(code)===150?101:code):state;return (TV_COPY[key]||TV_COPY.error)[0];}
const CHANNELS=[
 {key:'uluru',kind:'video',title:'Uluru · 日出与日落',caption:'小尤的旅行影像 · 乌鲁鲁的晨昏',source:'./media/uluru-sunrise-sunset.mp4',poster:'./assets/uluru-poster.jpg'},
 {key:'darling',kind:'youtube',id:'d-NUlz3FXpw',title:'达令港的烟花',caption:'Darling Harbour · 烟花影像',source:'https://www.youtube.com/watch?v=d-NUlz3FXpw'},
 {key:'harbour',kind:'youtube',id:'8Ff5rpgoWWM',title:'海港大桥 · 跨年烟花',caption:'City of Sydney · 2024 年跨年烟花官方完整版',source:'https://www.youtube.com/watch?v=8Ff5rpgoWWM'}
];
export function setupTelevision({THREE,scene,model,camera,register,go,toast}){
 const normalize=s=>s.replaceAll('_',' ').toLowerCase();let surface=null,body=null;
 model.traverse(o=>{if(!o.isMesh)return;if(normalize(o.name)==='tv image surface')surface=o;if(normalize(o.name)==='large television')body=o;});
 if(!surface)return {open(){toast('电视还在准备中，稍后再来看看。');},close(){},update(){},dispose(){}};
 const group=new THREE.Group();group.name='Interactive travel television';scene.add(group);group.attach(surface);if(body)group.attach(body);group.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(surface),z=bounds.min.z-.006;
 const corners=[new THREE.Vector3(bounds.max.x,bounds.max.y,z),new THREE.Vector3(bounds.min.x,bounds.max.y,z),new THREE.Vector3(bounds.min.x,bounds.min.y,z),new THREE.Vector3(bounds.max.x,bounds.min.y,z)];
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=526;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#263c40';ctx.fillRect(0,0,1024,526);ctx.fillStyle='#789296';ctx.fillRect(0,345,1024,181);ctx.strokeStyle='#b5c5ad';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(60,333);ctx.quadraticCurveTo(400,50,745,333);ctx.stroke();
 for(let i=0;i<11;i++){const x=85+i*57,y=176+Math.pow((x-410)/28,2);ctx.beginPath();ctx.moveTo(x,Math.min(333,y));ctx.lineTo(x,333);ctx.stroke();}
 ctx.fillStyle='#f1e9cb';ctx.font='600 64px sans-serif';ctx.fillText('窗外，有好风景。',130,430);ctx.font='26px sans-serif';ctx.fillStyle='#c2d0bd';ctx.fillText('乌鲁鲁的晨昏  ·  悉尼的烟花',130,480);
 const tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
 // The visible -Z GLB face has reversed U; preserve V and the video projection.
 tx.repeat.x=-1;tx.offset.x=1;surface.material=new THREE.MeshBasicMaterial({map:tx,color:0xffffff});
 let on=false,theatre=true,channel=0,panel=null,player=null,overlay=null,localURL=null,localName='',ytPlayback=null,playerSource=null,connection=null,ytResume=null;
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function button(text,fn,cls='world-button'){const b=make('button',cls,text);b.type='button';b.onclick=fn;return b;}
 function externalLink(text,url){const a=make('a','world-button',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function clearPlayer(){
  connection?.remove();connection=null;
  const previous=player;player=null;playerSource=null;
  ytPlayback?.destroy();ytPlayback=null;
  if(previous?.tagName==='VIDEO'){previous.pause();previous.removeAttribute('src');previous.load();}
  previous?.remove();if(localURL){URL.revokeObjectURL(localURL);localURL=null;}localName='';
 }
 function chooseChannel(index){ytResume=null;clearPlayer();channel=index;draw();}
 function connectionNotice(host){
  // The player stays exposed: a browser may require a direct tap on its controls.
  const notice=make('div','tv-online-status'),title=make('strong'),hint=make('p'),actions=make('div','world-actions');
  notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  actions.append(button('再试一次',()=>chooseChannel(channel)),externalLink('去原平台观看 ↗',CHANNELS[channel].source),button('看看 Uluru 的日出日落',()=>chooseChannel(0)));
  notice.append(title,hint,actions);host.append(notice);connection=notice;
  return status=>{if(connection!==notice)return;const state=status.state;notice.dataset.state=state;notice.hidden=state==='playing';
   const [heading,detail]=youtubeStatusCopy(status);title.textContent=heading;hint.textContent=detail;
   actions.hidden=['loading','ready','autoplay-blocked','buffering','playing'].includes(state);
  };
 }
 function tryPlay(video){video.play().catch(()=>{if(player===video&&on&&video.isConnected)toast('点一下播放器里的播放键，就能看啦。');});}
 function nativePlayer(src,poster,title){
  const video=document.createElement('video');video.src=src;if(poster)video.poster=poster;
  video.controls=true;video.playsInline=true;video.setAttribute('playsinline','');video.loop=true;video.muted=true;video.preload='metadata';video.setAttribute('aria-label',title);
  video.addEventListener('error',()=>{
   if(player!==video||!on)return;connection?.remove();connection=make('div','tv-connection');connection.setAttribute('role','status');
   connection.append(make('strong','','这段画面还没打开'),make('span','',playerSource==='local'?'试试 MP4 格式的视频，再陪你看一会儿。':'请检查一下网络，也可以单独打开这段视频。'));
   if(playerSource!=='local')connection.append(externalLink('单独打开视频 ↗',src),button('再试一次',()=>chooseChannel(channel)));
   video.parentElement?.append(connection);
  });return video;
 }
 function mount(host,statusHost){
  if(player&&(playerSource===CHANNELS[channel].key||playerSource==='local')){
   const resume=player.tagName==='VIDEO'&&!player.paused;host.append(player);if(connection)host.append(connection);if(resume)tryPlay(player);return;
  }
  clearPlayer();const current=CHANNELS[channel];playerSource=current.key;
  if(current.kind==='video'){player=nativePlayer(current.source,current.poster,current.caption);host.append(player);tryPlay(player);return;}
  const restore=ytResume;ytResume=null;player=document.createElement('iframe');player.title=current.title+' · YouTube';player.src=`https://www.youtube.com/embed/${current.id}?autoplay=${restore?.paused?0:1}&mute=1&playsinline=1&rel=0&loop=1&playlist=${current.id}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  player.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';player.referrerPolicy='strict-origin-when-cross-origin';player.allowFullscreen=true;host.append(player);
  const iframe=player,notice=connectionNotice(statusHost);
  ytPlayback=connectYouTube({iframe,resume:restore,onStatus:status=>{if(player===iframe)notice(status);}});
 }
 function close(){on=false;ytResume=null;clearPlayer();panel?.remove();panel=null;overlay?.remove();overlay=null;}
 function open(){if(on){panel?.focus();return;}on=true;theatre=true;go('television');draw();}
 function draw(){
  // Native video keeps its element. An iframe loses its browsing context when
  // reparented, so restore its API playback state after rebuilding.
  if(player?.tagName==='IFRAME'){ytResume=ytPlayback?.getSnapshot()||ytResume;clearPlayer();}
  const resume=player?.tagName==='VIDEO'&&!player.paused;
  if(player)player.remove();connection?.remove();panel?.remove();overlay?.remove();overlay=null;
  const current=CHANNELS[channel],own=playerSource==='local';
  panel=make('section','home-dialog tv-window'+(theatre?'':' tv-remote'));panel.dataset.homeUi='';panel.style.zIndex=180;panel.tabIndex=-1;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','小屋放映室');panel.style.setProperty('--dialog-width',theatre?'850px':'440px');
  const header=make('header','dialog-header'),title=make('div');title.append(make('h2','','小屋放映室'),make('p','',own?'留一点时间，看一段自己的风景。':'坐一会儿，把旅途里的好风景带回家。'));
  const x=button('×',close,'dialog-close');x.setAttribute('aria-label','关闭电视');header.append(title,x);
  const body=make('div','dialog-body'),channels=make('div','tv-toolbar');channels.setAttribute('aria-label','选择电视节目');
  CHANNELS.forEach((c,i)=>{const b=button(c.title,()=>chooseChannel(i),'tv-channel'+(!own&&channel===i?' active':''));b.setAttribute('aria-pressed',String(!own&&channel===i));channels.append(b);});body.append(channels);
  const viewport=make('div','tv-player');viewport.dataset.provider=own?'video':current.kind;
  if(theatre){body.append(viewport);mount(viewport,body);}else{
   overlay=make('div','tv-overlay');overlay.hidden=true;document.body.append(overlay);mount(overlay,body);
   body.append(make('p','tv-status','画面已经放回客厅电视，靠近看看吧。'));
   panel.style.left='auto';panel.style.right='20px';panel.style.transform='none';panel.style.top='auto';panel.style.bottom='110px';
  }
  const actions=make('div','world-actions');actions.append(button(theatre?'放回电视屏幕':'放大观看',()=>{theatre=!theatre;draw();}),button('关电视',close));
  if(!own)actions.append(externalLink(current.kind==='video'?'单独打开视频 ↗':'原平台打开 ↗',current.source));
  const caption=own?`正在播放：${localName}。文件只在你的浏览器临时播放，不会上传。`:current.caption;
  const credit=make('p','tv-credit');credit.append(make('span','',caption));
  if(!own)credit.append(document.createTextNode(' · '),make('span','',current.kind==='video'?'这段视频放在小屋里，不用连接外部视频平台。':'视频由 YouTube 提供；微信等浏览器可能需要点一下播放。原平台无法访问时，可看 Uluru 或播放自己的文件。'));
  credit.append(document.createTextNode(' '),make('span','','开始时静音，可以在播放器里打开声音。'));body.append(actions,credit);
  const local=document.createElement('input');local.type='file';local.accept='video/*';local.hidden=true;
  local.onchange=()=>{
   const f=local.files?.[0];if(!f)return;if(!f.type.startsWith('video/')&&!/\.(mp4|webm|mov|m4v)$/i.test(f.name)){toast('请选择一个视频文件。');return;}
   clearPlayer();playerSource='local';localName=f.name;localURL=URL.createObjectURL(f);player=nativePlayer(localURL,null,'自己选的旅行片段');draw();tryPlay(player);
  };
  body.append(button('播放自己的视频文件',()=>local.click()),local);panel.append(header,body);document.body.append(panel);raiseDialog(panel);panel.addEventListener('pointerdown',()=>raiseDialog(panel));panel.addEventListener('focusin',()=>raiseDialog(panel));panel.focus();
  if(resume&&player?.tagName==='VIDEO')tryPlay(player);
 }
 // Exact projective mapping of the rectangular screen to the perspective camera.
 function homography(points){const A=[],b=[];[[0,0],[640,0],[640,360],[0,360]].forEach(([u,v],i)=>{const{x,y}=points[i];A.push([u,v,1,0,0,0,-x*u,-x*v]);b.push(x);A.push([0,0,0,u,v,1,-y*u,-y*v]);b.push(y);});for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(A[r][c])>Math.abs(A[p][c]))p=r;if(Math.abs(A[p][c])<1e-10)return null;[A[p],A[c]]=[A[c],A[p]];[b[p],b[c]]=[b[c],b[p]];const q=A[c][c];for(let j=c;j<8;j++)A[c][j]/=q;b[c]/=q;for(let r=0;r<8;r++){if(r===c)continue;const n=A[r][c];for(let j=c;j<8;j++)A[r][j]-=n*A[c][j];b[r]-=n*b[c];}}return[b[0],b[3],0,b[6],b[1],b[4],0,b[7],0,0,1,0,b[2],b[5],0,1];}
 const centre=bounds.getCenter(new THREE.Vector3()),ray=new THREE.Raycaster();let frame=0;
 function update(){if(!on||theatre||!overlay)return;const projected=corners.map(p=>p.clone().project(camera));let visible=camera.position.z<z-.08&&projected.every(p=>p.z>-1&&p.z<1);const pixels=projected.map(v=>({x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight}));if(Math.hypot(pixels[0].x-pixels[1].x,pixels[0].y-pixels[1].y)<100)visible=false;
  if(visible&&frame++%8===0){const dir=centre.clone().sub(camera.position);ray.set(camera.position,dir.clone().normalize());ray.far=dir.length()-.015;const hit=ray.intersectObjects(scene.children,true).find(h=>{if(h.object===surface||h.object===body)return false;let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return !h.object.material?.transparent&&h.object.userData.category!=='rug';});overlay.dataset.occluded=String(!!hit);}
  visible=visible&&overlay.dataset.occluded!=='true';const matrix=visible?homography(pixels):null;overlay.hidden=!matrix;if(matrix)overlay.style.transform='matrix3d('+matrix.join(',')+')';
 }
 const esc=e=>{if(on&&consumeDialogEscape(e,panel))close();};document.addEventListener('keydown',esc,true);register({id:'television',label:'电视 · 看看风景',kind:'tv',object:group,anchor:centre.clone().add(new THREE.Vector3(0,.65,-.08)),click:open});
 return {open,close,update,getStatus:()=>({on,theatre,channel:CHANNELS[channel]}),dispose(){close();document.removeEventListener('keydown',esc,true);tx.dispose();}};
}
