// Real collision/input regression for the Act 2 encounter replacement.
const assert = require('node:assert/strict'), fs = require('node:fs');
let harness = fs.readFileSync(`${__dirname}/qa-cross-combo.cjs`, 'utf8').split('function test(name,body)')[0];
harness = harness.replace("['operative-renderer.js', 'story-data.js']", "['operative-renderer.js', 'freight-chase.js', 'story-data.js']");
harness = harness.replace('player,game,crossChain,keys,pressed,pointer,camera,',
  'player,game,crossChain,keys,pressed,pointer,camera,freightChase,zones,getZoneRemaining,getCheckpointRespawnPosition,setRespawnCheckpoint,saveCampaign,restoreCampaign,CUTSCENE_EVENTS,STORY_EVENTS,buildFor(d){selectedDifficulty=d;buildLevel();},');
const { q, fixture: baseFixture, canvasEvents } = new Function('require', harness + '\nreturn {q,fixture,canvasEvents};')(require);
const results = [];
function setup(difficulty = 'darkhorse') {
  baseFixture(); q.buildFor(difficulty);
  const zone = q.zones[9], checkpoint = q.checkpoints.find(c => c.checkpointKey === '1:1');
  const spawn = q.setRespawnCheckpoint(checkpoint, q.checkpoints.indexOf(checkpoint));
  Object.assign(q.player, {x:spawn.x + 180,y:spawn.y,vx:0,vy:0,grounded:false,invincible:20});
  Object.assign(q.game, {mode:'playing',difficulty,stage:1,zone:9,runTime:0,time:0,
    cutscene:null,story:null,storyQueue:[],freeze:0,tutorialActive:false,tutorialCompleted:true,
    cutsceneSeen:new Set(q.CUTSCENE_EVENTS.map(e=>e.id)),storySeen:new Set(q.STORY_EVENTS.map(e=>e.id))});
  q.game.defeatedBosses = new Set(q.enemies.filter(e=>e.type==='boss'&&e.homeZoneIndex<9).map(e=>e.bossKind));
  for (const enemy of q.enemies) if (enemy.homeZoneIndex < 9) {enemy.alive=false;enemy.hp=0;}
  q.freightChase.restore(null);
  return zone;
}
function step(dt = 1/120) {q.update(dt);q.pressed.clear();}
function test(name, fn) {fn();results.push(name);}
function floor() {return q.platforms.find(p=>p.id==='freight:floor');}
function support() {return q.freightChase.platforms.find(p=>q.player.grounded&&Math.abs(q.player.y+q.player.h-p.y)<3&&q.player.x+q.player.w>p.x&&q.player.x<p.x+p.w);}

test('default replacement preserves custom and explicitly edited geometry byte-for-byte',()=>{
  const zone={x:4000,end:8072,stageIndex:1,localIndex:1,globalIndex:9,baseTargetEnemyCount:0};
  const original={id:'original',x:4500,y:350,w:200,h:22,hidden:false};
  const inserted={id:'custom',x:4700,y:300,w:160,h:24,hidden:false,adminWorldCustom:true,extra:'keep'};
  const edited={id:'edited',x:4950,y:320,w:170,h:25,hidden:false,adminWorldBase:{x:4900,y:300}};
  const naturalHazard={id:'natural-hazard',x:5200,y:600,w:20,h:20,hidden:false};
  const customHazard={id:'custom-hazard',x:5300,y:500,w:20,h:20,hidden:false,adminWorldCustom:true};
  const before=JSON.stringify([inserted,edited,customHazard]);
  const local=window.MoonlitFreight.create({player:q.player,game:q.game,zones:[zone],platforms:[original,inserted,edited],
    enemies:[],hazards:[naturalHazard,customHazard],combatRooms:[],checkpoints:[],worldHeight:1450,
    isCustomStructure:object=>object.id==='edited'});
  local.build();assert(original.hidden);assert(naturalHazard.hidden);
  assert.equal(JSON.stringify([inserted,edited,customHazard]),before,'a chase rebuild must not alter custom structure metadata or visibility');
});

test('one objective substitutes the old kill lock in all difficulties',()=>{
  for (const difficulty of ['chick','cadet','darkhorse','weapon']) {
    const zone=setup(difficulty);
    assert.equal(q.freightChase.zoneIndex,9);assert.equal(q.freightChase.platforms.length,3);
    assert.equal(q.getZoneRemaining(9),1);
    assert(!q.enemies.some(e=>!e.adminSpawned&&e.type!=='boss'&&e.homeZoneIndex===9));
    assert(!q.combatRooms.some(r=>(r.left+r.right)/2>zone.x&&(r.left+r.right)/2<zone.end));
    assert.equal(floor().w,zone.end-zone.x,'the fallback route must cover the entire room');
    assert(q.enemies.filter(e=>e.type==='boss').length===10,'all bosses remain authored');
  }
});
test('moving collision roof carries only a grounded passenger',()=>{
  setup();const car=q.freightChase.platforms[0];
  Object.assign(q.player,{x:car.x+45,y:car.y-q.player.h,vx:0,vy:0,grounded:true});
  const x=q.player.x,cx=car.x;step();
  assert(Math.abs((q.player.x-x)-(car.x-cx))<.01);assert(q.player.grounded);
  assert(Math.abs(q.player.y+q.player.h-car.y)<.1);assert(q.freightChase.snapshot().boarded&1);
  q.pressed.add('Space');q.keys.add('Space');step();assert(!q.player.grounded);assert(q.player.vy<0);
  const jumpX=q.player.x;step();assert(Math.abs(q.player.x-jumpX)<.01,'the train must not drag an airborne passenger');
});
test('train parks safely without finishing the objective and respects pause/admin',()=>{
  setup();for(let i=0;i<700;i++)q.freightChase.update(.1);
  assert.equal(q.freightChase.snapshot().travel,q.freightChase.maximumTravel);
  assert.equal(q.getZoneRemaining(9),1,'elapsed time never replaces the actual final cut');
  assert(!q.freightChase.tryCut(()=>true),'a ground-only bystander cannot cut a remote coupling');
  q.freightChase.restore(null);q.game.adminMode=true;const before=q.freightChase.snapshot();
  q.freightChase.update(1);assert.deepEqual(q.freightChase.snapshot(),before);assert.equal(q.getZoneRemaining(9),0);
  q.game.adminMode=false;q.game.mode='paused';q.freightChase.update(1);assert.deepEqual(q.freightChase.snapshot(),before);
});

