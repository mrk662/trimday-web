import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // 1. Connect to your database using the auto-provided secrets
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Fetch the specific iPhone ID for this shop
    const { data: shop } = await supabase
      .from('shops')
      .select('onesignal_id')
      .eq('id', record.shop_id)
      .single()

    const targetId = shop?.onesignal_id

    // 3. Send the notification
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Deno.env.get('ONESIGNAL_REST_API_KEY')}`
      },
      body: JSON.stringify({
        app_id: "afc5de4c-286f-4794-b2eb-ac336ec058e2",
        include_subscription_ids: targetId ? [targetId] : [],
        
        // --- IMPROVED DELIVERY SETTINGS ---
        priority: 10,               // Force immediate delivery on iOS
        ttl: 3600,                  // Keep alive for 1 hour if offline
        ios_badgeType: "Increase",  // Add red bubble to app icon
        ios_badgeCount: 1,          // Increment badge by 1
        // ----------------------------------

        contents: { 
          "en": `${record.client_name || 'A client'} booked a ${record.service_name || 'service'}! ✂️` 
        },
        headings: { "en": "New Booking! 📅" }
      })
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})