'use strict';
// Monetization placements: rewarded ads, shop entry points and offers. Loaded after native.js; wraps app.js and meta.js globals.
// Ads and purchases are stubs for now (a test ad screen and a test purchase sheet). Each one can be
// switched to the native SDK bridge with "ads_provider"/"iap_provider": "native" in monetization_config.
// No interstitials. Nothing here shows during the tutorial. Events: ANALYTICS.md, "Монетизация".
const Shop=(()=>{
const remote=OMC.remote||{};
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return {}}};
const DEFAULTS={
 ads_provider:'stub',iap_provider:'stub',stub_ad_seconds:3,stub_purchases_release:0,
 // cap: per day (0 = no limit), min_level: player level it appears from.
 placements:{
  rescue:{enabled:1,cap:0,min_level:1},
  revive:{enabled:1,cap:5,min_level:3,min_cats:5,per_run:1,seconds:10},
  run_x2:{enabled:1,cap:5,min_level:2,min_coins:30},
  energy:{enabled:1,cap:5,min_level:1},
  collect_x2:{enabled:1,cap:5,min_level:1,min_bank:20},
  task_reroll:{enabled:1,cap:0,min_level:1},
  booster_free:{enabled:1,cap:3,min_level:2},
  shop_gift:{enabled:1,cap:3,min_level:2,coins_base:60,coins_per_level:20}},
 offers:{starter:{enabled:1,min_level:3,hours:48},wallet_link:1,cat_vitamins_link:1,energy_buy:1},
 // Stub catalog. Real products get ids "com.sergey.onemorecat.<key>" in App Store Connect.
 products:[
  {key:'starter',icon:'🎁',title:'Набор новичка',note:'2 000 ✦, 30 💊, полная энергия и ✨ золотой ошейник. Один раз.',price:'149 ₽',once:1,offer:'starter',grant:{coins:2000,vitamins:30,energy:'full',charm:1},badge:'−70%'},
  {key:'removeads',icon:'⊘',title:'Без рекламы',note:'Все бонусы «за рекламу» сразу, без просмотра.',price:'379 ₽',once:1},
  {key:'energy',icon:'ϟ',title:'Полная энергия',note:'Сразу до максимума.',price:'75 ₽',grant:{energy:'full'}},
  {key:'vitamins',icon:'💊',title:'50 витаминок',note:'Для эволюции котов на уровнях 5, 10, 15 и 20.',price:'229 ₽',grant:{vitamins:50}},
  {key:'coins',icon:'✦',title:'3 000 монет',note:'На скиллы и прокачку котов.',price:'149 ₽',grant:{coins:3000}},
  {key:'coins_big',icon:'✦',title:'12 000 монет',note:'На скиллы, мебель и прокачку котов.',price:'449 ₽',grant:{coins:12000},badge:'выгодно'}]};
const user=parse(remote.monetization_config);
const CFG={...DEFAULTS,...user,placements:{...DEFAULTS.placements},offers:{...DEFAULTS.offers,...user.offers},products:Array.isArray(user.products)?user.products:DEFAULTS.products};
for(const [k,v] of Object.entries(user.placements||{}))CFG.placements[k]={...DEFAULTS.placements[k],...v};
const productId=key=>'com.sergey.onemorecat.'+key;
const product=key=>CFG.products.find(p=>p.key===key);
const P={removeAds:productId('removeads')};
const adsNative=OMC.native&&CFG.ads_provider==='native',iapNative=OMC.native&&CFG.iap_provider==='native';

const track=(name,params={})=>{if(OMC.analytics)OMC.call('track',{name,params})};
const haptic=style=>{if(OMC.native)OMC.call('haptic',{style})};
const level=()=>Economy.playerProgress(save.xp).level;
const tutorial=()=>document.body.classList.contains('ftue')||!!(save.tutorial&&!save.tutorial.done);

