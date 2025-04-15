import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { BracketAnimation } from './BracketAnimation';
import { useTournamentStore, useParticipantsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { PlayCircle, Users, MapPin } from 'lucide-react';
import { Participant, Court } from '../../types';

interface TournamentDrawControllerProps {
  eventId: string;
}

export const TournamentDrawController: React.FC<TournamentDrawControllerProps> = ({ 
  eventId 
}) => {
  const { courts } = useCourtsStore();
  const { eventParticipants } = useParticipantsStore();
  const { generateBracket, fetchTournament } = useTournamentStore(); // Changed from generateTournament
  const addNotification = useNotificationStore(state => state.addNotification);
  
  const [showDrawModal, setShowDrawModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleStartDrawing = () => {
    // Verificar se existem participantes suficientes
    if (eventParticipants.length < 2) {
      addNotification({
        type: 'warning',
        message: 'É necessário pelo menos 2 participantes para iniciar o sorteio'
      });
      return;
    }
    
    // Verificar se existem quadras disponíveis
    if (courts.length === 0) {
      addNotification({
        type: 'warning',
        message: 'É necessário ter pelo menos uma quadra cadastrada para iniciar o sorteio'
      });
      return;
    }
    
    setShowDrawModal(true);
  };
  
  const handleDrawComplete = async (
    matches: Array<[string, string]>, 
    courtAssignments: Record<string, string[]>
  ) => {
    try {
      setIsGenerating(true);
      
      // Pass matches directly rather than extracting just IDs
      // The matches parameter already contains the required [string, string][] format
      await generateBracket(
        eventId, 
        matches, // This is already in the correct format needed by generateBracket
        courtAssignments,
        { forceReset: true }
      );
      
      await fetchTournament(eventId);
      
      addNotification({
        type: 'success',
        message: 'Chaveamento gerado com sucesso!'
      });
      
      setShowDrawModal(false);
    } catch (error) {
      console.error('Error generating tournament:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao gerar chaveamento'
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <>
      <Button
        onClick={handleStartDrawing}
        className="w-full"
      >
        <PlayCircle size={18} className="mr-2" />
        Iniciar Sorteio Animado
      </Button>
      
      <Modal
        isOpen={showDrawModal}
        onClose={() => !isGenerating && setShowDrawModal(false)}
        title="Sorteio do Torneio"
        size="large"
      >
        <div>
          <div className="mb-4 bg-brand-blue/5 rounded-lg p-3">
            <div className="flex flex-col sm:flex-row sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <Users size={16} className="text-brand-blue mr-2" />
                <span className="text-sm font-medium">
                  {eventParticipants.length} Participantes
                </span>
              </div>
              
              <div className="flex items-center">
                <MapPin size={16} className="text-brand-green mr-2" />
                <span className="text-sm font-medium">
                  {courts.length} Quadras disponíveis
                </span>
              </div>
            </div>
          </div>
          
          <BracketAnimation
            participants={eventParticipants}
            courts={courts}
            onComplete={handleDrawComplete}
            autoPlay={false}
            speed={1.5}
          />
        </div>
      </Modal>
    </>
  );
};
