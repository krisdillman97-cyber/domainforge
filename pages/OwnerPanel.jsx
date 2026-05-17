import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { OwnerConfig, ApprovedDevice, TermuxSession, Domain, HostingAccount, Order, User } from "@/api/entities";
import { getCurrentUser } from "@/api/auth";
import { createPagesBrowserClient } from "@/api/functions";

const functionsClient = createPagesBrowserClient();

// Generate a browser fingerprint from available signals
function getBrowserFingerprint() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = "14px Arial";
  ctx.fillText("fingerprint", 2, 2);
  const canvasData = canvas.toDataURL();

  const signals = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency,
    canvasData.slice(-50),
  ].join("|");

  let hash = 0;
  for (let i = 0; i < signals.length; i++) {
    const char = signals.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export default function OwnerPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Data
  const [configs, setConfigs] = useState({});
  const [devices, setDevices] = useState([]);
  const [termuxSessions, setTermuxSessions] = useState([]);
  const [domains, setDomains] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [hosting, setHosting] = useState([]);

  // UI State
  const [saving, setSaving] = useState(false);
  const [generatingSession, setGeneratingSession] = useState(false);
  const [newSessionToken, setNewSessionToken] = useState(null);
  const [setupCommand, setSetupCommand] = useState("");
  const [editedConfigs, setEditedConfigs] = useState({});
  const [fingerprint] = useState(() => getBrowserFingerprint());
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [showRegisterDevice, setShowRegisterDevice] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
      if (!u || u.role !== "admin") {
        setAuthChecked(true);
        return;
      }
      setIsOwner(true);

      // Check device
      const authRes = await functionsClient.ownerAuth({
        action: "check",
        device_fingerprint: fingerprint,
        ip_address: "",
        user_agent: navigator.userAgent,
      });

      setIsApproved(authRes.can_access_owner_panel);
      setAuthChecked(true);

      if (authRes.can_access_owner_panel) {
        loadAllData();
      }
    } catch (e) {
      console.error(e);
      setAuthChecked(true);
    }
  };

  const loadAllData = async () => {
    try {
      const [allConfigs, devs, sessions, doms, ords, usrs, host] = await Promise.all([
        functionsClient.ownerConfig({ action: "get_all" }),
        functionsClient.ownerAuth({ action: "list_devices" }),
        functionsClient.termuxBridge({ action: "list_sessions" }),
        Domain.list(),
        Order.list(),
        User.list(),
        HostingAccount.list(),
      ]);

      // Convert configs array to object map
      const configMap = {};
      const configValues = {};
      (allConfigs.configs || []).forEach((c) => {
        configMap[c.key] = c;
        configValues[c.key] = c.value;
      });
      setConfigs(configMap);
      setEditedConfigs(configValues);
      setDevices(devs.devices || []);
      setTermuxSessions(sessions.sessions || []);
      setDomains(doms);
      setOrders(ords);
      setUsers(usrs);
      setHosting(host);
    } catch (e) {
      console.error(e);
    }
  };

  const saveConfig = async (key, value) => {
    setSaving(true);
    try {
      await functionsClient.ownerConfig({ action: "set", key, value });
      setConfigs((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const saveAllConfigs = async () => {
    setSaving(true);
    try {
      const configsToSave = Object.entries(editedConfigs).map(([key, value]) => ({ key, value }));
      await functionsClient.ownerConfig({ action: "bulk_set", configs: configsToSave });
      await loadAllData();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const registerCurrentDevice = async () => {
    setRegisteringDevice(true);
    try {
      const res = await functionsClient.ownerAuth({
        action: "register_device",
        device_fingerprint: fingerprint,
        device_name: newDeviceName || "My Device",
        user_agent: navigator.userAgent,
        platform: /Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "web",
      });
      if (res.success) {
        setIsApproved(true);
        setShowRegisterDevice(false);
        loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
    setRegisteringDevice(false);
  };

  const generateTermuxSession = async () => {
    setGeneratingSession(true);
    try {
      const res = await functionsClient.termuxBridge({
        action: "create_session",
        device_name: "Termux",
      });
      setNewSessionToken(res.session_token);
      setSetupCommand(res.setup_command);
    } catch (e) {
      console.error(e);
    }
    setGeneratingSession(false);
  };

  const revokeDevice = async (deviceId) => {
    await functionsClient.ownerAuth({ action: "revoke_device", device_id: deviceId });
    setDevices(devices.map((d) => (d.id === deviceId ? { ...d, is_active: false } : d)));
  };

  const revokeSession = async (sessionId) => {
    await functionsClient.termuxBridge({ action: "revoke_session", session_id: sessionId });
    setTermuxSessions(termuxSessions.map((s) => (s.id === sessionId ? { ...s, status: "revoked" } : s)));
  };

  // ═══════════════════════════════════════════════
  // AUTH GATES
  // ═══════════════════════════════════════════════
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Verifying identity...</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-white text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">This panel is restricted to the platform owner.</p>
          <button onClick={() => navigate("/")} className="bg-purple-600 text-white px-6 py-2 rounded-xl">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-purple-500/30 rounded-3xl p-8 text-center">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-white text-xl font-bold mb-2">Device Not Approved</h2>
          <p className="text-slate-400 mb-2">
            This device is not approved for Owner Panel access.
          </p>
          <p className="text-slate-500 text-sm mb-6">
            Device fingerprint: <code className="text-purple-400">{fingerprint}</code>
          </p>

          {!showRegisterDevice ? (
            <button
              onClick={() => setShowRegisterDevice(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl"
            >
              Register This Device
            </button>
          ) : (
            <div className="space-y-3 text-left">
              <input
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
                placeholder="Device name (e.g. My MacBook, Termux Phone)"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm"
              />
              <button
                onClick={registerCurrentDevice}
                disabled={registeringDevice}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
              >
                {registeringDevice ? "Registering..." : "Approve This Device"}
              </button>
              <p className="text-slate-500 text-xs text-center">
                This will register the current browser as an approved owner device.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // MAIN OWNER PANEL
  // ═══════════════════════════════════════════════
  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "branding", label: "Branding", icon: "🎨" },
    { id: "pricing", label: "Pricing & Backend", icon: "⚙️" },
    { id: "devices", label: "Devices", icon: "📱" },
    { id: "termux", label: "Termux Bridge", icon: "💻" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "domains", label: "All Domains", icon: "🌐" },
    { id: "orders", label: "Orders", icon: "📋" },
  ];

  const revenue = orders.filter((o) => o.status === "paid").reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <div className="w-60 bg-slate-900 border-r border-white/10 flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-sm">
              👑
            </div>
            <div>
              <div className="text-white text-sm font-bold">Owner Panel</div>
              <div className="text-slate-500 text-xs truncate">{user?.email}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors ${
                activeTab === tab.id
                  ? "bg-purple-600/30 text-purple-300 border border-purple-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => navigate("/")}
            className="w-full text-slate-400 hover:text-white text-sm px-3 py-2 rounded-xl hover:bg-white/5 text-left"
          >
            ← Back to Site
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-6">Platform Overview</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Domains", value: domains.length, icon: "🌐", color: "purple" },
                  { label: "Total Users", value: users.length, icon: "👥", color: "blue" },
                  { label: "Active Hosting", value: hosting.filter((h) => h.status === "active").length, icon: "🖥️", color: "green" },
                  { label: "Total Revenue", value: `$${revenue.toFixed(2)}`, icon: "💰", color: "yellow" },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-2xl font-bold text-white">{s.value}</div>
                    <div className="text-slate-400 text-sm">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Recent Orders</h3>
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <div className="text-slate-200 text-sm">{o.item_name}</div>
                        <div className="text-slate-500 text-xs">{o.user_email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-sm">${o.amount?.toFixed(2)}</div>
                        <div className={`text-xs ${o.status === "paid" ? "text-green-400" : "text-yellow-400"}`}>{o.status}</div>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && <p className="text-slate-500 text-sm">No orders yet</p>}
                </div>

                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-4">Approved Devices</h3>
                  {devices.filter((d) => d.is_active).map((d) => (
                    <div key={d.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <div>
                        <div className="text-slate-200 text-sm">{d.device_name}</div>
                        <div className="text-slate-500 text-xs">{d.platform} · Last seen {d.last_seen ? new Date(d.last_seen).toLocaleDateString() : "never"}</div>
                      </div>
                    </div>
                  ))}
                  {devices.filter((d) => d.is_active).length === 0 && (
                    <p className="text-slate-500 text-sm">No approved devices</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── BRANDING ── */}
          {activeTab === "branding" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Branding & Appearance</h1>
                <button
                  onClick={saveAllConfigs}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save All"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["site_name", "site_tagline", "primary_color", "accent_color", "logo_url", "support_email"].map((key) => {
                  const config = configs[key] || {};
                  return (
                    <div key={key} className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                      <label className="text-white font-semibold block mb-1">{config.label || key}</label>
                      <p className="text-slate-500 text-xs mb-3">{config.description}</p>
                      <div className="flex gap-2">
                        {key.includes("color") && (
                          <input
                            type="color"
                            value={editedConfigs[key] || "#6366f1"}
                            onChange={(e) => setEditedConfigs({ ...editedConfigs, [key]: e.target.value })}
                            className="w-12 h-10 rounded cursor-pointer bg-transparent border-0"
                          />
                        )}
                        <input
                          type="text"
                          value={editedConfigs[key] || ""}
                          onChange={(e) => setEditedConfigs({ ...editedConfigs, [key]: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Preview */}
              <div className="mt-6 bg-slate-900 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Live Preview</h3>
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ background: `linear-gradient(135deg, ${editedConfigs.primary_color || "#6366f1"}33, ${editedConfigs.accent_color || "#8b5cf6"}33)` }}
                >
                  {editedConfigs.logo_url && (
                    <img src={editedConfigs.logo_url} alt="Logo" className="h-12 mx-auto mb-4 object-contain" />
                  )}
                  <h2 className="text-2xl font-bold text-white">{editedConfigs.site_name || "Your Site"}</h2>
                  <p className="text-slate-300 mt-1">{editedConfigs.site_tagline || "Your tagline here"}</p>
                  <button
                    className="mt-4 px-6 py-2 rounded-xl text-white font-semibold text-sm"
                    style={{ background: editedConfigs.primary_color || "#6366f1" }}
                  >
                    Sample Button
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── PRICING & BACKEND ── */}
          {activeTab === "pricing" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Backend Configuration</h1>
                <button
                  onClick={saveAllConfigs}
                  disabled={saving}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save All"}
                </button>
              </div>

              <div className="space-y-4">
                {["registrar_api_provider", "registrar_api_key", "registrar_api_username", "stripe_publishable_key", "stripe_secret_key", "maintenance_mode", "allow_registrations", "notification_email"].map((key) => {
                  const config = configs[key] || {};
                  const isSecret = config.is_secret;
                  return (
                    <div key={key} className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                      <div className="flex items-start justify-between mb-1">
                        <label className="text-white font-semibold">{config.label || key}</label>
                        {isSecret && (
                          <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs px-2 py-0.5 rounded-full">
                            🔒 Secret
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mb-3">{config.description}</p>
                      {key === "registrar_api_provider" ? (
                        <select
                          value={editedConfigs[key] || "sandbox"}
                          onChange={(e) => setEditedConfigs({ ...editedConfigs, [key]: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm"
                        >
                          {["sandbox", "namecheap", "opensrs", "enom", "resellerclub"].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : key === "maintenance_mode" || key === "allow_registrations" ? (
                        <select
                          value={editedConfigs[key] || "false"}
                          onChange={(e) => setEditedConfigs({ ...editedConfigs, [key]: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : (
                        <input
                          type={isSecret ? "password" : "text"}
                          value={editedConfigs[key] || ""}
                          onChange={(e) => setEditedConfigs({ ...editedConfigs, [key]: e.target.value })}
                          placeholder={isSecret ? "Enter secret value..." : ""}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 text-sm focus:border-purple-500 outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── DEVICES ── */}
          {activeTab === "devices" && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Device Management</h1>
              <p className="text-slate-400 mb-6">Only approved devices can access this Owner Panel</p>

              <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <div>
                    <div className="text-white text-sm font-semibold">Current Device</div>
                    <div className="text-slate-400 text-xs">Fingerprint: <code className="text-purple-400">{fingerprint}</code></div>
                  </div>
                  <span className="ml-auto bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-2 py-1 rounded-full">
                    Approved ✓
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {devices.map((d) => (
                  <div key={d.id} className={`bg-slate-900 border rounded-2xl p-5 flex items-center justify-between ${d.is_active ? "border-white/10" : "border-white/5 opacity-50"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${d.is_active ? "bg-green-400" : "bg-slate-600"}`}></div>
                      <div>
                        <div className="text-white font-semibold">{d.device_name}</div>
                        <div className="text-slate-400 text-sm">{d.platform} · {d.ip_address || "unknown IP"}</div>
                        <div className="text-slate-500 text-xs">
                          Approved {d.approved_at ? new Date(d.approved_at).toLocaleDateString() : "N/A"} ·
                          Last seen {d.last_seen ? new Date(d.last_seen).toLocaleDateString() : "never"}
                        </div>
                        {d.notes && <div className="text-slate-500 text-xs mt-1">{d.notes}</div>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {d.device_fingerprint === fingerprint && (
                        <span className="text-xs text-purple-400">Current</span>
                      )}
                      {d.is_active && d.device_fingerprint !== fingerprint && (
                        <button
                          onClick={() => revokeDevice(d.id)}
                          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-xs px-3 py-1.5 rounded-lg"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {devices.length === 0 && (
                <div className="text-center py-12 text-slate-400">No devices registered yet.</div>
              )}

              {/* Register new device instructions */}
              <div className="mt-6 bg-slate-900 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-2">Add a New Device</h3>
                <p className="text-slate-400 text-sm">
                  Open the Owner Panel (<code className="text-purple-400">/owner</code>) on the new device while logged in as owner. It will prompt you to register automatically.
                </p>
              </div>
            </div>
          )}

          {/* ── TERMUX BRIDGE ── */}
          {activeTab === "termux" && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Termux Bridge</h1>
              <p className="text-slate-400 mb-6">Link your Termux instance to control your registrar from your phone</p>

              {/* Generate Session */}
              <div className="bg-slate-900 border border-purple-500/20 rounded-2xl p-6 mb-6">
                <h3 className="text-white font-semibold mb-2">Generate Termux Session</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Creates a secure token for your Termux to authenticate with this platform.
                </p>
                <button
                  onClick={generateTermuxSession}
                  disabled={generatingSession}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {generatingSession ? "Generating..." : "🔑 Generate Session Token"}
                </button>

                {newSessionToken && (
                  <div className="mt-4">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
                      <div className="text-green-400 font-semibold text-sm mb-1">✓ Session Created!</div>
                      <div className="text-slate-300 text-sm font-mono break-all">{newSessionToken}</div>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-xs">Setup Commands (paste in Termux)</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(setupCommand)}
                          className="text-purple-400 text-xs hover:text-purple-300"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="text-green-300 text-xs overflow-x-auto whitespace-pre-wrap">{setupCommand}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Sessions */}
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-4">Active Sessions</h3>
                {termuxSessions.length === 0 ? (
                  <p className="text-slate-500 text-sm">No sessions yet</p>
                ) : (
                  <div className="space-y-3">
                    {termuxSessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div>
                          <div className="text-white font-semibold">{s.device_name}</div>
                          <div className="text-slate-400 text-sm">
                            Token: <code className="text-purple-400">{s.session_token}</code>
                          </div>
                          <div className="text-slate-500 text-xs">
                            Last active: {s.last_active ? new Date(s.last_active).toLocaleString() : "never"} ·
                            Expires: {s.expires_at ? new Date(s.expires_at).toLocaleString() : "N/A"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            s.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            "bg-red-500/20 text-red-400 border-red-500/30"
                          }`}>
                            {s.status}
                          </span>
                          {s.status === "active" && (
                            <button
                              onClick={() => revokeSession(s.id)}
                              className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-3 py-1.5 rounded-lg"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Usage Instructions */}
              <div className="mt-6 bg-slate-900 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-semibold mb-3">Termux Usage Guide</h3>
                <div className="space-y-3 text-sm text-slate-300">
                  <div>
                    <div className="text-purple-400 font-mono mb-1"># Install required tools</div>
                    <pre className="bg-slate-800 rounded-lg p-3 text-xs text-green-300">pkg install curl jq</pre>
                  </div>
                  <div>
                    <div className="text-purple-400 font-mono mb-1"># Test connection</div>
                    <pre className="bg-slate-800 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{`curl -s -X POST "$REGISTRAR_URL/termuxBridge" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"ping","session_token":"'$REGISTRAR_TOKEN'"}' | jq`}</pre>
                  </div>
                  <div>
                    <div className="text-purple-400 font-mono mb-1"># Send command result</div>
                    <pre className="bg-slate-800 rounded-lg p-3 text-xs text-green-300 overflow-x-auto">{`curl -s -X POST "$REGISTRAR_URL/termuxBridge" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"send_command_result","session_token":"'$REGISTRAR_TOKEN'","command":"ls -la"}' | jq`}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === "users" && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-6">User Management</h1>
              <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left px-5 py-3">User</th>
                      <th className="text-left px-5 py-3">Role</th>
                      <th className="text-left px-5 py-3">Joined</th>
                      <th className="text-right px-5 py-3">Domains</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-5 py-3">
                          <div className="text-white font-semibold">{u.full_name || u.email}</div>
                          <div className="text-slate-400 text-xs">{u.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            u.role === "admin"
                              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                          }`}>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">
                          {u.created_date ? new Date(u.created_date).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-300">
                          {domains.filter((d) => d.owner_id === u.id).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="text-center py-12 text-slate-400">No users yet</div>
                )}
              </div>
            </div>
          )}

          {/* ── ALL DOMAINS ── */}
          {activeTab === "domains" && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-6">All Domains ({domains.length})</h1>
              <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left px-5 py-3">Domain</th>
                      <th className="text-left px-5 py-3">Owner</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-left px-5 py-3">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains.map((d) => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-5 py-3 text-white font-semibold">{d.name}.{d.tld}</td>
                        <td className="px-5 py-3 text-slate-400">{d.owner_email || "N/A"}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border capitalize ${
                            d.status === "registered" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            d.status === "expired" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">
                          {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {domains.length === 0 && (
                  <div className="text-center py-12 text-slate-400">No domains registered yet</div>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === "orders" && (
            <div>
              <h1 className="text-2xl font-bold text-white mb-6">All Orders ({orders.length})</h1>
              <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="text-left px-5 py-3">Item</th>
                      <th className="text-left px-5 py-3">Customer</th>
                      <th className="text-left px-5 py-3">Type</th>
                      <th className="text-left px-5 py-3">Amount</th>
                      <th className="text-left px-5 py-3">Status</th>
                      <th className="text-left px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-5 py-3 text-white">{o.item_name}</td>
                        <td className="px-5 py-3 text-slate-400">{o.user_email}</td>
                        <td className="px-5 py-3 text-slate-400 capitalize text-xs">{o.type?.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3 text-white font-semibold">${o.amount?.toFixed(2)}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            o.status === "paid" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                            o.status === "failed" ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-400">{new Date(o.created_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-center py-12 text-slate-400">No orders yet</div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
