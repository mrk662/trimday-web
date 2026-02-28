"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { X, CheckCircle, ChevronLeft, Clock, User, Scissors, Loader2, Mail, Phone } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// --- Helpers (Kept 100% Original) ---
const pad2 = (n) => String(n).padStart(2, "0");
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [hStr, mStr] = String(hhmm).split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  return (Number.isNaN(h) || Number.isNaN(m)) ? null : h * 60 + m;
};
const ceilToNextInterval = (date, intervalMinutes) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const rem = mins % intervalMinutes;
  if (rem !== 0) d.setMinutes(mins + (intervalMinutes - rem));
  return d;
};
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);
const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const setLocalTimeFromMinutes = (dayDate, mins) =>
  new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), Math.floor(mins / 60), mins % 60, 0, 0);
const formatTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// 🔥 Complex logic respecting business hours
const buildSlotsNext24hRespectingHours = ({ now, businessHours, intervalMinutes = 30, bufferMinutes = 30 }) => {
  const horizonEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const slots = [];
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  let cursor = ceilToNextInterval(now, intervalMinutes);

  while (cursor <= horizonEnd) {
    const dayKey = days[cursor.getDay()];
    const hours = businessHours?.[dayKey] || { open: "09:00", close: "19:00", is_closed: false };

    if (hours.is_closed) {
      cursor = startOfLocalDay(addMinutes(cursor, 24 * 60));
      continue;
    }

    const openM = toMinutes(hours.open);
    const closeM = toMinutes(hours.close);
    const dayStart = startOfLocalDay(cursor);
    
    const openTime = setLocalTimeFromMinutes(dayStart, openM);
    const closeTime = setLocalTimeFromMinutes(dayStart, closeM);
    const lastBookable = addMinutes(closeTime, -bufferMinutes);

    if (cursor < openTime) cursor = new Date(openTime);

    if (cursor >= openTime && cursor <= lastBookable) {
      slots.push(new Date(cursor));
    }

    if (cursor > lastBookable) {
      const nextDay = addMinutes(dayStart, 24 * 60);
      cursor = nextDay; 
    } else {
      cursor = addMinutes(cursor, intervalMinutes);
    }
  }
  return slots;
};

