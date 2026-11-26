// Visible metal only: a broad body rectangle is deliberately not a barrel proxy.
const assert=require('node:assert/strict'),fs=require('node:fs');
let boot=fs.readFileSync(`${__dirname}/qa-blade-art.cjs`,'utf8').split('const distanceToSegment=')[0];
boot=boot.replace('drawEnemy,slashIntersectsRect,','drawEnemy,attackBox,slashIntersectsRect,slashHitsTurretBarrel,slashBounds,turretBarrelPose,');
const {q,fixture,target,recordingContext,setRecord}=new Function('require','__dirname',boot+'\nreturn {q,fixture,target,recordingContext,setRecord:r=>activeRecord=r};')(require,__dirname);
const api=window.MoonlitOperative;
const metalColors={turret:new Set(['#8f9ca1','#273137','#b7c4c7']),mortarTurret:new Set(['#a7afb2','#727f84','#252d31','#cbd5d5','#364048'])};
function inside(point,polygon){
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i],b=polygon[j];
    if(((a[1]>point.y)!==(b[1]>point.y))&&point.x<(b[0]-a[0])*(point.y-a[1])/(b[1]-a[1])+a[0])result=!result;
  }
  return result;
}
function drawnMetal(enemy){
  const record=recordingContext();setRecord(record);q.drawEnemy(enemy);
  assert(record.balanced());
  return {record,contains(point){
    // Select the frontmost actually painted shape: hollow muzzles, dark vent
    // openings, glow and rectangular empty corners do not become metal.
    const top=[...record.filledShapes].reverse().find(shape=>inside(point,shape.world));
    return !!top&&metalColors[enemy.type].has(top.color);
  }};
}
function contact(steel,metal){
  for(let i=0;i<=160;i++){
    const t=i/160,p={x:steel.base.x+(steel.tip.x-steel.base.x)*t,y:steel.base.y+(steel.tip.y-steel.base.y)*t};
    if(metal.contains(p))return p;
  }
  return null;
}
const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const findings=[];
// Aim-override/pure-up contact, supported by touch context attacks. No padding.
for(const data of [
  {type:'turret',x:280,y:600,combo:-1,progress:.52},
  {type:'mortarTurret',x:294,y:588,combo:2,progress:.52},
])for(const mirrored of [false,true]){
  const facing=mirrored?1:-1,enemyX=mirrored?834-data.x-(data.type==='turret'?58:66):data.x;
  fixture();Object.assign(q.player,{x:400,y:594,facing,grounded:true,vx:0,vy:0,attackDir:{x:0,y:-1},
    attackDuration:.24,attackTimer:.24*(1-data.progress),slashComboActive:data.combo>=0,slashComboIndex:Math.max(0,data.combo),
    slashComboLinked:false,slashComboCarry:0,slashComboEntry:null,slashComboRecovery:0,motionPose:null,squash:0,
    recoilTimer:0,crossShotTimer:0,slashChain:data.combo>=0?data.combo+1:1});
  const e=target(data.type,{x:enemyX,y:data.y,originX:enemyX,facing:-facing,hurt:0,windup:0,turretRecoil:0,
    targetX:enemyX+1000,targetY:data.y+(data.type==='turret'?50:62)*.42});
  const box=q.attackBox(),steel=api.sampleBlade(q.player,q.game,facing),metal=drawnMetal(e),point=contact(steel,metal);
  assert(!overlaps(box,e),'fixture body must be wholly outside the existing broad attack rectangle');
  assert(point,'un-padded actual steel must touch frontmost solid rendered barrel metal');
  assert(!metal.contains({x:e.x+e.w/2+90,y:e.y+10}),'no empty-space extension beyond the barrel');
  assert(q.slashHitsTurretBarrel(e,q.slashBounds([steel]),[steel]),'production narrow metal check must accept actual visible contact');
  const hp=e.hp;q.updatePlayer(1/480);
  assert.equal(hp-e.hp,data.combo===2?2:1,'real update must damage exposed metal despite missing body rectangle');
  const after=e.hp;q.updatePlayer(1/480);assert.equal(e.hp,after,'one slash must not count metal a second time');
  findings.push({type:data.type,input:'aim-override up',mirrored,enemy:{x:e.x,y:e.y,w:e.w,h:e.h},box,steel,point});
}
// Real desktop normal attack with W held: the drawing phase can contact a
// nearby rear mortar barrel while the diagonal body box is aimed forward/up.
fixture();Object.assign(q.player,{x:400,y:594,facing:-1,grounded:true,vx:0,vy:0});q.keys.add('KeyW');
q.startAttack();
for(let i=0;i<13;i++){q.game.time+=1/240;q.updatePlayer(1/240);q.pressed.clear();}
const desktopState=structuredClone(q.player);let desktop=null;
for(let x=434;x<=446&&!desktop;x++){
  const e=target('mortarTurret',{x,y:588,originX:x,facing:-1,hurt:0,windup:0,turretRecoil:0});
  const box=q.attackBox(),steel=api.sampleBlade(q.player,q.game,-1),point=steel&&contact(steel,drawnMetal(e));
  if(!overlaps(box,e)&&point)desktop={type:e.type,input:'normal attack + W, 13 real 240Hz updates',enemy:{x:e.x,y:e.y,w:e.w,h:e.h},box,steel,point};
  q.enemies.splice(q.enemies.indexOf(e),1);
}
assert(desktop,'desktop-reachable diagonal draw must reproduce only-visible-metal contact, without body overlap');
assert.deepEqual(q.player,desktopState,'rendered metal sampling cannot change player state');findings.push(desktop);
let narrowCases=0;
for(const type of ['turret','mortarTurret'])for(const facing of[-1,1])for(const recoil of[0,.1,.2]){
  fixture();const e=target(type,{x:365,y:type==='turret'?600:588,originX:365,facing,hurt:0,
    windup:type==='mortarTurret'&&recoil>0?.05:0,turretRecoil:recoil,targetX:1300,targetY:621});
  const metal=drawnMetal(e);let positive=0;
  for(let x=e.x-40;x<e.x+e.w+40;x+=2)for(let y=e.y-24;y<e.y+e.h;y+=2){
    const point={x:x+.3,y:y+.3};if(!metal.contains(point))continue;
    const edge={base:{x:point.x-.1,y:point.y},tip:{x:point.x+.1,y:point.y}};
    assert(q.slashHitsTurretBarrel(e,q.slashBounds([edge]),[edge]),'shared pose must cover visible tube/collar metal in either facing and recoil');positive++;
  }
  assert(positive>20,'geometry QA must actually inspect visible metal');
  for(const [x,y]of[[e.x+e.w/2,e.y-28],[e.x+e.w+43,e.y+5],[e.x-43,e.y+5]]){
    const edge={base:{x:x-1,y},tip:{x:x+1,y}};
    assert(!q.slashHitsTurretBarrel(e,q.slashBounds([edge]),[edge]),'nearby empty space must not turn into a broad extra hitbox');
  }
  narrowCases++;
}
fixture();Object.assign(q.player,{x:300,y:594,facing:1,grounded:true,attackDir:{x:1,y:0},attackDuration:.18,attackTimer:.09});
const overlapEnemy=target('turret',{x:365,y:600,originX:365,facing:-1,targetX:0,targetY:621});
const overlapSteel=api.sampleBlade(q.player,q.game,1);
assert(overlaps(q.attackBox(),overlapEnemy)&&q.slashHitsTurretBarrel(overlapEnemy,q.slashBounds([overlapSteel]),[overlapSteel]));
const overlapHp=overlapEnemy.hp;q.updatePlayer(1/480);q.updatePlayer(1/480);
assert.equal(overlapHp-overlapEnemy.hp,1,'simultaneous body and barrel contact counts once');
console.log(JSON.stringify({turretMetal:'passed',unpaddedVisibleContacts:findings.length,mirroredPoseAndRecoilCases:narrowCases,bodyPlusBarrelDeduplicated:true}));
module.exports={findings,inside};
