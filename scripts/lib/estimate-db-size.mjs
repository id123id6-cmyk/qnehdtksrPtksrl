/**
 * Supabase DB 용량 추정 (row 수 기반, Free 플랜 실측 보정)
 * ~516k rows ≈ 222MB → 약 450 bytes/row
 */
export const BYTES_PER_ROW = 450;
export const DEFAULT_MAX_MB = 480;

export function estimateMbFromRows(rows) {
  return Math.round(((rows * BYTES_PER_ROW) / 1024 / 1024) * 10) / 10;
}

export async function estimateDbMb(supabase) {
  const [{ count: apts }, { count: txs }] = await Promise.all([
    supabase.from("apartments").select("id", { count: "exact", head: true }),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);
  const rows = (apts || 0) + (txs || 0);
  return { rows, apts: apts || 0, txs: txs || 0, mb: estimateMbFromRows(rows) };
}
