// Real native projectiles and updateBullets, not synthetic damage calls.
const assert=require('node:assert/strict'),fs=require('node:fs');
let harness=fs.readFileSync('qa-cross-combo.cjs','utf8').split('function test(name,body)')[0];
harness=harness.replace("['operative-renderer.js', 'story-data.js']","['operative-renderer.js', 'story-data.js', 'crossfire.js']");
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  `player,game,crossChain,keys,pressed,pointer,camera,fireBullet,fireTurretRow,updateEnemy,ensureShieldState,
  enforceEnemyLockdowns,getZoneIndexAt,zones,
  rebuild(){selectedDifficulty='darkhorse';game.difficulty='darkhorse';buildLevel();},`);
const {q,fixture,target}=new Function('require',harness+'\nreturn {q,fixture,target};')(require);
const crossfire=window.MoonlitCrossfire,results=[];
function test(name,run){try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
function arrangement(type='gunner',victimType='shield',direction=1,front=false){
  fixture();Object.assign(q.game,{kills:0,bossReplay:null,shake:0,runTime:0});
  Object.assign(q.player,{x:direction>0?950:100,y:594,hp:5,styleScore:17,burstCooldown:1.4,shotgunCharge:.7,airJumpAvailable:false});
  const owner=target(type,{x:direction>0?150:850,originX:direction>0?150:850,spawnX:direction>0?150:850,
    facing:direction,windup:0,cooldown:999,homeZoneIndex:0});
  const victim=target(victimType,{x:500,originX:500,spawnX:500,facing:front?-direction:direction,hp:6,maxHp:6,
    windup:.7,burstRemaining:4,hitStun:0,homeZoneIndex:0});
  owner.targetX=q.player.x+q.player.w/2;owner.targetY=q.player.y+q.player.h/2;
  return {owner,victim};
}
function fire(owner){
  const start=q.bullets.length;
  if(owner.type==='turret')q.fireTurretRow(owner);
  else {
    owner.windup=.071;
    if(owner.type==='machinegun'){owner.windup=0;owner.burstRemaining=4;owner.burstInterval=0;}
    q.updateEnemy(owner,.002);
  }
  const fired=q.bullets.slice(start);assert.equal(fired.length,owner.type==='turret'?5:1);
  assert(fired.every(b=>b.enemy&&b.ownerId===owner.id&&b.ownerZone===0));return fired;
}
function fly(seconds=1.2,dt=1/120,active=q.enemies){
  for(let remaining=seconds;remaining>1e-9;remaining-=dt){const step=Math.min(dt,remaining);q.game.time+=step;q.game.runTime+=step;q.updateBullets(step,active);}
}
function rewardSnapshot(){return {kills:q.game.kills,hp:q.player.hp,style:q.player.styleScore,
  burst:q.player.burstCooldown,charge:q.player.shotgunCharge,air:q.player.airJumpAvailable,pickups:q.pickups.length};}
for(const role of['gunner','machinegun','piercer','turret'])for(const direction of[-1,1])
test(`${role} actual shot exposes a shield from behind facing ${direction}`,()=>{
  const {owner,victim}=arrangement(role,'shield',direction);const before=rewardSnapshot();fire(owner);fly(.95);
  assert.equal(victim.hp,5.5);assert(victim.hitStun>=.42);assert.equal(victim.windup,0);assert.equal(victim.burstRemaining,0);
  assert(victim.crossfireExposedUntil>q.game.runTime);assert(!q.ensureShieldState(victim));
  assert.equal(victim.shieldGuard,2,'crossfire exposure does not spend shield durability');
  assert(victim.crossfireHintShown&&victim.crossfireHintUntil>q.game.runTime,'actual clear firing line teaches the tactic');
  assert(q.bullets.length<(role==='turret'?5:1),'contacting rounds are consumed');
  assert(q.bullets.every(b=>b.enemy&&b.ownerId===owner.id),'a lane missing the body stays hostile; no reflected round is created');
  assert.deepEqual(rewardSnapshot(),before);assert(victim.alive&&!victim.countedKill);
});
for(const direction of[-1,1])test(`shield front blocks allied fire without damage, guard loss or stun ${direction}`,()=>{
  const {owner,victim}=arrangement('turret','shield',direction,true);fire(owner);fly(.95);
  assert.equal(victim.hp,6);assert.equal(victim.hitStun,0);assert.equal(victim.shieldGuard,2);
  assert(q.ensureShieldState(victim));assert(q.bullets.length<5);assert(q.bullets.every(b=>b.enemy));assert(!victim.crossfireHintShown);
});
for(const type of['runner','gunner','machinegun','piercer','mortar','turret','mortarTurret','drone'])
test(`ordinary ${type} receives only nonlethal chip and an attack-cancel window`,()=>{
  const {owner,victim}=arrangement('gunner',type);
  if(type==='drone')victim.y=605;
  fire(owner);fly(.95);assert.equal(victim.hp,5.5);assert.equal(victim.hitStun,.26);assert.equal(victim.windup,0);assert(victim.alive);
});
test('a five-lane volley and a second rapid shot cannot multiply chip or renew the window',()=>{
  const {owner,victim}=arrangement('turret','shield');fire(owner);fly(.95);
  const expiry=victim.crossfireExposedUntil,ready=victim.crossfireReadyAt;fire(owner);fly(.95);
  assert.equal(victim.hp,5.5);assert.equal(victim.crossfireExposedUntil,expiry);assert.equal(victim.crossfireReadyAt,ready);
  q.game.time+=2;q.game.runTime+=2;fire(owner);fly(.95);assert.equal(victim.hp,5);assert(victim.crossfireExposedUntil>expiry);
});
test('crossfire never delivers a killing blow, loot, player healing or combat credit',()=>{
  const {owner,victim}=arrangement('gunner','gunner');victim.hp=1.2;const before=rewardSnapshot();
  for(let i=0;i<5;i++){q.game.time+=2;q.game.runTime+=2;fire(owner);fly(.95);}
  assert.equal(victim.hp,1);assert(victim.alive&&!victim.countedKill);assert.deepEqual(rewardSnapshot(),before);
});
test('expired exposure restores the same intact shield without touching guard regeneration',()=>{
  const {owner,victim}=arrangement();fire(owner);fly(.95);assert(!q.ensureShieldState(victim));
  q.game.runTime=victim.crossfireExposedUntil+.001;assert(q.ensureShieldState(victim));assert.equal(victim.shieldGuard,2);
});
test('pausing freezes the actual exposure window even while decorative game time advances',()=>{
  const {owner,victim}=arrangement();fire(owner);fly(.95);const time=q.game.runTime;
  assert(!q.ensureShieldState(victim));q.game.mode='paused';q.update(3);
  assert.equal(q.game.runTime,time);assert(q.game.time>time+2);assert(!q.ensureShieldState(victim));
  q.game.mode='playing';fly(victim.crossfireExposedUntil-q.game.runTime+.01);assert(q.ensureShieldState(victim));
});
test('a bullet cannot damage its own firing unit even when emitted inside its body',()=>{
  const {owner}=arrangement();const hp=owner.hp;q.enemies.splice(1);fire(owner);fly(.02);assert.equal(owner.hp,hp);assert(!owner.crossfireReadyAt);
});
test('shots cannot grief a boss and boss-owned standard rounds cannot crossfire ordinary mobs',()=>{
  let {owner,victim}=arrangement('gunner','echo');fire(owner);fly(.95);assert.equal(victim.hp,6);assert(!victim.hitStun);
  ({owner,victim}=arrangement('echo','gunner'));q.fireBullet(owner,470,0,'standard');fly(.95);assert.equal(victim.hp,6);assert(!victim.hitStun);
});
test('wrong-zone or missing provenance cannot be used for allied damage',()=>{
  for(const mode of['target zone','projectile zone','owner id']){
    const {owner,victim}=arrangement();const [b]=fire(owner);
    if(mode==='target zone')victim.homeZoneIndex=1;
    if(mode==='projectile zone')b.ownerZone=1;
    if(mode==='owner id')b.ownerId='not-a-live-owner';
    fly(.95);assert.equal(victim.hp,6);assert(!victim.crossfireReadyAt);
  }
});
test('friendly, reflected, harmless, mortar and optional-traversal cases are excluded',()=>{
  const {owner,victim}=arrangement(),base={enemy:true,kind:'standard',ownerId:owner.id,ownerZone:0,x:victim.x,y:victim.y,w:10,h:10,vx:470,vy:0};
  for(const patch of[{enemy:false},{kind:'reflected-shotgun'},{kind:'mortar'},{harmless:true}])
    assert(!crossfire.canHit({...base,...patch},victim,{owner,zone:0}));
  victim.optionalTraversal=true;assert(!crossfire.canHit(base,victim,{owner,zone:0}));
});
test('admin and tutorial modes do not allow crossfire',()=>{
  for(const flag of['adminMode','tutorialActive']){const {owner,victim}=arrangement();fire(owner);q.game[flag]=true;fly(.95);assert.equal(victim.hp,6);}
});
test('solid walls block ordinary crossfire but a five-lane cannon keeps its terrain-piercing rule',()=>{
  for(const role of['gunner','turret']){
    const {owner,victim}=arrangement(role);q.platforms.push({x:350,y:540,w:30,h:100,kind:'wall'});q.rebuildPlatformSpatialIndex();
    fire(owner);fly(.95);assert.equal(victim.hp,role==='turret'?5.5:6);
    if(role==='gunner')assert(!victim.crossfireHintShown,'the lesson is not shown through a solid wall');
  }
});
test('checkpoint retry removes exposure and crossfire cooldown from restarted enemies',()=>{
  const {owner,victim}=arrangement();victim.spawnY=victim.y;fire(owner);fly(.95);assert(victim.crossfireReadyAt>0);
  q.respawn();assert.equal(victim.hp,victim.maxHp);assert.equal(victim.crossfireReadyAt,0);assert.equal(victim.crossfireExposedUntil,0);assert(q.ensureShieldState(victim));
});
test('native canvas feedback balances save/restore and labels the actual injured unit',()=>{
  const {owner,victim}=arrangement();fire(owner);fly(.95);let depth=0;const words=[];
  const ctx=new Proxy({save(){depth++;},restore(){depth--;},fillText(word){words.push(word);}},{get(t,k){return k in t?t[k]:(()=>{});},set(t,k,v){t[k]=v;return true;}});
  crossfire.draw(ctx,victim,q.game.runTime);assert.equal(depth,0);assert(words.some(w=>w.includes('방패')||w.includes('노출')));
});
test('at least one untouched authored gunner/shield formation supports the taught tactic',()=>{
  fixture();q.rebuild();const pairs=[];
  for(const owner of q.enemies.filter(e=>['gunner','machinegun','piercer','turret'].includes(e.type)))
    for(const shield of q.enemies.filter(e=>e.type==='shield'&&e.homeZoneIndex===owner.homeZoneIndex))
      if(Math.abs(owner.x-shield.x)>70&&Math.abs(owner.x-shield.x)<600&&Math.abs(owner.y-shield.y)<65)pairs.push([owner.id,shield.id]);
  let found=null;
  for(const [ownerId,targetId]of pairs){
    q.rebuild();const owner=q.enemies.find(e=>e.id===ownerId),victim=q.enemies.find(e=>e.id===targetId);
    q.enforceEnemyLockdowns([owner,victim]);const dir=Math.sign(victim.x-owner.x);victim.facing=dir;owner.facing=dir;
    Object.assign(q.player,{x:victim.x+dir*180,y:victim.y+victim.h/2-q.player.h/2,attackTimer:0,invincible:0});
    q.game.zone=owner.homeZoneIndex;q.game.stage=owner.stageIndex;q.game.time=0;q.game.runTime=0;q.game.adminMode=false;q.game.tutorialActive=false;
    owner.targetX=q.player.x+q.player.w/2;owner.targetY=q.player.y+q.player.h/2;
    const before=victim.hp;
    if(owner.type==='turret')q.fireTurretRow(owner);
    else q.fireBullet(owner,470,0,owner.type==='piercer'?'phase':owner.type==='machinegun'?'machinegun':'standard');
    fly(1.25,1/120,q.enemies.filter(e=>e.homeZoneIndex===owner.homeZoneIndex));
    if(victim.hp<before&&victim.crossfireHintShown){found={zone:owner.homeZoneIndex,owner:owner.id,target:victim.id};break;}
  }
  assert(found,'authored layout must contain a real unobstructed supported encounter; do not rely only on synthetic scenes');
  console.log(JSON.stringify({authoredCrossfireExample:found}));
});
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);
for(const r of results.filter(r=>!r.ok))console.error(r.error);
console.log(`Crossfire QA: ${results.filter(r=>r.ok).length}/${results.length} passed`);
process.exitCode=Number(results.some(r=>!r.ok));
