import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error_description || j.error || 'token_refresh_failed');
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin.from('user_roles').select('role').eq('user_id', claims.claims.sub).eq('role', 'admin').maybeSingle();
    if (!roleRow) return json({ error: 'Forbidden' }, 403);

    const { beat_id } = await req.json();
    if (!beat_id) return json({ error: 'beat_id required' }, 400);

    const { data: beat, error: bErr } = await admin.from('beats').select('*').eq('id', beat_id).maybeSingle();
    if (bErr || !beat) return json({ error: 'Beat not found' }, 404);
    if (!beat.audio_url) return json({ error: 'Beat has no audio_url' }, 400);

    await admin.from('beats').update({ youtube_upload_status: 'uploading', youtube_upload_error: null }).eq('id', beat_id);

    const { data: tokenRow } = await admin.from('admin_settings').select('value').eq('key', 'youtube_refresh_token').maybeSingle();
    if (!tokenRow?.value) {
      await admin.from('beats').update({ youtube_upload_status: 'failed', youtube_upload_error: 'YouTube not connected' }).eq('id', beat_id);
      return json({ error: 'YouTube not connected' }, 400);
    }

    const accessToken = await getAccessToken(tokenRow.value);

    // Fetch audio file
    const audioRes = await fetch(beat.audio_url);
    if (!audioRes.ok) throw new Error('Failed to fetch audio file');
    const audioBlob = await audioRes.blob();

    const metadata = {
      snippet: {
        title: `${beat.title} | VibeKonect`,
        description: `Produced by LocBeatx. Download this beat at vibekonect.com\n\nGenre: ${beat.genre} | BPM: ${beat.bpm} | Key: ${beat.key}`,
        tags: ['beat', 'hiphop', 'trap', 'producer', 'LocBeatx', beat.genre].filter(Boolean),
      },
      status: { privacyStatus: 'unlisted', selfDeclaredMadeForKids: false },
    };

    // Multipart upload
    const boundary = '----vk' + crypto.randomUUID();
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${audioBlob.type || 'audio/mpeg'}\r\n\r\n`
    );
    const tail = enc.encode(`\r\n--${boundary}--\r\n`);
    const audioBuf = new Uint8Array(await audioBlob.arrayBuffer());
    const body = new Uint8Array(head.length + audioBuf.length + tail.length);
    body.set(head, 0); body.set(audioBuf, head.length); body.set(tail, head.length + audioBuf.length);

    const upRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    const upJson = await upRes.json();
    if (!upRes.ok) {
      const msg = upJson?.error?.message || 'YouTube upload failed';
      await admin.from('beats').update({ youtube_upload_status: 'failed', youtube_upload_error: msg }).eq('id', beat_id);
      return json({ error: msg, details: upJson }, 500);
    }

    const videoId = upJson.id as string;

    // Optional: upload thumbnail
    if (beat.cover_image_url) {
      try {
        const tRes = await fetch(beat.cover_image_url);
        if (tRes.ok) {
          const tBlob = await tRes.blob();
          await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': tBlob.type || 'image/jpeg' },
            body: new Uint8Array(await tBlob.arrayBuffer()),
          });
        }
      } catch { /* thumbnail failure is non-fatal */ }
    }

    await admin.from('beats').update({
      youtube_video_id: videoId,
      youtube_upload_status: 'success',
      youtube_upload_error: null,
    }).eq('id', beat_id);

    return json({ ok: true, video_id: videoId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});