const fs = require("node:fs");
const zlib = require("node:zlib");

const marker = "<!-- moonlit-echo-admin-publish-v1 -->";
const body = process.env.ADMIN_PUBLISH_ISSUE_BODY || "";
if (!body.includes(marker)) throw new Error("관리자 공개 게시 표식이 없습니다.");

const match = body.match(/```moonlit-admin-profile\s*\n([^\n]+)\n```/);
if (!match) throw new Error("관리자 공개 게시 데이터가 없습니다.");

const [encoding, encoded] = match[1].trim().split(":", 2);
if (!encoded || !["gzip", "raw"].includes(encoding)) throw new Error("지원하지 않는 게시 데이터 형식입니다.");
const packed = Buffer.from(encoded, "base64url");
const json = encoding === "gzip" ? zlib.gunzipSync(packed).toString("utf8") : packed.toString("utf8");
const profile = JSON.parse(json);

if (profile?.format !== "moonlit-echo-admin-profile" || profile.formatVersion !== 1) {
  throw new Error("월하잔향 관리자 편집 데이터가 아닙니다.");
}
const arrayFields = ["removedEnemies", "spawnedEnemies", "placedObjects", "removedObjects", "worldEdits"];
for (const field of arrayFields) {
  if (!Array.isArray(profile[field])) throw new Error(`손상된 편집 필드: ${field}`);
}
if (profile.removedEnemies.length > 4000 || profile.spawnedEnemies.length > 200 || profile.placedObjects.length > 200 || profile.removedObjects.length > 4000 || profile.worldEdits.length > 1200) {
  throw new Error("관리자 편집 데이터 제한을 초과했습니다.");
}

profile.published = true;
profile.revision = `github-${process.env.ADMIN_PUBLISH_ISSUE_NUMBER}-${Date.now().toString(36)}`;
profile.exportedAt = new Date().toISOString();
profile.gameVersion = fs.readFileSync("VERSION.txt", "utf8").trim();
fs.writeFileSync("published-admin-profile.json", `${JSON.stringify(profile, null, 2)}\n`);

const summary = {
  revision: profile.revision,
  removedEnemies: profile.removedEnemies.length,
  spawnedEnemies: profile.spawnedEnemies.length,
  placedObjects: profile.placedObjects.length,
  removedObjects: profile.removedObjects.length,
  worldEdits: profile.worldEdits.length,
};
fs.writeFileSync(process.env.ADMIN_PUBLISH_SUMMARY_FILE, JSON.stringify(summary));
console.log(summary);
