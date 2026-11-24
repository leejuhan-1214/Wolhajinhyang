// Real route anchors, projectile collision and aerial traversal; no native dependencies.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const file of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__ROUTE_COMBAT_QA__={player,game,zones,stages,enemies,platforms,bullets,keys,pressed,camera,
 updatePlayer,updateEnemy,updateBullets,startAttack,getZoneRemaining,getActiveEnemies,normalizeEnemyHomeZone,
 tagEnemyProjectilesCreatedSince,clearGameplayInput,rebuildPlatformSpatialIndex,adminRemovedEnemyIds,persistAdminRemovedEnemies,
 rebuild(difficulty){selectedDifficulty=difficulty;game.difficulty=difficulty;buildLevel();},
 hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-route-combat-test.js'});
const q=window.__ROUTE_COMBAT_QA__,original=structuredClone(q.player),results=[],evidence=[];
const modes=['chick','cadet','darkhorse','weapon'];
function fixture(zoneIndex=5,difficulty='darkhorse'){
  q.adminRemovedEnemyIds.clear();q.persistAdminRemovedEnemies();q.rebuild(difficulty);
  const route=q.zones[zoneIndex].aerialShortcut;assert(route,'authored route exists');
  const drones=q.enemies.filter(e=>route.droneIds.includes(e.id));assert.equal(drones.length,2);
  for(const enemy of q.enemies)enemy.alive=drones.includes(enemy);
  Object.assign(q.player,structuredClone(original),{hp:100,maxHp:100,invincible:0,attackTimer:0,attackCooldown:0,
    queuedAction:null,grounded:false,vx:0,vy:0,motionPose:null,airJumpAvailable:true,burstTimer:0});
  Object.assign(q.game,{mode:'playing',difficulty,adminMode:false,adminCadetMode:false,bossReplay:null,
    tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],time:0,freeze:0,
    stage:q.zones[zoneIndex].stageIndex,zone:zoneIndex,controlsReversed:false,screenFlipActive:false,
    defeatedBosses:new Set(q.stages.flatMap(s=>[s.midBossKind,s.bossKind]))});
  q.clearGameplayInput();q.hidePanels();q.bullets.length=0;q.camera.x=drones[0].x-250;q.camera.y=0;
  return {route,drones};
}
function positionNear(enemy,dx=220,dy=0){
  q.player.x=enemy.x+enemy.w/2+dx-q.player.w/2;
  q.player.y=enemy.y+enemy.h*.38+dy-q.player.h/2;
}
function tick(drones,dt=1/60,{playerPhysics=false}={}){
  q.game.time+=dt;q.player.invincible=Math.max(0,q.player.invincible-dt);
  if(playerPhysics)q.updatePlayer(dt);
  const created=[];
  for(const drone of drones){
    if(!drone.alive)continue;
    const before=q.bullets.length;q.updateEnemy(drone,dt);
    q.tagEnemyProjectilesCreatedSince(before,q.normalizeEnemyHomeZone(drone));
    created.push(...q.bullets.slice(before).map(b=>({...b})));
  }
  q.updateBullets(dt,drones.filter(e=>e.alive));
  q.pressed.clear();
  return created;
}
function simulate(drones,seconds,dt=1/60){
  const shots=[];
  for(let frame=0;frame<Math.ceil(seconds/dt);frame++)shots.push(...tick(drones,dt));
  return shots;
}
function test(name,run){try{run();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.stack});}}

