import { supabase } from '../../lib/supabase';
import { Match } from '../../types';

/**
 * Interface para estatísticas de usuário
 */
export interface UserStatistics {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  gamesWon: number;
  gamesLost: number;
  gameDifference: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  lastUpdated: string;
}

/**
 * Interface para histórico de partidas do usuário
 */
export interface UserMatchHistory {
  matchId: string;
  tournamentId: string;
  eventId: string;
  date: string;
  opponent: string[];
  partner?: string;
  score1: number;
  score2: number;
  result: 'win' | 'loss';
  stage: string;
}

/**
 * Serviço para gerenciar estatísticas de usuários
 */
export class UserStatsService {
  
  /**
   * Atualiza as estatísticas de um usuário baseado em uma partida concluída
   */
  static async updateUserStatsFromMatch(match: Match): Promise<void> {
    if (!match.completed || !match.team1 || !match.team2 || !match.winnerId) {
      console.log('Match not completed or missing required data, skipping stats update');
      return;
    }

    try {
      console.log(`🔄 Updating user stats for match ${match.id}`);
      
      // Buscar participantes da partida
      const allParticipants = [...match.team1, ...match.team2];
      
      // Para cada participante, buscar o usuário correspondente e atualizar estatísticas
      for (const participantId of allParticipants) {
        await this.updateParticipantStats(participantId, match);
      }
      
      console.log('✅ User stats updated successfully');
    } catch (error) {
      console.error('❌ Error updating user stats from match:', error);
      throw error;
    }
  }

  /**
   * Atualiza as estatísticas de um participante específico
   */
  private static async updateParticipantStats(participantId: string, match: Match): Promise<void> {
    try {
      console.log(`🔍 Looking for participant ${participantId}...`);
      
      // Buscar dados do participante
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('id, name, phone, email, event_id, cpf')
        .eq('id', participantId)
        .single();

      if (participantError || !participant) {
        console.warn(`❌ Participant ${participantId} not found:`, participantError);
        return;
      }

      console.log(`📋 Found participant:`, {
        id: participant.id,
        name: participant.name,
        phone: participant.phone,
        email: participant.email
      });

      // Tentar encontrar usuário pelo email ou phone
      const user = await this.findUserByParticipant(participant);
      
      if (!user) {
        console.warn(`⚠️ User not found for participant ${participantId} (${participant.name}). Creating user record...`);
        
        // Tentar criar um registro de usuário baseado no participante
        const createdUser = await this.createUserFromParticipant(participant);
        if (!createdUser) {
          console.warn(`❌ Could not create user for participant ${participantId}, skipping stats update`);
          return;
        }
        
        console.log(`✅ Created user record for participant ${participant.name}`);
      }

      const finalUser = user || await this.findUserByParticipant(participant);
      if (!finalUser) {
        console.warn(`❌ Still no user found for participant ${participantId}, skipping stats update`);
        return;
      }

      // Determinar se o participante venceu ou perdeu
      const isWinner = this.determineMatchResult(participantId, match);
      const partner = this.getPartner(participantId, match);
      const opponent = this.getOpponents(participantId, match);

      console.log(`🎯 Match result for ${participant.name}: ${isWinner ? 'WIN' : 'LOSS'}`);

      // Buscar estatísticas atuais do usuário
      const currentStats = await this.getUserStats(finalUser.id);
      
      // Atualizar estatísticas
      const updatedStats = this.calculateUpdatedStats(currentStats, match, isWinner);
      
      // Adicionar partida ao histórico
      const matchRecord: UserMatchHistory = {
        matchId: match.id,
        tournamentId: match.tournamentId,
        eventId: match.eventId,
        date: new Date().toISOString(),
        opponent: opponent,
        partner: partner,
        score1: match.score1 || 0,
        score2: match.score2 || 0,
        result: isWinner ? 'win' : 'loss',
        stage: match.stage || 'GROUP'
      };

      // Salvar estatísticas atualizadas
      await this.saveUserStats(finalUser.id, updatedStats, matchRecord);
      
      console.log(`✅ Updated stats for user ${finalUser.id} (${participant.name}):`, {
        totalMatches: updatedStats.totalMatches,
        wins: updatedStats.wins,
        losses: updatedStats.losses,
        winRate: updatedStats.winRate.toFixed(1) + '%'
      });
      
    } catch (error) {
      console.error(`❌ Error updating stats for participant ${participantId}:`, error);
    }
  }

