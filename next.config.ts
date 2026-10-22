import type { NextConfig } from "next";

import { protectedSegmentPattern } from "./src/lib/routes";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Where uploaded files live (Cloudflare R2, docs/SCOPE.md §9.20): the bucket's
 * public address serves audio, PDFs and avatars, and its S3 endpoint receives
 * direct uploads. Read from `process.env` directly — this file loads outside
 * the app's module graph, so it cannot use `src/lib/env.ts` — and left out of
 * the policy entirely when storage is not configured.
 */
function origin(value: string | undefined) {
  try {
    return value ? new URL(value).origin : "";
  } catch {
    return "";
  }
}
const mediaOrigin = origin(process.env.R2_PUBLIC_URL);
const uploadOrigin = process.env.R2_ACCOUNT_ID
  ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : "";
const extra = (value: string) => (value ? ` ${value}` : "");

/**
 * Content Security Policy.
 *
 * `script-src` has to allow `'unsafe-inline'`: Next streams the RSC payload
 * through inline `<script>` tags, and `next/font` writes an inline `<style>`.
 * The alternative is a per-request nonce, which the framework can only inject
 * while server-rendering — it would force the public pages off static
 * generation for a policy the authenticated pages benefit from far more.
 *
 * Even so, the rest of the policy is worth having, and each line closes a real
 * door:
 *
 *   frame-ancestors  no clickjacking — this app can never be framed
 *   form-action      a posted form cannot be redirected to another origin
 *   base-uri         a <base> tag cannot re-point every relative URL
 *   object-src       no plugins, no legacy embed vectors
 *   default-src      anything not named below is same-origin only
 *   media-src        audio plays from this site or the storage bucket only
 *
 * The upgrade to a nonce-based policy is a proxy change plus accepting dynamic
 * rendering on the public routes; noted here so the decision is visible.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${extra(mediaOrigin)}`,
  `media-src 'self'${extra(mediaOrigin)}`,
  "font-src 'self' data:",
  // The dev server talks to itself over a websocket for hot reload.
  `connect-src 'self'${extra(uploadOrigin)}${isDev ? " ws: wss:" : ""}`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces with `frame-ancestors` for browsers that predate CSP 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs a camera, a microphone or a location.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Two years, subdomains included. Browsers ignore this over plain HTTP, so it
  // is harmless in development and correct the moment there is a certificate.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Announcing the framework and its version only helps somebody matching a
  // known advisory against this deployment.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /**
         * Everything behind sign-in, marked never-store.
         *
         * Next already sends `no-cache` on a dynamic route, but not `private`
         * or `no-store`, so a shared proxy is within its rights to keep a copy
         * of one member's giving and hand it to the next person through the
         * same cache. This says: not on disk, not in a shared cache, not on a
         * back-button restore.
         */
        source: `${protectedSegmentPattern()}/:path*`,
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
        ],
      },
      {
        source: protectedSegmentPattern(),
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
