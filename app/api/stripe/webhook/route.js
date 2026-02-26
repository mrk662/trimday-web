import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🔥 Webhooks MUST use the Service Role Key to bypass RLS and update the database securely
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
);

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

  // Pull Price IDs from environment variables dynamically
  const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO;
  const SOLO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO;

  try {
    // EVENT 1: Brand new barber signs up and pays
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerId = session.customer;
      
      // Grab shopId from client_reference_id (we set this up in the checkout route earlier!)
      const shopId = session.client_reference_id || session.metadata?.shopId; 

      if (!shopId) {
        console.error("⚠️ No shopId found in session");
        return NextResponse.json({ error: 'No shopId found' }, { status: 400 });
      }

      if (session.mode === 'subscription') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const priceId = subscription.items.data[0].price.id;

        // Figure out if they bought Solo or Pro
        const tier = priceId === PRO_PRICE_ID ? 'pro' : 'solo';

        const { error } = await supabaseAdmin
          .from('shops')
          .update({ 
            is_active: true,
            subscription_status: 'active',
            subscription_tier: tier,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription,
            stripe_checkout_session_id: session.id,
            owner_email: session.customer_details?.email,
          })
          .eq('id', shopId);

        if (error) throw error;
        console.log(`✅ Shop ${shopId} activated as ${tier.toUpperCase()}`);
      }
    }

    // EVENT 2: Existing barber changes plan (upgrades/downgrades) through the Customer Portal
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const priceId = subscription.items.data[0].price.id;
      const customerId = subscription.customer;
      const status = subscription.status; // e.g., 'active', 'past_due'

      const tier = priceId === PRO_PRICE_ID ? 'pro' : 'solo';

      const { error } = await supabaseAdmin
        .from('shops')
        .update({ 
          subscription_tier: tier,
          subscription_status: status,
          is_active: status === 'active' 
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🔄 Customer ${customerId} updated to ${tier.toUpperCase()} with status ${status}`);
    }

    // EVENT 3: Subscription canceled or non-payment
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { error } = await supabaseAdmin
        .from('shops')
        .update({ 
          is_active: false, 
          subscription_status: 'canceled' 
        })
        .eq('stripe_customer_id', customerId);

      if (error) throw error;
      console.log(`🚫 Customer ${customerId} canceled subscription.`);
    }

    return NextResponse.json({ received: true });

  } catch (dbError) {
    console.error("❌ Database Update Error:", dbError.message);
    return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
  }
}