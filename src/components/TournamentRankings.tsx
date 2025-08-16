import React, { useEffect, useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { 
  GroupRanking, 
  OverallRanking, 
  calculateOverallGroupStageRankings, 
  calculateGroupRankings, 
  calculateRankingsForPlacement,
  hasBye,
  getByeAdvancingTeam,
  detectTieBreaksInRanking,
  cleanPhantomMatchesAdvanced
} from '../utils/rankingUtils';
import { validateBeachTennisRules } from '../utils/beachTennisRules';
import { Match } from '../types';
import { TieBreakSelector } from './TieBreakSelector';

interface TournamentRankingsProps {
  tournamentId: string;
  // Optional prop to provide player name mapping
  playerNameMap?: Record<string, string>;
  // Optional prop to provide elimination matches for elimination ranking
  eliminationMatches?: Match[];
}

const TournamentRankings: React.FC<TournamentRankingsProps> = ({ 
  tournamentId: _tournamentId, 
  playerNameMap, 
  eliminationMatches = [] 
}) => {
  const { tournament, generateEliminationBracket } = useTournamentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overall' | 'first' | 'second' | 'third' | 'groups' | 'elimination'>('overall');
  const [overallRankings, setOverallRankings] = useState<OverallRanking[]>([]);
  const [firstPlaceRankings, setFirstPlaceRankings] = useState<OverallRanking[]>([]);
  const [secondPlaceRankings, setSecondPlaceRankings] = useState<OverallRanking[]>([]);
  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<OverallRanking[]>([]);
  const [groupRankings, setGroupRankings] = useState<Record<number, GroupRanking[]>>({});
  const [isGroupStageComplete, setIsGroupStageComplete] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [localPlayerNameMap, setLocalPlayerNameMap] = useState<Record<string, string>>({});
  const [eliminatedTeams, setEliminatedTeams] = useState<string[]>([]);
  const [showTieBreakResolver, setShowTieBreakResolver] = useState(false);
  
  // Build player name map from tournament data or use provided map
  useEffect(() => {
    if (tournament && !playerNameMap) {
      // If no playerNameMap is provided, try to build one from the tournament data
      const map: Record<string, string> = {};
      
      // Collect all unique player IDs from all matches
      const playerIds = new Set<string>();
      tournament.matches.forEach(match => {
        if (match.team1) match.team1.forEach(id => playerIds.add(id));
        if (match.team2) match.team2.forEach(id => playerIds.add(id));
      });
      
      // For now, just use the IDs as names. In a real implementation, 
      // you would fetch the actual names from the tournament data or API
      playerIds.forEach(id => {
        map[id] = id; // In real implementation, replace this with actual name lookup
      });
      
      setLocalPlayerNameMap(map);
    } else if (playerNameMap) {
      setLocalPlayerNameMap(playerNameMap);
    }
  }, [tournament, playerNameMap]);

  // Helper function to calculate rankings by placement position
  const calculatePlacementRankings = (
    groupRankings: Record<number, GroupRanking[]>, 
    position: number
  ): OverallRanking[] => {
    const placementTeams: OverallRanking[] = [];
    
    // Extract teams from specific position in each group
    Object.entries(groupRankings).forEach(([groupNum, rankings]) => {
      if (rankings.length >= position) {
        const team = rankings[position - 1]; // position is 1-based, array is 0-based
        placementTeams.push({
          teamId: team.teamId,
          team: team.team || team.teamId.join(' & '),
          rank: 0, // Will be recalculated
          stats: {
            wins: team.stats.wins,
            losses: team.stats.losses,
            matchesPlayed: team.stats.matchesPlayed,
            gamesWon: team.stats.gamesWon,
            gamesLost: team.stats.gamesLost,
            gameDifference: team.stats.gameDifference,
            groupNumber: parseInt(groupNum),
            headToHead: team.stats.headToHead
          },
          groupNumber: parseInt(groupNum)
        });
      }
    });

    // Sort by Beach Tennis criteria
    placementTeams.sort((a, b) => {
      // 1. Game difference (primary criterion)
      if (a.stats.gameDifference !== b.stats.gameDifference) {
        return b.stats.gameDifference - a.stats.gameDifference;
      }

      // 2. Total games won
      if (a.stats.gamesWon !== b.stats.gamesWon) {
        return b.stats.gamesWon - a.stats.gamesWon;
      }

      // 3. Fewest games lost
      if (a.stats.gamesLost !== b.stats.gamesLost) {
        return a.stats.gamesLost - b.stats.gamesLost;
      }

      // 4. Most wins
      if (a.stats.wins !== b.stats.wins) {
        return b.stats.wins - a.stats.wins;
      }

      // 5. Most matches played
      if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
        return b.stats.matchesPlayed - a.stats.matchesPlayed;
      }

      return 0;
    });

    // Assign ranks
    placementTeams.forEach((team, index) => {
      team.rank = index + 1;
    });

    return placementTeams;
  };

  useEffect(() => {
    if (!tournament) {
      setError("Torneio não encontrado");
      setLoading(false);
      return;
    }

    try {
      // Organizar partidas por grupos
      const matchesByStage: Record<string, any> = {
        GROUP: {},
        ELIMINATION: []
      };

      tournament.matches.forEach(match => {
        if (match.stage === 'GROUP') {
          const groupNum = match.groupNumber ?? 0;
          if (!matchesByStage.GROUP[groupNum]) matchesByStage.GROUP[groupNum] = [];
          matchesByStage.GROUP[groupNum].push(match);
        } else {
          matchesByStage.ELIMINATION.push(match);
        }
      });

      // [NOVO] Limpar partidas fantasma das partidas de eliminação
      console.log('🧹 Aplicando limpeza de partidas fantasma...');
      const cleanedEliminationMatches = cleanPhantomMatchesAdvanced(matchesByStage.ELIMINATION);
      matchesByStage.ELIMINATION = cleanedEliminationMatches;
      console.log(`✅ Partidas de eliminação limpas: ${matchesByStage.ELIMINATION.length} partidas válidas`);

      // Verificar se a fase de grupos está completa
      let allGroupMatchesComplete = true;
      const rankings: Record<number, GroupRanking[]> = {};
      let allCompletedGroupMatches: Match[] = [];
      
      // Verifica se existem grupos para analisar
      if (Object.keys(matchesByStage.GROUP).length === 0) {
        setIsGroupStageComplete(false);
        setLoading(false);
        return;
      }
      
      Object.keys(matchesByStage.GROUP).forEach(groupNum => {
        const groupMatches = matchesByStage.GROUP[groupNum] || [];
        const completedMatches = groupMatches.filter((m: Match) => m.completed);
        
        if (completedMatches.length !== groupMatches.length) {
          allGroupMatchesComplete = false;
        }
        
        // Usar regras específicas do Beach Tennis para cálculo de rankings
        rankings[parseInt(groupNum)] = calculateGroupRankings(completedMatches, true);
        allCompletedGroupMatches = [...allCompletedGroupMatches, ...completedMatches];
      });

      setIsGroupStageComplete(allGroupMatchesComplete);
      setGroupRankings(rankings);

      // Calcular rankings gerais
      const overall = calculateOverallGroupStageRankings(allCompletedGroupMatches);
      setOverallRankings(overall);

      // Calcular rankings por posição usando a nova função
      setFirstPlaceRankings(calculatePlacementRankings(rankings, 1));
      setSecondPlaceRankings(calculatePlacementRankings(rankings, 2));
      setThirdPlaceRankings(calculatePlacementRankings(rankings, 3));

      setLoading(false);
    } catch (err) {
      console.error("Erro ao calcular rankings:", err);
      setError("Falha ao calcular rankings do torneio");
      setLoading(false);
    }
  }, [tournament]);

  const handleGenerateEliminationBracket = async () => {
    if (!tournament || !isGroupStageComplete) return;
    
    setGeneratingBracket(true);
    try {
      // USAR APENAS BYE AUTOMÁTICO INTELIGENTE
      await generateEliminationBracket(tournament.id, true);
      
      window.alert('Fase eliminatória gerada com BYE automático inteligente!');
    } catch (error) {
      console.error("Erro ao gerar fase eliminatória:", error);
      window.alert('Erro ao gerar fase eliminatória: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setGeneratingBracket(false);
    }
  };

  // Validar regras do Beach Tennis
  useEffect(() => {
    if (tournament && tournament.matches.length > 0) {
      // Extrair grupos da estrutura do torneio
      const groups: string[][][] = [];
      // Esta lógica dependeria da estrutura específica do torneio
      
      const validation = validateBeachTennisRules(groups, tournament.matches);
      if (!validation.isValid) {
        console.warn('Beach Tennis rules validation failed:', validation.errors);
      }
    }
  }, [tournament]);

  // Adicionar função para lidar com eliminação de dupla
  const handleTeamElimination = (eliminatedTeam: OverallRanking) => {
    const teamKey = eliminatedTeam.teamId.join('|');
    setEliminatedTeams(prev => [...prev, teamKey]);
    setShowTieBreakResolver(false);
    
    // Notificar sobre a eliminação
    window.alert(`Dupla ${eliminatedTeam.teamId.map(id => playerNameMap?.[id] || 'Desconhecido').join(' & ')} foi eliminada do ranking geral.`);
  };

  const renderTabContent = () => {
    const getLegend = () => (
      <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100 text-sm">
        <h5 className="font-medium mb-2 text-blue-700">Legenda (Regras Beach Tennis):</h5>
        <ul className="space-y-1 text-blue-800">
          <li><span className="font-medium">V</span> - Vitórias: Total de partidas vencidas pela dupla</li>
          <li><span className="font-medium">SG</span> - Saldo de Games: Diferença entre games ganhos e perdidos (critério principal)</li>
          <li><span className="font-medium">PG</span> - Games Ganhos: Total de games conquistados pela dupla</li>
          <li><span className="font-medium">JP</span> - Jogos Disputados: Total de partidas em que a dupla participou</li>
        </ul>
        <div className="mt-2 text-xs text-blue-600">
          <strong>Critérios de classificação:</strong> 1º Saldo de Games, 2º Games Ganhos, 3º Confronto Direto, 4º Jogos Disputados
        </div>
      </div>
    );

    const renderRankingTable = (rankings: OverallRanking[], title: string, showEliminated?: boolean, isOverall?: boolean) => {
      if (rankings.length === 0) {
        return <p className="text-gray-500 text-center">Não há rankings disponíveis para {title.toLowerCase()}.</p>;
      }

      return (
        <>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Dupla</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">V</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">SG</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">PG</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">JP</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rankings.map((entry) => {
                  // Map player IDs to names if available, otherwise use the IDs
                  const playerNames = entry.teamId.map(id => 
                    (playerNameMap && playerNameMap[id]) || 
                    (localPlayerNameMap && localPlayerNameMap[id]) || 
                    id
                  );
                  const teamName = playerNames.join(' & ');
                  
                  return (
                    <tr 
                      key={entry.teamId.join('-')} 
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-medium">
                        {entry.rank}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center">
                          {/* Badge for top ranking teams */}
                          {entry.rank <= 3 && (
                            <span className={`inline-flex mr-2 items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white
                              ${entry.rank === 1 ? 'bg-yellow-500' : entry.rank === 2 ? 'bg-gray-400' : 'bg-amber-700'}`}>
                              {entry.rank}
                            </span>
                          )}
                          {/* Team name */}
                          <div>
                            {teamName}
                            {activeTab === 'overall' && entry.rank <= (overallRankings.filter(e => e.rank <= 2).length) && (
                              <div className="text-xs text-green-600 font-medium">
                                {/* Classificado para eliminatórias removido */}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center font-medium">{entry.stats.wins}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        <span className={entry.stats.gameDifference > 0 ? 'text-green-600 font-medium' : 
                          entry.stats.gameDifference < 0 ? 'text-red-600' : ''}>
                          {entry.stats.gameDifference > 0 ? `+${entry.stats.gameDifference}` : entry.stats.gameDifference}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gamesWon}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.matchesPlayed}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    };

    switch (activeTab) {
      case 'overall':
        if (overallRankings.length === 0) {
          return (
            <div className="text-center py-8 text-gray-500">
              <p>Complete todas as partidas da fase de grupos para ver o ranking geral.</p>
            </div>
          );
        }

        // Filtrar duplas eliminadas
        const filteredOverallRankings = overallRankings.filter(
          team => !eliminatedTeams.includes(team.teamId.join('|'))
        );

        // Detectar empates que afetam classificação (assumindo top 8 classificam)
        const qualificationCutoff = 8;
        const tieBreakInfo = detectTieBreaksInRanking(filteredOverallRankings, qualificationCutoff);

        return (
          <div className="space-y-6">
            {getLegend()}
            
            {/* Mostrar alerta de empate se necessário */}
            {tieBreakInfo.hasTieBreaks && tieBreakInfo.affectsQualification && (
              <TieBreakSelector
                tiedTeams={tieBreakInfo.tiedTeams}
                onTeamEliminated={handleTeamElimination}
                playerNameMap={playerNameMap || {}}
              />
            )}
            
            {/* Mostrar duplas eliminadas */}
            {eliminatedTeams.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Duplas Eliminadas por Desempate:</h4>
                <div className="space-y-1">
                  {eliminatedTeams.map(teamKey => {
                    const originalTeam = overallRankings.find(t => t.teamId.join('|') === teamKey);
                    if (!originalTeam) return null;
                    
                    return (
                      <div key={teamKey} className="text-sm text-red-700">
                        • {originalTeam.teamId.map(id => playerNameMap?.[id] || 'Desconhecido').join(' & ')} 
                        (Grupo {originalTeam.groupNumber})
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setEliminatedTeams([]);
                    setShowTieBreakResolver(false);
                  }}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Restaurar todas as duplas
                </button>
              </div>
            )}
            
            {renderRankingTable(filteredOverallRankings, "Ranking Geral", true, true)}
          </div>
        );
      case 'first':
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(firstPlaceRankings, "Ranking dos Primeiros Lugares por Grupo")}
          </div>
        );
      case 'second':
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(secondPlaceRankings, "Ranking dos Segundos Lugares por Grupo")}
          </div>
        );
      case 'third':
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(thirdPlaceRankings, "Ranking dos Terceiros Lugares por Grupo")}
          </div>
        );
      case 'groups':
        return (
          <div className="space-y-6">
            {/* Legend específica para rankings por grupos */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Critérios de Classificação Beach Tennis
              </h5>
              <div className="text-sm text-green-700 space-y-1">
                <div>1. <strong>Saldo de Games</strong> (games ganhos - games perdidos)</div>
                <div>2. <strong>Total de Games Ganhos</strong></div>
                <div>3. <strong>Confronto Direto</strong> (em caso de empate)</div>
                <div>4. <strong>Menor Número de Games Perdidos</strong></div>
              </div>
            </div>
            
            {/* Grid de rankings por grupos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(groupRankings).map(([groupNumber, rankings]) => (
                <div key={groupNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
                    <h3 className="font-bold text-lg">Grupo {groupNumber}</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {rankings.map((team, index) => {
                      const position = index + 1;
                      const isQualified = position <= 2; // Top 2 se classificam
                      const playerNames = team.teamId.map(id => 
                        (playerNameMap && playerNameMap[id]) || 
                        (localPlayerNameMap && localPlayerNameMap[id]) || 
                        id
                      );
                      const teamName = playerNames.join(' / ');
                      
                      const getRankIcon = (pos: number) => {
                        switch (pos) {
                          case 1: return <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" /></svg>;
                          case 2: return <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" /></svg>;
                          case 3: return <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" /></svg>;
                          default: return <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" /></svg>;
                        }
                      };
                      
                      const getRankColor = (pos: number, qualified: boolean) => {
                        if (qualified) {
                          return pos === 1 
                            ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300'
                            : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
                        }
                        return 'bg-gray-50 border-gray-200';
                      };
                      
                      return (
                        <div
                          key={team.teamId.join('|')}
                          className={`p-3 rounded-lg border-2 ${getRankColor(position, isQualified)}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getRankIcon(position)}
                            <span className="font-semibold">{position}º</span>
                            {isQualified && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                CLASSIFICADO
                              </span>
                            )}
                          </div>
                          <div className="font-medium text-gray-900 mb-2">
                            {teamName}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span>Saldo:</span>
                              <span className={team.stats.gameDifference > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {team.stats.gameDifference > 0 ? '+' : ''}{team.stats.gameDifference}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Vitórias:</span>
                              <span className="font-medium text-blue-600">{team.stats.wins}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'elimination':
        return (
          <div className="space-y-6">
            {/* Legend específica para fase eliminatória */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h5 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5 8.293 7.207a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0z" clipRule="evenodd" />
                </svg>
                Status da Fase Eliminatória
              </h5>
              <div className="text-sm text-purple-700 space-y-1">
                <div><strong>BYE:</strong> Equipe avança automaticamente para a próxima fase</div>
                <div><strong>Aguardando:</strong> Partida ainda não iniciada</div>
                <div><strong>Em andamento:</strong> Partida sendo disputada</div>
                <div><strong>Finalizada:</strong> Partida concluída</div>
              </div>
            </div>

            {eliminationMatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg">Nenhuma partida eliminatória encontrada</p>
                <p className="text-sm">A fase eliminatória ainda não foi gerada</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Agrupamento por rodadas */}
                {Object.entries(
                  eliminationMatches.reduce((rounds, match) => {
                    const round = match.round || 'Sem Rodada';
                    if (!rounds[round]) rounds[round] = [];
                    rounds[round].push(match);
                    return rounds;
                  }, {} as Record<string, typeof eliminationMatches>)
                ).map(([roundName, roundMatches]) => (
                  <div key={roundName} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-t-lg">
                      <h3 className="font-bold text-lg">{roundName}</h3>
                      <p className="text-purple-100 text-sm">{roundMatches.length} partida(s)</p>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roundMatches.map((match) => {
                          // Verificar se é BYE
                          const isByeMatch = hasBye(match);
                          const byeAdvancingTeam = isByeMatch ? getByeAdvancingTeam(match) : null;
                          
                          // Obter nomes das equipes
                          const getTeamName = (teamIds: string[] | null) => {
                            if (!teamIds || teamIds.length === 0) return 'TBD';
                            return teamIds.map(id => 
                              (playerNameMap && playerNameMap[id]) || 
                              (localPlayerNameMap && localPlayerNameMap[id]) || 
                              id
                            ).join(' & ');
                          };

                          const team1Name = getTeamName(match.team1);
                          const team2Name = getTeamName(match.team2);
                          
                          // Status da partida
                          const getMatchStatus = () => {
                            if (isByeMatch) return { text: 'BYE', color: 'bg-blue-100 text-blue-800' };
                            if (match.completed) return { text: 'Finalizada', color: 'bg-gray-100 text-gray-800' };
                            if (match.scheduledTime) return { text: 'Agendada', color: 'bg-yellow-100 text-yellow-800' };
                            return { text: 'Aguardando', color: 'bg-gray-100 text-gray-600' };
                          };

                          const status = getMatchStatus();

                          return (
                            <div key={match.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div className="text-sm text-gray-500">
                                  Partida #{match.position || 'N/A'}
                                </div>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${status.color}`}>
                                  {status.text}
                                </span>
                              </div>

                              {isByeMatch ? (
                                <div className="text-center py-4">
                                  <div className="text-lg font-semibold text-blue-600 mb-2">
                                    {byeAdvancingTeam ? getTeamName(byeAdvancingTeam) : 'Equipe BYE'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Avança automaticamente (BYE)
                                  </div>
                                  <div className="mt-2">
                                    <svg className="w-8 h-8 mx-auto text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5 8.293 7.207a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="space-y-2 mb-3">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gray-900">{team1Name}</span>
                                      <span className="text-sm text-gray-500">vs</span>
                                      <span className="font-medium text-gray-900">{team2Name}</span>
                                    </div>
                                    
                                    {match.completed && (
                                      <div className="flex justify-between items-center text-center">
                                        <div className={`px-3 py-1 rounded ${
                                          match.score1 && match.score2 && match.score1 > match.score2 
                                            ? 'bg-green-100 text-green-800 font-semibold' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {match.score1 || 0}
                                        </div>
                                        <span className="text-gray-400">×</span>
                                        <div className={`px-3 py-1 rounded ${
                                          match.score1 && match.score2 && match.score2 > match.score1 
                                            ? 'bg-green-100 text-green-800 font-semibold' 
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {match.score2 || 0}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {(match.scheduledTime || match.courtId) && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                      {match.scheduledTime && (
                                        <div>📅 {new Date(match.scheduledTime).toLocaleString('pt-BR')}</div>
                                      )}
                                      {match.courtId && (
                                        <div>🏟️ Quadra {match.courtId}</div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-2">Carregando rankings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-800">
        <h3 className="font-bold mb-2">Erro</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Rankings do Torneio (Beach Tennis)</h2>
      
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <button
          onClick={() => setActiveTab('overall')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'overall' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Ranking Geral
        </button>
        <button
          onClick={() => setActiveTab('first')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'first' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          1º Lugares
        </button>
        <button
          onClick={() => setActiveTab('second')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'second' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          2º Lugares
        </button>
        <button
          onClick={() => setActiveTab('third')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'third' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          3º Lugares
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'groups' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          Rankings por Grupos
        </button>
        
      </div>

      {/* Área de exibição do ranking selecionado */}
      <div className="mt-4">
        {renderTabContent()}
      </div>

      {/* Status da fase de grupos */}
      <div className="mt-6 mb-4">
        <div className={`p-4 rounded-lg border ${isGroupStageComplete ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center">
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${isGroupStageComplete ? 'bg-green-100' : 'bg-yellow-100'}`}>
              {isGroupStageComplete ? (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="ml-4">
              <h3 className={`text-lg font-medium ${isGroupStageComplete ? 'text-green-800' : 'text-yellow-800'}`}>
                {isGroupStageComplete ? 'Fase de Grupos Concluída' : 'Fase de Grupos em Andamento'}
              </h3>
              <p className={`text-sm ${isGroupStageComplete ? 'text-green-600' : 'text-yellow-600'}`}>
                {isGroupStageComplete 
                  ? 'Todas as partidas da fase de grupos foram concluídas. Rankings calculados com regras do Beach Tennis.'
                  : 'Ainda existem partidas pendentes na fase de grupos. Rankings atualizados conforme regras do Beach Tennis.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão para fase eliminatória - Apenas para administradores */}
      {isGroupStageComplete && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGenerateEliminationBracket}
            disabled={generatingBracket}
            className={`px-6 py-3 ${
              generatingBracket
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white font-bold rounded-lg shadow-md transition-colors flex items-center gap-2`}
          >
            {generatingBracket ? (
              'Gerando Chave...'
            ) : (
              <>
                Avançar para Fase Eliminatória (Beach Tennis)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TournamentRankings;