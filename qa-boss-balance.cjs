// Focused balance regression tests against real, privately instrumented gameplay.
// The shipped runtime receives no test hooks or fixture data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('./qa-smoke.cjs');
window.__MOONLIT_ECHO_RUNTIME_ACTIVE__ = false;

const source = fs.readFileSync('game.js', 'utf8');
const hook = `window.__BOSS_BALANCE_QA__ = {
  BOSS_ENCOUNTER_ORDER, BOSS_DIFFICULTY_CURVE, BOSS_DEFINITIONS, difficultySettings,
  player, game, enemies, bullets, platforms, hazards, pickups, boostNodes, snowPatches, zones,
  getBossDifficultyCurve, getBossArenaBounds, rebuildPlatformSpatialIndex,
  startBossChargedShot, releaseBossChargedShot, startBossCrisisPattern, updateBoss,
  launchBossFunnels, fireHomingMissile, updateBullets,
  buildForDifficulty(key) { selectedDifficulty = key; game.difficulty = key; buildLevel(); }
};`;
assert(/\}\)\(\);\s*$/.test(source), 'runtime closure must be available for private instrumentation');
vm.runInThisContext(source.replace(/\}\)\(\);\s*$/, `${hook}\n})();`), {filename: 'game-boss-balance-test.js'});
const q = window.__BOSS_BALANCE_QA__;
const order = ['breaker', 'warden', 'hunter', 'furnace', 'oracle', 'weaver', 'revenant', 'censor', 'proxy', 'echo'];
const hp = [24, 30, 34, 40, 44, 48, 52, 56, 60, 80];
const epsilon = 1e-8;
const dt = 1 / 240;
const patterns = {
  breaker: 'warden-volley', warden: 'warden-volley', hunter: 'hunter-shotgun',
  furnace: 'furnace-rifle', oracle: 'oracle-burst', weaver: 'weaver-lance',
  revenant: 'revenant-sword-wave', censor: 'censor-volley', proxy: 'proxy-potion', echo: 'echo-shotgun',
};

assert.deepEqual(Array.from(q.BOSS_ENCOUNTER_ORDER), order);
assert.equal(q.BOSS_DIFFICULTY_CURVE.length, 10, 'mid and final bosses need separate encounter profiles');
for (let index = 0; index < order.length; index++) {
  const kind = order[index];
  const profile = q.getBossDifficultyCurve(Math.floor(index / 2), kind);
  assert.equal(profile, q.BOSS_DIFFICULTY_CURVE[index], `${kind} must resolve its own encounter, not just its stage`);
  assert.equal(q.BOSS_DEFINITIONS[kind].hp, hp[index], `${kind} authored HP`);
  for (const key of ['mobility', 'cooldown', 'windup', 'reaction', 'minWarning', 'minRecovery']) {
    assert(Number.isFinite(profile[key]) && profile[key] > 0, `${kind}.${key} must be a positive finite number`);
  }
  if (!index) continue;
  const previous = q.BOSS_DIFFICULTY_CURVE[index - 1];
  assert(hp[index] > hp[index - 1], 'authored HP must rise in encounter order');
  for (const key of ['mobility', 'reaction']) assert(profile[key] >= previous[key], `${key} must not regress at ${kind}`);
  for (const key of ['cooldown', 'windup', 'minWarning', 'minRecovery']) assert(profile[key] <= previous[key], `${key} must not spike at ${kind}`);
}
assert(hp[8] * 1.25 < hp[9], 'proxy including its 25% heal must remain below Echo total HP');

// Rebuild the real campaign: inspect the generated entities, not just config ratios.
const ratios = {chick: 0.5, cadet: 2 / 3, darkhorse: 1, weapon: 1};
for (const [difficulty, ratio] of Object.entries(ratios)) {
  q.buildForDifficulty(difficulty);
  assert.equal(q.difficultySettings[difficulty].hp, 5, 'every difficulty keeps five player HP');
  assert.equal(q.difficultySettings[difficulty].bossHpScale, ratio);
  assert.equal(q.difficultySettings[difficulty].mobCountScale, ratio);
  for (let index = 0; index < order.length; index++) {
    const boss = q.enemies.find(enemy => enemy.type === 'boss' && enemy.bossKind === order[index] && !enemy.adminSpawned);
    assert(boss, `${difficulty} campaign must contain ${order[index]}`);
    assert(Math.abs(boss.maxHp - hp[index] * ratio) <= 0.00051, `${difficulty}/${order[index]} generated HP must respect exact ratio, rounded only to three decimals`);
    assert.equal(boss.hp, boss.maxHp, 'fresh boss must start at full HP');
  }
}
q.buildForDifficulty('darkhorse');
const bossTemplates = new Map(order.map(kind => [kind, {...q.enemies.find(enemy => enemy.type === 'boss' && enemy.bossKind === kind && !enemy.adminSpawned)}]));
const playerTemplate = {...q.player};

