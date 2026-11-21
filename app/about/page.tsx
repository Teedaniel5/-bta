import Link from "next/link";
import Image from "next/image";
import { getSetting } from "@/lib/db";

export const metadata = { title: "About BTA" };

export default async function About() {
  const wa1 = await getSetting("whatsapp_primary_link");
  return (
    <div className="container">
      <h1 className="page-title">
        About <span>Brilliant Trading Academy</span>
      </h1>
      <p className="page-sub">
        Brilliant Trading Academy (BTA) is a forex education and trading technology company. Our
        identity: <em>Treasures in Hidden Places</em> — we find the opportunities most traders
        never see, and we teach our students to do the same.
      </p>
      <div className="panel" style={{ display: "flex", gap: "2rem", alignItems: "center", flexWrap: "wrap" }}>
        <Image src="/logo.jpg" alt="BTA logo" width={120} height={120} style={{ borderRadius: 14 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ color: "var(--gold-light)" }}>Our Mission</h2>
          <p>
            To raise disciplined, risk-first traders through structured education, honest signal
            services with verifiable performance, and professional trading technology.
          </p>
        </div>
      </div>
      <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <h3>Education First</h3>
          <p>
            A complete learning platform: beginner to advanced courses, price action, market
            structure, risk management, MT4/MT5 and algorithmic trading.
          </p>
        </div>
        <div className="card">
          <h3>Honest Signals</h3>
          <p>
            Every signal is archived and measured. Our performance dashboard is calculated from
            recorded outcomes — never fabricated, never promising profits.
          </p>
        </div>
        <div className="card">
          <h3>Real Tools</h3>
          <p>
            Premium indicators and expert advisors for MT4/MT5, journals, templates and recorded
            training built for live conditions.
          </p>
        </div>
      </div>
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>What We Stand For</h2>
        <div className="grid grid-2">
          <div>
            <p><b style={{ color: "var(--gold-light)" }}>Risk first.</b> Position sizing and capital preservation before profits.</p>
            <p style={{ marginTop: "0.6rem" }}><b style={{ color: "var(--gold-light)" }}>Transparency.</b> Stats come from real, archived signals you can audit.</p>
          </div>
          <div>
            <p><b style={{ color: "var(--gold-light)" }}>Community.</b> Traders grow faster together — learn, share and connect at BTA.</p>
            <p style={{ marginTop: "0.6rem" }}><b style={{ color: "var(--gold-light)" }}>Excellence.</b> A serious, international standard in everything we publish.</p>
          </div>
        </div>
      </div>
      <div className="panel" style={{ textAlign: "center" }}>
        <Link className="btn-gold-lg btn-lg" href="/register">
          Join BTA today
        </Link>
        <p className="hero-alt">
          or <a href={wa1} target="_blank" rel="noopener noreferrer">talk to us on WhatsApp</a>
        </p>
      </div>
    </div>
  );
}
