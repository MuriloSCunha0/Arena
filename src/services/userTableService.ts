import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../utils/supabase-error-handler';

// Define types for regular user data
export interface RegularUserData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  user_metadata?: any;
  app_metadata?: any;
  tournaments_history?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  password?: string; // Usado apenas para criação, nunca armazenado diretamente
}

export interface UpdateUserData {
  full_name?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  tournaments_history?: any[];
}

class UserTableService {
  /**
   * Create a new user in the users table
   */
  async createUser(userData: CreateUserData): Promise<RegularUserData> {
    try {
      // Prepare user data for insertion
      const userRecord = {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        phone: userData.phone,
        cpf: userData.cpf,
        birth_date: userData.birth_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tournaments_history: []
      };
      
      // Insert into 'users' table
      const { data, error } = await supabase
        .from('users')
        .insert([userRecord])
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao criar usuário na tabela users');
    }
  }
  
  /**
   * Get user data from users table by ID
   */
  async getUserById(userId: string): Promise<RegularUserData | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Row not found error
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao buscar usuário na tabela users');
    }
  }
  
  /**
   * Get user data from users table by email
   */
  async getUserByEmail(email: string): Promise<RegularUserData | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Row not found error
          return null;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao buscar usuário por email na tabela users');
    }
  }
  
  /**
   * Update user data in users table
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<RegularUserData> {
    try {
      // Add updated timestamp
      const updateData = {
        ...userData,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();
        
      if (error) throw error;
      
      return data;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao atualizar usuário na tabela users');
    }
  }
  
  /**
   * Add tournament to user's tournament history
   */
  async addTournamentToHistory(userId: string, tournamentData: any): Promise<void> {
    try {
      // First get the current user data
      const userData = await this.getUserById(userId);
      if (!userData) throw new Error('Usuário não encontrado');
      
      // Get current tournament history or initialize empty array
      const currentHistory = userData.tournaments_history || [];
      
      // Add new tournament to history
      const updatedHistory = [...currentHistory, {
        ...tournamentData,
        participatedAt: new Date().toISOString()
      }];
      
      // Update user record
      await this.updateUser(userId, {
        tournaments_history: updatedHistory
      });
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao adicionar torneio ao histórico do usuário');
    }
  }
  
  /**
   * Delete user from users table
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (error) throw error;
    } catch (error) {
      throw handleSupabaseError(error, 'Erro ao excluir usuário da tabela users');
    }
  }
}

export const userTableService = new UserTableService();
