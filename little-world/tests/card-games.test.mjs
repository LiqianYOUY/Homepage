import test from 'node:test';
import assert from 'node:assert/strict';
import {createCardGame,makeDoudizhuDeck,classifyDoudizhu,beatsDoudizhu,legalDoudizhuPlays,makeMahjongTiles,mahjongWin,CARD_GAME_RULES} from '../cards-games.js';

const rng=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function cards(ranks){const deck=makeDoudizhuDeck(),used=new Set();return ranks.map(rank=>{const card=deck.find(c=>c.rank===rank&&!used.has(c.id));assert.ok(card,'fixture has at most four cards of a rank');used.add(card.id);return card;});}
function ddzFixture(hands,{humanSeat=0,landlord=0,turn=humanSeat}={}){const game=createCardGame('doudizhu',{humanSeat,random:rng(1),debug:true}),state=game.debugState(),pool=makeDoudizhuDeck();state.hands=hands.map(ranks=>ranks.map(rank=>{const index=pool.findIndex(c=>c.rank===rank);assert.ok(index>=0);return pool.splice(index,1)[0];}));Object.assign(state,{phase:'playing',turn,landlord,bottom:[],lastPlay:null,played:[],history:[],passes:0,winner:null});game.setDebugState(state);return game;}
function mjFixture(hands,{humanSeat=0,turn=humanSeat,melds=[[],[],[],[]],emptyWall=false,lastDraw=true}={}){const game=createCardGame('mahjong',{humanSeat,random:rng(1),debug:true}),state=game.debugState(),pool=makeMahjongTiles();const take=type=>{const index=pool.findIndex(t=>t.type===type);assert.ok(index>=0,'fixture respects four copies per tile');return pool.splice(index,1)[0];};state.hands=hands.map(types=>types.map(take));state.melds=melds.map(list=>list.map(m=>({...m,tiles:m.types.map(take)})));Object.assign(state,{phase:'playing',turn,wall:emptyWall?[]:pool,discards:[],pending:null,lastDraw:lastDraw?{seat:turn,tile:state.hands[turn].at(-1)}:null,canKong:true,winner:null,result:null,history:[]});game.setDebugState(state);return game;}
function assertDdzAccounting(game){const state=game.debugState(),physical=[...state.hands.flat(),...state.played,...(state.landlord===null?state.bottom:[])];assert.equal(physical.length,54);assert.equal(new Set(physical.map(c=>c.id)).size,54);}
function assertMahjongAccounting(game){const state=game.debugState(),physical=[...state.hands.flat(),...state.wall,...state.melds.flatMap(melds=>melds.flatMap(m=>m.tiles)),...state.discards.filter(d=>d.claimedBy===null).map(d=>d.tile),...(state.pending?.reason==='rob-kong'?[state.pending.tile]:[])];assert.equal(physical.length,136);assert.equal(new Set(physical.map(t=>t.id)).size,136);}

test('Dou Dizhu recognises every supported pattern, including repeated single wings',()=>{
 const cases=[[[3],'single'],[[4,4],'pair'],[[5,5,5],'triple'],[[3,3,3,4],'triple-single'],[[3,3,3,4,4],'triple-pair'],[[3,4,5,6,7],'straight'],[[3,3,4,4,5,5],'pair-run'],[[3,3,3,4,4,4],'airplane'],[[3,3,3,4,4,4,5,6],'airplane-single'],[[3,3,3,4,4,4,5,5],'airplane-single'],[[3,3,3,4,4,4,5,5,6,6],'airplane-pair'],[[3,3,3,3,4,5],'four-single'],[[3,3,3,3,4,4],'four-single'],[[3,3,3,3,4,4,5,5],'four-pair'],[[8,8,8,8],'bomb'],[[16,17],'rocket']];
 for(const [ranks,type] of cases)assert.equal(classifyDoudizhu(cards(ranks))?.type,type,String(ranks));
});

