import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const CheckIcon = () => (
  <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
  </svg>
);

const plans = [
  {
    name: "Starter",
    price: 0,
    tagline: "Get started with the basics",
    nameColor: "text-gray-400",
    features: [
      "Track up to 10 tickers",
      "Basic sentiment signals",
      "5 email alerts/month",
      "Daily digest email",
    ],
  },
  {
    name: "Pro",
    price: 99,
    tagline: "For serious traders",
    nameColor: "text-emerald-400",
    popular: true,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    features: [
      { text: "Track up to 100 tickers" },
      { text: "ML price predictions", bold: true },
      { text: "Technical indicators (RSI, MACD)", boldPrefix: "Technical indicators" },
      { text: "50 real-time alerts/month" },
      { text: "Source credibility rankings" },
      { text: "Advanced charts & fundamentals" },
    ],
  },
  {
    name: "Enterprise",
    price: 299,
    tagline: "For teams and funds",
    nameColor: "text-gray-400",
    priceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY,
    features: [
      { text: "Unlimited tickers", boldPrefix: "Unlimited" },
      { text: "Everything in Pro" },
      { text: "Unlimited alerts", boldPrefix: "Unlimited" },
      { text: "API access" },
      { text: "Webhook integrations" },
      { text: "Priority support" },
    ],
  },
];

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, cancel anytime from your dashboard. Your access continues until the end of your billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards through Stripe. Enterprise customers can pay via invoice.",
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Starter lets you track up to 10 tickers with basic sentiment. Pro unlocks ML price predictions, technical indicators, 100 tickers, and 50 real-time alerts per month.",
  },
  {
    q: "What's included in ML predictions?",
    a: "Our ML models analyze sentiment, mention velocity, source credibility, and technical indicators to predict 24-hour and 7-day price movements with confidence scores.",
  },
];

export function Pricing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelectPlan = (priceId?: string) => {
    if (!priceId) {
      navigate("/sign-up");
      return;
    }
    navigate(`/sign-up?plan=${priceId}`);
  };

  return (
    <div
      className="min-h-screen text-white antialiased"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        backgroundColor: "#030712",
      }}
    >
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50" style={{ backgroundColor: "rgba(3,7,18,0.8)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgb(31,41,55)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href="https://getstreetinsights.com" className="flex items-center gap-2">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-xl font-bold">Street Insights</span>
            </a>
            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-4">
              <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Sign In</Link>
              <a href="#plans" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors">Get Started</a>
            </div>
            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 text-gray-300 hover:text-white"
              aria-label="Toggle menu"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
          {/* Mobile menu */}
          {mobileOpen && (
            <div className="sm:hidden border-t border-gray-800 py-4 space-y-3">
              <Link to="/login" className="block text-sm text-gray-300 hover:text-white transition-colors">Sign In</Link>
              <a href="#plans" className="block w-full text-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors">Get Started</a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-400">
            Choose the plan that fits your trading style.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="plans" className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-2xl flex flex-col ${
                  plan.popular
                    ? "border-2 border-emerald-500 relative"
                    : "border border-gray-800"
                }`}
                style={{ backgroundColor: "rgb(17,24,39)" }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 rounded-full text-xs font-semibold">
                    MOST POPULAR
                  </div>
                )}

                <h3 className={`text-lg font-semibold mb-2 ${plan.nameColor}`}>{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <p className="text-gray-400 mb-6">{plan.tagline}</p>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => {
                    const text = typeof feature === "string" ? feature : feature.text;
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckIcon />
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.priceId)}
                  className={`block w-full py-3 text-center rounded-lg transition-colors ${
                    plan.popular
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      : "border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium"
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4" style={{ backgroundColor: "rgba(17,24,39,0.5)" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-gray-800 pb-6">
                <h3 className="text-lg font-semibold mb-2">{faq.q}</h3>
                <p className="text-gray-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: "#020617", borderTop: "1px solid rgb(15,23,42)" }}>
        <div className="max-w-7xl mx-auto px-6 py-12 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <a href="https://getstreetinsights.com" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="font-bold">Street Insights</span>
            </a>
            <p className="text-xs text-slate-500">
              &copy; 2026 Street Insights. A{" "}
              <a href="https://www.boxfordpartners.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
                Boxford Partners
              </a>{" "}
              product.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
