const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (substitua pelas suas credenciais)
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testParticipantTournaments() {
  try {
    console.log('🔍 Verificando participações no banco...');
    
    // 1. Listar todos os participantes
    const { data: allParticipants, error: participantsError } = await supabase
      .from('participants')
      .select('*');
    
    console.log('📊 Total de participantes no banco:', allParticipants?.length || 0);
    if (participantsError) {
      console.error('❌ Erro ao buscar participantes:', participantsError);
      return;
    }
    
    if (allParticipants && allParticipants.length > 0) {
      console.log('📋 Primeiros 3 participantes:');
      allParticipants.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. User ID: ${p.user_id}, Event ID: ${p.event_id}, Partner: ${p.partner_name || 'N/A'}`);
      });
      
      // 2. Testar com um user_id específico
      const testUserId = allParticipants[0].user_id;
      console.log(`\n🔍 Testando com user_id: ${testUserId}`);
      
      const { data: userParticipations, error: userError } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          partner_name,
          final_position,
          events(id, title, date, location, status)
        `)
        .eq('user_id', testUserId);
      
      if (userError) {
        console.error('❌ Erro ao buscar participações do usuário:', userError);
        return;
      }
      
      console.log('📊 Participações encontradas para este usuário:', userParticipations?.length || 0);
      if (userParticipations && userParticipations.length > 0) {
        userParticipations.forEach((p, i) => {
          console.log(`  ${i + 1}. Event: ${p.events?.title || 'N/A'}, Date: ${p.events?.date || 'N/A'}`);
        });
      }
    }
    
    // 3. Verificar eventos disponíveis
    console.log('\n🔍 Verificando eventos no banco...');
    const { data: allEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, title, date, status');
    
    console.log('📊 Total de eventos no banco:', allEvents?.length || 0);
    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
      return;
    }
    
    if (allEvents && allEvents.length > 0) {
      console.log('📋 Primeiros 3 eventos:');
      allEvents.slice(0, 3).forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.title}, Date: ${e.date}, Status: ${e.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
testParticipantTournaments();
