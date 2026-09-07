import {createBoardGame} from './board-games.js?v=14';
import {createCardGame,CARD_GAME_RULES} from './cards-games.js?v=14';
import {getLanguage,translate,addTranslations} from './i18n.js?v=14';
import {raiseDialog,consumeDialogEscape,isTopDialog} from './dialog-stack.js';

addTranslations({'棋牌桌 · 一起玩一局':'Game table · Play together','棋牌桌':'The game table','关闭棋牌桌':'Close game table'});
export const GAME_NAMES={gomoku:['五子棋','Gomoku'],go:['围棋','Go'],xiangqi:['象棋','Xiangqi'],chess:['国际象棋','Chess'],doudizhu:['斗地主','Dou Dizhu'],mahjong:['麻将','Mahjong']};
const SYMBOLS={rK:'帅',rA:'仕',rE:'相',rH:'马',rR:'车',rC:'炮',rP:'兵'};
const BLACK_XIANGQI={bK:'将',bA:'士',bE:'象',bH:'马',bR:'车',bC:'炮',bP:'卒'};
// Both sides share filled silhouettes; Unicode's white chess glyphs are hollow on many devices.
const CHESS_ART={
 K:{body:'M22 4H26V9H31V13H26V18H22V13H17V9H22Z M14 18C8 16 7 23 11 27L18 31L16 36H32L30 31L37 27C41 23 40 16 34 18C29 21 19 21 14 18Z M14 36H34L37 42H11Z',detail:'M16 31H32'},
 Q:{body:'M9 14L16 21L19 11L24 21L29 11L32 21L39 14L34 31H14Z M16 31H32L31 36H17Z M14 36H34L37 42H11Z M6 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M16 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M26 8a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M36 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',detail:'M16 31H32'},
 R:{body:'M11 7H18V13H21V7H27V13H30V7H37V21H33L31 36H34L37 42H11L14 36H17L15 21H11Z',detail:'M15 21H33M17 36H31'},
 B:{body:'M24 7C34 15 35 22 27 27L29 35H19L21 27C13 22 14 15 24 7Z M15 35H33L37 42H11Z M21 5a3 3 0 1 0 6 0a3 3 0 1 0-6 0',detail:'M23 13L28 18M20 28H28'},
 N:{body:'M16 7L24 11C34 13 38 23 33 35H34L37 42H11L14 35H18C18 29 21 25 25 22L22 20L16 24L9 22L10 17L16 11Z',detail:'M28 17C32 23 28 28 23 32M16 16H17'},
 P:{body:'M17 12a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M20 19H28L27 26L32 32L31 35H17L16 32L21 26Z M14 35H34L37 42H11Z',detail:'M18 32H30'}
};
function chessArtwork(type){
 const art=CHESS_ART[type],svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 48 48');svg.setAttribute('width','48');svg.setAttribute('height','48');svg.setAttribute('class','chess-piece-art');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 for(const [name,d] of Object.entries(art)){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class','chess-piece-'+name);svg.append(path);}
 return svg;
}
const RULES={
 gomoku:['你执黑先行，横、竖或斜线连成五子获胜。本桌不设禁手。','You play black first. Connect five horizontally, vertically or diagonally. No forbidden moves.'],
 go:['你执黑，电脑执白。提走无气的棋子，禁止自杀与立即打劫回提。先提净有争议的死子再停一手，剩余棋子计为活棋。双方连续停一手后数子，白加 6.5 分（贴目）。','You play black. Capture stones without liberties; suicide and immediate ko recapture are prohibited. Play out disputed dead groups before passing; remaining stones count as alive. Two passes end the game. Area scoring; white gets 6.5 points.'],
 xiangqi:['你执红。先点棋子，再点亮起的位置。遵守蹩马腿、塞象眼、炮隔子与将帅不能照面的规则。三次相同局面自动和棋，本桌不裁定比赛长将长捉责任。','You play red. Select a piece, then a highlighted destination. Normal movement and check rules apply. Three repetitions draw automatically; this table does not adjudicate tournament perpetual-chase penalties.'],
 chess:['你执白。先选棋子，再选落点。支持王车易位、吃过路兵与升变；可在侧栏选择升变棋子，默认选后；三次重复和 50 回合规则自动判和。','You play white. Select a piece, then a destination. Castling and en passant are supported. Choose a promotion piece in the sidebar; queen is the default. Threefold repetition and the 50-move rule draw automatically.'],
 doudizhu:['你与两位电脑朋友玩。叫地主后，地主独战两位农民。选中手牌再出牌，同牌型压过上家；炸弹和王炸可越级。先出完牌的一方获胜。','Play with two computer friends. The landlord faces two farmers. Select cards to play a matching stronger combination, or a bomb. The first side to empty a hand wins.'],
 mahjong:['家常四人麻将：136 张、无花牌、不计番。可吃、碰、杠、胡；吃牌限上家。支持四组面子加一对将、七对和十三幺。一人胡牌或牌墙耗尽即结束。','Four-player home rules: 136 tiles, no flowers or scoring points. Chow only from the previous player; pung, kong and win claims are available. Four sets and a pair, seven pairs and thirteen orphans can win. First win or an empty wall ends the round.']
};
const ended=state=>state.finished===true||['ended','finished'].includes(state.phase);
const isCards=kind=>kind==='doudizhu'||kind==='mahjong';
const xy=(a,b)=>a?.x===b?.x&&a?.y===b?.y;
const element=(tag,cls='',text)=>{const node=document.createElement(tag);node.className=cls;if(text!==undefined)node.textContent=text;return node;};

