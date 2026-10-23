'use strict';
// Web build only. Loaded last.
(()=>{
// Feedback channel: set a URL here to show the button in Settings.
const FEEDBACK_URL='';
if(FEEDBACK_URL){
 const ua=navigator.userAgent,device=/iPhone|iPad/.test(ua)?'iOS':/Android/.test(ua)?'Android':'другое';
 const info=`Версия: ${OMC.version||'веб'} · ${device} · ${innerWidth}×${innerHeight}`;
 $('feedbackLink').href=FEEDBACK_URL.startsWith('mailto:')?FEEDBACK_URL+'?subject='+encodeURIComponent('Ещё один кот — отзыв')+'&body='+encodeURIComponent('\n\n—\n'+info):FEEDBACK_URL;
 $('feedbackGroup').hidden=false;
}
// No pinch zoom: iOS Safari ignores user-scalable=no; double-tap is off via touch-action in native.css.
for(const e of ['gesturestart','gesturechange'])document.addEventListener(e,ev=>ev.preventDefault(),{passive:false});
// Splash stays until assets are in, like the app's launch screen.
const splash=$('webSplash'),shown=Date.now();
const hide=()=>{if(!splash||splash.classList.contains('gone'))return;setTimeout(()=>{splash.classList.add('gone');setTimeout(()=>splash.remove(),400)},Math.max(0,900-(Date.now()-shown)))};
const loaded=new Promise(r=>document.readyState==='complete'?r():addEventListener('load',r));
Promise.all([loaded,ClayArt.load]).then(hide,hide);setTimeout(hide,8000);
})();
