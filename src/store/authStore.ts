import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// User role types
export type UserRole = 'admin' | 'participante';

interface AuthState {
  user: any;
  loading: boolean;
  userRole: UserRole | null;
  
  setUser: (user: any) => void;
  setUserRole: (role: UserRole | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (email: string, password: string, userData: UserData, role?: UserRole) => Promise<void>;
  checkUserRole: (userId: string) => Promise<UserRole | null>;
}

interface UserData {
  full_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  userRole: null,
  
  setUser: (user) => set({ user, loading: false }),
  
  setUserRole: (role) => set({ userRole: role }),  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Get current session to determine the user role
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log('Login successful, checking user role for:', session.user.id);
      console.log('User metadata:', session.user.user_metadata);
      
      // First try to get role from user metadata (faster)
      if (session.user.user_metadata?.role) {
        const roleFromMetadata = session.user.user_metadata.role as UserRole;
        console.log('Setting user role from metadata:', roleFromMetadata);
        set({ userRole: roleFromMetadata });
      } else {
        // Fall back to database check if metadata doesn't have role
        const role = await get().checkUserRole(session.user.id);
        console.log('Role from database check:', role);
        
        // Se não encontrou um role válido, isso significa que o usuário não está em nenhuma tabela
        if (!role) {
          // Fazer logout automático se o usuário não for nem admin nem participante
          await supabase.auth.signOut();
          throw new Error('Usuário não autorizado. Por favor, contate o administrador do sistema.');
        }
        
        set({ userRole: role });
      }
    }
  },signUp: async (email, password, userData, role = 'participante') => {
    // Registrar o usuário com email e senha
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...userData,
          role // Adicionamos o papel (role) aos metadados do usuário
        }
      }
    });
    
    if (authError) throw authError;
    
    // Inserir dados na tabela apropriada dependendo do tipo de usuário
    if (authData.user) {
      if (role === 'participante') {
        // Inserir na tabela 'users' para usuários regulares
        const { error: userError } = await supabase
          .from('users')
          .insert([
            { 
              id: authData.user.id,
              email: email,
              full_name: userData.full_name,
              phone: userData.phone,
              cpf: userData.cpf,
              birth_date: userData.birth_date,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
          
        if (userError) {
          console.error('Error inserting user data:', userError);
          throw userError;
        }
      } else if (role === 'admin') {
        // Para administradores, também inserimos na tabela admin_users para facilitar consultas
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert([
            {
              user_id: authData.user.id,
              role: 'admin',
              created_at: new Date().toISOString()
            }
          ]);
          
        if (adminError) {
          console.error('Error inserting admin data:', adminError);
          throw adminError;
        }
        
        console.log('Admin user created with role in user metadata and admin_users table');
      }
      
      // Define o papel (role) do usuário no estado
      set({ userRole: role });
      
      // Update the user object in state to include the new user
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession?.session) {
        set({ user: currentSession.session.user });
      }
    }
  },
    signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, loading: false, userRole: null });
  },
  
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    
    if (error) throw error;
  },  checkUserRole: async (userId) => {
    try {
      // Check user metadata in auth.users first to determine role
      try {
        const { data: userData, error: userDataError } = await supabase.auth.getUser();
        
        if (!userDataError && userData?.user) {
          // Check role in user metadata
          const userMetadata = userData.user.user_metadata;
          console.log('User metadata:', userMetadata);
          if (userMetadata && userMetadata.role === 'admin') {
            const role: UserRole = 'admin';
            set({ userRole: role });
            return role;
          }
        }
      } catch (metadataError) {
        console.warn('Error checking user metadata:', metadataError);
      }
      
      // If checking metadata fails or role is not admin, check the users table
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (!userError && userData) {
          const role: UserRole = 'participante';
          set({ userRole: role });
          return role;
        }
      } catch (userError) {
        console.warn('Error checking user table:', userError);
      }
      
      // If we still don't have a role, try to look for other clues
      try {
        // Check if user is in auth.users but hasn't been placed in a specific table yet
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
          // Default to participante if we have a valid auth user but no specific role
          const defaultRole: UserRole = 'participante';
          console.log('User found in auth but no specific role detected, using default:', defaultRole);
          set({ userRole: defaultRole });
          return defaultRole;
        }
      } catch (authError) {
        console.warn('Error checking auth.user:', authError);
      }
      
      console.warn('No user role could be determined');
      return null;
    } catch (error) {
      console.error('Error checking user role:', error);
      return null;
    }
  }
}));