'use strict';
// Haptic feedback on interface actions, played natively through OMC.call('haptic'). Loaded last.
// Taps get a light tick (tabs: selection, main buttons: medium); toasts about rewards get success,
// refusals get warning/error. A tap and its outcome land in one tick, so only the strongest plays.
(()=>{
if(!window.OMC?.native)return;
const KEY='omc-haptics';
let on=true;try{on=localStorage.getItem(KEY)!=='off'}catch{}
const rank={selection:0,light:1,medium:2,heavy:3,success:4,warning:5,error:6};
const call=OMC.call;
let queued=null;
function play(style){
 if(!on)return;
 if(queued){if(rank[style]>rank[queued])queued=style;return}
 queued=style;
 setTimeout(()=>{const s=queued;queued=null;call('haptic',{style:s})},0);
}
OMC.call=(action,payload={})=>action==='haptic'?(play(payload.style||'light'),Promise.resolve(null)):call(action,payload);
OMC.haptic=play;

// Taps.
document.addEventListener('click',e=>{
 const el=e.target.closest?.('button,summary,[role="button"],a[href]');
 if(!el||el.disabled)return;
 if(el.matches('[data-mobile-pane],[data-pane],#mobileShop,#mobileSettings'))play('selection');
 else if(el.matches('.primary,.mobile-launch button,.cashout-button'))play('medium');
 else play('light');
},true);
// A tap on something you cannot press yet (not enough coins, locked skill): a soft "no".
document.addEventListener('touchend',e=>{
 const el=e.target.closest?.('button:disabled,.locked button,[aria-disabled="true"]');
 if(el&&!el.closest('#pane-settings'))play('warning');
},{capture:true,passive:true});

// Outcomes, read from the toast line every screen already shows.
const fail=/^(Не |Энергия закончилась|Сначала|Заменить не на что|Реклама пока|Награда не|Лавка пока|Ссылка на вызов повреждена|Скопируй)/;
const good=/^(\+|✓)|Ранг \d|Сундук|Подарок|удвоены|двойной сбор|уровень \d|куплен|улучшена|покупка твоя|Покупка твоя|восстановлены ✓|Задание выполнено|Монеты/;
const baseToast=toast;
toast=function(s){
 const text=String(s);
 if(fail.test(text))play(/^Не (удалось|получилось)/.test(text)?'error':'warning');
 else if(good.test(text))play('success');
 return baseToast.apply(this,arguments);
};

// Settings: "Вибрация" row under "Звук".
const row=document.querySelector('#pane-settings .settings-row');
if(row){
 const r=document.createElement('div');r.className='settings-row';
 r.style.marginTop='12px';r.innerHTML='<span>Вибрация</span><button id="hapticsToggle" class="icon-btn"></button>';
 row.after(r);
 const b=r.querySelector('button');
 const paint=()=>{b.innerHTML=`〰 <span>${on?'Вкл.':'Выкл.'}</span>`;b.setAttribute('aria-label',on?'Выключить вибрацию':'Включить вибрацию');b.setAttribute('aria-pressed',String(on))};
 paint();
 b.onclick=()=>{on=!on;try{localStorage.setItem(KEY,on?'on':'off')}catch{}paint();if(on)play('medium')};
}
})();
