import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usar suas variáveis de ambiente)
const supabaseUrl = 'https://ahcxtkkxqnlclgwdkvdc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoY3h0a2t4cW5sY2xnd2RrdmRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTUzNzkxMDUsImV4cCI6MjAzMDk1NTEwNX0.LtlFyJo4Bd9BPfU1Qvo5nONGO8vlEKJP8CjKbJkEhBc';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCourtsIntegration() {
  console.log('🏟️ === TESTE DE INTEGRAÇÃO QUADRAS-EVENTOS ===\n');

  try {
    // 1. Verificar quadras existentes
    console.log('📊 1. Verificando quadras existentes...');
    const { data: courts, error: courtsError } = await supabase
      .from('courts')
      .select('*')
      .eq('active', true);

    if (courtsError) {
      console.log('❌ Erro ao buscar quadras:', courtsError);
      return;
    }

    console.log(`✅ Encontradas ${courts.length} quadras ativas`);
    courts.forEach(court => {
      console.log(`   - ${court.name} (${court.type}): ${court.status}`);
      if (court.width && court.length) {
        console.log(`     Dimensões: ${court.width}m × ${court.length}m`);
      }
      if (court.hourly_rate) {
        console.log(`     Taxa: R$ ${court.hourly_rate}/hora`);
      }
    });

    // 2. Verificar eventos existentes
    console.log('\n📅 2. Verificando eventos existentes...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, court_ids, status')
      .limit(5);

    if (eventsError) {
      console.log('❌ Erro ao buscar eventos:', eventsError);
      return;
    }

    console.log(`✅ Encontrados ${events.length} eventos`);
    events.forEach(event => {
      console.log(`   - ${event.title}: ${event.status}`);
      if (event.court_ids && event.court_ids.length > 0) {
        console.log(`     Quadras associadas: ${event.court_ids.length}`);
      } else {
        console.log('     Nenhuma quadra associada');
      }
    });

    // 3. Verificar reservas de quadras
    console.log('\n📝 3. Verificando reservas de quadras...');
    const { data: reservations, error: reservationsError } = await supabase
      .from('court_reservations')
      .select('*')
      .limit(5);

    if (reservationsError) {
      console.log('❌ Erro ao buscar reservas:', reservationsError);
      return;
    }

    console.log(`✅ Encontradas ${reservations.length} reservas`);
    reservations.forEach(reservation => {
      console.log(`   - ${reservation.title}: ${reservation.status}`);
      console.log(`     Quadra ID: ${reservation.court_id}`);
      if (reservation.event_id) {
        console.log(`     Evento ID: ${reservation.event_id}`);
      }
    });

    // 4. Estatísticas de integração
    console.log('\n📈 4. Estatísticas de integração...');
    
    const courtsWithEvents = events.filter(e => e.court_ids && e.court_ids.length > 0).length;
    const totalCourtAssociations = events.reduce((acc, e) => acc + (e.court_ids ? e.court_ids.length : 0), 0);
    
    console.log(`   - Eventos com quadras: ${courtsWithEvents}/${events.length}`);
    console.log(`   - Total de associações quadra-evento: ${totalCourtAssociations}`);
    console.log(`   - Reservas ativas: ${reservations.filter(r => r.status === 'CONFIRMED').length}`);

    // 5. Verificar tipos de quadras por modalidade
    console.log('\n🏆 5. Distribuição por modalidade...');
    const courtsByType = courts.reduce((acc, court) => {
      acc[court.type] = (acc[court.type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(courtsByType).forEach(([type, count]) => {
      const typeName = type === 'PADEL' ? 'Padel' : 
                      type === 'BEACH_TENNIS' ? 'Beach Tennis' :
                      type === 'TENNIS' ? 'Tênis' : 'Outro';
      console.log(`   - ${typeName}: ${count} quadras`);
    });

    console.log('\n✅ Teste de integração concluído com sucesso!');

  } catch (error) {
    console.log('❌ Erro durante o teste:', {
      message: error.message,
      details: error.stack,
      hint: error.hint || '',
      code: error.code || ''
    });
  }
}

testCourtsIntegration();
