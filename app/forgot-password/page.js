"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Mail, ArrowLeft, Loader2, CheckCircle, Scissors } from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Sends the reset email and tells Supabase where to redirect them after they click the link
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100">
        <div className="bg-black text-white p-3 rounded-2xl inline-flex mb-8 shadow-xl">
          <Scissors size={24} />
        </div>

        {!sent ? (
          <>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-slate-900">Forgot Password?</h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 leading-relaxed">
              Enter your admin email address and we'll send you a secure link to reset your dashboard access.
            </p>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-5 text-slate-400" size={20} />
                <input
                  type="email"
                  required
                  placeholder="Admin Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-5 pl-14 rounded-2xl border-2 bg-slate-50 border-slate-100 outline-none focus:border-blue-600 transition-all font-semibold text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all uppercase italic flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black italic uppercase mb-2 text-slate-900">Email Sent!</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 leading-relaxed">
              Check your inbox (and spam folder) for the secure reset link.
            </p>
          </div>
        )}

        <Link href="/login" className="mt-8 flex items-center justify-center gap-2 text-slate-400 font-black text-[10px] uppercase hover:text-blue-600 transition-colors tracking-widest italic">
          <ArrowLeft size={14} /> Back to Login
        </Link>
      </div>
    </div>
  );
}