function traverse() {
  setup();let frames=0,usedRecoil=false;
  q.keys.add('Space');
  for(let index=0;index<3;index++) {
    let landed=false;
    for(let local=0;local<1200;local++) {
      const target=q.freightChase.platforms[index], under=support();
      if(under===target){landed=true;step();break;}
      const dx=target.x+target.w*.5-(q.player.x+q.player.w/2);
      q.keys.delete('KeyA');q.keys.delete('KeyD');
      if(dx>12)q.keys.add('KeyD');else if(dx< -12)q.keys.add('KeyA');
      if(q.player.grounded) {
        const nearEdge=under&&q.player.x+q.player.w>under.x+under.w-70;
        if(nearEdge||q.player.wallRight||q.player.wallLeft||(!under&&target.x-(q.player.x+q.player.w)<160))q.pressed.add('Space');
      } else if(q.player.airJumpAvailable&&q.player.vy> -50&&q.player.y+q.player.h>target.y-10)q.pressed.add('Space');
      if(index===1&&!usedRecoil&&!q.player.grounded&&q.player.vy< -100) {
        const vx=q.player.vx;q.startShotgun({x:-1,y:0});
        assert(q.player.vx>vx,'the existing backwards shotgun shot must assist forward travel');usedRecoil=true;
      }
      step();frames++;
    }
    assert(landed,`actual keyboard jumping must reach moving car ${index+1}: ${JSON.stringify({x:q.player.x,y:q.player.y,vx:q.player.vx,vy:q.player.vy,target:q.freightChase.platforms[index],grounded:q.player.grounded})}`);
  }
  q.keys.clear();
  assert(usedRecoil);assert.equal(q.freightChase.snapshot().boarded,7);
  const front=q.freightChase.platforms[2];
  for(let i=0;i<240;i++){
    q.keys.delete('KeyA');q.keys.delete('KeyD');
    const projected=q.player.x-front.x+q.player.vx*Math.abs(q.player.vx)/4000;
    if(projected<165)q.keys.add('KeyD');else if(projected>175)q.keys.add('KeyA');
    step();if(Math.abs(q.player.x-front.x-170)<10&&Math.abs(q.player.vx)<20)break;
  }
  q.keys.clear();
  // Stand near the visible coupling using actual movement, then swing a real blade.
  q.player.facing=1;
  const beforeKills=q.game.kills,beforeHp=q.player.hp;
  q.startAttack({x:1,y:0});
  for(let i=0;i<80&&!q.freightChase.snapshot().completed;i++)step();
  assert(q.freightChase.snapshot().completed,'the actual visible blade must cut the coupling');
  assert.equal(q.getZoneRemaining(9),0);assert.equal(q.game.kills,beforeKills);assert.equal(q.player.hp,beforeHp);
  return {frames,usedRecoil};
}
let traversal;
test('actual jump/double-jump/recoil traversal and blade completion',()=>{traversal=traverse();});
test('mobile tapping the nearby coupling selects a genuine slash, not a shotgun',()=>{
  setup();q.freightChase.restore({v:1,started:true,travel:120,boarded:1,completed:false});
  const front=q.freightChase.platforms[2],target=q.freightChase.connector();
  Object.assign(q.player,{x:front.x+170,y:front.y-q.player.h,grounded:true,vx:0,vy:0,facing:1});
  q.pointer.screenX=target.x+target.w/2-q.camera.x;q.pointer.screenY=target.y+target.h/2-q.camera.y;
  const attack=q.player.attackId,shot=q.player.shotId;
  q.startTouchContextAttack();assert(q.player.attackId>attack);assert.equal(q.player.shotId,shot);
  for(let i=0;i<60&&!q.freightChase.snapshot().completed;i++)step();
  assert(q.freightChase.snapshot().completed,'mobile completion uses the same physical blade contact');
});
test('death and continue preserve chase progress; older later checkpoints remain unlocked',()=>{
  setup();for(let i=0;i<30;i++)q.freightChase.update(.1);
  const car=q.freightChase.platforms[0];
  Object.assign(q.player,{x:car.x+60,y:car.y-q.player.h,grounded:true,vx:0,vy:0});step();
  const before=q.freightChase.snapshot();q.saveCampaign();
  const saved=JSON.parse(localStorage.getItem('moonlit-echo-campaign-v1'));
  assert.deepEqual(saved.freightChase,before);
  q.respawn();assert.deepEqual(q.freightChase.snapshot(),before);
  q.freightChase.restore(null);q.restoreCampaign(saved);assert.deepEqual(q.freightChase.snapshot(),before);
  q.freightChase.restore(undefined,10);assert.equal(q.getZoneRemaining(9),0,'legacy saves after the encounter cannot re-lock an earlier room');
  q.freightChase.restore(null,0);assert.equal(q.getZoneRemaining(9),1,'a new run starts a new chase');
});
console.log(JSON.stringify({freightChase:'passed',checks:results.length,traversal,results}));
module.exports={q,setup,step};
