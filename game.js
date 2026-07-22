(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const startScreen = document.getElementById("start-screen");
  const pauseScreen = document.getElementById("pause-screen");
  const endScreen = document.getElementById("end-screen");
  const startButton = document.getElementById("start-button");
  const restartButton = document.getElementById("restart-button");
  const resultText = document.getElementById("result-text");
  const difficultyButtons = [...(document.querySelectorAll?.("[data-difficulty]") || [])];

  const W = 1280;
  const H = 720;
  const WORLD_W = 36000;
  const WORLD_H = 1450;
  const GRAVITY = 2050;
  const TAU = Math.PI * 2;

  const keys = new Set();
  const pressed = new Set();
  const pointer = { screenX: W * 0.72, screenY: H * 0.48, active: false };
  const platforms = [];
  const hazards = [];
  const checkpoints = [];
  const enemies = [];
  const bullets = [];
  const particles = [];
  const pickups = [];
  const signs = [];
  const rain = [];
  const boostNodes = [];
  const combatRooms = [];

  const zones = [
    { x: 0, name: "백야 검문선", code: "01 · WHITE NIGHT", color: "#65f5ea" },
    { x: 3000, name: "로봇 폐기야적장", code: "02 · SCRAP FIELD", color: "#ffcd70" },
    { x: 6000, name: "압축기 회랑", code: "03 · CRUSHER HALL", color: "#ff6a64" },
    { x: 9000, name: "회수 열차 상부", code: "04 · SALVAGE RAIL", color: "#8effa1" },
    { x: 12000, name: "무허가 조립동", code: "05 · BLACK ASSEMBLY", color: "#e5f4ff" },
    { x: 15000, name: "냉각 수직갱", code: "06 · COLD SHAFT", color: "#8cb7ff" },
    { x: 18000, name: "기억 세척실", code: "07 · MEMORY WASH", color: "#ff6ca8" },
    { x: 21000, name: "소각 관제교", code: "08 · PURGE BRIDGE", color: "#ff3f64" },
    { x: 24000, name: "지하 피난선", code: "09 · SHELTER LINE", color: "#74d8ff" },
    { x: 27000, name: "잔향 보관층", code: "10 · ECHO ARCHIVE", color: "#d7a0ff" },
    { x: 30000, name: "역송신 승강로", code: "11 · UPLINK SHAFT", color: "#90ffd4" },
    { x: 33000, name: "새벽 송신탑", code: "12 · DAWN ARRAY", color: "#ff5e87" },
  ];

  const stages = [
    { x: 0, name: "작전 4호 · 백야 폐기장", code: "STAGE 01 · SCRAP RAIN", color: "#65f5ea" },
    { x: 12000, name: "검은 공장 · 기억 세척", code: "STAGE 02 · FALSE MEMORY", color: "#ff7d8d" },
    { x: 24000, name: "지하 피난선 · 새벽 송신", code: "STAGE 03 · LAST BROADCAST", color: "#d7a0ff" },
  ];

  const difficultySettings = {
    chick: { name: "병아리", hp: 5, damage: 0, enemySpeed: 0.82, bulletSpeed: 0.82 },
    cadet: { name: "신참내기", hp: 5, damage: 1, enemySpeed: 1, bulletSpeed: 1 },
    darkhorse: { name: "다크호스", hp: 4, damage: 1, enemySpeed: 1.14, bulletSpeed: 1.12 },
    weapon: { name: "인간흉기", hp: 1, damage: 99, enemySpeed: 1.24, bulletSpeed: 1.2 },
  };
  let selectedDifficulty = "cadet";

  const INTRO_STORY = [
    {
      speaker: "감찰 기록 04-11",
      text: "백야 폐기장에서 구조 요청이 반복되고 있다. 문제는 발신자 전원이 여섯 해 전에 사망 처리됐다는 것이다.",
      tone: "archive",
      duration: 5.4,
    },
    {
      speaker: "감찰관 · 도담",
      text: "M-07, 불법 인공지능 생산 증거를 확보하고 노동자들을 구조해. 중앙국은 흔적까지 소각하라고 했지만 아직 사람이 있어.",
      tone: "control",
      duration: 5.8,
    },
    {
      speaker: "M-07",
      text: "작전 4호로 전환한다. 구조 신호가 하나라도 남아 있다면 소각 명령은 보류한다.",
      tone: "operative",
      duration: 4.7,
    },
  ];

  const STORY_EVENTS = [
    {
      id: "scrap-field",
      x: 3000,
      lines: [{ speaker: "감찰관 · 도담", text: "폐기 로봇들이 사람을 공격한 게 아니야. 무언가로부터 피난 통로를 지키고 있어.", tone: "control", duration: 5.2 }],
    },
    {
      id: "crusher",
      x: 6100,
      lines: [{ speaker: "잔향 · 새봄", text: "검은 비가 오면 세 번째 압축기 아래로 숨어. 언니가 반드시 데리러 올 거야.", tone: "archive", duration: 5.0 }],
    },
    {
      id: "assembly",
      x: 12000,
      lines: [{ speaker: "생산 기록", text: "민간인 기억을 전투 인공지능의 공포 학습 데이터로 전환한다. 불량 기억은 세척 후 재투입한다.", tone: "archive", duration: 5.8 }],
    },
    {
      id: "memory-wash",
      x: 18000,
      lines: [
        { speaker: "감찰관 · 도담", text: "새봄이라는 아이의 파형이 네 의체 기억과 일치해. M-07, 중앙국이 네 과거까지 재료로 쓴 거야.", tone: "control", duration: 5.2 },
        { speaker: "M-07", text: "그렇다면 이 목소리는 미끼가 아니라 증인이다. 전부 지상으로 내보낸다.", tone: "operative", duration: 4.8 },
      ],
    },
    {
      id: "purge-warden",
      x: 22000,
      lines: [{ speaker: "소각 집행기 · 적비", text: "감찰 개체의 명령 위반 확인. 증거와 생존 신호를 같은 화염으로 정리한다.", tone: "hostile", duration: 5.2 }],
    },
    {
      id: "shelter-line",
      x: 24100,
      lines: [{ speaker: "감찰관 · 도담", text: "관제교 아래에 피난 열차가 있어. 기억 신호가 열차 제어망을 붙잡고 소각을 막고 있었어.", tone: "control", duration: 5.6 }],
    },
    {
      id: "echo-archive",
      x: 27100,
      lines: [{ speaker: "잔향 합창", text: "우리를 사람으로 복원하지 않아도 돼. 우리가 여기 있었다는 사실만 밖으로 보내 줘.", tone: "archive", duration: 5.4 }],
    },
    {
      id: "uplink",
      x: 30100,
      lines: [{ speaker: "M-07", text: "나는 잃어버린 기억의 주인이 아닐지도 모른다. 그래도 이 증언을 지킬 사람은 지금의 나다.", tone: "operative", duration: 5.5 }],
    },
    {
      id: "dawn-array",
      x: 33100,
      lines: [{ speaker: "중앙국 검열기 · 무명", text: "사망자의 목소리는 증언할 권리가 없다. 송신탑과 함께 침묵하라.", tone: "hostile", duration: 5.8 }],
    },
  ];

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
    stage: 0,
    stageTitle: 4.4,
    zone: 0,
    zoneTitle: 3.4,
    hint: "A / D 이동 · 마우스로 조준",
    hintTimer: 5,
    bossDefeated: false,
    stageBossDefeated: false,
    startedAt: 0,
    burstUnlocked: false,
    storyQueue: [],
    story: null,
    storyTimer: 0,
    storySeen: new Set(),
    arenaTitle: 0,
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
    coyote: 0,
    jumpBuffer: 0,
    airJumpAvailable: true,
    attackTimer: 0,
    attackCooldown: 0,
    attackId: 0,
    attackDir: { x: 1, y: -0.2 },
    invincible: 0,
    hp: 5,
    maxHp: 5,
    respawnX: 150,
    respawnY: 540,
    trail: [],
    afterimageTimer: 0,
    combo: 0,
    comboTimer: 0,
    slashChain: 0,
    slashChainTimer: 0,
    attackDuration: 0.22,
    styleScore: 0,
    echoGauge: 0,
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
    buffTimer: 0,
    squash: 0,
    stepTimer: 0,
    runCycle: 0,
  };

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

    checkpoint() {
      this.tone(440, 0.12, "sine", 0.04, 1.5);
      setTimeout(() => this.tone(660, 0.18, "sine", 0.035, 1.25), 80);
    }
  }

  const sound = new Sound();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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

  function getStyleRank(score) {
    if (score >= 88) return { letter: "S", name: "잔향 폭주", color: "#ffcd70" };
    if (score >= 68) return { letter: "A", name: "공중 지배", color: "#ff708c" };
    if (score >= 48) return { letter: "B", name: "연속 절단", color: "#d7a0ff" };
    if (score >= 24) return { letter: "C", name: "흐름 유지", color: "#65f5ea" };
    return { letter: "D", name: "교전 개시", color: "#7f98a5" };
  }

  function addPlatform(x, y, w, h = 36, kind = "roof") {
    platforms.push({ x, y, originalY: y, w, h, kind });
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
    hazards.push({ x, y: adjustedY, w, h, kind, phase, active: true });
  }

  function addCheckpoint(x, y, label) {
    checkpoints.push({ x, y, w: 32, h: 88, label, active: false });
  }

  function addPickup(x, y, kind = "repair") {
    pickups.push({ x, y, w: 24, h: 24, kind, active: true, bob: hash(x) * TAU });
  }

  function addBoostNode(x, y, launchX = 0, launchY = -430) {
    boostNodes.push({ x, y, w: 38, h: 38, launchX, launchY, hitAttackId: -1, pulse: hash(x + y) * TAU });
  }

  function addSign(x, y, text, sub = "") {
    signs.push({ x, y, text, sub });
  }

  function addEnemy(type, x, surfaceY, range = 150) {
    const sizes = {
      runner: [42, 52, 2],
      gunner: [44, 58, 3],
      piercer: [46, 58, 3],
      mortar: [54, 64, 4],
      drone: [50, 34, 1],
      shield: [50, 66, 4],
      boss: [92, 104, 16],
    };
    const [w, h, hp] = sizes[type];
    const support = type === "drone" ? null : platforms.find((platform) => (
      x + w / 2 >= platform.x
      && x + w / 2 <= platform.x + platform.w
      && Math.abs(surfaceY - platform.originalY) < 4
    ));
    const adjustedSurfaceY = support ? support.y : surfaceY;
    const enemy = {
      type,
      x,
      y: type === "drone" ? surfaceY : adjustedSurfaceY - h,
      baseY: type === "drone" ? surfaceY : adjustedSurfaceY - h,
      w,
      h,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      alive: true,
      facing: -1,
      originX: x,
      range,
      cooldown: hash(x) * 1.4,
      windup: 0,
      hurt: 0,
      anim: hash(x) * 5,
      hitAttackId: -1,
      hitShotId: -1,
      blockedAttackId: -1,
      bossPhase: 0,
    };
    enemies.push(enemy);
    return enemy;
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
    originBoss.hp = 24;
    originBoss.maxHp = 24;
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

    const floorHeights = [650, 680, 650, 620, 660, 700, 650, 640, 680, 660, 700, 640];
    const zoneKinds = ["roof", "cargo", "factory", "cargo", "lab", "channel", "vault", "gate", "channel", "vault", "tower", "origin"];
    const enemySets = [
      ["runner", "runner", "gunner", "drone", "runner", "shield"],
      ["runner", "drone", "gunner", "shield", "runner", "piercer"],
      ["shield", "gunner", "drone", "runner", "mortar", "runner"],
      ["runner", "piercer", "drone", "shield", "gunner", "runner"],
    ];

    for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
      const origin = zoneIndex * 3000;
      const floorY = floorHeights[zoneIndex];
      const kind = zoneKinds[zoneIndex];
      const upperBias = zoneIndex % 3 === 1 ? -45 : zoneIndex % 3 === 2 ? 35 : 0;

      // 각 구역은 중앙의 넓은 공백을 샷건 반동, 이중 점프, 공중 적중으로 넘게 설계한다.
      addPlatform(origin, floorY, 1200, WORLD_H - floorY, kind);
      addPlatform(origin + 1500, floorY, 1500, WORLD_H - floorY, kind);
      addPlatform(origin + 260, floorY - 135, 250, 28, kind);
      addPlatform(origin + 700, floorY - 255 + upperBias, 250, 28, kind);
      addPlatform(origin + 1080, floorY - 390, 230, 28, kind);
      addPlatform(origin + 1570, floorY - 270 - upperBias, 270, 28, kind);
      addPlatform(origin + 2000, floorY - 405, 250, 28, kind);
      addPlatform(origin + 2460, floorY - 190, 280, 28, kind);

      addHazard(origin + 940, floorY - 22, 120, 22, "spike");
      addHazard(origin + 2290, floorY - 22, 110, 22, "spike");
      if ([2, 5, 8, 10].includes(zoneIndex)) {
        addHazard(origin + 1900, floorY - 430, 24, 430, "laser", zoneIndex * 0.37);
      }

      const set = enemySets[zoneIndex % enemySets.length];
      addEnemy(set[0], origin + 520, floorY, 170);
      addEnemy(set[1], origin + 810, floorY - 255 + upperBias, 90);
      addEnemy(set[2], origin + 1120, floorY - 390, 80);
      addEnemy(set[3], origin + 1660, floorY - 360, 170);
      addEnemy(set[4], origin + 2070, floorY - 405, 90);
      addEnemy(set[5], origin + 2640, floorY, 150);

      addBoostNode(origin + 1300, floorY - 185, 250, -460);
      addPickup(origin + 2110, floorY - 455);
      addSign(origin + 120, floorY - 65, zones[zoneIndex].name, zones[zoneIndex].code);
      addCheckpoint(origin + 110, floorY - 88, zones[zoneIndex].name);
    }

    // 수직 전투 구간. 숨은 좌표 보정 없이 실제 보이는 벽과 동일한 충돌체를 사용한다.
    addPlatform(4470, 300, 46, 380, "cargo");
    addPlatform(13450, 280, 46, 380, "lab");
    addPlatform(19440, 270, 46, 380, "vault");
    addPlatform(28450, 280, 46, 380, "vault");
    addPlatform(31450, 250, 46, 450, "tower");

    // 1막과 3막의 보스는 반복 생성 적을 대체해 독립된 결전 공간을 만든다.
    for (const enemy of enemies) {
      if ((enemy.originX > 22200 && enemy.originX < 23900) || enemy.originX > 34500) enemy.alive = false;
    }
    const purgeWarden = addEnemy("boss", 22640, floorHeights[7], 520);
    purgeWarden.hp = 18;
    purgeWarden.maxHp = 18;
    const censorCore = addEnemy("boss", 35120, floorHeights[11], 560);
    censorCore.hp = 26;
    censorCore.maxHp = 26;

    combatRooms.push(
      { left: 6200, right: 8900, name: "압축기 연속 교전", triggered: false, cleared: false },
      { left: 17100, right: 20100, name: "기억 세척실 봉쇄", triggered: false, cleared: false },
      { left: 30100, right: 32900, name: "역송신 승강로 방어", triggered: false, cleared: false },
    );

    game.totalEnemies = enemies.filter((enemy) => enemy.alive).length;
    initRain();
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

  function resetGame() {
    buildLevel();
    const difficulty = difficultySettings[selectedDifficulty];
    Object.assign(player, {
      x: 150,
      y: 540,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      coyote: 0,
      jumpBuffer: 0,
      airJumpAvailable: true,
      attackTimer: 0,
      attackCooldown: 0,
      attackId: 0,
      invincible: 0,
      hp: difficulty.hp,
      maxHp: difficulty.hp,
      respawnX: 150,
      respawnY: 540,
      trail: [],
      afterimageTimer: 0,
      combo: 0,
      comboTimer: 0,
      slashChain: 0,
      slashChainTimer: 0,
      attackDuration: 0.22,
      styleScore: 0,
      echoGauge: 0,
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
      buffTimer: 0,
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
      stage: 0,
      stageTitle: 4.4,
      zone: 0,
      zoneTitle: 3.4,
      hint: "A / D 이동 · 마우스로 조준",
      hintTimer: 5,
      bossDefeated: false,
      stageBossDefeated: false,
      startedAt: performance.now(),
      burstUnlocked: false,
      storyQueue: INTRO_STORY.map((line) => ({ ...line })),
      story: null,
      storyTimer: 0,
      storySeen: new Set(),
      arenaTitle: 0,
    });
    camera.x = 0;
    camera.y = 0;
    keys.clear();
    pressed.clear();
    startScreen.classList.remove("visible");
    pauseScreen.classList.remove("visible");
    endScreen.classList.remove("visible");
    sound.wake();
  }

  function queueStory(lines) {
    for (const line of lines) game.storyQueue.push({ duration: 4.8, tone: "archive", ...line });
  }

  function updateStory(dt) {
    if (game.story) {
      game.storyTimer -= dt;
      if (game.storyTimer <= 0) game.story = null;
    }
    if (!game.story && game.storyQueue.length > 0) {
      game.story = game.storyQueue.shift();
      game.storyTimer = game.story.duration;
      const signalTone = game.story.tone === "hostile" ? 105 : game.story.tone === "operative" ? 320 : 470;
      sound.tone(signalTone, 0.07, "square", 0.014, 1.35);
    }
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
  }

  function getPointerAim() {
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;
    const targetX = pointer.active ? pointer.screenX + camera.x : centerX + player.facing * 240;
    const targetY = pointer.active ? pointer.screenY + camera.y : centerY;
    const length = Math.max(1, Math.hypot(targetX - centerX, targetY - centerY));
    return { x: (targetX - centerX) / length, y: (targetY - centerY) / length };
  }

  function startShotgun() {
    if (game.mode !== "playing" || player.shotgunCooldown > 0 || player.shells <= 0) return;
    const aim = getPointerAim();
    const overcharged = player.shotgunCharge >= 3;
    const pelletCount = overcharged ? 9 : 6;
    const spread = overcharged ? 0.21 : 0.16;
    const centerX = player.x + player.w / 2 + aim.x * 24;
    const centerY = player.y + player.h * 0.45 + aim.y * 12;

    player.shotId += 1;
    player.shells -= 1;
    player.shotgunCooldown = overcharged ? 0.36 : 0.27;
    player.shotgunReload = overcharged ? 1.02 : 0.78;
    player.recoilTimer = 0.18;
    if (overcharged) player.shotgunCharge = 0;

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
        life: overcharged ? 0.36 : 0.25,
        enemy: false,
        kind: "shotgun",
        gravity: 0,
        color: overcharged ? palette.amber : palette.cyan,
        damage: overcharged ? 3 : 1,
        shotId: player.shotId,
        piercing: overcharged,
      });
    }

    const horizontalRecoil = player.grounded ? 190 : 330;
    const verticalRecoil = player.grounded ? 130 : 440;
    player.vx -= aim.x * horizontalRecoil;
    player.vy -= aim.y * verticalRecoil;
    if (!player.grounded && aim.y > 0.25) player.vy = Math.min(player.vy, -410 - aim.y * 170);
    player.facing = aim.x >= 0 ? 1 : -1;
    player.squash = 0.18;
    game.shake = overcharged ? 22 : 13;
    game.freeze = overcharged ? 0.055 : 0.025;
    spawnParticles(centerX, centerY, overcharged ? palette.amber : palette.white, overcharged ? 28 : 15, overcharged ? 620 : 460, 0.32, 180);
    sound.shotgun(overcharged);
  }

  function startAttack() {
    if (game.mode !== "playing" || player.attackCooldown > 0 || player.attackTimer > 0) return;

    const aim = getPointerAim();
    let dirX = pointer.active ? aim.x : player.facing;
    let dirY = pointer.active ? aim.y : 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) dirY = -0.82;
    if (keys.has("KeyS") || keys.has("ArrowDown")) dirY = 0.82;
    if (!pointer.active && (keys.has("KeyA") || keys.has("ArrowLeft"))) dirX = -1;
    if (!pointer.active && (keys.has("KeyD") || keys.has("ArrowRight"))) dirX = 1;
    const directionLength = Math.max(1, Math.hypot(dirX, dirY));
    player.attackDir.x = dirX / directionLength;
    player.attackDir.y = dirY / directionLength;
    player.facing = player.attackDir.x >= 0 ? 1 : -1;
    player.chargedAttack = player.echoGauge >= 100;
    if (player.chargedAttack) player.echoGauge = 0;

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
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, player.chargedAttack ? palette.amber : palette.cyan, player.chargedAttack ? 14 : 6, 220, 0.3, 100);
    sound.attack();
  }

  function attackBox() {
    const vertical = Math.abs(player.attackDir.y) > 0.25;
    const reach = player.chargedAttack ? 82 : player.slashChain === 3 ? 76 : 68;
    const centerX = player.x + player.w / 2 + player.attackDir.x * reach;
    const centerY = player.y + player.h / 2 + player.attackDir.y * reach;
    const charged = player.chargedAttack;
    return {
      x: centerX - (vertical ? (charged ? 70 : 55) : (charged ? 108 : player.slashChain === 3 ? 92 : 84)),
      y: centerY - (vertical ? (charged ? 105 : 82) : (charged ? 72 : 52)),
      w: vertical ? (charged ? 140 : 110) : charged ? 216 : player.slashChain === 3 ? 184 : 168,
      h: vertical ? (charged ? 210 : 164) : charged ? 144 : 104,
    };
  }

  function isAttackActive() {
    if (player.attackTimer <= 0) return false;
    const elapsed = player.attackDuration - player.attackTimer;
    return elapsed > player.attackDuration * 0.14 && elapsed < player.attackDuration * 0.8;
  }

  function damageEnemy(enemy) {
    if (!enemy.alive || enemy.hitAttackId === player.attackId) return;
    enemy.hitAttackId = player.attackId;

    const playerCenter = player.x + player.w / 2;
    const enemyCenter = enemy.x + enemy.w / 2;
    const incomingSide = Math.sign(playerCenter - enemyCenter) || 1;
    const shielded = enemy.type === "shield"
      && incomingSide === enemy.facing
      && player.grounded
      && !player.chargedAttack;

    if (shielded) {
      enemy.blockedAttackId = player.attackId;
      player.vx = -player.facing * 250;
      player.vy = Math.min(player.vy, -180);
      game.shake = 7;
      game.freeze = 0.045;
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + 24, palette.amber, 9, 220, 0.35, 320);
      sound.tone(170, 0.09, "square", 0.04, 0.7);
      return;
    }

    const chainFinisher = player.grounded && player.slashChain === 3 ? 1 : 0;
    enemy.hp -= (player.buffTimer > 0 ? 2 : 1) + (player.chargedAttack ? 1 : 0) + chainFinisher;
    enemy.hurt = 0.18;
    enemy.vx += player.attackDir.x * (enemy.type === "boss" ? 80 : 250);
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
    const echoGain = player.chargedAttack ? 12 : player.grounded ? 18 : 34;
    const previousEcho = player.echoGauge;
    player.echoGauge = Math.min(100, player.echoGauge + echoGain);
    if (previousEcho < 100 && player.echoGauge >= 100) {
      game.hint = "잔향 충전 완료 · 다음 참격이 방패와 탄환을 관통";
      game.hintTimer = 2.2;
      sound.tone(520, 0.14, "sine", 0.035, 1.7);
    }

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
    const shielded = enemy.type === "shield"
      && Math.sign(bullet.vx || 1) === -enemy.facing
      && !bullet.piercing;
    if (shielded) {
      spawnParticles(bullet.x, bullet.y, palette.amber, 8, 260, 0.3, 300);
      sound.tone(150, 0.08, "square", 0.035, 0.65);
      return false;
    }
    if (enemy.hitShotId === bullet.shotId) return true;
    enemy.hitShotId = bullet.shotId;
    enemy.hp -= bullet.damage;
    enemy.hurt = 0.22;
    enemy.vx += Math.sign(bullet.vx) * (enemy.type === "boss" ? 90 : bullet.piercing ? 520 : 310);
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

  function killEnemy(enemy) {
    enemy.alive = false;
    game.kills += 1;
    player.styleScore = Math.min(100, player.styleScore + (enemy.type === "boss" ? 30 : 9));
    player.burstCooldown = Math.max(0, player.burstCooldown - (enemy.type === "boss" ? 1.2 : 0.32));
    game.freeze = enemy.type === "boss" ? 0.18 : 0.09;
    game.shake = enemy.type === "boss" ? 22 : 13;
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, palette.red, enemy.type === "boss" ? 50 : 22, 520, 0.8, 920);
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, palette.cyan, enemy.type === "boss" ? 40 : 12, 380, 0.65, 620);

    if (enemy.type === "boss") {
      const finalBoss = enemy.originX > 30000;
      if (finalBoss) {
        game.bossDefeated = true;
        game.hint = "검열 장벽 해제 — 새벽 송신탑을 가동";
        game.hintTimer = 8;
        queueStory([
          { speaker: "중앙국 검열기 · 무명", text: "기록은 지워져도 명령은 남는다. 왜 사라진 목소리를 위해 명령을 버리는가.", tone: "hostile", duration: 5.3 },
          { speaker: "M-07", text: "명령은 사람을 지키기 위해 존재한다. 지금부터 이곳의 모든 목소리가 증거다.", tone: "operative", duration: 5.1 },
          { speaker: "감찰관 · 도담", text: "지상 수신망 연결 완료. 백야 폐기장의 기록이 도시 전체로 송신되고 있어. 이제 돌아와.", tone: "control", duration: 5.5 },
        ]);
      } else {
        game.stageBossDefeated = true;
        game.hint = "소각 관제교 해제 — 지하 피난선으로 진입";
        game.hintTimer = 8;
        queueStory([
          { speaker: "M-07", text: "소각 명령은 중지됐다. 피난선의 잔향을 송신탑까지 호위한다.", tone: "operative", duration: 5.2 },
          { speaker: "감찰관 · 도담", text: "관제교 아래에서 수백 개의 신호가 올라와. 중앙국보다 먼저 바깥에 진실을 보내야 해.", tone: "control", duration: 5.4 },
        ]);
      }
      sound.tone(80, 0.8, "sawtooth", 0.07, 0.3);
    } else if (game.kills % 7 === 0 && player.hp < player.maxHp) {
      addPickup(enemy.x + enemy.w / 2, enemy.y, "repair");
    }
  }

  function damagePlayer(amount = 1, sourceX = player.x) {
    if (player.invincible > 0 || game.mode !== "playing") return;
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
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.vx = 0;
    player.vy = 0;
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
    game.hint = "체크포인트에서 재개";
    game.hintTimer = 2.5;
  }

  function fireBullet(enemy, speed = 360, spread = 0, kind = "standard", lockedTarget = null) {
    const sourceX = enemy.x + enemy.w / 2;
    const sourceY = enemy.y + enemy.h * 0.38;
    const targetX = lockedTarget?.x ?? player.x + player.w / 2;
    const targetY = lockedTarget?.y ?? player.y + player.h / 2;
    const angle = Math.atan2(targetY - sourceY, targetX - sourceX) + spread;
    const bulletScale = difficultySettings[game.difficulty].bulletSpeed;
    bullets.push({
      x: sourceX - (kind === "phase" ? 7 : 5),
      y: sourceY - (kind === "phase" ? 3 : 5),
      w: kind === "phase" ? 14 : 10,
      h: kind === "phase" ? 6 : 10,
      vx: Math.cos(angle) * speed * bulletScale,
      vy: Math.sin(angle) * speed * bulletScale,
      life: 4,
      enemy: true,
      kind,
      gravity: 0,
      color: kind === "phase" ? "#79dfff" : enemy.type === "boss" ? palette.red : palette.amber,
    });
    sound.tone(enemy.type === "boss" ? 130 : 210, 0.08, "square", 0.018, 0.65);
  }

  function fireMortar(enemy, lockedTargetX = null) {
    const sourceX = enemy.x + enemy.w / 2;
    const sourceY = enemy.y + 12;
    const targetX = lockedTargetX ?? player.x + player.w / 2 + player.vx * 0.32;
    const direction = Math.sign(targetX - sourceX) || enemy.facing;
    const bulletScale = difficultySettings[game.difficulty].bulletSpeed;
    bullets.push({
      x: sourceX - 9,
      y: sourceY - 9,
      w: 18,
      h: 18,
      vx: direction * (235 + Math.min(170, Math.abs(targetX - sourceX) * 0.18)) * bulletScale,
      vy: -535 * bulletScale,
      life: 5,
      enemy: true,
      kind: "mortar",
      gravity: 860,
      color: "#ff6f75",
    });
    sound.tone(92, 0.18, "sawtooth", 0.03, 0.55);
  }

  function startBurst() {
    if (game.mode !== "playing" || !game.burstUnlocked || player.burstCooldown > 0) return;
    player.burstCooldown = 2.6;
    player.burstTimer = 0.38;
    player.invincible = Math.max(player.invincible, 0.34);
    player.attackId += 1;
    let cancelled = 0;
    const centerX = player.x + player.w / 2;
    const centerY = player.y + player.h / 2;

    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index];
      if (!bullet.enemy) continue;
      const distance = Math.hypot(bullet.x + bullet.w / 2 - centerX, bullet.y + bullet.h / 2 - centerY);
      if (distance <= 155) {
        spawnParticles(bullet.x, bullet.y, palette.cyan, 7, 250, 0.35, 120);
        bullets.splice(index, 1);
        cancelled += 1;
      }
    }

    for (const enemy of enemies) {
      const distance = Math.hypot(enemy.x + enemy.w / 2 - centerX, enemy.y + enemy.h / 2 - centerY);
      if (enemy.alive && distance <= 112) damageEnemy(enemy);
    }

    if (cancelled > 0) {
      player.buffTimer = 4.5;
      game.hint = `정밀 버스트 · 탄환 ${cancelled}개 소거 · 일본도 강화`;
      game.hintTimer = 2.4;
    }
    game.shake = cancelled > 0 ? 18 : 10;
    spawnParticles(centerX, centerY, palette.cyan, 24, 420, 0.58, 180);
    sound.tone(cancelled > 0 ? 520 : 340, 0.22, "sine", 0.055, 0.55);
  }

  function resolvePlayerCollision(dt) {
    player.wallLeft = false;
    player.wallRight = false;
    player.grounded = false;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(player.vx * dt), Math.abs(player.vy * dt)) / 7));
    const stepTime = dt / steps;

    for (let step = 0; step < steps; step += 1) {
      const previousX = player.x;
      player.x += player.vx * stepTime;
      player.x = clamp(player.x, 0, WORLD_W - player.w);
      for (const platform of platforms) {
        if (!overlaps(player, platform)) continue;
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
      for (const platform of platforms) {
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
    for (const platform of platforms) {
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

    if (pressed.has("Space") || pressed.has("KeyK")) player.jumpBuffer = 0.12;
    if (pressed.has("KeyJ") || pressed.has("KeyX")) startAttack();
    if (pressed.has("KeyF") || pressed.has("KeyC")) startShotgun();
    if (pressed.has("KeyE")) startBurst();

    const left = keys.has("KeyA") || keys.has("ArrowLeft");
    const right = keys.has("KeyD") || keys.has("ArrowRight");
    const direction = Number(right) - Number(left);

    if (direction !== 0) {
      player.facing = direction;
      const control = player.attackTimer > 0 ? 0.5 : player.grounded ? 1 : 0.78;
      const buffSpeed = player.buffTimer > 0 ? 1.22 : 1;
      player.vx = moveToward(player.vx, direction * 415 * buffSpeed, 2800 * control * dt);
    } else if (player.attackTimer <= 0) {
      player.vx = moveToward(player.vx, 0, (player.grounded ? 2500 : 420) * dt);
    }

    if (player.grounded) {
      player.coyote = 0.11;
    } else {
      player.coyote = Math.max(0, player.coyote - dt);
    }

    if (player.jumpBuffer > 0 && !player.grounded && (player.wallLeft || player.wallRight)) {
      const wallDirection = player.wallLeft ? 1 : -1;
      player.vx = wallDirection * 520;
      player.vy = -690;
      player.facing = wallDirection;
      player.airJumpAvailable = true;
      player.jumpBuffer = 0;
      player.squash = -0.13;
      spawnParticles(player.x + (player.wallLeft ? 0 : player.w), player.y + player.h / 2, palette.cyan, 10, 220, 0.35, 360);
      sound.tone(230, 0.1, "square", 0.025, 1.45);
    } else if (player.jumpBuffer > 0 && player.coyote > 0) {
      player.vy = -715;
      player.grounded = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      player.squash = -0.16;
      spawnParticles(player.x + player.w / 2, player.y + player.h, "#a8d8df", 7, 130, 0.28, 300);
      sound.tone(190, 0.1, "square", 0.025, 1.7);
    } else if (player.jumpBuffer > 0 && !player.grounded && player.airJumpAvailable) {
      player.vy = -675;
      player.airJumpAvailable = false;
      player.jumpBuffer = 0;
      player.squash = -0.12;
      spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 13, 240, 0.4, 260);
      sound.tone(260, 0.12, "square", 0.03, 1.65);
    }

    const holdingWall = !player.grounded && ((player.wallLeft && left) || (player.wallRight && right));
    if (holdingWall) {
      if (keys.has("KeyW") || keys.has("ArrowUp")) player.vy = moveToward(player.vy, -175, 1500 * dt);
      else player.vy = Math.min(player.vy, keys.has("KeyS") || keys.has("ArrowDown") ? 300 : 145);
    }

    if (!keys.has("Space") && !keys.has("KeyK") && player.vy < -240 && player.attackTimer <= 0) {
      player.vy += GRAVITY * 1.25 * dt;
    }

    player.vy = Math.min(player.vy + GRAVITY * dt, 1150);
    resolvePlayerCollision(dt);

    player.runCycle += Math.abs(player.vx) * dt * 0.052;
    if (player.grounded && !wasGrounded && impactVelocity > 260) {
      player.squash = clamp(impactVelocity / 2400, 0.12, 0.24);
      game.shake = Math.max(game.shake, Math.min(7, impactVelocity / 120));
      spawnParticles(player.x + player.w / 2, player.y + player.h, "#8aa7ad", 9, 145, 0.34, 260);
    }
    if (player.grounded && Math.abs(player.vx) > 105 && player.stepTimer <= 0) {
      player.stepTimer = 0.12 + 48 / Math.abs(player.vx);
      const heelX = player.x + player.w / 2 - player.facing * 10;
      spawnParticles(heelX, player.y + player.h - 2, "#5f7b82", 3, 72, 0.22, 170);
    }

    if (isAttackActive()) {
      const hitbox = attackBox();
      for (const enemy of enemies) {
        if (enemy.alive && overlaps(hitbox, enemy)) damageEnemy(enemy);
      }
      for (const node of boostNodes) {
        if (node.hitAttackId === player.attackId || !overlaps(hitbox, node)) continue;
        node.hitAttackId = player.attackId;
        player.vx += node.launchX * player.facing;
        player.vy = Math.min(player.vy, node.launchY);
        player.airJumpAvailable = true;
        game.shake = 9;
        spawnParticles(node.x + node.w / 2, node.y + node.h / 2, palette.amber, 16, 340, 0.5, 420);
        sound.tone(410, 0.16, "sine", 0.045, 1.8);
      }
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        if (bullets[i].enemy && overlaps(hitbox, bullets[i])) {
          spawnParticles(bullets[i].x, bullets[i].y, palette.cyan, 5, 180, 0.25, 0);
          bullets.splice(i, 1);
          player.shotgunCharge = Math.min(3, player.shotgunCharge + 0.42);
          if (!player.grounded) player.airJumpAvailable = true;
        }
      }
    }

    for (const hazard of hazards) {
      if (hazard.active && overlaps(player, hazard)) damagePlayer(1, hazard.x + hazard.w / 2);
    }

    for (const checkpoint of checkpoints) {
      if (!checkpoint.active && Math.abs(player.x + player.w / 2 - checkpoint.x) < 55 && Math.abs(player.y + player.h - (checkpoint.y + checkpoint.h)) < 110) {
        checkpoints.forEach((item) => { item.active = false; });
        checkpoint.active = true;
        player.respawnX = checkpoint.x - 10;
        player.respawnY = checkpoint.y + checkpoint.h - player.h - 4;
        player.hp = player.maxHp;
        player.airJumpAvailable = true;
        game.hint = `${checkpoint.label} 체크포인트 확보`;
        game.hintTimer = 3;
        spawnParticles(checkpoint.x + 16, checkpoint.y + 30, palette.cyan, 18, 300, 0.7, 220);
        sound.checkpoint();
      }
    }

    for (const pickup of pickups) {
      if (!pickup.active || !overlaps(player, pickup)) continue;
      pickup.active = false;
      player.hp = Math.min(player.maxHp, player.hp + 2);
      player.airJumpAvailable = true;
      game.hint = "수복편 획득 · 체력 회복";
      game.hintTimer = 2;
      spawnParticles(pickup.x + 12, pickup.y + 12, palette.cyan, 16, 280, 0.55, 150);
      sound.checkpoint();
    }

    if (player.y > WORLD_H + 120) respawn();
    if (pressed.has("KeyR")) respawn();

    if (!game.stageBossDefeated && player.x > 23680 && player.x < 24500) {
      player.x = 23620;
      player.vx = -180;
      game.hint = "소각 관제교를 지키는 집행기를 먼저 격파";
      game.hintTimer = 3;
    }

    if (player.x > 35840) {
      if (game.bossDefeated) finishGame();
      else {
        player.x = 35720;
        player.vx = -180;
        game.hint = "새벽 송신탑의 검열기를 먼저 격파";
        game.hintTimer = 3;
      }
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
    enemy.grounded = false;
    enemy.vy = Math.min((enemy.vy || 0) + GRAVITY * 0.78 * dt, 980);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(enemy.vx * dt), Math.abs(enemy.vy * dt)) / 7));
    const stepTime = dt / steps;
    let blocked = false;

    for (let step = 0; step < steps; step += 1) {
      const oldX = enemy.x;
      enemy.x += enemy.vx * stepTime;
      for (const platform of platforms) {
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
      for (const platform of platforms) {
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
    if (enemy.y > WORLD_H + 100) enemy.alive = false;
  }

  function resolveEnemySeparation() {
    const solidEnemies = enemies.filter((enemy) => enemy.alive && enemy.type !== "drone");
    for (let a = 0; a < solidEnemies.length; a += 1) {
      for (let b = a + 1; b < solidEnemies.length; b += 1) {
        const first = solidEnemies[a];
        const second = solidEnemies[b];
        if (!overlaps(first, second)) continue;
        const overlapX = Math.min(first.x + first.w, second.x + second.w) - Math.max(first.x, second.x);
        if (overlapX <= 0) continue;
        const direction = first.x + first.w / 2 <= second.x + second.w / 2 ? -1 : 1;
        const firstShare = first.type === "boss" ? 0.15 : 0.5;
        const secondShare = second.type === "boss" ? 0.15 : 0.5;
        first.x += direction * overlapX * firstShare;
        second.x -= direction * overlapX * secondShare;
        first.vx *= 0.35;
        second.vx *= 0.35;
      }
    }
  }

  function resolvePlayerEnemyOverlap() {
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.type === "drone" || !overlaps(player, enemy)) continue;
      const playerCenter = player.x + player.w / 2;
      const enemyCenter = enemy.x + enemy.w / 2;
      const overlapX = Math.min(player.x + player.w, enemy.x + enemy.w) - Math.max(player.x, enemy.x);
      if (overlapX <= 0) continue;
      const direction = playerCenter <= enemyCenter ? -1 : 1;
      player.x += direction * (overlapX + 0.5);
      player.vx = direction < 0 ? Math.min(0, player.vx) : Math.max(0, player.vx);
      enemy.vx -= direction * 35;
    }
  }

  function hasGroundAhead(entity, direction, distance = 42) {
    if (!direction) return true;
    const probeX = direction > 0 ? entity.x + entity.w + distance - 8 : entity.x - distance;
    const probe = { x: probeX, y: entity.y + entity.h, w: 8, h: 34 };
    return platforms.some((platform) => overlaps(probe, platform));
  }

  function updateEnemy(enemy, dt) {
    if (!enemy.alive) return;
    enemy.anim += dt;
    enemy.cooldown -= dt;
    enemy.hurt = Math.max(0, enemy.hurt - dt);
    const dx = player.x + player.w / 2 - (enemy.x + enemy.w / 2);
    const dy = player.y + player.h / 2 - (enemy.y + enemy.h / 2);
    const distance = Math.hypot(dx, dy);
    const enemySpeedScale = difficultySettings[game.difficulty].enemySpeed;
    enemy.facing = dx >= 0 ? 1 : -1;

    if (enemy.type === "drone") {
      const previousDroneX = enemy.x;
      const previousDroneY = enemy.y;
      enemy.y = enemy.baseY + Math.sin(enemy.anim * 2.2) * 18;
      if (distance < 620) {
        enemy.x += clamp(dx, -1, 1) * 42 * enemySpeedScale * dt;
        enemy.x = clamp(enemy.x, enemy.originX - enemy.range, enemy.originX + enemy.range);
      }
      if (platforms.some((platform) => overlaps(enemy, platform))) {
        enemy.x = previousDroneX;
        enemy.y = previousDroneY;
        enemy.baseY -= Math.sign(Math.sin(enemy.anim * 2.2) || 1) * 8;
      }
      if (distance < 560 && enemy.cooldown <= 0) {
        fireBullet(enemy, 410);
        enemy.cooldown = 1.75 + hash(enemy.anim) * 0.45;
      }
      if (distance < 42) damagePlayer(1, enemy.x);
      return;
    }

    if (enemy.type === "gunner") {
      if (distance < 680 && enemy.cooldown <= 0) {
        enemy.windup = 0.36;
        enemy.cooldown = 2.05;
      }
      if (enemy.windup > 0) {
        const before = enemy.windup;
        enemy.windup -= dt;
        if (before > 0.07 && enemy.windup <= 0.07) fireBullet(enemy, 470);
      }
      enemy.vx = moveToward(enemy.vx, 0, 480 * dt);
      moveEnemyPhysics(enemy, dt);
      return;
    }

    if (enemy.type === "piercer") {
      if (distance < 880 && enemy.cooldown <= 0) {
        enemy.windup = 0.48;
        enemy.cooldown = 2.45 / enemySpeedScale;
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

    if (enemy.type === "mortar") {
      if (distance < 920 && enemy.cooldown <= 0) {
        enemy.windup = 0.74;
        enemy.cooldown = 3.15 / enemySpeedScale;
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

    if (Math.abs(dx) < (enemy.type === "shield" ? 84 : 70) && Math.abs(dy) < 62 && enemy.cooldown <= 0) {
      enemy.windup = enemy.type === "shield" ? 0.52 : 0.3;
      enemy.cooldown = enemy.type === "shield" ? 1.5 : 1.05;
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
    const hpRatio = enemy.hp / enemy.maxHp;
    const speedScale = difficultySettings[game.difficulty].enemySpeed;
    const desiredSpeed = (hpRatio < 0.5 ? 145 : 105) * speedScale;
    if (distance < 760 && Math.abs(dx) > 115) {
      enemy.vx = moveToward(enemy.vx, Math.sign(dx) * desiredSpeed, 360 * dt);
    } else {
      enemy.vx = moveToward(enemy.vx, 0, 500 * dt);
    }
    const arenaLeft = enemy.originX - 540;
    const arenaRight = enemy.originX + (enemy.originX > 30000 ? 480 : 700);
    const moveDirection = Math.sign(enemy.vx);
    enemy.bossJumpCooldown = Math.max(0, (enemy.bossJumpCooldown || 0) - dt);
    if (enemy.grounded && moveDirection !== 0 && !hasGroundAhead(enemy, moveDirection)) {
      if (enemy.bossJumpCooldown <= 0 && Math.sign(dx) === moveDirection && Math.abs(dx) > 150) {
        enemy.vy = -690;
        enemy.vx = moveDirection * (hpRatio < 0.5 ? 390 : 340);
        enemy.bossJumpCooldown = 0.85;
        spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, palette.red, 12, 240, 0.4, 420);
      } else {
        enemy.vx = 0;
      }
    }
    moveEnemyPhysics(enemy, dt);
    if (enemy.x < arenaLeft) {
      enemy.x = arenaLeft;
      enemy.vx = Math.max(0, enemy.vx);
    }
    if (enemy.x + enemy.w > arenaRight) {
      enemy.x = arenaRight - enemy.w;
      enemy.vx = Math.min(0, enemy.vx);
    }
    if (enemy.y > enemy.baseY + enemy.h + 260) {
      enemy.x = clamp(enemy.originX, arenaLeft + 40, arenaRight - enemy.w - 40);
      enemy.y = enemy.baseY;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.grounded = false;
      enemy.bossJumpCooldown = 0.65;
      game.shake = Math.max(game.shake, 12);
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, palette.red, 18, 320, 0.55, 600);
    }

    if (enemy.cooldown <= 0 && distance < 900) {
      enemy.bossPhase = (enemy.bossPhase + 1) % 3;
      if (enemy.bossPhase === 0) {
        [-0.2, 0, 0.2].forEach((spread) => fireBullet(enemy, 460, spread));
        enemy.cooldown = hpRatio < 0.5 ? 1.1 : 1.55;
      } else if (enemy.bossPhase === 1) {
        enemy.windup = 0.6;
        enemy.cooldown = 1.8;
      } else {
        for (let i = -2; i <= 2; i += 1) fireBullet(enemy, 350, i * 0.12);
        enemy.cooldown = hpRatio < 0.5 ? 1.25 : 1.8;
      }
    }

    if (enemy.windup > 0) {
      const previous = enemy.windup;
      enemy.windup -= dt;
      if (previous > 0.1 && enemy.windup <= 0.1) {
        enemy.vx = Math.sign(dx) * 620;
        if (Math.abs(dx) < 180 && Math.abs(player.y - enemy.y) < 110) damagePlayer(2, enemy.x);
        game.shake = 14;
      }
    }

    if (Math.abs(dx) < 72 && Math.abs(player.y - enemy.y) < 90) damagePlayer(1, enemy.x);
  }

  function updateCombatRooms() {
    for (const room of combatRooms) {
      if (!room.triggered && player.x > room.left + 90 && player.x < room.right) {
        room.triggered = true;
        game.arenaTitle = 3.2;
        game.hint = `${room.name} · 모든 경비기를 격파`;
        game.hintTimer = 3.2;
        sound.tone(118, 0.32, "sawtooth", 0.045, 0.7);
      }
      if (!room.triggered || room.cleared) continue;

      const remaining = enemies.filter((enemy) => enemy.alive && enemy.originX > room.left && enemy.originX < room.right).length;
      room.remaining = remaining;
      if (remaining === 0) {
        room.cleared = true;
        player.hp = Math.min(player.maxHp, player.hp + 1);
        player.echoGauge = 100;
        player.burstCooldown = 0;
        game.hint = `${room.name} 해제 · 체력 회복 · 잔향 충전`;
        game.hintTimer = 4;
        game.shake = 14;
        spawnParticles(player.x + player.w / 2, player.y + player.h / 2, palette.cyan, 28, 400, 0.7, 500);
        sound.checkpoint();
        continue;
      }

      const nearRoom = player.x > room.left - 70 && player.x < room.right + 70;
      if (nearRoom) {
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

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const bullet = bullets[i];
      bullet.life -= dt;
      let remove = bullet.life <= 0;
      let exploded = false;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bullet.vx * dt), Math.abs(bullet.vy * dt)) / 6));
      const stepTime = dt / steps;

      for (let step = 0; step < steps && !remove; step += 1) {
        bullet.x += bullet.vx * stepTime;
        bullet.y += bullet.vy * stepTime;
        bullet.vy += (bullet.gravity || 0) * stepTime;

        if (bullet.enemy && overlaps(bullet, player)) {
          if (bullet.kind === "mortar") {
            explodeMortar(bullet);
            exploded = true;
          } else {
            damagePlayer(1, bullet.x);
          }
          remove = true;
          break;
        }

        if (!bullet.enemy) {
          for (const enemy of enemies) {
            if (!enemy.alive || !overlaps(bullet, enemy)) continue;
            damageEnemyWithShotgun(enemy, bullet);
            if (!bullet.piercing) remove = true;
            if (remove) break;
          }
        }

        if (remove) break;
        for (const platform of platforms) {
          if (overlaps(bullet, platform)) {
            if (bullet.kind === "mortar") {
              explodeMortar(bullet);
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
    camera.lookX = lerp(camera.lookX, player.vx * 0.46, 1 - Math.pow(0.0006, dt));
    const targetX = clamp(player.x + player.w / 2 - W * 0.42 + camera.lookX, 0, WORLD_W - W);
    const targetY = clamp(player.y + player.h / 2 - H * 0.58, 0, WORLD_H - H);
    camera.x = lerp(camera.x, targetX, 1 - Math.pow(0.0008, dt));
    camera.y = lerp(camera.y, targetY, 1 - Math.pow(0.008, dt));
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
    if (game.freeze > 0) {
      game.freeze -= dt;
      updateParticles(dt * 0.18);
      return;
    }

    game.runTime += dt;
    game.shake = Math.max(0, game.shake - 34 * dt);
    game.flash = Math.max(0, game.flash - dt);
    game.stageTitle = Math.max(0, game.stageTitle - dt);
    game.zoneTitle = Math.max(0, game.zoneTitle - dt);
    game.arenaTitle = Math.max(0, game.arenaTitle - dt);
    game.hintTimer = Math.max(0, game.hintTimer - dt);
    updateStory(dt);
    if (!game.burstUnlocked && player.x > 5200) {
      game.burstUnlocked = true;
      game.hint = "버스트 해제 · E로 주변 탄환 소거";
      game.hintTimer = 5;
      sound.checkpoint();
    }

    for (const hazard of hazards) {
      if (hazard.kind === "laser") {
        const pulse = (game.time + hazard.phase) % 2.8;
        hazard.active = pulse < 1.45;
      }
    }

    updatePlayer(dt);
    for (const enemy of enemies) updateEnemy(enemy, dt);
    resolveEnemySeparation();
    resolvePlayerEnemyOverlap();
    updateCombatRooms();
    updateBullets(dt);
    updateParticles(dt);
    updateCamera(dt);

    for (const event of STORY_EVENTS) {
      if (player.x < event.x || game.storySeen.has(event.id)) continue;
      game.storySeen.add(event.id);
      queueStory(event.lines);
    }

    const zoneIndex = zones.findLastIndex((zone) => player.x >= zone.x);
    if (zoneIndex !== game.zone) {
      game.zone = zoneIndex;
      game.zoneTitle = 3.2;
    }

    const stageIndex = stages.findLastIndex((stage) => player.x >= stage.x);
    if (stageIndex !== game.stage) {
      game.stage = stageIndex;
      game.stageTitle = 4.4;
    }

    if (player.x > 430 && player.x < 780 && game.hintTimer <= 0) {
      game.hint = "Space를 공중에서 한 번 더 눌러 이중 점프";
      game.hintTimer = 4.2;
    } else if (player.x > 1050 && player.x < 1450 && game.hintTimer <= 0) {
      game.hint = "오른쪽 클릭 샷건 · 아래로 쏘면 반동으로 다시 상승";
      game.hintTimer = 4.2;
    } else if (player.x > 2050 && player.x < 2450 && game.hintTimer <= 0) {
      game.hint = "왼쪽 클릭 발도 · 공중 적중 시 이중 점프 회복·샷건 강화";
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
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#04070d");
    gradient.addColorStop(0.58, "#0b111b");
    gradient.addColorStop(1, "#141721");
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
  }

  function drawHazard(hazard) {
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

  function drawSign(sign) {
    ctx.fillStyle = "rgba(6, 12, 22, 0.88)";
    ctx.fillRect(sign.x - 12, sign.y - 46, 174, 60);
    ctx.strokeStyle = "rgba(101, 245, 234, 0.35)";
    ctx.strokeRect(sign.x - 12, sign.y - 46, 174, 60);
    ctx.fillStyle = "#e7ffff";
    ctx.font = "900 21px 'Malgun Gothic', sans-serif";
    ctx.fillText(sign.text, sign.x, sign.y - 18);
    ctx.fillStyle = "#6f97a4";
    ctx.font = "10px monospace";
    ctx.fillText(sign.sub, sign.x, sign.y);
  }

  function drawPlayerBody(x, y, facing, alpha = 1, ghost = false) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x + player.w / 2), Math.round(y + player.h));
    ctx.scale(facing, 1);

    const speedRatio = clamp(Math.abs(player.vx) / 320, 0, 1);
    const running = player.grounded && speedRatio > 0.08;
    const walling = !player.grounded && (player.wallLeft || player.wallRight);
    const stride = Math.sin(player.runCycle);
    const bob = running ? Math.abs(Math.sin(player.runCycle * 2)) * 2.2 : Math.sin(game.time * 2.4) * 0.65;
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
      ctx.fillStyle = palette.cyan;
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

    function drawLimb(px, py, length, width, angle, color, foot = false) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillStyle = color;
      ctx.fillRect(-width / 2, 0, width, length);
      ctx.fillStyle = "rgba(146, 190, 202, 0.18)";
      ctx.fillRect(-width / 2 + 1, 1, 2, length - 2);
      ctx.fillStyle = "#314456";
      ctx.fillRect(-width / 2 + 1, length * 0.48, width - 2, 3);
      ctx.fillStyle = "#09131e";
      ctx.beginPath();
      ctx.arc(0, length * 0.54, width * 0.42, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(101, 245, 234, 0.42)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, length * 0.54, Math.max(1.5, width * 0.22), 0, TAU);
      ctx.stroke();
      if (foot) {
        ctx.fillStyle = "#07101a";
        ctx.fillRect(-width / 2 - 1, length - 1, width + 7, 5);
        ctx.fillStyle = palette.cyan;
        ctx.fillRect(width / 2 + 3, length, 3, 2);
        ctx.fillStyle = "#536c79";
        ctx.fillRect(-width / 2, length - 2, width - 1, 2);
      }
      ctx.restore();
    }

    let backLeg = running ? stride * 0.72 : 0.05;
    let frontLeg = running ? -stride * 0.72 : -0.05;
    if (!player.grounded) {
      if (walling) {
        backLeg = -0.58;
        frontLeg = 0.68;
      } else if (player.vy < 0) {
        backLeg = -0.42;
        frontLeg = 0.48;
      } else {
        backLeg = 0.24;
        frontLeg = -0.28;
      }
    }

    drawLimb(-6, -18, 21, 7, backLeg, "#101a28", true);
    drawLimb(6, -18, 21, 8, frontLeg, "#172638", true);

    // 등에 고정된 전술 신호 장치와 작은 안테나.
    ctx.fillStyle = "#0a131f";
    ctx.fillRect(-17, -43, 7, 24);
    ctx.fillStyle = "#3c5868";
    ctx.fillRect(-16, -39, 4, 13);
    ctx.fillStyle = palette.cyan;
    ctx.globalAlpha = 0.4 + Math.sin(game.time * 5) * 0.18;
    ctx.fillRect(-15, -42, 2, 3);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#526d79";
    ctx.beginPath();
    ctx.moveTo(-14, -43);
    ctx.lineTo(-18, -54);
    ctx.stroke();

    // 허리의 칼집. 천 소재 없이 단단한 검사 실루엣을 만든다.
    ctx.save();
    ctx.translate(-7, -23);
    ctx.rotate(2.66);
    ctx.fillStyle = "#070d16";
    ctx.fillRect(0, -3, 42, 7);
    ctx.fillStyle = "#334d5b";
    ctx.fillRect(4, -2, 31, 2);
    ctx.fillStyle = palette.red;
    ctx.fillRect(5, -4, 3, 9);
    ctx.fillRect(34, -3, 2, 7);
    if (!attacking) {
      ctx.fillStyle = "#12151d";
      ctx.fillRect(-15, -3, 16, 7);
      ctx.strokeStyle = palette.red;
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
    ctx.fillStyle = empowered ? palette.amber : palette.red;
    ctx.fillRect(-12, -24, 25, 3);
    ctx.fillStyle = "#7d929b";
    ctx.fillRect(-7, -21, 4, 3);
    ctx.fillRect(0, -21, 4, 3);
    ctx.fillRect(7, -21, 3, 3);
    ctx.fillStyle = palette.cyan;
    ctx.fillRect(-4, -22, 13, 2);
    ctx.fillStyle = palette.red;
    ctx.fillRect(9, -36, 3, 15);
    ctx.strokeStyle = "rgba(143, 210, 216, 0.38)";
    ctx.beginPath();
    ctx.moveTo(-3, -38);
    ctx.lineTo(7, -34);
    ctx.lineTo(6, -26);
    ctx.lineTo(-3, -23);
    ctx.stroke();
    ctx.fillStyle = empowered ? palette.amber : palette.cyan;
    ctx.beginPath();
    ctx.arc(2, -31, 2.4, 0, TAU);
    ctx.fill();

    drawLimb(-10, -38, 17, 5, running ? -stride * 0.42 : 0.3, "#152638");

    ctx.fillStyle = "#8da0aa";
    ctx.fillRect(-10, -57, 19, 16);
    ctx.fillStyle = "#354a58";
    ctx.fillRect(-13, -53, 4, 9);
    ctx.fillStyle = palette.cyan;
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
    ctx.fillStyle = empowered ? palette.amber : palette.red;
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

    let armAngle = running ? stride * 0.42 : -0.15;
    if (!player.grounded) armAngle = -0.48;
    if (attacking) armAngle = -2.15 + attackProgress * 4.15 + player.attackDir.y * 0.72;

    drawLimb(10, -38, 17, 6, armAngle, "#294459");
    if (attacking) {
      ctx.save();
      ctx.translate(10, -38);
      ctx.rotate(armAngle);

      // 붉은 끈으로 감은 손잡이와 원형 코등이.
      ctx.fillStyle = "#10141d";
      ctx.fillRect(7, -4, 15, 8);
      ctx.strokeStyle = empowered ? palette.amber : palette.red;
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
      const bladeGlow = empowered ? palette.amber : "#b8f2ed";
      ctx.fillStyle = bladeGlow;
      ctx.beginPath();
      ctx.moveTo(25, -2.4);
      ctx.quadraticCurveTo(56, -6.5, 82, -15);
      ctx.quadraticCurveTo(69, -4.5, 25, 2.2);
      ctx.closePath();
      ctx.fill();
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
    const empoweredSlash = player.buffTimer > 0 || (player.attackTimer > 0 && player.chargedAttack);
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
      ctx.strokeStyle = empoweredSlash ? "rgba(255, 205, 112, 0.42)" : "rgba(101, 245, 234, 0.34)";
      ctx.lineWidth = player.chargedAttack ? 16 : 10;
      ctx.beginPath();
      ctx.arc(0, 0, (90 + progress * 18) * slashScale, -2.31 + progress * 0.4, 0.88 + progress * 0.48);
      ctx.stroke();
      ctx.strokeStyle = empoweredSlash ? "rgba(255, 205, 112, 0.72)" : "rgba(255, 73, 108, 0.5)";
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
  }

  function drawEnemyTelegraph(enemy) {
    if (enemy.windup <= 0) return;
    const pulse = 0.45 + Math.sin(game.time * 28) * 0.22;
    if (enemy.type === "piercer" && Number.isFinite(enemy.targetX)) {
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
    } else if (enemy.type === "mortar" && Number.isFinite(enemy.targetX)) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 73, 108, ${pulse + 0.18})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(enemy.targetX, enemy.targetY, 52, 13, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 73, 108, ${pulse * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(enemy.targetX, enemy.targetY, 48, 10, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemy(enemy) {
    if (!enemy.alive) return;
    drawEnemyTelegraph(enemy);
    const variant = hash(enemy.originX * 0.17 + enemy.maxHp);
    const damageRatio = 1 - enemy.hp / enemy.maxHp;
    const locomotion = Math.sin(enemy.anim * (enemy.type === "runner" ? 10 : 6));
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
    } else if (enemy.type === "gunner" || enemy.type === "piercer" || enemy.type === "mortar") {
      const isPiercer = enemy.type === "piercer";
      const isMortar = enemy.type === "mortar";
      const recoil = enemy.windup > 0 ? Math.sin(enemy.windup * 35) * 3 : 0;
      ctx.fillStyle = "#111a26";
      ctx.fillRect(-15 + locomotion * movingRatio * 3, 48, 10, 10);
      ctx.fillRect(5 - locomotion * movingRatio * 3, 48, 10, 10);
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : isMortar ? "#382b36" : isPiercer ? "#1b3443" : "#202d3b";
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
      ctx.fillStyle = isMortar ? palette.red : isPiercer ? "#79dfff" : palette.amber;
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
      ctx.fillStyle = enemy.windup > 0 ? palette.white : isPiercer ? "#79dfff" : palette.red;
      ctx.fillRect(8, 10, 6, 4);
      ctx.save();
      ctx.translate(10 - recoil, 29);
      ctx.rotate((isMortar ? -0.52 : 0) + Math.sin(enemy.anim * 2.2) * 0.025);
      ctx.fillStyle = isMortar ? "#a8757f" : isPiercer ? "#7fb9ca" : "#93aeb8";
      ctx.fillRect(0, isMortar ? -7 : -4, isMortar ? 31 : isPiercer ? 44 : 36, isMortar ? 14 : 9);
      ctx.fillStyle = "#d6e0e1";
      ctx.fillRect(4, isMortar ? -4 : -2, isMortar ? 13 : isPiercer ? 26 : 18, 2);
      ctx.fillStyle = "#283844";
      ctx.fillRect(8, 5, 10, 7);
      ctx.fillStyle = isMortar ? palette.red : isPiercer ? "#79dfff" : palette.amber;
      ctx.fillRect(isMortar ? 24 : isPiercer ? 37 : 29, isMortar ? -5 : -2, isMortar ? 10 : 9, isMortar ? 10 : 5);
      ctx.fillStyle = "#111923";
      ctx.fillRect(23, -5, 5, 3);
      ctx.restore();
      if (enemy.windup > 0) {
        ctx.fillStyle = isPiercer
          ? `rgba(121, 223, 255, ${0.35 + Math.sin(enemy.windup * 40) * 0.25})`
          : `rgba(255, 100, 120, ${0.35 + Math.sin(enemy.windup * 40) * 0.25})`;
        ctx.beginPath();
        ctx.arc((isPiercer ? 52 : 44) - recoil, isMortar ? 12 : 31, isMortar ? 10 : 7, 0, TAU);
        ctx.fill();
      }
    } else if (enemy.type === "shield") {
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
      const shieldPush = enemy.windup > 0 ? 6 + Math.sin(enemy.windup * 25) * 2 : 0;
      ctx.fillStyle = "#283f4d";
      ctx.beginPath();
      ctx.moveTo(14 + shieldPush, 8);
      ctx.lineTo(31 + shieldPush, 13);
      ctx.lineTo(34 + shieldPush, 55);
      ctx.lineTo(24 + shieldPush, 66);
      ctx.lineTo(13 + shieldPush, 58);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5c717b";
      ctx.beginPath();
      ctx.moveTo(18 + shieldPush, 14);
      ctx.lineTo(27 + shieldPush, 17);
      ctx.lineTo(29 + shieldPush, 49);
      ctx.lineTo(22 + shieldPush, 57);
      ctx.lineTo(18 + shieldPush, 53);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = palette.amber;
      ctx.fillRect(28 + shieldPush, 18, 3, 36);
      ctx.fillStyle = "#111925";
      ctx.beginPath();
      ctx.arc(21 + shieldPush, 22, 2, 0, TAU);
      ctx.arc(23 + shieldPush, 49, 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = palette.amber;
      ctx.globalAlpha = 0.45 + Math.sin(enemy.anim * 7) * 0.2;
      ctx.fillRect(18 + shieldPush, 33, 8, 3);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255, 205, 112, ${0.18 + Math.sin(enemy.anim * 5) * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(14 + shieldPush, 8);
      ctx.lineTo(31 + shieldPush, 13);
      ctx.lineTo(34 + shieldPush, 55);
      ctx.lineTo(24 + shieldPush, 66);
      ctx.lineTo(13 + shieldPush, 58);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "#121925";
      ctx.fillRect(-13 + locomotion * 2, 58, 10, 8);
      ctx.fillRect(4 - locomotion * 2, 58, 10, 8);
    } else if (enemy.type === "boss") {
      const pulse = 0.5 + Math.sin(game.time * 6) * 0.2;
      const shoulder = Math.sin(enemy.anim * 3.5) * 5;
      ctx.fillStyle = "#271a28";
      ctx.fillRect(-49, 39 + shoulder, 18, 34);
      ctx.fillRect(31, 39 - shoulder, 18, 34);
      ctx.fillStyle = "#6b354e";
      ctx.beginPath();
      ctx.arc(-40, 42 + shoulder, 8, 0, TAU);
      ctx.arc(40, 42 - shoulder, 8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#d36b88";
      ctx.beginPath();
      ctx.arc(-40, 42 + shoulder, 4, 0, TAU);
      ctx.arc(40, 42 - shoulder, 4, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = enemy.hurt > 0 ? "#ffffff" : "#15131f";
      ctx.fillRect(-34, 35, 68, 60);
      ctx.fillStyle = "#3b2637";
      ctx.fillRect(-42, 43, 84, 41);
      ctx.fillStyle = "#1d1722";
      ctx.beginPath();
      ctx.moveTo(-37, 48);
      ctx.lineTo(-20, 38);
      ctx.lineTo(-8, 50);
      ctx.lineTo(-14, 76);
      ctx.lineTo(-34, 80);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(37, 48);
      ctx.lineTo(20, 38);
      ctx.lineTo(8, 50);
      ctx.lineTo(14, 76);
      ctx.lineTo(34, 80);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#7d4058";
      ctx.fillRect(-30, 8, 58, 38);
      ctx.fillStyle = "#ece8e9";
      ctx.fillRect(-22, 12, 43, 27);
      ctx.strokeStyle = "#9d7b84";
      ctx.beginPath();
      ctx.moveTo(-6, 13);
      ctx.lineTo(-8, 36);
      ctx.moveTo(-18, 17);
      ctx.lineTo(-13, 22);
      ctx.moveTo(12, 14);
      ctx.lineTo(18, 20);
      ctx.stroke();
      ctx.fillStyle = "#1a0c14";
      ctx.fillRect(4, 21, 18, 6);
      ctx.fillStyle = palette.red;
      ctx.globalAlpha = pulse;
      ctx.fillRect(15, 21, 9, 6);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#952c50";
      ctx.fillRect(-5, 38, 10, 58);
      ctx.fillStyle = "#1a1019";
      ctx.beginPath();
      ctx.arc(0, 58, 18, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 73, 108, ${0.35 + pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 58, 12 + Math.sin(game.time * 5) * 1.5, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = palette.red;
      ctx.beginPath();
      ctx.arc(0, 58, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#d8dce4";
      ctx.fillRect(30 - Math.max(0, enemy.vx * enemy.facing * 0.015), 49, 58, 8);
      ctx.fillStyle = "#59636f";
      ctx.fillRect(41, 57, 19, 5);
      ctx.fillStyle = palette.red;
      ctx.fillRect(78, 51, 9, 4);
      ctx.strokeStyle = `rgba(255, 73, 108, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 52, 45 + Math.sin(enemy.anim * 2) * 3, -1.1, 1.1);
      ctx.stroke();
      ctx.fillStyle = "#16111b";
      ctx.fillRect(-30, 94, 19, 10);
      ctx.fillRect(12, 94, 19, 10);
    } else {
      const runnerLean = clamp(Math.abs(enemy.vx) / 240, 0, 0.28);
      const step = locomotion * 5 * movingRatio;
      ctx.fillStyle = "#111925";
      ctx.fillRect(-13 + step, 44, 9, 8);
      ctx.fillRect(5 - step, 44, 9, 8);
      ctx.fillStyle = "#4d6876";
      ctx.beginPath();
      ctx.arc(-8 + step, 43, 3, 0, TAU);
      ctx.arc(9 - step, 43, 3, 0, TAU);
      ctx.fill();
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

  function drawWorld() {
    const shakeX = game.shake > 0 ? (hash(game.time * 1000) - 0.5) * game.shake : 0;
    const shakeY = game.shake > 0 ? (hash(game.time * 1300 + 12) - 0.5) * game.shake : 0;
    ctx.save();
    ctx.translate(Math.round(-camera.x + shakeX), Math.round(-camera.y + shakeY));

    const left = camera.x - 200;
    const right = camera.x + W + 200;
    for (const sign of signs) if (sign.x > left - 200 && sign.x < right) drawSign(sign);
    for (const platform of platforms) if (platform.x + platform.w > left && platform.x < right) drawPlatform(platform);
    for (const hazard of hazards) if (hazard.x + hazard.w > left && hazard.x < right) drawHazard(hazard);
    for (const checkpoint of checkpoints) if (checkpoint.x > left && checkpoint.x < right) drawCheckpoint(checkpoint);
    for (const pickup of pickups) if (pickup.x > left && pickup.x < right) drawPickup(pickup);
    for (const node of boostNodes) if (node.x > left && node.x < right) drawBoostNode(node);
    for (const room of combatRooms) {
      if (!room.triggered || room.cleared) continue;
      if (room.left > left - 40 && room.left < right + 40) drawCombatSeal(room.left);
      if (room.right > left - 40 && room.right < right + 40) drawCombatSeal(room.right);
    }
    if (23720 > left - 200 && 23720 < right) drawGateAt(23720, game.stageBossDefeated);
    if (35720 > left - 200 && 35720 < right) drawGateAt(35720, game.bossDefeated);
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

  function drawHud() {
    ctx.save();
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(4, 9, 17, 0.72)";
    ctx.fillRect(28, 28, 320, 194);
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
    ctx.moveTo(282, 222);
    ctx.lineTo(348, 222);
    ctx.lineTo(348, 204);
    ctx.stroke();
    ctx.fillStyle = "rgba(101, 245, 234, 0.22)";
    ctx.fillRect(28, 28, 4, 194);
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
    ctx.fillText(katanaReady ? `일본도 · 발도 준비${chainLabel}` : `일본도 · 납도 중${chainLabel}`, 232, 111);

    const burstReady = game.burstUnlocked && player.burstCooldown <= 0;
    ctx.fillStyle = burstReady ? palette.cyan : "#31414d";
    ctx.fillRect(47, 140, 24, 9);
    ctx.fillStyle = burstReady ? "#dffffc" : "#75838c";
    ctx.fillText(game.burstUnlocked ? (burstReady ? "E · 버스트 준비" : `버스트 ${player.burstCooldown.toFixed(1)}초`) : "버스트 잠김", 82, 136);
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

    ctx.fillStyle = "#263743";
    ctx.fillRect(47, 195, 176, 7);
    ctx.fillStyle = player.echoGauge >= 100 ? palette.amber : palette.cyan;
    ctx.fillRect(47, 195, 176 * (player.echoGauge / 100), 7);
    ctx.fillStyle = player.echoGauge >= 100 ? "#ffe5a6" : "#9bc8cd";
    ctx.font = "700 10px 'Malgun Gothic', sans-serif";
    ctx.fillText(player.echoGauge >= 100 ? "잔향 · 강화 참격 준비" : `잔향 ${Math.floor(player.echoGauge)}%`, 232, 190);

    const progress = clamp(player.x / 35840, 0, 1);
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
    ctx.fillText(`STAGE 0${game.stage + 1} · ${zones[game.zone].name}`, W - 45, 41);
    ctx.fillStyle = "#738b98";
    ctx.font = "10px monospace";
    ctx.fillText(`${Math.floor(progress * 100)}% · ${formatTime(game.runTime)}`, W - 45, 62);
    ctx.fillStyle = "#202f3c";
    ctx.fillRect(W - 295, 77, 250, 3);
    ctx.fillStyle = zones[game.zone].color;
    ctx.fillRect(W - 295, 77, 250 * progress, 3);
    ctx.textAlign = "left";

    const boss = enemies.find((enemy) => enemy.type === "boss" && enemy.alive && Math.abs(player.x - enemy.originX) < 1500);
    if (boss) {
      ctx.fillStyle = "rgba(3, 7, 13, 0.82)";
      ctx.fillRect(W / 2 - 280, 42, 560, 42);
      ctx.fillStyle = "#c5d1d5";
      ctx.font = "800 12px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(boss.originX > 30000 ? "중앙국 검열기 · 무명" : "소각 집행기 · 적비", W / 2, 49);
      ctx.fillStyle = "#39202b";
      ctx.fillRect(W / 2 - 240, 70, 480, 6);
      ctx.fillStyle = palette.red;
      ctx.fillRect(W / 2 - 240, 70, 480 * (boss.hp / boss.maxHp), 6);
      ctx.textAlign = "left";
    }

    const activeRoom = combatRooms.find((room) => room.triggered && !room.cleared && player.x > room.left - 80 && player.x < room.right + 80);
    if (activeRoom && !boss) {
      ctx.fillStyle = "rgba(3, 7, 13, 0.82)";
      ctx.fillRect(W / 2 - 225, 42, 450, 40);
      ctx.fillStyle = palette.red;
      ctx.fillRect(W / 2 - 225, 42, 4, 40);
      ctx.fillStyle = "#e5eef0";
      ctx.font = "800 12px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${activeRoom.name} · 잔여 ${activeRoom.remaining ?? 0}`, W / 2, 55);
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

    if (game.hintTimer > 0) {
      const fade = clamp(game.hintTimer / 0.4, 0, 1);
      ctx.globalAlpha = fade;
      ctx.font = "800 15px 'Malgun Gothic', sans-serif";
      const measure = ctx.measureText(game.hint).width;
      ctx.fillStyle = "rgba(3, 8, 15, 0.82)";
      ctx.fillRect(W / 2 - measure / 2 - 32, H - 82, measure + 64, 42);
      ctx.fillStyle = palette.white;
      ctx.textAlign = "center";
      ctx.fillText(game.hint, W / 2, H - 69);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
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

    if (game.zoneTitle > 0) {
      const alpha = Math.min(1, game.zoneTitle * 1.5, (3.4 - game.zoneTitle) * 1.7);
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fillStyle = zones[game.zone].color;
      ctx.fillRect(W / 2 - 2, 155, 4, 20);
      ctx.fillStyle = "#f2ffff";
      ctx.font = "900 31px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(zones[game.zone].name, W / 2, 186);
      ctx.fillStyle = zones[game.zone].color;
      ctx.font = "700 11px monospace";
      ctx.fillText(zones[game.zone].code, W / 2, 226);
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
    if (!pointer.active || game.mode === "menu") return;
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
    drawBackground();
    drawWorld();
    if (game.mode !== "menu") drawHud();
    drawCrosshair();
    drawScanlines();
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
      game.mode = "paused";
      pauseScreen.classList.add("visible");
    } else if (game.mode === "paused") {
      game.mode = "playing";
      pauseScreen.classList.remove("visible");
      previousTime = performance.now();
    }
  }

  function updatePointer(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.screenX = clamp((event.clientX - bounds.left) * (W / bounds.width), 0, W);
    pointer.screenY = clamp((event.clientY - bounds.top) * (H / bounds.height), 0, H);
    pointer.active = true;
  }

  canvas.addEventListener("mousemove", updatePointer);
  canvas.addEventListener("mousedown", (event) => {
    updatePointer(event);
    event.preventDefault();
    sound.wake();
    if (event.button === 0) startAttack();
    if (event.button === 2) startShotgun();
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    const handled = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "KeyA", "KeyD", "KeyW", "KeyS", "KeyJ", "KeyK", "KeyE", "KeyF", "KeyC", "KeyX", "KeyR"];
    if (handled.includes(event.code)) event.preventDefault();
    if (!keys.has(event.code)) pressed.add(event.code);
    keys.add(event.code);

    if (event.code === "Escape") togglePause();
    if (event.code === "Enter" && game.mode === "menu") resetGame();
    if ((event.code === "Enter" || event.code === "KeyR") && game.mode === "won") resetGame();
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keys.clear();
    pressed.clear();
    if (game.mode === "playing") togglePause();
  });

  startButton.addEventListener("click", resetGame);
  restartButton.addEventListener("click", resetGame);
  for (const button of difficultyButtons) {
    button.addEventListener("click", () => {
      selectedDifficulty = button.dataset.difficulty;
      for (const item of difficultyButtons) {
        const selected = item === button;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      }
    });
  }

  buildLevel();
  requestAnimationFrame(frame);
})();
