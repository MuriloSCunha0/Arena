# Arena - Documentação do Projeto

## Visão Geral

Arena é um sistema de gerenciamento para torneios e eventos esportivos, com foco especial em Beach Tennis. A plataforma permite criar, organizar e gerenciar eventos esportivos, incluindo a inscrição de participantes, formação de duplas, sorteio de grupos, agendamento de partidas, controle de quadras e gestão financeira do evento.

## Tecnologias Utilizadas

### Front-end
- **React**: Framework JavaScript para construção da interface
- **TypeScript**: Linguagem com tipagem estática para maior segurança e manutenibilidade do código
- **Tailwind CSS**: Framework CSS utility-first para estilização
- **Zustand**: Biblioteca de gerenciamento de estado global
- **Lucide React**: Biblioteca de ícones
- **Canvas Confetti**: Para efeitos visuais celebratórios

### Back-end
- **Supabase**: Plataforma backend-as-a-service com:
  - Banco de dados PostgreSQL
  - Autenticação e gerenciamento de usuários
  - Armazenamento de arquivos
  - Funções e gatilhos em tempo real
  - API RESTful automática

### Integração
- Serviços de pagamento para processamento de inscrições (referenciados pelo código)
- APIs para envio de notificações

## Funcionalidades do Sistema

### 1. Gestão de Eventos

#### Criação e Configuração de Eventos
- Criação de eventos com título, descrição, localização, data, hora e preço
- Definição de número máximo de participantes
- Configuração de prêmios e regras do evento
- Upload de imagem de banner para o evento
- Seleção de tipo de formação de equipes (formadas ou aleatórias)
- Categorias do evento
- Configuração de taxas para organizador

#### Tipos de Eventos
- Torneios estruturados (TOURNAMENT)
- Piscina de jogadores (POOL)

#### Status do Evento
- Agendado (SCHEDULED)
- Em andamento (ONGOING)
- Concluído (COMPLETED)
- Cancelado (CANCELLED)

### 2. Gestão de Participantes

- Registro de participantes com informações pessoais
- Sistema de pagamento e confirmação de inscrição
- Gerenciamento de duplas (para eventos com equipes formadas)
- Acompanhamento de status de pagamento
- Registro de ranking dos jogadores
- Busca e filtro de participantes

### 3. Estrutura de Torneios

#### Fase de Grupos
- Criação automática de grupos balanceados
- Configuração do tamanho dos grupos (3-5 duplas, preferencialmente 4)
- Configuração do número de classificados por grupo
- Geração automática de partidas para fase de grupos
- Cálculo de rankings dentro dos grupos

#### Fase Eliminatória
- Geração automática de chaveamento eliminatório baseado nos classificados dos grupos
- Suporte para diferentes formatos de partidas
- Sistema de avanço automático para próximas fases
- Geração de chaves com bye (avanço automático) para balancear o número de participantes

#### Formação de Equipes
- Suporte para equipes pré-formadas (FORMED)
- Sistema de sorteio aleatório de duplas (RANDOM)
- Interface animada para sorteio de equipes

### 4. Gestão de Partidas

- Agendamento de partidas com data, hora e quadra
- Registro de resultados (pontuação)
- Indicação visual de vencedores
- Avanço automático de vencedores na fase eliminatória
- Suporte para walkover (W.O.)

### 5. Gerenciamento de Quadras

- Cadastro de quadras com detalhes (nome, localização, tipo, superfície)
- Agendamento de reservas de quadras
- Verificação de disponibilidade de quadras
- Associação de quadras a partidas do torneio

### 6. Regras e Formatos de Partida (Beach Tennis)

- Fase de Grupos: 1 set com tie-break em 6-6
- Fase Eliminatória (rodadas iniciais): Melhor de 3 sets, 4 games por set, Tie-break 7
- Fase Eliminatória (final): Melhor de 3 sets, 4 games por set, Match Tie-break 10

### 7. Gestão Financeira

- Registro de transações financeiras (receitas e despesas)
- Cálculo de comissões para organizadores
- Resumo financeiro do evento
- Acompanhamento de pagamentos de inscrições

### 8. Usuários e Permissões