function fixture(kind, difficulty = 'darkhorse', healthFraction = 1) {
  for (const list of [q.enemies, q.bullets, q.platforms, q.hazards, q.pickups, q.boostNodes, q.snowPatches]) list.length = 0;
  const enemy = {...bossTemplates.get(kind)};
  assert.equal(enemy.bossKind, kind, `${kind} fixture must use a real generated boss`);
  const zone = q.zones[enemy.homeZoneIndex];
  q.platforms.push({x: zone.x, y: 650, w: zone.end - zone.x, h: 800, kind: 'ground'});
  q.rebuildPlatformSpatialIndex();
  Object.assign(enemy, {
    x: zone.x + 900, y: 650 - enemy.h, originX: zone.x + 900, baseY: 650 - enemy.h,
    hp: hp[order.indexOf(kind)] * healthFraction, maxHp: hp[order.indexOf(kind)],
    vx: 0, vy: 0, grounded: true, facing: 1, alive: true,
    windup: 0, cooldown: 0, bossAction: null, bossShotPattern: null,
    halfPhaseTriggered: true, quarterPhaseTriggered: true, patternSerial: 0,
    followupPattern: null, followupTimer: 0, followupChainActive: false,
    crisisPatternCooldown: 999, funnelCooldown: 999, summonCooldown: 999,
    retreatTimer: 0, pendingRetreatTimer: 0, pendingRetreatDelay: 0,
    echoChainDashRemaining: 0, echoDiveShotsRemaining: 0, echoMimicJumpCooldown: 999,
    echoReactiveParryCooldown: 999, iceStormTimer: 0,
  });
  Object.assign(q.player, playerTemplate, {
    x: zone.x + 1700, y: 650 - playerTemplate.h, vx: 0, vy: 0,
    grounded: true, hp: 5, maxHp: 5, invincible: 999, attackTimer: 0,
  });
  Object.assign(q.game, {
    mode: 'playing', difficulty, adminMode: false, adminCadetMode: false,
    tutorialActive: false, tutorialCompleted: true, cutscene: null, story: null,
    storyQueue: [], freeze: 0, stage: enemy.stageIndex, zone: enemy.homeZoneIndex,
    controlsReversed: false, screenFlipActive: false,
  });
  q.enemies.push(enemy);
  return enemy;
}

function stepBoss(enemy, duration = dt) {
  // updateEnemy normally consumes cooldown before invoking updateBoss.
  enemy.cooldown = Math.max(0, enemy.cooldown - duration);
  const dx = q.player.x + q.player.w / 2 - enemy.x - enemy.w / 2;
  const dy = q.player.y + q.player.h / 2 - enemy.y - enemy.h / 2;
  q.updateBoss(enemy, duration, dx, Math.hypot(dx, dy));
}

// Tiny requested windups must still provide actual reaction time before release.
let chargeCases = 0;
for (const difficulty of ['darkhorse', 'weapon']) {
  for (const kind of order) {
    const enemy = fixture(kind, difficulty);
    const curve = q.getBossDifficultyCurve(enemy.stageIndex, kind);
    // Hell may shorten requested durations, but never bypass the encounter floors.
    const warning = curve.minWarning;
    const recovery = curve.minRecovery;
    q.startBossChargedShot(enemy, patterns[kind], 800, 0.001);
    assert(enemy.windup + epsilon >= warning + 0.1, `${difficulty}/${kind} must include the 0.1s release threshold in stored windup`);
    assert(enemy.cooldown + epsilon >= enemy.windup + recovery, `${difficulty}/${kind} charge must reserve post-release recovery`);
    let elapsed = 0;
    while (enemy.bossShotPattern && elapsed < 5) {
      stepBoss(enemy); elapsed += dt;
    }
    assert(!enemy.bossShotPattern, `${kind} charge must eventually release`);
    assert(elapsed + dt >= warning, `${difficulty}/${kind} must not release before the real warning floor`);
    assert(enemy.cooldown + dt >= recovery, `${difficulty}/${kind} release must retain its recovery floor`);
    chargeCases++;
  }
}

// Intro completion and administrator return both leave an intentional idle sentinel.
// It is not an active attack and must not be trapped by the action-overlap guard.
for (const kind of order) {
  const enemy = fixture(kind);
  enemy.bossAction = 'idle';
  enemy.windup = 0;
  enemy.cooldown = 0.78;
  for (let frame = 0; frame < 720 && enemy.patternSerial === 0; frame++) stepBoss(enemy);
  assert(enemy.patternSerial > 0, `${kind}: intro/admin idle sentinel must allow combat to start`);
  assert.notEqual(enemy.bossAction, 'idle', `${kind}: idle sentinel must normalize before active-action guards`);
}

// A zero legacy cooldown must never overwrite an already-running long charge.
for (const kind of order) {
  const enemy = fixture(kind);
  q.startBossChargedShot(enemy, patterns[kind], 800, 3);
  const pattern = enemy.bossShotPattern;
  const serial = enemy.patternSerial;
  for (let frame = 0; frame < 90; frame++) {
    enemy.cooldown = 0;
    stepBoss(enemy);
    assert.equal(enemy.bossShotPattern, pattern, `${kind}: long charge overwritten by a normal phase`);
    assert.equal(enemy.bossAction, 'chargeShot', `${kind}: long charge action overwritten`);
    assert.equal(enemy.patternSerial, serial, `${kind}: new phase selected during an active charge`);
  }
}

