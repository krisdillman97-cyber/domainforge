import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Order, Domain, HostingAccount } from "@/api/entities";
import { getCurrentUser } from "@/api/auth";

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const cart = state?.cart || [];
  const plan = state?.plan || null;
  const billing = state?.billing || "monthly";

  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", company: "",
    address: "", city: "", state_field: "", zip: "", country: "US",
    card_number: "", card_expiry: "", card_cvv: "", card_name: "",
  });
  const [errors, setErrors] = useState({});
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState(null);

  const domainTotal = cart.reduce((s, d) => s + d.price, 0);
  const planPrice = plan ? (billing === "yearly" ? plan.price_yearly : plan.price_monthly) : 0;
  const subtotal = domainTotal + planPrice;
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const validate = (stepNum) => {
    const errs = {};
    if (stepNum === 1) {
      if (!form.first_name) errs.first_name = "Required";
      if (!form.last_name) errs.last_name = "Required";
      if (!form.email || !form.email.includes("@")) errs.email = "Valid email required";
    }
    if (stepNum === 2) {
      if (!form.card_number || form.card_number.replace(/\s/g, "").length < 13) errs.card_number = "Invalid card number";
      if (!form.card_expiry) errs.card_expiry = "Required";
      if (!form.card_cvv || form.card_cvv.length < 3) errs.card_cvv = "Invalid CVV";
      if (!form.card_name) errs.card_name = "Required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validate(step)) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validate(2)) return;
    setProcessing(true);
    try {
      const user = await getCurrentUser();

      // Create domain records
      for (const d of cart) {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        await Domain.create({
          name: d.name,
          tld: d.tld,
          status: "registered",
          owner_id: user?.id || "",
          owner_email: form.email || user?.email || "",
          registered_at: new Date().toISOString(),
          expires_at: expiry.toISOString(),
          auto_renew: true,
          nameservers: ["ns1.domainforge.com", "ns2.domainforge.com"],
          locked: true,
          privacy_protection: true,
          price_paid: d.price,
        });

        await Order.create({
          user_id: user?.id || "",
          user_email: form.email || user?.email || "",
          type: "domain_registration",
          item_name: d.domain,
          amount: d.price,
          currency: "USD",
          status: "paid",
          notes: `Domain registration for ${d.domain}`,
        });
      }

      // Create hosting account if plan selected
      if (plan) {
        const expiry = new Date();
        billing === "yearly" ? expiry.setFullYear(expiry.getFullYear() + 1) : expiry.setMonth(expiry.getMonth() + 1);

        await HostingAccount.create({
          user_id: user?.id || "",
          user_email: form.email || user?.email || "",
          plan_id: plan.id,
          plan_name: plan.name,
          status: "active",
          primary_domain: cart[0]?.domain || "",
          storage_used_mb: 0,
          bandwidth_used_gb: 0,
          expires_at: expiry.toISOString(),
          auto_renew: true,
          server_ip: "192.168.1.1",
          ftp_username: `user_${Math.random().toString(36).slice(2, 8)}`,
          cpanel_url: "https://cpanel.domainforge.com",
        });

        await Order.create({
          user_id: user?.id || "",
          user_email: form.email || user?.email || "",
          type: "hosting_plan",
          item_name: `${plan.name} Hosting (${billing})`,
          amount: planPrice,
          currency: "USD",
          status: "paid",
        });
      }

      setOrderComplete(true);
      setOrderId("ORD-" + Math.random().toString(36).slice(2, 10).toUpperCase());
    } catch (e) {
      console.error(e);
    }
    setProcessing(false);
  };

  const formatCard = (val) => val.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19);

  if (cart.length === 0 && !plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🛒</div>
          <h2 className="text-white text-xl font-bold mb-4">Your cart is empty</h2>
          <button onClick={() => navigate("/")} className="bg-purple-600 text-white px-6 py-3 rounded-xl">
            Browse Domains
          </button>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-3xl font-black text-white mb-2">Order Complete!</h1>
          <p className="text-slate-400 mb-2">Order ID: <code className="text-purple-400">{orderId}</code></p>
          <p className="text-slate-400 mb-8">A confirmation email has been sent to <strong className="text-white">{form.email}</strong></p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left">
            {cart.map((d) => (
              <div key={d.domain} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-slate-200">{d.domain}</span>
                <span className="text-white">${d.price.toFixed(2)}/yr</span>
              </div>
            ))}
            {plan && (
              <div className="flex justify-between py-2">
                <span className="text-slate-200">{plan.name} Hosting</span>
                <span className="text-white">${planPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
          <button onClick={() => navigate("/dashboard")} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-8 py-3 rounded-xl w-full">
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-16">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white mb-8">Checkout</h1>

        {/* Steps */}
        <div className="flex items-center gap-4 mb-10">
          {["Contact Info", "Payment", "Review"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step > i + 1 ? "bg-green-500 text-white" :
                step === i + 1 ? "bg-purple-600 text-white" :
                "bg-white/10 text-slate-400"
              }`}>
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span className={`text-sm ${step === i + 1 ? "text-white" : "text-slate-400"}`}>{s}</span>
              {i < 2 && <div className="w-12 h-px bg-white/10 ml-2"></div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            {/* Step 1 - Contact */}
            {step === 1 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold text-lg mb-5">Contact Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { field: "first_name", label: "First Name", col: 1 },
                    { field: "last_name", label: "Last Name", col: 1 },
                    { field: "email", label: "Email Address", col: 2, type: "email" },
                    { field: "company", label: "Company (optional)", col: 2 },
                    { field: "address", label: "Address", col: 2 },
                    { field: "city", label: "City", col: 1 },
                    { field: "zip", label: "ZIP Code", col: 1 },
                  ].map(({ field, label, col, type }) => (
                    <div key={field} className={col === 2 ? "col-span-2" : ""}>
                      <label className="text-slate-400 text-xs block mb-1">{label}</label>
                      <input
                        type={type || "text"}
                        value={form[field]}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-purple-500 ${
                          errors[field] ? "border-red-500" : "border-white/10"
                        }`}
                      />
                      {errors[field] && <span className="text-red-400 text-xs">{errors[field]}</span>}
                    </div>
                  ))}
                </div>
                <button onClick={handleNext} className="mt-6 w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold">
                  Continue to Payment →
                </button>
              </div>
            )}

            {/* Step 2 - Payment */}
            {step === 2 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold text-lg mb-5">Payment Details</h2>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-5">
                  <p className="text-blue-300 text-sm">🔒 Your payment info is encrypted and secure. This is a demo — no real charges will be made.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Card Number</label>
                    <input
                      value={form.card_number}
                      onChange={(e) => setForm({ ...form, card_number: formatCard(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm outline-none font-mono ${errors.card_number ? "border-red-500" : "border-white/10"}`}
                      maxLength={19}
                    />
                    {errors.card_number && <span className="text-red-400 text-xs">{errors.card_number}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">Expiry Date</label>
                      <input
                        value={form.card_expiry}
                        onChange={(e) => {
                          let v = e.target.value.replace(/\D/g, "");
                          if (v.length >= 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                          setForm({ ...form, card_expiry: v });
                        }}
                        placeholder="MM/YY"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm outline-none ${errors.card_expiry ? "border-red-500" : "border-white/10"}`}
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs block mb-1">CVV</label>
                      <input
                        value={form.card_cvv}
                        onChange={(e) => setForm({ ...form, card_cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="123"
                        className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm outline-none ${errors.card_cvv ? "border-red-500" : "border-white/10"}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Name on Card</label>
                    <input
                      value={form.card_name}
                      onChange={(e) => setForm({ ...form, card_name: e.target.value })}
                      className={`w-full bg-white/5 border rounded-xl px-4 py-2.5 text-white text-sm outline-none ${errors.card_name ? "border-red-500" : "border-white/10"}`}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="flex-1 bg-white/5 text-white py-3 rounded-xl">
                    ← Back
                  </button>
                  <button onClick={handleNext} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-semibold">
                    Review Order →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 - Review */}
            {step === 3 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-white font-semibold text-lg mb-5">Review Your Order</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Name</span><span className="text-white">{form.first_name} {form.last_name}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Email</span><span className="text-white">{form.email}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Card</span><span className="text-white">•••• {form.card_number.slice(-4)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="flex-1 bg-white/5 text-white py-3 rounded-xl">
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={processing}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                  >
                    {processing ? "Processing..." : `Pay $${total.toFixed(2)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 h-fit">
            <h3 className="text-white font-semibold mb-4">Order Summary</h3>
            {cart.map((d) => (
              <div key={d.domain} className="flex justify-between py-2 border-b border-white/5 text-sm">
                <div>
                  <div className="text-white">{d.domain}</div>
                  <div className="text-slate-500 text-xs">1 year registration</div>
                </div>
                <span className="text-white">${d.price.toFixed(2)}</span>
              </div>
            ))}
            {plan && (
              <div className="flex justify-between py-2 border-b border-white/5 text-sm">
                <div>
                  <div className="text-white">{plan.name} Hosting</div>
                  <div className="text-slate-500 text-xs">{billing === "yearly" ? "Billed annually" : "Billed monthly"}</div>
                </div>
                <span className="text-white">${planPrice.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-white font-bold text-base border-t border-white/10 pt-2 mt-2">
                <span>Total</span><span>${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-slate-500 text-xs">
              <span>🔒</span> Secured by 256-bit SSL encryption
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
