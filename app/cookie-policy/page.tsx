"use client"; // 🔥 MUST be line 1

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-24 text-left">
      
      {/* --- Standardized Back Navigation --- */}
      <div className="max-w-3xl mx-auto px-6 pt-10">
        <Link href="/" className="inline-flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl hover:bg-slate-100 transition-all group border border-slate-100 mb-12">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Back to TrimDay</span>
        </Link>

        {/* --- Standardized Header --- */}
        <header className="mb-16">
          <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-4 leading-none">
            Cookie Policy
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic leading-relaxed">
            Effective February 2026. How we use essential data to power your session.
          </p>
        </header>

        {/* --- Standardized Content Sections --- */}
        <div className="space-y-16">
          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              01. Necessary Cookies
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              We use essential cookies to maintain secure sessions and keep you logged into your dashboard. These are mandatory for the application to function.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              02. User Preferences
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              Cookies are used to remember your interface preferences, such as your chosen notification sounds and volume settings, to ensure a consistent experience.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              03. Data Security
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              We do not use tracking or advertising cookies. Our cookies are utilized purely for security, system functionality, and essential service delivery.
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