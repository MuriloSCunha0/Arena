import React, { useState } from 'react';
import { CircleDollarSign, FileText, Calendar, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useFinancialsStore } from '../../store';
import { FinancialTransaction, Event } from '../../types';

interface AddTransactionFormProps {
  eventId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  events?: Event[];
}

export const AddTransactionForm: React.FC<AddTransactionFormProps> = ({ 
  eventId, 
  onSuccess, 
  onCancel,
  events = []
}) => {
  const { addTransaction, loading } = useFinancialsStore();
  
  const [formData, setFormData] = useState<Partial<FinancialTransaction>>({
    eventId: eventId || (events.length > 0 ? events[0].id : ''),
    type: 'INCOME',
    description: '',
    amount: 0,
    paymentMethod: 'PIX',
    status: 'CONFIRMED',
    transactionDate: new Date().toISOString(),
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'amount' && type === 'number') {
      setFormData(prev => ({ ...prev, amount: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addTransaction(formData);
      onSuccess();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {events && events.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Evento
          </label>
          <select
            name="eventId"
            value={formData.eventId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
            required
          >
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Transação
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="type"
              value="INCOME"
              checked={formData.type === 'INCOME'}
              onChange={handleChange}
              className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
            />
            <span className="ml-2 text-sm text-gray-700">Receita</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="type"
              value="EXPENSE"
              checked={formData.type === 'EXPENSE'}
              onChange={handleChange}
              className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
            />
            <span className="ml-2 text-sm text-gray-700">Despesa</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <div className="relative">
          <FileText size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Descrição da transação"
            className="pl-10 pr-4 py-2 w-full border border-brand-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valor (R$)
        </label>
        <div className="relative">
          <CircleDollarSign size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            className="pl-10 pr-4 py-2 w-full border border-brand-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data da Transação
        </label>
        <div className="relative">
          <Calendar size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            name="transactionDate"
            value={formData.transactionDate ? formData.transactionDate.split('T')[0] : ''}
            onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: `${e.target.value}T00:00:00Z` }))}
            className="pl-10 pr-4 py-2 w-full border border-brand-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Método de Pagamento
        </label>
        <div className="relative">
          <CreditCard size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleChange}
            className="pl-10 pr-4 py-2 w-full border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
            required
          >
            <option value="PIX">PIX</option>
            <option value="CARD">Cartão</option>
            <option value="CASH">Dinheiro</option>
            <option value="OTHER">Outro</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="status"
              value="CONFIRMED"
              checked={formData.status === 'CONFIRMED'}
              onChange={handleChange}
              className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
            />
            <span className="ml-2 text-sm text-gray-700">Confirmado</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="status"
              value="PENDING"
              checked={formData.status === 'PENDING'}
              onChange={handleChange}
              className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
            />
            <span className="ml-2 text-sm text-gray-700">Pendente</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button 
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Transação'
          )}
        </Button>
      </div>
    </form>
  );
};
