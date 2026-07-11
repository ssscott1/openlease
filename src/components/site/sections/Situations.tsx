import { getTranslations } from "next-intl/server";

// Icons match the hero's rotating words, in the same order.
export const SITUATION_ICONS: Record<string, React.ReactNode> = {
  visa: (
    // passport / globe
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.2 3.75-5.2 3.75-9S14.5 5.2 12 3m0 18c-2.5-2.2-3.75-5.2-3.75-9S9.5 5.2 12 3m-8.5 9h17" />
  ),
  contract: (
    // signed document
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm-1.5 10.5 2.25 2.25 4.5-4.5" />
  ),
  project: (
    // helmet / wrench
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
  ),
  relocation: (
    // plane / arrival
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  ),
  bridging: (
    // clock
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  ),
};

const CARDS = ["visa", "contract", "project", "relocation"] as const;

export async function Situations({ showBridging }: { showBridging: boolean }) {
  const t = await getTranslations("situations");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-3 text-lg text-ink-soft">{t("subtitle")}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((key) => (
          <div key={key} className="rounded-xl border border-line p-5 transition hover:border-accent/40">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-strong">
              <svg aria-hidden className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                {SITUATION_ICONS[key]}
              </svg>
            </span>
            <h3 className="mt-4 font-semibold">{t(`${key}.title`)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(`${key}.body`)}</p>
          </div>
        ))}
      </div>
      {showBridging && (
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-mist p-4 sm:items-center">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-ink-soft">
            <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              {SITUATION_ICONS.bridging}
            </svg>
          </span>
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{t("bridging.title")}</span>{" "}
            — {t("bridging.body")}
          </p>
        </div>
      )}
    </section>
  );
}
