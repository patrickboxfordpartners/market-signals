import { Link } from 'react-router-dom';
import { useState, useEffect, useRef, FormEvent } from 'react';
import logoIcon from '../assets/logo-icon.png';
import LandingFooter from '../components/LandingFooter';

import { featuredFaqs } from "../data/faqs";
export { featuredFaqs as landingFaqs } from "../data/faqs";
import { usePageMeta } from "../hooks/usePageMeta";

// ── Tokens ────────────────────────────────────────────────────────────────────
const C = {
  canvas:    '#080a0d',
  surface:   'rgba(255,255,255,0.03)',
  surfaceHi: 'rgba(255,255,255,0.06)',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.12)',
  text:      'rgba(255,255,255,0.88)',
  muted:     'rgba(255,255,255,0.40)',
  faint:     'rgba(255,255,255,0.18)',
  amber:     '#e8a84a',
  amberDim:  'rgba(232,168,74,0.12)',
  amberGlow: 'rgba(232,168,74,0.08)',
  green:     '#34d399',
  greenDim:  'rgba(52,211,153,0.10)',
  red:       '#f87171',
  redDim:    'rgba(248,113,113,0.10)',
} as const;

// ── Keyframe styles injected once ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; }

  html { scroll-behavior: smooth; }

  body {
    background: ${C.canvas};
    color: ${C.text};
    font-family: 'Geist', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }

  @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes amber-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(232,168,74,0); }
    50%       { box-shadow: 0 0 20px 4px rgba(232,168,74,0.18); }
  }

  .animate-fade-up { animation: fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  .animate-fade-up-1 { animation-delay: 0.08s; }
  .animate-fade-up-2 { animation-delay: 0.16s; }
  .animate-fade-up-3 { animation-delay: 0.24s; }

  .btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 22px; border-radius: 4px;
    background: ${C.amber}; color: #0a0700;
    font-family: 'Geist', system-ui, sans-serif;
    font-size: 14px; font-weight: 600; line-height: 1;
    border: none; cursor: pointer; text-decoration: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
    touch-action: manipulation;
  }
  .btn-primary:hover { animation: amber-glow 1.6s ease-in-out infinite; transform: translateY(-1px); }
  .btn-primary:active { transform: scale(0.97); }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 11px 22px; border-radius: 4px;
    background: transparent; color: ${C.text};
    font-family: 'Geist', system-ui, sans-serif;
    font-size: 14px; font-weight: 500; line-height: 1;
    border: 1px solid ${C.border}; cursor: pointer; text-decoration: none;
    transition: border-color 0.15s ease, color 0.15s ease;
    touch-action: manipulation;
  }
  .btn-ghost:hover { border-color: ${C.borderHi}; color: #fff; }
  .btn-ghost:active { transform: scale(0.97); }

  .section-label {
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: ${C.amber}; margin-bottom: 12px;
  }

  .grid-bg {
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  @media (max-width: 768px) {
    .hide-mobile { display: none !important; }
  }
  @media (min-width: 769px) {
    .hide-desktop { display: none !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

// ── Ticker bar ────────────────────────────────────────────────────────────────
const TICKERS = [
  { symbol: 'NVDA', change: '+1.8%', mentions: '1,204', spike: '+45%', up: true },
  { symbol: 'AMD',  change: '+3.1%', mentions: '956',   spike: '+67%', up: true },
  { symbol: 'AAPL', change: '-0.5%', mentions: '623',   spike: '-12%', up: false },
  { symbol: 'TSLA', change: '+2.3%', mentions: '847',   spike: '+23%', up: true },
  { symbol: 'PLTR', change: '+4.2%', mentions: '1,103', spike: '+89%', up: true },
  { symbol: 'MSFT', change: '+0.9%', mentions: '542',   spike: '+8%',  up: true },
  { symbol: 'SPY',  change: '+0.3%', mentions: '734',   spike: '+15%', up: true },
  { symbol: 'COIN', change: '+5.1%', mentions: '889',   spike: '+112%', up: true },
];

function TickerBar() {
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.015)', overflow: 'hidden', padding: '8px 0' }}>
      <div style={{ display: 'flex', gap: 40, animation: 'marquee 40s linear infinite', whiteSpace: 'nowrap' }}>
        {[...TICKERS, ...TICKERS].map((t, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '0.04em' }}>{t.symbol}</span>
            <span className="mono" style={{ fontSize: 11, color: t.up ? C.green : C.red }}>{t.change}</span>
            <span style={{ color: C.faint, fontSize: 10 }}>|</span>
            <span className="mono" style={{ fontSize: 11, color: C.muted }}>{t.mentions} mentions</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: t.up ? C.amber : C.red, background: t.up ? C.amberDim : C.redDim, padding: '1px 6px', borderRadius: 3 }}>
              {t.spike}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Live signal mockup row ────────────────────────────────────────────────────
const SIGNALS = [
  { symbol: 'NVDA', dir: 'BULLISH', conf: 92, src: 'r/wallstreetbets', spike: '+45%', up: true },
  { symbol: 'PLTR', dir: 'BULLISH', conf: 88, src: '@OptionsFlow',     spike: '+89%', up: true },
  { symbol: 'AAPL', dir: 'BEARISH', conf: 65, src: 'Financial Times',  spike: '-12%', up: false },
  { symbol: 'TSLA', dir: 'BULLISH', conf: 84, src: 'r/investing',       spike: '+23%', up: true },
  { symbol: 'AMD',  dir: 'BULLISH', conf: 78, src: '@SentimentSam',    spike: '+67%', up: true },
];

function SignalRow({ s, delay = 0 }: { s: typeof SIGNALS[0]; delay?: number }) {
  return (
    <div
      className="animate-fade-up"
      style={{
        animationDelay: `${delay}ms`,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <span className="mono" style={{ fontWeight: 700, color: '#fff', fontSize: 11, width: 40, letterSpacing: '0.03em' }}>{s.symbol}</span>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: s.up ? C.green : C.red,
        background: s.up ? C.greenDim : C.redDim,
        padding: '2px 6px', borderRadius: 3,
      }}>{s.dir}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${s.conf}%`, background: s.up ? C.green : C.red, borderRadius: 2, transition: 'width 1s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
      <span className="mono" style={{ fontSize: 10, color: C.muted, width: 24, textAlign: 'right' }}>{s.conf}%</span>
      <span style={{ fontSize: 10, color: C.faint, width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.src}</span>
      <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: s.up ? C.amber : C.red, width: 40, textAlign: 'right' }}>{s.spike}</span>
    </div>
  );
}

// ── Ticker lookup widget ──────────────────────────────────────────────────────
const TICKER_DB: Record<string, { dir: string; conf: number; mentions: number; spike: string; up: boolean }> = {
  NVDA: { dir: 'BULLISH', conf: 92, mentions: 1204, spike: '+45%', up: true },
  AMD:  { dir: 'BULLISH', conf: 78, mentions: 956,  spike: '+67%', up: true },
  AAPL: { dir: 'BEARISH', conf: 65, mentions: 623,  spike: '-12%', up: false },
  TSLA: { dir: 'BULLISH', conf: 84, mentions: 847,  spike: '+23%', up: true },
  PLTR: { dir: 'BULLISH', conf: 88, mentions: 1103, spike: '+89%', up: true },
  MSFT: { dir: 'BULLISH', conf: 71, mentions: 542,  spike: '+8%',  up: true },
  SPY:  { dir: 'NEUTRAL', conf: 58, mentions: 734,  spike: '+15%', up: true },
  QQQ:  { dir: 'BULLISH', conf: 66, mentions: 489,  spike: '+22%', up: true },
  COIN: { dir: 'BULLISH', conf: 79, mentions: 889,  spike: '+112%', up: true },
};

function TickerLookup() {
  const [val, setVal] = useState('');
  const [result, setResult] = useState<(typeof TICKER_DB[string] & { symbol: string }) | null>(null);

  function lookup(e: FormEvent) {
    e.preventDefault();
    const sym = val.trim().toUpperCase();
    const data = TICKER_DB[sym] ?? { dir: 'LOW ACTIVITY', conf: 11, mentions: 4, spike: '+1%', up: true };
    setResult({ symbol: sym, ...data });
  }

  return (
    <div>
      <form onSubmit={lookup} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={val}
          onChange={e => { setVal(e.target.value); setResult(null); }}
          placeholder="Try NVDA, TSLA, COIN..."
          maxLength={6}
          style={{
            flex: 1, background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 4, padding: '10px 14px',
            color: '#fff', fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase', letterSpacing: '0.06em',
            outline: 'none',
          }}
          onFocus={e => (e.target.style.borderColor = C.amber)}
          onBlur={e => (e.target.style.borderColor = C.border)}
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 18px', flexShrink: 0 }}>Check</button>
      </form>

      {result && (
        <div
          className="animate-fade-up"
          style={{
            marginTop: 8, padding: '10px 14px',
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{result.symbol}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: result.up ? C.green : C.red, background: result.up ? C.greenDim : C.redDim,
            padding: '2px 6px', borderRadius: 3,
          }}>{result.dir}</span>
          <span className="mono" style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{result.mentions.toLocaleString()} mentions</span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: result.up ? C.amber : C.red }}>{result.spike} spike</span>
          <span className="mono" style={{ fontSize: 11, color: C.faint }}>{result.conf}% conf</span>
        </div>
      )}
    </div>
  );
}

// ── Dashboard mockup ──────────────────────────────────────────────────────────
const MOCKUP_TABS = ['Live Signals', 'Predictions', 'Sources'] as const;
type MockupTab = typeof MOCKUP_TABS[number];

const PREDS = [
  { symbol: 'NVDA', target: '$124.50', tf: '2 wks', conf: 87, analyst: 'u/DeepValueDave', hit: null },
  { symbol: 'TSLA', target: '$273.00', tf: '1 mo',  conf: 73, analyst: '@SentimentSam',  hit: true },
  { symbol: 'AMD',  target: '$189.00', tf: '3 wks', conf: 81, analyst: 'r/stocks',        hit: null },
];

const SRCS = [
  { name: 'u/DeepValueDave', plat: 'Reddit', wr: '74.1%', calls: 43,  grade: 'A' },
  { name: '@OptionsFlow',    plat: 'X',      wr: '68.3%', calls: 127, grade: 'B+' },
  { name: 'r/wallstreetbets',plat: 'Reddit', wr: '61.7%', calls: 892, grade: 'B' },
];

function DashboardMockup() {
  const [tab, setTab] = useState<MockupTab>('Live Signals');
  const [visIdx, setVisIdx] = useState(0);

  useEffect(() => {
    if (tab !== 'Live Signals') return;
    const id = setInterval(() => setVisIdx(i => (i + 1) % SIGNALS.length), 3000);
    return () => clearInterval(id);
  }, [tab]);

  const visible = [
    SIGNALS[(visIdx) % SIGNALS.length],
    SIGNALS[(visIdx + 1) % SIGNALS.length],
    SIGNALS[(visIdx + 2) % SIGNALS.length],
  ];

  return (
    <div style={{ position: 'relative' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: '-32px', borderRadius: 24,
        background: 'radial-gradient(ellipse 70% 50% at 60% 50%, rgba(232,168,74,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* App shell */}
      <div style={{
        position: 'relative', borderRadius: 8,
        border: `1px solid ${C.borderHi}`,
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        {/* App shell */}
        <div style={{ background: C.canvas, display: 'flex', height: 320 }}>
          {/* Sidebar */}
          <div style={{ width: 148, borderRight: `1px solid ${C.border}`, padding: '12px 8px', flexShrink: 0, background: 'rgba(255,255,255,0.015)' }}>
            {/* Mini brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 12px', borderBottom: `1px solid ${C.border}`, marginBottom: 8 }}>
              <img src={logoIcon} alt="" style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Street</span>
            </div>
            {(['Live Signals','Predictions','Sources','Alerts','Backtest'] as const).map(item => {
              const active = item === tab;
              return (
                <button
                  key={item}
                  onClick={() => setTab(item as MockupTab)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 8px', borderRadius: 4, border: 'none',
                    background: active ? C.surfaceHi : 'transparent',
                    color: active ? '#fff' : C.muted,
                    fontSize: 11, fontWeight: active ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', marginBottom: 1,
                    fontFamily: "'Geist', system-ui, sans-serif",
                    transition: 'background 0.12s ease, color 0.12s ease',
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: active ? C.amber : 'rgba(255,255,255,0.15)', flexShrink: 0, transition: 'background 0.12s ease' }} />
                  {item}
                </button>
              );
            })}
          </div>

          {/* Main pane */}
          <div style={{ flex: 1, padding: 14, overflow: 'hidden' }}>
            {tab === 'Live Signals' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Live signals</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: C.green }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                    Scanning
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {visible.map((s, idx) => <SignalRow key={`${s.symbol}-${visIdx}-${idx}`} s={s} delay={idx * 60} />)}
                </div>
              </>
            )}

            {tab === 'Predictions' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>AI-extracted predictions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {PREDS.map(p => (
                    <div key={p.symbol} className="animate-fade-up" style={{ padding: '9px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                      <span className="mono" style={{ fontWeight: 700, color: '#fff', width: 38, fontSize: 11, letterSpacing: '0.03em' }}>{p.symbol}</span>
                      <span className="mono" style={{ color: C.amber, fontWeight: 600 }}>{p.target}</span>
                      <span style={{ color: C.faint, fontSize: 10 }}>in {p.tf}</span>
                      <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                        <div style={{ height: '100%', width: `${p.conf}%`, background: 'rgba(99,179,237,0.6)', borderRadius: 1 }} />
                      </div>
                      <span className="mono" style={{ fontSize: 10, color: C.muted }}>{p.conf}%</span>
                      <span style={{ fontSize: 10, color: C.faint, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.analyst}</span>
                      {p.hit !== null ? (
                        <span style={{ fontSize: 9, fontWeight: 700, color: C.green, background: C.greenDim, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Hit</span>
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 500, color: C.muted, background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Open</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'Sources' && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Source leaderboard</span>
                  <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>by win rate</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SRCS.map((s, i) => (
                    <div key={s.name} className="animate-fade-up" style={{ padding: '9px 12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                      <span className="mono" style={{ fontSize: 10, color: C.faint, width: 16 }}>#{i+1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, color: '#fff', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>{s.name}</p>
                        <p style={{ fontSize: 9, color: C.faint }}>{s.plat} · {s.calls} calls</p>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: C.amber,
                        background: C.amberDim, padding: '2px 7px', borderRadius: 3,
                      }}>{s.grade}</span>
                      <span className="mono" style={{ fontSize: 11, color: C.text }}>{s.wr}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(tab as string) === 'Alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: C.amberDim, border: `1px solid rgba(232,168,74,0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                </div>
                <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>Alert feed</p>
                <p style={{ fontSize: 10, color: C.faint, textAlign: 'center', maxWidth: 160 }}>Real-time notifications when signals fire.</p>
              </div>
            )}
            {(tab as string) === 'Backtest' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(99,179,237,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>Strategy backtest</p>
                <p style={{ fontSize: 10, color: C.faint, textAlign: 'center', maxWidth: 160 }}>Test signal quality against historical price action.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating alert badge */}
      <div style={{
        position: 'absolute', top: -12, right: -12,
        background: C.canvas, border: `1px solid rgba(232,168,74,0.3)`,
        borderRadius: 6, padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        zIndex: 10,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.amber, animation: 'pulse-dot 1.5s ease-in-out infinite', flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 1 }}>NVDA spike: +45%</p>
          <p style={{ fontSize: 9, color: C.muted }}>mention velocity alert · 2m ago</p>
        </div>
      </div>
    </div>
  );
}

// ── Icon components (no external dependency) ─────────────────────────────────
function IconScan() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M9 12H3M21 12h-6M12 3v6M12 15v6"/>
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </svg>
  );
}
function IconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
    </svg>
  );
}

