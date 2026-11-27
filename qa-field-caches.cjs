// Exercise optional seal-independent supplies on real authored geometry and the real projectile/save paths.
const fs=require('node:fs'),assert=require('node:assert/strict');
let harness=fs.readFileSync('qa-cross-combo.cjs','utf8').split('function test(name,body)')[0];
harness=harness.replace("['operative-renderer.js', 'story-data.js']","['operative-renderer.js','story-data.js','field-caches.js','freight-chase.js','crossfire.js','echo-marks.js']");
harness=harness.replace('player,game,crossChain,keys,pressed,pointer,camera,','player,game,crossChain,keys,pressed,pointer,camera,fieldCaches,zones,getZoneRemaining,restoreCampaign,saveCampaign,explodeMortar,SAVE_KEY,zoneEntryVerticalRange,slashIntersectsRect,refreshSlashContact,build(d){selectedDifficulty=d;game.difficulty=d;buildLevel();},');
const {q}=new Function('require',harness+'\nreturn {q};')(require);
const api=q.fieldCaches, evidence={};
for(const d of ['chick','cadet','darkhorse','weapon']){
  q.build(d);const boxes=api.list();
  evidence[d]=boxes.map(c=>[c.id,c.zone+1,c.kind]);
  assert.equal(boxes.length,6,'six distinct optional cabinets on '+d+': '+JSON.stringify(evidence[d]));
  assert.equal(new Set(boxes.map(c=>c.zone)).size,6);
  for(const c of boxes){
    const frame=q.zoneEntryVerticalRange(c.zone);
    assert(c.y>=frame.top && c.y+c.h<=frame.bottom);
    assert(q.platforms.some(p=>!p.hidden&&p.y===c.y+c.h&&p.x<=c.x&&p.x+p.w>=c.x+c.w));
    assert(!q.platforms.some(p=>!p.hidden&&p.x<c.x+c.w&&p.x+p.w>c.x&&p.y<c.y+c.h&&p.y+p.h>c.y));
    assert(![0,9].includes(c.zone)&&!['boss','midboss'].includes(q.zones[c.zone].template));
    if(c.kind==='blast')assert(q.enemies.some(e=>e.id===c.hostId&&e.alive&&['mortar','mortarTurret'].includes(e.type)));
  }
}
q.hidePanels();Object.assign(q.game,{mode:'playing',adminMode:false,bossReplay:null,cutscene:null});
const relay=api.list().find(c=>c.kind==='relay'), blast=api.list().find(c=>c.kind==='blast');
function stand(c){Object.assign(q.player,{x:c.x-13,y:c.y+c.h-q.player.h,vx:0,vy:0,hp:4,maxHp:5,invincible:1,shotgunCharge:0});q.game.zone=c.zone;}
function pellet(c){return {kind:'shotgun',enemy:false,x:c.x+13,y:c.y+15,w:4,h:4,vx:1,vy:0,life:2,gravity:0,shotId:42};}
stand(relay);const before=q.getZoneRemaining(relay.zone);
assert.equal(api.slash(relay.zone,()=>true),null,'blade cannot bypass receiver');
assert.equal(api.blast(relay.zone,relay.x,relay.y),null,'relay ignores random explosions');
assert.equal(api.shot(relay.zone,{...pellet(relay),enemy:true}),false);
assert.equal(api.shot(blast.zone,pellet(blast)),false);
let b=pellet(relay);q.bullets.push(b);q.updateBullets(1/120,[]);
assert.equal(relay.phase,'armed');assert(!q.bullets.includes(b));
api.update(relay.zone,3.3,q.player);assert.equal(relay.phase,'locked','timeout is recoverable');
b=pellet(relay);q.bullets.push(b);q.updateBullets(1/120,[]);assert.equal(relay.phase,'armed');
assert.equal(api.slash(relay.zone,()=>false),null,'remote slash cannot open');
Object.assign(q.player,{attackTimer:0,attackCooldown:0,grounded:true,facing:1});q.startAttack({x:1,y:0});
// Place the player so the *rendered* edge crosses this receiver before the actual update.
q.player.attackTimer=q.player.attackDuration*.47;q.refreshSlashContact();
const steel=window.MoonlitOperative.sampleBlade(q.player,q.game,1);assert(steel);
const px=(steel.base.x+steel.tip.x)/2,py=(steel.base.y+steel.tip.y)/2;
q.player.x+=relay.x+relay.w/2-px;q.player.y+=relay.y+17-py;
q.player.hp=5;q.player.shotgunCharge=3;q.updatePlayer(0);
assert.equal(relay.phase,'open','production sword hook must open armed cabinet');assert(!api.save().includes(relay.id));
assert.equal(q.getZoneRemaining(relay.zone),before);
stand(relay);const reward=api.update(relay.zone,.016,q.player);assert.equal(reward.label,'체력 +1');assert.equal(q.player.hp,5);
assert.equal(api.update(relay.zone,.016,q.player),null,'no farming');
stand(blast);const realShell={enemy:true,kind:'mortar',x:blast.x-5,y:blast.y-10,w:18,h:18,ownerZone:blast.zone};
q.explodeMortar({...realShell,x:blast.x-210});assert.equal(blast.phase,'locked');
q.explodeMortar(realShell);assert.equal(blast.phase,'open');
q.player.hp=5;q.player.shotgunCharge=1.4;assert.equal(api.update(blast.zone,.016,q.player).label,'강화탄 충전 +1');assert.equal(q.player.shotgunCharge,2.4);
q.saveCampaign();const saved=JSON.parse(localStorage.getItem(q.SAVE_KEY));assert.deepEqual(saved.fieldCacheClaims.sort(),[blast.id,relay.id].sort());
api.restore([]);q.restoreCampaign(saved);assert.deepEqual(api.save().sort(),[blast.id,relay.id].sort());
q.restoreCampaign({...saved,fieldCacheClaims:undefined});assert.deepEqual(api.save(),[],'legacy saves load');
console.log('Field cabinets: all four rosters, two opening methods, real mortar/pellet/steel, once-only supply and legacy save PASS',JSON.stringify(evidence));
