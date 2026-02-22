"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, Loader2 } from "lucide-react";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function VerifyContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [status, setStatus] = useState('loading'); // loading, success, error

  useEffect(() => {
    if (!id) return;
    const confirm = async () => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: 'pending' })
        .eq("id", id)
        .eq("status", "unverified");

      if (error) setStatus('error');
      else setStatus('success');
    };
    confirm();
  }, [id]);

  if (status === 'loading') return <div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={40} /><p className="font-black uppercase italic text-black">Securing your chair...</p></div>;
  
  if (status === 'error') return <div className="p-10 bg-white rounded-[3rem] shadow-xl text-center"><h1 className="text-2xl font-black text-red-500">Link Expired</h1><p className="text-black mt-2">This booking may have already been verified.</p></div>;

  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 text-center">
      <CheckCircle className="text-green-500 mx-auto mb-6" size={64} />
      
      {/* Updated to Black Text and added the new Witty Title */}
      <h1 className="text-3xl font-black mb-4 text-black leading-tight">Verified & Locked In. Welcome to Trimday! 💈</h1>
      
      <p className="text-slate-500 font-bold mb-8 italic">Your request is now on the barber's screen. Watch your email for the final confirmation.</p>
      
      <button onClick={() => window.close()} className="w-full py-5 bg-black text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all mb-6">Close Window</button>
      
      {/* The Small Print added right here */}
      <p className="text-xs text-slate-400 font-medium px-2 leading-relaxed">
        Note: You'll never have to do this again. You're officially on the roster, so all future bookings are 1-click.
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Suspense fallback={<Loader2 className="animate-spin text-black" />}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}