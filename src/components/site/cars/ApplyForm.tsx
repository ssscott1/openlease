"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { formatAud } from "@/lib/format";
import { weeklyPrice, weeksInTerm } from "@/lib/pricing";
import type { PricingConfigRow, Vehicle } from "@/lib/types";
import {
  TimelinePicker,
  EMPTY_TIMELINE,
  monthsUntil,
  type TimelineValue,
} from "@/components/site/quote/TimelinePicker";

/**
 * The apply form on a car's detail page: say what sets your timeline, pick
 * a term (pre-set from the anchor date, live-priced by the shared pricing
 * engine), enter details, and submit through the controlled /api/quote path.
 */
export function ApplyForm({
  vehicle,
  config,
}: {
  vehicle: Vehicle;
  config: PricingConfigRow;
}) {
  const t = useTranslations("carPage");
  const tQuote = useTranslations("quote");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [term, setTerm] = useState(12);
  const [timeline, setTimeline] = useState<TimelineValue>(EMPTY_TIMELINE);
  const [anchorApplied, setAnchorApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const min = config.term_min_months;
  const max = config.term_max_months;
  const weekly = weeklyPrice(Number(vehicle.base_weekly_rate), term, config.term_multipliers);
  const total = weekly * weeksInTerm(term);
  const fillPct = ((term - min) / Math.max(1, max - min)) * 100;

  function onTimelineChange(next: TimelineValue) {
    setTimeline(next);
    setError(null);
    const preset = monthsUntil(next.anchorDate, min, max);
    if (preset !== null) {
      setTerm(preset);
      setAnchorApplied(true);
    } else {
      setAnchorApplied(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!timeline.useCase) {
      setError(tQuote("situation.required"));
      return;
    }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          termMonths: term,
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          employer: fd.get("employer"),
          useCase: timeline.useCase,
          termAnchorDate: timeline.anchorDate || undefined,
          useCaseDetail: timeline.detail || undefined,
          visaType: timeline.useCase === "visa" ? timeline.visaType : undefined,
          visaExpiry:
            timeline.useCase === "visa" ? timeline.anchorDate || undefined : undefined,
          locale,
          source: "car_page",
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      router.push("/thanks");
    } catch {
      setBusy(false);
      setError(tQuote("form.errors.generic"));
    }
  }

  const input =
    "rounded-xl border border-line bg-white px-3.5 py-2.5 text-base font-normal focus:outline-2 focus:outline-accent";

  return (
    <form onSubmit={onSubmit} className="mt-6">
      {/* Use case */}
      <p className="mb-3 text-sm font-semibold">{tQuote("situation.title")}</p>
      <TimelinePicker value={timeline} onChange={onTimelineChange} />

      {/* Term + live price */}
      <div className="mt-5 rounded-xl bg-mist p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            {tQuote("step2.monthsLong", { count: term })}
          </p>
          <p aria-live="polite" className="text-sm text-ink-soft">
            <span className="text-2xl font-bold tracking-tight text-ink">
              {formatAud(weekly, locale)}
            </span>
            {tc("perWeek")} · {tQuote("step3.totalContract")}{" "}
            <span className="font-semibold text-ink">{formatAud(total, locale)}</span>
          </p>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={term}
          onChange={(e) => setTerm(Number(e.target.value))}
          className="ol-range mt-4"
          style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
          aria-label={tQuote("step2.sliderLabel")}
          aria-valuetext={tQuote("step2.monthsLong", { count: term })}
        />
        <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
          <span>{tQuote("step2.monthsLong", { count: min })}</span>
          <span>{tQuote("step2.monthsLong", { count: max })}</span>
        </div>
        <p className="mt-3 text-xs font-medium text-accent-strong">
          {anchorApplied
            ? tQuote("situation.anchorApplied")
            : tQuote("step2.delight", { months: term })}
        </p>
      </div>

      {/* Details */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {tQuote("form.name")}
          <input name="name" required autoComplete="name" className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {tQuote("form.email")}
          <input name="email" type="email" required autoComplete="email" className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {tQuote("form.phone")}
          <input name="phone" type="tel" required autoComplete="tel" className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {tQuote("form.employer")}
          <input name="employer" autoComplete="organization" className={input} />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
      >
        {busy ? t("submitting") : t("submit")}
      </button>
      <p className="mt-3 text-xs text-ink-soft">{tQuote("form.privacyNote")}</p>
    </form>
  );
}
