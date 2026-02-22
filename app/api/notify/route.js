import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { booking, type } = await req.json();
    
    // Safety check: if booking is missing entirely, stop here
    if (!booking) {
      return NextResponse.json({ error: "No booking data provided" }, { status: 400 });
    }

    let emailResponse;

    // 1. EMAIL VERIFICATION
    if (type === 'verify_email') {
      const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify?id=${booking.id}`;
      
      emailResponse = await resend.emails.send({
        from: 'Trimday Testing <onboarding@resend.dev>',
        to: ['trimday1@gmail.com'], 
        subject: `Confirm your appointment ✂️ - ${booking.client_name || 'Customer'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2 style="color: #000;">Finish your booking</h2>
            <p>Hi ${booking.client_name || 'there'}, please click the button below to verify your email.</p>
            <a href="${verifyLink}" style="background: black; color: white; padding: 16px 24px; border-radius: 12px; text-decoration: none; display: inline-block; font-weight: bold;">Verify Appointment</a>
          </div>
        `
      });
    }

    // 2. FINAL CONFIRMATION (Accept)
    else if (type === 'confirmed' || type === 'confirm') {
      emailResponse = await resend.emails.send({
        from: 'Trimday Testing <onboarding@resend.dev>',
        to: ['trimday1@gmail.com'], 
        subject: `Booking Confirmed! ✂️ - ${booking.booking_date || ''}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h1 style="color: #000;">It's Official, ${booking.client_name || 'Customer'}!</h1>
            <p>Your barber has accepted your request.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <p><strong>Service:</strong> ${booking.service_name || 'Service'}</p>
              <p><strong>Date:</strong> ${booking.booking_date || 'TBD'}</p>
              <p><strong>Time:</strong> ${booking.booking_time || 'TBD'}</p>
            </div>
          </div>
        `
      });
    }

    // 3. CANCELLED
    else if (type === 'cancelled' || type === 'cancel') {
      emailResponse = await resend.emails.send({
        from: 'Trimday Testing <onboarding@resend.dev>',
        to: ['trimday1@gmail.com'], 
        subject: `Appointment Cancelled - ${booking.booking_date || ''}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ef4444; padding: 20px; border-radius: 15px;">
            <h2 style="color: #ef4444;">Appointment Cancelled</h2>
            <p>Hi ${booking.client_name || 'Customer'}, your appointment for ${booking.service_name || 'your session'} has been cancelled.</p>
          </div>
        `
      });
    }

    // 4. RESCHEDULED
    else if (type === 'rescheduled' || type === 'reschedule') {
      const acceptLink = `${process.env.NEXT_PUBLIC_SITE_URL}/booking/response?id=${booking.id}&action=accept`;
      const declineLink = `${process.env.NEXT_PUBLIC_SITE_URL}/booking/response?id=${booking.id}&action=decline`;

      emailResponse = await resend.emails.send({
        from: 'Trimday Testing <onboarding@resend.dev>',
        to: ['trimday1@gmail.com'], 
        subject: 'Proposed New Time - ' + (booking.client_name || 'Customer'),
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2>New Time Proposed: ${booking.proposed_time || booking.booking_time || 'TBD'}</h2>
            <div style="margin-top: 20px;">
              <a href="${acceptLink}" style="background: #22c55e; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin-right: 10px; font-weight: bold;">Accept</a>
              <a href="${declineLink}" style="background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Decline</a>
            </div>
          </div>
        `
      });
    }

    // FINAL RESPONSE CHECK
    if (emailResponse?.error) {
      console.error("Resend API Error:", emailResponse.error);
      return NextResponse.json({ error: emailResponse.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("CRITICAL ROUTE ERROR:", err);
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}