import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/supabase-error-handler';

// Define types for user data
export interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  bio?: string;
  preferredCategories?: string[];
  playingLevel?: 'INICIANTE' | 'INTERMEDIÁRIO' | 'AVANÇADO' | 'PROFISSIONAL';
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  birthDate?: string;
}

class UserService {
  /**
   * Register a new user
   */
  async registerUser(userData: RegisterUserData): Promise<UserData> {
    try {
      // Register user with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Insert additional user data in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          birth_date: userData.birthDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) throw profileError;

      return this.transformProfileData(profileData);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao registrar usuário');
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserData> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Perfil não encontrado');

      return this.transformProfileData(data);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao buscar perfil do usuário');
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profileData: Partial<UserData>): Promise<UserData> {
    try {
      // Transform data to snake_case for database
      const dbData = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        birth_date: profileData.birthDate,
        bio: profileData.bio,
        preferred_categories: profileData.preferredCategories,
        playing_level: profileData.playingLevel,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(dbData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Perfil não encontrado');

      // If email changed, update auth email
      if (profileData.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profileData.email,
        });

        if (authError) throw authError;
      }

      return this.transformProfileData(data);
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao atualizar perfil');
    }
  }

  /**
   * Change user password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao alterar senha');
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      // First delete profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      // Then delete user from auth
      // Note: This requires admin rights, so you might need to implement a cloud function
      // or a backend endpoint to handle this properly
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) throw authError;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao excluir conta');
    }
  }

  /**
   * Reset password (forgot password flow)
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao solicitar redefinição de senha');
    }
  }

  /**
   * Transform database profile data to frontend format
   */
  private transformProfileData(dbData: any): UserData {
    return {
      id: dbData.id,
      name: dbData.name,
      email: dbData.email,
      phone: dbData.phone || undefined,
      birthDate: dbData.birth_date || undefined,
      bio: dbData.bio || undefined,
      preferredCategories: dbData.preferred_categories || [],
      playingLevel: dbData.playing_level,
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }
}

export const userService = new UserService();
