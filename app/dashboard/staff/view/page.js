"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, Clock, Power, Loader2, Maximize2, X, Plus,
  CheckCircle, XCircle, Scissors, Volume2, VolumeX, Activity, 
  Phone, LogOut, ChevronDown, RefreshCcw, Share, MoreVertical, QrCode,
  Download 
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import OneSignal from 'react-onesignal';
import { QRCodeSVG } from "qrcode.react";
import { QRCode } from 'react-qrcode-logo'; 

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
  const [device, setDevice] = useState("ios");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) setIsInstalled(true);
    const ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("android") > -1) setDevice("android");
  }, []);

  if (!show || isInstalled) return null;

  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-[2.5rem] mb-8 shadow-2xl relative text-left overflow-hidden">
      <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-blue-200 hover:text-white z-10 transition-colors"><X size={20}/></button>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-4 rounded-3xl flex-shrink-0">
            <Maximize2 className="text-white" size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Get the App</h3>
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-1">Install to get push alerts</p>
          </div>
        </div>
        <div className="bg-black/20 p-5 rounded-[2rem] border border-white/10 space-y-4">
          {device === "ios" ? (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl"><Share size={18} /></div>
                <p className="text-sm font-bold text-white">1. Tap the <span className="font-black underline">Share button</span> at the bottom of Safari.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl"><Plus size={18} /></div>
                <p className="text-sm font-bold text-white">2. Scroll down and tap <span className="font-black underline">Add to Home Screen</span>.</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl"><MoreVertical size={18} /></div>
                <p className="text-sm font-bold text-white">1. Tap the <span className="font-black underline">Menu button</span> (three dots) top right.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl"><Maximize2 size={18} /></div>
                <p className="text-sm font-bold text-white">2. Tap <span className="font-black underline">Install app</span> or Add to Home Screen.</p>
              </div>
            </>
          )}
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
  const [showQrModal, setShowQrModal] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://trimday.co.uk"); 
  const [pushEnabled, setPushEnabled] = useState(false); 
  
  const bookingAudio = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) {
          console.error("❌ OneSignal Error: NEXT_PUBLIC_ONESIGNAL_APP_ID is missing");
          return;
        }

        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
        });

        if (OneSignal.Notifications) {
          setPushEnabled(OneSignal.Notifications.hasPermission);
        }

      } catch (err) {
        console.error("OneSignal Init Error:", err);
      }
    };
    initOneSignal();
  }, []);

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `shop_id=eq.${sId}` }, (payload) => {
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
    try {
      const [bRes, sRes] = await Promise.all([
        supabase.from("barbers").select("*").eq("id", bId).single(),
        supabase.from("shops").select("*").eq("id", sId).single()
      ]);

      if (bRes.data) setBarber(bRes.data);
      if (sRes.data) {
        localStorage.setItem("shopName", sRes.data.name);
        let parsedMenu = sRes.data.service_menu;
        if (typeof parsedMenu === 'string') {
          try { parsedMenu = JSON.parse(parsedMenu); } catch (e) { parsedMenu = []; }
        }
        setShop({ ...sRes.data, service_menu: parsedMenu });
      }

      await fetchBookings(bId, sId);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDuty = async () => {
    if (!barber) return;
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

    const myChair = data?.filter(b => 
      String(b.barber_id) === String(bId) && 
      ["confirmed", "pending", "unverified", "rescheduled"].includes(b.status)
    ) || [];
    setMyBookings(myChair);
    
    const openPings = data?.filter(b => 
      b.barber_id === null && 
      ["pending", "unverified"].includes(b.status)
    ) || [];
    setBroadcast(openPings);
  };

  const claimBooking = async (id) => {
    const booking = broadcast.find(b => b.id === id);
    if (!booking || !barber) return;

    const { error } = await supabase.from("bookings").update({ 
      barber_id: barber.id, 
      barber_name: barber.name,
      status: 'confirmed' 
    }).eq("id", id);
    
    if (!error) {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: { ...booking, barber_name: barber.name }, type: 'confirmed' }),
      });
      fetchBookings(barber.id, shop.id);
    }
  };

  const updateStatus = async (id, status) => {
    const booking = myBookings.find(b => b.id === id);
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    
    if (!error && status === 'confirmed' && booking && !booking.client_name.includes("Walk-in")) {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: booking, type: 'confirmed' }),
      });
    }

    if (status === 'completed' || status === 'cancelled') {
      if (shop?.id) await supabase.from("shops").update({ current_status: 'available', status_updated_at: new Date().toISOString() }).eq("id", shop.id);
    }

    fetchBookings(barber.id, shop.id);
  };

  const handleReschedule = async () => {
    if (!newTimeInput || !reschedulingBooking) return;
    
    await supabase.from("bookings").update({ status: 'rescheduled', proposed_time: newTimeInput }).eq("id", reschedulingBooking.id);
    
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        booking: { ...reschedulingBooking, proposed_time: newTimeInput }, 
        type: 'rescheduled' 
      }),
    });

    setReschedulingBooking(null);
    setNewTimeInput("");
    fetchBookings(barber.id, shop.id);
  };

  const handleWalkIn = async (service) => {
    if (!shop || !barber) return;
    const formatT = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const now = new Date();
    const end = new Date(now.getTime() + service.duration * 60000);

    const { error } = await supabase.from("bookings").insert([{
      shop_id: shop.id, 
      barber_id: barber.id,
      barber_name: barber.name,
      client_name: "Walk-in Client", 
      client_phone: "Walk-in",
      client_email: `walkin-${Date.now()}@system.com`, 
      service_name: service.name, 
      booking_date: now.toISOString().split('T')[0],
      booking_time: `${formatT(now)} - ${formatT(end)}`, 
      status: 'confirmed'
    }]);

    if (!error) {
      await supabase.from("shops").update({ current_status: 'with client', status_updated_at: new Date().toISOString() }).eq("id", shop.id);
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

  const handleEnablePush = async () => {
    try {
      await OneSignal.Notifications.requestPermission();
      const subId = OneSignal.User.PushSubscription.id;
      if (subId && shop?.id) {
        await supabase.from('shops').update({ onesignal_id: subId }).eq('id', shop.id);
        setPushEnabled(true);
        alert("Native Notifications Enabled!");
      }
    } catch (error) { 
      console.error("Push failed", error); 
    }
  };

  // 🔥 UPDATED: High-Res Branded Poster logic
  const downloadQR = (canvasId, filename) => {
    const qrCanvas = document.getElementById(canvasId);
    if (!qrCanvas) return alert("QR not ready yet.");

    // Create a high-res Poster canvas
    const poster = document.createElement("canvas");
    const ctx = poster.getContext("2d");
    poster.width = 1200;
    poster.height = 1600;

    // 1. Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, poster.width, poster.height);

    // 2. Header
    ctx.textAlign = "center";
    ctx.fillStyle = "#64748b"; 
    ctx.font = "900 40px sans-serif";
    ctx.fillText("SCAN TO BOOK ONLINE", poster.width / 2, 160);

    // 3. Shop Name
    ctx.fillStyle = "#2563eb"; 
    ctx.font = "italic 900 90px sans-serif";
    const displayName = shop?.name?.toUpperCase() || "TRIMDAY BARBER";
    ctx.fillText(displayName, poster.width / 2, 280);

    // 4. Draw QR Code
    const qrSize = 750;
    const xPos = (poster.width - qrSize) / 2;
    const yPos = 400;
    ctx.drawImage(qrCanvas, xPos, yPos, qrSize, qrSize);

    // 5. Instructions
    ctx.fillStyle = "#0f172a"; 
    ctx.font = "bold 45px sans-serif";
    ctx.fillText("Point your camera at the code", poster.width / 2, 1260);
    
    ctx.fillStyle = "#64748b"; 
    ctx.font = "500 35px sans-serif";
    ctx.fillText("Tap the link to see our real-time availability", poster.width / 2, 1330);

    // 6. Footer
    ctx.fillStyle = "#cbd5e1"; 
    ctx.fillRect(400, 1420, 400, 2); 

    ctx.fillStyle = "#2563eb";
    ctx.font = "900 32px sans-serif";
    ctx.fillText("trimday.co.uk", poster.width / 2, 1500);

    // 7. Trigger Download
    const pngFile = poster.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `${filename}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-widest">Syncing Your Chair...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-left font-sans">
      <div className="relative w-full h-48 bg-slate-900 overflow-hidden shadow-inner">
        {shop?.shop_photo_url && <img src={shop.shop_photo_url} className="w-full h-full object-cover opacity-40 grayscale-[0.5]" alt="Shop" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent" />
        
        <div className="absolute top-6 right-6 z-20 flex gap-3">
          {!pushEnabled && (
            <button onClick={handleEnablePush} className="bg-white/10 backdrop-blur-md p-4 rounded-3xl text-white hover:bg-blue-600 transition-all shadow-2xl animate-pulse">
              <Activity size={20} />
            </button>
          )}
          <button onClick={() => setShowQrModal(true)} className="bg-white/10 backdrop-blur-md p-4 rounded-3xl text-white hover:bg-blue-600 transition-all shadow-2xl"><QrCode size={20} /></button>
          <button onClick={handleLogout} className="bg-white/10 backdrop-blur-md p-4 rounded-3xl text-white hover:bg-red-500 transition-all shadow-2xl"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 -mt-16 relative z-20">
        <PwaPrompt />

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-lg transition-all ${
              barber?.is_available_today ? 'bg-green-500 shadow-green-200' : 'bg-slate-400 shadow-slate-200'
            }`}>
              {barber?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2 leading-none uppercase italic">
                {barber?.name}
                <span className={`w-2 h-2 rounded-full animate-pulse ${barber?.is_available_today ? 'bg-green-500' : 'bg-red-500'}`} />
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shop?.name || 'My Shop'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
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

        <button onClick={() => setShowWalkInMenu(true)} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all mb-10 flex items-center justify-center gap-3 uppercase italic">
          <Scissors size={24} /> Add Walk-In Now
        </button>

        <section className="mb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-4 flex items-center gap-2 italic">
            <Activity size={14} className="text-blue-600" /> Unclaimed Pings ({broadcast.length})
          </h2>
          <div className="space-y-4">
            {broadcast.map(b => (
              <div key={b.id} className="p-6 bg-blue-600 text-white rounded-[2.5rem] flex justify-between items-center shadow-xl border-4 border-blue-400 animate-in slide-in-from-top-4">
                <div>
                  <p className="font-black text-xl leading-tight uppercase italic">{b.client_name}</p>
                  <p className="text-xs font-bold opacity-80 mt-1">
                    {b.status === 'unverified' ? '⏳ Email Pending' : `${b.service_name} • ${b.booking_time}`}
                  </p>
                </div>
                <button onClick={() => claimBooking(b.id)} className="bg-white text-blue-600 px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all italic">Claim</button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 ml-4 flex items-center gap-2 italic">
            <Calendar size={14} className="text-blue-600" /> My Schedule Today
          </h2>
          <div className="space-y-4">
            {myBookings.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 font-black text-slate-200 uppercase text-[10px] tracking-widest italic">No trims yet</div>
            ) : (
              myBookings.map(b => (
                <div key={b.id} className={`p-6 rounded-[2.5rem] border flex flex-col gap-4 shadow-sm transition-all ${
                  b.status === 'rescheduled' ? 'bg-blue-600/5 border-blue-500/30 border-dashed' : 'bg-white border-slate-100'
                }`}>
                   <div className="flex justify-between items-center">
                      <div className="flex gap-4 items-center">
                        <div className={`p-4 rounded-2xl min-w-[85px] text-center ${
                          b.status === 'unverified' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 
                          b.status === 'rescheduled' ? 'bg-orange-500 text-white animate-pulse' : 
                          'bg-slate-900 text-white'
                        }`}>
                          <span className="font-black text-xs">{
                            b.status === 'rescheduled' ? <Clock size={16} className="mx-auto" /> : 
                            b.booking_time.split(' ')[0]
                          }</span>
                        </div>
                        <div>
                          <p className={`font-black text-xl uppercase italic ${b.status === 'rescheduled' ? 'text-blue-600' : 'text-slate-900'}`}>{b.client_name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {b.status === 'unverified' ? '⏳ Awaiting Verify' : 
                             b.status === 'rescheduled' ? `Awaiting: ${b.proposed_time}` : 
                             b.service_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {b.status === 'confirmed' ? (
                          <button onClick={() => updateStatus(b.id, 'completed')} className="p-5 bg-green-500 text-white rounded-2xl shadow-lg hover:bg-green-600 active:scale-90 transition-all"><CheckCircle size={24} /></button>
                        ) : b.status === 'rescheduled' ? (
                          <div className="bg-blue-100 text-blue-600 p-4 rounded-2xl"><RefreshCcw size={20} className="animate-spin" /></div>
                        ) : (
                          <button onClick={() => updateStatus(b.id, 'confirmed')} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all italic">Accept</button>
                        )}
                      </div>
                   </div>

                   <div className="flex gap-2 pt-2 border-t border-slate-50">
                      <button onClick={() => updateStatus(b.id, 'cancelled')} className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors hover:bg-red-500 hover:text-white italic"><XCircle size={14}/> Cancel</button>
                      <button onClick={() => setReschedulingBooking(b)} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-colors hover:bg-slate-200 italic"><RefreshCcw size={14}/> Change</button>
                      <a href={`tel:${b.client_phone}`} className="p-3 bg-slate-900 text-white rounded-xl active:scale-90 transition-transform"><Phone size={14}/></a>
                   </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="bg-blue-600/10 p-6 rounded-[2rem] inline-block mb-6 text-blue-600"><QrCode size={48} /></div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter italic">Shop Code</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Clients scan this to book</p>
            
            <div className="bg-white p-4 rounded-3xl border-4 border-slate-50 shadow-inner flex justify-center mb-6">
              <QRCodeSVG value={`${baseUrl}/shop/${shop?.slug || shop?.id}`} size={220} level="H" includeMargin={false} />
            </div>

            {/* 🔥 HIDDEN HIGH-RES PRINTABLE POSTER (Used for drawing) */}
            <div className="hidden">
              <QRCode id="shop-qr-highres-emp" value={`${baseUrl}/shop/${shop?.slug || shop?.id}`} size={500} qrStyle="dots" eyeRadius={10} logoImage="/icon.png" logoWidth={100} logoHeight={100} bgColor="#ffffff" fgColor="#0f172a" quietZone={20} />
            </div>

            <div className="flex gap-3 mb-4">
              <button onClick={() => downloadQR("shop-qr-highres-emp", `${shop?.name || 'Shop'}-Booking-Poster`)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2">
                <Download size={16}/> Print Poster
              </button>
            </div>
            
            <button onClick={() => setShowQrModal(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Close</button>
          </div>
        </div>
      )}

      {/* WALK-IN MENU */}
      {showWalkInMenu && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-3xl font-black text-slate-900 text-center mb-10 uppercase tracking-tighter italic">Quick Walk-In</h3>
            <div className="grid gap-3">
              {(shop?.service_menu || []).map((s, idx) => (
                <button key={idx} onClick={() => handleWalkIn(s)} className="p-6 rounded-[2rem] border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex justify-between items-center font-black group text-left">
                  <div><p className="font-black text-xl uppercase italic">{s.name}</p><p className="text-[10px] text-slate-400 font-black uppercase">{s.duration} mins</p></div>
                  <span className="text-blue-600 group-hover:text-blue-700 text-2xl italic font-black">£{s.price}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWalkInMenu(false)} className="w-full mt-10 py-4 text-slate-400 font-black text-xs uppercase tracking-[0.3em] text-center">Nevermind</button>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-2 tracking-tight text-center uppercase italic">Propose New Time</h3>
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase mb-6 tracking-widest italic">Suggesting to {reschedulingBooking.client_name}</p>
            <div className="relative mb-6">
              <select className="w-full p-6 bg-slate-50 rounded-3xl text-2xl font-black appearance-none outline-none focus:ring-4 focus:ring-blue-100 transition-all text-center uppercase italic" value={newTimeInput} onChange={(e) => setNewTimeInput(e.target.value)}>
                <option value="">Select Time</option>{TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={24} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <button onClick={() => setReschedulingBooking(null)} className="py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center italic">Cancel</button>
              <button onClick={handleReschedule} disabled={!newTimeInput} className="py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest text-center active:scale-95 transition-all italic disabled:opacity-50">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}