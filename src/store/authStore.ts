import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any;
  loading: boolean;
  
  setUser: (user: any) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (email: string, password: string, userData: UserData) => Promise<void>;
}

interface UserData {
  full_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
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
  
  signUp: async (email, password, userData) => {
    // Registrar o usuário com email e senha
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData, // Dados adicionais do usuário salvos no metadados do auth
      }
    });
    
    if (authError) throw authError;
    
    // Se estivermos usando uma tabela personalizada para os dados do usuário
    // também podemos inserir os dados completos lá
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([
          { 
            user_id: authData.user.id,
            full_name: userData.full_name,
            phone: userData.phone,
            cpf: userData.cpf,
            birth_date: userData.birth_date
          }
        ]);
        
      if (profileError) throw profileError;
    }
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