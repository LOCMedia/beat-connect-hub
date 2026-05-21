const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowlist of origins permitted as OAuth return targets. Prevents open redirects.
const ALLOWED_RETURN_ORIGINS = new Set([
  'https://vibekonect.com',
  'https://www.vibekonect.com',
  'https://beatflow-connect.lovable.app',
  'https://id-preview--10481b34-bab4-4b56-8a73-a6078815d88f.lovable.app',
]);

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!clientId || !supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Missing GOOGLE_CLIENT_ID or SUPABASE_URL' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const redirectUri = `${supabaseUrl}/functions/v1/youtube-callback`;
  const url = new URL(req.url);
  const rawReturnTo = url.searchParams.get('return_to') || '';
  let safeReturnTo = '';
  if (rawReturnTo) {
    try {
      const parsed = new URL(rawReturnTo);
      if (ALLOWED_RETURN_ORIGINS.has(parsed.origin)) {
        safeReturnTo = parsed.toString();
      }
    } catch {
      // ignore invalid URLs; fall through to default redirect
    }
  }
  const state = btoa(JSON.stringify({ return_to: safeReturnTo, t: Date.now() }));

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.upload');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  return Response.redirect(authUrl.toString(), 302);
});