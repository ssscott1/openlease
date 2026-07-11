import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing, rtlLocales, type Locale } from "@/i18n/routing";
import { geistSans, geistMono } from "@/app/fonts";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { DEFAULT_CUSTOMER_LOGIN_URL, getSettings } from "@/lib/settings";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "OpenLease — A car for the term of your visa",
  description:
    "Brand-new cars for professionals on temporary Australian visas. Open lease terms from 9 to 24 months, one weekly price covering everything but fuel.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const dir = rtlLocales.includes(locale as Locale) ? "rtl" : "ltr";
  const settings = await getSettings([
    "customer_login_url",
    "contact_email",
    "contact_phone",
    "disclaimer_text",
  ]);
  const customerLoginUrl =
    settings.customer_login_url || DEFAULT_CUSTOMER_LOGIN_URL;

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <Header customerLoginUrl={customerLoginUrl} />
          <main className="flex-1">{children}</main>
          <Footer
            customerLoginUrl={customerLoginUrl}
            disclaimer={settings.disclaimer_text?.trim() || undefined}
            contactEmail={settings.contact_email}
            contactPhone={settings.contact_phone}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
