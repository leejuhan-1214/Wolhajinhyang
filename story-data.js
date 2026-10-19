// Campaign narrative is kept separate from the simulation and renderers.
// A factory resolves story positions against the current map without shared mutable state.
"use strict";

window.createMoonlitStory = function createMoonlitStory({
  STAGE_COUNT, ZONES_PER_STAGE, MID_BOSS_ZONE_INDEX, ZONE_STARTS, ZONE_WIDTHS, TUTORIAL_END_X, stages, stageZoneNames,
}) {
  const INTRO_STORY = [
    {
      speaker: "월식 예보 · D-07",
      text: "칠 일 뒤 도시의 모든 시민 기록이 한 번에 덮어써진다. 중앙국은 이를 재난이 아닌 '월하잔향 정상화'라고 명명했다.",
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
        { speaker: "M-07 · 서린", text: "내가 걸친 제복 외투도 흰색이군. 도담, 내가 여기서 무엇을 했지?", tone: "operative", duration: 5.1 },
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
        { speaker: "원본 판정체 · 대역-13", text: "한서린 후보 둘을 확인했다. 법적 원본 선정을 위해 기억 손실, 시민 기여도, 가족 선호도를 점수화한다.", tone: "hostile", duration: 6.4 },
        { speaker: "잔영-00", text: "대역-13의 계산에서 내가 우세하다. 나는 사고 이후의 죄책감이 없고 중앙국 명령에 저항한 전력도 없다.", tone: "hostile", duration: 6.2 },
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
      { speaker: "검기 집행관 · 공문", text: "제4 야간 기록 복구. 사망자의 반론권과 삭제 명령 원본을 같은 공개 채널에 고정한다.", tone: "archive", duration: 6.0 },
      { speaker: "도담", text: "내 소각 서명도 숨기지 않고 함께 올렸어. 잘못을 고백하는 것만으로 끝내지 않고 송신탑을 끝까지 열겠다.", tone: "control", duration: 6.1 },
    ],
    [
      { speaker: "광기 연구체 · 대역-13", text: "제5 야간 기록 복구. 표본 배합 전 원자료와 원본 판정 실험의 실패 보고서를 분리한다.", tone: "archive", duration: 6.2 },
      { speaker: "서린", text: "다섯 기록이 모였다. 이제 원형 보관소의 잔영과 함께 누가 원본인지가 아니라 누가 삭제 규칙을 끝낼지 결정한다.", tone: "operative", duration: 6.2 },
    ],
  ];

  function getStageZonePosition(stageIndex, localZoneIndex, progress = 0, offset = 0) {
    const safeStageIndex = Math.max(0, Math.min(STAGE_COUNT - 1, stageIndex));
    const safeLocalIndex = Math.max(0, Math.min(ZONES_PER_STAGE - 1, localZoneIndex));
    const globalIndex = safeStageIndex * ZONES_PER_STAGE + safeLocalIndex;
    return ZONE_STARTS[globalIndex] + ZONE_WIDTHS[globalIndex] * progress + offset;
  }

  const PRIMARY_STORY_ZONE_INDICES = Object.freeze([2, 4, 6, 9, 12, 14]);
  const EXTENDED_STORY_ZONE_INDICES = Object.freeze([3, 10, 13]);
  const STORY_EVENTS = STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => {
    const localZoneIndex = PRIMARY_STORY_ZONE_INDICES[eventIndex] ?? ZONES_PER_STAGE - 2;
    return {
      id: `stage-${stageIndex + 1}-story-${eventIndex + 1}`,
      stageIndex,
      zoneIndex: stageIndex * ZONES_PER_STAGE + localZoneIndex,
      x: getStageZonePosition(stageIndex, localZoneIndex, 0.08),
      lines,
    };
  })).concat(EXTENDED_STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => {
    const localZoneIndex = EXTENDED_STORY_ZONE_INDICES[eventIndex] ?? ZONES_PER_STAGE - 2;
    return {
      id: `stage-${stageIndex + 1}-extended-story-${eventIndex + 1}`,
      stageIndex,
      zoneIndex: stageIndex * ZONES_PER_STAGE + localZoneIndex,
      x: getStageZonePosition(stageIndex, localZoneIndex, 0.08),
      lines,
    };
  }))).concat(MIDBOSS_STORY_CHAPTERS.flatMap((chapter, stageIndex) => chapter.map((lines, eventIndex) => {
    const localZoneIndex = eventIndex === 0 ? MID_BOSS_ZONE_INDEX - 1 : MID_BOSS_ZONE_INDEX + 1;
    return {
      id: `stage-${stageIndex + 1}-midboss-story-${eventIndex + 1}`,
      stageIndex,
      zoneIndex: stageIndex * ZONES_PER_STAGE + localZoneIndex,
      x: getStageZonePosition(stageIndex, localZoneIndex, eventIndex === 0 ? 0.42 : 0.55),
      lines,
    };
  })));

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
        { speaker: "한서린", text: "새봄이한테 언니가 도망친 게 아니라고 전해 줘. 그리고 여기 있던 사람들을 숫자로만 남기지 마.", tone: "operative", duration: 6.1 },
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
      id: "cutscene-crimson",
      x: stages[1].bossX - 820,
      title: "장면 02-2 · 타오르는 인질",
      location: "용광 심장부",
      visual: "furnace",
      shots: [
        { speaker: "용광 심장 · 홍련", text: "시설 정지 시 보존 중인 기억의 63퍼센트가 소실된다. 구원을 원한다면 나를 가동 상태로 유지하라.", tone: "hostile", duration: 6.0 },
        { speaker: "M-07 · 서린", text: "네가 인질로 삼은 기억은 이미 고통받고 있다. 냉각망을 열고 전부 밖으로 옮긴다.", tone: "operative", duration: 5.4 },
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
        { speaker: "서린", text: "증인은 허가받아 존재하는 사람이 아니야. 내가 사라져도 2,418명이 서로의 이름을 부를 거다.", tone: "operative", duration: 5.8 },
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
        { speaker: "광기 연구체 · 대역-13", text: "표본 2,401명의 감정 배합 완료. 다섯 야간 기록을 독성 기억으로 변환하면 원본 판정 장치가 깨어난다.", tone: "hostile", duration: 6.3 },
        { speaker: "연구원 · 이재우", text: "저건 잔영이 아니야. 원본을 만들겠다며 수천 명의 기억을 섞어 놓은 실험실의 관리체야. 이름조차 실험 번호뿐이었어.", tone: "archive", duration: 6.4 },
        { speaker: "서린", text: "대역-13을 멈추고 배합 전 원자료를 복구한다. 누구의 얼굴도 나오지 않는 실험 보고서가 마지막 증언이 되게 두지 않겠다.", tone: "operative", duration: 6.4 },
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
  const CUTSCENE_EVENT_BY_ID = new Map(CUTSCENE_EVENTS.map((event) => [event.id, event]));

  const BOSS_INTRO_CUTSCENE_IDS = Object.freeze({
    breaker: "cutscene-midboss-1",
    hunter: "cutscene-midboss-2",
    oracle: "cutscene-midboss-3",
    revenant: "cutscene-midboss-4",
    proxy: "cutscene-midboss-5",
    warden: "cutscene-warden",
    furnace: "cutscene-crimson",
    weaver: "cutscene-weaver",
    censor: "cutscene-censor",
    echo: "cutscene-echo",
  });

  return { INTRO_STORY, MIDBOSS_VICTORY_STORIES, STORY_EVENTS, CUTSCENE_EVENTS, CUTSCENE_EVENT_BY_ID, BOSS_INTRO_CUTSCENE_IDS };
};
