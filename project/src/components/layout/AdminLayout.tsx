import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen bg-brand-sand">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
