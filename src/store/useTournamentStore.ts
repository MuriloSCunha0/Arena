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
  useBeachTennisRules?: boolean
): Promise<void> => {
  console.log(`Generating elimination bracket for tournament ${tournamentId}`, {
    useBeachTennisRules
  });
  try {
    // For now, just update the tournament status since we don't have the matches table
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();
      
    if (tournamentError) throw tournamentError;
    if (!tournamentData) throw new Error("Tournament not found");

    // Update tournament status to indicate elimination phase
    await supabase
      .from('tournaments')
      .update({ 
        status: 'STARTED',
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId);

    console.log(`Tournament ${tournamentId} marked as started for elimination phase`);
  } catch (error) {
    console.error('Error in generateEliminationBracket:', error);
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