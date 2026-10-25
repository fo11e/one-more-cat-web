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
 skills(){for(const g of Economy.equipment)save.gear[g.key]=g.max;return 'все скиллы на максимуме'},
 skills0(){for(const g of Economy.equipment)save.gear[g.key]=0;return 'скиллы сброшены'},
 charm(){save.goldCharm++;return `кот №${Economy.econ.goldCharmAt} в следующем рейсе будет золотым`},
 golden(){const t=save.owned.findIndex((n,i)=>n>0&&!save.golden[i]);if(t<0)return 'все найденные коты уже золотые';Economy.deliverGolden(save,[t]);return 'золотой '+TYPES[t].name},
 // Stars come from levels: the cheapest way to add them is furniture levels in the first open room.
 stars(){let n=20;Economy.rooms.forEach((_,i)=>{if(!Economy.furnitureOpen(save,i))return;save.furniture[i]=save.furniture[i].map(l=>{const add=Math.min(n,Economy.econ.furnitureMax-l);n-=add;return l+add})});return n<20?`+${20-n} ★ (уровни мебели)`:'нет открытой мебели'},
 // Daily and weekly tasks: fill every one up, or draw a fresh set (as on a new day and week).
 tasks(){for(const [w,p] of [[false,save.daily],[true,save.weekly]])for(const t of Economy.taskList(save,w)){const x=p.tasks.find(x=>x.id===t.id);if(x.id==='w_stars')p.stars-=t.target-t.value;else x.from=(x.from||0)-(t.target-t.value)}Economy.trackRun(save,{delivered:true,cats:0});return 'задания выполнены'},
 tasksNew(){save.daily=null;save.weekly=null;save=Economy.create(save);return 'новые задания дня и недели'},
 adcaps(){Shop.resetStub();return 'лимиты рекламы, тестовые покупки и набор новичка сброшены'}
};
$('pane-settings').addEventListener('click',e=>{const b=e.target.closest('[data-cheat]');if(b)done(CHEATS[b.dataset.cheat]())});
})();
