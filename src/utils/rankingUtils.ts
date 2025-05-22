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
        groupPosition: ranking.position, // Add the missing groupPosition property
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

  // Compare by set difference (ensure the property exists)
  if ((a.stats.setDifference || 0) !== (b.stats.setDifference || 0)) {
    return (b.stats.setDifference || 0) - (a.stats.setDifference || 0);
  }

  // Compare by sets won (ensure the property exists)
  if ((a.stats.setsWon || 0) !== (b.stats.setsWon || 0)) {
    return (b.stats.setsWon || 0) - (a.stats.setsWon || 0);
  }

  // If still tied, sort by ID for stability
  return a.teamId.join(',').localeCompare(b.teamId.join(','));
};

/**
 * Calculate rankings for teams that finished at a specific placement across all groups.
 * This is used to rank teams that finished at the same placement in different groups (like all 1st places).
 * 
 * @param groupRankings Rankings from each group
 * @param placementRank The placement to filter (1 = first place, 2 = second place, etc.)
 * @returns Array of sorted OverallRanking objects
 */
export const calculateRankingsForPlacement = (
  groupRankings: Record<number, GroupRanking[]>, 
  placementRank: number
): OverallRanking[] => {
  const teamsAtPlacement: OverallRanking[] = [];
  
  // Collect all teams at the specified placement from all groups
  Object.entries(groupRankings).forEach(([groupNumStr, rankings]) => {
    const groupNum = parseInt(groupNumStr);
    
    // Find the team at the specified placement in this group
    const teamAtPlacement = rankings.find(r => r.rank === placementRank);
    
    if (teamAtPlacement) {
      teamsAtPlacement.push({
        teamId: teamAtPlacement.teamId,
        rank: 0, // Will be calculated below
        groupNumber: groupNum,
        groupPosition: placementRank,
        stats: teamAtPlacement.stats
      });
    }
  });
  
  // Sort teams by their performance metrics
  teamsAtPlacement.sort((a, b) => {
    // Primary: Win percentage (wins / matchesPlayed)
    const aWinPercentage = a.stats.wins / (a.stats.matchesPlayed || 1);
    const bWinPercentage = b.stats.wins / (b.stats.matchesPlayed || 1);
    
    if (aWinPercentage !== bWinPercentage) {
      return bWinPercentage - aWinPercentage;
    }
    
    // Secondary: Game difference
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }
    
    // Tertiary: Games won
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }
    
    // If all else is equal, sort by group number (arbitrary but consistent)
    return a.groupNumber - b.groupNumber;
  });
  
  // Assign overall ranks
  teamsAtPlacement.forEach((team, index) => {
    team.rank = index + 1;
  });
  
  return teamsAtPlacement;
};

/**
 * Get ranked qualifiers from group rankings according to tournament rules.
 * This is typically used to select teams for the elimination bracket.
 * 
 * @param groupRankings Rankings from each group
 * @param qualifiersPerGroup Number of teams that qualify from each group
 * @returns Array of qualifying teams sorted by seeding rules
 */
export const getRankedQualifiers = (
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2
): OverallRanking[] => {
  // Use calculateRankingsForPlacement for each qualifying position
  let qualifiers: OverallRanking[] = [];
  
  for (let position = 1; position <= qualifiersPerGroup; position++) {
    const teamsAtPosition = calculateRankingsForPlacement(groupRankings, position);
    qualifiers = qualifiers.concat(teamsAtPosition);
  }
  
  return qualifiers;
};
