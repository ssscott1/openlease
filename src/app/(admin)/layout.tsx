import type { Metadata } from "next";
import { displayFont, bodyFont, monoFont } from "@/app/fonts";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "OpenLease CRM",
  description: "Staff CRM for OpenLease",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}
    >
      <body className="min-h-screen bg-mist">{children}</body>
    </html>
  );
}
