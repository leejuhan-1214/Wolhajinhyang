/* One canonical Han Seo-rin renderer for campaign and online duels. */
(function (root, factory) {
  const api = factory();
  root.MoonlitOperative = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = Math.PI * 2, ACT_FOUR_INDEX = 3;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const PALETTE = Object.freeze({ cyan: '#65f5ea', red: '#ff496c', amber: '#ffcd70', white: '#f2ffff' });
  function createRenderer(ctx, player, game, palette = PALETTE) {
    function drawCharacterPlate(points, fill, edge = "#07111b", width = 1) {
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index], points[index + 1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (edge) {
        ctx.strokeStyle = edge;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }

    function drawPlayerBody(x, y, facing, alpha = 1, ghost = false, style = "player") {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x + player.w / 2), Math.round(y + player.h));
      ctx.scale(facing, 1);

      const echoStyle = style === "echo";
      const flameSword = !echoStyle && game.stage >= ACT_FOUR_INDEX;
      const bodyCyan = echoStyle ? "#a879ff" : palette.cyan;
      const bodyRed = echoStyle ? "#63ffc6" : palette.red;
      const bodyAmber = echoStyle ? "#ead6ff" : palette.amber;
      const bodyBlade = echoStyle ? "#e8dcff" : flameSword ? "#ffad42" : "#b8f2ed";
      // 처음 디자인의 검은 전투복 색을 복원한다. 잔영은 몸체 색 대신
      // 발광 색으로 구분되므로 원래의 어두운 실루엣을 함께 유지한다.
      const uniformBack = "#0c1825";
      const uniformFront = "#172b3c";
      const uniformTorso = "#111d2c";
      const uniformPanel = "#29475a";
      const uniformShoulder = "#3d6072";
      const uniformJoint = "#172431";
      const uniformRearArm = "#152638";
      const uniformFrontArm = "#294459";

      const speedRatio = clamp(Math.abs(player.vx) / 320, 0, 1);
      const runBlend = player.grounded ? clamp((speedRatio - 0.03) / 0.42, 0, 1) : 0;
      const running = runBlend > 0.04;
      const walling = !player.grounded && (player.wallLeft || player.wallRight);
      const poseEase = (value) => value * value * (3 - value * 2);
      const sampleLoop = (values, phase) => {
        const base = Math.floor(phase);
        const fraction = phase - base;
        const at = (offset) => values[((base + offset) % values.length + values.length) % values.length];
        const previous = at(-1);
        const current = at(0);
        const next = at(1);
        const after = at(2);
        // Cubic in-betweens preserve velocity across the twelve key poses.
        return 0.5 * (2 * current + (next - previous) * fraction
          + (2 * previous - 5 * current + 4 * next - after) * fraction * fraction
          + (3 * current - previous - 3 * next + after) * fraction * fraction * fraction);
      };
      // Twelve designed poses are blended with eased in-betweens, then snapped at
      // the joints. This preserves pixel clarity without the old paper-doll stepping.
      const runPosePhase = player.runCycle / (TAU / 12);
      const runStride = [0.78, 0.62, 0.36, 0.05, -0.3, -0.62, -0.8, -0.6, -0.32, 0.02, 0.38, 0.66];
      const runBob = [0, 0.55, 1.45, 2.15, 1.8, 0.85, 0.05, 0.5, 1.35, 2.05, 1.7, 0.72];
      const idleBreath = Math.sin(game.time * 2.1) * 0.35;
      const stride = sampleLoop(runStride, runPosePhase);
      const bob = lerp(idleBreath, sampleLoop(runBob, runPosePhase) * 0.8, runBlend);
      const squashX = 1 + player.squash * 0.42;
      const squashY = 1 - player.squash * 0.52;
      const attacking = player.attackTimer > 0;
      const attackProgress = attacking ? 1 - player.attackTimer / player.attackDuration : 0;
      const shooting = player.recoilTimer > 0;
      const shotProgress = shooting ? 1 - player.recoilTimer / 0.3 : 1;
      const shotKick = shooting ? (1 - clamp(shotProgress, 0, 1)) ** 2 : 0;
      const shotPoseBlend = shooting ? 1 - poseEase(clamp((shotProgress - 0.34) / 0.66, 0, 1)) : 0;
      const shotSettle = shooting ? Math.sin(shotProgress * Math.PI * 2) * Math.exp(-shotProgress * 5) : 0;
      const attackLunge = attacking
        ? attackProgress < 0.22
          ? -poseEase(attackProgress / 0.22) * 4.5
          : attackProgress < 0.64
            ? lerp(-4.5, 14, poseEase((attackProgress - 0.22) / 0.42))
            : lerp(14, 0, poseEase((attackProgress - 0.64) / 0.36))
        : 0;
      const attackImpact = attacking ? Math.sin(clamp((attackProgress - 0.16) / 0.72, 0, 1) * Math.PI) : 0;
      const baseLean = clamp(player.vx * facing / 2100, -0.15, 0.15);
      const actionLean = attacking
        ? attackProgress < 0.22
          ? lerp(0, -0.12, poseEase(attackProgress / 0.22))
          : attackProgress < 0.64
            ? lerp(-0.12, 0.2, poseEase((attackProgress - 0.22) / 0.42))
            : lerp(0.2, 0, poseEase((attackProgress - 0.64) / 0.36))
        : -0.14 * shotKick + shotSettle * 0.035;
      const empowered = player.buffTimer > 0 || (attacking && player.chargedAttack);
      const bodyOffsetX = attackLunge * 0.48 - shotKick * 4;
      const bodyOffsetY = -bob + shotKick * 2 + attackImpact * 1.4;
      const bodyScaleX = squashX * (1 + attackImpact * 0.035);
      const bodyScaleY = squashY * (1 - attackImpact * 0.025);
      const bodyLean = baseLean + actionLean;

      ctx.translate(bodyOffsetX, bodyOffsetY);
      ctx.scale(bodyScaleX, bodyScaleY);
      ctx.rotate(bodyLean);

      if (ghost) {
        drawCharacterPlate([-10, -57, 8, -56, 11, -45, 7, -42, 14, -38,
          18, -6, 7, -9, 8, 0, -1, 0, -5, -15, -11, 0, -18, -3,
          -15, -35, -11, -42], bodyCyan, null);
        ctx.restore();
        return;
      }

      function drawPixelSegment(x1, y1, x2, y2, width, color, highlight) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        ctx.save();
        ctx.translate(Math.round(x1), Math.round(y1));
        // Canvas rotates +Y toward -X; negate the angle to connect the real joints.
        ctx.rotate(-Math.atan2(dx, dy));
        ctx.fillStyle = "#07101a";
        ctx.fillRect(-width / 2 - 1, -1, width + 2, Math.ceil(length) + 2);
        ctx.fillStyle = color;
        ctx.fillRect(-width / 2, 0, width, Math.ceil(length));
        ctx.fillStyle = highlight;
        ctx.fillRect(-width / 2 + 1, 1, 2, Math.max(2, Math.floor(length) - 2));
        ctx.fillStyle = "rgba(5, 10, 17, 0.48)";
        ctx.fillRect(width / 2 - 2, 2, 2, Math.max(2, Math.floor(length) - 3));
        ctx.restore();
      }

      function drawJointedLimb(px, py, upperLength, lowerLength, width, upperAngle, kneeBend, color, foot = false, hand = false, footAngle = null) {
        const kneeX = Math.round(px + Math.sin(upperAngle) * upperLength);
        const kneeY = Math.round(py + Math.cos(upperAngle) * upperLength);
        const lowerAngle = upperAngle - kneeBend;
        const endX = Math.round(kneeX + Math.sin(lowerAngle) * lowerLength);
        const endY = Math.round(kneeY + Math.cos(lowerAngle) * lowerLength);
        drawPixelSegment(px, py, kneeX, kneeY, width, color, "rgba(151, 207, 216, 0.24)");
        drawPixelSegment(kneeX, kneeY, endX, endY, Math.max(4, width - 1), color, "rgba(151, 207, 216, 0.18)");
        ctx.fillStyle = "#07101a";
        ctx.beginPath();
        ctx.arc(Math.round(kneeX), Math.round(kneeY), width * 0.62, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#40596a";
        ctx.fillRect(Math.round(kneeX - width * 0.44), Math.round(kneeY - width * 0.34), Math.ceil(width * 0.88), Math.ceil(width * 0.68));
        ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
        ctx.fillRect(Math.round(kneeX - 1), Math.round(kneeY - 1), 2, 2);
        if (foot) {
          const toeLift = footAngle ?? (player.grounded ? -bodyLean : clamp(-player.vy / 700, -0.35, 0.35));
          ctx.save();
          ctx.translate(Math.round(endX), Math.round(endY));
          ctx.rotate(toeLift);
          ctx.fillStyle = "#06101a";
          ctx.fillRect(-3, -2, 13, 7);
          ctx.fillStyle = "#263c4b";
          ctx.fillRect(-1, -1, 9, 4);
          ctx.fillStyle = "#657d88";
          ctx.fillRect(0, 2, 8, 1);
          ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
          ctx.fillRect(8, 0, 3, 2);
          ctx.restore();
        } else if (hand) {
          ctx.fillStyle = "#0a141e";
          ctx.fillRect(Math.round(endX - 3), Math.round(endY - 2), 7, 6);
          ctx.fillStyle = "#8ca1aa";
          ctx.fillRect(Math.round(endX + 1), Math.round(endY - 1), 2, 3);
        }
        return { x: endX, y: endY, angle: lowerAngle };
      }

      function legPose(layer) {
        if (walling) {
          return layer === "back"
            ? { upper: -0.4, knee: 0.6 }
            : { upper: 0.82, knee: 1.12 };
        }
        if (!player.grounded) {
          const rise = poseEase(clamp(-player.vy / 560, 0, 1));
          const fall = poseEase(clamp(player.vy / 680, 0, 1));
          return layer === "back"
            ? { upper: -0.18 - rise * 0.32 + fall * 0.46, knee: 0.62 - rise * 0.25 + fall * 0.16 }
            : { upper: 0.42 + rise * 0.42 - fall * 0.56, knee: 1.12 + rise * 0.2 - fall * 0.66 };
        }
      }

      function drawPlantedLeg(layer, width, color) {
        const hipX = layer === "back" ? -5 : 5;
        const hipY = -19;
        const phase = (((runPosePhase + (layer === "back" ? 6 : 0)) / 12) % 1 + 1) % 1;
        const contact = phase < 0.58;
        const recovery = clamp((phase - 0.58) / 0.42, 0, 1);
        const travelSign = player.vx * facing < 0 ? -1 : 1;
        // The supporting foot travels straight back along the floor; the other
        // lifts at the heel, folds at the knee and returns over an arc.
        const strideX = contact ? lerp(12, -12, phase / 0.58) : lerp(-12, 12, poseEase(recovery));
        const footLift = contact ? 0 : Math.sin(recovery * Math.PI) * 10;
        const actionStance = Math.max(attackImpact * 0.65, shotPoseBlend * 0.38) * (1 - runBlend * 0.6);
        let footX = lerp(layer === "back" ? -6 : 7, strideX * travelSign, runBlend);
        footX = lerp(footX, layer === "back" ? -13 : 16, actionStance);
        const footY = -4 - footLift * runBlend;
        // Inverse the torso transform so planted soles do not slide vertically
        // when breathing, recoiling, leaning or compressing on landing.
        const localX = (footX - bodyOffsetX) / bodyScaleX;
        const localY = (footY - bodyOffsetY) / bodyScaleY;
        const endX = localX * Math.cos(bodyLean) + localY * Math.sin(bodyLean);
        const endY = -localX * Math.sin(bodyLean) + localY * Math.cos(bodyLean);
        const dx = endX - hipX;
        const dy = endY - hipY;
        const upperLength = 12;
        const lowerLength = 12;
        const reach = clamp(Math.hypot(dx, dy), 1, upperLength + lowerLength - 0.1);
        const axis = Math.atan2(dx, dy);
        const upperAngle = axis + Math.acos(clamp((upperLength ** 2 + reach ** 2 - lowerLength ** 2) / (2 * upperLength * reach), -1, 1));
        const kneeX = hipX + Math.sin(upperAngle) * upperLength;
        const kneeY = hipY + Math.cos(upperAngle) * upperLength;
        const lowerAngle = Math.atan2(endX - kneeX, endY - kneeY);
        const toeRoll = contact ? 0 : Math.sin(recovery * TAU) * 0.35 * runBlend;
        drawJointedLimb(hipX, hipY, upperLength, lowerLength, width, upperAngle, upperAngle - lowerAngle, color, true, false, -bodyLean + toeRoll);
      }

      function drawArmTo(shoulderX, shoulderY, targetX, targetY, length, width, color) {
        const dx = targetX - shoulderX;
        const dy = targetY - shoulderY;
        const reach = clamp(Math.hypot(dx, dy), 1, length * 2 - 0.1);
        const upper = Math.atan2(dx, dy) - Math.acos(reach / (length * 2));
        const elbowX = shoulderX + Math.sin(upper) * length;
        const elbowY = shoulderY + Math.cos(upper) * length;
        const lower = Math.atan2(targetX - elbowX, targetY - elbowY);
        return drawJointedLimb(shoulderX, shoulderY, length, length, width, upper, upper - lower, color, false, true);
      }

      // Structured white officer coat: split tails expose the mechanical legs.
      // The shoulder stays fixed; only the lower panels follow the body's momentum.
      if (!echoStyle) {
        const hemLag = clamp(-player.vx * facing / 95, -3, 3) - attackImpact * 2;
        drawCharacterPlate([-14, -44, 11, -44, 17, -29, 19 + hemLag, -5,
          8 + hemLag, -7, 1, -23, -4, -13, -10 + hemLag, -3,
          -21 + hemLag, -7, -16, -29], "#b5c7cb");
        drawCharacterPlate([-12, -41, -5, -34, -6, -20, -12 + hemLag, -7,
          -18 + hemLag, -10, -14, -29], "#edf3ed", null);
        drawCharacterPlate([7, -40, 13, -34, 16 + hemLag, -8,
          10 + hemLag, -10, 5, -24], "#f6f8ef", null);
        ctx.strokeStyle = "#ff496c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(13, -32);
        ctx.lineTo(16 + hemLag, -10);
        ctx.moveTo(-17 + hemLag, -9);
        ctx.lineTo(-11 + hemLag, -6);
        ctx.stroke();
      }

      if (player.grounded) {
        drawPlantedLeg("back", 7, uniformBack);
        drawPlantedLeg("front", 8, uniformFront);
      } else {
        const backPose = legPose("back");
        const frontPose = legPose("front");
        drawJointedLimb(-5, -19, 11, 11, 7, backPose.upper, backPose.knee, uniformBack, true);
        drawJointedLimb(5, -19, 11, 12, 8, frontPose.upper, frontPose.knee, uniformFront, true);
      }

      // 등에 고정된 전술 신호 장치와 작은 안테나.
      ctx.fillStyle = "#0a131f";
      ctx.fillRect(-17, -43, 7, 24);
      ctx.fillStyle = "#3c5868";
      ctx.fillRect(-16, -39, 4, 13);
      ctx.fillStyle = bodyCyan;
      ctx.globalAlpha = alpha * (0.4 + Math.sin(game.time * 5) * 0.18);
      ctx.fillRect(-15, -42, 2, 3);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#526d79";
      ctx.beginPath();
      ctx.moveTo(-14, -43);
      const equipmentLag = running
        ? -2 - (stride + 1) * 0.8
        : attacking
          ? -attackLunge * 0.24
          : shooting
            ? shotKick * 4
            : 0;
      ctx.lineTo(-18 + equipmentLag, -54 + stride * runBlend * 0.6);
      ctx.stroke();

      // 허리의 칼집. 천 소재 없이 단단한 검사 실루엣을 만든다.
      ctx.save();
      ctx.translate(-7 + equipmentLag * 0.25, -23 + stride * runBlend * 0.4);
      ctx.rotate(2.66 + stride * runBlend * 0.035);
      ctx.fillStyle = "#070d16";
      ctx.fillRect(0, -3, 42, 7);
      ctx.fillStyle = "#334d5b";
      ctx.fillRect(4, -2, 31, 2);
      ctx.fillStyle = bodyRed;
      ctx.fillRect(5, -4, 3, 9);
      ctx.fillRect(34, -3, 2, 7);
      if (!attacking) {
        ctx.fillStyle = "#12151d";
        ctx.fillRect(-15, -3, 16, 7);
        ctx.strokeStyle = bodyRed;
        ctx.lineWidth = 1;
        for (let wrap = -13; wrap < -1; wrap += 4) {
          ctx.beginPath();
          ctx.moveTo(wrap, -3);
          ctx.lineTo(wrap + 3, 4);
          ctx.stroke();
        }
        ctx.fillStyle = "#b58b43";
        ctx.fillRect(-1, -5, 3, 11);
      }
      ctx.fillStyle = "#151f29";
      ctx.beginPath();
      ctx.moveTo(42, -3);
      ctx.lineTo(47, 0);
      ctx.lineTo(42, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = uniformTorso;
      ctx.beginPath();
      ctx.moveTo(-11, -43);
      ctx.lineTo(10, -43);
      ctx.lineTo(15, -20);
      ctx.lineTo(8, -15);
      ctx.lineTo(-11, -17);
      ctx.lineTo(-15, -30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = uniformPanel;
      ctx.fillRect(-10, -38, 5, 17);
      ctx.fillStyle = uniformShoulder;
      ctx.beginPath();
      ctx.moveTo(-15, -40);
      ctx.lineTo(-7, -44);
      ctx.lineTo(-2, -37);
      ctx.lineTo(-8, -32);
      ctx.lineTo(-15, -34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = uniformJoint;
      ctx.fillRect(-10, -22, 22, 5);
      ctx.fillStyle = empowered ? bodyAmber : bodyRed;
      ctx.fillRect(-12, -24, 25, 3);
      ctx.fillStyle = "#7d929b";
      ctx.fillRect(-7, -21, 4, 3);
      ctx.fillRect(0, -21, 4, 3);
      ctx.fillRect(7, -21, 3, 3);
      ctx.fillStyle = bodyCyan;
      ctx.fillRect(-4, -22, 13, 2);
      ctx.fillStyle = bodyRed;
      ctx.fillRect(9, -36, 3, 15);
      ctx.strokeStyle = "rgba(143, 210, 216, 0.38)";
      ctx.beginPath();
      ctx.moveTo(-3, -38);
      ctx.lineTo(7, -34);
      ctx.lineTo(6, -26);
      ctx.lineTo(-3, -23);
      ctx.stroke();
      ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
      ctx.beginPath();
      ctx.arc(2, -31, 2.4, 0, TAU);
      ctx.fill();

      // Beveled armor seams and small fasteners preserve the mechanical silhouette.
      ctx.strokeStyle = "rgba(151, 196, 205, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -39);
      ctx.lineTo(-3, -34);
      ctx.lineTo(-4, -25);
      ctx.moveTo(7, -38);
      ctx.lineTo(5, -26);
      ctx.moveTo(-11, -31);
      ctx.lineTo(-6, -30);
      ctx.stroke();
      ctx.fillStyle = "#0b141f";
      ctx.fillRect(-14, -23, 7, 7);
      ctx.fillRect(7, -23, 7, 7);
      ctx.fillStyle = "#4c6774";
      ctx.fillRect(-12, -21, 4, 2);
      ctx.fillRect(8, -21, 4, 2);
      ctx.fillStyle = "#c2d1d3";
      ctx.fillRect(-1, -25, 3, 4);
      ctx.fillStyle = empowered ? bodyAmber : bodyRed;
      ctx.fillRect(0, -24, 1, 2);
      ctx.fillStyle = "#6e8790";
      ctx.fillRect(-9, -18, 3, 2);
      ctx.fillRect(-4, -18, 3, 2);
      ctx.fillRect(5, -18, 3, 2);

      if (!echoStyle) {
        drawCharacterPlate([-14, -43, -8, -46, -3, -39, -6, -29, -10, -35], "#f0f5ee", "#778f99");
        drawCharacterPlate([6, -44, 12, -43, 15, -35, 10, -28, 7, -36], "#dce8e4", "#778f99");
        ctx.fillStyle = "#314755";
        ctx.fillRect(-11, -40, 5, 2);
        ctx.fillStyle = bodyRed;
        ctx.fillRect(10, -37, 3, 6);
        // Crescent insignia reads as a single light shape at gameplay scale.
        ctx.fillStyle = bodyAmber;
        ctx.beginPath(); ctx.arc(-10, -35, 2.1, 0, TAU); ctx.fill();
        ctx.fillStyle = "#f0f5ee";
        ctx.beginPath(); ctx.arc(-9, -36, 1.7, 0, TAU); ctx.fill();
      }

      const shotAimAngle = Math.atan2(player.shotAimY || 0, Math.max(0.01, Math.abs(player.shotAimX || facing)));
      const weaponAngle = lerp(0.72, shotAimAngle, shotPoseBlend) - shotSettle * 0.06;
      const locomotionArmAngle = !player.grounded ? -0.48 : lerp(-0.15, stride * 0.5, runBlend);
      const restHandX = 10 + Math.sin(locomotionArmAngle) * 9 + Math.sin(locomotionArmAngle - 0.38) * 9;
      const restHandY = -38 + Math.cos(locomotionArmAngle) * 9 + Math.cos(locomotionArmAngle - 0.38) * 9;
      const shotHandX = lerp(restHandX, 10 + Math.cos(weaponAngle) * (7 - shotKick * 3), shotPoseBlend);
      const shotHandY = lerp(restHandY, -32 + Math.sin(weaponAngle) * 7, shotPoseBlend);
      const rearArm = shooting
        ? Math.PI / 2 + shotAimAngle * 0.72 - 0.24
        : attacking
          ? -0.34 - attackLunge * 0.025
          : running
            ? -stride * 0.58 * runBlend + 0.14
            : 0.28;
      if (shooting && !attacking) {
        const restRearAngle = running ? -stride * 0.58 * runBlend + 0.14 : 0.28;
        const restRearX = -10 + Math.sin(restRearAngle) * 8 + Math.sin(restRearAngle + 0.42) * 8;
        const restRearY = -38 + Math.cos(restRearAngle) * 8 + Math.cos(restRearAngle + 0.42) * 8;
        drawArmTo(lerp(-10, 6, shotPoseBlend), -38,
          lerp(restRearX, shotHandX + Math.cos(weaponAngle) * 14, shotPoseBlend),
          lerp(restRearY, shotHandY + Math.sin(weaponAngle) * 14 + 2, shotPoseBlend),
          lerp(8, 13, shotPoseBlend), 5, uniformRearArm);
      } else {
        drawJointedLimb(-10, -38, 8, 8, 5, rearArm, attacking ? -0.62 : -0.42, uniformRearArm, false, true);
      }

      ctx.save();
      ctx.translate(0, -43);
      ctx.rotate(-bodyLean * 0.45 - shotSettle * 0.04);
      ctx.translate(0, 43);
      // Faceted mechanical mask, swept crown and a continuous red optic.
      drawCharacterPlate([-12, -53, -8, -59, 5, -58, 12, -53,
        10, -44, 3, -40, -8, -43], "#172833", "#617d86");
      drawCharacterPlate([-8, -56, 3, -56, 9, -53, -5, -52], "#506d78", null);
      drawCharacterPlate([-10, -49, -5, -47, 4, -47, 8, -44,
        2, -42, -7, -44], "#e2ebe4", null);
      drawCharacterPlate([-5, -52, 12, -52, 11, -47, -3, -48], "#050c13", null);
      ctx.fillStyle = empowered ? bodyAmber : bodyRed;
      ctx.fillRect(-2, -51, 12, 2);
      ctx.fillStyle = "#fff1dc";
      ctx.fillRect(7, -51, 3, 1);
      ctx.fillStyle = "#0b1722";
      ctx.fillRect(-15, -53, 6, 9);
      ctx.fillStyle = bodyCyan;
      ctx.fillRect(-14, -51, 2, 4);
      ctx.fillStyle = "#607f89";
      ctx.fillRect(-13, -57, 2, 5);
      ctx.fillStyle = "#324853";
      ctx.fillRect(-4, -44, 8, 2);
      ctx.fillStyle = "#93a9ac";
      ctx.fillRect(-2, -44, 1, 2);
      ctx.fillRect(1, -44, 1, 2);
      ctx.restore();

      let armAngle = locomotionArmAngle;
      let bladeAngle = -1.1;
      if (!player.grounded) armAngle = -0.48;
      if (shooting) armAngle = Math.PI / 2 + shotAimAngle * 0.82;
      if (attacking) {
        if (attackProgress < 0.2) {
          const t = poseEase(attackProgress / 0.2);
          armAngle = lerp(-0.42, -1.18, t);
          bladeAngle = lerp(-1.05, -2.05, t);
        } else if (attackProgress < 0.62) {
          const t = poseEase((attackProgress - 0.2) / 0.42);
          armAngle = lerp(-1.18, 1.3, t);
          bladeAngle = lerp(-2.05, 0.92, t);
        } else {
          const t = poseEase((attackProgress - 0.62) / 0.38);
          armAngle = lerp(1.3, locomotionArmAngle, t);
          bladeAngle = lerp(0.92, -0.16, t);
        }
        armAngle += player.attackDir.y * 0.72;
        bladeAngle += player.attackDir.y * 0.9;
      }

      const frontHand = shooting && !attacking
        ? drawArmTo(10, -38, shotHandX, shotHandY, 9, 6, uniformFrontArm)
        : drawJointedLimb(10, -38, 9, 9, 6, armAngle, attacking ? 0.12 : 0.38, uniformFrontArm, false, !attacking);
      if (attacking) {
        ctx.save();
        ctx.translate(frontHand.x, frontHand.y);
        ctx.rotate(bladeAngle);

        // 붉은 끈으로 감은 손잡이와 원형 코등이.
        ctx.fillStyle = "#10141d";
        ctx.fillRect(-7, -4, 18, 8);
        ctx.strokeStyle = empowered ? bodyAmber : bodyRed;
        ctx.lineWidth = 1;
        for (let wrap = -5; wrap < 10; wrap += 4) {
          ctx.beginPath();
          ctx.moveTo(wrap, -4);
          ctx.lineTo(wrap + 3, 4);
          ctx.stroke();
        }
        ctx.fillStyle = "#b58b43";
        ctx.beginPath();
        ctx.ellipse(12, 0, 3, 7, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#1b2833";
        ctx.beginPath();
        ctx.ellipse(12, 0, 1.4, 5, 0, 0, TAU);
        ctx.fill();

        // 더 길고 완만하게 휜 외날과 등줄.
        const bladeGlow = flameSword ? "#ffad42" : empowered ? bodyAmber : bodyBlade;
        if (flameSword) {
          ctx.shadowColor = "#ff5a2e";
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = bladeGlow;
        ctx.beginPath();
        ctx.moveTo(14, -2.4);
        ctx.quadraticCurveTo(49, -6.5, 78, -15);
        ctx.quadraticCurveTo(64, -4.5, 14, 2.2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        if (flameSword) {
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = "rgba(255, 81, 38, 0.72)";
          for (let flame = 0; flame < 5; flame += 1) {
            const flameX = 25 + flame * 10;
            const flameHeight = 6 + Math.sin(game.time * 19 + flame * 1.7) * 3;
            ctx.beginPath();
            ctx.moveTo(flameX - 4, -3);
            ctx.lineTo(flameX, -8 - flameHeight);
            ctx.lineTo(flameX + 5, -4);
            ctx.closePath();
            ctx.fill();
          }
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.strokeStyle = palette.white;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(16, -1.4);
        ctx.quadraticCurveTo(52, -5.3, 76, -14);
        ctx.stroke();
        ctx.strokeStyle = "#31586a";
        ctx.beginPath();
        ctx.moveTo(15, 1.7);
        ctx.quadraticCurveTo(54, -0.8, 71, -8);
        ctx.stroke();
        ctx.restore();
      } else if (shooting) {
        ctx.save();
        ctx.translate(frontHand.x, frontHand.y);
        ctx.rotate(weaponAngle);
        ctx.scale(0.78, 0.78);

        // M-12 compact combat shotgun: stock, receiver, loading port, pump,
        // twin barrel, sights and chamber indicator are separate pixel clusters.
        ctx.fillStyle = "#070d15";
        ctx.beginPath();
        ctx.moveTo(-27, -5); ctx.lineTo(-9, -8); ctx.lineTo(-3, -5);
        ctx.lineTo(-8, 5); ctx.lineTo(-25, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#314754";
        ctx.fillRect(-24, -3, 18, 7);
        ctx.fillStyle = bodyRed;
        ctx.fillRect(-21, -2, 4, 5);
        ctx.fillStyle = "#0c1722";
        ctx.fillRect(-7, -7, 24, 14);
        ctx.fillStyle = "#4b6875";
        ctx.fillRect(-4, -5, 18, 4);
        ctx.fillStyle = "#81969d";
        ctx.fillRect(1, -4, 9, 2);
        ctx.fillStyle = "#050b12";
        ctx.fillRect(0, 2, 10, 3);
        ctx.fillStyle = bodyCyan;
        ctx.fillRect(11, 2, 4, 3);
        ctx.fillStyle = "#172631";
        ctx.beginPath();
        ctx.moveTo(-1, 7); ctx.lineTo(9, 7); ctx.lineTo(6, 17); ctx.lineTo(0, 15); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#81969d";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(6, 7, 4, 0.15, Math.PI - 0.15); ctx.stroke();
        ctx.fillStyle = "#263c47";
        const pumpTravel = Math.sin(clamp((shotProgress - 0.22) / 0.66, 0, 1) * Math.PI) * 6;
        ctx.fillRect(15 - pumpTravel, -6, 19, 12);
        ctx.fillStyle = "#58727c";
        for (let grip = 18; grip < 33; grip += 4) ctx.fillRect(grip - pumpTravel, -5, 2, 10);
        ctx.fillStyle = "#111c26";
        ctx.fillRect(32, -5, 24, 4);
        ctx.fillRect(32, 1, 24, 4);
        ctx.fillStyle = "#78909a";
        ctx.fillRect(34, -4, 20, 1);
        ctx.fillRect(34, 2, 20, 1);
        ctx.fillStyle = "#0a1017";
        ctx.fillRect(54, -6, 5, 5);
        ctx.fillRect(54, 1, 5, 5);
        ctx.fillStyle = bodyAmber;
        ctx.fillRect(6, -9, 3, 2);
        ctx.fillStyle = player.shotgunCharge >= 3 ? bodyAmber : bodyCyan;
        ctx.fillRect(12, -5, 2, 3);

        // Ejected shell and residual muzzle smoke make the recoil readable after
        // the single-frame flash has passed.
        if (shotProgress > 0.08) {
          ctx.save();
          ctx.translate(2 - shotProgress * 20, -10 - Math.sin(shotProgress * Math.PI) * 15);
          ctx.rotate(shotProgress * 5.5);
          ctx.fillStyle = bodyAmber;
          ctx.fillRect(-4, -2, 8, 4);
          ctx.fillStyle = "#fff0af";
          ctx.fillRect(2, -1, 2, 2);
          ctx.restore();
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = clamp(0.72 - shotProgress * 0.8, 0, 0.72);
        ctx.strokeStyle = "rgba(215, 248, 246, 0.7)";
        ctx.lineWidth = 3;
        for (let smoke = 0; smoke < 3; smoke += 1) {
          ctx.beginPath();
          ctx.arc(64 + shotProgress * (18 + smoke * 7), (smoke - 1) * 5, 4 + shotProgress * 8, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();

        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = alpha * clamp(1 - shotProgress / 0.18, 0, 1);
        ctx.fillStyle = player.shotgunCharge >= 3 ? bodyAmber : palette.white;
        ctx.beginPath();
        ctx.moveTo(58, -10); ctx.lineTo(91, 0); ctx.lineTo(58, 10); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    return drawPlayerBody;
  }
  return Object.freeze({ createRenderer });
});
