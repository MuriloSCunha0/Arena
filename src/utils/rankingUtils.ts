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

// Define the missing GroupRanking interface
export interface GroupRanking {
  teamId: string[];
  rank: number;
  stats: GroupTeamStats;
  groupNumber?: number | null; // Update type to allow null
}

// Interface for the overall ranked list across all groups
export interface OverallRanking {
  rank: number;
  teamId: string[];
  stats: GroupTeamStats;
  group?: number; // Keep existing group property
  groupNum?: number; // Add groupNum property
  groupNumber?: number; // Add groupNumber property to match GroupRanking
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

  // Assign ranks
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });

  return rankings;
};

/**
 * Calculates overall rankings for all teams that completed the group stage.
 * @param allCompletedGroupMatches - Array of all completed matches from all groups.
 * @returns An array of OverallRanking objects, sorted by rank.
 */
export const calculateOverallGroupStageRankings = (allCompletedGroupMatches: Match[]): OverallRanking[] => {
  // First, group matches by group number
  const matchesByGroup: { [key: number]: Match[] } = {};
  allCompletedGroupMatches.forEach(match => {
    const groupNum = match.groupNumber || 0;
    if (!matchesByGroup[groupNum]) matchesByGroup[groupNum] = [];
    matchesByGroup[groupNum].push(match);
  });

  // Calculate rankings for each group
  const allGroupRankings: { [key: number]: GroupRanking[] } = {};
  Object.entries(matchesByGroup).forEach(([groupNum, matches]) => {
    allGroupRankings[Number(groupNum)] = calculateGroupRankings(matches);
  });

  // Collect all first-place teams, second-place teams, etc.
  const overallRankings: OverallRanking[] = [];
  Object.values(allGroupRankings).forEach(groupRankings => {
    groupRankings.forEach(ranking => {
      overallRankings.push({
        teamId: ranking.teamId,
        groupNumber: Number(ranking.groupNumber || 0),
        rank: ranking.rank,
        stats: ranking.stats,
      });
    });
  });

  // Sort using proportional values for fair comparison
  overallRankings.sort((a, b) => {
    // First by group rank
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    // Then by proportional wins
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
    return 0;
  });

  return overallRankings;
};

/**
 * Compare two team rankings for sorting with proper beach tennis ranking rules
 */
export const compareTeamRankings = (a: OverallRanking, b: OverallRanking): number => {
  // Compare by wins
  if (a.stats.wins !== b.stats.wins) return b.stats.wins - a.stats.wins;

  // Compare by game difference
  if (a.stats.gameDifference !== b.stats.gameDifference) return b.stats.gameDifference - a.stats.gameDifference;

  // Compare by games won
  if (a.stats.gamesWon !== b.stats.gamesWon) return b.stats.gamesWon - a.stats.gamesWon;

  // Compare by set difference
  if (a.stats.setDifference !== b.stats.setDifference) {
    return b.stats.setDifference - a.stats.setDifference;
  }

  // Compare by sets won
  if (a.stats.setsWon !== b.stats.setsWon) {
    return b.stats.setsWon - a.stats.setsWon;
  }

  // If still tied, sort by ID for stability
  return a.teamId.join(',').localeCompare(b.teamId.join(','));
};

/**
 * Get ranked qualifying teams based on position in their groups
 */
export const getRankedQualifiers = (
  groupRankings: Record<number, GroupRanking[]>,
  position: number // 1 for first place, 2 for second place, etc.
): OverallRanking[] => {
  const allQualifiers: OverallRanking[] = [];

  Object.entries(groupRankings).forEach(([groupNumber, rankings]) => {
    // Find the team at the specified position in this group
    const qualifier = rankings.find(r => r.rank === position);

    if (qualifier) {
      // Convert GroupRanking to OverallRanking
      allQualifiers.push({
        teamId: qualifier.teamId,
        group: parseInt(groupNumber),
        rank: 0, // Will be set after sorting
        stats: {
          ...qualifier.stats,
          matchesPlayed: qualifier.stats.wins + qualifier.stats.losses
        }
      });
    }
  });

  // Sort the qualifying teams by performance
  allQualifiers.sort(compareTeamRankings);

  // Assign overall ranks
  allQualifiers.forEach((team, index) => {
    team.rank = index + 1;
  });

  return allQualifiers;
};

