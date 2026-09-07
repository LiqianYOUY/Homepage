/** Local, deterministic-rule board games. No network, wagers, DOM or external engine.
 * Rules references and deliberate casual-play differences are exported below.
 * Coordinates are {x,y}, with y=0 at the top; an empty intersection is null.
 */
export const BOARD_GAME_RULES={
 gomoku:{source:'https://gomoku.renju.net/rules/',notes:'Freestyle 15×15: five or more contiguous stones wins; no forbidden moves or tournament opening constraints.'},
 go:{source:'https://www.britgo.org/rules/compare.html',playSource:'https://www.britgo.org/intro/intro2.html',notes:'Chinese area counting, simple ko and 6.5 komi as a house setting. Play disputed/dead groups out before two passes; remaining stones are counted alive. No superko, handicap or adjudication of dead groups.'},
 xiangqi:{source:'https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf',notes:'Standard movement, check and loss when no legal move remains. Three identical positions are a casual automatic draw; tournament perpetual-check/chase responsibility is not adjudicated.'},
 chess:{source:'https://handbook.fide.com/chapter/e012023',notes:'Standard legal moves, castling, en passant and promotion (queen by default; Q/R/B/N accepted). Threefold repetition and 50 moves are automatic draws rather than claim-based. Common insufficient-material draws are recognised; no clock or tournament arbiter rules.'}
};
const copy=value=>JSON.parse(JSON.stringify(value));
const grid=(w,h=w)=>Array.from({length:h},()=>Array(w).fill(null));
const cloned=board=>board.map(row=>row.slice());
const on=(board,x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&y>=0&&y<board.length&&x>=0&&x<board[0].length;
const same=(a,b)=>a?.x===b?.x&&a?.y===b?.y;
const side=piece=>piece?.[0]||null;
const opposite=(color,kind)=>kind==='xiangqi'?(color==='r'?'b':'r'):(color==='b'?'w':'b');
const positionBoard=board=>board.map(row=>row.map(p=>p||'.').join(',')).join('/');
const orthogonal=[[1,0],[-1,0],[0,1],[0,-1]],diagonal=[[1,1],[1,-1],[-1,1],[-1,-1]],allDirections=[...orthogonal,...diagonal];
const knights=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
const moveAction=(x,y,tx,ty,extra={})=>({type:'move',from:{x,y},to:{x:tx,y:ty},...extra});
const at=(board,p)=>on(board,p?.x,p?.y)?board[p.y][p.x]:null;
function king(board,color){for(let y=0;y<board.length;y++)for(let x=0;x<board[0].length;x++)if(board[y][x]===color+'K')return {x,y};return null;}
function movedBoard(board,action){const b=cloned(board),{from,to}=action;b[to.y][to.x]=b[from.y][from.x];b[from.y][from.x]=null;return b;}
function end(state,winner,status,extra={}){return {...state,phase:'ended',winner,status,...extra};}
function base(kind,board,turn,options){const colors=kind==='xiangqi'?['r','b']:['w','b'],humanColor=colors.includes(options.humanColor)?options.humanColor:turn;return {kind,board,turn,humanColor,computerColor:opposite(humanColor,kind),phase:'playing',winner:null,status:'playing',lastMove:null,moveNumber:0,history:[]};}

// ----- Five in a row ---------------------------------------------------------
function fiveLine(board,x,y,color){
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){const line=[{x,y}];for(const sign of [-1,1]){let a=x+dx*sign,b=y+dy*sign;while(on(board,a,b)&&board[b][a]===color){sign<0?line.unshift({x:a,y:b}):line.push({x:a,y:b});a+=dx*sign;b+=dy*sign;}}if(line.length>=5)return line;}
 return null;
}
function emptyMoves(state){const result=[];state.board.forEach((row,y)=>row.forEach((p,x)=>{if(!p)result.push({type:'place',x,y});}));return result;}
function applyGomoku(state,action){const board=cloned(state.board);board[action.y][action.x]=state.turn;const next={...state,board,turn:opposite(state.turn),moveNumber:state.moveNumber+1,lastMove:{...action,color:state.turn}};const line=fiveLine(board,action.x,action.y,state.turn);return line?end(next,state.turn,'five-in-a-row',{winningLine:line}):board.every(row=>row.every(Boolean))?end(next,'draw','board-full'):next;}
function gomokuPattern(board,x,y,color){let total=0;
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){let length=1,open=0;for(const sign of [-1,1]){let a=x+dx*sign,b=y+dy*sign;while(on(board,a,b)&&board[b][a]===color){length++;a+=dx*sign;b+=dy*sign;}if(on(board,a,b)&&!board[b][a])open++;}total+=length>=5?1000000:open===0?0:[0,2,24,350,18000][Math.min(4,length)]*(open===2?3:1);}
 // Broken fours and threes matter too: examine every five-point window through this point.
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]])for(let offset=-4;offset<=0;offset++){let own=0,valid=true;for(let j=0;j<5;j++){const a=x+(offset+j)*dx,b=y+(offset+j)*dy;if(!on(board,a,b)||board[b][a]&&board[b][a]!==color){valid=false;break;}if((a===x&&b===y)||board[b][a]===color)own++;}if(valid)total+=[0,0,3,32,900,1000000][own];}
 return total;
}
function chooseGomoku(state,moves,random){const occupied=state.board.flat().filter(Boolean).length;if(!occupied)return {type:'place',x:7,y:7};
 let best=-Infinity,choices=[];for(const a of moves){let near=false;for(let dy=-2;dy<=2&&!near;dy++)for(let dx=-2;dx<=2;dx++)if(at(state.board,{x:a.x+dx,y:a.y+dy})){near=true;break;}if(!near)continue;
  const mine=gomokuPattern(state.board,a.x,a.y,state.turn),theirs=gomokuPattern(state.board,a.x,a.y,opposite(state.turn));const score=(mine>=1e6?1e9:theirs>=1e6?1e8:mine+theirs*1.12)-Math.hypot(a.x-7,a.y-7)*.05;
  if(score>best+.001){best=score;choices=[a];}else if(Math.abs(score-best)<.001)choices.push(a);
 }return choices[Math.floor(random()*choices.length)]||moves[0];}

