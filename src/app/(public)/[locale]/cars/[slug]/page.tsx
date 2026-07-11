import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getPricingConfig, getVehicleBySlug } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { weeklyPrice } from "@/lib/pricing";
import { formatAud } from "@/lib/format";
import { ApplyForm } from "@/components/site/cars/ApplyForm";

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [vehicle, config, disclaimerOverride] = await Promise.all([
    getVehicleBySlug(slug).catch(() => null),
    getPricingConfig().catch(() => null),
    getSetting("disclaimer_text", ""),
  ]);
  if (!vehicle || !config) notFound();

  const t = await getTranslations("carPage");
  const tc = await getTranslations("common");
  const tIncluded = await getTranslations("included");
  const tQuote = await getTranslations("quote");
  const tDisclaimer = await getTranslations("disclaimer");

  const fromPrice = weeklyPrice(
    Number(vehicle.base_weekly_rate),
    config.term_max_months,
    config.term_multipliers,
  );
  const disclaimer =
    disclaimerOverride.trim() ||
    tDisclaimer("text", { km: config.included_km_per_week });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/" className="text-sm font-medium text-ink-soft hover:text-ink">
        ← {t("back")}
      </Link>

      {/* Hero: image + headline facts */}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-accent-soft">
          {vehicle.image_url && (
            <Image
              src={vehicle.image_url}
              alt={vehicle.name}
              fill
              priority
              sizes="(min-width: 1024px) 36rem, 100vw"
              className="object-cover"
              unoptimized={vehicle.image_url.endsWith(".svg")}
            />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {vehicle.name}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{vehicle.descriptor}</p>
          <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            <span className="rounded-full bg-mist px-2.5 py-1">{vehicle.body_type}</span>
            <span className="rounded-full bg-mist px-2.5 py-1">
              {tQuote("vehicleCard.seats", { count: vehicle.seats })}
            </span>
            <span className="rounded-full bg-mist px-2.5 py-1">{vehicle.fuel_economy}</span>
          </div>
          <p className="mt-6 text-sm text-ink-soft">
            {tc("from")}{" "}
            <span className="text-4xl font-bold tracking-tight text-ink">
              {formatAud(fromPrice, locale)}
            </span>
            {tc("perWeek")}
          </p>

          <h2 className="mt-8 text-xl font-semibold">{t("about")}</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            {vehicle.long_description || vehicle.descriptor}
          </p>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-5">
        {/* Inclusions */}
        <section className="rounded-xl border border-line bg-mist p-6 sm:p-8 lg:col-span-2">
          <h2 className="text-xl font-semibold">{t("inclusions")}</h2>
          <ul className="mt-5 space-y-3">
            {(config.included_items ?? []).map((key) => (
              <li key={key} className="flex items-center gap-3 text-sm">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                  <svg aria-hidden className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                {tIncluded.has(`items.${key}`) ? tIncluded(`items.${key}`) : key}
              </li>
            ))}
            <li className="flex items-center gap-3 border-t border-line pt-3 text-sm text-ink-soft">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white">
                <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </span>
              {tIncluded("fuelExcluded")} — {tIncluded("fuelExcludedNote")}
            </li>
          </ul>
          <p className="mt-5 text-sm text-ink-soft">
            {tQuote("step3.kmNote", { km: config.included_km_per_week })} ·{" "}
            {tQuote("step3.excessNote", {
              rate: formatAud(Number(config.excess_km_rate), locale, {
                maximumFractionDigits: 2,
              }),
            })}
          </p>
          <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-soft">
            {disclaimer}
          </p>
        </section>

        {/* Apply */}
        <section id="apply" className="rounded-xl border border-line bg-white p-6 sm:p-8 lg:col-span-3">
          <h2 className="text-xl font-semibold">{t("applyTitle")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("applySubtitle")}</p>
          <ApplyForm vehicle={vehicle} config={config} />
        </section>
      </div>
    </div>
  );
}
