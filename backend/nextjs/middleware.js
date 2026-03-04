/**
 * ScriptArc — Next.js Middleware
 *
 * Runs on EVERY matched request before it reaches a page / route handler.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session token (keeps cookies in sync).
 *   2. Redirect unauthenticated users away from protected routes.
 *   3. Redirect non-mentor users away from /mentor routes.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Mirror cookies on the request so downstream handlers see them
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    // Rebuild the response so the browser receives the updated cookies
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // ──────────────────────────────────────────
    // 1. Session refresh (MUST come first)
    //    getUser() also refreshes expired tokens.
    // ──────────────────────────────────────────
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const url = request.nextUrl.clone()
    const isDashboard = url.pathname.startsWith('/dashboard')
    const isMentorPath = url.pathname.startsWith('/mentor')

    // ──────────────────────────────────────────
    // 2. Redirect unauthenticated users
    // ──────────────────────────────────────────
    if (!user && (isDashboard || isMentorPath)) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // ──────────────────────────────────────────
    // 3. Mentor-only route guard
    // ──────────────────────────────────────────
    if (user && isMentorPath) {
        const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'mentor') {
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}

// Only run middleware on routes that need it
export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         *   - _next/static  (static assets)
         *   - _next/image   (image optimisation)
         *   - favicon.ico
         *   - Common image extensions
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
