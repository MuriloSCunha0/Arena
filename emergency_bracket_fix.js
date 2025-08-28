// Script de diagnóstico e correção emergencial para problemas de chaveamento
// Execute este script no console do navegador para diagnosticar e corrigir problemas

/**
 * Diagnóstico completo do torneio
 */
async function diagnoseTournamentIssues(tournamentId) {
  console.log('🔍 Iniciando diagnóstico completo...');
  
  try {
    // Buscar dados do torneio
    const { data: tournament, error } = await window.supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();
      
    if (error) throw error;
    
    const matches = tournament.matches_data || [];
    const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION');
    
    console.log('📊 Dados do torneio:', {
      totalMatches: matches.length,
      eliminationMatches: eliminationMatches.length,
      status: tournament.status
    });
    
    // 1. Verificar IDs inconsistentes
    const invalidIds = checkInvalidIds(eliminationMatches);
    
    // 2. Verificar posições incorretas
    const positionIssues = checkPositionIssues(eliminationMatches);
    
    // 3. Verificar placeholders não resolvidos
    const placeholderIssues = checkPlaceholderIssues(eliminationMatches);
    
    // 4. Verificar duplicações
    const duplicateIssues = checkDuplicateTeams(eliminationMatches);
    
    console.log('🚨 Problemas encontrados:', {
      invalidIds: invalidIds.length,
      positionIssues: positionIssues.length,
      placeholderIssues: placeholderIssues.length,
      duplicateIssues: duplicateIssues.length
    });
    
    return {
      tournament,
      matches,
      eliminationMatches,
      issues: {
        invalidIds,
        positionIssues,
        placeholderIssues,
        duplicateIssues
      }
    };
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    throw error;
  }
}

/**
 * Verificar IDs inconsistentes
 */
