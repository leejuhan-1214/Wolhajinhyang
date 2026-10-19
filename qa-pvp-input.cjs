/* Exercise the actual UI input pipeline with two isolated clients and a coalescing relay. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const engineSource = fs.readFileSync(`${__dirname}/pvp-simulation.js`, 'utf8');
const appSource = fs.readFileSync(`${__dirname}/pvp-app.js`, 'utf8');
const hooks = '\n globalThis.__PVP_QA__={connect,startMatch,receive,tick,clearControls,state:()=>({network,match,matchId,ready,remotePulses,localPulses,suspended})};\n';

async function pair() {
  let time = 0; const clients = [];
  class FakeNetwork {
    constructor(callbacks) { Object.assign(this, callbacks); this.queue = []; this.closed = false; this.transport = 'relay'; this.latency = 180; clients.push(this); }
    async host() { this.role = 'host'; this.code = 'AAAAAAAAAAAA'; return { role: this.role, code: this.code }; }
    async join() { this.role = 'guest'; this.code = 'AAAAAAAAAAAA'; return { role: this.role, code: this.code }; }
    send(message) {
      if (this.closed) return false;
      if (['input', 'state'].includes(message.type)) this.queue = this.queue.filter(item => item.type !== message.type);
      this.queue.push(JSON.parse(JSON.stringify(message))); return true;
    }
    close() { this.closed = true; this.queue = []; }
  }
  const relay = () => {
    for (let rounds = 0; rounds < 50; rounds += 1) {
      let count = 0;
      for (const client of clients) {
        const peer = clients.find(other => other !== client);
        for (const message of client.queue.splice(0)) { peer.onMessage(message); count += 1; }
      }
      if (!count) return;
    }
    throw new Error('relay did not settle');
  };
  function createClient() {
    const elements = new Map(), windowEvents = new Map(), documentEvents = new Map();
    const ctx = new Proxy({}, { get: (target, key) => key in target ? target[key] : key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
    const element = id => {
      if (!elements.has(id)) elements.set(id, {
        id, value: '', hidden: false, disabled: false, style: {}, firstChild: { textContent: '' }, listeners: new Map(),
        classList: { toggle() {} }, addEventListener(type, fn) { this.listeners.set(type, fn); },
        setAttribute() {}, focus() {}, select() {}, getContext: () => ctx,
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
      });
      return elements.get(id);
    };
    const document = {
      hidden: false, fullscreenEnabled: false, getElementById: element, createElement: () => element('offscreen'),
      addEventListener(type, fn) { documentEvents.set(type, fn); },
    };
    const context = {
      document, console, crypto, URL, Date, Uint32Array, HTMLInputElement: class {}, MoonlitNetwork: FakeNetwork,
      location: { href: 'https://example.test/pvp.html' }, navigator: {}, performance: { now: () => time },
      setInterval() {}, requestAnimationFrame() {}, addEventListener(type, fn) { windowEvents.set(type, fn); },
    };
    context.window = context; vm.createContext(context);
    vm.runInContext(fs.readFileSync(`${__dirname}/operative-renderer.js`, 'utf8'), context, { filename: 'operative-renderer.js' });
    vm.runInContext(engineSource, context, { filename: 'pvp-simulation.js' });
    vm.runInContext(appSource.replace(/\}\)\(\);\s*$/, hooks + '\n})();'), context, { filename: 'pvp-app.js' });
    const key = (type, code) => windowEvents.get(type)?.({ code, target: {}, preventDefault() {} });
    const pointer = (type, button) => {
      const target = type === 'pointerdown' ? element('duel-canvas').listeners : windowEvents;
      target.get(type)?.({ button, preventDefault() {} });
    };
    return { q: context.__PVP_QA__, elements, key, pointer, event: type => windowEvents.get(type)?.(), document, documentEvents };
  }
  const host = createClient(), guest = createClient();
  await host.q.connect('host'); guest.elements.get('room-input').value = 'AAAAAAAAAAAA'; await guest.q.connect('guest');
  clients.forEach(client => client.onPeer(true)); relay();
  host.elements.get('ready-button').listeners.get('click')(); guest.elements.get('ready-button').listeners.get('click')(); relay();
  host.q.startMatch(); relay();
  for (const client of [host, guest]) { client.q.state().match.phase = 'playing'; client.q.state().match.phaseTime = 0; }
  return { host, guest, clients, relay, at(value) { time = value; }, frame(value) { time = value; host.q.tick(); } };
}

let count = 0;
async function test(name, run) { await run(); count += 1; console.log(`PASS ${name}`); }
(async () => {
  await test('a guest jump tap survives a relay replacing pressed input with released input', async () => {
    const p = await pair(); p.at(31); p.guest.key('keydown', 'Space'); p.guest.q.tick();
    p.at(32); p.guest.key('keyup', 'Space'); p.at(64); p.guest.q.tick();
    assert.equal(p.clients[1].queue.filter(m => m.type === 'input').length, 1);
    assert.equal(p.clients[1].queue.find(m => m.type === 'input').input.jump, false);
    p.relay(); p.frame(65);
    const fighter = p.host.q.state().match.fighters[1]; assert.equal(fighter.jumps, 1); assert.ok(fighter.y < 584);
  });

  await test('two guest taps in one relay delivery produce two distinct jump edges', async () => {
    const p = await pair();
    for (let i = 0; i < 2; i += 1) { p.guest.key('keydown', 'Space'); p.guest.key('keyup', 'Space'); }
    p.relay(); p.frame(70);
    const state = p.host.q.state().match; assert.equal(state.fighters[1].jumps, 2);
    assert.equal(state.effects.filter(effect => effect.owner === 1 && effect.type === 'jump').length, 2);
  });

  await test('held jump and repeated keydown events trigger only one jump', async () => {
    const p = await pair(); p.guest.key('keydown', 'Space');
    for (let i = 0; i < 8; i += 1) p.guest.key('keydown', 'Space');
    p.at(31); p.guest.q.tick(); p.relay(); p.frame(200);
    assert.equal(p.host.q.state().match.fighters[1].jumps, 1);
    assert.equal(p.host.q.state().remotePulses.jump, 0);
  });

  await test('a reliable press arriving before the next input sample preserves held jump height', async () => {
    const p = await pair(); p.guest.key('keydown', 'Space'); p.relay(); p.frame(20);
    p.at(31); p.guest.q.tick(); p.relay(); p.frame(60);
    const f = p.host.q.state().match.fighters[1]; assert.equal(f.lastJump, true); assert.equal(f.jumps, 1);
    assert.ok(f.vy < -600);
  });

  await test('quick guest dash and mouse attack taps survive without an input sampling tick', async () => {
    const p = await pair(); p.guest.key('keydown', 'ShiftLeft'); p.guest.key('keyup', 'ShiftLeft');
    p.relay(); p.frame(20); assert.ok(p.host.q.state().match.fighters[1].dashCd > 1);
    p.frame(220); p.guest.pointer('pointerdown', 2); p.guest.pointer('pointerup', 2);
    p.relay(); p.frame(240); assert.equal(p.host.q.state().match.fighters[1].shells, 1);
  });

  await test('relay jitter preserves held movement but missing controls still expire', async () => {
    const p = await pair(); p.clients[0].latency = 400;
    p.at(31); p.guest.key('keydown', 'KeyA'); p.guest.q.tick(); p.relay();
    for (let time = 100; time <= 900; time += 100) p.frame(time);
    assert.ok(p.host.q.state().match.fighters[1].vx < -200, 'a slow relay must not clear held input before its next response');
    for (let time = 1000; time <= 1600; time += 100) p.frame(time);
    assert.equal(p.host.q.state().match.fighters[1].vx, 0, 'lost controls cannot move the fighter indefinitely');
  });

  await test('blur clears reliable pending actions before they reach the simulation', async () => {
    const p = await pair(); p.guest.key('keydown', 'Space'); p.guest.event('blur'); p.relay(); p.frame(40);
    assert.equal(p.host.q.state().match.fighters[1].jumps, 0);
    assert.equal(p.host.q.state().remotePulses.jump, 0);
  });

  await test('host taps shorter than a simulation frame are retained', async () => {
    const p = await pair(); p.host.key('keydown', 'Space'); p.host.key('keyup', 'Space'); p.frame(20);
    assert.equal(p.host.q.state().match.fighters[0].jumps, 1);
  });

  await test('stale-match, duplicate, and overfilled action pulses cannot create extra presses', async () => {
    const p = await pair(); const id = p.host.q.state().matchId;
    p.host.q.receive({ type: 'action', matchId: 'old', seq: 900, action: 'jump' });
    p.host.q.receive({ type: 'action', matchId: id, seq: 10, action: 'jump' });
    p.host.q.receive({ type: 'action', matchId: id, seq: 10, action: 'jump' });
    assert.equal(p.host.q.state().remotePulses.jump, 1);
    for (let seq = 11; seq < 30; seq += 1) p.host.q.receive({ type: 'action', matchId: id, seq, action: 'jump' });
    assert.equal(p.host.q.state().remotePulses.jump, 4);
    p.host.q.receive({ type: 'action', matchId: id, seq: 31, action: 'clear' });
    p.frame(40); assert.equal(p.host.q.state().match.fighters[1].jumps, 0);
  });

  await test('host suspension clears queued presses and resumes without stale movement', async () => {
    const p = await pair(); p.guest.key('keydown', 'Space'); p.relay();
    p.host.document.hidden = true; p.host.documentEvents.get('visibilitychange')(); p.relay(); p.frame(200);
    assert.equal(p.host.q.state().match.fighters[1].jumps, 0);
    p.host.document.hidden = false; p.host.documentEvents.get('visibilitychange')(); p.relay(); p.frame(220);
    assert.equal(p.host.q.state().match.fighters[1].jumps, 0);
  });

  await test('synchronous network failure during a snapshot does not dereference a cleared match', async () => {
    const p = await pair(); const client = p.host.q.state().network;
    client.send = () => { client.onClose(); return false; };
    assert.doesNotThrow(() => p.frame(70)); assert.equal(p.host.q.state().match, null);
  });

  console.log(`PvP input: ${count} checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
