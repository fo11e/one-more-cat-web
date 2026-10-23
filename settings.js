'use strict';
// Settings pane: sound, version and, in debug builds, cheats for testing. Loaded after monetization.js.
(()=>{
const button=$('mobileSettings');
function openSettings(){
 mobileLobby('rooms');
 for(const p of ['rooms','cats','gear','quests','skins','shop'])$('pane-'+p).hidden=true;
 $('pane-settings').hidden=false;
 document.querySelector('.shelter-head h2').textContent='Настройки';
 document.querySelectorAll('[data-mobile-pane]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-current','false')});
 button.classList.add('selected');button.setAttribute('aria-current','page');
}
function closeSettings(){$('pane-settings').hidden=true;button.classList.remove('selected');button.setAttribute('aria-current','false')}
document.addEventListener('click',e=>{if(e.target.closest('[data-mobile-pane],[data-pane],#mobileShop,#mobileBack,#backLobby,#shelterTab,.brand'))closeSettings()},true);
button.onclick=openSettings;
$('appVersion').textContent='Версия '+(OMC.version||'веб');

const done=message=>{persist();updateMeta();refreshUpgradeViews();toast('Тест: '+message)};
const CHEATS={
 coins(){save.coins+=10000;return '+10 000 монет'},
 level(){const p=Economy.playerProgress(save.xp);save.xp+=p.needed-p.current;return 'уровень '+Economy.playerProgress(save.xp).level},
 cats(){save.owned=save.owned.map(n=>n+5);save.collection=save.owned.flatMap((v,i)=>v?[i]:[]);return 'всем котам +5 копий'},
 bank(){Economy.tick(save);let n=0;save.rooms.forEach((r,i)=>{const st=Economy.stats(save,i);if(st.active){r.bank=st.cap;r.progress=0;n++}});return n?'копилка полная':'нет заселённых комнат'},
 adcaps(){try{localStorage.removeItem('omc-ad-caps')}catch{}return 'лимиты рекламы сброшены'}
};
$('pane-settings').addEventListener('click',e=>{const b=e.target.closest('[data-cheat]');if(b)done(CHEATS[b.dataset.cheat]())});
})();
