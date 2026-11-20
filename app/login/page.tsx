import Link from "next/link";
import { loginAction } from "@/app/actions";

export const metadata = { title: "Login" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="panel">
        <h1>
          Welcome <span style={{ color: "var(--gold-light)" }}>back</span>
        </h1>
        <p className="sub">Log in to your BTA member dashboard.</p>
        {sp.error && <div className="msg-banner msg-err">{sp.error}</div>}
        <form className="stack" action={loginAction}>
          <label className="field">
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className="field">
            Password
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <button className="btn-gold-lg btn-lg" type="submit">
            Login
          </button>
        </form>
        <p className="auth-links">
          New to BTA? <Link href="/register">Create a free account</Link>
        </p>
      </div>
    </div>
  );
}
