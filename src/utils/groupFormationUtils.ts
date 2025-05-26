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
 *
 * @param teams Array de duplas/times para agrupar
 * @param defaultGroupSize Tamanho de grupo padrão (geralmente 3 para Beach Tênis)
 * @returns Lista de grupos formados otimizada para ranking
 */
export function distributeTeamsIntoGroups(
  teams: string[][],
  defaultGroupSize: number = 3
): string[][][] {
  // Copia e embaralha os times para distribuição aleatória
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  const totalTeams = shuffledTeams.length;
  
  // Resultados serão armazenados aqui
  const groups: string[][][] = [];
  let teamIndex = 0;
  
  // Tratamento especial para poucos times (menos de 6)
  if (totalTeams <= 3) {
    // Se houver 2 ou 3 times, colocamos todos em um único grupo
    const singleGroup: string[][] = [];
    for (let i = 0; i < totalTeams; i++) {
      singleGroup.push(shuffledTeams[i]);
    }
    groups.push(singleGroup);
  } 
  else if (totalTeams === 4) {
    // Para 4 times, criamos um grupo de 4 - ideal para ranking equilibrado
    const group: string[][] = [];
    for (let i = 0; i < 4; i++) {
      group.push(shuffledTeams[i]);
    }
    groups.push(group);
  }
  else if (totalTeams === 5) {
    // Para 5 times, criamos um grupo de 3 e um grupo de 2
    // Isso permite comparação justa no ranking geral
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
  }
  else {
    // Para 6+ times, aplicamos o algoritmo otimizado para ranking justo
    
    // Calcular quantos grupos de tamanho defaultGroupSize (3) teremos
    let groupCount = Math.floor(totalTeams / defaultGroupSize);
    const remainingTeams = totalTeams % defaultGroupSize;
    
    // Estratégia otimizada para ranking equilibrado
    if (remainingTeams === 0) {
      // Caso perfeito: todos os grupos terão exatamente 3 times
      // Isso garante que todas as equipes joguem o mesmo número de partidas
      for (let i = 0; i < groupCount; i++) {
        const group: string[][] = [];
        for (let j = 0; j < defaultGroupSize; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
      }
    } 
    else if (remainingTeams === 1) {
      // Sobra 1 time: melhor estratégia é criar um grupo com 4 times
      // Isso mantém o equilíbrio no ranking geral
      groupCount--;
      
      // Primeiro criamos os grupos com 3 times
      for (let i = 0; i < groupCount; i++) {
        const group: string[][] = [];
        for (let j = 0; j < defaultGroupSize; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
      }
      
      // Depois criamos o grupo com 4 times
      const specialGroup: string[][] = [];
      for (let j = 0; j < 4; j++) {
        specialGroup.push(shuffledTeams[teamIndex++]);
      }
      groups.push(specialGroup);
    }
    else if (remainingTeams === 2) {
      // Para ranking justo no Beach Tennis, preferimos grupos maiores
      // quando possível para evitar desequilíbrios
      if (totalTeams >= 8) {
        // Criamos grupos regulares de 3 times
        for (let i = 0; i < groupCount; i++) {
          const group: string[][] = [];
          for (let j = 0; j < defaultGroupSize; j++) {
            group.push(shuffledTeams[teamIndex++]);
          }
          groups.push(group);
        }
        
        // Adicionamos um grupo com 2 times
        const smallGroup: string[][] = [];
        for (let j = 0; j < 2; j++) {
          smallGroup.push(shuffledTeams[teamIndex++]);
        }
        groups.push(smallGroup);
      } else {
        // Com menos times, redistribuir em grupos de 4 é mais equilibrado
        groupCount = Math.max(0, groupCount - 1);
        
        // Grupos com 3 times
        for (let i = 0; i < groupCount; i++) {
          const group: string[][] = [];
          for (let j = 0; j < defaultGroupSize; j++) {
            group.push(shuffledTeams[teamIndex++]);
          }
          groups.push(group);
        }
        
        // Um grupo com 4 ou 5 times (dependendo do que sobrou)
        if (teamIndex < totalTeams) {
          const specialGroup: string[][] = [];
          while (teamIndex < totalTeams) {
            specialGroup.push(shuffledTeams[teamIndex++]);
          }
          groups.push(specialGroup);
        }
      }
    }
  }
  
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
