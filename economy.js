/* Deterministic economy; timestamps in milliseconds, income in whole coins. */
const Economy=(()=>{
// energyRunCost is paid at the start of every run, energyCost on top of it when the run ends in a fall.
const base={energyMax:20,energyCost:4,energyRunCost:1,refillMinutes:10,cycleSeconds:300,offlineHours:3,incomeMultiplier:1,priceMultiplier:1};
// The app hands in Remote Config values (snake_case keys); the web build has none and keeps the base numbers.
const remote=(typeof window!=='undefined'&&window.OMC?.remote)||{};
const remoteNumber=(key,fallback)=>Number.isFinite(+remote[key])&&remote[key]!==null?+remote[key]:fallback;
const defaults=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,remoteNumber(k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),v)]));
// Remote Config `economy_config` (JSON): a shorter array keeps the built-in tail (furniture_base from before the 4th room). Room yields, cat level bonuses, cat prices, XP curve, repeat quest, milestone heights. See ANALYTICS.md.
// Task rewards (daily_*, weekly_*) may also come in `quests_config`.
const econRemote=(()=>{const parse=v=>{try{return (typeof v==='string'?JSON.parse(v):v)||{}}catch{return {}}};return {...parse(remote.economy_config),...parse(remote.quests_config)}})();
const econ={roomYield:[6,15,30],amountStep:.06,speedStep:.03,capStep:.15,catPriceBase:60,catPriceExp:2.2,xpScale:6,repeatVitamins:2,repeatTarget:20,milestones:[5,8,10,15,18,21,24,27,30,35,40],
 boosterPrice:[40,50,60],boosterUnlock:[2,3,4],boosterGrowth:.3,
 dailyCoinsBase:40,dailyCoinsPerLevel:25,dailyIncomeHours:.5,dailyVitamins:2,dailyChestVitamins:6,weeklyVitamins:5,weeklyCopies:3,weeklyChestVitamins:15,weeklyChestCopies:6,
 furnitureBase:[100,500,2000,4000],furnitureGrowth:1.7,furnitureMax:15,
 goldUnlock:3,goldBase:.0001,goldPerCat:.00002,goldMax:.003,goldPity:2500,goldCharmAt:6,goldRoomBonus:.1,goldDupVitamins:10,goldDupCopies:3,goldStars:5,
 galleryRank:8,galleryYield:6,rankScale:3,rankExp:1.6,rankVitamins:4,rankCopies:4};
for(const [k,r] of Object.entries({roomYield:'room_yield',amountStep:'cat_amount_step',speedStep:'cat_speed_step',capStep:'cat_cap_step',catPriceBase:'cat_price_base',catPriceExp:'cat_price_exp',xpScale:'xp_scale',repeatVitamins:'repeat_quest_vitamins',repeatTarget:'repeat_quest_target',milestones:'milestones',boosterPrice:'booster_price',boosterUnlock:'booster_unlock',boosterGrowth:'booster_growth',dailyCoinsBase:'daily_coins_base',dailyCoinsPerLevel:'daily_coins_per_level',dailyIncomeHours:'daily_income_hours',dailyVitamins:'daily_vitamins',dailyChestVitamins:'daily_chest_vitamins',weeklyVitamins:'weekly_vitamins',weeklyCopies:'weekly_copies',weeklyChestVitamins:'weekly_chest_vitamins',weeklyChestCopies:'weekly_chest_copies',furnitureBase:'furniture_base',furnitureGrowth:'furniture_growth',furnitureMax:'furniture_max',goldUnlock:'gold_unlock',goldBase:'gold_base',goldPerCat:'gold_per_cat',goldMax:'gold_max',goldPity:'gold_pity',goldCharmAt:'gold_charm_at',goldRoomBonus:'gold_room_bonus',goldDupVitamins:'gold_dup_vitamins',goldDupCopies:'gold_dup_copies',goldStars:'gold_stars',galleryRank:'gallery_rank',galleryYield:'gallery_yield',rankScale:'rank_scale',rankExp:'rank_exp',rankVitamins:'rank_vitamins',rankCopies:'rank_copies'})){const v=econRemote[r];if(Array.isArray(econ[k])){if(Array.isArray(v)&&v.length&&v.length<=econ[k].length&&v.every(x=>Number.isFinite(+x)&&+x>0))econ[k]=econ[k].map((d,i)=>i<v.length?+v[i]:d)}else if(v!==undefined&&v!==null&&Number.isFinite(+v)&&+v>0)econ[k]=+v}
const rewards={deliverPerCat:remoteNumber('deliver_coins_per_cat',10),failPerCat:remoteNumber('fail_coins_per_cat',2)};
const cats=[{rarity:'Обычный',base:4,role:'Доход',effect:'amount'},{rarity:'Обычный',base:4,role:'Скорость',effect:'speed'},{rarity:'Редкий',base:8,role:'Запас',effect:'cap'},{rarity:'Редкий',base:8,role:'Доход',effect:'amount'},{rarity:'Эпический',base:16,role:'Скорость',effect:'speed'},{rarity:'Легендарный',base:32,role:'Запас',effect:'cap'}];
cats.push(...Array.from({length:7},(_,i)=>({rarity:i<3?'Эпический':'Легендарный',base:20+i*4,role:['Доход','Скорость','Запас'][i%3],effect:['amount','speed','cap'][i%3]})));
cats.forEach((c,i)=>c.xp=[5,6,12,15,25,50,28,30,32,40,45,48,60][i]);
function playerProgress(xp){const k=econ.xpScale,n=Math.floor((Math.sqrt(9+.32*xp/k)-3)/2);return {level:n+1,current:Math.round(xp-12.5*k*n*(n+3)),needed:Math.round((50+25*n)*k)};}
const milestones=econ.milestones.map((at,i)=>({at:Math.max(3,Math.min(40,Math.round(at))),type:i+2}));
const rooms=[{name:'Завтрак на двоих',note:'Персик греется на стуле. Батон занял стол.',types:[0,1],theme:'breakfast'},{name:'Тихий час',note:'Тучка на полке. Уголёк спит в кресле.',types:[2,3,4,5],theme:'nap'},{name:'Обсерватория',note:'Пломбир у окна. Космокот ближе к звёздам.',types:[6,7,8,9,10,11,12],theme:'stars'},
 // The fourth room has no fixed residents: it opens at a shelter rank and every golden cat in the album earns there.
 {name:'Золотая гостиная',note:'Золотые коты греются у камина.',types:[],theme:'gold',gallery:true}];
