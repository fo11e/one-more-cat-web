'use strict';
// Analytics events (names and parameters in ANALYTICS.md). Loaded last: observes app.js and
// monetization.js from the outside and never changes what they do. The web build sends nothing.
(()=>{
if(!OMC.analytics)return;
const send=OMC.call;
const track=(name,params={})=>{send('track',{name,params})};
const level=()=>Economy.playerProgress(save.xp).level;
const isSave=s=>s===save;

// Ads, purchases and offers are tracked by monetization.js itself (ad_*, iap_offer, shop_open, purchase_*).
OMC.call=async(action,payload={})=>{
 const r=await send(action,payload);
 if(action==='share'||action==='shareImage')track('share',{method:action==='share'?'link':'image',content_type:'challenge'});
 return r;
};

// Runs.
let runAt=0;
const beginRun=Economy.beginRun;
Economy.beginRun=(s,...rest)=>{
 const ok=beginRun(s,...rest);
 // app.js counts the run right after this returns.
 if(ok&&isSave(s)){runAt=Date.now();setTimeout(()=>track('run_start',{run_number:save.runs,mode:challengeMode?'challenge':'normal',energy:save.energy,player_level:level()}))}
 return ok;
};
const baseFinish=finish;
finish=function(delivered=false,challengeDone=false){
 const was=phase,coins=save.coins,vitamins=save.vitamins,energy=save.energy,mode=challengeMode?'challenge':'normal';
 baseFinish(delivered,challengeDone);
 if(was===phase||phase!=='result')return;
 const earned=save.coins-coins;
 track('run_end',{result:challengeDone?'challenge_done':delivered?'delivered':'fell',mode,cats:score,duration_sec:Math.round((Date.now()-runAt)/1000),run_number:save.runs,coins:earned,energy_paid:Math.max(0,energy-save.energy),lives_used:livesUsed,slowmo_used:slowmoUsed});
 if(earned>0)track('earn_virtual_currency',{virtual_currency_name:'coins',value:earned,source:'run'});
 if(save.vitamins>vitamins)track('earn_virtual_currency',{virtual_currency_name:'vitamins',value:save.vitamins-vitamins,source:'tips'});
};
const baseRescue=rescueHalf;
rescueHalf=function(){const n=rescueOffer?.length||0,ok=baseRescue();if(ok)track('rescue_half',{cats:n});return ok};

// Skills that fire during a run (app.js calls skillEvent).
const baseSkillEvent=skillEvent;
skillEvent=function(skill,params={}){baseSkillEvent(skill,params);track('skill_trigger',{skill,run_number:save.runs,...params})};

// Progress and economy.
const spend=(name,value,item)=>{if(value>0)track('spend_virtual_currency',{virtual_currency_name:name,value,item_name:item})};
const deliver=Economy.deliver;
Economy.deliver=(s,types,...rest)=>{
 if(!isSave(s))return deliver(s,types,...rest);
 const owned=[...s.owned],before=level(),rooms=Economy.rooms.map(r=>r.types.every(t=>owned[t]>0));
 const result=deliver(s,types,...rest);
 for(const t of new Set(types))if(!owned[t])track('cat_new',{cat_id:t,cat_name:TYPES[t].name});
 Economy.rooms.forEach((r,i)=>{if(!rooms[i]&&r.types.every(t=>s.owned[t]>0))track('room_complete',{room:r.theme})});
 const after=level();if(after>before){track('level_up',{level:after});for(const g of Economy.equipment)if(g.unlock>before&&g.unlock<=after)track('skill_unlock',{skill:g.key,player_level:after})}
 return result;
};
const upgradeCat=Economy.upgradeCat;
Economy.upgradeCat=(s,t,...rest)=>{
 const cost=Economy.catCost(s,t),ok=upgradeCat(s,t,...rest);
 if(ok&&isSave(s)){track('cat_upgrade',{cat_id:t,cat_name:TYPES[t].name,level:s.levels[t],coins:cost.coins,vitamins:cost.vitamins});spend('coins',cost.coins,'cat_'+t);spend('vitamins',cost.vitamins,'cat_'+t)}
 return ok;
};
const buyGear=Economy.buyGear;
Economy.buyGear=(s,key)=>{
 const gear=Economy.equipment.find(g=>g.key===key),cost=gear?Economy.gearCost(s,gear):0,ok=buyGear(s,key);
 if(ok&&isSave(s)){track('gear_upgrade',{gear:key,role:gear.role,level:s.gear[key],coins:cost});spend('coins',cost,'gear_'+key)}
 return ok;
};
const upgradeLuck=Economy.upgradeLuck;
Economy.upgradeLuck=(s,t)=>{
 const cost=Economy.luckCost(s,t),ok=upgradeLuck(s,t);
 if(ok&&isSave(s)){track('luck_upgrade',{cat_id:t,level:s.luck[t],coins:cost});spend('coins',cost,'luck_'+t)}
 return ok;
};
const claimQuest=Economy.claimQuest;
Economy.claimQuest=(s,id)=>{
 const n=claimQuest(s,id);
 if(n&&isSave(s)){track('quest_claim',{quest_id:id,reward:n});track('earn_virtual_currency',{virtual_currency_name:'vitamins',value:n,source:'quest'})}
 return n;
};
const buyBooster=Economy.buyBooster;
Economy.buyBooster=(s,key)=>{
 const cost=buyBooster(s,key);
 if(cost&&isSave(s)){track('booster_buy',{booster:key,coins:cost,player_level:level()});spend('coins',cost,'booster_'+key)}
 return cost;
};
const useBoosters=Economy.useBoosters;
Economy.useBoosters=(s,...rest)=>{
 const used=useBoosters(s,...rest);
 if(isSave(s)&&Object.values(used).some(Boolean))track('booster_use',{net:used.net||0,mint:used.mint||0,gold:used.gold||0,run_number:s.runs+1});
 return used;
};
// Golden cats and Ранг приюта.
const rollGolden=Economy.rollGolden;
Economy.rollGolden=(s,position,type,...rest)=>{
 const charm=s.goldCharm,pity=s.goldPity,t=rollGolden(s,position,type,...rest);
 if(t>=0&&isSave(s))track('golden_spawn',{cat_id:t,position,source:s.goldCharm<charm?'charm':pity+1>=Economy.econ.goldPity?'pity':'chance',run_number:s.runs});
 return t;
};
const deliverGolden=Economy.deliverGolden;
Economy.deliverGolden=(s,types,...rest)=>{
 const list=deliverGolden(s,types,...rest);
 if(isSave(s))for(const g of list){track('golden_deliver',{cat_id:g.type,first:g.first?1:0,album:Economy.goldenCount(s)});if(g.vitamins)track('earn_virtual_currency',{virtual_currency_name:'vitamins',value:g.vitamins,source:'golden'})}
 return list;
};
const baseGoldenEvent=goldenEvent;
goldenEvent=function(name,params={}){baseGoldenEvent(name,params);track(name,{...params,run_number:save.runs})};
const claimRank=Economy.claimRank;
Economy.claimRank=(s,...rest)=>{
 const r=claimRank(s,...rest);
 if(r&&isSave(s)){track('rank_claim',{rank:r.rank,stars:Economy.shelterStars(s),coins:r.coins,vitamins:r.vitamins,copies:r.copies?.count||0,charm:r.charm});earnReward(r,'rank')}
 return r;
};
const buyFurniture=Economy.buyFurniture;
Economy.buyFurniture=(s,i,j,...rest)=>{
 const cost=buyFurniture(s,i,j,...rest);
 if(cost&&isSave(s)){const f=Economy.furniture[i][j];track('furniture_upgrade',{room:Economy.rooms[i].theme,item:f.key,level:s.furniture[i][j],coins:cost});spend('coins',cost,'furniture_'+f.key)}
 return cost;
};
const earnReward=(r,source)=>{if(r.coins)track('earn_virtual_currency',{virtual_currency_name:'coins',value:r.coins,source});if(r.vitamins)track('earn_virtual_currency',{virtual_currency_name:'vitamins',value:r.vitamins,source})};
const claimTask=Economy.claimTask;
Economy.claimTask=(s,weekly,id,...rest)=>{
 const r=claimTask(s,weekly,id,...rest);
 if(r&&isSave(s)){track('task_claim',{period:weekly?'weekly':'daily',task_id:id,coins:r.coins,vitamins:r.vitamins,copies:r.copies?.count||0});earnReward(r,weekly?'weekly':'daily')}
 return r;
};
const claimChest=Economy.claimChest;
Economy.claimChest=(s,weekly,...rest)=>{
 const r=claimChest(s,weekly,...rest);
 if(r&&isSave(s)){track('chest_open',{period:weekly?'weekly':'daily',coins:r.coins,vitamins:r.vitamins,copies:r.copies?.count||0,boosters:r.boosters.join(',')||'none',charm:r.charm});earnReward(r,weekly?'weekly_chest':'daily_chest')}
 return r;
};
const takeCompleted=Economy.takeCompleted;
Economy.takeCompleted=(...args)=>{
 const list=takeCompleted(...args);
 for(const t of list){const p=t.period==='weekly'?save.weekly:save.daily;track('task_complete',{period:t.period,task_id:t.id,target:t.target,player_level:level(),rerolled:p.tasks.find(x=>x.id===t.id)?.from!==undefined?1:0})}
 return list;
};
const rerollTask=Economy.rerollTask;
Economy.rerollTask=(s,id,ad=false,...rest)=>{
 const r=rerollTask(s,id,ad,...rest);
 if(r&&isSave(s))track('task_reroll',{task_id:r.from,new_task_id:r.to,source:ad?'ad':'free',player_level:level()});
 return r;
};
const collect=Economy.collect;
Economy.collect=(s,...rest)=>{
 const n=collect(s,...rest);
 if(isSave(s)&&n>0){
  // The double collect adds the same amount again right after this call.
  const doubled=Shop.doubling;Shop.doubling=false;
  track('income_collect',{coins:n,doubled:doubled?1:0});
  track('earn_virtual_currency',{virtual_currency_name:'coins',value:doubled?n*2:n,source:'income'});
 }
 return n;
};

// Screens, offers that appear on their own, and player properties: checked twice a second.
function screen(){
 if(document.body.dataset.screen==='game')return phase==='result'?'result':'game';
 for(const p of ['shop','settings','rooms','cats','gear','quests'])if(!$('pane-'+p).hidden)return p;
 return 'rooms';
}
let lastScreen='',energyOpen=false,lastProps='';
function poll(){
 const now=screen();
 if(now!==lastScreen){
  lastScreen=now;track('screen_view',{screen_name:now,screen_class:'web'});
 }
 const dialog=$('energyDialog');
 if(dialog&&dialog.open!==energyOpen){
  energyOpen=dialog.open;
  if(energyOpen)track('energy_empty',{energy:save.energy,need:Economy.runEnergy(save.config)});
 }
 const props=JSON.stringify({player_level:level(),shelter_rank:Economy.shelterRank(save).rank,golden_cats:Economy.goldenCount(save),cats_total:save.total,runs_total:save.runs,no_ads:Shop.owns('removeads')?1:0,skills_total:Economy.equipment.reduce((n,g)=>n+(save.gear[g.key]||0),0)});
 if(props!==lastProps){lastProps=props;send('userProps',{props:JSON.parse(props)})}
}
poll();setInterval(poll,500);
if(/[#&]cat=/.test(location.hash))track('challenge_open');
})();
