import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  MapPin,
  DollarSign,
  ArrowRight,
  Trophy,
  Loader,
  Bug
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../components/ui/Notification';
import { ParticipanteService } from '../../services/participanteService';
import { EventDiagnostic } from '../../components/debug/EventDiagnostic';
import { QuickEventTest } from '../../components/debug/QuickEventTest';
import { DebugEventsData } from '../../components/debug/DebugEventsData';

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
  const [showDebug, setShowDebug] = useState(false);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue">Eventos Disponíveis</h1>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowDebug(!showDebug)}
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <Bug className="w-4 h-4 mr-2" />
            {showDebug ? 'Ocultar Debug' : 'Debug'}
          </Button>
          <div className="flex items-center">
            <Trophy className="mr-2 text-brand-purple" size={20} />
            <span className="text-sm font-medium text-brand-blue">
              {events.length} {events.length === 1 ? 'torneio disponível' : 'torneios disponíveis'}
            </span>
          </div>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-lg shadow border border-brand-gray overflow-hidden hover:shadow-md transition-shadow">
              {event.banner_image_url ? (
                <div 
                  className="h-40 bg-center bg-cover"
                  style={{ backgroundImage: `url(${event.banner_image_url})` }}
                />
              ) : (
                <div className="h-40 bg-gradient-to-r from-brand-green to-brand-blue flex items-center justify-center">
                  <Trophy className="h-16 w-16 text-white" />
                </div>
              )}
              
              <div className="p-4">
                <h3 className="font-semibold text-lg text-brand-blue mb-2">{event.title}</h3>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <Calendar size={16} className="mr-2 text-brand-green" />
                    {formatDate(event.date)}
                  </div>
                  <div className="flex items-center">
                    <MapPin size={16} className="mr-2 text-brand-green" />
                    {event.location}
                  </div>
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-brand-green" />
                    {(event.entry_fee || event.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {event.description}
                  </p>
                )}
                
                <Button
                  onClick={() => goToRegistration(event.id)}
                  className="w-full flex items-center justify-center"
                >
                  <span>Inscrever-se</span>
                  <ArrowRight size={16} className="ml-2" />
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
      
      {/* Seção de Debug */}
      {showDebug && (
        <div className="mt-8 space-y-4">
          <DebugEventsData />
          <QuickEventTest />
          <EventDiagnostic />
        </div>
      )}
    </div>
  );
};

export default EventosDisponiveis;
