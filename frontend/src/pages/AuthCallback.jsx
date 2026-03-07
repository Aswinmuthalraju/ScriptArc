import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        const handleCallback = async () => {
            try {
                // Exchange the fragment for a session if coming from OAuth
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    throw error;
                }

                if (data?.session) {
                    const user = data.session.user;
                    const authAction = localStorage.getItem('googleAuthAction');
                    const pendingRole = localStorage.getItem('pendingRole');

                    // Check if this is a brand new user (created within the last 5 seconds)
                    const isNewUser = new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime() < 5000;

                    if (authAction === 'login') {
                        if (isNewUser || user.user_metadata?.is_ghost) {
                            // User tried to log in but they don't have an account
                            if (isNewUser) {
                                // Mark them as a ghost so future login attempts also fail until they properly register
                                await supabase.auth.updateUser({ data: { is_ghost: true } });
                            }
                            await supabase.auth.signOut();
                            localStorage.removeItem('googleAuthAction');
                            toast.error('Account not found. Please sign up first.');
                            if (mounted) navigate('/register', { replace: true });
                            return;
                        }

                        // Existing user login — check role for proper redirect
                        localStorage.removeItem('googleAuthAction');
                        const { data: userData } = await supabase
                            .from('users').select('role').eq('id', user.id).maybeSingle();

                        if (userData?.role === 'mentor') {
                            const { data: mp } = await supabase
                                .from('mentor_profiles').select('status').eq('user_id', user.id).maybeSingle();
                            if (mounted) navigate(mp?.status === 'approved' ? '/mentor' : '/mentor/pending', { replace: true });
                        } else {
                            if (mounted) navigate('/dashboard', { replace: true });
                        }
                        return;
                    }

                    if (authAction === 'register' || pendingRole || user.user_metadata?.is_ghost) {
                        // User went through the sign-up flow, so finalize it.
                        const roleToSet = pendingRole || 'student';
                        await supabase.auth.updateUser({ data: { role: roleToSet, is_ghost: null } });

                        // If registering as a mentor, create the mentor_profiles application row
                        if (roleToSet === 'mentor') {
                            try {
                                const mentorDataStr = localStorage.getItem('pendingMentorData');
                                const mentorData = mentorDataStr ? JSON.parse(mentorDataStr) : {};
                                await supabase.from('mentor_profiles').insert({
                                    user_id: user.id,
                                    expertise: mentorData.expertise?.trim() || null,
                                    experience_years: mentorData.experience_years ? parseInt(mentorData.experience_years) : null,
                                    bio: mentorData.bio?.trim() || null,
                                    linkedin_url: mentorData.linkedin?.trim() || null,
                                    status: 'pending',
                                });
                            } catch {
                                // Non-critical if profile already exists (23505 duplicate)
                            }
                            localStorage.removeItem('pendingMentorData');
                        }

                        localStorage.removeItem('pendingRole');
                        localStorage.removeItem('googleAuthAction');

                        if (roleToSet === 'mentor') {
                            toast.success('Application submitted! Awaiting admin approval.');
                            if (mounted) navigate('/mentor/pending', { replace: true });
                        } else {
                            toast.success('Account created successfully!');
                            if (mounted) navigate('/dashboard', { replace: true });
                        }
                        return;
                    }

                    // Fallback: no authAction — just navigate based on role
                    localStorage.removeItem('googleAuthAction');
                    localStorage.removeItem('pendingRole');
                    localStorage.removeItem('pendingMentorData');
                    if (mounted) navigate('/dashboard', { replace: true });
                } else {
                    // Fallback if no session was established
                    if (mounted) navigate('/login', { replace: true });
                }
            } catch (err) {
                if (process.env.NODE_ENV !== 'production') console.error('Auth Callback Error:', err);
                if (mounted) {
                    setError(err.message || 'Authentication failed');
                    toast.error('Authentication failed. Please try again.');
                    navigate('/login', { replace: true });
                }
            }
        };

        handleCallback();

        return () => {
            mounted = false;
        };
    }, [navigate]);

    if (error) {
        return null; // Will redirect anyway
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center max-w-sm text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                <h2 className="text-2xl font-outfit text-foreground mb-2">Completing Sign In...</h2>
                <p className="text-text-secondary">Please wait while we securely log you in to ScriptArc.</p>
            </div>
        </div>
    );
};

export default AuthCallback;
