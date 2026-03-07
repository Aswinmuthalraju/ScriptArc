import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ADMIN_EMAIL } from '@/lib/constants';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const buildUserFromSession = (authUser) => ({
  id: authUser.id,
  email: authUser.email,
  name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
  role: authUser.user_metadata?.role || 'student',
  total_stars: 0,
  avatar_url: authUser.user_metadata?.avatar_url || null,
  has_special_access: false,
  isAdmin: authUser.email?.toLowerCase() === ADMIN_EMAIL,
  mentorProfile: null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Hard 2s safety timeout — loading WILL resolve no matter what
    const giveUp = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    const fetchExtendedUser = async (sessionUser) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, role, total_stars, level, is_private, avatar_id, has_special_access, created_at')
          .eq('id', sessionUser.id)
          .single();

        const base = buildUserFromSession(sessionUser);
        const profile = (!error && data) ? { ...base, ...data } : base;

        // For mentors, also fetch their application status + mentor_code
        let mentorProfile = null;
        if (profile.role === 'mentor') {
          const { data: mp } = await supabase
            .from('mentor_profiles')
            .select('id, mentor_code, status, expertise, experience_years, bio, rejection_reason, approved_at')
            .eq('user_id', sessionUser.id)
            .maybeSingle();
          mentorProfile = mp || null;
        }

        setUser({
          ...profile,
          isAdmin: sessionUser.email?.toLowerCase() === ADMIN_EMAIL,
          mentorProfile,
        });
      } catch (err) {
        setUser(buildUserFromSession(sessionUser));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Subscribe first so we don't miss events that fire before getSession resolves
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') {
          clearTimeout(giveUp);
          if (session?.user) {
            fetchExtendedUser(session.user);
          } else {
            setLoading(false);
          }
        } else if (event === 'SIGNED_IN') {
          if (session?.user) {
            fetchExtendedUser(session.user);
          } else {
            setLoading(false);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed — no need to re-fetch user profile; session is still valid
          if (mounted) setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(giveUp);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  const register = async (name, email, password, role = 'student') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role } },
    });
    if (error) throw error;
    return data.user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updates) =>
    setUser((prev) => (prev ? { ...prev, ...updates } : null));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
