import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook Signature Error:", err.message);
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 });
  }

  // YOUR ACTUAL PRO PRICE ID (Update this once you have the new Trim Day Stripe account)
  const PRO_PRICE_ID = 'price_1P...'; 

  // EVENT 1: Existing barber upgrades through the Portal
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const priceId = subscription.items.data[0].price.id;
    const customerId = subscription.customer;

    if (priceId === PRO_PRICE_ID) {
      await supabase
        .from('shops')
        .update({ subscription_tier: 'pro' })
        .eq('stripe_customer_id', customerId);
      console.log(`Customer ${customerId} upgraded to PRO via Portal`);
    }
  }

  // EVENT 2: Brand new barber signs up and pays for Pro immediately
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerId = session.customer;
    const shopId = session.metadata?.shopId; // We must send this during checkout!

    // If it's a subscription checkout
    if (session.mode === 'subscription') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = subscription.items.data[0].price.id;

      if (priceId === PRO_PRICE_ID) {
        await supabase
          .from('shops')
          .update({ 
            subscription_tier: 'pro',
            stripe_customer_id: customerId // Save this so the Portal works later
          })
          .eq('id', shopId);
        console.log(`Shop ${shopId} initialized as PRO via Checkout`);
      }
    }
  }

  return NextResponse.json({ received: true });
}