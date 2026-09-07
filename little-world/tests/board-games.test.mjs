import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoardGame,goGroup,scoreGoBoard,parseChessFEN,BOARD_GAME_RULES} from '../board-games.js';

const grid=(w,h=w)=>Array.from({length:h},()=>Array(w).fill(null));
const place=(x,y)=>({type:'place',x,y});
const move=(x,y,tx,ty,extra={})=>({type:'move',from:{x,y},to:{x:tx,y:ty},...extra});
const contains=(moves,x,y)=>moves.some(m=>m.to?.x===x&&m.to?.y===y);
const play=(g,action)=>{const result=g.play(action);assert.equal(result.ok,true,JSON.stringify({action,reason:result.reason}));return result.state;};
function puzzle(kind,pieces,turn=kind==='xiangqi'?'r':'b',extra={}) {
 const b=grid(kind==='xiangqi'?9:kind==='gomoku'?15:9,kind==='xiangqi'?10:kind==='gomoku'?15:9);
 for(const [x,y,p] of pieces)b[y][x]=p;
 return createBoardGame(kind,{state:{board:b,turn,...extra},random:()=>0});
}
function xiangqi(pieces=[],turn='r',extra={}) {return puzzle('xiangqi',[[4,0,'bK'],[4,9,'rK'],[4,5,'rP'],...pieces],turn,extra);}
function perft(game,depth) {if(!depth)return 1;const snapshot=game.exportState();let nodes=0;for(const action of game.legalMoves()){play(game,action);nodes+=perft(game,depth-1);assert.equal(game.importState(snapshot).ok,true);}return nodes;}

test('all engines expose stable cloned state, legal actions and human/computer turns',()=>{
 for(const kind of ['gomoku','go','xiangqi','chess']) {
  const g=createBoardGame(kind,{random:()=>0}),initial=g.getState();
  assert.equal(initial.phase,'playing');assert.equal(initial.turn,initial.humanColor);
  assert.equal(g.computerMove().reason,'not-computer-turn');
  assert.equal(g.play({type:'move',from:{x:-1,y:-1},to:{x:1,y:1}}).ok,false);
  assert.deepEqual(g.getState(),initial);
  const detached=g.getState();detached.board[0][0]='mutated';assert.deepEqual(g.getState(),initial);
  const detachedMoves=g.legalMoves();detachedMoves[0].type='mutated';assert.notEqual(g.legalMoves()[0].type,'mutated');
  play(g,g.legalMoves()[0]);const before=g.getState(),legal=g.legalMoves();
  const response=g.computerMove();assert.equal(response.ok,true);
  assert.ok(legal.some(m=>JSON.stringify(m)===JSON.stringify(response.action)));
  assert.equal(response.state.moveNumber,before.moveNumber+1);
  const saved=g.exportState();assert.equal(g.importState(JSON.stringify(saved)).ok,true);assert.deepEqual(g.getState(),saved);
  assert.equal(g.importState({board:[]}).ok,false);assert.deepEqual(g.getState(),saved);
  assert.deepEqual(g.restart(),initial);
  const second=createBoardGame(kind,{humanColor:initial.computerColor,random:()=>0});
  assert.equal(second.computerMove().ok,true);
  assert.match(BOARD_GAME_RULES[kind].source,/^https:\/\//);
 }
 assert.throws(()=>createBoardGame('unknown'),/Unknown board game/);
});

test('gomoku wins in every direction, includes overlines, and preserves a finished import',()=>{
 for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
  const pieces=Array.from({length:4},(_,i)=>[4+i*dx,7+i*dy,'b']);
  const g=puzzle('gomoku',pieces);assert.equal(g.legalMoves().length,221);
  const ended=play(g,place(4+4*dx,7+4*dy));assert.equal(ended.winner,'b');assert.equal(ended.status,'five-in-a-row');
  assert.equal(g.play(place(0,0)).reason,'game-over');assert.deepEqual(g.legalMoves(),[]);
  assert.equal(g.importState(g.exportState()).state.winner,'b');
 }
 const g=puzzle('gomoku',[[2,7,'b'],[3,7,'b'],[4,7,'b'],[6,7,'b'],[7,7,'b']]);
 assert.equal(g.play(place(2,7)).ok,false);assert.equal(play(g,place(5,7)).winningLine.length,6);
});

