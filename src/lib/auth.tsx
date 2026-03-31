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
    let resolved = false;

    const resolve = async (s: Session | null) => {
      if (!mounted || resolved) return;
      resolved = true;
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

    // Primary: onAuthStateChange fires INITIAL_SESSION immediately from localStorage cache
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') {
          await resolve(s);
        } else if (event === 'SIGNED_IN') {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) {
            try { await fetchProfile(s.user.id); } catch (e) { /* ignore */ }
          }
          if (mounted) setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          if (mounted) setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) {
            try { await fetchProfile(s.user.id); } catch (e) { /* ignore */ }
          }
        }
      }
    );

    // Safety timeout at 15s: if INITIAL_SESSION never fired, try getSession() once
    const timeout = setTimeout(async () => {
      if (!mounted || resolved) return;
      console.warn('[Auth] INITIAL_SESSION did not fire after 15s, falling back to getSession()');
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        await resolve(s);
      } catch (e) {
        console.error('[Auth] getSession fallback failed:', e);
        await resolve(null);
      }
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

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) {
      console.error('[updateProfile] Error:', error.message, updates);
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
