import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Sends winner-announcement emails for a contest.
 * - Winning entrant gets the "you won" variant.
 * - All other approved entrants get the "results" variant.
 * Caller must be an authenticated admin.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verify caller is admin
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

  let body: { contestId?: string; winnerEntryId?: string } = {}
  try { body = await req.json() } catch {}
  const { contestId, winnerEntryId } = body
  if (!contestId || !winnerEntryId) {
    return new Response(JSON.stringify({ error: 'contestId and winnerEntryId required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: contest } = await admin
    .from('contests').select('title, prize_description').eq('id', contestId).maybeSingle()
  const { data: entries } = await admin
    .from('contest_entries').select('id, user_id, artist_name')
    .eq('contest_id', contestId).in('status', ['approved', 'winner'])

  if (!entries?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const winner = entries.find((e) => e.id === winnerEntryId)
  const winnerName = winner?.artist_name || 'TBA'
  const contestTitle = contest?.title || ''
  const prize = contest?.prize_description || ''

  let sent = 0
  for (const e of entries) {
    const { data: u } = await admin.auth.admin.getUserById(e.user_id)
    const email = u?.user?.email
    if (!email) continue
    const isWinner = e.id === winnerEntryId
    const { error } = await admin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'competition-winner-announcement',
        recipientEmail: email,
        idempotencyKey: `comp-winner-${contestId}-${e.id}`,
        templateData: {
          recipientName: e.artist_name,
          contestTitle,
          isWinner,
          winnerName,
          prize,
        },
      },
    })
    if (!error) sent++
    else console.warn('send failed', email, error)
  }

  return new Response(JSON.stringify({ ok: true, sent, total: entries.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})