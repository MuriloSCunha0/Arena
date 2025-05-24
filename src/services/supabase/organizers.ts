import { supabase } from '../../lib/supabase';
import { Organizer } from '../../types';

// Convert Supabase data to our type
const transformOrganizer = (data: any): Organizer => ({
  id: data.id,
  name: data.name,
  phone: data.phone,
  email: data.email,
  pixKey: data.pix_key,
  defaultCommissionRate: data.default_commission_rate,
  active: data.active,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

// Convert our type to Supabase format
const toSupabaseOrganizer = (organizer: Partial<Organizer>) => ({
  name: organizer.name,
  phone: organizer.phone,
  email: organizer.email,
  pix_key: organizer.pixKey,
  default_commission_rate: organizer.defaultCommissionRate,
  active: organizer.active
});

export const OrganizersService = {
  // Get all organizers
  async getAll(): Promise<Organizer[]> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching organizers:', error);
        throw new Error(`Failed to fetch organizers: ${error.message}`);
      }

      return (data || []).map(transformOrganizer);
    } catch (error) {
      console.error('Error in getAll organizers:', error);
      throw error;
    }
  },

  // Get active organizers
  async getActive(): Promise<Organizer[]> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error fetching active organizers:', error);
        throw new Error(`Failed to fetch active organizers: ${error.message}`);
      }

      return (data || []).map(transformOrganizer);
    } catch (error) {
      console.error('Error in getActive organizers:', error);
      throw error;
    }
  },

  // Get organizer by ID
  async getById(id: string): Promise<Organizer | null> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching organizer:', error);
        throw new Error(`Failed to fetch organizer: ${error.message}`);
      }

      return data ? transformOrganizer(data) : null;
    } catch (error) {
      console.error(`Error in getById organizer ${id}:`, error);
      throw error;
    }
  },

  // Create new organizer
  async create(organizer: Partial<Organizer>): Promise<Organizer> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .insert(toSupabaseOrganizer(organizer))
        .select()
        .single();

      if (error) {
        console.error('Error creating organizer:', error);
        throw new Error(`Failed to create organizer: ${error.message}`);
      }

      return transformOrganizer(data);
    } catch (error) {
      console.error('Error in create organizer:', error);
      throw error;
    }
  },

  // Update organizer
  async update(id: string, organizer: Partial<Organizer>): Promise<Organizer> {
    try {
      const { data, error } = await supabase
        .from('organizers')
        .update(toSupabaseOrganizer(organizer))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating organizer:', error);
        throw new Error(`Failed to update organizer: ${error.message}`);
      }

      return transformOrganizer(data);
    } catch (error) {
      console.error(`Error in update organizer ${id}:`, error);
      throw error;
    }
  },

  // Delete organizer
  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizers')
        .delete()
        .eq('id', id);      if (error) {
        console.error('Error deleting organizer:', error);
        throw new Error(`Falha ao excluir organizador: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error in delete organizer ${id}:`, error);
      throw error;
    }
  },

  // Get events for organizer
  async getEvents(organizerId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching organizer events:', error);
        throw new Error(`Failed to fetch organizer events: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`Error in getEvents for organizer ${organizerId}:`, error);
      throw error;
    }
  },
  
  // Calculate commissions for organizer
  async calculateCommissions(organizerId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      // Create a date range query if dates are provided
      let query = supabase
        .from('events')
        .select(`
          id, title, date, organizer_commission_rate,
          financial_transactions!inner(amount, type, status)
        `)
        .eq('organizer_id', organizerId)
        .eq('financial_transactions.type', 'INCOME')
        .eq('financial_transactions.status', 'CONFIRMED');
      
      if (startDate) {
        query = query.gte('date', startDate);
      }
      
      if (endDate) {
        query = query.lte('date', endDate);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error('Error calculating commissions:', error);
        throw new Error(`Failed to calculate commissions: ${error.message}`);
      }

      // Process the data to calculate commissions
      const commissionSummary = {
        totalRevenue: 0,
        totalCommission: 0,
        events: [] as any[]
      };

      // Group transactions by event and calculate totals
      if (data) {
        for (const event of data) {
          const eventRevenue = event.financial_transactions.reduce(
            (sum: number, tx: any) => sum + tx.amount, 0
          );
          
          const commissionRate = event.organizer_commission_rate;
          const eventCommission = eventRevenue * (commissionRate / 100);
          
          commissionSummary.totalRevenue += eventRevenue;
          commissionSummary.totalCommission += eventCommission;
          
          commissionSummary.events.push({
            eventId: event.id,
            title: event.title,
            date: event.date,
            revenue: eventRevenue,
            commissionRate: commissionRate,
            commission: eventCommission
          });
        }
      }

      return commissionSummary;
    } catch (error) {
      console.error(`Error calculating commissions for organizer ${organizerId}:`, error);
      throw error;
    }
  }
};
