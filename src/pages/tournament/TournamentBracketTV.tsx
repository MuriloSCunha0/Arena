import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Match, Participant, Tournament } from '../../types';
import { useNotificationStore } from '../../components/ui/Notification';
import './tvBracketWhite.css';
import './tvBracketExtras.css';

// Interface para posição e dimensões dos matches
interface MatchPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TournamentBracketTV: React.FC = () => {  
  const [searchParams] = useSearchParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [eventName, setEventName] = useState<string>('');
  const [matchPositions, setMatchPositions] = useState<Map<string, MatchPosition>>(new Map());
  const [bracketLines, setBracketLines] = useState<Array<{path: string; highlight: boolean}>>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const matchRefs = useRef<Record<string, HTMLDivElement | null>>({});
    // Constants for bracket visualization
  const matchWidth = 280;    // Largura de cada card de partida
  const matchHeight = 120;   // Altura de cada card de partida
  const horizontalGap = 350;  // Espaço horizontal entre as rodadas
  const verticalPadding = 100; // Espaço vertical para centralizar o chaveamento

  // Tournament ID and Event ID from URL params
  const tournamentId = searchParams.get('tournamentId');
  const eventId = searchParams.get('eventId');

  // Fetch tournament data from session storage or API
  useEffect(() => {
    if (!tournamentId || !eventId) {
      setError('IDs do torneio ou evento não fornecidos na URL');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch tournament data
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
          
        if (tournamentError) throw tournamentError;
        if (!tournamentData) throw new Error('Torneio não encontrado');
        
        // Fetch matches for this tournament
        const { data: matchesData, error: matchesError } = await supabase
          .from('tournament_matches')
          .select('*')
          .eq('tournament_id', tournamentId);
          
        if (matchesError) throw matchesError;
          // Fetch participants for this event
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventId);
          
        if (participantsError) throw participantsError;
        
        // Fetch event data to get the event name
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .single();
          
        if (!eventError && eventData) {
          setEventName(eventData.title);
        }
        
        // Combine tournament with matches
        const tournamentWithMatches = {
          ...tournamentData,
          matches: matchesData || []
        };
        
        setTournament(tournamentWithMatches);
        setParticipants(participantsData || []);
        setError(null);
        
        // Calculate optimal zoom level for the display
        setTimeout(() => {
          setZoomLevel(calculateOptimalZoom());
        }, 500);
      } catch (err) {
        console.error('Error fetching tournament data:', err);
        setError('Erro ao carregar os dados do torneio');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up polling for tournament updates
    const intervalId = setInterval(() => {
      fetchData();
    }, 30000); // Check for updates every 30 seconds
    
    return () => clearInterval(intervalId);
  }, [tournamentId, eventId]);
  // Calculate optimal zoom level for display
  const calculateOptimalZoom = (): number => {
    if (!bracketContainerRef.current) return 90; // Valor inicial mais conservador
    
    // Usar um timeout para garantir que o conteúdo seja renderizado antes de calcular
    setTimeout(() => {
      if (!bracketContainerRef.current) return;
      
      const container = bracketContainerRef.current;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Usar o SVG como referência para tamanho quando possível
      const svgElement = svgRef.current;
      const rounds = container.querySelectorAll('.tv-round');
      
      // Calcular largura total baseada nas rodadas
      let totalWidth = 0;
      rounds.forEach(round => {
        // Adicionar largura de cada rodada + margem
        totalWidth += round.clientWidth + 60;
      });
      
      // Ajustar se tiver muito pouco conteúdo
      totalWidth = Math.max(totalWidth, 800);
      
      // Estimar altura total do conteúdo
      const bracketContent = container.querySelector('.tv-bracket-visualization');
      const bracketHeight = bracketContent ? bracketContent.scrollHeight + 150 : container.scrollHeight;
      
      // Calcular zoom para ajuste
      const widthZoom = (screenWidth * 0.9) / totalWidth * 100;
      const heightZoom = (screenHeight * 0.8) / bracketHeight * 100;
      
      // Use o menor zoom para garantir que tudo se ajuste
      const optimalZoom = Math.min(widthZoom, heightZoom);
      
      // Aplicar zoom
      setZoomLevel(Math.max(50, Math.min(100, Math.round(optimalZoom))));
    }, 800);
    
    // Retornar um valor inicial enquanto calcula
    return 90;
  };

