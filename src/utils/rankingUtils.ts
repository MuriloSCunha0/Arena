import { Match, GroupTeamStats, GroupRanking, OverallRanking } from '../types';
import { 
  calculateBeachTennisGroupRankings, 
  generateBeachTennisEliminationStructure,
  applyBeachTennisTiebreakerCriteria 
} from './beachTennisRules';

// Export the interfaces that are being imported by other files using 'export type'
export type { GroupRanking, OverallRanking } from '../types';

// Helper function to generate UUID (you might want to use a proper UUID library)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Interface para estatísticas de um time em um grupo
 * Using the imported type from types/index.ts
 */
export interface TeamStatistics extends GroupTeamStats {
  played: number;
  headToHead?: Map<string, { wins: number; gamesWon: number; gamesLost: number }>; // Make properties required
}

/**
 * Interface estendida para estatísticas de equipe incluindo confronto direto
 * Usada internamente para cálculos de ranking geral
 */
interface TeamStatisticsExtended extends TeamStatistics {
  groupNumber: number;
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
  draws: 0, // Add the missing draws property
  headToHeadWins: {},
});

/**
 * Calculates the ranking within a single group based on completed matches.
 * Implements complete ITF criteria for Beach Tennis tournaments.
 */
export const calculateGroupRankings = (
  matches: Match[], 
  useBeachTennisRules: boolean = true
): GroupRanking[] => {
  if (useBeachTennisRules) {
    return calculateBeachTennisGroupRankings(matches);
  }
  
  // Manter implementação original como fallback
  const teamStats = new Map<string, TeamStatistics>();

  // Process each completed match
  matches.forEach((match) => {
    if (!match.completed || !match.team1 || !match.team2 || 
        match.score1 === null || match.score2 === null) {
      return;
    }

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');

    // Initialize team statistics if not already present
    if (!teamStats.has(team1Key)) {
      teamStats.set(team1Key, {
        ...initializeTeamStats(match.team1),
        played: 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        ...initializeTeamStats(match.team2),
        played: 0,
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
      
      // Record head-to-head with required properties
      if (!team1Stats.headToHeadWins[team2Key]) {
        team1Stats.headToHeadWins[team2Key] = true;
      }
      
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: (team1Stats.headToHead.get(team2Key)?.wins || 0) + 1, 
          gamesWon: match.score1,  // Always provide gamesWon
          gamesLost: match.score2  // Always provide gamesLost
        });
      }
      
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: team2Stats.headToHead.get(team1Key)?.wins || 0, 
          gamesWon: match.score2,  // Always provide gamesWon
          gamesLost: match.score1  // Always provide gamesLost
        });
      }
    } else {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
      
      // Record head-to-head with required properties
      if (!team2Stats.headToHeadWins[team1Key]) {
        team2Stats.headToHeadWins[team1Key] = true;
      }
      
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: (team2Stats.headToHead.get(team1Key)?.wins || 0) + 1, 
          gamesWon: match.score2,  // Always provide gamesWon
          gamesLost: match.score1  // Always provide gamesLost
        });
      }
      
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: team1Stats.headToHead.get(team2Key)?.wins || 0, 
          gamesWon: match.score1,  // Always provide gamesWon
          gamesLost: match.score2  // Always provide gamesLost
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
    team: stats.teamId.join(' & '), // Add the team property
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
      // Use nullish coalescing to handle potential undefined values
      const aDirectGameDiff = (aVsBStats.gamesWon ?? 0) - (aVsBStats.gamesLost ?? 0);
      const bDirectGameDiff = (bVsAStats.gamesWon ?? 0) - (bVsAStats.gamesLost ?? 0);
      
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
 * @param useBeachTennisRules Whether to use Beach Tennis specific rules
 * @returns Estrutura de partidas para a fase eliminatória
 */
