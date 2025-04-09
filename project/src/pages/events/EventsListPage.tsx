import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Filter, Calendar, Search, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TournamentCardList } from '../../components/tournaments/TournamentCards';
import { PageHeader } from '../../components/ui/PageHeader';
import { supabase } from '../../lib/supabase';
import { useNotificationStore } from '../../components/ui/Notification';

export const EventsListPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  
  // Filtrar apenas torneios (TOURNAMENT) ou todos os eventos
  const filteredEvents = events
    .filter(event => !filterType || event.type === filterType)
    .filter(event => {
      if (!searchQuery) return true;
      
      const search = searchQuery.toLowerCase();
      return (
        event.title.toLowerCase().includes(search) ||
        (event.description && event.description.toLowerCase().includes(search)) ||
        event.location.toLowerCase().includes(search)
      );
    });
  
  useEffect(() => {
    fetchEvents();
  }, []);
  
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          location,
          date,
          time,
          price,
          max_participants,
          prize,
          banner_image_url,
          type,
          categories,
          team_formation,
          tournaments:tournaments(status)
        `)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      // Adiciona o status do torneio ao evento para poder mostrar no card
      const eventsWithStatus = data.map(event => {
        // Se o evento tiver um torneio associado, adiciona o status
        if (event.tournaments && event.tournaments.length > 0) {
          return {
            ...event,
            status: event.tournaments[0].status
          };
        }
        return event;
      });
      
      setEvents(eventsWithStatus);
    } catch (error) {
      console.error('Error fetching events:', error);
      addNotification({
        type: 'error',
        message: 'Falha ao carregar os eventos'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateEvent = () => {
    navigate('/events/new');
  };
  
  const handleFilterChange = (type: string | null) => {
    setFilterType(type === filterType ? null : type);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader 
        title="Eventos"
        description="Gerencie torneios e bolões"
      />
      
      {/* Actions bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant={filterType === 'TOURNAMENT' ? 'primary' : 'outline'}
            onClick={() => handleFilterChange('TOURNAMENT')}
            className="flex items-center"
          >
            <Calendar size={18} className="mr-2" />
            Torneios
          </Button>
          <Button
            variant={filterType === 'POOL' ? 'primary' : 'outline'}
            onClick={() => handleFilterChange('POOL')}
            className="flex items-center"
          >
            <Filter size={18} className="mr-2" />
            Bolões
          </Button>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Buscar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button onClick={handleCreateEvent} className="whitespace-nowrap">
            <PlusCircle size={18} className="mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 size={32} className="animate-spin text-brand-green" />
        </div>
      ) : (
        <TournamentCardList 
          tournaments={filteredEvents} 
          emptyMessage={
            filterType === 'TOURNAMENT' 
              ? "Nenhum torneio encontrado" 
              : filterType === 'POOL'
                ? "Nenhum bolão encontrado"
                : "Nenhum evento encontrado"
          }
        />
      )}
    </div>
  );
};
