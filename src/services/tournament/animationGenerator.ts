import { TeamFormationAnimation } from '../../types';
import { supabase } from '../../lib/supabase';

/**
 * Service for generating animated team formations and bracket visualizations
 * For Instagram live streams
 */
export const AnimationGeneratorService = {
  /**
   * Generate team formation animation data
   */
  async generateTeamFormationData(eventId: string): Promise<TeamFormationAnimation> {
    try {
      // Get all participants for this event
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('payment_status', 'CONFIRMED'); // Only include confirmed participants
      
      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        throw new Error('Failed to fetch participants');
      }
      
      // Get all courts for this event with proper structure
      const { data: eventCourts, error: courtsError } = await supabase
        .from('event_courts')
        .select(`
          court_id,
          courts(id, name)
        `)
        .eq('event_id', eventId);
      
      if (courtsError) {
        console.error('Error fetching courts:', courtsError);
        throw new Error('Failed to fetch courts');
      }
      
      // Extract court objects correctly from the nested structure
      const courts = eventCourts
        .map(ec => ec.courts)
        .filter(Boolean)
        .flat(); // Flatten the array of court objects
      
      // Check if we have courts available
      if (!courts.length) {
        throw new Error('No courts available for this event');
      }
      
      // Shuffle participants randomly for team formation
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      
      // Create teams (pairs of participants)
      const teams: {
        id: string;
        members: { id: string; name: string; avatarUrl?: string }[];
      }[] = [];
      
      // Pair participants to form teams
      for (let i = 0; i < shuffledParticipants.length; i += 2) {
        const member1 = shuffledParticipants[i];
        const member2 = i + 1 < shuffledParticipants.length ? shuffledParticipants[i + 1] : null;
        
        const teamId = `team_${i / 2 + 1}`;
        teams.push({
          id: teamId,
          members: [
            {
              id: member1.id,
              name: member1.name,
              avatarUrl: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member1.name)
            },
            ...(member2 ? [{
              id: member2.id,
              name: member2.name,
              avatarUrl: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member2.name)
            }] : [])
          ]
        });
      }
      
      // Generate matches and assign to courts
      const courtMatches: {
        id: string;
        name: string;
        matches: { id: string; team1Id: string; team2Id: string; scheduledTime?: string }[];
      }[] = [];
      
      // Distribute teams across courts
      const teamCount = teams.length;
      const courtCount = courts.length;
      const matchesPerCourt = Math.ceil(teamCount / 2 / courtCount);
      
      let matchCounter = 0;
      
      courts.forEach((court, courtIndex) => {
        // Make sure we have valid court data
        if (!court || typeof court !== 'object') {
          console.error('Invalid court data:', court);
          return;
        }
        
        const courtMatchData = {
          id: court.id,
          name: court.name,
          matches: [] as { id: string; team1Id: string; team2Id: string; scheduledTime?: string }[]
        };
        
        // Assign matches to this court
        for (let i = 0; i < matchesPerCourt; i++) {
          const team1Index = courtIndex * matchesPerCourt * 2 + i * 2;
          const team2Index = team1Index + 1;
          
          if (team1Index < teamCount) {
            const match = {
              id: `match_${++matchCounter}`,
              team1Id: teams[team1Index].id,
              team2Id: team2Index < teamCount ? teams[team2Index].id : 'bye',
              scheduledTime: new Date(Date.now() + matchCounter * 30 * 60000).toISOString() // 30 min intervals
            };
            
            courtMatchData.matches.push(match);
          }
        }
        
        courtMatches.push(courtMatchData);
      });
      
      // Return the complete animation data
      const animationData: TeamFormationAnimation = {
        teams,
        courts: courtMatches
      };
      
      // Store the generated data in the tournament record for future reference
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({
          visualization_data: animationData,
          bracket_generation_time: new Date().toISOString()
        })
        .eq('event_id', eventId);
      
      if (tournamentError) {
        console.error('Error saving visualization data:', tournamentError);
      }
      
      return animationData;
    } catch (error) {
      console.error('Error generating team formation data:', error);
      throw error;
    }
  },
  
  /**
   * Fetch previously generated team formation data
   */
  async getVisualizationData(eventId: string): Promise<TeamFormationAnimation | null> {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('visualization_data')
        .eq('event_id', eventId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      return data?.visualization_data || null;
    } catch (error) {
      console.error('Error fetching visualization data:', error);
      throw error;
    }
  }
};
