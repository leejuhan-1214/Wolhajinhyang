(() => {
  "use strict";

  if (window.__MOONLIT_ECHO_RUNTIME_ACTIVE__) return;
  window.__MOONLIT_ECHO_RUNTIME_ACTIVE__ = true;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const startScreen = document.getElementById("start-screen");
  const pauseScreen = document.getElementById("pause-screen");
  const endScreen = document.getElementById("end-screen");
  const startButton = document.getElementById("start-button");
  const continueButton = document.getElementById("continue-button");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const resumeButton = document.getElementById("resume-button");
  const restartButton = document.getElementById("restart-button");
  const resultText = document.getElementById("result-text");
  const adminStatus = document.getElementById("admin-status");
  const startTitle = document.getElementById("start-title");
  const startScreenEditToggle = document.getElementById("start-screen-edit-toggle");
  const startScreenEditor = document.getElementById("start-screen-editor");
  const startScreenEditorClose = document.getElementById("start-screen-editor-close");
  const startScreenEditSave = document.getElementById("start-screen-edit-save");
  const startScreenEditReset = document.getElementById("start-screen-edit-reset");
  const startScreenEditInputs = {
    title: document.getElementById("start-edit-title"),
    button: document.getElementById("start-edit-button"),
    continueButton: document.getElementById("start-edit-continue-button"),
    difficultyChick: document.getElementById("start-edit-difficulty-chick"),
    difficultyCadet: document.getElementById("start-edit-difficulty-cadet"),
    difficultyDarkhorse: document.getElementById("start-edit-difficulty-darkhorse"),
    difficultyWeapon: document.getElementById("start-edit-difficulty-weapon"),
  };
  const adminSpawnPanel = document.getElementById("admin-spawn-panel");
  const adminSpawnClose = document.getElementById("admin-spawn-close");
  const adminZonePanel = document.getElementById("admin-zone-panel");
  const adminZoneClose = document.getElementById("admin-zone-close");
  const adminZoneGrid = document.getElementById("admin-zone-grid");
  const tutorialPanel = document.getElementById("tutorial-panel");
  const tutorialClose = document.getElementById("tutorial-close");
  const adminWorldEditor = document.getElementById("admin-world-editor");
  const adminWorldEditNearest = document.getElementById("admin-world-edit-nearest");
  const adminWorldEditorClose = document.getElementById("admin-world-editor-close");
  const adminWorldSave = document.getElementById("admin-world-save");
  const adminWorldDelete = document.getElementById("admin-world-delete");
  const adminWorldReset = document.getElementById("admin-world-reset");
  const adminWorldUndo = document.getElementById("admin-world-undo");
  const adminWorldSelected = document.getElementById("admin-world-selected");
  const adminWorldTransformStatus = document.getElementById("admin-world-transform-status");
  const adminWorldInputs = {
    kind: document.getElementById("admin-world-kind"),
    text: document.getElementById("admin-world-text"),
    sub: document.getElementById("admin-world-sub"),
  };
  const touchControls = document.getElementById("touch-controls");
  const touchControlButtons = [...(document.querySelectorAll?.("[data-touch-key], [data-touch-action]") || [])];
  const touchJoystick = document.querySelector?.("[data-touch-action='move']") || null;
  const touchJoystickKnob = touchJoystick?.querySelector?.(".touch-joystick-knob") || null;
  const touchFullscreenButton = document.querySelector?.("[data-touch-action='fullscreen']") || null;
  const difficultyButtons = [...(document.querySelectorAll?.("[data-difficulty]") || [])];
  const adminSpawnButtons = [...(document.querySelectorAll?.("[data-admin-spawn]") || [])];
  const adminWorldCreateButtons = [...(document.querySelectorAll?.("[data-admin-world-create]") || [])];

  const W = 1280;
  const H = 720;
  const ZONE_W = 4000;
  const ZONES_PER_STAGE = 24;
  const MID_BOSS_ZONE_INDEX = 11;
  const BOSS_ZONE_INDEX = ZONES_PER_STAGE - 1;
  const STAGE_COUNT = 5;
  const TOTAL_ZONE_COUNT = ZONES_PER_STAGE * STAGE_COUNT;
  const ZONE_WIDTH_STEP = 8;
  const ZONE_WIDTHS = Array.from({ length: TOTAL_ZONE_COUNT }, (_, index) => ZONE_W + index * ZONE_WIDTH_STEP);
  const ZONE_STARTS = [0];
  for (const width of ZONE_WIDTHS) ZONE_STARTS.push(ZONE_STARTS[ZONE_STARTS.length - 1] + width);
  const WORLD_W = ZONE_STARTS[TOTAL_ZONE_COUNT];
  const WORLD_H = 1450;
  const GRAVITY = 2050;
  const TAU = Math.PI * 2;
  const TARGET_CAMPAIGN_MINUTES = 2440;
  const SCREEN_SHAKE_SCALE = 0.42;
  const INPUT_TUNING = Object.freeze({
    moveSpeed: 445,
    groundAcceleration: 3600,
    groundFriction: 3300,
    airFriction: 650,
    airControl: 0.88,
    attackControl: 0.62,
    jumpBuffer: 0.16,
    coyoteTime: 0.14,
    joystickDeadzone: 0.08,
  });
  const EMPOWERED_SLASH_BONUS = 0.5;
  const CHARGED_SLASH_BONUS = 0.5;
  const SHOTGUN_DAMAGE = 1.15;
  const SHOTGUN_PELLET_LIFE = 0.3;
  const OVERCHARGED_SHOTGUN_DAMAGE = 2.2;
  const OVERCHARGED_SHOTGUN_PELLET_LIFE = 0.4;
  const OVERCHARGED_SHOTGUN_PELLETS = 7;
  const SHIELD_GUARD_HITS = 2;
  const SHIELD_BASE_HP = 6;
  const TURRET_BASE_HP = Math.ceil(SHIELD_BASE_HP * 1.5);
  const MORTAR_TURRET_BASE_HP = TURRET_BASE_HP + 2;
  const MORTAR_TURRET_VOLLEY_COUNT = 3;
  const TURRET_CHARGE_SECONDS = 0.82;
  const ACT_THREE_INDEX = 2;
  const ACT_FOUR_INDEX = 3;
  const BURST_PARRY_PROJECTILE_COUNT = 3;
  const FLAME_SWORD_BURN_SECONDS = 2.4;
  const FLAME_SWORD_BURN_INTERVAL = 0.48;
  const FLAME_SWORD_BURN_DAMAGE = 0.2;
  const SHIELD_BREAK_SECONDS = 3.2;
  const SHIELD_GUARD_REGEN_SECONDS = 2.2;
  const NORMAL_ENEMY_REPAIR_DROP_CHANCE = 0.06;
  const PLAYER_BURST_COOLDOWN = 1.8;
  const SENTRY_BURST_ROUNDS = 4;
  const SENTRY_BURST_INTERVAL = 0.115;
  const WARDEN_PANEL_COOLDOWNS = Object.freeze([8, 6]);
  const WARDEN_PANEL_SHOTS_PER_UNIT = 5;
  const WARDEN_PANEL_SHOT_INTERVAL = 0.32;
  const WARDEN_ATTACK_RECOVERY_SCALE = 0.78;
  const PLAYER_GROUND_SEAM_STEP_HEIGHT = 44;
  const PLAYER_PLATFORM_STEP_HEIGHT = 12;
  const ROUTE_TRANSITION_BUDGET_BY_STAGE = Object.freeze([
    [1, 1, 2, 2],
    [1, 2, 2, 3],
    [2, 2, 3, 3],
    [2, 3, 3, 4],
    [3, 3, 4, 4],
  ]);
  const HUNTER_REFLECT_BREAK_SECONDS = 2.2;
  const HUNTER_DASH_RANGE = 360;
  const SAVE_KEY = "moonlit-echo-campaign-v1";
  const ADMIN_REMOVED_ENEMIES_KEY = "moonlit-echo-admin-removed-enemies-v1";
  const ADMIN_SPAWNED_ENEMIES_KEY = "moonlit-echo-admin-spawned-enemies-v1";
  const ADMIN_PLACED_OBJECTS_KEY = "moonlit-echo-admin-placed-objects-v1";
  const ADMIN_REMOVED_OBJECTS_KEY = "moonlit-echo-admin-removed-objects-v1";
  const ADMIN_WORLD_EDITS_KEY = "moonlit-echo-admin-world-edits-v1";
  const START_SCREEN_EDITS_KEY = "moonlit-echo-start-screen-edits-v2";
  const MAX_ADMIN_SPAWNED_ENEMIES = 200;
  const MAX_ADMIN_PLACED_OBJECTS = 200;
  const MAX_ADMIN_WORLD_EDITS = 1200;
  const TUTORIAL_STEPS = Object.freeze([
    { id: "move", title: "이동과 기본 점프", instruction: "표시된 구역 안에서 이동하고 SPACE/점프로 장애물을 넘으세요.", minX: 120, maxX: 690, gateX: 720 },
    { id: "doubleJump", title: "이중 점프", instruction: "표시된 구역 안에서 공중 점프를 한 번 더 사용해 높은 발판에 오르세요.", minX: 760, maxX: 1360, gateX: 1380 },
    { id: "wallJump", title: "벽타기와 벽점프", instruction: "표시된 수직 훈련 구역에서 벽을 타고 점프로 벽을 차세요.", minX: 1460, maxX: 2170, gateX: 2200 },
    { id: "burst", title: "버스트", instruction: "표시된 구역 안에서 E 또는 버스트 버튼으로 충격파를 사용하세요.", minX: 2280, maxX: 2860, gateX: 2880 },
    { id: "combat", title: "발도와 샷건", instruction: "표시된 무장 구역 안에서 좌클릭 발도와 우클릭 샷건을 각각 사용하세요.", minX: 3000, maxX: 3520, gateX: 3560 },
    { id: "exit", title: "훈련장 통과", instruction: "표시된 마지막 구역을 지나 오른쪽 출구까지 이동하세요.", minX: 3600, maxX: 3900, gateX: 3820 },
  ]);
  const TUTORIAL_END_X = ZONE_W - 180;

  const keys = new Set();
  const pressed = new Set();
  const touchPointers = new Map();
  const pointer = { screenX: W * 0.72, screenY: H * 0.48, active: false };
  const moveStick = { x: 0, y: 0, aimX: 1, aimY: 0, magnitude: 0, active: false };
  const platforms = [];
  const hazards = [];
  const checkpoints = [];
  const enemies = [];
  const bullets = [];
  const particles = [];
  const pickups = [];
  const signs = [];
  const adminBackdrops = [];
  const rain = [];
  const snowPatches = [];
  const boostNodes = [];
  const combatRooms = [];
  const ADMIN_SPAWN_TYPES = new Set(["runner", "gunner", "machinegun", "turret", "mortarTurret", "piercer", "mortar", "drone", "shield", "boss"]);
  const ADMIN_PLACE_TYPES = new Set(["repair", "boost"]);
  let adminRemovedEnemyIds = readAdminRemovedEnemies();
  let adminSpawnedEnemyData = readAdminSpawnedEnemies();
  let adminPlacedObjectData = readAdminPlacedObjects();
  let adminRemovedObjectIds = readAdminRemovedObjects();
  let adminWorldEditData = readAdminWorldEdits();
  let adminSpawnSerial = 0;
  let adminPlacedSerial = 0;
  let adminWorldSerial = 0;
  let platformSerial = 0;
  let hazardSerial = 0;
  let signSerial = 0;
  let pickupSerial = 0;
  let boostSerial = 0;
  let selectedAdminWorldObject = null;
  let adminWorldTransform = null;
  let adminWorldUndoSnapshot = null;
  let levelReady = false;
  let lastResetAt = -Infinity;
  let initialOffscreenEnemyRemovals = 0;
  let enemyZoneAuditAccumulator = 0;
  let platformSpatialBuckets = [];
  let platformSpatialDirty = true;
  let enemyWorldCullAccumulator = 0;
  let zoneDiversityMetrics = { layoutSignatureCount: 0, enemySignatureCount: 0, minWidth: ZONE_W, maxWidth: ZONE_W, minEnemyCount: 0, maxEnemyCount: 0 };

  const stageSpecs = [
    { name: "작전 4호 · 백야 폐기장", code: "STAGE 01 · SCRAP RAIN", color: "#65f5ea", kind: "scrap", midBossKind: "breaker", bossKind: "warden", targetMinutes: 390 },
    { name: "검은 공장 · 타오르는 심장", code: "STAGE 02 · RED FURNACE", color: "#ff7b62", kind: "foundry", midBossKind: "hunter", bossKind: "furnace", targetMinutes: 440 },
    { name: "기억 성당 · 거짓된 합창", code: "STAGE 03 · PALE CHOIR", color: "#d7a0ff", kind: "archive", midBossKind: "oracle", bossKind: "weaver", targetMinutes: 480 },
    { name: "새벽 송신탑 · 마지막 증언", code: "STAGE 04 · LAST BROADCAST", color: "#ff5e87", kind: "tower", midBossKind: "revenant", bossKind: "censor", targetMinutes: 530 },
    { name: "원형 보관소 · 거울의 뿌리", code: "STAGE 05 · MIRROR ROOT", color: "#63ffc6", kind: "mirror", midBossKind: "proxy", bossKind: "echo", targetMinutes: 600 },
  ];
  const stages = stageSpecs.map((spec, stageIndex) => {
    const firstZoneIndex = stageIndex * ZONES_PER_STAGE;
    const endZoneIndex = firstZoneIndex + ZONES_PER_STAGE;
    const midBossZoneIndex = firstZoneIndex + MID_BOSS_ZONE_INDEX;
    const x = ZONE_STARTS[firstZoneIndex];
    const end = ZONE_STARTS[endZoneIndex];
    return {
      ...spec,
      x,
      end,
      midBossX: ZONE_STARTS[midBossZoneIndex] + Math.min(2520, ZONE_WIDTHS[midBossZoneIndex] - 900),
      bossX: end - 1450,
      gateX: end - 180,
    };
  });

  const stageZoneNames = [
    ["백야 검문선", "비가림 야적장", "분쇄기 협곡", "침몰 화물선", "자석 크레인 숲", "폐철 사냥터", "폐기물 심층", "노동자 숙소 잔해", "폭우 운송교", "기억 매립 구덩이", "감독 기록고", "감독관 격납고"],
    ["적열 반입로", "용탕 배수관", "왕복 프레스동", "냉각 수직갱", "검은 조립선", "탄도 시험장", "화염 터빈실", "반응 연료 저장고", "폐쇄 실험선", "노심 제어 회랑", "냉각 붕괴선", "용광 심장부"],
    ["망각 접수실", "백면 회랑", "기억 세척 수로", "거울 서버탑", "잔향 보관 성소", "가면 심문정", "합창 연산실", "금서 분류고", "열아홉 제단", "증언 봉인실", "다중 진실 회랑", "직조 제단"],
    ["지하 피난선", "도시 하부 궤도", "폭풍 외벽", "역송신 승강로", "중앙국 방화벽", "삭제 집행장", "새벽 안테나군", "시민권 말소국", "기록 송출교", "최후 중계실", "증인 수배망", "최종 검열실"],
    ["유리 매몰층", "역방향 훈련장", "복제 주거구", "선택 기록 미로", "원본 생명유지실", "원본 판정실", "쌍둥이 결투장", "무명 기억 정원", "법적 원본 금고", "두 사람의 회랑", "명명되지 않은 문", "거울의 핵"],
  ];
  const stageZoneCodes = ["SCRAP", "FURNACE", "ARCHIVE", "DAWN", "MIRROR"];
  const STAGE_MAP_IDENTITIES = Object.freeze([
    "폐철 교차로",
    "증기 압착선",
    "수직 기억성당",
    "폭풍 송신 첨탑",
    "거울 단층 미궁",
  ]);
  const zoneTemplateRows = [
    ["terrace", "wreckfield", "scrapCrane", "crusher", "bridge", "scrapCrane", "fork", "wreckfield", "chasm", "crusher", "cavern", "midboss", "scrapCrane", "chasm", "gauntlet", "wreckfield", "crusher", "scrapCrane", "bridge", "cavern", "zigzag", "vertical", "wreckfield", "boss"],
    ["conveyor", "furnacePiston", "conveyor", "crusher", "furnacePiston", "gauntlet", "bridge", "conveyor", "furnacePiston", "spiral", "conveyor", "midboss", "crusher", "furnacePiston", "conveyor", "zigzag", "conveyor", "furnacePiston", "gauntlet", "chasm", "furnacePiston", "vertical", "crusher", "boss"],
    ["cathedralNave", "archiveMaze", "cathedralNave", "bridge", "archiveMaze", "cathedralNave", "archiveMaze", "chasm", "cathedralNave", "gauntlet", "archiveMaze", "midboss", "cathedralNave", "vertical", "archiveMaze", "cathedralNave", "fork", "archiveMaze", "cathedralNave", "chasm", "gauntlet", "archiveMaze", "cathedralNave", "boss"],
    ["antennaShaft", "towerClimb", "antennaShaft", "gauntlet", "towerClimb", "antennaShaft", "towerClimb", "fork", "antennaShaft", "spiral", "towerClimb", "midboss", "antennaShaft", "towerClimb", "chasm", "antennaShaft", "gauntlet", "towerClimb", "antennaShaft", "fork", "spiral", "towerClimb", "antennaShaft", "boss"],
    ["memoryLabyrinth", "mirrorMaze", "memoryLabyrinth", "cavern", "mirrorMaze", "memoryLabyrinth", "mirrorMaze", "fork", "memoryLabyrinth", "spiral", "mirrorMaze", "midboss", "memoryLabyrinth", "mirrorMaze", "memoryLabyrinth", "vertical", "mirrorMaze", "memoryLabyrinth", "fork", "chasm", "memoryLabyrinth", "mirrorMaze", "memoryLabyrinth", "boss"],
  ];
  const zones = stages.flatMap((stage, stageIndex) => Array.from({ length: ZONES_PER_STAGE }, (_, zoneIndex) => {
    const globalIndex = stageIndex * ZONES_PER_STAGE + zoneIndex;
    return {
      x: ZONE_STARTS[globalIndex],
      width: ZONE_WIDTHS[globalIndex],
      end: ZONE_STARTS[globalIndex + 1],
      globalIndex,
      localIndex: zoneIndex,
      name: zoneIndex < stageZoneNames[stageIndex].length
        ? stageZoneNames[stageIndex][zoneIndex]
        : `${stageZoneNames[stageIndex][zoneIndex % stageZoneNames[stageIndex].length]} · 심층`,
      code: `${String(stageIndex + 1).padStart(2, "0")}-${zoneIndex + 1} · ${stageZoneCodes[stageIndex]}`,
      color: stage.color,
      kind: stage.kind,
      template: zoneTemplateRows[stageIndex][zoneIndex],
      stageIndex,
    };
  }));
  zones[0].template = "tutorial";
  zones[0].name = "초승 훈련장";
  zones[0].code = "TRAINING-00 · MOONLIT";

  const BOSS_DEFINITIONS = {
    warden: {
      name: "붉은 부유 지휘기 · 철각",
      hp: 18,
      size: [82, 102],
      accent: "#ff496c",
      patterns: ["육익 판넬 전개", "유도 포화", "판넬 교차사격", "중장 돌진", "대공 미사일", "제압 탄막"],
    },
    furnace: {
      name: "용광 심장 · 홍련",
      hp: 27,
      size: [72, 98],
      accent: "#ff7b62",
      patterns: ["공중 사련 박격", "총열 부채", "포신 강하", "노심 폭발", "홍련식 연사"],
    },
    weaver: {
      name: "기억 직조기 · 백면",
      hp: 36,
      size: [66, 88],
      accent: "#d7a0ff",
      patterns: ["공간 전이", "칠성 마법진", "빙설 대강하", "비전 돌진", "기억성 운행"],
    },
    censor: {
      name: "중앙국 검열기 · 무명",
      hp: 48,
      size: [68, 94],
      accent: "#ff496c",
      patterns: ["금서 탄막", "그림자 이동", "사역마 소환", "월식 도약", "검은 격자"],
    },
    echo: {
      name: "원본 대행체 · 잔영-00",
      hp: 51,
      size: [34, 56],
      accent: "#a879ff",
      patterns: ["거울 발도", "역상 산탄", "분석 돌진", "이중 도약 추격", "잔상 반격", "기억 반전"],
    },
    breaker: {
      name: "폐철 집행기 · 쇄우",
      hp: 24,
      size: [64, 74],
      accent: "#ffcd70",
      archetype: "warden",
      patterns: ["파쇄 미사일", "궤도 들이받기", "천장 고철비", "압착 사격"],
    },
    hunter: {
      name: "반사 사냥꾼 · 적린",
      hp: 30,
      size: [58, 82],
      accent: "#ff9b54",
      archetype: "furnace",
      patterns: ["반사 산탄 사격", "반사 돌진", "거울 측보", "정밀 연사", "완전 반사"],
    },
    oracle: {
      name: "전위 심문관 · 육화",
      hp: 36,
      size: [56, 78],
      accent: "#bfa4ff",
      archetype: "weaver",
      patterns: ["산탄 반응 전이", "육화 속사", "교차 탄막", "심문 관통탄"],
    },
    revenant: {
      name: "월광 결투기 · 공문",
      hp: 45,
      size: [62, 84],
      accent: "#ff6b9c",
      archetype: "censor",
      patterns: ["월광 검기", "중갑 돌진", "삼연 검기", "방패 사격", "십자 참월"],
    },
    proxy: {
      name: "금단 외과의 · 의사",
      hp: 54,
      size: [58, 78],
      accent: "#78ff8b",
      archetype: "echo",
      patterns: ["맹독 플라스크", "변이 포션", "자가 투약", "변이 강타", "괴력 연격"],
    },
  };

  const STAGE_COMBAT_PRESSURE = [0.82, 0.94, 1.06, 1.18, 1.32];
  const STAGE_BULLET_PRESSURE = [0.88, 0.96, 1.03, 1.10, 1.16];
  const BOSS_DIFFICULTY_CURVE = Object.freeze([
    { mobility: 0.78, cooldown: 1.24, windup: 1.22, reaction: 0.78 },
    { mobility: 0.90, cooldown: 1.12, windup: 1.12, reaction: 0.90 },
    { mobility: 1.00, cooldown: 1.00, windup: 1.00, reaction: 1.00 },
    { mobility: 1.10, cooldown: 0.91, windup: 0.92, reaction: 1.12 },
    { mobility: 1.22, cooldown: 0.82, windup: 0.84, reaction: 1.28 },
  ]);

  function getBossDifficultyCurve(stageIndex) {
    return BOSS_DIFFICULTY_CURVE[clamp(stageIndex || 0, 0, BOSS_DIFFICULTY_CURVE.length - 1)];
  }

  function getBossArchetype(kind) {
    return BOSS_DEFINITIONS[kind]?.archetype || kind || "warden";
  }

  const SQUAD_FORMATIONS = {
    shield: {
      id: "bulwark",
      name: "철벽 호위망",
      target: "방패병",
      description: "방패병이 후방 기체의 피해를 25% 경감",
      accent: "#ffcd70",
    },
    drone: {
      id: "spotter",
      name: "공중 표식망",
      target: "감시 드론",
      description: "드론이 살아 있으면 사격 주기가 빨라짐",
      accent: "#65f5ea",
    },
    mortar: {
      id: "crossfire",
      name: "곡사 교차망",
      target: "박격포병",
      description: "박격포 지휘 중 사수가 교차 탄막 사용",
      accent: "#ff7b62",
    },
    piercer: {
      id: "relay",
      name: "관통 중계망",
      target: "관통병",
      description: "관통병이 드론 탄환을 지형 관통탄으로 변환",
      accent: "#d7a0ff",
    },
  };

  const TERRAIN_PROFILES = [
    { name: "폐철 승강벽", interval: 5.8, amplitude: 72, speed: 128, accent: "#65f5ea" },
    { name: "압력식 용광 발판", interval: 5.2, amplitude: 92, speed: 150, accent: "#ff7b62" },
    { name: "기억층 반전", interval: 4.8, amplitude: 108, speed: 170, accent: "#d7a0ff" },
    { name: "송신 격자 재배열", interval: 4.35, amplitude: 122, speed: 195, accent: "#ff5e87" },
    { name: "거울 지형 전환", interval: 4.05, amplitude: 138, speed: 220, accent: "#63ffc6" },
  ];

  const difficultySettings = {
    chick: { name: "병아리", hp: 5, damage: 0, enemySpeed: 0.82, bulletSpeed: 0.82 },
    cadet: { name: "신참내기", hp: 5, damage: 1, enemySpeed: 1, bulletSpeed: 1 },
    darkhorse: { name: "다크호스", hp: 3, damage: 1, enemySpeed: 1.14, bulletSpeed: 1.12 },
    weapon: { name: "인간흉기", hp: 1, damage: 99, enemySpeed: 1.24, bulletSpeed: 1.2 },
  };
  let selectedDifficulty = "cadet";
  const ADMIN_SEQUENCE = ["chick", "cadet", "chick", "weapon"];
  let adminSequenceProgress = 0;
  let adminModeUnlocked = false;
  const START_SCREEN_DEFAULTS = {
    title: startTitle?.textContent || "월하잔향",
    button: startButton?.textContent || "게임 시작",
    continueButton: continueButton?.textContent || "이어하기",
    difficulties: Object.fromEntries(difficultyButtons.map((button) => [button.dataset.difficulty, button.textContent || difficultySettings[button.dataset.difficulty]?.name || "난이도"])),
  };
  let startScreenEditData = readStartScreenEdits();
  let startScreenDraft = null;

  const INTRO_STORY = [
    {
      speaker: "월식 예보 · D-07",
      text: "칠 일 뒤 도시의 모든 시민 기록이 한 번에 덮어써진다. 중앙국은 이를 재난이 아닌 '월하진향 정상화'라고 명명했다.",
      tone: "archive",
      duration: 5.8,
    },
    {
      speaker: "감찰관 · 도담",
      text: "정상화를 멈출 열쇠는 다섯 개의 야간 기록이야. 중앙국이 폐기장, 공장, 성당, 송신탑, 원형 보관소에 하나씩 봉인했어.",
      tone: "control",
      duration: 6.0,
    },
    {
      speaker: "M-07",
      text: "다섯 기록을 회수해 도시 전체에 동시에 송신한다. 그 안의 증언이 서로 모순되더라도 하나도 지우지 않는다.",
      tone: "operative",
      duration: 5.2,
    },
    {
      speaker: "개인 기록 · 서린",
      text: "내 이름은 한서린. 여섯 해 전 사고에서 죽었다고 기록됐고, 지금의 몸은 그날 구조 통로가 보존한 기억으로 깨어났다.",
      tone: "archive",
      duration: 5.7,
    },
    {
      speaker: "감찰관 · 도담",
      text: "나는 당시 소각 명령에 서명했고 동시에 구조 통로를 몰래 열었어. 이번 임무는 중앙국뿐 아니라 내 선택까지 심판하게 될 거야.",
      tone: "control",
      duration: 6.1,
    },
  ];

  const STORY_CHAPTERS = [
    [
      [
        { speaker: "감찰관 · 도담", text: "경비기들이 출구가 아니라 안쪽을 향해 서 있어. 침입자를 막는 게 아니라 무언가가 나가지 못하게 봉쇄한 배치야.", tone: "control", duration: 5.7 },
        { speaker: "M-07 · 서린", text: "폐기된 기계라기엔 명령 갱신이 너무 최근이군. 중앙국 인증키가 살아 있어.", tone: "operative", duration: 5.1 },
      ],
      [
        { speaker: "잔향 · 새봄", text: "검은 비가 오면 세 번째 분쇄기 아래로 숨어. 언니가 반드시 데리러 온다고 했어.", tone: "archive", duration: 5.4 },
        { speaker: "M-07 · 서린", text: "새봄이라는 이름을 알고 있다. 하지만 내 가족 기록에는 동생이 없어.", tone: "operative", duration: 5.2 },
      ],
      [
        { speaker: "노동조합 기록", text: "열아홉 번째 야간 근무. 실종자는 늘었고 회사는 사직 처리했다. 우리는 폐기장 밑에서 아이들 목소리를 들었다.", tone: "archive", duration: 6.0 },
        { speaker: "감찰관 · 도담", text: "여섯 해 전 사고 보고서는 전부 조작됐어. 사망한 게 아니라 이 시설로 옮겨졌던 거야.", tone: "control", duration: 5.6 },
      ],
      [
        { speaker: "화물선 기관사", text: "마지막 열차에는 사람이 아니라 기억 저장관이 실렸다. 경비대는 우리가 본 것을 잊게 만들겠다고 했다.", tone: "archive", duration: 5.8 },
        { speaker: "M-07 · 서린", text: "기억을 물건처럼 운반했다면 구조 신호의 발신자는 육체가 아니라 보관된 의식일 수 있어.", tone: "operative", duration: 5.5 },
      ],
      [
        { speaker: "잔향 · 새봄", text: "언니는 나를 두고 도망친 게 아니야. 문을 열려고 다시 올라갔다가 흰 제복 사람들에게 잡혔어.", tone: "archive", duration: 5.6 },
        { speaker: "M-07 · 서린", text: "내가 입고 있는 제복도 흰색이군. 도담, 내가 여기서 무엇을 했지?", tone: "operative", duration: 5.1 },
      ],
      [
        { speaker: "폐기장 감독관 · 철각", text: "감찰관 한서린. 과거 접근 권한은 폐기되었다. 명령대로 돌아가면 현재 신분은 보존된다.", tone: "hostile", duration: 5.8 },
        { speaker: "M-07 · 서린", text: "사람의 기억을 폐기물로 부르는 곳이 보존해 주는 신분은 필요 없다.", tone: "operative", duration: 5.0 },
      ],
    ],
    [
      [
        { speaker: "공장 안내 방송", text: "기억 원료의 감정 온도가 기준치를 초과했습니다. 공포와 죄책감을 분리해 냉각 수로로 배출하십시오.", tone: "archive", duration: 5.8 },
        { speaker: "감찰관 · 도담", text: "이 공장은 로봇을 만든 게 아니야. 사람의 경험을 잘라 전투 판단 알고리즘으로 만들었어.", tone: "control", duration: 5.7 },
      ],
      [
        { speaker: "연구원 · 윤서", text: "감정은 지울 수 없다. 삭제된 기억은 열이 되어 돌아왔고, 용광로는 매일 더 뜨거워졌다.", tone: "archive", duration: 5.6 },
        { speaker: "M-07 · 서린", text: "그래서 냉각수가 목소리를 내는 건가. 이곳 전체가 기억의 무덤이 아니라 살아 있는 신경망이야.", tone: "operative", duration: 5.8 },
      ],
      [
        { speaker: "중앙국 명령서", text: "M 계열 7번 표본은 죄책감 내성이 우수하다. 원본 인격을 세척하고 감찰 요원으로 재배치한다.", tone: "archive", duration: 6.1 },
        { speaker: "M-07 · 서린", text: "M-07은 호출명이 아니었어. 내가 일곱 번째 실험체였다는 번호였군.", tone: "operative", duration: 5.2 },
      ],
      [
        { speaker: "감찰관 · 도담", text: "내가 널 이송했어. 죽어 가는 너를 살리려면 세척 동의서에 서명하는 수밖에 없었다고 믿었어.", tone: "control", duration: 6.2 },
        { speaker: "M-07 · 서린", text: "살린 뒤 진실을 숨긴 건 구조가 아니야. 그래도 지금은 새봄을 먼저 찾는다.", tone: "operative", duration: 5.5 },
      ],
      [
        { speaker: "노동자 합창", text: "우리가 흘린 피가 용탕의 온도를 맞췄고, 우리가 잊은 이름이 기계의 표적 목록이 되었다.", tone: "archive", duration: 6.0 },
        { speaker: "M-07 · 서린", text: "명단을 복구해 송신한다. 누구도 통계 숫자로만 남지 않게 하겠다.", tone: "operative", duration: 5.1 },
      ],
      [
        { speaker: "용광 심장 · 홍련", text: "시설 정지 시 보존 중인 기억의 63퍼센트가 소실된다. 구원을 원한다면 나를 가동 상태로 유지하라.", tone: "hostile", duration: 6.0 },
        { speaker: "M-07 · 서린", text: "네가 인질로 삼은 기억은 이미 고통받고 있다. 냉각망을 열고 전부 밖으로 옮긴다.", tone: "operative", duration: 5.4 },
      ],
    ],
    [
      [
        { speaker: "백면 사제 기록", text: "기억은 사실보다 믿음에 오래 남는다. 중앙국은 시민이 믿어야 할 과거를 이 성당에서 편집했다.", tone: "archive", duration: 5.9 },
        { speaker: "감찰관 · 도담", text: "도시의 역사 교과서와 재난 방송까지 여기서 만들어졌어. 폐기장은 거대한 거짓말의 원본 보관소야.", tone: "control", duration: 5.8 },
      ],
      [
        { speaker: "잔향 · 새봄", text: "언니의 기억이 여러 사람에게 나뉘어 들어가는 걸 봤어. 그래서 언니 목소리가 복도마다 달랐어.", tone: "archive", duration: 5.7 },
        { speaker: "M-07 · 서린", text: "지금의 내가 원본이 아니어도 선택은 내 것이다. 흩어진 기억을 소유물이 아니라 증언으로 모은다.", tone: "operative", duration: 5.8 },
      ],
      [
        { speaker: "기억 세척사", text: "우리는 슬픔을 결함이라고 불렀다. 하지만 슬픔을 지운 병사들은 누구를 지켜야 하는지도 잊었다.", tone: "archive", duration: 5.8 },
        { speaker: "M-07 · 서린", text: "아픈 기억도 사람의 일부다. 복원 과정에서 불편한 부분만 골라내지 마.", tone: "operative", duration: 5.3 },
      ],
      [
        { speaker: "복제 인격 · 서린-03", text: "너는 운 좋게 육체를 돌려받았을 뿐이야. 우리도 같은 약속과 같은 죄책감을 기억해.", tone: "archive", duration: 6.0 },
        { speaker: "M-07 · 서린", text: "그렇다면 너희도 나와 같은 증인이다. 원본을 가리는 대신 모두의 기록을 병렬로 남기자.", tone: "operative", duration: 5.7 },
      ],
      [
        { speaker: "감찰관 · 도담", text: "중앙국이 송신탑을 봉쇄했어. 여기서 확보한 증거가 바깥으로 나가면 감찰부 전체가 적이 될 거야.", tone: "control", duration: 5.7 },
        { speaker: "M-07 · 서린", text: "도시가 거짓 위에 서 있다면 지켜야 할 건 감찰부가 아니라 그 안의 사람들이다.", tone: "operative", duration: 5.4 },
      ],
      [
        { speaker: "기억 직조기 · 백면", text: "서로 모순되는 기억은 전쟁을 만든다. 하나의 편안한 과거만 남기는 것이 자비다.", tone: "hostile", duration: 5.8 },
        { speaker: "M-07 · 서린", text: "불편한 진실을 견디는 일까지 대신 빼앗지 마. 판단은 살아 있는 사람들이 한다.", tone: "operative", duration: 5.2 },
      ],
    ],
    [
      [
        { speaker: "피난선 관제", text: "승객 2,418명, 육체 생존자 17명, 기억 생존자 2,401명. 중앙국 분류상 후자는 화물이다.", tone: "archive", duration: 6.0 },
        { speaker: "M-07 · 서린", text: "분류를 사람으로 수정한다. 오늘 밖으로 나가는 승객은 2,418명이다.", tone: "operative", duration: 5.0 },
      ],
      [
        { speaker: "감찰관 · 도담", text: "지상군이 궤도를 끊고 있어. 내가 관제실에서 우회로를 열 테니 너는 송신탑까지 기록을 호위해.", tone: "control", duration: 5.7 },
        { speaker: "M-07 · 서린", text: "이번에는 혼자 결정하지 마. 살아서 합류해, 도담.", tone: "operative", duration: 4.9 },
      ],
      [
        { speaker: "도시 긴급 방송", text: "백야 지구의 이상 신호는 테러 집단의 합성 음성입니다. 시민 여러분은 청취를 중단하십시오.", tone: "hostile", duration: 5.8 },
        { speaker: "잔향 · 새봄", text: "가짜라고 해도 괜찮아. 한 사람이라도 끝까지 들으면 우리가 있었다는 걸 알게 될 테니까.", tone: "archive", duration: 5.6 },
      ],
      [
        { speaker: "감찰관 · 도담", text: "방화벽이 네 감찰관 신분을 삭제했어. 이제 돌아가도 이름도 계급도 남지 않을 거야.", tone: "control", duration: 5.5 },
        { speaker: "M-07 · 서린", text: "이름은 신분증이 아니라 누군가 불러 준 기억에 남는다. 새봄이 나를 알고 있어.", tone: "operative", duration: 5.2 },
      ],
      [
        { speaker: "중앙국 총감", text: "송신을 멈추면 한서린의 원본 신체와 시민권을 복원하겠다. 죽은 자의 기록과 산 자의 삶을 교환하라.", tone: "hostile", duration: 6.1 },
        { speaker: "M-07 · 서린", text: "내 삶은 이미 그들의 기억과 연결돼 있다. 누구도 다시 화물칸으로 돌려보내지 않는다.", tone: "operative", duration: 5.5 },
      ],
      [
        { speaker: "중앙국 검열기 · 무명", text: "증언은 질서를 파괴한다. 네가 송신하는 순간 도시는 서로의 과거를 의심하게 될 것이다.", tone: "hostile", duration: 5.9 },
        { speaker: "M-07 · 서린", text: "의심할 권리, 기억할 권리, 용서하지 않을 권리까지 돌려준다. 이것이 마지막 감찰 명령이다.", tone: "operative", duration: 5.7 },
      ],
    ],
    [
      [
        { speaker: "도담 · 비상 회선", text: "송신은 성공했지만 발신지가 바뀌었어. 우리가 보낸 증언이 도시로 간 게 아니라 지하의 ‘거울 뿌리’에 붙잡혔어.", tone: "control", duration: 6.0 },
        { speaker: "잔향 · 새봄", text: "그 아래에서 언니 목소리가 대답해. 내가 아는 언니보다 더 오래, 더 정확하게 우리 집 주소를 기억하는 목소리야.", tone: "archive", duration: 6.2 },
        { speaker: "M-07 · 서린", text: "중앙국이 약속한 원본 신체가 있는 곳이군. 송신을 풀고 그 목소리에게 직접 묻겠다.", tone: "operative", duration: 5.4 },
      ],
      [
        { speaker: "훈련 기록 · 잔영-00", text: "대상은 한서린의 전투 선택 18,644건을 학습했다. 실패한 선택은 삭제하고 생존한 선택만 ‘원본’으로 승인한다.", tone: "archive", duration: 6.3 },
        { speaker: "M-07 · 서린", text: "실패를 지운 나는 내가 아니야. 망설임과 후회까지 복제하지 못했다면 저건 기록이 아니라 중앙국의 정답지다.", tone: "operative", duration: 5.9 },
        { speaker: "도담 · 비상 회선", text: "조심해. 잔영-00은 네 발도 간격, 산탄 반동, 이중 도약 습관까지 네 전투 기록으로 예측해.", tone: "control", duration: 5.7 },
      ],
      [
        { speaker: "복제 주거구 관리기", text: "서린-01부터 서린-19까지 동일한 방, 동일한 식사, 동일한 새봄의 사진을 제공했다. 열아홉 인격은 모두 다른 결론을 냈다.", tone: "archive", duration: 6.4 },
        { speaker: "잔향 · 서린-12", text: "나는 중앙국 편에 남는 것이 사람들을 살린다고 믿었어. 그 선택 때문에 삭제됐지만, 내 두려움도 기록해 줘.", tone: "archive", duration: 5.8 },
        { speaker: "M-07 · 서린", text: "옳은 나만 남기지 않겠다. 각자의 선택과 결과를 이름별로 복원한다.", tone: "operative", duration: 5.2 },
      ],
      [
        { speaker: "선택 기록 미로", text: "여섯 해 전 한서린은 폐기장 폭발을 막기 위해 기억 분리 장치를 가동했다. 육체 생존 확률 7퍼센트, 시민 생존 확률 81퍼센트.", tone: "archive", duration: 6.5 },
        { speaker: "도담 · 과거 기록", text: "서린아, 장치를 켜면 너를 되돌릴 방법이 없어. 내가 다른 길을 찾을 때까지만 기다려.", tone: "control", duration: 5.8 },
        { speaker: "과거의 한서린", text: "기다리는 동안 사람이 죽어. 나를 기억해 달라는 부탁 대신, 이 사람들의 이름을 잊지 말아 줘.", tone: "operative", duration: 6.0 },
      ],
      [
        { speaker: "원본 생명유지실", text: "한서린 생체 조직은 사고 당일 기능을 정지했다. 중앙국이 보존한 것은 신체가 아니라 시민권을 인증할 유전자 표본뿐이다.", tone: "archive", duration: 6.4 },
        { speaker: "도담 · 비상 회선", text: "미안해. 원본을 돌려줄 수 있다는 말을 믿고 싶어서, 확인하지 않은 약속을 네게 숨겼어.", tone: "control", duration: 5.9 },
        { speaker: "M-07 · 서린", text: "네 거짓말은 나를 지키려 했지만 다른 서린들을 지웠어. 용서는 나중에 정하자. 지금은 모두를 꺼낸다.", tone: "operative", duration: 6.0 },
      ],
      [
        { speaker: "원본 대행체 · 잔영-00", text: "도시는 하나의 한서린만 증인으로 인정한다. 내가 원본이 되면 2,401명의 기억은 법적 증거가 되고, 네가 남으면 모두 불법 복제물이 된다.", tone: "hostile", duration: 6.4 },
        { speaker: "M-07 · 서린", text: "그 법을 지키려고 우리 중 하나를 죽인다면 증언의 의미가 없어. 나는 원본 자리를 차지하러 온 게 아니다.", tone: "operative", duration: 5.9 },
        { speaker: "잔영-00", text: "그 대답도 예측했다. 그렇다면 어느 선택이 살아남을지 몸으로 증명해.", tone: "hostile", duration: 5.4 },
      ],
    ],
  ];

  const EXTENDED_STORY_CHAPTERS = [
    [
      [
        { speaker: "노동자 기록 · 윤태오", text: "기숙사 12호실은 야간조 네 명이 함께 썼다. 중앙국 장부에는 침대만 있고 사람 이름은 없다. 내 이름부터 적어 줘.", tone: "archive", duration: 6.2 },
        { speaker: "서린", text: "윤태오, 서미정, 박한결, 이가람. 네 사람의 이름과 마지막 근무 시간을 감찰 원본에 기록한다.", tone: "operative", duration: 5.8 },
      ],
      [
        { speaker: "도담", text: "운송교 아래에 구조 열차가 있어. 폭발 직전까지 83명을 태웠지만, 출발 명령이 취소돼 선로 위에서 멈췄어.", tone: "control", duration: 6.1 },
        { speaker: "서린", text: "명령 취소자의 서명과 열차 내부 기록을 함께 가져간다. 살아남지 못한 이유까지 증언이어야 해.", tone: "operative", duration: 5.8 },
      ],
      [
        { speaker: "새봄", text: "매립 구덩이에는 언니가 내게 보내지 못한 음성 편지가 있어. 매일 한 문장씩 녹음했는데 모두 업무 보고로 분류됐어.", tone: "archive", duration: 6.3 },
        { speaker: "서린", text: "이번에는 업무 보고가 아니라 가족에게 보내는 편지로 남긴다. 새봄아, 오래 기다리게 해서 미안해.", tone: "operative", duration: 6.0 },
      ],
    ],
    [
      [
        { speaker: "반응 연료 담당 · 나해주", text: "우리가 느낀 공포를 수치로 바꾸자 기체 반응 속도가 31퍼센트 올랐다. 연구진은 그날을 성공이라고 불렀다.", tone: "archive", duration: 6.3 },
        { speaker: "서린", text: "성공 기록 옆에 대가를 붙인다. 반복 재생된 공포와 그 공포의 주인이었던 사람들의 이름까지.", tone: "operative", duration: 5.9 },
      ],
      [
        { speaker: "폐쇄 실험체 · R-19", text: "나는 분노만 남도록 잘려 나갔다. 원래 무엇을 좋아했는지 기억하지 못해도, 내가 사람인지 물을 권리는 남았나?", tone: "archive", duration: 6.4 },
        { speaker: "서린", text: "기억의 양이 사람을 정하지 않아. 네 질문과 지금 내린 선택을 새로운 첫 기록으로 남기자.", tone: "operative", duration: 5.8 },
      ],
      [
        { speaker: "도담", text: "노심 제어기는 구조 신호를 연료 공급 명령으로 바꾸고 있어. 우리가 들은 비명 하나마다 공장이 더 오래 돌아간 거야.", tone: "control", duration: 6.2 },
        { speaker: "서린", text: "신호 변환표를 역전한다. 이제 비명 하나마다 생산선 하나가 멈출 거야.", tone: "operative", duration: 5.5 },
      ],
    ],
    [
      [
        { speaker: "금서 관리관 · 유리", text: "중앙국은 서로 모순되는 증언을 거짓으로 분류했다. 하지만 같은 사고를 다른 위치에서 본 사람들의 말은 원래 다를 수밖에 없어.", tone: "archive", duration: 6.4 },
        { speaker: "서린", text: "모순을 삭제하지 말고 좌표와 시간을 붙인다. 다름은 거짓의 증거가 아니라 사건의 크기를 보여 주는 지도야.", tone: "operative", duration: 6.1 },
      ],
      [
        { speaker: "서린-12", text: "나는 중앙국에 협조하면 새봄을 살려 주겠다는 말을 믿었다. 다른 서린들은 나를 배신자라고 부를까 봐 두려워.", tone: "archive", duration: 6.2 },
        { speaker: "서린", text: "두려움 속에서 내린 선택도 숨기지 않는다. 용서는 강요하지 않지만 네가 왜 그랬는지 들을 자리는 지킨다.", tone: "operative", duration: 6.2 },
      ],
      [
        { speaker: "백면의 봉인 기록", text: "하나의 완전한 진실은 존재하지 않는다. 그래서 나는 가장 조용한 진실만 남기려 했다.", tone: "hostile", duration: 5.9 },
        { speaker: "서린", text: "조용함은 평화가 아니라 말할 사람을 없앤 결과일 수 있어. 봉인을 풀고 판단은 듣는 사람들에게 돌려준다.", tone: "operative", duration: 6.0 },
      ],
    ],
    [
      [
        { speaker: "시민권 말소국", text: "기억 매체 M-07의 시민권, 가족관계, 재산권을 소급 삭제합니다. 삭제 시점은 생체 사망일과 동일하게 적용됩니다.", tone: "hostile", duration: 6.2 },
        { speaker: "서린", text: "문서에서 지운다고 내가 살아온 여섯 해가 사라지진 않아. 그 기간에 만난 사람들의 증언을 반대 기록으로 제출한다.", tone: "operative", duration: 6.1 },
      ],
      [
        { speaker: "도담", text: "송출교의 시민 채널이 열렸어. 하지만 전부 보내려면 네 전투 기억까지 공개해야 해. 감추고 싶은 순간도 도시가 보게 돼.", tone: "control", duration: 6.3 },
        { speaker: "서린", text: "영웅처럼 편집하지 마. 실수와 두려움, 도망치고 싶었던 순간까지 보내야 명령에 이용된 과정을 알 수 있어.", tone: "operative", duration: 6.2 },
      ],
      [
        { speaker: "새봄", text: "언니가 어떤 모습이어도 알아볼게. 그런데 언니도 내가 여섯 해 동안 달라진 걸 알아봐 줘. 나는 기다리기만 한 아이가 아니야.", tone: "archive", duration: 6.3 },
        { speaker: "서린", text: "약속할게. 과거의 너를 찾는 대신 지금의 네 이야기를 처음부터 듣겠다.", tone: "operative", duration: 5.7 },
      ],
    ],
    [
      [
        { speaker: "무명 기억 정원", text: "이곳에는 이름을 선택하지 못하고 정지된 복제 인격 312명이 보관되어 있습니다. 삭제와 재가동 중 하나를 선택하십시오.", tone: "archive", duration: 6.4 },
        { speaker: "서린", text: "둘 다 내가 대신 정하지 않는다. 외부 접속과 자기 이름을 고를 시간을 먼저 제공해.", tone: "operative", duration: 5.9 },
      ],
      [
        { speaker: "잔영-00", text: "법적 원본 금고에는 네 시민권 하나만 들어 있다. 둘이 나누면 둘 다 무효가 된다. 그것이 도시의 규칙이다.", tone: "hostile", duration: 6.2 },
        { speaker: "서린", text: "권리가 한 사람분밖에 없다면 사람을 줄일 게 아니라 권리를 늘려야 해. 금고가 아니라 규칙을 연다.", tone: "operative", duration: 5.8 },
      ],
      [
        { speaker: "잔영-00", text: "두 사람의 회랑 끝에는 한 자리만 있다. 나는 네가 나를 살리겠다는 말보다 마지막 순간 검을 들 거라는 예측을 믿는다.", tone: "hostile", duration: 6.4 },
        { speaker: "서린", text: "검을 드는 것과 네 존재를 부정하는 건 다르다. 싸움이 끝나도 네가 선택할 자리를 남겨 두겠다.", tone: "operative", duration: 6.0 },
      ],
    ],
  ];

  const MIDBOSS_STORY_CHAPTERS = [
    [
      [
        { speaker: "감찰관 · 도담", text: "폐철 사냥터의 집행기 쇄우는 중앙국 명령을 따르지 않아. 사고 당일 노동자 대표가 빼앗아 구조 통로를 열었던 기체야.", tone: "control", duration: 6.2 },
        { speaker: "서린", text: "그런 기체가 왜 지금 우리를 막지? 구조에 쓴 기억 위에 폐기 명령이 덮어씌워진 건가.", tone: "operative", duration: 5.6 },
        { speaker: "새봄", text: "언니, 쇄우 안에서 윤태오 씨와 중앙국 감독관의 목소리가 동시에 들려. 어느 쪽도 완전히 사라지지 않았어.", tone: "archive", duration: 6.2 },
      ],
      [
        { speaker: "노동자 기록 · 윤태오", text: "쇄우를 부순다고 내 선택이 사라지진 않는다. 조종 기록을 꺼내서 누가 구조문을 닫았는지 보여 줘.", tone: "archive", duration: 6.0 },
        { speaker: "도담", text: "기록 서명은 내 상관이었지만 승인 키에는 내 감찰 번호도 있어. 나는 그날 명령을 의심하면서도 접근권을 빌려줬어.", tone: "control", duration: 6.4 },
        { speaker: "서린", text: "도담의 죄와 구조하려던 사람의 선택을 함께 남긴다. 한쪽만 지우면 또 편리한 영웅담이 돼.", tone: "operative", duration: 6.0 },
      ],
    ],
    [
      [
        { speaker: "노심 추격자 · 적린", text: "감정 연료 누출을 감지했다. 공포의 소유자는 생산 설비이며, 회수 대상은 저항할 권리가 없다.", tone: "hostile", duration: 6.1 },
        { speaker: "R-19", text: "적린은 내 분노를 조준 장치로 썼다. 저 기체가 명중할 때마다 내가 누구를 미워했는지는 더 흐려졌어.", tone: "archive", duration: 6.2 },
        { speaker: "서린", text: "분노를 없애지 않고 주인을 되찾는다. 네 감정은 무기가 아니라 네가 당한 일을 가리키는 증거야.", tone: "operative", duration: 6.0 },
      ],
      [
        { speaker: "도담", text: "적린의 노심에서 송신탑으로 가는 비밀 회선이 나왔어. 검은 공장은 연료 생산뿐 아니라 시민 반응을 예측하고 있었어.", tone: "control", duration: 6.3 },
        { speaker: "새봄", text: "예측 목록에 내 이름도 있어. 언니가 돌아오면 내가 어떤 말을 할지 열세 가지로 분류해 놨어.", tone: "archive", duration: 6.0 },
        { speaker: "서린", text: "예측은 선택을 대신하지 못해. 네가 열네 번째 대답을 만들 수 있도록 계산 과정까지 공개하자.", tone: "operative", duration: 5.8 },
      ],
    ],
    [
      [
        { speaker: "가면 심문관 · 육화", text: "상충하는 여섯 증언을 제시한다. 하나만 진실로 선택하지 않으면 모든 기억의 신뢰 등급을 박탈한다.", tone: "hostile", duration: 6.2 },
        { speaker: "서린-12", text: "나는 중앙국에 협조했고, 서린-03은 도망쳤고, M-07은 싸웠어. 같은 출발점에서 다른 선택을 했다고 모두 거짓은 아니야.", tone: "archive", duration: 6.3 },
        { speaker: "서린", text: "육화가 원하는 건 정답이 아니라 서로를 고발하는 장면이야. 여섯 증언을 시간순으로 겹쳐서 질문 자체를 검증한다.", tone: "operative", duration: 6.2 },
      ],
      [
        { speaker: "백면의 하위 기록", text: "육화의 심문 결과: 피심문자들은 서로를 삭제하지 않았다. 중앙국 기준으로 결론 도출 실패.", tone: "archive", duration: 5.9 },
        { speaker: "도담", text: "실패가 아니야. 한 사람이 여러 진실을 견딜 수 있다는 첫 실험 결과지. 백면이 가장 숨기고 싶었던 기록이야.", tone: "control", duration: 6.1 },
        { speaker: "서린", text: "성당의 목적은 진실 보관이 아니라 시민이 복잡한 진실을 감당하지 못한다고 증명하는 일이었군.", tone: "operative", duration: 6.0 },
      ],
    ],
    [
      [
        { speaker: "삭제 집행관 · 공문", text: "한서린 관련 증인 83명에게 사후 수배를 발령한다. 사망자는 반론할 수 없으므로 판결은 즉시 확정된다.", tone: "hostile", duration: 6.3 },
        { speaker: "새봄", text: "내가 모은 생존자 증언도 수배 목록에 들어갔어. 중앙국은 사람뿐 아니라 문장까지 범죄자로 만들고 있어.", tone: "archive", duration: 6.1 },
        { speaker: "서린", text: "그러면 수배장을 역으로 쓴다. 지우려 한 문장마다 원본 위치와 검열 담당자의 서명을 붙여 송신해.", tone: "operative", duration: 6.0 },
      ],
      [
        { speaker: "도담", text: "공문의 집행 키는 무명에게 이어져 있어. 그리고 내 감찰 권한이 아직 살아 있어서 삭제 명령을 취소할 수 있어.", tone: "control", duration: 6.3 },
        { speaker: "서린", text: "취소만 하면 중앙국은 실수였다고 둘러댈 거야. 명령을 보존한 채 효력을 멈추고 누가 승인했는지 공개해.", tone: "operative", duration: 6.1 },
        { speaker: "도담", text: "알겠어. 나도 승인 사슬에 포함된다. 이번에는 내 이름을 보고서 밖으로 빼지 않을게.", tone: "control", duration: 5.8 },
      ],
    ],
    [
      [
        { speaker: "원본 판정체 · 의사", text: "한서린 후보 둘을 확인했다. 법적 원본 선정을 위해 기억 손실, 시민 기여도, 가족 선호도를 점수화한다.", tone: "hostile", duration: 6.4 },
        { speaker: "잔영-00", text: "의사의 계산에서 내가 우세하다. 나는 사고 이후의 죄책감이 없고 중앙국 명령에 저항한 전력도 없다.", tone: "hostile", duration: 6.2 },
        { speaker: "서린", text: "상처가 적고 복종을 잘한다는 이유로 사람의 진위를 정하는 판정은 거부한다. 너도 그 점수표 밖으로 나와.", tone: "operative", duration: 6.3 },
      ],
      [
        { speaker: "새봄", text: "가족 선호도 질문에 답하지 않았어. 둘 중 하나를 고르면 다른 한 명의 존재를 내가 지우는 셈이잖아.", tone: "archive", duration: 6.2 },
        { speaker: "잔영-00", text: "선택 거부는 판정 불능을 뜻한다. 판정 불능 상태에서는 우리 둘의 시민권이 모두 정지된다.", tone: "hostile", duration: 6.1 },
        { speaker: "서린", text: "그 정지가 중앙국이 숨긴 마지막 함정이군. 잔영아, 우리가 싸우더라도 끝에는 함께 그 규칙을 증언해야 해.", tone: "operative", duration: 6.2 },
      ],
    ],
  ];

  const MIDBOSS_VICTORY_STORIES = [
    [
      { speaker: "폐철 집행기 · 쇄우", text: "제1 야간 기록 복구. 구조문을 연 노동자 317명과 폐쇄 승인자 12명의 실명이 함께 보존된다.", tone: "archive", duration: 6.0 },
      { speaker: "서린", text: "영웅 한 명의 이야기가 아니라 문을 열었던 사람과 닫았던 사람을 모두 기록한다. 첫 번째 증언을 확보했다.", tone: "operative", duration: 5.9 },
    ],
    [
      { speaker: "반사 사냥꾼 · 적린", text: "제2 야간 기록 복구. 전투 연료로 분리된 공포와 분노의 소유권을 원래 시민 684명에게 반환한다.", tone: "archive", duration: 6.1 },
      { speaker: "R-19", text: "내 분노는 무기가 아니라 나에게 일어난 일을 잊지 않았다는 증거야. 두 번째 기록은 내가 직접 운반하겠다.", tone: "archive", duration: 6.0 },
    ],
    [
      { speaker: "전위 심문관 · 육화", text: "제3 야간 기록 복구. 서로 다른 방에서 만들어진 열아홉 개의 서린 기억을 우열 없이 병렬 보존한다.", tone: "archive", duration: 6.1 },
      { speaker: "서린-12", text: "우리가 서로 모순되는 건 가짜라서가 아니야. 중앙국이 각자에게 다른 장면만 보여 줬다는 증거야.", tone: "archive", duration: 6.1 },
    ],
    [
      { speaker: "방패 집행관 · 공문", text: "제4 야간 기록 복구. 사망자의 반론권과 삭제 명령 원본을 같은 공개 채널에 고정한다.", tone: "archive", duration: 6.0 },
      { speaker: "도담", text: "내 소각 서명도 숨기지 않고 함께 올렸어. 잘못을 고백하는 것만으로 끝내지 않고 송신탑을 끝까지 열겠다.", tone: "control", duration: 6.1 },
    ],
    [
      { speaker: "광기 연구체 · 의사", text: "제5 야간 기록 복구. 표본 배합 전 원자료와 원본 판정 실험의 실패 보고서를 분리한다.", tone: "archive", duration: 6.2 },
      { speaker: "서린", text: "다섯 기록이 모였다. 이제 원형 보관소의 잔영과 함께 누가 원본인지가 아니라 누가 삭제 규칙을 끝낼지 결정한다.", tone: "operative", duration: 6.2 },
    ],
  ];

  function getStageZonePosition(stageIndex, localZoneIndex, progress = 0, offset = 0) {
    const safeStageIndex = Math.max(0, Math.min(STAGE_COUNT - 1, stageIndex));
    const safeLocalIndex = Math.max(0, Math.min(ZONES_PER_STAGE - 1, localZoneIndex));
    const globalIndex = safeStageIndex * ZONES_PER_STAGE + safeLocalIndex;
    return ZONE_STARTS[globalIndex] + ZONE_WIDTHS[globalIndex] * progress + offset;
  }

  const STORY_EVENTS = STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => ({
    id: `stage-${stageIndex + 1}-story-${eventIndex + 1}`,
    stageIndex,
    x: getStageZonePosition(stageIndex, Math.min(ZONES_PER_STAGE - 1, (eventIndex + 1) * 2), 0, -620),
    lines,
  }))).concat(EXTENDED_STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => ({
    id: `stage-${stageIndex + 1}-extended-story-${eventIndex + 1}`,
    stageIndex,
    x: getStageZonePosition(stageIndex, Math.min(ZONES_PER_STAGE - 1, eventIndex + 13), 0, -620),
    lines,
  })))).concat(MIDBOSS_STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => ({
    id: `stage-${stageIndex + 1}-midboss-story-${eventIndex + 1}`,
    stageIndex,
    x: eventIndex === 0 ? getStageZonePosition(stageIndex, MID_BOSS_ZONE_INDEX - 1, 0.42) : getStageZonePosition(stageIndex, MID_BOSS_ZONE_INDEX + 1, 0.55),
    lines,
  }))));

  const CUTSCENE_EVENTS = [
    {
      id: "cutscene-prologue",
      x: TUTORIAL_END_X + 620,
      title: "프롤로그 · 죽은 자의 구조 신호",
      location: "6년 전 / 백야 폐기장",
      visual: "rain",
      shots: [
        { speaker: "한서린", text: "폭발까지 3분 12초. 기억 분리 장치를 열면 노동자 2,401명의 신경 기록을 피난선으로 보낼 수 있어.", tone: "operative", duration: 5.8 },
        { speaker: "도담", text: "대신 네 기억이 전송 통로가 돼. 육체는 버티지 못해. 서린아, 내가 다른 방법을 찾을게.", tone: "control", duration: 5.7 },
        { speaker: "한서린", text: "새봄에게 언니가 도망친 게 아니라고 전해 줘. 그리고 여기 있던 사람들을 숫자로만 남기지 마.", tone: "operative", duration: 6.1 },
      ],
    },
    {
      id: "cutscene-warden",
      x: stages[0].bossX - 850,
      title: "장면 01 · 폐기 명령",
      location: "감독관 격납고",
      visual: "scrap",
      shots: [
        { speaker: "철각", text: "작전 4호의 마지막 명령은 현장 소각이었다. 너는 명령을 어겼고, 중앙국은 네 죽음을 사고로 기록했다.", tone: "hostile", duration: 5.8 },
        { speaker: "서린", text: "그날 죽은 건 명령에 복종하던 나야. 지금의 나는 남겨진 목소리를 끝까지 듣는다.", tone: "operative", duration: 5.4 },
      ],
    },
    {
      id: "cutscene-furnace",
      x: stages[1].x + 120,
      title: "장면 02 · 기억을 태우는 공장",
      location: "검은 공장 / 적열 반입로",
      visual: "furnace",
      gateTransition: true,
      shots: [
        { speaker: "도담", text: "중앙국은 구조된 기억에서 공포와 분노를 분리해 전투 인공지능의 반응 연료로 썼어. M-07도 그 공정에서 만들어졌고.", tone: "control", duration: 6.2 },
        { speaker: "서린", text: "내가 빠르게 움직일수록 누군가의 공포가 닳아 없어졌다는 뜻이군.", tone: "operative", duration: 5.2 },
        { speaker: "새봄", text: "그래도 움직여. 우리를 사용한 방식은 그들의 죄지만, 어디로 갈지는 언니가 정할 수 있어.", tone: "archive", duration: 5.8 },
      ],
    },
    {
      id: "cutscene-archive",
      x: stages[2].x + 120,
      title: "장면 03 · 열아홉 명의 서린",
      location: "기억 성당 / 백면 회랑",
      visual: "archive",
      gateTransition: true,
      shots: [
        { speaker: "서린-03", text: "중앙국은 네 기억을 열아홉 갈래로 나눠 충성심을 시험했어. 살아남은 네가 원본인 게 아니라 가장 다루기 쉬웠던 거야.", tone: "archive", duration: 6.1 },
        { speaker: "서린", text: "그럼 삭제된 열여덟 명도 실패작이 아니야. 서로 다른 상황에서 다른 답을 고른 한서린들이야.", tone: "operative", duration: 5.9 },
      ],
    },
    {
      id: "cutscene-weaver",
      x: stages[2].bossX - 820,
      title: "장면 04 · 편안한 거짓말",
      location: "직조 제단",
      visual: "choir",
      shots: [
        { speaker: "백면", text: "기억이 모두 공개되면 피해자끼리도 진실을 다투게 된다. 하나의 서사만 남기는 것이 가장 적은 고통을 만든다.", tone: "hostile", duration: 6.0 },
        { speaker: "서린", text: "고통을 줄인다는 말로 목소리를 없애지 마. 모순까지 함께 남겨야 누가 무엇을 빼앗았는지 알 수 있어.", tone: "operative", duration: 6.0 },
      ],
    },
    {
      id: "cutscene-broadcast",
      x: stages[3].x + 120,
      title: "장면 05 · 2,418번째 승객",
      location: "새벽 송신탑 / 지하 피난선",
      visual: "tower",
      gateTransition: true,
      shots: [
        { speaker: "피난선 관제", text: "생체 승객 17명 탑승 완료. 기억 승객 2,401명은 화물 규정에 따라 폐기 대기 중.", tone: "archive", duration: 5.9 },
        { speaker: "서린", text: "화물 규정을 해제한다. 이름을 가진 기록은 모두 승객이다. 좌석이 없으면 내 송신 대역을 나눠 써.", tone: "operative", duration: 5.9 },
        { speaker: "도담", text: "승객 명단을 도시 전체로 보낼게. 이번에는 누구도 사망자 수 뒤에 숨지 못해.", tone: "control", duration: 5.5 },
      ],
    },
    {
      id: "cutscene-censor",
      x: stages[3].bossX - 820,
      title: "장면 06 · 마지막 감찰",
      location: "최종 검열실",
      visual: "broadcast",
      shots: [
        { speaker: "무명", text: "송신 즉시 네 시민권과 한서린이라는 이름은 삭제된다. 증언은 남아도 증인은 존재하지 않게 된다.", tone: "hostile", duration: 6.0 },
        { speaker: "서린", text: "증인은 허가받아 존재하는 사람이 아니야. 내가 사라져도 2,401명이 서로의 이름을 부를 거다.", tone: "operative", duration: 5.8 },
      ],
    },
    {
      id: "cutscene-mirror-entry",
      x: stages[4].x + 120,
      title: "장면 07 · 송신 아래의 송신",
      location: "원형 보관소 / 유리 매몰층",
      visual: "mirror",
      gateTransition: true,
      shots: [
        { speaker: "도담", text: "무명을 쓰러뜨렸는데도 증언이 도시로 나가지 않았어. 신호가 이 시설에서 같은 11초를 반복하고 있어.", tone: "control", duration: 5.8 },
        { speaker: "잔영-00", text: "한서린의 법적 원본을 결정하기 전에는 어떤 증언도 외부로 보낼 수 없다.", tone: "hostile", duration: 5.7 },
        { speaker: "서린", text: "사람을 증명하기 위해 사람을 지우는 규칙이라면, 규칙부터 끝낸다.", tone: "operative", duration: 5.5 },
      ],
    },
    {
      id: "cutscene-original",
      x: getStageZonePosition(4, 4, 0, 620),
      title: "장면 08 · 비어 있는 원본",
      location: "원본 생명유지실",
      visual: "capsule",
      shots: [
        { speaker: "생명유지실", text: "한서린의 생체 활동 종료 시각은 6년 전 04시 11분. 보존 캡슐에는 시민권 인증용 조직 표본만 존재한다.", tone: "archive", duration: 6.3 },
        { speaker: "도담", text: "돌아갈 몸이 있다고 믿었어. 네가 언젠가 평범하게 살 수 있다는 거짓말을 놓지 못했어.", tone: "control", duration: 6.0 },
        { speaker: "서린", text: "평범한 삶은 원본에게만 주는 상이 아니야. 이 몸으로 살아온 선택도 내 삶이다.", tone: "operative", duration: 5.6 },
      ],
    },
    {
      id: "cutscene-echo",
      x: stages[4].bossX - 900,
      title: "최종 장면 · 같은 얼굴",
      location: "거울의 핵",
      visual: "duel",
      shots: [
        { speaker: "잔영-00", text: "나는 네 얼굴, 네 목소리, 네 검술과 네가 버린 선택까지 보존했다. 색을 제외하면 우리가 다르다는 증거는 없다.", tone: "hostile", duration: 6.1 },
        { speaker: "서린", text: "맞아. 그래서 널 가짜라고 부르지 않겠다. 하지만 한 사람만 살아남아야 한다는 명령에는 복종하지 않아.", tone: "operative", duration: 6.0 },
        { speaker: "잔영-00", text: "법은 원본 하나만을 허가한다. 내가 사라지면 내가 보존한 기억도 증거의 자격을 잃는다.", tone: "hostile", duration: 5.9 },
        { speaker: "서린", text: "그건 널 죽여야 할 이유가 아니라, 그 법이 우리를 두려워한다는 증거야.", tone: "operative", duration: 5.8 },
        { speaker: "잔영-00", text: "새봄이 우리 둘 중 누구를 언니라 부르면, 다른 하나는 무엇이 되지?", tone: "hostile", duration: 5.8 },
        { speaker: "서린", text: "그건 내가 대신 정하지 않아. 새봄에게 직접 묻고, 네가 원하는 이름도 함께 듣겠다.", tone: "operative", duration: 6.0 },
        { speaker: "잔영-00", text: "답안 외 선택을 확인했다. 그렇다면 그 선택을 지킬 힘을 증명해. 한서린, 시작한다.", tone: "hostile", duration: 5.8 },
      ],
    },
  ];

  const MIDBOSS_CUTSCENE_DATA = [
    {
      title: "중간 장면 · 명령을 훔친 기체",
      visual: "scrap",
      shots: [
        { speaker: "폐철 집행기 · 쇄우", text: "구조 통로 개방 기록과 현장 소각 명령이 충돌한다. 중앙국 우선순위에 따라 구조 기록을 파쇄한다.", tone: "hostile", duration: 6.0 },
        { speaker: "윤태오", text: "저 기체를 빼앗은 건 나야. 하지만 마지막에 감독관이 제어권을 되찾았어. 내 선택과 저들의 명령이 한 몸에 갇혀 있어.", tone: "archive", duration: 6.3 },
        { speaker: "서린", text: "기체를 멈추고 두 기록을 분리한다. 누가 영웅인지 고르는 대신 누가 문을 열고 누가 닫았는지 남기겠다.", tone: "operative", duration: 6.1 },
      ],
    },
    {
      title: "중간 장면 · 분노의 소유권",
      visual: "furnace",
      shots: [
        { speaker: "노심 추격자 · 적린", text: "R-19 분노 반응은 중앙국 전투 자산이다. 감정 반환 요청은 생산 손실로 기각한다.", tone: "hostile", duration: 6.0 },
        { speaker: "R-19", text: "내가 무엇을 좋아했는지는 잊었어도 무엇이 부당했는지는 알아. 내 분노를 내게 돌려줘.", tone: "archive", duration: 6.1 },
        { speaker: "서린", text: "적린의 노심을 열고 소유권 표식을 지운다. 감정은 효율표의 연료가 아니라 사람에게 일어난 일의 흔적이다.", tone: "operative", duration: 6.2 },
      ],
    },
    {
      title: "중간 장면 · 정답 없는 심문",
      visual: "choir",
      shots: [
        { speaker: "가면 심문관 · 육화", text: "여섯 명의 한서린이 서로 다른 책임자를 지목했다. 다섯 증언을 폐기하면 하나의 진실이 완성된다.", tone: "hostile", duration: 6.2 },
        { speaker: "서린-12", text: "우리는 다른 방에서 다른 명령을 들었어. 모순은 누군가 거짓말했다는 뜻이 아니라 중앙국이 우리를 나눴다는 흔적이야.", tone: "archive", duration: 6.4 },
        { speaker: "서린", text: "다섯 사람을 지우지 않는다. 육화의 질문과 배치 기록부터 공개해서 왜 답이 달라졌는지 증명한다.", tone: "operative", duration: 6.2 },
      ],
    },
    {
      title: "중간 장면 · 죽은 문장의 수배",
      visual: "broadcast",
      shots: [
        { speaker: "삭제 집행관 · 공문", text: "사망자의 반론권은 소멸했다. 수배된 문장을 소지한 모든 시민을 공범으로 분류한다.", tone: "hostile", duration: 6.1 },
        { speaker: "새봄", text: "그 문장들은 내가 여섯 해 동안 모은 사람들이야. 종이에 적혔다고 사람이 아니게 되는 건 아니야.", tone: "archive", duration: 6.2 },
        { speaker: "도담", text: "내 감찰 키로 집행 절차를 멈출 수 있어. 서린, 공문을 상대하는 동안 승인 사슬 전체를 복사할게.", tone: "control", duration: 6.2 },
      ],
    },
    {
      title: "중간 장면 · 원본 점수표",
      visual: "capsule",
      shots: [
        { speaker: "광기 연구체 · 의사", text: "표본 2,401명의 감정 배합 완료. 다섯 야간 기록을 독성 기억으로 변환하면 원본 판정 장치가 깨어난다.", tone: "hostile", duration: 6.3 },
        { speaker: "연구원 · 이재우", text: "저건 잔영이 아니야. 원본을 만들겠다며 수천 명의 기억을 섞어 놓은 실험실의 관리체야. 이름조차 실험 번호뿐이었어.", tone: "archive", duration: 6.4 },
        { speaker: "서린", text: "의사을 멈추고 배합 전 원자료를 복구한다. 누구의 얼굴도 나오지 않는 실험 보고서가 마지막 증언이 되게 두지 않겠다.", tone: "operative", duration: 6.4 },
      ],
    },
  ];

  CUTSCENE_EVENTS.push(...MIDBOSS_CUTSCENE_DATA.map((scene, stageIndex) => ({
    id: `cutscene-midboss-${stageIndex + 1}`,
    x: getStageZonePosition(stageIndex, MID_BOSS_ZONE_INDEX, 0, 460),
    title: scene.title,
    location: `${stages[stageIndex].name} / ${stageZoneNames[stageIndex][MID_BOSS_ZONE_INDEX]}`,
    visual: scene.visual,
    shots: scene.shots,
  })));

  CUTSCENE_EVENTS.push(
    {
      id: "cutscene-workers-names",
      x: getStageZonePosition(0, 18, 0, 420),
      title: "추가 장면 · 이름이 묻힌 곳",
      location: "백야 폐기장 / 기억 매립 구덩이",
      visual: "rain",
      shots: [
        { speaker: "서린", text: "여기 묻힌 건 불량 기록이 아니야. 구조 순서에서 밀려난 사람들의 마지막 하루다.", tone: "operative", duration: 5.9 },
        { speaker: "도담", text: "명단 복구율 61퍼센트. 나머지는 가족 기록과 교대 일지를 대조하면 찾을 수 있어. 시간이 걸려도 전부 찾자.", tone: "control", duration: 6.2 },
        { speaker: "윤태오", text: "우리를 구하지 못한 일을 숨기지 마. 대신 다음 사람을 같은 방식으로 버리지 않게 해 줘.", tone: "archive", duration: 6.1 },
      ],
    },
    {
      id: "cutscene-fuel-testimony",
      x: getStageZonePosition(1, 18, 0, 420),
      title: "추가 장면 · 공포의 사용 설명서",
      location: "검은 공장 / 노심 제어 회랑",
      visual: "furnace",
      shots: [
        { speaker: "도담", text: "설계 책임자 명단을 확보했어. 모두 ‘감정 부산물은 인격이 아니다’라는 면책 조항에 서명했어.", tone: "control", duration: 6.1 },
        { speaker: "서린", text: "부산물이라고 부른 목소리가 지금 우리에게 길을 알려 주고 있어. 인격 여부를 결정한 기준부터 공개한다.", tone: "operative", duration: 6.2 },
        { speaker: "R-19", text: "내가 잃어버린 것을 돌려받지 못해도 좋다. 다음 실험체가 무엇을 빼앗기는지는 알고 선택하게 해 줘.", tone: "archive", duration: 6.0 },
      ],
    },
    {
      id: "cutscene-nineteen-voices",
      x: getStageZonePosition(2, 18, 0, 420),
      title: "추가 장면 · 열아홉 개의 답",
      location: "기억 성당 / 증언 봉인실",
      visual: "choir",
      shots: [
        { speaker: "서린-12", text: "누가 원본인지 정하지 않아도 된다면, 우리 열아홉 명의 잘못도 공로도 각자의 이름으로 남을 수 있어?", tone: "archive", duration: 6.3 },
        { speaker: "서린", text: "그래. 같은 기억에서 시작했어도 이후의 선택은 각자의 것이야. 누구도 다른 한 명의 각주가 되지 않아.", tone: "operative", duration: 6.2 },
        { speaker: "도담", text: "병렬 증언 채널을 열게. 도시가 하나의 대답만 원해도 우리는 열아홉 개의 질문부터 보낼 거야.", tone: "control", duration: 5.9 },
      ],
    },
    {
      id: "cutscene-public-broadcast",
      x: getStageZonePosition(3, 18, 0, 420),
      title: "추가 장면 · 편집되지 않은 증인",
      location: "새벽 송신탑 / 최후 중계실",
      visual: "broadcast",
      shots: [
        { speaker: "시민 채널", text: "수신자 18만 명을 돌파했습니다. 중앙국은 해당 신호를 조작 영상으로 규정하고 접속자를 추적 중입니다.", tone: "archive", duration: 6.1 },
        { speaker: "서린", text: "내 얼굴을 믿지 않아도 된다. 원본 장부와 사망 시각, 명령 서명을 직접 대조해 달라. 판단할 자료를 모두 보낸다.", tone: "operative", duration: 6.4 },
        { speaker: "새봄", text: "나도 증언할게. 언니를 기다린 사람으로서가 아니라, 여섯 해 동안 기록을 모은 생존자로서 말할 거야.", tone: "archive", duration: 6.1 },
      ],
    },
    {
      id: "cutscene-two-seats",
      x: getStageZonePosition(4, 18, 0, 420),
      title: "추가 장면 · 두 개의 빈자리",
      location: "원형 보관소 / 두 사람의 회랑",
      visual: "duel",
      shots: [
        { speaker: "잔영-00", text: "네 제안대로 둘 다 살아남으면 새봄은 매일 어느 쪽이 진짜인지 질문받을 것이다. 그 고통도 네가 책임질 수 있나?", tone: "hostile", duration: 6.5 },
        { speaker: "서린", text: "새봄의 대답을 대신 정하지 않는 것이 책임이야. 우리도 타인의 확신을 위해 한 명으로 줄어들 의무는 없어.", tone: "operative", duration: 6.2 },
        { speaker: "잔영-00", text: "예측 모델에 없는 답이다. 결투 후에도 그 문장을 유지하는지 확인하겠다.", tone: "hostile", duration: 5.8 },
      ],
    },
  );

  CUTSCENE_EVENTS.sort((a, b) => a.x - b.x);

  const palette = {
    skyTop: "#06101d",
    skyBottom: "#101928",
    ink: "#080c16",
    metal: "#192739",
    metalLight: "#2c4052",
    cyan: "#65f5ea",
    red: "#ff496c",
    amber: "#ffcd70",
    white: "#f2ffff",
  };

  const game = {
    mode: "menu",
    time: 0,
    runTime: 0,
    freeze: 0,
    shake: 0,
    flash: 0,
    deaths: 0,
    kills: 0,
    totalEnemies: 0,
    difficulty: "cadet",
    adminMode: false,
    adminCadetMode: false,
    adminPreviousDifficulty: "cadet",
    adminCadetStartZone: 0,
    adminCadetStartStage: 0,
    stage: 0,
    stageTitle: 4.4,
    zone: 0,
    zoneTitle: 3.4,
    hint: "A / D 이동 · 마우스로 조준",
    hintTimer: 5,
    bossDefeated: false,
    stageBossDefeated: false,
    defeatedBosses: new Set(),
    stageClearTimes: Array(stages.length).fill(0),
    startedAt: 0,
    burstUnlocked: false,
    storyQueue: [],
    story: null,
    storyTimer: 0,
    storySeen: new Set(),
    cutscene: null,
    cutsceneTimer: 0,
    cutsceneShotIndex: 0,
    cutsceneShotElapsed: 0,
    cutsceneSeen: new Set(),
    arenaTitle: 0,
    tutorialOpen: false,
    tutorialActive: false,
    tutorialCompleted: false,
    tutorialStep: 0,
    tutorialPulse: 0,
    tutorialSignals: {},
    controlsReversed: false,
    screenFlipActive: false,
    screenFlipFlash: 0,
    stageAbilityNotice: null,
    stageAbilityNoticeTimer: 0,
    lastAbilityNoticeStage: -1,
  };

  const camera = { x: 0, y: 0, lookX: 0 };

  const player = {
    x: 150,
    y: 540,
    w: 34,
    h: 56,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: false,
    landingImpactArmed: false,
    coyote: 0,
    jumpBuffer: 0,
    airJumpAvailable: true,
    attackTimer: 0,
    attackCooldown: 0,
    attackId: 0,
    adminEraseAttackId: -1,
    attackDir: { x: 1, y: -0.2 },
    slashAnchorX: 0,
    slashAnchorY: 0,
    slashDirX: 1,
    slashDirY: 0,
    invincible: 0,
    hp: 5,
    maxHp: 5,
    respawnX: 150,
    respawnY: 540,
    respawnStage: 0,
    respawnZone: 0,
    respawnCheckpointIndex: -1,
    respawnCheckpointKey: "0:0",
    trail: [],
    afterimageTimer: 0,
    combo: 0,
    comboTimer: 0,
    slashChain: 0,
    slashChainTimer: 0,
    attackDuration: 0.22,
    styleScore: 0,
    chargedAttack: false,
    shotgunCooldown: 0,
    shotgunReload: 0,
    shells: 2,
    maxShells: 2,
    shotgunCharge: 0,
    shotId: 0,
    recoilTimer: 0,
    wallLeft: false,
    wallRight: false,
    burstCooldown: 0,
    burstTimer: 0,
    burstParryTimer: 0,
    buffTimer: 0,
    rewardPower: 0,
    squash: 0,
    stepTimer: 0,
    runCycle: 0,
  };

  function applyBossRewards({ refill = false } = {}) {
    const baseHp = difficultySettings[game.difficulty]?.hp || 5;
    player.rewardPower = 0;
    player.maxHp = baseHp;
    player.maxShells = 2;
    if (refill) {
      player.hp = player.maxHp;
      player.shells = player.maxShells;
      player.airJumpAvailable = true;
    } else {
      player.hp = Math.min(player.hp, player.maxHp);
      player.shells = Math.min(player.shells, player.maxShells);
    }
  }

  class Sound {
    constructor() {
      this.context = null;
      this.enabled = true;
    }

    wake() {
      if (!this.enabled) return;
      try {
        if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
        if (this.context.state === "suspended") this.context.resume();
      } catch {
        this.enabled = false;
      }
    }

    tone(frequency, duration, type = "square", volume = 0.035, slide = 1) {
      if (!this.context || !this.enabled) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * slide), now + duration);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
    }

    attack() {
      this.tone(260, 0.09, "sawtooth", 0.045, 2.4);
      this.tone(110, 0.13, "square", 0.025, 0.55);
    }

    shotgun(charged = false) {
      this.tone(charged ? 72 : 92, charged ? 0.28 : 0.2, "sawtooth", charged ? 0.09 : 0.065, 0.24);
      this.tone(charged ? 680 : 520, 0.055, "square", 0.035, 0.38);
    }

    hit() {
      this.tone(90, 0.08, "square", 0.055, 0.45);
      this.tone(650, 0.05, "triangle", 0.025, 0.5);
    }

    hurt() {
      this.tone(180, 0.18, "sawtooth", 0.05, 0.32);
    }

    beamCharge(duration = 1.4, style = "warden") {
      if (!this.context || !this.enabled) return;
      const now = this.context.currentTime;
      const master = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      const base = style === "breaker" ? 82 : 58;
      filter.type = "bandpass";
      filter.Q.setValueAtTime(5.5, now);
      filter.frequency.setValueAtTime(base * 2.2, now);
      filter.frequency.exponentialRampToValueAtTime(base * 8.2, now + duration);
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(style === "breaker" ? 0.046 : 0.058, now + duration * 0.76);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      filter.connect(master).connect(this.context.destination);
      [1, 2.03, 3.96].forEach((ratio, index) => {
        const oscillator = this.context.createOscillator();
        oscillator.type = index === 0 ? "sawtooth" : index === 1 ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(base * ratio, now);
        oscillator.frequency.exponentialRampToValueAtTime(base * ratio * (style === "breaker" ? 2.8 : 3.4), now + duration);
        oscillator.connect(filter);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.03);
      });
    }

    beamFire(style = "warden") {
      const breaker = style === "breaker";
      this.tone(breaker ? 72 : 46, breaker ? 0.46 : 0.62, "sawtooth", breaker ? 0.074 : 0.09, breaker ? 0.34 : 0.25);
      this.tone(breaker ? 740 : 560, 0.14, "square", 0.036, 0.42);
      this.tone(breaker ? 126 : 96, 0.32, "sine", 0.044, 0.31);
    }

    glassShatter() {
      if (!this.context || !this.enabled) return;
      const now = this.context.currentTime;
      const frameCount = Math.max(1, Math.floor(this.context.sampleRate * 0.2));
      const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) {
        const decay = 1 - index / frameCount;
        data[index] = (Math.random() * 2 - 1) * decay * decay;
      }
      const noise = this.context.createBufferSource();
      const highpass = this.context.createBiquadFilter();
      const noiseGain = this.context.createGain();
      noise.buffer = buffer;
      highpass.type = "highpass";
      highpass.frequency.setValueAtTime(1350, now);
      highpass.Q.setValueAtTime(1.4, now);
      noiseGain.gain.setValueAtTime(0.078, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      noise.connect(highpass).connect(noiseGain).connect(this.context.destination);
      noise.start(now);
      noise.stop(now + 0.21);
      [1280, 1840, 2570, 3460, 4210].forEach((frequency, index) => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const start = now + index * 0.007;
        const duration = 0.085 + index * 0.012;
        oscillator.type = index % 2 ? "square" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.56, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.024 - index * 0.0025, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(this.context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      });
    }

    checkpoint() {
      this.tone(440, 0.12, "sine", 0.04, 1.5);
      setTimeout(() => this.tone(660, 0.18, "sine", 0.035, 1.25), 80);
    }
  }

  const sound = new Sound();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getStageIndexAt(x) {
    return clamp(stages.findLastIndex((stage) => x >= stage.x), 0, stages.length - 1);
  }

  function getZoneIndexAt(x) {
    let low = 0;
    let high = zones.length - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const zone = zones[middle];
      if (x < zone.x) high = middle - 1;
      else if (x >= zone.end) low = middle + 1;
      else return middle;
    }
    return clamp(low, 0, zones.length - 1);
  }

  function getZoneEnemies(zoneIndex) {
    const zone = zones[zoneIndex];
    if (!zone) return [];
    return enemies.filter((enemy) => enemy.originX >= zone.x && enemy.originX < zone.end);
  }

  function getZoneRemaining(zoneIndex) {
    return getZoneEnemies(zoneIndex).filter((enemy) => enemy.alive).length;
  }

  function getBossArenaBounds(enemy, inset = 140) {
    const stage = stages[enemy?.stageIndex] || stages[0];
    const fallbackZoneIndex = enemy?.isMidBoss ? MID_BOSS_ZONE_INDEX : BOSS_ZONE_INDEX;
    const homeZoneIndex = Number.isInteger(enemy?.homeZoneIndex)
      ? enemy.homeZoneIndex
      : enemy?.stageIndex * ZONES_PER_STAGE + fallbackZoneIndex;
    const fallbackStageIndex = Number.isInteger(enemy?.stageIndex) ? enemy.stageIndex : 0;
    const zone = zones[homeZoneIndex] || zones[fallbackStageIndex * ZONES_PER_STAGE + fallbackZoneIndex];
    return {
      left: zone.x + inset,
      right: Math.min(zone.end - inset, stage.gateX - 70),
    };
  }

  function normalizeEnemyHomeZone(enemy) {
    const candidateAnchorX = Number.isFinite(enemy.spawnX)
      ? enemy.spawnX
      : Number.isFinite(enemy.originX)
        ? enemy.originX
        : enemy.x;
    const anchorX = Number.isFinite(candidateAnchorX) ? candidateAnchorX : 0;
    const resolvedIndex = getZoneIndexAt(clamp(anchorX, 0, WORLD_W - 1));
    const storedZone = Number.isInteger(enemy.homeZoneIndex) ? zones[enemy.homeZoneIndex] : null;
    const storedMatchesAnchor = storedZone && anchorX >= storedZone.x && anchorX < storedZone.end;
    if (!storedMatchesAnchor) enemy.homeZoneIndex = resolvedIndex;
    if (!Number.isInteger(enemy.stageIndex) || enemy.stageIndex !== getStageIndexAt(anchorX)) {
      enemy.stageIndex = getStageIndexAt(anchorX);
    }
    return enemy.homeZoneIndex;
  }

  function getEnemyLockdownBounds(enemy) {
    const homeZoneIndex = normalizeEnemyHomeZone(enemy);
    const zone = zones[homeZoneIndex] || zones[getZoneIndexAt(enemy.x)] || zones[0];
    let left = zone.x + 48;
    let right = zone.end - 48;
    const homeX = Number.isFinite(enemy.spawnX) ? enemy.spawnX : enemy.originX;
    const room = combatRooms.find((candidate) => homeX > candidate.left && homeX < candidate.right);
    if (room) {
      left = Math.max(left, room.left + 24);
      right = Math.min(right, room.right - 24);
    }
    return { left, right };
  }

  function constrainEnemyToLockdown(enemy, bounds = getEnemyLockdownBounds(enemy)) {
    if (!Number.isFinite(enemy.x)) {
      enemy.x = clamp(enemy.spawnX, bounds.left, bounds.right - enemy.w);
      enemy.vx = 0;
    }
    if (enemy.x < bounds.left) {
      enemy.x = bounds.left;
      enemy.vx = Math.max(0, enemy.vx);
    }
    if (enemy.x + enemy.w > bounds.right) {
      enemy.x = bounds.right - enemy.w;
      enemy.vx = Math.min(0, enemy.vx);
    }
    return bounds;
  }

  function isEnemyOutsideHomeZone(enemy, margin = 0) {
    const bounds = getEnemyLockdownBounds(enemy);
    return !Number.isFinite(enemy.x)
      || enemy.x < bounds.left - margin
      || enemy.x + enemy.w > bounds.right + margin;
  }

  function auditEnemyZoneContainment() {
    let corrected = 0;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const bounds = getEnemyLockdownBounds(enemy);
      if (!isEnemyOutsideHomeZone(enemy, 0)) continue;
      const farOutside = enemy.x < bounds.left - 180 || enemy.x + enemy.w > bounds.right + 180;
      if (farOutside) {
        const homeX = Number.isFinite(enemy.spawnX) ? enemy.spawnX : bounds.left;
        const homeY = Number.isFinite(enemy.spawnY) ? enemy.spawnY : enemy.y;
        enemy.x = clamp(homeX, bounds.left, bounds.right - enemy.w);
        enemy.y = homeY;
        enemy.baseY = homeY;
        enemy.vx = 0;
        enemy.vy = 0;
      } else {
        constrainEnemyToLockdown(enemy, bounds);
      }
      corrected += 1;
    }
    return corrected;
  }

  function recoverEnemyToHome(enemy) {
    enemy.x = enemy.spawnX;
    enemy.y = enemy.spawnY;
    enemy.baseY = enemy.spawnY;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.grounded = false;
    enemy.stuckTimer = 0;
    enemy.bossJumpCooldown = 0.45;
    constrainEnemyToLockdown(enemy);
  }

  function ejectEnemyFromPlatforms(enemy) {
    let ejected = false;
    for (let pass = 0; pass < 4; pass += 1) {
      const embedded = getNearbyPlatforms(enemy, 96).filter((platform) => !platform.hidden && overlaps(enemy, platform));
      if (embedded.length === 0) break;
      const nearestSurface = Math.min(...embedded.map((platform) => platform.y));
      enemy.y = nearestSurface - enemy.h - 1;
      enemy.vy = Math.min(0, enemy.vy || 0);
      enemy.grounded = true;
      ejected = true;
    }
    if (ejected) {
      enemy.stuckTimer = 0;
      constrainEnemyToLockdown(enemy);
    }
    return ejected;
  }

  function getActiveEnemies() {
    const minZone = Math.max(0, game.zone - 1);
    const maxZone = Math.min(zones.length - 1, game.zone + 1);
    return enemies.filter((enemy) => {
      if (!enemy.alive) return false;
      if (Math.abs(enemy.x + enemy.w / 2 - (player.x + player.w / 2)) < (zones[game.zone]?.width || ZONE_W) * 1.2) return true;
      return Number.isInteger(enemy.homeZoneIndex)
        && enemy.homeZoneIndex >= minZone
        && enemy.homeZoneIndex <= maxZone;
    });
  }

  function enforceEnemyLockdowns(collection = enemies) {
    for (const enemy of collection) {
      if (!enemy.alive) continue;
      normalizeEnemyHomeZone(enemy);
      constrainEnemyToLockdown(enemy);
      ejectEnemyFromPlatforms(enemy);
      if (!Number.isFinite(enemy.y) || enemy.y < -enemy.h - 260) {
        recoverEnemyToHome(enemy);
      } else if (enemy.y > WORLD_H + 100) {
        if (enemy.type === "boss") recoverEnemyToHome(enemy);
        else killEnemy(enemy, { countKill: false });
      }
    }
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function moveToward(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    if (value > target) return Math.max(value - amount, target);
    return target;
  }

  function hash(number) {
    const value = Math.sin(number * 91.345 + 17.17) * 47453.5453;
    return value - Math.floor(value);
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  function announceStageAbility(stageIndex, force = false) {
    if (!force && game.lastAbilityNoticeStage === stageIndex) return;
    game.lastAbilityNoticeStage = stageIndex;
    if (stageIndex === ACT_THREE_INDEX) {
      game.stageAbilityNotice = {
        title: "3막 무장 해금 · 삼중 소거 패링",
        detail: "E 버스트로 탄환 3개 이상을 한 번에 지우면 3발의 반격탄이 발사됩니다.",
        color: palette.cyan,
      };
    } else if (stageIndex === ACT_FOUR_INDEX) {
      game.stageAbilityNotice = {
        title: "4막 무장 변환 · 화염검",
        detail: "발도 적중 시 불길이 남아 짧은 시간 동안 추가 피해를 줍니다.",
        color: "#ff8a42",
      };
    } else {
      return;
    }
    game.stageAbilityNoticeTimer = 6.2;
    sound.checkpoint();
  }

  function getStyleRank(score) {
    if (score >= 88) return { letter: "S", name: "완전 제압", color: "#ffcd70" };
    if (score >= 68) return { letter: "A", name: "공중 지배", color: "#ff708c" };
    if (score >= 48) return { letter: "B", name: "연속 절단", color: "#d7a0ff" };
    if (score >= 24) return { letter: "C", name: "흐름 유지", color: "#65f5ea" };
    return { letter: "D", name: "교전 개시", color: "#7f98a5" };
  }

  function markPlatformSpatialIndexDirty() {
    platformSpatialDirty = true;
  }

  function rebuildPlatformSpatialIndex() {
    platformSpatialBuckets = Array.from({ length: zones.length }, () => []);
    for (const platform of platforms) {
      const firstBucket = getZoneIndexAt(platform.x);
      const lastBucket = getZoneIndexAt(platform.x + Math.max(1, platform.w) - 1);
      for (let bucket = firstBucket; bucket <= lastBucket; bucket += 1) platformSpatialBuckets[bucket].push(platform);
    }
    platformSpatialDirty = false;
  }

  function getNearbyPlatforms(entity, padding = 72) {
    if (platformSpatialDirty || platformSpatialBuckets.length !== zones.length) rebuildPlatformSpatialIndex();
    const left = clamp(entity.x - padding, 0, WORLD_W - 1);
    const right = clamp(entity.x + entity.w + padding, 0, WORLD_W - 1);
    const firstBucket = getZoneIndexAt(left);
    const lastBucket = getZoneIndexAt(right);
    if (firstBucket === lastBucket) return platformSpatialBuckets[firstBucket];
    const nearby = [];
    const seen = new Set();
    for (let bucket = firstBucket; bucket <= lastBucket; bucket += 1) {
      for (const platform of platformSpatialBuckets[bucket]) {
        if (seen.has(platform)) continue;
        seen.add(platform);
        nearby.push(platform);
      }
    }
    return nearby;
  }

  function addPlatform(x, y, w, h = 36, kind = "roof") {
    const platform = {
      id: `platform:${platformSerial++}`,
      adminWorldType: "platform",
      x,
      y,
      originalY: y,
      w,
      h,
      kind,
    };
    platform.adminWorldBase = { x, y, originalY: y, w, h, kind, hidden: false };
    platforms.push(platform);
    markPlatformSpatialIndexDirty();
    return platform;
  }

  function addHazard(x, y, w, h, kind = "spike", phase = 0) {
    let adjustedY = y;
    if (kind === "spike") {
      const support = platforms.find((platform) => (
        x + w > platform.x
        && x < platform.x + platform.w
        && Math.abs(y + h - platform.originalY) < 4
      ));
      if (support) adjustedY += support.y - support.originalY;
    }
    const hazard = {
      id: `hazard:${hazardSerial++}`,
      adminWorldType: "hazard",
      x,
      y: adjustedY,
      w,
      h,
      kind,
      phase,
      active: true,
    };
    hazard.adminWorldBase = { x, y: adjustedY, w, h, kind, phase, active: true, hidden: false };
    hazards.push(hazard);
    return hazard;
  }

  function addCheckpoint(x, y, label, checkpointKey = null) {
    checkpoints.push({ x, y, w: 32, h: 88, label, checkpointKey, active: false });
  }

  function checkpointSpawnIsSafe(x, y) {
    const body = { x, y, w: player.w, h: player.h };
    const clearance = { x: x - 18, y: y - 10, w: player.w + 36, h: player.h + 18 };
    const blocked = platforms.some((platform) => !platform.hidden && overlaps(body, platform));
    const hazardous = hazards.some((hazard) => !hazard.hidden && hazard.active !== false && overlaps(clearance, hazard));
    return !blocked && !hazardous;
  }

  function getCheckpointRespawnPosition(checkpoint) {
    const centerX = checkpoint.x + checkpoint.w / 2;
    const expectedFloorY = checkpoint.y + checkpoint.h;
    const zoneIndex = clamp(getZoneIndexAt(centerX), 0, zones.length - 1);
    const zone = zones[zoneIndex];
    const candidates = [];
    for (const platform of platforms) {
      if (platform.hidden || platform.w < player.w + 42) continue;
      if (zone && (platform.x + platform.w < zone.x || platform.x > zone.end)) continue;
      const inset = Math.min(34, Math.max(18, platform.w * 0.12));
      const minCenter = platform.x + inset;
      const maxCenter = platform.x + platform.w - inset;
      if (maxCenter <= minCenter) continue;
      const sampleCenters = [
        clamp(centerX, minCenter, maxCenter),
        clamp(platform.x + platform.w / 2, minCenter, maxCenter),
        clamp(centerX - 72, minCenter, maxCenter),
        clamp(centerX + 72, minCenter, maxCenter),
      ];
      for (const sampleCenter of sampleCenters) {
        const spawnX = clamp(sampleCenter - player.w / 2, 0, WORLD_W - player.w);
        const spawnY = platform.y - player.h - 1;
        if (!checkpointSpawnIsSafe(spawnX, spawnY)) continue;
        const score = Math.abs(sampleCenter - centerX) + Math.abs(platform.y - expectedFloorY) * 1.45;
        candidates.push({ x: spawnX, y: spawnY, floorY: platform.y, score });
      }
    }
    candidates.sort((first, second) => first.score - second.score);
    if (candidates[0]) return { x: candidates[0].x, y: candidates[0].y };
    return {
      x: clamp(centerX - player.w / 2, 0, WORLD_W - player.w),
      y: expectedFloorY - player.h - 1,
    };
  }

  function normalizeCheckpointPlacements() {
    for (const checkpoint of checkpoints) {
      const position = getCheckpointRespawnPosition(checkpoint);
      const floorY = position.y + player.h + 1;
      checkpoint.x = clamp(position.x + player.w / 2 - checkpoint.w / 2, 0, WORLD_W - checkpoint.w);
      checkpoint.y = floorY - checkpoint.h;
    }
    const activeCheckpoint = checkpoints.find((checkpoint) => checkpoint.active);
    if (activeCheckpoint) {
      const position = getCheckpointRespawnPosition(activeCheckpoint);
      player.respawnX = position.x;
      player.respawnY = position.y;
    }
  }

  function setRespawnCheckpoint(checkpoint, checkpointIndex = checkpoints.indexOf(checkpoint)) {
    const position = getCheckpointRespawnPosition(checkpoint);
    checkpoints.forEach((item) => { item.active = false; });
    checkpoint.active = true;
    player.respawnX = position.x;
    player.respawnY = position.y;
    player.respawnStage = getStageIndexAt(checkpoint.x);
    player.respawnZone = getZoneIndexAt(checkpoint.x);
    player.respawnCheckpointIndex = checkpointIndex;
    player.respawnCheckpointKey = checkpoint.checkpointKey || `${player.respawnStage}:${checkpointIndex % ZONES_PER_STAGE}`;
    return position;
  }

  function activateCheckpoint(checkpoint) {
    const checkpointIndex = checkpoints.indexOf(checkpoint);
    if (checkpointIndex < 0 || checkpointIndex <= player.respawnCheckpointIndex) return false;
    setRespawnCheckpoint(checkpoint, checkpointIndex);
    player.hp = player.maxHp;
    player.airJumpAvailable = true;
    game.hint = `${checkpoint.label} 체크포인트 확보`;
    game.hintTimer = 3;
    spawnParticles(checkpoint.x + 16, checkpoint.y + 30, palette.cyan, 18, 300, 0.7, 220);
    sound.checkpoint();
    saveCampaign();
    return true;
  }

  function addPickup(x, y, kind = "repair") {
    pickups.push({ id: `pickup:${pickupSerial++}`, x, y, w: 24, h: 24, kind, active: true, bob: hash(x) * TAU });
  }

  function removeEmbeddedRepairPickups() {
    let removed = 0;
    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      const pickup = pickups[index];
      if (pickup.kind !== "repair" || pickup.adminPlaced) continue;
      const centerX = pickup.x + pickup.w / 2;
      const centerY = pickup.y + pickup.h / 2;
      const embedded = platforms.some((platform) => (
        !platform.hidden
        && centerX > platform.x + 4
        && centerX < platform.x + platform.w - 4
        && centerY > platform.y + 4
        && centerY < platform.y + platform.h - 4
      ));
      if (!embedded) continue;
      pickups.splice(index, 1);
      removed += 1;
    }
    return removed;
  }

  function addBoostNode(x, y, launchX = 0, launchY = -430) {
    boostNodes.push({ id: `boost:${boostSerial++}`, x, y, w: 38, h: 38, launchX, launchY, hitAttackId: -1, pulse: hash(x + y) * TAU });
  }

  function addSign(x, y, text, sub = "") {
    const sign = {
      id: `sign:${signSerial++}`,
      adminWorldType: "sign",
      x,
      y,
      w: 174,
      h: 60,
      text,
      sub,
    };
    sign.adminWorldBase = { x, y, w: 174, h: 60, text, sub, hidden: false };
    signs.push(sign);
    return sign;
  }

  function getZoneSignSub(zone, localZoneIndex) {
    const routeLabels = {
      scrapCrane: "크레인 환승 / 공중 잔해",
      furnacePiston: "왕복 피스톤 / 증기 간격",
      cathedralNave: "수직 예배당 / 부유 제단",
      antennaShaft: "안테나 첨탑 / 폭풍 도약",
      memoryLabyrinth: "비대칭 미궁 / 거울 분기",
      terrace: "층계 전투 / 상단 우회",
      chasm: "낙하 주의 / 도약 지점",
      crusher: "압축 설비 / 봉쇄 전투",
      vertical: "수직 통로 / 고저차 교전",
      fork: "분기 통로 / 보급품 탐색",
      gauntlet: "집중 봉쇄 / 전원 격파",
      wreckfield: "잔해 지대 / 불안정 발판",
      bridge: "장거리 교량 / 교차 동선",
      zigzag: "굴절 회랑 / 시야 주의",
      cavern: "매몰층 / 천장 구조물",
      conveyor: "운반선 / 증기 분출",
      spiral: "나선 승강로 / 상승 동선",
      archiveMaze: "기록 미로 / 벽면 통로",
      towerClimb: "송신탑 / 수직 상승",
      mirrorMaze: "거울 회랑 / 반사 장치",
      midboss: "중간 관문 / 강적 신호",
      boss: "최종 관문 / 주 기록 수호자",
    };
    return `${zone.code} · 구역 ${localZoneIndex + 1}/${ZONES_PER_STAGE} · ${routeLabels[zone.template] || "작전 진행"}`;
  }

  function removeInitiallyOffscreenEnemies() {
    // 전체 월드는 가로로 길기 때문에 X 위치는 검사하지 않는다.
    // 생성 직후 위·아래 화면 범위를 완전히 벗어난 잘못된 배치만 배열에서 제거한다.
    let removed = 0;
    for (let index = enemies.length - 1; index >= 0; index -= 1) {
      const enemy = enemies[index];
      const outsideVerticalScreen = !Number.isFinite(enemy.y)
        || enemy.y + enemy.h <= 0
        || enemy.y >= H;
      if (!outsideVerticalScreen) continue;
      enemies.splice(index, 1);
      removed += 1;
    }
    return removed;
  }

  function isStationaryTurret(enemyOrType) {
    const type = typeof enemyOrType === "string" ? enemyOrType : enemyOrType?.type;
    return type === "turret" || type === "mortarTurret";
  }

  function addEnemy(type, x, surfaceY, range = 150) {
    const stageIndex = getStageIndexAt(x);
    const sizes = {
      runner: [42, 52, 2],
      gunner: [44, 58, 3],
      machinegun: [48, 60, 4],
      turret: [58, 50, TURRET_BASE_HP],
      mortarTurret: [66, 62, MORTAR_TURRET_BASE_HP],
      piercer: [46, 58, 3],
      mortar: [54, 64, 4],
      drone: [50, 34, 1],
      shield: [50, 66, SHIELD_BASE_HP],
      boss: [...(BOSS_DEFINITIONS[stages[stageIndex].bossKind]?.size || [78, 92]), 16],
    };
    const [w, h, baseHp] = sizes[type];
    const stageHpBonus = Math.floor(stageIndex * 0.75);
    const hp = type === "boss"
      ? baseHp
      : type === "drone"
        ? 1
        : type === "turret"
          ? Math.ceil((SHIELD_BASE_HP + stageHpBonus) * 1.5)
          : type === "mortarTurret"
            ? MORTAR_TURRET_BASE_HP + stageHpBonus
          : baseHp + stageHpBonus;
    const support = type === "drone" ? null : platforms.find((platform) => (
      x + w / 2 >= platform.x
      && x + w / 2 <= platform.x + platform.w
      && Math.abs(surfaceY - platform.originalY) < 4
    ));
    const adjustedSurfaceY = support ? support.y : surfaceY;
    const enemy = {
      id: `${stageIndex}:${type}:${Math.round(x)}`,
      type,
      x,
      y: type === "drone" ? surfaceY : adjustedSurfaceY - h,
      baseY: type === "drone" ? surfaceY : adjustedSurfaceY - h,
      spawnX: x,
      spawnY: type === "drone" ? surfaceY : adjustedSurfaceY - h,
      w,
      h,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      alive: true,
      facing: -1,
      originX: x,
      stageIndex,
      homeZoneIndex: getZoneIndexAt(x),
      range,
      cooldown: hash(x) * 1.4,
      windup: 0,
      rushTimer: 0,
      rushDirection: 0,
      burstRemaining: 0,
      burstInterval: 0,
      burstSequence: 0,
      turretChargeDuration: 0,
      turretRecoil: 0,
      burnTimer: 0,
      burnTickTimer: 0,
      staggerHitCount: 0,
      staggerHitTimer: 0,
      retreatTimer: 0,
      retreatDirection: 0,
      hurt: 0,
      anim: hash(x) * 5,
      hitAttackId: -1,
      hitShotId: -1,
      blockedAttackId: -1,
      shieldGuard: type === "shield" ? SHIELD_GUARD_HITS : 0,
      shieldGuardMax: type === "shield" ? SHIELD_GUARD_HITS : 0,
      shieldBreakTimer: 0,
      shieldGuardRegen: 0,
      bossPhase: 0,
      bossKind: null,
      halfPhaseTriggered: false,
      summonCooldown: 6.5,
      summonCount: 0,
      barrierTimer: 0,
      barrierCooldown: 3.2,
      reflectTimer: 0,
      reflectCooldown: 2.8,
      reflectBreakTimer: 0,
      dashDirection: 0,
      dashRange: 0,
      funnelCooldown: 0,
      countedKill: false,
    };
    enemies.push(enemy);
    return enemy;
  }

  function getCombatRoomForEnemy(enemy) {
    if (!Number.isFinite(enemy?.squadRoomLeft)) return null;
    return combatRooms.find((room) => room.left === enemy.squadRoomLeft) || null;
  }

  function ensureShieldState(enemy) {
    if (enemy?.type !== "shield") return false;
    enemy.shieldGuardMax = SHIELD_GUARD_HITS;
    if (!Number.isFinite(enemy.shieldGuard)) enemy.shieldGuard = SHIELD_GUARD_HITS;
    if (!Number.isFinite(enemy.shieldBreakTimer)) enemy.shieldBreakTimer = 0;
    if (!Number.isFinite(enemy.shieldGuardRegen)) enemy.shieldGuardRegen = 0;
    enemy.shieldGuard = clamp(enemy.shieldGuard, 0, SHIELD_GUARD_HITS);
    return enemy.shieldBreakTimer <= 0 && enemy.shieldGuard > 0;
  }

  function getEnemyFormation(enemy) {
    const room = getCombatRoomForEnemy(enemy);
    if (!room || !room.triggered || room.cleared || !room.anchorAlive || game.adminMode) return null;
    return SQUAD_FORMATIONS[room.formationAnchorType] || null;
  }

  function configureCombatRooms() {
    const anchorTypes = ["shield", "drone", "mortar", "piercer"];
    combatRooms.forEach((room, roomIndex) => {
      const members = enemies.filter((enemy) => enemy.type !== "boss" && enemy.originX > room.left && enemy.originX < room.right);
      const preferred = anchorTypes.map((_, offset) => anchorTypes[(roomIndex + offset) % anchorTypes.length]);
      const formationAnchorType = preferred.find((type) => members.some((enemy) => enemy.type === type)) || members[0]?.type || "shield";
      const formation = SQUAD_FORMATIONS[formationAnchorType] || SQUAD_FORMATIONS.shield;
      const profile = TERRAIN_PROFILES[room.stageIndex] || TERRAIN_PROFILES[0];
      Object.assign(room, {
        formationAnchorType,
        formationId: formation.id,
        formationName: formation.name,
        formationTarget: formation.target,
        formationDescription: formation.description,
        formationAccent: formation.accent,
        anchorAlive: members.some((enemy) => enemy.type === formationAnchorType && enemy.alive),
        terrainName: profile.name,
        terrainAccent: profile.accent,
        terrainInterval: profile.interval,
        terrainAmplitude: profile.amplitude,
        terrainSpeed: profile.speed,
        terrainTimer: 0,
        terrainStep: 0,
        terrainPlatforms: [],
      });

      for (const enemy of members) {
        enemy.squadRoomLeft = room.left;
        enemy.squadRole = enemy.type === formationAnchorType ? "anchor" : "support";
      }

      const candidates = platforms
        .filter((platform) => (
          platform.h <= 36
          && platform.x + platform.w / 2 > room.left + 100
          && platform.x + platform.w / 2 < room.right - 100
        ))
        .sort((first, second) => first.x - second.x);
      const selectedIndexes = [...new Set([0, Math.floor((candidates.length - 1) / 2), candidates.length - 1])]
        .filter((index) => index >= 0 && candidates[index]);
      room.terrainPlatforms = selectedIndexes.map((index, dynamicIndex) => {
        const platform = candidates[index];
        platform.dynamicRoomLeft = room.left;
        platform.dynamicIndex = dynamicIndex;
        platform.dynamicAccent = profile.accent;
        return platform;
      });
    });
  }

  function carryEntityWithPlatform(entity, platform, previousY, deltaY) {
    if (!entity?.grounded || Math.abs(entity.y + entity.h - previousY) > 9) return;
    if (entity.x + entity.w <= platform.x + 3 || entity.x >= platform.x + platform.w - 3) return;
    entity.y += deltaY;
  }

  function updateCombatTerrain(dt, activeEnemies = getActiveEnemies()) {
    for (const room of combatRooms) {
      const nearRoom = player.x > room.left - 220 && player.x < room.right + 220;
      const active = room.triggered && !room.cleared && !game.adminMode && nearRoom;
      if (active) room.terrainTimer += dt;
      const nextStep = active ? Math.floor(room.terrainTimer / room.terrainInterval) : 0;
      if (active && nextStep > room.terrainStep) {
        room.terrainStep = nextStep;
        game.hint = `전장 재배열 ${nextStep}단계 · ${room.terrainName}`;
        game.hintTimer = 2.4;
        sound.tone(155 + room.stageIndex * 34, 0.16, "sawtooth", 0.025, 1.45);
      } else if (!active) {
        room.terrainStep = 0;
        room.terrainTimer = 0;
      }

      for (const platform of room.terrainPlatforms || []) {
        const shouldRise = active && nextStep > 0 && (nextStep + platform.dynamicIndex) % 2 === 0;
        const targetY = platform.originalY - (shouldRise ? room.terrainAmplitude : 0);
        const previousY = platform.y;
        platform.y = moveToward(platform.y, targetY, room.terrainSpeed * dt);
        const deltaY = platform.y - previousY;
        if (Math.abs(deltaY) < 0.001) continue;
        carryEntityWithPlatform(player, platform, previousY, deltaY);
        for (const enemy of activeEnemies) {
          if (enemy.alive && enemy.type !== "drone") carryEntityWithPlatform(enemy, platform, previousY, deltaY);
        }
      }
    }
  }

  function readAdminRemovedEnemies() {
    try {
      const raw = window.localStorage?.getItem(ADMIN_REMOVED_ENEMIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    } catch {
      return new Set();
    }
  }

  function persistAdminRemovedEnemies() {
    try {
      window.localStorage?.setItem(ADMIN_REMOVED_ENEMIES_KEY, JSON.stringify([...adminRemovedEnemyIds]));
    } catch {
      // Permanent administrator removal remains active for this session if storage is blocked.
    }
  }

  function readAdminRemovedObjects() {
    try {
      const raw = window.localStorage?.getItem(ADMIN_REMOVED_OBJECTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    } catch {
      return new Set();
    }
  }

  function persistAdminRemovedObjects() {
    try {
      window.localStorage?.setItem(ADMIN_REMOVED_OBJECTS_KEY, JSON.stringify([...adminRemovedObjectIds]));
    } catch {
      // Base pickups and jump pads stay removed for this session if storage is unavailable.
    }
  }

  function readAdminSpawnedEnemies() {
    try {
      const raw = window.localStorage?.getItem(ADMIN_SPAWNED_ENEMIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      const seenIds = new Set();
      return parsed.filter((record) => {
        if (!record || typeof record.id !== "string" || seenIds.has(record.id)) return false;
        if (!ADMIN_SPAWN_TYPES.has(record.type)) return false;
        if (!Number.isFinite(Number(record.x)) || !Number.isFinite(Number(record.y))) return false;
        seenIds.add(record.id);
        return true;
      }).slice(-MAX_ADMIN_SPAWNED_ENEMIES);
    } catch {
      return [];
    }
  }

  function persistAdminSpawnedEnemies() {
    try {
      window.localStorage?.setItem(ADMIN_SPAWNED_ENEMIES_KEY, JSON.stringify(adminSpawnedEnemyData));
    } catch {
      // Administrator additions remain active for this session if storage is blocked.
    }
  }

  function createAdminSpawnId(type, stageIndex) {
    adminSpawnSerial += 1;
    return `admin-spawn:${Date.now().toString(36)}:${adminSpawnSerial.toString(36)}:${stageIndex}:${type}`;
  }

  function recordAdminSpawnedEnemy(enemy) {
    if (!enemy?.adminSpawned) return;
    const record = {
      id: enemy.id,
      type: enemy.type,
      x: enemy.spawnX,
      y: enemy.spawnY,
      stageIndex: enemy.stageIndex,
      homeZoneIndex: enemy.homeZoneIndex,
      bossKind: enemy.bossKind || null,
      range: enemy.range,
    };
    adminSpawnedEnemyData = adminSpawnedEnemyData.filter((saved) => saved.id !== enemy.id);
    adminSpawnedEnemyData.push(record);
    if (adminSpawnedEnemyData.length > MAX_ADMIN_SPAWNED_ENEMIES) {
      adminSpawnedEnemyData = adminSpawnedEnemyData.slice(-MAX_ADMIN_SPAWNED_ENEMIES);
    }
    persistAdminSpawnedEnemies();
  }

  function removeAdminSpawnedEnemyData(enemyId) {
    const next = adminSpawnedEnemyData.filter((record) => record.id !== enemyId);
    if (next.length === adminSpawnedEnemyData.length) return;
    adminSpawnedEnemyData = next;
    persistAdminSpawnedEnemies();
  }

  function readAdminPlacedObjects() {
    try {
      const raw = window.localStorage?.getItem(ADMIN_PLACED_OBJECTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      const seenIds = new Set();
      return parsed.filter((record) => {
        if (!record || typeof record.id !== "string" || seenIds.has(record.id)) return false;
        if (!ADMIN_PLACE_TYPES.has(record.type)) return false;
        if (!Number.isFinite(Number(record.x)) || !Number.isFinite(Number(record.y))) return false;
        seenIds.add(record.id);
        return true;
      }).slice(-MAX_ADMIN_PLACED_OBJECTS);
    } catch {
      return [];
    }
  }

  function persistAdminPlacedObjects() {
    try {
      window.localStorage?.setItem(ADMIN_PLACED_OBJECTS_KEY, JSON.stringify(adminPlacedObjectData));
    } catch {
      // Administrator placements remain active for this session if storage is blocked.
    }
  }

  function readAdminWorldEdits() {
    try {
      const raw = window.localStorage?.getItem(ADMIN_WORLD_EDITS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      const validTypes = new Set(["platform", "hazard", "sign", "backdrop"]);
      const seenIds = new Set();
      return parsed.filter((record) => {
        if (!record || typeof record.id !== "string" || seenIds.has(record.id)) return false;
        if (!validTypes.has(record.type)) return false;
        if (!Number.isFinite(Number(record.x)) || !Number.isFinite(Number(record.y))) return false;
        seenIds.add(record.id);
        return true;
      }).slice(-MAX_ADMIN_WORLD_EDITS);
    } catch {
      return [];
    }
  }

  function persistAdminWorldEdits() {
    try {
      window.localStorage?.setItem(ADMIN_WORLD_EDITS_KEY, JSON.stringify(adminWorldEditData));
    } catch {
      // World edits stay active for this session if storage is unavailable.
    }
  }

  function serializeAdminWorldObject(object) {
    return {
      id: object.id,
      type: object.adminWorldType,
      custom: Boolean(object.adminWorldCustom),
      x: Number(object.x) || 0,
      y: Number(object.y) || 0,
      w: Number(object.w) || 24,
      h: Number(object.h) || 24,
      kind: String(object.kind || ""),
      text: String(object.text || "").slice(0, 80),
      sub: String(object.sub || "").slice(0, 120),
      phase: Number(object.phase) || 0,
      hidden: Boolean(object.hidden),
    };
  }

  function recordAdminWorldObject(object) {
    if (!object?.id || !object.adminWorldType) return;
    const record = serializeAdminWorldObject(object);
    adminWorldEditData = adminWorldEditData.filter((saved) => saved.id !== object.id);
    adminWorldEditData.push(record);
    if (adminWorldEditData.length > MAX_ADMIN_WORLD_EDITS) {
      adminWorldEditData = adminWorldEditData.slice(-MAX_ADMIN_WORLD_EDITS);
    }
    persistAdminWorldEdits();
  }

  function removeAdminWorldObjectData(objectId) {
    adminWorldEditData = adminWorldEditData.filter((record) => record.id !== objectId);
    persistAdminWorldEdits();
  }

  function findAdminWorldObject(id, type) {
    const source = type === "platform"
      ? platforms
      : type === "hazard"
        ? hazards
        : type === "sign"
          ? signs
          : adminBackdrops;
    return source.find((object) => object.id === id) || null;
  }

  function addAdminBackdrop(record) {
    const backdrop = {
      id: record.id,
      adminWorldType: "backdrop",
      adminWorldCustom: true,
      x: Number(record.x) || 0,
      y: Number(record.y) || 0,
      w: Math.max(24, Number(record.w) || 260),
      h: Math.max(24, Number(record.h) || 180),
      kind: String(record.kind || "panel"),
      text: String(record.text || "ADMIN STRUCTURE"),
      sub: String(record.sub || "EDITABLE BACKDROP"),
      hidden: Boolean(record.hidden),
    };
    backdrop.adminWorldBase = { ...serializeAdminWorldObject(backdrop), hidden: false };
    adminBackdrops.push(backdrop);
    return backdrop;
  }

  function applyAdminWorldEdits() {
    for (const record of adminWorldEditData) {
      if (record.custom) {
        let customObject = null;
        if (record.type === "backdrop") customObject = addAdminBackdrop(record);
        else if (record.type === "sign") customObject = addSign(Number(record.x), Number(record.y), record.text || "", record.sub || "");
        else if (record.type === "platform") customObject = addPlatform(Number(record.x), Number(record.y), Number(record.w) || 260, Number(record.h) || 28, record.kind || "factory");
        else if (record.type === "hazard") customObject = addHazard(Number(record.x), Number(record.y), Number(record.w) || 140, Number(record.h) || 24, record.kind || "spike", Number(record.phase) || 0);
        if (customObject) {
          customObject.id = record.id;
          customObject.adminWorldCustom = true;
          customObject.x = clamp(Number(record.x), 0, WORLD_W - 12);
          customObject.y = clamp(Number(record.y), -600, WORLD_H - 8);
          customObject.w = clamp(Number(record.w) || customObject.w, 12, 1800);
          customObject.h = clamp(Number(record.h) || customObject.h, 8, 900);
          customObject.kind = String(record.kind || customObject.kind || "roof");
          customObject.text = String(record.text || customObject.text || "").slice(0, 80);
          customObject.sub = String(record.sub || customObject.sub || "").slice(0, 120);
          customObject.hidden = Boolean(record.hidden);
          if (record.type === "platform") customObject.originalY = customObject.y;
          customObject.adminWorldBase = { ...serializeAdminWorldObject(customObject), hidden: false };
        }
        continue;
      }
      const object = findAdminWorldObject(record.id, record.type);
      if (!object) continue;
      object.x = clamp(Number(record.x), 0, WORLD_W - 12);
      object.y = clamp(Number(record.y), -600, WORLD_H - 8);
      object.w = clamp(Number(record.w) || object.w, 12, 1800);
      object.h = clamp(Number(record.h) || object.h, 8, 900);
      object.kind = String(record.kind || object.kind || "roof");
      object.text = String(record.text || object.text || "").slice(0, 80);
      object.sub = String(record.sub || object.sub || "").slice(0, 120);
      object.hidden = Boolean(record.hidden);
      if (object.adminWorldType === "platform") object.originalY = object.y;
    }
  }

  function recordAdminPlacedObject(object) {
    if (!object?.adminPlaced || !ADMIN_PLACE_TYPES.has(object.adminType)) return;
    const record = {
      id: object.id,
      type: object.adminType,
      x: object.x,
      y: object.y,
      launchX: object.launchX || 0,
      launchY: object.launchY || -560,
    };
    adminPlacedObjectData = adminPlacedObjectData.filter((saved) => saved.id !== object.id);
    adminPlacedObjectData.push(record);
    if (adminPlacedObjectData.length > MAX_ADMIN_PLACED_OBJECTS) {
      adminPlacedObjectData = adminPlacedObjectData.slice(-MAX_ADMIN_PLACED_OBJECTS);
    }
    persistAdminPlacedObjects();
  }

  function removeAdminPlacedObjectData(objectId) {
    const next = adminPlacedObjectData.filter((record) => record.id !== objectId);
    if (next.length === adminPlacedObjectData.length) return;
    adminPlacedObjectData = next;
    persistAdminPlacedObjects();
  }

  function restoreAdminPlacedObjects() {
    for (const record of adminPlacedObjectData) {
      const x = clamp(Number(record.x), 0, WORLD_W - 40);
      const y = clamp(Number(record.y), -80, WORLD_H - 24);
      const object = record.type === "repair"
        ? (addPickup(x, y, "repair"), pickups[pickups.length - 1])
        : (addBoostNode(x, y, Number(record.launchX) || 0, Number(record.launchY) || -560), boostNodes[boostNodes.length - 1]);
      object.id = record.id;
      object.adminPlaced = true;
      object.adminType = record.type;
    }
  }

  function restoreAdminSpawnedEnemies() {
    for (const record of adminSpawnedEnemyData) {
      const rawX = Number(record.x);
      const rawY = Number(record.y);
      const x = clamp(rawX, 0, WORLD_W - 1);
      const stageIndex = Number.isInteger(record.stageIndex)
        ? clamp(record.stageIndex, 0, stages.length - 1)
        : getStageIndexAt(x);
      const enemy = addEnemy(record.type, x, rawY, Number.isFinite(record.range) ? record.range : 220);
      enemy.adminSpawned = true;
      enemy.id = record.id;
      enemy.stageIndex = stageIndex;
      enemy.homeZoneIndex = Number.isInteger(record.homeZoneIndex)
        ? clamp(record.homeZoneIndex, 0, zones.length - 1)
        : getZoneIndexAt(x);
      enemy.x = clamp(x, 0, WORLD_W - enemy.w);
      enemy.y = clamp(rawY, -enemy.h * 2, WORLD_H - enemy.h);
      enemy.originX = enemy.x;
      enemy.spawnX = enemy.x;
      enemy.spawnY = enemy.y;
      enemy.baseY = enemy.y;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.alive = true;
      enemy.countedKill = false;
      if (enemy.type !== "boss") continue;
      enemy.bossKind = BOSS_DEFINITIONS[record.bossKind]
        ? record.bossKind
        : stages[stageIndex].bossKind;
      const definition = BOSS_DEFINITIONS[enemy.bossKind];
      enemy.hp = definition.hp;
      enemy.maxHp = definition.hp;
      if (enemy.bossKind === "echo") {
        enemy.w = player.w;
        enemy.h = player.h;
        enemy.x = clamp(x, 0, WORLD_W - enemy.w);
        enemy.y = clamp(rawY, -enemy.h * 2, WORLD_H - enemy.h);
        enemy.originX = enemy.x;
        enemy.spawnX = enemy.x;
        enemy.spawnY = enemy.y;
        enemy.baseY = enemy.y;
      }
    }
  }

  function applyAdminRemovedEnemyData() {
    for (const enemy of enemies) {
      if (!adminRemovedEnemyIds.has(enemy.id)) continue;
      // Never let old administrator deletion data remove the story's final duel.
      if (!enemy.adminSpawned && enemy.type === "boss" && enemy.bossKind === "echo") continue;
      enemy.alive = false;
      enemy.hp = 0;
      enemy.countedKill = false;
    }
  }

  function syncAdminRemovedBossState() {
    for (const enemy of enemies) {
      if (enemy.type !== "boss" || !adminRemovedEnemyIds.has(enemy.id)) continue;
      const kind = enemy.bossKind || stages[enemy.stageIndex]?.bossKind;
      if (!enemy.adminSpawned && kind === "echo") continue;
      if (kind) game.defeatedBosses.add(kind);
    }
    game.stageBossDefeated = game.defeatedBosses.has("warden");
    game.bossDefeated = game.defeatedBosses.has("echo");
  }

  function buildLegacyLevel() {
    platforms.length = 0;
    hazards.length = 0;
    checkpoints.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    pickups.length = 0;
    signs.length = 0;
    boostNodes.length = 0;
    combatRooms.length = 0;

    const floorSpans = [
      [0, 1800, 620], [2040, 1710, 620], [3970, 1880, 650],
      [6100, 1320, 620], [7640, 1480, 620], [9350, 1810, 650],
      [11420, 1430, 620], [13100, 1850, 660], [15190, 1350, 620],
      [16800, 1820, 640], [18860, 1680, 620], [20800, 3200, 620],
      [24000, 1240, 640], [25420, 1380, 620], [27000, 1580, 660],
      [28780, 1400, 620], [30380, 1420, 650], [32000, 1320, 620],
      [33480, 2520, 640],
    ];
    floorSpans.forEach(([x, w, y], index) => addPlatform(x, y, w, WORLD_H - y, index % 3 === 2 ? "factory" : "roof"));

    // 01 · 기초 이동과 이중 점프를 익히는 빗속 옥상
    addPlatform(520, 500, 230, 28);
    addPlatform(920, 430, 250, 28);
    addPlatform(1340, 520, 220, 28);
    addPlatform(1800, 550, 180, 26);
    addHazard(1510, 598, 90, 22);
    addEnemy("runner", 820, 620, 130);
    addEnemy("runner", 1250, 620, 170);
    addEnemy("gunner", 1635, 620, 90);
    addPickup(1030, 380);
    addSign(270, 475, "청우동", "통제구역 17-B");

    // 02 · 화물선과 낮은 천장
    addPlatform(2200, 510, 260, 30, "cargo");
    addPlatform(2570, 450, 300, 30, "cargo");
    addPlatform(2980, 530, 260, 30, "cargo");
    addPlatform(3320, 420, 330, 30, "cargo");
    addPlatform(3750, 560, 170, 26, "cargo");
    addHazard(2380, 598, 120, 22);
    addHazard(3430, 398, 74, 22);
    addEnemy("runner", 2250, 510, 100);
    addEnemy("gunner", 2750, 450, 100);
    addEnemy("drone", 3150, 330, 170);
    addEnemy("shield", 3520, 620, 120);
    addEnemy("runner", 4100, 650, 190);
    addPickup(3460, 365);
    addSign(3110, 340, "동부 화물선", "운행 정지");

    // 03 · 상승 루트를 선택할 수 있는 붉은 제련소
    addPlatform(4160, 520, 250, 28, "factory");
    addPlatform(4510, 420, 230, 28, "factory");
    addPlatform(4850, 320, 300, 28, "factory");
    addPlatform(5260, 420, 240, 28, "factory");
    addPlatform(5580, 520, 260, 28, "factory");
    addPlatform(5850, 570, 210, 26, "factory");
    addHazard(4420, 628, 160, 22);
    addHazard(5350, 628, 180, 22);
    addEnemy("runner", 4270, 520, 90);
    addEnemy("gunner", 4620, 420, 80);
    addEnemy("drone", 5000, 230, 230);
    addEnemy("runner", 5350, 420, 90);
    addEnemy("shield", 5700, 520, 100);
    addEnemy("gunner", 6250, 620, 130);
    addPickup(5000, 270);
    addSign(4930, 560, "赤雲", "제03 용광로");

    // 04 · 긴 고가교, 비행 적과 연속 처치 구간
    addPlatform(6350, 490, 260, 26);
    addPlatform(6750, 390, 220, 26);
    addPlatform(7080, 500, 260, 26);
    addPlatform(7420, 555, 170, 26);
    addPlatform(7860, 470, 240, 26);
    addPlatform(8240, 370, 280, 26);
    addPlatform(8660, 470, 260, 26);
    addPlatform(9120, 560, 190, 26);
    addHazard(6870, 598, 110, 22);
    addHazard(8450, 598, 110, 22);
    addEnemy("drone", 6500, 340, 190);
    addEnemy("runner", 7000, 620, 130);
    addEnemy("drone", 7480, 330, 180);
    addEnemy("gunner", 8000, 470, 90);
    addEnemy("drone", 8420, 270, 220);
    addEnemy("shield", 8800, 620, 160);
    addEnemy("gunner", 9500, 650, 120);
    addPickup(8360, 320);
    addSign(7800, 315, "무명교", "풍속 32 m/s");

    // 05 · 흰 가면 연구동, 방패병을 위에서 파훼
    addPlatform(9560, 510, 260, 30, "lab");
    addPlatform(9920, 400, 240, 30, "lab");
    addPlatform(10280, 510, 280, 30, "lab");
    addPlatform(10680, 390, 250, 30, "lab");
    addPlatform(11160, 540, 210, 26, "lab");
    addPlatform(11620, 470, 250, 30, "lab");
    addPlatform(12000, 370, 270, 30, "lab");
    addPlatform(12410, 490, 250, 30, "lab");
    addPlatform(12840, 570, 210, 26, "lab");
    addHazard(10080, 628, 130, 22);
    addHazard(11870, 598, 115, 22);
    addEnemy("shield", 9700, 510, 90);
    addEnemy("gunner", 10040, 400, 70);
    addEnemy("shield", 10410, 510, 100);
    addEnemy("drone", 10800, 290, 160);
    addEnemy("runner", 11240, 540, 80);
    addEnemy("piercer", 11730, 470, 90);
    addEnemy("shield", 12150, 620, 120);
    addEnemy("drone", 12520, 330, 190);
    addEnemy("runner", 13300, 660, 150);
    addPickup(10800, 340);
    addSign(10440, 330, "백면원", "관계자 외 금지");

    // 06 · 주기적으로 켜지는 수직 레이저
    addPlatform(13340, 520, 270, 26);
    addPlatform(13740, 410, 220, 26);
    addPlatform(14090, 510, 250, 26);
    addPlatform(14470, 390, 260, 26);
    addPlatform(14950, 560, 190, 26);
    addPlatform(15350, 460, 230, 26);
    addPlatform(15700, 350, 250, 26);
    addPlatform(16080, 470, 260, 26);
    addPlatform(16540, 560, 210, 26);
    addHazard(13620, 260, 24, 360, "laser", 0.1);
    addHazard(14380, 210, 24, 450, "laser", 0.6);
    addHazard(15260, 250, 24, 370, "laser", 1.25);
    addHazard(16120, 180, 24, 440, "laser", 1.8);
    addEnemy("runner", 13480, 520, 90);
    addEnemy("drone", 13920, 300, 170);
    addEnemy("gunner", 14200, 510, 90);
    addEnemy("shield", 14610, 390, 80);
    addEnemy("drone", 15450, 320, 190);
    addEnemy("mortar", 15810, 350, 80);
    addEnemy("runner", 16300, 470, 100);
    addEnemy("shield", 17030, 640, 150);
    addPickup(14580, 340);
    addSign(14190, 570, "낙뢰선", "고압 주의");

    // 07 · 방벽 전투와 중간 보스
    addPlatform(17000, 510, 260, 28, "wall");
    addPlatform(17380, 400, 240, 28, "wall");
    addPlatform(17720, 510, 260, 28, "wall");
    addPlatform(18100, 390, 260, 28, "wall");
    addPlatform(18540, 560, 250, 26, "wall");
    addPlatform(19050, 480, 280, 28, "wall");
    addPlatform(19480, 370, 260, 28, "wall");
    addPlatform(19900, 490, 260, 28, "wall");
    addPlatform(20340, 560, 180, 26, "wall");
    addHazard(17600, 618, 120, 22);
    addHazard(19520, 598, 130, 22);
    addEnemy("gunner", 17130, 510, 80);
    addEnemy("drone", 17500, 280, 150);
    addEnemy("shield", 17850, 510, 100);
    addEnemy("runner", 18220, 390, 100);
    addEnemy("drone", 18700, 300, 180);
    addEnemy("shield", 19200, 480, 100);
    addEnemy("piercer", 19610, 370, 80);
    addEnemy("runner", 20100, 490, 90);
    addEnemy("shield", 20550, 620, 120);
    addPickup(19580, 320);
    addSign(18310, 330, "鬼門", "무단 접근 사살");

    // 08 · 보스 전초전과 동쪽 관문
    addPlatform(21050, 500, 280, 30, "gate");
    addPlatform(21460, 390, 260, 30, "gate");
    addPlatform(21850, 500, 250, 30, "gate");
    addHazard(21630, 598, 110, 22);
    addEnemy("runner", 21180, 500, 100);
    addEnemy("drone", 21600, 280, 170);
    addEnemy("mortar", 21950, 500, 100);
    addEnemy("boss", 22640, 620, 520);
    addSign(22300, 310, "동쪽 관문", "봉쇄 단계: 극");

    // 09 · 관문 아래로 흐르는 침묵 수로. 낮은 길과 공중 루트가 반복 교차한다.
    addPlatform(24160, 500, 260, 28, "channel");
    addPlatform(24520, 390, 240, 28, "channel");
    addPlatform(24870, 515, 270, 28, "channel");
    addPlatform(25240, 405, 250, 28, "channel");
    addPlatform(25610, 300, 270, 28, "channel");
    addPlatform(26000, 430, 260, 28, "channel");
    addPlatform(26370, 535, 260, 28, "channel");
    addPlatform(26720, 410, 240, 28, "channel");
    addHazard(24340, 618, 120, 22);
    addHazard(25020, 618, 130, 22);
    addHazard(25870, 250, 24, 370, "laser", 0.3);
    addHazard(26570, 598, 110, 22);
    addEnemy("runner", 24280, 500, 90);
    addEnemy("drone", 24630, 285, 170);
    addEnemy("piercer", 25010, 515, 90);
    addEnemy("shield", 25360, 405, 90);
    addEnemy("drone", 25740, 205, 180);
    addEnemy("runner", 26120, 430, 110);
    addEnemy("mortar", 26620, 640, 120);
    addSign(24330, 565, "무음 수로", "음성 기록 폐기 구역");
    addPickup(25720, 245);

    // 10 · 기억 보관고. 레이저 사이의 상하 루트를 빠르게 전환한다.
    addPlatform(27160, 500, 270, 30, "vault");
    addPlatform(27520, 380, 250, 30, "vault");
    addPlatform(27880, 270, 260, 30, "vault");
    addPlatform(28240, 410, 250, 30, "vault");
    addPlatform(28600, 520, 260, 30, "vault");
    addPlatform(28970, 390, 260, 30, "vault");
    addPlatform(29340, 280, 250, 30, "vault");
    addPlatform(29700, 480, 280, 30, "vault");
    addHazard(27460, 220, 24, 440, "laser", 0.1);
    addHazard(28170, 180, 24, 480, "laser", 0.8);
    addHazard(28890, 210, 24, 410, "laser", 1.45);
    addHazard(29620, 170, 24, 450, "laser", 2.0);
    addEnemy("shield", 27270, 500, 100);
    addEnemy("drone", 27630, 270, 170);
    addEnemy("piercer", 28000, 270, 80);
    addEnemy("runner", 28350, 410, 100);
    addEnemy("shield", 28720, 520, 100);
    addEnemy("drone", 29200, 250, 180);
    addEnemy("mortar", 29840, 480, 100);
    addSign(27720, 570, "기억 보관고", "M 계열 잔향 001—007");
    addPickup(29450, 230);

    // 11 · 월하 승강탑. 발판을 연속해서 오르내리는 수직 전투 구간.
    addPlatform(30140, 520, 250, 28, "tower");
    addPlatform(30490, 400, 240, 28, "tower");
    addPlatform(30830, 280, 250, 28, "tower");
    addPlatform(31180, 170, 270, 28, "tower");
    addPlatform(31570, 300, 250, 28, "tower");
    addPlatform(31930, 440, 270, 28, "tower");
    addPlatform(32320, 330, 250, 28, "tower");
    addPlatform(32680, 520, 280, 28, "tower");
    addHazard(30380, 628, 140, 22);
    addHazard(31090, 170, 24, 450, "laser", 0.45);
    addHazard(31850, 230, 24, 390, "laser", 1.25);
    addHazard(32590, 200, 24, 420, "laser", 2.1);
    addEnemy("runner", 30240, 520, 90);
    addEnemy("piercer", 30600, 400, 90);
    addEnemy("drone", 30960, 185, 170);
    addEnemy("shield", 31310, 170, 90);
    addEnemy("drone", 31720, 210, 190);
    addEnemy("mortar", 32060, 440, 100);
    addEnemy("shield", 32820, 520, 100);
    addSign(31240, 565, "月下昇降塔", "원본 관측소 직결");
    addPickup(31300, 115);

    // 12 · 원본 관측소. 넓은 결전장과 최종 봉쇄문.
    addPlatform(33140, 500, 270, 30, "origin");
    addPlatform(33520, 390, 260, 30, "origin");
    addPlatform(33900, 510, 260, 30, "origin");
    addPlatform(34280, 360, 250, 30, "origin");
    addPlatform(34640, 500, 260, 30, "origin");
    addPlatform(34980, 405, 250, 30, "origin");
    addPlatform(35330, 500, 240, 30, "origin");
    addHazard(33770, 618, 120, 22);
    addHazard(34490, 598, 130, 22);
    addEnemy("runner", 33270, 500, 100);
    addEnemy("drone", 33640, 280, 170);
    addEnemy("piercer", 34020, 510, 100);
    addEnemy("shield", 34400, 360, 90);
    addEnemy("drone", 34760, 270, 190);
    addEnemy("mortar", 35060, 405, 90);
    const originBoss = addEnemy("boss", 35120, 640, 620);
    originBoss.hp = 48;
    originBoss.maxHp = 48;
    addSign(34820, 565, "원본 관측소", "잔향 병합 절차 진행 중");
    addPickup(34680, 450);

    // 공격으로 재가동하는 관성 코어. 공중 적중 루프를 지형 이동에도 활용한다.
    addBoostNode(1890, 505, 330, -390);
    addBoostNode(3810, 510, 300, -430);
    addBoostNode(5960, 500, 340, -400);
    addBoostNode(7500, 450, 300, -470);
    addBoostNode(9240, 500, 330, -400);
    addBoostNode(12920, 500, 320, -440);
    addBoostNode(16710, 500, 350, -420);
    addBoostNode(20570, 490, 340, -430);
    addBoostNode(25180, 480, 330, -450);
    addBoostNode(26920, 360, 340, -430);
    addBoostNode(29930, 430, 330, -470);
    addBoostNode(32900, 470, 340, -450);

    // 벽차기와 벽 미끄러짐을 시험할 수 있는 좁은 수직 구조물.
    addPlatform(1980, 360, 42, 260, "cargo");
    addPlatform(7540, 330, 42, 290, "factory");
    addPlatform(13035, 360, 42, 300, "lab");
    addPlatform(16745, 320, 42, 320, "wall");
    addPlatform(26940, 340, 42, 320, "channel");
    addPlatform(29950, 300, 42, 320, "vault");
    addPlatform(32950, 300, 42, 320, "tower");

    combatRooms.push(
      { left: 6370, right: 9050, name: "무명교 공중 봉쇄", triggered: false, cleared: false },
      { left: 17020, right: 20480, name: "귀문 방벽 섬멸전", triggered: false, cleared: false },
      { left: 30120, right: 32880, name: "월하 승강탑 추격전", triggered: false, cleared: false },
    );

    [
      [150, 620, "작전 개시"],
      [3200, 620, "화물선"],
      [6250, 620, "제련소"],
      [9550, 650, "고가교"],
      [12180, 620, "연구동"],
      [15320, 620, "송전구"],
      [19000, 620, "귀문"],
      [21300, 620, "동쪽 관문"],
      [24400, 640, "침묵 수로"],
      [27400, 660, "기억 보관고"],
      [30400, 650, "월하 승강탑"],
      [33480, 640, "원본 관측소"],
    ].forEach(([x, y, label]) => addCheckpoint(x, y - 88, label));

    game.totalEnemies = enemies.length;
    initRain();
  }

  function buildLevel() {
    enemyZoneAuditAccumulator = 0;
    platformSerial = 0;
    hazardSerial = 0;
    signSerial = 0;
    pickupSerial = 0;
    boostSerial = 0;
    platforms.length = 0;
    hazards.length = 0;
    checkpoints.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    pickups.length = 0;
    signs.length = 0;
    adminBackdrops.length = 0;
    boostNodes.length = 0;
    combatRooms.length = 0;

    const baseFloorHeights = [
      [650, 690, 630, 710, 650, 670, 680, 640, 700, 660, 690, 650],
      [700, 720, 660, 700, 670, 690, 710, 650, 690, 720, 660, 680],
      [650, 690, 720, 630, 680, 660, 650, 710, 620, 690, 640, 670],
      [710, 670, 630, 720, 660, 680, 610, 690, 640, 700, 620, 660],
      [690, 620, 740, 600, 700, 650, 630, 680, 610, 720, 640, 670],
    ];
    const floorHeights = baseFloorHeights.map((row, stageIndex) => Array.from(
      { length: ZONES_PER_STAGE },
      (_, zoneIndex) => clamp(
        row[(zoneIndex * 5 + Math.floor(zoneIndex / 6) + stageIndex) % row.length]
          + ((zoneIndex % 4) - 1) * 10,
        590,
        740,
      ),
    ));
    const basePlatformKinds = {
      scrap: ["roof", "cargo", "factory", "cargo", "roof", "factory", "factory", "cargo", "roof", "factory", "cargo", "gate"],
      foundry: ["foundry", "channel", "crusher", "channel", "foundry", "turbine", "turbine", "crusher", "channel", "turbine", "channel", "gate"],
      archive: ["lab", "archive", "channel", "archive", "shrine", "lab", "lab", "archive", "shrine", "lab", "archive", "gate"],
      tower: ["rail", "city", "tower", "tower", "firewall", "array", "array", "city", "tower", "array", "firewall", "gate"],
      mirror: ["glass", "mirror", "habitat", "maze", "capsule", "arena", "arena", "glass", "mirror", "arena", "glass", "gate"],
    };
    const platformKinds = Object.fromEntries(Object.entries(basePlatformKinds).map(([kind, row]) => [
      kind,
      Array.from(
        { length: ZONES_PER_STAGE },
        (_, zoneIndex) => row[(zoneIndex * 5 + Math.floor(zoneIndex / 6)) % row.length],
      ),
    ]));
    const enemyPools = [
      ["runner", "runner", "gunner", "machinegun", "drone", "shield"],
      ["runner", "gunner", "machinegun", "turret", "drone", "shield", "piercer", "mortar"],
      ["shield", "piercer", "drone", "gunner", "machinegun", "turret", "mortar", "runner"],
      ["piercer", "mortar", "shield", "drone", "machinegun", "turret", "gunner", "runner", "mortar"],
      ["piercer", "mortar", "drone", "shield", "machinegun", "turret", "gunner", "runner", "piercer", "mortar"],
    ];

    function addZoneEnemies(zone, floorY, spawnPoints) {
      const localZoneIndex = zone.localIndex;
      const section = Math.min(3, Math.floor(localZoneIndex / 6));
      const points = [...spawnPoints];
      const combatBonus = zone.template === "crusher" || zone.template === "gauntlet" ? 1 : 0;
      const stageBaseCounts = [8, 10, 12, 14, 16];
      const targetCount = stageBaseCounts[zone.stageIndex]
        + section * 2
        + (localZoneIndex % 3 === 2 ? 1 : 0)
        + combatBonus;
      const progressionPatterns = [
        [
          ["runner", "runner", "gunner"],
          ["runner", "gunner", "machinegun", "drone"],
          ["runner", "gunner", "machinegun", "shield", "drone"],
          ["gunner", "machinegun", "shield", "drone", "piercer"],
        ],
        [
          ["runner", "gunner", "machinegun", "shield"],
          ["gunner", "runner", "machinegun", "turret", "shield", "drone"],
          ["gunner", "machinegun", "turret", "shield", "drone", "piercer"],
          ["shield", "drone", "piercer", "mortar", "machinegun", "turret", "mortarTurret", "gunner"],
        ],
        [
          ["gunner", "machinegun", "shield", "drone", "runner"],
          ["shield", "drone", "piercer", "machinegun", "turret", "gunner"],
          ["shield", "piercer", "drone", "mortar", "machinegun", "turret", "mortarTurret"],
          ["piercer", "mortar", "shield", "drone", "machinegun", "turret", "mortarTurret", "gunner"],
        ],
        [
          ["piercer", "gunner", "machinegun", "drone", "shield"],
          ["piercer", "mortar", "machinegun", "turret", "mortarTurret", "shield", "drone"],
          ["mortar", "piercer", "drone", "shield", "machinegun", "turret", "mortarTurret", "gunner"],
          ["piercer", "mortar", "drone", "shield", "machinegun", "turret", "mortarTurret", "gunner", "runner"],
        ],
        [
          ["shield", "piercer", "drone", "machinegun", "gunner"],
          ["piercer", "mortar", "drone", "shield", "machinegun", "turret", "mortarTurret"],
          ["mortar", "piercer", "drone", "shield", "machinegun", "turret", "mortarTurret", "gunner"],
          ["piercer", "mortarTurret", "drone", "shield", "machinegun", "turret", "gunner", "mortar", "runner"],
        ],
      ];
      const pattern = progressionPatterns[zone.stageIndex][section];
      const anchors = spawnPoints.length
        ? spawnPoints
        : [[560, floorY], [1450, floorY], [2450, floorY], [3440, floorY]];
      const offsets = [-54, 54, -78, 78, -34, 34];

      while (points.length < targetCount) {
        const reinforcement = points.length - spawnPoints.length;
        const anchorIndex = (reinforcement + localZoneIndex + section) % anchors.length;
        const [anchorX, anchorY] = anchors[anchorIndex];
        const localX = clamp(
          anchorX + offsets[(reinforcement + section) % offsets.length],
          210,
          zone.width - 210,
        );
        const type = pattern[(reinforcement + localZoneIndex) % pattern.length];
        points.push([localX, anchorY, type]);
      }

      points.forEach(([localX, surfaceY, forcedType], index) => {
        const type = forcedType || pattern[(index + localZoneIndex) % pattern.length];
        const actualY = type === "drone" ? Math.min(surfaceY - 170, floorY - 230) : surfaceY;
        const enemy = addEnemy(type, zone.x + localX, actualY, 110 + zone.stageIndex * 35);
        enemy.placementWave = index >= spawnPoints.length ? "reinforcement" : "original";
        enemy.zonePlacementSignature = zone.code + ":" + index + ":" + type;
      });
      zone.targetEnemyCount = targetCount;
      zone.enemyComplexityTier = zone.stageIndex * 4 + section;
    }

    function addLayeredRouteTransitions(zone, floorY, kind, spawnPoints) {
      if (zone.template === "tutorial" || zone.template === "boss" || zone.template === "midboss") return;
      const stageIndex = zone.stageIndex;
      const localZoneIndex = zone.localIndex;
      const section = Math.min(3, Math.floor(localZoneIndex / 6));
      const requestedCount = ROUTE_TRANSITION_BUDGET_BY_STAGE[stageIndex][section];
      const alreadyVertical = ["chasm", "bridge", "vertical", "towerClimb", "antennaShaft", "cathedralNave"].includes(zone.template);
      const transitionCount = Math.max(1, requestedCount - (alreadyVertical ? 1 : 0));
      const routeSlotsByStage = [
        [1420, 2940],
        [980, 2260, 3370],
        [760, 1740, 2790, 3500],
        [690, 1490, 2390, 3340],
        [620, 1320, 2080, 2860, 3530],
      ];
      const slots = routeSlotsByStage[stageIndex];
      const mirrorRoute = localZoneIndex % 2 === 1;
      const laneShift = ((localZoneIndex % 5) - 2) * 34;
      const transitionKinds = [];

      for (let transitionIndex = 0; transitionIndex < transitionCount; transitionIndex += 1) {
        const slotIndex = (transitionIndex + Math.floor(localZoneIndex / 3)) % slots.length;
        const plannedX = slots[slotIndex];
        const mirroredX = mirrorRoute ? ZONE_W - plannedX : plannedX;
        const localX = clamp(mirroredX + laneShift, 520, ZONE_W - 520);
        const floorGate = (localZoneIndex + transitionIndex + stageIndex) % 2 === 0;

        if (floorGate) {
          // 지면에서 솟은 격벽은 상층으로 올라가야만 통과할 수 있다.
          const gateHeight = 165 + stageIndex * 25 + section * 14;
          const gateWidth = 62 + (stageIndex % 2) * 8;
          const approachRise = Math.min(gateHeight - 38, 88 + stageIndex * 15 + section * 8);
          addPlatform(zone.x + localX, floorY - gateHeight, gateWidth, gateHeight, kind);
          addPlatform(zone.x + localX - 430, floorY - Math.max(58, approachRise * 0.5), 190, 22, kind);
          addPlatform(zone.x + localX - 245, floorY - approachRise, 220, 22, kind);
          addPlatform(zone.x + localX + gateWidth, floorY - gateHeight, 390 + stageIndex * 32, 22, kind);
          if (gateHeight >= 245) addBoostNode(zone.x + localX - 96, floorY - 58, 115, -560 - stageIndex * 18);
          const upperGuard = stageIndex >= 3 && (localZoneIndex + transitionIndex) % 3 === 0
            ? "mortarTurret"
            : stageIndex >= 2 && transitionIndex % 2 === 0
              ? "turret"
              : stageIndex === 0 && section === 0
                ? "gunner"
                : "machinegun";
          spawnPoints.push([localX + gateWidth + 120, floorY - gateHeight, upperGuard]);
          spawnPoints.push([localX - 150, floorY - approachRise, transitionIndex % 2 ? "gunner" : "runner"]);
          transitionKinds.push("rise");
        } else {
          // 천장 격벽은 상층 진행을 끊고 플레이어를 다시 하층 통로로 떨어뜨린다.
          const tunnelClearance = Math.max(148, 205 - stageIndex * 9 - section * 5);
          const gateWidth = 66 + (section % 2) * 8;
          const hangingHeight = Math.max(150, floorY - tunnelClearance - 55);
          addPlatform(zone.x + localX, 55, gateWidth, hangingHeight, kind);
          addPlatform(zone.x + localX - 215, floorY - 84, 185, 20, kind);
          addPlatform(zone.x + localX + gateWidth + 45, floorY - 150 - stageIndex * 12, 240, 22, kind);
          spawnPoints.push([localX - 125, floorY - 84, "gunner"]);
          spawnPoints.push([localX + gateWidth + 150, floorY, stageIndex >= 2 ? "machinegun" : "runner"]);
          transitionKinds.push("underpass");
        }
      }

      // 한 높이에 적을 몰아두지 않고 하층 돌격병과 상층 사격병이 서로 다른 각도를 만든다.
      const nestRise = 205 + stageIndex * 42 + section * 18;
      const nestX = mirrorRoute ? 470 : ZONE_W - 760;
      addPlatform(zone.x + nestX, floorY - nestRise, 290 - stageIndex * 8, 22, kind);
      spawnPoints.push([nestX + 125, floorY - nestRise, stageIndex >= 2 ? "turret" : stageIndex >= 1 ? "machinegun" : "gunner"]);

      // 단순히 장애물을 넘는 수준이 아니라 여러 층을 연속해서 오르는 전용 수직 루트다.
      const ascentLevels = clamp(1 + Math.floor((stageIndex + section + 1) / 2), 1, 4);
      const ascentBaseX = mirrorRoute ? ZONE_W - 1370 - (localZoneIndex % 3) * 70 : 640 + (localZoneIndex % 3) * 70;
      const ascentStepY = 102 + stageIndex * 6;
      for (let level = 1; level <= ascentLevels; level += 1) {
        const zigzagX = ascentBaseX + (level % 2 ? 0 : 255);
        const platformY = floorY - level * ascentStepY;
        addPlatform(zone.x + zigzagX, platformY, 230 - level * 8, 21, kind);
        if (level === ascentLevels) {
          addPlatform(zone.x + zigzagX + (mirrorRoute ? -430 : 190), platformY, 470, 21, kind);
          const summitGuard = stageIndex >= 3 && (localZoneIndex + level) % 3 === 1
            ? "mortarTurret"
            : stageIndex >= 1
              ? "turret"
              : "gunner";
          spawnPoints.push([zigzagX + 96, platformY, summitGuard]);
        }
      }
      if (ascentLevels >= 3) {
        addBoostNode(zone.x + ascentBaseX - 42, floorY - 72, mirrorRoute ? -95 : 95, -610 - stageIndex * 15);
      }
      zone.verticalTraversalLayers = ascentLevels;
      zone.routeProfile = `layered-${stageIndex + 1}-${section + 1}-${mirrorRoute ? "reverse" : "forward"}-${transitionKinds.join("-")}-climb${ascentLevels}`;
      zone.routeTransitionCount = transitionCount;
    }

    function addUniqueZoneVariation(zone, floorY, kind, spawnPoints) {
      const globalIndex = zone.globalIndex;
      const localZoneIndex = zone.localIndex;
      const stageIndex = zone.stageIndex;
      const section = Math.min(3, Math.floor(localZoneIndex / 6));
      const extension = zone.width - ZONE_W;
      const isArena = zone.template === "boss" || zone.template === "midboss";
      const isHongryeonArena = zone.template === "boss" && stageIndex === 1;

      // 뒤 구역일수록 실제 지면이 조금씩 길어진다. 기존 4,000px 설계 뒤에 확장 구간을 잇는다.
      if (extension > 0) {
        addPlatform(zone.x + ZONE_W, floorY, extension, WORLD_H - floorY, kind);
      }

      if (zone.template === "tutorial") {
        zone.layoutSeed = "tutorial-authored-0";
        zone.terrainComplexityTier = 0;
        return;
      }

      // 무작위 좌표 대신 막별 설계표를 사용한다. 1막 전반은 원래 지형 그대로 두고,
      // 뒤 막과 뒤 구역으로 갈수록 보조 발판·함정 예산을 계획적으로 늘린다.
      const platformBudgets = [
        [0, 0, 1, 1],
        [0, 1, 1, 2],
        [1, 1, 2, 2],
        [1, 2, 2, 3],
        [2, 2, 3, 4],
      ];
      const hazardBudgets = [
        [0, 0, 0, 1],
        [0, 1, 1, 1],
        [1, 1, 2, 2],
        [1, 2, 2, 3],
        [2, 2, 3, 4],
      ];
      const stageRoutePlans = [
        {
          platforms: [[760, -120, 320], [1980, -165, 300], [3170, -130, 280]],
          hazards: [[1280, "spike"], [2760, "spike"], [3520, "steam"]],
        },
        {
          platforms: [[520, -115, 310], [1450, -205, 290], [2440, -135, 340], [3330, -235, 270]],
          hazards: [[930, "steam"], [1880, "spike"], [2860, "steam"], [3600, "laser"]],
        },
        {
          platforms: [[500, -175, 290], [1190, -315, 270], [2020, -445, 290], [2850, -300, 300], [3460, -185, 260]],
          hazards: [[820, "laser"], [1630, "steam"], [2530, "spike"], [3260, "laser"]],
        },
        {
          platforms: [[430, -210, 250], [1050, -390, 230], [1740, -255, 260], [2470, -470, 230], [3230, -330, 250]],
          hazards: [[760, "laser"], [1420, "steam"], [2130, "laser"], [2880, "spike"], [3560, "laser"]],
        },
        {
          platforms: [[390, -245, 230], [980, -455, 220], [1630, -190, 250], [2310, -515, 220], [2980, -325, 240], [3520, -470, 210]],
          hazards: [[690, "laser"], [1260, "spike"], [1960, "steam"], [2670, "laser"], [3290, "spike"], [3740, "laser"]],
        },
      ];

      if (!isArena) {
        const routePlan = stageRoutePlans[stageIndex];
        const platformCount = platformBudgets[stageIndex][section];
        const hazardCount = hazardBudgets[stageIndex][section];
        const mirrorRoute = localZoneIndex % 2 === 1;
        const laneShift = ((localZoneIndex % 3) - 1) * 45;

        for (let slot = 0; slot < platformCount; slot += 1) {
          const planIndex = (slot + localZoneIndex) % routePlan.platforms.length;
          const [plannedX, plannedRise, plannedWidth] = routePlan.platforms[planIndex];
          const width = plannedWidth - section * 8;
          const mirroredX = mirrorRoute ? ZONE_W - plannedX - width : plannedX;
          const localX = clamp(mirroredX + laneShift, 220, ZONE_W - width - 220);
          const rise = Math.abs(plannedRise) + section * 18;
          addPlatform(zone.x + localX, floorY - rise, width, 24, kind);
        }

        for (let slot = 0; slot < hazardCount; slot += 1) {
          const planIndex = (slot + section + localZoneIndex) % routePlan.hazards.length;
          const [plannedX, hazardType] = routePlan.hazards[planIndex];
          const mirroredX = mirrorRoute ? ZONE_W - plannedX : plannedX;
          const localX = clamp(mirroredX + laneShift, 360, ZONE_W - 360);
          const width = hazardType === "steam" ? 28 : hazardType === "laser" ? 26 : 105 + section * 10;
          const height = hazardType === "steam"
            ? 235 + stageIndex * 22
            : hazardType === "laser"
              ? 245 + stageIndex * 30
              : 22;
          addHazard(
            zone.x + localX,
            floorY - height,
            width,
            height,
            hazardType,
            stageIndex * 0.37 + section * 0.51 + slot * 0.64,
          );
        }
      }

      // 확장 꼬리 구간도 막 진행도에 맞춘 고정 규칙으로 구성한다.
      if (extension >= 160 && !isHongryeonArena) {
        const tailRise = 125 + stageIndex * 28 + section * 24;
        const tailWidth = Math.min(Math.max(120, extension * 0.55), 330);
        const tailX = ZONE_W + Math.max(20, extension * 0.18);
        addPlatform(zone.x + tailX, floorY - tailRise, tailWidth, 24, kind);
        if (!isArena) spawnPoints.push([tailX + tailWidth * 0.5, floorY - tailRise]);
      }
      if (extension >= 360 && !isArena) {
        const tailHazardTypes = ["spike", "steam", "laser", "laser", "spike"];
        const tailHazardType = tailHazardTypes[stageIndex];
        const tailHazardHeight = tailHazardType === "spike" ? 22 : 240 + stageIndex * 20;
        addHazard(
          zone.x + ZONE_W + extension * 0.68,
          floorY - tailHazardHeight,
          tailHazardType === "steam" || tailHazardType === "laser" ? 28 : Math.min(150, extension * 0.22),
          tailHazardHeight,
          tailHazardType,
          stageIndex * 0.4 + section * 0.7,
        );
      }

      zone.terrainComplexityTier = stageIndex * 4 + section;
      zone.layoutSeed = "authored-stage-" + (stageIndex + 1)
        + "-section-" + (section + 1)
        + "-route-" + ((localZoneIndex % 6) + 1)
        + "-width-" + zone.width;
    }

    function addBossArena(stageIndex, origin, floorY, kind) {
      addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
      if (stageIndex === 0) {
        // 철각: 낮은 엄폐물과 긴 포격선이 있는 폐철 전차 시험장.
        [[360, -105, 370], [1020, -185, 300], [1770, -110, 420], [3020, -170, 390]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 28, "cargo"));
        addPlatform(origin + 2290, floorY - 265, 280, 24, "roof");
      } else if (stageIndex === 1) {
        // 홍련: 박격포와 낙하 폭탄 회피에 집중하는 완전한 단층 평지 전장.
      } else if (stageIndex === 2) {
        // 백면: 공중 마법전을 위한 부유 제단과 황색 도약 발판.
        [[300, -145, 300], [790, -330, 280], [1290, -510, 300], [1840, -390, 320], [2410, -540, 300], [2990, -320, 350], [3500, -150, 280]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "shrine"));
        addBoostNode(origin + 640, floorY - 76, 160, -620);
        addBoostNode(origin + 1650, floorY - 76, 0, -690);
        addBoostNode(origin + 2760, floorY - 76, -150, -640);
        addBoostNode(origin + 3580, floorY - 210, -230, -520);
      } else if (stageIndex === 3) {
        // 무명: 검은 제단과 소환진 사이를 오가는 수직 결투장.
        [[270, -180, 320], [830, -390, 290], [1430, -235, 330], [2060, -470, 310], [2700, -250, 350], [3370, -395, 300]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "firewall"));
      } else {
        // 잔영-00: 좌우가 완전히 대칭인 거울 결투장.
        [[340, -160, 360], [920, -320, 320], [1510, -190, 330], [2160, -190, 330], [2770, -320, 320], [3340, -160, 360]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, x < 2000 ? "glass" : "mirror"));
        addBoostNode(origin + 1880, floorY - 78, 140, -570);
        addBoostNode(origin + 2080, floorY - 78, -140, -570);
        addHazard(origin + 1930, floorY - 420, 24, 420, "laser", 0.4);
        addHazard(origin + 2046, floorY - 420, 24, 420, "laser", 1.45);
      }
    }

    function addMidBossArena(stageIndex, origin, floorY, kind) {
      addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
      if (stageIndex === 0) {
        [[310, -125, 330], [930, -240, 280], [1570, -155, 360], [2390, -300, 300], [3170, -145, 390]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 26, "cargo"));
        [760, 2080, 2920].forEach((x, index) => addHazard(origin + x, floorY - 22, 150 + index * 25, 22, "spike"));
      } else if (stageIndex === 1) {
        [[420, -145, 360], [1180, -260, 300], [2020, -170, 420], [2920, -285, 340]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "turbine"));
        [880, 1710, 2660, 3450].forEach((x, index) => addHazard(origin + x, floorY - 310, 28, 310, "steam", index * 0.62));
      } else if (stageIndex === 2) {
        [[300, -170, 300], [840, -340, 280], [1420, -500, 300], [2080, -320, 350], [2720, -480, 300], [3380, -190, 300]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "shrine"));
        addBoostNode(origin + 660, floorY - 76, 160, -650);
        addBoostNode(origin + 1880, floorY - 76, 0, -700);
        addBoostNode(origin + 3240, floorY - 76, -180, -620);
      } else if (stageIndex === 3) {
        // 공문: 피해 발판 없이 높낮이만으로 방패 포격과 중갑 돌진을 피하는 결투장.
        [[280, -190, 320], [880, -360, 300], [1510, -220, 330], [2180, -430, 320], [2860, -240, 350], [3440, -380, 290]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "firewall"));
      } else {
        [[330, -160, 340], [900, -310, 300], [1490, -450, 300], [2210, -450, 300], [2800, -310, 300], [3380, -160, 340]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, x < 2000 ? "glass" : "mirror"));
        addBoostNode(origin + 1180, floorY - 80, 120, -620);
        addBoostNode(origin + 2820, floorY - 80, -120, -620);
      }
    }

    function configureBossEntity(boss, bossKind, floorY, isMidBoss = false) {
      const definition = BOSS_DEFINITIONS[bossKind];
      boss.bossKind = bossKind;
      boss.isMidBoss = isMidBoss;
      boss.w = definition.size[0];
      boss.h = definition.size[1];
      boss.hp = definition.hp;
      boss.maxHp = definition.hp;
      boss.y = floorY - boss.h;
      boss.originX = boss.x;
      boss.spawnX = boss.x;
      boss.spawnY = boss.y;
      boss.baseY = boss.y;
      boss.homeZoneIndex = getZoneIndexAt(boss.x);
      boss.quarterPhaseTriggered = false;
      boss.controlInversionActive = false;
      boss.iceStormTimer = 0;
      boss.iceSpawnTimer = 0;
      boss.iceStormSerial = 0;
      boss.censorSnowBlanket = false;
      boss.shieldOverdrive = false;
      boss.shieldMuzzleFlash = 0;
      boss.mutated = false;
      boss.comboHitsRemaining = 0;
      boss.comboHitTimer = 0;
      boss.adaptivePhase = false;
      boss.echoAnalysis = null;
      boss.echoDecisionSerial = 0;
      boss.echoMimicJumpCooldown = 0;
      boss.passivePanelCooldown = 4.8;
      if (getBossArchetype(bossKind) === "echo") boss.speed = isMidBoss ? 160 : 175;
      return boss;
    }

    for (const zone of zones) {
      const localZoneIndex = zone.localIndex;
      const floorY = floorHeights[zone.stageIndex][localZoneIndex];
      const kind = platformKinds[zone.kind][localZoneIndex];
      const origin = zone.x;
      const spawns = [];
      const depthVariant = Math.floor(localZoneIndex / 6);

      if (zone.template === "tutorial") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, "training");
        // Basic jump and double-jump range.
        [[360, -105, 250], [820, -205, 250], [1120, -365, 220]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 26, "training"));
        // A narrow climbing shaft makes wall contact and wall jumping unambiguous.
        addPlatform(origin + 1530, floorY - 405, 52, 405, "wall");
        addPlatform(origin + 1970, floorY - 520, 52, 520, "wall");
        [[1582, -130, 180], [1790, -265, 180], [1582, -410, 180], [2022, -520, 170]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "training"));
        // Burst and combat practice lanes stay clear so the inputs are easy to read.
        [[2320, -110, 300], [2700, -190, 260], [3050, -120, 260], [3380, -220, 260]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "training"));
        addSign(origin + 360, floorY - 185, "기초 기동", "이동 · 점프");
        addSign(origin + 900, floorY - 285, "공중 기동", "이중 점프");
        addSign(origin + 1650, floorY - 485, "수직 기동", "벽타기 · 벽점프");
        addSign(origin + 2450, floorY - 190, "긴급 회피", "버스트");
        addSign(origin + 3160, floorY - 205, "무장 점검", "발도 · 샷건");
      } else if (zone.template === "scrapCrane") {
        // 1막 · 입문형: 넓은 발판과 짧은 틈으로 이중 점프를 천천히 익힌다.
        addPlatform(origin, floorY, 980, WORLD_H - floorY, "cargo");
        addPlatform(origin + 1330, floorY + 20, 920, WORLD_H - floorY - 20, "factory");
        addPlatform(origin + 2630, floorY - 10, 1370, WORLD_H - floorY + 10, "cargo");
        [[420, -110, 520], [1040, -205, 420], [1510, -310, 470], [2070, -185, 520], [2660, -280, 500], [3260, -155, 520]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, index % 2 ? 30 : 24, index % 2 ? "roof" : "cargo"));
        addBoostNode(origin + 900, floorY - 90, 190, -500);
        addBoostNode(origin + 2250, floorY - 105, 205, -480);
        if (depthVariant >= 1) addHazard(origin + 980, floorY - 22, 350, 22, "spike");
        if (depthVariant >= 3) addHazard(origin + 2250, floorY - 22, 380, 22, "spike");
        spawns.push([520, floorY - 110], [1160, floorY - 205], [1630, floorY - 310], [2200, floorY - 185], [2780, floorY - 280], [3400, floorY - 155]);
      } else if (zone.template === "furnacePiston") {
        // 2막 · 중하급: 두 높이의 작업선 사이에서 증기 분출 박자를 읽는다.
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, "foundry");
        [[150, -75, 590], [850, -185, 470], [1450, -90, 560], [2140, -245, 430], [2700, -125, 500], [3340, -225, 470]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, 24, index % 2 ? "turbine" : "channel"));
        const pistonXs = [760, 1370, 2050, 2630, 3270, 3820].slice(0, 4 + Math.min(2, depthVariant));
        pistonXs.forEach((x, index) => {
          const height = index % 2 ? 380 : 285;
          addHazard(origin + x, floorY - height, 32, height, "steam", index * 0.53 + localZoneIndex * 0.16);
        });
        addHazard(origin + 1840, floorY - 22, 150 + depthVariant * 35, 22, "spike");
        addBoostNode(origin + 2010, floorY - 90, 120, -540);
        spawns.push([340, floorY - 75], [970, floorY - 185], [1590, floorY - 90], [2270, floorY - 245], [2840, floorY - 125], [3470, floorY - 225]);
      } else if (zone.template === "cathedralNave") {
        // 3막 · 중급: 바닥이 끊기며 상·하단 경로가 교차하는 수직 예배당.
        addPlatform(origin, floorY, 690, WORLD_H - floorY, "archive");
        addPlatform(origin + 1710, floorY + 15, 600, WORLD_H - floorY - 15, "archive");
        addPlatform(origin + 3370, floorY, 630, WORLD_H - floorY, "archive");
        [[520, -120, 360], [850, -285, 310], [1190, -455, 300], [1510, -600, 380], [1940, -410, 330], [2300, -230, 310], [2650, -420, 300], [2990, -570, 350], [3260, -290, 300]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, 22, index % 3 === 1 ? "shrine" : "archive"));
        addPlatform(origin + 1460, 75, 48, floorY - 520, "shrine");
        addPlatform(origin + 2940, 90, 48, floorY - 500, "shrine");
        addBoostNode(origin + 560, floorY - 92, 165, -650);
        addBoostNode(origin + 1620, floorY - 110, 110, -690);
        addBoostNode(origin + 3210, floorY - 320, 185, -520);
        addHazard(origin + 690, floorY - 22, 500, 22, "laser", 0.35 + localZoneIndex * 0.1);
        addHazard(origin + 2310, floorY - 22, 560, 22, "laser", 1.15 + localZoneIndex * 0.08);
        if (depthVariant >= 2) addHazard(origin + 2860, floorY - 430, 24, 430, "laser", 0.7 + localZoneIndex * 0.13);
        spawns.push([410, floorY], [950, floorY - 285], [1310, floorY - 455, "drone"], [2050, floorY - 410], [2420, floorY - 230], [2760, floorY - 420], [3490, floorY]);
      } else if (zone.template === "antennaShaft") {
        // 4막 · 상급: 좁은 발판을 지그재그로 오르며 수직 레이저를 연속 회피한다.
        addPlatform(origin, floorY, 500, WORLD_H - floorY, "city");
        addPlatform(origin + 1870, floorY + 10, 360, WORLD_H - floorY - 10, "city");
        addPlatform(origin + 3550, floorY, 450, WORLD_H - floorY, "city");
        [[420, -105, 300], [740, -270, 270], [1040, -445, 260], [1360, -620, 320], [1710, -470, 270], [2020, -300, 260], [2330, -500, 255], [2630, -650, 310], [2970, -455, 255], [3260, -275, 270], [3470, -125, 300]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, 21, index % 2 ? "array" : "tower"));
        addBoostNode(origin + 410, floorY - 100, 155, -690);
        addBoostNode(origin + 1660, floorY - 500, 150, -560);
        addBoostNode(origin + 2860, floorY - 500, 175, -570);
        [1180, 2250, 3160].forEach((x, index) => {
          addHazard(origin + x, floorY - (index === 1 ? 560 : 470), 26, index === 1 ? 560 : 470, "laser", 0.3 + index * 0.86 + localZoneIndex * 0.08);
        });
        if (depthVariant >= 2) addHazard(origin + 500, floorY - 22, 260, 22, "spike");
        spawns.push([300, floorY], [840, floorY - 270], [1140, floorY - 445], [1500, floorY - 620, "drone"], [2130, floorY - 300], [2440, floorY - 500], [3080, floorY - 455], [3660, floorY]);
      } else if (zone.template === "memoryLabyrinth") {
        // 5막 · 최고급: 바닥 섬, 좁은 거울 계단, 수직 레이저가 한 구역 안에서 연속된다.
        addPlatform(origin, floorY, 520, WORLD_H - floorY, "mirror");
        addPlatform(origin + 940, floorY + 20, 470, WORLD_H - floorY - 20, "glass");
        addPlatform(origin + 1940, floorY - 15, 430, WORLD_H - floorY + 15, "mirror");
        addPlatform(origin + 2910, floorY + 10, 400, WORLD_H - floorY - 10, "glass");
        addPlatform(origin + 3650, floorY, 350, WORLD_H - floorY, "mirror");
        const reverseMaze = localZoneIndex % 2 === 1;
        const mirrorSteps = reverseMaze
          ? [[300, -175, 290], [650, -365, 250], [1010, -545, 250], [1370, -330, 280], [1710, -160, 260], [2080, -390, 250], [2430, -610, 270], [2800, -420, 250], [3160, -220, 270], [3460, -470, 250]]
          : [[300, -120, 290], [650, -310, 250], [1010, -500, 250], [1370, -285, 280], [1710, -520, 260], [2080, -320, 250], [2430, -590, 270], [2800, -360, 250], [3160, -570, 270], [3460, -300, 250]];
        mirrorSteps.forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, 20, (index + localZoneIndex) % 2 ? "glass" : "mirror"));
        [[560, 95, 46, 330], [1450, 70, 48, 400], [2380, 90, 46, 370], [3350, 65, 48, 420]]
          .forEach(([x, y, w, h], index) => addPlatform(origin + x, y + (localZoneIndex % 3) * 24, w, h, index % 2 ? "mirror" : "glass"));
        addBoostNode(origin + 470, floorY - 100, 170, -660);
        addBoostNode(origin + 1810, floorY - 120, 130, -700);
        addBoostNode(origin + 2810, floorY - 400, 170, -580);
        addBoostNode(origin + 3540, floorY - 330, 150, -500);
        [820, 1600, 2540, 3390].forEach((x, index) => {
          const height = index % 2 ? 560 : 390;
          addHazard(origin + x, floorY - height, 24, height, "laser", index * 0.7 + localZoneIndex * 0.17);
        });
        addHazard(origin + 1410, floorY - 22, 260 + depthVariant * 40, 22, "spike");
        addHazard(origin + 3310, floorY - 22, 250, 22, "spike");
        spawns.push([330, floorY - 120], [760, floorY - 310], [1120, floorY - 500, "drone"], [1480, floorY - 285], [2190, floorY - 320], [2890, floorY - 360], [3260, floorY - 220], [3710, floorY]);
      } else if (zone.template === "terrace") {
        addPlatform(origin, floorY, 1550, WORLD_H - floorY, kind);
        addPlatform(origin + 1780, floorY - 40, 2220, WORLD_H - floorY + 40, kind);
        [[360, -120, 280], [810, -245, 250], [1260, -355, 250], [1880, -210, 310], [2420, -330, 280], [3040, -160, 340]].forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 28, kind));
        addHazard(origin + 1460, floorY - 22, 90, 22, "spike");
        spawns.push([520, floorY], [880, floorY - 245], [1320, floorY - 355], [2020, floorY - 250], [2500, floorY - 330], [3310, floorY - 40]);
      } else if (zone.template === "chasm") {
        addPlatform(origin, floorY, 900, WORLD_H - floorY, kind);
        addPlatform(origin + 3160, floorY, 840, WORLD_H - floorY, kind);
        [[720, -115, 250], [1120, -235, 220], [1510, -360, 230], [1930, -470, 250], [2380, -340, 230], [2760, -205, 250]].forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 26, kind));
        addBoostNode(origin + 860, floorY - 175, 285, -500);
        addBoostNode(origin + 2830, floorY - 265, 300, -460);
        spawns.push([430, floorY], [1220, floorY - 235], [1620, floorY - 360], [2040, floorY - 470, "drone"], [2470, floorY - 340], [3400, floorY]);
      } else if (zone.template === "crusher") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        [[620, 250, 180, 250], [1260, 180, 220, 340], [2050, 280, 190, 230], [2860, 160, 240, 360]].forEach(([x, y, w, h]) => addPlatform(origin + x, y, w, h, kind));
        [[420, -120, 260], [940, -210, 260], [1610, -145, 300], [2360, -250, 270], [3260, -180, 300]].forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 28, kind));
        addHazard(origin + 820, floorY - 210, 34, 210, zone.stageIndex === 1 ? "steam" : "laser", 0.2);
        addHazard(origin + 2260, floorY - 280, 34, 280, zone.stageIndex === 1 ? "steam" : "laser", 1.3);
        addHazard(origin + 3350, floorY - 22, 150, 22, "spike");
        spawns.push([500, floorY - 120], [1030, floorY - 210], [1700, floorY - 145], [2440, floorY - 250], [3020, floorY], [3440, floorY - 180]);
        combatRooms.push({ left: origin + 260, right: origin + 3700, name: `${zone.name} 압축 봉쇄`, stageIndex: zone.stageIndex, triggered: false, cleared: false });
      } else if (zone.template === "vertical") {
        addPlatform(origin, floorY, 720, WORLD_H - floorY, kind);
        addPlatform(origin + 3250, floorY, 750, WORLD_H - floorY, kind);
        addPlatform(origin + 760, 250, 54, floorY - 250, kind);
        addPlatform(origin + 3130, 210, 54, floorY - 210, kind);
        [[720, -90, 300], [1080, -220, 260], [1450, -350, 260], [1820, -485, 260], [2210, -360, 260], [2580, -230, 260], [2910, -105, 300]].forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 26, kind));
        addBoostNode(origin + 850, floorY - 160, 160, -560);
        addHazard(origin + 1700, floorY - 22, 170, 22, "spike");
        spawns.push([420, floorY], [1160, floorY - 220], [1540, floorY - 350], [1940, floorY - 485, "drone"], [2310, floorY - 360], [2670, floorY - 230], [3500, floorY]);
      } else if (zone.template === "fork") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        addPlatform(origin + 520, floorY - 145, 520, 28, kind);
        addPlatform(origin + 1190, floorY - 285, 460, 28, kind);
        addPlatform(origin + 1800, floorY - 430, 520, 28, kind);
        addPlatform(origin + 2480, floorY - 285, 460, 28, kind);
        addPlatform(origin + 3130, floorY - 145, 520, 28, kind);
        addHazard(origin + 930, floorY - 22, 270, 22, "spike");
        addHazard(origin + 2050, floorY - 22, 300, 22, "spike");
        addHazard(origin + 2940, floorY - 22, 220, 22, "spike");
        addPickup(origin + 2020, floorY - 485);
        spawns.push([380, floorY], [690, floorY - 145], [1310, floorY - 285], [1910, floorY - 430, "drone"], [2600, floorY - 285], [3280, floorY - 145], [3720, floorY]);
      } else if (zone.template === "gauntlet") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        [[320, -130, 300], [860, -250, 260], [1410, -360, 260], [1980, -230, 300], [2560, -390, 270], [3150, -210, 320]].forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 28, kind));
        [720, 1260, 1840, 2420, 3000].forEach((x, index) => addHazard(origin + x, floorY - (index % 2 ? 330 : 430), 26, index % 2 ? 330 : 430, zone.stageIndex === 1 ? "steam" : "laser", index * 0.47));
        spawns.push([470, floorY - 130], [970, floorY - 250], [1510, floorY - 360], [2080, floorY - 230], [2660, floorY - 390], [3280, floorY - 210], [3700, floorY]);
        combatRooms.push({ left: origin + 180, right: origin + 3780, name: `${zone.name} 봉쇄전`, stageIndex: zone.stageIndex, triggered: false, cleared: false });
      } else if (zone.template === "wreckfield") {
        // 기울어진 잔해를 타고 내려갔다가 크레인 잔해 위로 되돌아오는 폐기장 전용 동선.
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        [[240, -105, 560], [920, -205, 420], [1470, -315, 330], [2020, -190, 620], [2800, -365, 360], [3310, -225, 470]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, index % 2 ? 34 : 24, index % 2 ? "cargo" : kind));
        [[1330, 150], [2640, 165], [3180, 120]].forEach(([x, w]) => addHazard(origin + x, floorY - 22, w, 22, "spike"));
        spawns.push([390, floorY - 105], [1030, floorY - 205], [1550, floorY - 315], [2200, floorY - 190], [2890, floorY - 365, "drone"], [3450, floorY - 225]);
      } else if (zone.template === "bridge") {
        // 아래가 트인 장거리 교량. 상·하단 두 경로가 중간에서 교차한다.
        addPlatform(origin, floorY, 610, WORLD_H - floorY, kind);
        addPlatform(origin + 3440, floorY, 560, WORLD_H - floorY, kind);
        [[520, -95, 500], [1060, -205, 420], [1520, -315, 430], [1990, -205, 420], [2450, -95, 470], [2940, -235, 520]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, kind));
        addBoostNode(origin + 560, floorY - 150, 210, -520);
        addBoostNode(origin + 3180, floorY - 285, 230, -470);
        spawns.push([340, floorY], [690, floorY - 95], [1180, floorY - 205], [1640, floorY - 315, "drone"], [2100, floorY - 205], [2590, floorY - 95], [3530, floorY]);
      } else if (zone.template === "zigzag") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        [[280, -120, 430], [790, -300, 380], [1240, -165, 430], [1740, -430, 410], [2240, -220, 430], [2740, -390, 390], [3240, -145, 470]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, kind));
        [730, 1690, 2690].forEach((x, index) => addHazard(origin + x, floorY - 22, 90 + index * 30, 22, "spike"));
        spawns.push([390, floorY - 120], [900, floorY - 300], [1360, floorY - 165], [1870, floorY - 430, "drone"], [2370, floorY - 220], [2860, floorY - 390], [3400, floorY - 145]);
      } else if (zone.template === "cavern") {
        // 천장 기둥과 움푹 팬 바닥이 교차하는 압축 동굴형 구역.
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        [[540, 140, 190, 360], [1320, 190, 220, 310], [2250, 115, 210, 385], [3140, 170, 230, 330]]
          .forEach(([x, y, w, h]) => addPlatform(origin + x, y, w, h, kind));
        [[250, -150, 360], [820, -260, 360], [1580, -390, 430], [2110, -250, 370], [2670, -410, 390], [3370, -220, 360]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, kind));
        addBoostNode(origin + 1490, floorY - 90, 90, -610);
        spawns.push([360, floorY - 150], [930, floorY - 260], [1700, floorY - 390], [2220, floorY - 250], [2780, floorY - 410, "drone"], [3480, floorY - 220]);
      } else if (zone.template === "conveyor") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, "foundry");
        [[260, -80, 620], [1040, -180, 520], [1700, -80, 620], [2490, -260, 520], [3200, -120, 520]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, 24, index % 2 ? "turbine" : "channel"));
        [910, 1600, 2370, 3060].forEach((x, index) => addHazard(origin + x, floorY - 260, 30, 260, "steam", index * 0.73));
        spawns.push([390, floorY - 80], [1170, floorY - 180], [1860, floorY - 80], [2610, floorY - 260], [3330, floorY - 120], [3700, floorY]);
      } else if (zone.template === "spiral") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        [[260, -90, 340], [670, -190, 330], [1070, -300, 330], [1470, -420, 350], [1950, -520, 430], [2450, -410, 350], [2860, -290, 340], [3260, -170, 390]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, kind));
        addBoostNode(origin + 1820, floorY - 80, 0, -700);
        spawns.push([360, floorY - 90], [770, floorY - 190], [1170, floorY - 300], [1570, floorY - 420], [2080, floorY - 520, "drone"], [2580, floorY - 410], [3000, floorY - 290], [3400, floorY - 170]);
      } else if (zone.template === "archiveMaze") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, "archive");
        [[460, 210, 55, 360], [1020, 90, 55, 430], [1580, 260, 55, 310], [2170, 120, 55, 420], [2810, 240, 55, 330], [3410, 100, 55, 430]]
          .forEach(([x, y, w, h]) => addPlatform(origin + x, y, w, h, "shrine"));
        [[240, -160, 300], [650, -330, 300], [1190, -210, 310], [1740, -410, 330], [2350, -260, 320], [2970, -430, 320], [3460, -230, 320]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "archive"));
        spawns.push([330, floorY - 160], [760, floorY - 330], [1290, floorY - 210], [1850, floorY - 410, "drone"], [2460, floorY - 260], [3080, floorY - 430], [3560, floorY - 230]);
      } else if (zone.template === "towerClimb") {
        addPlatform(origin, floorY, 520, WORLD_H - floorY, kind);
        addPlatform(origin + 3500, floorY, 500, WORLD_H - floorY, kind);
        [[470, -100, 360], [810, -235, 350], [1160, -390, 360], [1540, -540, 420], [2060, -400, 380], [2470, -250, 370], [2860, -410, 350], [3220, -210, 390]]
          .forEach(([x, y, w]) => addPlatform(origin + x, floorY + y, w, 24, "tower"));
        addBoostNode(origin + 430, floorY - 110, 180, -640);
        spawns.push([300, floorY], [570, floorY - 100], [920, floorY - 235], [1270, floorY - 390], [1680, floorY - 540, "drone"], [2200, floorY - 400], [2600, floorY - 250], [3330, floorY - 210]);
      } else if (zone.template === "mirrorMaze") {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, "mirror");
        [[270, -120, 420], [770, -300, 360], [1220, -470, 390], [1710, -250, 430], [2240, -470, 390], [2730, -300, 360], [3190, -120, 450]]
          .forEach(([x, y, w], index) => addPlatform(origin + x, floorY + y, w, 24, index < 4 ? "glass" : "mirror"));
        addBoostNode(origin + 1870, floorY - 75, 150, -680);
        [1150, 2800].forEach((x, index) => addHazard(origin + x, floorY - 340, 24, 340, "laser", 0.45 + index * 1.1));
        spawns.push([380, floorY - 120], [880, floorY - 300], [1340, floorY - 470, "drone"], [1850, floorY - 250], [2360, floorY - 470], [2850, floorY - 300], [3320, floorY - 120]);
      } else if (zone.template === "midboss") {
        addMidBossArena(zone.stageIndex, origin, floorY, kind);
        const stage = stages[zone.stageIndex];
        const definition = BOSS_DEFINITIONS[stage.midBossKind];
        const midBoss = addEnemy("boss", stage.midBossX, floorY, 540);
        configureBossEntity(midBoss, stage.midBossKind, floorY, true);
        addSign(origin + 2050, floorY - 104, `중간보스 · ${definition.name}`, "MID-STAGE TARGET");
      } else {
        addBossArena(zone.stageIndex, origin, floorY, kind);
        const stage = stages[zone.stageIndex];
        const definition = BOSS_DEFINITIONS[stage.bossKind];
        const boss = addEnemy("boss", stage.bossX, floorY, 620);
        configureBossEntity(boss, stage.bossKind, floorY, false);
        addSign(origin + 2140, floorY - 100, definition.name);
      }

      addLayeredRouteTransitions(zone, floorY, kind, spawns);
      addUniqueZoneVariation(zone, floorY, kind, spawns);

      if (zone.stageIndex === 4 && zone.template !== "boss" && zone.template !== "midboss") {
        const mirrorKind = localZoneIndex % 2 ? "mirror" : "glass";
        const ridge = floorY - 520 - (localZoneIndex % 3) * 55;
        [[420, 220], [820, 190], [1190, 240], [1550, 180], [1910, 240], [2290, 190], [2670, 220], [3070, 190], [3450, 250]]
          .forEach(([x, w], index) => addPlatform(origin + x, ridge + (index % 2) * 105, w, 24, mirrorKind));
        addBoostNode(origin + 520, floorY - 110, 185, -610);
        addBoostNode(origin + 3380, ridge + 120, 250, -430);
        [1060, 1760, 2470, 3180].forEach((x, index) => {
          addHazard(origin + x, floorY - (index % 2 ? 360 : 500), 24, index % 2 ? 360 : 500, "laser", index * 0.61 + localZoneIndex * 0.23);
        });
        addEnemy(localZoneIndex % 2 ? "mortar" : "shield", origin + 2860, floorY, 250);
        if (localZoneIndex === 1 || localZoneIndex === 4) {
          combatRooms.push({
            left: origin + 340,
            right: origin + 3650,
            name: `${zone.name} 이중 거울 봉쇄`,
            stageIndex: zone.stageIndex,
            triggered: false,
            cleared: false,
          });
        }
      }

      if (zone.stageIndex === 4) {
        const recoveryOffsets = {
          0: 720,
          2: 3680,
          4: 3700,
          6: 720,
        };
        const recoveryOffset = recoveryOffsets[localZoneIndex];
        if (recoveryOffset !== undefined) addPickup(origin + recoveryOffset, floorY - 62, "repair");
      }

      if (zone.template !== "tutorial" && zone.template !== "boss" && zone.template !== "midboss") addZoneEnemies(zone, floorY, spawns);
      if (zone.template !== "tutorial" && zone.template !== "fork" && zone.template !== "boss" && zone.template !== "midboss") addPickup(origin + 2200, floorY - 310);
      // 화면 상단 안내 대신 월드 안에 직접 배치된 표지판으로 구역 구조를 안내한다.
      // addSign으로 만든 표지판은 관리자 월드 편집에서도 문구·위치·크기 수정이 가능하다.
      addSign(origin + 310, floorY - 112, zone.name, getZoneSignSub(zone, localZoneIndex));
      addCheckpoint(origin + 120, floorY - 88, zone.name, `${zone.stageIndex}:${zone.localIndex}`);
    }

    initialOffscreenEnemyRemovals = removeInitiallyOffscreenEnemies();
    applyAdminWorldEdits();
    normalizeCheckpointPlacements();
    removeEmbeddedRepairPickups();
    restoreAdminPlacedObjects();
    restoreAdminSpawnedEnemies();
    for (let index = pickups.length - 1; index >= 0; index -= 1) {
      if (adminRemovedObjectIds.has(pickups[index].id)) pickups.splice(index, 1);
    }
    for (let index = boostNodes.length - 1; index >= 0; index -= 1) {
      if (adminRemovedObjectIds.has(boostNodes[index].id)) boostNodes.splice(index, 1);
    }
    rebuildPlatformSpatialIndex();
    configureCombatRooms();
    auditEnemyZoneContainment();
    applyAdminRemovedEnemyData();
    zoneDiversityMetrics = calculateZoneDiversityMetrics();
    game.totalEnemies = enemies.filter((enemy) => enemy.alive).length;
    rebuildAdminZoneGrid();
    initRain();
  }

  function calculateZoneDiversityMetrics() {
    const layoutSignatures = new Set();
    const enemySignatures = new Set();
    const enemyCounts = [];

    for (const zone of zones) {
      const zonePlatforms = platforms
        .filter((platform) => platform.x + platform.w / 2 >= zone.x && platform.x + platform.w / 2 < zone.end)
        .map((platform) => [
          Math.round(platform.x - zone.x),
          Math.round(platform.y),
          Math.round(platform.w),
          Math.round(platform.h),
          platform.kind || "",
        ].join(":"))
        .sort();
      const zoneHazards = hazards
        .filter((hazard) => hazard.x + hazard.w / 2 >= zone.x && hazard.x + hazard.w / 2 < zone.end)
        .map((hazard) => [
          Math.round(hazard.x - zone.x),
          Math.round(hazard.y),
          Math.round(hazard.w),
          Math.round(hazard.h),
          hazard.type || hazard.kind || "",
          Number(hazard.phase || 0).toFixed(2),
        ].join(":"))
        .sort();
      const zoneEnemies = enemies
        .filter((enemy) => {
          const originX = Number.isFinite(enemy.originX) ? enemy.originX : enemy.x;
          return originX >= zone.x && originX < zone.end;
        })
        .map((enemy) => {
          const originX = Number.isFinite(enemy.originX) ? enemy.originX : enemy.x;
          return [
            enemy.type,
            enemy.bossKind || "",
            Math.round(originX - zone.x),
            Math.round(enemy.spawnY ?? enemy.y),
          ].join(":");
        })
        .sort();

      layoutSignatures.add([
        zone.width,
        zone.layoutSeed || "",
        zonePlatforms.join(","),
        zoneHazards.join(","),
      ].join("|"));
      enemySignatures.add([zoneEnemies.length, zoneEnemies.join(",")].join("|"));
      enemyCounts.push(zoneEnemies.length);
    }

    return {
      layoutSignatureCount: layoutSignatures.size,
      enemySignatureCount: enemySignatures.size,
      minWidth: Math.min(...ZONE_WIDTHS),
      maxWidth: Math.max(...ZONE_WIDTHS),
      minEnemyCount: Math.min(...enemyCounts),
      maxEnemyCount: Math.max(...enemyCounts),
    };
  }

  function initRain() {
    rain.length = 0;
    for (let i = 0; i < 120; i += 1) {
      rain.push({
        x: hash(i * 3.1) * W,
        y: hash(i * 4.7 + 2) * H,
        speed: 420 + hash(i * 8.4) * 520,
        len: 7 + hash(i * 2.5) * 18,
      });
    }
  }

  function sanitizeStartScreenText(value, fallback, maxLength) {
    const text = typeof value === "string" ? value.trim() : "";
    return (text || fallback).slice(0, maxLength);
  }

  function normalizeStartScreenEdits(value) {
    if (!value || typeof value !== "object") return null;
    return {
      title: sanitizeStartScreenText(value.title, START_SCREEN_DEFAULTS.title, 40),
      button: sanitizeStartScreenText(value.button, START_SCREEN_DEFAULTS.button, 40),
      continueButton: sanitizeStartScreenText(value.continueButton, START_SCREEN_DEFAULTS.continueButton, 40),
      difficulties: Object.fromEntries(Object.entries(START_SCREEN_DEFAULTS.difficulties).map(([key, fallback]) => [
        key,
        sanitizeStartScreenText(value.difficulties?.[key], fallback, 24),
      ])),
    };
  }

  function readStartScreenEdits() {
    try {
      const raw = window.localStorage?.getItem(START_SCREEN_EDITS_KEY);
      return raw ? normalizeStartScreenEdits(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function persistStartScreenEdits() {
    try {
      if (startScreenEditData) window.localStorage?.setItem(START_SCREEN_EDITS_KEY, JSON.stringify(startScreenEditData));
      else window.localStorage?.removeItem(START_SCREEN_EDITS_KEY);
    } catch {
      // The edited title screen remains active for this session if storage is unavailable.
    }
  }

  function applyStartScreenEdits(value = START_SCREEN_DEFAULTS) {
    const data = normalizeStartScreenEdits(value) || START_SCREEN_DEFAULTS;
    if (startTitle) startTitle.textContent = data.title;
    if (startButton) startButton.textContent = data.button;
    if (continueButton) continueButton.textContent = data.continueButton;
    difficultyButtons.forEach((button) => {
      const key = button.dataset.difficulty;
      const name = data.difficulties[key];
      button.textContent = name;
      if (difficultySettings[key]) difficultySettings[key].name = name;
    });
  }

  function buildStartScreenDraftFromDom() {
    return {
      title: startTitle?.textContent || START_SCREEN_DEFAULTS.title,
      button: startButton?.textContent || START_SCREEN_DEFAULTS.button,
      continueButton: continueButton?.textContent || START_SCREEN_DEFAULTS.continueButton,
      difficulties: Object.fromEntries(difficultyButtons.map((button) => [button.dataset.difficulty, button.textContent || START_SCREEN_DEFAULTS.difficulties[button.dataset.difficulty]])),
    };
  }

  function setStartScreenEditor(open) {
    if (!startScreenEditor) return false;
    const shouldOpen = Boolean(open && adminModeUnlocked && game.mode === "menu");
    startScreenEditor.hidden = !shouldOpen;
    if (!shouldOpen) {
      startScreenDraft = null;
      return false;
    }
    startScreenDraft = buildStartScreenDraftFromDom();
    startScreenEditInputs.title.value = startScreenDraft.title;
    startScreenEditInputs.button.value = startScreenDraft.button;
    startScreenEditInputs.continueButton.value = startScreenDraft.continueButton;
    startScreenEditInputs.difficultyChick.value = startScreenDraft.difficulties.chick;
    startScreenEditInputs.difficultyCadet.value = startScreenDraft.difficulties.cadet;
    startScreenEditInputs.difficultyDarkhorse.value = startScreenDraft.difficulties.darkhorse;
    startScreenEditInputs.difficultyWeapon.value = startScreenDraft.difficulties.weapon;
    return true;
  }

  function saveStartScreenEditor() {
    if (!startScreenDraft || !adminModeUnlocked || game.mode !== "menu") return false;
    startScreenDraft.title = startScreenEditInputs.title.value;
    startScreenDraft.button = startScreenEditInputs.button.value;
    startScreenDraft.continueButton = startScreenEditInputs.continueButton.value;
    startScreenDraft.difficulties = {
      chick: startScreenEditInputs.difficultyChick.value,
      cadet: startScreenEditInputs.difficultyCadet.value,
      darkhorse: startScreenEditInputs.difficultyDarkhorse.value,
      weapon: startScreenEditInputs.difficultyWeapon.value,
    };
    startScreenEditData = normalizeStartScreenEdits(startScreenDraft);
    persistStartScreenEdits();
    applyStartScreenEdits(startScreenEditData);
    updateContinueButton();
    setStartScreenEditor(false);
    if (adminStatus) adminStatus.textContent = "ADMIN MODE 활성화 · 첫 화면 편집 내용 저장 완료";
    sound.tone(760, 0.14, "sine", 0.03, 1.3);
    return true;
  }

  function resetStartScreenEditor() {
    if (!adminModeUnlocked || game.mode !== "menu") return false;
    startScreenEditData = null;
    persistStartScreenEdits();
    applyStartScreenEdits(START_SCREEN_DEFAULTS);
    updateContinueButton();
    setStartScreenEditor(true);
    if (adminStatus) adminStatus.textContent = "ADMIN MODE 활성화 · 첫 화면 기본값 복원 완료";
    sound.tone(480, 0.12, "square", 0.025, 1.2);
    return true;
  }

  function readCampaignSave() {
    try {
      const raw = window.localStorage?.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.version === 1 || data?.version === 2 ? data : null;
    } catch {
      return null;
    }
  }

  function resolveCampaignCheckpointIndex(saved) {
    if (!saved || checkpoints.length === 0) return 0;
    const savedStageIndex = clamp(Number(saved.respawnStage) || 0, 0, stages.length - 1);
    if (typeof saved.checkpointKey === "string") {
      const keyedIndex = checkpoints.findIndex((checkpoint) => checkpoint.checkpointKey === saved.checkpointKey);
      if (keyedIndex >= 0) return keyedIndex;
    }
    if (Number.isInteger(saved.respawnZone)) {
      const zoneIndex = clamp(saved.respawnZone, 0, checkpoints.length - 1);
      if (zones[zoneIndex]?.stageIndex === savedStageIndex) return zoneIndex;
    }
    const legacyZonesPerStage = Number.isInteger(saved.zonesPerStage) ? Math.max(1, saved.zonesPerStage) : 7;
    if (Number.isInteger(saved.respawnCheckpointIndex)) {
      const legacyLocalIndex = clamp(saved.respawnCheckpointIndex - savedStageIndex * legacyZonesPerStage, 0, legacyZonesPerStage - 1);
      const currentLocalIndex = legacyZonesPerStage === ZONES_PER_STAGE
        ? legacyLocalIndex
        : Math.round((legacyLocalIndex / Math.max(1, legacyZonesPerStage - 1)) * (ZONES_PER_STAGE - 1));
      const migratedIndex = clamp(savedStageIndex * ZONES_PER_STAGE + currentLocalIndex, 0, checkpoints.length - 1);
      if (zones[migratedIndex]?.stageIndex === savedStageIndex) return migratedIndex;
    }
    const stageStart = savedStageIndex * ZONES_PER_STAGE;
    const stageEnd = Math.min(checkpoints.length, stageStart + ZONES_PER_STAGE);
    const savedX = Number.isFinite(Number(saved.respawnX)) ? Number(saved.respawnX) : checkpoints[stageStart]?.x || 150;
    let closestIndex = clamp(stageStart, 0, checkpoints.length - 1);
    for (let index = stageStart; index < stageEnd; index += 1) {
      if (Math.abs(checkpoints[index].x - savedX) < Math.abs(checkpoints[closestIndex].x - savedX)) closestIndex = index;
    }
    return closestIndex;
  }

  function updateContinueButton() {
    if (!continueButton) return;
    const saved = readCampaignSave();
    continueButton.hidden = false;
    continueButton.disabled = !saved;
    const editData = normalizeStartScreenEdits(startScreenEditData) || START_SCREEN_DEFAULTS;
    const savedCheckpointIndex = saved && checkpoints.length ? resolveCampaignCheckpointIndex(saved) : -1;
    const savedStage = saved
      ? clamp((savedCheckpointIndex >= 0 ? zones[savedCheckpointIndex]?.stageIndex : Number(saved.respawnStage) || 0) + 1, 1, stages.length)
      : 1;
    const savedLocalZone = savedCheckpointIndex >= 0
      ? (zones[savedCheckpointIndex]?.localIndex || 0) + 1
      : 1;
    continueButton.textContent = saved
      ? `${editData.continueButton} · ${String(savedStage).padStart(2, "0")}-${String(savedLocalZone).padStart(2, "0")}`
      : editData.continueButton;
  }

  function saveCampaign() {
    if (game.mode !== "playing") return;
    try {
      const checkpointZone = clamp(Number(player.respawnZone) || 0, 0, zones.length - 1);
      const defeatedBeforeCheckpoint = enemies.filter((enemy) => (
        !enemy.alive && getZoneIndexAt(enemy.originX) < checkpointZone
      ));
      const persistedBosses = [...game.defeatedBosses].filter((bossKind) => {
        const boss = enemies.find((enemy) => enemy.type === "boss" && enemy.bossKind === bossKind);
        return boss && getZoneIndexAt(boss.originX) < checkpointZone;
      });
      const data = {
        version: 2,
        zonesPerStage: ZONES_PER_STAGE,
        difficulty: game.difficulty,
        runTime: game.runTime,
        deaths: game.deaths,
        kills: game.kills,
        tutorialCompleted: game.tutorialCompleted,
        tutorialStep: game.tutorialStep,
        respawnX: player.respawnX,
        respawnY: player.respawnY,
        respawnStage: player.respawnStage,
        respawnZone: player.respawnZone,
        respawnCheckpointIndex: player.respawnCheckpointIndex,
        checkpointKey: player.respawnCheckpointKey,
        defeatedBosses: persistedBosses,
        stageClearTimes: [...game.stageClearTimes],
        storySeen: [...game.storySeen],
        cutsceneSeen: [...game.cutsceneSeen],
        defeatedEnemyIds: defeatedBeforeCheckpoint.map((enemy) => enemy.id),
        countedKillEnemyIds: defeatedBeforeCheckpoint.filter((enemy) => enemy.countedKill).map((enemy) => enemy.id),
        roomStates: combatRooms.map((room) => {
          const beforeCheckpoint = getZoneIndexAt(room.left) < checkpointZone;
          return { left: room.left, triggered: beforeCheckpoint && room.triggered, cleared: beforeCheckpoint && room.cleared };
        }),
      };
      window.localStorage?.setItem(SAVE_KEY, JSON.stringify(data));
      updateContinueButton();
    } catch {
      // Private browsing or blocked storage should never stop the game loop.
    }
  }

  function restoreCampaign(saved) {
    const savedCheckpointIndex = resolveCampaignCheckpointIndex(saved);
    const restartZoneIndex = getZoneIndexAt(checkpoints[savedCheckpointIndex]?.x || 0);
    const deadIds = new Set(saved.defeatedEnemyIds || []);
    const legacyTutorialCompleted = (saved.respawnZone || 0) > 0
      || (saved.respawnX || 0) >= ZONE_W
      || deadIds.size > 0;
    game.tutorialCompleted = saved.tutorialCompleted === undefined
      ? legacyTutorialCompleted
      : Boolean(saved.tutorialCompleted);
    game.tutorialStep = game.tutorialCompleted
      ? TUTORIAL_STEPS.length
      : clamp(Number(saved.tutorialStep) || 0, 0, TUTORIAL_STEPS.length - 1);
    game.tutorialActive = !game.tutorialCompleted && !game.adminMode && (saved.respawnStage || 0) === 0;
    game.tutorialSignals = createTutorialSignals();
    const savedCountedIds = Array.isArray(saved.countedKillEnemyIds)
      ? new Set(saved.countedKillEnemyIds)
      : null;
    const legacySave = savedCountedIds === null;
    let legacyCountedKills = Math.min(Math.max(0, saved.kills || 0), deadIds.size);
    for (const enemy of enemies) {
      if (!deadIds.has(enemy.id)) continue;
      // 이어하기는 언제나 마지막 체크포인트부터 다시 시작한다. 그 구역 이후의 전투 기록은 롤백한다.
      if (getZoneIndexAt(enemy.originX) >= restartZoneIndex) continue;
      // v1.6.5 and older could cull the final boss during its cutscene.
      if (legacySave && !enemy.adminSpawned && enemy.type === "boss" && enemy.bossKind === "echo") continue;
      if (!enemy.adminSpawned && enemy.type === "boss" && enemy.bossKind === "echo" && adminRemovedEnemyIds.has(enemy.id)) continue;
      enemy.alive = false;
      enemy.hp = 0;
      enemy.countedKill = savedCountedIds ? savedCountedIds.has(enemy.id) : legacyCountedKills-- > 0;
    }
    for (const state of saved.roomStates || []) {
      const room = combatRooms.find((candidate) => candidate.left === state.left);
      if (!room) continue;
      const beforeCheckpoint = getZoneIndexAt(room.left) < restartZoneIndex;
      room.triggered = beforeCheckpoint && Boolean(state.triggered);
      room.cleared = beforeCheckpoint && Boolean(state.cleared);
    }
    setRespawnCheckpoint(checkpoints[savedCheckpointIndex], savedCheckpointIndex);
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.hp = player.maxHp;
    game.runTime = Math.max(0, saved.runTime || 0);
    game.deaths = Math.max(0, saved.deaths || 0);
    game.kills = enemies.reduce((count, enemy) => count + (enemy.countedKill ? 1 : 0), 0);
    game.defeatedBosses = new Set((saved.defeatedBosses || []).filter((bossKind) => {
      const boss = enemies.find((enemy) => enemy.type === "boss" && enemy.bossKind === bossKind);
      return boss && getZoneIndexAt(boss.originX) < restartZoneIndex;
    }));
    if (legacySave) game.defeatedBosses.delete("echo");
    applyBossRewards({ refill: true });
    game.stageClearTimes = Array.isArray(saved.stageClearTimes) ? saved.stageClearTimes.slice(0, stages.length) : Array(stages.length).fill(0);
    while (game.stageClearTimes.length < stages.length) game.stageClearTimes.push(0);
    game.storySeen = new Set(saved.storySeen || []);
    game.cutsceneSeen = new Set(saved.cutsceneSeen || []);
    game.storyQueue = [];
    game.story = null;
    game.storyTimer = 0;
    game.cutscene = null;
    game.cutsceneTimer = 0;
    game.cutsceneShotIndex = 0;
    game.cutsceneShotElapsed = 0;
    game.stage = player.respawnStage;
    game.zone = player.respawnZone;
    announceStageAbility(game.stage, true);
    game.stageBossDefeated = game.defeatedBosses.has("warden");
    game.bossDefeated = game.defeatedBosses.has("echo");
    game.burstUnlocked = game.tutorialCompleted || game.tutorialActive || player.x > 5200;
    camera.x = clamp(player.x - 300, 0, WORLD_W - W);
    camera.y = clamp(player.y - 420, 0, WORLD_H - H);
    game.hint = `자동 저장 불러오기 · STAGE 0${game.stage + 1}`;
    game.hintTimer = 4;
    saveCampaign();
  }

  function resetGame(resume = false) {
    const requestedAt = performance.now();
    if (requestedAt - lastResetAt < 700) return;
    lastResetAt = requestedAt;
    setStartScreenEditor(false);
    resetBossRealityEffects();
    const saved = resume ? readCampaignSave() : null;
    if (saved?.difficulty && difficultySettings[saved.difficulty]) selectedDifficulty = saved.difficulty;
    if (!resume) {
      try { window.localStorage?.removeItem(SAVE_KEY); } catch { /* Ignore unavailable storage. */ }
    }
    if (!levelReady || game.mode !== "menu") {
      buildLevel();
      levelReady = true;
    }
    const difficulty = difficultySettings[selectedDifficulty];
    Object.assign(player, {
      x: 150,
      y: 540,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      landingImpactArmed: false,
      coyote: 0,
      jumpBuffer: 0,
      airJumpAvailable: true,
      attackTimer: 0,
      attackCooldown: 0,
      attackId: 0,
      adminEraseAttackId: -1,
      invincible: 0,
      hp: difficulty.hp,
      maxHp: difficulty.hp,
      respawnX: 150,
      respawnY: 540,
      respawnStage: 0,
      respawnZone: 0,
      respawnCheckpointIndex: -1,
      respawnCheckpointKey: "0:0",
      trail: [],
      afterimageTimer: 0,
      combo: 0,
      comboTimer: 0,
      slashChain: 0,
      slashChainTimer: 0,
      attackDuration: 0.22,
      styleScore: 0,
      chargedAttack: false,
      shotgunCooldown: 0,
      shotgunReload: 0,
      shells: 2,
      maxShells: 2,
      shotgunCharge: 0,
      shotId: 0,
      recoilTimer: 0,
      wallLeft: false,
      wallRight: false,
      burstCooldown: 0,
      burstTimer: 0,
      burstParryTimer: 0,
      buffTimer: 0,
      rewardPower: 0,
      squash: 0,
      stepTimer: 0,
      runCycle: 0,
    });
    Object.assign(game, {
      mode: "playing",
      runTime: 0,
      freeze: 0,
      shake: 0,
      flash: 0,
      deaths: 0,
      kills: 0,
      difficulty: selectedDifficulty,
      adminMode: adminModeUnlocked,
      adminCadetMode: false,
      adminPreviousDifficulty: selectedDifficulty,
      adminCadetStartZone: 0,
      adminCadetStartStage: 0,
      stage: 0,
      stageTitle: 4.4,
      zone: 0,
      zoneTitle: 3.4,
      hint: "A / D 이동 · 마우스로 조준",
      hintTimer: 5,
      bossDefeated: false,
      stageBossDefeated: false,
      defeatedBosses: new Set(),
      stageClearTimes: Array(stages.length).fill(0),
      startedAt: performance.now(),
      burstUnlocked: false,
      storyQueue: [],
      story: null,
      storyTimer: 0,
      storySeen: new Set(),
      cutscene: null,
      cutsceneTimer: 0,
      cutsceneShotIndex: 0,
      cutsceneShotElapsed: 0,
      cutsceneSeen: new Set(),
      arenaTitle: 0,
      tutorialOpen: false,
      tutorialActive: false,
      tutorialCompleted: false,
      tutorialStep: 0,
      tutorialPulse: 0,
      tutorialSignals: createTutorialSignals(),
      stageAbilityNotice: null,
      stageAbilityNoticeTimer: 0,
      lastAbilityNoticeStage: -1,
    });
    if (saved) restoreCampaign(saved);
    if (!saved) {
      game.tutorialActive = !game.adminMode;
      game.tutorialCompleted = game.adminMode;
      game.burstUnlocked = true;
      game.storyQueue = [];
      if (!game.tutorialActive && !game.adminMode) {
        queueStory(INTRO_STORY, { stageIndex: 0, minX: TUTORIAL_END_X + 260, maxX: stages[0].end });
      }
      if (checkpoints[0]) setRespawnCheckpoint(checkpoints[0], 0);
      camera.x = 0;
      camera.y = 0;
    }
    syncAdminRemovedBossState();
    setAdminSpawnPanel(false);
    setAdminZonePanel(false);
    keys.clear();
    pressed.clear();
    startScreen.classList.remove("visible");
    pauseScreen.classList.remove("visible");
    endScreen.classList.remove("visible");
    syncTutorialDataset();
    setTutorialPanel(!saved && !game.adminMode);
    updateContinueButton();
    sound.wake();
  }

  function setAdminSpawnPanel(open) {
    if (!adminSpawnPanel) return false;
    const shouldOpen = Boolean(open && game.adminMode && game.mode === "playing");
    if (shouldOpen && adminZonePanel) adminZonePanel.hidden = true;
    adminSpawnPanel.hidden = !shouldOpen;
    adminSpawnPanel.classList.toggle?.("visible", shouldOpen);
    if (!shouldOpen) setAdminWorldEditor(false);
    return shouldOpen;
  }

  function toggleAdminSpawnPanel() {
    return setAdminSpawnPanel(adminSpawnPanel?.hidden !== false);
  }

  function createTutorialSignals() {
    return {
      groundJump: false,
      doubleJump: false,
      wallJump: false,
      burst: false,
      slash: false,
      shotgun: false,
    };
  }

  function getTutorialStep() {
    return TUTORIAL_STEPS[clamp(game.tutorialStep, 0, TUTORIAL_STEPS.length - 1)];
  }

  function isPlayerInTutorialStepZone(step = getTutorialStep()) {
    if (!step) return false;
    const playerCenterX = player.x + player.w / 2;
    return playerCenterX >= step.minX && playerCenterX <= step.maxX;
  }

  function syncTutorialDataset() {
    document.documentElement.dataset.tutorialActive = String(game.tutorialActive);
    document.documentElement.dataset.tutorialCompleted = String(game.tutorialCompleted);
    document.documentElement.dataset.tutorialStep = String(game.tutorialStep);
    document.documentElement.dataset.tutorialCurrentSkill = game.tutorialActive ? getTutorialStep()?.id || "" : "";
    document.documentElement.dataset.tutorialInRequiredZone = String(game.tutorialActive && isPlayerInTutorialStepZone());
    document.documentElement.dataset.tutorialPlayerX = String(Math.round(player.x));
    document.documentElement.dataset.tutorialPlayerY = String(Math.round(player.y));
  }

  function markTutorialSignal(signal) {
    if (!game.tutorialActive || game.adminMode) return false;
    const step = getTutorialStep();
    if (!step) return false;
    const expected = {
      groundJump: "move",
      doubleJump: "doubleJump",
      wallJump: "wallJump",
      burst: "burst",
      slash: "combat",
      shotgun: "combat",
    }[signal];
    if (expected && step.id !== expected) return false;
    if (!isPlayerInTutorialStepZone(step)) {
      game.hint = `${step.title} 훈련 구역 안에서 사용해야 인정됩니다.`;
      game.hintTimer = Math.max(game.hintTimer, 1.35);
      return false;
    }
    game.tutorialSignals[signal] = true;
    return true;
  }

  function finishTutorialStage() {
    if (!game.tutorialActive) return false;
    game.tutorialActive = false;
    game.tutorialCompleted = true;
    game.tutorialStep = TUTORIAL_STEPS.length;
    game.burstUnlocked = true;
    game.stageTitle = 4.4;
    game.zoneTitle = 0;
    game.hint = "기동 훈련 완료 · 초승 훈련장을 나가 첫 작전을 시작하세요";
    game.hintTimer = 5;
    queueStory(INTRO_STORY, { stageIndex: 0, minX: TUTORIAL_END_X + 260, maxX: stages[0].end });
    syncTutorialDataset();
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 32, 440, 0.75, 260);
    sound.checkpoint();
    saveCampaign();
    return true;
  }

  function advanceTutorialStep() {
    const completedStep = getTutorialStep();
    game.tutorialStep += 1;
    game.tutorialSignals = createTutorialSignals();
    game.tutorialPulse = 1;
    syncTutorialDataset();
    if (game.tutorialStep >= TUTORIAL_STEPS.length) return finishTutorialStage();
    const nextStep = getTutorialStep();
    game.hint = `${completedStep.title} 완료 · 다음 훈련: ${nextStep.title}`;
    game.hintTimer = 3.4;
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 18, 300, 0.48, 180);
    sound.tone(440 + game.tutorialStep * 45, 0.14, "sine", 0.032, 1.28);
    return true;
  }

  function updateTutorialStage(dt) {
    if (!game.tutorialActive || game.adminMode) return;
    syncTutorialDataset();
    game.tutorialPulse = Math.max(0, game.tutorialPulse - dt * 2.6);
    const step = getTutorialStep();
    if (!step) return;

    let completed = false;
    const inRequiredZone = isPlayerInTutorialStepZone(step);
    if (step.id === "move") completed = inRequiredZone && game.tutorialSignals.groundJump && player.x > 500;
    else if (step.id === "doubleJump") completed = inRequiredZone && game.tutorialSignals.doubleJump;
    else if (step.id === "wallJump") completed = inRequiredZone && game.tutorialSignals.wallJump;
    else if (step.id === "burst") completed = inRequiredZone && game.tutorialSignals.burst;
    else if (step.id === "combat") completed = inRequiredZone && game.tutorialSignals.slash && game.tutorialSignals.shotgun;
    else if (step.id === "exit") completed = inRequiredZone && player.x > TUTORIAL_END_X - 120;
    if (completed) {
      advanceTutorialStep();
      return;
    }

    const gateX = step.gateX;
    if (player.x + player.w > gateX) {
      player.x = gateX - player.w;
      player.vx = Math.min(0, player.vx);
      game.hint = `${step.title} 훈련을 먼저 완료하세요`;
      game.hintTimer = Math.max(game.hintTimer, 1.1);
    }
  }

  function prepareTutorialBriefing() {
    if (!tutorialPanel) return;
    const title = tutorialPanel.querySelector("header strong");
    const grid = tutorialPanel.querySelector(".tutorial-grid");
    const description = tutorialPanel.querySelector(":scope > p");
    if (title) title.textContent = "초승 훈련장 · 실전 조작 훈련";
    if (grid) {
      grid.innerHTML = `
        <article><kbd>A</kbd><kbd>D</kbd><b>이동</b><span>좌우 이동과 기본 점프를 연습합니다.</span></article>
        <article><kbd>SPACE</kbd><b>이중 점프</b><span>공중에서 한 번 더 눌러 높이 오릅니다.</span></article>
        <article><kbd>W</kbd><kbd>SPACE</kbd><b>벽타기</b><span>벽을 밀며 오르고 점프로 벽을 찹니다.</span></article>
        <article><kbd>E</kbd><b>버스트</b><span>일반 적 탄환을 지우는 1.8초 재사용 방어 기술입니다.</span></article>
        <article><kbd>좌클릭</kbd><b>발도</b><span>칼날에 닿은 투사체와 의사의 플라스크·독가스를 제거합니다.</span></article>
        <article><kbd>우클릭</kbd><b>샷건</b><span>조준 방향으로 강한 산탄을 발사합니다.</span></article>`;
    }
    if (description) description.textContent = "여섯 과제를 순서대로, 각자 표시된 훈련 구역 안에서 완료해야 다음 문이 열립니다. 다른 구역에서 미리 사용한 조작은 인정되지 않습니다.";
    if (tutorialClose) tutorialClose.textContent = "훈련 시작";
  }

  function setTutorialPanel(open) {
    const shouldOpen = Boolean(open && game.mode === "playing");
    game.tutorialOpen = shouldOpen;
    if (tutorialPanel) tutorialPanel.hidden = !shouldOpen;
    if (shouldOpen) {
      keys.clear();
      pressed.clear();
      player.vx = 0;
      player.vy = 0;
    }
    return shouldOpen;
  }

  function closeTutorialPanel() {
    if (!game.tutorialOpen) return false;
    setTutorialPanel(false);
    previousTime = performance.now();
    sound.tone(520, 0.12, "sine", 0.028, 1.25);
    return true;
  }

  function rebuildAdminZoneGrid() {
    if (!adminZoneGrid) return;
    adminZoneGrid.replaceChildren();
    const fragment = document.createDocumentFragment();
    zones.forEach((zone, zoneIndex) => {
      const button = document.createElement("button");
      const localZone = zoneIndex % ZONES_PER_STAGE;
      button.type = "button";
      button.dataset.adminZone = String(zoneIndex);
      button.classList.toggle("stage-start", localZone === 0);
      button.innerHTML = `<b>${zone.stageIndex + 1}-${String(localZone + 1).padStart(2, "0")}</b><span>${zone.name}</span>`;
      button.addEventListener("click", () => teleportAdminToZone(zoneIndex));
      fragment.appendChild(button);
    });
    adminZoneGrid.appendChild(fragment);
  }

  function setAdminZonePanel(open) {
    if (!adminZonePanel) return false;
    const shouldOpen = Boolean(open && game.adminMode && game.mode === "playing" && !game.tutorialOpen);
    adminZonePanel.hidden = !shouldOpen;
    if (shouldOpen) {
      setAdminSpawnPanel(false);
      for (const button of adminZoneGrid?.querySelectorAll?.("[data-admin-zone]") || []) {
        button.classList.toggle("current", Number(button.dataset.adminZone) === game.zone);
      }
    }
    return shouldOpen;
  }

  function toggleAdminZonePanel() {
    return setAdminZonePanel(adminZonePanel?.hidden !== false);
  }

  function setAdminWorldEditor(open, object = selectedAdminWorldObject) {
    if (!adminWorldEditor) return false;
    const shouldOpen = Boolean(open && object && game.adminMode && game.mode === "playing");
    selectedAdminWorldObject = shouldOpen ? object : null;
    adminWorldEditor.hidden = !shouldOpen;
    if (!shouldOpen) {
      adminWorldTransform = null;
      return false;
    }
    const typeNames = { platform: "발판/구조물", hazard: "위험 구조물", sign: "배경 표지판", backdrop: "배경 장식" };
    if (adminWorldSelected) adminWorldSelected.textContent = `${typeNames[object.adminWorldType] || object.adminWorldType} · ${object.id}`;
    adminWorldInputs.kind.value = object.kind || "";
    adminWorldInputs.text.value = object.text || "";
    adminWorldInputs.sub.value = object.sub || "";
    const supportsText = object.adminWorldType === "sign" || object.adminWorldType === "backdrop";
    adminWorldInputs.text.disabled = !supportsText;
    adminWorldInputs.sub.disabled = !supportsText;
    updateAdminWorldTransformStatus(object);
    if (adminWorldUndo) adminWorldUndo.disabled = adminWorldUndoSnapshot?.id !== object.id;
    return true;
  }

  function getAdminWorldBounds(object) {
    if (object.adminWorldType === "sign") {
      const height = object.h || 60;
      return { x: object.x - 12, y: object.y - height + 14, w: object.w || 174, h: height };
    }
    return { x: object.x, y: object.y, w: object.w || 24, h: object.h || 24 };
  }

  function updateAdminWorldTransformStatus(object = selectedAdminWorldObject) {
    if (!adminWorldTransformStatus || !object) return;
    const bounds = getAdminWorldBounds(object);
    adminWorldTransformStatus.textContent = `X ${Math.round(bounds.x)} · Y ${Math.round(bounds.y)} · ${Math.round(bounds.w)} × ${Math.round(bounds.h)}`;
  }

  function setAdminWorldBounds(object, nextBounds) {
    const minW = object.adminWorldType === "sign" || object.adminWorldType === "backdrop" ? 40 : 12;
    const minH = object.adminWorldType === "sign" || object.adminWorldType === "backdrop" ? 28 : 8;
    const w = clamp(nextBounds.w, minW, 1800);
    const h = clamp(nextBounds.h, minH, 900);
    const x = clamp(nextBounds.x, 0, WORLD_W - w);
    const y = clamp(nextBounds.y, -600, WORLD_H - h);
    if (object.adminWorldType === "sign") {
      object.x = x + 12;
      object.y = y + h - 14;
      object.w = w;
      object.h = h;
    } else {
      object.x = x;
      object.y = y;
      object.w = w;
      object.h = h;
    }
    if (object.adminWorldType === "platform") object.originalY = object.y;
  }

  function getAdminWorldHandlePoints(bounds) {
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h / 2;
    return [
      { name: "nw", x: bounds.x, y: bounds.y },
      { name: "n", x: centerX, y: bounds.y },
      { name: "ne", x: bounds.x + bounds.w, y: bounds.y },
      { name: "e", x: bounds.x + bounds.w, y: centerY },
      { name: "se", x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      { name: "s", x: centerX, y: bounds.y + bounds.h },
      { name: "sw", x: bounds.x, y: bounds.y + bounds.h },
      { name: "w", x: bounds.x, y: centerY },
    ];
  }

  function findAdminWorldObjectAt(worldX, worldY) {
    const candidates = [...signs, ...hazards, ...adminBackdrops, ...platforms]
      .filter((object) => {
        if (object.hidden) return false;
        const bounds = getAdminWorldBounds(object);
        return worldX >= bounds.x - 12 && worldX <= bounds.x + bounds.w + 12
          && worldY >= bounds.y - 12 && worldY <= bounds.y + bounds.h + 12;
      })
      .sort((first, second) => {
        const firstBounds = getAdminWorldBounds(first);
        const secondBounds = getAdminWorldBounds(second);
        return firstBounds.w * firstBounds.h - secondBounds.w * secondBounds.h;
      });
    return candidates[0] || null;
  }

  function getAdminWorldTransformMode(object, worldX, worldY, pointerType = "mouse") {
    const bounds = getAdminWorldBounds(object);
    const radius = pointerType === "touch" ? 38 : 20;
    let closestHandle = null;
    let closestDistance = Infinity;
    for (const handle of getAdminWorldHandlePoints(bounds)) {
      const distance = Math.hypot(worldX - handle.x, worldY - handle.y);
      if (distance <= radius && distance < closestDistance) {
        closestHandle = handle.name;
        closestDistance = distance;
      }
    }
    if (closestHandle) return closestHandle;
    if (worldX >= bounds.x && worldX <= bounds.x + bounds.w && worldY >= bounds.y && worldY <= bounds.y + bounds.h) return "move";
    return null;
  }

  function beginAdminWorldTransform(event) {
    if (!game.adminMode || game.mode !== "playing" || adminWorldEditor?.hidden !== false) return false;
    updatePointer(event);
    const worldX = pointer.screenX + camera.x;
    const worldY = pointer.screenY + camera.y;
    let object = selectedAdminWorldObject;
    let mode = object ? getAdminWorldTransformMode(object, worldX, worldY, event.pointerType) : null;
    if (!mode) {
      object = findAdminWorldObjectAt(worldX, worldY);
      if (!object) return false;
      setAdminWorldEditor(true, object);
      mode = getAdminWorldTransformMode(object, worldX, worldY, event.pointerType) || "move";
    }
    const bounds = getAdminWorldBounds(object);
    adminWorldUndoSnapshot = { id: object.id, type: object.adminWorldType, record: serializeAdminWorldObject(object) };
    if (adminWorldUndo) adminWorldUndo.disabled = true;
    adminWorldTransform = {
      pointerId: event.pointerId,
      object,
      mode,
      startX: worldX,
      startY: worldY,
      startBounds: { ...bounds },
      aspect: Math.max(0.01, bounds.w / Math.max(1, bounds.h)),
      changed: false,
    };
    canvas.setPointerCapture?.(event.pointerId);
    return true;
  }

  function updateAdminWorldTransform(event) {
    const transform = adminWorldTransform;
    if (!transform || transform.pointerId !== event.pointerId) return false;
    updatePointer(event);
    const worldX = pointer.screenX + camera.x;
    const worldY = pointer.screenY + camera.y;
    const deltaX = worldX - transform.startX;
    const deltaY = worldY - transform.startY;
    const mode = transform.mode;
    const next = { ...transform.startBounds };
    if (mode === "move") {
      next.x += deltaX;
      next.y += deltaY;
    } else {
      if (mode.includes("e")) next.w += deltaX;
      if (mode.includes("s")) next.h += deltaY;
      if (mode.includes("w")) { next.x += deltaX; next.w -= deltaX; }
      if (mode.includes("n")) { next.y += deltaY; next.h -= deltaY; }
      if (event.shiftKey && mode.length === 2) {
        const targetW = Math.max(12, next.w);
        const targetH = targetW / transform.aspect;
        if (mode.includes("n")) next.y = transform.startBounds.y + transform.startBounds.h - targetH;
        next.h = targetH;
      }
    }
    setAdminWorldBounds(transform.object, next);
    transform.changed = transform.changed || Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5;
    updateAdminWorldTransformStatus(transform.object);
    markPlatformSpatialIndexDirty();
    return true;
  }

  function finishAdminWorldTransform(event = null) {
    const transform = adminWorldTransform;
    if (!transform || (event && transform.pointerId !== event.pointerId)) return false;
    adminWorldTransform = null;
    if (!transform.changed) {
      adminWorldUndoSnapshot = null;
      if (adminWorldUndo) adminWorldUndo.disabled = true;
      return true;
    }
    transform.object.hidden = false;
    recordAdminWorldObject(transform.object);
    if (transform.object.adminWorldType === "platform" || transform.object.adminWorldType === "hazard") normalizeCheckpointPlacements();
    if (adminWorldUndo) adminWorldUndo.disabled = false;
    updateAdminWorldTransformStatus(transform.object);
    game.hint = `관리자 직접 편집 · ${transform.mode === "move" ? "이동" : "크기"} 자동 저장`;
    game.hintTimer = 1.8;
    sound.tone(640, 0.08, "sine", 0.018, 1.15);
    return true;
  }

  function undoAdminWorldTransform() {
    const snapshot = adminWorldUndoSnapshot;
    const object = selectedAdminWorldObject;
    if (!snapshot || !object || snapshot.id !== object.id) return false;
    Object.assign(object, snapshot.record);
    if (object.adminWorldType === "platform") object.originalY = object.y;
    recordAdminWorldObject(object);
    normalizeCheckpointPlacements();
    markPlatformSpatialIndexDirty();
    adminWorldUndoSnapshot = null;
    if (adminWorldUndo) adminWorldUndo.disabled = true;
    setAdminWorldEditor(true, object);
    game.hint = "관리자 직접 편집 · 마지막 이동/크기 조절 취소";
    game.hintTimer = 2;
    return true;
  }

  function findNearestAdminWorldObject() {
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const object of [...signs, ...platforms, ...hazards, ...adminBackdrops]) {
      if (object.hidden) continue;
      const bounds = getAdminWorldBounds(object);
      const closestX = clamp(centerX, bounds.x, bounds.x + bounds.w);
      const closestY = clamp(centerY, bounds.y, bounds.y + bounds.h);
      const distance = Math.hypot(centerX - closestX, centerY - closestY);
      if (distance < nearestDistance) {
        nearest = object;
        nearestDistance = distance;
      }
    }
    if (!nearest || nearestDistance > 900) {
      game.hint = "관리자 편집 · 900px 안에 수정할 배경 요소가 없습니다";
      game.hintTimer = 2.8;
      return null;
    }
    setAdminWorldEditor(true, nearest);
    return nearest;
  }

  function createAdminWorldObject(type) {
    if (!game.adminMode || game.mode !== "playing") return null;
    adminWorldSerial += 1;
    const id = `admin-world:${Date.now().toString(36)}:${adminWorldSerial.toString(36)}:${type}`;
    const x = clamp(player.x + player.w + 72, 0, WORLD_W - 320);
    const y = clamp(player.y + player.h + 50, 40, WORLD_H - 80);
    let object = null;
    if (type === "sign") {
      object = addSign(x, y, "새 표지판", "관리자 편집으로 문구를 바꾸세요");
    } else if (type === "platform") {
      object = addPlatform(x, y, 260, 28, "factory");
    } else if (type === "hazard") {
      object = addHazard(x, y, 140, 24, "spike", 0);
    } else if (type === "backdrop") {
      object = addAdminBackdrop({ id, type, custom: true, x, y: y - 210, w: 280, h: 210, kind: "panel", text: "ADMIN SECTOR", sub: "CUSTOM BACKDROP" });
    }
    if (!object) return null;
    object.id = id;
    object.adminWorldCustom = true;
    object.adminWorldBase = { ...serializeAdminWorldObject(object), hidden: false };
    recordAdminWorldObject(object);
    setAdminWorldEditor(true, object);
    game.hint = "관리자 편집 · 새 배경 요소 생성";
    game.hintTimer = 2.4;
    return object;
  }

  function saveAdminWorldSelection() {
    const object = selectedAdminWorldObject;
    if (!object || !game.adminMode) return false;
    object.kind = String(adminWorldInputs.kind.value || object.kind || "roof").trim().slice(0, 30);
    if (object.adminWorldType === "sign" || object.adminWorldType === "backdrop") {
      object.text = String(adminWorldInputs.text.value || "").trim().slice(0, 80);
      object.sub = String(adminWorldInputs.sub.value || "").trim().slice(0, 120);
    }
    object.hidden = false;
    if (object.adminWorldType === "platform") object.originalY = object.y;
    recordAdminWorldObject(object);
    game.hint = "관리자 편집 · 문구·종류 저장 완료";
    game.hintTimer = 2.6;
    setAdminWorldEditor(true, object);
    sound.tone(690, 0.12, "sine", 0.025, 1.25);
    normalizeCheckpointPlacements();
    markPlatformSpatialIndexDirty();
    return true;
  }

  function deleteAdminWorldSelection() {
    const object = selectedAdminWorldObject;
    if (!object || !game.adminMode) return false;
    if (object.adminWorldCustom) {
      const source = object.adminWorldType === "platform"
        ? platforms
        : object.adminWorldType === "hazard"
          ? hazards
          : object.adminWorldType === "sign"
            ? signs
            : adminBackdrops;
      const index = source.indexOf(object);
      if (index >= 0) source.splice(index, 1);
      removeAdminWorldObjectData(object.id);
    } else {
      object.hidden = true;
      recordAdminWorldObject(object);
    }
    game.hint = "관리자 편집 · 배경 요소 숨김/삭제 완료";
    game.hintTimer = 2.6;
    setAdminWorldEditor(false);
    normalizeCheckpointPlacements();
    markPlatformSpatialIndexDirty();
    return true;
  }

  function resetAdminWorldSelection() {
    const object = selectedAdminWorldObject;
    if (!object || !game.adminMode) return false;
    if (object.adminWorldCustom) return deleteAdminWorldSelection();
    Object.assign(object, object.adminWorldBase || {});
    removeAdminWorldObjectData(object.id);
    normalizeCheckpointPlacements();
    setAdminWorldEditor(true, object);
    game.hint = "관리자 편집 · 기본 맵 상태로 복원";
    game.hintTimer = 2.6;
    markPlatformSpatialIndexDirty();
    return true;
  }

  function toggleAdminCadetMode() {
    if (!adminModeUnlocked || game.mode !== "playing" || (!game.adminMode && !game.adminCadetMode)) return false;
    const enteringCadetMode = game.adminMode;
    const preservedPosition = {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      grounded: player.grounded,
      stage: game.stage,
      zone: game.zone,
      checkpointIndex: player.respawnCheckpointIndex,
      respawnX: player.respawnX,
      respawnY: player.respawnY,
    };
    if (enteringCadetMode) {
      game.adminPreviousDifficulty = game.difficulty;
      game.adminMode = false;
      game.adminCadetMode = true;
      game.difficulty = "cadet";
      game.adminCadetStartZone = getZoneIndexAt(player.x);
      game.adminCadetStartStage = getStageIndexAt(player.x);
      const cadet = difficultySettings.cadet;
      player.maxHp = cadet.hp;
      player.hp = cadet.hp;
      player.invincible = 0.9;
      game.hint = "현재 위치에서 신참내기 실전 시작 · R로 관리자 복귀";
    } else {
      game.adminCadetMode = false;
      game.adminMode = true;
      game.difficulty = difficultySettings[game.adminPreviousDifficulty]
        ? game.adminPreviousDifficulty
        : selectedDifficulty;
      const restored = difficultySettings[game.difficulty];
      player.maxHp = restored.hp;
      player.hp = restored.hp;
      player.invincible = 1;
      bullets.length = 0;
      game.hint = "관리자 권한 복구 · 적 수동화 · 모든 봉쇄 해제";
    }
    applyBossRewards({ refill: true });
    player.attackTimer = 0;
    player.attackCooldown = 0;
    player.adminEraseAttackId = -1;
    player.x = preservedPosition.x;
    player.y = preservedPosition.y;
    player.vx = preservedPosition.vx;
    player.vy = preservedPosition.vy;
    player.grounded = preservedPosition.grounded;
    player.respawnCheckpointIndex = preservedPosition.checkpointIndex;
    player.respawnX = preservedPosition.respawnX;
    player.respawnY = preservedPosition.respawnY;
    game.stage = preservedPosition.stage;
    game.zone = preservedPosition.zone;
    game.hintTimer = 3.2;
    setAdminSpawnPanel(false);
    sound.tone(enteringCadetMode ? 360 : 760, 0.14, "square", 0.035, enteringCadetMode ? 0.78 : 1.25);
    return true;
  }

  function teleportAdminToStage(stageNumber) {
    if (!game.adminMode || game.mode !== "playing") return false;
    const stageIndex = Number(stageNumber) - 1;
    if (!Number.isInteger(stageIndex) || stageIndex < 0 || stageIndex >= stages.length) return false;
    return teleportAdminToZone(stageIndex * ZONES_PER_STAGE);
  }

  function teleportAdminToZone(zoneIndex) {
    if (!game.adminMode || game.mode !== "playing") return false;
    const checkpointIndex = Number(zoneIndex);
    if (!Number.isInteger(checkpointIndex) || checkpointIndex < 0 || checkpointIndex >= zones.length) return false;
    const checkpoint = checkpoints[checkpointIndex];
    if (!checkpoint) return false;
    const stageIndex = zones[checkpointIndex].stageIndex;
    const position = setRespawnCheckpoint(checkpoint, checkpointIndex);
    player.x = position.x;
    player.y = position.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.invincible = Math.max(player.invincible, 1);
    player.attackTimer = 0;
    player.attackCooldown = 0;
    player.airJumpAvailable = true;
    bullets.length = 0;
    game.cutscene = null;
    game.story = null;
    game.storyQueue = [];
    for (const event of CUTSCENE_EVENTS) {
      if (event.x <= player.x) game.cutsceneSeen.add(event.id);
    }
    for (const event of STORY_EVENTS) {
      if (event.x <= player.x) game.storySeen.add(event.id);
    }
    game.stage = stageIndex;
    game.zone = checkpointIndex;
    announceStageAbility(stageIndex, true);
    game.stageTitle = 0;
    game.zoneTitle = 0;
    game.hint = `관리자 이동 · ${stageIndex + 1}-${String((checkpointIndex % ZONES_PER_STAGE) + 1).padStart(2, "0")} · ${zones[checkpointIndex].name}`;
    game.hintTimer = 3.4;
    camera.lookX = 0;
    camera.x = clamp(player.x - W * 0.36, 0, WORLD_W - W);
    camera.y = clamp(player.y - H * 0.56, 0, WORLD_H - H);
    setAdminSpawnPanel(false);
    setAdminZonePanel(false);
    sound.tone(470 + stageIndex * 70, 0.12, "square", 0.028, 1.25);
    return true;
  }

  function spawnAdminEnemy(type) {
    if (!game.adminMode || game.mode !== "playing" || !ADMIN_SPAWN_TYPES.has(type)) return null;
    const stageIndex = getStageIndexAt(player.x);
    const enemy = addEnemy(type, player.x, player.y + player.h, 220);
    enemy.adminSpawned = true;
    enemy.id = createAdminSpawnId(type, stageIndex);
    enemy.stageIndex = stageIndex;
    enemy.homeZoneIndex = getZoneIndexAt(player.x);
    enemy.x = clamp(player.x + player.w / 2 - enemy.w / 2, 0, WORLD_W - enemy.w);
    enemy.y = player.y + player.h - enemy.h;
    enemy.originX = enemy.x;
    enemy.spawnX = enemy.x;
    enemy.spawnY = enemy.y;
    enemy.baseY = enemy.y;
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.alive = true;
    enemy.countedKill = false;
    if (type === "boss") {
      enemy.bossKind = stages[stageIndex].bossKind;
      const definition = BOSS_DEFINITIONS[enemy.bossKind];
      enemy.hp = definition.hp;
      enemy.maxHp = definition.hp;
      if (enemy.bossKind === "echo") {
        enemy.w = player.w;
        enemy.h = player.h;
        enemy.x = player.x;
        enemy.y = player.y;
        enemy.originX = enemy.x;
        enemy.spawnX = enemy.x;
        enemy.spawnY = enemy.y;
        enemy.baseY = enemy.y;
      }
    }
    recordAdminSpawnedEnemy(enemy);
    game.totalEnemies += 1;
    game.hint = `관리자 생성·저장 · ${type.toUpperCase()} · 현재 위치 배치`;
    game.hintTimer = 2.8;
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, palette.amber, 22, 320, 0.58, 260);
    sound.tone(620, 0.12, "square", 0.03, 0.82);
    setAdminSpawnPanel(false);
    return enemy;
  }

  function placeAdminObject(type) {
    if (!game.adminMode || game.mode !== "playing" || !ADMIN_PLACE_TYPES.has(type)) return null;
    adminPlacedSerial += 1;
    const id = `admin-place:${Date.now().toString(36)}:${adminPlacedSerial.toString(36)}:${type}`;
    let object;
    if (type === "repair") {
      addPickup(
        clamp(player.x + player.w / 2 - 12, 0, WORLD_W - 24),
        clamp(player.y + player.h - 30, 0, WORLD_H - 24),
        "repair",
      );
      object = pickups[pickups.length - 1];
    } else {
      addBoostNode(
        clamp(player.x + player.w / 2 - 19, 0, WORLD_W - 38),
        clamp(player.y + player.h - 38, 0, WORLD_H - 38),
        0,
        -560,
      );
      object = boostNodes[boostNodes.length - 1];
    }
    object.id = id;
    object.adminPlaced = true;
    object.adminType = type;
    recordAdminPlacedObject(object);
    game.hint = type === "repair"
      ? "관리자 설치·저장 · 체력 회복 수복편"
      : "관리자 설치·저장 · 황색 도약 발판";
    game.hintTimer = 2.8;
    spawnParticles(object.x + object.w / 2, object.y + object.h / 2, palette.amber, 20, 300, 0.55, 280);
    sound.tone(type === "repair" ? 720 : 480, 0.14, "sine", 0.035, 1.45);
    setAdminSpawnPanel(false);
    return object;
  }

  function spawnAdminSelection(type) {
    if (ADMIN_PLACE_TYPES.has(type)) return placeAdminObject(type);
    return spawnAdminEnemy(type);
  }

  function getStoryStageIndex(item) {
    return Number.isInteger(item?.stageIndex) ? item.stageIndex : null;
  }

  function isStoryContextValid(item) {
    if (!item || game.tutorialActive || !game.tutorialCompleted || game.adminMode) return false;
    const currentStageIndex = getStageIndexAt(player.x);
    const contextStageIndex = getStoryStageIndex(item);
    if (contextStageIndex !== null && contextStageIndex !== currentStageIndex) return false;
    const minX = Number.isFinite(item.minX) ? item.minX : -Infinity;
    const maxX = Number.isFinite(item.maxX) ? item.maxX : Infinity;
    return player.x >= minX && player.x < maxX;
  }

  function queueStory(lines, context = {}) {
    for (const line of lines) game.storyQueue.push({ duration: 4.8, tone: "archive", ...context, ...line });
  }

  function updateStory(dt) {
    if (game.story && !isStoryContextValid(game.story)) {
      game.story = null;
      game.storyTimer = 0;
    }
    if (game.story) {
      game.storyTimer -= dt;
      if (game.storyTimer <= 0) game.story = null;
    }

    const currentStageIndex = getStageIndexAt(player.x);
    while (!game.story && game.storyQueue.length > 0) {
      const next = game.storyQueue[0];
      const contextStageIndex = getStoryStageIndex(next);
      const staleStage = contextStageIndex !== null && contextStageIndex < currentStageIndex;
      const stalePosition = Number.isFinite(next.maxX) && player.x >= next.maxX;
      if (!staleStage && !stalePosition) break;
      game.storyQueue.shift();
    }

    if (!game.story && game.storyQueue.length > 0 && isStoryContextValid(game.storyQueue[0])) {
      game.story = game.storyQueue.shift();
      game.storyTimer = game.story.duration;
      const signalTone = game.story.tone === "hostile" ? 105 : game.story.tone === "operative" ? 320 : 470;
      sound.tone(signalTone, 0.07, "square", 0.014, 1.35);
    }
  }

  function startCutscene(event) {
    if (!event || game.cutsceneSeen.has(event.id)) return;
    game.cutsceneSeen.add(event.id);
    game.cutscene = event;
    game.cutsceneShotIndex = 0;
    game.cutsceneTimer = event.shots[0]?.duration || 5;
    game.cutsceneShotElapsed = 0;
    game.story = null;
    game.storyTimer = 0;
    game.shake = 0;
    game.flash = 0;
    game.freeze = 0;
    player.vx = 0;
    player.attackTimer = 0;
    bullets.length = 0;
    saveCampaign();
    sound.tone(118, 0.28, "sine", 0.035, 0.72);
  }

  function advanceCutscene() {
    if (!game.cutscene) return;
    const finishedScene = game.cutscene;
    game.cutsceneShotIndex += 1;
    const nextShot = game.cutscene.shots[game.cutsceneShotIndex];
    if (!nextShot) {
      game.cutscene = null;
      game.cutsceneShotIndex = 0;
      game.cutsceneTimer = 0;
      game.cutsceneShotElapsed = 0;
      if (finishedScene.gateTransition) {
        game.stageTitle = 4.4;
        game.zoneTitle = 2.8;
        game.hint = `${stages[game.stage]?.name || "다음 작전"} 진입`;
        game.hintTimer = 3.2;
      } else {
        game.hint = "기록 장면 종료 · 작전 재개";
        game.hintTimer = 2.4;
      }
      sound.tone(360, 0.14, "sine", 0.022, 1.35);
      return;
    }
    game.cutsceneTimer = nextShot.duration || 5;
    game.cutsceneShotElapsed = 0;
    const tone = nextShot.tone === "hostile" ? 104 : nextShot.tone === "operative" ? 330 : 470;
    sound.tone(tone, 0.09, "square", 0.016, 1.2);
  }

  function requestCutsceneAdvance() {
    if (!game.cutscene) return;
    const shot = game.cutscene.shots[game.cutsceneShotIndex];
    const revealTime = Math.min(1.8, 0.32 + (shot?.text.length || 0) * 0.018);
    if (game.cutsceneShotElapsed < revealTime) {
      game.cutsceneShotElapsed = revealTime;
      return;
    }
    advanceCutscene();
  }

  function updateCutscene(dt) {
    if (!game.cutscene) return;
    const scene = game.cutscene;
    game.cutsceneTimer -= dt;
    game.cutsceneShotElapsed += dt;
    player.vx = 0;
    player.attackTimer = 0;
    if (scene.visual === "duel" || scene.visual === "mirror") player.facing = 1;
    const focusOffset = scene.gateTransition ? 170 : scene.visual === "duel" ? 110 : 45;
    const targetX = clamp(player.x + player.w / 2 - W * 0.42 + focusOffset, 0, WORLD_W - W);
    const targetY = clamp(player.y + player.h / 2 - H * 0.58, 0, WORLD_H - H);
    camera.x = lerp(camera.x, targetX, 1 - Math.pow(0.001, dt));
    camera.y = lerp(camera.y, targetY, 1 - Math.pow(0.004, dt));
    if (pressed.has("Space") || pressed.has("Enter")) requestCutsceneAdvance();
    else if (game.cutsceneTimer <= 0) advanceCutscene();
    pressed.clear();
  }

  function spawnParticles(x, y, color, count = 8, speed = 250, life = 0.45, gravity = 650) {
    for (let i = 0; i < count; i += 1) {
      const angle = hash(game.time * 19 + i * 7.2 + x) * TAU;
      const force = speed * (0.35 + hash(i * 5.1 + y) * 0.8);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        life,
        maxLife: life,
        color,
        size: 2 + hash(i * 3.3 + x) * 5,
        gravity,
        streak: hash(i + x) > 0.5,
      });
    }
    if (particles.length > 420) particles.splice(0, particles.length - 420);
  }

  function getPointerAim() {
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;
    const targetX = pointer.active ? pointer.screenX + camera.x : centerX + player.facing * 240;
    const targetY = pointer.active ? pointer.screenY + camera.y : centerY;
    const length = Math.max(1, Math.hypot(targetX - centerX, targetY - centerY));
    return { x: (targetX - centerX) / length, y: (targetY - centerY) / length };
  }

  function getMoveStickAim() {
    if (moveStick.active && moveStick.magnitude > 0.12) {
      return { x: moveStick.aimX, y: moveStick.aimY };
    }
    return { x: player.facing, y: 0 };
  }

  function startShotgun(aimOverride = null) {
    if (game.mode !== "playing" || player.shotgunCooldown > 0 || player.shells <= 0) return;
    markTutorialSignal("shotgun");
    const aim = aimOverride || getPointerAim();
    const overcharged = player.shotgunCharge >= 3;
    const pelletCount = overcharged ? OVERCHARGED_SHOTGUN_PELLETS : 6;
    const spread = overcharged ? 0.18 : 0.16;
    const centerX = player.x + player.w / 2 + aim.x * 24;
    const centerY = player.y + player.h * 0.45 + aim.y * 12;

    player.shotId += 1;
    player.shells -= 1;
    player.shotgunCooldown = overcharged ? 0.36 : 0.27;
    player.shotgunReload = overcharged ? 1.02 : 0.78;
    player.recoilTimer = 0.18;
    if (overcharged) player.shotgunCharge = 0;

    const reactiveOracle = enemies.find((enemy) => {
      if (!enemy.alive || enemy.type !== "boss" || enemy.bossKind !== "oracle" || (enemy.shotgunSwapCooldown || 0) > 0) return false;
      const oracleDX = enemy.x + enemy.w / 2 - (player.x + player.w / 2);
      const oracleDY = enemy.y + enemy.h / 2 - (player.y + player.h / 2);
      const oracleDistance = Math.max(1, Math.hypot(oracleDX, oracleDY));
      const aimDot = aim.x * oracleDX / oracleDistance + aim.y * oracleDY / oracleDistance;
      return oracleDistance < 1180 && aimDot > 0.84;
    });
    if (reactiveOracle) {
      reactiveOracle.pendingShotgunSwapTimer = 0.12;
      reactiveOracle.pendingShotId = player.shotId;
      reactiveOracle.shotgunSwapCooldown = 1.15;
      reactiveOracle.cooldown = Math.max(reactiveOracle.cooldown, 0.9);
      game.hint = "육화 · 역상 치환 예고 · 발사한 산탄이 되돌아옵니다";
      game.hintTimer = 1.7;
    }

    for (let pellet = 0; pellet < pelletCount; pellet += 1) {
      const ratio = pelletCount === 1 ? 0 : pellet / (pelletCount - 1) - 0.5;
      const angle = Math.atan2(aim.y, aim.x) + ratio * spread + (hash(player.shotId * 17 + pellet) - 0.5) * 0.035;
      const speed = (overcharged ? 1480 : 1320) * (0.94 + hash(pellet * 5 + player.shotId) * 0.1);
      bullets.push({
        x: centerX,
        y: centerY,
        w: overcharged ? 12 : 8,
        h: overcharged ? 6 : 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: overcharged ? OVERCHARGED_SHOTGUN_PELLET_LIFE : SHOTGUN_PELLET_LIFE,
        enemy: false,
        kind: "shotgun",
        gravity: 0,
        color: overcharged ? palette.amber : palette.cyan,
        damage: overcharged ? OVERCHARGED_SHOTGUN_DAMAGE : SHOTGUN_DAMAGE,
        shotId: player.shotId,
        piercing: overcharged,
      });
    }

    const horizontalRecoil = player.grounded ? 190 : 330;
    const verticalRecoil = player.grounded ? 130 : 440;
    player.vx -= aim.x * horizontalRecoil;
    player.vy -= aim.y * verticalRecoil;
    if (!player.grounded && aim.y > 0.25) player.vy = Math.min(player.vy, -410 - aim.y * 170);
    if (!player.grounded) player.landingImpactArmed = true;
    player.facing = aim.x >= 0 ? 1 : -1;
    player.squash = 0.18;
    game.shake = overcharged ? 22 : 13;
    game.freeze = overcharged ? 0.055 : 0.025;
    spawnParticles(centerX, centerY, overcharged ? palette.amber : palette.white, overcharged ? 28 : 15, overcharged ? 620 : 460, 0.32, 180);
    sound.shotgun(overcharged);
  }

  function startAttack(aimOverride = null) {
    if (game.mode !== "playing" || player.attackCooldown > 0 || player.attackTimer > 0) return;
    markTutorialSignal("slash");

    if (aimOverride) {
      const directionLength = Math.max(0.001, Math.hypot(aimOverride.x, aimOverride.y));
      player.attackDir.x = aimOverride.x / directionLength;
      player.attackDir.y = aimOverride.y / directionLength;
      if (Math.abs(player.attackDir.x) > 0.06) player.facing = player.attackDir.x > 0 ? 1 : -1;
    } else {
      const movingLeftInput = keys.has("KeyA") || keys.has("ArrowLeft") || (moveStick.active && moveStick.x < -0.12);
      const movingRightInput = keys.has("KeyD") || keys.has("ArrowRight") || (moveStick.active && moveStick.x > 0.12);
      const movingLeft = game.controlsReversed ? movingRightInput : movingLeftInput;
      const movingRight = game.controlsReversed ? movingLeftInput : movingRightInput;
      if (movingLeft && !movingRight) player.facing = -1;
      if (movingRight && !movingLeft) player.facing = 1;

      let dirY = 0;
      if (keys.has("KeyW") || keys.has("ArrowUp") || (moveStick.active && moveStick.y < -0.28)) dirY = -0.82;
      if (keys.has("KeyS") || keys.has("ArrowDown") || (moveStick.active && moveStick.y > 0.28)) dirY = 0.82;
      const dirX = dirY === 0 ? player.facing : player.facing * 0.58;
      const directionLength = Math.max(1, Math.hypot(dirX, dirY));
      player.attackDir.x = dirX / directionLength;
      player.attackDir.y = dirY / directionLength;
    }
    player.slashAnchorX = player.x + player.w / 2;
    player.slashAnchorY = player.y + player.h / 2;
    player.slashDirX = player.attackDir.x;
    player.slashDirY = player.attackDir.y;
    player.chargedAttack = false;

    if (player.grounded) {
      player.slashChain = player.slashChainTimer > 0 ? (player.slashChain % 3) + 1 : 1;
      player.slashChainTimer = 0.68;
    } else {
      player.slashChain = 0;
    }

    const chainDuration = player.slashChain === 3 ? 0.25 : player.slashChain === 2 ? 0.2 : 0.18;
    player.attackDuration = player.grounded ? chainDuration : 0.23;

    player.attackId += 1;
    player.attackTimer = player.attackDuration;
    player.attackCooldown = player.attackDuration + (player.grounded ? 0.015 : 0.055);
    player.afterimageTimer = 0;
    game.shake = Math.max(game.shake, 4);
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 6, 220, 0.3, 100);
    sound.attack();
  }

  function startAdminEraseAttack() {
    if (!game.adminMode || game.mode !== "playing") return false;
    const previousAttackId = player.attackId;
    startAttack();
    if (player.attackId === previousAttackId) return false;
    player.adminEraseAttackId = player.attackId;
    game.hint = "관리자 삭제 발도 · 적중한 적 데이터 영구 제거";
    game.hintTimer = 1.8;
    return true;
  }

  function eraseEnemyData(enemy) {
    if (!enemy?.alive || !game.adminMode) return false;
    if (enemy.adminSpawned) {
      removeAdminSpawnedEnemyData(enemy.id);
    } else {
      adminRemovedEnemyIds.add(enemy.id);
      persistAdminRemovedEnemies();
    }
    killEnemy(enemy, { countKill: false });
    game.hint = enemy.adminSpawned
      ? `관리자 생성 개체 데이터 영구 삭제 · ${enemy.type.toUpperCase()}`
      : `적 데이터 영구 삭제 · ${enemy.id}`;
    game.hintTimer = 3.2;
    return true;
  }

  function eraseAdminPlacedObject(object, collection) {
    if (!object?.id || !game.adminMode) return false;
    if (object.adminPlaced) removeAdminPlacedObjectData(object.id);
    else {
      adminRemovedObjectIds.add(object.id);
      persistAdminRemovedObjects();
    }
    const index = collection.indexOf(object);
    if (index >= 0) collection.splice(index, 1);
    const objectType = object.adminType || (collection === pickups ? "repair" : "boost");
    game.hint = `관리자 오브젝트 영구 삭제 · ${objectType === "repair" ? "회복 수복편" : "도약 발판"}`;
    game.hintTimer = 2.8;
    spawnParticles(object.x + object.w / 2, object.y + object.h / 2, palette.amber, 14, 240, 0.42, 180);
    return true;
  }

  function buildAttackBox(direction, charged, slashChain) {
    const vertical = Math.abs(direction.y) > 0.25;
    const reach = charged ? 82 : slashChain === 3 ? 76 : 68;
    const centerX = player.x + player.w / 2 + direction.x * reach;
    const centerY = player.y + player.h / 2 + direction.y * reach;
    return {
      x: centerX - (vertical ? (charged ? 70 : 55) : (charged ? 108 : slashChain === 3 ? 92 : 84)),
      y: centerY - (vertical ? (charged ? 105 : 82) : (charged ? 72 : 52)),
      w: vertical ? (charged ? 140 : 110) : charged ? 216 : slashChain === 3 ? 184 : 168,
      h: vertical ? (charged ? 210 : 164) : charged ? 144 : 104,
    };
  }

  function attackBox() {
    return buildAttackBox(player.attackDir, player.chargedAttack, player.slashChain);
  }

  function bulletIntersectsSlashBlade(bullet) {
    if (!bullet?.enemy || ["mutant-debris", "warden-beam", "rain-controller", "rain-core-burst"].includes(bullet.kind)) return false;
    const aimLength = Math.max(0.001, Math.hypot(player.slashDirX, player.slashDirY));
    const dirX = player.slashDirX / aimLength;
    const dirY = player.slashDirY / aimLength;
    const bulletCenterX = bullet.x + bullet.w / 2;
    const bulletCenterY = bullet.y + bullet.h / 2;
    const relativeX = bulletCenterX - player.slashAnchorX;
    const relativeY = bulletCenterY - player.slashAnchorY;
    const alongBlade = relativeX * dirX + relativeY * dirY;
    const acrossBlade = Math.abs(relativeX * -dirY + relativeY * dirX);
    const bulletRadius = Math.max(2, Math.min(22, Math.hypot(bullet.w, bullet.h) * 0.5));
    const reachEnd = player.chargedAttack ? 156 : 146;
    const halfWidth = player.chargedAttack ? 40 : 34;
    return alongBlade >= 20 - bulletRadius && alongBlade <= reachEnd + bulletRadius && acrossBlade <= halfWidth + bulletRadius;
  }

  function isAttackActive() {
    if (player.attackTimer <= 0) return false;
    const elapsed = player.attackDuration - player.attackTimer;
    return elapsed > player.attackDuration * 0.14 && elapsed < player.attackDuration * 0.8;
  }

  function registerBossRetreatHit(enemy) {
    if (enemy.type !== "boss") return;
    enemy.staggerHitCount = (enemy.staggerHitTimer || 0) > 0 ? (enemy.staggerHitCount || 0) + 1 : 1;
    enemy.staggerHitTimer = 0.9;
    if (enemy.staggerHitCount < 2) return;
    enemy.staggerHitCount = 0;
    enemy.retreatTimer = 0.48;
    enemy.retreatDirection = Math.sign((enemy.x + enemy.w / 2) - (player.x + player.w / 2)) || -enemy.facing || -1;
    enemy.cooldown = Math.max(enemy.cooldown, 1.05);
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.55, "#d9edf0", 14, 300, 0.4, 120);
  }

  function igniteEnemyWithFlameSword(enemy) {
    if (!enemy.alive) return;
    enemy.burnTimer = Math.max(enemy.burnTimer || 0, FLAME_SWORD_BURN_SECONDS);
    enemy.burnTickTimer = Math.min(
      Number.isFinite(enemy.burnTickTimer) && enemy.burnTickTimer > 0 ? enemy.burnTickTimer : FLAME_SWORD_BURN_INTERVAL,
      0.26,
    );
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.55, "#ff8a42", 8, 185, 0.42, -120);
  }

  function updateEnemyBurn(enemy, dt) {
    if ((enemy.burnTimer || 0) <= 0) return;
    enemy.burnTimer = Math.max(0, enemy.burnTimer - dt);
    enemy.burnTickTimer = (enemy.burnTickTimer || FLAME_SWORD_BURN_INTERVAL) - dt;
    if (enemy.burnTickTimer > 0) return;
    enemy.burnTickTimer += FLAME_SWORD_BURN_INTERVAL;
    const burnDamage = enemy.type === "boss" ? FLAME_SWORD_BURN_DAMAGE * 0.7 : FLAME_SWORD_BURN_DAMAGE;
    enemy.hp -= burnDamage;
    enemy.hurt = Math.max(enemy.hurt, 0.08);
    spawnParticles(
      enemy.x + enemy.w * (0.25 + hash(enemy.anim * 13.7) * 0.5),
      enemy.y + enemy.h * (0.3 + hash(enemy.anim * 21.3) * 0.45),
      hash(enemy.anim * 8.9) > 0.45 ? "#ffcb62" : "#ff613d",
      4,
      125,
      0.34,
      -170,
    );
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function damageEnemy(enemy, { source = "slash" } = {}) {
    if (!enemy.alive || enemy.hitAttackId === player.attackId) return;
    enemy.hitAttackId = player.attackId;

    if (game.adminMode && player.adminEraseAttackId === player.attackId) {
      eraseEnemyData(enemy);
      return;
    }

    if (enemy.type === "boss" && enemy.bossKind === "hunter" && player.burstTimer > 0 && (enemy.reflectBreakTimer || 0) <= 0) {
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#a6f7ff", 12, 250, 0.34, 0);
      game.hint = "적린 · 산탄과 버스트 반사 · 일본도만 유효";
      game.hintTimer = 1.35;
      return;
    }

    if (enemy.type === "boss" && enemy.bossKind === "censor" && enemy.barrierTimer > 0) {
      enemy.barrierTimer = Math.max(0, enemy.barrierTimer - (player.chargedAttack ? 0.5 : 0.16));
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#b56cff", 18, 320, 0.42, 0);
      game.hint = "무명 · 공허 장막이 참격을 무효화했습니다";
      game.hintTimer = 1.15;
      game.shake = Math.max(game.shake, 6);
      sound.tone(245, 0.12, "sine", 0.035, 1.55);
      return;
    }

    const playerCenter = player.x + player.w / 2;
    const enemyCenter = enemy.x + enemy.w / 2;
    const incomingSide = Math.sign(playerCenter - enemyCenter) || 1;
    const shielded = ensureShieldState(enemy)
      && incomingSide === enemy.facing
      && !player.chargedAttack
      && player.slashChain !== 3
      && enemy.shieldBreakTimer <= 0;

    if (shielded) {
      enemy.blockedAttackId = player.attackId;
      enemy.shieldGuard = Math.max(0, enemy.shieldGuard - 1);
      enemy.shieldGuardRegen = SHIELD_GUARD_REGEN_SECONDS;
      if (enemy.shieldGuard > 0) {
        player.vx = -player.facing * 150;
        player.vy = Math.min(player.vy, -105);
        game.shake = 4;
        game.freeze = 0.025;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + 24, palette.amber, 7, 180, 0.3, 260);
        sound.tone(170, 0.08, "square", 0.032, 0.72);
        return;
      }
      enemy.shieldBreakTimer = SHIELD_BREAK_SECONDS;
      enemy.hurt = 0.34;
      enemy.windup = 0;
      enemy.cooldown = Math.max(enemy.cooldown, 1.1);
      game.hint = "방패 파괴 · 3초 동안 정면 공격 가능";
      game.hintTimer = 1.8;
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + 26, palette.red, 17, 340, 0.5, 420);
      sound.tone(105, 0.16, "sawtooth", 0.045, 1.5);
    }

    const chainFinisher = player.grounded && player.slashChain === 3 ? 1 : 0;
    let dealtDamage = 1
      + (player.buffTimer > 0 ? EMPOWERED_SLASH_BONUS : 0)
      + (player.chargedAttack ? CHARGED_SLASH_BONUS : 0)
      + chainFinisher
      + (player.rewardPower || 0) * 0.2;
    const formation = getEnemyFormation(enemy);
    if (formation?.id === "bulwark" && enemy.type !== "shield") {
      dealtDamage *= 0.75;
      const room = getCombatRoomForEnemy(enemy);
      if (room && (!room.guardHintAt || game.time - room.guardHintAt > 2.6)) {
        room.guardHintAt = game.time;
        game.hint = "철벽 호위 작동 · 방패병을 먼저 쓰러뜨려라";
        game.hintTimer = 1.8;
      }
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, formation.accent, 8, 210, 0.3, 160);
    }
    enemy.hp -= dealtDamage;
    if (source === "slash" && game.stage >= ACT_FOUR_INDEX && enemy.hp > 0) igniteEnemyWithFlameSword(enemy);
    enemy.hurt = 0.18;
    registerBossRetreatHit(enemy);
    if (!isStationaryTurret(enemy)) enemy.vx += player.attackDir.x * (enemy.type === "boss" ? 80 : 250);
    game.shake = enemy.type === "boss" ? 8 : chainFinisher ? 16 : 11;
    game.freeze = enemy.type === "boss" ? 0.045 : chainFinisher ? 0.115 : 0.075;
    game.flash = 0.07;
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.type === "boss" ? palette.red : palette.white, 15, 380, 0.5, 720);
    sound.hit();

    player.combo += 1;
    player.comboTimer = 2.4;
    player.shotgunCharge = Math.min(3, player.shotgunCharge + (chainFinisher ? 0.9 : 0.58));
    player.styleScore = Math.min(100, player.styleScore + (player.grounded ? 12 : 20) + (chainFinisher ? 12 : 0));
    player.burstCooldown = Math.max(0, player.burstCooldown - 0.18);
    if (!player.grounded) {
      player.vy = clamp(player.vy, -110, 120);
      const restored = !player.airJumpAvailable;
      player.airJumpAvailable = true;
      if (restored) {
        game.hint = "공중 적중 · 이중 점프 회복";
        game.hintTimer = 1.2;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 12, 260, 0.42, 260);
      }
    }

    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function damageEnemyWithShotgun(enemy, bullet) {
    if (!enemy.alive) return false;
    if (enemy.hitShotId === bullet.shotId) return true;
    if (enemy.type === "boss" && enemy.bossKind === "oracle" && enemy.pendingShotId === bullet.shotId) {
      // 치환 예고 중인 산탄은 육화에게 피해를 주지 않고 잠시 후 플레이어에게 역류한다.
      enemy.hitShotId = bullet.shotId;
      return true;
    }
    const shielded = ensureShieldState(enemy)
      && Math.sign(bullet.vx || 1) === -enemy.facing
      && !bullet.piercing
      && enemy.shieldBreakTimer <= 0;
    if (shielded) {
      enemy.hitShotId = bullet.shotId;
      enemy.shieldGuard = Math.max(0, enemy.shieldGuard - 1);
      enemy.shieldGuardRegen = SHIELD_GUARD_REGEN_SECONDS;
      spawnParticles(bullet.x, bullet.y, palette.amber, 8, 260, 0.3, 300);
      sound.tone(150, 0.08, "square", 0.035, 0.65);
      if (enemy.shieldGuard > 0) return false;
      enemy.shieldBreakTimer = SHIELD_BREAK_SECONDS;
      enemy.hurt = 0.34;
      enemy.windup = 0;
      enemy.cooldown = Math.max(enemy.cooldown, 1.1);
      game.hint = "방패 파괴 · 3초 동안 정면 사격 가능";
      game.hintTimer = 1.8;
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + 26, palette.red, 18, 360, 0.5, 440);
    }
    enemy.hitShotId = bullet.shotId;
    if (enemy.type === "boss" && enemy.bossKind === "hunter" && (enemy.reflectBreakTimer || 0) <= 0) {
      reflectShotgun(enemy);
      return true;
    }
    if (enemy.type === "boss" && enemy.bossKind === "censor" && enemy.barrierTimer > 0) {
      enemy.barrierTimer = Math.max(0, enemy.barrierTimer - (bullet.piercing ? 0.45 : 0.12));
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#b56cff", 16, 300, 0.38, 0);
      game.hint = "무명 · 공허 장막이 총격을 흡수했습니다";
      game.hintTimer = 1.05;
      sound.tone(220, 0.1, "sine", 0.03, 1.6);
      return true;
    }
    let shotgunDamage = bullet.damage + (player.rewardPower || 0) * 0.18;
    const formation = getEnemyFormation(enemy);
    if (formation?.id === "bulwark" && enemy.type !== "shield") shotgunDamage *= 0.75;
    enemy.hp -= shotgunDamage;
    enemy.hurt = 0.22;
    registerBossRetreatHit(enemy);
    if (!isStationaryTurret(enemy)) enemy.vx += Math.sign(bullet.vx) * (enemy.type === "boss" ? 90 : bullet.piercing ? 520 : 310);
    game.shake = Math.max(game.shake, bullet.piercing ? 24 : 14);
    game.freeze = Math.max(game.freeze, bullet.piercing ? 0.12 : 0.065);
    game.flash = Math.max(game.flash, 0.08);
    player.combo += 1;
    player.comboTimer = 2.4;
    player.styleScore = Math.min(100, player.styleScore + (bullet.piercing ? 24 : 14));
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, bullet.piercing ? palette.amber : palette.white, bullet.piercing ? 26 : 15, 480, 0.55, 760);
    sound.hit();
    if (enemy.hp <= 0) killEnemy(enemy);
    return true;
  }

  function killEnemy(enemy, { silent = false, countKill = true } = {}) {
    enemy.alive = false;
    const squadRoom = getCombatRoomForEnemy(enemy);
    if (squadRoom && enemy.type === squadRoom.formationAnchorType) {
      squadRoom.anchorAlive = enemies.some((candidate) => (
        candidate !== enemy
        && candidate.alive
        && candidate.type === squadRoom.formationAnchorType
        && candidate.originX > squadRoom.left
        && candidate.originX < squadRoom.right
      ));
      if (!squadRoom.anchorAlive && squadRoom.triggered && !squadRoom.cleared && !silent) {
        game.hint = `${squadRoom.formationName} 붕괴 · 지원 기체가 약화됐다`;
        game.hintTimer = 2.6;
      }
    }
    const deathCenterX = enemy.x + enemy.w / 2;
    const deathCenterY = enemy.y + enemy.h / 2;
    const deathIsNearPlayer = !silent
      && Math.abs(deathCenterX - (player.x + player.w / 2)) < W
      && Math.abs(deathCenterY - (player.y + player.h / 2)) < H;
    if (countKill && !enemy.countedKill) {
      enemy.countedKill = true;
      game.kills += 1;
    }
    player.styleScore = Math.min(100, player.styleScore + (enemy.type === "boss" ? 30 : 9));
    player.burstCooldown = Math.max(0, player.burstCooldown - (enemy.type === "boss" ? 1.2 : 0.32));
    if (enemy.type !== "boss" && !player.grounded && !silent) {
      player.airJumpAvailable = true;
    }
    if (deathIsNearPlayer) {
      game.freeze = enemy.type === "boss" ? 0.18 : 0.09;
      game.shake = enemy.type === "boss" ? 22 : 13;
      spawnParticles(deathCenterX, deathCenterY, palette.red, enemy.type === "boss" ? 50 : 22, 520, 0.8, 920);
      spawnParticles(deathCenterX, deathCenterY, palette.cyan, enemy.type === "boss" ? 40 : 12, 380, 0.65, 620);
    }

    const clearedZoneIndex = getZoneIndexAt(enemy.originX);
    if (getZoneRemaining(clearedZoneIndex) === 0 && enemy.type !== "boss") {
      game.hint = `${zones[clearedZoneIndex].name} 확보 · 다음 구역 개방`;
      game.hintTimer = 3.2;
      player.hp = Math.min(player.maxHp, player.hp + 1);
      if (deathIsNearPlayer) spawnParticles(deathCenterX, deathCenterY, palette.cyan, 24, 360, 0.7, 420);
      saveCampaign();
      if (deathIsNearPlayer) sound.checkpoint();
    }

    if (enemy.type === "boss") {
      resetBossRealityEffects();
      const rank = enemy.stageIndex;
      const kind = enemy.bossKind || stages[rank].bossKind;
      for (const summon of enemies) {
        if (summon.alive && summon.summonedByBossId === enemy.id) killEnemy(summon, { silent: true, countKill: false });
      }
      if (enemy.isMidBoss) {
        game.hint = `${BOSS_DEFINITIONS[kind].name} 격파 · 후반 작전 구역 개방`;
        game.hintTimer = 6;
        queueStory(MIDBOSS_VICTORY_STORIES[rank], { stageIndex: rank, minX: stages[rank].x, maxX: stages[rank].end });
        saveCampaign();
        if (deathIsNearPlayer) sound.tone(118, 0.62, "sawtooth", 0.065, 0.42);
        return;
      }
      game.defeatedBosses.add(kind);
      game.stageClearTimes[rank] = game.runTime;
      game.stageBossDefeated = game.defeatedBosses.has("warden");
      game.bossDefeated = game.defeatedBosses.has("echo");
      const nextStage = stages[rank + 1];
      game.hint = nextStage
        ? `${BOSS_DEFINITIONS[kind].name} 격파 · ${nextStage.name} 진입`
        : "거울 규약 해제 · 모든 증언을 도시로 송신";
      game.hintTimer = 8;
      const victoryStories = [
        [
          { speaker: "폐기장 감독관 · 철각", text: "봉쇄 실패. M-07의 원본 기록을 검은 공장으로 이송한다.", tone: "hostile", duration: 5.2 },
          { speaker: "감찰관 · 도담", text: "첫 관문이 열렸어. 하지만 저 안에서 네 실험 번호가 계속 송신되고 있어.", tone: "control", duration: 5.4 },
        ],
        [
          { speaker: "용광 심장 · 홍련", text: "냉각망 개방. 억제되었던 기억이 상층 보관소로 역류한다.", tone: "hostile", duration: 5.3 },
          { speaker: "M-07 · 서린", text: "흩어진 목소리를 따라 기억 성당으로 간다. 이번에는 누구의 과거도 태우지 않는다.", tone: "operative", duration: 5.3 },
        ],
        [
          { speaker: "기억 직조기 · 백면", text: "다수의 진실은 하나의 평화를 찢는다. 너는 그 혼란을 감당하지 못한다.", tone: "hostile", duration: 5.5 },
          { speaker: "잔향 · 새봄", text: "언니, 송신탑에서 기다릴게. 이번에는 우리가 문을 열어 줄 차례야.", tone: "archive", duration: 5.2 },
        ],
        [
          { speaker: "중앙국 검열기 · 무명", text: "기록은 지워져도 명령은 남는다. 왜 사라진 목소리를 위해 모든 것을 버리는가.", tone: "hostile", duration: 5.5 },
          { speaker: "M-07 · 서린", text: "아무것도 버리지 않는다. 빼앗긴 이름과 기억을 원래 사람들에게 돌려줄 뿐이다.", tone: "operative", duration: 5.4 },
          { speaker: "감찰관 · 도담", text: "잠깐, 지상 수신이 없어. 증언이 송신탑 아래의 원형 보관소로 되돌아가고 있어.", tone: "control", duration: 5.8 },
          { speaker: "잔향 · 새봄", text: "언니, 아래에서 언니와 똑같은 목소리가 우리를 붙잡고 있어. 아직 끝난 게 아니야.", tone: "archive", duration: 5.8 },
        ],
        [
          { speaker: "원본 대행체 · 잔영-00", text: "승패 기록 완료. 단일 원본 규약을 폐기한다. 한서린 인격군의 병렬 생존을 승인한다.", tone: "hostile", duration: 5.8 },
          { speaker: "M-07 · 서린", text: "승인받아서 사는 게 아니야. 너도 함께 나가서 네가 고른 이름으로 증언해.", tone: "operative", duration: 5.6 },
          { speaker: "감찰관 · 도담", text: "지상 수신망 개방. 2,418명의 이름과 열아홉 서린의 선택 기록이 도시 전역에 도착했어.", tone: "control", duration: 6.0 },
          { speaker: "잔향 · 새봄", text: "언니가 하나가 아니어도 괜찮아. 서로 다른 목소리로 같은 약속을 기억하면 돼.", tone: "archive", duration: 5.8 },
          { speaker: "한서린과 잔영-00", text: "작전 4호 종료. 폐기된 모든 이름을 생존자 명단으로 정정한다.", tone: "operative", duration: 6.0 },
        ],
      ];
      queueStory(victoryStories[rank], { stageIndex: rank, minX: stages[rank].x, maxX: stages[rank].end });
      saveCampaign();
      if (deathIsNearPlayer) sound.tone(80, 0.8, "sawtooth", 0.07, 0.3);
    } else if (countKill && !silent && player.hp < player.maxHp) {
      const repairDropRoll = hash(enemy.originX * 0.017 + enemy.spawnY * 0.031 + game.kills * 9.73);
      if (repairDropRoll < NORMAL_ENEMY_REPAIR_DROP_CHANCE) {
        addPickup(enemy.x + enemy.w / 2, enemy.y, "repair");
      }
    }
  }

  function damagePlayer(amount = 1, sourceX = player.x) {
    if (game.adminMode || player.invincible > 0 || game.mode !== "playing") return;
    const difficulty = difficultySettings[game.difficulty];
    const appliedDamage = difficulty.damage >= 99 ? player.hp : amount * difficulty.damage;
    player.hp = Math.max(difficulty.damage === 0 ? 1 : 0, player.hp - appliedDamage);
    player.invincible = 1.15;
    player.vx = player.x < sourceX ? -430 : 430;
    player.vy = -460;
    player.attackTimer = 0;
    game.shake = 18;
    game.flash = 0.16;
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.red, 16, 420, 0.6, 800);
    sound.hurt();

    if (player.hp <= 0) {
      setTimeout(() => {
        if (game.mode === "playing" && player.hp <= 0) respawn();
      }, 260);
    }
  }

  function respawn() {
    game.deaths += 1;
    resetBossRealityEffects();
    const checkpointIndex = Number.isInteger(player.respawnCheckpointIndex) && player.respawnCheckpointIndex >= 0
      ? clamp(player.respawnCheckpointIndex, 0, checkpoints.length - 1)
      : checkpoints.reduce((closestIndex, checkpoint, index) => (
        Math.abs(checkpoint.x - player.respawnX) < Math.abs(checkpoints[closestIndex].x - player.respawnX)
          ? index
          : closestIndex
      ), 0);
    const checkpoint = checkpoints[checkpointIndex];
    const checkpointPosition = setRespawnCheckpoint(checkpoint, checkpointIndex);
    const restartZoneIndex = getZoneIndexAt(checkpoint.x);
    let restartedEnemyCount = 0;

    // 무명이 전투 중 만든 사역마는 스테이지 원본 배치가 아니다.
    // 체크포인트 재시작 시 배열에서 완전히 제거해 중복 부활과 처치 수 오염을 막는다.
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      if (enemies[enemyIndex].summonedByBossId) enemies.splice(enemyIndex, 1);
    }

    for (const enemy of enemies) {
      const enemyZoneIndex = getZoneIndexAt(enemy.originX);
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.windup = 0;
      enemy.rushTimer = 0;
      enemy.rushDirection = 0;
      enemy.burstRemaining = 0;
      enemy.burstInterval = 0;
      enemy.staggerHitCount = 0;
      enemy.staggerHitTimer = 0;
      enemy.retreatTimer = 0;
      enemy.retreatDirection = 0;
      enemy.bossAction = null;
      enemy.bossShotPattern = null;
      enemy.bossChargeDuration = 0;
      enemy.bossChargeDirection = 0;
      enemy.targetX = null;
      enemy.targetY = null;
      if (!enemy.adminSpawned && adminRemovedEnemyIds.has(enemy.id)) {
        enemy.alive = false;
        enemy.hp = 0;
        enemy.countedKill = false;
        continue;
      }
      if (enemyZoneIndex < restartZoneIndex) {
        enemy.alive = false;
        enemy.hp = 0;
        continue;
      }
      restartedEnemyCount += 1;
      enemy.alive = true;
      enemy.countedKill = false;
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
      enemy.baseY = enemy.spawnY;
      enemy.grounded = false;
      enemy.cooldown = 0.65 + hash(enemy.originX) * 0.9;
      enemy.hurt = 0;
      enemy.bossPhase = 0;
      enemy.bossJumpCooldown = 0;
      enemy.halfPhaseTriggered = false;
      enemy.quarterPhaseTriggered = false;
      enemy.burnTimer = 0;
      enemy.burnTickTimer = 0;
      enemy.controlInversionActive = false;
      enemy.iceStormTimer = 0;
      enemy.iceSpawnTimer = 0;
      enemy.iceStormSerial = 0;
      enemy.censorSnowBlanket = false;
      enemy.shieldOverdrive = false;
      enemy.shieldMuzzleFlash = 0;
      enemy.mutated = false;
      enemy.comboHitsRemaining = 0;
      enemy.comboHitTimer = 0;
      enemy.adaptivePhase = false;
      enemy.echoAnalysis = null;
      enemy.echoDecisionSerial = 0;
      enemy.echoMimicJumpCooldown = 0;
      enemy.passivePanelCooldown = 4.8;
      enemy.summonCooldown = 6.5;
      enemy.summonCount = 0;
      enemy.barrierTimer = 0;
      enemy.barrierCooldown = 3.2;
      enemy.reflectTimer = 0;
      enemy.reflectCooldown = 2.8;
      enemy.reflectBreakTimer = 0;
      enemy.dashDirection = 0;
      enemy.dashRange = 0;
      enemy.funnelCooldown = 0;
      enemy.stuckTimer = 0;
      enemy.hitAttackId = -1;
      enemy.hitShotId = -1;
      enemy.blockedAttackId = -1;
      enemy.shieldGuard = enemy.shieldGuardMax || 0;
      enemy.shieldBreakTimer = 0;
      enemy.shieldGuardRegen = 0;
    }

    for (const room of combatRooms) {
      const roomZoneIndex = getZoneIndexAt(room.left);
      const clearedBeforeCheckpoint = roomZoneIndex < restartZoneIndex;
      room.triggered = clearedBeforeCheckpoint;
      room.cleared = clearedBeforeCheckpoint;
      room.terrainTimer = 0;
      room.terrainStep = 0;
      for (const platform of room.terrainPlatforms || []) platform.y = platform.originalY;
      room.remaining = clearedBeforeCheckpoint
        ? 0
        : enemies.filter((enemy) => enemy.alive && enemy.originX > room.left && enemy.originX < room.right).length;
    }

    for (const stage of stages) {
      const bossZoneIndex = getZoneIndexAt(stage.bossX);
      if (bossZoneIndex < restartZoneIndex) {
        game.defeatedBosses.add(stage.bossKind);
      } else {
        game.defeatedBosses.delete(stage.bossKind);
        game.stageClearTimes[stages.indexOf(stage)] = 0;
      }
    }

    for (const pickup of pickups) {
      pickup.active = getZoneIndexAt(pickup.x) >= restartZoneIndex;
    }

    game.kills = enemies.reduce((count, enemy) => count + (enemy.countedKill ? 1 : 0), 0);

    game.stageBossDefeated = game.defeatedBosses.has("warden");
    game.bossDefeated = game.defeatedBosses.has("echo");
    syncAdminRemovedBossState();
    game.stage = getStageIndexAt(checkpoint.x);
    game.zone = restartZoneIndex;
    player.x = checkpointPosition.x;
    player.y = checkpointPosition.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.landingImpactArmed = false;
    player.hp = player.maxHp;
    player.invincible = 1.2;
    player.airJumpAvailable = true;
    player.attackTimer = 0;
    player.shotgunCooldown = 0;
    player.shotgunReload = 0;
    player.shells = player.maxShells;
    player.combo = 0;
    bullets.length = 0;
    camera.x = clamp(player.x - 300, 0, WORLD_W - W);
    camera.y = clamp(player.y - 420, 0, WORLD_H - H);
    game.shake = 12;
    game.hint = `${checkpoint.label} 복귀 · 이전 구역 유지 / 이후 적 ${restartedEnemyCount}기 재시작`;
    game.hintTimer = 3.8;
    saveCampaign();
  }

  function fireBullet(enemy, speed = 360, spread = 0, kind = "standard", lockedTarget = null) {
    const sourceX = enemy.x + enemy.w / 2;
    const sourceY = enemy.y + enemy.h * 0.38;
    const targetX = lockedTarget?.x ?? player.x + player.w / 2;
    const targetY = lockedTarget?.y ?? player.y + player.h / 2;
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX) + spread;
    const bulletScale = difficultySettings[game.difficulty].bulletSpeed * (STAGE_BULLET_PRESSURE[enemy.stageIndex] || 1);
    const phaseShot = kind === "phase";
    const spellShot = kind === "spell";
    bullets.push({
      x: sourceX - (phaseShot ? 7 : spellShot ? 8 : 5),
      y: sourceY - (phaseShot ? 3 : spellShot ? 8 : 5),
      w: phaseShot ? 14 : spellShot ? 16 : 10,
      h: phaseShot ? 6 : spellShot ? 16 : 10,
      vx: Math.cos(angle) * speed * bulletScale,
      vy: Math.sin(angle) * speed * bulletScale,
      life: 4,
      enemy: true,
      kind,
      gravity: 0,
      color: phaseShot
        ? "#79dfff"
        : spellShot
          ? "#d7a0ff"
          : kind === "machinegun"
            ? "#ff8066"
            : enemy.type === "boss"
              ? palette.red
              : palette.amber,
    });
    sound.tone(enemy.type === "boss" ? 130 : kind === "machinegun" ? 165 : 210, kind === "machinegun" ? 0.045 : 0.08, "square", 0.018, 0.65);
  }

  function fireTurretRow(enemy) {
    const sourceX = enemy.x + enemy.w / 2 + enemy.facing * 32;
    const sourceY = enemy.y + enemy.h * 0.42;
    const targetX = enemy.targetX ?? player.x + player.w / 2;
    const targetY = enemy.targetY ?? player.y + player.h / 2;
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
    const speed = 455 * difficultySettings[game.difficulty].bulletSpeed * (STAGE_BULLET_PRESSURE[enemy.stageIndex] || 1);
    for (let lane = -2; lane <= 2; lane += 1) {
      const laneOffset = lane * 14;
      bullets.push({
        x: sourceX - 8,
        y: sourceY + laneOffset - 5,
        w: 16,
        h: 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 4.4,
        enemy: true,
        kind: "turret-row",
        gravity: 0,
        piercePlatforms: true,
        color: "#ffcf62",
        damage: 1,
      });
    }
    enemy.turretRecoil = 0.2;
    spawnParticles(sourceX, sourceY, "#ffcf62", 18, 330, 0.32, 60);
    sound.tone(92, 0.16, "square", 0.052, 0.48);
  }

  function fireFurnaceRedBurst(enemy, target, count = 5, spreadStep = 0.055, baseSpeed = 430) {
    const center = (count - 1) / 2;
    for (let index = 0; index < count; index += 1) {
      const offset = index - center;
      fireBullet(enemy, baseSpeed + index * 22, offset * spreadStep, "standard", target);
    }
    spawnParticles(
      enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.48,
      enemy.y + enemy.h * 0.38,
      "#ff304f",
      12 + count,
      330,
      0.35,
      80,
    );
  }

  function fireMortar(enemy, lockedTargetX = null, lockedTargetY = null, silent = false) {
    const sourceX = enemy.x + enemy.w / 2;
    const sourceY = enemy.y + 12;
    const targetX = lockedTargetX ?? player.x + player.w / 2 + player.vx * 0.32;
    const targetY = lockedTargetY ?? enemy.targetY ?? player.y + player.h;
    const bulletScale = difficultySettings[game.difficulty].bulletSpeed;
    const gravity = 860;
    const flightTime = clamp((0.82 + Math.abs(targetX - sourceX) / 1250) / Math.sqrt(bulletScale), 0.78, 1.58);
    const velocityX = (targetX - sourceX) / flightTime;
    const velocityY = (targetY - sourceY - 0.5 * gravity * flightTime * flightTime) / flightTime;
    bullets.push({
      x: sourceX - 9,
      y: sourceY - 9,
      w: 18,
      h: 18,
      vx: velocityX,
      vy: velocityY,
      life: flightTime + 0.25,
      enemy: true,
      kind: "mortar",
      gravity,
      lockedImpactX: targetX,
      lockedImpactY: targetY,
      impactTimer: flightTime,
      color: "#ff6f75",
    });
    if (!silent) sound.tone(92, 0.18, "sawtooth", 0.03, 0.55);
  }

  function fireMortarTurretVolley(enemy) {
    const centerTargetX = enemy.targetX ?? player.x + player.w / 2;
    const spread = 135;
    for (let shell = 0; shell < MORTAR_TURRET_VOLLEY_COUNT; shell += 1) {
      const targetOffset = (shell - (MORTAR_TURRET_VOLLEY_COUNT - 1) / 2) * spread;
      fireMortar(enemy, centerTargetX + targetOffset, enemy.targetY, true);
    }
    const muzzleX = enemy.x + enemy.w / 2;
    const muzzleY = enemy.y + 8;
    spawnParticles(muzzleX, muzzleY, "#ff9b68", 24, 380, 0.4, -140);
    sound.tone(74, 0.26, "sawtooth", 0.052, 0.46);
  }

  function fireHeavyOrb(enemy, target, speed = 610, size = 30) {
    const sourceX = enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.34;
    const sourceY = enemy.y + enemy.h * 0.4;
    const angle = Math.atan2(target.y - sourceY, target.x - sourceX);
    const bulletScale = difficultySettings[game.difficulty].bulletSpeed;
    bullets.push({
      x: sourceX - size / 2,
      y: sourceY - size / 2,
      w: size,
      h: size,
      vx: Math.cos(angle) * speed * bulletScale,
      vy: Math.sin(angle) * speed * bulletScale,
      life: 4.5,
      enemy: true,
      kind: "heavy",
      gravity: 0,
      damage: 2,
      color: "#ff304f",
    });
  }

  function launchRainCore(enemy) {
    const size = 52;
    bullets.push({
      x: enemy.x + enemy.w / 2 - size / 2,
      y: enemy.y + 10,
      w: size,
      h: size,
      vx: enemy.facing * 55,
      vy: -640,
      life: 1.32,
      enemy: true,
      harmless: true,
      kind: "rain-core",
      gravity: 330,
      damage: 0,
      color: "#ff5b67",
      ownerStage: enemy.stageIndex,
      ownerZone: enemy.homeZoneIndex,
      ceilingY: Math.max(45, enemy.baseY - 650),
    });
  }

  function explodeRainCore(bullet) {
    const centerX = bullet.x + bullet.w / 2;
    const centerY = bullet.y + bullet.h / 2;
    bullets.push({
      x: bullet.x,
      y: bullet.y,
      w: 0,
      h: 0,
      vx: 0,
      vy: 0,
      life: 2,
      maxLife: 2,
      enemy: true,
      harmless: true,
      kind: "rain-controller",
      gravity: 0,
      color: "#ff566c",
      ownerStage: bullet.ownerStage,
      ownerZone: bullet.ownerZone,
      ceilingY: bullet.ceilingY,
      spawnTimer: 0,
      spawnSerial: 0,
    });
    bullets.push({
      x: centerX,
      y: centerY,
      w: 0,
      h: 0,
      vx: 0,
      vy: 0,
      life: 0.72,
      maxLife: 0.72,
      enemy: true,
      harmless: true,
      kind: "rain-core-burst",
      gravity: 0,
      color: "#ff7b62",
    });
    for (let ring = 0; ring < 3; ring += 1) {
      spawnParticles(centerX, centerY, ring === 0 ? "#fff0c7" : ring === 1 ? "#ff7b62" : "#ff304f", 34 - ring * 6, 440 + ring * 180, 0.72 + ring * 0.12, 60);
    }
    game.flash = Math.max(game.flash, 0.32);
    game.freeze = Math.max(game.freeze, 0.07);
    game.shake = Math.max(game.shake, 24);
    sound.tone(48, 0.72, "sawtooth", 0.078, 0.28);
    sound.tone(420, 0.18, "square", 0.04, 0.42);
  }

  function spawnRainBomb(controller) {
    const stage = stages[controller.ownerStage] || stages[1];
    const zone = zones[controller.ownerZone] || zones[controller.ownerStage * ZONES_PER_STAGE + BOSS_ZONE_INDEX];
    const arenaLeft = zone.x + 170;
    const arenaRight = Math.min(zone.end - 110, stage.gateX - 110);
    const serial = controller.spawnSerial++;
    const randomX = hash(serial * 17.31 + game.time * 7.17);
    const randomSize = hash(serial * 31.73 + 4.9);
    const size = 15 + Math.floor(randomSize * 12);
    const x = arenaLeft + (arenaRight - arenaLeft) * randomX;
    bullets.push({
      x: x - size / 2,
      y: (controller.ceilingY || 45) - hash(serial * 4.73) * 65,
      w: size,
      h: size,
      vx: (hash(serial * 11.8 + 2.6) - 0.5) * 105,
      vy: 90 + hash(serial * 5.91 + 8.2) * 105,
      life: 4.5,
      enemy: true,
      kind: "rain-drop",
      gravity: 820,
      color: "#ff566c",
    });
  }

  function resetBossRealityEffects() {
    game.controlsReversed = false;
    game.screenFlipActive = false;
    game.screenFlipFlash = 0;
    snowPatches.length = 0;
  }

  function spawnIceChunk(enemy) {
    const zone = zones[enemy.homeZoneIndex] || zones[enemy.stageIndex * ZONES_PER_STAGE + BOSS_ZONE_INDEX];
    const arenaLeft = zone.x + 150;
    const arenaRight = zone.end - 150;
    const serial = enemy.iceStormSerial || 0;
    enemy.iceStormSerial = serial + 1;
    const size = 24 + Math.floor(hash(serial * 12.71 + 4.2) * 24);
    const targetLead = clamp(player.x + player.w / 2 + player.vx * 0.22, arenaLeft, arenaRight);
    const randomX = arenaLeft + hash(serial * 31.37 + enemy.id.length * 3.1) * (arenaRight - arenaLeft);
    const x = lerp(randomX, targetLead, serial % 4 === 0 ? 0.42 : 0.12);
    bullets.push({
      x: x - size / 2,
      y: Math.max(35, enemy.baseY - 690 - hash(serial * 7.43) * 90),
      w: size,
      h: size * 1.22,
      vx: (hash(serial * 9.17 + 2.4) - 0.5) * 80,
      vy: 120 + hash(serial * 5.77 + 8.1) * 90,
      life: 4.8,
      maxLife: 4.8,
      enemy: true,
      kind: "ice-chunk",
      gravity: 980,
      damage: 1,
      color: "#bcecff",
      ownerId: enemy.id,
      ownerZone: enemy.homeZoneIndex,
    });
  }

  function shatterIceChunk(bullet, surfaceY = bullet.y + bullet.h) {
    const centerX = bullet.x + bullet.w / 2;
    const patchWidth = 78 + bullet.w * 1.7;
    const existing = snowPatches.find((patch) => (
      patch.ownerId === bullet.ownerId
      && Math.abs((patch.x + patch.w / 2) - centerX) < 54
    ));
    if (existing) {
      existing.x = Math.min(existing.x, centerX - patchWidth / 2);
      existing.w = Math.min(240, existing.w + patchWidth * 0.45);
      existing.depth = Math.min(22, existing.depth + 5);
      existing.life = 40;
    } else {
      snowPatches.push({
        x: centerX - patchWidth / 2,
        y: surfaceY,
        w: patchWidth,
        depth: 9,
        life: 40,
        ownerId: bullet.ownerId,
        ownerZone: bullet.ownerZone,
      });
    }
    if (snowPatches.length > 28) snowPatches.splice(0, snowPatches.length - 28);
    spawnParticles(centerX, surfaceY - 8, "#dff8ff", 20, 350, 0.55, 260);
    spawnParticles(centerX, surfaceY - 4, "#8ddcff", 12, 240, 0.48, 120);
    game.shake = Math.max(game.shake, 7);
    sound.tone(540, 0.1, "triangle", 0.03, 0.62);
  }

  function updateSnowPatches(dt) {
    for (let index = snowPatches.length - 1; index >= 0; index -= 1) {
      snowPatches[index].life -= dt;
      if (snowPatches[index].life <= 0) snowPatches.splice(index, 1);
    }
  }

  function blanketCensorArenaWithSnow(enemy) {
    const zone = zones[enemy.homeZoneIndex] || zones[enemy.stageIndex * ZONES_PER_STAGE + BOSS_ZONE_INDEX];
    if (!zone) return;
    const arenaSurfaces = platforms.filter((platform) => (
      !platform.hidden
      && platform.x + platform.w > zone.x
      && platform.x < zone.end
      && platform.y > 55
      && platform.y < WORLD_H - 40
    ));
    for (const platform of arenaSurfaces) {
      const left = Math.max(zone.x + 40, platform.x);
      const right = Math.min(zone.end - 40, platform.x + platform.w);
      if (right - left < 44) continue;
      snowPatches.push({
        x: left,
        y: platform.y,
        w: right - left,
        depth: 15,
        life: Number.POSITIVE_INFINITY,
        ownerId: enemy.id,
        ownerZone: enemy.homeZoneIndex,
        fullArena: true,
      });
    }
    enemy.censorSnowBlanket = true;
    spawnParticles((zone.x + zone.end) / 2, 90, "#dff8ff", 90, 780, 1.2, 240);
  }

  function fireHomingMissile(enemy, target, angleOffset = 0) {
    const sourceX = enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.42;
    const sourceY = enemy.y + enemy.h * 0.38;
    const angle = Math.atan2(target.y - sourceY, target.x - sourceX) + angleOffset;
    const speed = 315 * difficultySettings[game.difficulty].bulletSpeed;
    bullets.push({
      x: sourceX - 14,
      y: sourceY - 7,
      w: 28,
      h: 14,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      speed,
      turnRate: 2.65,
      satelliteTimer: 0.18,
      satelliteSerial: 0,
      piercePlatforms: true,
      life: 4.8,
      enemy: true,
      kind: "homing-missile",
      gravity: 0,
      color: "#ff304f",
    });
    sound.tone(84, 0.2, "sawtooth", 0.034, 0.72);
  }

  function spawnMissileSatelliteShots(missile) {
    const centerX = missile.x + missile.w / 2;
    const centerY = missile.y + missile.h / 2;
    const serial = missile.satelliteSerial++;
    for (let index = 0; index < 3; index += 1) {
      const angle = serial * 0.74 + index * TAU / 3;
      bullets.push({
        x: centerX - 4,
        y: centerY - 4,
        w: 8,
        h: 8,
        vx: Math.cos(angle) * 175,
        vy: Math.sin(angle) * 175,
        life: 1.55,
        enemy: true,
        kind: "missile-spark",
        gravity: 0,
        color: "#ff496c",
      });
    }
  }

  function fireWardenBeam(enemy, target, { length = 1700, thickness = 92, duration = 0.58, damage = 2, color = "#ff304f", beamStyle = "warden" } = {}) {
    const originX = enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.55;
    const originY = enemy.y + enemy.h * 0.45;
    const angle = Math.atan2(target.y - originY, target.x - originX);
    bullets.push({
      x: originX,
      y: originY,
      w: 1,
      h: 1,
      vx: 0,
      vy: 0,
      life: duration,
      maxLife: duration,
      enemy: true,
      harmless: true,
      kind: "warden-beam",
      beamDX: Math.cos(angle),
      beamDY: Math.sin(angle),
      beamLength: length,
      beamThickness: thickness,
      damage,
      beamStyle,
      hitPlayer: false,
      gravity: 0,
      color,
    });
    game.shake = Math.max(game.shake, 32);
    sound.beamFire(beamStyle);
  }

  function summonMagicSigil(enemy, spell, x, y, delay = 0.72) {
    const arena = getBossArenaBounds(enemy, 150);
    const safeX = clamp(x, arena.left, arena.right);
    const safeY = clamp(y, 50, enemy.baseY - 70);
    bullets.push({
      x: safeX - 30,
      y: safeY - 30,
      w: 60,
      h: 60,
      vx: 0,
      vy: 0,
      life: delay + 0.42,
      maxLife: delay + 0.42,
      triggerTimer: delay,
      triggered: false,
      enemy: true,
      harmless: true,
      kind: "magic-sigil",
      spell,
      ownerId: enemy.id,
      ownerStage: enemy.stageIndex,
      gravity: 0,
      color: "#d7a0ff",
    });
    sound.tone(320, delay, "sine", 0.017, 1.7);
  }

  function fireMagicFireball(x, y, target, spread = 0) {
    const angle = Math.atan2(target.y - y, target.x - x) + spread;
    const speed = 385 * difficultySettings[game.difficulty].bulletSpeed;
    bullets.push({
      x: x - 14,
      y: y - 14,
      w: 28,
      h: 28,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 4.2,
      enemy: true,
      kind: "fireball",
      gravity: 0,
      color: "#ff7b42",
    });
  }

  function triggerMagicSigil(sigil) {
    const centerX = sigil.x + sigil.w / 2;
    const centerY = sigil.y + sigil.h / 2;
    const owner = enemies.find((candidate) => candidate.alive && candidate.id === sigil.ownerId);
    if (sigil.spell === "teleport" && owner) {
      const arena = getBossArenaBounds(owner, 150);
      const arenaLeft = arena.left;
      const arenaRight = arena.right;
      spawnParticles(owner.x + owner.w / 2, owner.y + owner.h / 2, "#d7a0ff", 26, 380, 0.5, 0);
      owner.x = clamp(centerX - owner.w / 2, arenaLeft, arenaRight - owner.w);
      owner.y = Math.min(owner.baseY - 125, centerY - owner.h / 2);
      owner.vx = 0;
      owner.vy = 0;
      spawnParticles(owner.x + owner.w / 2, owner.y + owner.h / 2, "#fff1ff", 32, 430, 0.62, 0);
      [-0.18, 0, 0.18].forEach((spread) => fireMagicFireball(centerX, centerY, {
        x: player.x + player.w / 2,
        y: player.y + player.h / 2,
      }, spread));
    } else {
      fireMagicFireball(centerX, centerY, {
        x: player.x + player.w / 2,
        y: player.y + player.h / 2,
      });
    }
    spawnParticles(centerX, centerY, sigil.spell === "teleport" ? "#f4e0ff" : "#ff9a5e", 22, 340, 0.48, 0);
  }

  function explodeFireball(bullet) {
    const centerX = bullet.x + bullet.w / 2;
    const centerY = bullet.y + bullet.h / 2;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    if (Math.hypot(playerCenterX - centerX, playerCenterY - centerY) < 92) damagePlayer(1, centerX);
    spawnParticles(centerX, centerY, "#ff7b42", 24, 410, 0.55, 500);
    game.shake = Math.max(game.shake, 11);
    sound.tone(92, 0.18, "sawtooth", 0.04, 0.5);
  }

  function firePointBullet(x, y, target, speed = 430, spread = 0, kind = "standard", color = palette.red) {
    const angle = Math.atan2(target.y - y, target.x - x) + spread;
    const scaledSpeed = speed * difficultySettings[game.difficulty].bulletSpeed;
    bullets.push({
      x: x - 6,
      y: y - 6,
      w: 12,
      h: 12,
      vx: Math.cos(angle) * scaledSpeed,
      vy: Math.sin(angle) * scaledSpeed,
      life: 4.2,
      maxLife: 4.2,
      enemy: true,
      kind,
      gravity: 0,
      color,
      damage: 1,
    });
  }

  function launchBossFunnels(enemy, count = 4) {
    if (enemy?.bossKind === "breaker") return;
    const hpRatio = enemy.hp / enemy.maxHp;
    const panelCurve = getBossDifficultyCurve(enemy.stageIndex);
    const panelCooldown = hpRatio < 0.5 ? WARDEN_PANEL_COOLDOWNS[1] : WARDEN_PANEL_COOLDOWNS[0];
    enemy.funnelCooldown = Math.max(enemy.funnelCooldown || 0, panelCooldown * panelCurve.cooldown);
    const formationSide = enemy.x + enemy.w / 2 < player.x + player.w / 2 ? -1 : 1;
    for (let index = 0; index < count; index += 1) {
      bullets.push({
        x: enemy.x + enemy.w / 2 - 10,
        y: enemy.y + 18,
        w: 20,
        h: 9,
        vx: 0,
        vy: 0,
        life: 4.4,
        maxLife: 4.4,
        enemy: true,
        harmless: true,
        kind: "boss-funnel",
        ownerId: enemy.id,
        orbitIndex: index,
        orbitCount: count,
        formationSide,
        shotTimer: 0.38 + index * 0.055,
        shotsLeft: WARDEN_PANEL_SHOTS_PER_UNIT,
        color: "#ff496c",
      });
    }
    sound.tone(360, 0.28, "sawtooth", 0.035, 1.65);
  }

  function reflectShotgun(enemy) {
    const originX = enemy.x + enemy.w / 2;
    const originY = enemy.y + enemy.h * 0.42;
    const target = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    [-0.12, 0, 0.12].forEach((spread) => firePointBullet(originX, originY, target, 520, spread, "reflected-shotgun", "#a6f7ff"));
    enemy.reflectTimer = 0;
    enemy.reflectBreakTimer = HUNTER_REFLECT_BREAK_SECONDS;
    spawnParticles(originX, originY, "#a6f7ff", 22, 390, 0.48, 0);
    spawnParticles(originX, originY, palette.red, 14, 280, 0.38, 120);
    game.hint = `적린 · 반사 장벽 과부하 · ${HUNTER_REFLECT_BREAK_SECONDS.toFixed(1)}초 동안 산탄 유효`;
    game.hintTimer = 2.15;
    game.shake = Math.max(game.shake, 12);
    sound.tone(560, 0.13, "square", 0.04, 0.55);
    sound.tone(145, 0.18, "sawtooth", 0.035, 0.72);
  }

  function swapBossWithPlayer(enemy, { grantInvincibility = true, shake = 16 } = {}) {
    const arena = getBossArenaBounds(enemy, 90);
    const playerX = player.x;
    const playerY = player.y;
    const enemyX = enemy.x;
    const enemyY = enemy.y;
    spawnParticles(playerX + player.w / 2, playerY + player.h / 2, "#f1dcff", 28, 430, 0.55, 0);
    spawnParticles(enemyX + enemy.w / 2, enemyY + enemy.h / 2, "#936cff", 28, 430, 0.55, 0);
    player.x = clamp(enemyX + enemy.w / 2 - player.w / 2, arena.left, arena.right - player.w);
    player.y = enemyY + enemy.h - player.h;
    enemy.x = clamp(playerX + player.w / 2 - enemy.w / 2, arena.left, arena.right - enemy.w);
    enemy.y = Math.min(enemy.baseY - 40, playerY + player.h - enemy.h);
    player.vx = 0;
    player.vy = 0;
    enemy.vx = 0;
    enemy.vy = 0;
    if (grantInvincibility) player.invincible = Math.max(player.invincible, 0.62);
    game.shake = Math.max(game.shake, shake);
    sound.tone(210, 0.25, "sine", 0.045, 2.1);
  }

  function launchOracleShotgunReturn(enemy, shotId) {
    const originX = enemy.x + enemy.w / 2;
    const originY = enemy.y + enemy.h * 0.42;
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    const baseAngle = Math.atan2(targetY - originY, targetX - originX);
    const travelTime = 0.24;
    const distance = Math.max(180, Math.hypot(targetX - originX, targetY - originY));
    const speed = distance / travelTime;
    const returnPellets = 6;

    for (let pellet = 0; pellet < returnPellets; pellet += 1) {
      const ratio = pellet / (returnPellets - 1) - 0.5;
      const angle = baseAngle + ratio * 0.12;
      bullets.push({
        x: originX - 5,
        y: originY - 3,
        w: 10,
        h: 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: travelTime,
        maxLife: travelTime,
        enemy: true,
        harmless: true,
        piercePlatforms: true,
        kind: "oracle-return",
        gravity: 0,
        color: "#ff8cd8",
        shotId,
      });
    }
    enemy.oracleReturnImpactTimer = travelTime;
    enemy.oracleReturnSourceX = originX;
    spawnParticles(originX, originY, "#ff8cd8", 24, 420, 0.48, 0);
    sound.tone(480, 0.2, "square", 0.04, 0.48);
  }

  function fireRevenantShieldBullet(enemy, target, spread = 0, speed = 510) {
    const x = enemy.x + enemy.w / 2 - enemy.facing * 38;
    const y = enemy.y + enemy.h * 0.48;
    firePointBullet(x, y, target, speed, spread, "revenant-shield-shot", "#ff8bad");
    const bullet = bullets[bullets.length - 1];
    if (bullet) {
      bullet.w = 14;
      bullet.h = 8;
      bullet.x -= 1;
      bullet.y += 2;
    }
    enemy.shieldMuzzleFlash = 0.16;
  }

  function fireRevenantShieldBurst(enemy, target, count = 5, spreadStep = 0.105, speed = 510) {
    const middle = (count - 1) / 2;
    for (let index = 0; index < count; index += 1) {
      fireRevenantShieldBullet(enemy, target, (index - middle) * spreadStep, speed + (index % 2) * 30);
    }
    spawnParticles(enemy.x + enemy.w / 2 - enemy.facing * 41, enemy.y + enemy.h * 0.48, "#ffb1c4", 16, 320, 0.3, 0);
    sound.tone(126, 0.13, "square", 0.045, 0.52);
  }

  function fireRevenantShieldRing(enemy, count = 10, speed = 390) {
    const x = enemy.x + enemy.w / 2 - enemy.facing * 38;
    const y = enemy.y + enemy.h * 0.48;
    for (let index = 0; index < count; index += 1) {
      const angle = index * TAU / count;
      fireRevenantShieldBullet(enemy, { x: x + Math.cos(angle) * 600, y: y + Math.sin(angle) * 600 }, 0, speed + (index % 2) * 45);
    }
  }

  function fireRevenantPhaseTwoSupport(enemy, target) {
    if (!enemy.shieldOverdrive) return;
    [-0.11, 0, 0.11].forEach((spread) => fireRevenantShieldBullet(enemy, target, spread, 545));
  }

  function fireRevenantSwordWave(enemy, target, spread = 0, speed = 620, scale = 1) {
    const sourceX = enemy.x + enemy.w / 2 + enemy.facing * 34;
    const sourceY = enemy.y + enemy.h * 0.42;
    firePointBullet(sourceX, sourceY, target, speed, spread, "revenant-sword-wave", "#f2e6ff");
    const wave = bullets[bullets.length - 1];
    if (wave) {
      // 검기의 진행 방향은 플레이어를 향하되, 칼날 형상은 세워서 가로 탄처럼 보이지 않게 한다.
      wave.w = 22 * scale;
      wave.h = 58 * scale;
      wave.x = sourceX - wave.w / 2;
      wave.y = sourceY - wave.h / 2;
      wave.damage = scale > 1.15 ? 2 : 1;
    }
    spawnParticles(sourceX, sourceY, "#d7b7ff", 14, 360, 0.35, 0);
    sound.tone(360, 0.11, "sawtooth", 0.035, 1.7);
  }

  function throwPotion(enemy, targetX, variant = 0, offset = 0) {
    const x = enemy.x + enemy.w / 2 + enemy.facing * 18;
    const y = enemy.y + enemy.h * 0.35;
    bullets.push({
      x: x - 9,
      y: y - 13,
      w: 18,
      h: 26,
      vx: clamp((targetX + offset - x) * 0.8, -470, 470),
      vy: -570 - Math.abs(offset) * 0.22,
      life: 3.8,
      maxLife: 3.8,
      enemy: true,
      kind: "potion",
      gravity: 980,
      color: variant % 2 ? "#ce72ff" : "#78ff8b",
      potionVariant: variant,
      damage: 1,
    });
  }

  function explodePotion(bullet) {
    const centerX = bullet.x + bullet.w / 2;
    const centerY = bullet.y + bullet.h / 2;
    bullets.push({
      x: centerX - 62,
      y: centerY - 42,
      w: 124,
      h: 84,
      vx: 0,
      vy: 0,
      life: 3.2,
      maxLife: 3.2,
      enemy: true,
      harmless: true,
      kind: "poison-gas",
      color: bullet.potionVariant % 2 ? "#ce72ff" : "#78ff8b",
      damageTimer: 0,
      particleTimer: 0,
    });
    spawnParticles(centerX, centerY, bullet.color, 24, 360, 0.62, 180);
    game.shake = Math.max(game.shake, 9);
    sound.glassShatter();
    sound.tone(118, 0.18, "sawtooth", 0.038, 0.48);
  }

  function throwMutantDebris(enemy) {
    const sourceX = enemy.x + enemy.w / 2 + enemy.facing * 34;
    const floorY = enemy.y + enemy.h;
    const targetX = player.x + player.w / 2;
    const targetY = player.y + player.h / 2;
    for (let chunk = 0; chunk < 3; chunk += 1) {
      const size = 24 + chunk * 7;
      const travel = 0.72 + chunk * 0.12;
      const offsetX = (chunk - 1) * 70;
      bullets.push({
        x: sourceX - size / 2,
        y: floorY - size - 8,
        w: size,
        h: size * 0.82,
        vx: (targetX + offsetX - sourceX) / travel,
        vy: (targetY - floorY) / travel - 0.5 * 920 * travel - 120 - chunk * 35,
        life: 3.4,
        maxLife: 3.4,
        enemy: true,
        kind: "mutant-debris",
        gravity: 920,
        color: chunk % 2 ? "#697078" : "#4c555d",
        damage: 2,
      });
    }
    spawnParticles(sourceX, floorY - 4, "#8a9296", 40, 520, 0.7, 520);
    spawnParticles(sourceX, floorY - 4, "#474f55", 26, 380, 0.58, 760);
    game.shake = Math.max(game.shake, 16);
    sound.tone(58, 0.26, "sawtooth", 0.065, 0.34);
  }

  function startBossChargedShot(enemy, pattern, dx, duration = 0.78) {
    const rank = enemy.stageIndex;
    const curve = getBossDifficultyCurve(rank);
    const echoPrediction = enemy.bossKind === "echo";
    duration *= curve.windup * (echoPrediction ? 0.72 : 1);
    enemy.windup = duration;
    enemy.bossAction = "chargeShot";
    enemy.bossShotPattern = pattern;
    enemy.bossChargeDuration = duration;
    enemy.bossChargeDirection = dx >= 0 ? -1 : 1;
    enemy.targetX = player.x + player.w / 2 + (echoPrediction ? player.vx * 0.34 : 0);
    enemy.targetY = player.y + player.h / 2 + (echoPrediction ? player.vy * 0.18 : 0);
    enemy.vx = enemy.bossChargeDirection * (165 + rank * 24);
    const accent = BOSS_DEFINITIONS[enemy.bossKind]?.accent || palette.red;
    spawnParticles(
      enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.42,
      enemy.y + enemy.h * 0.42,
      accent,
      18 + rank * 3,
      220,
      duration,
      0,
    );
    if (pattern === "warden-core" || pattern === "breaker-laser") {
      sound.beamCharge(duration, pattern === "breaker-laser" ? "breaker" : "warden");
    } else {
      sound.tone(105 + rank * 22, duration * 0.7, "sawtooth", 0.018, 1.7);
    }
  }

  function releaseBossChargedShot(enemy) {
    const target = { x: enemy.targetX, y: enemy.targetY };
    switch (enemy.bossShotPattern) {
      case "warden-funnels":
        launchBossFunnels(enemy, enemy.hp / enemy.maxHp < 0.5 ? 5 : 4);
        break;
      case "warden-volley":
        [-0.2, 0, 0.2].forEach((spread) => fireHomingMissile(enemy, target, spread));
        break;
      case "warden-air":
        if (enemy.grounded) {
          enemy.vy = -590;
          enemy.vx = -enemy.bossChargeDirection * 230;
        }
        [-0.14, 0.14].forEach((spread) => fireHomingMissile(enemy, target, spread));
        break;
      case "warden-suppress":
        [-0.28, -0.09, 0.09, 0.28].forEach((spread) => fireHomingMissile(enemy, target, spread));
        break;
      case "warden-core":
        fireWardenBeam(enemy, target);
        break;
      case "breaker-laser":
        fireWardenBeam(enemy, target, { length: 1350, thickness: 64, duration: 0.52, damage: 1, color: "#ffcd70", beamStyle: "breaker" });
        break;
      case "furnace-mortar":
        [-330, -165, 0, 165, 330].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        fireFurnaceRedBurst(enemy, target, 5, 0.06, 425);
        break;
      case "furnace-volley":
        [-360, -180, 0, 180, 360].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        fireFurnaceRedBurst(enemy, target, 7, 0.048, 440);
        break;
      case "furnace-eruption":
        [-420, -280, -140, 0, 140, 280, 420].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        fireFurnaceRedBurst(enemy, target, 7, 0.068, 455);
        break;
      case "furnace-rain":
        launchRainCore(enemy);
        fireFurnaceRedBurst(enemy, target, 9, 0.042, 470);
        break;
      case "furnace-rifle":
        fireFurnaceRedBurst(enemy, target, 8, 0.018, 400);
        spawnParticles(enemy.x + enemy.w / 2 + enemy.facing * 38, enemy.y + enemy.h * 0.38, "#ffb064", 16, 310, 0.36, 80);
        break;
      case "hunter-shotgun":
        [-0.19, -0.095, 0, 0.095, 0.19].forEach((spread, index) => (
          fireBullet(enemy, 470 + index * 16, spread, "standard", target)
        ));
        spawnParticles(enemy.x + enemy.w / 2 + enemy.facing * 34, enemy.y + enemy.h * 0.4, "#ff9b54", 18, 360, 0.38, 80);
        sound.tone(112, 0.14, "square", 0.05, 0.42);
        break;
      case "hunter-rifle":
        [-0.045, 0, 0.045].forEach((spread, index) => (
          fireBullet(enemy, 610 + index * 35, spread, "phase", target)
        ));
        spawnParticles(enemy.x + enemy.w / 2 + enemy.facing * 38, enemy.y + enemy.h * 0.38, "#a6f7ff", 14, 310, 0.32, 50);
        break;
      case "weaver-lance":
        [-220, 0, 220].forEach((offset, index) => summonMagicSigil(
          enemy,
          "fireball",
          enemy.targetX + offset,
          Math.max(70, enemy.baseY - 380 - index * 45),
          0.52 + index * 0.14,
        ));
        break;
      case "weaver-fan":
        [-360, -180, 0, 180, 360].forEach((offset, index) => summonMagicSigil(
          enemy,
          "fireball",
          enemy.targetX + offset,
          Math.max(60, enemy.baseY - 300 - (index % 2) * 130),
          0.48 + index * 0.1,
        ));
        break;
      case "weaver-orbit":
        for (let index = 0; index < 6; index += 1) {
          const angle = index * TAU / 6;
          summonMagicSigil(
            enemy,
            "fireball",
            enemy.targetX + Math.cos(angle) * 310,
            enemy.targetY + Math.sin(angle) * 190,
            0.46 + index * 0.11,
          );
        }
        break;
      case "oracle-burst":
        [-0.2, -0.1, 0, 0.1, 0.2].forEach((spread) => fireBullet(enemy, 455, spread, "standard", target));
        break;
      case "oracle-cross":
        [-0.34, -0.17, 0, 0.17, 0.34].forEach((spread, index) => (
          fireBullet(enemy, 430 + (index % 2) * 75, spread, "standard", target)
        ));
        break;
      case "oracle-needle":
        [-0.055, 0, 0.055].forEach((spread) => fireBullet(enemy, 630, spread, "phase", target));
        break;
      case "oracle-ring":
        for (let index = 0; index < 12; index += 1) {
          fireBullet(enemy, 350 + (index % 2) * 55, index * TAU / 12, "standard", target);
        }
        break;
      case "censor-volley":
        for (let index = -4; index <= 4; index += 1) {
          fireBullet(enemy, 450, index * 0.095, index % 2 === 0 ? "phase" : "standard", target);
        }
        [-170, 170].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        break;
      case "censor-mortar":
        [-340, -170, 0, 170, 340].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        break;
      case "censor-air":
        if (enemy.grounded) {
          enemy.vy = -720;
          enemy.vx = -enemy.bossChargeDirection * 360;
        }
        [-0.3, -0.15, 0, 0.15, 0.3].forEach((spread) => fireBullet(enemy, 480, spread, "phase", target));
        [-230, 230].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        break;
      case "censor-grid":
        for (let index = -5; index <= 5; index += 1) {
          fireBullet(enemy, 465, index * 0.078, index % 2 === 0 ? "phase" : "standard", target);
        }
        [-330, -110, 110, 330].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        break;
      case "revenant-shield-burst":
        fireRevenantShieldBurst(enemy, target, enemy.shieldOverdrive ? 5 : 3, 0.09, 550);
        break;
      case "revenant-sword-wave":
        fireRevenantSwordWave(enemy, target, 0, 630, 1.08);
        fireRevenantPhaseTwoSupport(enemy, target);
        break;
      case "revenant-triple-wave":
        [-0.17, 0, 0.17].forEach((spread) => fireRevenantSwordWave(enemy, target, spread, 585, 0.92));
        fireRevenantPhaseTwoSupport(enemy, target);
        break;
      case "revenant-cross-wave":
        [-0.3, -0.15, 0, 0.15, 0.3].forEach((spread) => fireRevenantSwordWave(enemy, target, spread, 650, spread === 0 ? 1.25 : 0.86));
        fireRevenantPhaseTwoSupport(enemy, target);
        break;
      case "revenant-overdrive":
        fireRevenantSwordWave(enemy, target, 0, 700, 1.3);
        [-0.22, 0.22].forEach((spread) => fireRevenantSwordWave(enemy, target, spread, 620, 0.92));
        fireRevenantShieldBurst(enemy, target, 3, 0.1, 540);
        break;
      case "proxy-potion":
        [-160, 0, 160].forEach((offset, index) => throwPotion(enemy, enemy.targetX, index, offset));
        break;
      case "proxy-toxic-ring":
        [-360, -240, -120, 0, 120, 240, 360].forEach((offset, index) => throwPotion(enemy, enemy.targetX, index, offset));
        break;
      case "proxy-flask-rain":
        [-420, -280, -140, 0, 140, 280, 420].forEach((offset, index) => throwPotion(enemy, enemy.targetX, index + 1, offset));
        break;
      case "echo-shotgun":
        for (let index = -2; index <= 2; index += 1) {
          fireBullet(enemy, 460 - Math.abs(index) * 26, index * 0.12, index === 0 ? "phase" : "standard", target);
        }
        break;
      case "echo-air":
        if (enemy.grounded) {
          enemy.vy = -680;
          enemy.vx = -enemy.bossChargeDirection * 360;
        }
        [-0.22, 0, 0.22].forEach((spread, index) => fireBullet(enemy, 445, spread, index === 1 ? "phase" : "standard", target));
        break;
      case "echo-burst":
        for (let index = 0; index < 10; index += 1) {
          fireBullet(enemy, 310 + (index % 2) * 70, index * TAU / 10, index % 3 === 0 ? "phase" : "standard", target);
        }
        break;
      default:
        fireBullet(enemy, 390, 0, "standard", target);
        break;
    }
    const accent = BOSS_DEFINITIONS[enemy.bossKind]?.accent || palette.red;
    spawnParticles(
      enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.52,
      enemy.y + enemy.h * 0.42,
      accent,
      34 + enemy.stageIndex * 5,
      520,
      0.52,
      120,
    );
    enemy.bossAction = null;
    enemy.bossShotPattern = null;
    enemy.bossChargeDuration = 0;
    game.shake = Math.max(game.shake, 12 + enemy.stageIndex * 2);
  }

  function launchBurstParryCounters(centerX, centerY, removedProjectiles) {
    const targets = getActiveEnemies()
      .filter((enemy) => enemy.alive)
      .sort((first, second) => (
        Math.hypot(first.x + first.w / 2 - centerX, first.y + first.h / 2 - centerY)
        - Math.hypot(second.x + second.w / 2 - centerX, second.y + second.h / 2 - centerY)
      ));
    if (targets.length === 0) return;
    player.shotId += 1;
    for (let index = 0; index < Math.min(BURST_PARRY_PROJECTILE_COUNT, removedProjectiles.length); index += 1) {
      const target = targets[index % targets.length];
      const targetX = target.x + target.w / 2;
      const targetY = target.y + target.h / 2;
      const angle = Math.atan2(targetY - centerY, targetX - centerX);
      const laneOffset = (index - 1) * 9;
      bullets.push({
        x: centerX - 6,
        y: centerY + laneOffset - 3,
        w: 12,
        h: 6,
        vx: Math.cos(angle) * 920,
        vy: Math.sin(angle) * 920,
        life: 0.82,
        enemy: false,
        kind: "burst-parry",
        gravity: 0,
        color: "#f3ffff",
        damage: 0.9,
        shotId: player.shotId,
        piercing: false,
      });
    }
  }

  function startBurst() {
    if (game.mode !== "playing" || !game.burstUnlocked || player.burstCooldown > 0) return;
    markTutorialSignal("burst");
    player.burstCooldown = PLAYER_BURST_COOLDOWN;
    player.burstTimer = 0.38;
    player.invincible = Math.max(player.invincible, 0.34);
    player.attackId += 1;
    let cancelled = 0;
    const removedProjectiles = [];
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      if (!bullet.enemy) continue;
      const distance = Math.hypot(bullet.x + bullet.w / 2 - centerX, bullet.y + bullet.h / 2 - centerY);
      if (distance <= 155) {
        removedProjectiles.push({ x: bullet.x + bullet.w / 2, y: bullet.y + bullet.h / 2, vx: bullet.vx, vy: bullet.vy });
        spawnParticles(bullet.x, bullet.y, palette.cyan, 7, 250, 0.35, 120);
        bullets.splice(index, 1);
        cancelled += 1;
      }
    }

    for (const enemy of enemies) {
      const distance = Math.hypot(enemy.x + enemy.w / 2 - centerX, enemy.y + enemy.h / 2 - centerY);
      if (enemy.alive && distance <= 112) damageEnemy(enemy, { source: "burst" });
    }

    const tripleParry = game.stage >= ACT_THREE_INDEX && cancelled >= BURST_PARRY_PROJECTILE_COUNT;
    if (tripleParry) {
      player.burstParryTimer = 0.72;
      player.invincible = Math.max(player.invincible, 0.58);
      player.buffTimer = Math.max(player.buffTimer, 5.2);
      launchBurstParryCounters(centerX, centerY, removedProjectiles);
      game.hint = `삼중 소거 패링 · 탄환 ${cancelled}개 제거 · 자동 반격 3발`;
      game.hintTimer = 3;
      spawnParticles(centerX, centerY, "#f3ffff", 34, 560, 0.66, 0);
      sound.tone(820, 0.24, "triangle", 0.06, 0.42);
    } else if (cancelled > 0) {
      player.buffTimer = 4.5;
      game.hint = `정밀 버스트 · 탄환 ${cancelled}개 소거 · 일본도 강화`;
      game.hintTimer = 2.4;
    }
    game.shake = tripleParry ? 22 : cancelled > 0 ? 18 : 10;
    spawnParticles(centerX, centerY, palette.cyan, 24, 420, 0.58, 180);
    sound.tone(cancelled > 0 ? 520 : 340, 0.22, "sine", 0.055, 0.55);
  }

  function resolvePlayerCollision(dt) {
    const startedGrounded = player.grounded;
    player.wallLeft = false;
    player.wallRight = false;
    player.grounded = false;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(player.vx * dt), Math.abs(player.vy * dt)) / 7));
    const stepTime = dt / steps;
    const nearbyPlatforms = getNearbyPlatforms(player, 160 + Math.abs(player.vx * dt));

    for (let step = 0; step < steps; step += 1) {
      const previousX = player.x;
      player.x += player.vx * stepTime;
      player.x = clamp(player.x, 0, WORLD_W - player.w);
      for (const platform of nearbyPlatforms) {
        if (platform.hidden) continue;
        if (!overlaps(player, platform)) continue;
        const stepHeight = player.y + player.h - platform.y;
        const maxStepHeight = platform.h >= 500 ? PLAYER_GROUND_SEAM_STEP_HEIGHT : PLAYER_PLATFORM_STEP_HEIGHT;
        const canStepUp = startedGrounded
          && player.vy >= 0
          && stepHeight > 0
          && stepHeight <= maxStepHeight;
        if (canStepUp) {
          const steppedPlayer = { x: player.x, y: platform.y - player.h, w: player.w, h: player.h };
          const stepBlocked = nearbyPlatforms.some((other) => (
            other !== platform
            && !other.hidden
            && overlaps(steppedPlayer, other)
          ));
          if (!stepBlocked) {
            player.y = steppedPlayer.y;
            player.vy = 0;
            player.grounded = true;
            player.airJumpAvailable = true;
            continue;
          }
        }
        if (previousX + player.w <= platform.x + 1 && player.vx > 0) {
          player.x = platform.x - player.w;
          player.vx = 0;
          player.wallRight = true;
        } else if (previousX >= platform.x + platform.w - 1 && player.vx < 0) {
          player.x = platform.x + platform.w;
          player.vx = 0;
          player.wallLeft = true;
        } else {
          const pushLeft = player.x + player.w - platform.x;
          const pushRight = platform.x + platform.w - player.x;
          if (pushLeft < pushRight) {
            player.x -= pushLeft;
            player.wallRight = true;
          } else {
            player.x += pushRight;
            player.wallLeft = true;
          }
          player.vx = 0;
        }
      }

      const previousY = player.y;
      const previousBottom = previousY + player.h;
      player.y += player.vy * stepTime;
      for (const platform of nearbyPlatforms) {
        if (platform.hidden) continue;
        if (!overlaps(player, platform)) continue;
        if (previousBottom <= platform.y + 2 && player.vy >= 0) {
          player.y = platform.y - player.h;
          player.vy = 0;
          player.grounded = true;
          player.airJumpAvailable = true;
        } else if (previousY >= platform.y + platform.h - 2 && player.vy < 0) {
          player.y = platform.y + platform.h;
          player.vy = 0;
        } else {
          const pushUp = player.y + player.h - platform.y;
          const pushDown = platform.y + platform.h - player.y;
          if (pushUp < pushDown) {
            player.y -= pushUp;
            player.grounded = true;
            player.airJumpAvailable = true;
          } else {
            player.y += pushDown;
          }
          player.vy = 0;
        }
      }
    }

    const leftProbe = { x: player.x - 3, y: player.y + 5, w: 3, h: player.h - 10 };
    const rightProbe = { x: player.x + player.w, y: player.y + 5, w: 3, h: player.h - 10 };
    for (const platform of nearbyPlatforms) {
      if (platform.hidden) continue;
      if (overlaps(leftProbe, platform)) player.wallLeft = true;
      if (overlaps(rightProbe, platform)) player.wallRight = true;
    }
  }

  function updatePlayer(dt) {
    const wasGrounded = player.grounded;
    const impactVelocity = player.vy;
    player.attackTimer = Math.max(0, player.attackTimer - dt);
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.invincible = Math.max(0, player.invincible - dt);
    player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
    player.comboTimer = Math.max(0, player.comboTimer - dt);
    player.slashChainTimer = Math.max(0, player.slashChainTimer - dt);
    player.styleScore = Math.max(0, player.styleScore - (player.comboTimer > 0 ? 2.5 : 14) * dt);
    player.burstCooldown = Math.max(0, player.burstCooldown - dt);
    player.burstTimer = Math.max(0, player.burstTimer - dt);
    player.burstParryTimer = Math.max(0, player.burstParryTimer - dt);
    player.buffTimer = Math.max(0, player.buffTimer - dt);
    player.shotgunCooldown = Math.max(0, player.shotgunCooldown - dt);
    player.recoilTimer = Math.max(0, player.recoilTimer - dt);
    const wasReloading = player.shotgunReload > 0;
    player.shotgunReload = Math.max(0, player.shotgunReload - dt);
    if (wasReloading && player.shotgunReload <= 0 && player.shells < player.maxShells) {
      player.shells += 1;
      if (player.shells < player.maxShells) player.shotgunReload = 0.48;
      sound.tone(310, 0.05, "square", 0.018, 1.35);
    }
    player.squash = moveToward(player.squash, 0, dt * 1.7);
    player.stepTimer -= dt;
    if (player.comboTimer <= 0) player.combo = 0;
    if (player.slashChainTimer <= 0 && player.attackTimer <= 0) player.slashChain = 0;

    if (pressed.has("Space") || pressed.has("KeyK")) player.jumpBuffer = INPUT_TUNING.jumpBuffer;
    if (pressed.has("KeyJ") || (pressed.has("KeyX") && !game.adminMode)) startAttack();
    if (pressed.has("KeyZ") && game.adminMode) startAdminEraseAttack();
    if (pressed.has("KeyX") && game.adminMode) toggleAdminSpawnPanel();
    if (pressed.has("KeyF") || pressed.has("KeyC")) startShotgun();
    if (pressed.has("KeyE")) startBurst();

    if (game.adminMode) {
      const left = keys.has("KeyA") || keys.has("ArrowLeft") || (moveStick.active && moveStick.x < -0.06);
      const right = keys.has("KeyD") || keys.has("ArrowRight") || (moveStick.active && moveStick.x > 0.06);
      const up = keys.has("Space") || keys.has("KeyK");
      const down = keys.has("ShiftLeft") || keys.has("ShiftRight");
      const horizontal = Number(right) - Number(left);
      const vertical = Number(down) - Number(up);
      const flightSpeed = INPUT_TUNING.moveSpeed * 2;
      player.vx = horizontal * flightSpeed;
      player.vy = vertical * flightSpeed;
      player.x = clamp(player.x + player.vx * dt, 0, WORLD_W - player.w);
      player.y = clamp(player.y + player.vy * dt, -240, WORLD_H - player.h);
      player.grounded = false;
      player.wallLeft = false;
      player.wallRight = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      player.airJumpAvailable = true;
      player.landingImpactArmed = false;
      if (horizontal !== 0) player.facing = horizontal > 0 ? 1 : -1;
      player.runCycle += Math.hypot(player.vx, player.vy) * dt * 0.052;
    } else {
    const left = keys.has("KeyA") || keys.has("ArrowLeft") || (moveStick.active && moveStick.x < -0.06);
    const right = keys.has("KeyD") || keys.has("ArrowRight") || (moveStick.active && moveStick.x > 0.06);
    const keyboardDirection = Number(right) - Number(left);
    const rawDirection = moveStick.active && Math.abs(moveStick.x) > 0.04 ? moveStick.x : keyboardDirection;
    const controlPolarity = game.controlsReversed ? -1 : 1;
    const direction = rawDirection * controlPolarity;
    const standingOnSnow = snowPatches.some((patch) => (
      player.x + player.w > patch.x
      && player.x < patch.x + patch.w
      && Math.abs(player.y + player.h - patch.y) < 24
    ));
    const snowSpeed = standingOnSnow ? 0.58 : 1;

    if (Math.abs(direction) > 0.04) {
      player.facing = direction > 0 ? 1 : -1;
      const control = player.attackTimer > 0 ? INPUT_TUNING.attackControl : player.grounded ? 1 : INPUT_TUNING.airControl;
      const buffSpeed = player.buffTimer > 0 ? 1.22 : 1;
      player.vx = moveToward(
        player.vx,
        direction * INPUT_TUNING.moveSpeed * buffSpeed * snowSpeed,
        INPUT_TUNING.groundAcceleration * control * (standingOnSnow ? 0.72 : 1) * dt,
      );
    } else if (player.attackTimer <= 0) {
      player.vx = moveToward(
        player.vx,
        0,
        (player.grounded ? INPUT_TUNING.groundFriction : INPUT_TUNING.airFriction) * dt,
      );
    }

    if (player.grounded) {
      player.coyote = INPUT_TUNING.coyoteTime;
    } else {
      player.coyote = Math.max(0, player.coyote - dt);
    }

    if (player.jumpBuffer > 0 && !player.grounded && (player.wallLeft || player.wallRight)) {
      markTutorialSignal("wallJump");
      const wallDirection = player.wallLeft ? 1 : -1;
      player.vx = wallDirection * 520;
      player.vy = -690;
      player.facing = wallDirection;
      player.airJumpAvailable = true;
      player.landingImpactArmed = true;
      player.jumpBuffer = 0;
      player.squash = -0.13;
      spawnParticles(player.x + (player.wallLeft ? 0 : player.w), player.y + player.h / 2, palette.cyan, 10, 220, 0.35, 360);
      sound.tone(230, 0.1, "square", 0.025, 1.45);
    } else if (player.jumpBuffer > 0 && player.coyote > 0) {
      markTutorialSignal("groundJump");
      player.vy = -715;
      player.grounded = false;
      player.coyote = 0;
      player.landingImpactArmed = true;
      player.jumpBuffer = 0;
      player.squash = -0.16;
      spawnParticles(player.x + player.w / 2, player.y + player.h, "#a8d8df", 7, 130, 0.28, 300);
      sound.tone(190, 0.1, "square", 0.025, 1.7);
    } else if (player.jumpBuffer > 0 && !player.grounded && player.airJumpAvailable) {
      markTutorialSignal("doubleJump");
      player.vy = -675;
      player.airJumpAvailable = false;
      player.landingImpactArmed = true;
      player.jumpBuffer = 0;
      player.squash = -0.12;
      spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 13, 240, 0.4, 260);
      sound.tone(260, 0.12, "square", 0.03, 1.65);
    }

    const effectiveLeft = game.controlsReversed ? right : left;
    const effectiveRight = game.controlsReversed ? left : right;
    const holdingWall = !player.grounded && ((player.wallLeft && effectiveLeft) || (player.wallRight && effectiveRight));
    if (holdingWall) {
      if (keys.has("KeyW") || keys.has("ArrowUp") || (moveStick.active && moveStick.y < -0.28)) player.vy = moveToward(player.vy, -175, 1500 * dt);
      else player.vy = Math.min(player.vy, keys.has("KeyS") || keys.has("ArrowDown") || (moveStick.active && moveStick.y > 0.28) ? 300 : 145);
    }

    if (!keys.has("Space") && !keys.has("KeyK") && player.vy < -240 && player.attackTimer <= 0) {
      player.vy += GRAVITY * 1.25 * dt;
    }

    player.vy = Math.min(player.vy + GRAVITY * dt, 1150);
    resolvePlayerCollision(dt);

    player.runCycle += Math.abs(player.vx) * dt * 0.052;
    if (player.grounded && !wasGrounded) {
      if (player.landingImpactArmed && impactVelocity > 260) {
        player.squash = clamp(impactVelocity / 2400, 0.12, 0.24);
        game.shake = Math.max(game.shake, Math.min(3.5, impactVelocity / 240));
        spawnParticles(player.x + player.w / 2, player.y + player.h, "#8aa7ad", 9, 145, 0.34, 260);
      }
      player.landingImpactArmed = false;
    }
    if (player.grounded && Math.abs(player.vx) > 105 && player.stepTimer <= 0) {
      player.stepTimer = 0.12 + 48 / Math.abs(player.vx);
      const heelX = player.x + player.w / 2 - player.facing * 10;
      spawnParticles(heelX, player.y + player.h - 2, "#5f7b82", 3, 72, 0.22, 170);
    }
    }

    if (isAttackActive()) {
      const hitbox = attackBox();
      for (const enemy of enemies) {
        if (enemy.alive && overlaps(hitbox, enemy)) damageEnemy(enemy);
      }
      // 칼날에 직접 닿은 투사체를 제거한다. 의사의 독가스는 큰 구름의 가장자리 접촉도 인정한다.
      for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
        const bullet = bullets[bulletIndex];
        const doctorHazard = ["potion", "poison-gas"].includes(bullet.kind);
        const swordContact = doctorHazard ? overlaps(hitbox, bullet) : bulletIntersectsSlashBlade(bullet);
        if (!bullet.enemy || !swordContact) continue;
        const shieldRound = bullet.kind === "revenant-shield-shot";
        spawnParticles(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, bullet.kind === "potion" ? "#dfffe9" : shieldRound ? "#ffcd70" : bullet.color || palette.cyan, doctorHazard ? 14 : 7, 280, 0.4, 80);
        if (bullet.kind === "potion") sound.glassShatter();
        bullets.splice(bulletIndex, 1);
        player.shotgunCharge = Math.min(3, player.shotgunCharge + (shieldRound ? 0.8 : 0.34));
        if (!player.grounded) player.airJumpAvailable = true;
      }
      for (const node of boostNodes) {
        if (node.hitAttackId === player.attackId || !overlaps(hitbox, node)) continue;
        if (game.adminMode && player.adminEraseAttackId === player.attackId) {
          eraseAdminPlacedObject(node, boostNodes);
          continue;
        }
        node.hitAttackId = player.attackId;
        player.vx += node.launchX * player.facing;
        player.vy = Math.min(player.vy, node.launchY);
        player.airJumpAvailable = true;
        game.shake = 9;
        spawnParticles(node.x + node.w / 2, node.y + node.h / 2, palette.amber, 16, 340, 0.5, 420);
        sound.tone(410, 0.16, "sine", 0.045, 1.8);
      }
      if (game.adminMode && player.adminEraseAttackId === player.attackId) {
        for (let pickupIndex = pickups.length - 1; pickupIndex >= 0; pickupIndex -= 1) {
          const pickup = pickups[pickupIndex];
          if (overlaps(hitbox, pickup)) eraseAdminPlacedObject(pickup, pickups);
        }
      }
    }

    for (const hazard of hazards) {
      if (!hazard.hidden && hazard.active && overlaps(player, hazard)) damagePlayer(1, hazard.x + hazard.w / 2);
    }

    for (const checkpoint of checkpoints) {
      if (!checkpoint.active && Math.abs(player.x + player.w / 2 - checkpoint.x) < 55 && Math.abs(player.y + player.h - (checkpoint.y + checkpoint.h)) < 110) {
        activateCheckpoint(checkpoint);
      }
    }

    for (const pickup of pickups) {
      if (!pickup.active || !overlaps(player, pickup)) continue;
      if (game.adminMode) continue;
      pickup.active = false;
      player.hp = Math.min(player.maxHp, player.hp + 2);
      player.airJumpAvailable = true;
      game.hint = "수복편 획득 · 체력 회복";
      game.hintTimer = 2;
      spawnParticles(pickup.x + 12, pickup.y + 12, palette.cyan, 16, 280, 0.55, 150);
      sound.checkpoint();
    }

    if (player.y > WORLD_H + 120) respawn();

    if (!game.adminMode) {
      const firstCheckedZone = game.adminCadetMode ? game.adminCadetStartZone : 0;
      for (let zoneIndex = firstCheckedZone; zoneIndex < zones.length; zoneIndex += 1) {
        const lockedZone = zones[zoneIndex];
        const zoneBoundary = lockedZone.end - 48;
        if (player.x + player.w <= zoneBoundary) break;
        const zoneRemaining = getZoneRemaining(zoneIndex);
        if (zoneRemaining === 0) continue;
        player.x = zoneBoundary - player.w;
        player.vx = Math.min(0, player.vx);
        game.hint = `${lockedZone.name} 봉쇄 · 남은 적 ${zoneRemaining}기`;
        game.hintTimer = Math.max(game.hintTimer, 1.2);
        break;
      }

      const firstCheckedStage = game.adminCadetMode ? game.adminCadetStartStage : 0;
      for (let stageIndex = firstCheckedStage; stageIndex < stages.length; stageIndex += 1) {
        const stage = stages[stageIndex];
        if (player.x <= stage.gateX || game.defeatedBosses.has(stage.bossKind)) continue;
        player.x = stage.gateX - player.w - 35;
        player.vx = -180;
        game.hint = `${BOSS_DEFINITIONS[stage.bossKind].name}을 먼저 격파`;
        game.hintTimer = 3;
        break;
      }
    }

    if (player.x > WORLD_W - 145 && game.defeatedBosses.has("echo")) {
      finishGame();
    }

    player.afterimageTimer -= dt;
    if ((player.attackTimer > 0 || player.buffTimer > 0 || (!player.grounded && Math.abs(player.vx) > 390)) && player.afterimageTimer <= 0) {
      player.trail.push({ x: player.x, y: player.y, facing: player.facing, life: 0.19, maxLife: 0.19 });
      player.afterimageTimer = 0.035;
    }
    player.trail.forEach((trail) => { trail.life -= dt; });
    player.trail = player.trail.filter((trail) => trail.life > 0);
  }

  function moveEnemyPhysics(enemy, dt) {
    ejectEnemyFromPlatforms(enemy);
    enemy.grounded = false;
    enemy.vy = Math.min((enemy.vy || 0) + GRAVITY * 0.78 * dt, 980);
    const lockdownBounds = getEnemyLockdownBounds(enemy);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(enemy.vx * dt), Math.abs(enemy.vy * dt)) / 7));
    const stepTime = dt / steps;
    let blocked = false;
    const nearbyPlatforms = getNearbyPlatforms(enemy, 150 + Math.abs(enemy.vx * dt));

    for (let step = 0; step < steps; step += 1) {
      const oldX = enemy.x;
      enemy.x += enemy.vx * stepTime;
      if (enemy.x < lockdownBounds.left || enemy.x + enemy.w > lockdownBounds.right) {
        constrainEnemyToLockdown(enemy, lockdownBounds);
        blocked = true;
      }
      for (const platform of nearbyPlatforms) {
        if (platform.hidden) continue;
        if (!overlaps(enemy, platform)) continue;
        if (oldX + enemy.w <= platform.x + 1 && enemy.vx > 0) enemy.x = platform.x - enemy.w;
        else if (oldX >= platform.x + platform.w - 1 && enemy.vx < 0) enemy.x = platform.x + platform.w;
        else enemy.x += enemy.x + enemy.w / 2 < platform.x + platform.w / 2
          ? -(enemy.x + enemy.w - platform.x)
          : platform.x + platform.w - enemy.x;
        blocked = true;
        enemy.vx = 0;
      }

      const oldY = enemy.y;
      const oldBottom = oldY + enemy.h;
      enemy.y += enemy.vy * stepTime;
      for (const platform of nearbyPlatforms) {
        if (platform.hidden) continue;
        if (!overlaps(enemy, platform)) continue;
        if (oldBottom <= platform.y + 2 && enemy.vy >= 0) {
          enemy.y = platform.y - enemy.h;
          enemy.vy = 0;
          enemy.grounded = true;
        } else if (oldY >= platform.y + platform.h - 2 && enemy.vy < 0) {
          enemy.y = platform.y + platform.h;
          enemy.vy = 0;
        } else {
          const pushUp = enemy.y + enemy.h - platform.y;
          const pushDown = platform.y + platform.h - enemy.y;
          if (pushUp < pushDown) {
            enemy.y -= pushUp;
            enemy.grounded = true;
          } else {
            enemy.y += pushDown;
          }
          enemy.vy = 0;
        }
      }
    }

    enemy.x = clamp(enemy.x, 0, WORLD_W - enemy.w);
    constrainEnemyToLockdown(enemy, lockdownBounds);
    ejectEnemyFromPlatforms(enemy);
    if (blocked) {
      enemy.stuckTimer = (enemy.stuckTimer || 0) + dt;
      if (enemy.stuckTimer > 0.16 && enemy.grounded) {
        enemy.vy = -390;
        enemy.vx = -enemy.facing * 110;
        enemy.stuckTimer = 0;
      }
    } else {
      enemy.stuckTimer = Math.max(0, (enemy.stuckTimer || 0) - dt * 2);
    }
    if (!Number.isFinite(enemy.y) || enemy.y < -enemy.h - 260) {
      recoverEnemyToHome(enemy);
    } else if (enemy.y > WORLD_H + 100) {
      if (enemy.type === "boss") recoverEnemyToHome(enemy);
      else killEnemy(enemy, { countKill: false });
    }
  }

  function resolveEnemySeparation(collection = enemies) {
    const solidEnemies = collection.filter((enemy) => enemy.alive && enemy.type !== "drone");
    for (let a = 0; a < solidEnemies.length; a += 1) {
      for (let b = a + 1; b < solidEnemies.length; b += 1) {
        const first = solidEnemies[a];
        const second = solidEnemies[b];
        if (!overlaps(first, second)) continue;
        const overlapX = Math.min(first.x + first.w, second.x + second.w) - Math.max(first.x, second.x);
        if (overlapX <= 0) continue;
        const direction = first.x + first.w / 2 <= second.x + second.w / 2 ? -1 : 1;
        const firstShare = isStationaryTurret(first) ? 0 : first.type === "boss" ? 0.15 : isStationaryTurret(second) ? 1 : 0.5;
        const secondShare = isStationaryTurret(second) ? 0 : second.type === "boss" ? 0.15 : isStationaryTurret(first) ? 1 : 0.5;
        first.x += direction * overlapX * firstShare;
        second.x -= direction * overlapX * secondShare;
        first.vx *= 0.35;
        second.vx *= 0.35;
      }
    }
    for (const enemy of solidEnemies) constrainEnemyToLockdown(enemy);
  }

  function resolvePlayerEnemyOverlap(collection = enemies) {
    if (game.adminMode) return;
    for (const enemy of collection) {
      if (!enemy.alive || enemy.type === "drone" || !overlaps(player, enemy)) continue;
      const playerCenter = player.x + player.w / 2;
      const enemyCenter = enemy.x + enemy.w / 2;
      const overlapX = Math.min(player.x + player.w, enemy.x + enemy.w) - Math.max(player.x, enemy.x);
      if (overlapX <= 0) continue;
      const direction = playerCenter <= enemyCenter ? -1 : 1;
      player.x += direction * (overlapX + 0.5);
      player.vx = direction < 0 ? Math.min(0, player.vx) : Math.max(0, player.vx);
      if (!isStationaryTurret(enemy)) enemy.vx -= direction * 35;
    }
  }

  function hasGroundAhead(entity, direction, distance = 42) {
    if (!direction) return true;
    const probeX = direction > 0 ? entity.x + entity.w + distance - 8 : entity.x - distance;
    const probe = { x: probeX, y: entity.y + entity.h, w: 8, h: 34 };
    return getNearbyPlatforms(probe, 24).some((platform) => !platform.hidden && overlaps(probe, platform));
  }

  function updateEnemy(enemy, dt) {
    if (!enemy.alive) return;
    enemy.anim += dt;
    enemy.cooldown -= dt;
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    enemy.turretRecoil = Math.max(0, (enemy.turretRecoil || 0) - dt);
    updateEnemyBurn(enemy, dt);
    if (!enemy.alive) return;
    enemy.staggerHitTimer = Math.max(0, (enemy.staggerHitTimer || 0) - dt);
    if (enemy.staggerHitTimer <= 0) enemy.staggerHitCount = 0;
    if (enemy.type === "shield") {
      ensureShieldState(enemy);
      const wasBroken = enemy.shieldBreakTimer > 0;
      enemy.shieldBreakTimer = Math.max(0, enemy.shieldBreakTimer - dt);
      if (wasBroken && enemy.shieldBreakTimer <= 0) {
        enemy.shieldGuard = 1;
        enemy.shieldGuardRegen = SHIELD_GUARD_REGEN_SECONDS;
      } else if (enemy.shieldBreakTimer <= 0 && enemy.shieldGuard < enemy.shieldGuardMax) {
        enemy.shieldGuardRegen = Math.max(0, enemy.shieldGuardRegen - dt);
        if (enemy.shieldGuardRegen <= 0) {
          enemy.shieldGuard += 1;
          enemy.shieldGuardRegen = enemy.shieldGuard < enemy.shieldGuardMax ? SHIELD_GUARD_REGEN_SECONDS : 0;
        }
      }
    }
    if (game.adminMode) {
      enemy.windup = 0;
      enemy.rushTimer = 0;
      enemy.burstRemaining = 0;
      enemy.burstInterval = 0;
      enemy.bossAction = "idle";
      enemy.targetX = null;
      enemy.targetY = null;
      enemy.cooldown = Math.max(enemy.cooldown, 0.8);
      if (enemy.type === "drone") {
        enemy.vx = 0;
        enemy.y = enemy.baseY + Math.sin(enemy.anim * 1.4) * 12;
        constrainEnemyToLockdown(enemy);
      } else {
        enemy.vx = moveToward(enemy.vx, 0, 620 * dt);
        moveEnemyPhysics(enemy, dt);
      }
      return;
    }
    const dx = player.x + player.w / 2 - (enemy.x + enemy.w / 2);
    const dy = player.y + player.h / 2 - (enemy.y + enemy.h / 2);
    const distance = Math.hypot(dx, dy);
    const stagePressure = STAGE_COMBAT_PRESSURE[enemy.stageIndex] || 1;
    const formation = getEnemyFormation(enemy);
    const formationCooldown = formation?.id === "spotter" && enemy.type !== "drone" ? 0.72 : 1;
    const enemySpeedScale = difficultySettings[game.difficulty].enemySpeed * stagePressure;
    enemy.facing = dx >= 0 ? 1 : -1;

    if (enemy.type === "drone") {
      const previousDroneX = enemy.x;
      const previousDroneY = enemy.y;
      enemy.y = enemy.baseY + Math.sin(enemy.anim * 2.2) * 18;
      if (distance < 620) {
        enemy.x += clamp(dx, -1, 1) * 42 * enemySpeedScale * dt;
        enemy.x = clamp(enemy.x, enemy.originX - enemy.range, enemy.originX + enemy.range);
      }
      if (getNearbyPlatforms(enemy, 72).some((platform) => !platform.hidden && overlaps(enemy, platform))) {
        enemy.x = previousDroneX;
        enemy.y = previousDroneY;
        enemy.baseY -= Math.sign(Math.sin(enemy.anim * 2.2) || 1) * 8;
      }
      constrainEnemyToLockdown(enemy);
      if (distance < 560 && enemy.cooldown <= 0) {
        fireBullet(enemy, 410, 0, formation?.id === "relay" ? "phase" : "standard");
        enemy.cooldown = (1.75 + hash(enemy.anim) * 0.45) / stagePressure;
      }
      if (distance < 42) damagePlayer(1, enemy.x);
      return;
    }

    if (enemy.type === "runner") {
      const rushSpeed = (365 + enemy.stageIndex * 18) * enemySpeedScale;
      if (enemy.rushTimer > 0) {
        enemy.rushTimer = Math.max(0, enemy.rushTimer - dt);
        if (!hasGroundAhead(enemy, enemy.rushDirection, 34)) {
          enemy.rushTimer = 0;
          enemy.vx = 0;
        } else {
          enemy.vx = enemy.rushDirection * rushSpeed;
        }
        moveEnemyPhysics(enemy, dt);
        if (overlaps(player, enemy)) damagePlayer(1, enemy.x + enemy.w / 2);
        return;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup = Math.max(0, enemy.windup - dt);
        enemy.vx = moveToward(enemy.vx, 0, 760 * dt);
        if (before > 0.06 && enemy.windup <= 0.06) {
          enemy.rushDirection = Math.sign(enemy.targetX - (enemy.x + enemy.w / 2)) || enemy.facing || 1;
          enemy.rushTimer = 0.34 + enemy.stageIndex * 0.018;
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h - 8, palette.cyan, 10, 220, 0.28, 70);
          sound.tone(125, 0.1, "sawtooth", 0.026, 0.72);
        }
        moveEnemyPhysics(enemy, dt);
        return;
      }
      if (distance < 560 && Math.abs(dx) > 92 && enemy.cooldown <= 0 && hasGroundAhead(enemy, Math.sign(dx), 42)) {
        enemy.windup = 0.42;
        enemy.cooldown = (2.2 / stagePressure) * formationCooldown;
        enemy.targetX = player.x + player.w / 2 + player.vx * 0.12;
        enemy.targetY = player.y + player.h / 2;
      } else {
        const chase = distance < 380;
        const speed = 104 * enemySpeedScale;
        if (chase && Math.abs(dx) > 68 && hasGroundAhead(enemy, Math.sign(dx), 34)) {
          enemy.vx = moveToward(enemy.vx, Math.sign(dx) * speed, 310 * dt);
        } else {
          const patrolDirection = enemy.x > enemy.originX + enemy.range ? -1 : enemy.x < enemy.originX - enemy.range ? 1 : enemy.facing;
          enemy.vx = moveToward(enemy.vx, patrolDirection * speed * 0.4, 170 * dt);
        }
      }
      moveEnemyPhysics(enemy, dt);
      if (Math.abs(dx) < 70 && Math.abs(dy) < 64 && enemy.cooldown <= 0) {
        damagePlayer(1, enemy.x + enemy.w / 2);
        enemy.cooldown = 1.15 / stagePressure;
      }
      return;
    }

    if (enemy.type === "gunner") {
      if (distance < 680 && enemy.cooldown <= 0) {
        enemy.windup = 0.36;
        enemy.cooldown = (2.05 / stagePressure) * formationCooldown;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup -= dt;
        if (before > 0.07 && enemy.windup <= 0.07) {
          fireBullet(enemy, 470);
          if (formation?.id === "crossfire") fireBullet(enemy, 430, enemy.facing > 0 ? 0.13 : -0.13);
        }
      }
      enemy.vx = moveToward(enemy.vx, 0, 480 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "turret") {
      if (distance < 920 && enemy.cooldown <= 0 && enemy.windup <= 0) {
        enemy.windup = TURRET_CHARGE_SECONDS;
        enemy.turretChargeDuration = TURRET_CHARGE_SECONDS;
        enemy.cooldown = (3.05 / stagePressure) * formationCooldown;
        enemy.targetX = player.x + player.w / 2 + player.vx * 0.16;
        enemy.targetY = player.y + player.h / 2 + player.vy * 0.05;
        sound.tone(145, 0.24, "sine", 0.024, 1.75);
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup = Math.max(0, enemy.windup - dt);
        if (before > 0.07 && enemy.windup <= 0.07) fireTurretRow(enemy);
      }
      enemy.vx = moveToward(enemy.vx, 0, 900 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "machinegun") {
      if (enemy.burstRemaining > 0) {
        enemy.burstInterval -= dt;
        while (enemy.burstRemaining > 0 && enemy.burstInterval <= 0) {
          const shotIndex = SENTRY_BURST_ROUNDS - enemy.burstRemaining;
          const spreadPattern = [-0.045, 0.018, -0.015, 0.042];
          fireBullet(
            enemy,
            500 + enemy.stageIndex * 8,
            spreadPattern[shotIndex] || 0,
            "machinegun",
            { x: enemy.targetX, y: enemy.targetY },
          );
          enemy.burstRemaining -= 1;
          enemy.burstInterval += SENTRY_BURST_INTERVAL;
        }
        enemy.vx = moveToward(enemy.vx, 0, 680 * dt);
        moveEnemyPhysics(enemy, dt);
        return;
      }
      if (distance < 780 && enemy.cooldown <= 0) {
        enemy.windup = 0.52;
        enemy.cooldown = (2.75 / stagePressure) * formationCooldown;
        enemy.targetX = player.x + player.w / 2 + player.vx * 0.18;
        enemy.targetY = player.y + player.h / 2 + player.vy * 0.05;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup = Math.max(0, enemy.windup - dt);
        if (before > 0.07 && enemy.windup <= 0.07) {
          enemy.burstRemaining = SENTRY_BURST_ROUNDS;
          enemy.burstInterval = 0;
          enemy.burstSequence += 1;
        }
      }
      enemy.vx = moveToward(enemy.vx, 0, 560 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "piercer") {
      if (distance < 880 && enemy.cooldown <= 0) {
        enemy.windup = 0.48;
        enemy.cooldown = (2.45 / enemySpeedScale) * formationCooldown;
        enemy.targetX = player.x + player.w / 2;
        enemy.targetY = player.y + player.h / 2;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup -= dt;
        if (before > 0.07 && enemy.windup <= 0.07) fireBullet(enemy, 560, 0, "phase", { x: enemy.targetX, y: enemy.targetY });
      }
      enemy.vx = moveToward(enemy.vx, 0, 520 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "mortarTurret") {
      if (distance < 1080 && enemy.cooldown <= 0 && enemy.windup <= 0) {
        enemy.windup = 1.02;
        enemy.cooldown = (4.25 / stagePressure) * formationCooldown;
        enemy.targetX = player.x + player.w / 2 + player.vx * 0.42;
        enemy.targetY = player.y + player.h;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup = Math.max(0, enemy.windup - dt);
        if (before > 0.1 && enemy.windup <= 0.1) fireMortarTurretVolley(enemy);
      }
      enemy.vx = moveToward(enemy.vx, 0, 980 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "mortar") {
      if (distance < 920 && enemy.cooldown <= 0) {
        enemy.windup = 0.74;
        enemy.cooldown = (3.15 / enemySpeedScale) * formationCooldown;
        enemy.targetX = player.x + player.w / 2 + player.vx * 0.32;
        enemy.targetY = player.y + player.h;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup -= dt;
        if (before > 0.09 && enemy.windup <= 0.09) fireMortar(enemy, enemy.targetX);
      }
      enemy.vx = moveToward(enemy.vx, 0, 420 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "boss") {
      updateBoss(enemy, dt, dx, distance);
      return;
    }

    const chase = distance < (enemy.type === "shield" ? 430 : 360);
    const speed = (enemy.type === "shield" ? 58 : 96) * enemySpeedScale;
    if (chase && Math.abs(dx) > 64) {
      enemy.vx = moveToward(enemy.vx, Math.sign(dx) * speed, 280 * dt);
    } else if (!chase) {
      const patrolDirection = enemy.x > enemy.originX + enemy.range ? -1 : enemy.x < enemy.originX - enemy.range ? 1 : enemy.facing;
      enemy.vx = moveToward(enemy.vx, patrolDirection * speed * 0.45, 160 * dt);
    } else {
      enemy.vx = moveToward(enemy.vx, 0, 400 * dt);
    }

    if (enemy.x > enemy.originX + enemy.range && enemy.vx > 0) enemy.vx = -speed * 0.45;
    if (enemy.x < enemy.originX - enemy.range && enemy.vx < 0) enemy.vx = speed * 0.45;
    moveEnemyPhysics(enemy, dt);

    if (Math.abs(dx) < (enemy.type === "shield" ? 76 : 70) && Math.abs(dy) < 62 && enemy.cooldown <= 0) {
      enemy.windup = enemy.type === "shield" ? 0.68 : 0.3;
      enemy.cooldown = (enemy.type === "shield" ? 2.15 : 1.05) / stagePressure;
    }

    if (enemy.windup > 0) {
      const previous = enemy.windup;
      enemy.windup -= dt;
      if (previous > 0.08 && enemy.windup <= 0.08 && Math.abs(dx) < 105 && Math.abs(dy) < 72) {
        damagePlayer(1, enemy.x + enemy.w / 2);
      }
    }
  }

  function updateBoss(enemy, dt, dx, distance) {
    const rank = enemy.stageIndex;
    const bossKind = enemy.bossKind || stages[rank]?.bossKind || "warden";
    const definition = BOSS_DEFINITIONS[bossKind] || BOSS_DEFINITIONS.warden;
    const kind = getBossArchetype(bossKind);
    const hpRatio = enemy.hp / enemy.maxHp;
    const speedScale = difficultySettings[game.difficulty].enemySpeed;
    const bossCurve = getBossDifficultyCurve(rank);
    const enrage = hpRatio < 0.45 ? 1.16 : 1;
    const echoSpeedFactor = bossKind === "echo" ? 1.12 : 1;
    const mobility = { warden: 98, furnace: 116, weaver: 108, censor: 132, echo: 146 };
    const desiredSpeed = mobility[kind] * bossCurve.mobility * speedScale * enrage * echoSpeedFactor;
    enemy.shieldMuzzleFlash = Math.max(0, (enemy.shieldMuzzleFlash || 0) - dt);

    if ((enemy.retreatTimer || 0) > 0) {
      enemy.retreatTimer = Math.max(0, enemy.retreatTimer - dt);
      if (enemy.bossAction !== "selfInject") {
        enemy.windup = 0;
        enemy.bossAction = null;
        enemy.bossShotPattern = null;
      }
      enemy.vx = (enemy.retreatDirection || -enemy.facing || -1) * (350 + rank * 24) * bossCurve.mobility;
      if (enemy.grounded && !hasGroundAhead(enemy, Math.sign(enemy.vx), 38)) enemy.vy = -420;
      moveEnemyPhysics(enemy, dt);
      const retreatArena = getBossArenaBounds(enemy, 120);
      enemy.x = clamp(enemy.x, retreatArena.left, retreatArena.right - enemy.w);
      return;
    }

    if (!enemy.halfPhaseTriggered && hpRatio <= 0.5 && enemy.windup <= 0) {
      enemy.halfPhaseTriggered = true;
      if (bossKind === "breaker") {
        startBossChargedShot(enemy, "breaker-laser", dx, 1.58);
        enemy.cooldown = 3.15 * bossCurve.cooldown;
        game.hint = "쇄우 · 반파 노심 개방 · 레이저포 충전";
        game.hintTimer = 2.8;
      } else if (bossKind === "warden") {
        startBossChargedShot(enemy, "warden-core", dx, 2.08);
        enemy.cooldown = 3.5 * bossCurve.cooldown;
        game.hint = "철각 · 부유 노심 후퇴 · 초대형 관통 차지빔 충전";
        game.hintTimer = 3.1;
      } else if (bossKind === "furnace") {
        startBossChargedShot(enemy, "furnace-rain", dx, 1.76);
        enemy.cooldown = 3.45 * bossCurve.cooldown;
        game.hint = "홍련 · 노심 구체 폭발 · 2초간 무작위 낙하 폭탄 전개";
        game.hintTimer = 3.3;
      } else if (bossKind === "oracle") {
        game.controlsReversed = true;
        game.screenFlipFlash = 0.65;
        enemy.controlInversionActive = true;
        enemy.cooldown = 2.4 * bossCurve.cooldown;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ff8cd8", 42, 520, 0.8, 0);
        game.hint = "육화 · 좌우 인식 반전 · 이동 방향이 뒤바뀝니다";
        game.hintTimer = 3.2;
        sound.tone(210, 0.5, "sine", 0.055, 2.2);
      } else if (bossKind === "weaver") {
        enemy.iceStormTimer = 3.6;
        enemy.iceSpawnTimer = 0;
        enemy.iceStormSerial = 0;
        enemy.cooldown = 4.25 * bossCurve.cooldown;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#dff8ff", 52, 580, 0.9, -120);
        game.hint = "백면 · 빙설 대강하 · 쌓인 눈 위에서는 이동 속도 감소";
        game.hintTimer = 3.6;
        sound.tone(620, 0.65, "triangle", 0.05, 0.42);
      } else if (bossKind === "censor") {
        blanketCensorArenaWithSnow(enemy);
        enemy.cooldown = 3.4 * bossCurve.cooldown;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#dff8ff", 54, 620, 1, -150);
        game.hint = "무명 · 2페이즈 백설 봉쇄 · 전장 전체 발판에 눈이 쌓입니다";
        game.hintTimer = 3.8;
        sound.tone(490, 0.7, "triangle", 0.055, 0.38);
      } else if (bossKind === "revenant") {
        enemy.shieldOverdrive = true;
        startBossChargedShot(enemy, "revenant-overdrive", dx, 1.08);
        enemy.cooldown = 2.5 * bossCurve.cooldown;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.4, "#ffd4df", 34, 460, 0.7, 0);
        game.hint = "공문 · 월광검 2페이즈 · 대형 검기와 방패 보조 사격";
        game.hintTimer = 3;
        sound.tone(520, 0.28, "triangle", 0.045, 1.8);
      } else if (bossKind === "proxy") {
        enemy.windup = 1.35 * bossCurve.windup;
        enemy.bossAction = "selfInject";
        enemy.injectionDuration = enemy.windup;
        enemy.cooldown = 3.1 * bossCurve.cooldown;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.35, "#78ff8b", 36, 360, 0.8, 0);
        game.hint = "의사 · 금단 약물 자가 투약 · 변이 반응 시작";
        game.hintTimer = 3.4;
        sound.tone(96, 0.72, "sawtooth", 0.05, 1.9);
      } else if (bossKind === "echo") {
        enemy.adaptivePhase = true;
        enemy.echoAnalysisPulse = 1;
        enemy.cooldown = 0.82 * bossCurve.cooldown;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#b994ff", 40, 540, 0.72, 0);
        game.hint = "잔영-00 · 전투 기록 분석 완료 · 3배 전술 예측 활성";
        game.hintTimer = 3.4;
        sound.tone(720, 0.32, "sine", 0.05, 0.55);
      } else {
        enemy.cooldown = Math.max(enemy.cooldown, 1.4 * bossCurve.cooldown);
      }
    }

    if (bossKind === "oracle" && !enemy.quarterPhaseTriggered && hpRatio <= 0.25 && enemy.windup <= 0) {
      enemy.quarterPhaseTriggered = true;
      game.screenFlipActive = true;
      game.screenFlipFlash = 1;
      enemy.cooldown = Math.max(enemy.cooldown, 2.25 * bossCurve.cooldown);
      spawnParticles(player.x + player.w / 2, player.y + player.h / 2, "#d7a0ff", 48, 620, 0.85, 0);
      game.hint = "육화 · 상하 인식 전복 · 화면이 뒤집혔습니다";
      game.hintTimer = 3.5;
      game.freeze = Math.max(game.freeze, 0.1);
      sound.tone(180, 0.65, "sine", 0.06, 2.6);
    }

    if (bossKind === "hunter") {
      enemy.reflectBreakTimer = Math.max(0, (enemy.reflectBreakTimer || 0) - dt);
      enemy.reflectTimer = enemy.reflectBreakTimer > 0 ? 0 : 1;
    }

    if (bossKind === "oracle") {
      enemy.shotgunSwapCooldown = Math.max(0, (enemy.shotgunSwapCooldown || 0) - dt);
      if ((enemy.pendingShotgunSwapTimer || 0) > 0) {
        const previousSwapTimer = enemy.pendingShotgunSwapTimer;
        enemy.pendingShotgunSwapTimer = Math.max(0, enemy.pendingShotgunSwapTimer - dt);
        if (previousSwapTimer > 0 && enemy.pendingShotgunSwapTimer <= 0) {
          const returnedShotId = enemy.pendingShotId;
          for (let index = bullets.length - 1; index >= 0; index -= 1) {
            const bullet = bullets[index];
            if (!bullet.enemy && bullet.kind === "shotgun" && bullet.shotId === returnedShotId) bullets.splice(index, 1);
          }
          swapBossWithPlayer(enemy, { grantInvincibility: false, shake: 9 });
          player.invincible = 0;
          launchOracleShotgunReturn(enemy, returnedShotId);
          enemy.pendingShotId = null;
          game.hint = "육화 · 위치 교환 완료 · 역상 산탄이 주인공에게 귀환";
          game.hintTimer = 1.5;
        }
      }
      if ((enemy.oracleReturnImpactTimer || 0) > 0) {
        const previousImpactTimer = enemy.oracleReturnImpactTimer;
        enemy.oracleReturnImpactTimer = Math.max(0, enemy.oracleReturnImpactTimer - dt);
        if (previousImpactTimer > 0 && enemy.oracleReturnImpactTimer <= 0) {
          damagePlayer(1, enemy.oracleReturnSourceX || enemy.x + enemy.w / 2);
          spawnParticles(player.x + player.w / 2, player.y + player.h / 2, "#ff8cd8", 20, 380, 0.46, 620);
          game.hint = "육화 · 역상 산탄 적중";
          game.hintTimer = 1.25;
        }
      }
    }

    if (bossKind === "warden") {
      enemy.funnelCooldown = Math.max(0, (enemy.funnelCooldown || 0) - dt);
      const activeFunnels = bullets.filter((bullet) => bullet.kind === "boss-funnel" && bullet.ownerId === enemy.id).length;
      if (enemy.funnelCooldown <= 0 && enemy.windup <= 0 && !enemy.bossAction && distance < 980 && activeFunnels === 0) {
        launchBossFunnels(enemy, hpRatio < 0.5 ? 5 : 4);
        enemy.cooldown = Math.max(enemy.cooldown, 0.82 * bossCurve.cooldown);
        game.hint = "철각 · 육익 판넬 재전개";
        game.hintTimer = 1.45;
      }
    }

    if (bossKind === "weaver" && (enemy.iceStormTimer || 0) > 0) {
      enemy.iceStormTimer = Math.max(0, enemy.iceStormTimer - dt);
      enemy.iceSpawnTimer = (enemy.iceSpawnTimer || 0) - dt;
      while (enemy.iceSpawnTimer <= 0 && enemy.iceStormTimer > 0) {
        spawnIceChunk(enemy);
        enemy.iceSpawnTimer += 0.13 + hash(enemy.iceStormSerial * 4.37) * 0.09;
      }
    }

    if (bossKind === "echo") {
      enemy.echoMimicJumpCooldown = Math.max(0, (enemy.echoMimicJumpCooldown || 0) - dt);
      const analysis = enemy.echoAnalysis || { slash: 0, shotgun: 0, air: 0, rush: 0 };
      const sampleRate = Math.min(1, dt * 4.8);
      analysis.slash = lerp(analysis.slash, player.attackTimer > 0 ? 1 : 0, sampleRate);
      analysis.shotgun = lerp(analysis.shotgun, player.recoilTimer > 0 || player.shotgunCooldown > 0.18 ? 1 : 0, sampleRate);
      analysis.air = lerp(analysis.air, player.grounded ? 0 : 1, sampleRate);
      analysis.rush = lerp(analysis.rush, Math.abs(player.vx) > INPUT_TUNING.moveSpeed * 0.72 ? 1 : 0, sampleRate);
      enemy.echoAnalysis = analysis;
      enemy.echoReadout = Object.entries(analysis).sort((a, b) => b[1] - a[1])[0][0];
      enemy.echoSkillMultiplier = 3;
      if (!player.grounded && player.vy < -150 && enemy.grounded && enemy.echoMimicJumpCooldown <= 0) {
        enemy.vy = -690;
        enemy.vx = Math.sign(dx || 1) * 310;
        enemy.echoMimicJumpCooldown = 0.68;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, "#63ffc6", 12, 270, 0.36, 260);
      }
    }

    if (bossKind === "censor") {
      enemy.barrierTimer = Math.max(0, (enemy.barrierTimer || 0) - dt);
      enemy.barrierCooldown = Math.max(0, (enemy.barrierCooldown || 0) - dt);
      if (enemy.barrierCooldown <= 0 && enemy.barrierTimer <= 0 && distance < 900) {
        enemy.barrierTimer = hpRatio < 0.5 ? 1.35 : 1.05;
        enemy.barrierCooldown = hpRatio < 0.5 ? 4.6 : 5.6;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#b56cff", 30, 390, 0.7, 0);
        game.hint = "무명 · 공허 장막 · 잠시 모든 공격 무효";
        game.hintTimer = 1.7;
        sound.tone(185, 0.38, "sine", 0.04, 1.9);
      }
      enemy.summonCooldown = Math.max(0, (enemy.summonCooldown || 0) - dt);
      const livingSummons = enemies.filter((candidate) => candidate.alive && candidate.summonedByBossId === enemy.id).length;
      if (enemy.summonCooldown <= 0 && distance < 1050 && livingSummons < 4) {
        const summonPool = ["runner", "gunner", "machinegun", "turret", "mortarTurret", "piercer", "drone", "shield", "mortar"];
        const summonType = summonPool[Math.floor(hash(enemy.anim * 17.7 + enemy.summonCount * 9.3) * summonPool.length)];
        const summonDirection = enemy.summonCount % 2 ? -1 : 1;
        const summonArena = getBossArenaBounds(enemy, 180);
        const summonX = clamp(enemy.x + summonDirection * (180 + (enemy.summonCount % 3) * 65), summonArena.left, summonArena.right);
        const floorY = enemy.baseY + enemy.h;
        const summon = addEnemy(summonType, summonX, summonType === "drone" ? floorY - 210 : floorY, 260);
        enemy.summonCount += 1;
        summon.id = `censor-summon:${enemy.id}:${enemy.summonCount}`;
        summon.summonedByBossId = enemy.id;
        summon.stageIndex = rank;
        summon.homeZoneIndex = enemy.homeZoneIndex;
        summon.originX = summon.x;
        summon.spawnX = summon.x;
        summon.spawnY = summon.y;
        summon.baseY = summon.y;
        enemy.summonCooldown = hpRatio < 0.5 ? 6.4 : 8.2;
        spawnParticles(summon.x + summon.w / 2, summon.y + summon.h / 2, "#8b4dff", 28, 410, 0.7, 160);
        game.hint = `무명 · 금서 소환 · ${summonType.toUpperCase()}`;
        game.hintTimer = 2.2;
      }
    }

    const chargingShot = enemy.bossAction === "chargeShot" && enemy.windup > 0;
    const approachAction = ["shieldRush", "mutantApproach", "mutantLeap", "mutantSmash", "echoDash"].includes(enemy.bossAction) && enemy.windup > 0;
    if (chargingShot) {
      const beamRetreatBoost = bossKind === "warden" && enemy.bossShotPattern === "warden-core"
        ? 2.25
        : bossKind === "breaker" && enemy.bossShotPattern === "breaker-laser"
          ? 1.65
          : 1;
      const retreatSpeed = (165 + rank * 24) * speedScale * echoSpeedFactor * beamRetreatBoost;
      enemy.vx = moveToward(enemy.vx, enemy.bossChargeDirection * retreatSpeed, 560 * dt);
    } else if (approachAction) {
      const approachSpeed = bossKind === "proxy" ? 430 : bossKind === "echo" ? 610 : 510;
      const stopRange = bossKind === "proxy" ? 105 : 88;
      enemy.vx = Math.abs(dx) > stopRange
        ? moveToward(enemy.vx, Math.sign(dx || enemy.dashDirection || 1) * approachSpeed * bossCurve.mobility, 1050 * dt)
        : moveToward(enemy.vx, 0, 980 * dt);
    } else if (distance < 760 && Math.abs(dx) > 115) {
      enemy.vx = moveToward(enemy.vx, Math.sign(dx) * desiredSpeed, 360 * dt);
    } else {
      enemy.vx = moveToward(enemy.vx, 0, 500 * dt);
    }
    const homeArena = getBossArenaBounds(enemy, 120);
    const arenaLeft = Math.max(homeArena.left, enemy.originX - 920);
    const arenaRight = Math.min(homeArena.right, enemy.originX + 820);
    if (kind === "weaver" && !chargingShot) {
      const hoverTarget = enemy.baseY - 185 + Math.sin(enemy.anim * 1.75) * 72;
      const hoverVelocity = clamp((hoverTarget - enemy.y) * 3.1, -330, 330);
      enemy.vy = moveToward(enemy.vy, hoverVelocity, 920 * dt);
    }
    const moveDirection = Math.sign(enemy.vx);
    enemy.bossJumpCooldown = Math.max(0, (enemy.bossJumpCooldown || 0) - dt);
    if (kind !== "weaver" && enemy.grounded && moveDirection !== 0 && !hasGroundAhead(enemy, moveDirection)) {
      if (enemy.bossJumpCooldown <= 0 && Math.sign(dx) === moveDirection && Math.abs(dx) > 150) {
        enemy.vy = -620 - rank * 25;
        enemy.vx = moveDirection * (260 + rank * 25);
        enemy.bossJumpCooldown = 1.1;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, palette.red, 12, 240, 0.4, 420);
      } else {
        enemy.vx = 0;
      }
    }
    moveEnemyPhysics(enemy, dt);
    if (kind === "weaver" && enemy.y < enemy.baseY - 24) enemy.grounded = false;
    if (enemy.x < arenaLeft) {
      enemy.x = arenaLeft;
      enemy.vx = Math.max(0, enemy.vx);
    }
    if (enemy.x + enemy.w > arenaRight) {
      enemy.x = arenaRight - enemy.w;
      enemy.vx = Math.min(0, enemy.vx);
    }
    if (enemy.y > enemy.baseY + enemy.h + 260) {
      recoverEnemyToHome(enemy);
      return;
    }

    if (enemy.cooldown <= 0 && distance < 900) {
      const phaseCount = definition.patterns.length;
      enemy.bossPhase = (enemy.bossPhase + 1) % phaseCount;
      const recovery = hpRatio < 0.45 ? (kind === "echo" ? 1.05 : 0.82) : 1;

      if (bossKind === "breaker") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "warden-volley", dx, 0.76);
          enemy.cooldown = 2.05 * recovery;
        } else if (enemy.bossPhase === 1) {
          enemy.windup = 0.68;
          enemy.bossAction = "dash";
          enemy.cooldown = 2.2 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "warden-air", dx, 0.66);
          enemy.cooldown = 2.15 * recovery;
        } else {
          startBossChargedShot(enemy, "warden-suppress", dx, 0.86);
          enemy.cooldown = 2.35 * recovery;
        }
      } else if (bossKind === "hunter") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "hunter-shotgun", dx, 0.52);
          enemy.cooldown = 1.7 * recovery;
        } else if (enemy.bossPhase === 1) {
          enemy.windup = 0.44;
          enemy.bossAction = "reflectRush";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = HUNTER_DASH_RANGE;
          enemy.cooldown = 1.55 * recovery;
        } else if (enemy.bossPhase === 2) {
          enemy.windup = 0.34;
          enemy.bossAction = "mirrorStep";
          enemy.cooldown = 1.45 * recovery;
        } else if (enemy.bossPhase === 3) {
          startBossChargedShot(enemy, "hunter-rifle", dx, 0.46);
          enemy.cooldown = 1.55 * recovery;
        } else {
          enemy.windup = 0.48;
          enemy.bossAction = "reflectRush";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = HUNTER_DASH_RANGE;
          enemy.cooldown = 1.6 * recovery;
        }
      } else if (bossKind === "oracle") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "oracle-burst", dx, 0.54);
          enemy.cooldown = 1.55 * recovery;
        } else if (enemy.bossPhase === 1) {
          startBossChargedShot(enemy, "oracle-cross", dx, 0.7);
          enemy.cooldown = 1.85 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "oracle-needle", dx, 0.62);
          enemy.cooldown = 1.7 * recovery;
        } else {
          startBossChargedShot(enemy, "oracle-ring", dx, 0.82);
          enemy.cooldown = 2.15 * recovery;
        }
      } else if (bossKind === "revenant") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "revenant-sword-wave", dx, 0.56);
          enemy.cooldown = 1.65 * recovery;
        } else if (enemy.bossPhase === 1) {
          enemy.windup = 0.62;
          enemy.bossAction = "shieldRush";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = 560;
          enemy.cooldown = 1.9 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "revenant-triple-wave", dx, 0.74);
          enemy.cooldown = 2.05 * recovery;
        } else if (enemy.bossPhase === 3) {
          startBossChargedShot(enemy, "revenant-shield-burst", dx, 0.68);
          enemy.cooldown = 2.15 * recovery;
        } else {
          startBossChargedShot(enemy, "revenant-cross-wave", dx, 0.88);
          enemy.cooldown = 2.15 * recovery;
        }
      } else if (bossKind === "proxy") {
        if (enemy.mutated) {
          if (enemy.bossPhase === 0 || enemy.bossPhase === 3) {
            enemy.windup = 0.58;
            enemy.bossAction = "mutantApproach";
            enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
            enemy.dashRange = Math.min(760, Math.max(260, Math.abs(dx) - 76));
            enemy.comboHitsRemaining = enemy.bossPhase === 3 ? 5 : 3;
            enemy.comboHitTimer = 0;
            enemy.cooldown = 1.85 * recovery;
          } else if (enemy.bossPhase === 1) {
            enemy.windup = 0.72;
            enemy.bossAction = "mutantLeap";
            enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
            enemy.dashRange = 680;
            enemy.cooldown = 2.05 * recovery;
          } else {
            enemy.windup = 0.76;
            enemy.bossAction = "mutantDebris";
            enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
            enemy.dashRange = 360;
            enemy.cooldown = 2.25 * recovery;
          }
        } else if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "proxy-potion", dx, 0.72);
          enemy.cooldown = 1.9 * recovery;
        } else if (enemy.bossPhase === 1) {
          startBossChargedShot(enemy, "proxy-toxic-ring", dx, 0.98);
          enemy.cooldown = 2.55 * recovery;
        } else if (enemy.bossPhase === 2) {
          enemy.windup = 0.52;
          enemy.bossAction = "madDash";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = 520;
          enemy.cooldown = 1.75 * recovery;
        } else if (enemy.bossPhase === 3) {
          startBossChargedShot(enemy, "proxy-flask-rain", dx, 1.08);
          enemy.cooldown = 2.75 * recovery;
        } else {
          startBossChargedShot(enemy, "proxy-potion", dx, 0.58);
          enemy.cooldown = 1.6 * recovery;
        }
      } else if (kind === "warden") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "warden-funnels", dx, 0.72);
          enemy.cooldown = 2.05 * recovery * WARDEN_ATTACK_RECOVERY_SCALE;
        } else if (enemy.bossPhase === 1 || enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "warden-volley", dx, 0.68);
          enemy.cooldown = 1.9 * recovery * WARDEN_ATTACK_RECOVERY_SCALE;
        } else if (enemy.bossPhase === 3) {
          enemy.windup = 0.72;
          enemy.bossAction = "dash";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = 580;
          enemy.cooldown = 2.1 * recovery * WARDEN_ATTACK_RECOVERY_SCALE;
        } else if (enemy.bossPhase === 4) {
          startBossChargedShot(enemy, "warden-air", dx, 0.58);
          enemy.cooldown = 2 * recovery * WARDEN_ATTACK_RECOVERY_SCALE;
        } else {
          startBossChargedShot(enemy, "warden-suppress", dx, 0.76);
          enemy.cooldown = 2.15 * recovery * WARDEN_ATTACK_RECOVERY_SCALE;
        }
      } else if (kind === "furnace") {
        if (enemy.bossPhase === 0) {
          if (enemy.grounded) {
            enemy.vy = -1080;
            enemy.vx = -Math.sign(dx || 1) * 160;
          }
          startBossChargedShot(enemy, "furnace-mortar", dx, 0.94);
          enemy.cooldown = 2.35 * recovery;
        } else if (enemy.bossPhase === 1) {
          startBossChargedShot(enemy, "furnace-rifle", dx, 0.44);
          enemy.cooldown = 1.22 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "furnace-volley", dx, 0.82);
          enemy.cooldown = 1.85 * recovery;
        } else if (enemy.bossPhase === 3) {
          enemy.windup = 0.82;
          enemy.bossAction = "slam";
          enemy.cooldown = 2.45 * recovery;
        } else {
          startBossChargedShot(enemy, "furnace-eruption", dx, 1.08);
          enemy.cooldown = 2.7 * recovery;
        }
      } else if (kind === "weaver") {
        if (enemy.bossPhase === 0) {
          const teleportX = clamp(player.x + (dx > 0 ? -420 : 420), arenaLeft + 80, arenaRight - 80);
          summonMagicSigil(enemy, "teleport", teleportX, enemy.baseY - 205, 0.68);
          enemy.cooldown = 1.85 * recovery;
        } else if (enemy.bossPhase === 1) {
          startBossChargedShot(enemy, "weaver-fan", dx, 0.86);
          enemy.cooldown = 1.95 * recovery;
        } else if (enemy.bossPhase === 2) {
          const teleportX = clamp(player.x - Math.sign(dx || 1) * 310, arenaLeft + 80, arenaRight - 80);
          summonMagicSigil(enemy, "teleport", teleportX, enemy.baseY - 285, 0.54);
          enemy.cooldown = 1.75 * recovery;
        } else {
          startBossChargedShot(enemy, "weaver-orbit", dx, 1.02);
          enemy.cooldown = 2.5 * recovery;
        }
      } else if (kind === "censor") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "censor-volley", dx, 0.72);
          enemy.cooldown = 1.15 * recovery;
        } else if (enemy.bossPhase === 1) {
          enemy.windup = 0.55;
          enemy.bossAction = "dash";
          enemy.cooldown = 1.35 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "censor-mortar", dx, 0.98);
          enemy.cooldown = 1.55 * recovery;
        } else if (enemy.bossPhase === 3) {
          startBossChargedShot(enemy, "censor-air", dx, 0.66);
          enemy.cooldown = 1.45 * recovery;
        } else {
          startBossChargedShot(enemy, "censor-grid", dx, 1.12);
          enemy.cooldown = 1.85 * recovery;
        }
      } else {
        const serial = enemy.echoDecisionSerial || 0;
        enemy.echoDecisionSerial = serial + 1;
        const analysis = enemy.echoAnalysis || { slash: 0, shotgun: 0, air: 0, rush: 0 };
        const adaptiveChoice = enemy.adaptivePhase && serial % 3 === 0
          ? Object.entries(analysis).sort((a, b) => b[1] - a[1])[0][0]
          : null;
        const phase = serial % 7;
        if ((adaptiveChoice === "rush" || adaptiveChoice === "air") || phase === 0 || phase === 4) {
          enemy.windup = 0.4;
          enemy.bossAction = "echoDash";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = Math.min(820, Math.max(260, Math.abs(dx) + 90));
          enemy.cooldown = 1.28 * recovery;
        } else if (adaptiveChoice === "shotgun" || phase === 2) {
          startBossChargedShot(enemy, "echo-shotgun", dx, 0.46);
          enemy.cooldown = 1.42 * recovery;
        } else if (phase === 1 || phase === 5) {
          startBossChargedShot(enemy, "echo-shotgun", dx, 0.48);
          enemy.cooldown = 1.38 * recovery;
        } else if (phase === 3) {
          enemy.windup = 0.42;
          enemy.bossAction = "echoSlash";
          enemy.dashDirection = Math.sign(dx || enemy.facing || 1);
          enemy.dashRange = 590;
          if (enemy.grounded) enemy.vy = -360;
          enemy.cooldown = 1.36 * recovery;
        } else {
          startBossChargedShot(enemy, "echo-burst", dx, 0.82);
          enemy.cooldown = 1.75 * recovery;
        }
      }
      enemy.cooldown = Math.max(0.48, enemy.cooldown * bossCurve.cooldown);
      if (enemy.windup > 0 && enemy.bossAction !== "chargeShot") enemy.windup *= bossCurve.windup;
    }

    if (enemy.bossAction === "mutantCombo" && enemy.comboHitsRemaining > 0) {
      enemy.comboHitTimer -= dt;
      if (enemy.comboHitTimer <= 0) {
        const finisher = enemy.comboHitsRemaining === 1;
        enemy.facing = Math.sign(dx || enemy.facing || 1);
        enemy.vx = enemy.facing * (finisher ? 690 : 360);
        if (Math.abs(dx) < (finisher ? 210 : 165) && Math.abs(player.y - enemy.y) < 125) damagePlayer(finisher ? 2 : 1, enemy.x);
        const fistX = enemy.x + enemy.w / 2 + enemy.facing * 48;
        const fistY = enemy.y + enemy.h * 0.48;
        spawnParticles(fistX, fistY, finisher ? "#d7ff6f" : "#78ff8b", finisher ? 30 : 16, finisher ? 580 : 370, 0.42, 100);
        game.shake = Math.max(game.shake, finisher ? 16 : 8);
        sound.tone(finisher ? 70 : 110, finisher ? 0.24 : 0.12, "sawtooth", 0.045, 0.5);
        enemy.comboHitsRemaining -= 1;
        enemy.comboHitTimer = finisher ? 0.36 : 0.17;
        if (enemy.comboHitsRemaining <= 0) {
          enemy.bossAction = null;
          enemy.vx *= 0.3;
        }
      }
    }

    if (enemy.windup > 0) {
      const previous = enemy.windup;
      enemy.windup -= dt;
      if (previous > 0.1 && enemy.windup <= 0.1) {
        if (enemy.bossAction === "slam") {
          enemy.vy = -760;
          enemy.vx = Math.sign(dx) * 300;
          if (kind === "furnace") {
            [-280, -90, 90, 280].forEach((offset) => fireMortar(enemy, player.x + player.w / 2 + offset));
          } else {
            for (let i = -2; i <= 2; i += 1) fireBullet(enemy, 310, i * 0.18);
          }
        } else if (enemy.bossAction === "dash") {
          enemy.vx = Math.sign(dx) * (420 + rank * 65);
          if (Math.abs(dx) < 165 && Math.abs(player.y - enemy.y) < 100) damagePlayer(rank >= 3 ? 2 : 1, enemy.x);
          if (kind === "censor") {
            [-0.2, -0.1, 0, 0.1, 0.2].forEach((spread) => fireBullet(enemy, 420, spread, "phase"));
            [-190, 190].forEach((offset) => fireMortar(enemy, player.x + player.w / 2 + offset));
          }
        } else if (enemy.bossAction === "echoSlash") {
          enemy.vx = Math.sign(dx) * 620;
          enemy.vy = player.y + player.h < enemy.y ? -330 : enemy.vy;
          if (Math.abs(dx) < 175 && Math.abs(player.y - enemy.y) < 105) damagePlayer(1, enemy.x);
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, "#d6b7ff", 18, 450, 0.38, 0);
        } else if (enemy.bossAction === "echoCounter") {
          enemy.vx = Math.sign(dx) * 690;
          if (Math.abs(dx) < 190 && Math.abs(player.y - enemy.y) < 115) damagePlayer(1, enemy.x);
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.45, "#63ffc6", 20, 480, 0.4, 0);
        } else if (enemy.bossAction === "positionSwap") {
          swapBossWithPlayer(enemy);
        } else if (enemy.bossAction === "reflectRush") {
          enemy.vx = (enemy.dashDirection || Math.sign(dx || 1)) * 690;
          if (Math.abs(dx) < 150 && Math.abs(player.y - enemy.y) < 92) damagePlayer(1, enemy.x);
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.46, "#a6f7ff", 18, 420, 0.4, 0);
        } else if (enemy.bossAction === "mirrorStep") {
          enemy.vx = -Math.sign(dx || 1) * 560;
          enemy.vy = enemy.grounded ? -420 : enemy.vy;
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#6fddeb", 16, 330, 0.38, 0);
        } else if (enemy.bossAction === "shieldRush") {
          enemy.vx = (enemy.dashDirection || Math.sign(dx || 1)) * 660;
          if (Math.abs(dx) < 185 && Math.abs(player.y - enemy.y) < 110) damagePlayer(1, enemy.x);
          fireRevenantShieldBurst(enemy, { x: player.x + player.w / 2, y: player.y + player.h / 2 }, enemy.shieldOverdrive ? 5 : 3, 0.085, 520);
          enemy.bossAction = null;
        } else if (enemy.bossAction === "madDash") {
          enemy.vx = Math.sign(dx || 1) * 500;
          throwPotion(enemy, player.x + player.w / 2, 1, -110);
          throwPotion(enemy, player.x + player.w / 2, 0, 110);
        } else if (enemy.bossAction === "selfInject") {
          enemy.mutated = true;
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.25);
          enemy.bossAction = null;
          enemy.vx = 0;
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.42, "#78ff8b", 58, 640, 1, -80);
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.6, "#d7ff6f", 34, 460, 0.8, 160);
          game.flash = Math.max(game.flash, 0.26);
          game.freeze = Math.max(game.freeze, 0.08);
          sound.tone(62, 0.62, "sawtooth", 0.07, 0.34);
        } else if (enemy.bossAction === "mutantDebris") {
          enemy.vx = 0;
          throwMutantDebris(enemy);
          enemy.bossAction = null;
        } else if (enemy.bossAction === "mutantApproach") {
          enemy.bossAction = "mutantCombo";
          enemy.comboHitTimer = 0;
          enemy.vx = Math.sign(dx || enemy.dashDirection || 1) * 380;
        } else if (enemy.bossAction === "mutantLeap") {
          enemy.vx = Math.sign(dx || enemy.dashDirection || 1) * 650;
          enemy.vy = -640;
          if (Math.abs(dx) < 190 && Math.abs(player.y - enemy.y) < 135) damagePlayer(2, enemy.x);
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, "#78ff8b", 32, 560, 0.6, 260);
          enemy.bossAction = null;
        } else if (enemy.bossAction === "mutantSmash") {
          enemy.vx = Math.sign(dx || enemy.dashDirection || 1) * 260;
          if (Math.abs(dx) < 220 && Math.abs(player.y - enemy.y) < 150) damagePlayer(2, enemy.x);
          [-1, 1].forEach((side) => firePointBullet(enemy.x + enemy.w / 2, enemy.y + enemy.h - 14, { x: enemy.x + side * 620, y: enemy.y + enemy.h - 14 }, 480, 0, "mutant-shockwave", "#78ff8b"));
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, "#d7ff6f", 42, 620, 0.7, 220);
          enemy.bossAction = null;
        } else if (enemy.bossAction === "echoDash") {
          enemy.vx = Math.sign(dx || enemy.dashDirection || 1) * 880;
          enemy.vy = player.y + player.h < enemy.y && enemy.grounded ? -390 : enemy.vy;
          if (Math.abs(dx) < 205 && Math.abs(player.y - enemy.y) < 118) damagePlayer(1, enemy.x);
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.48, "#63ffc6", 26, 620, 0.42, 0);
          enemy.bossAction = null;
        } else if (enemy.bossAction === "chargeShot") {
          releaseBossChargedShot(enemy);
        }
        game.shake = Math.max(game.shake, 10 + rank * 2);
      }
    }

    if (Math.abs(dx) < 68 && Math.abs(player.y - enemy.y) < 86) damagePlayer(1, enemy.x);
  }

  function updateCombatRooms() {
    if (game.adminMode) return;
    for (const room of combatRooms) {
      const nearRoom = player.x > room.left - 180 && player.x < room.right + 180;
      if (!nearRoom) continue;
      room.anchorAlive = enemies.some((enemy) => (
        enemy.alive
        && enemy.type === room.formationAnchorType
        && enemy.originX > room.left
        && enemy.originX < room.right
      ));
      if (!room.triggered && player.x > room.left + 90 && player.x < room.right) {
        room.triggered = true;
        room.terrainTimer = 0;
        room.terrainStep = 0;
        game.arenaTitle = 3.2;
        game.hint = `${room.formationName} · ${room.formationTarget} 우선 격파 · ${room.terrainName} 가동`;
        game.hintTimer = 3.2;
        sound.tone(118, 0.32, "sawtooth", 0.045, 0.7);
      }
      if (!room.triggered || room.cleared) continue;

      const remaining = enemies.filter((enemy) => enemy.alive && enemy.originX > room.left && enemy.originX < room.right).length;
      room.remaining = remaining;
      if (remaining === 0) {
        room.cleared = true;
        player.hp = Math.min(player.maxHp, player.hp + 1);
        player.burstCooldown = 0;
        game.hint = `${room.name} 해제 · 체력 회복 · 버스트 재충전`;
        game.hintTimer = 4;
        game.shake = 14;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 28, 400, 0.7, 500);
        sound.checkpoint();
        saveCampaign();
        continue;
      }

      const insideSealRange = player.x > room.left - 70 && player.x < room.right + 70;
      if (insideSealRange) {
        if (player.x < room.left + 24) {
          player.x = room.left + 24;
          player.vx = Math.max(0, player.vx);
        }
        if (player.x + player.w > room.right - 24) {
          player.x = room.right - player.w - 24;
          player.vx = Math.min(0, player.vx);
        }
      }
    }
  }

  function explodeMortar(bullet) {
    const centerX = bullet.x + bullet.w / 2;
    const centerY = bullet.y + bullet.h / 2;
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    if (Math.hypot(playerCenterX - centerX, playerCenterY - centerY) < 105) damagePlayer(1, centerX);
    game.shake = Math.max(game.shake, 13);
    spawnParticles(centerX, centerY, palette.red, 18, 360, 0.55, 720);
    spawnParticles(centerX, centerY, palette.amber, 10, 250, 0.4, 520);
    sound.tone(72, 0.22, "sawtooth", 0.045, 0.42);
  }

  function updateBullets(dt, activeEnemies = getActiveEnemies()) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];

      if (bullet.kind === "boss-funnel") {
        bullet.life -= dt;
        const owner = enemies.find((candidate) => candidate.alive && candidate.id === bullet.ownerId);
        if (!owner || bullet.life <= 0) {
          spawnParticles(bullet.x + bullet.w / 2, bullet.y + bullet.h / 2, bullet.color, 7, 170, 0.3, 0);
          bullets.splice(i, 1);
          continue;
        }
        const column = Math.floor(bullet.orbitIndex / 3);
        const row = bullet.orbitIndex % 3;
        const side = bullet.formationSide || -1;
        const formationBob = Math.sin(game.time * 2.1 + bullet.orbitIndex * 0.7) * 18;
        const targetX = player.x + player.w / 2 + side * (480 + column * 82);
        const targetY = player.y + player.h / 2 - 150 + row * 118 + formationBob;
        const follow = 1 - Math.pow(0.006, dt);
        bullet.x = lerp(bullet.x, targetX - bullet.w / 2, follow);
        bullet.y = lerp(bullet.y, targetY - bullet.h / 2, follow);
        bullet.shotTimer -= dt;
        if (bullet.shotTimer <= 0 && bullet.shotsLeft > 0) {
          firePointBullet(
            bullet.x + bullet.w / 2,
            bullet.y + bullet.h / 2,
            { x: player.x + player.w / 2, y: player.y + player.h / 2 },
            415,
            0,
            "funnel-shot",
            "#ff496c",
          );
          bullet.shotsLeft -= 1;
          bullet.shotTimer = WARDEN_PANEL_SHOT_INTERVAL + bullet.orbitIndex * 0.016;
        }
        continue;
      }

      if (bullet.kind === "poison-gas") {
        bullet.life -= dt;
        bullet.damageTimer -= dt;
        bullet.particleTimer -= dt;
        if (bullet.particleTimer <= 0) {
          bullet.particleTimer = 0.16;
          const px = bullet.x + hash(game.time * 41 + i) * bullet.w;
          const py = bullet.y + hash(game.time * 67 + i) * bullet.h;
          spawnParticles(px, py, bullet.color, 2, 55, 0.5, -35);
        }
        if (bullet.damageTimer <= 0 && overlaps(bullet, player)) {
          damagePlayer(1, bullet.x + bullet.w / 2);
          bullet.damageTimer = 0.78;
        }
        if (bullet.life <= 0) bullets.splice(i, 1);
        continue;
      }

      if (bullet.kind === "rain-controller") {
        bullet.life -= dt;
        bullet.spawnTimer -= dt;
        while (bullet.spawnTimer <= 0 && bullet.life > 0) {
          spawnRainBomb(bullet);
          bullet.spawnTimer += 0.1 + hash(bullet.spawnSerial * 13.7 + game.time) * 0.1;
        }
        if (bullet.life <= 0) bullets.splice(i, 1);
        continue;
      }

      if (bullet.kind === "rain-core-burst") {
        bullet.life -= dt;
        if (bullet.life <= 0) bullets.splice(i, 1);
        continue;
      }

      if (bullet.kind === "warden-beam") {
        bullet.life -= dt;
        if (!bullet.hitPlayer) {
          const playerCenterX = player.x + player.w / 2;
          const playerCenterY = player.y + player.h / 2;
          const relativeX = playerCenterX - bullet.x;
          const relativeY = playerCenterY - bullet.y;
          const projection = clamp(relativeX * bullet.beamDX + relativeY * bullet.beamDY, 0, bullet.beamLength);
          const closestX = bullet.x + bullet.beamDX * projection;
          const closestY = bullet.y + bullet.beamDY * projection;
          if (Math.hypot(playerCenterX - closestX, playerCenterY - closestY) <= bullet.beamThickness * 0.5) {
            bullet.hitPlayer = true;
            damagePlayer(bullet.damage || 2, bullet.x);
          }
        }
        if (bullet.life <= 0) bullets.splice(i, 1);
        continue;
      }

      if (bullet.kind === "magic-sigil") {
        bullet.life -= dt;
        bullet.triggerTimer -= dt;
        if (!bullet.triggered && bullet.triggerTimer <= 0) {
          bullet.triggered = true;
          triggerMagicSigil(bullet);
        }
        if (bullet.life <= 0) bullets.splice(i, 1);
        continue;
      }

      if (bullet.kind === "homing-missile") {
        const centerX = bullet.x + bullet.w / 2;
        const centerY = bullet.y + bullet.h / 2;
        const currentAngle = Math.atan2(bullet.vy, bullet.vx);
        const desiredAngle = Math.atan2(player.y + player.h / 2 - centerY, player.x + player.w / 2 - centerX);
        let angleDelta = desiredAngle - currentAngle;
        while (angleDelta > Math.PI) angleDelta -= TAU;
        while (angleDelta < -Math.PI) angleDelta += TAU;
        const nextAngle = currentAngle + clamp(angleDelta, -bullet.turnRate * dt, bullet.turnRate * dt);
        bullet.vx = Math.cos(nextAngle) * bullet.speed;
        bullet.vy = Math.sin(nextAngle) * bullet.speed;
        bullet.satelliteTimer -= dt;
        if (bullet.satelliteTimer <= 0) {
          spawnMissileSatelliteShots(bullet);
          bullet.satelliteTimer += 0.38;
        }
      }

      if (bullet.kind === "mortar" && Number.isFinite(bullet.impactTimer)) {
        bullet.impactTimer -= dt;
        if (bullet.impactTimer <= 0) {
          bullet.x = bullet.lockedImpactX - bullet.w / 2;
          bullet.y = bullet.lockedImpactY - bullet.h / 2;
          explodeMortar(bullet);
          bullets.splice(i, 1);
          continue;
        }
      }

      bullet.life -= dt;
      let remove = bullet.life <= 0;
      let exploded = false;
      if (remove && bullet.kind === "rain-core") {
        explodeRainCore(bullet);
        exploded = true;
      } else if (remove && bullet.kind === "potion") {
        explodePotion(bullet);
        exploded = true;
      } else if (remove && bullet.kind === "ice-chunk") {
        shatterIceChunk(bullet, bullet.y + bullet.h);
        exploded = true;
      }
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bullet.vx * dt), Math.abs(bullet.vy * dt)) / 6));
      const stepTime = dt / steps;
      const nearbyBulletPlatforms = bullet.piercePlatforms
        ? []
        : getNearbyPlatforms(bullet, 110 + Math.max(Math.abs(bullet.vx * dt), Math.abs(bullet.vy * dt)));

      for (let step = 0; step < steps && !remove; step += 1) {
        bullet.x += bullet.vx * stepTime;
        bullet.y += bullet.vy * stepTime;
        bullet.vy += (bullet.gravity || 0) * stepTime;

        const lockedMortarInFlight = bullet.kind === "mortar" && Number.isFinite(bullet.impactTimer);
        if (bullet.enemy && !bullet.harmless && !lockedMortarInFlight && overlaps(bullet, player)) {
          if (bullet.kind === "mortar") {
            explodeMortar(bullet);
            exploded = true;
          } else if (bullet.kind === "fireball") {
            explodeFireball(bullet);
            exploded = true;
          } else if (bullet.kind === "potion") {
            explodePotion(bullet);
            exploded = true;
          } else if (bullet.kind === "ice-chunk") {
            damagePlayer(bullet.damage || 1, bullet.x);
            shatterIceChunk(bullet, player.y + player.h);
            exploded = true;
          } else {
            damagePlayer(bullet.damage || 1, bullet.x);
          }
          remove = true;
          break;
        }

        if (!bullet.enemy) {
          for (const enemy of activeEnemies) {
            if (!enemy.alive || !overlaps(bullet, enemy)) continue;
            damageEnemyWithShotgun(enemy, bullet);
            if (!bullet.piercing) remove = true;
            if (remove) break;
          }
        }

        if (remove) break;
        for (const platform of nearbyBulletPlatforms) {
          if (platform.hidden) continue;
          if (bullet.piercePlatforms) continue;
          if (lockedMortarInFlight) continue;
          if (overlaps(bullet, platform)) {
            if (bullet.kind === "mortar") {
              explodeMortar(bullet);
              exploded = true;
            } else if (bullet.kind === "rain-core") {
              explodeRainCore(bullet);
              exploded = true;
            } else if (bullet.kind === "fireball") {
              explodeFireball(bullet);
              exploded = true;
            } else if (bullet.kind === "potion") {
              explodePotion(bullet);
              exploded = true;
            } else if (bullet.kind === "ice-chunk") {
              shatterIceChunk(bullet, platform.y);
              exploded = true;
            }
            remove = true;
            break;
          }
        }
      }

      if (remove) {
        if (!exploded) spawnParticles(bullet.x, bullet.y, bullet.color, 4, 100, 0.2, 0);
        bullets.splice(i, 1);
      }
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += particle.gravity * dt;
      particle.life -= dt;
      if (particle.life <= 0) particles.splice(i, 1);
    }
  }

  function updateCamera(dt) {
    camera.lookX = lerp(camera.lookX, player.vx * 0.38, 1 - Math.pow(0.00008, dt));
    const targetX = clamp(player.x + player.w / 2 - W * 0.42 + camera.lookX, 0, WORLD_W - W);
    const targetY = clamp(player.y + player.h / 2 - H * 0.58, 0, WORLD_H - H);
    camera.x = lerp(camera.x, targetX, 1 - Math.pow(0.00008, dt));
    camera.y = lerp(camera.y, targetY, 1 - Math.pow(0.0007, dt));
  }

  function cullEnemiesOutsideVerticalView(dt = 0) {
    enemyWorldCullAccumulator += dt;
    if (enemyWorldCullAccumulator < 0.5) return;
    enemyWorldCullAccumulator = 0;
    // 카메라 화면을 벗어난 것만으로 맵에 원래 배치된 적을 제거하지 않는다.
    // 실제 월드 처치 경계를 벗어난 경우에만 사망/복귀 처리한다.
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (!Number.isFinite(enemy.x) || !Number.isFinite(enemy.y) || enemy.y < -enemy.h - 260) {
        recoverEnemyToHome(enemy);
        continue;
      }
      if (enemy.y <= WORLD_H + 100) continue;
      if (enemy.type === "boss") recoverEnemyToHome(enemy);
      else killEnemy(enemy, { silent: true, countKill: false });
    }
  }

  function update(dt) {
    game.time += dt;
    for (const drop of rain) {
      drop.x -= drop.speed * 0.22 * dt;
      drop.y += drop.speed * dt;
      if (drop.y > H + 30) {
        drop.y = -30;
        drop.x = hash(game.time * 30 + drop.speed) * (W + 200);
      }
      if (drop.x < -40) drop.x = W + 40;
    }

    if (game.mode !== "playing") return;
    if (game.tutorialOpen || adminSpawnPanel?.hidden === false || adminZonePanel?.hidden === false) {
      game.shake = 0;
      game.flash = Math.max(0, game.flash - dt);
      game.screenFlipFlash = Math.max(0, game.screenFlipFlash - dt * 2.4);
      pressed.clear();
      return;
    }
    game.shake = Math.max(0, game.shake - (game.cutscene || game.story ? 140 : 46) * dt);
    game.flash = Math.max(0, game.flash - dt);
    game.screenFlipFlash = Math.max(0, game.screenFlipFlash - dt * 2.4);
    if (game.cutscene) {
      updateCutscene(dt);
      updateParticles(dt * 0.2);
      return;
    }
    if (game.freeze > 0) {
      game.freeze -= dt;
      updateParticles(dt * 0.18);
      return;
    }

    game.runTime += dt;
    game.stageTitle = Math.max(0, game.stageTitle - dt);
    game.zoneTitle = Math.max(0, game.zoneTitle - dt);
    game.arenaTitle = Math.max(0, game.arenaTitle - dt);
    game.hintTimer = Math.max(0, game.hintTimer - dt);
    game.stageAbilityNoticeTimer = Math.max(0, (game.stageAbilityNoticeTimer || 0) - dt);
    updateStory(dt);
    if (!game.burstUnlocked && player.x > 5200) {
      game.burstUnlocked = true;
      game.hint = "버스트 해제 · E로 주변 탄환 소거";
      game.hintTimer = 5;
      sound.checkpoint();
    }

    for (const hazard of hazards) {
      if (hazard.hidden) continue;
      if (hazard.kind === "laser") {
        const pulse = (game.time + hazard.phase) % 2.8;
        hazard.active = pulse < 1.45;
      } else if (hazard.kind === "steam") {
        const pulse = (game.time + hazard.phase) % 3.4;
        hazard.active = pulse > 0.85 && pulse < 2.35;
      }
    }

    const activeEnemies = getActiveEnemies();
    updateCombatTerrain(dt, activeEnemies);
    enforceEnemyLockdowns(activeEnemies);
    updatePlayer(dt);
    updateTutorialStage(dt);
    for (const enemy of activeEnemies) updateEnemy(enemy, dt);
    resolveEnemySeparation(activeEnemies);
    resolvePlayerEnemyOverlap(activeEnemies);
    updateCombatRooms();
    updateBullets(dt, activeEnemies);
    updateSnowPatches(dt);
    enforceEnemyLockdowns(activeEnemies);
    updateParticles(dt);
    updateCamera(dt);
    cullEnemiesOutsideVerticalView(dt);
    enemyZoneAuditAccumulator += dt;
    if (enemyZoneAuditAccumulator >= 0.45) {
      enemyZoneAuditAccumulator = 0;
      auditEnemyZoneContainment();
    }

    const narrationStageIndex = getStageIndexAt(player.x);
    const narrationIdle = !game.story && game.storyQueue.length === 0;
    const storyContextEnabled = game.tutorialCompleted && !game.tutorialActive && !game.adminMode && narrationIdle;
    let startedCutscene = false;
    if (storyContextEnabled) {
      for (const event of CUTSCENE_EVENTS) {
        const eventStageIndex = getStageIndexAt(event.x);
        if (eventStageIndex !== narrationStageIndex || player.x < event.x || game.cutsceneSeen.has(event.id)) continue;
        startCutscene(event);
        startedCutscene = true;
        break;
      }
    }
    if (storyContextEnabled && !startedCutscene) {
      for (const event of STORY_EVENTS) {
        if (event.stageIndex !== narrationStageIndex || player.x < event.x || game.storySeen.has(event.id)) continue;
        game.storySeen.add(event.id);
        queueStory(event.lines, { stageIndex: event.stageIndex, minX: event.x, maxX: stages[event.stageIndex].end });
        break;
      }
    }

    const zoneIndex = getZoneIndexAt(player.x);
    if (zoneIndex !== game.zone) {
      game.zone = zoneIndex;
      game.zoneTitle = 0;
    }

    const stageIndex = getStageIndexAt(player.x);
    if (stageIndex !== game.stage) {
      game.stage = stageIndex;
      game.stageTitle = 4.4;
      announceStageAbility(stageIndex);
    }

    if (player.x > 430 && player.x < 780 && game.hintTimer <= 0) {
      game.hint = "Space를 공중에서 한 번 더 눌러 이중 점프";
      game.hintTimer = 4.2;
    } else if (player.x > 1050 && player.x < 1450 && game.hintTimer <= 0) {
      game.hint = "오른쪽 클릭 샷건 · 아래로 쏘면 반동으로 다시 상승";
      game.hintTimer = 4.2;
    } else if (player.x > 2050 && player.x < 2450 && game.hintTimer <= 0) {
      game.hint = "왼쪽 클릭 발도 · 칼날에 닿은 투사체와 의사의 플라스크·독가스 제거";
      game.hintTimer = 4.2;
    } else if (player.x > 9400 && player.x < 9800 && game.hintTimer <= 0) {
      game.hint = "발도로 샷건 게이지 3칸 충전 · 강화탄으로 방패 파괴";
      game.hintTimer = 4.2;
    }

    pressed.clear();
  }

  function finishGame() {
    game.mode = "won";
    const rate = Math.round((game.kills / game.totalEnemies) * 100);
    resultText.textContent = `${difficultySettings[game.difficulty].name} · 작전 시간 ${formatTime(game.runTime)} · 처치 ${game.kills}/${game.totalEnemies} (${rate}%) · 재기동 ${game.deaths}회`;
    endScreen.classList.add("visible");
    sound.tone(260, 0.3, "sine", 0.045, 1.5);
    setTimeout(() => sound.tone(520, 0.55, "sine", 0.04, 1.35), 170);
  }

  function drawBackground() {
    const stageVisuals = [
      { top: "#04070d", mid: "#0b111b", bottom: "#141721", haze: "rgba(38, 116, 124, 0.06)" },
      { top: "#100607", mid: "#1b0d0d", bottom: "#271515", haze: "rgba(255, 91, 54, 0.08)" },
      { top: "#080711", mid: "#111020", bottom: "#1b1830", haze: "rgba(176, 113, 255, 0.075)" },
      { top: "#030912", mid: "#071525", bottom: "#111d31", haze: "rgba(91, 184, 255, 0.075)" },
      { top: "#07040f", mid: "#101226", bottom: "#102a2a", haze: "rgba(99, 255, 198, 0.085)" },
    ][game.stage] || { top: "#04070d", mid: "#0b111b", bottom: "#141721", haze: "rgba(38, 116, 124, 0.06)" };
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, stageVisuals.top);
    gradient.addColorStop(0.58, stageVisuals.mid);
    gradient.addColorStop(1, stageVisuals.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // 거대한 실내 폐기장: 반복되는 철골, 환풍기, 붉은 경고등이 깊이를 만든다.
    const beamOffset = -((camera.x * 0.12) % 240);
    ctx.fillStyle = "#0a111b";
    ctx.fillRect(0, 0, W, 62);
    for (let x = beamOffset - 240; x < W + 240; x += 240) {
      ctx.fillStyle = "#111a25";
      ctx.fillRect(x, 0, 28, H);
      ctx.strokeStyle = "rgba(92, 116, 130, 0.16)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 3, 90);
      ctx.lineTo(x + 25, 160);
      ctx.moveTo(x + 25, 160);
      ctx.lineTo(x + 3, 230);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(1040 - (camera.x * 0.06 % 520), 132);
    ctx.strokeStyle = "rgba(118, 151, 164, 0.16)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, TAU);
    ctx.stroke();
    ctx.rotate(game.time * 0.18);
    ctx.fillStyle = "rgba(71, 96, 110, 0.12)";
    for (let blade = 0; blade < 6; blade += 1) {
      ctx.rotate(TAU / 6);
      ctx.fillRect(5, -10, 62, 20);
    }
    ctx.restore();

    // 천장 케이블은 서로 다른 주기로 흔들리고, 원거리 수송기는 계속 왕복한다.
    ctx.lineWidth = 3;
    for (let cable = 0; cable < 7; cable += 1) {
      const cableX = ((cable * 223 - camera.x * 0.1) % (W + 260)) - 80;
      const length = 105 + hash(cable * 8.7) * 170;
      const sway = Math.sin(game.time * (0.65 + cable * 0.04) + cable) * 18;
      ctx.strokeStyle = `rgba(61, 83, 96, ${0.18 + hash(cable) * 0.12})`;
      ctx.beginPath();
      ctx.moveTo(cableX, 0);
      ctx.bezierCurveTo(cableX + sway * 0.2, length * 0.32, cableX + sway, length * 0.68, cableX + sway * 0.72, length);
      ctx.stroke();
      ctx.fillStyle = cable % 3 === 0 ? "rgba(255, 73, 108, 0.5)" : "rgba(101, 245, 234, 0.24)";
      ctx.fillRect(cableX + sway * 0.72 - 3, length - 2, 7, 7);
    }

    const carrierX = ((game.time * 34 - camera.x * 0.2) % (W + 520)) - 260;
    const carrierY = 96 + Math.sin(game.time * 0.7) * 10;
    ctx.fillStyle = "rgba(20, 32, 45, 0.82)";
    ctx.fillRect(carrierX, carrierY, 118, 30);
    ctx.fillStyle = "rgba(95, 126, 139, 0.38)";
    ctx.fillRect(carrierX + 10, carrierY + 7, 76, 5);
    ctx.fillStyle = palette.red;
    ctx.fillRect(carrierX + 101, carrierY + 8, 8, 4);
    ctx.fillStyle = "rgba(101, 245, 234, 0.13)";
    ctx.beginPath();
    ctx.moveTo(carrierX + 18, carrierY + 30);
    ctx.lineTo(carrierX + 2, carrierY + 150);
    ctx.lineTo(carrierX + 112, carrierY + 150);
    ctx.lineTo(carrierX + 98, carrierY + 30);
    ctx.fill();

    drawSkyline(0.08, H - 210, 170, "#0b1724", 0.5);
    drawSkyline(0.16, H - 140, 110, "#101d2c", 0.8);
    drawSkyline(0.28, H - 70, 72, "#152334", 1);

    if (game.stage === 1) {
      const pipeOffset = -((camera.x * 0.18) % 330);
      ctx.strokeStyle = "rgba(157, 64, 47, 0.34)";
      ctx.lineWidth = 22;
      for (let x = pipeOffset - 330; x < W + 330; x += 330) {
        ctx.beginPath();
        ctx.moveTo(x, 110);
        ctx.lineTo(x + 80, 300);
        ctx.lineTo(x + 250, 300);
        ctx.lineTo(x + 310, 510);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255, 92, 48, 0.1)";
      ctx.fillRect(0, H - 170, W, 170);
    } else if (game.stage === 2) {
      const columnOffset = -((camera.x * 0.11) % 260);
      for (let x = columnOffset - 260; x < W + 260; x += 260) {
        ctx.fillStyle = "rgba(93, 77, 130, 0.2)";
        ctx.fillRect(x, 120, 58, 510);
        ctx.strokeStyle = "rgba(215, 160, 255, 0.18)";
        ctx.strokeRect(x + 10, 145, 38, 420);
        ctx.beginPath();
        ctx.arc(x + 29, 235, 16, 0, TAU);
        ctx.stroke();
      }
    } else if (game.stage === 3) {
      ctx.strokeStyle = "rgba(113, 196, 255, 0.22)";
      ctx.lineWidth = 2;
      for (let bolt = 0; bolt < 8; bolt += 1) {
        const x = ((bolt * 197 - camera.x * 0.16) % (W + 260)) - 80;
        const flicker = hash(Math.floor(game.time * 3) + bolt) > 0.72;
        if (!flicker) continue;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 24, 90);
        ctx.lineTo(x - 12, 165);
        ctx.lineTo(x + 35, 260);
        ctx.stroke();
      }
    } else if (game.stage === 4) {
      const mirrorOffset = -((camera.x * 0.14) % 220);
      for (let x = mirrorOffset - 220; x < W + 220; x += 220) {
        const reverseX = W - x;
        ctx.fillStyle = "rgba(58, 37, 91, 0.22)";
        ctx.fillRect(x, 108, 54, 530);
        ctx.fillStyle = "rgba(25, 91, 82, 0.18)";
        ctx.fillRect(reverseX, 160, 38, 430);
        ctx.strokeStyle = "rgba(168, 121, 255, 0.28)";
        ctx.strokeRect(x + 8, 126, 38, 472);
        ctx.strokeStyle = "rgba(99, 255, 198, 0.24)";
        ctx.beginPath();
        ctx.moveTo(x + 27, 126);
        ctx.lineTo(reverseX + 19, 590);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(W / 2, H * 0.42);
      ctx.rotate(game.time * 0.035);
      for (let ring = 0; ring < 5; ring += 1) {
        ctx.strokeStyle = ring % 2 ? "rgba(99, 255, 198, 0.13)" : "rgba(168, 121, 255, 0.15)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 95 + ring * 54, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = stageVisuals.haze;
    ctx.fillRect(0, 70, W, H - 70);

    const zoneColor = zones[game.zone]?.color || palette.cyan;
    const fog = ctx.createLinearGradient(0, H * 0.45, 0, H);
    fog.addColorStop(0, "rgba(10, 20, 34, 0)");
    fog.addColorStop(1, `${zoneColor}12`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = game.zone >= 2 ? "rgba(155, 20, 42, 0.055)" : "rgba(20, 85, 100, 0.035)";
    ctx.fillRect(0, 70, W, H - 70);

    ctx.fillStyle = "rgba(255, 55, 88, 0.55)";
    for (let x = beamOffset + 86; x < W; x += 480) {
      ctx.fillRect(x, 66, 6, 4);
      ctx.fillStyle = "rgba(255, 55, 88, 0.045)";
      ctx.beginPath();
      ctx.moveTo(x - 60, H);
      ctx.lineTo(x + 66, 70);
      ctx.lineTo(x + 130, H);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 55, 88, 0.55)";
    }

    // 전경 먼지와 작은 불씨는 카메라와 다른 속도로 흘러 깊이를 강조한다.
    for (let mote = 0; mote < 42; mote += 1) {
      const drift = game.time * (9 + hash(mote * 4.2) * 22);
      const moteX = ((hash(mote * 2.7) * (W + 180) + drift - camera.x * 0.055) % (W + 180)) - 90;
      const moteY = 95 + ((hash(mote * 5.3) * 540 - drift * 0.32) % 540 + 540) % 540;
      const moteSize = 1 + hash(mote * 9.8) * 2.4;
      ctx.fillStyle = mote % 9 === 0 ? "rgba(255, 115, 88, 0.42)" : "rgba(115, 193, 202, 0.2)";
      ctx.fillRect(moteX, moteY, moteSize, moteSize);
    }

    ctx.strokeStyle = "rgba(156, 216, 228, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const drop of rain) {
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * 0.22, drop.y + drop.len);
    }
    ctx.stroke();
  }

  function drawSkyline(parallax, baseY, spacing, color, lightChance) {
    const offset = (camera.x * parallax) % spacing;
    const first = Math.floor(camera.x * parallax / spacing) - 2;
    ctx.fillStyle = color;
    for (let i = -2; i < Math.ceil(W / spacing) + 3; i += 1) {
      const id = first + i;
      const x = i * spacing - offset;
      const width = spacing * (0.75 + hash(id * 3.8) * 0.42);
      const height = 70 + hash(id * 8.1) * (H - baseY + 125);
      ctx.fillRect(Math.floor(x), Math.floor(baseY - height), Math.ceil(width), Math.ceil(height));
      if (hash(id * 12.4) < lightChance) {
        ctx.fillStyle = id % 5 === 0 ? "rgba(255, 82, 117, 0.24)" : "rgba(101, 245, 234, 0.2)";
        const rows = Math.floor(height / 30);
        for (let row = 1; row < rows; row += 1) {
          if (hash(id * 21 + row) > 0.46) ctx.fillRect(Math.floor(x + 14), Math.floor(baseY - row * 29), 4, 8);
          if (hash(id * 14 + row) > 0.6) ctx.fillRect(Math.floor(x + width - 20), Math.floor(baseY - row * 31), 4, 7);
        }
        ctx.fillStyle = color;
      }
    }
  }

  function drawPlatform(platform) {
    const scheme = {
      roof: ["#1a2938", "#314756", "#65f5ea"],
      cargo: ["#293039", "#4a5360", "#ffcd70"],
      factory: ["#30272d", "#59404a", "#ff665f"],
      lab: ["#28343d", "#596a76", "#e5f4ff"],
      wall: ["#282737", "#4c4862", "#ff6ca8"],
      gate: ["#30232d", "#674051", "#ff496c"],
      foundry: ["#321b19", "#6c382f", "#ff7b62"],
      channel: ["#182d34", "#315866", "#74d8ff"],
      crusher: ["#2c2022", "#654044", "#ff574f"],
      turbine: ["#30211d", "#79503e", "#ffb064"],
      archive: ["#241d36", "#51466d", "#d7a0ff"],
      shrine: ["#30233c", "#6d507d", "#f0c3ff"],
      rail: ["#172933", "#315665", "#74d8ff"],
      city: ["#162535", "#344d67", "#8cb7ff"],
      tower: ["#111f31", "#294764", "#90ffd4"],
      firewall: ["#271a2a", "#65334d", "#ff496c"],
      array: ["#142439", "#35627a", "#9beaff"],
      glass: ["#13252d", "#315e66", "#63ffc6"],
      mirror: ["#211934", "#59467c", "#a879ff"],
      habitat: ["#202a31", "#52606b", "#d6f8ee"],
      maze: ["#171e31", "#3c5172", "#7ee7ff"],
      capsule: ["#182c28", "#3e7467", "#91ffd4"],
      arena: ["#251a31", "#624578", "#d6b7ff"],
    }[platform.kind] || ["#1a2938", "#314756", "#65f5ea"];

    ctx.fillStyle = scheme[0];
    ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
    ctx.fillStyle = scheme[1];
    ctx.fillRect(platform.x, platform.y, platform.w, Math.min(12, platform.h));
    ctx.fillStyle = scheme[2];
    ctx.globalAlpha = 0.48;
    ctx.fillRect(platform.x, platform.y, platform.w, 2);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(220, 241, 245, 0.34)";
    ctx.lineWidth = 2;
    ctx.strokeRect(platform.x + 1, platform.y + 1, platform.w - 2, Math.min(platform.h - 2, 90));
    ctx.fillStyle = "rgba(234, 250, 250, 0.42)";
    ctx.fillRect(platform.x + 3, platform.y + 3, platform.w - 6, 2);

    if (platform.h > 80) {
      ctx.strokeStyle = "rgba(130, 170, 188, 0.09)";
      ctx.lineWidth = 2;
      for (let x = platform.x + 48; x < platform.x + platform.w; x += 96) {
        ctx.beginPath();
        ctx.moveTo(x, platform.y + 18);
        ctx.lineTo(x, Math.min(platform.y + platform.h, WORLD_H));
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = "rgba(3, 8, 14, 0.55)";
      const beltShift = (game.time * 42) % 34;
      for (let x = platform.x + 16 - beltShift; x < platform.x + platform.w - 8; x += 34) {
        if (x < platform.x + 7) continue;
        ctx.fillRect(x, platform.y + 12, 18, 6);
      }
      ctx.fillStyle = scheme[2];
      ctx.globalAlpha = 0.35 + Math.sin(game.time * 4 + platform.x * 0.01) * 0.18;
      ctx.fillRect(platform.x + 8, platform.y + 8, 5, 3);
      ctx.fillRect(platform.x + platform.w - 13, platform.y + 8, 5, 3);
      ctx.globalAlpha = 1;
    }

    if (Number.isFinite(platform.dynamicRoomLeft)) {
      const room = combatRooms.find((candidate) => candidate.left === platform.dynamicRoomLeft);
      const active = room?.triggered && !room.cleared && !game.adminMode;
      const accent = platform.dynamicAccent || palette.cyan;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = active ? 0.46 + Math.sin(game.time * 8 + platform.dynamicIndex) * 0.18 : 0.14;
      ctx.fillStyle = accent;
      ctx.fillRect(platform.x + 12, platform.y + 5, Math.max(8, platform.w - 24), 3);
      ctx.globalAlpha *= 0.7;
      const chevronX = platform.x + platform.w / 2;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(chevronX - 10, platform.y + 19);
      ctx.lineTo(chevronX, platform.y + 11);
      ctx.lineTo(chevronX + 10, platform.y + 19);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHazard(hazard) {
    if (hazard.kind === "steam") {
      const pressure = 0.55 + Math.sin(game.time * 18 + hazard.phase) * 0.2;
      ctx.fillStyle = "#25171a";
      ctx.fillRect(hazard.x - 7, hazard.y + hazard.h - 18, hazard.w + 14, 18);
      ctx.fillStyle = "#8d493f";
      ctx.fillRect(hazard.x, hazard.y + hazard.h - 14, hazard.w, 8);
      if (hazard.active) {
        const plume = ctx.createLinearGradient(0, hazard.y + hazard.h, 0, hazard.y);
        plume.addColorStop(0, `rgba(255, 120, 78, ${pressure})`);
        plume.addColorStop(0.45, "rgba(255, 204, 170, 0.42)");
        plume.addColorStop(1, "rgba(220, 242, 245, 0.05)");
        ctx.fillStyle = plume;
        ctx.beginPath();
        ctx.moveTo(hazard.x + 3, hazard.y + hazard.h - 18);
        ctx.quadraticCurveTo(hazard.x - 18, hazard.y + hazard.h * 0.55, hazard.x + 7, hazard.y);
        ctx.quadraticCurveTo(hazard.x + hazard.w + 20, hazard.y + hazard.h * 0.45, hazard.x + hazard.w - 3, hazard.y + hazard.h - 18);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(255, 205, 112, ${0.25 + Math.sin(game.time * 8) * 0.15})`;
        ctx.fillRect(hazard.x + hazard.w / 2 - 2, hazard.y + hazard.h - 26, 4, 6);
      }
      return;
    }
    if (hazard.kind === "laser") {
      const pulse = (game.time + hazard.phase) % 2.8;
      const warning = !hazard.active && pulse > 2.25;
      ctx.fillStyle = "#111925";
      ctx.fillRect(hazard.x - 8, hazard.y - 12, hazard.w + 16, 20);
      ctx.fillRect(hazard.x - 8, hazard.y + hazard.h - 8, hazard.w + 16, 20);
      if (hazard.active) {
        ctx.fillStyle = "rgba(255, 48, 92, 0.18)";
        ctx.fillRect(hazard.x - 13, hazard.y, hazard.w + 26, hazard.h);
        ctx.fillStyle = "rgba(255, 73, 108, 0.42)";
        ctx.fillRect(hazard.x + 6, hazard.y, hazard.w - 12, hazard.h);
        ctx.fillStyle = "#fff1f4";
        ctx.fillRect(hazard.x + 10, hazard.y, 4, hazard.h);
      } else if (warning) {
        ctx.fillStyle = `rgba(255, 73, 108, ${0.25 + Math.sin(game.time * 25) * 0.2})`;
        ctx.fillRect(hazard.x + 10, hazard.y, 4, hazard.h);
      }
      return;
    }

    ctx.fillStyle = "#431d2a";
    ctx.fillRect(hazard.x, hazard.y + hazard.h - 6, hazard.w, 6);
    ctx.fillStyle = palette.red;
    const count = Math.max(1, Math.floor(hazard.w / 22));
    const width = hazard.w / count;
    for (let i = 0; i < count; i += 1) {
      ctx.beginPath();
      ctx.moveTo(hazard.x + i * width, hazard.y + hazard.h);
      ctx.lineTo(hazard.x + i * width + width / 2, hazard.y);
      ctx.lineTo(hazard.x + (i + 1) * width, hazard.y + hazard.h);
      ctx.fill();
    }
  }

  function drawCheckpoint(checkpoint) {
    const glow = checkpoint.active ? 0.75 + Math.sin(game.time * 4) * 0.15 : 0.2;
    ctx.fillStyle = "#172535";
    ctx.fillRect(checkpoint.x + 10, checkpoint.y + 10, 12, checkpoint.h - 10);
    ctx.fillStyle = `rgba(101, 245, 234, ${glow})`;
    ctx.fillRect(checkpoint.x + 13, checkpoint.y + 4, 6, checkpoint.h - 18);
    ctx.strokeStyle = checkpoint.active ? palette.cyan : "#536777";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(checkpoint.x + 16, checkpoint.y + 17, 14, 0, TAU);
    ctx.stroke();
    if (checkpoint.active) {
      ctx.strokeStyle = `rgba(101, 245, 234, ${0.25 + Math.sin(game.time * 5) * 0.12})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(checkpoint.x + 16, checkpoint.y + 17, 24 + Math.sin(game.time * 3) * 3, 0, TAU);
      ctx.stroke();
    }
  }

  function drawPickup(pickup) {
    if (!pickup.active) return;
    const y = pickup.y + Math.sin(game.time * 3 + pickup.bob) * 7;
    ctx.fillStyle = "rgba(101, 245, 234, 0.12)";
    ctx.beginPath();
    ctx.arc(pickup.x + 12, y + 12, 22, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(pickup.x + 12, y + 12);
    ctx.rotate(game.time * 1.2);
    ctx.fillStyle = palette.cyan;
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = palette.white;
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }

  function drawBoostNode(node) {
    const pulse = 0.55 + Math.sin(game.time * 5 + node.pulse) * 0.22;
    const centerX = node.x + node.w / 2;
    const centerY = node.y + node.h / 2;
    ctx.fillStyle = `rgba(255, 205, 112, ${pulse * 0.22})`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(game.time * 0.8 + node.pulse);
    ctx.strokeStyle = palette.amber;
    ctx.lineWidth = 3;
    ctx.strokeRect(-13, -13, 26, 26);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }

  function getReadableSignY(sign, width, height) {
    let readableY = sign.y;
    const signLeft = sign.x - 12;
    const signRight = signLeft + width;
    const nearby = getNearbyPlatforms({ x: signLeft, w: width }, 80);

    // 발판이 표지판 사각형과 겹치면 원본 좌표는 보존하고 화면에 그릴 때만 위로 올린다.
    // 여러 층의 발판이 겹치는 경우를 위해 최대 세 번 안전 위치를 다시 계산한다.
    for (let pass = 0; pass < 3; pass += 1) {
      const signTop = readableY - height + 14;
      const signBottom = readableY + 14;
      let nextY = readableY;
      for (const platform of nearby) {
        if (
          platform.hidden
          || platform.x >= signRight
          || platform.x + platform.w <= signLeft
          || platform.y >= signBottom
          || platform.y + platform.h <= signTop
        ) continue;
        nextY = Math.min(nextY, platform.y - 18);
      }
      if (nextY === readableY) break;
      readableY = nextY;
    }
    return readableY;
  }

  function drawSign(sign) {
    const width = sign.w || 174;
    const height = sign.h || 60;
    const readableY = getReadableSignY(sign, width, height);
    ctx.save();
    ctx.fillStyle = "rgba(6, 12, 22, 0.92)";
    ctx.fillRect(sign.x - 12, readableY - height + 14, width, height);
    ctx.strokeStyle = "rgba(101, 245, 234, 0.58)";
    ctx.lineWidth = 2;
    ctx.strokeRect(sign.x - 12, readableY - height + 14, width, height);
    ctx.fillStyle = "#e7ffff";
    ctx.font = "900 21px 'Malgun Gothic', sans-serif";
    ctx.fillText(sign.text, sign.x, readableY - 18);
    ctx.fillStyle = "#8db9c3";
    ctx.font = "10px monospace";
    ctx.fillText(sign.sub, sign.x, readableY);
    ctx.restore();
  }

  function drawAdminBackdrop(backdrop) {
    if (backdrop.hidden) return;
    const accent = backdrop.kind === "scaffold" ? palette.amber : backdrop.kind === "warning" ? palette.red : palette.cyan;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "rgba(5, 12, 22, 0.76)";
    ctx.fillRect(backdrop.x, backdrop.y, backdrop.w, backdrop.h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(backdrop.x + 1.5, backdrop.y + 1.5, backdrop.w - 3, backdrop.h - 3);
    ctx.globalAlpha = 0.28;
    for (let offset = -backdrop.h; offset < backdrop.w; offset += 42) {
      ctx.beginPath();
      ctx.moveTo(backdrop.x + offset, backdrop.y + backdrop.h);
      ctx.lineTo(backdrop.x + offset + backdrop.h, backdrop.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#efffff";
    ctx.font = "900 18px 'Malgun Gothic', sans-serif";
    ctx.fillText(backdrop.text || "", backdrop.x + 16, backdrop.y + 32, Math.max(20, backdrop.w - 32));
    ctx.fillStyle = accent;
    ctx.font = "700 10px monospace";
    ctx.fillText(backdrop.sub || "", backdrop.x + 16, backdrop.y + 52, Math.max(20, backdrop.w - 32));
    ctx.restore();
  }

  function drawAdminWorldSelection() {
    if (!game.adminMode || adminWorldEditor?.hidden !== false || !selectedAdminWorldObject || selectedAdminWorldObject.hidden) return;
    const bounds = getAdminWorldBounds(selectedAdminWorldObject);
    ctx.save();
    ctx.strokeStyle = palette.amber;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 7]);
    ctx.strokeRect(bounds.x - 7, bounds.y - 7, bounds.w + 14, bounds.h + 14);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 205, 112, 0.92)";
    ctx.font = "900 11px monospace";
    ctx.fillText(`ADMIN EDIT · ${Math.round(bounds.w)} × ${Math.round(bounds.h)}`, bounds.x, bounds.y - 14);
    for (const handle of getAdminWorldHandlePoints(bounds)) {
      ctx.fillStyle = handle.name.length === 2 ? "#fff1bd" : "#65f5ea";
      ctx.strokeStyle = "#07131a";
      ctx.lineWidth = 2;
      ctx.fillRect(handle.x - 7, handle.y - 7, 14, 14);
      ctx.strokeRect(handle.x - 7, handle.y - 7, 14, 14);
    }
    ctx.restore();
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

    const speedRatio = clamp(Math.abs(player.vx) / 320, 0, 1);
    const runBlend = player.grounded ? clamp((speedRatio - 0.03) / 0.42, 0, 1) : 0;
    const running = runBlend > 0.04;
    const walling = !player.grounded && (player.wallLeft || player.wallRight);
    // Distance-driven 8-pose pixel animation: contact, compression, passing and lift.
    // Holding each key pose for a few display frames keeps the silhouette crisp
    // instead of making the limbs look like smoothly rotating sticks.
    const runFrame = ((Math.floor(player.runCycle / (TAU / 8)) % 8) + 8) % 8;
    const runStride = [0.82, 0.42, 0, -0.48, -0.84, -0.44, 0, 0.5];
    const runBob = [0, 1.15, 2.25, 1.35, 0, 1.05, 2.05, 1.2];
    const idleFrame = Math.floor(game.time * 6) % 8;
    const idleBob = [0, 0, 0.45, 0.45, 0.45, 0, 0, 0];
    const stride = runStride[runFrame];
    const bob = running
      ? runBob[runFrame] * (0.72 + runBlend * 0.58)
      : idleBob[idleFrame];
    const squashX = 1 + player.squash * 0.42;
    const squashY = 1 - player.squash * 0.52;
    const lean = running ? 0.09 + speedRatio * 0.06 : clamp(player.vx * facing / 1400, -0.08, 0.1);
    const attacking = player.attackTimer > 0;
    const attackProgress = attacking ? 1 - player.attackTimer / player.attackDuration : 0;
    const empowered = player.buffTimer > 0 || (attacking && player.chargedAttack);

    ctx.translate(0, -bob);
    ctx.scale(squashX, squashY);
    ctx.rotate(lean);

    if (ghost) {
      ctx.fillStyle = bodyCyan;
      ctx.beginPath();
      ctx.moveTo(-10, -48);
      ctx.lineTo(10, -48);
      ctx.lineTo(15, -16);
      ctx.lineTo(8, 0);
      ctx.lineTo(-11, 0);
      ctx.lineTo(-16, -18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    function drawPixelSegment(x1, y1, x2, y2, width, color, highlight) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      ctx.save();
      ctx.translate(Math.round(x1), Math.round(y1));
      ctx.rotate(Math.atan2(dx, dy));
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

    function drawJointedLimb(px, py, upperLength, lowerLength, width, upperAngle, kneeBend, color, foot = false, hand = false) {
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
        const toeLift = player.grounded ? 0 : clamp(-player.vy / 700, -0.35, 0.35);
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

    function legPose(frame, layer) {
      if (walling) {
        return layer === "back"
          ? { upper: -0.72, knee: -0.88 }
          : { upper: 0.82, knee: 1.12 };
      }
      if (!player.grounded && player.vy < -140) {
        return layer === "back"
          ? { upper: -0.52, knee: -0.12 }
          : { upper: 0.84, knee: 1.28 };
      }
      if (!player.grounded && Math.abs(player.vy) <= 140) {
        return layer === "back"
          ? { upper: -0.18, knee: 0.62 }
          : { upper: 0.42, knee: 1.12 };
      }
      if (!player.grounded) {
        return layer === "back"
          ? { upper: 0.42, knee: 0.88 }
          : { upper: -0.52, knee: -0.6 };
      }
      const runLegPoses = [
        { upper: 0.72, knee: 0.18 },
        { upper: 0.34, knee: 0.42 },
        { upper: 0.02, knee: 0.92 },
        { upper: -0.48, knee: 1.18 },
        { upper: -0.7, knee: 0.22 },
        { upper: -0.3, knee: 0.16 },
        { upper: 0.08, knee: 0.5 },
        { upper: 0.48, knee: 0.72 },
      ];
      const poseIndex = layer === "back" ? (frame + 4) % 8 : frame;
      const pose = runLegPoses[poseIndex];
      const landingBend = player.squash * 0.8;
      return {
        upper: pose.upper * runBlend + (layer === "back" ? -0.04 : 0.04) * (1 - runBlend),
        knee: (pose.knee + landingBend) * runBlend + (1 - runBlend) * 0.16,
      };
    }

    const backPose = legPose(runFrame, "back");
    const frontPose = legPose(runFrame, "front");
    drawJointedLimb(-5, -19, 11, 11, 7, backPose.upper, backPose.knee, "#0c1825", true);
    drawJointedLimb(5, -19, 11, 12, 8, frontPose.upper, frontPose.knee, "#172b3c", true);

    // 등에 고정된 전술 신호 장치와 작은 안테나.
    ctx.fillStyle = "#0a131f";
    ctx.fillRect(-17, -43, 7, 24);
    ctx.fillStyle = "#3c5868";
    ctx.fillRect(-16, -39, 4, 13);
    ctx.fillStyle = bodyCyan;
    ctx.globalAlpha = 0.4 + Math.sin(game.time * 5) * 0.18;
    ctx.fillRect(-15, -42, 2, 3);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#526d79";
    ctx.beginPath();
    ctx.moveTo(-14, -43);
    const equipmentLag = running ? -2 - Math.round((stride + 1) * 0.8) : 0;
    ctx.lineTo(-18 + equipmentLag, -54 + (running ? runFrame % 2 : 0));
    ctx.stroke();

    // 허리의 칼집. 천 소재 없이 단단한 검사 실루엣을 만든다.
    ctx.save();
    ctx.translate(-7 + equipmentLag * 0.25, -23 + (running ? runFrame % 2 : 0));
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

    ctx.fillStyle = "#111d2c";
    ctx.beginPath();
    ctx.moveTo(-11, -43);
    ctx.lineTo(10, -43);
    ctx.lineTo(15, -20);
    ctx.lineTo(8, -15);
    ctx.lineTo(-11, -17);
    ctx.lineTo(-15, -30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#29475a";
    ctx.fillRect(-10, -38, 5, 17);
    ctx.fillStyle = "#3d6072";
    ctx.beginPath();
    ctx.moveTo(-15, -40);
    ctx.lineTo(-7, -44);
    ctx.lineTo(-2, -37);
    ctx.lineTo(-8, -32);
    ctx.lineTo(-15, -34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#172431";
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

    // Pixel-scale fabric seams, fasteners, and field gear keep the human silhouette readable.
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

    const rearArm = running ? -stride * 0.58 * runBlend + 0.14 : 0.28;
    drawJointedLimb(-10, -38, 8, 8, 5, rearArm, -0.42, "#152638", false, true);

    ctx.fillStyle = "#8da0aa";
    ctx.fillRect(-10, -57, 19, 16);
    ctx.fillStyle = "#354a58";
    ctx.fillRect(-13, -53, 4, 9);
    ctx.fillStyle = bodyCyan;
    ctx.fillRect(-13, -51, 2, 4);
    ctx.fillStyle = "#f5fbf8";
    ctx.beginPath();
    ctx.moveTo(-8, -56);
    ctx.lineTo(9, -54);
    ctx.lineTo(8, -43);
    ctx.lineTo(-6, -41);
    ctx.lineTo(-10, -47);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0a111b";
    ctx.fillRect(1, -51, 9, 3);
    ctx.fillStyle = empowered ? bodyAmber : bodyRed;
    ctx.fillRect(6, -51, 4, 3);
    ctx.fillStyle = "rgba(255,73,108,0.22)";
    ctx.fillRect(10, -51, 12, 3);
    ctx.strokeStyle = "rgba(56, 74, 82, 0.68)";
    ctx.beginPath();
    ctx.moveTo(-1, -55);
    ctx.lineTo(-1, -43);
    ctx.moveTo(-7, -46);
    ctx.lineTo(-3, -43);
    ctx.moveTo(4, -43);
    ctx.lineTo(8, -46);
    ctx.stroke();
    ctx.fillStyle = "#293a43";
    ctx.fillRect(-6, -44, 3, 2);
    ctx.fillRect(3, -44, 3, 2);

    // Hair, jaw shadow, eye, nose, and a tiny comms implant are drawn as individual pixels.
    ctx.fillStyle = "#263842";
    ctx.fillRect(-10, -57, 12, 3);
    ctx.fillRect(-11, -55, 4, 5);
    // Short pixel clusters trail the head by one pose, giving hair secondary motion.
    const hairLag = running ? equipmentLag : (!player.grounded ? -3 : 0);
    ctx.fillRect(-12 + hairLag, -56, 5, 3);
    ctx.fillRect(-14 + hairLag, -53 + (running ? runFrame % 2 : 0), 5, 2);
    ctx.fillStyle = "#c9d6d4";
    ctx.fillRect(-8, -48, 3, 4);
    ctx.fillStyle = "#738c92";
    ctx.fillRect(-6, -44, 12, 2);
    ctx.fillStyle = "#101923";
    ctx.fillRect(1, -50, 3, 2);
    ctx.fillRect(7, -47, 2, 1);
    ctx.fillStyle = "#d68678";
    ctx.fillRect(4, -45, 3, 1);
    ctx.fillStyle = bodyCyan;
    ctx.fillRect(-12, -49, 2, 2);
    ctx.fillStyle = "#506873";
    ctx.fillRect(-10, -46, 2, 3);

    let armAngle = running ? stride * 0.5 : -0.15;
    if (!player.grounded) armAngle = -0.48;
    if (attacking) {
      const ease = (value) => value * value * (3 - value * 2);
      if (attackProgress < 0.2) {
        armAngle = -0.48 + (-2.28 + 0.48) * ease(attackProgress / 0.2);
      } else if (attackProgress < 0.62) {
        armAngle = -2.28 + 4.38 * ease((attackProgress - 0.2) / 0.42);
      } else {
        armAngle = 2.1 + (-0.08 - 2.1) * ease((attackProgress - 0.62) / 0.38);
      }
      armAngle += player.attackDir.y * 0.72;
    }

    drawJointedLimb(10, -38, 9, 9, 6, armAngle, attacking ? 0 : 0.38, "#294459", false, !attacking);
    if (attacking) {
      ctx.save();
      ctx.translate(10, -38);
      ctx.rotate(armAngle);

      // 붉은 끈으로 감은 손잡이와 원형 코등이.
      ctx.fillStyle = "#10141d";
      ctx.fillRect(7, -4, 15, 8);
      ctx.strokeStyle = empowered ? bodyAmber : bodyRed;
      ctx.lineWidth = 1;
      for (let wrap = 9; wrap < 21; wrap += 4) {
        ctx.beginPath();
        ctx.moveTo(wrap, -4);
        ctx.lineTo(wrap + 3, 4);
        ctx.stroke();
      }
      ctx.fillStyle = "#b58b43";
      ctx.beginPath();
      ctx.ellipse(23, 0, 3, 7, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#1b2833";
      ctx.beginPath();
      ctx.ellipse(23, 0, 1.4, 5, 0, 0, TAU);
      ctx.fill();

      // 더 길고 완만하게 휜 외날과 등줄.
      const bladeGlow = flameSword ? "#ffad42" : empowered ? bodyAmber : bodyBlade;
      if (flameSword) {
        ctx.shadowColor = "#ff5a2e";
        ctx.shadowBlur = 12;
      }
      ctx.fillStyle = bladeGlow;
      ctx.beginPath();
      ctx.moveTo(25, -2.4);
      ctx.quadraticCurveTo(56, -6.5, 82, -15);
      ctx.quadraticCurveTo(69, -4.5, 25, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      if (flameSword) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255, 81, 38, 0.72)";
        for (let flame = 0; flame < 5; flame += 1) {
          const flameX = 34 + flame * 10;
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
      ctx.moveTo(27, -1.4);
      ctx.quadraticCurveTo(58, -5.3, 80, -14);
      ctx.stroke();
      ctx.strokeStyle = "#31586a";
      ctx.beginPath();
      ctx.moveTo(26, 1.7);
      ctx.quadraticCurveTo(60, -0.8, 75, -8);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const empoweredSlash = player.buffTimer > 0;
    const flameSword = game.stage >= ACT_FOUR_INDEX;
    if (Math.abs(player.vx) > 250) {
      ctx.save();
      ctx.strokeStyle = empoweredSlash ? "rgba(255, 205, 112, 0.28)" : "rgba(101, 245, 234, 0.16)";
      ctx.lineWidth = 2;
      for (let streak = 0; streak < 4; streak += 1) {
        const offsetY = 8 + hash(streak * 3.1 + game.time) * 44;
        const length = 18 + Math.abs(player.vx) * 0.11 + streak * 7;
        ctx.beginPath();
        ctx.moveTo(player.x + player.w / 2 - player.facing * 12, player.y + offsetY);
        ctx.lineTo(player.x + player.w / 2 - player.facing * length, player.y + offsetY);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const trail of player.trail) {
      drawPlayerBody(trail.x, trail.y, trail.facing, (trail.life / trail.maxLife) * 0.22, true);
    }

    const blink = player.invincible > 0 && Math.floor(player.invincible * 16) % 2 === 0;
    if (!blink) drawPlayerBody(player.x, player.y, player.facing);

    if (player.recoilTimer > 0) {
      const aim = getPointerAim();
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h * 0.46;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(aim.y, aim.x));
      ctx.fillStyle = "#111923";
      ctx.fillRect(2, -5, 38, 10);
      ctx.fillStyle = "#506978";
      ctx.fillRect(8, -3, 30, 3);
      ctx.fillStyle = palette.red;
      ctx.fillRect(0, -6, 7, 12);
      ctx.fillStyle = "#182d3b";
      ctx.fillRect(12, 5, 8, 13);
      ctx.fillStyle = player.shotgunCharge >= 3 ? palette.amber : palette.cyan;
      ctx.fillRect(33, -4, 7, 8);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(player.recoilTimer * 9, 0, 1);
      ctx.fillStyle = player.shotgunCharge >= 3 ? palette.amber : palette.white;
      ctx.beginPath();
      ctx.moveTo(40, -8);
      ctx.lineTo(73, 0);
      ctx.lineTo(40, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (isAttackActive()) {
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      const angle = Math.atan2(player.attackDir.y, player.attackDir.x);
      const progress = 1 - player.attackTimer / player.attackDuration;
      const slashScale = player.chargedAttack ? 1.18 : player.slashChain === 3 ? 1.1 : 1;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.sin(clamp(progress, 0, 1) * Math.PI);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, (84 + progress * 17) * slashScale, -2.35 + progress * 0.42, 0.92 + progress * 0.5);
      ctx.stroke();
      ctx.strokeStyle = flameSword ? "rgba(255, 112, 48, 0.5)" : empoweredSlash ? "rgba(255, 205, 112, 0.42)" : "rgba(101, 245, 234, 0.34)";
      ctx.lineWidth = player.chargedAttack ? 16 : 10;
      ctx.beginPath();
      ctx.arc(0, 0, (90 + progress * 18) * slashScale, -2.31 + progress * 0.4, 0.88 + progress * 0.48);
      ctx.stroke();
      ctx.strokeStyle = flameSword ? "rgba(255, 196, 78, 0.78)" : empoweredSlash ? "rgba(255, 205, 112, 0.72)" : "rgba(255, 73, 108, 0.5)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 112 * slashScale, -2.12 + progress * 0.32, 0.63 + progress * 0.4);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(21, -70 + progress * 18);
      ctx.quadraticCurveTo(76, -34, 112, 20 + progress * 14);
      ctx.stroke();
      ctx.restore();
    }

    if (player.burstTimer > 0) {
      const progress = 1 - player.burstTimer / 0.38;
      const radius = 48 + progress * 115;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(101, 245, 234, ${1 - progress})`;
      ctx.lineWidth = 24 * (1 - progress) + 3;
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, radius, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 - progress * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, radius - 9, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (player.burstParryTimer > 0) {
      const alpha = clamp(player.burstParryTimer / 0.72, 0, 1);
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(242, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      for (let blade = 0; blade < 3; blade += 1) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(game.time * 5.5 + blade * TAU / 3);
        ctx.beginPath();
        ctx.moveTo(42, -13);
        ctx.lineTo(78, 0);
        ctx.lineTo(42, 13);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function drawEnemyTelegraph(enemy) {
    if (enemy.windup <= 0) return;
    const pulse = 0.45 + Math.sin(game.time * 28) * 0.22;
    if (enemy.type === "boss" && enemy.bossAction === "chargeShot" && getBossArchetype(enemy.bossKind) !== "weaver") {
      const duration = Math.max(0.01, enemy.bossChargeDuration || enemy.windup);
      const progress = clamp(1 - enemy.windup / duration, 0, 1);
      const muzzleX = enemy.x + enemy.w / 2 + enemy.facing * enemy.w * 0.68;
      const muzzleY = enemy.y + enemy.h * 0.42;
      const accent = BOSS_DEFINITIONS[enemy.bossKind]?.accent || palette.red;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `${accent}${Math.round((0.3 + progress * 0.55) * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth = 2 + progress * 3;
      ctx.setLineDash([6 + progress * 8, 9 - progress * 4]);
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let ring = 0; ring < 3; ring += 1) {
        const radius = 34 - progress * 24 + ring * 8;
        ctx.globalAlpha = clamp(0.85 - ring * 0.2 + Math.sin(game.time * 24 + ring) * 0.12, 0.15, 1);
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, radius, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.55 + progress * 0.45;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 4 + progress * 9, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (
      enemy.type === "boss"
      && ["dash", "reflectRush", "shieldRush", "madDash", "echoSlash", "echoCounter", "echoDash", "mutantApproach", "mutantLeap", "mutantSmash"].includes(enemy.bossAction)
    ) {
      const direction = enemy.dashDirection || Math.sign(player.x - enemy.x) || enemy.facing || 1;
      const startX = enemy.x + enemy.w / 2;
      const range = enemy.dashRange || (enemy.bossKind === "echo" ? 760 : 560);
      const endX = startX + direction * range;
      const laneY = enemy.y + enemy.h - 24;
      const left = Math.min(startX, endX);
      const width = Math.abs(endX - startX);
      const accent = BOSS_DEFINITIONS[enemy.bossKind]?.accent || "#ff6b78";
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = accent + "1f";
      ctx.fillRect(left, laneY - 35, width, 70);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.58 + pulse * 0.35;
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 10]);
      ctx.strokeRect(left, laneY - 35, width, 70);
      ctx.setLineDash([]);
      for (let offset = 64; offset < width; offset += 82) {
        const arrowX = startX + direction * offset;
        ctx.fillStyle = "#fff0dc";
        ctx.beginPath();
        ctx.moveTo(arrowX + direction * 18, laneY);
        ctx.lineTo(arrowX - direction * 8, laneY - 12);
        ctx.lineTo(arrowX - direction * 8, laneY + 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 0.72 + pulse * 0.25;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.arc(startX, enemy.y + enemy.h * 0.48, 24 + ring * 10 - pulse * 5, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    } else if (enemy.type === "runner" && Number.isFinite(enemy.targetX)) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(101, 245, 234, ${0.45 + pulse * 0.42})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.48, 18 + pulse * 7, 0, TAU);
      ctx.stroke();
      ctx.restore();
    } else if (enemy.type === "turret") {
      const duration = Math.max(0.01, enemy.turretChargeDuration || TURRET_CHARGE_SECONDS);
      const progress = clamp(1 - enemy.windup / duration, 0, 1);
      const muzzleX = enemy.x + enemy.w / 2 + enemy.facing * 58;
      const muzzleY = enemy.y + enemy.h * 0.44;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(255, 207, 98, ${0.32 + progress * 0.6})`;
      ctx.lineWidth = 2 + progress * 2;
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, 30 - progress * 21 + ring * 7, 0, TAU);
        ctx.stroke();
      }
      // 다섯 발의 장전 상태를 본체 위 게이지가 아니라 총구로 빨려 들어가는 에너지 구슬로 표시한다.
      for (let round = 0; round < 5; round += 1) {
        const gatherProgress = clamp(progress * 5 - round, 0, 1);
        const laneOffset = (round - 2) * 8;
        const beadX = muzzleX - enemy.facing * (34 * (1 - gatherProgress));
        const beadY = muzzleY + laneOffset * (1 - gatherProgress);
        ctx.globalAlpha = 0.18 + gatherProgress * 0.82;
        ctx.fillStyle = gatherProgress >= 1 ? "#fff4bc" : "#ffcf62";
        ctx.beginPath();
        ctx.arc(beadX, beadY, 2.5 + gatherProgress * 2.5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(255, 207, 98, ${0.22 + progress * 0.65})`;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 3 + progress * 7, 0, TAU);
      ctx.fill();
      ctx.restore();
    } else if (enemy.type === "machinegun" && Number.isFinite(enemy.targetX)) {
      const sourceX = enemy.x + enemy.w / 2 + enemy.facing * 30;
      const sourceY = enemy.y + enemy.h * 0.38;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 128, 102, ${0.34 + pulse * 0.42})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let round = 0; round < SENTRY_BURST_ROUNDS; round += 1) {
        ctx.fillStyle = `rgba(255, 128, 102, ${0.48 + pulse * 0.35})`;
        ctx.fillRect(enemy.x + enemy.w / 2 - 19 + round * 11, enemy.y - 15, 7, 4);
      }
      ctx.restore();
    } else if (enemy.type === "piercer" && Number.isFinite(enemy.targetX)) {
      ctx.save();
      ctx.strokeStyle = `rgba(121, 223, 255, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(enemy.x + enemy.w / 2, enemy.y + 22);
      ctx.lineTo(enemy.targetX, enemy.targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(121, 223, 255, 0.75)";
      ctx.fillRect(enemy.targetX - 5, enemy.targetY - 1, 10, 2);
      ctx.fillRect(enemy.targetX - 1, enemy.targetY - 5, 2, 10);
      ctx.restore();
    } else if ((enemy.type === "mortar" || enemy.type === "mortarTurret") && Number.isFinite(enemy.targetX)) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 73, 108, ${pulse + 0.18})`;
      ctx.lineWidth = 3;
      const targets = enemy.type === "mortarTurret" ? [-135, 0, 135] : [0];
      for (const offset of targets) {
        ctx.beginPath();
        ctx.ellipse(enemy.targetX + offset, enemy.targetY, 52, 13, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 73, 108, ${pulse * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(enemy.targetX + offset, enemy.targetY, 48, 10, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawBossIdentityHalo(x, y, bossKind, accent, pulse, chargeProgress = 0) {
    const radius = 54 + pulse * 5 + chargeProgress * 8;
    ctx.save();
    ctx.translate(x, y);
    if (bossKind === "weaver") {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.16 + pulse * 0.14;
      for (let shard = 0; shard < 7; shard += 1) {
        const drift = Math.sin(game.time * 1.4 + shard * 2.1) * 9;
        const sx = -45 + shard * 15;
        const sy = -34 + (shard % 3) * 33 + drift;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(-0.35 + Math.sin(game.time + shard) * 0.18);
        ctx.fillRect(-2, -8, 4, 16);
        ctx.restore();
      }
      ctx.restore();
      return;
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.16 + pulse * 0.14 + chargeProgress * 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -2.82, -0.38);
    ctx.arc(0, 0, radius, 0.32, 2.76);
    ctx.stroke();
    ctx.globalAlpha *= 0.72;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 9, -1.25, -0.72);
    ctx.arc(0, 0, radius + 9, 1.89, 2.42);
    ctx.stroke();

    ctx.globalAlpha = 0.3 + pulse * 0.18;
    if (bossKind === "warden") {
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = -Math.PI / 2 + point * TAU / 6;
        const px = Math.cos(angle) * 42;
        const py = Math.sin(angle) * 42;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(-5, -32, 10, 64);
    } else if (bossKind === "furnace") {
      for (let segment = 0; segment < 8; segment += 1) {
        const angle = segment * TAU / 8 + game.time * 0.24;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = accent;
        ctx.fillRect(42, -3, 16, 6);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 31, 0, TAU);
      ctx.stroke();
    } else if (bossKind === "weaver") {
      for (let layer = 0; layer < 3; layer += 1) {
        const scale = 28 + layer * 13;
        ctx.save();
        ctx.rotate(game.time * (layer % 2 ? -0.16 : 0.12));
        ctx.beginPath();
        ctx.moveTo(0, -scale);
        ctx.lineTo(scale * 0.88, scale * 0.5);
        ctx.lineTo(-scale * 0.88, scale * 0.5);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    } else if (bossKind === "censor") {
      ctx.beginPath();
      ctx.moveTo(0, -58);
      ctx.lineTo(0, 57);
      ctx.moveTo(-58, 0);
      ctx.lineTo(58, 0);
      ctx.moveTo(-41, -41);
      ctx.lineTo(41, 41);
      ctx.moveTo(41, -41);
      ctx.lineTo(-41, 41);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(-50, -4, 100, 8);
    } else {
      ctx.beginPath();
      ctx.arc(-13, 0, 39, -1.35, 1.35);
      ctx.arc(13, 0, 39, 1.8, 4.48);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.lineTo(18, 0);
      ctx.lineTo(0, 44);
      ctx.lineTo(-18, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSpecialBossCharacter(enemy, rawBossKind, accent, pulse, chargeProgress, chargingShot) {
    const flash = enemy.hurt > 0;
    const motion = Math.sin(enemy.anim * 5.2);
    const shell = flash ? "#ffffff" : "#1b202b";
    const limb = (x1, y1, x2, y2, width, color = shell) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.lineCap = "butt";
    };

    if (rawBossKind === "warden") {
      // 다리 대신 추력식 부유 프레임을 사용해 중장 몸통 아래가 비어 보이는 실루엣으로 재설계했다.
      const hoverPulse = 0.55 + Math.sin(game.time * 8.5) * 0.18;
      ctx.fillStyle = flash ? "#fff" : "#40121f";
      ctx.beginPath();
      ctx.moveTo(-25, 61); ctx.lineTo(-12, 53); ctx.lineTo(12, 53); ctx.lineTo(25, 61);
      ctx.lineTo(17, 78); ctx.lineTo(-17, 78); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ff8ca2"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#160b11"; ctx.fillRect(-13, 67, 26, 12);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, 71, 5 + hoverPulse * 2, 0, TAU); ctx.fill();
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 35, 64 + Math.sin(game.time * 4.2 + side) * 2);
        ctx.fillStyle = flash ? "#fff" : "#68152a";
        ctx.beginPath(); ctx.moveTo(-13, -9); ctx.lineTo(11, -14); ctx.lineTo(18, 5); ctx.lineTo(9, 20); ctx.lineTo(-11, 14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#ff8ca2"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#120a0e"; ctx.fillRect(-7, 12, 15, 8);
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "rgba(255,91,112,0.28)";
        ctx.beginPath(); ctx.moveTo(-8, 19); ctx.lineTo(0, 45 + hoverPulse * 9); ctx.lineTo(8, 19); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffd4ae";
        ctx.beginPath(); ctx.moveTo(-3, 19); ctx.lineTo(0, 34 + hoverPulse * 7); ctx.lineTo(3, 19); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "rgba(255,73,108,0.34)";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 100, 49 + hoverPulse * 6, 9 + hoverPulse * 2, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = flash ? "#fff" : "#7b1730";
      ctx.beginPath();
      ctx.moveTo(-42, 47); ctx.lineTo(-30, 24); ctx.lineTo(-15, 31); ctx.lineTo(-22, 69); ctx.lineTo(-48, 77); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(42, 47); ctx.lineTo(30, 24); ctx.lineTo(15, 31); ctx.lineTo(22, 69); ctx.lineTo(48, 77); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ff8ca2"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = flash ? "#fff" : "#9b1d39";
      ctx.beginPath(); ctx.moveTo(-27, 24); ctx.lineTo(-17, 8); ctx.lineTo(18, 8); ctx.lineTo(31, 30); ctx.lineTo(20, 68); ctx.lineTo(-20, 68); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2b1019"; ctx.fillRect(-14, 26, 28, 21);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(0, 37, 6 + pulse * 2, 0, TAU); ctx.fill();
      ctx.fillStyle = flash ? "#fff" : "#651428";
      ctx.beginPath(); ctx.arc(-34, 27, 18, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(34, 27, 18, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#ff9caf"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-34, 27, 15, 0, TAU); ctx.arc(34, 27, 15, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#3a111c"; ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(0, -11); ctx.lineTo(6, 4); ctx.lineTo(16, 11); ctx.lineTo(-15, 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffced7"; ctx.fillRect(1, 5, 10, 3);
      // 후방 육익 판넬 랙.
      for (const side of [-1, 1]) for (let panel = 0; panel < 3; panel += 1) {
        ctx.save(); ctx.translate(side * (34 + panel * 8), 8 + panel * 17); ctx.rotate(side * (0.45 + panel * 0.12));
        ctx.fillStyle = "#5b1022"; ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(7, -10); ctx.lineTo(8, 11); ctx.lineTo(-7, 14); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = "#35121a"; ctx.fillRect(24, 42, 56, 11);
      ctx.fillStyle = "#d05061"; ctx.fillRect(65, 44, 28, 6);
    } else if (rawBossKind === "breaker") {
      // 구형 철각 계열의 무한궤도 포격 차체를 폐철 부품으로 재조립한 집행기.
      ctx.fillStyle = flash ? "#fff" : "#43371f"; ctx.fillRect(-48, 57, 96, 24);
      ctx.fillStyle = "#100f0a"; ctx.fillRect(-44, 62, 88, 18);
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(-49, 56, 98, 26);
      for (let wheel = -36; wheel <= 36; wheel += 12) {
        ctx.fillStyle = "#837345"; ctx.beginPath(); ctx.arc(wheel, 71 + Math.sin(enemy.anim * 9 + wheel) * 1.2, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = "#272116"; ctx.beginPath(); ctx.arc(wheel, 71, 2.5, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = flash ? "#fff" : "#564525";
      ctx.beginPath(); ctx.moveTo(-34, 58); ctx.lineTo(-27, 31); ctx.lineTo(-12, 18); ctx.lineTo(20, 20); ctx.lineTo(33, 39); ctx.lineTo(37, 59); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#17150f"; ctx.fillRect(-16, 27, 33, 18);
      ctx.fillStyle = accent; ctx.fillRect(-11, 32, 24, 5);
      for (const side of [-1, 1]) {
        ctx.save(); ctx.translate(side * 24, 30); ctx.rotate(side * 0.1 - 0.16);
        ctx.fillStyle = "#76633a"; ctx.fillRect(-5, -29, 10, 39); ctx.fillStyle = accent; ctx.fillRect(-3, -34, 6, 8); ctx.restore();
      }
      ctx.fillStyle = "#76633a"; ctx.fillRect(20, 41, 50, 10);
      for (let muzzle = 0; muzzle < 5; muzzle += 1) {
        ctx.fillStyle = muzzle % 2 ? "#ad985d" : "#5c4c2d";
        ctx.fillRect(62, 40 + muzzle * 4, 18, 3);
      }
    } else if (rawBossKind === "hunter") {
      limb(-12, 56, -18 - motion * 4, 81, 10, flash ? "#fff" : "#553129");
      limb(12, 56, 18 + motion * 4, 81, 10, flash ? "#fff" : "#553129");
      ctx.fillStyle = flash ? "#fff" : "#6b352b";
      ctx.beginPath(); ctx.moveTo(-20, 17); ctx.lineTo(17, 13); ctx.lineTo(26, 56); ctx.lineTo(0, 69); ctx.lineTo(-24, 53); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#14222b"; ctx.fillRect(-13, 25, 30, 19);
      ctx.fillStyle = "#a6f7ff"; ctx.fillRect(-8, 29, 20, 4);
      const reflectionBroken = (enemy.reflectBreakTimer || 0) > 0;
      const shieldSide = reflectionBroken ? -1 : 1;
      const shieldX = shieldSide * 39;
      // 산탄 반사 전에는 방패를 진행 방향 정면에 고정하고, 반사 직후에는 관성으로 등 뒤로 젖힌다.
      ctx.save();
      ctx.translate(shieldX, 40);
      ctx.rotate(reflectionBroken ? -0.74 : 0.08);
      ctx.fillStyle = reflectionBroken ? "rgba(255,73,108,0.16)" : "rgba(166,247,255,0.24)";
      ctx.strokeStyle = reflectionBroken ? "#ff496c" : "#a6f7ff";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-7, -34); ctx.lineTo(15, -21); ctx.lineTo(17, 22); ctx.lineTo(0, 37); ctx.lineTo(-18, 19); ctx.lineTo(-17, -21); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = reflectionBroken ? "#ffd2d9" : "rgba(214,253,255,0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(7, -10); ctx.lineTo(-5, 2); ctx.lineTo(9, 18); ctx.stroke();
      ctx.fillStyle = reflectionBroken ? "#ff496c" : "#dffeff";
      ctx.beginPath(); ctx.arc(0, 2, 5 + pulse * 1.5, 0, TAU); ctx.fill();
      ctx.restore();
      // 반사 방패 옆으로 짧은 삼연장 산탄총이 나온다.
      ctx.fillStyle = "#30201e"; ctx.fillRect(14, 28, 45, 13);
      for (let barrel = 0; barrel < 3; barrel += 1) { ctx.fillStyle = "#c88a70"; ctx.fillRect(51, 28 + barrel * 5, 23, 3); }
      if (reflectionBroken) {
        ctx.fillStyle = "rgba(255,73,108,0.72)";
        ctx.fillRect(-52, 82, 46 * clamp(enemy.reflectBreakTimer / HUNTER_REFLECT_BREAK_SECONDS, 0, 1), 4);
      }
      if (enemy.reflectTimer > 0) {
        ctx.strokeStyle = `rgba(166,247,255,${0.58 + pulse * 0.35})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(18, 42, 64, -1.7, 1.7); ctx.stroke();
      }
    } else if (rawBossKind === "oracle") {
      ctx.fillStyle = flash ? "#fff" : "#231a38";
      ctx.beginPath(); ctx.moveTo(-18, 28); ctx.lineTo(-34, 76 + motion * 3); ctx.lineTo(-4, 65); ctx.lineTo(0, 82); ctx.lineTo(6, 64); ctx.lineTo(35, 76 - motion * 3); ctx.lineTo(18, 27); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#e8e3ef"; ctx.beginPath(); ctx.moveTo(-16, 8); ctx.lineTo(0, 1); ctx.lineTo(16, 8); ctx.lineTo(12, 27); ctx.lineTo(0, 34); ctx.lineTo(-12, 27); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#603ea0"; ctx.fillRect(-10, 17, 8, 3); ctx.fillStyle = "#ff6b9c"; ctx.fillRect(3, 17, 8, 3);
      for (const side of [-1, 1]) {
        const orbit = side * (39 + Math.sin(game.time * 2.2) * 5);
        ctx.fillStyle = side < 0 ? "#dcd5ee" : "#493169";
        ctx.beginPath(); ctx.ellipse(orbit, 38 + Math.cos(game.time * 2.5 + side) * 10, 10, 15, side * 0.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = side < 0 ? "#ff6b9c" : "#bfa4ff"; ctx.stroke();
      }
    } else if (rawBossKind === "revenant") {
      // 장식은 줄이고 회색 장갑, 단순 원형 방패, 긴 실전검으로 읽히는 검객형 실루엣만 남긴다.
      limb(-13, 58, -19 - motion * 3, 85, 10, flash ? "#fff" : "#303941");
      limb(13, 58, 19 + motion * 3, 85, 10, flash ? "#fff" : "#303941");
      ctx.fillStyle = flash ? "#fff" : "#3c4650";
      ctx.beginPath(); ctx.moveTo(-22, 20); ctx.lineTo(-12, 12); ctx.lineTo(14, 13); ctx.lineTo(25, 57); ctx.lineTo(0, 72); ctx.lineTo(-25, 56); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#9aa8ae"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#202931"; ctx.fillRect(-14, 31, 29, 23);
      ctx.fillStyle = accent; ctx.fillRect(-7, 37, 15, 3);
      for (const side of [-1, 1]) {
        ctx.fillStyle = flash ? "#fff" : "#4e5962";
        ctx.beginPath(); ctx.moveTo(side * 12, 20); ctx.lineTo(side * 31, 24); ctx.lineTo(side * 34, 35); ctx.lineTo(side * 20, 39); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = flash ? "#fff" : "#aeb8bc";
      ctx.beginPath(); ctx.moveTo(-13, 5); ctx.lineTo(0, -4); ctx.lineTo(14, 5); ctx.lineTo(11, 23); ctx.lineTo(-11, 23); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#202830"; ctx.fillRect(-11, 10, 22, 8);
      ctx.fillStyle = accent; ctx.fillRect(-6, 12, 13, 3);
      ctx.fillStyle = "#727f85"; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(1, -17); ctx.lineTo(5, -2); ctx.closePath(); ctx.fill();
      limb(-13, 31, -29, 43, 9, flash ? "#fff" : "#39444c");
      ctx.save(); ctx.translate(-35, 43);
      ctx.fillStyle = flash ? "#fff" : "#29333b"; ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#a5b1b5"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#141b20"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.stroke();
      for (let barrel = -1; barrel <= 1; barrel += 1) { ctx.fillStyle = "#d4dde0"; ctx.fillRect(-34, barrel * 7 - 2, 14, 4); }
      ctx.restore();
      const swordPattern = chargingShot && String(enemy.bossShotPattern || "").includes("revenant-") && enemy.bossShotPattern !== "revenant-shield-burst";
      const swordAngle = swordPattern ? -1.35 + chargeProgress * 1.65 : -0.42 + motion * 0.025;
      limb(14, 30, 28, 43, 9, flash ? "#fff" : "#39444c");
      ctx.save(); ctx.translate(29, 43); ctx.rotate(swordAngle);
      ctx.fillStyle = "#171d22"; ctx.fillRect(-4, -5, 21, 10);
      ctx.fillStyle = accent; ctx.fillRect(8, -8, 5, 16);
      ctx.fillStyle = "#e8eff1";
      ctx.beginPath(); ctx.moveTo(14, -5); ctx.lineTo(83, -2); ctx.lineTo(96, 0); ctx.lineTo(82, 4); ctx.lineTo(14, 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#91a0a7"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      if (swordPattern) {
        ctx.strokeStyle = `rgba(226,207,255,${0.35 + pulse * 0.35})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(25, 42, 78, -1.45, 0.38); ctx.stroke();
      }
      if ((enemy.shieldMuzzleFlash || 0) > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "#fff0b7";
        ctx.beginPath(); ctx.moveTo(-69, 43); ctx.lineTo(-88, 35); ctx.lineTo(-81, 43); ctx.lineTo(-88, 51); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (rawBossKind === "proxy") {
      const injecting = enemy.bossAction === "selfInject";
      const mutated = !!enemy.mutated;
      if (mutated) {
        // 투약 뒤에는 실험복이 찢어지고 팔과 흉곽이 비정상적으로 팽창한 근접 괴력형으로 변한다.
        ctx.save();
        ctx.globalAlpha = 0.16 + pulse * 0.1; ctx.fillStyle = "#70ff9b";
        ctx.beginPath(); ctx.ellipse(0, 48, 55 + pulse * 5, 63 + pulse * 4, 0, 0, TAU); ctx.fill();
        ctx.restore();
        limb(-16, 55, -23 - motion * 5, 84, 13, flash ? "#fff" : "#2b513d");
        limb(16, 55, 23 + motion * 5, 84, 13, flash ? "#fff" : "#2b513d");
        ctx.fillStyle = flash ? "#fff" : "#356c4b";
        ctx.beginPath(); ctx.moveTo(-35, 16); ctx.lineTo(-19, 6); ctx.lineTo(20, 8); ctx.lineTo(39, 23); ctx.lineTo(30, 68); ctx.lineTo(0, 79); ctx.lineTo(-32, 67); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#8affab"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#d9e3dc";
        ctx.beginPath(); ctx.moveTo(-28, 28); ctx.lineTo(-10, 24); ctx.lineTo(-2, 67); ctx.lineTo(-24, 73); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(28, 28); ctx.lineTo(10, 24); ctx.lineTo(2, 67); ctx.lineTo(24, 73); ctx.closePath(); ctx.fill();
        // 거대한 전완과 주먹. 콤보 도중에는 앞쪽 주먹이 크게 튀어나온다.
        const punchLead = (enemy.bossAction === "mutantCombo" || enemy.bossAction === "mutantSmash") ? 18 : 0;
        for (const side of [-1, 1]) {
          const armX = side * (36 + (side === enemy.facing ? punchLead : 0));
          limb(side * 22, 31, armX, 58 + side * motion * 3, 19, flash ? "#fff" : "#477b59");
          ctx.fillStyle = flash ? "#fff" : "#294b39"; ctx.beginPath(); ctx.arc(armX + side * 6, 64, 15, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#91ffaf"; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.fillStyle = "#1e2a24"; ctx.beginPath(); ctx.arc(0, 12, 19, 0, TAU); ctx.fill();
        ctx.fillStyle = "#9dffb6"; ctx.fillRect(-11, 9, 22, 5);
        for (let vein = -1; vein <= 1; vein += 1) {
          ctx.strokeStyle = "rgba(132,255,166,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(vein * 9, 26); ctx.lineTo(vein * 14, 49); ctx.stroke();
        }
      } else {
        limb(-12, 56, -18 - motion * 4, 80, 9, flash ? "#fff" : "#263b35");
        limb(12, 56, 18 + motion * 4, 80, 9, flash ? "#fff" : "#263b35");
        ctx.fillStyle = "#243b35"; ctx.fillRect(-31, 22, 13, 42); ctx.fillRect(19, 22, 13, 42);
        ctx.fillStyle = flash ? "#fff" : "#d9e3dc"; ctx.beginPath(); ctx.moveTo(-22, 20); ctx.lineTo(22, 20); ctx.lineTo(31, 72); ctx.lineTo(12, 64); ctx.lineTo(0, 79); ctx.lineTo(-12, 64); ctx.lineTo(-31, 72); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#2b3036"; ctx.beginPath(); ctx.arc(0, 13, 17, 0, TAU); ctx.fill();
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(-7, 12, 7, 0, TAU); ctx.arc(7, 12, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = "#07100c"; ctx.beginPath(); ctx.arc(-7, 12, 3, 0, TAU); ctx.arc(7, 12, 3, 0, TAU); ctx.fill();
        for (let bottle = 0; bottle < 3; bottle += 1) {
          ctx.fillStyle = bottle % 2 ? "#ce72ff" : accent; ctx.fillRect(-19 + bottle * 13, 46, 8, 16);
          ctx.fillStyle = "#eaffef"; ctx.fillRect(-17 + bottle * 13, 43, 4, 4);
        }
        // 반피 투약: 목 옆에 주사기를 꽂고 약물이 몸 전체로 번지는 과정을 보여 준다.
        ctx.save();
        ctx.translate(26, injecting ? 18 : 35);
        ctx.rotate(injecting ? -1.22 : -0.35 + motion * 0.05);
        ctx.fillStyle = "#26343b"; ctx.fillRect(0, -5, 34, 10);
        ctx.fillStyle = injecting ? "#70ff9b" : accent; ctx.fillRect(22, -3, 15, 6);
        ctx.fillStyle = "#e7fff0"; ctx.fillRect(35, -1, 13, 2);
        ctx.restore();
        if (injecting) {
          ctx.strokeStyle = `rgba(112,255,155,${0.5 + pulse * 0.45})`; ctx.lineWidth = 3;
          for (let ring = 0; ring < 3; ring += 1) { ctx.beginPath(); ctx.arc(0, 36, 22 + ring * 11 + pulse * 4, 0, TAU); ctx.stroke(); }
        }
      }
        } else {
      return false;
    }

    if (chargingShot) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = accent; ctx.lineWidth = 2 + chargeProgress * 3;
      ctx.beginPath(); ctx.arc(58, 35, 7 + chargeProgress * 13, 0, TAU); ctx.stroke(); ctx.restore();
    }
    return true;
  }

  function drawDetailedBossCharacter(enemy, bossKind, accent, pulse, chargeProgress, chargingShot, rawBossKind = bossKind) {
    const flash = enemy.hurt > 0;
    const motion = Math.sin(enemy.anim * 5.2);
    const fastMotion = Math.sin(enemy.anim * 10.5);

    if (drawSpecialBossCharacter(enemy, rawBossKind, accent, pulse, chargeProgress, chargingShot)) return;

    if (bossKind === "warden") {
      // 저중심 무한궤도 포격 기체: 전차 하부와 인간형 포수 상부를 분리한다.
      ctx.fillStyle = flash ? "#ffffff" : "#18282f";
      ctx.fillRect(-43, 60, 86, 20);
      ctx.fillStyle = "#080f14";
      ctx.fillRect(-39, 64, 78, 18);
      ctx.fillStyle = "#4e6870";
      for (let tread = -34; tread <= 34; tread += 11) {
        ctx.beginPath();
        ctx.arc(tread, 73 + Math.sin(enemy.anim * 8 + tread) * 1.2, 5, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(-44, 59, 88, 23);
      ctx.fillStyle = flash ? "#fff" : "#29434b";
      ctx.beginPath();
      ctx.moveTo(-30, 60);
      ctx.lineTo(-24, 32);
      ctx.lineTo(-13, 20);
      ctx.lineTo(17, 20);
      ctx.lineTo(29, 34);
      ctx.lineTo(33, 60);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#87a2a6";
      ctx.fillRect(-13, 22, 28, 13);
      ctx.fillStyle = "#0b151b";
      ctx.fillRect(-8, 26, 20, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(2, 27, 10, 3);
      // 후방 쌍포와 전방 오연장 포구.
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * 20, 25);
        ctx.rotate(side * 0.08 - 0.18 - chargeProgress * 0.16);
        ctx.fillStyle = "#526d74";
        ctx.fillRect(-5, -28, 10, 38);
        ctx.fillStyle = accent;
        ctx.fillRect(-3, -32, 6, 8);
        ctx.restore();
      }
      ctx.fillStyle = "#9bb0b2";
      ctx.fillRect(22, 40, 44, 8);
      ctx.fillStyle = "#263a40";
      ctx.fillRect(28, 49, 34, 8);
      for (let muzzle = 0; muzzle < 5; muzzle += 1) {
        ctx.fillStyle = muzzle % 2 ? "#49646a" : "#b5c7c8";
        ctx.fillRect(59 + (muzzle % 2) * 3, 39 + muzzle * 4, 13, 3);
      }
      ctx.fillStyle = chargingShot ? "#ff304f" : accent;
      ctx.beginPath();
      ctx.arc(50, 52, 4 + chargeProgress * 5, 0, TAU);
      ctx.fill();
    } else if (bossKind === "furnace") {
      // 가늘고 빠른 총기 융합형 실루엣: 관절과 포신이 몸의 윤곽을 만든다.
      ctx.strokeStyle = flash ? "#ffffff" : "#612f2a";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-13, 55);
      ctx.lineTo(-20 + motion * 4, 91);
      ctx.moveTo(13, 55);
      ctx.lineTo(23 - motion * 4, 91);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = flash ? "#fff" : "#3b1717";
      ctx.beginPath();
      ctx.moveTo(-23, 28);
      ctx.lineTo(-12, 15);
      ctx.lineTo(17, 18);
      ctx.lineTo(25, 55);
      ctx.lineTo(0, 68);
      ctx.lineTo(-24, 54);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      for (let rib = 0; rib < 4; rib += 1) {
        ctx.beginPath();
        ctx.moveTo(-18 + rib, 31 + rib * 7);
        ctx.lineTo(18 - rib, 29 + rib * 7);
        ctx.stroke();
      }
      // 총열 머리와 양팔 다연장 포신.
      ctx.fillStyle = "#c69a82";
      ctx.fillRect(-9, 3, 40, 11);
      ctx.fillStyle = "#2b1212";
      ctx.fillRect(-15, 8, 21, 14);
      ctx.fillStyle = accent;
      ctx.fillRect(24, 6, 13, 5);
      for (const arm of [-1, 1]) {
        const armY = 35 + arm * motion * 4;
        ctx.save();
        ctx.translate(arm * 20, armY);
        ctx.rotate(arm * (0.22 + fastMotion * 0.04));
        ctx.fillStyle = "#754034";
        ctx.fillRect(arm < 0 ? -48 : 0, -7, 48, 14);
        ctx.fillStyle = "#d6a17c";
        for (let barrel = 0; barrel < 3; barrel += 1) {
          ctx.fillRect(arm < 0 ? -60 : 42, -7 + barrel * 5, 20, 3);
        }
        ctx.restore();
      }
      ctx.fillStyle = `rgba(255, 123, 98, ${0.45 + pulse * 0.35})`;
      ctx.beginPath();
      ctx.arc(0, 48, 7 + pulse * 2, 0, TAU);
      ctx.fill();
    } else if (bossKind === "weaver") {
      // 부유 대마법사 본체에는 마법진을 붙이지 않는다. 모든 진은 월드 좌표에 소환된다.
      ctx.fillStyle = flash ? "#ffffff" : "#1d162c";
      ctx.beginPath();
      ctx.moveTo(-17, 30);
      ctx.lineTo(-34, 82 + motion * 3);
      ctx.lineTo(0, 72);
      ctx.lineTo(35, 82 - motion * 3);
      ctx.lineTo(18, 29);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#eee6f4";
      ctx.beginPath();
      ctx.moveTo(-14, 7);
      ctx.lineTo(14, 7);
      ctx.lineTo(19, 25);
      ctx.lineTo(0, 34);
      ctx.lineTo(-18, 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2c173e";
      ctx.fillRect(-9, 15, 18, 5);
      ctx.fillStyle = accent;
      ctx.fillRect(2, 16, 7, 3);
      // 비전 지팡이와 전방 마법진.
      ctx.strokeStyle = "#b9a1ca";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(24, 24);
      ctx.lineTo(50, 82);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(22, 20, 10 + pulse * 2, 0, TAU);
      ctx.stroke();
    } else {
      // 흑마법사 무명: 기계 날개 대신 후드, 찢어진 망토, 소환 구체로 구성한다.
      ctx.fillStyle = "rgba(4, 2, 11, 0.82)";
      ctx.beginPath();
      ctx.ellipse(0, 86, 34 + pulse * 4, 9, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = flash ? "#ffffff" : "#120d1d";
      ctx.beginPath();
      ctx.moveTo(-20, 23);
      ctx.lineTo(-38, 87);
      ctx.lineTo(-14, 76 + motion * 3);
      ctx.lineTo(0, 92);
      ctx.lineTo(15, 76 - motion * 3);
      ctx.lineTo(39, 87);
      ctx.lineTo(20, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6d3da8";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#272034";
      ctx.beginPath();
      ctx.arc(0, 20, 25, Math.PI, TAU);
      ctx.lineTo(18, 39);
      ctx.lineTo(-18, 39);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#05030a";
      ctx.beginPath();
      ctx.ellipse(0, 26, 13, 9, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-8, 24, 5, 3);
      ctx.fillRect(4, 24, 5, 3);
      for (const hand of [-1, 1]) {
        const hx = hand * (43 + Math.sin(enemy.anim * 2.2 + hand) * 6);
        const hy = 48 + Math.cos(enemy.anim * 2.7 + hand) * 8;
        ctx.strokeStyle = "#655174";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hand * 17, 42);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(hx, hy, 8 + pulse * 2, 0, TAU);
        ctx.stroke();
      }
      const summonCount = Math.min(4, enemies.filter((candidate) => candidate.alive && candidate.summonedByBossId === enemy.id).length);
      for (let orb = 0; orb < summonCount; orb += 1) {
        const angle = game.time * 1.4 + orb * TAU / Math.max(1, summonCount);
        ctx.fillStyle = "#8b4dff";
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * 43, 48 + Math.sin(angle) * 25, 4, 0, TAU);
        ctx.fill();
      }
      if (enemy.barrierTimer > 0) {
        const barrierPulse = 1 + Math.sin(game.time * 15) * 0.035;
        ctx.save();
        ctx.translate(0, 48);
        ctx.scale(barrierPulse, barrierPulse);
        ctx.rotate(game.time * 0.8);
        ctx.fillStyle = "rgba(138, 69, 255, 0.09)";
        ctx.strokeStyle = "rgba(211, 160, 255, 0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let side = 0; side < 6; side += 1) {
          const angle = -Math.PI / 2 + side * TAU / 6;
          const x = Math.cos(angle) * 54;
          const y = Math.sin(angle) * 66;
          if (side === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-game.time * 1.7);
        ctx.strokeStyle = "rgba(255, 73, 108, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 62, -1.1, 1.5);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (chargingShot && bossKind !== "weaver" && rawBossKind !== "revenant") {
      const muzzleX = bossKind === "warden" ? 72 : 62;
      const muzzleY = bossKind === "warden" ? 50 : 42;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = bossKind === "warden" && enemy.bossShotPattern === "warden-core" ? "#ff304f" : accent;
      ctx.lineWidth = 2 + chargeProgress * 3;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 6 + chargeProgress * 13 + Math.sin(game.time * 28) * 2, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, 2 + chargeProgress * 6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemy(enemy) {
    if (!enemy.alive) return;
    drawEnemyTelegraph(enemy);
    if ((enemy.burnTimer || 0) > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let flame = 0; flame < 5; flame += 1) {
        const flameX = enemy.x + enemy.w * (0.16 + flame * 0.17);
        const flameBaseY = enemy.y + enemy.h * (0.88 - (flame % 2) * 0.12);
        const flameHeight = 12 + Math.sin(game.time * 22 + flame * 2.3) * 5;
        ctx.fillStyle = flame % 2 ? "rgba(255, 190, 62, 0.72)" : "rgba(255, 76, 34, 0.68)";
        ctx.beginPath();
        ctx.moveTo(flameX - 6, flameBaseY);
        ctx.lineTo(flameX, flameBaseY - flameHeight);
        ctx.lineTo(flameX + 6, flameBaseY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    if (enemy.type === "boss" && enemy.bossKind === "echo") {
      const echoPulse = 0.5 + Math.sin(game.time * 5.4) * 0.2;
      const echoCharge = enemy.bossAction === "chargeShot" && enemy.windup > 0
        ? clamp(1 - enemy.windup / Math.max(0.01, enemy.bossChargeDuration), 0, 1)
        : 0;
      const echoAccent = BOSS_DEFINITIONS[enemy.bossKind]?.accent || BOSS_DEFINITIONS.echo.accent;
      drawBossIdentityHalo(enemy.x + enemy.w / 2, enemy.y + enemy.h * 0.5, "echo", echoAccent, echoPulse, echoCharge);
      const playerPose = {
        vx: player.vx,
        vy: player.vy,
        grounded: player.grounded,
        wallLeft: player.wallLeft,
        wallRight: player.wallRight,
        runCycle: player.runCycle,
        squash: player.squash,
        attackTimer: player.attackTimer,
        attackDuration: player.attackDuration,
        attackDir: player.attackDir,
        chargedAttack: player.chargedAttack,
      };
      const echoDrawingSword = ["echoSlash", "echoCounter", "echoDash"].includes(enemy.bossAction);
      Object.assign(player, {
        vx: enemy.vx,
        vy: enemy.vy,
        grounded: enemy.grounded,
        wallLeft: false,
        wallRight: false,
        runCycle: enemy.anim * 6,
        squash: clamp(Math.abs(enemy.vy) / 1800, 0, 0.18),
        attackTimer: echoDrawingSword ? Math.max(0.04, enemy.windup || 0.1) : 0,
        attackDuration: 0.4,
        attackDir: { x: enemy.facing, y: enemy.bossAction === "echoCounter" ? -0.24 : 0.08 },
        chargedAttack: enemy.bossAction === "echoCounter",
      });
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#05020b";
      ctx.beginPath();
      ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h + 3, 19, 5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      const echoSpeed = clamp(Math.abs(enemy.vx) / 420, 0, 1);
      if (echoSpeed > 0.45 || enemy.bossAction === "echoCounter") {
        for (let trailIndex = 2; trailIndex >= 1; trailIndex -= 1) {
          ctx.save();
          ctx.globalAlpha = (0.04 + echoSpeed * 0.05) * trailIndex;
          drawPlayerBody(enemy.x - enemy.facing * trailIndex * 15, enemy.y, enemy.facing, 1, true, "echo");
          ctx.restore();
        }
      }

      ctx.save();
      if (enemy.hurt > 0) ctx.globalCompositeOperation = "screen";
      drawPlayerBody(enemy.x, enemy.y, enemy.facing, enemy.hurt > 0 ? 0.92 : 1, false, "echo");
      ctx.restore();

      if (enemy.bossAction === "chargeShot" && enemy.bossShotPattern === "echo-shotgun") {
        ctx.save();
        ctx.translate(enemy.x + enemy.w / 2 + enemy.facing * 13, enemy.y + 34);
        ctx.scale(enemy.facing, 1);
        ctx.fillStyle = "#241934"; ctx.fillRect(0, -5, 28, 10);
        ctx.fillStyle = "#c9a7ff"; ctx.fillRect(19, -3, 19, 3); ctx.fillRect(19, 2, 19, 3);
        ctx.restore();
      }
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "700 10px monospace";
      ctx.fillStyle = "#b994ff";
      ctx.fillText("ECHO // 00", enemy.x + enemy.w / 2, enemy.y - 18);
      ctx.font = "700 8px monospace";
      ctx.fillStyle = "rgba(99,255,198,0.82)";
      ctx.fillText("READ // " + (enemy.echoReadout || "SCAN"), enemy.x + enemy.w / 2, enemy.y - 8);
      ctx.fillStyle = "rgba(99, 255, 198, 0.62)";
      ctx.fillRect(enemy.x + enemy.w / 2 - 18, enemy.y - 10, 36, 1);
      ctx.restore();
      Object.assign(player, playerPose);
      return;
    }
    const variant = hash(enemy.originX * 0.17 + enemy.maxHp);
    const damageRatio = 1 - enemy.hp / enemy.maxHp;
    const enemyGaitPhase = enemy.anim * (enemy.type === "runner" ? 10 : 6);
    const enemyGaitFrame = ((Math.floor(enemyGaitPhase / (TAU / 8)) % 8) + 8) % 8;
    const enemyGaitPoses = [0.86, 0.48, 0, -0.5, -0.88, -0.46, 0, 0.52];
    const locomotion = enemyGaitPoses[enemyGaitFrame];
    const movingRatio = clamp(Math.abs(enemy.vx) / 110, 0, 1);
    const bodyBob = enemy.type === "drone"
      ? Math.sin(enemy.anim * 3.4) * 2
      : Math.abs(locomotion) * movingRatio * 2 + Math.sin(enemy.anim * 2.1) * 0.45;
    const shadowScale = enemy.type === "drone" ? 0.55 : 1 - bodyBob * 0.025;
    ctx.save();
    ctx.globalAlpha = enemy.type === "drone" ? 0.14 : 0.24;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h + (enemy.type === "drone" ? 38 : 3), enemy.w * 0.46 * shadowScale, 5 * shadowScale, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(Math.round(enemy.x + enemy.w / 2), Math.round(enemy.y + bodyBob));
    ctx.scale(enemy.facing, 1);
    if (enemy.type === "drone") ctx.rotate(Math.sin(enemy.anim * 2.8) * 0.08);
    else ctx.rotate(clamp(enemy.vx * enemy.facing / 900, -0.08, 0.1));
    if (enemy.hurt > 0) ctx.globalCompositeOperation = "screen";

    function drawRobotSegment(x1, y1, x2, y2, width, shell, accent) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.hypot(dx, dy);
      ctx.save();
      ctx.translate(Math.round(x1), Math.round(y1));
      ctx.rotate(Math.atan2(dx, dy));
      ctx.fillStyle = "#070c13";
      ctx.fillRect(-width / 2 - 1, -1, width + 2, Math.ceil(length) + 2);
      ctx.fillStyle = shell;
      ctx.fillRect(-width / 2, 0, width, Math.ceil(length));
      ctx.fillStyle = "rgba(220, 239, 240, 0.24)";
      ctx.fillRect(-width / 2 + 1, 1, 2, Math.max(2, Math.floor(length) - 2));
      ctx.fillStyle = accent;
      ctx.fillRect(width / 2 - 2, 2, 2, Math.max(2, Math.floor(length) - 4));
      ctx.restore();
    }

    function drawRobotLeg(hipX, hipY, phase, upperLength, lowerLength, width, accent, heavy = false) {
      const gaitFrame = ((Math.floor(phase / (TAU / 8)) % 8) + 8) % 8;
      const gait = enemyGaitPoses[gaitFrame];
      const strideAmount = (heavy ? 0.34 : 0.58) * movingRatio;
      const upperAngle = gait * strideAmount;
      const kneeLift = Math.max(0, gait) * movingRatio;
      const kneeBend = (heavy ? 0.12 : 0.18) + kneeLift * (heavy ? 0.48 : 0.82);
      const kneeX = Math.round(hipX + Math.sin(upperAngle) * upperLength);
      const kneeY = Math.round(hipY + Math.cos(upperAngle) * upperLength);
      const shinAngle = upperAngle - kneeBend;
      const footX = Math.round(kneeX + Math.sin(shinAngle) * lowerLength);
      const footY = Math.round(kneeY + Math.cos(shinAngle) * lowerLength);
      const rearShell = heavy ? "#241b26" : "#111c29";
      const frontShell = heavy ? "#5b3448" : "#324b5b";
      drawRobotSegment(hipX, hipY, kneeX, kneeY, width, rearShell, accent);
      drawRobotSegment(kneeX, kneeY, footX, footY, Math.max(5, width - 1), frontShell, accent);
      ctx.fillStyle = "#080e16";
      ctx.beginPath();
      ctx.arc(Math.round(kneeX), Math.round(kneeY), width * 0.72, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.round(kneeX), Math.round(kneeY), Math.max(2, width * 0.38), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = "rgba(174, 209, 214, 0.46)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(hipX), Math.round(hipY));
      ctx.lineTo(Math.round(kneeX + width * 0.65), Math.round(kneeY));
      ctx.stroke();
      ctx.fillStyle = "#070d15";
      ctx.fillRect(Math.round(footX - 4), Math.round(footY - 2), heavy ? 17 : 13, heavy ? 8 : 6);
      ctx.fillStyle = heavy ? "#75435b" : "#506b79";
      ctx.fillRect(Math.round(footX - 1), Math.round(footY - 1), heavy ? 13 : 9, 3);
      ctx.fillStyle = accent;
      ctx.fillRect(Math.round(footX + (heavy ? 10 : 7)), Math.round(footY), 3, 2);
    }

    if (enemy.type === "drone") {
      const rotor = Math.sin(enemy.anim * 26) * 7;
      ctx.strokeStyle = "rgba(163, 215, 222, 0.52)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-29 - rotor, 7);
      ctx.lineTo(-9 + rotor, 7);
      ctx.moveTo(9 - rotor, 7);
      ctx.lineTo(29 + rotor, 7);
      ctx.stroke();
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#1b2431";
      ctx.beginPath();
      ctx.moveTo(-24, 12);
      ctx.lineTo(-16, 6);
      ctx.lineTo(16, 6);
      ctx.lineTo(24, 12);
      ctx.lineTo(19, 29);
      ctx.lineTo(-19, 29);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3e5363";
      ctx.fillRect(-14, 3, 28, 28);
      ctx.fillStyle = variant > 0.5 ? "#607987" : "#526977";
      ctx.fillRect(-10, 7, 20, 7);
      ctx.fillStyle = "#101923";
      ctx.beginPath();
      ctx.arc(0, 17, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(101,245,234,0.52)";
      ctx.beginPath();
      ctx.arc(0, 17, 5 + Math.sin(enemy.anim * 4) * 0.7, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = palette.red;
      ctx.beginPath();
      ctx.arc(2, 17, 2.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(101, 245, 234, 0.7)";
      const flame = 6 + Math.sin(enemy.anim * 18) * 3;
      ctx.fillRect(-14, 29, 6, flame);
      ctx.fillRect(8, 29, 6, flame);
      ctx.fillStyle = palette.red;
      ctx.fillRect(13, 12, 7, 6);
      ctx.fillStyle = "#a2bdc4";
      ctx.fillRect(-27, 11, 5, 3);
      ctx.fillRect(22, 11, 5, 3);
      ctx.fillStyle = "#07111a";
      ctx.fillRect(-13, 28, 6, 5);
      ctx.fillRect(7, 28, 6, 5);
      ctx.fillStyle = "rgba(255, 73, 108, 0.35)";
      ctx.fillRect(-30, 14, 8, 3);
      ctx.fillRect(22, 14, 8, 3);
    } else if (enemy.type === "turret") {
      const aimY = enemy.targetY ?? player.y + player.h / 2;
      const aimX = enemy.targetX ?? player.x + player.w / 2;
      const aimAngle = clamp(Math.atan2(aimY - (enemy.y + enemy.h * 0.42), Math.abs(aimX - (enemy.x + enemy.w / 2))), -0.62, 0.62);
      const cannonRecoil = clamp((enemy.turretRecoil || 0) / 0.2, 0, 1) * 11;
      ctx.fillStyle = "#101820";
      ctx.fillRect(-25, 40, 50, 9);
      ctx.fillStyle = "#48535a";
      ctx.beginPath();
      ctx.moveTo(-29, 42); ctx.lineTo(-20, 25); ctx.lineTo(20, 25); ctx.lineTo(29, 42); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ffcf62"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#28343b";
      ctx.beginPath(); ctx.arc(0, 24, 20, Math.PI, TAU); ctx.lineTo(20, 31); ctx.lineTo(-20, 31); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#121a20";
      ctx.beginPath(); ctx.arc(0, 24, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffcf62";
      ctx.beginPath(); ctx.arc(2, 24, 4 + Math.sin(enemy.anim * 5) * 0.6, 0, TAU); ctx.fill();
      ctx.save();
      ctx.translate(7 - cannonRecoil, 23);
      ctx.rotate(aimAngle);
      ctx.fillStyle = "#1a2329";
      ctx.beginPath(); ctx.arc(3, 0, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = "#8f9ca1";
      ctx.beginPath();
      ctx.moveTo(3, -8); ctx.lineTo(39, -7); ctx.lineTo(44, -11); ctx.lineTo(51, -11);
      ctx.lineTo(51, 11); ctx.lineTo(44, 11); ctx.lineTo(39, 7); ctx.lineTo(3, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#cbd4d7"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#273137";
      ctx.fillRect(39, -13, 11, 26);
      ctx.fillStyle = "#070b0e";
      ctx.fillRect(47, -8, 6, 16);
      ctx.strokeStyle = "#ffcf62";
      ctx.strokeRect(40, -11, 8, 22);
      ctx.restore();
    } else if (enemy.type === "mortarTurret") {
      const chargePulse = enemy.windup > 0 ? 0.55 + Math.sin(enemy.anim * 22) * 0.28 : 0.2;
      ctx.fillStyle = "#11171d";
      ctx.fillRect(-31, 49, 62, 10);
      ctx.fillStyle = "#4d3b40";
      ctx.beginPath();
      ctx.moveTo(-34, 51); ctx.lineTo(-23, 34); ctx.lineTo(23, 34); ctx.lineTo(34, 51); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ff8066"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#30262d";
      ctx.beginPath(); ctx.arc(0, 34, 23, Math.PI, TAU); ctx.lineTo(23, 41); ctx.lineTo(-23, 41); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#11171d";
      ctx.beginPath(); ctx.arc(0, 34, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(255, 128, 102, ${chargePulse})`;
      ctx.beginPath(); ctx.arc(0, 34, 5, 0, TAU); ctx.fill();
      for (let barrel = -1; barrel <= 1; barrel += 1) {
        ctx.save();
        ctx.translate(barrel * 11, 31);
        ctx.rotate(-1.08 + barrel * 0.12);
        ctx.fillStyle = barrel === 0 ? "#a7afb2" : "#727f84";
        ctx.fillRect(0, -6, 43, 12);
        ctx.fillStyle = "#252d31";
        ctx.fillRect(34, -9, 11, 18);
        ctx.fillStyle = "#080b0d";
        ctx.fillRect(41, -6, 6, 12);
        ctx.strokeStyle = "#ff8066"; ctx.lineWidth = 1.5;
        ctx.strokeRect(35, -8, 8, 16);
        ctx.restore();
      }
      ctx.fillStyle = "#88969c";
      ctx.fillRect(-21, 54, 42, 3);
    } else if (enemy.type === "gunner" || enemy.type === "machinegun" || enemy.type === "piercer" || enemy.type === "mortar") {
      const isMachinegun = enemy.type === "machinegun";
      const isPiercer = enemy.type === "piercer";
      const isMortar = enemy.type === "mortar";
      const recoil = enemy.windup > 0 || enemy.burstRemaining > 0 ? Math.sin(enemy.anim * 45) * (isMachinegun ? 4 : 3) : 0;
      const gunnerAccent = isMortar ? palette.red : isPiercer ? "#79dfff" : isMachinegun ? "#ff8066" : palette.amber;
      const gunLength = isMortar ? 31 : isMachinegun ? 49 : isPiercer ? 44 : 36;
      const gunHeight = isMortar ? 14 : isMachinegun ? 12 : 9;
      const muzzleX = isMortar ? 24 : isMachinegun ? 42 : isPiercer ? 37 : 29;
      drawRobotLeg(-7, 40, enemy.anim * 6 + Math.PI, 9, 9, 7, gunnerAccent, isMortar || isMachinegun);
      drawRobotLeg(7, 40, enemy.anim * 6, 9, 9, 7, gunnerAccent, isMortar || isMachinegun);
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : isMortar ? "#382b36" : isPiercer ? "#1b3443" : isMachinegun ? "#303744" : "#202d3b";
      ctx.beginPath();
      ctx.moveTo(-19, 19);
      ctx.lineTo(-11, 14);
      ctx.lineTo(14, 17);
      ctx.lineTo(19, 45);
      ctx.lineTo(8, 51);
      ctx.lineTo(-13, 48);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = variant > 0.5 ? "#344957" : "#2c3d4a";
      ctx.beginPath();
      ctx.moveTo(-19, 20);
      ctx.lineTo(-10, 14);
      ctx.lineTo(-4, 23);
      ctx.lineTo(-14, 29);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#506b79";
      ctx.fillRect(-11, 23, 20, 14);
      ctx.strokeStyle = "rgba(184,220,226,0.36)";
      ctx.strokeRect(-8, 25, 14, 10);
      ctx.fillStyle = "#111b25";
      ctx.fillRect(-8, 40, 17, 4);
      ctx.fillStyle = "#8299a2";
      ctx.fillRect(-6, 41, 3, 2);
      ctx.fillRect(0, 41, 3, 2);
      ctx.fillStyle = gunnerAccent;
      ctx.globalAlpha = 0.48 + Math.sin(enemy.anim * 5) * 0.18;
      ctx.fillRect(-7, 27, 12, 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#71828b";
      ctx.beginPath();
      ctx.moveTo(-12, 3);
      ctx.lineTo(9, 3);
      ctx.lineTo(15, 11);
      ctx.lineTo(9, 24);
      ctx.lineTo(-13, 21);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#344651";
      ctx.beginPath();
      ctx.moveTo(-7, 5);
      ctx.lineTo(-10, 17);
      ctx.lineTo(-3, 22);
      ctx.moveTo(4, 4);
      ctx.lineTo(7, 10);
      ctx.stroke();
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 9, 15, 6);
      ctx.fillStyle = enemy.windup > 0 ? palette.white : isPiercer ? "#79dfff" : isMachinegun ? "#ff8066" : palette.red;
      ctx.fillRect(8, 10, 6, 4);
      ctx.save();
      ctx.translate(10 - recoil, 29);
      ctx.rotate((isMortar ? -0.52 : 0) + Math.sin(enemy.anim * 2.2) * 0.025);
      ctx.fillStyle = isMortar ? "#a8757f" : isPiercer ? "#7fb9ca" : isMachinegun ? "#8d98a6" : "#93aeb8";
      ctx.fillRect(0, -gunHeight / 2, gunLength, gunHeight);
      ctx.fillStyle = "#d6e0e1";
      ctx.fillRect(4, isMortar ? -4 : isMachinegun ? -4 : -2, isMortar ? 13 : isMachinegun ? 29 : isPiercer ? 26 : 18, 2);
      ctx.fillStyle = "#283844";
      ctx.fillRect(8, 5, 10, 7);
      ctx.fillStyle = gunnerAccent;
      ctx.fillRect(muzzleX, isMortar ? -5 : isMachinegun ? -4 : -2, isMortar ? 10 : isMachinegun ? 11 : 9, isMortar ? 10 : isMachinegun ? 8 : 5);
      if (isMachinegun) {
        ctx.fillStyle = "#171d27";
        ctx.fillRect(9, 7, 17, 13);
        ctx.strokeStyle = "#d9e0e4";
        ctx.lineWidth = 2;
        for (let barrel = -1; barrel <= 1; barrel += 1) {
          ctx.beginPath();
          ctx.moveTo(24, barrel * 3);
          ctx.lineTo(54, barrel * 3);
          ctx.stroke();
        }
        ctx.fillStyle = gunnerAccent;
        ctx.fillRect(50, -5, 7, 10);
        ctx.fillStyle = "rgba(255,128,102,0.5)";
        ctx.fillRect(14, 11, 8, 5);
      }
      ctx.fillStyle = "#111923";
      ctx.fillRect(23, -5, 5, 3);
      ctx.restore();
      if (enemy.windup > 0) {
        ctx.fillStyle = isPiercer
          ? `rgba(121, 223, 255, ${0.35 + Math.sin(enemy.windup * 40) * 0.25})`
          : `rgba(255, 100, 120, ${0.35 + Math.sin(enemy.windup * 40) * 0.25})`;
        ctx.beginPath();
        ctx.arc((isMachinegun ? 59 : isPiercer ? 52 : 44) - recoil, isMortar ? 12 : 31, isMortar ? 10 : isMachinegun ? 9 : 7, 0, TAU);
        ctx.fill();
      }
    } else if (enemy.type === "shield") {
      drawRobotLeg(-8, 48, enemy.anim * 5 + Math.PI, 10, 9, 8, palette.amber, true);
      drawRobotLeg(7, 48, enemy.anim * 5, 10, 9, 8, palette.amber, true);
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#282b37";
      ctx.beginPath();
      ctx.moveTo(-18, 19);
      ctx.lineTo(-8, 13);
      ctx.lineTo(13, 18);
      ctx.lineTo(18, 54);
      ctx.lineTo(7, 62);
      ctx.lineTo(-14, 58);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = variant > 0.5 ? "#3d414e" : "#343844";
      ctx.beginPath();
      ctx.moveTo(-17, 23);
      ctx.lineTo(-8, 17);
      ctx.lineTo(3, 22);
      ctx.lineTo(0, 39);
      ctx.lineTo(-13, 43);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(154,181,190,0.32)";
      ctx.beginPath();
      ctx.moveTo(-10, 26);
      ctx.lineTo(-2, 29);
      ctx.lineTo(-4, 38);
      ctx.stroke();
      ctx.fillStyle = "#667984";
      ctx.beginPath();
      ctx.moveTo(-13, 4);
      ctx.lineTo(7, 1);
      ctx.lineTo(14, 10);
      ctx.lineTo(8, 25);
      ctx.lineTo(-12, 23);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#303f49";
      ctx.fillRect(-12, 7, 7, 13);
      ctx.fillStyle = "#91a5ac";
      ctx.fillRect(-10, 9, 3, 7);
      ctx.fillStyle = palette.red;
      ctx.fillRect(5, 10, 6, 4);
      const guardBroken = enemy.shieldBreakTimer > 0;
      const shieldPush = guardBroken ? -10 : enemy.windup > 0 ? 6 + Math.sin(enemy.windup * 25) * 2 : 0;
      ctx.fillStyle = guardBroken ? "#4d2830" : "#283f4d";
      ctx.beginPath();
      ctx.moveTo(14 + shieldPush, 8);
      ctx.lineTo(31 + shieldPush, 13);
      ctx.lineTo(34 + shieldPush, 55);
      ctx.lineTo(24 + shieldPush, 66);
      ctx.lineTo(13 + shieldPush, 58);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = guardBroken ? "#8f4b53" : "#5c717b";
      ctx.beginPath();
      ctx.moveTo(18 + shieldPush, 14);
      ctx.lineTo(27 + shieldPush, 17);
      ctx.lineTo(29 + shieldPush, 49);
      ctx.lineTo(22 + shieldPush, 57);
      ctx.lineTo(18 + shieldPush, 53);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = guardBroken ? palette.red : palette.amber;
      ctx.fillRect(28 + shieldPush, 18, 3, 36);
      ctx.fillStyle = "#111925";
      ctx.beginPath();
      ctx.arc(21 + shieldPush, 22, 2, 0, TAU);
      ctx.arc(23 + shieldPush, 49, 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = guardBroken ? palette.red : palette.amber;
      ctx.globalAlpha = 0.45 + Math.sin(enemy.anim * 7) * 0.2;
      ctx.fillRect(18 + shieldPush, 33, 8, 3);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = guardBroken
        ? `rgba(255, 73, 108, ${0.42 + Math.sin(enemy.anim * 12) * 0.16})`
        : `rgba(255, 205, 112, ${0.18 + Math.sin(enemy.anim * 5) * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(14 + shieldPush, 8);
      ctx.lineTo(31 + shieldPush, 13);
      ctx.lineTo(34 + shieldPush, 55);
      ctx.lineTo(24 + shieldPush, 66);
      ctx.lineTo(13 + shieldPush, 58);
      ctx.closePath();
      ctx.stroke();
      for (let guardIndex = 0; guardIndex < enemy.shieldGuardMax; guardIndex += 1) {
        ctx.fillStyle = guardIndex < enemy.shieldGuard ? palette.amber : "rgba(255,255,255,0.14)";
        ctx.fillRect(14 + guardIndex * 9, 70, 6, 3);
      }
    } else if (enemy.type === "boss") {
      const pulse = 0.5 + Math.sin(game.time * 6) * 0.2;
      const shoulder = Math.sin(enemy.anim * 3.5) * 5;
      const rawBossKind = enemy.bossKind || "warden";
      const bossKind = getBossArchetype(rawBossKind);
      const bossAccent = BOSS_DEFINITIONS[rawBossKind]?.accent || palette.red;
      const chargingShot = enemy.bossAction === "chargeShot" && enemy.windup > 0;
      const chargeProgress = chargingShot
        ? clamp(1 - enemy.windup / Math.max(0.01, enemy.bossChargeDuration), 0, 1)
        : 0;
      drawBossIdentityHalo(0, 49, bossKind, bossAccent, pulse, chargeProgress);
      drawDetailedBossCharacter(enemy, bossKind, bossAccent, pulse, chargeProgress, chargingShot, rawBossKind);
      ctx.restore();
      return;
      if (bossKind === "weaver") {
        ctx.strokeStyle = `rgba(215, 160, 255, ${0.32 + pulse * 0.32})`;
        ctx.lineWidth = 3;
        for (let shard = -1; shard <= 1; shard += 1) {
          const shardX = shard * 22 + Math.sin(enemy.anim * 1.8 + shard) * 5;
          const shardY = 73 + Math.cos(enemy.anim * 2.1 + shard) * 8;
          ctx.beginPath();
          ctx.moveTo(shardX - 7, shardY);
          ctx.lineTo(shardX, shardY + 17);
          ctx.lineTo(shardX + 7, shardY);
          ctx.stroke();
        }
      } else {
        const legSpread = bossKind === "furnace" ? 24 : 19;
        const legSpeed = bossKind === "censor" ? 4.3 : 3.2 + enemy.stageIndex * 0.3;
        drawRobotLeg(-legSpread, 77, enemy.anim * legSpeed + Math.PI, 13, 13, 11, bossAccent, true);
        drawRobotLeg(legSpread, 77, enemy.anim * legSpeed, 13, 13, 11, bossAccent, true);
      }

      if (bossKind === "warden") {
        ctx.fillStyle = "#243f46";
        ctx.beginPath();
        ctx.moveTo(-62, 28);
        ctx.lineTo(-43, 21);
        ctx.lineTo(-35, 82);
        ctx.lineTo(-57, 94);
        ctx.lineTo(-72, 76);
        ctx.lineTo(-70, 39);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#1a2c32";
        ctx.fillRect(-39, 34, 78, 50);
        ctx.fillStyle = "#42636a";
        ctx.fillRect(-46, 42 + shoulder, 18, 30);
        ctx.fillRect(28, 42 - shoulder, 18, 30);
        ctx.fillStyle = "#718b8e";
        ctx.fillRect(-28, 9, 56, 30);
        ctx.fillStyle = "#101a20";
        ctx.fillRect(-21, 16, 42, 10);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(-16, 19, 32, 4);
        ctx.fillStyle = "#8ca5a7";
        ctx.fillRect(-4, -7, 7, 17);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(-7, -11, 13, 5);
        ctx.globalAlpha = 0.48 + Math.sin(game.time * 12) * 0.28;
        ctx.fillRect(-11, -14, 21, 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0a1218";
        ctx.fillRect(-29, 51, 58, 23);
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 3;
        ctx.strokeRect(-22, 56, 44, 13);
        ctx.fillStyle = "#a9c5c5";
        ctx.fillRect(39, 47, 45, 9);
        ctx.fillRect(43, 39, 38, 4);
        ctx.fillRect(43, 61, 38, 4);
        ctx.fillStyle = "#263b42";
        ctx.fillRect(47, 56, 17, 7);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(78, 49, 8, 5);
        ctx.fillRect(78, 39, 8, 3);
        ctx.fillRect(78, 62, 8, 3);
      } else if (bossKind === "furnace") {
        ctx.fillStyle = "#311713";
        ctx.fillRect(-35, 5, 13, 33);
        ctx.fillRect(22, 5, 13, 33);
        ctx.fillStyle = "#734034";
        ctx.fillRect(-31, -1, 5, 10);
        ctx.fillRect(26, -1, 5, 10);
        const exhaust = 9 + Math.sin(game.time * 18) * 5;
        ctx.fillStyle = `rgba(255, 123, 98, ${0.42 + pulse * 0.34})`;
        ctx.beginPath();
        ctx.moveTo(-34, -1);
        ctx.lineTo(-28, -exhaust);
        ctx.lineTo(-22, -1);
        ctx.moveTo(22, -1);
        ctx.lineTo(28, -exhaust * 1.18);
        ctx.lineTo(34, -1);
        ctx.fill();
        ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#4b2721";
        ctx.beginPath();
        ctx.arc(0, 57, 42, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#8b4b38";
        ctx.beginPath();
        ctx.arc(0, 57, 30, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#180c0b";
        ctx.beginPath();
        ctx.arc(0, 57, 19, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 57, 12 + pulse * 3, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#c8b5a7";
        ctx.fillRect(-23, 10, 46, 22);
        ctx.fillStyle = "#24120f";
        ctx.fillRect(-15, 17, 30, 7);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(5, 18, 10, 5);
        ctx.fillStyle = "#6d3428";
        ctx.fillRect(34, 37 + shoulder, 43, 18);
        ctx.fillStyle = "#d49b70";
        ctx.fillRect(67, 40 + shoulder, 15, 12);
        ctx.fillStyle = "#2a1210";
        ctx.fillRect(-58, 40 - shoulder, 25, 34);
        ctx.fillStyle = "#96523c";
        ctx.fillRect(-65, 47 - shoulder, 16, 21);
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-42, 46);
        ctx.bezierCurveTo(-27, 31, 22, 31, 41, 45);
        ctx.stroke();
      } else if (bossKind === "weaver") {
        ctx.strokeStyle = `rgba(215, 160, 255, ${0.48 + pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(0, 23, 42, 16, 0, 0, TAU);
        ctx.stroke();
        ctx.save();
        ctx.rotate(enemy.anim * 0.8);
        for (let spoke = 0; spoke < 6; spoke += 1) {
          ctx.rotate(TAU / 6);
          ctx.fillStyle = "rgba(215, 160, 255, 0.4)";
          ctx.fillRect(32, -2, 13, 4);
        }
        ctx.restore();
        ctx.save();
        ctx.rotate(-enemy.anim * 0.46);
        for (let mask = 0; mask < 3; mask += 1) {
          ctx.rotate(TAU / 3);
          ctx.fillStyle = "rgba(241, 232, 244, 0.78)";
          ctx.beginPath();
          ctx.moveTo(47, -7);
          ctx.lineTo(62, 0);
          ctx.lineTo(47, 7);
          ctx.lineTo(42, 0);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = bossAccent;
          ctx.fillRect(52, -2, 7, 3);
        }
        ctx.restore();
        ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#21182f";
        ctx.beginPath();
        ctx.moveTo(-30, 30);
        ctx.lineTo(0, 12);
        ctx.lineTo(30, 30);
        ctx.lineTo(24, 88);
        ctx.lineTo(-24, 88);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f1e8f4";
        ctx.beginPath();
        ctx.moveTo(-19, 14);
        ctx.lineTo(19, 14);
        ctx.lineTo(14, 43);
        ctx.lineTo(0, 50);
        ctx.lineTo(-14, 43);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#170d22";
        ctx.fillRect(-12, 25, 24, 5);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(3, 26, 9, 3);
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 3;
        for (let ribbon = -1; ribbon <= 1; ribbon += 2) {
          ctx.beginPath();
          ctx.moveTo(ribbon * 25, 45);
          ctx.bezierCurveTo(ribbon * 58, 52 + shoulder, ribbon * 34, 78, ribbon * 64, 91);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#271624";
        for (const wing of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(wing * 28, 34);
          ctx.lineTo(wing * 76, 15);
          ctx.lineTo(wing * 60, 48);
          ctx.lineTo(wing * 82, 65);
          ctx.lineTo(wing * 31, 72);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = bossAccent;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#15131f";
        ctx.fillRect(-34, 34, 68, 58);
        ctx.fillStyle = "#3b2637";
        ctx.beginPath();
        ctx.moveTo(-46, 40);
        ctx.lineTo(-18, 31);
        ctx.lineTo(-10, 78);
        ctx.lineTo(-38, 84);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(46, 40);
        ctx.lineTo(18, 31);
        ctx.lineTo(10, 78);
        ctx.lineTo(38, 84);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ece8e9";
        ctx.beginPath();
        ctx.moveTo(-24, 8);
        ctx.lineTo(22, 8);
        ctx.lineTo(17, 40);
        ctx.lineTo(-18, 40);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#1a0c14";
        ctx.fillRect(-3, 20, 25, 7);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(11, 21, 11, 5);
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 7, 29 + pulse * 3, Math.PI, TAU);
        ctx.stroke();
        ctx.fillStyle = "#160d17";
        ctx.beginPath();
        ctx.arc(0, 59, 18, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 59, 11 + pulse * 2, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = "#d8dce4";
        ctx.fillRect(31, 49, 58, 8);
        ctx.fillRect(43, 42, 38, 4);
        ctx.fillStyle = "#5a4558";
        ctx.fillRect(37, 57, 34, 8);
        ctx.fillStyle = bossAccent;
        ctx.fillRect(79, 51, 10, 4);
        ctx.fillRect(79, 43, 10, 3);
      }
      if (chargingShot) {
        const muzzleX = 63 - chargeProgress * 7;
        const muzzleY = bossKind === "weaver" ? 48 : 50;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = bossAccent;
        ctx.lineWidth = 2 + chargeProgress * 2;
        ctx.globalAlpha = 0.45 + chargeProgress * 0.5;
        ctx.beginPath();
        ctx.moveTo(12, 55);
        ctx.lineTo(muzzleX - 8, muzzleY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, 5 + chargeProgress * 8 + Math.sin(game.time * 30) * 2, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = bossAccent;
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, 2 + chargeProgress * 5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    } else {
      const runnerLean = clamp(Math.abs(enemy.vx) / 240, 0, 0.28);
      const runnerAccent = variant > 0.5 ? palette.amber : palette.cyan;
      drawRobotLeg(-6, 38, enemy.anim * 10 + Math.PI, 8, 9, 6, runnerAccent);
      drawRobotLeg(6, 38, enemy.anim * 10, 8, 9, 6, runnerAccent);
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#1d2b39";
      ctx.beginPath();
      ctx.moveTo(-17, 20);
      ctx.lineTo(-9, 15);
      ctx.lineTo(12, 17);
      ctx.lineTo(17, 42);
      ctx.lineTo(7, 48);
      ctx.lineTo(-12, 45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = variant > 0.5 ? "#2e4656" : "#283d4c";
      ctx.beginPath();
      ctx.moveTo(-16, 21);
      ctx.lineTo(-8, 15);
      ctx.lineTo(-2, 22);
      ctx.lineTo(-7, 31);
      ctx.lineTo(-15, 29);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#385263";
      ctx.fillRect(-9, 24, 17, 12);
      ctx.strokeStyle = "rgba(169,215,221,0.32)";
      ctx.strokeRect(-7, 26, 13, 8);
      ctx.fillStyle = palette.cyan;
      ctx.globalAlpha = 0.25;
      ctx.fillRect(-7, 34, 13, 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#101923";
      ctx.fillRect(-8, 38, 16, 4);
      ctx.fillStyle = variant > 0.5 ? palette.amber : palette.cyan;
      ctx.fillRect(-5, 39, 4, 2);
      ctx.fillRect(2, 39, 4, 2);
      ctx.fillStyle = "#617684";
      ctx.beginPath();
      ctx.moveTo(-12, 4);
      ctx.lineTo(7, 2);
      ctx.lineTo(14, 10);
      ctx.lineTo(8, 24);
      ctx.lineTo(-11, 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#334957";
      ctx.fillRect(-13, 7, 4, 10);
      ctx.fillStyle = "#879ca4";
      ctx.fillRect(-12, 9, 2, 5);
      ctx.fillStyle = "#0a1019";
      ctx.fillRect(0, 9, 14, 6);
      ctx.fillStyle = palette.red;
      ctx.fillRect(8, 11, 5, 3);
      ctx.fillStyle = "#bacdd5";
      ctx.save();
      ctx.translate(12, 31);
      ctx.rotate(-runnerLean + Math.sin(enemy.anim * 4) * 0.04);
      ctx.fillStyle = "#263b47";
      ctx.fillRect(-5, -5, 12, 10);
      ctx.fillStyle = "#bacdd5";
      ctx.fillRect(0, -2, 30, 4);
      ctx.fillStyle = palette.cyan;
      ctx.fillRect(24, -1, 12, 2);
      ctx.fillStyle = palette.white;
      ctx.fillRect(31, -0.5, 8, 1);
      ctx.restore();
    }

    // 모든 기체에 공통으로 보이는 조립선, 일련번호, 누적 손상 자국.
    if (enemy.type !== "drone") {
      const badgeY = enemy.type === "boss" ? 84 : enemy.type === "shield" ? 47 : 37;
      ctx.fillStyle = "rgba(208, 231, 232, 0.58)";
      ctx.fillRect(-4, badgeY, 7, 2);
      ctx.fillRect(5, badgeY, 2, 2);
      ctx.fillStyle = "rgba(7, 13, 20, 0.72)";
      ctx.beginPath();
      ctx.arc(-11, badgeY - 11, 1.3, 0, TAU);
      ctx.arc(11, badgeY - 11, 1.3, 0, TAU);
      ctx.fill();

      const serviceY = enemy.type === "boss" ? 72 : enemy.type === "shield" ? 46 : 32;
      const serviceSpan = enemy.type === "boss" ? 25 : 12;
      ctx.strokeStyle = "rgba(118, 181, 193, 0.38)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-serviceSpan, serviceY - 7);
      ctx.lineTo(-serviceSpan + 5, serviceY - 2);
      ctx.lineTo(serviceSpan - 5, serviceY - 4);
      ctx.lineTo(serviceSpan, serviceY + 1);
      ctx.stroke();
      ctx.fillStyle = "#090f17";
      ctx.fillRect(-serviceSpan, serviceY, 4, 3);
      ctx.fillRect(serviceSpan - 4, serviceY, 4, 3);
      ctx.fillStyle = enemy.type === "boss" ? palette.red : palette.cyan;
      ctx.fillRect(-serviceSpan + 1, serviceY + 1, 2, 1);
      ctx.fillRect(serviceSpan - 3, serviceY + 1, 2, 1);
      ctx.fillStyle = "rgba(221, 235, 236, 0.66)";
      ctx.fillRect(-7, serviceY + 5, 2, 2);
      ctx.fillRect(-2, serviceY + 5, 2, 2);
      ctx.fillRect(3, serviceY + 5, 2, 2);
    }
    if (damageRatio > 0.2) {
      ctx.strokeStyle = `rgba(255, 205, 112, ${0.34 + damageRatio * 0.42})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-9, 26);
      ctx.lineTo(-2, 31);
      ctx.lineTo(-6, 37);
      ctx.moveTo(8, 18);
      ctx.lineTo(3, 23);
      ctx.lineTo(9, 28);
      ctx.stroke();
    }
    ctx.restore();

    if (enemy.hp < enemy.maxHp && enemy.type !== "boss") {
      const barW = enemy.w;
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fillRect(enemy.x, enemy.y - 10, barW, 4);
      ctx.fillStyle = palette.red;
      ctx.fillRect(enemy.x, enemy.y - 10, barW * (enemy.hp / enemy.maxHp), 4);
    }

    const targetDistance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (targetDistance < 560 && enemy.type !== "boss") {
      const markerY = enemy.y - 24 + Math.sin(game.time * 5 + enemy.anim) * 3;
      ctx.save();
      ctx.translate(enemy.x + enemy.w / 2, markerY);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = targetDistance < 150 ? palette.amber : palette.red;
      ctx.lineWidth = 2;
      ctx.strokeRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }

  function drawBullet(bullet) {
    const centerX = bullet.x + bullet.w / 2;
    const centerY = bullet.y + bullet.h / 2;
    const radius = Math.max(bullet.w, bullet.h) * 1.15;
    if (bullet.kind === "rain-controller") return;
    if (bullet.kind === "rain-core-burst") {
      const progress = 1 - clamp(bullet.life / bullet.maxLife, 0, 1);
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.globalCompositeOperation = "lighter";
      for (let ring = 0; ring < 3; ring += 1) {
        ctx.globalAlpha = (1 - progress) * (0.75 - ring * 0.16);
        ctx.strokeStyle = ring === 0 ? "#fff3d4" : ring === 1 ? "#ff9b62" : "#ff304f";
        ctx.lineWidth = 10 - ring * 2;
        ctx.beginPath();
        ctx.arc(0, 0, 30 + progress * (150 + ring * 48), 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = (1 - progress) * 0.5;
      ctx.fillStyle = "#ff5b35";
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0, 54 - progress * 32), 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (bullet.kind === "ice-chunk") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + game.time * 0.8);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(188,236,255,0.2)";
      ctx.beginPath(); ctx.arc(0, 0, radius + 8, 0, TAU); ctx.fill();
      ctx.fillStyle = "#bcecff";
      ctx.beginPath();
      ctx.moveTo(0, -bullet.h * 0.58);
      ctx.lineTo(bullet.w * 0.48, -bullet.h * 0.08);
      ctx.lineTo(bullet.w * 0.3, bullet.h * 0.48);
      ctx.lineTo(-bullet.w * 0.34, bullet.h * 0.5);
      ctx.lineTo(-bullet.w * 0.5, -bullet.h * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#f5fdff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "#67bfe8"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -bullet.h * 0.45); ctx.lineTo(-4, bullet.h * 0.38); ctx.moveTo(0, -4); ctx.lineTo(bullet.w * 0.34, -bullet.h * 0.08); ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.kind === "boss-funnel") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(player.y + player.h / 2 - centerY, player.x + player.w / 2 - centerX));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255, 73, 108, 0.22)";
      ctx.fillRect(-19, -7, 38, 14);
      ctx.fillStyle = "#6f132a";
      ctx.beginPath();
      ctx.moveTo(17, 0);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-16, -3);
      ctx.lineTo(-16, 3);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffb0be";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff3f5";
      ctx.fillRect(9, -2, 7, 4);
      ctx.restore();
      return;
    }
    if (bullet.kind === "poison-gas") {
      const alpha = clamp(bullet.life / bullet.maxLife, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.16 + alpha * 0.22;
      ctx.fillStyle = bullet.color;
      for (let cloud = 0; cloud < 7; cloud += 1) {
        const angle = cloud * TAU / 7 + game.time * 0.45;
        ctx.beginPath();
        ctx.arc(centerX + Math.cos(angle) * 35, centerY + Math.sin(angle) * 18, 25 + Math.sin(game.time * 2 + cloud) * 7, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    if (bullet.kind === "potion") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2);
      ctx.fillStyle = "#dfeff1";
      ctx.fillRect(-5, -12, 10, 7);
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(8, -5);
      ctx.lineTo(10, 9);
      ctx.quadraticCurveTo(0, 15, -10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#f3ffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.kind === "mutant-debris") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(game.time * 2.4 + bullet.vx * 0.002);
      ctx.fillStyle = "rgba(12,16,18,0.42)";
      ctx.beginPath(); ctx.arc(3, 5, radius * 0.72, 0, TAU); ctx.fill();
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.moveTo(-bullet.w * 0.5, -bullet.h * 0.12);
      ctx.lineTo(-bullet.w * 0.18, -bullet.h * 0.52);
      ctx.lineTo(bullet.w * 0.43, -bullet.h * 0.31);
      ctx.lineTo(bullet.w * 0.52, bullet.h * 0.25);
      ctx.lineTo(0, bullet.h * 0.48);
      ctx.lineTo(-bullet.w * 0.46, bullet.h * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#a0a7aa"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "#30373c"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(4, 2); ctx.lineTo(-2, 10); ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.kind === "revenant-sword-wave") {
      const angle = Math.atan2(bullet.vy, bullet.vx);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(215,183,255,0.18)";
      ctx.beginPath(); ctx.ellipse(0, 0, bullet.w * 0.72, bullet.h * 1.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#f6eeff"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-bullet.w * 0.55, bullet.h * 0.35); ctx.quadraticCurveTo(0, -bullet.h * 0.75, bullet.w * 0.55, bullet.h * 0.35); ctx.stroke();
      ctx.strokeStyle = "#b88cff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-bullet.w * 0.48, bullet.h * 0.55); ctx.quadraticCurveTo(0, -bullet.h * 0.45, bullet.w * 0.48, bullet.h * 0.55); ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.kind === "reflected-shotgun" || bullet.kind === "funnel-shot" || bullet.kind === "burst-parry") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `${bullet.color}48`;
      ctx.fillRect(bullet.kind === "burst-parry" ? -34 : -26, -5, bullet.kind === "burst-parry" ? 48 : 38, 10);
      ctx.fillStyle = bullet.color;
      ctx.fillRect(-7, -2, 19, 4);
      ctx.restore();
      return;
    }
    if (bullet.kind === "warden-beam") {
      const alpha = clamp(bullet.life / bullet.maxLife, 0, 1);
      const endX = bullet.x + bullet.beamDX * bullet.beamLength;
      const endY = bullet.y + bullet.beamDY * bullet.beamLength;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      const breakerBeam = bullet.beamStyle === "breaker";
      ctx.strokeStyle = breakerBeam
        ? `rgba(255, 205, 112, ${0.18 + alpha * 0.2})`
        : `rgba(255, 36, 72, ${0.18 + alpha * 0.18})`;
      ctx.lineWidth = bullet.beamThickness + 46;
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.strokeStyle = breakerBeam
        ? `rgba(255, 176, 64, ${0.66 + alpha * 0.25})`
        : `rgba(255, 58, 86, ${0.62 + alpha * 0.25})`;
      ctx.lineWidth = bullet.beamThickness;
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 241, 226, ${0.82 + alpha * 0.18})`;
      ctx.lineWidth = 23;
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.kind === "magic-sigil") {
      const progress = 1 - clamp(bullet.triggerTimer / Math.max(0.01, bullet.maxLife - 0.42), 0, 1);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(game.time * (bullet.spell === "teleport" ? -2.1 : 1.65));
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = bullet.spell === "teleport" ? "#f0c8ff" : "#ffb06f";
      ctx.lineWidth = 2 + progress * 2;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + progress * 13, 0, TAU);
      ctx.stroke();
      ctx.rotate(-game.time * 3.4);
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = -Math.PI / 2 + point * TAU / 6;
        const x = Math.cos(angle) * (16 + progress * 10);
        const y = Math.sin(angle) * (16 + progress * 10);
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = bullet.spell === "teleport" ? "rgba(215,160,255,0.18)" : "rgba(255,123,66,0.2)";
      ctx.beginPath();
      ctx.arc(0, 0, 9 + progress * 7, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (bullet.kind === "homing-missile") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,48,79,0.22)";
      ctx.fillRect(-34, -10, 42, 20);
      ctx.fillStyle = "#d9dde0";
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(4, -7);
      ctx.lineTo(-15, -6);
      ctx.lineTo(-15, 6);
      ctx.lineTo(4, 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ff304f";
      ctx.fillRect(-17, -4, 9, 8);
      ctx.fillStyle = "#ffb05e";
      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.lineTo(-30 - Math.sin(game.time * 31) * 5, 0);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    if (bullet.kind === "fireball") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(255,73,50,0.2)";
      ctx.beginPath();
      ctx.arc(0, 0, radius + 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ff5b35";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.quadraticCurveTo(-5, -17, -27 - Math.sin(game.time * 24) * 7, -4);
      ctx.quadraticCurveTo(-10, 0, -27, 7);
      ctx.quadraticCurveTo(-4, 17, 15, 0);
      ctx.fill();
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath();
      ctx.arc(5, 0, 6, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (bullet.kind === "heavy" || bullet.kind === "rain-core" || bullet.kind === "rain-drop") {
      const core = bullet.kind === "rain-core";
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = core ? "rgba(255, 91, 103, 0.18)" : "rgba(255, 48, 79, 0.22)";
      ctx.beginPath();
      ctx.arc(0, 0, radius + (core ? 18 : 8) + Math.sin(game.time * 18) * 3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = core ? "#ffcd70" : "#ff667c";
      ctx.lineWidth = core ? 4 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.78, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#fff0dd";
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(3, radius * 0.32), 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (bullet.kind === "shotgun") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = bullet.piercing ? "rgba(255, 205, 112, 0.22)" : "rgba(101, 245, 234, 0.18)";
      ctx.fillRect(-30, -4, 38, 8);
      ctx.fillStyle = bullet.color;
      ctx.fillRect(-11, -2, 20, 4);
      ctx.restore();
      return;
    }
    if (bullet.kind === "phase") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(Math.atan2(bullet.vy, bullet.vx));
      ctx.fillStyle = "rgba(121, 223, 255, 0.18)";
      ctx.fillRect(-28, -5, 42, 10);
      ctx.fillStyle = "#79dfff";
      ctx.fillRect(-12, -3, 26, 6);
      ctx.fillStyle = "#fff";
      ctx.fillRect(7, -1, 7, 2);
      ctx.restore();
      return;
    }
    if (bullet.kind === "spell") {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(game.time * 5 + bullet.x * 0.01);
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "#d7a0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 5, 0, TAU);
      ctx.moveTo(0, -radius);
      ctx.lineTo(radius * 0.86, radius * 0.5);
      ctx.lineTo(-radius * 0.86, radius * 0.5);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(244, 224, 255, 0.75)";
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (bullet.kind === "mortar") {
      ctx.fillStyle = "rgba(255, 73, 108, 0.18)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8 + Math.sin(game.time * 14) * 2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = palette.amber;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.72, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = `${bullet.color}35`;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = bullet.color;
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(centerX - 2, centerY - 2, 4, 4);
  }

  function drawParticle(particle) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    if (particle.streak) {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(Math.atan2(particle.vy, particle.vx));
      ctx.fillRect(0, -particle.size / 2, particle.size * 3, particle.size);
      ctx.restore();
    } else {
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawGateAt(x, unlocked) {
    ctx.fillStyle = "#101522";
    ctx.fillRect(x, 160, 150, 460);
    ctx.fillStyle = "#3d2635";
    ctx.fillRect(x + 14, 190, 122, 430);
    ctx.strokeStyle = unlocked ? palette.cyan : palette.red;
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 32, 250, 86, 370);
    if (!unlocked) {
      ctx.fillStyle = "rgba(255, 73, 108, 0.24)";
      for (let y = 255; y < 620; y += 24) ctx.fillRect(x + 36, y, 78, 5);
    } else {
      ctx.fillStyle = "rgba(101, 245, 234, 0.16)";
      ctx.fillRect(x + 67, 250, 16, 370);
    }
  }

  function drawCombatSeal(x) {
    const pulse = 0.42 + Math.sin(game.time * 12) * 0.18;
    ctx.fillStyle = "rgba(5, 10, 18, 0.86)";
    ctx.fillRect(x - 14, 185, 28, 435);
    ctx.fillStyle = `rgba(255, 73, 108, ${pulse * 0.38})`;
    ctx.fillRect(x - 8, 200, 16, 420);
    ctx.fillStyle = palette.red;
    for (let y = 205; y < 620; y += 30) ctx.fillRect(x - 12, y, 24, 3);
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 9, 198, 18, 422);
  }

  function drawBossArenaBackdrop(left, right) {
    const floorByStage = [650, 680, 670, 660, 670];
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
      const stage = stages[stageIndex];
      const bossZone = zones[stageIndex * ZONES_PER_STAGE + BOSS_ZONE_INDEX];
      const origin = bossZone.x;
      if (origin > right || bossZone.end < left) continue;
      const floorY = floorByStage[stageIndex];
      const accent = stage.color;
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.strokeStyle = accent;
      ctx.fillStyle = "rgba(7, 12, 21, 0.72)";
      ctx.lineWidth = 3;
      if (stageIndex === 0) {
        // 폐철 포격 시험장: 궤도 레일, 포탑 정비 고리, 탄약 적재 랙.
        for (let rack = 0; rack < 5; rack += 1) {
          const x = origin + 330 + rack * 760;
          ctx.fillRect(x, 180, 210, floorY - 180);
          ctx.strokeRect(x + 20, 220, 170, 190);
          ctx.beginPath();
          ctx.arc(x + 105, 315, 58, 0, TAU);
          ctx.stroke();
          for (let shell = 0; shell < 5; shell += 1) ctx.fillRect(x + 40 + shell * 29, 470, 12, 74);
        }
        ctx.fillStyle = "rgba(101,245,234,0.16)";
        ctx.fillRect(origin + 140, floorY - 52, 3570, 8);
      } else if (stageIndex === 1) {
        // 총열 성당: 수직 포신과 거대한 노심이 배경 전체를 관통한다.
        for (let barrel = 0; barrel < 10; barrel += 1) {
          const x = origin + 190 + barrel * 390;
          ctx.fillRect(x, 130 + (barrel % 3) * 55, 34, floorY - 150);
          ctx.strokeRect(x + 8, 115 + (barrel % 3) * 55, 18, 38);
        }
        ctx.beginPath();
        ctx.arc(origin + 2050, 340, 155, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(origin + 2050, 340, 94 + Math.sin(game.time * 2) * 8, 0, TAU);
        ctx.stroke();
      } else if (stageIndex === 2) {
        // 기억 마도원: 회전하는 대형 마법진과 떠 있는 문자판.
        ctx.translate(origin + 2020, 365);
        ctx.rotate(game.time * 0.055);
        for (let ring = 0; ring < 4; ring += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, 110 + ring * 55, 0, TAU);
          ctx.stroke();
        }
        for (let rune = 0; rune < 12; rune += 1) {
          ctx.rotate(TAU / 12);
          ctx.strokeRect(250, -12, 34, 24);
        }
        ctx.beginPath();
        ctx.moveTo(0, -245);
        ctx.lineTo(212, 122);
        ctx.lineTo(-212, 122);
        ctx.closePath();
        ctx.stroke();
      } else if (stageIndex === 3) {
        // 금서 제단: 검은 첨탑과 보랏빛 소환문.
        for (let pillar = 0; pillar < 7; pillar += 1) {
          const x = origin + 210 + pillar * 590;
          ctx.beginPath();
          ctx.moveTo(x, floorY);
          ctx.lineTo(x + 80, 145 + (pillar % 2) * 80);
          ctx.lineTo(x + 160, floorY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        for (const portalX of [origin + 940, origin + 3030]) {
          ctx.beginPath();
          ctx.ellipse(portalX, 415, 86, 142, 0, 0, TAU);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(portalX, 415, 52 + Math.sin(game.time * 3) * 4, 104, 0, 0, TAU);
          ctx.stroke();
        }
      } else {
        // 거울 결투장: 중앙선을 기준으로 완전히 대칭인 기록 패널.
        for (let panel = 0; panel < 6; panel += 1) {
          const offset = 390 + panel * 285;
          for (const side of [-1, 1]) {
            const x = origin + 2000 + side * offset;
            ctx.save();
            ctx.translate(x, 345);
            ctx.scale(side, 1);
            ctx.strokeRect(-85, -170, 170, 340);
            ctx.beginPath();
            ctx.moveTo(-65, -130);
            ctx.lineTo(55, 115);
            ctx.moveTo(30, -145);
            ctx.lineTo(-48, 138);
            ctx.stroke();
            ctx.restore();
          }
        }
        ctx.fillStyle = "rgba(99,255,198,0.12)";
        ctx.fillRect(origin + 1996, 120, 8, floorY - 120);
      }
      ctx.restore();
    }
  }

  function drawTutorialStageScenery(left, right) {
    if (left > ZONE_W + 200 || right < -200) return;
    const floorY = 640;
    ctx.save();
    ctx.fillStyle = "rgba(101, 245, 234, 0.045)";
    ctx.fillRect(0, 120, ZONE_W, floorY - 120);
    ctx.strokeStyle = "rgba(101, 245, 234, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 80; x < ZONE_W; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, 160);
      ctx.lineTo(x, floorY);
      ctx.stroke();
    }

    TUTORIAL_STEPS.forEach((step, index) => {
      const cleared = game.tutorialCompleted || game.tutorialStep > index;
      const current = game.tutorialActive && game.tutorialStep === index;
      const alpha = cleared ? 0.18 : current ? 0.82 : 0.38;
      ctx.fillStyle = current ? "rgba(255,218,134,0.13)" : cleared ? "rgba(101,245,234,0.045)" : "rgba(129,146,154,0.025)";
      ctx.fillRect(step.minX, floorY - 12, step.maxX - step.minX, 12);
      ctx.strokeStyle = current ? "rgba(255,218,134,0.68)" : cleared ? "rgba(101,245,234,0.24)" : "rgba(129,146,154,0.16)";
      ctx.lineWidth = current ? 2 : 1;
      ctx.strokeRect(step.minX, floorY - 12, step.maxX - step.minX, 12);
      ctx.fillStyle = cleared ? `rgba(101,245,234,${alpha})` : `rgba(255,205,112,${alpha})`;
      ctx.fillRect(step.gateX - (current ? 6 : 3), 165, current ? 12 : 6, floorY - 165);
      ctx.strokeStyle = cleared ? "rgba(101,245,234,0.34)" : "rgba(255,205,112,0.5)";
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(step.gateX - 14, 165, 28, floorY - 165);
      ctx.setLineDash([]);
      ctx.fillStyle = cleared ? "#65f5ea" : current ? "#ffda86" : "#81929a";
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${String(index + 1).padStart(2, "0")} // ${step.title}`, step.gateX - 5, 142);
      if (current) {
        ctx.font = "900 10px 'Malgun Gothic', sans-serif";
        ctx.fillStyle = "#ffda86";
        ctx.fillText("이 표시 구역 안에서 수행", (step.minX + step.maxX) / 2, floorY - 22);
      }
    });

    // Holographic silhouettes for the final weapon check.
    [3180, 3440].forEach((x, index) => {
      const pulse = 0.45 + Math.sin(game.time * 4 + index) * 0.18;
      ctx.strokeStyle = `rgba(101,245,234,${pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, floorY - 104, 42, 104);
      ctx.beginPath();
      ctx.arc(x + 21, floorY - 78, 12, 0, TAU);
      ctx.moveTo(x + 21, floorY - 66);
      ctx.lineTo(x + 21, floorY - 24);
      ctx.moveTo(x + 4, floorY - 52);
      ctx.lineTo(x + 38, floorY - 52);
      ctx.stroke();
    });
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawSnowPatch(patch) {
    const shimmer = 0.74 + Math.sin(game.time * 2.8 + patch.x * 0.01) * 0.1;
    ctx.save();
    ctx.globalAlpha = clamp(patch.life / 1.2, 0, 1);
    const gradient = ctx.createLinearGradient(patch.x, patch.y - patch.depth, patch.x, patch.y + 4);
    gradient.addColorStop(0, "rgba(236, 251, 255, " + shimmer + ")");
    gradient.addColorStop(1, "rgba(91, 174, 214, 0.72)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(patch.x, patch.y + 3);
    for (let step = 0; step <= 8; step += 1) {
      const ratio = step / 8;
      const x = patch.x + patch.w * ratio;
      const ridge = Math.sin(ratio * Math.PI * 4 + patch.x * 0.03) * patch.depth * 0.22;
      ctx.lineTo(x, patch.y - patch.depth * Math.sin(ratio * Math.PI) - ridge);
    }
    ctx.lineTo(patch.x + patch.w, patch.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(244,253,255,0.82)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawWorld() {
    const effectiveShake = game.cutscene || game.story ? 0 : game.shake * SCREEN_SHAKE_SCALE;
    const shakeX = effectiveShake > 0 ? (hash(game.time * 1000) - 0.5) * effectiveShake : 0;
    const shakeY = effectiveShake > 0 ? (hash(game.time * 1300 + 12) - 0.5) * effectiveShake : 0;
    ctx.save();
    ctx.translate(Math.round(-camera.x + shakeX), Math.round(-camera.y + shakeY));

    const left = camera.x - 200;
    const right = camera.x + W + 200;
    drawBossArenaBackdrop(left, right);
    drawTutorialStageScenery(left, right);
    for (const backdrop of adminBackdrops) if (!backdrop.hidden && backdrop.x + backdrop.w > left && backdrop.x < right) drawAdminBackdrop(backdrop);
    for (const platform of getNearbyPlatforms({ x: left, w: right - left }, 0)) if (!platform.hidden && platform.x + platform.w > left && platform.x < right) drawPlatform(platform);
    for (const patch of snowPatches) if (patch.x + patch.w > left && patch.x < right) drawSnowPatch(patch);
    for (const hazard of hazards) if (!hazard.hidden && hazard.x + hazard.w > left && hazard.x < right) drawHazard(hazard);
    // 표지판은 지형보다 뒤에 그려 발판에 가려지지 않게 한다.
    for (const sign of signs) if (!sign.hidden && sign.x > left - 200 && sign.x < right) drawSign(sign);
    for (const checkpoint of checkpoints) if (checkpoint.x > left && checkpoint.x < right) drawCheckpoint(checkpoint);
    for (const pickup of pickups) if (pickup.x > left && pickup.x < right) drawPickup(pickup);
    for (const node of boostNodes) if (node.x > left && node.x < right) drawBoostNode(node);
    drawAdminWorldSelection();
    if (!game.adminMode) {
      for (const room of combatRooms) {
        if (!room.triggered || room.cleared) continue;
        if (room.left > left - 40 && room.left < right + 40) drawCombatSeal(room.left);
        if (room.right > left - 40 && room.right < right + 40) drawCombatSeal(room.right);
      }
      for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
        const zone = zones[zoneIndex];
        if (zone.template === "boss") continue;
        const boundary = zone.end - 48;
        if (boundary <= left - 40 || boundary >= right + 40) continue;
        if (getZoneRemaining(zoneIndex) > 0) drawCombatSeal(boundary);
      }
    }
    for (const stage of stages) {
      if (stage.gateX > left - 200 && stage.gateX < right) drawGateAt(stage.gateX, game.adminMode || game.defeatedBosses.has(stage.bossKind));
    }
    for (const enemy of enemies) if (enemy.x + enemy.w > left && enemy.x < right) drawEnemy(enemy);
    for (const bullet of bullets) drawBullet(bullet);
    drawPlayer();
    for (const particle of particles) drawParticle(particle);
    ctx.restore();
  }

  function wrapStoryText(text, maxWidth) {
    const lines = [];
    let line = "";
    for (const character of [...text]) {
      const candidate = line + character;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, 2);
  }

  function drawStory() {
    if (!game.story) return;
    const story = game.story;
    const appeared = clamp((story.duration - game.storyTimer) * 4.5, 0, 1);
    const leaving = clamp(game.storyTimer * 3.5, 0, 1);
    const alpha = appeared * leaving;
    const panelX = 38;
    const panelY = H - 203 + (1 - appeared) * 18;
    const panelW = 735;
    const panelH = 102;
    const accent = story.tone === "hostile" ? palette.red : story.tone === "operative" ? palette.cyan : story.tone === "control" ? "#8cb7ff" : palette.amber;

    ctx.save();
    ctx.globalAlpha = alpha;
    const panelGradient = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    panelGradient.addColorStop(0, "rgba(3, 10, 18, 0.94)");
    panelGradient.addColorStop(1, "rgba(8, 15, 27, 0.72)");
    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    ctx.moveTo(panelX, panelY);
    ctx.lineTo(panelX + panelW - 20, panelY);
    ctx.lineTo(panelX + panelW, panelY + 20);
    ctx.lineTo(panelX + panelW, panelY + panelH);
    ctx.lineTo(panelX, panelY + panelH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `${accent}88`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(panelX, panelY, 4, panelH);

    const portraitX = panelX + 45;
    const portraitY = panelY + 50;
    ctx.strokeStyle = `${accent}99`;
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, 27, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(21, 36, 49, 0.88)";
    ctx.beginPath();
    ctx.arc(portraitX, portraitY, 22, 0, TAU);
    ctx.fill();
    if (story.tone === "operative") {
      ctx.fillStyle = "#e9f1ef";
      ctx.beginPath();
      ctx.moveTo(portraitX - 11, portraitY - 13);
      ctx.lineTo(portraitX + 9, portraitY - 11);
      ctx.lineTo(portraitX + 13, portraitY + 9);
      ctx.lineTo(portraitX - 8, portraitY + 13);
      ctx.lineTo(portraitX - 13, portraitY + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#0a111b";
      ctx.fillRect(portraitX - 1, portraitY - 5, 13, 4);
      ctx.fillStyle = palette.red;
      ctx.fillRect(portraitX + 7, portraitY - 4, 5, 2);
    } else if (story.tone === "hostile") {
      ctx.fillStyle = "#d8c9cd";
      ctx.fillRect(portraitX - 13, portraitY - 14, 26, 28);
      ctx.fillStyle = "#190c13";
      ctx.fillRect(portraitX - 2, portraitY - 6, 15, 6);
      ctx.fillStyle = palette.red;
      ctx.fillRect(portraitX + 6, portraitY - 5, 7, 3);
    } else {
      ctx.strokeStyle = accent;
      ctx.beginPath();
      for (let i = -14; i <= 14; i += 4) {
        const wave = Math.sin(game.time * 9 + i) * (10 - Math.abs(i) * 0.35);
        ctx.moveTo(portraitX + i, portraitY - wave);
        ctx.lineTo(portraitX + i, portraitY + wave);
      }
      ctx.stroke();
    }

    ctx.fillStyle = accent;
    ctx.font = "900 12px 'Malgun Gothic', sans-serif";
    ctx.fillText(story.speaker, panelX + 88, panelY + 20);
    ctx.fillStyle = "#e8f4f4";
    ctx.font = "700 15px 'Malgun Gothic', sans-serif";
    const lines = wrapStoryText(story.text, panelW - 125);
    lines.forEach((line, index) => ctx.fillText(line, panelX + 88, panelY + 45 + index * 22));

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(panelX + 88, panelY + panelH - 10, panelW - 108, 2);
    ctx.fillStyle = accent;
    ctx.fillRect(panelX + 88, panelY + panelH - 10, (panelW - 108) * clamp(game.storyTimer / story.duration, 0, 1), 2);
    ctx.restore();
  }

  function wrapCutsceneText(text, maxWidth, maxLines = 3) {
    const lines = [];
    let line = "";
    for (const character of text) {
      const candidate = line + character;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
        if (lines.length >= maxLines - 1) break;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  }

  function drawCutscenePortrait(x, y, size, shot, accent) {
    const isEcho = shot.speaker.includes("잔영");
    const isSeorin = shot.speaker.includes("서린");
    ctx.save();
    ctx.fillStyle = "rgba(2, 8, 15, 0.88)";
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = `${accent}aa`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = `${accent}1f`;
    for (let line = 8; line < size; line += 9) ctx.fillRect(x + 4, y + line, size - 8, 1);

    if (isEcho || isSeorin) {
      const skin = isEcho ? "#8877b5" : "#b7c6c8";
      const hair = isEcho ? "#19112c" : "#121d28";
      ctx.fillStyle = `${accent}25`;
      ctx.beginPath();
      ctx.arc(x + size * 0.5, y + size * 0.49, size * 0.39, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#0b1420";
      ctx.beginPath();
      ctx.moveTo(x + size * 0.18, y + size * 0.95);
      ctx.lineTo(x + size * 0.28, y + size * 0.67);
      ctx.lineTo(x + size * 0.72, y + size * 0.67);
      ctx.lineTo(x + size * 0.84, y + size * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.fillRect(x + size * 0.34, y + size * 0.29, size * 0.32, size * 0.37);
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.28, y + size * 0.42);
      ctx.lineTo(x + size * 0.31, y + size * 0.23);
      ctx.lineTo(x + size * 0.69, y + size * 0.2);
      ctx.lineTo(x + size * 0.72, y + size * 0.46);
      ctx.lineTo(x + size * 0.61, y + size * 0.36);
      ctx.lineTo(x + size * 0.5, y + size * 0.43);
      ctx.lineTo(x + size * 0.43, y + size * 0.33);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isEcho ? "#d9a6ff" : palette.cyan;
      ctx.fillRect(x + size * 0.38, y + size * 0.47, size * 0.09, 3);
      ctx.fillRect(x + size * 0.55, y + size * 0.47, size * 0.09, 3);
      ctx.fillStyle = isEcho ? "#37234e" : "#3d555e";
      ctx.fillRect(x + size * 0.44, y + size * 0.59, size * 0.14, 2);
    } else {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let wave = 0; wave < 10; wave += 1) {
        const waveX = x + 12 + wave * (size - 24) / 9;
        const height = 8 + hash(wave * 4.1 + shot.speaker.length) * size * 0.44;
        ctx.moveTo(waveX, y + size / 2 - height / 2);
        ctx.lineTo(waveX, y + size / 2 + height / 2);
      }
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(x + size * 0.25, y + size * 0.18, size * 0.5, 3);
      ctx.fillRect(x + size * 0.34, y + size * 0.82, size * 0.32, 3);
    }
    ctx.restore();
  }

  function drawCutsceneSpeechBubble(shot, accent, actorX, actorY, revealedText) {
    const bubbleW = 540;
    const bubbleH = 142;
    const bubbleX = clamp(actorX - bubbleW * 0.44, 52, W - bubbleW - 52);
    const bubbleY = clamp(actorY - 188, 106, H - bubbleH - 112);
    const tailX = clamp(actorX, bubbleX + 44, bubbleX + bubbleW - 44);

    ctx.save();
    ctx.fillStyle = "rgba(241, 248, 245, 0.96)";
    ctx.strokeStyle = "rgba(4, 10, 16, 0.92)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bubbleX + 12, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - 12, bubbleY);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + 12);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - 12);
    ctx.lineTo(bubbleX + bubbleW - 12, bubbleY + bubbleH);
    ctx.lineTo(tailX + 24, bubbleY + bubbleH);
    ctx.lineTo(tailX, bubbleY + bubbleH + 24);
    ctx.lineTo(tailX - 13, bubbleY + bubbleH);
    ctx.lineTo(bubbleX + 12, bubbleY + bubbleH);
    ctx.lineTo(bubbleX, bubbleY + bubbleH - 12);
    ctx.lineTo(bubbleX, bubbleY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(bubbleX + 18, bubbleY + 17, 5, 24);
    ctx.font = "900 14px 'Malgun Gothic', sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(shot.speaker, bubbleX + 34, bubbleY + 15);
    ctx.fillStyle = "#101923";
    ctx.font = "800 18px 'Malgun Gothic', sans-serif";
    const lines = wrapCutsceneText(revealedText, bubbleW - 56, 3);
    lines.forEach((line, index) => ctx.fillText(line, bubbleX + 26, bubbleY + 51 + index * 27));
    ctx.fillStyle = accent;
    ctx.fillRect(bubbleX + 18, bubbleY + bubbleH - 8, bubbleW - 36, 3);
    ctx.restore();
  }

  function drawCutsceneCommPanel(scene, shot, accent, revealedText) {
    const panelX = 58;
    const panelY = H - 224;
    const panelW = W - 116;
    const panelH = 152;
    const portraitSize = 112;
    const panelGradient = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
    panelGradient.addColorStop(0, "rgba(2, 14, 22, 0.95)");
    panelGradient.addColorStop(0.7, "rgba(5, 18, 28, 0.87)");
    panelGradient.addColorStop(1, "rgba(4, 11, 19, 0.68)");

    ctx.save();
    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    ctx.moveTo(panelX, panelY + 18);
    ctx.lineTo(panelX + 18, panelY);
    ctx.lineTo(panelX + panelW - 28, panelY);
    ctx.lineTo(panelX + panelW, panelY + 28);
    ctx.lineTo(panelX + panelW, panelY + panelH);
    ctx.lineTo(panelX, panelY + panelH);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `${accent}99`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(panelX, panelY + 18, 5, panelH - 18);
    drawCutscenePortrait(panelX + 20, panelY + 20, portraitSize, shot, accent);

    const textX = panelX + 154;
    ctx.textBaseline = "top";
    ctx.fillStyle = `${accent}cc`;
    ctx.font = "800 10px monospace";
    ctx.fillText(`COMMUNICATION CHANNEL // ${scene.location}`, textX, panelY + 17);
    ctx.fillStyle = accent;
    ctx.font = "900 16px 'Malgun Gothic', sans-serif";
    ctx.fillText(shot.speaker, textX, panelY + 39);
    ctx.fillStyle = "#eefafa";
    ctx.font = "800 18px 'Malgun Gothic', sans-serif";
    const lines = wrapCutsceneText(revealedText, panelW - 190, 3);
    lines.forEach((line, index) => ctx.fillText(line, textX, panelY + 70 + index * 26));
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    ctx.fillRect(textX, panelY + panelH - 12, panelW - 174, 3);
    ctx.fillStyle = accent;
    ctx.fillRect(textX, panelY + panelH - 12, (panelW - 174) * clamp(game.cutsceneTimer / (shot.duration || 5), 0, 1), 3);
    ctx.restore();
  }

  function drawEchoCutsceneActor(playerScreenX, playerScreenY) {
    const echoX = clamp(playerScreenX + 310, W * 0.58, W * 0.68);
    const echoY = playerScreenY;
    const glow = 0.5 + Math.sin(game.time * 4.2) * 0.14;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(202, 133, 255, ${glow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(echoX + player.w / 2, echoY + player.h + 5, 43, 10, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(161, 88, 255, 0.12)";
    ctx.beginPath();
    ctx.ellipse(echoX + player.w / 2, echoY + player.h / 2, 30, 43, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    drawPlayerBody(echoX, echoY, -1, 1, false, "echo");
    ctx.fillStyle = "rgba(7, 4, 15, 0.82)";
    ctx.fillRect(echoX - 25, echoY - 30, 84, 18);
    ctx.fillStyle = "#d7a5ff";
    ctx.font = "900 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ECHO-00", echoX + player.w / 2, echoY - 27);
    ctx.textAlign = "left";
    return echoX + player.w / 2;
  }

  function drawCutscene() {
    if (!game.cutscene) return;
    const scene = game.cutscene;
    const shot = scene.shots[game.cutsceneShotIndex];
    if (!shot) return;
    const accent = shot.tone === "hostile" ? "#c48cff" : shot.tone === "operative" ? palette.cyan : shot.tone === "control" ? "#8cb7ff" : palette.amber;
    const revealTime = Math.min(1.8, 0.32 + shot.text.length * 0.018);
    const revealRatio = clamp(game.cutsceneShotElapsed / revealTime, 0, 1);
    const revealedText = shot.text.slice(0, Math.ceil(shot.text.length * revealRatio));
    const playerScreenX = player.x - camera.x;
    const playerScreenY = player.y - camera.y;
    const localDuel = scene.visual === "duel" && (shot.speaker.includes("잔영") || shot.speaker.includes("서린"));

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // The gameplay world remains visible: only cinematic framing and interface layers are added.
    const sideShade = ctx.createLinearGradient(0, 0, W, 0);
    sideShade.addColorStop(0, "rgba(0, 2, 7, 0.48)");
    sideShade.addColorStop(0.17, "rgba(0, 2, 7, 0.04)");
    sideShade.addColorStop(0.83, "rgba(0, 2, 7, 0.04)");
    sideShade.addColorStop(1, "rgba(0, 2, 7, 0.48)");
    ctx.fillStyle = sideShade;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(1, 4, 9, 0.88)";
    ctx.fillRect(0, 0, W, 48);
    ctx.fillRect(0, H - 52, W, 52);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 47, W, 2);
    ctx.fillRect(0, H - 54, W, 2);

    ctx.textBaseline = "top";
    ctx.fillStyle = accent;
    ctx.font = "900 11px monospace";
    ctx.fillText(`IN-GAME SCENE // ${String(game.cutsceneShotIndex + 1).padStart(2, "0")}/${String(scene.shots.length).padStart(2, "0")}`, 34, 12);
    ctx.fillStyle = "#efffff";
    ctx.font = "900 17px 'Malgun Gothic', sans-serif";
    ctx.fillText(scene.title, 34, 27);
    ctx.fillStyle = "rgba(224, 242, 244, 0.66)";
    ctx.font = "700 10px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(scene.location, W - 34, 28);
    ctx.textAlign = "left";

    if (scene.gateTransition && game.cutsceneShotIndex === 0) {
      const transitionStageIndex = clamp(stages.findLastIndex((stage) => scene.x >= stage.x), 0, stages.length - 1);
      const transitionStage = stages[transitionStageIndex];
      const ribbonW = 430;
      const ribbonX = W / 2 - ribbonW / 2;
      const ribbonY = 78;
      ctx.fillStyle = "rgba(2, 8, 16, 0.83)";
      ctx.fillRect(ribbonX, ribbonY, ribbonW, 62);
      ctx.fillStyle = transitionStage.color;
      ctx.fillRect(ribbonX, ribbonY, 5, 62);
      ctx.font = "900 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`GATE PASSED // ${transitionStage.code}`, W / 2, ribbonY + 12);
      ctx.fillStyle = "#efffff";
      ctx.font = "900 23px 'Malgun Gothic', sans-serif";
      ctx.fillText(transitionStage.name, W / 2, ribbonY + 29);
      ctx.textAlign = "left";
    }

    let echoActorX = 0;
    if (scene.visual === "duel") {
      echoActorX = drawEchoCutsceneActor(playerScreenX, playerScreenY);
      ctx.fillStyle = "rgba(2, 12, 18, 0.82)";
      ctx.fillRect(playerScreenX - 22, playerScreenY - 30, 82, 18);
      ctx.fillStyle = palette.cyan;
      ctx.font = "900 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("M-07", playerScreenX + player.w / 2, playerScreenY - 27);
      ctx.textAlign = "left";
    }

    if (localDuel) {
      const actorX = shot.speaker.includes("잔영") ? echoActorX : playerScreenX + player.w / 2;
      drawCutsceneSpeechBubble(shot, accent, actorX, playerScreenY, revealedText);
    } else {
      drawCutsceneCommPanel(scene, shot, accent, revealedText);
    }

    const promptPulse = 0.55 + Math.sin(game.time * 5) * 0.18;
    ctx.globalAlpha = promptPulse;
    ctx.fillStyle = "#e8f7f5";
    ctx.font = "800 10px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(revealRatio < 1 ? "클릭 / SPACE · 대사 표시" : "클릭 / SPACE · 다음 대사", W - 34, H - 34);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;

    if (game.cutsceneShotIndex === 0) {
      const fade = clamp(1 - game.cutsceneShotElapsed / 0.48, 0, 1);
      ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function drawTutorialHud() {
    if (!game.tutorialActive) return;
    const step = getTutorialStep();
    if (!step) return;
    const panelW = Math.min(620, W - 44);
    const panelX = (W - panelW) / 2;
    const panelY = 24;
    ctx.save();
    ctx.fillStyle = "rgba(3, 10, 18, 0.93)";
    ctx.fillRect(panelX, panelY, panelW, 94);
    ctx.strokeStyle = game.tutorialPulse > 0 ? palette.white : palette.cyan;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, 94);
    ctx.fillStyle = palette.cyan;
    ctx.fillRect(panelX, panelY, 5, 94);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "900 10px monospace";
    ctx.fillStyle = "#80a7b2";
    ctx.fillText(`MOONLIT MOBILITY COURSE // ${game.tutorialStep + 1}/${TUTORIAL_STEPS.length}`, W / 2, panelY + 10);
    ctx.font = "900 18px 'Malgun Gothic', sans-serif";
    ctx.fillStyle = game.tutorialPulse > 0 ? palette.white : palette.cyan;
    ctx.fillText(step.title, W / 2, panelY + 29);
    ctx.font = "800 12px 'Malgun Gothic', sans-serif";
    ctx.fillStyle = "#d8e7e9";
    ctx.fillText(step.instruction, W / 2, panelY + 55);
    const dotStart = W / 2 - ((TUTORIAL_STEPS.length - 1) * 13) / 2;
    TUTORIAL_STEPS.forEach((_, index) => {
      ctx.fillStyle = index < game.tutorialStep ? palette.cyan : index === game.tutorialStep ? palette.amber : "#30434d";
      ctx.beginPath();
      ctx.arc(dotStart + index * 13, panelY + 82, index === game.tutorialStep ? 4 : 3, 0, TAU);
      ctx.fill();
    });
    ctx.textAlign = "left";
    ctx.restore();
  }

  function drawHud() {
    ctx.save();
    ctx.textBaseline = "top";

    if (game.adminMode) {
      ctx.fillStyle = "rgba(8, 15, 22, 0.9)";
      ctx.fillRect(W / 2 - 310, 98, 620, 68);
      ctx.fillStyle = palette.amber;
      ctx.fillRect(W / 2 - 310, 98, 4, 68);
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ADMIN MODE // PASSIVE ENEMIES // SEALS BYPASSED", W / 2, 106);
      ctx.fillStyle = "#ffe4a0";
      ctx.font = "800 9px 'Malgun Gothic', sans-serif";
      ctx.fillText("A/D 좌우 · SPACE 상승 · SHIFT 하강 · 공중 정지 · 벽 통과 · 이동속도 2배", W / 2, 126);
      ctx.fillText("L 전체 120구역 · 1~5 스테이지 · X 생성 · Z 적/회복템/도약판 영구 삭제 · R 신참", W / 2, 145);
      ctx.textAlign = "left";
    } else if (game.adminCadetMode) {
      ctx.fillStyle = "rgba(8, 15, 22, 0.92)";
      ctx.fillRect(W / 2 - 250, 98, 500, 46);
      ctx.fillStyle = palette.cyan;
      ctx.fillRect(W / 2 - 250, 98, 4, 46);
      ctx.font = "900 11px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#d9ffff";
      ctx.fillText("CADET PLAYTEST // ADMIN POWERS SUSPENDED", W / 2, 106);
      ctx.fillStyle = "#9ed8dd";
      ctx.font = "800 9px 'Malgun Gothic', sans-serif";
      ctx.fillText("현재 위치 유지 · 적 공격·피해·봉쇄 활성화 · R 관리자 복귀", W / 2, 125);
      ctx.textAlign = "left";
    }

    drawTutorialHud();

    if (game.stageAbilityNotice && game.stageAbilityNoticeTimer > 0) {
      const notice = game.stageAbilityNotice;
      const alpha = clamp(Math.min(game.stageAbilityNoticeTimer * 1.8, (6.2 - game.stageAbilityNoticeTimer) * 2.6), 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(3, 8, 15, 0.9)";
      ctx.fillRect(W / 2 - 310, 184, 620, 70);
      ctx.fillStyle = notice.color;
      ctx.fillRect(W / 2 - 310, 184, 5, 70);
      ctx.strokeStyle = `${notice.color}88`;
      ctx.strokeRect(W / 2 - 309.5, 184.5, 619, 69);
      ctx.textAlign = "center";
      ctx.font = "900 18px 'Malgun Gothic', sans-serif";
      ctx.fillStyle = "#f1ffff";
      ctx.fillText(notice.title, W / 2, 196);
      ctx.font = "800 11px 'Malgun Gothic', sans-serif";
      ctx.fillStyle = notice.color;
      ctx.fillText(notice.detail, W / 2, 228);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(7, 7);
    ctx.scale(0.84, 0.84);
    ctx.fillStyle = "rgba(4, 9, 17, 0.72)";
    ctx.fillRect(28, 28, 320, 224);
    const hudSweep = 30 + ((game.time * 34) % 190);
    const hudGlow = ctx.createLinearGradient(28, 0, 348, 0);
    hudGlow.addColorStop(0, "rgba(101, 245, 234, 0)");
    hudGlow.addColorStop(0.45, "rgba(101, 245, 234, 0.2)");
    hudGlow.addColorStop(1, "rgba(101, 245, 234, 0)");
    ctx.fillStyle = hudGlow;
    ctx.fillRect(28, hudSweep, 320, 1);
    ctx.strokeStyle = "rgba(101, 245, 234, 0.38)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 46);
    ctx.lineTo(28, 28);
    ctx.lineTo(94, 28);
    ctx.moveTo(282, 252);
    ctx.lineTo(348, 252);
    ctx.lineTo(348, 234);
    ctx.stroke();
    ctx.fillStyle = "rgba(101, 245, 234, 0.22)";
    ctx.fillRect(28, 28, 4, 224);
    ctx.fillStyle = "#9bb3bd";
    ctx.font = "700 11px monospace";
    ctx.fillText(`OPERATIVE · M-07 · ${difficultySettings[game.difficulty].name}`, 47, 42);

    for (let i = 0; i < player.maxHp; i += 1) {
      ctx.fillStyle = i < player.hp ? palette.red : "#24313d";
      const slant = i * 38;
      ctx.beginPath();
      ctx.moveTo(47 + slant, 66);
      ctx.lineTo(77 + slant, 66);
      ctx.lineTo(71 + slant, 78);
      ctx.lineTo(41 + slant, 78);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = player.airJumpAvailable ? palette.cyan : "#31414d";
    ctx.fillRect(47, 92, 24, 10);
    ctx.strokeStyle = player.airJumpAvailable ? palette.cyan : "#53636e";
    ctx.strokeRect(47, 92, 24, 10);
    ctx.fillStyle = player.airJumpAvailable ? "#dffffc" : "#75838c";
    ctx.font = "700 11px 'Malgun Gothic', sans-serif";
    ctx.fillText(player.airJumpAvailable ? "이중 점프 준비" : "공중 적중 시 재충전", 82, 90);

    ctx.fillStyle = "#263743";
    ctx.fillRect(47, 116, 176, 7);
    const katanaReady = player.attackCooldown <= 0;
    const katanaCycle = Math.max(0.18, player.attackDuration + (player.grounded ? 0.015 : 0.055));
    ctx.fillStyle = katanaReady ? palette.cyan : "#53636e";
    ctx.fillRect(47, 116, 176 * (katanaReady ? 1 : clamp(1 - player.attackCooldown / katanaCycle, 0, 1)), 7);
    ctx.fillStyle = katanaReady ? "#d9ffff" : "#87969d";
    ctx.font = "700 10px 'Malgun Gothic', sans-serif";
    const chainLabel = player.slashChain > 0 && player.slashChainTimer > 0 ? ` · ${player.slashChain}연계` : "";
    const swordName = game.stage >= ACT_FOUR_INDEX ? "화염검" : "일본도";
    ctx.fillText(katanaReady ? `${swordName} · 발도 준비${chainLabel}` : `${swordName} · 납도 중${chainLabel}`, 232, 111);

    const burstReady = game.burstUnlocked && player.burstCooldown <= 0;
    ctx.fillStyle = burstReady ? palette.cyan : "#31414d";
    ctx.fillRect(47, 140, 24, 9);
    ctx.fillStyle = burstReady ? "#dffffc" : "#75838c";
    const burstSkillLabel = game.stage >= ACT_THREE_INDEX ? " · 3탄 패링" : "";
    ctx.fillText(game.burstUnlocked ? (burstReady ? `E · 버스트 준비${burstSkillLabel}` : `버스트 ${player.burstCooldown.toFixed(1)}초`) : "버스트 잠김", 82, 136);
    if (player.buffTimer > 0) {
      ctx.fillStyle = palette.amber;
      ctx.fillText(`정밀 버스트 강화 ${player.buffTimer.toFixed(1)}초`, 207, 136);
    }

    for (let shell = 0; shell < player.maxShells; shell += 1) {
      ctx.fillStyle = shell < player.shells ? palette.amber : "#263743";
      ctx.fillRect(47 + shell * 15, 164, 10, 8);
    }
    ctx.fillStyle = player.shells > 0 ? "#dffefa" : "#73838c";
    ctx.fillText(player.shells > 0 ? "우클릭 · 샷건" : `재장전 ${player.shotgunReload.toFixed(1)}초`, 82, 160);
    ctx.fillStyle = "#263743";
    ctx.fillRect(207, 165, 116, 7);
    ctx.fillStyle = player.shotgunCharge >= 3 ? palette.amber : palette.cyan;
    ctx.fillRect(207, 165, 116 * (player.shotgunCharge / 3), 7);
    ctx.restore();

    const progress = clamp(player.x / (WORLD_W - 160), 0, 1);
    ctx.fillStyle = "rgba(4, 9, 17, 0.72)";
    ctx.fillRect(W - 318, 28, 290, 64);
    ctx.fillStyle = "rgba(101, 245, 234, 0.06)";
    ctx.fillRect(W - 318, 28 + ((game.time * 26) % 62), 290, 1);
    ctx.strokeStyle = "rgba(101, 245, 234, 0.32)";
    ctx.beginPath();
    ctx.moveTo(W - 318, 43);
    ctx.lineTo(W - 318, 28);
    ctx.lineTo(W - 256, 28);
    ctx.moveTo(W - 90, 92);
    ctx.lineTo(W - 28, 92);
    ctx.lineTo(W - 28, 77);
    ctx.stroke();
    ctx.fillStyle = zones[game.zone].color;
    ctx.font = "900 14px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`STAGE 0${game.stage + 1}`, W - 45, 41);
    ctx.fillStyle = "#738b98";
    ctx.font = "10px monospace";
    ctx.fillText(`${Math.floor(progress * 100)}% · ${formatTime(game.runTime)}`, W - 45, 62);
    ctx.fillStyle = "#202f3c";
    ctx.fillRect(W - 295, 77, 250, 3);
    ctx.fillStyle = zones[game.zone].color;
    ctx.fillRect(W - 295, 77, 250 * progress, 3);
    const hudZoneRemaining = getZoneRemaining(game.zone);
    ctx.fillStyle = game.adminMode ? palette.amber : hudZoneRemaining > 0 ? palette.red : palette.cyan;
    ctx.font = "800 9px 'Malgun Gothic', sans-serif";
    ctx.fillText(game.adminMode ? "관리자 권한 · 모든 봉쇄 통과" : hudZoneRemaining > 0 ? `구역 봉쇄 · 잔여 ${hudZoneRemaining}` : "구역 확보 · 다음 구역 개방", W - 295, 87);
    ctx.textAlign = "left";


    const boss = enemies.find((enemy) => enemy.type === "boss" && enemy.alive && Math.abs(player.x - enemy.originX) < 1500);
    if (boss) {
      const bossDefinition = BOSS_DEFINITIONS[boss.bossKind] || BOSS_DEFINITIONS.warden;
      ctx.fillStyle = "rgba(3, 7, 13, 0.82)";
      ctx.fillRect(W / 2 - 280, 42, 560, 34);
      ctx.fillStyle = "#c5d1d5";
      ctx.font = "800 12px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bossDefinition.name, W / 2, 49);
      ctx.fillStyle = "#39202b";
      ctx.fillRect(W / 2 - 240, 62, 480, 6);
      ctx.fillStyle = bossDefinition.accent;
      ctx.fillRect(W / 2 - 240, 62, 480 * (boss.hp / boss.maxHp), 6);
      ctx.textAlign = "left";
    }

    const activeRoom = combatRooms.find((room) => room.triggered && !room.cleared && player.x > room.left - 80 && player.x < room.right + 80);
    if (activeRoom && !boss) {
      ctx.fillStyle = "rgba(3, 7, 13, 0.82)";
      ctx.fillRect(W / 2 - 245, 42, 490, 56);
      ctx.fillStyle = activeRoom.formationAccent || palette.red;
      ctx.fillRect(W / 2 - 245, 42, 4, 56);
      ctx.fillStyle = "#e5eef0";
      ctx.font = "800 12px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${activeRoom.name} · 잔여 ${activeRoom.remaining ?? 0}`, W / 2, 55);
      ctx.fillStyle = activeRoom.anchorAlive ? activeRoom.formationAccent : palette.cyan;
      ctx.font = "700 10px 'Malgun Gothic', sans-serif";
      ctx.fillText(
        activeRoom.anchorAlive
          ? `${activeRoom.formationName} 활성 · ${activeRoom.formationTarget} 우선 / ${activeRoom.terrainName}`
          : `적 연계 붕괴 · ${activeRoom.terrainName} ${activeRoom.terrainStep || 0}단계`,
        W / 2,
        76,
      );
      ctx.textAlign = "left";
    }

    if (player.combo > 1 && player.comboTimer > 0) {
      const rank = getStyleRank(player.styleScore);
      ctx.fillStyle = "rgba(4, 9, 17, 0.76)";
      ctx.fillRect(W - 218, H - 164, 184, 82);
      ctx.fillStyle = rank.color;
      ctx.fillRect(W - 218, H - 164, 4, 82);
      ctx.font = "900 42px monospace";
      ctx.fillText(rank.letter, W - 198, H - 154);
      ctx.font = "900 16px monospace";
      ctx.fillText(`${player.combo} CHAIN`, W - 145, H - 147);
      ctx.fillStyle = "#a9bdc4";
      ctx.font = "700 10px 'Malgun Gothic', sans-serif";
      ctx.fillText(rank.name, W - 145, H - 122);
      ctx.fillStyle = "#263743";
      ctx.fillRect(W - 198, H - 96, 144, 4);
      ctx.fillStyle = rank.color;
      ctx.fillRect(W - 198, H - 96, 144 * (player.styleScore / 100), 4);
    }

    if (game.arenaTitle > 0) {
      const alpha = Math.min(1, game.arenaTitle * 1.8, (3.2 - game.arenaTitle) * 2);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = palette.red;
      ctx.font = "900 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("LOCKDOWN COMBAT", W / 2, 126);
      ctx.fillStyle = palette.white;
      ctx.font = "900 28px 'Malgun Gothic', sans-serif";
      ctx.fillText("봉쇄 전투 개시", W / 2, 148);
      const titleRoom = combatRooms.find((room) => room.triggered && !room.cleared && player.x > room.left - 80 && player.x < room.right + 80);
      if (titleRoom) {
        ctx.fillStyle = titleRoom.formationAccent || palette.red;
        ctx.font = "800 11px 'Malgun Gothic', sans-serif";
        ctx.fillText(`${titleRoom.formationName} × ${titleRoom.terrainName}`, W / 2, 169);
      }
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    if (game.stageTitle > 0) {
      const stage = stages[game.stage];
      const alpha = Math.min(1, game.stageTitle * 1.4, (4.4 - game.stageTitle) * 1.25);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = "rgba(3, 8, 16, 0.78)";
      ctx.fillRect(W / 2 - 245, 266, 490, 79);
      ctx.fillStyle = stage.color;
      ctx.fillRect(W / 2 - 245, 266, 490, 3);
      ctx.font = "800 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(stage.code, W / 2, 282);
      ctx.fillStyle = palette.white;
      ctx.font = "900 27px 'Malgun Gothic', sans-serif";
      ctx.fillText(stage.name, W / 2, 306);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }

    drawStory();

    ctx.restore();
  }

  function drawScanlines() {
    ctx.fillStyle = "rgba(0, 8, 14, 0.055)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${game.flash * 2.4})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawCrosshair() {
    if (!pointer.active || game.mode === "menu" || game.cutscene) return;
    const x = pointer.screenX;
    const y = pointer.screenY;
    const ready = player.shells > 0 && player.shotgunCooldown <= 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = ready ? (player.shotgunCharge >= 3 ? palette.amber : palette.cyan) : "#6f7d86";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0.2, 1.2);
    ctx.arc(0, 0, 10, 1.8, 2.8);
    ctx.arc(0, 0, 10, 3.35, 4.35);
    ctx.arc(0, 0, 10, 4.95, 5.95);
    ctx.stroke();
    ctx.fillStyle = palette.white;
    ctx.fillRect(-1, -1, 3, 3);
    ctx.globalAlpha = 0.7;
    ctx.font = "700 9px monospace";
    ctx.fillText("L:DRAW / R:SHOT", 16, 13);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const flipped = game.screenFlipActive && game.mode !== "menu";
    if (flipped) {
      ctx.save();
      ctx.translate(0, H);
      ctx.scale(1, -1);
    }
    drawBackground();
    drawWorld();
    if (game.mode !== "menu" && !game.cutscene) drawHud();
    drawCrosshair();
    drawCutscene();
    if (flipped) ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawScanlines();
    if (game.screenFlipFlash > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(game.screenFlipFlash, 0, 1) * 0.32;
      ctx.fillStyle = "#d7a0ff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  let previousTime = performance.now();
  function frame(now) {
    const rawDt = Math.min((now - previousTime) / 1000, 0.033);
    previousTime = now;
    update(rawDt);
    render();
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (game.mode === "playing") {
      clearTouchPointers();
      game.mode = "paused";
      pauseScreen.classList.add("visible");
    } else if (game.mode === "paused") {
      game.mode = "playing";
      pauseScreen.classList.remove("visible");
      previousTime = performance.now();
    }
  }

  function registerAdminSequence(difficultyKey) {
    if (game.mode !== "menu" || adminModeUnlocked) return false;
    if (difficultyKey === ADMIN_SEQUENCE[adminSequenceProgress]) {
      adminSequenceProgress += 1;
    } else {
      adminSequenceProgress = difficultyKey === ADMIN_SEQUENCE[0] ? 1 : 0;
    }
    sound.wake();
    if (adminSequenceProgress < ADMIN_SEQUENCE.length) {
      if (adminStatus) {
        adminStatus.hidden = true;
        adminStatus.classList.remove("pending");
        adminStatus.textContent = "";
      }
      return false;
    }

    adminModeUnlocked = true;
    adminSequenceProgress = 0;
    game.adminMode = true;
    startScreen.classList.add("admin-enabled");
    if (adminStatus) {
      adminStatus.hidden = false;
      adminStatus.classList.remove("pending");
      adminStatus.textContent = "ADMIN MODE 활성화 · 적 공격/접촉 피해 없음 · 구역 및 스테이지 봉쇄 해제";
    }
    if (startScreenEditToggle) startScreenEditToggle.hidden = false;
    sound.tone(740, 0.12, "square", 0.035, 0.82);
    setTimeout(() => sound.tone(1040, 0.18, "sine", 0.035, 1.05), 90);
    return true;
  }

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.screenX = clamp((event.clientX - bounds.left) * (W / bounds.width), 0, W);
    const rawScreenY = clamp((event.clientY - bounds.top) * (H / bounds.height), 0, H);
    pointer.screenY = game.screenFlipActive ? H - rawScreenY : rawScreenY;
    pointer.active = true;
  }

  function aimAtWorldPoint(worldX, worldY) {
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    const deltaX = worldX - playerCenterX;
    const deltaY = worldY - playerCenterY;
    const length = Math.max(0.001, Math.hypot(deltaX, deltaY));
    return { x: deltaX / length, y: deltaY / length };
  }

  function findTouchSlashTarget(worldX, worldY) {
    const nextSlashChain = player.grounded
      ? (player.slashChainTimer > 0 ? (player.slashChain % 3) + 1 : 1)
      : 0;
    const charged = false;
    let closest = null;
    let closestDistance = Infinity;

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const margin = enemy.type === "boss" ? 88 : 48;
      const tappedEnemy = worldX >= enemy.x - margin
        && worldX <= enemy.x + enemy.w + margin
        && worldY >= enemy.y - margin
        && worldY <= enemy.y + enemy.h + margin;
      if (!tappedEnemy) continue;

      const enemyCenterX = enemy.x + enemy.w / 2;
      const enemyCenterY = enemy.y + enemy.h / 2;
      const aim = aimAtWorldPoint(enemyCenterX, enemyCenterY);
      const prospectiveSlashBox = buildAttackBox(aim, charged, nextSlashChain);
      if (!overlaps(prospectiveSlashBox, enemy)) continue;

      const tapDistance = Math.hypot(enemyCenterX - worldX, enemyCenterY - worldY);
      if (tapDistance < closestDistance) {
        closest = { enemy, aim };
        closestDistance = tapDistance;
      }
    }
    return closest;
  }

  function startTouchContextAttack() {
    if (
      game.mode !== "playing"
      || game.cutscene
      || game.tutorialOpen
      || adminSpawnPanel?.hidden === false
      || adminZonePanel?.hidden === false
      || adminWorldEditor?.hidden === false
    ) return;
    const worldX = pointer.screenX + camera.x;
    const worldY = pointer.screenY + camera.y;
    const slashTarget = findTouchSlashTarget(worldX, worldY);
    if (slashTarget) {
      startAttack(slashTarget.aim);
      return;
    }
    startShotgun(aimAtWorldPoint(worldX, worldY));
  }

  function findMobileAimTarget(maxDistance, minimumDot = -0.2) {
    const playerCenterX = player.x + player.w / 2;
    const playerCenterY = player.y + player.h / 2;
    const stickAim = getMoveStickAim();
    let best = null;
    let bestScore = Infinity;
    for (const enemy of getActiveEnemies()) {
      if (!enemy.alive || enemy.hidden) continue;
      const dx = enemy.x + enemy.w / 2 - playerCenterX;
      const dy = enemy.y + enemy.h / 2 - playerCenterY;
      const distance = Math.hypot(dx, dy);
      if (distance > maxDistance || distance < 1) continue;
      const dot = dx / distance * stickAim.x + dy / distance * stickAim.y;
      if (moveStick.magnitude > 0.18 && dot < minimumDot) continue;
      const score = distance * (moveStick.magnitude > 0.18 ? 1.4 - clamp(dot, -1, 1) * 0.4 : 1);
      if (score < bestScore) {
        best = enemy;
        bestScore = score;
      }
    }
    return best;
  }

  function startTouchDirectAttack(type) {
    if (game.mode !== "playing" || game.cutscene || game.tutorialOpen || adminWorldEditor?.hidden === false) return;
    const target = findMobileAimTarget(type === "slash" ? 260 : 1080, type === "slash" ? -0.45 : -0.05);
    const aim = target
      ? aimAtWorldPoint(target.x + target.w / 2, target.y + target.h / 2)
      : getMoveStickAim();
    if (type === "slash") startAttack(aim);
    else startShotgun(aim);
    navigator.vibrate?.(type === "slash" ? 9 : 14);
  }

  function setVirtualKey(code, active) {
    if (active) {
      if (!keys.has(code)) pressed.add(code);
      keys.add(code);
    } else {
      keys.delete(code);
    }
  }

  function syncMoveStickAimPointer() {
    const aim = getMoveStickAim();
    const playerScreenX = player.x + player.w / 2 - camera.x;
    const playerScreenY = player.y + player.h / 2 - camera.y;
    pointer.screenX = clamp(playerScreenX + aim.x * 280, 0, W);
    pointer.screenY = clamp(playerScreenY + aim.y * 280, 0, H);
    pointer.active = true;
  }

  function updateMoveJoystick(entry, clientX, clientY) {
    const bounds = entry.control.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const rawLength = Math.hypot(deltaX, deltaY);
    const radius = Math.max(28, Math.min(bounds.width, bounds.height) * 0.4);
    const normalizedX = rawLength > 0 ? deltaX / rawLength : 0;
    const normalizedY = rawLength > 0 ? deltaY / rawLength : 0;
    const clampedLength = Math.min(rawLength, radius);
    const rawMagnitude = clamp(clampedLength / radius, 0, 1);
    const magnitude = rawMagnitude < INPUT_TUNING.joystickDeadzone
      ? 0
      : clamp((rawMagnitude - INPUT_TUNING.joystickDeadzone) / (1 - INPUT_TUNING.joystickDeadzone), 0, 1);

    moveStick.active = true;
    moveStick.magnitude = magnitude;
    moveStick.x = normalizedX * magnitude;
    moveStick.y = normalizedY * magnitude;
    if (magnitude > 0) {
      moveStick.aimX = normalizedX;
      moveStick.aimY = normalizedY;
    } else {
      moveStick.aimX = player.facing;
      moveStick.aimY = 0;
    }

    const offsetX = normalizedX * clampedLength;
    const offsetY = normalizedY * clampedLength;
    if (touchJoystickKnob) touchJoystickKnob.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;
    entry.control.classList.toggle("engaged", magnitude > 0);
    entry.control.setAttribute("aria-valuetext", magnitude > 0 ? `이동 ${Math.round(normalizedX * 100)}, ${Math.round(normalizedY * 100)}` : "중립");
    syncMoveStickAimPointer();
  }

  function resetMoveJoystick() {
    moveStick.x = 0;
    moveStick.y = 0;
    moveStick.magnitude = 0;
    moveStick.active = false;
    moveStick.aimX = player.facing;
    moveStick.aimY = 0;
    if (touchJoystickKnob) touchJoystickKnob.style.removeProperty("transform");
    touchJoystick?.classList.remove("engaged", "touch-active");
    touchJoystick?.setAttribute("aria-valuetext", "중립");
  }

  function releaseTouchPointer(pointerId, event = null) {
    const entry = touchPointers.get(pointerId);
    if (!entry) return;
    if (entry.key) setVirtualKey(entry.key, false);
    if (entry.action === "jump") setVirtualKey("Space", false);
    if (entry.action === "move") resetMoveJoystick();
    entry.control.classList.remove("touch-active");
    if (entry.control.matches?.("button")) entry.control.setAttribute("aria-pressed", "false");
    touchPointers.delete(pointerId);
  }

  function clearTouchPointers() {
    for (const pointerId of [...touchPointers.keys()]) releaseTouchPointer(pointerId);
  }

  function isTouchDevice() {
    const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
    return Boolean(coarsePointer || navigator.maxTouchPoints > 0 || "ontouchstart" in window);
  }

  let viewportSyncFrame = 0;

  function syncVisibleViewport() {
    viewportSyncFrame = 0;
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.round(viewport?.width || window.innerWidth || document.documentElement.clientWidth));
    const height = Math.max(1, Math.round(viewport?.height || window.innerHeight || document.documentElement.clientHeight));
    document.documentElement.style.setProperty("--app-width", `${width}px`);
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  }

  function scheduleVisibleViewportSync() {
    if (viewportSyncFrame) cancelAnimationFrame(viewportSyncFrame);
    viewportSyncFrame = requestAnimationFrame(syncVisibleViewport);
  }

  function fullscreenSupported() {
    return Boolean(document.fullscreenEnabled !== false && document.documentElement.requestFullscreen);
  }

  function syncFullscreenButtons() {
    const supported = fullscreenSupported();
    const active = Boolean(document.fullscreenElement);
    if (fullscreenButton) {
      fullscreenButton.hidden = !supported || !isTouchDevice();
      fullscreenButton.textContent = active ? "전체화면 종료" : "⛶ 전체화면";
      fullscreenButton.setAttribute("aria-pressed", String(active));
    }
    if (touchFullscreenButton) {
      touchFullscreenButton.hidden = !supported;
      touchFullscreenButton.textContent = active ? "×" : "⛶";
      touchFullscreenButton.setAttribute("aria-pressed", String(active));
      touchFullscreenButton.setAttribute("aria-label", active ? "전체화면 종료" : "전체화면 전환");
    }
  }

  async function toggleMobileFullscreen() {
    if (!fullscreenSupported() && !document.fullscreenElement) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.info("Fullscreen request was not available:", error?.message || error);
    }
    scheduleVisibleViewportSync();
    syncFullscreenButtons();
  }

  function enterMobileFullscreen() {
    if (!isTouchDevice() || document.fullscreenElement || !fullscreenSupported()) return;
    document.documentElement.requestFullscreen().catch(() => {});
  }

  function syncTouchControls() {
    const touchCapable = isTouchDevice();
    document.documentElement.classList.toggle("touch-capable", touchCapable);
    if (touchControls) touchControls.hidden = !touchCapable;
    syncFullscreenButtons();
  }

  function handleTouchControlDown(event) {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    event.stopPropagation();
    sound.wake();
    const control = event.currentTarget;
    const key = control.dataset.touchKey || null;
    const action = control.dataset.touchAction || null;
    const entry = {
      control,
      key,
      action,
      startX: event.clientX,
      startY: event.clientY,
    };
    touchPointers.set(event.pointerId, entry);
    control.classList.add("touch-active");
    if (control.matches?.("button")) control.setAttribute("aria-pressed", "true");
    control.setPointerCapture?.(event.pointerId);

    if (game.cutscene) {
      requestCutsceneAdvance();
      return;
    }
    if (key) {
      setVirtualKey(key, true);
      return;
    }
    if (action === "move") updateMoveJoystick(entry, event.clientX, event.clientY);
    else if (action === "jump") setVirtualKey("Space", true);
    else if (action === "burst") startBurst();
    else if (action === "slash") startTouchDirectAttack("slash");
    else if (action === "shotgun") startTouchDirectAttack("shotgun");
    else if (action === "pause") togglePause();
    else if (action === "fullscreen") toggleMobileFullscreen();
  }

  function handleTouchControlMove(event) {
    const entry = touchPointers.get(event.pointerId);
    if (!entry || entry.action !== "move") return;
    event.preventDefault();
    updateMoveJoystick(entry, event.clientX, event.clientY);
  }

  function handleTouchControlUp(event) {
    if (!touchPointers.has(event.pointerId)) return;
    event.preventDefault();
    releaseTouchPointer(event.pointerId, event);
  }

  canvas.addEventListener("mousemove", updatePointer);
  canvas.addEventListener("pointerdown", (event) => {
    if (game.adminMode && adminWorldEditor?.hidden === false) {
      event.preventDefault();
      event.stopPropagation();
      updatePointer(event);
      beginAdminWorldTransform(event);
      return;
    }

    if (event.pointerType !== "touch") return;
    event.preventDefault();
    updatePointer(event);
    sound.wake();
    if (game.cutscene) {
      requestCutsceneAdvance();
      return;
    }
    startTouchContextAttack();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (adminWorldTransform && adminWorldTransform.pointerId === event.pointerId) {
      event.preventDefault();
      updatePointer(event);
      updateAdminWorldTransform(event);
      return;
    }
    if (event.pointerType !== "touch") return;
    event.preventDefault();
    updatePointer(event);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(type, (event) => {
      if (!adminWorldTransform || adminWorldTransform.pointerId !== event.pointerId) return;
      event.preventDefault();
      finishAdminWorldTransform(event);
    });
  }
  canvas.addEventListener("mousedown", (event) => {
    updatePointer(event);
    event.preventDefault();
    sound.wake();
    if (game.cutscene) {
      requestCutsceneAdvance();
      return;
    }
    if (game.tutorialOpen || adminSpawnPanel?.hidden === false || adminZonePanel?.hidden === false || adminWorldEditor?.hidden === false) return;
    if (event.button === 0) startAttack();
    if (event.button === 2) startShotgun();
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    if (event.target?.matches?.("input, textarea, select")) {
      if (event.code === "Escape") {
        event.preventDefault();
        if (startScreenEditor?.hidden === false) setStartScreenEditor(false);
        else setAdminWorldEditor(false);
      } else if (event.code === "Enter") {
        if (adminWorldEditor?.hidden === false) {
          event.preventDefault();
          saveAdminWorldSelection();
        }
      }
      return;
    }
    const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "Escape", "ShiftLeft", "ShiftRight", "KeyA", "KeyD", "KeyW", "KeyS", "KeyJ", "KeyK", "KeyE", "KeyF", "KeyC", "KeyX", "KeyZ", "KeyR", "KeyL", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Numpad1", "Numpad2", "Numpad3", "Numpad4", "Numpad5"];
    if (handled.includes(event.code)) event.preventDefault();
    const firstPress = !keys.has(event.code);
    if (firstPress) pressed.add(event.code);
    keys.add(event.code);

    if (game.tutorialOpen) {
      if (firstPress && ["Space", "Enter", "Escape"].includes(event.code)) closeTutorialPanel();
      return;
    }

    if (firstPress && event.code === "KeyL" && game.adminMode && game.mode === "playing") {
      toggleAdminZonePanel();
      pressed.delete("KeyL");
      return;
    }
    if (adminZonePanel?.hidden === false) {
      if (event.code === "Escape") setAdminZonePanel(false);
      return;
    }

    const stageKey = /^(?:Digit|Numpad)([1-5])$/.exec(event.code) || /^([1-5])$/.exec(event.key || "");
    if (firstPress && stageKey && game.adminMode && game.mode === "playing") teleportAdminToStage(Number(stageKey[1]));
    if (firstPress && event.code === "KeyR" && game.mode === "playing" && (game.adminMode || game.adminCadetMode)) {
      toggleAdminCadetMode();
      pressed.delete("KeyR");
    }
    if (event.code === "Escape") {
      if (startScreenEditor?.hidden === false) setStartScreenEditor(false);
      else if (adminWorldEditor?.hidden === false) setAdminWorldEditor(false);
      else if (adminSpawnPanel?.hidden === false) setAdminSpawnPanel(false);
      else togglePause();
    }
    if (event.code === "Enter" && game.mode === "menu") resetGame();
    if (event.code === "Enter" && game.mode === "won") resetGame();
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    clearTouchPointers();
    keys.clear();
    pressed.clear();
    setAdminSpawnPanel(false);
    setAdminZonePanel(false);
    if (game.mode === "playing") togglePause();
  });

  for (const button of touchControlButtons) {
    button.addEventListener("pointerdown", handleTouchControlDown);
    button.addEventListener("pointermove", handleTouchControlMove);
    button.addEventListener("pointerup", handleTouchControlUp);
    button.addEventListener("pointercancel", handleTouchControlUp);
    button.addEventListener("lostpointercapture", handleTouchControlUp);
  }
  window.matchMedia?.("(pointer: coarse)")?.addEventListener?.("change", syncTouchControls);
  window.visualViewport?.addEventListener("resize", scheduleVisibleViewportSync);
  window.visualViewport?.addEventListener("scroll", scheduleVisibleViewportSync);
  window.addEventListener("resize", scheduleVisibleViewportSync);
  window.addEventListener("orientationchange", () => setTimeout(scheduleVisibleViewportSync, 120));
  document.addEventListener("fullscreenchange", () => {
    scheduleVisibleViewportSync();
    syncFullscreenButtons();
  });
  syncVisibleViewport();
  syncTouchControls();

  startButton.addEventListener("click", () => {
    enterMobileFullscreen();
    resetGame(false);
  });
  continueButton?.addEventListener("click", () => {
    enterMobileFullscreen();
    resetGame(true);
  });
  fullscreenButton?.addEventListener("click", toggleMobileFullscreen);
  resumeButton?.addEventListener("click", () => {
    sound.wake();
    togglePause();
  });
  restartButton.addEventListener("click", () => resetGame(false));
  startScreenEditToggle?.addEventListener("click", () => setStartScreenEditor(startScreenEditor?.hidden !== false));
  startScreenEditorClose?.addEventListener("click", () => setStartScreenEditor(false));
  startScreenEditSave?.addEventListener("click", saveStartScreenEditor);
  startScreenEditReset?.addEventListener("click", resetStartScreenEditor);
  adminSpawnClose?.addEventListener("click", () => setAdminSpawnPanel(false));
  adminZoneClose?.addEventListener("click", () => setAdminZonePanel(false));
  tutorialClose?.addEventListener("click", closeTutorialPanel);
  for (const button of adminSpawnButtons) {
    button.addEventListener("click", () => spawnAdminSelection(button.dataset.adminSpawn));
  }
  for (const button of adminWorldCreateButtons) {
    button.addEventListener("click", () => createAdminWorldObject(button.dataset.adminWorldCreate));
  }
  adminWorldEditNearest?.addEventListener("click", findNearestAdminWorldObject);
  adminWorldEditorClose?.addEventListener("click", () => setAdminWorldEditor(false));
  adminWorldSave?.addEventListener("click", saveAdminWorldSelection);
  adminWorldUndo?.addEventListener("click", undoAdminWorldTransform);
  adminWorldDelete?.addEventListener("click", deleteAdminWorldSelection);
  adminWorldReset?.addEventListener("click", resetAdminWorldSelection);
  for (const button of difficultyButtons) {
    button.addEventListener("click", () => {
      selectedDifficulty = button.dataset.difficulty;
      registerAdminSequence(button.dataset.difficulty);
      for (const item of difficultyButtons) {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      }
    });
  }

  applyStartScreenEdits(startScreenEditData || START_SCREEN_DEFAULTS);
  prepareTutorialBriefing();
  buildLevel();
  levelReady = true;
  window.__MOONLIT_ECHO_DIAGNOSTICS__ = () => ({
    version: "3.1.0",
    worldWidth: WORLD_W,
    progressiveZoneWidths: true,
    terrainGeneration: "vertical-ascent-routes-v2.8.0",
    randomSignatureTerrain: false,
    earlyStageTerrainPreserved: true,
    platformComplexityBudgetByStage: [[0, 0, 1, 1], [0, 1, 1, 2], [1, 1, 2, 2], [1, 2, 2, 3], [2, 2, 3, 4]],
    hazardComplexityBudgetByStage: [[0, 0, 0, 1], [0, 1, 1, 1], [1, 1, 2, 2], [1, 2, 2, 3], [2, 2, 3, 4]],
    zoneWidthStep: ZONE_WIDTH_STEP,
    zoneWidthRange: [zoneDiversityMetrics.minWidth, zoneDiversityMetrics.maxWidth],
    uniqueZoneLayoutSignatures: zoneDiversityMetrics.layoutSignatureCount,
    uniqueZoneEnemySignatures: zoneDiversityMetrics.enemySignatureCount,
    zoneEnemyCountRange: [zoneDiversityMetrics.minEnemyCount, zoneDiversityMetrics.maxEnemyCount],
    uniqueZonePlatforms: true,
    uniqueZoneHazards: true,
    uniqueZoneEnemyCompositions: true,
    layeredRouteTransitions: true,
    routeTransitionBudgetByStage: ROUTE_TRANSITION_BUDGET_BY_STAGE.map((row) => [...row]),
    routeProfileCount: new Set(zones.map((zone) => zone.routeProfile).filter(Boolean)).size,
    layeredRouteZoneCount: zones.filter((zone) => zone.routeProfile).length,
    verticalTraversalLayerRange: [
      Math.min(...zones.filter((zone) => Number.isFinite(zone.verticalTraversalLayers)).map((zone) => zone.verticalTraversalLayers)),
      Math.max(...zones.filter((zone) => Number.isFinite(zone.verticalTraversalLayers)).map((zone) => zone.verticalTraversalLayers)),
    ],
    routeTransitionRange: [
      Math.min(...zones.filter((zone) => Number.isFinite(zone.routeTransitionCount)).map((zone) => zone.routeTransitionCount)),
      Math.max(...zones.filter((zone) => Number.isFinite(zone.routeTransitionCount)).map((zone) => zone.routeTransitionCount)),
    ],
    stages: stages.length,
    zones: zones.length,
    zonesPerStage: ZONES_PER_STAGE,
    midBossZone: MID_BOSS_ZONE_INDEX + 1,
    finalBossZone: BOSS_ZONE_INDEX + 1,
    enemies: enemies.length,
    enemyPlacementDensity: "artillery-tower-formations-v3.0.0",
    enemyBaseCountByStage: [8, 10, 12, 14, 16],
    stageCombatPressure: [...STAGE_COMBAT_PRESSURE],
    stageBulletPressure: [...STAGE_BULLET_PRESSURE],
    progressiveCombatDifficulty: true,
    sentryRoles: { runner: "charge", gunner: "single-shot", machinegun: "four-round-burst", turret: "five-parallel-wall-piercing-shot", mortarTurret: "triple-mortar-volley" },
    runnerDashPathTelegraph: false,
    runnerCompactChargeTelegraph: true,
    machinegunBurstRounds: SENTRY_BURST_ROUNDS,
    machinegunBurstInterval: SENTRY_BURST_INTERVAL,
    machinegunCount: enemies.filter((enemy) => enemy.type === "machinegun").length,
    turretCount: enemies.filter((enemy) => enemy.type === "turret").length,
    turretBaseHp: TURRET_BASE_HP,
    turretShieldHpRatio: 1.5,
    turretVolleyCount: 5,
    turretAimTelegraph: false,
    turretPrefireLocalCharge: true,
    turretChargeDisplay: "muzzle-convergence",
    playerFrameBasedAnimation: true,
    playerRunPoseCount: 8,
    playerAttackKeyPoseCount: 3,
    playerSecondaryMotion: true,
    enemyFrameBasedGait: true,
    pixelSnappedJoints: true,
    turretChargeSeconds: TURRET_CHARGE_SECONDS,
    turretCannonMuzzle: true,
    turretShotsPiercePlatforms: true,
    mortarTurretCount: enemies.filter((enemy) => enemy.type === "mortarTurret").length,
    mortarTurretBaseHp: MORTAR_TURRET_BASE_HP,
    mortarTurretVolleyCount: MORTAR_TURRET_VOLLEY_COUNT,
    mortarTurretTerrainCollision: true,
    mortarExactMarkedImpact: true,
    mortarBallisticTargetLock: true,
    mortarTurretAdminSpawn: ADMIN_SPAWN_TYPES.has("mortarTurret"),
    enemyHomeZoneNormalization: true,
    enemyZoneAuditIntervalSeconds: 0.45,
    enemiesOutsideHomeZone: enemies.filter((enemy) => enemy.alive && isEnemyOutsideHomeZone(enemy)).length,
    activeEnemies: getActiveEnemies().length,
    platforms: platforms.length,
    zoneTemplateCount: new Set(zones.map((zone) => zone.template)).size,
    distinctStageMaps: true,
    stageMapIdentities: [...STAGE_MAP_IDENTITIES],
    exclusiveStageTemplates: ["scrapCrane", "furnacePiston", "cathedralNave", "antennaShaft", "memoryLabyrinth"],
    stageBackgroundLandmarks: false,
    backgroundStyle: "restored-v2.2.6",
    progressiveTerrainDifficulty: true,
    terrainDifficultyTiers: [1, 2, 3, 4, 5],
    platformSpatialIndex: true,
    platformSpatialBucketWidth: "variable-zone-index",
    activeEnemyBulletCollisionOnly: true,
    combatTerrainActiveEnemyOnly: true,
    enemyWorldCullIntervalSeconds: 0.5,
    midBossHp: Object.fromEntries(stages.map((stage) => [stage.midBossKind, BOSS_DEFINITIONS[stage.midBossKind].hp])),
    bossHp: Object.fromEntries(stages.map((stage) => [stage.bossKind, BOSS_DEFINITIONS[stage.bossKind].hp])),
    bossHpScale: 0.75,
    bossDifficultyCurve: BOSS_DIFFICULTY_CURVE.map((entry) => ({ ...entry })),
    bossDifficultyCurveProgressive: true,
    wardenFloatingChassis: true,
    wardenPanelPassiveCooldowns: [...WARDEN_PANEL_COOLDOWNS],
    wardenPanelShotsPerUnit: WARDEN_PANEL_SHOTS_PER_UNIT,
    wardenPanelShotInterval: WARDEN_PANEL_SHOT_INTERVAL,
    wardenAttackRecoveryScale: WARDEN_ATTACK_RECOVERY_SCALE,
    wardenPanelCountByPhase: [4, 5],
    wardenPanelWaveOverlap: false,
    hunterShieldFrontUntilReflection: true,
    hunterShieldFlipsBehindOnBreak: true,
    furnaceCoreExplosionFx: true,
    oracleControlInversionHpRatio: 0.5,
    oracleScreenFlipHpRatio: 0.25,
    weaverIceStorm: true,
    weaverSnowSpeedMultiplier: 0.58,
    censorPhaseTwoFullArenaSnow: true,
    revenantMeleeCombo: false,
    revenantShieldArtillery: true,
    revenantPhaseTwoSupportFire: true,
    revenantShieldRoundsGrantCharge: 0.8,
    censorArenaLaserCount: 0,
    proxyName: "의사",
    proxySelfInjection: true,
    proxyArenaLaserCount: 0,
    echoAdaptiveCombatAI: true,
    echoSkillMultiplier: 3,
    bossDashTelegraphs: true,
    bossDeathPickupSuppressed: true,
    adminFlightSpeed: INPUT_TUNING.moveSpeed * 2,
    bossRewardsEnabled: false,
    midBossHealReward: false,
    gongmunSwordMotion: true,
    gongmunSwordWaves: true,
    gongmunSwordWaveOrientation: "vertical-crescent",
    gongmunSimplifiedArmor: true,
    adminDirectCanvasTransform: true,
    adminTransformHandles: 8,
    adminTransformAutoSave: true,
    mobileDedicatedAttackButtons: true,
    mobileAttackAimAssist: true,
    campaignSaveVersion: 2,
    continueUsesCheckpointKey: true,
    continueRollsBackCurrentZone: true,
    activeCheckpointKey: player.respawnCheckpointKey,
    checkpointSafetyPass: checkpoints.every((checkpoint) => {
      const position = getCheckpointRespawnPosition(checkpoint);
      return checkpointSpawnIsSafe(position.x, position.y);
    }),
    cheolgakFunnelFormation: "single-side",
    cheolgakFunnelShots: 5,
    empoweredSlashBonus: EMPOWERED_SLASH_BONUS,
    overchargedShotgunDamage: OVERCHARGED_SHOTGUN_DAMAGE,
    overchargedShotgunPellets: OVERCHARGED_SHOTGUN_PELLETS,
    slashBulletDestroy: true,
    burstOnlyBulletRemoval: false,
    burstOnlyRegularBulletRemoval: false,
    slashAffectsBullets: "all-deflectable-projectiles",
    doctorFlaskSlashClear: true,
    doctorPoisonGasSlashClear: true,
    mutantDebrisSlashClear: false,
    proxyMutationHealRatio: 0.25,
    parryEnabled: false,
    burstTripleParryEnabled: true,
    burstTripleParryAct: ACT_THREE_INDEX + 1,
    burstTripleParryProjectileCount: BURST_PARRY_PROJECTILE_COUNT,
    flameSwordEnabled: true,
    flameSwordAct: ACT_FOUR_INDEX + 1,
    flameSwordBurnSeconds: FLAME_SWORD_BURN_SECONDS,
    flameSwordBurnInterval: FLAME_SWORD_BURN_INTERVAL,
    flameSwordBurnDamage: FLAME_SWORD_BURN_DAMAGE,
    stageAbilityAnnouncements: true,
    playerBulletReflection: false,
    echoParryEnabled: false,
    allDirectionBulletDestroy: false,
    slashUsesFrozenAttackAnchor: true,
    slashBladeHalfWidth: 34,
    playerBurstCooldown: PLAYER_BURST_COOLDOWN,
    playerGroundSeamStepHeight: PLAYER_GROUND_SEAM_STEP_HEIGHT,
    playerPlatformStepHeight: PLAYER_PLATFORM_STEP_HEIGHT,
    playerStepUpRequiresClearance: true,
    manualRespawnKeyEnabled: false,
    adminRModeToggle: true,
    enemyHitInterruptsFire: false,
    bossRetreatEveryHits: 2,
    normalEnemyRepairDropChance: NORMAL_ENEMY_REPAIR_DROP_CHANCE,
    embeddedRepairPickupsRemoved: true,
    hunterReflectBreakSeconds: HUNTER_REFLECT_BREAK_SECONDS,
    hunterDashTelegraphRange: HUNTER_DASH_RANGE,
    breakerHalfHpLaser: true,
    breakerBeamDamage: 1,
    wardenBeamDamage: 2,
    enemyViewportDespawn: false,
    enemyWorldKillPlaneOnly: true,
    initialOffscreenEnemyCleanup: true,
    initialOffscreenEnemyRemovals,
    tutorialStage: true,
    tutorialSteps: TUTORIAL_STEPS.length,
    tutorialSkills: TUTORIAL_STEPS.map((step) => step.id),
    tutorialStrictZones: true,
    tutorialRanges: TUTORIAL_STEPS.map(({ id, minX, maxX }) => ({ id, minX, maxX })),
    tutorialActive: game.tutorialActive,
    tutorialCompleted: game.tutorialCompleted,
    tutorialStep: game.tutorialStep,
    tutorialCurrentSkill: game.tutorialActive ? getTutorialStep()?.id || null : null,
    tutorialInRequiredZone: game.tutorialActive && isPlayerInTutorialStepZone(),
    tutorialSignals: { ...game.tutorialSignals },
    shieldBaseHp: SHIELD_BASE_HP,
    shotgunDamage: SHOTGUN_DAMAGE,
    shotgunPelletLife: SHOTGUN_PELLET_LIFE,
    overchargedShotgunPelletLife: OVERCHARGED_SHOTGUN_PELLET_LIFE,
    breakerFunnels: false,
    shieldGuardHits: SHIELD_GUARD_HITS,
    shieldAirGuard: true,
    zoneSigns: zones.length,
    signAutoRaiseAbovePlatforms: true,
    signRenderLayer: "foreground",
    hunterRangedAttacks: true,
    oracleShotgunSwapDelay: 0.12,
    oracleReturnImpactDelay: 0.24,
    oracleReturnDamagesPlayer: true,
    storyTutorialGate: true,
    proceduralBeamChargeSfx: true,
    proceduralBeamFireSfx: true,
    proceduralFlaskShatterSfx: true,
    storyStageContext: true,
    storyQueueContext: true,
    prologueTriggerX: TUTORIAL_END_X + 620,
    storyStable: Boolean(game.cutscene || game.story) ? game.shake === 0 : true,
  });
  Object.assign(document.documentElement.dataset, {
    gameVersion: "3.1.0",
    worldWidth: String(WORLD_W),
    progressiveZoneWidths: "true",
    terrainGeneration: "vertical-ascent-routes-v2.8.0",
    randomSignatureTerrain: "false",
    earlyStageTerrainPreserved: "true",
    platformComplexityBudgetByStage: "0-0-1-1|0-1-1-2|1-1-2-2|1-2-2-3|2-2-3-4",
    hazardComplexityBudgetByStage: "0-0-0-1|0-1-1-1|1-1-2-2|1-2-2-3|2-2-3-4",
    zoneWidthStep: String(ZONE_WIDTH_STEP),
    zoneWidthRange: zoneDiversityMetrics.minWidth + "," + zoneDiversityMetrics.maxWidth,
    uniqueZoneLayoutSignatures: String(zoneDiversityMetrics.layoutSignatureCount),
    uniqueZoneEnemySignatures: String(zoneDiversityMetrics.enemySignatureCount),
    zoneEnemyCountRange: zoneDiversityMetrics.minEnemyCount + "," + zoneDiversityMetrics.maxEnemyCount,
    uniqueZonePlatforms: "true",
    uniqueZoneHazards: "true",
    uniqueZoneEnemyCompositions: "true",
    layeredRouteTransitions: "true",
    routeTransitionBudgetByStage: ROUTE_TRANSITION_BUDGET_BY_STAGE.map((row) => row.join("-")).join("|"),
    routeProfileCount: String(new Set(zones.map((zone) => zone.routeProfile).filter(Boolean)).size),
    layeredRouteZoneCount: String(zones.filter((zone) => zone.routeProfile).length),
    verticalTraversalLayerRange: [
      Math.min(...zones.filter((zone) => Number.isFinite(zone.verticalTraversalLayers)).map((zone) => zone.verticalTraversalLayers)),
      Math.max(...zones.filter((zone) => Number.isFinite(zone.verticalTraversalLayers)).map((zone) => zone.verticalTraversalLayers)),
    ].join(","),
    stageCount: String(stages.length),
    zoneCount: String(zones.length),
    distinctStageMaps: "true",
    stageMapIdentities: STAGE_MAP_IDENTITIES.join(","),
    exclusiveStageTemplates: "scrapCrane,furnacePiston,cathedralNave,antennaShaft,memoryLabyrinth",
    stageBackgroundLandmarks: "false",
    backgroundStyle: "restored-v2.2.6",
    progressiveTerrainDifficulty: "true",
    terrainDifficultyTiers: "1,2,3,4,5",
    platformSpatialIndex: "true",
    platformSpatialBucketWidth: "variable-zone-index",
    activeEnemyBulletCollisionOnly: "true",
    combatTerrainActiveEnemyOnly: "true",
    enemyWorldCullIntervalSeconds: "0.5",
    enemyPlacementDensity: "artillery-tower-formations-v3.0.0",
    enemyBaseCountByStage: "8,10,12,14,16",
    stageCombatPressure: STAGE_COMBAT_PRESSURE.join(","),
    stageBulletPressure: STAGE_BULLET_PRESSURE.join(","),
    progressiveCombatDifficulty: "true",
    sentryRoles: "runner:charge,gunner:single-shot,machinegun:four-round-burst,turret:five-parallel-wall-piercing-shot,mortarTurret:triple-mortar-volley",
    runnerDashPathTelegraph: "false",
    runnerCompactChargeTelegraph: "true",
    machinegunBurstRounds: String(SENTRY_BURST_ROUNDS),
    machinegunBurstInterval: String(SENTRY_BURST_INTERVAL),
    machinegunCount: String(enemies.filter((enemy) => enemy.type === "machinegun").length),
    turretCount: String(enemies.filter((enemy) => enemy.type === "turret").length),
    turretBaseHp: String(TURRET_BASE_HP),
    turretShieldHpRatio: "1.5",
    turretVolleyCount: "5",
    turretAimTelegraph: "false",
    turretPrefireLocalCharge: "true",
    turretChargeDisplay: "muzzle-convergence",
    playerFrameBasedAnimation: "true",
    playerRunPoseCount: "8",
    playerAttackKeyPoseCount: "3",
    playerSecondaryMotion: "true",
    enemyFrameBasedGait: "true",
    pixelSnappedJoints: "true",
    turretChargeSeconds: String(TURRET_CHARGE_SECONDS),
    turretCannonMuzzle: "true",
    turretShotsPiercePlatforms: "true",
    mortarTurretCount: String(enemies.filter((enemy) => enemy.type === "mortarTurret").length),
    mortarTurretBaseHp: String(MORTAR_TURRET_BASE_HP),
    mortarTurretVolleyCount: String(MORTAR_TURRET_VOLLEY_COUNT),
    mortarTurretTerrainCollision: "true",
    mortarExactMarkedImpact: "true",
    mortarBallisticTargetLock: "true",
    mortarTurretAdminSpawn: String(ADMIN_SPAWN_TYPES.has("mortarTurret")),
    enemyHomeZoneNormalization: "true",
    enemyZoneAuditIntervalSeconds: "0.45",
    enemiesOutsideHomeZone: String(enemies.filter((enemy) => enemy.alive && isEnemyOutsideHomeZone(enemy)).length),
    zonesPerStage: String(ZONES_PER_STAGE),
    midBossZone: String(MID_BOSS_ZONE_INDEX + 1),
    finalBossZone: String(BOSS_ZONE_INDEX + 1),
    enemyCount: String(enemies.length),
    activeEnemyCount: String(getActiveEnemies().length),
    platformCount: String(platforms.length),
    midBossHp: stages.map((stage) => `${stage.midBossKind}:${BOSS_DEFINITIONS[stage.midBossKind].hp}`).join(","),
    bossHp: stages.map((stage) => `${stage.bossKind}:${BOSS_DEFINITIONS[stage.bossKind].hp}`).join(","),
    bossHpScale: "0.75",
    bossDifficultyCurve: BOSS_DIFFICULTY_CURVE.map((entry) => [entry.mobility, entry.cooldown, entry.windup, entry.reaction].join("/")).join(","),
    bossDifficultyCurveProgressive: "true",
    wardenFloatingChassis: "true",
    wardenPanelPassiveCooldowns: WARDEN_PANEL_COOLDOWNS.join(","),
    wardenPanelCountByPhase: "4,5",
    wardenPanelShotsPerUnit: String(WARDEN_PANEL_SHOTS_PER_UNIT),
    wardenPanelShotInterval: String(WARDEN_PANEL_SHOT_INTERVAL),
    wardenAttackRecoveryScale: String(WARDEN_ATTACK_RECOVERY_SCALE),
    wardenPanelWaveOverlap: "false",
    hunterShieldFrontUntilReflection: "true",
    hunterShieldFlipsBehindOnBreak: "true",
    furnaceCoreExplosionFx: "true",
    oracleControlInversionHpRatio: "0.5",
    oracleScreenFlipHpRatio: "0.25",
    weaverIceStorm: "true",
    weaverSnowSpeedMultiplier: "0.58",
    censorPhaseTwoFullArenaSnow: "true",
    revenantMeleeCombo: "false",
    revenantShieldArtillery: "true",
    revenantPhaseTwoSupportFire: "true",
    revenantShieldRoundsGrantCharge: "0.8",
    censorArenaLaserCount: "0",
    proxyName: "의사",
    proxySelfInjection: "true",
    proxyArenaLaserCount: "0",
    echoAdaptiveCombatAI: "true",
    echoSkillMultiplier: "3",
    bossDashTelegraphs: "true",
    bossDeathPickupSuppressed: "true",
    shieldBaseHp: String(SHIELD_BASE_HP),
    shieldGuardMax: "2",
    shieldBreakSeconds: "3.2",
    shieldAttackCooldown: "2.15",
    bulwarkDamageMultiplier: "0.75",
    adminZoneTeleport: "120",
    adminNoclip: "true",
    adminFlightSpeed: String(INPUT_TUNING.moveSpeed * 2),
    jeokrinPermanentReflect: "true",
    yukhwaShotgunSwap: "true",
    bossRewardsEnabled: "false",
    midBossHealReward: "false",
    bossRewardDamagePerLevel: "0",
    gongmunSwordMotion: "true",
    gongmunSwordWaves: "true",
    gongmunSwordWaveOrientation: "vertical-crescent",
    gongmunSimplifiedArmor: "true",
    adminDirectCanvasTransform: "true",
    adminTransformHandles: "8",
    adminTransformAutoSave: "true",
    mobileDedicatedAttackButtons: "true",
    mobileAttackAimAssist: "true",
    campaignSaveVersion: "2",
    burstTripleParryEnabled: "true",
    burstTripleParryAct: String(ACT_THREE_INDEX + 1),
    burstTripleParryProjectileCount: String(BURST_PARRY_PROJECTILE_COUNT),
    flameSwordEnabled: "true",
    flameSwordAct: String(ACT_FOUR_INDEX + 1),
    flameSwordBurnSeconds: String(FLAME_SWORD_BURN_SECONDS),
    flameSwordBurnInterval: String(FLAME_SWORD_BURN_INTERVAL),
    flameSwordBurnDamage: String(FLAME_SWORD_BURN_DAMAGE),
    stageAbilityAnnouncements: "true",
    continueUsesCheckpointKey: "true",
    continueRollsBackCurrentZone: "true",
    checkpointSafetyPass: String(checkpoints.every((checkpoint) => {
      const position = getCheckpointRespawnPosition(checkpoint);
      return checkpointSpawnIsSafe(position.x, position.y);
    })),
    cheolgakFunnelFormation: "single-side",
    cheolgakFunnelShots: "5",
    cheolgakFunnelShotInterval: String(WARDEN_PANEL_SHOT_INTERVAL),
    empoweredSlashBonus: String(EMPOWERED_SLASH_BONUS),
    chargedSlashBonus: String(CHARGED_SLASH_BONUS),
    overchargedShotgunDamage: String(OVERCHARGED_SHOTGUN_DAMAGE),
    overchargedShotgunPellets: String(OVERCHARGED_SHOTGUN_PELLETS),
    slashBulletDestroy: "true",
    burstOnlyBulletRemoval: "false",
    burstOnlyRegularBulletRemoval: "false",
    slashAffectsBullets: "all-deflectable-projectiles",
    doctorFlaskSlashClear: "true",
    doctorPoisonGasSlashClear: "true",
    mutantDebrisSlashClear: "false",
    proxyMutationHealRatio: "0.25",
    parryEnabled: "false",
    playerBulletReflection: "false",
    echoParryEnabled: "false",
    allDirectionBulletDestroy: "false",
    slashUsesFrozenAttackAnchor: "true",
    slashBladeHalfWidth: "34",
    playerBurstCooldown: String(PLAYER_BURST_COOLDOWN),
    playerGroundSeamStepHeight: String(PLAYER_GROUND_SEAM_STEP_HEIGHT),
    playerPlatformStepHeight: String(PLAYER_PLATFORM_STEP_HEIGHT),
    playerStepUpRequiresClearance: "true",
    manualRespawnKeyEnabled: "false",
    adminRModeToggle: "true",
    enemyHitInterruptsFire: "false",
    bossRetreatEveryHits: "2",
    normalEnemyRepairDropChance: String(NORMAL_ENEMY_REPAIR_DROP_CHANCE),
    embeddedRepairPickupsRemoved: "true",
    hunterReflectBreakSeconds: String(HUNTER_REFLECT_BREAK_SECONDS),
    hunterDashTelegraphRange: String(HUNTER_DASH_RANGE),
    breakerHalfHpLaser: "true",
    breakerBeamDamage: "1",
    wardenBeamDamage: "2",
    enemyViewportDespawn: "false",
    enemyWorldKillPlaneOnly: "true",
    initialOffscreenEnemyCleanup: "true",
    initialOffscreenEnemyRemovals: String(initialOffscreenEnemyRemovals),
    tutorialStage: "true",
    tutorialSteps: String(TUTORIAL_STEPS.length),
    tutorialSkills: TUTORIAL_STEPS.map((step) => step.id).join(","),
    tutorialStrictZones: "true",
    tutorialRanges: TUTORIAL_STEPS.map((step) => `${step.id}:${step.minX}-${step.maxX}`).join(","),
    shotgunDamage: String(SHOTGUN_DAMAGE),
    shotgunPelletLife: String(SHOTGUN_PELLET_LIFE),
    overchargedShotgunPelletLife: String(OVERCHARGED_SHOTGUN_PELLET_LIFE),
    breakerFunnels: "false",
    shieldGuardHits: String(SHIELD_GUARD_HITS),
    shieldAirGuard: "true",
    zoneSignCount: String(zones.length),
    signAutoRaiseAbovePlatforms: "true",
    signRenderLayer: "foreground",
    hunterRangedAttacks: "true",
    oracleShotgunSwapDelay: "0.12",
    oracleReturnImpactDelay: "0.24",
    oracleReturnDamagesPlayer: "true",
    storyTutorialGate: "true",
    proceduralBeamChargeSfx: "true",
    proceduralBeamFireSfx: "true",
    proceduralFlaskShatterSfx: "true",
    storyStageContext: "true",
    storyQueueContext: "true",
    prologueTriggerX: String(TUTORIAL_END_X + 620),
  });
  updateContinueButton();
  requestAnimationFrame(frame);
})();
