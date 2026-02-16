"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Check, X, Clock, Calendar as CalIcon, User, Phone, Power, RefreshCcw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BarberDashboard() {
  const [pending, setPending] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Initial Data Fetch
  useEffect(() => {
    fetchInitialData();

    // 2. Realtime Subscription: Refresh UI whenever ANY change happens in DB
    const channel = supabase.channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchBookings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barbers' }, () => fetchBarbers())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchBookings(), fetchBarbers()]);
    setLoading(false);
  };

  const fetchBookings = async () => {
    // Get Pending
    const { data: pend } = await supabase.from('bookings').select('*').eq('status', 'pending');
    setPending(pend || []);

    // Get Today's Confirmed
    const today = new Date().toISOString().split('T')[0];
    const { data: sched } = await supabase.from('bookings')
      .select('*')
      .eq('status', 'confirmed')
      .gte('booking_time', `${today}T00:00:00`)
      .lte('booking_time', `${today}T23:59:59`)
      .order('booking_time', { ascending: true });
    setSchedule(sched || []);
  };

  const fetchBarbers = async () => {
    const { data } = await supabase.from('barbers').select('*').order('name', { ascending: true });
    setBarbers(data || []);
  };

  const updateBookingStatus = async (id, status) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    fetchBookings();
  };

  const toggleBarberStatus = async (id, currentStatus) => {
    await supabase.from('barbers').update({ is_available_today: !currentStatus }).eq('id', id);
    fetchBarbers();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse">LOADING DASHBOARD...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter">TrimDay <span className="text-blue-600">DASHBOARD</span></h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">King Kutz Management</p>
          </div>
          <button onClick={fetchInitialData} className="p-3 bg-white rounded-2xl shadow-sm hover:rotate-180 transition-transform duration-500">
            <RefreshCcw size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Pending & Actions */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                Live Requests ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.length > 0 ? pending.map(b => (
                  <div key={b.id} className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-blue-50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded">NEW</span>
                        <p className="font-black text-xl">{b.customer_name}</p>
                      </div>
                      <p className="text-slate-500 font-bold flex items-center gap-1 text-sm">
                        <Scissors size={14} className="text-blue-600" /> {b.service_name || "Standard Cut"} with <span className="text-slate-900">{b.barber_name || "Aman"}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateBookingStatus(b.id, 'declined')} className="flex-1 md:flex-none p-4 bg-slate-100 rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><X/></button>
                      <button onClick={() => updateBookingStatus(b.id, 'confirmed')} className="flex-1 md:flex-none px-8 py-4 bg-black text-white rounded-2xl font-black hover:bg-blue-600 transition-all">CONFIRM</button>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] py-16 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No active pings</div>
                )}
              </div>
            </section>

            {/* Today's Full Schedule */}
            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <CalIcon className="text-blue-600" /> Confirmed Schedule
              </h2>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                {schedule.length > 0 ? (
                  <div className="space-y-6">
                    {schedule.map(slot => (
                      <div key={slot.id} className="flex items-center gap-6 pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                        <div className="font-black text-blue-600 bg-blue-50 w-20 py-2 rounded-xl text-center">
                          {new Date(slot.booking_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-slate-900">{slot.customer_name}</p>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-tighter">{slot.barber_name} • {slot.service_name || "Standard Cut"}</p>
                        </div>
                        <a href={`tel:${slot.customer_phone}`} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                          <Phone size={18} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-300 font-bold italic">No appointments confirmed yet.</p>
                )}
              </div>
            </section>
          </div>

          {/* Column 2: Staff Management */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <User className="text-blue-600" /> Staff on Duty
              </h2>
              <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-100">
                <div className="space-y-4">
                  {barbers.map(barber => (
                    <div key={barber.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-blue-100 transition-all">
                      <div>
                        <p className="font-black text-slate-900">{barber.name}</p>
                        <p className={`text-[10px] font-black uppercase ${barber.is_available_today ? 'text-green-500' : 'text-red-500'}`}>
                          {barber.is_available_today ? 'Accepting Bookings' : 'Off Duty'}
                        </p>
                      </div>
                      <button 
                        onClick={() => toggleBarberStatus(barber.id, barber.is_available_today)}
                        className={`p-3 rounded-xl transition-all ${barber.is_available_today ? 'bg-green-500 text-white' : 'bg-red-100 text-red-500'}`}
                      >
                        <Power size={20} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-[10px] text-slate-400 font-bold leading-relaxed text-center uppercase tracking-widest">
                  Toggling "Off Duty" removes the barber from the booking page instantly.
                </p>
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}