// Local state: daily caps, stub purchases, the starter offer timer. Kept outside the save on purpose.
const STATE_KEY='omc-monet-v1';
function state(){let s={};try{s=JSON.parse(localStorage.getItem(STATE_KEY)||'{}')}catch{}const day=new Date().toDateString();if(s.day!==day){s.day=day;s.used={}}s.used??={};s.owned??=[];return s}
function store(s){try{localStorage.setItem(STATE_KEY,JSON.stringify(s))}catch{}}
const owns=key=>OMC.owned.has(productId(key))||(!iapNative&&state().owned.includes(key));

// ---------- Placements ----------
function adsLeft(name){const p=CFG.placements[name];if(!p)return 0;return p.cap?Math.max(0,p.cap-(state().used[name]||0)):Infinity}
function available(name){const p=CFG.placements[name];return !!p&&!!+p.enabled&&!tutorial()&&level()>=(p.min_level||1)&&adsLeft(name)>0}
function useAd(name){const s=state();s.used[name]=(s.used[name]||0)+1;store(s)}
const noAds=()=>owns('removeads');
const adLabel=text=>`${noAds()?'✓':'▶'} ${text}`;
// Every button for an ad or an offer carries data-placement; the first time one is on screen it is counted.
const seen=new WeakSet();
function watchOffers(){
 for(const el of document.querySelectorAll('[data-placement]')){
  if(seen.has(el)||el.hidden||el.disabled||!el.offsetParent)continue;
  seen.add(el);
  if(el.dataset.product)track('iap_offer',{placement:el.dataset.placement,product_id:productId(el.dataset.product)});
  else track('ad_offer',{placement:el.dataset.placement,provider:noAds()?'no_ads':CFG.ads_provider});
 }
}
setInterval(watchOffers,500);

let adBusy=false;
// Resolves true once the reward is earned. Counts toward the placement's daily cap.
async function rewarded(placement){
 if(adBusy)return false;
 const provider=noAds()?'no_ads':adsNative?'native':'stub';
 track('ad_start',{placement,format:'rewarded',provider});
 if(provider==='no_ads'){useAd(placement);track('ad_reward',{placement,provider});haptic('success');return true}
 adBusy=true;
 try{audioCtx?.suspend()}catch{}
 try{
  const r=provider==='native'?await OMC.call('ads.rewarded',{placement}):await stubAd(placement);
  if(r?.rewarded){useAd(placement);track('ad_reward',{placement,provider});haptic('success');return true}
  track('ad_fail',{placement,provider,reason:r?.error||'closed'});
  toast(r?.error==='unavailable'?'Реклама пока не загрузилась. Попробуй чуть позже':'Награда не получена: реклама закрыта раньше');
  return false;
 }finally{adBusy=false;if(sound)try{audioCtx?.resume()}catch{}}
}

// Test ad screen: a short countdown, then take the reward or close without it.
const PLACEMENT_NAMES={rescue:'Спасти котов',revive:'Вторая попытка',run_x2:'Удвоить монеты',energy:'Энергия',collect_x2:'Двойной сбор',task_reroll:'Замена задания',booster_free:'Расходник',shop_gift:'Подарок приюта'};
const adDialog=document.createElement('dialog');adDialog.id='stubAd';adDialog.className='stub-ad';adDialog.setAttribute('aria-label','Тестовая реклама');
document.body.append(adDialog);
function stubAd(placement){
 return new Promise(resolve=>{
  let left=Math.max(0,+CFG.stub_ad_seconds||0),timer=0;
  const total=left||1;
  adDialog.innerHTML=`<span class="eyebrow">ЗАГЛУШКА · ${PLACEMENT_NAMES[placement]||placement}</span><div class="stub-ad-art"><span>AD</span></div><h2>Тестовая реклама</h2><p>Здесь будет видео. Настоящая реклама ещё не подключена.</p><div class="progress-track"><div id="stubAdBar"></div></div><button class="primary" id="stubAdTake" disabled></button><button class="text-btn" id="stubAdClose">Закрыть без награды</button>`;
  const take=adDialog.querySelector('#stubAdTake'),bar=adDialog.querySelector('#stubAdBar');
  const tick=()=>{take.textContent=left>0?`Награда через ${left}…`:'Получить награду';take.disabled=left>0;bar.style.width=`${(1-left/total)*100}%`;if(left>0){left--;timer=setTimeout(tick,1000)}};
  const done=ok=>{clearTimeout(timer);adDialog.close();resolve(ok?{rewarded:true}:{rewarded:false,error:'closed'})};
  take.onclick=()=>done(true);adDialog.querySelector('#stubAdClose').onclick=()=>done(false);
  adDialog.oncancel=e=>{e.preventDefault();done(false)};
  adDialog.showModal();tick();
 });
}

