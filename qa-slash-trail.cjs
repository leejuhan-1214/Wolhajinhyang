// The wide visual crescent communicates existing damage; it must never deal it.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {recordingContext}=require('./qa-operative.cjs');
let currentRecord=recordingContext();
const drawProxy=new Proxy({}, {get:(_,key)=>currentRecord.context[key],set:(_,key,value)=>{currentRecord.context[key]=value;return true;}});
let harness=fs.readFileSync(`${__dirname}/qa-cross-combo.cjs`,'utf8').split('function test(name,body)')[0];
harness=harness.replace("const source = fs.readFileSync('game.js', 'utf8');", "document.getElementById('game').getContext=()=>drawProxy;\nconst source = fs.readFileSync('game.js', 'utf8');");
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  'player,game,crossChain,keys,pressed,pointer,camera,samplePlayerSlashTrail,drawPlayerSlashTrail,drawPlayer,attackBox,');
const {q,fixture}=new Function('require','drawProxy',harness+'\nreturn {q,fixture};')(require,drawProxy);
const before=()=>JSON.stringify({player:q.player,chain:q.crossChain,enemies:q.enemies,bullets:q.bullets,time:q.game.time,shake:q.game.shake});
function pose({facing=1,vertical=0,grounded=true,combo=-1,progress=.5,stage=0}={}){
  fixture();Object.assign(q.player,{x:400,y:grounded?650-q.player.h:300,facing,grounded,vx:0,vy:grounded?0:-210,
    attackDir:{x:Math.sqrt(1-vertical*vertical)*facing,y:vertical},attackDuration:combo<0?.23:[.22,.24,.28][combo],
    slashComboActive:combo>=0,slashComboIndex:Math.max(0,combo),slashComboCarry:0,slashComboLinked:false,
    slashComboEntry:null,slashComboRecovery:0,slashChain:grounded?Math.max(1,combo+1):0,
    recoilTimer:0,crossShotTimer:0,invincible:0,runCycle:1.4,motionPose:null,squash:0});
  q.player.attackTimer=q.player.attackDuration*(1-progress);q.game.stage=stage;
}
let poseCases=0,renderedCases=0;
for(const facing of[-1,1])for(const grounded of[false,true])for(const vertical of[-1,-.82,0,.82,1])for(const combo of[-1,0,1,2]){
  let maxReach=0,lastPoints=null,animated=false;
  for(const progress of[.24,.3,.38,.45,.52,.6,.69,.76,.795]){
    pose({facing,grounded,vertical,combo,progress});const snapshot=before();
    const trail=q.samplePlayerSlashTrail();
    assert.equal(before(),snapshot,'sampling cannot mutate combat, chain, projectiles or camera shake');
    if(!trail)continue;
    assert(trail.alpha>0&&trail.alpha<=1,'alpha must fade safely without additive overflow');
    const points=trail.ribbon;
    assert(points.length>=46,'crescent must use a tapered sampled ribbon, not a four-corner rectangle');
    for(const p of [...points,...trail.rim,...trail.glow]){
      assert(Number.isFinite(p.x)&&Number.isFinite(p.y),'all trajectory coordinates must remain finite');
      assert(p.x>=trail.box.x-.001&&p.x<=trail.box.x+trail.box.w+.001&&p.y>=trail.box.y-.001&&p.y<=trail.box.y+trail.box.h+.001,
        'main arc may not falsely indicate damage beyond the existing hitbox');
      const along=(p.x-trail.center.x)*trail.axis.x+(p.y-trail.center.y)*trail.axis.y;
      assert(along>0,'a directional slash must not surround or trail behind the whole player');
      maxReach=Math.max(maxReach,along/trail.reach);
    }
    const pixelKey=JSON.stringify(points);if(lastPoints&&lastPoints!==pixelKey)animated=true;lastPoints=pixelKey;
    const steel=window.MoonlitOperative.sampleBlade(q.player,q.game,facing);
    if(steel)assert(Math.hypot(trail.hand.x-steel.base.x,trail.hand.y-steel.base.y)<.001,'root of wide trail must stay on the real sword hand');
    assert.equal(trail.rootJoin.length,32,'steel-to-crescent wake uses a sampled curved ribbon, not a rigid triangular cone');
    const spine=trail.rootJoin.slice(0,16).map((a,index)=>{
      const b=trail.rootJoin[31-index];
      assert(Math.hypot(a.x-b.x,a.y-b.y)<=12,'connecting wake stays thin instead of obscuring the character or field');
      assert([a.x,a.y,b.x,b.y].every(Number.isFinite),'connecting wake remains finite through every direction and cut');
      return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    });
    assert(Math.hypot(spine[0].x-trail.hand.x,spine[0].y-trail.hand.y)<.001,'curved wake must start at the actual steel root');
    if(steel)assert(Math.hypot(spine[1].x-steel.tip.x,spine[1].y-steel.tip.y)<.001,'curved wake must pass through the exposed tip before bending toward the damage crescent');
    poseCases++;
  }
  assert(maxReach>.99,'each direction and combo must visibly reach its actual damaging extent');
  assert(animated,'the ribbon must sweep and taper as the swing advances');
  pose({facing,grounded,vertical,combo,progress:.5});currentRecord=recordingContext();const snapshot=before();
  q.drawPlayerSlashTrail();
  assert.equal(before(),snapshot,'drawing the trail must not mutate gameplay');
  assert(currentRecord.balanced(),'ribbon drawing must restore all canvas state');
  assert.equal(currentRecord.filledShapes.length,7,'trail must stay bounded to seven inexpensive filled paths');
  assert(currentRecord.filledShapes[0].alpha<=.170001,'connecting wake is quieter than the cutting edge, without an extra flash');
  assert(currentRecord.filledShapes.every(shape=>shape.kind==='polygon'),'arc is pixel-authored geometry, not an omnidirectional ring');
  currentRecord=recordingContext();q.drawPlayer();
  assert(currentRecord.filledShapes.some(shape=>shape.color==='#b5f6ec'),'the actual player layer must render the wide crescent');
  assert.equal(currentRecord.headCenters.length,1,'new trail must preserve the original operative renderer');renderedCases++;
}
for(const vertical of[-1,-.82,0,.82,1])for(const combo of[-1,0,1,2]){
  pose({facing:1,vertical,combo});const right=q.samplePlayerSlashTrail();
  pose({facing:-1,vertical,combo});const left=q.samplePlayerSlashTrail();
  assert.equal(right.ribbon.length,left.ribbon.length);
  for(let i=0;i<right.ribbon.length;i++){
    assert(Math.abs((right.ribbon[i].x-right.center.x)+(left.ribbon[i].x-left.center.x))<1.01,'left cut must mirror right cut horizontally');
    assert(Math.abs((right.ribbon[i].y-right.center.y)-(left.ribbon[i].y-left.center.y))<1.01,'facing must not reverse the authored upward/downward sweep');
  }
  for(let i=0;i<right.rootJoin.length;i++){
    const r=right.rootJoin[i],l=left.rootJoin[left.rootJoin.length-1-i];
    assert(Math.abs((r.x-right.center.x)+(l.x-left.center.x))<1.01,'curved wake must mirror with the real left-facing steel');
    assert(Math.abs((r.y-right.center.y)-(l.y-left.center.y))<1.01,'left-facing wake must preserve the aimed vertical direction');
  }
}
for(const vertical of[-1,0,1]){
  pose({vertical,progress:.47});const {rootJoin}=q.samplePlayerSlashTrail();
  const spine=rootJoin.slice(0,16).map((a,i)=>({x:(a.x+rootJoin[31-i].x)/2,y:(a.y+rootJoin[31-i].y)/2}));
  const start=spine[1],end=spine[15],dx=end.x-start.x,dy=end.y-start.y;
  const bend=Math.max(...spine.slice(2,15).map(p=>Math.abs(dx*(p.y-start.y)-dy*(p.x-start.x))/Math.hypot(dx,dy)));
  assert(bend>3,'representative horizontal and vertical slashes must visibly curve between steel and crescent');
}
for(const progress of[0,.05,.9,1]){pose({progress});assert.equal(q.samplePlayerSlashTrail(),null,'idle, windup and finished cuts must not leave a damaging-looking arc');}
pose({progress:.5});q.player.crossShotTimer=.25;q.player.recoilTimer=.25;
assert.equal(q.samplePlayerSlashTrail(),null,'shotgun finisher must not leave a phantom slash over its two-handed recoil');
pose({progress:.5,stage:3});assert.equal(q.samplePlayerSlashTrail().color,'#ed874e','flame-sword stage keeps its warm arc color');
pose({progress:.5});q.player.buffTimer=1;assert.equal(q.samplePlayerSlashTrail().color,'#ebc479','empowered slash keeps the existing gold vocabulary');
console.log(`Slash trail QA: ${poseCases} animated poses, ${renderedCases} actual player renders; facing, reach, wrist anchor, seven-path budget and immutable combat passed.`);
module.exports={q,pose,fixture,setContext(context){currentRecord={context};}};