export function generateEliminationBracket(
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2,
  useBeachTennisRules: boolean = true
): Match[] {
  if (useBeachTennisRules) {
    // Obter duplas qualificadas seguindo regras do Beach Tennis
    const qualifiedTeams = getRankedQualifiers(groupRankings, qualifiersPerGroup);
    
    // Convert to Beach Tennis OverallRanking format
    const beachTennisQualified = qualifiedTeams.map(team => ({
      teamId: team.teamId,
      team: team.teamId.join(' & '), // Add the required team property
      rank: team.rank,
      stats: {
        wins: team.stats.wins,
        losses: team.stats.losses,
        matchesPlayed: team.stats.matchesPlayed,
        gamesWon: team.stats.gamesWon,
        gamesLost: team.stats.gamesLost,
        gameDifference: team.stats.gameDifference,
        groupNumber: team.groupNumber || 0,
        headToHead: team.stats.headToHead
      },
      groupNumber: team.groupNumber || 0
    }));
    
    // Aplicar critérios de desempate específicos do Beach Tennis
    const rankedTeams = applyBeachTennisTiebreakerCriteria(beachTennisQualified);
    
    // Gerar estrutura de eliminação seguindo regras do Beach Tennis
    return generateBeachTennisEliminationStructure(rankedTeams);
  }
  
  // Manter implementação original como fallback
  const matches: Match[] = [];
  const qualifiedTeams: string[][] = [];

  // Extract qualified teams from each group
  Object.values(groupRankings).forEach(rankings => {
    for (let i = 0; i < Math.min(qualifiersPerGroup, rankings.length); i++) {
      qualifiedTeams.push(rankings[i].teamId);
    }
  });

  if (qualifiedTeams.length < 2) {
    throw new Error('Pelo menos 2 times qualificados são necessários para a fase eliminatória');
  }

  // Generate bracket structure
  const totalTeams = qualifiedTeams.length;
  
  // Create first round matches
  let currentRound = 1;
  let currentPosition = 1;
  
  for (let i = 0; i < qualifiedTeams.length; i += 2) {
    if (i + 1 < qualifiedTeams.length) {
      matches.push({
        id: generateUUID(),
        tournamentId: '',
        eventId: '',
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
        id: generateUUID(),
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

/**
 * Extrai as duplas qualificadas de cada grupo e as ordena por ranking geral
 * Seguindo as regras do Beach Tennis
 */
function getRankedQualifiers(
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2
): OverallRanking[] {
  const qualifiedTeams: OverallRanking[] = [];

  // Extract qualified teams from each group
  Object.entries(groupRankings).forEach(([groupNum, rankings]) => {
    const groupNumber = parseInt(groupNum);
    for (let i = 0; i < Math.min(qualifiersPerGroup, rankings.length); i++) {
      const team = rankings[i];
      qualifiedTeams.push({
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
          groupNumber: groupNumber,
          headToHead: team.stats.headToHead
        },
        groupNumber: groupNumber,
        groupPosition: i + 1 // Position within the group
      });
    }
  });

  // Sort qualified teams by Beach Tennis criteria for overall ranking
  qualifiedTeams.sort((a, b) => {
    // 1. Group position (1st place teams first, then 2nd place teams)
    if (a.groupPosition !== b.groupPosition) {
      return (a.groupPosition || 0) - (b.groupPosition || 0);
    }

    // 2. Within same group position, sort by Beach Tennis criteria
    // Game difference (most important)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 3. Total games won
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 4. Fewest games lost
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 5. Most wins
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    return 0;
  });

  // Assign overall ranks
  qualifiedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  return qualifiedTeams;
}

/**
 * Calcula o ranking geral baseado em todas as partidas da fase de grupos
 * Seguindo as regras específicas do Beach Tennis
 */
export function calculateOverallGroupStageRankings(allGroupMatches: Match[]): OverallRanking[] {
  const teamStats = new Map<string, TeamStatisticsExtended>();

  // Process all group matches to build comprehensive statistics
  allGroupMatches.forEach((match) => {
    if (!match.completed || !match.team1 || !match.team2 || 
        match.score1 === null || match.score2 === null) {
      return;
    }

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');

    // Initialize team statistics if not already present
    if (!teamStats.has(team1Key)) {
      teamStats.set(team1Key, {
        ...initializeTeamStats(match.team1),
        played: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        ...initializeTeamStats(match.team2),
        played: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }

    const team1Stats = teamStats.get(team1Key)!;
    const team2Stats = teamStats.get(team2Key)!;

    // Update match statistics
    team1Stats.gamesWon += match.score1;
    team1Stats.gamesLost += match.score2;
    team1Stats.matchesPlayed += 1;
    team1Stats.played += 1;

    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;
    team2Stats.matchesPlayed += 1;
    team2Stats.played += 1;

    // Determine winner and update records
    if (match.score1 > match.score2) {
      team1Stats.wins += 1;
      team2Stats.losses += 1;
    } else if (match.score2 > match.score1) {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
    }

    // Calculate game difference (primary Beach Tennis criterion)
    team1Stats.gameDifference = team1Stats.gamesWon - team1Stats.gamesLost;
    team2Stats.gameDifference = team2Stats.gamesWon - team2Stats.gamesLost;
  });

  // Convert to OverallRanking format with proper type casting
  const rankings: OverallRanking[] = Array.from(teamStats.values()).map(stats => ({
    teamId: stats.teamId,
    team: stats.teamId.join(' & '),
    rank: 0, // Will be assigned after sorting
    stats: {
      wins: stats.wins,
      losses: stats.losses,
      matchesPlayed: stats.matchesPlayed,
      gamesWon: stats.gamesWon,
      gamesLost: stats.gamesLost,
      gameDifference: stats.gameDifference,
      groupNumber: stats.groupNumber,
      // Cast the headToHead to the expected type
      headToHead: stats.headToHead as Map<string, { wins: number; gamesWon: number; gamesLost: number }> | undefined
    },
    groupNumber: stats.groupNumber
  }));

  // Sort by Beach Tennis criteria
  rankings.sort((a, b) => {
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

    // 5. Most matches played (for consistency in irregular groups)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    return 0;
  });

  // Assign ranks considering ties
  let currentRank = 1;
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0) { // ✅ CORREÇÃO: Adicionado parênteses em volta da condição
      const current = rankings[i];
      const previous = rankings[i - 1];
      
      // Check if there's a tie in the main criteria
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
 * Export the function that was missing
 */
export function calculateRankingsForPlacement(
  matches: Match[],
  placementType: 'first' | 'second' | 'third'
): OverallRanking[] {
  // Filter matches based on placement type
  const relevantMatches = matches.filter(match => {
    // This would need specific logic based on how placements are determined
    // For now, return all matches
    return true;
  });

  return calculateOverallGroupStageRankings(relevantMatches);
}

/**
 * Atualiza o bracket eliminatório após uma partida ser completada
 * @param matches Array de todas as partidas do torneio
 * @param completedMatchId ID da partida que foi completada
 * @param winnerId ID do vencedor ('team1' ou 'team2')
 * @param winnerTeam Array com os IDs dos participantes vencedores
 * @returns Array atualizado de partidas
 */
export function updateEliminationBracket(
  matches: Match[],
  completedMatchId: string,
  winnerId: 'team1' | 'team2',
  winnerTeam: string[]
): Match[] {
  try {
    console.log(`🔄 [updateEliminationBracket] Updating bracket after match ${completedMatchId}`);
    
    // Find the completed match
    const completedMatch = matches.find(m => m.id === completedMatchId);
    if (!completedMatch) {
      console.warn(`⚠️ [updateEliminationBracket] Completed match not found: ${completedMatchId}`);
      return matches;
    }
    
    // Only process elimination matches
    if (completedMatch.stage !== 'ELIMINATION') {
      console.log(`ℹ️ [updateEliminationBracket] Match is not elimination stage, skipping`);
      return matches;
    }
    
    console.log(`📊 [updateEliminationBracket] Processing elimination match - Round: ${completedMatch.round}, Position: ${completedMatch.position}`);
    
    // Determine next round and position
    const nextRound = completedMatch.round + 1;
    const nextPosition = Math.ceil(completedMatch.position / 2);
    
    console.log(`🎯 [updateEliminationBracket] Looking for next match - Round: ${nextRound}, Position: ${nextPosition}`);
    
    // Find the next match where this winner should advance
    const nextMatchIndex = matches.findIndex(m => 
      m.stage === 'ELIMINATION' && 
      m.round === nextRound && 
      m.position === nextPosition
    );
    
    if (nextMatchIndex === -1) {
      console.log(`🏆 [updateEliminationBracket] No next match found - this might be the final match`);
      return matches; // No next match to update (probably final)
    }
    
    const nextMatch = matches[nextMatchIndex];
    console.log(`📝 [updateEliminationBracket] Found next match: ${nextMatch.id}`);
    
    // Determine which team slot to update in the next match
    // If current match position is odd, winner goes to team1, if even goes to team2
    const isTeam1Slot = completedMatch.position % 2 === 1;
    
    // Create updated matches array
    const updatedMatches = [...matches];
    const updatedNextMatch = { 
      ...nextMatch,
      updatedAt: new Date().toISOString()
    };
    
    if (isTeam1Slot) {
      updatedNextMatch.team1 = winnerTeam;
      console.log(`✅ [updateEliminationBracket] Updated team1 of match ${nextMatch.id} with winner: ${winnerTeam.join(' & ')}`);
    } else {
      updatedNextMatch.team2 = winnerTeam;
      console.log(`✅ [updateEliminationBracket] Updated team2 of match ${nextMatch.id} with winner: ${winnerTeam.join(' & ')}`);
    }
    
    updatedMatches[nextMatchIndex] = updatedNextMatch;
    
    return updatedMatches;
    
  } catch (error) {
    console.error('❌ [updateEliminationBracket] Error:', error);
    return matches; // Return original matches if error
  }
}

/**
 * Gera confrontos eliminatórios com afunilamento por ranking
 * 1º vs último, 2º vs penúltimo, evitando mesmo grupo na primeira rodada
 */
export function generateEliminationPairings(qualifiedTeams: OverallRanking[]): Match[] {
  const matches: Match[] = [];
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const used = new Set<number>();
  
  for (let i = 0; i < Math.floor(sortedTeams.length / 2); i++) {
    if (used.has(i)) continue;
    
    const bestTeam = sortedTeams[i];
    let worstTeamIndex = sortedTeams.length - 1 - i;
    
    // Procurar pior time disponível de grupo diferente
    while (worstTeamIndex > i && (
      used.has(worstTeamIndex) || 
      sortedTeams[worstTeamIndex].groupNumber === bestTeam.groupNumber
    )) {
      worstTeamIndex--;
    }
    
    if (worstTeamIndex <= i) {
      // Fallback: próximo disponível
      worstTeamIndex = i + 1;
      while (worstTeamIndex < sortedTeams.length && used.has(worstTeamIndex)) {
        worstTeamIndex++;
      }
    }
    
    if (worstTeamIndex < sortedTeams.length) {
      const worstTeam = sortedTeams[worstTeamIndex];
      
      matches.push({
        id: generateUUID(),
        team1: bestTeam.teamId,
        team2: worstTeam.teamId,
        score1: null,
        score2: null,
        completed: false,
        round: 1,
        groupNumber: null,
        winnerId: null,
        stage: 'ELIMINATION',
        eventId: '', // Será preenchido pelo contexto
        tournamentId: '', // Será preenchido pelo contexto
        position: matches.length + 1,
        scheduledTime: null
      });
      
      used.add(i);
      used.add(worstTeamIndex);
    }
  }
  
  return matches;
}

/**
 * Gera bracket eliminatório com BYE automático
 * BYEs vão para as duplas melhor rankeadas quando número ímpar
 */
export function generateEliminationBracketWithByes(qualifiedTeams: OverallRanking[]): Match[] {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  // Calcular próxima potência de 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const byesNeeded = nextPowerOf2 - totalTeams;
  
  const matches: Match[] = [];
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  // Criar partidas BYE para melhores duplas
  teamsWithByes.forEach((team, index) => {
    matches.push({
      id: generateUUID(),
      team1: team.teamId,
      team2: null, // BYE
      score1: null,
      score2: null,
      completed: true,
      round: 1,
      groupNumber: null,
      winnerId: 'team1',
      stage: 'ELIMINATION',
      eventId: '',
      tournamentId: '',
      position: index + 1,
      scheduledTime: null
    });
  });
  
  // Gerar confrontos para duplas restantes
  const regularPairings = generateEliminationPairings(teamsWithoutByes);
  matches.push(...regularPairings);
  
  return matches;
}

/**
 * Verifica se uma partida é BYE
 */
export function hasBye(match: Match): boolean {
  return match.team2 === null;
}

/**
 * Obtém o nome da dupla que avança em partida BYE
 */
export function getByeAdvancingTeam(match: Match): string[] | null {
  if (!hasBye(match)) return null;
  return match.team1;
}

/**
 * Gera o bracket eliminatório considerando BYEs manuais.
 * @param qualifiedTeams - Array de duplas classificadas (ordenadas por ranking)
 * @param byeTeams - Array de teamId[] das duplas que devem avançar direto para a próxima fase
 * @returns Array de partidas (Match[])
 */
export function generateEliminationBracketWithManualByes(
  qualifiedTeams: OverallRanking[],
  byeTeams: string[][]
): Match[] {
  // Helper para comparar arrays de teamId
  const isSameTeam = (a: string[], b: string[]) =>
  a.slice().sort().join('|') === b.slice().sort().join('|');

  // Separe as duplas BYE das demais
  const teamsWithByes = qualifiedTeams.filter(team =>
    byeTeams.some(bye => isSameTeam(bye, team.teamId))
  );
  const teamsWithoutByes = qualifiedTeams.filter(team =>
    !byeTeams.some(bye => isSameTeam(bye, team.teamId))
  );

  // Calcule o tamanho do chaveamento (potência de 2)
  const totalTeams = qualifiedTeams.length;
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const firstRoundTeamsCount = teamsWithoutByes.length;
  const firstRoundMatchesCount = Math.floor(firstRoundTeamsCount / 2);

  const matches: Match[] = [];
  let idx = 0;

  // 1. Crie as partidas da primeira rodada (apenas times SEM BYE)
  for (let i = 0; i < firstRoundMatchesCount; i++) {
    const team1 = teamsWithoutByes[idx++]?.teamId || [];
    const team2 = teamsWithoutByes[idx++]?.teamId || [];
    matches.push({
      id: generateUUID(),
      team1,
      team2,
      round: 1,
      position: i + 1,
      score1: null,
      score2: null,
      completed: false,
      winnerId: null,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      eventId: '',
      tournamentId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Descubra quantas vagas já estão ocupadas na próxima rodada (BYEs)
  const secondRoundTeams: string[][] = [];

  // Adicione todos os vencedores da primeira rodada (um para cada partida)
  for (let i = 0; i < firstRoundMatchesCount; i++) {
    secondRoundTeams.push([]); // TBD, será preenchido pelo vencedor
  }
  // Adicione os times BYE diretamente na próxima rodada
  for (const byeTeam of teamsWithByes) {
    secondRoundTeams.push(byeTeam.teamId);
  }

  // 3. Crie as partidas da segunda rodada (ex: quartas ou semifinais)
  const secondRoundMatchesCount = Math.floor(secondRoundTeams.length / 2);
  let pos = 1;
  for (let i = 0; i < secondRoundMatchesCount; i++) {
    const team1 = secondRoundTeams[i * 2];
    const team2 = secondRoundTeams[i * 2 + 1];
    matches.push({
      id: generateUUID(),
      team1,
      team2,
      round: 2,
      position: pos++,
      score1: null,
      score2: null,
      completed: false,
      winnerId: null,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      eventId: '',
      tournamentId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 4. Gere rodadas seguintes (semifinal, final, etc.) normalmente, sempre com "TBD"
  let prevRoundTeams = secondRoundTeams.length;
  let round = 3;
  while (prevRoundTeams > 1) {
    const matchesInRound = Math.floor(prevRoundTeams / 2);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: generateUUID(),
        team1: [],
        team2: [],
        round,
        position: i + 1,
        score1: null,
        score2: null,
        completed: false,
        winnerId: null,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
        eventId: '',
        tournamentId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    prevRoundTeams = matchesInRound;
    round++;
  }

  return matches;
}
