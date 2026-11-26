// Within-frame gun/steel timing, including the last frame of an active slash.
// Fixture geometry is derived from the real operative renderer, not aim boxes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const file of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__GUN_TIMING__={player,game,keys,pressed,enemies,bullets,platforms,hazards,pickups,
  boostNodes,combatRooms,snowPatches,particles,startAttack,updatePlayer,updateBullets,fireBullet,
  refreshSlashContact,slashSegmentHitsRect,rebuildPlatformSpatialIndex,clearGameplayInput,
  updateTutorialDeflectDrill,createTutorialSignals,TUTORIAL_STEPS,STAGE_BULLET_PRESSURE,difficultySettings,
  hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;
    adminDifficultyPanel.hidden=true;startScreenEditor.hidden=true;}};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-gun-timing-test.js'});
const q=window.__GUN_TIMING__,original=structuredClone(q.player),results=[],evidence=[];
let serial=20000;
function setup(dt,facing=1){
  for(const list of [q.enemies,q.bullets,q.platforms,q.hazards,q.pickups,q.boostNodes,q.combatRooms,q.snowPatches,q.particles])list.length=0;
  q.rebuildPlatformSpatialIndex();q.clearGameplayInput();q.hidePanels();
  Object.assign(q.game,{mode:'playing',difficulty:'darkhorse',stage:0,zone:0,adminMode:false,adminCadetMode:false,
    bossReplay:null,tutorialActive:false,tutorialCompleted:true,cutscene:null,story:null,storyQueue:[],
    freeze:0,shake:0,time:2,controlsReversed:false,screenFlipActive:false});
  Object.assign(q.player,structuredClone(original),{x:1800,y:350,vx:0,vy:0,grounded:false,hp:5,maxHp:5,
    attackId:serial++,attackTimer:0,attackCooldown:0,queuedAction:null,motionPose:null,shotgunCharge:0,
    airJumpAvailable:false,crossShotTimer:0,burstTimer:0,invincible:0,facing});
  q.startAttack({x:facing,y:0});
  // The active window closes 45% through this frame, not at its end.
  q.player.attackTimer=q.player.attackDuration*.2+dt*.45;
  q.player.vx=facing*90;q.player.vy=0;q.player.squash=0;
  q.refreshSlashContact();
}
function poseBetween(a,b,t){
  const p={...a};
  for(const key of ['x','y','vx','vy','attackTimer','runCycle','squash'])p[key]=a[key]+(b[key]-a[key])*t;
  if(a.motionPose&&b.motionPose){p.motionPose={};for(const key of ['ground','vy','squash','wall'])p.motionPose[key]=a.motionPose[key]+(b.motionPose[key]-a.motionPose[key])*t;}
  return p;
}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function trajectory(dt,facing,late){
  setup(dt,facing);const a=structuredClone(q.player);q.updatePlayer(dt);const b=structuredClone(q.player);
  const samples=Array.from({length:121},(_,i)=>{
    const t=i/120,p=poseBetween(a,b,t),progress=1-p.attackTimer/p.attackDuration;
    return {t,p,blade:progress>.14&&progress<.8?window.MoonlitOperative.sampleBlade(p,q.game,p.facing):null};
  });
  const hitFraction=late?.85:.22,old=samples[Math.round((late?.12:hitFraction)*120)].blade;
  assert(old,'reference steel is active before recovery');
  // Search a tiny deterministic family for a moving point round that either
  // meets live steel, or reaches the same former location only after recovery.
  for(const along of [.98,.8,.6,.35])for(const offset of [0,-6,6,-10,10])for(const speed of [330,470,660,920])for(let angle=0;angle<32;angle++){
    const dx=old.tip.x-old.base.x,dy=old.tip.y-old.base.y,len=Math.hypot(dx,dy);
    const x=old.base.x+dx*along-dy/len*offset,y=old.base.y+dy*along+dx/len*offset;
    const vx=Math.cos(angle*Math.PI/16)*speed,vy=Math.sin(angle*Math.PI/16)*speed;
    const shot={x:x-vx*dt*hitFraction-5,y:y-vy*dt*hitFraction-5,w:10,h:10,vx,vy};
    // Prevent the old stationary-round sweep from satisfying the test accidentally.
    if(samples.some(s=>s.blade&&q.slashSegmentHitsRect(s.blade,shot)))continue;
    const contacts=samples.filter(s=>s.blade&&q.slashSegmentHitsRect(s.blade,{...shot,x:shot.x+vx*dt*s.t,y:shot.y+vy*dt*s.t}));
    if(late?contacts.length!==0:contacts.length<2)continue;
    if(samples.some(s=>overlap(s.p,{...shot,x:shot.x+vx*dt*s.t,y:shot.y+vy*dt*s.t})))continue;
    const lateRect={...shot,x:shot.x+vx*dt*hitFraction,y:shot.y+vy*dt*hitFraction};
    if(late&&!q.slashSegmentHitsRect(old,lateRect))continue;
    return {shot,firstContact:contacts[0]?.t??null,lastContact:contacts.at(-1)?.t??null,oldHit:hitFraction};
  }
  throw new Error(`No valid ${late?'late':'active'} fixture at ${1/dt}Hz, facing ${facing}`);
}
function emit(shot){
  const cx=shot.x+5,cy=shot.y+5,speed=Math.hypot(shot.vx,shot.vy);
  // Real gun emission supplies all lifetime, ownership, shape and damage fields.
  const scale=q.STAGE_BULLET_PRESSURE[0]*q.difficultySettings.darkhorse.bulletSpeed;
  q.fireBullet({x:cx-20,y:cy-58*.38,w:40,h:58,type:'gunner',stageIndex:0},speed/scale,0,'standard',
    {x:cx+shot.vx,y:cy+shot.vy});
  const bullet=q.bullets.at(-1);bullet.ownerZone=0;
  assert(Math.abs(bullet.vx-shot.vx)<1e-7&&Math.abs(bullet.vy-shot.vy)<1e-7,'actual emission preserves planned trajectory');
  return bullet;
}
function test(name,run){try{run();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}}
for(const hz of [30,144])for(const facing of [-1,1])for(const late of [false,true])test(`${hz}Hz facing ${facing}: ${late?'old steel is not active later':'last active slice still cuts'}`,()=>{
  const dt=1/hz,fixture=trajectory(dt,facing,late);
  setup(dt,facing);const bullet=emit(fixture.shot);
  q.updatePlayer(dt);assert(1-q.player.attackTimer/q.player.attackDuration>.8,'frame ends in recovery');
  q.updateBullets(dt,[]);
  if(late){assert(q.bullets.includes(bullet),'round passing only an old blade position must survive');assert.equal(q.player.shotgunCharge,0);}
  else {assert(!q.bullets.includes(bullet),'synchronized contact before recovery must delete the round');assert(q.player.shotgunCharge>0);assert(q.player.airJumpAvailable);}
  assert.equal(q.player.hp,5);
  evidence.push({hz,facing,late,firstContact:fixture.firstContact,lastContact:fixture.lastContact,speed:Math.round(Math.hypot(fixture.shot.vx,fixture.shot.vy))});
});

