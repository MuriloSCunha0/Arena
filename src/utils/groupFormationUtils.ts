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
 *
 * @param teams Array de duplas/times para agrupar
 * @param defaultGroupSize Tamanho de grupo padrão (geralmente 3 para Beach Tênis)
 * @returns Lista de grupos formados
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
    // Para 4 times, criamos um grupo de 4
    const group: string[][] = [];
    for (let i = 0; i < 4; i++) {
      group.push(shuffledTeams[i]);
    }
    groups.push(group);
  }
  else if (totalTeams === 5) {
    // Para 5 times, criamos um grupo de 3 e um grupo de 2
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
    // Para 6+ times, aplicamos o algoritmo mais complexo
    
    // Calcular quantos grupos de tamanho defaultGroupSize (3) teremos
    let groupCount = Math.floor(totalTeams / defaultGroupSize);
    const remainingTeams = totalTeams % defaultGroupSize;
    
    // Estratégia baseada no número de times restantes
    if (remainingTeams === 0) {
      // Caso perfeito: todos os grupos terão exatamente 3 times
      for (let i = 0; i < groupCount; i++) {
        const group: string[][] = [];
        for (let j = 0; j < defaultGroupSize; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
      }
    } 
    else if (remainingTeams === 1) {
      // Sobra 1 time: criamos um grupo com 4 times e o resto com 3
      // Reduzimos um grupo regular para acomodar o time extra
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
      // Estratégia específica para o Beach Tênis: quando sobram 2 times,
      // é melhor ter um grupo de 2 times quando há ao menos 9 times no total
      if (totalTeams >= 9) {
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
        smallGroup.push(shuffledTeams[teamIndex++]);
        smallGroup.push(shuffledTeams[teamIndex++]);
        groups.push(smallGroup);
      } else {
        // Com menos de 9 times, é melhor redistribuir em dois grupos de 4 times
        // Esse padrão é mais equilibrado para avanço no chaveamento
        groupCount = groupCount - 2; // Reduzimos 2 grupos regulares
        
        // Primeiro criamos os grupos com 3 times
        for (let i = 0; i < groupCount; i++) {
          const group: string[][] = [];
          for (let j = 0; j < defaultGroupSize; j++) {
            group.push(shuffledTeams[teamIndex++]);
          }
          groups.push(group);
        }
        
        // Depois criamos dois grupos com 4 times
        for (let i = 0; i < 2; i++) {
          const specialGroup: string[][] = [];
          for (let j = 0; j < 4; j++) {
            specialGroup.push(shuffledTeams[teamIndex++]);
          }
          groups.push(specialGroup);
        }
      }
    }
    else if (remainingTeams === 3) {
      // Sobram 3 times: criamos um grupo adicional com 3 times
      // Isso mantém a regra de ter tamanhos iguais quando possível
      
      // Criamos todos os grupos com 3 times
      for (let i = 0; i < groupCount + 1; i++) {
        const group: string[][] = [];
        for (let j = 0; j < defaultGroupSize; j++) {
          group.push(shuffledTeams[teamIndex++]);
        }
        groups.push(group);
      }
    }
  }
  
  return groups;
}