// ---------- Purchases ----------
const grantText=g=>[g.coins?`+${g.coins.toLocaleString('ru')} ✦`:'',g.vitamins?`+${g.vitamins} 💊`:'',g.energy?'полная энергия ϟ':'',g.charm?`✨ ошейник ×${g.charm}`:''].filter(Boolean).join(' · ');
function applyGrant(g){
 Economy.tick(save);
 if(g.coins)save.coins+=g.coins;
 if(g.vitamins)save.vitamins+=g.vitamins;
 if(g.energy==='full'){save.energy=Math.max(save.energy,Economy.energyMax(save));save.energyAt=Date.now()}
 if(g.charm)save.goldCharm=(save.goldCharm||0)+g.charm;
 persist();updateMeta();if(typeof refreshUpgradeViews==='function')refreshUpgradeViews();chirp(820);
}
const buyDialog=document.createElement('dialog');buyDialog.id='stubBuy';buyDialog.className='stub-buy';buyDialog.setAttribute('aria-label','Тестовая покупка');
document.body.append(buyDialog);
function stubPurchase(item){
 // Release builds never hand out free test purchases unless the config asks for it.
 if(OMC.native&&!OMC.debug&&!+CFG.stub_purchases_release)return Promise.resolve({status:'failed',message:'покупки появятся в следующей версии'});
 return new Promise(resolve=>{
  buyDialog.innerHTML=`<span class="eyebrow">ЗАГЛУШКА · APP STORE</span><div class="stub-buy-head"><span class="shop-icon">${item.icon}</span><div><b>${item.title}</b><small>${item.note}</small></div></div><p class="stub-buy-price">${item.price}</p><p class="muted">Тестовая покупка: деньги не списываются, товар выдаётся сразу.</p><button class="primary" id="stubBuyOk">Купить (тест)</button><button class="text-btn" id="stubBuyCancel">Отмена</button>`;
  const done=status=>{buyDialog.close();resolve({status})};
  buyDialog.querySelector('#stubBuyOk').onclick=()=>done('purchased');buyDialog.querySelector('#stubBuyCancel').onclick=()=>done('cancelled');
  buyDialog.oncancel=e=>{e.preventDefault();done('cancelled')};
  buyDialog.showModal();
 });
}
// The one way to buy: from the shop or straight from an offer. Resolves true when the item is the player's.
async function buy(key,placement){
 const item=product(key);if(!item||(item.once&&owns(key)))return false;
 const id=productId(key),provider=iapNative?'native':'stub';
 track('purchase_start',{product_id:id,placement,provider});
 const r=iapNative?await OMC.call('store.purchase',{id}):await stubPurchase(item);
 track('purchase_result',{product_id:id,placement,provider,status:r?.status||'failed'});
 if(r?.status==='purchased'){
  if(OMC.analytics)OMC.call('userProps',{props:{payer:1}});
  // Native consumables are granted through OMC.grant, called by the app.
  if(!iapNative){
   if(item.once){const s=state();s.owned=[...new Set([...s.owned,key])];store(s)}
   if(item.grant)applyGrant(item.grant);
   toast(item.grant?`${item.title}: ${grantText(item.grant)}`:`${item.title}: покупка твоя ✓`);
  }else if(!item.grant)toast('Спасибо! Покупка твоя ✓');
  haptic('success');refresh();return true;
 }
 if(r?.status==='pending')toast('Покупка ждёт подтверждения');
 else if(r?.status!=='cancelled')toast(r?.message?`Не получилось: ${r.message}`:'Не получилось купить. Попробуй ещё раз');
 return false;
}
// Called by the app for native consumables. Must save before returning true.
OMC.grant=id=>{
 const item=CFG.products.find(p=>productId(p.key)===id);if(!item?.grant)return false;
 applyGrant(item.grant);toast(`${item.title}: ${grantText(item.grant)}`);haptic('success');
 return true;
};
OMC.on('entitlements',ids=>{OMC.owned=new Set(ids);refresh()});

