import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart3, Calendar, Download, Users, CircleDollarSign, 
  TrendingUp, Trophy, Filter, RefreshCw, Loader2, 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEventsStore, useParticipantsStore, useFinancialsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { formatCurrency } from '../../utils/formatters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

export const ReportsDashboard = () => {
  const { events = [], loading: eventsLoading, fetchEvents } = useEventsStore();
  const { allParticipants = [], loading: participantsLoading, fetchAllParticipants } = useParticipantsStore();
  const { transactions = [], loading: financialsLoading, fetchAllTransactions } = useFinancialsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Load all required data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setDataError(null);
      
      try {
        // Paralelizando o carregamento de dados para maior eficiência
        await Promise.all([fetchEvents(), fetchAllParticipants(), fetchAllTransactions()]);
      } catch (error) {
        console.error('Error loading report data:', error);
        setDataError('Falha ao carregar dados para relatórios');
        addNotification({
          type: 'error',
          message: 'Falha ao carregar dados para relatórios'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Usamos useMemo para cálculos de dados que dependem dos dados carregados
  const eventStats = useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalEvents: 0,
        upcomingEvents: 0,
        pastEvents: 0,
      };
    }
    
    const now = new Date();
    
    return {
      totalEvents: events.length,
      upcomingEvents: events.filter(e => new Date(e.date) > now).length,
      pastEvents: events.filter(e => new Date(e.date) <= now).length,
    };
  }, [events]);
  
  const participantStats = useMemo(() => {
    if (!allParticipants || allParticipants.length === 0) {
      return {
        totalParticipants: 0,
        confirmedParticipants: 0,
        pendingParticipants: 0,
      };
    }
    
    return {
      totalParticipants: allParticipants.length,
      confirmedParticipants: allParticipants.filter(p => p.paymentStatus === 'CONFIRMED').length,
      pendingParticipants: allParticipants.filter(p => p.paymentStatus === 'PENDING').length,
    };
  }, [allParticipants]);
  
  const financialStats = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
      };
    }
    
    const incomeTotal = transactions
      .filter(t => t.type === 'INCOME' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expensesTotal = transactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      totalIncome: incomeTotal,
      totalExpenses: expensesTotal,
      netProfit: incomeTotal - expensesTotal,
    };
  }, [transactions]);

  const eventPerformanceData = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    return events.slice(0, 5).map(event => {
      const eventParticipants = allParticipants.filter(p => p.eventId === event.id);
      const eventIncome = transactions
        .filter(t => t.eventId === event.id && t.type === 'INCOME' && t.status === 'CONFIRMED')
        .reduce((sum, t) => sum + t.amount, 0);
        
      return {
        name: event.title,
        participantes: eventParticipants.length,
        receita: eventIncome,
        taxaOcupacao: eventParticipants.length / (event.maxParticipants || 1) * 100
      };
    });
  }, [events, allParticipants, transactions]);
  
  const financialTimelineData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    // Define proper types for the months object to avoid index errors
    interface MonthData {
      receitas: number;
      despesas: number;
    }
    
    const months: Record<string, MonthData> = {};
    
    transactions.forEach(t => {
      const date = new Date(t.transactionDate);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!months[monthYear]) {
        months[monthYear] = { receitas: 0, despesas: 0 };
      }
      
      if (t.status === 'CONFIRMED') {
        if (t.type === 'INCOME') {
          months[monthYear].receitas += t.amount;
        } else {
          months[monthYear].despesas += t.amount;
        }
      }
    });
    
    return Object.entries(months).map(([month, data]) => ({
      name: month,
      receitas: data.receitas,
      despesas: data.despesas,
      lucroLiquido: data.receitas - data.despesas
    }));
  }, [transactions]);
  
  const eventTypeData = useMemo(() => {
    if (!events || events.length === 0) return [];
    
    const typeCount: Record<string, number> = events.reduce((acc: Record<string, number>, event) => {
      const type = event.type === 'TOURNAMENT' ? 'Torneio' : 'Bolão';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(typeCount).map(([name, value]) => ({ 
      name, 
      value 
    }));
  }, [events]);
  
  const categoriesData = useMemo(() => {
    if (!events || events.length === 0) return [];

    // Explicitly type the accumulator
    const categoryCount = events.reduce((acc: Record<string, number>, event) => {
      // Check if event.categories exists and is an array
      if (event.categories && Array.isArray(event.categories)) {
        event.categories.forEach(category => {
          // Ensure category is a string before using as key
          if (typeof category === 'string') {
             acc[category] = (acc[category] || 0) + 1;
          }
        });
      }
      return acc;
    }, {}); // Initial value is an empty object

    return Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({
        name,
        value
      }));
  }, [events]);

  if (isLoading || eventsLoading || participantsLoading || financialsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }
  
  if (dataError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-medium">Erro ao carregar relatórios</p>
        <p className="text-sm mt-1">{dataError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Relatórios e Análises</h1>
        <Button onClick={() => setIsLoading(true)} variant="outline" disabled={isLoading}>
          <RefreshCw size={18} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-lg shadow border border-brand-gray">
        <div className="flex items-center">
          <Calendar size={18} className="text-brand-purple mr-2" />
          <span className="font-medium text-brand-blue">Período:</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
          <div className="relative">
            <input
              type="date"
              className="pl-3 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <span className="self-center mx-2">até</span>
          <div className="relative">
            <input
              type="date"
              className="pl-3 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <Button 
            className="ml-2" 
            disabled={isLoading}
          >
            <Filter size={16} className="mr-1" />
            Aplicar
          </Button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              <BarChart3 size={20} className="mr-2" />
              Desempenho de Eventos
            </h2>
            <p className="text-sm text-gray-500">Análise de participação e receita por evento</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-2 sm:mt-0"
          >
            <Download size={16} className="mr-1" />
            Exportar
          </Button>
        </div>
        
        <div className="aspect-[2/1] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={eventPerformanceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name"
                angle={-45} 
                textAnchor="end" 
                height={70}
              />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip />
              <Legend />
              <Bar dataKey="participantes" yAxisId="left" fill="#8884d8" />
              <Bar dataKey="receita" yAxisId="right" fill="#82ca9d" />
              <Bar dataKey="taxaOcupacao" yAxisId="right" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              <CircleDollarSign size={20} className="mr-2" />
              Análise Financeira
            </h2>
            <p className="text-sm text-gray-500">Receitas e despesas ao longo do tempo</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-2 sm:mt-0"
          >
            <Download size={16} className="mr-1" />
            Exportar
          </Button>
        </div>
        
        <div className="aspect-[2/1] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={financialTimelineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                dataKey="receitas"
                type="monotone" 
                stroke="#82ca9d" 
                strokeWidth={2} 
                activeDot={{ r: 8 }} 
              />
              <Line 
                dataKey="despesas"
                type="monotone" 
                stroke="#ff7300" 
                strokeWidth={2} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              <Users size={20} className="mr-2" />
              Métricas de Participação
            </h2>
            <p className="text-sm text-gray-500">Análise de participantes por categoria e tipo de evento</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-2 sm:mt-0"
          >
            <Download size={16} className="mr-1" />
            Exportar
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="aspect-[4/3] w-full">
            <h3 className="text-center text-brand-blue font-medium mb-2">Distribuição por Tipo de Evento</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eventTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                >
                  {eventTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#00C49F' : '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="aspect-[4/3] w-full">
            <h3 className="text-center text-brand-blue font-medium mb-2">Top 5 Categorias</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoriesData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              <TrendingUp size={20} className="mr-2" />
              Indicadores de Desempenho
            </h2>
            <p className="text-sm text-gray-500">Métricas chave para avaliação dos eventos</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm text-gray-500 font-medium">Taxa de Conversão de Pagamento</h3>
            <p className="text-2xl font-bold text-brand-blue mt-1">
              {participantStats.totalParticipants > 0
                ? `${((participantStats.confirmedParticipants / participantStats.totalParticipants) * 100).toFixed(1)}%`
                : '0%'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Participantes com pagamento confirmado
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm text-gray-500 font-medium">Receita Média por Evento</h3>
            <p className="text-2xl font-bold text-brand-blue mt-1">
              {eventStats.totalEvents > 0
                ? formatCurrency(financialStats.totalIncome / eventStats.totalEvents)
                : formatCurrency(0)
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Total de receitas / número de eventos
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-sm text-gray-500 font-medium">Participantes por Evento</h3>
            <p className="text-2xl font-bold text-brand-blue mt-1">
              {eventStats.totalEvents > 0
                ? (participantStats.totalParticipants / eventStats.totalEvents).toFixed(1)
                : '0'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Média de participantes por evento
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