const bounded=(v,min,max,fallback)=>v!==null&&v!==''&&Number.isFinite(+v)?Math.max(min,Math.min(max,+v)):fallback;
const compressionCap=level=>[0,.15,.30,.45,.65,.85][level]||0;
// Skills (the "gear" save key). Remote Config `skills_config` (JSON) overrides any number per skill and the price growth:
// {"price_growth":1.5,"lives":{"price":120,"unlock":4},"slowmo":{"enabled":0}}. step is the effect per level.
const skillRoles={rescue:'Спасение',control:'Контроль',income:'Доход'};
const skillBase=[
 {key:'lives',role:'rescue',name:'Девятая жизнь',icon:'♥',desc:'Сетка ловит упавшего кота, и рейс продолжается. Сам кот теряется.',max:5,price:150,unlock:4,step:.5,mastery:5},
 {key:'insurance',role:'rescue',name:'Страховка',icon:'☂',desc:'Больше монет за котов при падении, а «Спасти» забирает больше нижних котов.',max:5,price:80,unlock:6,step:.8,share:.05,mastery:5},
 {key:'width',role:'control',name:'Поднос побольше',icon:'↔',desc:'Шире поднос — больше места под котов.',max:5,price:60,unlock:1,step:12,mastery:5},
 {key:'rough',role:'control',name:'Цепкие лапки',icon:'ω',desc:'Коты меньше скользят по подносу и друг по другу.',max:5,price:55,unlock:1,step:1,mastery:5},
 {key:'soft',role:'control',name:'Мягкое приземление',icon:'↓',desc:'Коты меньше отскакивают, когда приземляются.',max:5,price:80,unlock:1,step:.16,mastery:5},
 {key:'accordion',role:'control',name:'Коты-гармошки',icon:'↕',desc:'Нижние коты сплющиваются: башня ниже и устойчивее.',max:5,price:50,unlock:1,mastery:0},
 {key:'steady',role:'control',name:'Ровный поднос',icon:'⚖',desc:'Поднос меньше кренится под кривой башней.',max:5,price:90,unlock:5,step:.12,mastery:5},
 {key:'patience',role:'control',name:'Не спеши, кот',icon:'◷',desc:'Больше времени до следующего кота.',max:5,price:100,unlock:1,step:.25,mastery:5},
 {key:'slowmo',role:'control',name:'Кошачья грация',icon:'❄',desc:'Кнопка в рейсе: время замедляется на несколько секунд.',max:3,price:200,unlock:8,step:1,duration:3,scale:.5,mastery:2},
 {key:'tips',role:'income',name:'Чаевые',icon:'✦',desc:'Больше монет за каждого доставленного кота. На максимуме ещё и витаминки.',max:5,price:70,unlock:2,step:.1,vitaminEvery:20,mastery:5}
];
// Mastery: levels past `max` open at the player levels in mastery_unlock, cost price_growth up to max and mastery_growth after it,
// and each gives mastery_effect of a normal level, so the physics stays sane. `mastery` is how many such levels a skill has.
const skillRemote=(()=>{try{const v=remote.skills_config;return (typeof v==='string'?JSON.parse(v):v)||{}}catch{return {}}})();
const priceGrowth=bounded(skillRemote.price_growth,1,5,2.4),masteryGrowth=bounded(skillRemote.mastery_growth,1,5,1.5),masteryEffect=bounded(skillRemote.mastery_effect,0,1,.5);
const masteryUnlock=Array.isArray(skillRemote.mastery_unlock)&&skillRemote.mastery_unlock.every(v=>Number.isFinite(+v))?skillRemote.mastery_unlock.map(Number):[10,15,20,25,30];
const equipment=skillBase.map(b=>{const o=skillRemote[b.key]||{},r={...b};for(const k in o)if(typeof b[k]==='number'&&Number.isFinite(+o[k])&&+o[k]>=0)r[k]=+o[k];r.max=Math.max(1,Math.min(20,Math.round(r.max)));r.mastery=Math.max(0,Math.min(masteryUnlock.length,Math.round(r.mastery||0)));r.total=r.max+r.mastery;r.disabled=o.enabled===0||o.enabled===false;return r}).filter(g=>!g.disabled);
const skill=Object.fromEntries(equipment.map(g=>[g.key,g]));
// Effective level: full steps up to max, mastery levels count as masteryEffect each.
function skillLevel(g,k){const d=skill[k];if(!d)return 0;const n=Math.min(d.total,g[k]||0);return Math.min(n,d.max)+Math.max(0,n-d.max)*masteryEffect}
function gearStats(g){
 const L=k=>skillLevel(g,k),S=k=>skill[k]?.step||0,grip=L('rough')*S('rough');
 return {width:184+L('width')*S('width'),trayFriction:.22+grip*.16,trayStatic:.8+grip*.64,carry:Math.min(.9,.08+grip*.13),catFriction:.28+grip*.14,catStatic:.65+grip*.47,bounce:.16*Math.max(0,1-L('soft')*S('soft')),delay:1.25+L('patience')*S('patience'),compression:compressionCap(L('accordion')),
  tilt:Math.max(0,1-L('steady')*S('steady')),lives:L('lives')?Math.floor((L('lives')+1)*S('lives')):0,failBonus:L('insurance')*S('insurance'),rescueShare:Math.min(1,.5+L('insurance')*(skill.insurance?.share||0)),
  slowmo:Math.round(L('slowmo')*S('slowmo')),slowmoSeconds:skill.slowmo?.duration||3,slowmoScale:skill.slowmo?.scale||.5,tips:L('tips')*S('tips'),tipVitaminEvery:skill.tips&&(g.tips||0)>=skill.tips.max?skill.tips.vitaminEvery:0}
}
// Coins for a run: delivered cats get tips, a fall pays the insurance.
function runReward(g,n,delivered,s=null){const st=gearStats(g);return Math.round(n*(delivered?rewards.deliverPerCat*(1+st.tips)*(1+(s?bonus(s,'runCoins'):0)):rewards.failPerCat+st.failBonus))}
function tipVitamins(g,n){const every=gearStats(g).tipVitaminEvery;return every?Math.floor(n/every):0}
function skillUnlocked(s,key){const g=skill[key];return !!g&&(s.gear[key]>0||playerProgress(s.xp).level>=g.unlock)}
// Player level the next level of a skill needs (base unlock, then the mastery steps).
function skillNextUnlock(s,key){const g=skill[key],lv=s.gear[key]||0;return lv<g.max?g.unlock:masteryUnlock[lv-g.max]??Infinity}
function create(old={},now=Date.now()){
 // Only balance chosen in the dev form is kept per player; everything else follows the current defaults.
 // Saves before v4 stored the whole config: keep just the values that differ from the old built-in numbers.
 const legacy={energyMax:20,energyCost:5,refillMinutes:10,cycleSeconds:60,offlineHours:2,incomeMultiplier:1,priceMultiplier:1};
 const configOverride=(old.version||0)>=4?{...old.configOverride}:Object.fromEntries(Object.entries(old.config||{}).filter(([k,v])=>k in legacy&&+v!==legacy[k]));
 const config={...defaults,...configOverride};for(const [k,min,max] of [['energyMax',1,100],['energyCost',0,100],['energyRunCost',0,100],['refillMinutes',.1,120],['cycleSeconds',5,3600],['offlineHours',.05,24],['incomeMultiplier',.1,20],['priceMultiplier',.1,10]])config[k]=bounded(config[k],min,max,defaults[k]);config.energyMax=Math.round(config.energyMax);config.energyRunCost=Math.round(config.energyRunCost);config.energyCost=Math.round(config.energyCost);if(runEnergy(config)>config.energyMax){config.energyRunCost=Math.min(config.energyRunCost,config.energyMax);config.energyCost=config.energyMax-config.energyRunCost}
 const owned=Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.owned?.[i],0,1e9,old.collection?.includes(i)?1:0)));
 const s={...old,version:5,configOverride,xp:Math.floor(bounded(old.xp,0,1e12,owned.reduce((sum,n,i)=>sum+n*cats[i].xp,0))),vitamins:Math.floor(bounded(old.vitamins,0,1e9,0)),quests:{claimed:[],repeatAt:Math.floor((old.total||0)/10)*10,...old.quests},deliveredBest:old.deliveredBest||0,coins:Math.floor(bounded(old.coins,0,1e12,0)),total:old.total||0,best:old.best||0,runs:old.runs||0,owned,levels:Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.levels?.[i],1,20,1))),spent:Array.from({length:cats.length},(_,i)=>old.spent?.[i]||0),gear:{width:old.upgrade||0,...old.gear},config,luck:Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.luck?.[i],0,10,0))),energy:bounded(old.energy,0,1000,config.energyMax),energyAt:old.energyAt||now,rooms:rooms.map((_,i)=>({...{bank:0,progress:0,at:now},...old.rooms?.[i]}))};
 if((old.version||0)<3){for(const r of s.rooms){s.coins+=r.bank||0;r.bank=0;r.progress=0;r.at=now;}}
 // v5 merged "Шершавый поднос" and "Липкие лапки" into "Цепкие лапки": keep the higher level, refund the coins spent on the lower one.
 if((old.version||0)<5&&s.gear.sticky!==undefined){const rough=Math.floor(bounded(s.gear.rough,0,5,0)),sticky=Math.floor(bounded(s.gear.sticky,0,5,0)),low=Math.min(rough,sticky),price=rough>=sticky?65:45;for(let k=0;k<low;k++)s.coins+=Math.round(price*(1+k*.8));s.gear={...s.gear,rough:Math.max(rough,sticky)};delete s.gear.sticky;}
 for(const g of equipment)s.gear[g.key]=Math.floor(bounded(s.gear[g.key],0,g.total,0));
 s.boost=Object.fromEntries(boosters.map(b=>[b.key,old.boost?.[b.key]?1:0]));
 s.furniture=rooms.map((_,i)=>furniture[i].map((_,j)=>Math.floor(bounded(old.furniture?.[i]?.[j],0,econ.furnitureMax,0))));
 s.vitaminCarry=bounded(old.vitaminCarry,0,1,0);
 s.golden=Array.from({length:cats.length},(_,i)=>Math.floor(bounded(old.golden?.[i],0,1e6,0)));
 s.goldPity=Math.floor(bounded(old.goldPity,0,1e6,0));s.goldCharm=Math.floor(bounded(old.goldCharm,0,100,0));s.rankClaimed=Math.floor(bounded(old.rankClaimed,1,1e4,1));
 s.energy=Math.min(s.energy,energyMax(s));
 refreshTasks(s,now);return s;
}
// A golden cat in the album adds goldRoomBonus to its own room's income; the gallery earns galleryYield per golden cat.
function stats(s,i){const r=rooms[i];let active,base,amount=1,speed=1,cap=1;
 if(r.gallery){const n=goldenCount(s);active=galleryOpen(s)&&n>0;base=econ.galleryYield*Math.max(1,n)}
 else{active=r.types.every(t=>s.owned[t]>0);base=econ.roomYield[i];for(const t of r.types){const n=s.levels[t]-1; if(cats[t].effect==='amount')amount+=n*econ.amountStep;if(cats[t].effect==='speed')speed+=n*econ.speedStep;if(cats[t].effect==='cap')cap+=n*econ.capStep;}amount*=1+econ.goldRoomBonus*r.types.filter(t=>s.golden?.[t]>0).length}
 amount*=1+bonus(s,'income',i)+bonus(s,'allIncome');cap*=1+bonus(s,'cap',i);const yieldCoins=Math.max(1,Math.round(base*amount*s.config.incomeMultiplier)),cycle=s.config.cycleSeconds/speed;return {active,yieldCoins,cycle,cap:Math.max(yieldCoins,Math.floor(s.config.offlineHours*3600/cycle)*yieldCoins*cap),hourly:yieldCoins*3600/cycle};}
