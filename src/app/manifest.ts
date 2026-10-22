import type { MetadataRoute } from "next";

/**
 * The installable app (docs/SCOPE.md §9.22): "KMMI Portal" opening on the
 * dashboard, in its own window, in the church's blue.
 *
 * Deliberately no service worker and no offline cache: the portal holds
 * people's giving, attendance and messages, and a cache on a shared phone is
 * the wrong place for them. If one is added later it must not cache
 * /dashboard, /finance or any other private route (see src/lib/routes.ts).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KMMI Portal",
    short_name: "KMMI",
    description: "The member portal of Kingdom Manifest Ministries International.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a3fcc",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
