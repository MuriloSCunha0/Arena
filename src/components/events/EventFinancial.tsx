import React, { useState, useEffect } from 'react';
import { 
  CircleDollarSign, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Search, 
  Filter, 
  PlusCircle,
  Loader2 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AddTransactionForm } from './AddTransactionForm';
import { useFinancialsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { formatCurrency, formatDateTime, formatPaymentMethod, formatPaymentStatus } from '../../utils/formatters';

interface EventFinancialProps {
  eventId: string;
}

export const EventFinancial: React.FC<EventFinancialProps> = ({ eventId }) => {
  const { 
    eventTransactions, 
    financialSummary,
    loading, 
    error,
    fetchTransactionsByEvent,
    fetchEventSummary
  } = useFinancialsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'income', 'expense'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'pending'
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    if (eventId) {
      Promise.all([
        fetchTransactionsByEvent(eventId),
        fetchEventSummary(eventId)
      ]).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar dados financeiros'
        });
      });
    }
  }, [eventId, fetchTransactionsByEvent, fetchEventSummary, addNotification]);

  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  const handleAddTransactionSuccess = () => {
    setShowAddModal(false);
    // Atualizar dados financeiros após adicionar uma transação
    Promise.all([
      fetchTransactionsByEvent(eventId),
      fetchEventSummary(eventId)
    ]).catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao atualizar dados financeiros'
      });
    });
  };

  // Filtrar transações com base nos filtros e busca
  const filteredTransactions = eventTransactions.filter(transaction => {
    // Filtro de busca
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por tipo (receita/despesa)
    const matchesType = 
      typeFilter === 'all' || 
      (typeFilter === 'income' && transaction.type === 'INCOME') ||
      (typeFilter === 'expense' && transaction.type === 'EXPENSE');
    
    // Filtro por status
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'confirmed' && transaction.status === 'CONFIRMED') ||
      (statusFilter === 'pending' && transaction.status === 'PENDING');
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calcula o saldo (receitas - despesas)
  const netBalance = financialSummary.income - financialSummary.expenses;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-blue">Gestão Financeira</h2>
          <p className="text-sm text-gray-500">
            Controle suas receitas e despesas relacionadas ao evento
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <PlusCircle size={18} className="mr-1" />
          Nova Transação
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Receitas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(financialSummary.income)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100">
              <ArrowUpCircle size={24} className="text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Receita pendente: {formatCurrency(financialSummary.pendingIncome)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Despesas</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(financialSummary.expenses)}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100">
              <ArrowDownCircle size={24} className="text-red-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Saldo</p>
              <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                {formatCurrency(netBalance)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-brand-purple/10">
              <CircleDollarSign size={24} className="text-brand-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Tabela de Transações */}
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <h3 className="text-lg font-semibold text-brand-blue mb-4">Transações</h3>
        
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
          
          <div className="flex flex-col sm:flex-row gap-2">
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
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredTransactions.length > 0 ? (
            <table className="min-w-full divide-y divide-brand-gray">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
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
                        {transaction.type === 'INCOME' ? 'Receita' : 'Despesa'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatPaymentMethod(transaction.paymentMethod)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatPaymentStatus(transaction.status)}
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
                Comece adicionando transações para este evento.
              </p>
              <Button 
                onClick={() => setShowAddModal(true)} 
                className="mt-4"
              >
                <PlusCircle size={18} className="mr-1" />
                Adicionar Transação
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal para adicionar transação */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nova Transação"
      >
        <AddTransactionForm
          eventId={eventId}
          onSuccess={handleAddTransactionSuccess}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
};
