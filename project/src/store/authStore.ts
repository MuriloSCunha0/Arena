import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any;
  loading: boolean;
  
  setUser: (user: any) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user, loading: false }),
  
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, loading: false });
  },
  
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    
    if (error) throw error;
  }
}));