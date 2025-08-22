/**
 * 🚨 MONITOR DE INSCRIÇÕES EM TEMPO REAL
 * Execute este script para monitorar se os participantes estão sendo salvos
 */

console.log('🚨 === MONITOR DE INSCRIÇÕES ATIVO ===');

// Função para monitorar inscrições em tempo real
async function monitorarInscricoes() {
  try {
    console.log('🔍 Iniciando monitoramento de inscrições...');
    
    // 1. Estado atual dos participantes
    const { count: totalParticipants } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true });
    
    console.log(`📊 Total atual de participantes: ${totalParticipants}`);
    
    // 2. Últimas inscrições (últimos 10 registros)
    const { data: recentParticipants } = await supabase
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
        events(title, date)
      `)
      .order('registered_at', { ascending: false })
      .limit(10);
    
    console.log('📋 Últimas 10 inscrições:');
    recentParticipants?.forEach((p, i) => {
      const timeAgo = new Date(Date.now() - new Date(p.registered_at).getTime()).getMinutes();
      console.log(`  ${i + 1}. ${p.name} → ${p.events?.title}`);
      console.log(`     Registrado há ${timeAgo} minutos`);
      console.log(`     Status: ${p.payment_status}`);
      console.log('     ---');
    });
    
    return {
      totalParticipants,
      recentCount: recentParticipants?.length || 0
    };
    
  } catch (error) {
    console.error('❌ Erro no monitoramento:', error);
  }
}

// Função para verificar uma inscrição específica
async function verificarInscricao(userId, eventId) {
  try {
    console.log(`🔍 Verificando inscrição: User ${userId} → Event ${eventId}`);
    
    const { data: participant, error } = await supabase
      .from('participants')
      .select(`
        *,
        events(title, date, status),
        users(full_name, email)
      `)
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();
    
    if (error || !participant) {
      console.log('❌ Inscrição NÃO ENCONTRADA');
      return false;
    }
    
    console.log('✅ Inscrição CONFIRMADA:');
    console.log(`   Participante: ${participant.name} (${participant.users?.full_name})`);
    console.log(`   Evento: ${participant.events?.title}`);
    console.log(`   Data registro: ${new Date(participant.registered_at).toLocaleString()}`);
    console.log(`   Status pagamento: ${participant.payment_status}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return false;
  }
}

// Função para monitorar em tempo real (atualização automática)
let monitoringInterval = null;

function iniciarMonitoramentoAutomatico(intervalSeconds = 30) {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  console.log(`🔄 Iniciando monitoramento automático (${intervalSeconds}s)`);
  
  let lastCount = 0;
  
  monitoringInterval = setInterval(async () => {
    try {
      const { count: currentCount } = await supabase
        .from('participants')
        .select('id', { count: 'exact', head: true });
      
      if (currentCount !== lastCount) {
        const newRegistrations = currentCount - lastCount;
        console.log(`🚨 NOVA(S) INSCRIÇÃO(ÕES) DETECTADA(S): +${newRegistrations}`);
        console.log(`📊 Total agora: ${currentCount} participantes`);
        
        // Buscar a(s) nova(s) inscrição(ões)
        const { data: newParticipants } = await supabase
          .from('participants')
          .select(`
            name,
            events(title),
            registered_at
          `)
          .order('registered_at', { ascending: false })
          .limit(newRegistrations);
        
        newParticipants?.forEach((p, i) => {
          console.log(`  ✅ ${p.name} → ${p.events?.title}`);
        });
        
        lastCount = currentCount;
      }
      
    } catch (error) {
      console.error('❌ Erro no monitoramento automático:', error);
    }
  }, intervalSeconds * 1000);
}

function pararMonitoramentoAutomatico() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('⏹️ Monitoramento automático parado');
  }
}

// Função para testar uma inscrição simulada
async function testarInscricaoSimulada(eventId) {
  try {
    console.log('🧪 TESTE DE INSCRIÇÃO SIMULADA');
    
    // Dados de teste
    const testData = {
      name: `Teste ${Date.now()}`,
      email: `teste${Date.now()}@email.com`,
      phone: '(11) 99999-9999',
      cpf: '123.456.789-00',
      category: 'open',
      paymentMethod: 'pix'
    };
    
    console.log('📝 Dados de teste:', testData);
    
    // Tentar inscrição usando o serviço garantido
    const result = await GuaranteedRegistrationService.guaranteeParticipantSaved(
      'test-user-id',
      eventId,
      testData
    );
    
    if (result.success) {
      console.log('✅ TESTE PASSOU - Participante salvo:', result.participant.id);
      
      // Limpar teste
      const { error: deleteError } = await supabase
        .from('participants')
        .delete()
        .eq('id', result.participant.id);
      
      if (!deleteError) {
        console.log('🧹 Dados de teste removidos');
      }
      
      return true;
    } else {
      console.log('❌ TESTE FALHOU');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
}

// Expor funções para uso no console
window.monitorInscricoes = {
  verificarEstado: monitorarInscricoes,
  verificarInscricao: verificarInscricao,
  iniciarMonitoramento: iniciarMonitoramentoAutomatico,
  pararMonitoramento: pararMonitoramentoAutomatico,
  testarInscricao: testarInscricaoSimulada
};

console.log('✅ Monitor carregado!');
console.log('📖 Comandos disponíveis:');
console.log('  monitorInscricoes.verificarEstado() - Ver estado atual');
console.log('  monitorInscricoes.verificarInscricao(userId, eventId) - Verificar inscrição específica');
console.log('  monitorInscricoes.iniciarMonitoramento(30) - Monitorar automaticamente');
console.log('  monitorInscricoes.pararMonitoramento() - Parar monitoramento');
console.log('  monitorInscricoes.testarInscricao(eventId) - Teste simulado');
console.log('\n🚀 Execute: monitorInscricoes.verificarEstado()');

// Executar verificação inicial
monitorarInscricoes();
