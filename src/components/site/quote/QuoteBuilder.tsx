"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { formatAud } from "@/lib/format";
import { weeklyPrice, weeksInTerm } from "@/lib/pricing";
import type { PricingConfigRow, Vehicle } from "@/lib/types";

type SubmitState = "idle" | "submitting" | "success" | "error";

interface SubmittedQuote {
  vehicleName: string;
  termMonths: number;
  weeklyPrice: number;
}

const VISA_TYPE_KEYS = ["482", "485", "500", "400", "407", "408", "417", "600", "other"] as const;

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

  const [vehicleId, setVehicleId] = useState<string | null>(
    vehicles[0]?.id ?? null,
  );
  const [term, setTerm] = useState(12);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitted, setSubmitted] = useState<SubmittedQuote | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId) ?? null,
    [vehicles, vehicleId],
  );

  const weekly = vehicle
    ? weeklyPrice(Number(vehicle.base_weekly_rate), term, config.term_multipliers)
    : 0;
  const weeks = weeksInTerm(term);
  const total = weekly * weeks;
  const min = config.term_min_months;
  const max = config.term_max_months;
  const fillPct = ((term - min) / Math.max(1, max - min)) * 100;

  const includedItems = (config.included_items ?? []).map((key) => ({
    key,
    label: tIncluded.has(`items.${key}`) ? tIncluded(`items.${key}`) : key,
  }));

  function itemLabel(key: string) {
    return tIncluded.has(`items.${key}`) ? tIncluded(`items.${key}`) : key;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vehicle) {
      setFormError(t("form.errors.vehicleRequired"));
      return;
    }
    const fd = new FormData(e.currentTarget);
    setFormError(null);
    setSubmitState("submitting");
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
          visaType: fd.get("visaType"),
          visaExpiry: fd.get("visaExpiry") || undefined,
          locale,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setSubmitted({
        vehicleName: vehicle.name,
        termMonths: data.quote?.termMonths ?? term,
        weeklyPrice: data.quote?.weeklyPrice ?? weekly,
      });
      setSubmitState("success");
    } catch {
      setSubmitState("error");
      setFormError(t("form.errors.generic"));
    }
  }

  return (
    <section id="build" className="scroll-mt-20 bg-mist py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("sectionTitle")}
          </h2>
          <p className="mt-3 text-lg text-ink-soft">{t("sectionSubtitle")}</p>
        </div>

        {/* Step 1 — car slider */}
        <div className="mt-10" id="cars">
          <StepLabel label={t("step1.label")} title={t("step1.title")} />
          <div
            className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
            role="radiogroup"
            aria-label={t("step1.title")}
          >
            {vehicles.map((v) => {
              const selected = v.id === vehicleId;
              const fromPrice = weeklyPrice(
                Number(v.base_weekly_rate),
                max,
                config.term_multipliers,
              );
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setVehicleId(v.id)}
                  className={`group w-64 shrink-0 snap-start overflow-hidden rounded-2xl border-2 bg-white text-start transition-all sm:w-72 ${
                    selected
                      ? "border-accent shadow-lg shadow-accent/10"
                      : "border-transparent shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="relative aspect-[16/10] w-full bg-accent-soft">
                    {v.image_url && (
                      <Image
                        src={v.image_url}
                        alt={v.name}
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
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Step 2 — term slider */}
          <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <StepLabel label={t("step2.label")} title={t("step2.title")} />
            <p className="mt-2 text-sm text-ink-soft">
              {t("step2.hint", { min, max })}
            </p>
            <div className="mt-8 text-center">
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
              className="ol-range mt-8"
              style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
              aria-label={t("step2.sliderLabel")}
              aria-valuetext={t("step2.monthsLong", { count: term })}
            />
            <div className="mt-2 flex justify-between text-sm text-ink-soft">
              <span>{t("step2.monthsLong", { count: min })}</span>
              <span>{t("step2.monthsLong", { count: max })}</span>
            </div>
            <p className="mt-6 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-strong">
              {t("step2.delight", { months: term })}
            </p>
          </div>

          {/* Step 3 — live price */}
          <div className="rounded-2xl bg-ink p-6 text-white shadow-sm sm:p-8">
            <StepLabel label={t("step3.label")} title={t("step3.title")} dark />
            <div aria-live="polite" className="mt-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
                  {formatAud(weekly, locale)}
                </span>
                <span className="text-xl text-white/70">{tc("perWeek")}</span>
              </div>
              {vehicle && (
                <p className="mt-2 text-sm text-white/70">
                  {vehicle.name} · {t("step2.monthsLong", { count: term })}
                </p>
              )}
            </div>
            <div className="mt-6 border-t border-white/15 pt-5">
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
            </div>
            <dl className="mt-6 space-y-2 border-t border-white/15 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-white/70">{t("step3.term")}</dt>
                <dd className="font-medium">{t("step2.monthsLong", { count: term })}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/70">{t("step3.totalContract")}</dt>
                <dd className="font-medium tabular-nums">{formatAud(total, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/70">{t("step3.kmNote", { km: config.included_km_per_week })}</dt>
                <dd className="text-white/70">
                  {t("step3.excessNote", {
                    rate: formatAud(Number(config.excess_km_rate), locale, {
                      maximumFractionDigits: 2,
                    }),
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-xs leading-relaxed text-white/50">{disclaimer}</p>
          </div>
        </div>

        {/* Step 4 — capture */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          {submitState === "success" && submitted ? (
            <div className="animate-rise text-center" role="status">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
                <svg aria-hidden className="h-7 w-7 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </span>
              <h3 className="mt-4 text-2xl font-semibold">{t("form.success.title")}</h3>
              <p className="mx-auto mt-2 max-w-xl text-ink-soft">
                {t("form.success.body", {
                  vehicle: submitted.vehicleName,
                  months: submitted.termMonths,
                  price: formatAud(submitted.weeklyPrice, locale),
                })}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitState("idle");
                  setSubmitted(null);
                  formRef.current?.reset();
                }}
                className="mt-6 rounded-full border border-line px-5 py-2 text-sm font-medium transition hover:border-ink-soft"
              >
                {t("form.success.again")}
              </button>
            </div>
          ) : (
            <>
              <StepLabel label={t("step4.label")} title={t("form.title")} />
              <p className="mt-2 text-sm text-ink-soft">{t("form.subtitle")}</p>
              <form ref={formRef} onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t("form.name")} name="name" required autoComplete="name" />
                <Field label={t("form.email")} name="email" type="email" required autoComplete="email" />
                <Field label={t("form.phone")} name="phone" type="tel" required autoComplete="tel" />
                <Field label={t("form.employer")} name="employer" autoComplete="organization" />
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {t("form.visaType")}
                  <select
                    name="visaType"
                    className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-base font-normal focus:outline-2 focus:outline-accent"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      {t("form.visaTypePlaceholder")}
                    </option>
                    {VISA_TYPE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {t(`form.visaTypes.${key}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label={t("form.visaExpiry")} name="visaExpiry" type="date" />
                <div className="sm:col-span-2 lg:col-span-3">
                  {formError && (
                    <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                      {formError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitState === "submitting"}
                    className="w-full rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
                  >
                    {submitState === "submitting" ? t("form.submitting") : t("form.submit")}
                  </button>
                  <p className="mt-3 text-xs text-ink-soft">{t("form.privacyNote")}</p>
                </div>
              </form>
            </>
          )}
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
        className={`text-xs font-semibold uppercase tracking-widest ${
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