- Sistema de autenticação via Supabase
- Diferentes níveis de acesso (usuário comum, organizador)
- Perfil de usuário com metadados personalizáveis

## Design de Telas e Componentes

### Componentes de UI Reutilizáveis
- **Buttons**: Diferentes variantes (primary, outline, danger)
- **Modals**: Janelas de diálogo para interações
- **Inputs**: Campos de formulário com validação
- **Notifications**: Sistema de notificações para feedback ao usuário
- **Tooltips**: Dicas contextuais para elementos da interface

### Telas Principais

#### Dashboard de Eventos
- Lista de eventos disponíveis
- Filtros e busca
- Visualização de detalhes do evento
- Ações rápidas para gerenciamento

#### Gerenciador de Torneio
- Visualização de grupos e chaveamento
- Interface para sorteio de duplas e quadras
- Editor de resultados de partidas
- Rankings de grupos e geral

#### Visualização de Chaveamento
- Representação visual da estrutura do torneio
- Fase de grupos com partidas
- Chaveamento eliminatório com linhas conectoras
- Detalhes de partidas e resultados
- Controles de zoom para melhor visualização

#### Gerenciamento de Quadras
- Lista de quadras cadastradas
- Calendário de reservas
- Formulário para adicionar/editar quadras
- Visualização de agendamentos

#### Gerenciamento de Participantes
- Lista de participantes
- Status de pagamento
- Formulário de inscrição
- Visualização de duplas

#### Componentes Especiais
- **TournamentWheel**: Interface interativa para sorteio de duplas e quadras
- **BracketAnimation**: Animação para formação de chaves
- **TournamentRandomizer**: Controle para sorteio aleatório de estrutura do torneio

## Esquema do Banco de Dados

### Tabelas Principais

#### events
- `id`: string (PK)
- `type`: enum (TOURNAMENT, POOL)
- `title`: string
- `description`: string
- `location`: string
- `date`: string
- `time`: string
- `price`: number
- `max_participants`: number
- `prize`: string
- `rules`: string
- `banner_image_url`: string
- `team_formation`: enum (FORMED, RANDOM)
- `categories`: string[]
- `created_at`: timestamp
- `updated_at`: timestamp
- `organizer_id`: string (FK)
- `organizer_commission_rate`: number
- `status`: enum (SCHEDULED, ONGOING, COMPLETED, CANCELLED)

#### participants
- `id`: string (PK)
- `event_id`: string (FK)
- `name`: string
- `cpf`: string
- `phone`: string
- `email`: string (opcional)
- `partner_id`: string (FK, self-reference, opcional)
- `payment_status`: enum (PENDING, CONFIRMED)
- `payment_id`: string (opcional)
- `payment_date`: timestamp (opcional)
- `registered_at`: timestamp
- `pix_payment_code`: string (opcional)
- `pix_qrcode_url`: string (opcional)
- `payment_transaction_id`: string (opcional)
- `birth_date`: string (opcional)
- `ranking`: number (opcional)

#### tournaments
- `id`: string (PK)
- `event_id`: string (FK)
- `status`: enum (CREATED, STARTED, FINISHED, CANCELLED)
- `settings`: JSONB (contém configurações como qualifiersPerGroup, groupSize)
- `type`: string
- `team_formation`: enum (FORMED, RANDOM)

#### tournament_matches
- `id`: string (PK)
- `tournament_id`: string (FK)
- `event_id`: string (FK)
- `round`: number
- `position`: number
- `team1`: string[]
- `team2`: string[]
- `score1`: number (opcional)
- `score2`: number (opcional)
- `winner_id`: string (opcional, 'team1' ou 'team2')
- `completed`: boolean
- `court_id`: string (FK, opcional)
- `scheduled_time`: timestamp (opcional)
- `stage`: enum (GROUP, ELIMINATION)
- `group_number`: number (opcional)
- `walkover`: boolean (opcional)
- `created_at`: timestamp
- `updated_at`: timestamp

