"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Scissors, MapPin, Loader2, ChevronLeft, MessageSquare, Plus, Info } from "lucide-react"; 
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import BookingModal from "./components/BookingModal";
import ShopCard from "./components/ShopCard"; 
import OneSignal from 'react-onesignal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]); 
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5);
  const [selectedShop, setSelectedShop] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ---------- ONESIGNAL SETUP (Original) ----------
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        if (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
          await OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            notifyButton: {
              enable: true,
              position: 'bottom-right',
            },
          });
          console.log("✅ OneSignal Initialized");
        }
      } catch (err) {
        console.error("❌ OneSignal Init Error:", err);
      }
    };
    initOneSignal();
  }, []);

  // ---------- THE "TELL MY BARBER" LOGIC (Updated to point to /about) ----------
  const tellBarber = async () => {
    const inviteText = "Yo! I tried to book you on TrimDay but couldn't find your shop. It's a clean new booking system for barbers—check out how it works here: https://trimday.co.uk/about";
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join TrimDay',
          text: inviteText,
          url: 'https://trimday.co.uk/about',
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback for desktop: Copy to clipboard
      navigator.clipboard.writeText(inviteText);
      alert("Invite message copied! Send it to your barber on WhatsApp or Instagram.");
    }
  };

  // ---------- Distance Logic (Original) ----------
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const looksLikePostcode = (value) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}$/.test(value.trim().toUpperCase());
  const pickTownFromPostcodeRecord = (r) => (r?.admin_district || r?.post_town || r?.parish || "").trim();

  // ---------- DUAL AUTOCOMPLETE LOGIC (Original) ----------
  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = query.trim();
      if (q.length < 2) { setSuggestions([]); return; }
      try {
        const [townRes, pcRes] = await Promise.all([
          fetch(`https://api.postcodes.io/postcodes?q=${encodeURIComponent(q)}&limit=10`),
          looksLikePostcode(q) ? fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete`) : Promise.resolve({ json: () => ({ result: [] }) })
        ]);
        const townData = await townRes.json();
        const pcData = await pcRes.json();
        const townItems = (townData.result || []).map(r => ({
          label: pickTownFromPostcodeRecord(r),
          lat: r.latitude,
          lng: r.longitude,
          type: "BOROUGH"
        }));
        const pcItems = (pcData.result || []).map(pc => ({
          label: pc,
          type: "POSTCODE"
        }));
        const combined = [...pcItems, ...townItems];
        setSuggestions(combined.filter((v,i,a)=>a.findIndex(t=>(t.label===v.label))===i).slice(0, 8));
      } catch (e) {
        console.error("Autocomplete error:", e);
      }
    };
    const t = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(t);
  }, [query]);

  // ---------- SEARCH ENGINE ----------
  const searchBarbers = async (searchTermOrSuggestion) => {
    if (!searchTermOrSuggestion) return;
    setLoading(true);
    setHasSearched(true);
    const term = typeof searchTermOrSuggestion === "string" ? searchTermOrSuggestion : searchTermOrSuggestion.label;

    try {
      let userLat = searchTermOrSuggestion.lat;
      let userLng = searchTermOrSuggestion.lng;

      if (!userLat) {
        const res = await fetch(`https://api.postcodes.io/postcodes/${term.replace(/\s/g, "")}`);
        const data = await res.json();
        if (data.status === 200) {
          userLat = data.result.latitude;
          userLng = data.result.longitude;
        }
      }

      const { data: allShops } = await supabase.from("shops").select("*").eq("is_active", true);
      
      if (userLat && userLng) {
        const nearby = (allShops || [])
          .map(s => ({ ...s, distance: getDistance(userLat, userLng, s.lat || 51.5, s.lng || -0.6) }))
          .filter(s => s.distance <= radius)
          .sort((a, b) => a.distance - b.distance);
        setShops(nearby);
      } else {
        const qLower = term.toLowerCase();
        setShops((allShops || []).filter(s => (s.address || "").toLowerCase().includes(qLower) || (s.name || "").toLowerCase().includes(qLower)));
      }
    } finally { setLoading(false); }
  };

  const clearSearch = () => {
    setQuery("");
    setShops([]);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Head>
        <title>TrimDay | Book Your Barber</title>
        <meta name="description" content="Discover top local barbers and hair salons. Secure your slot in seconds." />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="theme-color" content="#ffffff" />
      </Head>

      <nav className="border-b px-4 md:px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-[100]">
        <Link href="/" onClick={clearSearch} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <div className="bg-black p-2 rounded-xl text-white"><Scissors size={18} /></div>
          <span className="text-xl font-black tracking-tight italic uppercase">TrimDay</span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/login" className="px-3 md:px-5 py-2.5 rounded-full border-2 border-slate-100 font-black text-[10px] md:text-xs text-slate-400 whitespace-nowrap uppercase italic">
            Barber Login
          </Link>
          <Link href="/join">
            <button className="bg-blue-600 text-white px-3 md:px-5 py-2.5 rounded-full font-black text-[10px] md:text-xs shadow-lg whitespace-nowrap uppercase italic">
              List Shop
            </button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto pt-16 px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-6 text-slate-900 leading-[1.1]">
            Book your <br className="md:hidden" />
            <span className="text-blue-600 underline decoration-blue-200">next trim.</span>
          </h1>
          <p className="max-w-md mx-auto text-slate-500 font-bold text-sm md:text-base leading-relaxed mb-6 px-4 uppercase italic">
            Discover top local barbers. Secure your slot in seconds—no app required.
          </p>
          
          {/* See How It Works Button */}
          <div className="mb-8">
            <Link href="/about" className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase italic border-2 border-transparent hover:border-slate-200 transition-all tracking-widest">
              <Info size={14} /> See how it works
            </Link>
          </div>

          <p className="text-slate-300 font-black uppercase text-[10px] tracking-[0.3em] italic">
            SEARCHING WITHIN {radius} MILES
          </p>
        </div>

        {/* SEARCH BOX */}
        <div className="relative max-w-2xl mx-auto mb-16">
          <div className="flex bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl p-2 focus-within:ring-8 ring-blue-50 transition-all">
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && searchBarbers(query)} 
              placeholder="Postcode or Town..." 
              className="flex-1 p-4 outline-none font-black text-lg bg-transparent uppercase italic placeholder:text-slate-200" 
            />
            <button onClick={() => searchBarbers(query)} className="bg-black text-white px-8 md:px-12 rounded-[2rem] font-black hover:bg-slate-800 transition-all min-w-[120px] uppercase italic">
              {loading ? <Loader2 className="animate-spin" /> : "SEARCH"}
            </button>
          </div>

          <div className="flex justify-center mt-6 gap-3">
            {[5, 10, 25].map((dist) => (
              <button 
                key={dist} 
                onClick={() => { setRadius(dist); if(query) searchBarbers(query); }}
                className={`text-[10px] font-black px-6 py-2 rounded-full border-2 transition-all uppercase italic ${radius === dist ? "bg-blue-600 text-white border-blue-600 shadow-lg" : "bg-white text-slate-400 border-slate-100"}`}
              >
                {dist} MILES
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute top-[80px] left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[110]">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => { setQuery(s.label); setSuggestions([]); searchBarbers(s); }} 
                  className="w-full text-left p-5 hover:bg-blue-50 border-b last:border-0 flex items-center justify-between font-black text-slate-600 uppercase italic"
                >
                  <div className="flex items-center gap-4">
                    <MapPin size={18} className="text-blue-500" /> {s.label}
                  </div>
                  <span className="text-[9px] font-black text-slate-300 tracking-widest">{s.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-12 pb-24">
          
          {hasSearched && (
            <div className="flex justify-center md:justify-start">
              <button 
                onClick={clearSearch}
                className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-all group italic"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Clear Results
              </button>
            </div>
          )}

          {shops.length > 0 ? (
            shops.map((shop) => (
              <ShopCard 
                key={shop.id} 
                shop={shop} 
                onBook={() => { setSelectedShop(shop); setIsModalOpen(true); }}
              />
            ))
          ) : (
            hasSearched && !loading && (
              <div className="bg-white rounded-[3rem] p-12 text-center border-2 border-slate-100 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                   <Scissors size={40} />
                </div>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-slate-900">
                  Your barber isn't here... yet.
                </h3>
                <p className="text-slate-500 font-bold mb-8 max-w-sm mx-auto uppercase text-[10px] tracking-widest leading-relaxed italic">
                  We're adding new shops every week. If your favorite spot isn't on the map, let them know about TrimDay so you can book in seconds.
                </p>
                <div className="flex flex-col gap-4 items-center">
                  <button 
                    onClick={tellBarber} 
                    className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase italic shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <MessageSquare size={16} /> Tell my Barber
                  </button>
                  <button onClick={clearSearch} className="text-[10px] font-black uppercase text-slate-300 hover:text-blue-600 transition-colors italic tracking-widest">
                    Show all barbers
                  </button>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          )}
        </div>
      </main>

      {isModalOpen && selectedShop && (
        <BookingModal 
          shopId={selectedShop.id} 
          services={selectedShop.service_menu || []} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}