/**
 * Calculate rankings for teams of a specific placement (1st, 2nd, 3rd) across all groups
 * and add the group number to each ranking for better display
 */
export const calculateRankingsForPlacement = (
  groupRankings: Record<number, GroupRanking[]>,
  placement: number
): OverallRanking[] => {
  const placementRankings: OverallRanking[] = [];

  // Collect teams of the specified placement from each group
  Object.entries(groupRankings).forEach(([groupNum, rankings]) => {
    const placedTeam = rankings.find(r => r.rank === placement);
    if (placedTeam) {
      placementRankings.push({
        teamId: placedTeam.teamId,
        group: parseInt(groupNum), // Store the group number
        groupNum: parseInt(groupNum), // Additional field for display purposes
        rank: 0, // Will be assigned after sorting
        stats: {
          ...placedTeam.stats,
          matchesPlayed: placedTeam.stats.wins + placedTeam.stats.losses
        }
      });
    }
  });

  // Sort teams according to beach tennis rules
  placementRankings.sort(compareTeamRankings);

  // Assign overall rank among teams of this placement
  placementRankings.forEach((team, index) => {
    team.rank = index + 1;
  });

  return placementRankings;
};

/**
 * Seeds teams into an elimination bracket based on beach tennis rules.
 * This function applies proper seeding to avoid early matchups between
 * teams from the same group and ensures balanced bracket distribution.
 * 
 * @param qualifiers - Array of qualified teams with their rankings
 * @param bracketSize - Size of the elimination bracket (must be a power of 2)
 * @returns Array of seeded positions with team IDs arranged for the bracket
 */
export const seedEliminationBracket = (
  qualifiers: OverallRanking[],
  bracketSize: number
): { position: number, teamId: string[] | null }[] => {
  // Ensure bracket size is a power of 2
  if (bracketSize & (bracketSize - 1)) {
    throw new Error("Bracket size must be a power of 2");
  }

  // Initialize all positions as empty (BYEs)
  const seededPositions: { position: number, teamId: string[] | null }[] = Array(bracketSize)
    .fill(null)
    .map((_, idx) => ({ position: idx + 1, teamId: null }));
  
  // Create a map to track teams by group for avoiding same-group early matchups
  const teamGroupMap = new Map<string, number>();
  qualifiers.forEach(q => {
    teamGroupMap.set(getTeamKey(q.teamId), q.groupNumber || q.group || 0);
  });

  // Sort qualifiers by rank (1st place teams first, then 2nd place, etc.)
  // and then by performance stats within each rank group
  const sortedQualifiers = [...qualifiers].sort((a, b) => {
    // First sort by rank (1st place, 2nd place, etc.)
    if (a.rank !== b.rank) {
      return a.rank - b.rank;
    }
    // Then by performance metrics
    return compareTeamRankings(a, b);
  });

  // Standard tournament seeding positions for bracket sizes up to 32
  // Key is seed number (1-based), value is position in bracket (0-based)
  const standardSeeds: Record<number, number[]> = {
    2: [0, 1],
    4: [0, 3, 2, 1],
    8: [0, 7, 4, 3, 2, 5, 6, 1],
    16: [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1],
    32: [0, 31, 16, 15, 8, 23, 24, 7, 4, 27, 20, 11, 12, 19, 28, 3,
         2, 29, 18, 13, 10, 21, 26, 5, 6, 25, 22, 9, 14, 17, 30, 1]
  };

  // Get the standard seeding positions for this bracket size
  const seedPositions = standardSeeds[bracketSize] || 
    // Generate for non-standard sizes (though tournaments typically use powers of 2)
    Array(bracketSize).fill(0).map((_, i) => i);

  // Assign qualified teams to their seeded positions
  sortedQualifiers.forEach((qualifier, idx) => {
    if (idx < bracketSize) {
      const position = seedPositions[idx];
      seededPositions[position].teamId = qualifier.teamId;
    }
  });

  // Check for and resolve first-round matchups between teams from the same group
  for (let i = 0; i < bracketSize; i += 2) {
    const position1 = i;
    const position2 = i + 1;
    
    const team1 = seededPositions[position1].teamId;
    const team2 = seededPositions[position2].teamId;
    
    // If both teams exist and are from the same group, try to swap team2 with another team
    if (team1 && team2) {
      const team1GroupId = teamGroupMap.get(getTeamKey(team1));
      const team2GroupId = teamGroupMap.get(getTeamKey(team2));
      
      if (team1GroupId !== undefined && team2GroupId !== undefined && team1GroupId === team2GroupId) {
        // Look for another opponent from a different group to swap with
        let swapped = false;
        
        // Try to swap with teams in other first-round matchups
        for (let j = 2; j < bracketSize && !swapped; j += 2) {
          const altPosition = j + 1; // Always try to swap with second team in pair
          const altTeam = seededPositions[altPosition].teamId;
          
          if (altTeam) {
            const altGroupId = teamGroupMap.get(getTeamKey(altTeam));
            
            // If alt team is from a different group than team1, we can swap
            if (altGroupId !== undefined && altGroupId !== team1GroupId) {
              // Swap team2 and altTeam
              const temp = seededPositions[position2].teamId;
              seededPositions[position2].teamId = seededPositions[altPosition].teamId;
              seededPositions[altPosition].teamId = temp;
              swapped = true;
            }
          }
        }
      }
    }
  }

  return seededPositions;
};

