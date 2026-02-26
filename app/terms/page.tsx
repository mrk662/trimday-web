"use client"; // 🔥 MUST be line 1

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-24 text-left">
      
      {/* --- Standardized Back Navigation --- */}
      <div className="max-w-3xl mx-auto px-6 pt-10">
        <Link href="/" className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl hover:bg-slate-100 transition-all group border border-slate-100 mb-12">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Back to TrimDay</span>
        </Link>

        {/* --- Standardized Header (No Shield Icon) --- */}
        <header className="mb-16">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4 leading-none">
            Terms of Service
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic leading-relaxed">
            Effective February 2026. Rules and guidelines for our platform.
          </p>
        </header>

        {/* --- Standardized Content Sections --- */}
        <div className="space-y-16">
          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              01. Platform Usage
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              TrimDay is a booking platform. The Barber is solely responsible for the quality, safety, and delivery of the barbering services provided.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              02. Subscription & Payments
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              Barber subscriptions are billed in advance. All payment processing is handled securely by our third-party partner. You may manage or cancel your plan through your secure billing portal.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              03. Limitation of Liability
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              To the maximum extent permitted by UK law, TrimDay shall not be liable for any indirect or consequential damages resulting from the use of our platform. Usage constitutes acceptance of these terms.
            </p>
          </section>
        </div>

        {/* --- Standardized Exit Anchor --- */}
        <div className="mt-20 pt-10 border-t border-slate-50">
           <Link href="/" className="text-slate-300 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors italic">
            ← Exit to Home
          </Link>
        </div>
      </div>
    </div>
  );
}