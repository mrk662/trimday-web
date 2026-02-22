import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { record } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch the shop's OneSignal ID
    const { data: shop } = await supabase
      .from('shops')
      .select('onesignal_id')
      .eq('id', record.shop_id)
      .single()

    if (!shop?.onesignal_id) {
      return new Response(JSON.stringify({ message: "No OneSignal ID" }), { status: 200 })
    }

    // Ping OneSignal
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`
      },
      body: JSON.stringify({
        app_id: Deno.env.get('ONESIGNAL_APP_ID'),
        include_subscription_ids: [shop.onesignal_id],
        headings: { "en": "New Trim Ping! ✂️" },
        contents: { "en": `${record.client_name} booked for ${record.booking_time}` },
        priority: 10
      })
    })

    const result = await response.json()
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})