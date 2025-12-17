import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/* eslint-disable react-refresh/only-export-components */

type UserRole = 'admin' | 'user';

type AuthContextType = {
  user: User | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<UserRole> => {
    console.log('auth.tsx: fetchUserRole started for userId =', userId);
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const fetchPromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<ReturnType<typeof fetchPromise>>;
      
      console.log('auth.tsx: fetchUserRole response - data =', data, 'error =', error);
      
      if (error) {
        // If table doesn't exist or user has no role, default to 'user'
        console.warn('auth.tsx: Error fetching user role (table may not exist yet):', error.message);
        return 'user';
      }
      
      const role = (data?.role as UserRole) || 'user';
      console.log('auth.tsx: fetchUserRole returning role =', role);
      return role;
    } catch (err) {
      console.warn('auth.tsx: Exception fetching user role:', err);
      return 'user';
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      console.log('auth.tsx: initializeAuth started');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('auth.tsx: session =', session?.user?.email);
        setUser(session?.user ?? null);
        if (session?.user) {
          console.log('auth.tsx: fetching user role...');
          const role = await fetchUserRole(session.user.id);
          console.log('auth.tsx: user role =', role);
          setUserRole(role);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('auth.tsx: Error initializing auth:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        console.log('auth.tsx: Setting loading to false');
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('auth.tsx: onAuthStateChange - event =', event, 'user =', session?.user?.email);
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        setUserRole(role);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    console.log('auth.tsx: signOut called');
    try {
      const { error } = await supabase.auth.signOut();
      console.log('auth.tsx: supabase.auth.signOut completed', { error });
      if (error) throw error;
      console.log('auth.tsx: signOut successful');
    } catch (err) {
      console.error('auth.tsx: signOut error:', err);
      throw err;
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <AuthContext.Provider value={{ user, userRole, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
