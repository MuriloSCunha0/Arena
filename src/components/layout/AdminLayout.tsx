import React from 'react';
import { Sidebar } from './Sidebar';
import { isDemoMode } from '../../utils/demoMode';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        {isDemoMode() && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-4 rounded">
            <p className="font-medium">Modo Demonstração</p>
            <p className="text-sm">Esta é uma versão de demonstração com dados fictícios.</p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
