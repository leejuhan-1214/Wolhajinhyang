(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const startScreen = document.getElementById("start-screen");
  const pauseScreen = document.getElementById("pause-screen");
  const endScreen = document.getElementById("end-screen");
  const startButton = document.getElementById("start-button");
  const continueButton = document.getElementById("continue-button");
  const restartButton = document.getElementById("restart-button");
  const resultText = document.getElementById("result-text");
  const difficultyButtons = [...(document.querySelectorAll?.("[data-difficulty]") || [])];

  const W = 1280;
  const H = 720;
  const ZONE_W = 4000;
  const STAGE_W = ZONE_W * 7;
  const WORLD_W = STAGE_W * 4;
  const WORLD_H = 1450;
  const GRAVITY = 2050;
  const TAU = Math.PI * 2;
  const TARGET_CAMPAIGN_MINUTES = 435;
  const SAVE_KEY = "moonlit-echo-campaign-v1";

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

  const stages = [
    { x: 0, end: STAGE_W, bossX: STAGE_W - 1450, gateX: STAGE_W - 180, name: "작전 4호 · 백야 폐기장", code: "STAGE 01 · SCRAP RAIN", color: "#65f5ea", kind: "scrap", bossKind: "warden", targetMinutes: 90 },
    { x: STAGE_W, end: STAGE_W * 2, bossX: STAGE_W * 2 - 1450, gateX: STAGE_W * 2 - 180, name: "검은 공장 · 타오르는 심장", code: "STAGE 02 · RED FURNACE", color: "#ff7b62", kind: "foundry", bossKind: "furnace", targetMinutes: 105 },
    { x: STAGE_W * 2, end: STAGE_W * 3, bossX: STAGE_W * 3 - 1450, gateX: STAGE_W * 3 - 180, name: "기억 성당 · 거짓된 합창", code: "STAGE 03 · PALE CHOIR", color: "#d7a0ff", kind: "archive", bossKind: "weaver", targetMinutes: 115 },
    { x: STAGE_W * 3, end: WORLD_W, bossX: WORLD_W - 1450, gateX: WORLD_W - 180, name: "새벽 송신탑 · 마지막 증언", code: "STAGE 04 · LAST BROADCAST", color: "#ff5e87", kind: "tower", bossKind: "censor", targetMinutes: 125 },
  ];

  const stageZoneNames = [
    ["백야 검문선", "비가림 야적장", "분쇄기 협곡", "침몰 화물선", "자석 크레인 숲", "폐기물 심층", "감독관 격납고"],
    ["적열 반입로", "용탕 배수관", "왕복 프레스동", "냉각 수직갱", "검은 조립선", "화염 터빈실", "용광 심장부"],
    ["망각 접수실", "백면 회랑", "기억 세척 수로", "거울 서버탑", "잔향 보관 성소", "합창 연산실", "직조 제단"],
    ["지하 피난선", "도시 하부 궤도", "폭풍 외벽", "역송신 승강로", "중앙국 방화벽", "새벽 안테나군", "최종 검열실"],
  ];
  const stageZoneCodes = ["SCRAP", "FURNACE", "ARCHIVE", "DAWN"];
  const zoneTemplates = ["terrace", "chasm", "crusher", "vertical", "fork", "gauntlet", "boss"];
  const zones = stages.flatMap((stage, stageIndex) => stageZoneNames[stageIndex].map((name, zoneIndex) => ({
    x: stage.x + zoneIndex * ZONE_W,
    name,
    code: `${String(stageIndex + 1).padStart(2, "0")}-${zoneIndex + 1} · ${stageZoneCodes[stageIndex]}`,
    color: stage.color,
    kind: stage.kind,
    template: zoneTemplates[zoneIndex],
    stageIndex,
  })));

  const BOSS_DEFINITIONS = {
    warden: {
      name: "폐기장 감독관 · 철각",
      hp: 12,
      accent: "#65f5ea",
      silhouette: "방패형 지휘 기체",
      weapon: "삼열 감시포",
      patterns: ["감시 삼연사", "방벽 돌진", "도약 저격", "제압 사격"],
      subtitle: "방벽 돌진 · 도약 저격 · 제압 사격",
    },
    furnace: {
      name: "용광 심장 · 홍련",
      hp: 18,
      accent: "#ff7b62",
      silhouette: "용광로 중장 기체",
      weapon: "용탕 투사기",
      patterns: ["용탕 낙하", "화염 부채꼴", "노심 강타", "노심 폭발"],
      subtitle: "용탕 낙하 · 노심 강타 · 전방위 폭발",
    },
    weaver: {
      name: "기억 직조기 · 백면",
      hp: 24,
      accent: "#d7a0ff",
      silhouette: "부유형 가면 기체",
      weapon: "기억 직조륜",
      patterns: ["배후 전이", "위상 부채", "잔상 관통", "기억침 궤도"],
      subtitle: "배후 전이 · 잔상 관통 · 기억침 궤도",
    },
    censor: {
      name: "중앙국 검열기 · 무명",
      hp: 32,
      accent: "#ff496c",
      silhouette: "익형 처형 기체",
      weapon: "검열 레일건",
      patterns: ["검열 포화", "절단 돌진", "좌표 말소", "처형 도약", "격자 삭제"],
      subtitle: "절단 돌진 · 좌표 말소 · 격자 삭제",
    },
  };

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
    {
      speaker: "개인 기록 · 서린",
      text: "내 이름은 한서린. 중앙국 감찰관이 되기 전의 여섯 해가 통째로 비어 있다. 이상하게도 저 폐기장의 비 냄새만은 기억난다.",
      tone: "archive",
      duration: 5.8,
    },
    {
      speaker: "감찰관 · 도담",
      text: "서린아, 안에서 네 과거를 보더라도 혼자 결론 내리지 마. 이번 작전에는 내가 아직 말하지 못한 일이 있어.",
      tone: "control",
      duration: 5.5,
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
  ];

  const STORY_EVENTS = STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => ({
    id: `stage-${stageIndex + 1}-story-${eventIndex + 1}`,
    x: stages[stageIndex].x + (eventIndex + 1) * ZONE_W - 620,
    lines,
  })));

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
    defeatedBosses: new Set(),
    stageClearTimes: [0, 0, 0, 0],
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
    respawnStage: 0,
    respawnZone: 0,
    respawnCheckpointIndex: -1,
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

  function getStageIndexAt(x) {
    return clamp(stages.findLastIndex((stage) => x >= stage.x), 0, stages.length - 1);
  }

  function getZoneIndexAt(x) {
    return clamp(zones.findLastIndex((zone) => x >= zone.x), 0, zones.length - 1);
  }

  function getZoneEnemies(zoneIndex) {
    const zone = zones[zoneIndex];
    if (!zone) return [];
    return enemies.filter((enemy) => enemy.originX >= zone.x && enemy.originX < zone.x + ZONE_W);
  }

  function getZoneRemaining(zoneIndex) {
    return getZoneEnemies(zoneIndex).filter((enemy) => enemy.alive).length;
  }

  function getEnemyLockdownBounds(enemy) {
    const homeZoneIndex = Number.isInteger(enemy.homeZoneIndex)
      ? enemy.homeZoneIndex
      : getZoneIndexAt(enemy.originX);
    const zone = zones[homeZoneIndex];
    let left = zone.x + 48;
    let right = zone.x + ZONE_W - 48;
    const room = combatRooms.find((candidate) => enemy.originX > candidate.left && enemy.originX < candidate.right);
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

  function enforceEnemyLockdowns() {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      constrainEnemyToLockdown(enemy);
      if (!Number.isFinite(enemy.y) || enemy.y > WORLD_H + 100 || enemy.y < -enemy.h - 260) {
        recoverEnemyToHome(enemy);
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

  function getCheckpointRespawnPosition(checkpoint) {
    const centerX = checkpoint.x + checkpoint.w / 2;
    const expectedFloorY = checkpoint.y + checkpoint.h;
    const support = platforms
      .filter((platform) => centerX >= platform.x && centerX <= platform.x + platform.w)
      .sort((first, second) => (
        Math.abs(first.originalY - expectedFloorY) - Math.abs(second.originalY - expectedFloorY)
      ))[0];
    const floorY = support?.y ?? expectedFloorY;
    return {
      x: clamp(centerX - player.w / 2, 0, WORLD_W - player.w),
      y: floorY - player.h - 1,
    };
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
    const [w, h, baseHp] = sizes[type];
    const stageIndex = getStageIndexAt(x);
    const hp = type === "boss" ? baseHp : baseHp + Math.floor(stageIndex * 0.75);
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
      hurt: 0,
      anim: hash(x) * 5,
      hitAttackId: -1,
      hitShotId: -1,
      blockedAttackId: -1,
      bossPhase: 0,
      bossKind: null,
      countedKill: false,
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

    const floorHeights = [
      [650, 690, 630, 710, 650, 680, 650],
      [700, 720, 660, 700, 670, 710, 680],
      [650, 690, 720, 630, 680, 650, 670],
      [710, 670, 630, 720, 660, 610, 660],
    ];
    const platformKinds = {
      scrap: ["roof", "cargo", "factory", "cargo", "roof", "factory", "gate"],
      foundry: ["foundry", "channel", "crusher", "channel", "foundry", "turbine", "gate"],
      archive: ["lab", "archive", "channel", "archive", "shrine", "lab", "gate"],
      tower: ["rail", "city", "tower", "tower", "firewall", "array", "gate"],
    };
    const enemyPools = [
      ["runner", "runner", "gunner", "drone", "shield"],
      ["runner", "gunner", "drone", "shield", "piercer", "mortar"],
      ["shield", "piercer", "drone", "gunner", "mortar", "runner"],
      ["piercer", "mortar", "shield", "drone", "gunner", "runner", "mortar"],
    ];

    function addZoneEnemies(zone, floorY, spawnPoints) {
      const pool = enemyPools[zone.stageIndex];
      const extraCount = zone.stageIndex;
      const points = [...spawnPoints];
      for (let extra = 0; extra < extraCount; extra += 1) {
        points.push([3250 + extra * 230, floorY]);
      }
      points.forEach(([localX, surfaceY, forcedType], index) => {
        const type = forcedType || pool[(zone.x / ZONE_W + index * 2) % pool.length];
        const actualY = type === "drone" ? Math.min(surfaceY - 170, floorY - 230) : surfaceY;
        addEnemy(type, zone.x + localX, actualY, 110 + zone.stageIndex * 35);
      });
    }

    for (const zone of zones) {
      const localZoneIndex = Math.round((zone.x - stages[zone.stageIndex].x) / ZONE_W);
      const floorY = floorHeights[zone.stageIndex][localZoneIndex];
      const kind = platformKinds[zone.kind][localZoneIndex];
      const origin = zone.x;
      const spawns = [];

      if (zone.template === "terrace") {
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
      } else {
        addPlatform(origin, floorY, ZONE_W, WORLD_H - floorY, kind);
        addPlatform(origin + 260, floorY - 160, 420, 28, kind);
        addPlatform(origin + 930, floorY - 300, 420, 28, kind);
        addPlatform(origin + 1670, floorY - 190, 380, 28, kind);
        addPlatform(origin + 3030, floorY - 250, 430, 28, kind);
        const stage = stages[zone.stageIndex];
        const definition = BOSS_DEFINITIONS[stage.bossKind];
        const boss = addEnemy("boss", stage.bossX, floorY, 620);
        boss.bossKind = stage.bossKind;
        boss.hp = definition.hp;
        boss.maxHp = definition.hp;
        boss.spawnX = boss.x;
        boss.spawnY = boss.y;
        boss.baseY = boss.y;
        addSign(origin + 2140, floorY - 100, definition.name, definition.subtitle);
      }

      if (zone.template !== "boss") addZoneEnemies(zone, floorY, spawns);
      if (zone.template !== "fork" && zone.template !== "boss") addPickup(origin + 2200, floorY - 310);
      addSign(origin + 110, floorY - 66, zone.name, zone.code);
      addCheckpoint(origin + 120, floorY - 88, zone.name);
    }

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

  function readCampaignSave() {
    try {
      const raw = window.localStorage?.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data?.version === 1 ? data : null;
    } catch {
      return null;
    }
  }

  function updateContinueButton() {
    if (!continueButton) return;
    const saved = readCampaignSave();
    continueButton.hidden = !saved;
    continueButton.disabled = !saved;
    if (saved) continueButton.textContent = `이어하기 · STAGE 0${(saved.respawnStage || 0) + 1}`;
  }

  function saveCampaign() {
    if (game.mode !== "playing") return;
    try {
      const data = {
        version: 1,
        difficulty: game.difficulty,
        runTime: game.runTime,
        deaths: game.deaths,
        kills: game.kills,
        respawnX: player.respawnX,
        respawnY: player.respawnY,
        respawnStage: player.respawnStage,
        respawnZone: player.respawnZone,
        respawnCheckpointIndex: player.respawnCheckpointIndex,
        defeatedBosses: [...game.defeatedBosses],
        stageClearTimes: [...game.stageClearTimes],
        storySeen: [...game.storySeen],
        defeatedEnemyIds: enemies.filter((enemy) => !enemy.alive).map((enemy) => enemy.id),
        roomStates: combatRooms.map((room) => ({ left: room.left, triggered: room.triggered, cleared: room.cleared })),
      };
      window.localStorage?.setItem(SAVE_KEY, JSON.stringify(data));
      updateContinueButton();
    } catch {
      // Private browsing or blocked storage should never stop the game loop.
    }
  }

  function restoreCampaign(saved) {
    const deadIds = new Set(saved.defeatedEnemyIds || []);
    for (const enemy of enemies) {
      if (!deadIds.has(enemy.id)) continue;
      enemy.alive = false;
      enemy.hp = 0;
      enemy.countedKill = true;
    }
    for (const state of saved.roomStates || []) {
      const room = combatRooms.find((candidate) => candidate.left === state.left);
      if (!room) continue;
      room.triggered = Boolean(state.triggered);
      room.cleared = Boolean(state.cleared);
    }
    const savedCheckpointIndex = Number.isInteger(saved.respawnCheckpointIndex)
      ? clamp(saved.respawnCheckpointIndex, 0, checkpoints.length - 1)
      : checkpoints.reduce((closestIndex, checkpoint, index) => (
        Math.abs(checkpoint.x - (saved.respawnX ?? 150))
          < Math.abs(checkpoints[closestIndex].x - (saved.respawnX ?? 150))
          ? index
          : closestIndex
      ), 0);
    setRespawnCheckpoint(checkpoints[savedCheckpointIndex], savedCheckpointIndex);
    player.x = player.respawnX;
    player.y = player.respawnY;
    player.hp = player.maxHp;
    game.runTime = Math.max(0, saved.runTime || 0);
    game.deaths = Math.max(0, saved.deaths || 0);
    game.kills = Math.max(0, saved.kills || 0);
    game.defeatedBosses = new Set(saved.defeatedBosses || []);
    game.stageClearTimes = Array.isArray(saved.stageClearTimes) ? saved.stageClearTimes.slice(0, 4) : [0, 0, 0, 0];
    while (game.stageClearTimes.length < 4) game.stageClearTimes.push(0);
    game.storySeen = new Set(saved.storySeen || []);
    game.storyQueue = [];
    game.story = null;
    game.storyTimer = 0;
    game.stage = getStageIndexAt(player.x);
    game.zone = clamp(zones.findLastIndex((zone) => player.x >= zone.x), 0, zones.length - 1);
    game.stageBossDefeated = game.defeatedBosses.has("warden");
    game.bossDefeated = game.defeatedBosses.has("censor");
    camera.x = clamp(player.x - 300, 0, WORLD_W - W);
    camera.y = clamp(player.y - 420, 0, WORLD_H - H);
    game.hint = `자동 저장 불러오기 · STAGE 0${game.stage + 1}`;
    game.hintTimer = 4;
  }

  function resetGame(resume = false) {
    const saved = resume ? readCampaignSave() : null;
    if (saved?.difficulty && difficultySettings[saved.difficulty]) selectedDifficulty = saved.difficulty;
    if (!resume) {
      try { window.localStorage?.removeItem(SAVE_KEY); } catch { /* Ignore unavailable storage. */ }
    }
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
      respawnStage: 0,
      respawnZone: 0,
      respawnCheckpointIndex: -1,
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
      defeatedBosses: new Set(),
      stageClearTimes: [0, 0, 0, 0],
      startedAt: performance.now(),
      burstUnlocked: false,
      storyQueue: INTRO_STORY.map((line) => ({ ...line })),
      story: null,
      storyTimer: 0,
      storySeen: new Set(),
      arenaTitle: 0,
    });
    if (saved) restoreCampaign(saved);
    if (!saved) {
      camera.x = 0;
      camera.y = 0;
    }
    keys.clear();
    pressed.clear();
    startScreen.classList.remove("visible");
    pauseScreen.classList.remove("visible");
    endScreen.classList.remove("visible");
    updateContinueButton();
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

    const movingLeft = keys.has("KeyA") || keys.has("ArrowLeft");
    const movingRight = keys.has("KeyD") || keys.has("ArrowRight");
    if (movingLeft && !movingRight) player.facing = -1;
    if (movingRight && !movingLeft) player.facing = 1;

    let dirY = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) dirY = -0.82;
    if (keys.has("KeyS") || keys.has("ArrowDown")) dirY = 0.82;
    const dirX = dirY === 0 ? player.facing : player.facing * 0.58;
    const directionLength = Math.max(1, Math.hypot(dirX, dirY));
    player.attackDir.x = dirX / directionLength;
    player.attackDir.y = dirY / directionLength;
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
    if (!enemy.countedKill) {
      enemy.countedKill = true;
      game.kills += 1;
    }
    player.styleScore = Math.min(100, player.styleScore + (enemy.type === "boss" ? 30 : 9));
    player.burstCooldown = Math.max(0, player.burstCooldown - (enemy.type === "boss" ? 1.2 : 0.32));
    game.freeze = enemy.type === "boss" ? 0.18 : 0.09;
    game.shake = enemy.type === "boss" ? 22 : 13;
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, palette.red, enemy.type === "boss" ? 50 : 22, 520, 0.8, 920);
    spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, palette.cyan, enemy.type === "boss" ? 40 : 12, 380, 0.65, 620);

    const clearedZoneIndex = getZoneIndexAt(enemy.originX);
    if (getZoneRemaining(clearedZoneIndex) === 0 && enemy.type !== "boss") {
      game.hint = `${zones[clearedZoneIndex].name} 확보 · 다음 구역 개방`;
      game.hintTimer = 3.2;
      player.hp = Math.min(player.maxHp, player.hp + 1);
      spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, palette.cyan, 24, 360, 0.7, 420);
      saveCampaign();
      sound.checkpoint();
    }

    if (enemy.type === "boss") {
      const rank = enemy.stageIndex;
      const kind = enemy.bossKind || stages[rank].bossKind;
      game.defeatedBosses.add(kind);
      game.stageClearTimes[rank] = game.runTime;
      game.stageBossDefeated = game.defeatedBosses.has("warden");
      game.bossDefeated = game.defeatedBosses.has("censor");
      const nextStage = stages[rank + 1];
      game.hint = nextStage ? `${BOSS_DEFINITIONS[kind].name} 격파 — ${nextStage.name} 진입` : "최종 검열 해제 — 백야의 모든 기록을 송신";
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
          { speaker: "감찰관 · 도담", text: "지상 수신망 연결 완료. 도시 전체가 백야의 증언을 듣고 있어. 서린아, 작전 4호 성공이야.", tone: "control", duration: 5.8 },
          { speaker: "잔향 · 새봄", text: "기억해 줘서 고마워, 언니. 이제 우리 이야기는 폐기장이 아니라 사람들 사이에서 계속될 거야.", tone: "archive", duration: 5.8 },
        ],
      ];
      queueStory(victoryStories[rank]);
      saveCampaign();
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

    for (const enemy of enemies) {
      const enemyZoneIndex = getZoneIndexAt(enemy.originX);
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.windup = 0;
      enemy.bossAction = null;
      enemy.bossShotPattern = null;
      enemy.bossChargeDuration = 0;
      enemy.bossChargeDirection = 0;
      enemy.targetX = null;
      enemy.targetY = null;
      if (enemyZoneIndex < restartZoneIndex) {
        enemy.alive = false;
        enemy.hp = 0;
        enemy.countedKill = true;
        continue;
      }
      restartedEnemyCount += 1;
      enemy.alive = true;
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.spawnX;
      enemy.y = enemy.spawnY;
      enemy.baseY = enemy.spawnY;
      enemy.grounded = false;
      enemy.cooldown = 0.65 + hash(enemy.originX) * 0.9;
      enemy.hurt = 0;
      enemy.bossPhase = 0;
      enemy.bossJumpCooldown = 0;
      enemy.stuckTimer = 0;
      enemy.hitAttackId = -1;
      enemy.hitShotId = -1;
      enemy.blockedAttackId = -1;
    }

    for (const room of combatRooms) {
      const roomZoneIndex = getZoneIndexAt(room.left);
      const clearedBeforeCheckpoint = roomZoneIndex < restartZoneIndex;
      room.triggered = clearedBeforeCheckpoint;
      room.cleared = clearedBeforeCheckpoint;
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

    game.stageBossDefeated = game.defeatedBosses.has("warden");
    game.bossDefeated = game.defeatedBosses.has("censor");
    game.stage = getStageIndexAt(checkpoint.x);
    game.zone = restartZoneIndex;
    player.x = checkpointPosition.x;
    player.y = checkpointPosition.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
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

  function startBossChargedShot(enemy, pattern, dx, duration = 0.78) {
    const rank = enemy.stageIndex;
    enemy.windup = duration;
    enemy.bossAction = "chargeShot";
    enemy.bossShotPattern = pattern;
    enemy.bossChargeDuration = duration;
    enemy.bossChargeDirection = dx >= 0 ? -1 : 1;
    enemy.targetX = player.x + player.w / 2;
    enemy.targetY = player.y + player.h / 2;
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
    sound.tone(105 + rank * 22, duration * 0.7, "sawtooth", 0.018, 1.7);
  }

  function releaseBossChargedShot(enemy) {
    const target = { x: enemy.targetX, y: enemy.targetY };
    switch (enemy.bossShotPattern) {
      case "warden-volley":
        [-0.16, 0, 0.16].forEach((spread) => fireBullet(enemy, 400, spread, "standard", target));
        break;
      case "warden-air":
        if (enemy.grounded) {
          enemy.vy = -590;
          enemy.vx = -enemy.bossChargeDirection * 230;
        }
        fireBullet(enemy, 330, 0, "standard", target);
        break;
      case "warden-suppress":
        for (let index = -3; index <= 3; index += 1) {
          fireBullet(enemy, 445 - Math.abs(index) * 18, index * 0.085, "standard", target);
        }
        break;
      case "furnace-mortar":
        fireMortar(enemy, enemy.targetX - 150);
        fireMortar(enemy, enemy.targetX + 150);
        break;
      case "furnace-volley":
        for (let index = -2; index <= 2; index += 1) fireBullet(enemy, 375, index * 0.13, "standard", target);
        break;
      case "furnace-eruption":
        for (let index = 0; index < 8; index += 1) {
          fireBullet(enemy, 285, index * TAU / 8, "standard", target);
        }
        fireMortar(enemy, enemy.targetX);
        break;
      case "weaver-lance":
        [-0.18, 0, 0.18].forEach((spread) => fireBullet(enemy, 430, spread, "phase", target));
        break;
      case "weaver-fan":
        for (let index = -3; index <= 3; index += 1) fireBullet(enemy, 340, index * 0.16, "phase", target);
        break;
      case "weaver-orbit":
        for (let index = 0; index < 12; index += 1) {
          fireBullet(enemy, 305 + (index % 2) * 45, index * TAU / 12, "phase", target);
        }
        break;
      case "censor-volley":
        for (let index = -3; index <= 3; index += 1) {
          fireBullet(enemy, 430, index * 0.115, index % 2 === 0 ? "phase" : "standard", target);
        }
        break;
      case "censor-mortar":
        [-220, 0, 220].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
        break;
      case "censor-air":
        if (enemy.grounded) {
          enemy.vy = -720;
          enemy.vx = -enemy.bossChargeDirection * 360;
        }
        [-0.22, 0, 0.22].forEach((spread) => fireBullet(enemy, 470, spread, "phase", target));
        break;
      case "censor-grid":
        for (let index = -4; index <= 4; index += 1) {
          fireBullet(enemy, 455, index * 0.09, index % 2 === 0 ? "phase" : "standard", target);
        }
        [-260, 260].forEach((offset) => fireMortar(enemy, enemy.targetX + offset));
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
    game.shake = 12 + enemy.stageIndex * 2;
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
        activateCheckpoint(checkpoint);
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

    for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
      const lockedZone = zones[zoneIndex];
      const zoneBoundary = lockedZone.x + ZONE_W - 48;
      if (player.x + player.w <= zoneBoundary) break;
      const zoneRemaining = getZoneRemaining(zoneIndex);
      if (zoneRemaining === 0) continue;
      player.x = zoneBoundary - player.w;
      player.vx = Math.min(0, player.vx);
      game.hint = `${lockedZone.name} 봉쇄 · 남은 적 ${zoneRemaining}기`;
      game.hintTimer = Math.max(game.hintTimer, 1.2);
      break;
    }

    for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
      const stage = stages[stageIndex];
      if (player.x <= stage.gateX || game.defeatedBosses.has(stage.bossKind)) continue;
      player.x = stage.gateX - player.w - 35;
      player.vx = -180;
      game.hint = `${BOSS_DEFINITIONS[stage.bossKind].name}을 먼저 격파`;
      game.hintTimer = 3;
      break;
    }

    if (player.x > WORLD_W - 145 && game.defeatedBosses.has("censor")) {
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
    enemy.grounded = false;
    enemy.vy = Math.min((enemy.vy || 0) + GRAVITY * 0.78 * dt, 980);
    const lockdownBounds = getEnemyLockdownBounds(enemy);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(enemy.vx * dt), Math.abs(enemy.vy * dt)) / 7));
    const stepTime = dt / steps;
    let blocked = false;

    for (let step = 0; step < steps; step += 1) {
      const oldX = enemy.x;
      enemy.x += enemy.vx * stepTime;
      if (enemy.x < lockdownBounds.left || enemy.x + enemy.w > lockdownBounds.right) {
        constrainEnemyToLockdown(enemy, lockdownBounds);
        blocked = true;
      }
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
    constrainEnemyToLockdown(enemy, lockdownBounds);
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
    if (!Number.isFinite(enemy.y) || enemy.y > WORLD_H + 100 || enemy.y < -enemy.h - 260) {
      recoverEnemyToHome(enemy);
    }
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
    for (const enemy of solidEnemies) constrainEnemyToLockdown(enemy);
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
    const stagePressure = 1 + enemy.stageIndex * 0.08;
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
      if (platforms.some((platform) => overlaps(enemy, platform))) {
        enemy.x = previousDroneX;
        enemy.y = previousDroneY;
        enemy.baseY -= Math.sign(Math.sin(enemy.anim * 2.2) || 1) * 8;
      }
      constrainEnemyToLockdown(enemy);
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
        enemy.cooldown = 2.05 / stagePressure;
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
    const rank = enemy.stageIndex;
    const kind = enemy.bossKind || stages[rank]?.bossKind || "warden";
    const hpRatio = enemy.hp / enemy.maxHp;
    const speedScale = difficultySettings[game.difficulty].enemySpeed;
    const enrage = hpRatio < 0.45 ? 1.18 : 1;
    const desiredSpeed = (72 + rank * 18) * speedScale * enrage;
    const chargingShot = enemy.bossAction === "chargeShot" && enemy.windup > 0;
    if (chargingShot) {
      const retreatSpeed = (165 + rank * 24) * speedScale;
      enemy.vx = moveToward(enemy.vx, enemy.bossChargeDirection * retreatSpeed, 560 * dt);
    } else if (distance < 760 && Math.abs(dx) > 115) {
      enemy.vx = moveToward(enemy.vx, Math.sign(dx) * desiredSpeed, 360 * dt);
    } else {
      enemy.vx = moveToward(enemy.vx, 0, 500 * dt);
    }
    const arenaLeft = Math.max(stages[rank].x + ZONE_W * 6 + 120, enemy.originX - 920);
    const arenaRight = Math.min(stages[rank].gateX - 70, enemy.originX + 820);
    const moveDirection = Math.sign(enemy.vx);
    enemy.bossJumpCooldown = Math.max(0, (enemy.bossJumpCooldown || 0) - dt);
    if (enemy.grounded && moveDirection !== 0 && !hasGroundAhead(enemy, moveDirection)) {
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
      const phaseCount = BOSS_DEFINITIONS[kind].patterns.length;
      enemy.bossPhase = (enemy.bossPhase + 1) % phaseCount;
      const recovery = hpRatio < 0.45 ? 0.82 : 1;

      if (kind === "warden") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "warden-volley", dx, 0.82);
          enemy.cooldown = 1.95 * recovery;
        } else if (enemy.bossPhase === 1) {
          enemy.windup = 0.72;
          enemy.bossAction = "dash";
          enemy.cooldown = 2.25 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "warden-air", dx, 0.68);
          enemy.cooldown = 2.1 * recovery;
        } else {
          startBossChargedShot(enemy, "warden-suppress", dx, 0.92);
          enemy.cooldown = 2.3 * recovery;
        }
      } else if (kind === "furnace") {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "furnace-mortar", dx, 0.94);
          enemy.cooldown = 2.35 * recovery;
        } else if (enemy.bossPhase === 1) {
          startBossChargedShot(enemy, "furnace-volley", dx, 0.82);
          enemy.cooldown = 1.85 * recovery;
        } else if (enemy.bossPhase === 2) {
          enemy.windup = 0.82;
          enemy.bossAction = "slam";
          enemy.cooldown = 2.45 * recovery;
        } else {
          startBossChargedShot(enemy, "furnace-eruption", dx, 1.08);
          enemy.cooldown = 2.7 * recovery;
        }
      } else if (kind === "weaver") {
        if (enemy.bossPhase === 0) {
          spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#d7a0ff", 28, 360, 0.55, 0);
          enemy.x = clamp(player.x + (dx > 0 ? -420 : 420), arenaLeft + 35, arenaRight - enemy.w - 35);
          enemy.y = enemy.baseY;
          enemy.vx = 0;
          startBossChargedShot(enemy, "weaver-lance", dx, 0.76);
          enemy.cooldown = 2.2 * recovery;
        } else if (enemy.bossPhase === 1) {
          startBossChargedShot(enemy, "weaver-fan", dx, 0.86);
          enemy.cooldown = 1.95 * recovery;
        } else if (enemy.bossPhase === 2) {
          enemy.windup = 0.68;
          enemy.bossAction = "dash";
          enemy.cooldown = 2.05 * recovery;
        } else {
          startBossChargedShot(enemy, "weaver-orbit", dx, 1.02);
          enemy.cooldown = 2.5 * recovery;
        }
      } else {
        if (enemy.bossPhase === 0) {
          startBossChargedShot(enemy, "censor-volley", dx, 0.72);
          enemy.cooldown = 1.55 * recovery;
        } else if (enemy.bossPhase === 1) {
          enemy.windup = 0.55;
          enemy.bossAction = "dash";
          enemy.cooldown = 1.65 * recovery;
        } else if (enemy.bossPhase === 2) {
          startBossChargedShot(enemy, "censor-mortar", dx, 0.98);
          enemy.cooldown = 2.05 * recovery;
        } else if (enemy.bossPhase === 3) {
          startBossChargedShot(enemy, "censor-air", dx, 0.66);
          enemy.cooldown = 1.8 * recovery;
        } else {
          startBossChargedShot(enemy, "censor-grid", dx, 1.12);
          enemy.cooldown = 2.35 * recovery;
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
          for (let i = -2; i <= 2; i += 1) fireBullet(enemy, 310, i * 0.18);
        } else if (enemy.bossAction === "dash") {
          enemy.vx = Math.sign(dx) * (420 + rank * 65);
          if (Math.abs(dx) < 165 && Math.abs(player.y - enemy.y) < 100) damagePlayer(rank >= 3 ? 2 : 1, enemy.x);
        } else if (enemy.bossAction === "chargeShot") {
          releaseBossChargedShot(enemy);
        }
        game.shake = Math.max(game.shake, 10 + rank * 2);
      }
    }

    if (Math.abs(dx) < 68 && Math.abs(player.y - enemy.y) < 86) damagePlayer(1, enemy.x);
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
        saveCampaign();
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
      } else if (hazard.kind === "steam") {
        const pulse = (game.time + hazard.phase) % 3.4;
        hazard.active = pulse > 0.85 && pulse < 2.35;
      }
    }

    enforceEnemyLockdowns();
    updatePlayer(dt);
    for (const enemy of enemies) updateEnemy(enemy, dt);
    resolveEnemySeparation();
    resolvePlayerEnemyOverlap();
    updateCombatRooms();
    updateBullets(dt);
    enforceEnemyLockdowns();
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
    const stageVisuals = [
      { top: "#04070d", mid: "#0b111b", bottom: "#141721", haze: "rgba(38, 116, 124, 0.06)" },
      { top: "#100607", mid: "#1b0d0d", bottom: "#271515", haze: "rgba(255, 91, 54, 0.08)" },
      { top: "#080711", mid: "#111020", bottom: "#1b1830", haze: "rgba(176, 113, 255, 0.075)" },
      { top: "#030912", mid: "#071525", bottom: "#111d31", haze: "rgba(91, 184, 255, 0.075)" },
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
    const runBlend = player.grounded ? clamp((speedRatio - 0.03) / 0.42, 0, 1) : 0;
    const running = runBlend > 0.04;
    const walling = !player.grounded && (player.wallLeft || player.wallRight);
    const stride = Math.sin(player.runCycle);
    const bob = running
      ? Math.abs(Math.sin(player.runCycle * 2)) * (1.1 + runBlend * 1.35)
      : Math.sin(game.time * 2.4) * 0.65;
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
      const kneeX = px + Math.sin(upperAngle) * upperLength;
      const kneeY = py + Math.cos(upperAngle) * upperLength;
      const lowerAngle = upperAngle - kneeBend;
      const endX = kneeX + Math.sin(lowerAngle) * lowerLength;
      const endY = kneeY + Math.cos(lowerAngle) * lowerLength;
      drawPixelSegment(px, py, kneeX, kneeY, width, color, "rgba(151, 207, 216, 0.24)");
      drawPixelSegment(kneeX, kneeY, endX, endY, Math.max(4, width - 1), color, "rgba(151, 207, 216, 0.18)");
      ctx.fillStyle = "#07101a";
      ctx.beginPath();
      ctx.arc(Math.round(kneeX), Math.round(kneeY), width * 0.62, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#40596a";
      ctx.fillRect(Math.round(kneeX - width * 0.44), Math.round(kneeY - width * 0.34), Math.ceil(width * 0.88), Math.ceil(width * 0.68));
      ctx.fillStyle = empowered ? palette.amber : palette.cyan;
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
        ctx.fillStyle = empowered ? palette.amber : palette.cyan;
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

    function legPose(phase, layer) {
      if (walling) {
        return layer === "back"
          ? { upper: -0.72, knee: -0.88 }
          : { upper: 0.82, knee: 1.12 };
      }
      if (!player.grounded && player.vy < -60) {
        return layer === "back"
          ? { upper: -0.38, knee: -0.18 }
          : { upper: 0.78, knee: 1.18 };
      }
      if (!player.grounded) {
        return layer === "back"
          ? { upper: 0.28, knee: 0.76 }
          : { upper: -0.38, knee: -0.72 };
      }
      const swing = Math.sin(phase);
      const swingLift = Math.max(0, swing);
      const landingBend = player.squash * 0.8;
      return {
        upper: swing * 0.7 * runBlend + (layer === "back" ? -0.04 : 0.04),
        knee: (0.12 + swingLift * 0.9 + landingBend) * runBlend + (1 - runBlend) * 0.16,
      };
    }

    const backPose = legPose(player.runCycle + Math.PI, "back");
    const frontPose = legPose(player.runCycle, "front");
    drawJointedLimb(-5, -19, 11, 11, 7, backPose.upper, backPose.knee, "#0c1825", true);
    drawJointedLimb(5, -19, 11, 12, 8, frontPose.upper, frontPose.knee, "#172b3c", true);

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
    ctx.fillStyle = empowered ? palette.amber : palette.red;
    ctx.fillRect(0, -24, 1, 2);
    ctx.fillStyle = "#6e8790";
    ctx.fillRect(-9, -18, 3, 2);
    ctx.fillRect(-4, -18, 3, 2);
    ctx.fillRect(5, -18, 3, 2);

    const rearArm = running ? -stride * 0.48 * runBlend + 0.14 : 0.28;
    drawJointedLimb(-10, -38, 8, 8, 5, rearArm, -0.42, "#152638", false, true);

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

    // Hair, jaw shadow, eye, nose, and a tiny comms implant are drawn as individual pixels.
    ctx.fillStyle = "#263842";
    ctx.fillRect(-10, -57, 12, 3);
    ctx.fillRect(-11, -55, 4, 5);
    ctx.fillStyle = "#c9d6d4";
    ctx.fillRect(-8, -48, 3, 4);
    ctx.fillStyle = "#738c92";
    ctx.fillRect(-6, -44, 12, 2);
    ctx.fillStyle = "#101923";
    ctx.fillRect(1, -50, 3, 2);
    ctx.fillRect(7, -47, 2, 1);
    ctx.fillStyle = "#d68678";
    ctx.fillRect(4, -45, 3, 1);
    ctx.fillStyle = palette.cyan;
    ctx.fillRect(-12, -49, 2, 2);
    ctx.fillStyle = "#506873";
    ctx.fillRect(-10, -46, 2, 3);

    let armAngle = running ? stride * 0.42 : -0.15;
    if (!player.grounded) armAngle = -0.48;
    if (attacking) armAngle = -2.15 + attackProgress * 4.15 + player.attackDir.y * 0.72;

    drawJointedLimb(10, -38, 9, 9, 6, armAngle, attacking ? 0 : 0.38, "#294459", false, !attacking);
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
    if (enemy.type === "boss" && enemy.bossAction === "chargeShot") {
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
      const gait = Math.sin(phase);
      const strideAmount = (heavy ? 0.34 : 0.58) * movingRatio;
      const upperAngle = gait * strideAmount;
      const kneeLift = Math.max(0, gait) * movingRatio;
      const kneeBend = (heavy ? 0.12 : 0.18) + kneeLift * (heavy ? 0.48 : 0.82);
      const kneeX = hipX + Math.sin(upperAngle) * upperLength;
      const kneeY = hipY + Math.cos(upperAngle) * upperLength;
      const shinAngle = upperAngle - kneeBend;
      const footX = kneeX + Math.sin(shinAngle) * lowerLength;
      const footY = kneeY + Math.cos(shinAngle) * lowerLength;
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
    } else if (enemy.type === "gunner" || enemy.type === "piercer" || enemy.type === "mortar") {
      const isPiercer = enemy.type === "piercer";
      const isMortar = enemy.type === "mortar";
      const recoil = enemy.windup > 0 ? Math.sin(enemy.windup * 35) * 3 : 0;
      const gunnerAccent = isMortar ? palette.red : isPiercer ? "#79dfff" : palette.amber;
      drawRobotLeg(-7, 40, enemy.anim * 6 + Math.PI, 9, 9, 7, gunnerAccent, isMortar);
      drawRobotLeg(7, 40, enemy.anim * 6, 9, 9, 7, gunnerAccent, isMortar);
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
    } else if (enemy.type === "boss") {
      const pulse = 0.5 + Math.sin(game.time * 6) * 0.2;
      const shoulder = Math.sin(enemy.anim * 3.5) * 5;
      const bossKind = enemy.bossKind || "warden";
      const bossAccent = BOSS_DEFINITIONS[bossKind]?.accent || palette.red;
      const chargingShot = enemy.bossAction === "chargeShot" && enemy.windup > 0;
      const chargeProgress = chargingShot
        ? clamp(1 - enemy.windup / Math.max(0.01, enemy.bossChargeDuration), 0, 1)
        : 0;
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
    for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
      const zone = zones[zoneIndex];
      if (zone.template === "boss" || getZoneRemaining(zoneIndex) === 0) continue;
      const boundary = zone.x + ZONE_W - 48;
      if (boundary > left - 40 && boundary < right + 40) drawCombatSeal(boundary);
    }
    for (const stage of stages) {
      if (stage.gateX > left - 200 && stage.gateX < right) drawGateAt(stage.gateX, game.defeatedBosses.has(stage.bossKind));
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
    ctx.fillText(`STAGE 0${game.stage + 1} · ${zones[game.zone].name}`, W - 45, 41);
    ctx.fillStyle = "#738b98";
    ctx.font = "10px monospace";
    ctx.fillText(`${Math.floor(progress * 100)}% · ${formatTime(game.runTime)}`, W - 45, 62);
    ctx.fillStyle = "#202f3c";
    ctx.fillRect(W - 295, 77, 250, 3);
    ctx.fillStyle = zones[game.zone].color;
    ctx.fillRect(W - 295, 77, 250 * progress, 3);
    const hudZoneRemaining = getZoneRemaining(game.zone);
    ctx.fillStyle = hudZoneRemaining > 0 ? palette.red : palette.cyan;
    ctx.font = "800 9px 'Malgun Gothic', sans-serif";
    ctx.fillText(hudZoneRemaining > 0 ? `구역 봉쇄 · 잔여 ${hudZoneRemaining}` : "구역 확보 · 다음 구역 개방", W - 295, 87);
    ctx.textAlign = "left";

    const boss = enemies.find((enemy) => enemy.type === "boss" && enemy.alive && Math.abs(player.x - enemy.originX) < 1500);
    if (boss) {
      const bossDefinition = BOSS_DEFINITIONS[boss.bossKind] || BOSS_DEFINITIONS.warden;
      ctx.fillStyle = "rgba(3, 7, 13, 0.82)";
      ctx.fillRect(W / 2 - 280, 42, 560, 42);
      ctx.fillStyle = "#c5d1d5";
      ctx.font = "800 12px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(bossDefinition.name, W / 2, 49);
      ctx.fillStyle = bossDefinition.accent;
      ctx.font = "700 9px 'Malgun Gothic', sans-serif";
      const currentPatternName = bossDefinition.patterns[boss.bossPhase] || bossDefinition.patterns[0];
      ctx.fillText(`${bossDefinition.silhouette} · ${bossDefinition.weapon} · ${currentPatternName}`, W / 2, 63);
      ctx.fillStyle = "#39202b";
      ctx.fillRect(W / 2 - 240, 70, 480, 6);
      ctx.fillStyle = bossDefinition.accent;
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

  startButton.addEventListener("click", () => resetGame(false));
  continueButton?.addEventListener("click", () => resetGame(true));
  restartButton.addEventListener("click", () => resetGame(false));
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
  updateContinueButton();
  requestAnimationFrame(frame);
})();
