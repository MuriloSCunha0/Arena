import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
// Ambiente de testes para torneios
const TestTournamentManager = lazy(() => import('./components/testing/TestTournamentManager').then(module => ({ default: module.default })));
// Componente para inscrição em evento para participantes
const EventoRegistro = lazy(() => import('./pages/participante/EventoRegistro').then(module => ({ default: module.EventoRegistro })));
// Componentes para participantes
const EventosDisponiveis = lazy(() => import('./pages/participante/EventosDisponiveis').then(module => ({ default: module.EventosDisponiveis })));
const MeusTorneios = lazy(() => import('./pages/participante/MeusTorneios').then(module => ({ default: module.MeusTorneios })));
const UserProfile = lazy(() => import('./pages/profile/UserProfile').then(module => ({ default: module.UserProfile })));
const AdminProfile = lazy(() => import('./pages/profile/AdminProfile').then(module => ({ default: module.AdminProfile })));
// Convites participante
const Convites = lazy(() => import('./pages/participante/Convites').then(module => ({ default: module.Convites })));
// Acompanhar torneio
const AcompanharTorneio = lazy(() => import('./pages/participante/AcompanharTorneio').then(module => ({ default: module.AcompanharTorneio })));
// Debug components
const PaymentStatusTest = lazy(() => import('./pages/debug/PaymentStatusTest').then(module => ({ default: module.default })));
// Transmissão de torneio para telão
const TransmissionPage = lazy(() => import('./pages/transmission/TransmissionPage').then(module => ({ default: module.default })));

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

// Componente para rotas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Componente principal da aplicação protegida
const ProtectedApp = () => {
  const { isAdmin, isParticipante, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  // Renderizar rotas admin
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
            <Route path="/testes" element={<TestTournamentManager />} />
            <Route path="/debug/payment-test" element={<PaymentStatusTest />} />
            <Route path="/organizadores" element={<OrganizersList />} />
            <Route path="/organizadores/novo" element={<OrganizerForm />} />
            <Route path="/organizadores/:id/editar" element={<OrganizerForm />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AdminLayout>
    );
  }
  
  // Renderizar rotas participante
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
            <Route path="/torneio/:eventId/acompanhar" element={<AcompanharTorneio />} />
            <Route path="/participante/convites" element={<Convites />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ParticipantLayout>
    );
  }
  
  // Fallback para papel não reconhecido
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationContainer />
          <BlockDetector />
          <Routes>
            {/* Rotas públicas */}
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/inscricao/:eventId" element={<EventRegistration />} />
            <Route path="/transmission/:eventId" element={<TransmissionPage />} />
            
            {/* Rotas protegidas */}
            <Route path="/*" element={
              <ProtectedRoute>
                <ProtectedApp />
              </ProtectedRoute>
            } />
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

// Componente para rotas públicas (redireciona se já logado)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingFallback />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default App;