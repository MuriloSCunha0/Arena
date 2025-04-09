import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, checkSupabaseConnection } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useNotificationStore } from './components/ui/Notification';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { AdminLayout } from './components/layout/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { BlockDetector } from './components/ui/BlockDetector';
import { NotificationContainer } from './components/ui/Notification';

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

// Environment detection
const isGitHubPages = window.location.hostname.includes('github.io');

function App() {
  const { user, setUser, loading } = useAuthStore();
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const addNotification = useNotificationStore(state => state.addNotification);

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

  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);
      const { success, error } = await checkSupabaseConnection();

      setIsConnected(success);
      setIsLoading(false);

      if (!success) {
        console.error('Database connection error:', error);
        addNotification({
          type: 'error',
          message: 'Erro de conexão com o banco de dados. Alguns recursos podem não funcionar corretamente.',
        });
      }

      // If on GitHub Pages and using demo mode, show info notification
      if (isGitHubPages) {
        addNotification({
          type: 'info',
          message: 'Você está usando a versão de demonstração com dados simulados.',
        });
      }
    };

    checkConnection();
  }, [addNotification]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-sand">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-brand-blue border-solid mx-auto"></div>
          <p className="mt-4 text-lg text-brand-blue">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <NotificationContainer />
        <BlockDetector />
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/*" element={user ? <AuthenticatedRoutes /> : <Navigate to="/login" replace />} />
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