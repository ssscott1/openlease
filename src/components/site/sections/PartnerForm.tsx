"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type State = "idle" | "submitting" | "success" | "error";

export function PartnerForm() {
  const t = useTranslations("partners.form");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("submitting");
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          company: fd.get("company"),
          message: fd.get("message"),
          locale,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 p-8 text-center" role="status">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
          <svg aria-hidden className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </span>
        <h3 className="mt-4 text-xl font-semibold">{t("success.title")}</h3>
        <p className="mt-2 text-white/75">{t("success.body")}</p>
      </div>
    );
  }

  const inputClass =
    "rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-base text-white placeholder-white/40 focus:outline-2 focus:outline-accent";

  return (
    <form onSubmit={onSubmit} className="rounded-xl bg-white/5 p-6 sm:p-8">
      <h3 className="text-xl font-semibold">{t("title")}</h3>
      <p className="mt-1 text-sm text-white/70">{t("subtitle")}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("name")}
          <input name="name" required autoComplete="name" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("email")}
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("phone")}
          <input name="phone" type="tel" autoComplete="tel" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("company")}
          <input name="company" autoComplete="organization" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
          {t("message")}
          <textarea name="message" rows={3} className={inputClass} />
        </label>
      </div>
      {state === "error" && (
        <p role="alert" className="mt-4 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm text-red-300">
          {tc("error")}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="mt-6 w-full rounded-full bg-accent px-6 py-3 text-base font-semibold text-white transition hover:bg-accent-strong disabled:opacity-60 sm:w-auto"
      >
        {state === "submitting" ? tc("loading") : t("submit")}
      </button>
    </form>
  );
}
