'use strict';
// Loaded first. Seeds saves from the app and exposes OMC.call(action,payload) -> Promise.
(()=>{
const boot=window.OMC_BOOT||{};
const handler=window.webkit?.messageHandlers?.native;
const call=(action,payload={})=>handler?Promise.resolve(handler.postMessage({action,...payload})).catch(error=>({error:String(error)})):Promise.resolve({error:'no-native'});
const saveKeys=new Set(['one-more-cat-v2','one-more-cat-v1','one-more-cat-skin-v2']);
// The app's copy wins over whatever the web view kept from an earlier session.
try{for(const [key,value] of Object.entries(boot.saves||{}))if(saveKeys.has(key))localStorage.setItem(key,value)}catch{}
if(handler){const setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){setItem.call(this,key,value);if(this===localStorage&&saveKeys.has(key))call('save',{key,value:String(value)})}}
const listeners={};
// Script errors go to Crashlytics as non-fatal issues.
if(handler){addEventListener('error',e=>call('jsError',{message:String(e.message||e.error),source:String(e.filename||''),line:e.lineno||0}));addEventListener('unhandledrejection',e=>call('jsError',{message:'Unhandled rejection: '+String(e.reason?.message||e.reason),source:String(e.reason?.stack||''),line:0}))}
window.OMC={native:!!handler,debug:!!boot.debug,owned:new Set(boot.owned||[]),shareBase:boot.shareBase,version:boot.version,call,
 remote:boot.remote||{},analytics:!!(handler&&boot.analytics),
 on(event,fn){(listeners[event]??=[]).push(fn)},
 emit(event,data){for(const fn of listeners[event]||[])try{fn(data)}catch(error){console.error(error)}}};
document.documentElement.classList.toggle('debug-build',OMC.debug);
document.documentElement.classList.toggle('native-app',OMC.native);
})();
