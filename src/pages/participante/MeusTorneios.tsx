import { useEffect, useState } from 'react';
import { 
  Trophy,
  Calendar,
  MapPin,
  Users,
  Loader,
  Medal,
  Clock,
  RefreshCcw
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import { useNotificationStore } from '../../components/ui/Notification';
import { useParticipant } from '../../hooks/useParticipant';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

interface Tournament {
  id: string;
  title: string;
  date: string;
  location: string;
  partner_name?: string | null;
  placement?: string | number | null;
  upcoming: boolean;
}

export const MeusTorneios = () => {
  const { user } = useAuth();
  const { getParticipantTournaments, loading } = useParticipant();
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!user) return;
      
      try {
        // Buscar dados de torneios diretamente do banco
        const result = await getParticipantTournaments(user.id);
        
        // Atualizar os estados com dados do banco
        setUpcomingTournaments(result.upcomingTournaments);
        setPastTournaments(result.pastTournaments);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar seus torneios'
        });
      }
    };
    
    fetchTournaments();
  }, [user, getParticipantTournaments, addNotification]);

  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      setRefreshing(true);
      const result = await getParticipantTournaments(user.id);
      
      setUpcomingTournaments(result.upcomingTournaments);
      setPastTournaments(result.pastTournaments);
      
      addNotification({
        type: 'success',
        message: 'Torneios atualizados'
      });
    } catch (error) {
      console.error('Error refreshing tournaments:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao atualizar seus torneios'
      });
    } finally {
      setRefreshing(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Meus Torneios</h1>
        
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center"
        >
          <RefreshCcw size={16} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Torneios próximos */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Clock size={20} className="mr-2 text-brand-orange" /> 
          Torneios Próximos
        </h2>
        
        {upcomingTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingTournaments.map((tournament) => (
              <div 
                key={tournament.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <h3 className="text-lg font-bold text-brand-blue mb-2">
                    {tournament.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar size={16} className="mr-2 text-brand-green" />
                      {formatDate(tournament.date)}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <MapPin size={16} className="mr-2 text-brand-red" />
                      {tournament.location}
                    </div>
                    
                    {tournament.partner_name && (
                      <div className="flex items-center text-gray-600">
                        <Users size={16} className="mr-2 text-brand-purple" />
                        Parceiro: {tournament.partner_name}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <Link 
                      to={`/eventos/${tournament.id}`}
                      className="text-brand-blue hover:text-brand-blue/80 text-sm font-medium"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Trophy size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">
              Você não possui torneios agendados.
            </p>
            <Link 
              to="/eventos-disponiveis" 
              className="mt-4 inline-block px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90"
            >
              Explorar eventos
            </Link>
          </div>
        )}
      </div>

      {/* Torneios passados */}
      {pastTournaments.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Trophy size={20} className="mr-2 text-brand-gold" /> 
            Torneios Concluídos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastTournaments.map((tournament) => (
              <div 
                key={tournament.id} 
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {tournament.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar size={16} className="mr-2 text-brand-green" />
                      {formatDate(tournament.date)}
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <MapPin size={16} className="mr-2 text-brand-red" />
                      {tournament.location}
                    </div>
                    
                    {tournament.partner_name && (
                      <div className="flex items-center text-gray-600">
                        <Users size={16} className="mr-2 text-brand-purple" />
                        Parceiro: {tournament.partner_name}
                      </div>
                    )}
                    
                    {tournament.placement && (
                      <div className="flex items-center font-medium text-brand-gold">
                        <Medal size={16} className="mr-2" />
                        Posição: {tournament.placement}º
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeusTorneios;
