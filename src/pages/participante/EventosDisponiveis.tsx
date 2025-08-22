import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  MapPin,
  DollarSign,
  ArrowRight,
  Trophy,
  Loader
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../components/ui/Notification';
import { ParticipanteService } from '../../services/participanteService';
import { TorneiosEmAndamento } from '../../components/TorneiosEmAndamento';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  price: number;
  entry_fee?: number; // ✅ Adicionado para aderência ao DDL
  banner_image_url?: string;
  description?: string;
}

export const EventosDisponiveis = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        // Usar o ParticipanteService em vez de chamar Supabase diretamente
        const data = await ParticipanteService.getEventosDisponiveis();
        console.log('🔍 [EventosDisponiveis] Eventos carregados:', data);
        console.log('🔍 [EventosDisponiveis] Tipo dos dados:', typeof data);
        console.log('🔍 [EventosDisponiveis] É array?', Array.isArray(data));
        console.log('🔍 [EventosDisponiveis] Length:', data?.length);
        
        if (data && data.length > 0) {
          console.log('🔍 [EventosDisponiveis] Primeiro evento:', data[0]);
        }
        
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar eventos disponíveis'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, [addNotification]);

  const goToRegistration = (eventId: string) => {
    navigate(`/inscricao/${eventId}`);
  };

  // Log para debug da renderização
  console.log('🖼️ [EventosDisponiveis] Renderizando com:', {
    loading,
    eventsLength: events.length,
    events: events
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Seção de Torneios em Andamento */}
      <TorneiosEmAndamento />
      
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Eventos Disponíveis</h1>
        <div className="flex items-center">
          <Trophy className="mr-2 text-brand-purple" size={20} />
          <span className="text-sm font-medium text-brand-blue">
            {events.length} {events.length === 1 ? 'torneio disponível' : 'torneios disponíveis'}
          </span>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow border border-brand-gray overflow-hidden hover:shadow-md transition-shadow">
              {event.banner_image_url ? (
                <div 
                  className="h-24 bg-center bg-cover"
                  style={{ backgroundImage: `url(${event.banner_image_url})` }}
                />
              ) : (
                <div className="h-24 bg-gradient-to-r from-brand-green to-brand-blue flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
              )}
              
              <div className="p-3">
                <h3 className="font-semibold text-base text-brand-blue mb-2 line-clamp-1">{event.title}</h3>
                
                <div className="space-y-1 text-xs text-gray-600 mb-3">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2 text-brand-green flex-shrink-0" />
                    <span className="truncate">{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-2 text-brand-green flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign size={14} className="mr-2 text-brand-green flex-shrink-0" />
                    <span className="truncate">{(event.entry_fee || event.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => goToRegistration(event.id)}
                  className="w-full flex items-center justify-center text-sm py-2"
                  size="sm"
                >
                  <span>Inscrever-se</span>
                  <ArrowRight size={14} className="ml-2" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Trophy className="h-16 w-16 text-brand-green mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-medium text-brand-blue mb-2">Nenhum torneio disponível no momento</h2>
          <p className="text-gray-600">
            Não há eventos abertos para inscrição. Volte mais tarde para novas oportunidades.
          </p>
        </div>
      )}
    </div>
  );
};

export default EventosDisponiveis;
