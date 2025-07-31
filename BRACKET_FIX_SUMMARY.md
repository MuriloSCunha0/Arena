# CORREÇÃO: Problema do Bracket Eliminatório

## 🚨 Problema Identificado

**No bracket atual:**
- Elisa Ferreira & Karina Almeida (8º lugar, -4 SG) aparece nas oitavas
- Felipe Costa & Giovana Ramos (9º lugar, -9 SG) aparece nas oitavas
- **Essas duplas NÃO deveriam ter se classificado**

**Deveriam estar no bracket apenas as top 6:**
1. Lucas Oliveira & Ana Lima (+7 SG) ✅
2. Rafael Barros & Sofia Cardoso (+4 SG) ✅  
3. Marina Farias & Henrique Melo (+2 SG) ✅
4. Bruno Alves & João Pedro (+1 SG) ✅
5. Diego Martins & Wesley Araújo (0 SG) ✅
6. Eduarda Silva & Gabriela Alves (0 SG) ✅

## 🔧 Correções Implementadas

### 1. **Seleção Correta das Duplas Qualificadas** (tournament.ts)
```typescript
// ANTES: Pegava qualquer número (até 8)
const qualifiedTeams = overallRankings.slice(0, Math.min(8, overallRankings.length));

// DEPOIS: Calcula corretamente baseado nos grupos
const numberOfGroups = Object.keys(groupRankings).length; // 3 grupos
const qualifiersPerGroup = 2; // 2 por grupo
const totalQualified = numberOfGroups * qualifiersPerGroup; // 3 × 2 = 6
const qualifiedTeams = overallRankings.slice(0, totalQualified); // Top 6
```

### 2. **Lógica Correta de Bracket com BYEs** (bracketFix.ts)
Para **6 duplas classificadas**:

**Estrutura Correta do Beach Tennis:**
```
🏆 BRACKET DE 8 (próxima potência de 2)
├── 2 BYEs para as 2 melhores duplas (1º e 2º)
├── 4 duplas restantes jogam QUARTAS DE FINAL
├── 2 vencedores das QF + 2 BYEs = 4 nas SEMIFINAIS
└── 2 vencedores das SF = FINAL
```

**Implementação:**
```typescript
// QUARTAS DE FINAL (apenas duplas 3º-6º)
QF1: 3º vs 6º (Marina vs Eduarda)
QF2: 4º vs 5º (Bruno vs Diego)

// SEMIFINAIS (BYEs + vencedores)
SF1: 1º (Lucas - BYE) vs Vencedor QF1
SF2: 2º (Rafael - BYE) vs Vencedor QF2

// FINAL
F1: Vencedor SF1 vs Vencedor SF2
```

### 3. **Imports Atualizados**
- `tournament.ts`: Agora usa `bracketFix.ts`
- `TournamentBracket.tsx`: Import corrigido
- `ElimBracketBuilder.tsx`: Import corrigido

## ✅ Resultado Esperado

**Após as correções:**

### Duplas QUALIFICADAS (Top 6):
1. **Lucas Oliveira & Ana Lima** → BYE direto para SEMIFINAL
2. **Rafael Barros & Sofia Cardoso** → BYE direto para SEMIFINAL  
3. **Marina Farias & Henrique Melo** → Joga QUARTAS DE FINAL
4. **Bruno Alves & João Pedro** → Joga QUARTAS DE FINAL
5. **Diego Martins & Wesley Araújo** → Joga QUARTAS DE FINAL
6. **Eduarda Silva & Gabriela Alves** → Joga QUARTAS DE FINAL

### Duplas ELIMINADAS:
7. **Vitor Lopes & Karina Duarte** ❌
8. **Elisa Ferreira & Karina Almeida** ❌ (estava aparecendo incorretamente)
9. **Felipe Costa & Giovana Ramos** ❌ (estava aparecendo incorretamente)

## 🎾 Regras do Beach Tennis Implementadas

1. **Classificação:** Top 2 de cada grupo
2. **BYEs:** Apenas para as 2 melhores duplas do ranking geral
3. **Bracket:** Potência de 2 mais próxima (8 para 6 duplas)
4. **Proteção:** Duplas com BYE só se enfrentam na final
5. **Qualidade:** Melhores duplas enfrentam oponentes mais fracos

## 🚀 Como Testar

1. Gere uma nova fase eliminatória
2. Verifique se apenas 6 duplas aparecem
3. Confirme que as 2 melhores têm BYE para semifinal
4. Valide se apenas 2 partidas de quartas existem

A implementação agora segue fielmente as regras do Beach Tennis!