function tick(s,now=Date.now()){
 const dt=Math.max(0,now-s.energyAt),interval=refillMinutes(s)*60000;
 if(s.energy>=energyMax(s))s.energyAt=now;else{const n=Math.floor(dt/interval);s.energy=Math.min(energyMax(s),s.energy+n);s.energyAt=s.energy===energyMax(s)?now:s.energyAt+n*interval;}
 rooms.forEach((_,i)=>{const r=s.rooms[i],st=stats(s,i),seconds=Math.max(0,now-r.at)/1000;r.at=Math.max(now,r.at);if(!st.active){r.progress=0;return;}if(r.bank>=st.cap){r.progress=0;return;}const elapsed=r.progress+seconds,cycles=Math.floor(elapsed/st.cycle);r.bank=Math.min(st.cap,r.bank+cycles*st.yieldCoins);r.progress=r.bank>=st.cap?0:elapsed%st.cycle;});return s;
}
// Energy a run needs before it starts: its own cost plus the fall cost.
function runEnergy(config){return config.energyRunCost+config.energyCost}
function beginRun(s,now=Date.now()){tick(s,now);if(s.energy<runEnergy(s.config))return false;if(s.energy>=energyMax(s))s.energyAt=now;s.energy-=s.config.energyRunCost;s.pendingRunPaid=s.config.energyRunCost;s.pendingEnergyCost=s.config.energyCost;return true;}
// Returns all the energy this run took: the start cost plus, after a fall, the fall cost.
function settleRun(s,delivered,now=Date.now()){tick(s,now);const cost=s.pendingEnergyCost||0,start=s.pendingRunPaid||0;delete s.pendingEnergyCost;delete s.pendingRunPaid;if(!cost||delivered)return start;if(s.energy>=energyMax(s))s.energyAt=now;const paid=Math.min(s.energy,cost);s.energy-=paid;return start+paid;}
function spendEnergy(s,now=Date.now()){tick(s,now);const need=runEnergy(s.config);if(s.energy<need)return false;if(s.energy===energyMax(s))s.energyAt=now;s.energy-=need;return true;}
// Returns the vitamins the Аптечка found among the delivered cats.
function deliver(s,types,now=Date.now(),run=false){tick(s,now);s.deliveredBest=Math.max(s.deliveredBest,types.length);const xpMul=1+bonus(s,'xp');for(const t of types){s.owned[t]++;s.total++;s.xp+=Math.round(cats[t].xp*xpMul);}s.collection=s.owned.flatMap((v,i)=>v?[i]:[]);
 track(s,'cats',types.length,now);const rare=types.filter(t=>t>=2).length;if(rare)track(s,'rare',rare,now);if(run){track(s,'deliveries',1,now);track(s,'tower',types.length,now,true)}
 const found=s.vitaminCarry+types.length*bonus(s,'vitamins'),n=Math.floor(found);s.vitaminCarry=found-n;s.vitamins+=n;return n;}
