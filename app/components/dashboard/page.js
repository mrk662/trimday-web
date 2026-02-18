"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Check, X, Clock, Calendar as CalIcon, User, 
  Phone, Power, RefreshCcw, Scissors, Activity, Settings,
  Volume2, VolumeX
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function BarberDashboard() {
  const [shop, setShop] = useState(null);
  const [pending, setPending] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(false); // Browser safety toggle

  // Sound Refs
  const bookingAudio = useRef(null);
  const statusAudio = useRef(null);

  useEffect(() => {
    // Initialize Audio objects
    bookingAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Ping for new
    statusAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'); // Alert for status change

    fetchInitialData();

    // REALTIME SUBSCRIPTION
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        if (soundEnabled) bookingAudio.current.play().catch(e => console.log("Audio block:", e));
        fetchBookings();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
        if (soundEnabled) statusAudio.current.play().catch(e => console.log("Audio block:", e));
        fetchBookings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => fetchBarbers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, (payload) => setShop(payload.new))
      .subscribe();

    const timer = setInterval(() => setNow(new Date()), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [soundEnabled]); // Re-subscribe when sound toggle changes

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: shopData } = await supabase.from('shops').select('*').limit(1).single();
    setShop(shopData);
    
    if (shopData) {
      await Promise.all([
        fetchBookings(shopData.id), 
        fetchBarbers(shopData.id)
      ]);
    }
    setLoading(false);
  };

  const fetchBookings = async () => {
    const { data: pend } = await supabase.from('bookings').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setPending(pend || []);

    const today = new Date().toISOString().split('T')[0];
    const { data: sched } = await supabase.from('bookings').select('*').eq('status', 'confirmed').eq('booking_date', today).order('booking_time', { ascending: true });
    setSchedule(sched || []);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase.from('barbers').select('*').order('name', { ascending: true });
    setBarbers(data || []);
  };

  // --- ACTIONS ---

  const toggleShopOpen = async () => {
    const { data } = await supabase.from('shops').update({ 
      is_open: !shop.is_open,
      status_updated_at: new Date().toISOString() 
    }).eq('id', shop.id).select().single();
    if (data) setShop(data);
  };

  const updateShopStatus = async (newStatus) => {
    const { data } = await supabase.from('shops').update({ 
      current_status: newStatus,
      status_updated_at: new Date().toISOString() 
    }).eq('id', shop.id).select().single();
    if (data) setShop(data);
  };

  const updateBookingStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    // Realtime listener will handle sound and refresh
  };

  const toggleBarberStatus = async (id, currentStatus) => {
    await supabase.from('barbers').update({ is_on_duty: !currentStatus }).eq('id', id);
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((now - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Initialising System...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* 1. HEADER SECTION */}
        <div className="flex flex-col items-center mb-10">
          <div className="bg-white rounded-[2.5rem] px-8 py-6 shadow-xl border border-slate-100 w-full max-w-3xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-black tracking-tighter">{shop?.name}</h1>
                    <Settings className="text-slate-300 hover:text-blue-600 transition-colors" size={18} />
                  </div>
                  <p className="text-[10px] font-black text-red-500 flex items-center gap-1 uppercase tracking-widest">
                    <MapPin size={12} /> {shop?.postcode}
                  </p>
               </div>

               {/* SOUND TOGGLE (Crucial for browser autoplay policy) */}
               <button 
                 onClick={() => setSoundEnabled(!soundEnabled)}
                 className={`p-3 rounded-2xl transition-all ${soundEnabled ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
               >
                 {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
               </button>
            </div>

            <button 
              onClick={toggleShopOpen}
              className={`flex items-center gap-3 px-10 py-5 rounded-3xl font-black text-sm transition-all active:scale-95 ${
                shop?.is_open ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-red-500 text-white shadow-lg shadow-red-100'
              }`}
            >
              <Power size={20} /> {shop?.is_open ? 'SHOP IS OPEN' : 'SHOP IS CLOSED'}
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 mt-6 w-full max-w-3xl">
              <div className="flex flex-1 gap-2 bg-white p-2 rounded-[2rem] shadow-md border border-slate-50 w-full">
                {['available', 'with client', 'booked out'].map((s) => (
                  <button 
                    key={s}
                    onClick={() => updateShopStatus(s)}
                    className={`flex-1 py-4 rounded-full font-black text-[10px] uppercase transition-all ${
                      shop?.current_status === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
              <div className="bg-white px-8 py-4 rounded-3xl shadow-md border border-slate-50 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Activity</p>
                  <p className="font-black text-blue-600 text-sm mt-1">{getTimeAgo(shop?.status_updated_at)}</p>
              </div>
          </div>
        </div>

        {/* 2. MAIN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Live Bookings */}
          <div className="lg:col-span-2 space-y-10">
            <section>
              <div className="flex items-center justify-between mb-6 px-2">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Activity className="text-red-500 animate-pulse" size={20} />
                  Incoming Requests
                </h2>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-black">{pending.length}</span>
              </div>
              
              <div className="space-y-4">
                {pending.length > 0 ? pending.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border-2 border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">NEW</span>
                        <p className="font-black text-xl">{b.client_name}</p>
                      </div>
                      <p className="text-slate-500 font-bold flex items-center gap-1 text-sm">
                        <Scissors size={14} className="text-blue-600" /> {b.service_name} with <span className="text-slate-900">{b.barber_name}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateBookingStatus(b.id, 'declined')} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><X size={20}/></button>
                      <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="px-8 py-4 bg-black text-white rounded-2xl font-black hover:bg-blue-600 transition-all">CONFIRM</button>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-16 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No active pings</div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 px-2">
                <CalIcon className="text-blue-600" size={20} /> Today's Confirmed
              </h2>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                {schedule.length > 0 ? (
                  <div className="space-y-6">
                    {schedule.map(slot => (
                      <div key={slot.id} className="flex items-center gap-6 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="font-black text-blue-600 bg-blue-50 w-24 py-2 rounded-xl text-center">{slot.booking_time}</div>
                        <div className="flex-1">
                          <p className="font-black text-slate-900 text-lg">{slot.client_name}</p>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-tighter">{slot.barber_name} • {slot.service_name}</p>
                        </div>
                        <a href={`tel:${slot.client_phone}`} className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 transition-all"><Phone size={20} /></a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-300 font-bold italic uppercase text-xs tracking-widest">Empty Schedule</p>
                )}
              </div>
            </section>
          </div>

          {/* Column 2: Staff */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2 px-2">
                <User className="text-blue-600" size={20} /> Staff Status
              </h2>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                <div className="space-y-4">
                  {barbers.map(barber => (
                    <div key={barber.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-blue-100 transition-all group">
                      <div>
                        <p className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{barber.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-tighter ${barber.is_on_duty ? 'text-green-500' : 'text-red-500'}`}>
                          {barber.is_on_duty ? 'On Duty' : 'Off Duty'}
                        </p>
                      </div>
                      <button onClick={() => toggleBarberStatus(barber.id, barber.is_on_duty)} className={`p-3 rounded-xl transition-all shadow-sm ${barber.is_on_duty ? 'bg-green-500 text-white' : 'bg-red-100 text-red-500'}`}><Power size={20} /></button>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-center">
                    <button onClick={fetchInitialData} className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"><RefreshCcw size={14} /> Refresh Dashboard</button>
                </div>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}