// Native AI simulation: no mock attack methods and no shipped debug surface.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const file of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__HOSTILE_QA__={player,game,enemies,bullets,platforms,hazards,pickups,boostNodes,combatRooms,snowPatches,checkpoints,zones,stages,camera,WORLD_W,STAGE_COMBAT_PRESSURE,difficultySettings,
 getActiveEnemies,updateEnemy,updateBullets,tagEnemyProjectilesCreatedSince,normalizeEnemyHomeZone,applyEnemyHitStun,
 enforceEnemyLockdowns,rebuildPlatformSpatialIndex,clearGameplayInput,
 hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-hostile-ai-test.js'});
const q=window.__HOSTILE_QA__,defaults=structuredClone(q.player),templates=structuredClone(q.enemies),terrain=structuredClone(q.platforms);
const roles=['runner','shield','gunner','machinegun','piercer','mortar','turret','mortarTurret','drone'];
const ranged=roles.filter(role=>!['runner','shield'].includes(role));
const results=[],evidence=[];
function fixture(role,options={}){
  for(const list of [q.enemies,q.bullets,q.platforms,q.hazards,q.pickups,q.boostNodes,q.combatRooms,q.snowPatches,q.checkpoints])list.length=0;
  const e=structuredClone(templates.find(enemy=>enemy.type===role&&!enemy.optionalTraversal));assert(e,`missing normal ${role}`);
  const zone=options.authored?e.homeZoneIndex:1;
  if(options.authored)q.platforms.push(...structuredClone(terrain));
  else {
    q.platforms.push({x:0,y:650,w:q.WORLD_W,h:800,kind:'ground'});
    e.x=q.zones[zone].x+1500;e.y=role==='drone'?440:650-e.h;e.originX=e.spawnX=e.x;e.spawnY=e.baseY=e.y;
  }
  Object.assign(e,{alive:true,hp:100,maxHp:100,vx:0,vy:0,grounded:role!=='drone',cooldown:0,windup:0,hitStun:0,hurt:0,burnTimer:0,
    rushTimer:0,rushDirection:0,burstRemaining:0,burstInterval:0,homeZoneIndex:zone,stageIndex:q.zones[zone].stageIndex,optionalTraversal:false});
  q.enemies.push(e);q.rebuildPlatformSpatialIndex();
  const side=options.side||1,dx=options.dx??(role==='shield'?65:220),dy=options.dy??0;
  Object.assign(q.player,structuredClone(defaults),{x:e.x+e.w/2+side*dx-defaults.w/2,y:e.y+e.h/2+dy-defaults.h/2,vx:0,vy:0,hp:100,maxHp:100,invincible:0,attackTimer:0,attackCooldown:0,burstTimer:0,recoilTimer:0,grounded:true});
  if(options.authored)q.player.x=Math.max(q.zones[zone].x+70,Math.min(q.player.x,q.zones[zone].end-70-q.player.w));
  Object.assign(q.game,{mode:'playing',difficulty:'darkhorse',adminMode:false,adminCadetMode:false,bossReplay:null,tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],stage:e.stageIndex,zone,time:0,freeze:0});
  q.camera.x=e.x-300;q.camera.y=0;q.clearGameplayInput();q.hidePanels();
  return e;
}
function tick(dt=1/60){
  q.game.time+=dt;q.player.invincible=Math.max(0,q.player.invincible-dt);
  const active=q.getActiveEnemies(),created=[];
  q.enforceEnemyLockdowns(active);
  for(const e of active){const before=q.bullets.length;q.updateEnemy(e,dt);q.tagEnemyProjectilesCreatedSince(before,q.normalizeEnemyHomeZone(e));created.push(...q.bullets.slice(before).map(b=>({...b})));}
  q.updateBullets(dt,active);
  for(const e of active)assert([e.x,e.y,e.vx,e.vy,e.cooldown].every(Number.isFinite),`${e.type} finite state`);
  for(const b of q.bullets)assert([b.x,b.y,b.vx,b.vy].every(Number.isFinite),`${b.kind} finite projectile`);
  return created;
}
function simulate(seconds=6,dt=1/60){const shots=[];for(let frame=0;frame<Math.ceil(seconds/dt);frame++)shots.push(...tick(dt));return shots;}
function test(name,body){try{body();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.stack});}}