/**
 * Seeds teams for an elimination bracket based on their group rankings.
 * Uses standard tournament seeding to maximize the chances that the best teams
 * meet in the later rounds.
 * 
 * @param teams Array of teams to be seeded
 * @param numGroups Number of groups in the tournament
 * @returns Array of seeded teams in the order they should appear in the bracket
 */
export function seedEliminationBracketByGroups(teams: Team[]): Team[] {
  if (!teams || teams.length === 0) {
    return [];
  }

  // Sort teams by their group rank
  const sortedByGroup = [...teams].sort((a, b) => {
    // First by group rank (1st, 2nd, 3rd, etc.)
    if ((a.groupRank || 0) !== (b.groupRank || 0)) {
      return (a.groupRank || 999) - (b.groupRank || 999);
    }
    
    // Then by points
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    
    // Then by game difference
    const aDiff = a.gamesWon - a.gamesLost;
    const bDiff = b.gamesWon - b.gamesLost;
    if (aDiff !== bDiff) {
      return bDiff - aDiff;
    }
    
    // Finally by total games won
    return b.gamesWon - a.gamesWon;
  });

  // Group teams by their rank (all 1st place teams, all 2nd place teams, etc.)
  const groupedByRank: Record<number, Team[]> = {};
  
  for (const team of sortedByGroup) {
    if (team.groupRank === undefined) continue;
    if (!groupedByRank[team.groupRank]) {
      groupedByRank[team.groupRank] = [];
    }
    groupedByRank[team.groupRank].push(team);
  }

  // Calculate total number of teams in elimination stage
  const bracketSize = getNextPowerOfTwo(teams.length);
  
  // Create the seeded positions based on standard tournament seeding
  const seededPositions = createStandardSeedingPositions(bracketSize);
  
  // Assign teams to seeded positions
  const bracketTeams: (Team | null)[] = new Array(bracketSize).fill(null);
  
  // First, place all 1st place teams
  if (groupedByRank[1] && groupedByRank[1].length > 0) {
    const firstPlaceTeams = [...groupedByRank[1]];
    
    // Distribute 1st place teams into the bracket
    for (let i = 0; i < Math.min(firstPlaceTeams.length, seededPositions.length); i++) {
      bracketTeams[seededPositions[i] - 1] = firstPlaceTeams[i];
    }
  }
  
  // Then place 2nd place teams, ensuring they don't face 1st place teams from same group
  if (groupedByRank[2] && groupedByRank[2].length > 0) {
    const secondPlaceTeams = [...groupedByRank[2]];
    
    // Calculate positions for 2nd place teams
    // This ensures teams from the same group don't meet in the first round
    const availablePositions = seededPositions.filter((_, index) => !bracketTeams[seededPositions[index] - 1]);
    
    for (let i = 0; i < Math.min(secondPlaceTeams.length, availablePositions.length); i++) {
      // Find the best position for this team
      const team = secondPlaceTeams[i];
      let bestPosition = -1;
      
      // Try to find a position where team won't face a 1st place team from same group
      for (const pos of availablePositions) {
        // Calculate opponent's position (in a standard bracket, teams at positions i and (n-i+1) face each other)
        const opponentPos = bracketSize - pos + 1;
        const opponentIndex = opponentPos - 1;
        
        // If opponent position is not filled, or opponent is not from same group, this is a valid position
        if (!bracketTeams[opponentIndex] || bracketTeams[opponentIndex]?.groupNumber !== team.groupNumber) {
          bestPosition = pos;
          break;
        }
      }
      
      // If no ideal position found, just use the first available
      if (bestPosition === -1 && availablePositions.length > 0) {
        bestPosition = availablePositions[0];
      }
      
      // Place the team
      if (bestPosition !== -1) {
        const posIndex = availablePositions.indexOf(bestPosition);
        bracketTeams[bestPosition - 1] = team;
        availablePositions.splice(posIndex, 1);
      }
    }
  }
  
  // Fill remaining positions with 3rd place teams or empty slots (byes)
  if (groupedByRank[3] && groupedByRank[3].length > 0) {
    const thirdPlaceTeams = [...groupedByRank[3]];
    const remainingPositions = seededPositions.filter((pos) => !bracketTeams[pos - 1]);
    
    for (let i = 0; i < Math.min(thirdPlaceTeams.length, remainingPositions.length); i++) {
      bracketTeams[remainingPositions[i] - 1] = thirdPlaceTeams[i];
    }
  }
  
  // Return only non-null teams (actual teams in the order they should appear)
  return bracketTeams.filter((team): team is Team => team !== null);
}

