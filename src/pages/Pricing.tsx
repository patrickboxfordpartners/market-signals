import { Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const plans = [
  {
    name: "Pro",
    monthlyPrice: 99,
    yearlyPrice: 950,
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY,
    features: [
      "Real-time market signals",
      "Advanced analytics",
      "Alert notifications",
      "Historical data access",
      "AI-powered insights",
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: 299,
    yearlyPrice: 2870,
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_MONTHLY,
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE_YEARLY,
    popular: true,
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Priority support",
      "Team collaboration",
      "Advanced backtesting",
      "White-label options",
    ],
  },
];

export function Pricing() {
  const navigate = useNavigate();

  const handleSelectPlan = (priceId: string) => {
    navigate(`/sign-up?plan=${priceId}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-xl font-bold">Street Insights</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Sign In</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-sm text-emerald-400 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Choose the plan that fits your needs
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold mb-6 tracking-tight">
            <span className="block">Simple, Transparent</span>
            <span className="block text-emerald-400">Pricing</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-16">
            Get started with real-time market intelligence and AI-powered insights
          </p>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl ${
                  plan.popular
                    ? "bg-gray-800 border-2 border-emerald-500"
                    : "bg-gray-900/50 border border-gray-800"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-emerald-500 text-sm font-semibold rounded-full text-gray-950">
                      Most Popular
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>

                <div className="mb-8">
                  <span className="text-5xl font-bold">${plan.monthlyPrice}</span>
                  <span className="text-gray-400">/month</span>
                  <p className="text-sm text-gray-500 mt-2">
                    or ${plan.yearlyPrice}/year (save {Math.round(((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100)}%)
                  </p>
                </div>

                <ul className="space-y-4 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.priceIdMonthly)}
                  className={`w-full py-4 px-6 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          <p className="text-gray-400 mt-12">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
