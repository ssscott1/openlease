import { getTranslations } from "next-intl/server";

const FAQ_KEYS = ["who", "included", "credit", "term", "km", "end", "apply"] as const;

export async function Faq({ includedKm }: { includedKm: number }) {
  const t = await getTranslations("faq");

  return (
    <section id="faq" className="scroll-mt-20 mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("title")}
      </h2>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {FAQ_KEYS.map((key) => (
          <details key={key} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start font-medium [&::-webkit-details-marker]:hidden">
              {t(`items.${key}.q`)}
              <svg
                aria-hidden
                className="h-5 w-5 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </summary>
            <p className="mt-3 leading-relaxed text-ink-soft">
              {t(`items.${key}.a`, { km: includedKm })}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
