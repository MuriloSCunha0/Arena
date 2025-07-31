import React, { ReactNode } from 'react';
import { Layout } from './Layout';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <Layout>
      <div className="p-6">
        {children}
      </div>
    </Layout>
  );
};
