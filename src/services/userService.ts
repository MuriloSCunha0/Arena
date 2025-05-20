import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/supabase-error-handler';
import { userTableService } from './userTableService';
import { UserRole } from '../store/authStore';

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
  cpf?: string;
  userRole?: UserRole;
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
            role: userData.userRole || 'participante'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      if (userData.userRole === 'admin') {
        // Para administradores, criar entrada na tabela users
        const { error: adminError } = await supabase
          .from('users')
          .insert({
            user_id: authData.user.id,
            role: 'admin',
            created_at: new Date().toISOString()
          });
          
        if (adminError) throw adminError;
        
        // Retornar dados do admin
        return {
          id: authData.user.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          birthDate: userData.birthDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Para usuários regulares, utilizar a tabela users
        await userTableService.createUser({
          id: authData.user.id,
          email: userData.email,
          full_name: userData.name,
          phone: userData.phone,
          cpf: userData.cpf,
          birth_date: userData.birthDate
        });
        
        // Insert additional user data in profiles table for compatibility
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
      }
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao registrar usuário');
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserData> {
    try {
      // First, check users table to determine user type
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .single();
        
      if (!adminError && adminData) {
        // User is an admin, get their profile from auth.users metadata
        const { data: authData, error: authError } = await supabase.auth.getUser(userId);
        
        if (authError) throw authError;
        if (!authData.user) throw new Error('Usuário não encontrado');
        
        // Return admin user data
        return {
          id: authData.user.id,
          name: authData.user.user_metadata?.name || 'Admin',
          email: authData.user.email || '',
          createdAt: authData.user.created_at,
          updatedAt: authData.user.updated_at
        };
      }
      
      // Not an admin, try to get from users table
      const regularUser = await userTableService.getUserById(userId);
      
      if (regularUser) {
        return {
          id: regularUser.id,
          name: regularUser.full_name,
          email: regularUser.email,
          phone: regularUser.phone,
          birthDate: regularUser.birth_date,
          createdAt: regularUser.created_at,
          updatedAt: regularUser.updated_at
        };
      }
      
      // If not found in users table, fall back to profiles table
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
      // First check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .single();
        
      // Update auth metadata for both user types
      if (profileData.name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: { name: profileData.name }
        });
        
        if (authError) throw authError;
      }
      
      // Update email for both user types if changed
      if (profileData.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: profileData.email,
        });

        if (authError) throw authError;
      }
      
      if (!adminError && adminData) {
        // Admin user - we only need to update auth metadata, which we did above
        return {
          id: userId,
          name: profileData.name || '',
          email: profileData.email || '',
          ...(profileData.phone && { phone: profileData.phone }),
          ...(profileData.birthDate && { birthDate: profileData.birthDate }),
          updatedAt: new Date().toISOString()
        };
      } else {
        // Regular user - update in users table
        try {
          const userData = {
            ...profileData.name && { full_name: profileData.name },
            ...profileData.phone && { phone: profileData.phone },
            ...profileData.birthDate && { birth_date: profileData.birthDate },
            ...profileData.email && { email: profileData.email }
          };
          
          const updatedUser = await userTableService.updateUser(userId, userData);
          
          return {
            id: updatedUser.id,
            name: updatedUser.full_name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            birthDate: updatedUser.birth_date,
            createdAt: updatedUser.created_at,
            updatedAt: updatedUser.updated_at
          };
        } catch (error) {
          console.warn('Error updating user in users table:', error);
        }
        
        // Fallback to profiles table for compatibility
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

        return this.transformProfileData(data);
      }
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao atualizar perfil');
    }
  }
  /**
   * Change user password
   */
  async changePassword(newPassword: string): Promise<void> {
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
      // First check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .single();
        
      if (!adminError && adminData) {
        // Delete from users table
        const { error: delAdminError } = await supabase
          .from('users')
          .delete()
          .eq('user_id', userId);

        if (delAdminError) throw delAdminError;
      } else {
        // Try to delete from users table
        try {
          await userTableService.deleteUser(userId);
        } catch (error) {
          console.warn('Error deleting from users table:', error);
        }
        
        // Also try to delete from profiles table for compatibility
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

          if (profileError) throw profileError;
        } catch (error) {
          console.warn('Error deleting from profiles table:', error);
        }
      }

      // Finally delete user from auth
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
