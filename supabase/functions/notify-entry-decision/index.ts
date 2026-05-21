import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Notify a contest entrant of an approval/rejection decision.
 * Admin-only.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const admin = createClient(supabaseUrl, serviceKey)
  const { data: roleRow } = await admin
    .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
  if (!roleRow) {
    return new Response(JSON.stringify({ error: 'Admin only' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { entryId?: string; decision?: 'approved' | 'rejected'; reason?: string } = {}
  try { body = await req.json() } catch {}
  const { entryId, decision, reason } = body
  if (!entryId || (decision !== 'approved' && decision !== 'rejected')) {
    return new Response(JSON.stringify({ error: 'entryId and decision required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: entry } = await admin
    .from('contest_entries')
    .select('id, user_id, artist_name, contest_id')
    .eq('id', entryId).maybeSingle()
  if (!entry) {
    return new Response(JSON.stringify({ error: 'Entry not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: contest } = await admin
    .from('contests').select('title').eq('id', entry.contest_id).maybeSingle()

  const { data: u } = await admin.auth.admin.getUserById(entry.user_id)
  const email = u?.user?.email
  if (!email) {
    return new Response(JSON.stringify({ ok: false, reason: 'no_email' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error } = await admin.functions.invoke('send-transactional-email', {
    body: {
      templateName: 'competition-entry-decision',
      recipientEmail: email,
      idempotencyKey: `comp-decision-${entry.id}-${decision}`,
      templateData: {
        artistName: entry.artist_name,
        contestTitle: contest?.title || '',
        decision,
        reason: reason || undefined,
        entryId: entry.id,
      },
    },
  })
  if (error) console.warn('send failed', email, error)

  return new Response(JSON.stringify({ ok: true, sentTo: email }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})