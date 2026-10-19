const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = name => fs.readFileSync(name, "utf8");
const version = JSON.parse(read("package.json")).version;
const html = read("index.html");
assert.equal(read("VERSION.txt").trim(), version);
assert(html.includes(`styles.css?v=${version}`));
assert(html.includes(`bootstrap.js?v=${version}`));
assert(html.includes(`VERSION ${version}`));
assert(read("game.js").includes(`const GAME_VERSION = "${version}";`));
for (const name of ["bootstrap.js", "story-data.js", "operative-renderer.js", "game.js", "pvp-simulation.js", "pvp-network.js", "pvp-app.js"]) new vm.Script(read(name), { filename: name });
for (const page of [html, read("pvp.html")]) {
  for (const asset of [...page.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)].map(match => match[1])) {
    if (!/^(https?:|#)/.test(asset)) assert(fs.existsSync(asset), `Missing release asset: ${asset}`);
  }
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "HTML IDs must remain unique");
}
assert(html.includes(`pvp.html?v=${version}`), "campaign must link to online duels");
for (const asset of ["pvp.css", "operative-renderer.js", "pvp-simulation.js", "pvp-network.js", "pvp-app.js"]) {
  assert(read("pvp.html").includes(`${asset}?v=${version}`), `PvP asset version: ${asset}`);
}
assert(!read("game.js").includes("function buildLegacyLevel"), "unused legacy campaign must not ship");
console.log(`Release QA passed: ${version}, versioned assets, JavaScript syntax, unique UI IDs.`);
