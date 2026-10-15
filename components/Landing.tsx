import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BP } from "@/lib/basepath";
import "@/app/landing.css";

// Layout mirrors the structure of loom.com's homepage (banner, pill nav, big rounded colour cards).
// Art is original: CSS-drawn illustrations, no brand assets copied.
const Arrow = () => <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill="#E9F2FE" /><path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="#1868DB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Person = ({ tone = "#F2B8A0", cls = "" }: { tone?: string; cls?: string }) => <svg className={"lp-person " + cls} viewBox="0 0 100 100" aria-hidden><rect width="100" height="100" fill="#DDE6F5" /><circle cx="50" cy="40" r="18" fill={tone} /><path d="M14 100c2-26 18-36 36-36s34 10 36 36z" fill="#E98A7B" /></svg>;
const Caret = () => <svg width="8" height="5" viewBox="0 0 8 5" aria-hidden style={{ marginLeft: 6 }}><path d="M1 1l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;
const wordmarks = [["Northwind", "Lumen", "Postmark", "Launchbay", "Remote", "Ember"], ["Foundry", "Meridian", "Tesla-ish", "Voyager", "Halden & Co", "Asterix"], ["Mercantile", "Gapless", "Nordic", "Starling", "Ticketry", "A + E"]];
const cases = [["Sales", "Personalize your pitch with video outreach to close more deals.", "#E9FFC9", "#B7E36A"], ["Engineering", "Add visual context to your code to accelerate your sprints.", "#F5E8FF", "#BF63F3"], ["Customer support", "Troubleshoot over video to reach resolutions faster.", "#E4EEFF", "#579DFF"], ["Design", "Share ideas and provide feedback over video to enhance designs.", "#FFF1C2", "#FFC700"]];
const feats = ["Screen and camera recording", "Easy sharing and embedding", "Trim and stitch video clips", "Download and upload", "Transcriptions and closed captions", "Video privacy controls", "Custom background", "Video and viewer insights"];
const foot: [string, string[]][] = [["App", ["Pricing", "Open source", "Screen recorder", "Screenshot", "Chrome recorder", "Mac recorder", "Windows recorder", "iPhone recorder", "Android recorder"]], ["Solutions", ["Sales", "Engineering", "Design", "Marketing", "Product management", "Support", "Presentation", "Team alignment", "Education", "Webcam recorder"]], ["For business", ["Self-hosting", "Open source", "Library", "Customer stories", "Security", "Video hosting", "Video library"]], ["Downloads", ["Browser recorder", "Chrome extension", "Mobile web"]], ["Resources", ["The blog", "Help center", "Community", "Guides", "Status", "What's new", "Mic test", "Webcam recorder"]], ["Company", ["About", "Contributing", "Careers", "Newsroom", "Media kit", "vs Vidyard", "vs Zoom Clips", "vs Clipchamp", "Sitemap", "Privacy policy"]]];

