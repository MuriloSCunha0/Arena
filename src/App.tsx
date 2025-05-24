import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, debugAuth, refreshSession } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AdminLayout } from './components/layout/AdminLayout';
import { ParticipantLayout } from './components/layout/ParticipantLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { BlockDetector } from './components/ui/BlockDetector';
import { NotificationContainer } from './components/ui/Notification';
import { EventRegistration } from './pages/public/EventRegistration';
import { OrganizersList } from './pages/organizers/OrganizersList';
import { OrganizerForm } from './pages/organizers/OrganizerForm';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Lazy loading para componentes que não são necessários imediatamente
const EventsList = lazy(() => import('./pages/events/EventsList').then(module => ({ default: module.EventsList })));
const EventForm = lazy(() => import('./pages/events/EventForm').then(module => ({ default: module.EventForm })));
const EventDetail = lazy(() => import('./pages/events/EventDetail').then(module => ({ default: module.EventDetail })));
const ParticipantsList = lazy(() => import('./pages/participants/ParticipantsList').then(module => ({ default: module.ParticipantsList })));
const FinancialOverview = lazy(() => import('./pages/financial/FinancialOverview').then(module => ({ default: module.FinancialOverview })));
const ReportsDashboard = lazy(() => import('./pages/reports/ReportsDashboard').then(module => ({ default: module.ReportsDashboard })));
const Settings = lazy(() => import('./pages/settings/Settings').then(module => ({ default: module.Settings })));
// Novo componente para gerenciamento de quadras
const CourtsManagement = lazy(() => import('./pages/courts/CourtsManagement').then(module => ({ default: module.CourtsManagement })));
// Componente para inscrição em evento para participantes
const EventoRegistro = lazy(() => import('./pages/participante/EventoRegistro').then(module => ({ default: module.EventoRegistro })));
// Componentes para participantes
const EventosDisponiveis = lazy(() => import('./pages/participante/EventosDisponiveis').then(module => ({ default: module.EventosDisponiveis })));
const MeusTorneios = lazy(() => import('./pages/participante/MeusTorneios').then(module => ({ default: module.MeusTorneios })));
// Perfis de usuário
const UserProfile = lazy(() => import('./pages/profile/UserProfile').then(module => ({ default: module.UserProfile })));
const AdminProfile = lazy(() => import('./pages/profile/AdminProfile').then(module => ({ default: module.AdminProfile })));

// Componente de fallback para o lazy loading
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-brand-sand">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-green" />
  </div>
);

// Página 404 para rotas não encontradas
const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-brand-sand">
    <h1 className="text-3xl font-bold text-brand-green mb-4">Página não encontrada</h1>
    <p className="text-gray-600 mb-6">A página que você está procurando não existe.</p>
    <a href="/" className="px-4 py-2 bg-brand-green text-white rounded hover:bg-opacity-90 transition-all">
      Voltar para o início
    </a>
  </div>
);

const SessionValidator = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const setUser = useAuthStore(state => state.setUser);
  const setUserRole = useAuthStore(state => state.setUserRole);
  
  useEffect(() => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 800; // ms
    
    let mounted = true;
    
    const validateSession = async () => {
      try {
        // Simplificar a verificação inicial de sessão
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (sessionData?.session) {
          // Temos uma sessão válida
          setUser(sessionData.session.user);
          
          // Buscar o papel do usuário
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('app_metadata')
              .eq('id', sessionData.session.user.id)
              .single();
              
            if (!userError && userData) {
              const role = userData.app_metadata?.role || 'participante';
              setUserRole(role);
            } else {
              setUserRole('participante'); // Papel padrão
            }
          } catch (err) {
            console.warn('Erro ao verificar papel do usuário:', err);
            setUserRole('participante'); // Papel padrão em caso de erro
          }
        } else {
          // Nenhuma sessão, limpar estado
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Erro ao validar sessão:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        setIsChecking(false);
      }
    };
    
    const timer = setTimeout(
      validateSession, 
      retryCount === 0 ? 0 : RETRY_DELAY
    );
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [retryCount, setUser, setUserRole]);
  
  if (isChecking) {
    return <LoadingFallback />;
  }
  
  return <Navigate to="/login" replace />;
};