test('Dou Dizhu rejects short runs, 2/joker sequences, malformed wings and duplicate selections',()=>{
 for(const ranks of [[3,4,5,6],[3,3,4,4],[11,12,13,14,15],[14,14,14,15,15,15],[3,3,3,4,4,4,16,17],[3,3,3,3,16,17],[3,3,3,3,4,4,4,4],[3,3,3,4,4,4,5,5,5,6,6,6,7,7,7,7]])assert.equal(classifyDoudizhu(cards(ranks)),null,String(ranks));
 const card=makeDoudizhuDeck()[0];assert.equal(classifyDoudizhu([card,card]),null);
 assert.equal(classifyDoudizhu([]),null);assert.equal(classifyDoudizhu([{id:1,rank:18}]),null);
});

test('Dou Dizhu comparisons require a matching shape and length except for bombs and rocket',()=>{
 const pattern=ranks=>classifyDoudizhu(cards(ranks));
 assert.ok(beatsDoudizhu(pattern([4]),pattern([3])));
 assert.equal(beatsDoudizhu(pattern([4,4]),pattern([3])),false);
 assert.equal(beatsDoudizhu(pattern([4,5,6,7,8,9]),pattern([3,4,5,6,7])),false);
 assert.ok(beatsDoudizhu(pattern([3,3,3,3]),pattern([16])));
 assert.equal(beatsDoudizhu(pattern([3,3,3,3,4,4]),pattern([15])),false,'four with two is not a bomb');
 assert.ok(beatsDoudizhu(pattern([4,4,4,4]),pattern([3,3,3,3])));
 assert.ok(beatsDoudizhu(pattern([16,17]),pattern([15,15,15,15])));
 assert.equal(beatsDoudizhu(pattern([15,15,15,15]),pattern([16,17])),false);
});

test('generated Dou Dizhu moves use owned cards and beat the target, and include airplanes with pair wings',()=>{
 const hand=cards([3,3,3,4,4,4,5,5,6,6,7,8,9,10,11,12,13,14,16,17]),target=classifyDoudizhu(cards([3,4,5,6,7]));
 for(const play of legalDoudizhuPlays(hand,target)){assert.ok(play.cardIds.every(id=>hand.some(c=>c.id===id)));assert.ok(beatsDoudizhu(classifyDoudizhu(play.cardIds.map(id=>hand.find(c=>c.id===id))),target));}
 assert.ok(legalDoudizhuPlays(hand).some(p=>p.pattern.type==='airplane-pair'&&p.cardIds.length===10));
 assert.ok(legalDoudizhuPlays(hand).some(p=>p.pattern.type==='rocket'));
});

test('Dou Dizhu deal, bidding and bottom-card ownership are real and public snapshots do not leak or mutate private hands',()=>{
 const game=createCardGame('doudizhu',{random:rng(5),debug:true}),initial=game.getState();
 assert.deepEqual(initial.players.map(p=>p.handCount),[17,17,17]);assert.deepEqual(initial.bottom,[]);assert.equal(initial.bottomCount,3);assertDdzAccounting(game);
 assert.equal(initial.hands,undefined);assert.ok(initial.players.every(p=>!('hand' in p)));
 const card=initial.hand[0];initial.hand.length=0;initial.players[1].handCount=99;assert.equal(game.getState().hand.length,17);assert.equal(game.getState().players[1].handCount,17);
 assert.equal(game.play(null).ok,false);assert.ok(game.play({type:'bid',bid:true}).ok);const awarded=game.getState();assert.equal(awarded.landlord,0);assert.equal(awarded.hand.length,20);assert.equal(awarded.bottom.length,3);assert.ok(awarded.hand.some(c=>c.id===card.id));assertDdzAccounting(game);
 const withoutDebug=createCardGame('doudizhu',{random:rng(5)});assert.equal(withoutDebug.debugState,undefined);assert.equal(withoutDebug.setDebugState,undefined);
 const restarted=game.restart();assert.equal(restarted.phase,'bidding');assert.equal(restarted.hand.length,17);assert.equal(restarted.winner,null);
});