#### courts
- `id`: string (PK)
- `name`: string
- `location`: string
- `type`: enum (PADEL, BEACH_TENNIS, OTHER)
- `status`: enum (AVAILABLE, MAINTENANCE, BOOKED)
- `surface`: string (opcional)
- `indoor`: boolean
- `active`: boolean
- `image_url`: string (opcional)
- `description`: string (opcional)
- `created_at`: timestamp
- `updated_at`: timestamp

#### court_reservations
- `id`: string (PK)
- `court_id`: string (FK)
- `event_id`: string (FK, opcional)
- `match_id`: string (FK, opcional)
- `title`: string
- `start_time`: timestamp
- `end_time`: timestamp
- `status`: enum (CONFIRMED, PENDING, CANCELED)
- `created_at`: timestamp
- `updated_at`: timestamp

#### financial_transactions
- `id`: string (PK)
- `event_id`: string (FK)
- `participant_id`: string (FK, opcional)
- `amount`: number
- `type`: enum (INCOME, EXPENSE)
- `description`: string
- `payment_method`: enum (PIX, CARD, CASH, OTHER)
- `status`: enum (PENDING, CONFIRMED, CANCELLED)
- `transaction_date`: timestamp

#### organizers
- `id`: string (PK)
- `name`: string
- `phone`: string
- `email`: string (opcional)
- `pix_key`: string (opcional)
- `default_commission_rate`: number
- `active`: boolean
- `created_at`: timestamp
- `updated_at`: timestamp

#### participant_results
- `id`: string (PK)
- `participant_id`: string (FK)
- `tournament_id`: string (FK)
- `event_id`: string (FK)
- `position`: number (opcional)
- `stage`: string (opcional)
- `points`: number (opcional)
- `eliminated_by`: string[] (opcional)
- `notes`: string (opcional)
- `created_at`: timestamp

## Análise do Sistema de Torneio de Beach Tennis

### Implementação Atual

O sistema atual implementa várias regras específicas para torneios de Beach Tennis:

1. **Formatos de Partida**:
   - Fase de Grupos: 1 set com tie-break em 6-6
   - Eliminatórias Iniciais: Melhor de 3 sets, 4 games por set, Tie-break 7
   - Final: Melhor de 3 sets, 4 games por set, Match Tie-break 10

2. **Estrutura do Torneio**:
   - Fase de grupos com tamanho configurável (tipicamente 4 equipes por grupo)
   - Número configurável de classificados por grupo
   - Geração automática de chaveamento eliminatório baseado nos classificados dos grupos
   - Suporte para diferentes formatos de partidas na fase eliminatória
   - Sistema de avanço automático para próximas fases
   - Geração de chaves com bye (avanço automático) para balancear o número de participantes

3. **Ranking e Classificação**:
   - Ranking interno dos grupos
   - Ranking geral comparando entre grupos para mesma colocação
   - Sistema de qualificação para fase eliminatória

## Sugestões de Melhorias para Torneios de Beach Tennis

### 1. Regras e Formatos de Partida

#### Implementar diferentes regras de pontuação
- **Sugestão**: Adicionar suporte a diferentes formatos de partida dependendo da categoria ou nível do torneio
- **Implementação**:
  ```typescript
  export enum TournamentCategory {
    PROFESSIONAL = 'PROFESSIONAL',
    AMATEUR_ADVANCED = 'AMATEUR_ADVANCED',
    AMATEUR_INTERMEDIATE = 'AMATEUR_INTERMEDIATE',
    AMATEUR_BEGINNER = 'AMATEUR_BEGINNER',
    MIXED = 'MIXED'
  }
  
  export enum ScoringSystem {
    FULL_SETS = 'FULL_SETS',              // Sets completos (6 games)
    SHORT_SETS = 'SHORT_SETS',            // Sets curtos (4 games)
    SINGLE_SET = 'SINGLE_SET',            // Set único
    TIMED_MATCH = 'TIMED_MATCH',          // Partida com tempo determinado
    POINTS_CAP = 'POINTS_CAP'             // Até X pontos (ex: 21)
  }
  
  interface TournamentFormatSettings {
    category: TournamentCategory;
    scoringSystem: ScoringSystem;
    setsToWin: number;
    gamesPerSet: number;
    tiebreakAtGames?: number;
    useFinalSetTiebreak?: boolean;
    finalSetTiebreakPoints?: number;
    timeLimitMinutes?: number;
    pointsCap?: number;
  }
  ```