export default function BookingModal({ shopId, service, services, onClose }) {
  const [step, setStep] = useState(service ? 2 : 1);
  const [availableBarbers, setAvailableBarbers] = useState([]);
  const [loadingBarbers, setLoadingBarbers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shopTimeData, setShopTimeData] = useState(null);
  
  const [wasPreVerified, setWasPreVerified] = useState(false);
  const [honeypot, setHoneypot] = useState(""); 

  const [booking, setBooking] = useState({
    customerName: "",
    customerEmail: "", 
    customerPhone: "",
    service: service || null,
    barber: null,
    slotDate: null,
  });

  useEffect(() => {
    if (!shopId) return;

    const fetchInitialData = async () => {
      setLoadingBarbers(true);
      const { data: shop } = await supabase.from("shops").select("open_time, close_time, business_hours, name").eq("id", shopId).single();
      setShopTimeData(shop);
      await refreshBarbers();
      setLoadingBarbers(false);
    };

    const refreshBarbers = async () => {
      const { data } = await supabase
        .from("barbers")
        .select("id, name, is_available_today")
        .eq("shop_id", shopId)
        .eq("is_available_today", true);
      setAvailableBarbers(data || []);
    };

    fetchInitialData();

    const channel = supabase.channel(`barber-availability-${shopId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'barbers', 
        filter: `shop_id=eq.${shopId}` 
      }, () => {
        refreshBarbers();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [shopId]);

  // Pre-fill form if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setBooking(prev => ({
          ...prev,
          customerEmail: session.user.email,
          customerName: session.user.user_metadata?.full_name || prev.customerName,
          customerPhone: session.user.user_metadata?.phone || prev.customerPhone
        }));
      }
    };
    checkUser();
  }, []);

  const [tick] = useState(Date.now());

  const slots = useMemo(() => {
    return buildSlotsNext24hRespectingHours({
      now: new Date(tick),
      businessHours: shopTimeData?.business_hours,
    });
  }, [tick, shopTimeData]);

  const handleFinalConfirm = async () => {
    if (honeypot) return; 
    if (!shopId) return alert("Error: Missing Shop ID.");
    
    if (!booking.customerEmail.includes('@') || !booking.customerEmail.includes('.')) {
      alert("Please enter a valid email address.");
      return;
    }

    const phoneRegex = /^07\d{9}$/;
    if (!phoneRegex.test(booking.customerPhone)) {
      alert("Please enter a valid 11-digit mobile number starting with 07.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 🔥 Check if browser is actively logged in
      const { data: { session } } = await supabase.auth.getSession();
      let isSafe = !!session?.user;

      // 2. 🔥 HYBRID CHECK: If not logged in, check if this email has ANY past verified bookings
      if (!isSafe) {
        const { data: pastBookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("client_email", booking.customerEmail.trim().toLowerCase())
          .neq("status", "unverified") // Any status EXCEPT 'unverified' proves they are real!
          .limit(1);

        if (pastBookings && pastBookings.length > 0) {
          isSafe = true; // Email recognized as a verified returning customer
        }
      }

      setWasPreVerified(isSafe);
      const initialStatus = isSafe ? 'pending' : 'unverified';

      // 3. If totally new user, trigger Supabase Auth Signup silently
      if (!isSafe) {
        await supabase.auth.signUp({
          email: booking.customerEmail.trim().toLowerCase(),
          password: Math.random().toString(36).slice(-12), 
          options: {
            emailRedirectTo: `${window.location.origin}/verify-booking?email=${booking.customerEmail.trim().toLowerCase()}`
          }
        });
      }
      
      // 4. Insert the booking (Ghost or Active)
      const { data: newBooking, error: bookingError } = await supabase.from("bookings").insert([
        {
          shop_id: shopId,
          client_name: booking.customerName.trim(),
          client_email: booking.customerEmail.trim().toLowerCase(),
          client_phone: booking.customerPhone,
          barber_id: booking.barber?.id || null,
          barber_name: booking.barber?.name || "Any Barber",
          service_name: booking.service.name,
          booking_date: booking.slotDate.toISOString().split('T')[0],
          booking_time: formatTime(booking.slotDate),
          status: initialStatus,
        },
      ]).select().single();

      if (bookingError) throw bookingError;

      // 5. Trigger High-Priority Ping / Email
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          booking: newBooking, 
          type: 'verify_email' 
        })
      });

      setStep(4);

    } catch (err) {
      alert(`Booking failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4 text-left animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-left">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all z-10 text-left">
          <X size={20} />
        </button>

        {step < 4 && (
          <div className="flex items-center gap-4 mb-8 text-left">
            {step > 1 && (<button onClick={() => setStep(step - 1)} className="p-2 hover:bg-slate-50 rounded-full text-left"><ChevronLeft size={20} /></button>)}
            <h2 className="text-2xl font-black tracking-tight text-left italic uppercase">{step === 1 ? "Select Service" : `Book ${shopTimeData?.name || 'Appointment'}`}</h2>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto text-left pr-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 text-left">Select Service</p>
            {services?.map((s, idx) => (
                <button key={idx} onClick={() => { setBooking({ ...booking, service: s }); setStep(2); }} className="w-full flex justify-between items-center p-6 border-2 border-slate-50 hover:border-blue-600 rounded-[2rem] transition-all group hover:bg-blue-50/30 text-left">
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors text-left"><Scissors size={18} className="text-slate-400 group-hover:text-blue-600 text-left"/></div>
                    <div className="text-left font-black group-hover:text-blue-600 text-lg uppercase italic">{s.name}</div>
                  </div>
                  <div className="font-black text-xl italic text-blue-600 text-left">£{s.price}</div>
                </button>
              ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 text-left">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2 text-left">Choose Barber</p>
              {loadingBarbers ? <div className="h-16 w-full bg-slate-100 rounded-2xl animate-pulse text-left"></div> : (
                <div className="flex gap-3 overflow-x-auto pb-2 text-left pr-2">
                  <button onClick={() => setBooking({ ...booking, barber: null })} className={`flex-1 min-w-[100px] p-4 rounded-2xl border-2 transition-all text-left ${booking.barber === null ? "border-blue-600 bg-blue-50" : "border-slate-50 bg-slate-50"}`}>
                      <div className="font-black text-sm text-left uppercase">Any</div>
                      <div className="text-[9px] font-black text-blue-500 uppercase text-left italic">First Avail</div>
                  </button>
                  {availableBarbers.map((b) => (
                    <button key={b.id} onClick={() => setBooking({ ...booking, barber: b })} className={`flex-1 min-w-[100px] p-4 rounded-2xl border-2 transition-all text-left ${booking.barber?.id === b.id ? "border-blue-600 bg-blue-50" : "border-slate-50 bg-slate-50"}`}>
                      <div className="font-black text-sm text-left uppercase">{b.name}</div>
                      <div className="text-[9px] font-black text-green-600 uppercase text-left italic">Online</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2 text-left">Next Available Slots</p>
                {slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto text-left pr-2">
                    {slots.slice(0, 12).map((d) => (
                      <button key={d.toISOString()} onClick={() => { setBooking({ ...booking, slotDate: d }); setStep(3); }} className="p-4 bg-slate-50 hover:bg-black hover:text-white rounded-2xl font-black text-sm transition-all shadow-sm text-left">
                        {formatTime(d)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 bg-slate-50 rounded-[2rem] text-center border-2 border-dashed border-slate-200 pr-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase italic tracking-widest leading-relaxed">Shop is closed for the next 24 hours. Check back later!</p>
                  </div>
                )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-left pr-2">
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-left">
               <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 text-left italic">Confirming Request</p>
               <h3 className="text-xl font-black text-left uppercase italic">{booking.service?.name}</h3>
               <div className="flex gap-3 text-sm font-bold text-blue-500 mt-2 text-left">
                 <span className="flex items-center gap-1 text-left"><Clock size={14}/> {formatTime(booking.slotDate)}</span>
                 <span className="flex items-center gap-1 text-left uppercase italic"><User size={14}/> {booking.barber?.name || "Any Barber"}</span>
               </div>
            </div>

            <div className="space-y-4 text-left">
              <input type="text" className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              <div className="relative text-left">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-left" size={18} />
                <input type="text" placeholder="Full Name" className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100 text-left uppercase" value={booking.customerName} onChange={(e) => setBooking({ ...booking, customerName: e.target.value })} />
              </div>
              <div className="relative text-left">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-left" size={18} />
                <input type="email" placeholder="Email Address" className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100 text-left" value={booking.customerEmail} onChange={(e) => setBooking({ ...booking, customerEmail: e.target.value })} />
              </div>
              <div className="relative text-left">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-left" size={18} />
                <input 
                  type="tel" 
                  placeholder="Mobile Number (Starts 07)" 
                  maxLength={11} 
                  className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100 text-left" 
                  value={booking.customerPhone} 
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, ''); 
                    if (val.length > 0) {
                      if (val.length === 1 && val !== '0') { val = '0'; } 
                      else if (val.length >= 2 && !val.startsWith('07')) { val = '07' + val.substring(2); }
                    }
                    if (val.length <= 11) { setBooking({ ...booking, customerPhone: val }); }
                  }} 
                />
              </div>
              {booking.customerPhone.length >= 2 && !booking.customerPhone.startsWith('07') && (
                <p className="text-[10px] font-black uppercase text-red-500 italic ml-2 mt-[-10px]">Must start with 07</p>
              )}
            </div>

            <button 
              disabled={
                !booking.customerName || 
                !booking.customerEmail.includes('@') || 
                !booking.customerEmail.includes('.') || 
                !/^07\d{9}$/.test(booking.customerPhone) || 
                isSubmitting
              } 
              onClick={handleFinalConfirm} 
              className="w-full bg-black text-white p-6 rounded-[2rem] font-black shadow-xl disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95 transition-all text-center uppercase italic"
            >
              {isSubmitting ? <Loader2 className="animate-spin text-center" /> : "Confirm My Trim"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-10 animate-in zoom-in-95 pr-2">
            <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <CheckCircle size={48} />
            </div>
            
            <h3 className="text-4xl font-black tracking-tight mb-4 uppercase italic">
              {wasPreVerified ? "Booking Sent!" : "Verify Email"}
            </h3>
            
            <p className="text-slate-500 font-bold mb-4 leading-relaxed px-4 text-lg">
              {wasPreVerified 
                ? "You're on the safe list! The barber has been pinged directly." 
                : <>Check your inbox! You must click the <b>verification link</b> in your email to send this request to the barber.</>
              }
            </p>

            {/* 1. Explainer Box */}
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 mx-4 mb-4 text-center">
              <p className="text-xs font-bold text-slate-400 italic">
                {wasPreVerified 
                  ? "Sit back and relax. We'll email you once the barber confirms your spot."
                  : "First time here? We just need to make sure you're real. Verification takes 5 seconds."
                }
              </p>
            </div>

            {/* 2. Junk Folder Warning Box */}
            {!wasPreVerified && (
              <div className="border-2 border-amber-400 bg-amber-50 p-4 rounded-2xl shadow-sm mx-4 mb-10">
                <p className="text-amber-600 font-black text-xs uppercase tracking-widest text-center italic flex items-center justify-center gap-2">
                  📫 Quick heads up!
                </p>
                <p className="text-amber-700 font-bold text-[11px] text-center mt-2 leading-relaxed">
                  Sometimes emails can be slow. If you don't see it straight away, please <b>check your Junk or Spam</b> folder.
                </p>
              </div>
            )}

            <button onClick={onClose} className="w-full bg-slate-100 text-slate-900 p-6 rounded-[2.5rem] font-black text-xl shadow-inner hover:bg-slate-200 transition-all text-center uppercase italic">Sweet, thanks!</button>
          </div>
        )}
      </div>
    </div>
  );
}