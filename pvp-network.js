(() => {
  "use strict";
  const DEFAULT_SERVICE = "https://wolhajinhyang-live-world.magic-shark-7297.chatgpt.site";
  const VOLATILE = new Set(["input", "state"]);
  const noop = () => {};
  const encoder = new TextEncoder();
  const bytes = value => encoder.encode(value).byteLength;
  const MAX_MESSAGE_BYTES = 24000, MAX_ENVELOPE_BYTES = 48000;

  // Reliable control messages share the same ordered mailbox as replaceable
  // input/snapshots. HTTPS is always available; WebRTC upgrades the same session.
  class MoonlitNetwork {
    constructor({ onStatus = noop, onMessage = noop, onPeer = noop, onClose = noop, baseUrl = DEFAULT_SERVICE, direct = true } = {}) {
      Object.assign(this, { onStatus, onMessage, onPeer, onClose });
      this.baseUrl = baseUrl.replace(/\/$/, "");
      this.allowDirect = direct;
      this.role = null;
      this.code = "";
      this.transport = "relay";
      this.latency = 0;
      this.closed = true;
      this.generation = 0;
      this.outbox = new Map();
      this.ice = [];
    }

    async request(path, body, timeout = 8000) {
      const encoded = JSON.stringify(body);
      if (bytes(encoded) > MAX_ENVELOPE_BYTES) throw new Error("대전 메시지가 너무 큽니다. 새 방에서 다시 시도해 주세요.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(this.baseUrl + "/api/pvp" + path, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: encoded, signal: controller.signal, cache: "no-store",
        });
        const value = await response.json();
        if (!response.ok) {
          const error = new Error(value.message || "대전 서버에 연결하지 못했습니다.");
          error.status = response.status;
          throw error;
        }
        return value;
      } finally { clearTimeout(timer); }
    }

    async host() { return this.open("/rooms", {}); }

    async join(rawCode) {
      const code = String(rawCode || "").replace(/[\s-]/g, "").toUpperCase();
      if (!/^[A-Z2-7]{12}$/.test(code)) throw new Error("12자리 초대 코드를 확인해 주세요.");
      return this.open(`/rooms/${code}/join`, {});
    }

    async open(path, body) {
      this.close();
      const generation = ++this.generation;
      this.onStatus("대전 서버에 연결하는 중…");
      const result = await this.request(path, body);
      const valid = result && /^[A-Z2-7]{12}$/.test(result.code) && ["host", "guest"].includes(result.role) && typeof result.token === "string" && result.token.length > 0 && result.token.length <= 256;
      if (generation !== this.generation) {
        if (valid) this.request(`/rooms/${result.code}/leave`, { token: result.token }, 3000).catch(noop);
        throw new Error("연결이 취소되었습니다.");
      }
      if (!valid) {
        throw new Error("대전 서버 응답을 확인하지 못했습니다.");
      }
      Object.assign(this, {
        role: result.role, code: result.code, token: result.token, closed: false,
        transport: "relay", peerConnected: false, received: 0, nextId: 0, seq: 0,
        lastSuccess: performance.now(), rtcStarted: false, rtcDisabled: false,
        inFlight: 0, latestResponseSeq: -1,
      });
      this.outbox.clear();
      this.ice = [];
      this.signalQueue = Promise.resolve();
      this.onStatus(this.role === "host" ? "상대의 입장을 기다리는 중" : "대전 방에 입장했습니다.");
      this.timer = setTimeout(() => this.poll(generation), 0);
      return { code: this.code, role: this.role };
    }

    send(payload) {
      if (this.closed || !payload || typeof payload !== "object" || Array.isArray(payload)) return false;
      let encoded;
      try { encoded = JSON.stringify(payload); } catch { return false; }
      if (typeof encoded !== "string" || encoded.length > MAX_MESSAGE_BYTES || bytes(encoded) > MAX_MESSAGE_BYTES) return false;
      const copy = JSON.parse(encoded);
      if (!copy || typeof copy !== "object" || Array.isArray(copy)) return false;
      if (VOLATILE.has(copy.type) && !copy.reliable) {
        for (const [id, item] of this.outbox) if (item.payload.type === copy.type && !item.payload.reliable) this.outbox.delete(id);
      }
      if (this.outbox.size >= 48) {
        this.fail("통신이 지연되어 대전을 중단했습니다. 새 방에서 다시 시도해 주세요.");
        return false;
      }
      // Copy now: the simulation mutates its state after send returns.
      const item = { id: ++this.nextId, payload: copy };
      this.outbox.set(item.id, item);
      if (bytes(JSON.stringify({ token: this.token, seq: this.seq + 1, packet: [...this.outbox.values()], ack: this.received })) > MAX_ENVELOPE_BYTES) {
        this.fail("통신 대기 메시지가 너무 많아 대전을 중단했습니다. 새 방에서 다시 시도해 주세요.");
        return false;
      }
      this.sendDirect();
      return true;
    }

    acknowledge(ack) {
      if (!Number.isSafeInteger(ack) || ack < 0 || ack > this.nextId) return;
      for (const id of this.outbox.keys()) if (id <= ack) this.outbox.delete(id);
    }

    receive(packet, ack) {
      this.acknowledge(ack);
      if (!Array.isArray(packet) || packet.length > 64) return;
      for (const item of packet) {
        if (!item || !Number.isSafeInteger(item.id) || item.id <= this.received || !item.payload || typeof item.payload !== "object" || Array.isArray(item.payload)) continue;
        try { if (bytes(JSON.stringify(item.payload)) > MAX_MESSAGE_BYTES) continue; } catch { continue; }
        this.received = item.id;
        if (item.payload.type === "__signal") {
          const generation = this.generation;
          this.signalQueue = this.signalQueue.then(() => {
            if (!this.closed && generation === this.generation) return this.signal(item.payload);
          }).catch(() => { if (!this.closed && generation === this.generation) this.fallback(); });
        } else {
          try { this.onMessage(item.payload); } catch (error) { console.error("대전 메시지 처리 실패", error); }
        }
      }
    }

    poll(generation) {
      if (this.closed || generation !== this.generation) return;
      // At most three concurrent relay requests: latency no longer serializes every update.
      this.timer = setTimeout(() => this.poll(generation), this.transport === "direct" ? 1000 : 80);
      const limit = this.transport === "direct" ? 1 : 3;
      if (this.inFlight < limit) this.exchange(generation);
    }

    async exchange(generation) {
      if (this.closed || generation !== this.generation) return;
      const began = performance.now();
      const sequence = ++this.seq;
      this.inFlight += 1;
      try {
        const result = await this.request(`/rooms/${this.code}/exchange`, {
          token: this.token, seq: sequence,
          packet: [...this.outbox.values()], ack: this.received,
        }, 5000);
        if (this.closed || generation !== this.generation) return;
        this.lastSuccess = performance.now();
        if (sequence <= this.latestResponseSeq) return;
        this.latestResponseSeq = sequence;
        if (this.transport === "relay") this.latency = Math.round(this.lastSuccess - began);
        if (result.peerLeft) return this.fail("상대가 방을 나갔습니다. 새 방에서 다시 대전할 수 있습니다.");
        if (result.peerConnected && !this.peerConnected) {
          this.peerConnected = true;
          this.onPeer(true);
          this.onStatus("상대와 연결되었습니다.");
          if (this.closed || generation !== this.generation) return;
          if (this.role === "host") this.startRtc().catch(() => { if (!this.closed && generation === this.generation) this.fallback(); });
        }
        if (this.peerConnected && !result.peerConnected && this.transport !== "direct") {
          return this.fail("상대와의 연결이 끊겼습니다. 새 방에서 다시 시도해 주세요.");
        }
        this.receive(result.packet, result.ack);
      } catch (error) {
        if (this.closed || generation !== this.generation) return;
        if (sequence <= this.latestResponseSeq) return;
        if ([401, 403, 404, 410].includes(error.status) || performance.now() - this.lastSuccess > 15000) {
          return this.fail(error.status === 410 ? "대전 방이 만료되었습니다. 새 방을 만들어 주세요." : "서버 연결이 끊겼습니다. 새 방에서 다시 시도해 주세요.");
        }
        this.onStatus("연결을 복구하는 중…");
      } finally {
        if (generation === this.generation) this.inFlight = Math.max(0, this.inFlight - 1);
      }
    }

    makeRtc() {
      if (this.pc || !this.allowDirect || this.rtcDisabled || typeof RTCPeerConnection === "undefined") return this.pc;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      const generation = this.generation;
      const current = () => !this.closed && generation === this.generation && this.pc === pc;
      this.pc = pc;
      pc.onicecandidate = event => {
        if (event.candidate && current()) this.send({ type: "__signal", candidate: event.candidate.toJSON() });
      };
      pc.ondatachannel = event => { if (current()) this.bindChannel(event.channel); else event.channel.close(); };
      pc.onconnectionstatechange = () => {
        if (current() && ["failed", "disconnected"].includes(pc.connectionState)) this.fallback();
      };
      return pc;
    }

    async startRtc() {
      if (this.closed || this.rtcStarted || !this.allowDirect || this.rtcDisabled) return;
      this.rtcStarted = true;
      const pc = this.makeRtc();
      if (!pc) return;
      const generation = this.generation;
      const current = () => !this.closed && generation === this.generation && this.pc === pc;
      this.bindChannel(pc.createDataChannel("moonlit-duel", { ordered: true }));
      const offer = await pc.createOffer();
      if (!current()) return;
      await pc.setLocalDescription(offer);
      if (current()) this.send({ type: "__signal", description: pc.localDescription.toJSON() });
    }

    async signal(message) {
      if (this.closed || !this.allowDirect || this.rtcDisabled) return;
      const pc = this.makeRtc();
      if (!pc) return;
      const generation = this.generation;
      const current = () => !this.closed && generation === this.generation && this.pc === pc;
      if (message.description && typeof message.description.sdp === "string" && message.description.sdp.length < 16000) {
        const type = message.description.type;
        if ((this.role === "guest" && type !== "offer") || (this.role === "host" && type !== "answer")) return;
        await pc.setRemoteDescription(message.description);
        if (!current()) return;
        for (const candidate of this.ice.splice(0)) { await pc.addIceCandidate(candidate); if (!current()) return; }
        if (type === "offer") {
          const answer = await pc.createAnswer();
          if (!current()) return;
          await pc.setLocalDescription(answer);
          if (current()) this.send({ type: "__signal", description: pc.localDescription.toJSON() });
        }
      } else if (message.candidate && typeof message.candidate.candidate === "string" && message.candidate.candidate.length < 2000) {
        if (pc.remoteDescription) await pc.addIceCandidate(message.candidate);
        else if (this.ice.length < 32) this.ice.push(message.candidate);
      }
    }

    bindChannel(channel) {
      if (this.closed || this.rtcDisabled || (this.channel && this.channel !== channel)) { channel.close(); return; }
      if (this.channel === channel) return;
      this.channel = channel;
      const generation = this.generation;
      const current = () => !this.closed && generation === this.generation && this.channel === channel;
      channel.onopen = () => {
        if (!current()) return channel.close();
        this.transport = "direct";
        this.onStatus("직접 연결되었습니다.");
        this.sendDirect();
        if (!current()) return;
        clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (current() && channel.readyState === "open") {
            try { channel.send(JSON.stringify({ ping: performance.now() })); } catch { this.fallback(); }
          }
        }, 2000);
      };
      channel.onmessage = event => {
        if (!current() || typeof event.data !== "string" || event.data.length > MAX_ENVELOPE_BYTES || bytes(event.data) > MAX_ENVELOPE_BYTES) return;
        try {
          const message = JSON.parse(event.data);
          if (Number.isFinite(message.ping)) {
            channel.send(JSON.stringify({ pong: message.ping }));
          } else if (Number.isFinite(message.pong)) {
            this.latency = Math.max(0, Math.min(60000, Math.round(performance.now() - message.pong)));
          } else {
            this.receive(message.packet, message.ack);
            if (message.packet?.length && channel.readyState === "open") channel.send(JSON.stringify({ ack: this.received }));
          }
        } catch { /* Malformed peer packets never reach the game. */ }
      };
      channel.onclose = () => { if (current()) this.fallback(); };
      channel.onerror = () => { if (current()) this.fallback(); };
    }

    sendDirect() {
      if (this.transport !== "direct" || this.channel?.readyState !== "open") return;
      if (this.channel.bufferedAmount > 128000) return this.fallback();
      try { this.channel.send(JSON.stringify({ packet: [...this.outbox.values()], ack: this.received })); }
      catch { this.fallback(); }
    }

    fallback() {
      if (this.closed) return;
      const wasDirect = this.transport === "direct";
      this.transport = "relay";
      this.rtcDisabled = true;
      this.closeRtc();
      if (wasDirect) this.onStatus("중계 연결로 전환했습니다.");
    }

    closeRtc() {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
      const channel = this.channel, pc = this.pc;
      this.channel = null; this.pc = null; this.ice = [];
      if (channel) {
        channel.onopen = channel.onmessage = channel.onclose = channel.onerror = null;
        channel.close();
      }
      if (pc) {
        pc.onicecandidate = pc.ondatachannel = pc.onconnectionstatechange = null;
        pc.close();
      }
    }

    fail(reason) {
      if (this.closed) return;
      this.close();
      this.onPeer(false);
      this.onClose(reason);
    }

    close() {
      const wasOpen = !this.closed;
      this.closed = true;
      this.generation += 1;
      clearTimeout(this.timer);
      this.closeRtc();
      if (wasOpen) this.request(`/rooms/${this.code}/leave`, { token: this.token }, 3000).catch(noop);
      this.token = null;
      this.outbox.clear();
    }
  }

  globalThis.MoonlitNetwork = MoonlitNetwork;
  if (typeof module !== "undefined" && module.exports) module.exports = MoonlitNetwork;
})();
