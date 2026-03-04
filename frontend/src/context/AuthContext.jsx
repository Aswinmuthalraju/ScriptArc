import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
          .select('*, avatar_id')
          .eq('id', sessionUser.id)
          .single();

        if (!error && data) {
          setUser({ ...buildUserFromSession(sessionUser), ...data });
        } else {
          setUser(buildUserFromSession(sessionUser));
        }
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
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            fetchExtendedUser(session.user);
          } else {
            setLoading(false);
          }
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
