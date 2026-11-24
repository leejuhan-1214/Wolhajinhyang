// Traverse the authored aerial forks with the real jump, slash, drone and collision rules.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const file of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__AIR_QA__={player,game,zones,stages,enemies,platforms,hazards,boostNodes,pickups,checkpoints,combatRooms,snowPatches,
  keys,pressed,bullets,camera,updatePlayer,updateEnemy,startAttack,damageEnemy,getZoneRemaining,getZoneIndexAt,normalizeEnemyHomeZone,
  clearGameplayInput,rebuildPlatformSpatialIndex,removeInitiallyOffscreenEnemies,applyAdminRemovedEnemyData,adminRemovedEnemyIds,persistAdminRemovedEnemies,
  rebuild(difficulty){selectedDifficulty=difficulty;game.difficulty=difficulty;buildLevel();},
  hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;}
};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-air-route-test.js'});
const q=window.__AIR_QA__,original=structuredClone(q.player),results=[];
function fixture(zoneIndex,difficulty='darkhorse'){
  q.adminRemovedEnemyIds.clear();q.persistAdminRemovedEnemies();q.rebuild(difficulty);
  const route=q.zones[zoneIndex].aerialShortcut;
  assert(route,'authored aerial shortcut must exist');
  for(const enemy of q.enemies)if(!route.droneIds.includes(enemy.id))enemy.alive=false;
  Object.assign(q.player,structuredClone(original),{x:route.launchX+route.launchWidth-60,y:route.launchY-original.h,
    vx:440,vy:0,grounded:true,facing:1,hp:5,maxHp:5,invincible:0,attackTimer:0,attackCooldown:0,airJumpAvailable:true,
    queuedAction:null,squash:0,motionPose:null});
  Object.assign(q.game,{mode:'playing',difficulty,adminMode:false,adminCadetMode:false,tutorialActive:false,tutorialCompleted:true,
    stage:q.zones[zoneIndex].stageIndex,zone:zoneIndex,time:0,cutscene:null,story:null,storyQueue:[],freeze:0,
    defeatedBosses:new Set(q.stages.flatMap(stage=>[stage.midBossKind,stage.bossKind])),controlsReversed:false,screenFlipActive:false});
  q.clearGameplayInput();q.hidePanels();q.keys.add('KeyD');q.keys.add('Space');
  q.camera.x=q.player.x-200;q.camera.y=0;
  return {route,drones:q.enemies.filter(e=>route.droneIds.includes(e.id))};
}
function traverse(zoneIndex,{attacks=true,maxHits=2,difficulty='darkhorse',dt=1/120}={}){
  const {route,drones}=fixture(zoneIndex,difficulty);
  let initialDouble=false,refreshes=0,refreshJump=false,landed=false,lowerLanding=false,frames=0;
  const events=[];
  for(;frames<720;frames++){
    const time=frames*dt;
    if(frames===0||(!initialDouble&&time>=.2)||refreshJump){
      q.pressed.add('Space');if(frames>0&&!initialDouble)initialDouble=true;refreshJump=false;
    }
    if(attacks&&refreshes<maxHits&&q.player.attackCooldown<=0&&q.player.attackTimer<=0){
      const target=drones.find(e=>e.alive&&e.x+e.w/2-(q.player.x+q.player.w/2)>45&&e.x+e.w/2-(q.player.x+q.player.w/2)<145
        &&Math.abs(e.y+e.h/2-(q.player.y+q.player.h/2))<42);
      if(target)q.startAttack({x:1,y:0});
    }
    const airBefore=q.player.airJumpAvailable,aliveBefore=drones.filter(e=>e.alive).length;
    q.game.time+=dt;q.updatePlayer(dt);
    for(const drone of drones)if(drone.alive)q.updateEnemy(drone,dt);
    q.pressed.clear();
    if(!airBefore&&q.player.airJumpAvailable&&drones.filter(e=>e.alive).length<aliveBefore){
      refreshes++;refreshJump=true;events.push({time,x:Math.round(q.player.x-route.launchX),y:Math.round(q.player.y),kind:'refresh'});
    }
    if(frames>3&&q.player.grounded){
      landed=Math.abs(q.player.y+q.player.h-route.landingY)<1&&q.player.x+q.player.w>route.landingX;
      lowerLanding=q.player.y+q.player.h>route.landingY+20;
      if(landed||lowerLanding)break;
    }
  }
  return {route,landed,lowerLanding,refreshes,hp:q.player.hp,frames,x:Math.round(q.player.x-route.launchX),y:Math.round(q.player.y),events};
}
function continueLowerRoute(route){
  let jumps=0;
  for(let frame=0;frame<1440;frame++){
    // This starts exactly where the missed aerial attempt landed; no teleport,
    // renewed drone, extra jump token or invulnerability is supplied.
    if(q.player.grounded||(!q.player.grounded&&q.player.airJumpAvailable&&q.player.vy>=-60)){
      q.pressed.add('Space');jumps++;
    }
    q.game.time+=1/120;q.updatePlayer(1/120);q.pressed.clear();
    if(q.player.x>route.landingX+route.landingWidth+15&&q.player.grounded){
      assert.equal(q.player.hp,5,'continuing along the lower route stays safe');
      return {frames:frame,jumps};
    }
  }
  assert.fail(`safe lower path must remain traversable without drone attacks: x=${q.player.x},y=${q.player.y}`);
}
for(const zone of[5,43]){
  for(const dt of[1/60,1/120]){
    const result=traverse(zone,{dt});
    assert(result.landed,`two actual aerial slash refreshes must reach the shortcut landing: ${JSON.stringify(result)}`);
    assert.equal(result.refreshes,2,'the upper traversal must actually consume and restore two aerial jumps');
    assert.equal(result.hp,5,'successful optional traversal must not require tanking damage');
    results.push({zone,dt,refreshes:result.refreshes,frames:result.frames});
  }
  const missed=traverse(zone,{attacks:false});
  assert(!missed.landed&&missed.lowerLanding,'ordinary double jump alone must fall safely to the lower route');
  assert.equal(missed.hp,5,'a missed shortcut must not land in a trap or death pit');
  continueLowerRoute(missed.route);
  const oneHit=traverse(zone,{maxHits:1});
  assert(!oneHit.landed&&oneHit.lowerLanding&&oneHit.refreshes===1,'one refresh cannot replace the intended two-drone upper crossing');
  continueLowerRoute(oneHit.route);
}
for(const difficulty of['chick','cadet','darkhorse','weapon']){
  fixture(5,difficulty);
  const anchors=q.enemies.filter(e=>e.optionalTraversal&&e.alive);
  assert.equal(anchors.length,2,'both route drones survive difficulty pruning');
  assert(anchors.every(e=>e.hp===1&&e.y>0&&e.y+e.h<720),'route drones are visible one-hit aerial targets');
  assert.equal(q.getZoneRemaining(5),0,'optional drones cannot hold the mandatory zone seal');
  const required=q.enemies.find(e=>e.homeZoneIndex===5&&!e.optionalTraversal);
  assert(required,'route keeps required combat at its entrance/exit');required.alive=true;
  assert.equal(q.getZoneRemaining(5),1,'a living required enemy must still hold the seal');
  for(const drone of anchors)assert.equal(q.normalizeEnemyHomeZone(drone),5,'anchors stay inside their own zone');
  const deleted=anchors[0];q.adminRemovedEnemyIds.add(deleted.id);q.applyAdminRemovedEnemyData();
  assert(!deleted.alive&&deleted.hp===0,'admin deletion overrides route anchor retention');
  q.persistAdminRemovedEnemies();q.rebuild(difficulty);
  const rebuilt=q.enemies.find(e=>e.id===deleted.id);
  assert(rebuilt&&!rebuilt.alive,'deleted route drone cannot return when the map is rebuilt');
}
console.log(JSON.stringify({aerialShortcutTraversalPassed:true,routes:results},null,2));
