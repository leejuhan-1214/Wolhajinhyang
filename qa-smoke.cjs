const fs = require("node:fs");
const vm = require("node:vm");

const elements = new Map();
const classList = () => ({ add() {}, remove() {}, toggle() {}, contains() { return false; } });
function element(id = "") {
  const attributes = new Map();
  const listeners = new Map();
  return {
    id, hidden: false, disabled: false, value: "", textContent: "", innerHTML: "", dataset: {},
    style: { setProperty() {}, removeProperty() {} },
    classList: classList(), children: [],
    addEventListener(type, handler) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(handler); },
    removeEventListener() {},
    click() { for (const handler of listeners.get("click") || []) handler({ currentTarget: this, preventDefault() {}, stopPropagation() {} }); },
    setPointerCapture() {}, releasePointerCapture() {},
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    querySelector() { return null; }, querySelectorAll() { return []; }, matches() { return false; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
  };
}

const ctx = new Proxy({
  createLinearGradient() { return { addColorStop() {} }; },
  createRadialGradient() { return { addColorStop() {} }; },
  measureText(value) { return { width: String(value || "").length * 10 }; },
}, {
  get(target, property) {
    if (property in target) return target[property];
    return (...args) => undefined;
  },
  set(target, property, value) { target[property] = value; return true; },
});
const canvas = element("game");
canvas.width = 1280; canvas.height = 720; canvas.getContext = () => ctx;
elements.set("game", canvas);

const difficultyNames = { chick: "병아리", cadet: "신참내기", darkhorse: "다크호스", weapon: "인간흉기" };
const difficultyButtons = Object.entries(difficultyNames).map(([key, label]) => {
  const button = element(); button.dataset.difficulty = key; button.textContent = label; return button;
});
const storage = new Map([["moonlit-echo-campaign-v1", JSON.stringify({
  version: 2, zonesPerStage: 24, checkpointKey: "2:12", respawnStage: 2, respawnZone: 60, respawnCheckpointIndex: 60,
  difficulty: "cadet", defeatedEnemyIds: [], kills: 0,
})], ["moonlit-echo-admin-removed-enemies-v1", JSON.stringify([
  "admin-spawn:qa-persist:1:0:runner",
])], ["moonlit-echo-admin-spawned-enemies-v1", JSON.stringify([{
  id: "admin-spawn:qa-persist:1:0:runner", type: "runner", x: 4800, y: 620,
  stageIndex: 0, homeZoneIndex: 1, range: 220,
}])]]);

global.window = global;
window.__MOONLIT_ECHO_DISABLE_LIVE_SYNC__ = true;
global.localStorage = {
  getItem(key) { return storage.get(key) || null; }, setItem(key, value) { storage.set(key, String(value)); }, removeItem(key) { storage.delete(key); },
};
window.localStorage = global.localStorage;
window.addEventListener = () => {};
window.matchMedia = () => ({ matches: false, addEventListener() {} });
window.visualViewport = null;
window.location = { href: "http://127.0.0.1:4173/" };
Object.defineProperty(global, "navigator", { value: { maxTouchPoints: 0, vibrate() {} }, configurable: true });
global.document = {
  documentElement: Object.assign(element("html"), { dataset: {} }),
  getElementById(id) { if (!elements.has(id)) elements.set(id, element(id)); return elements.get(id); },
  querySelector(selector) { return null; },
  querySelectorAll(selector) { return selector === "[data-difficulty]" ? difficultyButtons : []; },
  createDocumentFragment() { return element("fragment"); },
  createElement() { return element(); },
  addEventListener() {}, fullscreenElement: null, fullscreenEnabled: false,
};
let animationCallback = null;
global.requestAnimationFrame = (callback) => { animationCallback = callback; return 1; };
global.cancelAnimationFrame = () => {};

