import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar,
  MapPin,
  Eye,
  Trophy,
  Users,
  Loader,
  Clock,
  Activity
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../components/ui/Notification';
import { ParticipanteService } from '../../services/participanteService';
import { calculateSuper8IndividualRanking, isMatchCompleted } from '../../utils/rankingUtils';

// Função para validar se uma string é um UUID válido
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

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
  type?: string; // Adicionar tipo do evento
  tournament?: {
    id: string;
    status: string;
    current_round: number;
    total_rounds: number;
    groups_count: number;
    standings_data: any;
    groups_data: any;
    brackets_data: any;
    matches_data: any[];
    teams_data: any;
  } | null;
}

interface RankingEntry {
  teamId: string | string[];
  teamName: string;
  position: number;
  points: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  winRate: number;
}

export const AcontecendoAgora: React.FC = () => {
  const [tournaments, setTournaments] = useState<OngoingTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    const fetchOngoingTournaments = async () => {
      try {
        setLoading(true);
        const data = await ParticipanteService.getTorneiosEmAndamento();
        console.log('Torneios em andamento carregados:', data);
        setTournaments(data);

        // Extrair todos os IDs de participantes dos torneios
        const allParticipantIds = new Set<string>();
        
        data.forEach(tournament => {
          if (tournament.tournament?.matches_data) {
            tournament.tournament.matches_data.forEach((match: any) => {
              // Processar team1
              if (match.team1) {
                if (Array.isArray(match.team1)) {
                  match.team1.forEach((id: string) => {
                    if (id && typeof id === 'string' && isValidUUID(id)) {
                      allParticipantIds.add(id);
                    }
                  });
                } else if (typeof match.team1 === 'string' && isValidUUID(match.team1)) {
                  allParticipantIds.add(match.team1);
                }
              }
              
              // Processar team2
              if (match.team2) {
                if (Array.isArray(match.team2)) {
                  match.team2.forEach((id: string) => {
                    if (id && typeof id === 'string' && isValidUUID(id)) {
                      allParticipantIds.add(id);
                    }
                  });
                } else if (typeof match.team2 === 'string' && isValidUUID(match.team2)) {
                  allParticipantIds.add(match.team2);
                }
              }
            });
          }
        });

        // Buscar nomes dos participantes
        if (allParticipantIds.size > 0) {
          const names = await ParticipanteService.getParticipantNames(Array.from(allParticipantIds));
          setParticipantNames(names);
        }
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

  // Função para calcular ranking baseado no tipo do evento
  const calculateTournamentRanking = (tournament: OngoingTournament): RankingEntry[] => {
    if (!tournament.tournament?.matches_data) return [];

    const matches = tournament.tournament.matches_data;
    const completedMatches = matches.filter(isMatchCompleted);

    if (completedMatches.length === 0) return [];

    // Se for Super 8, calcular ranking individual
    if (tournament.type === 'SUPER8') {
      try {
        const individualRanking = calculateSuper8IndividualRanking(completedMatches);
        return individualRanking.map((player, index) => ({
          teamId: player.playerId,
          teamName: participantNames[player.playerId] || `Participante ${player.playerId}`,
          position: index + 1,
          points: player.wins,
          wins: player.wins,
          losses: player.losses,
          setsWon: player.gamesWon,
          setsLost: player.gamesLost,
          setsDiff: player.gameDifference,
          winRate: player.matchesPlayed > 0 ? (player.wins / player.matchesPlayed) * 100 : 0
        }));
      } catch (error) {
        console.error('Erro ao calcular ranking Super 8:', error);
        return [];
      }
    }

    // Para torneios normais, calcular ranking de duplas
    const teams: Record<string, any> = {};
    
    completedMatches.forEach(match => {
      if (!match.team1 || !match.team2) return;
      
      const team1Key = Array.isArray(match.team1) ? match.team1.join('|') : match.team1;
      const team2Key = Array.isArray(match.team2) ? match.team2.join('|') : match.team2;
      
      // Inicializar times se não existirem
      if (!teams[team1Key]) {
        teams[team1Key] = {
          teamId: match.team1,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          matchesPlayed: 0
        };
      }
      if (!teams[team2Key]) {
        teams[team2Key] = {
          teamId: match.team2,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          matchesPlayed: 0
        };
      }
      
      teams[team1Key].matchesPlayed++;
      teams[team2Key].matchesPlayed++;
      teams[team1Key].setsWon += match.score1 || 0;
      teams[team1Key].setsLost += match.score2 || 0;
      teams[team2Key].setsWon += match.score2 || 0;
      teams[team2Key].setsLost += match.score1 || 0;
      
      if (match.winnerId === 'team1') {
        teams[team1Key].wins++;
        teams[team2Key].losses++;
      } else if (match.winnerId === 'team2') {
        teams[team2Key].wins++;
        teams[team1Key].losses++;
      }
    });

    return Object.values(teams)
      .map((team: any, index) => ({
        teamId: team.teamId,
        teamName: Array.isArray(team.teamId) ? 
          team.teamId.map((id: string) => participantNames[id] || `Participante ${id}`).join(' & ') : 
          participantNames[team.teamId] || `Participante ${team.teamId}`,
        position: index + 1,
        points: team.wins,
        wins: team.wins,
        losses: team.losses,
        setsWon: team.setsWon,
        setsLost: team.setsLost,
        setsDiff: team.setsWon - team.setsLost,
        winRate: team.matchesPlayed > 0 ? (team.wins / team.matchesPlayed) * 100 : 0
      }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.setsDiff !== a.setsDiff) return b.setsDiff - a.setsDiff;
        return b.setsWon - a.setsWon;
      })
      .map((team, index) => ({ ...team, position: index + 1 }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-blue flex items-center">
            <Activity className="mr-3 text-red-500" size={28} />
            Acontecendo Agora
          </h1>
          <div className="flex items-center">
            <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
              AO VIVO
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-brand-blue mb-2">Nenhum torneio em andamento</h2>
          <p className="text-gray-600">
            Não há torneios acontecendo no momento. Verifique os eventos disponíveis para se inscrever.
          </p>
          <Link to="/eventos-disponiveis" className="inline-block mt-4">
            <Button>
              Ver Eventos Disponíveis
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-blue flex items-center">
          <Activity className="mr-3 text-red-500" size={28} />
          Acontecendo Agora
        </h1>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            AO VIVO
          </span>
          <div className="flex items-center">
            <Trophy className="mr-2 text-brand-purple" size={20} />
            <span className="text-sm font-medium text-brand-blue">
              {tournaments.length} {tournaments.length === 1 ? 'torneio ativo' : 'torneios ativos'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {tournaments.map(tournament => {
          // Primeiro verificar se existem rankings já calculados no backend
          let ranking: RankingEntry[] = [];
          const tournamentData = tournament.tournament as any;
          
          // Prioridade 1: Ranking super8 individual (se existir)
          if (tournamentData?.super8_individual_ranking && Array.isArray(tournamentData.super8_individual_ranking)) {
            ranking = tournamentData.super8_individual_ranking.map((player: any, index: number) => ({
              teamId: player.playerId || player.id,
              teamName: participantNames[player.playerId || player.id] || `Participante ${player.playerId || player.id}`,
              position: index + 1,
              points: player.points || player.wins || 0,
              wins: player.wins || 0,
              losses: player.losses || 0,
              setsWon: player.gamesWon || player.setsWon || 0,
              setsLost: player.gamesLost || player.setsLost || 0,
              setsDiff: (player.gamesWon || player.setsWon || 0) - (player.gamesLost || player.setsLost || 0),
              winRate: player.matchesPlayed > 0 ? (player.wins / player.matchesPlayed) * 100 : 0
            }));
          }
          // Prioridade 2: Ranking de times (se existir)
          else if (tournamentData?.team_ranking && Array.isArray(tournamentData.team_ranking)) {
            ranking = tournamentData.team_ranking.map((team: any, index: number) => ({
              teamId: team.players || team.teamId || team.id,
              teamName: Array.isArray(team.players) ? 
                team.players.map((id: string) => participantNames[id] || `Participante ${id}`).join(' & ') :
                participantNames[team.teamId || team.id] || `Time ${team.teamId || team.id}`,
              position: index + 1,
              points: team.points || team.wins || 0,
              wins: team.wins || 0,
              losses: team.losses || 0,
              setsWon: team.setsWon || 0,
              setsLost: team.setsLost || 0,
              setsDiff: (team.setsWon || 0) - (team.setsLost || 0),
              winRate: team.matchesPlayed > 0 ? (team.wins / team.matchesPlayed) * 100 : 0
            }));
          }
          // Prioridade 3: Calcular ranking a partir dos matches
          else {
            ranking = calculateTournamentRanking(tournament);
          }
          
          return (
            <div key={tournament.id} className="bg-white rounded-xl shadow-lg border-2 border-red-200 overflow-hidden">
              {/* Header do Torneio */}
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    AO VIVO
                  </span>
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    {tournament.tournament ? 
                      getRoundText(tournament.tournament.current_round || 0, tournament.tournament.total_rounds || 0) : 
                      'Iniciando...'
                    }
                  </span>
                </div>

                <h3 className="font-bold text-xl mb-2">{tournament.title}</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2" />
                    {formatDate(tournament.date)}
                  </div>
                  <div className="flex items-center">
                    <Users size={14} className="mr-2" />
                    {getParticipantsCount(tournament)} participantes
                  </div>
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-2" />
                    <span className="truncate">{tournament.location}</span>
                  </div>
                  {tournament.type === 'SUPER8' && (
                    <div className="flex items-center">
                      <Trophy size={14} className="mr-2" />
                      Super 8
                    </div>
                  )}
                </div>
              </div>

              {/* Ranking Atual */}
              <div className="p-6">
                <h4 className="font-semibold text-lg mb-4 flex items-center">
                  <Trophy className="mr-2 text-yellow-500" size={20} />
                  {tournament.type === 'SUPER8' ? 'Ranking Individual' : 'Ranking Atual'}
                </h4>
                
                {ranking.length > 0 ? (
                  <div className="space-y-2 mb-6">
                    {ranking.slice(0, 5).map((entry, index) => (
                      <div key={Array.isArray(entry.teamId) ? entry.teamId.join('|') : entry.teamId} className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                        index === 1 ? 'bg-gray-50 border border-gray-200' :
                        index === 2 ? 'bg-orange-50 border border-orange-200' :
                        'bg-white border border-gray-100'
                      }`}>
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-500 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {entry.position}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{entry.teamName}</div>
                            <div className="text-sm text-gray-500">
                              {entry.wins}V - {entry.losses}D ({entry.winRate.toFixed(0)}%)
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{entry.points} pts</div>
                          <div className="text-sm text-gray-500">
                            {entry.setsDiff > 0 ? '+' : ''}{entry.setsDiff}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {ranking.length > 5 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        E mais {ranking.length - 5} participantes...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-6">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>Aguardando resultados...</p>
                  </div>
                )}
                
                <Link to={`/torneio/${tournament.id}/acompanhar`} className="block">
                  <Button className="w-full bg-red-600 hover:bg-red-700 flex items-center justify-center">
                    <Eye size={16} className="mr-2" />
                    Acompanhar Torneio
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AcontecendoAgora;
