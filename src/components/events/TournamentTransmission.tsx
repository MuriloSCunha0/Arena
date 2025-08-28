import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Match, Event, Participant } from '../../types';
import { calculateGroupRankings, isMatchCompleted } from '../../utils/rankingUtils';
import './TournamentTransmission.css';

interface TournamentData {
  id: string;
  title: string;
  status: string;
  matches: Match[];
  elimination_bracket?: Match[];
}

interface TeamRanking {
  teamId: string;
  teamName: string;
  players: string[];
  position: number;
  points: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  winRate: number;
  groupNumber?: number;
  isQualified?: boolean;
}

interface EliminationMatchDisplay {
  id: string;
  round: number;
  position: number;
  team1Name: string;
  team2Name: string;
  score1?: number;
  score2?: number;
  completed: boolean;
  winner?: string;
  isLive?: boolean;
}

type TournamentPhase = 'GROUP' | 'ELIMINATION' | 'COMPLETED';

interface TournamentTransmissionProps {
  eventId?: string;
}

const TournamentTransmission: React.FC<TournamentTransmissionProps> = ({ eventId: propEventId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const eventId = propEventId || paramId;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<TournamentPhase>('GROUP');
  const [eliminationMatches, setEliminationMatches] = useState<EliminationMatchDisplay[]>([]);

  // Detectar fase atual do torneio
  const detectTournamentPhase = (matches: Match[]): TournamentPhase => {
    console.log('🔍 Detectando fase do torneio:', { 
      matchesLength: matches?.length || 0, 
      matches: matches?.slice(0, 3) // Primeiras 3 partidas para debug
    });
    
    if (!matches || matches.length === 0) {
      console.log('📝 Fase detectada: GROUP (sem partidas)');
      return 'GROUP';
    }
    
    const hasEliminationMatches = matches.some(m => m.stage === 'ELIMINATION');
    console.log('🏆 Tem partidas eliminatórias?', hasEliminationMatches);
    
    // Verificar se há uma final completada
    const finalMatch = matches.find(m => 
      m.stage === 'ELIMINATION' && 
      m.round === Math.max(...matches.filter(match => match.stage === 'ELIMINATION').map(match => match.round || 0))
    );
    
    if (finalMatch && finalMatch.completed) {
      console.log('🏁 Fase detectada: COMPLETED (final concluída)');
      return 'COMPLETED';
    }
    
    if (hasEliminationMatches) {
      console.log('⚔️ Fase detectada: ELIMINATION');
      return 'ELIMINATION';
    }
    
    console.log('👥 Fase detectada: GROUP');
    return 'GROUP';
  };

  // Função para buscar participantes
  const fetchParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      return [];
    }
  };

  // Função para mapear dados do Supabase para o formato interno
  const mapSupabaseMatchesToInternal = (supabaseMatches: any[]): Match[] => {
    return supabaseMatches.map((match: any) => {
      // Corrigir a lógica de fase: se group_number existir e for > 0, é GROUP, senão ELIMINATION
      let stage: 'GROUP' | 'ELIMINATION' = 'ELIMINATION';
      if (typeof match.group_number !== 'undefined' && match.group_number !== null && match.group_number > 0) {
        stage = 'GROUP';
      }
      // Se existir campo phase, usar ele
      if (match.phase && (match.phase === 'GROUP' || match.phase === 'ELIMINATION')) {
        stage = match.phase;
      }

      // Corrigir score: se for null ou undefined, manter null, se for número, usar o número
      const score1 = (match.team1_score === null || typeof match.team1_score === 'undefined') ? null : Number(match.team1_score);
      const score2 = (match.team2_score === null || typeof match.team2_score === 'undefined') ? null : Number(match.team2_score);

  // completed é true se scores não forem null (ignora status)
  const completed = score1 !== null && score2 !== null;

      return {
        id: match.id,
        eventId: match.event_id,
        tournamentId: match.tournament_id,
        team1: match.team1_ids || [],
        team2: match.team2_ids || [],
        score1,
        score2,
        round: match.round_number || 0,
        position: match.match_number || 0,
        groupNumber: match.group_number || 0,
        stage,
        completed,
        winnerId: match.winner_team || null,
        scheduledTime: match.scheduled_at
      };
    });
  };

  // Função para buscar dados do torneio
  const fetchTournamentData = async () => {
    if (!eventId) {
      setError('ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      console.log('📡 Iniciando busca de dados do torneio para evento:', eventId);
      setLoading(true);
      setError(null);

      // Buscar evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ Erro ao buscar evento:', eventError);
        throw new Error(`Erro ao buscar evento: ${eventError.message}`);
      }

      console.log('✅ Evento encontrado:', eventData?.title || eventData?.name);
      setEvent(eventData);

      // Buscar torneio
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (tournamentError && tournamentError.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar torneio:', tournamentError);
        throw new Error(`Erro ao buscar torneio: ${tournamentError.message}`);
      }

      console.log('🏆 Torneio encontrado:', tournamentData ? 'Sim' : 'Não');

      // Buscar participantes
      const participantsData = await fetchParticipants(eventId);
      console.log('👥 Participantes encontrados:', participantsData.length);
      setParticipants(participantsData);

      // Buscar matches do campo matches_data do torneio, igual ao ranking
      if (tournamentData) {
        let matches: Match[] = [];
        if (tournamentData.matches_data && Array.isArray(tournamentData.matches_data)) {
          matches = tournamentData.matches_data;
          console.log('⚽ Partidas carregadas de matches_data:', matches.length);
        } else if (tournamentData.matches && Array.isArray(tournamentData.matches)) {
          matches = tournamentData.matches;
          console.log('⚽ Partidas carregadas de matches:', matches.length);
        } else {
          console.log('⚠️ Nenhum campo matches_data ou matches encontrado no torneio');
        }

        // Se existir elimination_bracket, use como fonte das eliminatórias
        let eliminationBracket: Match[] = [];
        if (tournamentData.elimination_bracket && Array.isArray(tournamentData.elimination_bracket)) {
          eliminationBracket = tournamentData.elimination_bracket;
          console.log('🏆 Bracket eliminatório carregado:', eliminationBracket.length);
        } else {
          eliminationBracket = matches.filter(m => m.stage === 'ELIMINATION');
        }

        setTournament({
          ...tournamentData,
          matches,
          elimination_bracket: eliminationBracket
        });

        // Detectar fase atual 
        const phase = detectTournamentPhase(matches);
        console.log('🎯 Fase atual do torneio:', phase);
        setCurrentPhase(phase);
      } else {
        console.log('⚠️ Nenhum torneio encontrado para este evento');
      }

    } catch (error) {
      console.error('💥 Erro geral ao carregar dados do torneio:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Função para renderizar o bracket eliminatório
  // Hook para calcular tamanhos adaptativos baseado no conteúdo
  const useAdaptiveBracketSizing = () => {
    const [sizing, setSizing] = useState({
      cardWidth: 280,
      cardHeight: 120,
      gap: 32,
      fontSize: 14,
      roundGap: 40
    });

    useEffect(() => {
      const calculateAdaptiveSizing = () => {
        if (!eliminationMatches.length) return;

        // Agrupar por rodadas para calcular dimensões
        const rounds: { [round: number]: any[] } = {};
        eliminationMatches.forEach(match => {
          if (!rounds[match.round]) rounds[match.round] = [];
          rounds[match.round].push(match);
        });

        const roundCount = Object.keys(rounds).length;
        const maxMatchesInRound = Math.max(...Object.values(rounds).map(r => r.length));
        
        // Obter dimensões da viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Reservar espaço para header e padding
        const availableWidth = viewportWidth - 100; // padding lateral
        const availableHeight = viewportHeight - 200; // header + padding
        
        // Calcular tamanhos adaptativos
        let cardWidth = Math.min(280, (availableWidth - (roundCount * 40)) / roundCount);
        let cardHeight = Math.min(120, (availableHeight - 80) / Math.max(maxMatchesInRound, 4));
        let gap = Math.max(8, Math.min(32, availableHeight / (maxMatchesInRound * 8)));
        let roundGap = Math.max(20, Math.min(40, availableWidth / (roundCount * 8)));
        let fontSize = Math.max(11, Math.min(14, cardWidth / 20));

        // Ajustes específicos para telas muito pequenas
        if (viewportWidth < 768) {
          cardWidth = Math.max(200, cardWidth * 0.8);
          cardHeight = Math.max(80, cardHeight * 0.8);
          gap = Math.max(4, gap * 0.6);
          roundGap = Math.max(16, roundGap * 0.7);
          fontSize = Math.max(10, fontSize * 0.9);
        }

        // Garantir que tudo caiba na tela
        const totalWidth = (cardWidth * roundCount) + (roundGap * (roundCount - 1));
        const totalHeight = (cardHeight * maxMatchesInRound) + (gap * (maxMatchesInRound - 1));

        if (totalWidth > availableWidth) {
          const scale = availableWidth / totalWidth;
          cardWidth *= scale;
          roundGap *= scale;
        }

        if (totalHeight > availableHeight) {
          const scale = availableHeight / totalHeight;
          cardHeight *= scale;
          gap *= scale;
        }

        setSizing({
          cardWidth: Math.floor(cardWidth),
          cardHeight: Math.floor(cardHeight),
          gap: Math.floor(gap),
          fontSize: Math.floor(fontSize),
          roundGap: Math.floor(roundGap)
        });
      };

      calculateAdaptiveSizing();
      
      // Recalcular quando a janela redimensionar
      const handleResize = () => {
        setTimeout(calculateAdaptiveSizing, 100); // debounce
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [eliminationMatches]);

    return sizing;
  };

  const adaptiveSizing = useAdaptiveBracketSizing();

  const renderEliminationBracket = () => {
    if (!eliminationMatches.length) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">Chaveamento não iniciado</p>
        </div>
      );
    }

    // Agrupar partidas por round
    const rounds: { [round: number]: EliminationMatchDisplay[] } = {};
    eliminationMatches.forEach(match => {
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      rounds[match.round].push(match);
    });

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    
    return (
      <div 
        className="bracket-container adaptive-bracket"
        style={{
          '--card-width': `${adaptiveSizing.cardWidth}px`,
          '--card-height': `${adaptiveSizing.cardHeight}px`,
          '--gap': `${adaptiveSizing.gap}px`,
          '--round-gap': `${adaptiveSizing.roundGap}px`,
          '--font-size': `${adaptiveSizing.fontSize}px`
        } as React.CSSProperties}
      >
        <div className="bracket-grid adaptive-grid">
          {roundNumbers.map(roundNum => (
            <div key={roundNum} className="bracket-round adaptive-round">
              <h3 className="round-title adaptive-title">
                {getRoundName(roundNum, roundNumbers.length)}
              </h3>
              <div className="matches-column adaptive-column">
                {rounds[roundNum].map(match => (
                  <div 
                    key={match.id} 
                    className={`bracket-match adaptive-match ${match.isLive ? 'live-match' : ''} ${match.completed ? 'completed-match' : ''}`}
                  >
                    <div className={`team adaptive-team ${match.winner === 'team1' ? 'winner' : ''}`}>
                      <span className="team-name adaptive-team-name" title={match.team1Name}>
                        {match.team1Name || 'A definir'}
                      </span>
                      {match.score1 !== undefined && (
                        <span className="score adaptive-score">{match.score1}</span>
                      )}
                    </div>
                    <div className="vs-separator adaptive-vs">vs</div>
                    <div className={`team adaptive-team ${match.winner === 'team2' ? 'winner' : ''}`}>
                      <span className="team-name adaptive-team-name" title={match.team2Name}>
                        {match.team2Name || 'A definir'}
                      </span>
                      {match.score2 !== undefined && (
                        <span className="score adaptive-score">{match.score2}</span>
                      )}
                    </div>
                    {match.isLive && (
                      <div className="live-indicator adaptive-live">
                        <div className="live-dot"></div>
                        <span className="live-text">AO VIVO</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Função para obter nome do round
  const getRoundName = (roundNum: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundNum;
    switch (roundsFromEnd) {
      case 0: return 'FINAL';
      case 1: return 'SEMIFINAL';
      case 2: return 'QUARTAS';
      case 3: return 'OITAVAS';
      default: return `${roundNum}ª FASE`;
    }
  };

  // Função para obter nome da dupla
  const getTeamDisplayName = (teamIds: string[] | string | null | undefined): string => {
    console.log('🏷️ getTeamDisplayName chamada:', { teamIds, participantsCount: participants.length });
    
    if (!teamIds) {
      console.log('❌ Sem teamIds - retornando "A definir"');
      return 'A definir';
    }
    
    if (typeof teamIds === 'string') {
      const participant = participants.find(p => p.id === teamIds);
      const result = participant?.name || 'Desconhecido';
      console.log('👤 String teamId:', { teamIds, found: !!participant, result });
      return result;
    }
    
    if (Array.isArray(teamIds)) {
      if (teamIds.length === 0) {
        console.log('📭 Array vazio - retornando "A definir"');
        return 'A definir';
      }
      
      const names = teamIds.map(id => {
        const participant = participants.find(p => p.id === id);
        const name = participant?.name || 'Desconhecido';
        console.log(`👥 Participant ID ${id}:`, { found: !!participant, name });
        return name;
      });
      
      const result = names.join(' & ');
      console.log('👫 Array result:', { teamIds, names, result });
      return result;
    }
    
    console.log('❓ Tipo desconhecido - retornando "A definir"');
    return 'A definir';
  };

  // Calcular rankings usando a mesma lógica do TournamentBracket
  const rankings = useMemo(() => {
    console.log('📊 Calculando rankings:', { 
      hasTournament: !!tournament, 
      hasMatches: !!tournament?.matches,
      matchesLength: tournament?.matches?.length || 0,
      participantsLength: participants.length,
      completedMatches: tournament?.matches?.filter(match => match.completed).length || 0
    });

    if (!tournament?.matches || participants.length === 0) {
      console.log('❌ Sem dados para calcular rankings');
      return [];
    }

  const completedMatches = tournament.matches.filter(isMatchCompleted);

    console.log('⚽ Partidas para processar:', completedMatches.length);

    if (completedMatches.length === 0) {
      console.log('⏳ Nenhuma partida finalizada ainda');
      return [];
    }

    // Usar a mesma lógica oficial do TournamentBracket
    const groupRankings = calculateGroupRankings(completedMatches, true); // true para usar regras Beach Tennis
    // Descobrir quantos classificam por grupo (padrão 2, mas pode ser customizado)
    const qualifiersPerGroup = 2; // TODO: tornar dinâmico se necessário
    let cutoffStats = null;
    if (groupRankings.length >= qualifiersPerGroup) {
      const cutoffTeam = groupRankings[qualifiersPerGroup - 1];
      cutoffStats = cutoffTeam?.stats;
    }
    const rankingsForDisplay = groupRankings.map((teamRanking, index) => {
      const position = teamRanking.position || (index + 1);
      let isQualified = false;
      if (position <= qualifiersPerGroup) {
        isQualified = true;
      } else if (cutoffStats) {
        // Comparar critérios de desempate explicitamente
        const isTied =
          teamRanking.stats.gameDifference === cutoffStats.gameDifference &&
          teamRanking.stats.gamesWon === cutoffStats.gamesWon &&
          teamRanking.stats.wins === cutoffStats.wins &&
          teamRanking.stats.matchesPlayed === cutoffStats.matchesPlayed;
        isQualified = isTied;
      }
      return {
        teamId: teamRanking.teamId.join('|'),
        teamName: getTeamDisplayName(teamRanking.teamId),
        players: teamRanking.teamId,
        position,
        points: teamRanking.stats.points,
        wins: teamRanking.stats.wins,
        losses: teamRanking.stats.losses,
        setsWon: teamRanking.stats.gamesWon,
        setsLost: teamRanking.stats.gamesLost,
        setsDiff: teamRanking.stats.gameDifference,
        winRate: teamRanking.stats.wins + teamRanking.stats.losses > 0 ?
          (teamRanking.stats.wins / (teamRanking.stats.wins + teamRanking.stats.losses)) * 100 : 0,
        groupNumber: teamRanking.groupNumber || 0,
        isQualified
      };
    });

    console.log('🏆 Rankings calculados:', rankingsForDisplay);
    return rankingsForDisplay;
  }, [tournament, participants]);

  useEffect(() => {
    fetchTournamentData();
  }, [eventId]);

  // Processar partidas eliminatórias quando participantes e torneio estão disponíveis
  useEffect(() => {
    if (tournament && participants.length > 0 && currentPhase === 'ELIMINATION') {
      console.log('🏆 Processando partidas eliminatórias...', { 
        eliminationBracketLength: tournament.elimination_bracket?.length || 0,
        participantsLength: participants.length 
      });
      
      const eliminationBracket = tournament.elimination_bracket || [];
      
      const elimMatches = eliminationBracket
        .map(match => {
          console.log('⚽ Processando match:', { 
            id: match.id, 
            team1: match.team1, 
            team2: match.team2,
            round: match.round 
          });
          
          return {
            id: match.id,
            round: match.round || 0,
            position: match.position || 0,
            team1Name: getTeamDisplayName(match.team1),
            team2Name: getTeamDisplayName(match.team2),
            score1: match.score1 || undefined,
            score2: match.score2 || undefined,
            completed: match.completed || false,
            winner: match.winnerId || undefined,
            isLive: Boolean(!match.completed && match.team1 && match.team2)
          };
        })
        .sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return a.position - b.position;
        });

      console.log('✅ Elimination matches processados:', elimMatches);
      setEliminationMatches(elimMatches);
    } else if (currentPhase !== 'ELIMINATION') {
      setEliminationMatches([]);
    }
  }, [tournament, participants, currentPhase]);

  useEffect(() => {
    if (!eventId) return;

    // Subscription para atualizações em tempo real
    const matchesSubscription = supabase
      .channel('tournament_matches')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchTournamentData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchesSubscription);
    };
  }, [eventId]);

  // Loading state
  if (loading) {
    console.log('🔄 Estado de carregamento ativo');
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Carregando Transmissão</h2>
            <p>Preparando dados do torneio...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.log('❌ Estado de erro:', error);
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="error-state">
            <Trophy size={96} className="error-icon" />
            <h2>Erro na Transmissão</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No event found
  if (!event) {
    console.log('📭 Nenhum evento encontrado');
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="empty-state">
            <Trophy size={96} className="empty-icon" />
            <h2>Evento Não Encontrado</h2>
            <p>Verifique se o evento existe e está ativo</p>
          </div>
        </div>
      </div>
    );
  }

  // No tournament data or no rankings
  if (!tournament) {
    console.log('🏆 Nenhum torneio encontrado para este evento');
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="tournament-header">
            <h1 className="tournament-title">{event.title}</h1>
            <div className="tournament-subtitle">Transmissão Ao Vivo</div>
          </div>
          
          <div className="waiting-state">
            <Trophy size={96} className="waiting-icon" />
            <h2>Torneio Não Iniciado</h2>
            <p>Este evento ainda não possui um torneio configurado</p>
            <div className="tournament-info">
              <div className="info-item">
                <span className="info-label">Participantes:</span>
                <span className="info-value">{participants.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">{event.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (rankings.length === 0) {
    const completedMatches = tournament?.matches?.filter(m => m.completed) || [];
    if (completedMatches.length === 0) {
      // Só mostra "Aguardando Resultados" se realmente não houver nenhuma partida finalizada
      return (
        <div className="tournament-transmission">
          <div className="tournament-transmission-container">
            <div className="tournament-header">
              <h1 className="tournament-title">{event.title}</h1>
              <div className="tournament-subtitle">Transmissão Ao Vivo</div>
            </div>
            <div className="waiting-state">
              <Trophy size={96} className="waiting-icon" />
              <h2>Aguardando Resultados</h2>
              <p>O torneio ainda não possui partidas finalizadas</p>
              <div className="tournament-info">
                <div className="info-item">
                  <span className="info-label">Participantes:</span>
                  <span className="info-value">{participants.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Partidas Total:</span>
                  <span className="info-value">{tournament?.matches?.length || 0}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Partidas Finalizadas:</span>
                  <span className="info-value">{completedMatches.length}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Fase:</span>
                  <span className="info-value">{currentPhase}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Se há partidas finalizadas mas ranking vazio, mostra mensagem de erro
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="tournament-header">
            <h1 className="tournament-title">{event.title}</h1>
            <div className="tournament-subtitle">Transmissão Ao Vivo</div>
          </div>
          <div className="waiting-state">
            <Trophy size={96} className="waiting-icon" />
            <h2>Erro ao calcular ranking</h2>
            <p>Existem partidas finalizadas, mas não foi possível calcular o ranking.</p>
          </div>
        </div>
      </div>
    );
  }

  // Main transmission display
  console.log('🎬 Renderizando transmissão principal:', { 
    currentPhase, 
    hasEvent: !!event, 
    hasTournament: !!tournament, 
    rankingsLength: rankings.length,
    eliminationMatchesLength: eliminationMatches.length
  });
  
  return (
    <div className="tournament-transmission">
      <div className="tournament-transmission-container">
        {/* Header */}
        <div className="tournament-header">
          <h1 className="tournament-title">{event.title}</h1>
          <div className="tournament-subtitle">
            <span className="phase-indicator">
              {currentPhase === 'GROUP' ? 'FASE DE GRUPOS' : 
               currentPhase === 'ELIMINATION' ? 'FASE ELIMINATÓRIA' : 
               'TORNEIO FINALIZADO'}
            </span>
            <span> • Transmissão Ao Vivo</span>
          </div>
        </div>


        {/* Rankings List sempre que houver rankings */}
        <div className="rankings-container">
          <div className="ranking-table">
            <div className="ranking-header">
              <div className="header-position">#</div>
              <div className="header-team">DUPLA</div>
              <div className="header-stat">V</div>
              <div className="header-stat">SG</div>
              <div className="header-stat">PG</div>
              <div className="header-stat">JP</div>
            </div>
            {rankings.slice(0, 9).map((team, index) => {
              const medalPosition = index < 3 ? index + 1 : null;
              const getMedalEmoji = (pos: number) => {
                switch(pos) {
                  case 1: return '🥇';
                  case 2: return '🥈';
                  case 3: return '🥉';
                  default: return '';
                }
              };
              return (
                <div
                  key={team.teamId}
                  className={`ranking-row ${team.isQualified ? 'qualified' : ''}`}
                >
                  <div className="row-position">
                    {medalPosition ? (
                      <div className="medal-position">
                        <span className="medal">{getMedalEmoji(medalPosition)}</span>
                        <span className="position-number">{medalPosition}º</span>
                      </div>
                    ) : (
                      <span className="position-number">{team.position}</span>
                    )}
                  </div>
                  <div className="row-team">
                    <div className="team-name">{team.teamName}</div>
                    {/* Badge de classificado removida */}
                  </div>
                  <div className="row-stat wins">{team.wins}</div>
                  <div className={`row-stat sets-diff ${team.setsDiff >= 0 ? 'positive' : 'negative'}`}>
                    {team.setsDiff >= 0 ? '+' : ''}{team.setsDiff}
                  </div>
                  <div className="row-stat sets-won">{team.setsWon}</div>
                  <div className="row-stat sets-lost">{team.setsLost}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tournament Info Footer */}
        <div className="tournament-footer">
          <div className="footer-stats">
            <div className="footer-stat">
              <span className="footer-label">Total de Duplas:</span>
              <span className="footer-value">{rankings.length}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-label">Partidas Concluídas:</span>
              <span className="footer-value">{tournament.matches.filter(m => m.completed).length}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-label">Status:</span>
              <span className="footer-value">{event.status}</span>
            </div>
          </div>
        </div>

        {/* Bracket Eliminatório só se houver partidas eliminatórias */}
        {eliminationMatches.length > 0 && (
          <>
            {renderEliminationBracket()}
            <div className="tournament-footer">
              <div className="footer-stats">
                <div className="footer-stat">
                  <span className="footer-label">Fase:</span>
                  <span className="footer-value">Eliminatórias</span>
                </div>
                <div className="footer-stat">
                  <span className="footer-label">Partidas Eliminatórias:</span>
                  <span className="footer-value">{eliminationMatches.length}</span>
                </div>
                <div className="footer-stat">
                  <span className="footer-label">Status:</span>
                  <span className="footer-value">{event.status}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {currentPhase === 'COMPLETED' && (
          <div className="tournament-completed">
            <div className="completion-message">
              <h2>🏆 Torneio Finalizado</h2>
              <p>Parabéns a todos os participantes!</p>
            </div>
            {renderEliminationBracket()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentTransmission;
