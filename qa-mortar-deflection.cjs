// Real triple-mortar creation, rendered steel contacts and projectile integration.
// No production hooks, browser packages or native drawing dependencies required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
new Function('require', fs.readFileSync('qa-smoke.cjs', 'utf8').split('const runtimeSource =')[0])(require);
global.setTimeout = () => 1;
global.clearTimeout = () => {};
for (const file of ['operative-renderer.js', 'story-data.js']) {
  vm.runInThisContext(fs.readFileSync(file, 'utf8'), {filename: file});
}
window.__MORTAR_EXPLOSIONS__ = [];
const hook = `window.__MORTAR_QA__ = {player,game,keys,pressed,enemies,bullets,platforms,hazards,
  pickups,boostNodes,combatRooms,snowPatches,particles,ctx,addEnemy,updateEnemy,updatePlayer,
  updateBullets,startAttack,startComboAttack,refreshSlashContact,currentSlashSegments,
  bulletIntersectsSlashBlade,fireMortar,fireMortarTurretVolley,drawEnemyTelegraph,
  rebuildPlatformSpatialIndex,clearGameplayInput,
  hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;
    adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}};`;
const source = fs.readFileSync('game.js', 'utf8')
  .replace('function explodeMortar(bullet) {', `function explodeMortar(bullet) {
    window.__MORTAR_EXPLOSIONS__.push({x:bullet.x+bullet.w/2,y:bullet.y+bullet.h/2});`);
assert(source.includes('window.__MORTAR_EXPLOSIONS__.push'), 'explosion observation hook attached');
vm.runInThisContext(source.replace(/\}\)\(\);\s*$/, hook + '\n})();'), {filename:'game-mortar-qa.js'});
const q = window.__MORTAR_QA__, original = structuredClone(q.player), results = [];
function test(name, run) {
  try {run(); results.push({name, ok:true});}
  catch (error) {results.push({name, ok:false, error:error.message});}
}
function fixture(difficulty='darkhorse') {
  for (const list of [q.enemies,q.bullets,q.platforms,q.hazards,q.pickups,q.boostNodes,
    q.combatRooms,q.snowPatches,q.particles,window.__MORTAR_EXPLOSIONS__]) list.length=0;
  q.rebuildPlatformSpatialIndex();
  Object.assign(q.player, structuredClone(original), {x:600,y:400,vx:0,vy:0,grounded:false,
    hp:5,maxHp:5,invincible:0,attackTimer:0,attackCooldown:0,queuedAction:null,burstTimer:0,
    motionPose:null,shotgunCharge:0,airJumpAvailable:false,crossShotTimer:0});
  Object.assign(q.game,{mode:'playing',difficulty,stage:0,zone:0,adminMode:false,adminCadetMode:false,
    bossReplay:null,tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,
    storyQueue:[],freeze:0,shake:0,time:0,controlsReversed:false,screenFlipActive:false});
  q.clearGameplayInput();q.hidePanels();
  const enemy=q.addEnemy('mortarTurret',1100,650,0);
  Object.assign(enemy,{targetX:850,targetY:650,cooldown:0,windup:0});
  return enemy;
}
function volley(enemy) {
  q.bullets.length=0;q.fireMortarTurretVolley(enemy);
  assert.equal(q.bullets.length,3,'actual turret releases exactly three shells');
  for (const shell of q.bullets) shell.ownerZone=0;
  return q.bullets.slice();
}
function oneShell(enemy) {
  const shell=volley(enemy)[1];q.bullets.splice(0,q.bullets.length,shell);return shell;
}
function swing(facing=1,combo=false) {
  q.player.facing=facing;
  if(combo)q.startComboAttack();else q.startAttack({x:facing,y:0});
  q.player.attackTimer=q.player.attackDuration*.55;
  q.player.vx=0;q.player.vy=0;q.player.squash=0;
  const segments=q.refreshSlashContact();assert(segments.length,'active rendered steel exists');
  return segments.at(-1);
}
function crossing(shell,segment,dt=1/30,miss=false) {
  const dx=segment.tip.x-segment.base.x,dy=segment.tip.y-segment.base.y,length=Math.hypot(dx,dy);
  const ux=dx/length,uy=dy/length,nx=-uy,ny=ux;
  // Outside either end of the blade must not benefit from the broad body-hit box.
  const distance=miss?length+52:length*.8;
  const cx=segment.base.x+ux*distance,cy=segment.base.y+uy*distance;
  Object.assign(shell,{x:cx+nx*30-shell.w/2,y:cy+ny*30-shell.h/2,
    vx:-nx*60/dt,vy:-ny*60/dt,impactTimer:1,life:2,
    lockedImpactX:cx-nx*700,lockedImpactY:cy-ny*700});
  assert.equal(q.bulletIntersectsSlashBlade(shell),false,'shell begins outside the visible steel');
  return {cx,cy};
}

