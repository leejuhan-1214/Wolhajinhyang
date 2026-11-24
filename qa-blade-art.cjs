// Actual canvas steel and gameplay contact must share one immutable pose source.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {recordingContext,renderer}=require('./qa-operative.cjs');
let activeRecord=recordingContext();
const drawProxy=new Proxy({}, {get:(_,key)=>activeRecord.context[key],set:(_,key,value)=>{activeRecord.context[key]=value;return true;}});
let harness=fs.readFileSync(`${__dirname}/qa-cross-combo.cjs`,'utf8').split('function test(name,body)')[0];
harness=harness.replace("const source = fs.readFileSync('game.js', 'utf8');", "document.getElementById('game').getContext=()=>drawProxy;\nconst source = fs.readFileSync('game.js', 'utf8');");
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,','player,game,crossChain,keys,pressed,pointer,camera,drawEnemy,slashIntersectsRect,refreshSlashContact,bulletIntersectsSlashBlade,prospectiveSlashSegments,slashSegmentHitsRect,');
const {q,fixture,target}=new Function('require','drawProxy',harness+'\nreturn {q,fixture,target};')(require,drawProxy);
const distanceToSegment=(point,a,b)=>{
  const dx=b[0]-a[0],dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.y-a[1])*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(point.x-a[0]-dx*t,point.y-a[1]-dy*t);
};
const edgeDistance=(point,shape)=>Math.min(...shape.world.map((a,index)=>distanceToSegment(point,a,shape.world[(index+1)%shape.world.length])));
let poses=0,contacts=0,serial=10000,worstTipError=0;
fixture();
for(const facing of[-1,1])for(const grounded of[false,true])for(const vertical of[-1,-.82,0,.82,1])for(const combo of[-1,0,1,2]){
  let connected=0;
  for(let frame=0;frame<40;frame++){
    const progress=frame/50;
    Object.assign(q.player,{x:300.25,y:grounded?594:244.4,vx:grounded?440*facing:160*facing,vy:grounded?0:-210,
      grounded,facing,attackId:++serial,runCycle:1.4,squash:0,motionPose:null,recoilTimer:0,crossShotTimer:0,
      attackDir:{x:Math.sqrt(1-vertical*vertical)*facing,y:vertical},attackDuration:combo<0?.23:[.22,.24,.28][combo],
      slashComboActive:combo>=0,slashComboIndex:Math.max(0,combo),slashComboEntry:null,slashComboLinked:false,
      slashComboCarry:0,slashComboRecovery:0,buffTimer:0,chargedAttack:false});
    q.player.attackTimer=q.player.attackDuration*(1-progress);
    const before=JSON.stringify(q.player);
    const blade=renderer.sampleBlade(q.player,q.game,facing);
    const record=recordingContext();
    renderer.createRenderer(record.context,q.player,q.game)(q.player.x,q.player.y,facing);
    assert.equal(JSON.stringify(q.player),before,'contact sampling and rendering cannot mutate gameplay');
    if(blade){
      assert.equal(record.blades.length,1,'a contact blade must be genuinely visible, including partial draws');
      const error=edgeDistance(blade.tip,record.blades[0]);worstTipError=Math.max(worstTipError,error);
      assert(error<.06,`actual curved/clipped tip and sampled contact tip disagree by ${error}`);
      if(progress>.24&&progress<.8){
        assert(q.slashIntersectsRect({x:blade.tip.x-.5,y:blade.tip.y-.5,w:1,h:1}), 'the visible tip must contact a target in every direction and combo pose');
        connected++;contacts++;
      }
    }
    assert(!q.slashIntersectsRect({x:300+q.player.w/2+facing*140-2,y:q.player.y+18,w:4,h:4}),
      'an old 140px aim box must not damage something beyond the physical blade');
    poses++;
  }
  assert(connected>8,'every grounded/airborne directional attack must have a useful physical contact window');
}
// Genuine curved motion is sampled inside the update step, not just at its end.
fixture();Object.assign(q.player,{attackId:++serial,attackDuration:.18,attackTimer:.18*(1-.46),attackDir:{x:1,y:0},motionPose:null});
const previous={...q.player};
q.player.x+=7;q.player.attackTimer=.18*(1-.54);
const middle={...q.player,x:previous.x+3.5,attackTimer:.18*(1-.50)};
const middleBlade=renderer.sampleBlade(middle,q.game);
q.refreshSlashContact(previous);
assert(q.slashIntersectsRect({x:middleBlade.tip.x-.2,y:middleBlade.tip.y-.2,w:.4,h:.4},1), 'fast steel must hit between rendered frame endpoints');
for(const kind of['mutant-debris','warden-beam','rain-controller','rain-core-burst']){
  assert(!q.bulletIntersectsSlashBlade({x:middleBlade.tip.x-2,y:middleBlade.tip.y-2,w:4,h:4,enemy:true,kind}),`${kind} remains uncleavable`);
}
// Mobile chooses from the same swept physical strike, never the former long box.
fixture();
const preview=q.prospectiveSlashSegments({x:1,y:0},1);
assert(preview.some(segment=>q.slashSegmentHitsRect(segment,{x:355,y:595,w:28,h:55})), 'normal standing spacing must remain usable');
assert(!preview.some(segment=>q.slashSegmentHitsRect(segment,{x:440,y:595,w:28,h:55})), 'mobile must not auto-select an unreachable sword attack');
// Read the real drawn receivers, not a data flag claiming different weapons.
let infantryPoses=0;
const silhouetteWidths={};
for(const type of['gunner','machinegun','runner'])for(const facing of[-1,1])for(const moving of[0,130])for(const firing of[false,true]){
  fixture();const enemy=target(type,{facing,vx:moving*facing,anim:1.1,grounded:true,windup:firing?.035:0,
    burstRemaining:firing&&type==='machinegun'?3:0,burstInterval:.08,rushTimer:firing&&type==='runner'?.25:0});
  activeRecord=recordingContext();const before=JSON.stringify(enemy);q.drawEnemy(enemy);
  assert(activeRecord.balanced(),'infantry drawing must restore every transform');
  assert.equal(JSON.stringify(enemy),before,'the visual role redesign cannot alter enemy behavior');
  const color={gunner:'#819faa',machinegun:'#7f929d',runner:'#a8bec7'}[type];
  const weapon=activeRecord.filledShapes.find(shape=>shape.color===color);
  assert(weapon&&weapon.kind==='polygon'&&(type==='runner'?weapon.local.length===7:weapon.local.length>=10),`${type} must draw its authored faceted physical weapon`);
  const width=Math.max(...weapon.local.map(p=>p[0]))-Math.min(...weapon.local.map(p=>p[0]));
  silhouetteWidths[type]=width;
  if(type==='runner'){
    assert.equal(width,40,'the charger must retain its 40px pointed arm blade');
    assert(weapon.local.some(([x,y])=>x===42&&y===-1),'the actual blade must have its forward thrusting tip');
  }
  if(type==='gunner')assert(activeRecord.filledShapes.some(shape=>shape.color==='#384f5e'&&shape.local.length>=5),'carbine must have an angled magazine');
  if(type==='machinegun')assert(activeRecord.filledShapes.some(shape=>shape.color==='#394b56'&&shape.local.length>=6),'support weapon must have a distinct deep box feed');
  infantryPoses++;
}
assert(silhouetteWidths.machinegun>silhouetteWidths.gunner*1.25,'heavy support gun and compact carbine must differ in silhouette, not just color');
console.log(`Blade/art QA: ${poses} authored poses, ${contacts} actual tip contacts, worst tip error ${worstTipError.toFixed(5)}px; sweep, mobile, immune hazards and ${infantryPoses} infantry poses passed.`);
module.exports={q,fixture,target,recordingContext,setRecord(record){activeRecord=record;}};
