// Native gunner AI projectiles, real mouse/J input, actual sampled sword steel.
// No shipped code hooks or dependencies are required.
const assert=require('node:assert/strict'),fs=require('node:fs');
// Optional read-only comparison: execute the deployed v3.11.4 runtime with
// this same test (no checkout/reset, no changes to any production file).
const baseline=process.argv.includes('--baseline');
const readFile=fs.readFileSync;
if(baseline){
  const previous=require('node:child_process').execFileSync('git',['show','76c0fee:game.js'],{encoding:'utf8',maxBuffer:8*1024*1024});
  fs.readFileSync=function(path,...args){return path==='game.js'?previous:readFile.call(this,path,...args);};
}
let harness=fs.readFileSync('qa-cross-combo.cjs','utf8').split('function test(name,body)')[0];
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  'player,game,crossChain,keys,pressed,pointer,camera,fireBullet,refreshSlashContact,bulletIntersectsSlashBlade,isAttackActive,updateEnemy,slashSegmentHitsRect,');
const {q,fixture,target,canvasEvents}=new Function('require',harness+'\nreturn {q,fixture,target,canvasEvents};')(require);
fs.readFileSync=readFile;
const renderer=window.MoonlitOperative,results=[],evidence=[];
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function test(name,run){try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
function pose(facing,input,progress){
  fixture();Object.assign(q.player,{x:600,y:300,vx:0,vy:0,grounded:false,facing,airJumpAvailable:false});
  if(input==='J'){q.pressed.add('KeyJ');q.updatePlayer(0);q.pressed.clear();}
  else for(const callback of canvasEvents.get('mousedown')||[])callback({button:0,clientX:q.player.x+q.player.w/2+facing*300,clientY:q.player.y+q.player.h/2,preventDefault(){},stopPropagation(){}});
  assert(q.player.attackTimer>0,`${input} starts its actual input attack`);
  q.player.attackTimer=q.player.attackDuration*(1-progress);q.refreshSlashContact();
  assert(q.isAttackActive(),'fixture uses active steel, not windup/recovery');
  return renderer.sampleBlade(q.player,q.game,facing);
}
function shoot(role,point){
  const e=target(role,{facing:q.player.facing*-1,cooldown:999,windup:.071});
  Object.assign(e,{x:point.x-e.w/2,y:point.y-e.h*.38,originX:point.x-e.w/2,originY:point.y-e.h*.38,spawnX:point.x-e.w/2,
    targetX:q.player.x+q.player.w/2,targetY:q.player.y+q.player.h/2});
  if(role==='machinegun')Object.assign(e,{windup:0,burstRemaining:4,burstInterval:0});
  q.updateEnemy(e,.002);
  assert.equal(q.bullets.length,1,`${role} emits a native shot via its AI`);
  const b=q.bullets[0];assert.equal(b.kind,{gunner:'standard',machinegun:'machinegun',piercer:'phase'}[role]);
  assert(b.enemy);return b;
}
function entersSteelFirst(bullet,blade,dt){
  const b={...bullet},steps=Math.max(1,Math.ceil(Math.max(Math.abs(b.vx*dt),Math.abs(b.vy*dt))/6)),step=dt/steps;
  for(let i=0;i<steps;i++){
    b.x+=b.vx*step;b.y+=b.vy*step;b.vy+=(b.gravity||0)*step;
    if(q.slashSegmentHitsRect(blade,b))return true;
    if(overlap(b,q.player))return false;
  }
  return false;
}
function scenario(role,input,facing,dt){
  for(const progress of[.28,.38,.48,.58,.68])for(let gap=8;gap<=48;gap+=1){
    const blade=pose(facing,input,progress),cx=q.player.x+q.player.w/2,cy=q.player.y+q.player.h/2;
    const point={x:blade.base.x+(blade.tip.x-blade.base.x)*.85,y:blade.base.y+(blade.tip.y-blade.base.y)*.85};
    const length=Math.hypot(point.x-cx,point.y-cy),ux=(point.x-cx)/length,uy=(point.y-cy)/length;
    const b=shoot(role,{x:point.x+ux*gap,y:point.y+uy*gap});
    if(!q.bulletIntersectsSlashBlade(b)&&entersSteelFirst(b,blade,dt))return {b,progress,gap};
  }
  throw new Error(`No independent incoming-steel fixture for ${role}/${input}/${facing}/${dt}`);
}
for(const role of['gunner','machinegun','piercer'])test(`${role} actually warns and fires from its native attack state`,()=>{
  fixture();const e=target(role,{x:700,originX:700,cooldown:0,windup:0,facing:-1});let warned=false;
  for(let frame=0;frame<600&&q.bullets.length<(role==='machinegun'?4:1);frame++){
    q.game.time+=1/120;q.updateEnemy(e,1/120);warned||=e.windup>0;
  }
  assert(warned);assert.equal(q.bullets.length,role==='machinegun'?4:1);
  assert(q.bullets.every(b=>b.enemy&&b.kind===({gunner:'standard',machinegun:'machinegun',piercer:'phase'}[role])));
});
for(const role of['gunner','machinegun','piercer'])for(const input of['mouse','J'])for(const facing of[-1,1])for(const dt of[1/30,1/60,1/120])
  test(`${role} crosses ${input} steel facing ${facing} at ${Math.round(1/dt)}Hz`,()=>{
    const {b,progress,gap}=scenario(role,input,facing,dt),hp=q.player.hp;
    const original={...b};q.updateBullets(dt,[]);
    evidence.push({role,input,facing,hz:Math.round(1/dt),progress,gap,removed:!q.bullets.includes(b),charge:q.player.shotgunCharge,hp:q.player.hp});
    assert(!q.bullets.includes(b),'the shot enters physical steel during this frame and must be removed now');
    assert.equal(q.player.shotgunCharge,.34,'exactly one normal sword deflection reward');
    assert.equal(q.player.hp,hp,'the intercepted round cannot hit the body afterward');
    assert.equal(q.player.airJumpAvailable,true,'existing airborne deflection refresh remains');
    assert.equal(q.bullets.length,0,'ordinary cuts delete bullets; they must not create a reflected projectile');
    assert.equal(original.enemy,true);
  });
for(const role of['gunner','machinegun','piercer'])for(const facing of[-1,1])test(`${role} uncut native shot still damages the body facing ${facing}`,()=>{
  const {b}=scenario(role,'J',facing,1/60),before={...b};
  q.player.attackTimer=0;q.refreshSlashContact();q.updateBullets(.5,[]);
  assert.equal(q.player.hp,4,'same unmodified emitted trajectory reaches the player without active steel');
  assert.equal(q.player.shotgunCharge,0);assert(!q.bullets.includes(b));assert(before.enemy);
});
for(const role of['gunner','machinegun','piercer'])test(`${role} distant shot missing steel remains hostile and moving`,()=>{
  const blade=pose(1,'mouse',.48),b=shoot(role,{x:blade.tip.x+190,y:blade.tip.y-90});
  const {x,y}=b;q.updateBullets(1/60,[]);
  assert(q.bullets.includes(b));assert(b.x!==x||b.y!==y);assert(b.enemy);assert.equal(q.player.shotgunCharge,0);
});
test('real friendly shotgun pellets are never deleted or changed into hostile rounds by the sword',()=>{
  pose(1,'mouse',.48);q.startShotgun({x:1,y:0});const pellets=q.bullets.slice();
  assert.equal(pellets.length,6);assert(pellets.every(b=>b.enemy===false&&b.kind==='shotgun'));
  q.updateBullets(1/120,[]);assert(pellets.every(b=>q.bullets.includes(b)&&b.enemy===false));assert.equal(q.player.shotgunCharge,0);
});
for(const kind of['mutant-debris','warden-beam','rain-controller','rain-core-burst'])test(`${kind} remains explicitly uncuttable`,()=>{
  const blade=pose(1,'mouse',.48),b={x:blade.tip.x-2,y:blade.tip.y-2,w:4,h:4,enemy:true,kind};
  assert(q.slashSegmentHitsRect(blade,b),'excluded object is placed at real steel');assert(!q.bulletIntersectsSlashBlade(b));
});
for(const progress of[.01,.91])test(`inactive sword at progress ${progress} does not grant a deflection`,()=>{
  const {b}=scenario('gunner','mouse',1,1/60);
  q.player.attackTimer=q.player.attackDuration*(1-progress);q.refreshSlashContact();assert(!q.isAttackActive());
  q.updateBullets(.5,[]);assert.equal(q.player.hp,4);assert.equal(q.player.shotgunCharge,0);assert(!q.bullets.includes(b));
});
for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}`);
for(const result of results.filter(r=>!r.ok))console.error(result.error);
console.log(JSON.stringify({gunDeflectionEvidence:evidence}));
console.log(`Gun deflection QA${baseline?' (committed baseline)':''}: ${results.filter(r=>r.ok).length}/${results.length} passed`);
process.exitCode=Number(results.some(r=>!r.ok));
