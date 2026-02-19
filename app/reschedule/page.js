"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, XCircle, Clock, ChevronDown, Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

function RescheduleContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending"); 
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    if (bookingId) fetchBooking();
  }, [bookingId]);

  const fetchBooking = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, shops(name)")
      .eq("id", bookingId)
      .single();
    
    if (data) {
      setBooking(data);
      setSelectedTime(data.proposed_time || data.booking_time);
    }
    setLoading(false);
  };

  const handleResponse = async (newStatus, finalTime = null) => {
    setLoading(true);
    // Move the proposed time into the main slot if they accept
    const updates = { 
      status: newStatus,
      booking_time: finalTime || booking.booking_time,
      proposed_time: null // Clear proposal after action
    };

    const { error } = await supabase.from("bookings").update(updates).eq("id", bookingId);
    
    if (!error) {
      setStatus(newStatus === 'confirmed' ? "success" : "cancelled");
    }
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Loading Request...</div>;

  if (status === "success") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-xl border-4 border-green-500 animate-in zoom-in-95">
        <CheckCircle className="text-green-500 mx-auto mb-6" size={64} />
        <h1 className="text-3xl font-black mb-4 tracking-tighter">Confirmed!</h1>
        <p className="text-slate-500 font-bold mb-8">Your new time at <span className="text-black">{booking?.shops?.name}</span> is locked in for <span className="text-blue-600 font-black underline decoration-2">{selectedTime}</span>.</p>
        <button onClick={() => window.location.href = '/'} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest">Back to Site</button>
      </div>
    </div>
  );

  if (status === "cancelled") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-xl border border-slate-100 animate-in zoom-in-95">
        <XCircle className="text-red-500 mx-auto mb-6" size={64} />
        <h1 className="text-3xl font-black mb-4 tracking-tighter">Cancelled</h1>
        <p className="text-slate-500 font-bold mb-8">No problem. We've released that slot. Feel free to book a different time whenever you're ready.</p>
        <button onClick={() => window.location.href = '/'} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest">Book Again</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
        <div className="bg-blue-50 p-4 rounded-3xl inline-flex mb-8"><Clock className="text-blue-600" size={32} /></div>
        <h1 className="text-3xl font-black tracking-tight mb-2">Reschedule.</h1>
        <p className="text-slate-400 font-bold text-sm mb-10 leading-relaxed px-4">
          The barber at <span className="text-black font-black">{booking?.shops?.name}</span> suggested a new slot. Pick it or choose another!
        </p>

        <div className="relative mb-8">
          <select 
            className="w-full p-6 bg-slate-50 rounded-3xl text-2xl font-black appearance-none outline-none ring-4 ring-transparent focus:ring-blue-100 transition-all cursor-pointer text-center"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
          >
            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={24} />
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => handleResponse('confirmed', selectedTime)} 
            className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
          >
            Accept New Time
          </button>
          <button 
            onClick={() => handleResponse('cancelled')} 
            className="w-full bg-slate-50 text-slate-400 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all"
          >
            Cancel Entire Booking
          </button>
        </div>
      </div>
    </div>
  );
}

// Next.js requires Suspense for useSearchParams
export default function ReschedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse">CONNECTING...</div>}>
      <RescheduleContent />
    </Suspense>
  );
}