#### Melhorar interface de registro de resultados
- **Sugestão**: Interface específica para Beach Tennis que permita registrar os games de cada set
- **Implementação**: Adicionar componente de registro detalhado:
  ```typescript
  interface BeachTennisScore {
    sets: Array<{
      team1Games: number;
      team2Games: number;
      tiebreak?: {
        team1Points: number;
        team2Points: number;
      }
    }>;
    completed: boolean;
    winnerId: 'team1' | 'team2' | null;
  }
  ```

### 2. Critérios de Desempate e Classificação

#### Expandir critérios de desempate
- **Sugestão**: Implementar todos os critérios oficiais da ITF (Federação Internacional de Tênis) para Beach Tennis
- **Implementação**: Estender a função de cálculo de rankings:
  ```typescript
  function calculateGroupRankings(matches, useExtendedCriteria = false) {
    // ...existing code...
    
    if (useExtendedCriteria) {
      // Critérios adicionais para desempate:
      // 1. Confronto direto
      // 2. Maior % de sets vencidos
      // 3. Maior % de games vencidos
      // 4. Sorteio/decisão da organização
    }
  }
  ```

#### Implementar sistema de cabeças de chave
- **Sugestão**: Adicionar suporte para sistema de cabeças de chave baseado em ranking
- **Implementação**:
  ```typescript
  function generateEliminationBracketWithSeeding(
    qualifiers: GroupRanking[],
    rankings: Record<string, number>, // Ranking oficial dos jogadores
    bracketSize: number
  ) {
    // Identificar cabeças de chave baseado no ranking
    const seededTeams = qualifiers
      .sort((a, b) => {
        const aRanking = a.teamId.reduce((sum, id) => sum + (rankings[id] || 0), 0);
        const bRanking = b.teamId.reduce((sum, id) => sum + (rankings[id] || 0), 0);
        return aRanking - bRanking; // Menor número = melhor ranking
      })
      .slice(0, Math.log2(bracketSize)); // Número de cabeças de chave
    
    // Distribuir cabeças de chave no chaveamento
    const seedPositions = calculateSeedPositions(bracketSize);
    
    // Posicionar os times restantes
    // ...
  }
  ```

#### Evitar confrontos entre equipes do mesmo grupo na primeira rodada eliminatória
- **Sugestão**: Garantir que equipes do mesmo grupo não se enfrentem logo após a fase de grupos
- **Implementação**: Modificar algoritmo de construção de chaves:
  ```typescript
  function avoidSameGroupMatchups(brackets, groupAssignments) {
    // Verificar se há confrontos entre equipes do mesmo grupo
    // Ajustar posições se necessário
    // ...
  }
  ```

### 3. Categorias e Divisões

#### Suporte para múltiplas categorias
- **Sugestão**: Implementar suporte para torneios com múltiplas categorias simultâneas
- **Implementação**: Estender o modelo de dados:
  ```typescript
  interface EventCategorySettings {
    categoryId: string;
    name: string;
    gender: 'MALE' | 'FEMALE' | 'MIXED';
    ageGroup?: 'UNDER_18' | 'ADULT' | 'SENIOR';
    skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO';
    maxTeams?: number;
    tournamentFormat?: TournamentFormatSettings;
  }
  
  // Atualizar tabela de eventos para suportar múltiplas categorias
  interface Event {
    // ...existing fields...
    categories: EventCategorySettings[];
  }
  ```

#### Sistema de classificação por nível de habilidade
- **Sugestão**: Implementar sistema para agrupar jogadores por nível técnico
- **Implementação**: Adicionar sistema de rating:
  ```typescript
  interface PlayerRating {
    playerId: string;
    rating: number; // ex: 1.0-7.0
    confidence: number; // Confiabilidade do rating
    history: {
      date: string;
      oldRating: number;
      newRating: number;
      matchId: string;
    }[];
  }
  ```

### 4. Arbitragem e Fiscalização

