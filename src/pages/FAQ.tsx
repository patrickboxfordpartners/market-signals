import { useState } from "react";
import { Link } from "react-router-dom";
import { faqs } from "../data/faqs";
import { LandingNav } from "../components/LandingNav";
import LandingFooter from "../components/LandingFooter";
import { usePageMeta } from "../hooks/usePageMeta";

const C = {
  canvas: "#080a0d",
  surface: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,0.88)",
  muted: "rgba(255,255,255,0.40)",
  faint: "rgba(255,255,255,0.18)",
  amber: "#e8a84a",
} as const;

const categories = Array.from(new Set(faqs.map((f) => f.category)));

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export function FAQ() {
  usePageMeta({
    title: "Frequently Asked Questions",
    description: "Get answers about Street Insights: how AI sentiment signals work, pricing, data sources, alert delivery, and more.",
  });
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div style={{ minHeight: "100vh", background: C.canvas, color: C.text, fontFamily: "'Geist', system-ui, sans-serif", WebkitFontSmoothing: "antialiased" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <LandingNav />

      {/* Breadcrumbs */}
      <div style={{ paddingTop: 68, maxWidth: 720, margin: "0 auto", padding: "68px 24px 0" }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: C.faint }}>
          <Link to="/" style={{ color: C.faint, textDecoration: "none" }}>Home</Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: C.muted }}>FAQ</span>
        </nav>
      </div>

      {/* Hero */}
      <section style={{ borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 56px", textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.amber, marginBottom: 14 }}>
            FAQ
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.05, marginBottom: 16 }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.65, maxWidth: 480, margin: "0 auto" }}>
            Everything you need to know about Street Insights, social sentiment signals, and credibility-ranked market intelligence.
          </p>
        </div>
      </section>

      {/* Category nav */}
      <div style={{
        position: "sticky", top: 56, zIndex: 40,
        background: "rgba(8,10,13,0.95)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        overflowX: "auto",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px", display: "flex", gap: 0 }}>
          {categories.map((cat) => {
            const anchor = cat.toLowerCase().replace(/\s+&?\s*/g, "-");
            return (
              <a
                key={cat}
                href={`#${anchor}`}
                style={{
                  display: "inline-block",
                  padding: "14px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: C.muted,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  borderBottom: "2px solid transparent",
                  transition: "color 0.15s, border-color 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = C.amber;
                  (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = C.amber;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.color = C.muted;
                  (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "transparent";
                }}
              >
                {cat}
              </a>
            );
          })}
        </div>
      </div>

      {/* FAQ sections */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 24px 80px" }}>
        {categories.map((cat) => {
          const items = faqs.filter((f) => f.category === cat);
          const anchor = cat.toLowerCase().replace(/\s+&?\s*/g, "-");
          return (
            <section key={cat} id={anchor} style={{ marginBottom: 56, scrollMarginTop: 120 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                color: C.amber, marginBottom: 20, paddingBottom: 12,
                borderBottom: `1px solid ${C.border}`,
              }}>
                {cat}
              </div>

              <div>
                {items.map((faq) => {
                  const key = `${cat}:${faq.question}`;
                  const isOpen = openKey === key;
                  return (
                    <div key={key} style={{ borderTop: `1px solid ${C.border}` }}>
                      <button
                        onClick={() => setOpenKey(isOpen ? null : key)}
                        style={{
                          width: "100%", display: "flex", alignItems: "flex-start",
                          justifyContent: "space-between", gap: 16,
                          padding: "18px 0", background: "none", border: "none",
                          cursor: "pointer", textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500, color: isOpen ? C.amber : "rgba(255,255,255,0.8)", lineHeight: 1.5, transition: "color 0.15s" }}>
                          {faq.question}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                          <path d="M3 5l4 4 4-4" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div style={{ paddingBottom: 18, fontSize: 14, lineHeight: 1.75, color: C.muted, maxWidth: 580 }}>
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ borderTop: `1px solid ${C.border}` }} />
              </div>
            </section>
          );
        })}

        {/* Still have questions */}
        <div style={{
          marginTop: 16, padding: "40px 48px", textAlign: "center",
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginBottom: 10 }}>
            Still have questions?
          </h3>
          <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
            Reach out and we will get back to you within one business day.
          </p>
          <a
            href="mailto:hello@getstreetinsights.com"
            style={{
              display: "inline-flex", alignItems: "center",
              background: C.amber, color: "#0a0700",
              fontSize: 13, fontWeight: 700,
              padding: "10px 24px", borderRadius: 4,
              textDecoration: "none", letterSpacing: "0.03em",
            }}
          >
            Contact us
          </a>
        </div>
      </div>

      {/* Bottom CTA */}
      <section style={{ padding: "80px 24px", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber, marginBottom: 20 }}>
            Street Insights
          </div>
          <h2 style={{ fontSize: "clamp(24px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "#fff", lineHeight: 1.08, marginBottom: 16 }}>
            Know before the headline.
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.65, marginBottom: 36 }}>
            Social sentiment tracking across Reddit, forums, and social platforms. Credibility-ranked signals for retail investors.
          </p>
          <Link
            to="/sign-up"
            style={{
              display: "inline-block", padding: "13px 32px",
              background: C.amber, color: "#0a0700",
              borderRadius: 4, fontWeight: 700, fontSize: 14,
              letterSpacing: "0.04em", textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
