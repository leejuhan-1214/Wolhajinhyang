// Exercise the actual renderer, including transformed support-foot coordinates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(`${__dirname}/operative-renderer.js`, 'utf8'), sandbox);
const renderer = sandbox.MoonlitOperative;
const gameplayCadence = Number(fs.readFileSync(`${__dirname}/game.js`, 'utf8').match(/strideRadiansPerPixel:\s*([\d.]+)/)?.[1]);
assert.equal(gameplayCadence, renderer.strideRadiansPerPixel, 'gameplay travel and rendered support stride must agree');
const tau = Math.PI * 2;
function recordingContext() {
  let matrix = [1, 0, 0, 1, 0, 0], stack = [], style = {};
  const feet = [];
  const multiply = ([a, b, c, d, e, f]) => {
    const m = matrix;
    matrix = [m[0] * a + m[2] * b, m[1] * a + m[3] * b,
      m[0] * c + m[2] * d, m[1] * c + m[3] * d,
      m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  };
  const point = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const operations = {
    save() { stack.push([matrix.slice(), { ...style }]); },
    restore() { assert(stack.length, 'canvas restore underflow'); [matrix, style] = stack.pop(); },
    translate(x, y) { multiply([1, 0, 0, 1, x, y]); },
    scale(x, y) { multiply([x, 0, 0, y, 0, 0]); },
    rotate(angle) { const c = Math.cos(angle), s = Math.sin(angle); multiply([c, s, -s, c, 0, 0]); },
    fillRect(x, y, w, h) { if (style.fillStyle === '#06101a') feet.push({ ankle: point(0, 0), heel: point(x, y + h), toe: point(x + w, y + h) }); },
  };
  const context = new Proxy({}, {
    get(_, name) { return style[name] ?? ((...args) => {
      args.forEach(value => { if (typeof value === 'number') assert(Number.isFinite(value), `${name}: finite argument`); });
      return operations[name]?.(...args);
    }); },
    set(_, name, value) { style[name] = value; return true; },
  });
  return { context, feet, balanced: () => stack.length === 0 };
}
const player = { w: 28, h: 52, vx: 440, vy: 0, grounded: true, runCycle: 0,
  squash: 0, attackTimer: 0, attackDuration: 0.23, attackDir: { x: 1, y: 0 },
  recoilTimer: 0, shotAimX: 1, shotAimY: 0, buffTimer: 0, shotgunCharge: 0 };
const game = { stage: 0, time: 0 };
const original = { ...player };
function draw(overrides = {}, facing = 1, style = 'player', ghost = false, x = 0) {
  Object.assign(player, original, overrides);
  const before = JSON.stringify(player);
  const record = recordingContext();
  renderer.createRenderer(record.context, player, game)(x, 0, facing, 0.7, ghost, style);
  assert(record.balanced(), 'all canvas saves must be restored');
  assert.equal(JSON.stringify(player), before, 'rendering must not mutate gameplay');
  return record;
}
let cases = 0;
for (const facing of [-1, 1]) for (let frame = 0; frame < 120; frame++) {
  const t = frame / 120;
  for (const pose of [
    { vx: 0 }, { vx: 90 * facing }, { vx: 440 * facing },
    { vx: 440 * facing, attackTimer: 0.23 * (1 - t) },
    { recoilTimer: 0.3 * (1 - t), shotAimY: Math.sin(t * tau) },
    { grounded: false, vy: -700 + t * 1400 },
    { grounded: false, wallLeft: true, vy: 145 },
    { squash: 0.24 * (1 - t) },
  ]) {
    draw({ ...pose, runCycle: t * tau }, facing);
    cases++;
  }
}
draw({}, 1, 'echo'); draw({}, 1, 'player', true);

// One stance must hold its world-space position as the actor moves forward.
const planted = [];
for (let frame = 0; frame <= 32; frame++) {
  const phase = 0.08 + frame / 100;
  const distance = phase * tau / renderer.strideRadiansPerPixel;
  const record = draw({ runCycle: phase * tau }, 1, 'player', false, distance);
  const foot = record.feet[1];
  assert(Math.abs(foot.heel[1] - player.h) < 0.1, 'support heel must touch the floor');
  assert(Math.abs(foot.toe[1] - player.h) < 0.1, 'support sole must remain level');
  planted.push(foot.ankle[0]);
}
assert(Math.max(...planted) - Math.min(...planted) < 1.1, 'planted foot may only move by root pixel rounding');

// Both soles remain supported during idle breathing, without a crouching bounce.
for (let frame = 0; frame < 120; frame++) {
  game.time = frame / 30;
  for (const foot of draw({ vx: 0 }).feet) assert(Math.abs(foot.heel[1] - player.h) < 0.1);
}
console.log(`Operative renderer: ${cases + 122} pose/state checks, grounded stance and immutable gameplay passed.`);