function App() {
  const { user, setUser, loading, setUserRole } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      // Debug current auth state
      const authDebugInfo = await debugAuth();
      console.log('=== Auth debugging complete ===', authDebugInfo.success);

      try {
        // Tenta recuperar a sessão do localStorage primeiro
        const { data: localSessionData, error: localSessionError } = await supabase.auth.getSession();
        
        if (!localSessionError && localSessionData?.session?.user && mounted) {
          console.log('=== Session found in localStorage ===');
          setUser(localSessionData.session.user);
          
          // Verificar papel do usuário
          if (localSessionData.session.user.user_metadata?.role) {
            setUserRole(localSessionData.session.user.user_metadata.role);
          } else {
            try {
              const { data: adminData } = await supabase
                .from('users')
                .select('id')
                .eq('id', localSessionData.session.user.id)
                .single();
                
              if (adminData && mounted) {
                console.log('✅ User found as admin in DB check');
                setUserRole('admin');
              } else if (mounted) {
                setUserRole('participante');
              }
            } catch (err) {
              console.warn('⚠️ Error checking user role:', err);
              if (mounted) setUserRole('participante');
            }
          }
        } else {
          // Se não encontrou no localStorage, tenta renovar a sessão
          console.log('=== Attempting to refresh session ===');
          const session = await refreshSession();
        
          if (session?.user && mounted) {
            console.log('=== Session refreshed successfully ===');
            setUser(session.user);
            
            if (session.user.user_metadata?.role) {
              setUserRole(session.user.user_metadata.role);
            } else {
              // Verificação na DB como feito acima
              try {
                const { data: adminData } = await supabase
                  .from('users')
                  .select('id')
                  .eq('id', session.user.id)
                  .single();
                
                if (adminData && mounted) {
                  setUserRole('admin');
                } else if (mounted) {
                  setUserRole('participante');
                }
              } catch (err) {
                if (mounted) setUserRole('participante');
              }
            }
          } else if (mounted) {
            console.log('=== No valid session found ===');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setSessionChecked(true);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event);
      
      if (mounted) {
        if (_event === 'SIGNED_OUT') {
          setUser(null);
          setUserRole(null);
        } else if (session?.user) {
          setUser(session.user);
          
          if (session.user.user_metadata?.role) {
            setUserRole(session.user.user_metadata.role);
          }
        }
      }
    });

    // Configurar intervalo para renovar a sessão regularmente
    const sessionRefreshInterval = setInterval(async () => {
      if (mounted) {
        try {
          await refreshSession();
        } catch (error) {
          console.error('Error in auto session refresh:', error);
        }
      }
    }, 4 * 60 * 1000); // 4 minutos

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(sessionRefreshInterval);
    };
  }, [setUser, setUserRole]);

  // Esperar até que a verificação inicial da sessão seja concluída
  if (loading || !sessionChecked) {
    return <LoadingFallback />;
  }
  
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationContainer />
          <BlockDetector />          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              user === null ? <Login /> : <Navigate to="/" replace />
            } />
            <Route path="/register" element={
              user === null ? <Register /> : <Navigate to="/" replace />
            } />
            <Route path="/inscricao/:eventId" element={<EventRegistration />} />
            
            {/* Protected Routes with improved session handling */}
            <Route path="/*" element={
              loading ? (
                <LoadingFallback />
              ) : user !== null ? (
                <AuthenticatedRoutes />
              ) : (
                // Tenta renovar a sessão antes de redirecionar
                <SessionValidator />
              )
            } />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

