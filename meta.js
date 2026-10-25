'use strict';
// Long-term spending on top of app.js: boosters before a run, daily and weekly tasks, and Уют (room furniture).
// Loaded after app.js and mobile.js; wraps updateMeta, renderQuests, start, finish and renderRewards.

const cozyEffect={
 income:(l,f)=>`+${Math.round(l*f.step*100)}% дохода комнаты`,
 cap:(l,f)=>`+${Math.round(l*f.step*100)}% запаса копилки`,
 allIncome:(l,f)=>`+${Math.round(l*f.step*100)}% дохода всех комнат`,
 runCoins:(l,f)=>`+${Math.round(l*f.step*100)}% монет за доставку`,
 xp:(l,f)=>`+${Math.round(l*f.step*100)}% опыта`,
 energy:(l,f)=>`+${Math.round(l*f.step)} к макс. энергии`,
 refill:(l,f)=>`−${Math.round(l*f.step*100)}% времени на энергию`,
 vitamins:(l,f)=>`${+(l*f.step*100).toFixed(1)}% шанс 💊 за кота`,
 gold:(l,f)=>`+${Math.round(l*f.step*100)}% к шансу золотого кота`};

function rewardText(r){
 if(!r)return '';
 return [r.coins?`+${r.coins.toLocaleString('ru')} ✦`:'',r.vitamins?`+${r.vitamins} 💊`:'',r.copies?`+${r.copies.count} ${plural(r.copies.count,'копия','копии','копий')} ${TYPES[r.copies.type].name}`:'',
  ...(r.boosters||[]).map(k=>{const b=Economy.boosters.find(b=>b.key===k);return `${b.icon} ${b.name} на следующий рейс`}),r.charm?`✨ Золотой ошейник${r.charm>1?' ×'+r.charm:''}`:''].filter(Boolean).join(' · ');
}