for(const zone of [5,43])for(const difficulty of modes)test(`both anchors attack on route ${zone}, ${difficulty}`,()=>{
  for(const index of [0,1]){
    const {drones}=fixture(zone,difficulty),enemy=drones[index];
    drones[1-index].alive=false;positionNear(enemy,index? -220:220);
    assert.equal(enemy.hp,1);assert.equal(q.getZoneRemaining(zone),0,'optional anchors never hold the seal');
    const x=enemy.originX,baseY=enemy.baseY,hp=q.player.hp;
    let warningAt=null,firstShotAt=null;const shots=[];
    for(let frame=0;frame<480;frame++){
      const created=tick([enemy]);shots.push(...created);
      if(enemy.windup>0&&warningAt===null)warningAt=q.game.time;
      if(created.length&&firstShotAt===null)firstShotAt=q.game.time;
      assert.equal(enemy.x,x,'jump anchor stays horizontally fixed');
      assert(Math.abs(enemy.y-baseY)<=6.001,'jump anchor retains its small predictable bob');
      assert.equal(enemy.hp,1,'firing must not toughen the one-hit jump anchor');
    }
    assert(shots.length>=1&&shots.length<=2,'single low-frequency shots, not a burst');
    assert(firstShotAt-warningAt>=(difficulty==='chick'?1.08:.93),'full warning precedes release');
    assert(q.player.hp<hp,'real projectile collision damages an idle upper-route player');
    assert(shots.every(b=>b.kind==='standard'&&!b.piercePlatforms&&b.ownerZone===zone&&b.ownerId===enemy.id));
    evidence.push({zone,difficulty,anchor:index+1,shots:shots.length,warning:+(firstShotAt-warningAt).toFixed(3),hpLost:hp-q.player.hp});
  }
});

test('safe lower route never acquires an aerial target in any difficulty',()=>{
  for(const zone of [5,43])for(const difficulty of modes){
    const {route,drones}=fixture(zone,difficulty);positionNear(drones[0],140);
    q.player.y=route.floorY-q.player.h;
    const hp=q.player.hp;assert.equal(simulate(drones,9).length,0);assert.equal(q.player.hp,hp);
    assert(drones.every(e=>e.windup===0&&e.hp===1));
  }
});

test('opaque terrain blocks acquisition, hidden terrain does not',()=>{
  const {drones}=fixture(),enemy=drones[0];drones[1].alive=false;positionNear(enemy);
  const wall={x:enemy.x+enemy.w/2+100,y:enemy.baseY-70,w:28,h:140,kind:'test'};
  q.platforms.push(wall);q.rebuildPlatformSpatialIndex();
  assert.equal(simulate([enemy],5).length,0);assert.equal(enemy.windup,0);
  wall.hidden=true;q.rebuildPlatformSpatialIndex();assert(simulate([enemy],4).length>0);
});

test('live terrain blocks an already released ordinary projectile',()=>{
  const {drones}=fixture(),enemy=drones[0];drones[1].alive=false;positionNear(enemy,320);
  let shot=[];for(let frame=0;frame<240&&!shot.length;frame++)shot=tick([enemy]);
  assert.equal(shot.length,1);const hp=q.player.hp;
  q.platforms.push({x:enemy.x+enemy.w/2+120,y:enemy.baseY-70,w:28,h:140,kind:'test'});
  q.rebuildPlatformSpatialIndex();simulate([enemy],1.8);
  assert.equal(q.player.hp,hp,'the new shot must not penetrate a wall');assert.equal(q.bullets.length,0);
});

for(const state of ['administrator','cutscene','paused','wrong-zone'])test(`${state} blocks direct route-drone updates`,()=>{
  const {drones}=fixture(),enemy=drones[0];positionNear(enemy);
  enemy.cooldown=0;enemy.windup=.1;enemy.targetX=q.player.x+q.player.w/2;enemy.targetY=q.player.y+q.player.h/2;
  if(state==='administrator')q.game.adminMode=true;
  if(state==='cutscene')q.game.cutscene={id:'test'};
  if(state==='paused')q.game.mode='paused';
  if(state==='wrong-zone')q.player.x=q.zones[6].x+40;
  assert.equal(simulate(drones,5).length,0);assert.equal(enemy.windup,0);
});

test('falling to the safe lane cancels a pending shot',()=>{
  const {route,drones}=fixture(),enemy=drones[0];positionNear(enemy);enemy.cooldown=0;
  tick([enemy]);assert(enemy.windup>0);
  q.player.y=route.floorY-q.player.h;
  assert.equal(simulate([enemy],4).length,0);assert.equal(enemy.windup,0);
});