// ----- Go: groups/liberties, simple ko, Chinese area counting -----------------
function neighbors(board,x,y){return orthogonal.map(([dx,dy])=>({x:x+dx,y:y+dy})).filter(p=>on(board,p.x,p.y));}
export function goGroup(board,x,y){const color=at(board,{x,y});if(!color)return {stones:[],liberties:[]};const seen=new Set(),liberties=new Map(),stones=[],stack=[{x,y}];while(stack.length){const p=stack.pop(),key=p.x+','+p.y;if(seen.has(key))continue;seen.add(key);stones.push(p);for(const q of neighbors(board,p.x,p.y)){const value=board[q.y][q.x];if(!value)liberties.set(q.x+','+q.y,q);else if(value===color&&!seen.has(q.x+','+q.y))stack.push(q);}}return {stones,liberties:[...liberties.values()]};}
function goPlacement(state,action){const {x,y}=action;if(!on(state.board,x,y))return {reason:'outside-board'};if(state.board[y][x])return {reason:'occupied'};const board=cloned(state.board),captured=[];board[y][x]=state.turn;for(const p of neighbors(board,x,y))if(board[p.y][p.x]===opposite(state.turn)){const group=goGroup(board,p.x,p.y);if(!group.liberties.length)for(const q of group.stones){captured.push({...q,piece:board[q.y][q.x]});board[q.y][q.x]=null;}}
 const own=goGroup(board,x,y);if(!own.liberties.length)return {reason:'suicide'};if(state.koPosition&&positionBoard(board)===state.koPosition)return {reason:'ko'};return {board,captured,own};}
