import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// 🔥 UPDATED: API Version updated to match your package requirements
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { 
      // @ts-ignore
      apiVersion: '2026-01-28.clover' as any // Updated to fix the build error
    })
  : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(req: Request) {
  try {
    if (!stripe) {
      console.error("STRIPE_SECRET_KEY is missing");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const { shopId } = await req.json();
    if (!shopId) return NextResponse.json({ error: 'Missing Shop ID' }, { status: 400 });

    // Fetch the shop to get the Customer ID and current Tier
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', shopId)
      .single();

    if (shopError || !shop?.stripe_customer_id) {
      return NextResponse.json({ error: 'Billing profile not found. Please complete setup.' }, { status: 404 });
    }

    // Create a Billing Portal session where they can manage Tiers (Solo/Pro)
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