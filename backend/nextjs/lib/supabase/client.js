/**
 * ScriptArc — Supabase Browser Client
 *
 * Use this in Client Components ("use client") and browser-only code.
 * It reads cookies automatically via the browser and keeps the
 * session/token refreshed for you.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
}
