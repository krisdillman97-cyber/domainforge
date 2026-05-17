import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HostingPlan } from "@/api/entities";

export default function Hosting() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    HostingPlan.filter({ is_active: true }).then(setPlans).finally(() => setLoading(false));
  }, []);

  const getPrice = (plan) =>
    billing === "monthly" ? plan.price_monthly : (plan.price_yearly / 12).toFixed(2);

  const savings = (plan) =>
    Math.round(100 - ((plan.price_yearly / 12) / plan.price_monthly) * 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-16">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
          Hosting{" "}
          <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Plans
          </span>
        </h1>
        <p className="text-slate-300 text-xl mb-10">
          Fast, reliable hosting for every project size
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              billing === "monthly" ? "bg-purple-600 text-white" : "text-slate-400"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              billing === "yearly" ? "bg-purple-600 text-white" : "text-slate-400"
            }`}
          >
            Yearly{" "}
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full ml-1">
              Save up to 25%
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 border transition-all hover:scale-105 ${
                i === 1
                  ? "bg-gradient-to-b from-purple-600 to-indigo-700 border-purple-400 shadow-2xl shadow-purple-500/30"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              {i === 1 && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-400 text-yellow-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  ⭐ MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                <p className={`text-sm ${i === 1 ? "text-purple-200" : "text-slate-400"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white">${getPrice(plan)}</span>
                  <span className={`text-sm mb-1 ${i === 1 ? "text-purple-200" : "text-slate-400"}`}>/mo</span>
                </div>
                {billing === "yearly" && (
                  <div className="text-green-400 text-sm mt-1">
                    Save {savings(plan)}% · ${plan.price_yearly}/yr billed annually
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-8">
                {[
                  { label: "Storage", value: `${plan.storage_gb} GB` },
                  { label: "Bandwidth", value: `${plan.bandwidth_gb} GB` },
                  { label: "Domains", value: plan.max_domains === 999 ? "Unlimited" : plan.max_domains },
                  { label: "Email Accounts", value: plan.email_accounts === 999 ? "Unlimited" : plan.email_accounts },
                  { label: "Free SSL", value: plan.ssl_included ? "✓" : "✗" },
                ].map((item) => (
                  <div key={item.label} className={`flex justify-between text-sm ${i === 1 ? "text-purple-100" : "text-slate-300"}`}>
                    <span className={i === 1 ? "text-purple-200" : "text-slate-400"}>{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-8">
                {(plan.features || []).map((f) => (
                  <div key={f} className={`flex items-center gap-2 text-sm ${i === 1 ? "text-purple-100" : "text-slate-300"}`}>
                    <span className="text-green-400">✓</span> {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate("/checkout", { state: { plan, billing } })}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  i === 1
                    ? "bg-white text-purple-700 hover:bg-slate-100"
                    : "bg-purple-600 hover:bg-purple-500 text-white"
                }`}
              >
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* Feature comparison note */}
        <div className="mt-16 text-center">
          <p className="text-slate-400 text-sm">
            All plans include free SSL, daily backups, and 99.9% uptime guarantee.
            <br />
            Need something custom?{" "}
            <a href="mailto:support@domainforge.com" className="text-purple-400 hover:text-purple-300">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
