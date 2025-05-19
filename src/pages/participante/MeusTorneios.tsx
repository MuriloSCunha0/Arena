import { useEffect, useState } from 'react';
import { 
  Trophy,
  Calendar,
  MapPin,
  Users,
  Loader,
  Medal
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';
import { useNotificationStore } from '../../components/ui/Notification';
import { ParticipanteService } from '../../services/participanteService';

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
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        // Use ParticipanteService to fetch tournaments
        const { upcomingTournaments, pastTournaments } = await ParticipanteService.getTorneiasParticipante(user.id);
        
        // Combine the tournaments
        setTournaments([...upcomingTournaments, ...pastTournaments]);
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
  }, [user, addNotification]);

  // Separar torneios futuros e passados
  const upcomingTournaments = tournaments.filter(t => t.upcoming);
  const pastTournaments = tournaments.filter(t => !t.upcoming);

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
        <h1 className="text-2xl font-bold text-brand-blue">Meus Torneios</h1>
      </div>

      {/* Torneios Futuros */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex items-center mb-4">
          <Calendar className="mr-2 text-brand-green" size={20} />
          <h2 className="text-lg font-semibold text-brand-blue">Torneios Futuros</h2>
        </div>

        {upcomingTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingTournaments.map(tournament => (
              <div key={tournament.id} className="border border-brand-gray rounded-lg p-4 hover:shadow-sm transition-shadow">
                <h3 className="font-medium text-brand-blue mb-2">{tournament.title}</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-1 text-brand-green" />
                    {formatDate(tournament.date)}
                  </div>
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-1 text-brand-green" />
                    {tournament.location}
                  </div>
                  {tournament.partner_name && (
                    <div className="flex items-center">
                      <Users size={14} className="mr-1 text-brand-green" />
                      Parceiro: {tournament.partner_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            Você não está inscrito em nenhum torneio futuro.
          </p>
        )}
      </div>

      {/* Histórico de Torneios */}
      <div className="bg-white rounded-lg shadow border border-brand-gray p-6">
        <div className="flex items-center mb-4">
          <Trophy className="mr-2 text-brand-purple" size={20} />
          <h2 className="text-lg font-semibold text-brand-blue">Histórico de Torneios</h2>
        </div>

        {pastTournaments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-gray">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Torneio</th>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Local</th>
                  <th className="px-6 py-3">Parceiro</th>
                  <th className="px-6 py-3">Colocação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-brand-gray">
                {pastTournaments.map(tournament => (
                  <tr key={tournament.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-brand-blue">{tournament.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(tournament.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tournament.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tournament.partner_name || 'Individual'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeof tournament.placement === 'number' && tournament.placement <= 3 ? (
                        <div className={`flex items-center font-medium
                          ${tournament.placement === 1 ? 'text-yellow-600' : 
                           tournament.placement === 2 ? 'text-gray-500' : 
                           tournament.placement === 3 ? 'text-amber-700' : 'text-gray-600'}`}
                        >
                          <Medal size={16} className="mr-1" />
                          {tournament.placement}º Lugar
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {tournament.placement?.toString() || 'Participou'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            Você ainda não participou de nenhum torneio.
          </p>
        )}
      </div>
    </div>
  );
};

export default MeusTorneios;