// ---------- Starter offer: one-time, opens after the tutorial at min_level and runs for N hours ----------
function starter(){
 const o=CFG.offers.starter,s=state();
 if(!o||!+o.enabled||owns('starter')||tutorial()||level()<(o.min_level||1))return null;
 if(!s.starterAt){s.starterAt=Date.now();store(s)}
 const left=s.starterAt+(o.hours||48)*3600000-Date.now();
 return left>0?{left,seenToday:s.starterSeen===s.day}:null;
}
const starterDialog=document.createElement('dialog');starterDialog.id='starterDialog';starterDialog.className='offer-dialog';starterDialog.setAttribute('aria-label','Набор новичка');
document.body.append(starterDialog);
function starterCard(placement,compact=false){
 const st=starter(),item=product('starter');if(!st||!item)return '';
 return `<article class="offer-card ${compact?'compact':''}"><span class="offer-badge">${item.badge||'Один раз'}</span><span class="shop-icon">${item.icon}</span><div><b>${item.title}</b><small>${item.note}</small><small class="offer-timer">Осталось ${timeLabel(st.left/1000)}</small></div><button class="primary" data-buy="starter" data-product="starter" data-placement="${placement}">${iapNative?'Купить':item.price}</button></article>`;
}
// Once a day while it runs, in the lobby, when nothing else is open.
function maybeStarterPopup(){
 const st=starter();
 if(!st||st.seenToday||document.body.dataset.screen!=='lobby'||document.querySelector('dialog[open]')||phase==='playing')return;
 const s=state();s.starterSeen=s.day;store(s);
 starterDialog.innerHTML=`<span class="eyebrow">ТОЛЬКО ДЛЯ НОВЫХ ПРИЮТОВ</span><h2>Набор новичка</h2><p>Хороший старт для приюта: монеты, витаминки и золотой кот в следующем рейсе.</p>${starterCard('starter_popup')}<button class="text-btn" id="starterLater">Позже</button>`;
 starterDialog.showModal();
}
starterDialog.addEventListener('click',e=>{if(e.target.closest('#starterLater'))starterDialog.close()});

