"use client";
import React, { useState, useEffect } from "react";
import {
  Scissors,
  MapPin,
  MessageSquare,
  Navigation,
  Star,
  Clock,
  Calendar,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import BookingModal from "./components/BookingModal";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LandingPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]); // { label, type, lat, lng }
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(5);

  const [selectedShop, setSelectedShop] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ---------- Distance (Haversine) ----------
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ---------- Postcode / outcode detection ----------
  const looksLikeFullPostcode = (value) => {
    const v = value.trim().toUpperCase();
    return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(v);
  };

  const looksLikePartialPostcode = (value) => {
    const v = value.trim().toUpperCase();
    return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?$/.test(v);
  };

  const looksLikePostcode = (value) =>
    looksLikeFullPostcode(value) || looksLikePartialPostcode(value);

  const looksLikeOutcode = (value) => {
    const v = value.trim().toUpperCase();
    return /^[A-Z]{1,2}\d[A-Z\d]?$/.test(v) || /^[A-Z]{1,2}\d[A-Z\d]{1,2}$/.test(v);
  };

  // ---------- Build a "town-ish" label from a postcode search record ----------
  // postcodes.io postcodes?q returns records with:
  // admin_district, parish, post_town, country, latitude, longitude
  const pickTownFromPostcodeRecord = (r) => {
    const admin = (r?.admin_district || "").trim();
    const parish = (r?.parish || "").trim();
    const postTown = (r?.post_town || "").trim();

    // Prefer: admin_district (usually town/city/borough), then post_town, then parish
    return admin || postTown || parish || "";
  };

  // ---------- Geocode any input into {lat,lng} ----------
  // order:
  // 1) exact postcode
  // 2) outcode
  // 3) town/city partial via postcodes?q=... pick best match from admin_district/post_town/parish
  const geocodeUK = async (termRaw) => {
    const term = (termRaw || "").trim();
    if (!term) return null;

    // 1) Exact postcode
    try {
      const pcRes = await fetch(
        `https://api.postcodes.io/postcodes/${term.replace(/\s/g, "")}`
      );
      const pcData = await pcRes.json();
      if (pcData.status === 200) {
        return { lat: pcData.result.latitude, lng: pcData.result.longitude };
      }
    } catch {}

    // 2) Outcode centroid (e.g SL1)
    if (looksLikeOutcode(term)) {
      try {
        const ocRes = await fetch(
          `https://api.postcodes.io/outcodes/${encodeURIComponent(term)}`
        );
        const ocData = await ocRes.json();
        if (ocData.status === 200) {
          return { lat: ocData.result.latitude, lng: ocData.result.longitude };
        }
      } catch {}
    }

    // 3) Town / partial town (UK-wide) using postcodes search
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes?q=${encodeURIComponent(term)}&limit=20`
      );
      const data = await res.json();
      if (data.status === 200 && Array.isArray(data.result) && data.result.length) {
        const qLower = term.toLowerCase();

        // Score matches:
        // startsWith admin_district/post_town/parish best
        const scored = data.result
          .map((r) => {
            const town = pickTownFromPostcodeRecord(r);
            const fields = [
              (r.admin_district || "").toLowerCase(),
              (r.post_town || "").toLowerCase(),
              (r.parish || "").toLowerCase(),
            ];

            let score = 999;
            if (fields.some((f) => f.startsWith(qLower))) score = 0;
            else if (fields.some((f) => f.includes(qLower))) score = 1;

            // Prefer records that actually have coords
            const hasCoords = r.latitude && r.longitude ? 0 : 5;
            // Prefer shorter/cleaner town names
            const townLen = town ? Math.min(town.length, 50) / 100 : 1;

            return { r, score: score + hasCoords + townLen };
          })
          .sort((a, b) => a.score - b.score);

        const best = scored[0]?.r;
        if (best?.latitude && best?.longitude) {
          return { lat: best.latitude, lng: best.longitude };
        }
      }
    } catch {}

    return null;
  };

  // ---------- SEARCH ----------
  const searchBarbers = async (searchTermOrSuggestion) => {
    if (!searchTermOrSuggestion) return;
    setLoading(true);

    const term =
      typeof searchTermOrSuggestion === "string"
        ? searchTermOrSuggestion
        : searchTermOrSuggestion.label;

    try {
      let userLat, userLng;

      // If they clicked a town suggestion, use its coords
      if (
        typeof searchTermOrSuggestion === "object" &&
        searchTermOrSuggestion.lat &&
        searchTermOrSuggestion.lng
      ) {
        userLat = searchTermOrSuggestion.lat;
        userLng = searchTermOrSuggestion.lng;
      } else {
        const geo = await geocodeUK(term);
        if (geo) {
          userLat = geo.lat;
          userLng = geo.lng;
        }
      }

      // Fetch ONLY active + paid shops
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .eq("is_active", true)
        .eq("subscription_status", "active");

      const allShops = !error ? data || [] : [];

      if (userLat && userLng) {
        const nearby = allShops
          .map((shop) => ({
            ...shop,
            distance: getDistance(
              userLat,
              userLng,
              shop.lat ?? 51.5,
              shop.lng ?? -0.6
            ),
          }))
          .filter((shop) => shop.distance <= radius)
          .sort((a, b) => a.distance - b.distance);

        setShops(nearby);
      } else {
        // fallback text search
        const qLower = term.toLowerCase();
        const filtered = allShops.filter(
          (s) =>
            (s.address || "").toLowerCase().includes(qLower) ||
            (s.name || "").toLowerCase().includes(qLower)
        );
        setShops(filtered);
      }
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- AUTOCOMPLETE (postcode OR town) ----------
  useEffect(() => {
    const fetchSuggestions = async () => {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        // 1) postcode autocomplete
        if (looksLikePostcode(q)) {
          const res = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(q)}/autocomplete`
          );
          const data = await res.json();
          const items = (data.result || []).slice(0, 8).map((pc) => ({
            label: pc,
            type: "postcode",
          }));
          setSuggestions(items);
          return;
        }

        // 2) town autocomplete (UK-wide) via postcodes search
        // This is the key fix for Windsor/Wales/Scotland etc.
        const res = await fetch(
          `https://api.postcodes.io/postcodes?q=${encodeURIComponent(q)}&limit=40`
        );
        const data = await res.json();

        const qLower = q.toLowerCase();
        const seen = new Set();

        const items = (data.result || [])
          .map((r) => {
            const town = pickTownFromPostcodeRecord(r);
            return {
              label: town,
              type: "town",
              lat: r.latitude,
              lng: r.longitude,
              // ranking helpers:
              admin: (r.admin_district || "").toLowerCase(),
              postTown: (r.post_town || "").toLowerCase(),
              parish: (r.parish || "").toLowerCase(),
            };
          })
          .filter((s) => {
            if (!s.label || !s.lat || !s.lng) return false;

            const labelLower = s.label.toLowerCase();
            const matches =
              labelLower.startsWith(qLower) ||
              labelLower.includes(qLower) ||
              s.admin.startsWith(qLower) ||
              s.postTown.startsWith(qLower) ||
              s.parish.startsWith(qLower) ||
              s.admin.includes(qLower) ||
              s.postTown.includes(qLower) ||
              s.parish.includes(qLower);

            if (!matches) return false;

            const key = labelLower;
            if (seen.has(key)) return false;
            seen.add(key);

            return true;
          })
          .sort((a, b) => {
            const aStarts = a.label.toLowerCase().startsWith(qLower) ? 0 : 1;
            const bStarts = b.label.toLowerCase().startsWith(qLower) ? 0 : 1;
            if (aStarts !== bStarts) return aStarts - bStarts;
            return a.label.length - b.label.length;
          })
          .slice(0, 8)
          .map(({ admin, postTown, parish, ...rest }) => rest);

        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    };

    const t = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <nav className="border-b px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-[100]">
        <div className="flex items-center gap-2">
          <div className="bg-black p-2 rounded-lg text-white">
            <Scissors size={18} />
          </div>
          <span className="text-xl font-black tracking-tight italic">TrimDay</span>
        </div>
        <Link href="/join">
          <button className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-sm shadow-lg shadow-blue-100">
            List Your Shop
          </button>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto pt-12 px-4">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
            Find a chair <span className="text-blue-600">now.</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em]">
            Searching within {radius} miles
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto mb-16">
          <div className="flex bg-white border-2 border-slate-100 rounded-[2rem] shadow-2xl p-2 focus-within:ring-4 ring-blue-50 transition-all">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchBarbers(query)}
              placeholder="Search by Postcode..."
              className="flex-1 p-4 outline-none font-bold text-lg"
            />
            <button
              onClick={() => searchBarbers(query)}
              className="bg-black text-white px-10 rounded-[1.5rem] font-black hover:bg-slate-800 transition-all"
            >
              {loading ? "..." : "SEARCH"}
            </button>
          </div>

          <div className="flex justify-center mt-4 gap-3">
            {[5, 10, 25].map((dist) => (
              <button
                key={dist}
                onClick={() => {
                  setRadius(dist);
                  searchBarbers(query);
                }}
                className={`text-[10px] font-black px-4 py-2 rounded-full border transition-all ${
                  radius === dist
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-400 border-slate-100"
                }`}
              >
                {dist} MILES
              </button>
            ))}
          </div>

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[110]">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(s.label);
                    setSuggestions([]);
                    searchBarbers(s);
                  }}
                  className="w-full text-left p-5 hover:bg-slate-50 border-b last:border-0 flex items-center gap-4 font-bold text-slate-600"
                >
                  <MapPin size={18} className="text-blue-500" />
                  <span className="flex-1">{s.label}</span>
                  <span className="text-[10px] font-black uppercase text-slate-300">
                    {s.type === "postcode" ? "POSTCODE" : "TOWN"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-10 pb-24">
          {shops.length > 0 ? (
            shops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all group"
              >
                <div className="h-64 w-full relative">
                  <img
                    src={
                      shop.shop_photo_url ||
                      shop.image_url ||
                      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop"
                    }
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop";
                    }}
                    alt={shop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-6 left-8 text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>{" "}
                        LIVE NOW
                      </span>
                      {shop.distance && (
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black">
                          {shop.distance.toFixed(1)} MILES AWAY
                        </span>
                      )}
                      <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                        <Clock size={12} /> {shop.wait_time || "No wait"}
                      </span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">{shop.name}</h2>
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="flex items-center gap-1 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} fill="currentColor" />
                      ))}
                      <span className="text-slate-900 font-black ml-1">{shop.rating}</span>
                    </div>
                    <span className="text-slate-400 font-bold text-sm">
                      {shop.reviews_count} Google reviews
                    </span>
                    <span className="text-slate-200">|</span>
                    <p className="text-slate-500 font-bold text-sm flex items-center gap-1">
                      <MapPin size={16} className="text-blue-500" /> {shop.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setSelectedShop(shop);
                        setIsModalOpen(true);
                      }}
                      className="bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                    >
                      <Calendar size={20} /> BOOK ONLINE
                    </button>
                    <a
                      href={`https://wa.me/${shop.whatsapp_number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#25D366] text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                    >
                      <MessageSquare size={20} /> WHATSAPP
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        shop.address
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-100 text-slate-700 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                    >
                      <Navigation size={20} /> DIRECTIONS
                    </a>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-sm">
              {query && !loading ? "No active barbers found in this radius" : ""}
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <BookingModal shop={selectedShop} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
