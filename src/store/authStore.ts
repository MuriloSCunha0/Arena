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
  initializeFromStorage: () => void;
}

export type UserData = {
  full_name: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  // outros campos opcionais...
};

// Chaves para localStorage
const STORAGE_KEYS = {
  USER: 'arena_auth_user',
  USER_ROLE: 'arena_auth_user_role',
  SESSION_TIMESTAMP: 'arena_auth_timestamp'
};

// Utilidades para persistência
const persistToStorage = (user: any, userRole: UserRole | null) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, userRole || '');
      localStorage.setItem(STORAGE_KEYS.SESSION_TIMESTAMP, Date.now().toString());
      console.log('✅ Sessão salva no localStorage');
    }
  } catch (error) {
    console.error('❌ Erro ao salvar sessão no localStorage:', error);
  }
};

const loadFromStorage = () => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const userRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    const timestamp = localStorage.getItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    
    if (!userStr || !timestamp) {
      return { user: null, userRole: null };
    }
    
    // Verificar se a sessão não está expirada (24 horas)
    const sessionAge = Date.now() - parseInt(timestamp);
    const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 horas
    
    if (sessionAge > MAX_SESSION_AGE) {
      console.log('⚠️ Sessão expirada, limpando localStorage');
      clearStorage();
      return { user: null, userRole: null };
    }
    
    const user = JSON.parse(userStr);
    // Properly type cast the userRole
    const role: UserRole | null = userRole && ['admin', 'organizer', 'participante'].includes(userRole) 
      ? userRole as UserRole 
      : null;
    
    console.log('✅ Sessão recuperada do localStorage');
    return { user, userRole: role };
  } catch (error) {
    console.error('❌ Erro ao recuperar sessão do localStorage:', error);
    clearStorage();
    return { user: null, userRole: null };
  }
};

const clearStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    console.log('✅ Dados de sessão removidos do localStorage');
  } catch (error) {
    console.error('❌ Erro ao limpar localStorage:', error);
  }
};

// Função auxiliar para obter dados do localStorage de forma segura
const getPersistedSession = () => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    const userRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    const timestamp = localStorage.getItem(STORAGE_KEYS.SESSION_TIMESTAMP);
    
    if (!userStr || !timestamp) {
      return { user: null, userRole: null };
    }
    
    // Check session age
    const sessionAge = Date.now() - parseInt(timestamp);
    const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    if (sessionAge > MAX_SESSION_AGE) {
      clearStorage();
      return { user: null, userRole: null };
    }
    
    // Properly type cast the userRole
    const role: UserRole | null = userRole && ['admin', 'organizer', 'participante'].includes(userRole) 
      ? userRole as UserRole 
      : null;
    
    return {
      user: JSON.parse(userStr),
      userRole: role
    };
  } catch (error) {
    console.error('Error getting persisted session:', error);
    clearStorage();
    return { user: null, userRole: null };
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize with persisted data if available
  const persistedSession = getPersistedSession();
  
  return {
    user: persistedSession.user,
    userRole: persistedSession.userRole,
    loading: false, // Start with false to prevent unnecessary loading states
    
    setUser: (user) => {
      set({ user, loading: false });
      const { userRole } = get();
      persistToStorage(user, userRole);
    },
    
    setUserRole: (role) => {
      set({ userRole: role });
      const { user } = get();
      persistToStorage(user, role);
    },

    initializeFromStorage: () => {
      const stored = loadFromStorage();
      if (stored.user) {
        set({ 
          user: stored.user, 
          userRole: stored.userRole, 
          loading: false 
        });
        console.log('✅ Estado inicializado com dados do localStorage');
      } else {
        set({ loading: false });
      }
    },
    
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
          console.error('❌ Error querying users table:', userError);
          throw new Error('Erro ao consultar a tabela de usuários.');
        }

        if (!userData) {
          console.error('❌ Usuário não encontrado na tabela de usuários');
          throw new Error('Usuário não encontrado.');
        }

        // 2. Validar a senha (substitua por uma função de hash real, se necessário)
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

        // 4. Atualizar o estado com os dados do usuário e persistir
        set({ user: userData, userRole, loading: false });
        persistToStorage(userData, userRole);
        console.log(`✅ User role definida como: ${userRole} e salva no localStorage`);

      } catch (error) {
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
        const finalRole = role === 'admin' ? 'admin' : 'participante';
        set({ userRole: finalRole });
        
        // Persistir dados do novo usuário
        persistToStorage(authData.user, finalRole);
      }
    },

    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Limpar estado e localStorage
        set({ user: null, loading: false, userRole: null });
        clearStorage();
        console.log('✅ Logout realizado e dados limpos do localStorage');
      } catch (error) {
        console.error('❌ Erro durante logout:', error);
        throw error;
      }
    },
    
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      
      if (error) throw error;
    },

    checkUserRole: async (userId: string) => {
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
                // Atualizar localStorage
                const { user } = get();
                persistToStorage(user, role);
                return role;
              } else if (appMeta.roles.includes('user')) {
                console.log('✅ User role found in app_metadata.roles array');
                const role: UserRole = 'participante';
                set({ userRole: role });
                // Atualizar localStorage
                const { user } = get();
                persistToStorage(user, role);
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
                // Atualizar localStorage
                const { user } = get();
                persistToStorage(user, role);
                return role;
              } else if (appMeta.role === 'user') {
                console.log('✅ User role found in app_metadata.role string');
                const role: UserRole = 'participante';
                set({ userRole: role });
                // Atualizar localStorage
                const { user } = get();
                persistToStorage(user, role);
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
                // Atualizar localStorage
                const { user } = get();
                persistToStorage(user, role);
                return role;
              } else if (userMeta.role === 'user') {
                console.log('✅ User role found in user_metadata.role');
                const role: UserRole = 'participante';
                set({ userRole: role });
                // Atualizar localStorage
                const { user } = get();
                persistToStorage(user, role);
                return role;
              }
            }
            
            // Se existe na tabela users mas sem role específica, é participante
            console.log('✅ User exists in users table but no specific role - defaulting to participante');
            const role: UserRole = 'participante';
            set({ userRole: role });
            // Atualizar localStorage
            const { user } = get();
            persistToStorage(user, role);
            return role;
          } else {
            console.log('❌ User not found in users table or error retrieving data');
            
            // Se não encontrou o usuário na tabela users, mas está autenticado, definir como participante
            console.log('⚠️ Usuário não encontrado na tabela public.users - usando padrão participante');
            const defaultRole: UserRole = 'participante';
            set({ userRole: defaultRole });
            // Atualizar localStorage
            const { user } = get();
            persistToStorage(user, defaultRole);
            return defaultRole;
          }
        } catch (metadataCheckError) {
          console.warn('⚠️ Erro ao verificar metadados na tabela de usuários:', metadataCheckError);
          
          // Se ocorreu erro ao verificar metadados, mas está autenticado, definir como participante
          console.log('⚠️ Erro ao verificar tabela public.users - usando padrão participante');
          const defaultRole: UserRole = 'participante';
          set({ userRole: defaultRole });
          // Atualizar localStorage
          const { user } = get();
          persistToStorage(user, defaultRole);
          return defaultRole;
        }
      } catch (error) {
        console.error('❌ Erro ao verificar papel do usuário:', error);
        console.error(tratarErroSupabase(error, 'verificar papel do usuário'));
        return null;
      }
    }
  };
});