function collect(s,now=Date.now()){tick(s,now);let n=0;for(const r of s.rooms){n+=r.bank;r.bank=0;}s.coins+=n;if(n>0)track(s,'collect',1,now);return n;}
function catCost(s,t){return {vitamins:(s.levels[t]+1)%5===0?(s.levels[t]+1)*4:0,copies:s.levels[t]*2,coins:Math.round(econ.catPriceBase*s.levels[t]**econ.catPriceExp*s.config.priceMultiplier)};}
function upgradeCat(s,t,now=Date.now()){tick(s,now);const c=catCost(s,t);if(!s.owned[t]||s.levels[t]>=20||s.owned[t]-1-s.spent[t]<c.copies||s.coins<c.coins||s.vitamins<c.vitamins)return false;s.spent[t]+=c.copies;s.coins-=c.coins;s.vitamins-=c.vitamins;s.levels[t]++;track(s,'upgrades');track(s,'catup');return true;}
function gearCost(s,g){const lv=s.gear[g.key];return Math.round(g.price*(lv<g.max?priceGrowth**lv:priceGrowth**(g.max-1)*masteryGrowth**(lv-g.max+1))*s.config.priceMultiplier);}
function buyGear(s,key){const g=equipment.find(g=>g.key===key);if(!g)return false;const cost=gearCost(s,g);if(s.gear[key]>=g.total||s.coins<cost||!skillUnlocked(s,key)||playerProgress(s.xp).level<skillNextUnlock(s,key))return false;s.gear[key]++;s.coins-=cost;s.upgrade=s.gear.width;track(s,'upgrades');return true;}
// A forty-cat expedition, with guaranteed encounters and unlocked random drops.
function nextMilestone(score){const cycle=Math.floor(score/40)*40;return milestones.map(m=>({...m,at:m.at+cycle})).find(m=>m.at>score)||{...milestones[0],at:cycle+40+milestones[0].at};}
function probabilities(s){const rare=[0,0,8,6,4,2,1.5,1.2,1,.8,.6,.5,.4].map((n,i)=>s.owned[i]?n+s.luck[i]*(i===5?.5:i>=6?.25:1):0);const rest=100-rare.slice(2).reduce((a,b)=>a+b,0);const ratio=(1+s.luck[0]*.1)/(2+(s.luck[0]+s.luck[1])*.1);return [rest*ratio,rest*(1-ratio),...rare.slice(2)];}
function pick(s,position,random=Math.random){
 if(position===1&&!s.owned[0])return 0;if(position===2&&!s.owned[1])return 1;
 const guaranteed=milestones.find(m=>m.at===(position-1)%40+1);if(guaranteed)return guaranteed.type;
 const weights=probabilities(s);let n=random()*100;for(let i=0;i<weights.length;i++){n-=weights[i];if(n<0)return i;}return 1;
}
function luckCost(s,t){return Math.round((75+t*25)*(s.luck[t]+1)*s.config.priceMultiplier);}
function upgradeLuck(s,t){const price=luckCost(s,t);if(!s.owned[t]||s.luck[t]>=10||s.coins<price)return false;s.coins-=price;s.luck[t]++;track(s,'upgrades');return true;}

// Boosters: bought in the lobby, used up by the next normal run. Price grows with the player level.
const boosters=[
 {key:'net',icon:'♥',name:'Коврик',desc:'+1 сетка в следующем рейсе'},
 {key:'mint',icon:'❄',name:'Мята',desc:'+1 замедление в следующем рейсе'},
 {key:'gold',icon:'✦',name:'Щедрый рейс',desc:'×2 монеты за следующую доставку'}].map((b,i)=>({...b,price:econ.boosterPrice[i]??50,unlock:econ.boosterUnlock[i]??1}));
function boosterCost(s,b){return Math.round(b.price*(1+econ.boosterGrowth*(playerProgress(s.xp).level-1))*s.config.priceMultiplier)}
function boosterOpen(s,b){return playerProgress(s.xp).level>=b.unlock}
function buyBooster(s,key){const b=boosters.find(b=>b.key===key);if(!b||s.boost[key]||!boosterOpen(s,b))return false;const cost=boosterCost(s,b);if(s.coins<cost)return false;s.coins-=cost;s.boost[key]=1;return cost}
// Hands the armed boosters to a run and clears them.
function useBoosters(s,now=Date.now()){const used={...s.boost},n=Object.values(used).filter(Boolean).length;for(const k in s.boost)s.boost[k]=0;if(n)track(s,'boosters',n,now);return used}

