import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  // Initial session check effect
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      if (!isMounted) return;
      setIsLoading(true);
      
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
        
          if (session?.user) {
            await fetchUserData(session.user.id);
            // Log user metadata to debug role issues
            console.log("User metadata during init:", session.user.user_metadata);
            
            // First try to set role from metadata
            if (session.user.user_metadata?.role) {
              const roleFromMetadata = session.user.user_metadata.role as UserRole;
              console.log("Setting role from metadata:", roleFromMetadata);
              setUserRole(roleFromMetadata);
            } else {
              // If no metadata role, check database roles
              await checkUserRole(session.user.id);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
          console.log("Auth state change - user metadata:", session.user.user_metadata);
          
          // First try to set role from metadata
          if (session.user.user_metadata?.role) {
            const roleFromMetadata = session.user.user_metadata.role as UserRole;
            console.log("Auth state change - setting role from metadata:", roleFromMetadata);
            setUserRole(roleFromMetadata);
          } else {
            // If no metadata role, check database roles
            await checkUserRole(session.user.id);
          }
        } else {
          setUserData(null);
          setUserRole(null);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkUserRole, setUserRole]);// Add necessary dependencies

  const fetchUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      const profile = await userService.getUserProfile(userId);
      setUserData(profile);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
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