test('aim locks during the warning and does not follow a dodge',()=>{
  const {drones}=fixture(),enemy=drones[0];drones[1].alive=false;positionNear(enemy,220);enemy.cooldown=0;
  tick([enemy]);assert(enemy.windup>0);positionNear(enemy,-220);
  const shots=simulate([enemy],1.5);
  assert.equal(shots.length,1);assert(shots[0].vx>0,'shot remains aimed at the warned position');
  assert.equal(q.player.hp,100,'moving behind the drone dodges the locked shot');
});

test('touching a route anchor causes no contact damage',()=>{
  const {drones}=fixture(),enemy=drones[0];positionNear(enemy,0);enemy.cooldown=3;
  simulate([enemy],1);assert.equal(q.player.hp,100);assert.equal(enemy.hp,1);
});

test('30 and 120 FPS both preserve windup and release',()=>{
  for(const dt of [1/30,1/120]){
    const {drones}=fixture(),enemy=drones[0];positionNear(enemy);drones[1].alive=false;
    const shots=simulate([enemy],3,dt);assert.equal(shots.length,1);assert(q.player.hp<100);
  }
});

// Legacy jump/slash traversal, now ticking actual hostile bullets as well.
function traverse(zone,difficulty,attacks=true,maxHits=2){
  const {route,drones}=fixture(zone,difficulty);
  Object.assign(q.player,{x:route.launchX+route.launchWidth-60,y:route.launchY-q.player.h,
    vx:440,vy:0,grounded:true,facing:1,hp:5,maxHp:5,invincible:0});
  q.keys.add('KeyD');q.keys.add('Space');
  let doubled=false,refreshJump=false,refreshes=0,landed=false,lower=false;
  for(let frame=0;frame<720;frame++){
    const time=frame/120;
    if(frame===0||(!doubled&&time>=.2)||refreshJump){q.pressed.add('Space');if(frame>0&&!doubled)doubled=true;refreshJump=false;}
    if(attacks&&refreshes<maxHits&&q.player.attackCooldown<=0&&q.player.attackTimer<=0){
      const target=drones.find(e=>e.alive&&e.x+e.w/2-(q.player.x+q.player.w/2)>45
        &&e.x+e.w/2-(q.player.x+q.player.w/2)<145&&Math.abs(e.y+e.h/2-(q.player.y+q.player.h/2))<42);
      if(target)q.startAttack({x:1,y:0});
    }
    const airBefore=q.player.airJumpAvailable,aliveBefore=drones.filter(e=>e.alive).length;
    tick(drones,1/120,{playerPhysics:true});
    if(!airBefore&&q.player.airJumpAvailable&&drones.filter(e=>e.alive).length<aliveBefore){refreshes++;refreshJump=true;}
    if(frame>3&&q.player.grounded){
      landed=Math.abs(q.player.y+q.player.h-route.landingY)<1&&q.player.x+q.player.w>route.landingX;
      lower=q.player.y+q.player.h>route.landingY+20;
      if(landed||lower)break;
    }
  }
  return {landed,lower,refreshes,hp:q.player.hp};
}
test('both upper routes remain reachable with two real slash refreshes in all modes',()=>{
  for(const zone of [5,43])for(const difficulty of modes){
    const result=traverse(zone,difficulty);
    assert(result.landed&&result.refreshes===2,`${zone}/${difficulty}: ${JSON.stringify(result)}`);
    assert.equal(result.hp,5,'the intended crossing needs no damage tanking');
  }
});
test('missed or one-hit crossings fall safely onto the lower route',()=>{
  for(const zone of [5,43])for(const difficulty of modes)for(const hits of [0,1]){
    const result=traverse(zone,difficulty,hits>0,hits);
    assert(!result.landed&&result.lower,`${zone}/${difficulty}/${hits}: ${JSON.stringify(result)}`);
    assert.equal(result.hp,5,'failed optional crossing remains forgiving');
  }
});
const failed=results.filter(r=>!r.ok);
for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}`);
for(const result of failed)console.error(result.error);
console.log(JSON.stringify({routeShotEvidence:evidence}));
console.log(`Route drone combat QA: ${results.length-failed.length}/${results.length} passed`);
process.exitCode=failed.length?1:0;
