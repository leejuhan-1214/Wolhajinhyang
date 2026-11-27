// Regression for the final duel gate and the actual campaign/replay encounter.
// Inject private probes in-memory only; load the same assets and published layout as the game.
const assert = require("node:assert/strict"), fs = require("node:fs"), vm = require("node:vm");
new Function("require", fs.readFileSync("qa-smoke.cjs", "utf8").split("const runtimeSource =")[0])(require);
window.__MOONLIT_ECHO_DISABLE_LIVE_SYNC__ = true;
window.__MOONLIT_ECHO_PUBLISHED_ADMIN_PROFILE__ = JSON.parse(fs.readFileSync("published-admin-profile.json", "utf8"));
for (const module of ["operative-renderer","duel-ghost","environment-renderer","campaign-edit-compat","crossfire","freight-chase","echo-marks","field-caches","story-data"])
  vm.runInThisContext(fs.readFileSync(module + ".js","utf8"), {filename:module + ".js"});
const hook = `window.__ENGAGEMENT_QA__={game,player,camera,enemies,zones,checkpoints,combatRooms,pressed,keys,freightChase,
  CUTSCENE_EVENTS,STORY_EVENTS,update,updateEnemy,respawn,advanceCutscene,isBossIntroLocked,startCutscene,
  setRespawnCheckpoint,getCheckpointRespawnPosition,getCurrentPlayerZoneIndex,saveCampaign,readCampaignSave,
  reset(resume=false,kind=null){lastResetAt=-Infinity;resetGame(resume,kind);},
  hide(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}
};`;
vm.runInThisContext(fs.readFileSync("game.js","utf8").replace(/\}\)\(\);\s*$/,hook+"\n})();"),{filename:"game-echo-engagement.js"});
const q=window.__ENGAGEMENT_QA__, final=39, sceneId="cutscene-echo", saveKey="moonlit-echo-campaign-v1";
const echo=()=>q.enemies.find(e=>e.type==="boss"&&e.bossKind==="echo"&&!e.adminSpawned&&e.alive);
const identity=e=>[e.id,e.spawnX,e.spawnY,e.originX,e.originY,e.homeZoneIndex];
const opening=e=>Math.abs(e.x+e.w/2-q.player.x-q.player.w/2);
const event=()=>q.CUTSCENE_EVENTS.find(s=>s.id===sceneId);
const cp=()=>q.checkpoints.find(c=>c.checkpointKey==="4:7");
function campaign(seen) {
  q.reset();q.hide();const e=echo(),checkpoint=cp();assert(e&&checkpoint);
  const pos=q.setRespawnCheckpoint(checkpoint,q.checkpoints.indexOf(checkpoint));
  for(const other of q.enemies)if(other.homeZoneIndex<final){other.alive=false;other.hp=0;}
  for(const room of q.combatRooms)if((room.left+room.right)/2<q.zones[final].x)room.cleared=true;
  q.freightChase.restore(null,final);
  Object.assign(q.game,{stage:4,zone:final,mode:"playing",adminMode:false,adminCadetMode:false,
    tutorialActive:false,tutorialCompleted:true,story:null,storyQueue:[],cutscene:null,freeze:0,
    cutsceneSeen:new Set(q.CUTSCENE_EVENTS.map(s=>s.id)),storySeen:new Set(q.STORY_EVENTS.map(s=>s.id)),
    defeatedBosses:new Set(q.enemies.filter(other=>other.type==="boss"&&other.homeZoneIndex<final).map(other=>other.bossKind))});
  if(!seen)q.game.cutsceneSeen.delete(sceneId);
  Object.assign(q.player,{x:pos.x,y:pos.y,vx:0,vy:0,grounded:false,invincible:40});
  return e;
}
function step(n=1){for(let i=0;i<n;i++){q.update(1/60);q.pressed.clear();}}
function finishScene() {let shots=0;while(q.game.cutscene&&shots++<50)q.advanceCutscene();assert(!q.game.cutscene);assert(shots>0);}
function fight(e) {
  const initialX=e.x;let min=initialX,max=initialX,attack=false;
  for(let i=0;i<720;i++){
    step();assert(e.alive&&q.game.mode==="playing"&&Number.isFinite(e.x)&&Number.isFinite(e.y));
    assert.equal(q.getCurrentPlayerZoneIndex(),final);
    min=Math.min(min,e.x);max=Math.max(max,e.x);
    attack ||= ["echoSlash","echoDash","echoCounter","chargeShot","echoParryRiposte"].includes(e.bossAction)||!!e.echoMimic;
  }
  assert(e.combatStarted,"combat must actually unlock");assert(max-min>100,"combat position must change");
  assert(attack,"Echo must execute a real combat pattern");return Math.round(max-min);
}
let failed=0,passed=0;
function test(label,fn){try{const info=fn();passed++;console.log("PASS",label,info??"");}catch(err){failed++;console.error("FAIL",label,err.stack);}}
test("unseen campaign intro holds the real boss and only releases it after dialogue",()=>{
  const e=campaign(false);Object.assign(q.player,{x:event().x,y:e.y+e.h-q.player.h,grounded:true});
  assert(q.isBossIntroLocked(e));q.startCutscene(event());const origin=e.x;
  step(30);assert(q.game.cutscene&&q.isBossIntroLocked(e));assert.equal(e.x,origin);assert(!e.combatStarted);
  finishScene();step();assert(e.combatStarted);return {travel:fight(e)};
});
test("a genuine checkpoint continue after the final dialogue does not require retracing its trigger",()=>{
  const template=identity(campaign(true));q.saveCampaign();const saved=q.readCampaignSave();assert(saved&&saved.cutsceneSeen.includes(sceneId));
  q.reset(true);q.hide();const e=echo();assert(e);assert.equal(q.getCurrentPlayerZoneIndex(),final);
  assert(q.player.x<event().x,"precondition: final checkpoint is left of the old dialogue trigger");
  assert.equal(q.player.respawnCheckpointKey,saved.checkpointKey);assert.equal(q.player.x,saved.respawnX);
  assert.deepEqual(identity(e),template,"resuming must not change Echo's authored identity or origins");
  assert(q.game.cutsceneSeen.has(sceneId));q.player.invincible=40;step(1);
  assert.equal(q.game.cutscene,null);assert(e.combatStarted,"a seen scene cannot strand the boss at its old coordinate gate");
  assert(opening(e)<=600,"a continued encounter starts in view");
  return {travel:fight(e)};
});
test("death in a seen final duel returns to the real checkpoint with a visible, live Echo",()=>{
  const e=campaign(true),template=identity(e),key=q.player.respawnCheckpointKey,checkpointX=q.player.respawnX;
  Object.assign(q.player,{x:event().x+100,y:e.y+e.h-q.player.h,grounded:true});
  step(75);assert(e.combatStarted);e.hp=1;q.player.hp=0;q.respawn();
  const restored=echo();assert(restored);assert.equal(restored.hp,restored.maxHp);
  assert.equal(q.player.respawnCheckpointKey,key);assert.equal(q.player.x,checkpointX);
  assert.deepEqual(identity(restored),template);assert(q.game.cutsceneSeen.has(sceneId));
  q.player.invincible=40;step();assert(restored.combatStarted);assert(opening(restored)<=600);
  return {opening:Math.round(opening(restored)),travel:fight(restored)};
});
test("a remembered introduction alone cannot activate Echo from the neighboring sector",()=>{
  const e=campaign(true),previous=q.checkpoints.find(c=>c.checkpointKey==="4:6");
  const pos=q.setRespawnCheckpoint(previous,q.checkpoints.indexOf(previous));
  q.game.zone=final-1;q.player.x=q.zones[final].x-q.player.w-60;q.player.y=pos.y;
  assert.equal(q.getCurrentPlayerZoneIndex(),final-1);
  const origin=e.x;assert(q.isBossIntroLocked(e));
  for(let i=0;i<45;i++){step();assert.equal(q.getCurrentPlayerZoneIndex(),final-1);assert(!e.combatStarted);assert.equal(e.x,origin);}
});
test("admin flight remains noncombat even inside the final arena",()=>{
  const e=campaign(true);q.game.adminMode=true;q.player.x=e.x-90;const origin=e.x,hp=q.player.hp;
  step(75);assert(!e.combatStarted);assert.equal(e.x,origin);assert.equal(q.player.hp,hp);
});
test("boss replay begins in sight, attacks, and does not replace the campaign save",()=>{
  campaign(true);q.saveCampaign();const saved=localStorage.getItem(saveKey);
  q.reset(false,"echo");q.hide();q.player.invincible=40;const e=echo();assert(e);
  assert.equal(q.game.cutscene?.id,"boss-signature-echo");
  const opening=Math.abs(e.x+e.w/2-q.player.x-q.player.w/2);
  assert(opening<=600,"replay actors must start in the same shot; separation was "+opening+"px");
  finishScene();step();const travel=fight(e);assert.equal(localStorage.getItem(saveKey),saved);return {opening,travel};
});
console.log("Echo engagement:",passed+"/"+(passed+failed));if(failed)process.exitCode=1;
