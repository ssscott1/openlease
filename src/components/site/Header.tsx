"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ANCHORS = [
  { key: "cars", href: "#cars" },
  { key: "included", href: "#included" },
  { key: "howItWorks", href: "#how-it-works" },
  { key: "partners", href: "#partners" },
  { key: "faq", href: "#faq" },
] as const;

export function Header({ customerLoginUrl }: { customerLoginUrl: string }) {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          onClick={() => setOpen(false)}
        >
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white"
          >
            O
          </span>
          {tc("brand")}
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          {NAV_ANCHORS.map(({ key, href }) => (
            <a
              key={key}
              href={href}
              className="text-sm font-medium text-ink-soft transition hover:text-ink"
            >
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <a
            href={customerLoginUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink transition hover:border-ink-soft"
          >
            {t("customerLogin")}
          </a>
          <a
            href="/admin/login"
            className="text-sm font-medium text-ink-soft transition hover:text-ink"
          >
            {t("adminLogin")}
          </a>
          <a
            href="#build"
            className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            {t("buildYourLease")}
          </a>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? t("menuClose") : t("menuOpen")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
          >
            <svg
              aria-hidden
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV_ANCHORS.map(({ key, href }) => (
              <a
                key={key}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-line py-3 text-base font-medium text-ink"
              >
                {t(`nav.${key}`)}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <a
              href="#build"
              onClick={() => setOpen(false)}
              className="rounded-full bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              {t("buildYourLease")}
            </a>
            <a
              href={customerLoginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-4 py-2.5 text-center text-sm font-medium"
            >
              {t("customerLogin")}
            </a>
            <a
              href="/admin/login"
              className="px-4 py-1 text-center text-sm font-medium text-ink-soft"
            >
              {t("adminLogin")}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
