import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { LOGO_SMALL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Osmotix 30-Day Quest",
  description: "Complete quests on X and Telegram, earn campaign points, and climb the Osmotix leaderboard on Base.",
  icons: { icon: LOGO_SMALL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap">
            <p>
              Campaign points are not a promise of tokens or any financial return. Osmotix will never ask for your
              seed phrase or private key, and this site never asks you to connect a wallet.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}