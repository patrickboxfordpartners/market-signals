import { Link } from 'react-router-dom';

const C = {
  canvas: '#080a0d',
  surface: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.07)',
  text: 'rgba(255,255,255,0.88)',
  muted: 'rgba(255,255,255,0.40)',
  faint: 'rgba(255,255,255,0.18)',
  amber: '#e8a84a',
  amberDim: 'rgba(232,168,74,0.12)',
} as const;

function NavLink({ href, label, external = false, isRoute = false }: { href: string; label: string; external?: boolean; isRoute?: boolean }) {
  const style: React.CSSProperties = { fontSize: 13, color: C.muted, textDecoration: 'none', fontWeight: 400 };
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = C.text),
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = C.muted),
  };
  if (isRoute) {
    return <Link to={href} style={style} {...handlers}>{label}</Link>;
  }
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={style} {...handlers}>
      {label}
    </a>
  );
}

function LegalLink({ href, label, isRoute = false }: { href: string; label: string; isRoute?: boolean }) {
  const style: React.CSSProperties = { fontSize: 11, color: C.faint, textDecoration: 'none' };
  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = C.muted),
    onMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = C.faint),
  };
  if (isRoute) {
    return <Link to={href} style={style} {...handlers}>{label}</Link>;
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={style} {...handlers}>
      {label}
    </a>
  );
}

export default function LandingFooter() {
  const year = new Date().getFullYear();
  const dot = <span style={{ color: C.faint, userSelect: 'none' }}>·</span>;

  return (
    <footer style={{ background: C.canvas, borderTop: `1px solid ${C.border}` }}>
      <div style={{
        maxWidth: 720, margin: '0 auto', padding: '64px 24px 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center',
      }}>

        {/* Logo */}
        <a
          href="https://www.boxfordpartners.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'baseline', gap: 2, textDecoration: 'none' }}
        >
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>BOXFORD</span>
          <span style={{ fontSize: 15, fontWeight: 300, color: C.muted }}>partners</span>
        </a>

        {/* Tagline */}
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, maxWidth: 384, margin: 0 }}>
          Street Insights is not financial advice. Built by Boxford Partners.
        </p>

        {/* Nav row */}
        <nav style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 32px' }}>
          <NavLink href="/blog" label="Blog" isRoute />
          <NavLink href="/faq" label="FAQ" isRoute />
          <NavLink href="/pricing" label="Pricing" isRoute />
          <NavLink href="https://reviewsniper.app/" label="reviewSNIPER" external />
          <NavLink href="https://gravitasindex.com/" label="Gravitas Index" external />
          <NavLink href="https://www.boxfordpartners.com/about" label="About" external />
          <NavLink href="https://www.linkedin.com/company/boxfordpartners" label="LinkedIn" external />
        </nav>

        {/* Contact row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13 }}>
          <a
            href="mailto:hello@getstreetinsights.com"
            style={{ color: C.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            hello@getstreetinsights.com
          </a>
          {dot}
          <a
            href="https://cal.com/boxfordpartners/market-signals-demo"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: C.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            Book a demo
          </a>
        </div>

        {/* Bottom legal bar */}
        <div style={{
          width: '100%', paddingTop: 24, paddingBottom: 24,
          borderTop: `1px solid ${C.border}`,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '6px 12px',
        }}>
          <p style={{ fontSize: 11, color: C.faint, margin: 0 }}>
            &copy; {year} Boxford Partners LLC. Street Insights is not financial advice.
          </p>
          {dot}
          <LegalLink href="/privacy" label="Privacy" isRoute />
          {dot}
          <LegalLink href="/terms" label="Terms" isRoute />
          {dot}
          <LegalLink href="https://www.boxfordpartners.com/acceptable-use" label="Acceptable Use" />
        </div>

      </div>
    </footer>
  );
}
