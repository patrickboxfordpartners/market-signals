import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">Street Insights</h1>
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12 max-w-2xl">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground">
            Get access to real-time market intelligence and AI-powered insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`border rounded-xl p-8 bg-card ${
                plan.popular ? "border-accent shadow-lg" : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-4">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-foreground mb-2">
                {plan.name}
              </h3>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  ${plan.monthlyPrice}
                </span>
                <span className="text-muted-foreground">/month</span>
                <div className="text-sm text-muted-foreground mt-1">
                  or ${plan.yearlyPrice}/year (save{" "}
                  {Math.round(
                    ((plan.monthlyPrice * 12 - plan.yearlyPrice) /
                      (plan.monthlyPrice * 12)) *
                      100
                  )}
                  %)
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <Check
                      className={`h-5 w-5 shrink-0 ${
                        plan.popular ? "text-accent" : "text-muted-foreground"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.priceIdMonthly)}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                  plan.popular
                    ? "bg-accent text-white hover:bg-accent/90"
                    : "bg-foreground text-background hover:bg-foreground/90"
                }`}
              >
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
