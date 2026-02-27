"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Scissors, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function VerifyContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (email) {
      handleVerification();
    } else {
      setStatus("error");
    }
  }, [email]);

  const handleVerification = async () => {
    try {
      // 🔥 The Fix: Switches the booking from 'unverified' (Yellow) to 'pending' (Active/Green)
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: 'pending' }) 
        .eq("client_email", email.trim().toLowerCase())
        .eq("status", "unverified")
        .select();

      // If no rows were updated, it might already be verified or the link is wrong
      if (error || !data || data.length === 0) {
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-[3rem] shadow-xl p-10 border border-slate-100 animate-in fade-in zoom-in-95 duration-500 text-left">
      <div className="bg-black text-white p-4 rounded-2xl inline-block mb-8 shadow-lg">
        <Scissors size={28} />
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-4 py-10">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Securing your spot...</h1>
        </div>
      )}

      {status === "success" && (
        <>
          <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-slate-900">Verified!</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 leading-relaxed">
            Booking confirmed. Your slot is now locked in and the barber has been notified. See you in the chair.
          </p>
          <Link href="/" className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase italic block text-center">
            Return Home
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-slate-900">Invalid Link.</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8 leading-relaxed">
            We couldn't verify this booking. It may have already been confirmed, or the link has expired.
          </p>
          <Link href="/" className="text-blue-600 font-black text-[10px] uppercase tracking-widest italic hover:underline">
            Go back to home
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyBookingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <Suspense fallback={<Loader2 className="animate-spin text-blue-600" size={40} />}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}