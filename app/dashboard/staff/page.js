"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { UserPlus, Trash2, Shield, Mail, ChevronLeft, Power, Loader2, MessageCircle, User } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [shopId, setShopId] = useState(null);

  useEffect(() => {
    const id = localStorage.getItem("barberShopId");
    if (id) {
      setShopId(id);
      fetchStaff(id);
    } else {
      setLoading(false);
      setErrorMsg("Shop ID not found. Please return to the dashboard.");
    }

    const ch = supabase.channel("staff-management")
      .on("postgres_changes", { event: "*", schema: "public", table: "barbers" }, () => {
        fetchStaff(localStorage.getItem("barberShopId"));
      }).subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchStaff = async (id) => {
    if (!id) return;
    const { data, error } = await supabase
      .from("barbers")
      .select("*")
      .eq("shop_id", id)
      .order("name", { ascending: true }); // Standard alphabet order

    if (error) {
      setErrorMsg(error.message);
    } else {
      setStaff(data || []);
      setErrorMsg("");
    }
    setLoading(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setErrorMsg("");
    const email = newEmail.trim().toLowerCase();

    // Use is_available_today to match your Master Dashboard logic
    const { error } = await supabase.from("barbers").insert([{
        shop_id: shopId,
        name: newName.trim(),
        email,
        is_available_today: false,
    }]);

    if (!error) {
      const inviteLink = `${window.location.origin}/register-staff?email=${encodeURIComponent(email)}&shop_id=${shopId}`;
      alert("Barber added! Copy this link and send it to them via WhatsApp or Email: \n\n" + inviteLink);
      setNewName(""); setNewEmail("");
    } else { 
      setErrorMsg(error.message); 
    }
    setIsSending(false);
  };

  const toggleDuty = async (id, currentStatus) => {
    const { error } = await supabase
      .from("barbers")
      .update({ is_available_today: !currentStatus })
      .eq("id", id);
    if (error) setErrorMsg(error.message);
  };

  const removeBarber = async (id) => {
    if (!confirm("Remove this barber from the shop? This will not delete their account, just un-link them from your shop.")) return;
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) setErrorMsg(error.message);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse uppercase text-slate-400 tracking-widest">Loading Team Manager...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900 text-left">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 font-black text-xs uppercase text-slate-400 hover:text-blue-600 transition-all">
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>

        <div className="flex justify-between items-center mb-10 text-left">
          <div className="text-left">
            <h1 className="text-4xl font-black tracking-tighter">Team <span className="text-blue-600">Manager</span></h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">Add and invite your barbers to their chairs</p>
          </div>
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <Shield className="text-blue-600" size={32} />
          </div>
        </div>

        {errorMsg && <div className="bg-red-50 border border-red-100 text-red-700 font-bold p-4 rounded-2xl mb-6 animate-in fade-in">{errorMsg}</div>}

        <form onSubmit={handleInvite} className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-slate-100 mb-12 text-left">
          <h2 className="text-lg font-black mb-6 flex items-center gap-2">Add New Member</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-6 text-left">
            <div className="text-left">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Display Name</label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="e.g. Mario" required className="w-full p-5 pl-14 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-blue-100 transition-all text-left" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-2">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="email" placeholder="barber@email.com" required className="w-full p-5 pl-14 bg-slate-50 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-blue-100 transition-all text-left" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={isSending} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl shadow-xl hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center gap-3">
            {isSending ? <Loader2 className="animate-spin" /> : <><UserPlus size={24} /> Send Invite Link</>}
          </button>
        </form>

        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between px-4 mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 text-left">Active Roster <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-lg">{staff.length}</span></h2>
          </div>
          
          {staff.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
                <p className="font-bold text-slate-300 italic">No barbers added yet. Use the form above to start your team.</p>
            </div>
          ) : (
            staff.map((barber) => (
              <div key={barber.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:shadow-md transition-all text-left">
                <div className="flex items-center gap-5 w-full sm:w-auto text-left">
                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl shadow-inner ${barber.is_available_today ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                    {barber.name?.charAt(0)}
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="font-black text-2xl leading-tight text-left">{barber.name}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-1 text-left">
                      <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5"><Mail size={14} className="text-blue-500" /> {barber.email}</p>
                      {barber.whatsapp_number && <p className="text-sm font-bold text-green-600 flex items-center gap-1.5"><MessageCircle size={14} /> {barber.whatsapp_number}</p>}
                      <span className={`text-[9px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-full ${barber.is_available_today ? "bg-green-100 text-green-700" : "bg-red-50 text-red-500"}`}>
                        {barber.is_available_today ? "● On Duty" : "○ Off Duty"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button 
                    onClick={() => toggleDuty(barber.id, barber.is_available_today)} 
                    className={`flex-1 sm:flex-none px-6 py-4 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${barber.is_available_today ? "bg-green-500 text-white shadow-lg shadow-green-100" : "bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-600"}`}
                  >
                    <Power size={18} /> {barber.is_available_today ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => removeBarber(barber.id)} className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-sm"><Trash2 size={20} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}