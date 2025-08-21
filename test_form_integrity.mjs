// =====================================
// TESTE DE INTEGRIDADE: FORMULÁRIO vs BANCO
// =====================================

import { supabase } from './src/lib/supabase.js';

async function testFormIntegrity() {
  console.log('🔍 === TESTE DE INTEGRIDADE FORMULÁRIO vs BANCO ===\n');

  try {
    // 1. Testar estrutura da tabela
    console.log('📋 1. Verificando estrutura da tabela courts...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'courts')
      .order('ordinal_position');

    if (columnsError) {
      console.log('❌ Erro:', columnsError);
    } else {
      console.log('✅ Colunas encontradas:', columns?.length || 0);
      columns?.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '*obrigatório*' : ''}`);
      });
    }

    // 2. Testar criação de quadra com dados do formulário
    console.log('\n🏖️ 2. Testando criação com dados do formulário...');
    const testCourt = {
      name: 'Quadra Teste Beach Tennis',
      location: 'Arena Principal - Setor A',
      type: 'BEACH_TENNIS',
      status: 'AVAILABLE',
      surface: 'Areia',
      indoor: false,
      lighting: true,
      active: true,
      description: 'Quadra de teste para validação',
      width_meters: 8.0,
      length_meters: 16.0,
      hourly_rate: 120.00
    };

    const { data: created, error: createError } = await supabase
      .from('courts')
      .insert([testCourt])
      .select()
      .single();

    if (createError) {
      console.log('❌ Erro ao criar:', createError.message);
      
      // Verificar se é problema de enum
      if (createError.message.includes('invalid input value')) {
        console.log('\n🔍 Verificando ENUMs disponíveis...');
        
        // Verificar court_type
        const { data: courtTypes } = await supabase
          .rpc('get_enum_values', { enum_name: 'court_type' })
          .select();
        console.log('📝 Court Types:', courtTypes);
        
        // Verificar court_status  
        const { data: courtStatuses } = await supabase
          .rpc('get_enum_values', { enum_name: 'court_status' })
          .select();
        console.log('📝 Court Statuses:', courtStatuses);
      }
    } else {
      console.log('✅ Quadra criada com sucesso!');
      console.log('📄 Dados:', created);

      // 3. Testar busca e mapeamento
      console.log('\n🔄 3. Testando busca e mapeamento...');
      const { data: courts, error: fetchError } = await supabase
        .from('courts')
        .select('*')
        .eq('id', created.id)
        .single();

      if (fetchError) {
        console.log('❌ Erro ao buscar:', fetchError.message);
      } else {
        console.log('✅ Dados buscados com sucesso!');
        console.log('📋 Campos mapeados:');
        console.log(`   - ID: ${courts.id}`);
        console.log(`   - Nome: ${courts.name}`);
        console.log(`   - Tipo: ${courts.type}`);
        console.log(`   - Status: ${courts.status}`);
        console.log(`   - Largura: ${courts.width_meters}m`);
        console.log(`   - Comprimento: ${courts.length_meters}m`);
        console.log(`   - Taxa/hora: R$ ${courts.hourly_rate}`);
        console.log(`   - Iluminação: ${courts.lighting ? 'Sim' : 'Não'}`);
        console.log(`   - Indoor: ${courts.indoor ? 'Sim' : 'Não'}`);
        console.log(`   - Ativa: ${courts.active ? 'Sim' : 'Não'}`);
      }

      // 4. Limpar dados de teste
      console.log('\n🧹 4. Limpando dados de teste...');
      const { error: deleteError } = await supabase
        .from('courts')
        .delete()
        .eq('id', created.id);

      if (deleteError) {
        console.log('❌ Erro ao deletar:', deleteError.message);
      } else {
        console.log('✅ Dados de teste removidos!');
      }
    }

    // 5. Verificar quadras existentes
    console.log('\n📊 5. Verificando quadras existentes...');
    const { data: existing, error: existingError } = await supabase
      .from('courts')
      .select('id, name, type, status, active')
      .limit(5);

    if (existingError) {
      console.log('❌ Erro:', existingError.message);
    } else {
      console.log(`✅ ${existing?.length || 0} quadras encontradas:`);
      existing?.forEach(court => {
        console.log(`   - ${court.name} (${court.type}) - ${court.status}`);
      });
    }

  } catch (error) {
    console.log('❌ Erro geral:', error);
  }

  console.log('\n🏁 === TESTE CONCLUÍDO ===');
}

// Executar teste
testFormIntegrity().catch(console.error);
