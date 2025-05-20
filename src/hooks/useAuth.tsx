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
        console.log("=== Initializing authentication in useAuth ===");
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
        
          if (session?.user) {
            // Fetch user data
            await fetchUserData(session.user.id);
            
            // Check user role - using the same hierarchy as in authStore
            let roleFound = false;
            
            // 1. HIGHEST PRIORITY: Check users table
            try {
              console.log("useAuth init - Step 1: Checking users table");
              const { data: adminData, error: adminError } = await supabase
                .from('users')
                .select('id')
                .eq('id', session.user.id)
                .single();
                
              if (!adminError && adminData) {
                console.log('✅ useAuth init - User found in users table - setting as ADMIN');
                setUserRole('admin');
                roleFound = true;
              } else {
                console.log('❌ useAuth init - User not found in users table');
              }
            } catch (adminError) {
              console.warn('⚠️ useAuth init - Error checking users table:', adminError);
            }
            
            // 2. SECOND PRIORITY: Check user metadata
            if (!roleFound) {
              console.log("useAuth init - Step 2: Checking user metadata");
              console.log("User metadata during init:", session.user.user_metadata);
              if (session.user.user_metadata?.role) {
                const roleFromMetadata = session.user.user_metadata.role as UserRole;
                console.log("✅ useAuth init - Setting role from metadata:", roleFromMetadata);
                setUserRole(roleFromMetadata);
                roleFound = true;
              } else {
                console.log('❌ useAuth init - No role in user metadata');
              }
            }
            
            // 3. THIRD PRIORITY: Check users table for participants
            if (!roleFound) {
              try {
                console.log("useAuth init - Step 3: Checking users table");
                const { data: userData, error: userError } = await supabase
                  .from('users')
                  .select('id')
                  .eq('id', session.user.id)
                  .single();
                  
                if (!userError && userData) {
                  console.log('✅ useAuth init - User found in users table as participante');
                  setUserRole('participante');
                  roleFound = true;
                } else {
                  console.log('❌ useAuth init - User not found in users table');
                }
              } catch (userError) {
                console.warn('⚠️ useAuth init - Error checking users table:', userError);
              }
              
              // 4. FINAL FALLBACK: Use checkUserRole from authStore
              if (!roleFound) {
                console.log("useAuth init - Step 4: Using authStore's checkUserRole as fallback");
                await checkUserRole(session.user.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
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
          // Fetch user data
          await fetchUserData(session.user.id);
          
          // Check user role - improved checks with better logging
          let roleFound = false;
          try {
            console.log("useAuth change - Step 1: Checking users table");
            const { data: adminData, error: adminError } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .single();
              
            if (!adminError && adminData) {
              console.log('✅ useAuth change - User found in users table - setting as ADMIN');
              setUserRole('admin');
              roleFound = true;
            } else {
              console.log('❌ useAuth change - User not found in users table');
            }
          } catch (adminError) {
            console.warn('⚠️ useAuth change - Error checking users table:', adminError);
          }
          
          // If not found in users table, try metadata
          if (!roleFound) {
            console.log("useAuth change - Step 2: Checking user metadata");
            console.log("User metadata on auth change:", session.user.user_metadata);
            if (session.user.user_metadata?.role) {
              const roleFromMetadata = session.user.user_metadata.role as UserRole;
              console.log("✅ useAuth change - Setting role from metadata:", roleFromMetadata);
              setUserRole(roleFromMetadata);
              roleFound = true;
            } else {
              console.log('❌ useAuth change - No role in user metadata');
            }
          }
          
          // If still not found, try users table or fallback to checkUserRole
          if (!roleFound) {
            try {
              console.log("useAuth change - Step 3: Checking users table");
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('id', session.user.id)
                .single();
                
              if (!userError && userData) {
                console.log('✅ useAuth change - User found in users table as participante');
                setUserRole('participante');
                roleFound = true;
              } else {
                console.log('❌ useAuth change - User not found in users table');
              }
            } catch (userError) {
              console.warn('⚠️ useAuth change - Error checking users table:', userError);
            }
            
            // Final fallback to checkUserRole
            if (!roleFound) {
              console.log("useAuth change - Step 4: Using authStore's checkUserRole as fallback");
              await checkUserRole(session.user.id);
            }
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
  }, [checkUserRole, setUserRole]); // Add necessary dependencies

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
