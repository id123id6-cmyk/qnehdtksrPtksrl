import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync("blog/index.html", "utf8");
const dom = new JSDOM(html, { runScripts: "outside-only" });
const doc = dom.window.document;
const cards = [...doc.querySelectorAll("#blog-grid .blog-card")];
const hideTimers = new Map();

function showCard(card) {
  const pending = hideTimers.get(card);
  if (pending) hideTimers.delete(card);
  card.classList.remove("hidden", "fade-out");
  card.classList.add("fade-in");
}

function hideCard(card) {
  hideTimers.delete(card);
  card.classList.remove("fade-in");
  card.classList.add("fade-out");
  card.classList.add("hidden");
}

function applyFilter(filter) {
  cards.forEach((card) => {
    const category = card.getAttribute("data-category");
    if (filter === "all" || category === filter) showCard(card);
    else hideCard(card);
  });
  return cards.filter((c) => !c.classList.contains("hidden")).length;
}

const filters = ["all", "side-project", "ai-tools", "side-income", "real-estate"];
const results = {};
for (const f of filters) {
  applyFilter(f);
  results[f] = cards.filter((c) => !c.classList.contains("hidden")).length;
}
console.log(JSON.stringify(results, null, 2));
