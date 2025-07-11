import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../store/authStore';

// Tipo para o contexto de autenticação
export interface AuthContextType {
  user: any;
  isLoading: boolean;
  userData: any;
  userRole: UserRole | null;
  isAuth: () => boolean;
  isAdmin: () => boolean;
  isParticipante: () => boolean;
  logout: () => Promise<void>;
}

// Criar o contexto com um valor padrão
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  userData: null,
  userRole: null,
  isAuth: () => false,
  isAdmin: () => false,
  isParticipante: () => false,
  logout: async () => {},
});

// Provider do contexto
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { 
    user, 
    userRole, 
    loading: authLoading, 
    signOut, 
    initializeFromStorage,
    checkUserRole 
  } = useAuthStore();
  
  const [userData, setUserData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (initialized) return;
      
      try {
        // Initialize from storage first
        initializeFromStorage();
        
        // Get current session from Supabase
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (!error && sessionData?.session?.user && mounted) {
          console.log('✅ Session found, checking user role');
          useAuthStore.getState().setUser(sessionData.session.user);
          
          // Check and set user role
          await checkUserRole(sessionData.session.user.id);
        } else if (mounted) {
          console.log('ℹ️ No valid session found');
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setUserRole(null);
        }
      } catch (error) {
        console.error('❌ Error during auth initialization:', error);
        if (mounted) {
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setUserRole(null);
        }
      } finally {
        if (mounted) {
          setInitialized(true);
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);
      
      if (mounted) {
        if (event === 'SIGNED_OUT') {
          useAuthStore.getState().setUser(null);
          useAuthStore.getState().setUserRole(null);
          setUserData(null);
        } else if (session?.user) {
          useAuthStore.getState().setUser(session.user);
          await checkUserRole(session.user.id);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [initializeFromStorage, checkUserRole, initialized]);
  
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
