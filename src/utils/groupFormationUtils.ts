/**
 * Utilitário para formação de grupos de Beach Tênis
 * Implementação das regras oficiais para formação de grupos em torneios
 */

/**
 * Determina o melhor agrupamento para duplas em um torneio de Beach Tênis
 * Segue as regras oficiais:
 * - Grupos preferencialmente com 3 duplas
 * - Permite grupos de 2 ou 4 duplas quando necessário para incluir todos
 * - Otimiza a distribuição para o chaveamento
 * - Garante que todos os grupos tenham partidas equilibradas
 * - Suporte para cálculo automático de grupos baseado no máximo de duplas
 *
 * @param teams Array de duplas/times para agrupar
 * @param maxTeamsPerGroup Máximo de duplas por grupo (usado para calcular quantidade de grupos automaticamente)
 * @param autoCalculateGroups Se true, calcula automaticamente o número de grupos baseado no maxTeamsPerGroup
 * @returns Lista de grupos formados otimizada para ranking
 */
export function distributeTeamsIntoGroups(
  teams: string[][],
  maxTeamsPerGroup: number = 4,
  autoCalculateGroups: boolean = false
): string[][][] {
  console.log(`🔧 [distributeTeamsIntoGroups] Called with:`, {
    teamsCount: teams.length,
    teams: teams,
    maxTeamsPerGroup: maxTeamsPerGroup,
    autoCalculateGroups: autoCalculateGroups
  });
  
  // Copia e embaralha os times para distribuição aleatória
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const totalTeams = shuffledTeams.length;
  
  console.log(`🔧 [distributeTeamsIntoGroups] Total teams: ${totalTeams}`);
  
  // Calcular o tamanho ideal dos grupos
  let idealGroupSize: number;
  let numberOfGroups: number;
  
  if (autoCalculateGroups) {
    // Modo automático: calcular baseado no máximo de duplas por grupo
    numberOfGroups = Math.ceil(totalTeams / maxTeamsPerGroup);
    idealGroupSize = Math.ceil(totalTeams / numberOfGroups);
    
    console.log(`🔧 [AUTO] Calculated ${numberOfGroups} groups with ~${idealGroupSize} teams each (max: ${maxTeamsPerGroup})`);
  } else {
    // Modo tradicional: usar tamanho padrão de 3-4 duplas por grupo
    idealGroupSize = Math.min(maxTeamsPerGroup, 4); // Máximo 4, mas preferencialmente 3
    numberOfGroups = Math.ceil(totalTeams / idealGroupSize);
    
    console.log(`🔧 [TRADITIONAL] Using ideal group size: ${idealGroupSize}, calculated ${numberOfGroups} groups`);
  }
  
  // Resultados serão armazenados aqui
  const groups: string[][][] = [];
  let teamIndex = 0;
  
  // NOVA LÓGICA: Distribuição inteligente baseada no modo selecionado
  if (autoCalculateGroups) {
    // Modo automático: distribuir uniformemente respeitando o máximo
    console.log(`🔧 [AUTO MODE] Distributing ${totalTeams} teams into ${numberOfGroups} groups (max ${maxTeamsPerGroup} per group)`);
    
    // Calcular distribuição equilibrada
    const baseTeamsPerGroup = Math.floor(totalTeams / numberOfGroups);
    const extraTeams = totalTeams % numberOfGroups;
    
    console.log(`🔧 [AUTO MODE] Base teams per group: ${baseTeamsPerGroup}, extra teams: ${extraTeams}`);
    
    for (let groupIndex = 0; groupIndex < numberOfGroups; groupIndex++) {
      const group: string[][] = [];
      const teamsForThisGroup = baseTeamsPerGroup + (groupIndex < extraTeams ? 1 : 0);
      
      for (let teamInGroup = 0; teamInGroup < teamsForThisGroup && teamIndex < totalTeams; teamInGroup++) {
        group.push(shuffledTeams[teamIndex++]);
      }
      
      if (group.length > 0) {
        groups.push(group);
        console.log(`🔧 [AUTO MODE] Group ${groupIndex + 1}: ${group.length} teams`);
      }
    }
  } else {
    // Modo tradicional: usar lógica otimizada para Beach Tennis
    console.log(`🔧 [TRADITIONAL MODE] Using Beach Tennis optimized distribution`);
    
    // Tratamento especial para poucos times (menos de 6)
    if (totalTeams <= 3) {
      console.log(`🔧 [distributeTeamsIntoGroups] Case: totalTeams <= 3 (${totalTeams})`);
      const singleGroup: string[][] = [];
      for (let i = 0; i < totalTeams; i++) {
        singleGroup.push(shuffledTeams[i]);
      }
      groups.push(singleGroup);
      console.log(`🔧 [distributeTeamsIntoGroups] Created single group with ${singleGroup.length} teams`);
    } 
    else if (totalTeams === 4) {
      console.log(`🔧 [distributeTeamsIntoGroups] Case: totalTeams === 4`);
      const group: string[][] = [];
      for (let i = 0; i < 4; i++) {
        group.push(shuffledTeams[i]);
      }
      groups.push(group);
      console.log(`🔧 [distributeTeamsIntoGroups] Created group of 4 teams`);
    }
    else if (totalTeams === 5) {
      console.log(`🔧 [distributeTeamsIntoGroups] Case: totalTeams === 5`);
      const group1: string[][] = [];
      for (let i = 0; i < 3; i++) {
        group1.push(shuffledTeams[i]);
      }
      groups.push(group1);
      
      const group2: string[][] = [];
      for (let i = 3; i < 5; i++) {
        group2.push(shuffledTeams[i]);
      }
      groups.push(group2);
      console.log(`🔧 [distributeTeamsIntoGroups] Created 2 groups: [${group1.length}, ${group2.length}] teams`);
    }
    else {
      // Para 6+ times, distribuir usando o tamanho ideal respeitando o máximo
      const actualGroupSize = Math.min(idealGroupSize, maxTeamsPerGroup);
      let groupCount = Math.ceil(totalTeams / actualGroupSize);
      
      console.log(`🔧 [TRADITIONAL] Distributing ${totalTeams} teams into ${groupCount} groups of ~${actualGroupSize} teams`);
      
      // Distribuição equilibrada
      for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
        const group: string[][] = [];
        const remainingTeams = totalTeams - teamIndex;
        const remainingGroups = groupCount - groupIndex;
        const teamsForThisGroup = Math.ceil(remainingTeams / remainingGroups);
        
        for (let teamInGroup = 0; teamInGroup < teamsForThisGroup && teamIndex < totalTeams; teamInGroup++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        
        if (group.length > 0) {
          groups.push(group);
          console.log(`🔧 [TRADITIONAL] Group ${groupIndex + 1}: ${group.length} teams`);
        }
      }
    }
  }
  
  console.log(`🔧 [distributeTeamsIntoGroups] Final result: ${groups.length} groups`, groups);
  return groups;
}

