export function setupStudio({THREE,scene,model,register,openNotes,openLibrary,openMusic,openPortfolio,getState,setState,toast,turnLightsOn}){
 const normalize=s=>s.replaceAll('_',' ').toLowerCase();const all=[];model.traverse(o=>{if(o.isMesh)all.push(o)});
 const find=s=>all.find(o=>normalize(o.name)===s.toLowerCase());const starts=s=>all.filter(o=>normalize(o.name).startsWith(s.toLowerCase()));
 function mat(color,roughness=.65){return new THREE.MeshStandardMaterial({color,roughness});}
 const oak=mat('#b59a71'),cream=mat('#f5efd9'),bronze=mat('#4b4a3d',.4),sage=mat('#819472');
 function box(parent,name,size,position,material){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),material);o.name=name;o.position.set(...position);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function canvasTexture(draw,w=1024,h=640){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return {canvas:c,texture:t};}
 function labelPlane(parent,name,w,h,position,texture,rot=Math.PI/2){const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);o.name=name;o.position.set(...position);o.rotation.y=rot;parent.add(o);return o;}
 const notes=canvasTexture((c,w,h)=>{c.fillStyle='#e7ecdf';c.fillRect(0,0,w,h)});
 const workstation=new THREE.Group();scene.add(workstation);workstation.name='Interactive study workstation';
 for(const o of all.filter(o=>/^study (desk|monitor|display|keyboard)/.test(normalize(o.name))))workstation.attach(o);
 const oldDisplay=find('Study display');if(oldDisplay)oldDisplay.visible=false;
 const screen=labelPlane(workstation,'Live sticky note screen',.59,.34,[1.227,1.10,-3.334868],notes.texture);
 register({id:'desk-notes',label:'电脑 · 便利贴',kind:'desk',object:workstation,anchor:new THREE.Vector3(1.55,1.55,-3.33),click:openNotes});
 function updateNotes(items=getState().notes){const c=notes.canvas.getContext('2d'),w=notes.canvas.width,h=notes.canvas.height;c.fillStyle='#e8ecdf';c.fillRect(0,0,w,h);c.fillStyle='#556b47';c.font='500 38px sans-serif';c.fillText('A few little ideas',48,65);c.fillStyle='#92a085';c.font='22px sans-serif';c.fillText('观察  /  尝试  /  复盘',48,107);(items||[]).slice(0,3).forEach((n,i)=>{const x=45+i*315,y=150+(i%2)*16;c.fillStyle=['#eee2ad','#cdddbb','#e4cabc'][i];c.fillRect(x,y,280,365);c.fillStyle='#59604a';c.font='26px sans-serif';let line=0;for(const s of String(n.text||'写下一个想法').split('\n')){for(let j=0;j<s.length;j+=10){if(line>=9)break;c.fillText(s.slice(j,j+10),x+20,y+48+line++*32);}if(!s)line++;}});notes.texture.needsUpdate=true;}
 updateNotes();
 const bookRecords=[];let bookSignature='';
 const bookAt=i=>{const catalog=getState().papers||[];return catalog[i%Math.max(1,catalog.length)];};
 starts('Study books').forEach((o,i)=>{const b=new THREE.Box3().setFromObject(o),p=b.getCenter(new THREE.Vector3());const tx=canvasTexture(()=>{},128,512);const spine=labelPlane(model,'Book spine '+i,.041,b.max.y-b.min.y-.014,[b.max.x+.003,p.y,p.z],tx.texture);const g=new THREE.Group();scene.add(g);g.name='Readable book '+i;g.attach(o);g.attach(spine);const record={id:'book-'+i,label:'我的书架',kind:'book',object:g,anchor:p.clone().add(new THREE.Vector3(.24,.27,0)),hotspot:i===0,click:()=>openLibrary(bookAt(i)?.id)};register(record);bookRecords.push({i,tx,record});});
 function refreshBooks(){const signature=JSON.stringify((getState().papers||[]).map(p=>[p.id,p.title]));if(signature===bookSignature)return;bookSignature=signature;for(const {i,tx,record} of bookRecords){const title=bookAt(i)?.title||'我的书架';record.label=title;const c=tx.canvas.getContext('2d'),w=tx.canvas.width,h=tx.canvas.height;c.fillStyle=['#d9bf86','#91a480','#b58873','#7f9fa5'][i%4];c.fillRect(0,0,w,h);c.fillStyle='#fff9de';c.save();c.translate(w/2,h/2);c.rotate(-Math.PI/2);c.font='500 23px sans-serif';c.textAlign='center';c.fillText(title,0,6,430);c.restore();tx.texture.needsUpdate=true;}}
 refreshBooks();
 // A second, small display for the user's existing public portfolio.
 const portfolio=new THREE.Group();scene.add(portfolio);portfolio.name='Portfolio desktop display';
 box(portfolio,'Portfolio tablet frame',[.032,.275,.345],[1.40,1.014,-2.79],bronze);
 box(portfolio,'Portfolio tablet foot',[.17,.026,.22],[1.42,.806,-2.79],bronze);
 box(portfolio,'Portfolio tablet stem',[.025,.1,.03],[1.385,.865,-2.79],bronze);
 const portfolioTexture=canvasTexture((c,w,h)=>{c.fillStyle='#f2eedc';c.fillRect(0,0,w,h);c.fillStyle='#7a9065';c.beginPath();c.arc(w-145,125,80,0,Math.PI*2);c.fill();c.fillStyle='#35482f';c.font='600 78px sans-serif';c.fillText('Little Ideas',58,180);c.font='600 64px sans-serif';c.fillText('Prototype',58,275);c.fillText('Studio',58,355);c.font='27px sans-serif';c.fillStyle='#8b967b';c.fillText('Ideas made testable.',58,445);c.fillText('PORTFOLIO  ↗',58,560)},1024,800);
 labelPlane(portfolio,'Portfolio display screen',.317,.247,[1.418,1.014,-2.79],portfolioTexture.texture);
 register({id:'portfolio',label:'作品集 · Prototype Studio',kind:'portfolio',object:portfolio,anchor:new THREE.Vector3(1.58,1.35,-2.7),click:()=>openPortfolio()});
 // A small tangible reminder of the user's MoodBall work.
 const mood=new THREE.Group();scene.add(mood);mood.name='MoodBall studio companion';
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.125,.135,.035,40),oak);base.position.set(1.49,.803,-3.83);mood.add(base);
 const moodMat=new THREE.MeshStandardMaterial({color:'#a6c58c',roughness:.23,emissive:'#799c61',emissiveIntensity:.3});
 const orb=new THREE.Mesh(new THREE.SphereGeometry(.105,28,20),moodMat);orb.position.set(1.49,.923,-3.83);orb.castShadow=true;mood.add(orb);
 const palette=['#a8bd91','#b1c7d8','#d7b88d','#cba4a5'];let moodIndex=getState().settings.moodIndex||0;
 function setMood(){moodMat.color.set(palette[moodIndex%4]);moodMat.emissive.set(palette[moodIndex%4]);}setMood();
 register({id:'moodball',label:'MoodBall · 换个心情',kind:'maker',object:mood,anchor:new THREE.Vector3(1.7,1.25,-3.83),click:()=>{moodIndex=(moodIndex+1)%4;setMood();setState({settings:{moodIndex}});toast(['一盏安静的绿光。','留一点空间给蓝天。','暖一点，慢一点。','今天也可以温柔一点。'][moodIndex]);}});
 // A study lamp with a physical shade, stem and grounded base.
 const lamp=new THREE.Group();scene.add(lamp);lamp.name='Study reading lamp';
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.025,32),bronze);foot.position.set(1.40,.801,-2.58);lamp.add(foot);
 box(lamp,'Study lamp stem',[.018,.39,.018],[1.40,1.005,-2.58],bronze);
 const shade=new THREE.Mesh(new THREE.ConeGeometry(.115,.14,40,1,true),sage);shade.position.set(1.4,1.245,-2.58);lamp.add(shade);
 const lampLight=new THREE.PointLight('#ffddaa',getState().settings.deskLight&&getState().smart?.lightsOn!==false?3:0,2,.8);lampLight.position.set(1.43,1.18,-2.58);lamp.add(lampLight);
 register({id:'desk-lamp',label:'台灯 · 开关',kind:'light',object:lamp,anchor:new THREE.Vector3(1.65,1.49,-2.58),hotspot:false,click:()=>{const on=!(getState().settings.deskLight&&getState().smart?.lightsOn!==false);if(on)turnLightsOn?.();setState({settings:{deskLight:on}});lampLight.intensity=on?3:0;toast(on?'阅读灯亮了。':'台灯已关闭。');}});
 // The design board lives on the south study partition and faces the desk.
 const board=new THREE.Group();scene.add(board);board.name='Design inspiration board';
 box(board,'Oak inspiration board frame',[1.60,.89,.035],[2.65,1.48,-2.374],oak);
 const boardTex=canvasTexture((c,w,h)=>{c.fillStyle='#e3debf';c.fillRect(0,0,w,h);c.fillStyle='#65704f';c.font='32px sans-serif';c.fillText('QUESTIONS WORTH MAKING',35,54);const colors=['#f7edbb','#e0ead2','#e9d2be'];['观察 / OBSERVE','尝试 / MAKE','复盘 / REFLECT'].forEach((t,i)=>{c.fillStyle=colors[i];c.fillRect(35+i*318,100,286,330);c.fillStyle='#677250';c.font='28px sans-serif';c.fillText(t,53+i*318,154);c.font='22px sans-serif';['看见真实的日常','把想法做成原型','让体验更有温度'].slice(i,i+1).forEach(x=>c.fillText(x,53+i*318,207));});c.fillStyle='#849070';c.font='24px sans-serif';c.fillText('Human-centred. Curious. Playful.',35,500)},1024,560);
 labelPlane(board,'Inspiration board face',1.53,.82,[2.65,1.48,-2.397],boardTex.texture,Math.PI);
 register({id:'inspiration',label:'灵感板 · 整理想法',kind:'board',object:board,anchor:new THREE.Vector3(2.65,2.15,-2.50),click:openNotes});
 const speaker=find('Living smart speaker');if(speaker)register({id:'speaker',label:'小音响 · 我的CD',kind:'music',object:speaker,anchor:speaker.position.clone().add(new THREE.Vector3(0,.4,0)),click:openMusic});
 const soundbar=find('Soundbar');if(soundbar)register({id:'soundbar',label:'听一首 Flower Dance',kind:'music',object:soundbar,anchor:soundbar.position.clone().add(new THREE.Vector3(0,.3,0)),hotspot:false,click:openMusic});
 return {updateNotes,refreshBooks,update(dt,elapsed){if(!getState().settings.reducedMotion)moodMat.emissiveIntensity=.22+Math.sin(elapsed*1.5)*.07;},lampLight};
}
