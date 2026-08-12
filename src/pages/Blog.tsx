import { Link } from "react-router-dom";
import { posts } from "../data/posts";
import { LandingNav } from "../components/LandingNav";
import LandingFooter from "../components/LandingFooter";
import { usePageMeta } from "../hooks/usePageMeta";

const C = {
  canvas: "#080a0d",
  surface: "rgb(17,24,39)",
  border: "rgba(255,255,255,0.07)",
  text: "#f0f0f0",
  muted: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.3)",
  amber: "#e8a84a",
};

export function Blog() {
  usePageMeta({
    title: "Blog",
    description: "Market intelligence insights, stock sentiment analysis guides, and trading signal strategies from Street Insights.",
  });
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.canvas,
        color: C.text,
        fontFamily: "'Geist', system-ui, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <LandingNav />

      {/* Main */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "96px 24px 80px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.amber, marginBottom: 12 }}>Blog</p>
        <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.025em", color: "#fff", marginBottom: 8 }}>
          Street Insights
        </h1>
        <p style={{ fontSize: 16, color: C.muted, marginBottom: 56 }}>
          Market intelligence, product updates, and trading insights.
        </p>

        {posts.length === 0 ? (
          <p style={{ fontSize: 15, color: C.muted }}>Articles coming soon.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {posts.map((post, i) => (
              <article
                key={post.slug}
                style={{
                  padding: "32px 0",
                  borderBottom: i < posts.length - 1 ? `1px solid ${C.border}` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: C.amber,
                      background: "rgba(232,168,74,0.1)",
                      padding: "2px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {post.category}
                  </span>
                  <span style={{ fontSize: 12, color: C.faint }}>{post.date}</span>
                  <span style={{ fontSize: 12, color: C.faint }}>{post.readTime}</span>
                </div>

                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.015em" }}>
                  <Link
                    to={`/blog/${post.slug}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.amber)}
                    onMouseLeave={e => (e.currentTarget.style.color = "#fff")}
                  >
                    {post.title}
                  </Link>
                </h2>

                <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.65, marginBottom: 16, maxWidth: 640 }}>
                  {post.description}
                </p>

                <Link
                  to={`/blog/${post.slug}`}
                  style={{ fontSize: 13, color: C.amber, textDecoration: "none", fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                >
                  Read more &rarr;
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Cross-links */}
      <section style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 64px" }}>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32, display: "flex", flexWrap: "wrap", gap: 24 }}>
          <Link to="/faq" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.amber)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            Frequently Asked Questions &rarr;
          </Link>
          <Link to="/pricing" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.amber)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            View Pricing &rarr;
          </Link>
          <Link to="/demo" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.amber)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
            Try the Demo &rarr;
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