export function createTableGames({THREE,table,register=()=>{}}={}){
 let overlay=null,content=null,header=null,kind=null,selected=null,selectedCards=new Set(),timer=null,thinking=false,previousFocus=null,notice='',disposed=false,promotion='Q';
 const games=new Map();let gameObject=null;
 const copy=(zh,en)=>getLanguage()==='en'?en:zh;
 const title=k=>GAME_NAMES[k][getLanguage()==='en'?1:0];
 const button=(label,action,cls='game-button')=>{const b=element('button',cls,label);b.type='button';b.onclick=action;return b;};
 const current=()=>games.get(kind);
 if(THREE&&table){
  gameObject=new THREE.Group();gameObject.name='Living interactive tabletop games';
  const objects=table.children.filter(o=>/Living (chess board and pieces|tabletop games and cards|playing card deck|face-up playing card|ivory game die|game die dot)/.test(o.name));
  table.add(gameObject);for(const object of objects)gameObject.attach(object);
  const anchor=new THREE.Box3().setFromObject(gameObject).getCenter(new THREE.Vector3()).add(new THREE.Vector3(0,.25,0));
  register({id:'table-games',label:'棋牌桌 · 一起玩一局',kind:'games',object:gameObject,anchor,click:()=>open()});
 }
 function create(kind,options={}){return isCards(kind)?createCardGame(kind,options):createBoardGame(kind,options);}
 function clearTimer(){clearTimeout(timer);timer=null;thinking=false;}
 function selectGame(next){clearTimer();kind=next;selected=null;selectedCards.clear();notice='';if(!games.has(kind))games.set(kind,create(kind));render();queueComputer();}
 function restart(options){if(!options&&kind==='go')options={size:current().getState().board.length};clearTimer();selected=null;selectedCards.clear();notice='';games.set(kind,create(kind,options));render();queueComputer();}
 function needsComputer(state){if(ended(state)||state.winner!=null)return false;return isCards(kind)?!state.legalActions?.length:state.turn!==state.humanColor;}
 function queueComputer(){
  if(!overlay||overlay.hidden||!kind||timer||disposed)return;
  const state=current().getState();if(!needsComputer(state))return;
  thinking=true;updateStatus(state);
  timer=setTimeout(()=>{timer=null;if(disposed||overlay.hidden)return;let result;try{result=current().computerMove();}catch(error){console.error(error);notice=['这一手暂时没有走好，可以重新开一局。','This move could not be completed. You can start a new round.'];}
   thinking=false;render();if(result?.ok)queueComputer();
  },420);
 }
 function act(action){if(thinking||!current())return;const result=current().play(action);if(!result?.ok){notice=['这一步不符合当前规则，请换一个选择。','That move is not legal here. Please choose another.'];updateStatus(current().getState());return;}
  selected=null;selectedCards.clear();notice='';render();queueComputer();
 }
 function statusText(state){
  if(notice)return copy(...notice);
  if(ended(state)||state.winner!=null){
   if(state.winner==='draw'||state.winner===null)return copy('这一局平局。再来一局吧。','A draw. Shall we play again?');
   if(!isCards(kind))return state.winner===state.humanColor?copy('你赢啦，这一局下得好。','You win. Well played!'):copy('电脑赢了这一局。再来试试吧。','The computer wins this round. Try again.');
   if(typeof state.winner?.humanWon==='boolean')return state.winner.humanWon?copy(kind==='mahjong'?'你胡牌啦！':'你这一方赢啦！','You win!'):copy('这一局由电脑朋友获胜。','Your computer friend wins this round.');
   const winner=typeof state.winner==='object'?state.winner.seat:state.winner;
   if(kind==='mahjong')return winner===state.humanSeat?copy('你胡牌啦！','You win!'):copy(`电脑 ${Number(winner)+1} 胡牌了。`,`Computer ${Number(winner)+1} wins.`);
   const humanRole=state.players?.[state.humanSeat]?.role,won=winner===state.humanSeat||winner===humanRole||(winner==='farmers'&&humanRole==='farmer');
   return won?copy('你这一方赢啦！','Your side wins!'):copy('这一局由对方获胜。','The other side wins this round.');
  }
  if(thinking)return copy('电脑正在想这一手…','Your opponent is thinking…');
  if(isCards(kind)){if(state.phase==='bidding')return copy('这一局要叫地主吗？','Would you like to call landlord?');return copy('轮到你了。','Your turn.');}
  if(state.inCheck&&state.turn===state.humanColor)return copy('将军了，轮到你应将。','Check — your move.');
  return state.turn===state.humanColor?copy('轮到你了。','Your turn.'):copy('轮到电脑了。','Computer’s turn.');
 }
 function updateStatus(state){const status=overlay?.querySelector('.game-status');if(status)status.textContent=statusText(state);}
 function lobby(){
  const intro=element('div','game-lobby-intro');intro.append(element('p','game-kicker','A LITTLE PLAY AT HOME'),element('h2','',copy('坐下来，玩一局。','Take a seat. Play a round.')),element('p','',copy('和电脑朋友一起，从熟悉的一盘开始。','Start with a familiar game and a computer friend.')));content.append(intro);
  const grid=element('div','game-lobby-grid');
  const marks={gomoku:'● ○',go:'●',xiangqi:'将 帅',chess:'♞ ♙',doudizhu:'♠ ♥',mahjong:'中 發'};
  for(const k of Object.keys(GAME_NAMES)){const b=button('',()=>selectGame(k),'game-choice');b.append(element('span','game-choice-mark',marks[k]),element('strong','',title(k)),element('span','',copy(isCards(k)?'和电脑朋友开一桌':'你与电脑对弈',isCards(k)?'A table with computer friends':'You and a computer opponent')));grid.append(b);}content.append(grid);
 }
 function selectSquare(x,y,state){
  if(thinking||ended(state)||state.turn!==state.humanColor)return;
  if(kind==='gomoku'||kind==='go'){act({type:'place',x,y});return;}
  const legal=current().legalMoves(selected||undefined);
  if(selected){const candidates=legal.filter(m=>xy(m.from,selected)&&xy(m.to,{x,y})),move=candidates.find(m=>m.promotion===promotion)||candidates[0];if(move){act(move);return;}}
  selected=state.board[y][x]?.startsWith(state.humanColor)?{x,y}:null;notice='';render({focus:{x,y}});
 }
 function board(state){
  const area=element('div','game-board-area'),rows=state.board.length,cols=state.board[0].length;
  const grid=element('div',`game-board game-board-${kind}`);grid.dataset.size=cols;grid.style.setProperty('--cols',cols);grid.style.setProperty('--rows',rows);grid.setAttribute('role','grid');grid.setAttribute('aria-label',title(kind));
  const available=selected?current().legalMoves(selected):[],last=state.lastMove?.to||state.lastMove;
  for(let y=0;y<rows;y++){const row=element('div','game-board-row');row.setAttribute('role','row');for(let x=0;x<cols;x++){
   const piece=state.board[y][x],cell=button('',()=>selectSquare(x,y,current().getState()),'game-cell');cell.dataset.x=x;cell.dataset.y=y;cell.setAttribute('role','gridcell');
   cell.classList.toggle('dark-square',(x+y)%2===1);cell.classList.toggle('selected',xy(selected,{x,y}));cell.classList.toggle('legal',available.some(m=>xy(m.to,{x,y})));cell.classList.toggle('last-move',xy(last,{x,y}));cell.classList.toggle('edge-left',x===0);cell.classList.toggle('edge-right',x===cols-1);cell.classList.toggle('edge-top',y===0);cell.classList.toggle('edge-bottom',y===rows-1);
   const symbol=kind==='xiangqi'?(BLACK_XIANGQI[piece]||SYMBOLS[piece]):SYMBOLS[piece];
   const pieceNames=kind==='xiangqi'?{K:['将帅','General'],A:['士','Advisor'],E:['象','Elephant'],H:['马','Horse'],R:['车','Chariot'],C:['炮','Cannon'],P:['兵卒','Soldier']}:{K:['王','King'],Q:['后','Queen'],R:['车','Rook'],B:['象','Bishop'],N:['马','Knight'],P:['兵','Pawn']};
   const label=!piece?copy('空位','Empty'):piece.length===1?(piece==='b'?copy('黑子','Black stone'):copy('白子','White stone')):(piece[0]==='r'?copy('红','Red '):piece[0]==='w'?copy('白','White '):copy('黑','Black '))+copy(...pieceNames[piece[1]]);cell.setAttribute('aria-label',`${label} · ${String.fromCharCode(65+x)}${rows-y}`);cell.setAttribute('aria-selected',String(xy(selected,{x,y})));cell.tabIndex=(selected?xy(selected,{x,y}):x===Math.floor(cols/2)&&y===Math.floor(rows/2))?0:-1;
   cell.onkeydown=e=>{const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},d=offsets[e.key];if(d){e.preventDefault();const next=grid.querySelector(`[data-x="${Math.max(0,Math.min(cols-1,x+d[0]))}"][data-y="${Math.max(0,Math.min(rows-1,y+d[1]))}"]`);cell.tabIndex=-1;next.tabIndex=0;next.focus();}};
   if(piece){const span=element('span',`game-piece color-${piece[0]}`,kind==='chess'?'':symbol||'');span.setAttribute('aria-hidden','true');if(kind==='chess')span.append(chessArtwork(piece[1]));cell.append(span);}row.append(cell);
  }grid.append(row);}
  if(kind==='xiangqi'){const river=element('div','game-river');river.append(element('span','','楚 河'),element('span','','汉 界'));river.setAttribute('aria-hidden','true');grid.append(river);}
  area.append(grid);return area;
 }
 function actionLabel(action){
  if(action.label)return getLanguage()==='en'?(action.labelEn||action.label):action.label;
  if(action.type==='bid')return action.bid?copy('叫地主','Call landlord'):copy('不叫','Pass the bid');
  if(action.type==='hu'||action.kind==='hu')return copy('胡牌','Win');
  if(action.type==='kong'||action.kind==='gang')return copy('杠','Kong');
  if(action.kind==='peng')return copy('碰','Pung');
  if(action.kind==='chi')return copy('吃','Chow');
  if(action.type==='pass'||action.kind==='pass')return copy('过','Pass');
  return copy('继续','Continue');
 }
 const itemLabel=item=>(getLanguage()==='en'?item?.labelEn:null)||item?.label||item?.name||String(item?.rank??item?.type??'');
 function cardFace(item,{selectable=false,tile=false}={}){
  const label=tile?(item?.label||itemLabel(item)):getLanguage()==='en'&&item.rank>=16?'Jkr':itemLabel(item),b=selectable?button('',()=>{if(thinking||!current().getState().humanTurn)return;if(selectedCards.has(item.id))selectedCards.delete(item.id);else{if(kind==='mahjong')selectedCards.clear();selectedCards.add(item.id);}render();},`game-card ${tile?'mahjong-tile':''}`):element('span',`game-card ${tile?'mahjong-tile':''}`);
  b.classList.toggle('red-card',item.red===true||/[♥♦红中]/.test(label)||['hearts','diamonds','h','d'].includes(item.suit));b.classList.toggle('picked',selectedCards.has(item.id));b.append(element('span','',label));
  b.setAttribute('title',itemLabel(item));b.setAttribute('aria-label',itemLabel(item));
  if(selectable){b.setAttribute('aria-pressed',String(selectedCards.has(item.id)));b.setAttribute('aria-label',itemLabel(item));b.dataset.cardId=item.id;}
  return b;
 }
 function cards(state){
  const surface=element('div',`game-card-table ${kind}`),opponents=element('div','game-opponents');
  for(const player of state.players||[]){if(player.seat===state.humanSeat)continue;const p=element('div','game-opponent');p.classList.toggle('is-turn',state.turn===player.seat);p.append(element('span','game-opponent-mark',kind==='mahjong'?(getLanguage()==='en'?['E','S','W','N']:['东','南','西','北'])[player.seat]:'♠'),element('strong','',copy(`电脑 ${player.seat}`,`Computer ${player.seat}`)),element('small','',copy(`${player.handCount} ${kind==='mahjong'?'张':'张牌'}`,`${player.handCount} ${kind==='mahjong'?'tiles':'cards'}`)));
   if(player.role)p.append(element('small','',player.role==='landlord'?copy('地主','Landlord'):copy('农民','Farmer')));
   const melds=element('div','game-melds');for(const meld of player.melds||[]){if(meld.concealed&&!(meld.tiles?.length)){for(let i=0;i<(meld.tileCount||4);i++){const back=element('span','game-card mahjong-tile game-card-back');back.setAttribute('aria-label',copy('暗牌','Hidden tile'));melds.append(back);}}else for(const tile of meld.tiles||meld.cards||[])melds.append(cardFace(typeof tile==='object'?tile:{label:String(tile)},{tile:kind==='mahjong'}));}p.append(melds);opponents.append(p);
  }surface.append(opponents);
  const centre=element('div','game-table-centre');
  if(kind==='doudizhu'){
   const last=state.lastPlay;centre.append(element('p','game-small',last?copy('桌面上这一手','The current play'):copy('选好手牌，再出牌','Choose your cards, then play')));
   const played=element('div','game-played');for(const card of last?.cards||[])played.append(cardFace(card));centre.append(played);
   if(state.bottom?.length){const bottom=element('p','game-small',copy('底牌：','Bottom cards: ')+state.bottom.map(itemLabel).join(' '));centre.append(bottom);}
  }else{
   centre.append(element('p','game-small',copy(`牌墙还剩 ${state.wallCount??state.wallRemaining??'—'} 张`,`Wall: ${state.wallCount??state.wallRemaining??'—'} tiles left`)));
   const discarded=element('div','game-discarded');const values=Array.isArray(state.discard)?state.discard:Array.isArray(state.discards)?state.discards:[];
   for(const value of values.filter(value=>value.claimedBy==null).slice(-28)){const tile=value.tile||value;discarded.append(cardFace(tile,{tile:true}));}centre.append(discarded);if(state.pending?.tile){const pending=element('div','game-pending');pending.append(element('small','',state.pending.reason==='rob-kong'?copy('正在加杠的牌','Tile being added to a kong'):copy('刚打出的牌','Latest discard')),cardFace(state.pending.tile,{tile:true}));centre.append(pending);}
  }if(state.message){let message=(getLanguage()==='en'?state.messageEn:null)||state.message;message=message.replace(/玩家 (\d)|Player (\d)/g,(_,zh,en)=>{const seat=Number(zh||en)-1;return seat===state.humanSeat?copy('你','You'):copy(`电脑 ${seat}`,`Computer ${seat}`);});centre.append(element('p','game-small',message));}surface.append(centre);
  const handLabel=element('p','game-hand-label',copy('你的手牌','Your hand'));if(state.players?.[state.humanSeat]?.role)handLabel.append(element('span','',state.players[state.humanSeat].role==='landlord'?copy(' · 地主',' · Landlord'):copy(' · 农民',' · Farmer')));surface.append(handLabel);
  const hand=element('div','game-hand');for(const item of state.hand||[])hand.append(cardFace(item,{selectable:!thinking&&!ended(state)&&state.humanTurn,tile:kind==='mahjong'}));surface.append(hand);
  const humanMelds=element('div','game-melds game-own-melds');for(const meld of state.players?.[state.humanSeat]?.melds||[])for(const tile of meld.tiles||[])humanMelds.append(cardFace(tile,{tile:true}));surface.append(humanMelds);
  const actions=element('div','game-actions');
  if(kind==='doudizhu'&&state.phase!=='bidding'&&state.legalActions?.some(a=>a.type==='play')){const play=button(copy('出牌','Play cards'),()=>act({type:'play',cardIds:[...selectedCards]}),'game-button primary');play.disabled=thinking||!selectedCards.size;actions.append(play);}
  if(kind==='mahjong'&&state.legalActions?.some(a=>a.type==='discard')){const play=button(copy('打出选中的牌','Discard selected tile'),()=>act({type:'discard',tileId:[...selectedCards][0]}),'game-button primary');play.disabled=thinking||selectedCards.size!==1;actions.append(play);}
  for(const action of state.legalActions||[]){if(['play','discard'].includes(action.type))continue;const b=button(actionLabel(action),()=>act(action));b.disabled=thinking;const ids=action.tileIds||[];if(ids.length&&action.kind==='chi')b.append(element('small','',ids.map(id=>itemLabel(state.hand.find(t=>t.id===id))).join(' · ')));actions.append(b);}
  if(state.suggestedAction?.cardIds||state.suggestedAction?.tileId!=null){const hint=button(copy('提示','Hint'),()=>{selectedCards=new Set(state.suggestedAction.cardIds||[state.suggestedAction.tileId]);render();});hint.disabled=thinking;actions.append(hint);}surface.append(actions);return surface;
 }
 function render({focus}={}){
  if(!content||overlay.hidden)return;
  const active=document.activeElement,activeCard=active?.dataset.cardId,activeSquare=active?.dataset.x!==undefined?{x:Number(active.dataset.x),y:Number(active.dataset.y)}:null,hadFocus=overlay.contains(active)&&active!==overlay,headerFocus=active?.classList.contains('game-back')?'game-back':active?.classList.contains('game-close')?'game-close':null;content.replaceChildren();header.replaceChildren();
  const back=button(copy('‹ 棋牌桌','‹ Game table'),()=>{clearTimer();kind=null;render();},'game-back');back.disabled=!kind;header.append(back,button('×',close,'game-close'));header.lastChild.setAttribute('aria-label',copy('关闭棋牌桌','Close game table'));
  if(!kind){lobby();if(hadFocus)content.querySelector('button')?.focus({preventScroll:true});return;}
  const state=current().getState(),top=element('div','game-top');top.append(element('div','game-kicker',copy('和电脑一起玩','PLAY WITH A COMPUTER FRIEND')),element('h2','',title(kind)));
  const status=element('p','game-status',statusText(state));status.setAttribute('role','status');status.setAttribute('aria-live','polite');top.append(status);content.append(top);
  const layout=element('div',`game-layout ${isCards(kind)?'cards-layout':''}`);layout.append(isCards(kind)?cards(state):board(state));
  const aside=element('aside','game-aside'),actions=element('div','game-actions');
  if(kind==='go'){const pass=button(copy('停一手','Pass'),()=>act({type:'pass'}));pass.disabled=thinking||ended(state)||state.turn!==state.humanColor;actions.append(pass);}
  actions.append(button(copy('重新开始','New round'),()=>restart()));aside.append(actions);
  if(kind==='go'){const sizeLabel=element('label','game-size',copy('棋盘大小','Board size')),select=element('select');for(const size of [9,19]){const option=element('option','',`${size} × ${size}`);option.value=size;option.selected=size===state.board.length;select.append(option);}select.onchange=()=>restart({size:Number(select.value)});sizeLabel.append(select);aside.append(sizeLabel);}
  if(kind==='chess'){const label=element('label','game-size',copy('兵升变为','Promote pawn to')),select=element('select');for(const [value,zh,en] of [['Q','后','Queen'],['R','车','Rook'],['B','象','Bishop'],['N','马','Knight']]){const option=element('option','',copy(zh,en));option.value=value;option.selected=value===promotion;select.append(option);}select.onchange=()=>{promotion=select.value;};label.append(select);aside.append(label);}
  const rules=element('details','game-rules');rules.open=!isCards(kind);rules.append(element('summary','',copy('这一桌的规则','At this table')));for(const line of isCards(kind)?CARD_GAME_RULES[kind][getLanguage()==='en'?'rulesEn':'rules']:[RULES[kind][getLanguage()==='en'?1:0]])rules.append(element('p','',line));aside.append(rules);
  aside.append(element('p','game-small',copy('轻松玩，不计积分。本页停留期间，关掉窗口也会保留这一局。','Just for fun, without stakes or points. Your round stays here while this page is open.')));
  if(state.score)aside.append(element('p','game-score',copy('黑','Black')+`: ${state.score.b??state.score.black??'—'} · `+copy('白','White')+`: ${state.score.w??state.score.white??'—'}`));
  layout.append(aside);content.append(layout);
  const square=focus||activeSquare;let restore=square?content.querySelector(`[data-x="${square.x}"][data-y="${square.y}"]`):activeCard!==undefined?content.querySelector(`[data-card-id="${activeCard}"]`):headerFocus?header.querySelector('.'+headerFocus):null;
  if(!restore&&hadFocus)restore=content.querySelector('.game-cell[tabindex="0"],.game-hand button,.game-actions button:not(:disabled)')||header.lastChild;
  if(restore){if(restore.classList.contains('game-cell')){for(const cell of content.querySelectorAll('.game-cell'))cell.tabIndex=cell===restore?0:-1;}restore.focus({preventScroll:true});}
 }
 function close(){clearTimer();if(overlay)overlay.hidden=true;previousFocus?.focus?.({preventScroll:true});}
 function onKey(event){if(!overlay||overlay.hidden||!isTopDialog(overlay))return;if(consumeDialogEscape(event,overlay)){close();return;}if(event.key==='Tab'){
  const focusable=[...overlay.querySelectorAll('button:not(:disabled),select,summary,[tabindex="0"]')].filter(n=>n.tabIndex>=0),first=focusable[0],last=focusable.at(-1);if(!overlay.contains(document.activeElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}else if(event.shiftKey&&(document.activeElement===first||document.activeElement===overlay)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 }}
 function open(next){
  previousFocus=document.activeElement;if(!overlay){const link=element('link');link.rel='stylesheet';link.href=new URL('./table-games.css?v=20',import.meta.url).href;document.head.append(link);
   overlay=element('div','table-games-overlay');overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',translate('棋牌桌'));overlay.tabIndex=-1;const panel=element('section','table-games-dialog');header=element('header','game-header');content=element('div','game-content');panel.append(header,content);overlay.append(panel);overlay.onclick=e=>{if(e.target===overlay)close();};document.body.append(overlay);document.addEventListener('keydown',onKey,true);
  }overlay.hidden=false;if(next&&GAME_NAMES[next])selectGame(next);else{render();queueComputer();}raiseDialog(overlay);overlay.focus({preventScroll:true});
 }
 const languageChanged=()=>{if(overlay){overlay.setAttribute('aria-label',translate('棋牌桌'));render();}};window.addEventListener('little-world:languagechange',languageChanged);
 return {open,close,getGame:()=>current(),getKind:()=>kind,object:gameObject,dispose(){disposed=true;clearTimer();close();overlay?.remove();document.removeEventListener('keydown',onKey,true);window.removeEventListener('little-world:languagechange',languageChanged);}};
}
