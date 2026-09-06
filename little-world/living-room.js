// Runtime furniture refresh; source apartment.glb stays untouched.
// Run before house interactions and collision setup so every solid is discovered.
export function setupLivingRoom({THREE,model}) {
  const originals=[],geometries=new Set(),materials=new Set();
  const raw=o=>o.userData?.name||o.name||'';
  const old=[];model.traverse(o=>{if(o.isMesh)old.push(o);});
  const removedNames=[];
  for(const o of old)if(/^Lounge (?:west|east) [12] /.test(raw(o))||/^Coffee (?:table (?:large|small)(?: pedestal)?|tray|ceramic bowl)$/.test(raw(o))){
    originals.push({object:o,parent:o.parent});removedNames.push(raw(o));o.removeFromParent();
  }
  const root=new THREE.Group();root.name='Living room · games and music';model.add(root);
  const mat=(name,color,roughness=.65,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});m.name=name;materials.add(m);return m;};
  const oak=mat('Living natural honey oak',0xb99b71),edge=mat('Living warm oak edge',0x907452),cream=mat('Living glazed cream',0xf1eadb,.28),sage=mat('Living sage game box',0x667a65),gold=mat('Living brass detail',0xc8a56b,.3,.65),dark=mat('Living charcoal',0x252a28,.42),black=mat('Living piano black keys',0x101715,.27),white=mat('Living piano ivory keys',0xf8f5e9,.3),red=mat('Living terracotta cards',0xb56452),blue=mat('Living blue game accents',0x6a8998),snack=mat('Living golden crackers',0xd3a155,.85),popcorn=mat('Living popcorn cream',0xf3ddac,1);
  function group(name,parent=root){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  function mesh(parent,name,geometry,material,category='decor'){
    geometries.add(geometry);const o=new THREE.Mesh(geometry,material);o.name=name;o.userData={name,category};o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
  }
  function box(parent,name,w,h,d,material,position=[0,0,0],category='decor'){const o=mesh(parent,name,new THREE.BoxGeometry(w,h,d),material,category);o.position.set(...position);return o;}
  function cylinder(parent,name,r,h,material,position=[0,0,0],category='decor',top=r){const o=mesh(parent,name,new THREE.CylinderGeometry(top,r,h,16),material,category);o.position.set(...position);return o;}
  function sphere(parent,name,r,material,position){const o=mesh(parent,name,new THREE.SphereGeometry(r,12,8),material);o.position.set(...position);return o;}
  function rounded(parent,name,w,d,h,r,material,position,category='furniture'){
    const s=new THREE.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
    const geometry=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:5});geometry.rotateX(-Math.PI/2);
    const o=mesh(parent,name,geometry,material,category);o.position.set(position[0],position[1]-h/2,position[2]);return o;
  }

  // One substantial table replaces both former nesting tables and their props.
  const table=group('Living shared coffee table');table.position.set(-7.02,0,-1.88);
  rounded(table,'Living coffee table rounded solid oak top',1.72,1.18,.065,.17,oak,[0,.4325,0]);
  rounded(table,'Living coffee table inset apron',1.58,1.04,.075,.13,edge,[0,.365,0]);
  for(const x of [-.53,.53])rounded(table,'Living coffee table oak pedestal',.18,.73,.34,.055,oak,[x,.185,0]);
  const top=.465;

  const chess=group('Living chess board and pieces',table);chess.position.set(-.38,top,0);
  rounded(chess,'Living chess board oak frame',.49,.49,.02,.018,edge,[0,.01,0],'decor');
  for(let z=0;z<8;z++)for(let x=0;x<8;x++)box(chess,'Living chess board square',.0525,.003,.0525,(x+z)%2?sage:cream,[(x-3.5)*.0525,.0215,(z-3.5)*.0525]);
  function piece(x,z,m,kind='pawn'){
    const p=group('Living chess '+kind,chess);p.position.set(x,.023,z);
    cylinder(p,'Living chess piece foot',.016,.01,m,[0,.005,0]);
    cylinder(p,'Living chess piece tapered stem',.012,kind==='pawn'?.024:.037,m,[0,kind==='pawn'?.020:.0265,0],'decor',.0065);
    sphere(p,'Living chess piece crown',kind==='pawn'?.010:.012,m,[0,kind==='pawn'?.037:.051,0]);
    if(kind==='king'){box(p,'Living chess king cross stem',.005,.018,.005,m,[0,.068,0]);box(p,'Living chess king cross bar',.016,.005,.005,m,[0,.071,0]);}
    if(kind==='rook')cylinder(p,'Living chess rook battlement',.012,.011,m,[0,.056,0]);
  }
  for(const side of [-1,1])for(let i=0;i<6;i++)piece((i-2.5)*.0525,side*.13125,side<0?dark:cream);
  for(const [x,z,kind,m] of [[-.184,-.184,'rook',dark],[.026,-.184,'king',dark],[-.026,.184,'king',cream],[.184,.184,'rook',cream],[-.079,-.026,'pawn',dark],[.079,.026,'pawn',cream]])piece(x,z,m,kind);

  const games=group('Living tabletop games and cards',table);games.position.set(.30,top,.28);games.rotation.y=-.14;
  rounded(games,'Living board game box',.32,.22,.052,.012,sage,[0,.026,0],'decor');
  box(games,'Living board game lid border',.30,.004,.20,cream,[0,.054,0]);
  box(games,'Living board game lid panel',.276,.003,.177,sage,[0,.0575,0]);
  for(let i=0;i<3;i++){const tile=box(games,'Living board game lid tile',.039,.004,.039,[gold,cream,red][i],[(i-1)*.062,.061,0]);tile.rotation.y=Math.PI/4;}
  rounded(table,'Living playing card deck',.069,.101,.025,.007,cream,[.64,top+.0125,.30],'decor');
  box(table,'Living playing card deck back',.058,.002,.089,red,[.64,top+.026,.30]);
  for(let i=0;i<2;i++){
    const card=group('Living face-up playing card',table);card.position.set(.25+i*.097,top+.003,-.035-i*.015);card.rotation.y=.14-i*.28;
    rounded(card,'Living cream playing card',.073,.106,.003,.006,cream,[0,0,0],'decor');
    for(const z of [-.031,0,.031]){const pip=box(card,'Living playing card diamond',.011,.002,.011,i?dark:red,[0,.0025,z]);pip.rotation.y=Math.PI/4;}
  }
  for(const [x,z] of [[.51,.065],[.60,.025]]){
    rounded(table,'Living ivory game die',.04,.04,.04,.005,cream,[x,top+.02,z],'decor');
    for(const dx of [-.010,.010])for(const dz of [-.010,.010])cylinder(table,'Living game die dot',.003,.001,dark,[x+dx,top+.0405,z+dz]);
  }
  const bowlProfile=[[0,0],[.067,0],[.088,.012],[.126,.071],[.12,.078],[.109,.063],[.077,.016],[0,.016]].map(p=>new THREE.Vector2(...p));
  const bowl=mesh(table,'Living snack bowl',new THREE.LatheGeometry(bowlProfile,24),cream);bowl.position.set(.41,top,-.34);
  for(let i=0;i<15;i++){
    const angle=i*2.3999,r=.074*Math.sqrt((i+.5)/15),s=sphere(table,'Living bowl popcorn',.019,popcorn,[.41+Math.cos(angle)*r,top+.049+(i%3)*.01,-.34+Math.sin(angle)*r]);s.scale.set(1,.72,.86);
  }
  rounded(table,'Living snack serving plate',.24,.16,.014,.05,cream,[.04,top+.007,-.37],'decor');
  for(let i=0;i<5;i++){const cracker=cylinder(table,'Living round crackers',.031,.009,snack,[.04+(i-2)*.029,top+.023,-.37+(i%2)*.01]);cracker.rotation.z=(i-2)*.08;}

  // Face into the room from the glazing on the other side of the sofa.
  // This position clears both the sofa end and the load-bearing north column.
  const piano=group('Living window digital piano');piano.position.set(-9.02,0,-2.65);piano.rotation.y=Math.PI/2;
  box(piano,'Living digital piano cabinet',1.36,.105,.41,dark,[0,.693,-.015],'furniture');
  for(const x of [-.657,.657])box(piano,'Living digital piano oak cheek',.046,.127,.42,oak,[x,.704,-.015],'furniture');
  for(const x of [-.599,.599]){
    box(piano,'Living digital piano upright stand',.047,.645,.285,oak,[x,.3375,-.045],'furniture');
    rounded(piano,'Living digital piano floor foot',.088,.41,.032,.014,dark,[x,.016,-.015]);
  }
  box(piano,'Living digital piano rear brace',1.20,.095,.030,dark,[0,.30,-.16],'furniture');
  box(piano,'Living digital piano front fascia',1.254,.048,.018,dark,[0,.713,.199],'furniture');
  const keyWidth=1.216/52,whiteNotes=['A','B','C','D','E','F','G'];
  for(let i=0;i<52;i++){
    const x=(i-25.5)*keyWidth;box(piano,'Living digital piano white key '+(i+1),keyWidth-.001,.017,.169,white,[x,.754,.096]);
    if(i<51&&!['B','E'].includes(whiteNotes[i%7]))box(piano,'Living digital piano black key '+i,.0125,.026,.099,black,[x+keyWidth/2,.775,.06]);
  }
  box(piano,'Living digital piano control strip',1.253,.028,.083,dark,[0,.758,-.080]);
  box(piano,'Living digital piano status display',.084,.0015,.026,blue,[-.35,.773,-.084]);
  for(let i=0;i<4;i++)cylinder(piano,'Living digital piano selector',.008,.006,black,[-.23+i*.034,.774,-.084]);
  for(const x of [-.535,.535])for(let j=0;j<5;j++)box(piano,'Living digital piano speaker grille',.084,.001,.003,black,[x,.773,-.10+j*.01]);
  box(piano,'Living digital piano pedal base',.34,.046,.12,dark,[0,.045,.02],'furniture');
  for(const x of [-.075,0,.075])rounded(piano,'Living digital piano brass sustain pedal',.026,.105,.013,.012,gold,[x,.073,.075],'decor');
  const music=group('Living piano music rest',piano);music.position.set(0,.806,-.148);music.rotation.x=-.12;
  box(music,'Living digital piano music rest',.47,.25,.014,dark,[0,.125,0]);
  for(const side of [-1,1]){
    box(music,'Living open sheet music page',.185,.211,.004,cream,[side*.095,.13,.010]);
    for(let stave=0;stave<3;stave++)for(let line=0;line<5;line++)box(music,'Living sheet music staff',.15,.0009,.001,edge,[side*.095,.203-stave*.060-line*.004,.013]);
    for(let i=0;i<7;i++){const note=mesh(music,'Living sheet music note',new THREE.CircleGeometry(.003,8),dark);note.position.set(side*.095-.063+i*.020,.20-(i%3)*.06-(i%2)*.007,.0135);}
  }
  const bench=group('Living piano bench');bench.position.set(-8.35,0,-2.65);bench.rotation.y=Math.PI/2;
  rounded(bench,'Living piano bench upholstered seat',.62,.32,.075,.035,dark,[0,.4775,0]);
  for(const x of [-.245,.245])for(const z of [-.108,.108])box(bench,'Living piano bench oak leg',.041,.44,.041,oak,[x,.22,z],'furniture');
  box(bench,'Living piano bench oak apron',.535,.072,.25,oak,[0,.416,0],'furniture');

  model.updateWorldMatrix(true,true);
  const bounds=o=>{const b=new THREE.Box3().setFromObject(o);return {min:b.min.toArray(),max:b.max.toArray()};};
  const audit={removedMeshes:removedNames.length,removedLoungeChairs:4,removedCoffeeTables:2,retainedDiningChairMeshes:old.filter(o=>/^Dining (?:(?:west|east) \d+|north|south) (?:seat|back|leg)$/.test(raw(o))).length,coffeeTable:bounds(table),piano:bounds(piano),pianoBench:bounds(bench),whiteKeys:52,blackKeys:36,staticCollisionCategory:'furniture',propsCategory:'decor'};
  return {root,table,piano,bench,audit,dispose(){root.removeFromParent();for(const {object,parent} of originals)parent.add(object);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
