import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Participant, Court } from '../../types';
import { useTournamentStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Award, Shuffle, UsersRound } from 'lucide-react';
import { TournamentWheel } from './TournamentWheel';

interface BracketAnimationProps {
  eventId: string; // Added eventId based on usage in TournamentBracket
  participants: Participant[];
  courts: Court[];
  // Ensure onComplete signature matches usage
  onComplete: (
    matches: Array<[string, string]>, // Array of participant ID pairs
    courtAssignments: Record<string, string[]> // Map of matchKey ('pId1|pId2') to courtId array
  ) => void | Promise<void>;
  autoPlay?: boolean;
  speed?: number; // 1 = normal, 2 = double speed, etc.
}

export const TournamentRandomizer: React.FC<BracketAnimationProps> = ({
  eventId,
  participants,
  courts,
  onComplete,
  autoPlay = false,
  speed = 1
}) => {
  const { generateBracket, loading } = useTournamentStore(); // Use generateBracket instead of generateTournament
  const addNotification = useNotificationStore(state => state.addNotification);
  const [showWheel, setShowWheel] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [randomizedMatches, setRandomizedMatches] = useState<Array<[string, string]>>([]);
  const [courtAssignments, setCourtAssignments] = useState<Record<string, string[]>>({}); // Fix type to match required signature
  const [isGenerating, setIsGenerating] = useState(false);

  // Abre o modal com a roleta
  const openWheelModal = () => {
    setShowWheel(true);
  };

  // Lida com a conclusão da animação da roleta
  const handleAnimationComplete = (
    matches: Array<[string, string]>,
    courtAssignments: Record<string, string> // Change to string to match TournamentWheel's expected type
  ) => {
    setRandomizedMatches(matches);
    
    // Convert from Record<string, string> to Record<string, string[]>
    const convertedAssignments: Record<string, string[]> = {};
    Object.keys(courtAssignments).forEach(key => {
      convertedAssignments[key] = [courtAssignments[key]]; // Wrap each value in an array
    });
    
    setCourtAssignments(convertedAssignments);
    setAnimationComplete(true);
    // Fecha o modal automaticamente após concluir
    setShowWheel(false);
  };

  // Generate the tournament and apply court assignments
  const handleCreateTournament = async () => {
    setIsGenerating(true);
    try {
      // Log data for debugging
      console.log("Creating tournament with matches:", randomizedMatches);
      console.log("Court assignments:", courtAssignments);
      
      // Use generateBracket instead, which takes matches and courtAssignments directly
      await generateBracket(eventId, randomizedMatches, courtAssignments, { forceReset: true });
      
      addNotification({
        type: 'success',
        message: 'Chaveamento gerado com sucesso!'
      });
      
      if (onComplete) {
        // Pass the required arguments to onComplete
        onComplete(randomizedMatches, courtAssignments); 
      }
    } catch (error) {
      console.error('Error generating tournament:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao gerar chaveamento. Verifique o console para mais detalhes.'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Verificação de quantidade mínima de participantes
  if (participants.length < 4) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <p className="text-yellow-700">
          É necessário pelo menos 4 participantes para iniciar o sorteio de duplas.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {!animationComplete ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center">
          <div className="mb-6">
            <div className="h-24 w-24 bg-brand-blue/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <UsersRound size={40} className="text-brand-blue" />
            </div>
            <h3 className="text-lg font-medium text-brand-blue">Sorteio de Duplas</h3>
            <p className="text-sm text-gray-600 mt-2">
              Inicie o sorteio para formar as duplas aleatoriamente e definir as quadras iniciais.
              O sorteio será exibido em uma animação interativa.
            </p>
          </div>
          
          <Button 
            onClick={openWheelModal}
            className="px-6 py-2 text-base" // Added className for size styling instead
          >
            <Shuffle size={20} className="mr-2" />
            Iniciar Sorteio de Duplas
          </Button>
          
          {/* Modal com a roleta */}
          <Modal 
            isOpen={showWheel}
            onClose={() => setShowWheel(false)}
            title="Sorteio de Duplas"
            size="large" // Changed from "lg" to "large"
          >
            <TournamentWheel
              participants={participants}
              courts={courts}
              onComplete={handleAnimationComplete}
              autoPlay={true}
            />
          </Modal>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <Award className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-medium text-green-800">Sorteio Concluído!</h3>
            <p className="text-green-600">
              As duplas foram sorteadas com sucesso. Clique abaixo para gerar o chaveamento oficial do torneio.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {randomizedMatches.map((match, index) => {
              const team1 = participants.find(p => p.id === match[0]);
              const team2 = participants.find(p => p.id === match[1]);
              const matchKey = `${match[0]}|${match[1]}`;
              // Use first court ID from the array or undefined if not found
              const courtIds = courtAssignments[matchKey];
              const courtId = courtIds && courtIds.length > 0 ? courtIds[0] : undefined;
              const court = courtId ? courts.find(c => c.id === courtId) : undefined;
              
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center">
                  <div className="flex-1">
                    <div className="font-medium">{team1?.name}</div>
                    <div className="font-medium">{team2?.name}</div>
                  </div>
                  {court && (
                    <div className="bg-brand-green/10 text-brand-green text-sm px-3 py-1 rounded-full">
                      {court.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-center pt-4">
            <Button 
              onClick={handleCreateTournament}
              loading={isGenerating || loading}
              className="px-6 py-2 text-base" // Added className for size styling instead
              disabled={isGenerating || loading}
            >
              <Award className="mr-2" size={18} />
              Confirmar e Criar Chaveamento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
