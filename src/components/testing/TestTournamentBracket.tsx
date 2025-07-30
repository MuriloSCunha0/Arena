import React, { useState, useMemo } from 'react';
import { Trophy, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Match, Participant } from '../../types';
import { 
  calculateOverallGroupStageRankings, 
  generateEliminationBracketWithSmartBye
} from '../../utils/rankingUtils';

interface TestTournamentData {
  id: string;
  name: string;
  participants: Participant[];
  teams: string[][];
  groups: { groupNumber: number; teams: string[][] }[];
  matches: Match[];
  stage: 'SETUP' | 'GROUP_STAGE' | 'ELIMINATION';
  status: 'PENDING' | 'STARTED' | 'COMPLETED';
  eliminationBracket?: {
    matches: Match[];
    metadata: any;
    generatedAt: string;
    qualifiedTeams: any[];
  };
  createdAt: string;
  updatedAt: string;
}

interface TestTournamentBracketProps {
  tournament: TestTournamentData;
  onUpdate: (tournament: TestTournamentData) => void;
}

const TestTournamentBracket: React.FC<TestTournamentBracketProps> = ({ tournament, onUpdate }) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [showRankings, setShowRankings] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'bracket'>('matches');

  const getParticipantName = (id: string) => {
    return tournament.participants.find(p => p.id === id)?.name || 'Participante não encontrado';
  };

  const getTeamName = (teamIds: string[] | null) => {
    if (!teamIds || teamIds.length === 0) return 'TBD';
    return teamIds.map(id => getParticipantName(id)).join(' & ');
  };

  const updateMatchScore = () => {
    if (!selectedMatch || score1 === '' || score2 === '') return;

    const score1Num = parseInt(score1);
    const score2Num = parseInt(score2);

    const updatedMatch = {
      ...selectedMatch,
      score1: score1Num,
      score2: score2Num,
      completed: true,
      winnerId: (score1Num > score2Num ? 'team1' : 'team2') as 'team1' | 'team2',
      updatedAt: new Date().toISOString()
    };

    const updatedMatches = tournament.matches.map(m => 
      m.id === selectedMatch.id ? updatedMatch : m
    );

    const updatedTournament = {
      ...tournament,
      matches: updatedMatches,
      updatedAt: new Date().toISOString()
    };

    onUpdate(updatedTournament);
    setSelectedMatch(null);
    setScore1('');
    setScore2('');
  };

  const generateEliminationPhase = () => {
    // Calculate overall rankings
    const overallRankings = calculateOverallGroupStageRankings(tournament.matches);
    
    // Take top teams (you can adjust this logic)
    const qualifiedTeams = overallRankings.slice(0, Math.min(8, overallRankings.length));
    
    if (qualifiedTeams.length < 2) {
      alert('É necessário pelo menos 2 duplas classificadas para gerar a fase eliminatória');
      return;
    }

    // Generate elimination bracket
    const { matches: eliminationMatches, metadata } = generateEliminationBracketWithSmartBye(qualifiedTeams);
    
    // Add IDs to matches
    const matchesWithIds = eliminationMatches.map(match => ({
      ...match,
      eventId: tournament.id,
      tournamentId: tournament.id,
    }));

    const eliminationBracket = {
      matches: matchesWithIds,
      metadata,
      generatedAt: new Date().toISOString(),
      qualifiedTeams: qualifiedTeams.map(team => ({
        teamId: team.teamId,
        rank: team.rank,
        groupNumber: team.groupNumber
      }))
    };

    const updatedTournament = {
      ...tournament,
      matches: [...tournament.matches, ...matchesWithIds],
      eliminationBracket,
      stage: 'ELIMINATION' as const,
      updatedAt: new Date().toISOString()
    };

    onUpdate(updatedTournament);
  };

  const groupMatches = useMemo(() => {
    return tournament.matches.filter(m => m.stage === 'GROUP');
  }, [tournament.matches]);

  const eliminationMatches = useMemo(() => {
    return tournament.matches.filter(m => m.stage === 'ELIMINATION');
  }, [tournament.matches]);

  const isGroupStageComplete = useMemo(() => {
    return groupMatches.length > 0 && groupMatches.every(m => m.completed);
  }, [groupMatches]);

  const renderMatchCard = (match: Match) => (
    <div key={match.id} className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-500">
          {match.stage === 'GROUP' ? `Grupo ${match.groupNumber}` : `${getRoundName(match.round)}`}
        </div>
        <div className="text-sm text-gray-500">
          {match.completed ? '✅ Finalizada' : '⏳ Pendente'}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{getTeamName(match.team1)}</span>
          <span className="text-lg font-bold">{match.score1 ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium">{getTeamName(match.team2)}</span>
          <span className="text-lg font-bold">{match.score2 ?? '-'}</span>
        </div>
      </div>

      {!match.completed && match.team1 && match.team2 && match.team1.length > 0 && match.team2.length > 0 && (
        <Button 
          onClick={() => setSelectedMatch(match)}
          className="mt-3 w-full"
          size="sm"
        >
          Inserir Resultado
        </Button>
      )}
    </div>
  );

  const getRoundName = (round: number) => {
    switch (round) {
      case 1: return 'Primeira Rodada';
      case 2: return 'Semifinal';
      case 3: return 'Final';
      default: return `Rodada ${round}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'matches' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Partidas
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'bracket' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chaveamento
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowRankings(true)} variant="outline">
            <Eye size={16} className="mr-2" />
            Ver Rankings
          </Button>
          
          {tournament.stage === 'GROUP_STAGE' && isGroupStageComplete && (
            <Button onClick={generateEliminationPhase} className="bg-green-600 hover:bg-green-700">
              <Trophy size={16} className="mr-2" />
              Gerar Eliminatória
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          {/* Group Stage Matches */}
          {groupMatches.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Fase de Grupos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupMatches.map(renderMatchCard)}
              </div>
            </div>
          )}

          {/* Elimination Matches */}
          {eliminationMatches.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Fase Eliminatória</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eliminationMatches.map(renderMatchCard)}
              </div>
            </div>
          )}

          {tournament.matches.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Nenhuma partida gerada ainda</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bracket' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Chaveamento Visual</h3>
          
          {eliminationMatches.length > 0 ? (
            <div className="space-y-6">
              {Array.from(new Set(eliminationMatches.map(m => m.round))).map(round => (
                <div key={round} className="space-y-2">
                  <h4 className="font-medium text-gray-700">{getRoundName(round)}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {eliminationMatches
                      .filter(m => m.round === round)
                      .map(match => (
                        <div key={match.id} className="bg-white rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-500">Posição {match.position}</span>
                            <span className="text-sm text-gray-500">
                              {match.completed ? '✅' : '⏳'}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{getTeamName(match.team1)}</span>
                              <span className="font-bold">{match.score1 ?? '-'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{getTeamName(match.team2)}</span>
                              <span className="font-bold">{match.score2 ?? '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                {tournament.stage === 'GROUP_STAGE' 
                  ? 'Complete a fase de grupos para gerar o chaveamento eliminatório'
                  : 'Nenhum chaveamento gerado ainda'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Match Score Modal */}
      <Modal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title="Inserir Resultado"
      >
        {selectedMatch && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="text-sm text-gray-500 mb-2">
                {selectedMatch.stage === 'GROUP' 
                  ? `Grupo ${selectedMatch.groupNumber}` 
                  : getRoundName(selectedMatch.round)
                }
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {getTeamName(selectedMatch.team1)}
                  </label>
                  <Input
                    type="number"
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                
                <div className="text-2xl font-bold text-gray-400">VS</div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {getTeamName(selectedMatch.team2)}
                  </label>
                  <Input
                    type="number"
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={updateMatchScore} 
                className="flex-1"
                disabled={score1 === '' || score2 === ''}
              >
                Salvar Resultado
              </Button>
              <Button onClick={() => setSelectedMatch(null)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rankings Modal */}
      <Modal
        isOpen={showRankings}
        onClose={() => setShowRankings(false)}
        title="Rankings do Torneio"
        size="large"
      >
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Rankings Gerais</h3>
          {groupMatches.length > 0 ? (
            <div className="space-y-2">
              {calculateOverallGroupStageRankings(groupMatches).map((team, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{index + 1}º - </span>
                    <span>{team.teamId.map(id => getParticipantName(id)).join(' & ')}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    V: {team.stats.wins} | D: {team.stats.gameDifference} | J: {team.stats.gamesWon}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma partida disponível para ranking</p>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default TestTournamentBracket;
