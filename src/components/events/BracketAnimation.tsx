import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import {
  PlayCircle,
  Pause,
  SkipForward,
  RotateCw,
  Users,
  Zap,
  Award,
  MapPin
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Participant, Court } from '../../types';

// Import the metadata interface from TournamentRandomizer
import { TournamentMetadata } from './TournamentRandomizer';
import { createTournamentStructure } from '../../utils/groupFormationUtils';

interface BracketAnimationProps {
  participants: Participant[];
  courts: Court[];
  onComplete: (
    teams: Array<[string, string]>,
    courtAssignments: Record<string, string[]>,
    metadata?: TournamentMetadata
  ) => void | Promise<void>;
  autoPlay?: boolean;
  speed?: number;
}

// First, create a type to represent a pair with group information
interface PairWithGroup {
  participants: [Participant, Participant];
  groupNumber?: number; // Optional group number
  side?: 'left' | 'right'; // Side of the bracket (left or right)
}

export const BracketAnimation: React.FC<BracketAnimationProps> = ({
  participants,
  courts,
  onComplete,
  autoPlay = false,
  speed = 1
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const selectedNameRef = useRef<HTMLDivElement>(null);
  // Estados
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentStep, setCurrentStep] = useState<'pairing' | 'grouping' | 'courting'>('pairing');
  const [formedPairs, setFormedPairs] = useState<PairWithGroup[]>([]);
  const [groups, setGroups] = useState<Array<Array<[Participant, Participant]>>>([]);
  const [courtAssignmentsInternal, setCourtAssignmentsInternal] = useState<Record<string, Court>>({});
  const [currentPairing, setCurrentPairing] = useState<[Participant | null, Participant | null]>([null, null]);
  const [spinning, setSpinning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);

  // Copia dos participantes para sorteio
  const [remainingParticipants, setRemainingParticipants] = useState<Participant[]>([]);
  // Adicionar estado para as quadras restantes
  const [remainingCourts, setRemainingCourts] = useState<Court[]>([]);

  // Animação
  const spinTimeout = useRef<NodeJS.Timeout | null>(null);
  const continuousTimeout = useRef<NodeJS.Timeout | null>(null);
  const spinDuration = 3000 / (speed || 1);
  const pauseDuration = 1500 / (speed || 1);
  
  // Calcula número ótimo de segmentos com base no número de participantes
  const segmentCount = Math.max(8, Math.min(36, remainingParticipants.length));
  const segmentAngle = 360 / segmentCount;

  // Cores para segmentos da roleta - cores mais variadas
  const wheelColors = [
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#06b6d4', // cyan-500
    '#f43f5e', // rose-500
    '#14b8a6', // teal-500
    '#6366f1', // indigo-500
    '#84cc16', // lime-500
    '#eab308', // yellow-500
    '#ef4444', // red-500
  ];

  // Inicializar participantes
  useEffect(() => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    setRemainingParticipants(shuffled);
    setRemainingCourts([...courts]);
    setFormedPairs([]);
    setGroups([]);
    setCourtAssignmentsInternal({});
    setCurrentPairing([null, null]);
    setCurrentStep('pairing');
    setSpinning(false);
    setCompleted(false);
    setSelectedParticipant(null);
  }, [participants, courts]);

  const finalizeAndComplete = () => {
    setCompleted(true);
    setSpinning(false);

    // Efeito visual para finalização
    confetti({
      particleCount: 200,
      spread: 160,
      origin: { y: 0.6, x: 0.5 }
    });

    if (onComplete) {
      // Use the new tournament structure creation utility
      const result = createTournamentStructure(participants, 'RANDOM', 3);
      
      // Convert pairs to the expected format
      const teamData = result.teams.map(team => 
        [team[0], team[1]] as [string, string]
      ).filter(team => team[1]); // Filter out single-person teams

      // For simplicity, assign courts randomly to teams
      const finalCourtAssignments: Record<string, string[]> = {};
      teamData.forEach((team, index) => {
        if (courts.length > 0) {
          const courtIndex = index % courts.length;
          const matchKey = `${team[0]}|${team[1]}`;
          finalCourtAssignments[matchKey] = [courts[courtIndex].id];
        }
      });

      // Create tournament metadata based on the structure
      const tournamentMetadata: TournamentMetadata = {
        bracketSides: {
          left: teamData.slice(0, Math.ceil(teamData.length / 2)),
          right: teamData.slice(Math.ceil(teamData.length / 2)),
        },
        groupInfo: {
          ...result.metadata,
          // Add the missing properties required by GroupMetadata
          groupSizes: [],
          proportionalFactors: []
        }
      };

      console.log("Finalizando animation. Calling onComplete com:", teamData, finalCourtAssignments);
      console.log("Metadados do torneio:", tournamentMetadata);
      
      // Passar metadados extras para o callback de conclusão
      onComplete(teamData, finalCourtAssignments, tournamentMetadata);
    }
  };

  // Update the spinning logic to work with automatic pair formation
  const spinWheel = () => {
    if (spinning || completed) return;
    setSpinning(true);
    
    if (continuousTimeout.current) {
      clearTimeout(continuousTimeout.current);
      continuousTimeout.current = null;
    }

    // For automatic pair formation, we can skip the manual selection process
    // and go directly to the completion with the structured pairs
    if (currentStep === 'pairing') {
      // Generate all pairs automatically using the utility function
      const result = createTournamentStructure(participants, 'RANDOM', 3);
      
      // Convert to the format expected by the animation
      const pairs = result.teams.map(team => ({
        participants: [
          participants.find(p => p.id === team[0])!,
          participants.find(p => p.id === team[1]) || participants.find(p => p.id === team[0])! // Handle single person teams
        ].filter(p => p) as [Participant, Participant]
      })).filter(pair => pair.participants.length === 2);
      
      // Simulate the spinning animation
      const randomAngle = Math.floor(Math.random() * 360) + 720;
      setRotationAngle(prev => prev + randomAngle);

      if (wheelRef.current) {
        wheelRef.current.style.transition = `transform ${spinDuration/1000}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
        wheelRef.current.style.transform = `rotate(${rotationAngle + randomAngle}deg)`;
      }

      // After animation, set all pairs at once
      spinTimeout.current = setTimeout(() => {
        setFormedPairs(pairs);
        setCurrentStep('grouping');
        setSpinning(false);
        
        // Add confetti effect
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        // If in auto mode, proceed to completion
        if (isPlaying) {
          continuousTimeout.current = setTimeout(() => {
            finalizeAndComplete();
          }, pauseDuration);
        }
      }, spinDuration);
      
    } else if (currentStep === 'grouping') {
      finalizeAndComplete();
    }
  };

  const handleWheelClick = () => {
    if (!spinning && !completed) {
      spinWheel();
    }
  };

  // Iniciar/pausar animação
  const togglePlay = () => {
    if (completed) return;
    
    if (isPlaying) {
      // Se estiver em reprodução, pausa
      setIsPlaying(false);
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
      if (continuousTimeout.current) clearTimeout(continuousTimeout.current);
      setSpinning(false);
    } else {
      // Se estiver pausado, inicia o sorteio automático
      setIsPlaying(true);
      
      // Se não estiver girando no momento, inicia o primeiro sorteio
      if (!spinning && remainingParticipants.length > 0) {
        spinWheel();
      }
    }
  };

  // Avançar manualmente
  const handleNext = () => {
    if (!spinning && !completed) {
      spinWheel();
    }
  };

  // Reiniciar animação
  const handleReset = () => {
    if (spinTimeout.current) clearTimeout(spinTimeout.current);
    if (continuousTimeout.current) clearTimeout(continuousTimeout.current);

    const shuffled = [...participants].sort(() => Math.random() - 0.5);    setRemainingParticipants(shuffled);
    setRemainingCourts([...courts]);
    setSelectedParticipants([]);
    setFormedPairs([]);
    setGroups([]);
    setCourtAssignmentsInternal({});
    setCurrentPairing([null, null]);
    setCurrentStep('pairing');
    setSpinning(false);
    setCompleted(false);
    setIsPlaying(false);
    setSelectedParticipant(null);
    setRotationAngle(0);

    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
  };

  useEffect(() => {
    return () => {
      if (spinTimeout.current) clearTimeout(spinTimeout.current);
      if (continuousTimeout.current) clearTimeout(continuousTimeout.current);
    };
  }, []);

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-brand-blue">
          {currentStep === 'pairing' ? 'Sorteio de Duplas' :
            currentStep === 'grouping' ? 'Formação de Grupos' :
              completed ? 'Sorteio Concluído!' : 'Sorteio'}
        </h3>
        <div className="flex space-x-2">
          <Button
            variant={isPlaying ? "primary" : "outline"}
            size="sm"
            onClick={togglePlay}
            disabled={completed || remainingParticipants.length === 0}
          >
            {isPlaying ? (
              <>
                <Pause size={16} className="mr-1" />
                Pausar
              </>
            ) : (
              <>
                <PlayCircle size={16} className="mr-1" />
                {spinning ? 'Sorteando...' : 'Sorteio Automático'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={spinning || completed || remainingParticipants.length === 0}
          >
            <SkipForward size={16} className="mr-1" />
            Próximo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCw size={16} className="mr-1" />
            Reiniciar
          </Button>
        </div>
      </div>

      {/* Layout de duas colunas: roleta e lista de duplas lado a lado */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Coluna da esquerda - Roleta */}
        <div className="flex-1">
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-lg overflow-hidden p-6 h-[500px] flex items-center justify-center">
            {/* Círculo externo decorativo */}
            <div className="absolute inset-0 m-auto w-[420px] h-[420px] rounded-full border-8 border-gray-800/50"></div>
            
            {/* Roleta com segmentos coloridos */}
            <div
              ref={wheelRef}
              className="absolute h-[400px] w-[400px] rounded-full shadow-[0_0_50px_rgba(59,130,246,0.4)] transition-transform cursor-pointer"
              onClick={handleWheelClick}
            >
              {/* Segmentos coloridos da roleta */}
              {Array.from({length: segmentCount}).map((_, index) => {
                const angle = index * segmentAngle;
                const color = wheelColors[index % wheelColors.length];
                
                return (
                  <div
                    key={`segment-${index}`}
                    className="absolute h-full w-full origin-center"
                    style={{
                      transform: `rotate(${angle}deg)`,
                      clipPath: `polygon(50% 50%, 50% 0, ${50 + 40 * Math.sin(Math.PI/180 * segmentAngle)}% ${50 - 40 * Math.cos(Math.PI/180 * segmentAngle)}%, 50% 50%)`,
                      backgroundColor: color,
                    }}
                  />
                );
              })}
              
              {/* Borda externa da roleta */}
              <div className="absolute inset-0 border-[12px] border-white/10 rounded-full" />
              
              {/* Marcadores da roleta */}
              {Array.from({length: segmentCount * 2}).map((_, index) => {
                const angle = index * (360 / (segmentCount * 2));
                return (
                  <div
                    key={`marker-${index}`}
                    className="absolute h-4 w-2 bg-white/80 rounded-sm"
                    style={{
                      transformOrigin: 'center',
                      transform: `rotate(${angle}deg) translateY(-200px)`,
                      left: 'calc(50% - 1px)',
                      top: '50%',
                    }}
                  />
                );
              })}

              {/* Círculo central com nome do sorteado */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 
                   bg-gradient-to-br from-blue-600 to-blue-900 text-white h-40 w-40 rounded-full 
                   flex flex-col items-center justify-center shadow-lg border-4 border-white 
                   hover:from-blue-500 hover:to-blue-800 transition-colors duration-200 cursor-pointer">
                
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-70 animate-spin-slow"></div>
                
                {selectedParticipant ? (
                  <div ref={selectedNameRef} className="text-center p-2 w-full">
                    <div className="text-xs font-medium mb-1 text-blue-200">SORTEADO</div>
                    <div className="text-xl font-bold leading-tight px-2 break-words">{selectedParticipant.name}</div>
                  </div>
                ) : (
                  <>
                    <Zap size={36} className="text-yellow-300 drop-shadow-glow mb-2" />
                    <div className="text-sm text-center font-medium">Clique para<br />sortear</div>
                  </>
                )}
              </div>
            </div>
            
            {/* Indicador de seleção (triângulo) */}
            <div 
              className="absolute top-6 left-1/2 transform -translate-x-1/2 w-0 h-0 z-30"
              style={{ 
                borderLeft: '15px solid transparent',
                borderRight: '15px solid transparent',
                borderTop: '25px solid rgb(239, 68, 68)',
                filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.7))'
              }}
            />
            
            {/* Informações do pareamento atual */}
            {currentPairing[0] && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                <div className="px-5 py-3 bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-lg shadow-lg backdrop-blur-sm">
                  <span className="font-bold">Selecionando par para:</span> {currentPairing[0].name}
                </div>
              </div>
            )}
          </div>
          
          <div className="h-12 bg-gray-800 text-white rounded-lg mt-4 flex items-center justify-center px-4 shadow-inner">
            <p className={`font-medium ${spinning ? 'animate-pulse' : ''}`}>
              {spinning ? 'Sorteando...' : 
               currentPairing[0] ? `Aguardando par para ${currentPairing[0].name}` :
               remainingParticipants.length === 0 ? 'Sorteio completo' :
               remainingParticipants.length === participants.length ? 'Clique na roleta para começar o sorteio' :
               'Aguardando próximo sorteio'}
            </p>
          </div>
        </div>
        
        {/* Coluna da direita - Estatísticas e Lista de Duplas */}
        <div className="lg:w-80 xl:w-96 flex flex-col gap-4">
          {/* Painel de estatísticas */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <h4 className="font-medium text-gray-700 mb-3">Estatísticas do Sorteio</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-xs text-blue-600 uppercase font-medium mb-1">Participantes</div>
                <div className="text-2xl font-bold text-blue-700">
                  {remainingParticipants.length}
                  <span className="text-xs text-blue-500 ml-1">/{participants.length}</span>
                </div>
                <div className="text-xs text-blue-500">restantes</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-xs text-green-600 uppercase font-medium mb-1">Duplas</div>
                <div className="text-2xl font-bold text-green-700">
                  {formedPairs.length}
                  <span className="text-xs text-green-500 ml-1">/{Math.floor(participants.length / 2)}</span>
                </div>
                <div className="text-xs text-green-500">formadas</div>
              </div>
              <div className="bg-violet-50 p-3 rounded-lg text-center">
                <div className="text-xs text-violet-600 uppercase font-medium mb-1">Grupos</div>
                <div className="text-2xl font-bold text-violet-700">
                  {groups.length}
                </div>
                <div className="text-xs text-violet-500">criados</div>
              </div>
            </div>
            
            {/* Informações dos lados do chaveamento */}
            {completed && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-blue-600 uppercase font-medium mb-1">Lado Esquerdo</div>
                  <div className="text-xl font-bold text-blue-700">
                    {formedPairs.filter(p => p.side === 'left').length}
                  </div>
                  <div className="text-xs text-blue-500">duplas</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-xs text-red-600 uppercase font-medium mb-1">Lado Direito</div>
                  <div className="text-xl font-bold text-red-700">
                    {formedPairs.filter(p => p.side === 'right').length}
                  </div>
                  <div className="text-xs text-red-500">duplas</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Lista de duplas formadas */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex-1 overflow-y-auto max-h-[400px]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700 flex items-center">
                <Users size={18} className="mr-2 text-brand-blue" />
                Duplas Formadas
              </h4>
              <span className="bg-brand-blue text-white text-sm rounded-full w-6 h-6 flex items-center justify-center">
                {formedPairs.length}
              </span>
            </div>
            
            {formedPairs.length > 0 ? (
              <div className="space-y-2">
                {formedPairs.map((pair, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:shadow-md transition-shadow animate-fadeIn"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="bg-gradient-to-r from-brand-blue to-blue-500 p-1.5 rounded-full shadow-md">
                          <Users size={14} className="text-white" />
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-500">Dupla {index + 1}</span>
                      </div>
                      <div className="flex gap-1">
                        {pair.side && (
                          <span className={`text-xs px-2 py-1 rounded-full
                            ${pair.side === 'left' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                            Lado {pair.side === 'left' ? 'Esquerdo' : 'Direito'}
                          </span>
                        )}
                        {pair.groupNumber && (
                          <span className="bg-violet-100 text-violet-800 text-xs px-2 py-1 rounded-full">
                            Grupo {pair.groupNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 pl-1">
                      <div className="flex items-center p-1 bg-green-50 rounded-md">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                        <p className="text-sm font-medium truncate" title={pair.participants[0].name}>{pair.participants[0].name}</p>
                      </div>
                      <div className="flex items-center p-1 bg-blue-50 rounded-md">
                        <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                        <p className="text-sm font-medium truncate" title={pair.participants[1].name}>{pair.participants[1].name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-center py-8 flex flex-col items-center">
                <Users size={32} className="text-gray-300 mb-2" />
                <p className="text-sm">As duplas aparecerão aqui conforme forem sorteadas.</p>
              </div>
            )}
          </div>
        </div>
      </div>      {completed && (
        <div className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-center text-white shadow-lg mt-4">
          <Award size={40} className="mx-auto mb-3 text-yellow-300 drop-shadow-glow" />
          <h4 className="font-bold text-2xl mb-2">Sorteio Finalizado com Sucesso!</h4>
          <p className="text-white/90 mb-4">
            {formedPairs.length} duplas foram formadas e divididas em dois lados do chaveamento.
            <br />
            <span className="text-white/80 text-sm mt-1 inline-block">
              {formedPairs.filter(p => p.side === 'left').length} duplas no lado esquerdo e 
              {' '}{formedPairs.filter(p => p.side === 'right').length} duplas no lado direito.
            </span>
          </p>
          <Button 
            onClick={handleReset}
            className="bg-white text-green-600 hover:bg-green-100 border-none shadow-md"
          >
            <RotateCw size={16} className="mr-2" /> Iniciar Novo Sorteio
          </Button>
        </div>
      )}
    </div>
  );
};
