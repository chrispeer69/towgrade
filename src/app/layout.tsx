import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import HeaderLinks from "./HeaderLinks";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-d",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-b",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-m",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TowGrade — The data that holds providers accountable",
  description:
    "Verified, anonymous reporting and intelligence platform for the U.S. roadside-assistance industry.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>
        <header className="topbar">
          <Link href="/" className="wordmark">
            Tow<em>Grade</em>
            <sup>™</sup>
          </Link>
          <HeaderLinks />
        </header>
        {children}
        <footer className="site-foot">
          <div className="site-foot-in">
            <div className="site-foot-mark">
              Tow<em>Grade</em>
              <sup>™</sup>
            </div>
            <div className="site-foot-tag">
              Verified · Anonymous · Editorial
            </div>
            <div className="site-foot-copy">
              © 2026 TowGrade. The data that holds providers accountable.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
