"use client";
import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  Check,
  X,
  Clock,
  Calendar as CalIcon,
  User,
  Phone,
  Power,
  Scissors,
  Activity,
  Settings,
  Volume2,
  VolumeX,
  UserPlus,
  Save, // Added for the edit button
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const DEFAULT_SERVICES = [
  { name: "Standard Haircut", duration: 30, price: 20 },
  { name: "Skin Fade", duration: 45, price: 20 },
  { name: "Beard Trim", duration: 15, price: 10 },
  { name: "Junior Trim", duration: 20, price: 10 },
];

function PendingRequestCard({ b, onUpdate, getTimeAgo }) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 Minutes
  const isWalkIn = b.client_name === "Walk-in";

  useEffect(() => {
    if (isWalkIn) return;
    const start = new Date(b.created_at).getTime();
    const expiry = start + 5 * 60 * 1000;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (b.status === "pending") onUpdate(b.id, "cancelled");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [b.created_at, isWalkIn, b.status, b.id, onUpdate]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 60 && !isWalkIn;

  return (
    <div
      className={`bg-white p-6 rounded-[2.5rem] shadow-lg border-2 transition-all animate-in slide-in-from-top-4 mb-4 ${
        isUrgent
          ? "border-red-200 shadow-red-50 animate-pulse"
          : "border-blue-100"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded text-white ${
                isWalkIn
                  ? "bg-slate-900"
                  : isUrgent
                  ? "bg-red-500"
                  : "bg-blue-600"
              }`}
            >
              {isWalkIn ? "LIVE NOW" : isUrgent ? "EXPIRES SOON" : "NEW REQUEST"}
            </span>
            <p className="font-black text-xl">{b.client_name || "Walk-in Client"}</p>
          </div>
          <p className="text-slate-500 font-bold flex items-center gap-1 text-sm">
            <Scissors size={14} className="text-blue-600" /> {b.service_name} •{" "}
            <span className="text-slate-900 font-black">{b.booking_time}</span>
          </p>
          {!isWalkIn && (
            <p className="text-[10px] text-slate-400 font-black uppercase mt-1">
              Pinged {getTimeAgo(b.created_at)}
            </p>
          )}
        </div>

        {!isWalkIn && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm ${
              isUrgent
                ? "bg-red-100 text-red-600"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            <Clock size={16} /> {mins}:{secs < 10 ? `0${secs}` : secs}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onUpdate(b.id, "cancelled")}
            className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-red-500 transition-all flex items-center gap-2 font-black text-xs uppercase"
          >
            <X size={18} /> {isWalkIn ? "Cancel" : "Decline"}
          </button>

          <button
            onClick={() => onUpdate(b.id, isWalkIn ? "completed" : "confirmed")}
            className="px-8 py-4 bg-black text-white rounded-2xl font-black hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-xs uppercase"
          >
            <Check size={20} /> {isWalkIn ? "Finish Trim" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BarberDashboard() {
  const [shop, setShop] = useState(null);
  const [pending, setPending] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWalkInMenu, setShowWalkInMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // --- NEW: Shop Name Edit States ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const bookingAudio = useRef(null);

  useEffect(() => {
    bookingAudio.current = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    );

    fetchInitialData();

    const channel = supabase
      .channel("dashboard-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (p) => {
          if (soundEnabled && p.eventType === "INSERT") {
            bookingAudio.current?.play().catch(() => {});
          }
          fetchBookings();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "barbers" },
        () => fetchBarbers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops" },
        (p) => setShop(p.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: shopData } = await supabase
      .from("shops")
      .select("*")
      .limit(1)
      .single();

    if (shopData) {
      setShop(shopData);
      setTempName(shopData.name); // Set initial edit value
      await Promise.all([fetchBookings(shopData.id), fetchBarbers()]);
    }

    setLoading(false);
  };

  // --- NEW: Save Shop Name Function ---
  const saveName = async () => {
    if (!tempName.trim()) return;
    const { error } = await supabase
      .from("shops")
      .update({ name: tempName })
      .eq("id", shop.id);

    if (!error) {
      setShop({ ...shop, name: tempName });
      setIsEditingName(false);
    } else {
      alert("Failed to update name: " + error.message);
    }
  };

  const fetchBookings = async (shopId) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_date", today)
      .neq("status", "completed")
      .neq("status", "cancelled");

    setPending(data?.filter((b) => b.status === "pending" || b.status === "active") || []);
    setSchedule(
      data
        ?.filter((b) => b.status === "confirmed")
        .sort((a, b) => a.booking_time.localeCompare(b.booking_time)) || []
    );
  };

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from("barbers")
      .select("*")
      .order("name", { ascending: true });
    setBarbers(data || []);
  };

  const confirmWalkIn = async (service) => {
    if (!shop?.id) return;

    const nowTime = new Date();
    const timeStr = `${nowTime.getHours()}:${nowTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const placeholderEmail = `walkin-${Date.now()}@system.local`;

    const { error } = await supabase.from("bookings").insert([
      {
        shop_id: shop.id,
        client_name: "Walk-in",
        client_email: placeholderEmail,
        service_name: service.name,
        booking_date: new Date().toISOString().split("T")[0],
        booking_time: timeStr,
        status: "active",
      },
    ]);

    if (!error) {
      await supabase
        .from("shops")
        .update({ current_status: "with client" })
        .eq("id", shop.id);
      setShowWalkInMenu(false);
    }
  };

  const updateBookingStatus = async (id, status) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);

    if (!error && (status === "completed" || status === "cancelled")) {
      if (shop?.id) {
        await supabase
          .from("shops")
          .update({ current_status: "available" })
          .eq("id", shop.id);
      }
    }

    fetchBookings();
  };

  const toggleBarberStatus = async (id, current) => {
    setBarbers((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_on_duty: !current } : b))
    );

    const { error } = await supabase
      .from("barbers")
      .update({ is_on_duty: !current })
      .eq("id", id);

    if (error) {
      setBarbers((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_on_duty: current } : b))
      );
    }
  };

  const toggleShopOpen = async () => {
    if (!shop?.id) return;
    const { error } = await supabase
      .from("shops")
      .update({ is_open: !shop.is_open })
      .eq("id", shop.id);

    if (!error) setShop((s) => ({ ...s, is_open: !s.is_open }));
  };

  const getTimeAgo = (ts) => {
    const sec = Math.floor((new Date() - new Date(ts)) / 1000);
    return sec < 60 ? "Just now" : `${Math.floor(sec / 60)}m ago`;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400">
        LOADING SYSTEM...
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 text-slate-900 font-sans text-left">
      <div className="max-w-7xl mx-auto">
        {/* HEADER SECTION */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="text-left w-full md:w-auto">
              
              {/* --- UPDATED HEADER WITH EDIT LOGIC --- */}
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)} 
                    className="text-3xl font-black bg-slate-50 border-b-2 border-blue-600 outline-none px-2 w-full md:w-auto"
                    autoFocus
                  />
                  <button onClick={saveName} className="bg-green-500 text-white p-2 rounded-lg shadow-lg active:scale-95 transition-all">
                    <Save size={18} />
                  </button>
                  <button onClick={() => { setIsEditingName(false); setTempName(shop.name); }} className="bg-slate-200 text-slate-600 p-2 rounded-lg">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  {shop?.name}
                  <button 
                    onClick={() => { setIsEditingName(true); setTempName(shop.name); }} 
                    className="text-slate-300 hover:text-blue-600 transition-all cursor-pointer"
                  >
                    <Scissors size={20} />
                  </button>
                  <Link href="/dashboard/staff">
                    <Settings
                      size={20}
                      className="text-slate-300 hover:text-blue-600 transition-all cursor-pointer"
                    />
                  </Link>
                </h1>
              )}

              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                {shop?.postcode} • {shop?.current_status}
              </p>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-2xl transition-all ${
                soundEnabled
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : "bg-slate-50 text-slate-400 border border-slate-100"
              }`}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href="/dashboard/staff"
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase hover:bg-blue-600 transition-all"
            >
              <UserPlus size={18} /> Manage Team
            </Link>

            <button
              onClick={() => setShowWalkInMenu(true)}
              className="flex-1 md:flex-none px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-blue-700 transition-all"
            >
              Add Walk-In
            </button>

            <button
              onClick={toggleShopOpen}
              className={`flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg transition-all ${
                shop?.is_open ? "bg-green-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              <Power size={18} className="inline mr-2" />{" "}
              {shop?.is_open ? "OPEN" : "CLOSED"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            <section>
              <h2 className="text-xl font-black flex items-center gap-2 mb-6 px-2">
                <Activity className="text-blue-600" /> Live Feed
              </h2>
              <div className="space-y-4">
                {pending.length > 0 ? (
                  pending.map((b) => (
                    <PendingRequestCard
                      key={b.id}
                      b={b}
                      onUpdate={updateBookingStatus}
                      getTimeAgo={getTimeAgo}
                    />
                  ))
                ) : (
                  <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2.5rem] py-16 text-center text-slate-300 font-black uppercase text-xs">
                    No active requests
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-black mb-6 px-2 flex items-center gap-2">
                <CalIcon className="text-blue-600" /> Today's Schedule
              </h2>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                {schedule.length > 0 ? (
                  <div className="space-y-6">
                    {schedule.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center gap-6 pb-6 border-b border-slate-50 last:border-0 last:pb-0"
                      >
                        <div className="font-black text-blue-600 bg-blue-50 w-24 py-2 rounded-xl text-center text-sm">
                          {slot.booking_time}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-black text-slate-900 text-lg">{slot.client_name}</p>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-tighter">
                            {slot.barber_name || "Any Barber"} • {slot.service_name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`tel:${slot.client_phone}`}
                            className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 transition-all"
                          >
                            <Phone size={20} />
                          </a>
                          <button
                            onClick={() => updateBookingStatus(slot.id, "completed")}
                            className="p-4 bg-green-50 rounded-2xl text-green-600 hover:bg-green-100 transition-all"
                          >
                            <Check size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-300 font-bold italic uppercase text-xs">
                    No confirmed appointments yet
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-8 text-left">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 text-left">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2">
                <User className="text-blue-600" /> Staff on Duty
              </h2>
              <div className="space-y-4">
                {barbers.map((barber) => (
                  <div
                    key={barber.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-blue-100 transition-all"
                  >
                    <div className="text-left">
                      <p className="font-black text-slate-900">{barber.name}</p>
                      <p
                        className={`text-[9px] font-black uppercase tracking-tighter ${
                          barber.is_on_duty ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {barber.is_on_duty ? "Accepting Clients" : "Off Duty"}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleBarberStatus(barber.id, barber.is_on_duty)}
                      className={`p-3 rounded-xl transition-all shadow-sm ${
                        barber.is_on_duty
                          ? "bg-green-500 text-white"
                          : "bg-red-100 text-red-500"
                      }`}
                      aria-label={`Toggle duty for ${barber.name}`}
                    >
                      <Power size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link
                  href="/dashboard/staff"
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Edit Staff List
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showWalkInMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-center mb-8 tracking-tighter">Quick Walk-In</h3>
            <div className="grid gap-3">
              {DEFAULT_SERVICES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => confirmWalkIn(s)}
                  className="w-full p-6 bg-slate-50 rounded-2xl flex justify-between items-center font-black hover:bg-blue-600 hover:text-white transition-all group"
                >
                  <span>{s.name}</span>
                  <span className="text-blue-600 group-hover:text-white">£{s.price}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalkInMenu(false)}
              className="mt-8 w-full font-black text-slate-400 uppercase text-xs tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}