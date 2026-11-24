// Restore 3.9.0 enemy-body reach without widening projectile/part precision.
const assert=require('node:assert/strict'),fs=require('node:fs');
let harness=fs.readFileSync(`${__dirname}/qa-cross-combo.cjs`,'utf8').split('function test(name,body)')[0];
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  'player,game,crossChain,keys,pressed,pointer,camera,buildAttackBox,attackBox,findTouchSlashTarget,slashIntersectsRect,');
const {q,fixture,target,tick}=new Function('require',harness+'\nreturn {q,fixture,target,tick};')(require);
function legacyBox(direction,charged,chain){
  const vertical=Math.abs(direction.y)>.25,reach=charged?82:chain===3?76:68;
  const halfX=vertical?(charged?70:55):(charged?108:chain===3?92:84);
  const halfY=vertical?(charged?105:82):(charged?72:52);
  return {x:q.player.x+q.player.w/2+direction.x*reach-halfX,
    y:q.player.y+q.player.h/2+direction.y*reach-halfY,w:halfX*2,h:halfY*2};
}
let geometryCases=0,hitCases=0,missCases=0,mobileCases=0;
for(const facing of[-1,1])for(const vertical of[-1,-.82,0,.82,1])for(const chain of[0,1,2,3])for(const charged of[false,true]){
  fixture();const aim={x:Math.sqrt(1-vertical*vertical)*facing,y:vertical};
  assert.deepEqual(q.buildAttackBox(aim,charged,chain),legacyBox(aim,charged,chain), 'all legacy 3.9.0 dimensions must match exactly');
  geometryCases++;
}
for(const kind of['runner','warden'])for(const grounded of[false,true])for(const facing of[-1,1])
for(const vertical of[-1,-.82,0,.82,1])for(const combo of[-1,0,1,2])for(const within of[false,true]){
  fixture();
  Object.assign(q.player,{x:600,y:grounded?650-q.player.h:300,vx:0,vy:0,grounded,facing,
    slashComboActive:combo>0,slashComboIndex:Math.max(0,combo-1),slashComboWindow:combo>0?1:0});
  const aim={x:Math.sqrt(1-vertical*vertical)*facing,y:vertical};
  q.startAttack(aim,combo>=0);
  assert(q.player.attackTimer>0,'real input must start each attack');
  if(combo>=0)assert.equal(q.player.slashComboIndex,combo);
  const duration=q.player.attackDuration;
  q.player.attackTimer=duration*.5;
  const box=legacyBox(q.player.attackDir,false,q.player.slashChain),enemy=target(kind);
  if(vertical===0){
    enemy.x=facing>0?box.x+box.w+(within?-2:2):box.x-enemy.w+(within?2:-2);
    enemy.y=box.y+box.h/2-enemy.h/2;
  }else{
    enemy.x=box.x+box.w/2-enemy.w/2;
    enemy.y=vertical>0?box.y+box.h+(within?-2:2):box.y-enemy.h+(within?2:-2);
  }
  const hp=enemy.hp;tick();
  assert.equal(enemy.hp<hp,within,`${kind} ${grounded?'ground':'air'} facing=${facing} y=${vertical} combo=${combo} ${within?'inside':'outside'} legacy boundary`);
  assert.equal(q.player.attackDuration,duration,'wide reach must not change attack pacing');
  if(within){
    const expected=grounded&&q.player.slashChain===3?2:1;
    assert.equal(hp-enemy.hp,expected,'range restoration must not add damage or reward bonuses');hitCases++;
  }else missCases++;
}
for(const grounded of[false,true])for(const facing of[-1,1])for(const vertical of[-1,-.82,0,.82,1])for(const nextChain of[1,2,3]){
  fixture();Object.assign(q.player,{x:600,y:grounded?650-q.player.h:300,grounded,facing,
    slashChain:nextChain-1,slashChainTimer:nextChain>1?1:0});
  const aim={x:Math.sqrt(1-vertical*vertical)*facing,y:vertical},enemy=target();
  const place=distance=>{enemy.x=q.player.x+q.player.w/2+aim.x*distance-enemy.w/2;
    enemy.y=q.player.y+q.player.h/2+aim.y*distance-enemy.h/2;};
  place(135);
  assert.equal(q.findTouchSlashTarget(enemy.x+enemy.w/2,enemy.y+enemy.h/2)?.enemy,enemy,'mobile must select a target inside the restored wide strike');
  place(300);
  assert.equal(q.findTouchSlashTarget(enemy.x+enemy.w/2,enemy.y+enemy.h/2),null,'mobile must still reject targets beyond the legacy strike');
  mobileCases++;
}
// Body forgiveness must not become a remote bullet/boost destroyer.
fixture();Object.assign(q.player,{x:600,y:300,grounded:false,vy:0,airJumpAvailable:false});
q.startAttack({x:1,y:0});q.player.attackTimer=q.player.attackDuration*.5;
const far={x:q.player.x+q.player.w/2+125,y:q.player.y+q.player.h/2-3,w:6,h:6};
const bullet={...far,enemy:true,kind:'standard',life:4,vx:0,vy:0};q.bullets.push(bullet);
const node={...far,id:'qa-far-node',launchX:900,launchY:-1200,hitAttackId:-1};q.boostNodes.push(node);
tick();
assert(q.bullets.includes(bullet),'far enemy-body range must not erase a projectile');
assert.equal(node.hitAttackId,-1,'far body range must not activate a jump node');
assert.equal(q.player.airJumpAvailable,false,'uncontacted projectiles/nodes cannot restore a jump');
assert.equal(q.player.vx,0,'range restoration cannot add a remote launch impulse');
assert(!q.slashIntersectsRect(far,2),'precision weakpoint contact remains tied to actual steel');
console.log(`Wide slash QA: ${geometryCases} exact legacy bounds, ${hitCases} actual hits, ${missCases} misses, ${mobileCases} mobile pairs; damage/timing and physical-only projectile/boost/part guards passed.`);
