import React, { ReactNode } from 'react';
import { ParticipantSidebar } from './ParticipantSidebar';

interface ParticipantLayoutProps {
  children: ReactNode;
}

export const ParticipantLayout: React.FC<ParticipantLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-brand-sand">
      <ParticipantSidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
