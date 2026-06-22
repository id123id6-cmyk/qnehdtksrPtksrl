import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GYEONGGI_DISTRICTS } from "./lib/gyeonggi-districts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const centroids = JSON.parse(
  readFileSync(path.join(__dirname, "../data/gyeonggi/centroids.json"), "utf8")
);

const entries = GYEONGGI_DISTRICTS.map((d) => {
  const cc = centroids[d.code] || { lat: d.lat, lng: d.lng };
  return `    "${d.code}": { name: "${d.name}", slug: "${d.slug}", lat: ${cc.lat}, lng: ${cc.lng}, zoom: 5, sido: "gyeonggi" }`;
});

const out = `  const GYEONGGI_DISTRICTS = {\n${entries.join(",\n")},\n  };\n`;
writeFileSync(path.join(__dirname, "../tools/realestate-map/js/_gyeonggi-districts-snippet.js"), out);
console.log("written", entries.length, "districts");
