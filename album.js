'use strict';
// Long-term goals on top of app.js and meta.js: golden cats and the album, Ранг приюта and the Золотая гостиная.
// Loaded after meta.js; wraps updateMeta, renderRewards, finish and updateRiskHUD.

// Hook for analytics.js: a golden cat was on the tray when the run fell.
function goldenEvent(name,params={}){}

const goldBonusText=()=>`+${Math.round(Economy.econ.goldRoomBonus*100)}% дохода комнаты`;
const goldenSrc=t=>goldImages[t]||catImages[t];
const roomOf=t=>Economy.rooms.find(r=>r.types.includes(t));

// Ранг приюта: a card at the top of the rooms pane with the next reward.
function rankRewardText(r){const d=Economy.rankReward(save,r);return [`+${d.coins.toLocaleString('ru')} ✦`,`+${d.vitamins} 💊`,d.copies?`+${d.copies} копии редкого кота`:'',d.charm?'✨ Золотой ошейник':''].filter(Boolean).join(' · ')}
function rankMarkup(){
 const R=Economy.shelterRank(save),ready=Economy.rankReady(save),next=save.rankClaimed+1,E=Economy.econ;
 const pct=Math.min(100,(R.stars-R.from)/Math.max(1,R.to-R.from)*100);
 return `<div class="rank-top"><div><small>РАНГ ПРИЮТА</small><b>${R.rank} · ${R.title}</b></div><span class="rank-stars">★ ${R.stars} / ${R.to}</span></div><div class="progress-track rank-track"><div style="width:${pct}%"></div></div>
 ${ready>0?`<button class="primary rank-claim" data-rank-claim>${ready>1?`Забрать награды за ${ready} ${plural(ready,'ранг','ранга','рангов')}`:`Награда за ранг ${next}`}<small>${ready>1?`ранги ${next}–${next+ready-1}`:rankRewardText(next)}</small></button>`:`<p class="rank-next">Ранг ${R.rank+1}: ${rankRewardText(R.rank+1)}</p>`}
 ${R.rank<E.galleryRank?`<p class="rank-goal">На ранге ${E.galleryRank} откроется Золотая гостиная</p>`:''}
 <details class="rank-help"><summary>Откуда звёзды</summary><p>★ за каждый уровень кота, мебели и скилла, ★ за каждого кота в приюте и ★${E.goldStars} за золотого кота в альбоме.</p></details>`;
}

// Альбом: every cat and its golden version, at the top of the cats pane.
function albumMarkup(){
 const E=Economy.econ,found=save.owned.filter(n=>n>0).length,gold=Economy.goldenCount(save),open=Economy.goldenOpen(save);
 const luck=Math.min(100,save.goldPity/E.goldPity*100);
 const tiles=TYPES.map((t,i)=>{const owned=save.owned[i]>0,g=save.golden[i]>0;
  return `<button type="button" class="album-tile ${owned?'':'missing'} ${g?'golden':''}" data-album="${i}"><img src="${g?goldenSrc(i):catImages[i]}" alt=""><b>${owned?t.name:'???'}</b><small>${g?`✨ золотой${save.golden[i]>1?' ×'+save.golden[i]:''}`:owned?'☆ золотого нет':'не найден'}</small></button>`}).join('');
 const note=open?`<p class="album-note">Золотой кот падает редко, и чем выше башня, тем чаще. Довези его до приюта: он попадёт в альбом и даст ${goldBonusText()}. Упадёт — пропадёт.</p><div class="album-luck"><small>Золотая удача: когда шкала заполнится, следующий кот точно будет золотым</small><div class="progress-track"><div style="width:${luck}%"></div></div></div>`:`<p class="album-note">Золотые коты откроются на ${E.goldUnlock}-м уровне игрока.</p>`;
 return `<div class="album-head"><div><h3>Альбом</h3><small>Коты ${found}/${TYPES.length} · золотые ${gold}/${TYPES.length}</small></div>${save.goldCharm?`<span class="charm-pill" title="Кот №${E.goldCharmAt} в рейсе будет золотым">✨ Ошейник ×${save.goldCharm}</span>`:''}</div>${note}<div class="album-grid">${tiles}</div>`;
}

