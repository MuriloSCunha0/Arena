import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Trophy, Users, Target, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

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

type Group = {
  id: string;
  name: string;
  teams: Team[];
  maxTeams: number;
};

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
  tournamentId: string; // Actually the eventId
  onComplete: (matches: Array<[string, string]>, groups: any) => void;
  onTeamsSaved?: (teams: Team[], groups: Group[]) => void;
  onClose?: () => void;
  speed?: number;
  saveRandomTeamsAndGroups: (eventId: string, teams: TeamData[], groups?: GroupData[], participants?: { id: string; name: string }[]) => Promise<void>;
}

export const TournamentWheelNew: React.FC<TournamentWheelProps> = ({
  participants,
  tournamentId,
  onComplete,
  onTeamsSaved,
  onClose,
  speed = 1,
  saveRandomTeamsAndGroups
}) => {
  // Estados principais
  const [spinning, setSpinning] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [currentPair, setCurrentPair] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [completed, setCompleted] = useState(false);
  const [step, setStep] = useState<'drawing' | 'saving' | 'completed'>('drawing');
  const [savingProgress, setSavingProgress] = useState<string>('');
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  
  // Refs para animação
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calcular configuração dos grupos
  const groupConfig = useMemo(() => {
    const teamCount = Math.floor(participants.length / 2);
    
    console.log('🏆 [groupConfig] Total participants:', participants.length);
    console.log('🏆 [groupConfig] Total teams:', teamCount);
    
    if (teamCount < 3) {
      return { groupCount: 1, groupSizes: [teamCount] };
    }
    
    // Distribuir grupos com 3-4 duplas cada
    const baseGroups = Math.floor(teamCount / 3);
    const remainder = teamCount % 3;
    
    let groupSizes: number[] = [];
    
    if (remainder === 0) {
      // Divisão perfeita: todos os grupos com 3 duplas
      groupSizes = Array(baseGroups).fill(3);
    } else if (remainder === 1) {
      // Sobra 1: último grupo fica com 4
      groupSizes = Array(baseGroups - 1).fill(3).concat([4]);
    } else if (remainder === 2) {
      // Sobra 2: dois últimos grupos ficam com 4
      if (baseGroups >= 2) {
        groupSizes = Array(baseGroups - 2).fill(3).concat([4, 4]);
      } else {
        groupSizes = [5]; // Exceção: 1 grupo com 5
      }
    }
    
    console.log('📊 [groupConfig] Group sizes:', groupSizes);
    return { groupCount: groupSizes.length, groupSizes };
  }, [participants.length]);

  // Participantes disponíveis
  const availableParticipants = useMemo(() => {
    return participants.filter(p => 
      !selectedParticipants.some(selected => selected.id === p.id)
    );
  }, [participants, selectedParticipants]);

  // Inicializar grupos vazios
  useEffect(() => {
    if (groups.length === 0 && groupConfig.groupCount > 0) {
      const initialGroups: Group[] = Array.from({ length: groupConfig.groupCount }, (_, i) => ({
        id: `group_${i + 1}`,
        name: `Grupo ${String.fromCharCode(65 + i)}`,
        teams: [],
        maxTeams: groupConfig.groupSizes[i]
      }));
      setGroups(initialGroups);
      console.log('🆕 [useEffect] Created initial groups:', initialGroups.map(g => `${g.name} (max: ${g.maxTeams})`));
    }
  }, [groupConfig, groups.length]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
    };
  }, []);

  // Função para sortear um participante
  const performDraw = useCallback(() => {
    if (spinning || availableParticipants.length === 0) {
      console.log('⚠️ Cannot perform draw: spinning =', spinning, 'available =', availableParticipants.length);
      return;
    }
    
    setSpinning(true);
    
    // Selecionar participante aleatório
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    const selectedParticipant = availableParticipants[randomIndex];
    
    console.log('🎲 Selected participant:', selectedParticipant.name);
    
    // Animar roleta
    if (wheelRef.current) {
      const totalSpins = 5;
      const selectedIndex = availableParticipants.findIndex(p => p.id === selectedParticipant.id);
      const finalRotation = totalSpins * 360 + (selectedIndex * (360 / availableParticipants.length));
      wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
    }
    
    // Processar seleção após animação
    spinTimeout.current = setTimeout(() => {
      processParticipantSelection(selectedParticipant);
    }, 3000 / speed);
  }, [availableParticipants, spinning, speed]);

  // Processar seleção de participante
  const processParticipantSelection = useCallback((selectedParticipant: Participant) => {
    console.log('🎯 Processing selection:', selectedParticipant.name);
    
    // Adicionar à lista de selecionados
    setSelectedParticipants(prev => [...prev, selectedParticipant]);
    
    // Atualizar par atual
    setCurrentPair(prev => {
      const newPair = [...prev, selectedParticipant];
      console.log('👥 Current pair size:', newPair.length);
      
      if (newPair.length === 2) {
        // Formar nova dupla
        const newTeam: Team = {
          id: `team_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          name: newPair.map(p => p.name).join(' & '),
          participants: newPair.map(p => p.id),
          created_at: new Date().toISOString(),
          event_id: tournamentId
        };
        
        console.log('🏆 Created team:', newTeam.name);
        setTeams(prevTeams => [...prevTeams, newTeam]);
        
        // Adicionar ao grupo apropriado
        addTeamToGroup(newTeam);
        
        // Continuar sorteio se há mais participantes
        setTimeout(() => {
          if (availableParticipants.length > 2) { // -2 porque acabamos de selecionar 2
            performDraw();
          } else if (availableParticipants.length === 1) {
            // Participante ímpar sobrou
            console.log('⚠️ Odd participant remaining:', availableParticipants[0]?.name);
            setSelectedParticipants(prev => [...prev, availableParticipants[0]]);
            finalizeDraw();
          } else {
            finalizeDraw();
          }
        }, 1000);
        
        return []; // Reset do par
      }
      
      // Continuar sorteio para formar a dupla
      setTimeout(() => {
        if (availableParticipants.length > 1) { // -1 porque acabamos de selecionar 1
          performDraw();
        }
      }, 1000);
      
      return newPair;
    });
    
    setSpinning(false);
  }, [availableParticipants, tournamentId, performDraw]);

  // Adicionar time ao grupo apropriado
  const addTeamToGroup = useCallback((newTeam: Team) => {
    setGroups(prev => {
      const updatedGroups = [...prev];
      
      // Encontrar o primeiro grupo que não está cheio
      for (let i = 0; i < updatedGroups.length; i++) {
        if (updatedGroups[i].teams.length < updatedGroups[i].maxTeams) {
          updatedGroups[i].teams.push(newTeam);
          console.log(`✅ Added team "${newTeam.name}" to ${updatedGroups[i].name} (${updatedGroups[i].teams.length}/${updatedGroups[i].maxTeams})`);
          break;
        }
      }
      
      return updatedGroups;
    });
  }, []);

  // Iniciar processo de sorteio
  const startDraw = useCallback(() => {
    if (!isDrawingActive && availableParticipants.length > 0) {
      console.log('🚀 Starting draw process');
      setIsDrawingActive(true);
      performDraw();
    }
  }, [isDrawingActive, availableParticipants.length, performDraw]);

  // Finalizar sorteio e salvar
  const finalizeDraw = useCallback(async () => {
    console.log('🏁 Finalizing draw...');
    setStep('saving');
    setSavingProgress('Preparando dados para salvamento...');
    
    try {
      // Converter teams para formato do serviço
      const teamsData: TeamData[] = teams.map(team => {
        const participant1 = participants.find(p => p.id === team.participants[0]);
        const participant2 = participants.find(p => p.id === team.participants[1]);
        
        return {
          participant1_name: participant1?.name || 'Participante 1',
          participant2_name: participant2?.name || 'Participante 2',
          court_name: 'Quadra TBD'
        };
      });

      // Converter groups para formato do serviço
      const groupsData: GroupData[] = groups.map(group => ({
        name: group.name,
        teams: group.teams.map(team => {
          const participant1 = participants.find(p => p.id === team.participants[0]);
          const participant2 = participants.find(p => p.id === team.participants[1]);
          
          return {
            participant1_name: participant1?.name || 'Participante 1',
            participant2_name: participant2?.name || 'Participante 2',
            court_name: 'Quadra TBD'
          };
        })
      }));
      
      console.log('📊 Teams data:', teamsData.length, 'teams');
      console.log('🏆 Groups data:', groupsData.length, 'groups');
      
      setSavingProgress('Salvando no banco de dados...');
      
      // Preparar participantes para o serviço
      const participantsForService = participants.map(p => ({
        id: p.id,
        name: p.name
      }));
      
      // Salvar no banco
      await saveRandomTeamsAndGroups(tournamentId, teamsData, groupsData, participantsForService);
      
      setSavingProgress('Dados salvos com sucesso!');
      
      setTimeout(() => {
        setStep('completed');
        setCompleted(true);
        
        // Confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        // Callbacks
        if (onTeamsSaved) {
          onTeamsSaved(teams, groups);
        }
        
        const matches = teams.map(team => [
          team.participants[0],
          team.participants[1]
        ]) as Array<[string, string]>;
        
        onComplete(matches, {});
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error saving:', error);
      setSavingProgress('Erro ao salvar dados. Tente novamente.');
      setTimeout(() => {
        setStep('drawing');
        setSavingProgress('');
      }, 3000);
    }
  }, [teams, groups, participants, tournamentId, saveRandomTeamsAndGroups, onTeamsSaved, onComplete]);

  // Reset do sorteio
  const resetDraw = useCallback(() => {
    if (spinTimeout.current) clearTimeout(spinTimeout.current);
    
    setSelectedParticipants([]);
    setCurrentPair([]);
    setTeams([]);
    setSpinning(false);
    setIsDrawingActive(false);
    setCompleted(false);
    setStep('drawing');
    setSavingProgress('');
    
    // Recriar grupos vazios
    const initialGroups: Group[] = Array.from({ length: groupConfig.groupCount }, (_, i) => ({
      id: `group_${i + 1}`,
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      teams: [],
      maxTeams: groupConfig.groupSizes[i]
    }));
    setGroups(initialGroups);
    
    console.log('🔄 Draw reset completed');
  }, [groupConfig]);

  // Renderizar roleta
  const renderWheel = () => (
    <div className="relative w-[480px] h-[480px] mx-auto">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-200 via-blue-200 to-indigo-200 shadow-2xl"></div>
      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 shadow-inner"></div>
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-white via-purple-50 to-blue-50"></div>
      
      {/* Indicador/seta */}
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="relative">
          <div className="absolute top-1 left-0 w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-t-[40px] border-t-black/20 filter blur-sm"></div>
          <div className="w-0 h-0 border-l-[24px] border-l-transparent border-r-[24px] border-r-transparent border-t-[40px] border-t-red-500"></div>
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[34px] border-t-white"></div>
        </div>
      </div>
      
      {/* Roleta principal */}
      <div 
        ref={wheelRef}
        className={`relative w-full h-full rounded-full border-10 border-white shadow-2xl transition-transform duration-3000 ease-out overflow-hidden ${spinning ? 'animate-spin' : ''}`}
        style={{ 
          background: `conic-gradient(${availableParticipants.map((_, i) => {
            const colors = [
              '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C', '#6B48FF', 
              '#FF8A80', '#81C784', '#64B5F6', '#FFB74D', '#F06292', '#9575CD'
            ];
            return colors[i % colors.length];
          }).join(', ')})`,
          boxShadow: '0 0 60px rgba(0,0,0,0.4), inset 0 0 40px rgba(255,255,255,0.4)'
        }}
      >
        {/* Centro da roleta */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-br from-white to-gray-100 rounded-full shadow-xl border-4 border-gray-200 flex items-center justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full shadow-inner"></div>
        </div>
        
        {/* Linhas divisórias */}
        {availableParticipants.map((_, index) => {
          const angle = (360 / availableParticipants.length) * index;
          return (
            <div
              key={`line-${index}`}
              className="absolute w-1 bg-white/50 origin-bottom shadow-lg"
              style={{
                height: '220px',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -100%) rotate(${angle}deg)`,
              }}
            />
          );
        })}
      </div>
      
      {/* Contador de participantes */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border-2 border-gray-200">
          <span className="text-base font-bold text-gray-700">
            {availableParticipants.length} restantes
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-auto z-[9999]">
      <div className="w-full min-h-screen p-6 flex flex-col max-w-none">
        {/* Header */}
        {onClose && (
          <div className="flex justify-end mb-4 flex-shrink-0">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="grid lg:grid-cols-[1fr_400px] gap-6 flex-1 min-h-0 max-w-none pb-6">
          {/* Área principal da roleta */}
          <div className="flex flex-col min-h-0">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-bold text-gray-800 mb-2">
                Sorteio de Duplas
              </h2>
              <p className="text-gray-600">
                {step === 'drawing' ? 'Formando duplas aleatoriamente' : 
                 step === 'saving' ? 'Salvando resultados...' : 
                 'Sorteio concluído!'}
              </p>
            </div>

            {/* Área da roleta */}
            <div className="flex-1 flex items-center justify-center">
              {step === 'drawing' ? renderWheel() : (
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {step === 'saving' ? '💾' : '🏆'}
                  </div>
                  <p className="text-xl text-gray-600">
                    {savingProgress || 'Sorteio finalizado!'}
                  </p>
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="flex justify-center space-x-4 mt-6">
              {step === 'drawing' && (
                <>
                  <button
                    onClick={startDraw}
                    disabled={spinning || isDrawingActive || availableParticipants.length === 0}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Target size={20} />
                    <span>
                      {selectedParticipants.length === 0 ? 'Iniciar Sorteio' : 'Continuar Sorteio'}
                    </span>
                  </button>
                  
                  <button
                    onClick={resetDraw}
                    className="flex items-center space-x-2 px-4 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    <RotateCcw size={20} />
                    <span>Reiniciar</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sidebar com informações */}
          <div className="flex flex-col space-y-4 min-h-0 max-h-[calc(100vh-8rem)]">
            {/* Par atual */}
            {currentPair.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-bold text-lg mb-2 flex items-center">
                  <Users size={20} className="mr-2 text-purple-600" />
                  Par Atual
                </h3>
                <div className="space-y-2">
                  {currentPair.map((participant) => (
                    <div key={participant.id} className="bg-purple-50 rounded p-2">
                      <span className="font-medium">{participant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grupos */}
            <div className="bg-white rounded-lg shadow-lg p-4 flex-1 min-h-0">
              <h3 className="font-bold text-lg mb-3 flex items-center">
                <Trophy size={20} className="mr-2 text-yellow-600" />
                Grupos Formados
              </h3>
              <div className="overflow-y-auto max-h-60">
                {groups.length > 0 ? (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <div 
                        key={group.id} 
                        className="border-2 rounded-lg p-3 border-gray-200 bg-gray-50"
                      >
                        <div className="font-bold mb-2 text-center text-gray-800">
                          {group.name}
                        </div>
                        
                        <div className="space-y-1">
                          {/* Times no grupo */}
                          {group.teams.map((team) => {
                            const participant1 = participants.find(p => p.id === team.participants[0]);
                            const participant2 = participants.find(p => p.id === team.participants[1]);
                            
                            return (
                              <div key={team.id} className="bg-white rounded p-2 border border-gray-200">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="font-medium text-sm">
                                    {participant1?.name} & {participant2?.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Slots vazios */}
                          {Array.from({ length: group.maxTeams - group.teams.length }).map((_, index) => (
                            <div key={`empty-${group.id}-${index}`} className="bg-white rounded p-2 border-2 border-dashed border-gray-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                <span className="text-gray-400 italic text-sm">Aguardando dupla...</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Progresso */}
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Progresso: {group.teams.length}/{group.maxTeams} duplas</span>
                            <span className="text-xs">
                              {group.teams.length >= group.maxTeams ? '✅ Completo' : '⏳ Aguardando'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${
                                group.teams.length >= group.maxTeams ? 'bg-green-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${(group.teams.length / group.maxTeams) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">Grupos serão criados automaticamente</p>
                )}
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-lg mb-2">Resumo</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Total de participantes: {participants.length}</div>
                <div>Duplas formadas: {teams.length}</div>
                <div>Grupos: {groupConfig.groupCount}</div>
                <div>Distribuição: {groupConfig.groupSizes.join(', ')} duplas por grupo</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de conclusão */}
      {completed && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg mx-4 text-center">
            <div className="mb-6">
              <Trophy size={64} className="text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sorteio Concluído!
              </h2>
              <p className="text-gray-600">
                Todas as duplas foram formadas e organizadas em grupos.
              </p>
            </div>
            
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
