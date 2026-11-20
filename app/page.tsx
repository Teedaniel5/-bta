import Link from "next/link";

const WHATSAPP_URL = "https://wa.me/263786612844";

const wa = (text: string) =>
  `https://wa.me/263786612844?text=${encodeURIComponent(text)}`;

const courses = [
  {
    title: "Forex Foundations",
    body: "Pairs, pips, lots, leverage and risk — everything a complete beginner needs before their first trade.",
  },
  {
    title: "Technical Mastery",
    body: "Price action, support and resistance, trend structures and confluence-based entries.",
  },
  {
    title: "Strategy & Psychology",
    body: "Backtesting a written plan, managing drawdown and building the discipline of a funded trader.",
  },
];

const indicatorTiers = [
  { label: "Monthly", price: "$50 / month" },
  { label: "Yearly", price: "$100 / year" },
  { label: "Lifetime", price: "$500 one-time" },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>
          Trade on Purpose with <span>Brilliant Trading Academy</span>
        </h1>
        <p>
          We teach everyday people to trade forex with a plan — structured
          courses, professional signal services and battle-tested tools like
          our premium indicators.
        </p>
        <a
          className="cta"
          href={wa("Hello Brilliant Trading Academy! I'm interested in getting started.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Started on WhatsApp
        </a>
        <p className="hero-alt">
          or <Link href="/chat">ask our AI mentor a question first</Link>
        </p>
      </section>

      <section className="block">
        <h2>Learn to Trade</h2>
        <div className="cards">
          {courses.map((c) => (
            <div className="card" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <h2>Signals &amp; Products</h2>
        <div className="cards">
          <div className="card">
            <h3>Mr Euaggelion Pro v1 Indicator</h3>
            <p>
              Our powerful premium indicator for MT4/MT5 that gives clear buy
              and sell signals, with trend filter and risk management built in.
            </p>
            <div className="tier-list">
              {indicatorTiers.map((t) => (
                <div className="tier" key={t.label}>
                  <span className="tier-info">
                    <strong>{t.label}</strong> · {t.price}
                  </span>
                  <a
                    className="btn"
                    href={wa(
                      `Hello Brilliant Trading Academy! I want the Mr Euaggelion Pro v1 Indicator — ${t.label} plan (${t.price}).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Buy on WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Signal Membership</h3>
            <p>
              Daily trade setups with entry, stop loss and take profit,
              delivered straight to your phone.
            </p>
            <div className="tier-list">
              <div className="tier">
                <span className="tier-info">
                  <strong>Monthly</strong> · $15 / month
                </span>
                <a
                  className="btn"
                  href={wa(
                    "Hello Brilliant Trading Academy! I want to join the Signal Membership ($15/month)."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Why Brilliant Trading Academy?</h2>
        <div className="cards">
          <div className="card">
            <h3>Mentor-Guided</h3>
            <p>
              Real traders review your charts, not pre-recorded videos you
              watch alone.
            </p>
          </div>
          <div className="card">
            <h3>Risk First</h3>
            <p>
              Every lesson and signal starts from position sizing and capital
              preservation.
            </p>
          </div>
          <div className="card">
            <h3>Tools That Work</h3>
            <p>
              Our indicators are used on live accounts, not just backtests.
            </p>
          </div>
        </div>
      </section>

      <section className="block">
        <h2>Contact Us</h2>
        <p className="contact-note">
          Ready to start? Chat with us directly on WhatsApp — we usually reply
          within hours. If the first line is busy, use the second number.
        </p>
        <div className="contact-list">
          <a
            className="btn"
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp: +263786612844
          </a>
          <a
            className="btn"
            href="https://wa.me/263774827123"
            target="_blank"
            rel="noopener noreferrer"
          >
            Second WhatsApp: +263774827123
          </a>
        </div>
      </section>
    </>
  );
}
