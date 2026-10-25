'use strict';
// First session (FTUE): two guided runs, the shelter and the cats; the other tabs open once it is done.
// Loaded last, after analytics.js: wraps start, finish, renderRewards and step from the outside.
// Progress lives in save.tutorial, one-off hints after it in save.tips. Events: ANALYTICS.md, "Обучение".
(()=>{
const STEPS=['welcome','move','catch','stack','deliver','reward','room','collect','play2','run2','result2','cats','upgrade'];
const RUN1=['welcome','move','catch','stack','deliver'];
const remote=OMC.remote||{};
const track=(name,params={})=>{if(OMC.analytics)OMC.call('track',{name,params})};
const sec=from=>Math.max(0,Math.round((Date.now()-(from||Date.now()))/1000));
// Players who already ran before this build (and the "tutorial_enabled = 0" test group) never see it.
function tut(){
 if(!save.tutorial)save.tutorial=save.runs||save.total||remote.tutorial_enabled===0?{done:true,legacy:true}:{step:'welcome',at:Date.now(),stepAt:Date.now()};
 return save.tutorial;
}
const tips=()=>save.tips||(save.tips=[]);
const active=()=>!tut().done;
const is=(...steps)=>active()&&steps.includes(tut().step);

function go(step){
 const t=tut();if(t.done||t.step===step)return;
 const i=STEPS.indexOf(t.step);
 track('tutorial_step',{step:t.step,step_index:i+1,sec:sec(t.stepAt)});
 t.step=step;t.stepAt=Date.now();persist();sync();
}
function complete(skipped=false){
 const t=tut();if(t.done)return;
 track(skipped?'tutorial_skip':'tutorial_complete',{step:t.step,step_index:STEPS.indexOf(t.step)+1,sec:sec(t.at),runs:save.runs});
 OMC.analytics&&OMC.call('userProps',{props:{tutorial:skipped?'skipped':'done'}});
 save.tutorial={done:true,skipped,at:t.at,doneAt:Date.now()};
 persist();clearUI();sync();
 if(!skipped)reveal();
}

// ---------- UI pieces: a coach card, a spotlight with a hole, the drag hint and the welcome sheet ----------
const coach=document.createElement('div');coach.className='ftue-coach';coach.hidden=true;coach.setAttribute('role','status');
const spot=document.createElement('div');spot.className='ftue-spot';spot.hidden=true;
const drag=document.createElement('div');drag.className='ftue-drag';drag.hidden=true;drag.innerHTML='<span class="ftue-finger">👆</span><i>‹</i><i>›</i>';
document.body.append(spot,coach);
document.querySelector('.game-shell')?.append(drag);
let spotTarget=null,blocking=false,coachKey='',anchor=null;

const face=()=>`<img class="ftue-face" src="${catImages[0]}" alt="">`;
function showCoach(key,html,{target=null,place='auto',game=false}={}){
 if(coachKey!==key){coach.innerHTML=face()+`<div class="ftue-text">${html}</div>`;coachKey=key}
 coach.hidden=false;coach.classList.toggle('in-game',game);anchor=target?{target,place}:null;
}
function hideCoach(){coach.hidden=true;coachKey='';anchor=null}
function showSpot(target,block){spotTarget=target;blocking=block;spot.hidden=!target}
function hideSpot(){spotTarget=null;blocking=false;spot.hidden=true}
function clearUI(){hideCoach();hideSpot();drag.hidden=true;document.querySelectorAll('.ftue-callout').forEach(n=>n.remove())}

// Keeps the spotlight and the coach card on their target while the page scrolls or the tower moves.
function place(){
 if(spotTarget&&!spot.hidden){
  // Several targets (a note and its button) share one hole.
  const rs=[].concat(spotTarget).map(n=>n.getBoundingClientRect()).filter(r=>r.width),pad=6;
  const r=rs.length?{left:Math.min(...rs.map(r=>r.left)),top:Math.min(...rs.map(r=>r.top)),width:Math.max(...rs.map(r=>r.right))-Math.min(...rs.map(r=>r.left)),height:Math.max(...rs.map(r=>r.bottom))-Math.min(...rs.map(r=>r.top))}:{width:0};
  if(!r.width){spot.style.opacity=0}else{
   spot.style.opacity=1;
   Object.assign(spot.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
  }
 }
 if(!coach.hidden){
  if(anchor){
   const r=anchor.target.getBoundingClientRect(),h=coach.offsetHeight,vh=innerHeight;
   const below=anchor.place==='below'||(anchor.place==='auto'&&r.top+r.height/2<vh/2);
   coach.style.top=(below?Math.min(vh-h-12,r.bottom+14):Math.max(12,r.top-h-14))+'px';
   coach.style.bottom='auto';
  }else if(!coach.classList.contains('in-game')){coach.style.top='auto';coach.style.bottom=''}
  else{coach.style.top='';coach.style.bottom=''}
 }
 if(!drag.hidden&&board){
  // The tray in canvas pixels, then in CSS pixels of the shell.
  const c=canvas.getBoundingClientRect(),sh=drag.parentElement.getBoundingClientRect(),k=c.width/440;
  const x=220+(board.position.x-220)*viewScale,y=525+FIELD_OFFSET+cameraY;
  drag.style.left=c.left-sh.left+x*k+'px';drag.style.top=c.top-sh.top+(y+46)*c.height/FIELD_HEIGHT+'px';
 }
 requestAnimationFrame(place);
}
requestAnimationFrame(place);

// While a step points at one thing, taps elsewhere do nothing (scrolling still works).
document.addEventListener('click',e=>{
 // Only real taps: the game itself clicks hidden tab buttons to switch panes.
 if(!blocking||!e.isTrusted)return;
 if(e.target.closest('.ftue-coach,.ftue-welcome')||[].concat(spotTarget||[]).some(n=>n.contains(e.target)))return;
 e.preventDefault();e.stopImmediatePropagation();
},true);

// ---------- Welcome sheet: the first screen of a fresh install ----------
const welcome=document.createElement('dialog');welcome.className='ftue-welcome';welcome.setAttribute('aria-label','Добро пожаловать');
document.body.append(welcome);
function openWelcome(){
 if(welcome.open)return;
 welcome.innerHTML=`<div class="ftue-trio">${[1,0,2].map(i=>`<img src="${catImages[i]}" alt="${TYPES[i].name}">`).join('')}</div>
 <span class="eyebrow">ПРИЮТ ОТКРЫТ. ПОЧТИ.</span><h2>Котам нужен дом</h2>
 <p>На улице холодно, а у тебя — поднос и пустой приют. Лови котов и вези их домой.</p>
 <button class="primary" id="ftueGo">СПАСТИ ПЕРВЫХ КОТОВ ↗</button>
 <button class="text-btn" id="ftueSkip">Я уже умею — пропустить</button>`;
 welcome.showModal();
 if(!tut().begun){tut().begun=true;persist();track('tutorial_begin',{})}
}
welcome.addEventListener('cancel',e=>e.preventDefault());
welcome.addEventListener('click',e=>{
 if(e.target.closest('#ftueGo')){welcome.close();start()}
 if(e.target.closest('#ftueSkip')){welcome.close();complete(true)}
});

// ---------- Runs ----------
// Tutorial runs skip "Перед рейсом" and the first one quietly carries three nets.
let moveFrom=220;
const baseStartTut=start;
start=function(challenge=null){
 if(!active()||challenge||phase==='playing'||phase==='paused')return baseStartTut(challenge);
 const t=tut();
 // A run after the guided part (from the result screen) ends the tutorial.
 if(is('result2','cats','upgrade')){complete();return baseStartTut(challenge)}
 const snap=taskSnapshot();
 baseStartMeta(null);
 if(phase!=='playing')return;
 runTasks=snap;
 if(typeof mobileScreen==='function')mobileScreen('game');
 if(RUN1.includes(t.step)||t.step==='reward'){
  livesLeft+=3;moveFrom=board.position.x;hud();
  if(t.step==='welcome')go('move');else if(t.retry){t.retry=false;go('catch')}
 }else go('run2');
 sync();
};
// Hold the drop until the tray has moved, and again while we point at "В приют".
const baseStepTut=step;
step=function(dt){
 if(phase==='playing'&&!pending&&is('move','deliver'))spawnIn=Math.max(spawnIn,.35);
 baseStepTut(dt);
};
const baseFinishTut=finish;
finish=function(delivered=false,challengeDone=false){
 const was=phase,step0=active()?tut().step:null,fell=!delivered&&!challengeMode;
 baseFinishTut(delivered,challengeDone);
 if(was===phase||phase!=='result')return;
 if(step0&&RUN1.includes(step0)){
  if(deliveryReceipt)go('reward');
  else{tut().retry=true;persist();callout('Кот сорвался — ничего страшного. Попробуем ещё раз: поймай троих и жми «В приют».',{hide:['#resultShare','#backLobby','#rescueHalf','.rescue-note'],spot:'#restart'})}
 }else if(step0==='run2')go('result2');
 else if(!active()&&fell&&!tips().includes('fail'))tipFail();
 sync();
};
const baseRewardsTut=renderRewards;
renderRewards=function(animate=true){baseRewardsTut(animate);sync()};

// A note inside the result card, above its buttons.
function callout(html,{hide=[],spot:sel=null,block=false}={}){
 const card=document.querySelector('#overlay .overlay-card');if(!card)return;
 card.querySelector('.ftue-callout')?.remove();
 for(const s of hide)card.querySelectorAll(s).forEach(n=>n.hidden=true);
 const box=document.createElement('div');box.className='ftue-callout';box.innerHTML=face()+`<p>${html}</p>`;
 const grid=card.querySelector('.reward-grid');
 if(grid)grid.after(box);else card.querySelector('button:not([hidden])')?.before(box);
 if(sel)showSpot([box,card.querySelector(sel)].filter(Boolean),block);
}

// ---------- What each step shows, re-evaluated on a timer (cheap, idempotent) ----------
let lastScore=-1,run2Shown=0;
function sync(){
 document.body.classList.toggle('ftue',active());
 if(!active())return;
 const t=tut(),s=t.step,inGame=document.body.dataset.screen==='game',playing=phase==='playing';
 if(s!=='welcome'&&welcome.open)welcome.close();
 if(s==='welcome'){if(!inGame&&!document.querySelector('dialog[open]:not(.ftue-welcome)'))openWelcome();return}
 if(RUN1.includes(s)){
  if(!inGame||phase==='result'){drag.hidden=true;hideCoach();if(!inGame){hideCoach();showSpot($('mobilePlay'),true);showCoach('resume','Коты ждут на улице. Продолжим спасение?',{target:$('mobilePlay')})}return}
  if(!playing){hideCoach();drag.hidden=true;return}
  if(s!=='deliver')hideSpot();
  if(s==='move'){
   drag.hidden=false;
   showCoach('move','<b>Веди пальцем по экрану</b> — поднос поедет следом.',{game:true});
   if(Math.abs(board.position.x-moveFrom)>40)go('catch');
  }else if(s==='catch'){
   drag.hidden=true;
   showCoach('catch',`<b>${TYPES[nextType].name} уже летит!</b> Подставь под него поднос.`,{game:true});
   if(score>=1)go('stack');
  }else if(s==='stack'){
   if(lastScore!==score)coachKey='';lastScore=score;
   showCoach('stack',`<b>Первый пошёл!</b> Поймай ещё ${3-score>1?'двоих':'одного'} — строй башню.`,{game:true});
   if(score>=3)go('deliver');
  }else if(s==='deliver'){
   showSpot($('cashOut'),false);
   showCoach('deliver','<b>Коты в безопасности только дома.</b> Жми «В приют», пока башня стоит!',{target:$('cashOutBar'),place:'above'});
  }
  return;
 }
 // Relaunched between steps: move on instead of waiting for a screen that is gone.
 if(s==='reward'&&!inGame){giftBank();go('room');return}
 if(s==='result2'&&!inGame){go('cats');return}
 if(s==='reward'&&phase==='result'&&inGame){
  const room=Economy.rooms[0],full=Economy.stats(save,0).active;
  hideCoach();
  if(!document.querySelector('#overlay .ftue-callout'))callout(`<b>Добро пожаловать домой!</b> ${full?`Комната «${room.name}» собрана — приют начал зарабатывать.`:'Новые жители уже в приюте.'}`,{hide:['#restart'],spot:'#backLobby',block:true});
  return;
 }
 if(s==='room'||s==='collect'||s==='play2'){
  if(inGame){hideCoach();hideSpot();return}
  if(s==='room'){
   const r=document.querySelector('#roomsList .puzzle-room');if(!r)return;
   if(!t.scrolled){t.scrolled=1;r.scrollIntoView({block:'center'})}
   showSpot(r,true);
   showCoach('room',`<b>Это твоя первая комната.</b> Когда все жители на месте, она копит монеты — даже если игра закрыта.<button class="primary" data-ftue-next="collect">Дальше</button>`,{target:r});
  }else if(s==='collect'){
   const b=$('collectIncome');
   if(t.scrolled<2){t.scrolled=2;b.scrollIntoView({block:'center'})}
   showSpot(b.closest('.income-summary')||b,true);
   showCoach('collect','<b>Первая выручка уже ждёт.</b> Забери её из копилки!',{target:b});
  }else{
   const next=Economy.milestones.find(m=>!save.owned[m.type]);
   showSpot($('mobilePlay'),true);
   showCoach('play2',`<b>Теперь сам.</b> ${next?`${TYPES[next.type].name} будет №${next.at} в башне — новый житель. Довезёшь?`:'Построй башню повыше и довези её домой.'}`,{target:$('mobilePlay')});
  }
  return;
 }
 if(s==='run2'){
  hideSpot();
  if(!inGame||!playing){hideCoach();return}
  if(!run2Shown)run2Shown=Date.now();
  if(score<2&&Date.now()-run2Shown<9000)showCoach('risk','<b>Чем выше башня, тем больше монет.</b> Но если кот упадёт — домой не поедет никто.',{game:true});
  else if(score>=4&&score<7)showCoach('greed','Страшно? Жми «В приют» — коты и монеты будут твоими.',{target:$('cashOutBar'),place:'above'});
  else hideCoach();
  return;
 }
 if(s==='result2'&&phase==='result'&&inGame){
  hideCoach();
  if(!document.querySelector('#overlay .ftue-callout'))callout(deliveryReceipt?'<b>Отличный рейс!</b> Повторные коты — это копии. Из них растут уровни котов.':'<b>Котострофа. Бывает!</b> Монеты за старания твои. Иногда лучше уехать в приют пораньше.',{hide:['#restart','#resultShare'],spot:'#backLobby'});
  return;
 }
 if(s==='cats'){
  if(inGame){hideCoach();hideSpot();return}
  const b=document.querySelector('[data-mobile-pane="cats"]');
  showSpot(b,true);showCoach('cats','<b>Загляни к своим котам.</b> Там видно, кого можно прокачать.',{target:b,place:'above'});
  return;
 }
 if(s==='upgrade'){
  const r=document.querySelector('#catRoster .roster-card')||$('catRoster');
  if(!t.scrolled3){t.scrolled3=1;r?.scrollIntoView({block:'center'})}
  showSpot(r,true);
  showCoach('upgrade','<b>Каждый кот усиливает свою комнату.</b> Собирай копии, плати монетами — и доход растёт.<button class="primary" data-ftue-next="done">Понятно!</button>',{target:r});
 }
}
setInterval(sync,150);

document.addEventListener('click',e=>{
 const next=e.target.closest('[data-ftue-next]');
 if(next){next.dataset.ftueNext==='done'?complete():go(next.dataset.ftueNext);return}
 if(!active())return;
 const s=tut().step;
 if(e.target.closest('#backLobby')){
  if(s==='reward'){
   giftBank();clearUI();setTimeout(()=>go('room'),60);
  }
  if(s==='result2'){clearUI();setTimeout(()=>go('cats'),60)}
 }
 if(s==='collect'&&e.target.closest('#collectIncome'))setTimeout(()=>{hideSpot();go('play2')},60);
 if(s==='cats'&&e.target.closest('[data-mobile-pane="cats"]'))setTimeout(()=>{hideSpot();go('upgrade')},60);
});

// A small gift in the piggy bank, so the "collect" step has something to collect.
function giftBank(){if(!tut().gift&&Economy.stats(save,0).active){tut().gift=1;save.rooms[0].bank+=40;persist();updateMeta()}}

// ---------- After the tutorial: the hidden tabs appear, then one-off hints at the right moment ----------
const NEW_TABS=['[data-mobile-pane="gear"]','[data-mobile-pane="quests"]','#mobileShop'];
function reveal(){
 for(const sel of NEW_TABS)document.querySelector(sel)?.classList.add('ftue-new');
 save.tips=[...tips(),'reveal'];persist();
 showCoach('reveal','<b>Приют растёт!</b> Открылись Скиллы, Квесты и Лавка. В Квестах уже ждут первые награды.<button class="primary" data-ftue-close>Ура!</button>');
 track('tip_shown',{tip:'reveal'});
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-ftue-close]')){hideCoach();hideSpot()}
 const tab=e.target.closest('.ftue-new');if(tab)tab.classList.remove('ftue-new');
});
function tip(id,html,target,place){
 if(tips().includes(id))return false;
 save.tips=[...tips(),id];persist();track('tip_shown',{tip:id});
 showCoach('tip-'+id,html+'<button class="primary" data-ftue-close>Понятно</button>',{target,place});
 return true;
}
function tipFail(){
 const b=$('rescueHalf');
 if(b&&!b.disabled)tip('fail','<b>Не всё потеряно.</b> «Спасти» отвезёт домой нижних котов с подноса.',b,'above');
}
// Lobby hints: the first skill you can afford, the first finished task.
setInterval(()=>{
 if(active()||document.body.dataset.screen!=='lobby'||!coach.hidden||document.querySelector('dialog[open]'))return;
 const level=Economy.playerProgress(save.xp).level;
 if(level>=2&&!tips().includes('skills')){
  const b=document.querySelector('[data-mobile-pane="gear"]');b?.classList.add('ftue-new');
  tip('skills','<b>Новый уровень — новые скиллы.</b> Сетка ловит упавшего кота, замедление спасает башню.',b,'above');
 }else if(Economy.readyCount(save)>0&&!tips().includes('quests')){
  tip('quests','<b>Задание выполнено!</b> Забери награду во вкладке «Квесты».',document.querySelector('[data-mobile-pane="quests"]'),'above');
 }
},1500);

// Settings: skip while it runs (handy for testers).
const group=document.createElement('div');group.className='settings-group ftue-settings';
group.innerHTML='<h3>Обучение</h3><div class="settings-row"><span>Подсказки первой игры</span><button class="secondary" id="ftueSkipSettings">Пропустить</button></div>';
$('pane-settings')?.querySelector('.settings-group')?.after(group);
group.onclick=e=>{if(e.target.closest('#ftueSkipSettings')){complete(true);toast('Обучение пропущено')}};

tut();persist();sync();
})();
