import { Check } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import logoIcon from "../assets/logo-icon.png";

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo */}
        <div className="text-center mb-12">
          <img src={logoIcon} alt="" className="h-16 w-auto mx-auto mb-3" />
          <h1 className="text-sm font-bold tracking-tight uppercase">Street Insights</h1>
          <p className="text-xs text-muted-foreground tracking-wider uppercase mt-0.5 mb-8">
            Boxford Partners
          </p>
          <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Plan</h2>
          <p className="text-sm text-muted-foreground">
            Real-time market intelligence and AI-powered insights
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-lg p-6 bg-card ${
                plan.popular ? "border-primary shadow-lg" : "border"
              }`}
            >
              {plan.popular && (
                <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold text-foreground mb-4">
                {plan.name}
              </h3>

              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">
                  ${plan.monthlyPrice}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
                <div className="text-xs text-muted-foreground mt-1">
                  ${plan.yearlyPrice}/yr (save{" "}
                  {Math.round(
                    ((plan.monthlyPrice * 12 - plan.yearlyPrice) /
                      (plan.monthlyPrice * 12)) *
                      100
                  )}
                  %)
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-xs text-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.priceIdMonthly)}
                className={`w-full py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>

        {/* Footer Links */}
        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
