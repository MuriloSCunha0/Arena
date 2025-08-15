import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase (ajuste as credenciais conforme necessário)
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Script de Diagnóstico Completo do Sistema de Torneios
 * 
 * Este script analisa o banco de dados para identificar inconsistências
 * que possam estar impedindo o funcionamento correto dos torneios
 */

class TournamentDiagnostic {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.stats = {};
    }

    async run() {
        console.log('🔍 Iniciando diagnóstico completo do sistema de torneios...\n');
        
        await this.checkDatabaseConnection();
        await this.gatherBasicStats();
        await this.checkEventConsistency();
        await this.checkTournamentConsistency();
        await this.checkParticipantConsistency();
        await this.checkMatchConsistency();
        await this.checkUUIDs();
        await this.checkBracketLogic();
        await this.checkAdvancementLogic();
        await this.checkDataIntegrity();
        await this.checkPaymentConsistency();
        await this.runBuiltInValidation();
        
        this.generateReport();
    }

    async checkDatabaseConnection() {
        try {
            const { data, error } = await supabase.from('events').select('count', { count: 'exact', head: true });
            if (error) throw error;
            console.log('✅ Conexão com banco de dados estabelecida');
        } catch (error) {
            console.error('❌ Erro de conexão com banco:', error.message);
            process.exit(1);
        }
    }

    async gatherBasicStats() {
        console.log('\n📊 Coletando estatísticas básicas...');
        
        try {
            // Contar registros em cada tabela principal
            const tables = ['events', 'tournaments', 'participants', 'matches'];
            
            for (const table of tables) {
                const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
                this.stats[table] = count || 0;
                console.log(`   ${table}: ${count || 0} registros`);
            }
            
            // Estatísticas por status
            const { data: eventsByStatus } = await supabase
                .from('events')
                .select('status')
                .then(result => ({
                    data: result.data?.reduce((acc, curr) => {
                        acc[curr.status] = (acc[curr.status] || 0) + 1;
                        return acc;
                    }, {})
                }));
            
            console.log('   Eventos por status:', eventsByStatus);
            this.stats.eventsByStatus = eventsByStatus;
            
        } catch (error) {
            this.issues.push({
                category: 'Database Access',
                severity: 'Critical',
                message: `Erro ao coletar estatísticas: ${error.message}`
            });
        }
    }

    async checkEventConsistency() {
        console.log('\n🎯 Verificando consistência dos eventos...');
        
        try {
            // Eventos com participantes além do limite
            const { data: overflowEvents } = await supabase
                .from('events')
                .select('id, title, max_participants, current_participants')
                .gt('current_participants', 'max_participants');
            
            if (overflowEvents?.length > 0) {
                this.issues.push({
                    category: 'Event Consistency',
                    severity: 'High',
                    message: `${overflowEvents.length} eventos com participantes além do limite`,
                    data: overflowEvents
                });
            }
            
            // Eventos com datas inválidas
            const { data: invalidDateEvents } = await supabase
                .from('events')
                .select('id, title, date, end_date')
                .lt('end_date', 'date');
            
            if (invalidDateEvents?.length > 0) {
                this.issues.push({
                    category: 'Event Consistency',
                    severity: 'Medium',
                    message: `${invalidDateEvents.length} eventos com data final anterior à data inicial`,
                    data: invalidDateEvents
                });
            }
            
            // Eventos sem organizador
            const { data: noOrganizerEvents } = await supabase
                .from('events')
                .select('id, title')
                .is('organizer_id', null);
            
            if (noOrganizerEvents?.length > 0) {
                this.warnings.push({
                    category: 'Event Consistency',
                    message: `${noOrganizerEvents.length} eventos sem organizador definido`,
                    data: noOrganizerEvents
                });
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Event Consistency',
                severity: 'Critical',
                message: `Erro ao verificar eventos: ${error.message}`
            });
        }
    }

    async checkTournamentConsistency() {
        console.log('\n🏆 Verificando consistência dos torneios...');
        
        try {
            // Torneios órfãos (sem evento)
            const { data: orphanedTournaments } = await supabase
                .from('tournaments')
                .select(`
                    id,
                    event_id,
                    status,
                    events!left(id)
                `)
                .is('events.id', null);
            
            if (orphanedTournaments?.length > 0) {
                this.issues.push({
                    category: 'Tournament Consistency',
                    severity: 'High',
                    message: `${orphanedTournaments.length} torneios órfãos (sem evento associado)`,
                    data: orphanedTournaments
                });
            }
            
            // Torneios com rounds inválidos
            const { data: invalidRoundTournaments } = await supabase
                .from('tournaments')
                .select('id, event_id, current_round, total_rounds')
                .or('current_round.lt.0,current_round.gt.total_rounds');
            
            if (invalidRoundTournaments?.length > 0) {
                this.issues.push({
                    category: 'Tournament Consistency',
                    severity: 'Medium',
                    message: `${invalidRoundTournaments.length} torneios com rounds inválidos`,
                    data: invalidRoundTournaments
                });
            }
            
            // Torneios com dados JSONB inválidos ou vazios
            const { data: tournaments } = await supabase
                .from('tournaments')
                .select('id, event_id, matches_data, teams_data, elimination_bracket');
            
            let invalidDataCount = 0;
            const invalidDataTournaments = [];
            
            tournaments?.forEach(tournament => {
                const issues = [];
                
                // Verificar matches_data
                if (!tournament.matches_data || !Array.isArray(tournament.matches_data)) {
                    issues.push('matches_data inválido');
                }
                
                // Verificar teams_data
                if (!tournament.teams_data || !Array.isArray(tournament.teams_data)) {
                    issues.push('teams_data inválido');
                }
                
                // Verificar elimination_bracket
                if (!tournament.elimination_bracket || typeof tournament.elimination_bracket !== 'object') {
                    issues.push('elimination_bracket inválido');
                }
                
                if (issues.length > 0) {
                    invalidDataCount++;
                    invalidDataTournaments.push({
                        id: tournament.id,
                        event_id: tournament.event_id,
                        issues: issues
                    });
                }
            });
            
            if (invalidDataCount > 0) {
                this.issues.push({
                    category: 'Tournament Data',
                    severity: 'High',
                    message: `${invalidDataCount} torneios com dados JSONB inválidos`,
                    data: invalidDataTournaments
                });
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Tournament Consistency',
                severity: 'Critical',
                message: `Erro ao verificar torneios: ${error.message}`
            });
        }
    }

    async checkParticipantConsistency() {
        console.log('\n👥 Verificando consistência dos participantes...');
        
        try {
            // Participantes órfãos (sem evento)
            const { data: orphanedParticipants } = await supabase
                .from('participants')
                .select(`
                    id,
                    name,
                    event_id,
                    events!left(id)
                `)
                .is('events.id', null);
            
            if (orphanedParticipants?.length > 0) {
                this.issues.push({
                    category: 'Participant Consistency',
                    severity: 'High',
                    message: `${orphanedParticipants.length} participantes órfãos (sem evento)`,
                    data: orphanedParticipants
                });
            }
            
            // Participantes com parceiros inválidos
            const { data: invalidPartnerParticipants } = await supabase
                .from('participants p1')
                .select(`
                    id,
                    name,
                    partner_id,
                    event_id
                `)
                .not('partner_id', 'is', null)
                .not('partner_id', 'in', 
                    `(${await supabase.from('participants').select('id').then(r => r.data?.map(p => `'${p.id}'`).join(',') || "''")})`
                );
            
            if (invalidPartnerParticipants?.length > 0) {
                this.issues.push({
                    category: 'Participant Consistency',
                    severity: 'Medium',
                    message: `${invalidPartnerParticipants.length} participantes com partner_id inválido`,
                    data: invalidPartnerParticipants
                });
            }
            
            // Verificar participantes com dados de pagamento inconsistentes
            const { data: paymentInconsistencies } = await supabase
                .from('participants')
                .select('id, name, payment_status, payment_date, payment_amount')
                .eq('payment_status', 'PAID')
                .or('payment_date.is.null,payment_amount.is.null');
            
            if (paymentInconsistencies?.length > 0) {
                this.warnings.push({
                    category: 'Payment Consistency',
                    message: `${paymentInconsistencies.length} participantes marcados como pagos mas sem dados de pagamento`,
                    data: paymentInconsistencies
                });
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Participant Consistency',
                severity: 'Critical',
                message: `Erro ao verificar participantes: ${error.message}`
            });
        }
    }

    async checkMatchConsistency() {
        console.log('\n⚽ Verificando consistência das partidas...');
        
        try {
            // Partidas órfãs (sem evento ou torneio)
            const { data: orphanedMatches } = await supabase
                .from('matches')
                .select(`
                    id,
                    event_id,
                    tournament_id,
                    events!left(id),
                    tournaments!left(id)
                `)
                .or('events.id.is.null,tournaments.id.is.null');
            
            if (orphanedMatches?.length > 0) {
                this.issues.push({
                    category: 'Match Consistency',
                    severity: 'High',
                    message: `${orphanedMatches.length} partidas órfãs (sem evento ou torneio)`,
                    data: orphanedMatches
                });
            }
            
            // Partidas com teams iguais
            const { data: sameTeamMatches } = await supabase
                .from('matches')
                .select('id, team1_ids, team2_ids')
                .eq('team1_ids', 'team2_ids');
            
            if (sameTeamMatches?.length > 0) {
                this.issues.push({
                    category: 'Match Logic',
                    severity: 'High',
                    message: `${sameTeamMatches.length} partidas com o mesmo time nos dois lados`,
                    data: sameTeamMatches
                });
            }
            
            // Partidas completadas sem vencedor definido
            const { data: completedNoWinner } = await supabase
                .from('matches')
                .select('id, status, winner_team, team1_score, team2_score')
                .eq('status', 'COMPLETED')
                .is('winner_team', null);
            
            if (completedNoWinner?.length > 0) {
                this.warnings.push({
                    category: 'Match Logic',
                    message: `${completedNoWinner.length} partidas completadas sem vencedor definido`,
                    data: completedNoWinner
                });
            }
            
            // Partidas com vencedor mas não completadas
            const { data: winnerNotCompleted } = await supabase
                .from('matches')
                .select('id, status, winner_team')
                .neq('status', 'COMPLETED')
                .not('winner_team', 'is', null);
            
            if (winnerNotCompleted?.length > 0) {
                this.issues.push({
                    category: 'Match Logic',
                    severity: 'Medium',
                    message: `${winnerNotCompleted.length} partidas com vencedor mas não marcadas como completadas`,
                    data: winnerNotCompleted
                });
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Match Consistency',
                severity: 'Critical',
                message: `Erro ao verificar partidas: ${error.message}`
            });
        }
    }

    async checkUUIDs() {
        console.log('\n🔑 Verificando integridade dos UUIDs...');
        
        try {
            // Verificar UUIDs inválidos nas tabelas principais
            const tables = [
                { name: 'events', idColumn: 'id' },
                { name: 'tournaments', idColumn: 'id' },
                { name: 'participants', idColumn: 'id' },
                { name: 'matches', idColumn: 'id' }
            ];
            
            for (const table of tables) {
                const { data: invalidUUIDs } = await supabase
                    .from(table.name)
                    .select(table.idColumn)
                    .not(table.idColumn, 'like', '__%__-%___%___%___%___');
                
                if (invalidUUIDs?.length > 0) {
                    this.issues.push({
                        category: 'UUID Integrity',
                        severity: 'Critical',
                        message: `${invalidUUIDs.length} registros com UUID inválido na tabela ${table.name}`,
                        data: invalidUUIDs
                    });
                }
            }
            
            // Verificar se existem referências quebradas
            const { data: brokenEventRefs } = await supabase
                .from('tournaments')
                .select('id, event_id')
                .not('event_id', 'in', 
                    `(${await supabase.from('events').select('id').then(r => r.data?.map(e => `'${e.id}'`).join(',') || "''")})`
                );
            
            if (brokenEventRefs?.length > 0) {
                this.issues.push({
                    category: 'Reference Integrity',
                    severity: 'High',
                    message: `${brokenEventRefs.length} torneios com referência quebrada para eventos`,
                    data: brokenEventRefs
                });
            }
            
        } catch (error) {
            this.issues.push({
                category: 'UUID Integrity',
                severity: 'Critical',
                message: `Erro ao verificar UUIDs: ${error.message}`
            });
        }
    }

    async checkBracketLogic() {
        console.log('\n🌳 Verificando lógica dos brackets de eliminação...');
        
        try {
            const { data: tournaments } = await supabase
                .from('tournaments')
                .select('id, event_id, format, elimination_bracket, matches_data')
                .in('format', ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'GROUP_STAGE_ELIMINATION']);
            
            for (const tournament of tournaments || []) {
                const issues = [];
                
                // Verificar se elimination_bracket tem estrutura válida
                if (!tournament.elimination_bracket || typeof tournament.elimination_bracket !== 'object') {
                    issues.push('elimination_bracket ausente ou inválido');
                } else {
                    const bracket = tournament.elimination_bracket;
                    
                    // Verificar se todas as chaves de eliminação têm IDs válidos (UUIDs)
                    const stages = ['quarterFinals', 'semiFinals', 'final', 'thirdPlace'];
                    for (const stage of stages) {
                        if (bracket[stage]) {
                            for (const match of bracket[stage]) {
                                if (match.id && typeof match.id === 'string' && !match.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                                    issues.push(`${stage}: partida ${match.id} não é um UUID válido`);
                                }
                            }
                        }
                    }
                }
                
                // Verificar se matches_data contém partidas de eliminação com UUIDs válidos
                if (tournament.matches_data && Array.isArray(tournament.matches_data)) {
                    const eliminationMatches = tournament.matches_data.filter(match => 
                        match.stage && ['QUARTER_FINALS', 'SEMI_FINALS', 'FINALS'].includes(match.stage)
                    );
                    
                    for (const match of eliminationMatches) {
                        if (!match.id || !match.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                            issues.push(`Partida de eliminação sem UUID válido: ${match.id || 'ID ausente'}`);
                        }
                    }
                }
                
                if (issues.length > 0) {
                    this.issues.push({
                        category: 'Bracket Logic',
                        severity: 'High',
                        message: `Problemas no bracket do torneio ${tournament.id}`,
                        data: { tournament_id: tournament.id, issues: issues }
                    });
                }
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Bracket Logic',
                severity: 'Critical',
                message: `Erro ao verificar lógica dos brackets: ${error.message}`
            });
        }
    }

    async checkAdvancementLogic() {
        console.log('\n⬆️ Verificando lógica de avanço entre partidas...');
        
        try {
            const { data: tournaments } = await supabase
                .from('tournaments')
                .select('id, matches_data, elimination_bracket')
                .not('matches_data', 'is', null);
            
            for (const tournament of tournaments || []) {
                if (!tournament.matches_data || !Array.isArray(tournament.matches_data)) continue;
                
                const matches = tournament.matches_data;
                const issues = [];
                
                // Verificar se partidas de QF têm nextMatch válido
                const quarterFinals = matches.filter(m => m.stage === 'QUARTER_FINALS');
                const semiFinals = matches.filter(m => m.stage === 'SEMI_FINALS');
                const finals = matches.filter(m => m.stage === 'FINALS');
                
                for (const qf of quarterFinals) {
                    if (qf.nextMatch) {
                        const nextMatchExists = semiFinals.some(sf => sf.id === qf.nextMatch);
                        if (!nextMatchExists) {
                            issues.push(`QF ${qf.id} aponta para SF inexistente: ${qf.nextMatch}`);
                        }
                    } else {
                        issues.push(`QF ${qf.id} não tem nextMatch definido`);
                    }
                }
                
                for (const sf of semiFinals) {
                    if (sf.nextMatch) {
                        const nextMatchExists = finals.some(f => f.id === sf.nextMatch);
                        if (!nextMatchExists) {
                            issues.push(`SF ${sf.id} aponta para Final inexistente: ${sf.nextMatch}`);
                        }
                    } else {
                        issues.push(`SF ${sf.id} não tem nextMatch definido`);
                    }
                }
                
                if (issues.length > 0) {
                    this.issues.push({
                        category: 'Advancement Logic',
                        severity: 'High',
                        message: `Problemas na lógica de avanço do torneio ${tournament.id}`,
                        data: { tournament_id: tournament.id, issues: issues }
                    });
                }
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Advancement Logic',
                severity: 'Critical',
                message: `Erro ao verificar lógica de avanço: ${error.message}`
            });
        }
    }

    async checkDataIntegrity() {
        console.log('\n🔍 Verificando integridade geral dos dados...');
        
        try {
            // Verificar duplicatas de participantes no mesmo evento
            const { data: duplicateParticipants } = await supabase
                .rpc('find_duplicate_participants');
            
            if (duplicateParticipants?.length > 0) {
                this.issues.push({
                    category: 'Data Integrity',
                    severity: 'Medium',
                    message: `${duplicateParticipants.length} possíveis participantes duplicados encontrados`,
                    data: duplicateParticipants
                });
            }
            
            // Verificar inconsistências de timestamp
            const { data: timestampIssues } = await supabase
                .from('matches')
                .select('id, scheduled_at, started_at, completed_at')
                .or('started_at.lt.scheduled_at,completed_at.lt.started_at');
            
            if (timestampIssues?.length > 0) {
                this.issues.push({
                    category: 'Data Integrity',
                    severity: 'Medium',
                    message: `${timestampIssues.length} partidas com timestamps inconsistentes`,
                    data: timestampIssues
                });
            }
            
        } catch (error) {
            // Se a função RPC não existir, apenas registrar como warning
            this.warnings.push({
                category: 'Data Integrity',
                message: `Algumas verificações de integridade não puderam ser executadas: ${error.message}`
            });
        }
    }

    async checkPaymentConsistency() {
        console.log('\n💰 Verificando consistência dos pagamentos...');
        
        try {
            // Participantes pagos sem método de pagamento
            const { data: paidNoMethod } = await supabase
                .from('participants')
                .select('id, name, payment_status, payment_method')
                .eq('payment_status', 'PAID')
                .is('payment_method', null);
            
            if (paidNoMethod?.length > 0) {
                this.warnings.push({
                    category: 'Payment Consistency',
                    message: `${paidNoMethod.length} participantes pagos sem método de pagamento definido`,
                    data: paidNoMethod
                });
            }
            
            // Participantes com valor de pagamento mas status pendente
            const { data: amountNoPaid } = await supabase
                .from('participants')
                .select('id, name, payment_status, payment_amount')
                .neq('payment_status', 'PAID')
                .not('payment_amount', 'is', null)
                .gt('payment_amount', 0);
            
            if (amountNoPaid?.length > 0) {
                this.warnings.push({
                    category: 'Payment Consistency',
                    message: `${amountNoPaid.length} participantes com valor pago mas status não é PAID`,
                    data: amountNoPaid
                });
            }
            
        } catch (error) {
            this.issues.push({
                category: 'Payment Consistency',
                severity: 'Critical',
                message: `Erro ao verificar pagamentos: ${error.message}`
            });
        }
    }

    async runBuiltInValidation() {
        console.log('\n🛠️ Executando validação integrada do sistema...');
        
        try {
            const { data: validationResults } = await supabase
                .rpc('validate_tournament_data_integrity');
            
            if (validationResults && validationResults.length > 0) {
                for (const result of validationResults) {
                    if (result.issue_count > 0) {
                        this.issues.push({
                            category: 'Built-in Validation',
                            severity: 'High',
                            message: `${result.description}: ${result.issue_count} problemas encontrados`,
                            data: result
                        });
                    }
                }
            } else {
                console.log('   ✅ Validação integrada não encontrou problemas');
            }
            
        } catch (error) {
            this.warnings.push({
                category: 'Built-in Validation',
                message: `Não foi possível executar validação integrada: ${error.message}`
            });
        }
    }

    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO DE DIAGNÓSTICO DO SISTEMA DE TORNEIOS');
        console.log('='.repeat(60));
        
        console.log('\n📊 ESTATÍSTICAS GERAIS:');
        Object.entries(this.stats).forEach(([key, value]) => {
            if (typeof value === 'object') {
                console.log(`   ${key}:`);
                Object.entries(value).forEach(([subKey, subValue]) => {
                    console.log(`     - ${subKey}: ${subValue}`);
                });
            } else {
                console.log(`   ${key}: ${value}`);
            }
        });
        
        if (this.issues.length === 0 && this.warnings.length === 0) {
            console.log('\n🎉 PARABÉNS! Nenhum problema encontrado no sistema!');
            return;
        }
        
        if (this.issues.length > 0) {
            console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
            this.issues.forEach((issue, index) => {
                console.log(`\n${index + 1}. [${issue.severity}] ${issue.category}: ${issue.message}`);
                if (issue.data && typeof issue.data === 'object') {
                    console.log(`   Detalhes: ${JSON.stringify(issue.data, null, 2)}`);
                }
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️ AVISOS:');
            this.warnings.forEach((warning, index) => {
                console.log(`\n${index + 1}. ${warning.category}: ${warning.message}`);
                if (warning.data && typeof warning.data === 'object') {
                    console.log(`   Detalhes: ${JSON.stringify(warning.data, null, 2)}`);
                }
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📝 RESUMO:');
        console.log(`   🚨 Problemas críticos/importantes: ${this.issues.length}`);
        console.log(`   ⚠️ Avisos: ${this.warnings.length}`);
        
        const criticalIssues = this.issues.filter(i => i.severity === 'Critical').length;
        const highIssues = this.issues.filter(i => i.severity === 'High').length;
        const mediumIssues = this.issues.filter(i => i.severity === 'Medium').length;
        
        if (criticalIssues > 0) {
            console.log(`   🔴 Críticos: ${criticalIssues} (precisam ser corrigidos imediatamente)`);
        }
        if (highIssues > 0) {
            console.log(`   🟠 Altos: ${highIssues} (podem afetar funcionamento)`);
        }
        if (mediumIssues > 0) {
            console.log(`   🟡 Médios: ${mediumIssues} (inconsistências menores)`);
        }
        
        console.log('='.repeat(60));
        
        // Recomendações
        if (this.issues.length > 0) {
            console.log('\n💡 RECOMENDAÇÕES:');
            
            if (criticalIssues > 0) {
                console.log('   1. Corrija IMEDIATAMENTE os problemas críticos');
                console.log('   2. Verifique a integridade do banco de dados');
                console.log('   3. Considere fazer backup antes de continuar');
            }
            
            if (this.issues.some(i => i.category === 'UUID Integrity' || i.category === 'Bracket Logic')) {
                console.log('   4. Execute o script de correção de UUIDs novamente');
                console.log('   5. Revalide os brackets de eliminação');
            }
            
            if (this.issues.some(i => i.category === 'Advancement Logic')) {
                console.log('   6. Verifique a lógica de avanço entre partidas');
                console.log('   7. Teste o fluxo de finalização de partidas');
            }
        }
    }
}

// Executar diagnóstico
const diagnostic = new TournamentDiagnostic();
diagnostic.run().catch(console.error);
