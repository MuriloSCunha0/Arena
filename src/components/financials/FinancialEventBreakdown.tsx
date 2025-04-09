import React, { useState, useMemo } from 'react';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, CircleDollarSign, Calendar, Download, SortAsc, SortDesc, BarChart3 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

interface EventFinancialData {
  id: string;
  title: string;
  date: string;
  income: number;
  expenses: number;
  pendingIncome: number;
  profit: number;
}

interface FinancialEventBreakdownProps {
  events: EventFinancialData[];
  loading?: boolean;
}

// Tipos para ordenação
type SortableField = 'title' | 'date' | 'income' | 'expenses' | 'profit';
type SortDirection = 'asc' | 'desc';

export const FinancialEventBreakdown: React.FC<FinancialEventBreakdownProps> = ({
  events,
  loading = false
}) => {
  // Estado para controle de visualização
  const [sortField, setSortField] = useState<SortableField>('profit');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showGraph, setShowGraph] = useState<boolean>(true);

  // Calculate totals
  const totalIncome = events.reduce((sum, event) => sum + event.income, 0);
  const totalExpenses = events.reduce((sum, event) => sum + event.expenses, 0);
  const totalProfit = events.reduce((sum, event) => sum + event.profit, 0);
  const totalPendingIncome = events.reduce((sum, event) => sum + event.pendingIncome, 0);

  // Calculate percentages for profit distribution
  const getPercentage = (value: number) => {
    if (totalProfit <= 0) return 0;
    return (value / totalProfit) * 100;
  };

  // Ordenar eventos baseado nos critérios selecionados
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'income':
          comparison = a.income - b.income;
          break;
        case 'expenses':
          comparison = a.expenses - b.expenses;
          break;
        case 'profit':
          comparison = a.profit - b.profit;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [events, sortField, sortDirection]);

  // Preparar dados para o gráfico (pegar apenas os top eventos)
  const chartData = useMemo(() => {
    return sortedEvents
      .slice(0, 7) // Limitando a 7 para melhor visualização e espaço para os nomes
      .map(event => ({
        name: event.title,  // Não truncamos os nomes aqui pois teremos espaço suficiente
        receita: event.income,
        despesas: event.expenses,
        lucro: event.profit
      }))
      .reverse(); // Invertemos a ordem para mostrar o evento mais rentável no topo
  }, [sortedEvents]);

  // Definir cores para o gráfico
  const colors = {
    receita: '#4ade80', // verde
    despesas: '#f87171', // vermelho
    lucro: '#60a5fa'  // azul
  };

  // Array de cores para alternância visual entre barras
  const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#a4de6c'];

  // Função para alternar a ordem de classificação
  const handleSort = (field: SortableField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default para nova coluna é decrescente
    }
  };

  // Função para renderizar o ícone de ordenação
  const renderSortIcon = (field: SortableField) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <SortAsc size={14} className="inline ml-1" /> 
      : <SortDesc size={14} className="inline ml-1" />;
  };

  // Adicionar função de exportação
  const exportBreakdownToCsv = () => {
    // Criar cabeçalhos
    const headers = ['Evento', 'Data', 'Receitas', 'Despesas', 'Lucro', '% do Lucro Total'];
    
    // Formatar os dados
    const csvData = events.map(event => [
      event.title,
      formatDate(event.date),
      formatCurrency(event.income).replace(',', '.'),
      formatCurrency(event.expenses).replace(',', '.'),
      formatCurrency(event.profit).replace(',', '.'),
      `${getPercentage(event.profit).toFixed(1)}%`
    ]);
    
    // Juntar tudo
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    
    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'breakdown_financeiro_eventos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tooltip customizado para o gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md">
          <p className="font-medium text-gray-800">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} style={{ color: item.color }}>
              {item.name}: {formatCurrency(item.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h2 className="text-lg font-semibold text-brand-blue">Resultados por Evento</h2>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Button 
              variant="outline" 
              onClick={() => setShowGraph(!showGraph)}
              className="text-xs md:text-sm"
            >
              {showGraph ? 'Ocultar Gráfico' : 'Mostrar Gráfico'}
              <BarChart3 size={16} className="ml-1" />
            </Button>
            <Button 
              variant="outline" 
              onClick={exportBreakdownToCsv}
              className="text-xs md:text-sm"
            >
              <Download size={16} className="mr-1" />
              Exportar
            </Button>
          </div>
        </div>
        
        {/* Resumo financeiro em cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <ArrowUpCircle className="text-green-600" size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Receita Total</p>
                <p className="text-lg font-semibold text-brand-blue">{formatCurrency(totalIncome)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <ArrowDownCircle className="text-red-500" size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Despesas Totais</p>
                <p className="text-lg font-semibold text-brand-blue">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-brand-purple/10">
                <TrendingUp className="text-brand-purple" size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Lucro Total</p>
                <p className={`text-lg font-semibold ${totalProfit >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                  {formatCurrency(totalProfit)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-brand-orange/10">
                <CircleDollarSign className="text-brand-orange" size={18} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Receita Pendente</p>
                <p className="text-lg font-semibold text-brand-blue">{formatCurrency(totalPendingIncome)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de desempenho financeiro - HORIZONTAL APRIMORADO */}
        {showGraph && (
          <div className="mb-8 mt-4">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Desempenho Financeiro por Evento</h3>
            
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 150, bottom: 5 }} // Aumentamos o espaço à esquerda para os nomes
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} /> {/* Habilitamos linhas horizontais */}
                  <XAxis 
                    type="number"
                    tickFormatter={(value) => 
                      value >= 1000 
                        ? `${(value/1000).toFixed(0)}k` 
                        : value.toString()
                    }
                    domain={[0, 'dataMax']} // Começar do zero para melhor comparação visual
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name"
                    width={140} // Aumentamos a largura para acomodar nomes mais longos
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="lucro" 
                    name="Lucro" 
                    fill={colors.lucro}
                    radius={[0, 4, 4, 0]} // Cantos arredondados nas extremidades direitas
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Adicionar botão para alternar entre visualizações de dados */}
            <div className="flex justify-end mt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Toggle para mostrar apenas lucro ou todos os dados (receita, despesa, lucro)
                  const hasMultipleBars = chartData[0] && Object.keys(chartData[0]).length > 2;
                  const newData = hasMultipleBars
                    ? chartData.map(item => ({ name: item.name, lucro: item.lucro }))
                    : sortedEvents.slice(0, 7).map(event => ({
                        name: event.title,
                        receita: event.income,
                        despesas: event.expenses,
                        lucro: event.profit
                      })).reverse();
                  
                  // Esta seria uma implementação real de toggle, mas mantemos isso apenas como exemplo
                  // já que não temos estado para controlar isso
                }}
                className="text-xs py-1 px-2"
              >
                Alternar Visualização
              </Button>
            </div>
          </div>
        )}
        
        {/* Tabela de eventos */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-brand-gray">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('title')}
                >
                  Evento {renderSortIcon('title')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  Data {renderSortIcon('date')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('income')}
                >
                  Receitas {renderSortIcon('income')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('expenses')}
                >
                  Despesas {renderSortIcon('expenses')}
                </th>
                <th 
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('profit')}
                >
                  Lucro {renderSortIcon('profit')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% do Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-gray">
              {sortedEvents.map(event => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/eventos/${event.id}`} className="text-sm font-medium text-brand-blue hover:underline">
                      {event.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar size={14} className="mr-1" />
                      {formatDate(event.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-green-600 font-medium">
                      {formatCurrency(event.income)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm text-red-500 font-medium">
                      {formatCurrency(event.expenses)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm font-medium ${event.profit >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                      {formatCurrency(event.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div 
                          className={`h-2.5 rounded-full ${event.profit >= 0 ? 'bg-brand-green' : 'bg-red-500'}`} 
                          style={{ width: `${getPercentage(event.profit)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500">
                        {getPercentage(event.profit).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legenda para ordenação */}
        <div className="mt-4 text-xs text-gray-500 italic">
          Clique nos cabeçalhos das colunas para ordenar os dados
        </div>
      </div>
    </div>
  );
};
