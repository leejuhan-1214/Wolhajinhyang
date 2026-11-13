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
  const RUN_SUPPORT_FRACTION = 0.24;
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
      bob: lerp(Math.sin(game.time * 2.1) * 0.35, sampleLoop(RUN_BOB, runPosePhase) * 0.8, runBlend),
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
      const uniformBack = "#152737";
      const uniformFront = "#3a5363";
      const uniformTorso = "#111d2c";
      const uniformPanel = "#29475a";
      const uniformShoulder = "#3d6072";
      const uniformJoint = "#172431";
      const uniformRearArm = "#203443";
      const uniformFrontArm = "#526c7a";

      const locomotion = sampleLocomotion(player, game, !echoStyle);
      const { speedRatio, groundBlend, wallBlend, runBlend, gaitBlend, runPosePhase, bob } = locomotion;
      const squashX = 1 + locomotion.squash * 0.18;
      const squashY = 1 - locomotion.squash * 0.24;
      const attacking = player.attackTimer > 0;
      const attackProgress = attacking ? 1 - player.attackTimer / player.attackDuration : 0;
      const shooting = player.recoilTimer > 0;
      const shotProgress = shooting ? 1 - player.recoilTimer / 0.3 : 1;
      const shotKick = shooting ? (1 - clamp(shotProgress, 0, 1)) ** 2 : 0;
      const shotPoseBlend = shooting ? 1 - poseEase(clamp((shotProgress - 0.34) / 0.66, 0, 1)) : 0;
      const shotSettle = shooting ? Math.sin(shotProgress * Math.PI * 2) * Math.exp(-shotProgress * 5) : 0;
      // Arms oppose the same-side leg, with bent elbows instead of marching arms.
      const locomotionArmAngle = locomotion.arm;
      const locomotionRearAngle = locomotion.rear;
      const locomotionElbow = locomotion.elbow;
      const locomotionRearElbow = locomotion.rearElbow;
      const comboEnabled = !echoStyle && player.slashComboActive === true;
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
        : -0.08 * shotKick + shotSettle * 0.025;
      const empowered = player.buffTimer > 0 || (attacking && player.chargedAttack);
      const sprintDrive = locomotion.sprintDrive;
      const travelSign = player.vx * facing < 0 ? -1 : 1;
      const torsoPitch = 0.28 * sprintDrive * travelSign * (1 - clamp(Math.max(attackImpact * 1.4, shotPoseBlend), 0, 1));
      const bodyOffsetX = attackLunge * 0.25 - shotKick * 2.5 - sprintDrive * 1.5 * travelSign;
      const bodyOffsetY = -bob + shotKick * 1.2 + sprintDrive * 0.8 + (comboVisible ? comboPose.drop : attackImpact * 1.1);
      const bodyScaleX = squashX * (1 + attackImpact * 0.035);
      const bodyScaleY = squashY * (1 - attackImpact * 0.025);
      const bodyLean = baseLean + actionLean;

      ctx.translate(bodyOffsetX, bodyOffsetY);
      ctx.scale(bodyScaleX, bodyScaleY);
      ctx.rotate(bodyLean);

      if (ghost) {
        drawCharacterPlate([-8, -57, 7, -56, 9, -45, 5, -42, 10, -38,
          12, -8, 6, -10, 7, 0, 0, 0, -4, -15, -10, 0, -15, -3,
          -11, -35, -9, -42], bodyCyan, null);
        ctx.restore();
        return;
      }

      function drawPixelSegment(x1, y1, x2, y2, width, color, highlight) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy);
        ctx.save();
        ctx.translate(x1, y1);
        // Canvas rotates +Y toward -X; negate the angle to connect the real joints.
        ctx.rotate(-Math.atan2(dx, dy));
        ctx.fillStyle = "#07101a";
        ctx.fillRect(-width / 2 - 0.6, -0.5, width + 1.2, length + 1);
        drawCharacterPlate([-width / 2 + 1, 0, width / 2 - 1, 0,
          width / 2, 1, width / 2, length - 1, width / 2 - 1, length,
          -width / 2 + 1, length, -width / 2, length - 1, -width / 2, 1], color, null);
        ctx.fillStyle = highlight;
        ctx.fillRect(-width / 2 + 0.6, 1, 1, Math.max(2, length - 2));
        ctx.fillStyle = "rgba(5, 10, 17, 0.48)";
        ctx.fillRect(width / 2 - 1.4, 2, 1.2, Math.max(2, length - 3));
        ctx.fillStyle = "#6a818b";
        ctx.fillRect(-0.5, 1.5, 1, 1);
        ctx.restore();
      }

      function drawJointedLimb(px, py, upperLength, lowerLength, width, upperAngle, kneeBend, color, foot = false, hand = false, footAngle = null) {
        const kneeX = px + Math.sin(upperAngle) * upperLength;
        const kneeY = py + Math.cos(upperAngle) * upperLength;
        const lowerAngle = upperAngle - kneeBend;
        const endX = kneeX + Math.sin(lowerAngle) * lowerLength;
        const endY = kneeY + Math.cos(lowerAngle) * lowerLength;
        drawPixelSegment(px, py, kneeX, kneeY, width, color, "rgba(151, 207, 216, 0.24)");
        drawPixelSegment(kneeX, kneeY, endX, endY, Math.max(3, width - 1), color, "rgba(151, 207, 216, 0.18)");
        ctx.fillStyle = "#07101a";
        ctx.beginPath();
        ctx.arc(kneeX, kneeY, width * 0.56, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#8aabb5";
        ctx.fillRect(kneeX - width * 0.4, kneeY - width * 0.3, width * 0.8, width * 0.6);
        ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
        ctx.fillRect(kneeX - 0.7, kneeY - 0.7, 1.4, 1.4);
        if (foot) {
          const toeLift = footAngle ?? (player.grounded ? -bodyLean : clamp(-player.vy / 700, -0.35, 0.35));
          ctx.save();
          ctx.translate(endX, endY);
          ctx.rotate(toeLift);
          ctx.fillStyle = "#06101a";
          ctx.fillRect(-2.5, -2, 9, 6);
          ctx.fillStyle = "#263c4b";
          ctx.fillRect(-1, -1, 6, 3);
          ctx.fillStyle = "#657d88";
          ctx.fillRect(-1, 2, 7, 1);
          ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
          ctx.fillRect(5, 0, 1.5, 1);
          ctx.restore();
        } else if (hand) {
          ctx.fillStyle = "#0a141e";
          ctx.fillRect(Math.round(endX - 2.5), Math.round(endY - 2), 5, 5);
          ctx.fillStyle = "#8ca1aa";
          ctx.fillRect(Math.round(endX + 0.5), Math.round(endY - 1), 1.5, 2);
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
        const footLift = contact ? 0 : Math.sin(recovery * Math.PI) ** 0.85 * (5 + speedRatio * 12);
        const actionStance = Math.max(comboVisible ? comboPose.stance : attackImpact * 0.65, shotPoseBlend * 0.38) * (1 - runBlend * 0.6);
        let footX = lerp(layer === "back" ? -5 : 6, strideX * travelSign, gaitBlend);
        footX = lerp(footX, layer === "back" ? -11 : 13, actionStance);
        let footY = -4 - footLift * gaitBlend;
        const toeRoll = contact ? 0 : Math.sin(recovery * TAU) * 0.32 * runBlend;
        const toeAngle = lerp(clamp(-locomotion.vy / 700, -0.35, 0.35), -bodyLean + toeRoll, groundBlend);
        const airborne = legPose(layer);
        const airX = hipX + Math.sin(airborne.upper) * 14.5 + Math.sin(airborne.upper - airborne.knee) * 14.5;
        const airY = hipY + Math.cos(airborne.upper) * 14.5 + Math.cos(airborne.upper - airborne.knee) * 14.5;
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
        const upperLength = 14.5;
        const lowerLength = 14.5;
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
        // Narrow, rigid split panels stop above the knees. The open center
        // exposes both thighs rather than turning the coat into a second body.
        drawCharacterPlate([-10, -46, 8, -46, 10, -32, 11, -16,
          7, -17, 2, -29, -3, -28, -9, -14,
          -14, -17, -12, -32], "#b5c7cb");
        drawCharacterPlate([-9, -43, -5, -37, -6, -29, -10, -17,
          -12, -18, -10, -32], "#edf3ed", null);
        drawCharacterPlate([6, -42, 8, -37, 9, -18,
          7, -20, 4, -30], "#f6f8ef", null);
        ctx.strokeStyle = "#ff496c";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(9, -32);
        ctx.lineTo(10, -18);
        ctx.moveTo(-12, -18);
        ctx.lineTo(-9, -16);
        ctx.stroke();
        ctx.restore();
      }

      drawPlantedLeg("back", 3.8, uniformBack);
      drawPlantedLeg("front", 4.6, uniformFront);

      // Shorten the oversized torso rather than hiding the upper legs inside it.
      // Total character height remains 60 px; the hip now reads above the knee.
      pitchUpperBody();
      ctx.translate(0, -10);
      ctx.scale(1, 0.84);

      // 등에 고정된 전술 신호 장치와 작은 안테나.
      ctx.fillStyle = "#0a131f";
      ctx.fillRect(-13, -42, 4, 18);
      ctx.fillStyle = "#3c5868";
      ctx.fillRect(-12, -38, 2, 10);
      ctx.fillStyle = bodyCyan;
      ctx.globalAlpha = alpha * (0.4 + Math.sin(game.time * 5) * 0.18);
      ctx.fillRect(-12, -41, 1.5, 3);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#526d79";
      ctx.beginPath();
      ctx.moveTo(-11, -42);
      ctx.lineTo(-14, -51);
      ctx.stroke();

      // 허리의 칼집. 천 소재 없이 단단한 검사 실루엣을 만든다.
      ctx.save();
      ctx.translate(-7, -23);
      ctx.rotate(2.66);
      ctx.fillStyle = "#070d16";
      ctx.fillRect(0, -3, 58, 6);
      ctx.fillStyle = "#334d5b";
      ctx.fillRect(4, -2, 47, 2);
      ctx.fillStyle = bodyRed;
      ctx.fillRect(5, -4, 3, 9);
      ctx.fillRect(50, -3, 2, 6);
      if (!bladeVisible) {
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
      ctx.moveTo(58, -3);
      ctx.lineTo(63, 0);
      ctx.lineTo(58, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // A small opposed shoulder turn keeps the upper body involved in each cut.
      const shoulderTurn = comboVisible ? comboPose.twist : 0;
      ctx.translate(shoulderTurn, 0);
      const shotAimAngle = Math.atan2(player.shotAimY || 0, Math.max(0.01, Math.abs(player.shotAimX || facing)));
      const weaponAngle = lerp(0.72, shotAimAngle, shotPoseBlend) - shotSettle * 0.06;
      const gunScale = 0.62;
      const pumpTravel = Math.sin(clamp((shotProgress - 0.22) / 0.66, 0, 1) * Math.PI) * 6;
      const restHandX = 10 + Math.sin(locomotionArmAngle) * 9 + Math.sin(locomotionArmAngle - locomotionElbow) * 9;
      const restHandY = -38 + Math.cos(locomotionArmAngle) * 9 + Math.cos(locomotionArmAngle - locomotionElbow) * 9;
      const shotHandX = lerp(restHandX, 10 + Math.cos(weaponAngle) * (5 - shotKick * 2), shotPoseBlend);
      const shotHandY = lerp(restHandY, -27 + Math.sin(weaponAngle) * 7, shotPoseBlend);
      const rearArm = comboVisible ? comboPose.rear : shooting
        ? Math.PI / 2 + shotAimAngle * 0.72 - 0.24
        : attacking
          ? -0.34 - attackLunge * 0.025
          : locomotionRearAngle;
      // The far arm belongs behind the chest; only the shotgun support hand
      // reaches across the front. This makes the two arm swings readable.
      if (!shooting || bladeVisible) drawRearArm();
      ctx.fillStyle = uniformTorso;
      ctx.beginPath();
      ctx.moveTo(-8, -43);
      ctx.lineTo(8, -43);
      ctx.lineTo(10.5, -36);
      ctx.lineTo(6.5, -18);
      ctx.lineTo(-6.5, -18);
      ctx.lineTo(-10.5, -36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = uniformPanel;
      ctx.fillRect(-7, -37, 2.5, 11);
      // One clean breastplate above a narrow waist: avoid layered belly plates.
      drawCharacterPlate([-3, -39, 6, -37, 6, -30, 2, -27, -4, -30], "#203645", "#0a1721");
      ctx.strokeStyle = "#516c79";
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-2, -38); ctx.lineTo(5, -36); ctx.stroke();
      ctx.fillStyle = "#09141d";
      ctx.fillRect(-4, -44, 9, 3);
      ctx.fillStyle = "#587380";
      ctx.fillRect(-3, -44, 7, 1);
      ctx.fillStyle = uniformShoulder;
      ctx.beginPath();
      ctx.moveTo(-11, -40);
      ctx.lineTo(-7, -43);
      ctx.lineTo(-4, -39);
      ctx.lineTo(-7, -35);
      ctx.lineTo(-11, -36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = uniformJoint;
      ctx.fillRect(-7, -23, 14, 5);
      ctx.fillStyle = empowered ? bodyAmber : bodyRed;
      ctx.fillRect(-8, -24, 16, 2);
      ctx.fillStyle = "#7d929b";
      ctx.fillRect(-5, -21, 2, 2);
      ctx.fillRect(3, -21, 2, 2);
      ctx.fillStyle = bodyCyan;
      ctx.fillRect(-2, -22, 4, 1);
      ctx.fillStyle = bodyRed;
      ctx.fillRect(7, -35, 1.5, 7);
      ctx.fillStyle = empowered ? bodyAmber : bodyCyan;
      ctx.beginPath();
      ctx.arc(2, -31, 1.6, 0, TAU);
      ctx.fill();

      // A few large seams survive at gameplay scale; no noisy chest grid.
      ctx.strokeStyle = "rgba(151, 196, 205, 0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-7, -36);
      ctx.lineTo(-5, -28);
      ctx.moveTo(6, -29);
      ctx.lineTo(5, -26);
      ctx.stroke();
      ctx.fillStyle = "#0b141f";
      ctx.fillRect(-10, -23, 4, 5);
      ctx.fillRect(6, -23, 4, 5);
      ctx.fillStyle = "#4c6774";
      ctx.fillRect(-9, -22, 2, 1);
      ctx.fillRect(7, -22, 2, 1);
      ctx.fillStyle = "#c2d1d3";
      ctx.fillRect(-1, -25, 3, 4);
      ctx.fillStyle = empowered ? bodyAmber : bodyRed;
      ctx.fillRect(0, -24, 1, 2);
      ctx.fillStyle = "#6e8790";
      ctx.fillRect(-5, -19, 2, 1);
      ctx.fillRect(3, -19, 2, 1);

      if (!echoStyle) {
        drawCharacterPlate([-10, -43, -7, -45, -3, -39, -5, -33, -8, -37], "#f0f5ee", "#778f99");
        drawCharacterPlate([5, -43, 8, -42, 10, -37, 8, -33, 6, -37], "#dce8e4", "#778f99");
        ctx.fillStyle = "#314755";
        ctx.fillRect(-8, -40, 3, 1);
        ctx.fillStyle = bodyRed;
        ctx.fillRect(8, -37, 1, 3);
        // Crescent insignia reads as a single light shape at gameplay scale.
        ctx.fillStyle = bodyAmber;
        ctx.beginPath(); ctx.arc(-7, -36, 1.5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#f0f5ee";
        ctx.beginPath(); ctx.arc(-6.3, -36.7, 1.2, 0, TAU); ctx.fill();
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

      const frontHand = shooting && !bladeVisible
        ? drawArmTo(10, -38, shotHandX, shotHandY, 9, 4.5, uniformFrontArm)
        : drawJointedLimb(10 + shoulderTurn * 0.5, -38, 9, 9, 4.5, armAngle,
          comboVisible ? comboPose.elbow : attacking ? 0.12 : locomotionElbow, uniformFrontArm, false, !bladeVisible);
      if (bladeVisible) {
        ctx.save();
        ctx.translate(frontHand.x, frontHand.y);
        ctx.rotate(bladeAngle);
        ctx.scale(0.86, 0.86);

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
  return Object.freeze({ createRenderer, captureLocomotion, updateMotion, resetMotion,
    strideRadiansPerPixel: STRIDE_RADIANS_PER_PIXEL, runSupportFraction: RUN_SUPPORT_FRACTION });
});
