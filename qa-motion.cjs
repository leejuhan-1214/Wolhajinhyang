// Run real gameplay functions in the existing browser stub, with private test-only hooks.
// No hooks or fixture data are included in the shipped game.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('./qa-smoke.cjs');
window.__MOONLIT_ECHO_RUNTIME_ACTIVE__ = false;
const source = fs.readFileSync('game.js', 'utf8');
const hook = `window.__MOTION_QA__ = { player, game, keys, pressed, platforms, enemies, bullets,
  hazards, checkpoints, pickups, boostNodes, combatRooms, snowPatches, updatePlayer,
  startAttack, startShotgun, updateBullets, damagePlayer, frame, togglePause, drawPlayerBody, drawEnemy,
  drawCharacterArchive, drawHud, ctx, camera, rebuildPlatformSpatialIndex,
  toggleAdminCadetMode, teleportAdminToZone,
  unlockAdmin() { adminModeUnlocked = true; },
  setClock(now) { previousTime = now; },
  hidePanels() { game.tutorialOpen = false; adminSpawnPanel.hidden = true; adminZonePanel.hidden = true; adminDifficultyPanel.hidden = true; }
};`;
const instrumentedSource = source.replace('function update(dt) {', 'function update(dt) { window.__MOTION_UPDATE_COUNT__ = (window.__MOTION_UPDATE_COUNT__ || 0) + 1;');
vm.runInThisContext(instrumentedSource.replace(/\}\)\(\);\s*$/, hook + '\n})();'), { filename: 'game-motion-test.js' });
const q = window.__MOTION_QA__;
const originalPlayer = { ...q.player };
const originalEnemies = q.enemies.slice();
function fixture() {
  for (const list of [q.enemies,q.bullets,q.hazards,q.checkpoints,q.pickups,q.boostNodes,q.combatRooms,q.snowPatches,q.platforms]) list.length = 0;
  q.platforms.push({x:0,y:650,w:3500,h:800,kind:'ground'});
  q.rebuildPlatformSpatialIndex();
  Object.assign(q.player, originalPlayer, {x:300,y:650-originalPlayer.h,vx:0,vy:0,grounded:true,hp:5,maxHp:5,invincible:0,attackTimer:0,attackCooldown:0,queuedAction:null,wallJumpLock:0,runCycle:0});
  Object.assign(q.game,{mode:'playing',difficulty:'darkhorse',adminMode:false,adminCadetMode:false,tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],freeze:0,zone:0,stage:0});
  q.keys.clear(); q.pressed.clear(); q.hidePanels();
}
fixture();
q.keys.add('KeyD');
for(let i=0;i<60;i++) q.updatePlayer(1/60);
assert(q.player.x > 700 && q.player.grounded, 'running must advance along the floor');
assert(q.player.runCycle > 0, 'ground travel must animate feet');
const gaitBeforeJump=q.player.runCycle;
q.player.grounded=false; q.player.y=200; q.player.vy=-200;
q.updatePlayer(1/60);
assert.equal(q.player.runCycle,gaitBeforeJump,'airborne movement must not cycle running feet');

fixture();
q.platforms.push({x:500,y:300,w:60,h:350,kind:'wall'}); q.rebuildPlatformSpatialIndex();
q.player.x=500-q.player.w; q.keys.add('KeyD');
for(let i=0;i<20;i++) q.updatePlayer(1/60);
assert.equal(q.player.runCycle,0,'feet must not run in place against a wall');
q.player.y=480; q.player.grounded=false; q.player.wallRight=true;
q.pressed.add('Space'); q.keys.add('Space'); q.updatePlayer(1/60); q.pressed.clear();
for(let i=0;i<4;i++) q.updatePlayer(1/60);
assert(q.player.vx < -450,'wall jump must push away despite the held toward-wall key');

fixture();
q.player.attackCooldown=0.045;
q.startAttack({x:1,y:0});
assert(q.player.queuedAction,'slightly early slash should be buffered');
for(let i=0;i<4;i++) q.updatePlayer(1/60);
assert.equal(q.player.attackId,originalPlayer.attackId+1,'buffer should launch exactly one slash');
assert.equal(q.player.queuedAction,null);
q.startAttack(); q.togglePause();
assert.equal(q.player.queuedAction,null,'pause must clear stale combat input');

