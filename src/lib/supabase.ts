import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function readEnv() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  return { url: url.trim(), key: key.trim() };
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = readEnv();
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key);
  }
  return client;
}

export function hasSupabase(): boolean {
  const { url, key } = readEnv();
  return Boolean(url && key);
}

/** true en Vercel / producción (no se puede escribir al disco) */
export function isServerlessHost(): boolean {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    return h.endsWith(".vercel.app") || (!h.includes("localhost") && !h.startsWith("127."));
  }
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}
