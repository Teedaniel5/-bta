import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brilliant Trading Academy",
  description:
    "Learn forex trading, get professional signals, and shop expert advisors and indicators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <span className="brand-mark">BTA</span>
            <span className="brand-name">Brilliant Trading Academy</span>
          </Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/chat">Ask a Mentor</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <p>
            Trading foreign exchange carries a high level of risk and may not be
            suitable for all investors. Past performance is not indicative of
            future results. Never trade with money you cannot afford to lose.
          </p>
          <p>© {new Date().getFullYear()} Brilliant Trading Academy</p>
        </footer>
      </body>
    </html>
  );
}
