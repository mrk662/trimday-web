"use client";
import React, { useState } from "react";
import { Lock, Phone, Loader2, AlertCircle, Scissors } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// Using fallbacks to prevent crashes if .env keys are missing during build
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

    // BOUNCER LOGIC: Cleans input to exactly 07XXXXXXXXX format to match DB
    let digits = whatsappNumber.replace(/\D/g, "");
    if (digits.startsWith("44")) digits = "0" + digits.slice(2);
    if (digits.length > 0 && !digits.startsWith("0")) digits = "0" + digits;
    const cleanNumber = digits.slice(0, 11);

    try {
      const { data, error: loginError } = await supabase
        .from("shops")
        .select("*")
        .eq("whatsapp_number", cleanNumber)
        .eq("password_hash", password)
        .single();

      if (loginError || !data) throw new Error("Invalid number or password.");
      
      // Prevent login if account isn't active/paid
      if (!data.is_active && data.subscription_status !== "active") {
         throw new Error("Subscription pending. Please complete payment.");
      }

      // Save session locally for persistent login
      localStorage.setItem("barberShopId", data.id);
      window.location.href = "/dashboard";

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-10">
          <div className="bg-black text-white p-4 rounded-2xl inline-block mb-4 shadow-lg">
            <Scissors size={28} />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Barber Login.</h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
            Access your Trimday dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Phone className="absolute left-5 top-5 text-slate-400" size={20} />
            <input
              type="tel"
              placeholder="WhatsApp Number"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="w-full p-5 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-500 font-bold transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-5 top-5 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-5 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none focus:border-blue-500 font-bold transition-all"
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-black text-lg py-5 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-8 text-slate-400 font-bold text-xs">
          New here? <Link href="/join" className="text-blue-600 hover:underline">List your shop</Link>
        </p>
      </div>
    </div>
  );
}