// Золотая гостиная: the fourth room, drawn by app.js through this function.
function galleryMarkup(i,st,state){
 const E=Economy.econ,r=Economy.rooms[i],R=Economy.shelterRank(save),open=Economy.galleryOpen(save),n=Economy.goldenCount(save);
 const slots=TYPES.map((t,k)=>save.golden[k]?`<img src="${goldenSrc(k)}" alt="${t.name}" title="${t.name}">`:'<i></i>').join('');
 const status=!open?`🔒 ранг ${E.galleryRank}`:st.active?'● Доход идёт':`${n} / ${TYPES.length}`;
 const info=st.active?`<div class="room-info"><b>${st.yieldCoins} ✦ / ${timeLabel(st.cycle)}</b><span>${Math.floor(state.bank)} / ${Math.floor(st.cap)} ✦</span></div><div class="progress-track"><div style="width:${state.bank>=st.cap?100:state.progress/st.cycle*100}%"></div></div>`:'';
 const caption=!open?`Откроется на ранге приюта ${E.galleryRank}, сейчас ${R.rank}. Здесь будут жить золотые коты из альбома.`:st.active?`${n} ${plural(n,'золотой кот','золотых кота','золотых котов')} · каждый приносит ${E.galleryYield} ✦ за цикл`:'Довези первого золотого кота, и гостиная начнёт приносить монеты.';
 return `<article class="puzzle-room gallery-room ${open?'':'locked'}"><div class="room-title"><h3>${r.name}</h3><span class="room-status ${st.active?'earning':''}">${status}</span></div><div class="gallery-scene">${slots}</div>${info}<p class="room-caption">${caption}</p></article>`;
}

function hostBefore(id,anchor){let el=$(id);if(!el&&anchor){el=document.createElement('div');el.id=id;anchor.before(el)}return el}
function syncAlbum(){
 const rank=hostBefore('rankCard',document.querySelector('#pane-rooms .income-summary')),album=hostBefore('albumCard',document.querySelector('#pane-cats > .muted'));
 for(const [el,html] of [[rank,rankMarkup()],[album,albumMarkup()]])if(el&&el._markup!==html){el.innerHTML=html;el._markup=html}
 const nav=document.querySelector('[data-mobile-pane="rooms"]');
 if(nav){let badge=$('rankBadge');if(!badge){badge=document.createElement('i');badge.id='rankBadge';nav.append(badge)}badge.textContent=Economy.rankReady(save)>0?'★':''}
}
document.addEventListener('click',e=>{
 // Claims every rank reached, so a long break doesn't mean a row of taps.
 if(e.target.closest('[data-rank-claim]')){const all=[];let r;while((r=Economy.claimRank(save)))all.push(r);if(all.length){
  const sum={coins:all.reduce((n,x)=>n+x.coins,0),vitamins:all.reduce((n,x)=>n+x.vitamins,0)},copies=all.reduce((n,x)=>n+(x.copies?.count||0),0),charm=all.reduce((n,x)=>n+x.charm,0);
  persist();updateMeta();refreshUpgradeViews();toast(`Ранг ${all.at(-1).rank}! `+[rewardText(sum),copies?`+${copies} ${plural(copies,'копия','копии','копий')} редких котов`:'',charm?`✨ Золотой ошейник${charm>1?' ×'+charm:''}`:''].filter(Boolean).join(' · '));chirp(900)}}
 const a=e.target.closest('[data-album]');if(a)openCat(+a.dataset.album);
 const card=e.target.closest('#catRoster .roster-card.undiscovered');if(card&&!e.target.closest('button'))openCat([...card.parentNode.children].indexOf(card));
});

