import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const WHATSAPP_PHONE_RE = /^\+[1-9]\d{7,14}$/
const RESEND_URL = 'https://api.resend.com/emails'
const FROM = 'VibeKonect <news@vibekonect.com>'
const SITE = 'https://vibekonect.com'

function formatWhatsAppNumber(value: unknown) {
  const stripped = String(value ?? '')
    .trim()
    .replace(/[\s().-]/g, '')
    .replace(/^00/, '+')
  const cleaned = stripped.startsWith('+') ? stripped : stripped.replace(/\D/g, '')
  if (!cleaned) return null
  if (cleaned.startsWith('+')) return cleaned
  return /^[1-9]\d{7,14}$/.test(cleaned) ? `+${cleaned}` : cleaned
}

function welcomeHtml(unsubscribeUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to VibeKonect</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0a0a0a;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background-color:#111111;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
    <div style="background:linear-gradient(135deg,#a855f7 0%,#ec4899 100%);padding:32px 24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;font-weight:bold;">🎵 VibeKonect</h1>
      <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:16px;">Premium beats &amp; freestyle challenges</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">You're subscribed! 🎉</h2>
      <p style="color:#c9c9c9;font-size:16px;line-height:1.6;margin:0 0 24px;">Thanks for joining the VibeKonect community. You'll now receive updates on:</p>
      <ul style="color:#c9c9c9;font-size:16px;line-height:1.8;margin:0 0 24px;padding-left:20px;">
        <li>🏆 <strong>Freestyle competitions</strong> — win prizes and get featured</li>
        <li>🎧 <strong>New beat drops</strong> — fresh sounds from LocBeatx</li>
        <li>👑 <strong>Winner announcements</strong> — see who took the crown</li>
        <li>⭐ <strong>Sponsored challenges</strong> — cash prizes from brands</li>
      </ul>
      <div style="background-color:#1a1a1a;border-radius:12px;padding:20px;margin:24px 0;border-left:4px solid #a855f7;">
        <p style="color:#fff;margin:0 0 8px;font-weight:bold;">🔥 First up: June Summer Competition</p>
        <p style="color:#a0a0a0;margin:0;font-size:14px;">Beat drops June 1st. £50 prize + featured artist spot. Get your bars ready.</p>
      </div>
      <a href="${SITE}/competition" style="display:block;background:linear-gradient(135deg,#a855f7 0%,#ec4899 100%);color:#fff;text-decoration:none;padding:14px 24px;border-radius:40px;font-weight:600;font-size:16px;text-align:center;margin:24px 0;">🎤 Visit VibeKonect</a>
    </div>
    <div style="background-color:#0a0a0a;padding:24px;text-align:center;border-top:1px solid #2a2a2a;">
      <p style="color:#6b6b6b;font-size:12px;margin:0 0 12px;">You received this email because you subscribed to updates from VibeKonect.</p>
      <p style="color:#6b6b6b;font-size:12px;margin:0;">
        <a href="${unsubscribeUrl}" style="color:#a855f7;text-decoration:underline;">Unsubscribe</a> |
        <a href="${unsubscribeUrl}&prefs=1" style="color:#a855f7;text-decoration:underline;">Update preferences</a>
      </p>
      <p style="color:#6b6b6b;font-size:11px;margin:16px 0 0;">© 2026 VibeKonect — Where beats find their voice</p>
    </div>
  </div>
</body></html>`
}

async function sendWelcomeEmail(to: string, unsubscribeUrl: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.warn('RESEND_API_KEY not configured; skipping welcome email')
    return
  }
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: "Welcome to VibeKonect — you're in! 🎵",
      html: welcomeHtml(unsubscribeUrl),
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('Welcome email send failed', res.status, body)
  } else {
    console.log('Welcome email sent', to)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email ?? '').trim().toLowerCase()
    const source = String(body.source ?? 'unknown').slice(0, 64)
    const formLocation = String(body.form_location ?? source).slice(0, 64)
    const prefsIn = body.preferences ?? {}
    const preferences = {
      competitions: prefsIn.competitions !== false,
      new_beats: prefsIn.new_beats !== false,
      winners: prefsIn.winners !== false,
      platform_news: !!prefsIn.platform_news,
    }
    const phoneNumber = formatWhatsAppNumber(body.phone_number)
    const whatsappOptedInRequested = !!body.whatsapp_opted_in

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (phoneNumber && !WHATSAPP_PHONE_RE.test(phoneNumber)) {
      return new Response(JSON.stringify({ error: 'Enter WhatsApp number in international format, e.g. +447123456789.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (whatsappOptedInRequested && !phoneNumber) {
      return new Response(JSON.stringify({ error: 'Add a WhatsApp number to receive WhatsApp updates.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const whatsappOptedIn = whatsappOptedInRequested && !!phoneNumber

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null
    const userAgent = (req.headers.get('user-agent') ?? '').slice(0, 512) || null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Try insert; if exists, update preferences and reactivate
    const { data: existing } = await supabase
      .from('notification_subscribers')
      .select('id, email_verified, is_active, unsubscribe_token')
      .eq('email', email)
      .maybeSingle()

    let row = existing
    let isNew = false
    if (!existing) {
      const { data, error } = await supabase
        .from('notification_subscribers')
        .insert({
          email,
          preferences,
          source,
          form_location: formLocation,
          ip_address: ip,
          user_agent: userAgent,
          is_active: true,
          email_verified: true,
          verified_at: new Date().toISOString(),
          phone_number: phoneNumber,
          whatsapp_opted_in: whatsappOptedIn,
        })
        .select('id, unsubscribe_token, email_verified')
        .single()
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      row = data as any
      isNew = true
    } else {
      await supabase
        .from('notification_subscribers')
        .update({
          preferences,
          is_active: true,
          email_verified: true,
          verified_at: new Date().toISOString(),
          unsubscribed_at: null,
          ip_address: ip,
          user_agent: userAgent,
          form_location: formLocation,
          source,
          ...(phoneNumber ? { phone_number: phoneNumber } : {}),
          whatsapp_opted_in: whatsappOptedIn,
        })
        .eq('id', existing.id)
    }

    // Fire welcome email (best-effort) — only on first signup, via Resend directly
    if (isNew && row) {
      // Use the hardcoded production site to prevent attacker-controlled
      // Origin headers from injecting phishing links into welcome emails.
      const unsubscribeUrl = `${SITE}/unsubscribe-notifications?token=${(row as any).unsubscribe_token}`
      try {
        await sendWelcomeEmail(email, unsubscribeUrl)
      } catch (e) {
        console.warn('welcome email failed', e)
      }
    }

    return new Response(JSON.stringify({ ok: true, id: (row as any)?.id, isNew }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
