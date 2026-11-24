// Run real gameplay functions in the existing browser stub, with private test-only hooks.
// No hooks or fixture data are included in the shipped game.js.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { recordingContext, renderer: operativeRenderer } = require('./qa-operative.cjs');
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
  startAttack, startComboAttack, resetSlashCombo, isAttackActive, startShotgun, updateBullets, damagePlayer, frame, togglePause, drawPlayerBody, drawEnemy, startCutscene,
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
let stepEffects=0,footContacts=0;
for(let i=0;i<60;i++) {
  const beforeCycle=q.player.runCycle, beforeTimer=q.player.stepTimer;
  q.updatePlayer(1/60);
  if(Math.floor(beforeCycle/Math.PI)!==Math.floor(q.player.runCycle/Math.PI)) footContacts++;
  if(q.player.stepTimer>beforeTimer) stepEffects++;
}
assert(footContacts>=5 && footContacts<=7 && stepEffects===footContacts,'natural running cadence must trigger one effect per planted foot');
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

for (const facing of [-1,1]) {
  fixture();
  q.platforms.length=0;
  const wallX=facing===1?500:100;
  q.platforms.push({x:wallX,y:0,w:60,h:1400,kind:'wall'}); q.rebuildPlatformSpatialIndex();
  q.player.x=facing===1?wallX-q.player.w:wallX+60;
  q.player.y=500; q.player.grounded=false; q.player.wallRight=facing===1; q.player.wallLeft=facing===-1;
  q.keys.add(facing===1?'KeyD':'KeyA'); q.keys.add('KeyW');
  for(let i=0;i<30;i++) q.updatePlayer(1/60);
  assert(q.player.y<440 && q.player.vy<0,'holding up at either wall must climb, not accelerate down');
  q.keys.delete('KeyW'); q.player.vy=400;
  q.updatePlayer(1/60);
  assert(q.player.vy<=145,'wall slide cap must apply after gravity');
}

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
q.startComboAttack();
assert.equal(q.player.slashComboIndex,0);
assert(q.player.slashComboActive);
const comboFirstId=q.player.attackId;
for(let expected=1;expected<=2;expected++) {
  while(q.player.attackCooldown>0.09) q.updatePlayer(1/120);
  q.startComboAttack(); q.startComboAttack();
  assert.equal(q.player.queuedAction?.kind,'combo','J accepts only one buffered follow-up');
  for(let i=0;i<15;i++) q.updatePlayer(1/120);
  assert.equal(q.player.slashComboIndex,expected,'J must advance through three distinct strikes');
  assert.equal(q.player.attackId,comboFirstId+expected,'repeated J input must not duplicate a strike');
  assert(q.player.slashComboLinked && q.player.slashComboCarry>0,'linked strike must inherit prior recovery pose');
}
while(q.player.attackCooldown>0.09) q.updatePlayer(1/120);
q.startComboAttack();
for(let i=0;i<15;i++) q.updatePlayer(1/120);
assert.equal(q.player.slashComboIndex,0,'the next J after a finisher must restart the three-strike sequence');
assert(q.player.slashComboLinked && q.player.slashComboCarry>0,'finisher-to-opening must carry the recovery pose too');
for(let i=0;i<120;i++) q.updatePlayer(1/120);
q.startComboAttack();
assert.equal(q.player.slashComboIndex,0,'expired combo must restart from the opening draw');
q.togglePause();
assert.equal(q.player.slashComboActive,false,'pause must reset combo posture and buffered input');
assert.equal(q.player.slashComboWindow,0);
fixture(); q.startComboAttack(); q.damagePlayer(1,900);
assert.equal(q.player.slashComboActive,false,'taking damage must break the combo');
fixture(); q.startComboAttack();
for(let i=0;i<40;i++) q.updatePlayer(1/120);
q.startAttack({x:-1,y:0});
assert.equal(q.player.slashComboActive,false,'mouse/default slash must preserve its separate behavior');
assert.equal(q.player.facing,-1,'combo changes must not break directional slashes');
for(const [index,contact] of [0.18,0.15,0.23].entries()) {
  fixture(); q.startComboAttack(); q.player.slashComboIndex=index;
  q.player.attackTimer=q.player.attackDuration*(1-contact+0.01);
  assert.equal(q.isAttackActive(),false,'J wind-up must not damage enemies before the blade starts its cut');
  q.player.attackTimer=q.player.attackDuration*(1-contact-0.01);
  assert.equal(q.isAttackActive(),true,'J contact must begin with the corresponding cut');
}
fixture(); q.startComboAttack(); q.startShotgun({x:1,y:0});
assert(q.player.slashComboActive && q.player.attackTimer>0,'shooting during J must not replace the executing cut with a legacy pose');

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
q.player.motionPose={ground:0.3,vy:-300,squash:-0.05,wall:0.4};
assert(q.teleportAdminToZone(0));
assert.equal(q.player.queuedAction,null,'admin teleport must clear stale attacks');
assert.equal(q.player.wallJumpLock,0);
assert.equal(q.player.motionPose,null,'teleport must reset stale pose interpolation');

