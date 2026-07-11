import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getActiveVehicles, getPricingConfig } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { Hero } from "@/components/site/sections/Hero";
import { CarMarquee } from "@/components/site/sections/CarMarquee";
import { Pillars } from "@/components/site/sections/Pillars";
import { Included } from "@/components/site/sections/Included";
import { Delivery } from "@/components/site/sections/Delivery";
import { HowItWorks } from "@/components/site/sections/HowItWorks";
import { Partners } from "@/components/site/sections/Partners";
import { Faq } from "@/components/site/sections/Faq";
import { QuoteBuilder } from "@/components/site/quote/QuoteBuilder";

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

  const [vehicles, config, disclaimerOverride, partnerFormFlag] =
    await Promise.all([
      getActiveVehicles().catch(() => []),
      getPricingConfig().catch(() => null),
      getSetting("disclaimer_text", ""),
      getSetting("feature_partner_form", "true"),
    ]);

  const tDisclaimer = await getTranslations("disclaimer");
  const includedKm = config?.included_km_per_week ?? 380;
  const disclaimer =
    disclaimerOverride.trim() || tDisclaimer("text", { km: includedKm });

  return (
    <>
      <Hero
        termMin={config?.term_min_months ?? 9}
        termMax={config?.term_max_months ?? 24}
      />
      {config && vehicles.length > 0 && (
        <CarMarquee vehicles={vehicles} config={config} />
      )}
      {config && vehicles.length > 0 && (
        <QuoteBuilder vehicles={vehicles} config={config} disclaimer={disclaimer} />
      )}
      <Pillars />
      <Included items={config?.included_items ?? []} />
      <Delivery />
      <HowItWorks />
      <Partners showForm={partnerFormFlag !== "false"} />
      <Faq includedKm={includedKm} />
    </>
  );
}
