import { Match, GroupTeamStats as BaseGroupTeamStats, Team } from '../types';

// Extend the imported GroupTeamStats to include the additional properties
interface GroupTeamStats extends BaseGroupTeamStats {
  setDifference: number;
  setsWon: number;
  setsLost: number;
  headToHeadWins: Record<string, boolean>;
  // Add the proportional properties
  proportionalWins?: number;
  proportionalGameDifference?: number;
  proportionalGamesWon?: number;
}

/**
 * Interface para estatísticas de um time em um grupo
 */
export interface TeamStatistics {
  teamId: string[];
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  points: number;
  headToHeadWins: Record<string, boolean>;
  matchesPlayed: number;
  gameDifference: number;
  // Add missing properties
  setDifference: number;
  proportionalWins?: number;
  proportionalGameDifference?: number;
  proportionalGamesWon?: number;
  // Add the headToHead property that was missing
  headToHead?: Map<string, { wins: number; gamesWon?: number; gamesLost?: number }>;
}

/**
 * Interface para classificação de um grupo
 */
export interface GroupRanking {
  teamId: string[];
  position: number;
  rank: number;
  stats: TeamStatistics;
  groupNumber?: number; // Add the missing property
}

/**
 * Interface para classificação geral (entre grupos)
 */
export interface OverallRanking {
  teamId: string[];
  rank: number;
  groupNumber: number;
  groupPosition: number;
  stats: TeamStatistics;
}

/**
 * Interface estendida para estatísticas de equipe incluindo confronto direto
 * Usada internamente para cálculos de ranking geral
 */
interface TeamStatisticsExtended extends TeamStatistics {
  groupNumber: number;
  headToHead: Map<string, { wins: number; gamesWon?: number; gamesLost?: number }>;
}

// Helper to create a unique key for a team (array of participant IDs)
const getTeamKey = (teamId: string[]): string => {
  return [...teamId].sort().join('|');
};

// Helper to initialize team stats
const initializeTeamStats = (teamId: string[]): GroupTeamStats => ({
  teamId: [...teamId],
  wins: 0,
  losses: 0,
  gamesWon: 0,
  gamesLost: 0,
  gameDifference: 0,
  matchesPlayed: 0,
  setsWon: 0,
  setsLost: 0,
  setDifference: 0,
  points: 0,
  draws: 0,
  headToHeadWins: {},
});

/**
 * Calculates the ranking within a single group based on completed matches.
 * Implements complete ITF criteria for Beach Tennis tournaments.
 * @param groupMatches - Array of completed matches for a specific group.
 * @param useExtendedCriteria - Whether to use full ITF criteria for tiebreaking
 * @returns An array of GroupRanking objects, sorted by rank.
 */
