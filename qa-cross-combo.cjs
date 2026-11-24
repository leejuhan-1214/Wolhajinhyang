// Behavioral regression tests for the three confirmed cuts -> shotgun finisher.
// Only this Node harness exposes private methods; the shipped game has no QA hooks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const browserStub = fs.readFileSync('qa-smoke.cjs', 'utf8').split('const runtimeSource =')[0];
new Function('require', browserStub)(require);
// Keep delayed respawns/audio deterministic; reset paths are exercised explicitly.
global.setTimeout = () => 1;
global.clearTimeout = () => {};
const canvasEvents = new Map();
document.getElementById('game').addEventListener = (type, callback) => {
  if (!canvasEvents.has(type)) canvasEvents.set(type, []);
  canvasEvents.get(type).push(callback);
};
for (const file of ['operative-renderer.js', 'story-data.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), {filename:file});
}
const source = fs.readFileSync('game.js', 'utf8');
const hook = `window.__CROSS_QA__ = {player,game,crossChain,keys,pressed,pointer,camera,
  enemies,bullets,platforms,hazards,checkpoints,pickups,boostNodes,combatRooms,snowPatches,
  updatePlayer,updateBullets,update,startAttack,startComboAttack,startShotgun,startBurst,
  damageEnemy,damageEnemyWithShotgun,damagePlayer,respawn,resetCrossChain,resetSlashCombo,syncCrossHud,chainHud,chainLabel,
  startTouchContextAttack,startTouchDirectAttack,startCutscene,togglePause,toggleAdminCadetMode,
  registerAdminSequence,rebuildPlatformSpatialIndex,clearGameplayInput,
  resetFreshGame(){lastResetAt=-Infinity;resetGame(false);},
  unlockAdmin(){adminModeUnlocked=true;},
  resetAdminUnlock(){adminModeUnlocked=false;adminSequenceProgress=0;},
  hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}
};`;
vm.runInThisContext(source.replace(/\}\)\(\);\s*$/, hook + '\n})();'), {filename:'game-cross-combo-test.js'});
const q = window.__CROSS_QA__;
const originalPlayer = structuredClone(q.player);
const originalEnemies = structuredClone(q.enemies);
const originalCheckpoint = structuredClone(q.checkpoints[0]);
let serial = 0;
const results = [];
const near = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);

