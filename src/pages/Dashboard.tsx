import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Users, CircleDollarSign, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
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
  subtitle = ''
}: { 
  title: string, 
  value: string | number, 
  icon: React.ElementType, 
  color: string,
  loading?: boolean,
  subtitle?: string
}) => (
  <div className="bg-white rounded-lg shadow p-6 border border-brand-gray">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        {loading ? (
          <div className="mt-2">
            <Loader2 size={20} className="animate-spin text-brand-gray" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-brand-blue mt-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </>
        )}
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="text-white" size={20} />
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
  id 
}: { 
  title: string, 
  date: string, 
  type: string, 
  participants: string,
  participantCount: number,
  maxParticipants: number,
  id: string 
}) => {
  // Calcular a porcentagem de ocupação
  const occupancyPercentage = Math.min(100, Math.round((participantCount / maxParticipants) * 100));
  
  // Determinar a cor da barra de progresso baseado na ocupação
  let progressColor = "bg-green-500";
  if (occupancyPercentage > 90) progressColor = "bg-red-500";
  else if (occupancyPercentage > 70) progressColor = "bg-orange-400";
  else if (occupancyPercentage > 50) progressColor = "bg-yellow-400";

  return (
    <Link to={`/eventos/${id}`} className="block">
      <div className="bg-white rounded-lg shadow p-4 border border-brand-gray hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-brand-blue">{title}</h3>
            <p className="text-sm text-gray-500">{date}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            type === 'Torneio' ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-purple/20 text-brand-purple'
          }`}>
            {type}
          </span>
        </div>
        
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <div className="flex items-center text-gray-700">
              <Users size={16} className="mr-1.5" />
              <span className="font-medium">{participantCount}/{maxParticipants}</span>
            </div>
            <span className="text-xs text-gray-500">{occupancyPercentage}% ocupado</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${progressColor} h-2 rounded-full transition-all duration-300 ease-out`}
              style={{ width: `${occupancyPercentage}%` }}
            ></div>
          </div>
          
          {occupancyPercentage > 90 && (
            <div className="flex items-center text-xs mt-1.5 text-red-500">
              <AlertCircle size={12} className="mr-1" />
              <span>Poucas vagas restantes!</span>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Dashboard</h1>
        <Link to="/eventos/novo">
          <button className="bg-brand-green text-brand-blue px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors">
            + Novo Evento
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Eventos Ativos" 
          value={events.length} 
          icon={Calendar} 
          color="bg-brand-green"
          loading={!eventsLoaded || eventsLoading}
        />
        <StatCard 
          title="Total Participantes" 
          value={allParticipants.length} 
          icon={Users} 
          color="bg-brand-purple"
          loading={!participantsLoaded || participantsLoading}
          subtitle={`${participantStats.totalConfirmed} confirmados, ${participantStats.totalPending} pendentes`}
        />
        <StatCard 
          title="Receita Mensal" 
          value={formatCurrency(financialMetrics.monthlyRevenue)} 
          icon={CircleDollarSign} 
          color="bg-brand-orange"
          loading={!financialsLoaded || financialsLoading}
        />
        <StatCard 
          title="Taxa de Crescimento" 
          value={`${financialMetrics.growth.toFixed(0)}%`} 
          icon={TrendingUp} 
          color="bg-brand-blue"
          loading={!financialsLoaded || financialsLoading}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-brand-gray">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-brand-purple" size={20} />
            <h2 className="text-lg font-semibold text-brand-blue">Estatísticas de Participação</h2>
          </div>
          
          {!participantsLoaded || participantsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 size={32} className="animate-spin text-brand-green" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-brand-gray/30">
                <p className="text-sm text-gray-500">Média por Evento</p>
                <p className="text-xl font-bold text-brand-blue">{participantStats.avgPerEvent} participantes</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 border border-brand-gray/30">
                <p className="text-sm text-gray-500">Taxa de Confirmação</p>
                <p className="text-xl font-bold text-brand-blue">
                  {allParticipants.length > 0 
                    ? `${Math.round((participantStats.totalConfirmed / allParticipants.length) * 100)}%` 
                    : '0%'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-brand-gray">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-brand-green" size={20} />
            <h2 className="text-lg font-semibold text-brand-blue">Distribuição por Tipo</h2>
          </div>
          
          {!eventsLoaded || eventsLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 size={32} className="animate-spin text-brand-green" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-gray-500">Torneios</p>
                <p className="text-xl font-bold text-brand-green">
                  {events.filter(e => e.type === EventType.TOURNAMENT).length} eventos
                </p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <p className="text-sm text-gray-500">Bolões</p>
                <p className="text-xl font-bold text-brand-purple">
                  {events.filter(e => e.type === EventType.POOL).length} eventos
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-brand-gray">
        <h2 className="text-lg font-semibold text-brand-blue mb-4">Próximos Eventos</h2>
        {!eventsLoaded || eventsLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 size={32} className="animate-spin text-brand-green" />
          </div>
        ) : upcomingEvents && upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="text-center py-8 text-gray-500">
            Nenhum evento próximo encontrado
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;