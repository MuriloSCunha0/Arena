import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PlayCircle, Pause, Trophy, Users, Database, Check, Grid, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '../ui/Button';

// Tipos de dados
type Participant = {
  id: string;
  name: string;
  email?: string;
};

type Team = {
  id: string;
  name: string;
  participants: string[];
  created_at?: string;
  event_id?: string;
};

type ExtendedGroup = {
  id: string;
  name: string;
  teams: string[];
};

type DrawMethod = 'wheel' | 'cards' | 'list';

type TeamData = {
  participant1_name: string;
  participant2_name: string;
  court_name: string;
};

type GroupData = {
  name: string;
  teams: TeamData[];
};

interface TournamentWheelProps {
  participants: Participant[];
  tournamentId: string; // Actually the eventId - used to find the tournament in the database
  onComplete: (matches: Array<[string, string]>, groups: any) => void;
  onTeamsSaved?: (teams: Team[], groups: ExtendedGroup[]) => void;
  onClose?: () => void;
  speed?: number;
  saveRandomTeamsAndGroups: (eventId: string, teams: TeamData[], groups?: GroupData[], participants?: { id: string; name: string }[]) => Promise<void>;
  isReset?: boolean; // Flag para indicar se é um reset de torneio existente
}

// Lógica de configuração de grupo mais robusta
const getGroupConfiguration = (teamCount: number) => {
  console.log(`[getGroupConfiguration] Calculando para ${teamCount} duplas.`);

  if (teamCount <= 0) {
    return { groupCount: 0, groupSizes: [] };
  }

  // A regra é "nunca menos de 3", mas se houver apenas 2 duplas, elas devem jogar.
  // Para 1, 2, 3, 4, 5 duplas, todas vão para um único grupo.
  if (teamCount <= 5) {
    console.log(`[getGroupConfiguration] ${teamCount} duplas -> 1 grupo de ${teamCount}`);
    return { groupCount: 1, groupSizes: [teamCount] };
  }

  // Para teamCount > 5, o objetivo é grupos de 3 e 4.
  // A estratégia é usar o máximo de grupos de 3 possível e usar grupos de 4 para lidar com os restos.
  const remainder = teamCount % 3;
  let numGroupsOf4 = 0;

  if (remainder === 1) {
    // ex: 7 = 4 + 3; 10 = 4 + 3 + 3
    numGroupsOf4 = 1;
  } else if (remainder === 2) {
    // ex: 8 = 4 + 4; 11 = 4 + 4 + 3
    numGroupsOf4 = 2;
  }

  const remainingTeams = teamCount - (numGroupsOf4 * 4);
  const numGroupsOf3 = remainingTeams / 3;

  const groupSizes = [
    ...Array(numGroupsOf4).fill(4),
    ...Array(numGroupsOf3).fill(3),
  ];

  console.log(`[getGroupConfiguration] ${teamCount} duplas -> ${numGroupsOf4} grupos de 4, ${numGroupsOf3} grupos de 3. Tamanhos: [${groupSizes.join(', ')}]`);

  return { groupCount: groupSizes.length, groupSizes };
};

