import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Tipo para o contexto de autenticação
export interface AuthContextType {
  user: any;
  isLoading: boolean;
  userData: any; // Add missing property for user data
  userRole: string | null; // Add missing property for user role
  isAuth: () => boolean;
  isAdmin: () => boolean; // Add missing method
  isParticipante: () => boolean; // Add missing method
  logout: () => Promise<void>;
  // ...outros métodos e propriedades necessárias
}

// Criar o contexto com um valor padrão
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  userData: null, // Default value for userData
  userRole: null, // Default value for userRole
  isAuth: () => false,
  isAdmin: () => false, // Default implementation
  isParticipante: () => false, // Default implementation
  logout: async () => {},
  // ...outros métodos e propriedades com valores padrão
});

// Provider do contexto
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, userRole, loading: authLoading, signOut } = useAuthStore();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Carregar dados adicionais do usuário
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);
  
  // Função para verificar se o usuário está autenticado
  const isAuth = () => {
    return !!user;
  };
  
  // Função para verificar se o usuário é administrador
  const isAdmin = () => {
    return userRole === 'admin';
  };
  
  // Função para verificar se o usuário é participante
  const isParticipante = () => {
    return userRole === 'participante';
  };
  
  const logout = async () => {
    await signOut();
  };
  
  // Valor do contexto
  const value: AuthContextType = {
    user,
    isLoading: loading || authLoading,
    userData,
    userRole,
    isAuth,
    isAdmin,
    isParticipante,
    logout,
    // ...outros métodos e propriedades
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook para usar o contexto
export const useAuth = () => {
  return useContext(AuthContext);
};
