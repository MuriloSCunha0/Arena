import { GroupRanking } from '../types/index';

/**
 * Interface for a bracket position in an elimination tournament
 */
export interface BracketPosition {
  position: number;        // Position in the bracket (1-indexed)
  teamId: string[] | null; // Team ID (can be null for TBD)
  seed?: number;           // Seeding number (1 is top seed)
  groupNumber?: number;    // The original group number
  groupRank?: number;      // Rank within the original group
}

/**
 * Options for how to seed teams into brackets
 */
export interface BracketSeedingOptions {
  avoidSameGroupInFirstRound?: boolean; // Try to avoid teams from same group meeting in first round
  seedingMethod: 'strength' | 'group';  // Method for seeding
  balanceBracket?: boolean;            // Try to balance the bracket by distributing stronger teams
  useSnakeOrder?: boolean;             // Use snake order for group winners (1-2-3-3-2-1 instead of 1-1-2-2-3-3)
}

/**
 * Calculate the optimal size for a bracket (power of 2)
 * @param count Number of teams to create a bracket for
 * @returns The next power of 2 that is >= count
 */
export function calculateBracketSize(count: number): number {
  // Find the smallest power of 2 that can fit all teams
  return Math.pow(2, Math.ceil(Math.log2(count)));
}

/**
 * Creates optimal seed positions according to standard tournament seeding
 * @param bracketSize Size of bracket (must be a power of 2)
 * @returns Array of positions that seeds should be placed in
 */
export function createSeedPositions(bracketSize: number): number[] {
  const positions: number[] = [];
  
  // Special case for small brackets
  if (bracketSize <= 2) return [0, 1];
  if (bracketSize === 4) return [0, 3, 1, 2];
  
  // The algorithm places seeds in a way that the highest seeds meet as late as possible
  const createPositionsRecursive = (start: number, end: number, seedIndex: number) => {
    if (start === end) return;
    
    const middle = start + Math.floor((end - start) / 2);
    positions[seedIndex] = start;
    positions[bracketSize - 1 - seedIndex] = end;
    
    seedIndex += 1;
    
    // Recursively place the rest of the seeds
    createPositionsRecursive(middle, middle + 1, seedIndex);
  };
  
  createPositionsRecursive(0, bracketSize - 1, 0);
  return positions;
}

/**
 * Creates a seeded bracket from a list of ranked teams
 * @param rankings Array of team rankings (expected to be sorted by rank)
 * @param options Options for how to seed the bracket
 * @returns Array of bracket positions
 */
export function createSeededBracket(
  rankings: GroupRanking[],
  options: BracketSeedingOptions = { seedingMethod: 'strength' }
): BracketPosition[] {
  const teamCount = rankings.length;
  const bracketSize = calculateBracketSize(teamCount);
  const seedPositions = createSeedPositions(bracketSize);
    // Group teams by their group number
  const teamsByGroup: Map<number, GroupRanking[]> = new Map();
  for (const team of rankings) {
    const groupNum = team.stats.groupNumber || 0; // Default to 0 if undefined
    if (!teamsByGroup.has(groupNum)) {
      teamsByGroup.set(groupNum, []);
    }
    teamsByGroup.get(groupNum)!.push(team);
  }
  
  // Sort teams based on the chosen seeding method
  let seededTeams: GroupRanking[];
  
  if (options.seedingMethod === 'group') {
    // Group seeding prioritizes group winners together, then 2nd place, etc.
    seededTeams = [];
    
    // Get max rank across all groups
    const maxRank = Math.max(...rankings.map(r => r.rank));
    
    // Handle snake ordering for group winners if needed
    if (options.useSnakeOrder) {      // For each possible rank (1st, 2nd, 3rd place, etc.)
      for (let rank = 1; rank <= maxRank; rank++) {
        const teamsWithRank = rankings.filter(team => team.rank === rank);
        
        // Sort by group number
        if (rank % 2 === 1) {
          // Ascending order for odd ranks (1, 3, 5...)
          teamsWithRank.sort((a, b) => (a.stats.groupNumber || 0) - (b.stats.groupNumber || 0));
        } else {
          // Descending order for even ranks (2, 4, 6...)
          teamsWithRank.sort((a, b) => (b.stats.groupNumber || 0) - (a.stats.groupNumber || 0));
        }
        
        seededTeams.push(...teamsWithRank);
      }
    } else {      // Simple ordering by rank and then group number
      for (let rank = 1; rank <= maxRank; rank++) {
        const teamsWithRank = rankings.filter(team => team.rank === rank)
          .sort((a, b) => (a.stats.groupNumber || 0) - (b.stats.groupNumber || 0));
        seededTeams.push(...teamsWithRank);
      }
    }
  } else {
    // Strength seeding prioritizes overall ranking regardless of group
    seededTeams = [...rankings].sort((a, b) => {
      // First by rank
      if (a.rank !== b.rank) return a.rank - b.rank;
      
      // Then by stats - more wins is better
      if (a.stats.wins !== b.stats.wins) return b.stats.wins - a.stats.wins;
      
      // Then by game difference
      return b.stats.gameDifference - a.stats.gameDifference;
    });
  }
  
  // Create initial bracket based on seeding
  const initialBracket = seededTeams.map((team, index) => ({
    position: seedPositions[index],
    teamId: team.teamId,
    seed: index + 1, // 1-indexed seed number
    groupNumber: team.stats.groupNumber,
    groupRank: team.rank
  }));
  
  // If we need to avoid first-round same-group matchups, we need to check and potentially swap
  if (options.avoidSameGroupInFirstRound && bracketSize > 2) {
    return avoidSameGroupMatchups(initialBracket, bracketSize);
  }
  
  // Fill in any empty positions with null (byes)
  const finalBracket: BracketPosition[] = new Array(bracketSize).fill(null).map((_, i) => {
    const match = initialBracket.find(m => m.position === i);
    return match || { position: i, teamId: null };
  });
  
  // Sort by position for the final result
  return finalBracket.sort((a, b) => a.position - b.position);
}

