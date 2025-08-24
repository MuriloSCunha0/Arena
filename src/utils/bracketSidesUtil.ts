/**
 * Utility functions for processing two-sided tournament brackets
 * This implements a bracket split in two sides (left and right) with the winners of each side
 * meeting in the final.
 */

import { Match } from '../types';

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
  
  // NOVA LÓGICA ADAPTÁVEL: Melhorado para suportar qualquer número de duplas
  // Combinar todos os times em uma única lista
  const allTeams = [...bracketSides.left, ...bracketSides.right];
  const totalTeams = allTeams.length;
  
  console.log(`🏆 [createTwoSidedBracket] Total teams: ${totalTeams}`);
  
  if (totalTeams < 2) {
    console.warn('🏆 [createTwoSidedBracket] Not enough teams for elimination bracket');
    return [];
  }
  
  // CORREÇÃO CRÍTICA: Calcular número de rodadas baseado no número real de times
  // Para N times, precisamos de ceil(log2(N)) rodadas, MAS garantir que a última rodada é sempre final
  const numRounds = Math.ceil(Math.log2(totalTeams));
  console.log(`🏆 [createTwoSidedBracket] Total rounds needed: ${numRounds}`);
  
  // Embaralhar para distribuição mais justa (opcional)
  const shuffledTeams = [...allTeams]; // .sort(() => Math.random() - 0.5);
  
  // Função para determinar quantas partidas por rodada CORRIGIDA
  const getMatchesForRound = (round: number, totalTeams: number): number => {
    // Para a primeira rodada, temos Math.floor(totalTeams / 2) partidas
    // Para rodadas subsequentes, dividimos por 2
    if (round === 1) {
      return Math.floor(totalTeams / 2);
    }
    
    // Para rodadas subsequentes, cada rodada tem metade das partidas da anterior
    const previousRoundMatches = getMatchesForRound(round - 1, totalTeams);
    const currentRoundMatches = Math.floor(previousRoundMatches / 2);
    
    // Garantir que sempre temos pelo menos 1 partida na final
    return Math.max(1, currentRoundMatches);
  };
  
  // CORREÇÃO: Criar todas as rodadas com lógica correta
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = getMatchesForRound(round, totalTeams);
    
    console.log(`🏆 [createTwoSidedBracket] Creating round ${round} with ${matchesInRound} matches`);
    
    // Se não há partidas para essa rodada, pular
    if (matchesInRound <= 0) {
      console.log(`⚠️ [createTwoSidedBracket] Skipping round ${round} - no matches needed`);
      continue;
    }
    
    for (let position = 1; position <= matchesInRound; position++) {
      let team1: string[] | null = null;
      let team2: string[] | null = null;
      let completed = false;
      let winnerId: 'team1' | 'team2' | null = null;
      let score1: number | null = null;
      let score2: number | null = null;
      
      if (round === 1) {
        // Primeira rodada: usar times reais
        const team1Index = (position - 1) * 2;
        const team2Index = (position - 1) * 2 + 1;
        
        team1 = team1Index < shuffledTeams.length ? shuffledTeams[team1Index] : null;
        team2 = team2Index < shuffledTeams.length ? shuffledTeams[team2Index] : null;
        
        // Verificar se é BYE (time ímpar)
        if (team1 && !team2) {
          completed = true;
          winnerId = 'team1' as const;
          score1 = 1;
          score2 = 0;
          console.log(`🏆 [createTwoSidedBracket] BYE: Team advances automatically`);
        } else if (!team1 && team2) {
          completed = true;
          winnerId = 'team2' as const;
          score1 = 0;
          score2 = 1;
          console.log(`🏆 [createTwoSidedBracket] BYE: Team advances automatically`);
        }
      }
      // Para rodadas subsequentes, team1 e team2 ficam null (serão preenchidos pelos vencedores)
      
      matches.push({
        tournamentId,
        eventId,
        round,
        position,
        team1,
        team2,
        score1,
        score2,
        winnerId,
        completed,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null
      });
    }
  }
  
  console.log(`🏆 [createTwoSidedBracket] Created ${matches.length} total matches`);
  console.log(`🏆 [createTwoSidedBracket] Matches by round:`, 
    matches.reduce((acc, match) => {
      acc[match.round] = (acc[match.round] || 0) + 1;
      return acc;
    }, {} as Record<number, number>)
  );
  
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
