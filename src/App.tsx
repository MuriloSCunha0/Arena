import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, debugAuth } from './lib/supabase';
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

function App() {
  const { user, setUser, loading, setUserRole } = useAuthStore();
  useEffect(() => {
    // Debug current auth state
    debugAuth().then(result => {
      console.log('Auth debugging complete:', result.success);
    });
    
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // If user has metadata with role, set it directly
      if (session?.user?.user_metadata?.role) {
        console.log('Setting user role from metadata in App:', session.user.user_metadata.role);
        setUserRole(session.user.user_metadata.role);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // If user has metadata with role, set it directly
      if (session?.user?.user_metadata?.role) {
        console.log('Setting user role from metadata in auth change:', session.user.user_metadata.role);
        setUserRole(session.user.user_metadata.role);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setUserRole]);

  if (loading) {
    return <LoadingFallback />;
  }
  
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationContainer />
          <BlockDetector />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              user === null ? <Login /> : <Navigate to="/" replace />
            } />
            <Route path="/register" element={
              user === null ? <Register /> : <Navigate to="/" replace />
            } />
            <Route path="/inscricao/:eventId" element={<EventRegistration />} />
            
            {/* Protected Routes with a better conditional */}
            <Route path="/*" element={
              user !== null ? <AuthenticatedRoutes /> : <Navigate to="/login" replace />
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
  
  // Show loading while checking permissions
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  // Debug logging
  console.log("AuthenticatedRoutes - User:", user?.id);
  console.log("AuthenticatedRoutes - User Role:", userRole);
  console.log("AuthenticatedRoutes - Is Admin:", isAdmin());
  console.log("AuthenticatedRoutes - Is Participante:", isParticipante());
  
  // Ensure we have a role before rendering routes
  if (userRole === null) {
    console.warn('No user role detected, redirecting to login');
    // Add small delay before redirect to avoid infinite loop
    setTimeout(() => {}, 500);
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