// ---------- Shop pane ----------
function openShop(source='nav'){
 if(tutorial())return;
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 mobileLobby('rooms');
 for(const p of ['rooms','cats','gear','quests','skins','settings'])if($('pane-'+p))$('pane-'+p).hidden=true;
 $('pane-shop').hidden=false;
 document.querySelector('.shelter-head h2').textContent='Лавка';
 document.querySelectorAll('[data-mobile-pane]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-current','false')});
 $('mobileShop').classList.add('selected');$('mobileShop').setAttribute('aria-current','page');
 $('mobileSettings')?.classList.remove('selected');
 track('shop_open',{source});
 renderShop();
}
function closeShop(){$('pane-shop').hidden=true;$('mobileShop').classList.remove('selected');$('mobileShop').setAttribute('aria-current','false')}
document.addEventListener('click',e=>{if(e.target.closest('[data-mobile-pane],[data-pane],#mobileBack,#backLobby,#shelterTab,.brand,#mobileSettings'))closeShop()},true);
$('mobileShop').onclick=()=>openShop('nav');
const giftCoins=()=>{const p=CFG.placements.shop_gift;return Math.round((p.coins_base||0)+(p.coins_per_level||0)*level())};
let nativeCatalog=null;
async function renderShop(){
 const host=$('shopList');if($('pane-shop').hidden)return;
 const prices={};
 if(iapNative){
  if(!nativeCatalog){host.innerHTML='<p class="muted">Загружаем товары…</p>';const list=await OMC.call('store.products');nativeCatalog=Array.isArray(list)?list:[]}
  if(!nativeCatalog.length){nativeCatalog=null;host.innerHTML='<p class="muted">Лавка пока недоступна. Проверь интернет и загляни позже.</p>';return}
  for(const p of nativeCatalog)prices[p.id]=p.price;
 }
 const gift=available('shop_gift')?`<article class="shop-card gift-card"><span class="shop-icon">🎀</span><div><b>Подарок приюта</b><small>+${giftCoins()} ✦ за короткую рекламу${adsLeft('shop_gift')===Infinity?'':` · ещё ${adsLeft('shop_gift')} сегодня`}</small></div><button class="secondary ad-btn" data-ad-gift data-placement="shop_gift">${adLabel('Забрать')}</button></article>`:'';
 const items=CFG.products.filter(p=>!p.offer).map(item=>{
  const id=productId(item.key),owned=item.once&&owns(item.key),price=iapNative?prices[id]:item.price;if(!price)return '';
  return `<article class="shop-card ${owned?'owned':''}">${item.badge?`<span class="offer-badge">${item.badge}</span>`:''}<span class="shop-icon">${item.icon}</span><div><b>${item.title}</b><small>${item.note}</small></div><button class="primary" data-buy="${item.key}" data-product="${item.key}" data-placement="shop" ${owned?'disabled':''}>${owned?'Есть ✓':price}</button></article>`}).join('');
 host.innerHTML=starterCard('shop_starter')+gift+items+(iapNative?'':`<div class="web-shop-note"><b>Это тестовая веб-версия</b><p class="muted">Покупок здесь нет: лавка откроется в приложении для iPhone. Бонусы за «рекламу» работают, в вебе это заглушка на пару секунд.</p></div>`);
}
function refresh(){renderShop();syncDouble();syncStarterBanner()}
document.addEventListener('click',async e=>{
 const buyBtn=e.target.closest('[data-buy]');
 if(buyBtn&&!buyBtn.disabled){
  const label=buyBtn.textContent;buyBtn.disabled=true;buyBtn.textContent='…';
  const ok=await buy(buyBtn.dataset.buy,buyBtn.dataset.placement||'shop');
  buyBtn.textContent=label;buyBtn.disabled=false;
  if(ok&&starterDialog.open)starterDialog.close();
  if(ok&&energyDialog.open){energyDialog.close();start(pendingChallenge)}
  refresh();return;
 }
 if(e.target.closest('[data-ad-gift]')){if(!available('shop_gift')||!await rewarded('shop_gift'))return;const n=giftCoins();save.coins+=n;persist();updateMeta();toast(`Подарок приюта: +${n} ✦`);chirp(760);renderShop();return}
 const link=e.target.closest('[data-shop-source]');
 if(link){e.preventDefault();openShop(link.dataset.shopSource)}
});
$('restorePurchases').hidden=!iapNative;
$('restorePurchases').onclick=async()=>{
 if(!iapNative){toast('Тестовая лавка: восстанавливать нечего');return}
 const r=await OMC.call('store.restore');
 if(r?.ok){OMC.owned=new Set(r.owned||[]);refresh();toast(r.owned?.length?'Покупки восстановлены ✓':'Покупок для восстановления нет')}else toast('Не удалось связаться с App Store');
};
// Wallets lead to the shop once it is open to the player.
for(const [sel,source] of [['.shelter-head .wallet','wallet_coins'],['.shelter-head .vitamin-wallet','wallet_vitamins']]){
 const w=document.querySelector(sel);if(!w)continue;
 w.setAttribute('role','button');w.classList.add('wallet-link');
 w.addEventListener('click',()=>{if(+CFG.offers.wallet_link&&!tutorial()&&phase!=='playing')openShop(source)});
}

