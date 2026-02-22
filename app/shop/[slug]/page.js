"use client";
import React, { useEffect, useState, use } from "react";
import { 
  MapPin, Globe, MessageSquare, Calendar, Loader2, 
  Clock, ChevronRight, Info 
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

  const handleBookService = (service) => {
    if (!shop.is_open) return;
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const handleGenericBook = () => {
    setSelectedService(null);
    setIsBookingOpen(true);
  };

  const getStatusBadge = () => {
    if (!shop.is_open) return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Shop Closed</span>;
    if (shop.current_status === 'booked out') return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Booked Out</span>;
    if (shop.current_status === 'with client') return <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Busy (With Client)</span>;
    return <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">● Available Now</span>;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  if (!shop) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Shop not found.</div>;

  // FORMATTING: Ensures WhatsApp link is clean of spaces/dashes
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
          <h1 className="text-4xl font-black tracking-tight mb-2 text-center">{shop.name}</h1>
          <p className="flex items-center justify-center gap-2 text-slate-500 font-bold text-sm text-center">
            <MapPin size={16} className="text-red-500" /> {shop.address}, {shop.postcode}
          </p>

          <div className="flex justify-center gap-3 mt-6">
            <a href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`} target="_blank" className="bg-[#25D366] text-white p-3 rounded-full hover:scale-105 transition-transform shadow-lg shadow-green-100"><MessageSquare size={20} /></a>
            {shop.google_business_url && <a href={shop.google_business_url} target="_blank" className="bg-slate-100 text-slate-600 p-3 rounded-full hover:scale-105 transition-transform"><Globe size={20} /></a>}
          </div>
        </div>

        {/* 3. PRIMARY ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
          <button 
            onClick={handleGenericBook}
            disabled={!shop.is_open}
            className="flex-1 bg-black text-white font-black py-6 rounded-[2rem] shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:grayscale flex items-center justify-center gap-3 text-xl"
          >
            <Calendar /> {shop.is_open ? "Book Online" : "Currently Closed"}
          </button>

          <a href={`https://wa.me/${cleanPhone}?text=${whatsappMsg}`} target="_blank" className="flex-1 bg-[#25D366] text-white font-black py-6 rounded-[2rem] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 text-xl">
            <MessageSquare /> WhatsApp
          </a>
        </div>

        {/* 4. SERVICE MENU */}
        <div className="mb-10 text-left">
          <h3 className="font-black text-xl mb-6 flex items-center gap-2 text-left">Select Service</h3>
          <div className="grid gap-3 text-left">
            {(shop.service_menu || []).map((service, idx) => (
              <button key={idx} onClick={() => handleBookService(service)} disabled={!shop.is_open} className="w-full group bg-white border-2 border-slate-50 rounded-3xl p-5 hover:border-blue-600 transition-all active:scale-95 flex items-center justify-between text-left disabled:opacity-50">
                  <div className="text-left">
                    <h4 className="font-black text-lg group-hover:text-blue-600 text-left">{service.name}</h4>
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
      </div>

      {/* 5. BOOKING MODAL */}
      {isBookingOpen && (
        <BookingModal 
          shopId={shop.id} 
          service={selectedService} 
          services={shop.service_menu || []} 
          onClose={() => setIsBookingOpen(false)} 
        />
      )}
    </div>
  );
}