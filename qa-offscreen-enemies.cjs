// World-bound cleanup, not camera culling. Exercises the shipped build, restart,
// containment and periodic-audit paths without mutating shared editing data.
const assert=require('node:assert/strict'),fs=require('node:fs');
// Read-only comparison against the v3.11.4 runtime; no checkout or
// changes to a shared profile/file are performed by this optional mode.
const baseline=process.argv.includes('--baseline'),readFile=fs.readFileSync;
if(baseline){
  const old=require('node:child_process').execFileSync('git',['show','76c0fee:game.js'],{encoding:'utf8',maxBuffer:8*1024*1024});
  fs.readFileSync=function(path,...args){return path==='game.js'?old:readFile.call(this,path,...args);};
}
let harness=fs.readFileSync('qa-cross-combo.cjs','utf8').split('function test(name,body)')[0];
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  `player,game,crossChain,keys,pressed,pointer,camera,WORLD_H,H,zones,
  removeInitiallyOffscreenEnemies,cullEnemiesOutsideVerticalView,enforceEnemyLockdowns,
  getZoneRemaining,getZoneIndexAt,saveCampaign,restoreAdminSpawnedEnemy,
  adminRemovedEnemyIds,persistAdminRemovedEnemies,
  setAdminRecords(records){adminSpawnedEnemyData=structuredClone(records);persistAdminSpawnedEnemies();},
  getAdminRecords(){return structuredClone(adminSpawnedEnemyData);},
  rebuild(difficulty){selectedDifficulty=difficulty;game.difficulty=difficulty;buildLevel();},`);
