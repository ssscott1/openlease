import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("thanks");

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:py-32">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft">
        <svg aria-hidden className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink-soft">
        {t("body")}
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-accent px-7 py-3 text-base font-semibold text-white transition hover:bg-accent-strong"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
