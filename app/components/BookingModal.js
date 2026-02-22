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

const buildSlotsNext24hRespectingHours = ({ now, openHHMM, closeHHMM, intervalMinutes = 30, bufferMinutes = 30 }) => {
  const openM = toMinutes(openHHMM);
  const closeM = toMinutes(closeHHMM);
  if (openM == null || closeM == null) return [];
  const isOvernight = closeM < openM;
  const horizonEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const slots = [];
  let cursor = ceilToNextInterval(now, intervalMinutes);
  while (cursor <= horizonEnd) {
    const dayStart = startOfLocalDay(cursor);
    const openTime = setLocalTimeFromMinutes(dayStart, openM);
    const closeDayStart = isOvernight ? addMinutes(dayStart, 24 * 60) : dayStart;
    const closeTime = setLocalTimeFromMinutes(closeDayStart, closeM);
    const lastBookable = addMinutes(closeTime, -bufferMinutes);
    if (cursor < openTime) cursor = new Date(openTime);
    if (cursor > lastBookable) {
      const nextDay = addMinutes(dayStart, 24 * 60);
      cursor = setLocalTimeFromMinutes(nextDay, openM);
      cursor = ceilToNextInterval(cursor, intervalMinutes);
      continue;
    }
    if (cursor <= horizonEnd) slots.push(new Date(cursor));
    cursor = addMinutes(cursor, intervalMinutes);
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
      const { data: shop } = await supabase.from("shops").select("open_time, close_time, name").eq("id", shopId).single();
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

  const openTime = shopTimeData?.open_time || "09:00";
  const closeTime = shopTimeData?.close_time || "19:00";
  const [tick] = useState(Date.now());

  const slots = useMemo(() => {
    return buildSlotsNext24hRespectingHours({
      now: new Date(tick),
      openHHMM: openTime,
      closeHHMM: closeTime,
    });
  }, [tick, openTime, closeTime]);

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

    const { data: previousBookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("client_email", booking.customerEmail.trim().toLowerCase())
      .in("status", ["confirmed", "completed"]) 
      .limit(1);

    const isSafe = previousBookings && previousBookings.length > 0;
    setWasPreVerified(isSafe);

    const initialStatus = isSafe ? "pending" : "unverified";
    
    const { data: newBooking, error } = await supabase.from("bookings").insert([
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

    if (!error) {
      if (!isSafe) {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            booking: newBooking, 
            type: 'verify_email'
          })
        });
      }
      setStep(4);
    } else {
      alert(`Booking failed: ${error.message}`);
    }
    setIsSubmitting(false);
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
            <h2 className="text-2xl font-black tracking-tight text-left">{step === 1 ? "Select Service" : `Book ${shopTimeData?.name || 'Appointment'}`}</h2>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 text-left">Select Service</p>
            {services?.map((s, idx) => (
                <button key={idx} onClick={() => { setBooking({ ...booking, service: s }); setStep(2); }} className="w-full flex justify-between items-center p-6 border-2 border-slate-50 hover:border-blue-600 rounded-[2rem] transition-all group hover:bg-blue-50/30 text-left">
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors text-left"><Scissors size={18} className="text-slate-400 group-hover:text-blue-600 text-left"/></div>
                    <div className="text-left font-black group-hover:text-blue-600 text-lg text-left">{s.name}</div>
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
                <div className="flex gap-3 overflow-x-auto pb-2 text-left">
                  <button onClick={() => setBooking({ ...booking, barber: null })} className={`flex-1 min-w-[100px] p-4 rounded-2xl border-2 transition-all text-left ${booking.barber === null ? "border-blue-600 bg-blue-50" : "border-slate-50 bg-slate-50"}`}>
                      <div className="font-black text-sm text-left">Any</div>
                      <div className="text-[9px] font-black text-blue-500 uppercase text-left">First Avail</div>
                  </button>
                  {availableBarbers.map((b) => (
                    <button key={b.id} onClick={() => setBooking({ ...booking, barber: b })} className={`flex-1 min-w-[100px] p-4 rounded-2xl border-2 transition-all text-left ${booking.barber?.id === b.id ? "border-blue-600 bg-blue-50" : "border-slate-50 bg-slate-50"}`}>
                      <div className="font-black text-sm text-left">{b.name}</div>
                      <div className="text-[9px] font-black text-green-600 uppercase text-left">Online</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2 text-left">Next Available Slots</p>
                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto text-left">
                  {slots.slice(0, 12).map((d) => (
                    <button key={d.toISOString()} onClick={() => { setBooking({ ...booking, slotDate: d }); setStep(3); }} className="p-4 bg-slate-50 hover:bg-black hover:text-white rounded-2xl font-black text-sm transition-all shadow-sm text-left">
                      {formatTime(d)}
                    </button>
                  ))}
                </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-left">
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-left">
               <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1 text-left">Confirming Request</p>
               <h3 className="text-xl font-black text-left">{booking.service?.name}</h3>
               <div className="flex gap-3 text-sm font-bold text-blue-500 mt-2 text-left">
                 <span className="flex items-center gap-1 text-left"><Clock size={14}/> {formatTime(booking.slotDate)}</span>
                 <span className="flex items-center gap-1 text-left"><User size={14}/> {booking.barber?.name || "Any Barber"}</span>
               </div>
            </div>

            <div className="space-y-4 text-left">
              <input type="text" className="hidden" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
              <div className="relative text-left">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-left" size={18} />
                <input type="text" placeholder="Full Name" className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100 text-left" value={booking.customerName} onChange={(e) => setBooking({ ...booking, customerName: e.target.value })} />
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
                    // NUCLEAR ENFORCEMENT LOGIC:
                    // 1. Strip everything that isn't a number instantly
                    let val = e.target.value.replace(/\D/g, ''); 
                    
                    if (val.length > 0) {
                      // 2. Force the first digit to be '0'
                      if (val.length === 1 && val !== '0') {
                        val = '0';
                      } 
                      // 3. Force the second digit to be '7'
                      else if (val.length >= 2 && !val.startsWith('07')) {
                        val = '07' + val.substring(2);
                      }
                    }

                    if (val.length <= 11) {
                        setBooking({ ...booking, customerPhone: val });
                    }
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
              className="w-full bg-black text-white p-6 rounded-[2rem] font-black shadow-xl disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95 transition-all text-center"
            >
              {isSubmitting ? <Loader2 className="animate-spin text-center" /> : "Confirm My Trim"}
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-10 animate-in zoom-in-95">
            <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <CheckCircle size={48} />
            </div>
            
            <h3 className="text-4xl font-black tracking-tight mb-4">
              {wasPreVerified ? "Booking Sent!" : "Verify Email"}
            </h3>
            
            <p className="text-slate-500 font-bold mb-4 leading-relaxed px-4 text-lg">
              {wasPreVerified 
                ? "You're on the safe list! The barber has been pinged directly." 
                : <>Check your inbox! You must click the <b>verification link</b> in your email to send this request to the barber.</>
              }
            </p>
            
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 mx-4 mb-10 text-center">
              <p className="text-xs font-bold text-slate-400 italic">
                {wasPreVerified 
                  ? "Sit back and relax. We'll email you once the barber confirms your spot."
                  : "First time here? We just need to make sure you're real. Verification takes 5 seconds."
                }
              </p>
            </div>

            <button onClick={onClose} className="w-full bg-slate-100 text-slate-900 p-6 rounded-[2.5rem] font-black text-xl shadow-inner hover:bg-slate-200 transition-all text-center">Sweet, thanks!</button>
          </div>
        )}
      </div>
    </div>
  );
}