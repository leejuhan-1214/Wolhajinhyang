// Real campaign/renderer checks for optional scar investigation and final payoff.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const file of ['operative-renderer.js','story-data.js','echo-marks.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__SCAR_QA__={game,player,ctx,camera,checkpoints,platforms,hazards,zones,enemies,bullets,keys,pressed,sound,
  CUTSCENE_EVENT_BY_ID,BOSS_INTRO_CUTSCENE_IDS,startCutscene,advanceCutscene,updateCutscene,requestCutsceneAdvance,
  drawCutscene,drawWorld,updatePlayer,isBossIntroLocked,startBossSignatureIntro,getBossSignatureShot,
  countRenderedCombatEcho(){let n=0;const original=drawEnemy;drawEnemy=(e)=>{if(e.alive&&e.bossKind==='echo')n++;return original(e);};try{drawWorld();}finally{drawEnemy=original;}return n;}};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-scar-qa.js'});
const q=window.__SCAR_QA__,m=window.MoonlitEchoMarks,results=[];
const test=(name,run)=>{try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}};
const marks=m.getMarks(q.checkpoints,q.platforms,q.hazards);
const basePlayer={...q.player};
function clean(){Object.assign(q.game,{mode:'playing',adminMode:false,adminCadetMode:false,cutscene:null,story:null,
  tutorialActive:false,tutorialOpen:false,bossReplay:null,cutsceneSeen:new Set(),time:100,freeze:0,shake:0,flash:0});
  Object.assign(q.player,basePlayer,{attackTimer:0,recoilTimer:0,crossShotTimer:0,slashComboActive:false,motionPose:null});q.keys.clear();q.pressed.clear();}
