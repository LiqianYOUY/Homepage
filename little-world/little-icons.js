export const houseIcon=`<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M15 30v22c0 3 2 5 5 5h24c3 0 5-2 5-5V30" fill="#fff3d9"/><path d="M9 31 29 13a4 4 0 0 1 6 0l20 18" stroke="#fff3d9" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M43 15V8h7v14" fill="#e6c591"/><path d="M26 57V44a6 6 0 0 1 12 0v13" fill="#c2946b"/><rect x="23" y="26" width="18" height="12" rx="5" fill="#b4c99c"/><path d="M28 32h.1M36 32h.1" stroke="#637d59" stroke-width="2.5" stroke-linecap="round"/><path d="M30 35q2 2 4 0" stroke="#637d59" stroke-width="1.4" stroke-linecap="round"/><circle cx="39" cy="47" r="1.5" fill="#fff0c9"/><path d="M12 54q-8-4-6-9 7 0 6 9Zm40 0q7-4 6-9-7 0-6 9Z" fill="#d2dfa9"/></svg>`;
export const postcardIcon=`<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="m4 7 8 6 8-6M4 17l5-5m11 5-5-5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function visitorAvatar(seed=0){
 // All variation is drawn locally. A mixed unsigned seed keeps neighbouring
 // visitor IDs visually different, including the full 32-bit service seeds.
 let key;
 if(typeof seed==='number'&&Number.isFinite(seed))key=Math.floor(Math.abs(seed))>>>0;
 else if(typeof seed==='string'&&seed.trim()!==''&&Number.isFinite(Number(seed)))key=Math.floor(Math.abs(Number(seed)))>>>0;
 else {key=2166136261;for(const ch of String(seed??0)){key^=ch.codePointAt(0);key=Math.imul(key,16777619)>>>0;}}
 const mix=x=>{x=Math.imul(x^(x>>>16),0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return(x^(x>>>16))>>>0;};
 const h=mix(key+0x9e3779b9),a=mix(h+0x85ebca6b);
 // The existing cat greeting button uses 48; keep her orange-cat silhouette.
 const kind=key===48?2:h%6;
 const colors=['#d4dfbc','#efd2c8','#c6dfe0','#eddfb5','#d9cce4','#c2d9cb','#d3dcef','#e6d1ba'];
 const furs=['#f4d5ad','#e9e2d2','#d4a27c','#faefdf','#cfae93','#edd0b8'];
 const accents=['#b6736f','#758eac','#7b9570','#bb9861','#9b7fa8','#b87753'];
 const bg=colors[(h>>>4)%colors.length],fur=key===48?'#e4ac72':furs[(h>>>9)%furs.length],accent=accents[(a>>>2)%accents.length];
 const ears=[
  '<ellipse cx="22" cy="19" rx="6" ry="16"/><ellipse cx="42" cy="19" rx="6" ry="16"/>',
  '<circle cx="17" cy="22" r="10"/><circle cx="47" cy="22" r="10"/>',
  '<path d="m11 31 5-22 17 16L48 9l5 24Z"/>',
  '<path d="m11 32 3-26 19 22L50 6l3 26Z"/>',
  '<circle cx="17" cy="22" r="9" fill="#797569"/><circle cx="47" cy="22" r="9" fill="#797569"/>',
  '<ellipse cx="14" cy="32" rx="9" ry="17" fill="#b79077"/><ellipse cx="50" cy="32" rx="9" ry="17" fill="#b79077"/>'
 ][kind];
 const details=[
  '<path d="M22 9v15m20-15v15" stroke="#e7b7ab" stroke-width="3.5" stroke-linecap="round"/>',
  '<circle cx="17" cy="22" r="4" fill="#d3a594"/><circle cx="47" cy="22" r="4" fill="#d3a594"/>',
  '<path d="m17 22 1-7 6 6m16 0 6-6 1 7" fill="#e7ae9b"/><path d="m28 18 2 6m7-6-2 6" stroke="#c8956b" stroke-width="2" stroke-linecap="round"/>',
  '<path d="M11 34q9 3 21 16 12-13 21-16-3 21-21 21T11 34Z" fill="#fff3df"/><path d="m17 21-1-9 8 11m16 0 8-11-1 9" fill="#916a58"/>',
  '<ellipse cx="23" cy="35" rx="7" ry="8" fill="#797569"/><ellipse cx="41" cy="35" rx="7" ry="8" fill="#797569"/>',
  '<path d="M31 17q-9 7 0 20 8-13 0-20Z" fill="#fff1dc"/>'
 ][kind];
 const accessory=(a>>>10)%5;
 const accessories=[
  `<path d="m22 55 10 4-10 4Zm20 0-10 4 10 4Z" fill="${accent}"/><circle cx="32" cy="59" r="3" fill="${accent}"/>`,
  `<path d="M15 53q17 8 34 0v7q-17 6-34 0Z" fill="${accent}"/><path d="m38 58 2 6h7l-3-7" fill="${accent}"/>`,
  `<g fill="none" stroke="${accent}" stroke-width="1.8"><circle cx="23" cy="35" r="7"/><circle cx="41" cy="35" r="7"/><path d="M30 35h4m-18 0-5-2m37 2 5-2"/></g>`,
  `<g fill="${accent}"><circle cx="48" cy="20" r="4"/><circle cx="43" cy="24" r="4"/><circle cx="48" cy="28" r="4"/><circle cx="53" cy="24" r="4"/></g><circle cx="48" cy="24" r="3" fill="#f8e9ad"/>`,
  `<path d="m18 51 2 8 5-5m21-3-2 8-5-5" fill="${accent}"/><path d="M23 58h18" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>`
 ][accessory];
 const eyeColor=kind===4?'#ffefdb':'#625144';
 const eyes=(a>>>16)%3===0?`<path d="m20 35 3-2 3 2m12 0 3-2 3 2" stroke="${eyeColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:`<path d="M23 35h.1M41 35h.1" stroke="${eyeColor}" stroke-width="3.8" stroke-linecap="round"/>`;
 const mark=(h>>>20)%3;
 const background=mark===0?'<path d="m8 8 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#fff8ed"/><circle cx="55" cy="49" r="2" fill="#fff8ed"/>':mark===1?'<path d="M7 48V34a25 25 0 0 1 50 0v14" fill="none" stroke="#fffaf0" stroke-opacity=".45" stroke-width="2"/>':'<g fill="#fff9ee" opacity=".6"><circle cx="9" cy="11" r="2"/><circle cx="55" cy="15" r="2.5"/><circle cx="7" cy="48" r="2"/></g>';
 return `<svg viewBox="0 0 64 64" aria-hidden="true" data-avatar-kind="${['rabbit','bear','cat','fox','panda','puppy'][kind]}"><rect width="64" height="64" rx="23" fill="${bg}"/>${background}<g fill="${kind===4?'#f7efdf':fur}">${ears}<ellipse cx="32" cy="37" rx="23" ry="21"/></g>${details}<ellipse cx="32" cy="44" rx="12" ry="8" fill="#fff3e0"/>${eyes}<path d="m29 41 3 3 3-3" stroke="#a57762" fill="#a57762" stroke-linejoin="round"/><path d="M27 47q5 5 10 0" fill="none" stroke="#916f58" stroke-width="1.7" stroke-linecap="round"/><ellipse cx="17" cy="42" rx="3.5" ry="2.2" fill="#e4a898" opacity=".65"/><ellipse cx="47" cy="42" rx="3.5" ry="2.2" fill="#e4a898" opacity=".65"/>${accessories}</svg>`;
}