export function scoreGoBoard(board,komi=6.5){const stones={b:0,w:0},territory={b:0,w:0},neutral=[],ownership=grid(board[0].length,board.length),seen=new Set();for(let y=0;y<board.length;y++)for(let x=0;x<board[0].length;x++){const p=board[y][x];if(p){stones[p]++;ownership[y][x]=p;continue;}const k=x+','+y;if(seen.has(k))continue;const area=[],boundary=new Set(),stack=[{x,y}];while(stack.length){const q=stack.pop(),key=q.x+','+q.y;if(seen.has(key))continue;seen.add(key);area.push(q);for(const n of neighbors(board,q.x,q.y)){const value=board[n.y][n.x];if(value)boundary.add(value);else if(!seen.has(n.x+','+n.y))stack.push(n);}}const owner=boundary.size===1?[...boundary][0]:null;if(owner)territory[owner]+=area.length;else neutral.push(...area);for(const q of area)ownership[q.y][q.x]=owner;}
 const b=stones.b+territory.b,w=stones.w+territory.w+komi;return {b,w,black:b,white:w,komi,stones,territory,neutral:neutral.length,ownership,winner:b===w?'draw':b>w?'b':'w',margin:Math.abs(b-w)};}
function goMoves(state){const moves=[];for(const action of emptyMoves(state))if(goPlacement(state,action).board)moves.push(action);moves.push({type:'pass'});return moves;}
function applyGo(state,action){if(action.type==='pass'){const next={...state,turn:opposite(state.turn),koPosition:null,passes:state.passes+1,moveNumber:state.moveNumber+1,lastMove:{type:'pass',color:state.turn}};if(next.passes>=2){const score=scoreGoBoard(state.board,state.komi);return end(next,score.winner,'area-score',{score});}return next;}
 const result=goPlacement(state,action);return {...state,board:result.board,koPosition:positionBoard(state.board),passes:0,turn:opposite(state.turn),captures:{...state.captures,[state.turn]:(state.captures[state.turn]||0)+result.captured.length},lastMove:{...action,color:state.turn,captured:result.captured},moveNumber:state.moveNumber+1};}
function goEye(board,x,y,color){const around=neighbors(board,x,y);if(around.some(p=>board[p.y][p.x]!==color))return false;let enemy=0,off=0;for(const [dx,dy] of diagonal){if(!on(board,x+dx,y+dy))off++;else if(board[y+dy][x+dx]===opposite(color))enemy++;}return off?enemy===0:enemy<=1;}
function chooseGo(state,moves,random){let best=-Infinity,choices=[];const me=state.turn,other=opposite(me),n=state.board.length,occupied=state.board.flat().filter(Boolean).length;
 for(const a of moves){if(a.type==='pass')continue;const result=goPlacement(state,a);let value=result.captured.length*180;
  if(goEye(state.board,a.x,a.y,me))value-=180;const seen=new Set();for(const p of neighbors(state.board,a.x,a.y)){const color=state.board[p.y][p.x];if(!color)continue;const g=goGroup(state.board,p.x,p.y),key=g.stones.map(q=>q.x+','+q.y).sort().join(';');if(seen.has(key))continue;seen.add(key);if(color===me){value+=2;if(g.liberties.length===1&&result.own.liberties.length>1)value+=g.stones.length*55;}else{const after=goGroup(result.board,p.x,p.y);if(after.stones.length&&after.liberties.length===1)value+=18+after.stones.length*6;}}
  value+=Math.min(result.own.liberties.length,5)*1.3;if(result.own.liberties.length===1)value-=45+result.own.stones.length*8;
  const edge=Math.min(a.x,a.y,n-1-a.x,n-1-a.y);value+=edge===2?4:edge===3?3:edge===0?-3:0;
  if(occupied<n){const stars=n===9?[2,6]:[3,n-4];value+=Math.max(...stars.flatMap(x=>stars.map(y=>6-Math.hypot(x-a.x,y-a.y))))*.6;}
  // Late play inside already-secure territory gains no area and is normally a pass.
  if(occupied>n*n*.45&&!result.captured.length&&goEye(state.board,a.x,a.y,me))value-=100;
  if(value>best+.001){best=value;choices=[a];}else if(Math.abs(value-best)<.001)choices.push(a);
 }
 if(!choices.length||best<0||(state.passes===1&&occupied>n*n*.6&&best<10))return {type:'pass'};
 return choices[Math.floor(random()*choices.length)]||moves[0];}

