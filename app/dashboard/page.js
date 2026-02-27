"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, Clock, User, Phone, Power, Loader2, 
  MapPin, LogOut, CheckCircle, XCircle, MessageSquare, 
  Scissors, Save, Plus, Trash2, Settings, Volume2, VolumeX, Activity,
  Maximize2, X, Bell, ChevronDown, UserPlus, RefreshCcw, BellRing,
  CreditCard, Share2, Download, MessageCircle, Share, MoreVertical, Lock,
  AlertTriangle, TrendingUp, Eye, EyeOff, Music, MailWarning
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from 'next/link';
import OneSignal from 'react-onesignal';
import { QRCode } from 'react-qrcode-logo'; 

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

const DEFAULT_HOURS = {
  mon: { open: "09:00", close: "18:00", is_closed: false },
  tue: { open: "09:00", close: "18:00", is_closed: false },
  wed: { open: "09:00", close: "18:00", is_closed: false },
  thu: { open: "09:00", close: "20:00", is_closed: false },
  fri: { open: "09:00", close: "18:00", is_closed: false },
  sat: { open: "09:00", close: "17:00", is_closed: false },
  sun: { open: "09:00", close: "17:00", is_closed: true },
};

const Avatar = ({ name, offline = false }) => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 ${offline ? 'bg-slate-200 grayscale' : 'bg-slate-900'}`}>
      <span className={`font-black italic text-[10px] tracking-tighter ${offline ? 'text-slate-400' : 'text-white'}`}>{initials}</span>
    </div>
  );
};

function PwaPrompt() {
  const [show, setShow] = useState(true);
  const [device, setDevice] = useState("ios");
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) setIsInstalled(true);
    
    const ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("android") > -1) {
      setDevice("android");
    } else if (!/iphone|ipad|ipod/.test(ua)) {
      setDevice("desktop");
    }
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
          ) : device === "android" ? (
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
          ) : (
             <div className="flex items-center gap-3">
               <div className="bg-white/10 p-2.5 rounded-xl"><Maximize2 size={18} /></div>
               <p className="text-sm font-bold text-white">Look in your address bar up top and click the <span className="font-black underline">Install Icon</span> to get the app.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingRequestCard({ b, onUpdate, onReschedule, getTimeAgo }) {
  const [timeLeft, setTimeLeft] = useState(660);
  const isWalkIn = b.client_name === "Walk-in Client";
  const isUnverified = b.status === "unverified";

  useEffect(() => {
    if (isWalkIn) return;
    const start = new Date(b.created_at).getTime();
    const expiry = start + (11 * 60 * 1000); 
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        onUpdate(b, 'cancelled'); 
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [b.created_at, b.id, onUpdate, isWalkIn]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 120 && !isWalkIn;

  return (
    <div className={`p-6 rounded-[2.5rem] border-4 transition-all duration-300 mb-4 ${
      isUrgent ? 'bg-red-50 border-red-500 animate-booking-pulse' : 
      isUnverified ? 'bg-amber-50 border-amber-200 opacity-80' : 'bg-white border-slate-50 shadow-sm'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left">
          <Avatar name={b.client_name || "W"} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-slate-900 leading-tight">{b.client_name || "Walk-in"}</h3>
              {isUnverified && (
                <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter animate-pulse">Awaiting Email</span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {b.barber_name && <span className="text-blue-600">{b.barber_name} • </span>}
              {b.service_name} • {b.booking_time}
            </p>
            {!isWalkIn && <p className="text-[10px] text-slate-400 font-black mt-1 uppercase italic">Pinged {getTimeAgo(b.created_at)}</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => onUpdate(b, 'cancelled')} className="px-6 py-4 bg-red-100 text-red-600 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 italic">
            <XCircle size={18} /> {isWalkIn ? "Cancel" : "Decline"}
          </button>
          {!isWalkIn && (
            <button onClick={() => onReschedule(b)} className="px-6 py-4 bg-blue-100 text-blue-600 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all italic">
              Change
            </button>
          )}
          <button onClick={() => onUpdate(b, 'confirmed')} className={`px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-lg transition-all flex items-center justify-center gap-2 italic ${isUrgent ? 'bg-red-600 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}>
            <CheckCircle size={20} /> {isWalkIn ? "Finish" : "Accept"}
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
  const [allTodayBookings, setAllTodayBookings] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false); 
  const [showServiceMenu, setShowServiceMenu] = useState(false); 
  const [isEditingMenu, setIsEditingMenu] = useState(false);     
  const [menuItems, setMenuItems] = useState([]);
  const [reschedulingBooking, setReschedulingBooking] = useState(null);
  const [newTimeInput, setNewTimeInput] = useState("");
  const [selectedSound, setSelectedSound] = useState('ping1');
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://trimday.co.uk");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [shopSettings, setShopSettings] = useState({ name: "", shop_photo_url: "", google_review_url: "", business_phone: "" });
  const [businessHours, setBusinessHours] = useState(DEFAULT_HOURS);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showSetupNudge, setShowSetupNudge] = useState(true);

  const soundEnabledRef = useRef(soundEnabled);
  const selectedSoundRef = useRef(selectedSound);

  useEffect(() => { if (typeof window !== "undefined") { setBaseUrl(window.location.origin); } }, []);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { selectedSoundRef.current = selectedSound; }, [selectedSound]);

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        if (process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID) {
          await OneSignal.init({
            appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
          });
          if (OneSignal.Notifications) {
            setPushEnabled(OneSignal.Notifications.hasPermission);
          }
        }
      } catch (err) {
        console.error("OneSignal Init Error:", err);
      }
    };
    initOneSignal();
  }, []);

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

    // 🔥 UPDATED REALTIME MASTER LISTENER
    const channel = supabase.channel('dashboard-realtime-master')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        if (payload.new && String(payload.new.shop_id) === String(shopId)) {
          
          // Logic: Only play sound if it's a Walk-in OR an already verified booking
          const shouldAlertNow = payload.new.status !== 'unverified' || payload.new.client_name === "Walk-in Client";

          if (shouldAlertNow && soundEnabledRef.current) {
            const audioEl = document.getElementById("bookingAlert");
            if (audioEl) {
              audioEl.src = `/${selectedSoundRef.current}.mp3`;
              audioEl.volume = 1;
              audioEl.currentTime = 0;
              audioEl.play().catch(e => console.error("Audio blocked:", e));
            }
          }
          fetchBookings(shopId);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' }, (payload) => {
          if (payload.new && String(payload.new.shop_id) === String(shopId)) {
            
            // Logic: If the booking just became verified (Yellow -> Green)
            if (payload.old.status === 'unverified' && payload.new.status === 'pending') {
              if (soundEnabledRef.current) {
                const audioEl = document.getElementById("bookingAlert");
                if (audioEl) {
                  audioEl.src = `/${selectedSoundRef.current}.mp3`;
                  audioEl.play().catch(e => console.error("Audio blocked:", e));
                }
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
            await updateBookingStatus(b, 'completed'); 
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
      setBusinessHours(shopData.business_hours || DEFAULT_HOURS);
      setShopSettings({
        name: shopData.name || "",
        shop_photo_url: shopData.shop_photo_url || "",
        google_review_url: shopData.google_review_url || "",
        business_phone: shopData.business_phone || "",
      });
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
    const { data } = await supabase.from("bookings").select("*")
      .eq("shop_id", id) 
      .eq('booking_date', today)
      .neq("status", "cancelled") 
      .order("created_at", { ascending: false });

    setAllTodayBookings(data || []);
    setPendingBookings(data?.filter(b => ["pending", "active", "unverified"].includes(b.status)) || []);
    setConfirmedSchedule(data?.filter(b => ["confirmed", "rescheduled"].includes(b.status)) || []);
  };

  const testAudio = (soundName) => {
    const audioEl = document.getElementById("bookingAlert");
    if (audioEl) {
      audioEl.src = `/${soundName}.mp3`;
      audioEl.play().catch(() => {});
    }
  };

  const toggleSound = () => {
    const audioEl = document.getElementById("bookingAlert");
    if (!soundEnabled) {
      if (audioEl) {
        audioEl.muted = true;
        audioEl.play().then(() => {
          audioEl.muted = false;
          setSoundEnabled(true);
        }).catch(e => console.error("Audio unlock failed", e));
      } else {
        setSoundEnabled(true);
      }
    } else {
      setSoundEnabled(false);
    }
  };

  const calculateRevenue = () => {
    let total = 0;
    const menu = shop?.service_menu || DEFAULT_SERVICES;
    allTodayBookings.forEach(b => {
      if (b.status === 'confirmed' || b.status === 'completed') {
        const service = menu.find(s => s.name === b.service_name);
        if (service && service.price) {
          total += Number(service.price);
        }
      }
    });
    return total;
  };

  const updateBookingStatus = async (booking, newStatus) => {
    const bookingId = typeof booking === 'object' ? booking.id : booking;
    const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    
    if (!error) {
      if (newStatus === 'cancelled') alert("Booking cancelled.");
      if (newStatus === 'confirmed' && typeof booking === 'object' && booking.client_name !== "Walk-in Client") {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking: booking, type: 'confirmed' }),
        });
      }

      if (newStatus === 'completed' || newStatus === 'cancelled') {
        if (shop?.id) await supabase.from("shops").update({ current_status: 'available', status_updated_at: new Date().toISOString() }).eq("id", shop.id);
      }
    }
    fetchBookings(localStorage.getItem("barberShopId"));
    setReschedulingBooking(null);
  };

  const handleBillingPortal = async () => {
    if (!shop?.id) return;
    try {
      const res = await fetch('/api/stripe/portal', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: shop.id })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error: " + (data.error || "Billing portal unavailable."));
      }
    } catch (err) {
      console.error("Billing Error:", err);
    }
  };

  const saveSettings = async () => {
    if (!shop?.id) return;

    const { error } = await supabase
      .from("shops")
      .update({
        name: shopSettings.name,
        shop_photo_url: shopSettings.shop_photo_url,
        google_review_url: shopSettings.google_review_url,
        business_phone: shopSettings.business_phone,
        business_hours: businessHours 
      })
      .eq("id", shop.id);

    if (error) {
      console.error("Supabase Save Error:", error);
      alert(`Save failed: ${error.message}`);
    } else {
      setShop({ ...shop, ...shopSettings, business_hours: businessHours });
      setIsEditingSettings(false);
      alert("Settings updated successfully!");
    }
  };

  const handleTeamClick = (e) => {
    if (shop?.subscription_tier !== 'pro') {
      e.preventDefault();
      
      const confirmUpgrade = window.confirm(
        "🚀 UPGRADE TO PRO PACK (£34.99/mo)\n\n" +
        "Everything in Solo, PLUS:\n" +
        "• Add Multiple Barbers to your shop\n" +
        "• Team Duty/Availability toggles\n" +
        "• Staff Phone Login Access\n" +
        "• Increased Booking Capacity\n\n" +
        "Proceed to secure billing?"
      );

      if (confirmUpgrade) {
        handleBillingPortal();
      }
    }
  };

  const toggleBarberStatus = async (id, currentStatus) => {
    if (shop?.subscription_tier !== 'pro' && barbers.length > 1) {
        alert("Upgrade to PRO to manage team availability.");
        return;
    }
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
    
    // 🔥 AUTO-TIMING: Pulls from service.duration
    const endTime = new Date(nowTime.getTime() + (Number(service.duration) || 30) * 60000); 

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

  const downloadQR = (canvasId, filename) => {
    const qrCanvas = document.getElementById(canvasId);
    if (!qrCanvas) return alert("QR not ready yet.");

    const poster = document.createElement("canvas");
    const ctx = poster.getContext("2d");
    poster.width = 1200;
    poster.height = 1600;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, poster.width, poster.height);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff"; 
    ctx.font = "900 45px sans-serif";
    ctx.fillText("BOOK YOUR TRIM IN SECONDS", poster.width / 2, 160);

    ctx.fillStyle = "#3b82f6"; 
    ctx.font = "italic 900 100px sans-serif";
    const displayName = shop?.name?.toUpperCase() || "TRIMDAY BARBER";
    ctx.fillText(displayName, poster.width / 2, 280);

    const qrSize = 750;
    const padding = 40;
    const boxSize = qrSize + (padding * 2);
    const xBox = (poster.width - boxSize) / 2;
    const yBox = 380;
    
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(xBox, yBox, boxSize, boxSize, 40); 
    ctx.fill();

    const xPos = (poster.width - qrSize) / 2;
    const yPos = 380 + padding;
    ctx.drawImage(qrCanvas, xPos, yPos, qrSize, qrSize);

    ctx.fillStyle = "#cbd5e1"; 
    ctx.font = "bold 40px sans-serif";
    ctx.fillText("Point your camera at the code", poster.width / 2, 1330);
    
    ctx.fillStyle = "#334155"; 
    ctx.fillRect(400, 1420, 400, 3); 

    ctx.fillStyle = "#3b82f6";
    ctx.font = "900 35px sans-serif";
    ctx.fillText("trimday.co.uk", poster.width / 2, 1500);

    const pngFile = poster.toDataURL("image/png");
    const downloadLink = document.createElement("a");
    downloadLink.download = `${filename}.png`;
    downloadLink.href = pngFile;
    downloadLink.click();
  };

  const shareWhatsApp = () => {
    const bookingUrl = `${baseUrl}/shop/${shop?.slug}`; 
    const text = `Hey! You can now book your trims with us online at ${shop?.name} here: ${bookingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleLogout = () => { localStorage.removeItem("barberShopId"); window.location.href = "/login"; };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black animate-pulse text-slate-400 uppercase tracking-widest text-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 text-left">
      <audio id="bookingAlert" src={`/${selectedSound}.mp3`} preload="auto" playsInline />

      <div className="relative w-full h-48 md:h-64 bg-slate-200 overflow-hidden shadow-inner">
        <img src={shop?.shop_photo_url} alt="Banner" className={`relative w-full h-full z-10 ${shop?.photo_object_fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
        <button onClick={handleLogout} className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white active:scale-95 transition-all"><LogOut size={20} /></button>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20 w-full">
        <PwaPrompt />

        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          
          <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 italic uppercase leading-none">{shop?.name}</h1>
              <p className="flex items-center justify-center md:justify-start gap-1.5 text-slate-400 font-black text-[10px] mt-2 uppercase tracking-widest"><MapPin size={14} className="text-red-500"/> {shop?.postcode || "Location Not Set"}</p>
            </div>

            <button 
              onClick={() => setShowRevenue(!showRevenue)}
              className="bg-slate-900 text-white p-4 rounded-3xl flex items-center gap-4 min-w-[180px] shadow-xl hover:bg-slate-800 transition-all active:scale-95 group"
            >
              <div className="bg-blue-600 p-2.5 rounded-2xl text-white group-hover:scale-110 transition-transform">
                {showRevenue ? <TrendingUp size={20} /> : <Eye size={20} />}
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black uppercase text-blue-400 tracking-tighter leading-none mb-1 italic">Today's Total</p>
                <p className="text-2xl font-black leading-none italic uppercase">
                  {showRevenue ? `£${calculateRevenue()}` : "••••••"}
                </p>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-center gap-3 w-full md:w-auto mt-4 md:mt-0 relative">
            {!pushEnabled && (
              <button onClick={handleEnablePush} className="p-5 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg animate-pulse" title="Enable Alerts">
                <BellRing size={24} />
              </button>
            )}

            <div className="relative">
              <button onClick={() => {
                if (!soundEnabled) {
                  toggleSound(); 
                } else {
                  setShowSoundSettings(!showSoundSettings);
                }
              }} className={`p-5 rounded-2xl transition-all shadow-sm active:scale-95 ${soundEnabled ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                 {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
              </button>
              
              {showSoundSettings && soundEnabled && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-3xl shadow-2xl p-3 z-50 w-48 border border-slate-100 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center px-2 mb-2">
                    <p className="text-[10px] font-black uppercase text-slate-400">Select Ping</p>
                    <button onClick={() => { setSoundEnabled(false); setShowSoundSettings(false); }} className="text-[10px] font-bold text-red-500 hover:underline">Mute</button>
                  </div>
                  {['ping1', 'ping2', 'ping3'].map(snd => (
                    <button 
                      key={snd}
                      onClick={() => { setSelectedSound(snd); testAudio(snd); setShowSoundSettings(false); }}
                      className={`w-full text-left px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all ${selectedSound === snd ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <Music size={14} /> {snd}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              {showSetupNudge && (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 bg-blue-600 text-white p-3 rounded-2xl shadow-2xl z-50 animate-bounce">
                  <p className="text-[10px] font-black uppercase leading-tight text-center italic">
                    👋 Update shop info <br/>hours & reviews!
                  </p>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-blue-600"></div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowSetupNudge(false); }}
                    className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 border border-white/20"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              <button 
                onClick={() => { setIsEditingSettings(true); setShowSetupNudge(false); }} 
                className="p-5 bg-slate-100 text-slate-900 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95 relative z-10"
              >
                {showSetupNudge && <span className="absolute inset-0 rounded-2xl bg-blue-500/30 animate-ping"></span>}
                <Settings size={24} className="relative z-10" />
              </button>
              
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-400 tracking-widest italic whitespace-nowrap">Shop Setup</span>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full mb-8">
          <Link 
            href={shop?.subscription_tier === 'pro' ? "/dashboard/staff" : "#"} 
            onClick={handleTeamClick}
            className={`flex items-center justify-center gap-2 px-4 py-5 rounded-2xl font-black text-[10px] uppercase transition-all text-center relative overflow-hidden group ${
              shop?.subscription_tier === 'pro' 
                ? 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg' 
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            }`}
          >
            {shop?.subscription_tier === 'pro' ? <UserPlus size={18} /> : <Lock size={16} />}
            <span>Team</span>
          </Link>

          <button onClick={() => setIsEditingMenu(true)} className="px-4 py-5 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2"><Scissors size={18} /> Menu</button>
          <button onClick={() => setShowServiceMenu(true)} className="px-4 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 italic">Walk-In</button>
          
          <button onClick={handleBillingPortal} className="px-4 py-5 bg-blue-50 text-blue-600 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-blue-100 transition-all flex items-center justify-center gap-2 italic">
            <CreditCard size={18} /> Billing
          </button>

          <button onClick={toggleStatus} className={`px-4 py-5 rounded-2xl font-black text-xs uppercase transition-all shadow-lg active:scale-95 italic ${shop?.is_open ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-50 text-red-500 shadow-red-200'}`}><Power size={18} className="inline mr-2" /> {shop?.is_open ? "OPEN" : "CLOSED"}</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black flex items-center gap-3 uppercase italic tracking-tighter text-blue-600"><Activity /> New Pings</h2>
                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black">{pendingBookings.length}</span>
              </div>
              <div className="grid gap-4">
                {pendingBookings.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-[2.5rem] font-black text-slate-200 uppercase text-[10px] tracking-widest italic">All caught up</div>
                ) : (
                  pendingBookings.map((b) => (
                    <PendingRequestCard key={b.id} b={b} onUpdate={updateBookingStatus} onReschedule={(b) => setReschedulingBooking(b)} getTimeAgo={getTimeAgo} />
                  ))
                )}
              </div>
            </section>

            <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl">
              <h2 className="text-xl font-black flex items-center gap-3 mb-8 uppercase italic tracking-tighter"><Calendar className="text-blue-400" /> Today's Chair</h2>
              <div className="grid gap-3">
                {confirmedSchedule.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 font-bold italic text-xs uppercase tracking-widest">No confirmed trims yet</p>
                ) : (
                  confirmedSchedule.map((b) => (
                    <div key={b.id} className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-[2rem] border transition-all mb-3 ${
                      b.status === 'rescheduled' ? 'bg-blue-600/10 border-blue-500/40 border-dashed' : 'bg-white/5 border-white/10'
                    }`}>
                      <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className={`${b.status === 'rescheduled' ? 'bg-orange-500 animate-pulse' : 'bg-blue-600'} p-3 rounded-2xl text-center min-w-[80px]`}>
                           {b.status === 'rescheduled' ? <Clock size={16} className="mx-auto" /> : <span className="block text-xs font-black">{b.booking_time}</span>}
                        </div>
                        <div className="truncate">
                          <p className={`font-black text-lg ${b.status === 'rescheduled' ? 'text-blue-400' : 'text-white'}`}>{b.client_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate italic">
                            {b.status === 'rescheduled' ? `Awaiting: ${b.proposed_time}` : `${b.barber_name || "Any Barber"} • ${b.service_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        {b.status === 'confirmed' ? (
                          <>
                            {b.client_name !== "Walk-in Client" && (
                              <a href={`tel:${b.client_phone}`} className="p-4 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all shadow-lg"><Phone size={20}/></a>
                            )}
                            <button onClick={() => updateBookingStatus(b, 'cancelled')} className="p-4 bg-red-500/10 rounded-2xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-500/20"><XCircle size={22} /></button>
                            <button onClick={() => updateBookingStatus(b, 'completed')} className="px-6 py-4 bg-green-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-green-400 transition-all border border-green-400 flex items-center gap-2 italic">
                              <CheckCircle size={20} strokeWidth={3} /> Finish
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                             <span className="hidden md:block px-4 py-2 bg-blue-600 text-white rounded-full font-black text-[9px] uppercase italic tracking-widest animate-bounce">Pending Client Approval</span>
                             <button onClick={() => updateBookingStatus(b, 'cancelled')} className="p-4 bg-red-500/20 text-red-500 rounded-2xl font-black text-[9px] uppercase italic hover:bg-red-500 hover:text-white transition-all">Cancel</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8 w-full">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-fit">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2 uppercase italic tracking-tighter text-slate-900"><User className="text-blue-600" /> Staff on Duty</h2>
              <div className="space-y-4">
                {barbers.map(barber => {
                  const isBusy = confirmedSchedule.some(b => b.barber_id === barber.id);
                  return (
                    <div key={barber.id} className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${!barber.is_available_today ? 'bg-slate-50 opacity-60 grayscale' : isBusy ? 'bg-blue-50 border-blue-100 shadow-inner' : 'bg-slate-50 border-transparent hover:border-blue-100'}`}>
                      <div className="flex items-center gap-3 pr-2">
                        <Avatar name={barber.name} offline={!barber.is_available_today} />
                        <div>
                          <p className="font-black text-slate-900 flex items-center gap-2 leading-none">{barber.name} {isBusy && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}</p>
                          <p className={`text-[9px] font-black uppercase tracking-tighter mt-1 ${barber.is_available_today ? 'text-green-500' : 'text-red-500'}`}>{barber.is_available_today ? 'Available' : 'Off Duty'}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleBarberStatus(barber.id, barber.is_available_today)} className={`p-3 rounded-xl transition-all shadow-sm ${barber.is_available_today ? 'bg-green-500 text-white' : 'bg-red-100 text-red-500'}`}><Power size={18} /></button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 h-fit">
              <h2 className="text-xl font-black mb-1 flex items-center gap-2 uppercase italic tracking-tighter text-slate-900"><Share2 className="text-blue-600" /> Marketing</h2>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6 italic ml-1">Grow your shop</p>
              
              <div className="bg-slate-50 p-6 rounded-[2rem] flex flex-col items-center mb-6 border-2 border-dashed border-slate-200">
                <QRCode id="shop-qr" value={`${baseUrl}/shop/${shop?.slug}`} size={160} qrStyle="dots" eyeRadius={10} logoImage="/icon.png" logoWidth={35} logoHeight={35} bgColor="#f8fafc" fgColor="#0f172a" quietZone={25} />
                
                <div className="hidden">
                  <QRCode id="shop-qr-highres" value={`${baseUrl}/shop/${shop?.slug}`} size={500} qrStyle="dots" eyeRadius={10} logoImage="/icon.png" logoWidth={100} logoHeight={100} bgColor="#ffffff" fgColor="#0f172a" quietZone={20} />
                </div>

                <p className="mt-4 text-[10px] font-black text-slate-900 uppercase italic">Scan to book</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => downloadQR("shop-qr-highres", `${shop?.name || 'Shop'}-Booking-Poster`)} className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-black text-[9px] uppercase italic hover:bg-blue-600 transition-all shadow-lg"><Download size={14} /> Download</button>
                <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 bg-green-500 text-white p-4 rounded-2xl font-black text-[9px] uppercase italic hover:bg-green-600 transition-all shadow-lg"><MessageCircle size={14} /> WhatsApp</button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* SHOP SETTINGS MODAL */}
      {isEditingSettings && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            
            <div className="mb-10 text-left">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Shop Setup</h3>
                <button onClick={() => setIsEditingSettings(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={28} />
                </button>
              </div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
                Manage your shop's identity, contact details, and opening hours. These changes update your public booking page instantly.
              </p>
            </div>
            
            <div className="space-y-6 text-left">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest italic">Shop Name</label>
                <input type="text" value={shopSettings.name} onChange={(e) => setShopSettings({...shopSettings, name: e.target.value})} className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold border border-transparent focus:border-blue-600 transition-all text-slate-900" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest italic">Logo URL</label>
                <input type="text" placeholder="https://..." value={shopSettings.shop_photo_url} onChange={(e) => setShopSettings({...shopSettings, shop_photo_url: e.target.value})} className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold border border-transparent focus:border-blue-600 transition-all text-slate-900" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest italic">Business Phone Number</label>
                <input type="text" placeholder="07123..." value={shopSettings.business_phone} onChange={(e) => setShopSettings({...shopSettings, business_phone: e.target.value})} className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold border border-transparent focus:border-blue-600 transition-all text-slate-900" />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block tracking-widest italic">Google Review Link</label>
                <input type="text" placeholder="https://g.page/r/..." value={shopSettings.google_review_url} onChange={(e) => setShopSettings({...shopSettings, google_review_url: e.target.value})} className="w-full bg-slate-50 p-5 rounded-[1.5rem] outline-none font-bold border border-transparent focus:border-blue-600 transition-all text-slate-900" />
              </div>

              {/* Opening Hours */}
              <div className="mt-8 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic ml-2 mb-4">Opening Hours</h4>
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                  <div key={day} className="flex items-center justify-between bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                    <span className="font-black uppercase text-xs w-12 text-slate-900">{day}</span>
                    <div className="flex items-center gap-3">
                      {!businessHours[day]?.is_closed ? (
                        <>
                          <input 
                            type="time" 
                            value={businessHours[day]?.open || "09:00"} 
                            onChange={(e) => setBusinessHours({...businessHours, [day]: {...businessHours[day], open: e.target.value}})}
                            className="bg-white p-2 rounded-xl font-bold text-[10px] border border-slate-200 outline-none focus:border-blue-600 text-slate-900"
                          />
                          <span className="text-slate-300 font-bold">-</span>
                          <input 
                            type="time" 
                            value={businessHours[day]?.close || "18:00"} 
                            onChange={(e) => setBusinessHours({...businessHours, [day]: {...businessHours[day], close: e.target.value}})}
                            className="bg-white p-2 rounded-xl font-bold text-[10px] border border-slate-200 outline-none focus:border-blue-600 text-slate-900"
                          />
                        </>
                      ) : (
                        <span className="text-red-500 font-black text-[10px] uppercase italic bg-red-50 px-4 py-2 rounded-xl">Closed</span>
                      )}
                      <button 
                        onClick={() => setBusinessHours({...businessHours, [day]: {...businessHours[day], is_closed: !businessHours[day]?.is_closed}})}
                        className={`p-3 rounded-xl transition-all ${businessHours[day]?.is_closed ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-500'}`}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setIsEditingSettings(false)} className="flex-1 bg-slate-100 py-5 rounded-2xl font-black text-[10px] uppercase text-slate-500 hover:bg-slate-200 transition-colors italic">Discard</button>
              <button onClick={saveSettings} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 italic">
                <Save size={16}/> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SERVICE MENU MODAL */}
      {isEditingMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8 text-slate-900">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Edit Menu</h3>
              <button onClick={() => setIsEditingMenu(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X size={24} /></button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-4 mb-8">
              {menuItems.map((item, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 p-4 rounded-[2rem] border border-transparent hover:border-blue-100 transition-all">
                  <div className="flex-1 text-left w-full">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block italic">Service Name</label>
                    <input type="text" value={item.name} onChange={(e) => { const updated = [...menuItems]; updated[idx].name = e.target.value; setMenuItems(updated); }} className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm text-slate-900 border border-slate-100" />
                  </div>
                  <div className="w-24 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block italic">Price £</label>
                    <input type="number" value={item.price} onChange={(e) => { const updated = [...menuItems]; updated[idx].price = e.target.value; setMenuItems(updated); }} className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm text-slate-900 border border-slate-100" />
                  </div>
                  <div className="w-24 text-left">
                    <label className="text-[9px] font-black uppercase text-slate-400 ml-2 mb-1 block italic">Mins</label>
                    <input type="number" value={item.duration} onChange={(e) => { const updated = [...menuItems]; updated[idx].duration = e.target.value; setMenuItems(updated); }} className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm text-slate-900 border border-slate-100" />
                  </div>
                  <button onClick={() => setDeleteTarget(idx)} className="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all h-[45px]">
                    <Trash2 size={18}/>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMenuItems([...menuItems, { name: "", duration: 30, price: 0 }])} className="flex-1 bg-slate-100 py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 italic hover:bg-slate-200 transition-colors"><Plus size={16}/> Add Service</button>
              <button onClick={saveMenuChanges} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg italic hover:bg-blue-700 transition-all"><Save size={16}/> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY NET DELETE MODAL */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none mb-3">Wait. Are you sure?</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed mb-8 text-center">
              This will remove <span className="text-slate-900">"{menuItems[deleteTarget]?.name}"</span> permanently.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setMenuItems(menuItems.filter((_, i) => i !== deleteTarget)); setDeleteTarget(null); }} className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase italic shadow-lg shadow-red-200 active:scale-95 transition-all">Yes, Delete It</button>
              <button onClick={() => setDeleteTarget(null)} className="w-full bg-slate-100 text-slate-500 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* WALK-IN MENU */}
      {showServiceMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 text-center mb-6 uppercase tracking-tighter italic">New Walk-In</h3>
            <div className="grid gap-2 text-left">
              {menuItems.map((service, idx) => (
                <button key={idx} onClick={() => confirmWalkIn(service)} className="p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex justify-between items-center font-black group text-left">
                  <div className="text-left"><p className="font-black text-lg text-slate-900">{service.name}</p><p className="text-[10px] text-slate-400 font-bold uppercase italic">{service.duration} mins</p></div>
                  <span className="text-blue-600 group-hover:text-blue-700 text-xl italic font-black">£{service.price}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowServiceMenu(false)} className="w-full mt-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest text-center italic">Cancel</button>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 text-left font-sans">
            <h3 className="text-2xl font-black mb-2 tracking-tight text-slate-900 uppercase italic">Propose New Time</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-6 tracking-widest italic leading-tight">Suggesting to {reschedulingBooking.client_name}</p>
            <div className="relative mb-6">
              <select className="w-full p-6 bg-slate-50 rounded-3xl text-2xl font-black appearance-none outline-none focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer text-center text-slate-900" value={newTimeInput} onChange={(e) => setNewTimeInput(e.target.value)}>
                <option value="" className="text-slate-400">Select Time</option>{TIME_SLOTS.map(t => <option key={t} value={t} className="text-slate-900 font-bold">{t}</option>)}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={24} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <button onClick={() => setReschedulingBooking(null)} className="py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest italic transition-colors hover:bg-slate-200">Cancel</button>
              <button onClick={async () => {
                if (!newTimeInput) return;
                await supabase.from("bookings").update({ status: 'rescheduled', proposed_time: newTimeInput }).eq("id", reschedulingBooking.id);
                await fetch('/api/notify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    booking: { ...reschedulingBooking, proposed_time: newTimeInput }, 
                    type: 'rescheduled' 
                  }),
                });
                setReschedulingBooking(null); setNewTimeInput(""); fetchBookings(shop.id);
              }} disabled={!newTimeInput} className="py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest italic hover:bg-blue-700 transition-all">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}