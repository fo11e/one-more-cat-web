// Sprite presentation only. Collision bodies and tray grip remain in app.js.
const ClayArt=(()=>{
  const names=['orange','cream','lilac'];
  const base=[];
  const variants=[];
  let ready=false;
  let enabled=false;
  try{enabled=localStorage.getItem('one-more-cat-skin-v2')==='clay'}catch{}
  const filters=['none','none','none','grayscale(1) brightness(.48)','saturate(.3) brightness(1.16)','hue-rotate(95deg) saturate(.65)','hue-rotate(70deg)','hue-rotate(310deg)','hue-rotate(160deg)','saturate(1.6)','brightness(1.2)','brightness(.8) sepia(.3)','hue-rotate(15deg) saturate(1.5)'];
  const mapping=[0,1,2,0,1,2,0,1,2,0,2,1,0];
  const load=Promise.all(names.map((name,index)=>new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{
      // Find alpha bounds once so transparent source margins never create floating cats.
      const scan=document.createElement('canvas');
      const ratio=Math.min(1,384/img.naturalWidth);
      scan.width=Math.ceil(img.naturalWidth*ratio);scan.height=Math.ceil(img.naturalHeight*ratio);
      const s=scan.getContext('2d',{willReadFrequently:true});s.drawImage(img,0,0,scan.width,scan.height);
      const data=s.getImageData(0,0,scan.width,scan.height).data;
      let left=scan.width,right=0,top=scan.height,bottom=0;
      for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++)if(data[(y*scan.width+x)*4+3]>48){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
      if(right<=left||bottom<=top){reject(new Error('Empty sprite '+name));return}
      const sprite=document.createElement('canvas');
      sprite.width=640;sprite.height=Math.round(640*(bottom-top+1)/(right-left+1));
      sprite.getContext('2d').drawImage(img,left/ratio,top/ratio,(right-left+1)/ratio,(bottom-top+1)/ratio,0,0,sprite.width,sprite.height);
      base[index]=sprite;resolve();
    };
    img.onerror=()=>reject(new Error('Failed sprite '+name));img.src=`assets/clay/${name}.png`;
  }))).then(()=>{
    mapping.forEach((b,i)=>{const source=base[b],c=document.createElement('canvas');c.width=source.width;c.height=source.height;const ctx=c.getContext('2d');ctx.filter=filters[i];ctx.drawImage(source,0,0);variants[i]=c;});
    ready=true;return true;
  }).catch(error=>{console.error(error);return false});
  function draw(ctx,x,y,w,h,type,angle=0,squash=0,force=false){
    if((!enabled&&!force)||!ready)return false;
    const image=variants[type];
    // Body footprint is matched to the collider, ears extend slightly above it.
    const ears=(type===1||type===4) ? .03 : .07;
    const height=h/(1-ears),width=w*1.045;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    ctx.translate(0,h/2);ctx.scale(1+squash*.65,1-squash);ctx.translate(0,-h/2);
    ctx.shadowColor='rgba(74,44,31,.24)';ctx.shadowBlur=3.5;ctx.shadowOffsetY=1.2;
    ctx.drawImage(image,-width/2,h/2-height+1,width,height);
    ctx.restore();return true;
  }
  function setEnabled(value,persistChoice=true){enabled=value;try{if(persistChoice)localStorage.setItem('one-more-cat-skin-v2',value?'clay':'flat')}catch{};document.body.classList.toggle('clay-art',value);}
  setEnabled(enabled,false);
  return{load,draw,setEnabled,get enabled(){return enabled},get ready(){return ready},thumbnail:i=>variants[i]?.toDataURL()};
})();