// Уют: four pieces of furniture per room, each up to furnitureMax levels. Open once the room is complete.
// income/cap: that room; allIncome: every room; runCoins: coins per delivered cat; xp: XP per cat; energy: +max energy;
// refill: shorter refill time; vitamins: chance per delivered cat to find a vitamin; gold: higher golden cat chance.
const furniture=[
 [{key:'bowl',icon:'◒',name:'Миска',effect:'income',step:.08},{key:'bed',icon:'▭',name:'Лежанка',effect:'energy',step:1},{key:'rug',icon:'▦',name:'Коврик у двери',effect:'cap',step:.15},{key:'shelf',icon:'☰',name:'Полка с угощением',effect:'runCoins',step:.04}],
 [{key:'plaid',icon:'≋',name:'Плед',effect:'income',step:.08},{key:'clock',icon:'◷',name:'Часы с кукушкой',effect:'refill',step:.04},{key:'chair',icon:'⌂',name:'Кресло',effect:'cap',step:.15},{key:'post',icon:'⫴',name:'Когтеточка',effect:'xp',step:.05}],
 [{key:'scope',icon:'✧',name:'Телескоп',effect:'income',step:.08},{key:'kit',icon:'✚',name:'Аптечка',effect:'vitamins',step:.01},{key:'hammock',icon:'◡',name:'Гамак',effect:'cap',step:.15},{key:'map',icon:'✦',name:'Звёздная карта',effect:'allIncome',step:.03}],
 [{key:'frame',icon:'▣',name:'Золотая рама',effect:'income',step:.08},{key:'lamp',icon:'✺',name:'Люстра',effect:'gold',step:.06},{key:'fireplace',icon:'♨',name:'Камин',effect:'cap',step:.15},{key:'piano',icon:'♫',name:'Рояль',effect:'allIncome',step:.03}]];
const furnitureRemote=econRemote.furniture||{};
for(const room of furniture)for(const f of room){const o=furnitureRemote[f.key];if(o&&Number.isFinite(+o.step)&&+o.step>=0)f.step=+o.step}
function bonus(s,effect,room=null){let v=0;if(!s.furniture)return 0;furniture.forEach((items,i)=>{if(room!==null&&i!==room)return;items.forEach((f,j)=>{if(f.effect===effect)v+=(s.furniture[i]?.[j]||0)*f.step})});return v}
function energyMax(s){return Math.round(s.config.energyMax+bonus(s,'energy'))}
function refillMinutes(s){return s.config.refillMinutes*Math.max(.3,1-bonus(s,'refill'))}
function furnitureCost(s,i,j){return Math.round(econ.furnitureBase[i]*(1+j*.25)*econ.furnitureGrowth**(s.furniture[i][j]||0)*s.config.priceMultiplier)}
function furnitureOpen(s,i){return rooms[i].gallery?galleryOpen(s):rooms[i].types.every(t=>s.owned[t]>0)}
function buyFurniture(s,i,j,now=Date.now()){tick(s,now);if(!furniture[i]?.[j]||!furnitureOpen(s,i)||s.furniture[i][j]>=econ.furnitureMax)return false;const cost=furnitureCost(s,i,j);if(s.coins<cost)return false;s.coins-=cost;s.furniture[i][j]++;track(s,'upgrades');track(s,'cozy');return cost}

// Daily and weekly tasks. Everyone gets the same picks for a day/week; targets and rewards follow the player level.
// kind sorts tasks into slots (run: the tower itself, play: skills and boosters in a run, home: the shelter, meta: long goals),
// so a day always mixes playing and caring for the shelter. need hides a task until the player can do it;
// max marks a best-of stat (one run), which a task replacement never lands on.
// Remote Config `quests_config` (JSON): slots, disabled ids, target multipliers, replacements, chest extras. See ANALYTICS.md.
const questRemote=(()=>{try{const v=remote.quests_config;return (typeof v==='string'?JSON.parse(v):v)||{}}catch{return {}}})();
const level=s=>playerProgress(s.xp||0).level;
const canNet=s=>(s.gear.lives||0)>0||level(s)>=(boosters[0]?.unlock??99);
const canMint=s=>(s.gear.slowmo||0)>0||level(s)>=(boosters[1]?.unlock??99);
const hasRare=s=>s.owned.some((n,i)=>i>=2&&n>0);
const dailyPool=[
 {id:'cats',kind:'run',stat:'cats',name:'Спасатель дня',desc:n=>`Доставь ${n} котов`,target:L=>Math.min(120,Math.round((20+4*L)/5)*5)},
 {id:'deliveries',kind:'run',stat:'deliveries',name:'Без потерь',desc:n=>`Заверши ${n} ${plural(n,'доставку','доставки','доставок')}`,target:L=>Math.min(8,3+Math.floor(L/5))},
 {id:'tower',kind:'run',stat:'tower',max:true,name:'Высотка',desc:n=>`Доставь башню из ${n} котов`,target:L=>Math.min(30,6+L)},
 {id:'rare',kind:'run',stat:'rare',name:'Редкие гости',desc:n=>`Доставь ${n} ${plural(n,'редкого','редких','редких')} или лучше котов`,target:L=>Math.min(40,4+Math.floor(L*1.5)),need:hasRare},
 {id:'boosters',kind:'play',stat:'boosters',name:'Подготовка',desc:()=>'Возьми расходник в рейс',target:()=>1,minLevel:2},
 {id:'nets',kind:'play',stat:'nets',name:'Сетка в деле',desc:n=>`Сетка должна поймать ${n} ${plural(n,'кота','котов','котов')}`,target:L=>L<10?1:2,need:canNet},
 {id:'slowmo',kind:'play',stat:'slowmo',name:'Кошачья грация',desc:n=>`Включи замедление ${n} ${plural(n,'раз','раза','раз')}`,target:L=>L<12?2:3,need:canMint},
 {id:'clean',kind:'play',stat:'clean',max:true,name:'Чистая работа',desc:n=>`Доставь ${n} котов за рейс без сетки и замедления`,target:L=>Math.min(25,4+Math.floor(L*.8)),minLevel:5},
 {id:'collect',kind:'home',stat:'collect',name:'Хозяйство',desc:n=>`Забери копилку ${n} раза`,target:()=>2},
 {id:'upgrades',kind:'home',stat:'upgrades',name:'Обновка',desc:n=>`Сделай ${n} ${plural(n,'улучшение','улучшения','улучшений')}`,target:L=>Math.min(4,2+Math.floor(L/10))},
 {id:'catup',kind:'home',stat:'catup',name:'Тренер',desc:()=>'Повысь уровень любого кота',target:()=>1,minLevel:3},
 {id:'cozy',kind:'home',stat:'cozy',name:'Уютный уголок',desc:()=>'Купи или улучши мебель в любой комнате',target:()=>1,need:s=>furnitureOpen(s,0)}];
