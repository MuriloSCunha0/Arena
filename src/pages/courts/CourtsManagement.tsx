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
  Calendar,
  Building,
  Sun,
  Home,
  Users,
  Star,
  Activity
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

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
    surface: 'Areia',
    type: 'BEACH_TENNIS',
    status: 'AVAILABLE',
    indoor: false,
    lighting: true,   // Campo do banco - iluminação padrão
    active: true,
    description: '',
    widthMeters: 8,     // Largura correta para Beach Tennis
    lengthMeters: 16,   // Comprimento correto para Beach Tennis  
    hourlyRate: 120,    // Nome correto conforme banco
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
        type: currentCourt.type || 'BEACH_TENNIS',
        status: currentCourt.status || 'AVAILABLE',
        indoor: currentCourt.indoor,
        lighting: currentCourt.lighting,
        active: currentCourt.active,
        description: currentCourt.description || '',
        widthMeters: currentCourt.widthMeters,
        lengthMeters: currentCourt.lengthMeters,
        hourlyRate: currentCourt.hourlyRate,
      });
    } else if (!isEditMode) {
      setFormData({
        name: '',
        location: '',
        surface: 'Areia',
        type: 'BEACH_TENNIS',
        status: 'AVAILABLE',
        indoor: false,
        lighting: true,
        active: true,
        description: '',
        widthMeters: 8,     // Largura correta para Beach Tennis
        lengthMeters: 16,   // Comprimento correto para Beach Tennis  
        hourlyRate: 120,
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
    } else if (type === 'number') {
      // Converter valores numéricos ou deixar undefined se vazio
      const numericValue = value === '' ? undefined : parseFloat(value);
      setFormData({
        ...formData,
        [name]: numericValue
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
        <div>
          <h1 className="text-2xl font-bold text-blue-900">🏖️ Gerenciamento de Quadras de Beach Tennis</h1>
          <p className="text-gray-600 mt-1">Gerencie suas quadras de beach tennis, configurações e reservas</p>
        </div>
        <Button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600">
          <Plus size={18} className="mr-2" />
          Nova Quadra
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map(court => {
          const getTypeIcon = () => {
            return <Sun size={16} className="text-orange-500" />; // Sempre Beach Tennis
          };

          const getStatusConfig = () => {
            switch (court.status) {
              case 'AVAILABLE':
                return { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Disponível' };
              case 'MAINTENANCE':
                return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Manutenção' };
              case 'OCCUPIED':
                return { bg: 'bg-red-100', text: 'text-red-800', label: 'Ocupada' };
              case 'INACTIVE':
                return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inativa' };
              default:
                return { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Indefinido' };
            }
          };

          const statusConfig = getStatusConfig();

          return (
            <div key={court.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getTypeIcon()}
                  <h2 className="text-lg font-semibold text-gray-900">{court.name}</h2>
                </div>
                <div className="flex items-center space-x-2">
                  {court.indoor && (
                    <div className="flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      <Home size={12} className="mr-1" />
                      Indoor
                    </div>
                  )}
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                    {statusConfig.label}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin size={16} className="mr-2 text-gray-400" />
                  <span>{court.location}</span>
                </div>
                
                {court.surface && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building size={16} className="mr-2 text-gray-400" />
                    <span>Superfície: {court.surface}</span>
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-600">
                  <Users size={16} className="mr-2 text-gray-400" />
                  <span>🏖️ Beach Tennis</span>
                </div>

                {(court.widthMeters && court.lengthMeters) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Star size={16} className="mr-2 text-gray-400" />
                    <span>Dimensões: {court.widthMeters}m × {court.lengthMeters}m</span>
                  </div>
                )}

                {court.hourlyRate && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Activity size={16} className="mr-2 text-gray-400" />
                    <span>Taxa: R$ {court.hourlyRate.toFixed(2)}/hora</span>
                  </div>
                )}
              </div>
              
              {court.description && (
                <div className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded">
                  {court.description}
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewReservations(court.id)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Calendar size={16} className="mr-1" />
                  Reservas
                </Button>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEdit(court)}
                    className="text-gray-600 border-gray-200 hover:bg-gray-50"
                  >
                    <Edit size={16} className="mr-1" />
                    Editar
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(court.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {courts.length === 0 && !loading && (
          <div className="col-span-full bg-gradient-to-br from-orange-50 to-yellow-50 p-12 text-center rounded-lg border-2 border-dashed border-orange-200">
            <div className="text-6xl mb-4">🏖️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma quadra de Beach Tennis cadastrada
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Comece criando sua primeira quadra de beach tennis. Defina as especificações, 
              equipamentos e tarifas para começar a receber jogadores!
            </p>
            <Button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600">
              <Plus size={18} className="mr-2" />
              Criar Primeira Quadra
            </Button>
          </div>
        )}

        {/* Estatísticas das quadras */}
        {courts.length > 0 && (
          <div className="col-span-full bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Estatísticas das Quadras</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {courts.filter(c => c.status === 'AVAILABLE').length}
                </div>
                <div className="text-sm text-gray-600">Disponíveis</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {courts.filter(c => c.status === 'MAINTENANCE').length}
                </div>
                <div className="text-sm text-gray-600">Em Manutenção</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {courts.filter(c => c.status === 'OCCUPIED').length}
                </div>
                <div className="text-sm text-gray-600">Ocupadas</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(courts.reduce((acc, c) => acc + (c.hourlyRate || 0), 0) / courts.length) || 0}
                </div>
                <div className="text-sm text-gray-600">Taxa Média/Hora</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal para adicionar/editar quadra */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={isEditMode ? "Editar Quadra de Beach Tennis" : "Nova Quadra de Beach Tennis"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Quadra *
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Beach Tennis Central"
                icon={<Clipboard size={18} />}
                required
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Localização *
              </label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ex: Arena Principal - Setor A"
                icon={<MapPin size={18} />}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="surface" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Superfície *
              </label>
              <select
                id="surface"
                name="surface"
                value={formData.surface}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="Areia">Areia</option>
                <option value="Areia Fina">Areia Fina</option>
                <option value="Areia Compactada">Areia Compactada</option>
                <option value="Sintético com Areia">Sintético com Areia</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status da Quadra
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="AVAILABLE">🟢 Disponível</option>
                <option value="MAINTENANCE">🟡 Em Manutenção</option>
                <option value="OCCUPIED">🔴 Ocupada</option>
                <option value="INACTIVE">⚫ Inativa</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-3">🏖️ Especificações Beach Tennis</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="width" className="block text-sm font-medium text-gray-700 mb-1">
                  Largura (metros) *
                </label>
                <Input
                  id="widthMeters"
                  name="widthMeters"
                  type="number"
                  step="0.1"
                  min="7"
                  max="9"
                  value={formData.widthMeters || ''}
                  onChange={handleChange}
                  placeholder="8.0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Padrão: 8m (Beach Tennis)</p>
              </div>

              <div>
                <label htmlFor="lengthMeters" className="block text-sm font-medium text-gray-700 mb-1">
                  Comprimento (metros) *
                </label>
                <Input
                  id="lengthMeters"
                  name="lengthMeters"
                  type="number"
                  step="0.1"
                  min="15"
                  max="17"
                  value={formData.lengthMeters || ''}
                  onChange={handleChange}
                  placeholder="16.0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Padrão: 16m (Beach Tennis)</p>
              </div>

              <div>
                <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa por Hora (R$) *
                </label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="10"
                  min="50"
                  value={formData.hourlyRate || ''}
                  onChange={handleChange}
                  placeholder="120.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Valor sugerido: R$ 100-150</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <input
                id="indoor"
                name="indoor"
                type="checkbox"
                checked={formData.indoor}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="indoor" className="ml-2 text-sm text-gray-700">
                🏠 Quadra coberta (Indoor)
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="lighting"
                name="lighting"
                type="checkbox"
                checked={formData.lighting}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="lighting" className="ml-2 text-sm text-gray-700">
                💡 Iluminação artificial
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="active"
                name="active"
                type="checkbox"
                checked={formData.active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                ✅ Quadra ativa
              </label>
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Observações e Características Especiais
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Ex: Quadra com iluminação LED, vestiários próximos, estacionamento..."
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-orange-900 mb-2">🏖️ Equipamentos Inclusos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" defaultChecked />
                Rede oficial
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" defaultChecked />
                Postes
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" />
                Bolas de treino
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" />
                Raquetes para empréstimo
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" />
                Iluminação noturna
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" />
                Vestiários
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" />
                Bebedouro
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 text-orange-600" />
                Banco de reservas
              </label>
            </div>
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
