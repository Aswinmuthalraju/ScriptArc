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
                    const pendingRole = localStorage.getItem('pendingRole');
                    if (pendingRole) {
                        localStorage.removeItem('pendingRole');
                        await supabase.auth.updateUser({ data: { role: pendingRole } });
                    }
                    if (mounted) navigate('/dashboard', { replace: true });
                } else {
                    // Fallback if no session was established
                    if (mounted) navigate('/login', { replace: true });
                }
            } catch (err) {
                console.error('Auth Callback Error:', err);
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
