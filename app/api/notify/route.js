import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { booking, type } = await req.json();

    if (type === 'verify_email') {
      const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/verify?id=${booking.id}`;
      
      await resend.emails.send({
        from: 'Trimday <bookings@your-verified-domain.com>',
        to: [booking.client_email],
        subject: 'Confirm your appointment ✂️',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Finish your booking</h2>
            <p>Hi ${booking.client_name}, please click the button below to verify your email and send your request to the barber.</p>
            <a href="${verifyLink}" style="background: black; color: white; padding: 16px 24px; border-radius: 12px; text-decoration: none; display: inline-block; font-weight: bold;">Verify Appointment</a>
          </div>
        `
      });
    }

    if (type === 'rescheduled') {
      const acceptLink = `${process.env.NEXT_PUBLIC_SITE_URL}/booking/response?id=${booking.id}&action=accept`;
      const declineLink = `${process.env.NEXT_PUBLIC_SITE_URL}/booking/response?id=${booking.id}&action=decline`;

      await resend.emails.send({
        from: 'Trimday <bookings@your-verified-domain.com>',
        to: [booking.client_email],
        subject: 'The Barber Proposed a New Time',
        html: `
          <h2>New Time Proposed: ${booking.proposed_time}</h2>
          <p>The barber can't make the original slot but suggested this new time for your ${booking.service_name}.</p>
          <div style="margin-top: 20px;">
            <a href="${acceptLink}" style="background: #22c55e; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; margin-right: 10px;">Accept New Time</a>
            <a href="${declineLink}" style="background: #ef4444; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none;">Decline</a>
          </div>
        `
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}