// ---------- Rewarded placements ----------
// rescue: after a fall the bottom cats go home for an ad (stays free in the tutorial or when switched off).
let reviveOpen=false,revivesThisRun=0,reviveTimer=0;
const baseFinish=finish;
finish=function(delivered=false,challengeDone=false){
 const was=phase;reviveOpen=false;clearInterval(reviveTimer);
 baseFinish(delivered,challengeDone);
 if(was===phase||phase!=='result')return;
 haptic(delivered||challengeDone?'success':'error');
 const button=$('rescueHalf');
 if(!button||button.disabled||tutorial()||!+CFG.placements.rescue.enabled)return;
 const note=button.nextElementSibling;
 if(!available('rescue')){button.disabled=true;if(note?.classList.contains('rescue-note'))note.textContent='Спасения за рекламу на сегодня закончились';return}
 button.dataset.placement='rescue';button.classList.add('ad-btn');
 button.innerHTML=adLabel(`${rescueLabel()} · ${rescueOffer.length} 🐾`);
 if(note?.classList.contains('rescue-note'))note.textContent=noAds()?'Нижние коты с подноса · без рекламы':'Нижние коты с подноса за короткую рекламу';
 button.onclick=async()=>{button.disabled=true;if(await rewarded('rescue'))rescueHalf();else button.disabled=false};
};

// revive: the first fall in a run can be caught by the net for an ad, and the run goes on.
const baseBeginRun=Economy.beginRun;
Economy.beginRun=(s,...rest)=>{const ok=baseBeginRun(s,...rest);if(ok&&s===save)revivesThisRun=0;return ok};
const baseCatch=catchFall;
catchFall=function(c){
 if(baseCatch(c))return true;
 const p=CFG.placements.revive;
 const take=()=>{Composite.remove(engine.world,c.body);cats=cats.filter(x=>x!==c);if(c.landed)score--;if(c===pending)chooseNext()};
 // Other cats that slip off while the offer is up go into the same net.
 if(reviveOpen){take();return true}
 if(phase!=='playing'||challengeMode||revivesThisRun>=(p.per_run||1)||score<(p.min_cats||0)||!available('revive'))return false;
 take();revivesThisRun++;reviveOpen=true;phase='paused';hud();haptic('warning');
 const total=p.seconds||10;let left=total;
 overlay(`<span class="eyebrow">ОЙ. КОТ СОРВАЛСЯ.</span><h2>Ещё шанс?</h2><p>Сетка поймает кота, и рейс продолжится. На подносе ${score} ${plural(score,'кот','кота','котов')}.</p><div class="revive-ring" id="reviveRing" style="--p:1"><b id="reviveLeft">${left}</b></div><button class="primary ad-btn" id="reviveAd" data-placement="revive">${adLabel('Поймать сеткой')}</button><button class="text-btn" id="reviveNo">Нет, завершить рейс</button>`);
 const decline=()=>{clearInterval(reviveTimer);if(!reviveOpen)return;reviveOpen=false;phase='playing';finish()};
 reviveTimer=setInterval(()=>{if(adBusy)return;left--;if($('reviveLeft'))$('reviveLeft').textContent=Math.max(0,left);$('reviveRing')?.style.setProperty('--p',Math.max(0,left/total));if(left<=0)decline()},1000);
 $('reviveNo').onclick=decline;
 $('reviveAd').onclick=async()=>{
  $('reviveAd').disabled=true;
  if(!await rewarded('revive')){$('reviveAd').disabled=false;return}
  clearInterval(reviveTimer);if(!reviveOpen)return;reviveOpen=false;
  if(!hasDoomedCat())cashoutLocked=false;
  phase='playing';$('overlay').classList.add('hidden');hud();if(typeof updateRiskHUD==='function')updateRiskHUD();
  $('floatText').textContent='Сетка поймала! Лови дальше';$('floatText').classList.add('show');setTimeout(()=>$('floatText').classList.remove('show'),1100);
  if(typeof mobileScreen==='function')mobileScreen('game');
 };
 return true;
};
// While the offer is up, "continue" brings the offer back instead of resuming the run for free.
const basePause=pause;
pause=function(){if(reviveOpen){if(typeof mobileScreen==='function')mobileScreen('game');return}basePause()};

