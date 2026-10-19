(() => {
  "use strict";

  // Reuse the release query from index.html for every startup dependency.
  const releaseQuery = new URL(document.currentScript.src).search;
  const loadingScreen = document.getElementById("loading-screen");
  const loadingMessage = document.getElementById("loading-message");
  const retryButton = document.getElementById("loading-retry");

  function loadScript(file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = file + releaseQuery;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`${file} 로딩 실패`));
      document.body.appendChild(script);
    });
  }

  async function loadPublishedProfile() {
    const controller = new AbortController();
    // A slow optional profile must not hold the title screen indefinitely.
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch("published-admin-profile.json" + releaseQuery, {
        cache: "no-store", signal: controller.signal,
      });
      if (response.ok) window.__MOONLIT_ECHO_PUBLISHED_ADMIN_PROFILE__ = await response.json();
    } catch (error) {
      console.info("공개 월드 편집본 없이 기본 맵을 시작합니다.", error?.message || error);
    } finally {
      clearTimeout(timeout);
    }
  }

  retryButton.addEventListener("click", () => window.location.reload());

  async function start() {
    try {
      await Promise.all([loadPublishedProfile(), loadScript("story-data.js"), loadScript("operative-renderer.js")]);
      await loadScript("game.js");
      if (document.documentElement.dataset.gameBootstrap !== "ready") {
        throw new Error("게임 초기화 실패");
      }
      loadingScreen.hidden = true;
      loadingScreen.classList.remove("visible");
    } catch (error) {
      console.error("게임을 시작하지 못했습니다.", error);
      loadingMessage.textContent = "게임 파일을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.";
      retryButton.hidden = false;
      retryButton.focus();
    }
  }

  start();
})();
