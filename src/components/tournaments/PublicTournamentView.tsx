import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Match } from '../../types';
import { Spinner } from '../ui/Spinner';
import TournamentRankings from '../TournamentRankings';

// A simplified tournament service for the public view
const getTournamentPublicData = async (tournamentId: string): Promise<any> => {
  // This would be an API call in a real implementation
  // For now, returning mock data
  return {
    id: tournamentId,
    name: 'Torneio de Beach Tennis 2023',
    startDate: '2023-09-10',
    endDate: '2023-09-12',
    location: 'Arena da Praia, Rio de Janeiro',
    status: 'EM_ANDAMENTO',
    categories: [
      { id: 'cat1', name: 'Masculino A' },
      { id: 'cat2', name: 'Feminino A' },
      { id: 'cat3', name: 'Misto B' }
    ]
  };
};

// Get matches for a tournament and category
const getMatchesForCategory = async (tournamentId: string, categoryId: string): Promise<Match[]> => {
  // This would be an API call in a real implementation
  // For now, returning mock data
  return [
    {
      id: 'match1',
      team1: ['player1', 'player2'],
      team2: ['player3', 'player4'],
      score1: 6,
      score2: 3,
      winnerId: 'team1',
      completed: true,
      round: 1,
      position: 1,
      stage: 'GROUP',
      groupNumber: 1,
      eventId: 'event1',
      tournamentId: 'tournament1',
      scheduledTime: '2023-09-11T10:00:00Z'
    },
    {
      id: 'match2',
      team1: ['player5', 'player6'],
      team2: ['player7', 'player8'],
      score1: 4,
      score2: 6,
      winnerId: 'team1',
      completed: true,
      round: 1,
      position: 2,
      stage: 'GROUP',
      groupNumber: 1,
      eventId: 'event2',
      tournamentId: 'tournament1',
      scheduledTime: '2023-09-11T11:00:00Z'
    },
    {
      id: 'match3',
      team1: ['player1', 'player2'],
      team2: ['player7', 'player8'],
      score1: 0,
      score2: 0,
      winnerId: null,
      completed: false,
      round: 1,
      position: 1,
      stage: 'ELIMINATION',
      groupNumber: 1,
      eventId: 'event3',
      tournamentId: 'tournament1',
      scheduledTime: '2023-09-12T15:00:00Z'
    }
  ];
};

// Get player names by IDs
const getPlayersById = async (playerIds: string[]): Promise<any[]> => {
  // This would be an API call in a real implementation
  const mockPlayers = {
    player1: { id: 'player1', name: 'João Silva' },
    player2: { id: 'player2', name: 'Pedro Santos' },
    player3: { id: 'player3', name: 'Carlos Oliveira' },
    player4: { id: 'player4', name: 'Ricardo Pereira' },
    player5: { id: 'player5', name: 'Ana Costa' },
    player6: { id: 'player6', name: 'Maria Sousa' },
    player7: { id: 'player7', name: 'Mariana Alves' },
    player8: { id: 'player8', name: 'Juliana Ferreira' }
  };
  
  return playerIds.map(id => mockPlayers[id as keyof typeof mockPlayers]);
};

interface TeamInfo {
  playerIds: string[];
  playerNames: string[];
}

interface EnhancedMatch extends Match {
  team1Info?: TeamInfo;
  team2Info?: TeamInfo;
}

