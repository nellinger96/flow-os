import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { guest_count, menu_items } = await req.json()

    const prompt = `
      You are a professional catering chef. 
      Create a precise grocery shopping list for a catering event.
      
      Details:
      - Guest Count: ${guest_count} people
      - Menu: ${menu_items.join(', ')}
      
      Instructions:
      1. Return a JSON array ONLY. No markdown.
      2. Format: [{"item": "Ingredient Name", "quantity": "Quantity + Unit"}]
      3. Be realistic (e.g. for 100 people, don't say 1 oz of salt).
    `

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const data = await response.json()
    
    // Clean up Gemini's response
    let rawText = data.candidates[0].content.parts[0].text
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    return new Response(rawText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})