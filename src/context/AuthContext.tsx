import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type SignUpResult =
  | 'signed-in'
  | 'confirmation-required'
  | 'already-confirmed'
  | 'already-pending'
  | 'already-exists';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError('Supabase belum dikonfigurasi. Isi file .env.local terlebih dahulu.');
      return;
    }
    void supabase.auth.getSession().then(({ data, error: result }) => {
      if (result) setError(result.message);
      setSession(data.session);
      setLoading(false);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Could not restore your session.');
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase belum dikonfigurasi.');
    setError('');
    const { error: result } = await supabase.auth.signInWithPassword({ email, password });
    if (result) {
      if (result.code === 'email_not_confirmed') {
        throw new Error('Please confirm your email before logging in.');
      }
      throw result;
    }
    window.history.replaceState(null, '', '#/dashboard');
  }

  async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase belum dikonfigurasi.');
    setError('');
    const { data, error: result } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/#/login`
      }
    });
    if (result) throw result;
    if (data.session) return 'signed-in';

    // Checking a duplicate email must not create a session in this browser.
    if (data.user?.identities && data.user.identities.length === 0) {
      return 'already-exists';
    }

    return 'confirmation-required';
  }

  async function signOut() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  }

  return <AuthContext.Provider value={{ session, user: session?.user || null, loading, error, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
