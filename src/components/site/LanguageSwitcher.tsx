"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { localeNames, locales, type Locale } from "@/i18n/routing";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function onChange(next: string) {
    startTransition(() => {
      router.replace(
        // Keep the current route, swap the locale segment.
        // @ts-expect-error — params are compatible with the current pathname
        { pathname, params },
        { locale: next as Locale },
      );
    });
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("languageLabel")}</span>
      <svg
        aria-hidden
        className="pointer-events-none absolute start-2.5 h-4 w-4 text-ink-soft"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.2 3.75-5.2 3.75-9S14.5 5.2 12 3m0 18c-2.5-2.2-3.75-5.2-3.75-9S9.5 5.2 12 3m-8.5 9h17"
        />
      </svg>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value)}
        disabled={isPending}
        className={`cursor-pointer appearance-none rounded-full border border-line bg-white py-1.5 pe-7 ps-8 text-sm font-medium text-ink transition hover:border-ink-soft focus:outline-2 focus:outline-accent ${
          compact ? "max-w-32 truncate" : ""
        }`}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute end-2.5 h-3.5 w-3.5 text-ink-soft"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </label>
  );
}
