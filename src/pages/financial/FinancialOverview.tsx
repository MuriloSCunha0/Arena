import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CircleDollarSign, ArrowUpCircle, ArrowDownCircle, 
  Calendar, Download, Search, Filter, Loader2,
  ChevronDown, PlusCircle, Clock
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AddTransactionForm } from '../../components/events/AddTransactionForm';
import { useFinancialsStore, useEventsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { formatCurrency, formatDateTime, formatPaymentMethod } from '../../utils/formatters';
import { FinancialSummaryCard } from '../../components/financials/FinancialSummaryCard';
import { FinancialEventBreakdown } from '../../components/financials/FinancialEventBreakdown';

export const FinancialOverview = () => {
  const { 
    transactions, 
    loading, 
    error, 
    fetchAllTransactions 
  } = useFinancialsStore();
  
  const { events, loading: eventsLoading, fetchEvents } = useEventsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'income', 'expense'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'pending'
  const [dateFilter, setDateFilter] = useState('all'); // 'all', 'thisMonth', 'lastMonth'
  const [eventFilter, setEventFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  useEffect(() => {
    Promise.all([
      fetchAllTransactions(),
      fetchEvents()
    ]).catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar dados financeiros'
      });
    });
  }, [fetchAllTransactions, fetchEvents, addNotification]);
  
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  // Handle adding a new transaction
  const handleAddTransactionSuccess = () => {
    setShowAddModal(false);
    fetchAllTransactions().catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao atualizar dados financeiros'
      });
    });
  };

  // Filter transactions based on all filters
  const filteredTransactions = transactions.filter(transaction => {
    // Search filter
    const matchesSearch = 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.eventName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter
    const matchesType = 
      typeFilter === 'all' || 
      (typeFilter === 'income' && transaction.type === 'INCOME') ||
      (typeFilter === 'expense' && transaction.type === 'EXPENSE');
    
    // Status filter
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'confirmed' && transaction.status === 'CONFIRMED') ||
      (statusFilter === 'pending' && transaction.status === 'PENDING');
    
    // Event filter
    const matchesEvent = 
      eventFilter === 'all' || 
      transaction.eventId === eventFilter;
    
    // Date filter
    let matchesDate = true;
    const today = new Date();
    const transactionDate = new Date(transaction.transactionDate);
    
    if (dateFilter === 'thisMonth') {
      matchesDate = 
        transactionDate.getMonth() === today.getMonth() &&
        transactionDate.getFullYear() === today.getFullYear();
    } else if (dateFilter === 'lastMonth') {
      const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
      const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      matchesDate = 
        transactionDate.getMonth() === lastMonth &&
        transactionDate.getFullYear() === lastMonthYear;
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesDate && matchesEvent;
  });
  
  // Calculate financial summary
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME' && t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = filteredTransactions
    .filter(t => t.type === 'EXPENSE' && t.status === 'CONFIRMED')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const pendingIncome = filteredTransactions
    .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const netBalance = totalIncome - totalExpense;

  // Generate data for financial breakdown by event
  const eventBreakdownData = events.map(event => {
    const eventTransactions = transactions.filter(t => t.eventId === event.id);
    
    const income = eventTransactions
      .filter(t => t.type === 'INCOME' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expenses = eventTransactions
      .filter(t => t.type === 'EXPENSE' && t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const pendingIncome = eventTransactions
      .filter(t => t.type === 'INCOME' && t.status === 'PENDING')
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      income,
      expenses,
      pendingIncome,
      profit: income - expenses
    };
  }).sort((a, b) => b.profit - a.profit); // Sort by profit (highest first)
  
  // Export financial data to CSV
  const exportFinancials = () => {
    // Create CSV data
    const headers = ['Data', 'Descrição', 'Evento', 'Tipo', 'Método', 'Status', 'Valor'];
    const csvData = [
      headers.join(','),
      ...filteredTransactions.map(t => [
        formatDateTime(t.transactionDate),
        t.description,
        t.eventName || '',
        t.type === 'INCOME' ? 'Receita' : 'Despesa',
        t.paymentMethod,
        t.status === 'CONFIRMED' ? 'Confirmado' : 'Pendente',
        `${t.type === 'INCOME' ? '+' : '-'}${formatCurrency(t.amount)}`
      ].join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'financeiro.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification({
      type: 'success',
      message: 'Relatório financeiro exportado com sucesso!'
    });
  };
  
  if (loading || eventsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Financeiro</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBreakdown(!showBreakdown)}>
            {showBreakdown ? 'Ver Transações' : 'Ver Breakdowns'}
          </Button>
          <Button variant="outline" onClick={exportFinancials}>
            <Download size={18} className="mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle size={18} className="mr-2" />
            Nova Transação
          </Button>
        </div>
      </div>
      
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinancialSummaryCard
          title="Receita Total"
          value={totalIncome}
          icon={ArrowUpCircle}
          color="bg-green-600"
          bgColor="bg-green-100"
          loading={loading}
        />
        
        <FinancialSummaryCard
          title="Despesas"
          value={totalExpense}
          icon={ArrowDownCircle}
          color="bg-red-500"
          bgColor="bg-red-100"
          loading={loading}
        />
        
        <FinancialSummaryCard
          title="Saldo"
          value={netBalance}
          icon={CircleDollarSign}
          color={`${netBalance >= 0 ? 'bg-brand-green' : 'bg-red-500'}`}
          bgColor={`${netBalance >= 0 ? 'bg-brand-green/10' : 'bg-red-500/10'}`}
          loading={loading}
        />
        
        <FinancialSummaryCard
          title="Receita Pendente"
          value={pendingIncome}
          icon={Clock}
          color="bg-brand-orange"
          bgColor="bg-brand-orange/10"
          loading={loading}
        />
      </div>
      
      {showBreakdown ? (
        <FinancialEventBreakdown events={eventBreakdownData} loading={loading} />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
          <h2 className="text-lg font-semibold text-brand-blue mb-4">Transações</h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar transações..."
                className="pl-10 pr-4 py-2 border border-brand-gray rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-green"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-9 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">Todos os tipos</option>
                  <option value="income">Receitas</option>
                  <option value="expense">Despesas</option>
                </select>
              </div>
              
              <div className="relative">
                <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-9 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos os status</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="pending">Pendentes</option>
                </select>
              </div>
              
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-9 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">Todo período</option>
                  <option value="thisMonth">Este mês</option>
                  <option value="lastMonth">Mês passado</option>
                </select>
              </div>
              
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  className="pl-9 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                >
                  <option value="all">Todos os eventos</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredTransactions.length > 0 ? (
              <table className="min-w-full divide-y divide-brand-gray">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-brand-gray">
                  {filteredTransactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDateTime(transaction.transactionDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-brand-blue">{transaction.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {transaction.eventName || (
                            events.find(e => e.id === transaction.eventId)?.title || 'N/A'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatPaymentMethod(transaction.paymentMethod)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.status === 'CONFIRMED' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            Confirmado
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-brand-orange/20 text-brand-orange">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10">
                <CircleDollarSign size={48} className="mx-auto text-brand-gray mb-2" />
                <h3 className="text-lg font-medium text-gray-600">Nenhuma transação encontrada</h3>
                <p className="text-gray-500 mt-1">
                  Ajuste os filtros ou adicione novas transações.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modal para adicionar transação */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nova Transação"
      >
        <AddTransactionForm
          eventId={selectedEventId || (events.length > 0 ? events[0].id : '')}
          onSuccess={handleAddTransactionSuccess}
          onCancel={() => setShowAddModal(false)}
          events={events}
        />
      </Modal>
    </div>
  );
};
