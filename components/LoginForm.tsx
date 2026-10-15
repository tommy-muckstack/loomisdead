"use client";
import { useState } from "react";
import { Button, Input, Label, Divider } from "@isdead/design";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { GoogleButton } from "@/vendor/isdead-design/src/google";
type Props = { config: FirebaseClientConfig | null; demo: boolean; to: string };
export function LoginForm({ config, demo, to }: Props) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState("");
  const done = () => { window.location.assign(to); };
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); setNote(""); try { await f(); } catch (e) { setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const session = `${BP}/api/session`;
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")), password = String(fd.get("password") ?? ""), name = String(fd.get("name") ?? "");
    run(async () => {
      if (mode === "reset") { await resetPassword(config!, email); setNote("If that email has an account, a reset link is on its way."); setMode("signin"); return; }
      if (mode === "signup") await signUpWithEmail(config!, session, email, password, name || undefined); else await signInWithEmail(config!, session, email, password);
      done(); }); };
  const demoLogin = () => run(async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (!r.ok) throw new Error("Demo sign-in failed"); done(); });
  const link = (m: typeof mode, label: string) => <a href="#" onClick={e => { e.preventDefault(); setMode(m); }}>{label}</a>;
  return <>
    <h1 className="ids-h2">{mode === "signup" ? "Create your account" : mode === "reset" ? "Reset your password" : "Log in to your account"}</h1>
    {!config && <p className="ids-muted" role="status">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
    {config && <>
      <form onSubmit={onSubmit}>
        {mode === "signup" && <><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" /></>}
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        {mode !== "reset" && <><Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></>}
        <Button variant="primary" block disabled={busy} style={{ marginTop: 20 }}>{mode === "signup" ? "Create account" : mode === "reset" ? "Email me a reset link" : "Sign in"}</Button>
      </form>
      {mode !== "reset" && <><Divider label="or" />
        <GoogleButton block shape="pill" disabled={busy} onClick={() => run(async () => { await signInWithGoogle(config, session); done(); })} /></>}
      <p className="ids-muted" style={{ fontSize: 13, marginTop: 16 }}>{mode === "signin" ? <>{link("signup", "Create an account")} · {link("reset", "Forgot password?")}</> : link("signin", "Back to sign in")}</p></>}
    {err && <p role="alert" style={{ color: "var(--ids-color-danger)" }}>{err}</p>}
    {note && <p role="status" className="ids-muted">{note}</p>}
    {demo && <Button variant="outline" block disabled={busy} type="button" onClick={demoLogin} style={{ marginTop: 16 }}>Use the demo account</Button>}
  </>;
}
