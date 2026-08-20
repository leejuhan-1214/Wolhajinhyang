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
  version: 1, respawnStage: 2, respawnZone: 17, respawnCheckpointIndex: 17,
  difficulty: "cadet", defeatedEnemyIds: [], kills: 0,
})]]);

global.window = global;
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
if (diagnostics.version !== "3.4.1") throw new Error(`wrong version ${diagnostics.version}`);
if (!diagnostics.documentStoryAligned || diagnostics.documentStorySource !== "월하잔향.hwpx" || diagnostics.documentStoryDialogueLines !== 216 || diagnostics.proxyName !== "대역-13") {
  throw new Error("HWPX story alignment diagnostics missing");
}
const storyDialogueEntries = [...gameSource.matchAll(/\{\s*speaker:\s*"[^"]+",\s*text:\s*"[^"]+"/g)];
const requiredDocumentStoryLines = [
  "폭발까지 3분 12초. 기억 분리 장치를 열면 노동자 2,418명의 신경 기록을 피난선으로 보낼 수 있어.",
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
if (!gameSource.includes("enemy.pendingRetreatDelay = enemy.windup + 0.22") || !gameSource.includes("constrainBossToArenaVertical(enemy)") || !gameSource.includes('if (correction.axis === "x")')) {
  throw new Error("boss retreat or platform collision implementation missing");
}
if (/getZoneRemaining\(clearedZoneIndex\)[\s\S]{0,280}player\.hp\s*=/.test(gameSource)) {
  throw new Error("zone-clear healing is still present");
}
if (!diagnostics.checkpointSafetyPass) throw new Error("unsafe checkpoint placement detected");
if (!continueText.includes("03-13")) throw new Error(`legacy save resolved incorrectly: ${continueText}`);
if (!diagnostics.adminDirectCanvasTransform || !diagnostics.mobileAttackAimAssist || !diagnostics.revenantShieldArtillery) {
  throw new Error("v2.6.0 feature diagnostics missing");
}
if (!diagnostics.layeredRouteTransitions || diagnostics.layeredRouteZoneCount < 100 || diagnostics.routeProfileCount < 40) {
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
if (diagnostics.enemyHitInterruptsFire || diagnostics.bossRetreatEveryHits !== 2) {
  throw new Error("enemy fire must continue on hit while two-hit boss retreat remains enabled");
}
if (diagnostics.wardenPanelPassiveCooldowns.join(",") !== "8,6" || diagnostics.wardenPanelShotsPerUnit !== 5 || diagnostics.wardenPanelShotInterval !== 0.32 || diagnostics.wardenAttackRecoveryScale !== 0.78) {
  throw new Error(`warden frequency tuning invalid: ${diagnostics.wardenPanelPassiveCooldowns}/${diagnostics.wardenPanelShotsPerUnit}/${diagnostics.wardenAttackRecoveryScale}`);
}
if (diagnostics.playerGroundSeamStepHeight !== 44 || diagnostics.playerPlatformStepHeight !== 12 || !diagnostics.playerStepUpRequiresClearance) {
  throw new Error(`player step-up tuning invalid: ${diagnostics.playerGroundSeamStepHeight}/${diagnostics.playerPlatformStepHeight}`);
}
if (diagnostics.turretAimTelegraph || !diagnostics.turretCannonMuzzle || !diagnostics.turretShotsPiercePlatforms) {
  throw new Error("five-row turret presentation or wall-piercing rule invalid");
}
if (gameSource.includes('enemy.type === "turret" && Number.isFinite(enemy.targetX)') || !/kind:\s*"turret-row"[\s\S]{0,180}piercePlatforms:\s*true/.test(gameSource)) {
  throw new Error("five-row turret still exposes an aim line or lacks platform piercing");
}
if (diagnostics.mortarTurretCount < 1 || diagnostics.mortarTurretVolleyCount !== 3 || !diagnostics.mortarTurretTerrainCollision || !diagnostics.mortarTurretAdminSpawn) {
  throw new Error(`mortar turret invalid: ${diagnostics.mortarTurretCount}/${diagnostics.mortarTurretVolleyCount}`);
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
if (!diagnostics.burstTripleParryEnabled || diagnostics.burstTripleParryAct !== 3 || diagnostics.burstTripleParryProjectileCount !== 3) {
  throw new Error("act 3 triple-projectile burst parry is missing");
}
if (!diagnostics.flameSwordEnabled || diagnostics.flameSwordAct !== 4 || diagnostics.flameSwordBurnDamage !== 0.2 || !diagnostics.stageAbilityAnnouncements) {
  throw new Error("act 4 flame sword progression is missing");
}
if (diagnostics.gongmunSwordWaveOrientation !== "vertical-crescent") {
  throw new Error(`gongmun sword wave orientation invalid: ${diagnostics.gongmunSwordWaveOrientation}`);
}
document.getElementById("continue-button").click();
for (let frame = 0; frame < 12; frame += 1) {
  const callback = animationCallback;
  animationCallback = null;
  if (typeof callback === "function") callback(1000 + frame * 16.667);
}
const restored = window.__MOONLIT_ECHO_DIAGNOSTICS__();
if (restored.activeCheckpointKey !== "2:12") throw new Error(`continue loaded wrong checkpoint: ${restored.activeCheckpointKey}`);
const migrated = JSON.parse(storage.get("moonlit-echo-campaign-v1"));
if (migrated.version !== 2 || migrated.checkpointKey !== "2:12") throw new Error("legacy save was not migrated to checkpoint-key v2");
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
