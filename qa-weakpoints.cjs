// Real boss state, projectiles and blade geometry. No shipped debug hooks.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
let canvas=null;
if(process.argv.includes('--render')) {
  // Optional visual preview dependency; default behavior tests need only Node.
  const {createCanvas}=require('@napi-rs/canvas');
  canvas=createCanvas(1440,680);document.getElementById('game').getContext=()=>canvas.getContext('2d');
}
for(const file of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__WEAKPOINT_QA__={player,game,enemies,bullets,platforms,hazards,pickups,boostNodes,combatRooms,snowPatches,checkpoints,zones,stages,WORLD_W,
 getBossWeakParts,getHunterShieldPose,hunterShieldDisabled,tryHitBreakerCoolingFin,tryHitHunterClasp,updateBossWeakParts,
 damageEnemy,damageEnemyWithShotgun,updateEnemyBurn,reflectShotgun,startBossChargedShot,updateEnemy,updateBoss,updateBullets,updatePlayer,startAttack,respawn,
 resetSlashCombo,rebuildPlatformSpatialIndex,clearGameplayInput,drawEnemy,ctx,
 steelContact(rect){return slashIntersectsRect(rect,2);},
 hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-weakpoint-test.js'});
const q=window.__WEAKPOINT_QA__,defaults=structuredClone(q.player),templates=structuredClone(q.enemies),terrain=structuredClone(q.platforms),savedCheckpoints=structuredClone(q.checkpoints);
const results=[];let serial=10000;
function fixture(kind='breaker',facing=1,fullArena=false){
  for(const list of [q.enemies,q.bullets,q.platforms,q.hazards,q.pickups,q.boostNodes,q.combatRooms,q.snowPatches])list.length=0;
  q.checkpoints.length=0;q.checkpoints.push(...structuredClone(savedCheckpoints));
  const e=structuredClone(templates.find(e=>e.type==='boss'&&e.bossKind===kind));assert(e);
  const zone=e.homeZoneIndex;
  q.stages.forEach((stage,index)=>stage.cleared=index<e.stageIndex);
  if(fullArena)q.platforms.push(...structuredClone(terrain));
  else {q.platforms.push({x:0,y:650,w:q.WORLD_W,h:800,kind:'ground'});e.x=q.zones[zone].x+q.zones[zone].width*.55;e.originX=e.x;e.spawnX=e.x;e.y=650-e.h;e.baseY=e.y;e.spawnY=e.y;}
  q.rebuildPlatformSpatialIndex();
  Object.assign(e,{alive:true,hp:100,maxHp:100,facing,vx:0,vy:0,grounded:true,combatStarted:true,hitStun:0,hurt:0,burnTimer:0,windup:0,cooldown:99,bossAction:null,bossShotPattern:null,
    halfPhaseTriggered:true,quarterPhaseTriggered:true,crisisPatternCooldown:99,followupPattern:null,reflectBreakTimer:0,reflectTimer:1,
    hunterClaspBroken:false,hunterClaspDashStarted:false,hunterClaspDashTimer:0,breakerStaggerTimer:0,hitShotId:-1,hitAttackId:-1});q.enemies.push(e);
  Object.assign(q.player,structuredClone(defaults),{x:e.x-180,y:650-defaults.h,vx:0,vy:0,hp:5,maxHp:5,grounded:true,invincible:99,attackTimer:0,attackCooldown:0,burstTimer:0,recoilTimer:0,shotgunCooldown:0,attackId:++serial,shotId:++serial,rewardPower:0,respawnCheckpointIndex:zone,respawnZone:zone,respawnStage:e.stageIndex});
  Object.assign(q.game,{mode:'playing',difficulty:'darkhorse',adminMode:false,adminCadetMode:false,bossReplay:null,tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],stage:e.stageIndex,zone,time:0,freeze:0,defeatedBosses:new Set(q.stages.slice(0,e.stageIndex).map(stage=>stage.bossKind))});
  q.clearGameplayInput();q.hidePanels();q.resetSlashCombo();window.MoonlitOperative?.resetMotion?.(q.player);
  return e;
}
function charge(e,pattern='breaker-laser'){q.startBossChargedShot(e,pattern,300,1.58);e.vx=0;e.windup=e.bossChargeDuration*.6;return q.getBossWeakParts(e);}
function pellet(x,y,vx=800,vy=0){return{x:x-4,y:y-2,w:8,h:4,vx,vy,life:2,enemy:false,kind:'shotgun',damage:1.15,shotId:++serial,piercing:false,color:'#fff'};}
function expose(e){e.reflectBreakTimer=1.6;e.reflectTimer=0;return q.getBossWeakParts(e)[0];}
function slashAt(e,front=false,wrongAim=false,preHit=false){
  const part=expose(e),cx=part.x+part.w/2,cy=part.y+part.h/2;
  q.player.x=e.x+e.w/2+(front?1:-1)*e.facing*95-q.player.w/2;
  q.player.y=e.y+e.h-q.player.h;q.player.attackCooldown=0;q.player.attackTimer=0;q.player.burstTimer=0;
  const aim={x:cx-q.player.x-q.player.w/2,y:cy-q.player.y-q.player.h/2};
  q.startAttack(wrongAim?{x:-aim.x,y:100}:aim);
  if(preHit)e.hitAttackId=q.player.attackId;
  for(let step=0;step<28&&!e.hunterClaspBroken;step++)q.updatePlayer(1/240);
  return e.hunterClaspBroken;
}
function test(name,body){try{body();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.stack});}}

