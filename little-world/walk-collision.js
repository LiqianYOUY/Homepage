// Walking uses a 0.18 m horizontal body radius at a 1.57 m eye height.
// This is interaction collision geometry, not building-code clearance validation.
export function createWalkCollision({THREE,model,house}){
  const radius=.18,bodyBottom=.12,bodyTop=1.73,cellSize=.75,epsilon=.00005;
  const floors=[],shapes=[],grid=new Map(),dynamicCache=new Map(),counts={},excluded={};
  const nameOf=o=>o.userData?.name||o.name||'';
  const dynamicRoots=()=>[...(house?.doors||[]),...(house?.chairs||[]),...(house?.colliderRoots||[]).map(object=>({object}))].filter(r=>!r.disabled&&r.object).map(r=>r.object);
  const dynamicMeshes=new Set();for(const root of dynamicRoots())root.traverse(o=>{if(o.isMesh)dynamicMeshes.add(o);});
  const decorative=/\b(rug|pillow|duvet|throw|vase|tray|ceramic bowl|place setting|art|abstract art|mirror|image surface|oak slat|monitor|display|keyboard|soundbar|speaker|sensor|faucet|tap|spout|controls?|handle|hinge|leaf \d|books?|bottle|rack wire|rack crossbar|suspension|canopy|bracket|mounting|wall plate|wall connection|glider)\b/i;
  const solidCategories=new Set(['wall','upperWall','glass','window','column','furniture','kitchenCabinet','applianceWine','applianceOven','door','serviceBacker','smart']);
  const structureCategories=new Set(['wall','upperWall','glass','window','column','door','serviceBacker']);
  function shapeOf(o){
    const geometry=o.geometry;if(!geometry.boundingBox)geometry.computeBoundingBox();
    const b=geometry.boundingBox;if(!b||b.isEmpty())return null;
    o.updateWorldMatrix(true,false);
    const e=o.matrixWorld.elements,center=b.getCenter(new THREE.Vector3()).applyMatrix4(o.matrixWorld);
    const sx=Math.hypot(e[0],e[2]),sz=Math.hypot(e[8],e[10]);
    if(sx<1e-8||sz<1e-8)return null;
    const worldBox=new THREE.Box3().setFromObject(o);
    const halfX=(b.max.x-b.min.x)*sx/2,halfZ=(b.max.z-b.min.z)*sz/2;
    return {object:o,name:nameOf(o),category:o.userData.category||'dynamic',x:center.x,z:center.z,ux:e[0]/sx,uz:e[2]/sx,vx:e[8]/sz,vz:e[10]/sz,halfX,halfZ,minY:worldBox.min.y,maxY:worldBox.max.y,minX:worldBox.min.x,maxX:worldBox.max.x,minZ:worldBox.min.z,maxZ:worldBox.max.z,circular:o.userData.category==='column'};
  }
  function addGrid(s){
    const a=Math.floor((s.minX-radius)/cellSize),b=Math.floor((s.maxX+radius)/cellSize),c=Math.floor((s.minZ-radius)/cellSize),d=Math.floor((s.maxZ+radius)/cellSize);
    for(let x=a;x<=b;x++)for(let z=c;z<=d;z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(s);}
  }
  model.updateWorldMatrix(true,true);
  model.traverse(o=>{
    if(!o.isMesh)return;
    const category=o.userData.category||'',name=nameOf(o);
    if(category==='floor'){
      const b=new THREE.Box3().setFromObject(o);
      if(b.max.y<.10&&b.max.y>-.05)floors.push({name,minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
      return;
    }
    if(dynamicMeshes.has(o))return;
    if(!solidCategories.has(category)){excluded[category]=(excluded[category]||0)+1;return;}
    if(!structureCategories.has(category)&&decorative.test(name)){excluded.decoration=(excluded.decoration||0)+1;return;}
    const shape=shapeOf(o);if(!shape||shape.maxY<bodyBottom||shape.minY>bodyTop)return;
    // Thin paintings/mounted electronics do not create freestanding obstacles.
    if(!structureCategories.has(category)&&shape.minY>.95&&Math.min(shape.halfX,shape.halfZ)<.035){excluded.wallDecoration=(excluded.wallDecoration||0)+1;return;}
    counts[category]=(counts[category]||0)+1;shapes.push(shape);addGrid(shape);
  });
  function pointOnFloor(x,z){return floors.some(f=>x>=f.minX-epsilon&&x<=f.maxX+epsilon&&z>=f.minZ-epsilon&&z<=f.maxZ+epsilon);}
  function supported(x,z){
    if(!pointOnFloor(x,z))return false;
    // Test against the union, rather than shrinking individual slabs: door seams stay open.
    for(let i=0;i<16;i++){const a=i*Math.PI/8;if(!pointOnFloor(x+Math.cos(a)*radius,z+Math.sin(a)*radius))return false;}
    return true;
  }
  function touches(s,x,z){
    if(s.maxY<bodyBottom||s.minY>bodyTop)return false;
    const dx=x-s.x,dz=z-s.z;
    if(s.circular)return dx*dx+dz*dz<(Math.max(s.halfX,s.halfZ)+radius)**2;
    const localX=dx*s.ux+dz*s.uz,localZ=dx*s.vx+dz*s.vz;
    const outsideX=Math.max(Math.abs(localX)-s.halfX,0),outsideZ=Math.max(Math.abs(localZ)-s.halfZ,0);
    return outsideX*outsideX+outsideZ*outsideZ<radius*radius;
  }
  function liveShapes(root){
    root.updateWorldMatrix(true,true);const m=root.matrixWorld.elements;let cached=dynamicCache.get(root);
    if(cached&&cached.matrix.every((v,i)=>v===m[i]))return cached.shapes;
    const current=[];root.traverse(o=>{if(o.isMesh){const s=shapeOf(o);if(s&&s.maxY>=bodyBottom&&s.minY<=bodyTop)current.push(s);}});
    cached={matrix:Array.from(m),shapes:current};dynamicCache.set(root,cached);return current;
  }
  function collision(position){
    const x=position?.x,z=position?.z;if(!Number.isFinite(x)||!Number.isFinite(z)||!supported(x,z))return true;
    const candidates=grid.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))||[];
    for(const s of candidates)if(touches(s,x,z))return true;
    for(const root of dynamicRoots())for(const s of liveShapes(root))if(touches(s,x,z))return true;
    return false;
  }
  const audit={radius_m:radius,eye_height_m:1.57,body_vertical_interval_m:[bodyBottom,bodyTop],floor_slabs:floors.length,static_shapes:shapes.length,static_categories:counts,excluded,method:'Actual GLB floor-slab union and circular-body versus oriented mesh bounds; circular structural columns; live door/chair transforms',floor_union:floors,dynamic_door_count:house?.doors?.length||0,dynamic_chair_count:house?.chairs?.length||0,notes:['Hidden walls and glazing remain solid for walking.','Floor seams are evaluated as a union, so adjacent room slabs do not create false gaps.','The original wintergarden divider remains closed glazing until its real panels are opened or moved.','Low carpets and mounted decoration are excluded; low coffee tables and other freestanding furniture remain solid.']};
  return {collision,audit};
}
