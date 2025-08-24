/**
 * Utilitário para formação de grupos de Beach Tênis
 * Implementação das regras oficiais para formação de grupos em torneios
 */

/**
 * Determina o melhor agrupamento para duplas em um torneio de Beach Tênis
 * Segue as regras oficiais otimizadas:
 * - Prioriza o máximo de grupos com 3 duplas
 * - Agrupa as duplas restantes em um grupo de 4 (quando sobram 1, 2 ou 4 duplas)
 * - Quando sobram 3 duplas, mantém como grupo de 3
 * - Otimiza a distribuição para o chaveamento equilibrado
 *
 * Exemplos:
 * - 16 duplas = 4 grupos de 3 + 1 grupo de 4 duplas
 * - 15 duplas = 5 grupos de 3 duplas  
 * - 14 duplas = 3 grupos de 3 + 1 grupo de 5 duplas (ajustado para 4 grupos de 3 + 1 de 2)
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
  
  // Resultados serão armazenados aqui
  const groups: string[][][] = [];
  let teamIndex = 0;
  
  // NOVA LÓGICA OTIMIZADA: Máximo de grupos de 3 duplas + 1 grupo de 4 se necessário
  if (autoCalculateGroups) {
    // Modo automático: distribuir uniformemente respeitando o máximo
    const numberOfGroups = Math.ceil(totalTeams / maxTeamsPerGroup);
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
    // NOVA LÓGICA TRADICIONAL: Priorizar grupos de 3 duplas
    console.log(`🔧 [OPTIMIZED MODE] Using optimized distribution: max groups of 3 + remainder in group of 4`);
    
    // Casos especiais para poucos times
    if (totalTeams <= 2) {
      console.log(`🔧 [OPTIMIZED] Case: totalTeams <= 2 (${totalTeams}) - Single group`);
      const singleGroup: string[][] = [];
      for (let i = 0; i < totalTeams; i++) {
        singleGroup.push(shuffledTeams[i]);
      }
      groups.push(singleGroup);
    } 
    else if (totalTeams === 3) {
      console.log(`🔧 [OPTIMIZED] Case: totalTeams === 3 - Single group of 3`);
      const group: string[][] = [];
      for (let i = 0; i < 3; i++) {
        group.push(shuffledTeams[i]);
      }
      groups.push(group);
    }
    else if (totalTeams === 4) {
      console.log(`🔧 [OPTIMIZED] Case: totalTeams === 4 - Single group of 4`);
      const group: string[][] = [];
      for (let i = 0; i < 4; i++) {
        group.push(shuffledTeams[i]);
      }
      groups.push(group);
    }
    else if (totalTeams === 5) {
      console.log(`🔧 [OPTIMIZED] Case: totalTeams === 5 - One group of 3 + one group of 2`);
      // Grupo de 3
      const group1: string[][] = [];
      for (let i = 0; i < 3; i++) {
        group1.push(shuffledTeams[i]);
      }
      groups.push(group1);
      
      // Grupo de 2
      const group2: string[][] = [];
      for (let i = 3; i < 5; i++) {
        group2.push(shuffledTeams[i]);
      }
      groups.push(group2);
    }
    else {
      // Para 6+ times: NOVA LÓGICA OTIMIZADA
      console.log(`🔧 [OPTIMIZED] Case: totalTeams >= 6 (${totalTeams}) - Optimized distribution`);
      
      // Calcular quantos grupos de 3 podemos fazer e quantas duplas sobram
      const groupsOf3 = Math.floor(totalTeams / 3);
      const remainder = totalTeams % 3;
      
      console.log(`🔧 [OPTIMIZED] Can make ${groupsOf3} groups of 3, remainder: ${remainder}`);
      
      let finalGroupsOf3: number = 0;
      let finalGroupsOf4: number = 0;
      let finalGroupsOf2: number = 0;
      
      if (remainder === 0) {
        // Total divisível por 3: todos os grupos de 3
        finalGroupsOf3 = groupsOf3;
        finalGroupsOf4 = 0;
        finalGroupsOf2 = 0;
        console.log(`🔧 [OPTIMIZED] Perfect division: ${finalGroupsOf3} groups of 3`);
      } else if (remainder === 1) {
        // Sobra 1: pegar 1 dupla de um grupo de 3 para fazer um grupo de 4
        if (groupsOf3 >= 2) {
          finalGroupsOf3 = groupsOf3 - 1; // Reduzir um grupo de 3
          finalGroupsOf4 = 1; // Criar um grupo de 4 (3 do grupo restante + 1 que sobrou)
          finalGroupsOf2 = 0;
          console.log(`🔧 [OPTIMIZED] Remainder 1: ${finalGroupsOf3} groups of 3 + 1 group of 4`);
        } else {
          // Se só tem 1 grupo de 3, fazer grupos menores
          finalGroupsOf3 = 0;
          finalGroupsOf4 = 1; // 4 times total
          finalGroupsOf2 = 0;
          console.log(`🔧 [OPTIMIZED] Remainder 1 (low teams): 1 group of 4`);
        }
      } else if (remainder === 2) {
        // Sobra 2: fazer um grupo de 2 ou redistribuir
        if (groupsOf3 >= 1) {
          finalGroupsOf3 = groupsOf3;
          finalGroupsOf4 = 0;
          finalGroupsOf2 = 1; // Grupo com as 2 que sobraram
          console.log(`🔧 [OPTIMIZED] Remainder 2: ${finalGroupsOf3} groups of 3 + 1 group of 2`);
        } else {
          // Casos especiais já tratados acima
          finalGroupsOf3 = 0;
          finalGroupsOf4 = 0;
          finalGroupsOf2 = 1;
        }
      }
      
      // Criar os grupos conforme calculado
      teamIndex = 0;
      
      // Grupos de 3
      for (let i = 0; i < finalGroupsOf3; i++) {
        const group: string[][] = [];
        for (let j = 0; j < 3; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
        console.log(`🔧 [OPTIMIZED] Created group ${i + 1} of 3 teams`);
      }
      
      // Grupos de 4
      for (let i = 0; i < finalGroupsOf4; i++) {
        const group: string[][] = [];
        for (let j = 0; j < 4; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
        console.log(`🔧 [OPTIMIZED] Created group of 4 teams`);
      }
      
      // Grupos de 2
      for (let i = 0; i < finalGroupsOf2; i++) {
        const group: string[][] = [];
        for (let j = 0; j < 2; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
        console.log(`🔧 [OPTIMIZED] Created group of 2 teams`);
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
