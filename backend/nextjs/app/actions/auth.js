/**
 * ScriptArc — Authentication Server Actions
 *
 * These run on the server and are invoked from Client Components
 * via form actions or programmatic calls.
 *
 * Supabase handles all JWT creation, refresh, and storage
 * automatically — no manual token generation needed.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────
// Email / Password Sign Up
// ─────────────────────────────────────────────
export async function signup(formData) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
        email: formData.get('email'),
        password: formData.get('password'),
        options: {
            data: {
                name: formData.get('name'),   // stored in raw_user_meta_data
            },
        },
    })

    if (error) {
        redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

// ─────────────────────────────────────────────
// Email / Password Login
// ─────────────────────────────────────────────
export async function login(formData) {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email'),
        password: formData.get('password'),
    })

    if (error) {
        redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
}

// ─────────────────────────────────────────────
// Google OAuth (optional)
// ─────────────────────────────────────────────
export async function signInWithGoogle() {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    })

    if (error) {
        redirect(`/login?message=${encodeURIComponent(error.message)}`)
    }

    if (data.url) {
        redirect(data.url)
    }
}

// ─────────────────────────────────────────────
// Retrieve current session / JWT
// ─────────────────────────────────────────────
export async function getSession() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session   // session.access_token is the JWT
}

// ─────────────────────────────────────────────
// Get the authenticated user (verified server-side)
// ─────────────────────────────────────────────
export async function getUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}
