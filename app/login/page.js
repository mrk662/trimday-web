"use client";
import React, { useState } from "react";
import { Lock, Phone, Loader2, AlertCircle, Scissors } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function BarberLogin() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // BOUNCER LOGIC: Cleans input to exactly 07XXXXXXXXX format
    let digits = whatsappNumber.replace(/\D/g, "");
    if (digits.startsWith("44")) digits = "0" + digits.slice(2);
    if (digits.length > 0 && !digits.startsWith("0")) digits = "0" + digits;
    const cleanNumber = digits.slice(0, 11);

    try {
      // --- STEP A: CHECK FOR SHOP OWNER (MASTER) ---
      const { data: shopOwner, error: shopError } = await supabase
        .from("shops")
        .select("*")
        .eq("whatsapp_number", cleanNumber)
        .eq("password_hash", password)
        .single();

      if (shopOwner) {
        // Prevent login if account isn't active/paid
        if (!shopOwner.is_active && shopOwner.subscription_status !== "active") {
           throw new Error("Subscription pending. Please complete payment.");
        }
        localStorage.setItem("barberShopId", shopOwner.id);
        window.location.href = "/dashboard";
        return;
      }

      // --- STEP B: CHECK FOR STAFF (BARBER) ---
      // We check the 'barbers' table using the cleaned phone number and password
      // (Assumes you are using email/pass for staff, but logic here matches your phone-login style)
      const { data: staffMember, error: staffError } = await supabase
        .from("barbers")
        .select("*")
        .eq("whatsapp_number", cleanNumber)
        .eq("password_hash", password) // Ensure staff has a password column in DB
        .single();

      if (staffMember) {
        localStorage.setItem("barberId", staffMember.id);
        localStorage.setItem("barberShopId", staffMember.shop_id);
        window.location.href = "/dashboard/staff/view"; // Direct to their specific chair
        return;
      }

      // If neither found
      throw new Error("Invalid number or password.");

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-10 text-left">
          <div className="bg-black text-white p-4 rounded-2xl inline-block mb-4 shadow-lg text-center">
            <Scissors size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-center">Barber Login.</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 text-center">
            Access your Trimday dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div className="relative text-left">
            <Phone className="absolute left-5 top-5 text-slate-400 text-left" size={20} />
            <input
              type="tel"
              placeholder="WhatsApp Number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full p-5 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-500 font-bold transition-all text-left"
              required
            />
          </div>

          <div className="relative text-left">
            <Lock className="absolute left-5 top-5 text-slate-400 text-left" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-5 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-500 font-bold transition-all text-left"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2 text-left">
              <AlertCircle size={16} className="text-left" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-black text-lg py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 text-center"
          >
            {loading ? <Loader2 className="animate-spin text-center" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-400 font-bold text-xs text-center">
          New here? <Link href="/join" className="text-blue-600 hover:underline">List your shop</Link>
        </p>
      </div>
    </div>
  );
}