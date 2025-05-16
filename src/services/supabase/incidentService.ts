import { supabase } from '../../lib/supabase';
import { MatchIncident, IncidentType } from '../../types/referee';
import { User } from '../../types';

// Convert database object to MatchIncident
const transformIncident = (data: any): MatchIncident => ({
  id: data.id,
  matchId: data.match_id,
  tournamentId: data.tournament_id,
  participantId: data.participant_id,
  teamId: data.team_id,
  type: data.type as IncidentType,
  description: data.description,
  timestamp: data.timestamp,
  registeredBy: data.registered_by,
  outcome: data.outcome
});

// Convert MatchIncident to database object
const toSupabaseIncident = (incident: Partial<MatchIncident>) => ({
  match_id: incident.matchId,
  tournament_id: incident.tournamentId,
  participant_id: incident.participantId,
  team_id: incident.teamId,
  type: incident.type,
  description: incident.description,
  timestamp: incident.timestamp || new Date().toISOString(),
  registered_by: incident.registeredBy,
  outcome: incident.outcome
});

export const IncidentService = {
  // Get all incidents for a match
  async getByMatchId(matchId: string): Promise<MatchIncident[]> {
    try {
      const { data, error } = await supabase
        .from('match_incidents')
        .select('*, referee:registered_by(name)')
        .eq('match_id', matchId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data.map(transformIncident);
    } catch (error) {
      console.error('Error fetching match incidents:', error);
      throw error;
    }
  },

  // Create a new incident
  async create(incident: Partial<MatchIncident>): Promise<MatchIncident> {
    try {
      // Make sure we have a timestamp
      if (!incident.timestamp) {
        incident.timestamp = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('match_incidents')
        .insert(toSupabaseIncident(incident))
        .select()
        .single();

      if (error) throw error;
      return transformIncident(data);
    } catch (error) {
      console.error('Error creating match incident:', error);
      throw error;
    }
  },

  // Update an incident
  async update(id: string, incident: Partial<MatchIncident>): Promise<MatchIncident> {
    try {
      const { data, error } = await supabase
        .from('match_incidents')
        .update(toSupabaseIncident(incident))
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformIncident(data);
    } catch (error) {
      console.error('Error updating match incident:', error);
      throw error;
    }
  },

  // Delete an incident
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('match_incidents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting match incident:', error);
      throw error;
    }
  },

  // Get incident statistics for a tournament
  async getTournamentStatistics(tournamentId: string): Promise<{
    totalIncidents: number;
    byType: Record<IncidentType, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('match_incidents')
        .select('type')
        .eq('tournament_id', tournamentId);

      if (error) throw error;

      // Initialize all incident types with 0 count
      const byType = Object.values(IncidentType).reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {} as Record<IncidentType, number>);

      // Count incidents by type
      data.forEach(incident => {
        byType[incident.type as IncidentType]++;
      });

      return {
        totalIncidents: data.length,
        byType
      };
    } catch (error) {
      console.error('Error fetching tournament incident statistics:', error);
      throw error;
    }
  }
};

export default IncidentService;
