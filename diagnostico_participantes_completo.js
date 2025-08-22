/**
 * Script de Diagnóstico Completo - Participantes em Torneios
 * Execute no console do navegador para verificar a integridade dos dados
 */

console.log('🔍 === DIAGNÓSTICO COMPLETO: PARTICIPANTES EM TORNEIOS ===');

// Função principal de diagnóstico
async function diagnosticoCompleto() {
  try {
    console.log('\n📊 1. VERIFICANDO ESTRUTURA DE DADOS...');
    
    // 1. Verificar tabela participants
    const { data: participantsCount, error: partCountError } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true });
    
    console.log(`👥 Total de participantes no sistema: ${participantsCount || 0}`);
    
    // 2. Verificar tabela events
    const { data: eventsCount, error: eventsCountError } = await supabase
      .from('events')
      .select('id', { count: 'exact', head: true });
    
    console.log(`🏆 Total de eventos no sistema: ${eventsCount || 0}`);
    
    // 3. Verificar tabela users
    const { data: usersCount, error: usersCountError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    console.log(`👤 Total de usuários no sistema: ${usersCount || 0}`);

    console.log('\n📊 2. VERIFICANDO INTEGRIDADE DOS RELACIONAMENTOS...');
    
    // 4. Participantes órfãos (sem evento válido)
    const { data: orphanParticipants, error: orphanError } = await supabase
      .from('participants')
      .select(`
        id,
        user_id,
        event_id,
        name,
        registered_at
      `)
      .not('event_id', 'in', '(SELECT id FROM events)')
      .limit(5);
    
    console.log(`👻 Participantes órfãos (sem evento): ${orphanParticipants?.length || 0}`);
    if (orphanParticipants?.length) {
      console.log('   Detalhes:', orphanParticipants);
    }
    
    // 5. Participantes sem usuário válido
    const { data: noUserParticipants, error: noUserError } = await supabase
      .from('participants')
      .select(`
        id,
        user_id,
        event_id,
        name,
        registered_at
      `)
      .not('user_id', 'in', '(SELECT id FROM users)')
      .not('user_id', 'is', null)
      .limit(5);
    
    console.log(`🚫 Participantes com user_id inválido: ${noUserParticipants?.length || 0}`);
    if (noUserParticipants?.length) {
      console.log('   Detalhes:', noUserParticipants);
    }

    console.log('\n📊 3. VERIFICANDO DUPLICATAS...');
    
    // 6. Detectar duplicatas (mesmo user_id + event_id)
    const { data: allParticipants, error: dupError } = await supabase
      .from('participants')
      .select('id, user_id, event_id, name, registered_at')
      .not('user_id', 'is', null);

    const duplicates = [];
    const userEventPairs = new Map();
    
    allParticipants?.forEach(p => {
      const key = `${p.user_id}-${p.event_id}`;
      if (userEventPairs.has(key)) {
        duplicates.push({
          current: p,
          original: userEventPairs.get(key)
        });
      } else {
        userEventPairs.set(key, p);
      }
    });
    
    console.log(`👥 Participações duplicadas: ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('   Detalhes das duplicatas:', duplicates);
    }

    console.log('\n📊 4. VERIFICANDO CONTADORES DE EVENTOS...');
    
    // 7. Eventos com contadores incorretos
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        current_participants,
        max_participants,
        status
      `);

    const wrongCountEvents = [];
    
    for (const event of events || []) {
      const { count: actualCount } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id);
      
      if (actualCount !== event.current_participants) {
        wrongCountEvents.push({
          ...event,
          actualCount,
          registeredCount: event.current_participants,
          difference: actualCount - event.current_participants
        });
      }
    }
    
    console.log(`📊 Eventos com contadores incorretos: ${wrongCountEvents.length}`);
    if (wrongCountEvents.length > 0) {
      console.log('   Detalhes:', wrongCountEvents);
    }

    console.log('\n📊 5. VERIFICANDO DADOS DE EXEMPLO...');
    
    // 8. Mostrar alguns participantes para análise
    const { data: sampleParticipants, error: sampleError } = await supabase
      .from('participants')
      .select(`
        id,
        user_id,
        event_id,
        name,
        email,
        phone,
        payment_status,
        registered_at,
        events(title, date, status),
        users(full_name, email)
      `)
      .limit(3);
    
    console.log('📋 Amostra de participantes (3 primeiros):');
    sampleParticipants?.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name} (${p.email})`);
      console.log(`      User ID: ${p.user_id}`);
      console.log(`      Event: ${p.events?.title || 'N/A'} (${p.events?.date || 'N/A'})`);
      console.log(`      Status: ${p.payment_status}`);
      console.log(`      User Info: ${p.users?.full_name || 'N/A'} (${p.users?.email || 'N/A'})`);
      console.log('      ---');
    });

    console.log('\n📊 6. TESTANDO BUSCA DE TORNEIOS POR USUÁRIO...');
    
    // 9. Testar busca de torneios para um usuário específico
    if (sampleParticipants?.length > 0) {
      const testUserId = sampleParticipants[0].user_id;
      console.log(`🔍 Testando com user_id: ${testUserId}`);
      
      const { data: userTournaments, error: userTourError } = await supabase
        .from('participants')
        .select(`
          id,
          event_id,
          partner_name,
          final_position,
          registered_at,
          payment_status,
          events!inner(
            id,
            title,
            date,
            location,
            status,
            entry_fee
          )
        `)
        .eq('user_id', testUserId)
        .order('registered_at', { ascending: false });
      
      console.log(`   Torneios encontrados: ${userTournaments?.length || 0}`);
      userTournaments?.forEach((t, i) => {
        console.log(`   ${i + 1}. ${t.events?.title} (${t.events?.date})`);
      });
    }

    console.log('\n✅ DIAGNÓSTICO CONCLUÍDO!');
    return {
      totalParticipants: participantsCount,
      totalEvents: eventsCount,
      totalUsers: usersCount,
      orphanParticipants: orphanParticipants?.length || 0,
      noUserParticipants: noUserParticipants?.length || 0,
      duplicates: duplicates.length,
      wrongCountEvents: wrongCountEvents.length,
      sampleParticipants: sampleParticipants?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  }
}

// Função para corrigir contadores de eventos
async function corrigirContadores() {
  try {
    console.log('🔧 CORRIGINDO CONTADORES DE PARTICIPANTES...');
    
    const { data: events } = await supabase
      .from('events')
      .select('id, title, current_participants');

    let fixed = 0;
    const errors = [];

    for (const event of events || []) {
      try {
        const { count: actualCount } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id);

        if (actualCount !== event.current_participants) {
          const { error: updateError } = await supabase
            .from('events')
            .update({ current_participants: actualCount })
            .eq('id', event.id);

          if (updateError) {
            errors.push({ eventId: event.id, error: updateError });
          } else {
            console.log(`✅ ${event.title}: ${event.current_participants} → ${actualCount}`);
            fixed++;
          }
        }
      } catch (error) {
        errors.push({ eventId: event.id, error });
      }
    }

    console.log(`✅ Corrigidos ${fixed} eventos, ${errors.length} erros`);
    return { fixed, errors };
    
  } catch (error) {
    console.error('❌ Erro ao corrigir contadores:', error);
  }
}

// Função para verificar participações de um usuário específico
async function verificarUsuario(userId) {
  try {
    console.log(`🔍 VERIFICANDO PARTICIPAÇÕES DO USUÁRIO: ${userId}`);
    
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log(`👤 Usuário: ${user.full_name} (${user.email})`);

    const { data: participations } = await supabase
      .from('participants')
      .select(`
        id,
        event_id,
        name,
        partner_name,
        payment_status,
        final_position,
        registered_at,
        events(title, date, status, location)
      `)
      .eq('user_id', userId)
      .order('registered_at', { ascending: false });

    console.log(`🎯 Participações encontradas: ${participations?.length || 0}`);
    
    participations?.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.events?.title || 'Evento N/A'}`);
      console.log(`      Data: ${p.events?.date || 'N/A'}`);
      console.log(`      Status: ${p.payment_status}`);
      console.log(`      Parceiro: ${p.partner_name || 'N/A'}`);
      console.log(`      Posição: ${p.final_position || 'N/A'}`);
      console.log('      ---');
    });

    return participations;
    
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
  }
}

// Expor funções para uso no console
window.diagnosticoParticipantes = {
  completo: diagnosticoCompleto,
  corrigirContadores: corrigirContadores,
  verificarUsuario: verificarUsuario
};

console.log('✅ Diagnóstico carregado!');
console.log('📖 Comandos disponíveis:');
console.log('  diagnosticoParticipantes.completo() - Diagnóstico completo');
console.log('  diagnosticoParticipantes.corrigirContadores() - Corrigir contadores');
console.log('  diagnosticoParticipantes.verificarUsuario("user-id") - Verificar usuário específico');
console.log('\n🚀 Execute: diagnosticoParticipantes.completo()');
