import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Trophy, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { ParticipanteService } from '../../services/participanteService';
import { ParticipantRegistrationForm } from '../../components/registration/ParticipantRegistrationForm';
import { useNotificationStore } from '../../components/ui/Notification';
import { formatDate } from '../../utils/formatters';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  price: number;
  banner_image_url?: string;
  description?: string;
  isTeamEvent?: boolean;
}

export const EventoRegistro = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;
      
      try {
        setLoading(true);
        // Fetch specific event details
        const { data, error } = await ParticipanteService.getEventById(eventId);
        
        if (error) throw error;
        
        if (data) {
          setEvent(data);
        } else {
          addNotification({
            type: 'error',
            message: 'Evento não encontrado'
          });
          navigate('/eventos-disponiveis');
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar detalhes do evento'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [eventId, navigate, addNotification]);
  
  // Verificar autorização - apenas participantes podem se inscrever em eventos
  useEffect(() => {
    if (!loading && user && userRole !== 'participante') {
      addNotification({
        type: 'error',
        message: 'Apenas participantes podem se inscrever em eventos'
      });
      navigate('/');
    }
  }, [loading, user, userRole, navigate, addNotification]);
  
  const handleRegistrationSuccess = (id: string) => {
    setRegistrationId(id);
    setRegistrationSuccess(true);
    addNotification({
      type: 'success',
      message: 'Inscrição realizada com sucesso!'
    });
  };
  
  const handleRegistrationError = (message: string) => {
    addNotification({
      type: 'error',
      message
    });
  };
  
  const navigateToMyTournaments = () => {
    navigate('/meus-torneios');
  };
  
  const goBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-green animate-spin" />
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-16 h-16 text-brand-green mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-medium text-brand-blue mb-2">Evento não encontrado</h2>
        <p className="text-gray-600 mb-4">
          O evento que você está procurando não existe ou foi removido.
        </p>
        <Button onClick={goBack}>Voltar</Button>
      </div>
    );
  }
  
  if (registrationSuccess) {
    return (
      <div className="bg-white rounded-lg shadow p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-brand-blue mb-2">Inscrição Confirmada!</h2>
          <p className="text-gray-600">
            Sua inscrição para o torneio <strong>{event.title}</strong> foi realizada com sucesso.
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-brand-blue mb-3">Detalhes do Evento:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <Calendar size={16} className="mr-2 text-brand-green" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center">
              <MapPin size={16} className="mr-2 text-brand-green" />
              <span>{event.location}</span>
            </div>
            <div className="flex items-center">
              <DollarSign size={16} className="mr-2 text-brand-green" />
              <span>{event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Você receberá um email com todos os detalhes da sua inscrição.
            Você também pode consultar todas as suas inscrições na seção "Meus Torneios".
          </p>
          
          <Button 
            onClick={navigateToMyTournaments}
            className="w-full sm:w-auto"
          >
            Ver Meus Torneios
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={goBack}
        className="flex items-center text-brand-blue hover:text-brand-green mb-6 transition-colors"
      >
        <ArrowLeft size={16} className="mr-1" />
        <span>Voltar</span>
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-brand-gray overflow-hidden">
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
              <h3 className="font-semibold text-lg text-brand-blue mb-3">{event.title}</h3>
              
              <div className="space-y-3 text-sm text-gray-600 mb-4">
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
                  {event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
              
              {event.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-brand-blue mb-2">Sobre o evento:</h4>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          <ParticipantRegistrationForm
            eventId={event.id}
            eventTitle={event.title}
            eventDate={event.date}
            eventPrice={event.price}
            isTeamEvent={event.isTeamEvent}
            onSuccess={handleRegistrationSuccess}
            onError={handleRegistrationError}
          />
        </div>
      </div>
    </div>
  );
};

export default EventoRegistro;