const gameSource = fs.readFileSync("game.js", "utf8");
vm.runInThisContext(gameSource, { filename: "game.js" });
const diagnostics = window.__MOONLIT_ECHO_DIAGNOSTICS__();
const continueText = document.getElementById("continue-button").textContent;
if (diagnostics.version !== "3.6.21") throw new Error(`wrong version ${diagnostics.version}`);
if (diagnostics.stages !== 5 || diagnostics.zones !== 80 || diagnostics.zonesPerStage !== 16 || diagnostics.midBossZone !== 8 || diagnostics.finalBossZone !== 16 || diagnostics.midBossArenaCount !== 5 || diagnostics.finalBossArenaCount !== 5) {
  throw new Error(`campaign zone structure invalid: ${diagnostics.stages}/${diagnostics.zones}/${diagnostics.zonesPerStage}/${diagnostics.midBossZone}/${diagnostics.finalBossZone}/${diagnostics.midBossArenaCount}/${diagnostics.finalBossArenaCount}`);
}
if (!diagnostics.documentStoryAligned || diagnostics.documentStorySource !== "월하잔향 (1).hwpx" || diagnostics.documentStoryDialogueLines !== 216 || diagnostics.proxyName !== "대역-13") {
  throw new Error("HWPX story alignment diagnostics missing");
}
if (!diagnostics.musicDirectorEnabled || diagnostics.musicTrackCount !== 12 || diagnostics.titleMusicTrack !== 12 || diagnostics.musicCrossfadeSeconds !== 1.15 || !diagnostics.musicLazyLoad || !diagnostics.musicGestureUnlock) {
  throw new Error("dynamic music director configuration invalid");
}
if (diagnostics.stageMusicRotations.length !== 5 || diagnostics.stageMusicRotations.some((rotation) => rotation.length !== 4) || Object.keys(diagnostics.bossMusicTracks).length !== 10) {
  throw new Error("stage or boss music assignment is incomplete");
}
if (!diagnostics.layeredJumpSfx || !diagnostics.layeredShotgunSfx || !diagnostics.landingImpactSfx || !gameSource.includes('sound.jump("wall")') || !gameSource.includes('sound.jump("double")')) {
  throw new Error("player movement or shotgun sound redesign missing");
}
if (!diagnostics.pauseVolumeControls || !diagnostics.persistedAudioSettings || !diagnostics.separateMasterMusicSfxVolumes) {
  throw new Error("pause volume controls or persistent audio settings missing");
}
if (diagnostics.audioPresetVersion !== "3.6.7-bgm+recorded-sfx" || !diagnostics.proceduralShotgunSfx || !diagnostics.proceduralJumpSfx || !diagnostics.proceduralLandingSfx || !diagnostics.proceduralEnemyGunSfx) {
  throw new Error("hybrid v3.6.7 BGM audio preset is incomplete");
}
if (!diagnostics.recordedShotgunSfx || !diagnostics.recordedShotgunPumpSfx || !diagnostics.recordedEnemyPistolSfx || !diagnostics.recordedEnemyRifleSfx || !diagnostics.recordedJumpSfx || !diagnostics.bossCannonSfx || !diagnostics.bossCannonForBallisticShots || diagnostics.bossCannonOverlapGuardMs !== 150 || diagnostics.recordedFootstepSfxCount !== 6 || !diagnostics.speedAdaptiveFootsteps || !diagnostics.normalizedFootstepSamples || !diagnostics.recordedGunVolumeBoost || !diagnostics.recordedFootstepVolumeBoost || !diagnostics.recordedJumpVolumeBoost) {
  throw new Error("recorded gun, footstep, or jump SFX are inactive");
}
if (!diagnostics.adminNearestSelectionAutoHidesCatalog || !diagnostics.adminCanvasOnlyDirectTransform || !diagnostics.adminCanvasEditReopensWithX || !diagnostics.adminDeleteKeyEnabled || !diagnostics.adminDeleteKeySafeInInputs || diagnostics.screenShakeScale !== 0.18 || diagnostics.screenShakeMaxAmplitude !== 6 || !diagnostics.screenShakeDisabledInAdminMode) {
  throw new Error("admin canvas editing visibility or reduced screen shake configuration is invalid");
}
if (!diagnostics.bossArenaLocksPlayerBothSides || !diagnostics.bossArenaLocksDuringIntro || !diagnostics.bossArenaUnlocksOnDefeat || !diagnostics.bossArenaLockUsesVisibleLimits || !gameSource.includes("constrainPlayerToActiveBossArena();")) {
  throw new Error("boss arena player containment is incomplete");
}
if (!diagnostics.bossArenaWideEngagementRange || !diagnostics.bossCornerRetreatRecovery || diagnostics.bossCornerIdleRecoverySeconds !== 1.4 || !diagnostics.bossTransientActionRelease || !gameSource.includes("distance < bossEngagementRange")) {
  throw new Error("boss corner attack recovery is incomplete");
}
if (diagnostics.musicBaseVolumeReduced || !diagnostics.musicBaseVolumeRestored || diagnostics.stageMusicBaseVolume !== 0.28 || diagnostics.bossMusicBaseVolume !== 0.4 || diagnostics.titleMusicBaseVolume !== 0.32 || diagnostics.storyMusicBaseVolume !== 0.19 || diagnostics.defaultMasterUserVolume !== 1 || diagnostics.defaultMusicUserVolume !== 1 || diagnostics.defaultSfxUserVolume !== 1 || diagnostics.audioSettingsRevision !== 5 || diagnostics.oldDefaultMusicAutoMigrated || !diagnostics.audioPresetAutoMigrated || !diagnostics.musicGestureCaptureUnlock || !diagnostics.musicPlaybackRetry || !diagnostics.musicVolumeRecoveryMigration) {
  throw new Error("initial music volume restoration configuration invalid");
}
const recordedSfxFiles = [
  "sfx-shotgun.wav", "sfx-shotgun-cock.wav", "sfx-pistol.wav", "sfx-rifle.wav", "sfx-jump.wav",
  ...Array.from({ length: 6 }, (_, index) => `sfx-footstep-${String(index + 1).padStart(2, "0")}.wav`),
];
if (recordedSfxFiles.some((file) => !fs.existsSync(file)) || !fs.existsSync("sfx-boss-cannon.ogg") || !fs.existsSync("THIRD_PARTY_ASSETS.md")) {
  throw new Error("recorded SFX files or third-party asset manifest missing");
}
const storyDialogueEntries = [...gameSource.matchAll(/\{\s*speaker:\s*"[^"]+",\s*text:\s*"[^"]+"/g)];
const requiredDocumentStoryLines = [
  "폭발까지 3분 12초. 기억 분리 장치를 열면 노동자 2,401명의 신경 기록을 피난선으로 보낼 수 있어.",
  "새봄이한테 언니가 도망친 게 아니라고 전해 줘. 그리고 여기 있던 사람들을 숫자로만 남기지 마.",
  "대역-13의 계산에서 내가 우세하다. 나는 사고 이후의 죄책감이 없고 중앙국 명령에 저항한 전력도 없다.",
  "대역-13을 멈추고 배합 전 원자료를 복구한다. 누구의 얼굴도 나오지 않는 실험 보고서가 마지막 증언이 되게 두지 않겠다.",
];
if (storyDialogueEntries.length !== 216 || requiredDocumentStoryLines.some((line) => !gameSource.includes(line))) {
  throw new Error(`HWPX story text mismatch: ${storyDialogueEntries.length}/216`);
}
if (diagnostics.normalEnemyRepairDropChance !== 0 || diagnostics.zoneClearHealEnabled || diagnostics.bossRewardsEnabled || diagnostics.midBossHealReward) {
  throw new Error("enemy defeat healing rewards must remain disabled");
}
if (!diagnostics.bossRetreatPreservesAttack || !diagnostics.bossPlatformAxisSeparation || !diagnostics.bossArenaVerticalGuard || diagnostics.bossHardTeleportContainment) {
  throw new Error("boss movement recovery can still interrupt attacks or hard-teleport");
}
if (diagnostics.bossArenaEdgeInset !== 64 || !diagnostics.bossMovementUsesFullArena || !diagnostics.bossFullArenaPursuit || !diagnostics.bossVisibleArenaLimits || !diagnostics.bossUsesStrictHomeArenaBounds || !diagnostics.bossBoundaryHopDisabled || !diagnostics.bossThinPlatformPassThrough) {
  throw new Error("boss arena still contains invisible movement blockers");
}
if (diagnostics.bossPatternDirector !== "adaptive-no-repeat" || !diagnostics.bossPhaseTwoFollowupCombos || diagnostics.bossPatternOrderCount !== 10 || diagnostics.weaverPatternVariants !== 5 || diagnostics.echoPatternVariants !== 9) {
  throw new Error("expanded boss pattern director is missing");
}
if (diagnostics.bossCrisisPatternThreshold !== 0.35 || diagnostics.bossCrisisPatternCount !== 10 || !diagnostics.bossCrisisPatternTelegraph || diagnostics.bossCrisisCooldownRange.join(",") !== "5.68,6.8") {
  throw new Error("boss crisis pattern configuration invalid");
}
if (!diagnostics.bossIntroCombatGate || !diagnostics.bossIntroWaitsForDialogue || !diagnostics.bossDormantDamageLock || diagnostics.bossIntroCutsceneCount !== 10 || !diagnostics.cutsceneCompletionSavedAtEnd) {
  throw new Error("boss intro dialogue gate configuration invalid");
}
if (!diagnostics.bossHudVisibleFromZoneEntry || !diagnostics.bossHudPersistsAcrossArena || !gameSource.includes("enemy.homeZoneIndex === game.zone")) {
  throw new Error("boss HUD is not tied to the full boss zone");
}
const bossIntroIds = ["cutscene-midboss-1", "cutscene-midboss-2", "cutscene-midboss-3", "cutscene-midboss-4", "cutscene-midboss-5", "cutscene-warden", "cutscene-crimson", "cutscene-weaver", "cutscene-censor", "cutscene-echo"];
if (!gameSource.includes("function holdBossUntilIntroEnds(enemy, dt, dx)") || bossIntroIds.some((id) => !gameSource.includes(id))) {
  throw new Error("one or more boss intro gates are missing");
}
if (/function startCutscene\(event\)[\s\S]{0,180}cutsceneSeen\.add\(event\.id\)/.test(gameSource) || !gameSource.includes("game.cutsceneSeen.add(finishedScene.id)")) {
  throw new Error("cutscenes are still marked complete before the final line");
}
const crisisPatterns = ["breaker-siege", "hunter-deadlock", "oracle-verdict", "revenant-overdrive", "proxy-quarantine", "warden-redline", "furnace-crimson-storm", "weaver-grand-ritual", "censor-blackout", "echo-mirror-assault"];
if (!gameSource.includes("function startBossCrisisPattern(enemy, dx)") || crisisPatterns.some((pattern) => !gameSource.includes(pattern))) {
  throw new Error("one or more boss crisis patterns are missing");
}
if (!diagnostics.bossVisualDetailPass || diagnostics.detailedBossVisualCount !== 10 || !diagnostics.weaverLayeredMaskDesign || !diagnostics.oracleSixWitnessMaskDesign || !diagnostics.proxyMutationVisualState) {
  throw new Error("boss visual detail regression");
}
if (gameSource.includes("Math.max(homeArena.left, enemy.originX - 920)") || gameSource.includes("Math.min(homeArena.right, enemy.originX + 820)")) {
  throw new Error("legacy origin-centered invisible boss walls remain");
}
if (!gameSource.includes("bossIgnoresArenaPlatform(enemy, platform)") || !gameSource.includes("selectBossPatternPhase(enemy, phaseCount, hpRatio, distance)") || !gameSource.includes("queueBossPatternFollowup(enemy, releasedPattern)")) {
  throw new Error("boss movement or pattern implementation missing");
}
if (!gameSource.includes('if (enemy.type === "boss") return getBossArenaBounds(enemy);') || !gameSource.includes("blocked && !blockedByArena")) {
  throw new Error("strict boss home-arena containment missing");
}
if (!gameSource.includes("enemy.pendingRetreatDelay = enemy.windup + 0.22") || !gameSource.includes("constrainBossToArenaVertical(enemy)") || !gameSource.includes('if (correction.axis === "x")')) {
  throw new Error("boss retreat or platform collision implementation missing");
}
if (/getZoneRemaining\(clearedZoneIndex\)[\s\S]{0,280}player\.hp\s*=/.test(gameSource)) {
  throw new Error("zone-clear healing is still present");
}
if (!diagnostics.checkpointSafetyPass) throw new Error("unsafe checkpoint placement detected");
if (!continueText.includes("03-09")) throw new Error(`24-zone save resolved incorrectly: ${continueText}`);
if (!diagnostics.adminDirectCanvasTransform || !diagnostics.mobileAttackAimAssist || !diagnostics.revenantShieldArtillery) {
  throw new Error("v2.6.0 feature diagnostics missing");
}
if (!diagnostics.adminDeletionTombstonesPersisted || !diagnostics.adminDeletionCoversSpawnedEnemies || !diagnostics.adminDeletionReloadGuard || !diagnostics.adminDeletionRestartGuard) {
  throw new Error("administrator enemy deletion persistence guards missing");
}
if (diagnostics.adminPortableProfileVersion !== 1 || !diagnostics.adminPortableProfileExport || !diagnostics.adminPortableProfileImport || !diagnostics.adminPortableProfileShareLink || !diagnostics.adminPortableProfileIncludesStartScreen) {
  throw new Error("cross-device administrator edit transfer is missing");
}
if (!diagnostics.publishedAdminProfileSupported || diagnostics.publishedAdminProfileFile !== "published-admin-profile.json" || !diagnostics.publishedAdminProfileRevisionKey) {
  throw new Error("public administrator world profile support is missing");
}
if (!diagnostics.liveWorldSyncEnabled || diagnostics.liveWorldApiBase !== "https://wolhajinhyang-live-world.magic-shark-7297.chatgpt.site" || diagnostics.liveWorldPollMs !== 2000 || !diagnostics.liveWorldRealtimeEnemyDelete || !diagnostics.liveWorldRealtimeEnemySpawn || !diagnostics.liveWorldPublicRead || diagnostics.liveWorldRequiresManualConnection || diagnostics.liveWorldRequiresShareLink || !diagnostics.liveWorldDeletionIsMonotonic) {
  throw new Error("real-time shared administrator world sync is missing");
}
if (diagnostics.adminRemovedEnemyCount !== 1 || diagnostics.adminRemovedEnemyAliveCount !== 0 || diagnostics.adminSpawnedEnemyRecordCount !== 0) {
  throw new Error(`administrator deletion tombstone failed: ${diagnostics.adminRemovedEnemyCount}/${diagnostics.adminRemovedEnemyAliveCount}/${diagnostics.adminSpawnedEnemyRecordCount}`);
}
const persistedAdminSpawns = JSON.parse(storage.get("moonlit-echo-admin-spawned-enemies-v1") || "[]");
if (persistedAdminSpawns.length !== 0) throw new Error("deleted administrator-spawned enemy was restored");
if (!diagnostics.layeredRouteTransitions || diagnostics.layeredRouteZoneCount < 65 || diagnostics.routeProfileCount < 30) {
  throw new Error(`layered route generation missing: ${diagnostics.layeredRouteZoneCount}/${diagnostics.routeProfileCount}`);
}
if (diagnostics.machinegunBurstRounds !== 4 || diagnostics.machinegunCount < 1) {
  throw new Error(`machinegun sentry invalid: ${diagnostics.machinegunBurstRounds}/${diagnostics.machinegunCount}`);
}
if (!diagnostics.slashBulletDestroy || diagnostics.burstOnlyRegularBulletRemoval || diagnostics.slashAffectsBullets !== "all-deflectable-projectiles") {
  throw new Error("sword projectile clearing was not restored");
}
if (diagnostics.verticalTraversalLayerRange[0] !== 1 || diagnostics.verticalTraversalLayerRange[1] !== 4) {
  throw new Error(`vertical traversal progression invalid: ${diagnostics.verticalTraversalLayerRange}`);
}
if (diagnostics.turretCount < 1 || diagnostics.turretBaseHp !== 9 || diagnostics.turretShieldHpRatio !== 1.5 || diagnostics.turretVolleyCount !== 5) {
  throw new Error(`turret configuration invalid: ${diagnostics.turretCount}/${diagnostics.turretBaseHp}/${diagnostics.turretVolleyCount}`);
}
if (diagnostics.runnerDashPathTelegraph || diagnostics.playerBurstCooldown !== 1.8 || diagnostics.manualRespawnKeyEnabled) {
  throw new Error("runner telegraph, burst cooldown, or R-key restart configuration invalid");
}
if (!diagnostics.gongmunSwordMotion || !diagnostics.gongmunSwordWaves || !diagnostics.censorPhaseTwoFullArenaSnow) {
  throw new Error("boss v2.8.0 combat changes missing");
}
if (!diagnostics.doctorFlaskSlashClear || !diagnostics.doctorPoisonGasSlashClear || diagnostics.mutantDebrisSlashClear || diagnostics.proxyMutationHealRatio !== 0.25) {
  throw new Error("doctor hazard and mutation rules invalid");
}
if (!diagnostics.enemyHitInterruptsFire || diagnostics.normalEnemyHitStunSeconds !== 0.24 || diagnostics.bossHitStunSeconds !== 0.13 || !diagnostics.bossHitPausesAttack || diagnostics.bossRetreatEveryHits !== 2) {
  throw new Error("enemy hit-stun or two-hit boss retreat configuration invalid");
}
if (!gameSource.includes("function applyEnemyHitStun(enemy, duration)") || !gameSource.includes("if (enemy.hitStun > 0)")) {
  throw new Error("enemy hit-stun implementation missing");
}
if (diagnostics.wardenPanelPassiveCooldowns.join(",") !== "8,6" || diagnostics.wardenPanelShotsPerUnit !== 5 || diagnostics.wardenPanelShotInterval !== 0.32 || diagnostics.wardenAttackRecoveryScale !== 0.78) {
  throw new Error(`warden frequency tuning invalid: ${diagnostics.wardenPanelPassiveCooldowns}/${diagnostics.wardenPanelShotsPerUnit}/${diagnostics.wardenAttackRecoveryScale}`);
}
if (diagnostics.playerGroundSeamStepHeight !== 44 || diagnostics.playerPlatformStepHeight !== 12 || !diagnostics.playerStepUpRequiresClearance) {
  throw new Error(`player step-up tuning invalid: ${diagnostics.playerGroundSeamStepHeight}/${diagnostics.playerPlatformStepHeight}`);
}
if (diagnostics.turretAimTelegraph || !diagnostics.turretCannonMuzzle || !diagnostics.turretShotsPiercePlatforms || diagnostics.turretRowProjectileSpeed !== 365 || !diagnostics.turretRowCircularFlight || diagnostics.turretRowOrbitRadius !== 7 || diagnostics.turretRowOrbitAngularSpeed !== 8.5) {
  throw new Error("five-row turret presentation or wall-piercing rule invalid");
}
if (gameSource.includes('enemy.type === "turret" && Number.isFinite(enemy.targetX)') || !/kind:\s*"turret-row"[\s\S]{0,180}piercePlatforms:\s*true/.test(gameSource)) {
  throw new Error("five-row turret still exposes an aim line or lacks platform piercing");
}
if (diagnostics.mortarTurretCount < 1 || diagnostics.mortarTurretVolleyCount !== 3 || !diagnostics.mortarTurretTerrainCollision || diagnostics.mortarTurretShotsPierceWalls || !diagnostics.allMortarsTerrainCollision || !diagnostics.mortarTurretAdminSpawn) {
  throw new Error(`mortar turret invalid: ${diagnostics.mortarTurretCount}/${diagnostics.mortarTurretVolleyCount}`);
}
if (!/fireMortar\(enemy, centerTargetX \+ targetOffset, enemy\.targetY, true, true\)/.test(gameSource) || !gameSource.includes("lockedMortarInFlight && !bullet.terrainCollision") || !gameSource.includes("terrainCollision = true")) {
  throw new Error("triple mortar shells can still pass through terrain");
}
if (!diagnostics.enemyHomeZoneNormalization || diagnostics.enemiesOutsideHomeZone !== 0 || diagnostics.enemyZoneAuditIntervalSeconds !== 0.45) {
  throw new Error(`enemy zone containment invalid: ${diagnostics.enemiesOutsideHomeZone}`);
}
if (!diagnostics.mortarExactMarkedImpact || !diagnostics.mortarBallisticTargetLock || !/lockedImpactX:[\s\S]{0,180}impactTimer:/.test(gameSource)) {
  throw new Error("mortar marked-position targeting is missing");
}
if (!diagnostics.turretPrefireLocalCharge || diagnostics.turretChargeSeconds !== 0.82 || diagnostics.turretChargeDisplay !== "muzzle-convergence") {
  throw new Error(`turret prefire charge invalid: ${diagnostics.turretChargeSeconds}`);
}
if (!diagnostics.playerFrameBasedAnimation || diagnostics.playerRunPoseCount !== 12 || diagnostics.playerAttackKeyPoseCount !== 3 || !diagnostics.playerSecondaryMotion || !diagnostics.enemyFrameBasedGait || !diagnostics.pixelSnappedJoints) {
  throw new Error("frame-based pixel character animation diagnostics missing");
}
if (!diagnostics.playerOriginalBlackDesignRestored || !diagnostics.playerStaticUniformCoat || !diagnostics.playerWhiteUniformCoat || diagnostics.playerUniformCoatFlutter) {
  throw new Error("original black player design or static uniform coat is missing");
}
if (diagnostics.poseInterpolation !== "eased-pixel-snapped" || !diagnostics.weaponsAttachedToHands || !diagnostics.swordFullBodyAnimation || !diagnostics.shotgunBodyRecoilAnimation || !diagnostics.detailedShotgunDesign) {
  throw new Error("smooth combat pose or detailed weapon rendering missing");
}
if (!diagnostics.dynamicSwordFullBodyMotion || !diagnostics.dynamicShotgunFollowThrough || diagnostics.shotgunPoseSeconds !== 0.3) {
  throw new Error("dynamic sword or shotgun follow-through is missing");
}
if (!diagnostics.characterArchiveRenderer || diagnostics.characterArchivePages !== 5 || !diagnostics.characterArchiveUsesLiveRenderers) {
  throw new Error("live character archive renderer is missing");
}
if (!diagnostics.runnerSweptRushHitbox || diagnostics.runnerRushLeadingReach !== 16 || diagnostics.bossBurstParryEnabled) {
  throw new Error("runner rush symmetry or boss parry restriction missing");
}
if (!diagnostics.echoParryEnabled || diagnostics.echoParryWindowSeconds !== 0.32 || !diagnostics.echoParryReflectsShotgun || !diagnostics.echoReactiveShotgunParry || diagnostics.echoShotgunParryTrigger !== "hit-confirmed-any-action" || !diagnostics.echoShotgunParryCancelsPiercingPellets || diagnostics.echoReactiveShotgunParryCooldown !== 1.1 || diagnostics.echoParryReturnProjectiles !== 5 || diagnostics.echoParryRiposteDamage !== 1 || diagnostics.mutantDebrisDamage !== 1) {
  throw new Error("echo parry or mutant debris damage tuning is missing");
}
if (diagnostics.echoHp !== 66 || diagnostics.echoSpeedFactor !== 1.3 || diagnostics.echoAttackRecoveryFactor !== 0.78 || diagnostics.echoShotgunPelletCount !== 9 || diagnostics.echoSkillMultiplier !== 4 || !gameSource.includes('triggerEchoParry(enemy, "shotgun", { force: true })') || !gameSource.includes("bullet.cancelled || !bullet.piercing")) {
  throw new Error("strengthened echo combat tuning is missing");
}
if (diagnostics.echoNewPatternCount !== 3 || diagnostics.echoNewPatterns.join(",") !== "echo-triple-burst,echo-dive-barrage,echo-afterimage-crossfire" || diagnostics.echoChainBurstCount !== 3 || diagnostics.echoDiveVolleyCount !== 3 || diagnostics.echoAfterimageSourceCount !== 3) {
  throw new Error("three new Echo patterns are missing");
}
if (!diagnostics.burstTripleParryEnabled || diagnostics.burstTripleParryAct !== 3 || diagnostics.burstTripleParryProjectileCount !== 3) {
  throw new Error("act 3 triple-projectile burst parry is missing");
}
if (!diagnostics.flameSwordEnabled || diagnostics.flameSwordAct !== 4 || diagnostics.flameSwordBurnDamage !== 0.3 || !diagnostics.stageAbilityAnnouncements) {
  throw new Error("act 4 flame sword progression is missing");
}
if (diagnostics.gongmunSwordWaveOrientation !== "velocity-perpendicular-crescent") {
  throw new Error(`gongmun sword wave orientation invalid: ${diagnostics.gongmunSwordWaveOrientation}`);
}
if (!diagnostics.revenantMeleeCombo || diagnostics.revenantThrustBarrageHits !== 6 || diagnostics.revenantThrustBarragePhaseTwoHits !== 7 || !gameSource.includes("beginRevenantThrustBarrage") || !gameSource.includes("revenantThrustWindup")) {
  throw new Error("gongmun thrust barrage pattern is missing");
}
if (diagnostics.tutorialSteps !== 7 || !diagnostics.tutorialSkills.includes("deflect") || !diagnostics.tutorialProjectileDeflectDrill || !diagnostics.tutorialTrainingRoundsHarmless) {
  throw new Error("projectile deflection tutorial drill is missing");
}
document.getElementById("continue-button").click();
for (let frame = 0; frame < 12; frame += 1) {
  const callback = animationCallback;
  animationCallback = null;
  if (typeof callback === "function") callback(1000 + frame * 16.667);
}
const restored = window.__MOONLIT_ECHO_DIAGNOSTICS__();
if (restored.activeCheckpointKey !== "2:8") throw new Error(`continue loaded wrong checkpoint: ${restored.activeCheckpointKey}`);
const migrated = JSON.parse(storage.get("moonlit-echo-campaign-v1"));
if (migrated.version !== 2 || migrated.zonesPerStage !== 16 || migrated.checkpointKey !== "2:8") throw new Error("24-zone save was not migrated to the 16-zone campaign");
console.log(JSON.stringify({
  version: diagnostics.version,
  checkpointSafetyPass: diagnostics.checkpointSafetyPass,
  continueText,
  activeCheckpointKey: restored.activeCheckpointKey,
  migratedSaveVersion: migrated.version,
  routeProfileCount: diagnostics.routeProfileCount,
  layeredRouteZoneCount: diagnostics.layeredRouteZoneCount,
  routeTransitionRange: diagnostics.routeTransitionRange,
  machinegunCount: diagnostics.machinegunCount,
  turretCount: diagnostics.turretCount,
  verticalTraversalLayerRange: diagnostics.verticalTraversalLayerRange,
  playerBurstCooldown: diagnostics.playerBurstCooldown,
  manualRespawnKeyEnabled: diagnostics.manualRespawnKeyEnabled,
  slashAffectsBullets: diagnostics.slashAffectsBullets,
  wardenPanelCooldowns: diagnostics.wardenPanelPassiveCooldowns,
  wardenPanelShotsPerUnit: diagnostics.wardenPanelShotsPerUnit,
  wardenAttackRecoveryScale: diagnostics.wardenAttackRecoveryScale,
  playerGroundSeamStepHeight: diagnostics.playerGroundSeamStepHeight,
  turretShotsPiercePlatforms: diagnostics.turretShotsPiercePlatforms,
  mortarTurretCount: diagnostics.mortarTurretCount,
  mortarTurretVolleyCount: diagnostics.mortarTurretVolleyCount,
  enemiesOutsideHomeZone: diagnostics.enemiesOutsideHomeZone,
  mortarExactMarkedImpact: diagnostics.mortarExactMarkedImpact,
  turretChargeSeconds: diagnostics.turretChargeSeconds,
  burstTripleParryAct: diagnostics.burstTripleParryAct,
  flameSwordAct: diagnostics.flameSwordAct,
  gongmunSwordWaveOrientation: diagnostics.gongmunSwordWaveOrientation,
}));
