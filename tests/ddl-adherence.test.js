/**
 * Testes de Aderência ao DDL - Arena Beach Tennis
 * Arquivo: tests/ddl-adherence.test.js
 * 
 * Valida se o código TypeScript está usando os campos corretos conforme o DDL PostgreSQL
 */

import { supabase } from '../src/lib/supabase.js';

describe('DDL Adherence Tests', () => {
  
  // ========================================
  // TESTES DE ESTRUTURA DE TABELAS
  // ========================================
  
  describe('Database Schema Validation', () => {
    
    test('should have correct events table structure', async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      // Se houver dados, verificar estrutura
      if (data && data.length > 0) {
        const event = data[0];
        
        // ✅ Campos obrigatórios conforme DDL
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('title'); // Não 'name'
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('team_formation');
        expect(event).toHaveProperty('max_participants');
        expect(event).toHaveProperty('location');
        expect(event).toHaveProperty('date');
        expect(event).toHaveProperty('time');
        expect(event).toHaveProperty('entry_fee'); // Não 'price'
        expect(event).toHaveProperty('created_at');
        expect(event).toHaveProperty('updated_at');
        
        // ✅ Campos opcionais conforme DDL
        expect(event).toHaveProperty('description');
        expect(event).toHaveProperty('tournament_format');
        expect(event).toHaveProperty('min_participants');
        expect(event).toHaveProperty('current_participants');
        expect(event).toHaveProperty('categories');
        expect(event).toHaveProperty('age_restrictions');
        expect(event).toHaveProperty('skill_level');
        expect(event).toHaveProperty('end_date');
        expect(event).toHaveProperty('end_time');
        expect(event).toHaveProperty('prize_pool');
        expect(event).toHaveProperty('prize_distribution');
        expect(event).toHaveProperty('organizer_id');
        expect(event).toHaveProperty('organizer_commission_rate');
        expect(event).toHaveProperty('court_ids');
        expect(event).toHaveProperty('rules');
        expect(event).toHaveProperty('additional_info');
        expect(event).toHaveProperty('banner_image_url');
        expect(event).toHaveProperty('images');
        expect(event).toHaveProperty('settings');
      }
    });

    test('should have correct participants table structure', async () => {
      const { data, error } = await supabase
        .from('participants') // ✅ Não 'event_participants'
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const participant = data[0];
        
        // ✅ Campos obrigatórios conforme DDL
        expect(participant).toHaveProperty('id');
        expect(participant).toHaveProperty('event_id');
        expect(participant).toHaveProperty('name');
        expect(participant).toHaveProperty('phone');
        expect(participant).toHaveProperty('cpf');
        expect(participant).toHaveProperty('payment_status');
        expect(participant).toHaveProperty('registered_at');
        expect(participant).toHaveProperty('updated_at');
        
        // ✅ Campos de estatísticas conforme DDL
        expect(participant).toHaveProperty('points_scored');
        expect(participant).toHaveProperty('points_against');
        expect(participant).toHaveProperty('matches_played');
        expect(participant).toHaveProperty('matches_won');
        expect(participant).toHaveProperty('matches_lost');
        expect(participant).toHaveProperty('sets_won');
        expect(participant).toHaveProperty('sets_lost');
        
        // ✅ Campos opcionais conforme DDL
        expect(participant).toHaveProperty('user_id');
        expect(participant).toHaveProperty('email');
        expect(participant).toHaveProperty('birth_date');
        expect(participant).toHaveProperty('partner_id');
        expect(participant).toHaveProperty('partner_name');
        expect(participant).toHaveProperty('team_name');
        expect(participant).toHaveProperty('seed_number');
        expect(participant).toHaveProperty('category');
        expect(participant).toHaveProperty('skill_level');
        expect(participant).toHaveProperty('payment_method');
        expect(participant).toHaveProperty('final_position');
        expect(participant).toHaveProperty('eliminated_in_round');
      }
    });

    test('should have correct tournaments table structure', async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const tournament = data[0];
        
        // ✅ Campos obrigatórios conforme DDL
        expect(tournament).toHaveProperty('id');
        expect(tournament).toHaveProperty('event_id');
        expect(tournament).toHaveProperty('format');
        expect(tournament).toHaveProperty('created_at');
        expect(tournament).toHaveProperty('updated_at');
        
        // ✅ Campos JSONB conforme DDL
        expect(tournament).toHaveProperty('matches_data');
        expect(tournament).toHaveProperty('teams_data');
        expect(tournament).toHaveProperty('standings_data');
        expect(tournament).toHaveProperty('elimination_bracket');
        expect(tournament).toHaveProperty('settings');
        
        // ✅ Outros campos conforme DDL
        expect(tournament).toHaveProperty('status');
        expect(tournament).toHaveProperty('current_round');
        expect(tournament).toHaveProperty('groups_count');
        expect(tournament).toHaveProperty('third_place_match');
        expect(tournament).toHaveProperty('auto_advance');
        expect(tournament).toHaveProperty('stage');
      }
    });

    test('should have correct matches table structure', async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      
      if (data && data.length > 0) {
        const match = data[0];
        
        // ✅ Campos obrigatórios conforme DDL
        expect(match).toHaveProperty('id');
        expect(match).toHaveProperty('event_id');
        expect(match).toHaveProperty('team1_ids'); // Array de UUIDs
        expect(match).toHaveProperty('team2_ids'); // Array de UUIDs
        expect(match).toHaveProperty('round_number');
        expect(match).toHaveProperty('created_at');
        expect(match).toHaveProperty('updated_at');
        
        // ✅ Campo winner conforme DDL
        expect(match).toHaveProperty('winner_team'); // Não 'winnerId'
        
        // ✅ Verificar se team_ids são arrays
        expect(Array.isArray(match.team1_ids)).toBe(true);
        expect(Array.isArray(match.team2_ids)).toBe(true);
        
        // ✅ Campos opcionais conforme DDL
        expect(match).toHaveProperty('tournament_id');
        expect(match).toHaveProperty('court_id');
        expect(match).toHaveProperty('team1_score');
        expect(match).toHaveProperty('team2_score');
        expect(match).toHaveProperty('sets_data');
        expect(match).toHaveProperty('status');
        expect(match).toHaveProperty('group_number');
      }
    });
  });

  // ========================================
  // TESTES DE ENUMS E TIPOS
  // ========================================
  
  describe('Enum Values Validation', () => {
    
    test('should accept valid event types', async () => {
      const validTypes = ['TOURNAMENT', 'POOL', 'FRIENDLY', 'CHAMPIONSHIP'];
      
      for (const type of validTypes) {
        const { data, error } = await supabase
          .from('events')
          .select('id')
          .eq('type', type)
          .limit(1);
        
        // Não deve gerar erro de enum inválido
        expect(error).toBeNull();
      }
    });
    
    test('should accept valid tournament formats', async () => {
      const validFormats = [
        'SINGLE_ELIMINATION',
        'DOUBLE_ELIMINATION', 
        'ROUND_ROBIN',
        'SWISS',
        'GROUP_STAGE_ELIMINATION'
      ];
      
      for (const format of validFormats) {
        const { data, error } = await supabase
          .from('events')
          .select('id')
          .eq('tournament_format', format)
          .limit(1);
        
        expect(error).toBeNull();
      }
    });
    
    test('should accept valid team formation types', async () => {
      const validFormations = ['FORMED', 'RANDOM', 'DRAFT'];
      
      for (const formation of validFormations) {
        const { data, error } = await supabase
          .from('events')
          .select('id')
          .eq('team_formation', formation)
          .limit(1);
        
        expect(error).toBeNull();
      }
    });
    
    test('should accept valid match statuses', async () => {
      const validStatuses = [
        'SCHEDULED',
        'IN_PROGRESS', 
        'COMPLETED',
        'CANCELLED',
        'WALKOVER',
        'FORFEIT'
      ];
      
      for (const status of validStatuses) {
        const { data, error } = await supabase
          .from('matches')
          .select('id')
          .eq('status', status)
          .limit(1);
        
        expect(error).toBeNull();
      }
    });
    
    test('should accept valid payment statuses', async () => {
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'EXPIRED'];
      
      for (const status of validStatuses) {
        const { data, error } = await supabase
          .from('participants')
          .select('id')
          .eq('payment_status', status)
          .limit(1);
        
        expect(error).toBeNull();
      }
    });
  });

  // ========================================
  // TESTES DE CONSTRAINTS E TRIGGERS
  // ========================================
  
  describe('Database Constraints Validation', () => {
    
    test('should enforce participant count constraints', async () => {
      // Testar se current_participants não pode ser maior que max_participants
      const { data: events } = await supabase
        .from('events')
        .select('id, max_participants, current_participants')
        .gt('current_participants', 0);
      
      if (events) {
        events.forEach(event => {
          expect(event.current_participants).toBeLessThanOrEqual(event.max_participants);
        });
      }
    });
    
    test('should enforce positive values for numeric fields', async () => {
      const { data: events } = await supabase
        .from('events')
        .select('max_participants, min_participants, entry_fee, prize_pool')
        .limit(10);
      
      if (events) {
        events.forEach(event => {
          expect(event.max_participants).toBeGreaterThan(0);
          expect(event.min_participants || 0).toBeGreaterThanOrEqual(0);
          expect(event.entry_fee || 0).toBeGreaterThanOrEqual(0);
          expect(event.prize_pool || 0).toBeGreaterThanOrEqual(0);
        });
      }
    });
    
    test('should enforce team differences in matches', async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select('team1_ids, team2_ids')
        .limit(10);
      
      if (matches) {
        matches.forEach(match => {
          // team1_ids e team2_ids devem ser diferentes
          expect(match.team1_ids).not.toEqual(match.team2_ids);
        });
      }
    });
  });

  // ========================================
  // TESTES DE INTEGRIDADE REFERENCIAL
  // ========================================
  
  describe('Foreign Key Integrity', () => {
    
    test('should maintain event-tournament relationship', async () => {
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select(`
          id,
          event_id,
          events (id, title)
        `)
        .limit(5);
      
      if (tournaments) {
        tournaments.forEach(tournament => {
          expect(tournament.event_id).toBeTruthy();
          expect(tournament.events).toBeTruthy();
        });
      }
    });
    
    test('should maintain event-participants relationship', async () => {
      const { data: participants } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          events (id, title)
        `)
        .limit(5);
      
      if (participants) {
        participants.forEach(participant => {
          expect(participant.event_id).toBeTruthy();
          expect(participant.events).toBeTruthy();
        });
      }
    });
    
    test('should maintain tournament-matches relationship', async () => {
      const { data: matches } = await supabase
        .from('matches')
        .select(`
          id,
          tournament_id,
          tournaments (id, format)
        `)
        .not('tournament_id', 'is', null)
        .limit(5);
      
      if (matches) {
        matches.forEach(match => {
          expect(match.tournament_id).toBeTruthy();
          expect(match.tournaments).toBeTruthy();
        });
      }
    });
  });

  // ========================================
  // TESTES DE DADOS JSONB
  // ========================================
  
  describe('JSONB Data Validation', () => {
    
    test('should have valid matches_data structure in tournaments', async () => {
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, matches_data')
        .not('matches_data', 'is', null)
        .limit(3);
      
      if (tournaments) {
        tournaments.forEach(tournament => {
          if (tournament.matches_data) {
            expect(Array.isArray(tournament.matches_data)).toBe(true);
            
            // Se houver partidas, verificar estrutura
            if (tournament.matches_data.length > 0) {
              const match = tournament.matches_data[0];
              expect(match).toHaveProperty('id');
              expect(match).toHaveProperty('tournamentId');
              expect(match).toHaveProperty('eventId');
              expect(match).toHaveProperty('team1Ids');
              expect(match).toHaveProperty('team2Ids');
            }
          }
        });
      }
    });
    
    test('should have valid teams_data structure in tournaments', async () => {
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, teams_data')
        .not('teams_data', 'is', null)
        .limit(3);
      
      if (tournaments) {
        tournaments.forEach(tournament => {
          if (tournament.teams_data) {
            expect(Array.isArray(tournament.teams_data)).toBe(true);
            
            // Se houver times, verificar estrutura
            if (tournament.teams_data.length > 0) {
              const team = tournament.teams_data[0];
              expect(team).toHaveProperty('id');
              expect(team).toHaveProperty('name');
              expect(team).toHaveProperty('participantIds');
              expect(Array.isArray(team.participantIds)).toBe(true);
            }
          }
        });
      }
    });
  });

  // ========================================
  // TESTE DE SINCRONIZAÇÃO
  // ========================================
  
  describe('Data Synchronization', () => {
    
    test('should have synchronized participant counts', async () => {
      const { data: events } = await supabase
        .from('events')
        .select(`
          id,
          current_participants,
          participants (id)
        `)
        .limit(5);
      
      if (events) {
        events.forEach(event => {
          const actualCount = event.participants?.length || 0;
          expect(event.current_participants).toBe(actualCount);
        });
      }
    });
  });
});

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Função auxiliar para validar estrutura de objetos
 */
function validateObjectStructure(obj, requiredFields, optionalFields = []) {
  // Verificar campos obrigatórios
  requiredFields.forEach(field => {
    expect(obj).toHaveProperty(field);
  });
  
  // Verificar se campos extras são permitidos
  const allAllowedFields = [...requiredFields, ...optionalFields];
  const objKeys = Object.keys(obj);
  
  objKeys.forEach(key => {
    expect(allAllowedFields).toContain(key);
  });
}

/**
 * Função auxiliar para testar enums
 */
async function testEnumValues(table, column, validValues) {
  for (const value of validValues) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .eq(column, value)
      .limit(1);
    
    expect(error).toBeNull();
  }
}