test('gomoku computer blocks an immediate four and prioritises its own win',()=>{
 const defending=puzzle('gomoku',[[0,7,'w'],[1,7,'b'],[2,7,'b'],[3,7,'b'],[4,7,'b']],'w',{humanColor:'b'});
 assert.deepEqual(defending.computerMove().action,place(5,7));
 const winning=puzzle('gomoku',[[0,7,'w'],[1,7,'b'],[2,7,'b'],[3,7,'b'],[4,7,'b'],[1,3,'w'],[2,3,'w'],[3,3,'w'],[4,3,'w']],'w',{humanColor:'b'});
 assert.equal(winning.computerMove().state.winner,'w');
});

test('go captures connected groups before checking suicide and counts unique liberties',()=>{
 const g=puzzle('go',[[4,4,'w'],[4,5,'w'],[3,4,'b'],[5,4,'b'],[4,3,'b'],[3,5,'b'],[5,5,'b']]);
 const group=goGroup(g.getState().board,4,4);assert.equal(group.stones.length,2);assert.deepEqual(group.liberties,[{x:4,y:6}]);
 const s=play(g,place(4,6));assert.equal(s.board[4][4],null);assert.equal(s.board[5][4],null);assert.equal(s.captures.b,2);
 const capture=puzzle('go',[[0,0,'w'],[1,1,'w'],[2,0,'w'],[0,1,'b'],[2,1,'b'],[1,2,'b'],[3,0,'b']]);
 // The placement begins with no empty neighbour but gains liberties by removing white stones.
 assert.equal(play(capture,place(1,0)).board[0][1],'b');
});

test('go rejects suicide, occupied points and immediate ko without changing the board',()=>{
 const suicide=puzzle('go',[[3,4,'w'],[5,4,'w'],[4,3,'w'],[4,5,'w']]);
 const before=suicide.exportState();assert.equal(suicide.play(place(4,4)).reason,'suicide');assert.deepEqual(suicide.getState(),before);
 assert.equal(suicide.play(place(3,4)).reason,'occupied');assert.equal(suicide.play(place(30,4)).reason,'outside-board');
 const ko=puzzle('go',[[1,1,'w'],[0,1,'b'],[1,0,'b'],[1,2,'b'],[2,0,'w'],[3,1,'w'],[2,2,'w']]);
 const captured=play(ko,place(2,1));assert.equal(captured.captures.b,1);
 assert.equal(ko.play(place(1,1)).reason,'ko');assert.deepEqual(ko.getState(),captured);
 play(ko,place(7,7));play(ko,place(7,6));assert.equal(play(ko,place(1,1)).captures.w,1);
});

test('go supports full-size boards, pass reset, two-pass area scoring and komi',()=>{
 assert.equal(createBoardGame('go',{size:19}).getState().board.length,19);
 assert.equal(createBoardGame('go',{size:13}).getState().board.length,13);
 const g=createBoardGame('go');assert.equal(g.legalMoves().length,82);
 play(g,{type:'pass'});assert.equal(play(g,place(4,4)).passes,0);
 play(g,{type:'pass'});const s=play(g,{type:'pass'});
 assert.equal(s.phase,'ended');assert.equal(s.status,'area-score');assert.equal(s.score.w,87.5);assert.equal(s.winner,'w');
 assert.equal(g.importState(s).state.phase,'ended');
 const surrounded=scoreGoBoard([['b','b','b'],['b',null,'b'],['b','b','b']]);
 assert.deepEqual(surrounded.stones,{b:8,w:0});assert.deepEqual(surrounded.territory,{b:1,w:0});assert.equal(surrounded.b,9);assert.equal(surrounded.w,6.5);
 const neutral=scoreGoBoard([['b','b','b'],[null,null,null],['w','w','w']]);assert.equal(neutral.neutral,3);assert.equal(neutral.b,3);assert.equal(neutral.w,9.5);
});

