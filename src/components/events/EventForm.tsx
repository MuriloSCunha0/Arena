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
                <option value="GATHERING">Encontro</option>
                <option value="TRAINING">Treino</option>
                <option value="OTHER">Outro</option>
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {courts.map(court => {
                  const isSelected = (formData.courtIds || []).includes(court.id);
                  
                  return (
                    <div
                      key={court.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-all
                        ${isSelected 
                          ? 'bg-brand-green/10 border-brand-green' 
                          : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      onClick={() => handleCourtToggle(court.id)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className={`h-4 w-4 rounded border flex items-center justify-center
                            ${isSelected 
                              ? 'bg-brand-green border-brand-green' 
                              : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                        </div>
                        <div className="ml-2">
                          <div className="font-medium text-sm">{court.name}</div>
                          <div className="text-xs text-gray-500">{court.location}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-sm p-4 border border-dashed border-gray-300 rounded-lg">
                Nenhuma quadra cadastrada. <a href="/quadras" className="text-brand-blue hover:underline">Cadastre quadras</a> para associá-las a este evento.
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
