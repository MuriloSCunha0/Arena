import { supabase } from '../lib/supabase';
import { Tournament, Match, Court, TeamFormationType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { calculateGroupRankings, GroupRanking } from '../utils/rankingUtils'; // Import ranking utility

// Interface for potential tournament settings
interface TournamentSettings {
  qualifiersPerGroup?: number;
  groupSize?: number;
  // Add other settings as needed
}

// Helper function to handle Supabase errors with more details
const handleSupabaseError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  let message = `Error in ${context}`;
  if (error.message) {
    message += `: ${error.message}`;
  }
  if (error.details) {
    message += ` - ${error.details}`;
  }
  if (error.hint) {
    message += ` (Hint: ${error.hint})`;
  }
  
  throw new Error(message);
};

// Helper function to generate round robin matches for a group
const generateGroupMatches = (
  tournamentId: string,
  eventId: string,
  groupNumber: number,
  teams: string[][]
): Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] => {
  const matches: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  if (teams.length < 2) return matches;

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        tournamentId: tournamentId,
        eventId: eventId,
        round: 0,
        position: 0,
        team1: teams[i],
        team2: teams[j],
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'GROUP',
        groupNumber: groupNumber,
      });
    }
  }
  return matches;
};

export const TournamentService = {
  getByEventId: async (eventId: string): Promise<Tournament | null> => {
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle(); // Use maybeSingle em vez de single

      if (error) throw error;
      
      // Se não existir torneio, retorne null
      if (!tournament) return null;

      // Resto do código existente para buscar partidas...
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('stage', { ascending: true })
        .order('group_number', { ascending: true, nullsFirst: true })
        .order('round', { ascending: true })
        .order('position', { ascending: true });

      if (matchesError) throw matchesError;

      const validatedMatches = (matchesData || [])
        .filter(match => match !== null)
        .map(match => ({
          id: match.id,
          tournamentId: match.tournament_id,
          eventId: match.event_id,
          round: match.round ?? 0,
          position: match.position ?? 0,
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          winnerId: match.winner_id,
          completed: match.completed || false,
          courtId: match.court_id,
          scheduledTime: match.scheduled_time,
          stage: match.stage || 'ELIMINATION',
          groupNumber: match.group_number,
          createdAt: match.created_at,
          updatedAt: match.updated_at,
        }));

      return {
        ...tournament,
        matches: validatedMatches
      };
    } catch (error) {
      handleSupabaseError(error, 'getByEventId');
      throw error;
    }
  },

  generateTournamentStructure: async (
    eventId: string,
    teams: string[][],
    teamFormationType: TeamFormationType,
    options: { groupSize?: number; forceReset?: boolean } = {}
  ): Promise<Tournament> => {
    const { groupSize = 4, forceReset = false } = options;

    try {
      if (!eventId || !teams || teams.length < 2) {
        throw new Error("É necessário pelo menos 2 times/duplas para gerar o torneio");
      }
      if (groupSize < 3) {
        throw new Error("O tamanho do grupo deve ser pelo menos 3");
      }

      let existingTournament: Tournament | null = null;
      try {
        existingTournament = await TournamentService.getByEventId(eventId);
      } catch (e) {}

      let tournamentId: string;

      if (existingTournament) {
        if (!forceReset) {
          throw new Error("Um torneio já existe para este evento. Use forceReset para recriar.");
        }

        const { error: deleteMatchesError } = await supabase
          .from('tournament_matches')
          .delete()
          .eq('tournament_id', existingTournament.id);
        if (deleteMatchesError) throw deleteMatchesError;

        const { data: updatedTournament, error: updateError } = await supabase
          .from('tournaments')
          .update({ status: 'CREATED', updated_at: new Date().toISOString() })
          .eq('id', existingTournament.id)
          .select()
          .single();
        if (updateError) throw updateError;
        tournamentId = updatedTournament.id;

      } else {
        const { data: newTournament, error: insertError } = await supabase
          .from('tournaments')
          .insert({
            event_id: eventId,
            status: 'CREATED',
          })
          .select()
          .single();

        if (insertError) throw insertError;
        tournamentId = newTournament.id;
      }

      const groups: string[][][] = [];
      let currentGroup: string[][] = [];
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

      for (const team of shuffledTeams) {
        currentGroup.push(team);
        if (currentGroup.length === groupSize) {
          groups.push(currentGroup);
          currentGroup = [];
        }
      }
      if (currentGroup.length >= 2) {
        groups.push(currentGroup);
      }

      const allGroupMatches: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      groups.forEach((group, index) => {
        const groupNumber = index + 1;
        const groupMatches = generateGroupMatches(tournamentId, eventId, groupNumber, group);
        allGroupMatches.push(...groupMatches);
      });

      if (allGroupMatches.length > 0) {
        const { error: insertMatchesError } = await supabase
          .from('tournament_matches')
          .insert(allGroupMatches.map(match => ({
            ...match,
            team1: match.team1,
            team2: match.team2,
          })));

        if (insertMatchesError) throw insertMatchesError;
      }

      const finalTournament = await TournamentService.getByEventId(eventId);
      if (!finalTournament) {
        throw new Error("Failed to fetch the newly created/updated tournament structure.");
      }
      return finalTournament;

    } catch (error) {
      handleSupabaseError(error, 'generateTournamentStructure');
      throw error;
    }
  },

  generateEliminationBracket: async (tournamentId: string): Promise<Tournament> => {
    console.log(`Generating elimination bracket for tournament ${tournamentId}`);
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*, settings') // Fetch settings JSONB column
        .eq('id', tournamentId)
        .single();
      if (tournamentError) throw tournamentError;
      if (!tournamentData) throw new Error("Tournament not found");

      const settings: TournamentSettings = tournamentData.settings || {};
      const qualifiersPerGroup = settings.qualifiersPerGroup || 2;

      const { data: groupMatchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('stage', 'GROUP')
        .eq('completed', true);
      if (matchesError) throw matchesError;

      if (!groupMatchesData || groupMatchesData.length === 0) {
        throw new Error("Nenhuma partida da fase de grupos concluída encontrada.");
      }

      const matchesByGroup = groupMatchesData.reduce((acc, match) => {
        const groupNum = match.group_number ?? 0;
        if (!acc[groupNum]) acc[groupNum] = [];
        acc[groupNum].push(match as Match);
        return acc;
      }, {} as Record<number, Match[]>);

      const allGroupRankings: Record<number, GroupRanking[]> = {};
      for (const groupNum in matchesByGroup) {
        allGroupRankings[Number(groupNum)] = calculateGroupRankings(matchesByGroup[groupNum]);
      }

      const qualifiers: GroupRanking[] = [];
      const groupNumbers = Object.keys(allGroupRankings).map(Number).sort((a, b) => a - b);

      console.log(`Using qualifiersPerGroup: ${qualifiersPerGroup}`);

      for (let rankIndex = 0; rankIndex < qualifiersPerGroup; rankIndex++) {
        for (const groupNum of groupNumbers) {
          if (allGroupRankings[groupNum] && allGroupRankings[groupNum][rankIndex]) {
            qualifiers.push({
              ...allGroupRankings[groupNum][rankIndex],
            });
          }
        }
      }

      console.log("Qualifiers:", qualifiers.map((q, index) => ({ seed: index + 1, rank: q.rank, team: q.teamId })));

      if (qualifiers.length < 2) {
        throw new Error("Não há qualificadores suficientes para a fase eliminatória.");
      }

      let eliminationBracketSize = 2;
      while (eliminationBracketSize < qualifiers.length) {
        eliminationBracketSize *= 2;
      }
      const numQualifiers = qualifiers.length;
      const numByes = eliminationBracketSize - numQualifiers;

      console.log(`Elimination Bracket Size: ${eliminationBracketSize}, Qualifiers: ${numQualifiers}, Byes: ${numByes}`);

      const finalSeededSlots: (string[] | null)[] = new Array(eliminationBracketSize).fill(null);
      const seedsToPlace = [...qualifiers];

      const getSlotIndexForSeed = (seed: number, size: number): number => {
        if (seed === 1) return 0;
        if (seed === 2) return size - 1;
        if (seed === 3) return Math.floor(size / 2) - 1;
        if (seed === 4) return Math.floor(size / 2);

        let currentPlacementIndex = 0;
        for (let i = 0; i < size; i++) {
          if (finalSeededSlots[i] === null) {
            if (currentPlacementIndex === seed - 5) return i;
            currentPlacementIndex++;
          }
        }

        return -1;
      };

      seedsToPlace.forEach((qualifier, index) => {
        const seedNumber = index + 1;
        const slotIndex = getSlotIndexForSeed(seedNumber, eliminationBracketSize);
        if (slotIndex !== -1 && slotIndex < eliminationBracketSize) {
          finalSeededSlots[slotIndex] = qualifier.teamId;
        } else {
          console.warn(`Could not determine slot for seed ${seedNumber}`);
          const fallbackIndex = finalSeededSlots.indexOf(null);
          if (fallbackIndex !== -1) {
            finalSeededSlots[fallbackIndex] = qualifier.teamId;
          }
        }
      });

      console.log("Final Seeded Slots:", finalSeededSlots);

      const eliminationMatches: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      const numRounds = Math.log2(eliminationBracketSize);

      const firstRoundMatchesCount = eliminationBracketSize / 2;
      for (let i = 0; i < firstRoundMatchesCount; i++) {
        const team1 = finalSeededSlots[i * 2];
        const team2 = finalSeededSlots[i * 2 + 1];
        const position = i + 1;

        const isBye = (team1 !== null && team2 === null) || (team1 === null && team2 !== null);
        const winnerId = isBye ? (team1 !== null ? 'team1' : 'team2') : null;
        const completed = isBye;

        eliminationMatches.push({
          tournamentId: tournamentId,
          eventId: tournamentData.event_id,
          round: 1,
          position: position,
          team1: team1,
          team2: team2,
          score1: completed ? 1 : null,
          score2: completed ? 0 : null,
          winnerId: winnerId,
          completed: completed,
          courtId: null,
          scheduledTime: null,
          stage: 'ELIMINATION',
          groupNumber: null,
        });
      }

      let previousRoundMatches = firstRoundMatchesCount;
      for (let round = 2; round <= numRounds; round++) {
        const matchesInThisRound = previousRoundMatches / 2;
        for (let position = 1; position <= matchesInThisRound; position++) {
          eliminationMatches.push({
            tournamentId: tournamentId,
            eventId: tournamentData.event_id,
            round: round,
            position: position,
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
        previousRoundMatches = matchesInThisRound;
      }

      const { data: insertedMatchesData, error: insertError } = await supabase
        .from('tournament_matches')
        .insert(eliminationMatches.map(match => ({
          tournament_id: match.tournamentId,
          event_id: match.eventId,
          round: match.round,
          position: match.position,
          team1: match.team1,
          team2: match.team2,
          score1: match.score1,
          score2: match.score2,
          winner_id: match.winnerId,
          completed: match.completed,
          court_id: match.courtId,
          scheduled_time: match.scheduledTime,
          stage: match.stage,
          group_number: match.groupNumber
        })))
        .select();

      if (insertError) throw insertError;
      console.log(`Inserted ${insertedMatchesData?.length ?? 0} elimination matches.`);

      const insertedMatches: Match[] = insertedMatchesData.map(dbMatch => ({
        id: dbMatch.id,
        tournamentId: dbMatch.tournament_id,
        eventId: dbMatch.event_id,
        round: dbMatch.round,
        position: dbMatch.position,
        team1: dbMatch.team1,
        team2: dbMatch.team2,
        score1: dbMatch.score1,
        score2: dbMatch.score2,
        winnerId: dbMatch.winner_id,
        completed: dbMatch.completed,
        courtId: dbMatch.court_id,
        scheduledTime: dbMatch.scheduled_time,
        stage: dbMatch.stage,
        groupNumber: dbMatch.group_number,
        createdAt: dbMatch.created_at,
        updatedAt: dbMatch.updated_at,
      }));

      const firstRoundByeMatches = insertedMatches.filter(m => m.round === 1 && m.completed);
      for (const byeMatch of firstRoundByeMatches) {
        await TournamentService.advanceWinner(byeMatch);
      }

      const { data: updatedTournamentData, error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'STARTED' })
        .eq('id', tournamentId)
        .select()
        .single();
      if (updateError) throw updateError;

      const tournament = await TournamentService.getByEventId(tournamentData.event_id);
      if (!tournament) {
        throw new Error("Failed to fetch the tournament after updating.");
      }
      return tournament;

    } catch (error) {
      if (error instanceof Error && error.message.includes("sufficient qualifiers")) {
        console.error("Elimination bracket generation failed:", error.message);
      } else {
        handleSupabaseError(error, 'generateEliminationBracket');
      }
      throw error;
    }
  },

  updateMatch: async (matchId: string, score1: number, score2: number): Promise<Match> => {
    try {
      const { data: matchData, error: fetchError } = await supabase
        .from('tournament_matches')
        .select('*, tournaments(status)')
        .eq('id', matchId)
        .single();

      if (fetchError) throw fetchError;
      if (!matchData) throw new Error("Match not found");

      const tournamentStatus = matchData.tournaments?.status;
      if (tournamentStatus !== 'STARTED' && tournamentStatus !== 'FINISHED') {
        throw new Error("O torneio precisa estar em andamento para atualizar resultados.");
      }

      let winnerId: 'team1' | 'team2' | null = null;
      if (score1 > score2) {
        winnerId = 'team1';
      } else if (score2 > score1) {
        winnerId = 'team2';
      } else {
        if (matchData.stage === 'ELIMINATION') {
          throw new Error("Empates não são permitidos na fase eliminatória.");
        }
      }

      const { data: updatedMatch, error: updateError } = await supabase
        .from('tournament_matches')
        .update({
          score1: score1,
          score2: score2,
          winner_id: winnerId,
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Transformar os dados do formato da DB para o formato da interface Match
      const transformedMatch: Match = {
        id: updatedMatch.id,
        tournamentId: updatedMatch.tournament_id,
        eventId: updatedMatch.event_id,  // Esta é a propriedade crítica que estava faltando
        round: updatedMatch.round,
        position: updatedMatch.position,
        team1: updatedMatch.team1,
        team2: updatedMatch.team2,
        score1: updatedMatch.score1,
        score2: updatedMatch.score2,
        winnerId: updatedMatch.winner_id,
        completed: updatedMatch.completed,
        courtId: updatedMatch.court_id,
        scheduledTime: updatedMatch.scheduled_time,
        stage: updatedMatch.stage,
        groupNumber: updatedMatch.group_number,
        createdAt: updatedMatch.created_at,
        updatedAt: updatedMatch.updated_at,
      };

      if (updatedMatch.stage === 'ELIMINATION' && winnerId) {
        await TournamentService.advanceWinner(transformedMatch);
      }

      if (updatedMatch.stage === 'ELIMINATION') {
        await TournamentService.checkTournamentCompletion(transformedMatch.tournamentId);
      }

      return transformedMatch;

    } catch (error) {
      handleSupabaseError(error, 'updateMatch');
      throw error;
    }
  },

  advanceWinner: async (match: any): Promise<void> => {
    if (match.stage !== 'ELIMINATION' || !match.winner_id || !match.team1 || !match.team2) {
      return;
    }

    const winnerTeam = match.winner_id === 'team1' ? match.team1 : match.team2;
    if (!winnerTeam) return;

    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);

    try {
      const { data: nextMatch, error: findError } = await supabase
        .from('tournament_matches')
        .select('id, team1, team2')
        .eq('tournament_id', match.tournament_id)
        .eq('round', nextRound)
        .eq('position', nextPosition)
        .eq('stage', 'ELIMINATION')
        .single();

      if (findError && findError.code !== 'PGRST116') throw findError;
      if (!nextMatch) {
        return;
      }

      const updateData: { team1?: string[]; team2?: string[] } = {};
      if (match.position % 2 === 1) {
        updateData.team1 = winnerTeam;
      } else {
        updateData.team2 = winnerTeam;
      }

      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update(updateData)
        .eq('id', nextMatch.id);

      if (updateError) throw updateError;

    } catch (error) {
      handleSupabaseError(error, 'advanceWinner');
      throw error;
    }
  },

  checkTournamentCompletion: async (tournamentId: string): Promise<void> => {
    try {
      const { data: finalMatch, error: finalMatchError } = await supabase
        .from('tournament_matches')
        .select('completed')
        .eq('tournament_id', tournamentId)
        .eq('stage', 'ELIMINATION')
        .order('round', { ascending: false })
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (finalMatchError) throw finalMatchError;

      if (finalMatch && finalMatch.completed) {
        await TournamentService.updateStatus(tournamentId, 'FINISHED');
      }
    } catch (error) {
      handleSupabaseError(error, 'checkTournamentCompletion');
    }
  },

  updateStatus: async (tournamentId: string, status: 'CREATED' | 'STARTED' | 'FINISHED' | 'CANCELLED'): Promise<Tournament> => {
    try {
      const { data: updatedTournament, error } = await supabase
        .from('tournaments')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', tournamentId)
        .select()
        .single();

      if (error) throw error;
      return updatedTournament;
    } catch (error) {
      handleSupabaseError(error, 'updateStatus');
      throw error;
    }
  },

  assignCourtToMatch: async (matchId: string, courtId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tournament_matches')
        .update({ court_id: courtId, updated_at: new Date().toISOString() })
        .eq('id', matchId);

      if (error) throw error;
    } catch (error) {
      handleSupabaseError(error, 'assignCourtToMatch');
      throw error;
    }
  },

  updateMatchSchedule: async (matchId: string, courtId: string | null, scheduledTime: string | null): Promise<Match> => {
    try {
      const { data: updatedMatch, error } = await supabase
        .from('tournament_matches')
        .update({
          court_id: courtId,
          scheduled_time: scheduledTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;
      return updatedMatch;
    } catch (error) {
      handleSupabaseError(error, 'updateMatchSchedule');
      throw error;
    }
  },
};
