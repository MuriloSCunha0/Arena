import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar,
  MapPin,
  DollarSign,
  Eye,
  Trophy,
  Users,
  Loader
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { Button } from './ui/Button';
import { useNotificationStore } from './ui/Notification';
import { ParticipanteService } from '../services/participanteService';

interface OngoingTournament {
  id: string;
  title: string;
  date: string;
  location: string;
  price: number;
  entry_fee?: number;
  banner_image_url?: string;
  description?: string;
  participantsCount: number;
  tournament?: {
    id: string;
    status: string;
    current_round: number;
    total_rounds: number;
    groups_count: number;
    standings_data: any;
    groups_data: any;
    brackets_data: any;
    matches_data: any;
    teams_data: any;
  } | null;
}

export const TorneiosEmAndamento: React.FC = () => {
  const [tournaments, setTournaments] = useState<OngoingTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    const fetchOngoingTournaments = async () => {
      try {
        setLoading(true);
        const data = await ParticipanteService.getTorneiosEmAndamento();
        console.log('Torneios em andamento carregados:', data);
        setTournaments(data);
      } catch (error) {
        console.error('Error fetching ongoing tournaments:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar torneios em andamento'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOngoingTournaments();
  }, [addNotification]);

  const getRoundText = (currentRound: number, totalRounds: number) => {
    if (currentRound === 0) return 'Fase de Grupos';
    if (currentRound === totalRounds) return 'Final';
    if (currentRound === totalRounds - 1) return 'Semifinal';
    if (currentRound === totalRounds - 2) return 'Quartas de Final';
    return `Rodada ${currentRound}`;
  };

  const getParticipantsCount = (tournament: OngoingTournament) => {
    return tournament.participantsCount || 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader className="h-8 w-8 animate-spin text-brand-blue mr-3" />
          <span className="text-gray-600">Carregando torneios em andamento...</span>
        </div>
      </div>
    );
  }

  if (tournaments.length === 0) {
    return null; // Não mostrar a seção se não há torneios em andamento
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold flex items-center text-gray-900">
          <Trophy className="mr-3 text-red-500" size={20} />
          Acontecendo Agora
          <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
            AO VIVO
          </span>
        </h2>
        <p className="text-gray-600 text-sm mt-1">
          Acompanhe os torneios que estão acontecendo em tempo real
        </p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {tournaments.map(tournament => (
            <div 
              key={tournament.id} 
              className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
            >
              {/* Banner Image */}
              {tournament.banner_image_url && (
                <div className="h-40 overflow-hidden">
                  <img 
                    src={tournament.banner_image_url} 
                    alt={tournament.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
              )}
              
              <div className="p-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    AO VIVO
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {tournament.tournament ? 
                      getRoundText(tournament.tournament.current_round || 0, tournament.tournament.total_rounds || 0) : 
                      'Iniciando...'
                    }
                  </span>
                </div>

                <h3 className="font-semibold text-lg mb-4 text-gray-900 line-clamp-2">
                  {tournament.title}
                </h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-gray-600">
                    <div className="p-1.5 bg-green-100 rounded-lg mr-3">
                      <Calendar size={14} className="text-green-600" />
                    </div>
                    <span className="text-sm font-medium">{formatDate(tournament.date)}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                      <MapPin size={14} className="text-blue-600" />
                    </div>
                    <span className="text-sm line-clamp-1">{tournament.location}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <div className="p-1.5 bg-purple-100 rounded-lg mr-3">
                      <Users size={14} className="text-purple-600" />
                    </div>
                    <span className="text-sm">
                      {getParticipantsCount(tournament)} participantes
                    </span>
                  </div>

                  <div className="flex items-center text-gray-600">
                    <div className="p-1.5 bg-yellow-100 rounded-lg mr-3">
                      <DollarSign size={14} className="text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium">
                      Taxa: R$ {tournament.entry_fee?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
                
                <Link to={`/torneio/${tournament.id}/acompanhar`} className="block">
                  <Button 
                    variant="primary" 
                    className="w-full bg-red-600 hover:bg-red-700 flex items-center justify-center"
                  >
                    <Eye size={16} className="mr-2" />
                    Acompanhar Torneio
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
