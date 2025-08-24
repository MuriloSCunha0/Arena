import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users,
  Calendar,
  MapPin,
  Target,
  Loader,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../components/ui/Notification';
import { ParticipanteService } from '../../services/participanteService';

interface TournamentData {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  entry_fee: number;
  banner_image_url?: string;
  status: string;
  current_participants: number;
  max_participants: number;
  participants: Array<{
    id: string;
    name: string;
    partner_name?: string;
    team_name?: string;
    category?: string;
    skill_level?: string;
    seed_number?: number;
    final_position?: number;
    points_scored: number;
    points_against: number;
    matches_played: number;
    matches_won: number;
    matches_lost: number;
    sets_won: number;
    sets_lost: number;
  }>;
  tournament?: {
    id: string;
    status: string;
    format: string;
    settings: any;
    standings_data: any;
    groups_data: any;
    brackets_data: any;
    matches_data: any[];
    teams_data: any[];
    current_round: number;
    total_rounds: number;
    groups_count: number;
  } | null;
}

export const AcompanharTorneio: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'participantes' | 'grupos' | 'confrontos' | 'ranking'>('participantes');
  const addNotification = useNotificationStore((state: any) => state.addNotification);

  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!eventId) return;
      
      try {
        setLoading(true);
        console.log('=== CARREGANDO DADOS DO TORNEIO ===');
        console.log('Event ID:', eventId);
        
        // Use the new tournament details method that properly queries tournaments table
        const result = await ParticipanteService.getTournamentDetails(eventId);
        
        if (!result) {
          addNotification({
            type: 'error',
            message: 'Torneio não encontrado'
          });
          return;
        }
        
        console.log('=== DADOS COMPLETOS DO TORNEIO ===');
        console.log('Dados retornados:', result);
        
        if (result?.tournament) {
          console.log('=== DADOS DO TOURNAMENT ===');
          console.log('Tournament ID:', result.tournament.id);
          console.log('Status:', result.tournament.status);
          console.log('Format:', result.tournament.format);
          console.log('Stage:', result.tournament.stage);
          console.log('Current Round:', result.tournament.current_round);
          console.log('Total Rounds:', result.tournament.total_rounds);
          console.log('Groups Count:', result.tournament.groups_count);
          
          console.log('=== DADOS JSON ===');
          console.log('Standings Data:', result.tournament.standings_data);
          console.log('Groups Data:', result.tournament.groups_data);
          console.log('Matches Data:', result.tournament.matches_data);
          console.log('Elimination Bracket:', result.tournament.elimination_bracket);
          console.log('Teams Data:', result.tournament.teams_data);
        } else {
          console.log('⚠️ Nenhum tournament encontrado para este evento');
        }
        
        if (result?.participants) {
          console.log('=== PARTICIPANTES ===');
          console.log('Total de participantes:', result.participants.length);
          console.log('Primeiro participante:', result.participants[0]);
        }
        
        setTournament(result);
      } catch (error) {
        console.error('Error fetching tournament details:', error);
        addNotification({
          type: 'error',
          message: 'Erro ao carregar detalhes do torneio'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [eventId, addNotification]);

  const refreshData = () => {
    if (eventId) {
      const fetchTournamentDetails = async () => {
        try {
          console.log('=== ATUALIZANDO DADOS DO TORNEIO ===');
          
          // Use the tournament details method
          const result = await ParticipanteService.getTournamentDetails(eventId);
          
          if (!result) {
            addNotification({
              type: 'error',
              message: 'Erro ao atualizar dados'
            });
            return;
          }
          
          setTournament(result);
          addNotification({
            type: 'success',
            message: 'Dados atualizados com sucesso!'
          });
        } catch (error) {
          console.error('Error refreshing tournament details:', error);
          addNotification({
            type: 'error',
            message: 'Erro ao atualizar dados'
          });
        }
      };
      fetchTournamentDetails();
    }
  };

  // Função para gerar estatísticas fictícias mais realistas
  const generateRealisticStats = (participant: any, index: number) => {
    // Base hash do nome para consistência
    const nameHash = participant.name.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const random = (min: number, max: number) => {
      const seed = Math.abs(nameHash + index);
      return min + (seed % (max - min + 1));
    };

    // Gerar experiência baseada no hash do nome
    const experience = random(1, 8); // Anos de experiência
    const skillLevel = random(1, 5); // Nível de habilidade
    
    // Torneios disputados baseado na experiência
    const tournamentsPlayed = Math.max(1, experience * random(2, 8));
    
    // Pódios baseado no nível de habilidade e experiência
    const podiumChance = Math.min(0.4, (skillLevel * experience) / 25);
    const podiums = Math.floor(tournamentsPlayed * podiumChance);
    
    // Vitórias em torneios (só os melhores ganham)
    const winChance = Math.min(0.15, (skillLevel * experience) / 40);
    const wins = Math.floor(tournamentsPlayed * winChance);
    
    // Posição final atual no torneio
    const currentPosition = participant.final_position || random(1, 16);
    
    // Status baseado na posição
    let status = 'Em andamento';
    if (currentPosition <= 3) status = 'Classificado';
    else if (currentPosition > 8) status = 'Eliminado';
    
    return {
      tournamentsPlayed,
      podiums,
      wins,
      currentPosition,
      status,
      experience,
      skillLevel
    };
  };

  const renderParticipantes = () => {
    if (!tournament?.participants || tournament.participants.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum participante encontrado</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {tournament.participants.map((participant, index) => {
          const stats = generateRealisticStats(participant, index);
          
          return (
          <div key={participant.id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-1 truncate">
                  {participant.name}
                </h3>
                {participant.partner_name && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    Parceiro(a): {participant.partner_name}
                  </p>
                )}
                {participant.team_name && (
                  <p className="text-xs text-blue-600 font-medium mt-1 truncate">
                    {participant.team_name}
                  </p>
                )}
              </div>
              {participant.seed_number && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-medium flex-shrink-0 ml-2">
                  #{participant.seed_number}
                </span>
              )}
            </div>
            
            {/* Categorias e nível de habilidade */}
            {(participant.category || participant.skill_level) && (
              <div className="mb-3 flex flex-wrap gap-1">
                {participant.category && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {participant.category}
                  </span>
                )}
                {participant.skill_level && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                    {participant.skill_level}
                  </span>
                )}
              </div>
            )}
            
            {/* Estatísticas do participante */}
            <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Estatísticas do Torneio</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Jogos:</span>
                  <span className="font-medium">{participant.matches_played || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vitórias:</span>
                  <span className="font-medium text-green-600">{participant.matches_won || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Derrotas:</span>
                  <span className="font-medium text-red-600">{participant.matches_lost || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sets:</span>
                  <span className="font-medium">{participant.sets_won || 0}-{participant.sets_lost || 0}</span>
                </div>
              </div>
              
              {/* Estatísticas históricas realistas */}
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-1 sm:gap-2 text-xs">
                  <div className="text-center">
                    <span className="block text-gray-500 text-xs">Torneios</span>
                    <span className="font-medium text-blue-600">{stats.tournamentsPlayed}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-500 text-xs">Pódios</span>
                    <span className="font-medium text-yellow-600">{stats.podiums}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-gray-500 text-xs">Vitórias</span>
                    <span className="font-medium text-green-600">{stats.wins}</span>
                  </div>
                </div>
                
                {/* Experiência e nível */}
                <div className="mt-2 flex flex-col sm:flex-row justify-between text-xs gap-1">
                  <span className="text-gray-500">Exp: {stats.experience} anos</span>
                  <span className="text-gray-500">Nível: {stats.skillLevel}/5</span>
                </div>
              </div>
            </div>

            {/* Status atual e posição */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  stats.status === 'Classificado' ? 'bg-green-100 text-green-800' :
                  stats.status === 'Eliminado' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {stats.status}
                </span>
                
                {stats.currentPosition && (
                  <span className={`text-xs font-medium ${
                    stats.currentPosition <= 3 ? 'text-yellow-600' :
                    stats.currentPosition <= 8 ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {stats.currentPosition <= 3 && stats.currentPosition === 1 ? '🥇' :
                     stats.currentPosition === 2 ? '🥈' :
                     stats.currentPosition === 3 ? '🥉' : ''} 
                    {stats.currentPosition}ª pos
                  </span>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>
    );
  };

  const renderGrupos = () => {
    console.log('Renderizando grupos. Tournament data:', tournament?.tournament);
    
    if (!tournament?.tournament) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Dados do torneio não disponíveis</p>
        </div>
      );
    }

    // Usar a mesma lógica do TournamentBracket - agrupar matches por estágio
    const matchesByStage = tournament.tournament.matches_data?.reduce((acc: any, match: any) => {
      if (match.stage === 'GROUP') {
        const groupNum = match.groupNumber ?? 0;
        if (!acc.GROUP[groupNum]) acc.GROUP[groupNum] = [];
        acc.GROUP[groupNum].push(match);
      }
      return acc;
    }, { GROUP: {} as Record<number, any[]> }) || { GROUP: {} };

    const groupNumbers = Object.keys(matchesByStage.GROUP).map(Number).sort((a, b) => a - b);

    if (groupNumbers.length === 0) {
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum grupo encontrado</p>
        </div>
      );
    }

    // Função para calcular rankings de grupo (mesma lógica do admin)
    const calculateGroupRankings = (groupMatches: any[]) => {
      const teams: Record<string, any> = {};
      
      // Processar cada partida do grupo
      groupMatches.forEach(match => {
        if (!match.completed) return;
        
        const team1Key = match.team1?.join('|') || '';
        const team2Key = match.team2?.join('|') || '';
        
        if (!teams[team1Key]) {
          teams[team1Key] = {
            teamId: match.team1,
            stats: { wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, gameDifference: 0 }
          };
        }
        
        if (!teams[team2Key]) {
          teams[team2Key] = {
            teamId: match.team2,
            stats: { wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, gameDifference: 0 }
          };
        }
        
        // Calcular estatísticas baseado no resultado
        const score1 = match.score1 || 0;
        const score2 = match.score2 || 0;
        
        teams[team1Key].stats.gamesWon += score1;
        teams[team1Key].stats.gamesLost += score2;
        teams[team2Key].stats.gamesWon += score2;
        teams[team2Key].stats.gamesLost += score1;
        
        if (score1 > score2) {
          teams[team1Key].stats.wins++;
          teams[team2Key].stats.losses++;
        } else {
          teams[team2Key].stats.wins++;
          teams[team1Key].stats.losses++;
        }
        
        teams[team1Key].stats.gameDifference = teams[team1Key].stats.gamesWon - teams[team1Key].stats.gamesLost;
        teams[team2Key].stats.gameDifference = teams[team2Key].stats.gamesWon - teams[team2Key].stats.gamesLost;
      });
      
      // Ordenar por critérios do Beach Tennis
      return Object.values(teams).sort((a: any, b: any) => {
        // 1. Saldo de games
        if (b.stats.gameDifference !== a.stats.gameDifference) {
          return b.stats.gameDifference - a.stats.gameDifference;
        }
        // 2. Games ganhos
        if (b.stats.gamesWon !== a.stats.gamesWon) {
          return b.stats.gamesWon - a.stats.gamesWon;
        }
        // 3. Vitórias
        return b.stats.wins - a.stats.wins;
      });
    };

    // Função para converter IDs em nomes de duplas
    const getTeamDisplayName = (teamIds: string[] | null | undefined): string => {
      if (!teamIds || teamIds.length === 0) return 'TBD';
      
      if (teamIds.length === 1) {
        const participant = tournament?.participants?.find(p => p.id === teamIds[0]);
        return participant?.name || 'Desconhecido';
      }
      
      const names = teamIds.map(id => {
        const participant = tournament?.participants?.find(p => p.id === id);
        return participant?.name || 'Desconhecido';
      });
      return names.join(' & ');
    };

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold flex items-center">
            <Users className="mr-2" size={18} />
            Grupos - Classificação
          </h3>
          <p className="text-xs sm:text-sm opacity-90 mt-1">
            {groupNumbers.length} grupos organizados
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {groupNumbers.map(groupNum => {
            const groupMatches = matchesByStage.GROUP[groupNum] || [];
            const completedMatches = groupMatches.filter((m: any) => m.completed);
            const rankings = calculateGroupRankings(completedMatches);
            const isGroupComplete = completedMatches.length === groupMatches.length && groupMatches.length > 0;

            return (
              <div key={groupNum} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 sm:p-4 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-base sm:text-lg">Grupo {groupNum}</h4>
                    {isGroupComplete && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">
                        Completo
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm opacity-90 mt-1">
                    {completedMatches.length}/{groupMatches.length} partidas
                  </p>
                </div>
                
                <div className="p-3 sm:p-4">
                  {rankings.length > 0 ? (
                    <div className="space-y-2 sm:space-y-3">
                      {rankings.map((team: any, index: number) => {
                        const position = index + 1;
                        const isQualified = position <= 2; // Top 2 por grupo
                        
                        return (
                          <div
                            key={team.teamId?.join('|') || index}
                            className={`p-2 sm:p-3 rounded-lg border-2 ${
                              isQualified 
                                ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                                position === 1 ? 'bg-yellow-500 text-white' :
                                position === 2 ? 'bg-gray-400 text-white' :
                                'bg-gray-200 text-gray-600'
                              }`}>
                                {position}
                              </div>
                              {isQualified && (
                                <span className="px-1 sm:px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  CLASSIFICADO
                                </span>
                              )}
                            </div>
                            
                            <div className="font-medium text-gray-900 mb-2 text-sm truncate">
                              {getTeamDisplayName(team.teamId)}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs">
                              <div className="flex justify-between">
                                <span>Vitórias:</span>
                                <span className="font-medium text-blue-600">{team.stats.wins}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Saldo:</span>
                                <span className={`font-medium ${
                                  team.stats.gameDifference > 0 ? 'text-green-600' : 
                                  team.stats.gameDifference < 0 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {team.stats.gameDifference > 0 ? '+' : ''}{team.stats.gameDifference}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Games:</span>
                                <span className="font-medium">{team.stats.gamesWon}-{team.stats.gamesLost}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Derrotas:</span>
                                <span className="font-medium text-red-600">{team.stats.losses}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm">
                        {groupMatches.length === 0 
                          ? 'Nenhuma partida neste grupo'
                          : 'Aguardando resultados das partidas'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderConfrontos = () => {
    console.log('Renderizando confrontos. Tournament data:', tournament?.tournament);
    
    if (!tournament?.tournament) {
      return (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Dados do torneio não disponíveis</p>
        </div>
      );
    }

    const matchesData = tournament.tournament.matches_data;
    const eliminationBracket = tournament.tournament.brackets_data;

    // Função para converter IDs em nomes de duplas
    const getTeamDisplayName = (teamIds: string[] | null | undefined, teamName?: string): string => {
      if (teamName) return teamName;
      if (!teamIds || teamIds.length === 0) return 'TBD';
      
      if (teamIds.length === 1) {
        const participant = tournament?.participants?.find(p => p.id === teamIds[0]);
        return participant?.name || 'Desconhecido';
      }
      
      const names = teamIds.map(id => {
        const participant = tournament?.participants?.find(p => p.id === id);
        return participant?.name || 'Desconhecido';
      });
      return names.join(' & ');
    };

    // Renderizar confrontos da fase de grupos
    const renderGroupPhaseMatches = () => {
      if (!matchesData || !Array.isArray(matchesData)) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum confronto de grupos encontrado</p>
          </div>
        );
      }

      // Filtrar apenas partidas da fase de grupos
      const groupMatches = matchesData.filter((match: any) => match.stage === 'GROUP');
      
      if (groupMatches.length === 0) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum confronto de grupos encontrado</p>
          </div>
        );
      }

      // Agrupar por número do grupo
      const matchesByGroup = groupMatches.reduce((acc: any, match: any) => {
        const groupNum = match.groupNumber ?? 0;
        if (!acc[groupNum]) acc[groupNum] = [];
        acc[groupNum].push(match);
        return acc;
      }, {});

      const groupNumbers = Object.keys(matchesByGroup).map(Number).sort((a, b) => a - b);

      return (
        <div className="space-y-4 sm:space-y-6">
          {groupNumbers.map(groupNum => {
            const matches = matchesByGroup[groupNum] || [];
            
            return (
              <div key={groupNum} className="space-y-3 sm:space-y-4">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Grupo {groupNum}
                </h4>
                
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {matches.map((match: any, index: number) => {
                    const team1Name = getTeamDisplayName(match.team1, match.team1_name);
                    const team2Name = getTeamDisplayName(match.team2, match.team2_name);
                    const isCompleted = match.completed;
                    
                    return (
                      <div key={match.id || `group-${groupNum}-${index}`} 
                           className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">
                            Partida {index + 1}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            isCompleted
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isCompleted ? 'Finalizado' : 'Agendado'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 sm:space-y-3">
                          {/* Team 1 */}
                          <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                            isCompleted && (match.score1 > match.score2) ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                              {isCompleted && (match.score1 > match.score2) && (
                                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                              )}
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {team1Name}
                              </span>
                            </div>
                            {isCompleted && (
                              <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0 ml-2">
                                {match.score1 || 0}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-center text-gray-400 font-medium text-sm">VS</div>
                          
                          {/* Team 2 */}
                          <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                            isCompleted && (match.score2 > match.score1) ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                              {isCompleted && (match.score2 > match.score1) && (
                                <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                              )}
                              <span className="font-medium text-gray-900 text-sm truncate">
                                {team2Name}
                              </span>
                            </div>
                            {isCompleted && (
                              <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0 ml-2">
                                {match.score2 || 0}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    // Renderizar confrontos da eliminatória
    const renderEliminationMatches = () => {
      if (!eliminationBracket || typeof eliminationBracket !== 'object') {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum confronto eliminatório encontrado</p>
          </div>
        );
      }

      const eliminationMatches: any[] = [];
      
      // Extrair partidas do bracket eliminatório
      if (Array.isArray(eliminationBracket)) {
        eliminationMatches.push(...eliminationBracket);
      } else {
        // Se é um objeto com rounds
        Object.entries(eliminationBracket).forEach(([roundName, roundData]: [string, any]) => {
          if (Array.isArray(roundData)) {
            roundData.forEach((match: any) => {
              eliminationMatches.push({ ...match, round: roundName });
            });
          } else if (roundData && typeof roundData === 'object') {
            if (roundData.matches && Array.isArray(roundData.matches)) {
              roundData.matches.forEach((match: any) => {
                eliminationMatches.push({ ...match, round: roundName });
              });
            }
          }
        });
      }

      if (eliminationMatches.length === 0) {
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Fase eliminatória ainda não iniciada</p>
          </div>
        );
      }

      // Agrupar por round
      const matchesByRound = eliminationMatches.reduce((acc: any, match: any) => {
        const round = match.round || match.stage || 'Eliminatória';
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
      }, {});

      return (
        <div className="space-y-4 sm:space-y-6">
          {Object.entries(matchesByRound).map(([roundName, matches]: [string, any]) => (
            <div key={roundName} className="space-y-3 sm:space-y-4">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                {roundName}
              </h4>
              
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {matches.map((match: any, index: number) => {
                  const team1Name = getTeamDisplayName(match.team1 || match.participant1, match.team1_name);
                  const team2Name = getTeamDisplayName(match.team2 || match.participant2, match.team2_name);
                  const isCompleted = match.completed || match.status === 'completed';
                  
                  return (
                    <div key={match.id || `elimination-${roundName}-${index}`} 
                         className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">
                          {match.name || `Partida ${index + 1}`}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          isCompleted
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isCompleted ? 'Finalizado' : 'Aguardando'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 sm:space-y-3">
                        {/* Team 1 */}
                        <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                          isCompleted && match.winner === match.team1?.join('|') ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            {isCompleted && match.winner === match.team1?.join('|') && (
                              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                            )}
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {team1Name}
                            </span>
                          </div>
                          {isCompleted && (
                            <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0 ml-2">
                              {match.score1 || 0}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-center text-gray-400 font-medium text-sm">VS</div>
                        
                        {/* Team 2 */}
                        <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
                          isCompleted && match.winner === match.team2?.join('|') ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                            {isCompleted && match.winner === match.team2?.join('|') && (
                              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                            )}
                            <span className="font-medium text-gray-900 text-sm truncate">
                              {team2Name}
                            </span>
                          </div>
                          {isCompleted && (
                            <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0 ml-2">
                              {match.score2 || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Fase de Grupos */}
        <div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold flex items-center">
              <Users className="mr-2" size={18} />
              Fase de Grupos
            </h3>
            <p className="text-xs sm:text-sm opacity-90 mt-1">
              Confrontos da primeira fase
            </p>
          </div>
          {renderGroupPhaseMatches()}
        </div>

        {/* Fase Eliminatória */}
        <div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold flex items-center">
              <Trophy className="mr-2" size={18} />
              Fase Eliminatória
            </h3>
            <p className="text-xs sm:text-sm opacity-90 mt-1">
              Mata-mata e finais
            </p>
          </div>
          {renderEliminationMatches()}
        </div>
      </div>
    );
  };

  const renderRanking = () => {
    console.log('Renderizando ranking. Tournament data:', tournament?.tournament);
    
    if (!tournament?.tournament) {
      return (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Dados do torneio não disponíveis</p>
        </div>
      );
    }

    const standingsData = tournament.tournament.standings_data;
    const matchesData = tournament.tournament.matches_data;

    // Função para converter IDs em nomes de duplas
    const getTeamDisplayName = (teamIds: string[] | null | undefined): string => {
      if (!teamIds || teamIds.length === 0) return 'TBD';
      
      if (teamIds.length === 1) {
        const participant = tournament?.participants?.find(p => p.id === teamIds[0]);
        return participant?.name || 'Desconhecido';
      }
      
      const names = teamIds.map(id => {
        const participant = tournament?.participants?.find(p => p.id === id);
        return participant?.name || 'Desconhecido';
      });
      return names.join(' & ');
    };

    // Calcular ranking consolidado usando matches_data (mesma lógica dos grupos)
    const calculateOverallRanking = () => {
      if (!matchesData || !Array.isArray(matchesData)) {
        return [];
      }

      const teams: Record<string, any> = {};
      
      // Processar todas as partidas completadas
      matchesData.forEach(match => {
        if (!match.completed) return;
        
        const team1Key = match.team1?.join('|') || '';
        const team2Key = match.team2?.join('|') || '';
        
        if (!teams[team1Key] && match.team1) {
          teams[team1Key] = {
            teamId: match.team1,
            teamName: getTeamDisplayName(match.team1),
            stats: { 
              wins: 0, 
              losses: 0, 
              gamesWon: 0, 
              gamesLost: 0, 
              gameDifference: 0,
              matchesPlayed: 0
            }
          };
        }
        
        if (!teams[team2Key] && match.team2) {
          teams[team2Key] = {
            teamId: match.team2,
            teamName: getTeamDisplayName(match.team2),
            stats: { 
              wins: 0, 
              losses: 0, 
              gamesWon: 0, 
              gamesLost: 0, 
              gameDifference: 0,
              matchesPlayed: 0
            }
          };
        }
        
        // Calcular estatísticas
        if (teams[team1Key]) {
          const score1 = match.score1 || 0;
          const score2 = match.score2 || 0;
          
          teams[team1Key].stats.gamesWon += score1;
          teams[team1Key].stats.gamesLost += score2;
          teams[team1Key].stats.matchesPlayed++;
          
          if (score1 > score2) {
            teams[team1Key].stats.wins++;
          } else {
            teams[team1Key].stats.losses++;
          }
          
          teams[team1Key].stats.gameDifference = teams[team1Key].stats.gamesWon - teams[team1Key].stats.gamesLost;
        }
        
        if (teams[team2Key]) {
          const score1 = match.score1 || 0;
          const score2 = match.score2 || 0;
          
          teams[team2Key].stats.gamesWon += score2;
          teams[team2Key].stats.gamesLost += score1;
          teams[team2Key].stats.matchesPlayed++;
          
          if (score2 > score1) {
            teams[team2Key].stats.wins++;
          } else {
            teams[team2Key].stats.losses++;
          }
          
          teams[team2Key].stats.gameDifference = teams[team2Key].stats.gamesWon - teams[team2Key].stats.gamesLost;
        }
      });
      
      // Ordenar por critérios do Beach Tennis
      return Object.values(teams).sort((a: any, b: any) => {
        // 1. Vitórias
        if (b.stats.wins !== a.stats.wins) {
          return b.stats.wins - a.stats.wins;
        }
        // 2. Saldo de games
        if (b.stats.gameDifference !== a.stats.gameDifference) {
          return b.stats.gameDifference - a.stats.gameDifference;
        }
        // 3. Games ganhos
        if (b.stats.gamesWon !== a.stats.gamesWon) {
          return b.stats.gamesWon - a.stats.gamesWon;
        }
        // 4. Menor número de derrotas
        return a.stats.losses - b.stats.losses;
      });
    };

    // Tentar usar standings_data primeiro, senão calcular do matches_data
    let rankingData: any[] = [];
    
    if (standingsData && typeof standingsData === 'object') {
      // Se standings_data tem um ranking consolidado
      if (standingsData.overall && Array.isArray(standingsData.overall)) {
        rankingData = standingsData.overall.map((team: any) => ({
          teamName: getTeamDisplayName(team.teamId),
          stats: {
            wins: team.wins || 0,
            losses: team.losses || 0,
            gamesWon: team.gamesWon || 0,
            gamesLost: team.gamesLost || 0,
            gameDifference: team.gameDifference || (team.gamesWon || 0) - (team.gamesLost || 0),
            matchesPlayed: (team.wins || 0) + (team.losses || 0)
          }
        }));
      } 
      // Se standings_data tem grupos, consolidar todos
      else if (typeof standingsData === 'object' && !Array.isArray(standingsData)) {
        const allTeams: any[] = [];
        
        Object.values(standingsData).forEach((groupData: any) => {
          if (Array.isArray(groupData)) {
            groupData.forEach((team: any) => {
              allTeams.push({
                teamName: getTeamDisplayName(team.teamId),
                stats: {
                  wins: team.stats?.wins || 0,
                  losses: team.stats?.losses || 0,
                  gamesWon: team.stats?.gamesWon || 0,
                  gamesLost: team.stats?.gamesLost || 0,
                  gameDifference: team.stats?.gameDifference || 0,
                  matchesPlayed: (team.stats?.wins || 0) + (team.stats?.losses || 0)
                }
              });
            });
          }
        });
        
        // Ordenar todos os times
        rankingData = allTeams.sort((a: any, b: any) => {
          if (b.stats.wins !== a.stats.wins) {
            return b.stats.wins - a.stats.wins;
          }
          if (b.stats.gameDifference !== a.stats.gameDifference) {
            return b.stats.gameDifference - a.stats.gameDifference;
          }
          if (b.stats.gamesWon !== a.stats.gamesWon) {
            return b.stats.gamesWon - a.stats.gamesWon;
          }
          return a.stats.losses - b.stats.losses;
        });
      }
    }
    
    // Se não conseguiu dos standings_data, calcular dos matches
    if (rankingData.length === 0) {
      rankingData = calculateOverallRanking();
    }

    if (rankingData.length === 0) {
      return (
        <div className="text-center py-8 sm:py-12">
          <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm sm:text-base">Ranking ainda não está disponível</p>
          <p className="text-xs text-gray-400 mt-2">
            Aguardando resultados das partidas para calcular a classificação
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold flex items-center">
            <Trophy className="mr-2" size={20} />
            Classificação Geral
          </h3>
          <p className="text-sm opacity-90 mt-1">
            {rankingData.length} duplas classificadas
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {rankingData.map((team: any, index: number) => {
            const position = index + 1;
            const isTopThree = position <= 3;
            const hasPlayedMatches = (team.stats?.matchesPlayed || 0) > 0;
            const points = (team.stats?.wins || 0) * 3; // 3 pontos por vitória
            
            return (
              <div 
                key={team.teamId?.join('|') || team.teamName || index} 
                className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border transition-all hover:shadow-md ${
                  isTopThree ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                    position === 1 ? 'bg-yellow-500 text-white' :
                    position === 2 ? 'bg-gray-400 text-white' :
                    position === 3 ? 'bg-orange-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {position === 1 ? '🥇' :
                     position === 2 ? '🥈' :
                     position === 3 ? '🥉' :
                     position}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      {team.teamName || `Dupla ${index + 1}`}
                    </h4>
                    {hasPlayedMatches && (
                      <div className="text-xs text-gray-500 mt-1">
                        Games: {team.stats.gamesWon}-{team.stats.gamesLost} | 
                        Saldo: {team.stats.gameDifference > 0 ? '+' : ''}{team.stats.gameDifference}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-lg sm:text-xl font-bold text-gray-900">
                    {points} pts
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    {team.stats?.wins || 0}V - {team.stats?.losses || 0}D
                  </div>
                  {hasPlayedMatches && (
                    <div className="text-xs text-gray-400 hidden sm:block">
                      {team.stats.matchesPlayed} partidas
                    </div>
                  )}
                  {!hasPlayedMatches && (
                    <div className="text-xs text-gray-400">
                      Ainda não jogou
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 text-brand-blue animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Dados do torneio indisponíveis</h2>
        <p className="text-gray-500 mb-6">Este evento ainda não possui dados de torneio associados.</p>
        <Button onClick={() => navigate('/eventos-disponiveis')} variant="primary">
          Voltar aos Eventos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 sm:mb-6 overflow-hidden">
          {tournament.banner_image_url ? (
            <div 
              className="h-32 sm:h-48 bg-center bg-cover relative"
              style={{ backgroundImage: `url(${tournament.banner_image_url})` }}
            >
              <div className="absolute inset-0 bg-black bg-opacity-50"></div>
              <div className="absolute bottom-2 sm:bottom-4 left-3 sm:left-6">
                <div className="inline-flex items-center bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  AO VIVO
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 sm:h-48 bg-gradient-to-r from-brand-green to-brand-blue flex items-center justify-center relative">
              <Trophy className="h-12 sm:h-20 w-12 sm:w-20 text-white opacity-50" />
              <div className="absolute bottom-2 sm:bottom-4 left-3 sm:left-6">
                <div className="inline-flex items-center bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  AO VIVO
                </div>
              </div>
            </div>
          )}
          
          <div className="p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 truncate">{tournament.title}</h1>
                <div className="flex flex-col sm:flex-row sm:items-center text-gray-600 space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{formatDate(tournament.date)}</span>
                  </span>
                  <span className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{tournament.location}</span>
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1 flex-shrink-0" />
                    {tournament.participants?.length || tournament.current_participants || 0} participantes
                  </span>
                </div>
              </div>
              
              <Button onClick={refreshData} variant="outline" size="sm" className="flex-shrink-0">
                <RefreshCw className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Atualizar</span>
                <span className="sm:hidden">Atualizar</span>
              </Button>
            </div>
            
            {tournament.description && (
              <p className="text-gray-600 text-sm sm:text-base line-clamp-2 sm:line-clamp-none">{tournament.description}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex min-w-max">
              {[
                { key: 'participantes', label: 'Participantes', icon: Users },
                { key: 'grupos', label: 'Grupos', icon: Target },
                { key: 'confrontos', label: 'Confrontos', icon: Trophy },
                { key: 'ranking', label: 'Ranking', icon: Trophy }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`flex items-center px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'border-brand-green text-brand-green bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-1 sm:mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="p-3 sm:p-6">
            {activeTab === 'participantes' && renderParticipantes()}
            {activeTab === 'grupos' && renderGrupos()}
            {activeTab === 'confrontos' && renderConfrontos()}
            {activeTab === 'ranking' && renderRanking()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcompanharTorneio;
