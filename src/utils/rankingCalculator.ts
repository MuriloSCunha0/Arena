import { Match } from '../types';
import { GroupRanking, TournamentMatch } from '../types/tournament';

interface ExtendedGroupRanking extends GroupRanking {
  teamId: string[];
  matchesPlayed: number;
  rank?: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  setPercentage?: number;
  gamePercentage?: number;
  h2hWinsAgainstTied?: number;
  directMatchups: Record<string, boolean>; // true if won against the team with this ID
  teamIds: string; // for comparison
  groupNumber: number;
  tiebreakerPoints?: number; // For seeding calculations
}

interface RankingOptions {
  useExtendedCriteria?: boolean; // Use ITF criteria
  avoidSameGroupMatchups?: boolean; // Avoid teams from same group meeting in first round
  seedPlacement?: 'strength' | 'group' // How to seed teams ('strength' by performance or 'group' by qualifiers)
}

/**
 * Calculate group rankings based on match results
 * Implementing ITF criteria for tiebreaks:
 * 1. Most matches won
 * 2. Head-to-head result
 * 3. Highest percentage of sets won
 * 4. Highest percentage of games won
 * 5. Drawing of lots or tournament committee decision
 */
export function calculateGroupRankings(
  matches: Match[], 
  options: RankingOptions = {}
): ExtendedGroupRanking[] {
  const { useExtendedCriteria = true } = options;
  
  // Initialize rankings map
  const rankings: Record<string, ExtendedGroupRanking> = {};
  
  // Process matches
  matches.forEach(match => {
    if (!match.completed || !match.team1 || !match.team2) return;
    
    const team1Id = match.team1.sort().join(',');
    const team2Id = match.team2.sort().join(',');
    
    // Initialize team rankings if they don't exist
    if (!rankings[team1Id]) {
      rankings[team1Id] = {
        id: team1Id,
        teamId: match.team1,
        wins: 0,
        losses: 0,
        scored: 0,
        conceded: 0,
        matchesPlayed: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        directMatchups: {},
        teamIds: team1Id,
        groupNumber: match.groupNumber || 0,
        tiebreakerPoints: 0
      };
    }
    
    if (!rankings[team2Id]) {
      rankings[team2Id] = {
        id: team2Id,
        teamId: match.team2,
        wins: 0,
        losses: 0,
        scored: 0,
        conceded: 0,
        matchesPlayed: 0,
        setsWon: 0,
        setsLost: 0,
        gamesWon: 0,
        gamesLost: 0,
        directMatchups: {},
        teamIds: team2Id,
        groupNumber: match.groupNumber || 0,
        tiebreakerPoints: 0
      };
    }
    
    // Update match stats
    rankings[team1Id].matchesPlayed++;
    rankings[team2Id].matchesPlayed++;
    
    // Basic stats (always tracked)
    rankings[team1Id].scored += match.score1 || 0;
    rankings[team1Id].conceded += match.score2 || 0;
    rankings[team2Id].scored += match.score2 || 0;
    rankings[team2Id].conceded += match.score1 || 0;
    
    // Determine winner and update records
    if (match.winnerId === 'team1') {
      rankings[team1Id].wins++;
      rankings[team2Id].losses++;
      rankings[team1Id].directMatchups[team2Id] = true;
      
      // Store extended stats if needed
      if (useExtendedCriteria) {
        // Parse Beach Tennis scores - if it's stored in the match data
        if (match.beachTennisScore) {
          const btScore = match.beachTennisScore;
          btScore.sets.forEach(set => {
            if (set.team1Games === 0 && set.team2Games === 0) return; // Skip empty sets
            
            rankings[team1Id].gamesWon += set.team1Games;
            rankings[team1Id].gamesLost += set.team2Games;
            rankings[team2Id].gamesWon += set.team2Games;
            rankings[team2Id].gamesLost += set.team1Games;
            
            // Count sets won
            if ((set.team1Games > set.team2Games) || 
                (set.tiebreak && set.tiebreak.team1Points > set.tiebreak.team2Points)) {
              rankings[team1Id].setsWon++;
              rankings[team2Id].setsLost++;
            } else if ((set.team2Games > set.team1Games) || 
                      (set.tiebreak && set.tiebreak.team2Points > set.tiebreak.team1Points)) {
              rankings[team2Id].setsWon++;
              rankings[team1Id].setsLost++;
            }
          });
        } else {
          // Fallback to basic scores if no detailed data
          rankings[team1Id].setsWon++;
          rankings[team2Id].setsLost++;
          rankings[team1Id].gamesWon += match.score1 || 0;
          rankings[team1Id].gamesLost += match.score2 || 0;
          rankings[team2Id].gamesWon += match.score2 || 0;
          rankings[team2Id].gamesLost += match.score1 || 0;
        }
      }
    } else if (match.winnerId === 'team2') {
      rankings[team2Id].wins++;
      rankings[team1Id].losses++;
      rankings[team2Id].directMatchups[team1Id] = true;
      
      // Store extended stats if needed
      if (useExtendedCriteria) {
        // Parse Beach Tennis scores - if it's stored in the match data
        if (match.beachTennisScore) {
          const btScore = match.beachTennisScore;
          btScore.sets.forEach(set => {
            if (set.team1Games === 0 && set.team2Games === 0) return; // Skip empty sets
            
            rankings[team1Id].gamesWon += set.team1Games;
            rankings[team1Id].gamesLost += set.team2Games;
            rankings[team2Id].gamesWon += set.team2Games;
            rankings[team2Id].gamesLost += set.team1Games;
            
            // Count sets won
            if ((set.team1Games > set.team2Games) || 
                (set.tiebreak && set.tiebreak.team1Points > set.tiebreak.team2Points)) {
              rankings[team1Id].setsWon++;
              rankings[team2Id].setsLost++;
            } else if ((set.team2Games > set.team1Games) || 
                      (set.tiebreak && set.tiebreak.team2Points > set.tiebreak.team1Points)) {
              rankings[team2Id].setsWon++;
              rankings[team1Id].setsLost++;
            }
          });
        } else {
          // Fallback to basic scores if no detailed data
          rankings[team2Id].setsWon++;
          rankings[team1Id].setsLost++;
          rankings[team1Id].gamesWon += match.score1 || 0;
          rankings[team1Id].gamesLost += match.score2 || 0;
          rankings[team2Id].gamesWon += match.score2 || 0;
          rankings[team2Id].gamesLost += match.score1 || 0;
        }
      }
    }
  });
  
  // Convert to array for sorting
  const rankingsArray = Object.values(rankings);
  
  // Identify teams tied by wins to process head-to-head ties properly
  const teamsByWins: Record<number, ExtendedGroupRanking[]> = {};
  rankingsArray.forEach(team => {
    if (!teamsByWins[team.wins]) {
      teamsByWins[team.wins] = [];
    }
    teamsByWins[team.wins].push(team);
  });
  
  // Process tied teams based on head-to-head records
  Object.values(teamsByWins).forEach(tiedTeams => {
    // Skip if no tie (only one team with this number of wins)
    if (tiedTeams.length <= 1) return;
    
    // If there are 3+ teams with the same wins, use percentage of sets/games
    // to tiebreak when direct head-to-head doesn't resolve the tie
    if (tiedTeams.length > 2 && useExtendedCriteria) {
      // For each team, calculate percentage of sets and games won
      tiedTeams.forEach(team => {
        const totalSets = team.setsWon + team.setsLost;
        const totalGames = team.gamesWon + team.gamesLost;
        
        // Store percentages for tiebreaker calculations
        team.setPercentage = totalSets > 0 ? team.setsWon / totalSets : 0;
        team.gamePercentage = totalGames > 0 ? team.gamesWon / totalGames : 0;
        
        // Count head-to-head wins against other tied teams
        team.h2hWinsAgainstTied = 0;
        tiedTeams.forEach(opponent => {
          if (team !== opponent && team.directMatchups[opponent.teamIds]) {
            team.h2hWinsAgainstTied = (team.h2hWinsAgainstTied || 0) + 1;
          }
        });
      });
    }
  });
  
  // Full ranking sort with all ITF criteria
  rankingsArray.sort((a, b) => {
    // Primary: most wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    
    // Secondary: For teams tied in wins, check head-to-head in relevant scenarios
    
    // Handle 2-way ties with head-to-head
    if (teamsByWins[a.wins].length === 2) {
      // Direct head-to-head between the two teams
      if (a.directMatchups[b.teamIds]) return -1;
      if (b.directMatchups[a.teamIds]) return 1;
    }
    
    // Handle 3+ team ties with same number of wins
    if (teamsByWins[a.wins].length > 2 && useExtendedCriteria) {
      // First, compare head-to-head wins against other tied teams
      if ((a.h2hWinsAgainstTied || 0) !== (b.h2hWinsAgainstTied || 0)) {
        return (b.h2hWinsAgainstTied || 0) - (a.h2hWinsAgainstTied || 0);
      }
    }
    
    if (useExtendedCriteria) {
      // Tertiary: Percentage of sets won
      const aSetPercentage = a.setPercentage || (a.setsWon / (a.setsWon + a.setsLost) || 0);
      const bSetPercentage = b.setPercentage || (b.setsWon / (b.setsWon + b.setsLost) || 0);
      if (aSetPercentage !== bSetPercentage) {
        return bSetPercentage - aSetPercentage;
      }
      
      // Quaternary: Percentage of games won
      const aGamePercentage = a.gamePercentage || (a.gamesWon / (a.gamesWon + a.gamesLost) || 0);
      const bGamePercentage = b.gamePercentage || (b.gamesWon / (b.gamesWon + b.gamesLost) || 0);
      if (aGamePercentage !== bGamePercentage) {
        return bGamePercentage - aGamePercentage;
      }
    } else {
      // Fallback to simpler tiebreakers if not using extended criteria
      
      // Points difference
      const aDiff = a.scored - a.conceded;
      const bDiff = b.scored - b.conceded;
      if (bDiff !== aDiff) return bDiff - aDiff;
      
      // Total points scored
      if (b.scored !== a.scored) return b.scored - a.scored;
    }
    
    // If still tied, maintain order for consistency (could be randomized later)
    return a.teamIds.localeCompare(b.teamIds);
  });
  
  // Assign ranks
  rankingsArray.forEach((ranking, index) => {
    ranking.rank = index + 1;
  });
  
  return rankingsArray;
}

