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
export function getRankedQualifiers(
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
  _placementType: 'first' | 'second' | 'third'
): OverallRanking[] {
  // Filter matches based on placement type
  const relevantMatches = matches.filter(_match => {
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
  _winnerId: 'team1' | 'team2',
  winnerTeam: string[]
): Match[] {
  try {
    console.log(`🔄 [updateEliminationBracket] Updating bracket after match ${completedMatchId}`);
    console.log(`🔄 [updateEliminationBracket] Winner team:`, winnerTeam);
    console.log(`🔄 [updateEliminationBracket] Total matches:`, matches.length);
    
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
      console.log(`🔍 [updateEliminationBracket] Available elimination matches:`, 
        matches.filter(m => m.stage === 'ELIMINATION').map(m => ({
          id: m.id,
          round: m.round,
          position: m.position,
          team1: m.team1,
          team2: m.team2
        }))
      );
      return matches; // No next match to update (probably final)
    }
    
    const nextMatch = matches[nextMatchIndex];
    console.log(`📝 [updateEliminationBracket] Found next match: ${nextMatch.id}`);
    console.log(`📝 [updateEliminationBracket] Next match current state:`, {
      team1: nextMatch.team1,
      team2: nextMatch.team2,
      round: nextMatch.round,
      position: nextMatch.position
    });
    
    // Determine which team slot to update in the next match
    // If current match position is odd, winner goes to team1, if even goes to team2
    const isTeam1Slot = completedMatch.position % 2 === 1;
    
    console.log(`📋 [updateEliminationBracket] Position ${completedMatch.position} is ${isTeam1Slot ? 'odd' : 'even'}, will update ${isTeam1Slot ? 'team1' : 'team2'}`);
    
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
    
    console.log(`🔄 [updateEliminationBracket] Match ${updatedNextMatch.id} updated successfully`);
    console.log(`🔄 [updateEliminationBracket] New state:`, {
      team1: updatedNextMatch.team1,
      team2: updatedNextMatch.team2
    });
    
    return updatedMatches;
    
  } catch (error) {
    console.error('❌ [updateEliminationBracket] Error:', error);
    return matches; // Return original matches if error
  }
}

/**
 * Gera bracket eliminatório com BYE inteligente
 * Nova lógica que posiciona BYEs em lados opostos da chave
 */
export function generateEliminationBracketWithSmartBye(
  qualifiedTeams: OverallRanking[]
): { matches: Match[]; metadata: any } {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  console.log(`🎾 [SMART BYE] Gerando bracket com ${totalTeams} duplas`);
  
  // Determinar estrutura do bracket
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const byesNeeded = nextPowerOf2 - totalTeams;
  
  const matches: Match[] = [];
  const metadata = {
    totalTeams,
    bracketSize: nextPowerOf2,
    byesNeeded,
    teamsWithByes: sortedTeams.slice(0, byesNeeded),
    bracketStructure: `${totalTeams} teams → ${nextPowerOf2} bracket (${byesNeeded} BYEs)`,
    byeStrategy: 'Os melhores times recebem BYE na primeira rodada disponível'
  };
  
  console.log(`📊 [SMART BYE] Bracket ${nextPowerOf2} - ${byesNeeded} BYEs para as melhores duplas`);
  
  if (byesNeeded === 0) {
    // Bracket completo sem BYEs
    console.log(`✅ [SMART BYE] Bracket completo sem BYEs necessários`);
    const pairings = generateOptimalPairings(sortedTeams);
    
    pairings.forEach((pair, index) => {
      matches.push(createMatch(pair[0].teamId, pair[1].teamId, 1, index + 1));
    });
    
    // 3. Gerar rodadas subsequentes com estrutura correta
    generateAdvancementRounds(matches, pairings.length);
    
  } else {
    // NOVA ESTRATÉGIA: BYEs na primeira rodada
    console.log(`� [SMART BYE] Implementando ${byesNeeded} BYEs na primeira rodada`);
    
    const teamsWithByes = sortedTeams.slice(0, byesNeeded);
    const teamsWithoutByes = sortedTeams.slice(byesNeeded);
    
    // Log das duplas com BYE
    teamsWithByes.forEach((team, teamIndex) => {
      console.log(`👑 [SMART BYE] BYE ${teamIndex + 1}: ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber})`);
    });
    
    // Calcular times que avançam para segunda rodada
    const teamsInSecondRound = byesNeeded + Math.floor(teamsWithoutByes.length / 2);
    console.log(`📊 Times na 2ª rodada: ${teamsInSecondRound} (${byesNeeded} BYEs + ${Math.floor(teamsWithoutByes.length / 2)} vencedores)`);
    
    // Primeira rodada: Criar apenas partidas reais (sem BYEs explícitos)
    let position = 1;
    
    // Criar partidas normais para times sem BYE
    if (teamsWithoutByes.length >= 2) {
      const normalPairs = generateOptimalPairings(teamsWithoutByes);
      
      normalPairs.forEach((pair) => {
        const match = createMatch(pair[0].teamId, pair[1].teamId, 1, position++);
        matches.push(match);
        console.log(`⚔️ [FIRST] R1-${match.position}: ${pair[0].rank}º vs ${pair[1].rank}º`);
      });
    }
    
    // 3. Gerar rodadas subsequentes com estrutura correta
    generateAdvancementRounds(matches, teamsInSecondRound, 2);
    
    // 4. Pré-alocar times com BYE na segunda rodada (EVITA TBDs)
    populateByeAdvancements(matches, teamsWithByes);
    
    console.log(`✅ [SMART BYE] Bracket otimizado criado sem TBDs desnecessários`);
  }
  
  console.log(`🏆 [SMART BYE] Bracket finalizado: ${matches.length} partidas total`);
  console.log(`📋 [SMART BYE] Metadata:`, metadata);
  
  return { matches, metadata };
}

/**
 * Gera confrontos otimizados respeitando ranking e evitando mesmo grupo
 */
function generateOptimalPairings(teams: OverallRanking[]): [OverallRanking, OverallRanking][] {
  const pairs: [OverallRanking, OverallRanking][] = [];
  const used = new Set<number>();
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  
  for (let i = 0; i < sortedTeams.length && used.size < sortedTeams.length; i++) {
    if (used.has(i)) continue;
    
    const bestTeam = sortedTeams[i];
    let worstTeamIndex = findOptimalOpponent(sortedTeams, i, used);
    
    if (worstTeamIndex !== -1) {
      const worstTeam = sortedTeams[worstTeamIndex];
      pairs.push([bestTeam, worstTeam]);
      used.add(i);
      used.add(worstTeamIndex);
    }
  }
  
  return pairs;
}

/**
 * Encontra o melhor oponente para uma dupla (preferindo grupos diferentes)
 */
function findOptimalOpponent(teams: OverallRanking[], currentIndex: number, used: Set<number>): number {
  const currentTeam = teams[currentIndex];
  
  // Primeiro: tentar encontrar do final da lista (afunilamento) de grupo diferente
  for (let i = teams.length - 1; i > currentIndex; i--) {
    if (!used.has(i) && teams[i].groupNumber !== currentTeam.groupNumber) {
      return i;
    }
  }
  
  // Segundo: qualquer disponível do final (afunilamento)
  for (let i = teams.length - 1; i > currentIndex; i--) {
    if (!used.has(i)) {
      return i;
    }
  }
  
  // Terceiro: próximo disponível
  for (let i = currentIndex + 1; i < teams.length; i++) {
    if (!used.has(i)) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Cria uma partida com estrutura padrão
 */
function createMatch(team1: string[], team2: string[], round: number, position: number): Match {
  return {
    id: generateUUID(),
    team1,
    team2,
    round,
    position,
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
  };
}

/**
 * Pré-popula times que receberam BYE na segunda rodada
 * Evita TBDs desnecessários ao alocar diretamente os times beneficiados
 */
function populateByeAdvancements(matches: Match[], teamsWithByes: OverallRanking[]): void {
  const secondRoundMatches = matches.filter(m => m.round === 2);
  
  teamsWithByes.forEach((team, index) => {
    if (index < secondRoundMatches.length) {
      const targetMatch = secondRoundMatches[index];
      
      // Preencher primeiro slot disponível, verificando se não é null
      if (targetMatch.team1 && targetMatch.team1.includes('TBD')) {
        targetMatch.team1 = team.teamId;
        console.log(`🎯 [BYE_ADVANCE] ${team.teamId.join(' & ')} pré-alocado na R2-${targetMatch.position} (team1)`);
      } else if (targetMatch.team2 && targetMatch.team2.includes('TBD')) {
        targetMatch.team2 = team.teamId;
        console.log(`🎯 [BYE_ADVANCE] ${team.teamId.join(' & ')} pré-alocado na R2-${targetMatch.position} (team2)`);
      }
    }
  });
}

/**
 * Gera rodadas de avanço com estrutura correta (substitui generateEmptyRounds)
 * CORRIGIDO: Usa placeholders específicos ao invés de arrays vazios
 */
function generateAdvancementRounds(matches: Match[], currentRoundTeams: number, startRound: number = 2): void {
  let round = startRound;
  let teamsInRound = currentRoundTeams;
  
  while (teamsInRound > 1) {
    const matchesInRound = Math.floor(teamsInRound / 2);
    
    for (let i = 0; i < matchesInRound; i++) {
      // CORRIGIDO: Criar partidas com placeholders específicos ao invés de arrays vazios
      const match = createMatch(['TBD'], ['TBD'], round, i + 1);
      matches.push(match);
      console.log(`🔄 [ADVANCE] R${round}-${i + 1}: Aguardando definição de confronto`);
    }
    
    teamsInRound = matchesInRound;
    round++;
  }
}

/**
 * Detecta empates no ranking geral que podem impactar a classificação
 */
export function detectTieBreaksInRanking(
  rankings: OverallRanking[],
  qualificationCutoff: number
): { 
  hasTieBreaks: boolean; 
  tiedTeams: OverallRanking[]; 
  affectsQualification: boolean 
} {
  const tiedTeams: OverallRanking[] = [];
  
  // Procurar por empates que afetam a linha de classificação
  for (let i = 0; i < rankings.length - 1; i++) {
    const current = rankings[i];
    const next = rankings[i + 1];
    
    // Verificar se estão empatados pelos critérios principais
    const areTied = (
      current.stats.gameDifference === next.stats.gameDifference &&
      current.stats.gamesWon === next.stats.gamesWon &&
      current.stats.gamesLost === next.stats.gamesLost &&
      current.stats.wins === next.stats.wins
    );
    
    if (areTied) {
      // Adicionar ambos os times empatados se ainda não estão na lista
      if (!tiedTeams.some(t => t.teamId.join('|') === current.teamId.join('|'))) {
        tiedTeams.push(current);
      }
      if (!tiedTeams.some(t => t.teamId.join('|') === next.teamId.join('|'))) {
        tiedTeams.push(next);
      }
    }
  }
  
  // Verificar se o empate afeta a classificação
  const affectsQualification = tiedTeams.some((team) => {
    const teamPosition = rankings.findIndex(r => r.teamId.join('|') === team.teamId.join('|')) + 1;
    return teamPosition <= qualificationCutoff + 1 && teamPosition >= qualificationCutoff - 1;
  });
  
  return {
    hasTieBreaks: tiedTeams.length > 0,
    tiedTeams: tiedTeams.sort((a, b) => a.rank - b.rank),
    affectsQualification
  };
}

/**
 * Remove uma dupla do ranking geral e recalcula as posições
 */
export function removeTeamFromRanking(
  rankings: OverallRanking[],
  teamToRemove: OverallRanking
): OverallRanking[] {
  const updatedRankings = rankings.filter(
    team => team.teamId.join('|') !== teamToRemove.teamId.join('|')
  );
  
  // Recalcular ranks
  updatedRankings.forEach((team, index) => {
    team.rank = index + 1;
  });
  
  return updatedRankings;
}

/**
 * Verifica se uma partida é um BYE (um dos times está ausente/null)
 */
export function hasBye(match: Match): boolean {
  return !match.team1 || !match.team2 || 
         match.team1.length === 0 || match.team2.length === 0 ||
         match.team1.includes('BYE') || match.team2.includes('BYE');
}

/**
 * Retorna o time que avança automaticamente em uma partida BYE
 */
export function getByeAdvancingTeam(match: Match): string[] | null {
  if (!hasBye(match)) {
    return null;
  }
  
  // Se team1 está presente e team2 não, team1 avança
  if (match.team1 && match.team1.length > 0 && !match.team1.includes('BYE')) {
    if (!match.team2 || match.team2.length === 0 || match.team2.includes('BYE')) {
      return match.team1;
    }
  }
  
  // Se team2 está presente e team1 não, team2 avança
  if (match.team2 && match.team2.length > 0 && !match.team2.includes('BYE')) {
    if (!match.team1 || match.team1.length === 0 || match.team1.includes('BYE')) {
      return match.team2;
    }
  }
  
  return null;
}

/**
 * Processa automaticamente todas as partidas BYE e avança os times qualificados
 * @param matches Array de partidas do torneio
 * @returns Array atualizado com BYEs processados
 */
export function processAllByes(matches: Match[]): Match[] {
  const updatedMatches = [...matches];
  let hasChanges = true;
  
  // Loop até que não haja mais BYEs para processar
  while (hasChanges) {
    hasChanges = false;
    
    for (let i = 0; i < updatedMatches.length; i++) {
      const match = updatedMatches[i];
      
      // Verificar se é um BYE não processado
      if (hasBye(match) && !match.completed) {
        const advancingTeam = getByeAdvancingTeam(match);
        
        if (advancingTeam) {
          console.log(`🚀 [BYE] Processando BYE - ${advancingTeam.join(' & ')} avança automaticamente`);
          
          // Marcar partida como completada
          updatedMatches[i] = {
            ...match,
            completed: true,
            winnerId: match.team1 && match.team1.length > 0 && !match.team1.includes('BYE') ? 'team1' : 'team2',
            score1: match.team1 && match.team1.length > 0 && !match.team1.includes('BYE') ? 1 : 0,
            score2: match.team2 && match.team2.length > 0 && !match.team2.includes('BYE') ? 1 : 0,
            updatedAt: new Date().toISOString()
          };
          
          // Avançar time para próxima rodada
          const updatedMatchesAfterAdvance = updateEliminationBracket(
            updatedMatches,
            match.id,
            match.team1 && match.team1.length > 0 && !match.team1.includes('BYE') ? 'team1' : 'team2',
            advancingTeam
          );
          
          // Atualizar array se houve mudanças
          if (updatedMatchesAfterAdvance !== updatedMatches) {
            updatedMatches.splice(0, updatedMatches.length, ...updatedMatchesAfterAdvance);
            hasChanges = true;
            break; // Reiniciar loop para verificar novos BYEs
          }
        }
      }
    }
  }
  
  return updatedMatches;
}

/**
 * Cria uma partida BYE explícita com time beneficiado
 * @param benefitedTeam Time que recebe o BYE
 * @param round Rodada da partida
 * @param position Posição na rodada
 * @returns Partida configurada como BYE
 */
export function createByeMatch(
  benefitedTeam: string[],
  round: number,
  position: number
): Match {
  return {
    id: generateUUID(),
    team1: benefitedTeam,
    team2: [], // Array vazio indica BYE
    round,
    position,
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
  };
}

/**
 * Verifica se um bracket tem BYEs pendentes de processamento
 * @param matches Array de partidas
 * @returns True se há BYEs não processados
 */
export function hasPendingByes(matches: Match[]): boolean {
  return matches.some(match => hasBye(match) && !match.completed);
}

/**
 * Obtém estatísticas detalhadas sobre BYEs em um bracket
 * @param matches Array de partidas do torneio
 * @returns Informações detalhadas sobre BYEs
 */
export function getByeStatistics(matches: Match[]): {
  totalByes: number;
  processedByes: number;
  pendingByes: number;
  byeMatches: Match[];
  teamsWithByes: string[][];
} {
  const byeMatches = matches.filter(match => hasBye(match));
  const processedByes = byeMatches.filter(match => match.completed);
  const pendingByes = byeMatches.filter(match => !match.completed);
  
  const teamsWithByes: string[][] = [];
  byeMatches.forEach(match => {
    const advancingTeam = getByeAdvancingTeam(match);
    if (advancingTeam && !teamsWithByes.some(team => 
      team.join('|') === advancingTeam.join('|')
    )) {
      teamsWithByes.push(advancingTeam);
    }
  });
  
  return {
    totalByes: byeMatches.length,
    processedByes: processedByes.length,
    pendingByes: pendingByes.length,
    byeMatches,
    teamsWithByes
  };
}

/**
 * Função utilitária para debug - mostra estrutura do bracket com BYEs
 * @param matches Array de partidas
 */
export function debugBracketStructure(matches: Match[]): void {
  console.log('\n🔍 [DEBUG] Estrutura do Bracket:');
  
  const rounds = new Map<number, Match[]>();
  matches.forEach(match => {
    if (!rounds.has(match.round)) {
      rounds.set(match.round, []);
    }
    rounds.get(match.round)!.push(match);
  });
  
  rounds.forEach((roundMatches, roundNumber) => {
    console.log(`\n📋 Rodada ${roundNumber}:`);
    roundMatches
      .sort((a, b) => a.position - b.position)
      .forEach(match => {
        const team1 = match.team1?.join(' & ') || 'TBD';
        const team2 = match.team2?.join(' & ') || 'TBD';
        const isBye = hasBye(match);
        const status = match.completed ? '✅' : '⏳';
        const byeFlag = isBye ? '🚀 BYE' : '';
        
        console.log(`  ${status} R${roundNumber}-${match.position}: ${team1} vs ${team2} ${byeFlag}`);
      });
  });
  
  const byeStats = getByeStatistics(matches);
  console.log(`\n📊 Estatísticas BYE:`);
  console.log(`  Total: ${byeStats.totalByes}`);
  console.log(`  Processados: ${byeStats.processedByes}`);
  console.log(`  Pendentes: ${byeStats.pendingByes}`);
  console.log(`  Times beneficiados: ${byeStats.teamsWithByes.map(t => t.join(' & ')).join(', ')}`);
}