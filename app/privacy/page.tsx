"use client"; // 🔥 MUST be line 1

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest italic leading-relaxed">
            Effective February 2026. How we protect your data and security.
          </p>
        </header>

        {/* --- Standardized Content Sections --- */}
        <div className="space-y-16">
          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              01. Data Controller
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              TrimDay is the data controller for the information you provide. We are committed to protecting your privacy in line with UK GDPR and the Data Protection Act 2018.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              02. Security & Encryption
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              Your data is encrypted both in transit and at rest. We utilize advanced Row Level Security (RLS) to ensure that barbers can only ever access their own shop records.
            </p>
          </section>

          <section>
            <h2 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-6 italic">
              03. Third-Party Data Processing
            </h2>
            <p className="font-bold text-slate-500 text-sm leading-relaxed uppercase italic">
              We share necessary information with partners solely for essential functions including payment processing and transactional emails. All providers are vetted for GDPR compliance.
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