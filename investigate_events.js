// Script para investigar eventos disponíveis
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (use suas próprias credenciais)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Investigando eventos disponíveis...\n');

async function investigateEvents() {
  try {
    // 1. Verificar todos os eventos no banco
    console.log('📋 1. Todos os eventos no banco:');
    const { data: allEvents, error: allEventsError } = await supabase
      .from('events')
      .select('id, title, description, location, date, time, entry_fee, banner_image_url, status, created_at')
      .order('created_at', { ascending: false });
    
    if (allEventsError) {
      console.error('❌ Erro ao buscar eventos:', allEventsError);
      return;
    }
    
    console.log(`Total de eventos: ${allEvents?.length || 0}`);
    allEvents?.forEach((event, index) => {
      console.log(`${index + 1}. ${event.title}`);
      console.log(`   - ID: ${event.id}`);
      console.log(`   - Status: ${event.status}`);
      console.log(`   - Data: ${event.date}`);
      console.log(`   - Taxa: R$ ${event.entry_fee || 0}`);
      console.log('');
    });

    // 2. Verificar eventos com status OPEN ou PUBLISHED
    console.log('📋 2. Eventos com status OPEN ou PUBLISHED:');
    const { data: openEvents, error: openEventsError } = await supabase
      .from('events')
      .select('id, title, status, date')
      .in('status', ['OPEN', 'PUBLISHED']);
    
    if (openEventsError) {
      console.error('❌ Erro ao buscar eventos abertos:', openEventsError);
    } else {
      console.log(`Eventos OPEN/PUBLISHED: ${openEvents?.length || 0}`);
      openEvents?.forEach(event => {
        console.log(`- ${event.title} (${event.status}) - ${event.date}`);
      });
    }

    // 3. Verificar eventos com data futura
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n📅 3. Data de hoje: ${today}`);
    console.log('📋 Eventos com data futura:');
    
    const { data: futureEvents, error: futureEventsError } = await supabase
      .from('events')
      .select('id, title, status, date')
      .gt('date', today);
    
    if (futureEventsError) {
      console.error('❌ Erro ao buscar eventos futuros:', futureEventsError);
    } else {
      console.log(`Eventos futuros: ${futureEvents?.length || 0}`);
      futureEvents?.forEach(event => {
        console.log(`- ${event.title} (${event.status}) - ${event.date}`);
      });
    }

    // 4. Verificar eventos que atendem os critérios básicos
    console.log('\n📋 4. Eventos que atendem critérios básicos (OPEN/PUBLISHED + data futura):');
    const { data: criteriaEvents, error: criteriaError } = await supabase
      .from('events')
      .select('id, title, status, date')
      .in('status', ['OPEN', 'PUBLISHED'])
      .gt('date', today);
    
    if (criteriaError) {
      console.error('❌ Erro ao buscar eventos com critérios:', criteriaError);
    } else {
      console.log(`Eventos que atendem critérios: ${criteriaEvents?.length || 0}`);
      criteriaEvents?.forEach(event => {
        console.log(`- ${event.title} (${event.status}) - ${event.date}`);
      });
    }

    // 5. Verificar torneios associados
    console.log('\n📋 5. Verificando torneios associados:');
    if (criteriaEvents && criteriaEvents.length > 0) {
      const eventIds = criteriaEvents.map(event => event.id);
      
      const { data: tournaments, error: tournamentError } = await supabase
        .from('tournaments')
        .select('event_id, standings_data, status, created_at')
        .in('event_id', eventIds);

      if (tournamentError) {
        console.error('❌ Erro ao buscar torneios:', tournamentError);
      } else {
        console.log(`Torneios encontrados: ${tournaments?.length || 0}`);
        
        criteriaEvents.forEach(event => {
          const tournament = tournaments?.find(t => t.event_id === event.id);
          console.log(`\n📄 Evento: ${event.title}`);
          
          if (!tournament) {
            console.log('   ✅ Sem torneio associado - DISPONÍVEL');
          } else {
            console.log(`   🏆 Torneio encontrado (status: ${tournament.status})`);
            console.log(`   📊 Standings data: ${tournament.standings_data ? 'Preenchido' : 'Vazio'}`);
            
            if (!tournament.standings_data || Object.keys(tournament.standings_data).length === 0) {
              console.log('   ✅ Torneio não iniciado - DISPONÍVEL');
            } else {
              console.log('   ❌ Torneio já iniciado - NÃO DISPONÍVEL');
            }
          }
        });
      }
    }

    // 6. Simular o resultado final do método getEventosDisponiveis
    console.log('\n📋 6. Resultado final (simulando getEventosDisponiveis):');
    
    if (criteriaEvents && criteriaEvents.length > 0) {
      const eventIds = criteriaEvents.map(event => event.id);
      
      const { data: tournaments } = await supabase
        .from('tournaments')
        .select('event_id, standings_data, status')
        .in('event_id', eventIds);

      const availableEvents = criteriaEvents.filter(event => {
        const tournament = tournaments?.find(t => t.event_id === event.id);
        
        if (!tournament) return true;
        
        if (!tournament.standings_data || 
            Object.keys(tournament.standings_data).length === 0) {
          return true;
        }
        
        return false;
      });

      console.log(`✅ Eventos finalmente disponíveis: ${availableEvents.length}`);
      availableEvents.forEach(event => {
        console.log(`- ${event.title} (${event.status}) - ${event.date}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro na investigação:', error);
  }
}

investigateEvents();
