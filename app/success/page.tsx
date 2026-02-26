"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Scissors, ArrowRight } from 'lucide-react';

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Give them 5 seconds to soak in the "Win" before redirecting
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 animate-bounce">
        <CheckCircle size={48} className="text-black" />
      </div>

      <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4">
        You're In.
      </h1>
      
      <p className="text-slate-400 text-lg max-w-md mb-12">
        Your subscription is active. Welcome to the <span className="text-white font-bold">TrimDay</span> professional network.
      </p>

      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <span className="text-zinc-500 uppercase text-xs font-bold tracking-widest">Status</span>
          <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-black uppercase">Verified</span>
        </div>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase italic flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all"
        >
          Go to Dashboard <ArrowRight size={18} />
        </button>
      </div>

      <p className="mt-8 text-zinc-600 text-xs uppercase tracking-widest">
        Redirecting you in a few seconds...
      </p>
    </div>
  );
}