test('all-decline bidding assigns a computer landlord and never forces the declining human',()=>{
 const game=createCardGame('doudizhu',{random:rng(8),debug:true});assert.ok(game.play({type:'bid',bid:false}).ok);
 // Replay the two public declines to isolate the documented all-decline rule from AI hand strength.
 let state=game.debugState();state.turn=0;state.bids=[{seat:1,bid:false},{seat:2,bid:false}];game.setDebugState(state);
 assert.ok(game.play({type:'bid',bid:false}).ok);assert.ok([1,2].includes(game.getState().landlord));assertDdzAccounting(game);
});

test('two Dou Dizhu passes restore the lead; malformed, unowned and repeated card plays leave state unchanged',()=>{
 const game=ddzFixture([[17,3],[4],[5]],{landlord:0});const joker=game.getState().hand.find(c=>c.rank===17);
 assert.equal(game.play({type:'pass'}).ok,false);assert.equal(game.play({type:'play',cardIds:[joker.id,joker.id]}).ok,false);assert.equal(game.play({type:'play',cardIds:[999]}).ok,false);assert.equal(game.getState().hand.length,2);
 assert.ok(game.play({type:'play',cardIds:[joker.id]}).ok);assert.equal(game.computerMove().state.turn,2);assert.ok(game.computerMove().ok);assert.equal(game.getState().turn,0);assert.equal(game.getState().lastPlay,null);assert.equal(game.getState().legalActions.some(a=>a.type==='pass'),false);
 assert.equal(game.play({type:'play',cardIds:[joker.id]}).ok,false,'a card already played cannot be played twice');
});

test('farmer AI cooperates with its partner and either farmer winning wins for the human farmer',()=>{
 const game=ddzFixture([[3,9],[4,8],[5,7]],{landlord:2});assert.ok(game.play({type:'play',cardIds:[game.getState().hand[0].id]}).ok);assert.ok(game.computerMove().ok);assert.equal(game.debugState().history.at(-1).type,'pass');
 const finishing=ddzFixture([[8,9],[4],[3,7]],{landlord:2,turn:1});const result=finishing.computerMove();assert.ok(result.ok);assert.deepEqual(result.state.winner,{seat:1,team:'farmers',humanWon:true});assert.equal(result.state.phase,'finished');assert.equal(finishing.computerMove().ok,false);assert.equal(finishing.play({type:'pass'}).ok,false);
});

test('seeded complete Dou Dizhu matches make only legal moves, conserve 54 cards and terminate',()=>{
 for(let seed=1;seed<=12;seed++){const game=createCardGame('doudizhu',{random:rng(seed),debug:true});let moves=0;while(!game.getState().finished&&moves++<300){const s=game.getState(),result=s.humanTurn?game.play(s.suggestedAction):game.computerMove();assert.ok(result.ok,`seed ${seed}, move ${moves}: ${result.reason}`);assertDdzAccounting(game);}assert.ok(game.getState().winner,`seed ${seed} must finish`);assert.ok(moves<300);}
});

test('Mahjong recognises closed and open standard hands, seven pairs and thirteen orphans',()=>{
 assert.equal(mahjongWin([0,1,2,3,4,5,9,10,11,18,19,20,27,27])?.kind,'standard');
 assert.equal(mahjongWin([3,4,5,9,10,11,18,19,20,27,27],1)?.kind,'standard');
 assert.equal(mahjongWin([27,27],4)?.kind,'standard');
 assert.equal(mahjongWin([0,0,2,2,5,5,9,9,13,13,20,20,31,31])?.kind,'seven-pairs');
 assert.equal(mahjongWin([0,0,0,0,2,2,9,9,13,13,20,20,31,31])?.kind,'seven-pairs');
 assert.equal(mahjongWin([0,8,9,17,18,26,27,28,29,30,31,32,33,33])?.kind,'thirteen-orphans');
 assert.equal(mahjongWin([0,8,9,17,18,26,27,28,29,30,31,32,33,33],1),null);
});

