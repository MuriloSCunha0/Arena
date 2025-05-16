import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Participant, Court } from '../../types';
import { useTournamentStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Award, Shuffle, UsersRound } from 'lucide-react';
import { BracketAnimation } from './BracketAnimation';

// Interface for the bracket sides metadata
export interface BracketSidesMetadata {
  left: Array<[string, string]>;
  right: Array<[string, string]>;
}

// Interface for group metadata with proportional scoring info
export interface GroupMetadata {
  groupSizes: Record<number, number>;
  proportionalFactors: Record<number, number>;
}

// Interface for complete tournament metadata
export interface TournamentMetadata {
  bracketSides: BracketSidesMetadata;
  groupInfo?: GroupMetadata;
}

interface TournamentRandomizerProps {
  eventId: string;
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

export const TournamentRandomizer: React.FC<TournamentRandomizerProps> = ({
  participants,
  courts,
  onComplete,
  autoPlay = false,
  speed = 1
}) => {
  const addNotification = useNotificationStore(state => state.addNotification);
  const [showAnimationModal, setShowAnimationModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleStartDrawing = () => {
    if (participants.length < 4) {
      addNotification({ type: 'warning', message: 'São necessários pelo menos 4 participantes para o sorteio de duplas.' });
      return;
    }
    if (courts.length === 0) {
      addNotification({ type: 'warning', message: 'Nenhuma quadra disponível para o sorteio.' });
      return;
    }
    setShowAnimationModal(true);
  };
  const handleAnimationComplete = async (
    generatedTeams: Array<[string, string]>,
    generatedCourtAssignments: Record<string, string[]>
  ) => {
    console.log("Animation complete. Teams:", generatedTeams, "Court Assignments:", generatedCourtAssignments);
    setShowAnimationModal(false);
    setIsGenerating(true);
    try {
      // Extract metadata about team sides from the pairs
      const extractBracketSidesFromPairs = () => {
        const leftPairs: Array<[string, string]> = [];
        const rightPairs: Array<[string, string]> = [];
        
        // Determine which teams go to which side of the bracket
        const totalTeams = generatedTeams.length;
        const halfSize = Math.ceil(totalTeams / 2);
        
        // Split teams into left and right sides
        for (let i = 0; i < generatedTeams.length; i++) {
          if (i < halfSize) {
            leftPairs.push(generatedTeams[i]);
          } else {
            rightPairs.push(generatedTeams[i]);
          }
        }
        
        return {
          bracketSides: {
            left: leftPairs,
            right: rightPairs
          }
        };
      };      // Get sides metadata to pass to the tournament generation
      const metadata = extractBracketSidesFromPairs();
      console.log("Tournament metadata:", metadata);
      
      // Update tournament settings to use two-sided format
      const tournamentSettings = {
        bracketFormat: 'TWO_SIDED', // Set the format to TWO_SIDED
        // Add other settings as needed
      };
      
      // Pass teams, court assignments, and bracketSides metadata
      await onComplete(generatedTeams, generatedCourtAssignments, metadata);
    } catch (error: any) {
      console.error("Error after animation completion:", error);
      addNotification({ type: 'error', message: `Erro ao processar sorteio: ${error.message}` });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="text-center">
      <Button
        onClick={handleStartDrawing}
        disabled={isGenerating || participants.length < 4 || courts.length === 0}
        loading={isGenerating}
        size="lg"
      >
        <Shuffle size={20} className="mr-2" />
        Iniciar Sorteio de Duplas e Grupos
      </Button>

      <Modal
        isOpen={showAnimationModal}
        onClose={() => setShowAnimationModal(false)}
        title="Sorteio de Duplas e Grupos"
        size="full"
      >
        <BracketAnimation
          participants={participants}
          courts={courts}
          onComplete={handleAnimationComplete}
          autoPlay={autoPlay}
          speed={speed}
        />
      </Modal>
    </div>
  );
};
