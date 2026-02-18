"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { X, CheckCircle, ChevronLeft, Clock, User, Scissors, Loader2, Mail, Phone } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// --- Time Helpers ---
const pad2 = (n) => String(n).padStart(2, "0");
const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [hStr, mStr] = String(hhmm).split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
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

  const [booking, setBooking] = useState({
    customerName: "",
    customerEmail: "", // NEW: Added for required email
    customerPhone: "",
    service: service || null,
    barber: null,
    slotDate: null,
  });

  useEffect(() => {
    const initData = async () => {
      setLoadingBarbers(true);
      const { data: shop } = await supabase.from("shops").select("open_time, close_time, name").eq("id", shopId).single();
      setShopTimeData(shop);

      const { data: barbers } = await supabase.from("barbers").select("*").eq("shop_id", shopId).eq("is_on_duty", true);
      setAvailableBarbers(barbers || []);
      setLoadingBarbers(false);
    };
    if (shopId) initData();
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
    setIsSubmitting(true);
    // FIXED: Includes 'client_email' and correct phone formatting
    const { error } = await supabase.from("bookings").insert([
      {
        shop_id: shopId,
        client_name: booking.customerName.trim(),
        client_email: booking.customerEmail.trim(), // Required field
        client_phone: booking.customerPhone.replace(/\D/g, ""),
        barber_id: booking.barber?.id || null,
        barber_name: booking.barber?.name || "Any Barber",
        service_name: booking.service.name,
        booking_date: booking.slotDate.toISOString().split('T')[0],
        booking_time: formatTime(booking.slotDate),
        status: "pending",
      },
    ]);

    if (!error) setStep(4);
    else alert("Booking failed. Please check your details and try again.");
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all z-10">
          <X size={20} />
        </button>

        {step < 4 && (
          <div className="flex items-center gap-4 mb-8">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="p-2 hover:bg-slate-50 rounded-full">
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-2xl font-black tracking-tight">{step === 1 ? "Select Service" : `Book ${shopTimeData?.name || 'Appointment'}`}</h2>
          </div>
        )}

        {/* STEP 1: SERVICES */}
        {step === 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 max-h-[60vh] overflow-y-auto">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Service</p>
            {services && services.length > 0 ? (
              services.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => { setBooking({ ...booking, service: s }); setStep(2); }}
                  className="w-full flex justify-between items-center p-6 border-2 border-slate-50 hover:border-blue-600 rounded-[2rem] transition-all group hover:bg-blue-50/30 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors"><Scissors size={18} className="text-slate-400 group-hover:text-blue-600"/></div>
                    <div className="text-left font-black group-hover:text-blue-600 text-lg">{s.name}</div>
                  </div>
                  <div className="font-black text-xl italic text-blue-600">£{s.price}</div>
                </button>
              ))
            ) : (
                <p className="text-center py-8 text-slate-400 font-bold">No services available.</p>
            )}
          </div>
        )}

        {/* STEP 2: BARBER & TIME */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2">Choose Barber</p>
              {loadingBarbers ? <div className="animate-pulse flex gap-3"><div className="h-16 w-full bg-slate-100 rounded-2xl"></div></div> : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {availableBarbers.map((b) => (
                    <button key={b.id} onClick={() => setBooking({ ...booking, barber: b })} className={`flex-1 min-w-[100px] p-4 rounded-2xl border-2 transition-all ${booking.barber?.id === b.id ? "border-blue-600 bg-blue-50" : "border-slate-50 bg-slate-50"}`}>
                      <div className="font-black text-sm">{b.name}</div>
                      <div className="text-[9px] font-black text-blue-500 uppercase">On Duty</div>
                    </button>
                  ))}
                  <button onClick={() => setBooking({ ...booking, barber: null })} className={`flex-1 min-w-[100px] p-4 rounded-2xl border-2 transition-all ${booking.barber === null ? "border-blue-600 bg-blue-50" : "border-slate-50 bg-slate-50"}`}>
                      <div className="font-black text-sm">Any</div>
                      <div className="text-[9px] font-black text-blue-500 uppercase">First Avail</div>
                  </button>
                </div>
              )}
            </div>

            <div className="animate-in fade-in duration-500">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-2">Next Available Slots</p>
                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                  {slots.slice(0, 12).map((d) => (
                    <button key={d.toISOString()} onClick={() => { setBooking({ ...booking, slotDate: d }); setStep(3); }} className="p-4 bg-slate-50 hover:bg-black hover:text-white rounded-2xl font-black text-sm transition-all shadow-sm">
                      {formatTime(d)}
                    </button>
                  ))}
                </div>
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS (Restored and Improved) */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 mb-4">
               <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Confirming Request</p>
               <h3 className="text-xl font-black">{booking.service?.name}</h3>
               <div className="flex gap-3 text-sm font-bold text-blue-500 mt-2">
                 <span className="flex items-center gap-1"><Clock size={14}/> {formatTime(booking.slotDate)}</span>
                 <span className="flex items-center gap-1"><User size={14}/> {booking.barber?.name || "Any Barber"}</span>
               </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="Full Name" className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100" value={booking.customerName} onChange={(e) => setBooking({ ...booking, customerName: e.target.value })} />
              </div>
              
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="email" placeholder="Email Address" className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100" value={booking.customerEmail} onChange={(e) => setBooking({ ...booking, customerEmail: e.target.value })} />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="tel" placeholder="Phone Number" className="w-full p-5 pl-12 bg-slate-50 rounded-2xl font-black outline-none focus:ring-4 focus:ring-blue-100" value={booking.customerPhone} onChange={(e) => setBooking({ ...booking, customerPhone: e.target.value })} />
              </div>
            </div>

            <button 
              disabled={!booking.customerName || !booking.customerEmail.includes('@') || !booking.customerPhone || isSubmitting} 
              onClick={handleFinalConfirm} 
              className="w-full bg-black text-white p-6 rounded-[2rem] font-black shadow-xl disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Confirm My Trim"}
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 4 && (
          <div className="text-center py-10 animate-in zoom-in-95">
            <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-4xl font-black tracking-tight mb-4">Sent!</h3>
            <p className="text-slate-500 font-bold mb-10 leading-relaxed px-4 text-lg">
              We've received your request for <span className="text-black">{booking.service?.name}</span>. See you soon!
            </p>
            <button onClick={onClose} className="w-full bg-slate-100 text-slate-900 p-6 rounded-[2.5rem] font-black text-xl shadow-inner hover:bg-slate-200 transition-all">
              Sweet, thanks!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}