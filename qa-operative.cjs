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
  const feet = [], bladeTips = [], headCenters = [], waistCenters = [], hands = [];
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
    fillRect(x, y, w, h) {
      if (style.fillStyle === '#06101a') feet.push({ ankle: point(0, 0), heel: point(x, y + h), toe: point(x + w, y + h) });
      if (style.fillStyle === '#0a141e' && w === 7 && h === 6) hands.push(point(x + w / 2, y + h / 2));
    },
    fill() {
      if (style.fillStyle === '#172833') headCenters.push(point(0, -50));
      if (style.fillStyle === '#111d2c') waistCenters.push(point(0, -16.5));
    },
    quadraticCurveTo(cx, cy, x, y) { if (x === 78 && y === -15) bladeTips.push(point(x, y)); },
  };
  const context = new Proxy({}, {
    get(_, name) { return style[name] ?? ((...args) => {
      args.forEach(value => { if (typeof value === 'number') assert(Number.isFinite(value), `${name}: finite argument`); });
      return operations[name]?.(...args);
    }); },
    set(_, name, value) { style[name] = value; return true; },
  });
  return { context, feet, bladeTips, headCenters, waistCenters, hands, balanced: () => stack.length === 0 };
}
const player = { w: 28, h: 52, vx: 440, vy: 0, grounded: true, runCycle: 0,
  squash: 0, attackTimer: 0, attackDuration: 0.23, attackDir: { x: 1, y: 0 },
  recoilTimer: 0, shotAimX: 1, shotAimY: 0, buffTimer: 0, shotgunCharge: 0,
  slashComboActive: false, slashComboIndex: 0, slashComboLinked: false,
  slashComboCarry: 0, slashComboRecovery: 0, slashComboRecoveryDuration: 0.16 };
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
let worstSupportError = { amount: 0 }, worstSlip = { amount: 0 };
for (const speed of [90, 240, 440]) for (const facing of [-1, 1]) for (const footIndex of [0, 1]) {
  const planted = [];
  for (let frame = 0; frame <= 48; frame++) {
    const contactFraction = 0.02 + frame / 48 * 0.96;
    const phase = (footIndex === 0 ? 0.5 : 0) + renderer.runSupportFraction * contactFraction;
    const distance = phase * tau / renderer.strideRadiansPerPixel;
    const record = draw({ vx: speed * facing, runCycle: phase * tau }, facing, 'player', false, distance * facing);
    const foot = record.feet[footIndex];
    const floorError = Math.max(Math.abs(foot.heel[1] - player.h), Math.abs(foot.toe[1] - player.h));
    if (floorError > worstSupportError.amount) worstSupportError = { amount: floorError, speed, facing, footIndex, contactFraction };
    planted.push(foot.ankle[0]);
  }
  const slip = Math.max(...planted) - Math.min(...planted);
  if (slip > worstSlip.amount) worstSlip = { amount: slip, speed, facing, footIndex };
}
assert(worstSupportError.amount < 0.1,
  `support soles must remain on the floor through the entire contact: ${JSON.stringify(worstSupportError)}`);
assert(worstSlip.amount < 1.1,
  `support feet may only move by root pixel rounding: ${JSON.stringify(worstSlip)}`);
const contactsPerSecond = 440 * renderer.strideRadiansPerPixel / Math.PI;
assert(contactsPerSecond > 5 && contactsPerSecond < 7, 'full-speed cadence must not spin the legs like a wheel');
const supportTravel = tau * renderer.runSupportFraction / renderer.strideRadiansPerPixel;
assert(supportTravel > 30 && supportTravel < 35, 'support distance must fit the mechanical leg reach');
const flight = draw({ runCycle: 0.38 * tau });
assert(flight.feet.every(foot => foot.heel[1] < player.h - 1), 'a running stride must contain a small flight phase');

// Measure rendered anatomy rather than checking the angle constants: the upper
// body must lead its hips, and each arm must oppose the leg on the same side.
for (const facing of [-1, 1]) {
  const leadAt = (speed) => {
    const record = draw({ vx: speed * facing, runCycle: 0.125 * tau }, facing);
    assert.equal(record.headCenters.length, 1, 'exactly one mechanical head must be rendered');
    assert.equal(record.waistCenters.length, 1, 'exactly one torso must be rendered');
    return (record.headCenters[0][0] - record.waistCenters[0][0]) * facing;
  };
  const idleLead = leadAt(0), walkLead = leadAt(90), runLead = leadAt(240), sprintLead = leadAt(440);
  assert(Math.abs(idleLead) < 0.5, 'idle posture must remain upright');
  assert(walkLead > idleLead && runLead > walkLead && sprintLead > runLead,
    'forward torso lean must increase smoothly from walking to sprinting');
  assert(sprintLead >= 7 && sprintLead <= 15,
    'sprinting head must lead the waist visibly without tipping the whole body over');
  const contact = draw({ vx: 440 * facing, runCycle: 0 }, facing);
  const opposite = draw({ vx: 440 * facing, runCycle: Math.PI }, facing);
  assert.equal(contact.hands.length, 2, 'running must retain both hands');
  assert.equal(opposite.hands.length, 2, 'running must retain both hands');
  const frontArmSwing = (contact.hands[1][0] - opposite.hands[1][0]) * facing;
  const rearArmSwing = (contact.hands[0][0] - opposite.hands[0][0]) * facing;
  const frontLegSwing = (contact.feet[1].ankle[0] - opposite.feet[1].ankle[0]) * facing;
  assert(frontLegSwing > 10 && frontArmSwing < -4,
    'front arm must drive back as its own leg reaches forward, not march with it');
  assert(rearArmSwing > 4 && frontArmSwing * rearArmSwing < 0,
    'both arms must counter-swing with bent elbows');
}

