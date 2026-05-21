# Security Findings — Probely Scan Response

## ✅ Finding 1: Missing Content Security Policy (CSP)
**Fixed.** Added `public/_headers` with a strict CSP allowing only required origins (Supabase, Stripe, Frankfurter FX, Pollinations, ipapi). Deployed via Lovable static hosting headers.

## ✅ Finding 2: Missing X-Frame-Options
**Fixed.** `X-Frame-Options: DENY` and `frame-ancestors 'none'` set in `public/_headers`. Site cannot be embedded in iframes.

## ℹ️ Finding 3: Cookie without HttpOnly flag — **False positive**
VibeKonect uses Supabase Auth in **client-side SPA mode**, which stores the session in `localStorage` (see `src/integrations/supabase/client.ts`: `storage: localStorage`). No authentication cookies are set by the application.

The cookies Probely flagged are non-sensitive (e.g. analytics/preferences such as `vk:currency`). They contain no auth tokens or PII, so HttpOnly is not applicable — the SPA needs to read them from JS.

If we later move to SSR, we would switch to Supabase's `@supabase/ssr` package which sets `HttpOnly; Secure; SameSite=Lax` cookies by default.

## ℹ️ Finding 4: Weak cipher suites — **Infrastructure (Lovable hosting)**
TLS termination happens at Lovable's edge/CDN, not in application code. We cannot configure cipher suites from the project. Lovable's hosting already enforces TLS 1.2+ with modern ECDHE/GCM/CHACHA20 ciphers on `*.lovable.app` and custom domains.

If Probely still flags legacy ciphers on `vibekonect.com`, this is a shared-infrastructure finding to raise with Lovable support. Risk is **low** for this app: no card data is processed in-app (Stripe handles PCI scope), and HSTS (`max-age=63072000; includeSubDomains; preload`) is enforced via headers.

## Verification
After publishing, run:
```
curl -I https://vibekonect.com
```
Expect: `Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`.

## ℹ️ Probely: extra ports 8080 / 8443 — **False positive (Cloudflare edge)**

Probely flagged `http://www.vibekonect.com:8080` and `https://vibekonect.com:8443` as additional open assets. Verified 2026-05-01:

- Both ports respond with `server: cloudflare` and a `cf-ray` header — they are the **Cloudflare edge**, not a separate origin or service.
- Cloudflare opens a fixed set of alternate HTTP/HTTPS ports on every proxied zone by design: HTTP on 80/8080/8880/2052/2082/2086/2095 and HTTPS on 443/2053/2083/2087/2096/8443. See <https://developers.cloudflare.com/fundamentals/reference/network-ports/>.
- Port **8443** terminates TLS at the same Cloudflare edge as 443 and serves the identical SPA bundle behind the same WAF, HSTS, and security headers.
- Port **8080** issues a `301` redirect to HTTPS, mirroring port 80 behavior. No plaintext content is served.
- TLS 1.0 / 1.1 are disabled platform-wide on Cloudflare; only TLS 1.2 and 1.3 are negotiated.

**No additional attack surface vs. port 443.** Cannot be disabled from the Lovable project — these ports are opened globally by Cloudflare's edge. If full control is required, block via a Cloudflare WAF custom rule on the zone owner's account: `(cf.edge.server_port in {8080 8443 2052 2053 2082 2083 2086 2087 2095 2096 8880}) → Block`.

**Recommended action:** restrict Probely scan scope to `https://vibekonect.com` and `https://www.vibekonect.com` (port 443) and mark the alternate-port findings as out of scope.