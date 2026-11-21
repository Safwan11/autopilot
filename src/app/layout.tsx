import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "JobPilot — your AI job search agent", template: "%s · JobPilot" },
  description: "Upload your CV once. JobPilot searches LinkedIn, Bayt, GulfTalent, Wuzzuf and more, scores every role against your profile, writes cover letters and tracks your applications.",
};

export const viewport: Viewport = { themeColor: "#15171c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
