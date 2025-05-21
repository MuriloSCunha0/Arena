# Arena - Guia do Sistema

## Visão Geral da Arquitetura

O sistema Arena é uma aplicação web para gerenciamento de torneios e eventos esportivos, construída com React, TypeScript e Supabase. Este documento fornece uma visão detalhada da estrutura de arquivos, componentes principais e fluxos de trabalho do sistema.

## Estrutura de Diretórios

```
Arena/
├── public/            # Arquivos estáticos (favicon, sons, etc.)
├── src/               # Código fonte principal
│   ├── components/    # Componentes reutilizáveis
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Bibliotecas e configurações de serviços externos
│   ├── pages/         # Componentes de página organizados por funcionalidade
│   ├── services/      # Serviços e lógica de negócio
│   ├── store/         # Gerenciamento de estado global (Zustand)
│   ├── types/         # Definições de tipos TypeScript
│   └── utils/         # Funções utilitárias
├── db/                # Scripts SQL e migrações
└── docs/              # Documentação do projeto
```

## Principais Tecnologias

- **React**: Framework front-end (com hooks)
- **TypeScript**: Linguagem de programação tipada
- **Supabase**: Backend-as-a-service (Banco de dados, autenticação, armazenamento)
- **Tailwind CSS**: Framework CSS para estilização
- **Zustand**: Biblioteca para gerenciamento de estado global
- **React Router**: Para navegação entre páginas
- **Lucide React**: Biblioteca de ícones

## Arquivos e Funcionalidades Principais

### 1. Entrada da Aplicação

#### `src/main.tsx`
Ponto de entrada da aplicação React, onde o componente raiz é renderizado.

#### `src/App.tsx`
Componente principal que configura o roteamento, gerencia a autenticação e define os layouts principais.

```typescript
// Exemplo simplificado da estrutura
function App() {
  const { user, loading } = useAuthStore();
  
  // Verificar autenticação
  // Configurar rotas protegidas e públicas
  return (
    <Router>
      <Routes>
        {/* Rotas públicas */}
        <Route path="/login" element={<Login />} />
        
        {/* Rotas protegidas */}
        <Route path="/*" element={user ? <AuthenticatedRoutes /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
```

### 2. Autenticação e Gerenciamento de Usuários

#### `src/lib/supabase.ts`
Configuração do cliente Supabase para autenticação e acesso ao banco de dados.

```typescript
// Configuração básica do Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: localStorage
  }
});

// Funções auxiliares para sessão
export const refreshSession = async () => {
  // Lógica para renovar token e sessão
};
```

#### `src/store/authStore.ts`
Store Zustand para gerenciamento global do estado de autenticação.

```typescript
// Exemplo da store de autenticação
import { create } from 'zustand';

export type UserRole = 'admin' | 'participante';

interface AuthState {
  user: any;
  loading: boolean;
  userRole: UserRole | null;
  setUser: (user: any) => void;
  setUserRole: (role: UserRole | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // ...outras funções
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  userRole: null,
  
  setUser: (user) => set({ user, loading: false }),
  setUserRole: (role) => set({ userRole: role }),
  
  signIn: async (email, password) => {
    // Lógica de login
  },
  
  signOut: async () => {
    // Lógica de logout
  },
  
  // Outras funções de autenticação
}));
```

#### `src/hooks/useAuth.tsx`
Hook personalizado e provider para gerenciar estado de autenticação e usuário.

```typescript
// Contexto para autenticação
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Gerenciamento de sessão, verificação de papel do usuário, etc.
  // ...
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
```

### 3. Gestão de Eventos

#### `src/pages/events/EventsList.tsx`
Lista de eventos disponíveis com filtros e pesquisa.

#### `src/pages/events/EventForm.tsx`
Formulário para criação e edição de eventos.

#### `src/pages/events/EventDetail.tsx`
Visualização detalhada de um evento específico.

#### `src/services/eventService.ts`
Serviços para manipulação de eventos (busca, criação, atualização, remoção).

```typescript
// Funções do serviço de eventos
export const EventService = {
  getAllEvents: async () => {
    // Buscar todos os eventos
    const { data, error } = await supabase
      .from('events')
      .select('*')
      // ...
  },
  
  getEventById: async (id: string) => {
    // Buscar evento por ID
  },
  
  createEvent: async (eventData: EventFormData) => {
    // Criar novo evento
  },
  
  // Outras funções relacionadas a eventos
};
```

