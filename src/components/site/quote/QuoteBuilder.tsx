"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
} from "./TimelinePicker";

export function QuoteBuilder({
  vehicles,
  config,
  disclaimer,
}: {
  vehicles: Vehicle[];
  config: PricingConfigRow;
  disclaimer: string;
}) {
  const t = useTranslations("quote");
  const tc = useTranslations("common");
  const tIncluded = useTranslations("included");
  const locale = useLocale();
  const router = useRouter();

  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [term, setTerm] = useState(12);
  const [timeline, setTimeline] = useState<TimelineValue>(EMPTY_TIMELINE);
  const [anchorApplied, setAnchorApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  // Step 1 carousel: cars drift across (marquee over a duplicated row) until
  // one is chosen; hover pauses; reduced-motion users just get a scroll row.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || vehicleId) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let paused = false;
    const rtl = getComputedStyle(el).direction === "rtl";
    const onEnter = () => (paused = true);
    const onLeave = () => (paused = false);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("focusin", onEnter);
    el.addEventListener("focusout", onLeave);

    const step = () => {
      if (!paused) {
        const half = el.scrollWidth / 2;
        if (rtl) {
          el.scrollLeft -= 0.7;
          if (-el.scrollLeft >= half) el.scrollLeft += half;
        } else {
          el.scrollLeft += 0.7;
          if (el.scrollLeft >= half) el.scrollLeft -= half;
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("focusin", onEnter);
      el.removeEventListener("focusout", onLeave);
    };
  }, [vehicleId]);

  function selectVehicle(id: string, target: HTMLElement) {
    setVehicleId(id);
    setFormError(null);
    // Bring the chosen car to the centre of the row.
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  }

  const weekly = vehicle
    ? weeklyPrice(Number(vehicle.base_weekly_rate), term, config.term_multipliers)
    : null;
  const weeks = weeksInTerm(term);
  const total = weekly === null ? null : weekly * weeks;
  const min = config.term_min_months;
  const max = config.term_max_months;
  const fillPct = ((term - min) / Math.max(1, max - min)) * 100;

  const includedItems = (config.included_items ?? []).map((key) => ({
    key,
    label: tIncluded.has(`items.${key}`) ? tIncluded(`items.${key}`) : key,
  }));

  function onTimelineChange(next: TimelineValue) {
    setTimeline(next);
    setFormError(null);
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
    if (!vehicle) {
      setFormError(t("form.errors.vehicleRequired"));
      document.getElementById("cars")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!timeline.useCase) {
      setFormError(t("situation.required"));
      document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const fd = new FormData(e.currentTarget);
    setFormError(null);
    setBusy(true);
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
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      router.push("/thanks");
    } catch {
      setBusy(false);
      setFormError(t("form.errors.generic"));
    }
  }

  const renderCard = (v: Vehicle, dup: boolean) => {
    const selected = v.id === vehicleId;
    const dimmed = vehicleId !== null && !selected;
    const fromPrice = weeklyPrice(Number(v.base_weekly_rate), max, config.term_multipliers);
    return (
      <button
        key={`${v.id}${dup ? "-dup" : ""}`}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-hidden={dup || undefined}
        tabIndex={dup ? -1 : undefined}
        onClick={(e) => selectVehicle(v.id, e.currentTarget)}
        className={`group w-64 shrink-0 snap-start overflow-hidden rounded-xl border bg-white text-start transition-all duration-300 sm:w-72 ${
          selected
            ? "z-10 scale-[1.06] border-accent ring-1 ring-accent"
            : dimmed
              ? "border-line opacity-40 hover:opacity-80"
              : "border-line hover:border-ink-soft"
        }`}
      >
        <div className="relative aspect-[16/10] w-full bg-accent-soft">
          {v.image_url && (
            <Image
              src={v.image_url}
              alt={dup ? "" : v.name}
              fill
              sizes="(min-width: 640px) 18rem, 16rem"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              unoptimized={v.image_url.endsWith(".svg")}
            />
          )}
          {selected && (
            <span className="absolute end-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white">
              <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold">{v.name}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{v.descriptor}</p>
          <p className="mt-3 text-sm text-ink-soft">
            {tc("from")}{" "}
            <span className="text-lg font-semibold text-ink">
              {formatAud(fromPrice, locale)}
            </span>
            {tc("perWeek")}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {v.body_type} · {t("vehicleCard.seats", { count: v.seats })} · {v.fuel_economy}
          </p>
        </div>
      </button>
    );
  };

  return (
    <section id="build" className="scroll-mt-20 bg-mist py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("sectionTitle")}
          </h2>
          <p className="mt-3 text-lg text-ink-soft">{t("sectionSubtitle")}</p>
        </div>
      </div>

      {/* Step 1 — drifting car carousel; selection centres, enlarges, fades the rest */}
      <div className="mt-10" id="cars">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <StepLabel label={t("step1.label")} title={t("step1.title")} />
        </div>
        <div
          ref={scrollerRef}
          role="radiogroup"
          aria-label={t("step1.title")}
          className="no-scrollbar mt-4 flex gap-4 overflow-x-auto px-4 py-4 sm:px-6"
        >
          {vehicles.map((v) => renderCard(v, false))}
          {vehicles.map((v) => renderCard(v, true))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-8 space-y-8">
          {/* Step 2 — what's setting your timeline */}
          <div id="timeline" className="scroll-mt-20 rounded-xl border border-line bg-white p-6 sm:p-8">
            <StepLabel label={t("situation.label")} title={t("situation.title")} />
            <div className="mt-5">
              <TimelinePicker value={timeline} onChange={onTimelineChange} />
            </div>
          </div>

          {/* Step 3 — term slider */}
          <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
            <StepLabel label={t("step2.label")} title={t("step2.title")} />
            <p className="mt-2 text-sm text-ink-soft">
              {t("step2.hint", { min, max })}
            </p>
            <div className="mt-6 text-center">
              <span className="text-6xl font-semibold tabular-nums tracking-tight">
                {term}
              </span>
              <span className="ms-2 text-xl text-ink-soft">
                {t("step2.monthsShort")}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={1}
              value={term}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="ol-range mt-6"
              style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
              aria-label={t("step2.sliderLabel")}
              aria-valuetext={t("step2.monthsLong", { count: term })}
            />
            <div className="mt-2 flex justify-between text-sm text-ink-soft">
              <span>{t("step2.monthsLong", { count: min })}</span>
              <span>{t("step2.monthsLong", { count: max })}</span>
            </div>
            {anchorApplied && (
              <p className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-accent-strong">
                <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {t("situation.anchorApplied")}
              </p>
            )}
            <p className="mt-5 rounded-xl bg-accent-soft px-4 py-3 text-center text-sm font-medium text-accent-strong">
              {t("step2.delight", { months: term })}
            </p>
          </div>

          {/* Step 3 — live price */}
          <div className="rounded-xl bg-ink p-6 text-white sm:p-8">
            <StepLabel label={t("step3.label")} title={t("step3.title")} dark />
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              <div aria-live="polite">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
                    {weekly === null ? "—" : formatAud(weekly, locale)}
                  </span>
                  <span className="text-xl text-white/70">{tc("perWeek")}</span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {vehicle
                    ? `${vehicle.name} · ${t("step2.monthsLong", { count: term })}`
                    : t("form.errors.vehicleRequired")}
                </p>
                <dl className="mt-6 space-y-2 border-t border-white/15 pt-5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-white/70">{t("step3.term")}</dt>
                    <dd className="font-medium">{t("step2.monthsLong", { count: term })}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/70">{t("step3.totalContract")}</dt>
                    <dd className="font-medium tabular-nums">
                      {total === null ? "—" : formatAud(total, locale)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-1">
                    <dt className="text-white/70">
                      {t("step3.kmNote", { km: config.included_km_per_week })}
                    </dt>
                    <dd className="text-white/70">
                      {t("step3.excessNote", {
                        rate: formatAud(Number(config.excess_km_rate), locale, {
                          maximumFractionDigits: 2,
                        }),
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  {t("step3.allInclusive")}
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm text-white/80 sm:grid-cols-2">
                  {includedItems.map(({ key, label }) => (
                    <li key={key} className="flex items-center gap-2">
                      <svg aria-hidden className="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {label}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs leading-relaxed text-white/50">{disclaimer}</p>
              </div>
            </div>
          </div>

          {/* Step 4 — apply */}
          <div className="rounded-xl border border-line bg-white p-6 sm:p-8">
            <StepLabel label={t("step4.label")} title={t("form.title")} />
            <p className="mt-2 text-sm text-ink-soft">{t("form.subtitle")}</p>
            <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t("form.name")} name="name" required autoComplete="name" />
              <Field label={t("form.email")} name="email" type="email" required autoComplete="email" />
              <Field label={t("form.phone")} name="phone" type="tel" required autoComplete="tel" />
              <Field label={t("form.employer")} name="employer" autoComplete="organization" />
              <div className="sm:col-span-2 lg:col-span-3">
                {formError && (
                  <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {formError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
                >
                  {busy ? t("form.submitting") : t("form.submit")}
                </button>
                <p className="mt-3 text-xs text-ink-soft">{t("form.privacyNote")}</p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function StepLabel({
  label,
  title,
  dark = false,
}: {
  label: string;
  title: string;
  dark?: boolean;
}) {
  return (
    <div>
      <span
        className={`font-mono text-xs font-medium uppercase tracking-widest ${
          dark ? "text-accent" : "text-accent-strong"
        }`}
      >
        {label}
      </span>
      <h3 className={`mt-1 text-xl font-semibold ${dark ? "text-white" : ""}`}>
        {title}
      </h3>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {required && <span className="sr-only">(required)</span>}
      <input
        type={type}
        name={name}
        required={required}
        autoComplete={autoComplete}
        className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-base font-normal focus:outline-2 focus:outline-accent"
      />
    </label>
  );
}
