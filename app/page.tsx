import Link from "next/link";
import { q } from "@/lib/db";
import { getSetting } from "@/lib/db";

export const metadata = { title: "Home" };

export default async function Home() {
  const [products, freeSignals, courses] = await Promise.all([
    q(`SELECT * FROM products WHERE published = 1 ORDER BY created_at DESC LIMIT 6`),
    q(`SELECT * FROM signals WHERE tier = 'free' AND status != 'cancelled' ORDER BY created_at DESC LIMIT 3`),
    q(`SELECT * FROM courses WHERE published = 1 ORDER BY created_at DESC LIMIT 3`),
  ]);
  const wa = await getSetting("whatsapp_primary_link");

  const levels = [
    ["Free Member", "Free resources, community access and sample signals.", "/register"],
    ["Student", "Purchased courses, materials, progress tracking and certificates.", "/courses"],
    ["Signals Pro", "Premium signals with entry, SL, TP and a performance dashboard.", "/membership"],
    ["VIP Elite", "Everything in Signals Pro plus exclusive VIP analysis and mentorship.", "/vip"],
  ];

  const categories = [
    "Beginner Forex Trading",
    "Intermediate Forex Trading",
    "Advanced Technical Analysis",
    "Price Action Trading",
    "Market Structure",
    "Supply and Demand",
    "Trading Psychology & Risk",
    "Advanced Strategies",
    "MT4 & MT5 Training",
    "Algorithmic Trading & EAs",
  ];

  return (
    <>
      <section className="hero">
        <span className="eyebrow">Brilliant Trading Academy</span>
        <h1>
          <span className="gold">Treasures in Hidden Places.</span>
        </h1>
        <p className="tagline">Learn. Trade. Buy. Sell. Connect. Grow.</p>
        <p className="lead">
          A complete forex education and trading technology platform — structured courses, daily
          signals, premium indicators and a community of serious traders.
        </p>
        <div className="cta-row">
          <a className="btn-lg btn-gold-lg" href="/courses">
            Start Learning
          </a>
          <a className="btn-lg btn-outline-lg" href="/signals">
            Explore Signals
          </a>
          <a className="btn-lg btn-outline-lg" href={wa} target="_blank" rel="noopener noreferrer">
            Chat on WhatsApp
          </a>
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>
            Four Levels of <span>Membership</span>
          </h2>
          <p>Start free. Upgrade as you grow — every level is designed to double your skills.</p>
        </div>
        <div className="grid grid-4">
          {levels.map(([label, body, href]) => (
            <div className="card" key={label}>
              <span className="chip gold">{label}</span>
              <p style={{ margin: "0.8rem 0 1rem" }}>{body}</p>
              <Link className="btn outline sm" href={href}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section container" style={{ background: "var(--navy-900)" }}>
        <div className="section-head">
          <h2>
            Learn in the <span>BTA Academy</span>
          </h2>
          <p>From your first candlestick to algorithmic trading — ten course categories.</p>
        </div>
        <div className="grid grid-3">
          {categories.map((c) => (
            <div className="card" key={c}>
              <h3>{c}</h3>
            </div>
          ))}
        </div>
        <div className="section-head" style={{ marginTop: "1rem" }}>
          <a className="btn gold-lg btn-gold-lg" href="/courses">
            Explore Courses
          </a>
        </div>
        {courses.length > 0 && (
          <div className="grid grid-3" style={{ marginTop: "2.5rem" }}>
            {courses.map((course) => (
              <div className="card" key={String(course.id)}>
                <h3>{String(course.title)}</h3>
                <p>{String(course.description).slice(0, 140)}</p>
                <div className="price-row">
                  <span className="price">${String(course.price)}</span>
                  <Link className="btn sm" href={`/courses/${course.id}`}>
                    View course
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>
            BTA <span>Digital Store</span>
          </h2>
          <p>Indicators, ebooks, strategies, templates, journals and recorded training.</p>
        </div>
        <div className="grid grid-3">
          {products.map((p) => (
            <div className="card" key={String(p.id)}>
              <span className="chip">{String(p.category)}</span>
              <h3 style={{ marginTop: "0.6rem" }}>{String(p.title)}</h3>
              <p>{String(p.description).slice(0, 110)}</p>
              <div className="price-row">
                <span className="price">${String(p.price)}</span>
                <Link className="btn sm" href={`/store/${p.id}`}>
                  Buy now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <div className="section-head">
          <h2>
            Today&apos;s Free <span>Signals</span>
          </h2>
          <p>
            Sample of the free signals we publish. Premium Signals Pro members receive the full
            feed with every entry, stop loss and take profit.
          </p>
        </div>
        <div className="grid grid-3">
          {freeSignals.length === 0 && (
            <div className="card">
              <p>No sample signals published yet — check back soon.</p>
            </div>
          )}
          {freeSignals.map((s) => (
            <div className="card signal-card" key={String(s.id)}>
              <span className={`chip ${s.direction === "sell" ? "red" : "green"}`}>
                {String(s.direction).toUpperCase()}
              </span>
              <h3 style={{ marginTop: "0.6rem" }}>{String(s.instrument)}</h3>
              <div className="meta">
                <span>
                  Entry: <b>{String(s.entry)}</b>
                </span>
                <span>
                  SL: <b>{String(s.stop_loss)}</b>
                </span>
                <span>
                  Status: <b>{String(s.status)}</b>
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="section-head" style={{ marginTop: "1rem" }}>
          <Link className="btn-gold-lg btn-lg" href="/membership">
            Join Signals Pro
          </Link>
        </div>
      </section>

      <section className="section container">
        <div className="grid grid-3">
          <div className="card">
            <h3>Trading Signals</h3>
            <p>Daily forex and gold signals with entry, SL, TP and rationale.</p>
            <Link className="btn outline sm" href="/signals" style={{ marginTop: "1rem" }}>
              Open signals centre
            </Link>
          </div>
          <div className="card">
            <h3>VIP Elite Club</h3>
            <p>Exclusive analysis, live sessions, priority mentorship and resources.</p>
            <Link className="btn outline sm" href="/vip" style={{ marginTop: "1rem" }}>
              Become a VIP
            </Link>
          </div>
          <div className="card">
            <h3>Community</h3>
            <p>Discuss strategies, share charts and learn with thousands of traders.</p>
            <Link className="btn outline sm" href="/community" style={{ marginTop: "1rem" }}>
              Join the discussions
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