// ----- Chess ---------------------------------------------------------------
function chessAttacked(board,x,y,by){for(let sy=0;sy<8;sy++)for(let sx=0;sx<8;sx++){const piece=board[sy][sx];if(side(piece)!==by)continue;const type=piece[1],dx=x-sx,dy=y-sy;
 if(type==='P'&&dy===(by==='w'?-1:1)&&Math.abs(dx)===1)return true;
 if(type==='N'&&Math.abs(dx)*Math.abs(dy)===2)return true;
 if(type==='K'&&Math.max(Math.abs(dx),Math.abs(dy))===1)return true;
 const straight=dx===0||dy===0,diag=Math.abs(dx)===Math.abs(dy);if((type==='Q'&&(straight||diag)||type==='R'&&straight||type==='B'&&diag)&&(dx||dy)){const stepx=Math.sign(dx),stepy=Math.sign(dy);let a=sx+stepx,b=sy+stepy,clear=true;while(a!==x||b!==y){if(board[b][a]){clear=false;break;}a+=stepx;b+=stepy;}if(clear)return true;}
 }return false;}
function chessCheck(state,color=state.turn){const k=king(state.board,color);return !k||chessAttacked(state.board,k.x,k.y,opposite(color));}
function chessPseudo(state,from){const board=state.board,result=[],color=state.turn,enemy=opposite(color);
 function add(x,y,tx,ty,extra={}){if(!on(board,tx,ty)||side(board[ty][tx])===color||board[ty][tx]===enemy+'K')return;result.push(moveAction(x,y,tx,ty,extra));}
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){const piece=board[y][x];if(side(piece)!==color||from&&!same(from,{x,y}))continue;const type=piece[1];
  if(type==='P'){const dir=color==='w'?-1:1,last=color==='w'?0:7,start=color==='w'?6:1;const pawn=(tx,ty,extra={})=>{if(ty===last)for(const promotion of ['Q','R','B','N'])add(x,y,tx,ty,{...extra,promotion});else add(x,y,tx,ty,extra);};
   if(on(board,x,y+dir)&&!board[y+dir][x]){pawn(x,y+dir);if(y===start&&!board[y+dir*2][x])add(x,y,x,y+dir*2,{doublePawn:true});}
   for(const dx of [-1,1]){const tx=x+dx,ty=y+dir;if(!on(board,tx,ty))continue;if(side(board[ty][tx])===enemy)pawn(tx,ty);else if(same(state.enPassant,{x:tx,y:ty})&&board[y][tx]===enemy+'P')add(x,y,tx,ty,{enPassant:true});}
  }else if(type==='N'){for(const [dx,dy] of knights)add(x,y,x+dx,y+dy);
  }else if(type==='K'){for(const [dx,dy] of allDirections)add(x,y,x+dx,y+dy);const home=color==='w'?7:0;
   if(x===4&&y===home&&!chessCheck(state,color))for(const [letter,rookX,path,kingX] of [['K',7,[5,6],6],['Q',0,[3,2,1],2]]){const right=color==='w'?letter:letter.toLowerCase();if(!state.castling.includes(right)||board[home][rookX]!==color+'R'||path.some(px=>board[home][px]))continue;const through=letter==='K'?[5,6]:[3,2];if(through.some(px=>chessAttacked(board,px,home,enemy)))continue;add(x,y,kingX,home,{castle:letter});}
  }else{const directions=type==='R'?orthogonal:type==='B'?diagonal:allDirections;for(const [dx,dy] of directions){let tx=x+dx,ty=y+dy;while(on(board,tx,ty)){if(side(board[ty][tx])===color)break;add(x,y,tx,ty);if(board[ty][tx])break;tx+=dx;ty+=dy;}}}
 }return result;}
