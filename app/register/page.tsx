import Link from "next/link";
import { registerAction } from "@/app/actions";

export const metadata = { title: "Register" };

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="panel">
        <h1>
          Join <span style={{ color: "var(--gold-light)" }}>BTA</span>
        </h1>
        <p className="sub">
          Free members get community access, free resources and sample signals.
        </p>
        {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}
        <form className="stack" action={registerAction}>
          <label className="field">
            Full name
            <input name="name" required minLength={2} autoComplete="name" />
          </label>
          <label className="field">
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            WhatsApp number (optional)
            <input name="phone" type="tel" placeholder="+263..." autoComplete="tel" />
          </label>
          <label className="field">
            Password (min 8 characters)
            <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit">
            Create free account
          </button>
        </form>
        <p className="auth-links">
          Already a member? <Link href="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}
