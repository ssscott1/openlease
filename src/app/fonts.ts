import {
  Schibsted_Grotesk,
  Instrument_Sans,
  Spline_Sans_Mono,
} from "next/font/google";

// Brand guidelines v1.0: Schibsted Grotesk for display (headlines, prices,
// wordmark), Instrument Sans for all reading text, Spline Sans Mono for
// eyebrow labels and data — sparingly.
export const displayFont = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

export const bodyFont = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

export const monoFont = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
});
