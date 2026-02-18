"use client";
import React, { useState, useEffect } from "react";
import { Scissors, MapPin, Loader2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import BookingModal from "./components/BookingModal";
import ShopCard from "./components/ShopCard"; 

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

  // ---------- Distance Logic ----------
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const looksLikePostcode = (value) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}$/.test(value.trim().toUpperCase());

  const pickTownFromPostcodeRecord = (r) => (r?.admin_district || r?.post_town || r?.parish || "").trim();

  // ---------- DUAL AUTOCOMPLETE LOGIC (Postcodes + Boroughs) ----------
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

        // 1. Process Boroughs/Towns
        const townItems = (townData.result || []).map(r => ({
          label: pickTownFromPostcodeRecord(r),
          lat: r.latitude,
          lng: r.longitude,
          type: "BOROUGH"
        }));

        // 2. Process Postcodes
        const pcItems = (pcData.result || []).map(pc => ({
          label: pc,
          type: "POSTCODE"
        }));

        // Merge, deduplicate by label, and set
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="border-b px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <div className="bg-black p-2 rounded-xl text-white"><Scissors size={18} /></div>
          <span className="text-xl font-black tracking-tight italic">TrimDay</span>
        </div>
        <div className="flex items-center gap-3">
          {/* RESTORED: Barber Login link */}
          <Link href="/login" className="px-5 py-2.5 rounded-full border-2 border-slate-100 font-bold text-xs text-slate-500">
            Barber Login
          </Link>
          <Link href="/join">
            <button className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-black text-xs shadow-lg">
              List Your Shop
            </button>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto pt-12 px-4">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 text-slate-900">
            Find a chair <span className="text-blue-600">now.</span>
          </h1>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">
            SEARCHING WITHIN {radius} MILES
          </p>
        </div>

        {/* SEARCH BAR & RADIUS BUTTONS */}
        <div className="relative max-w-2xl mx-auto mb-16">
          <div className="flex bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-2xl p-2 focus-within:ring-8 ring-blue-50 transition-all">
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && searchBarbers(query)} 
              placeholder="Postcode or Town..." 
              className="flex-1 p-4 outline-none font-bold text-lg bg-transparent" 
            />
            <button onClick={() => searchBarbers(query)} className="bg-black text-white px-8 md:px-12 rounded-[2rem] font-black hover:bg-slate-800 transition-all min-w-[120px]">
              {loading ? <Loader2 className="animate-spin" /> : "SEARCH"}
            </button>
          </div>

          {/* RADIUS TOGGLE BUTTONS */}
          <div className="flex justify-center mt-6 gap-3">
            {[5, 10, 25].map((dist) => (
              <button 
                key={dist} 
                onClick={() => { setRadius(dist); if(query) searchBarbers(query); }}
                className={`text-[10px] font-black px-6 py-2 rounded-full border-2 transition-all ${radius === dist ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"}`}
              >
                {dist} MILES
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-[110]">
              {suggestions.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => { setQuery(s.label); setSuggestions([]); searchBarbers(s); }} 
                  className="w-full text-left p-5 hover:bg-blue-50 border-b last:border-0 flex items-center justify-between font-bold text-slate-600"
                >
                  <div className="flex items-center gap-4">
                    <MapPin size={18} className="text-blue-500" /> {s.label}
                  </div>
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{s.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RESULTS GRID */}
        <div className="space-y-12 pb-24">
          {shops.map((shop) => (
            <ShopCard 
              key={shop.id} 
              shop={shop} 
              onBook={() => { setSelectedShop(shop); setIsModalOpen(true); }} // RESTORED MODAL TRIGGER
            />
          ))}
        </div>
      </main>

      {/* MODAL OVERLAY */}
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