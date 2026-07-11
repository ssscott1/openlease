import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { formatAud } from "@/lib/format";
import { weeklyPrice } from "@/lib/pricing";
import type { PricingConfigRow, Vehicle } from "@/lib/types";

/**
 * Auto-scrolling "browse cars" marquee under the hero. The track holds two
 * copies of the card row (the second aria-hidden) and slides one copy per
 * loop, so it reads as an endless line of cars. Pauses on hover and focus;
 * falls back to a plain scrollable row for reduced-motion users.
 */
export async function CarMarquee({
  vehicles,
  config,
}: {
  vehicles: Vehicle[];
  config: PricingConfigRow;
}) {
  const t = await getTranslations("browse");
  const tc = await getTranslations("common");
  const tQuote = await getTranslations("quote");
  const locale = await getLocale();

  if (vehicles.length === 0) return null;

  const cards = vehicles.map((v) => ({
    vehicle: v,
    fromPrice: weeklyPrice(
      Number(v.base_weekly_rate),
      config.term_max_months,
      config.term_multipliers,
    ),
  }));

  const row = (hidden: boolean) =>
    cards.map(({ vehicle: v, fromPrice }) => (
      <a
        key={`${v.id}${hidden ? "-dup" : ""}`}
        href="#build"
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        className="group w-80 shrink-0 overflow-hidden rounded-xl border border-line bg-white transition-colors hover:border-accent sm:w-[23rem]"
      >
        <div className="relative aspect-[16/10] w-full bg-accent-soft">
          {v.image_url && (
            <Image
              src={v.image_url}
              alt={hidden ? "" : v.name}
              fill
              sizes="23rem"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              unoptimized={v.image_url.endsWith(".svg")}
            />
          )}
        </div>
        <div className="p-5">
          <h3 className="text-lg font-semibold tracking-tight">{v.name}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{v.descriptor}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <span className="rounded-full bg-mist px-2 py-0.5">{v.body_type}</span>
            <span className="rounded-full bg-mist px-2 py-0.5">
              {tQuote("vehicleCard.seats", { count: v.seats })}
            </span>
            <span className="rounded-full bg-mist px-2 py-0.5">{v.fuel_economy}</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <p className="text-sm text-ink-soft">
              {tc("from")}{" "}
              <span className="text-xl font-semibold text-ink">
                {formatAud(fromPrice, locale)}
              </span>
              {tc("perWeek")}
            </p>
            <span
              aria-hidden
              className="text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-accent rtl:rotate-180"
            >
              →
            </span>
          </div>
        </div>
      </a>
    ));

  return (
    <section aria-label={t("title")} className="border-y border-line bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h2>
            <p className="mt-2 text-lg text-ink-soft">{t("subtitle")}</p>
          </div>
          <a
            href="#build"
            className="text-sm font-medium text-accent hover:text-accent-strong"
          >
            {t("cta")}
          </a>
        </div>
      </div>
      <div className="marquee mt-8 overflow-hidden">
        <div className="marquee-track flex w-max gap-4 pe-4 ps-4">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
