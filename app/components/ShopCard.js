"use client";
import React, { useState, useEffect } from "react";
import { MapPin, Calendar, MessageSquare, Navigation, Clock } from "lucide-react";
import Link from "next/link";

export default function ShopCard({ shop, onBook }) {
  const [now, setNow] = useState(new Date());

  // Keep the 'Time Ago' fresh every minute without a page refresh
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // FIXED: Clean Google Maps Directions Link
  const googleMapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${shop.address} ${shop.postcode}`
  )}`;

  const whatsappLink = `https://wa.me/${shop.whatsapp_number}?text=Hi ${shop.name}, I found you on Trimday.`;

  // Time Ago Logic for the "Last Seen" feature
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return null;
    const seconds = Math.floor((now - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return "24h+ ago";
  };

  const getStatusBadge = () => {
    if (!shop.is_open) return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Closed</span>;
    if (shop.current_status === 'booked out') return <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Booked Out</span>;
    if (shop.current_status === 'with client') return <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Busy</span>;
    return (
      <span className="bg-[#25D366] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div> Live Now
      </span>
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all group">
      
      {/* CLICKABLE IMAGE AREA */}
      <div className="relative h-48 w-full rounded-[2rem] overflow-hidden mb-4">
        <Link href={`/shop/${shop.slug}`} className="block h-full w-full cursor-pointer">
          {/* Layer 1: Blurred Backdrop (visible if 'contain') */}
          {shop.photo_object_fit === "contain" && (
            <div 
              className="absolute inset-0 bg-center bg-cover scale-125 blur-3xl opacity-40"
              style={{ backgroundImage: `url(${shop.shop_photo_url})` }}
            />
          )}

          {/* Layer 2: Main Image */}
          <img 
            src={shop.shop_photo_url} 
            alt={shop.name} 
            className={`relative w-full h-full z-10 transition-transform duration-500 group-hover:scale-105 ${
              shop.photo_object_fit === 'cover' ? 'object-cover' : 'object-contain'
            }`} 
          />
        </Link>
        
        {/* TOP LEFT BADGES */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
          <div className="flex gap-2">
            {getStatusBadge()}
            {shop.distance && (
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {shop.distance.toFixed(1)} Miles
              </span>
            )}
          </div>

          {/* "Last Updated" Badge */}
          {shop.status_updated_at && (
            <div className="bg-black/40 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[9px] font-bold w-fit flex items-center gap-1 border border-white/10">
              <Clock size={10} />
              Updated {getTimeAgo(shop.status_updated_at)}
            </div>
          )}
        </div>

        <Link href={`/shop/${shop.slug}`} className="absolute bottom-0 left-0 w-full p-6 z-20 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-white text-2xl font-black">{shop.name}</h3>
        </Link>
      </div>

      {/* ADDRESS ROW */}
      <div className="flex items-center gap-2 mb-6 px-2">
        <MapPin size={16} className="text-blue-500 shrink-0" />
        <p className="text-slate-500 font-bold text-xs truncate">{shop.address}, {shop.postcode}</p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-3 gap-2">
        {/* Triggers Modal on Home Page */}
        <button 
          onClick={onBook}
          className="bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Calendar size={14} /> Book Online
        </button>
        
        <a 
          href={whatsappLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-[#25D366] text-white py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <MessageSquare size={14} /> Whatsapp
        </a>

        <a 
          href={googleMapsLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-slate-100 text-slate-700 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
        >
          <Navigation size={14} /> Directions
        </a>
      </div>
    </div>
  );
}