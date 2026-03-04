/**
 * ScriptArc — Supabase Server Client
 *
 * Use this inside:
 *   • Server Components (async components)
 *   • Server Actions ("use server")
 *   • Route Handlers (app/api/…/route.js)
 *
 * It reads / writes cookies through Next.js `cookies()` so the
 * session token is kept in sync with the browser.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Called from a Server Component — safe to ignore when
                        // middleware is handling session refresh.
                    }
                },
            },
        }
    )
}
