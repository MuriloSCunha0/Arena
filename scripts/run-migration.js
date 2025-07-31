// Script para executar a migração das colunas faltantes
import { supabase } from '../src/lib/supabase.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Iniciando migração de colunas...');
    
    // Ler o arquivo de migração
    const migrationPath = path.join(process.cwd(), 'db', 'add_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executando migração...');
    
    // Tentar executar a migração usando RPC
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_query: migrationSQL 
    });
    
    if (error) {
      console.error('❌ Erro na migração:', error.message);
      
      // Tentar executar comandos individuais se falhar
      console.log('🔄 Tentando execução individual...');
      
      // 1. Adicionar formation_type
      console.log('📝 Adicionando coluna formation_type...');
      const { error: formationError } = await supabase.rpc('execute_sql', {
        sql_query: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'test_teams' 
                  AND column_name = 'formation_type'
              ) THEN
                  ALTER TABLE test_teams ADD COLUMN formation_type varchar(20) DEFAULT 'MANUAL';
              END IF;
          END $$;
        `
      });
      
      if (formationError) {
        console.error('❌ Erro ao adicionar formation_type:', formationError.message);
      } else {
        console.log('✅ Coluna formation_type adicionada');
      }
      
      // 2. Adicionar created_at
      console.log('📝 Adicionando coluna created_at...');
      const { error: createdAtError } = await supabase.rpc('execute_sql', {
        sql_query: `
          DO $$ 
          BEGIN
              IF NOT EXISTS (
                  SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'test_group_teams' 
                  AND column_name = 'created_at'
              ) THEN
                  ALTER TABLE test_group_teams ADD COLUMN created_at timestamptz DEFAULT now();
              END IF;
          END $$;
        `
      });
      
      if (createdAtError) {
        console.error('❌ Erro ao adicionar created_at:', createdAtError.message);
      } else {
        console.log('✅ Coluna created_at adicionada');
      }
      
      // 3. Recriar view
      console.log('📝 Recriando view...');
      const { error: viewError } = await supabase.rpc('execute_sql', {
        sql_query: `
          DROP VIEW IF EXISTS v_test_teams_with_players;
          
          CREATE VIEW v_test_teams_with_players AS
          SELECT 
              t.id,
              t.tournament_id,
              t.name as team_name,
              t.seed_number,
              t.is_bye,
              t.formation_type,
              t.created_at,
              p1.name as player1_name,
              p2.name as player2_name,
              p1.id as player1_id,
              p2.id as player2_id,
              COALESCE(t.name, p1.name || ' & ' || p2.name) as display_name
          FROM test_teams t
          JOIN test_participants p1 ON t.player1_id = p1.id
          JOIN test_participants p2 ON t.player2_id = p2.id;
        `
      });
      
      if (viewError) {
        console.error('❌ Erro ao recriar view:', viewError.message);
      } else {
        console.log('✅ View v_test_teams_with_players recriada');
      }
      
    } else {
      console.log('✅ Migração executada com sucesso!');
    }
    
    // Verificar se as colunas foram adicionadas
    console.log('\n🔍 Verificando colunas...');
    
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, column_default')
      .in('table_name', ['test_teams', 'test_group_teams'])
      .in('column_name', ['formation_type', 'created_at']);
    
    if (checkError) {
      console.error('❌ Erro ao verificar colunas:', checkError.message);
    } else {
      console.log('📊 Colunas encontradas:');
      columns?.forEach(col => {
        console.log(`   • ${col.table_name}.${col.column_name} (${col.data_type})`);
      });
    }
    
    console.log('\n🎉 Migração concluída!');
    console.log('🚀 O TestTournamentManager agora deve funcionar corretamente');
    
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
  }
}

// Executar migração
runMigration();