export const TournamentWheel: React.FC<TournamentWheelProps> = ({
  participants,
  tournamentId,
  onComplete,
  onTeamsSaved,
  onClose,
  speed = 1,
  saveRandomTeamsAndGroups,
  isReset = false
}) => {
  // Estados principais
  const [spinning, setSpinning] = useState(false);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<ExtendedGroup[]>([]);
  const [currentPair, setCurrentPair] = useState<Participant[]>([]);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState<'drawing' | 'saving' | 'completed'>('drawing');
  const [savingProgress, setSavingProgress] = useState<string>('');
  const [drawMethod, setDrawMethod] = useState<DrawMethod>('wheel');
  const [isDrawingActive, setIsDrawingActive] = useState(false);

  // Refs para animação e timeouts
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimeout = useRef<NodeJS.Timeout | null>(null);

  // Determinar método de sorteio baseado no número de participantes
  useEffect(() => {
    const participantCount = participants.length;
    if (participantCount <= 20) {
      setDrawMethod('wheel');
    } else if (participantCount <= 100) {
      setDrawMethod('cards');
    } else {
      setDrawMethod('list');
    }
  }, [participants.length]);

  const teamCount = useMemo(() => Math.floor(participants.length / 2), [participants.length]);
  const groupConfig = useMemo(() => getGroupConfiguration(teamCount), [teamCount]);

  const availableParticipants = useMemo(() => {
    return participants.filter(p => !selectedParticipants.some(sp => sp.id === p.id));
  }, [participants, selectedParticipants]);

  // Efeitos sonoros (placeholders)
  const playTickSound = () => { /* Lógica do som */ };
  const playSuccessSound = () => { /* Lógica do som */ };

  // Cleanup
  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
    };
  }, []);

  const handleStartDraw = () => {
    if (availableParticipants.length < 2) return;
    setIsDrawingActive(true);
  };

  const handlePauseDraw = () => {
    setIsDrawingActive(false);
    setSpinning(false);
    if (spinTimeout.current) clearTimeout(spinTimeout.current);
  };

  // Função para animar a roleta
  const animateWheel = (availableList: Participant[], selected: Participant) => {
    if (!wheelRef.current) return;
    const selectedIndex = availableList.findIndex(p => p.id === selected.id);
    if (selectedIndex === -1) return;

    const totalSpins = 5;
    const finalRotation = totalSpins * 360 - (selectedIndex * (360 / availableList.length));
    wheelRef.current.style.transition = `transform ${3000 / speed}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
  };

  // Finalizar sorteio e salvar no banco
  const finalizeDraw = useCallback(async () => {
    setStep('saving');
    setSavingProgress('Preparando dados para salvamento...');

    try {
      console.log('🔄 [finalizeDraw] Iniciando processo de salvamento');

      const teamsData: TeamData[] = teams.map((team) => {
        const p1 = participants.find(p => p.id === team.participants[0]);
        const p2 = participants.find(p => p.id === team.participants[1]);
        return {
          participant1_name: p1?.name || 'N/A',
          participant2_name: p2?.name || 'N/A',
          court_name: 'A definir'
        };
      });

      const groupsData: GroupData[] = groups.map(group => ({
        name: group.name,
        teams: group.teams.map(teamId => {
          const team = teams.find(t => t.id === teamId);
          if (!team) return { participant1_name: '', participant2_name: '', court_name: '' };
          const p1 = participants.find(p => p.id === team.participants[0]);
          const p2 = participants.find(p => p.id === team.participants[1]);
          return {
            participant1_name: p1?.name || 'N/A',
            participant2_name: p2?.name || 'N/A',
            court_name: ''
          };
        })
      }));

      console.log('📊 [finalizeDraw] Dados das duplas preparados:', teamsData.length);
      console.log('🏆 [finalizeDraw] Dados dos grupos preparados:', groupsData.length);

      setSavingProgress('Salvando duplas e grupos no banco de dados...');
      const participantsForService = participants.map(p => ({ id: p.id, name: p.name }));
      await saveRandomTeamsAndGroups(tournamentId, teamsData, groupsData, participantsForService);

      console.log('✅ [finalizeDraw] Salvo com sucesso');
      setSavingProgress('Dados salvos com sucesso!');

      setTimeout(() => {
        setStep('completed');
        setCompleted(true);
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        if (onTeamsSaved) onTeamsSaved(teams, groups);
        if (onComplete) {
            const matches = teams.map(team => [team.participants[0], team.participants[1]] as [string, string]);
            onComplete(matches, groups);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ [finalizeDraw] Erro ao salvar:', error);
      setSavingProgress(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setStep('drawing'); // Volta para a tela de sorteio para permitir nova tentativa
    }
  }, [teams, groups, participants, tournamentId, saveRandomTeamsAndGroups, onTeamsSaved, onComplete]);

  // Loop principal de sorteio, acionado por useEffect
  useEffect(() => {
    // Condições para parar o loop
    if (!isDrawingActive || spinning) {
      return;
    }

    // Verifica se o sorteio terminou
    if (availableParticipants.length < 2 && currentPair.length === 0) {
      console.log('🏁 Sorteio finalizado, não há participantes suficientes para formar uma dupla.');
      setIsDrawingActive(false);
      if (availableParticipants.length === 1) {
        // Lida com o participante que sobrou
        setSelectedParticipants(prev => [...prev, availableParticipants[0]]);
      }
      setTimeout(() => finalizeDraw(), 1000);
      return;
    }

    // Se temos uma dupla, cria a equipe
    if (currentPair.length === 2) {
      const newTeamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newTeam: Team = {
        id: newTeamId,
        name: currentPair.map(p => p.name).join(' & '),
        participants: currentPair.map(p => p.id),
        event_id: tournamentId,
      };

      // Atualiza estado das duplas e grupos de forma funcional
      setTeams(prevTeams => {
        const updatedTeams = [...prevTeams, newTeam];
        
        // Organiza em grupos com base no novo estado das duplas
        setGroups(prevGroups => {
          const currentTeamCount = updatedTeams.length;
          let groupIndex = 0;
          let teamsProcessed = 0;

          // Encontra a qual grupo esta nova dupla pertence
          for (let i = 0; i < groupConfig.groupSizes.length; i++) {
            const groupSize = groupConfig.groupSizes[i];
            if (currentTeamCount > teamsProcessed + groupSize) {
              teamsProcessed += groupSize;
              groupIndex++;
            } else {
              break;
            }
          }

          const newGroups = [...prevGroups];
          // Garante que o grupo exista
          if (!newGroups[groupIndex]) {
            newGroups[groupIndex] = {
              id: `group_${groupIndex + 1}_${Date.now()}`,
              name: `Grupo ${String.fromCharCode(65 + groupIndex)}`,
              teams: [],
            };
          }
          
          // Adiciona a dupla ao grupo correto
          if (!newGroups[groupIndex].teams.includes(newTeam.id)) {
            newGroups[groupIndex].teams.push(newTeam.id);
          }
          
          return newGroups;
        });

        return updatedTeams;
      });

      setCurrentPair([]); // Reseta a dupla
      playSuccessSound();
      // O loop continuará na próxima renderização porque isDrawingActive ainda é true
      return;
    }

    // Se precisarmos sortear um participante para a dupla
    if (currentPair.length < 2 && availableParticipants.length > 0) {
      setSpinning(true);
      playTickSound();

      const randomIndex = Math.floor(Math.random() * availableParticipants.length);
      const selected = availableParticipants[randomIndex];
      setCurrentParticipant(selected);

      let animationTime = 1000 / speed;
      if (drawMethod === 'wheel') {
        animateWheel(availableParticipants, selected);
        animationTime = 3000 / speed;
      }

      spinTimeout.current = setTimeout(() => {
        setSelectedParticipants(prev => [...prev, selected]);
        setCurrentPair(prev => [...prev, selected]);
        setSpinning(false);
        // O loop continuará na próxima renderização
      }, animationTime);
    }
  }, [isDrawingActive, spinning, availableParticipants, currentPair, groupConfig, finalizeDraw, speed, drawMethod, tournamentId]);

  // Renderização
  const renderWheel = () => {
    const numParticipants = availableParticipants.length;
    const wheelSize = 300;
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#D7BDE2'
    ];

    // Criar a string do conic-gradient
    const gradientColors = availableParticipants.map((_, i) => {
      const color = colors[i % colors.length];
      const startAngle = (i / numParticipants) * 360;
      const endAngle = ((i + 1) / numParticipants) * 360;
      return `${color} ${startAngle}deg ${endAngle}deg`;
    }).join(', ');

    return (
      <div 
        className="relative flex items-center justify-center"
        style={{ width: `${wheelSize}px`, height: `${wheelSize}px` }}
      >
        {/* Ponteiro/Indicador no topo */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-400 z-10"></div>
        
        <div
          ref={wheelRef}
          className="w-full h-full transition-transform rounded-full"
          style={{ 
            transition: `transform 3000ms cubic-bezier(0.25, 1, 0.5, 1)`,
            background: `conic-gradient(${gradientColors})`,
            border: '4px solid #4A5568', // gray-700
            boxShadow: '0 0 15px rgba(0,0,0,0.5)'
          }}
        >
          {/* Círculo central para cobrir o meio */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 rounded-full border-4 border-gray-700"
            style={{ width: '60px', height: '60px' }}
          ></div>
        </div>
      </div>
    );
  };

  const renderCards = () => (
    <div className="grid grid-cols-5 md:grid-cols-8 gap-2 p-4 max-h-96 overflow-y-auto">
      {availableParticipants.map(p => (
        <div key={p.id} className={`p-2 border rounded-lg text-center ${currentParticipant?.id === p.id ? 'bg-yellow-400 animate-pulse' : 'bg-gray-700'}`}>
          {p.name}
        </div>
      ))}
    </div>
  );

  const renderList = () => (
    <div className="w-full max-h-96 overflow-y-auto p-4 border rounded-lg">
      <ul>
        {availableParticipants.map(p => (
          <li key={p.id} className={`p-2 ${currentParticipant?.id === p.id ? 'bg-yellow-400' : ''}`}>
            {p.name}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderContent = () => {
    switch (drawMethod) {
      case 'wheel': return renderWheel();
      case 'cards': return renderCards();
      case 'list': return renderList();
      default: return null;
    }
  };

  const renderSidebar = () => (
    <div className="w-full md:w-1/3 bg-gray-800 p-4 rounded-lg overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <h3 className="text-xl font-bold mb-4 text-white">Grupos e Duplas</h3>
      {groups.map((group, index) => (
        <div key={group.id} className="mb-4 p-3 bg-gray-700 rounded-lg">
          <h4 className="font-bold text-yellow-400">{group.name} ({group.teams.length}/{groupConfig.groupSizes[index] || 'N/A'} duplas)</h4>
          <ul className="list-disc list-inside text-gray-300">
            {group.teams.map(teamId => {
              const team = teams.find(t => t.id === teamId);
              return <li key={teamId}>{team ? team.name : 'Carregando...'}</li>;
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  if (completed) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 text-white">
        <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full">
          <Trophy className="w-24 h-24 mx-auto text-yellow-400 animate-bounce" />
          <h2 className="text-4xl font-bold mt-6 mb-4">
            {isReset ? 'Novo Sorteio Concluído!' : 'Sorteio Concluído!'}
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            {isReset 
              ? 'As duplas e grupos foram reformulados e salvos com sucesso.' 
              : 'As duplas e grupos foram formados e salvos com sucesso.'}
          </p>
          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <div className="flex justify-around">
              <div className="text-center">
                <Users className="w-8 h-8 mx-auto text-blue-400" />
                <p className="mt-2 font-bold text-2xl">{teams.length}</p>
                <p className="text-sm text-gray-500">Duplas Formadas</p>
              </div>
              <div className="text-center">
                <Grid className="w-8 h-8 mx-auto text-green-400" />
                <p className="mt-2 font-bold text-2xl">{groups.length}</p>
                <p className="text-sm text-gray-500">Grupos Criados</p>
              </div>
            </div>
          </div>
          <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
            <Check className="mr-2" /> Fechar e ver Chaveamento
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'saving') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 text-white">
        <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
          <Database className="w-20 h-20 mx-auto text-blue-400 animate-spin" />
          <h2 className="text-3xl font-bold mt-6 mb-4">Salvando...</h2>
          <p className="text-gray-400">{savingProgress}</p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-6">
            <div className="bg-blue-600 h-2.5 rounded-full w-1/2 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50 text-white p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
        <X size={28} />
      </button>

      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-6">
        {/* Coluna Esquerda - Sorteio */}
        <div className="w-full md:w-2/3 flex flex-col items-center justify-center bg-gray-900 p-6 rounded-2xl shadow-lg">
          <div className="relative flex items-center justify-center mb-6" style={{ minHeight: '350px' }}>
            {drawMethod === 'wheel' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-16 border-l-transparent border-r-transparent border-t-yellow-400"></div>}
            {renderContent()}
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-400">Sorteando:</p>
            <p className="text-3xl font-bold text-yellow-400 h-10">
              {currentParticipant ? currentParticipant.name : '...'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={isDrawingActive ? handlePauseDraw : handleStartDraw} disabled={availableParticipants.length < 2 && currentPair.length === 0}
              className={`px-8 py-4 text-xl rounded-full flex items-center gap-2 transition-all duration-300 ${isDrawingActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
              {isDrawingActive ? <><Pause /> Pausar</> : <><PlayCircle /> Iniciar Sorteio</>}
            </Button>
            <Button onClick={() => finalizeDraw()} disabled={teams.length === 0}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full flex items-center gap-2">
              <Trophy /> Finalizar e Salvar
            </Button>
          </div>
        </div>

        {/* Coluna Direita - Grupos */}
        {renderSidebar()}
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-4 text-center text-gray-500">
        <p>Total de Participantes: {participants.length} | Duplas a serem formadas: {teamCount} | Progresso: {selectedParticipants.length}/{participants.length}</p>
        <div className="w-64 bg-gray-700 rounded-full h-2.5 mx-auto mt-2">
          <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${(selectedParticipants.length / participants.length) * 100}%` }}></div>
        </div>
      </div>
    </div>
  );
};
