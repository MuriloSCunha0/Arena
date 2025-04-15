import React, { useEffect, useState } from 'react';
import { useCourtsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { Court, CourtReservation } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Clipboard, 
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../utils/formatters';

export const CourtsManagement: React.FC = () => {
  const { 
    courts, 
    currentCourt, 
    reservations,
    loading, 
    error,
    fetchCourts,
    fetchCourtById,
    createCourt,
    updateCourt,
    deleteCourt,
    fetchReservationsByCourt,
    createReservation,
    deleteReservation,
    clearCurrent,
    clearError
  } = useCourtsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [showAddReservationModal, setShowAddReservationModal] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Court>>({
    name: '',
    location: '',
    surface: '',
    indoor: false,
    description: '',
  });
  
  const [reservationData, setReservationData] = useState<Partial<CourtReservation>>({
    title: '',
    start: '',
    end: '',
    status: 'CONFIRMED'
  });
  
  // Buscar quadras ao carregar a página
  useEffect(() => {
    fetchCourts().catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar quadras'
      });
    });
  }, [fetchCourts, addNotification]);
  
  // Mostrar notificação em caso de erro
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
      clearError();
    }
  }, [error, addNotification, clearError]);
  
  // Atualizar o formulário quando estiver editando uma quadra
  useEffect(() => {
    if (isEditMode && currentCourt) {
      setFormData({
        name: currentCourt.name,
        location: currentCourt.location,
        surface: currentCourt.surface || '',
        indoor: currentCourt.indoor,
        description: currentCourt.description || '',
      });
    } else if (!isEditMode) {
      setFormData({
        name: '',
        location: '',
        surface: '',
        indoor: false,
        description: '',
      });
    }
  }, [isEditMode, currentCourt]);
  
  // Abrir modal de edição
  const handleEdit = (court: Court) => {
    setIsEditMode(true);
    fetchCourtById(court.id);
    setShowAddEditModal(true);
  };
  
  // Abrir modal de adição
  const handleAdd = () => {
    setIsEditMode(false);
    clearCurrent();
    setShowAddEditModal(true);
  };
  
  // Excluir quadra
  const handleDelete = async (courtId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta quadra?')) {
      try {
        await deleteCourt(courtId);
        addNotification({
          type: 'success',
          message: 'Quadra excluída com sucesso!'
        });
      } catch (err) {
        addNotification({
          type: 'error',
          message: 'Falha ao excluir quadra'
        });
      }
    }
  };
  
  // Ver reservas de uma quadra
  const handleViewReservations = async (courtId: string) => {
    setSelectedCourtId(courtId);
    try {
      const today = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(today.getMonth() + 1);
      
      await fetchReservationsByCourt(
        courtId,
        today.toISOString(),
        oneMonthLater.toISOString()
      );
      
      setShowReservationsModal(true);
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar reservas'
      });
    }
  };
  
  // Salvar quadra (criar ou atualizar)
  const handleSave = async () => {
    try {
      if (!formData.name || !formData.location) {
        addNotification({
          type: 'warning',
          message: 'Por favor, preencha nome e localização'
        });
        return;
      }
      
      if (isEditMode && currentCourt) {
        await updateCourt(currentCourt.id, formData);
        addNotification({
          type: 'success',
          message: 'Quadra atualizada com sucesso!'
        });
      } else {
        await createCourt(formData);
        addNotification({
          type: 'success',
          message: 'Quadra criada com sucesso!'
        });
      }
      
      setShowAddEditModal(false);
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Falha ao salvar quadra'
      });
    }
  };
  
  // Adicionar reserva
  const handleAddReservation = () => {
    if (!selectedCourtId) return;
    
    setReservationData({
      courtId: selectedCourtId,
      title: '',
      start: '',
      end: '',
      status: 'CONFIRMED'
    });
    
    setShowAddReservationModal(true);
  };
  
  // Salvar reserva
  const handleSaveReservation = async () => {
    try {
      if (!reservationData.title || !reservationData.start || !reservationData.end) {
        addNotification({
          type: 'warning',
          message: 'Por favor, preencha todos os campos'
        });
        return;
      }
      
      await createReservation(reservationData);
      
      addNotification({
        type: 'success',
        message: 'Reserva criada com sucesso!'
      });
      
      setShowAddReservationModal(false);
      
      // Atualizar a lista de reservas
      if (selectedCourtId) {
        const today = new Date();
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(today.getMonth() + 1);
        
        await fetchReservationsByCourt(
          selectedCourtId,
          today.toISOString(),
          oneMonthLater.toISOString()
        );
      }
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Falha ao criar reserva'
      });
    }
  };
  
  // Excluir reserva
  const handleDeleteReservation = async (reservationId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta reserva?')) {
      try {
        await deleteReservation(reservationId);
        
        addNotification({
          type: 'success',
          message: 'Reserva excluída com sucesso!'
        });
        
        // Atualizar a lista de reservas
        if (selectedCourtId) {
          const today = new Date();
          const oneMonthLater = new Date();
          oneMonthLater.setMonth(today.getMonth() + 1);
          
          await fetchReservationsByCourt(
            selectedCourtId,
            today.toISOString(),
            oneMonthLater.toISOString()
          );
        }
      } catch (err) {
        addNotification({
          type: 'error',
          message: 'Falha ao excluir reserva'
        });
      }
    }
  };
  
  // Função para lidar com alterações no formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Função para lidar com alterações no formulário de reserva
  const handleReservationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReservationData({
      ...reservationData,
      [name]: value
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-blue">Gerenciamento de Quadras</h1>
        <Button onClick={handleAdd}>
          <Plus size={18} className="mr-2" />
          Nova Quadra
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map(court => (
          <div key={court.id} className="bg-white p-6 rounded-lg shadow border border-brand-gray">
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              {court.name}
              {court.indoor && (
                <span className="ml-2 bg-brand-purple/20 text-brand-purple text-xs px-2 py-0.5 rounded-full">
                  Indoor
                </span>
              )}
            </h2>
            
            <div className="mt-2 text-sm text-gray-500 flex items-start">
              <MapPin size={16} className="mr-1 mt-0.5 flex-shrink-0" />
              <span>{court.location}</span>
            </div>
            
            {court.surface && (
              <div className="mt-2 text-sm text-gray-500">
                <span className="font-semibold">Superfície:</span> {court.surface}
              </div>
            )}
            
            {court.description && (
              <div className="mt-2 text-sm text-gray-600">
                {court.description}
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleViewReservations(court.id)}
              >
                <Calendar size={16} className="mr-1" />
                Reservas
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEdit(court)}
              >
                <Edit size={16} className="mr-1" />
                Editar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDelete(court.id)}
              >
                <Trash2 size={16} className="mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        ))}
        
        {courts.length === 0 && (
          <div className="col-span-full bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
            <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-800">Nenhuma quadra cadastrada</h3>
            <p className="text-sm text-gray-500 mt-1">
              Adicione quadras para gerenciar reservas e atribuí-las aos jogos do torneio
            </p>
            <Button onClick={handleAdd} className="mt-4">
              <Plus size={18} className="mr-2" />
              Adicionar Quadra
            </Button>
          </div>
        )}
      </div>
      
      {/* Modal para adicionar/editar quadra */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={isEditMode ? "Editar Quadra" : "Nova Quadra"}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome da Quadra
            </label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: Quadra Central"
              icon={<Clipboard size={18} />}
            />
          </div>
          
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Localização
            </label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ex: Arena Principal"
              icon={<MapPin size={18} />}
            />
          </div>
          
          <div>
            <label htmlFor="surface" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Superfície
            </label>
            <select
              id="surface"
              name="surface"
              value={formData.surface}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="">Selecione</option>
              <option value="Saibro">Saibro</option>
              <option value="Grama Sintética">Grama Sintética</option>
              <option value="Hard Court">Hard Court</option>
              <option value="Areia">Areia</option>
              <option value="Grama">Grama</option>
              <option value="Cimento">Cimento</option>
              <option value="Carpete">Carpete</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="indoor"
              name="indoor"
              checked={formData.indoor}
              onChange={(e) => setFormData({...formData, indoor: e.target.checked})}
              className="h-4 w-4 text-brand-green rounded"
            />
            <label htmlFor="indoor" className="ml-2 block text-sm text-gray-700">
              Quadra Coberta (Indoor)
            </label>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Adicione informações adicionais sobre a quadra"
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddEditModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleSave}
            >
              Salvar Quadra
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal para exibir reservas */}
      <Modal
        isOpen={showReservationsModal}
        onClose={() => setShowReservationsModal(false)}
        title={`Reservas - ${courts.find(c => c.id === selectedCourtId)?.name || 'Quadra'}`}
        size="large"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-brand-blue">Próximas Reservas</h3>
            <Button onClick={handleAddReservation}>
              <Plus size={16} className="mr-1" />
              Nova Reserva
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reservations.map(reservation => {
                  const startDate = new Date(reservation.start);
                  const endDate = new Date(reservation.end);
                  
                  // Formatação da data e hora de início e fim
                  const date = formatDate(reservation.start);
                  const startTime = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const endTime = endDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={reservation.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{reservation.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{startTime} - {endTime}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reservation.status === 'CONFIRMED' ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Confirmada
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteReservation(reservation.id)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                
                {reservations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      Nenhuma reserva encontrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button onClick={() => setShowReservationsModal(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Modal para adicionar reserva */}
      <Modal
        isOpen={showAddReservationModal}
        onClose={() => setShowAddReservationModal(false)}
        title="Nova Reserva"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título da Reserva
            </label>
            <Input
              id="title"
              name="title"
              value={reservationData.title || ''}
              onChange={handleReservationChange}
              placeholder="Ex: Treino de Beach Tennis"
            />
          </div>
          
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
              Data e Hora de Início
            </label>
            <Input
              id="start"
              name="start"
              type="datetime-local"
              value={reservationData.start || ''}
              onChange={handleReservationChange}
            />
          </div>
          
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
              Data e Hora de Término
            </label>
            <Input
              id="end"
              name="end"
              type="datetime-local"
              value={reservationData.end || ''}
              onChange={handleReservationChange}
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="CONFIRMED"
                  checked={reservationData.status === 'CONFIRMED'}
                  onChange={handleReservationChange}
                  className="h-4 w-4 text-brand-green border-gray-300 focus:ring-brand-green"
                />
                <span className="ml-2 text-sm text-gray-700">Confirmada</span>
              </label>
              
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="status"
                  value="PENDING"
                  checked={reservationData.status === 'PENDING'}
                  onChange={handleReservationChange}
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
              onClick={() => setShowAddReservationModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={handleSaveReservation}
            >
              Salvar Reserva
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CourtsManagement;