export const hostAvatar=`<svg viewBox="0 0 96 96" aria-hidden="true"><rect width="96" height="96" rx="35" fill="#f9e2e8"/><circle cx="17" cy="23" r="3" fill="#fff8f3"/><path d="m79 12 2 4 4 1-4 2-2 4-1-4-4-2 4-1Z" fill="#fff8f3"/><path d="M69 27c20 0 16 22 11 29s-3 14 4 17c-18 2-24-13-15-28Z" fill="#7e534c"/><path d="M21 91c2-25 53-25 55 0" fill="#dfa2b5"/><path d="M24 46C17 11 71 10 73 44l-5 24H28Z" fill="#735048"/><path d="M40 68h16v14H40Z" fill="#f4c9b3"/><ellipse cx="48" cy="47" rx="22" ry="26" fill="#ffdec8"/><path d="M24 40c-1-27 44-30 49 1-11-2-18-13-21-19-4 9-13 15-28 18Z" fill="#735048"/><path d="M35 46q4-5 8 0m12 0q4-5 8 0" stroke="#725046" stroke-width="2.8" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="54" rx="5.5" ry="3.4" fill="#edaaab"/><ellipse cx="64" cy="54" rx="5.5" ry="3.4" fill="#edaaab"/><path d="M41 56q7 3 14 0c0 12-14 12-14 0Z" fill="#ae626c"/><path d="M43 58h10q-4 4-10 0Z" fill="#fff7ee"/><path d="M43 63q5-4 10 0" fill="#ef9eab"/><path d="m34 78 14 9 14-9" stroke="#fff2ec" stroke-width="5" fill="none" stroke-linejoin="round"/><path d="M68 27c-3-11-12-5-8 1l6 4c-2 7 7 11 9 4l-2-6Z" fill="#efa5bb"/><circle cx="68" cy="30" r="3" fill="#fff0ef"/><path d="M24 91h49" stroke="#ce879f" stroke-width="2"/></svg>`;
