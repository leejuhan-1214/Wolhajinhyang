/* Canonical Han Seo-rin renderer for the campaign and its character archive. */
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
  const STRIDE_RADIANS_PER_PIXEL = 0.045;
  const RUN_SUPPORT_FRACTION = 0.18;
  const poseEase = (value) => value * value * (3 - value * 2);
  const RUN_STRIDE = [0.78, 0.62, 0.36, 0.05, -0.3, -0.62, -0.8, -0.6, -0.32, 0.02, 0.38, 0.66];
  const RUN_BOB = [0, 0.55, 1.45, 2.15, 1.8, 0.85, 0.05, 0.5, 1.35, 2.05, 1.7, 0.72];
  function sampleLoop(values, phase) {
    const base = Math.floor(phase), fraction = phase - base;
    const at = (offset) => values[((base + offset) % values.length + values.length) % values.length];
    const previous = at(-1), current = at(0), next = at(1), after = at(2);
    return 0.5 * (2 * current + (next - previous) * fraction
      + (2 * previous - 5 * current + 4 * next - after) * fraction * fraction
      + (3 * current - previous - 3 * next + after) * fraction * fraction * fraction);
  }
  // Presentation alone has memory. Physics and combat timers never read this state.
  function resetMotion(player) { player.motionPose = null; }
  function updateMotion(player, dt, wasGrounded = player.grounded) {
    const motion = player.motionPose || (player.motionPose = {
      ground: wasGrounded ? 1 : 0, vy: wasGrounded ? 0 : player.vy,
      squash: 0, wall: 0,
    });
    const approach = (from, to, amount) => from < to ? Math.min(to, from + amount) : Math.max(to, from - amount);
    const groundTarget = player.grounded ? 1 : 0;
    motion.ground = approach(motion.ground, groundTarget, dt / (groundTarget ? 0.10 : 0.12));
    motion.wall = approach(motion.wall, !player.grounded && (player.wallLeft || player.wallRight) ? 1 : 0, dt / 0.10);
    motion.vy = lerp(motion.vy, player.vy, 1 - Math.exp(-dt / 0.06));
    motion.squash = lerp(motion.squash, player.squash, 1 - Math.exp(-dt / 0.045));
  }
  function sampleLocomotion(player, game, useMotion = true) {
    const motion = useMotion ? player.motionPose : null;
    const groundBlend = poseEase(clamp(motion?.ground ?? (player.grounded ? 1 : 0), 0, 1));
    const wallBlend = poseEase(clamp(motion?.wall ?? (!player.grounded && (player.wallLeft || player.wallRight) ? 1 : 0), 0, 1));
    const speedRatio = clamp(Math.abs(player.vx) / 440, 0, 1);
    const speedRun = clamp(Math.abs(player.vx) / 180, 0, 1);
    const runBlend = speedRun * groundBlend;
    const runPosePhase = player.runCycle / (TAU / 12);
    const stride = sampleLoop(RUN_STRIDE, runPosePhase);
    return {
      speedRatio, groundBlend, wallBlend, runBlend, runPosePhase, stride,
      gaitBlend: clamp(Math.abs(player.vx) / 45, 0, 1),
      vy: motion?.vy ?? player.vy, squash: motion?.squash ?? player.squash,
      bob: lerp(Math.sin(game.time * 2.1) * 0.35, sampleLoop(RUN_BOB, runPosePhase) * 0.45, runBlend),
      arm: lerp(-0.48, lerp(-0.15, -stride * 0.9 - 0.08, speedRun), groundBlend),
      rear: lerp(0.28, stride * 0.82 - 0.02, runBlend),
      elbow: lerp(0.38, -1.05, runBlend), rearElbow: lerp(-0.42, -1.05, runBlend),
      // A little forward momentum remains visible in the airborne silhouette.
      sprintDrive: poseEase(speedRatio) * lerp(0.28 * (1 - wallBlend), speedRun, groundBlend),
    };
  }
  function captureLocomotion(player, game, facing = player.facing || 1) {
    const { arm, elbow, rear, rearElbow } = sampleLocomotion(player, game);
    return { arm, elbow, rear, rearElbow };
  }
  // Draw-cut, rising return-cut, planted finishing cut. Each row owns the whole
  // body pose so shoulders, hips, support feet and blade move as one action.
  const COMBO_POSES = [
    [
      { at: 0.18, arm: -0.72, elbow: 0.5, blade: -1.55, lunge: -1.2, lean: -0.045, drop: 0.4, stance: 0.25, rear: -0.15, twist: -0.9 },
      { at: 0.56, arm: 1.3, elbow: 0.14, blade: 0.12, lunge: 4.3, lean: 0.11, drop: 1.1, stance: 0.75, rear: -0.65, twist: 1.5 },
      { at: 1, arm: 1.08, elbow: 0.2, blade: 0.3, lunge: 2.1, lean: 0.055, drop: 0.6, stance: 0.5, rear: -0.46, twist: 0.8 },
    ],
    [
      { at: 0.15, arm: 1.4, elbow: 0.36, blade: 0.62, lunge: 2.3, lean: 0.06, drop: 1, stance: 0.55, rear: -0.62, twist: 1.2 },
      { at: 0.57, arm: -0.88, elbow: -0.16, blade: -1.82, lunge: -0.8, lean: -0.055, drop: -0.3, stance: 0.65, rear: 0.42, twist: -1.5 },
      { at: 1, arm: -0.6, elbow: 0.12, blade: -1.25, lunge: -0.5, lean: -0.025, drop: 0, stance: 0.35, rear: 0.26, twist: -0.6 },
    ],
    [
      { at: 0.23, arm: -1.16, elbow: -0.36, blade: -2.08, lunge: -2.2, lean: -0.08, drop: -0.7, stance: 0.35, rear: 0.44, twist: -1.4 },
      { at: 0.55, arm: 1.24, elbow: 0.04, blade: 0.44, lunge: 5.2, lean: 0.14, drop: 2, stance: 0.95, rear: -0.74, twist: 2 },
      { at: 1, arm: 0.92, elbow: 0.2, blade: 0.36, lunge: 2.7, lean: 0.07, drop: 1, stance: 0.65, rear: -0.43, twist: 0.9 },
    ],
  ].map((sequence) => sequence.map((pose) => ({ ...pose, rearElbow: lerp(-0.42, -0.62, pose.stance) })));
  const mixPose = (from, to, blend) => {
    const result = {};
    for (const key of Object.keys(from)) result[key] = lerp(from[key], to[key] ?? from[key], blend);
    return result;
  };
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

    function drawPlayerBody(x, y, facing, alpha = 1, ghost = false, style = "player", swingFX = false) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(Math.round(x + player.w / 2), Math.round(y + player.h));
      ctx.scale(facing, 1);

      const echoStyle = style === "echo";
      const flameSword = !echoStyle && game.stage >= ACT_FOUR_INDEX;
      const bodyCyan = echoStyle ? "#a879ff" : palette.cyan;
      const bodyRed = echoStyle ? "#63ffc6" : palette.red;
      const bodyAmber = echoStyle ? "#ead6ff" : palette.amber;
      const bodyBlade = echoStyle ? "#e8dcff" : "#c7d3d1";
      // 처음 디자인의 검은 전투복 색을 복원한다. 잔영은 몸체 색 대신
      // 발광 색으로 구분되므로 원래의 어두운 실루엣을 함께 유지한다.
      const uniformBack = "#152737";
      const uniformFront = "#3a5363";
      const uniformTorso = "#111d2c";
      const uniformRearArm = "#203443";
      const uniformFrontArm = "#526c7a";

      const locomotion = sampleLocomotion(player, game, !echoStyle);
      const { speedRatio, groundBlend, wallBlend, runBlend, gaitBlend, runPosePhase, bob } = locomotion;
      const squashX = 1 + locomotion.squash * 0.18;
      const squashY = 1 - locomotion.squash * 0.24;
      const shooting = player.recoilTimer > 0;
      // A confirmed cross-shot owns the visible hands until its recoil settles.
      // This is presentation only: the already-running slash keeps its hit timer.
      const crossShot = !echoStyle && shooting && (player.crossShotTimer || 0) > 0;
      const crossProgress = crossShot ? 1 - clamp(player.crossShotTimer / 0.3, 0, 1) : 1;
      const crossBrace = crossShot ? 1 - poseEase(clamp((crossProgress - 0.12) / 0.88, 0, 1)) : 0;
      const crossImpulse = crossShot ? (1 - crossProgress) ** 2 : 0;
      const attacking = player.attackTimer > 0 && !crossShot;
      const attackProgress = attacking ? 1 - player.attackTimer / player.attackDuration : 0;
      const shotProgress = shooting ? 1 - player.recoilTimer / 0.3 : 1;
      const shotKick = shooting ? (1 - clamp(shotProgress, 0, 1)) ** 2 : 0;
      const shotPoseBlend = shooting ? 1 - poseEase(clamp((shotProgress - 0.34) / 0.66, 0, 1)) : 0;
      const shotSettle = shooting ? Math.sin(shotProgress * Math.PI * 2) * Math.exp(-shotProgress * 5) : 0;
      // Arms oppose the same-side leg, with bent elbows instead of marching arms.
      const locomotionArmAngle = locomotion.arm;
      const locomotionRearAngle = locomotion.rear;
      const locomotionElbow = locomotion.elbow;
      const locomotionRearElbow = locomotion.rearElbow;
      const comboEnabled = !echoStyle && !crossShot && player.slashComboActive === true;
      const comboIndex = clamp(Math.trunc(player.slashComboIndex || 0), 0, 2);
      const recoveryRatio = comboEnabled && !attacking && !shooting
        ? clamp((player.slashComboRecovery || 0) / (player.slashComboRecoveryDuration || 0.16), 0, 1) : 0;
      const comboVisible = comboEnabled && (attacking || recoveryRatio > 0);
      const bladeVisible = attacking || recoveryRatio > 0.03;
      const comboCarry = player.slashComboLinked ? poseEase(clamp(player.slashComboCarry || 0, 0, 1)) : 0;
      const neutralPose = { arm: locomotionArmAngle, elbow: locomotionElbow, blade: -1.1,
        lunge: 0, lean: 0, drop: 0, stance: 0, rear: locomotionRearAngle, rearElbow: locomotionRearElbow, twist: 0 };
      let comboPose = neutralPose;
      if (comboVisible) {
        if (attacking) {
          const previousFinish = COMBO_POSES[(comboIndex + 2) % 3][2];
          // Latch the incoming arm swing once; running feet keep their own phase.
          const entryPose = player.slashComboEntry ? { ...neutralPose, ...player.slashComboEntry } : neutralPose;
          let from = mixPose(entryPose, previousFinish, comboCarry);
          let fromTime = 0;
          for (const authoredKey of COMBO_POSES[comboIndex]) {
            let key = authoredKey;
            if (authoredKey === COMBO_POSES[comboIndex][0] && player.slashComboEntry && comboCarry < 0.001) {
              // The short opening windup must not reverse a bent sprinting arm
              // in two frames. Enter the cut from a nearby guard instead.
              key = { ...authoredKey };
              for (const joint of ["arm", "elbow", "rear", "rearElbow"]) {
                key[joint] = clamp(key[joint], from[joint] - 0.55, from[joint] + 0.55);
              }
            }
            if (attackProgress <= key.at) {
              comboPose = mixPose(from, key, poseEase(clamp((attackProgress - fromTime) / (key.at - fromTime), 0, 1)));
              break;
            }
            from = key;
            fromTime = key.at;
          }
        } else {
          comboPose = mixPose(neutralPose, COMBO_POSES[comboIndex][2], poseEase(recoveryRatio));
        }
      }
      const comboAim = Math.atan2(player.attackDir?.y || 0, Math.max(0.01, Math.abs(player.attackDir?.x ?? 1)));
      const comboAimWeight = attacking
        ? lerp(comboCarry, 1, poseEase(clamp(attackProgress / 0.18, 0, 1)))
        : poseEase(recoveryRatio);
      const attackLunge = comboVisible ? comboPose.lunge * 4 : attacking
        ? attackProgress < 0.22
          ? -poseEase(attackProgress / 0.22) * 4.5
          : attackProgress < 0.64
            ? lerp(-4.5, 14, poseEase((attackProgress - 0.22) / 0.42))
            : lerp(14, 0, poseEase((attackProgress - 0.64) / 0.36))
        : 0;
      const attackImpact = comboVisible ? comboPose.stance : attacking ? Math.sin(clamp((attackProgress - 0.16) / 0.72, 0, 1) * Math.PI) : 0;
      // Keep the pelvis over its support foot; hinge the chest forward separately.
      const baseLean = clamp(player.vx * facing / 5100, -0.085, 0.085);
      const actionLean = comboVisible ? comboPose.lean : attacking
        ? attackProgress < 0.22
          ? lerp(0, -0.07, poseEase(attackProgress / 0.22))
          : attackProgress < 0.64
            ? lerp(-0.07, 0.13, poseEase((attackProgress - 0.22) / 0.42))
            : lerp(0.13, 0, poseEase((attackProgress - 0.64) / 0.36))
        : -0.08 * shotKick + shotSettle * 0.025 + crossBrace * groundBlend * 0.035;
      const empowered = player.buffTimer > 0 || (attacking && player.chargedAttack);
      const sprintDrive = locomotion.sprintDrive;
      const travelSign = player.vx * facing < 0 ? -1 : 1;
      const torsoPitch = 0.28 * sprintDrive * travelSign * (1 - clamp(Math.max(attackImpact * 1.4, shotPoseBlend), 0, 1));
      const bodyOffsetX = attackLunge * 0.25 - shotKick * 2.5 - crossImpulse * 1.2 - sprintDrive * 1.5 * travelSign;
      // Lift the entire pelvis and rib cage together. The previous 20 px hip
      // clearance forced 29 px legs into a permanent right-angle squat.
      const postureLift = lerp(6, 3.5, poseEase(gaitBlend) * groundBlend);
      const bodyOffsetY = -postureLift - bob + shotKick * 1.2 + crossBrace * groundBlend * 1.7 + sprintDrive * 0.8 + (comboVisible ? comboPose.drop : attackImpact * 1.1);
      const bodyScaleX = squashX * (1 + attackImpact * 0.035);
      const bodyScaleY = squashY * (1 - attackImpact * 0.025);
      const bodyLean = baseLean + actionLean;

      ctx.translate(bodyOffsetX, bodyOffsetY);
      ctx.scale(bodyScaleX, bodyScaleY);
      ctx.rotate(bodyLean);

      if (ghost) {
        // A single silhouette per afterimage, with the same swept crest and
        // diagonal shoulder. No full-cost armour pass for fading trails.
        drawCharacterPlate([-13,-59,-7,-57,-2,-60,4,-58,10,-52,8,-49,
          5,-43,9,-41,11,-37,8,-30,12,-17,7,-20,9,-4,7,0,2,0,
          -3,-16,-8,-2,-13,-1,-11,-6,-8,-20,-14,-14,-12,-33,-12,-40,
          -6,-44,-10,-47,-10,-54], bodyCyan, null);
        ctx.restore();
        return;
      }

      function drawPixelSegment(x1, y1, x2, y2, width, color, highlight, part = "thigh") {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        const half = width / 2;
        const nearLayer = color === uniformFront || color === uniformFrontArm;
        const metalEdge = nearLayer ? "#9ab5bd" : "#597786";
        const metalInset = nearLayer ? "#567383" : "#304959";
        ctx.save();
        ctx.translate(x1, y1);
        // Canvas rotates +Y toward -X; negate the angle to connect the real joints.
        ctx.rotate(-Math.atan2(dx, dy));
        // A narrow actuator remains visible at each end of the armor shell.
        const neck = Math.max(1.1, width * 0.36);
        drawCharacterPlate([-neck / 2, -0.25, neck / 2, -0.25,
          neck / 2, length + 0.25, -neck / 2, length + 0.25], "#07101a", null);
        ctx.fillStyle = nearLayer ? "#526e7c" : "#253d4e";
        ctx.fillRect(-neck / 2, 0.2, 0.6, 1.2);
        ctx.fillRect(-neck / 2, length - 1.3, 0.6, 1.2);
        let shell;
        if (part === "thigh") {
          shell = [-half * 0.65, 0.8, half * 0.55, 0.8, half, 2.4,
            half * 0.86, length * 0.42, half * 0.55, length * 0.64,
            half * 0.42, length - 1.05, -half * 0.42, length - 1.05,
            -half * 0.72, length * 0.65, -half, length * 0.37, -half, 2];
        } else if (part === "calf") {
          shell = [-half * 0.52, 0.85, half * 0.6, 0.85, half, length * 0.25,
            half * 0.9, length * 0.54, half * 0.45, length - 1.1,
            -half * 0.55, length - 1.1, -half * 0.72, length * 0.7,
            -half, length * 0.42, -half * 0.85, length * 0.2];
        } else if (part === "bicep") {
          shell = [-half * 0.55, 0.7, half * 0.42, 0.7, half, 2,
            half * 0.85, length * 0.48, half * 0.45, length - 1,
            -half * 0.5, length - 1, -half, length * 0.6, -half * 0.9, 2.2];
        } else {
          shell = [-half * 0.4, 0.8, half * 0.38, 0.8, half * 0.7, length * 0.3,
            half, length * 0.52, half * 0.9, length - 0.85,
            -half * 0.75, length - 0.85, -half, length * 0.7, -half * 0.68, length * 0.35];
        }
        drawCharacterPlate(shell, color, "#030a11", 0.65);
        if (part === "thigh") {
          drawCharacterPlate([half * 0.12, length * 0.42, half * 0.61, length * 0.5,
            half * 0.36, length - 1.8, -half * 0.15, length - 1.8], metalInset, null);
        } else if (part === "calf") {
          drawCharacterPlate([-0.45, 2, 0.5, 2.6, half * 0.36, length * 0.72,
            -0.35, length - 2], metalInset, null);
        } else if (part === "bicep") {
          drawCharacterPlate([-half * 0.62, 1.4, half * 0.36, 1.4,
            half * 0.63, 2.6, -half * 0.46, 3.1], metalInset, null);
        } else {
          drawCharacterPlate([-0.2, length * 0.4, half * 0.55, length * 0.5,
            half * 0.45, length - 1.4, -0.4, length - 1.4], nearLayer ? "#29414f" : "#101f2d", null);
        }
        ctx.strokeStyle = metalEdge;
        ctx.lineWidth = nearLayer ? 0.65 : 0.45;
        ctx.beginPath();
        ctx.moveTo(-half * 0.55, part === "forearm" ? length * 0.4 : 1.6);
        ctx.lineTo(-half * 0.72, part === "forearm" ? length - 1.65 : length * 0.43);
        ctx.stroke();
        ctx.fillStyle = highlight;
        ctx.fillRect(-0.35, part === "forearm" ? length - 1.8 : 1.5, 0.7, 0.7);
        ctx.restore();
      }

      function drawJointedLimb(px, py, upperLength, lowerLength, width, upperAngle, kneeBend, color, foot = false, hand = false, footAngle = null) {
        const kneeX = px + Math.sin(upperAngle) * upperLength;
        const kneeY = py + Math.cos(upperAngle) * upperLength;
        const lowerAngle = upperAngle - kneeBend;
        const endX = kneeX + Math.sin(lowerAngle) * lowerLength;
        const endY = kneeY + Math.cos(lowerAngle) * lowerLength;
        const nearLayer = color === uniformFront || color === uniformFrontArm;
        drawPixelSegment(px, py, kneeX, kneeY, width, color, "rgba(151, 207, 216, 0.24)", foot ? "thigh" : "bicep");
        drawPixelSegment(kneeX, kneeY, endX, endY, Math.max(3, width - (foot ? 0.4 : 1)), color, "rgba(151, 207, 216, 0.18)", foot ? "calf" : "forearm");
        ctx.fillStyle = "#07101a";
        ctx.beginPath();
        ctx.arc(kneeX, kneeY, width * 0.56, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(kneeX, kneeY);
        ctx.rotate(-(upperAngle + lowerAngle) * 0.5);
        const bearing = width * 0.56;
        drawCharacterPlate([-bearing * 0.7, -bearing * 0.45, 0, -bearing * 0.7,
          bearing * 0.75, -bearing * 0.3, bearing * 0.7, bearing * 0.4,
          0, bearing * 0.65, -bearing * 0.75, bearing * 0.3], foot ? (nearLayer ? "#6d8794" : "#496474") : (nearLayer ? "#8aabb5" : "#516c7a"), null);
        ctx.fillStyle = "#182b38";
        ctx.beginPath(); ctx.arc(0, 0, bearing * 0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = nearLayer ? "#c2d6d8" : "#6e8b98";
        ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(0, 0, bearing * 0.78, -Math.PI * 0.9, -Math.PI * 0.15); ctx.stroke();
        ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
        ctx.fillRect(-0.5, -0.5, 1, 1);
        ctx.restore();
        if (foot) {
          const toeLift = footAngle ?? (player.grounded ? -bodyLean : clamp(-player.vy / 700, -0.35, 0.35));
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(toeLift);
          drawCharacterPlate([-2.5, -1.3, -1.6, -2, 0.8, -2, 1.5, -0.7,
            3.7, -0.4, 4.2, 0.2, 5.5, 0.2, 6.5, 1.1, 6.5, 4, -2.5, 4], "#06101a", null);
          drawCharacterPlate([-1.3, -1, 0.7, -1, 1.4, 0.3, 3.6, 0.8,
            3.6, 2.4, -1.5, 2.4], nearLayer ? "#3b5664" : "#1c3443", null);
          drawCharacterPlate([3.5, 0.7, 5.6, 1, 6, 2.4, 3.5, 2.4], nearLayer ? "#698590" : "#3d596a", null);
          ctx.fillStyle = "#0b1721";
          ctx.fillRect(-2.5, 2.8, 9, 1.2);
          ctx.fillStyle = "#02080f";
          ctx.fillRect(-1.5, 3.1, 1, 0.9);
          ctx.fillRect(3.9, 3.1, 0.8, 0.9);
          ctx.fillStyle = nearLayer ? "#91a9b0" : "#526e7c";
          ctx.fillRect(0, 2.8, 5.5, 0.5);
          ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
          ctx.fillRect(5, 1.2, 0.9, 0.7);
          ctx.restore();
        } else if (hand) {
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(-lowerAngle);
          drawCharacterPlate([-1.4, -2, 0.9, -2, 1.4, -1.3, 2.5, -0.8,
            2.5, 0.7, 1.8, 1.1, 1.8, 2.2, 0.4, 3, -1.8, 2.5,
            -2.5, 1, -2.5, -0.8], "#0a141e", null);
          drawCharacterPlate([-1.2, -1.1, 0.6, -1.1, 1.4, -0.3, 1.2, 1.4,
            -0.5, 2.1, -1.6, 1.2], nearLayer ? "#3d5868" : "#223b4b", null);
          ctx.fillStyle = nearLayer ? "#a7bec4" : "#647f8d";
          ctx.fillRect(0, -0.8, 0.7, 1);
          ctx.fillRect(0.95, -0.5, 0.65, 0.85);
          ctx.fillStyle = "#06121c";
          ctx.fillRect(-1.2, -1.8, 2.3, 0.65);
          ctx.fillRect(0.5, 0.6, 1.2, 0.5);
          ctx.restore();
        }
        return { x: endX, y: endY, angle: lowerAngle };
      }

      function legPose(layer) {
        const rise = poseEase(clamp(-locomotion.vy / 560, 0, 1));
        const fall = poseEase(clamp(locomotion.vy / 680, 0, 1));
        const airborne = layer === "back"
          ? { upper: -0.18 - rise * 0.32 + fall * 0.46, knee: 0.62 - rise * 0.25 + fall * 0.16 }
          : { upper: 0.42 + rise * 0.42 - fall * 0.56, knee: 1.12 + rise * 0.2 - fall * 0.66 };
        const wall = layer === "back" ? { upper: -0.4, knee: 0.6 } : { upper: 0.82, knee: 1.12 };
        return mixPose(airborne, wall, wallBlend);
      }

      function drawPlantedLeg(layer, width, color) {
        const hipX = layer === "back" ? -3 : 3;
        const hipY = -24;
        const phase = (((runPosePhase + (layer === "back" ? 6 : 0)) / 12) % 1 + 1) % 1;
        const contact = phase < RUN_SUPPORT_FRACTION;
        const recovery = clamp((phase - RUN_SUPPORT_FRACTION) / (1 - RUN_SUPPORT_FRACTION), 0, 1);
        const travelSign = player.vx * facing < 0 ? -1 : 1;
        // The supporting foot travels straight back along the floor; the other
        // lifts at the heel, folds at the knee and returns over an arc.
        // Short support and a longer recovery permit a plausible running cadence
        // without sliding: support travel exactly equals the world's travel.
        const strideReach = Math.PI * RUN_SUPPORT_FRACTION / STRIDE_RADIANS_PER_PIXEL;
        const strideX = contact ? lerp(strideReach, -strideReach, phase / RUN_SUPPORT_FRACTION)
          : lerp(-strideReach, strideReach, poseEase(recovery));
        const footLift = contact ? 0 : Math.sin(recovery * Math.PI) ** 1.1 * (5 + speedRatio * 4);
        const actionStance = Math.max(comboVisible ? comboPose.stance : attackImpact * 0.65, shotPoseBlend * 0.38 + crossBrace * 0.3) * (1 - runBlend * 0.6);
        let footX = lerp(layer === "back" ? -5 : 6, hipX + strideX * travelSign, gaitBlend);
        footX = lerp(footX, layer === "back" ? -11 : 13, actionStance);
        let footY = -4 - footLift * gaitBlend;
        const toeRoll = contact ? 0 : Math.sin(recovery * TAU) * 0.22 * runBlend;
        const toeAngle = lerp(clamp(-locomotion.vy / 700, -0.35, 0.35), -bodyLean + toeRoll, groundBlend);
        const airborne = legPose(layer);
        const upperLength = 13.5;
        const lowerLength = 13.5;
        const airX = hipX + Math.sin(airborne.upper) * upperLength + Math.sin(airborne.upper - airborne.knee) * lowerLength;
        const airY = hipY + Math.cos(airborne.upper) * upperLength + Math.cos(airborne.upper - airborne.knee) * lowerLength;
        const airWorldX = bodyOffsetX + bodyScaleX * (airX * Math.cos(bodyLean) - airY * Math.sin(bodyLean));
        const airWorldY = bodyOffsetY + bodyScaleY * (airX * Math.sin(bodyLean) + airY * Math.cos(bodyLean));
        footX = lerp(airWorldX, footX, groundBlend);
        footY = lerp(airWorldY, footY, groundBlend);
        // Keep falling feet inside the physical sole boundary before contact,
        // avoiding a last-frame upward pop or a foot disappearing into the floor.
        const soleAngle = bodyLean + toeAngle;
        const soleBottom = bodyScaleY * Math.max(-2.5 * Math.sin(soleAngle) + 4 * Math.cos(soleAngle), 6.5 * Math.sin(soleAngle) + 4 * Math.cos(soleAngle));
        footY = Math.min(footY, -soleBottom);
        // Inverse the torso transform so planted soles do not slide vertically
        // when breathing, recoiling, leaning or compressing on landing.
        const localX = (footX - bodyOffsetX) / bodyScaleX;
        const localY = (footY - bodyOffsetY) / bodyScaleY;
        const endX = localX * Math.cos(bodyLean) + localY * Math.sin(bodyLean);
        const endY = -localX * Math.sin(bodyLean) + localY * Math.cos(bodyLean);
        const dx = endX - hipX;
        const dy = endY - hipY;
        // Fixed bone lengths cover the entire support stride without stretching
        // or lifting the planted heel when the foot passes behind the pelvis.
        const reach = clamp(Math.hypot(dx, dy), 1, upperLength + lowerLength - 0.1);
        const axis = Math.atan2(dx, dy);
        const upperAngle = axis + Math.acos(clamp((upperLength ** 2 + reach ** 2 - lowerLength ** 2) / (2 * upperLength * reach), -1, 1));
        const kneeX = hipX + Math.sin(upperAngle) * upperLength;
        const kneeY = hipY + Math.cos(upperAngle) * upperLength;
        const targetX = hipX + Math.sin(axis) * reach;
        const targetY = hipY + Math.cos(axis) * reach;
        const lowerAngle = Math.atan2(targetX - kneeX, targetY - kneeY);
        drawJointedLimb(hipX, hipY, upperLength, lowerLength, width, upperAngle, upperAngle - lowerAngle, color, true, false, toeAngle);
      }

      function drawArmTo(shoulderX, shoulderY, targetX, targetY, length, width, color) {
        const dx = targetX - shoulderX;
        const dy = targetY - shoulderY;
        const reach = clamp(Math.hypot(dx, dy), 1, length * 2 - 0.1);
        const axis = Math.atan2(dx, dy);
        const upper = axis - Math.acos(reach / (length * 2));
        const elbowX = shoulderX + Math.sin(upper) * length;
        const elbowY = shoulderY + Math.cos(upper) * length;
        const lower = Math.atan2(shoulderX + Math.sin(axis) * reach - elbowX,
          shoulderY + Math.cos(axis) * reach - elbowY);
        return drawJointedLimb(shoulderX, shoulderY, length, length, width, upper, upper - lower, color, false, true);
      }

      // Structured white officer coat: split tails expose the mechanical legs.
      // Fixed-cut officer coat: no independent sway, lag or billowing panels.
      function pitchUpperBody() {
        ctx.translate(0, -24);
        ctx.rotate(torsoPitch);
        ctx.translate(0, 24);
      }
      if (!echoStyle) {
        ctx.save();
        pitchUpperBody();
        // Officer's field mantle: an ivory rear vent and a much shorter folded
        // front vent, cut on the bias. They stay fixed to the upper body.
        drawCharacterPlate([-11,-45, -6,-48, 6,-45, 9,-40, 8,-32, 11,-19,
          7,-17, 3,-24, 1,-29, -3,-29, -7,-21, -12,-14, -15,-16, -12,-29], "#b5c7cb");
        drawCharacterPlate([-11,-41, -6,-39, -7,-30, -11,-21, -14,-17, -12,-30], "#f5f2de", null);
        drawCharacterPlate([-13,-19, -10,-21, -7,-27, -9,-21, -13,-16], "#ac8256", null);
        drawCharacterPlate([5,-37, 7,-34, 10,-20, 8,-19, 5,-25], "#d8d9c9", null);
        ctx.restore();
      }

      drawPlantedLeg("back", 4.0, uniformBack);
      drawPlantedLeg("front", 4.8, uniformFront);

      // Shorten the oversized torso rather than hiding the upper legs inside it.
      // The small whole-body lift leaves room for a relaxed, unlocked knee.
      pitchUpperBody();
      ctx.translate(0, -10);
      ctx.scale(1, 0.84);

      // Low-profile receiver: a hooked aerial nests against the back shell.
      drawCharacterPlate([-12,-43,-8,-42,-8,-28,-11,-25,-14,-32], "#172d38");
      drawCharacterPlate([-13,-40,-10,-39,-10,-32,-12,-31], "#58727a", null);
      drawCharacterPlate([-12,-41,-14,-44,-16,-49,-14,-48,-11,-44], "#788b89", null);
      ctx.fillStyle = bodyCyan;
      ctx.fillRect(-12,-38,1,3);

      // A 37-unit curved sheath seats a 35.5-unit blade at the sword belt.
      const sayaAngle = 2.80, mouthX = 0, mouthY = -23;
      const seatX = mouthX - 4.5 * Math.cos(sayaAngle);
      const seatY = mouthY - 4.5 * Math.sin(sayaAngle);

      // A small opposed shoulder turn keeps the upper body involved in each cut.
      const shoulderTurn = comboVisible ? comboPose.twist : 0;
      ctx.translate(shoulderTurn, 0);
      const shotAimAngle = Math.atan2(player.shotAimY || 0, Math.max(0.01, Math.abs(player.shotAimX || facing)));
      const weaponAngle = lerp(0.72, shotAimAngle, shotPoseBlend) - shotSettle * 0.06 - crossImpulse * 0.045;
      const gunScale = 0.62;
      const pumpTravel = Math.sin(clamp((shotProgress - 0.22) / 0.66, 0, 1) * Math.PI) * 6;
      const restHandX = 10 + Math.sin(locomotionArmAngle) * 9 + Math.sin(locomotionArmAngle - locomotionElbow) * 9;
      const restHandY = -38 + Math.cos(locomotionArmAngle) * 9 + Math.cos(locomotionArmAngle - locomotionElbow) * 9;
      const shotHandX = lerp(restHandX, 10 + Math.cos(weaponAngle) * (5 - shotKick * 2) - crossBrace * 0.8, shotPoseBlend);
      const shotHandY = lerp(restHandY, -27 + Math.sin(weaponAngle) * 7 - crossBrace * 1.8, shotPoseBlend);
      const rearArm = comboVisible ? comboPose.rear : shooting
        ? Math.PI / 2 + shotAimAngle * 0.72 - 0.24
        : attacking
          ? -0.34 - attackLunge * 0.025
          : locomotionRearAngle;
      // The far arm belongs behind the chest; only the shotgun support hand
      // reaches across the front. This makes the two arm swings readable.
      if (!shooting || bladeVisible) drawRearArm();
      // Armoured courier of the lunar guard. The rib cage is a swept wedge;
      // a narrow exposed spine separates the breastplate from the hip harness.
      drawCharacterPlate([-7,-43, 2,-44, 8,-41, 10,-36, 8,-31, 5,-28,
        4,-24, 6,-19, 2,-18, -5,-19, -6,-25, -8,-29, -10,-34,
        -10,-38], uniformTorso, "#080f16");
      drawCharacterPlate([-8,-39,-3,-42,6,-39,8,-36,6,-32,0,-29,-6,-31,-8,-35], "#253946", null);
      drawCharacterPlate([-6,-39,1,-40,6,-37,3,-37,-2,-38,-7,-36], "#465f69", null);
      drawCharacterPlate([-3,-30, 4,-32, 4,-30, 0,-27, -4,-27], "#0a1620", null);
      drawCharacterPlate([-4,-26, 3,-28, 4,-26, -3,-24], "#54636a", null);
      drawCharacterPlate([-3,-24, 4,-26, 4,-24, -2,-22], "#30444e", null);
      // A fitted diagonal sword harness crosses the ribs into a brass frog.
      drawCharacterPlate([5,-41,8,-40,-5,-23,-8,-23], "#4a3035", "#15191f", 0.65);
      drawCharacterPlate([5,-40,6,-40,-5,-25,-6,-25], "#976c55", null);
      drawCharacterPlate([-8,-24, -2,-23, 7,-25, 8,-22, 3,-20, -6,-21, -9,-22], "#222e34");
      drawCharacterPlate([-8,-24,-4,-24,-3,-21,-6,-20,-9,-21], "#c5a26b", null);
      drawCharacterPlate([-7,-23,-5,-23,-5,-22,-7,-22], "#5c3a34", null);
      drawCharacterPlate([-5,-21,3,-20,7,-22,6,-19,1,-17,-4,-18], "#354953", null);
      if (!echoStyle) {
        // One asymmetrical half-mantle instead of two boxy shoulder pads.
        // Its diagonal ivory edge points to the sword hand and leaves the
        // action-side elbow entirely outside the coat.
        drawCharacterPlate([-11,-42,-8,-47,-7,-47,-4,-43,2,-42,7,-44,
          9,-41,5,-38,-1,-36,-5,-33,-9,-32,-12,-34], "#e8e9d8", "#34464c", 0.9);
        drawCharacterPlate([-11,-41,-8,-45,-5,-42,1,-41,-3,-39,-8,-38,-11,-35], "#fcf5db", null);
        drawCharacterPlate([-10,-33,-6,-37,-1,-38,6,-41,3,-38,-1,-36,-5,-33,-9,-32], "#879a99", null);
        drawCharacterPlate([-9,-32,-5,-34,0,-36,-2,-34,-7,-31], "#b79765", null);
        // Crescent brooch: warm outer hook and a cut-in made of garment shadow.
        drawCharacterPlate([-4,-40,-2,-41,0,-40,-2,-40,-3,-38,-2,-37,0,-37,-2,-36,-4,-37], "#a67740", null);
      } else {
        drawCharacterPlate([-8,-41,0,-43,7,-40,1,-38,-6,-36], "#283c4e");
        drawCharacterPlate([-4,-37,0,-38,3,-37,0,-36], bodyCyan, null);
      }

      function drawRearArm() {
        if (shooting && !bladeVisible) {
          const restRearAngle = locomotionRearAngle;
          const restRearX = -10 + Math.sin(restRearAngle) * 8 + Math.sin(restRearAngle - locomotionRearElbow) * 8;
          const restRearY = -38 + Math.cos(restRearAngle) * 8 + Math.cos(restRearAngle - locomotionRearElbow) * 8;
          const gripOffsetX = (20 - pumpTravel) * gunScale;
          const gripOffsetY = -5 * gunScale;
          drawArmTo(lerp(-10, 0, shotPoseBlend), -38,
            lerp(restRearX, shotHandX + Math.cos(weaponAngle) * gripOffsetX - Math.sin(weaponAngle) * gripOffsetY, shotPoseBlend),
            lerp(restRearY, shotHandY + Math.sin(weaponAngle) * gripOffsetX + Math.cos(weaponAngle) * gripOffsetY, shotPoseBlend),
            lerp(8, 13, shotPoseBlend), 3.8, uniformRearArm);
        } else {
          drawJointedLimb(-10 - shoulderTurn * 0.5, -38, 8, 8, 3.8, rearArm,
            comboVisible ? comboPose.rearElbow : attacking ? -0.62 : locomotionRearElbow,
            uniformRearArm, false, true);
        }
      }
      if (shooting && !bladeVisible) drawRearArm();

      ctx.save();
      ctx.scale(0.85, 1);
      ctx.translate(0, -43);
      ctx.rotate(-bodyLean * 0.45 - torsoPitch * 0.75 - shotSettle * 0.04);
      ctx.translate(0, 43);
      // Night-heron mask: swept nape vane, pitched brow, recessed single optic
      // and an articulated beak-like chin. No human skin or opaque faceplate.
      drawCharacterPlate([-8,-58,-3,-60,3,-59,8,-56,10,-53,11,-51,
        8,-49,7,-45,3,-41,0,-40,-5,-43,-8,-46,-11,-47,
        -12,-51,-11,-55], "#172833", "#758c8d", 0.8);
      drawCharacterPlate([-16,-60,-9,-58,-3,-59,4,-57,9,-53,4,-54,
        -3,-55,-8,-54,-12,-55], "#344954", "#131c25", 0.8);
      drawCharacterPlate([-14,-59,-9,-57,-2,-58,4,-56,0,-56,-7,-56,-10,-56], "#8b9c9b", null);
      drawCharacterPlate([-8,-52,-3,-54,4,-53,12,-51,9,-48,3,-49,-2,-48,-7,-49], "#060e17", null);
      drawCharacterPlate([-6,-50,-2,-52,4,-52,11,-50.6,6,-50,2,-50.6,-2,-50,-5,-49], empowered ? bodyAmber : bodyRed, null);
      drawCharacterPlate([5,-51.4,9,-50.8,6,-50.7], "#fff0df", null);
      drawCharacterPlate([-6,-47,-4,-49,1,-47,7,-48,5,-44,2,-42,-2,-43], "#708386", null);
      drawCharacterPlate([-1,-46,5,-47,4,-44,2,-42,1,-43], "#d6dbcf", null);
      drawCharacterPlate([-4,-46,-2,-45,0,-43,-2,-43.5], "#172a35", null);
      drawCharacterPlate([-12,-52,-9,-54,-6,-52,-6,-48,-9,-45,-12,-47], "#253843", "#0a141e", 0.85);
      drawCharacterPlate([-12,-51,-9,-52,-8,-50,-10,-48,-12,-49], "#7a8987", null);
      drawCharacterPlate([-10.5,-50,-9,-50.8,-9,-49,-10.5,-48.4], bodyCyan, null);
      drawCharacterPlate([-10,-46,-7,-48,-5,-46,-3,-43,-5,-44,-8,-44], "#425761", null);
      ctx.restore();

      let armAngle = locomotionArmAngle;
      let bladeAngle = -1.1;
      if (shooting) armAngle = Math.PI / 2 + shotAimAngle * 0.82;
      if (comboVisible) {
        armAngle = comboPose.arm + comboAim * 0.5 * comboAimWeight;
        bladeAngle = comboPose.blade + comboAim * comboAimWeight;
      } else if (attacking) {
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

      // Carry the recovery pose across chained cuts. First reach for the
      // seated grip, then clear the sheath; reverse that handoff to stow.
      const ease01 = (n) => poseEase(clamp(n, 0, 1));
      const priorReady = comboEnabled && player.slashComboLinked
        ? clamp((player.slashComboCarry || 0) / 0.58, 0, 1) : 0;
      const swordReady = attacking
        ? lerp(priorReady, 1, clamp(attackProgress / 0.43, 0, 1)) *
          (comboEnabled ? 1 : ease01((1 - attackProgress) / 0.24))
        : clamp(recoveryRatio / 0.58, 0, 1);
      const pull = ease01((swordReady - 0.43) / 0.57);
      const onBelt = pull <= 0;
      const reachGrip = ease01(swordReady / 0.43) * (1 - pull);
      const shoulderX = 10 + shoulderTurn * 0.5;
      let elbow = comboVisible ? comboPose.elbow : attacking ? 0.12 : locomotionElbow;
      if (reachGrip > 0) {
        const dx = seatX - shoulderTurn - shoulderX, dy = seatY + 38;
        const bend = Math.acos(clamp(Math.hypot(dx, dy) / 18, 0, 1));
        armAngle = lerp(armAngle, Math.atan2(dx, dy) - bend, reachGrip);
        elbow = lerp(elbow, -2 * bend, reachGrip);
      }
      function drawHilt() {
        drawCharacterPlate([-4.6,-1.2,3.9,-1.45,4.3,-1,4.3,1.35,-4.4,1.45,-5,0.7], "#30252b", "#101820", 0.65);
        for (let x=-3.5; x<2; x+=2.3) {
          drawCharacterPlate([x,-1.1,x+1,-1.15,x+1.9,1.08,x+1,1.15], "#885059", null);
        }
        ctx.fillStyle = "#a48c65";
        ctx.beginPath(); ctx.ellipse(4.5,0,1.25,3.05,0,0,TAU); ctx.fill();
      }
      // The hip frog and mouth overlap; tip remains well above the floor.
      ctx.save();
      ctx.translate(mouthX - shoulderTurn, mouthY);
      ctx.rotate(sayaAngle);
      drawCharacterPlate([0,-2,12,-2.1,24,-2.5,33,-3.3,36.5,-3.8,
        37,-2.8,36,-1.1,26,-0.1,11,1.45,0,1.85], "#132631", "#0a1018", 0.75);
      drawCharacterPlate([1,-1.75,13,-1.8,28,-2.6,33,-3,24,-1.85,3,-0.9], "#4b6065", null);
      drawCharacterPlate([0,-2,1.8,-2.1,1.8,1.75,0,1.9], "#a48c65", null);
      drawCharacterPlate([4,-2.2,8,-2.2,8,1.6,4,1.75], "#724750", null);
      drawCharacterPlate([34,-3.45,36.5,-3.8,37,-2.8,36,-1.1,34,-0.9], "#79756a", null);
      if (onBelt) { ctx.translate(-4.5,0); drawHilt(); }
      ctx.restore();
      const frontHand = shooting && !bladeVisible
        ? drawArmTo(10, -38, shotHandX, shotHandY, 9, 4.5, uniformFrontArm)
        : drawJointedLimb(shoulderX, -38, 9, 9, 4.5, armAngle, elbow, uniformFrontArm, false, onBelt);
      if (!onBelt) {
        ctx.save();
        ctx.translate(frontHand.x, frontHand.y);
        ctx.rotate(lerp(sayaAngle - TAU, bladeAngle, pull));
        drawHilt();
        if (swingFX && pull > 0.97 && attackProgress < 0.68) {
          // Trail ends on the cutting tip and reverses with the rising cut.
          const dir = comboVisible && comboIndex === 1 ? 1 : -1;
          ctx.save();
          ctx.globalAlpha *= 0.42 * Math.sin(Math.PI * clamp((attackProgress - 0.18) / 0.50, 0, 1));
          ctx.fillStyle = flameSword ? "#ffad57" : empowered ? bodyAmber : "#8dc6c8";
          ctx.beginPath(); ctx.moveTo(40,-2.7);
          ctx.quadraticCurveTo(40,dir*10,33,dir*19);
          ctx.quadraticCurveTo(36,dir*9,35.5,-2.1);
          ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.save();
        if (pull < 1) {
          ctx.beginPath(); ctx.rect(4.75,-14,35.5*pull,26); ctx.clip();
        }
        // Narrow steel spine, shallow curvature and a distinct diagonal point.
        ctx.fillStyle = flameSword ? "#ffaa55" : empowered ? bodyAmber : bodyBlade;
        ctx.beginPath();
        ctx.moveTo(5.1,-1.20);
        ctx.quadraticCurveTo(25.5,-1.15,40,-2.7);
        ctx.quadraticCurveTo(37.4,-0.65,34.5,-0.2);
        ctx.quadraticCurveTo(20.4,1.45,5.1,1.2);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = flameSword ? "#ffe1a3" : "#f0f4ec"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(5.3,1);
        ctx.quadraticCurveTo(23.2,1.12,34.5,-0.4);
        ctx.lineTo(39.7,-2.55); ctx.stroke();
        ctx.strokeStyle = flameSword ? "#dc602c" : "#677e85"; ctx.lineWidth = 0.65;
        ctx.beginPath(); ctx.moveTo(6,-0.85);
        ctx.quadraticCurveTo(26.2,-0.82,37.8,-2.12); ctx.stroke();
        if (flameSword) {
          for (let i=0;i<3;i++) {
            const x=10+i*8, flicker=Math.sin(game.time*18+i*1.7);
            drawCharacterPlate([x-2,-1,x+1,-3.8-flicker,x+3,-1.1], "#f27b37", null);
          }
        }
        ctx.restore();
        // Fingers cross the grip, leaving both ends of the handle visible.
        drawCharacterPlate([-2.5,-1.8,-1.8,-2.5,0.8,-2.3,2.1,-1.3,1.8,1.4,0.4,2,-2.2,1.4], "#0a141e", null);
        drawCharacterPlate([-1.9,-1.45,0.2,-1.8,1.4,-1.1,0.8,-0.3,-1.9,-0.5], "#65808a", null);
        ctx.restore();
      } else if (shooting && !attacking) {
        ctx.save();
        ctx.translate(frontHand.x, frontHand.y);
        ctx.rotate(weaponAngle);
        ctx.scale(gunScale, gunScale);
        // Trigger hand anchors to the actual pistol grip, not the receiver.
        ctx.translate(-4, -11);

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
        ctx.globalAlpha = clamp(0.72 - shotProgress * 0.8, 0, 0.72) * (crossShot ? 0.55 : 1);
        ctx.strokeStyle = "rgba(215, 248, 246, 0.7)";
        ctx.lineWidth = 3;
        for (let smoke = 0; smoke < (crossShot ? 2 : 3); smoke += 1) {
          ctx.beginPath();
          ctx.arc(64 + shotProgress * (18 + smoke * 7), (smoke - 1) * 5, 4 + shotProgress * 8, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();

        ctx.globalCompositeOperation = "lighter";
        if (crossShot) {
          // Two crisp crossing streaks leave the actual twin muzzle, then fade
          // before the brace relaxes. No camera shake or oversized aura is added.
          ctx.globalAlpha = alpha * (1 - poseEase(clamp(crossProgress / 0.42, 0, 1)));
          for (const diagonal of [-1, 1]) {
            drawCharacterPlate([58,-5*diagonal,97,11*diagonal,
              92,11.5*diagonal,58,-2.8*diagonal], diagonal < 0 ? "#a8fff4" : "#ffe2a6", null);
          }
          drawCharacterPlate([58,-2,70,0,58,2], "#f4fffd", null);
        } else {
          ctx.globalAlpha = alpha * clamp(1 - shotProgress / 0.18, 0, 1);
          ctx.fillStyle = player.shotgunCharge >= 3 ? bodyAmber : palette.white;
          ctx.beginPath();
          ctx.moveTo(58, -10); ctx.lineTo(91, 0); ctx.lineTo(58, 10); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    return drawPlayerBody;
  }
  return Object.freeze({ createRenderer, captureLocomotion, updateMotion, resetMotion,
    strideRadiansPerPixel: STRIDE_RADIANS_PER_PIXEL, runSupportFraction: RUN_SUPPORT_FRACTION });
});
