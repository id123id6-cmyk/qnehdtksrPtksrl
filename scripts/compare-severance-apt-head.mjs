import { readFileSync } from "node:fs";

function extract(path) {
  const html = readFileSync(path, "utf8");
  const headLinks = [...html.matchAll(/<link[^>]+stylesheet[^>]*>/gi)].map((m) => m[0].trim());
  const bodyMatch = html.match(/<body[^>]*>/);
  const navMatch = html.match(/<nav class="theme-nav">[\s\S]*?<\/nav>/);
  return { headLinks, body: bodyMatch?.[0], nav: navMatch?.[0] };
}

const apt = extract("tools/apt-calculator/index.html");
const sev = extract("tools/severance-calculator/index.html");

console.log("=== HEAD CSS links (apt) ===");
apt.headLinks.forEach((l, i) => console.log(`${i + 1}. ${l}`));
console.log("\n=== HEAD CSS links (severance) ===");
sev.headLinks.forEach((l, i) => console.log(`${i + 1}. ${l}`));

console.log("\n=== BODY ===");
console.log("apt:", apt.body);
console.log("sev:", sev.body);
console.log("match:", apt.body === sev.body);

const normNav = (s) => s?.replace(/\s+/g, " ").trim();
console.log("\n=== NAV match ===", normNav(apt.nav) === normNav(sev.nav));

const linkDiff = {
  aptOnly: apt.headLinks.filter((l) => !sev.headLinks.includes(l)),
  sevOnly: sev.headLinks.filter((l) => !apt.headLinks.includes(l)),
};
console.log("\n=== CSS link diff ===");
console.log(JSON.stringify(linkDiff, null, 2));
