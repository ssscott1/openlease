import { setRequestLocale, getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("hero");

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="rounded-full bg-accent-soft px-4 py-1 text-sm font-medium text-accent-strong">
        {t("eyebrow")}
      </p>
      <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
        {t("title")}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
        {t("subtitle")}
      </p>
      <a
        href="#build"
        className="mt-8 rounded-full bg-accent px-6 py-3 text-base font-semibold text-white transition hover:bg-accent-strong"
      >
        {t("cta")}
      </a>
    </section>
  );
}
