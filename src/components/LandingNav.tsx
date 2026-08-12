import { Link } from "react-router-dom";
import logoIcon from "../assets/logo-icon.png";

const C = {
  canvas: "#080a0d",
  border: "rgba(255,255,255,0.07)",
  text: "rgba(255,255,255,0.88)",
  muted: "rgba(255,255,255,0.40)",
  amber: "#e8a84a",
} as const;

export function LandingNav() {
  return (
    <nav
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 50,
        background: "rgba(8,10,13,0.88)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <img src={logoIcon} alt="Street Insights" style={{ height: 26, width: "auto" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", lineHeight: 1.2 }}>
            Street Insights
          </div>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1 }}>
            by Boxford Partners
          </div>
        </div>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link to="/blog" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Blog</Link>
        <Link to="/faq" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>FAQ</Link>
        <Link to="/pricing" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Pricing</Link>
        <Link to="/login" style={{ fontSize: 13, color: C.muted, textDecoration: "none" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Sign in</Link>
        <Link
          to="/sign-up"
          className="btn-primary"
          style={{ fontSize: 13, padding: "8px 16px", borderRadius: 4 }}
        >
          Get Access
        </Link>
      </div>
    </nav>
  );
}
