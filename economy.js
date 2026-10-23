/* Deterministic economy; timestamps in milliseconds, income in whole coins. */
const Economy=(()=>{
const defaults={energyMax:20,energyCost:5,refillMinutes:10,cycleSeconds:60,offlineHours:2,incomeMultiplier:1,priceMultiplier:1};
const cats=[{rarity:'Обычный',base:4,role:'Доход',effect:'amount'},{rarity:'Обычный',base:4,role:'Скорость',effect:'speed'},{rarity:'Редкий',base:8,role:'Запас',effect:'cap'},{rarity:'Редкий',base:8,role:'Доход',effect:'amount'},{rarity:'Эпический',base:16,role:'Скорость',effect:'speed'},{rarity:'Легендарный',base:32,role:'Запас',effect:'cap'}];
cats.push(...Array.from({length:7},(_,i)=>({rarity:i<3?'Эпический':'Легендарный',base:20+i*4,role:['Доход','Скорость','Запас'][i%3],effect:['amount','speed','cap'][i%3]})));
cats.forEach((c,i)=>c.xp=[5,6,12,15,25,50,28,30,32,40,45,48,60][i]);
function playerProgress(xp){const n=Math.floor((Math.sqrt(9+.32*xp)-3)/2);return {level:n+1,current:xp-12.5*n*(n+3),needed:50+25*n};}
const milestones=[{at:5,type:2},{at:8,type:3},{at:10,type:4},{at:15,type:5},{at:18,type:6},{at:21,type:7},{at:24,type:8},{at:27,type:9},{at:30,type:10},{at:35,type:11},{at:40,type:12}];
const rooms=[{name:'Завтрак на двоих',note:'Персик греется на стуле. Батон занял стол.',types:[0,1],theme:'breakfast'},{name:'Тихий час',note:'Тучка на полке. Уголёк спит в кресле.',types:[2,3,4,5],theme:'nap'},{name:'Обсерватория',note:'Пломбир у окна. Космокот ближе к звёздам.',types:[6,7,8,9,10,11,12],theme:'stars'}];
const compressionCap=level=>[0,.15,.30,.45,.65,.85][level]||0;
const equipment=[{key:'accordion',name:'Коты-гармошки',icon:'↕',desc:'Максимальное сплющивание нижних рядов',max:5,price:50},{key:'width',name:'Поднос побольше',icon:'↔',desc:'+12 к ширине за уровень',max:3,price:60},{key:'rough',name:'Шершавый поднос',icon:'≋',desc:'Трение подноса и удержание нижнего ряда',max:5,price:45},{key:'sticky',name:'Липкие лапки',icon:'ω',desc:'Трение между котами',max:5,price:65},{key:'soft',name:'Мягкое приземление',icon:'↓',desc:'Уменьшает отскок при приземлении',max:5,price:80},{key:'patience',name:'Не спеши, кот',icon:'◷',desc:'+0,25 сек. перед следующим котом',max:5,price:100}];
function gearStats(g){return {width:184+(g.width||0)*12,trayFriction:.22+(g.rough||0)*.16,trayStatic:.8+(g.rough||0)*.64,carry:.08+(g.rough||0)*.13,catFriction:.28+(g.sticky||0)*.14,catStatic:.65+(g.sticky||0)*.47,bounce:.16*(1-(g.soft||0)*.16),delay:1.25+(g.patience||0)*.25,compression:compressionCap(g.accordion||0)}}
const bounded=(v,min,max,fallback)=>Number.isFinite(+v)?Math.max(min,Math.min(max,+v)):fallback;
function create(old={},now=Date.now()){
 const config={...defaults,...old.config};for(const [k,min,max] of [['energyMax',1,100],['energyCost',1,100],['refillMinutes',.1,120],['cycleSeconds',5,3600],['offlineHours',.05,24],['incomeMultiplier',.1,20],['priceMultiplier',.1,10]])config[k]=bounded(config[k],min,max,defaults[k]);config.energyMax=Math.round(config.energyMax);config.energyCost=Math.min(config.energyMax,Math.round(config.energyCost));
 const owned=Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.owned?.[i],0,1e9,old.collection?.includes(i)?1:0)));
 const s={...old,version:3,xp:Math.floor(bounded(old.xp,0,1e12,owned.reduce((sum,n,i)=>sum+n*cats[i].xp,0))),vitamins:Math.floor(bounded(old.vitamins,0,1e9,0)),quests:{claimed:[],repeatAt:Math.floor((old.total||0)/10)*10,...old.quests},deliveredBest:old.deliveredBest||0,coins:Math.floor(bounded(old.coins,0,1e12,0)),total:old.total||0,best:old.best||0,runs:old.runs||0,owned,levels:Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.levels?.[i],1,20,1))),spent:Array.from({length:cats.length},(_,i)=>old.spent?.[i]||0),gear:{width:old.upgrade||0,...old.gear},config,luck:Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.luck?.[i],0,10,0))),energy:bounded(old.energy,0,config.energyMax,config.energyMax),energyAt:old.energyAt||now,rooms:rooms.map((_,i)=>({...{bank:0,progress:0,at:now},...old.rooms?.[i]}))};
 if((old.version||0)<3){for(const r of s.rooms){s.coins+=r.bank||0;r.bank=0;r.progress=0;r.at=now;}}
 for(const g of equipment)s.gear[g.key]=Math.floor(bounded(s.gear[g.key],0,g.max,0));return s;
}
function stats(s,i){const r=rooms[i],active=r.types.every(t=>s.owned[t]>0);let amount=1,speed=1,cap=1;for(const t of r.types){const n=s.levels[t]-1; if(cats[t].effect==='amount')amount+=n*.25;if(cats[t].effect==='speed')speed+=n*.15;if(cats[t].effect==='cap')cap+=n*.5;}const yieldCoins=Math.max(1,Math.round(r.types.reduce((v,t)=>v+cats[t].base,0)*amount*s.config.incomeMultiplier)),cycle=s.config.cycleSeconds/speed;return {active,yieldCoins,cycle,cap:Math.max(yieldCoins,Math.floor(s.config.offlineHours*3600/cycle)*yieldCoins*cap),hourly:yieldCoins*3600/cycle};}
function tick(s,now=Date.now()){
 const dt=Math.max(0,now-s.energyAt),interval=s.config.refillMinutes*60000;
 if(s.energy>=s.config.energyMax)s.energyAt=now;else{const n=Math.floor(dt/interval);s.energy=Math.min(s.config.energyMax,s.energy+n);s.energyAt=s.energy===s.config.energyMax?now:s.energyAt+n*interval;}
 rooms.forEach((_,i)=>{const r=s.rooms[i],st=stats(s,i),seconds=Math.max(0,now-r.at)/1000;r.at=Math.max(now,r.at);if(!st.active){r.progress=0;return;}if(r.bank>=st.cap){r.progress=0;return;}const elapsed=r.progress+seconds,cycles=Math.floor(elapsed/st.cycle);r.bank=Math.min(st.cap,r.bank+cycles*st.yieldCoins);r.progress=r.bank>=st.cap?0:elapsed%st.cycle;});return s;
}
function beginRun(s,now=Date.now()){tick(s,now);if(s.energy<s.config.energyCost)return false;s.pendingEnergyCost=s.config.energyCost;return true;}
function settleRun(s,delivered,now=Date.now()){tick(s,now);const cost=s.pendingEnergyCost||0;delete s.pendingEnergyCost;if(!cost||delivered)return 0;if(s.energy>=s.config.energyMax)s.energyAt=now;const paid=Math.min(s.energy,cost);s.energy-=paid;return paid;}
function spendEnergy(s,now=Date.now()){tick(s,now);if(s.energy<s.config.energyCost)return false;if(s.energy===s.config.energyMax)s.energyAt=now;s.energy-=s.config.energyCost;return true;}
function deliver(s,types,now=Date.now()){tick(s,now);s.deliveredBest=Math.max(s.deliveredBest,types.length);for(const t of types){s.owned[t]++;s.total++;s.xp+=cats[t].xp;}s.collection=s.owned.flatMap((v,i)=>v?[i]:[]);}
function collect(s,now=Date.now()){tick(s,now);let n=0;for(const r of s.rooms){n+=r.bank;r.bank=0;}s.coins+=n;return n;}
function catCost(s,t){return {vitamins:(s.levels[t]+1)%5===0?(s.levels[t]+1)*4:0,copies:s.levels[t]*2,coins:Math.round(25*s.levels[t]**1.65*s.config.priceMultiplier)};}
function upgradeCat(s,t,now=Date.now()){tick(s,now);const c=catCost(s,t);if(!s.owned[t]||s.levels[t]>=20||s.owned[t]-1-s.spent[t]<c.copies||s.coins<c.coins||s.vitamins<c.vitamins)return false;s.spent[t]+=c.copies;s.coins-=c.coins;s.vitamins-=c.vitamins;s.levels[t]++;return true;}
function gearCost(s,g){return Math.round(g.price*(1+s.gear[g.key]*.8)*s.config.priceMultiplier);}
function buyGear(s,key){const g=equipment.find(g=>g.key===key);if(!g)return false;const cost=gearCost(s,g);if(s.gear[key]>=g.max||s.coins<cost)return false;s.gear[key]++;s.coins-=cost;s.upgrade=s.gear.width;return true;}
// A forty-cat expedition, with guaranteed encounters and unlocked random drops.
function nextMilestone(score){const cycle=Math.floor(score/40)*40;return milestones.map(m=>({...m,at:m.at+cycle})).find(m=>m.at>score)||{...milestones[0],at:cycle+40+milestones[0].at};}
function probabilities(s){const rare=[0,0,8,6,4,2,1.5,1.2,1,.8,.6,.5,.4].map((n,i)=>s.owned[i]?n+s.luck[i]*(i===5?.5:i>=6?.25:1):0);const rest=100-rare.slice(2).reduce((a,b)=>a+b,0);const ratio=(1+s.luck[0]*.1)/(2+(s.luck[0]+s.luck[1])*.1);return [rest*ratio,rest*(1-ratio),...rare.slice(2)];}
function pick(s,position,random=Math.random){
 if(position===1&&!s.owned[0])return 0;if(position===2&&!s.owned[1])return 1;
 const guaranteed=milestones.find(m=>m.at===(position-1)%40+1);if(guaranteed)return guaranteed.type;
 const weights=probabilities(s);let n=random()*100;for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return 1;
}
function luckCost(s,t){return Math.round((75+t*25)*(s.luck[t]+1)*s.config.priceMultiplier);}
function upgradeLuck(s,t){const price=luckCost(s,t);if(!s.owned[t]||s.luck[t]>=10||s.coins<price)return false;s.coins-=price;s.luck[t]++;return true;}

