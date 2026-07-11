import type { PricingConfigRow } from "./types";

/**
 * Shared pricing engine — the single source of truth used by the public
 * quoting tool, the lead-capture API and the CRM. Every input comes from
 * `pricing_config` in Supabase; nothing here is hard-coded.
 */

export const WEEKS_PER_MONTH = 52 / 12;

/**
 * Multiplier for a term, linearly interpolated between the configured
 * anchor points (e.g. {"9": 1.12, "12": 1.08, "18": 1.04, "24": 1.0}),
 * clamped at the ends. A 15-month term between 12 (×1.08) and 18 (×1.04)
 * resolves to ×1.06.
 */
export function termMultiplier(
  termMonths: number,
  multipliers: Record<string, number>,
): number {
  const points = Object.entries(multipliers)
    .map(([m, x]) => [Number(m), Number(x)] as const)
    .filter(([m, x]) => Number.isFinite(m) && Number.isFinite(x) && x > 0)
    .sort((a, b) => a[0] - b[0]);

  if (points.length === 0) return 1;
  if (termMonths <= points[0][0]) return points[0][1];

  const last = points[points.length - 1];
  if (termMonths >= last[0]) return last[1];

  for (let i = 0; i < points.length - 1; i++) {
    const [m0, x0] = points[i];
    const [m1, x1] = points[i + 1];
    if (termMonths >= m0 && termMonths <= m1) {
      if (m1 === m0) return x0;
      return x0 + ((termMonths - m0) / (m1 - m0)) * (x1 - x0);
    }
  }
  return last[1];
}

/** weekly_price = round(base_weekly_rate * term_multiplier(term_months)) */
export function weeklyPrice(
  baseWeeklyRate: number,
  termMonths: number,
  multipliers: Record<string, number>,
): number {
  return Math.round(baseWeeklyRate * termMultiplier(termMonths, multipliers));
}

export function weeksInTerm(termMonths: number): number {
  return Math.round(termMonths * WEEKS_PER_MONTH);
}

export function totalContractValue(
  weekly: number,
  termMonths: number,
): number {
  return weekly * weeksInTerm(termMonths);
}

export function clampTerm(
  termMonths: number,
  config: Pick<PricingConfigRow, "term_min_months" | "term_max_months">,
): number {
  return Math.min(
    config.term_max_months,
    Math.max(config.term_min_months, Math.round(termMonths)),
  );
}

export interface QuoteComputation {
  termMonths: number;
  weekly: number;
  weeks: number;
  total: number;
}

export function computeQuote(
  baseWeeklyRate: number,
  termMonths: number,
  config: PricingConfigRow,
): QuoteComputation {
  const term = clampTerm(termMonths, config);
  const weekly = weeklyPrice(baseWeeklyRate, term, config.term_multipliers);
  const weeks = weeksInTerm(term);
  return { termMonths: term, weekly, weeks, total: weekly * weeks };
}
