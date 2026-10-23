'use strict';
// Ads, purchases and haptics on top of the web game. Loaded last; wraps app.js globals.
const Shop=(()=>{
const P={removeAds:'com.sergey.onemorecat.removeads',energy:'com.sergey.onemorecat.energy',vitamins:'com.sergey.onemorecat.vitamins',coins:'com.sergey.onemorecat.coins'};
const ITEMS=[
 {id:P.removeAds,icon:'⊘',title:'Без рекламы',note:'Никакой рекламы между рейсами. Бонусы за просмотр остаются, если захочешь.'},
 {id:P.energy,icon:'ϟ',title:'Полная энергия',note:'Сразу до максимума.'},
 {id:P.vitamins,icon:'💊',title:'50 витаминок',note:'Для эволюции котов на уровнях 5, 10, 15 и 20.'},
 {id:P.coins,icon:'✦',title:'3 000 монет',note:'На скиллы и прокачку котов.'}];
const GRANTS={[P.energy]:s=>{s.energy=s.config.energyMax;s.energyAt=Date.now();return 'Энергия восстановлена ϟ'},[P.vitamins]:s=>{s.vitamins+=50;return '+50 витаминок 💊'},[P.coins]:s=>{s.coins+=3000;return '+3 000 ✦'}};
// Daily caps keep rewarded ads a bonus, not a grind.
const CAPS={energy:5,collect:5};
const MIN_DOUBLE_BANK=20;

const haptic=style=>{if(OMC.native)OMC.call('haptic',{style})};
const owns=id=>OMC.owned.has(id);

function capState(){const day=new Date().toDateString();let s={};try{s=JSON.parse(localStorage.getItem('omc-ad-caps')||'{}')}catch{}return s.day===day?s:{day}}
function adsLeft(kind){return Math.max(0,CAPS[kind]-(capState()[kind]||0))}
function useAd(kind){const s=capState();s[kind]=(s[kind]||0)+1;try{localStorage.setItem('omc-ad-caps',JSON.stringify(s))}catch{}}

let adBusy=false;
// Web build: no ad network, a short stand-in card, then the reward counts.
function webAd(){return new Promise(resolve=>{const d=document.createElement('div');d.className='web-ad';d.innerHTML='<div><span class="eyebrow">ВЕБ-ВЕРСИЯ</span><b>Тут будет реклама</b><small>Награда через <i>2</i> с</small></div>';document.body.append(d);let n=2;const t=setInterval(()=>{n--;if(n>0){d.querySelector('i').textContent=n;return}clearInterval(t);d.remove();resolve()},1000)})}
async function rewarded(placement){
 if(adBusy)return false;
 if(!OMC.native){adBusy=true;try{await webAd()}finally{adBusy=false}return true}
 adBusy=true;
 try{audioCtx?.suspend()}catch{}
 try{
  const r=await OMC.call('ads.rewarded',{placement});
  if(r?.rewarded){haptic('success');return true}
  toast(r?.error==='unavailable'?'Реклама пока не загрузилась. Попробуй чуть позже':'Награда не получена: реклама закрыта раньше');
  return false;
 }finally{adBusy=false;if(sound)try{audioCtx?.resume()}catch{}}
}

// Haptics on the moments that matter.
const baseLanded=landed;
landed=function(cat){const before=score;baseLanded(cat);if(score>before)haptic(score%5===0?'medium':'light')};

// After a run: the rescue offer becomes a rewarded ad.
const baseFinish=finish;
finish=function(delivered=false,challengeDone=false){
 const was=phase;baseFinish(delivered,challengeDone);
 if(was===phase||phase!=='result')return;
 haptic(delivered||challengeDone?'success':'error');
 const button=$('rescueHalf');
 if(!button||button.disabled)return;
 button.innerHTML=`▶ Спасти половину · ${rescueOffer.length} 🐾`;
 const note=button.nextElementSibling;
 if(note?.classList.contains('rescue-note'))note.textContent='Нижние коты с подноса за короткую рекламу';
 button.onclick=async()=>{button.disabled=true;if(await rewarded('rescue'))rescueHalf();else button.disabled=false};
};

// Before a run: out-of-energy offer, and an interstitial between runs when one is due.
const baseStart=start;
let starting=false;
start=function(challenge=null){
 if(starting||phase==='playing')return;
 Economy.tick(save);
 if(save.energy<save.config.energyCost){offerEnergy(challenge);return}
 const go=()=>{starting=false;baseStart(challenge);if(phase==='playing'&&typeof mobileScreen==='function')mobileScreen('game')};
 if(OMC.native&&phase==='result'&&!challenge){starting=true;OMC.call('ads.interstitial',{runs:save.runs}).then(go,go)}
 else go();
};

const energyDialog=document.createElement('dialog');
energyDialog.id='energyDialog';energyDialog.setAttribute('aria-label','Энергия');
document.body.append(energyDialog);
function offerEnergy(challenge){
 const cost=save.config.energyCost,left=adsLeft('energy');
 const wait=timeLabel((save.energyAt+save.config.refillMinutes*60000-Date.now())/1000);
 energyDialog.innerHTML=`<span class="eyebrow">КОТЫ ЖДУТ. ЭНЕРГИИ НЕТ.</span><h2>Нужна энергия</h2><p>На рейс нужно ${cost} ϟ, сейчас ${save.energy}.<br>+1 через ${wait}.</p>
 <button class="primary" id="energyAd" ${left?'':'disabled'}>▶ Реклама: +${cost} ϟ</button>
 <small class="energy-note">${left?`Ещё ${left} за сегодня`:'Бонусы на сегодня закончились'}</small>
 <button class="secondary" id="energyShop">Полная энергия в лавке</button>
 <button class="text-btn" id="energyWait">Подожду</button>`;
 energyDialog.showModal();
 $('energyWait').onclick=()=>energyDialog.close();
 $('energyShop').onclick=()=>{energyDialog.close();openShop()};
 $('energyAd').onclick=async()=>{
  if(!await rewarded('energy'))return;
  useAd('energy');Economy.tick(save);
  save.energy=Math.min(save.config.energyMax,save.energy+cost);
  if(save.energy>=save.config.energyMax)save.energyAt=Date.now();
  persist();updateMeta();energyDialog.close();toast(`+${cost} ϟ энергии`);
  start(challenge);
 };
}

// Shelter income: optional double collect.
function syncDouble(){
 const summary=document.querySelector('#pane-rooms .income-summary');if(!summary)return;
 let button=$('collectDouble');
 if(!button){button=document.createElement('button');button.id='collectDouble';button.className='secondary double-collect';summary.after(button);
  button.onclick=async()=>{if(!await rewarded('collect'))return;useAd('collect');const n=Economy.collect(save);save.coins+=n;persist();updateMeta();toast(`+${Math.floor(n*2)} ✦ — двойной сбор!`);chirp(760)}}
 const bank=Math.floor(save.rooms.reduce((n,r)=>n+r.bank,0)),left=adsLeft('collect');
 button.hidden=!left||bank<MIN_DOUBLE_BANK;
 button.textContent=`▶ Забрать x2 за рекламу · ${bank*2} ✦`;
}
const baseUpdateMeta=updateMeta;
updateMeta=function(){baseUpdateMeta();syncDouble()};

// Skins are switched off for now: base sprite cats only.
function enforceSkins(){if(SkinArt.selected!=='flat'){SkinArt.select('flat');syncArt()}}
document.querySelectorAll('[data-mobile-pane="skins"],[data-pane="skins"]').forEach(b=>b.hidden=true);

// Shop pane.
let catalog=null;
function openShop(){
 mobileLobby('rooms');
 for(const p of ['rooms','cats','gear','quests','skins'])$('pane-'+p).hidden=true;
 $('pane-shop').hidden=false;
 document.querySelector('.shelter-head h2').textContent='Лавка';
 document.querySelectorAll('[data-mobile-pane]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-current','false')});
 $('mobileShop').classList.add('selected');$('mobileShop').setAttribute('aria-current','page');
 renderShop();
}
function closeShop(){$('pane-shop').hidden=true;$('mobileShop').classList.remove('selected');$('mobileShop').setAttribute('aria-current','false')}
document.addEventListener('click',e=>{if(e.target.closest('[data-mobile-pane],[data-pane],#mobileBack,#backLobby,#shelterTab,.brand'))closeShop()},true);
$('mobileShop').onclick=openShop;