function applyChessRaw(state,action){const board=movedBoard(state.board,action),piece=at(state.board,action.from),captured=at(state.board,action.to),color=state.turn;
 if(action.enPassant)board[action.from.y][action.to.x]=null;
 if(action.promotion)board[action.to.y][action.to.x]=color+action.promotion;
 if(action.castle){const rookX=action.castle==='K'?7:0,toX=action.castle==='K'?5:3;board[action.from.y][toX]=board[action.from.y][rookX];board[action.from.y][rookX]=null;}
 let castling=state.castling;const remove=letters=>{for(const letter of letters)castling=castling.replace(letter,'');};if(piece[1]==='K')remove(color==='w'?'KQ':'kq');
 for(const [x,y,letter] of [[0,7,'Q'],[7,7,'K'],[0,0,'q'],[7,0,'k']])if(same(action.from,{x,y})||same(action.to,{x,y}))remove(letter);
 return {...state,board,turn:opposite(color),castling,enPassant:action.doublePawn?{x:action.from.x,y:(action.from.y+action.to.y)/2}:null,halfmove:piece[1]==='P'||captured||action.enPassant?0:state.halfmove+1,moveNumber:state.moveNumber+1,lastMove:{...action,piece,captured:action.enPassant?opposite(color)+'P':captured}};}
function chessMoves(state,from){return chessPseudo(state,from).filter(action=>!chessCheck(applyChessRaw(state,action),state.turn));}
function chessKey(state){let ep='-';if(state.enPassant&&chessMoves(state).some(a=>a.enPassant))ep=state.enPassant.x+','+state.enPassant.y;return positionBoard(state.board)+' '+state.turn+' '+state.castling+' '+ep;}
function insufficientChess(board){const pieces=[];for(let y=0;y<8;y++)for(let x=0;x<8;x++){const p=board[y][x];if(p&&p[1]!=='K')pieces.push({p,x,y});}if(!pieces.length)return true;if(pieces.length===1&&['B','N'].includes(pieces[0].p[1]))return true;return pieces.every(p=>p.p[1]==='B')&&new Set(pieces.map(p=>(p.x+p.y)%2)).size===1;}
function adjudicateChess(state){const moves=chessMoves(state),check=chessCheck(state);if(!moves.length)return check?end(state,opposite(state.turn),'checkmate',{inCheck:true}):end(state,'draw','stalemate',{inCheck:false});if(insufficientChess(state.board))return end(state,'draw','insufficient-material');if(state.halfmove>=100)return end(state,'draw','fifty-move');if(state.history.filter(key=>key===chessKey(state)).length>=3)return end(state,'draw','repetition');return {...state,status:check?'check':'playing',inCheck:check};}
export function parseChessFEN(fen){if(typeof fen!=='string')throw new TypeError('FEN must be a string');const [placement,turn,castling='-',ep='-',halfmove='0']=fen.trim().split(/\s+/),rows=placement.split('/');if(rows.length!==8||!['w','b'].includes(turn))throw new TypeError('Invalid FEN');const board=rows.map(row=>{const out=[];for(const c of row){if(/[1-8]/.test(c))out.push(...Array(Number(c)).fill(null));else if(/[kqrbnp]/i.test(c))out.push((c===c.toUpperCase()?'w':'b')+c.toUpperCase());else throw new TypeError('Invalid FEN piece');}if(out.length!==8)throw new TypeError('Invalid FEN row');return out;});const enPassant=ep==='-'?null:/^[a-h][36]$/.test(ep)?{x:ep.charCodeAt(0)-97,y:8-Number(ep[1])}:(()=>{throw new TypeError('Invalid FEN en passant')})();return {board,turn,castling:castling==='-'?'':castling,enPassant,halfmove:Number(halfmove)};}

