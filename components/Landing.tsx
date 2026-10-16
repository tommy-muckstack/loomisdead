import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BP } from "@/lib/basepath";
import { site } from "@/site.config";
import "@/app/landing.css";

// Layout mirrors the structure of loom.com's homepage (banner, pill nav, big rounded colour cards).
// Art is original: CSS-drawn illustrations, no brand assets copied.
// LoomIsDead is a native Mac app now: every call to action downloads the installer (/download).
const DL = `${BP}/download`;
const Arrow = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill="#E9F2FE" /><path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="#1868DB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Person = ({ tone = "#F2B8A0", cls = "" }: { tone?: string; cls?: string }) => <svg className={"lp-person " + cls} viewBox="0 0 100 100" aria-hidden><rect width="100" height="100" fill="#DDE6F5" /><circle cx="50" cy="40" r="18" fill={tone} /><path d="M14 100c2-26 18-36 36-36s34 10 36 36z" fill="#E98A7B" /></svg>;
const Download = ({ cls = "lp-btn lp-btn--blue lp-btn--lg", label = "Download for Mac" }: { cls?: string; label?: string }) => <a className={cls} href={DL}>{label}</a>;
const facts = [["Free", "Unlimited videos", "No plans", "No seats"], ["Open source", "Apache-2.0", "Fork it", "Ship it"], ["Native Mac app", "Signed + notarized", "Auto-updates", "No account"]];
const cases = [["Sales", "Personalize your pitch with a quick video instead of another wall of text.", "#E9FFC9", "#B7E36A"], ["Engineering", "Walk through a pull request or a bug with your screen and your voice.", "#F5E8FF", "#BF63F3"], ["Customer support", "Show the fix instead of describing it. Send the link, done.", "#E4EEFF", "#579DFF"], ["Design", "Give feedback on a design while pointing at the exact pixel.", "#FFF1C2", "#FFC700"]];
const feats = ["Screen, camera, or both", "Round camera bubble you can drag", "Microphone and countdown", "Pause and resume", "Share as a link in one click", "Timestamped comments for viewers", "Emoji reactions", "Your library stays on your Mac"];
// Plain <a> hrefs: "/cleanshotxisdead" etc. resolve against yourappisdead.com, outside this app's basePath.
const foot: [string, [string, string][]][] = [
  ["LoomIsDead", [["Download for Mac", DL], ["How it works", "#record"], ["Features", "#features"], ["Use cases", "#uses"]]],
  ["Open source", [["GitHub", site.repo], ["Apache-2.0 license", site.repo + "/blob/main/LICENSE"], ["Releases", site.repo + "/releases"], ["Report an issue", site.repo + "/issues"]]],
  ["More IsDead apps", [["All apps", "/"], ["CleanShotXIsDead", "/cleanshotxisdead"], ["GranolaIsDead", "/granolaisdead"], ["CalendlyIsDead", "/calendlyisdead"], ["WeTransferIsDead", "/wetransferisdead"]]],
];

