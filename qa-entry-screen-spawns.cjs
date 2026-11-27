// Initial placements use each zone's standard checkpoint view, never the live
// camera. Run --baseline to reproduce against the fixed v3.11.5 release.
const assert=require('node:assert/strict'),fs=require('node:fs');
const baseline=process.argv.includes('--baseline'),readFile=fs.readFileSync;
if(baseline){
  const old=require('node:child_process').execFileSync('git',['show','04dbcf8:game.js'],{encoding:'utf8',maxBuffer:8*1024*1024});
  fs.readFileSync=function(path,...args){return path==='game.js'?old:readFile.call(this,path,...args);};
}
let harness=fs.readFileSync('qa-cross-combo.cjs','utf8').split('function test(name,body)')[0];
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  `player,game,crossChain,keys,pressed,pointer,camera,WORLD_H,H,W,zones,
  getCheckpointRespawnPosition,ejectEnemyFromPlatforms,getZoneIndexAt,getZoneRemaining,
  cullEnemiesOutsideVerticalView,enforceEnemyLockdowns,adminRemovedEnemyIds,persistAdminRemovedEnemies,
  pruneInitialEntryScreenEnemies:typeof pruneInitialEntryScreenEnemies==='function'?pruneInitialEntryScreenEnemies:()=>0,
  setAdminRecords(records){adminSpawnedEnemyData=structuredClone(records);persistAdminSpawnedEnemies();},
  getAdminRecords(){return structuredClone(adminSpawnedEnemyData);},
  rebuild(difficulty){selectedDifficulty=difficulty;game.difficulty=difficulty;buildLevel();},`);
