"use client";
import React from 'react';
import Link from 'next/link';
import { Scissors, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8 px-6 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-black p-2 rounded-xl text-white">
                <Scissors size={20} />
              </div>
              <span className="font-black italic uppercase tracking-tighter text-xl text-slate-900">TrimDay</span>
            </div>
            <p className="text-slate-500 font-bold text-sm max-w-sm leading-relaxed uppercase italic">
              Professional barber management. Built for speed, security, and the perfect fade.
            </p>
          </div>
          
          {/* Support Column */}
          <div>
            <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6 italic">Support</h4>
            <ul className="space-y-4 font-bold text-sm text-slate-600">
              <li>
                <Link href="/support" className="hover:text-blue-600 transition-colors uppercase italic">
                  Support Centre
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-black uppercase text-[10px] tracking-widest text-slate-400 mb-6 italic">Legal</h4>
            <ul className="space-y-4 font-bold text-sm text-slate-600">
              <li><Link href="/privacy" className="hover:text-blue-600 transition-colors uppercase italic">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 transition-colors uppercase italic">Terms of Service</Link></li>
              {/* FIXED: Now points to the dedicated cookie page */}
              <li><Link href="/cookie-policy" className="hover:text-blue-600 transition-colors uppercase italic">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Compliance Bar */}
        <div className="border-t border-slate-50 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
            <ShieldCheck size={14} className="text-green-500" />
            <span>© 2026 TrimDay • Secure Booking Platform</span>
          </div>
          
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight text-center md:text-right italic">
            Developed in the UK • Powered by TrimDay <br />
            All data processed in accordance with local regulations.
          </div>
        </div>
      </div>
    </footer>
  );
}