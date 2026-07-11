import { getTranslations } from "next-intl/server";
import { OpenRing } from "@/components/Logo";
import { RotatingWord } from "./RotatingWord";

const ROTATION_ORDER = ["visa", "contract", "project", "relocation"] as const;

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
      {/* One ring per composition, cropped, very low contrast, gap right. */}
      <OpenRing
        className="pointer-events-none absolute -end-40 -top-48 h-[560px] w-[560px] text-accent opacity-[0.06]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24">
        <p className="animate-rise rounded-full bg-accent-soft px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-accent">
          {t("eyebrow")}
        </p>
        <h1
          aria-label={t("ariaTitle")}
          className="mt-6 max-w-4xl animate-rise text-4xl font-bold leading-tight tracking-tight [animation-delay:80ms] sm:text-6xl sm:leading-tight sm:tracking-[-0.03em]"
        >
          <span aria-hidden>
            {t.rich("titleTemplate", {
              word: () => (
                <RotatingWord
                  words={ROTATION_ORDER.map((key) => t(`words.${key}`))}
                />
              ),
            })}
          </span>
        </h1>
        <p className="mt-6 max-w-2xl animate-rise text-lg leading-relaxed text-ink-soft [animation-delay:160ms]">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex animate-rise flex-col items-center gap-3 [animation-delay:240ms] sm:flex-row">
          <a
            href="#build"
            className="rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white transition hover:bg-accent-strong"
          >
            {t("cta")}
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-ink px-7 py-3.5 text-base font-medium transition hover:bg-mist"
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
              <svg aria-hidden className="h-4 w-4 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
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