  /**
   * Busca usuário correspondente ao participante
   */
  private static async findUserByParticipant(participant: any): Promise<any> {
    try {
      console.log(`🔍 Searching for user matching participant:`, {
        name: participant.name,
        email: participant.email,
        phone: participant.phone
      });

      // Primeiro, tentar buscar por email (mais confiável)
      if (participant.email && participant.email.includes('@')) {
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('id, email, user_metadata')
          .eq('email', participant.email)
          .single();
        
        if (userByEmail && !emailError) {
          console.log(`✅ Found user by email: ${userByEmail.email}`);
          return userByEmail;
        }
        
        if (emailError && emailError.code !== 'PGRST116') {
          console.warn('Error searching by email:', emailError);
        }
      }

      // Se não encontrar por email, buscar por phone ou name no user_metadata
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, user_metadata, app_metadata');

      if (allUsersError) {
        console.warn('Error fetching all users:', allUsersError);
        return null;
      }

      if (allUsers && allUsers.length > 0) {
        // Tentar buscar por telefone
        const userByPhone = allUsers.find(user => {
          const metadata = user.user_metadata || {};
          const userPhone = metadata.phone;
          const participantPhone = participant.phone;
          
          if (userPhone && participantPhone) {
            // Normalizar telefones removendo caracteres especiais
            const normalizedUserPhone = userPhone.replace(/\D/g, '');
            const normalizedParticipantPhone = participantPhone.replace(/\D/g, '');
            return normalizedUserPhone === normalizedParticipantPhone;
          }
          return false;
        });
        
        if (userByPhone) {
          console.log(`✅ Found user by phone: ${userByPhone.email || userByPhone.id}`);
          return userByPhone;
        }

        // Como último recurso, tentar buscar por nome (menos confiável)
        const userByName = allUsers.find(user => {
          const metadata = user.user_metadata || {};
          const userName = metadata.name;
          
          if (userName && participant.name) {
            return userName.toLowerCase().trim() === participant.name.toLowerCase().trim();
          }
          return false;
        });
        
        if (userByName) {
          console.log(`✅ Found user by name: ${userByName.email || userByName.id}`);
          return userByName;
        }
      }

      console.log(`❌ No user found for participant ${participant.name}`);
      return null;

    } catch (error) {
      console.error('❌ Error in findUserByParticipant:', error);
      return null;
    }
  }

  /**
   * Cria um registro de usuário baseado nos dados do participante
   */
  private static async createUserFromParticipant(participant: any): Promise<any> {
    try {
      // Verificar se o participante tem email válido
      if (!participant.email || !participant.email.includes('@')) {
        console.warn(`❌ Cannot create user for participant ${participant.name}: invalid email`);
        return null;
      }

      // Criar registro de usuário
      const userData = {
        email: participant.email,
        user_metadata: {
          name: participant.name,
          phone: participant.phone,
          cpf: participant.cpf,
          stats: this.getDefaultStats()
        },
        app_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (createError) {
        console.error(`❌ Error creating user for participant ${participant.name}:`, createError);
        return null;
      }

      console.log(`✅ Created user record for ${participant.name} (${participant.email})`);
      return createdUser;

    } catch (error) {
      console.error('❌ Error in createUserFromParticipant:', error);
      return null;
    }
  }

  /**
   * Determina se o participante venceu a partida
   */
  private static determineMatchResult(participantId: string, match: Match): boolean {
    if (!match.team1 || !match.team2 || !match.winnerId) return false;
    
    const isInTeam1 = match.team1.includes(participantId);
    const isInTeam2 = match.team2.includes(participantId);
    
    if (isInTeam1) {
      return match.winnerId === 'team1';
    } else if (isInTeam2) {
      return match.winnerId === 'team2';
    }
    
    return false;
  }

  /**
   * Obtém o parceiro do participante na partida
   */
  private static getPartner(participantId: string, match: Match): string | undefined {
    if (!match.team1 || !match.team2) return undefined;
    
    const isInTeam1 = match.team1.includes(participantId);
    const isInTeam2 = match.team2.includes(participantId);
    
    if (isInTeam1 && match.team1.length > 1) {
      const partnerId = match.team1.find(id => id !== participantId);
      return partnerId;
    } else if (isInTeam2 && match.team2.length > 1) {
      const partnerId = match.team2.find(id => id !== participantId);
      return partnerId;
    }
    
    return undefined;
  }

  /**
   * Obtém os oponentes do participante na partida
   */
  private static getOpponents(participantId: string, match: Match): string[] {
    if (!match.team1 || !match.team2) return [];
    
    const isInTeam1 = match.team1.includes(participantId);
    
    if (isInTeam1) {
      return match.team2;
    } else {
      return match.team1;
    }
  }

  /**
   * Busca as estatísticas atuais do usuário
   */
  private static async getUserStats(userId: string): Promise<UserStatistics> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return this.getDefaultStats();
      }

