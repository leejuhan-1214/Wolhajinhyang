const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("bootstrap.js", "utf8");
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;

async function boot({ profile = "ok", failedScript, initializationFails = false } = {}) {
  const scripts = [];
  const root = { dataset: { gameBootstrap: "loading" } };
  const elements = new Map();
  let timeout;
  let reloads = 0;
  const document = {
    currentScript: { src: `http://localhost/bootstrap.js?v=${version}` },
    documentElement: root,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        hidden: id === "loading-retry", textContent: "", focused: false,
        classList: { remove() {} },
        addEventListener(type, callback) { this[type] = callback; },
        focus() { this.focused = true; },
      });
      return elements.get(id);
    },
    createElement: () => ({}),
    body: {
      appendChild(script) {
        scripts.push(script.src);
        queueMicrotask(() => {
          if (script.src.startsWith(failedScript || "!")) return script.onerror();
          if (script.src.startsWith("game.js") && !initializationFails) root.dataset.gameBootstrap = "ready";
          script.onload();
        });
      },
    },
  };
  const window = { location: { reload() { reloads += 1; } } };
  vm.runInNewContext(source, {
    document, window, URL, AbortController,
    console: { info() {}, error() {} },
    setTimeout(callback) { timeout = callback; return 1; },
    clearTimeout() { timeout = null; },
    fetch(url, { signal }) {
      assert.equal(url, `published-admin-profile.json?v=${version}`);
      if (profile === "offline") return Promise.reject(new Error("offline"));
      if (profile === "slow") return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
      return Promise.resolve({ ok: profile !== "missing", async json() {
        if (profile === "invalid") throw new SyntaxError("Invalid JSON");
        return { format: "moonlit-echo-admin-profile", revision: "qa" };
      } });
    },
  });
  if (profile === "slow") timeout();
  for (let step = 0; step < 8; step += 1) await new Promise(setImmediate);
  return { scripts, root, window, elements, timeout, reloads: () => reloads };
}

(async () => {
  for (const profile of ["ok", "offline", "missing", "invalid", "slow"]) {
    const result = await boot({ profile });
    assert.deepEqual(result.scripts, [`story-data.js?v=${version}`, `game.js?v=${version}`]);
    assert.equal(result.root.dataset.gameBootstrap, "ready", `${profile}: game must start`);
    assert.equal(result.elements.get("loading-screen").hidden, true);
    assert.equal(result.timeout, null, "profile timeout must be released");
    assert.equal(Boolean(result.window.__MOONLIT_ECHO_PUBLISHED_ADMIN_PROFILE__), profile === "ok");
  }
  for (const scenario of [{ failedScript: "story-data.js" }, { failedScript: "game.js" }, { initializationFails: true }]) {
    const result = await boot(scenario);
    const retry = result.elements.get("loading-retry");
    assert.equal(result.elements.get("loading-screen").hidden, false);
    assert.match(result.elements.get("loading-message").textContent, /다시 시도/);
    assert.equal(retry.hidden, false);
    assert.equal(retry.focused, true);
    retry.click();
    assert.equal(result.reloads(), 1);
    if (scenario.failedScript === "story-data.js") assert.equal(result.scripts.length, 1);
  }
  console.log("Bootstrap QA passed: dependency order, profile timeout/offline/invalid data, script and initialization errors, retry.");
})().catch(error => { console.error(error); process.exitCode = 1; });
