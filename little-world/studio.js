import {addTranslations,translate} from './i18n.js?v=13';
addTranslations({'升降桌 · 坐 / 站':'Standing desk · Sit / Stand','升降桌升高了，站起来舒展一下。':'The desk is raised. Stand and stretch a little.','升降桌回到坐姿高度。':'The desk is back at sitting height.','作品集':'prototype studio','点击查看项目':'Explore the projects','设计 · 交互 · 日常关怀':'Design · Interaction · Everyday care','我的书架':'My bookshelf','台灯 · 开关':'Desk lamp · On / Off','灵感板 · 整理想法':'Inspiration board · Gather ideas','小音响 · 我的CD':'Speaker · My CDs','阅读灯亮了。':'The reading lamp is on.','台灯已关闭。':'The desk lamp is off.','一盏安静的绿光。':'A quiet green glow.','留一点空间给蓝天。':'A little space for blue skies.','暖一点，慢一点。':'A little warmer. A little slower.','今天也可以温柔一点。':'There is room for gentleness today.','看见真实的日常':'Notice everyday life','把想法做成原型':'Make an idea tangible','让体验更有温度':'Bring warmth to an experience','写下一个想法':'Write down an idea','观察  /  尝试  /  复盘':'OBSERVE  /  MAKE  /  REFLECT'});
export function setupStudio({THREE,scene,model,register,openNotes,openLibrary,openMusic,openPortfolio,getState,setState,toast,turnLightsOn}){
 const normalize=s=>s.replaceAll('_',' ').toLowerCase();const all=[];model.traverse(o=>{if(o.isMesh)all.push(o)});
 const find=s=>all.find(o=>normalize(o.name)===s.toLowerCase());const starts=s=>all.filter(o=>normalize(o.name).startsWith(s.toLowerCase()));
 function mat(color,roughness=.65){return new THREE.MeshStandardMaterial({color,roughness});}
 const oak=mat('#b59a71'),cream=mat('#f5efd9'),bronze=mat('#4b4a3d',.4),sage=mat('#819472');
 function box(parent,name,size,position,material){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.name=name;o.position.set(...position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function canvasTexture(draw,w=1024,h=640){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {canvas:c,texture:t};}
 function labelPlane(parent,name,w,h,position,texture,rot=Math.PI/2){const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);o.name=name;o.position.set(...position);o.rotation.y=rot;parent.add(o);return o;}
 const workstation=new THREE.Group();scene.add(workstation);workstation.name='Interactive study workstation';
 // Keep the original workstation position, but replace its slab legs and dining chair.
 const removed=[];for(const o of all.filter(o=>/^study (desk|chair|keyboard)/.test(normalize(o.name)))){removed.push(o.name);o.removeFromParent();}
 for(const o of all.filter(o=>/^study (monitor|display)/.test(normalize(o.name))))workstation.attach(o);
 const graphite=mat('#344342',.37),aluminum=new THREE.MeshStandardMaterial({color:'#afbabc',metalness:.72,roughness:.3}),softBlack=mat('#303c39',.94),meshGray=mat('#73837c',.91);
 const led=new THREE.MeshStandardMaterial({color:'#adede0',emissive:'#7ccabd',emissiveIntensity:.45,roughness:.3});
 function solidBox(parent,name,size,position,material){const o=box(parent,name,size,position,material);o.userData={name,category:'furniture'};return o;}
 function rounded(parent,name,w,d,h,r,position,material){const s=new THREE.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:5});g.rotateX(-Math.PI/2);const o=new THREE.Mesh(g,material);o.name=name;o.userData={name,category:'furniture'};o.position.set(position[0],position[1]-h/2,position[2]);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function cylinder(parent,name,r,h,position,material){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),material);o.name=name;o.position.set(...position);o.userData={name,category:'furniture'};o.castShadow=true;parent.add(o);return o;}
 function beam(parent,name,from,to,r,material){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),o=cylinder(parent,name,r,a.distanceTo(b),a.clone().add(b).multiplyScalar(.5).toArray(),material);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return o;}
 const deskBase=new THREE.Group();deskBase.name='Study electric desk fixed feet';scene.add(deskBase);
 const middleColumns=new THREE.Group();middleColumns.name='Study desk telescopic middle columns';scene.add(middleColumns);
 rounded(workstation,'Study graphite sit stand desktop',.76,1.8,.05,.045,[1.42,.7675,-3.29],graphite);
 rounded(workstation,'Study desktop aluminum reveal',.742,1.782,.011,.038,[1.42,.739,-3.29],aluminum);
 solidBox(workstation,'Study desk cable tray',[.13,.064,1.36],[1.13,.68,-3.29],graphite);
 solidBox(workstation,'Study desk structural crossbeam',[.075,.07,1.43],[1.39,.685,-3.29],graphite);
 for(const z of [-3.96,-2.62]){
  rounded(deskBase,'Study electric desk T foot',.66,.12,.047,.034,[1.42,.042,z],graphite);
  for(const x of [1.14,1.70])cylinder(deskBase,'Study desk leveling foot',.034,.025,[x,.0125,z],softBlack);
  solidBox(deskBase,'Study electric desk outer column',[.105,.435,.115],[1.39,.2775,z],graphite);
  solidBox(middleColumns,'Study electric desk middle column',[.086,.40,.096],[1.39,.48,z],aluminum);
  solidBox(workstation,'Study electric desk inner column',[.066,.38,.076],[1.39,.54,z],aluminum);
  solidBox(workstation,'Study desktop support bracket',[.55,.038,.1],[1.42,.714,z],graphite);
 }
 const control=new THREE.Group();control.name='Study desk illuminated height control';workstation.add(control);
 box(control,'Study desk height keypad',[.036,.041,.175],[1.813,.72,-2.66],graphite);
 const heightTexture=canvasTexture(()=>{},256,96);
 labelPlane(control,'Study desk height display',.092,.024,[1.832,.723,-2.686],heightTexture.texture);
 box(control,'Study desk cyan status line',[.003,.005,.052],[1.833,.72,-2.616],led);
 const liftRecord={id:'desk-lift',label:'升降桌 · 坐 / 站',kind:'desk',object:control,anchor:new THREE.Vector3(1.92,1.08,-2.59),click:()=>{deskRaised=!deskRaised;setState({settings:{deskRaised}});toast(translate(deskRaised?'升降桌升高了，站起来舒展一下。':'升降桌回到坐姿高度。'));}};
 let deskRaised=!!getState().settings.deskRaised,lift=deskRaised ? .34 : 0,lastHeight='';
 const chair=new THREE.Group();chair.name='Study ergonomic mesh task chair';chair.position.set(2.10,0,-3.29);chair.rotation.y=-Math.PI/2;scene.add(chair);
 const seat=rounded(chair,'Study ergonomic contoured seat',.49,.48,.077,.1,[0,.482,0],softBlack);seat.rotation.x=-.035;
 cylinder(chair,'Study chair seat mechanism',.104,.075,[0,.393,0],graphite);cylinder(chair,'Study chair gas lift',.029,.27,[0,.247,0],aluminum);cylinder(chair,'Study chair gas lift sleeve',.05,.16,[0,.154,0],graphite);
 for(let i=0;i<5;i++){const angle=i*Math.PI*2/5,x=Math.sin(angle)*.305,z=Math.cos(angle)*.305;beam(chair,'Study chair five star spoke',[0,.14,0],[x,.077,z],.021,aluminum);const caster=cylinder(chair,'Study chair soft caster',.036,.058,[x,.042,z],graphite);caster.rotation.z=Math.PI/2;caster.rotation.y=-angle;}
 for(const side of [-1,1]){
  beam(chair,'Study chair adjustable arm upright',[side*.216,.415,.015],[side*.268,.66,.015],.019,graphite);
  rounded(chair,'Study chair adjustable arm pad',.065,.235,.034,.025,[side*.269,.684,.018],softBlack);
  beam(chair,'Study chair back shell side',[side*.215,.56,-.218],[side*.225,1.025,-.296],.022,graphite);
 }
 const back=new THREE.Group();back.name='Study chair breathable mesh back';back.position.set(0,.805,-.255);back.rotation.x=-.15;chair.add(back);
 solidBox(back,'Study ergonomic mesh back support',[.43,.405,.024],[0,0,0],meshGray);
 for(let i=0;i<15;i++)solidBox(back,'Study chair woven mesh vertical',[.0035,.394,.003],[i*.027-.189,0,.014],graphite);
 for(let i=0;i<15;i++)solidBox(back,'Study chair woven mesh horizontal',[.418,.0035,.003],[0,i*.026-.182,.015],graphite);
 const lumbar=solidBox(back,'Study chair adjustable lumbar pad',[.285,.085,.045],[0,-.09,.035],softBlack);lumbar.rotation.x=.08;
 beam(chair,'Study chair adjustable headrest stem',[0,.975,-.29],[0,1.105,-.315],.018,aluminum);
 const headrest=rounded(chair,'Study chair padded headrest',.285,.13,.07,.055,[0,1.115,-.29],softBlack);headrest.rotation.x=Math.PI/2-.15;
 // The main monitor is the single portfolio entrance; notes remain on the inspiration board and app shortcuts.
 const oldDisplay=find('Study display');if(oldDisplay)oldDisplay.removeFromParent();
 const portfolioTexture=canvasTexture(()=>{},1180,680);
 function drawPortfolio(){
  const c=portfolioTexture.canvas.getContext('2d'),w=portfolioTexture.canvas.width,h=portfolioTexture.canvas.height;
  c.fillStyle='#edf0e5';c.fillRect(0,0,w,h);c.fillStyle='#51654d';c.fillRect(0,0,w,12);
  c.fillStyle='#8b987e';c.font='500 22px sans-serif';c.fillText('DESIGN / MAKE / CARE',62,70);
  c.fillStyle='#354b38';c.font='600 76px sans-serif';c.fillText(translate('作品集'),58,166,1020);
  c.fillStyle='#839176';c.font='25px sans-serif';c.fillText(translate('设计 · 交互 · 日常关怀'),62,221,1010);
  const cards=[{name:'MoodBall',color:'#d4dfc6'},{name:'Smart Medication',color:'#e5dec9'},{name:'FoodCare',color:'#dae4dc'}];
  for(let i=0;i<cards.length;i++){
   const x=62+i*359,y=269;c.fillStyle=cards[i].color;c.fillRect(x,y,336,250);c.strokeStyle='#6b8061';c.lineWidth=3;c.lineCap='round';c.lineJoin='round';
   c.beginPath();if(i===0){c.arc(x+168,y+94,54,0,Math.PI*2);c.moveTo(x+114,y+94);c.ellipse(x+168,y+94,54,19,0,0,Math.PI*2);c.moveTo(x+146,y+94);c.ellipse(x+168,y+94,22,54,0,0,Math.PI*2);}else if(i===1){c.ellipse(x+168,y+77,64,18,0,0,Math.PI*2);c.moveTo(x+104,y+77);c.lineTo(x+104,y+115);c.ellipse(x+168,y+115,64,18,0,0,Math.PI);c.lineTo(x+232,y+77);c.moveTo(x+185,y+68);c.ellipse(x+168,y+68,17,5,0,0,Math.PI*2);}else{c.rect(x+103,y+52,62,97);c.moveTo(x+165,y+114);c.lineTo(x+235,y+114);c.lineTo(x+227,y+141);c.lineTo(x+174,y+141);c.moveTo(x+183,y+100);c.arc(x+192,y+100,10,0,Math.PI*2);c.moveTo(x+210,y+100);c.arc(x+219,y+100,10,0,Math.PI*2);}c.stroke();
   c.fillStyle='#5e7259';c.font='500 26px sans-serif';c.fillText(cards[i].name,x+25,y+207,289);
  }
  c.fillStyle='#566e4c';c.fillRect(62,555,1054,70);c.fillStyle='#f4f7ea';c.font='500 27px sans-serif';c.fillText(translate('点击查看项目'),86,600,900);c.font='36px sans-serif';c.fillText('↗',1052,602);
  portfolioTexture.texture.needsUpdate=true;
 }
 drawPortfolio();
 const screen=labelPlane(workstation,'Main monitor portfolio screen',.59,.34,[1.227,1.10,-3.334868],portfolioTexture.texture);
 // Keep the application-facing notes callback without letting note changes replace the portfolio screen.
 function updateNotes(){}
 const keyboard=new THREE.Group();keyboard.name='Study compact keyboard with individual keys';keyboard.position.set(1.633,.796,-3.334868);keyboard.rotation.y=Math.PI/2;workstation.add(keyboard);
 rounded(keyboard,'Study keyboard aluminum case',.418,.163,.015,.014,[0,.0075,0],aluminum);
 rounded(keyboard,'Study keyboard recessed dark keybed',.403,.150,.004,.009,[0,.017,0],graphite);
 const layouts=[
  [['Esc',1],...['1','2','3','4','5','6','7','8','9','0','−','='].map(k=>[k,1]),['⌫',2]],
  [['Tab',1.5],...['Q','W','E','R','T','Y','U','I','O','P','[',']'].map(k=>[k,1]),['\\',1.5]],
  [['Caps',1.75],...['A','S','D','F','G','H','J','K','L',';',"'"].map(k=>[k,1]),['Enter',2.25]],
  [['Shift',2.25],...['Z','X','C','V','B','N','M',',','.','/'].map(k=>[k,1]),['Shift',2.75]],
  [['Ctrl',1.25],['⌘',1.25],['Alt',1.25],['',6.25],['Alt',1.25],['Fn',1.25],['Menu',1.25],['Ctrl',1.25]],
 ];
 const keyLayout=[],pitch=.026,rowPitch=.029;
 layouts.forEach((row,rowIndex)=>{let offset=0;for(const [legend,units] of row){keyLayout.push({legend,units,x:(offset+units/2-7.5)*pitch,z:(rowIndex-2)*rowPitch,width:units*pitch-.003});offset+=units;}});
 const keycaps=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat('#e1e8d9',.62),keyLayout.length);keycaps.name='Study keyboard individual keycaps';keycaps.castShadow=true;keycaps.receiveShadow=true;keycaps.userData={name:keycaps.name,category:'decor',keyCount:keyLayout.length};
 const keyTransform=new THREE.Object3D();keyLayout.forEach((key,i)=>{keyTransform.position.set(key.x,.024,key.z);keyTransform.scale.set(key.width,.011,.024);keyTransform.updateMatrix();keycaps.setMatrixAt(i,keyTransform.matrix);keycaps.setColorAt(i,new THREE.Color(key.legend==='Esc'?'#99b9a3':key.units>1?'#bbcbb9':'#e4ecdf'));});keycaps.instanceMatrix.needsUpdate=true;keycaps.instanceColor.needsUpdate=true;keyboard.add(keycaps);
 const legends=canvasTexture((c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#42554b';c.textAlign='center';c.textBaseline='middle';for(const key of keyLayout){c.font=(key.legend.length>2?'23':'32')+'px sans-serif';c.fillText(key.legend,(key.x/.39+.5)*w,(key.z/.145+.5)*h,key.width/.39*w*.8);}},1536,640);
 const legendMaterial=new THREE.MeshBasicMaterial({map:legends.texture,transparent:true,depthWrite:false,toneMapped:false});const legendPlane=new THREE.Mesh(new THREE.PlaneGeometry(.39,.145),legendMaterial);legendPlane.name='Study keyboard key legends';legendPlane.rotation.x=-Math.PI/2;legendPlane.position.y=.0298;keyboard.add(legendPlane);
 const portfolioRecord={id:'portfolio',label:'作品集',kind:'portfolio',object:workstation,anchor:new THREE.Vector3(1.55,1.55,-3.33),click:()=>openPortfolio()};register(portfolioRecord);register(liftRecord);
 const bookRecords=[];let bookSignature='';
 const bookAt=i=>{const catalog=getState().papers||[];return catalog[i%Math.max(1,catalog.length)];};
 starts('Study books').forEach((o,i)=>{const b=new THREE.Box3().setFromObject(o),p=b.getCenter(new THREE.Vector3());const tx=canvasTexture(()=>{},128,512);const spine=labelPlane(model,'Book spine '+i,.041,b.max.y-b.min.y-.014,[b.max.x+.003,p.y,p.z],tx.texture);const g=new THREE.Group();scene.add(g);g.name='Readable book '+i;g.attach(o);g.attach(spine);const record={id:'book-'+i,label:'我的书架',kind:'book',object:g,anchor:p.clone().add(new THREE.Vector3(.24,.27,0)),hotspot:i===0,click:()=>openLibrary(bookAt(i)?.id)};register(record);bookRecords.push({i,tx,record});});
 function refreshBooks(){const signature=JSON.stringify((getState().papers||[]).map(p=>[p.id,p.title]));if(signature===bookSignature)return;bookSignature=signature;for(const {i,tx,record} of bookRecords){const title=bookAt(i)?.title||translate('我的书架');record.label=bookAt(i)?.title||'我的书架';const c=tx.canvas.getContext('2d'),w=tx.canvas.width,h=tx.canvas.height;c.fillStyle=['#d9bf86','#91a480','#b58873','#7f9fa5'][i%4];c.fillRect(0,0,w,h);c.fillStyle='#fff9de';c.save();c.translate(w/2,h/2);c.rotate(-Math.PI/2);c.font='500 23px sans-serif';c.textAlign='center';c.fillText(title,0,6,430);c.restore();tx.texture.needsUpdate=true;}}
 refreshBooks();
 // A small tangible reminder of the user's MoodBall work.
 const mood=new THREE.Group();scene.add(mood);mood.name='MoodBall studio companion';
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.125,.135,.035,40),oak);base.position.set(1.49,.803,-3.83);mood.add(base);
 const moodMat=new THREE.MeshStandardMaterial({color:'#a6c58c',roughness:.23,emissive:'#799c61',emissiveIntensity:.3});
 const orb=new THREE.Mesh(new THREE.SphereGeometry(.105,28,20),moodMat);orb.position.set(1.49,.923,-3.83);orb.castShadow=true;mood.add(orb);
 const palette=['#a8bd91','#b1c7d8','#d7b88d','#cba4a5'];let moodIndex=getState().settings.moodIndex||0;
 function setMood(){moodMat.color.set(palette[moodIndex%4]);moodMat.emissive.set(palette[moodIndex%4]);}setMood();
 const moodRecord={id:'moodball',label:'MoodBall · 换个心情',kind:'maker',object:mood,anchor:new THREE.Vector3(1.7,1.25,-3.83),click:()=>{moodIndex=(moodIndex+1)%4;setMood();setState({settings:{moodIndex}});toast(translate(['一盏安静的绿光。','留一点空间给蓝天。','暖一点，慢一点。','今天也可以温柔一点。'][moodIndex]));}};register(moodRecord);
 // A study lamp with a physical shade, stem and grounded base.
 const lamp=new THREE.Group();scene.add(lamp);lamp.name='Study reading lamp';
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.025,32),bronze);foot.position.set(1.40,.801,-2.58);lamp.add(foot);
 box(lamp,'Study lamp stem',[.018,.39,.018],[1.40,1.005,-2.58],bronze);
 const shade=new THREE.Mesh(new THREE.ConeGeometry(.115,.14,40,1,true),sage);shade.position.set(1.4,1.245,-2.58);lamp.add(shade);
 const lampLight=new THREE.PointLight('#ffddaa',getState().settings.deskLight&&getState().smart?.lightsOn!==false?3:0,2,.8);lampLight.position.set(1.43,1.18,-2.58);lamp.add(lampLight);
 const lampRecord={id:'desk-lamp',label:'台灯 · 开关',kind:'light',object:lamp,anchor:new THREE.Vector3(1.65,1.49,-2.58),hotspot:false,click:()=>{const on=!(getState().settings.deskLight&&getState().smart?.lightsOn!==false);if(on)turnLightsOn?.();setState({settings:{deskLight:on}});lampLight.intensity=on?3:0;toast(translate(on?'阅读灯亮了。':'台灯已关闭。'));}};register(lampRecord);
 // The design board lives on the south study partition and faces the desk.
 const board=new THREE.Group();scene.add(board);board.name='Design inspiration board';
 box(board,'Oak inspiration board frame',[1.60,.89,.035],[2.65,1.48,-2.374],oak);
 const drawBoard=(c,w,h)=>{c.fillStyle='#e3debf';c.fillRect(0,0,w,h);c.fillStyle='#65704f';c.font='32px sans-serif';c.fillText('QUESTIONS WORTH MAKING',35,54);const colors=['#f7edbb','#e0ead2','#e9d2be'];['观察 / OBSERVE','尝试 / MAKE','复盘 / REFLECT'].forEach((t,i)=>{c.fillStyle=colors[i];c.fillRect(35+i*318,100,286,330);c.fillStyle='#677250';c.font='28px sans-serif';c.fillText(t,53+i*318,154);c.font='22px sans-serif';['看见真实的日常','把想法做成原型','让体验更有温度'].slice(i,i+1).forEach(x=>c.fillText(translate(x),53+i*318,207,270));});c.fillStyle='#849070';c.font='24px sans-serif';c.fillText('Human-centred. Curious. Playful.',35,500)};const boardTex=canvasTexture(drawBoard,1024,560);
 labelPlane(board,'Inspiration board face',1.53,.82,[2.65,1.48,-2.397],boardTex.texture,Math.PI);
 register({id:'inspiration',label:'灵感板 · 整理想法',kind:'board',object:board,anchor:new THREE.Vector3(2.65,2.15,-2.50),click:openNotes});
 const speaker=find('Living smart speaker');if(speaker)register({id:'speaker',label:'小音响 · 我的CD',kind:'music',object:speaker,anchor:speaker.position.clone().add(new THREE.Vector3(0,.4,0)),click:openMusic});
 const soundbar=find('Soundbar');if(soundbar)register({id:'soundbar',label:'听一首 Flower Dance',kind:'music',object:soundbar,anchor:soundbar.position.clone().add(new THREE.Vector3(0,.3,0)),hotspot:false,click:openMusic});
 // All desktop belongings keep their existing click targets and travel together.
 for(const object of [mood,lamp])workstation.attach(object);
 const liftedRecords=[portfolioRecord,moodRecord,lampRecord,liftRecord].map(record=>({record,y:record.anchor.y}));
 function setDeskHeight(){
  workstation.position.y=lift;middleColumns.position.y=lift*.5;
  for(const {record,y} of liftedRecords)record.anchor.y=y+lift;
  const height=String(Math.round((.7925+lift)*100));if(height!==lastHeight){lastHeight=height;const c=heightTexture.canvas.getContext('2d');c.fillStyle='#152c28';c.fillRect(0,0,256,96);c.fillStyle='#bcf4df';c.textAlign='center';c.font='500 65px monospace';c.fillText(height+' cm',128,70);heightTexture.texture.needsUpdate=true;}
 }
 setDeskHeight();
 function refreshLanguage(){portfolioRecord.label='作品集';liftRecord.label='升降桌 · 坐 / 站';lampRecord.label='台灯 · 开关';bookSignature='';refreshBooks();drawPortfolio();drawBoard(boardTex.canvas.getContext('2d'),boardTex.canvas.width,boardTex.canvas.height);boardTex.texture.needsUpdate=true;}
 window.addEventListener('little-world:languagechange',refreshLanguage);
 const audit={desk:'Electric three-stage sit/stand desk',seatedSurfaceHeight:.7925,standingSurfaceHeight:1.1325,chair:'Ergonomic mesh chair with lumbar support, headrest, adjustable arms and five casters',removedMeshes:removed,movingDesktopObjects:['main portfolio monitor','61-key keyboard','MoodBall','desk lamp'],portfolioMonitorCount:1,portfolioEntry:'Main monitor',removedSecondaryDisplay:true,keyboardKeys:keyLayout.length,notesEntry:'Inspiration board and existing app shortcuts'};
 return {updateNotes,refreshBooks,refreshLanguage,colliderRoots:[deskBase,middleColumns,workstation,chair],audit,workstation,chair,screen,keyboard,portfolioTexture,update(dt,elapsed){const target=getState().settings.deskRaised ? .34 : 0;deskRaised=target>0;const next=getState().settings.reducedMotion?target:THREE.MathUtils.damp(lift,target,5,dt);if(Math.abs(next-lift)>.00001){lift=Math.abs(next-target)<.0001?target:next;setDeskHeight();}if(!getState().settings.reducedMotion)moodMat.emissiveIntensity=.22+Math.sin(elapsed*1.5)*.07;},lampLight};
}
