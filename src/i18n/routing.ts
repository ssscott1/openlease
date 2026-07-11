import { defineRouting } from "next-intl/routing";

export const locales = ["en", "zh-CN", "zh-HK", "ar", "pa"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-HK": "繁體中文（香港）",
  ar: "العربية",
  pa: "ਪੰਜਾਬੀ",
};

export const rtlLocales: readonly Locale[] = ["ar"];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: {
    // Persist the visitor's choice across sessions (spec §6).
    maxAge: 60 * 60 * 24 * 365,
  },
});
