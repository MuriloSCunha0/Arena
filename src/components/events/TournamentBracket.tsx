import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  PlayCircle,
  RefreshCw,
  Loader2,
  Award,
  Edit,
  Edit3,
  AlertCircle,
  MapPin,
  Calendar,
  XCircle,
  List,
  HelpCircle,
  MinusCircle,
  PlusCircle,
  CheckCircle,
  Maximize2, // Add this icon for full-screen toggle
  Minimize2, // Add this icon for exiting full-screen
  Users, // Added this missing import
  Shuffle,
  Trophy // Add the missing Trophy import
} from 'lucide-react';
import { useTournamentStore, useParticipantsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Match, Participant, Court, TeamFormationType, EventType, Tournament } from '../../types';
import { Modal } from '../ui/Modal';
import { formatDateTime } from '../../utils/formatters';
import { TournamentRandomizer } from './TournamentRandomizer';
import { 
  calculateGroupRankings, 
  GroupRanking, 
  calculateOverallGroupStageRankings, 
  OverallRanking,
  calculateRankingsForPlacement, // Import the new function
  getRankedQualifiers // Import the new utility for qualifiers
} from '../../utils/rankingUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { TournamentService } from '../../services/supabase/tournament'; // Add this import

interface TournamentBracketProps {
  eventId: string;
}

interface MatchCardProps {
  teamA?: string | null;
  teamB?: string | null;
  scoreA?: number;
  scoreB?: number;
  winner?: string;
  onClick?: () => void;
  highlighted?: boolean;
  byeMatch?: boolean;
  court?: string;
  scheduledTime?: string;
  completed?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  teamA = '', 
  teamB = '', 
  scoreA, 
  scoreB, 
  winner, 
  onClick,
  highlighted = false,
  byeMatch = false,
  court,
  scheduledTime,
  completed = false
}) => {
  const hasTeams = teamA && teamB;
  const isCompleted = scoreA !== undefined && scoreB !== undefined;
  
  return (
    <div 
      className={`
        border rounded-md p-2 min-w-[200px] cursor-pointer transition-all
        ${highlighted ? 'border-brand-green bg-brand-green/10' : 'border-gray-200'}
        ${!hasTeams ? 'opacity-70' : ''}
        ${byeMatch ? 'border-gray-300 bg-gray-50' : ''}
        hover:shadow-md hover:border-brand-gray
      `}
      onClick={onClick}
    >
      <div className={`flex justify-between items-center py-1 px-2 ${winner === 'team1' ? 'bg-brand-green/20' : ''}`}>
        <span className="font-medium break-words pr-2" style={{maxWidth: 'calc(100% - 30px)'}}>
          {teamA || 'TBD'}
        </span>
        <span className="font-bold flex-shrink-0">{isCompleted ? scoreA : '-'}</span>
      </div>
      <div className={`flex justify-between items-center py-1 px-2 mt-1 ${winner === 'team2' ? 'bg-brand-green/20' : ''}`}>
        <span className="font-medium break-words pr-2" style={{maxWidth: 'calc(100% - 30px)'}}>
          {teamB || 'TBD'}
        </span>
        <span className="font-bold flex-shrink-0">{isCompleted ? scoreB : '-'}</span>
      </div>
      
      {(court || scheduledTime) && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
          {court && (
            <div className="flex items-center">
              <MapPin size={12} className="mr-1" />
              <span className="truncate">{court}</span>
            </div>
          )}
          {scheduledTime && (
            <div className="flex items-center mt-1">
              <Calendar size={12} className="mr-1" />
              <span>{scheduledTime}</span>
            </div>
          )}
        </div>
      )}

      {/* BYE indicator with improved styling */}
      {byeMatch && (
        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-md p-2 text-center">
          <span className="text-blue-600 font-medium flex items-center justify-center">
            <XCircle size={14} className="mr-1" />
            BYE (Avanço Automático)
          </span>
        </div>
      )}
    </div>
  );
};

interface MatchEditorProps {
  match: Match;
  onSave: (matchId: string, score1: number, score2: number) => Promise<void>;
  onClose: () => void;
  participantMap: Map<string, string>;
}

