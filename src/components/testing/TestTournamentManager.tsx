import React, { useState, useEffect } from 'react';
import { Plus, Play, Trophy, Save, Eye, Trash2, ArrowLeft, Target, Award } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Participant, Match } from '../../types';
import { 
  calculateOverallGroupStageRankings, 
  generateEliminationBracketWithSmartBye,
  calculateGroupRankings
} from '../../utils/rankingUtils';

// Simple Card components for this test environment
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-6 py-4 border-b border-gray-200">
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

// Simple UUID generator
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface TestTournamentData {
  id: string;
  name: string;
  category: string;
  description?: string;
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

const TestTournamentManager: React.FC = () => {
  const [tournaments, setTournaments] = useState<TestTournamentData[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TestTournamentData | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'tournament' | 'bracket'>('list');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  
  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCategory, setTournamentCategory] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchScore1, setMatchScore1] = useState('');
  const [matchScore2, setMatchScore2] = useState('');

  // Load tournaments from localStorage
  useEffect(() => {
    const savedTournaments = localStorage.getItem('testTournaments');
    if (savedTournaments) {
      setTournaments(JSON.parse(savedTournaments));
    }
  }, []);

  // Save tournaments to localStorage
  const saveTournaments = (updatedTournaments: TestTournamentData[]) => {
    setTournaments(updatedTournaments);
    localStorage.setItem('testTournaments', JSON.stringify(updatedTournaments));
  };

  const saveTournament = (updatedTournament: TestTournamentData) => {
    const updatedTournaments = tournaments.map(t => 
      t.id === updatedTournament.id ? updatedTournament : t
    );
    setSelectedTournament(updatedTournament);
    saveTournaments(updatedTournaments);
  };

  const createTournament = () => {
    if (!tournamentName.trim() || !tournamentCategory.trim()) return;

    const newTournament: TestTournamentData = {
      id: generateUUID(),
      name: tournamentName,
      category: tournamentCategory,
      description: tournamentDescription,
      participants: [],
      teams: [],
      groups: [],
      matches: [],
      stage: 'SETUP',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTournaments = [...tournaments, newTournament];
    saveTournaments(updatedTournaments);
    
    setTournamentName('');
    setTournamentCategory('');
    setTournamentDescription('');
    setShowCreateModal(false);
  };

  const deleteTournament = (tournamentId: string) => {
    if (confirm('Tem certeza que deseja excluir este torneio?')) {
      const updatedTournaments = tournaments.filter(t => t.id !== tournamentId);
      saveTournaments(updatedTournaments);
      if (selectedTournament?.id === tournamentId) {
        setSelectedTournament(null);
        setCurrentView('list');
      }
    }
  };

  const addParticipant = () => {
    if (!participantName.trim() || !selectedTournament) return;

    const newParticipant: Participant = {
      id: generateUUID(),
      name: participantName.trim(),
      email: `${participantName.toLowerCase().replace(/\s+/g, '')}@test.com`,
      phone: '(00) 00000-0000',
      cpf: '000.000.000-00',
      category: 'OPEN',
      eventId: selectedTournament.id,
      userId: generateUUID(),
      partnerId: null,
      paymentStatus: 'PENDING',
      registeredAt: new Date().toISOString()
    };

    const updatedTournament = {
      ...selectedTournament,
      participants: [...selectedTournament.participants, newParticipant],
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setParticipantName('');
    setShowParticipantModal(false);
  };

  const createTeam = () => {
    if (selectedParticipants.length !== 2 || !selectedTournament) return;

    const newTeam = selectedParticipants;
    const updatedTournament = {
      ...selectedTournament,
      teams: [...selectedTournament.teams, newTeam],
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setSelectedParticipants([]);
    setShowTeamModal(false);
  };

  const addTeamToGroup = (teamIndex: number) => {
    if (!selectedTournament) return;

    const team = selectedTournament.teams[teamIndex];
    const existingGroup = selectedTournament.groups.find(g => g.groupNumber === currentGroup);
    
    let updatedGroups;
    if (existingGroup) {
      updatedGroups = selectedTournament.groups.map(g => 
        g.groupNumber === currentGroup 
          ? { ...g, teams: [...g.teams, team] }
          : g
      );
    } else {
      updatedGroups = [...selectedTournament.groups, { groupNumber: currentGroup, teams: [team] }];
    }

    const updatedTournament = {
      ...selectedTournament,
      groups: updatedGroups,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
  };

  const generateGroupMatches = () => {
    if (!selectedTournament) return;

    const matches: Match[] = [];
    
    selectedTournament.groups.forEach(group => {
      // Generate round-robin matches for each group
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          matches.push({
            id: generateUUID(),
            team1: group.teams[i],
            team2: group.teams[j],
            round: 1,
            position: matches.length + 1,
            score1: null,
            score2: null,
            completed: false,
            winnerId: null,
            courtId: null,
            scheduledTime: null,
            stage: 'GROUP',
            groupNumber: group.groupNumber,
            eventId: selectedTournament.id,
            tournamentId: selectedTournament.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    const updatedTournament = {
      ...selectedTournament,
      matches,
      stage: 'GROUP_STAGE' as const,
      status: 'STARTED' as const,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
  };

  const updateMatchScore = () => {
    if (!selectedMatch || !selectedTournament) return;

    const score1 = parseInt(matchScore1) || 0;
    const score2 = parseInt(matchScore2) || 0;
    const winnerId: 'team1' | 'team2' | null = score1 > score2 ? 'team1' : 'team2';

    const updatedMatches = selectedTournament.matches.map(match =>
      match.id === selectedMatch.id
        ? {
            ...match,
            score1,
            score2,
            completed: true,
            winnerId,
            updatedAt: new Date().toISOString()
          }
        : match
    );

    const updatedTournament = {
      ...selectedTournament,
      matches: updatedMatches,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setSelectedMatch(null);
    setMatchScore1('');
    setMatchScore2('');
    setShowMatchModal(false);
  };

  const generateEliminationPhase = () => {
    if (!selectedTournament) return;

    // Calculate overall rankings
    const overallRankings = calculateOverallGroupStageRankings(selectedTournament.matches);
    
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
      eventId: selectedTournament.id,
      tournamentId: selectedTournament.id,
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
      ...selectedTournament,
      matches: [...selectedTournament.matches, ...matchesWithIds],
      eliminationBracket,
      stage: 'ELIMINATION' as const,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setCurrentView('bracket');
  };

  const getParticipantName = (id: string) => {
    return selectedTournament?.participants.find(p => p.id === id)?.name || 'Participante não encontrado';
  };

  const getTeamName = (team: string[]) => {
    return team.map(id => getParticipantName(id)).join(' & ');
  };

  // Tournament List View
  if (currentView === 'list') {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ambiente de Testes - Torneios</h1>
              <p className="text-gray-600">Gerencie múltiplos torneios de teste para diferentes categorias</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus size={16} className="mr-2" />
              Novo Torneio de Teste
            </Button>
          </div>

          {tournaments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum torneio de teste criado</h3>
                <p className="text-gray-600 mb-6">Crie torneios de teste para diferentes categorias e teste o sistema completo</p>
                <Button onClick={() => setShowCreateModal(true)} variant="outline">
                  Criar Primeiro Torneio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map(tournament => (
                <Card key={tournament.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{tournament.name}</h3>
                        <p className="text-sm text-gray-600 font-normal">{tournament.category}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          onClick={() => {
                            setSelectedTournament(tournament);
                            setCurrentView('tournament');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button 
                          onClick={() => deleteTournament(tournament.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          tournament.stage === 'SETUP' ? 'bg-yellow-100 text-yellow-800' :
                          tournament.stage === 'GROUP_STAGE' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {tournament.stage === 'SETUP' ? 'Configuração' :
                           tournament.stage === 'GROUP_STAGE' ? 'Fase de Grupos' : 'Eliminatórias'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Participantes:</span>
                        <span>{tournament.participants.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Duplas:</span>
                        <span>{tournament.teams.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Grupos:</span>
                        <span>{tournament.groups.length}</span>
                      </div>
                      {tournament.description && (
                        <p className="text-gray-600 mt-2">{tournament.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create Tournament Modal */}
          <Modal 
            isOpen={showCreateModal} 
            onClose={() => setShowCreateModal(false)}
            title="Criar Torneio de Teste"
          >
            <div className="space-y-4">
              <Input
                label="Nome do Torneio"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="Ex: Torneio Beach Tennis Principiante"
                required
              />
              <Input
                label="Categoria"
                value={tournamentCategory}
                onChange={(e) => setTournamentCategory(e.target.value)}
                placeholder="Ex: Principiante, Amador, Feminino"
                required
              />
              <Input
                label="Descrição (opcional)"
                value={tournamentDescription}
                onChange={(e) => setTournamentDescription(e.target.value)}
                placeholder="Descrição adicional do torneio"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={createTournament} 
                  className="flex-1" 
                  disabled={!tournamentName.trim() || !tournamentCategory.trim()}
                >
                  Criar Torneio
                </Button>
                <Button onClick={() => setShowCreateModal(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  // Tournament Detail View
  if (currentView === 'tournament' && selectedTournament) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setCurrentView('list')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft size={16} className="mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{selectedTournament.name}</h1>
                <p className="text-gray-600">
                  {selectedTournament.category} • {selectedTournament.stage === 'SETUP' ? 'Configuração' : 
                                       selectedTournament.stage === 'GROUP_STAGE' ? 'Fase de Grupos' : 'Fase Eliminatória'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedTournament.stage === 'GROUP_STAGE' && (
                <Button onClick={() => setShowRankingModal(true)} variant="outline">
                  <Award size={16} className="mr-2" />
                  Rankings
                </Button>
              )}
              <Button onClick={() => saveTournament(selectedTournament)} variant="outline">
                <Save size={16} className="mr-2" />
                Salvar
              </Button>
            </div>
          </div>

          {selectedTournament.stage === 'SETUP' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Participants */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Participantes ({selectedTournament.participants.length})</span>
                      <Button onClick={() => setShowParticipantModal(true)} size="sm">
                        <Plus size={16} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedTournament.participants.map(participant => (
                        <div key={participant.id} className="text-sm bg-gray-50 p-2 rounded">
                          {participant.name}
                        </div>
                      ))}
                      {selectedTournament.participants.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhum participante adicionado</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Teams */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Duplas ({selectedTournament.teams.length})</span>
                      <Button 
                        onClick={() => setShowTeamModal(true)} 
                        size="sm"
                        disabled={selectedTournament.participants.length < 2}
                      >
                        <Plus size={16} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedTournament.teams.map((team, index) => (
                        <div key={index} className="text-sm bg-gray-50 p-2 rounded flex justify-between items-center">
                          <span>{getTeamName(team)}</span>
                          <Button 
                            onClick={() => {
                              setShowGroupModal(true);
                            }}
                            size="sm" 
                            variant="outline"
                            className="ml-2"
                          >
                            + Grupo {currentGroup}
                          </Button>
                        </div>
                      ))}
                      {selectedTournament.teams.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhuma dupla formada</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Groups */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Grupos ({selectedTournament.groups.length})</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={currentGroup}
                          onChange={(e) => setCurrentGroup(Number(e.target.value))}
                          className="w-16 h-8 text-xs"
                          min="1"
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedTournament.groups.map(group => (
                        <div key={group.groupNumber} className="border rounded p-2">
                          <div className="font-medium text-sm mb-1">Grupo {group.groupNumber}</div>
                          {group.teams.map((team, teamIndex) => (
                            <div key={teamIndex} className="text-xs text-gray-600 pl-2">
                              {getTeamName(team)}
                            </div>
                          ))}
                        </div>
                      ))}
                      {selectedTournament.groups.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhum grupo criado</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Button 
                      onClick={generateGroupMatches}
                      disabled={selectedTournament.groups.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play size={16} className="mr-2" />
                      Iniciar Fase de Grupos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {selectedTournament.stage === 'GROUP_STAGE' && (
            <>
              {/* Group Matches */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Partidas da Fase de Grupos</span>
                    <Button 
                      onClick={generateEliminationPhase}
                      disabled={selectedTournament.matches.filter(m => !m.completed).length > 0}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Target size={16} className="mr-2" />
                      Gerar Eliminatórias
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedTournament.groups.map(group => (
                      <div key={group.groupNumber} className="border rounded p-4">
                        <h4 className="font-medium mb-3">Grupo {group.groupNumber}</h4>
                        <div className="space-y-2">
                          {selectedTournament.matches
                            .filter(match => match.groupNumber === group.groupNumber)
                            .map(match => (
                              <div 
                                key={match.id} 
                                className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                                onClick={() => {
                                  setSelectedMatch(match);
                                  setMatchScore1(match.score1?.toString() || '');
                                  setMatchScore2(match.score2?.toString() || '');
                                  setShowMatchModal(true);
                                }}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-medium">
                                    {getTeamName(match.team1 as string[])} vs {getTeamName(match.team2 as string[])}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  {match.completed ? (
                                    <span className="text-sm font-mono">
                                      {match.score1} - {match.score2}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">Pendente</span>
                                  )}
                                  <Button size="sm" variant="outline">
                                    {match.completed ? 'Editar' : 'Inserir'} Resultado
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Modals */}
          <Modal 
            isOpen={showParticipantModal} 
            onClose={() => setShowParticipantModal(false)}
            title="Adicionar Participante"
          >
            <div className="space-y-4">
              <Input
                label="Nome do Participante"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Ex: João Silva"
              />
              <div className="flex gap-2">
                <Button onClick={addParticipant} className="flex-1" disabled={!participantName.trim()}>
                  Adicionar
                </Button>
                <Button onClick={() => setShowParticipantModal(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          </Modal>

          <Modal 
            isOpen={showTeamModal} 
            onClose={() => setShowTeamModal(false)}
            title="Formar Dupla"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione 2 participantes
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedTournament.participants.map(participant => (
                    <div key={participant.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={participant.id}
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={(e) => {
                          if (e.target.checked && selectedParticipants.length < 2) {
                            setSelectedParticipants([...selectedParticipants, participant.id]);
                          } else if (!e.target.checked) {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id));
                          }
                        }}
                        disabled={!selectedParticipants.includes(participant.id) && selectedParticipants.length >= 2}
                        className="mr-2"
                      />
                      <label htmlFor={participant.id} className="text-sm">
                        {participant.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={createTeam} 
                  className="flex-1" 
                  disabled={selectedParticipants.length !== 2}
                >
                  Formar Dupla
                </Button>
                <Button onClick={() => setShowTeamModal(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          </Modal>

          <Modal 
            isOpen={showGroupModal} 
            onClose={() => setShowGroupModal(false)}
            title="Adicionar Dupla ao Grupo"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecione uma dupla para adicionar ao Grupo {currentGroup}:
              </p>
              <div className="space-y-2">
                {selectedTournament.teams.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">
                      {getTeamName(team)}
                    </span>
                    <Button 
                      onClick={() => {
                        addTeamToGroup(index);
                        setShowGroupModal(false);
                      }}
                      size="sm"
                    >
                      Adicionar
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={() => setShowGroupModal(false)} variant="outline" className="w-full">
                Cancelar
              </Button>
            </div>
          </Modal>

          <Modal 
            isOpen={showMatchModal} 
            onClose={() => setShowMatchModal(false)}
            title="Resultado da Partida"
          >
            {selectedMatch && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium">
                    {getTeamName(selectedMatch.team1 as string[])} vs {getTeamName(selectedMatch.team2 as string[])}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={getTeamName(selectedMatch.team1 as string[])}
                    type="number"
                    value={matchScore1}
                    onChange={(e) => setMatchScore1(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                  <Input
                    label={getTeamName(selectedMatch.team2 as string[])}
                    type="number"
                    value={matchScore2}
                    onChange={(e) => setMatchScore2(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={updateMatchScore} 
                    className="flex-1"
                    disabled={!matchScore1 || !matchScore2}
                  >
                    Salvar Resultado
                  </Button>
                  <Button onClick={() => setShowMatchModal(false)} variant="outline">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </Modal>

          <Modal 
            isOpen={showRankingModal} 
            onClose={() => setShowRankingModal(false)}
            title="Rankings dos Grupos"
          >
            <div className="space-y-6">
              {selectedTournament.groups.map(group => {
                const groupMatches = selectedTournament.matches.filter(m => m.groupNumber === group.groupNumber);
                const rankings = calculateGroupRankings(groupMatches);
                
                return (
                  <div key={group.groupNumber} className="border rounded p-4">
                    <h4 className="font-medium mb-3">Grupo {group.groupNumber}</h4>
                    <div className="space-y-2">
                      {rankings.map((team, index) => (
                        <div key={`${group.groupNumber}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm w-6 text-center">
                              {index + 1}º
                            </span>
                            <span className="text-sm font-medium">
                              {getTeamName(team.teamId as string[])}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>V: {team.stats.wins}</span>
                            <span>D: {team.stats.losses}</span>
                            <span>Pts: {team.stats.wins * 3}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Button onClick={() => setShowRankingModal(false)} variant="outline" className="w-full">
                Fechar
              </Button>
            </div>
          </Modal>
        </div>
      </div>
    );
  }

  return null;
};

export default TestTournamentManager;
