import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the successful payment event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const shopId = session.client_reference_id; // This is the ID we passed in join.js

    // Update the shop to be active in Supabase
    const { error } = await supabase
      .from("shops")
      .update({ 
        is_active: true, 
        subscription_status: "active" 
      })
      .eq("id", shopId);

    if (error) {
      console.error("Supabase Update Error:", error);
      return NextResponse.json({ error: "Failed to activate shop" }, { status: 500 });
    }

    console.log(`✅ Shop ${shopId} is now active!`);
  }

  return NextResponse.json({ received: true });
}