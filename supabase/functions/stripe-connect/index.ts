import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      httpClient: Stripe.createFetchHttpClient(),
    })
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { code, user_id } = await req.json()

    if (!code || !user_id) throw new Error("Missing code or user_id")

    // 1. Exchange Code for ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    })
    const connectedAccountId = response.stripe_user_id

    // 2. FORCE UPDATE (Upsert)
    // This creates the row if it's missing!
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: user_id, 
        stripe_account_id: connectedAccountId 
      }, { onConflict: 'id' }) 
      // 'upsert' means: Update if exists, Insert if new.

    if (updateError) {
        console.error("Database Error:", updateError)
        throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, account_id: connectedAccountId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Link Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})