/* Deterministic transport tests: no live services, sockets, or browser required. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(`${__dirname}/pvp-network.js`, 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };

function mockBackend() {
  const rooms = new Map();
  const calls = [];
  let roomNumber = 0, tokenNumber = 0, loseResponse = false, held = null;
  const participant = () => ({ token: `token-${++tokenNumber}`, packet: new Map(), ack: 0, left: false });
  const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  function handle(url, request) {
    const body = JSON.parse(request.body);
    const path = new URL(url).pathname.replace('/api/pvp', '');
    calls.push({ path, body });
    if (path === '/rooms') {
      const code = `AAAAAAAAAAA${String.fromCharCode(65 + roomNumber++)}`;
      const room = { code, host: participant(), guest: null }; rooms.set(code, room);
      return reply(200, { code, role: 'host', token: room.host.token });
    }
    const [, code, action] = path.match(/^\/rooms\/([A-Z2-7]{12})\/(join|exchange|leave)$/) || [];
    const room = rooms.get(code);
    if (!room) return reply(404, { message: '방을 찾을 수 없습니다.' });
    if (action === 'join') {
      if (room.guest) return reply(409, { message: '이미 두 명이 참가한 방입니다.' });
      room.guest = participant();
      return reply(200, { code, role: 'guest', token: room.guest.token });
    }
    const role = room.host.token === body.token ? 'host' : room.guest?.token === body.token ? 'guest' : null;
    if (!role) return reply(403, { message: '잘못된 참가자입니다.' });
    const self = room[role], peer = room[role === 'host' ? 'guest' : 'host'];
    if (action === 'leave') { self.left = true; return reply(200, { ok: true }); }
    for (const item of body.packet || []) if (item.id > self.ack) self.packet.set(item.id, JSON.parse(JSON.stringify(item)));
    if (peer) {
      peer.ack = Math.max(peer.ack, body.ack || 0);
      for (const id of peer.packet.keys()) if (id <= peer.ack) peer.packet.delete(id);
    }
    return reply(200, { peerConnected: Boolean(peer && !peer.left), peerLeft: Boolean(peer?.left), packet: peer ? [...peer.packet.values()] : [], ack: self.ack });
  }
  return {
    rooms, calls,
    holdNext() { held = deferred(); return held; },
    loseNextResponse() { loseResponse = true; },
    async fetch(url, request) {
      const response = handle(url, request);
      if (held) { const pending = held; held = null; await pending.promise; }
      if (loseResponse) { loseResponse = false; throw new TypeError('mock interrupted response'); }
      return response;
    },
  };
}

function runtime({ rtc } = {}) {
  let now = 0, nextTimer = 0;
  const timers = new Map();
  const backend = mockBackend();
  function schedule(fn, delay, repeat) { const id = ++nextTimer; timers.set(id, { fn, at: now + (Number(delay) || 0), repeat }); return id; }
  const context = {
    module: { exports: {} }, console, AbortController, TextEncoder,
    fetch: backend.fetch, performance: { now: () => now },
    setTimeout: (fn, delay) => schedule(fn, delay, 0), clearTimeout: id => timers.delete(id),
    setInterval: (fn, delay) => schedule(fn, delay, delay), clearInterval: id => timers.delete(id),
  };
  if (rtc) context.RTCPeerConnection = rtc;
  vm.runInNewContext(source, context, { filename: 'pvp-network.js' });
  async function advance(ms) {
    const until = now + ms;
    for (let loops = 0; loops < 10000; loops += 1) {
      await flush();
      const due = [...timers.entries()].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) { now = until; await flush(); return; }
      const [id, timer] = due; now = timer.at;
      if (timer.repeat) timer.at += timer.repeat; else timers.delete(id);
      timer.fn();
    }
    throw new Error('mock timer loop did not settle');
  }
  return { Network: context.module.exports, backend, advance, timers, now: () => now };
}

function makeRtc() {
  const offer = deferred(); const remote = deferred(); const instances = [];
  class Channel {
    constructor() { this.readyState = 'connecting'; this.bufferedAmount = 0; this.sent = []; }
    send(message) { if (this.readyState !== 'open') throw new Error('channel closed'); this.sent.push(JSON.parse(message)); }
    close() { this.readyState = 'closed'; }
    open() { this.readyState = 'open'; this.onopen?.(); }
  }
  class Peer {
    constructor() { this.connectionState = 'new'; instances.push(this); }
    createDataChannel() { return this.channel = new Channel(); }
    createOffer() { return offer.promise; }
    createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'mock answer' }); }
    async setLocalDescription(value) { this.localDescription = { ...value, toJSON: () => value }; }
    async setRemoteDescription(value) { await remote.promise; this.remoteDescription = value; }
    async addIceCandidate(value) { this.lastCandidate = value; }
    close() { this.connectionState = 'closed'; }
  }
  return { Peer, Channel, offer, remote, instances };
}

let passed = 0, failed = 0;
async function test(name, run) {
  try { await run(); passed += 1; console.log(`PASS ${name}`); }
  catch (error) { failed += 1; console.error(`FAIL ${name}: ${error.stack}`); }
}

(async () => {
  await test('invite normalization and room-full errors preserve the existing pair', async () => {
    const rt = runtime(); const a = new rt.Network({ direct: false }), b = new rt.Network({ direct: false }), c = new rt.Network({ direct: false });
    const room = await a.host();
    await b.join(` ${room.code.slice(0, 4).toLowerCase()}-${room.code.slice(4).toLowerCase()} `);
    assert.equal(a.code, b.code); assert.equal(b.role, 'guest');
    await assert.rejects(c.join(room.code), error => error.status === 409);
    await assert.rejects(c.join('not valid'), /12/);
    await rt.advance(200); assert.equal(a.peerConnected, true); assert.equal(b.peerConnected, true);
    a.close(); b.close(); c.close();
  });

  await test('reliable controls survive a lost response while volatile updates coalesce', async () => {
    const rt = runtime(); const received = [];
    const a = new rt.Network({ direct: false }), b = new rt.Network({ direct: false, onMessage: value => received.push(value) });
    await a.host(); await b.join(a.code); await rt.advance(200);
    a.send({ type: 'ready', value: true });
    for (let i = 0; i < 30; i += 1) a.send({ type: 'state', tick: i });
    a.send({ type: 'start', matchId: 'one' });
    assert.equal(a.outbox.size, 3);
    rt.backend.loseNextResponse();
    await rt.advance(700);
    assert.deepEqual(received.map(value => value.type), ['ready', 'state', 'start']);
    assert.equal(received[1].tick, 29);
    assert.equal(a.outbox.size, 0);
    a.close(); b.close();
  });

  await test('send takes an immutable snapshot and ACKs cannot delete future messages', async () => {
    const rt = runtime(); const a = new rt.Network({ direct: false }); await a.host();
    const value = { type: 'state', snapshot: { hp: 5 } }; a.send(value); value.snapshot.hp = 0;
    assert.equal([...a.outbox.values()][0].payload.snapshot.hp, 5);
    a.acknowledge(99); a.acknowledge(-1); a.acknowledge(NaN); a.acknowledge(0.5);
    assert.equal(a.outbox.size, 1); a.acknowledge(1); assert.equal(a.outbox.size, 0);
    assert.equal(a.send({ type: 'state', huge: 'a'.repeat(25000) }), false);
    const circular = {}; circular.self = circular; assert.equal(a.send(circular), false);
    a.close();
  });

  await test('duplicate delivery reaches the game once and malformed packets are ignored', async () => {
    const rt = runtime(); const messages = []; const a = new rt.Network({ direct: false, onMessage: value => messages.push(value) }); await a.host();
    a.receive([{ id: 1, payload: { type: 'ready' } }, { id: 2, payload: { type: 'start' } }], 0);
    a.receive([{ id: 1, payload: { type: 'ready' } }, { id: 2, payload: { type: 'start' } }], 0);
    a.receive([{ id: NaN, payload: {} }, { id: -10, payload: {} }, null, { id: 3, payload: null }], -1);
    a.receive(new Array(65).fill({ id: 3, payload: { type: 'bad' } }), 0);
    a.receive([{ id: 3, payload: { type: 'large', content: '한'.repeat(9000) } }, { id: 4, payload: [] }], 0);
    assert.deepEqual(messages.map(message => message.type), ['ready', 'start']);
    assert.equal(a.received, 2); a.close();
  });

  await test('UTF-8 message and complete request byte limits fail safely before sending', async () => {
    const rt = runtime(); const reasons = []; const a = new rt.Network({ direct: false, onClose: reason => reasons.push(reason) }); await a.host();
    assert.equal(a.send({ type: 'state', content: '한'.repeat(9000) }), false, 'Korean text is three UTF-8 bytes per character');
    assert.equal(a.send({ toJSON: () => undefined }), false);
    assert.equal(a.send({ toJSON: () => 'a string instead of an object' }), false);
    assert.equal(a.send({ type: 'start', content: '한'.repeat(7900) }), true);
    assert.equal(a.send({ type: 'start', content: '한'.repeat(7900) }), true);
    assert.equal(a.send({ type: 'start', content: '한'.repeat(7900) }), false);
    assert.equal(a.closed, true); assert.equal(reasons.length, 1); assert.equal(a.outbox.size, 0);
    await rt.advance(300);
    assert.ok(rt.backend.calls.every(call => Buffer.byteLength(JSON.stringify(call.body)) <= 48000));
  });

  await test('leaving notifies the peer once and cancels all future exchange polling', async () => {
    const rt = runtime(); const closed = []; const a = new rt.Network({ direct: false }), b = new rt.Network({ direct: false, onClose: reason => closed.push(reason) });
    await a.host(); await b.join(a.code); await rt.advance(200); a.close();
    await rt.advance(500); assert.equal(b.closed, true); assert.equal(closed.length, 1);
    const calls = rt.backend.calls.length; await rt.advance(5000); assert.equal(rt.backend.calls.length, calls);
  });

  await test('closing during an exchange prevents stale message delivery', async () => {
    const rt = runtime(); const received = []; const a = new rt.Network({ direct: false, onMessage: value => received.push(value) }), b = new rt.Network({ direct: false });
    await a.host(); await b.join(a.code); await rt.advance(200);
    b.send({ type: 'start' }); await b.exchange(b.generation);
    const held = rt.backend.holdNext(); const exchange = a.exchange(a.generation); await flush(); a.close();
    held.resolve(); await exchange; assert.equal(received.length, 0);
    b.close();
  });

  await test('an open request cancelled before its response cleans up the allocated room', async () => {
    const rt = runtime(); const a = new rt.Network({ direct: false });
    const held = rt.backend.holdNext(); const opened = a.host(); await flush(); a.close(); held.resolve();
    await assert.rejects(opened, /취소/); await flush();
    const room = [...rt.backend.rooms.values()][0];
    assert.equal(room.host.left, true, 'the cancelled request must leave its allocated room');
  });

  await test('an asynchronous offer from a closed session cannot enter a new room', async () => {
    const rtc = makeRtc(); const rt = runtime({ rtc: rtc.Peer }); const a = new rt.Network();
    await a.host(); const oldOffer = a.startRtc(); a.close(); await a.host();
    rtc.offer.resolve({ type: 'offer', sdp: 'old room offer' }); await oldOffer;
    assert.equal(a.outbox.size, 0, 'stale SDP must not be sent to the new opponent');
    a.close();
  });

  await test('an asynchronous answer from a closed session cannot enter a new room', async () => {
    const rtc = makeRtc(); const rt = runtime({ rtc: rtc.Peer }); const host = new rt.Network({ direct: false }), a = new rt.Network();
    await host.host(); await a.join(host.code);
    const oldAnswer = a.signal({ description: { type: 'offer', sdp: 'old offer' } }); await flush();
    a.close(); await a.host(); rtc.remote.resolve(); await oldAnswer;
    assert.equal(a.outbox.size, 0, 'stale answer must not be sent to the new opponent');
    a.close(); host.close();
  });

  await test('stale datachannel callbacks cannot change or inject data into a new room', async () => {
    const rtc = makeRtc(); const rt = runtime({ rtc: rtc.Peer }); const messages = [];
    const a = new rt.Network({ onMessage: value => messages.push(value) }); await a.host();
    const channel = new rtc.Channel(); a.bindChannel(channel);
    const oldOpen = channel.onopen, oldMessage = channel.onmessage, oldClose = channel.onclose;
    a.close(); await a.host();
    oldOpen(); oldMessage({ data: JSON.stringify({ packet: [{ id: 900, payload: { type: 'start', matchId: 'stale' } }] }) }); oldClose();
    assert.equal(a.transport, 'relay'); assert.equal(a.received, 0); assert.equal(messages.length, 0);
    assert.equal(a.pingTimer, undefined); a.close();
  });

  await test('direct backpressure falls back to relay without losing queued control messages', async () => {
    const rtc = makeRtc(); const rt = runtime({ rtc: rtc.Peer }); const received = [];
    const a = new rt.Network({ direct: false }), b = new rt.Network({ direct: false, onMessage: value => received.push(value) });
    await a.host(); await b.join(a.code); await rt.advance(200);
    const channel = new rtc.Channel(); a.bindChannel(channel); channel.open(); channel.bufferedAmount = 128001;
    a.send({ type: 'start', matchId: 'fallback' }); assert.equal(a.transport, 'relay'); assert.equal(a.outbox.size, 1);
    assert.equal(channel.readyState, 'closed'); assert.equal(a.channel, null);
    await rt.advance(400); assert.equal(received.length, 1); assert.equal(received[0].matchId, 'fallback'); assert.equal(a.outbox.size, 0);
    a.close(); b.close();
  });

  await test('SDP and ICE signals are serialized while remote description is pending', async () => {
    const rtc = makeRtc(); const rt = runtime({ rtc: rtc.Peer }); const host = new rt.Network({ direct: false }), guest = new rt.Network();
    await host.host(); await guest.join(host.code);
    guest.receive([
      { id: 1, payload: { type: '__signal', description: { type: 'offer', sdp: 'current offer' } } },
      { id: 2, payload: { type: '__signal', candidate: { candidate: 'candidate:current' } } },
    ], 0);
    await flush(); const pc = rtc.instances[0]; assert.equal(pc.lastCandidate, undefined);
    rtc.remote.resolve(); await guest.signalQueue;
    assert.equal(pc.remoteDescription.sdp, 'current offer'); assert.equal(pc.lastCandidate.candidate, 'candidate:current');
    assert.equal([...guest.outbox.values()][0].payload.description.type, 'answer');
    host.close(); guest.close();
  });

  await test('direct ACK removes the sender queue and relay duplicates are harmless', async () => {
    const rtc = makeRtc(); const rt = runtime({ rtc: rtc.Peer }); const received = [];
    const a = new rt.Network({ direct: false }), b = new rt.Network({ direct: false, onMessage: value => received.push(value) });
    await a.host(); await b.join(a.code); await rt.advance(200);
    const ca = new rtc.Channel(), cb = new rtc.Channel(); a.bindChannel(ca); b.bindChannel(cb); ca.open(); cb.open();
    a.send({ type: 'start', matchId: 'direct' });
    const sent = ca.sent[ca.sent.length - 1]; cb.onmessage({ data: JSON.stringify(sent) });
    const ack = cb.sent[cb.sent.length - 1]; ca.onmessage({ data: JSON.stringify(ack) });
    assert.equal(a.outbox.size, 0); assert.equal(received.length, 1);
    b.receive(sent.packet, sent.ack); assert.equal(received.length, 1);
    a.fallback(); b.fallback();
    a.send({ type: 'rematch', matchId: 'after-direct' }); await rt.advance(1500);
    assert.deepEqual(received.map(value => value.type), ['start', 'rematch']);
    a.close(); b.close();
  });

  console.log(`PvP network: ${passed} passed, ${failed} failed.`);
  process.exitCode = failed ? 1 : 0;
})();
