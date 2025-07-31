import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Users, CircleDollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEventsStore, useParticipantsStore, useFinancialsStore } from '../store';
import { useNotificationStore } from '../components/ui/Notification';
import { EventType, Participant } from '../types';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color,
  loading = false,
  subtitle = '',
  trend = null
}: { 
  title: string, 
  value: string | number, 
  icon: React.ElementType, 
  color: string,
  loading?: boolean,
  subtitle?: string,
  trend?: { value: number, isPositive: boolean } | null
}) => (
  <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100 group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-lg ${color} group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="text-white" size={16} />
          </div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
        </div>
        
        {loading ? (
          <div className="mt-2">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {trend && (
                <span className={`text-sm font-medium flex items-center gap-1 ${
                  trend.isPositive ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value).toFixed(1)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{subtitle}</p>
            )}
          </>
        )}
      </div>
    </div>
  </div>
);

const EventCard = ({ 
  title, 
  date, 
  type, 
  participants,
  participantCount,
  maxParticipants,
  id,
  status = 'active'
}: { 
  title: string, 
  date: string, 
  type: string, 
  participants: string,
  participantCount: number,
  maxParticipants: number,
  id: string,
  status?: 'active' | 'upcoming' | 'full'
}) => {
  const occupancyPercentage = Math.min(100, Math.round((participantCount / maxParticipants) * 100));
  
  const getStatusConfig = () => {
    if (occupancyPercentage >= 100) return { color: 'bg-red-500', text: 'Lotado', bgColor: 'bg-red-50 border-red-200' };
    if (occupancyPercentage >= 90) return { color: 'bg-orange-500', text: 'Quase lotado', bgColor: 'bg-orange-50 border-orange-200' };
    if (occupancyPercentage >= 70) return { color: 'bg-yellow-500', text: 'Enchendo', bgColor: 'bg-yellow-50 border-yellow-200' };
    return { color: 'bg-emerald-500', text: 'Disponível', bgColor: 'bg-emerald-50 border-emerald-200' };
  };

  const statusConfig = getStatusConfig();

  return (
    <Link to={`/eventos/${id}`} className="group block">
      <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-5 border border-gray-100 group-hover:border-gray-200 transform group-hover:-translate-y-1">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 text-lg">
              {title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{date}</p>
          </div>
          <div className="ml-3 flex flex-col items-end gap-2">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              type === 'Torneio' 
                ? 'bg-gradient-to-r from-brand-green/20 to-emerald-100 text-brand-green border border-brand-green/20' 
                : 'bg-gradient-to-r from-brand-purple/20 to-purple-100 text-brand-purple border border-brand-purple/20'
            }`}>
              {type}
            </span>
          </div>
        </div>
        
        <div className={`rounded-lg p-4 ${statusConfig.bgColor} transition-all duration-200`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center text-gray-700">
              <Users size={18} className="mr-2 text-gray-600" />
              <span className="font-semibold text-lg">{participantCount}</span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-gray-600">{maxParticipants}</span>
            </div>
            <span className="text-xs font-medium text-gray-600 bg-white/70 px-2 py-1 rounded-full">
              {occupancyPercentage}% ocupado
            </span>
          </div>
          
          <div className="relative">
            <div className="w-full bg-white/60 rounded-full h-2.5 shadow-inner">
              <div 
                className={`${statusConfig.color} h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm`}
                style={{ width: `${occupancyPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {occupancyPercentage >= 90 && (
            <div className="flex items-center text-xs mt-3 font-medium">
              <AlertCircle size={14} className={`mr-2 ${occupancyPercentage >= 100 ? 'text-red-600' : 'text-orange-600'}`} />
              <span className={occupancyPercentage >= 100 ? 'text-red-600' : 'text-orange-600'}>
                {occupancyPercentage >= 100 ? 'Evento lotado!' : 'Poucas vagas restantes!'}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export const Dashboard = () => {
  const { events = [], loading: eventsLoading, fetchEvents } = useEventsStore();
  const { allParticipants = [], loading: participantsLoading, fetchAllParticipants } = useParticipantsStore();
  const { transactions = [], loading: financialsLoading, fetchAllTransactions } = useFinancialsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  // Adicionar estados para controle mais granular do carregamento
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [participantsLoaded, setParticipantsLoaded] = useState(false);
  const [financialsLoaded, setFinancialsLoaded] = useState(false);
  
  // Otimizar o carregamento dos dados separando-os em operações independentes
  useEffect(() => {
    const loadEvents = async () => {
      try {
        await fetchEvents();
        setEventsLoaded(true);
      } catch (error) {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar eventos'
        });
      }
    };
    
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    // Carregar participantes somente após eventos serem carregados
    if (eventsLoaded) {
      const loadParticipants = async () => {
        try {
          await fetchAllParticipants();
          setParticipantsLoaded(true);
        } catch (error) {
          addNotification({
            type: 'error',
            message: 'Falha ao carregar participantes'
          });
        }
      };
      
      loadParticipants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsLoaded]);
  
  useEffect(() => {
    // Carregar transações apenas quando participantes estiverem carregados
    if (participantsLoaded) {
      const loadTransactions = async () => {
        try {
          await fetchAllTransactions();
          setFinancialsLoaded(true);
        } catch (error) {
          addNotification({
            type: 'error',
            message: 'Falha ao carregar dados financeiros'
          });
        }
      };
      
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantsLoaded]);
  
  // Usar useMemo para evitar cálculos repetidos a cada render
  const upcomingEvents = useMemo(() => {
    // Add a null check before sorting
    if (!events || events.length === 0) return [];
    
    return [...events]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [events]);
  
  // Calcular métricas financeiras de maneira otimizada
  const financialMetrics = useMemo(() => {
    if (!financialsLoaded || !transactions || transactions.length === 0) {
      return { monthlyRevenue: 0, growth: 0 };
    }
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    
    const monthlyRevenue = transactions
      .filter(t => {
        const date = new Date(t.transactionDate);
        return date.getMonth() === thisMonth && 
               date.getFullYear() === thisYear && 
               t.type === 'INCOME' && 
               t.status === 'CONFIRMED';
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const previousMonthRevenue = transactions
      .filter(t => {
        const date = new Date(t.transactionDate);
        const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
        return date.getMonth() === prevMonth && 
               date.getFullYear() === prevYear && 
               t.type === 'INCOME' && 
               t.status === 'CONFIRMED';
      })
      .reduce((sum, t) => sum + t.amount, 0);
    
    const growth = previousMonthRevenue > 0 
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;
      
    return { monthlyRevenue, growth };
  }, [transactions, financialsLoaded]);
  
  // Calcular estatísticas adicionais para participantes
  const participantStats = useMemo(() => {
    if (!participantsLoaded || !allParticipants || allParticipants.length === 0) {
      return { totalConfirmed: 0, totalPending: 0, avgPerEvent: 0 };
    }
    
    const totalConfirmed = allParticipants.filter((p: Participant) => p.paymentStatus === 'CONFIRMED').length;
    const totalPending = allParticipants.length - totalConfirmed;
    const avgPerEvent = events && events.length > 0 ? Math.round(allParticipants.length / events.length) : 0;
    
    return { totalConfirmed, totalPending, avgPerEvent };
  }, [allParticipants, events, participantsLoaded]);

  // Format date for display
  const formatDate = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} - ${timeString}`;
  };
  
  // Format currency
  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  // Renderização progressiva - mostrar conteúdo conforme ele está disponível
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Visão geral dos seus eventos e estatísticas</p>
          </div>
          <Link to="/eventos/novo">
            <button className="bg-gradient-to-r from-brand-green to-emerald-600 hover:from-brand-green/90 hover:to-emerald-600/90 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2">
              <span className="text-lg">+</span>
              Novo Evento
            </button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Eventos Ativos" 
            value={events.length} 
            icon={Calendar} 
            color="bg-gradient-to-br from-brand-green to-emerald-600"
            loading={!eventsLoaded || eventsLoading}
          />
          <StatCard 
            title="Total Participantes" 
            value={allParticipants.length} 
            icon={Users} 
            color="bg-gradient-to-br from-brand-purple to-purple-600"
            loading={!participantsLoaded || participantsLoading}
            subtitle={`${participantStats.totalConfirmed} confirmados, ${participantStats.totalPending} pendentes`}
          />
          <StatCard 
            title="Receita Mensal" 
            value={formatCurrency(financialMetrics.monthlyRevenue)} 
            icon={CircleDollarSign} 
            color="bg-gradient-to-br from-brand-orange to-orange-600"
            loading={!financialsLoaded || financialsLoading}
            trend={financialMetrics.growth !== 0 ? {
              value: financialMetrics.growth,
              isPositive: financialMetrics.growth > 0
            } : null}
          />
          <StatCard 
            title="Taxa de Crescimento" 
            value={`${financialMetrics.growth.toFixed(1)}%`} 
            icon={TrendingUp} 
            color="bg-gradient-to-br from-brand-blue to-blue-600"
            loading={!financialsLoaded || financialsLoading}
            trend={financialMetrics.growth !== 0 ? {
              value: financialMetrics.growth,
              isPositive: financialMetrics.growth > 0
            } : null}
          />
        </div>
        </div>
        
        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-brand-purple/20 to-purple-100">
                <Users className="text-brand-purple" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Estatísticas de Participação</h2>
                <p className="text-gray-500 text-sm">Insights sobre seus participantes</p>
              </div>
            </div>
            
            {!participantsLoaded || participantsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:shadow-sm transition-shadow">
                  <p className="text-sm text-gray-600 font-medium">Média por Evento</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{participantStats.avgPerEvent}</p>
                  <p className="text-xs text-gray-500 mt-1">participantes</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 hover:shadow-sm transition-shadow">
                  <p className="text-sm text-emerald-700 font-medium">Taxa de Confirmação</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {allParticipants.length > 0 
                      ? `${Math.round((participantStats.totalConfirmed / allParticipants.length) * 100)}%` 
                      : '0%'}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">dos inscritos</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-brand-green/20 to-emerald-100">
                <Calendar className="text-brand-green" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Distribuição por Tipo</h2>
                <p className="text-gray-500 text-sm">Tipos de eventos organizados</p>
              </div>
            </div>
            
            {!eventsLoaded || eventsLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-brand-green/10 to-emerald-50 border border-emerald-200 hover:shadow-sm transition-shadow">
                  <p className="text-sm text-emerald-700 font-medium">Torneios</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {events.filter(e => e.type === EventType.TOURNAMENT).length}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">eventos ativos</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-brand-purple/10 to-purple-50 border border-purple-200 hover:shadow-sm transition-shadow">
                  <p className="text-sm text-purple-700 font-medium">Bolões</p>
                  <p className="text-2xl font-bold text-purple-800 mt-1">
                    {events.filter(e => e.type === EventType.POOL).length}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">eventos ativos</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-brand-blue/20 to-blue-100">
                <Calendar className="text-brand-blue" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Próximos Eventos</h2>
                <p className="text-gray-500 text-sm">Eventos programados para os próximos dias</p>
              </div>
            </div>
            <Link to="/eventos" className="text-brand-blue hover:text-brand-blue/80 text-sm font-medium transition-colors">
              Ver todos →
            </Link>
          </div>
          
          {!eventsLoaded || eventsLoading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando eventos...</p>
              </div>
            </div>
          ) : upcomingEvents && upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => {
                const eventParticipantCount = participantsLoaded && allParticipants 
                  ? allParticipants.filter((p: Participant) => p.eventId === event.id).length 
                  : 0;
                  
                return (
                  <EventCard 
                    key={event.id} 
                    id={event.id}
                    title={event.title} 
                    date={formatDate(event.date, event.time)} 
                    type={event.type === EventType.TOURNAMENT ? 'Torneio' : 'Bolão'}
                    participants={`${eventParticipantCount}/${event.maxParticipants} inscritos`}
                    participantCount={eventParticipantCount}
                    maxParticipants={event.maxParticipants || 0}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum evento próximo</h3>
              <p className="text-gray-500 mb-6">Que tal criar um novo evento para seus participantes?</p>
              <Link to="/eventos/novo">
                <button className="bg-brand-green hover:bg-brand-green/90 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                  Criar Primeiro Evento
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
  );
};

export default Dashboard;