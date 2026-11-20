import { getSetting } from "@/lib/db";
import { contactAction } from "@/app/actions";

export const metadata = { title: "Contact" };

export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const [wa1Name, wa2Name, wa1, wa2] = await Promise.all([
    getSetting("whatsapp_primary"),
    getSetting("whatsapp_secondary"),
    getSetting("whatsapp_primary_link"),
    getSetting("whatsapp_secondary_link"),
  ]);
  return (
    <div className="container">
      <h1 className="page-title">
        Contact <span>BTA</span>
      </h1>
      <p className="page-sub">
        Questions about courses, signals or products? Message us on WhatsApp or send the form
        below — we usually reply within hours.
      </p>

      {sp.sent && <div className="msg-banner msg-ok">Thank you! Your message was sent — we will reply soon.</div>}
      {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}

      <div className="grid grid-2">
        <div className="panel">
          <h2>WhatsApp</h2>
          <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            Fastest way to reach our team:
          </p>
          <div className="contact-list">
            <a className="btn green" href={wa1} target="_blank" rel="noopener noreferrer">
              WhatsApp: {wa1Name}
            </a>
            <a className="btn outline" href={wa2} target="_blank" rel="noopener noreferrer">
              Second line: {wa2Name}
            </a>
          </div>
        </div>
        <div className="panel">
          <h2>Send a message</h2>
          <form className="stack" action={contactAction}>
            <label className="field">
              Your name
              <input name="name" required minLength={2} />
            </label>
            <label className="field">
              Your email
              <input name="email" type="email" required />
            </label>
            <label className="field">
              Message
              <textarea name="body" rows={5} required minLength={5} />
            </label>
            <button className="btn-gold-lg btn-lg" type="submit">
              Send message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
