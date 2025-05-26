import { create } from 'zustand';
import { supabase, tratarErroSupabase } from '../lib/supabase';

// User role types based on the roles used in app_metadata.roles
export type UserRole = 'admin' | 'organizer' | 'participante';

interface AuthState {
  user: any;
  loading: boolean;
  userRole: UserRole | null;
  
  setUser: (user: any) => void;
  setUserRole: (role: UserRole | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signUp: (email: string, password: string, userData: UserData, role: UserRole) => Promise<void>;
  checkUserRole: (userId: string) => Promise<UserRole | null>;
}

export type UserData = {
  full_name: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  // outros campos opcionais...
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  userRole: null,
  
  setUser: (user) => set({ user, loading: false }),
  
  setUserRole: (role) => set({ userRole: role }),
  
  signIn: async (email, password) => {
    console.log('=== Attempting sign in for:', email, '===');

    try {
      // 1. Consultar a tabela users no esquema public
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, password, app_metadata, user_metadata')
        .eq('email', email)
        .maybeSingle();

      if (userError) {
        console.error('❌ Error querying users table:', userError);      throw new Error('Erro ao consultar a tabela de usuários.');
      }

      if (!userData) {
        console.error('❌ Usuário não encontrado na tabela de usuários');
        throw new Error('Usuário não encontrado.');
      }      // 2. Validar a senha (substitua por uma função de hash real, se necessário)
      const isPasswordValid = password === userData.password; // Substitua por validação de hash
      if (!isPasswordValid) {
        console.error('❌ Senha inválida');
        throw new Error('Senha inválida.');
      }

      console.log('✅ Login successful for user ID:', userData.id);

      // 3. Determinar o papel do usuário baseado em app_metadata.roles ou app_metadata.role
      let userRole: UserRole = 'participante';
      const appMeta = userData.app_metadata || {};
      
      // Verificar app_metadata.roles (array)
      if (appMeta.roles && Array.isArray(appMeta.roles)) {
        if (appMeta.roles.includes('admin')) {
          userRole = 'admin';
        } else if (appMeta.roles.includes('organizer')) {
          userRole = 'organizer';
        }
      } 
      // Verificar app_metadata.role (string)
      else if (appMeta.role && typeof appMeta.role === 'string') {
        if (appMeta.role === 'admin') {
          userRole = 'admin';
        } else if (appMeta.role === 'organizer') {
          userRole = 'organizer';
        }
      }
      // Verificar user_metadata.role (compatibilidade)
      else if (userData.user_metadata?.role) {
        if (userData.user_metadata.role === 'admin') {
          userRole = 'admin';
        } else if (userData.user_metadata.role === 'organizer') {
          userRole = 'organizer';
        }
      }

      // 4. Atualizar o estado com os dados do usuário
      set({ user: userData, userRole, loading: false });
      console.log(`✅ User role definida como: ${userRole}`);    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw tratarErroSupabase(error, 'fazer login');
    }
  },
    signUp: async (email, password, userData, role = 'participante') => {
  const roleValue = role === 'admin' ? 'admin' : 'user';
  let appMetadata = role === 'admin' ? { roles: [roleValue] } : { role: roleValue };

  console.log(`Creating new user with role: ${role} (${roleValue})`);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        ...userData,
        role: roleValue
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });

  if (authError) throw authError;

  if (authData.user) {
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: email,
          password: password, 
          full_name: userData.full_name,
          phone: userData.phone, // Já deve vir formatado ou nulo
          cpf: userData.cpf, // Já deve vir formatado ou nulo
          birth_date: userData.birth_date, // Já deve vir formatado ou nulo
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_metadata: { role: roleValue },
          app_metadata: appMetadata
        }
      ]);

    if (userError) {
      console.error('Error inserting user data:', userError);
      throw userError;
    }

    console.log(`Usuário ${role} criado com sucesso.`);
    set({ userRole: role === 'admin' ? 'admin' : 'participante' });
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
  },  checkUserRole: async (userId: string) => {
    try {
      console.log("=== Checking user role for ID:", userId, "===");
      
      // Verificar APENAS na tabela users do esquema public
      try {
        console.log("Checking users table metadata in public schema");
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('app_metadata, user_metadata')
          .eq('id', userId)
          .single();
            
        if (!userError && userData) {
          const appMeta = userData.app_metadata || {};
          
          // Verificar app_metadata.roles (array)
          if (appMeta.roles && Array.isArray(appMeta.roles) && appMeta.roles.length > 0) {
            console.log('Checking app_metadata.roles array:', appMeta.roles);
            if (appMeta.roles.includes('admin') || appMeta.roles.includes('organizer')) {
              console.log('✅ Admin role found in app_metadata.roles array');
              const role: UserRole = 'admin';
              set({ userRole: role });
              return role;
            } else if (appMeta.roles.includes('user')) {
              console.log('✅ User role found in app_metadata.roles array');
              const role: UserRole = 'participante';
              set({ userRole: role });
              return role;
            }
          }
          
          // Verificar app_metadata.role (string)
          if (appMeta.role && typeof appMeta.role === 'string') {
            console.log('Checking app_metadata.role string:', appMeta.role);
            if (appMeta.role === 'admin' || appMeta.role === 'organizer') {
              console.log('✅ Admin role found in app_metadata.role string');
              const role: UserRole = 'admin';
              set({ userRole: role });
              return role;
            } else if (appMeta.role === 'user') {
              console.log('✅ User role found in app_metadata.role string');
              const role: UserRole = 'participante';
              set({ userRole: role });
              return role;
            }
          }
            
          // Verificar user_metadata.role (compatibilidade)
          const userMeta = userData.user_metadata || {};
          if (userMeta.role && typeof userMeta.role === 'string') {
            console.log('Checking user_metadata.role string:', userMeta.role);
            if (userMeta.role === 'admin' || userMeta.role === 'organizer') {
              console.log('✅ Admin role found in user_metadata.role');
              const role: UserRole = 'admin';
              set({ userRole: role });
              return role;
            } else if (userMeta.role === 'user') {
              console.log('✅ User role found in user_metadata.role');
              const role: UserRole = 'participante';
              set({ userRole: role });
              return role;
            }
          }
          
          // Se existe na tabela users mas sem role específica, é participante
          console.log('✅ User exists in users table but no specific role - defaulting to participante');
          const role: UserRole = 'participante';
          set({ userRole: role });
          return role;
        } else {
          console.log('❌ User not found in users table or error retrieving data');
          
          // Se não encontrou o usuário na tabela users, mas está autenticado, definir como participante      console.log('⚠️ Usuário não encontrado na tabela public.users - usando padrão participante');
          const defaultRole: UserRole = 'participante';
          set({ userRole: defaultRole });
          return defaultRole;
        }      } catch (metadataCheckError) {
        console.warn('⚠️ Erro ao verificar metadados na tabela de usuários:', metadataCheckError);
        
        // Se ocorreu erro ao verificar metadados, mas está autenticado, definir como participante
        console.log('⚠️ Erro ao verificar tabela public.users - usando padrão participante');
        const defaultRole: UserRole = 'participante';
        set({ userRole: defaultRole });
        return defaultRole;
      }    } catch (error) {
      console.error('❌ Erro ao verificar papel do usuário:', error);
      console.error(tratarErroSupabase(error, 'verificar papel do usuário'));
      return null;
    }
  }
}));