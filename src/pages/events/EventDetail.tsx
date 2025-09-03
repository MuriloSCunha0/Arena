import React, { useState, useEffect, useMemo } from 'react'; // Import useMemo
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  // ... other imports
  Info,
  Users,
  Trophy,
  DollarSign,
  Share2,
  ChevronLeft,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  Loader2,
  UserCheck, // Icon for Organizer
  Grid, // Icon for Courts
  Settings // Icon for Manual Mode
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEventsStore, useParticipantsStore, useFinancialsStore, useCourtsStore } from '../../store'; // Import useCourtsStore
import { useNotificationStore } from '../../components/ui/Notification';
import { traduzirErroSupabase } from '../../lib/supabase';
import { ParticipantsList } from '../../components/events/ParticipantsList';
import { TournamentBracket } from '../../components/events/TournamentBracket';
import { EventFinancial } from '../../components/events/EventFinancial';
import { RegistrationLink } from '../../components/events/RegistrationLink';
import { EventType, TeamFormationType } from '../../types'; // Import TeamFormationType
import { ManualModeToggle } from '../../components/ui/ManualModeToggle';

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

type TabType = 'details' | 'participants' | 'bracket' | 'financials' | 'registration';

export const EventDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('details');

  // Use getByIdWithOrganizer to fetch event with organizer data
  const { currentEvent, getByIdWithOrganizer, updateEvent, deleteEvent, loading, error } = useEventsStore();
  const { fetchParticipantsByEvent } = useParticipantsStore();
  const { fetchTransactionsByEvent, fetchEventSummary } = useFinancialsStore();
  const { courts, fetchCourts } = useCourtsStore(); // Get courts data
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (id) {      // Fetch event with organizer data
      getByIdWithOrganizer(id).catch((error) => {
        addNotification({ type: 'error', message: traduzirErroSupabase(error) || 'Falha ao carregar detalhes do evento' });
        navigate('/eventos');
      });
      // Fetch courts for displaying names
      fetchCourts().catch((error) => {
         addNotification({ type: 'warning', message: traduzirErroSupabase(error) || 'Não foi possível carregar nomes das quadras.' });
      });
    }
  }, [id, getByIdWithOrganizer, fetchCourts, addNotification, navigate]);

  // ... (useEffect for participants, financials, errors remain the same) ...
  // Load participants when tab is participants
  useEffect(() => {
    if (activeTab === 'participants' && id) {      fetchParticipantsByEvent(id).catch((error) => {
        addNotification({
          type: 'error',
          message: traduzirErroSupabase(error) || 'Falha ao carregar participantes'
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
    if (activeTab === 'financials' && id) {      Promise.all([
        fetchTransactionsByEvent(id),
        fetchEventSummary(id)
      ]).catch(error => {
        console.error('Error fetching financial data:', error);
        addNotification({
          type: 'error',
          message: traduzirErroSupabase(error) || 'Falha ao carregar dados financeiros'
        });
      });
    }
  }, [activeTab, id, fetchTransactionsByEvent, fetchEventSummary]);


  function formatDate(dateString: string): string {
    // Add safety check for invalid date string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data inválida";
    // Adjust for timezone if needed, otherwise use UTC
    const adjustedDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return adjustedDate.toLocaleDateString('pt-BR');
  }

  // ... (handleDeleteEvent remains the same) ...
   const handleDeleteEvent = async () => {
    if (!id) return;

    if (window.confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
      try {
        await deleteEvent(id);
        addNotification({
          type: 'success',
          message: 'Evento excluído com sucesso!'
        });
        navigate('/eventos');      } catch (err) {
        addNotification({
          type: 'error',
          message: traduzirErroSupabase(err) || 'Erro ao excluir evento. Tente novamente.'
        });
      }
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'details', label: 'Detalhes', icon: Info },
    { id: 'participants', label: 'Participantes', icon: Users },
    // Show bracket tab for both TOURNAMENT and SUPER8 event types
    ...(currentEvent?.type === EventType.TOURNAMENT || currentEvent?.type === EventType.SUPER8
      ? [{ id: 'bracket' as TabType, label: 'Chaveamento', icon: Trophy }]
      : []),
    { id: 'financials', label: 'Financeiro', icon: DollarSign },
    { id: 'registration', label: 'Inscrições', icon: Share2 },
  ];

  // Memoize court names lookup
  const courtNameMap = useMemo(() => {
    const map = new Map<string, string>();
    courts.forEach(court => map.set(court.id, court.name));
    return map;
  }, [courts]);

  if (loading || !currentEvent) {
    // ... (loading indicator remains the same) ...
     return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* ... (Back button, Title, Date/Location) ... */}
         <div className="flex items-center">
          <button
            onClick={() => navigate('/eventos')}
            className="mr-4 p-2 rounded-full hover:bg-brand-gray/30"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-brand-blue">{currentEvent.title}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getEventTypeConfig(currentEvent.type).color}`}>
                {getEventTypeConfig(currentEvent.type).label}
              </span>
            </div>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <Calendar size={16} className="mr-1" />
              <span>{formatDate(currentEvent.date)} • {currentEvent.time}</span>
              <MapPin size={16} className="ml-3 mr-1" />
              <span>{currentEvent.location}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {/* ... (Edit, Delete buttons) ... */}
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

      {/* Tabs */}
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

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: About, Rules, Categories */}
              <div className="space-y-6">
                {/* ... (About, Rules, Categories display) ... */}
                 <div>
                  <h2 className="text-lg font-semibold text-brand-blue mb-2">Sobre o Evento</h2>
                  <p className="text-gray-600">{currentEvent.description || 'Nenhuma descrição fornecida.'}</p>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-brand-blue mb-2">Regras</h2>
                  <p className="text-gray-600">{currentEvent.rules || 'Nenhuma regra definida.'}</p>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-brand-blue mb-2">Categorias</h2>
                  {currentEvent.categories && currentEvent.categories.length > 0 ? (
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
                  ) : (
                     <p className="text-sm text-gray-500">Nenhuma categoria definida.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Event Info Box */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg border border-brand-gray">
                  <h2 className="text-lg font-semibold text-brand-blue mb-4">Informações do Evento</h2>
                  <div className="space-y-4">
                    {/* ... (Date/Time, Location, Price, Prize, Team Formation) ... */}
                     <div className="flex items-start">
                      <Calendar size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-brand-blue">Data e Hora</p>
                        <p className="text-gray-600">{formatDate(currentEvent.date)} às {currentEvent.time}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-brand-blue">Local</p>
                        <p className="text-gray-600">{currentEvent.location}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <DollarSign size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-brand-blue">Inscrição</p>
                        <p className="text-gray-600">
                          R$ {(() => {
    // Verificar entry_fee primeiro, depois price, para garantir compatibilidade
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
                      <Trophy size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-brand-blue">Premiação</p>
                        <p className="text-gray-600">{currentEvent.prize || 'Não definida'}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Users size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-brand-blue">Formação de Duplas</p>
                        <p className="text-gray-600">
                          {currentEvent.teamFormation === TeamFormationType.FORMED
                            ? 'Duplas formadas'
                            : currentEvent.teamFormation === TeamFormationType.SUPER8
                            ? 'Super 8 (Individual)'
                            : currentEvent.teamFormation === TeamFormationType.MANUAL
                            ? 'Modo Manual'
                            : 'Duplas aleatórias'}
                        </p>
                      </div>
                    </div>

                    {/* Controle de Modo Manual */}
                    <div className="flex items-start">
                      <Settings size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-brand-blue">Modo Manual</p>
                            <p className="text-sm text-gray-500">
                              Controle total sobre participantes, duplas e grupos
                            </p>
                          </div>
                          <ManualModeToggle 
                            isManual={currentEvent.teamFormation === TeamFormationType.MANUAL}
                            onToggle={async (enabled) => {
                              try {
                                await updateEvent(currentEvent.id, {
                                  teamFormation: enabled ? TeamFormationType.MANUAL : TeamFormationType.FORMED
                                });
                                addNotification({
                                  type: 'success',
                                  message: enabled ? 'Modo manual ativado!' : 'Modo manual desativado!'
                                });
                                // Recarregar o evento para mostrar as mudanças
                                await getByIdWithOrganizer(currentEvent.id);
                              } catch (error) {
                                addNotification({
                                  type: 'error',
                                  message: 'Erro ao alterar modo do evento'
                                });
                              }
                            }}
                          />
                        </div>
                        {currentEvent.teamFormation === TeamFormationType.MANUAL && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs text-blue-700">
                              ✓ Modo manual ativo: você pode adicionar participantes apenas pelo nome e organizar duplas/grupos manualmente
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Organizer Info */}
                    {currentEvent.organizer && (
                      <div className="flex items-start">
                        <UserCheck size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-brand-blue">Organizador</p>
                          <p className="text-gray-600">
                            {currentEvent.organizer.name}
                            {currentEvent.organizerCommissionRate !== null &&
                              ` (${currentEvent.organizerCommissionRate}%)`}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Courts Info */}
                    {currentEvent.courtIds && currentEvent.courtIds.length > 0 && (
                       <div className="flex items-start">
                        <Grid size={20} className="text-brand-purple mr-3 mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-brand-blue">Quadras</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                             {currentEvent.courtIds.map(courtId => (
                               <span key={courtId} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                                 {courtNameMap.get(courtId) || courtId.substring(0, 8)}
                               </span>
                             ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other Tab Contents */}
          {activeTab === 'participants' && <ParticipantsList eventId={id || ''} />}
          {/* Show TournamentBracket for both TOURNAMENT and SUPER8 event types */}
          {activeTab === 'bracket' && (currentEvent.type === EventType.TOURNAMENT || currentEvent.type === EventType.SUPER8) && <TournamentBracket eventId={id || ''} />}
          {activeTab === 'financials' && <EventFinancial eventId={id || ''} />}
          {activeTab === 'registration' && <RegistrationLink event={currentEvent} />}
        </div>
      </div>

      {/* Remove redundant Tabs component at the bottom if not needed */}
      {/*
      <div className="mt-6">
        <Tabs defaultValue="participants">
          ...
        </Tabs>
      </div>
      */}
    </div>
  );
};