#### Sistema de registro de ocorrências
- **Sugestão**: Implementar registro de ocorrências, advertências e penalizações
- **Implementação**: Criar componente e modelo:
  ```typescript
  enum IncidentType {
    WARNING = 'WARNING',
    POINT_PENALTY = 'POINT_PENALTY', 
    GAME_PENALTY = 'GAME_PENALTY',
    MATCH_PENALTY = 'MATCH_PENALTY',
    DISQUALIFICATION = 'DISQUALIFICATION',
    CODE_VIOLATION = 'CODE_VIOLATION',
    TIME_VIOLATION = 'TIME_VIOLATION',
    OTHER = 'OTHER'
  }
  
  interface MatchIncident {
    id: string;
    matchId: string;
    tournamentId: string;
    participantId?: string;
    type: IncidentType;
    description: string;
    timestamp: string;
    registeredBy: string;
    outcome?: string;
  }
  ```

#### Interface para árbitros
- **Sugestão**: Criar interface específica para árbitros gerenciarem partidas
- **Implementação**: Novo componente com funcionalidades específicas:
  - Cronômetro para controle de tempo entre pontos
  - Registro simplificado de pontuação
  - Sistema de chamadas de desafio (questionamentos)
  - Registo de violações de código de conduta

### 5. Integração com Federações e Rankings Oficiais

#### Importação e exportação de dados para federações
- **Sugestão**: Implementar sistema para importar rankings oficiais e exportar resultados
- **Implementação**: Criar serviço de integração:
  ```typescript
  interface RankingImportService {
    importRankings(federationId: string, categoryId: string): Promise<Record<string, number>>;
    exportTournamentResults(tournamentId: string, format: 'ITF' | 'CBT' | 'CSV'): Promise<Blob>;
  }
  ```

#### Cálculo de pontos para rankings oficiais
- **Sugestão**: Sistema para calcular pontos obtidos no torneio segundo regras oficiais
- **Implementação**: Sistema configirável de pontuação:
  ```typescript
  interface RankingPointsConfig {
    tournamentTier: 'ITF' | 'NATIONAL' | 'REGIONAL' | 'LOCAL';
    pointsDistribution: Record<number, number>; // Posição final -> pontos
    bonusPoints?: {
      wins: Record<string, number>; // Id do participante vencido -> pontos extras
    };
  }
  ```

### 6. Estatísticas e Análises

#### Sistema avançado de estatísticas
- **Sugestão**: Implementar coleta e visualização de estatísticas detalhadas
- **Implementação**: Criar estrutura de dados e componentes:
  ```typescript
  interface MatchStatistics {
    matchId: string;
    teams: {
      teamId: string;
      aces: number;
      doubleFaults: number;
      winners: number;
      unforcedErrors: number;
      netPoints: {
        won: number;
        total: number;
      };
      breakPointsConverted: {
        won: number;
        total: number;
      };
      servesIn: {
        won: number;
        total: number;
      };
    }[];
    duration: number; // Em minutos
  }
  ```

#### Histórico de confrontos
- **Sugestão**: Manter histórico de confrontos entre jogadores/duplas
- **Implementação**: Serviço de consulta:
  ```typescript
  function getHeadToHead(player1Id: string, player2Id: string): Promise<{
    player1Wins: number;
    player2Wins: number;
    matches: {
      date: string;
      tournamentId: string;
      tournamentName: string;
      score: string;
      winner: string;
    }[];
  }>;
  ```

## Conclusão

O sistema Arena apresenta uma base sólida para gerenciamento de torneios de Beach Tennis, com funcionalidades para organização de eventos, gestão de participantes, estruturação de torneios e controle financeiro. As melhorias sugeridas visam aprimorar a plataforma para atender melhor às regras específicas do Beach Tennis, oferecendo maior flexibilidade na configuração de formatos de partidas, critérios de classificação mais robustos, suporte para múltiplas categorias, e recursos avançados de arbitragem e estatísticas.

A implementação dessas melhorias elevaria o sistema ao nível de plataformas profissionais de gestão de torneios, atendendo às necessidades tanto de organizadores amadores quanto de competições de alto nível afiliadas a federações oficiais de Beach Tennis.