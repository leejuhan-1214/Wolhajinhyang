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

const ctx = new Proxy({}, {
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
global.requestAnimationFrame = () => 1;
global.cancelAnimationFrame = () => {};

const gameSource = fs.readFileSync("game.js", "utf8");
vm.runInThisContext(gameSource, { filename: "game.js" });
const diagnostics = window.__MOONLIT_ECHO_DIAGNOSTICS__();
const continueText = document.getElementById("continue-button").textContent;
if (diagnostics.version !== "2.9.0") throw new Error(`wrong version ${diagnostics.version}`);
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
document.getElementById("continue-button").click();
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
}));