function questList(s){return [
 {id:'welcome',name:'Первый спасённый',desc:'Доставь первого кота',value:s.total,target:1,reward:5},
 {id:'breakfast',name:'Завтрак готов',desc:'Засели первую комнату',value:rooms[0].types.filter(t=>s.owned[t]).length,target:2,reward:10},
 {id:'variety',name:'Пёстрая компания',desc:'Собери 4 разных котов',value:s.owned.filter(n=>n>0).length,target:4,reward:10},
 {id:'five',name:'Пять за раз',desc:'Доставь 5 котов одним рейсом',value:s.deliveredBest,target:5,reward:10},
 {id:'fifteen',name:'Спасатель-профи',desc:'Доставь 15 котов одним рейсом',value:s.deliveredBest,target:15,reward:25},
 {id:'nap',name:'Тихий час',desc:'Засели вторую комнату',value:rooms[1].types.filter(t=>s.owned[t]).length,target:4,reward:25},
 {id:'growth',name:'Первое повышение',desc:'Прокачай любого кота до уровня 2',value:Math.max(...s.levels),target:2,reward:5},
 {id:'rescue',name:'Дежурство в приюте',desc:'Доставь ещё 10 котов · повторяемый',value:Math.max(0,s.total-s.quests.repeatAt),target:10,reward:10,repeat:true}
 ].map(q=>({...q,claimed:!q.repeat&&s.quests.claimed.includes(q.id)}));}
function claimQuest(s,id){const q=questList(s).find(q=>q.id===id);if(!q||q.claimed||q.value<q.target)return 0;if(q.repeat)s.quests.repeatAt+=q.target;else s.quests.claimed.push(q.id);s.vitamins+=q.reward;return q.reward;}
return {beginRun,settleRun,gearStats,playerProgress,questList,claimQuest,compressionCap,milestones,nextMilestone,probabilities,pick,luckCost,upgradeLuck,defaults,cats,rooms,equipment,create,stats,tick,spendEnergy,deliver,collect,catCost,upgradeCat,gearCost,buyGear};
})();
if(typeof module!=='undefined')module.exports=Economy;