// Temporal presentation regressions use real movement/collision/attack state and
// compare anatomy relative to the moving actor, not its world-space travel.
function captureActorPose() {
  const record=recordingContext();
  const before=JSON.stringify(q.player);
  operativeRenderer.createRenderer(record.context,q.player,q.game)(q.player.x,q.player.y,q.player.facing);
  assert.equal(JSON.stringify(q.player),before,'temporal rendering must not mutate game state');
  assert(record.balanced());
  const origin=[Math.round(q.player.x+q.player.w/2),Math.round(q.player.y+q.player.h)];
  const local=(point)=>[point[0]-origin[0],point[1]-origin[1]];
  return {head:local(record.headCenters[0]),waist:local(record.waistCenters[0]),
    feet:record.feet.map(foot=>local(foot.ankle)),rear:local(record.hands[0]),
    front:local(record.hands[1])};
}
const poseDistance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function prepareRunningTransition(facing,phase,dt) {
  fixture();q.player.x=1500;q.keys.add(facing===1?'KeyD':'KeyA');
  for(let frame=0;frame<Math.round(0.3/dt);frame++)q.updatePlayer(dt);
  q.player.runCycle=phase*Math.PI*2;
  assert(q.player.motionPose&&q.player.motionPose.ground>.999,'running must initialize grounded presentation');
}
const jumpMetrics=[];
for(const dt of[1/60,1/120])for(const facing of[-1,1])for(const phase of[0.05,0.37,0.62,0.87]) {
  prepareRunningTransition(facing,phase,dt);
  const startY=q.player.y,startVX=q.player.vx;
  let previousPose=captureActorPose(),minY=startY,landed=false,frames=0;
  q.pressed.add('Space');q.keys.add('Space');q.updatePlayer(dt);q.pressed.clear();
  assert(!q.player.grounded&&q.player.vy<0,'jump physics must begin immediately, without an animation delay');
  assert.equal(q.player.vx,startVX,'blending takeoff must preserve running momentum');
  assert(Math.abs(q.player.motionPose.ground-(1-dt/0.12))<1e-8,'takeoff must update presentation exactly once per physics step');
  let currentPose=captureActorPose();
  assert(poseDistance(previousPose.head,currentPose.head)<5.5,'run-to-jump must not snap the forward-leaning head upright');
  assert(Math.max(...currentPose.feet.map((point,index)=>poseDistance(previousPose.feet[index],point)))<9,
    'run-to-jump must blend the planted/recovering feet into the airborne pose');
  previousPose=currentPose;
  while(!landed&&frames<Math.ceil(2/dt)) {
    q.updatePlayer(dt);frames++;minY=Math.min(minY,q.player.y);
    currentPose=captureActorPose();
    assert(poseDistance(previousPose.head,currentPose.head)<5.5,'jump, apex and landing head poses must remain continuous');
    if(q.player.grounded) {
      landed=true;
      assert(Math.abs(q.player.runCycle/Math.PI-Math.round(q.player.runCycle/Math.PI))<1e-8,
        'landing must rephase to a genuine foot contact');
      assert(Math.abs(q.player.motionPose.ground-dt/0.1)<1e-8,'landing must blend once rather than instantly reset to running');
      assert(Math.max(...currentPose.feet.map((point,index)=>poseDistance(previousPose.feet[index],point)))<9,
        'landing must not pop suspended or below-floor feet into the running pose');
    }
    previousPose=currentPose;
  }
  assert(landed,'the real jump must land on the fixture floor');
  assert(Math.abs(q.player.y+q.player.h-650)<0.001,'presentation must not change collision-floor height');
  for(let frame=0;frame<Math.ceil(0.16/dt);frame++)q.updatePlayer(dt);
  assert(q.player.motionPose.ground>.999,'running presentation must recover after landing');
  jumpMetrics.push({dt,facing,phase,height:startY-minY});
}
for(const facing of[-1,1])for(const phase of[0.05,0.37,0.62,0.87]) {
  const pair=jumpMetrics.filter(sample=>sample.facing===facing&&sample.phase===phase);
  assert(Math.abs(pair[0].height-pair[1].height)<7,'visual blending must not introduce refresh-dependent jump height');
}
for(const dt of[1/60,1/120])for(const facing of[-1,1]) {
  prepareRunningTransition(facing,0.37,dt);
  q.pressed.add('Space');q.keys.add('Space');q.updatePlayer(dt);q.pressed.clear();
  for(let frame=0;frame<Math.ceil(1/dt)&&q.player.vy<80;frame++)q.updatePlayer(dt);
  assert(!q.player.grounded&&q.player.vy>=80,'double-jump fixture must be falling after the apex');
  const before=captureActorPose();
  q.pressed.add('Space');q.updatePlayer(dt);q.pressed.clear();
  assert(q.player.vy<-500&&!q.player.airJumpAvailable,'double-jump physics must react immediately');
  assert(q.player.motionPose.ground<0.001,'double jump must not restart a grounded transition');
  assert(q.player.motionPose.vy>q.player.vy,'double-jump presentation must blend the velocity reversal');
  let after=captureActorPose();
  assert(poseDistance(before.head,after.head)<5.5,'double jump must not snap the head posture');
  assert(Math.max(...after.feet.map((point,index)=>poseDistance(before.feet[index],point)))<9,
    'double jump must not snap falling legs directly into a launch pose');
  for(let frame=0;frame<8;frame++) {
    const previous=after;q.updatePlayer(dt);after=captureActorPose();
    assert(poseDistance(previous.head,after.head)<5.5,'double-jump head recovery must remain continuous');
  }
}
for(const facing of[-1,1])for(const phase of[0.05,0.37,0.62,0.87]) {
  prepareRunningTransition(facing,phase,1/60);
  const beforePose=captureActorPose();
  const expectedEntry=operativeRenderer.captureLocomotion(q.player,q.game,facing);
  const physicsBefore=[q.player.x,q.player.y,q.player.vx,q.player.vy,q.player.runCycle];
  q.startComboAttack();
  assert.deepEqual([q.player.x,q.player.y,q.player.vx,q.player.vy,q.player.runCycle],physicsBefore,
    'starting J must not freeze movement or reset the running feet');
  for(const key of['arm','elbow','rear','rearElbow'])assert(Math.abs(q.player.slashComboEntry[key]-expectedEntry[key])<1e-8,
    `J must capture the current ${key} before beginning its windup`);
  const entrySnapshot=JSON.stringify(q.player.slashComboEntry);
  const firstPose=captureActorPose();
  assert(poseDistance(beforePose.head,firstPose.head)<0.1&&poseDistance(beforePose.waist,firstPose.waist)<0.1,
    'the first J frame must retain the running torso instead of resetting it');
  assert(poseDistance(beforePose.front,firstPose.front)<1.5&&poseDistance(beforePose.rear,firstPose.rear)<1.5,
    'the first J frame must begin at the actual running wrist positions');
  let previous=firstPose;
  for(let frame=0;frame<4;frame++) {
    q.updatePlayer(1/60);
    const next=captureActorPose();
    assert.equal(JSON.stringify(q.player.slashComboEntry),entrySnapshot,'the entry pose must not drift with the subsequent running cycle');
    const wristStep=poseDistance(previous.front,next.front);
    assert(wristStep<13,`J windup must connect the captured arm to its swing: ${JSON.stringify({facing,phase,frame,wristStep,from:previous.front,to:next.front})}`);
    previous=next;
  }
}
fixture();q.keys.add('KeyD');for(let frame=0;frame<12;frame++)q.updatePlayer(1/60);
const pausedMotion=JSON.stringify(q.player.motionPose);q.togglePause();
assert.equal(JSON.stringify(q.player.motionPose),pausedMotion,'pausing must preserve presentation history');
q.togglePause();assert.equal(JSON.stringify(q.player.motionPose),pausedMotion,'resuming must not reset into another pose');
q.player.motionPose={ground:0.3,vy:-300,squash:-0.05,wall:0.4};
q.startCutscene({id:'qa-transition-cutscene',shots:[{duration:0.1}]});
assert.equal(q.player.motionPose,null,'a cutscene must not inherit old travel interpolation');
fixture();
const archiveMotion={ground:0.35,vy:-280,squash:-0.04,wall:0.2};
const archiveEntry={arm:0.6,elbow:-0.9,rear:-0.5,rearElbow:-0.8};
q.player.motionPose=archiveMotion;q.player.slashComboEntry=archiveEntry;q.player.slashComboActive=true;
const archiveBefore=JSON.stringify(q.player);
q.drawCharacterArchive(0);
assert.strictEqual(q.player.motionPose,archiveMotion,'character archive must restore the exact presentation object');
assert.strictEqual(q.player.slashComboEntry,archiveEntry,'character archive must restore the exact J entry snapshot');
assert.equal(q.player.slashComboActive,true,'character archive must restore the active combo flag');
assert.equal(JSON.stringify(q.player),archiveBefore,'character archive must not change live player posture');

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
console.log('Motion QA passed: temporal run/jump/landing/J entry, double jump, presentation resets/archive restore, 60/120Hz physics, ground/air gait, wall jump, input buffering, pause/visibility, hybrid touch, hit-stop, mortar and all character renderers.');