const weeklyPool=[
 {id:'w_cats',kind:'run',stat:'cats',name:'Неделя спасений',desc:n=>`Доставь ${n} котов`,target:L=>Math.min(800,Math.round((150+20*L)/10)*10)},
 {id:'w_deliveries',kind:'run',stat:'deliveries',name:'Надёжный курьер',desc:n=>`Заверши ${n} доставок`,target:L=>Math.min(60,20+L)},
 {id:'w_tower',kind:'run',stat:'tower',max:true,name:'Небоскрёб',desc:n=>`Доставь башню из ${n} котов`,target:L=>Math.min(40,12+L)},
 {id:'w_rare',kind:'run',stat:'rare',name:'Коллекционер',desc:n=>`Доставь ${n} редких или лучше котов`,target:L=>Math.min(250,Math.round((30+8*L)/5)*5),need:hasRare},
 {id:'w_boosters',kind:'play',stat:'boosters',name:'Запасливый',desc:n=>`Возьми в рейс ${n} расходников`,target:()=>5,minLevel:2},
 {id:'w_nets',kind:'play',stat:'nets',name:'Страховочная сетка',desc:n=>`Сетка должна поймать ${n} котов`,target:L=>L<10?6:10,need:canNet},
 {id:'w_upgrades',kind:'home',stat:'upgrades',name:'Стройка',desc:n=>`Сделай ${n} улучшений`,target:L=>Math.min(30,10+Math.floor(L/2))},
 {id:'w_cozy',kind:'home',stat:'cozy',name:'Мебельщик',desc:n=>`Улучши мебель ${n} ${plural(n,'раз','раза','раз')}`,target:L=>Math.min(12,4+Math.floor(L/4)),need:s=>furnitureOpen(s,0)},
 {id:'w_chests',kind:'meta',stat:'chests',name:'Каждый день',desc:n=>`Открой ${n} ежедневных сундука`,target:()=>4},
 {id:'w_stars',kind:'meta',stat:'stars',name:'Приют растёт',desc:n=>`Получи ${n} ★ ранга приюта`,target:L=>Math.min(60,Math.round((10+2*L)/5)*5),minLevel:3},
 {id:'w_golden',kind:'meta',stat:'golden',name:'Золотая лихорадка',desc:()=>'Доставь золотого кота',target:()=>1,minLevel:6}];
const questDisabled=new Set(Array.isArray(questRemote.disabled)?questRemote.disabled.map(String):[]);
const questSlots=(v,fallback)=>Array.isArray(v)&&v.length&&v.length<=8&&v.every(k=>['run','play','home','meta','any'].includes(k))?v:fallback;
const quest={dailySlots:questSlots(questRemote.daily_slots,['run','play','home']),weeklySlots:questSlots(questRemote.weekly_slots,['run','run','play','home','meta']),
 targetScale:bounded(questRemote.target_scale,.1,10,1),targets:questRemote.targets||{},
 freeRerolls:Math.floor(bounded(questRemote.free_rerolls,0,10,1)),adRerolls:Math.floor(bounded(questRemote.ad_rerolls,0,10,2)),
 chestBoosters:Math.floor(bounded(questRemote.daily_chest_boosters,0,3,1)),chestCharm:Math.floor(bounded(questRemote.weekly_chest_charm,0,5,1))};
