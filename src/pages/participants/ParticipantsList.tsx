import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Filter, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useParticipantsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';

export const ParticipantsList = () => {
  // Ensure we have a fallback empty array and use the correct method name
  const { allParticipants: participants = [], loading, error, fetchAllParticipants, updateParticipantPayment } = useParticipantsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'paid', 'pending'
  const [eventFilter, setEventFilter] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsProcessing(true);
        await fetchAllParticipants();
      } catch (err) {        addNotification({
          type: 'error',
          message: 'Falha ao carregar participantes'
        });
      } finally {
        setIsProcessing(false);
      }
    };

    loadData();
    // Remover dependências para evitar loops infinitos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  // Usar useMemo para evitar recálculos desnecessários
  // Get unique events for filtering
  const events = useMemo(() => {
    // Add null check before mapping
    if (!participants || participants.length === 0) return [];

    return Array.from(new Set(participants.map(p => p.eventId)))
      .map(eventId => {
        const participant = participants.find(p => p.eventId === eventId);
        return {
          id: eventId,
          name: participant?.eventName || 'Evento Desconhecido'
        };
      });
  }, [participants]);

  // Filtrar participantes de maneira otimizada
  const filteredParticipants = useMemo(() => {
    if (!participants || participants.length === 0) return [];

    return participants.filter(participant => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        participant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (participant.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (participant.phone?.includes(searchTerm) || false);
      
      // Payment status filter
      const matchesPayment = 
        paymentFilter === 'all' || 
        (paymentFilter === 'paid' && participant.paymentStatus === 'CONFIRMED') ||
        (paymentFilter === 'pending' && participant.paymentStatus === 'PENDING');
      
      // Event filter
      const matchesEvent = 
        eventFilter === 'all' || 
        participant.eventId === eventFilter;
      
      return matchesSearch && matchesPayment && matchesEvent;
    });
  }, [participants, searchTerm, paymentFilter, eventFilter]);

  // Otimizar a função de toggle payment - updated to use the correct method name
  const handleTogglePayment = async (participantId: string, currentStatus: 'PENDING' | 'CONFIRMED') => {
    try {
      setIsProcessing(true);
      const newStatus = currentStatus === 'PENDING' ? 'CONFIRMED' : 'PENDING';
      await updateParticipantPayment(participantId, newStatus);
        addNotification({
        type: 'success',
        message: `Status de pagamento ${newStatus === 'CONFIRMED' ? 'confirmado' : 'marcado como pendente'}`
      });
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Falha ao atualizar status de pagamento'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Otimizar a exportação
  const exportParticipants = () => {
    try {
      setIsProcessing(true);
      
      // Evitar processamento síncrono que pode travar a UI
      setTimeout(() => {
        // Create CSV data
        const headers = ['Nome', 'Email', 'Telefone', 'Evento', 'Status de Pagamento', 'Data de Inscrição'];        const csvData = [
          headers.join(','),
          ...filteredParticipants.map(p => [
            p.name?.replace(/,/g, ' ') || '', // Evitar problemas com vírgulas
            p.email?.replace(/,/g, ' ') || '',
            p.phone || '',
            (p.eventName || '').replace(/,/g, ' '),
            p.paymentStatus === 'CONFIRMED' ? 'Pago' : 'Pendente',
            new Date(p.registeredAt).toLocaleString('pt-BR')
          ].join(','))
        ].join('\n');
        
        // Create and download the file
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `participantes.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        addNotification({
          type: 'success',
          message: 'Lista exportada com sucesso!'
        });
        
        setIsProcessing(false);
      }, 100);
    } catch (error) {
      setIsProcessing(false);
      addNotification({
        type: 'error',
        message: 'Erro ao exportar dados'
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (loading || isProcessing) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Participantes</h1>
        <Button onClick={exportParticipants}>
          <Download size={18} className="mr-2" />
          Exportar Dados
        </Button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
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
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">Todos os pagamentos</option>
                <option value="paid">Pagos</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>
            
            <div className="relative">
              <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                className="pl-9 pr-4 py-2 border border-brand-gray rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
              >
                <option value="all">Todos os eventos</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredParticipants && filteredParticipants.length > 0 ? (
            <table className="min-w-full divide-y divide-brand-gray">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Evento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Inscrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray">
                {filteredParticipants.map(participant => (
                  <tr key={participant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-brand-purple/10 flex items-center justify-center">
                          <User size={16} className="text-brand-purple" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-brand-blue">{participant.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{participant.email}</div>
                      <div className="text-xs text-gray-500">{participant.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{participant.eventName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDateTime(participant.registeredAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {participant.paymentStatus === 'CONFIRMED' ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle size={16} className="mr-1" />
                          <span className="text-sm">Pago</span>
                        </span>
                      ) : (
                        <span className="flex items-center text-brand-orange">
                          <XCircle size={16} className="mr-1" />
                          <span className="text-sm">Pendente</span>
                        </span>
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
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-10">
              <User size={48} className="mx-auto text-brand-gray mb-2" />
              <h3 className="text-lg font-medium text-gray-600">Nenhum participante encontrado</h3>
              <p className="text-gray-500 mt-1">
                Tente ajustar os filtros para encontrar participantes.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <h2 className="text-lg font-semibold text-brand-blue mb-4">Estatísticas de Participação</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-brand-gray rounded-lg p-4">
            <div className="text-xl font-bold text-brand-blue">{participants.length}</div>
            <div className="text-sm text-gray-500">Total de Participantes</div>
          </div>
          <div className="border border-brand-gray rounded-lg p-4">
            <div className="text-xl font-bold text-green-600">
              {participants.filter(p => p.paymentStatus === 'CONFIRMED').length}
            </div>
            <div className="text-sm text-gray-500">Inscrições Confirmadas</div>
          </div>
          <div className="border border-brand-gray rounded-lg p-4">
            <div className="text-xl font-bold text-brand-orange">
              {participants.filter(p => p.paymentStatus === 'PENDING').length}
            </div>
            <div className="text-sm text-gray-500">Pagamentos Pendentes</div>
          </div>
        </div>
      </div>
    </div>
  );
};
