import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id?: string;
  user_id: string;
  full_name: string;
  phone: string;
  cpf: string;
  birth_date: string;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileWithStats extends UserProfile {
  totalParticipations?: number;
  upcomingEvents?: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    price: number;
    imageUrl?: string;
  }>;
  pastEvents?: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    placement?: string | number;
    teamPartner?: string;
  }>;
}

export interface UserProfileUpdateDTO {
  full_name?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  photo_url?: string;
}

// Transform data from Supabase to our UserProfile interface
const transformUserProfile = (data: any): UserProfile => ({
  id: data.id,
  user_id: data.user_id,
  full_name: data.full_name,
  phone: data.phone,
  cpf: data.cpf,
  birth_date: data.birth_date,
  photo_url: data.photo_url,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

// Convert our interface to Supabase format for update operations
const toSupabaseUserProfile = (profile: UserProfileUpdateDTO) => {
  // Create a copy to avoid modifying the original object
  const supabaseProfile: Record<string, any> = {};
  
  if (profile.full_name !== undefined) supabaseProfile.full_name = profile.full_name;
  if (profile.phone !== undefined) supabaseProfile.phone = profile.phone;
  if (profile.cpf !== undefined) supabaseProfile.cpf = profile.cpf;
  if (profile.birth_date !== undefined) supabaseProfile.birth_date = profile.birth_date;
  if (profile.photo_url !== undefined) supabaseProfile.photo_url = profile.photo_url;
  
  // Add updated_at timestamp
  supabaseProfile.updated_at = new Date().toISOString();
  
  return supabaseProfile;
};

export const UserProfileService = {
  // Get user profile by user ID
  async getByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Profile not found
        }
        throw error;
      }

      return data ? transformUserProfile(data) : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },

  // Get comprehensive profile with statistics
  async getProfileWithStats(userId: string): Promise<UserProfileWithStats | null> {
    try {
      // Get the basic profile first
      const profile = await this.getByUserId(userId);
      if (!profile) return null;

      // Initialize the enhanced profile
      const enhancedProfile: UserProfileWithStats = {
        ...profile,
        totalParticipations: 0,
        upcomingEvents: [],
        pastEvents: []
      };

      // Query for past events the user has participated in
      const { data: pastParticipations, error: pastError } = await supabase
        .from('participants')
        .select(`
          id,
          events:event_id (
            id,
            title,
            date,
            location
          ),
          partner_name,
          placement
        `)
        .eq('email', (await supabase.auth.getUser()).data.user?.email)
        .lt('events.date', new Date().toISOString())
        .order('events.date', { ascending: false });

      if (pastError) throw pastError;

      if (pastParticipations) {
        enhancedProfile.totalParticipations = pastParticipations.length;
        enhancedProfile.pastEvents = pastParticipations.map(p => ({
          id: p.events.id,
          title: p.events.title,
          date: p.events.date,
          location: p.events.location,
          placement: p.placement || 'Participou',
          teamPartner: p.partner_name || undefined
        }));
      }

      // Query for upcoming events the user might be interested in
      const { data: upcomingEvents, error: upcomingError } = await supabase
        .from('events')
        .select('id, title, date, location, price, banner_image_url')
        .gt('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      if (upcomingEvents) {
        enhancedProfile.upcomingEvents = upcomingEvents.map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          location: e.location,
          price: e.price,
          imageUrl: e.banner_image_url
        }));
      }

      return enhancedProfile;
    } catch (error) {
      console.error('Error fetching profile with stats:', error);
      throw error;
    }
  },

  // Create or update user profile
  async upsert(userId: string, profile: UserProfileUpdateDTO): Promise<UserProfile> {
    try {
      // Check if profile exists first
      const existingProfile = await this.getByUserId(userId);
      
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('user_profiles')
          .update(toSupabaseUserProfile(profile))
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return transformUserProfile(data);
      } else {
        // Create new profile
        const newProfile = {
          user_id: userId,
          ...profile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('user_profiles')
          .insert([newProfile])
          .select()
          .single();

        if (error) throw error;
        return transformUserProfile(data);
      }
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  },

  // Upload profile photo
  async uploadProfilePhoto(userId: string, file: File): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL for the uploaded file
      const { data } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);
      
      const publicUrl = data.publicUrl;
      
      // Update user profile with the new photo URL
      await this.upsert(userId, { photo_url: publicUrl });
      
      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      throw error;
    }
  },

  // Check if user has organizer role
  async checkUserRole(userId: string): Promise<string> {
    try {
      // Check if user is an organizer with any role
      const { data: organizerData, error: organizerError } = await supabase
        .from('event_organizers')
        .select('role')
        .eq('user_id', userId)
        .limit(1);
        
      if (organizerError) throw organizerError;
      
      if (organizerData && organizerData.length > 0) {
        return organizerData[0].role; // Return the role: 'ADMIN', 'ORGANIZER', or 'ASSISTANT'
      }
      
      // If not an organizer, user is a regular participant
      return 'USER';
    } catch (error) {
      console.error('Error checking user role:', error);
      return 'USER'; // Default to regular user on error
    }
  }
};
