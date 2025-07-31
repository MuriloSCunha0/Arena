// Teste para verificar se as tabelas de teste existem
import { supabase } from './lib/supabase.js';

async function testDatabase() {
  try {
    console.log('🔍 Verificando tabelas de teste...');
    
    // Tentar buscar dados das tabelas de teste
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('test_tournaments')
      .select('id, name')
      .limit(1);

    if (tournamentsError) {
      console.log('❌ Tabela test_tournaments não existe:', tournamentsError.message);
      
      // Tentar criar as tabelas básicas
      console.log('🔄 Criando tabelas...');
      
      const createTournaments = `
        CREATE TABLE IF NOT EXISTS test_tournaments (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          name varchar(255) NOT NULL,
          category varchar(100) NOT NULL,
          description text,
          stage varchar(20) DEFAULT 'SETUP',
          status varchar(20) DEFAULT 'PENDING',
          settings jsonb DEFAULT '{}',
          metadata jsonb DEFAULT '{}',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
      `;
      
      const { error: createError } = await supabase.rpc('execute_sql', { 
        sql_query: createTournaments 
      });
      
      if (createError) {
        console.error('❌ Erro ao criar tabela:', createError.message);
      } else {
        console.log('✅ Tabela test_tournaments criada!');
      }
      
    } else {
      console.log(`✅ Tabela test_tournaments existe (${tournaments?.length || 0} registros)`);
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testDatabase();
