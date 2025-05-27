import React, { useEffect, useState } from 'react';
import { useTournamentStore } from '../store/tournamentStore';
import { GroupRanking, OverallRanking, calculateOverallGroupStageRankings, calculateGroupRankings, calculateRankingsForPlacement } from '../utils/rankingUtils';
import { Match } from '../types';

interface TournamentRankingsProps {
  tournamentId: string;
  // Optional prop to provide player name mapping
  playerNameMap?: Record<string, string>;
}

const TournamentRankings: React.FC<TournamentRankingsProps> = ({ tournamentId, playerNameMap }) => {
  const { tournament, generateEliminationBracket } = useTournamentStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overall' | 'first' | 'second' | 'third'>('overall');
  const [overallRankings, setOverallRankings] = useState<OverallRanking[]>([]);
  const [firstPlaceRankings, setFirstPlaceRankings] = useState<OverallRanking[]>([]);
  const [secondPlaceRankings, setSecondPlaceRankings] = useState<OverallRanking[]>([]);
  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<OverallRanking[]>([]);
  const [groupRankings, setGroupRankings] = useState<Record<number, GroupRanking[]>>({});
  const [isGroupStageComplete, setIsGroupStageComplete] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [localPlayerNameMap, setLocalPlayerNameMap] = useState<Record<string, string>>({});
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
        
        rankings[parseInt(groupNum)] = calculateGroupRankings(completedMatches);
        allCompletedGroupMatches = [...allCompletedGroupMatches, ...completedMatches];
      });

      setIsGroupStageComplete(allGroupMatchesComplete);
      setGroupRankings(rankings);

      // Calcular rankings gerais
      const overall = calculateOverallGroupStageRankings(allCompletedGroupMatches);
      setOverallRankings(overall);

      // Calcular rankings por posição
      setFirstPlaceRankings(calculateRankingsForPlacement(rankings, 1));
      setSecondPlaceRankings(calculateRankingsForPlacement(rankings, 2));
      setThirdPlaceRankings(calculateRankingsForPlacement(rankings, 3));

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
      await generateEliminationBracket(tournament.id);
      window.alert('Fase eliminatória gerada com sucesso!');
    } catch (error) {
      console.error("Erro ao gerar fase eliminatória:", error);
      window.alert('Erro ao gerar fase eliminatória: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setGeneratingBracket(false);
    }
  };

  const renderTabContent = () => {
    const getLegend = () => (
      <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100 text-sm">
        <h5 className="font-medium mb-2 text-blue-700">Legenda:</h5>
        <ul className="space-y-1 text-blue-800">
          <li><span className="font-medium">V</span> - Vitórias: Total de partidas vencidas pela dupla</li>
          <li><span className="font-medium">SG</span> - Saldo de Games: Diferença entre games ganhos e perdidos</li>
          <li><span className="font-medium">PG</span> - Games Ganhos: Total de games conquistados pela dupla</li>
          <li><span className="font-medium">JP</span> - Jogos Disputados: Total de partidas em que a dupla participou</li>
        </ul>
      </div>
    );

    const renderRankingTable = (rankings: OverallRanking[], title: string) => {
      if (rankings.length === 0) {
        return <p className="text-gray-500 text-center">Não há rankings disponíveis para {title.toLowerCase()}.</p>;
      }

      return (
        <>
          <h3 className="text-xl font-bold mb-3">{title}</h3>
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
              <tbody className="bg-white divide-y divide-gray-200">                {rankings.map((entry) => {
                  // Map player IDs to names if available, otherwise use the IDs
                  const playerNames = entry.teamId.map(id => 
                    (playerNameMap && playerNameMap[id]) || 
                    (localPlayerNameMap && localPlayerNameMap[id]) || 
                    id
                  );
                  const teamName = playerNames.join(' & ');
                  
                  return (
                    <tr key={entry.teamId.join('-')} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap font-medium">
                        {entry.rank}
                      </td>                      <td className="px-3 py-2">
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
                            {entry.rank <= 2 && (
                              <div className="text-xs text-green-600 font-medium">
                                Classificado para eliminatórias
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
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(overallRankings, "Ranking Geral")}
          </div>
        );
      case 'first':
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(firstPlaceRankings, "Ranking dos Primeiros Lugares")}
          </div>
        );
      case 'second':
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(secondPlaceRankings, "Ranking dos Segundos Lugares")}
          </div>
        );
      case 'third':
        return (
          <div className="space-y-4">
            {getLegend()}
            {renderRankingTable(thirdPlaceRankings, "Ranking dos Terceiros Lugares")}
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
      <h2 className="text-2xl font-bold mb-6 text-center">Rankings do Torneio</h2>
      
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
      </div>

      {/* Área de exibição do ranking selecionado */}
      <div className="mt-4">
        {renderTabContent()}
      </div>      {/* Status da fase de grupos */}
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
                  ? 'Todas as partidas da fase de grupos foram concluídas. Os rankings estão finalizados.'
                  : 'Ainda existem partidas pendentes na fase de grupos. Os rankings podem mudar conforme os resultados são registrados.'
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
            } text-white font-bold rounded-lg shadow-md transition-colors`}
          >
            {generatingBracket ? 'Gerando...' : 'Avançar para Fase Eliminatória'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TournamentRankings;