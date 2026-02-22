"use client";
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from "@supabase/supabase-js";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function ResponseContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const action = searchParams.get('action');
  const [status, setStatus] = useState('processing'); // processing, accepted, declined, error

  useEffect(() => {
    if (!id || !action) return;

    const handleAction = async () => {
      try {
        if (action === 'accept') {
          // 1. Get full booking data (needed for the email)
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", id)
            .single();
          
          if (booking?.proposed_time) {
            // 2. Update status and swap times
            const { error: updateError } = await supabase.from("bookings")
              .update({ 
                status: 'confirmed', 
                booking_time: booking.proposed_time,
                proposed_time: null 
              })
              .eq("id", id);
            
            if (!updateError) {
              setStatus('accepted');
              
              // 3. TRIGGER CONFIRMATION EMAIL
              await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  booking: { ...booking, booking_time: booking.proposed_time },
                  type: 'confirmed'
                }),
              });
            } else {
              setStatus('error');
            }
          }
        } else if (action === 'decline') {
          // 1. Get booking data before cancelling for the email context
          const { data: booking } = await supabase.from("bookings").select("*").eq("id", id).single();
          
          // 2. Update status to cancelled
          const { error: updateError } = await supabase.from("bookings")
            .update({ status: 'cancelled' })
            .eq("id", id);

          if (!updateError) {
            setStatus('declined');
            
            // 3. TRIGGER CANCELLATION EMAIL
            await fetch('/api/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                booking: booking,
                type: 'cancelled'
              }),
            });
          } else {
            setStatus('error');
          }
        }
      } catch (err) {
        console.error("Handle Action Error:", err);
        setStatus('error');
      }
    };

    handleAction();
  }, [id, action]);

  if (status === 'processing') return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="font-black uppercase italic">Updating your barber...</p>
    </div>
  );

  return (
    <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full animate-in zoom-in-95 text-center">
      {status === 'accepted' ? (
        <>
          <CheckCircle className="text-green-500 mx-auto mb-6" size={64} />
          <h1 className="text-3xl font-black mb-2">Confirmed!</h1>
          <p className="text-slate-500 font-bold mb-8">You've accepted the new time. We've updated the barber's chair for you.</p>
        </>
      ) : status === 'declined' ? (
        <>
          <XCircle className="text-red-500 mx-auto mb-6" size={64} />
          <h1 className="text-3xl font-black mb-2">Cancelled</h1>
          <p className="text-slate-500 font-bold mb-8">You declined the new time. The booking has been removed.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-black text-red-500 mb-2">Something went wrong</h1>
          <p className="text-slate-500">We couldn't process that request. The link may have expired.</p>
        </>
      )}
      <button 
        onClick={() => window.close()} 
        className="w-full py-5 bg-black text-white rounded-2xl font-black shadow-lg"
      >
        Close Window
      </button>
    </div>
  );
}

export default function BookingResponsePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <Suspense fallback={<Loader2 className="animate-spin" />}>
        <ResponseContent />
      </Suspense>
    </div>
  );
}