test('Mahjong rejects suit wrapping, honor sequences, extra tiles and impossible duplicate counts',()=>{
 for(const hand of [[7,8,9,10,11,12,18,19,20,21,22,23,27,27],[0,1,2,9,10,11,18,19,20,27,28,29,31,31],[0,0,0,0,0,1,2,9,10,11,18,19,20,20],[0,1,2,3,4,5,9,10,11,18,19,20,27]])assert.equal(mahjongWin(hand),null,String(hand));
 assert.equal(mahjongWin(null),null);assert.equal(mahjongWin([27,27],4.5),null);
});

test('Mahjong starts with 136 unique tiles, one real dealer draw and no concealed opponent information',()=>{
 const game=createCardGame('mahjong',{random:rng(4),debug:true}),state=game.getState();assert.deepEqual(state.players.map(p=>p.handCount),[14,13,13,13]);assert.equal(state.wallCount,83);assert.equal(state.hand.length,14);assertMahjongAccounting(game);
 assert.equal(state.hands,undefined);assert.equal(state.wall,undefined);assert.ok(state.players.every(p=>!('hand' in p)));assert.ok(state.history.every(h=>h.type!=='draw'||!('tile' in h)));assert.equal(game.play(null).ok,false);
 state.hand[0].type=99;state.legalActions.length=0;assert.ok(game.getState().hand[0].type<34);assert.ok(game.getState().legalActions.length>0);
 const botFirst=createCardGame('mahjong',{humanSeat:2,random:rng(4)});assert.equal(botFirst.getState().lastDraw,null);assert.deepEqual(botFirst.getState().legalActions,[]);assert.equal(botFirst.debugState,undefined);assert.equal(botFirst.play({type:'discard',tileId:0}).ok,false);
});

test('Mahjong claim priority is win before pung/kong before chow, and chow is only from the preceding player',()=>{
 const hands=[[4,0,0,1,1,6,6,7,7,8,8,12,12,13],[2,3,5,5,14,14,15,15,16,16,17,17,29],[4,4,20,20,21,21,22,22,23,23,24,24,30],[2,3,9,10,11,18,19,20,27,27,27,28,28]];
 const game=mjFixture(hands,{humanSeat:0});const discard=game.getState().hand.find(t=>t.type===4);assert.ok(game.play({type:'discard',tileId:discard.id}).ok);const s=game.debugState();assert.equal(s.turn,3);assert.equal(s.phase,'claim');assert.equal(s.pending.queue[0].priority,3);assert.equal(s.pending.queue.find(e=>e.priority===2).seat,2);assert.ok(s.pending.queue.filter(e=>e.actions.some(a=>a.kind==='chi')).every(e=>e.seat===1));assert.deepEqual(game.getState().legalActions,[]);
 assert.ok(game.computerMove().ok);assert.equal(game.getState().winner.seat,3);assert.equal(game.getState().winner.source,'discard');assertMahjongAccounting(game);
});

test('simultaneous Mahjong wins follow seat order and stop after the first winner',()=>{
 const game=mjFixture([[27],[0,1,2,9,10,11,18,19,20,28,28,28,27],[],[3,4,5,12,13,14,21,22,23,29,29,29,27]]);
 assert.ok(game.play({type:'discard',tileId:game.getState().hand[0].id}).ok);assert.deepEqual(game.debugState().pending.queue.filter(e=>e.priority===3).map(e=>e.seat),[1,3]);assert.ok(game.computerMove().ok);assert.equal(game.getState().winner.seat,1);assert.equal(game.computerMove().ok,false);assertMahjongAccounting(game);
});

test('a human may pass a winning claim before lower-priority claims; a pung requires a discard without a draw',()=>{
 const game=mjFixture([[4],[2,3],[4,4],[2,3,9,10,11,18,19,20,27,27,27,28,28]],{humanSeat:3,turn:0});const state=game.debugState(),tile=state.hands[0][0];state.hands[0]=[];state.discards=[{seat:0,tile,claimedBy:null}];state.phase='claim';state.pending={reason:'discard',tile,from:0,discardIndex:0,queue:[{seat:3,priority:3,actions:[{type:'claim',kind:'hu'}]},{seat:2,priority:2,actions:[{type:'claim',kind:'peng',tileIds:state.hands[2].map(t=>t.id)}]},{seat:1,priority:1,actions:[{type:'claim',kind:'chi',tileIds:state.hands[1].map(t=>t.id)}]}]};state.turn=3;game.setDebugState(state);const wall=game.getState().wallCount;
 assert.ok(game.play({type:'claim',kind:'pass'}).ok);assert.equal(game.getState().turn,2);assert.ok(game.computerMove().ok);assert.equal(game.getState().turn,2);assert.equal(game.getState().wallCount,wall);assert.equal(game.getState().players[2].melds[0].kind,'peng');assert.equal(game.getState().players[0].discards.length,0);assert.equal(game.getState().pending,null);assertMahjongAccounting(game);
});

