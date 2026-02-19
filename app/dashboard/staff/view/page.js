"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, Clock, Power, Loader2, Maximize2, X, 
  CheckCircle, XCircle, Scissors, Volume2, VolumeX, Activity, 
  Phone, LogOut, ChevronDown, RefreshCcw
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

function PwaPrompt() {
  const [show, setShow] = useState(true);
  if (!show) return null;
  return (
    <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] mb-8 shadow-2xl border-4 border-blue-600 animate-in fade-in zoom-in-95 relative text-left">
      <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
      <div className="flex items-center gap-5">
        <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-500/50 flex-shrink-0">
          <Maximize2 className="text-white" size={28} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-xl font-black flex items-center gap-2 text-left">Add to Home Screen <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px]">+</span></h3>
          <p className="text-xs font-bold text-slate-300 mt-1 text-left leading-relaxed italic">
            "Tap Share then Add to Home Screen for a full-screen widget."
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StaffGoldenDashboard() {
  const [barber, setBarber] = useState(null);
  const [shop, setShop] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [broadcast, setBroadcast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showWalkInMenu, setShowWalkInMenu] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [newTimeInput, setNewTimeInput] = useState("");
  
  const bookingAudio = useRef(null);

  useEffect(() => {
    bookingAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    const bId = localStorage.getItem("barberId");
    const sId = localStorage.getItem("barberShopId");
    
    if (!bId || !sId) { window.location.href = "/login"; return; }
    
    fetchInitialData(bId, sId);

    const channel = supabase.channel('staff-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `shop_id=eq.${sId}` }, (payload) => {
        if (soundEnabled && payload.eventType === 'INSERT') bookingAudio.current.play().catch(() => {});
        fetchBookings(bId, sId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers', filter: `id=eq.${bId}` }, (payload) => {
        setBarber(payload.new); 
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [soundEnabled]);

  const fetchInitialData = async (bId, sId) => {
    setLoading(true);
    const [bRes, sRes] = await Promise.all([
      supabase.from("barbers").select("*").eq("id", bId).single(),
      supabase.from("shops").select("*").eq("id", sId).single()
    ]);
    setBarber(bRes.data);
    setShop(sRes.data);
    await fetchBookings(bId, sId);
    setLoading(false);
  };

  const toggleDuty = async () => {
    const newStatus = !barber.is_available_today;
    const { error } = await supabase.from("barbers").update({ is_available_today: newStatus }).eq("id", barber.id);
    if (!error) setBarber({ ...barber, is_available_today: newStatus });
  };

  const fetchBookings = async (bId, sId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from("bookings")
      .select("*")
      .eq("shop_id", sId)
      .eq('booking_date', today)
      .neq("status", "completed")
      .neq("status", "cancelled");

    // FIX: Show direct bookings even if they are 'unverified'
    const myChair = data?.filter(b => 
      String(b.barber_id) === String(bId) && 
      ["confirmed", "pending", "unverified", "rescheduled"].includes(b.status)
    ) || [];
    setMyBookings(myChair);
    
    // Broadcast for "Any Barber" (also showing unverified so pings are instant)
    const openPings = data?.filter(b => 
      b.barber_id === null && 
      ["pending", "unverified"].includes(b.status)
    ) || [];
    setBroadcast(openPings);
  };

  const claimBooking = async (id) => {
    const { error } = await supabase.from("bookings").update({ 
      barber_id: barber.id, 
      barber_name: barber.name,
      status: 'confirmed' 
    }).eq("id", id);
    
    if (!error) fetchBookings(barber.id, shop.id);
  };

  const updateStatus = async (id, status) => {
    await supabase.from("bookings").update({ status }).eq("id", id);
    fetchBookings(barber.id, shop.id);
  };

  const handleReschedule = async () => {
    if (!newTimeInput) return;
    await supabase.from("bookings").update({ status: 'rescheduled', proposed_time: newTimeInput }).eq("id", reschedulingBooking.id);
    setReschedulingBooking(null);
    setNewTimeInput("");
    fetchBookings(barber.id, shop.id);
  };

  const handleWalkIn = async (service) => {
    const formatT = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const now = new Date();
    const end = new Date(now.getTime() + service.duration * 60000);

    const { error } = await supabase.from("bookings").insert([{
      shop_id: shop.id, 
      barber_id: barber.id,
      barber_name: barber.name,
      client_name: "Walk-in", 
      client_phone: "Walk-in",
      client_email: `walkin-${Date.now()}@system.com`, 
      service_name: service.name, 
      booking_date: now.toISOString().split('T')[0],
      booking_time: `${formatT(now)} - ${formatT(end)}`, 
      status: 'confirmed'
    }]);

    if (!error) {
      setShowWalkInMenu(false);
      fetchBookings(barber.id, shop.id);
    }
  };

  const handleLogout = async () => {
    if (barber?.id) {
       await supabase.from("barbers").update({ is_available_today: false }).eq("id", barber.id);
    }
    localStorage.clear();
    window.location.href = "/login";
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase">Syncing Your Chair...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-left font-sans">
      <div className="relative w-full h-48 bg-slate-900 overflow-hidden shadow-inner">
        <img src={shop?.shop_photo_url} className="w-full h-full object-cover opacity-40 grayscale-[0.5]" alt="Shop" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent" />
        <button onClick={handleLogout} className="absolute top-6 right-6 z-20 bg-white/10 backdrop-blur-md p-4 rounded-3xl text-white hover:bg-red-500 transition-all shadow-2xl">
          <LogOut size={20} />
        </button>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-16 relative z-20 text-left text-left">
        <PwaPrompt />

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex justify-between items-center mb-10 text-left">
          <div className="flex items-center gap-4 text-left text-left">
            {shop?.shop_photo_url ? (
              <img src={shop.shop_photo_url} className="w-16 h-16 rounded-[1.5rem] object-cover border-2 border-slate-100 shadow-md" alt="Logo" />
            ) : (
              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg transition-all ${
                barber?.is_available_today ? 'bg-green-500 shadow-green-200' : 'bg-slate-400 shadow-slate-200'
              }`}>
                {barber?.name?.charAt(0)}
              </div>
            )}
            <div className="text-left text-left">
              <h1 className="text-2xl font-black tracking-tight text-left flex items-center gap-2">
                {barber?.name}
                <span className={`w-2 h-2 rounded-full animate-pulse ${barber?.is_available_today ? 'bg-green-500' : 'bg-red-500'}`} />
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">{shop?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-left">
            <button 
              onClick={toggleDuty} 
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase transition-all active:scale-95 ${
                barber?.is_available_today 
                ? 'bg-green-50 text-green-600 border border-green-100 shadow-sm' 
                : 'bg-red-50 text-red-600 border border-red-100'
              }`}
            >
              <Power size={14} />
              {barber?.is_available_today ? "Online" : "Offline"}
            </button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-4 rounded-2xl transition-all ${soundEnabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
              {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>
          </div>
        </div>

        <button onClick={() => setShowWalkInMenu(true)} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all mb-10 flex items-center justify-center gap-3">
          <Scissors size={24} /> Add Walk-In Now
        </button>

        <section className="mb-10 text-left text-left">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-4 flex items-center gap-2">
            <Activity size={14} className="text-blue-600" /> Unclaimed Pings ({broadcast.length})
          </h2>
          <div className="space-y-4 text-left">
            {broadcast.map(b => (
              <div key={b.id} className="p-6 bg-blue-600 text-white rounded-[2.5rem] flex justify-between items-center shadow-xl border-4 border-blue-400 animate-in slide-in-from-top-4">
                <div className="text-left">
                  <p className="font-black text-xl leading-tight text-left">{b.client_name}</p>
                  <p className="text-xs font-bold opacity-80 mt-1 text-left">
                    {b.status === 'unverified' ? '⏳ Email Pending' : `${b.service_name} • ${b.booking_time}`}
                  </p>
                </div>
                <button 
                  onClick={() => claimBooking(b.id)} 
                  className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="text-left text-left">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-4 flex items-center gap-2">
            <Calendar size={14} className="text-blue-600" /> My Schedule Today
          </h2>
          <div className="space-y-4 text-left">
            {myBookings.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 font-black text-slate-200 uppercase text-[10px] tracking-widest italic">No trims yet</div>
            ) : (
              myBookings.map(b => (
                <div key={b.id} className="p-6 bg-white rounded-[2.5rem] border border-slate-100 flex flex-col gap-4 shadow-sm group hover:shadow-md transition-all text-left">
                   <div className="flex justify-between items-center text-left text-left">
                      <div className="flex gap-4 items-center text-left">
                        <div className={`p-4 rounded-2xl min-w-[85px] text-center ${b.status === 'unverified' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-900 text-white'}`}>
                          <span className="font-black text-xs">{b.booking_time.split(' ')[0]}</span>
                        </div>
                        <div className="text-left">
                          <p className="font-black text-xl text-slate-900 text-left">{b.client_name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                            {b.status === 'unverified' ? '⏳ Awaiting Verify' : b.service_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-left">
                        {(b.status === 'pending' || b.status === 'unverified' || b.status === 'rescheduled') ? (
                          <button 
                            onClick={() => updateStatus(b.id, 'confirmed')} 
                            className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all"
                          >
                            Accept
                          </button>
                        ) : (
                          <button 
                            onClick={() => updateStatus(b.id, 'completed')} 
                            className="p-5 bg-green-500 text-white rounded-2xl shadow-lg hover:bg-green-600 active:scale-90 transition-all text-left"
                          >
                            <CheckCircle size={24} />
                          </button>
                        )}
                      </div>
                   </div>

                   <div className="flex gap-2 pt-2 border-t border-slate-50 text-left">
                      <button onClick={() => updateStatus(b.id, 'cancelled')} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors hover:bg-red-500 hover:text-white">
                        <XCircle size={14}/> Cancel
                      </button>
                      <button onClick={() => setReschedulingBooking(b)} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors hover:bg-slate-200">
                        <RefreshCcw size={14}/> Change
                      </button>
                      <a href={`tel:${b.client_phone}`} className="p-3 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform">
                        <Phone size={14}/>
                      </a>
                   </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {showWalkInMenu && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 text-left">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 text-left">
            <h3 className="text-3xl font-black text-slate-900 text-center mb-10 uppercase tracking-tighter italic">Quick Walk-In</h3>
            <div className="grid gap-3 text-left">
              {(shop?.service_menu || []).map((s, idx) => (
                <button key={idx} onClick={() => handleWalkIn(s)} className="p-6 rounded-[2rem] border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex justify-between items-center font-black group text-left">
                  <div className="text-left"><p className="font-black text-xl text-left">{s.name}</p><p className="text-[10px] text-slate-400 font-black uppercase text-left">{s.duration} mins</p></div>
                  <span className="text-blue-600 group-hover:text-blue-700 text-2xl italic font-black text-left">£{s.price}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWalkInMenu(false)} className="w-full mt-10 py-4 text-slate-400 font-black text-xs uppercase tracking-[0.3em] text-center">Nevermind</button>
          </div>
        </div>
      )}

      {reschedulingBooking && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-left">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-left">
            <h3 className="text-2xl font-black mb-6 tracking-tight text-center">Change Time</h3>
            <div className="relative mb-6 text-left">
              <select 
                className="w-full p-6 bg-slate-50 rounded-3xl text-2xl font-black appearance-none outline-none focus:ring-4 focus:ring-blue-100 transition-all text-center" 
                value={newTimeInput} 
                onChange={(e) => setNewTimeInput(e.target.value)}
              >
                <option value="">Select Time</option>
                {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={24} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <button onClick={() => setReschedulingBooking(null)} className="py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest text-center">Cancel</button>
              <button 
                onClick={handleReschedule} 
                disabled={!newTimeInput} 
                className="py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl tracking-widest text-center active:scale-95 transition-all"
              >
                Send Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}