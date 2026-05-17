import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Domain } from "@/api/entities";
import { createPagesBrowserClient } from "@/api/functions";

const functionsClient = createPagesBrowserClient();

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [cart, setCart] = useState([]);
  const [selectedTlds, setSelectedTlds] = useState(["com", "net", "org", "io", "co", "app", "dev", "ai", "xyz"]);

  const tldOptions = ["com", "net", "org", "io", "co", "app", "dev", "ai", "xyz", "me", "info", "tech", "store", "online", "live", "news", "biz", "us", "club"];

  useEffect(() => {
    if (query) {
      setSearchInput(query);
      doSearch(query);
    }
  }, [query]);

  const doSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await functionsClient.domainSearch({ query: q, tlds: selectedTlds });
      setResults(res.results || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  const addToCart = (domain) => {
    if (!cart.find((d) => d.domain === domain.domain)) {
      setCart([...cart, domain]);
    }
  };

  const removeFromCart = (domainName) => {
    setCart(cart.filter((d) => d.domain !== domainName));
  };

  const inCart = (domainName) => cart.some((d) => d.domain === domainName);

  const totalPrice = cart.reduce((sum, d) => sum + d.price, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 bg-white/10 border border-white/20 text-white placeholder-slate-400 px-4 py-3 rounded-xl outline-none focus:border-purple-500"
              placeholder="Search another domain..."
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-6">
        {/* Sidebar - TLD filter */}
        <div className="hidden md:block w-56 shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sticky top-24">
            <h3 className="text-white font-semibold mb-4">Extensions</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tldOptions.map((tld) => (
                <label key={tld} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedTlds.includes(tld)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTlds([...selectedTlds, tld]);
                      else setSelectedTlds(selectedTlds.filter((t) => t !== tld));
                    }}
                    className="accent-purple-500"
                  />
                  .{tld}
                </label>
              ))}
            </div>
            <button
              onClick={() => doSearch(searchInput)}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-500 text-white text-sm py-2 rounded-lg"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-300">Searching for {query}...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-bold text-xl">
                  Results for <span className="text-purple-400">"{query}"</span>
                </h2>
                <span className="text-slate-400 text-sm">{results.length} extensions checked</span>
              </div>

              <div className="space-y-3">
                {results.map((r) => (
                  <div
                    key={r.domain}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      r.available
                        ? "bg-white/5 border-white/10 hover:bg-white/8"
                        : "bg-white/2 border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-2 h-2 rounded-full ${r.available ? "bg-green-400" : "bg-red-400"}`}
                      ></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold text-lg">{r.domain}</span>
                          {r.premium && (
                            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30">
                              PREMIUM
                            </span>
                          )}
                        </div>
                        <span className={`text-sm ${r.available ? "text-green-400" : "text-red-400"}`}>
                          {r.available ? "Available" : "Taken"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-white font-bold text-lg">
                        ${r.price.toFixed(2)}<span className="text-slate-400 text-sm font-normal">/yr</span>
                      </span>
                      {r.available && (
                        <button
                          onClick={() => inCart(r.domain) ? removeFromCart(r.domain) : addToCart(r)}
                          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                            inCart(r.domain)
                              ? "bg-green-500/20 border border-green-500/40 text-green-400"
                              : "bg-purple-600 hover:bg-purple-500 text-white"
                          }`}
                        >
                          {inCart(r.domain) ? "✓ Added" : "Add to Cart"}
                        </button>
                      )}
                      {!r.available && (
                        <button className="px-4 py-2 rounded-xl font-semibold text-sm bg-white/5 text-slate-500 cursor-not-allowed">
                          Unavailable
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-800 border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-500/20 p-4 flex items-center gap-6">
            <div>
              <div className="text-white font-semibold">{cart.length} domain{cart.length > 1 ? "s" : ""} selected</div>
              <div className="text-purple-400 font-bold text-lg">${totalPrice.toFixed(2)}/yr</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCart([])}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => navigate("/checkout", { state: { cart } })}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6 py-2 rounded-xl text-sm"
              >
                Checkout →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
