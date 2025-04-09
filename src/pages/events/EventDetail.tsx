import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  Calendar, ChevronLeft, Users, MapPin, Clock, 
  Share2, Edit, Trash2, DollarSign, Trophy, User, Info, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Event, EventType, TeamFormationType } from '../../types';
import { ParticipantsList } from '../../components/events/ParticipantsList';
import { TournamentBracket } from '../../components/events/TournamentBracket';
import { RegistrationLink } from '../../components/events/RegistrationLink';
import { useEventsStore, useParticipantsStore, useFinancialsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { EventFinancial } from '../../components/events/EventFinancial';

type TabType = 'details' | 'participants' | 'bracket' | 'financials' | 'registration';

export const EventDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  
  const { currentEvent, fetchEventById, deleteEvent, loading, error } = useEventsStore();
  const { fetchParticipantsByEvent, eventParticipants } = useParticipantsStore();
  const { fetchTransactionsByEvent, fetchEventSummary } = useFinancialsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  useEffect(() => {
    if (id) {
      fetchEventById(id).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar detalhes do evento'
        });
        navigate('/eventos');
      });
    }
  }, [id, fetchEventById, addNotification, navigate]);
  
  // Load participants when tab is participants
  useEffect(() => {
    if (activeTab === 'participants' && id) {
      fetchParticipantsByEvent(id).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar participantes'
        });
      });
    }
  }, [activeTab, id, fetchParticipantsByEvent, addNotification]);
  
  // Show errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  // Quando mudar para a aba financeira, garantir que os dados financeiros estão atualizados
  useEffect(() => {
    if (activeTab === 'financials' && id) {
      Promise.all([
        fetchTransactionsByEvent(id),
        fetchEventSummary(id)
      ]).catch(error => {
        console.error('Error fetching financial data:', error);
      });
    }
  }, [activeTab, id, fetchTransactionsByEvent, fetchEventSummary]);
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
  
  const handleDeleteEvent = async () => {
    if (!id) return;
    
    if (window.confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
      try {
        await deleteEvent(id);
        addNotification({
          type: 'success',
          message: 'Evento excluído com sucesso!'
        });
        navigate('/eventos');
      } catch (err) {
        addNotification({
          type: 'error',
          message: 'Erro ao excluir evento. Tente novamente.'
        });
      }
    }
  };
  
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'details', label: 'Detalhes', icon: Info },
    { id: 'participants', label: 'Participantes', icon: Users },
    { id: 'bracket', label: 'Chaveamento', icon: Trophy },
    { id: 'financials', label: 'Financeiro', icon: DollarSign },
    { id: 'registration', label: 'Inscrições', icon: Share2 },
  ];
  
  if (loading || !currentEvent) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/eventos')}
            className="mr-4 p-2 rounded-full hover:bg-brand-gray/30"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-brand-blue">{currentEvent.title}</h1>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar size={16} className="mr-1" />
              <span>{formatDate(currentEvent.date)} • {currentEvent.time}</span>
              <MapPin size={16} className="ml-3 mr-1" />
              <span>{currentEvent.location}</span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link to={`/eventos/${id}/editar`}>
            <Button variant="outline">
              <Edit size={18} className="mr-1" />
              Editar
            </Button>
          </Link>
          <Button variant="danger" onClick={handleDeleteEvent}>
            <Trash2 size={18} className="mr-1" />
            Excluir
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow border border-brand-gray">
        <div className="border-b border-brand-gray">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`
                  flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'text-brand-green border-b-2 border-brand-green' 
                    : 'text-gray-500 hover:text-brand-blue hover:bg-gray-50'}
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-brand-blue mb-2">Sobre o Evento</h2>
                  <p className="text-gray-600">{currentEvent.description}</p>
                </div>
                
                <div>
                  <h2 className="text-lg font-semibold text-brand-blue mb-2">Regras</h2>
                  <p className="text-gray-600">{currentEvent.rules}</p>
                </div>
                
                <div>
                  <h2 className="text-lg font-semibold text-brand-blue mb-2">Categorias</h2>
                  <div className="flex flex-wrap gap-2">
                    {currentEvent.categories.map(category => (
                      <span 
                        key={category} 
                        className="bg-brand-purple/10 text-brand-purple text-xs px-3 py-1 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-brand-gray">
                  <h2 className="text-lg font-semibold text-brand-blue mb-4">Informações do Evento</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Calendar size={20} className="text-brand-purple mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-brand-blue">Data e Hora</p>
                        <p className="text-gray-600">{formatDate(currentEvent.date)} às {currentEvent.time}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin size={20} className="text-brand-purple mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-brand-blue">Local</p>
                        <p className="text-gray-600">{currentEvent.location}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <DollarSign size={20} className="text-brand-purple mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-brand-blue">Valor da Inscrição</p>
                        <p className="text-gray-600">R$ {currentEvent.price}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Users size={20} className="text-brand-purple mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-brand-blue">Participantes</p>
                        <p className="text-gray-600">{eventParticipants.length} / {currentEvent.maxParticipants} inscritos</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Trophy size={20} className="text-brand-purple mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-brand-blue">Premiação</p>
                        <p className="text-gray-600">{currentEvent.prize}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <User size={20} className="text-brand-purple mr-3 mt-1" />
                      <div>
                        <p className="font-medium text-brand-blue">Formação de Duplas</p>
                        <p className="text-gray-600">
                          {currentEvent.teamFormation === TeamFormationType.FORMED ? 'Duplas formadas' : 'Duplas aleatórias'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'participants' && <ParticipantsList eventId={id || ''} />}
          
          {activeTab === 'bracket' && <TournamentBracket eventId={id || ''} />}
          
          {activeTab === 'financials' && <EventFinancial eventId={id || ''} />}
          
          {activeTab === 'registration' && <RegistrationLink event={currentEvent} />}
        </div>
      </div>
    </div>
  );
};
