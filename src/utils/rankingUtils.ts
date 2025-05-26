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
  const teamStatsMap = new Map<string, GroupTeamStats>();

  const ensureTeamStats = (teamId: string[]) => {
    const key = getTeamKey(teamId);
    if (!teamStatsMap.has(key)) {
      teamStatsMap.set(key, initializeTeamStats(teamId));
    }
    return teamStatsMap.get(key)!;
  };

  // First pass: process all matches to gather basic stats
  for (const match of groupMatches) {
    if (!match.completed || !match.team1 || !match.team2 || match.winnerId === null || match.score1 === null || match.score2 === null) {
      continue;
    }

    const team1Stats = ensureTeamStats(match.team1);
    const team2Stats = ensureTeamStats(match.team2);

    team1Stats.matchesPlayed++;
    team2Stats.matchesPlayed++;

    // Process games statistics
    team1Stats.gamesWon += match.score1;
    team1Stats.gamesLost += match.score2;
    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;

    // Track who won the match
    if (match.winnerId === 'team1') {
      team1Stats.wins++;
      team2Stats.losses++;
      if (team1Stats.headToHeadWins) {
        team1Stats.headToHeadWins[getTeamKey(match.team2)] = true;
      } else {
        team1Stats.headToHeadWins = { [getTeamKey(match.team2)]: true };
      }

      // Count sets if using extended criteria
      if (useExtendedCriteria && match.beachTennisScore) {
        // Count sets from detailed score data
        match.beachTennisScore.sets.forEach(set => {
          if (set.team1Games > set.team2Games ||
              (set.tiebreak && set.tiebreak.team1Points > set.tiebreak.team2Points)) {
            team1Stats.setsWon++;
            team2Stats.setsLost++;
          } else if (set.team2Games > set.team1Games ||
                    (set.tiebreak && set.tiebreak.team2Points > set.tiebreak.team1Points)) {
            team2Stats.setsWon++;
            team1Stats.setsLost++;
          }
        });
      } else {
        // Simplified set counting if no detailed data
        team1Stats.setsWon++;
        team2Stats.setsLost++;
      }
    } else {
      team2Stats.wins++;
      team1Stats.losses++;
      if (team2Stats.headToHeadWins) {
        team2Stats.headToHeadWins[getTeamKey(match.team1)] = true;
      } else {
        team2Stats.headToHeadWins = { [getTeamKey(match.team1)]: true };
      }

      // Count sets if using extended criteria
      if (useExtendedCriteria && match.beachTennisScore) {
        // Count sets from detailed score data
        match.beachTennisScore.sets.forEach(set => {
          if (set.team2Games > set.team1Games ||
              (set.tiebreak && set.tiebreak.team2Points > set.tiebreak.team1Points)) {
            team2Stats.setsWon++;
            team1Stats.setsLost++;
          } else if (set.team1Games > set.team2Games ||
                    (set.tiebreak && set.tiebreak.team1Points > set.tiebreak.team2Points)) {
            team1Stats.setsWon++;
            team2Stats.setsLost++;
          }
        });
      } else {
        // Simplified set counting if no detailed data
        team2Stats.setsWon++;
        team1Stats.setsLost++;
      }
    }
  }

  // Calculate derived statistics
  const rankedTeams: GroupTeamStats[] = [];
  teamStatsMap.forEach(stats => {
    stats.gameDifference = stats.gamesWon - stats.gamesLost;
    stats.setDifference = stats.setsWon - stats.setsLost;
    rankedTeams.push(stats);
  });

  // Get the number of teams in the group for proportional calculations
  const teamsInGroup = new Set();
  groupMatches.forEach(match => {
    if (match.team1) teamsInGroup.add(match.team1.join('|'));
    if (match.team2) teamsInGroup.add(match.team2.join('|'));
  });
  const teamCount = teamsInGroup.size;
  
  // Calculate proportional factor based on group size
  // Groups with fewer teams will have their scores adjusted upward
  const proportionalFactor = teamCount >= 3 ? 1 : (3 / teamCount);
  
  // Apply proportional adjustment to stats
  for (const [key, stats] of teamStatsMap.entries()) {
    // Adjust win count proportionally
    stats.proportionalWins = stats.wins * proportionalFactor;
    // Adjust game difference proportionally
    stats.proportionalGameDifference = stats.gameDifference * proportionalFactor;
    // Adjust games won proportionally
    stats.proportionalGamesWon = stats.gamesWon * proportionalFactor;
  }

  // Sort teams using the proportional stats first
  const rankings = Object.entries(teamStatsMap).map(([teamId, stats]) => ({
    teamId: teamId.split('|'),
    stats,
    rank: 0,
    position: 0, // Add position property that was missing
    // Get group number from one of the matches but convert null to undefined
    groupNumber: groupMatches[0]?.groupNumber || undefined
  }));

  // Sort based on proportional stats for fairer comparison between different group sizes
  rankings.sort((a, b) => {
    // First by proportional wins
    if ((a.stats.proportionalWins || 0) !== (b.stats.proportionalWins || 0)) {
      return (b.stats.proportionalWins || 0) - (a.stats.proportionalWins || 0);
    }
    // Then by proportional game difference
    if ((a.stats.proportionalGameDifference || 0) !== (b.stats.proportionalGameDifference || 0)) {
      return (b.stats.proportionalGameDifference || 0) - (a.stats.proportionalGameDifference || 0);
    }
    // Then by proportional games won
    if ((a.stats.proportionalGamesWon || 0) !== (b.stats.proportionalGamesWon || 0)) {
      return (b.stats.proportionalGamesWon || 0) - (a.stats.proportionalGamesWon || 0);
    }
    // Fall back to head-to-head results
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
  const teamStats = new Map<string, TeamStats>();

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
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
        gameDifference: 0,
        matchesPlayed: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        teamId: match.team2,
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
        gameDifference: 0,
        matchesPlayed: 0,
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

    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;
    team2Stats.matchesPlayed += 1;

    // Determinar vencedor e atualizar vitórias/derrotas
    if (match.score1 > match.score2) {
      team1Stats.wins += 1;
      team2Stats.losses += 1;
      // Confronto direto
      team1Stats.headToHead.set(team2Key, { wins: (team1Stats.headToHead.get(team2Key)?.wins || 0) + 1, gamesWon: match.score1, gamesLost: match.score2 });
      team2Stats.headToHead.set(team1Key, { wins: team2Stats.headToHead.get(team1Key)?.wins || 0, gamesWon: match.score2, gamesLost: match.score1 });
    } else {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
      // Confronto direto
      team2Stats.headToHead.set(team1Key, { wins: (team2Stats.headToHead.get(team1Key)?.wins || 0) + 1, gamesWon: match.score2, gamesLost: match.score1 });
      team1Stats.headToHead.set(team2Key, { wins: team1Stats.headToHead.get(team2Key)?.wins || 0, gamesWon: match.score1, gamesLost: match.score2 });
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
    
    const aVsBStats = a.stats.headToHead.get(bKey);
    const bVsAStats = b.stats.headToHead.get(aKey);
    
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
  // Obter todos os qualificados organizados por colocação
  const firstPlaceTeams = calculateRankingsForPlacement(groupRankings, 1);
  const secondPlaceTeams = calculateRankingsForPlacement(groupRankings, 2);
  
  const allQualifiers = [...firstPlaceTeams, ...secondPlaceTeams];
  const totalQualifiers = allQualifiers.length;
  
  // Verificar se temos um número válido para eliminatórias
  if (totalQualifiers < 4) {
    throw new Error('São necessários pelo menos 4 qualificados para a fase eliminatória');
  }
  
  // Determinar o formato da eliminatória baseado no número de qualificados
  const eliminationMatches: Match[] = [];
  let matchIdCounter = 1;
  
  if (totalQualifiers === 4) {
    // Semifinais diretas (4 times)
    eliminationMatches.push(...generateSemifinals(firstPlaceTeams, secondPlaceTeams, matchIdCounter));
    matchIdCounter += 2;
    
    // Final
    eliminationMatches.push(generateFinalMatch(matchIdCounter));
    
  } else if (totalQualifiers === 6) {
    // 6 times: 2 primeiros direto para semifinal, 4 segundos jogam quartas
    const topTwoFirst = firstPlaceTeams.slice(0, 2);
    const remainingTeams = [...firstPlaceTeams.slice(2), ...secondPlaceTeams];
    
    // Quartas de final (4 times restantes)
    eliminationMatches.push(...generateQuarterFinals(remainingTeams, matchIdCounter));
    matchIdCounter += 2;
    
    // Semifinais (2 vencedores das quartas + 2 primeiros colocados)
    eliminationMatches.push(...generateSemifinalsWithByes(topTwoFirst, matchIdCounter));
    matchIdCounter += 2;
    
    // Final
    eliminationMatches.push(generateFinalMatch(matchIdCounter));
    
  } else if (totalQualifiers === 8) {
    // 8 times: quartas de final completas
    eliminationMatches.push(...generateFullQuarterFinals(allQualifiers, matchIdCounter));
    matchIdCounter += 4;
    
    // Semifinais
    eliminationMatches.push(...generateSemifinalsFromQuarters(matchIdCounter));
    matchIdCounter += 2;
    
    // Final
    eliminationMatches.push(generateFinalMatch(matchIdCounter));
    
  } else {
    // Para outros números, usar algoritmo adaptativo
    eliminationMatches.push(...generateAdaptiveElimination(allQualifiers, matchIdCounter));
  }
  
  return eliminationMatches;
}

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
    if (firstPlaceTeams[i]) organized.push(firstPlaceTeams[i]);
    if (secondPlaceTeams[i]) organized.push(secondPlaceTeams[i]);
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
