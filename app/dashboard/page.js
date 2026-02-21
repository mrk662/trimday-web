"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, Clock, User, Phone, Power, Loader2, 
  MapPin, LogOut, CheckCircle, XCircle, MessageSquare, 
  Scissors, Save, Plus, Trash2, Settings, Volume2, VolumeX, Activity,
  Maximize2, X, Bell, ChevronDown, UserPlus, RefreshCcw, BellRing 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from 'next/link';
import OneSignal from 'react-onesignal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const DEFAULT_SERVICES = [
  { name: "Standard Haircut", duration: 30, price: 20 },
  { name: "Skin Fade", duration: 45, price: 25 },
  { name: "Beard Trim", duration: 15, price: 10 },
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

// PWA Installation Widget
function PwaPrompt() {
  const [show, setShow] = useState(true);
  const [device, setDevice] = useState("ios");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("android") > -1) setDevice("android");
  }, []);

  if (!show) return null;

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] mb-8 shadow-2xl border-4 border-slate-800 relative text-left overflow-hidden">
      <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"><X size={20}/></button>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 text-left">
          <div className="bg-slate-800 p-4 rounded-3xl flex-shrink-0">
            <Maximize2 className="text-white" size={28} />
          </div>
          <div className="text-left">
            <h3 className="text-xl font-black italic tracking-tighter uppercase leading-none text-left">Install Dashboard</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 text-left">Full-Screen Mode</p>
          </div>
        </div>
        <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 space-y-3">
          {device === "ios" ? (
            <>
              <p className="text-xs font-bold italic text-slate-300 text-left">1. Tap the <span className="text-blue-500 font-black underline">Share Icon</span> at the bottom</p>
              <p className="text-xs font-bold italic text-slate-300 text-left">2. Select <span className="text-white font-black underline">Add to Home Screen</span></p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold italic text-slate-300 text-left">1. Tap the <span className="text-blue-500 font-black underline">Three Dots (⋮)</span> top right</p>
              <p className="text-xs font-bold italic text-slate-300 text-left">2. Select <span className="text-white font-black underline">Install App</span></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Pending Request Card with Timer logic
function PendingRequestCard({ b, onUpdate, onReschedule, getTimeAgo }) {
  const [timeLeft, setTimeLeft] = useState(660);
  const isWalkIn = b.client_name === "Walk-in Client";

  useEffect(() => {
    if (isWalkIn) return;
    const start = new Date(b.created_at).getTime();
    const expiry = start + (11 * 60 * 1000); 
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        onUpdate(b.id, 'cancelled'); 
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [b.created_at, b.id, onUpdate, isWalkIn]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 120 && !isWalkIn;

  return (
    <div className={`p-6 rounded-[2.5rem] border-4 transition-all duration-300 mb-4 ${
      isUrgent ? 'bg-red-50 border-red-500 animate-booking-pulse' : 'bg-white border-slate-50 shadow-sm'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left">
          <div className={`${isUrgent ? 'bg-red-600' : 'bg-slate-900'} text-white p-4 rounded-3xl flex flex-col items-center min-w-[100px]`}>
            <span className="text-[10px] font-black uppercase opacity-60">{isWalkIn ? "Active" : "Timer"}</span>
            <span className="text-xl font-black">{isWalkIn ? "NOW" : `${mins}:${secs < 10 ? `0${secs}` : secs}`}</span>
          </div>
          <div className="text-left">
            <h3 className="text-2xl font-black text-slate-900 leading-tight text-left">{b.client_name || "Walk-in"}</h3>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest text-left">
              {b.barber_name && <span className="text-blue-600">{b.barber_name} • </span>}
              {b.service_name} • {b.booking_time}
            </p>
            {!isWalkIn && <p className="text-[10px] text-slate-400 font-black mt-1 uppercase italic text-left">Pinged {getTimeAgo(b.created_at)}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onUpdate(b.id, 'cancelled')} className="px-6 py-4 bg-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2">
            <XCircle size={18} /> {isWalkIn ? "Cancel" : "Decline"}
          </button>
          {!isWalkIn && (
            <button onClick={() => onReschedule(b)} className="px-6 py-4 bg-blue-100 text-blue-600 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all">
              Change
            </button>
          )}
          <button onClick={() => onUpdate(b.id, 'confirmed')} className={`px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-lg transition-all flex items-center justify-center gap-2 ${isUrgent ? 'bg-red-600 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}>
            <CheckCircle size={20} /> {isWalkIn ? "Finish Trim" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BarberDashboard() {
  const [shop, setShop] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [confirmedSchedule, setConfirmedSchedule] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showServiceMenu, setShowServiceMenu] = useState(false); 
  const [isEditingMenu, setIsEditingMenu] = useState(false);     
  const [menuItems, setMenuItems] = useState([]);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [selectedSound, setSelectedSound] = useState('ping1');
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // OneSignal Init
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        if (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
          await OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
          });
          setPushEnabled(OneSignal.Notifications.hasPermission);
        }
      } catch (err) {
        console.error("OneSignal Init Error:", err);
      }
    };
    initOneSignal();
  }, []);

  // Wake Lock to keep screen on
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) { console.log("WakeLock Error", err); }
    };
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (wakeLock !== null) wakeLock.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const shopId = localStorage.getItem("barberShopId");
    if (!shopId) { window.location.href = "/login"; return; }
    
    fetchInitialData(shopId);

    const channel = supabase.channel('dashboard-realtime-master')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.new && String(payload.new.shop_id) === String(shopId)) {
          if (soundEnabledRef.current) {
            const audioEl = document.getElementById("bookingAlert");
            if (audioEl) {
              audioEl.volume = 1;
              audioEl.currentTime = 0;
              audioEl.play().catch(e => console.error("Audio blocked:", e));
            }
          }
          fetchBookings(shopId);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, (payload) => {
         if (payload.new && String(payload.new.shop_id) === String(shopId)) fetchBarbers(shopId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, (payload) => {
         if (payload.new && String(payload.new.id) === String(shopId)) setShop(payload.new);
      })
      .subscribe();

    const refreshTimer = setInterval(() => fetchBookings(shopId), 30000);
    const autoClearTimer = setInterval(() => handleAutoClear(shopId), 60000); 

    return () => { 
      supabase.removeChannel(channel); 
      clearInterval(autoClearTimer); 
      clearInterval(refreshTimer);
    };
  }, []); 

  const handleAutoClear = async (shopId) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from("bookings").select("*").eq("shop_id", shopId).eq('booking_date', today).eq("status", "confirmed");
    const currentClock = `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`;
    
    data?.forEach(async (b) => {
      if (b.client_name === "Walk-in Client") {
        const timeParts = b.booking_time.split(" - ");
        if (timeParts.length === 2 && currentClock >= timeParts[1]) {
           await updateBookingStatus(b.id, 'completed'); 
        }
      }
    });
  };

  const fetchInitialData = async (id) => {
    setLoading(true);
    const { data: shopData } = await supabase.from("shops").select("*").eq("id", id).single();
    if (shopData) {
      setMenuItems(shopData.service_menu || DEFAULT_SERVICES);
      setShop(shopData);
      await Promise.all([fetchBookings(id), fetchBarbers(id)]);
    }
    setLoading(false);
  };

  const fetchBarbers = async (id) => {
    const { data } = await supabase.from("barbers").select("*").eq("shop_id", id).order("name", { ascending: true });
    setBarbers(data || []);
  };

  const fetchBookings = async (id) => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from("bookings").select("*").eq("shop_id", id).eq('booking_date', today).neq("status", "completed").neq("status", "cancelled").order("created_at", { ascending: false });
    setPendingBookings(data?.filter(b => ["pending", "active", "unverified"].includes(b.status)) || []);
    setConfirmedSchedule(data?.filter(b => b.status === "confirmed") || []);
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    if (!error) {
      if (newStatus === 'cancelled') alert("Booking cancelled.");
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        if (shop?.id) await supabase.from("shops").update({ current_status: 'available', status_updated_at: new Date().toISOString() }).eq("id", shop.id);
      }
    }
    fetchBookings(localStorage.getItem("barberShopId"));
    setReschedulingBooking(null);
  };

  const toggleBarberStatus = async (id, currentStatus) => {
    await supabase.from("barbers").update({ is_available_today: !currentStatus }).eq("id", id);
    fetchBarbers(shop.id);
  };

  const toggleStatus = async () => {
    const { data } = await supabase.from("shops").update({ is_open: !shop.is_open, status_updated_at: new Date().toISOString() }).eq("id", shop.id).select().single();
    if (data) setShop(data);
  };

  const confirmWalkIn = async (service) => {
    if (!shop?.id) return;
    const formatT = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const nowTime = new Date();
    const endTime = new Date(nowTime.getTime() + service.duration * 60000); 

    const { error } = await supabase.from("bookings").insert([{
      shop_id: shop.id, client_name: "Walk-in Client", client_phone: "Walk-in",
      client_email: `walkin-${Date.now()}@system.com`, service_name: service.name, 
      booking_date: nowTime.toISOString().split('T')[0],
      booking_time: `${formatT(nowTime)} - ${formatT(endTime)}`, status: 'confirmed'
    }]);

    if (!error) {
      await supabase.from("shops").update({ current_status: 'with client', status_updated_at: new Date().toISOString() }).eq("id", shop.id);
      fetchBookings(shop.id); 
      setShowServiceMenu(false);
    }
  };

  const saveMenuChanges = async () => {
    const validItems = menuItems.filter(item => item.name.trim() !== "");
    const { error } = await supabase.from("shops").update({ service_menu: validItems }).eq("id", shop.id);
    if (!error) { setShop({ ...shop, service_menu: validItems }); setIsEditingMenu(false); }
  };

  const getTimeAgo = (ts) => {
    const sec = Math.floor((new Date() - new Date(ts)) / 1000);
    return sec < 60 ? 'Just now' : `${Math.floor(sec/60)}m ago`;
  };

  const handleEnablePush = async () => {
    try {
      await OneSignal.Notifications.requestPermission();
      const subId = OneSignal.User.PushSubscription.id;
      if (subId && shop?.id) {
        await supabase.from('shops').update({ onesignal_id: subId }).eq('id', shop.id);
        setPushEnabled(true);
        alert("Native Notifications Enabled!");
      }
    } catch (error) { console.error("Push failed", error); }
  };

  const handleLogout = () => { localStorage.removeItem("barberShopId"); window.location.href = "/login"; };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black animate-pulse text-slate-400 uppercase tracking-widest text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 text-left">
      {/* Prime audio with playsInline */}
      <audio id="bookingAlert" src={`/${selectedSound}.mp3`} preload="auto" playsInline />

      <div className="relative w-full h-48 md:h-64 bg-slate-200 overflow-hidden shadow-inner text-left">
        <img src={shop?.shop_photo_url} alt="Banner" className={`relative w-full h-full z-10 ${shop?.photo_object_fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
        <button onClick={handleLogout} className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white active:scale-95 transition-all text-left"><LogOut size={20} /></button>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20 text-left w-full">
        <PwaPrompt />

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8 text-left">
          <div className="flex items-center gap-6 text-left">
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 italic uppercase leading-none">{shop?.name}</h1>
              <p className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] mt-2 uppercase tracking-widest text-left"><MapPin size={14} className="text-red-500"/> {shop?.postcode || "Location Not Set"}</p>
            </div>
            
            <div className="flex items-center gap-2 relative">
                {!pushEnabled && (
                  <button onClick={handleEnablePush} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg animate-pulse" title="Enable Alerts">
                    <BellRing size={24} />
                  </button>
                )}

                <button onClick={() => {
                    const nextState = !soundEnabled;
                    setSoundEnabled(nextState);
                    // CRITICAL FIX: "Prime" the audio context on first click so Chrome allows future plays
                    const audioEl = document.getElementById("bookingAlert");
                    if (audioEl) {
                        audioEl.play().then(() => {
                           if (!nextState) audioEl.pause(); // Silent prime
                        }).catch(() => {});
                    }
                }} className={`p-4 rounded-2xl transition-all ${soundEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400'}`}>
                   {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                </button>
                
                <button onClick={() => setShowSoundSettings(!showSoundSettings)} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all">
                    <Settings size={24} />
                </button>

                {showSoundSettings && (
                    <div className="absolute top-16 left-0 w-48 bg-white border border-slate-100 shadow-2xl rounded-3xl p-4 z-50">
                        <p className="text-[10px] font-black uppercase text-slate-400 mb-3 ml-2 tracking-widest italic">Alert Sound</p>
                        <div className="space-y-2">
                            {['ping1', 'ping2', 'ping3'].map((sound) => (
                                <button key={sound} onClick={() => {
                                    setSelectedSound(sound);
                                    setTimeout(() => {
                                      const audioEl = document.getElementById("bookingAlert");
                                      if (audioEl) { audioEl.volume = 1; audioEl.currentTime = 0; audioEl.play().catch(() => {}); }
                                    }, 50);
                                }} className={`w-full text-left px-4 py-3 rounded-xl font-black text-xs uppercase transition-all flex items-center justify-between ${selectedSound === sound ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                    {sound.replace('ping', 'Alert ')}
                                    {selectedSound === sound && <CheckCircle size={14} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto text-left">
            <Link href="/dashboard/staff" className="flex items-center justify-center gap-2 px-4 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all shadow-lg text-center"><UserPlus size={18} /> Team</Link>
            <button onClick={() => setIsEditingMenu(true)} className="px-4 py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><Scissors size={18} /> Menu</button>
            <button onClick={() => setShowServiceMenu(true)} className="px-4 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">Walk-In</button>
            <button onClick={toggleStatus} className={`px-4 py-5 rounded-2xl font-black text-xs uppercase transition-all shadow-lg active:scale-95 ${shop?.is_open ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-50 text-red-500 shadow-red-200'}`}><Power size={18} className="inline mr-2" /> {shop?.is_open ? "OPEN" : "CLOSED"}</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left w-full">
          <div className="lg:col-span-2 space-y-8 text-left">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-left">
              <div className="flex items-center justify-between mb-8 text-left">
                <h2 className="text-xl font-black flex items-center gap-3 text-left uppercase italic tracking-tighter text-blue-600"><Activity /> New Pings</h2>
                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black">{pendingBookings.length}</span>
              </div>
              <div className="grid gap-4 text-left">
                {pendingBookings.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-[2.5rem] font-black text-slate-200 uppercase text-[10px] tracking-widest italic text-center">All caught up</div>
                ) : (
                  pendingBookings.map((b) => (
                    <PendingRequestCard key={b.id} b={b} onUpdate={updateBookingStatus} onReschedule={(b) => setReschedulingBooking(b)} getTimeAgo={getTimeAgo} />
                  ))
                )}
              </div>
            </section>

            <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl text-left">
              <h2 className="text-xl font-black flex items-center gap-3 mb-8 text-left uppercase italic tracking-tighter"><Calendar className="text-blue-400" /> Today's Chair</h2>
              <div className="grid gap-3 text-left">
                {confirmedSchedule.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 font-bold italic text-xs uppercase tracking-widest text-center">No confirmed trims yet</p>
                ) : (
                  confirmedSchedule.map((b) => (
                    <div key={b.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/10 mb-3 text-left">
                      <div className="flex items-center gap-4 text-left mb-4 md:mb-0">
                        <div className="bg-blue-600 p-3 rounded-2xl text-center min-w-[80px]"><span className="block text-xs font-black">{b.booking_time}</span></div>
                        <div className="text-left truncate">
                          <p className="font-black text-lg text-left">{b.client_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left truncate">{b.barber_name || "Any Barber"} • {b.service_name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-left justify-end">
                        <a href={`tel:${b.client_phone}`} className="p-4 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all shadow-lg text-left"><Phone size={20}/></a>
                        <button onClick={() => updateBookingStatus(b.id, 'cancelled')} className="p-4 bg-red-500/10 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-500/20 text-left"><XCircle size={22} /></button>
                        <button onClick={() => updateBookingStatus(b.id, 'completed')} className="p-4 bg-green-500 rounded-2xl text-white hover:bg-green-400 transition-all shadow-lg border border-green-400 text-left"><CheckCircle size={22} strokeWidth={3} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8 text-left w-full">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-fit text-left">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2 text-left uppercase italic tracking-tighter"><User className="text-blue-600" /> Staff on Duty</h2>
              <div className="space-y-4 text-left">
                {barbers.map(barber => {
                  const isBusy = confirmedSchedule.some(b => b.barber_id === barber.id);
                  return (
                    <div key={barber.id} className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all text-left ${isBusy ? 'bg-blue-50 border-blue-100 shadow-inner' : 'bg-slate-50 border-transparent hover:border-blue-100'}`}>
                      <div className="text-left flex-1 pr-2">
                        <p className="font-black text-slate-900 text-left flex items-center gap-2 leading-none">{barber.name} {isBusy && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}</p>
                        <p className={`text-[9px] font-black uppercase tracking-tighter text-left mt-1 ${barber.is_available_today ? 'text-green-500' : 'text-red-500'}`}>{barber.is_available_today ? 'Available' : 'Off Duty'}</p>
                      </div>
                      <button onClick={() => toggleBarberStatus(barber.id, barber.is_available_today)} className={`p-3 rounded-xl transition-all shadow-sm ${barber.is_available_today ? 'bg-green-500 text-white' : 'bg-red-100 text-red-500'}`}><Power size={18} /></button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ALL MODALS (SERVICE MENU, WALK-IN, CHANGE TIME) RESTORED EXACTLY */}
      {isEditingMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-left">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-left">Edit Menu</h3>
              <button onClick={() => setIsEditingMenu(false)} className="text-slate-400 hover:text-slate-900 text-left"><X size={24} /></button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 mb-8 text-left">
              {menuItems.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-slate-50 p-4 rounded-[2rem] border border-transparent hover:border-blue-100 transition-all text-left">
                  <div className="flex-1 text-left"><label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Service Name</label><input type="text" value={item.name} onChange={(e) => { const updated = [...menuItems]; updated[idx].name = e.target.value; setMenuItems(updated); }} className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm text-left" /></div>
                  <div className="w-24 text-left"><label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block">Price £</label><input type="number" value={item.price} onChange={(e) => { const updated = [...menuItems]; updated[idx].price = e.target.value; setMenuItems(updated); }} className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm text-left" /></div>
                  <button onClick={() => setMenuItems(menuItems.filter((_, i) => i !== idx))} className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all text-left"><Trash2 size={18}/></button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-left">
              <button onClick={() => setMenuItems([...menuItems, { name: "", duration: 30, price: 0 }])} className="flex-1 bg-slate-100 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2"><Plus size={16}/> Add Service</button>
              <button onClick={saveMenuChanges} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg"><Save size={16}/> Save</button>
            </div>
          </div>
        </div>
      )}

      {showServiceMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 text-center">
            <h3 className="text-2xl font-black text-slate-900 text-center mb-6 uppercase tracking-tighter italic">New Walk-In</h3>
            <div className="grid gap-2 text-left">
              {menuItems.map((service, idx) => (
                <button key={idx} onClick={() => confirmWalkIn(service)} className="p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex justify-between items-center font-black group text-left">
                  <div className="text-left text-left"><p className="font-black text-lg text-left">{service.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase text-left">{service.duration} mins</p></div>
                  <span className="text-blue-600 group-hover:text-blue-700 text-xl italic font-black text-left">£{service.price}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowServiceMenu(false)} className="w-full mt-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest text-center text-left">Cancel</button>
          </div>
        </div>
      )}

      {reschedulingBooking && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-left">
            <h3 className="text-2xl font-black mb-2 tracking-tight text-left">Change Time</h3>
            <div className="relative mb-6 text-left">
              <select className="w-full p-6 bg-slate-50 rounded-3xl text-2xl font-black appearance-none outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer text-center text-left" value={newTimeInput} onChange={(e) => setNewTimeInput(e.target.value)}>
                <option value="">Select Time</option>{TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-left" size={24} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <button onClick={() => setReschedulingBooking(null)} className="py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest text-center text-left">Cancel</button>
              <button onClick={async () => {
                if (!newTimeInput) return;
                await supabase.from("bookings").update({ status: 'rescheduled', proposed_time: newTimeInput }).eq("id", reschedulingBooking.id);
                setReschedulingBooking(null); setNewTimeInput(""); fetchBookings(shop.id);
              }} disabled={!newTimeInput} className="py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl tracking-widest text-center">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}