import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const discsPath = join(scriptDirectory, "..", "assets", "discs.json");

const discs = JSON.parse(await readFile(discsPath, "utf8"));

if (!Array.isArray(discs)) {
  throw new TypeError(`${discsPath} must contain a JSON array`);
}

const seenIds = new Set();
const uniqueDiscs = [];
let duplicateCount = 0;

for (const disc of discs) {
  if (!disc || typeof disc.id !== "string" || disc.id.length === 0) {
    throw new TypeError("Every disc must have a non-empty string id");
  }

  if (seenIds.has(disc.id)) {
    duplicateCount += 1;
    continue;
  }

  seenIds.add(disc.id);
  uniqueDiscs.push(disc);
}

if (duplicateCount === 0) {
  console.log(`No duplicate disc ids found in ${discsPath}`);
  process.exit(0);
}

await writeFile(discsPath, JSON.stringify(uniqueDiscs));
console.log(
  `Removed ${duplicateCount} duplicate record${duplicateCount === 1 ? "" : "s"}; ` +
    `${uniqueDiscs.length} discs remain.`,
);
