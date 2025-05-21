import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, refreshSession } from '../lib/supabase';
import { userService, UserData } from '../services/userService';
import { useAuthStore, UserRole } from '../store/authStore';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  userRole: UserRole | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  isAdmin: () => boolean;
  isParticipante: () => boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userData: null,
  userRole: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
  isAdmin: () => false,
  isParticipante: () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authStore = useAuthStore();
  const userRole = useAuthStore((state) => state.userRole);
  const checkUserRole = useAuthStore((state) => state.checkUserRole);
  const setUserRole = useAuthStore((state) => state.setUserRole);

  // Função auxiliar para converter User para UserData ou carregar perfil completo
  const processUserData = async (user: User): Promise<void> => {
    try {
      // Definir user no estado (não userData)
      setUser(user);
      
      // Tentar carregar o perfil completo do serviço
      try {
        const profile = await userService.getUserProfile(user.id);
        if (profile) {
          setUserData(profile);
          return;
        }
      } catch (profileError) {
        console.warn('⚠️ Error loading user profile:', profileError);
        // Continuamos para criar um UserData básico abaixo
      }
      
      // Se não conseguiu carregar o perfil completo, criar um objeto UserData básico
      const basicUserData: UserData = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
        // Preencher propriedades obrigatórias com valores padrão
        phone: user.phone || user.user_metadata?.phone || '',
        createdAt: user.created_at || new Date().toISOString(), // Corrigido de created_at para createdAt
        // Quaisquer outras propriedades obrigatórias do UserData
      };
      
      setUserData(basicUserData);
    } catch (error) {
      console.error('Error processing user data:', error);
      // Não limpar setUserData aqui para manter qualquer dado anterior se houver
    }
  };

  // Initial session check effect
  useEffect(() => {
    let isMounted = true;
    
    // Tentativa inicial de verificação de sessão
    const initialSessionCheck = async () => {
      try {
        // Verificar se há uma sessão válida
        const { data } = await supabase.auth.getSession();
        
        if (data?.session?.user && isMounted) {
          setSession(data.session);
          // Processar dados do usuário corretamente
          await processUserData(data.session.user);
          
          // Verificar papel do usuário
          let roleFound = false;
          
          // 1. Verificar nos metadados do usuário
          if (data.session.user.user_metadata?.role) {
            console.log('✅ useAuth - Role found in user metadata:', data.session.user.user_metadata.role);
            setUserRole(data.session.user.user_metadata.role);
            roleFound = true;
          }
          
          // 2. Se não encontrou nos metadados, verificar na tabela de usuários
          if (!roleFound) {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', data.session.user.id)
                .single();
                
              if (!userError && userData && isMounted) {
                console.log('✅ useAuth - User found in users table (admin)');
                setUserRole('admin');
                roleFound = true;
              }
            } catch (dbErr) {
              console.warn('⚠️ useAuth - Error checking users table:', dbErr);
            }
          }
          
          // 3. Fallback para participante
          if (!roleFound && isMounted) {
            console.log('ℹ️ useAuth - No specific role found, defaulting to participant');
            setUserRole('participante');
          }
        }
      } catch (error) {
        console.error('Error in initial session check:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    initialSessionCheck();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        if (session?.user) {
          setSession(session);
          // Processar dados do usuário corretamente
          await processUserData(session.user);
          
          // Verificar papel do usuário seguindo a mesma lógica acima
          let roleFound = false;
          
          if (session.user.user_metadata?.role) {
            console.log('✅ useAuth change - Role found in metadata:', session.user.user_metadata.role);
            setUserRole(session.user.user_metadata.role);
            roleFound = true;
          }
          
          if (!roleFound) {
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', session.user.id)
                .single();
              
              if (!userError && userData) {
                console.log('✅ useAuth change - User found in users table as admin');
                setUserRole('admin');
                roleFound = true;
              } else {
                console.log('❌ useAuth change - User not found in users table');
              }
            } catch (userError) {
              console.warn('⚠️ useAuth change - Error checking users table:', userError);
            }
          }
          
          if (!roleFound) {
            console.log("ℹ️ useAuth change - No specific role found, defaulting to participant");
            setUserRole('participante');
          }
        } else {
          setUser(null);
          setUserData(null);
          setSession(null);
          setUserRole(null);
        }
      }
    );
    
    // Configurar um intervalo para renovar a sessão automaticamente
    const sessionRefreshInterval = setInterval(async () => {
      try {
        if (isMounted) {
          const session = await refreshSession();
          if (session) {
            console.log("✅ Sessão atualizada com sucesso");
          }
        }
      } catch (error) {
        console.error("❌ Erro ao atualizar sessão:", error);
      }
    }, 4 * 60 * 1000); // 4 minutos

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearInterval(sessionRefreshInterval);
    };
  }, [setUserRole]);

  // Efeito separado para verificar a sessão periodicamente
  useEffect(() => {
    const AUTO_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutos
    console.log('🔄 Configurando verificação periódica da sessão');
    
    const refreshIntervalId = setInterval(async () => {
      try {
        const updatedSession = await refreshSession();
        if (updatedSession) {
          console.log('✅ Sessão atualizada com sucesso');
        }
      } catch (error) {
        console.error('❌ Erro ao atualizar sessão:', error);
      }
    }, AUTO_REFRESH_INTERVAL);
    
    return () => {
      console.log('🛑 Limpando intervalo de verificação de sessão');
      clearInterval(refreshIntervalId);
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      const profile = await userService.getUserProfile(userId);
      setUserData(profile);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Se falhar ao buscar o perfil completo, manter o básico
      if (user) {
        const basicUserData: UserData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
          phone: user.phone || user.user_metadata?.phone || '',
          createdAt: user.created_at || new Date().toISOString(), // Corrigido de created_at para createdAt
        };
        setUserData(basicUserData);
      } else {
        setUserData(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };
  
  const isAdmin = () => {
    return userRole === 'admin';
  };
  
  const isParticipante = () => {
    return userRole === 'participante';
  };

  const value = {
    session,
    user,
    userData,
    userRole,
    isLoading,
    signIn,
    signOut,
    refreshUserData,
    isAdmin,
    isParticipante,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