test('four real clear-floor marks, outside tutorial and freight zone',()=>{
  assert.deepEqual(marks.map(s=>s.zone),[1,10,18,26]);
  for(const s of marks){
    assert(s.x>q.zones[s.zone].x&&s.x<q.zones[s.zone].end);
    assert(q.platforms.some(p=>!p.hidden&&p.y===s.floorY&&p.x<=s.x-47&&p.x+p.w>=s.x+47));
    assert(!q.platforms.some(p=>!p.hidden&&p.x<s.bounds.x+s.bounds.w&&p.x+p.w>s.bounds.x&&p.y<s.bounds.y+s.bounds.h&&p.y+p.h>s.bounds.y));
  }
});
test('steady-state draw does not rescan world surfaces',()=>{
  // The cached path may read length, but no iterator or collision scan.
  const guarded=new Proxy(q.platforms,{get(target,key){
    if(key===Symbol.iterator||key==='some')throw new Error('world rescan during cached draw');
    return Reflect.get(target,key);
  }});
  assert.equal(m.getMarks(q.checkpoints,guarded,q.hazards),marks);
  for(let i=0;i<20;i++)m.drawWorld(q.ctx,{game:q.game,player:q.player,checkpoints:q.checkpoints,platforms:guarded,hazards:q.hazards,left:marks[0].x-100,right:marks[0].x+100});
});
test('actual visible steel can discover the Act1 mark',()=>{
  clean();const mark=marks[0];assert(mark);q.game.zone=mark.zone;
  let found=null;
  for(const offset of [35,50,65,80])for(const phase of [.22,.35,.5,.65,.78]){
    const p={...q.player,x:mark.x-offset,y:mark.floorY-q.player.h,grounded:true,vx:0,vy:0,facing:1,
      attackDuration:.4,attackTimer:.4*(1-phase),attackDir:{x:1,y:0}};
    const blade=window.MoonlitOperative.sampleBlade(p,q.game,1);
    if(blade&&m.inspectBlade({game:q.game,player:p,segments:[blade],checkpoints:q.checkpoints,platforms:q.platforms,hazards:q.hazards}))found={p,blade};
  }
  assert(found,'physical renderer blade must reach a mark from the floor');
  assert.equal(q.game.cutscene,null);assert.equal(q.game.story,null);assert.equal(q.game.shake,0);
});
test('misses, distant/wrong-zone blades, admin and cutscenes do not investigate',()=>{
  clean();const mark=marks[1],segment={base:{x:mark.x-40,y:mark.y},tip:{x:mark.x+40,y:mark.y}};
  const p={...q.player,x:mark.x-50,y:mark.floorY-q.player.h};
  const args={game:q.game,player:p,segments:[segment],checkpoints:q.checkpoints,platforms:q.platforms,hazards:q.hazards};
  q.game.zone=0;assert.equal(m.inspectBlade(args),false);
  q.game.zone=mark.zone;q.game.adminMode=true;assert.equal(m.inspectBlade(args),false);
  q.game.adminMode=false;q.game.cutscene={};assert.equal(m.inspectBlade(args),false);
  q.game.cutscene=null;assert.equal(m.inspectBlade({...args,segments:[]}),false);
  assert.equal(m.inspectBlade({...args,player:{...p,x:mark.x-900}}),false);
  assert(m.inspectBlade(args));assert.equal(m.inspectBlade(args),false,'one short trace, not retriggered each frame');
});
test('the real active-sword update invokes the optional investigation API',()=>{
  clean();const mark=marks[2];q.game.zone=mark.zone;q.game.stage=2;
  Object.assign(q.player,{x:mark.x-55,y:mark.floorY-q.player.h,grounded:true,vx:0,vy:0,attackTimer:.2,attackDuration:.4,attackDir:{x:1,y:0}});
  let calls=0;window.MoonlitEchoMarks={...m,inspectBlade(args){calls++;assert(Array.isArray(args.segments));return m.inspectBlade(args);}};
  try{q.updatePlayer(.001);}finally{window.MoonlitEchoMarks=m;}
  assert(calls>0);
});
test('nearby scar tap can use existing mobile melee without catching distant taps',()=>{
  clean();const s=marks[0];q.game.zone=s.zone;
  const context={game:q.game,player:{...q.player,x:s.x-70,y:s.floorY-q.player.h},checkpoints:q.checkpoints,platforms:q.platforms,hazards:q.hazards};
  assert(m.wantsInspectAt(s.x,s.y,context));
  assert(!m.wantsInspectAt(s.x+150,s.y,context));
  assert(!m.wantsInspectAt(s.x,s.y,{...context,player:{...context.player,x:s.x-600}}));
  q.game.adminMode=true;assert(!m.wantsInspectAt(s.x,s.y,context));
});
test('only final Echo introduction adds one wordless recognition beat',()=>{
  clean();const original=q.CUTSCENE_EVENT_BY_ID.get(q.BOSS_INTRO_CUTSCENE_IDS.echo),before=JSON.stringify(original);
  q.startCutscene(original);
  assert.equal(q.game.cutscene.shots[0].echoScarRecall,true);assert.equal(q.game.cutscene.shots[0].text,'');
  assert.equal(q.game.cutsceneTimer,2.7);assert.equal(q.game.cutscene.shots.length,original.shots.length+2);
  m.prepareScene(q.game.cutscene);assert.equal(q.game.cutscene.shots.length,original.shots.length+2);
  assert.equal(JSON.stringify(original),before);
  q.game.cutscene=null;
  q.startCutscene(q.CUTSCENE_EVENT_BY_ID.get(q.BOSS_INTRO_CUTSCENE_IDS.proxy));
  assert(!q.game.cutscene.shots.some(s=>s.echoScarRecall),'doctor is not the final Echo duel');
});
test('skip and completion keep original scene ID and combat gate',()=>{
  clean();const original=q.CUTSCENE_EVENT_BY_ID.get(q.BOSS_INTRO_CUTSCENE_IDS.echo);
  const boss=q.enemies.find(e=>e.bossKind==='echo');assert(boss);boss.combatStarted=false;
  q.startCutscene(original);assert(q.isBossIntroLocked(boss));
  q.game.cutsceneShotElapsed=.3;q.requestCutsceneAdvance();
  assert.equal(q.game.cutscene.shots[q.game.cutsceneShotIndex].text,original.shots[0].text);
  while(q.game.cutscene)q.advanceCutscene();
  assert(q.game.cutsceneSeen.has(original.id));q.startCutscene(original);assert.equal(q.game.cutscene,null);
});
test('replay practice keeps its short signature and no story replay',()=>{
  clean();const boss=q.enemies.find(e=>e.bossKind==='echo');q.game.bossReplay={kind:'echo'};
  assert(q.startBossSignatureIntro(boss,{replay:true}));
  assert(q.getBossSignatureShot());assert(!q.game.cutscene.shots.some(s=>s.echoScarRecall));
});
test('same three ordered geometries and exactly three synchronous sound cues',()=>{
  assert.equal(m.CUTS.length,3);assert.equal(new Set(m.CUTS.map(c=>JSON.stringify(c))).size,3);
  assert.deepEqual([.5,1.2,1.9].map(t=>m.recallBeat(t).index),[0,1,2]);
  const scene={},shot={echoScarRecall:true};let n=0;
  for(const t of [0,.3,.5,1,1.1,1.7,2.6,3])m.updateRecall(scene,shot,t,{noise(){n++;},tone(){}});
  assert.equal(n,3);assert.equal(scene.echoScarCue,3);
});
test('recall renders exactly one Echo actor and suppresses the combat double',()=>{
  clean();const boss=q.enemies.find(e=>e.bossKind==='echo');
  Object.assign(q.player,{x:boss.x-310,y:boss.y+boss.h-q.player.h,grounded:true});
  q.camera.x=boss.x-700;q.camera.y=Math.max(0,q.player.y-360);
  q.startCutscene(q.CUTSCENE_EVENT_BY_ID.get(q.BOSS_INTRO_CUTSCENE_IDS.echo));
  q.game.cutsceneShotElapsed=.52;
  assert.equal(q.countRenderedCombatEcho(),0,'dormant combat body must be hidden');
  const original=window.MoonlitOperative;let echoDraws=0;
  window.MoonlitOperative={...original,createRenderer(...args){const draw=original.createRenderer(...args);return(...pose)=>{if(pose[5]==='echo')echoDraws++;return draw(...pose);};}};
  try{q.drawCutscene();}finally{window.MoonlitOperative=original;}
  assert.equal(echoDraws,1,'only the actual pose-rendered cinematic Echo should appear');
});
test('pixel rendering is finite/balanced and cutscene actor never mutates player',()=>{
  clean();const original=q.CUTSCENE_EVENT_BY_ID.get(q.BOSS_INTRO_CUTSCENE_IDS.echo);q.startCutscene(original);
  let depth=0,rects=0;const saved={};
  for(const method of ['save','restore','fillRect','translate','scale','rotate','ellipse','arc','moveTo','lineTo']){
    saved[method]=q.ctx[method];q.ctx[method]=(...args)=>{
      for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),`${method}: finite`);
      if(method==='save')depth++;if(method==='restore')assert(--depth>=0);if(method==='fillRect')rects++;
      return saved[method](...args);
    };
  }
  const before=JSON.stringify(q.player),bullets=q.bullets.length;
  try{
    for(const t of [0,.5,1.2,1.9,2.69]){q.game.cutsceneShotElapsed=t;q.drawCutscene();}
    const s=marks[0];m.drawWorld(q.ctx,{game:q.game,player:q.player,checkpoints:q.checkpoints,platforms:q.platforms,hazards:q.hazards,left:s.x-100,right:s.x+100});
  }finally{for(const method of Object.keys(saved))q.ctx[method]=saved[method];}
  assert.equal(depth,0);assert(rects>200);assert.equal(JSON.stringify(q.player),before);assert.equal(q.bullets.length,bullets);
});
console.log(JSON.stringify({suite:'echo-marks',passed:results.filter(r=>r.ok).length,total:results.length,marks:marks.map(({zone,x,y})=>({zone,x,y})),results},null,2));
if(results.some(r=>!r.ok))process.exitCode=1;