### 4. Sistema de Torneios

#### `src/services/TournamentService.ts`
Gerencia a lógica de torneios, incluindo geração de estrutura e chaveamentos.

```typescript
// Funções principais do serviço de torneios
export const TournamentService = {
  getByEventId: async (eventId: string) => {
    // Buscar torneio por ID de evento
  },
  
  generateTournamentStructure: async (
    eventId: string,
    teams: string[][],
    teamFormationType: TeamFormationType,
    options?: { groupSize?: number; forceReset?: boolean }
  ) => {
    // Criar estrutura de grupos para o torneio
  },
  
  generateEliminationBracket: async (tournamentId: string) => {
    // Gerar chaveamento eliminatório baseado nos classificados dos grupos
  },
  
  advanceWinner: async (match: Match) => {
    // Avançar vencedor para próxima fase
  },
  
  // Outras funções relacionadas a torneios
};
```

#### `src/components/events/TournamentBracket.tsx`
Visualização do chaveamento de torneios com fase de grupos e eliminatórias.

#### `src/components/events/TournamentRandomizer.tsx`
Componente para sorteio aleatório de duplas e formação de grupos.

#### `src/utils/rankingUtils.ts`
Funções para cálculo de rankings e classificações em torneios.

```typescript
export const calculateGroupRankings = (matches: Match[]): GroupRanking[] => {
  // Algoritmo para calcular classificação de grupos baseado em partidas
};
```

### 5. Gestão de Participantes

#### `src/pages/participants/ParticipantsList.tsx`
Lista de participantes com filtros, busca e controle de pagamentos.

#### `src/pages/public/EventRegistration.tsx`
Página pública para inscrição de participantes em eventos.

```typescript
// Exemplo do componente de formulário de inscrição
const EventRegistration = () => {
  const { eventId } = useParams();
  const [formData, setFormData] = useState({/* campos iniciais */});
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validar dados
    // Enviar inscrição
    // Processar pagamento
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Campos do formulário */}
    </form>
  );
};
```

#### `src/services/userService.ts`
Funções para manipulação de dados de usuário e participante.

### 6. Gestão de Quadras

#### `src/pages/courts/CourtsManagement.tsx`
Interface para gerenciamento de quadras esportivas.

#### `src/components/courts/CourtCalendar.tsx`
Calendário para visualização e agendamento de reservas de quadras.

### 7. Gestão Financeira

#### `src/pages/financial/FinancialOverview.tsx`
Dashboard financeiro com resumo de receitas, despesas e lucro.

#### `src/components/financials/FinancialEventBreakdown.tsx`
Análise financeira detalhada de eventos específicos.

```typescript
export const FinancialEventBreakdown: React.FC<FinancialEventBreakdownProps> = ({
  events,
  loading = false
}) => {
  // Ordenação, filtragem e exibição de dados financeiros
  // Cálculo de totais
  // Exportação de dados para CSV
  // Gráficos e visualizações
  
  return (
    <div>
      {/* Componentes de visualização financeira */}
    </div>
  );
};
```

### 8. Utilitários e Helpers

#### `src/utils/validation.ts`
Funções para validação de dados, como CPF e telefone.

```typescript
export function validateCPF(cpf: string): boolean {
  // Algoritmo de validação de CPF
}

export function formatCPF(cpf: string): string {
  // Formatação de CPF (XXX.XXX.XXX-XX)
}
```

#### `src/utils/formatters.ts`
Funções para formatação de diferentes tipos de dados.

```typescript
export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (date: string): string => {
  // Formatação de data
};
```

#### `src/utils/bracketUtils.ts`
Funções para cálculos relacionados a chaveamentos de torneios.

```typescript
export function calculateBracketPositions(numTeams: number): BracketPosition[] {
  // Lógica para posicionar equipes no chaveamento
}
```

## Fluxos Principais do Sistema

### 1. Autenticação e Controle de Acesso

1. Usuário acessa a aplicação (`index.html` → `main.tsx` → `App.tsx`)
2. `App.tsx` verifica se há uma sessão válida via `useAuthStore` e `supabase.ts`
3. Se não houver sessão, redireciona para `/login`
4. O componente `Login.tsx` processa o login via `authStore.signIn()`
5. Após login bem-sucedido, `authStore` atualiza o estado e redireciona para a página inicial
6. Rotas protegidas verificam o papel do usuário via `useAuth()` para determinar acesso

