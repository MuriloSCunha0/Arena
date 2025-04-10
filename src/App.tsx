import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminLayout } from './components/layout/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { BlockDetector } from './components/ui/BlockDetector';
import { NotificationContainer } from './components/ui/Notification';
import { isDemoMode } from './utils/demoMode';

// Lazy loading para componentes que não são necessários imediatamente
const EventsList = lazy(() => import('./pages/events/EventsList').then(module => ({ default: module.EventsList })));
const EventForm = lazy(() => import('./pages/events/EventForm').then(module => ({ default: module.EventForm })));
const EventDetail = lazy(() => import('./pages/events/EventDetail').then(module => ({ default: module.EventDetail })));
const ParticipantsList = lazy(() => import('./pages/participants/ParticipantsList').then(module => ({ default: module.ParticipantsList })));
const FinancialOverview = lazy(() => import('./pages/financial/FinancialOverview').then(module => ({ default: module.FinancialOverview })));
const ReportsDashboard = lazy(() => import('./pages/reports/ReportsDashboard').then(module => ({ default: module.ReportsDashboard })));
const Settings = lazy(() => import('./pages/settings/Settings').then(module => ({ default: module.Settings })));

// Componente de fallback para o lazy loading
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-brand-sand">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-green" />
  </div>
);

function App() {
  const { user, setUser, loading, checkDemoMode } = useAuthStore();

  useEffect(() => {
    // Verificar o modo de demonstração e configurar autenticação apropriada
    checkDemoMode();
  }, [checkDemoMode]);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (loading && !isDemoMode()) {
    return <LoadingFallback />;
  }

  return (
    <ErrorBoundary>
      <Router basename={isDemoMode() ? '/project-bolt-sb1-nanr6th8' : '/'}>
        <NotificationContainer />
        <BlockDetector />
        <Routes>
          <Route path="/login" element={isDemoMode() || user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/*" element={isDemoMode() || user ? <AuthenticatedRoutes /> : <Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

const AuthenticatedRoutes = () => {
  return (
    <AdminLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/eventos" element={<EventsList />} />
          <Route path="/eventos/novo" element={<EventForm />} />
          <Route path="/eventos/:id" element={<EventDetail />} />
          <Route path="/eventos/:id/editar" element={<EventForm />} />
          <Route path="/participantes" element={<ParticipantsList />} />
          <Route path="/financeiro" element={<FinancialOverview />} />
          <Route path="/relatorios" element={<ReportsDashboard />} />
          <Route path="/configuracoes" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
};

export default App;