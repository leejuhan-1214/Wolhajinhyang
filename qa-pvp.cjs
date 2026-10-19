/* Pure simulation QA; no browser or network required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(`${__dirname}/pvp-simulation.js`, 'utf8'), context, { filename: 'pvp-simulation.js' });
const duel = context.module.exports;
const { createMatch, step, snapshot, createInput, ARENA, FIXED_DT } = duel;
const idle = [{}, {}];
const frames = (state, count, inputs = idle) => { for (let i = 0; i < count; i += 1) step(state, inputs); return state; };
const playing = (seed = 1) => frames(createMatch(seed), 180);
const closeFighters = state => {
  Object.assign(state.fighters[0], { x: 500, y: 584, vx: 0, vy: 0, facing: 1, grounded: true });
  Object.assign(state.fighters[1], { x: 575, y: 584, vx: 0, vy: 0, facing: -1, grounded: true });
};
let count = 0;
function test(name, run) { run(); count += 1; console.log(`PASS ${name}`); }

test('browser and CommonJS expose the same public API', () => {
  assert.equal(context.MoonlitDuel, duel);
  assert.equal(FIXED_DT, 1 / 60);
  assert.equal(ARENA.platforms.length, 3);
});

test('countdown locks movement and begins exactly after three seconds', () => {
  const state = createMatch(); const x = state.fighters[0].x;
  frames(state, 179, [{ move: 1, shotgun: true }, {}]);
  assert.equal(state.phase, 'countdown'); assert.equal(state.fighters[0].x, x);
  step(state, idle); assert.equal(state.phase, 'playing'); assert.equal(state.roundTime, 90);
});

test('identical seed and input streams remain deterministic including shots', () => {
  const a = playing(183), b = playing(183);
  for (let i = 0; i < 3000; i += 1) {
    const input = [
      { move: Math.sin(i / 20), jump: i % 37 < 8, slash: i % 21 < 10, shotgun: i % 49 < 9, dash: i % 130 < 4, aimX: 1, aimY: Math.sin(i / 200) },
      { move: Math.cos(i / 27), jump: i % 41 < 9, slash: i % 27 < 11, shotgun: i % 43 < 10, dash: i % 111 < 3, aimX: -1, aimY: Math.sin(i / 210) },
    ];
    step(a, input); step(b, input);
  }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.ok(a.rng !== a.seed, 'the input stream exercised seeded shotgun spread');
});

test('snapshots are independent, JSON safe, and resume deterministically', () => {
  const a = playing(99); frames(a, 12, [{ move: 1, jump: true }, {}]);
  const b = snapshot(a); assert.equal(JSON.stringify(a), JSON.stringify(b));
  frames(a, 60, [{ move: 1, shotgun: true }, {}]);
  frames(b, 60, [{ move: 1, shotgun: true }, {}]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  b.fighters[0].hp = 1; assert.notEqual(a.fighters[0].hp, b.fighters[0].hp);
});

test('malformed input cannot create nonfinite state or extra speed', () => {
  const state = playing();
  frames(state, 300, [{ move: Infinity, jump: 'true', aimX: NaN, aimY: {}, dash: 1 }, null]);
  assert.equal(state.fighters[0].x, 190);
  assert.equal(state.fighters[0].jumps, 0);
  const clean = createInput({ move: 999, aimX: 1e100, aimY: -1e100, shotgun: true });
  assert.equal(clean.move, 1); assert.ok(Math.abs(Math.hypot(clean.aimX, clean.aimY) - 1) < 1e-10);
  assert.equal(createInput([]).move, 0);
  step(state, null, Infinity); assert.equal(state.tick, 480);
  step(state, idle, -100); assert.equal(state.tick, 480);
  step(state, idle, 100000); assert.equal(state.tick, 486);
  const checkFinite = value => {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
    else if (value && typeof value === 'object') Object.values(value).forEach(checkFinite);
  };
  checkFinite(state);
});

test('movement accelerates and walls stop both movement and dashes', () => {
  const state = playing();
  frames(state, 500, [{ move: -1 }, { move: 1 }]);
  assert.equal(state.fighters[0].x, ARENA.left);
  assert.equal(state.fighters[1].x + state.fighters[1].w, ARENA.right);
  step(state, [{ move: -1, dash: true }, { move: 1, dash: true }]);
  assert.equal(state.fighters[0].x, ARENA.left); assert.equal(state.fighters[0].vx, 0);
  assert.equal(state.fighters[1].x + state.fighters[1].w, ARENA.right);
});

test('jump is edge-triggered, supports two jumps, and lands on platforms', () => {
  const state = playing(); state.fighters[0].x = 280;
  const f = state.fighters[0];
  frames(state, 12, [{ jump: true }, {}]);
  assert.equal(f.jumps, 1); assert.ok(f.y < 584);
  step(state, idle); step(state, [{ jump: true }, {}]);
  assert.equal(f.jumps, 2); assert.ok(f.vy < -500);
  step(state, idle); const before = f.vy;
  step(state, [{ jump: true }, {}]); assert.ok(f.vy > before, 'a third jump cannot reset upward speed');
  frames(state, 150, [{ jump: true }, {}]);
  assert.equal(f.y + f.h, 510); assert.equal(f.jumps, 0); assert.equal(f.grounded, true);
  frames(state, 15, [{ jump: true }, {}]); assert.equal(f.y + f.h, 510, 'holding jump never auto-bounces');
});

test('walking off a ledge preserves a short coyote jump', () => {
  const state = playing(); const f = state.fighters[0];
  Object.assign(f, { x: 493, y: 454, grounded: true, vy: 0, vx: 320 });
  step(state, [{ move: 1 }, {}]); assert.equal(f.grounded, false);
  step(state, [{ move: 1, jump: true }, {}]);
  assert.equal(f.jumps, 1); assert.ok(f.vy < -600);
});

test('one slash cannot hit repeatedly; cooldown and invulnerability limit held attacks', () => {
  const state = playing(); closeFighters(state);
  step(state, [{ slash: true }, {}]); assert.equal(state.fighters[1].hp, 4);
  frames(state, 6, [{ slash: true }, {}]); assert.equal(state.fighters[1].hp, 4);
  assert.ok(state.fighters[0].slashCd > 0);
  frames(state, 25); closeFighters(state);
  step(state, [{ slash: true }, {}]); assert.equal(state.fighters[1].hp, 3);
});

test('simultaneous final blows produce a drawn round, regardless of player order', () => {
  const state = playing(); closeFighters(state);
  state.fighters[0].hp = 1; state.fighters[1].hp = 1;
  step(state, [{ slash: true }, { slash: true }]);
  assert.equal(state.fighters[0].hp, 0); assert.equal(state.fighters[1].hp, 0);
  assert.equal(state.phase, 'roundOver'); assert.equal(state.roundWinner, null);
  assert.equal(state.scores[0] + state.scores[1], 0);
});

test('shotgun uses ammo, spreads deterministically, recoils, and reloads automatically', () => {
  const state = playing(55); closeFighters(state);
  step(state, [{ shotgun: true, aimX: 1 }, {}]);
  assert.equal(state.fighters[0].shells, 1); assert.equal(state.fighters[1].hp, 3);
  assert.ok(state.fighters[0].vx < 0);
  assert.equal(state.effects.filter(fx => fx.type === 'shot').length, 5);
  frames(state, 10, [{ shotgun: true, aimX: 1 }, {}]); assert.equal(state.fighters[0].shells, 1);
  frames(state, 47); assert.equal(state.fighters[0].shells, 2);
  frames(state, 30); closeFighters(state);
  step(state, [{ shotgun: true, aimX: -1 }, {}]); assert.equal(state.fighters[1].hp, 3, 'aiming away misses');
});

test('platforms block shotgun rays', () => {
  const state = playing();
  Object.assign(state.fighters[0], { x: 313, y: 530, grounded: false });
  Object.assign(state.fighters[1], { x: 313, y: 430, grounded: false });
  step(state, [{ shotgun: true, aimX: 0, aimY: -1 }, {}]);
  assert.equal(state.fighters[1].hp, 5);
});

test('empty shotgun cannot fire until a shell finishes reloading', () => {
  const state = playing(); const f = state.fighters[0];
  step(state, [{ shotgun: true, aimX: -1 }, {}]);
  frames(state, 43, [{ shotgun: true, aimX: -1 }, {}]);
  assert.equal(f.shells, 0);
  const rngAfterSecondShot = state.rng;
  frames(state, 40, [{ shotgun: true, aimX: -1 }, {}]);
  assert.equal(f.shells, 0); assert.equal(state.rng, rngAfterSecondShot, 'no invisible free shots while empty');
  frames(state, 20, [{ shotgun: true, aimX: -1 }, {}]);
  assert.notEqual(state.rng, rngAfterSecondShot, 'holding fire resumes only after reloading');
});

test('landing consumes a buffered jump and an expired coyote window leaves one air jump', () => {
  const buffered = playing(); const a = buffered.fighters[0];
  Object.assign(a, { x: 100, y: 579, vy: 300, grounded: false, jumps: 2, coyote: 0 });
  step(buffered, [{ jump: true }, {}]); assert.equal(a.grounded, true);
  step(buffered, idle); assert.ok(a.vy < -600); assert.equal(a.jumps, 1);
  const falling = playing(); const b = falling.fighters[0];
  Object.assign(b, { x: 500, y: 454, grounded: false, jumps: 0, coyote: 0.02 });
  frames(falling, 3); assert.equal(b.jumps, 1);
  step(falling, [{ jump: true }, {}]); assert.equal(b.jumps, 2);
  step(falling, idle); const speed = b.vy;
  step(falling, [{ jump: true }, {}]); assert.ok(b.vy > speed);
});

test('dash is edge-triggered with cooldown and short damage immunity', () => {
  const state = playing(); closeFighters(state);
  step(state, [{ slash: true }, { dash: true, move: -1 }]);
  assert.equal(state.fighters[1].hp, 5); assert.ok(state.fighters[1].dashCd > 1);
  frames(state, 100, [{}, { dash: true }]);
  assert.equal(state.fighters[1].dashTime, 0); assert.equal(state.fighters[1].dashCd, 0);
  step(state, idle); step(state, [{}, { dash: true }]); assert.ok(state.fighters[1].dashTime > 0);
});

test('timeout compares HP, rounds reset with swapped spawns, and two wins end match', () => {
  const state = playing(); state.fighters[0].hp = 4; state.fighters[1].hp = 2; state.roundTime = FIXED_DT;
  step(state, idle); assert.equal(state.phase, 'roundOver'); assert.equal(state.roundWinner, 0); assert.equal(state.scores[0], 1);
  frames(state, 180); assert.equal(state.phase, 'countdown'); assert.equal(state.round, 2);
  assert.ok(state.fighters[0].x > state.fighters[1].x); assert.equal(state.fighters[0].hp, 5);
  frames(state, 180); state.fighters[1].hp = 0; step(state, idle);
  assert.equal(state.scores[0], 2); frames(state, 180);
  assert.equal(state.phase, 'matchOver'); assert.equal(state.winner, 0);
  const previous = state.fighters[0].x; frames(state, 300, [{ move: 1 }, {}]); assert.equal(state.fighters[0].x, previous);
  const rematch = createMatch(2); assert.equal(rematch.phase, 'countdown'); assert.equal(rematch.scores[0], 0); assert.equal(rematch.fighters[1].hp, 5);
});

test('tied timeout is a draw and fractional steps retain fixed-step equivalence', () => {
  const state = playing(); state.roundTime = FIXED_DT;
  step(state, idle); assert.equal(state.roundWinner, null); assert.equal(state.scores[0] + state.scores[1], 0);
  const a = playing(), b = snapshot(a);
  for (let i = 0; i < 100; i += 1) {
    step(a, [{ move: 1 }, {}]);
    step(b, [{ move: 1 }, {}], FIXED_DT / 2); step(b, [{ move: 1 }, {}], FIXED_DT / 2);
  }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

console.log(`PvP simulation: ${count} checks passed.`);
