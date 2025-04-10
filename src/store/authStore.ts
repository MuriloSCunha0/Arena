import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { isDemoMode } from '../utils/demoMode';

interface AuthState {
  user: any;
  loading: boolean;
  setUser: (user: any) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkDemoMode: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  
  setUser: (user) => set({ user }),
  
  checkDemoMode: () => {
    if (isDemoMode()) {
      // Em modo demo, criar um usuário fictício
      set({ 
        user: { 
          id: 'demo-user', 
          email: 'demo@example.com',
          user_metadata: {
            name: 'Usuário Demo'
          }
        }, 
        loading: false 
      });
    } else {
      // Verificar a sessão real apenas quando não estiver em modo demo
      supabase.auth.getSession().then(({ data: { session } }) => {
        set({ user: session?.user ?? null, loading: false });
      });
    }
  },
  
  signIn: async (email, password) => {
    if (isDemoMode()) {
      // Em modo demo, simular login bem-sucedido
      set({ 
        user: { 
          id: 'demo-user', 
          email, 
          user_metadata: {
            name: 'Usuário Demo'
          }
        } 
      });
      return;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    set({ user: data?.user });
  },
  
  signOut: async () => {
    if (isDemoMode()) {
      // Em modo demo, simular logout (mas na verdade não fazer logout)
      return;
    }
    
    await supabase.auth.signOut();
    set({ user: null });
  },
}));