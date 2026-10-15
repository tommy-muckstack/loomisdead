"use client";
// Generic parity auth screen (login + signup) — original art, original wording where brand specific.
// Copy into an app's components/ dir with auth-screen.css imported from globals.css.
import { useState } from "react";
import Link from "next/link";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { Logo } from "@/components/Logo";

export type Provider = { id: string; label: string; signupLabel?: string; primary?: boolean };
export type AuthCfg = {
  layout: "center" | "splitL" | "splitR";
  bg?: string;                  // page background (css)
  card?: boolean;               // wrap form in a card
  title: string; signupTitle?: string; sub?: string; signupSub?: string;
  providers: Provider[];
  emailLabel?: string; emailFirst?: boolean; passwordInline?: boolean;
  cta?: string; ctaNext?: string; signupCta?: string;
  accent: string; ctaBg?: string; ctaFg?: string; radius?: number; ink?: string; muted?: string; font?: string;
  top?: { logo?: boolean; right?: string; rightHref?: string; cta?: string; dark?: boolean };
  art?: { kind: "dark" | "color" | "none"; title?: string; sub?: string; bg?: string; fg?: string; blocks?: string[] };
  providersAfter?: boolean; emailButton?: string; forgotInline?: boolean; remember?: boolean; altButton?: string;
  logoSize?: number; logoCenter?: boolean; footerNote?: string;
  switchText?: [string, string]; signupSwitchText?: [string, string];
};
const GG = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.2a5.3 5.3 0 01-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.4z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0012 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 010-4.4v-3H1.8a11.5 11.5 0 000 10.4z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 001.8 6.8l3.8 3A6.9 6.9 0 0112 5.4z" /></svg>;
const badge = (t: string, c: string) => <span className="au-badge" style={{ background: c }}>{t}</span>;
const ICON: Record<string, React.ReactNode> = {
  google: GG, microsoft: badge("▦", "#5e6ad2"), apple: badge("●", "#222"), slack: badge("#", "#7c4dff"), outlook: badge("O", "#2b79d6"),
  facebook: badge("f", "#1877f2"), sso: badge("◎", "#6b7280"), saml: badge("◎", "#6b7280"), github: badge("◆", "#24292f"), passkey: badge("⚿", "#6b7280"),
};
export function AuthScreen({ config, demo, to, signup = false, cfg }: { config: FirebaseClientConfig | null; demo: boolean; to: string; signup?: boolean; cfg: AuthCfg }) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(signup ? "signup" : "signin");
  const [step, setStep] = useState<1 | 2>(1); const [showEmail, setShowEmail] = useState(!cfg.emailButton);
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState("");
  const session = `${BP}/api/session`;
  const off = "Not available yet in the open-source version";
  const run = async (f: () => Promise<void>) => { setBusy(true); setErr(""); setNote(""); try { await f(); } catch (e) { setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const needPw = mode !== "reset" && (cfg.passwordInline || step === 2 || !cfg.emailFirst);
  const submit = (e: React.FormEvent) => { e.preventDefault();
    if (!config) { setErr("Sign-in isn't configured on this deployment yet."); return; }
    if (mode === "reset") return run(async () => { await resetPassword(config, email); setNote("If that email has an account, a reset link is on its way."); setMode("signin"); setStep(1); });
    if (!needPw) { setStep(2); return; }
    run(async () => { if (mode === "signup") await signUpWithEmail(config, session, email, password); else await signInWithEmail(config, session, email, password); window.location.assign(to); }); };
  const swap = (m: typeof mode) => (e: React.MouseEvent) => { e.preventDefault(); setMode(m); setStep(1); setErr(""); setNote(""); };
  const T = mode === "signup" ? (cfg.signupTitle ?? cfg.title) : mode === "reset" ? "Reset your password" : cfg.title;
  const S = mode === "signup" ? (cfg.signupSub ?? cfg.sub) : mode === "reset" ? "Enter your email and we'll send you a reset link." : cfg.sub;
  const ctaLabel = mode === "reset" ? "Email me a reset link" : mode === "signup" ? (needPw ? (cfg.signupCta ?? "Create account") : (cfg.ctaNext ?? cfg.cta ?? "Continue")) : needPw ? (cfg.cta ?? "Log in") : (cfg.ctaNext ?? "Continue");
  const sw = mode === "signup" ? (cfg.signupSwitchText ?? ["Already have an account?", "Log in"]) : (cfg.switchText ?? ["Don't have an account?", "Sign up"]);
  const style = { "--au-accent": cfg.accent, "--au-cta": cfg.ctaBg ?? cfg.accent, "--au-ctafg": cfg.ctaFg ?? "#fff", "--au-r": `${cfg.radius ?? 6}px`, "--au-ink": cfg.ink ?? "#1a1a1a", "--au-muted": cfg.muted ?? "#6b6b6b", "--au-bg": cfg.bg ?? "#fff", fontFamily: cfg.font } as React.CSSProperties;
  const art = cfg.art && cfg.art.kind !== "none" ? cfg.art : null;
  const provs = mode !== "reset" && (showEmail || cfg.providersAfter || cfg.emailButton) ? cfg.providers.map(p => { const real = p.id === "google"; return <button key={p.id} type="button" className={`au-prov${p.primary ? " primary" : ""}`} disabled={real ? busy || !config : true} title={real ? undefined : off} onClick={real ? () => run(async () => { await signInWithGoogle(config!, session); window.location.assign(to); }) : undefined}>{ICON[p.id]}<span>{mode === "signup" ? (p.signupLabel ?? p.label) : p.label}</span></button>; }) : null;
  const form = <div className={`au-form${cfg.card ? " au-card" : ""}`}>
    {cfg.logoCenter && <div className="au-logoc"><Logo size={cfg.logoSize ?? 28} /></div>}
    <h1>{T}</h1>{S && <p className="au-sub">{S}</p>}
    {!config && <p role="status" className="au-note">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
    {!cfg.providersAfter && provs}
    {!cfg.providersAfter && mode !== "reset" && cfg.providers.length > 0 && showEmail && <div className="au-or"><span>OR</span></div>}
    {cfg.emailButton && !showEmail && mode !== "reset" ? <button type="button" className="au-prov" onClick={() => setShowEmail(true)}>{cfg.emailButton}</button> : <form onSubmit={submit}>
      <label htmlFor="au-email">{cfg.emailLabel ?? "Email"}</label>
      <input id="au-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} readOnly={needPw && !cfg.passwordInline} />
      {needPw && <><label htmlFor="au-pass">Password{cfg.forgotInline && mode === "signin" && <a href="#" className="au-fgt" onClick={swap("reset")}>Forgot your password?</a>}</label><input id="au-pass" type="password" required minLength={6} autoFocus={!cfg.passwordInline} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></>}
      {cfg.remember && needPw && <label className="au-rem"><input type="checkbox" /> Remember me</label>}
      {cfg.altButton ? <div className="au-two"><button type="button" className="au-alt" onClick={swap(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "I have an account" : cfg.altButton}</button><button className="au-cta" disabled={busy}>{ctaLabel}</button></div> : <button className="au-cta" disabled={busy}>{ctaLabel}</button>}
    </form>}
    {cfg.providersAfter && mode !== "reset" && cfg.providers.length > 0 && <div className="au-or"><span>OR</span></div>}
    {cfg.providersAfter && provs}
    {mode === "signin" && !cfg.forgotInline && <div className="au-links"><a href="#" onClick={swap("reset")}>Forgot password?</a></div>}
    {err && <p role="alert" className="au-err">{err}</p>}{note && <p role="status" className="au-note">{note}</p>}
    {demo && <button type="button" className="au-demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
    <p className="au-switch">{mode === "reset" ? <a href="#" onClick={swap("signin")}>Back to log in</a> : <>{sw[0]} <a href="#" onClick={swap(mode === "signup" ? "signin" : "signup")}>{sw[1]}</a></>}</p>
    {cfg.footerNote && <p className="au-legal">{cfg.footerNote}</p>}
  </div>;
  const artEl = art && <aside className={`au-art au-art--${art.kind}`} style={{ background: art.bg, color: art.fg }}><div>{art.title && <h2>{art.title}</h2>}{art.sub && <p>{art.sub}</p>}
    {art.blocks && <div className="au-blocks">{art.blocks.map((c, i) => <i key={i} style={{ background: c, height: 60 + (i * 37) % 90 }} />)}</div>}</div></aside>;
  return <main className={`au au--${cfg.layout}`} style={style}>
    {cfg.top && <header className={`au-top${cfg.top.dark ? " dark" : ""}`}>{cfg.top.logo !== false && !cfg.logoCenter ? <Link href="/" className="au-toplogo"><Logo size={22} /></Link> : <span />}<div>{cfg.top.right && <a href={cfg.top.rightHref ?? "#"}>{cfg.top.right}</a>}{cfg.top.cta && <Link className="au-topcta" href="/login?mode=signup">{cfg.top.cta}</Link>}</div></header>}
    <div className="au-body">{cfg.layout === "splitL" && artEl}<section className="au-main">{form}</section>{cfg.layout === "splitR" && artEl}</div>
  </main>;
}
