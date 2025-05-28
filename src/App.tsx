import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, debugAuth, refreshSession, traduzirErroSupabase } from './lib/supabase';
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
const ParticipantProfileNew = lazy(() => import('./pages/participants/ParticipantProfileNew').then(module => ({ default: module.ParticipantProfileNew })));
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
            }          } catch (err) {
            console.warn('Erro ao verificar papel do usuário:', traduzirErroSupabase(err));
            setUserRole('participante'); // Papel padrão em caso de erro
          }
        } else {
          // Nenhuma sessão, limpar estado
          setUser(null);
          setUserRole(null);
        }      } catch (error) {
        console.error('Erro ao validar sessão:', traduzirErroSupabase(error));
        setUser(null);
        setUserRole(null);
      }finally {
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
  const [appInitialized, setAppInitialized] = useState(false);
  
  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (appInitialized) return;
      
      try {
        // Debug current auth state
        const authDebugInfo = await debugAuth();
        console.log('=== Auth debugging complete ===', authDebugInfo.success);

        // Get current session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (!sessionError && sessionData?.session?.user && mounted) {
          console.log('=== Session found ===');
          setUser(sessionData.session.user);
          
          // Set role from metadata or default
          const role = sessionData.session.user.user_metadata?.role || 'participante';
          setUserRole(role);
        } else if (mounted) {
          console.log('=== No valid session found ===');
          setUser(null);
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error during auth initialization:', error);
        if (mounted) {
          setUser(null);
          setUserRole(null);
        }
      } finally {
        if (mounted) {
          setSessionChecked(true);
          setAppInitialized(true);
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
          const role = session.user.user_metadata?.role || 'participante';
          setUserRole(role);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setUserRole, appInitialized]);

  // Wait for app initialization
  if (!appInitialized || loading || !sessionChecked) {
    return <LoadingFallback />;
  }
  
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationContainer />
          <BlockDetector />
          <Routes>
            {/* Public Routes */}            <Route path="/login" element={
              user === null ? <Login /> : <Navigate to="/" replace />
            } />
            <Route path="/register" element={
              user === null ? <Register /> : <Navigate to="/" replace />
            } />            <Route path="/inscricao/:eventId" element={<EventRegistration />} />
              {/* TV display routes - always accessible without login */}
            <Route path="/tournament/bracket/tv" element={
              <Suspense fallback={<LoadingFallback />}>
                {React.createElement(
                  lazy(() => import('./pages/tournament/TournamentBracketTV'))
                )}
              </Suspense>
            } />
            <Route path="/event/tv" element={
              <Suspense fallback={<LoadingFallback />}>
                {React.createElement(
                  lazy(() => import('./pages/tournament/EventTVBroadcast'))
                )}
              </Suspense>
            } />
            
            {/* Protected Routes */}
            <Route path="/*" element={
              user !== null ? (
                <AuthenticatedRoutes />
              ) : (
                <Navigate to="/login" replace />
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
  const { isAdmin, isParticipante, isLoading, userRole, user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  
  // Perform role verification once when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const verifyRole = async () => {
      if (!user || isLoading) {
        setIsVerifying(false);
        return;
      }

      try {
        setIsVerifying(true);
        
        // Only verify if we don't have a role yet or verification hasn't been done
        if (!userRole || !isVerified) {
          console.log("=== Verifying user role ===");
          
          const { data: userData, error } = await supabase
            .from('users')
            .select('app_metadata, user_metadata')
            .eq('id', user.id)
            .single();
            
          if (!error && userData && isMounted) {
            const appMeta = userData.app_metadata || {};
            let detectedRole: 'admin' | 'participante' = 'participante'; // Fix: Use proper UserRole type instead of string
            
            // Check various role sources
            if (appMeta.roles && Array.isArray(appMeta.roles)) {
              if (appMeta.roles.includes('admin')) {
                detectedRole = 'admin';
              }
            } else if (appMeta.role === 'admin') {
              detectedRole = 'admin';
            } else if (userData.user_metadata?.role === 'admin') {
              detectedRole = 'admin';
            }
            
            // Update role if different and component is still mounted
            if (userRole !== detectedRole && isMounted) {
              console.log(`Updating role from ${userRole} to ${detectedRole}`);
              useAuthStore.getState().setUserRole(detectedRole);
            }
          }
        }
        
        if (isMounted) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Error verifying user role:', error);
        // Set default role on error
        if (!userRole && isMounted) {
          useAuthStore.getState().setUserRole('participante');
        }
        if (isMounted) {
          setIsVerified(true);
        }
      } finally {
        if (isMounted) {
          setIsVerifying(false);
        }
      }
    };
    
    verifyRole();
    
    return () => {
      isMounted = false;
    };
  }, [user, userRole, isLoading, isVerified]);
  
  // Show loading while verifying or loading
  if (isLoading || isVerifying || !isVerified) {
    return <LoadingFallback />;
  }
  
  // Ensure we have both user and role before rendering routes
  if (!user || !userRole) {
    console.warn('Missing user or role, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  // Render admin routes
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
            <Route path="/participantes/:id" element={<ParticipantProfileNew />} />
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
  }
  
  // Render participant routes
  if (isParticipante()) {
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
  
  // Fallback for unexpected role
  console.error('Unexpected user role state:', userRole);
  return <Navigate to="/login" replace />;
};

export default App;