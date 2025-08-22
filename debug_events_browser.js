// Script de diagnóstico detalhado para eventos
// Execute este no console do navegador quando estiver na aplicação

console.log('🔍 Iniciando diagnóstico detalhado de eventos...');

// Função para fazer query direta no Supabase
async function diagnoseEvents() {
    try {
        // Importar o supabase client
        const { supabase } = await import('./src/lib/supabase.js');
        
        console.log('✅ Supabase client carregado');
        
        // 1. Todos os eventos
        console.log('\n📋 === TODOS OS EVENTOS ===');
        const { data: allEvents, error: allError } = await supabase
            .from('events')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (allError) {
            console.error('❌ Erro ao buscar todos os eventos:', allError);
        } else {
            console.log(`📊 Total de eventos: ${allEvents.length}`);
            allEvents.forEach((event, index) => {
                const today = new Date().toISOString().split('T')[0];
                const isToday = event.date === today;
                const isFuture = event.date > today;
                const isPast = event.date < today;
                
                let timeStatus = '⏰ HOJE';
                if (isFuture) timeStatus = '🔮 FUTURO';
                if (isPast) timeStatus = '📅 PASSADO';
                
                console.log(`${index + 1}. ${event.title}`);
                console.log(`   📋 Status: ${event.status}`);
                console.log(`   📅 Data: ${event.date} ${timeStatus}`);
                console.log(`   💰 Taxa: R$ ${event.entry_fee || 0}`);
                console.log(`   🆔 ID: ${event.id}`);
                console.log('');
            });
        }
        
        // 2. Eventos elegíveis (OPEN/PUBLISHED + futuros)
        console.log('\n🎯 === EVENTOS ELEGÍVEIS (OPEN/PUBLISHED + FUTUROS) ===');
        const today = new Date().toISOString().split('T')[0];
        const { data: eligibleEvents, error: eligibleError } = await supabase
            .from('events')
            .select('*')
            .in('status', ['OPEN', 'PUBLISHED'])
            .gt('date', today)
            .order('date', { ascending: true });
        
        if (eligibleError) {
            console.error('❌ Erro ao buscar eventos elegíveis:', eligibleError);
        } else {
            console.log(`📊 Eventos elegíveis: ${eligibleEvents.length}`);
            eligibleEvents.forEach((event, index) => {
                console.log(`${index + 1}. ${event.title} (${event.status}) - ${event.date}`);
            });
        }
        
        // 3. Verificar torneios para eventos elegíveis
        if (eligibleEvents && eligibleEvents.length > 0) {
            console.log('\n🏆 === TORNEIOS DOS EVENTOS ELEGÍVEIS ===');
            const eventIds = eligibleEvents.map(e => e.id);
            
            const { data: tournaments, error: tourError } = await supabase
                .from('tournaments')
                .select('*')
                .in('event_id', eventIds);
            
            if (tourError) {
                console.error('❌ Erro ao buscar torneios:', tourError);
            } else {
                console.log(`📊 Torneios encontrados: ${tournaments.length}`);
                
                eligibleEvents.forEach((event) => {
                    const tournament = tournaments.find(t => t.event_id === event.id);
                    
                    if (!tournament) {
                        console.log(`✅ ${event.title}: SEM TORNEIO - DISPONÍVEL`);
                    } else {
                        const hasStandings = tournament.standings_data && 
                                           Object.keys(tournament.standings_data).length > 0;
                        
                        if (hasStandings) {
                            console.log(`❌ ${event.title}: TORNEIO INICIADO - NÃO DISPONÍVEL`);
                            console.log(`   🏆 Standings:`, tournament.standings_data);
                        } else {
                            console.log(`✅ ${event.title}: TORNEIO NÃO INICIADO - DISPONÍVEL`);
                        }
                    }
                });
            }
        }
        
        // 4. Aplicar lógica do ParticipanteService
        console.log('\n🔧 === APLICANDO LÓGICA DO PARTICIPANTE SERVICE ===');
        if (eligibleEvents && eligibleEvents.length > 0) {
            const eventIds = eligibleEvents.map(e => e.id);
            
            const { data: tournaments } = await supabase
                .from('tournaments')
                .select('event_id, standings_data')
                .in('event_id', eventIds);
            
            const availableEvents = eligibleEvents.filter(event => {
                const tournament = tournaments?.find(t => t.event_id === event.id);
                
                // Se não tem torneio, está disponível
                if (!tournament) return true;
                
                // Se tem torneio mas standings_data está vazio, está disponível
                if (!tournament.standings_data || 
                    Object.keys(tournament.standings_data).length === 0) {
                    return true;
                }
                
                // Se tem standings preenchido, não está disponível
                return false;
            });
            
            console.log(`📊 Eventos finais disponíveis: ${availableEvents.length}`);
            availableEvents.forEach((event, index) => {
                console.log(`${index + 1}. ✅ ${event.title} - ${event.date} - R$ ${event.entry_fee || 0}`);
            });
            
            if (availableEvents.length === 0) {
                console.log('⚠️ NENHUM EVENTO DISPONÍVEL ENCONTRADO!');
                console.log('📋 Possíveis causas:');
                console.log('   1. Todos os eventos são passados');
                console.log('   2. Todos os eventos têm status diferente de OPEN/PUBLISHED');
                console.log('   3. Todos os torneios já foram iniciados (standings preenchido)');
            }
        }
        
        // 5. Resumo final
        console.log('\n📊 === RESUMO FINAL ===');
        console.log(`📋 Total de eventos: ${allEvents?.length || 0}`);
        console.log(`🎯 Eventos elegíveis: ${eligibleEvents?.length || 0}`);
        console.log(`✅ Eventos disponíveis: ${eligibleEvents?.filter(event => {
            const tournaments = [];
            return !tournaments?.find(t => t.event_id === event.id && t.standings_data && Object.keys(t.standings_data).length > 0);
        }).length || 0}`);
        
    } catch (error) {
        console.error('❌ Erro durante diagnóstico:', error);
    }
}

// Executar diagnóstico
diagnoseEvents();
