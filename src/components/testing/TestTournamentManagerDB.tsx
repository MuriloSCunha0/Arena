import React, { useState, useEffect } from 'react';
import { Plus, Play, Trophy, Eye, Trash2, ArrowLeft, Upload, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { 
  TestTournamentService, 
  TestTournament, 
  TestParticipant, 
  TestTeam, 
  TestGroup, 
  TestMatch 
} from '../../services/testTournament';

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

const TestTournamentManager: React.FC = () => {
  const [tournaments, setTournaments] = useState<TestTournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TestTournament | null>(null);
  const [participants, setParticipants] = useState<TestParticipant[]>([]);
  const [teams, setTeams] = useState<TestTeam[]>([]);
  const [groups, setGroups] = useState<TestGroup[]>([]);
  const [matches, setMatches] = useState<TestMatch[]>([]);
  const [currentView, setCurrentView] = useState<'list' | 'tournament' | 'bracket'>('list');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [saveToDbMessage, setSaveToDbMessage] = useState('');
  
  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCategory, setTournamentCategory] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<TestMatch | null>(null);
  const [matchScore1, setMatchScore1] = useState('');
  const [matchScore2, setMatchScore2] = useState('');

  // Load tournaments from database
  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [DEBUG] Carregando torneios do banco...');
      const tournamentsData = await TestTournamentService.getAllTournaments();
      console.log(`📁 [DEBUG] ${tournamentsData.length} torneios encontrados no banco`);
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao carregar torneios:', error);
      setSaveToDbMessage(`❌ Erro ao carregar torneios: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTournamentData = async (tournament: TestTournament) => {
    try {
      setIsLoading(true);
      console.log('🔄 [DEBUG] Carregando dados do torneio:', tournament.name);
      
      const [participantsData, teamsData, groupsData, matchesData] = await Promise.all([
        TestTournamentService.getParticipants(tournament.id),
        TestTournamentService.getTeams(tournament.id),
        TestTournamentService.getGroups(tournament.id),
        TestTournamentService.getMatches(tournament.id)
      ]);
      
      setParticipants(participantsData);
      setTeams(teamsData);
      setGroups(groupsData);
      setMatches(matchesData);
      
      console.log('✅ [DEBUG] Dados do torneio carregados');
      console.log(`📊 Participantes: ${participantsData.length}`);
      console.log(`🎾 Duplas: ${teamsData.length}`);
      console.log(`📋 Grupos: ${groupsData.length}`);
      console.log(`⚔️ Partidas: ${matchesData.length}`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao carregar dados do torneio:', error);
      setSaveToDbMessage(`❌ Erro ao carregar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-clear save message after 10 seconds
  useEffect(() => {
    if (saveToDbMessage && !isLoading) {
      const timer = setTimeout(() => {
        setSaveToDbMessage('');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [saveToDbMessage, isLoading]);

  const createTournament = async () => {
    if (!tournamentName.trim() || !tournamentCategory.trim()) return;

    try {
      setIsLoading(true);
      console.log('🏆 [DEBUG] Criando novo torneio:', tournamentName);
      
      const newTournament = await TestTournamentService.createTournament({
        name: tournamentName,
        category: tournamentCategory,
        description: tournamentDescription,
      });

      console.log('✅ [DEBUG] Torneio criado:', newTournament.id);
      
      setTournamentName('');
      setTournamentCategory('');
      setTournamentDescription('');
      setShowCreateModal(false);
      
      await loadTournaments();
      setSaveToDbMessage(`✅ Torneio "${tournamentName}" criado com sucesso!`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao criar torneio:', error);
      setSaveToDbMessage(`❌ Erro ao criar torneio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este torneio? Esta ação não pode ser desfeita.')) return;

    try {
      setIsLoading(true);
      console.log('🗑️ [DEBUG] Deletando torneio:', tournamentId);
      
      await TestTournamentService.deleteTournament(tournamentId);
      
      console.log('✅ [DEBUG] Torneio deletado');
      
      if (selectedTournament?.id === tournamentId) {
        setSelectedTournament(null);
        setCurrentView('list');
      }
      
      await loadTournaments();
      setSaveToDbMessage('✅ Torneio excluído com sucesso!');
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao deletar torneio:', error);
      setSaveToDbMessage(`❌ Erro ao excluir torneio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const addParticipant = async () => {
    if (!participantName.trim() || !selectedTournament) return;

    try {
      setIsLoading(true);
      console.log('👤 [DEBUG] Adicionando participante:', participantName);
      
      await TestTournamentService.addParticipant(selectedTournament.id, {
        name: participantName.trim(),
        email: participantEmail.trim() || undefined,
        category: 'OPEN',
      });

      console.log('✅ [DEBUG] Participante adicionado');
      
      setParticipantName('');
      setParticipantEmail('');
      setShowParticipantModal(false);
      
      await loadTournamentData(selectedTournament);
      setSaveToDbMessage(`✅ Participante "${participantName}" adicionado!`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao adicionar participante:', error);
      setSaveToDbMessage(`❌ Erro ao adicionar participante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createTeam = async () => {
    if (selectedParticipants.length !== 2 || !selectedTournament) return;

    try {
      setIsLoading(true);
      const [player1Id, player2Id] = selectedParticipants;
      console.log('🎾 [DEBUG] Criando dupla:', player1Id, player2Id);
      
      await TestTournamentService.createTeam(selectedTournament.id, {
        player1_id: player1Id,
        player2_id: player2Id,
      });

      console.log('✅ [DEBUG] Dupla criada');
      
      setSelectedParticipants([]);
      setShowTeamModal(false);
      
      await loadTournamentData(selectedTournament);
      setSaveToDbMessage('✅ Dupla formada com sucesso!');
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao criar dupla:', error);
      setSaveToDbMessage(`❌ Erro ao formar dupla: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createGroupsAutomatically = async () => {
    if (!selectedTournament) return;

    try {
      setIsLoading(true);
      console.log('📋 [DEBUG] Criando grupos automaticamente...');
      
      await TestTournamentService.createGroupsAutomatically(selectedTournament.id, 4);
      
      console.log('✅ [DEBUG] Grupos criados automaticamente');
      
      await loadTournamentData(selectedTournament);
      setSaveToDbMessage('✅ Grupos criados automaticamente!');
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao criar grupos:', error);
      setSaveToDbMessage(`❌ Erro ao criar grupos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGroupMatches = async () => {
    if (!selectedTournament) return;

    try {
      setIsLoading(true);
      console.log('⚔️ [DEBUG] Gerando partidas dos grupos...');
      
      const generatedMatches = await TestTournamentService.generateGroupMatches(selectedTournament.id);
      
      console.log('✅ [DEBUG] Partidas dos grupos geradas:', generatedMatches.length);
      
      // Atualizar dados do torneio
      const updatedTournament = await TestTournamentService.getTournament(selectedTournament.id);
      if (updatedTournament) {
        setSelectedTournament(updatedTournament);
      }
      
      await loadTournamentData(selectedTournament);
      setSaveToDbMessage(`✅ ${generatedMatches.length} partidas dos grupos geradas!`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao gerar partidas:', error);
      setSaveToDbMessage(`❌ Erro ao gerar partidas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMatchScore = async () => {
    if (!selectedMatch || !selectedTournament) return;

    const score1 = parseInt(matchScore1) || 0;
    const score2 = parseInt(matchScore2) || 0;

    try {
      setIsLoading(true);
      console.log('📊 [DEBUG] Atualizando resultado:', score1, 'x', score2);
      
      await TestTournamentService.updateMatchResult(selectedMatch.id, {
        score1,
        score2,
      });

      console.log('✅ [DEBUG] Resultado atualizado');
      
      setSelectedMatch(null);
      setMatchScore1('');
      setMatchScore2('');
      setShowMatchModal(false);
      
      await loadTournamentData(selectedTournament);
      setSaveToDbMessage(`✅ Resultado atualizado: ${score1} x ${score2}!`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro ao atualizar resultado:', error);
      setSaveToDbMessage(`❌ Erro ao atualizar resultado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateFromLocalStorage = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [DEBUG] Iniciando migração do localStorage...');
      
      const savedTournaments = localStorage.getItem('testTournaments');
      if (!savedTournaments) {
        setSaveToDbMessage('❌ Nenhum torneio encontrado no localStorage');
        return;
      }

      const localTournaments = JSON.parse(savedTournaments);
      console.log(`📁 [DEBUG] ${localTournaments.length} torneios encontrados no localStorage`);

      let migratedCount = 0;
      for (const localTournament of localTournaments) {
        try {
          console.log(`🔄 [DEBUG] Migrando torneio: ${localTournament.name}`);
          
          await TestTournamentService.migrateFromLocalStorage(localTournament);
          migratedCount++;
          
          console.log(`✅ [DEBUG] Torneio migrado: ${localTournament.name}`);
        } catch (error) {
          console.error(`❌ [DEBUG] Erro ao migrar torneio ${localTournament.name}:`, error);
        }
      }

      setShowMigrateModal(false);
      await loadTournaments();
      setSaveToDbMessage(`✅ ${migratedCount} torneios migrados do localStorage!`);
      
    } catch (error) {
      console.error('❌ [DEBUG] Erro na migração:', error);
      setSaveToDbMessage(`❌ Erro na migração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectTournament = async (tournament: TestTournament) => {
    console.log('👁️ [DEBUG] Selecionando torneio:', tournament.name);
    setSelectedTournament(tournament);
    await loadTournamentData(tournament);
    setCurrentView('tournament');
  };

  const getTeamName = (team: TestTeam) => {
    return team.display_name || `${team.player1_name} & ${team.player2_name}`;
  };

  // Tournament List View
  if (currentView === 'list') {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ambiente de Testes - Torneios (Banco de Dados)</h1>
              <p className="text-gray-600">Gerencie múltiplos torneios de teste diretamente no banco de dados</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowMigrateModal(true)} variant="outline">
                <Upload size={16} className="mr-2" />
                Migrar do localStorage
              </Button>
              <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus size={16} className="mr-2" />
                Novo Torneio
              </Button>
            </div>
          </div>

          {/* Status messages */}
          {saveToDbMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              saveToDbMessage.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {saveToDbMessage}
            </div>
          )}

          {isLoading ? (
            <Card className="text-center py-12">
              <CardContent>
                <RefreshCw size={64} className="mx-auto text-blue-500 mb-4 animate-spin" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Carregando...</h3>
                <p className="text-gray-600">Buscando torneios no banco de dados</p>
              </CardContent>
            </Card>
          ) : tournaments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum torneio encontrado</h3>
                <p className="text-gray-600 mb-6">Crie torneios de teste para diferentes categorias e teste o sistema completo</p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => setShowCreateModal(true)} variant="outline">
                    Criar Primeiro Torneio
                  </Button>
                  <Button onClick={() => setShowMigrateModal(true)} variant="outline">
                    Migrar do localStorage
                  </Button>
                </div>
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
                          onClick={() => selectTournament(tournament)}
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
                        <span className="text-gray-600">Criado:</span>
                        <span>{new Date(tournament.created_at).toLocaleDateString('pt-BR')}</span>
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
                  disabled={!tournamentName.trim() || !tournamentCategory.trim() || isLoading}
                >
                  {isLoading ? 'Criando...' : 'Criar Torneio'}
                </Button>
                <Button onClick={() => setShowCreateModal(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
            </div>
          </Modal>

          {/* Migrate Modal */}
          <Modal 
            isOpen={showMigrateModal} 
            onClose={() => setShowMigrateModal(false)}
            title="Migrar Torneios do localStorage"
          >
            <div className="space-y-4">
              <p className="text-gray-600">
                Esta ação irá migrar todos os torneios salvos no localStorage para o banco de dados.
                Os dados originais no localStorage não serão removidos.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={migrateFromLocalStorage} 
                  className="flex-1" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Migrando...' : 'Migrar Dados'}
                </Button>
                <Button onClick={() => setShowMigrateModal(false)} variant="outline">
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
              <Button onClick={() => loadTournamentData(selectedTournament)} variant="outline" disabled={isLoading}>
                <RefreshCw size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Status messages */}
          {saveToDbMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              saveToDbMessage.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {saveToDbMessage}
            </div>
          )}

          {selectedTournament.stage === 'SETUP' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Participants */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Participantes ({participants.length})</span>
                      <Button onClick={() => setShowParticipantModal(true)} size="sm" disabled={isLoading}>
                        <Plus size={16} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {participants.map(participant => (
                        <div key={participant.id} className="text-sm bg-gray-50 p-2 rounded">
                          {participant.name}
                          {participant.email && <div className="text-xs text-gray-500">{participant.email}</div>}
                        </div>
                      ))}
                      {participants.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhum participante adicionado</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Teams */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Duplas ({teams.length})</span>
                      <Button 
                        onClick={() => setShowTeamModal(true)} 
                        size="sm"
                        disabled={participants.length < 2 || isLoading}
                      >
                        <Plus size={16} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {teams.map((team) => (
                        <div key={team.id} className="text-sm p-2 rounded bg-gray-50">
                          <div className="font-medium">{getTeamName(team)}</div>
                        </div>
                      ))}
                      {teams.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhuma dupla formada</p>
                      )}
                    </div>
                    {teams.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          onClick={createGroupsAutomatically}
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          disabled={isLoading}
                        >
                          Criar Grupos Automaticamente (4 duplas/grupo)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Groups */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Grupos ({groups.length})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {groups.map(group => (
                        <div key={group.id} className="border rounded p-2">
                          <div className="font-medium text-sm">Grupo {group.group_number}</div>
                          <div className="text-xs text-gray-500">Max: {group.max_teams} duplas</div>
                        </div>
                      ))}
                      {groups.length === 0 && (
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
                      disabled={groups.length === 0 || isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play size={16} className="mr-2" />
                      {isLoading ? 'Gerando...' : 'Iniciar Fase de Grupos'}
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
                    <span>Partidas da Fase de Grupos ({matches.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {matches.filter(m => m.stage === 'GROUP').map(match => (
                      <div key={match.id} className="border rounded p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {match.team1_name} vs {match.team2_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Grupo {match.group_number}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {match.completed ? (
                              <div className="text-lg font-bold">
                                {match.score1} x {match.score2}
                              </div>
                            ) : (
                              <Button 
                                onClick={() => {
                                  setSelectedMatch(match);
                                  setShowMatchModal(true);
                                }}
                                size="sm"
                                disabled={isLoading}
                              >
                                Resultado
                              </Button>
                            )}
                          </div>
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
              <Input
                label="Email (opcional)"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder="joao@email.com"
                type="email"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={addParticipant} 
                  className="flex-1" 
                  disabled={!participantName.trim() || isLoading}
                >
                  {isLoading ? 'Adicionando...' : 'Adicionar'}
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
                  {participants.map(participant => (
                    <label key={participant.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(participant.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedParticipants.length < 2) {
                              setSelectedParticipants([...selectedParticipants, participant.id]);
                            }
                          } else {
                            setSelectedParticipants(selectedParticipants.filter(id => id !== participant.id));
                          }
                        }}
                        disabled={selectedParticipants.length >= 2 && !selectedParticipants.includes(participant.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{participant.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={createTeam} 
                  className="flex-1" 
                  disabled={selectedParticipants.length !== 2 || isLoading}
                >
                  {isLoading ? 'Formando...' : 'Formar Dupla'}
                </Button>
                <Button onClick={() => setShowTeamModal(false)} variant="outline">
                  Cancelar
                </Button>
              </div>
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
                  <div className="text-lg font-medium">
                    {selectedMatch.team1_name} vs {selectedMatch.team2_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Grupo {selectedMatch.group_number}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={selectedMatch.team1_name || 'Time 1'}
                    type="number"
                    value={matchScore1}
                    onChange={(e) => setMatchScore1(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                  <Input
                    label={selectedMatch.team2_name || 'Time 2'}
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
                    disabled={!matchScore1 || !matchScore2 || isLoading}
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Resultado'}
                  </Button>
                  <Button onClick={() => setShowMatchModal(false)} variant="outline">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    );
  }

  return null;
};

export default TestTournamentManager;
