import React, { useState, useEffect } from 'react';
import { Search, Download, CheckCircle, AlertCircle, UserPlus, Users, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { AddParticipantForm } from './AddParticipantForm';
import { useParticipantsStore, useFinancialsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { formatDateTime } from '../../utils/formatters';
import { getPaymentMethodFromId } from '../../utils/payments';

interface ParticipantsListProps {
  eventId: string;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ eventId }) => {
  const { 
    eventParticipants: participants,
    loading, 
    error,
    fetchParticipantsByEvent, 
    updateParticipantPayment // Fixed method name from updatePaymentStatus to updateParticipantPayment
  } = useParticipantsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'paid', 'pending'
  const [showAddModal, setShowAddModal] = useState(false);
  
  const { fetchEventSummary } = useFinancialsStore();
  
  useEffect(() => {
    if (eventId) {
      fetchParticipantsByEvent(eventId).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar participantes'
        });
      });
    }
  }, [eventId, fetchParticipantsByEvent, addNotification]);
  
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  const filteredParticipants = participants.filter(participant => {
    // Filter by search term
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        participant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by payment status
    const matchesFilter = filter === 'all' || 
                        (filter === 'paid' && participant.paymentStatus === 'CONFIRMED') ||
                        (filter === 'pending' && participant.paymentStatus === 'PENDING');
    
    return matchesSearch && matchesFilter;
  });
  
  const exportParticipants = () => {
    // Create CSV data
    const headers = ['Nome', 'Email', 'Telefone', 'Status de Pagamento', 'Data de Inscrição'];
    const csvData = [
      headers.join(','),
      ...filteredParticipants.map(p => [
        p.name,
        p.email,
        p.phone,
        p.paymentStatus === 'CONFIRMED' ? 'Pago' : 'Pendente',
        new Date(p.registeredAt).toLocaleString('pt-BR')
      ].join(','))
    ].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `participantes_evento_${eventId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addNotification({
      type: 'success',
      message: 'Lista exportada com sucesso!'
    });
  };
  
  const handleTogglePayment = async (participantId: string, currentStatus: 'PENDING' | 'CONFIRMED') => {
    try {
      const newStatus = currentStatus === 'PENDING' ? 'CONFIRMED' : 'PENDING';
      
      // Confirm before changing status from confirmed to pending
      if (currentStatus === 'CONFIRMED' && !window.confirm('Tem certeza que deseja reverter o pagamento para pendente?')) {
        return;
      }
      
      // The function only accepts 2 arguments, so we can't pass the payment ID directly
      await updateParticipantPayment(participantId, newStatus);
      
      // If payment was confirmed, update the financial summary
      if (newStatus === 'CONFIRMED') {
        await fetchEventSummary(eventId);
      }
      
      addNotification({
        type: 'success',
        message: `Status de pagamento ${newStatus === 'CONFIRMED' ? 'confirmado' : 'atualizado para pendente'}`
      });
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Falha ao atualizar status de pagamento'
      });
    }
  };
  
  const handleAddParticipantSuccess = () => {
    setShowAddModal(false);
    addNotification({
      type: 'success',
      message: 'Participante adicionado com sucesso!'
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar participantes..."
            className="pl-10 pr-4 py-2 border border-brand-gray rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-green"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <div>
            <select
              className="appearance-none bg-white border border-brand-gray rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="paid">Pagos</option>
              <option value="pending">Pendentes</option>
            </select>
          </div>
          
          <Button variant="outline" onClick={exportParticipants}>
            <Download size={18} className="mr-1" />
            Exportar
          </Button>
          
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} className="mr-1" />
            Adicionar
          </Button>
        </div>
      </div>
      
      {filteredParticipants.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow border border-brand-gray">
          <table className="min-w-full divide-y divide-brand-gray">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dupla</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscrição</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagamento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-brand-gray">
              {filteredParticipants.map((participant) => {
                // Find partner information if any
                const partner = participants.find(p => p.id === participant.partnerId);
                
                return (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-brand-blue">{participant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{participant.email}</div>
                      <div className="text-sm text-gray-500">{participant.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{partner ? partner.name : 'Sem dupla'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(participant.registeredAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {participant.paymentStatus === 'CONFIRMED' ? (
                        <div className="flex items-center text-green-600">
                          <CheckCircle size={16} className="mr-1" />
                          <span className="text-sm">
                            Pago em {participant.paymentDate ? formatDateTime(participant.paymentDate) : 'data não registrada'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center text-brand-orange">
                          <AlertCircle size={16} className="mr-1" />
                          <span className="text-sm">Pendente</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button 
                        variant={participant.paymentStatus === 'CONFIRMED' ? 'outline' : 'primary'}
                        className="px-3 py-1 text-xs" 
                        onClick={() => handleTogglePayment(participant.id, participant.paymentStatus)}
                      >
                        {participant.paymentStatus === 'CONFIRMED' ? 'Marcar Pendente' : 'Confirmar Pagamento'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum participante encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comece adicionando participantes ou gere um link de inscrição.
          </p>
          <div className="mt-6">
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlus size={18} className="mr-1" />
              Adicionar Participante
            </Button>
          </div>
        </div>
      )}
      
      {/* Modal para adicionar participante */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="Adicionar Participante"
      >
        <AddParticipantForm 
          eventId={eventId}
          onSuccess={handleAddParticipantSuccess}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
};
