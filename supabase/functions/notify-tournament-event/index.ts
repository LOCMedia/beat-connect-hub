import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EventType =
  | 'beat_approved'
  | 'artist_qualified'
  | 'battle_live'
  | 'advanced'
  | 'champion'
  | 'beat_won'

const TEMPLATE_BY_EVENT: Record<EventType, string> = {
  beat_approved: 'tournament-beat-approved',
  artist_qualified: 'tournament-artist-qualified',
  battle_live: 'tournament-battle-live',
  advanced: 'tournament-advanced',
  champion: 'tournament-champion',
  beat_won: 'tournament-beat-won',
}

const TITLE_BY_EVENT: Record<EventType, string> = {
  beat_approved: '🎛️ Your beat is in the pool',
  artist_qualified: "🔥 You've qualified",
  battle_live: '🥊 Your battle is live',
  advanced: '🚀 You advanced',
  champion: '👑 You won the tournament',
  beat_won: '🏆 Your beat won',
}

/**
 * Single entry point that fans out a tournament event to in-app + email.
 * Body: { event, userIds: string[], tournamentId?, templateData?, link? }
 * Caller must be admin (or service role).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Auth: admin or service role
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

  let body: any = {}
  try { body = await req.json() } catch {}
  const { event, userIds, tournamentId, templateData = {}, link } = body as {
    event: EventType; userIds: string[]; tournamentId?: string; templateData?: Record<string, any>; link?: string
  }

  if (!event || !TEMPLATE_BY_EVENT[event]) {
    return new Response(JSON.stringify({ error: 'Invalid event' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!Array.isArray(userIds) || !userIds.length) {
    return new Response(JSON.stringify({ error: 'userIds required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const templateName = TEMPLATE_BY_EVENT[event]
  const title = TITLE_BY_EVENT[event]
  let inApp = 0
  let emailed = 0
  let failed = 0

  for (const userId of userIds) {
    // 1) In-app notification
    try {
      await admin.from('in_app_notifications').insert({
        user_id: userId,
        type: `tournament_${event}`,
        title,
        message: templateData.message || null,
        link: link || null,
        metadata: { tournamentId, event, ...templateData },
      })
      inApp++
    } catch (e) {
      failed++
    }

    // 2) Email — look up email
    try {
      const { data: u } = await admin.auth.admin.getUserById(userId)
      const email = u?.user?.email
      if (!email) continue
      const idemSeed = tournamentId || 'no-t'
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName,
          recipientEmail: email,
          idempotencyKey: `${event}-${idemSeed}-${userId}-${templateData.battleId || templateData.round || ''}`,
          templateData: { ...templateData, link },
        },
      })
      emailed++
    } catch (e) {
      failed++
    }
  }

  return new Response(JSON.stringify({ ok: true, inApp, emailed, failed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})