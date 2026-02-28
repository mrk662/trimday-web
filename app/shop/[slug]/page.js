"use client";
import React, { useEffect, useState, use } from "react";
import { 
  MapPin, Globe, MessageSquare, Calendar, Loader2, 
  Clock, ChevronRight, Info, ChevronDown, Phone 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// FIXED: Using relative path so Netlify build can resolve the module
import BookingModal from "../../components/BookingModal"; 

// FIXED: Removed the '!' operator which is for TypeScript, not JavaScript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function PublicShopPage({ params }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showAllHours, setShowAllHours] = useState(false); // 🔥 State for dropdown

  useEffect(() => {
    if (slug) {
      fetchShop();

      // LIVE UPDATE: Real-time sync for Open/Closed/Busy status
      const channel = supabase.channel(`public-shop-${slug}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'shops', 
          filter: `slug=eq.${slug}` 
        }, (payload) => {
          setShop(payload.new);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [slug]);

  const fetchShop = async () => {
    const { data } = await supabase
      .from("shops")
      .select("*")
      .eq("slug", slug)
      .single();

    if (data) setShop(data);
    setLoading(false);
  };

  // --- 🔥 NEW HELPER: Logic to check if shop is open right now ---
  const checkIsScheduledOpen = () => {
    if (!shop?.business_hours) return true; // Default to open if hours not set yet
    
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const todayKey = days[now.getDay()];
    const todayHours = shop.business_hours[todayKey];

    if (!todayHours || todayHours.is_closed) return false;

    const currentTimeInMins = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    
    const openTimeInMins = openH * 60 + openM;
    const closeTimeInMins = closeH * 60 + closeM;

    return currentTimeInMins >= openTimeInMins && currentTimeInMins < closeTimeInMins;
  };

  // Combined logic: Manual toggle + Schedule check
  const isActuallyOpen = shop?.is_open && checkIsScheduledOpen();

  const handleBookService = (service) => {
    if (!isActuallyOpen) return;
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const handleGenericBook = () => {
    if (!isActuallyOpen) return;
    setSelectedService(null);
    setIsBookingOpen(true);
  };

  const getStatusBadge = () => {
    // 1. Check manual toggle
    if (!shop.is_open) return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Shop Closed</span>;
    
    // 2. Check automated schedule
    if (!checkIsScheduledOpen()) return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Currently Closed</span>;

    // 3. Check busy status
    if (shop.current_status === 'booked out') return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Booked Out</span>;
    if (shop.current_status === 'with client') return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Busy (With Client)</span>;
    
    return <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Available Now</span>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!shop) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Shop not found.</div>;

  const cleanPhone = shop.whatsapp_number?.replace(/\D/g, '');
  const whatsappMsg = encodeURIComponent(`Hi ${shop.name}! I saw your shop on Trimday.`);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-20 text-left">
      
      {/* 1. BANNER */}
      <div className="relative w-full h-64 md:h-80 bg-slate-100 overflow-hidden text-left">
        {shop.photo_object_fit === "contain" && (
          <div className="absolute inset-0 bg-center bg-cover scale-125 blur-3xl opacity-40" style={{ backgroundImage: `url(${shop.shop_photo_url})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-20"/>
        <img src={shop.shop_photo_url} alt={shop.name} className={`relative w-full h-full z-10 ${shop.photo_object_fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-20 relative z-30 text-left">
        
        {/* 2. HEADER CARD */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-50 mb-8 text-center">
          <div className="flex justify-center mb-4">{getStatusBadge()}</div>
          <h1 className="text-4xl font-black tracking-tight mb-2 text-center uppercase italic leading-none">{shop.name}</h1>
          <p className="flex items-center justify-center gap-2 text-slate-500 font-bold text-sm text-center">
            <MapPin size={16} className="text-red-500" /> {shop.address}, {shop.postcode}
          </p>

          {/* 🔥 NEW: Opening Hours Dropdown */}
          <div className="flex flex-col items-center border-t border-slate-50 pt-4 mt-4">
            <button 
                onClick={() => setShowAllHours(!showAllHours)}
                className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              View Opening Hours <ChevronDown size={14} className={`transition-transform ${showAllHours ? 'rotate-180' : ''}`} />
            </button>
            
            {showAllHours && shop.business_hours && (
              <div className="mt-4 w-full max-w-xs space-y-2 animate-in fade-in slide-in-from-top-2">
                {Object.entries(shop.business_hours).map(([day, hrs]) => (
                  <div key={day} className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-slate-400">{day}</span>
                    <span className={hrs.is_closed ? "text-red-400 italic" : "text-slate-900"}>
                      {hrs.is_closed ? 'Closed' : `${hrs.open} - ${hrs.close}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3 mt-6">
            {shop.whatsapp_number && <a href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`} target="_blank" className="bg-[#25D366] text-white p-3 rounded-full hover:scale-105 transition-transform shadow-lg shadow-green-100"><MessageSquare size={20} /></a>}
            {shop.google_business_url && <a href={shop.google_business_url} target="_blank" className="bg-slate-100 text-slate-600 p-3 rounded-full hover:scale-105 transition-transform"><Globe size={20} /></a>}
          </div>
        </div>

        {/* 3. PRIMARY ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
          <button 
            onClick={handleGenericBook}
            disabled={!isActuallyOpen}
            className="flex-1 bg-black text-white font-black py-6 rounded-[2rem] shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-3 text-xl uppercase italic"
          >
            <Calendar /> {isActuallyOpen ? "Book Online" : "Currently Closed"}
          </button>

          {/* 🔥 UPDATED: Dynamic Call Shop Button instead of big WhatsApp button */}
          {shop?.business_phone && (
            <a 
              href={`tel:${shop.business_phone}`} 
              className="flex-1 bg-slate-100 text-slate-900 font-black py-6 rounded-[2rem] shadow-sm hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3 text-xl uppercase italic"
            >
              <Phone /> Call Shop
            </a>
          )}
        </div>

        {/* 4. SERVICE MENU */}
        <div className="mb-10 text-left">
          <h3 className="font-black text-xl mb-6 flex items-center gap-2 text-left uppercase italic tracking-tighter">Select Service</h3>
          <div className="grid gap-3 text-left">
            {(shop.service_menu || []).map((service, idx) => (
              <button key={idx} onClick={() => handleBookService(service)} disabled={!isActuallyOpen} className="w-full group bg-white border-2 border-slate-50 rounded-3xl p-5 hover:border-blue-600 transition-all active:scale-95 flex items-center justify-between text-left disabled:opacity-50">
                  <div className="text-left">
                    <h4 className="font-black text-lg group-hover:text-blue-600 text-left uppercase">{service.name}</h4>
                    <p className="text-slate-400 text-xs font-bold mt-1 text-left"><Clock size={12} className="inline mr-1"/> {service.duration} mins</p>
                  </div>
                  <span className="font-black text-lg text-blue-600 italic">£{service.price}</span>
              </button>
            ))}
            {(!shop.service_menu || shop.service_menu.length === 0) && (
                <div className="text-center text-slate-300 font-black uppercase text-xs py-10 bg-slate-50 rounded-3xl italic tracking-widest">No services listed yet.</div>
            )}
          </div>
        </div>

        {/* 🔥 NEW 5. PORTFOLIO GALLERY (LIVE CONDITIONAL) */}
        {shop.portfolio_photos && shop.portfolio_photos.length > 0 && (
          <section className="mb-12">
            <h3 className="font-black text-xl mb-6 text-left uppercase italic tracking-tighter">Portfolio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {shop.portfolio_photos.slice(0, 4).map((url, i) => (
                <div key={i} className="aspect-square rounded-3xl overflow-hidden bg-slate-100">
                  <img src={url} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" alt="Work Preview" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🔥 NEW 6. LOCATION & HOURS MAP */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[3rem] border border-slate-100 mb-10">
          <div>
            <h3 className="font-black text-xl mb-2 flex items-center gap-2 uppercase italic tracking-tighter"><MapPin size={20} className="text-blue-600"/> Find Us</h3>
            <p className="text-slate-500 font-bold text-sm mb-6">{shop.address}, {shop.postcode}</p>
            
            <div className="w-full h-48 rounded-[2rem] overflow-hidden shadow-inner bg-slate-200">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(shop.address + " " + shop.postcode)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div>
            <h3 className="font-black text-xl mb-6 flex items-center gap-2 uppercase italic tracking-tighter"><Clock size={20} className="text-blue-600"/> Opening Hours</h3>
            <div className="space-y-3">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                const hours = shop.business_hours?.[day] || { is_closed: false, open: "09:00", close: "18:00" };
                const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                const isToday = today === day;

                return (
                  <div key={day} className={`flex justify-between items-center py-2 border-b border-slate-200/50 ${isToday ? 'bg-blue-100/50 p-2 rounded-xl -mx-2 px-2 border-transparent' : ''}`}>
                    <span className={`font-black uppercase text-xs tracking-widest ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                      {day} {isToday && "(Today)"}
                    </span>
                    <span className={`text-sm font-bold ${hours.is_closed ? 'text-red-400' : 'text-slate-900'}`}>
                      {hours.is_closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>

      {/* 7. BOOKING MODAL */}
      {isBookingOpen && (
        <BookingModal 
          shopId={shop.id} 
          service={selectedService} 
          services={shop.service_menu || []} 
          businessHours={shop.business_hours} // 🔥 Passing hours down
          onClose={() => setIsBookingOpen(false)} 
        />
      )}
    </div>
  );
}