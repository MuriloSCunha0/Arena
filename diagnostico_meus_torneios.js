// Script para diagnosticar dados de participantes e torneios
// Execute este script no console do navegador na aplicação

async function diagnosticarMeusTorneios() {
  try {
    console.log('🔍 === DIAGNÓSTICO: MEUS TORNEIOS ===');
    
    // Simular um user_id para teste (substitua por um real)
    const testUserId = 'test-user-id'; // ⚠️ SUBSTITUA por um user_id real do seu banco
    
    console.log(`\n🔍 Testando com user_id: ${testUserId}`);
    
    // 1. Verificar se há participações
    console.log('\n📊 1. Buscando participações do usuário...');
    const { data: participations, error: participationError } = await supabase
      .from('participants')
      .select(`
        id,
        event_id,
        partner_name,
        final_position,
        events(id, title, date, location, status)
      `)
      .eq('user_id', testUserId);
    
    if (participationError) {
      console.error('❌ Erro ao buscar participações:', participationError);
      return;
    }
    
    console.log('📋 Participações encontradas:', participations?.length || 0);
    
    if (participations && participations.length > 0) {
      console.log('\n📝 Detalhes das participações:');
      participations.forEach((p, i) => {
        console.log(`  ${i + 1}. Event ID: ${p.event_id}`);
        console.log(`     Partner: ${p.partner_name || 'Sem parceiro'}`);
        console.log(`     Position: ${p.final_position || 'N/A'}`);
        console.log(`     Event: ${p.events?.title || 'Evento não encontrado'}`);
        console.log(`     Date: ${p.events?.date || 'N/A'}`);
        console.log(`     Status: ${p.events?.status || 'N/A'}`);
        console.log('     ---');
      });
    } else {
      console.log('⚠️ Nenhuma participação encontrada para este usuário');
      
      // Sugerir verificar todos os participantes
      console.log('\n📊 2. Verificando todos os participantes no banco...');
      const { data: allParticipants, error: allError } = await supabase
        .from('participants')
        .select('user_id, event_id')
        .limit(5);
      
      if (allError) {
        console.error('❌ Erro ao buscar todos os participantes:', allError);
        return;
      }
      
      console.log('📋 Primeiros participantes no banco:');
      allParticipants?.forEach((p, i) => {
        console.log(`  ${i + 1}. User ID: ${p.user_id}, Event ID: ${p.event_id}`);
      });
      
      if (allParticipants && allParticipants.length > 0) {
        console.log(`\n💡 Tente usar um destes user_ids para teste: ${allParticipants[0].user_id}`);
      }
    }
    
    // 3. Verificar eventos disponíveis
    console.log('\n📊 3. Verificando eventos no banco...');
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, date, status')
      .limit(5);
    
    if (eventsError) {
      console.error('❌ Erro ao buscar eventos:', eventsError);
      return;
    }
    
    console.log('📋 Eventos encontrados:', events?.length || 0);
    events?.forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.title} (${e.date}) - Status: ${e.status}`);
    });
    
    console.log('\n✅ Diagnóstico concluído!');
    console.log('\n🔧 PRÓXIMOS PASSOS:');
    console.log('1. Se não há participações, crie algumas para teste');
    console.log('2. Substitua o testUserId por um real do seu banco');
    console.log('3. Verifique se o usuário logado tem participações');
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

// Para executar o diagnóstico, copie e cole no console:
// diagnosticarMeusTorneios();

console.log('🔧 Script carregado! Execute: diagnosticarMeusTorneios();');
