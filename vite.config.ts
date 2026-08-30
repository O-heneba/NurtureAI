// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        outDir: ".output/public",
        includeAssets: ["favicon.ico", "robots.txt"],
        manifest: {
          name: "NurtureAI Community Health Platform",
          short_name: "NurtureAI",
          description: "Community health tools and local AI for CHPS workers in Ghana.",
          start_url: "/",
          display: "standalone",
          theme_color: "#0f766e",
          background_color: "#f8fafc",
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: "",
          globPatterns: [],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/knowledge/"),
              handler: "CacheFirst",
              options: {
                cacheName: "nurture-knowledge-v1",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                request.destination === "document" &&
                (url.pathname === "/" || url.pathname === "/dev/ai"),
              handler: "NetworkFirst",
              options: {
                cacheName: "nurture-app-shell-v1",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                url.pathname.startsWith("/assets/") ||
                ["script", "style", "font", "image", "worker"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "nurture-static-assets-v1",
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