export const calculateGroupRankings = (
  groupMatches: Match[],
  useExtendedCriteria = false
): GroupRanking[] => {
  // Create a map to store team statistics
  const teamStats: Map<string, TeamStatisticsExtended> = new Map();

  // Process each completed match
  groupMatches.forEach((match) => {
    if (!match.completed || !match.team1 || !match.team2 || 
        match.score1 === null || match.score2 === null) {
      return;
    }

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');

    // Initialize team statistics if not already present
    if (!teamStats.has(team1Key)) {
      teamStats.set(team1Key, {
        teamId: match.team1,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
        headToHeadWins: {},
        matchesPlayed: 0,
        gameDifference: 0,
        setDifference: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        teamId: match.team2,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
        headToHeadWins: {},
        matchesPlayed: 0,
        gameDifference: 0,
        setDifference: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }

    const team1Stats = teamStats.get(team1Key)!;
    const team2Stats = teamStats.get(team2Key)!;

    // Update basic statistics
    team1Stats.gamesWon += match.score1;
    team1Stats.gamesLost += match.score2;
    team1Stats.matchesPlayed += 1;
    team1Stats.played += 1;

    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;
    team2Stats.matchesPlayed += 1;
    team2Stats.played += 1;

    // Determine winner and update win/loss records
    if (match.score1 > match.score2) {
      team1Stats.wins += 1;
      team2Stats.losses += 1;
      
      // Record head-to-head
      if (!team1Stats.headToHeadWins[team2Key]) {
        team1Stats.headToHeadWins[team2Key] = true;
      }
      
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: (team1Stats.headToHead.get(team2Key)?.wins || 0) + 1, 
          gamesWon: match.score1, 
          gamesLost: match.score2 
        });
      }
      
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: team2Stats.headToHead.get(team1Key)?.wins || 0, 
          gamesWon: match.score2, 
          gamesLost: match.score1 
        });
      }
    } else {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
      
      // Record head-to-head
      if (!team2Stats.headToHeadWins[team1Key]) {
        team2Stats.headToHeadWins[team1Key] = true;
      }
      
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: (team2Stats.headToHead.get(team1Key)?.wins || 0) + 1, 
          gamesWon: match.score2, 
          gamesLost: match.score1 
        });
      }
      
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: team1Stats.headToHead.get(team2Key)?.wins || 0, 
          gamesWon: match.score1, 
          gamesLost: match.score2 
        });
      }
    }

    // Calculate game difference
    team1Stats.gameDifference = team1Stats.gamesWon - team1Stats.gamesLost;
    team2Stats.gameDifference = team2Stats.gamesWon - team2Stats.gamesLost;
  });

  // Convert to array and apply tiebreaker criteria based on Beach Tennis rules
  const rankings: GroupRanking[] = Array.from(teamStats.values()).map(stats => ({
    teamId: stats.teamId,
    stats: stats,
    rank: 0,
    position: 0 // Initialize position
  }));

  // Sort teams according to Beach Tennis ranking rules
  rankings.sort((a, b) => {
    // 1. Number of wins (most wins first)
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    // 2. Game difference (best difference first)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 3. Total games won (most games first)
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 4. Head-to-head result if applicable (only if two teams are tied)
    const aKey = a.teamId.join(',');
    const bKey = b.teamId.join(',');
    
    const aVsBStats = a.stats.headToHead?.get(bKey);
    const bVsAStats = b.stats.headToHead?.get(aKey);
    
    if (aVsBStats && bVsAStats) {
      // Check head-to-head wins
      if (aVsBStats.wins !== bVsAStats.wins) {
        return bVsAStats.wins - aVsBStats.wins;
      }
      
      // If tied on direct wins, compare game difference in head-to-head
      const aDirectGameDiff = (aVsBStats.gamesWon || 0) - (aVsBStats.gamesLost || 0);
      const bDirectGameDiff = (bVsAStats.gamesWon || 0) - (bVsAStats.gamesLost || 0);
      
      if (aDirectGameDiff !== bDirectGameDiff) {
        return bDirectGameDiff - aDirectGameDiff;
      }
    }

    // 5. Fewest games lost (fewer losses first)
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 6. Most matches played (more matches first, for irregular groups)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    // 7. As a last resort, alphabetical order by team ID for consistency
    return a.teamId.join(',').localeCompare(b.teamId.join(','));
  });

  // Assign ranks and positions
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    ranking.position = index + 1; // Set position equal to rank
  });

  return rankings;
};

/**
 * Calcula o ranking geral da fase de grupos seguindo as regras oficiais do Beach Tennis
 * 
 * Regras de classificação:
 * 1. Número de vitórias (maior número ganha)
 * 2. Saldo de games (diferença entre games ganhos e perdidos)
 * 3. Número total de games ganhos
 * 4. Confronto direto (se aplicável)
 * 5. Menor número de games perdidos
 * 
 * @param allGroupMatches Todas as partidas da fase de grupos concluídas
 * @returns Array de rankings ordenados seguindo as regras oficiais
 */
