import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pip — Investing workspace",
  description: "A local paper investing workspace. Explore your goals, approve a mandate, and inspect simulated decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