function plural(n,one,few,many){const a=n%10,b=n%100;return a===1&&b!==11?one:a>=2&&a<=4&&(b<10||b>=20)?few:many}
const pad=n=>String(n).padStart(2,'0');
function dayKey(now){const d=new Date(now);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function weekKey(now){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return dayKey(d.getTime())}
function nextReset(now,weekly){const d=new Date(now);d.setHours(24,0,0,0);if(weekly)while(d.getDay()!==1)d.setDate(d.getDate()+1);return d.getTime()}
function seeded(key){let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h=Math.imul(h^h>>>15,2246822507);h=Math.imul(h^h>>>13,3266489909);return((h^=h>>>16)>>>0)/4294967296}}
function taskOpen(s,t){return !questDisabled.has(t.id)&&(!t.minLevel||level(s)>=t.minLevel)&&(!t.need||t.need(s))}
function taskTarget(t,L){const m=bounded(quest.targets[t.id],.1,10,1);return Math.max(1,Math.round(t.target(L)*m*(t.target.length?quest.targetScale:1)))}
// One task per slot from that kind; a slot with nothing open takes any open task left.
function pickTasks(s,pool,slots,key){
 const r=seeded(key),L=level(s),open=pool.filter(t=>taskOpen(s,t)).map(t=>({t,k:r()})).sort((a,b)=>a.k-b.k),out=[];
 for(const slot of slots){const x=open.find(x=>!out.includes(x.t)&&(slot==='any'||x.t.kind===slot))||open.find(x=>!out.includes(x.t));if(x)out.push(x.t)}
 return out.map(t=>({id:t.id,target:taskTarget(t,L)}));
}
function refreshTasks(s,now=Date.now()){
 const d=dayKey(now),w=weekKey(now);
 if(s.daily?.key!==d)s.daily={key:d,tasks:pickTasks(s,dailyPool,quest.dailySlots,'d'+d),stats:{},claimed:[],chest:0,rerolls:0,adRerolls:0,done:[]};
 if(s.weekly?.key!==w)s.weekly={key:w,tasks:pickTasks(s,weeklyPool,quest.weeklySlots,'w'+w),stats:{},claimed:[],chest:0,done:[],stars:shelterStars(s)};
 // Saves from before these fields: the tasks already done count as seen, the week's stars start now.
 for(const p of [s.daily,s.weekly]){p.done??=p.tasks.filter(x=>x.from===undefined&&(p.stats[(dailyPool.find(t=>t.id===x.id)||weeklyPool.find(t=>t.id===x.id))?.stat]||0)>=x.target).map(x=>x.id);p.rerolls??=0;p.adRerolls??=0}
 s.weekly.stars??=shelterStars(s);
}
const poolOf=weekly=>weekly?weeklyPool:dailyPool;
function taskValue(s,p,x,def){const v=def.stat==='stars'?shelterStars(s)-(p.stars||0):(p.stats[def.stat]||0)-(x.from||0);return Math.max(0,Math.min(x.target,v))}
// Tasks that reached their target since the last call; the UI toasts them and analytics logs them.
let completed=[];
function noteDone(s){for(const [weekly,p] of [[false,s.daily],[true,s.weekly]])for(const x of p.tasks){const def=poolOf(weekly).find(t=>t.id===x.id);if(def&&!p.done.includes(x.id)&&taskValue(s,p,x,def)>=x.target){p.done.push(x.id);completed.push({period:weekly?'weekly':'daily',id:x.id,name:def.name,target:x.target})}}}
function takeCompleted(){const out=completed;completed=[];return out}
function track(s,stat,n=1,now=Date.now(),max=false){if(!s.daily)return;refreshTasks(s,now);for(const p of [s.daily,s.weekly])p.stats[stat]=max?Math.max(p.stats[stat]||0,n):(p.stats[stat]||0)+n;noteDone(s)}
// What a finished normal run adds: the cats the net caught, slow-motion presses and a clean delivery.
function trackRun(s,run,now=Date.now()){
 if(run.lives)track(s,'nets',run.lives,now);
 if(run.slowmo)track(s,'slowmo',run.slowmo,now);
 if(run.delivered&&!run.lives&&!run.slowmo)track(s,'clean',run.cats,now,true);
}
function taskCoins(s){const L=level(s),hourly=rooms.reduce((n,_,i)=>{const st=stats(s,i);return n+(st.active?st.hourly:0)},0);return Math.round(Math.max(econ.dailyCoinsBase+econ.dailyCoinsPerLevel*L,hourly*econ.dailyIncomeHours))}
function taskList(s,weekly,now=Date.now()){refreshTasks(s,now);const p=weekly?s.weekly:s.daily,pool=poolOf(weekly);return p.tasks.map(x=>{const def=pool.find(t=>t.id===x.id);if(!def)return null;return {id:x.id,kind:def.kind,max:!!def.max,name:def.name,desc:def.desc(x.target),value:taskValue(s,p,x,def),target:x.target,claimed:p.claimed.includes(x.id),reward:weekly?{vitamins:econ.weeklyVitamins,copies:econ.weeklyCopies}:{coins:taskCoins(s),vitamins:econ.dailyVitamins}}}).filter(Boolean)}
// Замена: a daily task not done yet swaps for another open one of the same kind (any kind when none is left).
// The new task counts from now, and never a best-of-one-run task, whose record could already be done.
function rerollsLeft(s,now=Date.now()){refreshTasks(s,now);return {free:Math.max(0,quest.freeRerolls-s.daily.rerolls),ad:Math.max(0,quest.adRerolls-s.daily.adRerolls)}}
function rerollTask(s,id,ad=false,now=Date.now()){
 const p=s.daily,left=rerollsLeft(s,now),i=p.tasks.findIndex(x=>x.id===id),cur=dailyPool.find(t=>t.id===id);
 if(i<0||!cur||p.claimed.includes(id)||p.done.includes(id)||!(ad?left.ad:left.free))return null;
 const used=new Set([...p.tasks.map(x=>x.id),...(p.swapped||[])]),r=seeded(p.key+id+p.rerolls+p.adRerolls),open=dailyPool.filter(t=>!used.has(t.id)&&!t.max&&taskOpen(s,t)).map(t=>({t,k:r()})).sort((a,b)=>a.k-b.k);
 const next=(open.find(x=>x.t.kind===cur.kind)||open[0])?.t;if(!next)return null;
 p.swapped=[...(p.swapped||[]),id];p.tasks[i]={id:next.id,target:taskTarget(next,level(s)),from:p.stats[next.stat]||0};
 if(ad)p.adRerolls++;else p.rerolls++;
 return {from:id,to:next.id,name:next.name};
}
function grantCopies(s,n,rarest){const owned=cats.map((_,i)=>i).filter(i=>i>=2&&s.owned[i]>0&&s.levels[i]<20);if(!owned.length)return null;const t=rarest?owned[owned.length-1]:owned[Math.floor(seeded(s.daily.key+s.total)()*owned.length)];s.owned[t]+=n;return {type:t,count:n}}
// A free booster is armed for the next normal run; with every open one already armed it pays its price in coins.
function grantBooster(s){const open=boosters.filter(b=>boosterOpen(s,b)&&!s.boost[b.key]);if(open.length){const b=open[Math.floor(seeded(s.daily.key+s.runs)()*open.length)];s.boost[b.key]=1;return {booster:b.key,coins:0}}const b=boosters.filter(b=>boosterOpen(s,b)).pop();return b?{booster:null,coins:boosterCost(s,b)}:null}
function claimTask(s,weekly,id,now=Date.now()){const t=taskList(s,weekly,now).find(t=>t.id===id),p=weekly?s.weekly:s.daily;if(!t||t.claimed||t.value<t.target)return null;p.claimed.push(id);const r={coins:t.reward.coins||0,vitamins:t.reward.vitamins||0,copies:t.reward.copies?grantCopies(s,t.reward.copies,false):null};s.coins+=r.coins;s.vitamins+=r.vitamins;return r}
function chestReady(s,weekly,now=Date.now()){const p=weekly?s.weekly:s.daily;return !p.chest&&taskList(s,weekly,now).every(t=>t.claimed)}
function chestContents(s,weekly){return weekly?{vitamins:econ.weeklyChestVitamins,copies:econ.weeklyChestCopies,charm:goldenOpen(s)?quest.chestCharm:0}:{vitamins:econ.dailyChestVitamins,boosters:boosters.some(b=>boosterOpen(s,b))?quest.chestBoosters:0}}
function claimChest(s,weekly,now=Date.now()){
 if(!chestReady(s,weekly,now))return null;const p=weekly?s.weekly:s.daily,c=chestContents(s,weekly);p.chest=1;
 const r={coins:taskCoins(s)*(weekly?3:2),vitamins:c.vitamins,copies:weekly?grantCopies(s,c.copies,true):null,charm:c.charm||0,boosters:[]};
 for(let i=0;i<(c.boosters||0);i++){const b=grantBooster(s);if(b?.booster)r.boosters.push(b.booster);else if(b)r.coins+=b.coins}
 s.coins+=r.coins;s.vitamins+=r.vitamins;s.goldCharm+=r.charm;if(!weekly)track(s,'chests',1,now);return r;
}
function readyCount(s,now=Date.now()){return questList(s).filter(q=>!q.claimed&&q.value>=q.target).length+[false,true].reduce((n,w)=>n+taskList(s,w,now).filter(t=>!t.claimed&&t.value>=t.target).length+(chestReady(s,w,now)?1:0),0)}

