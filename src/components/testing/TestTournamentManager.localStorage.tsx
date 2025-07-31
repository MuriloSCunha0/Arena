import React, { useState, useEffect } from 'react';
import { Plus, Play, Trophy, Save, Eye, Trash2, ArrowLeft, Target, Award, Database, Upload, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Participant, Match, TeamFormationType } from '../../types';
import { 
  generateEliminationBracketWithSmartBye,
  calculateGroupRankings
} from '../../utils/rankingUtils';
import { calculateBeachTennisGroupRankings } from '../../utils/beachTennisRules';
import { TournamentService } from '../../services/supabase/tournament';
import { supabase } from '../../lib/supabase';
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
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showMigrateModal, setShowMigrateModal] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingToDatabase, setIsSavingToDatabase] = useState(false);
  const [saveToDbMessage, setSaveToDbMessage] = useState('');
  
  // Form states
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentCategory, setTournamentCategory] = useState('');
  const [tournamentDescription, setTournamentDescription] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [currentGroup, setCurrentGroup] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState<TestMatch | null>(null);
  const [matchScore1, setMatchScore1] = useState('');
  const [matchScore2, setMatchScore2] = useState('');
  const [selectedTeamForGroup, setSelectedTeamForGroup] = useState<number | null>(null);

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
      console.log('� [DEBUG] Carregando dados do torneio:', tournament.name);
      
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
    if (saveToDbMessage && !isSavingToDatabase) {
      const timer = setTimeout(() => {
        setSaveToDbMessage('');
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [saveToDbMessage, isSavingToDatabase]);

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

  // Função para salvar torneio de teste no banco de dados
  const saveTournamentToDatabase = async (testTournament: TestTournamentData) => {
    if (!testTournament) {
      setSaveToDbMessage('❌ Nenhum torneio selecionado para salvar');
      return;
    }

    setIsSavingToDatabase(true);
    setSaveToDbMessage('');

    try {
      console.log('💾 [DATABASE] Iniciando salvamento do torneio de teste no banco...');
      console.log('🏆 [DATABASE] Torneio:', testTournament.name);
      console.log('👥 [DATABASE] Participantes:', testTournament.participants.length);
      console.log('🎾 [DATABASE] Duplas:', testTournament.teams.length);
      console.log('📊 [DATABASE] Grupos:', testTournament.groups.length);
      console.log('⚔️ [DATABASE] Partidas:', testTournament.matches.length);

      // 1. Primeiro, criar um evento para este torneio de teste
      const eventData = {
        id: generateUUID(),
        title: `[TESTE] ${testTournament.name}`,
        description: testTournament.description || `Torneio de teste - ${testTournament.category}`,
        category: testTournament.category,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        registration_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 dia
        max_participants: testTournament.participants.length,
        location: 'Local de Teste',
        price: 0,
        payment_required: false,
        status: 'OPEN',
        tournament_format: 'GROUP_STAGE_ELIMINATION',
        team_formation: 'MANUAL',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📅 [DATABASE] Criando evento...');
      const { data: eventResult, error: eventError } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (eventError) {
        throw new Error(`Erro ao criar evento: ${eventError.message}`);
      }

      console.log('✅ [DATABASE] Evento criado:', eventResult.id);

      // 2. Inserir participantes
      if (testTournament.participants.length > 0) {
        console.log('👥 [DATABASE] Inserindo participantes...');
        
        const participantsData = testTournament.participants.map(participant => ({
          id: participant.id,
          event_id: eventResult.id,
          user_id: participant.userId,
          name: participant.name,
          email: participant.email,
          phone: participant.phone,
          cpf: participant.cpf,
          category: participant.category,
          partner_id: participant.partnerId,
          payment_status: participant.paymentStatus,
          registered_at: participant.registeredAt
        }));

        const { error: participantsError } = await supabase
          .from('event_participants')
          .insert(participantsData);

        if (participantsError) {
          throw new Error(`Erro ao inserir participantes: ${participantsError.message}`);
        }

        console.log('✅ [DATABASE] Participantes inseridos:', participantsData.length);
      }

      // 3. Criar torneio usando o TournamentService
      console.log('🏆 [DATABASE] Gerando estrutura do torneio...');
      
      const tournament = await TournamentService.generateTournamentStructure(
        eventResult.id,
        testTournament.teams,
        TeamFormationType.FORMED,
        {
          groupSize: 3,
          forceReset: true,
          maxTeamsPerGroup: 3,
          autoCalculateGroups: true
        }
      );

      console.log('✅ [DATABASE] Torneio criado:', tournament.id);

      // 4. Se o torneio de teste já tem partidas completadas, atualizar os resultados
      if (testTournament.matches.length > 0) {
        console.log('⚔️ [DATABASE] Sincronizando resultados das partidas...');
        
        for (const testMatch of testTournament.matches) {
          if (testMatch.completed && testMatch.score1 !== null && testMatch.score2 !== null) {
            try {
              // Encontrar a partida correspondente no banco pelo team1 e team2
              const correspondingMatch = tournament.matches.find(dbMatch => {
                const sameTeam1 = JSON.stringify(dbMatch.team1?.sort()) === JSON.stringify(testMatch.team1?.sort());
                const sameTeam2 = JSON.stringify(dbMatch.team2?.sort()) === JSON.stringify(testMatch.team2?.sort());
                return sameTeam1 && sameTeam2;
              });

              if (correspondingMatch) {
                console.log(`🎯 [DATABASE] Atualizando resultado: ${testMatch.score1}x${testMatch.score2}`);
                await TournamentService.updateMatchResults(
                  correspondingMatch.id,
                  testMatch.score1,
                  testMatch.score2
                );
              }
            } catch (matchError) {
              console.warn(`⚠️ [DATABASE] Erro ao atualizar partida:`, matchError);
            }
          }
        }
      }

      // 5. Se o torneio de teste está na fase de eliminação, gerar bracket
      if (testTournament.stage === 'ELIMINATION' && testTournament.eliminationBracket) {
        console.log('🎯 [DATABASE] Gerando bracket eliminatório...');
        
        try {
          await TournamentService.generateEliminationBracket(tournament.id, true);
          console.log('✅ [DATABASE] Bracket eliminatório gerado');
        } catch (bracketError) {
          console.warn('⚠️ [DATABASE] Erro ao gerar bracket:', bracketError);
        }
      }

      setSaveToDbMessage(`✅ Torneio "${testTournament.name}" salvo com sucesso no banco de dados! ID do evento: ${eventResult.id}`);
      console.log('🎉 [DATABASE] Salvamento concluído com sucesso!');

    } catch (error) {
      console.error('❌ [DATABASE] Erro ao salvar torneio:', error);
      setSaveToDbMessage(`❌ Erro ao salvar no banco: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSavingToDatabase(false);
    }
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

    console.log(`🏆 [DEBUG] Adicionando dupla ${teamIndex} ao grupo ${currentGroup}`);

    const team = selectedTournament.teams[teamIndex];
    console.log(`📋 [DEBUG] Dupla: ${getTeamName(team)}`);
    
    // Verificar se a dupla já está em algum grupo
    const isAlreadyInGroup = selectedTournament.groups.some(group => 
      group.teams.some(groupTeam => 
        groupTeam.join(',') === team.join(',')
      )
    );
    
    if (isAlreadyInGroup) {
      console.log('⚠️ [DEBUG] Dupla já está em um grupo!');
      alert('Esta dupla já está em um grupo!');
      return;
    }
    
    const existingGroup = selectedTournament.groups.find(g => g.groupNumber === currentGroup);
    console.log(`📊 [DEBUG] Grupo existente ${currentGroup}:`, existingGroup ? 'SIM' : 'NÃO');
    
    let updatedGroups;
    if (existingGroup) {
      updatedGroups = selectedTournament.groups.map(g => 
        g.groupNumber === currentGroup 
          ? { ...g, teams: [...g.teams, team] }
          : g
      );
      console.log(`📊 [DEBUG] Grupo ${currentGroup} atualizado com ${existingGroup.teams.length + 1} duplas`);
    } else {
      updatedGroups = [...selectedTournament.groups, { groupNumber: currentGroup, teams: [team] }];
      console.log(`📊 [DEBUG] Novo grupo ${currentGroup} criado com 1 dupla`);
    }

    const updatedTournament = {
      ...selectedTournament,
      groups: updatedGroups,
      updatedAt: new Date().toISOString()
    };

    console.log(`💾 [DEBUG] Salvando torneio com ${updatedGroups.length} grupos...`);
    saveTournament(updatedTournament);
    console.log('✅ [DEBUG] Dupla adicionada ao grupo com sucesso!');
  };

  const isTeamInGroup = (team: string[]) => {
    return selectedTournament?.groups.some(group => 
      group.teams.some(groupTeam => 
        groupTeam.join(',') === team.join(',')
      )
    ) || false;
  };

  const createGroupsAutomatically = () => {
    if (!selectedTournament) return;
    
    const teamsPerGroup = 4; // Padrão de 4 duplas por grupo
    const availableTeams = selectedTournament.teams.filter(team => !isTeamInGroup(team));
    
    if (availableTeams.length === 0) {
      alert('Todas as duplas já estão em grupos!');
      return;
    }
    
    const newGroups = [...selectedTournament.groups];
    let currentGroupNum = Math.max(0, ...newGroups.map(g => g.groupNumber)) + 1;
    
    for (let i = 0; i < availableTeams.length; i += teamsPerGroup) {
      const groupTeams = availableTeams.slice(i, i + teamsPerGroup);
      newGroups.push({
        groupNumber: currentGroupNum,
        teams: groupTeams
      });
      currentGroupNum++;
    }
    
    const updatedTournament = {
      ...selectedTournament,
      groups: newGroups,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
  };

  const generateGroupMatches = () => {
    if (!selectedTournament) return;

    console.log('🔍 [DEBUG] Gerando partidas dos grupos...');
    console.log('📊 [DEBUG] Grupos:', selectedTournament.groups);
    console.log('🎾 [DEBUG] Total de duplas:', selectedTournament.teams.length);

    if (selectedTournament.groups.length === 0) {
      alert('É necessário criar grupos antes de gerar as partidas!');
      return;
    }

    const matches: Match[] = [];
    
    selectedTournament.groups.forEach(group => {
      console.log(`📋 [DEBUG] Grupo ${group.groupNumber} com ${group.teams.length} duplas`);
      
      // Generate round-robin matches for each group
      for (let i = 0; i < group.teams.length; i++) {
        for (let j = i + 1; j < group.teams.length; j++) {
          const match = {
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
            stage: 'GROUP' as const,
            groupNumber: group.groupNumber,
            eventId: selectedTournament.id,
            tournamentId: selectedTournament.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          matches.push(match);
          
          console.log(`⚔️ [DEBUG] Partida criada: ${getTeamName(group.teams[i])} vs ${getTeamName(group.teams[j])}`);
        }
      }
    });

    console.log(`🎯 [DEBUG] Total de partidas criadas: ${matches.length}`);

    const updatedTournament = {
      ...selectedTournament,
      matches,
      stage: 'GROUP_STAGE' as const,
      status: 'STARTED' as const,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    console.log('✅ [DEBUG] Torneio atualizado e salvo!');
  };

  const updateMatchScore = () => {
    if (!selectedMatch || !selectedTournament) return;

    const score1 = parseInt(matchScore1) || 0;
    const score2 = parseInt(matchScore2) || 0;
    const winnerId: 'team1' | 'team2' | null = score1 > score2 ? 'team1' : 'team2';

    console.log('⚔️ [DEBUG] Atualizando resultado da partida:', selectedMatch.id);
    console.log('📊 [DEBUG] Placar:', score1, 'x', score2);
    console.log('🏆 [DEBUG] Vencedor:', winnerId);

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

    let updatedTournament = {
      ...selectedTournament,
      matches: updatedMatches,
      updatedAt: new Date().toISOString()
    };

    // Se for uma partida da fase eliminatória, atualizar o bracket
    if (selectedMatch.stage === 'ELIMINATION' && updatedTournament.eliminationBracket) {
      console.log('🔧 [DEBUG] Atualizando bracket da fase eliminatória...');
      
      const updatedEliminationMatches = updatedTournament.eliminationBracket.matches.map(match =>
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

      // Avançar vencedor para próxima rodada
      const winnerTeam = winnerId === 'team1' ? selectedMatch.team1 : selectedMatch.team2;
      if (winnerTeam) {
        console.log('🎯 [DEBUG] Avançando vencedor para próxima rodada:', getTeamName(winnerTeam as string[]));
        
        // Encontrar próxima partida onde o vencedor deve ser colocado
        const nextRound = (selectedMatch.round || 1) + 1;
        const nextPosition = Math.ceil((selectedMatch.position || 1) / 2);
        
        const updatedNextRoundMatches = updatedEliminationMatches.map(match => {
          if (match.round === nextRound && match.position === nextPosition) {
            console.log(`📍 [DEBUG] Colocando vencedor na rodada ${nextRound}, posição ${nextPosition}`);
            
            // Determinar se vai para team1 ou team2 baseado na posição
            const isEvenPosition = (selectedMatch.position || 1) % 2 === 0;
            
            return {
              ...match,
              [isEvenPosition ? 'team2' : 'team1']: winnerTeam,
              updatedAt: new Date().toISOString()
            };
          }
          return match;
        });

        updatedTournament.eliminationBracket.matches = updatedNextRoundMatches;
        console.log('✅ [DEBUG] Bracket atualizado com vencedor');
      }
    }

    saveTournament(updatedTournament);
    setSelectedMatch(null);
    setMatchScore1('');
    setMatchScore2('');
    setShowMatchModal(false);
  };

  // Calculate overall rankings using Beach Tennis rules
  const calculateBeachTennisOverallRankings = (matches: Match[]) => {
    console.log('🏆 [DEBUG] Calculando ranking com regras do Beach Tennis...');
    
    // Agrupar partidas por grupo
    const matchesByGroup = matches.reduce((acc, match) => {
      const groupNum = match.groupNumber || 0;
      if (!acc[groupNum]) acc[groupNum] = [];
      acc[groupNum].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    const allTeamRankings: any[] = [];

    // Calcular ranking de cada grupo usando regras do Beach Tennis
    Object.entries(matchesByGroup).forEach(([groupNum, groupMatches]) => {
      console.log(`📊 [DEBUG] Calculando ranking do grupo ${groupNum}...`);
      const groupRankings = calculateBeachTennisGroupRankings(groupMatches);
      
      groupRankings.forEach((ranking, index) => {
        allTeamRankings.push({
          teamId: ranking.teamId,
          team: ranking.team,
          rank: 0, // Will be recalculated
          stats: ranking.stats,
          groupNumber: parseInt(groupNum),
          groupPosition: index + 1
        });
      });
    });

    // Ordenar globalmente usando regras do Beach Tennis
    allTeamRankings.sort((a, b) => {
      // 1. Diferença de games (critério principal)
      if (a.stats.gameDifference !== b.stats.gameDifference) {
        console.log(`🎯 [DEBUG] ${a.team} (${a.stats.gameDifference}) vs ${b.team} (${b.stats.gameDifference}) - Diferença de games`);
        return b.stats.gameDifference - a.stats.gameDifference;
      }

      // 2. Total de games ganhos
      if (a.stats.gamesWon !== b.stats.gamesWon) {
        console.log(`🎯 [DEBUG] ${a.team} (${a.stats.gamesWon}) vs ${b.team} (${b.stats.gamesWon}) - Games ganhos`);
        return b.stats.gamesWon - a.stats.gamesWon;
      }

      // 3. Menor número de games perdidos
      if (a.stats.gamesLost !== b.stats.gamesLost) {
        console.log(`🎯 [DEBUG] ${a.team} (${a.stats.gamesLost}) vs ${b.team} (${b.stats.gamesLost}) - Games perdidos`);
        return a.stats.gamesLost - b.stats.gamesLost;
      }

      // 4. Número de vitórias
      if (a.stats.wins !== b.stats.wins) {
        console.log(`🎯 [DEBUG] ${a.team} (${a.stats.wins}) vs ${b.team} (${b.stats.wins}) - Vitórias`);
        return b.stats.wins - a.stats.wins;
      }

      // 5. Posição no grupo (melhor colocado no grupo fica à frente)
      if (a.groupPosition !== b.groupPosition) {
        console.log(`🎯 [DEBUG] ${a.team} (${a.groupPosition}º) vs ${b.team} (${b.groupPosition}º) - Posição no grupo`);
        return a.groupPosition - b.groupPosition;
      }

      return 0;
    });

    // Atribuir posições finais
    allTeamRankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    console.log('🎯 [DEBUG] Ranking final do Beach Tennis:');
    allTeamRankings.forEach((team, index) => {
      console.log(`   ${index + 1}º: ${team.team} (Grupo ${team.groupNumber}, Dif: ${team.stats.gameDifference}, Jogos: ${team.stats.gamesWon}/${team.stats.gamesLost})`);
    });

    return allTeamRankings;
  };

  const generateEliminationPhase = () => {
    if (!selectedTournament) return;

    console.log('🏆 [DEBUG] Iniciando geração da fase eliminatória...');
    console.log('📊 [DEBUG] Partidas dos grupos:', selectedTournament.matches.length);

    // Calculate overall rankings using Beach Tennis rules
    const overallRankings = calculateBeachTennisOverallRankings(selectedTournament.matches);
    console.log('📈 [DEBUG] Rankings calculados com regras do Beach Tennis:', overallRankings);
    
    // Take top teams (you can adjust this logic)
    const qualifiedTeams = overallRankings.slice(0, Math.min(8, overallRankings.length));
    console.log('🎯 [DEBUG] Duplas classificadas:', qualifiedTeams.length);
    qualifiedTeams.forEach((team, index) => {
      console.log(`   ${index + 1}º: ${team.team} (Dif: ${team.stats.gameDifference}, Jogos: ${team.stats.gamesWon}/${team.stats.gamesLost})`);
    });
    
    if (qualifiedTeams.length < 2) {
      alert('É necessário pelo menos 2 duplas classificadas para gerar a fase eliminatória');
      return;
    }

    console.log('🔧 [DEBUG] Gerando bracket com regras de BYE...');
    // Generate elimination bracket with Beach Tennis BYE rules
    const { matches: eliminationMatches, metadata } = generateEliminationBracketWithSmartBye(qualifiedTeams);
    
    console.log('⚔️ [DEBUG] Partidas eliminatórias geradas:', eliminationMatches.length);
    console.log('📋 [DEBUG] Metadata do bracket:', metadata);
    
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

    console.log('💾 [DEBUG] Salvando torneio com fase eliminatória...');
    const updatedTournament = {
      ...selectedTournament,
      matches: [...selectedTournament.matches, ...matchesWithIds],
      eliminationBracket,
      stage: 'ELIMINATION' as const,
      updatedAt: new Date().toISOString()
    };

    saveTournament(updatedTournament);
    setCurrentView('bracket');
    console.log('✅ [DEBUG] Fase eliminatória gerada com sucesso!');
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
                            console.log('👁️ [DEBUG] Selecionando torneio:', tournament.name);
                            console.log('📊 [DEBUG] Grupos no torneio:', tournament.groups?.length || 0);
                            console.log('🎾 [DEBUG] Duplas no torneio:', tournament.teams?.length || 0);
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
              {selectedTournament.stage === 'ELIMINATION' && selectedTournament.eliminationBracket && (
                <Button onClick={() => setCurrentView('bracket')} variant="outline">
                  <Target size={16} className="mr-2" />
                  Ver Bracket
                </Button>
              )}
              <Button onClick={() => saveTournament(selectedTournament)} variant="outline">
                <Save size={16} className="mr-2" />
                Salvar
              </Button>
              <Button 
                onClick={() => saveTournamentToDatabase(selectedTournament)} 
                variant="primary"
                disabled={isSavingToDatabase}
              >
                <Database size={16} className="mr-2" />
                {isSavingToDatabase ? 'Salvando...' : 'Salvar no Banco'}
              </Button>
            </div>
          </div>

          {/* Status do salvamento no banco */}
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
                      {selectedTournament.teams.map((team, index) => {
                        const teamInGroup = isTeamInGroup(team);
                        const groupNumber = selectedTournament.groups.find(group => 
                          group.teams.some(groupTeam => groupTeam.join(',') === team.join(','))
                        )?.groupNumber;
                        
                        return (
                          <div key={index} className={`text-sm p-2 rounded flex justify-between items-center ${
                            teamInGroup ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span>{getTeamName(team)}</span>
                              {teamInGroup && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                  Grupo {groupNumber}
                                </span>
                              )}
                            </div>
                            {!teamInGroup && (
                              <Button 
                                onClick={() => {
                                  setSelectedTeamForGroup(index);
                                  setShowGroupModal(true);
                                }}
                                size="sm" 
                                variant="outline"
                                className="ml-2"
                              >
                                + Grupo
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      {selectedTournament.teams.length === 0 && (
                        <p className="text-gray-500 text-sm">Nenhuma dupla formada</p>
                      )}
                    </div>
                    {selectedTournament.teams.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          onClick={createGroupsAutomatically}
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
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
                      <span>Grupos ({selectedTournament.groups.length})</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={currentGroup}
                          onChange={(e) => setCurrentGroup(Number(e.target.value))}
                          className="w-16 h-8 text-xs"
                          min="1"
                        />
                        {selectedTournament.groups.length > 0 && (
                          <Button 
                            onClick={() => {
                              if (confirm('Deseja limpar todos os grupos?')) {
                                saveTournament({
                                  ...selectedTournament,
                                  groups: [],
                                  updatedAt: new Date().toISOString()
                                });
                              }
                            }}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={12} />
                          </Button>
                        )}
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
            onClose={() => {
              setShowGroupModal(false);
              setSelectedTeamForGroup(null);
            }}
            title="Adicionar Dupla ao Grupo"
          >
            <div className="space-y-4">
              {selectedTeamForGroup !== null && (
                <>
                  <p className="text-sm text-gray-600">
                    Confirmar adição da dupla <span className="font-medium">{getTeamName(selectedTournament.teams[selectedTeamForGroup])}</span> ao Grupo {currentGroup}?
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        if (selectedTeamForGroup !== null) {
                          addTeamToGroup(selectedTeamForGroup);
                          setShowGroupModal(false);
                          setSelectedTeamForGroup(null);
                        }
                      }}
                      className="flex-1"
                    >
                      Confirmar
                    </Button>
                    <Button 
                      onClick={() => {
                        setShowGroupModal(false);
                        setSelectedTeamForGroup(null);
                      }} 
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              )}
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

  // Bracket/Elimination View
  if (currentView === 'bracket' && selectedTournament && selectedTournament.eliminationBracket) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setCurrentView('tournament')}
                variant="outline"
                size="sm"
              >
                <ArrowLeft size={16} className="mr-2" />
                Voltar ao Torneio
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fase Eliminatória</h1>
                <p className="text-gray-600">
                  {selectedTournament.name} • {selectedTournament.category}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => saveTournament(selectedTournament)} variant="outline">
                <Save size={16} className="mr-2" />
                Salvar
              </Button>
              <Button 
                onClick={() => saveTournamentToDatabase(selectedTournament)} 
                variant="primary"
                disabled={isSavingToDatabase}
              >
                <Database size={16} className="mr-2" />
                {isSavingToDatabase ? 'Salvando...' : 'Salvar no Banco'}
              </Button>
            </div>
          </div>

          {/* Status do salvamento no banco */}
          {saveToDbMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              saveToDbMessage.includes('✅') 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {saveToDbMessage}
            </div>
          )}

          {/* Bracket Metadata */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Informações do Bracket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Duplas Classificadas:</span>
                  <div className="font-medium">{selectedTournament.eliminationBracket.qualifiedTeams.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Estrutura:</span>
                  <div className="font-medium">{selectedTournament.eliminationBracket.metadata.bracketStructure}</div>
                </div>
                <div>
                  <span className="text-gray-600">BYEs:</span>
                  <div className="font-medium">{selectedTournament.eliminationBracket.metadata.byesNeeded}</div>
                </div>
                <div>
                  <span className="text-gray-600">Estratégia:</span>
                  <div className="font-medium text-xs">{selectedTournament.eliminationBracket.metadata.byeStrategy}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualified Teams */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Duplas Classificadas (por ranking)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedTournament.eliminationBracket.qualifiedTeams.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm w-6 text-center bg-blue-100 text-blue-800 rounded px-2 py-1">
                        {team.rank}º
                      </span>
                      <span className="font-medium">
                        {getTeamName(team.teamId)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">
                      Grupo {team.groupNumber}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Elimination Matches by Round */}
          <Card>
            <CardHeader>
              <CardTitle>Partidas Eliminatórias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(
                  selectedTournament.eliminationBracket.matches.reduce((acc, match) => {
                    const round = match.round || 1;
                    if (!acc[round]) acc[round] = [];
                    acc[round].push(match);
                    return acc;
                  }, {} as Record<number, Match[]>)
                ).map(([roundStr, roundMatches]) => {
                  const round = parseInt(roundStr);
                  const roundName = round === 1 ? 'Primeira Rodada' :
                                   round === 2 ? 'Quartas de Final' :
                                   round === 3 ? 'Semifinal' :
                                   round === 4 ? 'Final' : `Rodada ${round}`;
                  
                  return (
                    <div key={round} className="border rounded p-4">
                      <h4 className="font-medium mb-4 text-lg">{roundName}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roundMatches.map(match => (
                          <div 
                            key={match.id} 
                            className={`p-4 rounded border-2 cursor-pointer transition-colors ${
                              match.completed 
                                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              if (match.team1 && match.team2) {
                                setSelectedMatch(match);
                                setMatchScore1(match.score1?.toString() || '');
                                setMatchScore2(match.score2?.toString() || '');
                                setShowMatchModal(true);
                              }
                            }}
                          >
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">
                                  Posição {match.position}
                                </span>
                                {match.completed && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Finalizada
                                  </span>
                                )}
                              </div>
                              
                              {match.team1 && match.team2 ? (
                                <>
                                  <div className="space-y-1">
                                    <div className={`flex justify-between items-center p-2 rounded ${
                                      match.winnerId === 'team1' ? 'bg-yellow-100 font-medium' : 'bg-white'
                                    }`}>
                                      <span className="text-sm">
                                        {getTeamName(match.team1 as string[])}
                                      </span>
                                      <span className="font-mono text-sm">
                                        {match.score1 ?? '-'}
                                      </span>
                                    </div>
                                    <div className={`flex justify-between items-center p-2 rounded ${
                                      match.winnerId === 'team2' ? 'bg-yellow-100 font-medium' : 'bg-white'
                                    }`}>
                                      <span className="text-sm">
                                        {getTeamName(match.team2 as string[])}
                                      </span>
                                      <span className="font-mono text-sm">
                                        {match.score2 ?? '-'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {!match.completed && (
                                    <Button size="sm" variant="outline" className="w-full mt-2">
                                      Inserir Resultado
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <div className="text-center py-4">
                                  <span className="text-gray-500">
                                    {!match.team1 ? 'Aguardando vencedor...' : 
                                     !match.team2 ? 'BYE - Avanço Automático' : 'TBD'}
                                  </span>
                                  {match.team1 && !match.team2 && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded">
                                      <span className="text-sm font-medium text-blue-800">
                                        {getTeamName(match.team1 as string[])} avança automaticamente
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Match Result Modal for Elimination */}
          <Modal 
            isOpen={showMatchModal} 
            onClose={() => setShowMatchModal(false)}
            title="Resultado da Partida Eliminatória"
          >
            {selectedMatch && selectedMatch.team1 && selectedMatch.team2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium">
                    {getTeamName(selectedMatch.team1 as string[])} vs {getTeamName(selectedMatch.team2 as string[])}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedMatch.round === 1 ? 'Primeira Rodada' :
                     selectedMatch.round === 2 ? 'Quartas de Final' :
                     selectedMatch.round === 3 ? 'Semifinal' :
                     selectedMatch.round === 4 ? 'Final' : `Rodada ${selectedMatch.round}`}
                  </p>
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
                    onClick={() => {
                      updateMatchScore();
                      // After updating, potentially advance winner to next round
                      // This would require additional logic to update the bracket
                    }}
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
        </div>
      </div>
    );
  }

  return null;
};

export default TestTournamentManager;
