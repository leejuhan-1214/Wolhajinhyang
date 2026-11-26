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
for (const name of ["bootstrap.js", "story-data.js", "operative-renderer.js", "duel-ghost.js", "environment-renderer.js", "campaign-edit-compat.js", "game.js"]) new vm.Script(read(name), { filename: name });
for (const page of [html, read("pvp.html")]) {
  for (const asset of [...page.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)].map(match => match[1])) {
    if (!/^(https?:|#)/.test(asset)) assert(fs.existsSync(asset), `Missing release asset: ${asset}`);
  }
  const ids = [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, "HTML IDs must remain unique");
}
assert(!/pvp|온라인 1:1|2인용/.test(html), "campaign must not offer two-player mode");
assert(read("pvp.html").includes('http-equiv="refresh" content="0;url=./"'), "old duel links must return to the campaign");
assert(!/<script|<canvas|<form/.test(read("pvp.html")), "retired page must not run multiplayer code");
for (const asset of ["pvp.css", "pvp-simulation.js", "pvp-view.js", "pvp-network.js", "pvp-app.js"]) assert(!fs.existsSync(asset), `Retired multiplayer asset still ships: ${asset}`);
assert(!read("game.js").includes("function buildLegacyLevel"), "unused legacy campaign must not ship");
console.log(`Release QA passed: ${version}, versioned assets, JavaScript syntax, unique UI IDs.`);
