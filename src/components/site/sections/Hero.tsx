import { getTranslations } from "next-intl/server";

export async function Hero({
  termMin,
  termMax,
}: {
  termMin: number;
  termMax: number;
}) {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 start-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-accent-soft blur-3xl rtl:translate-x-1/2"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="animate-rise rounded-full border border-accent/20 bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent-strong">
          {t("eyebrow")}
        </p>
        <h1 className="mt-6 max-w-4xl animate-rise text-4xl font-semibold leading-tight tracking-tight [animation-delay:80ms] sm:text-6xl sm:leading-tight">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-ink-soft [animation-delay:160ms]">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex animate-rise flex-col items-center gap-3 [animation-delay:240ms] sm:flex-row">
          <a
            href="#build"
            className="rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-strong"
          >
            {t("cta")}
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-line px-7 py-3.5 text-base font-medium transition hover:border-ink-soft"
          >
            {t("secondaryCta")}
          </a>
        </div>
        <ul className="mt-12 flex animate-rise flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-soft [animation-delay:320ms]">
          {[
            t("badges.newCars"),
            t("badges.noCredit"),
            t("badges.anyTerm", { min: termMin, max: termMax }),
          ].map((badge) => (
            <li key={badge} className="flex items-center gap-2">
              <svg aria-hidden className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {badge}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