// Both soles remain supported during idle breathing, without a crouching bounce.
for (let frame = 0; frame < 120; frame++) {
  game.time = frame / 30;
  for (const foot of draw({ vx: 0 }).feet) assert(Math.abs(foot.heel[1] - player.h) < 0.1);
}

const durations = [0.22, 0.24, 0.28];
const tipDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
let comboCases = 0;
for (const index of [0, 1, 2]) for (const facing of [-1, 1]) {
  for (const grounded of [false, true]) for (const aimY of [-1, 0, 1]) {
    for (let frame = 0; frame < 60; frame++) {
      const result = draw({ vx: 0, grounded, vy: grounded ? 0 : -250,
        slashComboActive: true, slashComboIndex: index, slashComboLinked: index > 0, slashComboCarry: 1,
        attackDuration: durations[index], attackTimer: durations[index] * (1 - frame / 60),
        attackDir: { x: facing, y: aimY } }, facing);
      assert.equal(result.bladeTips.length, 1, 'each active J strike draws exactly one katana');
      if (grounded && aimY === 0) assert(result.bladeTips[0][1] <= player.h + 1,
        'a forward grounded combo must not drive its sword tip through the floor');
      comboCases++;
    }
    // Starting the next strike must preserve the exact previous follow-through,
    // even if part of its recovery has elapsed, and even while aiming vertically.
    for (const carry of [1, 0.7, 0.3]) {
      const previous = draw({ vx: 0, grounded, vy: grounded ? 0 : -250,
        slashComboActive: true, slashComboIndex: index, slashComboRecovery: carry * 0.16,
        attackDir: { x: facing, y: aimY } }, facing);
      const nextIndex = (index + 1) % 3;
      const next = draw({ vx: 0, grounded, vy: grounded ? 0 : -250,
        slashComboActive: true, slashComboIndex: nextIndex, slashComboLinked: true, slashComboCarry: carry,
        attackDuration: durations[nextIndex], attackTimer: durations[nextIndex],
        attackDir: { x: facing, y: aimY } }, facing);
      assert(tipDistance(previous.bladeTips[0], next.bladeTips[0]) < 0.001,
        `J chain ${index + 1} -> ${nextIndex + 1} must not snap the blade (carry ${carry})`);
      for (let foot = 0; foot < previous.feet.length; foot++) {
        assert(tipDistance(previous.feet[foot].ankle, next.feet[foot].ankle) < 0.001,
          'linked J strikes must preserve their supporting feet');
      }
      comboCases += 2;
    }
  }
}
// New sprint shoulders/elbows must also hand off without snapping while moving.
for (const facing of [-1, 1]) for (const index of [0, 1, 2]) for (const phase of [0.125, 0.625]) {
  const common = { vx: 440 * facing, runCycle: phase * tau, slashComboActive: true,
    attackDir: { x: facing, y: 0 }, slashComboRecoveryDuration: 0.16 };
  const previous = draw({ ...common, slashComboIndex: index, slashComboRecovery: 0.096 }, facing);
  const nextIndex = (index + 1) % 3;
  const next = draw({ ...common, slashComboIndex: nextIndex, slashComboLinked: true, slashComboCarry: 0.6,
    attackDuration: durations[nextIndex], attackTimer: durations[nextIndex] }, facing);
  assert(tipDistance(previous.bladeTips[0], next.bladeTips[0]) < 0.001,
    'sprinting torso and elbow poses must remain continuous when chaining J');
  comboCases += 2;
}
const distinct = durations.map((duration, index) => draw({ vx: 0, slashComboActive: true,
  slashComboIndex: index, attackDuration: duration, attackTimer: duration * 0.45 }).bladeTips[0]);
for (let a = 0; a < distinct.length; a++) for (let b = a + 1; b < distinct.length; b++) {
  assert(tipDistance(distinct[a], distinct[b]) > 8, 'the three strikes must have distinct blade trajectories');
}
const normal = draw({ vx: 0, attackTimer: 0.1 }).bladeTips[0];
const normalWithStaleCombo = draw({ vx: 0, attackTimer: 0.1, slashComboIndex: 2, slashComboCarry: 1 }).bladeTips[0];
assert(tipDistance(normal, normalWithStaleCombo) < 0.001, 'mouse attacks must ignore inactive J state');
const echo = draw({ vx: 0, attackTimer: 0.1 }, 1, 'echo').bladeTips[0];
const echoDuringJ = draw({ vx: 0, attackTimer: 0.1, slashComboActive: true, slashComboIndex: 2 }, 1, 'echo').bladeTips[0];
assert(tipDistance(echo, echoDuringJ) < 0.001, 'player J combo state must never leak into Echo');
assert.equal(draw({ slashComboActive: true, slashComboRecovery: 0 }).bladeTips.length, 0,
  'completed recovery must sheath the katana');
console.log(`Operative renderer: ${cases + 122} base poses + ${comboCases} combo poses/handoffs, grounded stance and immutable gameplay passed.`);
