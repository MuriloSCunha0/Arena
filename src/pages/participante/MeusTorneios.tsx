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
  final_position?: string | number | null;
  upcoming: boolean;
}


export const MeusTorneios = () => {
  const { user } = useAuth();
  const { getParticipantTournaments } = useParticipant();
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [pastTournaments, setPastTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const addNotification = useNotificationStore(state => state.addNotification);

  // Busca só uma vez ao montar, não repete se não houver torneios
  useEffect(() => {
    let fetched = false;
    const fetchTournaments = async () => {
      if (!user || fetched) return;
      setLoading(true);
      try {
        const result = await getParticipantTournaments(user.id);
        setUpcomingTournaments(result.upcomingTournaments);
        setPastTournaments(result.pastTournaments);
        fetched = true;
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar seus torneios'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
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
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando seus torneios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Torneios</h1>
            <p className="text-gray-600 mt-1">Acompanhe seus torneios passados e futuros</p>
          </div>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock size={20} className="text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Próximos</p>
                <p className="text-2xl font-bold text-gray-900">{upcomingTournaments.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy size={20} className="text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-gray-900">{pastTournaments.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Medal size={20} className="text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pódios</p>
                <p className="text-2xl font-bold text-gray-900">
                  {pastTournaments.filter(t => t.final_position && Number(t.final_position) <= 3).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users size={20} className="text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {upcomingTournaments.length + pastTournaments.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Torneios próximos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900">
              <Clock size={20} className="mr-3 text-brand-orange" /> 
              Torneios Próximos
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {upcomingTournaments.map((tournament) => (
                <div 
                  key={tournament.id} 
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {tournament.title}
                      </h3>
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Trophy size={16} className="text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Calendar size={16} className="mr-3 text-green-600" />
                        <span className="text-sm font-medium">{formatDate(tournament.date)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin size={16} className="mr-3 text-red-500" />
                        <span className="text-sm">{tournament.location}</span>
                      </div>
                      {tournament.partner_name && (
                        <div className="flex items-center text-gray-600">
                          <Users size={16} className="mr-3 text-purple-600" />
                          <span className="text-sm">Parceiro: {tournament.partner_name}</span>
                        </div>
                      )}
                    </div>
                    
                    <Link 
                      to={`/eventos/${tournament.id}`}
                      className="block w-full"
                    >
                      <Button 
                        variant="primary" 
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        Ver detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Torneios passados */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-900">
              <Trophy size={20} className="mr-3 text-brand-gold" /> 
              Torneios Concluídos
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pastTournaments.map((tournament) => (
                <div 
                  key={tournament.id} 
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {tournament.title}
                      </h3>
                      {tournament.final_position && Number(tournament.final_position) <= 3 ? (
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Medal size={16} className="text-yellow-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Trophy size={16} className="text-gray-600" />
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-gray-600">
                        <Calendar size={16} className="mr-3 text-green-600" />
                        <span className="text-sm font-medium">{formatDate(tournament.date)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin size={16} className="mr-3 text-red-500" />
                        <span className="text-sm">{tournament.location}</span>
                      </div>
                      {tournament.partner_name && (
                        <div className="flex items-center text-gray-600">
                          <Users size={16} className="mr-3 text-purple-600" />
                          <span className="text-sm">Parceiro: {tournament.partner_name}</span>
                        </div>
                      )}
                      {tournament.final_position && (
                        <div className="flex items-center font-medium">
                          <Medal size={16} className="mr-3 text-yellow-600" />
                          <span className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                            {tournament.final_position}º lugar
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeusTorneios;
