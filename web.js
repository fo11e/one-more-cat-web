'use strict';
// Web build only. Loaded last.
(()=>{
// No energy on the web: there are no purchases to refill it, so runs are free (costs are also 0 via OMC_BOOT.remote).
const full=s=>Economy.energyMax?Economy.energyMax(s):s.config.energyMax;
const baseTick=Economy.tick;Economy.tick=(s,now)=>{const r=baseTick(s,now);s.energy=full(s);s.energyAt=Date.now();return r};
Economy.beginRun=s=>{Economy.tick(s);return true};
Economy.settleRun=s=>{delete s.pendingEnergyCost;delete s.pendingRunPaid;return 0};
save.energy=full(save);delete save.pendingEnergyCost;delete save.pendingRunPaid;persist();updateMeta();
document.documentElement.classList.add('no-energy');
// No pinch zoom: iOS Safari ignores user-scalable=no; double-tap is off via touch-action in native.css.
for(const e of ['gesturestart','gesturechange'])document.addEventListener(e,ev=>ev.preventDefault(),{passive:false});
// Splash stays until assets are in, like the app's launch screen.
const splash=$('webSplash'),shown=Date.now();
const hide=()=>{if(!splash||splash.classList.contains('gone'))return;setTimeout(()=>{splash.classList.add('gone');setTimeout(()=>splash.remove(),400)},Math.max(0,900-(Date.now()-shown)))};
const loaded=new Promise(r=>document.readyState==='complete'?r():addEventListener('load',r));
Promise.all([loaded,CatSprites.load]).then(hide,hide);setTimeout(hide,8000);
})();