const {q,fixture,target}=new Function('require',harness+'\nreturn {q,fixture,target};')(require);
fs.readFileSync=readFile;
const results=[],spawnKey='moonlit-echo-admin-spawned-enemies-v1',saveKey='moonlit-echo-campaign-v1';
function test(name,run){try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
function clean(){
  fixture();q.adminRemovedEnemyIds.clear();q.persistAdminRemovedEnemies();q.setAdminRecords([]);
  Object.assign(q.player,{styleScore:17,burstCooldown:1.4,shotgunCharge:.7,airJumpAvailable:false,grounded:false});
  Object.assign(q.game,{kills:0,deaths:0,shake:0,bossDefeated:false,stageBossDefeated:false,bossReplay:null});
}
function rewards(){return {kills:q.game.kills,style:q.player.styleScore,burst:q.player.burstCooldown,
  charge:q.player.shotgunCharge,air:q.player.airJumpAvailable,hp:q.player.hp,
  pickups:JSON.stringify(q.pickups),defeated:[...q.game.defeatedBosses],bossDefeated:q.game.bossDefeated};}
function mob(y,extra={}){return target('drone',{x:500,originX:500,spawnX:500,y,spawnY:y,baseY:y,...extra});}
function outside(enemy){return !Number.isFinite(enemy.y)||enemy.y+enemy.h<=0||enemy.y>=q.WORLD_H;}
function record(id,y,extra={}){return {id:`admin-spawn:qa-offscreen:${id}`,type:'drone',x:q.zones[2].x+500,y,
  stageIndex:0,homeZoneIndex:2,range:180,...extra};}

for(const position of['above','top edge','bottom edge','below','nonfinite'])test(`initial cleanup removes ${position} normal mob with no rewards`,()=>{
  clean();const h=34,y=({'above':-h-30,'top edge':-h,'bottom edge':q.WORLD_H,'below':q.WORLD_H+40,nonfinite:NaN})[position];
  const e=mob(y),before=rewards();assert.equal(q.getZoneRemaining(0),1);
  const removed=q.removeInitiallyOffscreenEnemies();
  assert.equal(removed,1);assert(!q.enemies.includes(e));assert.equal(q.getZoneRemaining(0),0);
  assert.deepEqual(rewards(),before);assert(!e.countedKill);
});
test('partial vertical overlap and lower in-world placements survive regardless of camera',()=>{
  clean();q.camera.y=q.WORLD_H-q.H;q.camera.x=q.zones[3].x;
  const ground=target('runner',{x:500,originX:500});ground.y=-ground.h+1;
  const list=[ground,mob(-33,{placementWave:0}),mob(-33,{adminSpawned:true}),
    mob(-15,{placementWave:1}),mob(q.WORLD_H-.5),mob(920),mob(10),
    mob(500,{x:q.zones[35].x+500,originX:q.zones[35].x+500,homeZoneIndex:35})];
  const before=rewards();assert.equal(q.removeInitiallyOffscreenEnemies(),0);
  assert(list.every(e=>q.enemies.includes(e)&&e.alive));assert.deepEqual(rewards(),before);
});
test('authored ceiling-hovering drone with its permanent aiming center outside is not a valid spawn',()=>{
  clean();const e=mob(-33,{placementWave:1,adminSpawned:false}),before=rewards();
  assert(e.y+e.h>0,'one visible pixel alone does not make this permanent authored hover anchor playable');
  assert.equal(q.removeInitiallyOffscreenEnemies(),1);assert(!q.enemies.includes(e));assert.deepEqual(rewards(),before);
});
for(const difficulty of['chick','cadet','darkhorse','weapon'])test(`${difficulty} real build excludes two authored upper ghosts and retains every boss`,()=>{
  clean();q.rebuild(difficulty);
  assert(!q.enemies.some(e=>e.id==='4:drone:141828'),'post-ejection upper ghost must not block Act 5 region 03');
  assert(!q.enemies.some(e=>e.id==='3:drone:121288'),'above-world permanent hover anchor must not hide Act 4 region 06 drone');
  assert(q.enemies.filter(e=>e.type!=='boss'&&e.alive).every(e=>!outside(e)),'all authored normals start inside the vertical world');
  const expectedMobs=Math.round(448*({chick:.5,cadet:2/3,darkhorse:1,weapon:1}[difficulty]));
  assert.equal(q.enemies.filter(e=>e.type!=='boss'&&!e.adminSpawned&&e.alive).length,expectedMobs,'cleanup precedes the exact difficulty population subset');
  const bosses=q.enemies.filter(e=>e.type==='boss'&&!e.adminSpawned);
  assert.equal(bosses.length,10);assert.equal(new Set(bosses.map(e=>e.bossKind)).size,10);
  assert(bosses.every(e=>e.alive));assert.equal(q.game.totalEnemies,q.enemies.filter(e=>e.alive).length);
  const expected=q.enemies.filter(e=>e.alive&&!e.optionalTraversal&&q.getZoneIndexAt(e.originX)===34).length;
  assert.equal(q.getZoneRemaining(34),expected);assert(expected>0,'cleanup must not erase the entire future region');
  assert.equal(q.game.kills,0);assert.equal(q.game.defeatedBosses.size,0);
});
test('full build filters raw out-of-world admin spawns but leaves shared records byte-for-byte intact',()=>{
  clean();const records=[record('above',-300),record('below',q.WORLD_H+300),record('valid-lower',1000),record('partial-top',-10)];
  q.setAdminRecords(records);const stored=localStorage.getItem(spawnKey);q.rebuild('darkhorse');
  assert(!q.enemies.some(e=>e.id===records[0].id||e.id===records[1].id),'clamping must not turn invalid saved origins into new live enemies');
  for(const r of records.slice(2))assert(q.enemies.some(e=>e.id===r.id&&e.alive),`valid admin placement ${r.id} preserved`);
  assert.equal(localStorage.getItem(spawnKey),stored);assert.deepEqual(q.getAdminRecords(),records);
  assert.equal(q.game.totalEnemies,q.enemies.filter(e=>e.alive).length);assert.equal(q.game.kills,0);
});
test('explicit admin deletion tombstones still win over a valid stored spawn',()=>{
  clean();const r=record('removed',300);q.setAdminRecords([r]);q.adminRemovedEnemyIds.add(r.id);q.persistAdminRemovedEnemies();
  q.rebuild('darkhorse');assert(!q.enemies.some(e=>e.id===r.id&&e.alive));assert(q.adminRemovedEnemyIds.has(r.id));
  assert.equal(q.game.kills,0);
});
for(const method of['cullEnemiesOutsideVerticalView','enforceEnemyLockdowns'])for(const position of['above','below','nonfinite'])
test(`${method} silently retires ${position} normal mob rather than recovering or rewarding it`,()=>{
  clean();const y=position==='above'?-400:position==='below'?q.WORLD_H+400:NaN;
  const e=mob(y,{spawnY:350}),before=rewards();
  if(method==='cullEnemiesOutsideVerticalView')q[method](.5);else q[method]();
  assert(!e.alive||!q.enemies.includes(e));assert.equal(q.getZoneRemaining(0),0);assert(!e.countedKill);
  assert.deepEqual(rewards(),before,'environment cleanup cannot give score, cooldown, air jump, healing, loot or a boss clear');
});
for(const method of['cullEnemiesOutsideVerticalView','enforceEnemyLockdowns'])test(`${method} preserves camera-hidden valid and future enemies`,()=>{
  clean();q.camera.x=q.zones[20].x;q.camera.y=600;
  const hiddenTop=mob(40),hiddenBottom=mob(1000),future=mob(300,{x:q.zones[32].x+500,originX:q.zones[32].x+500,spawnX:q.zones[32].x+500,homeZoneIndex:32});
  if(method==='cullEnemiesOutsideVerticalView')q[method](.5);else q[method]();
  assert([hiddenTop,hiddenBottom,future].every(e=>e.alive&&q.enemies.includes(e)));
});
for(const method of['removeInitiallyOffscreenEnemies','cullEnemiesOutsideVerticalView','enforceEnemyLockdowns'])test(`${method} recovers an invalid boss without granting progression`,()=>{
  clean();q.rebuild('darkhorse');const e=q.enemies.find(e=>e.bossKind==='echo'),id=e.id;
  e.y=q.WORLD_H+400;const before=rewards();
  if(method==='cullEnemiesOutsideVerticalView')q[method](.5);else q[method]();
  assert(q.enemies.includes(e)&&e.alive&&e.id===id,'never remove a required boss as incidental garbage');
  assert(!outside(e),'recover the boss to a valid spawn');assert.deepEqual(rewards(),before);assert(!e.countedKill);
});
test('checkpoint restart cannot revive an invalid spawn and retains ordinary prior/future progress',()=>{
  clean();q.rebuild('darkhorse');
  const prior=q.enemies.find(e=>e.type!=='boss'&&q.getZoneIndexAt(e.originX)===1);
  const later=q.enemies.find(e=>e.type!=='boss'&&q.getZoneIndexAt(e.originX)===2);assert(prior&&later);
  Object.assign(prior,{alive:false,hp:0,countedKill:true});Object.assign(later,{alive:false,hp:0,countedKill:false});
  const z=q.zones[3],ghost=mob(-300,{x:z.x+500,originX:z.x+500,spawnX:z.x+500,homeZoneIndex:3,spawnY:-300,alive:false});
  q.player.respawnCheckpointIndex=2;q.game.kills=1;q.respawn();
  assert(!q.enemies.includes(ghost)||!ghost.alive,'bad original spawn must not resurrect on retry');
  assert(!prior.alive&&prior.countedKill,'past checkpoint victory stays cleared');assert(later.alive&&later.hp===later.maxHp);
  assert.equal(q.game.kills,1);assert(!ghost.countedKill);
  const saved=JSON.parse(localStorage.getItem(saveKey));assert(!saved.countedKillEnemyIds.includes(ghost.id));
});
test('falling out temporarily does not delete a valid original spawn on checkpoint retry',()=>{
  clean();const e=mob(q.WORLD_H+400,{spawnY:350});q.cullEnemiesOutsideVerticalView(.5);assert(!e.alive);
  q.respawn();assert(e.alive&&e.y===350&&e.hp===e.maxHp,'real combat resets normally at a valid authored spawn');
  assert.equal(q.game.kills,0);assert(!e.countedKill);
});
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);
for(const r of results.filter(r=>!r.ok))console.error(r.error);
console.log(`Offscreen enemy QA${baseline?' (v3.11.4 baseline 76c0fee)':''}: ${results.filter(r=>r.ok).length}/${results.length} passed`);
process.exitCode=Number(results.some(r=>!r.ok));