test('go computer captures atari and always chooses a legal response',()=>{
 const g=puzzle('go',[[4,4,'b'],[3,4,'w'],[5,4,'w'],[4,3,'w']],'w',{humanColor:'b'});
 const result=g.computerMove();assert.deepEqual(result.action,place(4,5));assert.equal(result.state.captures.w,1);
 for(const size of [9,19]) {
  const game=createBoardGame('go',{size,random:()=>0});
  for(let round=0;round<5&&game.getState().phase==='playing';round++){const legal=game.legalMoves().filter(m=>m.type==='place');play(game,legal[Math.floor(legal.length/2)]);const before=game.legalMoves();const response=game.computerMove();assert.equal(response.ok,true);assert.ok(before.some(m=>JSON.stringify(m)===JSON.stringify(response.action)));}
 }
});

test('chess legal move generation matches standard opening and Kiwipete branch counts',()=>{
 const opening=createBoardGame('chess');assert.equal(opening.legalMoves().length,20);
 assert.equal(perft(opening,2),400);assert.equal(perft(opening,3),8902);
 const kiwipete=createBoardGame('chess',{fen:'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1'});
 assert.equal(kiwipete.legalMoves().length,48);assert.equal(perft(kiwipete,2),2039);
});

test('chess checkmate, stalemate and insufficient material end play correctly',()=>{
 const g=createBoardGame('chess');for(const m of [move(5,6,5,5),move(4,1,4,3),move(6,6,6,4),move(3,0,7,4)])play(g,m);
 assert.equal(g.getState().winner,'b');assert.equal(g.getState().status,'checkmate');assert.equal(g.getState().inCheck,true);
 const stalemate=createBoardGame('chess',{fen:'7k/5K2/6Q1/8/8/8/8/8 b - - 0 1'});assert.equal(stalemate.getState().status,'stalemate');assert.equal(stalemate.getState().winner,'draw');
 const bare=createBoardGame('chess',{fen:'7k/8/8/8/8/8/8/K7 w - - 0 1'});assert.equal(bare.getState().status,'insufficient-material');
 const bishop=createBoardGame('chess',{fen:'7k/8/8/8/8/8/8/KB6 w - - 0 1'});assert.equal(bishop.getState().winner,'draw');
});

test('chess castling moves both pieces, checks transit squares and remembers lost rights',()=>{
 const fen='r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',g=createBoardGame('chess',{fen});
 assert.ok(contains(g.legalMoves({x:4,y:7}),6,7));assert.ok(contains(g.legalMoves({x:4,y:7}),2,7));
 const s=play(g,move(4,7,6,7));assert.equal(s.board[7][6],'wK');assert.equal(s.board[7][5],'wR');assert.equal(s.board[7][7],null);assert.equal(s.castling,'kq');
 const attacked=createBoardGame('chess',{fen:'r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1'});
 assert.equal(contains(attacked.legalMoves({x:4,y:7}),6,7),false);assert.ok(contains(attacked.legalMoves({x:4,y:7}),2,7));
 const moved=createBoardGame('chess',{fen});for(const a of [move(7,7,7,6),move(4,0,4,1),move(7,6,7,7),move(4,1,4,0)])play(moved,a);
 assert.equal(contains(moved.legalMoves({x:4,y:7}),6,7),false);assert.ok(contains(moved.legalMoves({x:4,y:7}),2,7));
 const captured=createBoardGame('chess',{fen});assert.equal(play(captured,move(0,7,0,0)).castling,'Kk');
});

