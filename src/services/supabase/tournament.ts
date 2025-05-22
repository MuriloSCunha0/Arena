import { supabase } from '../../lib/supabase';
import { Match, Tournament, Court, TeamFormationType, TournamentSettings } from '../../types'; // Adicionado TournamentSettings
import { calculateGroupRankings, GroupRanking } from '../../utils/rankingUtils';
import { handleSupabaseError } from '../../utils/supabase-error-handler';

const transformMatch = (data: any): Match => ({
  id: data.id,
  eventId: data.event_id,
  tournamentId: data.tournament_id, // Added tournamentId
  round: data.round,
  position: data.position,
  team1: data.team1,
  team2: data.team2,
  score1: data.score1,
  score2: data.score2,
  winnerId: data.winner_id,
  completed: data.completed,
  scheduledTime: data.scheduled_time,
  courtId: data.court_id, // Added courtId
  stage: data.stage, // Added stage
  groupNumber: data.group_number, // Added groupNumber
  createdAt: data.created_at, // Added createdAt
  updatedAt: data.updated_at, // Added updatedAt
});

const transformTournament = (data: any, matches: Match[]): Tournament => ({
  id: data.id,
  eventId: data.event_id,
  matches: matches,
  status: data.status,
  settings: data.settings, // Added settings
  type: data.type, // Added type
  teamFormation: data.team_formation, // Added teamFormation
  isNewTournament: data.isNewTournament, // Added flag
});

const toSupabaseMatch = (match: Partial<Match>) => ({
  event_id: match.eventId,
  tournament_id: match.tournamentId, // Added tournament_id
  round: match.round,
  position: match.position,
  team1: match.team1,
  team2: match.team2,
  score1: match.score1,
  score2: match.score2,
  winner_id: match.winnerId,
  completed: match.completed,
  scheduled_time: match.scheduledTime,
  court_id: match.courtId, // Added court_id
  stage: match.stage, // Added stage
  group_number: match.groupNumber, // Added group_number
});

const toSupabaseTournament = (tournament: Partial<Tournament>) => ({
  event_id: tournament.eventId,
  status: tournament.status,
  settings: tournament.settings, // Added settings
  type: tournament.type, // Added type
  team_formation: tournament.teamFormation, // Added team_formation
});