// ── Counter ───────────────────────────────────────────────────────────────────
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const run = () => {
      if (started.current) return;
      started.current = true;
      const dur = 2000, t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - t0) / dur, 1);
        setN(Math.floor((1 - Math.pow(1 - p, 3)) * end));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { threshold: 0 });
    if (ref.current) obs.observe(ref.current);
    const fb = setTimeout(run, 600);
    return () => { obs.disconnect(); clearTimeout(fb); };
  }, [end]);
  return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{n.toLocaleString()}{suffix}</span>;
}


// ── Main Landing ──────────────────────────────────────────────────────────────
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": featuredFaqs.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer,
    },
  })),
};

export function Landing() {
  usePageMeta({ title: "Street Insights — AI Stock Sentiment Tracking", description: "Real-time AI-powered stock sentiment analysis. Track market signals, news flow, and social sentiment across your portfolio with Grok-powered intelligence." });
  return (
    <div style={{ minHeight: '100vh', background: C.canvas, color: C.text, fontFamily: "'Geist', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <style>{GLOBAL_CSS}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Skip to content */}
      <a href="#main-content" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>Skip to main content</a>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(8,10,13,0.88)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '0 24px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logoIcon} alt="Street Insights" style={{ height: 26, width: 'auto' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.2 }}>Street Insights</div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1 }}>by Boxford Partners</div>
          </div>
        </div>

        <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {[['#features','Features'],['#how-it-works','How it works']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: C.muted, textDecoration: 'none', transition: 'color 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>{label}</a>
          ))}
          <Link to="/blog" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Blog</Link>
          <Link to="/faq" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>FAQ</Link>
          <Link to="/pricing" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Pricing</Link>
          <Link to="/login" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>Sign in</Link>
          <Link to="/sign-up" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Get access</Link>
        </div>

        <Link to="/sign-up" className="btn-primary hide-desktop" style={{ padding: '8px 14px', fontSize: 12 }}>Get access</Link>
      </nav>

      {/* ── Hero ── */}
      <section id="main-content" className="grid-bg" style={{ paddingTop: 56, minHeight: '92vh', display: 'flex', alignItems: 'center' }}>
        {/* Radial glow centered on right */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 70% at 75% 50%, rgba(232,168,74,0.05) 0%, transparent 60%)',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 64, alignItems: 'center', position: 'relative' }}>

          {/* Left: Copy */}
          <div>
            <div className="animate-fade-up section-label">Market intelligence</div>

            <h1 className="animate-fade-up animate-fade-up-1" style={{
              fontSize: 'clamp(36px, 5.5vw, 60px)',
              fontWeight: 700, lineHeight: 1.05,
              letterSpacing: '-0.032em', color: '#fff',
              textWrap: 'balance', marginBottom: 20,
            }}>
              Track what the street is<br />
              <span style={{ color: C.amber }}>actually saying</span>
            </h1>

            <p className="animate-fade-up animate-fade-up-2" style={{
              fontSize: 17, lineHeight: 1.65, color: C.muted,
              maxWidth: 440, marginBottom: 32, textWrap: 'pretty',
            }}>
              Mention spike detection, AI-extracted predictions, and source credibility scores across Reddit, X, and financial news, before the move happens.
            </p>

            <div className="animate-fade-up animate-fade-up-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <Link to="/sign-up" className="btn-primary" style={{ fontSize: 15, padding: '13px 26px' }}>Start free trial</Link>
              <Link to="/demo" className="btn-ghost" style={{ fontSize: 15, padding: '13px 26px' }}>View demo</Link>
            </div>

            <div className="animate-fade-up animate-fade-up-3" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { stat: '15 min', label: 'scan cadence' },
                { stat: '500+', label: 'sources tracked' },
                { stat: 'AI', label: 'prediction scoring' },
              ].map(({ stat, label }) => (
                <div key={label}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{stat}</div>
                  <div style={{ fontSize: 11, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="animate-fade-up animate-fade-up-2" style={{ position: 'relative' }}>
            {/* Ticker lookup above mockup */}
            <div style={{ marginBottom: 16 }}>
              <TickerLookup />
            </div>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── Ticker bar ── */}
      <TickerBar />

      {/* ── Stats strip ── */}
      <section style={{ padding: '40px 24px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32 }}>
          {[
            { end: 50000, suffix: '+', label: 'mentions tracked daily' },
            { end: 500,   suffix: '+', label: 'sources monitored' },
            { end: 15,    suffix: 'min', label: 'scan interval' },
            { end: 3,     suffix: ' LLMs', label: 'analysis layers' },
          ].map(({ end, suffix, label }) => (
            <div key={label}>
              <div className="mono" style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.035em', lineHeight: 1.05 }}>
                <Counter end={end} suffix={suffix} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <div className="section-label">What it does</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', maxWidth: 520, lineHeight: 1.12, textWrap: 'balance' }}>
              Three things most investors do manually, automated
            </h2>
          </div>

          {/* Asymmetric grid: 2 col top, 1 wide bottom */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
            {[
              {
                icon: <IconScan />,
                accent: C.amber,
                accentDim: C.amberDim,
                title: 'Spike detection',
                body: 'Continuous scan across Reddit, X, and financial news. When mention frequency moves past your threshold, you get an alert, not a headline two hours later.',
                bullets: ['StockTwits, Finnhub, Alpha Vantage feeds', 'Per-ticker spike thresholds', 'Daily digest plus instant push'],
              },
              {
                icon: <IconTrophy />,
                accent: '#63b3ed',
                accentDim: 'rgba(99,179,237,0.08)',
                title: 'Source credibility scoring',
                body: 'Every account that posts a prediction gets a tracked record. Win rate, reasoning quality, and transparency score update after every validated call.',
                bullets: ['Win rate with sample size weighting', 'Lynch/Munger quality framework', 'Leaderboard per platform'],
              },
              {
                icon: <IconBrain />,
                accent: '#a78bfa',
                accentDim: 'rgba(167,139,250,0.08)',
                title: 'AI prediction extraction',
                body: 'Grok runs a bull/bear debate on every substantive mention. Extracts price targets, timeframes, and confidence, then validates outcomes automatically.',
                bullets: ['Structured bull case and bear case', 'Automatic target date validation', 'Price target accuracy tracking'],
              },
            ].map(f => (
              <div key={f.title} style={{
                padding: 36, background: C.surface,
                borderRight: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                transition: 'background 0.15s ease',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = C.surfaceHi)}
                onMouseLeave={e => (e.currentTarget.style.background = C.surface)}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  background: f.accentDim, border: `1px solid ${f.accent}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: f.accent, marginBottom: 20,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.018em', color: '#fff', marginBottom: 10, lineHeight: 1.2 }}>{f.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: C.muted, marginBottom: 20, textWrap: 'pretty' }}>{f.body}</p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {f.bullets.map(b => (
                    <li key={b} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: f.accent, flexShrink: 0, marginTop: 6 }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="section-label">The process</div>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.025em', color: '#fff', marginBottom: 56, textWrap: 'balance', maxWidth: 480 }}>
            From raw post to actionable signal
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', color: C.amber, title: 'Scan', body: 'Worker runs on Fly.io every 15 minutes. Pulls from StockTwits, Finnhub, Alpha Vantage news sentiment, and Reddit when credentials are active. Each mention is deduplicated and stored with platform, timestamp, and raw content.' },
              { n: '02', color: '#63b3ed', title: 'Analyze', body: 'Every unprocessed mention gets routed through a two-path LLM pipeline. Short or low-signal content gets a single Grok pass. Substantive posts with price or time language run through a bull/bear researcher debate, producing a structured verdict.' },
              { n: '03', color: '#a78bfa', title: 'Score', body: "Predictions get a target date. Each night at 9 PM the validator checks closing prices, marks outcomes correct or not, and updates source credibility scores. After enough calls, every tracked account has a real track record." },
              { n: '04', color: C.green, title: 'Alert', body: 'When mention frequency crosses a spike threshold, or a high-confidence prediction fires, you get notified. Email via Resend, or Telegram if configured. No noise, only what crosses your configured bar.' },
            ].map((step, i, arr) => (
              <div key={step.n} style={{ display: 'flex', gap: 24, paddingBottom: i < arr.length - 1 ? 40 : 0, position: 'relative' }}>
                {/* Line connector */}
                {i < arr.length - 1 && (
                  <div style={{ position: 'absolute', left: 19, top: 44, bottom: 0, width: 1, background: C.border }} />
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: 6, flexShrink: 0,
                  background: `${step.color}14`, border: `1px solid ${step.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: step.color }}>{step.n}</span>
                </div>
                <div style={{ paddingTop: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.015em', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.7, color: C.muted, maxWidth: 560, textWrap: 'pretty' }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="section-label">Early access feedback</div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.022em', color: '#fff', marginBottom: 48, textWrap: 'balance' }}>
            From people using the actual product
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 0, border: `1px solid ${C.border}` }}>
            {[
              {
                quote: "Caught the NVDA spike 18 minutes before it showed up in any headline. The mention velocity alert fired while I was still drinking coffee. That's the kind of edge I've been looking for.",
                name: 'Jordan K.', role: 'Options trader, 6 years', initials: 'JK', color: C.amber,
              },
              {
                quote: "The source ranking finally answers who to actually trust. I used to follow accounts with 80k followers who were consistently wrong. Now I filter by win rate with sample size, not follower count.",
                name: 'Marcus T.', role: 'Swing trader, r/stocks', initials: 'MT', color: '#63b3ed',
              },
            ].map(t => (
              <div key={t.name} style={{
                padding: 32, background: C.surface,
                borderRight: `1px solid ${C.border}`,
                borderBottom: `1px solid ${C.border}`,
                display: 'flex', flexDirection: 'column',
              }}>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.7)', flex: 1, marginBottom: 28, textWrap: 'pretty' }}>
                  "{t.quote}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `${t.color}18`, border: `1px solid ${t.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: t.color, flexShrink: 0,
                  }}>{t.initials}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: C.faint }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="section-label">Pricing</div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.022em', color: '#fff', marginBottom: 4 }}>
            One plan. No tiers.
          </h2>
          <p style={{ fontSize: 14, color: C.muted, marginBottom: 36 }}>Early access price, locked in for as long as you stay.</p>

          <div style={{
            border: `1px solid ${C.borderHi}`,
            borderRadius: 6, overflow: 'hidden',
          }}>
            <div style={{ padding: '28px 28px 24px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>$29</span>
                <span style={{ fontSize: 14, color: C.muted }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: C.faint }}>Cancel anytime. No contracts.</p>
            </div>
            <div style={{ padding: 28 }}>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  'Spike detection across all sources',
                  'AI prediction extraction and scoring',
                  'Source credibility leaderboard',
                  'Alert delivery via email and Telegram',
                  'Strategy backtest engine',
                  'Early access price locked for life',
                ].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 3 }}>
                      <path d="M2 6l3 3 5-5" stroke={C.amber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/sign-up" className="btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%', padding: '13px 0' }}>
                Start free trial
              </Link>
              <p style={{ textAlign: 'center', fontSize: 12, color: C.faint, marginTop: 12 }}>No credit card required for trial</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '80px 24px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div className="section-label">Questions</div>
          <h2 style={{ fontSize: 'clamp(22px, 2.8vw, 32px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', marginBottom: 40 }}>Common questions</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {featuredFaqs.map((faq, i) => (
              <details key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <summary style={{
                  padding: '18px 0', cursor: 'pointer', listStyle: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.8)',
                }}>
                  {faq.question}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s ease' }}>
                    <path d="M3 5l4 4 4-4" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </summary>
                <div style={{ paddingBottom: 18, fontSize: 14, lineHeight: 1.75, color: C.muted, textWrap: 'pretty' }}>{faq.answer}</div>
              </details>
            ))}
            <div style={{ borderTop: `1px solid ${C.border}` }} />
          </div>
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link to="/faq" style={{ fontSize: 13, fontWeight: 600, color: C.amber, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
              See all frequently asked questions &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="grid-bg" style={{ padding: '100px 24px', borderTop: `1px solid ${C.border}`, position: 'relative', textAlign: 'center' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 80% at 50% 50%, rgba(232,168,74,0.05) 0%, transparent 70%)',
        }} />
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
          <div className="section-label" style={{ textAlign: 'center' }}>Get started</div>
          <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.08, marginBottom: 16, textWrap: 'balance' }}>
            Know before the headline.
          </h2>
          <p style={{ fontSize: 16, color: C.muted, marginBottom: 36 }}>Join traders using Street Insights to catch spikes before they make news.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/sign-up" className="btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>Start free trial</Link>
            <Link to="/demo" className="btn-ghost" style={{ fontSize: 15, padding: '13px 28px' }}>View demo</Link>
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: C.faint }}>No credit card required</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <LandingFooter />
    </div>
  );
}
