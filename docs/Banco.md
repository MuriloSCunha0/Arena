# Arena - Documentação do Banco de Dados

## Visão Geral

Este documento descreve a estrutura do banco de dados PostgreSQL utilizado no projeto Arena, uma plataforma para gerenciamento de torneios e eventos esportivos. O esquema inclui tabelas para usuários, eventos, torneios, quadras, participantes e transações financeiras, bem como seus relacionamentos e funcionalidades.

## Tipos Enumerados (ENUM)

O banco de dados utiliza diversos tipos enumerados para garantir consistência de dados em campos específicos:

| Enum | Valores | Utilização |
|------|---------|------------|
| `court_status` | `AVAILABLE`, `MAINTENANCE`, `BOOKED` | Define o status de uma quadra |
| `court_type` | `PADEL`, `BEACH_TENNIS`, `OTHER` | Define o tipo de quadra esportiva |
| `event_status` | `SCHEDULED`, `ONGOING`, `COMPLETED`, `CANCELLED` | Define o status de um evento |
| `event_type` | `TOURNAMENT`, `POOL` | Define o tipo de evento esportivo |
| `match_stage` | `GROUP`, `ELIMINATION` | Define a fase de uma partida no torneio |
| `organizer_role` | `ADMIN`, `ORGANIZER`, `ASSISTANT` | Define o papel de um organizador no evento |
| `payment_method` | `PIX`, `CARD`, `CASH`, `OTHER` | Define o método de pagamento |
| `payment_status` | `PENDING`, `CONFIRMED`, `CANCELLED` | Define o status de um pagamento |
| `reservation_status` | `CONFIRMED`, `PENDING`, `CANCELED` | Define o status de uma reserva de quadra |
| `team_formation_type` | `FORMED`, `RANDOM` | Define como as equipes são formadas (pré-formadas ou sorteio) |
| `tournament_status` | `CREATED`, `STARTED`, `FINISHED`, `CANCELLED` | Define o status de um torneio |
| `transaction_type` | `INCOME`, `EXPENSE` | Define o tipo de transação financeira |

Esses enums são usados em várias partes da aplicação para validar e limitar os valores possíveis em campos específicos.

## Estrutura de Tabelas

### 1. `users`

**Descrição**: Armazena informações sobre os usuários do sistema.

**Colunas Principais**:
- `id`: Identificador único do usuário (UUID)
- `email`: Email do usuário (único)
- `user_metadata`: Dados adicionais do usuário em formato JSON
- `app_metadata`: Metadados da aplicação (como o papel do usuário) em formato JSON
- `full_name`: Nome completo do usuário
- `phone`: Telefone do usuário
- `cpf`: CPF do usuário
- `birth_date`: Data de nascimento
- `tournaments_history`: Histórico de participação em torneios em formato JSON

**Utilização no projeto**:
- Autenticação e autorização via Supabase em `src/lib/supabase.ts`
- Gerenciamento de usuários em componentes como `src/hooks/useAuth.tsx`
- Perfil de usuário em `src/pages/profile/UserProfile.tsx`
- Verificação de permissões em `src/App.tsx`

```typescript
// Exemplo de uso em hooks/useAuth.tsx
const { data } = await supabase.auth.getSession();
if (data?.session?.user) {
  // Dados do user_metadata
  const role = data.session.user.user_metadata?.role;
}
```

### 2. `organizers`

**Descrição**: Armazena informações sobre os organizadores de eventos.

**Colunas Principais**:
- `id`: Identificador único do organizador (UUID)
- `name`: Nome do organizador
- `phone`: Telefone de contato
- `email`: Email de contato
- `pix_key`: Chave PIX para recebimentos
- `default_commission_rate`: Taxa de comissão padrão
- `active`: Indica se o organizador está ativo

**Utilização no projeto**:
- Gerenciamento de organizadores em `src/pages/organizers/OrganizersList.tsx`
- Criação/edição de organizadores em `src/pages/organizers/OrganizerForm.tsx`
- Seleção de organizadores ao criar eventos em `src/pages/events/EventForm.tsx`