// ----- Xiangqi -------------------------------------------------------------
function palace(color,x,y){return x>=3&&x<=5&&(color==='r'?y>=7&&y<=9:y>=0&&y<=2);}
function xiangqiPseudo(state,from,attacks=false){const board=state.board,result=[],color=state.turn,enemy=opposite(color,'xiangqi');
 const add=(x,y,tx,ty)=>{if(on(board,tx,ty)&&side(board[ty][tx])!==color&&(attacks||board[ty][tx]!==enemy+'K'))result.push(moveAction(x,y,tx,ty));};
 for(let y=0;y<10;y++)for(let x=0;x<9;x++){const piece=board[y][x];if(side(piece)!==color||from&&!same(from,{x,y}))continue;const type=piece[1];
  if(type==='K'){for(const [dx,dy] of orthogonal)if(palace(color,x+dx,y+dy))add(x,y,x+dx,y+dy);if(attacks){for(const dy of [-1,1])for(let ty=y+dy;on(board,x,ty);ty+=dy){if(board[ty][x]){if(board[ty][x]===enemy+'K')add(x,y,x,ty);break;}}}}
  else if(type==='A'){for(const [dx,dy] of diagonal)if(palace(color,x+dx,y+dy))add(x,y,x+dx,y+dy);}
  else if(type==='E'){for(const [dx,dy] of diagonal){const tx=x+2*dx,ty=y+2*dy;if(on(board,tx,ty)&&(color==='r'?ty>=5:ty<=4)&&!board[y+dy][x+dx])add(x,y,tx,ty);}}
  else if(type==='H'){for(const [dx,dy] of knights){const lx=x+(Math.abs(dx)===2?Math.sign(dx):0),ly=y+(Math.abs(dy)===2?Math.sign(dy):0);if(on(board,lx,ly)&&!board[ly][lx])add(x,y,x+dx,y+dy);}}
  else if(type==='P'){add(x,y,x,y+(color==='r'?-1:1));if(color==='r'?y<=4:y>=5){add(x,y,x-1,y);add(x,y,x+1,y);}}
  else if(type==='R'||type==='C'){for(const [dx,dy] of orthogonal){let screens=0;for(let tx=x+dx,ty=y+dy;on(board,tx,ty);tx+=dx,ty+=dy){const target=board[ty][tx];if(type==='R'){add(x,y,tx,ty);if(target)break;}else if(!screens){if(target)screens=1;else add(x,y,tx,ty);}else if(target){add(x,y,tx,ty);break;}}}}
 }return result;}
function xiangqiCheck(state,color=state.turn){const k=king(state.board,color);if(!k)return true;return xiangqiPseudo({...state,turn:opposite(color,'xiangqi')},null,true).some(a=>same(a.to,k));}
function applyXiangqiRaw(state,action){return {...state,board:movedBoard(state.board,action),turn:opposite(state.turn,'xiangqi'),moveNumber:state.moveNumber+1,lastMove:{...action,piece:at(state.board,action.from),captured:at(state.board,action.to)}};}
function xiangqiMoves(state,from){return xiangqiPseudo(state,from).filter(a=>!xiangqiCheck(applyXiangqiRaw(state,a),state.turn));}
const xiangqiKey=state=>positionBoard(state.board)+' '+state.turn;
function adjudicateXiangqi(state){const check=xiangqiCheck(state);if(!xiangqiMoves(state).length)return end(state,opposite(state.turn,'xiangqi'),check?'checkmate':'no-legal-moves',{inCheck:check});if(state.history.filter(k=>k===xiangqiKey(state)).length>=3)return end(state,'draw','repetition');return {...state,status:check?'check':'playing',inCheck:check};}

// ----- Small legal-move search for the two piece-moving games ---------------
function positionValue(state,perspective){const chess=state.kind==='chess',values=chess?{P:100,N:320,B:330,R:500,Q:900,K:0}:{P:100,H:400,E:200,A:200,R:900,C:450,K:0};let total=0;for(let y=0;y<state.board.length;y++)for(let x=0;x<state.board[0].length;x++){const p=state.board[y][x];if(!p)continue;let value=values[p[1]],center=(state.board[0].length-1)/2;const advance=side(p)===(chess?'w':'r')?state.board.length-1-y:y;if(p[1]==='P')value+=advance*(chess?6:14);if(['N','H','B','C'].includes(p[1]))value+=Math.max(0,4-Math.abs(x-center))*5;total+=side(p)===perspective?value:-value;}return total;}
function choosePieces(state,moves,random){const chess=state.kind==='chess',legal=chess?chessMoves:xiangqiMoves,apply=chess?applyChessRaw:applyXiangqiRaw,check=chess?chessCheck:xiangqiCheck,perspective=state.turn;
 let best=-Infinity,choices=[];for(const action of moves){const next=apply(state,action),replies=legal(next);let score;
  if(!replies.length)score=check(next)||!chess?1e7:0;
  else{score=Infinity;for(const reply of replies){const after=apply(next,reply);let value=positionValue(after,perspective);if(check(after,perspective))value=legal(after).length?value-35:-1e7;score=Math.min(score,value);if(score<best-30)break;}score+=check(next)?12:0;if(action.castle)score+=18;}
  if(chess&&action.promotion&&action.promotion!=='Q')score-=1;
  if(score>best+.001){best=score;choices=[action];}else if(Math.abs(score-best)<.001)choices.push(action);
 }return choices[Math.floor(random()*choices.length)]||moves[0];}

