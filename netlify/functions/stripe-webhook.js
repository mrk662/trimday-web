const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  console.log("--- WEBHOOK RECEIVED ---");

  try {
    const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ CONFIG ERROR: Missing STRIPE_WEBHOOK_SECRET");
      return { statusCode: 500, body: "Missing Secret" };
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error(`❌ SIG ERROR: ${err.message}`);
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    console.log(`✅ EVENT TYPE: ${stripeEvent.type}`);

    const dataObject = stripeEvent.data.object;
    const customerId = dataObject.customer;

    switch (stripeEvent.type) {
      // 1. INITIAL ACTIVATION (Triggered by Checkout)
      case "checkout.session.completed": {
        const shopId = dataObject.client_reference_id;
        console.log(`🔎 Checkout Session for Shop: ${shopId}`);

        if (!shopId) {
          console.error("⚠️ No client_reference_id found");
          break;
        }

        const { data, error } = await supabaseAdmin
          .from("shops")
          .update({
            is_active: true,
            subscription_status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: dataObject.subscription,
            stripe_checkout_session_id: dataObject.id,
            owner_email: dataObject.customer_details?.email,
            postcode: dataObject.customer_details?.address?.postal_code,
          })
          .eq("id", shopId)
          .select();

        if (error) console.error("❌ Checkout Update Failed:", error.message);
        else if (data?.length > 0) console.log(`✅ Shop ${shopId} activated.`);
        break;
      }

      // 2. SUBSCRIPTION CANCELED
      case "customer.subscription.deleted": {
        console.log(`🚫 Deactivating Customer: ${customerId}`);
        const { error } = await supabaseAdmin
          .from("shops")
          .update({ 
            is_active: false, 
            subscription_status: "canceled" 
          })
          .eq("stripe_customer_id", customerId);

        if (error) console.error("❌ Deactivation Failed:", error.message);
        else console.log(`✅ Shop for Customer ${customerId} marked inactive.`);
        break;
      }

      // 3. SUBSCRIPTION UPDATED (Payment fails or Resumes)
      case "customer.subscription.updated": {
        const status = dataObject.status; // 'active', 'past_due', 'unpaid', etc.
        console.log(`🔄 Status Update: ${status} for Customer: ${customerId}`);
        
        const { error } = await supabaseAdmin
          .from("shops")
          .update({ 
            subscription_status: status,
            is_active: status === "active" 
          })
          .eq("stripe_customer_id", customerId);

        if (error) console.error("❌ Status Update Failed:", error.message);
        break;
      }

      // 4. RENEWAL SUCCESS (Invoice Paid)
      case "invoice.paid": {
        console.log(`💰 Renewal Paid for Customer: ${customerId}`);
        await supabaseAdmin
          .from("shops")
          .update({ is_active: true, subscription_status: "active" })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("❌ CRITICAL CRASH:", err.message);
    return { statusCode: 500, body: "Crash" };
  }
};