const PublicTournamentView: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [matches, setMatches] = useState<EnhancedMatch[]>([]);
  const [groupMatches, setGroupMatches] = useState<EnhancedMatch[]>([]);
  const [eliminationMatches, setEliminationMatches] = useState<EnhancedMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!tournamentId) return;
      
      try {
        setIsLoading(true);
        const data = await getTournamentPublicData(tournamentId);
        setTournament(data);
        
        // Set first category as default if available
        if (data.categories && data.categories.length > 0) {
          setSelectedCategory(data.categories[0].id);
        }
      } catch (error) {
        console.error('Error fetching tournament data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTournamentData();
  }, [tournamentId]);
  
  useEffect(() => {
    const fetchMatches = async () => {
      if (!tournamentId || !selectedCategory) return;
      
      try {
        setIsLoading(true);
        const matchData = await getMatchesForCategory(tournamentId, selectedCategory);
        
        // Collect all player IDs from matches
        const playerIds = new Set<string>();
        matchData.forEach(match => {
          match.team1?.forEach(id => playerIds.add(id));
          match.team2?.forEach(id => playerIds.add(id));
        });
        
        // Fetch player information
        const players = await getPlayersById(Array.from(playerIds));
        const playerMap = new Map();
        players.forEach(player => {
          playerMap.set(player.id, player);
        });
        
        // Enhance matches with player information
        const enhancedMatches = matchData.map(match => {
          const enhanced: EnhancedMatch = { ...match };
          
          if (match.team1) {
            enhanced.team1Info = {
              playerIds: match.team1,
              playerNames: match.team1.map(id => playerMap.get(id)?.name || 'Desconhecido')
            };
          }
          
          if (match.team2) {
            enhanced.team2Info = {
              playerIds: match.team2,
              playerNames: match.team2.map(id => playerMap.get(id)?.name || 'Desconhecido')
            };
          }
          
          return enhanced;
        });
        
        setMatches(enhancedMatches);
        
      // Separate matches by stage
        setGroupMatches(enhancedMatches.filter(m => m.stage === 'GROUP'));
        setEliminationMatches(enhancedMatches.filter(m => m.stage === 'ELIMINATION'));
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMatches();
  }, [tournamentId, selectedCategory]);
  
  // State to control active view tab
  const [activeView, setActiveView] = useState<'matches' | 'rankings'>('matches');
  
  if (isLoading && !tournament) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  
  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-600">Torneio não encontrado</h1>
        <p className="mt-2">O torneio que você está procurando não existe ou não está disponível.</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Tournament Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white mb-6 shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold">{tournament.name}</h1>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {new Date(tournament.startDate).toLocaleDateString('pt-BR')} a{' '}
              {new Date(tournament.endDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{tournament.location}</span>
          </div>
        </div>
        <div className="mt-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            tournament.status === 'EM_ANDAMENTO' ? 'bg-green-100 text-green-800' :
            tournament.status === 'AGENDADO' ? 'bg-yellow-100 text-yellow-800' :
            tournament.status === 'CONCLUIDO' ? 'bg-gray-100 text-gray-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {tournament.status === 'EM_ANDAMENTO' ? 'Em Andamento' :
             tournament.status === 'AGENDADO' ? 'Agendado' :
             tournament.status === 'CONCLUIDO' ? 'Concluído' : 'Cadastrado'}
          </span>
        </div>
      </div>
        {/* Category Selector */}
      <div className="mb-6">
        <label htmlFor="categorySelector" className="block text-sm font-medium text-gray-700 mb-1">
          Selecione uma categoria
        </label>
        <select
          id="categorySelector"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block w-full md:w-64 p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {tournament.categories.map((category: any) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* View Selector Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveView('matches')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeView === 'matches'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Partidas
            </button>
            <button
              onClick={() => setActiveView('rankings')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                activeView === 'rankings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rankings
            </button>
          </nav>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="md" />
        </div>      ) : activeView === 'rankings' ? (
        <div className="mt-4">
          {tournamentId && (
            <TournamentRankings 
              tournamentId={tournamentId}
              playerNameMap={matches.reduce((map, match) => {
                // Create a player name map from our match data
                if (match.team1Info) {
                  match.team1Info.playerIds.forEach((id, idx) => {
                    map[id] = match.team1Info?.playerNames[idx] || id;
                  });
                }
                if (match.team2Info) {
                  match.team2Info.playerIds.forEach((id, idx) => {
                    map[id] = match.team2Info?.playerNames[idx] || id;
                  });
                }
                return map;
              }, {} as Record<string, string>)}
            />
          )}
        </div>
      ) : (
        <>
          {/* Group Stage */}
          {groupMatches.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4 bg-gray-100 p-2 rounded-md">Fase de Grupos</h2>
              
              {/* Group matches by groupNumber */}              {Array.from(new Set(groupMatches.map(m => m.groupNumber))).map(groupNum => {
                // Check if all matches in this group are completed
                const groupMatchesArray = groupMatches.filter(m => m.groupNumber === groupNum);
                const isGroupComplete = groupMatchesArray.length > 0 && 
                  groupMatchesArray.every(m => m.completed);
                
                return (
                  <div key={`group-${groupNum}`} className="mb-6">
                    <h3 className="text-lg font-semibold mb-2 flex items-center">
                      <span>Grupo {groupNum}</span>
                      {isGroupComplete && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Completo
                        </span>
                      )}
                    </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse bg-white border border-gray-300 rounded-md overflow-hidden">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time 1</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Resultado</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Time 2</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {groupMatches
                          .filter(match => match.groupNumber === groupNum)
                          .map(match => (
                            <tr key={match.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {match.team1Info?.playerNames.join(' / ')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center font-semibold">
                                {match.completed ? `${match.score1} × ${match.score2}` : '×'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                {match.team2Info?.playerNames.join(' / ')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                                  match.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {match.completed ? 'Finalizado' : 'Pendente'}
                                </span>
                              </td>
                            </tr>                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
              })}
            </div>
          )}
          
          {/* Elimination Stage */}
          {eliminationMatches.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 bg-gray-100 p-2 rounded-md">Fase Eliminatória</h2>
              
              {/* Group by round */}
              {Array.from(new Set(eliminationMatches.map(m => m.round))).sort((a, b) => a - b).map(round => (
                <div key={`round-${round}`} className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    {round === 1 ? 'Oitavas de Final' : 
                     round === 2 ? 'Quartas de Final' : 
                     round === 3 ? 'Semifinal' : 
                     round === 4 ? 'Final' : `Rodada ${round}`}
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {eliminationMatches
                      .filter(match => match.round === round)
                      .sort((a, b) => (a.position || 0) - (b.position || 0))
                      .map(match => (
                        <div key={match.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-col md:flex-row justify-between items-center">
                            <div className="w-full md:w-2/5 mb-2 md:mb-0 text-center md:text-left">
                              <div className="font-medium">{match.team1Info?.playerNames.join(' / ') || 'A definir'}</div>
                            </div>
                            
                            <div className="w-full md:w-1/5 flex justify-center items-center">
                              <div className="px-4 py-2 font-bold text-xl text-center">
                                {match.completed ? `${match.score1} × ${match.score2}` : 'VS'}
                              </div>
                            </div>
                            
                            <div className="w-full md:w-2/5 text-center md:text-right">
                              <div className="font-medium">{match.team2Info?.playerNames.join(' / ') || 'A definir'}</div>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex justify-center">
                            <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                              match.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {match.completed ? 'Finalizado' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {matches.length === 0 && (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhuma partida encontrada para esta categoria.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublicTournamentView;