test('real training-round contact marks only the deflection drill',()=>{
  setup(1/60,1);q.player.x=3300;
  Object.assign(q.game,{tutorialActive:true,tutorialCompleted:false,tutorialStep:q.TUTORIAL_STEPS.findIndex(s=>s.id==='deflect'),tutorialSignals:q.createTutorialSignals(),tutorialDeflectTimer:0});
  const step=q.TUTORIAL_STEPS[q.game.tutorialStep];q.updateTutorialDeflectDrill(0,step);
  const bullet=q.bullets.at(-1);assert.equal(bullet.kind,'training-round');assert(bullet.harmless);
  q.player.attackTimer=q.player.attackDuration*.55;
  const blade=window.MoonlitOperative.sampleBlade(q.player,q.game,q.player.facing);
  bullet.x=(blade.base.x+blade.tip.x)/2-bullet.w/2;bullet.y=(blade.base.y+blade.tip.y)/2-bullet.h/2;
  q.updatePlayer(0);q.updateBullets(0,[]);
  assert(!q.bullets.includes(bullet));assert.equal(q.game.tutorialSignals.deflect,true);
  assert.equal(q.game.tutorialSignals.burst,false);assert.equal(q.game.tutorialSignals.shotgun,false);
});
const failures=results.filter(r=>!r.ok);
console.log(JSON.stringify({suite:'gun-within-frame-timing',passed:results.length-failures.length,total:results.length,failures,evidence},null,2));
if(failures.length)process.exitCode=1;
