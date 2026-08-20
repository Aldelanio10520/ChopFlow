// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type Plugin } from "vite";

/** Map Vercel/Supabase integration names onto the VITE_ keys the browser bundle needs. */
function supabaseEnvAlias(): Plugin {
  return {
    name: "supabase-env-alias",
    config(_config, { mode }) {
      const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
      const url = env["VITE_SUPABASE_URL"] || env["SUPABASE_URL"] || env["NEXT_PUBLIC_SUPABASE_URL"] || "";
      const key =
        env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        env["VITE_SUPABASE_ANON_KEY"] ||
        env["SUPABASE_PUBLISHABLE_KEY"] ||
        env["SUPABASE_ANON_KEY"] ||
        env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
        env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
        "";
      if (!url || !key) return {};
      return {
        define: {
          "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
          "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
          "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(key),
        },
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Pin Vercel output when deploying outside Lovable. Lovable Cloud still uses
  // LOVABLE_NITRO_PRESET (Cloudflare) and ignores this override.
  nitro: {
    preset: "vercel",
  },
  plugins: [supabaseEnvAlias()],
});
