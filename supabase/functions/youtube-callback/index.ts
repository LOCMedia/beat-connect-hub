import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const ALLOWED_RETURN_ORIGINS = new Set([
  'https://vibekonect.com',
  'https://www.vibekonect.com',
  'https://beatflow-connect.lovable.app',
  'https://id-preview--10481b34-bab4-4b56-8a73-a6078815d88f.lovable.app',
]);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state') || '';
  const error = url.searchParams.get('error');

  let returnTo = '';
  try {
    const decoded = JSON.parse(atob(stateRaw));
    if (decoded?.return_to) returnTo = String(decoded.return_to);
  } catch { /* noop */ }

  let origin = 'https://vibekonect.com';
  if (returnTo.startsWith('http')) {
    try {
      const candidate = new URL(returnTo).origin;
      if (ALLOWED_RETURN_ORIGINS.has(candidate)) origin = candidate;
    } catch { /* noop */ }
  }
  const finalRedirect = (status: 'success' | 'error', msg?: string) => {
    const u = new URL('/admin/settings', origin);
    u.searchParams.set('youtube', status);
    if (msg) u.searchParams.set('msg', msg);
    return Response.redirect(u.toString(), 302);
  };

  if (error) return finalRedirect('error', error);
  if (!code) return finalRedirect('error', 'missing_code');

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const redirectUri = `${supabaseUrl}/functions/v1/youtube-callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.refresh_token) {
      return finalRedirect('error', tokenJson.error || 'no_refresh_token');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error: upErr } = await supabase
      .from('admin_settings')
      .upsert({ key: 'youtube_refresh_token', value: tokenJson.refresh_token, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (upErr) return finalRedirect('error', 'store_failed');

    return finalRedirect('success');
  } catch (e) {
    return finalRedirect('error', (e as Error).message);
  }
});