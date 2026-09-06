/** One visible dialog owns Escape. This module never handles movement keys. */
const SELECTOR='[role="dialog"],#settings';
function visible(panel){
 if(!panel?.isConnected||!panel.getClientRects().length)return false;
 for(let p=panel;p;p=p.parentElement){const s=getComputedStyle(p);if(p.hidden||s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse')return false;}
 return true;
}
function stackingPath(panel){
 const chain=[];for(let p=panel;p;p=p.parentElement)chain.unshift(p);
 return chain.filter(p=>{
  const s=getComputedStyle(p);if(s.display==='contents')return false;
  return p===document.documentElement||['fixed','sticky'].includes(s.position)||(s.position!=='static'&&s.zIndex!=='auto')||Number(s.opacity)<1||s.transform!=='none'||s.filter!=='none'||s.isolation==='isolate';
 });
}
function documentOrder(a,b){return a.compareDocumentPosition(b)&4?-1:1;}
function paintOrder(a,b){
 if(a===b)return 0;
 const ap=stackingPath(a),bp=stackingPath(b);let i=0;
 while(i<ap.length&&i<bp.length&&ap[i]===bp[i])i++;
 const aa=ap[i]||a,bb=bp[i]||b;
 const az=Number.parseInt(getComputedStyle(aa).zIndex,10)||0,bz=Number.parseInt(getComputedStyle(bb).zIndex,10)||0;
 return az-bz||documentOrder(aa,bb);
}
export function topDialog(){
 const panels=[...document.querySelectorAll(SELECTOR)].filter(visible);
 return panels.sort(paintOrder).at(-1)||null;
}
export function isTopDialog(panel){return !!panel&&topDialog()===panel;}
export function flattenDialogRoot(root){
 // Keep custom properties, descendant CSS selectors and DOM containment intact.
 // A boxless wrapper cannot trap its children under another dialog family.
 root.style.display='contents';
}
export function raiseDialog(panel){
 if(!visible(panel))return;
 const panels=[...document.querySelectorAll(SELECTOR)].filter(p=>p!==panel&&visible(p)).sort(paintOrder);
 panels.push(panel);
 // Compact ranks keep ordinary dialogs below the toast layer (200).
 panels.forEach((p,i)=>{p.style.zIndex=String(100+i);});
}
export function consumeDialogEscape(event,panel){
 if(event.key!=='Escape'||event.defaultPrevented||!isTopDialog(panel))return false;
 // A held Escape must not close the next window after the first disappears.
 event.preventDefault();event.stopImmediatePropagation();
 return !event.repeat;
}
