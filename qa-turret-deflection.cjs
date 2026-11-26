// Use real five-lane projectiles and their orbit/substep motion against actual steel.
const assert=require('node:assert/strict'),fs=require('node:fs');
let harness=fs.readFileSync('qa-cross-combo.cjs','utf8').split('function test(name,body)')[0];
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  'player,game,crossChain,keys,pressed,pointer,camera,fireTurretRow,fireBullet,refreshSlashContact,bulletIntersectsSlashBlade,isAttackActive,updateEnemy,');
const {q,fixture,target}=new Function('require',harness+'\nreturn {q,fixture,target};')(require);
const renderer=window.MoonlitOperative,results=[];
function test(name,run){try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function predict(bullet,dt){
  const b={...bullet},steps=Math.max(1,Math.ceil(Math.max(Math.abs(b.vx*dt),Math.abs(b.vy*dt))/6)),step=dt/steps;
  for(let i=0;i<steps;i++){
    if(b.kind==='turret-row'&&Number.isFinite(b.pathX)&&Number.isFinite(b.pathY)){
      b.pathX+=b.vx*step;b.pathY+=b.vy*step;b.rowOrbitTime+=step;
      const angle=b.rowOrbitPhase+b.rowOrbitTime*b.rowOrbitAngularSpeed;
      b.x=b.pathX+Math.cos(angle)*b.rowOrbitRadius-b.w/2;b.y=b.pathY+Math.sin(angle)*b.rowOrbitRadius-b.h/2;
    }else {b.x+=b.vx*step;b.y+=b.vy*step;}
    b.vy+=(b.gravity||0)*step;
    if(q.isAttackActive()&&q.bulletIntersectsSlashBlade(b))return true;
    if(!b.harmless&&overlap(b,q.player))return false;
  }
  return false;
}
function pose(facing=1,progress=.5,combo=false){
  fixture();Object.assign(q.player,{x:600,y:300,vx:0,vy:0,grounded:false,facing});
  q.startAttack({x:facing,y:0},combo);q.player.attackTimer=q.player.attackDuration*(1-progress);q.refreshSlashContact();
  return renderer.sampleBlade(q.player,q.game,facing);
}
function volleyAt(point,facing,gap){
  // Place the real cannon so its unmodified central ballistic path heads across
  // the steel. Its other four lanes keep their native offsets and orbit phases.
  const e=target('turret',{facing:-facing});
  e.x=point.x+facing*gap-e.w/2+facing*32;e.y=point.y-e.h*.42;
  e.targetX=point.x-facing*300;e.targetY=point.y;q.fireTurretRow(e);
  return q.bullets.slice();
}
const evidence=[];
test('a live golden turret charges before releasing exactly five native lanes',()=>{
  fixture();const e=target('turret',{x:700,originX:700,cooldown:0,windup:0,facing:-1});
  let warned=false;
  for(let frame=0;frame<360&&!q.bullets.length;frame++){
    q.game.time+=1/120;q.updateEnemy(e,1/120);warned||=e.windup>0;
  }
  assert(warned,'the actual turret AI must enter its warning state');assert.equal(q.bullets.length,5);
  assert(q.bullets.every(b=>b.kind==='turret-row'&&b.enemy&&b.piercePlatforms&&b.rowOrbitRadius===7));
  assert.equal(new Set(q.bullets.map(b=>b.rowOrbitPhase)).size,5,'all five original orbit phases remain distinct');
});
for(const facing of[-1,1])for(const dt of[1/30,1/60,1/120])test(`five-lane orbit enters visible steel facing ${facing} at ${Math.round(1/dt)}Hz`,()=>{
  let found=false;
  for(const progress of[.28,.38,.48,.58,.68]){
    for(const gap of[16,20,24,28,32,36]){
      const blade=pose(facing,progress),point={x:blade.base.x+(blade.tip.x-blade.base.x)*.84,y:blade.base.y+(blade.tip.y-blade.base.y)*.84};
      const volley=volleyAt(point,facing,gap);assert.equal(volley.length,5);assert(volley.every(b=>b.kind==='turret-row'&&b.piercePlatforms&&b.rowOrbitRadius===7));
      // Resolve the actual updatePlayer pass first, including any already-touching lanes.
      q.updatePlayer(0);
      const fresh=q.bullets.filter(b=>!q.bulletIntersectsSlashBlade(b)&&predict(b,dt));
      if(!fresh.length)continue;
      found=true;const charge=q.player.shotgunCharge,hp=q.player.hp;q.updateBullets(dt,[]);
      evidence.push({facing,hz:Math.round(1/dt),progress,gap,expectedCuts:fresh.length,remaining:fresh.filter(b=>q.bullets.includes(b)).length,chargeDelta:q.player.shotgunCharge-charge,hpBefore:hp,hpAfter:q.player.hp});
      for(const b of fresh)assert(!q.bullets.includes(b),'a round crossing visible steel inside this physics frame must be cut now');
      assert(q.player.shotgunCharge>charge,'a cut in projectile motion uses the real deflection interaction, not just player collision removal');
      break;
    }
    if(found)break;
  }
  assert(found,'fixture must contain a newly entering, not pre-overlapping, live lane');
});
test('a whole volley missing the steel remains alive and continues its orbit',()=>{
  const blade=pose(),volley=volleyAt({x:blade.tip.x+150,y:blade.tip.y-120},1,60);
  const original=volley.map(b=>({x:b.x,y:b.y}));q.updatePlayer(0);q.updateBullets(1/30,[]);
  assert.equal(q.bullets.length,5);assert.equal(q.player.shotgunCharge,0);
  assert(q.bullets.every((b,i)=>b.x!==original[i].x||b.y!==original[i].y));
});
for(const facing of[-1,1])test(`one real lane is stopped before the body, while uncut lanes stay dangerous facing ${facing}`,()=>{
  const blade=pose(facing,.28),point={x:blade.base.x+(blade.tip.x-blade.base.x)*.84,y:blade.base.y+(blade.tip.y-blade.base.y)*.84};
  const volley=volleyAt(point,facing,facing<0?20:28),original=volley.map(b=>({...b}));
  q.updatePlayer(0);
  const selected=q.bullets.find(b=>!q.bulletIntersectsSlashBlade(b)&&predict(b,1/30));assert(selected);
  const selectedIndex=volley.indexOf(selected),playerState=structuredClone(q.player);
  function restore(indices,active){
    Object.assign(q.player,structuredClone(playerState),{hp:5,invincible:0,shotgunCharge:0,airJumpAvailable:false});
    if(!active)q.player.attackTimer=0;
    q.refreshSlashContact();q.bullets.splice(0,q.bullets.length,...indices.map(i=>({...original[i]})));
  }
  // Only fixture population changes: the selected round retains its emitted
  // source, velocity, five-lane phase, path and orbit parameters byte for byte.
  restore([selectedIndex],true);q.updateBullets(1/30,[]);
  assert.equal(q.bullets.length,0,'the moving round is cut before reaching the body');
  assert.equal(q.player.hp,5,'the same lane must not both be cut and inflict contact damage');
  assert.equal(q.player.shotgunCharge,.34,'exactly one deflection reward');
  assert.equal(q.player.airJumpAvailable,true,'the existing airborne cut refresh still applies');
  q.updateBullets(.25,[]);assert.equal(q.player.hp,5);assert.equal(q.player.shotgunCharge,.34);
  restore([selectedIndex],false);q.updateBullets(.25,[]);
  assert.equal(q.player.hp,4,'without an active blade this exact same emitted lane reaches the body');
  assert.equal(q.player.shotgunCharge,0);
  restore(original.map((_,i)=>i).filter(i=>i!==selectedIndex),false);assert.equal(q.bullets.length,4);
  q.updateBullets(.25,[]);assert(q.player.hp<5,'other uncut lanes are not globally neutralized by the fix');
});
test('inactive windup and completed recovery cannot clear a volley',()=>{
  for(const progress of[.01,.91]){
    const blade=pose(1,.5),point={...blade.tip};q.player.attackTimer=q.player.attackDuration*(1-progress);q.refreshSlashContact();
    const volley=volleyAt({x:point.x+70,y:point.y},1,30);q.updatePlayer(0);q.updateBullets(1/60,[]);
    assert.equal(q.player.shotgunCharge,0);assert(volley.every(b=>q.bullets.includes(b)));
  }
});
for(const kind of['mutant-debris','warden-beam','rain-controller','rain-core-burst'])test(`${kind} remains excluded from sword deflection`,()=>{
  const blade=pose(),b={x:blade.tip.x-2,y:blade.tip.y-2,w:4,h:4,enemy:true,kind};assert(!q.bulletIntersectsSlashBlade(b));
});
test('friendly shotgun pellets are never consumed by the player blade',()=>{
  const blade=pose(),b={x:blade.tip.x-3,y:blade.tip.y-3,w:6,h:6,vx:0,vy:0,life:2,enemy:false,kind:'shotgun'};
  q.bullets.push(b);q.updatePlayer(0);q.updateBullets(1/60,[]);assert(q.bullets.includes(b));assert.equal(q.player.shotgunCharge,0);
});
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);for(const r of results.filter(r=>!r.ok))console.error(r.error);
console.log(JSON.stringify({turretDeflectionEvidence:evidence}));console.log(`Turret deflection QA: ${results.filter(r=>r.ok).length}/${results.length} passed`);process.exitCode=Number(results.some(r=>!r.ok));
