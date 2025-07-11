/**
 * Teste específico para investigar o fluxo de reinicialização e geração de torneio
 * 
 * Este script vai simular o fluxo completo:
 * 1. Buscar um evento existente com participantes
 * 2. Reinicializar o torneio
 * 3. Verificar se os participantes ainda estão disponíveis
 * 4. Tentar gerar a estrutura
 * 5. Verificar se as partidas são criadas
 */

import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (usando variáveis de ambiente se disponíveis)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pfrjdyqxsjgqihwfrmdy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcmpkeXF4c2pncWlod2ZybWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzMjQ4NDIsImV4cCI6MjA1MDkwMDg0Mn0.BYGd1k_KpWOgd5PZ1SkeSzS_D3oVGDLJZhLx-4bU1f8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTournamentFlow() {
    console.log('🚀 Iniciando teste do fluxo de torneio...\n');
    
    try {
        // 1. Buscar eventos existentes
        console.log('1️⃣ Buscando eventos...');
        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('*')
            .eq('status', 'OPEN')
            .limit(5);
        
        if (eventsError) {
            console.error('❌ Erro ao buscar eventos:', eventsError);
            return;
        }
        
        if (!events || events.length === 0) {
            console.log('❌ Nenhum evento OPEN encontrado');
            return;
        }
        
        console.log(`✅ Encontrados ${events.length} eventos`);
        events.forEach((event, index) => {
            console.log(`   ${index + 1}. ${event.title || event.name} (${event.id})`);
        });
        
        // Usar o primeiro evento
        const eventId = events[0].id;
        console.log(`\n📋 Usando evento: ${events[0].title || events[0].name} (${eventId})\n`);
        
        // 2. Buscar participantes do evento
        console.log('2️⃣ Buscando participantes...');
        const { data: participants, error: participantsError } = await supabase
            .from('event_participants')
            .select(`
                id,
                event_id,
                participant_id,
                payment_status,
                participants:participant_id (
                    id,
                    name,
                    email
                )
            `)
            .eq('event_id', eventId);
        
        if (participantsError) {
            console.error('❌ Erro ao buscar participantes:', participantsError);
            return;
        }
        
        console.log(`✅ Encontrados ${participants?.length || 0} participantes`);
        if (participants && participants.length > 0) {
            participants.forEach((ep, index) => {
                const participant = ep.participants;
                console.log(`   ${index + 1}. ${participant?.name || 'Nome não disponível'} (${ep.payment_status})`);
            });
        }
        
        if (!participants || participants.length < 2) {
            console.log('❌ Precisa de pelo menos 2 participantes para continuar');
            return;
        }
        
        // 3. Verificar se já existe torneio
        console.log('\n3️⃣ Verificando torneio existente...');
        const { data: existingTournament, error: tournamentError } = await supabase
            .from('tournaments')
            .select('*')
            .eq('event_id', eventId)
            .single();
        
        if (tournamentError && tournamentError.code !== 'PGRST116') {
            console.error('❌ Erro ao buscar torneio:', tournamentError);
            return;
        }
        
        if (existingTournament) {
            console.log(`✅ Torneio existente encontrado: ${existingTournament.id}`);
            console.log(`   Status: ${existingTournament.status}`);
            console.log(`   Teams: ${existingTournament.teams_data?.length || 0}`);
            console.log(`   Matches: ${existingTournament.matches_data?.length || 0}`);
            
            // 4. Reinicializar torneio
            console.log('\n4️⃣ Reinicializando torneio...');
            const resetData = {
                status: 'CREATED',
                format: 'GROUP_STAGE_ELIMINATION',
                settings: { 
                    groupSize: 4,
                    qualifiersPerGroup: 2
                },
                current_round: 0,
                groups_count: 0,
                stage: 'GROUP',
                teams_data: [],
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
                .eq('id', existingTournament.id)
                .select()
                .single();
            
            if (resetError) {
                console.error('❌ Erro ao reinicializar torneio:', resetError);
                return;
            }
            
            console.log(`✅ Torneio reinicializado com sucesso`);
            console.log(`   Teams após reset: ${resetTournament.teams_data?.length || 0}`);
            console.log(`   Matches após reset: ${resetTournament.matches_data?.length || 0}`);
            
        } else {
            console.log('ℹ️ Nenhum torneio existente, será criado um novo');
        }
        
        // 5. Simular formação de duplas
        console.log('\n5️⃣ Formando duplas aleatórias...');
        
        // Mapear participantes para o formato esperado
        const participantIds = participants
            .filter(ep => ep.participants) // Garantir que participant existe
            .map(ep => ep.participants.id);
        
        console.log(`   Participantes disponíveis: ${participantIds.length}`);
        
        if (participantIds.length % 2 !== 0) {
            console.log('⚠️ Número ímpar de participantes, removendo o último para formar duplas');
            participantIds.pop();
        }
        
        // Embaralhar e formar duplas
        const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
        const teams = [];
        for (let i = 0; i < shuffled.length; i += 2) {
            teams.push({
                id: `team_${Math.floor(i / 2) + 1}`,
                participants: [shuffled[i], shuffled[i + 1]],
                seed: Math.floor(i / 2) + 1,
            });
        }
        
        console.log(`✅ ${teams.length} duplas formadas:`);
        teams.forEach((team, index) => {
            const name1 = participants.find(p => p.participants?.id === team.participants[0])?.participants?.name || 'Desconhecido';
            const name2 = participants.find(p => p.participants?.id === team.participants[1])?.participants?.name || 'Desconhecido';
            console.log(`   ${index + 1}. ${name1} & ${name2}`);
        });
        
        // 6. Gerar estrutura de torneio
        console.log('\n6️⃣ Gerando estrutura de torneio...');
        
        const tournamentId = existingTournament?.id;
        if (!tournamentId) {
            console.error('❌ ID do torneio não disponível');
            return;
        }
        
        // Calcular grupos e partidas
        const groupSize = 3;
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
        const groups = [];
        
        for (let i = 0; i < shuffledTeams.length; i += groupSize) {
            groups.push(shuffledTeams.slice(i, i + groupSize));
        }
        
        console.log(`   Grupos formados: ${groups.length}`);
        groups.forEach((group, index) => {
            console.log(`   Grupo ${index + 1}: ${group.length} duplas`);
        });
        
        // Gerar partidas
        const matches = [];
        let matchId = 1;
        
        groups.forEach((group, groupIndex) => {
            const groupNumber = groupIndex + 1;
            
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    matches.push({
                        id: `match_${matchId++}`,
                        tournamentId: tournamentId,
                        eventId: eventId,
                        round: 0,
                        position: matches.length,
                        team1: group[i].participants,
                        team2: group[j].participants,
                        score1: null,
                        score2: null,
                        winnerId: null,
                        completed: false,
                        courtId: null,
                        scheduledTime: null,
                        stage: 'GROUP',
                        groupNumber: groupNumber,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    });
                }
            }
        });
        
        console.log(`✅ ${matches.length} partidas geradas`);
        
        // 7. Salvar dados no banco
        console.log('\n7️⃣ Salvando estrutura no banco...');
        
        const { data: finalTournament, error: updateError } = await supabase
            .from('tournaments')
            .update({
                groups_count: groups.length,
                matches_data: matches,
                teams_data: teams,
                standings_data: matches, // Salvar partidas de grupos em standings_data
                stage: 'GROUP',
                updated_at: new Date().toISOString()
            })
            .eq('id', tournamentId)
            .select()
            .single();
        
        if (updateError) {
            console.error('❌ Erro ao salvar estrutura:', updateError);
            return;
        }
        
        console.log(`✅ Estrutura salva com sucesso!`);
        console.log(`   Grupos: ${finalTournament.groups_count}`);
        console.log(`   Teams: ${finalTournament.teams_data?.length || 0}`);
        console.log(`   Matches: ${finalTournament.matches_data?.length || 0}`);
        console.log(`   Standings: ${finalTournament.standings_data?.length || 0}`);
        
        // 8. Verificação final
        console.log('\n8️⃣ Verificação final...');
        
        const { data: verifyTournament, error: verifyError } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();
        
        if (verifyError) {
            console.error('❌ Erro na verificação final:', verifyError);
            return;
        }
        
        console.log(`✅ Verificação completa:`);
        console.log(`   Status: ${verifyTournament.status}`);
        console.log(`   Stage: ${verifyTournament.stage}`);
        console.log(`   Groups: ${verifyTournament.groups_count}`);
        console.log(`   Teams em teams_data: ${verifyTournament.teams_data?.length || 0}`);
        console.log(`   Matches em matches_data: ${verifyTournament.matches_data?.length || 0}`);
        console.log(`   Matches em standings_data: ${verifyTournament.standings_data?.length || 0}`);
        
        console.log('\n🎉 Teste concluído com sucesso!');
        console.log(`\n🔗 Você pode acessar o torneio em: http://localhost:5173/events/${eventId}/tournament`);
        
    } catch (error) {
        console.error('💥 Erro geral:', error);
    }
}

// Executar o teste
testTournamentFlow().catch(console.error);
