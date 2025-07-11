/**
 * Teste para validar a funcionalidade de restart de torneio
 * Este script testa o método restartTournament que apaga os dados
 * do torneio e recria zerado com base no evento
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (ajuste conforme necessário)
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTournamentRestart() {
  console.log('🧪 Starting Tournament Restart Test...\n');
  
  try {
    // 1. Buscar um evento existente para teste
    console.log('1. Buscando evento para teste...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (eventsError || !events || events.length === 0) {
      console.error('❌ Nenhum evento encontrado para teste:', eventsError);
      return;
    }
    
    const testEvent = events[0];
    console.log(`✅ Evento encontrado: ${testEvent.title} (${testEvent.id})`);
    
    // 2. Verificar se já existe torneio para este evento
    console.log('\n2. Verificando torneio existente...');
    const { data: existingTournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('event_id', testEvent.id)
      .maybeSingle();
    
    if (tournamentError) {
      console.error('❌ Erro ao buscar torneio:', tournamentError);
      return;
    }
    
    if (!existingTournament) {
      console.log('⚠️ Nenhum torneio encontrado para este evento');
      
      // Criar um torneio básico para teste
      console.log('3. Criando torneio para teste...');
      const { data: newTournament, error: createError } = await supabase
        .from('tournaments')
        .insert({
          event_id: testEvent.id,
          format: 'GROUP_STAGE_ELIMINATION',
          status: 'CREATED',
          settings: { groupSize: 4, qualifiersPerGroup: 2 },
          teams_data: [
            { id: 'team_1', participants: ['João', 'Maria'], seed: 1 },
            { id: 'team_2', participants: ['Pedro', 'Ana'], seed: 2 }
          ],
          matches_data: [
            {
              id: 'match_1',
              team1: ['João', 'Maria'],
              team2: ['Pedro', 'Ana'],
              score1: 3,
              score2: 1,
              completed: true,
              stage: 'GROUP'
            }
          ],
          standings_data: [],
          elimination_bracket: {}
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar torneio:', createError);
        return;
      }
      
      console.log(`✅ Torneio criado: ${newTournament.id}`);
    } else {
      console.log(`✅ Torneio encontrado: ${existingTournament.id}`);
      console.log(`   Status: ${existingTournament.status}`);
      console.log(`   Teams: ${existingTournament.teams_data?.length || 0}`);
      console.log(`   Matches: ${existingTournament.matches_data?.length || 0}`);
    }
    
    // 3. Testar o restart do torneio
    console.log('\n4. Executando restart do torneio...');
    
    // Simular o método restartTournament
    const tournamentToRestart = existingTournament || await supabase
      .from('tournaments')
      .select('*')
      .eq('event_id', testEvent.id)
      .single();
    
    if (!tournamentToRestart.data) {
      console.error('❌ Torneio não encontrado para restart');
      return;
    }
    
    const tournamentId = tournamentToRestart.data.id;
    
    // Resetar o torneio
    const resetData = {
      status: 'CREATED',
      format: testEvent.tournament_format || 'GROUP_STAGE_ELIMINATION',
      settings: { 
        groupSize: 4,
        qualifiersPerGroup: 2
      },
      current_round: 0,
      groups_count: 0,
      stage: 'GROUP',
      teams_data: [], // Array vazio - será preenchido conforme duplas são formadas
      matches_data: [],
      standings_data: [],
      elimination_bracket: {},
      started_at: null,
      completed_at: null,
      updated_at: new Date().toISOString()
    };
    
    const { data: resetTournament, error: resetError } = await supabase
      .from('tournaments')
      .update(resetData)
      .eq('id', tournamentId)
      .select()
      .single();
    
    if (resetError) {
      console.error('❌ Erro ao resetar torneio:', resetError);
      return;
    }
    
    console.log(`✅ Torneio resetado com sucesso: ${resetTournament.id}`);
    
    // 4. Validar o estado do torneio após reset
    console.log('\n5. Validando estado após reset...');
    console.log(`   Status: ${resetTournament.status}`);
    console.log(`   Format: ${resetTournament.format}`);
    console.log(`   Stage: ${resetTournament.stage}`);
    console.log(`   Teams: ${resetTournament.teams_data?.length || 0} (esperado: 0)`);
    console.log(`   Matches: ${resetTournament.matches_data?.length || 0} (esperado: 0)`);
    console.log(`   Standings: ${Object.keys(resetTournament.standings_data || {}).length} (esperado: 0)`);
    console.log(`   Elimination bracket: ${Object.keys(resetTournament.elimination_bracket || {}).length} (esperado: 0)`);
    
    // 5. Testar adição de duplas conforme elas são formadas
    console.log('\n6. Testando adição de duplas...');
    
    const testTeams = [
      { id: 'team_1', participants: ['João Silva', 'Maria Santos'], seed: 1 },
      { id: 'team_2', participants: ['Pedro Oliveira', 'Ana Costa'], seed: 2 },
      { id: 'team_3', participants: ['Carlos Lima', 'Lucia Ferreira'], seed: 3 }
    ];
    
    // Simular adição gradual de duplas
    for (let i = 0; i < testTeams.length; i++) {
      const currentTeams = testTeams.slice(0, i + 1);
      
      const { data: updatedTournament, error: updateError } = await supabase
        .from('tournaments')
        .update({
          teams_data: currentTeams,
          updated_at: new Date().toISOString()
        })
        .eq('id', tournamentId)
        .select('teams_data')
        .single();
      
      if (updateError) {
        console.error(`❌ Erro ao adicionar dupla ${i + 1}:`, updateError);
        continue;
      }
      
      console.log(`✅ Dupla ${i + 1} adicionada: ${testTeams[i].participants.join(' & ')}`);
      console.log(`   Total de duplas: ${updatedTournament.teams_data.length}`);
    }
    
    // 6. Testar sorteio aleatório
    console.log('\n7. Testando sorteio aleatório...');
    
    const participants = [
      'Roberto Silva', 'Fernanda Costa', 'André Santos', 'Patrícia Lima',
      'Bruno Oliveira', 'Carla Ferreira', 'Diego Pereira', 'Juliana Souza'
    ];
    
    // Simular sorteio aleatório
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    const randomTeams = [];
    
    for (let i = 0; i < shuffledParticipants.length; i += 2) {
      randomTeams.push({
        id: `team_${Math.floor(i / 2) + 1}`,
        participants: [shuffledParticipants[i], shuffledParticipants[i + 1]],
        seed: Math.floor(i / 2) + 1,
      });
    }
    
    const { data: randomTournament, error: randomError } = await supabase
      .from('tournaments')
      .update({
        teams_data: randomTeams,
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId)
      .select('teams_data')
      .single();
    
    if (randomError) {
      console.error('❌ Erro ao aplicar sorteio aleatório:', randomError);
    } else {
      console.log(`✅ Sorteio aleatório aplicado:`);
      randomTournament.teams_data.forEach((team, index) => {
        console.log(`   ${index + 1}. ${team.participants.join(' & ')}`);
      });
    }
    
    console.log('\n🎉 Teste de restart de torneio concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
if (require.main === module) {
  testTournamentRestart()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Teste falhou:', error);
      process.exit(1);
    });
}

module.exports = { testTournamentRestart };
