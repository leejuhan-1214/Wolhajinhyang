# 월하잔향 프로젝트 인수인계

## 현재 상태

- 버전: `1.7.0`
- 공개 사이트: https://leejuhan-1214.github.io/Wolhajinhyang/
- GitHub 저장소: https://github.com/leejuhan-1214/Wolhajinhyang
- 구성: HTML/CSS/JavaScript 기반 브라우저 게임

## 바로 실행하기

Node.js 20 이상에서 프로젝트 폴더를 열고 다음 명령을 실행합니다.

```powershell
npm start
```

그다음 브라우저에서 `http://127.0.0.1:4173/`을 엽니다. 별도의 패키지 설치는 필요하지 않습니다.

## 검사하기

```powershell
npm test
```

## 주요 파일

- `index.html`: 게임 화면 및 UI 구조
- `styles.css`: 화면, 모바일 조작계, 편집기 스타일
- `game.js`: 게임 로직, 스테이지, 적과 보스, 관리자 기능
- `server.mjs`: 로컬 정적 서버
- `.github/workflows/pages.yml`: GitHub Pages 배포 설정
- `README.md`: 기능 및 조작법 전체 설명
- `VERSION.txt`: 현재 버전

## 관리자 모드

첫 화면의 스테이지 카드를 `1 → 2 → 1 → 4` 순서로 클릭하면 관리자 모드가 활성화됩니다. 인증 진행 중간 문구는 표시되지 않으며, 성공했을 때만 활성화 상태가 표시됩니다.

관리자 모드에서는 첫 화면의 제목, 부제목, 스토리, 시작 버튼, 안내문, 각 스테이지 이름과 보스 이름을 수정해 브라우저 저장소에 보존할 수 있습니다.

## 배포

저장소의 `main` 브랜치 루트에 이 폴더의 파일을 올리면 GitHub Actions의 Pages 워크플로가 실행됩니다. 배포할 때 `.github`, `.nojekyll` 같은 숨김 파일도 함께 유지해야 합니다.

브라우저에 이전 버전이 남으면 배포 주소 뒤에 `?deploy=새커밋값`을 붙여 확인할 수 있습니다.
