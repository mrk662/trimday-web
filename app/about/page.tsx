"use client";
import React from "react";
import Link from "next/link";
import { 
  Scissors, Smartphone, Users, Zap, 
  BarChart3, ArrowRight, Bell, Calendar, 
  ShieldCheck, Activity, CheckCircle, XCircle,
  Phone, Download, MessageCircle, Share2, Info,
  Clock, Power, RefreshCcw
} from "lucide-react";
import { QRCode } from 'react-qrcode-logo'; 

// --- THE INITIALS AVATAR COMPONENT ---
const Avatar = ({ name, offline = false }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${offline ? 'bg-slate-200' : 'bg-slate-900'}`}>
      <span className={`font-black italic text-xs tracking-tighter ${offline ? 'text-slate-400' : 'text-white'}`}>{initials}</span>
    </div>
  );
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      
      {/* 1. HERO SECTION */}
      <section className="pt-20 pb-16 px-6 text-center max-w-4xl mx-auto">
        <div className="bg-blue-600 text-white p-3 rounded-2xl inline-flex mb-8 shadow-xl animate-bounce">
          <Scissors size={28} />
        </div>
        <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-6">
          The Modern <br/>
          <span className="text-blue-600">Barber Shop.</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 font-bold uppercase tracking-tight max-w-2xl mx-auto leading-tight italic">
          Automate your bookings and manage your team with a real-time command center.
        </p>
        
        <div className="mt-10 flex flex-col md:flex-row gap-4 justify-center">
          <Link href="/join" className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase italic text-xl shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            Get Started Now <ArrowRight size={24} />
          </Link>
          <Link href="#preview" className="bg-slate-100 text-slate-600 px-10 py-5 rounded-2xl font-bold uppercase text-sm border-2 border-transparent hover:border-slate-200 transition-all">
            See Dashboard
          </Link>
        </div>
      </section>

      {/* 2. THE DASHBOARD MOCKUP SECTION */}
      <section id="preview" className="py-20 bg-slate-50 px-6">
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 leading-none text-slate-900">Better Visuals.</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">The real-time command center for your business</p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6 text-left">
            {/* LIVE PINGS SECTION */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-black flex items-center gap-3 uppercase italic tracking-tighter text-blue-600 mb-8"><Activity /> New Pings</h2>
              
              <div className="p-6 rounded-[2.5rem] border-4 border-slate-50 bg-white shadow-sm animate-pulse">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-left">
                    {/* Updated to Ali M to get correct initials */}
                    <Avatar name="Ali M" />
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight uppercase italic">Ali.M.</h3>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Skin Fade • 14:30</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100">Accept</div>
                  </div>
                </div>
              </div>
            </div>

            {/* TODAY'S CHAIR (Dark Section) */}
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-xl font-black flex items-center gap-3 mb-8 uppercase italic tracking-tighter">
                <Calendar className="text-blue-400" /> Today's Chair
              </h2>
              
              <div className="space-y-4">
                {/* Accepted Job Example */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-2xl text-center min-w-[80px]"><span className="block text-xs font-black">11:00</span></div>
                    <div>
                      <p className="font-black text-lg uppercase italic leading-none">Liam Smith</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Confirmed • Beard Trim</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 md:mt-0">
                    <div className="p-4 bg-white/10 rounded-2xl text-white"><Phone size={20}/></div>
                    <div className="p-4 bg-green-500 rounded-2xl text-white shadow-lg"><CheckCircle size={22} /></div>
                  </div>
                </div>

                {/* RESCHEDULED / PENDING APPROVAL EXAMPLE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-blue-600/10 rounded-[2rem] border-2 border-dashed border-blue-500/40 relative overflow-hidden group">
                  <div className="flex items-center gap-4">
                    <div className="bg-orange-500 p-3 rounded-2xl text-center min-w-[80px] animate-pulse">
                      <Clock size={16} className="mx-auto" />
                    </div>
                    <div>
                      <p className="font-black text-lg uppercase italic leading-none text-blue-400">Marcus Chen</p>
                      <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mt-1 flex items-center gap-1">
                        <RefreshCcw size={10} /> Time Changed to 16:30
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-full font-black text-[9px] uppercase italic tracking-widest animate-bounce inline-block">Awaiting Client Approval</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8 text-left">
            {/* STAFF ON DUTY SECTION (One Barber Offline) */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-fit">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2 uppercase italic tracking-tighter"><Users className="text-blue-600" /> Staff</h2>
              
              <div className="space-y-3">
                {/* Available Barber */}
                <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Avatar name="Jay" />
                    <p className="font-black uppercase italic text-xs">Jay</p>
                  </div>
                  <div className="bg-green-500 p-2 rounded-xl text-white shadow-lg shadow-green-100"><Power size={14} /></div>
                </div>

                {/* OFFLINE BARBER EXAMPLE */}
                <div className="flex items-center justify-between p-4 rounded-3xl bg-white border-2 border-red-50 opacity-60">
                  <div className="flex items-center gap-3">
                    <Avatar name="Mo" offline={true} />
                    <div>
                      <p className="font-black uppercase italic text-xs text-slate-400">Mo</p>
                      <p className="text-[8px] font-black text-red-500 uppercase tracking-tighter italic">Off Duty</p>
                    </div>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-xl text-slate-300"><Power size={14} /></div>
                </div>
              </div>
            </div>

            {/* MARKETING QR MOCKUP */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-fit">
              <h2 className="text-xl font-black mb-1 flex items-center gap-2 uppercase italic tracking-tighter"><Share2 className="text-blue-600" /> Promote</h2>
              <div className="bg-slate-50 p-6 rounded-[2rem] flex flex-col items-center my-6 border-2 border-dashed border-slate-200">
                <QRCode value="https://trimday.co.uk/about" size={120} qrStyle="dots" eyeRadius={8} bgColor="#f8fafc" fgColor="#0f172a" />
                <p className="mt-4 text-[10px] font-black text-slate-900 uppercase italic">JORDAN'S BARBERS</p>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-black text-[9px] uppercase italic hover:bg-blue-600 transition-all"><Download size={14} /> Download Shop QR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE FEATURES GRID */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div className="space-y-4 text-left">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-lg shadow-blue-50">
              <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic">One-Tap Booking</h3>
            <p className="text-slate-500 font-medium leading-relaxed italic uppercase text-xs">No apps. No passwords. Customers book in seconds via your shop link.</p>
          </div>
          
          <div className="space-y-4 text-left">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-lg shadow-orange-50">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic">Live Pings</h3>
            <p className="text-slate-500 font-medium leading-relaxed italic uppercase text-xs">Get instant push notifications the second a chair is filled. Never miss a booking.</p>
          </div>

          <div className="space-y-4 text-left">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 shadow-lg shadow-green-50">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic">Daily Revenue</h3>
            <p className="text-slate-500 font-medium leading-relaxed italic uppercase text-xs">See exactly how much you've earned at any time. Automatic daily stats for the shop.</p>
          </div>
        </div>
      </section>

      {/* 4. 🔥 THE PRICING SECTION */}
      <section className="py-20 px-6 max-w-5xl mx-auto border-t border-slate-100 mt-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-4 text-slate-900 leading-none">Simple Pricing.</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] italic">Pick the plan that fits your hustle.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          {/* SOLO PLAN */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100 flex flex-col relative overflow-hidden">
            <div className="mb-8">
              <h3 className="text-2xl font-black uppercase italic text-slate-900">Solo Pack</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">For Independent Barbers</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black italic tracking-tighter">£24.99</span>
                <span className="text-sm font-bold text-slate-400 uppercase italic">/mo</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500 shrink-0" /><span className="font-bold text-xs text-slate-600 uppercase italic">1 Barber Profile</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500 shrink-0" /><span className="font-bold text-xs text-slate-600 uppercase italic">Unlimited Bookings</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500 shrink-0" /><span className="font-bold text-xs text-slate-600 uppercase italic">Instant Mobile Pings</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-green-500 shrink-0" /><span className="font-bold text-xs text-slate-600 uppercase italic">Daily Revenue Stats</span></li>
            </ul>
            <Link href="/join" className="w-full bg-slate-100 text-slate-900 hover:bg-slate-200 py-5 rounded-2xl font-black text-xs uppercase shadow-sm transition-all text-center italic block">
              Start Solo
            </Link>
          </div>

          {/* PRO PLAN */}
          <div className="bg-blue-600 text-white rounded-[2.5rem] p-8 shadow-2xl border border-blue-500 flex flex-col relative overflow-hidden scale-100 md:scale-105">
            <div className="absolute top-6 right-6 bg-white text-blue-600 text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full italic shadow-sm">Most Popular</div>
            <div className="mb-8">
              <h3 className="text-2xl font-black uppercase italic">Pro Pack</h3>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-2">For Multi-Chair Shops</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-black italic tracking-tighter">£34.99</span>
                <span className="text-sm font-bold text-blue-200 uppercase italic">/mo</span>
              </div>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white shrink-0" /><span className="font-bold text-xs text-white uppercase italic">Everything in Solo</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white shrink-0" /><span className="font-bold text-xs text-white uppercase italic">Unlimited Staff Members</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white shrink-0" /><span className="font-bold text-xs text-white uppercase italic">Team Duty/Availability Toggles</span></li>
              <li className="flex items-center gap-3"><CheckCircle size={18} className="text-white shrink-0" /><span className="font-bold text-xs text-white uppercase italic">Staff Phone Login Access</span></li>
            </ul>
            <Link href="/join" className="w-full bg-black text-white hover:bg-slate-800 py-5 rounded-2xl font-black text-xs uppercase shadow-xl transition-all text-center italic block">
              Start Pro
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FINAL CALL TO ACTION */}
      <section className="py-24 px-6 text-center bg-black text-white rounded-t-[4rem]">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase mb-8 leading-none">
          Ready to Level Up?
        </h2>
        <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.3em] mb-12">
          Choose your plan and start accepting bookings today.
        </p>
        <Link href="/join" className="inline-flex bg-blue-600 hover:bg-blue-500 text-white px-16 py-6 rounded-[2rem] font-black uppercase italic text-2xl transition-all shadow-xl active:scale-95">
          Get My Shop Online
        </Link>
      </section>

    </div>
  );
}