test('cooling fins exist only during real breaker beam charges',()=>{
  const e=fixture();assert.equal(q.getBossWeakParts(e).length,0);
  charge(e,'warden-volley');assert.equal(q.getBossWeakParts(e).length,0);
  for(const pattern of ['breaker-laser','breaker-siege'])assert.equal(charge(e,pattern).length,2);
  e.windup=0;assert.equal(q.getBossWeakParts(e).length,0);e.windup=1;e.combatStarted=false;assert.equal(q.getBossWeakParts(e).length,0);
});
test('normal body shotgun damage never cancels the beam',()=>{
  const e=fixture();charge(e);const b=pellet(e.x+e.w/2,e.y+e.h*.6);assert(!q.tryHitBreakerCoolingFin(e,b));
  q.damageEnemyWithShotgun(e,b);assert.equal(e.bossShotPattern,'breaker-laser');assert(e.windup>0);assert(e.hp<100);assert(!e.breakerStaggerTimer);
});
for(const facing of [-1,1])for(const approach of [-1,1])test(`live pellet reaches the fin in the authored arena facing ${facing}, approach ${approach}`,()=>{
  const e=fixture('breaker',facing,true),parts=charge(e),fin=parts.find(p=>Math.sign(p.x+p.w/2-e.x-e.w/2)===approach);
  const b=pellet(fin.x+fin.w/2+approach*150,fin.y+fin.h/2,-approach*950);q.bullets.push(b);
  for(let frame=0;frame<120&&q.bullets.includes(b);frame++)q.updateBullets(1/120,[e]);
  assert.equal(e.bossAction,null);assert.equal(e.bossShotPattern,null);assert.equal(e.hp,100,'part hit is not body damage');assert(e.breakerStaggerTimer>0);assert(!q.bullets.includes(b));
});
test('live missed high shot cannot cancel a beam',()=>{
  const e=fixture('breaker',1,true),fin=charge(e)[0],b=pellet(fin.x-100,fin.y-40,900);q.bullets.push(b);
  for(let frame=0;frame<80;frame++)q.updateBullets(1/120,[e]);assert.equal(e.bossShotPattern,'breaker-laser');assert.equal(e.breakerStaggerTimer,0);
});
test('live center-body shot damages body but misses cooling fins',()=>{
  const e=fixture('breaker',1,true);charge(e);const b=pellet(e.x-140,e.y+e.h*.62,900);q.bullets.push(b);
  for(let frame=0;frame<100&&q.bullets.includes(b);frame++)q.updateBullets(1/120,[e]);assert(e.hp<100);assert.equal(e.bossShotPattern,'breaker-laser');
});
test('hostile, reflected and non-shotgun contacts cannot break fins',()=>{
  for(const props of [{enemy:true},{kind:'reflected-shotgun'},{kind:'burst'},{cancelled:true}]){
    const e=fixture(),f=charge(e)[0],b={...pellet(f.x+6,f.y+11),...props};assert(!q.tryHitBreakerCoolingFin(e,b));assert.equal(e.bossShotPattern,'breaker-laser');
  }
});
test('one interrupted charge has one stagger, and future charges can be interrupted again',()=>{
  const e=fixture();let f=charge(e)[0];assert(q.tryHitBreakerCoolingFin(e,pellet(f.x+6,f.y+11)));assert(!q.tryHitBreakerCoolingFin(e,pellet(f.x+6,f.y+11)));
  const hp=e.hp;for(let frame=0;frame<60;frame++)q.updateEnemy(e,1/60);assert(e.breakerStaggerTimer>0);assert.equal(q.bullets.length,0);assert.equal(e.hp,hp);
  for(let frame=0;frame<20;frame++)q.updateEnemy(e,1/60);assert.equal(e.breakerStaggerTimer,0);
  f=charge(e)[1];assert(q.tryHitBreakerCoolingFin(e,pellet(f.x+6,f.y+11)));
});
test('shield clasp is exposed only after the reflected shield flips behind',()=>{
  const e=fixture('hunter');assert.equal(q.getBossWeakParts(e).length,0);q.reflectShotgun(e);assert.equal(q.getBossWeakParts(e).length,0);
  expose(e);assert.equal(q.getBossWeakParts(e).length,1);e.reflectBreakTimer=.03;assert.equal(q.getBossWeakParts(e).length,0);e.reflectBreakTimer=0;assert.equal(q.getBossWeakParts(e).length,0);
});
test('overloaded hunter holds facing long enough to permit flanking',()=>{
  const e=fixture('hunter',1);expose(e);q.player.x=e.x-120;q.updateEnemy(e,1/60);assert.equal(e.facing,1);
  e.reflectBreakTimer=0;q.updateEnemy(e,1/60);assert.equal(e.facing,-1);
});
for(const facing of [-1,1])test(`aimed live slash can break rear clasp facing ${facing}`,()=>{
  const e=fixture('hunter',facing);assert(slashAt(e),'actual rendered steel must touch the exposed clasp');assert(q.hunterShieldDisabled(e));assert.equal(q.getBossWeakParts(e).length,0);
});
for(const facing of [-1,1])test(`rear clasp can be reached in the authored hunter arena facing ${facing}`,()=>{
  const e=fixture('hunter',facing,true);assert(slashAt(e));
});
test('front-side sword and badly aimed rear sword cannot break clasp',()=>{
  let e=fixture('hunter');assert(!slashAt(e,true));e=fixture('hunter');assert(!slashAt(e,false,true));
});
test('clasp contact is independent of the body once-per-swing damage guard',()=>{
  const e=fixture('hunter');assert(slashAt(e,false,false,true));assert.equal(e.hp,100);
});
test('burst and inactive sword cannot break the clasp',()=>{
  const e=fixture('hunter');expose(e);q.player.x=e.x-95;q.player.burstTimer=1;assert(!q.tryHitHunterClasp(e));q.player.burstTimer=0;q.player.attackTimer=0;assert(!q.tryHitHunterClasp(e));
});
test('clasp break preserves shotgun vulnerability until exactly the next dash finishes',()=>{
  const e=fixture('hunter');assert(slashAt(e));e.reflectBreakTimer=0;e.hitStun=0;
  q.damageEnemyWithShotgun(e,pellet(e.x+20,e.y+40));assert(e.hp<100);assert.equal(q.bullets.filter(b=>b.enemy).length,0);
  e.hitStun=0;e.bossAction='reflectRush';e.windup=.105;e.cooldown=99;e.dashDirection=1;e.followupPattern=null;e.retreatTimer=0;e.pendingRetreatTimer=0;
  q.updateBoss(e,.01,300,300);assert(e.hunterClaspDashStarted);assert(q.hunterShieldDisabled(e));
  q.updateBossWeakParts(e,.79);assert(q.hunterShieldDisabled(e));q.updateBossWeakParts(e,.02);assert(!q.hunterShieldDisabled(e));
  const hp=e.hp;q.damageEnemyWithShotgun(e,pellet(e.x+20,e.y+40));assert.equal(e.hp,hp);assert.equal(q.bullets.filter(b=>b.enemy).length,3);
});
test('even enhanced shotgun cannot finish hunter, while sword can',()=>{
  const e=fixture('hunter');expose(e);e.hp=2.2;const b=pellet(e.x+20,e.y+40);b.damage=20;b.piercing=true;q.damageEnemyWithShotgun(e,b);assert.equal(e.hp,1);assert(e.alive);
  q.damageEnemyWithShotgun(e,pellet(e.x+20,e.y+40));assert.equal(e.hp,1);q.player.attackId++;q.damageEnemy(e);assert(!e.alive);
});
test('burst and returned non-blade rounds also leave hunter at 1 HP',()=>{
  for(const source of ['burst','reflected']){
    const e=fixture('hunter');expose(e);e.hp=1.4;
    if(source==='burst')q.damageEnemy(e,{source:'burst'});
    else {const b=pellet(e.x+20,e.y+40);b.kind='reflected-shotgun';b.damage=5;q.damageEnemyWithShotgun(e,b);}
    assert.equal(e.hp,1);assert(e.alive);
  }
});
test('flame damage applied by a sword may finish hunter',()=>{
  const e=fixture('hunter');e.hp=.01;e.burnTimer=1;e.burnTickTimer=.001;q.updateEnemyBurn(e,.02);assert(!e.alive);
});
test('other bosses retain ordinary lethal shotgun behavior',()=>{
  const e=fixture();e.hp=.5;q.damageEnemyWithShotgun(e,pellet(e.x+20,e.y+40));assert(!e.alive);
});
test('checkpoint respawn resets temporary weak-part state',()=>{
  const e=fixture('hunter');e.hunterClaspBroken=true;e.hunterClaspDashStarted=true;e.hunterClaspDashTimer=.5;e.breakerStaggerTimer=1;
  q.respawn();assert(!e.hunterClaspBroken);assert(!e.hunterClaspDashStarted);assert.equal(e.breakerStaggerTimer,0);
});

