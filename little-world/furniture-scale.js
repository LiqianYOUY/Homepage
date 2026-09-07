/** Corrections to original source meshes, before furniture is adopted by interactions.
 * Metres are the model convention. Preserve every tabletop prop at its support height.
 */
export function correctFurnitureScale({THREE,model}){
 const saved=[],changes=[];model.updateWorldMatrix(true,true);
 const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});
 const raw=o=>o.userData?.name||o.name||'';
 function vertical(parts,factor,label){
   for(const o of parts){saved.push({o,position:o.position.clone(),scale:o.scale.clone()});o.position.y*=factor;o.scale.y*=factor;}
   if(parts.length)changes.push({label,parts:parts.length,heightFactor:factor});
 }
 // Seat heights include the cushion, not merely its centre or base frame.
 vertical(meshes.filter(o=>/^Dining (?:west|east|north|south) /.test(raw(o))),.46/.525,'Dining chairs: seat 525 → 460 mm');
 vertical(meshes.filter(o=>raw(o).startsWith('Living sofa ')),.46/.53,'Living sofa: seat 530 → 460 mm');
 // A 760 mm dining surface keeps a practical 300 mm difference above the chairs.
 vertical(meshes.filter(o=>/^Dining table (top|leg)$/.test(raw(o))),.760/.795,'Dining table: surface 795 → 760 mm');
 for(const o of meshes.filter(o=>/^Dining (?:plate|vase|flower|stem|leaf|table runner|bowl|cup)/i.test(raw(o)))){
   saved.push({o,position:o.position.clone(),scale:o.scale.clone()});o.position.y-=.035;
 }
 model.updateWorldMatrix(true,true);
 return {changes,dispose(){for(const {o,position,scale} of saved){o.position.copy(position);o.scale.copy(scale);}model.updateWorldMatrix(true,true);}};
}