/**
 * Modify an initial bracket to avoid first-round same-group matchups
 * @param bracket Initial bracket with positioned teams
 * @param bracketSize Size of the bracket
 * @returns Modified bracket that avoids same-group matchups in the first round
 */
function avoidSameGroupMatchups(
  bracket: BracketPosition[], 
  bracketSize: number
): BracketPosition[] {
  // First, identify the first-round matchups
  const firstRoundMatchups: Array<[BracketPosition, BracketPosition]> = [];
  
  for (let i = 0; i < bracketSize / 2; i++) {
    // In a standard bracket, first round opponents are at positions i and (bracketSize - 1 - i)
    const position1 = bracket.find(b => b.position === i);
    const position2 = bracket.find(b => b.position === bracketSize - 1 - i);
    
    if (position1 && position2) {
      firstRoundMatchups.push([position1, position2]);
    }
  }
  
  // Identify problematic matchups (same group)
  const problematicMatchups = firstRoundMatchups.filter(
    ([a, b]) => a.groupNumber && b.groupNumber && a.groupNumber === b.groupNumber
  );
  
  if (problematicMatchups.length === 0) {
    // No problematic matchups, return original bracket
    return fillBracketWithByes(bracket, bracketSize);
  }
  
  // Start with sorted list of non-problematic teams that can be swapped
  const swappablePositions = bracket
    .filter(b => !problematicMatchups.flat().includes(b))
    // Sort by seed to prioritize swapping lower seeds
    .sort((a, b) => (b.seed || 999) - (a.seed || 999));
  
  // Try to fix each problematic matchup
  let modifiedBracket = [...bracket];
  
  for (const [posA, posB] of problematicMatchups) {
    // Find a suitable team to swap with posB that won't create a new conflict
    for (const candidatePos of swappablePositions) {
      // Skip if same seed level (we don't want to swap seeds 1 and 2, for instance)
      if ((posB.seed || 999) <= 4 && (candidatePos.seed || 999) <= 4) {
        continue;
      }
      
      // Check if swapping would create a new conflict
      const matchupPartner = modifiedBracket.find(p => 
        p.position === (bracketSize - 1 - candidatePos.position)
      );
      
      // If the team we'd swap with doesn't create a conflict with posA
      if (!matchupPartner || matchupPartner.groupNumber !== posA.groupNumber) {
        // Swap positions
        const indexB = modifiedBracket.findIndex(p => p.position === posB.position);
        const indexCandidate = modifiedBracket.findIndex(p => p.position === candidatePos.position);
        
        if (indexB !== -1 && indexCandidate !== -1) {
          // Swap positions only, not seeds
          const tempPos = modifiedBracket[indexB].position;
          modifiedBracket[indexB].position = modifiedBracket[indexCandidate].position;
          modifiedBracket[indexCandidate].position = tempPos;
          
          // Remove both from consideration for future swaps
          swappablePositions.splice(swappablePositions.findIndex(p => p === candidatePos), 1);
          break;
        }
      }
    }
  }
  
  return fillBracketWithByes(modifiedBracket, bracketSize);
}

/**
 * Fill a bracket with byes (null teams) in empty positions
 * @param bracket Partial bracket with some positions filled
 * @param bracketSize Total size of the bracket
 * @returns Complete bracket with all positions filled
 */
function fillBracketWithByes(bracket: BracketPosition[], bracketSize: number): BracketPosition[] {
  // Create a full array of the correct size
  const filledBracket: BracketPosition[] = new Array(bracketSize).fill(null).map((_, i) => {
    const match = bracket.find(m => m.position === i);
    return match || { position: i, teamId: null };
  });
  
  // Sort by position
  return filledBracket.sort((a, b) => a.position - b.position);
}

/**
 * Get a description of a bracket position based on its seed
 * @param seed Seed number (1 is top seed)
 * @param totalTeams Total number of teams in the bracket
 * @returns Description string like "1st seed", "Quarter-finalist", etc.
 */
export function getSeedDescription(seed: number | undefined, totalTeams: number): string {
  if (!seed) return 'TBD';
  
  if (seed === 1) return '1º Cabeça de chave';
  if (seed === 2) return '2º Cabeça de chave';
  
  if (totalTeams >= 8) {
    if (seed <= 4) return `${seed}º Cabeça de chave`;
    if (seed <= 8) return `Cabeça de chave ${seed}`;
  }
  
  return `Seed #${seed}`;
}