test('chess en passant expires after one reply and cannot expose the king',()=>{
 const g=createBoardGame('chess');for(const a of [move(4,6,4,4),move(0,1,0,2),move(4,4,4,3),move(3,1,3,3)])play(g,a);
 const before=g.exportState();assert.ok(g.legalMoves({x:4,y:3}).some(a=>a.enPassant));
 const s=play(g,move(4,3,3,2));assert.equal(s.board[3][3],null);assert.equal(s.board[2][3],'wP');assert.equal(s.lastMove.captured,'bP');
 assert.equal(g.importState(before).ok,true);play(g,move(7,6,7,5));play(g,move(0,2,0,3));assert.equal(contains(g.legalMoves({x:4,y:3}),3,2),false);
 const pinned=createBoardGame('chess',{fen:'k7/8/8/4KPpr/8/8/8/8 w - g6 0 1'});assert.equal(contains(pinned.legalMoves({x:5,y:3}),6,2),false);
});

test('chess promotion defaults to queen and accepts a legal underpromotion only',()=>{
 const g=createBoardGame('chess',{fen:'7k/P7/8/8/8/8/8/7K w - - 0 1'});
 assert.equal(g.legalMoves({x:0,y:1}).length,4);assert.equal(g.play(move(0,1,0,0,{promotion:12})).ok,false);
 assert.equal(g.play(move(0,1,0,0,{promotion:'K'})).ok,false);assert.equal(play(g,move(0,1,0,0)).board[0][0],'wQ');
 g.restart();assert.equal(play(g,move(0,1,0,0,{promotion:'n'})).board[0][0],'wN');
});

test('chess rejects pinned-piece moves and king adjacency',()=>{
 const pinned=createBoardGame('chess',{fen:'k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1'});
 assert.equal(contains(pinned.legalMoves({x:4,y:6}),5,6),false);assert.ok(contains(pinned.legalMoves({x:4,y:6}),4,0));
 const kings=createBoardGame('chess',{fen:'8/8/8/8/4k3/8/4K3/R7 w - - 0 1'});assert.equal(contains(kings.legalMoves({x:4,y:6}),4,5),false);
});

test('chess automatically draws after threefold repetition or 50 full moves without progress',()=>{
 const g=createBoardGame('chess'),cycle=[move(6,7,5,5),move(6,0,5,2),move(5,5,6,7),move(5,2,6,0)];
 for(let count=0;count<2;count++)for(const a of cycle)play(g,a);
 assert.equal(g.getState().status,'repetition');assert.equal(g.getState().winner,'draw');
 const fifty=createBoardGame('chess',{fen:'7k/8/8/8/8/8/8/R6K w - - 99 1'});assert.equal(play(fifty,move(0,7,0,6)).status,'fifty-move');
 const reset=createBoardGame('chess',{fen:'7k/8/8/8/8/8/P7/R6K w - - 99 1'});assert.equal(play(reset,move(0,6,0,5)).halfmove,0);
 assert.throws(()=>parseChessFEN('bad fen'),/Invalid/);
});

test('xiangqi standard opening has 44 legal moves; horses and elephants respect blockers',()=>{
 assert.equal(createBoardGame('xiangqi').legalMoves().length,44);
 const horse=xiangqi([[2,7,'rH'],[2,6,'rP']]);const hm=horse.legalMoves({x:2,y:7});
 assert.equal(contains(hm,1,5),false);assert.equal(contains(hm,3,5),false);assert.ok(contains(hm,0,6));assert.ok(contains(hm,4,6));
 const elephant=xiangqi([[2,9,'rE'],[1,8,'rP']]);const em=elephant.legalMoves({x:2,y:9});assert.equal(contains(em,0,7),false);assert.ok(contains(em,4,7));
 const river=xiangqi([[2,5,'rE']]);assert.equal(contains(river.legalMoves({x:2,y:5}),0,3),false);assert.ok(contains(river.legalMoves({x:2,y:5}),0,7));
});

