import React from 'react';
import { useParams } from 'react-router-dom';
import TournamentTransmission from '../../components/events/TournamentTransmission';
import TransmissionDiagnostic from '../../components/events/TransmissionDiagnostic';

const TransmissionPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  // Usar diagnóstico temporariamente para debug
  const useDiagnostic = false;

  if (useDiagnostic) {
    return <TransmissionDiagnostic />;
  }

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold mb-4">Erro</h1>
          <p className="text-xl">ID do evento não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <TournamentTransmission 
      eventId={eventId}
    />
  );
};

export default TransmissionPage;
