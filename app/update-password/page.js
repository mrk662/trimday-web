"use client";
import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Lock, Loader2, CheckCircle, Eye, EyeOff, Scissors } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Updates the password for the user authenticated by the email link
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      alert("Error: " + error.message);
    } else {
      setDone(true);
      // Auto-redirect to login after 2 seconds
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-left font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100">
        <div className="bg-black text-white p-3 rounded-2xl inline-flex mb-8 shadow-xl">
          <Scissors size={24} />
        </div>

        {!done ? (
          <>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-slate-900">New Password.</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8 leading-relaxed italic">
              Secure your dashboard. Enter at least 8 characters.
            </p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-5 top-5 text-slate-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-5 pl-14 pr-14 rounded-2xl border-2 bg-slate-50 border-slate-100 outline-none focus:border-blue-600 transition-all font-semibold text-slate-900"
                />
                <button 
                   type="button" 
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-5 top-5 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || password.length < 8}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all uppercase italic flex items-center justify-center gap-3 disabled:opacity-30"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Secure My Account"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black italic uppercase mb-2 text-slate-900">Success!</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">
              Your password has been updated. <br/>Redirecting you to login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}