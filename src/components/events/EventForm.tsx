import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEventsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Event, EventType, Court } from '../../types';
import { CalendarDays, MapPin, Clock, Users, Check, ArrowLeft, Loader2 } from 'lucide-react';

export const EventForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  const { createEvent, updateEvent, fetchEventById, currentEvent, loading, error } = useEventsStore();
  const { courts, fetchCourts } = useCourtsStore();
  
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: '',
    time: '',
    location: '',
    maxParticipants: 32,
    type: 'TOURNAMENT' as EventType,
    description: '',
    courtIds: [] // Novo campo para armazenar IDs das quadras
  });
  
  const [isEditMode, setIsEditMode] = useState(!!id);
  
  // Buscar dados do evento se estiver em modo de edição
  useEffect(() => {
    if (id) {
      fetchEventById(id).catch((err) => {
        console.error('Error fetching event:', err);
        addNotification({
          type: 'error',
          message: 'Falha ao carregar dados do evento'
        });
      });
    }
    
    // Buscar lista de quadras
    fetchCourts().catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar quadras'
      });
    });
  }, [id, fetchEventById, fetchCourts, addNotification]);
  
  // Update form data when currentEvent changes
  useEffect(() => {
    if (currentEvent && isEditMode) {
      setFormData({
        ...currentEvent,
        courtIds: currentEvent.courts?.map((court: Court) => court.id) || []
      });
    }
  }, [currentEvent, isEditMode]);
  
  // Mostrar notificação de erro se ocorrer
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleCourtToggle = (courtId: string) => {
    setFormData(prev => {
      const courtIds = prev.courtIds || [];
      
      if (courtIds.includes(courtId)) {
        // Remove a quadra se já estiver selecionada
        return {
          ...prev,
          courtIds: courtIds.filter(id => id !== courtId)
        };
      } else {
        // Adiciona a quadra se não estiver selecionada
        return {
          ...prev,
          courtIds: [...courtIds, courtId]
        };
      }
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && id) {
        await updateEvent(id, formData);
        addNotification({
          type: 'success',
          message: 'Evento atualizado com sucesso!'
        });
      } else {
        const newEvent = await createEvent(formData);
        addNotification({
          type: 'success',
          message: 'Evento criado com sucesso!'
        });
        
        // Navegar para a página de detalhes do novo evento
        navigate(`/eventos/${newEvent.id}`);
        return;
      }
      
      // Voltar para a lista de eventos
      navigate('/eventos');
    } catch (error) {
      console.error('Error saving event:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao salvar evento. Tente novamente.'
      });
    }
  };
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-brand-blue">
          {isEditMode ? 'Editar Evento' : 'Novo Evento'}
        </h1>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Título do evento"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            required
            icon={<CalendarDays size={18} />}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="date"
              label="Data"
              name="date"
              value={formData.date || ''}
              onChange={handleChange}
              required
            />
            
            <Input
              type="time"
              label="Horário"
              name="time"
              value={formData.time || ''}
              onChange={handleChange}
              required
              icon={<Clock size={18} />}
            />
          </div>
          
          <Input
            label="Local"
            name="location"
            value={formData.location || ''}
            onChange={handleChange}
            required
            icon={<MapPin size={18} />}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número máximo de participantes
              </label>
              <Input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants || ''}
                onChange={handleChange}
                required
                min={2}
                icon={<Users size={18} />}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de evento
              </label>
              <select
                name="type"
                value={formData.type || 'TOURNAMENT'}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                required
              >
                <option value="TOURNAMENT">Torneio</option>
                <option value="POOL">Bolão</option>
                <option value="SUPER8">Super 8</option>
                <option value="CHAMPIONSHIP">Campeonato</option>
                <option value="FRIENDLY">Amistoso</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="Detalhes sobre o evento..."
            />
          </div>
          
          {/* Seleção de quadras */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quadras disponíveis para este evento
            </label>
            {courts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {courts
                  .filter(court => court.active) // Mostrar apenas quadras ativas
                  .map(court => {
                  const isSelected = (formData.courtIds || []).includes(court.id);
                  
                  const getTypeIcon = () => {
                    switch (court.type) {
                      case 'PADEL': return '🏓';
                      case 'BEACH_TENNIS': return '🏖️';
                      case 'TENNIS': return '🎾';
                      default: return '⚽';
                    }
                  };

                  const getStatusColor = () => {
                    switch (court.status) {
                      case 'AVAILABLE': return 'text-emerald-600';
                      case 'MAINTENANCE': return 'text-yellow-600';
                      case 'OCCUPIED': return 'text-red-600';
                      case 'INACTIVE': return 'text-gray-600';
                      default: return 'text-gray-600';
                    }
                  };
                  
                  return (
                    <div
                      key={court.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all relative
                        ${isSelected 
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                          : 'hover:bg-gray-50 border-gray-200 hover:border-gray-300'
                        }
                        ${court.status !== 'AVAILABLE' ? 'opacity-75' : ''}
                      `}
                      onClick={() => handleCourtToggle(court.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">{getTypeIcon()}</span>
                            <div className="font-medium text-sm text-gray-900">{court.name}</div>
                            {court.indoor && (
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                Indoor
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-600 mb-1">
                            📍 {court.location}
                          </div>
                          
                          {court.surface && (
                            <div className="text-xs text-gray-600 mb-1">
                              🏗️ {court.surface}
                            </div>
                          )}
                          
                          <div className={`text-xs font-medium ${getStatusColor()}`}>
                            {court.status === 'AVAILABLE' ? '✅ Disponível' :
                             court.status === 'MAINTENANCE' ? '🔧 Manutenção' :
                             '🚫 Ocupada'}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center
                            ${isSelected 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-sm p-4 border border-dashed border-gray-300 rounded-lg text-center">
                <div className="mb-2">🏟️ Nenhuma quadra cadastrada</div>
                <div>
                  <a href="/quadras" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                    Cadastre quadras aqui
                  </a> para associá-las a este evento.
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
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
                'Salvar Evento'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
