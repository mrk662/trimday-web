"use client";
import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, Clock, User, Phone, Power, Loader2, 
  MapPin, LogOut, CheckCircle, XCircle, MessageSquare, 
  Scissors, Save, Plus, Trash2, Settings, Volume2, VolumeX, Activity
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const DEFAULT_SERVICES = [
  { name: "Standard Haircut", duration: 30, price: 20 },
  { name: "Skin Fade", duration: 45, price: 25 },
  { name: "Beard Trim", duration: 15, price: 10 },
];

export default function BarberDashboard() {
  const [shop, setShop] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date()); // Tick for live timestamps
  const [soundEnabled, setSoundEnabled] = useState(false); // Browser safety toggle
  
  // Modals
  const [managingBooking, setManagingBooking] = useState(null);
  const [showServiceMenu, setShowServiceMenu] = useState(false); 
  const [isEditingMenu, setIsEditingMenu] = useState(false);     
  const [isOnboarding, setIsOnboarding] = useState(false);       
  const [menuItems, setMenuItems] = useState([]);

  // Sound Refs
  const bookingAudio = useRef(null);
  const statusAudio = useRef(null);

  useEffect(() => {
    // Initialize Notification Sounds
    bookingAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    statusAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

    const shopId = localStorage.getItem("barberShopId");
    if (!shopId) { window.location.href = "/login"; return; }
    
    fetchDashboardData(shopId);

    // REALTIME SUBSCRIPTION
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` }, () => {
        if (soundEnabled) bookingAudio.current.play().catch(() => {});
        fetchBookings(shopId);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `shop_id=eq.${shopId}` }, () => {
        if (soundEnabled) statusAudio.current.play().catch(() => {});
        fetchBookings(shopId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops', filter: `id=eq.${shopId}` }, (payload) => setShop(payload.new))
      .subscribe();

    // Auto-refresh the "Time Ago" display every 30 seconds
    const timer = setInterval(() => setNow(new Date()), 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [soundEnabled]);

  const fetchDashboardData = async (id) => {
    const { data: shopData } = await supabase.from("shops").select("*").eq("id", id).single();
    
    if (!shopData.service_menu || shopData.service_menu.length === 0) {
        setMenuItems(DEFAULT_SERVICES);
        setIsOnboarding(true);
        setIsEditingMenu(true);
    } else {
        setMenuItems(shopData.service_menu);
    }

    setShop(shopData);
    await fetchBookings(id);
    setLoading(false);
  };

  const fetchBookings = async (id) => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("shop_id", id)
      .neq("status", "completed")
      .neq("status", "cancelled") 
      .order("created_at", { ascending: false });
    setBookings(data || []);
  };

  const toggleStatus = async () => {
    const newStatus = !shop.is_open;
    const { data } = await supabase.from("shops")
      .update({ is_open: newStatus, status_updated_at: new Date().toISOString() })
      .eq("id", shop.id)
      .select().single();
    if (data) setShop(data);
  };

  const updateWorkStatus = async (statusLabel) => {
    const previousStatus = shop.current_status;
    const { data } = await supabase.from("shops")
      .update({ current_status: statusLabel, status_updated_at: new Date().toISOString() })
      .eq("id", shop.id)
      .select().single();
    
    if (data) setShop(data);
    
    if (statusLabel === 'with client' && previousStatus !== 'with client') {
       setShowServiceMenu(true);
    }

    if (statusLabel === 'available' && previousStatus === 'with client') {
      const { data: activeWalkIns } = await supabase.from("bookings").select("id").eq("shop_id", shop.id).ilike("client_name", "%Walk-in%").eq("status", "active");
      if (activeWalkIns?.length > 0) {
        await supabase.from("bookings").update({ status: 'completed' }).in("id", activeWalkIns.map(b => b.id));
        fetchBookings(shop.id);
      }
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const seconds = Math.floor((now - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  // --- MENU EDITOR LOGIC ---
  const addServiceRow = () => setMenuItems([...menuItems, { name: "", duration: 30, price: 0 }]);
  const removeServiceRow = (index) => setMenuItems(menuItems.filter((_, i) => i !== index));
  const updateServiceRow = (index, field, value) => {
    const updated = [...menuItems];
    updated[index][field] = value;
    setMenuItems(updated);
  };

  const saveMenuChanges = async () => {
    const validItems = menuItems.filter(item => item.name.trim() !== "");
    if (validItems.length === 0) return alert("You must have at least one service!");
    const { error } = await supabase.from("shops").update({ service_menu: validItems }).eq("id", shop.id);
    if (!error) { setShop({ ...shop, service_menu: validItems }); setIsEditingMenu(false); setIsOnboarding(false); }
  };

  const confirmWalkIn = async (service) => {
    const formatT = (d) => `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    const nowTime = new Date();
    const endTime = new Date(nowTime.getTime() + service.duration * 60000); 

    const { error } = await supabase.from("bookings").insert([{
      shop_id: shop.id, client_name: "Walk-in Client", client_phone: "Walk-in",
      service_name: service.name, booking_date: nowTime.toISOString().split('T')[0],
      booking_time: `${formatT(nowTime)} - ${formatT(endTime)}`, status: 'active'
    }]);

    if (!error) { fetchBookings(shop.id); setShowServiceMenu(false); }
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    fetchBookings(shop.id);
    setManagingBooking(null);
  };

  const handleLogout = () => { localStorage.removeItem("barberShopId"); window.location.href = "/login"; };
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 animate-pulse font-black">LOADING SYSTEM...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      <div className="relative w-full h-48 md:h-64 bg-slate-200 overflow-hidden shadow-inner">
        {shop.photo_object_fit === "contain" && <div className="absolute inset-0 bg-center bg-cover scale-110 blur-3xl opacity-40" style={{ backgroundImage: `url(${shop.shop_photo_url})` }} />}
        <img src={shop.shop_photo_url} alt="Banner" className={`relative w-full h-full z-10 ${shop.photo_object_fit === 'cover' ? 'object-cover' : 'object-contain'}`} />
        <button onClick={handleLogout} className="absolute top-6 right-6 z-20 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white active:scale-95 transition-all"><LogOut size={20} /></button>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
        
        {/* IDENTITY & STATUS HEADER */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                  {shop.name}
                  <button onClick={() => setIsEditingMenu(true)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"><Settings size={18} /></button>
              </h1>
              <p className="flex items-center gap-1.5 text-slate-400 font-black text-[10px] mt-1 uppercase tracking-widest"><MapPin size={14} className="text-red-500"/> {shop.postcode}</p>
            </div>
            {/* ENABLE SOUND BUTTON */}
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-3 rounded-2xl transition-all ${soundEnabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
               {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          <button onClick={toggleStatus} className={`px-8 py-4 rounded-2xl font-black transition-all shadow-lg active:scale-95 ${shop.is_open ? 'bg-green-500 text-white shadow-green-100' : 'bg-red-500 text-white shadow-red-100'}`}>
            <Power size={20} className="inline mr-2" /> {shop.is_open ? "SHOP IS OPEN" : "SHOP IS CLOSED"}
          </button>
        </div>

        {/* LIVE STATUS TAB & TIMER */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
            <div className="grid grid-cols-3 gap-2 flex-1 w-full bg-white p-2 rounded-[2rem] shadow-md">
              {['available', 'with client', 'booked out'].map((s) => (
                <button key={s} onClick={() => updateWorkStatus(s)} className={`py-4 rounded-2xl font-black text-[9px] uppercase transition-all ${shop?.current_status === s ? (s === 'available' ? 'bg-green-600 text-white' : s === 'with client' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white') : 'bg-transparent text-slate-400'}`}>{s.replace('_', ' ')}</button>
              ))}
            </div>
            <div className="bg-white px-8 py-4 rounded-3xl shadow-md text-center min-w-[150px] border border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Activity</p>
                <p className="font-black text-blue-600 text-sm mt-1">{getTimeAgo(shop?.status_updated_at)}</p>
            </div>
        </div>

        {/* APPOINTMENTS LIST */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black flex items-center gap-3"><Activity className="text-blue-600" /> Pending Requests</h2>
            <span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black text-slate-500">{bookings.length} Live</span>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 font-bold text-slate-300 uppercase text-[10px] tracking-widest italic">No active pings</div>
          ) : (
            <div className="grid gap-3">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-5 bg-white rounded-3xl border-2 border-slate-50 shadow-sm hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white p-3 rounded-2xl flex flex-col items-center min-w-[85px]">
                      <span className="text-[8px] font-black uppercase opacity-70">{booking.client_name === "Walk-in Client" ? "Walk-in" : "Booked"}</span>
                      <span className="text-xs font-black mt-0.5">{booking.booking_time}</span>
                    </div>
                    <div>
                      <p className="font-black text-lg text-slate-900">{booking.client_name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{booking.service_name}</p>
                    </div>
                  </div>
                  <button onClick={() => setManagingBooking(booking)} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase shadow-md">Manage</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WALK-IN SELECTION MODAL */}
      {showServiceMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="text-center mb-8">
               <h3 className="text-2xl font-black text-slate-900">New Walk-In</h3>
               <p className="text-slate-400 font-bold text-sm">Pick service to block time</p>
            </div>
            <div className="grid gap-2">
              {menuItems.map((service, idx) => (
                <button key={idx} onClick={() => confirmWalkIn(service)} className="p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-50 transition-all flex justify-between items-center group">
                  <div className="text-left">
                    <p className="font-black text-lg text-slate-900">{service.name}</p>
                    <p className="text-xs font-bold text-slate-400">{service.duration} mins</p>
                  </div>
                  <span className="font-black text-lg text-slate-900">£{service.price}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowServiceMenu(false)} className="w-full mt-6 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Close</button>
          </div>
        </div>
      )}

      {/* MENU EDITOR MODAL */}
      {isEditingMenu && (
        <div className="fixed inset-0 z-[150] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 flex flex-col max-h-[85vh]">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">{isOnboarding ? "Setup Your Menu" : "Manage Services"}</h2>
              <p className="text-slate-500 font-bold text-xs">{isOnboarding ? "Add your first services to go live." : "Update your pricing and duration."}</p>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 mb-6">
              {menuItems.map((service, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex-1"><input type="text" placeholder="Service Name" value={service.name} onChange={(e) => updateServiceRow(idx, 'name', e.target.value)} className="w-full bg-transparent font-black text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none"/></div>
                  <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-100"><input type="number" value={service.duration} onChange={(e) => updateServiceRow(idx, 'duration', parseInt(e.target.value))} className="w-8 text-center font-bold text-sm focus:outline-none"/><span className="text-[10px] font-bold text-slate-400">min</span></div>
                  <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg border border-slate-100"><span className="text-[10px] font-bold text-slate-400">£</span><input type="number" value={service.price} onChange={(e) => updateServiceRow(idx, 'price', parseFloat(e.target.value))} className="w-8 text-center font-bold text-sm focus:outline-none"/></div>
                  <button onClick={() => removeServiceRow(idx)} className="text-slate-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                </div>
              ))}
              <button onClick={addServiceRow} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-xs flex items-center justify-center gap-2 hover:border-blue-400 hover:text-blue-500 transition-all"><Plus size={16}/> Add New Service</button>
            </div>
            <button onClick={saveMenuChanges} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={18}/> {isOnboarding ? "Start Work" : "Save Changes"}</button>
          </div>
        </div>
      )}

      {/* MANAGEMENT MODAL */}
      {managingBooking && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-black mb-2">{managingBooking.client_name}</h3>
            <p className="text-slate-400 font-bold text-sm mb-8">{managingBooking.booking_time} • <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{managingBooking.service_name}</span></p>
            <div className="space-y-3">
              {managingBooking.client_name !== "Walk-in Client" && (<a href={`https://wa.me/${managingBooking.client_phone}`} target="_blank" className="w-full bg-slate-50 p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-green-50 hover:text-green-600 transition-all"><MessageSquare size={18}/> Message Client</a>)}
              <button onClick={() => updateBookingStatus(managingBooking.id, 'completed')} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg"><CheckCircle size={18}/> Haircut Finished</button>
              <button onClick={() => updateBookingStatus(managingBooking.id, 'cancelled')} className="w-full border-2 border-red-50 text-red-500 p-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-red-50 transition-all"><XCircle size={18}/> Cancel/No Show</button>
              <button onClick={() => setManagingBooking(null)} className="w-full text-slate-400 font-black text-[10px] uppercase mt-6 tracking-widest">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}