function checkInvalidIds(matches) {
  const invalidIds = [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  matches.forEach(match => {
    if (!uuidRegex.test(match.id)) {
      invalidIds.push({
        matchId: match.id,
        reason: 'ID não é UUID válido',
        match
      });
    }
  });
  
  return invalidIds;
}

/**
 * Verificar posições incorretas
 */
function checkPositionIssues(matches) {
  const issues = [];
  
  // Organizar por rodada
  const byRound = {};
  matches.forEach(match => {
    if (!byRound[match.round]) byRound[match.round] = [];
    byRound[match.round].push(match);
  });
  
  // Verificar cada rodada
  Object.entries(byRound).forEach(([round, roundMatches]) => {
    const positions = roundMatches.map(m => m.position).sort((a, b) => a - b);
    const expectedPositions = Array.from({length: roundMatches.length}, (_, i) => i + 1);
    
    if (JSON.stringify(positions) !== JSON.stringify(expectedPositions)) {
      issues.push({
        round: parseInt(round),
        actual: positions,
        expected: expectedPositions,
        matches: roundMatches
      });
    }
  });
  
  return issues;
}

/**
 * Verificar placeholders não resolvidos
 */
function checkPlaceholderIssues(matches) {
  const issues = [];
  
  matches.forEach(match => {
    const isPlaceholder = (team) => {
      if (!team || !Array.isArray(team)) return false;
      return team.some(player => 
        typeof player === 'string' && 
        (player.includes('WINNER_') || 
         player.includes('Vencedor') ||
         player.includes('TBD') ||
         player.includes('FINAL_'))
      );
    };
    
    if (isPlaceholder(match.team1) || isPlaceholder(match.team2)) {
      issues.push({
        matchId: match.id,
        round: match.round,
        position: match.position,
        team1: match.team1,
        team2: match.team2,
        reason: 'Contém placeholders não resolvidos'
      });
    }
  });
  
  return issues;
}

/**
 * Verificar duplicações de times
 */
function checkDuplicateTeams(matches) {
  const issues = [];
  const teamOccurrences = new Map();
  
  matches.forEach(match => {
    [match.team1, match.team2].forEach(team => {
      if (team && Array.isArray(team) && team.length === 2) {
        const teamKey = team.join('_');
        if (!teamOccurrences.has(teamKey)) {
          teamOccurrences.set(teamKey, []);
        }
        teamOccurrences.get(teamKey).push(match);
      }
    });
  });
  
  teamOccurrences.forEach((matchList, teamKey) => {
    if (matchList.length > 1) {
      // Verificar se são rodadas subsequentes (ok) ou mesma rodada (problema)
      const rounds = matchList.map(m => m.round);
      const uniqueRounds = [...new Set(rounds)];
      
      if (uniqueRounds.length < rounds.length) {
        issues.push({
          team: teamKey,
          matches: matchList,
          reason: 'Time aparece múltiplas vezes na mesma rodada'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Correção emergencial para posições incorretas
 */
function fixPositionIssues(matches) {
  console.log('🔧 Corrigindo posições das partidas...');
  
  const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION');
  const otherMatches = matches.filter(m => m.stage !== 'ELIMINATION');
  
  // Organizar por rodada
  const byRound = {};
  eliminationMatches.forEach(match => {
    if (!byRound[match.round]) byRound[match.round] = [];
    byRound[match.round].push(match);
  });
  
  const fixedMatches = [];
  
  // Corrigir posições em cada rodada
  Object.entries(byRound).forEach(([round, roundMatches]) => {
    // Ordenar por posição atual para manter ordem relativa
    roundMatches.sort((a, b) => a.position - b.position);
    
    // Reassignar posições corretas
    roundMatches.forEach((match, index) => {
      fixedMatches.push({
        ...match,
        position: index + 1
      });
    });
  });
  
  return [...otherMatches, ...fixedMatches];
}

/**
 * Resolver placeholders baseado em partidas concluídas
 */
function resolvePlaceholders(matches) {
  console.log('🔧 Resolvendo placeholders...');
  
  const completedMatches = matches.filter(m => m.completed && m.winnerId);
  const winnerMap = new Map();
  
  // Construir mapa de vencedores
  completedMatches.forEach(match => {
    const winnerTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
    const placeholderKey = `R${match.round}_${match.position}`;
    
    winnerMap.set(placeholderKey, winnerTeam);
    winnerMap.set(`WINNER_R${match.round}_${match.position}`, winnerTeam);
    winnerMap.set(`WINNER_${placeholderKey}`, winnerTeam);
  });
  
  // Resolver placeholders
  return matches.map(match => {
    const resolveTeam = (team) => {
      if (!team || !Array.isArray(team)) return team;
      
      return team.map(player => {
        if (typeof player === 'string' && player.includes('WINNER_')) {
          const keyMatch = player.match(/WINNER_(.+)/);
          if (keyMatch) {
            const resolvedTeam = winnerMap.get(keyMatch[1]);
            if (resolvedTeam && Array.isArray(resolvedTeam)) {
              return resolvedTeam[0]; // Retornar primeiro jogador
            }
          }
        }
        return player;
      });
    };
    
    return {
      ...match,
      team1: resolveTeam(match.team1),
      team2: resolveTeam(match.team2)
    };
  });
}

/**
 * Normalizar IDs para UUIDs válidos
 */
function normalizeIds(matches) {
  console.log('🔧 Normalizando IDs...');
  
  const idMap = new Map();
  
  function generateValidId(currentId) {
    if (isValidUUID(currentId)) return currentId;
    
    if (idMap.has(currentId)) return idMap.get(currentId);
    
    const newId = crypto.randomUUID();
    idMap.set(currentId, newId);
    return newId;
  }
  
  function isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
  
  return matches.map(match => ({
    ...match,
    id: generateValidId(match.id)
  }));
}

/**
 * Correção emergencial completa
 */
async function emergencyBracketRepair(tournamentId) {
  console.log('🚨 INICIANDO REPARO EMERGENCIAL...');
  
  try {
    // 1. Diagnóstico
    const diagnosis = await diagnoseTournamentIssues(tournamentId);
    let { matches } = diagnosis;
    
    // 2. Aplicar correções
    matches = normalizeIds(matches);
    matches = fixPositionIssues(matches);
    matches = resolvePlaceholders(matches);
    
    // 3. Salvar no banco
    const { error } = await window.supabase
      .from('tournaments')
      .update({
        matches_data: matches,
        updated_at: new Date().toISOString()
      })
      .eq('id', tournamentId);
      
    if (error) throw error;
    
    console.log('✅ REPARO EMERGENCIAL CONCLUÍDO');
    console.log(`📈 ${matches.filter(m => m.stage === 'ELIMINATION').length} partidas eliminatórias reparadas`);
    
    return matches;
    
  } catch (error) {
    console.error('❌ Erro no reparo emergencial:', error);
    throw error;
  }
}

// Exportar funções para uso no console
window.emergencyBracketRepair = emergencyBracketRepair;
window.diagnoseTournamentIssues = diagnoseTournamentIssues;

console.log(`
🔧 Script de Reparo Emergencial Carregado!

Para usar:
1. emergencyBracketRepair('SEU_TOURNAMENT_ID') - Reparo completo
2. diagnoseTournamentIssues('SEU_TOURNAMENT_ID') - Apenas diagnóstico

Exemplo:
await emergencyBracketRepair('cd4e2d91-4b9c-48b8-b188-3d5dfd8d37cc')
`);
