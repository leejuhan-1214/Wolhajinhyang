// Run real gameplay functions in the existing browser stub, with private test-only hooks.
// No hooks or fixture data are included in the shipped game.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('./qa-smoke.cjs');
window.__MOONLIT_ECHO_RUNTIME_ACTIVE__ = false;
const windowEvents = new Map();
const documentEvents = new Map();
const captureListener = (listeners) => (type, handler) => {
  if (!listeners.has(type)) listeners.set(type, []);
  listeners.get(type).push(handler);
};
window.addEventListener = captureListener(windowEvents);
document.addEventListener = captureListener(documentEvents);
function dispatch(listeners, type, details = {}) {
  const event = {preventDefault() {}, stopPropagation() {}, ...details};
  for (const handler of listeners.get(type) || []) handler(event);
}
function key(type, code, repeat = false) { dispatch(windowEvents, type, {code, repeat}); }

const source = fs.readFileSync('game.js', 'utf8');
const hook = `window.__MOTION_QA__ = { player, game, keys, pressed, platforms, enemies, bullets,
  hazards, checkpoints, pickups, boostNodes, combatRooms, snowPatches, updatePlayer, update,
  keyboardKeys, touchPointers, moveStick, clearGameplayInput, handleTouchControlDown, handleTouchControlUp, setTutorialPanel, closeTutorialPanel,
  startAttack, startShotgun, updateBullets, damagePlayer, frame, togglePause, drawPlayerBody, drawEnemy,
  drawCharacterArchive, drawHud, ctx, camera, rebuildPlatformSpatialIndex,
  toggleAdminCadetMode, teleportAdminToZone,
  unlockAdmin() { adminModeUnlocked = true; },
  setClock(now) { previousTime = now; },
  hidePanels() { game.tutorialOpen = false; adminSpawnPanel.hidden = true; adminZonePanel.hidden = true; adminDifficultyPanel.hidden = true; startScreenEditor.hidden = true; }
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
  q.clearGameplayInput(); q.hidePanels(); document.hidden = false;
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

// Pause and browser lifecycle regressions use the real event listeners.
fixture();
key('keydown','KeyD'); key('keydown','Space'); q.player.jumpBuffer=0.1;
key('keydown','Escape');
assert.equal(q.game.mode,'paused','Escape should pause once');
assert.equal(q.keys.size,0,'pause must release keyboard input');
assert.equal(q.pressed.size,0,'pause must discard pending action edges');
assert.equal(q.player.jumpBuffer,0,'pause must discard a buffered jump');
key('keydown','Escape',true);
assert.equal(q.game.mode,'paused','holding Escape must not repeatedly toggle pause');
key('keydown','KeyD',true);
assert(!q.keys.has('KeyD'),'auto-repeat after pause must not restore a stale movement key');
key('keyup','Escape'); key('keydown','Escape');
assert.equal(q.game.mode,'playing','a fresh Escape press should resume');
q.updatePlayer(1/60);
assert(q.player.grounded,'resume must not replay the jump from before pause');

fixture(); key('keydown','KeyD'); key('keydown','Space');
q.player.queuedAction={kind:'slash',aim:null,time:0.1};
document.hidden=true; dispatch(documentEvents,'visibilitychange');
assert.equal(q.game.mode,'paused','switching mobile tabs must pause without needing blur');
assert.equal(q.keys.size,0); assert.equal(q.keyboardKeys.size,0);
assert.equal(q.player.queuedAction,null);
q.setClock(1000); window.__MOTION_UPDATE_COUNT__=0;
q.frame(6000);
assert.equal(window.__MOTION_UPDATE_COUNT__,0,'hidden tabs must not simulate or render gameplay');
document.hidden=false; dispatch(documentEvents,'visibilitychange');
assert.equal(q.game.mode,'paused','tab return must wait for explicit resume');
q.togglePause();
assert.equal(q.keys.size,0,'resume must leave movement released');
key('keydown','KeyA'); dispatch(windowEvents,'blur');
assert.equal(q.game.mode,'paused'); assert.equal(q.keys.size,0);

fixture(); q.setTutorialPanel(true); key('keydown','Space');
assert.equal(q.game.tutorialOpen,false,'Space should dismiss the training panel');
assert.equal(q.pressed.size,0,'dismissing a panel must not trigger a jump');
assert.equal(q.keys.size,0);

function touch(control, pointerId, type='down', x=640, y=360) {
  const event={currentTarget:control,pointerId,pointerType:'touch',clientX:x,clientY:y,preventDefault(){},stopPropagation(){}};
  if(type==='down') q.handleTouchControlDown(event); else q.handleTouchControlUp(event);
}
const jumpControl=document.getElementById('qa-jump'); jumpControl.dataset.touchAction='jump';
const moveControl=document.getElementById('qa-move'); moveControl.dataset.touchAction='move';
fixture(); key('keydown','Space'); touch(jumpControl,1); touch(jumpControl,1,'up');
assert(q.keys.has('Space'),'releasing touch must preserve a held keyboard jump');
touch(jumpControl,2); key('keyup','Space');
assert(q.keys.has('Space'),'releasing keyboard must preserve a held touch jump');
touch(jumpControl,2,'up'); assert(!q.keys.has('Space'));
touch(moveControl,3,'down',1000); touch(moveControl,4,'down',100);
assert.equal(q.touchPointers.size,1,'a second finger must not steal the active joystick');
touch(moveControl,4,'cancel'); assert(q.moveStick.active);
touch(moveControl,3,'cancel'); assert(!q.moveStick.active,'pointer cancellation must release the joystick');
q.togglePause(); touch(jumpControl,5);
assert.equal(q.touchPointers.size,0,'hidden gameplay controls must not queue input while paused');

fixture(); q.game.adminMode=true; q.keys.add('KeyD'); q.game.freeze=0.005;
const xBeforeFreeze=q.player.x;
q.update(1/60);
assert.equal(q.game.freeze,0,'hit-stop must end at zero');
assert(Math.abs(q.player.x-xBeforeFreeze-890*(1/60-0.005))<0.001,'hit-stop must simulate the unfrozen remainder of a frame');
function runWithHitStop(frameMs, frames) {
  fixture(); q.game.adminMode=true; q.keys.add('KeyD'); q.game.freeze=0.02; q.setClock(1000);
  for(let i=1;i<=frames;i++) q.frame(1000+i*frameMs);
  return q.player.x;
}
assert(Math.abs(runWithHitStop(1000/60,6)-runWithHitStop(1000/120,12))<0.001,'hit-stop duration must not depend on screen refresh rate');
fixture(); q.setClock(1000); window.__MOTION_UPDATE_COUNT__=0; q.frame(1000);
assert.equal(window.__MOTION_UPDATE_COUNT__,0,'a duplicate frame timestamp must not consume input');
q.game.adminMode=true; q.keys.add('KeyD'); q.frame(6000);
assert(Math.abs(q.player.x-300-890*0.066)<0.001,'a stalled visible frame must retain the bounded catch-up limit');

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
console.log('Motion QA passed: ground/air gait, wall jump, input buffering, pause/visibility lifecycle, hybrid touch input, hit-stop timing, mortar, low-FPS movement, all character renderers.');
