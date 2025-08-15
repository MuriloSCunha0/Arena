import { supabase } from '../lib/supabase';

export interface TeamData {
  participant1_name: string;
  participant2_name: string;
  court_name: string;
}

export interface GroupData {
  name: string;
  teams: TeamData[];
}

/**
 * Save random teams and groups to the database
 * @param tournamentId - The tournament/event ID
 * @param teams - Array of team data
 * @param groups - Optional array of group data (for group stage tournaments)
 */
export async function saveRandomTeamsAndGroups(
  tournamentId: string,
  teams: TeamData[],
  groups?: GroupData[]
): Promise<void> {
  try {
    // First, save the teams
    const teamPromises = teams.map(async (team, index) => {
      const { error } = await supabase
        .from('test_teams')
        .insert({
          event_id: tournamentId,
          name: `${team.participant1_name} & ${team.participant2_name}`,
          player1_name: team.participant1_name,
          player2_name: team.participant2_name,
          court_assignment: team.court_name,
          draw_position: index + 1,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving team:', error);
        throw error;
      }
    });

    await Promise.all(teamPromises);

    // If groups are provided, save them too
    if (groups && groups.length > 0) {
      const groupPromises = groups.map(async (group, groupIndex) => {
        const { error } = await supabase
          .from('test_groups')
          .insert({
            event_id: tournamentId,
            name: group.name,
            group_number: groupIndex + 1,
            teams_count: group.teams.length,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error saving group:', error);
          throw error;
        }
      });

      await Promise.all(groupPromises);
    }

    console.log('Successfully saved teams and groups to database');
  } catch (error) {
    console.error('Error in saveRandomTeamsAndGroups:', error);
    throw error;
  }
}

/**
 * Fetch existing teams for a tournament
 */
export async function getTeamsForTournament(tournamentId: string): Promise<TeamData[]> {
  try {
    const { data, error } = await supabase
      .from('test_teams')
      .select('*')
      .eq('event_id', tournamentId)
      .order('draw_position');

    if (error) {
      console.error('Error fetching teams:', error);
      throw error;
    }

    return data?.map(team => ({
      participant1_name: team.player1_name || '',
      participant2_name: team.player2_name || '',
      court_name: team.court_assignment || ''
    })) || [];
  } catch (error) {
    console.error('Error in getTeamsForTournament:', error);
    throw error;
  }
}

/**
 * Clear existing teams for a tournament (for re-draw)
 */
export async function clearTeamsForTournament(tournamentId: string): Promise<void> {
  try {
    const { error: teamsError } = await supabase
      .from('test_teams')
      .delete()
      .eq('event_id', tournamentId);

    if (teamsError) {
      console.error('Error clearing teams:', teamsError);
      throw teamsError;
    }

    const { error: groupsError } = await supabase
      .from('test_groups')
      .delete()
      .eq('event_id', tournamentId);

    if (groupsError) {
      console.error('Error clearing groups:', groupsError);
      throw groupsError;
    }

    console.log('Successfully cleared existing teams and groups');
  } catch (error) {
    console.error('Error in clearTeamsForTournament:', error);
    throw error;
  }
}
