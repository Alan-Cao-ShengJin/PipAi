import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], axes: ["opsz"], display: "swap", variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Pip — Investing workspace",
  description: "A local paper investing workspace. Explore your goals, approve a mandate, and inspect simulated decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={dmSans.variable}><body>{children}</body></html>;
}
