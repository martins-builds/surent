// supabase/functions/send-guarantor-link/index.ts
// Deploy with: supabase functions deploy send-guarantor-link
// Set secret first: supabase secrets set RESEND_API_KEY=your_resend_key

import { serve } from "https://deno.land/std@0.192.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { guarantorEmail, guarantorName, propertyTitle, link, recipientRole } = await req.json()

    if (!guarantorEmail || !link) {
      return new Response(JSON.stringify({ error: "Missing guarantorEmail or link" }), {
        status: 400,
        headers: corsHeaders
      })
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "SURent <onboarding@resend.dev>",
        to: guarantorEmail,
        subject: `You've been added as a guarantor — ${propertyTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#1a3c5e;">SURent — Secure University Rent</h2>
            <p>Hi ${guarantorName || "there"},</p>
            <p>
              You've been listed as the guarantor for the ${recipientRole || "tenant"} in a
              rental negotiation on SURent regarding <strong>${propertyTitle}</strong>.
              Both parties have confirmed the viewing stage.
            </p>
            <p>You can review the full negotiation history below — no account needed:</p>
            <p>
              <a href="${link}" style="background:#f57c00;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
                View Negotiation
              </a>
            </p>
            <p style="color:#777;font-size:13px;">
              This link is read-only. It cannot be used to send messages or change anything.
            </p>
          </div>
        `
      })
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
