import React, { useState } from 'react';
import { TournamentWheel } from '../components/events/TournamentWheel';
import { Participant, Court, Team, Group } from '../types';

// Exemplo de como usar o TournamentWheel integrado com banco de dados
export const ExampleTournamentPage: React.FC = () => {
  const tournamentId = 'tournament-123';

  const [participants] = useState<Participant[]>([
    { 
      id: '1', 
      name: 'João Silva',
      eventId: tournamentId,
      cpf: '111.111.111-11',
      phone: '(85) 99999-1111',
      email: 'joao@email.com',
      userId: 'user-1',
      partnerId: null,
      paymentStatus: 'CONFIRMED',
      registeredAt: new Date().toISOString()
    },
    { 
      id: '2', 
      name: 'Maria Santos',
      eventId: tournamentId,
      cpf: '222.222.222-22',
      phone: '(85) 99999-2222',
      email: 'maria@email.com',
      userId: 'user-2',
      partnerId: null,
      paymentStatus: 'CONFIRMED',
      registeredAt: new Date().toISOString()
    },
    { 
      id: '3', 
      name: 'Carlos Oliveira',
      eventId: tournamentId,
      cpf: '333.333.333-33',
      phone: '(85) 99999-3333',
      email: 'carlos@email.com',
      userId: 'user-3',
      partnerId: null,
      paymentStatus: 'CONFIRMED',
      registeredAt: new Date().toISOString()
    },
    { 
      id: '4', 
      name: 'Ana Costa',
      eventId: tournamentId,
      cpf: '444.444.444-44',
      phone: '(85) 99999-4444',
      email: 'ana@email.com',
      userId: 'user-4',
      partnerId: null,
      paymentStatus: 'CONFIRMED',
      registeredAt: new Date().toISOString()
    },
    { 
      id: '5', 
      name: 'Pedro Lima',
      eventId: tournamentId,
      cpf: '555.555.555-55',
      phone: '(85) 99999-5555',
      email: 'pedro@email.com',
      userId: 'user-5',
      partnerId: null,
      paymentStatus: 'CONFIRMED',
      registeredAt: new Date().toISOString()
    },
    { 
      id: '6', 
      name: 'Julia Ferreira',
      eventId: tournamentId,
      cpf: '666.666.666-66',
      phone: '(85) 99999-6666',
      email: 'julia@email.com',
      userId: 'user-6',
      partnerId: null,
      paymentStatus: 'CONFIRMED',
      registeredAt: new Date().toISOString()
    },
  ]);

  const [courts] = useState<Court[]>([
    { 
      id: 'court-1', 
      name: 'Quadra Central',
      location: 'Arena Central',
      type: 'BEACH_TENNIS',
      status: 'AVAILABLE',
      indoor: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    { 
      id: 'court-2', 
      name: 'Quadra 2',
      location: 'Arena Lateral',
      type: 'BEACH_TENNIS',
      status: 'AVAILABLE',
      indoor: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    { 
      id: 'court-3', 
      name: 'Quadra 3',
      location: 'Arena Sul',
      type: 'BEACH_TENNIS',
      status: 'AVAILABLE',
      indoor: false,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
  ]);

  const handleComplete = (matches: Array<[string, string]>, courtAssignments: Record<string, string>) => {
    console.log('Sorteio concluído!');
    console.log('Partidas:', matches);
    console.log('Atribuições de quadras:', courtAssignments);
    
    // Aqui você pode implementar lógica adicional como:
    // - Navegação para outra página
    // - Atualização de estado global
    // - Notificações para usuários
  };

  const handleTeamsSaved = (teams: Team[], groups: Group[]) => {
    console.log('Times salvos no banco de dados!');
    console.log('Times:', teams);
    console.log('Grupos:', groups);
    
    // Aqui você pode implementar lógica como:
    // - Mostrar toast de sucesso
    // - Atualizar cache local
    // - Sincronizar com outros componentes
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Torneio de Beach Tennis - Sorteio de Duplas
      </h1>
      
      <TournamentWheel
        participants={participants}
        courts={courts}
        tournamentId={tournamentId}
        onComplete={handleComplete}
        onTeamsSaved={handleTeamsSaved}
        autoPlay={true}
        speed={1.2}
      />
      
      <div className="mt-8 text-center text-gray-600">
        <p>
          O sorteio será automaticamente salvo no banco de dados quando concluído.
        </p>
        <p className="text-sm mt-2">
          Times e atribuições de quadras serão armazenados nas tabelas test_teams e test_groups.
        </p>
      </div>
    </div>
  );
};

export default ExampleTournamentPage;