// run_x2: double the coins of a delivery.
const baseRewards=renderRewards;
renderRewards=function(animate=true){
 baseRewards(animate);
 const r=deliveryReceipt,p=CFG.placements.run_x2;
 if(!r||r.rescued||challengeMode||r.doubled||(r.reward||0)<(p.min_coins||0)||!available('run_x2'))return;
 const back=$('backLobby');if(!back)return;
 const b=document.createElement('button');b.className='primary ad-btn x2-btn';b.dataset.placement='run_x2';b.innerHTML=adLabel(`Удвоить монеты · +${r.reward} ✦`);
 back.before(b);back.className='secondary';
 b.onclick=async()=>{b.disabled=true;if(!await rewarded('run_x2')){b.disabled=false;return}if(r.doubled)return;r.doubled=true;save.coins+=r.reward;r.reward*=2;persist();updateMeta();renderRewards(false);toast(`Монеты удвоены: ${r.reward} ✦`);chirp(880)};
};

// energy: out of energy before a run. A rewarded refill, or the energy product right in the dialog.
const baseStart=start;
let pendingChallenge=null;
start=function(challenge=null){
 if(phase==='playing'||reviveOpen)return;
 Economy.tick(save);
 if(save.energy<Economy.runEnergy(save.config)&&!tutorial()){offerEnergy(challenge);return}
 baseStart(challenge);
 if(phase==='playing'&&typeof mobileScreen==='function')mobileScreen('game');
};
const energyDialog=document.createElement('dialog');
energyDialog.id='energyDialog';energyDialog.setAttribute('aria-label','Энергия');
document.body.append(energyDialog);
function offerEnergy(challenge){
 pendingChallenge=challenge;
 const cost=Economy.runEnergy(save.config),ad=available('energy'),left=adsLeft('energy'),item=product('energy');
 const wait=timeLabel((save.energyAt+Economy.refillMinutes(save)*60000-Date.now())/1000);
 energyDialog.innerHTML=`<span class="eyebrow">КОТЫ ЖДУТ. ЭНЕРГИИ НЕТ.</span><h2>Нужна энергия</h2><p>На рейс нужно ${cost} ϟ, сейчас ${save.energy}.<br>+1 через ${wait}.</p>
 ${+CFG.placements.energy.enabled?`<button class="primary ad-btn" id="energyAd" data-placement="energy" ${ad?'':'disabled'}>${adLabel(`+${cost} ϟ за рекламу`)}</button>
 <small class="energy-note">${ad?(left===Infinity?'':`Ещё ${left} за сегодня`):'Бонусы на сегодня закончились'}</small>`:''}
 ${+CFG.offers.energy_buy&&item?`<button class="secondary" data-buy="energy" data-product="energy" data-placement="energy_dialog">ϟ Полная энергия · ${iapNative?'в лавке':item.price}</button>`:''}
 <button class="text-btn" data-shop-source="energy_dialog">Все товары в лавке</button>
 <button class="text-btn" id="energyWait">Подожду</button>`;
 energyDialog.showModal();
 $('energyWait').onclick=()=>energyDialog.close();
 if($('energyAd'))$('energyAd').onclick=async()=>{
  if(!await rewarded('energy'))return;
  Economy.tick(save);
  save.energy=Math.min(Economy.energyMax(save),save.energy+cost);
  if(save.energy>=Economy.energyMax(save))save.energyAt=Date.now();
  persist();updateMeta();energyDialog.close();toast(`+${cost} ϟ энергии`);
  start(challenge);
 };
}

