"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, XCircle, Clock, Scissors, Loader2, Calendar } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

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
      .select("*, shops(name, address)")
      .eq("id", bookingId)
      .single();
    
    if (data) {
      setBooking(data);
      // Logic: Prioritize proposed_time from the barber, fallback to current time
      setSelectedTime(data.proposed_time || data.booking_time);
    }
    setLoading(false);
  };

  const handleResponse = async (newStatus, finalTime = null) => {
    setLoading(true);
    const updates = { 
      status: newStatus,
      booking_time: finalTime || (booking ? booking.booking_time : ""),
      proposed_time: null 
    };

    const { error } = await supabase.from("bookings").update(updates).eq("id", bookingId);
    
    if (!error) {
      setStatus(newStatus === 'confirmed' ? "success" : "cancelled");
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
        <p className="font-black uppercase italic text-xs tracking-widest text-slate-400">Fetching Request...</p>
      </div>
    </div>
  );

  if (status === "success") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="bg-green-100 text-green-600 p-4 rounded-full inline-flex mb-8"><CheckCircle size={48} /></div>
        <h1 className="text-4xl font-black uppercase italic leading-none mb-4">Nice One!</h1>
        <p className="text-slate-500 font-bold mb-8 uppercase text-xs tracking-tight leading-relaxed">
          Your new time at <span className="text-black">{booking?.shops?.name}</span> is locked in for <br/>
          <span className="text-2xl text-blue-600 italic block mt-2">{selectedTime}</span>
        </p>
        <button onClick={() => window.location.href = '/'} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic text-sm tracking-widest active:scale-95 transition-all">Done</button>
      </div>
    </div>
  );

  if (status === "cancelled") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
        <div className="bg-red-50 text-red-500 p-4 rounded-full inline-flex mb-8"><XCircle size={48} /></div>
        <h1 className="text-4xl font-black uppercase italic leading-none mb-4">Cancelled.</h1>
        <p className="text-slate-500 font-bold mb-8 uppercase text-xs tracking-tight">The slot has been released. You can book a new appointment whenever you're ready.</p>
        <button onClick={() => window.location.href = '/'} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic text-sm tracking-widest">Book Again</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100 text-center relative overflow-hidden">
        
        {/* SHOP HEADER */}
        <div className="bg-black text-white p-3 rounded-2xl inline-flex mb-6 shadow-xl rotate-3">
          <Scissors size={24} />
        </div>
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-1">{booking?.shops?.name}</h2>
        <h1 className="text-3xl font-black uppercase italic leading-none mb-8">Change of Plans?</h1>

        {/* COMPARISON BOX */}
        <div className="bg-slate-50 rounded-[2.5rem] p-6 mb-8 border border-slate-100 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Current Booking</span>
            <span className="text-sm font-bold text-slate-400 line-through italic">{booking?.booking_time}</span>
          </div>
          
          <div className="h-px bg-slate-200 w-full" />

          <div className="flex flex-col items-center py-2">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 italic text-center">New Proposed Time</span>
            <div className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-blue-100 scale-105">
              <Clock size={20} />
              <span className="text-3xl font-black italic tracking-tighter uppercase">{selectedTime}</span>
            </div>
          </div>
        </div>

        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8 leading-relaxed italic">
          The barber had to adjust the schedule. <br/>Does this new time work for you?
        </p>

        {/* DECISION BUTTONS */}
        <div className="space-y-3">
          <button 
            onClick={() => handleResponse('confirmed', selectedTime)} 
            className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-xl uppercase italic hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            Accept New Time
          </button>
          
          <button 
            onClick={() => handleResponse('cancelled')} 
            className="w-full bg-slate-50 text-slate-400 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all italic"
          >
            Decline & Cancel
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Powered by TrimDay</p>
    </div>
  );
}

export default function ReschedulePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-black animate-pulse text-slate-400 uppercase tracking-widest">
        Connecting...
      </div>
    }>
      <RescheduleContent />
    </Suspense>
  );
}