import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, Wifi, WifiOff, Monitor, SkipForward, Play, Pause } from 'lucide-react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useParticipantsStore } from '../../store/participantsStore';
import { useCourtsStore } from '../../store/courtsStore';
import { useEventsStore } from '../../store/eventsStore';
import { Match } from '../../types';
import './TournamentTransmission.css';

interface TournamentTransmissionProps {
  eventId?: string;
}

export const TournamentTransmission: React.FC<TournamentTransmissionProps> = ({ eventId: propEventId }) => {
  const { eventId: paramEventId } = useParams<{ eventId: string }>();
  const eventId = propEventId || paramEventId;

  const {
    tournament,
    loading: loadingTournament,
    fetchTournament,
  } = useTournamentStore();

  const { eventParticipants, fetchParticipantsByEvent } = useParticipantsStore();
  const { courts, fetchCourts } = useCourtsStore();
  const { currentEvent, getByIdWithOrganizer } = useEventsStore();

  // Estados para controle de slides da fase de grupos
  const [currentGroupSlide, setCurrentGroupSlide] = useState(0);
  const [isGroupSlideAutoPlaying, setIsGroupSlideAutoPlaying] = useState(true);
  const [groupSlideInterval, setGroupSlideInterval] = useState<NodeJS.Timeout | null>(null);
  const [showGroupOverview, setShowGroupOverview] = useState(false); // Para mostrar visão geral

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      try {
        await Promise.all([
          getByIdWithOrganizer(eventId),
          fetchTournament(eventId),
          fetchParticipantsByEvent(eventId),
          fetchCourts()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados da transmissão:', error);
      }
    };

    // Carregar dados inicialmente
    fetchData();

    // Configurar auto-refresh
    const interval = setInterval(fetchData, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [eventId, getByIdWithOrganizer, fetchTournament, fetchParticipantsByEvent, fetchCourts]);

  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    eventParticipants.forEach((participant) => {
      map.set(participant.id, participant.name);
    });
    return map;
  }, [eventParticipants]);

  const getTeamDisplayName = (teamIds: string[] | null | undefined): string => {
    if (!teamIds || teamIds.length === 0) return 'TBD';
    
    if (teamIds.length === 1) {
      return participantMap.get(teamIds[0]) || 'Desconhecido';
    }
    
    const names = teamIds.map(id => participantMap.get(id) || 'Desconhecido');
    return names.join(' & ');
  };

  // Organizar partidas por estágio
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

  const eliminationMatches = matchesByStage.ELIMINATION;
  
  // Detectar estágio atual - priorizar eliminação quando houver partidas eliminatórias
  const currentStage = useMemo<'NONE' | 'GROUP' | 'ELIMINATION'>(() => {
    if (!tournament || !tournament.matches || tournament.matches.length === 0) return 'NONE';
    
    const hasGroup = tournament.matches.some(m => m.stage === 'GROUP');
    const hasElim = tournament.matches.some(m => m.stage === 'ELIMINATION');
    
    // Debug: Log current state
    console.log('Stage detection:', {
      hasGroup,
      hasElim,
      eliminationMatches: eliminationMatches.length,
      groupMatches: Object.keys(matchesByStage.GROUP).length,
      tournamentStatus: tournament.status
    });
    
    // Se tem eliminação, sempre priorizar eliminação
    if (hasElim && eliminationMatches.length > 0) {
      console.log('Switching to ELIMINATION stage');
      return 'ELIMINATION';
    }
    
    // Se tem grupos, mostrar grupos
    if (hasGroup) return 'GROUP';
    
    return 'NONE';
  }, [tournament?.matches, eliminationMatches, matchesByStage.GROUP, tournament?.status]);

  // Preparar dados dos grupos para slides
  const groupsArray = useMemo(() => {
    return Object.entries(matchesByStage.GROUP)
      .map(([groupNum, matches]) => ({
        groupNumber: parseInt(groupNum),
        matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
      }))
      .sort((a, b) => a.groupNumber - b.groupNumber);
  }, [matchesByStage.GROUP]);

  // Inicializar estados baseado no número de grupos
  useEffect(() => {
    if (groupsArray.length <= 1) {
      setShowGroupOverview(true);
      setCurrentGroupSlide(0);
    }
  }, [groupsArray.length]);

  // Efeito para controlar slides automáticos APENAS da fase de grupos
  useEffect(() => {
    if (currentStage === 'GROUP' && groupsArray.length > 1 && isGroupSlideAutoPlaying) {
      const interval = setInterval(() => {
        setCurrentGroupSlide(prev => {
          // Ciclo: overview -> grupo 1 -> grupo 2 -> ... -> overview
          const totalSlides = groupsArray.length + 1; // +1 para overview
          const nextSlide = (prev + 1) % totalSlides;
          setShowGroupOverview(nextSlide === 0);
          return nextSlide;
        });
      }, 8000); // 8 segundos por slide

      setGroupSlideInterval(interval);
      return () => clearInterval(interval);
    } else {
      // Limpar intervalo quando não estiver na fase de grupos ou não for autoplay
      if (groupSlideInterval) {
        clearInterval(groupSlideInterval);
        setGroupSlideInterval(null);
      }
    }
  }, [currentStage, groupsArray.length, isGroupSlideAutoPlaying, groupSlideInterval]);

  // Efeito para pausar slides quando mudar para fase eliminatória
  useEffect(() => {
    if (currentStage === 'ELIMINATION') {
      setIsGroupSlideAutoPlaying(false);
      if (groupSlideInterval) {
        clearInterval(groupSlideInterval);
        setGroupSlideInterval(null);
      }
    }
  }, [currentStage, groupSlideInterval]);

  // Organizar partidas eliminatórias por rodada
  const eliminationRoundsArray = useMemo(() => {
    if (eliminationMatches.length === 0) return [];

    const matchesByRound: Record<number, Match[]> = {};
    eliminationMatches.forEach(match => {
      if (!match.round) return;
      if (!matchesByRound[match.round]) matchesByRound[match.round] = [];
      matchesByRound[match.round].push(match);
    });

    const roundsArray: { round: number; matches: Match[] }[] = [];
    Object.entries(matchesByRound).forEach(([round, matches]) => {
      roundsArray.push({
        round: parseInt(round),
        matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
      });
    });
    
    return roundsArray.sort((a, b) => a.round - b.round);
  }, [eliminationMatches]);

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1) return 'Final';
    if (roundIndex === totalRounds - 2) return 'Semifinal';
    if (roundIndex === totalRounds - 3) return 'Quartas de Final';
    if (roundIndex === totalRounds - 4) return 'Oitavas de Final';
    return `${Math.pow(2, totalRounds - roundIndex)}ª de Final`;
  };

  // Funções de controle dos slides
  const toggleGroupAutoPlay = () => {
    setIsGroupSlideAutoPlaying(!isGroupSlideAutoPlaying);
  };

  const nextGroupSlide = () => {
    const totalSlides = groupsArray.length + 1;
    const nextSlide = (currentGroupSlide + 1) % totalSlides;
    setCurrentGroupSlide(nextSlide);
    setShowGroupOverview(nextSlide === 0);
  };

  const prevGroupSlide = () => {
    const totalSlides = groupsArray.length + 1;
    const prevSlide = (currentGroupSlide - 1 + totalSlides) % totalSlides;
    setCurrentGroupSlide(prevSlide);
    setShowGroupOverview(prevSlide === 0);
  };

  const goToGroupSlide = (slideIndex: number) => {
    setCurrentGroupSlide(slideIndex);
    setShowGroupOverview(slideIndex === 0);
  };

  if (loadingTournament) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold">Carregando Transmissão...</h2>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
        <div className="text-center text-white">
          <WifiOff size={64} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Torneio não encontrado</h2>
          <p className="text-red-200">Verifique se o evento está ativo</p>
        </div>
      </div>
    );
  }

  const MatchDisplayCard: React.FC<{ match: Match }> = ({ match }) => {
    const team1Name = getTeamDisplayName(match.team1);
    const team2Name = getTeamDisplayName(match.team2);
    const isCompleted = match.completed;
    const court = match.courtId ? courts.find(c => c.id === match.courtId) : null;
    
    return (
      <div className="match-card">
        <div className="space-y-2">
          {/* Time 1 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isCompleted && match.winnerId === 'team1' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-white/30'
              }`} />
              <span className={`team-name ${match.winnerId === 'team1' ? 'winner' : ''}`} title={team1Name}>
                {team1Name}
              </span>
            </div>
            <span className={`team-score ${match.winnerId === 'team1' ? 'winner' : ''} ml-2`}>
              {match.score1 ?? '-'}
            </span>
          </div>
          
          {/* Divisor */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          
          {/* Time 2 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isCompleted && match.winnerId === 'team2' ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-white/30'
              }`} />
              <span className={`team-name ${match.winnerId === 'team2' ? 'winner' : ''}`} title={team2Name}>
                {team2Name}
              </span>
            </div>
            <span className={`team-score ${match.winnerId === 'team2' ? 'winner' : ''} ml-2`}>
              {match.score2 ?? '-'}
            </span>
          </div>
        </div>
        
        {/* Informações adicionais */}
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="flex justify-between items-center text-xs">
            {/* Status */}
            <div>
              {isCompleted ? (
                <span className="status-badge status-completed">
                  ✓ FINALIZADA
                </span>
              ) : team1Name !== 'TBD' && team2Name !== 'TBD' ? (
                <span className="status-badge status-ongoing">
                  ⏳ EM ANDAMENTO
                </span>
              ) : (
                <span className="status-badge status-waiting">
                  ⏳ AGUARDANDO
                </span>
              )}
            </div>
            
            {/* Quadra */}
            {court && (
              <span className="text-xs text-white/60 truncate ml-2">
                {court.name}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Componente para ranking do grupo
  const GroupRanking: React.FC<{ groupMatches: Match[] }> = ({ groupMatches }) => {
    const teamStats = useMemo(() => {
      const teams = new Set<string>();
      groupMatches.forEach(match => {
        if (match.team1) teams.add(getTeamDisplayName(match.team1));
        if (match.team2) teams.add(getTeamDisplayName(match.team2));
      });
      
      return Array.from(teams).map(teamName => {
        let wins = 0;
        let games = 0;
        let gamesAgainst = 0;
        
        groupMatches.forEach(match => {
          const team1Name = getTeamDisplayName(match.team1);
          const team2Name = getTeamDisplayName(match.team2);
          
          if (match.completed && (team1Name === teamName || team2Name === teamName)) {
            if (team1Name === teamName) {
              games += match.score1 || 0;
              gamesAgainst += match.score2 || 0;
              if ((match.score1 || 0) > (match.score2 || 0)) wins++;
            } else {
              games += match.score2 || 0;
              gamesAgainst += match.score1 || 0;
              if ((match.score2 || 0) > (match.score1 || 0)) wins++;
            }
          }
        });
        
        return {
          name: teamName,
          wins,
          games,
          gamesAgainst,
          saldo: games - gamesAgainst
        };
      }).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.saldo - a.saldo;
      }).slice(0, 4);
    }, [groupMatches]);

    if (!groupMatches.some(m => m.completed)) return null;

    return (
      <div className="ranking-section">
        <h3 className="text-sm font-bold text-yellow-400 mb-2">Classificação</h3>
        <div className="space-y-1">
          {teamStats.map((team, index) => (
            <div key={team.name} className="ranking-row">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="ranking-position">{index + 1}°</span>
                <span className="ranking-name" title={team.name}>{team.name}</span>
              </div>
              <div className="ranking-stats">
                <span>{team.wins}V</span>
                <span>{team.saldo > 0 ? '+' : ''}{team.saldo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="tournament-transmission h-screen bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
      {/* Header da transmissão */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 p-6">
        <div className="flex items-center justify-between">            <div className="flex items-center space-x-4">
              <Trophy size={48} className="text-yellow-400" />
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {currentEvent?.title || 'Torneio'}
                </h1>
                <p className="text-blue-200 text-xl">
                  {currentStage === 'GROUP' ? (
                    showGroupOverview || groupsArray.length <= 1 ? 
                      'Fase de Grupos - Visão Geral' : 
                      `Fase de Grupos - Grupo ${groupsArray[currentGroupSlide - 1]?.groupNumber || 1}`
                  ) : currentStage === 'ELIMINATION' ? 'Chaveamento Eliminatório' : 'Aguardando início'}
                </p>
              </div>
            </div>            <div className="flex items-center space-x-3">
              {/* Controles de slide APENAS para fase de grupos */}
              {currentStage === 'GROUP' && groupsArray.length > 1 && (
                <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2">
                  <button
                    onClick={prevGroupSlide}
                    className="text-white hover:text-blue-200 transition-colors"
                    title="Slide anterior"
                  >
                    <SkipForward size={18} className="rotate-180" />
                  </button>
                  <button
                    onClick={toggleGroupAutoPlay}
                    className="text-white hover:text-blue-200 transition-colors"
                    title={isGroupSlideAutoPlaying ? "Pausar slideshow" : "Iniciar slideshow"}
                  >
                    {isGroupSlideAutoPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button
                    onClick={nextGroupSlide}
                    className="text-white hover:text-blue-200 transition-colors"
                    title="Próximo slide"
                  >
                    <SkipForward size={18} />
                  </button>
                  <div className="text-xs text-blue-200 ml-2">
                    {currentGroupSlide + 1}/{groupsArray.length + 1}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-green-400">
                <Wifi size={24} />
                <span className="text-lg font-medium">AO VIVO</span>
              </div>
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
            </div>
        </div>
      </div>

      {/* Conteúdo da transmissão */}
      <div className="tournament-transmission-content">
        {currentStage === 'ELIMINATION' && eliminationRoundsArray.length > 0 ? (
          <div className="max-w-full mx-auto">
            <div className="elimination-bracket-container">
              <div className="elimination-bracket">
                {eliminationRoundsArray.map((roundData, roundIndex) => (
                  <div key={roundData.round} className={`bracket-round bracket-round-${roundIndex + 1}`}>
                    {/* Título da rodada */}
                    <div className="bracket-round-title">
                      <h3 className={`round-title-text ${roundIndex === eliminationRoundsArray.length - 1 ? 'final-round' : ''}`}>
                        {getRoundName(roundIndex, eliminationRoundsArray.length)}
                        {roundIndex === eliminationRoundsArray.length - 1 && (
                          <div className="final-icon">🏆</div>
                        )}
                      </h3>
                    </div>
                    
                    {/* Partidas da rodada */}
                    <div className="bracket-matches">
                      {roundData.matches.map((match) => {
                        const team1Name = getTeamDisplayName(match.team1);
                        const team2Name = getTeamDisplayName(match.team2);
                        const isCompleted = match.completed;
                        
                        return (
                          <div key={match.id} className={`bracket-match ${isCompleted ? 'completed' : 'pending'}`}>
                            <div className="bracket-match-content">
                              {/* Time 1 */}
                              <div className={`bracket-team ${match.winnerId === 'team1' ? 'winner' : ''}`}>
                                <div className="team-info">
                                  <span className="team-name" title={team1Name}>
                                    {team1Name}
                                  </span>
                                  <span className="team-score">
                                    {match.score1 ?? '-'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Separador */}
                              <div className="match-separator"></div>
                              
                              {/* Time 2 */}
                              <div className={`bracket-team ${match.winnerId === 'team2' ? 'winner' : ''}`}>
                                <div className="team-info">
                                  <span className="team-name" title={team2Name}>
                                    {team2Name}
                                  </span>
                                  <span className="team-score">
                                    {match.score2 ?? '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status da partida */}
                            <div className="match-status">
                              {isCompleted ? (
                                <span className="status-completed">FINALIZADA</span>
                              ) : team1Name !== 'TBD' && team2Name !== 'TBD' ? (
                                <span className="status-ongoing">EM ANDAMENTO</span>
                              ) : (
                                <span className="status-pending">AGUARDANDO</span>
                              )}
                            </div>
                            
                            {/* Conector para próxima fase - apenas se não for a final */}
                            {roundIndex < eliminationRoundsArray.length - 1 && (
                              <div className="bracket-connector">
                                <div className="connector-line"></div>
                                <div className="connector-arrow">→</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : currentStage === 'GROUP' ? (
          <div className="max-w-full mx-auto">
            {groupsArray.length > 0 ? (
              <div className="group-transmission-container">
                {/* Indicadores de slide */}
                {groupsArray.length > 1 && (
                  <div className="slide-indicators">
                    <button
                      onClick={() => goToGroupSlide(0)}
                      className={`slide-indicator ${currentGroupSlide === 0 ? 'active' : ''}`}
                      title="Visão Geral"
                    >
                      ●
                    </button>
                    {groupsArray.map((group, index) => (
                      <button
                        key={group.groupNumber}
                        onClick={() => goToGroupSlide(index + 1)}
                        className={`slide-indicator ${currentGroupSlide === index + 1 ? 'active' : ''}`}
                        title={`Grupo ${group.groupNumber}`}
                      >
                        {group.groupNumber}
                      </button>
                    ))}
                  </div>
                )}

                {/* Conteúdo do slide */}
                <div className="slide-content">
                  {(showGroupOverview || groupsArray.length <= 1) ? (
                    /* Visão geral de todos os grupos */
                    <div className={`group-grid ${
                      groupsArray.length === 1 ? 'group-grid-1' :
                      groupsArray.length === 2 ? 'group-grid-2' :
                      groupsArray.length === 3 ? 'group-grid-3' :
                      groupsArray.length === 4 ? 'group-grid-4' :
                      'group-grid-many'
                    }`}>
                      {groupsArray.map((group) => (
                        <div key={group.groupNumber} className="space-y-3 min-w-0">
                          {/* Título do grupo */}
                          <div className="text-center">
                            <h2 className="text-lg font-bold text-yellow-400 bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20 shadow-lg">
                              Grupo {group.groupNumber}
                            </h2>
                          </div>
                          
                          {/* Partidas do grupo */}
                          <div className="space-y-2">
                            {group.matches.map(match => (
                              <MatchDisplayCard key={match.id} match={match} />
                            ))}
                          </div>

                          {/* Ranking do grupo */}
                          <GroupRanking groupMatches={group.matches} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Slide individual do grupo */
                    (() => {
                      const group = groupsArray[currentGroupSlide - 1];
                      return group ? (
                        <div className="single-group-slide">
                          {/* Título do grupo em destaque */}
                          <div className="text-center mb-8">
                            <h2 className="text-4xl font-bold text-yellow-400 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                              Grupo {group.groupNumber}
                            </h2>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                            {/* Coluna das partidas */}
                            <div className="space-y-4">
                              <h3 className="text-2xl font-bold text-white mb-4 text-center">Partidas</h3>
                              <div className="space-y-3">
                                {group.matches.map(match => (
                                  <MatchDisplayCard key={match.id} match={match} />
                                ))}
                              </div>
                            </div>
                            
                            {/* Coluna do ranking */}
                            <div className="space-y-4">
                              <h3 className="text-2xl font-bold text-white mb-4 text-center">Classificação</h3>
                              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg">
                                <GroupRanking groupMatches={group.matches} />
                                
                                {/* Estatísticas adicionais */}
                                <div className="mt-6 pt-4 border-t border-white/20">
                                  <h4 className="text-sm font-bold text-yellow-400 mb-3">Estatísticas</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-white">
                                        {group.matches.filter(m => m.completed).length}
                                      </div>
                                      <div className="text-blue-200">Jogos Finalizados</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-white">
                                        {group.matches.length - group.matches.filter(m => m.completed).length}
                                      </div>
                                      <div className="text-blue-200">Jogos Restantes</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <Trophy size={96} className="mx-auto mb-6 text-white/30" />
                <h2 className="text-3xl font-bold mb-4">Fase de Grupos em Andamento</h2>
                <p className="text-blue-200 text-xl">O chaveamento eliminatório será exibido quando a fase de grupos for concluída</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <Monitor size={96} className="mx-auto mb-6 text-white/30" />
            <h2 className="text-3xl font-bold mb-4">Aguardando Início do Torneio</h2>
            <p className="text-blue-200 text-xl">A transmissão começará quando o torneio for iniciado</p>
          </div>
        )}
      </div>

      {/* Footer da transmissão */}
      <div className="bg-black/20 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="flex justify-between items-center text-sm text-blue-200">
          <div className="flex items-center space-x-4">
            <span>
              {tournament.status === 'FINISHED' ? '🏆 Torneio Finalizado' : 
               tournament.status === 'STARTED' ? '▶️ Em Andamento' : 
               '📋 Aguardando'}
            </span>
            {tournament.status === 'FINISHED' && tournament.completedAt && (
              <span>
                Finalizado em {new Date(tournament.completedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Wifi size={16} />
            <span>Atualização automática a cada 10 segundos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentTransmission;
