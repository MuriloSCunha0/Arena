/**
 * Utility functions for processing two-sided tournament brackets
 * This implements a bracket split in two sides (left and right) with the winners of each side
 * meeting in the final.
 */

import { Match } from '../types';
import { GroupRanking } from '../utils/rankingUtils';

/**
 * Bracket sides metadata type
 */
export interface BracketSidesMetadata {
  left: string[][]; // Array of team IDs on the left side
  right: string[][]; // Array of team IDs on the right side
}

/**
 * Creates the elimination matches for a two-sided bracket.
 * The teams are placed in either left or right sides of the bracket,
 * and the winners of each side will meet in the final.
 * 
 * @param tournamentId - ID of the tournament
 * @param eventId - ID of the event
 * @param bracketSides - Metadata specifying which teams go to which side
 * @returns Array of match objects
 */
export function createTwoSidedBracket(
  tournamentId: string,
  eventId: string,
  bracketSides: BracketSidesMetadata
): Array<Omit<Match, 'id' | 'createdAt' | 'updatedAt'>> {
  const matches: Array<Omit<Match, 'id' | 'createdAt' | 'updatedAt'>> = [];
  
  // Process left side of the bracket
  const leftMatches = createSideBracket(tournamentId, eventId, bracketSides.left, 'LEFT');
  
  // Process right side of the bracket
  const rightMatches = createSideBracket(tournamentId, eventId, bracketSides.right, 'RIGHT');
  
  // Add all matches together
  matches.push(...leftMatches, ...rightMatches);
  
  // Create the final match (winners of left and right sides)
  const numRoundsLeft = Math.ceil(Math.log2(bracketSides.left.length || 1)) + 1;
  const numRoundsRight = Math.ceil(Math.log2(bracketSides.right.length || 1)) + 1;
  const finalRound = Math.max(numRoundsLeft, numRoundsRight) + 1;
  
  // Add the final match
  matches.push({
    tournamentId,
    eventId,
    round: finalRound,
    position: 1,
    team1: null, // Will be filled by winner of left side
    team2: null, // Will be filled by winner of right side
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
  });
  
  return matches;
}

/**
 * Helper function to create one side of a bracket
 * 
 * @param tournamentId - ID of the tournament
 * @param eventId - ID of the event
 * @param teams - Array of team IDs to place in this side
 * @param side - Which side of the bracket ('LEFT' or 'RIGHT')
 * @returns Array of match objects for this side
 */
function createSideBracket(
  tournamentId: string,
  eventId: string,
  teams: string[][],
  side: 'LEFT' | 'RIGHT'
): Array<Omit<Match, 'id' | 'createdAt' | 'updatedAt'>> {
  const matches: Array<Omit<Match, 'id' | 'createdAt' | 'updatedAt'>> = [];
  
  // Determine the bracket size (next power of 2)
  let bracketSize = 1;
  while (bracketSize < teams.length) {
    bracketSize *= 2;
  }
  
  // Calculate number of rounds needed
  const numRounds = Math.ceil(Math.log2(bracketSize || 1));
  
  // Generate first round matches
  const firstRoundMatches = bracketSize / 2;
  for (let i = 0; i < firstRoundMatches; i++) {
    const team1 = i < teams.length ? teams[i] : null;
    const team2 = (bracketSize - i - 1) < teams.length ? teams[bracketSize - i - 1] : null;
    
    const isBye = (team1 !== null && team2 === null) || (team1 === null && team2 !== null);
    const winnerId = isBye ? (team1 !== null ? 'team1' : 'team2') : null;
    const completed = isBye;
    
    matches.push({
      tournamentId,
      eventId,
      round: 1,
      position: i + 1,
      team1,
      team2,
      score1: completed ? 1 : null,
      score2: completed ? 0 : null,
      winnerId,
      completed,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
    });
  }
  
  // Generate remaining rounds
  for (let round = 2; round <= numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let position = 1; position <= matchesInRound; position++) {
      matches.push({
        tournamentId,
        eventId,
        round,
        position,
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
      });
    }
  }
  
  return matches;
}

/**
 * Find which side of the bracket a team belongs to
 * 
 * @param teamId - ID of the team to find
 * @param bracketSides - Metadata specifying which teams go to which side
 * @returns 'LEFT', 'RIGHT', or null if not found
 */
export function getTeamBracketSide(
  teamId: string[],
  bracketSides: BracketSidesMetadata
): 'LEFT' | 'RIGHT' | null {
  // Create normalized string representation for comparison
  const teamIdNormalized = [...teamId].sort().join('|');
  
  // Check left side
  for (const team of bracketSides.left) {
    if ([...team].sort().join('|') === teamIdNormalized) {
      return 'LEFT';
    }
  }
  
  // Check right side
  for (const team of bracketSides.right) {
    if ([...team].sort().join('|') === teamIdNormalized) {
      return 'RIGHT';
    }
  }
  
  return null;
}

/**
 * Convert teams with tournament metadata into a brackets sides structure
 * 
 * @param teams - Array of teams (pairs of participant IDs)
 * @param metadata - Tournament metadata containing bracket sides information
 * @returns BracketSidesMetadata object
 */
export function prepareBracketSidesFromMetadata(
  teams: Array<[string, string]>,
  metadata: any
): BracketSidesMetadata {
  // If metadata already contains bracketSides, use that
  if (metadata && metadata.bracketSides) {
    return {
      left: [...metadata.bracketSides.left],
      right: [...metadata.bracketSides.right]
    };
  }
  
  // Otherwise, split the teams approximately in half for left and right brackets
  const totalTeams = teams.length;
  const halfIndex = Math.ceil(totalTeams / 2);
  
  return {
    left: teams.slice(0, halfIndex),
    right: teams.slice(halfIndex)
  };
}
