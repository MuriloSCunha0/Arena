import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
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
  const { user, userRole, loading: authLoading, signOut, initializeFromStorage } = useAuthStore();
  const [userData, setUserData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize from storage only once
  useEffect(() => {
    if (!initialized) {
      initializeFromStorage();
      setInitialized(true);
    }
  }, [initializeFromStorage, initialized]);
  
  // Memoize the user data fetching function
  const fetchUserData = useCallback(async (userId: string) => {
    if (userData && userData.id === userId) {
      return; // Don't refetch if we already have data for this user
    }
    
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      } else {
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [userData]);
  
  // Load additional user data when user changes
  useEffect(() => {
    if (user && user.id && initialized) {
      fetchUserData(user.id);
    } else if (!user) {
      setUserData(null);
      setDataLoading(false);
    }
  }, [user, initialized, fetchUserData]);
  
  // Memoize auth functions to prevent recreating on every render
  const authFunctions = useMemo(() => ({
    isAuth: () => !!user,
    isAdmin: () => userRole === 'admin',
    isParticipante: () => userRole === 'participante',
    logout: async () => {
      setUserData(null);
      await signOut();
    }
  }), [user, userRole, signOut]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    isLoading: !initialized || authLoading || dataLoading,
    userData,
    userRole,
    ...authFunctions
  }), [user, initialized, authLoading, dataLoading, userData, userRole, authFunctions]);
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Hook para usar o contexto
export const useAuth = () => {
  return useContext(AuthContext);
};