if(canvas){
  const ctx=q.ctx;ctx.fillStyle='#08141e';ctx.fillRect(0,0,1440,680);ctx.font='bold 24px sans-serif';ctx.fillStyle='#e0edf0';ctx.fillText('Actual boss weak parts — normal / exposed / interrupted',24,34);
  const cases=[['breaker','NORMAL'],['breaker','COOLING FINS OPEN'],['breaker','BEAM INTERRUPTED'],['hunter','FRONT SHIELD'],['hunter','REAR CLASP EXPOSED'],['hunter','CLASP BROKEN']];
  cases.forEach(([kind,label],index)=>{
    const e=fixture(kind,1),col=index%3,row=Math.floor(index/3),x=col*480,y=55+row*305;
    if(index===1||index===2)charge(e);if(index===2){const f=q.getBossWeakParts(e)[0];q.tryHitBreakerCoolingFin(e,pellet(f.x+6,f.y+11));}
    if(index===4||index===5)expose(e);if(index===5){e.hunterClaspBroken=true;e.reflectTimer=0;}
    ctx.fillStyle='#102633';ctx.fillRect(x+12,y,456,285);ctx.fillStyle='#dbe9ee';ctx.font='bold 17px sans-serif';ctx.fillText(label,x+26,y+26);
    ctx.save();ctx.beginPath();ctx.rect(x+12,y,456,285);ctx.clip();ctx.translate(x+205,y+65);ctx.scale(2.3,2.3);ctx.translate(-e.x-e.w/2,-e.y);q.drawEnemy(e);ctx.restore();
  });
  const out=path.resolve('..','..','outputs','v3.10.0-review','boss-weakpoints.png');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,canvas.toBuffer('image/png'));console.log('RENDER '+out);
}
const failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);for(const r of failed)console.error(r.error);
console.log(`Weakpoint QA: ${results.length-failed.length}/${results.length} passed`);process.exitCode=failed.length?1:0;
module.exports={q,fixture,slashAt,expose};