function fixture() {
  for (const list of [q.enemies,q.bullets,q.platforms,q.hazards,q.checkpoints,q.pickups,q.boostNodes,q.combatRooms,q.snowPatches]) list.length=0;
  q.platforms.push({x:0,y:650,w:4000,h:800,kind:'ground'});
  q.checkpoints.push({...structuredClone(originalCheckpoint),x:280});
  q.rebuildPlatformSpatialIndex();
  Object.assign(q.player,structuredClone(originalPlayer),{
    x:300,y:650-originalPlayer.h,vx:0,vy:0,grounded:true,facing:1,hp:5,maxHp:5,
    invincible:0,attackTimer:0,attackCooldown:0,queuedAction:null,wallJumpLock:0,
    attackId:0,shotId:0,shells:2,maxShells:2,shotgunCooldown:0,shotgunCharge:0,
    recoilTimer:0,burstTimer:0,burstCooldown:0,buffTimer:0,rewardPower:0,
    respawnCheckpointIndex:0,runCycle:0,slashChain:0,slashChainTimer:0,
  });
  Object.assign(q.game,{
    mode:'playing',difficulty:'darkhorse',adminMode:false,adminCadetMode:false,
    tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],
    cutsceneSeen:new Set(),defeatedBosses:new Set(),freeze:0,zone:0,stage:0,time:0,
    burstUnlocked:true,hint:'',hintTimer:0,controlsReversed:false,screenFlipActive:false,
  });
  q.camera.x=0;q.camera.y=0;
  q.clearGameplayInput();q.hidePanels();q.resetAdminUnlock();q.resetCrossChain();
  window.MoonlitOperative.resetMotion(q.player);document.hidden=false;
}
function tick(dt=1/120) {q.game.time+=dt;q.updatePlayer(dt);q.pressed.clear();}
function advance(seconds) {
  let remaining=seconds;
  while(remaining>1e-9){const dt=Math.min(remaining,1/120);tick(dt);remaining-=dt;}
}
function target(kind='runner', overrides={}) {
  const prototype=originalEnemies.find(e=>e.type===kind||e.bossKind===kind);
  assert(prototype,`missing real enemy fixture ${kind}`);
  const e={...structuredClone(prototype),id:`qa-cross-${++serial}`,alive:true,hp:500,maxHp:500,
    x:365,y:650-prototype.h,originX:365,originY:650-prototype.h,homeZoneIndex:0,stageIndex:0,
    facing:-1,vx:0,vy:0,hurt:0,windup:0,rushTimer:0,cooldown:3,combatStarted:true,
    bossAction:null,hitAttackId:-1,hitShotId:-1,blockedAttackId:-1,squadRoomLeft:null,
    shieldGuard:2,shieldBreakTimer:0,barrierTimer:0,reflectBreakTimer:0,
    echoParriedShotId:null,echoReactiveParryCooldown:10,...overrides};
  q.enemies.push(e);return e;
}
function mouse(button=0) {
  const event={button,clientX:q.player.x+250,clientY:q.player.y+q.player.h/2,preventDefault(){},stopPropagation(){}};
  for(const callback of canvasEvents.get('mousedown')||[]) callback(event);
}
function waitForSwing() {
  let count=0;
  while((q.player.attackTimer>0||q.player.attackCooldown>0)&&count++<200)tick();
  assert(count<200,'prior attack must finish');
}
function beginSwing(kind='j') {
  waitForSwing();
  if(kind==='j'){q.pressed.add('KeyJ');tick();}
  else if(kind==='mouse')mouse(0);
  else if(kind==='touch')q.startTouchDirectAttack('slash');
  else q.startAttack({x:1,y:0});
  assert(q.player.attackTimer>0,`${kind} must start an attack`);
}
function slashHit(e,kind='j') {
  beginSwing(kind);const before=e.hp;
  for(let i=0;i<100&&e.hp===before&&q.player.attackTimer>0;i++)tick();
  assert(e.hp<before,`${kind} must confirm actual slash HP damage`);
  return q.player.attackId;
}
function prime(kind='j') {
  const e=target();
  for(let i=0;i<3;i++){slashHit(e,kind);assert.equal(q.crossChain.hits,i+1,'one confirmed distinct swing advances one step');}
  assert(q.crossChain.time>0&&q.crossChain.time<=1.1+1e-9,'readiness has the 1.1 second window');
  assert.equal(q.crossChain.resultTime,0,'three cuts alone must not announce the finisher');
  return e;
}
function fire({charged=false,via='method'}={}) {
  q.bullets.length=0;q.player.shotgunCooldown=0;q.player.shells=Math.max(q.player.shells,1);
  q.player.shotgunCharge=charged?3:0;
  const oldId=q.player.shotId,oldShells=q.player.shells;
  if(via==='mouse')mouse(2);
  else if(via==='key'){q.pressed.add('KeyF');tick();}
  else q.startShotgun({x:1,y:0});
  assert.equal(q.player.shotId,oldId+1,'one firing action creates one shot id');
  assert.equal(q.player.shells,oldShells-1,'finisher still spends exactly one shell');
  const pellets=q.bullets.filter(b=>b.shotId===q.player.shotId&&b.kind==='shotgun');
  assert.equal(pellets.length,charged?7:6,'existing pellet count must not change');
  near(q.player.shotgunCooldown,charged?.36:.27,'existing shotgun pacing');
  return pellets;
}
function hitWith(pellet,e) {
  const hp=e.hp; q.damageEnemyWithShotgun(e,pellet);return hp-e.hp;
}
function cleared(message) {
  assert.equal(q.crossChain.hits,0,message);assert.equal(q.crossChain.time,0,message);assert.equal(q.crossChain.resultTime,0,message);
}
function test(name,body) {
  fixture();try{body();results.push({name,ok:true});}
  catch(error){results.push({name,ok:false,error:error.stack});}
}

