const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Use Service Role Key to bypass RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  console.log("--- WEBHOOK START ---");

  try {
    const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ ERROR: Missing STRIPE_WEBHOOK_SECRET");
      return { statusCode: 500, body: "Config Error" };
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error(`❌ SIGNATURE ERROR: ${err.message}`);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    console.log(`✅ EVENT RECEIVED: ${stripeEvent.type}`);

    // LOGIC: INITIAL CHECKOUT
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      const shopId = session.client_reference_id;

      console.log(`🔎 SESSION DATA: ShopID: ${shopId}, Email: ${session.customer_details?.email}`);

      if (!shopId) {
        console.error("❌ ERROR: No client_reference_id found in Stripe payload.");
        return { statusCode: 200, body: "No ShopID provided" };
      }

      // Perform Update and capture 'data' to see if a row was actually changed
      const { data, error } = await supabaseAdmin
        .from("shops")
        .update({
          is_active: true,
          subscription_status: "active",
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          stripe_checkout_session_id: session.id,
          owner_email: session.customer_details?.email,
          postcode: session.customer_details?.address?.postal_code,
        })
        .eq("id", shopId)
        .select(); // Critical for debugging

      if (error) {
        console.error("❌ SUPABASE UPDATE ERROR:", error.message);
        return { statusCode: 500, body: JSON.stringify(error) };
      }

      if (!data || data.length === 0) {
        console.error(`❌ MATCH ERROR: No shop row found in Supabase for UUID: ${shopId}`);
        return { statusCode: 200, body: "ID not found in DB" };
      }

      console.log(`✅ SUCCESS: Shop ${shopId} is now active.`);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("❌ HANDLER CRASHED:", err.message);
    return { statusCode: 500, body: "Crash" };
  }
};