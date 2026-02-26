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
    const fromAddress = 'TrimDay <bookings@trimday.co.uk>'; // 🔥 Live domain
    const toAddress = [booking.client_email || 'trimday1@gmail.com']; // 🔥 Dynamic client email with a safe fallback
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const currentYear = new Date().getFullYear();
    const firstName = booking.client_name ? booking.client_name.split(' ')[0] : 'there';

    // 1. EMAIL VERIFICATION
    if (type === 'verify_email') {
      const verifyLink = `${baseUrl}/verify?id=${booking.id}`;
      
      emailResponse = await resend.emails.send({
        from: fromAddress,
        to: toAddress, 
        subject: `Confirm your appointment ✂️ - ${booking.client_name || 'Customer'}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm your TrimDay Appointment</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 20px 0;">
              <tr>
                <td align="center">
                  <table border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; width: 100%; max-width: 600px; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="background-color: #1a1a1a; padding: 30px 20px; text-align: center;">
                        <img src="https://trimday.co.uk/icon.png" alt="TrimDay" style="display: block; margin: 0 auto; max-width: 60px; height: auto;">
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px; color: #333333;">
                        <h1 style="font-size: 24px; margin: 0 0 20px; color: #111111;">Almost there! Confirm your booking</h1>
                        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 25px;">Hi ${firstName},</p>
                        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 25px;">Thanks for booking with TrimDay — we're getting you lined up with one of our top local barbers.</p>
                        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 25px;">To secure your appointment and verify your email, just click the button below. It only takes a second.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${verifyLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 6px;">Verify & Confirm Booking</a>
                        </div>
                        
                        <p style="font-size: 16px; line-height: 1.5; margin: 0 0 10px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; font-size: 14px; margin: 0 0 25px;"><a href="${verifyLink}" style="color: #2563eb;">${verifyLink}</a></p>
                        
                        <p style="margin-top: 30px; font-size: 14px; color: #555555; line-height: 1.5;">
                          This link expires in 24 hours for your security. If you didn't make this booking, you can safely ignore this email — nothing will be reserved.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f8f8f8; padding: 25px 30px; text-align: center; font-size: 13px; color: #666666;">
                        <p style="margin: 0 0 10px;">TrimDay.co.uk — Book top barbers in seconds.</p>
                        <p style="margin: 0 0 10px;"><a href="https://trimday.co.uk" style="color: #2563eb; text-decoration: underline;">trimday.co.uk</a> | <a href="mailto:support@trimday.co.uk" style="color: #2563eb; text-decoration: underline;">support@trimday.co.uk</a></p>
                        <p style="margin: 0;">© ${currentYear} TrimDay. All rights reserved.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      });
    }

    // 2. FINAL CONFIRMATION (Accept)
    else if (type === 'confirmed' || type === 'confirm') {
      emailResponse = await resend.emails.send({
        from: fromAddress,
        to: toAddress, 
        subject: `Booking Confirmed! ✂️ - ${booking.booking_date || ''}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h1 style="color: #000;">It's Official, ${firstName}!</h1>
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
        from: fromAddress,
        to: toAddress, 
        subject: `Appointment Cancelled - ${booking.booking_date || ''}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ef4444; padding: 20px; border-radius: 15px;">
            <h2 style="color: #ef4444;">Appointment Cancelled</h2>
            <p>Hi ${firstName}, your appointment for ${booking.service_name || 'your session'} has been cancelled.</p>
          </div>
        `
      });
    }

    // 4. RESCHEDULED
    else if (type === 'rescheduled' || type === 'reschedule') {
      const acceptLink = `${baseUrl}/booking/response?id=${booking.id}&action=accept`;
      const declineLink = `${baseUrl}/booking/response?id=${booking.id}&action=decline`;

      emailResponse = await resend.emails.send({
        from: fromAddress,
        to: toAddress, 
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