const AuthenticatedRoutes = () => {
  const { isAdmin, isParticipante, isLoading, userRole, user, userData } = useAuth();
  
  // Show loading while checking permissions
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  // Debug logging
  console.log("AuthenticatedRoutes - User:", user?.id);
  console.log("AuthenticatedRoutes - User Metadata:", user?.user_metadata);
  console.log("AuthenticatedRoutes - User Data:", userData);
  console.log("AuthenticatedRoutes - User Role:", userRole);
  console.log("AuthenticatedRoutes - Is Admin:", isAdmin());
  console.log("AuthenticatedRoutes - Is Participante:", isParticipante());
    // Verificar papel do usuário de forma mais detalhada
  const checkAdminStatus = async () => {
    if (!user) return false;
    
    try {
      console.log("=== Detailed admin status verification ===");
      
      // Verificar primeiro na tabela users (most reliable source)
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (!adminError && adminData) {
        console.log("✅ User is confirmed admin via users table");
        return true;
      }
      
      // Depois verificar nos metadados
      if (user.user_metadata?.role === 'admin') {
        console.log("✅ User is confirmed admin via metadata");
        return true;
      }
      
      console.log("❌ User is not an administrator in either source");
      return false;
    } catch (error) {
      console.error("❌ Error checking admin status:", error);
      return false;
    }
  };
    // Verificação adicional para garantir que o papel está correto
  useEffect(() => {
    const verifyUserRole = async () => {
      if (user) {
        console.log("=== Verifying user role accuracy ===");
        
        // Verificar se é realmente admin mas tem outro papel
        if (userRole !== 'admin') {
          const isActuallyAdmin = await checkAdminStatus();
          if (isActuallyAdmin) {
            console.log("⚠️ Role correction needed: User was incorrectly set as non-admin, fixing to admin");
            useAuthStore.getState().setUserRole('admin');
          }
        } 
        // Verificar se tem papel de admin mas na verdade não é
        else if (userRole === 'admin') {
          const isActuallyAdmin = await checkAdminStatus();
          if (!isActuallyAdmin) {
            console.log("⚠️ Role correction needed: User was incorrectly set as admin, fixing to participante");
            useAuthStore.getState().setUserRole('participante');
          }
        }
      }
    };
    
    verifyUserRole();
  }, [user, userRole]);
    // Ensure we have a role before rendering routes
  if (userRole === null) {
    console.warn('No user role detected, checking if session exists...');
    
    // Tenta uma última recuperação antes de redirecionar
    if (user) {
      console.log('User exists but no role, setting default role as participante');
      // Se temos um usuário mas nenhum papel, definimos como participante por padrão
      setTimeout(() => {
        useAuthStore.getState().setUserRole('participante');
      }, 100);
      return <LoadingFallback />;
    }
    
    console.warn('No valid user found, redirecting to login');
    // Add small delay before redirect to avoid infinite loop
    return <Navigate to="/login" replace />;
  }
  
  // Choose the appropriate layout based on user type
  if (isAdmin()) {
    return (
      <AdminLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<AdminProfile />} />
            <Route path="/eventos" element={<EventsList />} />
            <Route path="/eventos/novo" element={<EventForm />} />
            <Route path="/eventos/:id" element={<EventDetail />} />
            <Route path="/eventos/:id/editar" element={<EventForm />} />
            <Route path="/participantes" element={<ParticipantsList />} />
            <Route path="/financeiro" element={<FinancialOverview />} />
            <Route path="/relatorios" element={<ReportsDashboard />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/quadras" element={<CourtsManagement />} />
            <Route path="/organizadores" element={<OrganizersList />} />
            <Route path="/organizadores/novo" element={<OrganizerForm />} />
            <Route path="/organizadores/:id/editar" element={<OrganizerForm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    );
  } else if (isParticipante()) {
    // Layout para participantes regulares
    return (
      <ParticipantLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<UserProfile />} />
            <Route path="/meus-torneios" element={<MeusTorneios />} />
            <Route path="/eventos-disponiveis" element={<EventosDisponiveis />} />
            <Route path="/evento-registro/:eventId" element={<EventoRegistro />} />
            <Route path="/inscricao/:eventId" element={<EventRegistration />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ParticipantLayout>
    );
  }

  // Safety fallback - prevents infinite redirects
  // If we get here, userRole isn't null, but isn't matching any condition
  console.error('Unexpected user role state:', userRole);
  return <Navigate to="/login" replace />;
};

export default App;