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
  participants: Participant[]; // Individual participants
  courts: Court[];
  // Updated signature: returns pairs (teams) and initial court assignments
  onComplete: (
    teams: Array<[string, string]>, // Array of participant ID pairs representing teams
    courtAssignments: Record<string, string[]> // Map of matchKey ('pId1|pId2') to courtId array
  ) => void | Promise<void>;
  autoPlay?: boolean;
  speed?: number;
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
  // Step could be: 'pairing', 'grouping', 'courting'
  const [currentStep, setCurrentStep] = useState<'pairing' | 'grouping' | 'courting'>('pairing');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [formedPairs, setFormedPairs] = useState<Array<[Participant, Participant]>>([]); // Store formed pairs
  const [groups, setGroups] = useState<Array<Array<[Participant, Participant]>>>([]); // Store groups of pairs
  // Store court assignments with matchKey -> court object internally
  const [courtAssignmentsInternal, setCourtAssignmentsInternal] = useState<Record<string, Court>>({});
  const [currentPairing, setCurrentPairing] = useState<[Participant | null, Participant | null]>([null, null]); // For pairing step
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
    setFormedPairs([]); // Reset formed pairs
    setGroups([]); // Reset groups
    setCourtAssignmentsInternal({}); // Use internal state
    setCurrentPairing([null, null]); // Reset pairing step
    setCurrentStep('pairing'); // Start with pairing
    setSpinning(false);
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
      // Convert formedPairs to ID pairs
      const teamData = formedPairs.map(pair => [pair[0].id, pair[1].id] as [string, string]);

      // Convert internal court assignments to expected format
      const finalCourtAssignments: Record<string, string[]> = {};
      Object.entries(courtAssignmentsInternal).forEach(([matchKey, court]) => {
        // Match key might need adjustment if courts are assigned per group match later
        finalCourtAssignments[matchKey] = [court.id];
      });

      console.log("Finalizing animation. Calling onComplete with:", teamData, finalCourtAssignments);
      // Pass the formed teams (pairs) and any initial court assignments
      onComplete(teamData, finalCourtAssignments);
    }
  };

  // spinWheel function needs significant changes:
  // 1. Handle 'pairing' step: Form pairs [Participant, Participant]
  // 2. Handle 'grouping' step: Assign formed pairs to groups (visualize this)
  // 3. Handle 'courting' step: Assign courts to initial matches (if needed)
  const spinWheel = () => {
    if (spinning || completed) return;
    setSpinning(true);

    if (currentStep === 'pairing') {
      // Logic to pair participants (similar to existing 'teams' step but store in formedPairs)
      spinTimeout.current = setTimeout(() => {
        const nextParticipant = remainingParticipants[0]; // Example
        setSelectedParticipants(prev => [...prev, nextParticipant]);

        if (currentPairing[0] === null) {
          setCurrentPairing([nextParticipant, null]);
        } else {
          const newPair: [Participant, Participant] = [currentPairing[0], nextParticipant];
          setFormedPairs(prev => [...prev, newPair]); // Store the formed pair
          setCurrentPairing([null, null]);
          // Efeito visual para o match formado
          if (containerRef.current) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6, x: 0.5 }
            });
          }
        }
        setRemainingParticipants(prev => prev.slice(1));
        setSpinning(false);

        // Check if pairing is complete
        if (remainingParticipants.length <= 1) { // <= 1 because the last one is removed after timeout
          console.log("Pairing complete. Moving to grouping.");
          setCurrentStep('grouping'); // Move to next step
          // If autoplay, trigger next step spin
          if (isPlaying) setTimeout(() => spinWheel(), 500);
        } else if (isPlaying) {
          setTimeout(() => spinWheel(), 1000); // Continue pairing
        }
      }, spinDuration);

    } else if (currentStep === 'grouping') {
      // Logic to assign formed pairs to groups (e.g., groups of 4 pairs)
      // This requires visualizing groups and adding pairs to them.
      // For simplicity now, let's just skip to completion after pairing.
      console.warn("Grouping animation step not implemented. Finalizing after pairing.");
      finalizeAndComplete(); // TEMPORARY: Finalize after pairing for now
      // TODO: Implement grouping animation and logic

    } else if (currentStep === 'courting') {
      // Logic to assign courts (similar to existing 'courts' step)
      // ...
      // finalizeAndComplete() when done.
      console.warn("Courting animation step not implemented. Finalizing after pairing.");
      finalizeAndComplete(); // TEMPORARY
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
    setFormedPairs([]); // Reset pairs
    setGroups([]); // Reset groups
    setCourtAssignmentsInternal({}); // Reset internal state
    setCurrentPairing([null, null]);
    setCurrentStep('pairing'); // Reset to pairing step
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
          {currentStep === 'pairing' ? 'Sorteio de Duplas' :
            currentStep === 'grouping' ? 'Formação de Grupos' :
              currentStep === 'courting' ? 'Atribuição de Quadras' :
                completed ? 'Sorteio Concluído!' : 'Sorteio'}
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
          <div className="relative bg-white border border-gray-200 rounded-lg overflow-hidden p-6 h-[400px] flex items-center justify-center">
            <p className="text-gray-500">Visualização da Animação ({currentStep})</p>
            <div ref={wheelRef} className="absolute h-48 w-48 border-4 border-dashed rounded-full border-brand-blue"></div>
          </div>
          <div ref={tickerRef} className="h-10 bg-gray-100 rounded-lg mt-4 flex items-center px-2">
            <p className="text-gray-600 text-sm">Status: {spinning ? 'Girando...' : 'Aguardando'}</p>
          </div>
        </div>

        <div className="w-full md:w-1/2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 min-h-[400px]">
            <h4 className="font-medium text-gray-700 mb-4">Resultados Parciais</h4>
            {formedPairs.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold mb-2">Duplas Formadas:</h5>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {formedPairs.map((pair, index) => (
                    <li key={index}>{pair[0].name} & {pair[1].name}</li>
                  ))}
                </ul>
              </div>
            )}
            {groups.length > 0 && <p className="mt-4 text-gray-500">Grupos serão exibidos aqui...</p>}
            {formedPairs.length === 0 && groups.length === 0 && (
              <p className="text-gray-400 text-center pt-10">Resultados aparecerão aqui.</p>
            )}
          </div>
        </div>
      </div>

      {completed && (
        <div className="bg-brand-green/10 border border-brand-green rounded-lg p-4 text-center">
          <Award size={24} className="mx-auto mb-2 text-brand-green" />
          <h4 className="font-medium text-brand-green">Sorteio Finalizado com Sucesso!</h4>
          <p className="text-sm text-gray-600 mt-1">
            As duplas foram formadas. A estrutura de grupos será criada.
          </p>
          <Button onClick={handleReset} className="mt-4">
            <RotateCw size={16} className="mr-1" /> Iniciar Novo Sorteio
          </Button>
        </div>
      )}
    </div>
  );
};