### 2. Criação de Eventos e Torneios

1. Administrador cria um evento via `EventForm.tsx`
2. Os dados são validados e enviados ao backend via `EventService.createEvent()`
3. Após criar o evento, o administrador pode adicionar um torneio
4. `TournamentService.generateTournamentStructure()` cria a estrutura inicial com grupos
5. Os participantes podem se inscrever via `EventRegistration.tsx`
6. Quando as inscrições fecham, o administrador inicia o torneio
7. Fase de grupos é gerada automaticamente
8. Após completar a fase de grupos, `TournamentService.generateEliminationBracket()` cria a fase eliminatória
9. O torneio continua até a final, com a atualização de resultados via `TournamentService.updateMatch()`

### 3. Fluxo de Inscrição e Pagamento

1. Usuário acessa formulário de inscrição via `/inscricao/:eventId`
2. Preenche dados pessoais e escolhe método de pagamento
3. Sistema registra participante no banco de dados
4. De acordo com o método de pagamento:
   - **PIX**: Gera código PIX e QR code para pagamento
   - **Cartão**: Integra com gateway de pagamento
   - **Outros**: Registra pendência para pagamento posterior
5. Após confirmação de pagamento, status é atualizado e participante é registrado no evento

### 4. Gerenciamento de Partidas

1. Partidas da fase de grupos são geradas automaticamente
2. Administrador agenda partidas associando-as a quadras e horários
3. Resultados são registrados e classificação é atualizada
4. Sistema calcula classificados para fase eliminatória
5. Chaveamento eliminatório é gerado automaticamente
6. Vencedores avançam até a final
7. Resultados são registrados para histórico e premiações

## Componentes de UI Reutilizáveis

### `src/components/ui/`

Esta pasta contém componentes de UI reutilizáveis que seguem um design system consistente:

- `Button.tsx`: Botões com diferentes variantes (primary, outline, danger)
- `Modal.tsx`: Componente modal para diálogos
- `Input.tsx`: Campos de formulário com validação integrada
- `Notification.tsx`: Sistema de notificações toast
- `LoadingSpinner.tsx`: Indicadores de carregamento
- `BlockDetector.tsx`: Detector de bloqueios de UI durante operações intensivas
- `ErrorBoundary.tsx`: Captura e exibe erros de forma amigável

## Integração com Supabase

O sistema utiliza o Supabase como serviço de backend, com os seguintes recursos:

### 1. Autenticação

```typescript
// Login com email e senha
const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  // Processar resposta
};
```

### 2. Operações no Banco de Dados

```typescript
// Exemplo de consulta
const fetchEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      organizers(*),
      participants(count)
    `)
    .order('date', { ascending: false });
  // Processar resposta
};
```

### 3. Armazenamento de Arquivos

```typescript
// Upload de banner para evento
const uploadBanner = async (file, eventId) => {
  const filePath = `events/${eventId}/banner.jpg`;
  const { data, error } = await supabase.storage
    .from('event-images')
    .upload(filePath, file);
  // Processar upload
};
```

## Gerenciamento de Estado

O sistema utiliza diferentes estratégias para gerenciamento de estado:

### 1. Estado Global com Zustand

```typescript
// Exemplo de store de configurações
export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'light',
  soundEnabled: true,
  language: 'pt-BR',
  
  setTheme: (theme) => set({ theme }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  setLanguage: (language) => set({ language }),
}));
```

### 2. Estado Local com React Hooks

```typescript
const EventDetail = () => {
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Lógica do componente usando esses estados
};
```

### 3. Dados em Cache e Memória

```typescript
// Memorização de cálculos intensivos
const memoizedRankings = useMemo(() => {
  return calculateComplexRankings(matches);
}, [matches]);
```

## Conclusão

O sistema Arena oferece uma plataforma completa para gerenciamento de eventos esportivos, com foco especial em torneios de Beach Tennis. Cada componente foi desenvolvido para funcionar de forma modular e integrada, permitindo flexibilidade e extensibilidade.

Para novos desenvolvedores, recomendamos começar pela estrutura de autenticação e gerenciamento de eventos, que forma a base do sistema. O uso extensivo de TypeScript garante que as conexões entre componentes sejam claras e bem documentadas.

