import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function normalizePhone(phone: string | null) {
  if (!phone) return ""
  return phone.trim().replace(/\s+/g, "")
}

function cleanJson(raw: string) {
  return raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()
}

function twiml(message: string) {
  const safeMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safeMessage}</Message></Response>`,
    {
      headers: {
        "Content-Type": "text/xml",
      },
    }
  )
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function extractOpenAIText(data: any) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim()
  }

  let text = ""

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const content of item.content) {
          if (typeof content.text === "string") {
            text += content.text
          }
        }
      }
    }
  }

  return text.trim()
}

function normalizeParsedEvent(parsed: any) {
  return {
    client_name: parsed.client_name ?? null,
    client_phone: parsed.client_phone ?? null,
    client_email: parsed.client_email ?? null,
    address: parsed.address ?? null,
    city: parsed.city ?? null,
    event_date: parsed.event_date ?? null,
    event_time: parsed.event_time ?? null,
    guest_count: parsed.guest_count ?? null,
    menu_entrees: Array.isArray(parsed.menu_entrees) ? parsed.menu_entrees : [],
    menu_sides: Array.isArray(parsed.menu_sides) ? parsed.menu_sides : [],
    menu_drinks: Array.isArray(parsed.menu_drinks) ? parsed.menu_drinks : [],
    total_price: parsed.total_price ?? null,
    deposit: parsed.deposit ?? null,
    notes: parsed.notes ?? null,
    missing_fields: Array.isArray(parsed.missing_fields) ? parsed.missing_fields : [],
  }
}

async function parseEventWithOpenAI(message: string) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
  const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini"

  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY")
  }

  const today = new Date().toISOString().slice(0, 10)

  const systemPrompt = `
You are a catering/event booking parser for CaterflowOS.

The vendor may text in English, Spanish, or Spanglish.
Your job is to extract event details from messy vendor text and return clean JSON.

Today's date is ${today}.
If a date is provided without a year, choose the next upcoming future date.

Return JSON ONLY.
No markdown.
No explanation.
No extra text.

Return this exact JSON shape:

{
  "client_name": string | null,
  "client_phone": string | null,
  "client_email": string | null,
  "address": string | null,
  "city": string | null,
  "event_date": "YYYY-MM-DD" | null,
  "event_time": "HH:MM" | null,
  "guest_count": number | null,
  "menu_entrees": string[],
  "menu_sides": string[],
  "menu_drinks": string[],
  "total_price": number | null,
  "deposit": number | null,
  "notes": string | null,
  "missing_fields": string[]
}

Rules:
- event_time must be 24-hour format, like "16:00".
- Put tacos, birria, pasta, meats, main foods, bar packages, desserts, dessert carts, and primary services in menu_entrees.
- Put rice, beans, salads, sides, toppings, garnishes, cups, plates, and setup notes in menu_sides only if they are clearly part of the order.
- Put aguas frescas, soda, drinks, cocktails, mocktails, beer, wine, and bar drinks in menu_drinks.
- If the vendor says "depósito", "deposit", "down payment", "anticipo", or "separó con", put that amount in deposit.
- If total_price is missing but price per person and guest count are mentioned, calculate total_price.
- If city is inside the address, still extract city when obvious.
- missing_fields should include only important missing items from this list:
  client_name, event_date, event_time, address, city, guest_count, total_price, menu.
