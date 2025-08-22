import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Calendar, Clock, ChevronDown, Plus, MapPin, Ticket, Eye, Edit3, TrendingUp, AlertCircle } from 'lucide-react';
import { useEventsStore, useParticipantsStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { EventType } from '../../types';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';

// Helper function para mapear tipos de evento
const getEventTypeConfig = (eventType: EventType) => {
  switch (eventType) {
    case EventType.TOURNAMENT:
      return {
        label: 'Torneio',
        color: 'bg-gradient-to-r from-brand-green/10 to-emerald-50 text-brand-green border-brand-green/20'
      };
    case EventType.POOL:
      return {
        label: 'Bolão',
        color: 'bg-gradient-to-r from-brand-purple/10 to-purple-50 text-brand-purple border-brand-purple/20'
      };
    case EventType.SUPER8:
      return {
        label: 'Super 8',
        color: 'bg-gradient-to-r from-brand-orange/10 to-orange-50 text-brand-orange border-brand-orange/20'
      };
    case EventType.CHAMPIONSHIP:
      return {
        label: 'Campeonato',
        color: 'bg-gradient-to-r from-brand-blue/10 to-blue-50 text-brand-blue border-brand-blue/20'
      };
    case EventType.FRIENDLY:
      return {
        label: 'Amistoso',
        color: 'bg-gradient-to-r from-gray-400/10 to-gray-50 text-gray-600 border-gray-400/20'
      };
    default:
      return {
        label: 'Evento',
        color: 'bg-gradient-to-r from-gray-400/10 to-gray-50 text-gray-600 border-gray-400/20'
      };
  }
};

export const EventsList = () => {
  const { events, loading: eventsLoading, error, fetchEvents } = useEventsStore();
  const { allParticipants, loading: participantsLoading, fetchAllParticipants } = useParticipantsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Load events and participants data
  useEffect(() => {
    fetchEvents().catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar eventos'
      });
    });

    fetchAllParticipants().catch(() => {
      addNotification({
        type: 'error',
        message: 'Falha ao carregar dados de participantes'
      });
    });
  }, [fetchEvents, fetchAllParticipants, addNotification]);

  // Handle any fetch errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);

  // Create a map of event ID to participant count (total and confirmed)
  const eventParticipantCounts = React.useMemo(() => {
    const counts: Record<string, { total: number, confirmed: number }> = {};
    
    if (allParticipants && allParticipants.length > 0) {
      allParticipants.forEach(participant => {
        if (participant.eventId) {
          if (!counts[participant.eventId]) {
            counts[participant.eventId] = { total: 0, confirmed: 0 };
          }
          counts[participant.eventId].total++;
          
          // Count confirmed participants separately
          if (participant.paymentStatus === 'CONFIRMED') {
            counts[participant.eventId].confirmed++;
          }
        }
      });
    }
    
    return counts;
  }, [allParticipants]);

  const filteredEvents = events.filter(event => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by event type
    const matchesType = filterType === 'all' || 
      (filterType === 'tournament' && (event.type === EventType.TOURNAMENT || event.type === EventType.SUPER8)) ||
      (filterType === 'pool' && event.type === EventType.POOL) ||
      (filterType === 'super8' && event.type === EventType.SUPER8);
    
    return matchesSearch && matchesType;
  });

  // Format date to show in a more readable format
  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    // Format: DD/MM/YYYY (ex: 21/01/2024)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Format time to show in a more readable format
  function formatTime(timeString: string): string {
    // Check if timeString is in HH:MM:SS format
    if (/^\d{2}:\d{2}:\d{2}/.test(timeString)) {
      // Return just HH:MM part
      return timeString.substring(0, 5);
    }
    return timeString;
  }

  const loading = eventsLoading || participantsLoading;

  // Enhanced EventCard component for better visual appeal
  const EventCard = ({ event }: { event: any }) => {
    const participantData = eventParticipantCounts[event.id] || { total: 0, confirmed: 0 };
    const occupancyPercentage = event.maxParticipants > 0 
      ? Math.min(100, Math.round((participantData.confirmed / event.maxParticipants) * 100))
      : 0;

    const getStatusConfig = () => {
      if (occupancyPercentage >= 100) return { 
        color: 'bg-red-500', 
        bgColor: 'bg-red-50 border-red-200', 
        textColor: 'text-red-700',
        label: 'Lotado' 
      };
      if (occupancyPercentage >= 90) return { 
        color: 'bg-orange-500', 
        bgColor: 'bg-orange-50 border-orange-200', 
        textColor: 'text-orange-700',
        label: 'Quase lotado' 
      };
      if (occupancyPercentage >= 70) return { 
        color: 'bg-yellow-500', 
        bgColor: 'bg-yellow-50 border-yellow-200', 
        textColor: 'text-yellow-700',
        label: 'Enchendo' 
      };
      return { 
        color: 'bg-emerald-500', 
        bgColor: 'bg-emerald-50 border-emerald-200', 
        textColor: 'text-emerald-700',
        label: 'Disponível' 
      };
    };

    const statusConfig = getStatusConfig();

    return (
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 group transform hover:-translate-y-1">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-xl text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 mb-2">
                  {event.title}
                </h3>
                <div className="flex items-center text-gray-500 text-sm mb-1">
                  <MapPin size={14} className="mr-1.5" />
                  <span>{event.location}</span>
                </div>
              </div>
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${getEventTypeConfig(event.type).color}`}>
                {getEventTypeConfig(event.type).label}
              </span>
            </div>
          </div>
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar size={16} className="mr-2 text-brand-blue" />
            <span className="font-medium">{formatDate(event.date)}</span>
          </div>
          <div className="flex items-center">
            <Clock size={16} className="mr-2 text-brand-blue" />
            <span className="font-medium">{formatTime(event.time)}</span>
          </div>
        </div>

        {/* Participants Section */}
        <div className={`rounded-xl p-4 mb-4 ${statusConfig.bgColor} transition-all duration-200`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <Users size={18} className="mr-2 text-gray-600" />
              <span className="font-bold text-lg text-gray-900">
                {participantData.confirmed}
              </span>
              <span className="text-gray-500 mx-1">/</span>
              <span className="text-gray-600 font-medium">{event.maxParticipants}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/70 ${statusConfig.textColor}`}>
                {occupancyPercentage}%
              </span>
              <span className={`text-xs font-medium ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative mb-3">
            <div className="w-full bg-white/60 rounded-full h-2.5 shadow-inner">
              <div 
                className={`${statusConfig.color} h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm`}
                style={{ width: `${occupancyPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5"></span>
              <span className="text-emerald-700 font-medium">
                {participantData.confirmed} confirmados
              </span>
            </div>
            {participantData.total - participantData.confirmed > 0 && (
              <div className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></span>
                <span className="text-amber-700 font-medium">
                  {participantData.total - participantData.confirmed} pendentes
                </span>
              </div>
            )}
          </div>

          {/* Warning for nearly full events */}
          {occupancyPercentage >= 90 && (
            <div className="flex items-center mt-3 text-xs font-medium">
              <AlertCircle size={14} className={`mr-2 ${occupancyPercentage >= 100 ? 'text-red-600' : 'text-orange-600'}`} />
              <span className={occupancyPercentage >= 100 ? 'text-red-600' : 'text-orange-600'}>
                {occupancyPercentage >= 100 ? 'Evento lotado!' : 'Poucas vagas restantes!'}
              </span>
            </div>
          )}
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-lg font-bold text-gray-900">
            <Ticket size={18} className="mr-2 text-brand-green" />
            <span>R$ {event.entry_fee || event.price || 0}</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/eventos/${event.id}`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue rounded-lg font-medium transition-all duration-200 hover:scale-105">
                <Eye size={16} />
                Ver
              </button>
            </Link>
            <Link to={`/eventos/${event.id}/editar`}>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200 hover:scale-105">
                <Edit3 size={16} />
                Editar
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="section-spacing">
      {/* Header Section */}
      <PageHeader
        title="Eventos & Torneios"
        description="Gerencie e acompanhe todos os seus eventos"
        actions={
          <Link to="/eventos/novo">
            <Button>
              <Plus size={20} className="mr-2" />
              Novo Evento
            </Button>
          </Link>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="card-base p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-brand-green/20 to-emerald-100">
              <Calendar className="text-brand-green" size={24} />
            </div>
            <div>
              <p className="text-description font-medium">Total de Eventos</p>
              <p className="text-2xl font-bold text-gray-900">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card-base p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-brand-purple/20 to-purple-100">
              <Users className="text-brand-purple" size={24} />
            </div>
            <div>
              <p className="text-description font-medium">Total Participantes</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(eventParticipantCounts).reduce((sum, counts) => sum + counts.total, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card-base p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-brand-blue/20 to-blue-100">
              <TrendingUp className="text-brand-blue" size={24} />
            </div>
            <div>
              <p className="text-description font-medium">Pagamentos Confirmados</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(eventParticipantCounts).reduce((sum, counts) => sum + counts.confirmed, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="card-base p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar eventos por nome ou local..."
              className="pl-12 pr-4 py-3 border border-brand-gray rounded-xl w-full focus-ring transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full lg:w-64">
            <select
              className="w-full appearance-none bg-white border border-brand-gray rounded-xl px-4 py-3 pr-10 focus-ring transition-all"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="tournament">Torneios</option>
              <option value="pool">Bolões</option>
              <option value="super8">Super 8</option>
            </select>
            <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400" />
          </div>
          <div className="flex items-center">
            <span className="text-description whitespace-nowrap">
              {filteredEvents.length} eventos encontrados
            </span>
          </div>
        </div>
      </div>

        {/* Events Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Carregando eventos...</p>
            </div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <div className="p-4 rounded-full bg-gray-100 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Calendar className="text-gray-400" size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || filterType !== 'all' ? 'Nenhum evento encontrado' : 'Nenhum evento criado ainda'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {searchTerm || filterType !== 'all' 
                ? 'Tente ajustar os filtros ou termos de busca para encontrar eventos.' 
                : 'Comece criando seu primeiro evento para começar a organizar torneios e bolões.'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <Link to="/eventos/novo">
                <button className="bg-brand-green hover:bg-brand-green/90 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105">
                  Criar Primeiro Evento
                </button>
              </Link>
            )}
          </div>
        )}
      </div>
  );
};