test('xiangqi cannon captures only beyond exactly one screen and pawns cross the river',()=>{
 const cannon=xiangqi([[1,7,'rC'],[1,4,'bP'],[1,1,'bR'],[1,0,'bC']]);const cm=cannon.legalMoves({x:1,y:7});
 assert.ok(contains(cm,1,5));assert.equal(contains(cm,1,4),false);assert.equal(contains(cm,1,3),false);assert.ok(contains(cm,1,1));assert.equal(contains(cm,1,0),false);
 const pawns=xiangqi([[0,6,'rP'],[2,4,'rP']]);assert.deepEqual(pawns.legalMoves({x:0,y:6}),[move(0,6,0,5)]);
 const pm=pawns.legalMoves({x:2,y:4});assert.ok(contains(pm,1,4));assert.ok(contains(pm,3,4));assert.ok(contains(pm,2,3));assert.equal(contains(pm,2,5),false);
});

test('xiangqi confines the palace and forbids facing generals or exposing check',()=>{
 const palace=xiangqi([[3,8,'rA']]);assert.equal(contains(palace.legalMoves({x:4,y:9}),4,10),false);assert.equal(contains(palace.legalMoves({x:3,y:8}),2,7),false);assert.ok(contains(palace.legalMoves({x:3,y:8}),4,7));
 const facing=xiangqi([[4,5,'rR']]);assert.equal(contains(facing.legalMoves({x:4,y:5}),3,5),false);assert.ok(contains(facing.legalMoves({x:4,y:5}),4,4));
 const check=xiangqi([[0,9,'bR']]);assert.equal(check.getState().inCheck,true);
 assert.equal(check.play(move(4,5,4,4)).ok,false);assert.ok(contains(check.legalMoves({x:4,y:9}),4,8));
});

test('xiangqi stalemate loses, rather than drawing as in chess',()=>{
 const g=puzzle('xiangqi',[[4,0,'bK'],[4,9,'rK'],[3,1,'rR'],[5,1,'rR'],[4,2,'rP']],'b');
 assert.equal(g.getState().inCheck,false);assert.equal(g.getState().phase,'ended');assert.equal(g.getState().status,'no-legal-moves');assert.equal(g.getState().winner,'r');
 const mate=puzzle('xiangqi',[[4,0,'bK'],[4,9,'rK'],[3,1,'rR'],[5,1,'rR'],[4,2,'rR']],'b');assert.equal(mate.getState().inCheck,true);assert.equal(mate.getState().status,'checkmate');
});

test('piece-game computers find a legal mate and return legal replies during play',()=>{
 const chess=createBoardGame('chess',{fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',humanColor:'b',random:()=>0});assert.equal(chess.computerMove().state.status,'checkmate');
 // The free queen on a2 is poisoned: Rxa2 permits ...Re1 mate. A two-ply search must defend its king first.
 const threatened=createBoardGame('chess',{fen:'4r1k1/5ppp/8/8/8/8/q4PPP/R5K1 w - - 0 1',humanColor:'b',random:()=>0});
 assert.equal(threatened.computerMove().ok,true);const defended=threatened.exportState();
 for(const reply of threatened.legalMoves()){const after=play(threatened,reply);assert.notEqual(after.status,'checkmate');assert.equal(threatened.importState(defended).ok,true);}
 for(const kind of ['chess','xiangqi']) {
  const g=createBoardGame(kind,{random:()=>0});
  for(let round=0;round<8&&g.getState().phase==='playing';round++) {
   const human=g.legalMoves();play(g,human[Math.floor(human.length*.4)]);if(g.getState().phase==='ended')break;
   const legal=g.legalMoves(),reply=g.computerMove();assert.equal(reply.ok,true);assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(reply.action)));
  }
 }
});