// Golden cats: a rare glowing version of an owned cat. The chance grows with the cat's number in the tower;
// goldPity spawned cats without one guarantee the next, and a Золотой ошейник (goldCharm) makes cat №goldCharmAt golden.
// A golden cat counts only once it is delivered; a repeat pays vitamins and copies.
function goldenOpen(s){return playerProgress(s.xp).level>=econ.goldUnlock}
function goldenCount(s){return s.golden?s.golden.filter(n=>n>0).length:0}
function goldChance(s,position){return goldenOpen(s)?Math.min(econ.goldMax,econ.goldBase+econ.goldPerCat*position)*(1+bonus(s,'gold')):0}
// Called once for every cat spawned in a normal run. Returns the type that drops golden, or -1.
// The golden one goes to a cat still missing from the album when there is one.
function rollGolden(s,position,type,random=Math.random){
 // The collar works before goldUnlock too (ranks give it early), fires once per run (charmRun), and waits for the next owned cat
 // when cat №goldCharmAt is one the player hasn't found yet.
 const charm=s.goldCharm>0&&position>=econ.goldCharmAt&&s.charmRun!==s.runs&&s.owned[type]>0;
 if(!charm){if(!goldenOpen(s)||!s.owned[type])return -1;s.goldPity++;if(s.goldPity<econ.goldPity&&random()>=goldChance(s,position))return -1}
 else{s.goldCharm--;s.charmRun=s.runs}
 s.goldPity=0;
 const missing=cats.map((_,i)=>i).filter(i=>s.owned[i]>0&&!s.golden[i]);
 return missing.length&&!missing.includes(type)?missing[Math.floor(random()*missing.length)]:type;
}
function deliverGolden(s,types,now=Date.now()){return types.map(t=>{const first=!s.golden[t];s.golden[t]++;const r={type:t,first,vitamins:first?0:econ.goldDupVitamins,copies:first?0:econ.goldDupCopies};s.vitamins+=r.vitamins;s.owned[t]+=r.copies;track(s,'golden',1,now);return r})}

// Ранг приюта: one long scale. Stars come from cat levels, furniture, skills, the cats found and golden cats.
// Each rank pays a reward once (claimed in order); the gallery opens at galleryRank.
const rankTitles=[[1,'Котоприёмная'],[5,'Уютный приют'],[10,'Тёплый дом'],[15,'Кошачий клуб'],[20,'Кото-усадьба'],[25,'Кошачье королевство'],[30,'Легенда приюта']];
function shelterStars(s){const sum=a=>a.reduce((n,v)=>n+v,0);return sum(s.levels.map(l=>l-1))+sum(s.furniture.flat())+sum(Object.values(s.gear))+s.owned.filter(n=>n>0).length+econ.goldStars*goldenCount(s)}
function rankNeed(r){return r<=1?0:Math.round(econ.rankScale*(r-1)**econ.rankExp)}
function rankTitle(r){return rankTitles.filter(([at])=>r>=at).pop()[1]}
function shelterRank(s){const stars=shelterStars(s);let rank=1;while(rankNeed(rank+1)<=stars)rank++;return {rank,stars,from:rankNeed(rank),to:rankNeed(rank+1),title:rankTitle(rank)}}
function galleryOpen(s){return shelterRank(s).rank>=econ.galleryRank}
function rankReward(s,r){return {coins:taskCoins(s),vitamins:econ.rankVitamins+Math.floor(r/2),copies:r%3===0?econ.rankCopies:0,charm:r%4===2?1:0}}
function rankReady(s){return shelterRank(s).rank-s.rankClaimed}
function claimRank(s){const r=s.rankClaimed+1;if(r>shelterRank(s).rank)return null;s.rankClaimed=r;const d=rankReward(s,r),out={rank:r,coins:d.coins,vitamins:d.vitamins,copies:d.copies?grantCopies(s,d.copies,true):null,charm:d.charm};s.coins+=out.coins;s.vitamins+=out.vitamins;s.goldCharm+=out.charm;return out}

function questList(s){return [
 {id:'welcome',name:'Первый спасённый',desc:'Доставь первого кота',value:s.total,target:1,reward:5},
 {id:'breakfast',name:'Завтрак готов',desc:'Засели первую комнату',value:rooms[0].types.filter(t=>s.owned[t]).length,target:2,reward:10},
 {id:'variety',name:'Пёстрая компания',desc:'Собери 4 разных котов',value:s.owned.filter(n=>n>0).length,target:4,reward:10},
 {id:'five',name:'Пять за раз',desc:'Доставь 5 котов одним рейсом',value:s.deliveredBest,target:5,reward:10},
 {id:'fifteen',name:'Спасатель-профи',desc:'Доставь 15 котов одним рейсом',value:s.deliveredBest,target:15,reward:25},
 {id:'nap',name:'Тихий час',desc:'Засели вторую комнату',value:rooms[1].types.filter(t=>s.owned[t]).length,target:4,reward:25},
 {id:'growth',name:'Первое повышение',desc:'Прокачай любого кота до уровня 2',value:Math.max(...s.levels),target:2,reward:5},
 {id:'rescue',name:'Дежурство в приюте',desc:`Доставь ещё ${econ.repeatTarget} котов · повторяемый`,value:Math.max(0,s.total-s.quests.repeatAt),target:econ.repeatTarget,reward:econ.repeatVitamins,repeat:true}
 ].map(q=>({...q,claimed:!q.repeat&&s.quests.claimed.includes(q.id)}));}
function claimQuest(s,id){const q=questList(s).find(q=>q.id===id);if(!q||q.claimed||q.value<q.target)return 0;if(q.repeat)s.quests.repeatAt+=q.target;else s.quests.claimed.push(q.id);s.vitamins+=q.reward;return q.reward;}
return {goldenOpen,goldenCount,goldChance,rollGolden,deliverGolden,shelterStars,rankNeed,rankTitle,shelterRank,galleryOpen,rankReward,rankReady,claimRank,boosters,boosterCost,boosterOpen,buyBooster,useBoosters,furniture,furnitureCost,furnitureOpen,buyFurniture,bonus,energyMax,refillMinutes,skillLevel,skillNextUnlock,masteryUnlock,taskList,claimTask,chestReady,claimChest,chestContents,rerollTask,rerollsLeft,trackRun,takeCompleted,quest,readyCount,nextReset,taskCoins,econ,runEnergy,skillRoles,skill,runReward,tipVitamins,skillUnlocked,rewards,beginRun,settleRun,gearStats,playerProgress,questList,claimQuest,compressionCap,milestones,nextMilestone,probabilities,pick,luckCost,upgradeLuck,defaults,cats,rooms,equipment,create,stats,tick,spendEnergy,deliver,collect,catCost,upgradeCat,gearCost,buyGear};
})();
if(typeof module!=='undefined')module.exports=Economy;