test('a chow consumes exactly its two selected tiles and never produces a fabricated self-draw win',()=>{
 const game=mjFixture([[2],[0,1,3,4,5,9,10,11,18,19,20,27,27],[],[]],{humanSeat:1,turn:0}),state=game.debugState(),tile=state.hands[0][0];state.hands[0]=[];state.discards=[{seat:0,tile,claimedBy:null}];state.pending={reason:'discard',tile,from:0,discardIndex:0,queue:[{seat:1,priority:1,actions:[{type:'claim',kind:'chi',tileIds:state.hands[1].slice(0,2).map(t=>t.id)}]}]};state.phase='claim';state.turn=1;game.setDebugState(state);const action=game.getState().legalActions.find(a=>a.kind==='chi'),wall=game.getState().wallCount;
 assert.ok(game.play(action).ok);const after=game.getState();assert.equal(after.wallCount,wall);assert.equal(after.hand.length,11);assert.equal(after.players[1].melds[0].tiles.length,3);assert.equal(after.lastDraw,null);assert.equal(after.legalActions.some(a=>a.type==='hu'),false);assert.equal(game.play({type:'hu'}).ok,false);assert.ok(after.legalActions.every(a=>a.type==='discard'));assertMahjongAccounting(game);
});

test('concealed kong removes four tiles, draws once from the tail, and hides faces from other seats',()=>{
 const game=mjFixture([[0,0,0,0,1,2,3,9,10,11,18,19,20,27],[],[],[]]),before=game.debugState(),tail=before.wall.at(-1),action=game.getState().legalActions.find(a=>a.type==='kong');assert.equal(action.kind,'concealed');assert.ok(game.play(action).ok);const after=game.getState();assert.equal(after.hand.length,11);assert.equal(after.wallCount,before.wall.length-1);assert.equal(after.lastDraw.id,tail.id);assert.equal(after.players[0].melds[0].tiles.length,4);assert.equal(game.play(action).ok,false);assertMahjongAccounting(game);
 const observer=createCardGame('mahjong',{humanSeat:1,debug:true});observer.setDebugState(game.debugState());const hidden=observer.getState();assert.deepEqual(hidden.players[0].melds[0],{kind:'gang',concealed:true,tileCount:4,tiles:[]});assert.equal(hidden.history.find(h=>h.type==='kong').tiles,undefined);assert.equal(hidden.lastDraw,null);
});

test('exposed kong claims a discard and three owned tiles before drawing a single replacement',()=>{
 const game=mjFixture([[0],[0,0,0],[],[]],{humanSeat:1,turn:0}),state=game.debugState(),tile=state.hands[0][0];state.hands[0]=[];state.discards=[{seat:0,tile,claimedBy:null}];state.pending={reason:'discard',tile,from:0,discardIndex:0,queue:[{seat:1,priority:2,actions:[{type:'claim',kind:'gang',tileIds:state.hands[1].map(t=>t.id)}]}]};state.phase='claim';state.turn=1;game.setDebugState(state);const before=game.debugState(),action=game.getState().legalActions.find(a=>a.kind==='gang');assert.ok(game.play(action).ok);const after=game.getState();assert.equal(after.players[1].melds[0].tiles.length,4);assert.equal(after.wallCount,before.wall.length-1);assert.equal(after.lastDraw.id,before.wall.at(-1).id);assert.equal(after.discard[0].claimedBy,1);assertMahjongAccounting(game);
});

