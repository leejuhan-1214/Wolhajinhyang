/* Presentation clock and local prediction; only the host decides combat results. */
(function (root, factory) {
  const api = factory();
  root.MoonlitDuelView = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  function interpolate(a, b, t) {
    const result = { ...b };
    if (a && Math.hypot(b.x - a.x, b.y - a.y) < 180) {
      for (const key of ['x', 'y', 'vx', 'vy']) result[key] = lerp(a[key], b[key], t);
      if (a.anim === b.anim) result.animTime = lerp(a.animTime, b.animTime, t);
    }
    return result;
  }

  class DuelView {
    constructor(engine, ownIndex = 1) { this.engine = engine; this.ownIndex = ownIndex; this.state = null; }

    reset(state, now) {
      this.state = state; this.frames = [{ state, at: now }]; this.lastReceived = now;
      this.clockOffset = now - state.tick * 1000 / 60; this.interval = 1000 / 30; this.jitter = 0;
      this.lastTarget = state.tick * 1000 / 60 - 33;
      this.predicted = { ...state.fighters[this.ownIndex] }; this.previousPrediction = { ...this.predicted };
      this.history = []; this.correction = { x: 0, y: 0 }; this.lastRender = now;
    }

    predict(seq, input, presses) {
      if (!this.state || this.state.phase !== 'playing' || this.predicted.hp <= 0) return;
      this.previousPrediction = this.predicted;
      this.predicted = this.engine.predictFighter(this.predicted, input);
      this.history.push({ seq, input: { ...input }, presses: { ...presses } });
      if (this.history.length > 120) this.history.shift();
    }

    receive(state, inputAck, actionAck, now) {
      if (!this.state || state.round !== this.state.round || state.phase !== this.state.phase || state.phase !== 'playing') {
        this.reset(state, now); return;
      }
      const gap = clamp(now - this.lastReceived, 1, 1000);
      this.jitter += (Math.abs(gap - this.interval) - this.jitter) * .15;
      this.interval += (gap - this.interval) * .15;
      // Follow the host clock gently so packet jitter cannot rewind the remote player.
      const transit = now - state.tick * 1000 / 60;
      this.clockOffset += clamp(transit - this.clockOffset, -30, 5) * .2;
      this.frames.push({ state, at: now });
      if (this.frames.length > 32) this.frames.shift();
      const old = this.predicted, previousPrediction = this.previousPrediction;
      const oldX = old.x + this.correction.x, oldY = old.y + this.correction.y;
      const authority = state.fighters[this.ownIndex];
      this.history = Number.isSafeInteger(inputAck) ? this.history.filter(frame => frame.seq > inputAck) : [];
      let predicted = { ...authority };
      for (const frame of this.history) {
        // A reliable tap may already have reached the host before its input sample.
        if (frame.input.jump && frame.presses.jump <= actionAck) predicted.lastJump = true;
        if (frame.input.dash && frame.presses.dash <= actionAck) predicted.lastDash = true;
        predicted = this.engine.predictFighter(predicted, frame.input);
      }
      const dx = oldX - predicted.x, dy = oldY - predicted.y;
      const hardCorrection = authority.hp < this.state.fighters[this.ownIndex].hp || Math.hypot(dx, dy) > 150;
      this.correction = hardCorrection ? { x: 0, y: 0 } : { x: dx, y: dy };
      this.predicted = predicted;
      this.previousPrediction = { ...predicted,
        x: predicted.x + (hardCorrection ? 0 : previousPrediction.x - old.x),
        y: predicted.y + (hardCorrection ? 0 : previousPrediction.y - old.y),
      };
      this.state = state; this.lastReceived = now;
    }

    render(now, alpha) {
      if (!this.state) return null;
      const state = { ...this.state, fighters: this.state.fighters.map(f => ({ ...f })) };
      if (state.phase !== 'playing') return state;
      const delay = clamp(this.interval + this.jitter * 2, 33, 120);
      const target = Math.max(this.lastTarget, now - this.clockOffset - delay);
      this.lastTarget = target;
      let before = this.frames[0].state, after = before;
      for (const frame of this.frames) {
        after = frame.state;
        if (after.tick * 1000 / 60 >= target) break;
        before = after;
      }
      const remote = 1 - this.ownIndex;
      const span = (after.tick - before.tick) * 1000 / 60;
      if (span > 0) {
        state.fighters[remote] = interpolate(before.fighters[remote], after.fighters[remote], clamp((target - before.tick * 1000 / 60) / span, 0, 1));
      } else {
        const f = after.fighters[remote];
        const ahead = clamp((target - after.tick * 1000 / 60) / 1000, 0, .1);
        // Bounded extrapolation shares terrain collision, so a late packet cannot draw through a platform.
        const input = {
          move: clamp(f.vx / 320, -1, 1), jump: f.lastJump, dash: f.lastDash, aimX: f.aimX, aimY: f.aimY,
        };
        const ticks = ahead / this.engine.FIXED_DT, whole = Math.floor(ticks + 1e-8);
        const first = this.engine.predictFighter(f, input, whole * this.engine.FIXED_DT);
        const next = this.engine.predictFighter(first, input);
        state.fighters[remote] = interpolate(first, next, clamp(ticks - whole, 0, 1));
      }
      const decay = Math.exp(-clamp(now - this.lastRender, 0, 100) / 65);
      this.correction.x *= decay; this.correction.y *= decay; this.lastRender = now;
      const local = interpolate(this.previousPrediction, this.predicted, clamp(alpha, 0, 1));
      local.x = clamp(local.x + this.correction.x, this.engine.ARENA.left, this.engine.ARENA.right - local.w);
      local.y += this.correction.y;
      // Damage and outcomes always come from the latest authoritative state.
      local.hp = state.fighters[this.ownIndex].hp; state.fighters[this.ownIndex] = local;
      const age = Math.max(0, (now - this.lastReceived) / 1000);
      state.effects = state.effects.map(e => ({ ...e, time: Math.max(0, e.time - age) })).filter(e => e.time > 0);
      return state;
    }
  }
  return Object.freeze({ DuelView, interpolate });
});