export function Landing() {
  return <div className="lp">
    <header className="lp-hd">
      <div className="lp-banner"><a href={DL} style={{ color: "inherit" }}>NEW: LoomIsDead for Mac. Record your screen and camera, share a link in seconds. Free and open source. Download it now <Arrow /></a></div>
      <nav className="lp-nav">
        <Link href="/" className="lp-logo"><Logo size={34} /></Link>
        <div className="lp-links">
          <a href="#record">How it works</a><a href="#features">Features</a><a href="#uses">Use cases</a><a href={site.repo}>GitHub</a>
        </div>
        <div className="lp-navcta"><Download cls="lp-btn lp-btn--blue" /></div>
      </nav>
    </header>

    <section className="lp-hero">
      <h1>One video is worth a thousand words</h1>
      <p className="lp-lede">Record your screen and camera on your Mac, then share a link. Your team watches, reacts and comments without another meeting.</p>
      <div className="lp-row"><Download /><a className="lp-btn lp-btn--light lp-btn--lg" href={site.repo}>View on GitHub</a></div>
      <div className="lp-video"><div className="lp-video__scene"><i className="lp-win lp-win--a" /><i className="lp-win lp-win--b" /><Person cls="lp-video__me" /></div><span className="lp-play"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5.5v13l11-6.5z" fill="#fff" /></svg></span><span className="lp-speed">1x<br />1 min</span></div>
    </section>

    <section className="lp-trust">
      <h2>Everything you record, free forever. No plans, no seats, no paywalls.</h2>
      <Download />
      <div className="lp-logos">{facts.map((r, i) => <div className="lp-logos__row" key={i}>{r.map(w => <span key={w}>{w}</span>)}</div>)}</div>
    </section>

    <section className="lp-card lp-card--blue lp-mac" id="record">
      <div className="lp-mac__art"><Person cls="lp-mac__me" tone="#7A4A3A" /><div className="lp-mac__bar"><i /><i /><i /><b>Record</b></div></div>
      <div className="lp-mac__copy"><p className="lp-new">New!</p><h2>Meet LoomIsDead for Mac</h2><p>A small native app that lives in your menu bar. Pick screen, camera or both, choose a window or the full screen, and hit record. When you stop, the link is on your clipboard. Updates install themselves.</p><Download cls="lp-btn lp-btn--black lp-btn--lg" label="Download now" /></div>
    </section>

    <section className="lp-easiest"><h2>The easiest screen recorder you’ll ever use</h2><p>Record in a few clicks. Share anywhere. Collaborate better.</p></section>

    <section className="lp-fast">
      <div className="lp-fast__copy"><span className="lp-dot" /><h2 className="lp-h3">Lightning fast screen recording</h2><p>Record your screen and camera from the menu bar. A three-second countdown, then talk it through. Pause when you need a breath, and pick up where you left off.</p><Download cls="lp-btn lp-btn--blue" label="Start recording" /></div>
      <div className="lp-fast__art"><i className="lp-cal" /><i className="lp-cal lp-cal--2" /><i className="lp-cal lp-cal--3" /><div className="lp-circle"><Person /></div><div className="lp-pill"><b>0:14</b><i /><i /></div></div>
    </section>

    <h2 className="lp-more">So much more than a screen recorder</h2>
    <section className="lp-feat lp-feat--1"><div className="lp-feat__copy"><h3 className="lp-h3">A camera bubble that stays out of the way</h3><p>Your face in a round bubble you can drag anywhere and resize. It is recorded right along with your screen, so viewers see you and what you are pointing at.</p><a className="lp-more-link" href={DL}>Record now <Arrow /></a></div><div className="lp-feat__art lp-art-edit"><i /><i /><b>This plan is <u>what we like to call out</u></b></div></section>
    <section className="lp-feat lp-feat--2"><div className="lp-feat__art lp-art-share" /><div className="lp-feat__copy"><h3 className="lp-h3">Share a link anywhere you work</h3><p>Paste it into chat, email, a doc or a ticket. It opens in any browser on any device, and nobody has to sign in to watch.</p><a className="lp-more-link" href={DL}>Start sharing <Arrow /></a></div></section>
    <section className="lp-feat lp-feat--3"><div className="lp-feat__copy"><h3 className="lp-h3">Feedback pinned to the exact second</h3><p>Viewers drop emoji and comments stamped with the moment they refer to. Click a comment and the video jumps there, so “the button at 0:42” is never a mystery.</p><a className="lp-more-link" href={DL}>Connect over video <Arrow /></a></div><div className="lp-feat__art lp-art-code"><span /><span /><span /><span /><span /><span /><div className="lp-circle"><Person /></div></div></section>

    <section className="lp-card lp-card--black lp-safe"><h2>Your recordings stay yours</h2><p>Videos are saved on your Mac. Nothing leaves it until you choose to share a link, and the whole app is open source, so you can read exactly what it does.</p><a className="lp-btn lp-btn--blue lp-btn--lg" href={site.repo}>Read the code</a></section>

    <section className="lp-uses" id="uses"><h2>Video messaging for all use cases</h2>
      <div className="lp-uses__grid">{cases.map(([t, d, bg, fg]) => <article key={t} style={{ background: bg }}><div className="lp-uses__pic" style={{ background: `linear-gradient(135deg, ${fg}55, #fff8)` }}><Person cls="lp-uses__me" /></div><h3>{t}</h3><p>{d}</p></article>)}</div>
      <Download cls="lp-btn lp-btn--light" /></section>

    <section className="lp-feats" id="features"><h2>Powerful features for easy recordings</h2>
      <ul>{feats.map(f => <li key={f}><Check />{f}</li>)}</ul><a className="lp-underline" href={DL}>Download LoomIsDead for Mac</a></section>

    <section className="lp-card lp-card--blue lp-blog"><p className="lp-eyebrow">OPEN SOURCE</p><h2>Built in the open. Anyone can contribute.</h2>
      <div className="lp-blog__grid"><article><h3>Read it, fork it, change it</h3><p>LoomIsDead is Apache-2.0 licensed. The Mac app and this website live in one public repository, so you can see how recording, sharing and updates work, and send a fix when something bugs you.</p><a href={site.repo}>Browse the repository <Arrow /></a></article>
        <article><h3>Signed, notarized, auto-updating</h3><p>Every release is signed with a Developer ID and notarized by Apple. The app checks for updates on its own and installs them quietly.</p><a href={site.repo + "/releases"}>See the releases <Arrow /></a></article></div>
      <Download cls="lp-btn lp-btn--black lp-btn--lg" /></section>

    <aside className="lp-cta"><div className="lp-cta__box"><p>Stop scheduling. Start showing.</p><div><Download /><small>For macOS 15 or newer</small></div></div></aside>

    <footer className="lp-ft">
      <div className="lp-ft__cols">{foot.map(([h, ls]) => <div key={h}><h4>{h}</h4>{ls.map(([l, href]) => <a key={l} href={href}>{l}</a>)}</div>)}</div>
      <div className="lp-ft__bar"><div className="lp-social"><a href={site.repo}>GitHub</a><a href={site.repo + "/blob/main/LICENSE"}>Apache-2.0</a></div><div className="lp-ft__copy"><small>© 2026 LoomIsDead. {site.trademark} <a href={site.repo}>GitHub</a></small></div></div>
    </footer>
  </div>;
}