test('added kong offers rob-kong wins before completing the meld or drawing a replacement',()=>{
 const game=mjFixture([[4,0,1,2,9,10,11,18,19,20,27],[2,3,12,13,14,21,22,23,28,28,28,29,29],[],[]],{melds:[[{kind:'peng',types:[4,4,4],from:2}],[],[],[]]}),before=game.debugState(),action=game.getState().legalActions.find(a=>a.kind==='added');assert.ok(action);assert.ok(game.play(action).ok);let after=game.getState();assert.equal(after.phase,'claim');assert.equal(after.pending.reason,'rob-kong');assert.equal(after.wallCount,before.wall.length);assert.equal(after.players[0].melds[0].kind,'peng');assertMahjongAccounting(game);assert.ok(game.computerMove().ok);after=game.getState();assert.equal(after.winner.source,'rob-kong');assert.equal(after.winner.seat,1);assert.equal(after.players[0].melds[0].tiles.length,3);assert.equal(after.wallCount,before.wall.length);assertMahjongAccounting(game);
});

test('an unrobbed added kong finishes and draws, and a real self-draw ends the hand',()=>{
 const game=mjFixture([[4,0,1,2,9,10,11,18,19,20,27],[],[],[]],{melds:[[{kind:'peng',types:[4,4,4],from:2}],[],[],[]]}),before=game.debugState(),action=game.getState().legalActions.find(a=>a.kind==='added');assert.ok(game.play(action).ok);const after=game.getState();assert.equal(after.phase,'playing');assert.equal(after.pending,null);assert.equal(after.players[0].melds[0].kind,'gang');assert.equal(after.players[0].melds[0].tiles.length,4);assert.equal(after.lastDraw.id,before.wall.at(-1).id);assertMahjongAccounting(game);
 const winning=mjFixture([[0,1,2,3,4,5,9,10,11,18,19,20,27,27],[],[],[]]);assert.ok(winning.play({type:'hu'}).ok);assert.equal(winning.getState().winner.source,'self-draw');assert.equal(winning.getState().winner.humanWon,true);assert.equal(winning.getState().phase,'finished');assert.equal(winning.play({type:'hu'}).ok,false);assert.equal(winning.computerMove().ok,false);
});

test('empty wall ends in a draw after the final unclaimed discard and cannot fabricate kong replacements',()=>{
 const game=mjFixture([[0,0,0,0,1,2,3,9,10,11,18,19,20,27],[],[],[]],{emptyWall:true});assert.equal(game.getState().legalActions.some(a=>a.type==='kong'),false);const result=game.play({type:'discard',tileId:game.getState().hand.at(-1).id});assert.ok(result.ok);assert.equal(result.state.result,'draw');assert.equal(result.state.phase,'finished');assert.equal(result.state.winner,null);assert.deepEqual(result.state.legalActions,[]);
});

test('seeded complete Mahjong matches use legal actions, conserve 136 physical tiles and finish',()=>{
 for(let seed=1;seed<=16;seed++){const game=createCardGame('mahjong',{random:rng(seed),humanSeat:seed%4,debug:true});let moves=0;while(!game.getState().finished&&moves++<600){const s=game.getState(),result=s.humanTurn?game.play(s.suggestedAction):game.computerMove();assert.ok(result.ok,`seed ${seed}, move ${moves}: ${result.reason}`);assertMahjongAccounting(game);assert.ok(game.getState().history.every(h=>h.type!=='draw'||!h.tile));}assert.ok(game.getState().finished,`seed ${seed} must finish`);assert.ok(moves<600);assert.ok(['win','draw'].includes(game.getState().result));}
});

test('both house-rule explanations include English text and primary rule sources',()=>{
 for(const rules of Object.values(CARD_GAME_RULES)){assert.equal(rules.rules.length,rules.rulesEn.length);assert.ok(rules.sources.length);assert.ok(rules.sources.every(s=>s.url.startsWith('https://')));}
 assert.throws(()=>createCardGame('unknown'),/Unknown card game/);
});