// Pre-run screen: short rules, what the skills bring, and boosters with what each one does.
// Opens before every normal run; challenges and a paused run go straight in.
const prepDialog=document.createElement('dialog');
prepDialog.id='prepDialog';prepDialog.setAttribute('aria-label','Перед рейсом');
document.body.append(prepDialog);
let prepGo=null;
function prepMarkup(){
 const st=Economy.gearStats(save.gear),next=Economy.milestones.find(m=>!save.owned[m.type]);
 const kit=[st.lives?`♥ ${st.lives} ${plural(st.lives,'сетка','сетки','сеток')}`:'',st.slowmo?`❄ ${st.slowmo} ${plural(st.slowmo,'замедление','замедления','замедлений')}`:'',st.tips?`✦ чаевые +${Math.round(st.tips*100)}%`:''].filter(Boolean);
 const rows=Economy.boosters.map(b=>{
  const open=Economy.boosterOpen(save,b),armed=save.boost[b.key],cost=Economy.boosterCost(save,b);
  return `<div class="prep-booster ${armed?'armed':''} ${open?'':'locked'}"><span class="prep-icon">${b.icon}</span><div><b>${b.name}</b><small>${b.desc}</small></div><button type="button" class="${armed?'secondary':'primary'}" data-booster="${b.key}" ${!open||armed||save.coins<cost?'disabled':''}>${!open?`🔒 ур. ${b.unlock}`:armed?'✓ Берём':cost+' ✦'}</button></div>`}).join('');
 return `<span class="eyebrow">ПЕРЕД РЕЙСОМ</span><h2>Готов ловить?</h2>
 <details class="prep-rules" ${save.runs<5?'open':''}><summary>Как играть</summary><ul>
 <li>Двигай поднос пальцем и лови падающих котов.</li>
 <li>«⌂ В приют» — забрать котов и монеты в любой момент.</li>
 <li>Упал кот — рейс окончен: котов не доставишь, останутся монеты за старания.</li>
 
 ${next?`<li>Новый житель: ${TYPES[next.type].name} будет №${next.at} в башне.</li>`:''}
 ${Economy.goldenOpen(save)?`<li>✨ Иногда падает золотой кот. Довези его — он попадёт в альбом. Чем выше башня, тем чаще.</li>`:''}</ul></details>
 ${save.goldCharm?`<p class="prep-kit prep-charm">✨ Золотой ошейник: кот №${Economy.econ.goldCharmAt} в этом рейсе будет золотым${save.goldCharm>1?` · ещё ${save.goldCharm-1} в запасе`:''}</p>`:''}
 ${kit.length?`<p class="prep-kit">Скиллы в рейсе: ${kit.join(' · ')}</p>`:''}
 ${prepTasks()}
 <h3 class="prep-title">Расходники <small>на один рейс · у тебя ${Math.floor(save.coins).toLocaleString('ru')} ✦</small></h3>
 <div class="prep-boosters">${rows}</div>
 <button class="primary prep-go" id="prepGo">ЛОВИТЬ КОТОВ ↗</button>
 <button class="text-btn" id="prepBack">Назад</button>`;
}
// Daily and weekly tasks this run can move (the tower, skills and boosters), unfinished first.
function prepTasks(){
 const list=[false,true].flatMap(w=>Economy.taskList(save,w).filter(t=>!t.claimed&&t.value<t.target&&(t.kind==='run'||t.kind==='play')).map(t=>({...t,weekly:w}))).slice(0,3);
 if(!list.length)return '';
 return `<h3 class="prep-title">Задания на рейс</h3><div class="prep-tasks">${list.map(t=>`<div class="prep-task"><span>${t.weekly?'неделя':'день'}</span><b>${t.desc}</b><small>${t.value} / ${t.target}</small><div class="progress-track"><div style="width:${Math.min(100,t.value/t.target*100)}%"></div></div></div>`).join('')}</div>`;
}
function syncPrep(){if(!prepDialog.open)return;const html=prepMarkup();if(prepDialog._markup!==html){prepDialog.innerHTML=html;prepDialog._markup=html}}
function openPrep(go){prepGo=go;prepDialog._markup=null;prepDialog.innerHTML='';prepDialog.showModal();syncPrep()}
prepDialog.addEventListener('click',e=>{
 if(e.target.closest('#prepBack')){prepDialog.close();prepGo=null}
 if(e.target.closest('#prepGo')){const go=prepGo;prepGo=null;prepDialog.close();go?.()}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-booster]');if(!b||b.disabled)return;
 const def=Economy.boosters.find(x=>x.key===b.dataset.booster),cost=Economy.buyBooster(save,b.dataset.booster);
 if(cost){persist();updateMeta();toast(`${def.name}: ${def.desc}`);chirp(640)}
});
const baseStartMeta=start;
start=function(challenge=null){
 if(challenge||phase==='playing'||phase==='paused')return baseStartMeta(challenge);
 openPrep(()=>{const snap=taskSnapshot();baseStartMeta(null);if(phase==='playing'){runTasks=snap;if(typeof mobileScreen==='function')mobileScreen('game')}});
};

