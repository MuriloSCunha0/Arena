import { useEffect, useState } from 'react';
import { 
  CalendarDays, 
  MapPin, 
  Users, 
  Loader, 
  Search, 
  Filter, 
  CircleDollarSign 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';

interface EventDetails {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  max_participants: number;
  team_formation: 'FORMED' | 'RANDOM';
  banner_image_url?: string;
  status: string;
  participants_count: number;
}

export const EventosDisponiveis = () => {
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, formed, random

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Consulta básica para eventos com contagem de participantes
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            participants:participants(count)
          `)
          .eq('status', 'SCHEDULED') // Apenas eventos agendados
          .order('date', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          // Formatar os eventos para incluir a contagem de participantes
          const formattedEvents = data.map(event => ({
            ...event,
            participants_count: event.participants?.[0]?.count || 0
          }));
          
          setEvents(formattedEvents);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  // Filtrar eventos com base no termo de busca e filtro de tipo
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' || 
      (filterType === 'formed' && event.team_formation === 'FORMED') ||
      (filterType === 'random' && event.team_formation === 'RANDOM');
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Eventos Disponíveis</h1>
      
      {/* Filtros e busca */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar eventos..."
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-green"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <select
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-brand-green"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos os tipos</option>
            <option value="formed">Duplas formadas</option>
            <option value="random">Duplas aleatórias</option>
          </select>
        </div>
      </div>
      
      {/* Lista de eventos */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div 
              key={event.id}
              className="bg-white rounded-lg overflow-hidden border border-gray-200 transition-shadow hover:shadow-md flex flex-col"
            >
              {/* Banner do evento */}
              <div 
                className="h-40 bg-cover bg-center" 
                style={{ 
                  backgroundImage: event.banner_image_url 
                    ? `url(${event.banner_image_url})` 
                    : 'linear-gradient(to right, #4facfe 0%, #00f2fe 100%)' 
                }}
              >
                <div className="h-full w-full flex items-end p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <h2 className="text-white text-xl font-bold">{event.title}</h2>
                </div>
              </div>
              
              {/* Detalhes do evento */}
              <div className="p-4 flex-grow">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-600">
                    <CalendarDays size={16} className="mr-2 text-brand-green" />
                    {formatDate(event.date)}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <MapPin size={16} className="mr-2 text-brand-red" />
                    {event.location}
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Users size={16} className="mr-2 text-brand-blue" />
                    {event.participants_count} / {event.max_participants} participantes
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <CircleDollarSign size={16} className="mr-2 text-brand-green" />
                    {formatCurrency(event.price)}
                  </div>
                </div>
                
                <div className="flex items-center mt-3 px-3 py-1 rounded-full bg-blue-50 w-fit">
                  <Users size={14} className="mr-1 text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">
                    {event.team_formation === 'FORMED' ? 'Duplas formadas' : 'Duplas aleatórias'}
                  </span>
                </div>
              </div>
              
              {/* Botão de inscrição */}
              <div className="p-4 border-t border-gray-200">
                <Link to={`/inscricao/${event.id}`}>
                  <Button variant="primary" className="w-full">Inscrever-se</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <CalendarDays size={48} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-700">Nenhum evento disponível</h3>
          <p className="text-gray-500 mt-2">
            Não existem eventos disponíveis para inscrição no momento.
          </p>
        </div>
      )}
    </div>
  );
};

export default EventosDisponiveis;
