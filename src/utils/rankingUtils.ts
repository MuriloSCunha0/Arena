import { Match } from '../types';

// Interface to represent a team's performance within a group
export interface GroupTeamStats {
  teamId: string[]; // Array of participant IDs representing the team
  wins: number;
  losses: number; // Optional, might be useful
  gamesWon: number;
  gamesLost: number;
  gameDifference: number;
  matchesPlayed: number;
  // Store head-to-head results against specific opponents
  headToHeadWins: { [opponentTeamKey: string]: boolean };
}

// Interface for the final ranked list within a group
export interface GroupRanking {
  rank: number;
  teamId: string[];
  stats: GroupTeamStats;
}

// Helper to create a unique key for a team (array of participant IDs)
const getTeamKey = (teamId: string[]): string => {
  return [...teamId].sort().join('|');
};

/**
 * Calculates the ranking within a single group based on completed matches.
 * Follows FCTBT Art. 18 rules.
 * @param groupMatches - Array of completed matches for a specific group.
 * @returns An array of GroupRanking objects, sorted by rank.
 */
export const calculateGroupRankings = (groupMatches: Match[]): GroupRanking[] => {
  const teamStatsMap = new Map<string, GroupTeamStats>();

  // 1. Calculate initial stats for each team
  for (const match of groupMatches) {
    if (!match.completed || !match.team1 || !match.team2 || match.winnerId === null) {
      continue; // Skip incomplete matches or matches without a winner (draws?)
    }

    const team1Key = getTeamKey(match.team1);
    const team2Key = getTeamKey(match.team2);
    const winnerKey = match.winnerId === 'team1' ? team1Key : team2Key;
    const loserKey = match.winnerId === 'team1' ? team2Key : team1Key;
    const winnerScore = match.winnerId === 'team1' ? match.score1 : match.score2;
    const loserScore = match.winnerId === 'team1' ? match.score2 : match.score1;

    // Initialize stats if team not seen before
    if (!teamStatsMap.has(team1Key)) {
      teamStatsMap.set(team1Key, { teamId: match.team1, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, gameDifference: 0, matchesPlayed: 0, headToHeadWins: {} });
    }
    if (!teamStatsMap.has(team2Key)) {
      teamStatsMap.set(team2Key, { teamId: match.team2, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, gameDifference: 0, matchesPlayed: 0, headToHeadWins: {} });
    }

    const winnerStats = teamStatsMap.get(winnerKey)!;
    const loserStats = teamStatsMap.get(loserKey)!;

    // Update stats
    winnerStats.wins++;
    winnerStats.gamesWon += winnerScore ?? 0;
    winnerStats.gamesLost += loserScore ?? 0;
    winnerStats.matchesPlayed++;
    winnerStats.headToHeadWins[loserKey] = true; // Record win against loser

    loserStats.losses++;
    loserStats.gamesWon += loserScore ?? 0;
    loserStats.gamesLost += winnerScore ?? 0;
    loserStats.matchesPlayed++;

    // Update game difference for both
    winnerStats.gameDifference = winnerStats.gamesWon - winnerStats.gamesLost;
    loserStats.gameDifference = loserStats.gamesWon - loserStats.gamesLost;
  }

  const rankedTeams: GroupRanking[] = [];
  const teamsToRank = Array.from(teamStatsMap.values());

  // 2. Sort teams based on FCTBT Art. 18 criteria
  teamsToRank.sort((a, b) => {
    // a) Number of Wins (descending)
    if (a.wins !== b.wins) {
      return b.wins - a.wins;
    }

    // b) Head-to-Head Result (if only two teams tied)
    // This check needs to be applied carefully, usually after initial sort if ties exist.
    // We'll handle multi-team ties below. For a simple 2-team tie:
    const aKey = getTeamKey(a.teamId);
    const bKey = getTeamKey(b.teamId);
    if (a.headToHeadWins[bKey]) return -1; // a beat b
    if (b.headToHeadWins[aKey]) return 1;  // b beat a

    // c) Game Difference (descending)
    if (a.gameDifference !== b.gameDifference) {
      return b.gameDifference - a.gameDifference;
    }

    // d) Number of Games Won (descending) - Less common, but a final tie-breaker
    if (a.gamesWon !== b.gamesWon) {
        return b.gamesWon - a.gamesWon;
    }

    // e) Draw/Lottery (if still tied - handle outside this sort function if needed)
    return 0; // Teams are considered tied at this point
  });

  // Handle multi-team ties (more complex scenario)
  // If multiple teams have the same number of wins, re-evaluate ONLY among them
  // based on matches played between ONLY the tied teams.
  // This requires a more complex recursive or iterative approach.
  // For now, the above sort covers the main criteria. A full implementation
  // would involve identifying tied groups and re-ranking within them.

  // 3. Assign Ranks
  let currentRank = 1;
  for (let i = 0; i < teamsToRank.length; i++) {
    // Check if the current team is tied with the previous one based on primary criteria
    if (i > 0 && (
        teamsToRank[i].wins !== teamsToRank[i-1].wins ||
        teamsToRank[i].gameDifference !== teamsToRank[i-1].gameDifference ||
        teamsToRank[i].gamesWon !== teamsToRank[i-1].gamesWon
        // Note: Head-to-head for 2 teams is handled in sort, multi-team needs more logic
    )) {
      currentRank = i + 1;
    }
    rankedTeams.push({
      rank: currentRank,
      teamId: teamsToRank[i].teamId,
      stats: teamsToRank[i],
    });
  }

  return rankedTeams;
};
