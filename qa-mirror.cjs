// Real-game tests for completed-encounter learning and fair, readable Echo mimicry.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const name of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(name,'utf8'),{filename:name});
const hook=`window.__MIRROR_QA__={player,game,enemies,bullets,platforms,hazards,pickups,boostNodes,combatRooms,snowPatches,checkpoints,zones,WORLD_W,
 resetMirrorHabits,exportMirrorHabits,pruneMirrorHabits,observeMirrorFight,finishMirrorFight,getMirrorHabitSummary,
 beginLearnedEchoMimic,updateLearnedEchoMimic,updateBoss,updateEnemy,killEnemy,damageEnemyWithShotgun,respawn,
 rebuildPlatformSpatialIndex,clearGameplayInput,saveCampaign,readCampaignSave,
 hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-mirror-test.js'});
const q=window.__MIRROR_QA__,originalPlayer=structuredClone(q.player),templates=structuredClone(q.enemies),originalCheckpoints=structuredClone(q.checkpoints);
const results=[];let serial=0;
function fixture(zone=1){
  for(const list of [q.enemies,q.bullets,q.platforms,q.hazards,q.pickups,q.boostNodes,q.combatRooms,q.snowPatches])list.length=0;
  q.platforms.push({x:0,y:650,w:q.WORLD_W,h:800,kind:'ground'});q.rebuildPlatformSpatialIndex();
  q.checkpoints.length=0;q.checkpoints.push(...structuredClone(originalCheckpoints));
  Object.assign(q.player,structuredClone(originalPlayer),{x:q.zones[zone].x+700,y:594,vx:0,vy:0,grounded:true,hp:5,maxHp:5,invincible:0,attackTimer:0,attackCooldown:0,burstTimer:0,recoilTimer:0,attackId:0,shotId:0,rewardPower:0,respawnCheckpointIndex:zone,respawnZone:zone,respawnStage:q.zones[zone].stageIndex});
  Object.assign(q.game,{mode:'playing',difficulty:'darkhorse',adminMode:false,adminCadetMode:false,bossReplay:null,tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],cutsceneSeen:new Set(),storySeen:new Set(),defeatedBosses:new Set(),stageClearTimes:[0,0,0,0,0],stage:q.zones[zone].stageIndex,zone,time:0,freeze:0});
  q.clearGameplayInput();q.hidePanels();q.resetMirrorHabits();
}
function boss(kind='breaker',zone=1){
  const t=templates.find(e=>e.type==='boss'&&e.bossKind===kind);assert(t,`missing ${kind}`);
  const x=q.zones[zone].x+1000;
  const e={...structuredClone(t),id:`mirror-qa-${++serial}`,x,y:650-t.h,baseY:650-t.h,originX:x,originY:650-t.h,spawnX:x,spawnY:650-t.h,
    alive:true,hp:100,maxHp:100,homeZoneIndex:zone,stageIndex:q.zones[zone].stageIndex,combatStarted:true,facing:-1,vx:0,vy:0,grounded:true,
    hitStun:0,hurt:0,cooldown:0,windup:0,bossAction:null,halfPhaseTriggered:true,crisisPatternCooldown:99,
    followupPattern:null,echoDecisionSerial:0,echoMimicSerial:0,echoMimic:null,echoReactiveParryCooldown:0};
  q.enemies.push(e);return e;
}
function learn(e,kind='slash',seconds=3){
  for(let frame=0;frame<Math.ceil(seconds*10);frame++){
    q.player.attackTimer=kind==='slash'?.2:0;q.player.recoilTimer=kind==='shotgun'?.2:0;
    if(frame%3===0){q.player.attackId++;q.player.shotId++;}
    q.player.grounded=kind!=='air';q.player.vy=kind==='air'?(frame%6===0?-500:50):0;
    q.player.vx=kind==='rush'?440:0;
    q.observeMirrorFight(e,.1);
  }
}
function seed(kind='slash',zone=7){
  q.resetMirrorHabits({version:1,records:{warden:{zone,seconds:12,scores:{slash:0,shotgun:0,air:0,rush:0,[kind]:12}}}});
}
function toRecovery(e){
  let frames=0,maxStep=0,jumped=false;
  while(e.echoMimic&&e.echoMimic.phase!=='recover'&&frames++<400){
    q.updateLearnedEchoMimic(e,1/60);maxStep=Math.max(maxStep,e.echoMimic?.step||0);jumped||=e.vy<-100;
    assert([e.x,e.y,e.vx,e.vy].every(Number.isFinite),'mimic physics remain finite');
  }
  assert(frames<400,'bounded mimic sequence reaches recovery');assert.equal(e.echoMimic?.phase,'recover');
  return {maxStep,jumped};
}
function test(name,body){fixture();try{body();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.stack});}}

test('empty or old saves keep the existing Echo fallback',()=>{
  q.resetMirrorHabits({version:99,records:{}});const e=boss('echo');assert(!q.getMirrorHabitSummary().known);assert.equal(q.beginLearnedEchoMimic(e,200),false);
});
test('learning stays pending until a real boss defeat and commits only once',()=>{
  const e=boss();learn(e);assert.equal(Object.keys(q.exportMirrorHabits().records).length,0,'unfinished attempts are not persisted');
  q.killEnemy(e);const saved=q.exportMirrorHabits();assert.equal(saved.records.breaker.scores.slash,10);
  assert(q.getMirrorHabitSummary().known);const retry=boss();learn(retry,'shotgun',6);q.killEnemy(retry);
  assert.deepEqual(q.exportMirrorHabits(),saved,'repeated defeat cannot reweight the same encounter');
});
test('a held animation is one observed attack, not one vote per frame',()=>{
  const e=boss();q.player.attackTimer=.2;q.player.attackId=1;
  for(let frame=0;frame<180;frame++)q.observeMirrorFight(e,1/60);
  q.finishMirrorFight(e);assert.equal(q.exportMirrorHabits().records.breaker.scores.slash,1);
});
test('normal boss updates actually feed the campaign learner',()=>{
  fixture(7);const e=boss('breaker',7);e.cooldown=99;q.player.invincible=99;
  q.player.attackTimer=.2;q.player.attackId=1;
  for(let frame=0;frame<180;frame++)q.updateEnemy(e,1/60);
  q.killEnemy(e);assert.equal(q.getMirrorHabitSummary().styles[0],'slash');
});
test('abandoned attempts are discarded before a retry can teach a different habit',()=>{
  const e=boss();learn(e,'slash');q.pruneMirrorHabits(1);learn(e,'shotgun');q.killEnemy(e);
  const record=q.exportMirrorHabits().records.breaker;assert.equal(record.scores.slash,0);assert(record.scores.shotgun>0);
});
for(const flag of ['adminMode','adminCadetMode','bossReplay','cutscene'])test(`${flag} cannot train the campaign mirror`,()=>{
  const e=boss();q.game[flag]=true;learn(e);q.finishMirrorFight(e);assert(!q.getMirrorHabitSummary().known);
});
test('dead players, dormant bosses and Echo itself do not train the profile',()=>{
  const e=boss();q.player.hp=0;learn(e);q.finishMirrorFight(e);assert(!q.getMirrorHabitSummary().known);
  q.player.hp=5;e.combatStarted=false;learn(e);q.finishMirrorFight(e);assert(!q.getMirrorHabitSummary().known);
  const echo=boss('echo');learn(echo);q.finishMirrorFight(echo);assert(!q.getMirrorHabitSummary().known);
});
test('checkpoint export and restore preserve only completed earlier encounters',()=>{
  fixture(7);const e=boss('warden',7);learn(e,'shotgun');q.killEnemy(e);
  assert.equal(Object.keys(q.exportMirrorHabits(7).records).length,0);
  const saved=q.exportMirrorHabits(8);assert(saved.records.warden);q.resetMirrorHabits(saved);
  assert.equal(q.getMirrorHabitSummary().styles[0],'shotgun');saved.records.warden.scores.shotgun=999;
  assert(q.exportMirrorHabits().records.warden.scores.shotgun<999,'save objects do not alias runtime');
  q.pruneMirrorHabits(7);assert(!q.getMirrorHabitSummary().known);
});
test('sanitization bounds records, scores and durations',()=>{
  q.resetMirrorHabits({version:1,records:{warden:{zone:7,seconds:10000,scores:{slash:Infinity,shotgun:-3}},echo:{zone:79,seconds:10,scores:{slash:10}},unknown:{zone:1,seconds:10,scores:{slash:10}}}});
  const saved=q.exportMirrorHabits();assert.equal(saved.records.warden.seconds,90);assert.equal(saved.records.warden.scores.slash,500);
  assert.equal(saved.records.warden.scores.shotgun,0);assert(!saved.records.echo&&!saved.records.unknown);
});
test('campaign save stores the profile with checkpoint rollback semantics',()=>{
  seed('air',7);q.player.respawnZone=8;q.saveCampaign();assert(q.readCampaignSave().mirrorHabits.records.warden);
  q.player.respawnZone=7;q.saveCampaign();assert.equal(Object.keys(q.readCampaignSave().mirrorHabits.records).length,0);
});
test('practice may use learned habits without pruning or rewriting them',()=>{
  seed('rush');q.game.bossReplay={kind:'echo'};const before=q.exportMirrorHabits();q.pruneMirrorHabits(0);
  assert.deepEqual(q.exportMirrorHabits(),before);const e=boss('echo');assert(q.beginLearnedEchoMimic(e,200));assert.equal(e.echoMimic.kind,'rush');
});
test('two strong learned habits alternate, not an unbounded random set',()=>{
  q.resetMirrorHabits({version:1,records:{warden:{zone:15,seconds:10,scores:{slash:12,shotgun:10,air:.1,rush:.1}}}});
  const e=boss('echo');assert.deepEqual(q.getMirrorHabitSummary().styles,['slash','shotgun']);
  q.beginLearnedEchoMimic(e,200);assert.equal(e.echoMimic.kind,'slash');e.echoMimic=null;
  q.beginLearnedEchoMimic(e,200);assert.equal(e.echoMimic.kind,'shotgun');e.echoMimic=null;
  q.beginLearnedEchoMimic(e,200);assert.equal(e.echoMimic.kind,'slash');
});
test('warning locks direction and target instead of reading future player movement',()=>{
  fixture(79);seed('shotgun');const e=boss('echo',79);q.player.x=e.x+250;
  assert(q.beginLearnedEchoMimic(e,250));const locked=e.echoMimic.targetX;
  q.player.x=e.x-250;
  for(let i=0;i<7;i++)q.updateLearnedEchoMimic(e,.1);
  assert.equal(q.bullets.length,0,'minimum warning precedes all shots');assert.equal(e.echoMimic.targetX,locked);assert.equal(e.facing,1);
});
for(const kind of ['slash','shotgun','air','rush'])test(`${kind} produces its distinct bounded copied sequence`,()=>{
  fixture(79);seed(kind);const e=boss('echo',79);q.player.invincible=99;
  assert(q.beginLearnedEchoMimic(e,300));const seen=toRecovery(e);
  assert.equal(seen.maxStep,kind==='slash'?3:2);
  assert.equal(q.bullets.length,kind==='shotgun'?10:kind==='air'?3:0);
  if(kind==='air')assert(seen.jumped,'copied jump-shot actually jumps');
  assert(e.echoMimic.timer>=1.25-1e-8,'recovery is a full readable punish window');
  assert.equal(e.bossAction,null);assert.equal(e.windup,0);
  const count=q.bullets.length;
  for(let frame=0;frame<72;frame++)q.updateLearnedEchoMimic(e,1/60);
  assert.equal(e.echoMimic?.phase,'recover','at least1.2s remains attack-free');assert.equal(q.bullets.length,count);
  for(let frame=0;frame<8;frame++)q.updateLearnedEchoMimic(e,1/60);
  assert.equal(e.echoMimic,null);assert(e.cooldown>=.3);
});
test('recovery is vulnerable to normal shotgun and has no passive contact damage',()=>{
  fixture(79);seed();const e=boss('echo',79);q.beginLearnedEchoMimic(e,300);q.player.invincible=99;toRecovery(e);
  e.echoReactiveParryCooldown=0;e.hitShotId=-1;q.player.invincible=0;q.player.x=e.x;q.player.y=e.y;
  const hp=e.hp;const bullet={x:e.x,y:e.y,vx:400,damage:1.15,shotId:99,kind:'shotgun',piercing:false};
  q.damageEnemyWithShotgun(e,bullet);assert(Math.abs(hp-e.hp-1.15)<1e-8);assert(!bullet.cancelled);
  e.hitStun=0;const playerHp=q.player.hp;q.updateBoss(e,1/60,0,0);assert.equal(q.player.hp,playerHp);
});
test('ordinary decision cadence selects learned mimic every third decision',()=>{
  fixture(79);seed('shotgun');const e=boss('echo',79);q.player.x=e.x+250;
  q.updateBoss(e,1/60,250,250);assert.equal(e.echoMimic?.kind,'shotgun');assert.equal(e.echoDecisionSerial,1);
});
test('respawn clears an active mimic but preserves earlier checkpoint habits',()=>{
  fixture(79);seed('slash',7);const e=boss('echo',79);q.beginLearnedEchoMimic(e,200);q.respawn();
  assert.equal(e.echoMimic,null);assert(q.getMirrorHabitSummary().known);
});
const failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);
for(const r of failed)console.error(r.error);console.log(`Mirror QA: ${results.length-failed.length}/${results.length} passed`);process.exitCode=failed.length?1:0;