  // Create a map of participant IDs to names
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    participants.forEach((participant) => {
      map.set(participant.id, participant.name);
    });
    return map;
  }, [participants]);

  // Function to get team name display based on participant IDs
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

  // Organize matches by stage and round
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

  // Organize elimination matches by round for display
  const eliminationRoundsArray = useMemo(() => {
    if (!matchesByStage.ELIMINATION.length) return [];
    
    const rounds: Record<number, Match[]> = {};
    
    // Group matches by round
    matchesByStage.ELIMINATION.forEach(match => {
      if (typeof match.round !== 'number') return;
      
      if (!rounds[match.round]) {
        rounds[match.round] = [];
      }
      
      rounds[match.round].push(match);
    });
    
    // Convert to array format
    return Object.entries(rounds).map(([round, matches]) => ({
      round: parseInt(round),
      matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
    }));
  }, [matchesByStage.ELIMINATION]);

  // Get name for each round
  const getRoundName = (roundIndex: number, totalRounds: number): string => {
    if (roundIndex === totalRounds - 1) return 'Final';
    if (roundIndex === totalRounds - 2) return 'Semifinal';
    if (roundIndex === totalRounds - 3) return 'Quartas de Final';
    if (roundIndex === totalRounds - 4) return 'Oitavas de Final';
    return `${Math.pow(2, totalRounds - roundIndex)}ª de Final`;
  };
  
  const MatchCard: React.FC<{
    teamA?: string | null;
    teamB?: string | null;
    scoreA?: number;
    scoreB?: number;
    winner?: string;
    completed?: boolean;
  }> = ({ 
    teamA = '', 
    teamB = '', 
    scoreA, 
    scoreB, 
    winner,
    completed = false
  }) => {
    const isCompleted = scoreA !== undefined && scoreB !== undefined;
    
    return (    
      <div className="tv-match-card">
        <div className={`team team-a ${winner === 'team1' ? 'winner' : ''}`}>
          <span className="team-name">{teamA || 'A definir'}</span>
          <span className="team-score">{isCompleted ? scoreA : '-'}</span>
        </div>
        
        <div className={`team team-b ${winner === 'team2' ? 'winner' : ''}`}>
          <span className="team-name">{teamB || 'A definir'}</span>
          <span className="team-score">{isCompleted ? scoreB : '-'}</span>
        </div>
        
        {completed && <div className="match-completed-indicator"></div>}
      </div>
    );
  };

  // Calcular posições dos matches e linhas do chaveamento
  useEffect(() => {
    if (!tournament?.matches || eliminationRoundsArray.length === 0 || !bracketContainerRef.current) return;
    
    // Timeout para esperar a renderização dos elementos
    setTimeout(() => {
      const newMatchPositions = new Map<string, MatchPosition>();
      const newLines: { path: string; highlight: boolean }[] = [];
      
      // Capturar posições dos matches
      eliminationRoundsArray.forEach(round => {
        round.matches.forEach(match => {
          const element = matchRefs.current[match.id];
          if (element) {
            const rect = element.getBoundingClientRect();
            const containerRect = bracketContainerRef.current!.getBoundingClientRect();
            
            // Posição relativa ao container
            newMatchPositions.set(match.id, {
              id: match.id,
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height
            });
          }
        });
      });
      
      // Calcular linhas entre matches
      eliminationRoundsArray.forEach((roundData, roundIndex) => {
        if (roundIndex === eliminationRoundsArray.length - 1) return; // Último round não tem próximos matches
        
        roundData.matches.forEach(match => {
          const fromPos = newMatchPositions.get(match.id);
          if (!fromPos) return;
          
          // Calcular próxima partida
          const nextRound = match.round + 1;
          const nextPosition = Math.ceil(match.position / 2);
          
          const nextMatch = tournament.matches.find(
            m => m.round === nextRound && m.position === nextPosition && m.stage === 'ELIMINATION'
          );
          
          if (!nextMatch) return;
          
          const toPos = newMatchPositions.get(nextMatch.id);
          if (!toPos) return;
            // Calcular pontos para desenhar a linha com melhor posicionamento
          const startX = fromPos.x + fromPos.width + 2; // Adicionar 2px para evitar sobreposição com a borda
          const startY = fromPos.y + (fromPos.height / 2);
          const endX = toPos.x - 2; // Subtrair 2px para evitar sobreposição com a borda
          const endY = toPos.y + (toPos.height / 2);
          const midX = startX + (endX - startX) / 2;
          
          // Criar path para a linha
          const path = `M${startX},${startY} L${midX},${startY} L${midX},${endY} L${endX},${endY}`;
          
          // Verificar se linha deve ser destacada (se o time vencedor avançou)
          let highlight = false;
          if (match.completed && match.winnerId) {
            const winnerTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
            if (winnerTeam) {
              if (match.position % 2 === 1) {
                // Verificar se o time vencedor está na próxima partida como team1
                highlight = nextMatch.team1?.some(id => winnerTeam.includes(id)) || false;
              } else {
                // Verificar se o time vencedor está na próxima partida como team2
                highlight = nextMatch.team2?.some(id => winnerTeam.includes(id)) || false;
              }
            }
          }
          
          newLines.push({ path, highlight });
        });
      });
      
      setMatchPositions(newMatchPositions);
      setBracketLines(newLines);
    }, 500);
  }, [tournament, eliminationRoundsArray]);

  if (loading) {
    return (
      <div className="tv-loading">
        <div className="spinner"></div>
        <p>Carregando chaveamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tv-error">
        <h3>Erro ao carregar o chaveamento</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!tournament || !tournament.matches || tournament.matches.length === 0) {
    return (
      <div className="tv-error">
        <h3>Torneio não encontrado</h3>
        <p>Não foi possível encontrar os dados do torneio ou não há partidas disponíveis.</p>
      </div>
    );
  }
  
  return (
    <div className="tv-bracket-container">
      <header className="tv-header">
        <h1>{eventName || 'Chaveamento do Torneio'}</h1>
        <div className="tournament-meta">
          <span className="tournament-status">Status: {tournament.status}</span>
          <span className="bracket-last-updated">Atualizado: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>      <div className="tv-bracket-main" ref={bracketContainerRef}>
        <div className="tv-bracket-headers">
          {eliminationRoundsArray.map((roundData, index) => (
            <div key={roundData.round} className="tv-round-header">
              {getRoundName(index, eliminationRoundsArray.length)}
            </div>
          ))}
        </div>
          <div 
          className="tv-bracket-visualization" 
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            position: 'relative',
            minHeight: '600px',
            width: '100%'
          }}
        >
          {/* SVG para desenhar as linhas de conexão */}
          <svg 
            ref={svgRef}
            className="tv-bracket-lines-svg"
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            {bracketLines.map((line, index) => (
              <path
                key={`line-${index}`}
                d={line.path}
                className={`tv-bracket-line ${line.highlight ? 'tv-bracket-line-highlight' : ''}`}
              />
            ))}
          </svg>
          
          {/* Rounds e matches */}
          {eliminationRoundsArray.map((roundData) => (
            <div key={roundData.round} className="tv-round">
              {roundData.matches.map((match) => (
                <div 
                  key={match.id} 
                  className="tv-match-wrapper"
                  ref={el => matchRefs.current[match.id] = el}
                >
                  <MatchCard
                    teamA={getTeamDisplayName(match.team1)}
                    teamB={getTeamDisplayName(match.team2)}
                    scoreA={match.score1 ?? undefined}
                    scoreB={match.score2 ?? undefined}
                    winner={match.winnerId === 'team1' ? 'team1' : 
                           match.winnerId === 'team2' ? 'team2' : undefined}
                    completed={match.completed}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <footer className="tv-footer">
        <div className="logo">Arena</div>
        <p>Chaveamento exibido no modo TV</p>
      </footer>
    </div>
  );
};

export default TournamentBracketTV;
