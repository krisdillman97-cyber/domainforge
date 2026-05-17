import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Domain, DnsRecord } from "@/api/entities";

const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"];

export default function DomainManager() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [domain, setDomain] = useState(null);
  const [dnsRecords, setDnsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dns");
  const [newRecord, setNewRecord] = useState({ type: "A", name: "", value: "", ttl: 3600, priority: 10 });
  const [addingRecord, setAddingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameservers, setNameservers] = useState([]);

  useEffect(() => {
    loadDomain();
  }, [id]);

  const loadDomain = async () => {
    try {
      const [d, records] = await Promise.all([
        Domain.get(id),
        DnsRecord.filter({ domain_id: id }),
      ]);
      setDomain(d);
      setDnsRecords(records);
      setNameservers(d.nameservers || ["ns1.domainforge.com", "ns2.domainforge.com"]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const addDnsRecord = async () => {
    if (!newRecord.name || !newRecord.value) return;
    setSaving(true);
    try {
      const created = await DnsRecord.create({
        ...newRecord,
        domain_id: id,
        domain_name: `${domain.name}.${domain.tld}`,
      });
      setDnsRecords([...dnsRecords, created]);
      setNewRecord({ type: "A", name: "", value: "", ttl: 3600, priority: 10 });
      setAddingRecord(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const deleteDnsRecord = async (recordId) => {
    try {
      await DnsRecord.delete(recordId);
      setDnsRecords(dnsRecords.filter((r) => r.id !== recordId));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleLock = async () => {
    const updated = await Domain.update(id, { locked: !domain.locked });
    setDomain(updated);
  };

  const toggleAutoRenew = async () => {
    const updated = await Domain.update(id, { auto_renew: !domain.auto_renew });
    setDomain(updated);
  };

  const togglePrivacy = async () => {
    const updated = await Domain.update(id, { privacy_protection: !domain.privacy_protection });
    setDomain(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Domain not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-16">
      {/* Header */}
      <div className="border-b border-white/10 bg-slate-900/50 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <button onClick={() => navigate("/dashboard")} className="text-slate-400 hover:text-white text-sm mb-3 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{domain.name}.{domain.tld}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full border ${
                  domain.status === "registered" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                }`}>
                  {domain.status}
                </span>
                {domain.locked && <span className="text-slate-400 text-sm">🔒 Locked</span>}
                {domain.auto_renew && <span className="text-blue-400 text-sm">🔄 Auto-renew</span>}
                {domain.privacy_protection && <span className="text-purple-400 text-sm">🛡️ Privacy</span>}
              </div>
            </div>
            <div className="text-right text-sm text-slate-400">
              <div>Registered: {domain.registered_at ? new Date(domain.registered_at).toLocaleDateString() : "N/A"}</div>
              <div>Expires: {domain.expires_at ? new Date(domain.expires_at).toLocaleDateString() : "N/A"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl w-fit">
          {["dns", "nameservers", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                activeTab === tab ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "dns" ? "DNS Records" : tab === "nameservers" ? "Nameservers" : "Settings"}
            </button>
          ))}
        </div>

        {/* DNS Records Tab */}
        {activeTab === "dns" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-lg">DNS Records</h2>
              <button
                onClick={() => setAddingRecord(!addingRecord)}
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-xl"
              >
                + Add Record
              </button>
            </div>

            {addingRecord && (
              <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-5 mb-4">
                <h3 className="text-white font-semibold mb-4">New DNS Record</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Type</label>
                    <select
                      value={newRecord.type}
                      onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      {DNS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Name</label>
                    <input
                      value={newRecord.name}
                      onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
                      placeholder="@ or subdomain"
                      className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 text-xs mb-1 block">Value</label>
                    <input
                      value={newRecord.value}
                      onChange={(e) => setNewRecord({ ...newRecord, value: e.target.value })}
                      placeholder="IP address, hostname, or content"
                      className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">TTL</label>
                    <select
                      value={newRecord.ttl}
                      onChange={(e) => setNewRecord({ ...newRecord, ttl: parseInt(e.target.value) })}
                      className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      <option value={300}>5 min</option>
                      <option value={3600}>1 hour</option>
                      <option value={14400}>4 hours</option>
                      <option value={86400}>1 day</option>
                    </select>
                  </div>
                  {(newRecord.type === "MX" || newRecord.type === "SRV") && (
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Priority</label>
                      <input
                        type="number"
                        value={newRecord.priority}
                        onChange={(e) => setNewRecord({ ...newRecord, priority: parseInt(e.target.value) })}
                        className="w-full bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addDnsRecord}
                    disabled={saving}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Record"}
                  </button>
                  <button onClick={() => setAddingRecord(false)} className="bg-white/10 text-white px-5 py-2 rounded-xl text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {dnsRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No DNS records yet. Add your first record above.</div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left px-4 py-3">Type</th>
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Value</th>
                      <th className="text-left px-4 py-3">TTL</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnsRecords.map((r) => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs font-mono">
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white font-mono">{r.name}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono max-w-xs truncate">{r.value}</td>
                        <td className="px-4 py-3 text-slate-400">{r.ttl}s</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteDnsRecord(r.id)}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Nameservers Tab */}
        {activeTab === "nameservers" && (
          <div>
            <h2 className="text-white font-semibold text-lg mb-4">Nameservers</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <p className="text-slate-400 text-sm mb-4">
                Your domain's nameservers. Change these to point your domain to a different DNS provider.
              </p>
              <div className="space-y-3 mb-6">
                {nameservers.map((ns, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-slate-500 text-sm w-8">NS{i + 1}</span>
                    <input
                      value={ns}
                      onChange={(e) => {
                        const updated = [...nameservers];
                        updated[i] = e.target.value;
                        setNameservers(updated);
                      }}
                      className="flex-1 bg-white/10 border border-white/20 text-white font-mono rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  setSaving(true);
                  await Domain.update(id, { nameservers });
                  setSaving(false);
                }}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm"
              >
                {saving ? "Saving..." : "Save Nameservers"}
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg mb-4">Domain Settings</h2>

            {[
              {
                title: "Domain Lock",
                desc: "Prevent unauthorized transfers by locking your domain",
                value: domain.locked,
                toggle: toggleLock,
                icon: "🔒",
              },
              {
                title: "Auto-Renewal",
                desc: "Automatically renew this domain before it expires",
                value: domain.auto_renew,
                toggle: toggleAutoRenew,
                icon: "🔄",
              },
              {
                title: "WHOIS Privacy",
                desc: "Hide your personal info from public WHOIS records",
                value: domain.privacy_protection,
                toggle: togglePrivacy,
                icon: "🛡️",
              },
            ].map((s) => (
              <div key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{s.icon}</div>
                  <div>
                    <div className="text-white font-semibold">{s.title}</div>
                    <div className="text-slate-400 text-sm">{s.desc}</div>
                  </div>
                </div>
                <button
                  onClick={s.toggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${s.value ? "bg-purple-600" : "bg-slate-600"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${s.value ? "left-7" : "left-1"}`}></div>
                </button>
              </div>
            ))}

            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
              <h3 className="text-red-400 font-semibold mb-2">Danger Zone</h3>
              <p className="text-slate-400 text-sm mb-4">Irreversible actions that affect your domain</p>
              <button className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 px-4 py-2 rounded-xl text-sm transition-colors">
                Initiate Domain Transfer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