export function Landing() {
  return <div className="lp">
    <header className="lp-hd">
      <div className="lp-banner"><span>NEW: Record it in the browser. Share it as a link. Turn visual walkthroughs into answers in minutes. Try it free today <Arrow /></span><button aria-label="Dismiss" className="lp-x">×</button></div>
      <nav className="lp-nav">
        <Link href="/" className="lp-logo"><Logo size={34} /></Link>
        <div className="lp-links">
          <button>Apps<Caret /></button><button>Solutions<Caret /></button><button>Resources<Caret /></button>
          <Link href="/login">Enterprise</Link><Link href="/pricing">Pricing</Link><Link href="/login">Sign In</Link>
        </div>
        <div className="lp-navcta"><Link className="lp-btn lp-btn--blue" href="/login?mode=signup">Get Loom for free</Link><Link className="lp-btn lp-btn--light" href="/login">Contact Sales</Link></div>
      </nav>
    </header>

    <section className="lp-hero">
      <h1>One video is worth a thousand words</h1>
      <p className="lp-lede">Record and share video messages with your teammates and customers, and supercharge productivity.</p>
      <div className="lp-row"><Link className="lp-btn lp-btn--blue lp-btn--lg" href="/login?mode=signup">Get Loom for free</Link><Link className="lp-btn lp-btn--light lp-btn--lg" href="/app/record">Install Chrome Extension</Link></div>
      <div className="lp-video"><div className="lp-video__scene"><i className="lp-win lp-win--a" /><i className="lp-win lp-win--b" /><Person cls="lp-video__me" /></div><span className="lp-play"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5.5v13l11-6.5z" fill="#fff" /></svg></span><span className="lp-speed">1x<br />1 min</span></div>
    </section>

    <section className="lp-trust">
      <h2>Millions of people across 400,000 companies choose Loom</h2>
      <Link className="lp-btn lp-btn--blue lp-btn--lg" href="/login?mode=signup">Get Loom for free</Link>
      <div className="lp-logos">{wordmarks.map((r, i) => <div className="lp-logos__row" key={i}>{r.map(w => <span key={w}>{w}</span>)}</div>)}</div>
    </section>

    <section className="lp-card lp-card--blue lp-mac">
      <div className="lp-mac__art"><Person cls="lp-mac__me" tone="#7A4A3A" /><div className="lp-mac__bar"><i /><i /><i /><b>Record</b></div></div>
      <div className="lp-mac__copy"><p className="lp-new">New!</p><h2>Meet the all-new Loom for desktop</h2><p>Rebuilt to be lighter, faster, and smoother than ever. Capture sharp HD video, record custom areas, and customize your camera with fresh bubble shapes. Cleaner, polished recordings with controls that hide the toolbar, shared in seconds.</p><Link className="lp-btn lp-btn--black lp-btn--lg" href="/app/record">Download now</Link></div>
    </section>

    <section className="lp-easiest"><h2>The easiest screen recorder you’ll ever use</h2><p>Record in a few clicks. Share anywhere. Collaborate better.</p></section>

    <section className="lp-fast">
      <div className="lp-fast__copy"><span className="lp-dot" /><h2 className="lp-h3">Lightning fast screen recording</h2><p>Easily <a href="#">record your screen</a> and camera. Record on any device using Loom’s <a href="#">Chrome extension</a>, <a href="#">desktop app</a> or <a href="#">mobile app</a>.</p><Link className="lp-btn lp-btn--blue" href="/app/record">Start recording</Link></div>
      <div className="lp-fast__art"><i className="lp-cal" /><i className="lp-cal lp-cal--2" /><i className="lp-cal lp-cal--3" /><div className="lp-circle"><Person /></div><div className="lp-pill"><b>0:14</b><i /><i /></div></div>
    </section>

    <h2 className="lp-more">So much more than a screen recorder</h2>
    <section className="lp-feat lp-feat--1"><div className="lp-feat__copy"><h3 className="lp-h3">Edit your videos like a pro</h3><p>Loom’s intuitive editor lets you trim, stitch clips, add eye-catching backgrounds, and even enhance your message with text, arrows, and box overlays. The result? Engaging videos you can deliver fast.</p><Link className="lp-more-link" href="/app/record">Record now <Arrow /></Link></div><div className="lp-feat__art lp-art-edit"><i /><i /><b>This plan is <u>what we like to call out</u></b></div></section>
    <section className="lp-feat lp-feat--2"><div className="lp-feat__art lp-art-share" /><div className="lp-feat__copy"><h3 className="lp-h3">Share or embed video anywhere you work</h3><p>From docs to chat, recordings seamlessly integrate with hundreds of tools you use every day.</p><Link className="lp-more-link" href="/login">Start sharing <Arrow /></Link></div></section>
    <section className="lp-feat lp-feat--3"><div className="lp-feat__copy"><h3 className="lp-h3">Engage and connect with video</h3><p>Easily collaborate by adding emojis, comments, tasks and CTAs to your video message. Empower remote teams to communicate better across timezones using transcripts and captions in 50+ languages.</p><Link className="lp-more-link" href="/login">Connect over video <Arrow /></Link></div><div className="lp-feat__art lp-art-code"><span /><span /><span /><span /><span /><span /><div className="lp-circle"><Person /></div></div></section>

    <section className="lp-card lp-card--black lp-safe"><h2>Keep your content safe</h2><p>Enterprise-grade security to keep your data and your customer’s data private and secure. Sign in with SSO, retention policies and privacy settings that are yours to configure.</p><Link className="lp-btn lp-btn--blue lp-btn--lg" href="/login">Learn more</Link></section>

    <section className="lp-uses"><h2>Video messaging for all use cases</h2>
      <div className="lp-uses__grid">{cases.map(([t, d, bg, fg]) => <article key={t} style={{ background: bg }}><div className="lp-uses__pic" style={{ background: `linear-gradient(135deg, ${fg}55, #fff8)` }}><Person cls="lp-uses__me" /></div><h3>{t}</h3><p>{d}</p></article>)}</div>
      <Link className="lp-btn lp-btn--light" href="/login">See all use cases</Link></section>

    <section className="lp-feats"><h2>Powerful features for easy, custom recordings</h2>
      <ul>{feats.map(f => <li key={f}><Check />{f}</li>)}</ul><Link className="lp-underline" href="/pricing">See all features</Link></section>

    <section className="lp-card lp-card--blue lp-blog"><p className="lp-eyebrow">FROM OUR BLOG</p><h2>How to use async video messaging to improve communication</h2>
      <div className="lp-blog__grid"><article><h3>When to choose synchronous vs. asynchronous communication</h3><p>This guide explores the intricacies of sync vs. async communication, helps you decide which is the best for your workflow, and introduces how screen recording bridges the gap between these communication styles.</p><Link href="/login">Read the article <Arrow /></Link></article>
        <article><h3>Let AI do the work: say goodbye to manual documentation</h3><p>Turn any recording into a written doc to draft SOPs, file tickets, and more.</p><Link href="/login">Read the article <Arrow /></Link></article></div>
      <Link className="lp-btn lp-btn--black lp-btn--lg" href="/login">Explore our blog</Link></section>

    <section className="lp-card lp-card--grey lp-ent"><h2>Loom for Enterprise</h2><p>Loom for Enterprise helps teams securely manage and organize async video communication at scale.</p><Link className="lp-btn lp-btn--blue" href="/login">Learn more</Link>
      <div className="lp-ent__art"><i className="lp-ent__w lp-ent__w--l" /><i className="lp-ent__w lp-ent__w--r" /><div className="lp-ent__main"><b>Q1 Results Overview</b><span /><span /><Person cls="lp-ent__me" /></div></div></section>

    <section className="lp-quotes"><div className="lp-quote lp-quote--side" /><div className="lp-quote"><button aria-label="Previous" className="lp-arrow lp-arrow--l">←</button><div className="lp-quote__logo"><i /><i /><i />Sevenseven</div><blockquote>“This tool has been the light of my life since you showed me it.” – I never tire of hearing this from folks. Not even an investor… yet.”</blockquote><div className="lp-quote__who"><Person cls="lp-quote__ph" /><div><b>Alex Ohanian</b><small>Founder, Sevenseven</small></div></div><button aria-label="Next" className="lp-arrow lp-arrow--r">→</button></div><div className="lp-quote lp-quote--side" /></section>

    <aside className="lp-cta"><div className="lp-cta__box"><p>Loom powers great campaigns.</p><div><Link className="lp-btn lp-btn--blue lp-btn--lg" href="/login?mode=signup">Get Loom for free</Link><small>For Mac, Windows, iOS, and Android</small></div></div></aside>

    <footer className="lp-ft">
      <div className="lp-ft__cols">{foot.map(([h, ls]) => <div key={h}><h4>{h}</h4>{ls.map(l => <Link key={l} href="/login">{l}</Link>)}</div>)}</div>
      <div className="lp-ft__bar"><div className="lp-social">{["X", "in", "▶", "◎", "♪"].map(s => <i key={s}>{s}</i>)}<Link href="/pricing">LoomIsDead Terms &amp; Policies</Link><Link href="/pricing">Your Privacy Choices</Link></div><div className="lp-ft__copy"><b>▲ ATLASSIAN-ISH</b><small>© 2026 LoomIsDead. An independent open-source project, not affiliated with Loom, Inc. or Atlassian. <a href="https://github.com/tommy-muckstack/loomisdead">GitHub</a></small></div></div>
    </footer>
  </div>;
}
