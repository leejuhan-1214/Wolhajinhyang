/* Exercise actual campaign checkpoint capture, storage and restoration. */
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
require('./qa-smoke.cjs');
window.__MOONLIT_ECHO_RUNTIME_ACTIVE__ = false;
const source = fs.readFileSync('game.js', 'utf8');
const hook = `window.__CHECKPOINT_TEST__={player,game,keys,checkpoints,zones,enemies,WORLD_H,
  resetGame,updatePlayer,clearGameplayInput,readCampaignSave,restoreCampaign,respawn,
  activateCheckpoint,getZoneIndexAt,getCheckpointRespawnPosition};`;
vm.runInThisContext(source.replace(/\}\)\(\);\s*$/, hook + '\n})();'), { filename: 'checkpoint-runtime-test.js' });
const q = window.__CHECKPOINT_TEST__;
q.resetGame(false);
Object.assign(q.game, { tutorialOpen: false, tutorialActive: false, tutorialCompleted: true, cutscene: null, story: null, storyQueue: [] });
let count = 0;
function test(name, run) { run(); count++; console.log(`PASS ${name}`); }
const clearEnemies = () => { for (const enemy of q.enemies) { enemy.alive = false; enemy.hp = 0; } };
function place(checkpoint, xOffset, height, hp = 5) {
  q.clearGameplayInput();
  Object.assign(q.player, { x: checkpoint.x + checkpoint.w / 2 + xOffset - q.player.w / 2,
    y: checkpoint.y + checkpoint.h - q.player.h - height, vx: 400, vy: 0,
    grounded: height === 0, hp, invincible: 2, attackTimer: 0, queuedAction: null });
}

test('the initial active checkpoint is saved immediately and enables continue', () => {
  assert.equal(q.player.respawnCheckpointKey, '0:0');
  assert.equal(q.readCampaignSave().checkpointKey, '0:0');
  assert.equal(document.getElementById('continue-button').disabled, false);
});

test('jumping over the next beacon saves it before landing', () => {
  clearEnemies(); const checkpoint = q.checkpoints[1]; place(checkpoint, -100, 300); q.keys.add('KeyD');
  let capturedHeight = null;
  for (let tick = 0; tick < 60; tick++) {
    q.updatePlayer(1 / 60);
    if (capturedHeight === null && checkpoint.active) capturedHeight = checkpoint.y + checkpoint.h - q.player.y - q.player.h;
  }
  q.clearGameplayInput();
  assert(capturedHeight > 110, `airborne capture must occur outside the old height restriction: ${capturedHeight}`);
  assert.equal(q.player.respawnCheckpointKey, '0:1');
  assert.equal(q.readCampaignSave().checkpointKey, '0:1');
});

test('death and serialized save restoration both return to the captured beacon', () => {
  const saved = JSON.parse(localStorage.getItem('moonlit-echo-campaign-v1'));
  const spawn = q.getCheckpointRespawnPosition(q.checkpoints[1]);
  q.player.x += 1500; q.respawn();
  assert.equal(q.player.x, spawn.x); assert.equal(q.player.y, spawn.y); assert.equal(q.player.respawnCheckpointKey, '0:1');
  q.player.x += 2000; q.restoreCampaign(saved);
  assert.equal(q.player.x, spawn.x); assert.equal(q.player.respawnCheckpointKey, '0:1');
  assert.match(document.getElementById('continue-button').textContent, /01-02/);
});

test('returning to an older beacon cannot erase later progress', () => {
  assert.equal(q.activateCheckpoint(q.checkpoints[0]), false);
  assert.equal(q.readCampaignSave().checkpointKey, '0:1');
});

test('dead contact and falling past a beacon do not secure it', () => {
  clearEnemies(); const checkpoint = q.checkpoints[2]; place(checkpoint, 0, 0, 0); q.updatePlayer(1 / 60);
  assert.equal(q.player.respawnCheckpointKey, '0:1');
  place(checkpoint, -100, 0); q.player.y = q.WORLD_H + 200; q.updatePlayer(1 / 60);
  assert.equal(q.player.respawnCheckpointKey, '0:1');
  assert.equal(q.readCampaignSave().checkpointKey, '0:1');
});

test('a locked previous zone prevents securing a checkpoint beyond its gate', () => {
  clearEnemies();
  const guard = q.enemies.find(enemy => q.getZoneIndexAt(enemy.originX) === 1);
  assert(guard); guard.alive = true; guard.hp = guard.maxHp;
  const checkpoint = q.checkpoints[2], boundary = q.zones[1].end - 48;
  place(checkpoint, -100, 300); q.player.x = boundary - q.player.w - 50; q.keys.add('KeyD');
  for (let tick = 0; tick < 90; tick++) q.updatePlayer(1 / 60);
  q.clearGameplayInput();
  assert(q.player.x + q.player.w <= boundary + .001);
  assert.equal(q.player.respawnCheckpointKey, '0:1');
});

test('swept movement captures a beacon even when a long frame ends past its trigger', () => {
  clearEnemies(); const checkpoint = q.checkpoints[2]; place(checkpoint, -100, 500); q.keys.add('KeyD');
  q.updatePlayer(.4); q.clearGameplayInput();
  assert(q.player.x + q.player.w / 2 > checkpoint.x + checkpoint.w / 2 + 55);
  assert.equal(q.player.respawnCheckpointKey, '0:2'); assert.equal(q.readCampaignSave().checkpointKey, '0:2');
});

console.log(`Checkpoint QA: ${count} checks passed.`);