for(const role of ranged)test(`${role} attacks from both sides on a clear lane`,()=>{
  for(const side of [-1,1]){
    const e=fixture(role,{side}),shots=simulate(5);assert(shots.length>0,`${role} should shoot`);
    assert(shots.every(b=>b.enemy&&b.ownerZone===e.homeZoneIndex));
    evidence.push({role,side,shots:shots.length,hpLost:100-q.player.hp});
  }
});
for(const role of ['runner','shield'])test(`${role} can damage a player on both sides`,()=>{
  for(const side of [-1,1]){fixture(role,{side});simulate(6);assert(q.player.hp<100,`${role} melee side ${side}`);evidence.push({role,side,hpLost:100-q.player.hp});}
});
for(const role of ranged)test(`${role} in the current zone remains active outside the camera`,()=>{
  const e=fixture(role,{dy:role==='drone'?250:390,dx:150});q.camera.x=e.x+2400;q.camera.y=700;
  assert(q.getActiveEnemies().includes(e));assert(simulate(5).length>0,`${role} vertical/offscreen attack`);assert(e.alive);
});
test('stationary turret makes exactly five rounds on first release',()=>{
  fixture('turret');let first=[];for(let frame=0;frame<120&&!first.length;frame++)first=tick();assert.equal(first.length,5);assert(first.every(b=>b.kind==='turret-row'&&b.piercePlatforms));
});
test('machinegun releases a four-shot burst, not just its windup',()=>{
  const e=fixture('machinegun');const shots=simulate(1.2);assert.equal(shots.length,4);assert.equal(e.burstRemaining,0);
});
test('mortar turret creates exactly three terrain-colliding shells',()=>{
  fixture('mortarTurret');let first=[];for(let frame=0;frame<120&&!first.length;frame++)first=tick();assert.equal(first.length,3);assert(first.every(b=>b.kind==='mortar'&&b.terrainCollision));
});
test('charger enters a real rush in both directions',()=>{
  for(const side of [-1,1]){
    const e=fixture('runner',{side,dx:300});let charged=false,moved=false;
    const expectedSpeed=(365+e.stageIndex*18)*q.difficultySettings[q.game.difficulty].enemySpeed*q.STAGE_COMBAT_PRESSURE[e.stageIndex];
    for(let frame=0;frame<120;frame++){tick();charged||=e.rushTimer>0;moved||=e.rushTimer>0&&Math.sign(e.vx)===side&&Math.abs(e.vx)>=expectedSpeed-.001;}
    assert(charged&&moved,`rush side ${side}`);
  }
});
for(const role of roles)test(`${role} resumes after hit stun ends`,()=>{
  const e=fixture(role);q.applyEnemyHitStun(e,.4);const before=q.player.hp;const early=simulate(.2);assert.equal(early.length,0);assert.equal(q.player.hp,before);
  const shots=simulate(6);if(ranged.includes(role))assert(shots.length>0);else assert(q.player.hp<before);
});
for(const role of ranged)test(`${role} authored placement can start an attack`,()=>{
  const e=fixture(role,{authored:true,dx:220});assert(q.getActiveEnemies().includes(e));assert(simulate(4).length>0);
});
test('adjacent-zone enemies stay inactive even when nearby and visible',()=>{
  const e=fixture('turret'),next=q.zones[e.homeZoneIndex+1];q.player.x=next.x+20;assert(!q.getActiveEnemies().includes(e));assert.equal(simulate(4).length,0);
});
test('projectiles owned by the previous zone cannot hit after leaving it',()=>{
  const e=fixture('gunner'),next=q.zones[e.homeZoneIndex+1];q.player.x=next.x+20;
  q.bullets.push({x:q.player.x,y:q.player.y,w:12,h:12,vx:0,vy:0,life:2,enemy:true,kind:'standard',damage:1,ownerZone:e.homeZoneIndex});
  const hp=q.player.hp;tick();assert.equal(q.player.hp,hp);assert.equal(q.bullets.length,0);
});
test('administrator mode suppresses attack while preserving enemy existence',()=>{
  const e=fixture('machinegun');q.game.adminMode=true;assert.equal(simulate(3).length,0);assert(e.alive);q.game.adminMode=false;assert(simulate(4).length>0);
});
test('30 and 120 FPS both release ranged attacks',()=>{
  for(const dt of [1/30,1/120])for(const role of ranged){fixture(role);assert(simulate(4,dt).length>0,`${role} dt ${dt}`);}
});
const failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);for(const r of failed)console.error(r.error);
console.log(JSON.stringify({attackEvidence:evidence}));console.log(`Hostile AI QA: ${results.length-failed.length}/${results.length} passed`);process.exitCode=failed.length?1:0;
module.exports={q,fixture,tick,simulate};
