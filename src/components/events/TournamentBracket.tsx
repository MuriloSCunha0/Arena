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
import TournamentRankings from '../TournamentRankings'; // Import the new component
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
  
  // Configurações otimizadas do chaveamento
  const matchWidth = 240;       // Largura de cada cartão de partida
  const matchHeight = 100;      // Altura de cada cartão de partida
  const horizontalGap = 280;    // Espaço horizontal entre as rodadas (aumentado para evitar sobreposição)
  const verticalPadding = 80;   // Espaço vertical para centralizar o chaveamento
  const globalCenterY = 500;    // Centro vertical para alinhamento do chaveamento

  // Function to calculate optimal zoom level for fullscreen
  const calculateOptimalZoom = (): number => {
    if (!bracketContainerRef.current) return 100;
    
    const container = bracketContainerRef.current;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    // Get the natural dimensions of the bracket
    const bracketWidth = container.scrollWidth;
    const bracketHeight = container.scrollHeight;
    
    // Calculate zoom to fit both width and height with some padding
    const widthZoom = (screenWidth * 0.95) / bracketWidth * 100;
    const heightZoom = (screenHeight * 0.90) / bracketHeight * 100;
    
    // Use the smaller zoom to ensure everything fits
    const optimalZoom = Math.min(widthZoom, heightZoom);
    
    // Ensure zoom is within reasonable bounds
    return Math.max(50, Math.min(150, Math.round(optimalZoom)));
  };  // Function to open tournament bracket in a new tab for displaying on a TV
  const openInNewTab = () => {
    try {
      if (!tournament || !tournament.id) {
        addNotification({ type: 'warning', message: 'Não há torneio para exibir' });
        return;
      }

      // Save current tournament state to sessionStorage for the new tab
      const bracketData = {
        tournamentId: tournament.id,
        eventId: tournament.eventId,
        timestamp: Date.now() // Use this to check for updates
      };
      sessionStorage.setItem('tvBracketData', JSON.stringify(bracketData));
      
      // Generate URL with tournament and event IDs
      const url = `/tournament/bracket/tv?tournamentId=${tournament.id}&eventId=${tournament.eventId}`;
      
      // Open in a new tab
      window.open(url, '_blank', 'noopener,noreferrer');
      addNotification({ 
        type: 'success', 
        message: 'Chaveamento aberto em nova aba para exibição em tela cheia' 
      });
    } catch (error) {
      console.error('Error opening tournament in new tab:', error);
      addNotification({ 
        type: 'error', 
        message: 'Não foi possível abrir o chaveamento em nova aba'
      });
    }
  };

  // Function to open complete event broadcast in a new tab
  const openEventBroadcast = () => {
    try {
      if (!eventId) {
        addNotification({ type: 'warning', message: 'Não há evento para transmitir' });
        return;
      }

      // Generate URL with event ID
      const url = `/event/tv?eventId=${eventId}`;
      
      // Open in a new tab
      window.open(url, '_blank', 'noopener,noreferrer');
      addNotification({ 
        type: 'success', 
        message: 'Transmissão do evento aberta em nova aba' 
      });
    } catch (error) {
      console.error('Error opening event broadcast:', error);
      addNotification({ 
        type: 'error', 
        message: 'Não foi possível abrir a transmissão do evento'
      });
    }
  };
  
  // Legacy fullscreen function (keeping in case we need it)
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // Enter full-screen mode
      if (bracketContainerRef.current?.parentElement?.requestFullscreen) {
        bracketContainerRef.current.parentElement.requestFullscreen()
          .then(() => {
            setIsFullScreen(true);
            // Calculate and apply optimal zoom for fullscreen
            setTimeout(() => {
              const optimalZoom = calculateOptimalZoom();
              setAutoZoomLevel(zoomLevel); // Save current zoom to restore later
              setZoomLevel(optimalZoom);
            }, 100); // Small delay to ensure fullscreen is applied
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
            // Restore previous zoom level
            if (autoZoomLevel !== null) {
              setZoomLevel(autoZoomLevel);
              setAutoZoomLevel(null);
            }
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
      
      // Use the service method to form teams from participants
      const { teams } = TournamentService.formTeamsFromParticipants(
        eventParticipants,
        TeamFormationType.RANDOM,
        { groupSize: 3 }
      );

      // Use generateRandomStructure with the formed teams - remove groupSize option
      await generateRandomStructure(eventId, teams, { 
        forceReset
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
  };  // Função melhorada para automaticamente avançar os times vencedores
  const handleSaveMatchResults = async (matchId: string, score1: number, score2: number) => {
    try {
      // Salvar resultados no banco de dados
      await updateMatchResults(matchId, score1, score2);
      
      // Determinar o time vencedor e os dados necessários para o avanço
      const winnerId = score1 > score2 ? 'team1' : 'team2';
      const currentMatch = tournament?.matches.find(m => m.id === matchId);
      
      if (!currentMatch || currentMatch.stage !== 'ELIMINATION') {
        addNotification({ type: 'success', message: 'Resultado atualizado!' });
        return; // Não é uma partida da fase eliminatória
      }
      
      // Dados do time vencedor
      const winnerTeamId = winnerId === 'team1' ? currentMatch.team1 : currentMatch.team2;
      
      // Encontrar a próxima partida
      const nextRound = currentMatch.round + 1;
      const nextPosition = Math.ceil((currentMatch.position || 0) / 2);
      
      const nextMatch = eliminationMatches.find(
        m => m.round === nextRound && m.position === nextPosition
      );
      
      if (nextMatch && winnerTeamId) {
        // Avançar o time vencedor para a próxima partida localmente
        const updatedTournament = {...tournament!};
        const updatedMatches = [...updatedTournament.matches];
        
        // Encontrar o índice da próxima partida
        const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
        
        if (nextMatchIndex !== -1) {
          // Determinar o slot (team1 ou team2) baseado na posição
          if (currentMatch.position % 2 === 1) {
            // Posição ímpar vai para team1
            updatedMatches[nextMatchIndex] = {
              ...updatedMatches[nextMatchIndex],
              team1: winnerTeamId
            };
          } else {
            // Posição par vai para team2
            updatedMatches[nextMatchIndex] = {
              ...updatedMatches[nextMatchIndex],
              team2: winnerTeamId
            };
          }
          
          // Atualizar o estado do torneio local sem chamar a API
          useTournamentStore.setState({
            tournament: {
              ...updatedTournament,
              matches: updatedMatches
            }
          });
            // Adicionar efeito visual para destacar o avanço
          setTimeout(() => {            
            if (nextMatch?.id && matchCardRefs.current?.[nextMatch.id]) {
              // Adicionar classe para animar o avanço do vencedor
              matchCardRefs.current[nextMatch.id]?.classList.add('winner-advance-animation');
              
              // Remover a animação após 2 segundos
              setTimeout(() => {
                if (matchCardRefs.current?.[nextMatch.id]) {
                  matchCardRefs.current[nextMatch.id]?.classList.remove('winner-advance-animation');
                }
              }, 2000);
            }
          }, 300);
          
          addNotification({ 
            type: 'success', 
            message: `Resultado atualizado! ${winnerTeamId ? 'Time vencedor avançou automaticamente.' : ''}` 
          });
        } else {
          addNotification({ type: 'success', message: 'Resultado atualizado!' });
        }
      } else {
        addNotification({ type: 'success', message: 'Resultado atualizado!' });
      }
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
      addNotification({ type: 'warning', message: 'Todas as partidas de fase de grupos devem estar concluídas.' });
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
  }, [tournament]);
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

  // Add this function to handle bilateral bracket visualization
  const handleGenerateBilateralBracket = async () => {
    if (!tournament) return;
    
    try {
      // Check if group stage is complete
      if (!isGroupStageComplete) {
        const confirmIncomplete = window.confirm("Algumas partidas da fase de grupos ainda não foram concluídas. Deseja gerar o chaveamento mesmo assim? Isso pode resultar em um chaveamento incompleto.");
        if (!confirmIncomplete) return;
      }
      
      // Show loading indicator
      setGeneratingStructure(true);
      
      // Use the bilateral bracket generation
      await generateEliminationBracket(tournament.id);
      
      addNotification({
        type: 'success',
        message: 'Chaveamento eliminatório bilateral gerado com sucesso!'
      });
    } catch (err) {
      console.error('Error generating bilateral bracket:', err);
      addNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao gerar chaveamento eliminatório bilateral'
      });
    } finally {
      setGeneratingStructure(false);
    }
  };

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

            <Button 
              variant="outline"
              onClick={openEventBroadcast}
              className="flex items-center"
            >
              <Maximize2 size={16} className="mr-2" />
              Transmissão TV
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
                  Ver Rankings dos Grupos                </Button>
                {isGroupStageComplete && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleShowOverallRankings}>
                      <Award size={16} className="mr-1" />
                      Ranking Geral
                    </Button>                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>                            <Button 
                              variant={isGroupStageComplete ? "primary" : "outline"}
                              size="sm"
                              disabled={!isGroupStageComplete}
                              onClick={() => {
                                if (tournament && isGroupStageComplete) {
                                  generateEliminationBracket(tournament.id);
                                  addNotification({
                                    type: 'success',
                                    message: 'Fase eliminatória gerada com sucesso!'
                                  });
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
          </div>
        )}

        {/* Elimination stage content */}
        {currentStage === 'ELIMINATION' && eliminationRoundsArray.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-brand-blue">Chaveamento Eliminatório</h3>
              <div className="flex items-center gap-4">                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInNewTab}
                  className="flex items-center"
                >                  <Maximize2 size={16} className="mr-1" />
                  Exibir na TV
                </Button>
                  <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Zoom:</label>
                  <button 
                    className="text-gray-600 hover:text-brand-blue p-1 rounded-md hover:bg-gray-100"
                    onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                    title="Diminuir zoom"
                  >
                    <MinusCircle size={16} />
                  </button>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="10"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(Number(e.target.value))}
                    className="w-20"
                  />
                  <button 
                    className="text-gray-600 hover:text-brand-blue p-1 rounded-md hover:bg-gray-100"
                    onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                    title="Aumentar zoom"
                  >
                    <PlusCircle size={16} />
                  </button>
                  <span className="text-sm text-gray-600 ml-1 min-w-[40px]">{zoomLevel}%</span>
                </div>
              </div>
            </div>
              {/* Bracket visualization */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
              {/* Headers for rounds */}              <div 
                id="bracket-headers-container" 
                className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 px-4 py-3 overflow-x-auto"
                style={{ width: getHeaderContainerWidth() }}
              >
                <div className="flex" style={{ minWidth: getHeaderContainerWidth() }}>                  {eliminationRoundsArray.map((roundData, index) => (
                    <div 
                      key={roundData.round}
                      className="flex-shrink-0 text-center font-medium text-brand-blue"
                      style={{ 
                        width: `${matchWidth}px`,
                        marginRight: index < eliminationRoundsArray.length - 1 ? `${horizontalGap}px` : '0',
                        marginLeft: index === 0 ? '40px' : '0' // Add left margin to the first header to match bracket position
                      }}
                    >
                      <div className="p-1 rounded-lg bg-white/70 border border-blue-100 shadow-sm">
                        {getRoundName(index, eliminationRoundsArray.length)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Bracket container */}              <div 
                ref={bracketContainerRef}
                className="relative overflow-auto p-6 bg-gradient-to-b from-white to-slate-50"
                style={{ 
                  minHeight: '500px',
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
                  >                    <defs>
                      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                        <feOffset dx="1" dy="1" result="offsetblur" />
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.4" />
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      
                      {/* Add gradient for highlighted paths */}
                      <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                      </linearGradient>
                    </defs>                    {bracketLines.map((line) => (                      <path
                        key={line.key}
                        d={line.path}
                        stroke={line.highlight ? "url(#highlightGradient)" : "#d1d5db"}
                        strokeWidth={line.highlight ? "2.5" : "1.5"}
                        fill="none"
                        className={line.highlight ? "animate-pulse" : ""}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={line.highlight ? "url(#softShadow)" : ""}
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
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.08)",
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