```typescript
// Exemplo em pages/organizers/OrganizersList.tsx
const { data, error } = await supabase
  .from('organizers')
  .select('*')
  .eq('active', true);
```

### 3. `courts`

**Descrição**: Armazena informações sobre as quadras esportivas disponíveis.

**Colunas Principais**:
- `id`: Identificador único da quadra (UUID)
- `name`: Nome da quadra
- `location`: Localização da quadra
- `type`: Tipo de quadra (PADEL, BEACH_TENNIS, OTHER)
- `status`: Status da quadra (AVAILABLE, MAINTENANCE, BOOKED)
- `surface`: Tipo de superfície da quadra
- `indoor`: Indica se é uma quadra coberta
- `active`: Indica se a quadra está ativa
- `image_url`: URL da imagem da quadra
- `description`: Descrição detalhada da quadra

**Utilização no projeto**:
- Gerenciamento de quadras em `src/pages/courts/CourtsManagement.tsx`
- Seleção de quadras para eventos em `src/pages/events/EventForm.tsx`
- Agendamento de partidas em `src/components/events/TournamentBracket.tsx`

```typescript
// Exemplo em components/events/TournamentBracket.tsx
const handleScheduleMatch = async (matchId: string, courtId: string, scheduledTime: string) => {
  await updateMatchSchedule(matchId, courtId, scheduledTime);
}
```

### 4. `events`

**Descrição**: Armazena informações sobre os eventos esportivos.

**Colunas Principais**:
- `id`: Identificador único do evento (UUID)
- `type`: Tipo de evento (TOURNAMENT, POOL)
- `title`: Título do evento
- `description`: Descrição do evento
- `location`: Local do evento
- `date`: Data do evento
- `time`: Horário do evento
- `price`: Preço da inscrição
- `max_participants`: Número máximo de participantes
- `prize`: Descrição da premiação
- `rules`: Regras do evento
- `banner_image_url`: URL da imagem de banner
- `team_formation`: Tipo de formação de equipes (FORMED, RANDOM)
- `categories`: Categorias do evento (array)
- `court_ids`: IDs das quadras relacionadas (array)
- `organizer_id`: ID do organizador (referência)
- `status`: Status do evento (SCHEDULED, ONGOING, COMPLETED, CANCELLED)

**Utilização no projeto**:
- Listagem de eventos em `src/pages/events/EventsList.tsx`
- Detalhes do evento em `src/pages/events/EventDetail.tsx`
- Criação/edição de eventos em `src/pages/events/EventForm.tsx`
- Inscrição em eventos em `src/pages/public/EventRegistration.tsx`

```typescript
// Exemplo em pages/events/EventDetail.tsx
const { data: event, error } = await supabase
  .from('events')
  .select(`
    *,
    organizers(name),
    participants(id, name)
  `)
  .eq('id', eventId)
  .single();
```

### 5. `tournaments`

**Descrição**: Armazena informações sobre os torneios vinculados a eventos.

**Colunas Principais**:
- `id`: Identificador único do torneio (UUID)
- `event_id`: ID do evento relacionado (referência)
- `status`: Status do torneio (CREATED, STARTED, FINISHED, CANCELLED)
- `settings`: Configurações do torneio em formato JSON (tamanho dos grupos, qualificados por grupo, etc.)
- `type`: Tipo de torneio
- `team_formation`: Tipo de formação de equipes (FORMED, RANDOM)

**Utilização no projeto**:
- Gerenciamento de torneios em `src/services/TournamentService.ts`
- Geração de estrutura de torneios em `src/services/supabase/tournament.ts`
- Visualização do chaveamento em `src/components/events/TournamentBracket.tsx`

