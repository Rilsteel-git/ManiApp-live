import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const NATIVE_AUTH_CALLBACK = 'com.rilsteel.maniapp://login-callback';

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
    const client = supabase;
    void client.auth.getSession().then(({ data, error: result }) => {
      if (result) setError(result.message);
      setSession(data.session);
      setLoading(false);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Could not restore your session.');
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));

    let disposed = false;
    const handleNativeAuthUrl = async (url: string) => {
      try {
        const callback = new URL(url);
        const code = callback.searchParams.get('code');
        const hashParams = new URLSearchParams(callback.hash.slice(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (sessionError) throw sessionError;
        } else {
          const callbackError = hashParams.get('error_description') || callback.searchParams.get('error_description');
          if (callbackError) throw new Error(callbackError);
        }

        if (!disposed) window.history.replaceState(null, '', '#/login');
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : 'Could not complete email confirmation.');
      }
    };

    let removeUrlListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const urlListener = App.addListener('appUrlOpen', ({ url }) => {
        void handleNativeAuthUrl(url);
      });
      void urlListener.then((handle) => {
        if (disposed) void handle.remove();
        else removeUrlListener = () => { void handle.remove(); };
      });
      void App.getLaunchUrl().then((launch) => {
        if (launch?.url) void handleNativeAuthUrl(launch.url);
      });
    }

    return () => {
      disposed = true;
      removeUrlListener?.();
      listener.subscription.unsubscribe();
    };
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
        emailRedirectTo: Capacitor.isNativePlatform()
          ? NATIVE_AUTH_CALLBACK
          : `${window.location.origin}/#/login`
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
