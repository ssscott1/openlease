import { getTranslations } from "next-intl/server";
import { PartnerForm } from "./PartnerForm";

export async function Partners({ showForm }: { showForm: boolean }) {
  const t = await getTranslations("partners");

  return (
    <section id="partners" className="scroll-mt-20 bg-ink py-16 text-white sm:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/75">{t("body")}</p>
          <ul className="mt-8 space-y-4">
            {[t("point1"), t("point2"), t("point3")].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20">
                  <svg aria-hidden className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                <span className="text-white/80">{point}</span>
              </li>
            ))}
          </ul>
        </div>
        {showForm && <PartnerForm />}
      </div>
    </section>
  );
}
