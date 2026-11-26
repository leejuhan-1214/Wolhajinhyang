// Independent actual-input/body regression. No production hooks or direct damage calls.
const assert=require('node:assert/strict'),fs=require('node:fs');
let harness=fs.readFileSync(`${__dirname}/qa-cross-combo.cjs`,'utf8').split('function test(name,body)')[0];
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  'player,game,crossChain,keys,pressed,pointer,camera,addEnemy,attackBox,isStationaryTurret,ensureShieldState,moveEnemyPhysics,CUTSCENE_EVENTS,STORY_EVENTS,');
const {q,fixture:baseFixture,canvasEvents}=new Function('require',harness+'\nreturn {q,fixture,canvasEvents};')(require);
const authoredEnemies=structuredClone(q.enemies),authoredPlatforms=structuredClone(q.platforms);
const results=[];
function setup(type,side,gap){
  baseFixture();
  q.game.cutsceneSeen=new Set(q.CUTSCENE_EVENTS.map(e=>e.id));
  q.game.storySeen=new Set(q.STORY_EVENTS.map(e=>e.id));
  q.game.storyQueue=[];q.game.story=null;q.game.runTime=0;
  q.pointer.active=false;q.pointer.down=false;
  const e=q.addEnemy(type,600,650);
  e.cooldown=0;e.facing=-side;
  Object.assign(q.player,{x:side===1?e.x-q.player.w-gap:e.x+e.w+gap,y:650-q.player.h,facing:side});
  return e;
}
function step(dt){q.update(dt);}
function strike(e,input,dt){
  let wait=0;
  while((q.player.attackTimer>0||q.player.attackCooldown>0||q.game.freeze>0)&&wait++<240)step(dt);
  assert(wait<240,'prior swing must recover');
  assert(q.player.hp>0,'ordinary melee test must stay alive');
  const hp=e.hp,id=q.player.attackId;
  if(input==='mouse'){
    const event={button:0,clientX:e.x+e.w/2-q.camera.x,clientY:e.y+e.h/2-q.camera.y,preventDefault(){},stopPropagation(){}};
    for(const handler of canvasEvents.get('mousedown')||[])handler(event);
  }else q.pressed.add('KeyJ');
  for(let count=0;count<180;count++){
    step(dt);
    if(q.player.attackId>id&&q.player.attackTimer<=0&&q.game.freeze<=0)break;
    if(count===179)assert.fail(`${e.type} input must finish`);
  }
  assert(q.player.attackId>id,'actual left click or J must start a new attack');
  return hp-e.hp;
}
for(const type of ['turret','mortarTurret'])for(const side of [-1,1])for(const input of ['mouse','j'])for(const gap of [.5,60,130])for(const dt of [1/120,1/60]){
  const e=setup(type,side,gap),hp=e.hp,x=e.x;
  assert(q.isStationaryTurret(e));assert.equal(q.ensureShieldState(e),false,'yellow trim must not confer shield immunity');
  const damage=strike(e,input,dt);
  assert.equal(damage,1,`${type} ${input} side${side} gap${gap} must take one ordinary body hit`);
  assert.equal(e.x,x,'stationary cannon does not take knockback');
  assert.equal(e.hp,hp-1);
  results.push({type,side,input,gap,hz:Math.round(1/dt),damage});
}
for(const type of ['turret','mortarTurret'])for(const side of [-1,1])for(const input of ['mouse','j']){
  const e=setup(type,side,.5);e.cooldown=20;
  const damages=[strike(e,input,1/120),strike(e,input,1/120),strike(e,input,1/120)];
  assert.deepEqual(damages,[1,1,2],'uninterrupted grounded combo must hit both body types from both sides');
}
for(const type of ['turret','mortarTurret'])for(const side of [-1,1])for(const input of ['mouse','j']){
  const e=setup(type,side,220),startX=q.player.x;
  q.keys.add(side===1?'KeyD':'KeyA');
  for(let i=0;i<150;i++)step(1/120);
  q.keys.clear();
  const gap=side===1?e.x-(q.player.x+q.player.w):q.player.x-(e.x+e.w);
  assert(Math.abs(q.player.x-startX)>180,'walk input must actually approach the cannon');
  assert(gap>=0&&gap<1,'real overlap resolution should leave a close attackable boundary');
  const damages=[],trace=[];for(let i=0;i<16&&e.alive;i++){
    const before={x:q.player.x,y:q.player.y,vx:q.player.vx,vy:q.player.vy,grounded:q.player.grounded,hp:q.player.hp};
    damages.push(strike(e,input,1/120));trace.push({before,after:{x:q.player.x,y:q.player.y,hp:q.player.hp},damage:damages.at(-1)});
  }
  assert.equal(e.alive,false,`${type} must be destroyable after a normal walking approach from side${side}`);
  assert(trace.every(t=>t.damage>0||t.after.hp<t.before.hp),`a close body miss needs actual player-hit interruption: ${JSON.stringify({type,side,input,trace})}`);
  results.push({type,side,input,walkToBody:true,attacks:damages.length,damages,playerHitInterruptions:trace.filter(t=>t.damage===0&&t.after.hp<t.before.hp).length,playerHp:q.player.hp});
}
// At a genuinely out-of-range spacing neither input gains hidden extra reach.
for(const type of ['turret','mortarTurret'])for(const side of [-1,1])for(const input of ['mouse','j']){
  const e=setup(type,side,190);assert.equal(strike(e,input,1/120),0,'out-of-body-range swing remains a miss');
}
const intersections=e=>authoredPlatforms.filter(p=>!p.hidden&&e.x<p.x+p.w&&e.x+e.w>p.x&&e.y<p.y+p.h-1&&e.y+e.h>p.y+1).map(p=>({x:p.x,y:p.y,w:p.w,h:p.h,kind:p.kind,depthX:Math.min(e.x+e.w,p.x+p.w)-Math.max(e.x,p.x),depthY:Math.min(e.y+e.h,p.y+p.h)-Math.max(e.y,p.y)}));
const placements=authoredEnemies.filter(e=>e.type==='turret'||e.type==='mortarTurret').map(e=>({
  id:e.id,type:e.type,x:e.x,y:e.y,w:e.w,h:e.h,hp:e.hp,stage:e.stageIndex,
  overlaps:intersections(e),
}));
const settled=[];
q.platforms.splice(0,q.platforms.length,...structuredClone(authoredPlatforms));q.rebuildPlatformSpatialIndex();
for(const info of placements.filter(p=>p.overlaps.length)){
  const e=structuredClone(authoredEnemies.find(e=>e.id===info.id));
  for(let frame=0;frame<60;frame++)q.moveEnemyPhysics(e,1/120);
  settled.push({id:e.id,x:e.x,y:e.y,before:info.overlaps,after:intersections(e)});
}
assert(settled.every(e=>e.after.length===0),'initial authored intersections must clear under the real enemy physics');
console.log(JSON.stringify({turretMelee:'passed',ordinaryHitCases:48,uninterruptedComboCases:8,walkAndDestroyCases:8,outOfRangeCases:8,
  authoredTurrets:placements.length,initialPlatformIntersections:settled.length,remainingAfterPhysics:settled.filter(e=>e.after.length).length,
  walkKills:results.filter(r=>r.walkToBody).map(({type,side,input,attacks,playerHitInterruptions,playerHp})=>({type,side,input,attacks,playerHitInterruptions,playerHp}))}));
