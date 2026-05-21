import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_URL = 'https://api.resend.com/emails'
const FROM = 'VibeKonect <news@vibekonect.com>'
const SITE = 'https://vibekonect.com'

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function renderEmail(opts: {
  title: string; content: string; ctaLabel?: string | null; ctaUrl?: string | null;
  unsubscribeUrl: string; preferencesUrl: string;
}) {
  // Content is now stored as HTML from the rich text editor.
  // If it doesn't contain any tags, fall back to escaped plain text.
  const looksLikeHtml = /<[a-z][^>]*>/i.test(opts.content)
  const bodyHtml = looksLikeHtml ? opts.content : escapeHtml(opts.content).replace(/\n/g, '<br/>')
  const cta = opts.ctaLabel && opts.ctaUrl
    ? `<p style="text-align:center;margin:32px 0;"><a href="${opts.ctaUrl}" style="background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block;">${escapeHtml(opts.ctaLabel)}</a></p>`
    : ''
  return `<!doctype html><html><body style="margin:0;background:#0f0a1a;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#e9e4f5;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px;">
  <table width="600" style="max-width:600px;background:linear-gradient(180deg,#1a1030,#140a26);border-radius:16px;overflow:hidden;border:1px solid rgba(168,85,247,0.2);">
    <tr><td style="padding:28px 32px 8px;">
      <div style="font-size:22px;font-weight:800;background:linear-gradient(135deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">VibeKonect</div>
    </td></tr>
    <tr><td style="padding:8px 32px 24px;">
      <h1 style="color:#fff;font-size:24px;margin:8px 0 16px;">${escapeHtml(opts.title)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#d8d0ee;">${bodyHtml}</div>
      ${cta}
    </td></tr>
    <tr><td style="padding:16px 32px 28px;border-top:1px solid rgba(168,85,247,0.15);font-size:12px;color:#9b91b8;text-align:center;">
      You're receiving this because you subscribed to VibeKonect updates.<br/>
      <a href="${opts.preferencesUrl}" style="color:#c084fc;">Update preferences</a> · <a href="${opts.unsubscribeUrl}" style="color:#c084fc;">Unsubscribe</a><br/>
      <span style="color:#6b6385;">© VibeKonect · <a href="${SITE}" style="color:#9b91b8;">vibekonect.com</a></span>
    </td></tr>
  </table>
</td></tr></table></body></html>`
}

async function sendOne(opts: {
  to: string; subject: string; html: string; unsubscribeUrl: string;
  resendKey: string;
}): Promise<{ ok: boolean; id?: string; error?: string; status: number }> {
  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${opts.resendKey}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      headers: {
        'List-Unsubscribe': `<${opts.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, status: res.status, error: data?.message || JSON.stringify(data) }
  return { ok: true, status: res.status, id: data?.id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return json({ error: 'Unauthorized' }, 401)

  const probe = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: claimsData } = await probe.auth.getClaims(token)
  const claims = claimsData?.claims as any
  if (!claims?.sub) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(supabaseUrl, supabaseServiceKey)
  const { data: roleRow } = await admin
    .from('user_roles').select('role').eq('user_id', claims.sub).eq('role', 'admin').maybeSingle()
  if (!roleRow) return json({ error: 'Forbidden' }, 403)

  if (!resendKey) {
    return json({ error: 'Email provider not configured (RESEND_API_KEY missing)' }, 500)
  }

  let body: any
  try { body = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }
  const { announcementId, mode, testEmail } = body ?? {}
  if (!announcementId) return json({ error: 'announcementId required' }, 400)

  const { data: ann, error: annErr } = await admin
    .from('announcements').select('*').eq('id', announcementId).maybeSingle()
  if (annErr || !ann) return json({ error: 'Announcement not found' }, 404)

  const subject = ann.title
  const buildUrls = (email: string) => ({
    unsubscribeUrl: `${SITE}/unsubscribe-notifications?email=${encodeURIComponent(email)}`,
    preferencesUrl: `${SITE}/unsubscribe-notifications?email=${encodeURIComponent(email)}&prefs=1`,
  })

  // TEST MODE: send to single email (admin's own or provided testEmail)
  if (mode === 'test') {
    const to = (testEmail || claims.email || '').toString().trim()
    if (!to) return json({ error: 'No test recipient (provide testEmail)' }, 400)
    const urls = buildUrls(to)
    const html = renderEmail({
      title: ann.title, content: ann.content,
      ctaLabel: ann.cta_label, ctaUrl: ann.cta_url,
      ...urls,
    })
    const r = await sendOne({ to, subject: `[TEST] ${subject}`, html, unsubscribeUrl: urls.unsubscribeUrl, resendKey })
    if (!r.ok) return json({ error: `Test send failed (${r.status}): ${r.error}` }, 500)
    return json({ ok: true, test: true, to, messageId: r.id })
  }

  // BROADCAST: filter audience
  const audienceKey = ann.target_audience === 'all' ? null : ann.target_audience
  const { data: subs, error: subsErr } = await admin.from('notification_subscribers')
    .select('id, email, preferences')
    .eq('is_active', true).eq('email_verified', true)
  if (subsErr) return json({ error: subsErr.message }, 500)

  const filtered = (subs ?? []).filter((s: any) => {
    if (!audienceKey) return true
    const p = s.preferences ?? {}
    return !!p[audienceKey]
  })

  await admin.from('announcements').update({
    status: 'sending', recipients_count: filtered.length,
  }).eq('id', announcementId)

  let sent = 0, failed = 0
  const BATCH = 50
  for (let i = 0; i < filtered.length; i += BATCH) {
    const batch = filtered.slice(i, i + BATCH)
    const results = await Promise.all(batch.map(async (s: any) => {
      const urls = buildUrls(s.email)
      const html = renderEmail({
        title: ann.title, content: ann.content,
        ctaLabel: ann.cta_label, ctaUrl: ann.cta_url,
        ...urls,
      })
      let attempt = 0
      while (true) {
        attempt++
        const r = await sendOne({ to: s.email, subject, html, unsubscribeUrl: urls.unsubscribeUrl, resendKey })
        if (r.ok) return { s, ok: true, id: r.id }
        // Rate-limit: backoff and retry up to 3x
        if (r.status === 429 && attempt < 3) {
          await new Promise((res) => setTimeout(res, 1000 * attempt))
          continue
        }
        return { s, ok: false, error: r.error, status: r.status }
      }
    }))

    const logRows = results.map((r: any) => ({
      announcement_id: announcementId,
      subscriber_id: r.s.id,
      recipient_email: r.s.email,
      status: r.ok ? 'sent' : 'failed',
      provider_message_id: r.id ?? null,
      error_message: r.ok ? null : (r.error ?? null),
      sent_at: r.ok ? new Date().toISOString() : null,
    }))
    await admin.from('notification_log').upsert(logRows, { onConflict: 'announcement_id,subscriber_id' })
    sent += results.filter((r: any) => r.ok).length
    failed += results.filter((r: any) => !r.ok).length

    // Gentle pacing between batches
    if (i + BATCH < filtered.length) await new Promise((r) => setTimeout(r, 500))
  }

  await admin.from('announcements').update({
    status: 'sent', sent_at: new Date().toISOString(),
  }).eq('id', announcementId)

  return json({ ok: true, sent, failed, total: filtered.length })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