```typescript
// Exemplo em services/TournamentService.ts
const generateTournamentStructure = async (
  eventId: string,
  teams: string[][],
  teamFormationType: TeamFormationType
) => {
  const { data: newTournament } = await supabase
    .from('tournaments')
    .insert({
      event_id: eventId,
      status: 'CREATED',
      team_formation: teamFormationType,
      settings: { groupSize: 4, qualifiersPerGroup: 2 }
    })
    .select()
    .single();
  // ...
};
```

### 6. `tournament_matches`

**Descrição**: Armazena informações sobre as partidas de um torneio.

**Colunas Principais**:
- `id`: Identificador único da partida (UUID)
- `tournament_id`: ID do torneio (referência)
- `event_id`: ID do evento (referência)
- `stage`: Fase da partida (GROUP, ELIMINATION)
- `group_number`: Número do grupo (para fase de grupos)
- `round`: Rodada da partida
- `position`: Posição da partida na rodada
- `team1`, `team2`: IDs dos participantes de cada equipe (arrays)
- `score1`, `score2`: Pontuação de cada equipe
- `winner_id`: Identificador da equipe vencedora ('team1' ou 'team2')
- `completed`: Indica se a partida está concluída
- `walkover`: Indica se houve W.O.
- `scheduled_time`: Data e hora agendadas
- `court_id`: ID da quadra (referência)

**Utilização no projeto**:
- Visualização de partidas em `src/components/events/TournamentBracket.tsx`
- Gerenciamento de partidas em `src/services/TournamentService.ts`
- Atualização de resultados e avanço de vencedores em `src/services/supabase/tournament.ts`

```typescript
// Exemplo em components/events/TournamentBracket.tsx
const handleSaveMatchResults = async (matchId: string, score1: number, score2: number) => {
  await updateMatchResults(matchId, score1, score2);
  // Lógica de avanço do vencedor
};
```

### 7. `participants`

**Descrição**: Armazena informações sobre os participantes de um evento.

**Colunas Principais**:
- `id`: Identificador único do participante (UUID)
- `event_id`: ID do evento (referência)
- `name`: Nome do participante
- `cpf`: CPF do participante
- `phone`: Telefone de contato
- `email`: Email de contato
- `birth_date`: Data de nascimento
- `partner_id`: ID do parceiro (auto-referência para formação de duplas)
- `partner_name`: Nome do parceiro
- `payment_status`: Status do pagamento (PENDING, CONFIRMED, CANCELLED)
- `payment_method`: Método de pagamento
- `pix_payment_code`: Código de pagamento PIX
- `payment_date`: Data do pagamento

**Utilização no projeto**:
- Listagem de participantes em `src/pages/participants/ParticipantsList.tsx`
- Inscrição de participantes em `src/pages/public/EventRegistration.tsx`
- Formação de duplas em `src/components/events/TournamentRandomizer.tsx`

```typescript
// Exemplo em pages/public/EventRegistration.tsx
const handleSubmit = async (data) => {
  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      email: data.email,
      // ...outros campos
    })
    .select();
};
```

### 8. `participant_results`

**Descrição**: Armazena resultados e classificações dos participantes em torneios.

**Colunas Principais**:
- `id`: Identificador único do resultado (UUID)
- `participant_id`: ID do participante (referência)
- `tournament_id`: ID do torneio (referência)
- `event_id`: ID do evento (referência)
- `position`: Posição final do participante
- `stage`: Fase alcançada pelo participante
- `points`: Pontos acumulados
- `notes`: Observações adicionais

**Utilização no projeto**:
- Exibição de resultados em `src/pages/events/EventDetail.tsx`
- Cálculos de ranking em `src/utils/rankingUtils.ts`
- Histórico de participante em `src/pages/profile/UserProfile.tsx`

```typescript
// Exemplo em utils/rankingUtils.ts
export const getParticipantResults = async (participantId) => {
  const { data, error } = await supabase
    .from('participant_results')
    .select('*, tournaments(event_id, events(title))')
    .eq('participant_id', participantId);
  // Processar resultados
};
```