async function renderShop(){
 const host=$('shopList');
 if(!OMC.native){host.innerHTML='<div class="web-shop-note"><b>Это тестовая веб-версия</b><p class="muted">Покупок здесь нет. Лавка откроется в приложении для iPhone. А пока бонусы можно получить за «рекламу» — в вебе она длится пару секунд.</p></div>';$('restorePurchases').hidden=true;return}
 if(!catalog){
  host.innerHTML='<p class="muted">Загружаем товары…</p>';
  const list=await OMC.call('store.products');
  catalog=Array.isArray(list)?list:[];
 }
 if(!catalog.length){catalog=null;host.innerHTML='<p class="muted">Лавка пока недоступна. Проверь интернет и загляни позже.</p>';return}
 host.innerHTML=ITEMS.map(item=>{const p=catalog.find(x=>x.id===item.id);if(!p)return '';const owned=owns(p.id);
  return `<article class="shop-card ${owned?'owned':''}"><span class="shop-icon">${item.icon}</span><div><b>${item.title}</b><small>${item.note}</small></div><button class="primary" data-buy="${p.id}" ${owned?'disabled':''}>${owned?'Есть ✓':p.price}</button></article>`}).join('');
}
$('shopList').onclick=async e=>{
 const button=e.target.closest('[data-buy]');if(!button||button.disabled)return;
 const label=button.textContent;button.disabled=true;button.textContent='…';
 const r=await OMC.call('store.purchase',{id:button.dataset.buy});
 if(r?.status==='purchased'){if(!GRANTS[button.dataset.buy])toast('Спасибо! Покупка твоя ✓');haptic('success')}
 else if(r?.status==='pending')toast('Покупка ждёт подтверждения');
 else if(r?.status!=='cancelled')toast(r?.message?`Не получилось: ${r.message}`:'Не получилось купить. Попробуй ещё раз');
 button.textContent=label;button.disabled=false;renderShop();
};
$('restorePurchases').onclick=async()=>{
 if(!OMC.native)return;
 const r=await OMC.call('store.restore');
 if(r?.ok){setOwned(r.owned||[]);toast(r.owned?.length?'Покупки восстановлены ✓':'Покупок для восстановления нет')}else toast('Не удалось связаться с App Store');
};

function setOwned(ids){OMC.owned=new Set(ids);enforceSkins();if(!$('pane-shop').hidden)renderShop()}
OMC.on('entitlements',setOwned);

// Called by the app for consumables. Must save before returning true.
OMC.grant=id=>{
 const apply=GRANTS[id];if(!apply)return false;
 Economy.tick(save);const message=apply(save);persist();updateMeta();toast(message);haptic('success');chirp(820);
 return true;
};

enforceSkins();syncDouble();
if(OMC.native)OMC.call('ready').then(r=>{if(Array.isArray(r?.owned))setOwned(r.owned)});
return {P,openShop,rewarded};
})();
