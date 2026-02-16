const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Stripe sends POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  const rawBody = event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    // ✅ Payment Link checkout success
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      const email =
        session.customer_details?.email ||
        session.customer_email ||
        null;

      if (!email) {
        console.error("No email found on session.");
        return { statusCode: 200, body: "No email; ignored" };
      }

      // find the latest shop created with that email
      const { data: shops, error: findErr } = await supabaseAdmin
        .from("shops")
        .select("id, owner_email")
        .eq("owner_email", email)
        .order("created_at", { ascending: false })
        .limit(1);

      if (findErr) {
        console.error("Supabase find error:", findErr.message);
        return { statusCode: 500, body: "Supabase find error" };
      }

      if (!shops || shops.length === 0) {
        console.error("No shop found for email:", email);
        return { statusCode: 200, body: "No matching shop; ignored" };
      }

      const shopId = shops[0].id;

      const { error: updateErr } = await supabaseAdmin
        .from("shops")
        .update({
          subscription_status: "active",
          is_active: true,
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: session.subscription || null,
          stripe_checkout_session_id: session.id,
        })
        .eq("id", shopId);

      if (updateErr) {
        console.error("Supabase update error:", updateErr.message);
        return { statusCode: 500, body: "Supabase update error" };
      }

      console.log("Activated shop:", shopId, "for", email);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Webhook failed" };
  }
};