// Daily and weekly tasks above the one-time quests. Minutes only, so the list doesn't redraw every second.
const resetLabel=ms=>{const m=Math.max(1,Math.ceil(ms/60000)),d=Math.floor(m/1440),h=Math.floor(m%1440/60);return d?`${d} д ${h} ч`:h?`${h} ч ${m%60} мин`:`${m} мин`};
// Замена: daily tasks only, free ones first, then for a rewarded ad.
function rerollButton(t,period){
 if(period!=='d'||t.claimed||t.value>=t.target)return '';
 const left=Economy.rerollsLeft(save);
 if(left.free)return `<button class="text-btn task-reroll" data-reroll="${t.id}" title="Заменить задание">⟳ Заменить</button>`;
 if(left.ad&&typeof Shop!=='undefined'&&Shop.available('task_reroll'))return `<button class="text-btn task-reroll" data-reroll="${t.id}" data-ad="1" data-placement="task_reroll" title="Заменить за рекламу">⟳ За рекламу</button>`;
 return '';
}
function taskCard(t,period){
 return `<article class="quest-card task-card"><h3>${t.name} <span>${rewardText(t.reward.copies?{vitamins:t.reward.vitamins}:t.reward)}${t.reward.copies?` · +${t.reward.copies} копии редкого кота`:''}</span></h3><p>${t.desc}</p><div class="progress-track"><div style="width:${Math.min(100,t.value/t.target*100)}%"></div></div><div class="quest-bottom"><small>${t.value} / ${t.target}</small>${rerollButton(t,period)}<button data-task="${period}:${t.id}" ${t.claimed||t.value<t.target?'disabled':''}>${t.claimed?'Получено ✓':'Забрать'}</button></div></article>`;
}
function chestText(weekly){
 const c=Economy.chestContents(save,weekly);
 return [`${c.vitamins} 💊`,c.copies?`${c.copies} копий самого редкого кота`:'',c.boosters?`${c.boosters>1?c.boosters+' расходника':'расходник'} на рейс`:'',c.charm?'✨ Золотой ошейник':'','монеты'].filter(Boolean).join(' + ');
}
function taskBlock(weekly){
 const list=Economy.taskList(save,weekly),period=weekly?'w':'d',p=weekly?save.weekly:save.daily,ready=Economy.chestReady(save,weekly),left=resetLabel(Economy.nextReset(Date.now(),weekly)-Date.now());
 const chest=chestText(weekly);
 return `<section class="task-block"><div class="task-head"><h3>${weekly?'Задания недели':'Задания дня'}</h3><small>Новые через ${left}</small></div>${list.map(t=>taskCard(t,period)).join('')}<article class="quest-card chest-card ${p.chest?'opened':''}"><h3>${p.chest?'Сундук открыт ✓':'Сундук'} <span>${chest}</span></h3><p>${p.chest?'Возвращайся за новыми заданиями.':'Выполни все задания выше.'}</p><button data-chest="${period}" ${ready?'':'disabled'}>${p.chest?'Открыт':'Открыть сундук'}</button></article></section>`;
}
const baseRenderQuests=renderQuests;
renderQuests=function(){
 baseRenderQuests();
 const n=Economy.readyCount(save);$('questBadge').textContent=n?' · '+n:'';
 const host=$('questList');let tasks=$('taskList');
 if(!tasks){tasks=document.createElement('div');tasks.id='taskList';host.before(tasks);const title=document.createElement('h3');title.className='task-title';title.textContent='Первые шаги';host.before(title)}
 const html=taskBlock(false)+taskBlock(true);if(tasks._markup!==html){tasks.innerHTML=html;tasks._markup=html}
};
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-task]'),c=e.target.closest('[data-chest]');
 if(t&&!t.disabled){const [period,id]=t.dataset.task.split(':'),r=Economy.claimTask(save,period==='w',id);if(r){persist();updateMeta();refreshUpgradeViews();toast(rewardText(r));chirp(760)}}
 if(c&&!c.disabled){const r=Economy.claimChest(save,c.dataset.chest==='w');if(r){persist();updateMeta();refreshUpgradeViews();toast('Сундук: '+rewardText(r));chirp(880)}}
});
let rerollBusy=false;
document.addEventListener('click',async e=>{
 const b=e.target.closest('[data-reroll]');if(!b||rerollBusy)return;
 const ad=!!b.dataset.ad;rerollBusy=true;
 try{
  if(ad&&!(typeof Shop!=='undefined'&&await Shop.rewarded('task_reroll')))return;
  const r=Economy.rerollTask(save,b.dataset.reroll,ad);
  if(r){persist();updateMeta();toast(`Новое задание: ${r.name}`);chirp(620)}else toast('Заменить не на что: все задания уже были');
 }finally{rerollBusy=false}
});

