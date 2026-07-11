import { getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";

export async function Footer({
  customerLoginUrl,
  disclaimer,
  contactEmail,
  contactPhone,
}: {
  customerLoginUrl: string;
  disclaimer?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const t = await getTranslations("footer");
  const tHeader = await getTranslations("header");
  const tDisclaimer = await getTranslations("disclaimer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-mist">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="inline-block">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-soft">{t("tagline")}</p>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("linksTitle")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>
                <a href="#cars" className="hover:text-ink">
                  {tHeader("nav.cars")}
                </a>
              </li>
              <li>
                <a href="#included" className="hover:text-ink">
                  {tHeader("nav.included")}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-ink">
                  {tHeader("nav.howItWorks")}
                </a>
              </li>
              <li>
                <a href="#partners" className="hover:text-ink">
                  {tHeader("nav.partners")}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-ink">
                  {tHeader("nav.faq")}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("contactTitle")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className="hover:text-ink">
                    {contactEmail}
                  </a>
                </li>
              )}
              {contactPhone && (
                <li>
                  <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="hover:text-ink">
                    {contactPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">{t("loginTitle")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-soft">
              <li>
                <a
                  href={customerLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  {t("customerLogin")}
                </a>
              </li>
              <li>
                <NextLink href="/admin/login" className="hover:text-ink">
                  {t("adminLogin")}
                </NextLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-ink-soft">
            {disclaimer ?? tDisclaimer("text", { km: 380 })}
          </p>
          <p className="mt-4 text-xs text-ink-soft">
            {t("rights", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