### 9. `financial_transactions`

**Descrição**: Armazena transações financeiras relacionadas a eventos.

**Colunas Principais**:
- `id`: Identificador único da transação (UUID)
- `event_id`: ID do evento (referência)
- `participant_id`: ID do participante (referência, opcional)
- `amount`: Valor da transação
- `type`: Tipo de transação (INCOME, EXPENSE)
- `description`: Descrição da transação
- `payment_method`: Método de pagamento
- `status`: Status do pagamento
- `transaction_date`: Data da transação

**Utilização no projeto**:
- Resumo financeiro em `src/pages/financial/FinancialOverview.tsx`
- Registro de pagamentos em `src/pages/participants/ParticipantsList.tsx`
- Confirmação de pagamentos em `src/pages/public/EventRegistration.tsx`

```typescript
// Exemplo em pages/financial/FinancialOverview.tsx
const { data: transactions, error } = await supabase
  .from('financial_transactions')
  .select('*, participants(name)')
  .eq('event_id', eventId)
  .order('transaction_date', { ascending: false });
```

### 10. `court_reservations`

**Descrição**: Armazena reservas de quadras para partidas ou outros fins.

**Colunas Principais**:
- `id`: Identificador único da reserva (UUID)
- `court_id`: ID da quadra (referência)
- `event_id`: ID do evento (referência, opcional)
- `match_id`: ID da partida (referência, opcional)
- `title`: Título da reserva
- `start_time`: Horário de início
- `end_time`: Horário de término
- `status`: Status da reserva (CONFIRMED, PENDING, CANCELED)

**Utilização no projeto**:
- Gerenciamento de quadras em `src/pages/courts/CourtsManagement.tsx`
- Agendamento de partidas em `src/components/events/TournamentBracket.tsx`
- Calendário de reservas em `src/components/courts/CourtCalendar.tsx`

```typescript
// Exemplo em components/events/TournamentBracket.tsx
const scheduleMatch = async (match, courtId, time) => {
  // Criar uma reserva de quadra
  const { data: reservation } = await supabase
    .from('court_reservations')
    .insert({
      court_id: courtId,
      match_id: match.id,
      event_id: match.event_id,
      title: `Partida ${match.stage} R${match.round}-${match.position}`,
      start_time: time,
      end_time: new Date(new Date(time).getTime() + 60*60*1000).toISOString(),
      status: 'CONFIRMED'
    })
    .select();
  
  // Atualizar a partida com a quadra e horário
  await supabase
    .from('tournament_matches')
    .update({
      court_id: courtId,
      scheduled_time: time,
      court_reservation_id: reservation.id
    })
    .eq('id', match.id);
};
```

### 11. Tabelas de Relacionamento

#### 11.1. `event_courts`
Relaciona eventos a quadras.

#### 11.2. `event_organizers`
Relaciona eventos a organizadores e seus papéis.

#### 11.3. `participant_eliminators`
Armazena informações sobre quais participantes eliminaram outros em torneios.

### 12. `files` e `file_buckets`

**Descrição**: Tabelas para gerenciamento de arquivos no sistema.

**Utilização no projeto**:
- Upload de imagens de banner para eventos
- Armazenamento de QR codes para pagamento
- Gerenciamento de arquivos no sistema

## Relacionamentos Principais

1. **Evento e Torneio**: Um evento pode ter um torneio associado (relação 1:1)
2. **Evento e Participantes**: Um evento tem múltiplos participantes (relação 1:N)
3. **Evento e Quadras**: Um evento pode utilizar múltiplas quadras (relação N:M via event_courts)
4. **Participante e Parceiro**: Um participante pode ter um parceiro (outro participante) para formar uma dupla (relação 1:1 auto-referencial)
5. **Torneio e Partidas**: Um torneio tem múltiplas partidas (relação 1:N)
6. **Partida e Quadra**: Uma partida pode ser associada a uma quadra (relação N:1)
7. **Partida e Reserva de Quadra**: Uma partida pode ter uma reserva de quadra associada (relação 1:1)

