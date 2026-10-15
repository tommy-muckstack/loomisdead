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
const SLACK = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#E01E5A" d="M5.04 15.16a2.53 2.53 0 11-2.52-2.52h2.52zm1.27 0a2.53 2.53 0 115.06 0v6.32a2.53 2.53 0 11-5.06 0z" /><path fill="#36C5F0" d="M8.84 5.04a2.53 2.53 0 112.53-2.52v2.52zm0 1.27a2.53 2.53 0 010 5.06H2.52a2.53 2.53 0 110-5.06z" /><path fill="#2EB67D" d="M18.96 8.84a2.53 2.53 0 112.52 2.53h-2.52zm-1.27 0a2.53 2.53 0 11-5.06 0V2.52a2.53 2.53 0 115.06 0z" /><path fill="#ECB22E" d="M15.16 18.96a2.53 2.53 0 11-2.53 2.52v-2.52zm0-1.27a2.53 2.53 0 010-5.06h6.32a2.53 2.53 0 110 5.06z" /></svg>;
const APPLE = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><path fill="#1d1d1f" d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.9zM14.1 5.7c.6-.8 1.1-1.9.9-3-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.8-1.3z" /></svg>;
const OUTLOOK = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><rect x="9" y="4" width="13" height="16" rx="1.5" fill="#28A8EA" /><path d="M9 8l6.500 4.500L22 8" fill="none" stroke="#fff" strokeWidth="1.2" /><rect x="2" y="6.500" width="11" height="11" rx="1.500" fill="#0364B8" /><ellipse cx="7.500" cy="12" rx="2.600" ry="3" fill="none" stroke="#fff" strokeWidth="1.700" /></svg>;
const SSO = <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9.500" fill="none" stroke="#1d1d1f" strokeWidth="1.800" /><circle cx="12" cy="10" r="3" fill="none" stroke="#1d1d1f" strokeWidth="1.800" /><path d="M6.500 18.500c1-2.500 3-3.800 5.500-3.800s4.500 1.300 5.500 3.800" fill="none" stroke="#1d1d1f" strokeWidth="1.800" /></svg>;
const badge = (t: string, c: string) => <span className="au-badge" style={{ background: c }}>{t}</span>;
const ICON: Record<string, React.ReactNode> = {
  google: GG, microsoft: badge("▦", "#5e6ad2"), apple: APPLE, slack: SLACK, outlook: OUTLOOK,
  facebook: badge("f", "#1877f2"), sso: SSO, saml: badge("◎", "#6b7280"), github: badge("◆", "#24292f"), passkey: badge("⚿", "#6b7280"),
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
  const provs = mode !== "reset" && (showEmail || cfg.providersAfter || cfg.emailButton) ? cfg.providers.map(p => { const real = p.id === "google"; return <button key={p.id} type="button" className={`au-prov p-${p.id}${p.primary ? " primary" : ""}`} disabled={real ? busy || !config : true} title={real ? undefined : off} onClick={real ? () => run(async () => { await signInWithGoogle(config!, session); window.location.assign(to); }) : undefined}>{ICON[p.id]}<span>{mode === "signup" ? (p.signupLabel ?? p.label) : p.label}</span></button>; }) : null;
  const loomSu = mode === "signup" && cfg.layout === "center" && cfg.emailLabel === "Work email";
  const switchEl = <p className="au-switch">{mode === "reset" ? <a href="#" onClick={swap("signin")}>Back to log in</a> : <>{sw[0]} <a href="#" onClick={swap(mode === "signup" ? "signin" : "signup")}>{sw[1]}</a></>}</p>;
  const form = <div className={`au-form${cfg.card ? " au-card" : ""}`}>
    {cfg.logoCenter && <div className="au-logoc"><Logo size={cfg.logoSize ?? 28} /></div>}
    <h1>{T}</h1>{S && <p className="au-sub">{S}</p>}
    {!config && <p role="status" className="au-note">Sign-in not configured. Email and Google sign-in turn on once Firebase is set up.</p>}
    {!cfg.providersAfter && provs}
    {!cfg.providersAfter && mode !== "reset" && cfg.providers.length > 0 && showEmail && <div className="au-or"><span>OR</span></div>}
    {cfg.emailButton && !showEmail && mode !== "reset" ? <button type="button" className="au-prov" onClick={() => setShowEmail(true)}>{cfg.emailButton}</button> : <form onSubmit={submit}>
      <label htmlFor="au-email">{cfg.emailLabel ?? "Email"}</label>
      <input id="au-email" type="email" required autoComplete="email" placeholder={cfg.emailLabel === "Work email" ? "name@company.com" : undefined} value={email} onChange={e => setEmail(e.target.value)} readOnly={needPw && !cfg.passwordInline} />
      {needPw && <><label htmlFor="au-pass">Password{cfg.forgotInline && mode === "signin" && <a href="#" className="au-fgt" onClick={swap("reset")}>Forgot your password?</a>}</label><input id="au-pass" type="password" required minLength={6} autoFocus={!cfg.passwordInline} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} /></>}
      {cfg.remember && needPw && <label className="au-rem"><input type="checkbox" /> Remember me</label>}
      {cfg.altButton ? <div className="au-two"><button type="button" className="au-alt" onClick={swap(mode === "signup" ? "signin" : "signup")}>{mode === "signup" ? "I have an account" : cfg.altButton}</button><button className="au-cta" disabled={busy}>{ctaLabel}</button></div> : <button className={`au-cta${!needPw && !email ? " is-idle" : ""}`} disabled={busy}>{ctaLabel}</button>}
    </form>}
    {cfg.providersAfter && mode !== "reset" && cfg.providers.length > 0 && <div className="au-or"><span>OR</span></div>}
    {cfg.providersAfter && provs}
    {mode === "signin" && !cfg.forgotInline && (needPw || !cfg.emailFirst) && <div className="au-links"><a href="#" onClick={swap("reset")}>Forgot password?</a></div>}
    {err && <p role="alert" className="au-err">{err}</p>}{note && <p role="status" className="au-note">{note}</p>}
    {demo && <button type="button" className="au-demo" onClick={async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (r.ok) window.location.assign(to); }}>Use the demo account</button>}
    {!loomSu && switchEl}
    {cfg.footerNote && <p className="au-legal">{cfg.footerNote}</p>}
  </div>;
  const quote = loomSu ? <>{switchEl}<p className="au-quote">“Two minutes of video beats a thirty-minute meeting. Record it once, share a link, move on.”</p></> : null;
  const artEl = art && <aside className={`au-art au-art--${art.kind}`} style={{ background: art.bg, color: art.fg }}><div>{art.title && <h2>{art.title}</h2>}{art.sub && <p>{art.sub}</p>}
    {art.blocks && <div className="au-blocks">{art.blocks.map((c, i) => <i key={i} style={{ background: c, height: 60 + (i * 37) % 90 }} />)}</div>}</div></aside>;
  return <main className={`au au--${cfg.layout}${mode === "signup" ? " au--su" : ""}`} style={style}>
    {cfg.top && <header className={`au-top${cfg.top.dark ? " dark" : ""}`}>{cfg.top.logo !== false && !cfg.logoCenter ? <Link href="/" className="au-toplogo"><Logo size={22} /></Link> : <span />}<div>{cfg.top.right && <a href={cfg.top.rightHref ?? "#"}>{cfg.top.right}</a>}{cfg.top.cta && <Link className="au-topcta" href="/login?mode=signup">{cfg.top.cta}</Link>}</div></header>}
    <div className="au-body">{cfg.layout === "splitL" && artEl}<section className="au-main">{form}{quote}</section>{cfg.layout === "splitR" && artEl}</div>
  </main>;
}
