"use client";
import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { X, CheckCircle, ChevronLeft } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ---------- time helpers ----------
const pad2 = (n) => String(n).padStart(2, "0");

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [hStr, mStr] = String(hhmm).split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const minutesToHHMM = (mins) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;

const formatTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const ceilToNextInterval = (date, intervalMinutes) => {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const mins = d.getMinutes();
  const rem = mins % intervalMinutes;
  if (rem !== 0) d.setMinutes(mins + (intervalMinutes - rem));
  return d;
};

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000);

const sameLocalDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfLocalDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const setLocalTimeFromMinutes = (dayDate, mins) =>
  new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), Math.floor(mins / 60), mins % 60, 0, 0);

const isWithinTimeRangeNow = (openHHMM, closeHHMM, now = new Date()) => {
  const openM = toMinutes(openHHMM);
  const closeM = toMinutes(closeHHMM);
  if (openM == null || closeM == null) return false;
  const nowM = now.getHours() * 60 + now.getMinutes();

  // overnight support (e.g., 20:00 -> 02:00)
  if (closeM < openM) return nowM >= openM || nowM <= closeM;

  return nowM >= openM && nowM <= closeM;
};

// Build slots across closed time, but ONLY inside daily opening hours.
// Also: last slot must be <= close - bufferMinutes
const buildSlotsNext24hRespectingHours = ({
  now,
  openHHMM,
  closeHHMM,
  intervalMinutes = 30,
  bufferMinutes = 30, // ✅ stop offering 30 mins before closing
}) => {
  const openM = toMinutes(openHHMM);
  const closeM = toMinutes(closeHHMM);

  if (openM == null || closeM == null) return [];

  // If overnight schedule exists, you can extend this later. For now assume normal day (open < close)
  // If it IS overnight, we still try to behave reasonably but it’s better to store day-specific hours later.
  const isOvernight = closeM < openM;

  const horizonEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const slots = [];
  let cursor = ceilToNextInterval(now, intervalMinutes);

  // We move cursor forward day-by-day, time-by-time, skipping closed hours.
  while (cursor <= horizonEnd) {
    const dayStart = startOfLocalDay(cursor);

    // Define today’s open/last-bookable window
    const openTime = setLocalTimeFromMinutes(dayStart, openM);

    // lastBookable = close - buffer
    // If overnight, close is on next day
    const closeDayStart = isOvernight ? addMinutes(dayStart, 24 * 60) : dayStart;
    const closeTime = setLocalTimeFromMinutes(closeDayStart, closeM);
    const lastBookable = addMinutes(closeTime, -bufferMinutes);

    // If cursor is before open, jump to open
    if (cursor < openTime) cursor = new Date(openTime);

    // If cursor is after lastBookable, jump to next day open (rounded)
    if (cursor > lastBookable) {
      const nextDay = addMinutes(dayStart, 24 * 60);
      cursor = setLocalTimeFromMinutes(nextDay, openM);
      cursor = ceilToNextInterval(cursor, intervalMinutes);
      continue;
    }

    // Cursor is within open window => add slot, then increment
    // Extra guard: don’t add slots past horizonEnd
    if (cursor <= horizonEnd) slots.push(new Date(cursor));

    cursor = addMinutes(cursor, intervalMinutes);

    // If we crossed into next day, loop continues naturally
    // If we crossed past lastBookable, next iteration will jump to next day open
  }

  // Deduplicate (safe guard)
  const seen = new Set();
  return slots.filter((d) => {
    const k = d.toISOString();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export default function BookingModal({ shop, onClose }) {
  const [step, setStep] = useState(1);
  const [availableBarbers, setAvailableBarbers] = useState([]);
  const [allBarbers, setAllBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resolvedShop, setResolvedShop] = useState(null);

  const [booking, setBooking] = useState({
    customerName: "",
    customerPhone: "",
    service: null,
    barber: null,
    slotDate: null, // Date object
  });

  const services = [
    { name: "Skin Fade", price: 20, duration: "45m" },
    { name: "Beard Trim", price: 10, duration: "20m" },
    { name: "The Full Works", price: 25, duration: "60m" },
  ];

  // 1) Resolve shop row
  useEffect(() => {
    const resolveShop = async () => {
      if (!shop) return;
      setResolvedShop(null);

      const looksLikeUUID =
        typeof shop.id === "string" && shop.id.includes("-") && shop.id.length > 20;

      if (looksLikeUUID) {
        setResolvedShop(shop);
        return;
      }

      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .or(`name.ilike.%${shop.name}%,address.ilike.%${shop.address}%`)
        .limit(1);

      if (!error && data && data[0]) setResolvedShop(data[0]);
      else setResolvedShop(shop);
    };

    resolveShop();
  }, [shop]);

  // 2) Fetch barbers
  useEffect(() => {
    const getStaff = async () => {
      if (!resolvedShop?.id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("shop_id", resolvedShop.id);

      const barbers = !error ? data || [] : [];
      setAllBarbers(barbers);

      const filtered = barbers.filter(
        (b) => b?.is_on_duty === true || b?.is_available_today === true
      );

      setAvailableBarbers(filtered);
      setLoading(false);
    };

    if (resolvedShop?.id) getStaff();
  }, [resolvedShop]);

  // Opening hours (defaults)
  const openTime = resolvedShop?.open_time || "09:00";
  const closeTime = resolvedShop?.close_time || "19:00";

  // We still show barbers even if closed; but we show no slots if closed within next window rules.
  const shopIsOpenNow = isWithinTimeRangeNow(openTime, closeTime, new Date());

  // Tick every minute so "past" times drop off
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ✅ Slots: respect opening hours + last slot <= close - 30 mins
  const slots = useMemo(() => {
    const now = new Date(tick);
    return buildSlotsNext24hRespectingHours({
      now,
      openHHMM: openTime,
      closeHHMM: closeTime,
      intervalMinutes: 30,
      bufferMinutes: 30, // half hour before closing
    });
  }, [tick, openTime, closeTime]);

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);

    const booking_time = booking.slotDate ? booking.slotDate.toISOString() : null;

    const { error } = await supabase.from("bookings").insert([
      {
        customer_name: booking.customerName,
        customer_phone: booking.customerPhone,
        barber_id: booking.barber.id,
        barber_name: booking.barber.name,
        service_name: booking.service.name,
        booking_time,
        status: "pending",
        shop_id: resolvedShop?.id || shop?.id || null,
        shop_name: shop?.name || null,
      },
    ]);

    if (!error) setStep(4);
    else {
      console.error(error);
      alert("Booking failed. Please try again.");
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep(step - 1)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <h2 className="text-xl font-black mx-auto">Book {shop?.name}</h2>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Services */}
        {step === 1 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">
              Select Treatment
            </p>
            {services.map((s) => (
              <button
                key={s.name}
                onClick={() => {
                  setBooking((prev) => ({ ...prev, service: s }));
                  setStep(2);
                }}
                className="w-full flex justify-between items-center p-5 border-2 border-slate-50 hover:border-blue-600 rounded-2xl transition-all group hover:bg-blue-50/30"
              >
                <div className="text-left font-black group-hover:text-blue-600">{s.name}</div>
                <div className="font-black text-lg">£{s.price}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Barber & Time */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center mb-4">
                Choose Barber
              </p>

              {loading ? (
                <div className="h-20 flex items-center justify-center font-bold text-slate-300">
                  Checking duty roster...
                </div>
              ) : (
                <div className="flex gap-3">
                  {availableBarbers.length > 0 ? (
                    availableBarbers.map((b) => (
                      <button
                        key={b.id}
                        onClick={() =>
                          setBooking((prev) => ({ ...prev, barber: b, slotDate: null }))
                        }
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                          booking.barber?.id === b.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-slate-50 hover:border-slate-200"
                        }`}
                      >
                        <div className="font-black text-sm">{b.name}</div>
                        <div className="text-[9px] font-bold text-blue-500 uppercase">On Duty</div>
                      </button>
                    ))
                  ) : (
                    <div className="w-full text-center py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl italic">
                      {allBarbers.length === 0
                        ? "No barbers found for this shop (check shop_id link)."
                        : "All barbers are currently off duty."}
                    </div>
                  )}
                </div>
              )}
            </div>

            {booking.barber && (
              <div className="animate-in fade-in duration-500">
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center mb-2">
                  Pick a Time (Next 24 hours)
                </p>

                {!shopIsOpenNow && (
                  <p className="text-center text-[11px] font-bold text-slate-400 mb-4">
                    Shop is currently closed (hours {openTime}–{closeTime}). You can still book the next available slots.
                  </p>
                )}

                {slots.length === 0 ? (
                  <div className="w-full text-center py-4 text-red-500 font-bold text-sm bg-red-50 rounded-2xl italic">
                    No available slots in the next 24 hours within opening hours.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((d) => (
                      <button
                        key={d.toISOString()}
                        onClick={() => {
                          setBooking((prev) => ({ ...prev, slotDate: d }));
                          setStep(3);
                        }}
                        className="p-3 bg-slate-50 hover:bg-black hover:text-white rounded-xl font-black text-sm transition-all"
                      >
                        {formatTime(d)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Final Details & Confirm */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center">
              Your Details
            </p>

            <input
              type="text"
              placeholder="Your Full Name"
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-600 outline-none rounded-2xl font-bold"
              value={booking.customerName}
              onChange={(e) => setBooking((prev) => ({ ...prev, customerName: e.target.value }))}
            />

            <input
              type="tel"
              placeholder="WhatsApp Number"
              className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-600 outline-none rounded-2xl font-bold"
              value={booking.customerPhone}
              onChange={(e) => setBooking((prev) => ({ ...prev, customerPhone: e.target.value }))}
            />

            <button
              disabled={
                !booking.customerName || !booking.customerPhone || !booking.slotDate || isSubmitting
              }
              onClick={handleFinalConfirm}
              className="w-full bg-black text-white p-5 rounded-2xl font-black shadow-xl shadow-blue-100 disabled:opacity-50 hover:bg-blue-600 transition-all"
            >
              {isSubmitting ? "SENDING..." : "CONFIRM REQUEST"}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center py-6 animate-in zoom-in-95">
            <div className="bg-green-100 text-green-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black mb-2">Request Sent!</h3>
            <p className="text-slate-500 font-bold text-sm mb-8 leading-relaxed">
              We've pinged{" "}
              <span className="text-black font-black">{booking.barber?.name}</span>. Keep an eye on WhatsApp.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-100 text-slate-900 p-5 rounded-2xl font-black"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