export const TournamentService = {
  async getByEventId(eventId: string): Promise<Tournament | null> {
    try {
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*') // Select all columns including settings
        .eq('event_id', eventId)
        .maybeSingle();

      if (tournamentError) {
         console.error(`Supabase error fetching tournament for event ${eventId}:`, tournamentError);
         throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
      }

      if (!tournamentData) {
        console.log(`No tournament found for event ${eventId}.`);
        return null;
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentData.id) // Fetch by tournament_id
        .order('stage', { ascending: true }) // Order by stage first
        .order('group_number', { ascending: true, nullsFirst: true }) // Then group number
        .order('round', { ascending: true }) // Then round
        .order('position', { ascending: true }); // Then position

      if (matchesError) {
        console.error(`Supabase error fetching matches for tournament ${tournamentData.id}:`, matchesError);
        throw new Error(`Failed to fetch matches: ${matchesError.message}`);
      }

      const matches = matchesData ? matchesData.map(transformMatch) : [];
      const tournament = transformTournament(tournamentData, matches);
      tournament.isNewTournament = false; // Default value after fetch
      return tournament;

    } catch (error) {
      console.error(`General error in getByEventId for event ${eventId}:`, error);
      return null;
    }
  },

  generateTournamentStructure: async (
    eventId: string,
    teams: string[][],
    teamFormation: TeamFormationType,
    options?: { groupSize?: number; forceReset?: boolean }
  ): Promise<Tournament> => {
    console.log(`Generating structure for event ${eventId}, formation: ${teamFormation}, options:`, options);
    try {
        const { data: existingTournamentData, error: fetchError } = await supabase
            .from('tournaments')
            .select('id') // Only need ID
            .eq('event_id', eventId)
            .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw handleSupabaseError(fetchError, 'checking existing tournament');
        }

        let tournamentId: string | undefined = existingTournamentData?.id;
        let isNewTournament = false;

        if (tournamentId && !options?.forceReset) {
            throw new Error('Já existe um torneio criado para este evento. Use a opção de reset para recriar.');
        }

        if (tournamentId && options?.forceReset) {
            console.log(`Forcing reset for tournament ${tournamentId}`);
            const { error: deleteMatchesError } = await supabase
                .from('tournament_matches')
                .delete()
                .eq('tournament_id', tournamentId);
            if (deleteMatchesError) throw handleSupabaseError(deleteMatchesError, 'deleting existing matches');
            const { error: deleteTournamentError } = await supabase
                .from('tournaments')
                .delete()
                .eq('id', tournamentId);
            if (deleteTournamentError) throw handleSupabaseError(deleteTournamentError, 'deleting existing tournament');
            tournamentId = undefined; // Clear ID for recreation
        }        if (!tournamentId) {
            const settings = { groupSize: options?.groupSize || 3, qualifiersPerGroup: 2 }; // Changed default groupSize to 3
            const { data: newTournamentData, error: createError } = await supabase
                .from('tournaments')
                .insert({
                    event_id: eventId,
                    status: 'CREATED',
                    settings: settings,
                    type: 'TOURNAMENT', // Assuming type is always TOURNAMENT here
                    team_formation: teamFormation,
                })
                .select('id')
                .single();
            if (createError) throw handleSupabaseError(createError, 'creating tournament');
            tournamentId = newTournamentData.id;
            isNewTournament = true; // Flag that this was newly created
            console.log(`Created new tournament ${tournamentId}`);
        }
        
        if (teams.length < 2) throw new Error("Pelo menos 2 times são necessários.");
        
        // Alterado o tamanho de grupo padrão para 3
        const defaultGroupSize = options?.groupSize || 3;
        
        // Use o shuffleArray local para embaralhar times
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        const totalTeams = shuffledTeams.length;
        
        // Procedimento para definir a melhor distribuição de grupos
        const groupTeamsList: string[][][] = [];
        let teamIndex = 0;
        
        // Tratamento especial para poucos times (menos de 6)
        if (totalTeams <= 3) {
            // Se houver 2 ou 3 times, colocamos todos em um único grupo
            const singleGroup: string[][] = [];
            for (let i = 0; i < totalTeams; i++) {
                singleGroup.push(shuffledTeams[i]);
            }
            groupTeamsList.push(singleGroup);
        } 
        else if (totalTeams === 4) {
            // Para 4 times, criamos um grupo de 4
            const group: string[][] = [];
            for (let i = 0; i < 4; i++) {
                group.push(shuffledTeams[i]);
            }
            groupTeamsList.push(group);
        }
        else if (totalTeams === 5) {
            // Para 5 times, criamos um grupo de 3 e um grupo de 2
            const group1: string[][] = [];
            for (let i = 0; i < 3; i++) {
                group1.push(shuffledTeams[i]);
            }
            groupTeamsList.push(group1);
            
            const group2: string[][] = [];
            for (let i = 3; i < 5; i++) {
                group2.push(shuffledTeams[i]);
            }
            groupTeamsList.push(group2);
        }
        else {
            // Para 6+ times, aplicamos o algoritmo mais complexo
            
            // Calcular quantos grupos de tamanho defaultGroupSize (3) teremos
            let groupCount = Math.floor(totalTeams / defaultGroupSize);
            const remainingTeams = totalTeams % defaultGroupSize;
            
            // Estratégia baseada no número de times restantes
            if (remainingTeams === 0) {
                // Caso perfeito: todos os grupos terão exatamente 3 times
                for (let i = 0; i < groupCount; i++) {
                    const group: string[][] = [];
                    for (let j = 0; j < defaultGroupSize; j++) {
                        group.push(shuffledTeams[teamIndex++]);
                    }
                    groupTeamsList.push(group);
                }
            } 
            else if (remainingTeams === 1) {
                // Sobra 1 time: criamos um grupo com 4 times e o resto com 3
                // Reduzimos um grupo regular para acomodar o time extra
                groupCount--;
                
                // Primeiro criamos os grupos com 3 times
                for (let i = 0; i < groupCount; i++) {
                    const group: string[][] = [];
                    for (let j = 0; j < defaultGroupSize; j++) {
                        group.push(shuffledTeams[teamIndex++]);
                    }
                    groupTeamsList.push(group);
                }
                
                // Depois criamos o grupo com 4 times
                const specialGroup: string[][] = [];
                for (let j = 0; j < 4; j++) {
                    specialGroup.push(shuffledTeams[teamIndex++]);
                }
                groupTeamsList.push(specialGroup);
            }
            else if (remainingTeams === 2) {
                // Estratégia específica para o Beach Tênis: quando sobram 2 times,
                // é melhor ter um grupo de 2 times quando há ao menos 9 times no total
                if (totalTeams >= 9) {
                    // Criamos grupos regulares de 3 times
                    for (let i = 0; i < groupCount; i++) {
                        const group: string[][] = [];
                        for (let j = 0; j < defaultGroupSize; j++) {
                            group.push(shuffledTeams[teamIndex++]);
                        }
                        groupTeamsList.push(group);
                    }
                    
                    // Adicionamos um grupo com 2 times
                    const smallGroup: string[][] = [];
                    smallGroup.push(shuffledTeams[teamIndex++]);
                    smallGroup.push(shuffledTeams[teamIndex++]);
                    groupTeamsList.push(smallGroup);
                } else {
                    // Com menos de 9 times, é melhor redistribuir em dois grupos de 4 times
                    // Esse padrão é mais equilibrado para avanço no chaveamento
                    groupCount = groupCount - 2; // Reduzimos 2 grupos regulares
                    
                    // Primeiro criamos os grupos com 3 times
                    for (let i = 0; i < groupCount; i++) {
                        const group: string[][] = [];
                        for (let j = 0; j < defaultGroupSize; j++) {
                            group.push(shuffledTeams[teamIndex++]);
                        }
                        groupTeamsList.push(group);
                    }
                    
                    // Depois criamos dois grupos com 4 times
                    for (let i = 0; i < 2; i++) {
                        const specialGroup: string[][] = [];
                        for (let j = 0; j < 4; j++) {
                            specialGroup.push(shuffledTeams[teamIndex++]);
                        }
                        groupTeamsList.push(specialGroup);
                    }
                }
            }
            else if (remainingTeams === 3) {
                // Sobram 3 times: criamos um grupo adicional com 3 times
                // Isso mantém a regra de ter tamanhos iguais quando possível
                
                // Criamos todos os grupos com 3 times
                for (let i = 0; i < groupCount + 1; i++) {
                    const group: string[][] = [];
                    for (let j = 0; j < defaultGroupSize; j++) {
                        group.push(shuffledTeams[teamIndex++]);
                    }
                    groupTeamsList.push(group);
                }
            }
        }

        // Gerar partidas para todos os grupos
        const groupMatches: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>[] = [];
        groupTeamsList.forEach((groupTeams, i) => {
            const groupNum = i + 1;
            
            for (let j = 0; j < groupTeams.length; j++) {
                for (let k = j + 1; k < groupTeams.length; k++) {
                    groupMatches.push({
                        tournamentId: tournamentId!,
                        eventId: eventId,
                        round: 0,
                        position: 0,
                        team1: groupTeams[j],
                        team2: groupTeams[k],
                        score1: null,
                        score2: null,
                        winnerId: null,
                        completed: false,
                        courtId: null,
                        scheduledTime: null,
                        stage: 'GROUP',
                        groupNumber: groupNum,
                    });
                }
            }
        });

        const { data: insertedMatches, error: insertError } = await supabase
            .from('tournament_matches')
            .insert(groupMatches.map(toSupabaseMatch)) // Use transformer
            .select();

        if (insertError) throw handleSupabaseError(insertError, 'inserting group matches');
        console.log(`Inserted ${insertedMatches?.length ?? 0} group matches.`);

        const finalTournament = await TournamentService.getByEventId(eventId);
        if (!finalTournament) throw new Error("Falha ao buscar torneio após geração.");

        finalTournament.isNewTournament = isNewTournament; // Set the flag on the returned object
        return finalTournament;

    } catch (error) {
        console.error('Error in generateTournamentStructure:', error);
        throw error; // Re-throw for UI handling
    }
  },

  generateEliminationBracket: async (tournamentId: string): Promise<Tournament> => {
     try {
        // First get the tournament data to access settings and event_id
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();
          
        if (tournamentError) throw handleSupabaseError(tournamentError, 'fetching tournament data');
        if (!tournamentData) throw new Error("Tournament not found");
        
        // Extract qualifiersPerGroup from settings, default to 2 if not specified
        const settings = tournamentData.settings || {};
        const qualifiersPerGroup = settings.qualifiersPerGroup || 2;
        
        // Verificação crítica: buscar apenas partidas de grupo COMPLETAS
        const { data: groupMatchesData, error: matchesError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('stage', 'GROUP')
            .eq('completed', true); // Confirme que este campo está sendo definido corretamente

        if (matchesError) throw handleSupabaseError(matchesError, 'fetching group matches');

        if (!groupMatchesData || groupMatchesData.length === 0) {
            throw new Error("Nenhuma partida da fase de grupos concluída encontrada.");
        }

        const matchesByGroup = groupMatchesData.reduce((acc, match) => {
            const groupNum = match.group_number ?? 0;
            if (!acc[groupNum]) acc[groupNum] = [];
            acc[groupNum].push(transformMatch(match)); // Transform here
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
                if (allGroupRankings[groupNum]?.[rankIndex]) {
                    qualifiers.push(allGroupRankings[groupNum][rankIndex]);
                }
            }
        }
        console.log("Qualifiers:", qualifiers.map((q, index) => ({ seed: index + 1, rank: q.rank, team: q.teamId })));
        if (qualifiers.length < 2) {
            throw new Error("Não há qualificadores suficientes para a fase eliminatória.");
        }

        let eliminationBracketSize = 2;
        while (eliminationBracketSize < qualifiers.length) { eliminationBracketSize *= 2; }
        const numQualifiers = qualifiers.length;
        const numByes = eliminationBracketSize - numQualifiers;
        console.log(`Elimination Bracket Size: ${eliminationBracketSize}, Qualifiers: ${numQualifiers}, Byes: ${numByes}`);

        const finalSeededSlots: (string[] | null)[] = new Array(eliminationBracketSize).fill(null);
        const seedsToPlace = [...qualifiers];

        const getSlotIndexForSeed = (seed: number, size: number): number => {
            if (seed > size) return -1;

            const placementMap: { [key: number]: number[] } = {
                2: [0, 1],
                4: [0, 3, 1, 2],
                8: [0, 7, 3, 4, 1, 6, 2, 5],
                16: [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10],
            };

            if (placementMap[size] && seed <= size) {
                return placementMap[size][seed - 1];
            }

            console.warn(`Seeding fallback used for seed ${seed}, size ${size}`);
            return seed - 1;
        };

        seedsToPlace.forEach((qualifier, index) => {
            const seedNumber = index + 1;
            const slotIndex = getSlotIndexForSeed(seedNumber, eliminationBracketSize);
            if (slotIndex !== -1 && slotIndex < eliminationBracketSize) {
                if (finalSeededSlots[slotIndex] === null) {
                    finalSeededSlots[slotIndex] = qualifier.teamId;
                } else {
                    console.error(`Seeding conflict: Slot ${slotIndex} already filled. Trying to place seed ${seedNumber}.`);
                    const fallbackIndex = finalSeededSlots.indexOf(null);
                    if (fallbackIndex !== -1) {
                        finalSeededSlots[fallbackIndex] = qualifier.teamId;
                        console.warn(`Placed seed ${seedNumber} in fallback slot ${fallbackIndex}.`);
                    } else {
                        console.error(`No available slots left for seed ${seedNumber}. Bracket generation failed.`);
                        throw new Error("Falha ao alocar seeds no chaveamento.");
                    }
                }
            } else {
                console.warn(`Could not determine slot for seed ${seedNumber} (SlotIndex: ${slotIndex}).`);
                const fallbackIndex = finalSeededSlots.indexOf(null);
                if (fallbackIndex !== -1) {
                    finalSeededSlots[fallbackIndex] = qualifier.teamId;
                } else {
                     console.error(`No available slots left for seed ${seedNumber}. Bracket generation failed.`);
                     throw new Error("Falha ao alocar seeds no chaveamento.");
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
                round: 1, position: position,
                team1: team1, team2: team2, score1: completed ? 1 : null, score2: completed ? 0 : null,
                winnerId: winnerId, completed: completed, courtId: null, scheduledTime: null,
                stage: 'ELIMINATION', groupNumber: null,
            });
        }
        
        let previousRoundMatches = firstRoundMatchesCount;
        for (let round = 2; round <= numRounds; round++) {
            const matchesInThisRound = previousRoundMatches / 2;
            for (let position = 1; position <= matchesInThisRound; position++) {
                eliminationMatches.push({
                    tournamentId: tournamentId, 
                    eventId: tournamentData.event_id, 
                    round: round, position: position,
                    team1: null, team2: null, score1: null, score2: null, winnerId: null, completed: false,
                    courtId: null, scheduledTime: null, stage: 'ELIMINATION', groupNumber: null,
                });
            }
            previousRoundMatches = matchesInThisRound;
        }

        const { data: insertedMatchesData, error: insertError } = await supabase
            .from('tournament_matches')
            .insert(eliminationMatches.map(toSupabaseMatch)) // Use transformer
            .select();
        if (insertError) throw handleSupabaseError(insertError, 'inserting elimination matches');

        const insertedMatches: Match[] = insertedMatchesData.map(transformMatch); // Transform inserted data
        const firstRoundByeMatches = insertedMatches.filter(m => m.round === 1 && m.completed);
        for (const byeMatch of firstRoundByeMatches) {
            await TournamentService.advanceWinner(byeMatch);
        }

        await supabase
            .from('tournaments')
            .update({ status: 'STARTED' }) // Keep status as STARTED
            .eq('id', tournamentId!);

        const finalTournament = await TournamentService.getByEventId(tournamentData.event_id);
        if (!finalTournament) throw new Error("Falha ao buscar torneio após geração da eliminatória.");
        finalTournament.isNewTournament = false; // Not a new tournament anymore
        return finalTournament;

     } catch (error) {
        console.error('Error in generateEliminationBracket:', error);
        throw error; // Re-throw for UI handling
     }
  },

  advanceWinner: async (match: Match): Promise<void> => {
        if (!match.completed || !match.winnerId) return;

        const winningTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
        if (!winningTeam) {
            console.warn(`Cannot advance winner for match ${match.id}: Winning team data is missing.`);
            return;
        }

        const nextRound = match.round + 1;
        const nextPosition = Math.ceil(match.position / 2);
        const teamFieldToUpdate: 'team1' | 'team2' = (match.position % 2 === 1) ? 'team1' : 'team2';

        try {
            const { data: nextMatchData, error: findError } = await supabase
                .from('tournament_matches')
                .select('id, team1, team2, completed, winner_id') // Select fields needed for potential auto-completion
                .eq('tournament_id', match.tournamentId)
                .eq('round', nextRound)
                .eq('position', nextPosition)
                .maybeSingle();

            if (findError && findError.code !== 'PGRST116') {
                throw handleSupabaseError(findError, `finding next match for round ${nextRound}, pos ${nextPosition}`);
            }
            if (!nextMatchData) {
                console.log(`Match ${match.id} (Round ${match.round}) appears to be the final round or next match not found.`);
                return;
            }

            const { error: updateError } = await supabase
                .from('tournament_matches')
                .update({ [teamFieldToUpdate]: winningTeam })
                .eq('id', nextMatchData.id);

            if (updateError) throw handleSupabaseError(updateError, `updating next match ${nextMatchData.id}`);

            console.log(`Advanced winner from match ${match.id} to match ${nextMatchData.id} (${teamFieldToUpdate})`);

            const { data: updatedNextMatchData, error: refetchError } = await supabase
                .from('tournament_matches')
                .select('*') // Seleciona todos os campos em vez de apenas alguns
                .eq('id', nextMatchData.id)
                .single();

            if (refetchError) {
                console.error(`Error refetching match ${nextMatchData.id} after update:`, refetchError);
                return;
            }

            if (updatedNextMatchData.completed) {
                return;
            }

            const team1Present = updatedNextMatchData.team1 && updatedNextMatchData.team1.length > 0;
            const team2Present = updatedNextMatchData.team2 && updatedNextMatchData.team2.length > 0;

            if (team1Present !== team2Present) {
                const woWinnerId: 'team1' | 'team2' = team1Present ? 'team1' : 'team2';
                console.log(`Auto-completing match ${updatedNextMatchData.id} due to Walkover (WO). Winner: ${woWinnerId}`);

                const { error: woUpdateError } = await supabase
                    .from('tournament_matches')
                    .update({
                        completed: true,
                        winner_id: woWinnerId,
                        score1: woWinnerId === 'team1' ? 1 : 0, // Simple WO score
                        score2: woWinnerId === 'team2' ? 1 : 0,
                    })
                    .eq('id', updatedNextMatchData.id);

                if (woUpdateError) {
                    handleSupabaseError(woUpdateError, `updating match ${updatedNextMatchData.id} for WO`);
                } else {
                    const woCompletedMatch: Match = {
                        ...transformMatch(updatedNextMatchData),
                        completed: true,
                        winnerId: woWinnerId,
                        score1: woWinnerId === 'team1' ? 1 : 0,
                        score2: woWinnerId === 'team2' ? 1 : 0,
                        tournamentId: match.tournamentId,
                        eventId: match.eventId,
                        round: updatedNextMatchData.round,
                        position: updatedNextMatchData.position,
                        team1: updatedNextMatchData.team1,
                        team2: updatedNextMatchData.team2,
                        scheduledTime: updatedNextMatchData.scheduled_time,
                        courtId: updatedNextMatchData.court_id,
                        stage: updatedNextMatchData.stage,
                        groupNumber: updatedNextMatchData.group_number,
                        createdAt: updatedNextMatchData.created_at,
                        updatedAt: new Date().toISOString(),
                    };
                    await TournamentService.advanceWinner(woCompletedMatch);
                }
            }

        } catch (error) {
            console.error(`Error during winner advancement process for match ${match.id}:`, error);
        }
    },

  shuffleArray: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
};
