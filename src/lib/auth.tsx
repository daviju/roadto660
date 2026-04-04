import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
    return data as Profile | null;
  };

  useEffect(() => {
    let mounted = true;
    let initialResolved = false;

    const handleSession = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        try {
          await fetchProfile(s.user.id);
        } catch (e) {
          console.error('[Auth] Failed to fetch profile:', e);
        }
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, s) => {
        if (!mounted) return;

        if (event === 'INITIAL_SESSION') {
          initialResolved = true;
          if (!s) {
            // No session → go to login immediately (synchronous, no await)
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          } else {
            // Session exists → load profile (async)
            handleSession(s);
          }
          return;
        }

        if (event === 'SIGNED_IN') {
          handleSession(s);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (s?.user) {
            setSession(s);
            setUser(s.user);
            fetchProfile(s.user.id).catch(() => {});
          }
        }
      }
    );

    // Safety: if INITIAL_SESSION never fires (Supabase bug), fall back after 15s
    const timeout = setTimeout(() => {
      if (!mounted || initialResolved) return;
      console.warn('[Auth] INITIAL_SESSION never fired after 15s, falling back');
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (mounted && !initialResolved) handleSession(s);
      }).catch(() => {
        if (mounted && !initialResolved) {
          setLoading(false);
        }
      });
    }, 15000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/roadto660/' },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: name ? { data: { full_name: name } } : undefined,
    });
    return { error: error?.message ?? null };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/roadto660/' },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const VALID_PROFILE_COLUMNS = new Set([
    'full_name', 'avatar_url', 'monthly_income', 'pay_day', 'emergency_fund',
    'currency', 'theme', 'module_expenses', 'module_income', 'module_budgets',
    'module_timeline', 'module_motorcycles', 'module_charts', 'module_tips',
    'module_simulator', 'onboarding_completed', 'points', 'streak_days',
    'last_active_date', 'updated_at',
  ]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    // Filter to only valid DB columns to prevent Supabase 400 errors
    const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(updates)) {
      if (VALID_PROFILE_COLUMNS.has(key)) clean[key] = value;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(clean)
      .eq('id', user.id)
      .select()
      .single();
    if (error) {
      console.error('[updateProfile] Error:', error.message, clean);
    }
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
