/* Online duel UI. The host owns combat; the guest sends controls and renders snapshots. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const shell = $("duel-shell");
  const canvas = $("duel-canvas");
  const ctx = canvas.getContext("2d");
  const Engine = globalThis.MoonlitDuel;
  const Network = globalThis.MoonlitNetwork;
  const View = globalThis.MoonlitDuelView;
  const Operative = globalThis.MoonlitOperative;
  const operativeClock = { time: 0, stage: 0 };
  const operativePlayers = [{ runCycle: 0 }, { runCycle: 0 }];
  let drawOperatives = [];
  const W = 1280, H = 720;
  const colors = ["#7bebd6", "#ff7585"];
  const names = ["한서린 · 1P", "한서린 · 2P"];
  const keys = new Set();
  const pointer = { x: W / 2, y: H / 2, slash: false, shotgun: false, inside: false };
  let network = null, localRole = null, connected = false, busy = false, match = null;
  let matchId = "", ready = [false, false], inputSeq = 0, lastInputSeq = -1;
  let actionSeq = 0, lastActionSeq = -1;
  const actions = ["jump", "dash", "slash", "shotgun"];
  const newPulses = () => ({ jump: 0, dash: 0, slash: 0, shotgun: 0 });
  let localPulses = newPulses(), remotePulses = newPulses();
  let remoteInput = null, lastRemoteInputAt = 0, lastStateAt = 0;
  let guestView = null, hostPrevious = null, appliedInputSeq = -1, appliedActionSeq = -1;
  let pressIds = { jump: 0, dash: 0, slash: 0, shotgun: 0 };
  let lastSnapshotAt = 0, lastStepAt = performance.now(), accumulator = 0;
  let displayState = null, lastHudAt = 0, lastPhase = "", lastSoundEffect = -1;
  let soundEnabled = false, audioContext = null, lastQualityAt = 0, suspended = false;
  const isHost = () => localRole === "host";
  const ownIndex = () => isHost() ? 0 : 1;
  const active = () => Boolean(match && match.phase !== "matchOver" && connected);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const finite = (n, lo, hi) => typeof n === "number" && Number.isFinite(n) && n >= lo && n <= hi;
  const emptyInput = () => Engine.createInput({ move: 0, aimX: isHost() ? 1 : -1, aimY: 0 });

  function status(message, error = false) {
    $("connection-status").textContent = String(message).slice(0, 240);
    $("status-box").classList.toggle("error", error);
    $("status-box").classList.toggle("connected", connected && !error);
  }

  function updateLobby() {
    const inRoom = Boolean(network && localRole);
    $("entry-panel").hidden = inRoom;
    $("room-panel").hidden = !inRoom;
    $("host-button").disabled = busy;
    $("join-button").disabled = busy;
    $("room-input").disabled = busy;
    $("room-code").value = network?.code || "";
    $("seat-0-owner").textContent = isHost() ? "나 · 방장" : "방장";
    $("seat-1-owner").textContent = isHost() ? "친구" : "나";
    $("seat-0-status").textContent = ready[0] ? "준비 완료" : "준비 전";
    $("seat-1-status").textContent = !connected ? "상대를 기다리는 중" : ready[1] ? "준비 완료" : "준비 전";
    [0, 1].forEach((i) => $("seat-" + i + "-dot").classList.toggle("ready", ready[i]));
    $("ready-button").disabled = !connected || active();
    $("ready-button").textContent = ready[ownIndex()] ? "준비 취소" : match?.phase === "matchOver" ? "다음 결투 준비" : "준비 완료";
    $("ready-button").setAttribute("aria-pressed", String(ready[ownIndex()]));
    $("start-button").hidden = !isHost();
    $("start-button").disabled = !connected || !ready.every(Boolean) || active();
    $("start-button").firstChild.textContent = match?.phase === "matchOver" ? "다시 결투 " : "결투 시작 ";
    $("ready-hint").textContent = !connected ? "초대 링크를 친구에게 보내세요." : !ready[ownIndex()] ? "준비를 마쳤다면 준비 완료를 누르세요." : !ready[1 - ownIndex()] ? "상대가 준비할 때까지 기다려 주세요." : isHost() ? "두 플레이어가 준비됐습니다. 결투를 시작하세요." : "방장이 결투를 시작할 때까지 기다려 주세요.";
    shell.classList.toggle("is-playing", active());
    $("arena-intro").hidden = Boolean(match);
    $("combat-hud").hidden = !match;
    $("match-leave-button").hidden = !active();
    $("lobby-title").textContent = match?.phase === "matchOver" ? "다음 결투" : "온라인 결투";
  }

  function clearControls() {
    keys.clear(); pointer.slash = false; pointer.shotgun = false;
    localPulses = newPulses();
    if (network && !isHost() && active()) {
      const client = network;
      if (client.send({ type: "action", matchId, seq: ++actionSeq, action: "clear" }) && network === client) {
        client.send({ type: "input", matchId, seq: ++inputSeq, input: emptyInput() });
      }
    }
  }

  function heldActions() {
    return {
      jump: keys.has("Space") || keys.has("KeyW") || keys.has("ArrowUp"),
      dash: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      slash: pointer.slash || keys.has("KeyJ"), shotgun: pointer.shotgun || keys.has("KeyK"),
    };
  }

  function capturePresses(before) {
    if (!active() || suspended) return;
    const after = heldActions();
    for (const action of actions) {
      if (!after[action] || before[action]) continue;
      localPulses[action] = Math.min(4, localPulses[action] + 1);
      if (!isHost()) {
        pressIds[action] = ++actionSeq;
        if (!network?.send({ type: "action", matchId, seq: actionSeq, action })) return;
      }
    }
  }

  function consumePulses(raw, pulses, fighter) {
    const input = { ...raw };
    for (const action of actions) {
      if (action === "jump" || action === "dash") {
        const wasPressed = action === "jump" ? fighter.lastJump : fighter.lastDash;
        // Reliable presses create edges; held input only sustains an existing press.
        // A release tick separates two taps that arrive in the same relay batch.
        if (pulses[action] > 0 && !wasPressed) { input[action] = true; pulses[action] -= 1; }
        else if (pulses[action] > 0) input[action] = false;
        else input[action] = wasPressed && raw[action];
      } else {
        input[action] = raw[action] || pulses[action] > 0;
        if (pulses[action] > 0) pulses[action] -= 1;
      }
    }
    return input;
  }

  function disconnect(message = "방을 나왔습니다. 새로운 결투를 시작해 보세요.", error = false) {
    const old = network;
    network = null; localRole = null; connected = false; busy = false;
    clearControls(); ready = [false, false]; match = null; guestView = null; hostPrevious = null; displayState = null;
    matchId = ""; lastPhase = ""; accumulator = 0; lastInputSeq = -1; suspended = false;
    old?.close();
    $("focus-hint").hidden = true;
    $("round-banner").hidden = true;
    updateLobby(); status(message, error);
  }

  function roomCode(raw) {
    const value = raw.trim();
    if (/^https?:\/\//i.test(value)) {
      try { return (new URL(value).searchParams.get("room") || "").replace(/[\s-]+/g, "").toUpperCase(); } catch { return ""; }
    }
    return value.replace(/[\s-]+/g, "").toUpperCase();
  }

  async function connect(role) {
    if (busy || network) return;
    const code = roomCode($("room-input").value);
    if (role === "guest" && !/^[A-Z2-7]{12}$/.test(code)) {
      status("방 코드나 초대 링크를 확인해 주세요.", true); $("room-input").focus(); return;
    }
    busy = true; updateLobby(); status(role === "host" ? "결투방을 만들고 있습니다…" : "친구의 결투방에 연결하고 있습니다…");
    let client;
    try {
      client = new Network({
        onStatus(message) { if (network === client) status(message); },
        onMessage(message) { if (network === client) receive(message); },
        onPeer(value) {
          if (network !== client) return;
          connected = Boolean(value);
          if (!connected) {
            disconnect("상대와 연결이 끊어져 결투가 종료되었습니다. 새 방을 만들어 다시 초대해 주세요.", true);
            return;
          }
          if (isHost()) client.send({ type: "lobby", ready });
          updateLobby(); status("두 플레이어가 연결되었습니다. 준비 완료를 누르세요.");
        },
        onClose() {
          if (network === client) disconnect("연결이 종료되었습니다. 인터넷 연결을 확인한 뒤 다시 참가해 주세요.", true);
        },
      });
      network = client; localRole = role;
      const result = await (role === "host" ? client.host() : client.join(code));
      if (network !== client) return;
      if (result?.code && !client.code) client.code = result.code;
      busy = false; updateLobby();
      if (!connected) status(role === "host" ? "방이 열렸습니다. 초대 링크를 다른 PC의 친구에게 보내세요." : "방장과 연결을 기다리고 있습니다…");
      if (connected && isHost()) client.send({ type: "lobby", ready });
    } catch (error) {
      if (network === client || !client) disconnect(error?.message || "연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
    }
  }

  async function copy(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      status(label + "를 복사했습니다. 친구에게 보내주세요.");
    } catch {
      const field = $("room-code");
      field.value = value; field.focus(); field.select();
      status("선택한 " + label + "를 Ctrl+C로 복사해 주세요.");
    }
  }

  function validState(state) {
    if (!state || typeof state !== "object" || state.version !== 1 || !finite(state.tick, 0, 1e9)) return false;
    if (!["countdown", "playing", "roundOver", "matchOver"].includes(state.phase)) return false;
    if (!finite(state.phaseTime, 0, 180) || !finite(state.roundTime, 0, 91) || !finite(state.round, 1, 100000)) return false;
    if (!Array.isArray(state.scores) || state.scores.length !== 2 || !state.scores.every((n) => Number.isInteger(n) && n >= 0 && n <= 2)) return false;
    if (![null, 0, 1].includes(state.winner) || ![null, 0, 1].includes(state.roundWinner)) return false;
    if (!Array.isArray(state.fighters) || state.fighters.length !== 2 || !Array.isArray(state.effects) || state.effects.length > 120) return false;
    if (!state.fighters.every((f, i) => f && f.id === i && finite(f.x, -100, W + 100) && finite(f.y, -500, H + 100) && finite(f.w, 1, 100) && finite(f.h, 1, 150) && finite(f.vx, -5000, 5000) && finite(f.vy, -5000, 5000) && finite(f.hp, 0, 20) && finite(f.maxHp, 1, 20) && finite(f.shells, 0, 10) && finite(f.maxShells, 1, 10) && [-1, 1].includes(f.facing) && [f.dashCd, f.slashCd, f.shotgunCd, f.animTime, f.invulnerable].every((n) => finite(n, 0, 10)))) return false;
    return state.effects.every((e) => e && ["slash", "shot", "hit", "land", "dash", "jump"].includes(e.type) && finite(e.id, 0, 1e9) && finite(e.x, -5000, 5000) && finite(e.y, -5000, 5000) && finite(e.dx, -5000, 5000) && finite(e.dy, -5000, 5000) && finite(e.time, 0, 5) && finite(e.maxTime, .001, 5) && [0, 1].includes(e.owner) && (e.type !== "shot" || finite(e.endX, -5000, 5000) && finite(e.endY, -5000, 5000)));
  }

  function validInput(input) {
    return input && typeof input === "object" && finite(input.move, -1, 1) && finite(input.aimX, -2, 2) && finite(input.aimY, -2, 2) && ["jump", "slash", "shotgun", "dash"].every((key) => typeof input[key] === "boolean");
  }

  function receive(message) {
    if (!message || typeof message !== "object" || !connected) return;
    if (message.type === "ready" && isHost() && !active() && typeof message.ready === "boolean") {
      ready[1] = message.ready; network.send({ type: "lobby", ready }); updateLobby();
    } else if (message.type === "lobby" && !isHost() && !active() && Array.isArray(message.ready) && message.ready.length === 2 && message.ready.every((v) => typeof v === "boolean")) {
      ready = message.ready.slice(); updateLobby();
    } else if (message.type === "input" && isHost() && active() && message.matchId === matchId && Number.isSafeInteger(message.seq) && message.seq > lastInputSeq && validInput(message.input)) {
      lastInputSeq = message.seq; remoteInput = Engine.createInput(message.input); lastRemoteInputAt = performance.now();
    } else if (message.type === "action" && isHost() && active() && message.matchId === matchId && Number.isSafeInteger(message.seq) && message.seq > lastActionSeq && [...actions, "clear"].includes(message.action)) {
      lastActionSeq = message.seq;
      if (message.action === "clear") {
        remotePulses = newPulses(); remoteInput = emptyInput();
      } else if (!suspended) {
        remotePulses[message.action] = Math.min(4, remotePulses[message.action] + 1);
        remoteInput = { ...remoteInput, [message.action]: true };
        lastRemoteInputAt = performance.now();
      }
    } else if (message.type === "suspend" && !isHost() && match && message.matchId === matchId && typeof message.active === "boolean") {
      suspended = message.active; clearControls(); lastStateAt = performance.now();
      guestView?.reset(match, lastStateAt); accumulator = 0; lastStepAt = lastStateAt;
    } else if (message.type === "start" && !isHost() && !active() && typeof message.matchId === "string" && /^[a-z0-9-]{1,64}$/.test(message.matchId) && validState(message.state) && message.state.phase === "countdown") {
      matchId = message.matchId; begin(message.state);
    } else if (message.type === "state" && !isHost() && message.matchId === matchId && match && validState(message.state) && message.state.tick > match.tick) {
      match = message.state; lastStateAt = performance.now();
      guestView?.receive(match, message.inputAck, message.actionAck, lastStateAt);
      if (match.phase !== lastPhase) syncPhase();
    }
  }

  function begin(state) {
    match = state; displayState = null; ready = [false, false];
    hostPrevious = match.fighters.map(f => ({ ...f }));
    guestView = isHost() ? null : new View.DuelView(Engine, 1);
    guestView?.reset(match, performance.now());
    appliedInputSeq = -1; appliedActionSeq = -1;
    pressIds = { jump: 0, dash: 0, slash: 0, shotgun: 0 };
    inputSeq = 0; lastInputSeq = -1; lastStateAt = performance.now(); lastStepAt = performance.now();
    actionSeq = 0; lastActionSeq = -1;
    localPulses = newPulses(); remotePulses = newPulses();
    lastSnapshotAt = 0; lastRemoteInputAt = performance.now();
    remoteInput = emptyInput(); accumulator = 0; lastPhase = ""; lastSoundEffect = -1; suspended = false;
    clearControls(); syncPhase(); updateLobby(); canvas.focus({ preventScroll: true });
    status("결투가 시작되었습니다. 먼저 두 라운드를 승리하세요.");
  }

  function startMatch() {
    if (!network || !isHost() || !connected || !ready.every(Boolean) || active()) return;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    matchId = Date.now().toString(36) + "-" + seed.toString(36);
    const state = Engine.createMatch(seed);
    if (!network.send({ type: "start", matchId, state: Engine.snapshot(state) }) || !network || !connected) return;
    begin(state);
  }

  function syncPhase() {
    lastPhase = match?.phase || "";
    if (lastPhase === "matchOver") {
      clearControls(); ready = [false, false]; updateLobby();
      status(match.winner === ownIndex() ? "승리했습니다! 다시 겨루려면 다음 결투 준비를 누르세요." : "멋진 결투였습니다. 다음 결투 준비를 눌러 다시 도전하세요.");
      $("ready-button").focus({ preventScroll: true });
    }
  }

  function readInput() {
    if (suspended) return emptyInput();
    const fighter = (displayState || match)?.fighters[ownIndex()];
    const dx = fighter ? pointer.x - fighter.x - fighter.w / 2 : 1;
    const dy = fighter ? pointer.y - fighter.y - fighter.h / 2 : 0;
    return Engine.createInput({ move: Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft")), ...heldActions(), aimX: dx, aimY: dy });
  }

  function tick(now = performance.now()) {
    const elapsed = clamp((now - lastStepAt) / 1000, 0, .25); lastStepAt = now;
    if (!active() || suspended) { accumulator = 0; return; }
    accumulator += elapsed;
    if (isHost()) {
      const relayGrace = network.transport === "relay" ? Math.min(2000, Math.max(450, network.latency * 2.5 || 450)) : 450;
      const remoteFresh = now - lastRemoteInputAt < relayGrace;
      if (!remoteFresh) remotePulses = newPulses();
      while (accumulator >= Engine.FIXED_DT) {
        hostPrevious = match.fighters.map(f => ({ ...f }));
        Engine.step(match, [consumePulses(readInput(), localPulses, match.fighters[0]), consumePulses(remoteFresh ? remoteInput : emptyInput(), remotePulses, match.fighters[1])], Engine.FIXED_DT);
        if (remoteFresh) { appliedInputSeq = lastInputSeq; appliedActionSeq = lastActionSeq; }
        accumulator -= Engine.FIXED_DT;
      }
      const phaseChanged = match.phase !== lastPhase;
      if (now - lastSnapshotAt >= 1000 / 30 || phaseChanged) {
        // send() copies synchronously; avoid a second full JSON snapshot here.
        if (!network.send({ type: "state", matchId, state: match, inputAck: appliedInputSeq, actionAck: appliedActionSeq, reliable: phaseChanged })) return;
        lastSnapshotAt = phaseChanged ? now : now - ((now - lastSnapshotAt) % (1000 / 30));
      }
      if (match && phaseChanged) syncPhase();
    } else {
      while (accumulator >= Engine.FIXED_DT) {
        const raw = readInput(), input = consumePulses(raw, localPulses, guestView.predicted);
        const seq = ++inputSeq;
        guestView.predict(seq, input, pressIds);
        if (!network.send({ type: "input", matchId, seq, input: raw })) return;
        accumulator -= Engine.FIXED_DT;
      }
      if (now - lastStateAt > 10000) disconnect("상대의 응답이 없어 결투가 종료되었습니다. 새 방에서 다시 만나세요.", true);
    }
  }

  function renderedState(now) {
    if (!match) return null;
    if (suspended) return match;
    const alpha = clamp((accumulator + Math.max(0, now - lastStepAt) / 1000) / Engine.FIXED_DT, 0, 1);
    if (!isHost()) return guestView?.render(now, alpha) || match;
    if (match.phase !== "playing" || suspended || !hostPrevious) return match;
    return { ...match, fighters: match.fighters.map((f, i) => View.interpolate(hostPrevious[i], f, alpha)) };
  }

  function updateHud(state, now) {
    if (!state) return;
    if (now - lastHudAt > 70) {
      state.fighters.forEach((f, i) => {
        $("fighter-" + i + "-name").textContent = names[i] + (i === ownIndex() ? " · 나" : "");
        $("fighter-" + i + "-health").style.width = clamp(f.hp / f.maxHp * 100, 0, 100) + "%";
        $("fighter-" + i + "-score").textContent = state.scores[i];
        $("fighter-" + i + "-ammo").textContent = "산탄 " + "● ".repeat(Math.floor(f.shells)) + "○ ".repeat(Math.max(0, Math.floor(f.maxShells - f.shells)));
        $("fighter-" + i + "-dash").textContent = f.dashCd > 0 ? "대시 " + f.dashCd.toFixed(1) + "초" : "대시 준비";
      });
      $("round-label").textContent = "ROUND " + String(state.round).padStart(2, "0");
      $("round-time").textContent = Math.ceil(state.roundTime);
      lastHudAt = now;
    }
    const show = state.phase !== "playing" || suspended;
    $("round-banner").hidden = !show;
    if (show) {
      let eyebrow = "ROUND " + String(state.round).padStart(2, "0"), title, detail;
      if (suspended) { eyebrow = "DUEL ON HOLD"; title = "잠시 대기"; detail = "방장이 게임 화면으로 돌아오기를 기다리는 중"; }
      else if (state.phase === "countdown") { title = String(Math.max(1, Math.ceil(state.phaseTime))); detail = "칼끝을 가다듬으세요"; }
      else if (state.phase === "roundOver") { title = state.roundWinner === null ? "무승부" : names[state.roundWinner] + " 승리"; detail = "다음 라운드를 준비합니다"; }
      else { eyebrow = "DUEL COMPLETE"; title = state.winner === ownIndex() ? "당신의 승리" : names[state.winner ?? 0] + " 승리"; detail = state.scores.join(" : ") + " · 다시 겨루려면 다음 결투 준비"; }
      $("banner-eyebrow").textContent = eyebrow; $("banner-title").textContent = title; $("banner-detail").textContent = detail;
    }
  }

  function fighter(f, time, scale = 1, local = false) {
    const player = operativePlayers[f.id], trim = colors[f.id];
    const travel = Math.abs(f.x - (player.worldX ?? f.x));
    if (f.grounded && travel < 80) player.runCycle += travel * .037;
    // These are visual adapters only: the host's combat state stays untouched.
    Object.assign(player, {
      worldX: f.x, w: f.w, h: f.h, vx: f.vx, vy: f.vy, grounded: f.grounded,
      wallLeft: false, wallRight: false, squash: f.anim === "dash" ? .06 : 0,
      attackTimer: f.anim === "slash" ? Math.min(.2, f.animTime || 0) : 0,
      attackDuration: .2, attackDir: { x: f.slashDirection || f.facing, y: 0 },
      recoilTimer: f.anim === "shot" ? Math.min(.3, (f.animTime || 0) * 1.5) : 0,
      shotAimX: f.aimX ?? f.facing, shotAimY: f.aimY || 0,
      buffTimer: 0, chargedAttack: false, shotgunCharge: 0,
    });
    operativeClock.time = time;
    ctx.save();
    ctx.translate(f.x + f.w / 2, f.y + f.h); ctx.scale(scale, scale);
    ctx.fillStyle = "#02060a66"; ctx.beginPath(); ctx.ellipse(0, 1, 25, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Team identity belongs to the floor marker and HUD; both wear Seo-rin's coat and red optic.
    ctx.strokeStyle = trim; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 2, 20, 3, 0, 0, Math.PI * 2); ctx.stroke();
    if (f.anim === "dash") {
      for (let i = 3; i > 0; i--) {
        ctx.save(); ctx.translate(-f.facing * i * 11, 0);
        drawOperatives[f.id](-f.w / 2, -f.h, f.facing, .04 + (3 - i) * .03, true);
        ctx.restore();
      }
    }
    drawOperatives[f.id](-f.w / 2, -f.h, f.facing, f.hp <= 0 ? .4 : 1);
    if (local) {
      ctx.fillStyle = trim; ctx.beginPath(); ctx.moveTo(-5, -f.h - 16);
      ctx.lineTo(5, -f.h - 16); ctx.lineTo(0, -f.h - 10); ctx.fill();
    }
    ctx.restore();
  }

  const backdrop = document.createElement("canvas"); backdrop.width=W;backdrop.height=H;
  function createBackdrop() {
    const b=backdrop.getContext("2d");
    const sky=b.createLinearGradient(0,0,0,H);sky.addColorStop(0,"#0b1723");sky.addColorStop(.65,"#183544");sky.addColorStop(1,"#0a141d");b.fillStyle=sky;b.fillRect(0,0,W,H);
    const moon=b.createRadialGradient(966,155,20,966,155,170);moon.addColorStop(0,"#a7c8bb22");moon.addColorStop(1,"#a7c8bb00");b.fillStyle=moon;b.fillRect(760,0,420,350);
    b.fillStyle="#bed0bb";b.beginPath();b.arc(966,155,56,0,Math.PI*2);b.fill();b.fillStyle="#708c8c25";b.beginPath();b.arc(948,145,18,0,Math.PI*2);b.arc(978,175,11,0,Math.PI*2);b.fill();
    for(let layer=0;layer<3;layer++)for(let i=0;i<17;i++){
      const x=i*86-layer*23,w=45+(i*29%42),h=70+(i*73%190)+layer*25,y=500-h+layer*35;
      b.fillStyle=["#17303e","#112833","#0c202b"][layer];b.fillRect(x,y,w,550-y);
      b.fillRect(x+w*.5,y-15,2,18);
      for(let row=0;row<Math.floor(h/20);row++)for(let col=0;col<3;col++){if((i+row*3+col+layer)%5===0){b.fillStyle=layer===1?"#5a8f8d30":"#719da522";b.fillRect(x+8+col*13,y+14+row*19,5,3);}}
    }
    b.fillStyle="#091922";b.fillRect(0,559,W,81);b.strokeStyle="#29454f";b.lineWidth=2;b.beginPath();b.moveTo(0,559);b.lineTo(W,559);b.stroke();
    for(let i=0;i<17;i++){b.fillStyle="#162e39";b.fillRect(i*80,560,4,80);b.strokeStyle="#213b45";b.beginPath();b.moveTo(i*80,570);b.lineTo(i*80+79,630);b.stroke();}
    b.fillStyle="#152832";b.fillRect(0,640,W,80);b.fillStyle="#6c8984";b.fillRect(0,640,W,2);b.fillStyle="#243e47";b.fillRect(0,645,W,4);
    for(let i=0;i<16;i++){b.strokeStyle="#2a424b";b.beginPath();b.moveTo(i*90,650);b.lineTo(i*90-40,720);b.stroke();b.fillStyle="#0c1a23";b.fillRect(i*90+8,660,52,5);}
    b.fillStyle="#708c7d25";b.fillRect(885,649,150,2);b.fillRect(907,656,120,2);b.fillRect(927,668,71,1);
    for(const p of Engine.ARENA.platforms){b.fillStyle="#081720";b.fillRect(p.x,p.y,p.w,p.h);b.fillStyle="#37535b";b.fillRect(p.x,p.y,p.w,3);b.fillStyle="#78b7ad";b.fillRect(p.x+14,p.y+1,32,2);b.fillRect(p.x+p.w-46,p.y+1,32,2);b.fillStyle="#203943";b.fillRect(p.x+9,p.y+6,p.w-18,5);b.strokeStyle="#213d47";b.beginPath();b.moveTo(p.x+20,p.y+p.h);b.lineTo(p.x+40,p.y+p.h+15);b.lineTo(p.x+p.w-40,p.y+p.h+15);b.lineTo(p.x+p.w-20,p.y+p.h);b.stroke();}
    b.font="10px monospace";b.fillStyle="#537f8499";b.fillText("白夜 / 07",28,528);b.font="8px monospace";b.fillStyle="#52767e55";b.fillText("COMBAT SIMULATION FACILITY",28,542);
  }

  function drawEffect(e) {
    const progress=1-e.time/e.maxTime,alpha=clamp(e.time/e.maxTime,0,1),color=colors[e.owner];
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.fillStyle=color;
    if(e.type==="shot") {ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.endX,e.endY);ctx.stroke();ctx.fillStyle="#fff0c2";ctx.beginPath();ctx.arc(e.x,e.y,7*alpha,0,Math.PI*2);ctx.fill();}
    else if(e.type==="slash"){ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(e.dy,e.dx));ctx.lineWidth=6*alpha;ctx.beginPath();ctx.arc(0,0,62+progress*10,-1.1,1.1);ctx.stroke();ctx.strokeStyle="#e8fff4";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,66+progress*10,-.9,.9);ctx.stroke();}
    else if(e.type==="hit"){for(let i=0;i<9;i++){const a=i*2.39+e.id,len=8+progress*34;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*len*.45,e.y+Math.sin(a)*len*.45);ctx.lineTo(e.x+Math.cos(a)*len,e.y+Math.sin(a)*len);ctx.stroke();}ctx.fillStyle="#f7fae5";ctx.fillRect(e.x-2,e.y-2,4,4);}
    else {ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(e.x,e.y,10+progress*30,3+progress*4,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }

  function sound(effect) {
    if(!soundEnabled||!audioContext||audioContext.state!=="running")return;
    if(!["shot","slash","hit"].includes(effect.type))return;
    const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime;
    osc.type=effect.type==="shot"?"sawtooth":"triangle";
    osc.frequency.setValueAtTime(effect.type==="hit"?620:effect.type==="shot"?140:420,at);
    osc.frequency.exponentialRampToValueAtTime(45,at+.09);gain.gain.setValueAtTime(effect.type==="shot"?.035:.05,at);gain.gain.exponentialRampToValueAtTime(.001,at+.1);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+.11);
  }

  function draw(now) {
    tick(now);
    ctx.clearRect(0,0,W,H);ctx.drawImage(backdrop,0,0);
    const time=now/1000;
    ctx.strokeStyle="#9cc4c011";ctx.lineWidth=1;
    for(let i=0;i<30;i++){const x=(i*97+time*25)%W,y=(i*61+time*280)%640;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3,y+14);ctx.stroke();}
    displayState=renderedState(now);
    if(displayState){
      for(const f of displayState.fighters)fighter(f,time,1,f.id===ownIndex());
      let newest=lastSoundEffect;
      for(const effect of displayState.effects){drawEffect(effect);if(effect.id>lastSoundEffect){sound(effect);newest=Math.max(newest,effect.id);}}
      lastSoundEffect=newest;updateHud(displayState,now);
    }else{
      const base={w:34,h:56,vx:0,vy:0,grounded:true,hp:5,anim:"idle",invulnerable:0};
      fighter({...base,id:0,x:768,y:584,facing:1},time,1.85);
      fighter({...base,id:1,x:1068,y:584,facing:-1},time,1.85);
      ctx.font="10px monospace";ctx.textAlign="center";ctx.fillStyle=colors[0];ctx.fillText("01 / HAN SEO RIN",785,668);ctx.fillStyle=colors[1];ctx.fillText("02 / HAN SEO RIN",1085,668);ctx.textAlign="left";
    }
    if(active()&&pointer.inside){ctx.strokeStyle=colors[ownIndex()]+"aa";ctx.lineWidth=1;ctx.beginPath();ctx.arc(pointer.x,pointer.y,8,0,Math.PI*2);ctx.moveTo(pointer.x-12,pointer.y);ctx.lineTo(pointer.x-5,pointer.y);ctx.moveTo(pointer.x+5,pointer.y);ctx.lineTo(pointer.x+12,pointer.y);ctx.moveTo(pointer.x,pointer.y-12);ctx.lineTo(pointer.x,pointer.y-5);ctx.moveTo(pointer.x,pointer.y+5);ctx.lineTo(pointer.x,pointer.y+12);ctx.stroke();}
    if(now-lastQualityAt>1000){$("connection-quality").textContent=connected?(network?.transport==="direct"?"직접 연결":"온라인 연결")+(finite(network?.latency,0,5000)?" · "+Math.round(network.latency)+" ms":""):"PRIVATE 1 VS 1";lastQualityAt=now;}
    requestAnimationFrame(draw);
  }

  if (!Engine || !Network || !View || !Operative || !ctx) {
    status("결투 화면을 불러오지 못했습니다. 새로고침해 주세요.", true);
    $("host-button").disabled = true; $("join-button").disabled = true; return;
  }
  drawOperatives=operativePlayers.map(player=>Operative.createRenderer(ctx,player,operativeClock));
  remoteInput=emptyInput();createBackdrop();
  $("host-button").addEventListener("click",()=>connect("host"));
  $("join-form").addEventListener("submit",(event)=>{event.preventDefault();connect("guest");});
  $("ready-button").addEventListener("click",()=>{if(!connected||active())return;ready[ownIndex()]=!ready[ownIndex()];network.send(isHost()?{type:"lobby",ready}:{type:"ready",ready:ready[1]});updateLobby();});
  $("start-button").addEventListener("click",startMatch);
  $("leave-button").addEventListener("click",()=>disconnect());
  $("match-leave-button").addEventListener("click",()=>disconnect("결투를 나왔습니다. 다시 플레이하려면 새 방을 만드세요."));
  $("copy-code-button").addEventListener("click",()=>copy(network?.code||"","방 코드"));
  $("copy-link-button").addEventListener("click",()=>{const url=new URL("pvp.html",location.href);url.searchParams.set("room",network?.code||"");url.searchParams.set("smooth","2");copy(url.href,"초대 링크");});
  $("sound-button").addEventListener("click",async()=>{
    soundEnabled=!soundEnabled;
    if(soundEnabled){try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();await audioContext.resume();}catch{soundEnabled=false;status("이 브라우저에서 소리를 켤 수 없습니다.",true);}}
    $("sound-button").textContent=soundEnabled?"소리 켜짐":"소리 꺼짐";$("sound-button").setAttribute("aria-pressed",String(soundEnabled));$("sound-button").title=soundEnabled?"소리 끄기":"소리 켜기";
  });
  $("fullscreen-button").hidden=!document.fullscreenEnabled;
  $("fullscreen-button").addEventListener("click",async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}catch{status("전체 화면으로 전환하지 못했습니다. 브라우저 창을 넓혀주세요.",true);}});
  document.addEventListener("fullscreenchange",()=>{$("fullscreen-button").textContent=document.fullscreenElement?"화면 복원":"전체 화면";});
  window.addEventListener("keydown",(event)=>{if(!active()||event.target instanceof HTMLInputElement)return;if(["KeyA","KeyD","KeyW","ArrowLeft","ArrowRight","ArrowUp","Space","ShiftLeft","ShiftRight","KeyJ","KeyK"].includes(event.code)){event.preventDefault();const before=heldActions();keys.add(event.code);capturePresses(before);}});
  window.addEventListener("keyup",(event)=>keys.delete(event.code));
  canvas.addEventListener("pointermove",(event)=>{const r=canvas.getBoundingClientRect();pointer.x=clamp((event.clientX-r.left)/r.width*W,0,W);pointer.y=clamp((event.clientY-r.top)/r.height*H,0,H);pointer.inside=true;});
  canvas.addEventListener("pointerleave",()=>{pointer.inside=false;});
  canvas.addEventListener("pointerdown",(event)=>{if(!active())return;canvas.focus({preventScroll:true});const before=heldActions();if(event.button===0)pointer.slash=true;if(event.button===2)pointer.shotgun=true;capturePresses(before);event.preventDefault();});
  window.addEventListener("pointerup",(event)=>{if(event.button===0)pointer.slash=false;if(event.button===2)pointer.shotgun=false;});
  canvas.addEventListener("contextmenu",(event)=>event.preventDefault());
  window.addEventListener("blur",()=>{clearControls();$("focus-hint").hidden=!active();});
  window.addEventListener("focus",()=>{$("focus-hint").hidden=true;});
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)clearControls();
    if(network&&isHost()&&active()){
      suspended=document.hidden;accumulator=0;lastStepAt=performance.now();remoteInput=emptyInput();
      remotePulses=newPulses();
      if(!network.send({type:"suspend",matchId,active:suspended}))return;
      if(!suspended&&network&&match)network.send({type:"state",matchId,state:match,inputAck:appliedInputSeq,actionAck:appliedActionSeq,reliable:true});
    }
  });
  window.addEventListener("pagehide",()=>network?.close());
  const invite=new URL(location.href).searchParams.get("room");
  if(invite&&invite.length<=160){$("room-input").value=invite;status("결투 초대를 받았습니다. 참가 버튼을 눌러 친구와 연결하세요.");}
  updateLobby();requestAnimationFrame(draw);
})();
