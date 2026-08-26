import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/landing.css";
import {
  IconChecklist,
  IconChat,
  IconDashboard,
  IconUsers,
  IconKey,
  IconDocuments,
  IconLayers,
  IconWrench,
  IconMessageSquare,
  IconBarChart,
  IconLock,
  IconBookOpen,
  IconCheck,
  IconMenu,
  IconClose,
  IconUser,
  IconGear,
} from "../components/Icons";

/* Fades a section in the first time it scrolls into view. Skips the
   animation entirely for prefers-reduced-motion via the CSS in landing.css. */
function Reveal({ children, className = "", as: Tag = "div", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${visible ? "lp-reveal-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#benefits", label: "Benefits" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#ai-assistant", label: "AI Assistant" },
  { href: "#admin-control", label: "Admin" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lp-nav ${scrolled ? "lp-nav-scrolled" : ""}`}>
      <div className="lp-shell lp-nav-inner">
        <Link to="/" className="lp-nav-brand">
          <div className="sidebar-brand-mark" style={{ background: "var(--color-primary)" }}>OB</div>
          Onboarding Buddy
        </Link>

        <nav className="lp-nav-links">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>

        <div className="lp-nav-actions">
          <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
          {/* <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link> */}
          <button
            type="button"
            className="btn btn-ghost btn-icon lp-nav-toggle"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lp-mobile-panel">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="lp-mobile-link" onClick={() => setMobileOpen(false)}>
              {link.label}
            </a>
          ))}
          <div className="lp-mobile-cta">
            <Link to="/login" className="btn btn-secondary" onClick={() => setMobileOpen(false)}>Login</Link>
            <Link to="/register" className="btn btn-primary" onClick={() => setMobileOpen(false)}>Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      <div className="lp-shell lp-hero-grid">
        <div>
          <div className="lp-eyebrow">For HR, IT &amp; Team Managers</div>
          <h1 className="lp-hero-title">
            Onboard new hires faster with <span className="lp-highlight">AI-guided checklists</span>
          </h1>
          <p className="lp-hero-sub">
            Role-based onboarding, team tool access, and an AI knowledge assistant that answers
            from your company documents — so new joiners get moving without waiting on a manager.
          </p>
          <div className="lp-hero-ctas">
            {/* <Link to="/register" className="btn btn-primary">Get Started</Link> */}
            <Link to="/login" className="btn btn-primary">View Demo / Login</Link>
          </div>
          <div className="lp-hero-note">
            <IconCheck width={14} height={14} /> No credit card needed to try it internally
          </div>
        </div>

        <div className="lp-hero-mock" aria-hidden="true">
          <div className="lp-mock-card lp-mock-checklist">
            <div className="lp-mock-card-head">
              <span><IconChecklist width={14} height={14} /> Your onboarding checklist</span>
              <span className="lp-mock-progress-label">75%</span>
            </div>
            <div className="lp-mock-progress-track"><div className="lp-mock-progress-fill" style={{ width: "75%" }} /></div>
            <ul className="lp-mock-tasks">
              <li className="lp-mock-task done"><IconCheck width={13} height={13} /> Set up laptop &amp; email</li>
              <li className="lp-mock-task done"><IconCheck width={13} height={13} /> Complete security training</li>
              <li className="lp-mock-task done"><IconCheck width={13} height={13} /> Meet your onboarding buddy</li>
              <li className="lp-mock-task"><span className="lp-mock-task-dot" /> Request VPN access</li>
            </ul>
          </div>

          <div className="lp-mock-card lp-mock-chat">
            <div className="lp-mock-card-head"><IconChat width={14} height={14} /> AI Assistant</div>
            <div className="lp-mock-chat-row user">How many PTO days do I get in year one?</div>
            <div className="lp-mock-chat-row assistant">
              New hires accrue 18 PTO days in year one, credited monthly.
              <div className="lp-mock-source"><IconBookOpen width={11} height={11} /> HR_Policy_Handbook.pdf</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const TRUST_ITEMS = [
  { icon: <IconUsers width={16} height={16} />, label: "Built for HR, IT & Team Managers" },
  { icon: <IconLock width={16} height={16} />, label: "Secure JWT authentication" },
  { icon: <IconMessageSquare width={16} height={16} />, label: "Document-grounded AI answers" },
  { icon: <IconBarChart width={16} height={16} />, label: "Admin visibility & control" },
];

function TrustStrip() {
  return (
    <div className="lp-trust">
      <div className="lp-shell lp-trust-row">
        {TRUST_ITEMS.map((item) => (
          <div className="lp-trust-item" key={item.label}>{item.icon}{item.label}</div>
        ))}
      </div>
    </div>
  );
}

const PROBLEMS = [
  { text: "New joiners ask the same setup questions over and over." },
  { text: "Managers and HR get pulled away from real work to answer them." },
  { text: "Onboarding steps differ depending on who's guiding you." },
  { text: "Tool and system access varies by team, with no single reference." },
  { text: "Nobody has a clear view of who's stuck and where." },
  { text: "Feedback on the process rarely makes it back to whoever owns it." },
];

function ProblemSection() {
  return (
    <section className="lp-section" id="problem">
      <div className="lp-shell">
        <Reveal as="div" className="lp-section-head">
          <div className="lp-eyebrow">The problem</div>
          <h2>Onboarding shouldn't run on tribal knowledge</h2>
          <p>Most onboarding today lives in people's heads, old docs, and repeated Slack threads. That doesn't scale past a handful of new hires.</p>
        </Reveal>
        <div className="lp-problem-grid">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.text} delay={i * 40} className="lp-problem-card">
              <div className="lp-problem-icon"><IconClose width={15} height={15} /></div>
              <p>{p.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const PILLARS = [
  { icon: <IconChecklist width={20} height={20} />, title: "Role-based checklists", desc: "Every role gets the exact steps it needs — nothing generic, nothing missing." },
  { icon: <IconKey width={20} height={20} />, title: "Team-based tool access", desc: "Each team sees the tools it actually uses, with clear request links and setup guides." },
  { icon: <IconChat width={20} height={20} />, title: "AI knowledge assistant", desc: "Answers policy, IT, and HR questions straight from your own documents." },
  { icon: <IconBarChart width={20} height={20} />, title: "Admin tracking & feedback", desc: "See progress in real time and improve the checklist from real employee feedback." },
];

function SolutionSection() {
  return (
    <section className="lp-section lp-section-alt" id="solution">
      <div className="lp-shell">
        <Reveal as="div" className="lp-section-head">
          <div className="lp-eyebrow">The solution</div>
          <h2>One place for the whole onboarding journey</h2>
          <p>Onboarding Buddy replaces scattered docs and one-off questions with a guided, trackable process.</p>
        </Reveal>
        <div className="lp-pillars">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 60} className="lp-pillar">
              <div className="lp-pillar-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const EMPLOYEE_FEATURES = [
  { icon: <IconChecklist width={17} height={17} />, title: "Smart onboarding checklist", desc: "A guided list of steps for your specific role, tracked automatically as you go." },
  { icon: <IconBookOpen width={17} height={17} />, title: "Step-by-step guides", desc: "Setup guides and resources attached right where you need them." },
  { icon: <IconKey width={17} height={17} />, title: "My Access", desc: "See every tool your team uses and where to request access." },
  { icon: <IconChat width={17} height={17} />, title: "AI assistant", desc: "Ask policy, IT, or HR questions and get answers sourced from real documents." },
  { icon: <IconUser width={17} height={17} />, title: "Profile & account settings", desc: "Manage your own details from one simple profile page." },
];

const ADMIN_FEATURES = [
  { icon: <IconDashboard width={17} height={17} />, title: "Dashboard metrics", desc: "A live view of onboarding health across the organization." },
  { icon: <IconUsers width={17} height={17} />, title: "User management", desc: "Create users, assign roles and teams, and control admin access." },
  { icon: <IconLayers width={17} height={17} />, title: "Teams & tools matrix", desc: "Map which tools belong to which team, with setup guides attached." },
  { icon: <IconDocuments width={17} height={17} />, title: "Document knowledge base", desc: "Upload the policies and guides the AI assistant answers from." },
  { icon: <IconMessageSquare width={17} height={17} />, title: "Feedback review", desc: "See comments on checklist items and fix friction points fast." },
  { icon: <IconWrench width={17} height={17} />, title: "Progress monitoring", desc: "Spot who's on track and who's stuck, per person or per team." },
];

function FeaturesGrid() {
  return (
    <section className="lp-section" id="features">
      <div className="lp-shell">
        <Reveal as="div" className="lp-section-head">
          <div className="lp-eyebrow">Features</div>
          <h2>Everything both sides of onboarding need</h2>
          <p>A focused workspace for new hires, and full control for the people running the process.</p>
        </Reveal>

        <div className="lp-features-group">
          <div className="lp-features-group-label">For employees</div>
          <div className="lp-feature-cards lp-employee">
            {EMPLOYEE_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 40} className="lp-feature-card">
                <div className="lp-feature-card-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="lp-features-group">
          <div className="lp-features-group-label">For admins</div>
          <div className="lp-feature-cards lp-admin">
            {ADMIN_FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 40} className="lp-feature-card">
                <div className="lp-feature-card-icon">{f.icon}</div>
                <h4>{f.title}</h4>
                <p>{f.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { title: "Admin creates the user", desc: "An admin adds the new hire and assigns their role and team in a few clicks." },
  { title: "Employee completes the checklist", desc: "The new hire works through a guided, role-specific onboarding checklist." },
  { title: "Employee gets tool access", desc: "They see exactly which tools their team uses, and where to request access." },
  { title: "AI answers along the way", desc: "Questions on policy, IT, or HR get grounded answers from company documents." },
  { title: "Admin tracks and improves", desc: "Progress and feedback flow back to admins, who refine the process over time." },
];

function HowItWorks() {
  return (
    <section className="lp-section lp-section-alt" id="how-it-works">
      <div className="lp-shell">
        <Reveal as="div" className="lp-section-head">
          <div className="lp-eyebrow">How it works</div>
          <h2>From day one to fully set up</h2>
          <p>A simple, repeatable flow — the same for every new hire, every time.</p>
        </Reveal>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 50} className="lp-step">
              <div className="lp-step-num">{String(i + 1).padStart(2, "0")}</div>
              <div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const AI_POINTS = [
  "Answers come from your uploaded company documents — not generic guesses.",
  "Cuts down repetitive HR and IT questions landing in your inbox or Slack.",
  "Covers onboarding policy, leave, device setup, and access requests.",
  "Every answer can point back to the source document it came from.",
];

function AISection() {
  return (
    <section className="lp-ai-section" id="ai-assistant">
      <div className="lp-shell lp-ai-grid">
        <div>
          <div className="lp-eyebrow lp-eyebrow-violet">AI Assistant</div>
          <h2>An assistant that actually knows your company</h2>
          <p className="lp-ai-sub">
            Instead of a generic chatbot, the AI assistant is grounded in the documents your team
            uploads — handbooks, IT guides, HR policy — so answers stay accurate and specific.
          </p>
          <div className="lp-ai-points">
            {AI_POINTS.map((point) => (
              <div className="lp-ai-point" key={point}>
                <IconCheck width={15} height={15} />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lp-ai-mock" aria-hidden="true">
          <div className="lp-ai-mock-head"><IconChat width={15} height={15} /> Ask anything about your onboarding</div>
          <div className="lp-mock-chat-row user">What's the process to get VPN access?</div>
          <div className="lp-mock-chat-row assistant">
            Submit a request through My Access under "VPN Client" — IT approves it within one
            business day and emails you setup steps.
            <div className="lp-mock-source"><IconBookOpen width={11} height={11} /> IT_Access_Guide.pdf</div>
          </div>
          <div className="lp-mock-chat-row user">And my probation period policy?</div>
          <div className="lp-mock-chat-row assistant">
            Probation runs 90 days from your start date, with a check-in at day 45.
            <div className="lp-mock-source"><IconBookOpen width={11} height={11} /> HR_Policy_Handbook.pdf</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const ADMIN_POINTS = [
  { icon: <IconBarChart width={16} height={16} />, title: "Progress visibility", desc: "See completion rates across the whole organization at a glance." },
  { icon: <IconWrench width={16} height={16} />, title: "Lagging employee insights", desc: "Spot who's falling behind before it becomes a problem." },
  { icon: <IconLayers width={16} height={16} />, title: "Team-based access management", desc: "Keep tool assignments accurate as teams and tools change." },
  { icon: <IconMessageSquare width={16} height={16} />, title: "Checklist feedback loop", desc: "Turn employee comments into a better checklist, continuously." },
];

function AdminSection() {
  return (
    <section className="lp-section" id="admin-control">
      <div className="lp-shell lp-admin-grid">
        <Reveal as="div">
          <div className="lp-eyebrow">Admin control</div>
          <h2>Full visibility, without the manual chasing</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
            HR, IT, and team managers get one dashboard to see how onboarding is actually going —
            not a guess based on who's complained lately.
          </p>
          <div className="lp-admin-points">
            {ADMIN_POINTS.map((p) => (
              <div className="lp-admin-point" key={p.title}>
                <div className="lp-admin-point-icon">{p.icon}</div>
                <div>
                  <h4>{p.title}</h4>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal as="div" delay={80} className="lp-admin-mock" aria-hidden="true">
          <div className="lp-admin-mock-stats">
            <div className="lp-admin-stat">
              <div className="lp-admin-stat-value">128</div>
              <div className="lp-admin-stat-label">Active employees</div>
            </div>
            <div className="lp-admin-stat">
              <div className="lp-admin-stat-value">82%</div>
              <div className="lp-admin-stat-label">Avg. completion</div>
            </div>
            <div className="lp-admin-stat">
              <div className="lp-admin-stat-value">6</div>
              <div className="lp-admin-stat-label">Teams onboarded</div>
            </div>
          </div>
          <div className="lp-admin-mock-row">
            <span className="lp-admin-mock-name">Priya Nair · Engineering</span>
            <span className="status-badge status-active">On track</span>
          </div>
          <div className="lp-admin-mock-row">
            <span className="lp-admin-mock-name">Marcus Lee · Sales</span>
            <span className="status-badge status-inactive">Lagging</span>
          </div>
          <div className="lp-admin-mock-row">
            <span className="lp-admin-mock-name">Ana Duarte · IT</span>
            <span className="status-badge status-active">Complete</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const BENEFITS = [
  { icon: <IconChecklist width={18} height={18} />, title: "Faster onboarding" },
  { icon: <IconUsers width={18} height={18} />, title: "Less manager interruption" },
  { icon: <IconLayers width={18} height={18} />, title: "Consistent process" },
  { icon: <IconGear width={18} height={18} />, title: "Better compliance readiness" },
  { icon: <IconBookOpen width={18} height={18} />, title: "Central knowledge access" },
];

function BenefitsSection() {
  return (
    <section className="lp-section lp-section-alt" id="benefits">
      <div className="lp-shell">
        <Reveal as="div" className="lp-section-head">
          <div className="lp-eyebrow">Outcomes</div>
          <h2>What teams get within the first few weeks</h2>
        </Reveal>
        <div className="lp-benefits">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 40} className="lp-benefit">
              <div className="lp-benefit-icon">{b.icon}</div>
              <h4>{b.title}</h4>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="lp-section" id="get-started">
      <div className="lp-shell">
        <Reveal as="div" className="lp-cta-banner">
          <h2>Ready to modernize employee onboarding?</h2>
          <p>Set up your first role, team, and checklist in minutes.</p>
          <div className="lp-cta-actions">
            {/* <Link to="/register" className="btn btn-primary">Get Started</Link> */}
            <Link to="/login" className="btn btn-primary">Login</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-shell">
        <div className="lp-footer-top">
          <div>
            <div className="lp-footer-brand">
              <div className="sidebar-brand-mark" style={{ background: "var(--color-primary-400)" }}>OB</div>
              Onboarding Buddy
            </div>
            <p className="lp-footer-desc">
              Employee Onboarding &amp; Knowledge Buddy — role-based checklists, team tool access,
              and an AI assistant grounded in your own company documents.
            </p>
          </div>
          <div className="lp-footer-links">
            <div className="lp-footer-col">
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#ai-assistant">AI Assistant</a>
            </div>
            <div className="lp-footer-col">
              <h5>Account</h5>
              <Link to="/login">Login</Link>
              {/* <Link to="/register">Register</Link> */}
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          © {new Date().getFullYear()} Onboarding Buddy. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <Navbar />
      <Hero />
      <TrustStrip />
      <ProblemSection />
      <SolutionSection />
      <FeaturesGrid />
      <HowItWorks />
      <AISection />
      <AdminSection />
      <BenefitsSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}
