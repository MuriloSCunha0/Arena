import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Calendar, ChevronLeft, Info, MapPin, Clock, 
  DollarSign, Users, Trophy, Tag, Eye
} from 'lucide-react';
import { Event, EventType, TeamFormationType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useEventsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { Modal } from '../../components/ui/Modal';

export const EventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  
  const { createEvent, updateEvent, currentEvent, fetchEventById, clearCurrent, loading, error } = useEventsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Event>>({
    type: EventType.TOURNAMENT,
    title: '',
    description: '',
    location: 'Arena Conexão',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    price: 0,
    maxParticipants: 0,
    prize: '',
    rules: '',
    teamFormation: TeamFormationType.FORMED,
    categories: [],
  });

  const [newCategory, setNewCategory] = useState('');
  
  // Fetch event data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      fetchEventById(id).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar dados do evento'
        });
        navigate('/eventos');
      });
    }
    
    return () => {
      clearCurrent();
    };
  }, [isEditMode, id, fetchEventById, clearCurrent, addNotification, navigate]);

  // Populate form with event data when available
  useEffect(() => {
    if (currentEvent) {
      setFormData(currentEvent);
    }
  }, [currentEvent]);

  // Show errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !formData.categories?.includes(newCategory.trim())) {
      setFormData({
        ...formData,
        categories: [...(formData.categories || []), newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setFormData({
      ...formData,
      categories: formData.categories?.filter(c => c !== category)
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
        await createEvent(formData);
        addNotification({
          type: 'success',
          message: 'Evento criado com sucesso!'
        });
      }
      
      navigate('/eventos');
    } catch (err) {
      addNotification({
        type: 'error',
        message: `Erro ao ${isEditMode ? 'atualizar' : 'criar'} o evento`
      });
    }
  };

  // Preview form
  const handlePreviewForm = () => {
    setShowPreviewModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/eventos')}
            className="mr-4 p-2 rounded-full hover:bg-brand-gray/30"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-brand-blue">
            {isEditMode ? 'Editar Evento' : 'Novo Evento'}
          </h1>
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={handlePreviewForm}
          disabled={!formData.title}
        >
          <Eye size={18} className="mr-2" />
          Pré-visualizar
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow border border-brand-gray">
        {/* Form content - keeping existing JSX structure */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              <Info size={18} className="mr-2" />
              Informações Básicas
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Evento
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                  required
                >
                  <option value={EventType.TOURNAMENT}>Torneio</option>
                  <option value={EventType.POOL}>Bolão</option>
                </select>
              </div>
              
              <Input
                label="Nome do Evento"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                icon={<Tag size={18} />}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              
              <Input
                label="Local"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                icon={<MapPin size={18} />}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Data"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  icon={<Calendar size={18} />}
                />
                
                <Input
                  type="time"
                  label="Horário"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                  icon={<Clock size={18} />}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-brand-blue flex items-center">
              <Trophy size={18} className="mr-2" />
              Detalhes do Evento
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  label="Valor da Inscrição (R$)"
                  name="price"
                  value={formData.price?.toString()}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                  icon={<DollarSign size={18} />}
                />
                
                <Input
                  type="number"
                  label="Máx. Participantes"
                  name="maxParticipants"
                  value={formData.maxParticipants?.toString()}
                  onChange={handleInputChange}
                  min="0"
                  required
                  icon={<Users size={18} />}
                />
              </div>
              
              <Input
                label="Premiação"
                name="prize"
                value={formData.prize}
                onChange={handleInputChange}
                placeholder="Ex: R$ 2.000 em premiação"
                icon={<Trophy size={18} />}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regras
                </label>
                <textarea
                  name="rules"
                  value={formData.rules}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                  placeholder="Descreva as regras do evento"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formação de Equipes
                </label>
                <select
                  name="teamFormation"
                  value={formData.teamFormation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                  required
                >
                  <option value={TeamFormationType.FORMED}>Duplas formadas</option>
                  <option value={TeamFormationType.RANDOM}>Duplas aleatórias</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categorias
                </label>
                <div className="flex flex-wrap mb-2 gap-2">
                  {formData.categories?.map(category => (
                    <span
                      key={category}
                      className="bg-brand-purple/10 text-brand-purple text-xs px-2 py-1 rounded-full flex items-center"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        className="ml-1 focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                    placeholder="Nova categoria"
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    className="px-3 py-2 bg-brand-purple text-white rounded-lg hover:bg-opacity-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-brand-gray">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/eventos')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            loading={loading}
          >
            {isEditMode ? 'Atualizar' : 'Criar'} Evento
          </Button>
        </div>
      </form>
      
      {/* Modal para pré-visualização do formulário de inscrição */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Pré-visualização do Formulário de Inscrição"
      >
        <div className="bg-white rounded-lg p-6">
          <div className="mb-8 border-b pb-4">
            <h3 className="text-xl font-bold text-brand-blue mb-2">{formData.title}</h3>
            <p className="text-gray-600 mb-4">{formData.description || "Sem descrição disponível"}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start">
                <Calendar size={16} className="text-brand-purple mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Data e Hora</p>
                  <p className="text-gray-600">
                    {formData.date ? new Date(formData.date).toLocaleDateString('pt-BR') : 'N/A'} às {formData.time || 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <MapPin size={16} className="text-brand-purple mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Local</p>
                  <p className="text-gray-600">{formData.location}</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <DollarSign size={16} className="text-brand-purple mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Valor da Inscrição</p>
                  <p className="text-gray-600">
                    {formData.price ? `R$ ${formData.price.toFixed(2).replace('.', ',')}` : 'Gratuito'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Trophy size={16} className="text-brand-purple mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Premiação</p>
                  <p className="text-gray-600">{formData.prize || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-brand-blue">Formulário de Inscrição</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <div className="border border-brand-gray rounded-lg p-2.5 bg-gray-50">
                  Campo de entrada do participante
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="border border-brand-gray rounded-lg p-2.5 bg-gray-50">
                  Campo de entrada do participante
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone *
                </label>
                <div className="border border-brand-gray rounded-lg p-2.5 bg-gray-50">
                  Campo de entrada do participante
                </div>
              </div>
              
              {formData.teamFormation === TeamFormationType.FORMED && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Parceiro (Dupla) *
                  </label>
                  <div className="border border-brand-gray rounded-lg p-2.5 bg-gray-50">
                    Campo de entrada do participante
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pagamento *
                </label>
                <div className="border border-brand-gray rounded-lg p-2.5 bg-gray-50">
                  Seleção: PIX, Cartão, Dinheiro
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-6">
              <p className="text-sm text-gray-500 mb-4">
                Ao concluir sua inscrição, você concorda com os termos e regras deste evento.
              </p>
              
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="w-full"
              >
                Fechar Pré-visualização
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