## Utilização da Tabela de Settings JSONB

Várias tabelas utilizam campos JSONB para armazenar configurações flexíveis:

### 1. `tournaments.settings`

Armazena configurações específicas do torneio:

```json
{
  "groupSize": 4,
  "qualifiersPerGroup": 2,
  "eliminationType": "SINGLE",
  "bracketFormat": "SINGLE_ELIMINATION"
}
```

Utilizado em:
- `src/services/TournamentService.ts` para configurar a estrutura do torneio
- `src/services/supabase/tournament.ts` para gerar grupos e chaveamento

### 2. `users.user_metadata`

Armazena metadados específicos do usuário:

```json
{
  "full_name": "Nome do Usuário",
  "role": "admin",
  "avatar_url": "https://exemplo.com/avatar.jpg"
}
```

Utilizado em:
- `src/hooks/useAuth.tsx` para verificação de papel do usuário
- `src/App.tsx` para autorização baseada em papel

### 3. `event_organizers.permissions`

Armazena permissões específicas para organizadores de eventos:

```json
{
  "can_edit": true,
  "can_delete": false,
  "can_manage_participants": true
}
```

## Funções e Triggers

### 1. `update_updated_at_column()`

Função que atualiza automaticamente a coluna `updated_at` com o timestamp atual sempre que um registro é modificado.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
```

## Índices

O esquema utiliza vários índices para melhorar o desempenho das consultas:

1. **Índices de Chave Estrangeira**: Para melhorar joins (ex: `idx_tournaments_event_id`)
2. **Índices de Filtro Comum**: Para campos frequentemente filtrados em consultas (ex: `idx_participants_payment_status`)
3. **Índices Compostos**: Para consultas que filtram por múltiplos campos (ex: `idx_tournament_matches_stage_round`)
4. **Índices de Texto**: Para pesquisas de texto (ex: `idx_files_filename_gin`)

## Padrões de Consulta Comuns

### 1. Consulta de Informações do Evento com Relacionamentos

```typescript
const { data: event } = await supabase
  .from('events')
  .select(`
    *,
    organizers(name, email),
    tournaments(id, status),
    participants(id, name, payment_status)
  `)
  .eq('id', eventId)
  .single();
```

### 2. Consulta de Partidas de Torneio por Fase

```typescript
const { data: matches } = await supabase
  .from('tournament_matches')
  .select('*')
  .eq('tournament_id', tournamentId)
  .eq('stage', 'GROUP')
  .order('group_number', { ascending: true })
  .order('round', { ascending: true });
```

### 3. Atualizações Transacionais para Avanço de Vencedores

```typescript
// Em src/services/supabase/tournament.ts
const advanceWinner = async (match) => {
  const { data: nextMatch } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('round', match.round + 1)
    .eq('position', Math.ceil(match.position / 2))
    .single();
  
  const winningTeam = match.winnerId === 'team1' ? match.team1 : match.team2;
  const teamField = match.position % 2 === 1 ? 'team1' : 'team2';
  
  await supabase
    .from('tournament_matches')
    .update({ [teamField]: winningTeam })
    .eq('id', nextMatch.id);
};
```

## Conclusão

A estrutura do banco de dados do projeto Arena foi projetada para suportar um sistema completo de gerenciamento de torneios esportivos, com foco especial em Beach Tennis. O esquema permite:

1. Gerenciamento flexível de eventos e torneios
2. Diferentes formatos de competição (grupos, eliminatórias)
3. Formação de duplas (aleatórias ou pré-formadas)
4. Agendamento de partidas e reservas de quadras
5. Controle financeiro de inscrições e despesas
6. Registro de resultados e classificações

A utilização de tipos enumerados, restrições de chaves estrangeiras e triggers automáticos ajuda a manter a integridade dos dados, enquanto os índices estratégicos garantem um bom desempenho do sistema.