export function calculateOverallGroupStageRankings(allGroupMatches: Match[]): OverallRanking[] {
  const teamStats = new Map<string, TeamStatisticsExtended>();

  // Coletar estatísticas de todas as partidas
  allGroupMatches.forEach(match => {
    if (!match.completed || !match.team1 || !match.team2 || 
        match.score1 === null || match.score2 === null) {
      return;
    }

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');

    // Inicializar estatísticas se não existirem
    if (!teamStats.has(team1Key)) {
      teamStats.set(team1Key, {
        teamId: match.team1,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
        headToHeadWins: {},
        matchesPlayed: 0,
        gameDifference: 0,
        setDifference: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        teamId: match.team2,
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        points: 0,
        headToHeadWins: {},
        matchesPlayed: 0,
        gameDifference: 0,
        setDifference: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }

    const team1Stats = teamStats.get(team1Key)!;
    const team2Stats = teamStats.get(team2Key)!;

    // Atualizar estatísticas básicas
    team1Stats.gamesWon += match.score1;
    team1Stats.gamesLost += match.score2;
    team1Stats.matchesPlayed += 1;
    team1Stats.played += 1;

    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;
    team2Stats.matchesPlayed += 1;
    team2Stats.played += 1;

    // Determinar vencedor e atualizar vitórias/derrotas
    if (match.score1 > match.score2) {
      team1Stats.wins += 1;
      team2Stats.losses += 1;
      // Confronto direto
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: (team1Stats.headToHead.get(team2Key)?.wins || 0) + 1, 
          gamesWon: match.score1, 
          gamesLost: match.score2 
        });
      }
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: team2Stats.headToHead.get(team1Key)?.wins || 0, 
          gamesWon: match.score2, 
          gamesLost: match.score1 
        });
      }
    } else {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
      // Confronto direto
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: (team2Stats.headToHead.get(team1Key)?.wins || 0) + 1, 
          gamesWon: match.score2, 
          gamesLost: match.score1 
        });
      }
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: team1Stats.headToHead.get(team2Key)?.wins || 0, 
          gamesWon: match.score1, 
          gamesLost: match.score2 
        });
      }
    }

    // Calcular saldo de games
    team1Stats.gameDifference = team1Stats.gamesWon - team1Stats.gamesLost;
    team2Stats.gameDifference = team2Stats.gamesWon - team2Stats.gamesLost;
  });

  // Converter para array e aplicar critérios de desempate do Beach Tennis
  const rankings: OverallRanking[] = Array.from(teamStats.values()).map(stats => ({
    teamId: stats.teamId,
    stats: stats,
    rank: 0, // Será calculado após ordenação
    groupPosition: 0, // Será calculado se necessário
    groupNumber: stats.groupNumber
  }));

  // Ordenar seguindo as regras oficiais do Beach Tennis
  rankings.sort((a, b) => {
    // 1. Número de vitórias (maior número ganha)
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    // 2. Saldo de games (maior saldo ganha)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 3. Número total de games ganhos (maior número ganha)
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 4. Confronto direto (se houver)
    const aKey = a.teamId.join(',');
    const bKey = b.teamId.join(',');
    
    const aVsBStats = a.stats.headToHead?.get(bKey);
    const bVsAStats = b.stats.headToHead?.get(aKey);
    
    if (aVsBStats && bVsAStats) {
      // Verificar vitórias no confronto direto
      if (aVsBStats.wins !== bVsAStats.wins) {
        return bVsAStats.wins - aVsBStats.wins; // Quem venceu mais jogos diretos
      }
      
      // Se empatados em vitórias diretas, verificar saldo de games no confronto direto
      const aDirectGameDiff = (aVsBStats.gamesWon || 0) - (aVsBStats.gamesLost || 0);
      const bDirectGameDiff = (bVsAStats.gamesWon || 0) - (bVsAStats.gamesLost || 0);
      
      if (aDirectGameDiff !== bDirectGameDiff) {
        return bDirectGameDiff - aDirectGameDiff;
      }
    }

    // 5. Menor número de games perdidos
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 6. Maior número de partidas jogadas (pode acontecer em grupos irregulares)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    // 7. Como último critério, ordenar por ID da equipe para consistência
    return a.teamId.join(',').localeCompare(b.teamId.join(','));
  });

  // Atribuir ranks considerando empates
  let currentRank = 1;
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0) {
      const current = rankings[i];
      const previous = rankings[i - 1];
      
      // Verificar se há empate nos critérios principais
      const tied = (
        current.stats.wins === previous.stats.wins &&
        current.stats.gameDifference === previous.stats.gameDifference &&
        current.stats.gamesWon === previous.stats.gamesWon &&
        current.stats.gamesLost === previous.stats.gamesLost
      );
      
      if (!tied) {
        currentRank = i + 1;
      }
    }
    
    rankings[i].rank = currentRank;
  }

  return rankings;
}

/**
 * Calcula rankings específicos por colocação nos grupos (1º, 2º, 3º lugar, etc.)
 * Útil para determinar qualificados para fases eliminatórias
 * 
 * @param groupRankings Rankings calculados por grupo
 * @param placement Colocação desejada (1 = primeiros lugares, 2 = segundos lugares, etc.)
 * @returns Array de equipes nessa colocação, ordenadas pelo desempenho geral
 */
