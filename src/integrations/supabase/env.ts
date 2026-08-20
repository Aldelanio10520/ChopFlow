export function getSupabaseUrl(): string {
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    (typeof process !== "undefined"
      ? process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"]
      : undefined) ||
    ""
  );
}

export function getSupabaseAnonKey(): string {
  return (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    (typeof process !== "undefined"
      ? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["VITE_SUPABASE_ANON_KEY"] ||
        process.env["SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["SUPABASE_ANON_KEY"] ||
        process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
        process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      : undefined) ||
    ""
  );
}
