import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEventStatus() {
  console.log('🔄 Atualizando status dos eventos baseado nos dados de torneio...');

  try {
    // 1. Buscar todos os eventos
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, status');

    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
      return;
    }

    console.log(`📊 Total de eventos encontrados: ${events?.length || 0}`);

    // 2. Buscar todos os torneios
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('event_id, standings_data, status');

    if (tournamentsError) {
      console.error('❌ Erro ao buscar torneios:', tournamentsError);
      return;
    }

    console.log(`🏆 Total de torneios encontrados: ${tournaments?.length || 0}`);

    // 3. Processar cada evento
    let eventsUpdated = 0;
    let eventsWithTournaments = 0;
    let eventsWithoutTournaments = 0;

    for (const event of events || []) {
      const tournament = tournaments?.find(t => t.event_id === event.id);
      let newStatus = '';

      if (tournament) {
        eventsWithTournaments++;
        
        // Se tem torneio, verificar se tem standings_data
        if (tournament.standings_data && 
            typeof tournament.standings_data === 'object' && 
            Object.keys(tournament.standings_data).length > 0) {
          // Tem dados, torneio iniciado
          newStatus = 'IN_PROGRESS';
          console.log(`🎯 ${event.title} - Torneio iniciado (tem standings_data)`);
        } else {
          // Não tem dados, torneio não iniciado
          newStatus = 'OPEN';
          console.log(`📝 ${event.title} - Torneio não iniciado (sem standings_data)`);
        }
      } else {
        eventsWithoutTournaments++;
        // Não tem torneio associado, deixar como aberto para inscrições
        newStatus = 'OPEN';
        console.log(`📅 ${event.title} - Sem torneio associado`);
      }

      // Atualizar apenas se o status for diferente
      if (newStatus && newStatus !== event.status) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ status: newStatus })
          .eq('id', event.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar evento ${event.title}:`, updateError);
        } else {
          console.log(`✅ ${event.title}: ${event.status} → ${newStatus}`);
          eventsUpdated++;
        }
      } else {
        console.log(`⏭️  ${event.title}: Status já está correto (${event.status})`);
      }
    }

    // 4. Mostrar resumo
    console.log('\n📋 RESUMO DA ATUALIZAÇÃO:');
    console.log(`  - Eventos atualizados: ${eventsUpdated}`);
    console.log(`  - Eventos com torneios: ${eventsWithTournaments}`);
    console.log(`  - Eventos sem torneios: ${eventsWithoutTournaments}`);

    // 5. Verificar resultado final
    const { data: finalEvents, error: finalError } = await supabase
      .from('events')
      .select('id, title, status')
      .order('status');

    if (finalError) {
      console.error('❌ Erro ao verificar resultado final:', finalError);
      return;
    }

    console.log('\n🎯 STATUS FINAL DOS EVENTOS:');
    const statusCounts = finalEvents?.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      console.log(`  - ${event.title}: ${event.status}`);
      return acc;
    }, {});

    console.log('\n📊 CONTAGEM POR STATUS:');
    Object.entries(statusCounts || {}).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} eventos`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

updateEventStatus();