// Cat card: a cat not found yet shows how to get it; a found one also says how to get its golden version.
function howToGet(t){
 const m=Economy.milestones.find(m=>m.type===t),room=roomOf(t);
 const steps=t<2?[`Падает в каждом рейсе: ${t?'вторым':'первым'} котом, пока его нет в приюте.`,'Поймай его на поднос и нажми «⌂ В приют». Пока не доставишь, он не считается.']
  :[`Гарантированно падает №${m.at} в башне, и потом каждые 40 котов (№${m.at+40}, №${m.at+80}…).`,`Удержи башню до ${m.at} котов и нажми «⌂ В приют», пока он на подносе. Если рейс упадёт, придётся ловить заново.`,'Во время рейса подсказка наверху показывает, сколько котов осталось до него.','После первой доставки он начнёт выпадать и раньше.'];
 return `<article class="reward-cat howto"><div class="reward-cat-head"><img class="howto-shadow" src="${catImages[t]}" alt=""><div><small>${Economy.cats[t].rarity} · ещё не в приюте</small><h3>${TYPES[t].name}</h3><b>Как получить</b></div></div><ol>${steps.map(x=>`<li>${x}</li>`).join('')}</ol><p class="howto-room">Живёт в комнате «${room.name}». Когда соберёшь всех её жителей, комната начнёт приносить монеты.</p></article>`;
}
function howToGolden(t){
 const E=Economy.econ,n=save.golden[t];
 if(n)return `<div class="howto-gold found"><img src="${goldenSrc(t)}" alt=""><p><b>✨ Золотой ${TYPES[t].name}${n>1?' ×'+n:''}</b><small>В альбоме: ${goldBonusText()} «${roomOf(t).name}». Повторный даёт ${E.goldDupVitamins} 💊 и ${E.goldDupCopies} копии.</small></p></div>`;
 const how=!Economy.goldenOpen(save)?`Золотые коты начнут падать с ${E.goldUnlock}-го уровня игрока.`
  :`Падает случайно в рейсе, и чем выше башня, тем чаще. Сначала выпадают те, кого ещё нет в альбоме. Довези его до приюта, иначе он пропадёт. Шкала «Золотая удача» заполнена на ${Math.floor(save.goldPity/E.goldPity*100)}%, когда дойдёт до конца, золотой выпадет точно.${save.goldCharm?` У тебя есть Золотой ошейник: кот №${E.goldCharmAt} в рейсе будет золотым.`:' Золотой ошейник (награда ранга приюта) делает золотым кота №'+E.goldCharmAt+' в рейсе.'}`;
 return `<div class="howto-gold"><img class="howto-shadow" src="${goldenSrc(t)}" alt=""><p><b>☆ Золотой ${TYPES[t].name}: как получить</b><small>${how}</small></p></div>`;
}
const baseCatCard=catUpgradeCard;
catUpgradeCard=function(t,receipt=null){
 if(receipt)return baseCatCard(t,receipt);
 return save.owned[t]?baseCatCard(t).replace(/<\/article>$/,howToGolden(t)+'</article>'):howToGet(t);
};

// Result screen: what the golden cats brought.
const baseRenderRewards=renderRewards;
renderRewards=function(animate=true){
 baseRenderRewards(animate);
 const list=deliveryReceipt?.golden;if(!list?.length||!$('rewardList'))return;
 const box=document.createElement('div');box.className='gold-receipt';
 box.innerHTML=list.map(x=>`<div><img src="${goldenSrc(x.type)}" alt=""><p><b>${x.first?'Новый в альбоме':'Ещё один'}: золотой кот ${TYPES[x.type].name}!</b><small>${x.first?`${goldBonusText()} «${roomOf(x.type).name}»${Economy.galleryOpen(save)?' · доход в Золотой гостиной':''}`:`+${x.vitamins} 💊 · +${x.copies} копии`}</small></p></div>`).join('');
 $('rewardList').before(box);
};
// A fall loses the golden cats on the tray; the rescue can bring back the ones at the bottom.
const baseFinishGold=finish;
finish=function(delivered=false,challengeDone=false){
 const was=phase,lost=cats.filter(c=>c.golden).map(c=>c.type);
 baseFinishGold(delivered,challengeDone);
 if(was===phase||phase!=='result'||delivered||challengeMode||!lost.length)return;
 goldenEvent('golden_lost',{cats:score,golden:lost.length,rescuable:rescueGolden.length});
 const title=document.querySelector('#overlay .overlay-card h2');
 if(title){const p=document.createElement('p');p.className='gold-lost';p.textContent=`✨ Золотой кот ${TYPES[lost[0]].name} не доехал до приюта.${rescueGolden.length?' «Спасти» заберёт его домой!':''}`;title.after(p)}
};
const baseRiskHUD=updateRiskHUD;
updateRiskHUD=function(){
 baseRiskHUD();if(phase!=='playing'||challengeMode)return;
 const g=cats.find(c=>c.landed&&c.golden);
 if(g)$('riskCargo').insertAdjacentHTML('afterbegin',`<b class="gold-cargo">✨ Золотой кот ${TYPES[g.type].name} на подносе: довези домой!</b> `);
};

const albumUpdate=updateMeta;
updateMeta=function(){albumUpdate();syncAlbum()};
CatSprites.load.then(()=>updateMeta());
updateMeta();