/**
 * Generate tournament bracket with seeding based on rankings
 */
export function generateEliminationBracketWithSeeding(
  qualifiers: ExtendedGroupRanking[],
  rankings: Record<string, number>, // Official player rankings
  bracketSize: number
) {
  // Step 1: Calculate team seeds based on player rankings
  const teamsWithRankings = qualifiers.map(team => {
    // Sum the rankings of both team members
    const teamRanking = team.teamId.reduce((sum, playerId) => 
      sum + (rankings[playerId] || 10000), // Use a high default for unranked players
      0
    );
    
    return {
      ...team,
      ranking: teamRanking
    };
  });
  
  // Step 2: Sort teams by ranking (lowest is best)
  const seededTeams = [...teamsWithRankings].sort((a, b) => a.ranking - b.ranking);
  
  // Step 3: Calculate seed positions based on bracket size
  const seedPositions = calculateSeedPositions(bracketSize);
  
  // Step 4: Create the bracket with seeds in proper positions
  const bracket: any[] = new Array(bracketSize).fill(null);
  
  // Place seeds in their positions
  seededTeams.forEach((team, index) => {
    if (index < seedPositions.length) {
      bracket[seedPositions[index]] = {
        team,
        position: seedPositions[index]
      };
    }
  });
  
  // Step 5: Place remaining teams, avoiding same-group matches where possible
  const unseededTeams = seededTeams.slice(seedPositions.length);
  const unseededPositions = Array.from({ length: bracketSize }, (_, i) => i)
    .filter(pos => !seedPositions.includes(pos));
  
  // This algorithm attempts to place teams to avoid first-round same-group matchups
  // For a complete implementation, you would need to test all combinations
  unseededTeams.forEach((team, index) => {
    // Try to find a position where this team doesn't play against someone from their group
    let bestPosition = -1;
    let foundNonGroupMatch = false;
    
    for (const position of unseededPositions) {
      // Determine opponent position
      const opponentPosition = getFirstRoundOpponentPosition(position, bracketSize);
      const opponent = bracket[opponentPosition]?.team;
      
      // If no opponent yet or opponent from different group
      if (!opponent || opponent.groupNumber !== team.groupNumber) {
        bestPosition = position;
        foundNonGroupMatch = true;
        break;
      }
      
      // Otherwise, keep track of a fallback position
      if (bestPosition === -1) bestPosition = position;
    }
    
    if (bestPosition !== -1) {
      // Remove the position we're using
      const posIndex = unseededPositions.indexOf(bestPosition);
      if (posIndex !== -1) unseededPositions.splice(posIndex, 1);
      
      // Place the team
      bracket[bestPosition] = {
        team,
        position: bestPosition
      };
    }
  });
  
  return bracket;
}

