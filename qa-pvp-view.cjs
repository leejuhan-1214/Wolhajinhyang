const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(`${__dirname}/pvp-simulation.js`, 'utf8'), sandbox);
const engine = sandbox.MoonlitDuel;
vm.runInNewContext(fs.readFileSync(`${__dirname}/pvp-view.js`, 'utf8'), sandbox);
const { DuelView, interpolate } = sandbox.MoonlitDuelView;
const playing = () => { const s = engine.createMatch(7); s.phase = 'playing'; s.phaseTime = 0; return s; };
const presses = { jump: 1, dash: 2, slash: 3, shotgun: 4 };
let count = 0;
function test(name, run) { run(); count++; console.log(`PASS ${name}`); }

test('prediction shares movement, landing, dash, jump and recoil with the host simulation', () => {
  const state = playing(); let predicted = { ...state.fighters[0] };
  for (let frame = 0; frame < 90; frame++) {
    const input = { move: frame < 40 ? 1 : -1, jump: frame < 15 || frame > 30 && frame < 40, dash: frame === 50, shotgun: frame === 20, aimX: -1, aimY: -.2 };
    predicted = engine.predictFighter(predicted, input); engine.step(state, [input, {}]);
    assert.equal(JSON.stringify(predicted), JSON.stringify(state.fighters[0]));
  }
});

test('local movement, jump and dash render before any network response without changing authority', () => {
  for (const input of [{ move: -1 }, { jump: true }, { dash: true, move: -1 }]) {
    const state = playing(), before = JSON.stringify(state), view = new DuelView(engine, 1); view.reset(state, 0);
    view.predict(1, input, presses);
    const f = view.render(17, 1).fighters[1];
    assert(f.x < state.fighters[1].x || f.y < state.fighters[1].y);
    assert.equal(JSON.stringify(state), before); assert.equal(f.hp, 5);
  }
});

test('acknowledged inputs are removed and only unacknowledged movement is replayed', () => {
  const state = playing(), view = new DuelView(engine, 1); view.reset(state, 0);
  let authoritative;
  for (let seq = 1; seq <= 12; seq++) {
    const input = { move: -1, aimX: -1 };
    view.predict(seq, input, presses); engine.step(state, [{}, input]);
    if (seq === 7) authoritative = engine.snapshot(state);
  }
  const expected = { ...view.predicted };
  view.receive(authoritative, 7, -1, 200);
  assert.equal(view.history.length, 5);
  assert.equal(view.predicted.x, expected.x); assert.equal(view.predicted.y, expected.y);
});

test('an already acknowledged reliable jump cannot become a second predicted jump', () => {
  const state = playing(), view = new DuelView(engine, 1); view.reset(state, 0);
  view.predict(1, { jump: true }, { ...presses, jump: 7 });
  const authority = engine.snapshot(state);
  Object.assign(authority.fighters[1], { y: 570, vy: -600, grounded: false, jumps: 1, lastJump: false, coyote: 0 });
  authority.tick = 1;
  view.receive(authority, 0, 7, 30);
  assert.equal(view.predicted.jumps, 1);
});

test('remote movement stays smooth at 120Hz despite uneven packet arrival', () => {
  const state = playing(), view = new DuelView(engine, 1); state.fighters[0].vx = 320; view.reset(engine.snapshot(state), 0);
  const arrivals = [[3, 45], [6, 118], [9, 155], [12, 218], [15, 259]], positions = [];
  let next = 0;
  for (let now = 0; now <= 290; now += 1000 / 120) {
    while (next < arrivals.length && now >= arrivals[next][1]) {
      const [tick, at] = arrivals[next++], frame = engine.snapshot(state); frame.tick = tick; frame.fighters[0].x = 190 + tick / 60 * 320;
      view.receive(frame, -1, -1, at);
    }
    positions.push(view.render(now, .5).fighters[0].x);
  }
  for (let i = 1; i < positions.length; i++) assert(positions[i] >= positions[i - 1] - 1e-6, 'packet jitter must not rewind forward movement');
  assert(positions.filter((p, i) => i && p > positions[i - 1]).length > 20, 'presentation must advance between snapshots');
});

test('remote extrapolation is bounded and respects platforms and arena walls', () => {
  const state = playing(), view = new DuelView(engine, 1);
  Object.assign(state.fighters[0], { x: 300, y: 400, vy: 500, grounded: false, jumps: 1 });
  view.reset(state, 0); const landed = view.render(250, 1).fighters[0];
  assert.equal(landed.y, 510 - landed.h); assert.equal(landed.grounded, true);
  Object.assign(state.fighters[0], { x: 1210, y: 584, vx: 820, vy: 0, grounded: true }); view.reset(state, 0);
  assert(view.render(1000, 1).fighters[0].x <= engine.ARENA.right - state.fighters[0].w);
});

test('small corrections blend out, damage is immediate, and new rounds clear prediction history', () => {
  const state = playing(), view = new DuelView(engine, 1); view.reset(state, 0);
  const updated = engine.snapshot(state); updated.tick = 1; updated.fighters[1].x -= 20;
  view.receive(updated, 0, -1, 20);
  const blended = view.render(28, 1).fighters[1].x;
  assert(blended > updated.fighters[1].x && blended < state.fighters[1].x);
  const hurt = engine.snapshot(updated); hurt.tick = 2; hurt.fighters[1].hp = 4; hurt.fighters[1].x -= 80;
  view.receive(hurt, 0, -1, 40); assert.equal(view.render(41, 1).fighters[1].hp, 4); assert.equal(view.correction.x, 0);
  view.predict(1, { move: 1 }, presses);
  const next = playing(); next.round = 2; next.phase = 'countdown'; view.receive(next, -1, -1, 60);
  assert.equal(view.history.length, 0); assert.equal(view.render(60, 1).fighters[1].x, next.fighters[1].x);
});

test('host interpolation fills high-refresh frames and does not blend teleports', () => {
  const state = playing(), a = { ...state.fighters[0], x: 190 }, b = { ...state.fighters[0], x: 196 };
  assert.equal(interpolate(a, b, .5).x, 193);
  assert.equal(interpolate(a, { ...b, x: 1056 }, .5).x, 1056);
});

console.log(`PvP presentation: ${count} checks passed.`);
