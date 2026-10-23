'use strict';
// Links shared from the offline app must point to the playable hosted game.
const shareBase=OMC.shareBase||'https://one-more-cat-sergey.maple-book-5630.chatgpt.site/mobile';
const webOpenShare=openShare;
openShare=function(){webOpenShare();if(lastChallenge)sharingUrl=shareBase+'#cat='+encodeURIComponent(btoa(JSON.stringify(lastChallenge)))};
$('challenge').onclick=openShare;
if(OMC.native){
 $('copyChallenge').textContent='Поделиться';
 $('copyChallenge').onclick=()=>OMC.call('share',{text:sharingUrl});
 $('downloadCard').textContent='Поделиться картинкой';
 $('downloadCard').onclick=()=>OMC.call('shareImage',{data:$('shareCanvas').toDataURL('image/png')});
 const notes=document.querySelectorAll('#shelter > .save-note');
 if(notes.length)notes[notes.length-1].textContent='✓ Прогресс сохраняется на iPhone и в iCloud';
}
