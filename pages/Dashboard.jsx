import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Domain, HostingAccount, Order } from "@/api/entities";
import { getCurrentUser } from "@/api/auth";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [domains, setDomains] = useState([]);
  const [hosting, setHosting] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("domains");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [u, d, h, o] = await Promise.all([
        getCurrentUser(),
        Domain.list(),
        HostingAccount.list(),
        Order.list(),
      ]);
      setUser(u);
      setDomains(d);
      setHosting(h);
      setOrders(o);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const statusColor = (status) => {
    const map = {
      registered: "bg-green-500/20 text-green-400 border-green-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      expired: "bg-red-500/20 text-red-400 border-red-500/30",
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      suspended: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return map[status] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const daysUntilExpiry = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

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
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
              <p className="text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => navigate("/search?q=")}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              + Register Domain
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Domains", value: domains.length, icon: "🌐" },
              { label: "Hosting", value: hosting.length, icon: "🖥️" },
              { label: "Orders", value: orders.length, icon: "📋" },
            ].map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-slate-400 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          {["domains", "hosting", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                activeTab === tab
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Domains Tab */}
        {activeTab === "domains" && (
          <div>
            {domains.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🌐</div>
                <h3 className="text-white text-xl font-semibold mb-2">No domains yet</h3>
                <p className="text-slate-400 mb-6">Search for a domain to get started</p>
                <button
                  onClick={() => navigate("/")}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
                >
                  Search Domains
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {domains.map((domain) => {
                  const days = daysUntilExpiry(domain.expires_at);
                  return (
                    <div
                      key={domain.id}
                      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors cursor-pointer"
                      onClick={() => navigate(`/domain/${domain.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 text-lg">
                            🌐
                          </div>
                          <div>
                            <div className="text-white font-semibold text-lg">
                              {domain.name}.{domain.tld}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {domain.expires_at
                                ? `Expires ${new Date(domain.expires_at).toLocaleDateString()}`
                                : "No expiry set"}
                              {days !== null && days <= 30 && (
                                <span className="ml-2 text-red-400">⚠ {days} days left</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {domain.auto_renew && (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs px-2 py-1 rounded-full">
                              Auto-renew
                            </span>
                          )}
                          {domain.locked && (
                            <span className="text-slate-400 text-sm">🔒</span>
                          )}
                          <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusColor(domain.status)}`}>
                            {domain.status}
                          </span>
                          <span className="text-slate-400 text-sm">→</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Hosting Tab */}
        {activeTab === "hosting" && (
          <div>
            {hosting.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🖥️</div>
                <h3 className="text-white text-xl font-semibold mb-2">No hosting plans yet</h3>
                <p className="text-slate-400 mb-6">Choose a hosting plan to get your site online</p>
                <button
                  onClick={() => navigate("/hosting")}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
                >
                  View Plans
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {hosting.map((h) => (
                  <div key={h.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">{h.primary_domain}</div>
                        <div className="text-slate-400 text-sm">{h.plan_name} Plan</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="text-slate-300">Storage: {h.storage_used_mb || 0} MB used</div>
                          <div className="text-slate-400">Expires {h.expires_at ? new Date(h.expires_at).toLocaleDateString() : "N/A"}</div>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusColor(h.status)}`}>
                          {h.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 bg-white/5 rounded-lg h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg"
                        style={{ width: `${Math.min((h.storage_used_mb || 0) / 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-white text-xl font-semibold mb-2">No orders yet</h3>
                <p className="text-slate-400">Your order history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-semibold">{o.item_name}</div>
                        <div className="text-slate-400 text-sm capitalize">{o.type?.replace(/_/g, " ")}</div>
                        <div className="text-slate-500 text-xs mt-1">{new Date(o.created_date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold">${o.amount?.toFixed(2)}</div>
                        <span className={`text-xs px-3 py-1 rounded-full border capitalize ${statusColor(o.status)}`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
