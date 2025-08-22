import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Trophy,
  DollarSign,
  Users,
  Info,
  UserCheck,
  Grid,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEventsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { traduzirErroSupabase } from '../../lib/supabase';
import { EventType, TeamFormationType } from '../../types';
import { TournamentParticipants } from '../../components/tournaments/TournamentParticipants';
import { TournamentTeams } from '../../components/tournaments/TournamentTeams';
import { TournamentGroups } from '../../components/tournaments/TournamentGroups';

// Helper function to get event type configuration
const getEventTypeConfig = (type: EventType) => {
  switch (type) {
    case EventType.TOURNAMENT:
      return { label: 'Torneio', color: 'bg-blue-100 text-blue-800' };
    case EventType.POOL:
      return { label: 'Pool', color: 'bg-green-100 text-green-800' };
    case EventType.FRIENDLY:
      return { label: 'Amistoso', color: 'bg-purple-100 text-purple-800' };
    case EventType.CHAMPIONSHIP:
      return { label: 'Campeonato', color: 'bg-orange-100 text-orange-800' };
    case EventType.SUPER8:
      return { label: 'Super 8', color: 'bg-red-100 text-red-800' };
    default:
      return { label: type, color: 'bg-gray-100 text-gray-800' };
  }
};

type TabType = 'details' | 'participants' | 'teams' | 'groups';

export const TournamentDetail: React.FC = () => {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const { currentEvent, getByIdWithOrganizer, loading, error } = useEventsStore();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (eventId) {
      getByIdWithOrganizer(eventId).catch((error) => {
        addNotification({ 
          type: 'error', 
          message: traduzirErroSupabase(error) || 'Falha ao carregar detalhes do evento' 
        });
        navigate('/meus-torneios');
      });
    }
  }, [eventId, getByIdWithOrganizer, addNotification, navigate]);

  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data inválida";
    const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return adjustedDate.toLocaleDateString('pt-BR');
  }

  if (loading || !currentEvent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span>Carregando detalhes do torneio...</span>
        </div>
      </div>
    );
  }

  const eventTypeConfig = getEventTypeConfig(currentEvent.type);

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'details', label: 'Detalhes', icon: Info },
    { id: 'participants', label: 'Inscritos', icon: Users },
    { id: 'teams', label: 'Duplas', icon: UserCheck },
    { id: 'groups', label: 'Grupos', icon: Grid },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate('/meus-torneios')}
              className="flex items-center"
            >
              <ChevronLeft size={16} className="mr-2" />
              Voltar
            </Button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentEvent.title}</h1>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${eventTypeConfig.color}`}>
                    {eventTypeConfig.label}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(currentEvent.date)} às {currentEvent.time}
                  </span>
                </div>
              </div>
            </div>

            {currentEvent.description && (
              <p className="text-gray-600 leading-relaxed">{currentEvent.description}</p>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} className="mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Description and Categories */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-blue-600 mb-3">Descrição</h2>
                    <p className="text-gray-700 leading-relaxed">
                      {currentEvent.description || 'Nenhuma descrição disponível.'}
                    </p>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-blue-600 mb-3">Categorias</h2>
                    {currentEvent.categories && currentEvent.categories.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {currentEvent.categories.map(category => (
                          <span
                            key={category}
                            className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhuma categoria definida.</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Event Info */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h2 className="text-lg font-semibold text-blue-600 mb-4">Informações do Evento</h2>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Calendar size={20} className="text-purple-600 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-600">Data e Hora</p>
                        <p className="text-gray-600">{formatDate(currentEvent.date)} às {currentEvent.time}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin size={20} className="text-purple-600 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-600">Local</p>
                        <p className="text-gray-600">{currentEvent.location}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <DollarSign size={20} className="text-purple-600 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-600">Inscrição</p>
                        <p className="text-gray-600">
                          R$ {(() => {
                            const fee = currentEvent?.entry_fee !== undefined 
                              ? currentEvent.entry_fee 
                              : currentEvent?.price;
                            
                            return fee !== undefined && fee !== null
                              ? Number(fee).toFixed(2).replace('.', ',')
                              : '0,00';
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Trophy size={20} className="text-purple-600 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-600">Premiação</p>
                        <p className="text-gray-600">{currentEvent.prize || 'Não definida'}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Users size={20} className="text-purple-600 mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-600">Formação de Duplas</p>
                        <p className="text-gray-600">
                          {currentEvent.teamFormation === TeamFormationType.FORMED
                            ? 'Duplas formadas'
                            : 'Duplas aleatórias'}
                        </p>
                      </div>
                    </div>

                    {currentEvent.organizer && (
                      <div className="flex items-start">
                        <UserCheck size={20} className="text-purple-600 mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-blue-600">Organizador</p>
                          <p className="text-gray-600">{currentEvent.organizer.name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'participants' && eventId && (
              <TournamentParticipants eventId={eventId} />
            )}

            {activeTab === 'teams' && eventId && (
              <TournamentTeams eventId={eventId} />
            )}

            {activeTab === 'groups' && eventId && (
              <TournamentGroups eventId={eventId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