/**
 * Forma duplas automaticamente com participantes que não têm dupla definida
 * @param participants Lista de todos os participantes
 * @returns Array de duplas formadas (cada dupla é um array com 2 IDs)
 */
export function formAutomaticPairs(participants: any[]): string[][] {
  // Separar participantes que já têm dupla dos que não têm
  const pairedParticipants = new Set<string>();
  const existingPairs: string[][] = [];
  const unpairedParticipants: any[] = [];

  participants.forEach(participant => {
    if (participant.partnerId && !pairedParticipants.has(participant.id)) {
      // Este participante tem dupla definida
      const partner = participants.find(p => p.id === participant.partnerId);
      if (partner) {
        existingPairs.push([participant.id, partner.id]);
        pairedParticipants.add(participant.id);
        pairedParticipants.add(partner.id);
      } else {
        // Parceiro não encontrado, adicionar aos não pareados
        unpairedParticipants.push(participant);
      }
    } else if (!pairedParticipants.has(participant.id)) {
      // Participante sem dupla definida
      unpairedParticipants.push(participant);
    }
  });

  // Embaralhar participantes sem dupla
  const shuffledUnpaired = [...unpairedParticipants].sort(() => Math.random() - 0.5);
  
  // Formar duplas com os participantes restantes
  const newPairs: string[][] = [];
  for (let i = 0; i < shuffledUnpaired.length - 1; i += 2) {
    newPairs.push([shuffledUnpaired[i].id, shuffledUnpaired[i + 1].id]);
  }

  // Se sobrar um participante ímpar, criar uma dupla fictícia ou lidar conforme necessário
  if (shuffledUnpaired.length % 2 === 1) {
    const lastParticipant = shuffledUnpaired[shuffledUnpaired.length - 1];
    // Por enquanto, vamos criar uma dupla de um só (será tratado como BYE se necessário)
    newPairs.push([lastParticipant.id]);
  }

  // Combinar duplas existentes com as novas
  return [...existingPairs, ...newPairs];
}

/**
 * Cria estrutura completa de grupos incluindo formação automática de duplas
 * @param participants Lista de participantes
 * @param teamFormationType Tipo de formação (FORMED, RANDOM, etc.)
 * @param defaultGroupSize Tamanho padrão dos grupos
 * @returns Estrutura completa com duplas formadas e grupos distribuídos
 */
export function createTournamentStructure(
  participants: any[],
  teamFormationType: string,
  defaultGroupSize: number = 3
): {
  teams: string[][]; // Corrigido: era string[], agora é string[][]
  groups: string[][][];
  metadata: {
    formedPairs: number;
    randomPairs: number;
    totalParticipants: number;
  };
} {
  let teams: string[][] = [];
  
  if (teamFormationType === 'FORMED') {
    // Para duplas formadas, usar formação automática que respeita parcerias existentes
    teams = formAutomaticPairs(participants);
  } else {
    // Para duplas aleatórias, embaralhar todos e formar duplas
    const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
    teams = [];
    
    for (let i = 0; i < shuffledParticipants.length - 1; i += 2) {
      teams.push([shuffledParticipants[i].id, shuffledParticipants[i + 1].id]);
    }
    
    // Lidar com participante ímpar
    if (shuffledParticipants.length % 2 === 1) {
      teams.push([shuffledParticipants[shuffledParticipants.length - 1].id]);
    }
  }

  // Distribuir as duplas em grupos
  const groups = distributeTeamsIntoGroups(teams, defaultGroupSize);

  // Calcular metadados baseados no tipo de formação
  let formedPairs = 0;
  let randomPairs = 0;

  if (teamFormationType === 'FORMED') {
    // Para duplas formadas, contar quantos participantes têm parceiro definido
    const participantsWithPartner = participants.filter(p => p.partnerId).length;
    formedPairs = Math.floor(participantsWithPartner / 2);
    randomPairs = teams.length - formedPairs;
  } else {
    // Para duplas aleatórias, todos os times são aleatórios
    randomPairs = teams.length;
    formedPairs = 0;
  }

  return {
    teams,
    groups,
    metadata: {
      formedPairs,
      randomPairs,
      totalParticipants: participants.length,
    }
  };
}
