import Link from "next/link";

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

const products = [
  {
    title: "BTA Sniper EA (MT4/MT5)",
    body: "Expert advisor with built-in equity protection, session filters and configurable risk per trade.",
    price: "$149",
  },
  {
    title: "Liquidity Zones Indicator",
    body: "Automatic order-block and liquidity-pool mapping so you stop guessing where price will react.",
    price: "$59",
  },
  {
    title: "Signal Membership",
    body: "Daily trade setups with entry, stop loss and take profit, delivered straight to your phone.",
    price: "$49/mo",
  },
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
          expert advisors and indicators.
        </p>
        <Link className="cta" href="/chat">
          Ask a Mentor — Free AI Chat
        </Link>
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
          {products.map((p) => (
            <div className="card" key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <span className="price">{p.price}</span>
            </div>
          ))}
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
              Our EAs and indicators are used on live accounts, not just
              backtests.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