for (const difficulty of ['chick','cadet','darkhorse','weapon']) {
  test(`${difficulty}: warning and actual three marked ballistic targets`,()=>{
    const enemy=fixture(difficulty);
    q.updateEnemy(enemy,0);
    assert(enemy.windup>=.9,'long telegraph remains before the first volley');
    const calls=[],old=q.ctx.ellipse;q.ctx.ellipse=(...args)=>calls.push(args);
    try {q.drawEnemyTelegraph(enemy);}finally{q.ctx.ellipse=old;}
    const warningXs=calls.filter(a=>a[2]===52).map(a=>a[0]).sort((a,b)=>a-b);
    const shells=volley(enemy);
    const marks=shells.map(b=>b.lockedImpactX).sort((a,b)=>a-b);
    assert.deepEqual(warningXs,marks,'warning ellipses and shell target locks match');
    for(const shell of shells){
      assert.equal(shell.kind,'mortar');assert.equal(shell.terrainCollision,true);
      assert(!shell.piercePlatforms,'turret mortars cannot bypass solids');
      assert.equal(shell.gravity,860);assert.equal(shell.lockedImpactY,enemy.targetY);
      const t=shell.impactTimer;
      assert(Math.abs(shell.x+shell.w/2+shell.vx*t-shell.lockedImpactX)<1e-6);
      assert(Math.abs(shell.y+shell.h/2+shell.vy*t+.5*shell.gravity*t*t-shell.lockedImpactY)<1e-6);
    }
    q.player.x=3000;q.player.y=100;
    for(let frame=0;frame<300&&q.bullets.length;frame++)q.updateBullets(1/120,[]);
    assert.equal(q.bullets.length,0);
    assert.equal(window.__MORTAR_EXPLOSIONS__.length,3);
    const impacts=window.__MORTAR_EXPLOSIONS__.slice().sort((a,b)=>a.x-b.x);
    impacts.forEach((impact,i)=>{
      assert(Math.abs(impact.x-marks[i])<.001,'unobstructed shell reaches the marked X');
      assert(Math.abs(impact.y-enemy.targetY)<.001,'unobstructed shell reaches the marked Y');
    });
  });
}

for(const combo of [false,true])for(const facing of [-1,1]){
  const name=`${combo?'J':'regular'} slash facing ${facing}`;
  test(`${name}: already touching shell is cut without explosion`,()=>{
    const enemy=fixture(),segment=swing(facing,combo),shell=oneShell(enemy);
    Object.assign(shell,{x:(segment.base.x+segment.tip.x)/2-shell.w/2,
      y:(segment.base.y+segment.tip.y)/2-shell.h/2,vx:0,vy:0,impactTimer:1,life:2});
    assert(q.bulletIntersectsSlashBlade(shell));
    q.updatePlayer(0);
    assert(!q.bullets.includes(shell));assert.equal(window.__MORTAR_EXPLOSIONS__.length,0);
    assert.equal(q.player.hp,5);assert(q.player.airJumpAvailable);assert(q.player.shotgunCharge>0);
  });
  test(`${name}: in-flight crossing is cut before impact`,()=>{
    const enemy=fixture(),segment=swing(facing,combo),shell=oneShell(enemy);
    crossing(shell,segment);
    q.updateBullets(1/30,[]);
    assert(!q.bullets.includes(shell),'moving shell must be removed during the projectile step');
    assert.equal(window.__MORTAR_EXPLOSIONS__.length,0,'steel contact must not detonate the mortar');
    assert.equal(q.player.hp,5,'cut shell cannot damage its cutter');
    assert(q.player.airJumpAvailable,'in-flight cut restores the same jump as an existing contact');
    assert(q.player.shotgunCharge>0,'in-flight cut charges shotgun exactly like existing contact');
  });
  test(`${name}: off-blade crossing is not cancelled`,()=>{
    const enemy=fixture(),segment=swing(facing,combo),shell=oneShell(enemy);
    crossing(shell,segment,1/30,true);
    q.updateBullets(1/30,[]);
    assert(q.bullets.includes(shell),'a miss outside rendered steel remains dangerous');
    assert.equal(q.player.shotgunCharge,0);assert.equal(window.__MORTAR_EXPLOSIONS__.length,0);
  });
}

for(const progress of [.04,.93])test(`inactive slash progress ${progress} cannot cut`,()=>{
  const enemy=fixture(),segment=swing(),shell=oneShell(enemy);crossing(shell,segment);
  q.player.attackTimer=q.player.attackDuration*(1-progress);q.refreshSlashContact();
  q.updateBullets(1/30,[]);
  assert.equal(q.player.shotgunCharge,0);
  assert(q.bullets.includes(shell)||window.__MORTAR_EXPLOSIONS__.length===1,'inactive blade must not delete safely');
});

