/**
 * Currency stays AUD in every locale (spec §6), but digit grouping follows
 * the visitor's locale.
 */
export function formatAud(
  amount: number,
  locale: string = "en-AU",
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "AUD",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

export function formatDate(
  date: string | Date,
  locale: string = "en-AU",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(date));
}