/**
 * Calculate seed positions in a bracket
 */
function calculateSeedPositions(bracketSize: number): number[] {
  const positions = [];
  const rounds = Math.log2(bracketSize);
  
  // First seed at top
  positions.push(0);
  
  // Second seed at bottom
  positions.push(bracketSize - 1);
  
  // For larger brackets, add more seed positions
  if (rounds >= 3) { // 8+ team bracket
    // Seeds 3-4 in middle sections
    positions.push(bracketSize / 2);
    positions.push(bracketSize / 2 - 1);
  }
  
  if (rounds >= 4) { // 16+ team bracket
    // Seeds 5-8
    positions.push(bracketSize / 4);
    positions.push(bracketSize * 3 / 4);
    positions.push(bracketSize / 4 - 1);
    positions.push(bracketSize * 3 / 4 - 1);
  }
  
  return positions;
}

/**
 * Get the position of the first round opponent
 */
function getFirstRoundOpponentPosition(position: number, bracketSize: number): number {
  return bracketSize - 1 - position;
}

/**
 * Function to avoid same-group matchups in first elimination round
 */
export function avoidSameGroupMatchups(
  bracket: any[],
  groupAssignments: Record<string, number>
): any[] {
  const bracketSize = bracket.length;
  const result = [...bracket];
  
  // Check for first round same-group matchups
  for (let i = 0; i < bracketSize / 2; i++) {
    const pos1 = i;
    const pos2 = bracketSize - 1 - i;
    
    const team1 = result[pos1]?.team;
    const team2 = result[pos2]?.team;
    
    // Skip if either position doesn't have a team yet
    if (!team1 || !team2) continue;
    
    // Check if teams are from the same group
    if (team1.groupNumber === team2.groupNumber) {
      // Need to swap team2 with another team
      let swapped = false;
      
      // Try to find another team to swap with
      for (let j = 0; j < bracketSize / 2; j++) {
        // Skip the current matchup
        if (j === i) continue;
        
        const altPos = bracketSize - 1 - j;
        const altTeam = result[altPos]?.team;
        
        // Skip if no team in this position
        if (!altTeam) continue;
        
        // Check if swapping would resolve the issue
        if (team1.groupNumber !== altTeam.groupNumber && 
            team2.groupNumber !== result[j]?.team?.groupNumber) {
          // Swap team2 and altTeam
          const temp = result[pos2];
          result[pos2] = result[altPos];
          result[altPos] = temp;
          swapped = true;
          break;
        }
      }
      
      // If no swap was possible, we keep the original matchup
      if (!swapped) {
        console.log("Could not avoid same-group matchup in first round");
      }
    }
  }
  
  return result;
}