export function calculateRankingsForPlacement(
  groupRankings: Record<number, GroupRanking[]>, 
  placement: number
): OverallRanking[] {
  const placementTeams: OverallRanking[] = [];

  // Coletar todas as equipes da colocação especificada
  Object.entries(groupRankings).forEach(([groupNumber, rankings]) => {
    const teamAtPlacement = rankings.find(ranking => ranking.rank === placement);
    
    if (teamAtPlacement) {
      placementTeams.push({
        teamId: teamAtPlacement.teamId,
        stats: teamAtPlacement.stats,
        rank: 0, // Será recalculado
        groupPosition: placement,
        groupNumber: parseInt(groupNumber)
      });
    }
  });

  // Ordenar as equipes dessa colocação usando os mesmos critérios do ranking geral
  placementTeams.sort((a, b) => {
    // 1. Número de vitórias
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    // 2. Saldo de games
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 3. Games ganhos
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 4. Games perdidos (menor é melhor)
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 5. Número de partidas jogadas
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    // 6. Critério final: ordem alfabética por consistência
    return a.teamId.join(',').localeCompare(b.teamId.join(','));
  });

  // Atribuir ranks
  placementTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  return placementTeams;
}

/**
 * Obtém os qualificados de cada grupo para a fase eliminatória
 * Seguindo as regras padrão do Beach Tennis (normalmente 2 melhores de cada grupo)
 * 
 * @param groupRankings Rankings calculados por grupo
 * @param qualifiersPerGroup Número de qualificados por grupo (padrão: 2)
 * @returns Array com todos os qualificados ordenados por desempenho
 */
export function getRankedQualifiers(
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2
): OverallRanking[] {
  const allQualifiers: OverallRanking[] = [];

  // Coletar qualificados de cada grupo
  Object.entries(groupRankings).forEach(([groupNumber, rankings]) => {
    const groupQualifiers = rankings
      .filter(ranking => ranking.rank <= qualifiersPerGroup)
      .map(ranking => ({
        teamId: ranking.teamId,
        stats: ranking.stats,
        rank: ranking.rank,
        groupPosition: ranking.rank,
        groupNumber: parseInt(groupNumber)
      }));
    
    allQualifiers.push(...groupQualifiers);
  });

  // Ordenar todos os qualificados por desempenho geral
  // Primeiro por posição no grupo, depois pelos critérios de desempate
  allQualifiers.sort((a, b) => {
    // 1. Posição no grupo (1º lugares antes dos 2º lugares)
    if (a.groupPosition !== b.groupPosition) {
      return a.groupPosition - b.groupPosition;
    }

    // 2. Para equipes da mesma colocação, usar critérios de desempate
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    return a.teamId.join(',').localeCompare(b.teamId.join(','));
  });

  // Reatribuir ranks finais
  allQualifiers.forEach((qualifier, index) => {
    qualifier.rank = index + 1;
  });

  return allQualifiers;
}

/**
 * Gera a fase eliminatória seguindo as regras oficiais do Beach Tennis
 * 
 * Regras do Beach Tennis para chaveamento eliminatório:
 * 1. Os 2 melhores de cada grupo se classificam (padrão)
 * 2. Primeiros colocados enfrentam segundos colocados de outros grupos
 * 3. Times do mesmo grupo não podem se enfrentar nas primeiras rodadas
 * 4. Distribuição equilibrada no chaveamento
 * 5. Semifinais e final seguem formato mata-mata
 * 
 * @param groupRankings Rankings calculados por grupo
 * @param qualifiersPerGroup Número de qualificados por grupo (padrão: 2)
 * @returns Estrutura de partidas para a fase eliminatória
 */
