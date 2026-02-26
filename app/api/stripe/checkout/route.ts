import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 🔥 Updated to the version your package requires to fix the build error
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
  apiVersion: '2026-01-28.clover' as any 
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { shopId, priceId } = await req.json();

    if (!shopId || !priceId) {
      throw new Error("Missing shopId or priceId");
    }

    // 1. Check if the shop exists and grab the Stripe Customer ID if they have one
    const { data: shop } = await supabase.from('shops').select('stripe_customer_id').eq('id', shopId).single();

    // 2. Prepare the Stripe Checkout Session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      // This is where the magic happens - linking back to your existing page
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/join`,
      // 🔥 CRITICAL: This tells your webhook exactly which shop just paid
      client_reference_id: shopId, 
    };

    // 3. If they are already a customer, attach their ID. If not, Stripe will create one!
    if (shop?.stripe_customer_id) {
      sessionConfig.customer = shop.stripe_customer_id;
    }

    // 4. Start the Session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Checkout Route Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}