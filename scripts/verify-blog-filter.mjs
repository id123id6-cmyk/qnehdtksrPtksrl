import { readFileSync } from "node:fs";

const html = readFileSync("blog/index.html", "utf8");
const cards = [...html.matchAll(/data-category="([^"]+)"/g)].map((m) => m[1]);
const valid = new Set(["side-project", "ai-tools", "side-income", "real-estate"]);
const invalid = [...new Set(cards.filter((c) => !valid.has(c)))];

const counts = {
  all: cards.length,
  "side-project": cards.filter((c) => c === "side-project").length,
  "ai-tools": cards.filter((c) => c === "ai-tools").length,
  "side-income": cards.filter((c) => c === "side-income").length,
  "real-estate": cards.filter((c) => c === "real-estate").length,
};

console.log(JSON.stringify({ invalid, counts }, null, 2));
