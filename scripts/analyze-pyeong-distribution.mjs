/**
 * Phase 1 공급면적 기준 평형 분포 통계 + 비표준 단지 리스트
 * 실행: node scripts/analyze-pyeong-distribution.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal, requireEnv } from "./load-env.mjs";
import {
  resolveArea,
  dominantFromTransactions,
  getBandLabel,
} from "./lib/pyeong-map.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "validation", "pyeong-distribution.json");

loadEnvLocal();
requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET"]);

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET,
  { auth: { persistSession: false } }
);

const apts = [];
for (let from = 0; ; from += 1000) {
  const { data } = await sb
    .from("apartments")
    .select("id, name, sigungu_code, dong")
    .range(from, from + 999);
  if (!data?.length) break;
  apts.push(...data);
  if (data.length < 1000) break;
}

const labelCounts = new Map();
const bandCounts = new Map();
const nonStandard = [];
const aptById = new Map(apts.map((a) => [a.id, a]));

for (let i = 0; i < apts.length; i += 150) {
  const chunk = apts.slice(i, i + 150).map((a) => a.id);
  const { data: txs } = await sb
    .from("transactions")
    .select("apartment_id, exclu_use_ar")
    .eq("deal_type", "매매")
    .not("exclu_use_ar", "is", null)
    .in("apartment_id", chunk);

  const byApt = new Map();
  for (const t of txs || []) {
    if (!byApt.has(t.apartment_id)) byApt.set(t.apartment_id, []);
    byApt.get(t.apartment_id).push(t);
  }

  for (const [aid, rows] of byApt) {
    const dom = dominantFromTransactions(rows);
    if (!dom?.pyeong) continue;
    const apt = aptById.get(aid);
    const label = `${dom.pyeong}평`;
    labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
    bandCounts.set(dom.band, (bandCounts.get(dom.band) || 0) + 1);
    if (!dom.isStandard) {
      nonStandard.push({
        name: apt?.name,
        dong: apt?.dong,
        code: apt?.sigungu_code,
        excl: dom.exclSqm,
        pyeong: dom.pyeong,
      });
    }
  }
}

const withPyeong = [...labelCounts.values()].reduce((a, b) => a + b, 0);

const report = {
  generatedAt: new Date().toISOString(),
  totalApartments: apts.length,
  apartmentsWithDominantPyeong: withPyeong,
  labelDistribution: [...labelCounts.entries()]
    .map(([label, count]) => ({ label, count, rate: ((count / withPyeong) * 100).toFixed(1) + "%" }))
    .sort((a, b) => b.count - a.count),
  bandDistribution: [...bandCounts.entries()]
    .map(([band, count]) => ({
      band,
      label: getBandLabel(band),
      count,
      rate: ((count / withPyeong) * 100).toFixed(1) + "%",
    }))
    .sort((a, b) => b.count - a.count),
  nonStandardCount: nonStandard.length,
  nonStandardRate: withPyeong ? ((nonStandard.length / withPyeong) * 100).toFixed(2) + "%" : "0%",
  nonStandardSamples: nonStandard.slice(0, 30),
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
