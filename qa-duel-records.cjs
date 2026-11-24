// Drive the real title buttons, save slot, encounters, hits, results and retries.
const assert=require("node:assert/strict"), fs=require("node:fs"), vm=require("node:vm");
const read=f=>fs.readFileSync(f,"utf8");
new Function("require",read("qa-smoke.cjs").split("const runtimeSource =")[0])(require);
global.setTimeout=()=>0;
for (const f of ["story-data.js","operative-renderer.js","duel-ghost.js"]) vm.runInThisContext(read(f),{filename:f});
const hook=`window.duelQA={game,player,enemies,stages,duelBook,SAVE_KEY,DUEL_RECORD_KEY,update,saveCampaign,damagePlayer,killEnemy,
  readCampaignSave,readDuelBook,importLegacyDuelWins,beginBossReplay,showDuelMenu,advanceCutscene,holdBossUntilIntroEnds,togglePause,respawn,
  start(){lastResetAt=-Infinity;resetGame(false)}, setDifficulty(d){selectedDifficulty=d},getZoneIndexAt};`;
vm.runInThisContext(read("game.js").replace(/\}\)\(\);\s*$/,hook+"\n})();"),{filename:"duel-game-test.js"});
const q=window.duelQA, el=id=>document.getElementById(id), click=id=>el(id).click(), slot=()=>localStorage.getItem(q.SAVE_KEY);
q.start();
const campaign=slot();
assert(campaign && q.readCampaignSave().checkpointKey);
q.game.mode="menu"; click("continue-button");
assert.equal(q.game.mode,"duelMenu"); assert.equal(el("duel-list").children.length,10); assert(el("duel-list").children.every(b=>b.disabled));
assert(!q.beginBossReplay("breaker")); click("duel-campaign"); assert.equal(q.game.mode,"playing"); assert(!q.game.bossReplay);
// Migrate a historical middle boss by counted instance ID, without inventing a time.
const legacy=q.enemies.find(e=>e.bossKind==="breaker");
q.importLegacyDuelWins({countedKillEnemyIds:[legacy.id]}); assert(q.duelBook.cleared.has("breaker"));
const preserved=slot(); q.setDifficulty("cadet"); q.showDuelMenu();
const go=()=>el("duel-list").children[0].click();
function deployed() {
  assert.equal(q.game.mode,"playing"); assert.equal(q.game.bossReplay.kind,"breaker");
  assert.equal(q.enemies.filter(e=>e.alive && e.type==="boss").length,1);
  const boss=q.enemies.find(e=>e.alive && e.bossKind==="breaker");
  assert.equal(q.getZoneIndexAt(q.player.x+q.player.w/2),boss.homeZoneIndex);
  assert(q.game.cutscene?.signatureOnly); assert(!boss.combatStarted);
  for(let i=0;i<240 && q.game.cutscene;i++) q.update(1/60);
  for(let i=0;i<60 && !boss.combatStarted;i++) q.update(1/60);
  assert(boss.combatStarted,"battle actually engages at practice spawn"); assert.equal(q.game.duelOpponent,boss);
  assert.equal(slot(),preserved); return boss;
}
go(); let boss=deployed(); q.togglePause(); const paused=q.game.runTime; q.update(.2); assert.equal(q.game.runTime,paused); q.togglePause();
q.player.invincible=0; q.damagePlayer(2); q.damagePlayer(1); assert.equal(boss.duelHits,1);
q.game.runTime=boss.duelBeganAt+7; q.killEnemy(boss); assert.equal(q.game.mode,"duelResult"); assert(el("duel-description").textContent.includes("피격 1회")); assert.deepEqual(q.duelBook.best["cadet:breaker"],{time:7,hits:1}); assert.equal(slot(),preserved);
click("duel-retry"); boss=deployed(); assert.equal(window.MoonlitDuelGhost.referenceTime,7);
assert(window.MoonlitDuelGhost.frameAt(.1)); q.togglePause(); click("duel-ghost-pause");
assert(!window.MoonlitDuelGhost.enabled); assert(!window.MoonlitDuelGhost.frameAt(.1)); click("duel-ghost-pause"); q.togglePause();
q.game.runTime=boss.duelBeganAt+12; q.killEnemy(boss);
assert.deepEqual(q.duelBook.best["cadet:breaker"],{time:7,hits:0},"independent bests"); assert.equal(slot(),preserved);
click("duel-retry"); deployed(); q.player.hp=1; q.player.invincible=0; q.damagePlayer(1); assert.equal(q.game.mode,"duelResult"); assert.equal(slot(),preserved);
click("duel-back"); assert.equal(q.game.mode,"duelMenu"); q.setDifficulty("darkhorse"); q.showDuelMenu();
go(); deployed(); q.saveCampaign(); q.respawn(); assert.equal(q.game.mode,"duelResult"); assert.equal(slot(),preserved);
assert(!q.duelBook.best["darkhorse:breaker"]); click("duel-retry"); deployed(); q.togglePause(); click("duel-leave");
assert.equal(q.game.mode,"duelMenu"); assert(!q.game.bossReplay); assert.equal(slot(),preserved);
click("duel-back"); assert.equal(q.game.mode,"menu"); click("continue-button"); click("duel-campaign");
assert(!q.game.bossReplay); assert.equal(q.player.respawnCheckpointKey,JSON.parse(preserved).checkpointKey); assert(q.enemies.filter(e=>e.alive).length>10);
q.duelBook.cleared.clear(); delete q.duelBook.best["cadet:breaker"]; q.readDuelBook();
assert(q.duelBook.cleared.has("breaker")); assert.deepEqual(q.duelBook.best["cadet:breaker"],{time:7,hits:0});
// Actual campaign kill unlocks its own card even before the next checkpoint.
const next=q.enemies.find(e=>e.bossKind==="warden"); next.combatStarted=true; next.duelBeganAt=q.game.runTime; q.killEnemy(next); assert(q.duelBook.cleared.has("warden"));
// Every earned boss, including the final echo, must engage from its real arena checkpoint.
const kinds=q.stages.flatMap(s=>[s.midBossKind,s.bossKind]);
const beforeTour=slot();
q.importLegacyDuelWins({defeatedBosses:kinds}); q.showDuelMenu();
for(const kind of kinds) {
  assert(q.beginBossReplay(kind));
  const e=q.enemies.find(x=>x.alive && x.bossKind===kind);
  assert(e,kind); assert.equal(q.getZoneIndexAt(q.player.x+q.player.w/2),e.homeZoneIndex);
  for(let i=0;i<220 && !e.combatStarted;i++) q.update(1/60);
  assert(e.combatStarted,kind+" did not start"); assert.equal(q.game.duelOpponent,e);
  q.togglePause();click("duel-leave");assert.equal(slot(),beforeTour,kind+" touched campaign");
}
console.log("Duel archive QA passed: 10 slots, legacy import, campaign unlock, real signature -> fight, independent bests, win/loss/retry/leave, difficulty and checkpoint isolation.");
