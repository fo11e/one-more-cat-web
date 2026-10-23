'use strict';
const mobileTitles={rooms:'Твой приют',cats:'Твои коты',gear:'Скиллы',quests:'Квесты',skins:'Гардероб'};
function mobileScreen(screen){document.body.dataset.screen=screen;document.querySelectorAll('[data-mobile-pane]').forEach(b=>{const active=screen==='lobby'&&b.dataset.mobilePane===activePane;b.classList.toggle('selected',active);b.setAttribute('aria-current',active?'page':'false')});document.querySelector('main').scrollTop=0;syncMobile()}
function mobileLobby(pane=activePane){if(phase==='playing')pause();document.querySelector(`[data-pane="${pane}"]`).click();document.querySelector('.shelter-head h2').textContent=mobileTitles[pane];mobileScreen('lobby')}
function syncMobile(){const continuing=phase==='playing'||phase==='paused';$('mobilePlay').textContent=continuing?'ПРОДОЛЖИТЬ РЕЙС ▷':'ЛОВИТЬ КОТОВ ↗';$('mobilePlayHint').textContent=continuing?'Коты ждут на подносе':save.energy<save.config.energyCost?'Нужна энергия на случай неудачи':'Успешная доставка не тратит энергию';$('mobileQuestBadge').textContent=Economy.questList(save).filter(q=>!q.claimed&&q.value>=q.target).length||''}
$('mobilePlay').onclick=()=>{if(phase==='paused')pause();else if(phase!=='playing')start(challengeState);if(phase==='playing')mobileScreen('game')};
$('mobileBack').onclick=()=>mobileLobby('rooms');
document.querySelectorAll('[data-mobile-pane]').forEach(b=>b.onclick=()=>mobileLobby(b.dataset.mobilePane));
$('shelterTab').onclick=()=>mobileLobby('rooms');
document.addEventListener('click',e=>{if(e.target.closest('#backLobby'))mobileLobby('rooms');if(e.target.closest('#restart,#start')&&phase==='playing')mobileScreen('game')});
setInterval(syncMobile,1000);mobileScreen('lobby');
document.querySelector('.brand').onclick=e=>{e.preventDefault();mobileLobby('rooms')};

function renderSkinPicker(){const host=$('skinPicker');if(!host)return;host.innerHTML=SkinArt.catalog.map(s=>`<button class="skin-card ${SkinArt.selected===s.id?'chosen':''}" data-skin-choice="${s.id}" aria-pressed="${SkinArt.selected===s.id}" style="--skin-bg:${s.color}"><div class="skin-card-art">${[0,1,2].map(i=>`<img src="${makeSkinThumb(i,s.id)}" alt="${TYPES[i].name}">`).join('')}</div><div class="skin-card-copy"><div><b>${s.name}</b><small>${s.note}</small></div><span>${SkinArt.selected===s.id?'Надето ✓':'Надеть'}</span></div></button>`).join('')}
$('skinPicker').onclick=e=>{const card=e.target.closest('[data-skin-choice]');if(!card)return;SkinArt.select(card.dataset.skinChoice);syncArt();toast('Скин: '+SkinArt.catalog.find(s=>s.id===SkinArt.selected).name)};
renderSkinPicker();ClayArt.load.then(()=>renderSkinPicker());
