import { GroupRanking, OverallRanking } from '../utils/rankingUtils';
import { supabase } from '../lib/supabase';

// Declare the fetchTournament function if it's defined elsewhere in this file
// If not, you need to import it or implement it
const fetchTournament = async (tournamentId: string): Promise<void> => {
  // Implementation goes here if not imported
  // This is a placeholder - replace with actual implementation if needed
};

// Update the function signature to match what we're calling
export const generateEliminationBracket = async (
  tournamentId: string,
  seedingData: {
    firstPlaceTeams: OverallRanking[];
    secondPlaceTeams: OverallRanking[];
    groupRankings: Record<number, GroupRanking[]>;
  }
): Promise<void> => {
  // Implement beach tennis seeding rules
  const { firstPlaceTeams, secondPlaceTeams, groupRankings } = seedingData;
  
  try {
    // Step 1: Determine the bracket size based on qualified teams
    const totalQualifiers = firstPlaceTeams.length + secondPlaceTeams.length;
    let bracketSize = 2;
    
    while (bracketSize < totalQualifiers) {
      bracketSize *= 2;
    }
    
    // Step 2: Determine byes (if bracket not completely filled)
    const byesCount = bracketSize - totalQualifiers;
    
    // Step 3: Create seedings according to rules
    
    // Create team ID map to track which group each team came from
    const teamGroupMap = new Map<string, number>();
    
    Object.entries(groupRankings).forEach(([groupNum, rankings]) => {
      rankings.forEach(entry => {
        const teamIdString = entry.teamId.join('|');
        teamGroupMap.set(teamIdString, parseInt(groupNum));
      });
    });
    
    // Create the seeding array with proper bracket positions
    const seeds: Array<{
      position: number;
      teamIds: string[];
      isBye: boolean;
      fromGroup: number | null;
      rank: number;
    }> = [];
    
    // First, place the first place teams at specific positions following beach tennis rules
    // First place teams should be at the "corners" of the bracket to avoid meeting early
    firstPlaceTeams.forEach((team, index) => {
      let position: number;
      
      // Position assignment based on beach tennis rules:
      // - Top seed at position 1 (top of bracket)
      // - 2nd seed at bottom position (bracketSize)
      // - 3rd and 4th seeds at "quarter points"
      if (index === 0) {
        position = 1; // Top seed (1st) at top position
      } else if (index === 1) {
        position = bracketSize; // 2nd seed at bottom position
      } else if (index === 2) {
        position = Math.floor(bracketSize / 2) + 1; // 3rd seed at upper mid
      } else if (index === 3) {
        position = Math.floor(bracketSize / 2); // 4th seed at lower mid
      } else {
        // For additional seeds, distribute them in a balanced way
        // according to standard tournament seeding
        const sectionSize = bracketSize / Math.pow(2, Math.floor(index / 4) + 2);
        const offsetInSection = (index % 4);
        const basePosition = (Math.floor(index / 4) * 2 + 1) * sectionSize;
        
        if (offsetInSection === 0) position = basePosition;
        else if (offsetInSection === 1) position = basePosition + sectionSize;
        else if (offsetInSection === 2) position = basePosition - sectionSize / 2;
        else position = basePosition + sectionSize / 2;
        
        position = Math.round(position);
      }
      
      // Get the team's original group
      const fromGroup = teamGroupMap.get(team.teamId.join('|')) || null;
      
      seeds.push({
        position,
        teamIds: team.teamId,
        isBye: false,
        fromGroup,
        rank: index + 1
      });
    });
    
    // Now place second place teams, avoiding early matchups with teams from their group
    secondPlaceTeams.forEach((team, index) => {
      const fromGroup = teamGroupMap.get(team.teamId.join('|')) || null;
      
      // We need to find positions that:
      // 1. Don't match them against teams from the same group in early rounds
      // 2. Are still balanced for the overall bracket
      
      // Try to find available positions that don't violate group separation rule
      const availablePositions = [];
      for (let i = 1; i <= bracketSize; i++) {
        // Skip positions already taken
        if (seeds.some(seed => seed.position === i)) continue;
        
        // Calculate first-round opponent position
        const opponentPosition = i % 2 === 1 ? i + 1 : i - 1;
        
        // Get the opponent if position is already assigned
        const potentialOpponent = seeds.find(seed => seed.position === opponentPosition);
        
        // Don't match teams from the same group in first round
        if (potentialOpponent && potentialOpponent.fromGroup === fromGroup) continue;
        
        availablePositions.push(i);
      }
      
      // If we have options, use them; otherwise fallback to any available position
      let position: number = 0; // Initialize with default value to prevent "used before assigned" error
      
      if (availablePositions.length > 0) {
        // Choose the position that best balances the bracket
        // For simplicity, take the first available option
        position = availablePositions[0];
      } else {
        // Fallback: just find any open position
        for (let i = 1; i <= bracketSize; i++) {
          if (!seeds.some(seed => seed.position === i)) {
            position = i;
            break;
          }
        }
      }
      
      seeds.push({
        position,
        teamIds: team.teamId,
        isBye: false,
        fromGroup,
        rank: firstPlaceTeams.length + index + 1
      });
    });
    
    // Handle byes allocation according to beach tennis rules
    // - Best first place team gets a bye if there are byes to allocate
    if (byesCount > 0) {
      // First, determine positions that would face top seeds in the first round
      const topSeedOpponents = [];
      
      // Find positions for opponent of 1st seed
      if (seeds.find(s => s.rank === 1)) {
        const firstSeedPos = seeds.find(s => s.rank === 1)!.position;
        const opponentPos = firstSeedPos % 2 === 1 ? firstSeedPos + 1 : firstSeedPos - 1;
        topSeedOpponents.push(opponentPos);
      }
      
      // Fill byes in priority order: first against top seed, then second seed, etc.
      let byesRemaining = byesCount;
      
      for (const byePosition of topSeedOpponents) {
        if (byesRemaining > 0 && !seeds.some(s => s.position === byePosition)) {
          seeds.push({
            position: byePosition,
            teamIds: [],
            isBye: true,
            fromGroup: null,
            rank: 999
          });
          byesRemaining--;
        }
      }
      
      // Allocate remaining byes to balance the bracket
      if (byesRemaining > 0) {
        for (let i = 1; i <= bracketSize; i++) {
          if (!seeds.some(s => s.position === i)) {
            seeds.push({
              position: i,
              teamIds: [],
              isBye: true,
              fromGroup: null,
              rank: 999
            });
            byesRemaining--;
            
            if (byesRemaining === 0) break;
          }
        }
      }
    }
    
    // Sort seeds by position to get proper order
    seeds.sort((a, b) => a.position - b.position);
    
    // Convert seeds to matches
    const matches = [];
    for (let i = 0; i < seeds.length; i += 2) {
      const seedA = seeds[i];
      const seedB = i + 1 < seeds.length ? seeds[i + 1] : null;
      
      // Handle BYE matches
      if (seedB && seedB.isBye) {
        matches.push({
          team1: seedA.teamIds,
          team2: null,
          winnerId: 'team1',
          completed: true,
          score1: 1,
          score2: 0,
          round: 1,
          position: Math.floor(i / 2) + 1,
          stage: 'ELIMINATION'
        });
      }
      else if (seedA.isBye && seedB) {
        matches.push({
          team1: null,
          team2: seedB.teamIds,
          winnerId: 'team2',
          completed: true,
          score1: 0,
          score2: 1,
          round: 1,
          position: Math.floor(i / 2) + 1,
          stage: 'ELIMINATION'
        });
      }
      // Regular matches
      else if (seedB) {
        matches.push({
          team1: seedA.teamIds,
          team2: seedB.teamIds,
          winnerId: null,
          completed: false,
          score1: null,
          score2: null,
          round: 1,
          position: Math.floor(i / 2) + 1,
          stage: 'ELIMINATION'
        });
      }
    }
    
    // Generate remaining rounds of the bracket
    // Number of rounds needed = log2(bracketSize)
    const totalRounds = Math.log2(bracketSize);
    
    // Generate empty matches for remaining rounds
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let pos = 1; pos <= matchesInRound; pos++) {
        matches.push({
          team1: null,
          team2: null,
          winnerId: null,
          completed: false,
          score1: null,
          score2: null,
          round: round,
          position: pos,
          stage: 'ELIMINATION'
        });
      }
    }
    
    // Call API to save the elimination bracket
    await saveEliminationBracket(tournamentId, matches);
    
    // Update the tournament to include this
    const { data, error } = await supabase
      .from('tournaments')
      .update({
        allGroupMatchesComplete: true,
        hasEliminationStage: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId)
      .select();
      
    if (error) throw error;
    
    // Refresh tournament data
    await fetchTournament(tournamentId);
    
  } catch (error) {
    console.error('Error generating elimination bracket:', error);
    throw error;
  }
};

const saveEliminationBracket = async (tournamentId: string, matches: any[]): Promise<void> => {
  // Format matches for API
  const matchesForApi = matches.map(match => ({
    tournament_id: tournamentId,
    team1: match.team1,
    team2: match.team2,
    score1: match.score1,
    score2: match.score2,
    winner_id: match.winnerId,
    completed: match.completed,
    round: match.round,
    position: match.position,
    stage: match.stage,
  }));
  
  // Insert matches in batch
  const { error } = await supabase.from('tournament_matches').insert(matchesForApi);
  
  if (error) throw error;
};