// Panel budgets are enforced inside the helper, including direct/crisis callers.
for (const [fraction, panels, shots] of [[1, 3, 3], [0.4, 4, 4]]) {
  const enemy = fixture('warden', 'darkhorse', fraction);
  q.launchBossFunnels(enemy, 99);
  const wave = q.bullets.filter(bullet => bullet.kind === 'boss-funnel');
  assert.equal(wave.length, panels, 'requested panel count must respect phase budget');
  assert(wave.every(panel => panel.shotsLeft === shots), 'panel shots must respect phase budget');
  q.launchBossFunnels(enemy, 99);
  assert.equal(q.bullets.filter(bullet => bullet.kind === 'boss-funnel').length, panels, 'a second caller must not stack an active panel wave');
}
const breaker = fixture('breaker');
q.launchBossFunnels(breaker, 99);
assert.equal(q.bullets.length, 0, 'Swae-u must not inherit Ironjaw panels');

// Exercise the real missile updater while counting every emitted satellite.
for (const [kind, waves] of [['breaker', 2], ['warden', 3]]) {
  const enemy = fixture(kind);
  q.fireHomingMissile(enemy, {x: q.player.x, y: q.player.y});
  const missile = q.bullets.find(bullet => bullet.kind === 'homing-missile');
  assert(missile, `${kind} must still shoot homing missiles`);
  assert.equal(missile.satelliteWavesLeft, waves);
  assert(Math.abs(missile.satelliteTimer - 0.36) < epsilon);
  // Keep the missile away from the player/floor so its full lifetime is observed.
  Object.assign(missile, {x: enemy.x, y: 160, vx: 0, vy: 0, speed: 0, turnRate: 0, ownerZone: enemy.homeZoneIndex});
  let emitted = 0;
  const push = q.bullets.push;
  q.bullets.push = function (...items) {
    emitted += items.filter(item => item.kind === 'missile-spark').length;
    return push.apply(this, items);
  };
  try {
    for (let frame = 0; frame < 600; frame++) q.updateBullets(1 / 120, []);
  } finally { q.bullets.push = push; }
  assert.equal(emitted, waves * 3, `${kind} must emit exactly its bounded satellite budget over its entire lifetime`);
  assert.equal(missile.satelliteWavesLeft, 0, 'missile wave budget must be consumed, not replenished');
}

// The Furnace crisis retains its rain identity without simultaneous rifle/mortar spam.
for (const difficulty of ['darkhorse', 'weapon']) {
  const furnace = fixture('furnace', difficulty, 0.3);
  assert(q.startBossCrisisPattern(furnace, 800));
  q.releaseBossChargedShot(furnace);
  const initialKinds = q.bullets.map(bullet => bullet.kind);
  assert(initialKinds.includes('rain-core'), 'Furnace crisis must preserve its sky rain core');
  assert(!(initialKinds.includes('mortar') && initialKinds.includes('standard')), 'Furnace crisis must not release rifle and mortar volleys on the same frame');
  assert(!furnace.followupPattern, 'Furnace rain must not gain an overlapping queued follow-up, including Hell');
}
for (const pattern of ['furnace-mortar', 'furnace-volley', 'furnace-eruption']) {
  const furnace = fixture('furnace');
  q.startBossChargedShot(furnace, pattern, 800);
  q.releaseBossChargedShot(furnace);
  assert(q.bullets.some(bullet => bullet.kind === 'mortar'), `${pattern} must retain artillery`);
  assert(!q.bullets.some(bullet => bullet.kind === 'standard'), `${pattern} must not stack its former rifle volley`);
}
const rifleFurnace = fixture('furnace');
q.startBossChargedShot(rifleFurnace, 'furnace-rifle', 800);
q.releaseBossChargedShot(rifleFurnace);
assert(q.bullets.some(bullet => bullet.kind === 'standard'), 'Furnace must still use its distinct rifle pattern');

// The laboratory transformation still heals exactly one quarter of maximum HP.
const proxy = fixture('proxy', 'darkhorse', 0.5);
proxy.bossAction = 'selfInject'; proxy.windup = 0.11; proxy.cooldown = 2;
const beforeInjection = proxy.hp;
stepBoss(proxy, 0.02);
assert(proxy.mutated, 'self injection must preserve the transformed phase');
assert.equal(proxy.hp - beforeInjection, proxy.maxHp * 0.25, 'self injection must heal exactly 25%');

console.log(JSON.stringify({bossBalance: 'passed', encounters: order.length, chargeCases, idleStartCases: 10, generatedDifficultyCases: 40, panelBudgets: [9, 16], missileSatelliteBudgets: [6, 9]}));
