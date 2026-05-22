import type { Metadata } from "next";
import { Merriweather, Fira_Sans } from "next/font/google";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
  display: "swap",
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SafeTrack — Drug Recall Alerts",
  description:
    "Know instantly if your medications have been recalled by the FDA. Add prescriptions to your medicine cabinet and receive email alerts when matching recalls are issued.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${merriweather.variable} ${firaSans.variable}`}>
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
