"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { User, Lock, Phone, Scissors, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function RegisterStaffContent() {
  const searchParams = useSearchParams();
  const inviteEmail = searchParams.get("email") || "";
  const shopId = searchParams.get("shop_id") || "";

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    fullName: "",
    whatsapp: ""
  });
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // NEW: Strict Phone Handler
  const handlePhoneInput = (val) => {
    const clean = val.replace(/\D/g, ''); // Removes non-digits
    
    // Safety: Only allow if it starts with '0'
    if (clean.length > 0 && !clean.startsWith('0')) return; 
    
    if (clean.length <= 11) {
      setFormData({...formData, whatsapp: clean});
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // VALIDATION: Hard check for 11 digits and 07 prefix
    if (formData.whatsapp.length !== 11 || !formData.whatsapp.startsWith('07')) {
      return alert("Please enter a valid 11-digit mobile starting with 07.");
    }

    if (formData.password !== formData.confirmPassword) {
      return alert("Passwords do not match!");
    }
    if (formData.password.length < 6) {
      return alert("Password must be at least 6 characters.");
    }

    setLoading(true);

    // 1. Sign up the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: inviteEmail,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          whatsapp: formData.whatsapp
        }
      }
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    // 2. The "Handshake": Link Auth ID to existing barber record
    // CRITICAL UPDATE: Added password_hash so login logic works
    const { error: updateError } = await supabase
      .from("barbers")
      .update({ 
        user_id: authData.user.id, 
        name: formData.fullName,
        whatsapp_number: formData.whatsapp,
        password_hash: formData.password, // FIX: Allows login page to verify the user
        is_available_today: true 
      })
      .eq("email", inviteEmail.toLowerCase())
      .eq("shop_id", shopId);

    if (updateError) {
      console.error("Link error:", updateError.message);
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="bg-white rounded-[3rem] p-12 max-w-md w-full shadow-2xl animate-in zoom-in-95">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-green-600" size={40} />
        </div>
        <h1 className="text-3xl font-black mb-4 tracking-tighter uppercase italic">You're In!</h1>
        <p className="text-slate-500 font-bold mb-8 uppercase text-xs tracking-widest leading-relaxed">
          Account created. You can now log in to see your chair and clients.
        </p>
        <button 
          onClick={() => window.location.href = '/login'} 
          className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all"
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900 text-left">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-100 text-left">
        <div className="bg-blue-600 p-4 rounded-3xl inline-flex mb-8 shadow-lg shadow-blue-200 text-left">
          <Scissors className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-2 uppercase italic text-left">Staff Signup</h1>
        <p className="text-slate-400 font-bold text-[10px] mb-10 uppercase tracking-widest text-left">
          Setting up account for: <span className="text-blue-600 underline lowercase">{inviteEmail}</span>
        </p>

        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <div className="relative text-left">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" placeholder="Your Display Name" required
              className="w-full p-5 pl-14 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-blue-100 transition-all text-left"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
            />
          </div>

          <div className="relative text-left">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="tel" placeholder="07XXXXXXXXX (11 digits)" required
              maxLength={11}
              className="w-full p-5 pl-14 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-blue-100 transition-all text-left"
              value={formData.whatsapp}
              onChange={(e) => handlePhoneInput(e.target.value)}
            />
          </div>

          <div className="relative text-left">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type={showPass ? "text" : "password"} placeholder="Create Password" required
              className="w-full p-5 pl-14 pr-14 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-blue-100 transition-all text-left"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <button 
              type="button" 
              onClick={() => setShowPass(!showPass)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
            >
              {showPass ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>
          </div>

          <div className="relative text-left">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type={showConfirm ? "text" : "password"} placeholder="Confirm Password" required
              className="w-full p-5 pl-14 pr-14 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-blue-100 transition-all text-left"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
            <button 
              type="button" 
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
            >
              {showConfirm ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Complete My Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterStaffPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-400 animate-pulse tracking-widest text-center">
        Loading Secure Invite...
      </div>
    }>
      <RegisterStaffContent />
    </Suspense>
  );
}