/**
 * Creates standard tournament seeding positions for a bracket
 * 
 * @param size Size of the bracket (must be a power of 2)
 * @returns Array of positions in the order they should be seeded
 */
function createStandardSeedingPositions(size: number): number[] {
  if (size <= 1) return [1];
  
  const positions: number[] = [];
  const generatePositions = (start: number, end: number) => {
    if (start === end) {
      positions.push(start);
      return;
    }
    
    const middle = Math.floor((start + end) / 2);
    generatePositions(start, middle);
    generatePositions(middle + 1, end);
  };
  
  generatePositions(1, size);
  return positions;
}

/**
 * Gets the next power of 2 greater than or equal to n
 */
function getNextPowerOfTwo(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Creates elimination matches from a list of seeded teams
 * 
 * @param seededTeams Teams already ordered according to their seeds
 * @returns Array of matches for the first round of elimination
 */
export function createTournamentEliminationMatches(seededTeams: Team[]): Match[] {
  const totalTeams = seededTeams.length;
  const bracketSize = getNextPowerOfTwo(totalTeams);
  const matches: Match[] = [];
  
  // Create matches
  for (let i = 0; i < bracketSize / 2; i++) {
    // Calculate match position
    const position = i + 1;
    
    // Calculate team indices
    const team1Index = i;
    const team2Index = bracketSize - i - 1;
    
    // Check if teams exist or if there are byes
    const team1 = team1Index < seededTeams.length ? seededTeams[team1Index] : null;
    const team2 = team2Index < seededTeams.length ? seededTeams[team2Index] : null;
    
    // If both teams are null, skip this match
    if (!team1 && !team2) continue;
    
    // Create match with properly formed team arrays
    const match: Match = {
      id: `elimination-r1-${position}`,
      eventId: '',  // Will need to be set by caller
      tournamentId: '', // Will need to be set by caller
      team1: team1 ? [team1.player1, ...(team1.player2 ? [team1.player2] : [])] : null,
      team2: team2 ? [team2.player1, ...(team2.player2 ? [team2.player2] : [])] : null,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      scheduledTime: null,
      round: 1,
      position,
      stage: 'ELIMINATION',
      groupNumber: null
    };
    
    matches.push(match);
  }
  
  return matches;
}

/**
 * Generates the next round of elimination matches based on the results of the current round
 * 
 * @param currentRoundMatches Matches from the current round (must be completed)
 * @param round Round number for the new matches
 * @param eventId The event ID for the matches
 * @param tournamentId The tournament ID for the matches
 * @returns Array of matches for the next round
 */
export function generateTournamentEliminationRound(
  currentRoundMatches: Match[],
  round: number,
  eventId: string,
  tournamentId: string
): Match[] {
  if (!currentRoundMatches || currentRoundMatches.length === 0) {
    return [];
  }
  
  // Sort the current round matches by position
  const sortedMatches = [...currentRoundMatches].sort((a, b) => a.position - b.position);
  
  // Calculate the number of matches in the next round
  const nextRoundMatchCount = Math.floor(sortedMatches.length / 2);
  const nextRoundMatches: Match[] = [];
  
  for (let i = 0; i < nextRoundMatchCount; i++) {
    const position = i + 1;
    
    // Current round matches that feed into this next round match
    const match1 = sortedMatches[i * 2];
    const match2 = sortedMatches[i * 2 + 1];
    
    // Get the winners of those matches if they're completed
    const team1 = match1.completed && match1.winnerId 
      ? (match1.winnerId === 'team1' ? match1.team1 : match1.team2) 
      : null;
      
    const team2 = match2.completed && match2.winnerId 
      ? (match2.winnerId === 'team1' ? match2.team1 : match2.team2) 
      : null;
    
    // Create the new match
    const nextMatch: Match = {
      id: `elimination-r${round}-${position}`,
      eventId,
      tournamentId,
      team1,
      team2,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      scheduledTime: null,
      round,
      position,
      stage: 'ELIMINATION',
      groupNumber: null
    };
    
    nextRoundMatches.push(nextMatch);
  }
  
  return nextRoundMatches;
}

/**
 * Redistributes teams in groups to achieve better balance
 * 
 * @param teams Array of teams to be distributed
 * @param numGroups Number of groups to distribute teams into
 * @returns Record with groups as keys and arrays of teams as values
 */
export function redistributeGroupTeams(teams: Team[], numGroups: number): Record<number, Team[]> {
  if (!teams || teams.length === 0 || numGroups <= 0) {
    return {};
  }

  // Sort teams by some ranking criteria (e.g., historic performance, rating)
  const sortedTeams = [...teams].sort((a, b) => {
    // Sort by rating (if available)
    if (a.rating !== undefined && b.rating !== undefined) {
      return b.rating - a.rating;
    }
    
    // Or by any other criteria...
    return 0;
  });

  // Initialize groups
  const groups: Record<number, Team[]> = {};
  for (let i = 1; i <= numGroups; i++) {
    groups[i] = [];
  }

  // Distribute teams using snake pattern (1,2,3,3,2,1,1,2,3,...)
  let currentGroup = 1;
  let direction = 1; // 1 for increasing, -1 for decreasing

  for (const team of sortedTeams) {
    // Assign team to current group
    const updatedTeam: Team = {
      ...team,
      groupNumber: currentGroup,
      groupRank: 0, // Will be calculated later
      points: 0,
      gamesWon: 0,
      gamesLost: 0,
      wins: 0,
      losses: 0
    };
    
    groups[currentGroup].push(updatedTeam);

    // Move to next group
    currentGroup += direction;

    // Change direction if we've reached the first or last group
    if (currentGroup > numGroups) {
      currentGroup = numGroups;
      direction = -1;
    } else if (currentGroup < 1) {
      currentGroup = 1;
      direction = 1;
    }
  }

  return groups;
}
