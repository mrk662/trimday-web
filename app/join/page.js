"use client";
import React, { useState } from "react";
import { Camera, CreditCard, CheckCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl || "", supabaseAnon || "");

const STRIPE_LINK = "https://buy.stripe.com/test_14A00j5X14m4eMN9LNgUM00";

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const slugify = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeUkMobile = (input) => {
  const digits = String(input || "").replace(/\D/g, "");
  return digits.startsWith("0") ? digits.slice(1) : digits;
};

export default function JoinPlatform() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [shopName, setShopName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [address, setAddress] = useState("");
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");

  const [createdShopId, setCreatedShopId] = useState(null);

  const canGoStep2 = shopName.trim().length > 1 && normalizeUkMobile(whatsappNumber).length >= 9;
  const canGoStep3 = address.trim().length > 10;

  const handleGoToPayment = async () => {
    const name = shopName.trim();
    const phone = normalizeUkMobile(whatsappNumber);
    const addr = address.trim();
    const photo = shopPhotoUrl?.trim() ? shopPhotoUrl.trim() : null;

    if (!name || !phone || !addr) {
      alert("Please fill Shop Name, WhatsApp Number, and Address.");
      return;
    }

    setLoading(true);

    try {
      const shopId = makeId();

      const baseSlug = slugify(name);
      const slug = `${baseSlug}-${shopId.slice(0, 8)}`; // ✅ unique

      const { error } = await supabase.from("shops").insert(
        [
          {
            id: shopId,
            name,
            slug, // ✅ FIX for NOT NULL slug
            address: addr,
            whatsapp_number: phone,
            shop_photo_url: photo,
            is_active: false,
            subscription_status: "pending",
          },
        ],
        { returning: "minimal" }
      );

      if (error) {
        console.error("Supabase insert error:", error);
        alert(`Failed to save shop.\n\n${error.message || "Unknown error"}`);
        setLoading(false);
        return;
      }

      setCreatedShopId(shopId);

      const url = `${STRIPE_LINK}?client_reference_id=${encodeURIComponent(shopId)}`;
      window.location.href = url;
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Failed to save shop. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-20 px-4">
      <div className="max-w-xl w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${step >= i ? "bg-blue-600" : "bg-slate-100"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-black">List your shop.</h2>
            <p className="text-slate-600 font-medium">
              Be the first barber people see when they need a trim in your area.
            </p>

            <div className="space-y-4 pt-4">
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Shop Name"
                className="w-full p-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 ring-blue-500 text-black"
              />

              <div className="flex gap-2">
                <div className="bg-slate-100 p-4 rounded-2xl text-slate-700 font-bold">+44</div>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="WhatsApp Number (no leading 0)"
                  className="flex-1 p-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 ring-blue-500 text-black"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canGoStep2}
                className="w-full bg-black text-white font-bold py-5 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                Next: Shop Details
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-black">Shop identity.</h2>
            <p className="text-slate-600 font-medium">
              Add your address and optional photo URL (storage can come later).
            </p>

            <div className="space-y-4">
              <div className="rounded-3xl p-5 bg-slate-50 border border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Shop Photo URL (optional)
                </label>
                <div className="flex gap-3 items-center">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3">
                    <Camera className="w-6 h-6 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    value={shopPhotoUrl}
                    onChange={(e) => setShopPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 p-4 rounded-2xl border bg-white outline-none focus:ring-2 ring-blue-500 text-black"
                  />
                </div>
              </div>

              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full Shop Address & Postcode"
                className="w-full p-4 rounded-2xl border bg-slate-50 h-32 outline-none focus:ring-2 ring-blue-500 text-black"
              />

              <button
                onClick={() => setStep(3)}
                disabled={!canGoStep3}
                className="w-full bg-black text-white font-bold py-5 rounded-2xl shadow-lg disabled:opacity-50"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8" />
            </div>

            <h2 className="text-3xl font-black text-black">Secure your spot.</h2>

            <div className="bg-slate-50 p-6 rounded-3xl text-left border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-slate-700">Monthly Plan</span>
                <span className="text-2xl font-black text-black">£20.00</span>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Live barber “on duty” toggle
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  WhatsApp direct bookings
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Ranked near the top in your area
                </li>
              </ul>
            </div>

            <button
              onClick={handleGoToPayment}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-60"
            >
              {loading ? "Redirecting..." : "Start Subscription"}
            </button>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              After payment, your shop will go live automatically once the payment is confirmed.
            </p>

            {createdShopId && <p className="text-[10px] text-slate-400 mt-2">Ref: {createdShopId}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
