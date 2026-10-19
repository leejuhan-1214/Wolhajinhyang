/* Moonlit Duel: deterministic, transport-free host simulation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MoonlitDuel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FIXED_DT = 1 / 60;
  const ARENA = Object.freeze({
    width: 1280, height: 720, floor: 640, left: 32, right: 1248,
    platforms: Object.freeze([
      Object.freeze({ x: 230, y: 510, w: 260, h: 18 }),
      Object.freeze({ x: 790, y: 510, w: 260, h: 18 }),
      Object.freeze({ x: 535, y: 375, w: 210, h: 18 }),
    ]),
  });
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const finite = (n, fallback = 0) => typeof n === 'number' && Number.isFinite(n) ? n : fallback;
  const approach = (n, target, amount) => n < target ? Math.min(n + amount, target) : Math.max(n - amount, target);

  function createInput(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    let aimX = clamp(finite(input.aimX), -1e6, 1e6);
    let aimY = clamp(finite(input.aimY), -1e6, 1e6);
    const length = Math.hypot(aimX, aimY);
    if (length > 0.001) { aimX /= length; aimY /= length; }
    else { aimX = 0; aimY = 0; }
    return {
      move: clamp(finite(input.move), -1, 1),
      jump: input.jump === true, slash: input.slash === true,
      shotgun: input.shotgun === true, dash: input.dash === true,
      aimX, aimY,
    };
  }

  function createFighter(id, flipped) {
    const left = id === (flipped ? 1 : 0);
    return {
      id, x: left ? 190 : 1056, y: ARENA.floor - 56, w: 34, h: 56,
      vx: 0, vy: 0, facing: left ? 1 : -1,
      hp: 5, maxHp: 5, shells: 2, maxShells: 2,
      grounded: true, jumps: 0, coyote: 0.09, jumpBuffer: 0,
      slashCd: 0, shotgunCd: 0, dashCd: 0, dashTime: 0, dashDirection: 1,
      reloadTime: 0, invulnerable: 0, stun: 0,
      slashTime: 0, slashHit: false, slashDirection: left ? 1 : -1,
      anim: 'idle', animTime: 0, aimX: left ? 1 : -1, aimY: 0,
      lastJump: false, lastDash: false,
    };
  }

  function createMatch(seed = 1) {
    const safeSeed = (finite(seed, 1) >>> 0) || 1;
    return {
      version: 1, seed: safeSeed, rng: safeSeed, tick: 0,
      phase: 'countdown', phaseTime: 3, roundTime: 90, round: 1,
      scores: [0, 0], winner: null, roundWinner: null, roundReason: null,
      fighters: [createFighter(0, false), createFighter(1, false)],
      effects: [], nextEffectId: 1, accumulator: 0,
    };
  }

  function random(state) {
    let n = state.rng;
    n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    state.rng = n >>> 0;
    return state.rng / 4294967296;
  }

  function effect(state, type, fighter, details = {}) {
    state.effects.push({
      id: state.nextEffectId++, type, owner: fighter.id,
      x: fighter.x + fighter.w / 2, y: fighter.y + fighter.h / 2,
      dx: fighter.facing, dy: 0, time: 0.18, maxTime: 0.18, ...details,
    });
    // Bound snapshots even during a long match.
    if (state.effects.length > 80) state.effects.splice(0, state.effects.length - 80);
  }

  function beginRound(state) {
    state.round += 1;
    state.phase = 'countdown'; state.phaseTime = 3; state.roundTime = 90;
    state.roundWinner = null; state.roundReason = null;
    state.fighters = [createFighter(0, state.round % 2 === 0), createFighter(1, state.round % 2 === 0)];
    state.effects = [];
  }

  function finishRound(state, reason) {
    const [a, b] = state.fighters;
    const winner = a.hp === b.hp ? null : a.hp > b.hp ? 0 : 1;
    state.roundWinner = winner;
    state.roundReason = reason;
    if (winner !== null) state.scores[winner] += 1;
    state.phase = 'roundOver'; state.phaseTime = 3;
    for (const fighter of state.fighters) {
      fighter.vx = 0; fighter.vy = 0; fighter.slashTime = 0; fighter.dashTime = 0;
    }
  }

  function tickTimers(fighter) {
    for (const key of ['slashCd', 'shotgunCd', 'dashCd', 'dashTime', 'invulnerable', 'stun', 'slashTime', 'animTime', 'jumpBuffer']) {
      fighter[key] = Math.max(0, fighter[key] - FIXED_DT);
    }
    if (fighter.shells < fighter.maxShells) {
      fighter.reloadTime = Math.max(0, fighter.reloadTime - FIXED_DT);
      if (fighter.reloadTime <= 1e-8) {
        fighter.shells += 1;
        fighter.reloadTime = fighter.shells < fighter.maxShells ? 0.95 : 0;
      }
    } else fighter.reloadTime = 0;
  }

  function moveFighter(state, fighter, input) {
    tickTimers(fighter);
    const wasGrounded = fighter.grounded;
    fighter.coyote = wasGrounded ? 0.09 : Math.max(0, fighter.coyote - FIXED_DT);
    if (!wasGrounded && fighter.coyote === 0 && fighter.jumps === 0) fighter.jumps = 1;
    if (input.jump && !fighter.lastJump) fighter.jumpBuffer = 0.10;
    if (input.aimX || input.aimY) {
      fighter.aimX = input.aimX; fighter.aimY = input.aimY;
      if (Math.abs(input.aimX) > 0.1) fighter.facing = Math.sign(input.aimX);
    } else {
      if (input.move) fighter.facing = Math.sign(input.move);
      fighter.aimX = fighter.facing; fighter.aimY = 0;
    }
    if (fighter.stun <= 0) {
      if (fighter.jumpBuffer > 0 && (fighter.coyote > 0 || fighter.jumps < 2)) {
        const firstJump = fighter.coyote > 0 || fighter.grounded;
        fighter.vy = firstJump ? -720 : -650;
        fighter.jumps = firstJump ? 1 : 2;
        fighter.grounded = false; fighter.coyote = 0; fighter.jumpBuffer = 0;
        effect(state, 'jump', fighter, { y: fighter.y + fighter.h, time: 0.22, maxTime: 0.22 });
      }
      if (input.dash && !fighter.lastDash && fighter.dashCd <= 0) {
        fighter.dashDirection = input.move ? Math.sign(input.move) : fighter.facing;
        fighter.dashTime = 0.16; fighter.dashCd = 1.15;
        fighter.invulnerable = Math.max(fighter.invulnerable, 0.12);
        fighter.anim = 'dash'; fighter.animTime = 0.16;
        effect(state, 'dash', fighter, { dx: fighter.dashDirection, time: 0.25, maxTime: 0.25 });
      }
      if (fighter.dashTime > 0) {
        fighter.vx = fighter.dashDirection * 820;
        fighter.vy *= 0.75;
      } else {
        const acceleration = fighter.grounded ? (input.move ? 2800 : 3200) : (input.move ? 1900 : 650);
        fighter.vx = approach(fighter.vx, input.move * 320, acceleration * FIXED_DT);
      }
    }
    fighter.lastJump = input.jump; fighter.lastDash = input.dash;
    if (!input.jump && fighter.vy < -320) fighter.vy = Math.min(-320, fighter.vy + 1800 * FIXED_DT);
    fighter.vy = Math.min(1100, fighter.vy + (fighter.dashTime > 0 ? 350 : 1900) * FIXED_DT);
    fighter.x = clamp(fighter.x + fighter.vx * FIXED_DT, ARENA.left, ARENA.right - fighter.w);
    if ((fighter.x === ARENA.left && fighter.vx < 0) || (fighter.x === ARENA.right - fighter.w && fighter.vx > 0)) fighter.vx = 0;
    const previousBottom = fighter.y + fighter.h;
    fighter.y += fighter.vy * FIXED_DT;
    if (fighter.y < 24) { fighter.y = 24; fighter.vy = Math.max(0, fighter.vy); }
    fighter.grounded = false;
    let landingY = ARENA.floor;
    if (fighter.vy >= 0) {
      for (const platform of ARENA.platforms) {
        if (fighter.x + fighter.w > platform.x && fighter.x < platform.x + platform.w && previousBottom <= platform.y + 0.1 && fighter.y + fighter.h >= platform.y) {
          landingY = Math.min(landingY, platform.y);
        }
      }
      if (fighter.y + fighter.h >= landingY) {
        fighter.y = landingY - fighter.h; fighter.vy = 0; fighter.grounded = true;
        fighter.jumps = 0; fighter.coyote = 0.09;
        if (!wasGrounded) effect(state, 'land', fighter, { y: landingY, time: 0.22, maxTime: 0.22 });
      }
    }
    if (fighter.animTime <= 0) fighter.anim = fighter.stun > 0 ? 'hurt' : !fighter.grounded ? 'jump' : Math.abs(fighter.vx) > 20 ? 'run' : 'idle';
  }

  // Ray/rectangle intersection; the returned distance also bounds visible pellet traces.
  function rayBox(x, y, dx, dy, box, range) {
    let near = 0, far = range;
    for (const [origin, direction, low, high] of [[x, dx, box.x, box.x + box.w], [y, dy, box.y, box.y + box.h]]) {
      if (Math.abs(direction) < 1e-8) {
        if (origin < low || origin > high) return null;
      } else {
        const a = (low - origin) / direction, b = (high - origin) / direction;
        near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        if (near > far) return null;
      }
    }
    return near <= range && far >= 0 ? Math.max(0, near) : null;
  }

  function attack(state, fighter, target, input, hits) {
    if (fighter.hp <= 0 || fighter.stun > 0 || fighter.dashTime > 0) return;
    if (input.slash && fighter.slashCd <= 0) {
      fighter.slashCd = 0.42; fighter.slashTime = 0.12; fighter.slashHit = false;
      fighter.slashDirection = fighter.facing;
      fighter.anim = 'slash'; fighter.animTime = 0.2;
      effect(state, 'slash', fighter, { dx: fighter.slashDirection, time: 0.2, maxTime: 0.2 });
    }
    if (fighter.slashTime > 0 && !fighter.slashHit) {
      const reach = { x: fighter.x + fighter.w / 2 + (fighter.slashDirection < 0 ? -100 : 0), y: fighter.y - 8, w: 100, h: fighter.h + 16 };
      if (reach.x < target.x + target.w && reach.x + reach.w > target.x && reach.y < target.y + target.h && reach.y + reach.h > target.y && target.invulnerable <= 0) {
        fighter.slashHit = true;
        hits.push({ target: target.id, owner: fighter.id, damage: 1, dx: fighter.slashDirection, power: 340 });
      }
    }
    if (!input.shotgun || fighter.shotgunCd > 0 || fighter.shells <= 0) return;
    fighter.shells -= 1; fighter.reloadTime = 0.95; fighter.shotgunCd = 0.7;
    fighter.anim = 'shot'; fighter.animTime = 0.2;
    const originX = fighter.x + fighter.w / 2;
    const originY = fighter.y + fighter.h * 0.4;
    const angle = Math.atan2(fighter.aimY, fighter.aimX);
    let pellets = 0;
    for (let i = 0; i < 5; i += 1) {
      const spread = (i - 2) * 0.055 + (random(state) - 0.5) * 0.025;
      const dx = Math.cos(angle + spread), dy = Math.sin(angle + spread);
      let distance = 470;
      for (const platform of ARENA.platforms) {
        const impact = rayBox(originX, originY, dx, dy, platform, distance);
        if (impact !== null) distance = Math.min(distance, impact);
      }
      const targetHit = rayBox(originX, originY, dx, dy, target, distance);
      if (targetHit !== null) { pellets += 1; distance = targetHit; }
      effect(state, 'shot', fighter, {
        x: originX, y: originY, dx, dy,
        endX: originX + dx * distance, endY: originY + dy * distance,
        time: 0.13, maxTime: 0.13,
      });
    }
    fighter.vx = clamp(fighter.vx - fighter.aimX * 170, -820, 820);
    if (!fighter.grounded) fighter.vy = clamp(fighter.vy - fighter.aimY * 140, -800, 1100);
    if (pellets && target.invulnerable <= 0) hits.push({ target: target.id, owner: fighter.id, damage: pellets >= 3 ? 2 : 1, dx: fighter.aimX, power: 300 });
  }

  function applyHits(state, hits) {
    // Resolve both players' attacks together, so a mutual final blow is a draw.
    for (const fighter of state.fighters) {
      const incoming = hits.filter(hit => hit.target === fighter.id);
      if (!incoming.length || fighter.invulnerable > 0) continue;
      const strongest = incoming.reduce((best, hit) => hit.damage > best.damage ? hit : best);
      fighter.hp = Math.max(0, fighter.hp - strongest.damage);
      fighter.invulnerable = 0.32; fighter.stun = 0.12;
      fighter.vx = strongest.dx * strongest.power; fighter.vy = -160;
      fighter.grounded = false; fighter.slashTime = 0;
      fighter.anim = fighter.hp ? 'hurt' : 'ko'; fighter.animTime = 0.25;
      effect(state, 'hit', fighter, { dx: strongest.dx, damage: strongest.damage, time: 0.3, maxTime: 0.3 });
    }
  }

  function fixedStep(state, inputs) {
    state.tick += 1;
    for (const fx of state.effects) fx.time -= FIXED_DT;
    state.effects = state.effects.filter(fx => fx.time > 0);
    if (state.phase !== 'playing') {
      for (let id = 0; id < 2; id += 1) {
        state.fighters[id].lastJump = inputs[id].jump;
        state.fighters[id].lastDash = inputs[id].dash;
      }
      if (state.phase === 'matchOver') return;
      state.phaseTime = Math.max(0, state.phaseTime - FIXED_DT);
      if (state.phaseTime <= 1e-8) {
        if (state.phase === 'countdown') { state.phase = 'playing'; state.phaseTime = 0; }
        else if (state.scores.some(score => score >= 2)) {
          state.phase = 'matchOver'; state.phaseTime = 0;
          state.winner = state.scores[0] >= 2 ? 0 : 1;
        } else beginRound(state);
      }
      return;
    }
    for (let id = 0; id < 2; id += 1) moveFighter(state, state.fighters[id], inputs[id]);
    const hits = [];
    for (let id = 0; id < 2; id += 1) attack(state, state.fighters[id], state.fighters[1 - id], inputs[id], hits);
    applyHits(state, hits);
    state.roundTime = Math.max(0, state.roundTime - FIXED_DT);
    if (state.fighters.some(fighter => fighter.hp <= 0)) finishRound(state, 'ko');
    else if (state.roundTime <= 1e-8) { state.roundTime = 0; finishRound(state, 'timeout'); }
  }

  function step(state, rawInputs = [], dt = FIXED_DT) {
    const inputs = [createInput(rawInputs && rawInputs[0]), createInput(rawInputs && rawInputs[1])];
    // Network traffic cannot stretch a tick or cause an unbounded catch-up loop.
    const elapsed = clamp(finite(dt), 0, 0.1);
    state.accumulator += elapsed;
    while (state.accumulator + 1e-9 >= FIXED_DT) {
      state.accumulator = Math.max(0, state.accumulator - FIXED_DT);
      fixedStep(state, inputs);
    }
    return state;
  }

  function snapshot(state) { return JSON.parse(JSON.stringify(state)); }

  return Object.freeze({ ARENA, FIXED_DT, createMatch, createInput, step, snapshot });
});
