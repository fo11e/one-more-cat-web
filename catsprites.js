'use strict';
// Base cat art from the sprite sheet. Each body box (x,y,w,h in sprite pixels) is what the collider covers;
// ears, tails, the helmet and the crown hang outside it. TYPES sizes in app.js come from these boxes.
const CatSprites=(()=>{
 const bodies=[[3.6,14.8,106.3,70.6],[13.1,18.4,165.8,52.0],[4.1,16.2,101.3,67.2],[3.6,14.3,96.4,59.1],[4.1,10.7,120.2,46.1],[4.5,23.3,116.0,72.1],[3.6,10.4,113.3,66.0],[3.1,10.9,119.3,66.5],[3.6,14.9,106.7,67.5],[4.5,12.2,152.5,59.2],[3.6,11.3,101.0,85.1],[6.8,11.2,151.4,57.7],[3.6,22.0,126.0,71.4]];
 const images=[];let ready=false;
 const gold=[];
 const load=Promise.all(bodies.map((_,i)=>new Promise(resolve=>{const img=new Image();img.onload=()=>{images[i]=img;gold[i]=golden(img);Promise.race([img.decode?img.decode():Promise.resolve(),new Promise(r=>setTimeout(r,1500))]).catch(()=>{}).then(()=>resolve(true))};img.onerror=()=>resolve(false);img.src=`assets/cats/${String(i).padStart(2,'0')}.webp?v=8`}))).then(r=>ready=r.every(Boolean));
 // Golden cat: the sprite recoloured gold (luminance kept), clipped to its own outline, with a light sheen.
 function golden(img){
  const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');
  g.drawImage(img,0,0);g.globalCompositeOperation='color';g.fillStyle='#f2b81f';g.fillRect(0,0,c.width,c.height);
  g.globalCompositeOperation='soft-light';const sheen=g.createLinearGradient(0,0,c.width,c.height);sheen.addColorStop(0,'#fff6c8');sheen.addColorStop(.5,'#ffd34a');sheen.addColorStop(1,'#b97a12');g.fillStyle=sheen;g.fillRect(0,0,c.width,c.height);
  g.globalCompositeOperation='destination-in';g.drawImage(img,0,0);return c;
 }
 function draw(c,x,y,w,h,type,angle=0,squash=0,isGold=false){
  const img=isGold?gold[type]:images[type],b=bodies[type];if(!ready||!img)return false;
  const sx=w/b[2],sy=h/b[3];
  c.save();c.translate(x,y);c.rotate(angle);
  c.translate(0,h/2);c.scale(1+squash*.65,1-squash);c.translate(0,-h/2);
  c.drawImage(img,-w/2-b[0]*sx,-h/2-b[1]*sy,img.width*sx,img.height*sy);
  c.restore();return true;
 }
 // Card portrait: the whole sprite fitted into a 150×110 canvas.
 function thumb(type,isGold=false){
  const img=isGold?gold[type]:images[type],c=document.createElement('canvas');c.width=150;c.height=110;
  const s=Math.min(140/img.width,100/img.height);c.getContext('2d').drawImage(img,75-img.width*s/2,58-img.height*s/2,img.width*s,img.height*s);
  return c.toDataURL();
 }
 return {load,draw,thumb,get ready(){return ready}};
})();
