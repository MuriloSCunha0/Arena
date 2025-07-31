import { supabase } from '../src/lib/supabase.js';

async function executeSchemaDirectly() {
  try {
    console.log('🔄 Executando schema de teste diretamente via SQL...');
    
    // Primeiro, vamos criar as tabelas básicas
    const tables = [
      // Torneios
      `CREATE TABLE IF NOT EXISTS test_tournaments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        category varchar(100) NOT NULL,
        description text,
        stage varchar(20) DEFAULT 'SETUP' CHECK (stage IN ('SETUP', 'GROUP_STAGE', 'ELIMINATION')),
        status varchar(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'STARTED', 'COMPLETED')),
        settings jsonb DEFAULT '{}',
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`,
      
      // Participantes
      `CREATE TABLE IF NOT EXISTS test_participants (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        email varchar(255),
        phone varchar(20),
        cpf varchar(14),
        category varchar(50) DEFAULT 'OPEN',
        user_id uuid,
        partner_id uuid REFERENCES test_participants(id),
        payment_status varchar(20) DEFAULT 'PENDING',
        registered_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now()
      )`,
      
      // Duplas/Equipes
      `CREATE TABLE IF NOT EXISTS test_teams (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
        name varchar(255),
        player1_id uuid NOT NULL REFERENCES test_participants(id) ON DELETE CASCADE,
        player2_id uuid NOT NULL REFERENCES test_participants(id) ON DELETE CASCADE,
        seed_number int,
        is_bye boolean DEFAULT false,
        formation_type varchar(20) DEFAULT 'MANUAL',
        created_at timestamptz DEFAULT now()
      )`,
      
      // Grupos
      `CREATE TABLE IF NOT EXISTS test_groups (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
        group_number int NOT NULL,
        group_name varchar(100),
        max_teams int DEFAULT 4,
        settings jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      )`,
      
      // Relação grupo-duplas
      `CREATE TABLE IF NOT EXISTS test_group_teams (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id uuid NOT NULL REFERENCES test_groups(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES test_teams(id) ON DELETE CASCADE,
        position int,
        joined_at timestamptz DEFAULT now(),
        UNIQUE(group_id, team_id)
      )`,
      
      // Partidas
      `CREATE TABLE IF NOT EXISTS test_matches (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
        team1_id uuid REFERENCES test_teams(id),
        team2_id uuid REFERENCES test_teams(id),
        winner_id uuid REFERENCES test_teams(id),
        stage varchar(20) NOT NULL,
        round_number int DEFAULT 1,
        match_number int,
        position int,
        group_id uuid REFERENCES test_groups(id),
        score1 int DEFAULT 0,
        score2 int DEFAULT 0,
        sets_score jsonb,
        games_score jsonb,
        completed boolean DEFAULT false,
        walkover boolean DEFAULT false,
        forfeit boolean DEFAULT false,
        court_name varchar(50),
        scheduled_time timestamptz,
        actual_start_time timestamptz,
        actual_end_time timestamptz,
        parent_match1_id uuid REFERENCES test_matches(id),
        parent_match2_id uuid REFERENCES test_matches(id),
        next_match_id uuid REFERENCES test_matches(id),
        notes text,
        metadata jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`,
      
      // Classificação dos grupos
      `CREATE TABLE IF NOT EXISTS test_group_standings (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        group_id uuid NOT NULL REFERENCES test_groups(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES test_teams(id) ON DELETE CASCADE,
        matches_played int DEFAULT 0,
        wins int DEFAULT 0,
        losses int DEFAULT 0,
        draws int DEFAULT 0,
        games_won int DEFAULT 0,
        games_lost int DEFAULT 0,
        game_difference int DEFAULT 0,
        sets_won int DEFAULT 0,
        sets_lost int DEFAULT 0,
        set_difference int DEFAULT 0,
        points int DEFAULT 0,
        position int,
        qualified boolean DEFAULT false,
        head_to_head_wins int DEFAULT 0,
        updated_at timestamptz DEFAULT now(),
        UNIQUE(group_id, team_id)
      )`,
      
      // Logs
      `CREATE TABLE IF NOT EXISTS test_tournament_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id uuid NOT NULL REFERENCES test_tournaments(id) ON DELETE CASCADE,
        action varchar(100) NOT NULL,
        description text,
        actor varchar(100) DEFAULT 'SYSTEM',
        details jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      )`
    ];

    // Executar criação das tabelas
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      console.log(`📝 [${i + 1}/${tables.length}] Criando tabela...`);
      
      const { error } = await supabase.rpc('exec_sql', { query: table });
      
      if (error) {
        console.error(`❌ Erro na tabela ${i + 1}:`, error.message);
      } else {
        console.log(`✅ Tabela ${i + 1} criada/verificada`);
      }
    }

    // Criar views
    console.log('\n🔄 Criando views...');
    
    const viewTeams = `
      CREATE OR REPLACE VIEW v_test_teams_with_players AS
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
      JOIN test_participants p2 ON t.player2_id = p2.id
    `;

    const { error: viewError } = await supabase.rpc('exec_sql', { query: viewTeams });
    
    if (viewError) {
      console.error('❌ Erro ao criar view de duplas:', viewError.message);
    } else {
      console.log('✅ View de duplas criada');
    }

    console.log('\n🎉 Schema básico executado! Teste o sistema agora.');
    
  } catch (error) {
    console.error('❌ Erro na execução:', error);
  }
}

executeSchemaDirectly();
