import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// --- HARDCODED KEY ---
const GEMINI_API_KEY = "AIzaSyBMkMpfsanJuM6ct-AbSybcMjQyDS7Gqx8" 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { guest_count, menu_items } = await req.json()

    // 2. The Prompt
    const prompt = `
      You are a professional catering chef. 
      Create a precise grocery shopping list.
      
      Details:
      - Guest Count: ${guest_count}
      - Menu: ${menu_items.join(', ')}
      
      Instructions:
      1. Return a JSON array ONLY. No markdown.
      2. Format: [{"item": "Ingredient Name", "quantity": "Qty + Unit"}]
      3. Be realistic.
    `

    console.log("Sending prompt to Gemini 2.0 Flash...")

    // --- FIX: USING THE MODEL FOUND IN YOUR LOGS ---
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })

    const data = await response.json()

    // 3. Error Handling
    if (data.error) {
       console.error("GOOGLE API ERROR:", JSON.stringify(data.error))
       throw new Error(`Google Error: ${data.error.message}`)
    }
    
    // 4. Parse Response
    let rawText = data.candidates[0].content.parts[0].text
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    return new Response(rawText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("CRITICAL FUNCTION ERROR:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})