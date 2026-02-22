import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 1. Initialize Stripe with a STABLE version
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { 
      apiVersion: '2024-06-20' // Using a stable, non-preview version
    })
  : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    // 2. Check if the API key actually exists
    if (!stripe) {
      console.error("STRIPE_SECRET_KEY is missing from .env.local");
      return NextResponse.json({ error: 'Server configuration error (API Key missing)' }, { status: 500 });
    }

    const { shopId } = await req.json();
    if (!shopId) return NextResponse.json({ error: 'Missing Shop ID' }, { status: 400 });

    // 3. Get the Stripe Customer ID
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('stripe_customer_id')
      .eq('id', shopId)
      .single();

    if (shopError || !shop?.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found for this shop.' }, { status: 404 });
    }

    // 4. Create the session
    const session = await stripe.billingPortal.sessions.create({
      customer: shop.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe Portal Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}