// ----- Public engine -------------------------------------------------------
function initialState(kind,options){if(kind==='gomoku')return base(kind,grid(15),'b',options);if(kind==='go')return {...base(kind,grid([9,13,19].includes(options.size)?options.size:9),'b',options),komi:Number.isFinite(options.komi)?options.komi:6.5,passes:0,koPosition:null,captures:{b:0,w:0}};
 if(kind==='chess'){const b=grid(8),back=['R','N','B','Q','K','B','N','R'];for(let x=0;x<8;x++){b[0][x]='b'+back[x];b[1][x]='bP';b[6][x]='wP';b[7][x]='w'+back[x];}return {...base(kind,b,'w',options),castling:'KQkq',enPassant:null,halfmove:0};}
 const b=grid(9,10),back=['R','H','E','A','K','A','E','H','R'];for(let x=0;x<9;x++){b[0][x]='b'+back[x];b[9][x]='r'+back[x];}for(const x of [1,7]){b[2][x]='bC';b[7][x]='rC';}for(const x of [0,2,4,6,8]){b[3][x]='bP';b[6][x]='rP';}return base(kind,b,'r',options);}
function validateState(kind,input,options){if(!input||typeof input!=='object')throw new TypeError('Invalid game state');const baseline=initialState(kind,{...options,size:kind==='go'?input.board?.length:options.size}),board=input.board,w=baseline.board[0].length,h=baseline.board.length,allowed=kind==='xiangqi'?/^[rb][KAEHRCP]$/:kind==='chess'?/^[wb][KQRBNP]$/:/^[bw]$/;
 if(!Array.isArray(board)||board.length!==h||board.some(row=>!Array.isArray(row)||row.length!==w||row.some(p=>p!==null&&(typeof p!=='string'||!allowed.test(p)))))throw new TypeError('Invalid board');const colors=kind==='xiangqi'?['r','b']:['w','b'];if(!colors.includes(input.turn))throw new TypeError('Invalid turn');if(['chess','xiangqi'].includes(kind))for(const color of colors)if(board.flat().filter(p=>p===color+'K').length!==1)throw new TypeError('A position needs one king per side');
 const humanColor=colors.includes(options.humanColor)?options.humanColor:colors.includes(input.humanColor)?input.humanColor:baseline.humanColor;
 const next={...baseline,...copy(input),kind,board:cloned(board),humanColor,computerColor:opposite(humanColor,kind),phase:'playing',winner:null,status:'playing',moveNumber:Number.isInteger(input.moveNumber)&&input.moveNumber>=0?input.moveNumber:0,history:Array.isArray(input.history)?input.history.filter(k=>typeof k==='string').slice(-5000):[]};
 if(kind==='chess'){next.castling=typeof input.castling==='string'?['K','Q','k','q'].filter(k=>input.castling.includes(k)).join(''):'';next.halfmove=Number.isInteger(input.halfmove)&&input.halfmove>=0?input.halfmove:0;next.enPassant=input.enPassant&&on(board,input.enPassant.x,input.enPassant.y)?copy(input.enPassant):null;}
 if(kind==='go'){next.passes=Math.max(0,Math.min(2,Number(input.passes)||0));next.komi=Number.isFinite(input.komi)?input.komi:6.5;next.koPosition=typeof input.koPosition==='string'?input.koPosition:null;next.captures={b:Math.max(0,Number(input.captures?.b)||0),w:Math.max(0,Number(input.captures?.w)||0)};}
 return next;}