const MatchEditor: React.FC<MatchEditorProps> = ({ match, onSave, onClose, participantMap }) => {
  const [score1, setScore1] = useState<number>(match.score1 || 0);
  const [score2, setScore2] = useState<number>(match.score2 || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = async () => {
    if (score1 === score2) {
      setError('Não é permitido empate. Um time deve ter pontuação maior.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      await onSave(match.id, score1, score2);
      onClose();
    } catch (error) {
      console.error('Error saving match results:', error);
      setError((error as Error).message || 'Erro ao salvar o resultado');
    } finally {
      setSaving(false);
    }
  };
  
  // Modificado para mostrar nomes completos da dupla
  const team1Name = match.team1 && match.team1.length > 0 
    ? match.team1.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
    : 'Time 1';
    
  const team2Name = match.team2 && match.team2.length > 0 
    ? match.team2.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
    : 'Time 2';
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-brand-blue">Atualizar Resultado</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div className="font-medium pr-4 break-words max-w-[75%]">{team1Name}</div>
          <input
            type="number"
            min={0}
            value={score1}
            onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded-lg text-center flex-shrink-0"
          />
        </div>
        
        <div className="flex justify-between items-center border-b pb-2">
          <div className="font-medium pr-4 break-words max-w-[75%]">{team2Name}</div>
          <input
            type="number"
            min={0}
            value={score2}
            onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded-lg text-center flex-shrink-0"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Salvar Resultado
        </Button>
      </div>
    </div>
  );
};

interface ScheduleMatchProps {
  match: Match;
  courts: Court[];
  onSave: (matchId: string, courtId: string, scheduledTime: string) => Promise<void>;
  onClose: () => void;
}

const ScheduleMatch: React.FC<ScheduleMatchProps> = ({ match, courts, onSave, onClose }) => {
  const [selectedCourtId, setSelectedCourtId] = useState(match.courtId || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (match.scheduledTime) {
      const dateTime = new Date(match.scheduledTime);
      setScheduledDate(dateTime.toISOString().split('T')[0]);
      setScheduledTime(dateTime.toTimeString().substring(0, 5));
    } else {
      const now = new Date();
      setScheduledDate(now.toISOString().split('T')[0]);
      setScheduledTime('10:00');
    }
  }, [match]);
  
  const handleSave = async () => {
    if (!selectedCourtId) {
      setError('Por favor, selecione uma quadra');
      return;
    }
    
    if (!scheduledDate || !scheduledTime) {
      setError('Por favor, defina a data e hora');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const isoDateTime = `${scheduledDate}T${scheduledTime}:00`;
      await onSave(match.id, selectedCourtId, isoDateTime);
      onClose();
    } catch (error) {
      console.error('Error scheduling match:', error);
      setError((error as Error).message || 'Erro ao agendar partida');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-brand-blue">Agendar Partida</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quadra
          </label>
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="">Selecione uma quadra</option>
            {courts.map(court => (
              <option key={court.id} value={court.id}>
                {court.name} ({court.location})
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Salvar Agendamento
        </Button>
      </div>
    </div>
  );
};

interface FetchedEventData {
  id: string;
  title: string;
  team_formation: TeamFormationType;
  max_participants: number;
  type: EventType;
}

// Função auxiliar para obter detalhes da equipe
const getTeamDetails = (teamIds: string[] | null, eventParticipants: Participant[]) => {
  if (!teamIds || !teamIds.length) return null;
  
  const players = teamIds.map(id => {
    const participant = eventParticipants.find(p => p.id === id);
    return {
      name: participant?.name || 'Desconhecido',
      ranking: participant?.ranking || 0
    };
  });
  
  return {
    players,
    averageRanking: players.reduce((sum, p) => sum + p.ranking, 0) / players.length
  };
};

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ eventId }) => {
  const {
    tournament,
    selectedMatch,
    loading: loadingTournament,
    error: tournamentError,
    fetchTournament,
    generateFormedBracket: generateFormedStructure,
    generateRandomBracketAndGroups: generateRandomStructure,
    generateEliminationBracket,
    updateMatchResults,
    startTournament,
    selectMatch,
    updateMatchSchedule,
  } = useTournamentStore();

  const { eventParticipants, loading: loadingParticipants, fetchParticipantsByEvent } = useParticipantsStore();
  const { courts, loading: loadingCourts, fetchCourts } = useCourtsStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showMatchEditor, setShowMatchEditor] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [skipTeamIds, setSkipTeamIds] = useState<string[]>([]);
  const [showSkipTeamModal, setShowSkipTeamModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<FetchedEventData | null>(null);
  const [loadingEventDetails, setLoadingEventDetails] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'by-court'>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [showGroupRankingsModal, setShowGroupRankingsModal] = useState(false);
  const [calculatedRankings, setCalculatedRankings] = useState<Record<number, GroupRanking[]>>({});
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const [overallGroupRankings, setOverallGroupRankings] = useState<OverallRanking[]>([]);
  const [showOverallRankingsModal, setShowOverallRankingsModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false); // Add state for full-screen mode

  // Adicione essas variáveis ao componente para acesso global
  const matchWidth = 280;       // Largura de cada cartão de partida
  const matchHeight = 120;      // Altura de cada cartão de partida
  const horizontalGap = 100;    // Espaço horizontal entre as rodadas

  // Add toggleFullScreen function implementation
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // Enter full-screen mode
      if (bracketContainerRef.current?.parentElement?.requestFullscreen) {
        bracketContainerRef.current.parentElement.requestFullscreen()
          .then(() => {
            setIsFullScreen(true);
          })
          .catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            addNotification({ type: 'error', message: 'Não foi possível ativar o modo tela cheia' });
          });
      }
    } else {
      // Exit full-screen mode
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            setIsFullScreen(false);
          })
          .catch(err => {
            console.error(`Error attempting to exit full-screen mode: ${err.message}`);
          });
      }
    }
  };

  // Add event listener for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // State for placement-specific rankings modal
  const [placementRankingModalTitle, setPlacementRankingModalTitle] = useState<string>('');
  const [placementRankingModalData, setPlacementRankingModalData] = useState<OverallRanking[]>([]);
  const [showPlacementRankingModal, setShowPlacementRankingModal] = useState<boolean>(false);
  const [overallRankingTab, setOverallRankingTab] = useState<'overall' | 'first' | 'second' | 'third'>('overall');
  // Add states for the different rankings
  const [firstPlaceRankings, setFirstPlaceRankings] = useState<OverallRanking[]>([]);
  const [secondPlaceRankings, setSecondPlaceRankings] = useState<OverallRanking[]>([]);
  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<OverallRanking[]>([]);

  const participantMap = useMemo(() => {
      const map = new Map<string, string>();
      eventParticipants.forEach((participant: Participant) => {
          map.set(participant.id, participant.name);
      });
      return map;
  }, [eventParticipants]);

  // Add the missing getTeamDisplayName function
  const getTeamDisplayName = (teamIds: string[] | null | undefined): string => {
    if (!teamIds || teamIds.length === 0) return 'TBD';
    
    // Handle single player teams (for byes or odd numbers)
    if (teamIds.length === 1) {
      return participantMap.get(teamIds[0]) || 'Desconhecido';
    }
    
    // Handle pairs
    const names = teamIds.map(id => participantMap.get(id) || 'Desconhecido');
    return names.join(' & ');
  };

  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const matchCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (eventId) {
      setLoadingEventDetails(true);
      supabase
        .from('events')
        .select('id, title, team_formation, max_participants, type')
        .eq('id', eventId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching event details:", error);
            addNotification({ type: 'error', message: 'Erro ao buscar detalhes do evento.' });
          } else if (data) {
            setCurrentEvent(data as FetchedEventData);
          } else {
             addNotification({ type: 'error', message: 'Evento não encontrado.' });
          }
          setLoadingEventDetails(false);
        });

      fetchTournament(eventId).catch((err) => {
        console.log("Tournament might not exist yet:", err.message);
        if (err.message && !err.message.includes('JSON object requested') && !err.message.includes('Not Found')) {
          addNotification({ type: 'warning', message: 'Não foi possível buscar dados do torneio existente.' });
        }
      });
      fetchParticipantsByEvent(eventId).catch(() => {
        addNotification({ type: 'error', message: 'Falha ao carregar participantes' });
      });
      fetchCourts().catch(() => {
        addNotification({ type: 'error', message: 'Falha ao carregar quadras' });
      });
    }
  }, [eventId, fetchTournament, fetchParticipantsByEvent, fetchCourts, addNotification]);

  useEffect(() => {
    if (tournamentError) {
      addNotification({ type: 'error', message: tournamentError });
    }
  }, [tournamentError, addNotification]);

  const handleGenerateFormedStructure = async () => {
    if (!eventId || eventParticipants.length < 2) {
      addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes/duplas para gerar a estrutura' });
      return;
    }
    if (!currentEvent) return;

    // Verificar se o evento permite duplas formadas
    if (currentEvent.team_formation !== 'FORMED') {
      addNotification({ 
        type: 'warning', 
        message: 'Este evento está configurado para duplas aleatórias. Use o botão "Duplas Aleatórias" ou altere a configuração do evento.' 
      });
      return;
    }

    const forceReset = !!tournament;
    if (forceReset && !window.confirm('Já existe um torneio. Deseja recriar a estrutura? Isso apagará todas as partidas existentes.')) {
        return;
    }

    try {
      setGeneratingStructure(true);
      
      // Use the service method that respects event team formation
      const { teams } = TournamentService.formTeamsFromParticipants(
        eventParticipants,
        TeamFormationType.FORMED,
        { groupSize: 3 }
      );

      await generateFormedStructure(eventId, teams, { forceReset });

      // Check if there was an error in the store
      const currentError = useTournamentStore.getState().error;
      if (currentError) {
        addNotification({ type: 'error', message: currentError });
      } else {
        addNotification({ 
          type: 'success', 
          message: 'Estrutura do torneio com duplas formadas gerada com sucesso!' 
        });
        setSkipTeamIds([]);
      }
    } catch (err) {
      console.error('Error generating formed structure:', err);
      let errorMessage = 'Erro ao gerar estrutura';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      addNotification({ type: 'error', message: errorMessage });
    } finally {
      setGeneratingStructure(false);
    }
  };

  // Add method to generate random pairs structure
  const handleGenerateRandomStructure = async () => {
    if (!eventId || eventParticipants.length < 2) {
      addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes para gerar a estrutura aleatória' });
      return;
    }
    if (!currentEvent) return;

    // Verificar se o evento permite duplas aleatórias
    if (currentEvent.team_formation !== 'RANDOM') {
      addNotification({ 
        type: 'warning', 
        message: 'Este evento está configurado para duplas formadas. Use o botão "Duplas Formadas" ou altere a configuração do evento.' 
      });
      return;
    }

    const forceReset = !!tournament;
    if (forceReset && !window.confirm('Já existe um torneio. Deseja recriar a estrutura? Isso apagará todas as partidas existentes.')) {
        return;
    }

    try {
      setGeneratingStructure(true);
      
      // Use generateRandomStructure with participants
      await generateRandomStructure(eventId, eventParticipants, { 
        forceReset,
        groupSize: 3 
      });

      addNotification({ 
        type: 'success', 
        message: 'Estrutura aleatória do torneio gerada com sucesso!' 
      });
    } catch (err) {
      console.error('Error generating random structure:', err);
      let errorMessage = 'Erro ao gerar estrutura aleatória';
      if (err instanceof Error) {
        if (err.message.includes('matches') || err.message.includes('schema cache')) {
          errorMessage = 'Torneio criado com funcionalidade limitada. Algumas funcionalidades podem não estar disponíveis devido à configuração do banco de dados.';
          addNotification({ type: 'warning', message: errorMessage });
          // Still try to fetch the tournament to show what was created
          setTimeout(() => {
            fetchTournament(eventId);
          }, 1000);
          return;
        } else {
          errorMessage = err.message;
        }
      }
      addNotification({ 
        type: 'error', 
        message: errorMessage 
      });
    } finally {
      setGeneratingStructure(false);
    }
  };

  // Add a new function to handle group stage completion check
  const handleCheckGroupStageCompletion = () => {
    if (!tournament || !matchesByStage.GROUP) {
      addNotification({ type: 'warning', message: 'Dados do torneio ou partidas de grupo não disponíveis.' });
      return;
    }

    let allGroupsCompleted = true;
    let incompleteGroups: number[] = [];

    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      
      // Check if this group is complete
      if (completedMatches.length !== groupMatches.length) {
        allGroupsCompleted = false;
        incompleteGroups.push(parseInt(groupNum));
      }
    }

    if (allGroupsCompleted) {
      addNotification({ type: 'success', message: 'Todas as partidas da fase de grupos estão concluídas.' });
    } else {
      addNotification({ 
        type: 'info', 
        message: `As seguintes grupos ainda têm partidas pendentes: ${incompleteGroups.join(', ')}` 
      });
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      await startTournament(tournament.id);
      addNotification({ type: 'success', message: 'Torneio iniciado com sucesso!' });
    } catch (err) {
      console.error('Error starting tournament:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar torneio';
      addNotification({ type: 'error', message: errorMessage });
    }
  };

  const handleResetTournament = () => {
    setShowResetConfirmModal(true);
  };

  const confirmResetTournament = async () => {
    try {
      setResetInProgress(true);
      
      // Chamar API para resetar o torneio - removendo o campo matches que não existe
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .update({
          status: 'CREATED',
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Deletar todas as partidas associadas ao torneio
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournament.id);
        
      if (deleteError) throw deleteError;
      
      addNotification({
        type: 'success',
        message: 'Torneio reiniciado com sucesso! Você pode gerar novamente a estrutura.'
      });
      
      // Recarregar o torneio
      await fetchTournament(eventId);
    } catch (error) {
      console.error('Erro ao reiniciar torneio:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao reiniciar o torneio. Tente novamente.'
      });
    } finally {
      setResetInProgress(false);
      setShowResetConfirmModal(false);
    }
  };
  const handleMatchClick = (match: Match) => {
    if (match.team1 && match.team2) {
      // Permitir edição se a partida não foi completada ou se ela é editável
      if (!match.completed || match.editable) {
        selectMatch(match);
        setShowMatchEditor(true);
      } else {
        // Perguntar se o usuário quer editar o resultado, mesmo concluído
        if (confirm("Esta partida já foi concluída. Deseja editar o resultado?")) {
          match.editable = true; // Marca como editável para esta sessão
          selectMatch(match);
          setShowMatchEditor(true);
        }
      }
    } else if (!match.completed) {
      selectMatch(match);
      setShowScheduleModal(true);
    } else {
      addNotification({ type: 'info', message: 'Esta partida já foi concluída.' });
    }
  };

  // Fix in the handleSaveMatchResults function where bracket line highlight is determined
  const handleSaveMatchResults = async (matchId: string, score1: number, score2: number) => {
    try {
      await updateMatchResults(matchId, score1, score2);
      
      // Trigger animation for winner
      setTimeout(() => {
        const winnerId = score1 > score2 ? 'team1' : 'team2';
        const match = tournament?.matches.find(m => m.id === matchId);
        
        if (match && match.round < eliminationRoundsArray.length) {
          const nextRound = match.round + 1;
          const nextPosition = Math.ceil(match.position / 2);
          
          const nextMatchId = eliminationMatches.find(
            m => m.round === nextRound && m.position === nextPosition
          )?.id;
          
          if (nextMatchId && matchCardRefs.current[nextMatchId]) {
            // Adicionar classe temporariamente para acionar a animação
            matchCardRefs.current[nextMatchId].classList.add('winner-animation');
            setTimeout(() => {
              if (matchCardRefs.current[nextMatchId]) {
                matchCardRefs.current[nextMatchId].classList.remove('winner-animation');
              }
            }, 2000);
          }
        }
      }, 300);
      
      addNotification({ type: 'success', message: 'Resultado atualizado!' });
    } catch (err) {
      console.error('Error saving match results:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar resultado.';
      addNotification({ type: 'error', message: errorMessage });
      throw err;
    }
  };

  const handleScheduleMatch = async (matchId: string, courtId: string, scheduledTime: string) => {
    try {
      await updateMatchSchedule(matchId, courtId, scheduledTime);
      addNotification({ type: 'success', message: 'Partida agendada!' });
    } catch (err) {
      console.error('Error scheduling match:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao agendar partida.';
      addNotification({ type: 'error', message: errorMessage });
      throw err;
    }
  };

  const toggleSkipTeam = (participantId: string) => {
    setSkipTeamIds(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  const filterMatchesByCourt = (matches: Match[]) => {
    if (!selectedCourtId || viewMode === 'all') return matches;
    return matches.filter(match => match.courtId === selectedCourtId);
  };

  const handleAutoAssignCourts = async () => {
    if (!tournament || !courts.length) return;

    try {
      const firstRoundMatches = tournament.matches.filter(m => m.round === 1 && m.team1 && m.team2);

      const updates = firstRoundMatches.map((match, index) => {
        const courtIndex = index % courts.length;
        return {
          matchId: match.id,
          courtId: courts[courtIndex].id,
          scheduledTime: new Date().toISOString()
        };
      });

      for (const update of updates) {
        await updateMatchSchedule(update.matchId, update.courtId, update.scheduledTime);
      }

      addNotification({
        type: 'success',
        message: 'Quadras alocadas automaticamente!'
      });

    } catch (err) {
      console.error("Erro ao alocar quadras:", err);
      addNotification({
        type: 'error',
        message: 'Erro ao alocar quadras automaticamente.'
      });
    }
  };

  const handleShowRankings = () => {
    if (!tournament || !matchesByStage.GROUP) {
      addNotification({ type: 'warning', message: 'Dados do torneio ou partidas de grupo não disponíveis.' });
      return;
    }

    const rankings: Record<number, GroupRanking[]> = {};
    // let allMatchesCompleted = true; // This variable was declared but not used effectively for overall logic
    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      // if (completedMatches.length !== groupMatches.length) { // Check for individual group completion
      //   allMatchesCompleted = false;
      // }
      rankings[groupNum] = calculateGroupRankings(completedMatches);
    }

    setCalculatedRankings(rankings);
    setShowGroupRankingsModal(true);
  };

  const handleShowOverallRankings = () => {
    if (!tournament || !matchesByStage.GROUP || !isGroupStageComplete) {
      addNotification({ type: 'warning', message: 'Todas as partidas da fase de grupos devem estar concluídas.' });
      return;
    }

    let allCompletedGroupMatches: Match[] = [];
    for (const groupNum in matchesByStage.GROUP) {
      allCompletedGroupMatches = allCompletedGroupMatches.concat(
        matchesByStage.GROUP[groupNum].filter(match => match.completed)
      );
    }

    if (allCompletedGroupMatches.length === 0) {
        addNotification({ type: 'info', message: 'Nenhuma partida de grupo concluída para calcular o ranking geral.' });
        return;
    }
    
    const overallRankingsData = calculateOverallGroupStageRankings(allCompletedGroupMatches);
    setOverallGroupRankings(overallRankingsData);
    
    // Also calculate rankings by placement
    const rankings: Record<number, GroupRanking[]> = {};
    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      if (completedMatches.length === groupMatches.length) {
        rankings[groupNum] = calculateGroupRankings(completedMatches);
      }
    }
    
    setCalculatedRankings(rankings);
    setFirstPlaceRankings(calculateRankingsForPlacement(rankings, 1));
    setSecondPlaceRankings(calculateRankingsForPlacement(rankings, 2));
    setThirdPlaceRankings(calculateRankingsForPlacement(rankings, 3));
    
    setShowOverallRankingsModal(true);
  };

  const handleShowPlacementRankings = (placement: number, title: string) => {
    if (!tournament || !matchesByStage.GROUP || !isGroupStageComplete) {
      addNotification({ type: 'warning', message: 'Todas as partidas da fase de grupos devem estar concluídas.' });
      return;
    }
    if (Object.keys(calculatedRankings).length === 0) {
      addNotification({ type: 'info', message: 'Rankings de grupo ainda não calculados. Clique em "Ver Ranking Grupos" primeiro.' });
      // Optionally, calculate them here if not already done
      // handleShowRankings(); // This might cause a double modal flash if not careful
      // For now, let's assume user clicks "Ver Ranking Grupos" first or it's auto-calculated.
      // A more robust solution would be to ensure calculatedRankings is populated.
      // Let's try to calcular it if needed.
      let currentCalculatedRankings = calculatedRankings;
      if (Object.keys(currentCalculatedRankings).length === 0 && isGroupStageComplete) {
        const rankings: Record<number, GroupRanking[]> = {};
        for (const groupNum in matchesByStage.GROUP) {
          const groupMatches = matchesByStage.GROUP[groupNum];
          // Ensure all matches in the group are completed for this specific calculation context
          const completedMatches = groupMatches.filter(match => match.completed);
          if (completedMatches.length === groupMatches.length) { // Only consider fully completed groups for this
             rankings[groupNum] = calculateGroupRankings(completedMatches);
          }
        }
        currentCalculatedRankings = rankings;
        // setCalculatedRankings(rankings); // Avoid direct state update if it triggers re-renders elsewhere unexpectedly
      }
      
      if (Object.keys(currentCalculatedRankings).length === 0) {
        addNotification({ type: 'info', message: 'Não foi possível calcular os rankings dos grupos. Verifique se todas as partidas estão completas.' });
        return;
      }
    }

    const placementRankingsData = calculateRankingsForPlacement(calculatedRankings, placement);
    if (placementRankingsData.length === 0) {
        addNotification({ type: 'info', message: `Nenhuma equipe encontrada na ${placement}ª colocação dos grupos.` });
        return;
    }
    setPlacementRankingModalData(placementRankingsData);
    setPlacementRankingModalTitle(title);
    setShowPlacementRankingModal(true);
  };

  const isDataLoading = loadingTournament || loadingParticipants || loadingCourts || loadingEventDetails;

  const matchesByStage = useMemo(() => {
    if (!tournament?.matches) return { GROUP: {}, ELIMINATION: [] };
    return tournament.matches.reduce((acc, match) => {
      if (match.stage === 'GROUP') {
        const groupNum = match.groupNumber ?? 0;
        if (!acc.GROUP[groupNum]) acc.GROUP[groupNum] = [];
        acc.GROUP[groupNum].push(match);
      } else {
        acc.ELIMINATION.push(match);
      }
      return acc;
    }, { GROUP: {} as Record<number, Match[]>, ELIMINATION: [] as Match[] });
  }, [tournament?.matches]);

  const groupNumbers = Object.keys(matchesByStage.GROUP).map(Number).sort((a, b) => a - b);
  const eliminationMatches = matchesByStage.ELIMINATION;
  const currentStage = useMemo<'NONE' | 'GROUP' | 'ELIMINATION'>(() => {
    if (!tournament || !tournament.matches || tournament.matches.length === 0) return 'NONE';
    const hasGroup = tournament.matches.some(m => m.stage === 'GROUP');
    const hasElim = tournament.matches.some(m => m.stage === 'ELIMINATION');
    console.log('Tournament stages detection:', { hasGroup, hasElim, matches: tournament.matches.length });
    if (hasElim) return 'ELIMINATION';
    if (hasGroup) return 'GROUP';
    return 'NONE';
  }, [tournament]);
  const isGroupStageComplete = useMemo(() => {
      // Se não há grupos definidos, a fase de grupos é considerada não completa
      if (groupNumbers.length === 0) {
          return false;
      }
      
      // Para cada grupo, verificar se todas as partidas estão concluídas
      const result = groupNumbers.every(num => {
          // Garantir que o grupo existe e tem partidas
          if (!matchesByStage.GROUP[num] || matchesByStage.GROUP[num].length === 0) {
              return false;
          }
          // Verificar se todas as partidas do grupo estão completas
          return matchesByStage.GROUP[num].every(match => match.completed === true);
      });
      
      return result;
  }, [groupNumbers, matchesByStage.GROUP, tournament]);

  // Substitua o trecho que calcula as posições dos matches
  const { eliminationRoundsArray, bracketLines, matchPositionMap } = useMemo(() => {
    const rounds: Record<number, Match[]> = {};
    eliminationMatches.forEach(match => {
      if (match?.round !== undefined && match.round !== null) {
        if (!rounds[match.round]) rounds[match.round] = [];
        rounds[match.round].push(match);
      }
    });

    const roundsArray = Object.entries(rounds)
      .map(([round, matches]) => ({
        round: parseInt(round),
        matches: matches.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }))
      .sort((a, b) => a.round - b.round);
      
    // Dimensões para layout centralizado
    // Número total de rodadas
    const totalRounds = roundsArray.length;
    
    // Calcular mapa de posições para alinhamento perfeito
    const matchPositionMap = new Map<string, { x: number, y: number, width: number, height: number }>();
    
    // Primeiro, calcular o tamanho total do bracket para centralização
    let totalBracketHeight = 0;
    const firstRoundMatches = roundsArray[0]?.matches.length || 0;
    
    if (firstRoundMatches > 0) {
      // Calcular a altura do bracket com base na primeira rodada
      const verticalGap = 40;
      totalBracketHeight = firstRoundMatches * matchHeight + (firstRoundMatches - 1) * verticalGap;
    }
    
    // Para cada rodada, calcular posições
    roundsArray.forEach((roundData, roundIndex) => {
      const matchesInRound = roundData.matches.length;
      const roundX = roundIndex * (matchWidth + horizontalGap);
      
      // Encontrar a partida final (última rodada, única partida)
      const isFinalRound = roundIndex === roundsArray.length - 1 && matchesInRound === 1;
      
      // Para a partida final, colocamos exatamente no centro vertical
      if (isFinalRound) {
        const finalMatch = roundData.matches[0];
        const centerY = totalBracketHeight / 2 - matchHeight / 2;
        
        matchPositionMap.set(finalMatch.id, {
          x: roundX,
          y: centerY,
          width: matchWidth,
          height: matchHeight
        });
      } 
      // Para a primeira rodada, distribuímos uniformemente
      else if (roundIndex === 0) {
        const verticalGap = 40;
        const totalHeight = matchesInRound * matchHeight + (matchesInRound - 1) * verticalGap;
        const startY = (totalBracketHeight - totalHeight) / 2;
        
        roundData.matches.forEach((match, matchIndex) => {
          const y = startY + matchIndex * (matchHeight + verticalGap);
          
          matchPositionMap.set(match.id, {
            x: roundX,
            y: y,
            width: matchWidth,
            height: matchHeight
          });
        });
      }
      // Para rodadas intermediárias, posicionamos com base nas origens
      else {
        roundData.matches.forEach((match) => {
          if (!match.position) return;
          
          // Encontrar as duas partidas da rodada anterior que alimentam esta
          const prevRound = roundsArray[roundIndex - 1];
          if (!prevRound) return;
          
          const sourceMatch1 = prevRound.matches.find(m => m.position === match.position * 2 - 1);
          const sourceMatch2 = prevRound.matches.find(m => m.position === match.position * 2);
          
          if (!sourceMatch1 || !sourceMatch2) return;
          
          const pos1 = matchPositionMap.get(sourceMatch1.id);
          const pos2 = matchPositionMap.get(sourceMatch2.id);
          
          if (pos1 && pos2) {
            // Colocamos a partida centralizada entre as duas fontes
            const centerY = (pos1.y + pos1.height/2 + pos2.y + pos2.height/2) / 2 - matchHeight/2;
            
            matchPositionMap.set(match.id, {
              x: roundX,
              y: centerY,
              width: matchWidth,
              height: matchHeight
            });
          }
        });
      }
    });
    
    // Gerar linhas de conexão entre as rodadas
    const lines: Array<{ key: string; path: string; fromMatch: string; toMatch: string; highlight: boolean }> = [];
    
    // Processar conexões entre rodadas
    if (roundsArray.length > 1) {
      for (let roundIndex = 0; roundIndex < roundsArray.length - 1; roundIndex++) {
        const currentRound = roundsArray[roundIndex];
        const nextRound = roundsArray[roundIndex + 1];
        
        currentRound.matches.forEach((match) => {
          if (!match) return;
          
          // Encontrar a próxima partida para a qual esta alimenta
          const nextMatchPosition = Math.ceil((match.position || 0) / 2);
          const nextMatch = nextRound.matches.find(m => m.position === nextMatchPosition);
          
          if (!nextMatch) return;
          
          const fromPos = matchPositionMap.get(match.id);
          const toPos = matchPositionMap.get(nextMatch.id);
          
          if (!fromPos || !toPos) return;
          
          // Calcular coordenadas para as linhas
          const startX = fromPos.x + fromPos.width;
          const startY = fromPos.y + (fromPos.height / 2);
          const endX = toPos.x;
          const endY = toPos.y + (toPos.height / 2);
          const midX = startX + (endX - startX) / 2;
          
          // Criar caminho com linhas retas
          const path = `
            M ${startX} ${startY}
            L ${midX} ${startY}
            L ${midX} ${endY}
            L ${endX} ${endY}
          `;
          
          // Adicionar destaque para caminhos de vencedores
          const highlight = match.completed && nextMatch.team1 && match.team2 && 
            ((match.winnerId === 'team1' && match.team1 && nextMatch.team1.includes(match.team1[0])) || 
            (match.winnerId === 'team2' && match.team2[0] && nextMatch.team1.includes(match.team2[0])));
          
          lines.push({ 
            key: `${match.id}-to-${nextMatch.id}`, 
            path,
            fromMatch: match.id,
            toMatch: nextMatch.id,
            highlight: !!highlight
          });
        });
      }
    }
    
    return { 
      eliminationRoundsArray: roundsArray, 
      bracketLines: lines,
      matchPositionMap
    };
  }, [eliminationMatches]);

  // Modified getRoundName function for proper tournament naming
  const getRoundName = (roundIndex: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1) return 'Final';
    if (roundIndex === totalRounds - 2) return 'Semifinal';
    if (roundIndex === totalRounds - 3) return 'Quartas de Final';
    if (roundIndex === totalRounds - 4) return 'Oitavas de Final';
    return `${Math.pow(2, totalRounds - roundIndex)}ª de Final`;
  };

  // Add this function before the return statement in your component
  const getBracketDimensions = () => {
    if (eliminationRoundsArray.length === 0) return { width: '100%', height: '100%' };
    
    // Calculate total width and height based on match positions
    let maxX = 0;
    let maxY = 0;
    
    matchPositionMap.forEach((position) => {
      const rightEdge = position.x + position.width;
      const bottomEdge = position.y + position.height;
      
      if (rightEdge > maxX) maxX = rightEdge;
      if (bottomEdge > maxY) maxY = bottomEdge;
    });
    
    // Add some padding
    return {
      width: `${maxX + 100}px`,
      height: `${maxY + 100}px`,
    };
  };

  // Adicione esta função para calcular a largura total do container de cabeçalhos
  const getHeaderContainerWidth = () => {
    const totalRounds = eliminationRoundsArray.length;
    if (totalRounds === 0) return '100%';
    
    return `${totalRounds * (matchWidth + horizontalGap)}px`;
  };

  // Adicione este evento para sincronizar o scroll dos cabeçalhos com o bracket
  useEffect(() => {
    const bracketContainer = bracketContainerRef.current;
    const headerContainer = document.getElementById('bracket-headers-container');
    
    if (!bracketContainer || !headerContainer) return;
    
    const handleScroll = () => {
      headerContainer.scrollLeft = bracketContainer.scrollLeft;
    };
    
    bracketContainer.addEventListener('scroll', handleScroll);
    return () => {
      bracketContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleForceRecalculateRankings = () => {
    try {
      if (!tournament || !matchesByStage.GROUP) {
        addNotification({ 
          type: 'warning', 
          message: 'Não há dados suficientes para calcular rankings.' 
        });
        return;
      }

      const allRankings: Record<number, GroupRanking[]> = {};
      let allGroupMatchesCompleted = true;

      // Para cada grupo, recalcular rankings
      Object.keys(matchesByStage.GROUP).forEach(groupNumStr => {
        const groupNum = parseInt(groupNumStr);
        const groupMatches = matchesByStage.GROUP[groupNum];
        const completedMatches = groupMatches.filter(m => m.completed);
        
        console.log(`Grupo ${groupNum}: ${completedMatches.length}/${groupMatches.length} partidas concluídas`);
        
        // Verificar se todas as partidas do grupo estão concluídas
        if (completedMatches.length !== groupMatches.length) {
          allGroupMatchesCompleted = false;
        }
        
        // Calcular rankings para este grupo
        allRankings[groupNum] = calculateGroupRankings(groupMatches, true);
      });

      // Exibir resultados 
      setCalculatedRankings(allRankings);
      setShowGroupRankingsModal(true);
      
      // Informar o status das partidas
      if (!allGroupMatchesCompleted) {
        addNotification({ 
          type: 'warning', 
          message: 'Nem todas as partidas da fase de grupos estão concluídas.' 
        });
      } else {
        addNotification({ 
          type: 'success', 
          message: 'Todas as partidas da fase de grupos estão concluídas. Você pode gerar a fase eliminatória.' 
        });
      }
    } catch (error) {
      console.error("Error calculating rankings:", error);
      addNotification({ 
        type: 'error', 
        message: 'Erro ao calcular rankings: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      });
    }
  };

  if (isDataLoading) {
     return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
        <span className="ml-2 text-gray-500">Carregando dados do chaveamento...</span>
      </div>
    );
  }

  if (tournament && tournament.matches.length > 0) {
    return (
      <div className="space-y-6">
        {/* Header with tournament info and controls */}
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-brand-blue mb-2 flex items-center">
              <Trophy size={24} className="mr-2" />
              Torneio - {currentEvent?.title}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Status: <span className="font-medium">{tournament.status}</span></span>
              <span>Partidas: <span className="font-medium">{tournament.matches.length}</span></span>
              <span>Participantes: <span className="font-medium">{eventParticipants.length}</span></span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Controls and buttons */}
            {tournament.status === 'CREATED' && (
              <Button 
                onClick={handleStartTournament}
                className="flex items-center"
              >
                <PlayCircle size={16} className="mr-2" />
                Iniciar Torneio
              </Button>
            )}
            
            <Button 
              variant="outline"
              onClick={handleResetTournament}
              className="flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Reiniciar
            </Button>
          </div>
        </div>

        {/* Tournament content */}
        {currentStage === 'GROUP' && (
          <div className="space-y-6">
            {/* Group stage content */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-brand-blue">Fase de Grupos</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShowRankings}>
                  <List size={16} className="mr-1" />
                  Ver Rankings dos Grupos
                </Button>
                {isGroupStageComplete && (
                  <Button variant="outline" size="sm" onClick={handleShowOverallRankings}>
                    <Award size={16} className="mr-1" />
                    Ranking Geral
                  </Button>
                )}
              </div>
            </div>

            {/* Groups display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {groupNumbers.map(groupNum => {
                const groupMatches = matchesByStage.GROUP[groupNum] || [];
                const completedMatches = groupMatches.filter(m => m.completed);
                const totalMatches = groupMatches.length;
                
                return (
                  <div key={groupNum} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-brand-blue">Grupo {groupNum}</h4>
                        <span className="text-sm text-gray-500">
                          {completedMatches.length}/{totalMatches} partidas
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      {groupMatches.map(match => (
                        <div
                          key={match.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                            match.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => handleMatchClick(match)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-gray-500">
                              {match.completed ? 'Finalizada' : 'Pendente'}
                            </span>
                            {match.completed && (
                              <CheckCircle size={16} className="text-green-600" />
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className={`flex justify-between items-center ${
                              match.winnerId === match.team1?.[0] ? 'font-bold text-green-600' : ''
                            }`}>
                              <span className="truncate mr-2">
                                {getTeamDisplayName(match.team1)}
                              </span>
                              <span className="font-bold">
                                {match.score1 !== null ? match.score1 : '-'}
                              </span>
                            </div>
                            
                            <div className={`flex justify-between items-center ${
                              match.winnerId === match.team2?.[0] ? 'font-bold text-green-600' : ''
                            }`}>
                              <span className="truncate mr-2">
                                {getTeamDisplayName(match.team2)}
                              </span>
                              <span className="font-bold">
                                {match.score2 !== null ? match.score2 : '-'}
                              </span>
                            </div>
                          </div>
                          
                          {(match.courtId || match.scheduledTime) && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                              {match.courtId && (
                                <div>Quadra: {courts.find(c => c.id === match.courtId)?.name || 'Não definida'}</div>
                              )}
                              {match.scheduledTime && (
                                <div>Horário: {new Date(match.scheduledTime).toLocaleString('pt-BR')}</div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Elimination stage content */}
        {currentStage === 'ELIMINATION' && eliminationRoundsArray.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-brand-blue">Chaveamento Eliminatório</h3>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullScreen}
                  className="flex items-center"
                >
                  {isFullScreen ? (
                    <>
                      <Minimize2 size={16} className="mr-1" />
                      Sair da Tela Cheia
                    </>
                  ) : (
                    <>
                      <Maximize2 size={16} className="mr-1" />
                      Tela Cheia
                    </>
                  )}
                </Button>
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Zoom:</label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">{zoomLevel}%</span>
                </div>
              </div>
            </div>
            
            {/* Bracket visualization */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Headers for rounds */}
              <div 
                id="bracket-headers-container" 
                className="bg-gray-50 border-b border-gray-200 px-4 py-3 overflow-x-auto"
                style={{ width: getHeaderContainerWidth() }}
              >
                <div className="flex" style={{ minWidth: getHeaderContainerWidth() }}>
                  {eliminationRoundsArray.map((roundData, index) => (
                    <div 
                      key={roundData.round}
                      className="flex-shrink-0 text-center font-medium text-brand-blue"
                      style={{ 
                        width: `${matchWidth}px`,
                        marginRight: index < eliminationRoundsArray.length - 1 ? `${horizontalGap}px` : '0'
                      }}
                    >
                      {getRoundName(index, eliminationRoundsArray.length)}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bracket container */}
              <div 
                ref={bracketContainerRef}
                className="relative overflow-auto p-6"
                style={{ 
                  minHeight: '400px',
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top left',
                  width: `${100 / (zoomLevel / 100)}%`,
                  height: `${100 / (zoomLevel / 100)}%`
                }}
              >
                <div 
                  className="relative"
                  style={getBracketDimensions()}
                >
                  {/* Render SVG lines */}
                  <svg 
                    className="absolute inset-0 pointer-events-none" 
                    style={getBracketDimensions()}
                  >
                    {bracketLines.map((line) => (
                      <path
                        key={line.key}
                        d={line.path}
                        stroke={line.highlight ? "#10b981" : "#e5e7eb"}
                        strokeWidth={line.highlight ? "3" : "2"}
                        fill="none"
                        className={line.highlight ? "animate-pulse" : ""}
                      />
                    ))}
                  </svg>
                  
                  {/* Render matches */}
                  {eliminationRoundsArray.map((roundData) => (
                    roundData.matches.map((match) => {
                      const position = matchPositionMap.get(match.id);
                      if (!position) return null;
                      
                      const court = match.courtId ? courts.find(c => c.id === match.courtId) : null;
                      const scheduledTime = match.scheduledTime 
                        ? new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })
                        : undefined;
                      
                      return (
                        <div
                          key={match.id}
                          ref={(el) => matchCardRefs.current[match.id] = el}
                          className="absolute"
                          style={{
                            left: `${position.x}px`,
                            top: `${position.y}px`,
                            width: `${position.width}px`,
                            height: `${position.height}px`,
                          }}
                        >
                          <MatchCard
                            teamA={getTeamDisplayName(match.team1)}
                            teamB={getTeamDisplayName(match.team2)}
                            scoreA={match.score1 ?? undefined}
                            scoreB={match.score2 ?? undefined}
                            winner={match.winnerId === match.team1?.[0] ? 'team1' : 
                                   match.winnerId === match.team2?.[0] ? 'team2' : undefined}
                            onClick={() => handleMatchClick(match)}
                            highlighted={selectedMatch?.id === match.id}
                            byeMatch={!match.team1 || !match.team2 || match.team1.length === 0 || match.team2.length === 0}
                            court={court?.name}
                            scheduledTime={scheduledTime}
                            completed={match.completed}
                          />
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modals and dialogs */}
        {/* Match Editor Modal */}
        {showMatchEditor && selectedMatch && (
          <Modal isOpen={showMatchEditor} onClose={() => setShowMatchEditor(false)} title="Editar Partida">
            <MatchEditor
              match={selectedMatch}
              onSave={handleSaveMatchResults}
              onClose={() => setShowMatchEditor(false)}
              participantMap={participantMap}
            />
          </Modal>
        )}

        {/* Schedule Match Modal */}
        {showScheduleModal && selectedMatch && (
          <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Agendar Partida">
            <ScheduleMatch
              match={selectedMatch}
              courts={courts}
              onSave={handleScheduleMatch}
              onClose={() => setShowScheduleModal(false)}
            />
          </Modal>
        )}

        {/* Group rankings modal */}
        <Modal
          isOpen={showGroupRankingsModal}
          onClose={() => setShowGroupRankingsModal(false)}
          title="Ranking da Fase de Grupos"
          size="large"
        >
          <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100 text-sm">
            <h5 className="font-medium mb-2 text-blue-700">Legenda:</h5>
            <ul className="space-y-1 text-blue-800">
              <li><span className="font-medium">V</span> - Vitórias: Total de partidas vencidas pela dupla</li>
              <li><span className="font-medium">SG</span> - Saldo de Games: Diferença entre games ganhos e perdidos</li>
              <li><span className="font-medium">PG</span> - Games Ganhos: Total de games conquistados pela dupla</li>
            </ul>
          </div>
          
          <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
            {Object.entries(calculatedRankings).length > 0 ? (
              Object.entries(calculatedRankings)
                .sort(([numA], [numB]) => parseInt(numA) - parseInt(numB))
                .map(([groupNum, rankings]) => (

                  <div key={groupNum} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-brand-purple mb-3">Grupo {groupNum}</h4>
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Dupla</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">V</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">SG</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">PG</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rankings.map((entry, index) => {
                          const teamName = entry.teamId.map((id: string) => participantMap.get(id) || 'N/A').join(' & ');
                          const isQualifier = entry.rank <= 2;
                          return (
                            <tr key={entry.teamId.join('-')} className={`hover:bg-gray-50 ${isQualifier ? 'bg-green-50' : ''}`}>
                              <td className={`px-3 py-2 whitespace-nowrap font-medium ${isQualifier ? 'text-green-700' : ''}`}>
                                {entry.rank}
                                {isQualifier && <Award size={12} className="inline ml-1 text-yellow-500" />}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">{teamName}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.wins}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gameDifference > 0 ? `+${entry.stats.gameDifference}` : entry.stats.gameDifference}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gamesWon}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.matchesPlayed}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
              <p className="text-gray-500 text-center">Nenhum ranking disponível para esta colocação.</p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setShowGroupRankingsModal(false)}>Fechar</Button>
          </div>
        </Modal>
        <Modal
          isOpen={showPlacementRankingModal}
          onClose={() => setShowPlacementRankingModal(false)}
          title={placementRankingModalTitle}
          size="large"
        >
          <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100 text-sm">
            <h5 className="font-medium mb-2 text-blue-700">Legenda:</h5>
            <ul className="space-y-1 text-blue-800">
              <li><span className="font-medium">V</span> - Vitórias: Total de partidas vencidas pela dupla</li>
              <li><span className="font-medium">SG</span> - Saldo de Games: Diferença entre games ganhos e perdidos</li>
              <li><span className="font-medium">PG</span> - Games Ganhos: Total de games conquistados pela dupla</li>
              <li><span className="font-medium">JP</span> - Jogos Disputados: Total de partidas em que a dupla participou</li>
            </ul>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
            {placementRankingModalData.length > 0 ? (
              <div className="border border-gray-200 rounded-lg p-4">
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
                  <tbody>
                    {placementRankingModalData.map((entry) => {
                      const teamName = entry.teamId.map((id: string) => participantMap.get(id) || 'N/A').join(' & ');
                      return (
                        <tr key={entry.teamId.join('-')} className={`hover:bg-gray-50`}>
                          <td className={`px-3 py-2 whitespace-nowrap font-medium`}>
                            {entry.rank}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{teamName}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.wins}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gameDifference > 0 ? `+${entry.stats.gameDifference}` : entry.stats.gameDifference}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gamesWon}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.matchesPlayed}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center">Nenhum ranking disponível para esta colocação.</p>
            )}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => setShowPlacementRankingModal(false)}>Fechar</Button>
          </div>
        </Modal>
        <Modal
          isOpen={showResetConfirmModal}
          onClose={() => setShowResetConfirmModal(false)}
          title="Reiniciar Torneio"
        >
          <div className="p-1">
            <div className="flex items-center mb-4 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
              <AlertCircle size={24} className="mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-medium">Atenção: Esta ação não pode ser desfeita</h4>
                <p className="text-sm">
                  Reiniciar o torneio apagará todos os dados de partidas, grupos e chaveamento.
                  {currentEvent?.team_formation === TeamFormationType.RANDOM 
                    ? ' O torneio voltará para a etapa de formação de duplas.' 
                    : ' O torneio voltará para a etapa de geração de grupos.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={resetInProgress}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={confirmResetTournament}
                loading={resetInProgress}
              >
                Sim, Reiniciar Torneio
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  } else if (tournament && tournament.matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg p-8">
        <Award className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Torneio Criado</h3>
        <p className="text-gray-500 text-center mb-6">
          O torneio foi criado mas ainda não possui partidas. Use os botões abaixo para gerar a estrutura.
        </p>
        
        {/* Show current event team formation configuration */}
        {currentEvent && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 text-center">
              <strong>Configuração do evento:</strong> {currentEvent.team_formation === 'FORMED' ? 'Duplas Formadas' : 'Duplas Aleatórias'}
            </p>
          </div>
        )}
        
        <div className="flex gap-4">
          {(!currentEvent || currentEvent.team_formation === 'FORMED') && (
            <Button
              onClick={handleGenerateFormedStructure}
              loading={generatingStructure}
              disabled={eventParticipants.length < 2}
             
              variant={currentEvent?.team_formation === 'FORMED' ? 'primary' : 'outline'}
            >
              <Users size={16} className="mr-2" />
              Gerar Grupos
            </Button>
          )}
          
          {(!currentEvent || currentEvent.team_formation === 'RANDOM') && (
            <Button
              onClick={handleGenerateRandomStructure}
              loading={generatingStructure}
              disabled={eventParticipants.length < 2}
              variant={currentEvent?.team_formation === 'RANDOM' ? 'primary' : 'outline'}
            >
              <Shuffle size={16} className="mr-2" />
              Sorteio Aleatório
            </Button>
          )}
        </div>
        
        {eventParticipants.length < 2 && (
          <p className="text-sm text-red-500 mt-4">
            É necessário pelo menos 2 participantes para criar um torneio.
          </p>
        )}
      </div>
    );
  } else {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg p-8">
        <Award className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum Torneio Criado</h3>
        <p className="text-gray-500 text-center mb-6">
          Crie um torneio para este evento e comece a organizar as partidas.
        </p>
        
        {/* Show current event team formation configuration */}
        {currentEvent && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 text-center">
              <strong>Configuração do evento:</strong> {currentEvent.team_formation === 'FORMED' ? 'Duplas Formadas' : 'Duplas Aleatórias'}
            </p>
          </div>
        )}
        
        <div className="flex gap-4">
          {(!currentEvent || currentEvent.team_formation === 'FORMED') && (
            <Button
              onClick={handleGenerateFormedStructure}
              loading={generatingStructure}
              disabled={eventParticipants.length < 2}
              variant={currentEvent?.team_formation === 'FORMED' ? 'primary' : 'outline'}
            >
              <Users size={16} className="mr-2" />
              Gerar Grupos
            </Button>
          )}
          
          {(!currentEvent || currentEvent.team_formation === 'RANDOM') && (
            <Button
              onClick={handleGenerateRandomStructure}
              loading={generatingStructure}
              disabled={eventParticipants.length < 2}
              variant={currentEvent?.team_formation === 'RANDOM' ? 'primary' : 'outline'}
            >
              <Shuffle size={16} className="mr-2" />
              Sorteio Aleatório
            </Button>
          )}
        </div>
        
        {eventParticipants.length < 2 && (
          <p className="text-sm text-red-500 mt-4">
            É necessário pelo menos 2 participantes para criar um torneio.
          </p>
        )}
      </div>
    );
  }
}
