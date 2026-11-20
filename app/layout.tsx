import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { membershipLevel } from "@/lib/access";
import { logoutAction } from "./actions";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: {
    default: "Brilliant Trading Academy — Treasures in Hidden Places",
    template: "%s | Brilliant Trading Academy",
  },
  description:
    "Brilliant Trading Academy (BTA) — premium forex education, trading signals, expert tools and a VIP trading community. Treasures in Hidden Places.",
  openGraph: {
    title: "Brilliant Trading Academy",
    description:
      "Premium forex education, trading signals, digital tools and a VIP trading community.",
    images: ["/logo.jpg"],
    type: "website",
  },
  icons: { icon: "/logo.jpg" },
};

const NAV = [
  ["/", "Home"],
  ["/about", "About BTA"],
  ["/courses", "Courses"],
  ["/store", "Digital Store"],
  ["/signals", "Trading Signals"],
  ["/vip", "VIP Club"],
  ["/community", "Community"],
  ["/resources", "Free Resources"],
  ["/contact", "Contact"],
] as const;

const ALWAYS = new Set(["/", "/store", "/signals", "/community", "/contact"]);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  const level = user ? await membershipLevel(user) : null;

  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <Image src="/logo.jpg" alt="Brilliant Trading Academy logo" width={46} height={46} />
              <span>
                <span className="brand-name">Brilliant Trading Academy</span>
                <br />
                <span className="brand-tag">Treasures in Hidden Places</span>
              </span>
            </Link>
            <nav className="main-nav">
              {NAV.map(([href, label]) => (
                <a key={href} href={href} className={`nav-link ${ALWAYS.has(href) ? "always" : ""}`}>
                  {label}
                </a>
              ))}
              <span className="header-auth">
                {user ? (
                  <>
                    <Link className="btn-nav always" href="/dashboard">
                      Dashboard
                    </Link>
                    {isAdmin(user) && (
                      <Link className="btn-nav" href="/admin">
                        Admin
                      </Link>
                    )}
                    <form action={logoutAction}>
                      <button className="btn-nav" type="submit">
                        Logout
                      </button>
                    </form>
                    <Link className="btn-gold always" href="/membership">
                      Join BTA
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="btn-nav always" href="/login">
                      Login
                    </Link>
                    <Link className="btn-gold always" href="/register">
                      Join BTA
                    </Link>
                  </>
                )}
              </span>
            </nav>
          </div>
        </header>

        <main className="page">{children}</main>

        <footer className="site-footer">
          <div className="container footer-inner">
            <div className="footer-brand">
              <Image src="/logo.jpg" alt="BTA logo" width={54} height={54} />
              <strong style={{ display: "block", marginTop: "0.5rem", color: "var(--gold-light)" }}>
                Brilliant Trading Academy
              </strong>
              <p>Treasures in Hidden Places.</p>
            </div>
            <div>
              <h4>Learn</h4>
              <Link href="/courses">Courses</Link>
              <Link href="/resources">Free Resources</Link>
              <Link href="/chat">AI Mentor</Link>
              <Link href="/community">Community</Link>
            </div>
            <div>
              <h4>Trade</h4>
              <Link href="/store">Digital Store</Link>
              <Link href="/signals">Trading Signals</Link>
              <Link href="/vip">VIP Elite Club</Link>
              <Link href="/membership">Membership Plans</Link>
            </div>
            <div>
              <h4>Company</h4>
              <Link href="/about">About BTA</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </div>
          </div>
          <div className="footer-disclaimer">
            <p>
              Risk warning: Trading foreign exchange and CFDs carries a high level of risk and may
              not be suitable for all investors. Past performance is not indicative of future
              results. Content on this site is education, not financial advice. Never trade with
              money you cannot afford to lose.
            </p>
            <p>© {new Date().getFullYear()} Brilliant Trading Academy (BTA). All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
