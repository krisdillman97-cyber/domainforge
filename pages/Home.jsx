import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HostingPlan } from "@/api/entities";

export default function Home() {
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    HostingPlan.filter({ is_active: true }).then(setPlans).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const features = [
    { icon: "🔒", title: "Free SSL", desc: "Every domain comes with a free SSL certificate" },
    { icon: "⚡", title: "Instant Activation", desc: "Domains activate within minutes of purchase" },
    { icon: "🌐", title: "DNS Management", desc: "Full DNS control with easy-to-use editor" },
    { icon: "🔄", title: "Auto-Renewal", desc: "Never lose a domain with automatic renewal" },
    { icon: "🛡️", title: "WHOIS Privacy", desc: "Protect your personal info from public records" },
    { icon: "📞", title: "24/7 Support", desc: "Expert support whenever you need it" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 to-indigo-800/20 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-2 text-purple-300 text-sm mb-6">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
            Domain Registration & Hosting
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight">
            Your Domain.{" "}
            <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Your Rules.
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Find the perfect domain name and get your site online in minutes. Blazing fast hosting included.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-3 p-2 bg-white/10 backdrop-blur border border-white/20 rounded-2xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for your perfect domain..."
                className="flex-1 bg-transparent text-white placeholder-slate-400 px-4 py-3 outline-none text-lg"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 disabled:opacity-50"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {/* Popular TLDs */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[".com", ".net", ".io", ".ai", ".app", ".dev", ".co", ".xyz"].map((tld) => (
              <button
                key={tld}
                onClick={() => {
                  if (query) navigate(`/search?q=${encodeURIComponent(query)}`);
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
              >
                {tld}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything you need to go online
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/8 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hosting Plans Preview */}
      {plans.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-white text-center mb-4">Hosting Plans</h2>
          <p className="text-slate-400 text-center mb-12">Fast, reliable hosting for every need</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 border transition-all hover:scale-105 ${
                  i === 1
                    ? "bg-gradient-to-b from-purple-600 to-indigo-700 border-purple-500 shadow-xl shadow-purple-500/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                {i === 1 && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                <h3 className="text-white font-bold text-lg mb-2">{plan.name}</h3>
                <div className="text-3xl font-black text-white mb-1">
                  ${plan.price_monthly}
                  <span className="text-sm font-normal text-slate-300">/mo</span>
                </div>
                <p className="text-slate-300 text-sm mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {(plan.features || []).slice(0, 3).map((f) => (
                    <li key={f} className="text-slate-300 text-sm flex items-center gap-2">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/hosting")}
                  className={`w-full py-2 rounded-xl font-semibold text-sm transition-colors ${
                    i === 1
                      ? "bg-white text-purple-700 hover:bg-slate-100"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-3xl p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-slate-300 mb-8">Search for your domain and be online in minutes.</p>
          <button
            onClick={() => document.querySelector("input")?.focus()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-all"
          >
            Search Domains →
          </button>
        </div>
      </div>
    </div>
  );
}