fixture();
q.player.attackCooldown=0.4;
q.startAttack({x:1,y:0});
assert.equal(q.player.queuedAction,null,'attacks far before recovery must not queue indefinitely');
q.player.attackCooldown=0.04;
q.startAttack({x:1,y:0});
q.damagePlayer(1,900);
assert.equal(q.player.queuedAction,null,'taking damage must cancel a buffered attack');

fixture();
q.player.shotgunCooldown=0.04;
q.startShotgun({x:1,y:0});
for(let i=0;i<4;i++) q.updatePlayer(1/60);
assert.equal(q.player.shells,originalPlayer.shells-1,'buffered shotgun must spend one shell');

fixture();
q.player.y=220; q.player.grounded=false;
q.bullets.push({x:q.player.x,y:q.player.y,w:18,h:18,vx:0,vy:0,life:3,enemy:true,kind:'mortar',impactTimer:1,lockedImpactX:900,lockedImpactY:650,terrainCollision:true,gravity:860,ownerZone:0});
q.updateBullets(1/60,[]);
assert.equal(q.player.hp,4,'airborne mortar direct hit must deal one damage');
assert.equal(q.bullets.length,0,'direct-hit shell must be consumed');

fixture();
q.game.adminMode=true; q.keys.add('KeyD'); q.setClock(1000);
q.frame(1050);
assert(Math.abs(q.player.x-344.5)<0.01,'50ms frame must simulate 50ms using bounded steps');

function runAtFrameRate(milliseconds,frames) {
  fixture(); q.keys.add('KeyD'); q.setClock(1000);
  for(let i=1;i<=frames;i++) q.frame(1000+i*milliseconds);
  return q.player.x;
}
assert(Math.abs(runAtFrameRate(50,10)-runAtFrameRate(1000/60,30))<2,'normal movement must stay consistent at 20 and 60 FPS');

fixture(); q.game.adminMode=true; q.setClock(1000); window.__MOTION_UPDATE_COUNT__=0;
for(let i=1;i<=60;i++) q.frame(1000+i*1000/60);
assert.equal(window.__MOTION_UPDATE_COUNT__,60,'60 FPS must not cause duplicate simulation work from floating-point rounding');

fixture(); q.unlockAdmin(); q.game.adminMode=true;
q.player.queuedAction={kind:'slash',aim:null,time:0.1}; q.player.wallJumpLock=0.1;
assert(q.toggleAdminCadetMode('cadet'));
assert.equal(q.player.queuedAction,null,'entering an admin playtest must clear combat input');
assert.equal(q.player.wallJumpLock,0);
q.player.queuedAction={kind:'slash',aim:null,time:0.1}; q.player.wallJumpLock=0.1;
assert(q.toggleAdminCadetMode());
assert.equal(q.player.queuedAction,null,'returning to admin mode must not fire a queued slash');
assert.equal(q.player.wallJumpLock,0);
q.player.queuedAction={kind:'shotgun',aim:null,time:0.1}; q.player.wallJumpLock=0.1;
assert(q.teleportAdminToZone(0));
assert.equal(q.player.queuedAction,null,'admin teleport must clear stale attacks');
assert.equal(q.player.wallJumpLock,0);

// Exercise actual renderers through the canvas stub across every character and action phase.
fixture();
for(const enemy of originalEnemies.filter((enemy,index,all)=>all.findIndex(e=>e.bossKind===enemy.bossKind&&e.type===enemy.type)===index)) {
  for(const facing of [-1,1]) {
    q.drawEnemy({...enemy,alive:true,facing,x:500,y:400,hurt:0,vx:100,anim:0.4});
  }
}
for(const facing of [-1,1]) for(let phase=0;phase<12;phase++) {
  Object.assign(q.player,{grounded:true,vx:330,runCycle:phase*Math.PI/6,attackTimer:0,recoilTimer:0});
  q.drawPlayerBody(500,400,facing);
  q.player.attackTimer=q.player.attackDuration*(phase+1)/12;
  q.drawPlayerBody(500,400,facing);
  q.player.attackTimer=0; q.player.recoilTimer=0.3*(phase+1)/12;
  q.drawPlayerBody(500,400,facing);
}
console.log('Motion QA passed: ground/air gait, wall jump, input buffering, pause, mortar, low-FPS movement, all character renderers.');
