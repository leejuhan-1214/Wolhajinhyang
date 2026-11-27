(function (root) {
  "use strict";
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function create(context) {
    const { player, game, zones, platforms, enemies, hazards, combatRooms, checkpoints } = context;
    let zone = null, floorY = 710, cars = [], maximumTravel = 0;
    let state = { v: 1, started: false, travel: 0, boarded: 0, completed: false };
    let saveDistance = 0;
    const inZone = () => zone && player.x + player.w > zone.x && player.x < zone.end;
    const enabled = () => inZone() && game.mode === "playing" && !game.adminMode && !game.bossReplay && !game.cutscene;
    const owned = object => object.x + (object.w || 0) / 2 >= zone.x && object.x + (object.w || 0) / 2 < zone.end;
    const custom = object => object.adminWorldCustom === true || context.isCustomStructure?.(object) === true;
    const snapshot = () => ({ ...state, travel: Math.round(state.travel * 100) / 100 });
    function placeCars() {
      for (const car of cars) car.x = zone.x + car.localX + state.travel;
    }
    function makePlatform(id, x, y, w, h, extra = {}) {
      const platform = { id: `freight:${id}`, x, y, w, h, originalY: y, kind: "foundry", hidden: false,
        freightStructure: true, ...extra };
      platforms.push(platform);
      return platform;
    }
    function build() {
      zone = zones.find(candidate => candidate.stageIndex === 1 && candidate.localIndex === 1) || null;
      cars = [];
      if (!zone) return;
      const checkpoint = checkpoints.find(candidate => candidate.checkpointKey === "1:1");
      floorY = clamp(checkpoint ? checkpoint.y + checkpoint.h : 710, 590, 760);
      state = { v: 1, started: false, travel: 0, boarded: 0, completed: false };
      saveDistance = 0;
      // This is one authored encounter replacement. The portable editor profile
      // is untouched; only this build's old collision/scenery instances retire.
      for (let index = platforms.length - 1; index >= 0; index--) {
        if (platforms[index].freightStructure) platforms.splice(index, 1);
        else if (owned(platforms[index]) && !custom(platforms[index])) platforms[index].hidden = true;
      }
      for (const hazard of hazards) if (owned(hazard) && !custom(hazard)) hazard.hidden = true;
      for (let index = combatRooms.length - 1; index >= 0; index--) {
        const room = combatRooms[index];
        if ((room.left + room.right) / 2 >= zone.x && (room.left + room.right) / 2 < zone.end) combatRooms.splice(index, 1);
      }
      let replaced = 0;
      for (let index = enemies.length - 1; index >= 0; index--) {
        const enemy = enemies[index];
        if (enemy.type !== "boss" && !enemy.adminSpawned && enemy.originX >= zone.x && enemy.originX < zone.end) {
          enemies.splice(index, 1); replaced++;
        }
      }
      zone.baseTargetEnemyCount = Math.max(0, (zone.baseTargetEnemyCount || 0) - replaced);
      makePlatform("floor", zone.x, floorY, zone.end - zone.x, context.worldHeight - floorY);
      makePlatform("boarding", zone.x + 330, floorY - 64, 220, 22);
      // A missed leap lands on the catwalk. These fixed steps are also a
      // catch-up route once the freight reaches its buffer stop.
      const endX = zone.end - 1190;
      [[0, 84], [200, 168], [400, 252]].forEach(([x, rise], index) =>
        makePlatform(`catch-up-${index}`, endX + x, floorY - rise, 175, 22));
      [[680, 130, 280], [1170, 230, 270], [1680, 330, 320]].forEach(([x, rise, width], index) => {
        cars.push(makePlatform(`car-${index}`, zone.x + x, floorY - rise, width, 20,
          { freightCar: true, localX: x, carIndex: index }));
      });
      maximumTravel = Math.max(0, zone.end - zone.x - 2440);
      zone.freightChase = true;
      context.markDirty?.();
    }
    function restore(data, checkpointZone = 0) {
      state = { v: 1, started: false, travel: 0, boarded: 0, completed: false };
      if (data?.v === 1) {
        state.started = data.started === true;
        state.travel = clamp(Number(data.travel) || 0, 0, maximumTravel);
        state.boarded = clamp(Math.trunc(Number(data.boarded) || 0), 0, 7);
        state.completed = data.completed === true;
      }
      if (zone && checkpointZone > zone.globalIndex) state.completed = true;
      if (state.completed) state.started = true;
      saveDistance = state.travel;
      if (zone) placeCars();
    }
    function onRespawn(checkpointZone) {
      if (zone && checkpointZone > zone.globalIndex) state.completed = true;
      if (zone) placeCars();
    }
    function connector() {
      const front = cars[2];
      return front ? { x: front.x + 239, y: front.y - 47, w: 17, h: 37 } : null;
    }
    function update(dt) {
      if (!enabled() || !(dt > 0)) return;
      if (!state.started && player.x > zone.x + 245) {
        state.started = true;
        context.announce?.("폭주 화물 추격 · 화물칸에 올라 앞칸의 노란 연결장치를 베세요. 떨어지면 아래 길로 복귀할 수 있습니다.");
      }
      if (!state.started) return;
      const support = cars.find(car => player.grounded && Math.abs(player.y + player.h - car.y) <= 3
        && player.x + player.w > car.x + 3 && player.x < car.x + car.w - 3);
      if (support) state.boarded |= 1 << support.carIndex;
      const previous = state.travel;
      if (!state.completed) state.travel = Math.min(maximumTravel, state.travel + Math.min(dt, 0.1) * 55);
      placeCars();
      // Carry an actually supported passenger once, before the normal physics
      // step. Airborne players retain their own momentum and jump trajectory.
      if (support) player.x += state.travel - previous;
      if (state.travel - saveDistance >= 220) { saveDistance = state.travel; context.save?.(); }
    }
    function tryCut(intersects) {
      if (!enabled() || !state.started || state.completed || !state.boarded || player.attackTimer <= 0) return false;
      const target = connector();
      if (!target || !intersects(target)) return false;
      state.completed = true;
      context.complete?.(target);
      context.save?.();
      return true;
    }
    function remaining(zoneIndex) {
      return zone && zoneIndex === zone.globalIndex && !game.bossReplay ? (state.completed || game.adminMode ? 0 : 1) : null;
    }
    function label(zoneIndex) {
      if (!zone || zoneIndex !== zone.globalIndex || game.bossReplay) return null;
      return state.completed ? "화물 제동 완료 · 통로 개방" : state.boarded ? "앞칸의 노란 연결장치 절단" : "폭주 화물 · 점프로 화물칸 탑승";
    }
    function contextAim(worldX, worldY) {
      if (!enabled() || !state.boarded || state.completed) return null;
      const target = connector();
      if (!target) return null;
      const x = target.x + target.w / 2, y = target.y + target.h / 2;
      const dx = x - player.x - player.w / 2, dy = y - player.y - player.h / 2;
      const distance = Math.hypot(dx, dy);
      if (Math.hypot(worldX - x, worldY - y) > 52 || distance > 95 || distance < 1) return null;
      return { x: dx / distance, y: dy / distance };
    }
    function draw(ctx, left, right) {
      if (!zone || right < zone.x || left > zone.end) return;
      ctx.save();
      ctx.strokeStyle = "#334652"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(zone.x + 580, floorY - 28); ctx.lineTo(zone.end - 250, floorY - 28); ctx.stroke();
      ctx.strokeStyle = "#b0a17a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(zone.x + 580, floorY - 32); ctx.lineTo(zone.end - 250, floorY - 32); ctx.stroke();
      for (const car of cars) {
        if (car.x + car.w < left - 30 || car.x > right + 30) continue;
        ctx.fillStyle = "#0a1119"; ctx.fillRect(car.x - 4, car.y - 2, car.w + 8, 27);
        ctx.fillStyle = "#58646a"; ctx.fillRect(car.x, car.y, car.w, 7);
        ctx.fillStyle = "#283941"; ctx.fillRect(car.x, car.y + 7, car.w, 13);
        ctx.fillStyle = "#dcb667";
        for (let x = 9; x < car.w - 8; x += 34) ctx.fillRect(car.x + x, car.y + 2, 16, 3);
        const bodyColor = ["#715640", "#475d60", "#784d3b"][car.carIndex];
        ctx.fillStyle = bodyColor; ctx.fillRect(car.x + 13, car.y + 24, car.w - 26, 29);
        ctx.fillStyle = "#101b23";
        for (let x = 28; x < car.w - 35; x += 46) ctx.fillRect(car.x + x, car.y + 30, 3, 18);
        ctx.fillStyle = "#9c9c83"; ctx.fillRect(car.x + 16, car.y + 25, car.w - 32, 2);
        if (car.carIndex === 2) {
          // The front wagon has a compact motor housing and a sloped nose.
          ctx.fillStyle = "#a98052"; ctx.beginPath(); ctx.moveTo(car.x + car.w - 53, car.y + 25);
          ctx.lineTo(car.x + car.w - 9, car.y + 25); ctx.lineTo(car.x + car.w + 8, car.y + 42);
          ctx.lineTo(car.x + car.w - 3, car.y + 53); ctx.lineTo(car.x + car.w - 53, car.y + 53); ctx.fill();
          ctx.fillStyle = "#152b35"; ctx.fillRect(car.x + car.w - 47, car.y + 30, 24, 10);
          ctx.fillStyle = "#e9d693"; ctx.fillRect(car.x + car.w - 6, car.y + 36, 5, 5);
        }
        // Open gantry framing, not an apparently solid wall the player clips through.
        ctx.strokeStyle = "#233641"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(car.x + 26, car.y + 23); ctx.lineTo(car.x + 26, floorY - 47);
        ctx.lineTo(car.x + car.w - 26, floorY - 47); ctx.lineTo(car.x + car.w - 26, car.y + 23); ctx.stroke();
        ctx.strokeStyle = "#3d4b50"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(car.x + 26, car.y + 27); ctx.lineTo(car.x + car.w - 26, floorY - 47); ctx.stroke();
        for (const x of [38, car.w - 38]) {
          ctx.fillStyle = "#101a21"; ctx.beginPath(); ctx.arc(car.x + x, floorY - 41, 12, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#819395"; ctx.lineWidth = 2; ctx.stroke();
          const spin = state.travel / 12;
          ctx.beginPath();
          for (let spoke = 0; spoke < 4; spoke++) {
            const angle = spin + spoke * Math.PI / 2;
            ctx.moveTo(car.x + x, floorY - 41);
            ctx.lineTo(car.x + x + Math.cos(angle) * 9, floorY - 41 + Math.sin(angle) * 9);
          }
          ctx.stroke();
        }
        ctx.fillStyle = state.boarded & (1 << car.carIndex) ? "#75e4cf" : "#dcb667";
        ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
        ctx.fillText(`FREIGHT 0${car.carIndex + 1}`, car.x + 18, car.y - 12);
      }
      const target = connector();
      if (target && target.x + target.w > left && target.x < right) {
        const x = target.x + target.w / 2;
        ctx.strokeStyle = "#6f7b7c"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, target.y - 17); ctx.lineTo(x, target.y + target.h + 10); ctx.stroke();
        ctx.fillStyle = state.completed ? "#68d3b3" : "#ffca65";
        ctx.fillRect(target.x, target.y, target.w, target.h);
        ctx.fillStyle = "#17232a"; ctx.fillRect(target.x + 4, target.y + 8, 9, 20);
        ctx.fillStyle = "#eafff5"; ctx.fillRect(target.x + 6, target.y + (state.completed ? 24 : 14), 5, 4);
        ctx.textAlign = "center"; ctx.font = "bold 12px 'Malgun Gothic', sans-serif";
        ctx.fillStyle = state.completed ? "#8fe6c9" : "#ffdc8c";
        ctx.fillText(state.completed ? "제동 완료" : "발도로 절단", x, target.y - 28);
      }
      ctx.textAlign = "left"; ctx.fillStyle = "#b4c8ca"; ctx.font = "12px 'Malgun Gothic', sans-serif";
      if (left < zone.x + 1300) {
        ctx.fillText("점프 · 이중점프로 탑승", zone.x + 365, floorY - 100);
        ctx.fillText("뒤로 쏜 샷건 반동으로 긴 간격을 넘을 수 있습니다", zone.x + 365, floorY - 82);
      }
      ctx.restore();
    }
    return { build, restore, onRespawn, update, tryCut, remaining, label, contextAim, draw, snapshot, connector,
      get platforms() { return cars.slice(); }, get zoneIndex() { return zone?.globalIndex ?? -1; },
      get maximumTravel() { return maximumTravel; } };
  }
  root.MoonlitFreight = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
