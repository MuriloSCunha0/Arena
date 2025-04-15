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

interface BracketAnimationProps {
  participants: Participant[];
  courts: Court[];
  // Update signature to match store action generateBracket
  onComplete: (
    matches: Array<[string, string]>, // Array of participant ID pairs
    courtAssignments: Record<string, string[]> // Map of matchKey ('pId1|pId2') to courtId array
  ) => void | Promise<void>;
  autoPlay?: boolean;
  speed?: number; // 1 = normal, 2 = double speed, etc.
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
  const tickerRef = useRef<HTMLDivElement>(null);
  
  // Estados
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentStep, setCurrentStep] = useState<'teams' | 'courts'>('teams');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Array<[Participant, Participant]>>([]);
  // Store court assignments with matchKey -> court object initially
  const [courtAssignmentsInternal, setCourtAssignmentsInternal] = useState<Record<string, Court>>({});
  const [currentPair, setCurrentPair] = useState<[Participant | null, Participant | null]>([null, null]);
  const [spinning, setSpinning] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Copia dos participantes para sorteio (para não modificar o array original)
  const [remainingParticipants, setRemainingParticipants] = useState<Participant[]>([]);
  const [remainingCourts, setRemainingCourts] = useState<Court[]>([]);
  
  // Animação
  const spinTimeout = useRef<NodeJS.Timeout | null>(null);
  const spinDuration = 5000 / (speed || 1);
  
  // Inicializar participantes
  useEffect(() => {
    // Embaralhar participantes
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    setRemainingParticipants(shuffled);
    setRemainingCourts([...courts]);
    setSelectedParticipants([]);
    setMatches([]);
    setCourtAssignmentsInternal({}); // Use internal state
    setCurrentStep('teams');
    setCompleted(false);
  }, [participants, courts]);
  
  // Function to call onComplete with correctly formatted data
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
          // Convert matches to ID pairs
          const matchData = matches.map(match => [match[0].id, match[1].id] as [string, string]);

          // Convert internal court assignments (matchKey -> Court) to expected format (matchKey -> string[])
          const finalCourtAssignments: Record<string, string[]> = {};
          Object.entries(courtAssignmentsInternal).forEach(([matchKey, court]) => {
              finalCourtAssignments[matchKey] = [court.id]; // Wrap court ID in an array
          });

          console.log("Finalizing animation. Calling onComplete with:", matchData, finalCourtAssignments);
          onComplete(matchData, finalCourtAssignments);
      }
  };

  // Função para girar a roleta
  const spinWheel = () => {
    if (spinning || completed) return; // Prevent spinning if already spinning or completed

    setSpinning(true);

    if (currentStep === 'teams') {
      // Se não houver mais participantes, passar para o próximo passo
      if (remainingParticipants.length === 0) {
        setCurrentStep('courts');
        setSpinning(false);
        // If autoPlay, immediately spin for courts if needed
        if (isPlaying && matches.length > 0 && remainingCourts.length > 0) {
            setTimeout(() => spinWheel(), 500); // Short delay before starting court spin
        }
        return;
      }

      // Sortear próximo participante
      const nextParticipant = remainingParticipants[0];

      // Animar a roleta
      if (wheelRef.current) {
        wheelRef.current.style.transition = `transform ${spinDuration/1000}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
        wheelRef.current.style.transform = `rotate(${Math.random() * 1080 + 720}deg)`;
        wheelRef.current.classList.add('animate-pulse');
      }

      // Após o tempo de animação, atualizar o participante selecionado
      spinTimeout.current = setTimeout(() => {
        setSelectedParticipants(prev => [...prev, nextParticipant]);

        // Atualizar pares
        if (currentPair[0] === null) {
          setCurrentPair([nextParticipant, null]);
        } else {
          // Formar par completo
          const newPair: [Participant, Participant] = [currentPair[0], nextParticipant];
          setMatches(prev => [...prev, newPair]);
          setCurrentPair([null, null]);

          // Efeito visual para o match formado
          if (containerRef.current) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6, x: 0.5 }
            });
          }
        }

        // Remover participante sorteado
        setRemainingParticipants(prev => prev.slice(1));
        setSpinning(false);

        // Remove pulse animation
        if (wheelRef.current) {
          wheelRef.current.classList.remove('animate-pulse');
        }

        // Se auto-play estiver ativo, continuar sorteio
        if (isPlaying && remainingParticipants.length > 0) { // Check if there are participants left to pair
          setTimeout(() => spinWheel(), 1000);
        } else if (isPlaying && remainingParticipants.length === 0) {
           // If autoplay and no more participants, move to courts
           setCurrentStep('courts');
           if (matches.length > 0 && remainingCourts.length > 0) {
               setTimeout(() => spinWheel(), 500);
           } else {
               finalizeAndComplete(); // No courts or matches, just complete
           }
        }
      }, spinDuration);

    } else if (currentStep === 'courts') {
      // Atribuir quadras aos matches
      const assignedMatchKeys = Object.keys(courtAssignmentsInternal);
      if (matches.length === 0 || remainingCourts.length === 0 || assignedMatchKeys.length >= matches.length) {
        // If no matches, no courts left, or all matches assigned, finalize
        finalizeAndComplete();
        return;
      }

      // Sortear próxima quadra
      const nextCourt = remainingCourts[0];
      // Find the next match that hasn't been assigned a court
      const nextMatchToAssign = matches.find(match => !courtAssignmentsInternal[`${match[0].id}|${match[1].id}`]);

      if (!nextMatchToAssign) {
          // Should not happen if checks above are correct, but handle defensively
          finalizeAndComplete();
          return;
      }

      // Animar a roleta
      if (wheelRef.current) {
        wheelRef.current.style.transition = `transform ${spinDuration/1000}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
        wheelRef.current.style.transform = `rotate(${Math.random() * 1080 + 720}deg)`;
      }

      // Após o tempo de animação, atualizar a quadra selecionada
      spinTimeout.current = setTimeout(() => {
        // Atribuir quadra ao match atual
        const matchKey = `${nextMatchToAssign[0].id}|${nextMatchToAssign[1].id}`;
        setCourtAssignmentsInternal(prev => ({
          ...prev,
          [matchKey]: nextCourt
        }));

        // Remover quadra sorteada
        setRemainingCourts(prev => prev.slice(1));
        setSpinning(false);

        const newAssignmentsCount = Object.keys(courtAssignmentsInternal).length + 1; // Count after this assignment

        // Se auto-play estiver ativo, continuar sorteio
        if (isPlaying && newAssignmentsCount < matches.length && remainingCourts.length > 1) { // Check if courts remain
          setTimeout(() => spinWheel(), 1000);
        } else if (newAssignmentsCount >= matches.length || remainingCourts.length <= 1) {
          // Finalizou todas as atribuições ou ran out of courts
          finalizeAndComplete();
        }
      }, spinDuration);
    }
  };

  // Iniciar/pausar animação automática
  const togglePlay = () => {
    if (completed) return; // Don't allow play/pause if completed
    if (isPlaying) {
      setIsPlaying(false);
      if (spinTimeout.current) clearTimeout(spinTimeout.current); // Stop any pending spin
      setSpinning(false); // Ensure spinning state is false
      if (wheelRef.current) wheelRef.current.classList.remove('animate-pulse');
    } else {
      setIsPlaying(true);
      if (!spinning) {
        spinWheel(); // Start spinning if not already
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
    if (spinTimeout.current) {
      clearTimeout(spinTimeout.current);
    }

    // Reiniciar estado
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    setRemainingParticipants(shuffled);
    setRemainingCourts([...courts]);
    setSelectedParticipants([]);
    setMatches([]);
    setCourtAssignmentsInternal({}); // Reset internal state
    setCurrentPair([null, null]);
    setCurrentStep('teams');
    setSpinning(false);
    setCompleted(false);
    setIsPlaying(false); // Stop autoplay on reset

    // Resetar animação da roleta
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
      wheelRef.current.classList.remove('animate-pulse');
    }
  };

  // Limpar timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (spinTimeout.current) {
        clearTimeout(spinTimeout.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6" ref={containerRef}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-brand-blue">
          {currentStep === 'teams' 
            ? 'Sorteio de Duplas' 
            : completed 
              ? 'Sorteio Concluído!' 
              : 'Atribuição de Quadras'}
        </h3>
        <div className="flex space-x-2">
          <Button
            variant={isPlaying ? "primary" : "outline"}
            size="sm"
            onClick={togglePlay}
            disabled={completed}
            className="transition-all"
          >
            {isPlaying ? (
              <>
                <Pause size={16} className="mr-1" />
                Pausar
              </>
            ) : (
              <>
                <PlayCircle size={16} className="mr-1" />
                {spinning ? 'Sorteando...' : 'Iniciar'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={spinning || completed}
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
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/2">
          {currentStep === 'teams' ? (
            <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden p-6">
              <h4 className="text-center text-sm font-medium text-gray-700 mb-3">
                <Users size={16} className="inline-block mr-1" />
                Sorteio de Participantes
              </h4>
              
              {/* Roleta */}
              <div className="relative h-64 flex items-center justify-center my-6">
                <div className="absolute h-full w-full flex items-center justify-center">
                  <div className="h-1 w-1/2 bg-brand-green absolute top-1/2 right-1/2"></div>
                  <div className="h-60 w-60 border-4 border-dashed border-brand-green rounded-full"></div>
                  <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
                    <div className="h-6 w-6 bg-brand-green transform rotate-45"></div>
                  </div>
                </div>
                
                {remainingParticipants.length > 0 && (
                  <div 
                    ref={wheelRef} 
                    className="wheel relative h-48 w-48 bg-brand-blue/5 rounded-full flex items-center justify-center"
                  >
                    <div className="text-center">
                      <span className="text-lg font-bold text-brand-blue">
                        {remainingParticipants[0]?.name}
                      </span>
                    </div>
                  </div>
                )}
                
                {remainingParticipants.length === 0 && (
                  <div className="text-center text-gray-500">
                    <Users size={32} className="mx-auto mb-2 text-gray-400" />
                    <p>Todos os participantes foram sorteados!</p>
                    <p className="mt-2 text-sm">Clique em "Próximo" para continuar para o sorteio das quadras.</p>
                  </div>
                )}
              </div>
              
              {/* Ticker */}
              <div 
                ref={tickerRef}
                className="h-10 bg-brand-blue/10 rounded-lg overflow-hidden border border-brand-blue/20 mt-6 flex items-center px-2"
              >
                {spinning && remainingParticipants.length > 0 ? (
                  <div className="flex items-center space-x-1 text-brand-blue">
                    <Zap size={16} className="animate-pulse" />
                    <span>Sorteando...</span>
                  </div>
                ) : currentPair[0] && !currentPair[1] ? (
                  <div className="flex items-center text-brand-blue">
                    <span>Selecionado: <strong>{currentPair[0].name}</strong> (aguardando dupla)</span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    {remainingParticipants.length === 0 
                      ? 'Sorteio de participantes concluído!' 
                      : 'Pressione "Próximo" para sortear um participante'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden p-6">
              <h4 className="text-center text-sm font-medium text-gray-700 mb-3">
                <MapPin size={16} className="inline-block mr-1" />
                Sorteio de Quadras
              </h4>
              
              {/* Roleta para quadras */}
              <div className="relative h-64 flex items-center justify-center my-6">
                <div className="absolute h-full w-full flex items-center justify-center">
                  <div className="h-1 w-1/2 bg-brand-purple absolute top-1/2 right-1/2"></div>
                  <div className="h-60 w-60 border-4 border-dashed border-brand-purple rounded-full"></div>
                  <div className="absolute top-1/2 right-8 transform -translate-y-1/2">
                    <div className="h-6 w-6 bg-brand-purple transform rotate-45"></div>
                  </div>
                </div>
                
                {remainingCourts.length > 0 && matches.length > Object.keys(courtAssignmentsInternal).length && (
                  <div 
                    ref={wheelRef} 
                    className="wheel relative h-48 w-48 bg-brand-purple/5 rounded-full flex items-center justify-center"
                  >
                    <div className="text-center p-4">
                      <span className="text-lg font-bold text-brand-purple">
                        {remainingCourts[0]?.name}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {remainingCourts[0]?.location}
                      </div>
                    </div>
                  </div>
                )}
                
                {(remainingCourts.length === 0 || matches.length <= Object.keys(courtAssignmentsInternal).length) && (
                  <div className="text-center text-gray-500">
                    <MapPin size={32} className="mx-auto mb-2 text-gray-400" />
                    <p>Todas as quadras foram atribuídas!</p>
                    {completed ? (
                      <p className="mt-2 text-sm">Sorteio concluído com sucesso.</p>
                    ) : (
                      <p className="mt-2 text-sm">Clique em "Próximo" para finalizar.</p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Ticker */}
              <div 
                className="h-10 bg-brand-purple/10 rounded-lg overflow-hidden border border-brand-purple/20 mt-6 flex items-center px-2"
              >
                {spinning && remainingCourts.length > 0 ? (
                  <div className="flex items-center space-x-1 text-brand-purple">
                    <Zap size={16} className="animate-pulse" />
                    <span>Sorteando quadra...</span>
                  </div>
                ) : matches.length > Object.keys(courtAssignmentsInternal).length && remainingCourts.length > 0 ? (
                  <div className="text-gray-500">
                    Pressione "Próximo" para sortear uma quadra
                  </div>
                ) : (
                  <div className="text-brand-purple font-medium">
                    <Award size={16} className="inline-block mr-1 mb-0.5" />
                    Sorteio de quadras concluído!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="w-full md:w-1/2 space-y-4">
          {/* Resultados do sorteio */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-700 mb-4">Resultados do Sorteio</h4>
            
            {matches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Os resultados aparecerão aqui após o sorteio.
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match, index) => {
                  const matchKey = `${match[0].id}|${match[1].id}`;
                  const court = courtAssignmentsInternal[matchKey];
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-3 border rounded-lg ${
                        court 
                          ? 'border-brand-green bg-brand-green/5' 
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{match[0].name}</div>
                          <div className="font-medium">{match[1].name}</div>
                        </div>
                        
                        {court && (
                          <div className="flex items-center bg-white px-2 py-1 rounded-lg border border-brand-green/20">
                            <MapPin size={14} className="text-brand-green mr-1" />
                            <span className="text-sm text-brand-green">{court.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {completed && (
        <div className="bg-brand-green/10 border border-brand-green rounded-lg p-4 text-center">
          <Award size={24} className="mx-auto mb-2 text-brand-green" />
          <h4 className="font-medium text-brand-green">Sorteio Finalizado com Sucesso!</h4>
          <p className="text-sm text-gray-600 mt-1">
            Todas as duplas foram formadas e as quadras foram atribuídas.
          </p>
          
          <Button onClick={handleReset} className="mt-4">
            <RotateCw size={16} className="mr-1" />
            Iniciar Novo Sorteio
          </Button>
        </div>
      )}
    </div>
  );
};
