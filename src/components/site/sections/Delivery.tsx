import { getTranslations } from "next-intl/server";

export async function Delivery() {
  const t = await getTranslations("delivery");

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{t("body")}</p>
          <ul className="mt-8 space-y-4">
            {[t("point1"), t("point2"), t("point3")].map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft">
                  <svg aria-hidden className="h-3.5 w-3.5 text-accent-strong" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                <span className="text-ink-soft">{point}</span>
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="relative hidden h-80 overflow-hidden rounded-3xl bg-accent-soft lg:block">
          <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full">
            <path d="M0 320 L640 320" stroke="#0e8a5f" strokeOpacity="0.25" strokeWidth="3" strokeDasharray="14 12" />
            <path d="M80 320 C 180 320 200 180 320 180 C 440 180 460 320 560 320" fill="none" stroke="#0e8a5f" strokeWidth="3" />
            <circle cx="80" cy="320" r="10" fill="#0e8a5f" />
            <circle cx="560" cy="320" r="10" fill="#0e8a5f" />
            <path d="M300 150 l20 -24 20 24 -8 0 0 22 -24 0 0 -22 z" fill="#0b6e4c" />
          </svg>
        </div>
      </div>
    </section>
  );
}