const {q,fixture,target}=new Function('require',harness+'\nreturn {q,fixture,target};')(require);
fs.readFileSync=readFile;
const results=[],types=['runner','gunner','machinegun','piercer','mortar','turret','mortarTurret','drone','shield'];
const originalCheckpoint=structuredClone(q.checkpoints[0]);
function test(name,run){try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
function clean(){
  fixture();q.adminRemovedEnemyIds.clear();q.persistAdminRemovedEnemies();q.setAdminRecords([]);
  Object.assign(q.game,{kills:0,deaths:0,bossReplay:null});
  Object.assign(q.player,{styleScore:17,burstCooldown:1.4,shotgunCharge:.7,airJumpAvailable:false});
}
function independentView(zoneIndex){
  const checkpoint=q.checkpoints[zoneIndex];assert(checkpoint,`checkpoint ${zoneIndex}`);
  const respawn=q.getCheckpointRespawnPosition(checkpoint);
  const clampY=y=>Math.max(0,Math.min(q.WORLD_H-q.H,y));
  const first=zoneIndex===0?0:clampY(respawn.y-420);
  const normal=clampY(respawn.y+q.player.h/2-q.H*.58);
  return {top:Math.max(first,normal),bottom:Math.min(first,normal)+q.H,first,normal};
}
function whollyWithin(enemy,view){return Number.isFinite(enemy.y)&&enemy.y>=view.top-1e-8&&enemy.y+enemy.h<=view.bottom+1e-8;}
function resolvedSpawn(enemy){const copy={...enemy,x:enemy.spawnX,y:enemy.spawnY};q.ejectEnemyFromPlatforms(copy);return copy;}
function rewards(){return JSON.stringify({kills:q.game.kills,hp:q.player.hp,style:q.player.styleScore,
  burst:q.player.burstCooldown,charge:q.player.shotgunCharge,air:q.player.airJumpAvailable,pickups:q.pickups,
  bosses:[...q.game.defeatedBosses]});}
function synthetic(zoneIndex=1){
  clean();q.checkpoints.length=0;q.platforms.length=0;
  for(const zone of q.zones){
    q.checkpoints.push({...structuredClone(originalCheckpoint),x:zone.x+120,y:900-88,w:32,h:88,active:false});
    q.platforms.push({x:zone.x,y:900,w:400,h:q.WORLD_H-900,kind:'ground'});
  }
  q.rebuildPlatformSpatialIndex();return {zone:q.zones[zoneIndex],view:independentView(zoneIndex)};
}
function place(type,zone,y,extra={}){
  const x=zone.x+1500;
  return target(type,{x,y,originX:x,originY:y,spawnX:x,spawnY:y,baseY:y,
    homeZoneIndex:zone.globalIndex,stageIndex:zone.stageIndex,placementWave:0,...extra});
}

for(const type of types)test(`${type}: exact top/bottom fit survives; any initial edge overlap is omitted`,()=>{
  for(const position of['above','top overlap','top fit','inside','bottom fit','bottom overlap','below']){
    const {zone,view}=synthetic(),e=place(type,zone,view.top+100);
    const y=position==='above'?view.top-e.h-1:position==='top overlap'?view.top-1:position==='top fit'?view.top:
      position==='inside'?view.top+100:position==='bottom fit'?view.bottom-e.h:position==='bottom overlap'?view.bottom-e.h+1:view.bottom+1;
    Object.assign(e,{y,spawnY:y,baseY:y});const keep=['top fit','inside','bottom fit'].includes(position),before=rewards();
    q.pruneInitialEntryScreenEnemies();assert.equal(q.enemies.includes(e),keep,`${type} ${position} in [${view.top},${view.bottom}]`);
    assert.equal(rewards(),before,'initial omission is not a combat kill/reward');assert(!e.countedKill);
  }
});
test('all normal classes are omitted when only their first ejected bounds cross the top edge',()=>{
  for(const type of types){
    const {zone,view}=synthetic(),e=place(type,zone,view.top+5);
    q.platforms.push({x:e.x-10,y:view.top+15,w:e.w+20,h:e.h+20,kind:'factory'});q.rebuildPlatformSpatialIndex();
    assert(whollyWithin(e,view));assert(!whollyWithin(resolvedSpawn(e),view),'actual first platform ejection crosses top');
    q.pruneInitialEntryScreenEnemies();assert(!q.enemies.includes(e),type);
  }
});
test('the intersection excludes placements visible only in checkpoint view or only in resting follow view',()=>{
  for(const only of['checkpoint','follow']){
    const {zone,view}=synthetic();assert(view.normal>view.first,'fixture distinguishes the two real entry cameras');
    const e=place('gunner',zone,view.first);
    if(only==='follow')e.y=e.spawnY=view.first+q.H-e.h+1;
    const firstFit=e.y>=view.first&&e.y+e.h<=view.first+q.H;
    const followFit=e.y>=view.normal&&e.y+e.h<=view.normal+q.H;
    assert.equal(firstFit,only==='checkpoint');assert.equal(followFit,only==='follow');
    q.pruneInitialEntryScreenEnemies();assert(!q.enemies.includes(e),only);
  }
});
test('an invalid raw spawn is not retained just because ejection would repair it into view',()=>{
  for(const type of types){
    const {zone,view}=synthetic(),e=place(type,zone,0);e.y=e.spawnY=e.baseY=view.bottom-e.h+1;
    q.platforms.push({x:e.x-10,y:view.bottom-20,w:e.w+20,h:50,kind:'factory'});q.rebuildPlatformSpatialIndex();
    assert(!whollyWithin(e,view));assert(whollyWithin(resolvedSpawn(e),view),'ejection would repair the raw overlap');
    q.pruneInitialEntryScreenEnemies();assert(!q.enemies.includes(e),type);
  }
});
test('a completely in-view platform ejection is not an excuse to delete a valid enemy',()=>{
  for(const type of types){
    const {zone,view}=synthetic(),e=place(type,zone,view.top+130);
    q.platforms.push({x:e.x-10,y:view.top+150,w:e.w+20,h:30,kind:'factory'});q.rebuildPlatformSpatialIndex();
    assert(whollyWithin(e,view));assert(whollyWithin(resolvedSpawn(e),view));
    q.pruneInitialEntryScreenEnemies();assert(q.enemies.includes(e),type);
  }
});
test('all zones use their own entry view and do not cull horizontal or future-zone placements',()=>{
  synthetic();q.camera.x=q.zones[20].x;q.camera.y=0;const list=[];
  for(const zone of q.zones){
    const view=independentView(zone.globalIndex);
    list.push(place('gunner',zone,view.top+100,{x:zone.end-100,originX:zone.end-100,spawnX:zone.end-100}));
  }
  q.pruneInitialEntryScreenEnemies();assert.equal(q.enemies.length,q.zones.length);
  assert(list.every(e=>q.enemies.includes(e)&&e.alive));
});
let hardIds=null;const population={};
for(const difficulty of['darkhorse','chick','cadet','weapon'])test(`${difficulty}: actual full build obeys raw/resolved view bounds in all 40 zones`,()=>{
  clean();q.rebuild(difficulty);const normals=q.enemies.filter(e=>e.type!=='boss'&&e.alive);
  const checkedTypes=new Set();
  for(const e of normals){
    const zoneIndex=q.getZoneIndexAt(e.spawnX),view=independentView(zoneIndex),raw={...e,y:e.spawnY};
    assert(whollyWithin(raw,view),`${e.id} raw y=${e.spawnY} h=${e.h} outside zone ${zoneIndex} [${view.top},${view.bottom}]`);
    const resolved=resolvedSpawn(e);assert(whollyWithin(resolved,view),`${e.id} resolved y=${resolved.y} h=${e.h} outside zone ${zoneIndex}`);
    checkedTypes.add(e.type);
  }
  assert.deepEqual([...checkedTypes].sort(),types.slice().sort(),'every ordinary role remains represented');
  const ids=new Set(normals.map(e=>e.id));if(difficulty==='darkhorse')hardIds=ids;
  assert(hardIds&&[...ids].every(id=>hardIds.has(id)),'difficulty selection is a subset of the valid hard roster');
  assert.equal(normals.length,Math.round(hardIds.size*({chick:.5,cadet:2/3,darkhorse:1,weapon:1}[difficulty])));
  const bosses=q.enemies.filter(e=>e.type==='boss'&&!e.adminSpawned&&e.alive);assert.equal(bosses.length,10);
  assert.equal(new Set(bosses.map(e=>e.bossKind)).size,10);assert.equal(q.game.totalEnemies,q.enemies.filter(e=>e.alive).length);
  for(const zone of q.zones){
    const expected=q.enemies.filter(e=>e.alive&&!e.optionalTraversal&&q.getZoneIndexAt(e.originX)===zone.globalIndex).length;
    assert.equal(q.getZoneRemaining(zone.globalIndex),expected);
  }
  for(const zoneIndex of[2,21]){
    const route=q.zones[zoneIndex].aerialShortcut;assert(route);assert.equal(route.droneIds.length,2);
    assert(route.droneIds.every(id=>q.enemies.some(e=>e.id===id&&e.alive&&e.optionalTraversal)),'authored aerial route drones remain playable');
  }
  assert.equal(q.game.kills,0);population[difficulty]=normals.length;
});
test('raw invalid administrator placements are omitted without editing the shared profile',()=>{
  clean();q.rebuild('darkhorse');const zone=q.zones[2],view=independentView(2),x=zone.x+1500;
  const records=[{id:'admin-spawn:entry-qa:outside',type:'gunner',x,y:view.top-1,stageIndex:0,homeZoneIndex:2,range:100},
    {id:'admin-spawn:entry-qa:inside',type:'gunner',x,y:view.top+100,stageIndex:0,homeZoneIndex:2,range:100}];
  q.setAdminRecords(records);const stored=localStorage.getItem('moonlit-echo-admin-spawned-enemies-v1');q.rebuild('darkhorse');
  assert(!q.enemies.some(e=>e.id===records[0].id));assert(q.enemies.some(e=>e.id===records[1].id&&e.alive));
  assert.equal(localStorage.getItem('moonlit-echo-admin-spawned-enemies-v1'),stored);assert.deepEqual(q.getAdminRecords(),records);
});
test('required bosses are never silently omitted by the initial viewport cleanup',()=>{
  clean();q.rebuild('darkhorse');const bosses=q.enemies.filter(e=>e.type==='boss');
  for(const e of bosses){const view=independentView(e.homeZoneIndex);e.y=e.spawnY=view.top-1;}
  const before=rewards();q.pruneInitialEntryScreenEnemies();assert(bosses.every(e=>q.enemies.includes(e)&&e.alive));
  assert.equal(rewards(),before);assert.equal(q.game.defeatedBosses.size,0);
});
test('moving away from the initial viewport during play never becomes runtime camera deletion',()=>{
  const {zone,view}=synthetic(),e=place('gunner',zone,view.top+100);q.pruneInitialEntryScreenEnemies();assert(q.enemies.includes(e));
  for(const y of[view.top-80,view.bottom+20]){
    e.y=y;assert(e.y>=0&&e.y+e.h<q.WORLD_H,'runtime fixture remains inside world');
    q.camera.y=y===view.top-80?q.WORLD_H-q.H:0;q.camera.x=q.zones[30].x;
    q.cullEnemiesOutsideVerticalView(.5);q.enforceEnemyLockdowns();assert(e.alive&&q.enemies.includes(e));
  }
});
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);
for(const r of results.filter(r=>!r.ok))console.error(r.error);
console.log(JSON.stringify({entryScreenPopulation:population}));
console.log(`Entry screen spawn QA${baseline?' (v3.11.5 baseline 04dbcf8)':''}: ${results.filter(r=>r.ok).length}/${results.length} passed`);
process.exitCode=Number(results.some(r=>!r.ok));