// Result screen: what the run added to the tasks. The snapshot is taken when the run starts.
let runTasks=null;
function taskSnapshot(){return Object.fromEntries([false,true].flatMap(w=>Economy.taskList(save,w).map(t=>[(w?'w:':'d:')+t.id,t.value])))}
function taskReceipt(){
 document.querySelector('#overlay .task-receipt')?.remove();
 if(!runTasks||challengeMode)return;
 const rows=[false,true].flatMap(w=>Economy.taskList(save,w).map(t=>({...t,before:runTasks[(w?'w:':'d:')+t.id]}))).filter(t=>!t.claimed&&t.before!==undefined&&t.value>t.before);
 const card=document.querySelector('#overlay .overlay-card'),anchor=card?.querySelector('button');
 if(!rows.length||!anchor)return;
 const box=document.createElement('div');box.className='task-receipt';
 box.innerHTML=`<b>Задания</b>${rows.slice(0,4).map(t=>`<div class="${t.value>=t.target?'done':''}"><span>${t.name}</span><small>${t.value>=t.target?'готово, забери в «Квестах»':`${t.value} / ${t.target}${t.max?'':` · +${t.value-t.before}`}`}</small></div>`).join('')}`;
 anchor.before(box);
}
const baseRenderRewardsTasks=renderRewards;
renderRewards=function(animate=true){baseRenderRewardsTasks(animate);taskReceipt()};
// After a normal run: count the net catches, slow-motion presses and a clean delivery for the tasks.
const baseFinishTasks=finish;
finish=function(delivered=false,challengeDone=false){
 const was=phase,run={lives:livesUsed,slowmo:slowmoUsed,cats:score,challenge:challengeMode};
 baseFinishTasks(delivered,challengeDone);
 if(was===phase||phase!=='result'||run.challenge)return;
 Economy.trackRun(save,{...run,delivered:!!deliveryReceipt});persist();updateMeta();taskReceipt();
};

// Уют: furniture under each room scene.
function cozyMarkup(i){
 if(!Economy.furnitureOpen(save,i))return `<div class="cozy-head"><b>Уют</b><small>Откроется, когда комната заселена</small></div>`;
 const max=Economy.econ.furnitureMax;
 return `<div class="cozy-head"><b>Уют</b><small>Мебель даёт бонусы навсегда</small></div><div class="cozy-grid">${Economy.furniture[i].map((f,j)=>{
  const l=save.furniture[i][j],cost=Economy.furnitureCost(save,i,j),done=l>=max;
  return `<button type="button" class="cozy-item ${l?'owned':''}" data-furn="${i}:${j}" ${done||save.coins<cost?'disabled':''}><b>${f.icon}</b><span>${f.name} <i>${l}/${max}</i></span><small>${l?cozyEffect[f.effect](l,f):cozyEffect[f.effect](1,f)}</small><em>${done?'МАКС.':cost.toLocaleString('ru')+' ✦'}</em></button>`}).join('')}</div>`;
}
function syncCozy(){
 document.querySelectorAll('#roomsList .puzzle-room').forEach((room,i)=>{
  let host=room.querySelector('.cozy');
  if(!host){host=document.createElement('div');host.className='cozy';room.append(host)}
  const html=cozyMarkup(i);if(host._markup!==html){host.innerHTML=html;host._markup=html}
 });
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-furn]');if(!b||b.disabled)return;
 const [i,j]=b.dataset.furn.split(':').map(Number),f=Economy.furniture[i][j];
 if(Economy.buyFurniture(save,i,j)){persist();updateMeta();toast(`${f.name}: ${cozyEffect[f.effect](save.furniture[i][j],f)}`);chirp(700)}
});

// A task that reaches its target shows a toast; it is claimed in Квесты.
function noteCompleted(){const list=Economy.takeCompleted();if(list.length)toast(`✓ Задание выполнено: ${list.map(t=>t.name).join(', ')}`)}
const metaUpdate=updateMeta;
updateMeta=function(){metaUpdate();syncPrep();syncCozy();noteCompleted()};
updateMeta();
