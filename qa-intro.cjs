// Real campaign scene sequencing with test-only hooks; no production test API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// Reuse only the browser stub, not unrelated release/population expectations.
const browserStub=fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0];
new Function('require',browserStub)(require);
vm.runInThisContext(fs.readFileSync('operative-renderer.js','utf8'),{filename:'operative-renderer.js'});
vm.runInThisContext(fs.readFileSync('story-data.js','utf8'),{filename:'story-data.js'});
const source = fs.readFileSync('game.js', 'utf8');
const hook = `window.__INTRO_QA__ = {game, player, enemies, bullets, particles, camera, ctx, sound,
  BOSS_SIGNATURE_INTROS, BOSS_INTRO_CUTSCENE_IDS, CUTSCENE_EVENT_BY_ID,
  startCutscene, advanceCutscene, updateCutscene, requestCutsceneAdvance,
  startBossSignatureIntro, getBossSignatureShot, getBossSignatureEnemy,
  drawBossSignatureActor, drawCutscene, update, isBossIntroLocked, holdBossUntilIntroEnds,
  hidePanels(){game.tutorialOpen=false;adminSpawnPanel.hidden=true;adminZonePanel.hidden=true;adminDifficultyPanel.hidden=true;},
};`;
vm.runInThisContext(source.replace(/\}\)\(\);\s*$/, hook + '\n})();'), {filename:'game-intro-test.js'});
const q = window.__INTRO_QA__;
const templates = new Map(q.enemies.filter(enemy=>enemy.type==='boss'&&!enemy.adminSpawned).map(enemy=>[enemy.bossKind,{...enemy}]));
const originalPlayer={...q.player};
let cueCount=0,saveCount=0;
const cues=[];
q.sound.tone=(...args)=>{cueCount++;cues.push(['tone',...args]);};
q.sound.noise=(...args)=>{cueCount++;cues.push(['noise',...args]);};
const setItem=localStorage.setItem.bind(localStorage);
localStorage.setItem=(key,value)=>{if(key==='moonlit-echo-campaign-v1')saveCount++;setItem(key,value);};
let words=0,depth=0,drawCalls=0;
for(const method of ['save','restore','translate','scale','rotate','fillRect','strokeRect','moveTo','lineTo','arc','ellipse','quadraticCurveTo','fill','stroke','fillText']) {
  const original=q.ctx[method];
  q.ctx[method]=(...args)=>{
    for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),`${method} must use finite geometry`);
    if(method==='save')depth++;
    if(method==='restore')assert(--depth>=0,'signature drawing must balance its canvas state');
    if(method==='fillText')words++;
    drawCalls++;
    return original(...args);
  };
}
function fixture(kind) {
  const enemy={...templates.get(kind),combatStarted:false,bossAction:'idle',windup:0,cooldown:0,vx:0,vy:0,alive:true};
  assert(enemy.type==='boss',`real campaign boss required for ${kind}`);
  q.enemies.splice(0,q.enemies.length,enemy);q.bullets.length=0;q.particles.length=0;
  const event=q.CUTSCENE_EVENT_BY_ID.get(q.BOSS_INTRO_CUTSCENE_IDS[kind]);
  Object.assign(q.player,originalPlayer,{x:event.x+1,y:enemy.y+enemy.h-originalPlayer.h,hp:5,maxHp:5,vx:0,vy:0,grounded:true,attackTimer:0});
  Object.assign(q.game,{mode:'playing',adminMode:false,adminCadetMode:false,bossReplay:null,cutscene:null,story:null,storyQueue:[],
    tutorialActive:false,tutorialCompleted:true,cutsceneSeen:new Set(),freeze:0,shake:0,flash:0,stage:enemy.stageIndex,zone:enemy.homeZoneIndex});
  q.hidePanels();q.camera.x=enemy.x-700;q.camera.y=Math.max(0,enemy.y-400);
  return{enemy,event};
}
const kinds=Object.keys(q.BOSS_SIGNATURE_INTROS);
assert.equal(kinds.length,10,'every campaign boss needs its own wordless signature');
assert.equal(new Set(kinds.map(kind=>q.BOSS_SIGNATURE_INTROS[kind].motif)).size,10,'boss signatures must be distinguishable');
let renderedFrames=0;
for(const kind of kinds) {
  const {enemy,event}=fixture(kind);
  const originalShots=JSON.stringify(event.shots),count=event.shots.length;
  q.startCutscene(event);
  assert.equal(q.game.cutscene.shots.length,count+1,'one signature must follow the existing dialogue');
  assert.equal(JSON.stringify(event.shots),originalShots,'source story must not be mutated');
  assert(q.isBossIntroLocked(enemy),'dialogue must retain the combat gate');
  for(let shot=0;shot<count;shot++)q.advanceCutscene();
  const signature=q.getBossSignatureShot();
  assert.equal(signature.bossSignature,kind);
  assert.equal(signature.text,'','signature scenes must be wordless');
  assert(signature.duration>=1.4&&signature.duration<=1.8,'intros must remain short');
  assert(q.isBossIntroLocked(enemy),'a signature must finish before combat unlocks');
  assert(!q.game.cutsceneSeen.has(event.id),'completion must not be saved before the signature');
  const bossBefore=JSON.stringify(enemy),playerBefore=[q.player.x,q.player.y,q.player.hp];
  const shotsBefore=q.bullets.length;
  for(const progress of[0,.18,.36,.55,.78,.99]) {
    q.game.cutsceneShotElapsed=signature.duration*progress;
    words=0;
    q.drawBossSignatureActor(enemy);
    q.drawCutscene();
    assert.equal(words,0,`${kind}: signature drawing must not add captions or speech panels`);
    assert.equal(depth,0,'all signature drawing must restore canvas state');
    assert.equal(JSON.stringify(enemy),bossBefore,'intro presentation must not alter the live boss');
    assert.deepEqual([q.player.x,q.player.y,q.player.hp],playerBefore,'intro drawing must not move or hurt the player');
    assert.equal(q.bullets.length,shotsBefore,'intro effects must not be live projectiles');
    renderedFrames++;
  }
  q.game.cutsceneShotElapsed=.1;q.game.cutsceneTimer=signature.duration-.1;
  const beforePause=q.game.cutsceneShotElapsed,beforePauseCues=cueCount;
  q.game.mode='paused';q.update(.25);
  assert.equal(q.game.cutsceneShotElapsed,beforePause,'pause must freeze signature timing');
  assert.equal(cueCount,beforePauseCues,'pause must not schedule signature audio');
  q.game.mode='playing';
  for(let frame=0;q.game.cutscene&&frame<150;frame++)q.update(1/60);
  assert.equal(q.game.cutscene,null,`${kind}: signature must automatically finish`);
  assert(q.game.cutsceneSeen.has(event.id),'campaign dialogue and signature share one completion flag');
  assert(!q.isBossIntroLocked(enemy),'combat must unlock after the complete scene');
  assert.equal(q.game.shake,0,'signature must never add screen shake');
  assert.equal(q.bullets.length,0,'waiting boss must not shoot during its intro');
  assert.deepEqual([q.player.x,q.player.y,q.player.hp],playerBefore,'cutscene update must preserve the player body');
  const savesBeforeReplay=saveCount,seenBefore=[...q.game.cutsceneSeen];
  q.game.bossReplay={kind};
  assert(q.startBossSignatureIntro(enemy,{replay:true}),'practice must be able to replay a seen boss intro');
  q.game.cutsceneShotElapsed=.1;q.requestCutsceneAdvance();
  assert(q.game.cutscene,'a held transition input must not immediately skip the new intro');
  q.game.cutsceneShotElapsed=.3;q.requestCutsceneAdvance();
  assert.equal(q.game.cutscene,null,'mouse/touch/keyboard advance must skip a started signature');
  assert.equal(saveCount,savesBeforeReplay,'practice intros must not overwrite campaign saves');
  assert.deepEqual([...q.game.cutsceneSeen],seenBefore,'practice intros must not change campaign completion flags');
  assert.equal(JSON.stringify(event.shots),originalShots,'replays must not duplicate appended shots');
}
const {enemy:removed}=fixture('breaker');
q.startBossSignatureIntro(removed,{replay:true});removed.alive=false;q.updateCutscene(.05);
assert.equal(q.game.cutscene,null,'an editor-deleted boss must not strand the intro');
assert(cues.some(cue=>cue[0]==='noise'&&cue[3]>=680&&cue[3]<=905),'tracked intro must include its short audible rattle');
assert(drawCalls>1000,'tests must exercise the real authored boss geometry');
console.log(JSON.stringify({bossIntros:'passed',uniqueSignatures:kinds.length,renderedFrames,campaignSaveWrites:saveCount,screenShake:false}));
