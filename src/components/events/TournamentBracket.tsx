import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  PlayCircle,
  RefreshCw,
  Loader2,
  Award,
  AlertCircle,
  MapPin,
  Calendar,
  CheckCircle,
  Users,
  Shuffle,
  Trophy,
  Monitor, // Add Monitor icon for transmission
  List,
  Edit3,
  UserX
} from 'lucide-react';
import { useTournamentStore, useParticipantsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Match, Participant, Court, TeamFormationType, EventType } from '../../types';
import { Modal } from '../ui/Modal';
import { 
  calculateGroupRankings, 
  GroupRanking, 
  calculateOverallGroupStageRankings, 
  OverallRanking,
  generateEliminationBracketWithSmartBye,
  detectTieBreaksInRanking,
  removeTeamFromRanking,
  updateEliminationBracket
} from '../../utils/rankingUtils';
import TournamentRankings from '../TournamentRankings'; // Import the new component
import EliminationRankings from '../EliminationRankings';
import TournamentWinner from '../TournamentWinner';
import BracketEditor from '../BracketEditor';// Import da versão completa e corrigida
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { TournamentService } from '../../services/supabase/tournament'; // Add this import
import { EventsService } from '../../services/supabase/events'; // Add EventsService import

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
function getTeamKey(team: string[] | null | undefined): string {
  if (!team) return '';
  return team.join('|');
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
    // Enhanced BYE match visualization for better UX
  if (byeMatch) {
    const advancingTeam = teamA || teamB;
    return (
      <div 
        className={`
          border rounded-md p-3 min-w-[200px] cursor-pointer transition-all
          border-indigo-300 bg-indigo-50/70 
          ${highlighted ? 'ring-2 ring-indigo-500' : ''}
          hover:shadow-md hover:border-indigo-400
        `}
        onClick={onClick}
      >
        <div className="flex justify-center items-center py-2">
          <div className="text-indigo-700 font-medium flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            BYE
          </div>
        </div>
        {advancingTeam && (
          <div className="mt-3 border-t border-indigo-200 pt-2">
            <div className="text-center font-medium text-indigo-800">
              {advancingTeam}
            </div>
            <div className="text-center text-xs text-indigo-600 mt-1">
              avança automaticamente
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (    <div 
      className={`
        border rounded-md p-2 min-w-[200px] cursor-pointer transition-all
        ${highlighted ? 'border-brand-green bg-brand-green/10 ring-2 ring-brand-green' : 'border-gray-200'}
        ${!hasTeams ? 'opacity-90 bg-gray-50' : completed ? 'bg-green-50/50' : ''}
        hover:shadow-md hover:border-brand-gray
      `}
      style={{borderRadius: '6px'}}
      onClick={onClick}
    >
      <div className={`flex justify-between items-center py-1 px-2 ${winner === 'team1' ? 'bg-brand-green/20 rounded' : ''}`}>
        <span className="font-medium break-words pr-2" style={{maxWidth: 'calc(100% - 30px)'}}>
          {teamA || 'A definir'}
        </span>
        <span className="font-bold flex-shrink-0">{isCompleted ? scoreA : '-'}</span>
      </div>
      <div className={`flex justify-between items-center py-1 px-2 mt-1 ${winner === 'team2' ? 'bg-brand-green/20 rounded' : ''}`}>
        <span className="font-medium break-words pr-2" style={{maxWidth: 'calc(100% - 30px)'}}>
          {teamB || 'A definir'}
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
  const [showGroupRankingsModal, setShowGroupRankingsModal] = useState(false);  const [calculatedRankings, setCalculatedRankings] = useState<Record<number, GroupRanking[]>>({});
  const [zoomLevel, setZoomLevel] = useState(100);
  const [autoZoomLevel, setAutoZoomLevel] = useState<number | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);  const [overallGroupRankings, setOverallGroupRankings] = useState<OverallRanking[]>([]);
  const [showOverallRankingsModal, setShowOverallRankingsModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false); // Add state for full-screen mode
  const [showByeAssignment, setShowByeAssignment] = useState(false); // Estado para modal de atribuição de BYE
  
  // Estados para configuração de grupos automáticos
  const [showGroupConfigModal, setShowGroupConfigModal] = useState(false);
  const [groupConfigMode, setGroupConfigMode] = useState<'formed' | 'random'>('formed');
  const [maxTeamsPerGroup, setMaxTeamsPerGroup] = useState(4);
  const [autoCalculateGroups, setAutoCalculateGroups] = useState(false);
  const [traditionalGroupSize, setTraditionalGroupSize] = useState(3);
  
  // Configurações otimizadas do chaveamento
  const matchWidth = 240;       // Largura de cada cartão de partida
  const matchHeight = 100;      // Altura de cada cartão de partida
  const horizontalGap = 280;    // Espaço horizontal entre as rodadas (aumentado para evitar sobreposição)
  const verticalPadding = 80;   // Espaço vertical para centralizar o chaveamento
  const globalCenterY = 500;    // Centro vertical para alinhamento do chaveamento

  useEffect(() => {
    const handleFullScreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;
      setIsFullScreen(isFullscreen);
      
      // If exiting fullscreen and we have a saved zoom level, restore it
      if (!isFullscreen && autoZoomLevel !== null) {
        setZoomLevel(autoZoomLevel);
        setAutoZoomLevel(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [autoZoomLevel]);

  // State for placement-specific rankings modal
  const [placementRankingModalTitle, setPlacementRankingModalTitle] = useState<string>('');
  const [placementRankingModalData, setPlacementRankingModalData] = useState<OverallRanking[]>([]);
  const [showPlacementRankingModal, setShowPlacementRankingModal] = useState<boolean>(false);
  const [overallRankingTab, setOverallRankingTab] = useState<'overall' | 'first' | 'second' | 'third'>('overall');
  // Add states for the different rankings
  const [firstPlaceRankings, setFirstPlaceRankings] = useState<OverallRanking[]>([]);
  const [secondPlaceRankings, setSecondPlaceRankings] = useState<OverallRanking[]>([]);
  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<OverallRanking[]>([]);

  // Novos estados para funcionalidades avançadas
  const [showEliminationRankings, setShowEliminationRankings] = useState(false);
  const [showWinnerCeremony, setShowWinnerCeremony] = useState(false);
  const [showBracketEditor, setShowBracketEditor] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<OverallRanking | null>(null);
  const [finalMatch, setFinalMatch] = useState<Match | null>(null);

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


  const handleGenerateFormedStructureWithConfig = async () => {
    console.log('🔧 [handleGenerateFormedStructureWithConfig] Called');
    console.log('🔧 [handleGenerateFormedStructureWithConfig] State:', {
      eventId,
      eventParticipantsLength: eventParticipants.length,
      currentEvent: currentEvent?.title,
      tournament: tournament ? { id: tournament.id, status: tournament.status } : null
    });
    
    if (!eventId || eventParticipants.length < 2) {
      console.warn('⚠️ [handleGenerateFormedStructureWithConfig] Not enough participants or no eventId');
      addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes/duplas para gerar a estrutura' });
      return;
    }
    if (!currentEvent) {
      console.error('❌ [handleGenerateFormedStructureWithConfig] No currentEvent');
      return;
    }

    try {
      setGeneratingStructure(true);
      setShowGroupConfigModal(false);
      console.log('🔧 [handleGenerateFormedStructureWithConfig] Starting generation...');

      // 🔧 VERIFICAÇÃO: Se não existe torneio, criar automaticamente
      if (!tournament) {
        console.log('🔧 [handleGenerateFormedStructureWithConfig] No tournament found, creating automatically...');
        
        // Usar o serviço de eventos para criar o torneio automaticamente
        await EventsService.createTournamentForEvent(eventId);
        
        console.log('✅ [handleGenerateFormedStructureWithConfig] Tournament created automatically via EventsService');
        
        // Recarregar o torneio para atualizar o estado
        console.log('🔄 [handleGenerateFormedStructureWithConfig] Fetching tournament...');
        await fetchTournament(eventId);
        console.log('✅ [handleGenerateFormedStructureWithConfig] Tournament fetched');
      } else {
        console.log('✅ [handleGenerateFormedStructureWithConfig] Tournament already exists:', tournament.id);
      }

      // Se já existe um torneio com dados, confirmar se quer recriar
      const hasExistingData = tournament && (tournament.matches.length > 0 || (tournament as any).teams_data?.length > 0);
      console.log('🔍 [handleGenerateFormedStructureWithConfig] Has existing data:', hasExistingData);
      
      const forceReset = hasExistingData ? 
        window.confirm('Já existem dados no torneio. Deseja recriar a estrutura? Isso apagará todas as partidas e configurações existentes.') :
        true;
      
      console.log('🔧 [handleGenerateFormedStructureWithConfig] Force reset:', forceReset);
      
      if (hasExistingData && !forceReset) {
        console.log('🚫 [handleGenerateFormedStructureWithConfig] User cancelled reset');
        return;
      }
      
      // Use the service method that respects event team formation
      console.log('👥 [handleGenerateFormedStructureWithConfig] Forming teams...');
      const { teams } = TournamentService.formTeamsFromParticipants(
        eventParticipants,
        TeamFormationType.FORMED,
        { groupSize: traditionalGroupSize }
      );

      console.log('👥 [handleGenerateFormedStructureWithConfig] Teams formed:', teams.length);

      const options = {
        forceReset,
        groupSize: traditionalGroupSize,
        maxTeamsPerGroup: maxTeamsPerGroup,
        autoCalculateGroups: autoCalculateGroups
      };

      console.log('🎯 [handleGenerateFormedStructureWithConfig] Calling generateFormedStructure with options:', options);

      await generateFormedStructure(eventId, teams, options);

      console.log('✅ [handleGenerateFormedStructureWithConfig] generateFormedStructure completed');

      // Check if there was an error in the store
      const currentError = useTournamentStore.getState().error;
      if (currentError) {
        console.error('❌ [handleGenerateFormedStructureWithConfig] Store error:', currentError);
        addNotification({ type: 'error', message: currentError });
      } else {
        console.log('🎉 [handleGenerateFormedStructureWithConfig] Success!');
        addNotification({ 
          type: 'success', 
          message: 'Estrutura do torneio com duplas formadas gerada com sucesso!' 
        });
        setSkipTeamIds([]);
      }
    } catch (err) {
      console.error('❌ [handleGenerateFormedStructureWithConfig] Error:', err);
      let errorMessage = 'Erro ao gerar estrutura';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      addNotification({ type: 'error', message: errorMessage });
    } finally {
      console.log('🏁 [handleGenerateFormedStructureWithConfig] Finished');
      setGeneratingStructure(false);
    }
  };

  // Add a new function to handle group stage completion check
  

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
    if (!eventId || !currentEvent) {
      addNotification({ type: 'error', message: 'Dados do evento não disponíveis.' });
      return;
    }

    try {
      setResetInProgress(true);
      
      // Passo 1: Verificar se há participantes suficientes
      if (eventParticipants.length < 2) {
        addNotification({ 
          type: 'warning', 
          message: 'É necessário pelo menos 2 participantes para reiniciar o torneio com nova estrutura.' 
        });
        return;
      }
      
      // Passo 2: Reiniciar o torneio (limpa dados existentes)
      await TournamentService.restartTournament(eventId);
      
      addNotification({
        type: 'info',
        message: 'Torneio reiniciado. Gerando nova estrutura automaticamente...'
      });
      
      // Passo 3: Aguardar um pouco para garantir que o reset foi processado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Passo 4: Determinar o tipo de formação de equipes baseado no evento
      const teamFormationType = currentEvent.team_formation === 'FORMED' 
        ? TeamFormationType.FORMED 
        : TeamFormationType.RANDOM;
      
      // Passo 5: Formar equipes baseado na configuração do evento
      const { teams } = TournamentService.formTeamsFromParticipants(
        eventParticipants,
        teamFormationType,
        { groupSize: 3 }
      );
      
      console.log(`Reiniciando torneio com ${teams.length} equipes formadas (tipo: ${teamFormationType})`);
      
      // Passo 6: Gerar nova estrutura automaticamente
      if (teamFormationType === TeamFormationType.FORMED) {
        await generateFormedStructure(eventId, teams, { forceReset: true });
      } else {
        await generateRandomStructure(eventId, teams, { forceReset: true });
      }
      
      // Passo 7: Verificar se houve erro na geração
      const currentError = useTournamentStore.getState().error;
      if (currentError) {
        addNotification({ 
          type: 'error', 
          message: `Torneio reiniciado, mas houve erro na geração: ${currentError}` 
        });
      } else {
        addNotification({
          type: 'success',
          message: `Torneio reiniciado e nova estrutura gerada com sucesso! ${teams.length} equipes organizadas em grupos.`
        });
      }
      
      // Passo 8: Recarregar o torneio para exibir os novos dados
      await fetchTournament(eventId);
      
    } catch (error) {
      console.error('Erro ao reiniciar e regenerar torneio:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao reiniciar o torneio. Tente novamente.'
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
    
    // Also calculate rankings by placement using local function
    const rankings: Record<number, GroupRanking[]> = {};
    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      if (completedMatches.length === groupMatches.length) {
        rankings[groupNum] = calculateGroupRankings(completedMatches);
      }
    }
    
    setCalculatedRankings(rankings);
    
    // ✅ CORREÇÃO: Usar função local para calcular rankings por posição
    const calculatePlacementRankingsLocal = (
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
    
    setFirstPlaceRankings(calculatePlacementRankingsLocal(rankings, 1));
    setSecondPlaceRankings(calculatePlacementRankingsLocal(rankings, 2));
    setThirdPlaceRankings(calculatePlacementRankingsLocal(rankings, 3));
    
    setShowOverallRankingsModal(true);
  };

  

  const isDataLoading = loadingTournament || loadingParticipants || loadingCourts || loadingEventDetails;

  // Acessar metadados do elimination_bracket para exibir informações de BYE
  const eliminationBracketMetadata = useMemo(() => {
    if (!tournament) return null;
    
    // Cast para incluir elimination_bracket do banco
    const tournamentWithBracket = tournament as any;
    if (!tournamentWithBracket.elimination_bracket) return null;
    
    // Se elimination_bracket for apenas um array de matches (formato antigo)
    if (Array.isArray(tournamentWithBracket.elimination_bracket)) {
      return null;
    }
    
    // Se elimination_bracket tem metadados completos (novo formato)
    return tournamentWithBracket.elimination_bracket as {
      matches: Match[];
      bracketCase: string;
      description: string;
      teamsWithByes: Array<{
        teamId: string[];
        rank: number;
        groupNumber: number;
      }>;
      totalTeams: number;
      generatedAt: string;
    };
  }, [tournament]);

  const matchesByStage = useMemo(() => {
    if (!tournament?.matches) return { GROUP: {}, ELIMINATION: [] };
    
    // CORREÇÃO: Detectar e remover duplicatas antes de processar
    const seenIds = new Set<string>();
    const uniqueMatches = tournament.matches.filter(match => {
      if (seenIds.has(match.id)) {
        console.warn(`🚨 DUPLICATE MATCH DETECTED IN TOURNAMENT: ${match.id}`);
        return false;
      }
      seenIds.add(match.id);
      return true;
    });
    
    if (uniqueMatches.length !== tournament.matches.length) {
      console.error(`⚠️ FOUND ${tournament.matches.length - uniqueMatches.length} DUPLICATE MATCHES IN TOURNAMENT`);
    }
    
    return uniqueMatches.reduce((acc, match) => {
      if (match.stage === 'GROUP') {
        const groupNum = match.groupNumber ?? 0;
        if (!acc.GROUP[groupNum]) acc.GROUP[groupNum] = [];
        acc.GROUP[groupNum].push(match);
      } else {
        acc.ELIMINATION.push(match);
      }
      return acc;
    }, { GROUP: {} as Record<number, Match[]>, ELIMINATION: [] as Match[] });
  }, [tournament]);
  const groupNumbers = Object.keys(matchesByStage.GROUP).map(Number).sort((a, b) => a - b);
  const eliminationMatches = matchesByStage.ELIMINATION;
  const currentStage = useMemo<'NONE' | 'GROUP' | 'ELIMINATION'>(() => {
    if (!tournament || !tournament.matches || tournament.matches.length === 0) return 'NONE';
    const hasGroup = tournament.matches.some(m => m.stage === 'GROUP');
    const hasElim = tournament.matches.some(m => m.stage === 'ELIMINATION');
    console.log('Tournament stages detection:', { hasGroup, hasElim, matches: tournament.matches.length, status: tournament.status });
    
    // Priorizar eliminação se existir
    if (hasElim) {
      console.log('Current stage: ELIMINATION');
      return 'ELIMINATION';
    }
    if (hasGroup) {
      console.log('Current stage: GROUP');
      return 'GROUP';
    }
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
          // Verificar se todas as partidas do grupo estão completas OU têm scores válidos
          return matchesByStage.GROUP[num].every(match => 
            match.completed === true || 
            (match.score1 !== null && match.score1 !== undefined && 
             match.score2 !== null && match.score2 !== undefined)
          );
      });
      
      return result;
  }, [groupNumbers, matchesByStage.GROUP, tournament]);

  // useEffect para detectar vencedor do torneio
  useEffect(() => {
    if (eliminationMatches.length > 0 && overallGroupRankings.length > 0) {
      const finalMatchResult = eliminationMatches.find(match => 
        match.stage === 'FINALS' && match.completed
      );
      
      if (finalMatchResult && finalMatchResult.winnerId) {
        const winnerTeamId = finalMatchResult.winnerId === 'team1' ? finalMatchResult.team1 : finalMatchResult.team2;
        if (winnerTeamId) {
          const winner = overallGroupRankings.find(team => 
            team.teamId.join('|') === winnerTeamId.join('|')
          );
          
          if (winner && !tournamentWinner) {
            setTournamentWinner(winner);
            setFinalMatch(finalMatchResult);
            setShowWinnerCeremony(true);
          }
        }
      }
    }
  }, [eliminationMatches, overallGroupRankings, tournamentWinner, setTournamentWinner, setFinalMatch, setShowWinnerCeremony]);

  // Add this function to handle bilateral bracket visualization
  

  // Enhance the useMemo to support bilateral bracket visualization
  const { eliminationRoundsArray, bracketLines, matchPositionMap } = useMemo(() => {    
    // Create a map to organize matches by side and round
    const leftSideMatches: Record<number, Match[]> = {};
    const rightSideMatches: Record<number, Match[]> = {};
    const finalMatches: Record<number, Match[]> = {};
    
    // Define global bracket height variable that can be used across functions
    const maxMatchesInAnyRound = Math.max(
      ...Object.values(leftSideMatches).map(matches => matches.length),
      ...Object.values(rightSideMatches).map(matches => matches.length),
      1
    );
    const globalTotalBracketHeight = Math.max(700, maxMatchesInAnyRound * matchHeight * 1.8);
    
    // Function to determine which side a match belongs to
    const determineSide = (match: Match): 'left' | 'right' | 'final' => {
      // Try to get metadata from match to determine side
      const metadata = (match as any).metadata;
      
      if (metadata?.side === 'left') return 'left';
      if (metadata?.side === 'right') return 'right';
      
      // If no metadata, determine by position or use heuristics
      // For the final match (usually single match in the highest round)
      if (match.round === Math.max(...eliminationMatches.map(m => m.round || 0))) {
        return 'final';
      }
      
      // For other matches, default to left side
      return 'left';
    };
    
    // Organize matches by side and round
    eliminationMatches.forEach(match => {
      if (!match.round) return;
      
      const side = determineSide(match);
      
      if (side === 'left') {
        if (!leftSideMatches[match.round]) leftSideMatches[match.round] = [];
        leftSideMatches[match.round].push(match);
      } else if (side === 'right') {
        if (!rightSideMatches[match.round]) rightSideMatches[match.round] = [];
        rightSideMatches[match.round].push(match);
      } else {
        if (!finalMatches[match.round]) finalMatches[match.round] = [];
        finalMatches[match.round].push(match);
      }
    });
  // Function to position matches with proper horizontal center alignment and vertical spacing
    const positionSideMatches = (sideMatches: Record<number, Match[]>, startX: number, direction: 1 | -1): Map<string, { x: number, y: number, width: number, height: number }> => {
      const posMap = new Map<string, { x: number, y: number, width: number, height: number }>();
      const rounds = Object.keys(sideMatches).map(Number).sort((a, b) => a - b);
      
      // Find the maximum number of matches in the initial round (usually the highest)
      const initialRoundIndex = direction === 1 ? 0 : rounds.length - 1;
      const initialRound = rounds[initialRoundIndex];
      const maxInitialMatches = sideMatches[initialRound]?.length || 1;
      
      // Calculate ideal bracket height based on number of teams
      const bracketHeight = Math.max(700, maxInitialMatches * matchHeight * 3);
      
      // Update the global bracket height variable
      const globalTotalBracketHeight = bracketHeight;
      rounds.forEach((round, idx) => {
        // Adjust roundIndex based on direction (left-to-right or right-to-left)
        const roundIndex = direction === 1 ? idx : rounds.length - 1 - idx;
        const matches = sideMatches[round].sort((a, b) => (a.position || 0) - (b.position || 0));
        const matchesInRound = matches.length;
        
        // Calculate X position (horizontal position)
        const roundX = startX + (direction * roundIndex * horizontalGap);
        
        if (roundIndex === 0 || (direction === -1 && idx === 0)) {
          // For the first round, distribute matches evenly along the center line
          
          // Calculate total height needed for this round
          const totalRoundHeight = matchesInRound * matchHeight + (matchesInRound - 1) * verticalPadding;
          
          // Calculate start Y to center the matches
          const startY = (bracketHeight - totalRoundHeight) / 2;
          
          // Position each match with proper spacing
          matches.forEach((match, matchIndex) => {
            const y = startY + matchIndex * (matchHeight + verticalPadding);
            
            posMap.set(match.id, {
              x: roundX,
              y: y,
              width: matchWidth,
              height: matchHeight
            });
          });
        } else {
          // For subsequent rounds, place each match at the vertical midpoint of its child matches
          matches.forEach((match) => {
            const prevRound = direction === 1 ? round - 1 : round + 1;
            const position = match.position || 0;
            
            // Find the two child matches from the previous round
            const childPosition1 = position * 2 - 1;
            const childPosition2 = position * 2;
            
            const childMatches = sideMatches[prevRound]?.filter(
              m => (m.position === childPosition1 || m.position === childPosition2)
            ) || [];
            
            if (childMatches.length > 0) {
              // Calculate the vertical midpoint between child matches
              let minY = Number.MAX_VALUE;
              let maxY = Number.MIN_VALUE;
              
              childMatches.forEach(childMatch => {
                const childPos = posMap.get(childMatch.id);
                if (childPos) {
                  const childCenterY = childPos.y + (childPos.height / 2);
                  minY = Math.min(minY, childCenterY);
                  maxY = Math.max(maxY, childCenterY);
                }
              });
              
              // Position at exact midpoint between children's centers
              const midpointY = (minY + maxY) / 2 - (matchHeight / 2);
              
              posMap.set(match.id, {
                x: roundX,
                y: midpointY,
                width: matchWidth,
                height: matchHeight
              });
            } else {
              // Fallback if child matches aren't found
              posMap.set(match.id, {
                x: roundX,
                y: (bracketHeight - matchHeight) / 2, // Center vertically
                width: matchWidth,
                height: matchHeight
              });
            }
          });
        }
      });
      
      return posMap;
    };
      // Position matches for each side with improved horizontal spacing
    const leftRounds = Object.keys(leftSideMatches).length || 0;
    const rightRounds = Object.keys(rightSideMatches).length || 0;
      // Calculate the total width needed for the bracket with additional padding
    const totalWidth = (leftRounds + rightRounds) * (matchWidth + horizontalGap) + matchWidth + horizontalGap; // Added extra padding
    
    // Calculate starting positions to center the bracket horizontally
    // Add extra padding to the left to push everything more to the right
    const leftStartX = Math.max(40, (totalWidth - (leftRounds * (matchWidth + horizontalGap) + rightRounds * (matchWidth + horizontalGap)) - matchWidth) / 2 + 40);
    const rightStartX = leftStartX + leftRounds * (matchWidth + horizontalGap) + horizontalGap;
    
    const leftPositionMap = positionSideMatches(leftSideMatches, leftStartX, 1);
    const rightPositionMap = positionSideMatches(rightSideMatches, rightStartX, -1);
    
    // Position final match(es) with improved calculation
    const finalPositionMap = new Map<string, { x: number, y: number, width: number, height: number }>();
    const finalMatches_flat = Object.values(finalMatches).flat(); // Define here to prevent redeclaration
    
    // Find semifinal matches from both sides to better position the final match
    // Get the rightmost matches from the left bracket
    const leftSideLastMatchPositions = leftPositionMap.size > 0 
      ? Array.from(leftPositionMap.values())
          .sort((a, b) => b.x - a.x) // Sort by x descending to find rightmost matches
          .slice(0, Math.min(4, leftPositionMap.size)) // Take more matches for better positioning
      : [];
      
    // Get the leftmost matches from the right bracket
    const rightSideLastMatchPositions = rightPositionMap.size > 0 
      ? Array.from(rightPositionMap.values())
          .sort((a, b) => a.x - b.x) // Sort by x ascending to find leftmost matches
          .slice(0, Math.min(4, rightPositionMap.size)) // Take more matches for better positioning
      : [];
      // Calculate the middle point between the furthest left and right rounds 
    const leftX = leftPositionMap.size > 0 
      ? Math.max(...Array.from(leftPositionMap.values()).map(pos => pos.x + pos.width))
      : leftStartX;
    
    const rightX = rightPositionMap.size > 0 
      ? Math.min(...Array.from(rightPositionMap.values()).map(pos => pos.x))
      : rightStartX;
    
    // Calculate final match position precisely in the middle
    const centerX = (leftX + rightX) / 2 - (matchWidth / 2);
      // Calculate an appropriate Y position based on the semifinal positions if they exist
    const calculateCenterY = () => {
      // Calculate the optimal vertical position for the final match
      if (leftSideLastMatchPositions.length > 0 && rightSideLastMatchPositions.length > 0) {
        // Find the mid points of the last matches from both sides
        const leftMidPoints = leftSideLastMatchPositions.map(pos => pos.y + pos.height / 2);
        const rightMidPoints = rightSideLastMatchPositions.map(pos => pos.y + pos.height / 2);
        
        // Find the average midpoint of each side
        const avgLeftMidY = leftMidPoints.reduce((sum, y) => sum + y, 0) / leftMidPoints.length;
        const avgRightMidY = rightMidPoints.reduce((sum, y) => sum + y, 0) / rightMidPoints.length;
        
        // Use the average of both sides' average midpoints
        return ((avgLeftMidY + avgRightMidY) / 2) - matchHeight / 2;
      } else if (leftSideLastMatchPositions.length > 0) {
        // Use average of left side positions
        const avgY = leftSideLastMatchPositions.reduce(
          (sum, pos) => sum + pos.y + pos.height / 2, 0
        ) / leftSideLastMatchPositions.length;
        return avgY - matchHeight / 2;
      } else if (rightSideLastMatchPositions.length > 0) {
        // Use average of right side positions
        const avgY = rightSideLastMatchPositions.reduce(
          (sum, pos) => sum + pos.y + pos.height / 2, 0
        ) / rightSideLastMatchPositions.length;
        return avgY - matchHeight / 2;
      } else {
        // Default center position with vertical padding
        return globalCenterY - matchHeight / 2;
      }
    };
    
    const centerY = calculateCenterY();
    
    finalMatches_flat.forEach((match, index) => {
      // If there's more than one final match, space them vertically with improved spacing
      const verticalGap = 100; // Increased vertical spacing between final matches
      const offset = finalMatches_flat.length > 1 
        ? (index - (finalMatches_flat.length - 1) / 2) * (matchHeight + verticalGap)
        : 0;
      
      finalPositionMap.set(match.id, {
        x: centerX,
        y: centerY + offset,
        width: matchWidth,
        height: matchHeight
      });
    });
    
    // Combine all position maps
    const combinedPositionMap = new Map([
      ...leftPositionMap,
      ...rightPositionMap,
      ...finalPositionMap
    ]);
      // Generate lines between matches
    const lines: Array<{ key: string; path: string; fromMatch: string; toMatch: string; highlight: boolean }> = [];
      // Function to generate lines for one side with optimized right-angle connections
    const generateSideLines = (sideMatches: Record<number, Match[]>, positionMap: Map<string, any>, direction: 1 | -1) => {
      const rounds = Object.keys(sideMatches).map(Number).sort((a, b) => a - b);
      
      for (let i = 0; i < rounds.length - 1; i++) {
        const currentRound = rounds[i];
        const nextRound = rounds[i + 1];
        
        sideMatches[currentRound].forEach(match => {
          if (!match) return;
          
          // Find the next match this feeds into
          const nextMatchPosition = Math.ceil((match.position || 0) / 2);
          const nextMatch = sideMatches[nextRound]?.find(m => m.position === nextMatchPosition);
          
          if (!nextMatch) return;
          
          const fromPos = positionMap.get(match.id);
          const toPos = positionMap.get(nextMatch.id);
          
          if (!fromPos || !toPos) return;
            // Calculate line coordinates for improved right-angled bracket lines
          let startX, startY, endX, endY, midpointX;
          
          if (direction === 1) {
            // Left side bracket - lines go right
            startX = fromPos.x + fromPos.width;
            startY = fromPos.y + (fromPos.height / 2);
            endX = toPos.x;
            endY = toPos.y + (toPos.height / 2);
            // Calculate midpoint with greater distance for clearer visual separation
            midpointX = startX + (endX - startX) / 2;
          } else {
            // Right side bracket - lines go left
            startX = fromPos.x;
            startY = fromPos.y + (fromPos.height / 2);
            endX = toPos.x + toPos.width;
            endY = toPos.y + (toPos.height / 2);
            // Calculate midpoint with greater distance for clearer visual separation
            midpointX = startX - (startX - endX) / 2;
          }
          
          // Create a cleaner path with precise right angles
          const path = `M ${startX} ${startY} L ${midpointX} ${startY} L ${midpointX} ${endY} L ${endX} ${endY}`;
          
          // Determine if this line should be highlighted based on match progression
          let highlight = false;
          
          if (match.completed && match.winnerId) {
            // Get the IDs of the winning team members
            const winningTeamIds = match.winnerId === 'team1' ? match.team1 : match.team2;
            
            // Check if any players from the winning team are in the next match's team1 or team2
            if (winningTeamIds && winningTeamIds.length > 0) {
              const nextMatchTeam1 = nextMatch.team1 || [];
              const nextMatchTeam2 = nextMatch.team2 || [];
              
              // Check for any overlap between winning team and next match teams
              const isInNextMatch = winningTeamIds.some(id => 
                nextMatchTeam1.includes(id) || nextMatchTeam2.includes(id)
              );
              
              highlight = isInNextMatch;
            }
          }
          
          lines.push({
            key: `${match.id}-to-${nextMatch.id}`,
            path,
            fromMatch: match.id,
            toMatch: nextMatch.id,
            highlight
          });
        });
      }
    };
      // Generate lines for both sides
    generateSideLines(leftSideMatches, combinedPositionMap, 1);  // Left side with direction 1 (right)
    generateSideLines(rightSideMatches, combinedPositionMap, -1); // Right side with direction -1 (left)
    
    // Generate lines to the final match with improved drawing
    if (finalMatches_flat.length > 0) {
      // Find the last round from each side
      const lastLeftRound = Object.keys(leftSideMatches).length > 0 
        ? Math.max(...Object.keys(leftSideMatches).map(Number))
        : -1;
        
      const lastRightRound = Object.keys(rightSideMatches).length > 0 
        ? Math.max(...Object.keys(rightSideMatches).map(Number))
        : -1;
      
      // Find all semifinals from the left side
      const leftSemiFinals = lastLeftRound >= 0 
        ? leftSideMatches[lastLeftRound] || []
        : [];
        
      // Find all semifinals from the right side
      const rightSemiFinals = lastRightRound >= 0 
        ? rightSideMatches[lastRightRound] || []
        : [];
      
      // Connect each semifinal from the left side to the appropriate final match
      leftSemiFinals.forEach(leftSemiFinal => {
        // Find the final match this semifinal feeds into
        const finalMatch = findMatchByNextPosition(finalMatches_flat, leftSemiFinal);
        
        if (finalMatch) {
          const fromPos = combinedPositionMap.get(leftSemiFinal.id);
          const toPos = combinedPositionMap.get(finalMatch.id);
          
          if (fromPos && toPos) {            // Create optimized right angle lines for classic tournament bracket style
            const startX = fromPos.x + fromPos.width;
            const startY = fromPos.y + (fromPos.height / 2);
            const endX = toPos.x;
            const endY = toPos.y + (toPos.height / 2);
            
            // Midpoint for right angle connections
            const midpointX = startX + (endX - startX) / 2;
            
            const path = `M ${startX} ${startY} L ${midpointX} ${startY} L ${midpointX} ${endY} L ${endX} ${endY}`;
            
            // Check for highlight condition - if the winner of the semifinal is in the final match
            let highlight = false;
            if (leftSemiFinal.completed && leftSemiFinal.winnerId) {
              const winningTeamIds = leftSemiFinal.winnerId === 'team1' 
                ? leftSemiFinal.team1 
                : leftSemiFinal.team2;
                
              if (winningTeamIds && winningTeamIds.length > 0) {
                const finalTeam1 = finalMatch.team1 || [];
                const finalTeam2 = finalMatch.team2 || [];
                
                highlight = winningTeamIds.some(id => 
                  finalTeam1.includes(id) || finalTeam2.includes(id)
                );
              }
            }
            
            lines.push({
              key: `${leftSemiFinal.id}-to-final-${finalMatch.id}`,
              path,
              fromMatch: leftSemiFinal.id,
              toMatch: finalMatch.id,
              highlight
            });
          }
        }
      });
      
      // Connect each semifinal from the right side to the appropriate final match
      rightSemiFinals.forEach(rightSemiFinal => {
        // Find the final match this semifinal feeds into
        const finalMatch = findMatchByNextPosition(finalMatches_flat, rightSemiFinal);
        
        if (finalMatch) {
          const fromPos = combinedPositionMap.get(rightSemiFinal.id);
          const toPos = combinedPositionMap.get(finalMatch.id);
          
          if (fromPos && toPos) {            // Create optimized right-angle lines for the right side connections
            const startX = fromPos.x;
            const startY = fromPos.y + (fromPos.height / 2);
            const endX = toPos.x + toPos.width;
            const endY = toPos.y + (toPos.height / 2);
            
            // Midpoint for right angle connections from the right
            const midpointX = startX - (startX - endX) / 2;
            
            // Use tournament-style right angle connections for consistency
            const path = `M ${startX} ${startY} L ${midpointX} ${startY} L ${midpointX} ${endY} L ${endX} ${endY}`;
            
            // Check for highlight condition
            let highlight = false;
            if (rightSemiFinal.completed && rightSemiFinal.winnerId) {
              const winningTeamIds = rightSemiFinal.winnerId === 'team1' 
                ? rightSemiFinal.team1 
                : rightSemiFinal.team2;
                
              if (winningTeamIds && winningTeamIds.length > 0) {
                const finalTeam1 = finalMatch.team1 || [];
                const finalTeam2 = finalMatch.team2 || [];
                
                highlight = winningTeamIds.some(id => 
                  finalTeam1.includes(id) || finalTeam2.includes(id)
                );
              }
            }
            
            lines.push({
              key: `${rightSemiFinal.id}-to-final-${finalMatch.id}`,
              path,
              fromMatch: rightSemiFinal.id,
              toMatch: finalMatch.id,
              highlight
            });
          }
        }
      });
    }
    
    // Helper function to find which final match a semifinal feeds into
    function findMatchByNextPosition(finalMatches: Match[], semifinalMatch: Match): Match | undefined {
      // For simple cases, just return the first final match
      if (finalMatches.length === 1) return finalMatches[0];
      
      // Otherwise try to find a match with the correct team members
      if (semifinalMatch.completed && semifinalMatch.winnerId) {
        const winningTeamIds = semifinalMatch.winnerId === 'team1' 
          ? semifinalMatch.team1 
          : semifinalMatch.team2;
          
        if (winningTeamIds && winningTeamIds.length > 0) {
          return finalMatches.find(finalMatch => {
            const finalTeam1 = finalMatch.team1 || [];
            const finalTeam2 = finalMatch.team2 || [];
            
            return winningTeamIds.some(id => 
              finalTeam1.includes(id) || finalTeam2.includes(id)
            );
          });
        }
      }
      
      // If no match found, return first final match as default
      return finalMatches[0];
    }
    
    // Prepare the array of rounds for the component
    const roundsArray: { round: number; matches: Match[] }[] = [];
    
    // Add left side rounds
    Object.entries(leftSideMatches).forEach(([round, matches]) => {
      roundsArray.push({
        round: parseInt(round),
        matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
      });
    });
    
    // Add final round
    Object.entries(finalMatches).forEach(([round, matches]) => {
      roundsArray.push({
        round: parseInt(round),
        matches
      });
    });
    // Add right side rounds
    Object.entries(rightSideMatches).forEach(([round, matches]) => {
      roundsArray.push({
        round: parseInt(round) + 100, // Add offset to distinguish from left side rounds
        matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
      });
    });
    
    // Sort rounds by round number
    roundsArray.sort((a, b) => a.round - b.round);
    
    return {
      eliminationRoundsArray: roundsArray,
      bracketLines: lines,
      matchPositionMap: combinedPositionMap
    };
    
  }, [eliminationMatches, matchWidth, matchHeight, horizontalGap]);

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
    
    // Add more generous padding to ensure everything is visible
    return {
      width: `${maxX + 200}px`,
      height: `${maxY + 150}px`,
    };
  };

  // Adicione esta função antes do return statement em seu componente
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

  // Function to open transmission screen
  const openTransmission = () => {
    const transmissionUrl = `${window.location.origin}/transmission/${eventId}`;
    window.open(transmissionUrl, '_blank', 'fullscreen=yes,scrollbars=yes,resizable=yes');
  };

  if (isDataLoading) {
     return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
        <span className="ml-2 text-gray-500">Carregando dados do chaveamento...</span>
      </div>
    );
  }

  // ✅ Verificar se deve mostrar o torneio (mesmo sem partidas após restart)
  if (tournament && (tournament.matches.length > 0 || tournament.status === 'CREATED')) {
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

        {/* BYE Information Section */}
        {eliminationBracketMetadata && eliminationBracketMetadata.teamsWithByes.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <UserX size={20} className="text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-green-800">
                BYE Automático Aplicado
              </h3>
            </div>
            <div className="space-y-2">
              <p className="text-green-700 text-sm">
                <strong>Caso:</strong> {eliminationBracketMetadata.description}
              </p>
              <div className="text-green-700 text-sm">
                <strong>Duplas com BYE ({eliminationBracketMetadata.teamsWithByes.length}):</strong>
                <div className="mt-2 flex flex-wrap gap-2">
                  {eliminationBracketMetadata.teamsWithByes.map((team, index) => (
                    <span 
                      key={`${team.teamId.join('-')}-${index}`}
                      className="inline-flex items-center px-2 py-1 bg-green-100 border border-green-300 rounded text-xs"
                    >
                      <Trophy size={12} className="mr-1" />
                      {team.rank}º - G{team.groupNumber} - {getTeamDisplayName(team.teamId)}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-green-600 text-xs mt-2">
                Gerado em: {new Date(eliminationBracketMetadata.generatedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        {/* Tournament content */}
        {currentStage === 'GROUP' && (
          <div className="space-y-6">
            {/* Group stage content */}
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-brand-blue">Fase de Grupos</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShowRankings}>
                  <List size={16} className="mr-1" />
                  Ver Rankings dos Grupos                </Button>

                {eliminationMatches.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEliminationRankings(true)}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      <List className="w-4 h-4 mr-2" />
                      Status Eliminatória
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBracketEditor(true)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar Chaveamento
                    </Button>
                  </>
                )}

                {isGroupStageComplete && (
                  <>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>                            
                            <Button 
                              variant={isGroupStageComplete ? "primary" : "outline"}
                              size="sm"
                              disabled={!isGroupStageComplete}
                              // Modificar o handler do botão "Gerar Fase Eliminatória" para considerar duplas eliminadas
                              // No TournamentBracket.tsx - substituir o handler do botão
                              // SUBSTITUIR o onClick atual por este:
                              onClick={async () => {
                                if (tournament && isGroupStageComplete) {
                                  try {
                                    addNotification({
                                      type: 'info',
                                      message: 'Analisando estrutura do torneio e aplicando BYE automático inteligente...'
                                    });

                                    // 1. Calcular ranking geral final
                                    let allCompletedGroupMatches: Match[] = [];
                                    for (const groupNum in matchesByStage.GROUP) {
                                      allCompletedGroupMatches = allCompletedGroupMatches.concat(
                                        matchesByStage.GROUP[groupNum].filter(match => match.completed)
                                      );
                                    }
                                    let overallRankingsData = calculateOverallGroupStageRankings(allCompletedGroupMatches);

                                    // 2. Filtrar duplas eliminadas por desempate
                                    const eliminatedTeamsFromStorage = JSON.parse(
                                      localStorage.getItem(`eliminated_teams_${tournament.id}`) || '[]'
                                    ) as string[];

                                    overallRankingsData = overallRankingsData.filter(
                                      team => !eliminatedTeamsFromStorage.includes(team.teamId.join('|'))
                                    );

                                    console.log(`🎾 Duplas classificadas para eliminatória: ${overallRankingsData.length}`);
                                    console.log(`📊 Dados das duplas:`, overallRankingsData);

                                    // 3. ⭐ USAR NOVA LÓGICA DE BYE INTELIGENTE
                                    console.log(`🔍 Iniciando geração de bracket com BYE inteligente...`);
                                    
                                    console.log(`🔨 Iniciando geração do bracket...`);
                                    let eliminationData;
                                    try {
                                      eliminationData = generateEliminationBracketWithSmartBye(overallRankingsData);
                                      console.log(`✅ Bracket gerado:`, eliminationData);
                                      console.log(`📈 Total de matches: ${eliminationData.matches.length}`);
                                      console.log(`📋 Metadata:`, eliminationData.metadata);
                                    } catch (bracketError) {
                                      console.error(`❌ Erro na geração do bracket:`, bracketError);
                                      throw bracketError;
                                    }

                                    // 4. Criar metadados do bracket incluindo informações de BYE
                                    const bracketMetadata = {
                                      matches: eliminationData.matches,
                                      metadata: eliminationData.metadata,
                                      qualifiedTeams: overallRankingsData.map(team => ({
                                        teamId: team.teamId,
                                        rank: team.rank,
                                        groupNumber: team.groupNumber
                                      })),
                                      generatedAt: new Date().toISOString()
                                    };

                                    // 5. Salvar no banco com metadados completos
                                    const allMatches = [...tournament.matches, ...eliminationData.matches];
                                    const uniqueAllMatches = Array.from(new Map(allMatches.map(m => [m.id, m])).values());
                                    const { error: updateError } = await supabase
                                      .from('tournaments')
                                      .update({
                                        elimination_bracket: bracketMetadata,
                                        matches_data: uniqueAllMatches,
                                        stage: 'ELIMINATION',
                                        status: 'STARTED',
                                        updated_at: new Date().toISOString()
                                      })
                                      .eq('id', tournament.id);

                                    if (updateError) {
                                      throw updateError;
                                    }

                                    // 5. Atualizar estado
                                    await fetchTournament(tournament.eventId);
                                    addNotification({
                                      type: 'success',
                                      message: 'Fase eliminatória gerada com BYE automático inteligente aplicado!'
                                    });
                                  } catch (error) {
                                    addNotification({
                                      type: 'error',
                                      message: `Erro ao gerar fase eliminatória: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                                    });
                                  }
                                }
                              }}
                              className={isGroupStageComplete ? "hover:bg-green-700" : ""}
                            >
                              <Trophy size={16} className="mr-1" />
                              Gerar Fase Eliminatória
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isGroupStageComplete 
                            ? "Todas as partidas dos grupos foram concluídas. Clique para gerar a fase eliminatória." 
                            : "Todas as partidas da fase de grupos devem ser concluídas antes de gerar a fase eliminatória."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
            </div>

            {/* ✅ Verificar se há partidas para mostrar */}
            {tournament.matches.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="flex flex-col items-center">
                  <Trophy className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Torneio Criado com Sucesso!</h3>
                  <p className="text-gray-500 mb-6">
                    O torneio foi criado e está pronto. As partidas serão geradas automaticamente quando você gerar a estrutura novamente.
                  </p>
                  <div className="flex gap-4">
                    <Button 
                      onClick={async () => {
                        console.log('🔥 [DEBUG] Botão Gerar Partidas clicado na seção torneio criado!');
                        
                        if (eventId && tournament) {
                          try {
                            setGeneratingStructure(true);
                            
                            // Check team formation type and call appropriate function
                            if (currentEvent?.team_formation === 'FORMED') {
                              console.log('🔥 [DEBUG] Gerando partidas para duplas formadas...');
                              
                              // Use the service method to form teams from participants
                              const { teams } = TournamentService.formTeamsFromParticipants(
                                eventParticipants,
                                TeamFormationType.FORMED,
                                { groupSize: 3 }
                              );

                              await generateFormedStructure(eventId, teams, {
                                groupSize: 3,
                                maxTeamsPerGroup: 4,
                                autoCalculateGroups: false,
                                forceReset: true
                              });
                            } else {
                              console.log('🔥 [DEBUG] Gerando partidas para duplas aleatórias...');
                              await generateRandomStructure(eventId, eventParticipants as any[], {
                                groupSize: 3,
                                maxTeamsPerGroup: 4,
                                autoCalculateGroups: false,
                                forceReset: true
                              });
                            }
                            
                            console.log('🔥 [DEBUG] Partidas geradas com sucesso!');
                            addNotification({
                              type: 'success',
                              message: 'Partidas geradas com sucesso!'
                            });
                          } catch (error) {
                            console.error('🔥 [DEBUG] Erro ao gerar partidas:', error);
                            addNotification({
                              type: 'error',
                              message: `Erro ao gerar partidas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                            });
                          } finally {
                            setGeneratingStructure(false);
                          }
                        }
                      }}
                      disabled={generatingStructure}
                      className="flex items-center"
                    >
                      {generatingStructure ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trophy className="h-4 w-4 mr-2" />
                      )}
                      Gerar Partidas
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Groups display */
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
                              <span className="font-bold flex-shrink-0">
                                {match.score1 !== null ? match.score1 : '-'}
                              </span>
                            </div>
                            
                            <div className={`flex justify-between items-center ${
                              match.winnerId === match.team2?.[0] ? 'font-bold text-green-600' : ''
                            }`}>
                              <span className="truncate mr-2">
                                {getTeamDisplayName(match.team2)}
                              </span>
                              <span className="font-bold flex-shrink-0">
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
            )}
          </div>
        )}

        {/* Elimination stage content */}
        {currentStage === 'ELIMINATION' && eliminationRoundsArray.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-brand-blue">Fase Eliminatória</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShowRankings}>
                  <List size={16} className="mr-1" />
                  Ver Rankings da Eliminatória
                </Button>
  
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openTransmission}
                  className="flex items-center"
                >
                  <Monitor size={16} className="mr-1" />
                  Transmitir
                </Button>
              </div>
            </div>

            {/* Render elimination rounds as tables */}
            <div className="space-y-6">
              {eliminationRoundsArray.map((roundData, roundIndex) => (
                <div key={roundData.round} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-blue-800">
                      {getRoundName(roundIndex, eliminationRoundsArray.length)}
                    </h4>
                    <p className="text-sm text-blue-600 mt-1">
                      {roundData.matches.length} partida{roundData.matches.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Partida</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time A</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Placar</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time B</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Quadra</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Horário</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {roundData.matches.map((match, matchIndex) => {
                          const court = match.courtId ? courts.find(c => c.id === match.courtId) : null;
                          const scheduledTime = match.scheduledTime 
                            ? new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            : undefined;
                          const team1Name = getTeamDisplayName(match.team1);
                          const team2Name = getTeamDisplayName(match.team2);
                          const isWinner1 = match.winnerId && match.team1?.includes(match.winnerId);
                          const isWinner2 = match.winnerId && match.team2?.includes(match.winnerId);
                          
                          return (
                            <tr key={match.id} className={`hover:bg-gray-50 transition-colors ${selectedMatch?.id === match.id ? 'bg-blue-50 border-blue-200' : ''}`}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                #{matchIndex + 1}
                              </td>
                              <td className={`px-4 py-3 text-sm ${isWinner1 ? 'font-bold text-green-700 bg-green-50' : 'text-gray-900'}`}>
                                {team1Name}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={`text-sm font-bold ${isWinner1 ? 'text-green-700' : 'text-gray-600'}`}>
                                    {match.score1 ?? '-'}
                                  </span>
                                  <span className="text-gray-400">x</span>
                                  <span className={`text-sm font-bold ${isWinner2 ? 'text-green-700' : 'text-gray-600'}`}>
                                    {match.score2 ?? '-'}
                                  </span>
                                </div>
                              </td>
                              <td className={`px-4 py-3 text-sm ${isWinner2 ? 'font-bold text-green-700 bg-green-50' : 'text-gray-900'}`}>
                                {team2Name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {court?.name || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {scheduledTime || '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {match.completed ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle size={12} className="mr-1" />
                                    Concluída
                                  </span>
                                ) : (match.team1 && match.team2) ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <Calendar size={12} className="mr-1" />
                                    Agendada
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    <AlertCircle size={12} className="mr-1" />
                                    Aguardando
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMatchClick(match)}
                                  className="text-xs"
                                >
                                  {match.completed ? 'Editar' : (match.team1 && match.team2) ? 'Resultado' : 'Agendar'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
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
        )}        {/* Group rankings modal using the enhanced TournamentRankings component */}
        <Modal
          isOpen={showGroupRankingsModal}
          onClose={() => setShowGroupRankingsModal(false)}
          title="Rankings do Torneio"
          size="large"
        >
          <div className="max-h-[80vh] overflow-y-auto p-1">
            {tournament && (
              <TournamentRankings 
                tournamentId={tournament.id} 
                playerNameMap={
                  Array.from(participantMap.entries()).reduce((map, [id, name]) => {
                    map[id] = name;
                    return map;
                  }, {} as Record<string, string>)
                }
                eliminationMatches={eliminationMatches}
              />
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
          <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-200 text-sm">
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

        {/* Modal de Configuração de Grupos */}
        <Modal
          isOpen={showGroupConfigModal}
          onClose={() => setShowGroupConfigModal(false)}
          title={`Configuração de Grupos - ${groupConfigMode === 'formed' ? 'Duplas Formadas' : 'Duplas Aleatórias'}`}
        >
          <div className="p-1">
            <div className="space-y-6">
              {/* Informações do evento */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Informações do Evento</h4>
                <div className="text-sm text-blue-700">
                  <p><strong>Participantes:</strong> {eventParticipants.length}</p>
                  <p><strong>Duplas estimadas:</strong> {Math.floor(eventParticipants.length / 2)}</p>
                </div>
              </div>

              {/* Modo de configuração de grupos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Modo de Distribuição dos Grupos
                </label>
                <div className="space-y-3">
                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="groupMode"
                      checked={!autoCalculateGroups}
                      onChange={() => setAutoCalculateGroups(false)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium">Tradicional (Recomendado)</div>
                      <div className="text-sm text-gray-600">
                        Grupos otimizados para Beach Tennis (preferencialmente 3-4 duplas por grupo)
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="radio"
                      name="groupMode"
                      checked={autoCalculateGroups}
                      onChange={() => setAutoCalculateGroups(true)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium">Automático por Limite</div>
                      <div className="text-sm text-gray-600">
                        Calcula automaticamente o número de grupos baseado no máximo de duplas por grupo
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Configurações específicas */}
              <div className="grid grid-cols-1 gap-4">
                {autoCalculateGroups ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Máximo de Duplas por Grupo
                    </label>
                    <select
                      value={maxTeamsPerGroup}
                      onChange={(e) => setMaxTeamsPerGroup(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    >
                      <option value={3}>3 duplas (máximo 3 confrontos por dupla)</option>
                      <option value={4}>4 duplas (máximo 3 confrontos por dupla)</option>
                      <option value={5}>5 duplas (máximo 4 confrontos por dupla)</option>
                      <option value={6}>6 duplas (máximo 5 confrontos por dupla)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      O sistema criará automaticamente {Math.ceil(Math.floor(eventParticipants.length / 2) / maxTeamsPerGroup)} grupos
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tamanho Preferencial dos Grupos
                    </label>
                    <select
                      value={traditionalGroupSize}
                      onChange={(e) => setTraditionalGroupSize(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    >
                      <option value={3}>3 duplas por grupo (recomendado)</option>
                      <option value={4}>4 duplas por grupo</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      O sistema otimizará a distribuição para reduzir grupos com 2 ou 5+ duplas
                    </p>
                  </div>
                )}
              </div>

              {/* Preview dos grupos */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Preview da Distribuição</h4>
                <div className="text-sm text-gray-600">
                  {autoCalculateGroups ? (
                    <>
                      <p><strong>Grupos previstos:</strong> {Math.ceil(Math.floor(eventParticipants.length / 2) / maxTeamsPerGroup)}</p>
                      <p><strong>Duplas por grupo:</strong> aproximadamente {Math.floor(Math.floor(eventParticipants.length / 2) / Math.ceil(Math.floor(eventParticipants.length / 2) / maxTeamsPerGroup))} - {maxTeamsPerGroup}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Grupos previstos:</strong> {Math.ceil(Math.floor(eventParticipants.length / 2) / traditionalGroupSize)}</p>
                      <p><strong>Tamanho preferencial:</strong> {traditionalGroupSize} duplas por grupo</p>
                    </>
                  )}
                  <p><strong>Total de duplas:</strong> {Math.floor(eventParticipants.length / 2)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowGroupConfigModal(false)}
                disabled={generatingStructure}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  console.log('🔥 [DEBUG] Botão Gerar Torneio clicado no modal!', { groupConfigMode });
                  console.log('🔥 [DEBUG] Modal button clicked - about to call handler');
                  if (groupConfigMode === 'formed') {
                    console.log('🔥 [DEBUG] Calling handleGenerateFormedStructureWithConfig...');
                    handleGenerateFormedStructureWithConfig();
                  } else {
                    console.log('🔥 [DEBUG] Calling handleGenerateFormedStructureWithConfig...');
                    handleGenerateFormedStructureWithConfig();
                  }
                }}
                loading={generatingStructure}
                disabled={eventParticipants.length < 2}
              >
                Gerar Torneio
              </Button>
            </div>
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
                <h4 className="font-medium">Reiniciar e Regenerar Torneio Automaticamente</h4>
                <p className="text-sm">
                  Esta ação irá:
                  <br />• Apagar todos os dados de partidas, grupos e chaveamento atuais
                  <br />• Automaticamente formar novas duplas com os participantes atuais
                  <br />• Gerar novos grupos e confrontos
                  <br />• Criar uma estrutura de torneio completamente nova
                  {eventParticipants.length >= 2 
                    ? ` (${eventParticipants.length} participantes encontrados)`
                    : ' ⚠️ Necessário pelo menos 2 participantes'}
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
                disabled={eventParticipants.length < 2}
              >
                {resetInProgress 
                  ? 'Reiniciando e Regenerando...' 
                  : 'Sim, Reiniciar e Regenerar'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Novos modais para funcionalidades avançadas */}
        {showEliminationRankings && (
          <Modal
            isOpen={showEliminationRankings}
            onClose={() => setShowEliminationRankings(false)}
            title="Status da Eliminatória"
            size="large"
          >
            <EliminationRankings
              qualifiedTeams={overallGroupRankings}
              eliminationMatches={eliminationMatches}
              playerNameMap={
                Array.from(participantMap.entries()).reduce((map, [id, name]) => {
                  map[id] = name;
                  return map;
                }, {} as Record<string, string>)
              }
            />
          </Modal>
        )}

        {showWinnerCeremony && tournamentWinner && (
          <TournamentWinner
            winner={tournamentWinner}
            finalMatch={finalMatch}
            playerNameMap={
              Array.from(participantMap.entries()).reduce((map, [id, name]) => {
                map[id] = name;
                return map;
              }, {} as Record<string, string>)
            }
            onClose={() => setShowWinnerCeremony(false)}
          />
        )}

        {showBracketEditor && (
          <BracketEditor
            matches={eliminationMatches}
            availableTeams={overallGroupRankings}
            playerNameMap={
              Array.from(participantMap.entries()).reduce((map, [id, name]) => {
                map[id] = name;
                return map;
              }, {} as Record<string, string>)
            }
            onSave={(updatedMatches) => {
              // Implementar salvamento das alterações
              console.log('Saving bracket changes:', updatedMatches);
              setShowBracketEditor(false);
            }}
            onClose={() => setShowBracketEditor(false)}
          />
        )}
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
              onClick={async () => {
                console.log('🔥 [DEBUG] Botão Gerar Grupos clicado - gerando diretamente!');
                
                if (!eventId || eventParticipants.length < 2) {
                  addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes para gerar a estrutura' });
                  return;
                }
                
                try {
                  setGeneratingStructure(true);
                  
                  // Verificar se o torneio existe, se não existir, criar
                  const { data: existingTournament, error } = await supabase
                    .from('tournaments')
                    .select('id')
                    .eq('event_id', eventId)
                    .maybeSingle();
                  
                  if (error) {
                    console.error('Error checking tournament:', error);
                  }
                  
                  if (!existingTournament) {
                    console.log('🔧 [DEBUG] Creating tournament for event:', eventId);
                    await EventsService.createTournamentForEvent(eventId);
                    console.log('✅ [DEBUG] Tournament created successfully');
                  }
                  
                  // Gerar estrutura diretamente com configuração padrão
                  const { teams } = TournamentService.formTeamsFromParticipants(
                    eventParticipants,
                    TeamFormationType.FORMED,
                    { groupSize: 3 }
                  );

                  const options = {
                    forceReset: true,
                    groupSize: 3,
                    maxTeamsPerGroup: 4,
                    autoCalculateGroups: false
                  };

                  console.log('🎯 [DEBUG] Calling generateFormedStructure with teams:', teams.length);
                  await generateFormedStructure(eventId, teams, options);

                  // Check if there was an error in the store
                  const currentError = useTournamentStore.getState().error;
                  if (currentError) {
                    console.error('❌ [DEBUG] Store error:', currentError);
                    addNotification({ type: 'error', message: currentError });
                  } else {
                    console.log('🎉 [DEBUG] Success!');
                    addNotification({ 
                      type: 'success', 
                      message: 'Grupos gerados com sucesso! Agora você pode inserir os resultados das partidas.' 
                    });
                  }
                } catch (err) {
                  console.error('❌ [DEBUG] Error:', err);
                  let errorMessage = 'Erro ao gerar grupos';
                  if (err instanceof Error) {
                    errorMessage = err.message;
                  }
                  addNotification({ type: 'error', message: errorMessage });
                } finally {
                  setGeneratingStructure(false);
                }
              }}
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
              onClick={async () => {
                console.log('🔥 [DEBUG] Botão Sorteio Aleatório clicado - gerando diretamente!');
                
                if (!eventId || eventParticipants.length < 2) {
                  addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes para gerar a estrutura aleatória' });
                  return;
                }
                
                try {
                  setGeneratingStructure(true);
                  
                  // Verificar se o torneio existe, se não existir, criar
                  const { data: existingTournament, error } = await supabase
                    .from('tournaments')
                    .select('id')
                    .eq('event_id', eventId)
                    .maybeSingle();
                  
                  if (error) {
                    console.error('Error checking tournament:', error);
                  }
                  
                  if (!existingTournament) {
                    console.log('🔧 [DEBUG] Creating tournament for event:', eventId);
                    await EventsService.createTournamentForEvent(eventId);
                    console.log('✅ [DEBUG] Tournament created successfully');
                  }
                  
                  // Gerar estrutura aleatória diretamente com configuração padrão
                  const { teams } = TournamentService.formTeamsFromParticipants(
                    eventParticipants,
                    TeamFormationType.RANDOM,
                    { groupSize: 3 }
                  );

                  const options = {
                    forceReset: true,
                    groupSize: 3,
                    maxTeamsPerGroup: 4,
                    autoCalculateGroups: false
                  };

                  console.log('🎯 [DEBUG] Calling generateRandomStructure with teams:', teams.length);
                  await generateRandomStructure(eventId, teams, options);

                  // Check if there was an error in the store
                  const currentError = useTournamentStore.getState().error;
                  if (currentError) {
                    console.error('❌ [DEBUG] Store error:', currentError);
                    addNotification({ type: 'error', message: currentError });
                  } else {
                    console.log('🎉 [DEBUG] Success!');
                    addNotification({ 
                      type: 'success', 
                      message: 'Grupos gerados com sorteio aleatório com sucesso! Agora você pode inserir os resultados das partidas.' 
                    });
                  }
                } catch (err) {
                  console.error('❌ [DEBUG] Error:', err);
                  let errorMessage = 'Erro ao gerar grupos';
                  if (err instanceof Error) {
                    errorMessage = err.message;
                  }
                  addNotification({ type: 'error', message: errorMessage });
                } finally {
                  setGeneratingStructure(false);
                }
              }}
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
              onClick={async () => {
                console.log('🔥 [DEBUG] Botão Gerar Grupos clicado na seção nenhum torneio criado!');
                console.log('🔥 [DEBUG] Gerando diretamente grupos e partidas...');
                
                try {
                  setGeneratingStructure(true);
                  
                  // Use the service method to form teams from participants
                  const { teams } = TournamentService.formTeamsFromParticipants(
                    eventParticipants,
                    TeamFormationType.FORMED,
                    { groupSize: 3 }
                  );

                  console.log('🔥 [DEBUG] Gerando estrutura para duplas formadas...');
                  await generateFormedStructure(eventId, teams, {
                    groupSize: 3,
                    maxTeamsPerGroup: 4,
                    autoCalculateGroups: false
                  });
                  console.log('🔥 [DEBUG] Estrutura gerada com sucesso!');
                  
                  addNotification({
                    type: 'success',
                    message: 'Grupos e partidas gerados com sucesso!'
                  });
                } catch (error) {
                  console.error('🔥 [DEBUG] Erro ao gerar grupos:', error);
                  addNotification({
                    type: 'error',
                    message: `Erro ao gerar grupos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                  });
                } finally {
                  setGeneratingStructure(false);
                }
              }}
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
              onClick={async () => {
                console.log('🔥 [DEBUG] Botão Sorteio Aleatório clicado na seção nenhum torneio criado!');
                console.log('🔥 [DEBUG] Gerando diretamente duplas aleatórias e partidas...');
                
                try {
                  setGeneratingStructure(true);
                  
                  console.log('🔥 [DEBUG] Gerando estrutura aleatória...');
                  await generateRandomStructure(eventId, eventParticipants as any[], {
                    groupSize: 3,
                    maxTeamsPerGroup: 4,
                    autoCalculateGroups: false
                  });
                  console.log('🔥 [DEBUG] Estrutura aleatória gerada com sucesso!');
                  
                  addNotification({
                    type: 'success',
                    message: 'Duplas aleatórias e partidas geradas com sucesso!'
                  });
                } catch (error) {
                  console.error('🔥 [DEBUG] Erro ao gerar duplas aleatórias:', error);
                  addNotification({
                    type: 'error',
                    message: `Erro ao gerar duplas aleatórias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
                  });
                } finally {
                  setGeneratingStructure(false);
                }
              }}
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