function matching(action,legal){if(!action||typeof action!=='object')return false;if(legal.type==='pass')return action.type==='pass'||action.pass===true;if(legal.type==='place')return action.x===legal.x&&action.y===legal.y;const promotion=action.promotion===undefined?'Q':typeof action.promotion==='string'?action.promotion.toUpperCase():null;return same(action.from,legal.from)&&same(action.to,legal.to)&&(!legal.promotion||legal.promotion===promotion);}
export function createBoardGame(kind,options={}){if(!Object.hasOwn(BOARD_GAME_RULES,kind))throw new TypeError('Unknown board game');let state;const random=()=>{const value=Number((options.random||Math.random)());return Number.isFinite(value)?Math.min(.999999,Math.max(0,value)):.5;};const legalFor=kind==='gomoku'?emptyMoves:kind==='go'?goMoves:kind==='chess'?chessMoves:xiangqiMoves;
 function settle(next,addHistory=false){if(kind==='chess'||kind==='xiangqi'){const key=kind==='chess'?chessKey(next):xiangqiKey(next);if(addHistory||!next.history.length)next.history=[...next.history,key].slice(-5000);return kind==='chess'?adjudicateChess(next):adjudicateXiangqi(next);}if(kind==='go'&&next.passes>=2){const score=scoreGoBoard(next.board,next.komi);return end(next,score.winner,'area-score',{score});}if(kind==='gomoku'&&next.phase!=='ended'){for(let y=0;y<15;y++)for(let x=0;x<15;x++)if(next.board[y][x]){const line=fiveLine(next.board,x,y,next.board[y][x]);if(line)return end(next,next.board[y][x],'five-in-a-row',{winningLine:line});}if(next.board.every(row=>row.every(Boolean)))return end(next,'draw','board-full');}return next;}
 function reset(){state=initialState(kind,options);if(options.fen&&kind==='chess')state=validateState(kind,{...parseChessFEN(options.fen),kind},options);if(options.state)state=validateState(kind,options.state,options);state=settle(state);return getState();}
 function getState(){return copy(state);}
 function legalMoves(from){if(state.phase!=='playing')return [];return copy(legalFor(state,from));}
 function play(action){if(state.phase!=='playing')return {ok:false,reason:'game-over',state:getState()};let selected;
  if(kind==='go'&&action?.type!=='pass'&&!action?.pass){const result=goPlacement(state,action||{});if(!result.board)return {ok:false,reason:result.reason,state:getState()};selected={type:'place',x:action.x,y:action.y};}
  else selected=legalFor(state).find(a=>matching(action,a));
  if(!selected)return {ok:false,reason:'illegal-move',state:getState()};const next=kind==='gomoku'?applyGomoku(state,selected):kind==='go'?applyGo(state,selected):kind==='chess'?applyChessRaw(state,selected):applyXiangqiRaw(state,selected);state=settle(next,true);return {ok:true,action:copy(selected),state:getState()};}
 function computerMove(){if(state.phase!=='playing')return {ok:false,reason:'game-over',state:getState()};if(state.turn!==state.computerColor)return {ok:false,reason:'not-computer-turn',state:getState()};const moves=legalFor(state);if(!moves.length){state=settle(state);return {ok:false,reason:'no-legal-moves',state:getState()};}const chosen=kind==='gomoku'?chooseGomoku(state,moves,random):kind==='go'?chooseGo(state,moves,random):choosePieces(state,moves,random);return play(chosen);}
 function importState(snapshot){const previous=state;try{state=settle(validateState(kind,typeof snapshot==='string'?JSON.parse(snapshot):snapshot,options));return {ok:true,state:getState()};}catch(error){state=previous;return {ok:false,reason:'invalid-state',message:String(error.message),state:getState()};}}
 reset();return {kind,getState,legalMoves,moves:legalMoves,play,computerMove,restart:reset,exportState:getState,importState,rules:copy(BOARD_GAME_RULES[kind])};}