for(const facing of [-1,1])test(`unmodified ballistic volley enters steel, facing ${facing}`,()=>{
  const enemy=fixture(),segment=swing(facing),shell=oneShell(enemy);
  const dx=segment.tip.x-segment.base.x,dy=segment.tip.y-segment.base.y,length=Math.hypot(dx,dy);
  let nx=-dy/length,ny=dx/length;
  if(shell.vx*nx+shell.vy*ny>0){nx=-nx;ny=-ny;}
  const clearance=12*(Math.abs(nx)+Math.abs(ny))+.25;
  const steelX=segment.base.x+dx*.65,steelY=segment.base.y+dy*.65;
  // Place the actor, not the shell. Its real muzzle position, velocity, gravity,
  // target and time-to-impact remain exactly as authored by the volley function.
  q.player.x+=shell.x+shell.w/2-nx*clearance-steelX;
  q.player.y+=shell.y+shell.h/2-ny*clearance-steelY;
  q.refreshSlashContact();
  assert.equal(q.bulletIntersectsSlashBlade(shell),false,'shell is not cut at the start-of-frame position');
  q.updateBullets(1/30,[]);
  assert(!q.bullets.includes(shell),'actual ballistic travel enters the active blade within this frame');
  assert.equal(window.__MORTAR_EXPLOSIONS__.length,0);
  assert.equal(q.player.hp,5);assert(q.player.shotgunCharge>0);
});

test('real turret arc collides with a solid wall before distant mark',()=>{
  const enemy=fixture();enemy.targetX=1700;enemy.targetY=650;
  const shell=oneShell(enemy);q.player.x=3000;q.player.y=100;
  const wall={x:1260,y:0,w:16,h:1450,kind:'wall'};
  q.platforms.push(wall);q.rebuildPlatformSpatialIndex();
  for(let frame=0;frame<300&&q.bullets.includes(shell);frame++)q.updateBullets(1/120,[]);
  assert(!q.bullets.includes(shell));assert.equal(window.__MORTAR_EXPLOSIONS__.length,1);
  assert(window.__MORTAR_EXPLOSIONS__[0].x<=wall.x+shell.w/2+6,'wall intercepts before marked point');
});

test('uncut real shell damages an airborne player',()=>{
  const enemy=fixture(),shell=oneShell(enemy);
  Object.assign(shell,{x:q.player.x+q.player.w/2-9,y:q.player.y-24,vx:0,vy:600,impactTimer:1,life:2});
  q.updateBullets(1/30,[]);
  assert.equal(q.player.hp,4);assert.equal(window.__MORTAR_EXPLOSIONS__.length,1);
  assert(!q.bullets.includes(shell));
});

test('final flight slice cuts before the locked-impact deadline',()=>{
  const enemy=fixture(),segment=swing(),shell=oneShell(enemy);
  crossing(shell,segment,1/30);
  // A consistent ballistic mark at this last slice's end, not a fake remote teleport.
  shell.impactTimer=1/30;
  shell.lockedImpactX=shell.x+9+shell.vx*shell.impactTimer;
  shell.lockedImpactY=shell.y+9+shell.vy*shell.impactTimer+.5*shell.gravity*shell.impactTimer**2;
  q.updateBullets(1/30,[]);
  assert(!q.bullets.includes(shell));
  assert.equal(window.__MORTAR_EXPLOSIONS__.length,0,'deadline cannot bypass steel contact in the final segment');
  assert.equal(q.player.hp,5);
});

test('final flight slice respects a wall before the marked point',()=>{
  const enemy=fixture(),shell=oneShell(enemy);q.player.x=3000;q.player.y=100;
  Object.assign(shell,{x:1200,y:400,vx:600,vy:0,impactTimer:1/30,life:1});
  shell.lockedImpactX=shell.x+9+shell.vx*shell.impactTimer;
  shell.lockedImpactY=shell.y+9+.5*shell.gravity*shell.impactTimer**2;
  q.platforms.push({x:1218,y:350,w:5,h:150,kind:'wall'});q.rebuildPlatformSpatialIndex();
  q.updateBullets(1/30,[]);
  assert.equal(window.__MORTAR_EXPLOSIONS__.length,1);
  assert(window.__MORTAR_EXPLOSIONS__[0].x<shell.lockedImpactX-2,'last-step wall collision occurs before exact-mark explosion');
});

const failures=results.filter(r=>!r.ok);
console.log(JSON.stringify({suite:'triple-mortar-deflection',passed:results.length-failures.length,total:results.length,failures},null,2));
if(failures.length)process.exitCode=1;
