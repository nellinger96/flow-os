import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// FIX: Updated to v14.21.0 to fix the "runMicrotasks" error
import Stripe from "npm:stripe@14.21.0"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS (Browser Security)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      httpClient: Stripe.createFetchHttpClient(),
    })

    // 1. Get Data from Frontend
    const { amount, description, clientName, returnUrl, user_id } = await req.json()

    // 2. Find the Caterer's Stripe Account ID
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if user_id was actually sent
    if (!user_id) {
        throw new Error("System Error: No merchant ID provided. Please refresh and try again.")
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', user_id)
      .single()

    const connectedAccountId = profile?.stripe_account_id

    // SAFETY CHECK: If they haven't connected Stripe, stop.
    if (!connectedAccountId) {
      throw new Error("This merchant has not finished setting up their bank account.")
    }

    // 3. Calculate the Math to Pass Fees to the Customer
    const baseAmountInCents = Math.round(amount * 100)

    // The reverse math formula: (Base Amount + 30 cents) / 0.961
    // This perfectly inflates the total so the caterer is left with exactly 100% of their invoice
    const totalAmountInCents = Math.ceil((baseAmountInCents + 30) / 0.961)

    // Your 1% commission is calculated from the new, inflated total that the customer pays
    const applicationFee = Math.round(totalAmountInCents * 0.01)

    // 4. Create the Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'klarna', 'afterpay_clearpay'], 
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Catering Service',
              // We add a note so the customer knows why their total is slightly higher
              description: `Invoice for ${clientName} (Includes secure processing fees)`, 
            },
            unit_amount: totalAmountInCents, // The customer pays the inflated amount
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${returnUrl}?success=true`,
      cancel_url: `${returnUrl}?canceled=true`,
      
      // THE MAGIC PART (Routing the Money)
      payment_intent_data: {
        application_fee_amount: applicationFee, // YOUR PURE 1% CUT
      },
    }, {
      // THIS FORCES THE CATERER TO PAY STRIPE'S FEES (using the extra money we just charged the customer)
      stripeAccount: connectedAccountId, 
    })

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Stripe Error:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})