test('whiffs never advance a chain',()=>{
  for(let i=0;i<4;i++){beginSwing();waitForSwing();}
  cleared('no target means no confirmed cut');
});
test('three real J confirms preserve original animation/attack pacing',()=>{
  const e=target();
  for(const duration of [.22,.24,.28]){slashHit(e);near(q.player.attackDuration,duration,'J duration');}
  assert.equal(q.crossChain.hits,3);assert.equal(q.player.combo,3,'existing combat analytics still count all hits');
  assert.equal(q.player.maxShells,2);assert.equal(q.player.shells,2);
});
test('three mouse cuts also prime the chain',()=>{prime('mouse');});
test('three direct touch cuts also prime the chain',()=>{prime('touch');});
test('mixed J, mouse and touch confirmations belong to one chain',()=>{
  const e=target();for(const kind of ['j','mouse','touch'])slashHit(e,kind);assert.equal(q.crossChain.hits,3);
});
test('one swing hitting multiple enemies advances only once',()=>{
  const a=target(),b=target('runner',{x:377,originX:377});slashHit(a);
  assert(b.hp<500,'same active hitbox must damage both targets');assert.equal(q.crossChain.hits,1);
  q.damageEnemy(a);q.damageEnemy(b);assert.equal(q.crossChain.hits,1,'repeated contact cannot count again');
  assert.equal(q.player.combo,2,'analytics are not replaced by distinct-swing tracking');
});
test('every confirmed step renews its own 1.1 second window',()=>{
  const e=target();slashHit(e);near(q.crossChain.time,1.1,'first confirmation starts window');
  advance(.8);slashHit(e);near(q.crossChain.time,1.1,'second confirmation refreshes window');
  advance(.8);slashHit(e);assert.equal(q.crossChain.hits,3,'total sequence may exceed 1.1 seconds');
});
test('window boundary expires and the next hit starts a new chain',()=>{
  const e=target();slashHit(e);advance(1.099);assert.equal(q.crossChain.hits,1);
  advance(.002);cleared('cross window expired');slashHit(e);assert.equal(q.crossChain.hits,1);
});
test('fourth slash cannot extend an already primed window',()=>{
  const e=prime();advance(.35);const time=q.crossChain.time;
  slashHit(e);assert.equal(q.crossChain.hits,3);assert(q.crossChain.time<time,'new damage must not renew ready time');
});
test('ordinary shotgun consumes partial progress without a bonus',()=>{
  const e=target();slashHit(e);const pellets=fire();assert.equal(q.crossChain.hits,0);
  assert(!pellets[0].crossFinish);near(hitWith(pellets[0],e),1.15,'unprimed shotgun damage');
  assert.equal(q.crossChain.resultTime,0);
});
test('ready shot consumes progress, shares one marker, and only real damage announces',()=>{
  const e=prime();q.syncCrossHud();assert.equal(q.chainHud.dataset.state,'ready');
  assert.equal(q.chainLabel.textContent,'샷건 연계!');assert.equal(q.chainHud.hidden,false);
  const pellets=fire({via:'mouse'});const marker=pellets[0].crossFinish;
  assert(marker,'third confirmed cut primes the next successfully fired shot');
  assert(pellets.every(p=>p.crossFinish===marker),'all pellets share one shot confirmation');
  assert.equal(q.crossChain.hits,0);assert.equal(q.crossChain.resultTime,0,'firing alone never announces');
  q.syncCrossHud();assert.notEqual(q.chainLabel.textContent,'월하일섬','HUD must not announce before damage');
  assert.equal(marker.announced,false);near(hitWith(pellets[0],e),2.15,'one bonus damage on first eligible target');
  assert(marker.announced&&q.crossChain.resultTime>0,'successful damage confirms the finisher');
  q.syncCrossHud();assert.equal(q.chainHud.dataset.state,'finish');assert.equal(q.chainLabel.textContent,'월하일섬');
  const hp=e.hp;for(const p of pellets)q.damageEnemyWithShotgun(e,p);near(e.hp,hp,'same shot cannot damage same target twice');
  const other=target('runner',{x:480,originX:480});q.crossChain.resultTime=.25;
  near(hitWith(pellets[1],other),2.15,'same shot gives one bonus on a distinct target');
  near(q.crossChain.resultTime,.25,'second target must not announce the same shot again');
});
test('overlapping different volleys cannot let old finisher pellets damage a target again',()=>{
  const e=prime(),oldPellets=fire();near(hitWith(oldPellets[0],e),2.15,'initial finisher hit');
  const ordinary=fire()[0];assert(!ordinary.crossFinish);near(hitWith(ordinary,e),1.15,'intervening normal shot');
  const hp=e.hp;q.damageEnemyWithShotgun(e,oldPellets[1]);near(e.hp,hp,'old shot target set survives a newer hitShotId');
});
test('marked projectile keeps its bonus after the firing window has passed',()=>{
  const e=prime();waitForSwing();advance(q.crossChain.time-.001);
  const pellet=fire()[0];assert(pellet.crossFinish,'shot fired before deadline is marked');
  advance(1.2);near(hitWith(pellet,e),2.15,'fire deadline is not an impact deadline');
});
test('shot fired after ready timeout has no bonus',()=>{
  const e=prime();advance(1.101);const pellet=fire()[0];assert(!pellet.crossFinish);
  near(hitWith(pellet,e),1.15,'expired readiness cannot enhance a shot');
});
test('missing final shot consumes readiness without claiming success',()=>{
  prime();const pellets=fire();q.enemies.length=0;
  q.updateBullets(2,[]);assert.equal(q.crossChain.hits,0);assert.equal(q.crossChain.resultTime,0);
  assert.equal(pellets[0].crossFinish.announced,false);assert.equal(q.bullets.length,0);
});
test('dry fire and cooldown rejection do not consume readiness',()=>{
  prime();const oldId=q.player.shotId;q.player.shells=0;q.startShotgun({x:1,y:0});
  assert.equal(q.player.shotId,oldId);assert.equal(q.crossChain.hits,3);
  q.player.queuedAction=null;q.player.shells=2;q.player.shotgunCooldown=.2;q.startShotgun({x:1,y:0});
  assert.equal(q.player.shotId,oldId);assert.equal(q.crossChain.hits,3);
});
test('overcharged shotgun retains its seven pellets and adds only one damage',()=>{
  const e=prime();const p=fire({charged:true})[0];assert(p.piercing);near(hitWith(p,e),3.2,'2.2 existing empowered damage plus one');
});
test('bonus remains subject to the existing formation damage multiplier',()=>{
  prime();const e=target('gunner',{squadRoomLeft:100});
  q.combatRooms.push({left:100,right:1000,triggered:true,cleared:false,anchorAlive:true,formationAnchorType:'shield'});
  const p=fire()[0];near(hitWith(p,e),2.15*.75,'formation guards scale the combined damage');
});
test('real bullet collision applies one finisher damage event',()=>{
  prime();q.enemies.length=0;const e=target('runner',{x:560,originX:560});fire();
  for(let frame=0;frame<36;frame++)q.updateBullets(1/120,[e]);
  near(500-e.hp,2.15,'actual pellet collision honors target/shot dedup');
  assert(q.crossChain.resultTime>0);
});
test('a blocking first target does not prevent another target confirming that swing',()=>{
  const shield=target('shield'),e=target();beginSwing('mouse');q.damageEnemy(shield);
  near(shield.hp,500,'first shield contact is blocked');assert.equal(q.crossChain.hits,0);
  q.damageEnemy(e);assert.equal(q.crossChain.hits,1,'a real hit later in the same swing may confirm once');
});
test('blocked slash, barrier, intro and Echo parry cannot count as damage',()=>{
  for(const [kind,extra] of [['shield',{}],['censor',{barrierTimer:2}],['warden',{combatStarted:false}],['echo',{bossAction:'echoCounter',windup:.25}]]){
    fixture();const e=target(kind,extra);beginSwing('mouse');q.damageEnemy(e);
    near(e.hp,500,`${kind} must guard the hit`);assert.equal(q.crossChain.hits,0,`${kind} guard cannot confirm a cut`);
  }
});
test('burst and reflected-projectile damage never advance slash steps',()=>{
  const e=target();q.startBurst();assert(e.hp<500,'real burst still causes ordinary damage');assert.equal(q.crossChain.hits,0);
  const hp=e.hp;q.damageEnemyWithShotgun(e,{x:e.x,y:e.y,vx:900,damage:.9,shotId:999,kind:'burst-parry',piercing:false});
  assert(e.hp<hp);assert.equal(q.crossChain.hits,0);assert.equal(q.crossChain.resultTime,0);
});
test('an inherited marker cannot enhance a non-shotgun or hostile reflected projectile',()=>{
  const e=prime(),p=fire()[0];p.kind='burst-parry';near(hitWith(p,e),1.15,'reflected counter is not a finisher shotgun');
  assert.equal(q.crossChain.resultTime,0);assert.equal(p.crossFinish.announced,false);
  const other=target();p.kind='shotgun';p.enemy=true;near(hitWith(p,other),1.15,'hostile reflection cannot receive the player finisher bonus');
  assert.equal(q.crossChain.resultTime,0);
});
for(const [name,kind,extra] of [
  ['shield','shield',{}],['locked intro','warden',{combatStarted:false}],
  ['oracle pending swap','oracle',{}],['hunter reflection','hunter',{}],
  ['censor barrier','censor',{barrierTimer:2}],['Echo reactive parry','echo',{echoReactiveParryCooldown:0}],
]) test(`finisher respects ${name} without announcing`,()=>{
  prime();const p=fire()[0];const e=target(kind,extra);
  if(kind==='oracle')e.pendingShotId=p.shotId;
  near(hitWith(p,e),0,`${name} prevents HP damage`);assert.equal(q.crossChain.resultTime,0);
  q.syncCrossHud();assert.notEqual(q.chainLabel.textContent,'월하일섬',`${name} cannot announce success in the HUD`);
  assert.equal(p.crossFinish.announced,false);
});
test('a guarded pellet leaves the same volley eligible to finish on another target',()=>{
  prime();const pellets=fire(),guard=target('shield'),normal=target();
  near(hitWith(pellets[0],guard),0,'guarded pellet does no damage');
  assert.equal(pellets[0].crossFinish.announced,false);
  near(hitWith(pellets[1],normal),2.15,'different unguarded target can confirm the volley');
  q.syncCrossHud();assert.equal(q.chainLabel.textContent,'월하일섬');
});
test('an already dead target cannot confirm a finisher',()=>{
  prime();const p=fire()[0],e=target('runner',{alive:false,hp:0});
  near(hitWith(p,e),0,'dead target is ignored');assert.equal(p.crossFinish.announced,false);assert.equal(q.crossChain.resultTime,0);
});
test('ready touch context action fires instead of selecting another nearby slash',()=>{
  const e=prime('touch');q.pointer.screenX=e.x+e.w/2;q.pointer.screenY=e.y+e.h/2;
  const shotId=q.player.shotId,attackId=q.player.attackId;q.startTouchContextAttack();
  assert.equal(q.player.shotId,shotId+1,'ready contextual tap selects shotgun');
  assert.equal(q.player.attackId,attackId,'ready tap must not become a fourth slash');
  assert(q.bullets.some(b=>b.crossFinish));
});
test('F key uses the same confirmed-shot pipeline',()=>{prime();assert(fire({via:'key'})[0].crossFinish);});
test('pause preserves the remaining input window',()=>{
  const e=target();slashHit(e);const time=q.crossChain.time,hits=q.crossChain.hits;
  q.togglePause();assert.equal(q.game.mode,'paused');q.update(2);
  near(q.crossChain.time,time,'paused simulation cannot spend combo time');assert.equal(q.crossChain.hits,hits);
  q.togglePause();assert.equal(q.game.mode,'playing');advance(.05);assert(q.crossChain.time<time);
});
test('player damage invalidates both progress and an in-flight finisher',()=>{
  const e=prime();const p=fire()[0],epoch=q.crossChain.epoch;
  q.damagePlayer(1,900);assert(q.crossChain.epoch>epoch);cleared('getting hurt breaks the chain');
  near(hitWith(p,e),1.15,'hurt strips the stale shot bonus');assert.equal(q.crossChain.resultTime,0);
});
test('death and respawn discard unfinished chains',()=>{
  prime();q.player.hp=1;q.damagePlayer(1,900);assert.equal(q.player.hp,0);cleared('death resets chain');
  const epoch=q.crossChain.epoch;q.respawn();assert(q.crossChain.epoch>epoch);cleared('respawn resets chain');
});
test('cutscene entry invalidates a marked shot and clears feedback',()=>{
  const e=prime(),p=fire()[0],epoch=q.crossChain.epoch;
  q.startCutscene({id:'qa-cross-cutscene',shots:[{duration:1,text:'QA'}]});
  assert(q.crossChain.epoch>epoch);cleared('cutscene entry resets chain');
  q.game.cutscene=null;near(hitWith(p,e),1.15,'cutscene invalidates stored finisher marker');
});
test('admin entry clears progress and admin damage cannot rebuild it',()=>{
  prime();q.game.adminCadetMode=true;q.unlockAdmin();q.toggleAdminCadetMode();
  assert(q.game.adminMode);cleared('returning to admin resets chain');
  q.enemies.length=0;const e=target();q.player.attackCooldown=0;q.player.attackTimer=0;
  q.startAttack({x:1,y:0});q.damageEnemy(e);assert.equal(q.crossChain.hits,0,'editor damage is not combat progress');
});
test('new game and explicit reset invalidate old shot epochs',()=>{
  const e=prime(),p=fire()[0],epoch=q.crossChain.epoch;
  q.resetCrossChain();assert(q.crossChain.epoch>epoch);cleared('explicit chain reset');
  near(hitWith(p,e),1.15,'explicit reset invalidates in-flight bonus');
  fixture();prime();const before=q.crossChain.epoch;q.resetFreshGame();assert(q.crossChain.epoch>before);cleared('new game resets chain');
});

const failures=results.filter(r=>!r.ok);
for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}`);
for(const failure of failures)console.error(failure.error);
console.log(`Cross-combo QA: ${results.length-failures.length}/${results.length} passed`);
process.exitCode=failures.length?1:0;