export function generateEliminationBracket(
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2
): Match[] {
  const matches: Match[] = [];
  const qualifiedTeams: string[][] = [];

  // Extract qualified teams from each group
  Object.values(groupRankings).forEach(rankings => {
    for (let i = 0; i < Math.min(qualifiersPerGroup, rankings.length); i++) {
      qualifiedTeams.push(rankings[i].teamId); // Changed from .team to .teamId
    }
  });

  if (qualifiedTeams.length < 2) {
    throw new Error('Pelo menos 2 times qualificados são necessários para a fase eliminatória');
  }

  // Generate bracket structure
  const totalTeams = qualifiedTeams.length;
  const rounds = Math.ceil(Math.log2(totalTeams));
  
  // Create first round matches
  let currentRound = 1;
  let currentPosition = 1;
  
  for (let i = 0; i < qualifiedTeams.length; i += 2) {
    if (i + 1 < qualifiedTeams.length) {
      matches.push({
        id: generateUUID(), // Use proper UUID here too
        tournamentId: '', // Will be set by caller
        eventId: '', // Will be set by caller
        round: currentRound,
        position: currentPosition++,
        team1: qualifiedTeams[i],
        team2: qualifiedTeams[i + 1],
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Generate subsequent rounds (empty matches to be filled by winners)
  let teamsInRound = Math.floor(qualifiedTeams.length / 2);
  currentRound++;
  
  while (teamsInRound > 1) {
    currentPosition = 1;
    for (let i = 0; i < Math.floor(teamsInRound / 2); i++) {
      matches.push({
        id: generateUUID(), // Use proper UUID here too
        tournamentId: '',
        eventId: '',
        round: currentRound,
        position: currentPosition++,
        team1: null,
        team2: null,
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    teamsInRound = Math.floor(teamsInRound / 2);
    currentRound++;
  }

  return matches;
}

// Add the UUID generation function at the top of the file if not already present
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Gera semifinais diretas para 4 times
 */
function generateSemifinals(
  firstPlaceTeams: OverallRanking[], 
  secondPlaceTeams: OverallRanking[], 
  startingId: number
): Match[] {
  const matches: Match[] = [];
  
  // Emparelhar 1º colocado vs 2º colocado de grupos diferentes
  if (firstPlaceTeams.length >= 2 && secondPlaceTeams.length >= 2) {
    // Semifinal 1: 1º do grupo A vs 2º do grupo B
    matches.push({
      id: `elimination_${startingId}`,
      eventId: '', // Será preenchido pelo service
      tournamentId: '', // Será preenchido pelo service
      round: 1,
      position: 1,
      team1: firstPlaceTeams[0].teamId,
      team2: secondPlaceTeams[1]?.teamId || secondPlaceTeams[0].teamId,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Semifinal 2: 1º do grupo B vs 2º do grupo A
    matches.push({
      id: `elimination_${startingId + 1}`,
      eventId: '',
      tournamentId: '',
      round: 1,
      position: 2,
      team1: firstPlaceTeams[1]?.teamId || firstPlaceTeams[0].teamId,
      team2: secondPlaceTeams[0].teamId,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return matches;
}

/**
 * Gera quartas de final para 4 times específicos
 */
function generateQuarterFinals(teams: OverallRanking[], startingId: number): Match[] {
  const matches: Match[] = [];
  
  if (teams.length >= 4) {
    // Quarta 1
    matches.push({
      id: `elimination_${startingId}`,
      eventId: '',
      tournamentId: '',
      round: 1,
      position: 1,
      team1: teams[0].teamId,
      team2: teams[3].teamId,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    // Quarta 2
    matches.push({
      id: `elimination_${startingId + 1}`,
      eventId: '',
      tournamentId: '',
      round: 1,
      position: 2,
      team1: teams[1].teamId,
      team2: teams[2].teamId,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return matches;
}

/**
 * Gera quartas de final completas para 8 times
 */
function generateFullQuarterFinals(teams: OverallRanking[], startingId: number): Match[] {
  const matches: Match[] = [];
  
  // Organizar times para evitar confrontos do mesmo grupo
  const organizedTeams = organizeTeamsForElimination(teams);
  
  for (let i = 0; i < 4; i++) {
    matches.push({
      id: `elimination_${startingId + i}`,
      eventId: '',
      tournamentId: '',
      round: 1,
      position: i + 1,
      team1: organizedTeams[i * 2]?.teamId || [],
      team2: organizedTeams[i * 2 + 1]?.teamId || [],
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return matches;
}

/**
 * Gera semifinais com byes
 */
function generateSemifinalsWithByes(byeTeams: OverallRanking[], startingId: number): Match[] {
  const matches: Match[] = [];
  
  // Semifinal 1: vencedor da quarta 1 vs bye team 1
  matches.push({
    id: `elimination_${startingId}`,
    eventId: '',
    tournamentId: '',
    round: 2,
    position: 1,
    team1: [], // Será preenchido com vencedor da quarta 1
    team2: byeTeams[0]?.teamId || [],
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Semifinal 2: vencedor da quarta 2 vs bye team 2
  matches.push({
    id: `elimination_${startingId + 1}`,
    eventId: '',
    tournamentId: '',
    round: 2,
    position: 2,
    team1: [], // Será preenchido com vencedor da quarta 2
    team2: byeTeams[1]?.teamId || [],
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  return matches;
}

/**
 * Gera semifinais a partir das quartas de final
 */
function generateSemifinalsFromQuarters(startingId: number): Match[] {
  const matches: Match[] = [];
  
  // Semifinal 1: vencedor quarta 1 vs vencedor quarta 4
  matches.push({
    id: `elimination_${startingId}`,
    eventId: '',
    tournamentId: '',
    round: 2,
    position: 1,
    team1: [], // Vencedor da quarta 1
    team2: [], // Vencedor da quarta 4
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Semifinal 2: vencedor quarta 2 vs vencedor quarta 3
  matches.push({
    id: `elimination_${startingId + 1}`,
    eventId: '',
    tournamentId: '',
    round: 2,
    position: 2,
    team1: [], // Vencedor da quarta 2
    team2: [], // Vencedor da quarta 3
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  return matches;
}

/**
 * Gera a partida final
 */
function generateFinalMatch(matchId: number): Match {
  return {
    id: `elimination_${matchId}`,
    eventId: '',
    tournamentId: '',
    round: 3, // Assumindo que é a 3ª rodada (pode variar)
    position: 1,
    team1: [], // Vencedor semifinal 1
    team2: [], // Vencedor semifinal 2
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Organiza times para eliminação evitando confrontos do mesmo grupo
 */
function organizeTeamsForElimination(teams: OverallRanking[]): OverallRanking[] {
  // Separar por colocação nos grupos
  const firstPlaceTeams = teams.filter(team => team.groupPosition === 1);
  const secondPlaceTeams = teams.filter(team => team.groupPosition === 2);
  
  // Organizar para que times do mesmo grupo não se enfrentem inicialmente
  const organized: OverallRanking[] = [];
  
  // Alternar entre primeiros e segundos colocados
  const maxLength = Math.max(firstPlaceTeams.length, secondPlaceTeams.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (i < firstPlaceTeams.length) organized.push(firstPlaceTeams[i]);
    if (i < secondPlaceTeams.length) organized.push(secondPlaceTeams[i]);
  }
  
  return organized;
}

/**
 * Gera eliminação adaptativa para números variados de times
 */
function generateAdaptiveElimination(teams: OverallRanking[], startingId: number): Match[] {
  const matches: Match[] = [];
  const totalTeams = teams.length;
  
  // Encontrar a próxima potência de 2 menor que o total de times
  const nextPowerOf2 = Math.pow(2, Math.floor(Math.log2(totalTeams)));
  const byes = nextPowerOf2 - (totalTeams - nextPowerOf2);
  
  // Times que jogam a primeira rodada
  const playoffTeams = teams.slice(byes);
  
  // Gerar partidas da primeira rodada (playoffs)
  for (let i = 0; i < playoffTeams.length; i += 2) {
    if (i + 1 < playoffTeams.length) {
      matches.push({
        id: `elimination_${startingId + Math.floor(i / 2)}`,
        eventId: '',
        tournamentId: '',
        round: 1,
        position: Math.floor(i / 2) + 1,
        team1: playoffTeams[i].teamId,
        team2: playoffTeams[i + 1].teamId,
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  
  return matches;
}

/**
 * Atualiza o chaveamento eliminatório após conclusão de uma partida
 */
export function updateEliminationBracket(
  matches: Match[],
  completedMatchId: string,
  winnerId: string,
  winnerTeamId: string[]
): Match[] {
  const updatedMatches = [...matches];
  const completedMatch = updatedMatches.find(m => m.id === completedMatchId);
  
  if (!completedMatch) return updatedMatches;
  
  // Encontrar a próxima partida que este vencedor deve jogar
  const nextRound = completedMatch.round + 1;
  const nextPosition = Math.ceil(completedMatch.position / 2);
  
  const nextMatch = updatedMatches.find(
    m => m.round === nextRound && m.position === nextPosition
  );
  
  if (nextMatch) {
    // Determinar se o vencedor vai para team1 ou team2 da próxima partida
    if (completedMatch.position % 2 === 1) {
      // Posição ímpar vai para team1
      nextMatch.team1 = winnerTeamId;
    } else {
      // Posição par vai para team2
      nextMatch.team2 = winnerTeamId;
    }
  }
  
  return updatedMatches;
}