      const metadata = user.user_metadata || {};
      const stats = metadata.stats || {};
      
      return {
        totalMatches: stats.totalMatches || 0,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        winRate: stats.winRate || 0,
        gamesWon: stats.gamesWon || 0,
        gamesLost: stats.gamesLost || 0,
        gameDifference: stats.gameDifference || 0,
        tournamentsPlayed: stats.tournamentsPlayed || 0,
        tournamentsWon: stats.tournamentsWon || 0,
        lastUpdated: stats.lastUpdated || new Date().toISOString()
      };
    } catch (error) {
      console.warn('Error fetching user stats, using defaults:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Retorna estatísticas padrão para usuários novos
   */
  private static getDefaultStats(): UserStatistics {
    return {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      gamesWon: 0,
      gamesLost: 0,
      gameDifference: 0,
      tournamentsPlayed: 0,
      tournamentsWon: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calcula as estatísticas atualizadas após uma partida
   */
  private static calculateUpdatedStats(
    currentStats: UserStatistics, 
    match: Match, 
    isWinner: boolean
  ): UserStatistics {
    const newStats = { ...currentStats };
    
    // Atualizar contadores básicos
    newStats.totalMatches += 1;
    
    // Atualizar vitórias/derrotas
    if (isWinner) {
      newStats.wins += 1;
    } else {
      newStats.losses += 1;
    }
    
    // Calcular games de forma mais precisa
    // Para o participante, precisamos determinar quais foram seus games
    const participantScore = isWinner 
      ? Math.max(match.score1 || 0, match.score2 || 0)  // Maior score se venceu
      : Math.min(match.score1 || 0, match.score2 || 0); // Menor score se perdeu
    
    const opponentScore = isWinner
      ? Math.min(match.score1 || 0, match.score2 || 0)  // Menor score se venceu
      : Math.max(match.score1 || 0, match.score2 || 0); // Maior score se perdeu
    
    newStats.gamesWon += participantScore;
    newStats.gamesLost += opponentScore;
    
    // Calcular métricas derivadas
    newStats.winRate = newStats.totalMatches > 0 ? (newStats.wins / newStats.totalMatches) * 100 : 0;
    newStats.gameDifference = newStats.gamesWon - newStats.gamesLost;
    newStats.lastUpdated = new Date().toISOString();
    
    console.log(`📊 Updated stats calculation:`, {
      totalMatches: newStats.totalMatches,
      wins: newStats.wins,
      losses: newStats.losses,
      winRate: newStats.winRate.toFixed(1) + '%',
      gamesWon: newStats.gamesWon,
      gamesLost: newStats.gamesLost,
      gameDifference: newStats.gameDifference
    });
    
    return newStats;
  }

  /**
   * Salva as estatísticas atualizadas do usuário
   */
  private static async saveUserStats(
    userId: string, 
    stats: UserStatistics, 
    matchRecord: UserMatchHistory
  ): Promise<void> {
    try {
      console.log(`💾 Saving stats for user ${userId}...`);
      
      // Buscar metadados atuais do usuário
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error(`❌ Error fetching user metadata for ${userId}:`, fetchError);
        throw new Error(`Error fetching user metadata: ${fetchError.message}`);
      }

      const currentMetadata = currentUser?.user_metadata || {};
      const currentHistory = currentMetadata.matchHistory || [];
      
      // Verificar se a partida já está no histórico (evitar duplicatas)
      const existingMatch = currentHistory.find((record: UserMatchHistory) => 
        record.matchId === matchRecord.matchId
      );
      
      let updatedHistory = currentHistory;
      if (!existingMatch) {
        // Adicionar nova partida ao histórico (manter apenas os últimos 50 jogos)
        updatedHistory = [...currentHistory, matchRecord].slice(-50);
        console.log(`📝 Added match ${matchRecord.matchId} to user history`);
      } else {
        console.log(`⚠️ Match ${matchRecord.matchId} already exists in user history, updating stats only`);
      }
      
      // Atualizar metadados com novas estatísticas e histórico
      const updatedMetadata = {
        ...currentMetadata,
        stats: stats,
        matchHistory: updatedHistory
      };

      console.log(`📊 Updating user ${userId} with stats:`, {
        totalMatches: stats.totalMatches,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.winRate.toFixed(1) + '%',
        gamesWon: stats.gamesWon,
        gamesLost: stats.gamesLost
      });

      // Salvar no banco
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          user_metadata: updatedMetadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error(`❌ Error updating user stats for ${userId}:`, updateError);
        throw new Error(`Error updating user stats: ${updateError.message}`);
      }

      console.log(`✅ Stats successfully saved for user ${userId}`);

      // Validar que a atualização foi bem-sucedida
      const { data: validationUser, error: validationError } = await supabase
        .from('users')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (!validationError && validationUser) {
        const savedStats = validationUser.user_metadata?.stats || {};
        console.log(`🔍 Validation - user ${userId} now has:`, {
          totalMatches: savedStats.totalMatches,
          wins: savedStats.wins,
          losses: savedStats.losses,
          winRate: (savedStats.winRate || 0).toFixed(1) + '%'
        });
      }

    } catch (error) {
      console.error(`❌ Error saving user stats for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Busca as estatísticas de um usuário para exibição
   */
  static async getUserStatistics(userId: string): Promise<UserStatistics> {
    return await this.getUserStats(userId);
  }

  /**
   * Busca o histórico de partidas de um usuário
   */
  static async getUserMatchHistory(userId: string, limit: number = 20): Promise<UserMatchHistory[]> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (error || !user) {
        return [];
      }

      const metadata = user.user_metadata || {};
      const history = metadata.matchHistory || [];
      
      return history
        .sort((a: UserMatchHistory, b: UserMatchHistory) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error fetching user match history:', error);
      return [];
    }
  }

  /**
   * Atualiza estatísticas de torneio quando um torneio é concluído
   */
  static async updateTournamentStats(winnersTeam: string[]): Promise<void> {
    try {
      console.log(`🏆 Updating tournament stats for winners:`, winnersTeam);
      
      for (const participantId of winnersTeam) {
        // Buscar dados do participante
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .select('id, name, phone, email')
          .eq('id', participantId)
          .single();

        if (participantError || !participant) {
          console.warn(`Participant ${participantId} not found`);
          continue;
        }

        // Buscar usuário correspondente
        const user = await this.findUserByParticipant(participant);
        
        if (!user) {
          console.warn(`User not found for participant ${participantId}`);
          continue;
        }

        // Atualizar estatísticas de torneio
        const currentStats = await this.getUserStats(user.id);
        currentStats.tournamentsWon += 1;
        currentStats.lastUpdated = new Date().toISOString();

        // Salvar estatísticas atualizadas (sem histórico de partida)
        const { data: currentUser } = await supabase
          .from('users')
          .select('user_metadata')
          .eq('id', user.id)
          .single();

        const currentMetadata = currentUser?.user_metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          stats: currentStats
        };

        await supabase
          .from('users')
          .update({ 
            user_metadata: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        console.log(`🏆 Tournament win recorded for user ${user.id} (${participant.name})`);
      }
      
    } catch (error) {
      console.error('Error updating tournament stats:', error);
    }
  }

  /**
   * Valida se um usuário tem estatísticas válidas
   */
  static async validateUserStats(userId: string): Promise<boolean> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('user_metadata')
        .eq('id', userId)
        .single();

      if (error || !user) {
        console.log(`❌ User ${userId} not found for validation`);
        return false;
      }

      const metadata = user.user_metadata || {};
      const stats = metadata.stats || {};
      
      console.log(`📊 User ${userId} stats validation:`, {
        totalMatches: stats.totalMatches || 0,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        winRate: stats.winRate || 0,
        gamesWon: stats.gamesWon || 0,
        gamesLost: stats.gamesLost || 0,
        gameDifference: stats.gameDifference || 0,
        tournamentsPlayed: stats.tournamentsPlayed || 0,
        tournamentsWon: stats.tournamentsWon || 0,
        lastUpdated: stats.lastUpdated || 'Never'
      });

      return true;
    } catch (error) {
      console.error('❌ Error validating user stats:', error);
      return false;
    }
  }

  /**
   * Lista usuários com estatísticas para debugging
   */
  static async listUsersWithStats(): Promise<void> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, user_metadata')
        .not('user_metadata->stats', 'is', null);

      if (error) {
        console.error('❌ Error listing users with stats:', error);
        return;
      }

      console.log(`📋 Found ${users?.length || 0} users with statistics:`);
      
      users?.forEach((user, index) => {
        const stats = user.user_metadata?.stats || {};
        console.log(`${index + 1}. ${user.email || user.id}:`, {
          matches: stats.totalMatches || 0,
          wins: stats.wins || 0,
          losses: stats.losses || 0,
          winRate: (stats.winRate || 0).toFixed(1) + '%'
        });
      });

    } catch (error) {
      console.error('❌ Error in listUsersWithStats:', error);
    }
  }

  /**
   * Método de debug para testar a atualização de estatísticas
   */
  static async debugUserStatsUpdate(matchId: string): Promise<void> {
    try {
      console.log(`🔍 DEBUG: Starting user stats update for match ${matchId}`);
      
      // Buscar a partida
      const { data: matchData, error: matchError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !matchData) {
        console.error(`❌ Match ${matchId} not found:`, matchError);
        return;
      }

      console.log(`📋 Found match:`, {
        id: matchData.id,
        team1: matchData.team1,
        team2: matchData.team2,
        score1: matchData.score1,
        score2: matchData.score2,
        winnerId: matchData.winner_id,
        completed: matchData.completed
      });

      if (!matchData.completed) {
        console.log(`⚠️ Match ${matchId} is not completed, skipping stats update`);
        return;
      }

      // Transformar para o formato Match
      const match: Match = {
        id: matchData.id,
        eventId: matchData.event_id,
        tournamentId: matchData.tournament_id,
        round: matchData.round || 0,
        position: matchData.position || 0,
        team1: matchData.team1,
        team2: matchData.team2,
        score1: matchData.score1 || 0,
        score2: matchData.score2 || 0,
        winnerId: matchData.winner_id,
        completed: matchData.completed,
        scheduledTime: matchData.scheduled_time,
        courtId: matchData.court_id,
        stage: matchData.stage || 'GROUP',
        groupNumber: matchData.group_number,
        createdAt: matchData.created_at || new Date().toISOString(),
        updatedAt: matchData.updated_at || new Date().toISOString(),
      };

      // Atualizar estatísticas
      await this.updateUserStatsFromMatch(match);
      
      console.log(`✅ DEBUG: Completed user stats update for match ${matchId}`);
      
    } catch (error) {
      console.error(`❌ DEBUG: Error in user stats update:`, error);
    }
  }
}