// collect_x2: shelter income, optional double collect.
function syncDouble(){
 const summary=document.querySelector('#pane-rooms .income-summary');if(!summary)return;
 let button=$('collectDouble');
 if(!button){button=document.createElement('button');button.id='collectDouble';button.className='secondary ad-btn double-collect';button.dataset.placement='collect_x2';summary.after(button);
  button.onclick=async()=>{if(!await rewarded('collect_x2'))return;api.doubling=true;const n=Economy.collect(save);save.coins+=n;persist();updateMeta();toast(`+${Math.floor(n*2)} ✦ — двойной сбор!`);chirp(760)}}
 const bank=Math.floor(save.rooms.reduce((n,r)=>n+r.bank,0));
 button.hidden=!available('collect_x2')||bank<(CFG.placements.collect_x2.min_bank||0);
 button.innerHTML=adLabel(`Забрать x2 за рекламу · ${bank*2} ✦`);
}
// Starter banner on top of the rooms while the offer runs.
function syncStarterBanner(){
 const pane=$('pane-rooms');if(!pane)return;
 let host=$('starterBanner');
 if(!host){host=document.createElement('div');host.id='starterBanner';pane.prepend(host)}
 const html=starterCard('rooms_banner',true),key=html.replace(/Осталось [^<]*/,'');
 if(host._markup!==key){host.innerHTML=html;host._markup=key}
 else{const t=host.querySelector('.offer-timer'),st=starter();if(t&&st)t.textContent='Осталось '+timeLabel(st.left/1000)}
 host.hidden=!html;
}
const baseUpdateMeta=updateMeta;
updateMeta=function(){baseUpdateMeta();syncDouble();syncStarterBanner()};

// booster_free: on the pre-run screen, one random open booster for an ad.
const basePrep=prepMarkup;
prepMarkup=function(){
 const html=basePrep(),open=Economy.boosters.filter(b=>Economy.boosterOpen(save,b)&&!save.boost[b.key]);
 if(!open.length||!available('booster_free'))return html;
 return html.replace('<button class="primary prep-go"',`<button type="button" class="secondary ad-btn prep-ad" id="boosterAd" data-placement="booster_free">${adLabel('Случайный расходник бесплатно')}</button><button class="primary prep-go"`);
};
document.addEventListener('click',async e=>{
 const b=e.target.closest('#boosterAd');if(!b||b.disabled)return;
 b.disabled=true;
 if(!await rewarded('booster_free')){b.disabled=false;return}
 const open=Economy.boosters.filter(x=>Economy.boosterOpen(save,x)&&!save.boost[x.key]);if(!open.length)return;
 const pick=open[Math.floor(Math.random()*open.length)];save.boost[pick.key]=1;persist();updateMeta();syncPrep();toast(`${pick.icon} ${pick.name} в этом рейсе: ${pick.desc}`);chirp(640);
});

// task_reroll is drawn by meta.js; it asks available() and rewarded() here.

// ---------- Shop links in place ----------
// Cat card: short of vitamins.
const baseCatCard=catUpgradeCard;
catUpgradeCard=function(t,receipt=null){
 const html=baseCatCard(t,receipt);
 if(receipt||!+CFG.offers.cat_vitamins_link||tutorial()||!html.includes('💊 (получи в квестах)'))return html;
 return html.replace(/<\/article>$/,'<button class="text-btn shop-link" data-shop-source="cat_vitamins" data-placement="cat_vitamins" data-product="vitamins">💊 Витаминки в лавке →</button></article>');
};

// Skins are switched off for now: base sprite cats only.
function enforceSkins(){if(SkinArt.selected!=='flat'){SkinArt.select('flat');syncArt()}}
document.querySelectorAll('[data-mobile-pane="skins"],[data-pane="skins"]').forEach(b=>b.hidden=true);

// Haptics on the moments that matter.
const baseLanded=landed;
landed=function(cat){const before=score;baseLanded(cat);if(score>before)haptic(score%5===0?'medium':'light')};

setInterval(()=>{maybeStarterPopup();syncStarterBanner()},2000);
enforceSkins();syncDouble();syncStarterBanner();
if(OMC.native)OMC.call('ready').then(r=>{if(Array.isArray(r?.owned)){OMC.owned=new Set(r.owned);refresh()}});
// Debug cheat in settings.js: caps, stub purchases and the starter timer start over.
function resetStub(){try{localStorage.removeItem(STATE_KEY);localStorage.removeItem('omc-ad-caps')}catch{}refresh()}
// doubling: set right before a double collect, so analytics.js can tell it apart.
const api={P,openShop,rewarded,available,owns,buy,resetStub,config:CFG,doubling:false};
return api;
})();
