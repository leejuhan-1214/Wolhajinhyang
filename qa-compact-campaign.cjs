// Use the built game, not a second implementation of its map.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
const oldPlacements=[{id:'kept-kit',type:'repair',x:8510,y:520},{id:'retired-kit',type:'repair',x:4520,y:510}];
window.localStorage.setItem('moonlit-echo-admin-placed-objects-v1',JSON.stringify(oldPlacements));
for(const file of ['operative-renderer.js','story-data.js','campaign-edit-compat.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const hook = 'window.__COMPACT__={zones,stages,enemies,checkpoints,WORLD_W,STORY_EVENTS,CUTSCENE_EVENTS,getZoneIndexAt,resolveCampaignCheckpointIndex,restoreCampaign,game,player,buildAdminPortableProfile,applyLiveWorldProfile};';
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'));
const q=window.__COMPACT__;
const profile=q.buildAdminPortableProfile();
assert.equal(profile.worldLayout,'campaign-40-v1');assert.equal(profile.placedObjects.length,1);
assert.deepEqual([profile.placedObjects[0].id,profile.placedObjects[0].x],['kept-kit',4502]);
assert(profile.quarantinedEdits.some(e=>JSON.stringify(e).includes('retired-kit')));
assert.deepEqual(JSON.parse(window.localStorage.getItem('moonlit-echo-admin-80-room-original')).placedObjects,oldPlacements);
q.applyLiveWorldProfile({...profile,revision:'current-qa',placedObjects:[{id:'new-kit',x:8510,y:520,type:'repair'}]});
assert.equal(q.buildAdminPortableProfile().placedObjects[0].x,8510,'current live coordinates must not be translated again');
assert.equal(q.WORLD_W,166240);
assert(q.WORLD_W < 345280 * .5,'removing seals must also shorten travel distance');
assert.equal(q.checkpoints.length,40);
const eventIds=new Set();
for(const event of [...q.STORY_EVENTS,...q.CUTSCENE_EVENTS]){
  assert(!eventIds.has(event.id));eventIds.add(event.id);
}
for(let act=0; act<5; act++) {
  const rooms=q.zones.filter(z=>z.stageIndex===act), base=act*8, bosses=q.enemies.filter(e=>e.type==='boss'&&!e.adminSpawned&&e.stageIndex===act);
  assert.equal(rooms.length,8);assert.equal(bosses.length,2);
  assert.deepEqual(bosses.map(e=>[e.bossKind,q.getZoneIndexAt(e.originX)]).sort(),[[q.stages[act].midBossKind,base+3],[q.stages[act].bossKind,base+7]].sort());
  assert.equal(rooms[3].template,'midboss');assert.equal(rooms[7].template,'boss');
  const radio=q.STORY_EVENTS.filter(e=>e.stageIndex===act);
  assert.equal(radio.length,[11,10,11,11,11][act]);assert.equal(new Set(radio.map(e=>e.x)).size,radio.length);
  for(const event of radio){assert.equal(q.getZoneIndexAt(event.x),event.zoneIndex);assert(![0,3,7].includes(event.zoneIndex-base));}
  for(const count of [16,24]){
    const half=count/2;
    for(const [oldIndex,expected] of [[0,0],[half-1,3],[half,4],[count-1,7]]) {
      const data={respawnStage:act,zonesPerStage:count,respawnZone:act*count+oldIndex};
      assert.equal(q.resolveCampaignCheckpointIndex(data),base+expected);
      assert.equal(q.resolveCampaignCheckpointIndex({...data,checkpointKey:act+':'+oldIndex}),base+expected);
    }
    let prev=-1;
    for(let i=0;i<count;i++){
      const j=q.resolveCampaignCheckpointIndex({respawnStage:act,zonesPerStage:count,respawnZone:act*count+i})-base;
      assert(j>=prev && j>=0 && j<8);if(i<half-1)assert(j<3);if(i>=half && i<count-1)assert(j>=4 && j<7);prev=j;
    }
  }
}
q.restoreCampaign({version:2,zonesPerStage:16,respawnStage:3,checkpointKey:'3:8',tutorialCompleted:true,defeatedBosses:[q.stages[3].midBossKind]});
assert.equal(q.player.respawnCheckpointKey,'3:4');
assert(!q.enemies.find(e=>e.bossKind===q.stages[3].midBossKind).alive);
assert(q.enemies.find(e=>e.bossKind===q.stages[3].bossKind).alive);
console.log('Compact campaign: 5 acts, 40 beacons, 10 boss positions, 54 radio scenes, old checkpoint migration and post-boss restore verified.');