- Do not include a missing field if the message clearly provides it.
- If the vendor says "cliente Maria", "para Maria", "evento de Maria", or "a nombre de Maria", that is the client_name.
- If the message is vague, still extract what you can.
`

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Vendor text:\n${message}`,
        },
      ],
      temperature: 0,
      max_output_tokens: 1200,
    }),
  })

  const data = await response.json()

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || "OpenAI API error")
  }

  const rawText = extractOpenAIText(data)

  if (!rawText) {
    throw new Error("No OpenAI response text")
  }

  try {
    return normalizeParsedEvent(JSON.parse(cleanJson(rawText)))
  } catch (_error) {
    console.error("RAW OPENAI TEXT:", rawText)
    throw new Error("OpenAI returned invalid JSON")
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  let fromNumber = ""
  let toNumber = ""
  let body = ""

  try {
    const contentType = req.headers.get("content-type") || ""

    // Twilio sends SMS data as application/x-www-form-urlencoded.
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData()

      fromNumber = normalizePhone(form.get("From")?.toString() || "")
      toNumber = normalizePhone(form.get("To")?.toString() || "")
      body = form.get("Body")?.toString() || ""
    } else {
      // JSON fallback for manual testing.
      const json = await req.json()

      fromNumber = normalizePhone(json.From || json.from || "")
      toNumber = normalizePhone(json.To || json.to || "")
      body = json.Body || json.body || ""
    }

    if (!fromNumber || !body) {
      return twiml("No pude leer el mensaje. Intenta mandar los detalles otra vez.")
    }

    const { data: vendor, error: vendorError } = await supabase
      .from("vendor_phone_numbers")
      .select("user_id, business_name")
      .eq("phone_number", fromNumber)
      .eq("active", true)
      .single()

    if (vendorError || !vendor) {
      await supabase.from("sms_logs").insert({
        from_number: fromNumber,
        to_number: toNumber,
        body,
        status: "unauthorized",
        error_message: "Phone number not connected to a CaterflowOS account.",
      })

      return twiml("Este número todavía no está conectado a una cuenta de CaterflowOS.")
    }

    const parsed = await parseEventWithOpenAI(body)

    const guestCount = Number(parsed.guest_count || 0)
    const totalPrice = Number(parsed.total_price || 0)
    const deposit = Number(parsed.deposit || 0)
    const balance = Math.max(totalPrice - deposit, 0)

    const pricePerHead =
      guestCount > 0 && totalPrice > 0
        ? Math.round((totalPrice / guestCount) * 100) / 100
        : ""

    const paymentPlan = []

    if (deposit > 0) {
      paymentPlan.push({
        date: new Date().toISOString().slice(0, 10),
        amount: deposit,
        paid: true,
      })
    }

    if (balance > 0) {
      paymentPlan.push({
        date: parsed.event_date || "",
        amount: balance,
        paid: false,
      })
    }

    const serviceData = {
      event_date: parsed.event_date || "",
      event_time: parsed.event_time || "",
      guest_count: guestCount || "",
      price_per_head: pricePerHead,
      menu_entrees: parsed.menu_entrees || [],
      menu_sides: parsed.menu_sides || [],
      menu_drinks: parsed.menu_drinks || [],
      payment_plan: paymentPlan,
      dietary_restrictions: "",
      kitchen_notes: "",
      timeline: [],
      sms_created: true,
      original_text: body,
      missing_fields: parsed.missing_fields || [],
    }

    const { data: customer, error: insertError } = await supabase
      .from("customers")
      .insert({
        user_id: vendor.user_id,
        full_name: parsed.client_name || "New Client",
        phone: parsed.client_phone || "",
        email: parsed.client_email || "",
        address: parsed.address || "",
        city: parsed.city || "",
        job_price: Math.round(totalPrice || 0),
        status: "proposal",
        job_notes: parsed.notes || "",
        service_data: serviceData,
      })
      .select("id, public_token, full_name, job_price")
      .single()

    if (insertError) {
      throw insertError
    }

    await supabase.from("sms_logs").insert({
      from_number: fromNumber,
      to_number: toNumber,
      body,
      parsed_data: parsed,
      customer_id: customer.id,
      status: "created",
    })

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://caterflowos.netlify.app"

    const reviewLink = `${appBaseUrl}/clients?id=${customer.id}`
    const contractLink = `${appBaseUrl}/sign/${customer.public_token}`

    const missingText =
      parsed.missing_fields && parsed.missing_fields.length > 0
        ? `\n\nFalta: ${parsed.missing_fields.join(", ")}`
        : ""

    const reply =
      `Contrato creado ✅\n\n` +
      `Cliente: ${parsed.client_name || "New Client"}\n` +
      `Fecha: ${parsed.event_date || "TBD"}\n` +
      `Hora: ${parsed.event_time || "TBD"}\n` +
      `Personas: ${guestCount || "TBD"}\n` +
      `Total: $${totalPrice || 0}\n` +
      `Depósito: $${deposit || 0}\n` +
      `Balance: $${balance || 0}\n\n` +
      `Revisar en CaterflowOS:\n${reviewLink}\n\n` +
      `Link para enviar al cliente:\n${contractLink}` +
      missingText

    return twiml(reply)
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    console.error("TEXT TO CONTRACT ERROR:", errorMessage)

    await supabase.from("sms_logs").insert({
      from_number: fromNumber,
      to_number: toNumber,
      body,
      status: "error",
      error_message: errorMessage,
    })

    return twiml(`Error creando contrato: ${errorMessage}`)
  }
})