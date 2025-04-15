import React, { useState } from 'react';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { useNotificationStore } from '../../components/ui/Notification';
import { Tournament, Participant } from '../../types';
import { generateBracketWithCourts, TournamentService } from '../../services/supabase/tournament';

interface TournamentComponentProps {
  eventId: string;
  participants: Participant[];
  courtAssignments: Record<string, string[]>;
  tournament: Tournament | null;
}

const TournamentComponent: React.FC<TournamentComponentProps> = ({ 
  eventId, 
  participants, 
  courtAssignments, 
  tournament 
}) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { play } = useSoundEffects();
  const addNotification = useNotificationStore(state => state.addNotification);

  const handleGenerateBracket = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      // Check if we already have a tournament
      const hasTournament = !!tournament?.id;
      
      // If we have a tournament, ask for confirmation to reset
      let shouldReset = false;
      if (hasTournament) {
        shouldReset = window.confirm(
          'Já existe um torneio criado para este evento. Deseja recriar o torneio? ' +
          'Esta ação irá excluir todas as partidas existentes.'
        );
        
        if (!shouldReset) {
          setGenerating(false);
          return;
        }
      }
      
      // Generate or regenerate the tournament with the reset option if needed
      const result = await generateBracketWithCourts(
        eventId, 
        participants, 
        courtAssignments,
        { forceReset: shouldReset }
      );
      
      // Play success sound
      play('success');
      
      // Show success message
      addNotification({
        type: 'success',
        message: result.isNewTournament 
          ? 'Torneio criado com sucesso!' 
          : 'Torneio atualizado com sucesso!'
      });
      
      // Refresh the bracket
      await TournamentService.getByEventId(eventId);
    } catch (error) {
      console.error('Error generating bracket:', error);
      setError(error instanceof Error ? error.message : 'Erro ao gerar torneio');
      
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao gerar torneio'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}
      <button 
        onClick={handleGenerateBracket} 
        disabled={generating}
        className="px-4 py-2 bg-brand-blue text-white rounded hover:bg-brand-blue-dark transition-colors"
      >
        {generating ? 'Gerando...' : 'Gerar Chaveamento'}
      </button>
    </div>
  );
};

export default TournamentComponent;