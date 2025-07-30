import React, { useState, useEffect } from 'react';
import { Plus, Play, Trophy, Save, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Participant, Match } from '../../types';

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

const TestTournament: React.FC = () => {
  const [tournament, setTournament] = useState<TestTournamentData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = useState(1);

  // Load tournament from localStorage
  useEffect(() => {
    const savedTournament = localStorage.getItem('testTournament');
    if (savedTournament) {
      setTournament(JSON.parse(savedTournament));
    }
  }, []);

  // Save tournament to localStorage
  const saveTournament = (updatedTournament: TestTournamentData) => {
    setTournament(updatedTournament);
    localStorage.setItem('testTournament', JSON.stringify(updatedTournament));
  };

  const createTournament = () => {
    if (!tournamentName.trim()) return;

    const newTournament: TestTournamentData = {
      id: generateUUID(),
      name: tournamentName,
      participants: [],
      teams: [],
      groups: [],
      matches: [],
      stage: 'SETUP',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveTournament(newTournament);
    setTournamentName('');
    setShowCreateModal(false);
  };

  const addParticipant = () => {
    if (!participantName.trim() || !tournament) return;

    const newParticipant: Participant = {
      id: generateUUID(),
      name: participantName.trim(),
      email: `${participantName.toLowerCase().replace(/\s+/g, '')}@test.com`,
      phone: '(00) 00000-0000',
      cpf: '000.000.000-00',
      category: 'OPEN',
      eventId: tournament.id,
      userId: generateUUID(),
      partnerId: null,
      paymentStatus: 'PENDING',
      registeredAt: new Date().toISOString()
    };

    const updatedTournament = {
      ...tournament,
      participants: [...tournament.participants, newParticipant],
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setParticipantName('');
    setShowParticipantModal(false);
  };

  const createTeam = () => {
    if (selectedParticipants.length !== 2 || !tournament) return;

    const newTeam = selectedParticipants;
    const updatedTournament = {
      ...tournament,
      teams: [...tournament.teams, newTeam],
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setSelectedParticipants([]);
    setShowTeamModal(false);
  };

  const addTeamToGroup = (teamIndex: number) => {
    if (!tournament) return;

    const team = tournament.teams[teamIndex];
    const existingGroup = tournament.groups.find(g => g.groupNumber === currentGroup);
    
    let updatedGroups;
    if (existingGroup) {
      updatedGroups = tournament.groups.map(g => 
        g.groupNumber === currentGroup 
          ? { ...g, teams: [...g.teams, team] }
          : g
      );
    } else {
      updatedGroups = [...tournament.groups, { groupNumber: currentGroup, teams: [team] }];
    }

    const updatedTournament = {
      ...tournament,
      groups: updatedGroups,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
  };

  const generateGroupMatches = () => {
    if (!tournament) return;

    const matches: Match[] = [];
    
    tournament.groups.forEach(group => {
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
            eventId: tournament.id,
            tournamentId: tournament.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    const updatedTournament = {
      ...tournament,
      matches,
      stage: 'GROUP_STAGE' as const,
      status: 'STARTED' as const,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
  };

  const resetTournament = () => {
    localStorage.removeItem('testTournament');
    setTournament(null);
  };

  const getParticipantName = (id: string) => {
    return tournament?.participants.find(p => p.id === id)?.name || 'Participante não encontrado';
  };

  if (!tournament) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ambiente de Testes</h1>
              <p className="text-gray-600">Crie e teste torneios em um ambiente controlado</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus size={16} className="mr-2" />
              Criar Torneio de Teste
            </Button>
          </div>

          <Card className="text-center py-12">
            <CardContent>
              <Trophy size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum torneio de teste criado</h3>
              <p className="text-gray-600 mb-6">Crie um torneio de teste para começar a experimentar o sistema</p>
              <Button onClick={() => setShowCreateModal(true)} variant="outline">
                Criar Primeiro Torneio
              </Button>
            </CardContent>
          </Card>
        </div>

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
              placeholder="Ex: Torneio Beach Tennis Test"
            />
            <div className="flex gap-2">
              <Button onClick={createTournament} className="flex-1" disabled={!tournamentName.trim()}>
                Criar Torneio
              </Button>
              <Button onClick={() => setShowCreateModal(false)} variant="outline">
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
            <p className="text-gray-600">
              Torneio de Teste • {tournament.stage === 'SETUP' ? 'Configuração' : 
                                   tournament.stage === 'GROUP_STAGE' ? 'Fase de Grupos' : 'Fase Eliminatória'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => saveTournament(tournament)} variant="outline">
              <Save size={16} className="mr-2" />
              Salvar
            </Button>
            <Button onClick={resetTournament} variant="outline" className="text-red-600">
              <RotateCcw size={16} className="mr-2" />
              Resetar
            </Button>
          </div>
        </div>

        {tournament.stage === 'SETUP' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Participants */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Participantes ({tournament.participants.length})</span>
                  <Button onClick={() => setShowParticipantModal(true)} size="sm">
                    <Plus size={16} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {tournament.participants.map(participant => (
                    <div key={participant.id} className="text-sm bg-gray-50 p-2 rounded">
                      {participant.name}
                    </div>
                  ))}
                  {tournament.participants.length === 0 && (
                    <p className="text-gray-500 text-sm">Nenhum participante adicionado</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Teams */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Duplas ({tournament.teams.length})</span>
                  <Button 
                    onClick={() => setShowTeamModal(true)} 
                    size="sm"
                    disabled={tournament.participants.length < 2}
                  >
                    <Plus size={16} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {tournament.teams.map((team, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded flex justify-between items-center">
                      <span>{team.map(id => getParticipantName(id)).join(' & ')}</span>
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
                  {tournament.teams.length === 0 && (
                    <p className="text-gray-500 text-sm">Nenhuma dupla formada</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Groups */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Grupos ({tournament.groups.length})</span>
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
                  {tournament.groups.map(group => (
                    <div key={group.groupNumber} className="border rounded p-2">
                      <div className="font-medium text-sm mb-1">Grupo {group.groupNumber}</div>
                      {group.teams.map((team, teamIndex) => (
                        <div key={teamIndex} className="text-xs text-gray-600 pl-2">
                          {team.map(id => getParticipantName(id)).join(' & ')}
                        </div>
                      ))}
                    </div>
                  ))}
                  {tournament.groups.length === 0 && (
                    <p className="text-gray-500 text-sm">Nenhum grupo criado</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        {tournament.stage === 'SETUP' && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Button 
                  onClick={generateGroupMatches}
                  disabled={tournament.groups.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play size={16} className="mr-2" />
                  Iniciar Fase de Grupos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {tournament.stage === 'GROUP_STAGE' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Partidas da Fase de Grupos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tournament.groups.map(group => (
                  <div key={group.groupNumber} className="border rounded p-4">
                    <h4 className="font-medium mb-3">Grupo {group.groupNumber}</h4>
                    <div className="space-y-2">
                      {tournament.matches
                        .filter(match => match.groupNumber === group.groupNumber)
                        .map(match => (
                          <div 
                            key={match.id} 
                            className="flex items-center justify-between p-3 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-sm font-medium">
                                {(match.team1 as string[]).map(id => getParticipantName(id)).join(' & ')} vs {(match.team2 as string[]).map(id => getParticipantName(id)).join(' & ')}
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
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tournament.stage === 'ELIMINATION' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Fase Eliminatória</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Funcionalidade de eliminatórias será implementada em breve.
                Use o novo TestTournamentManager para um ambiente mais completo.
              </p>
            </CardContent>
          </Card>
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
                {tournament.participants.map(participant => (
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
              {tournament.teams.map((team, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">
                    {team.map(id => getParticipantName(id)).join(' & ')}
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
      </div>
    </div>
  );
};

export default TestTournament;
