import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Award,
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  Users, 
  Settings, 
  LogOut,
  BarChart3
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  onClick 
}: { 
  to?: string, 
  icon: React.ElementType, 
  label: string, 
  onClick?: () => void 
}) => {
  const location = useLocation();
  const isActive = to && location.pathname.startsWith(to);
  
  const content = (
    <div 
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg cursor-pointer transition-all ${
        isActive 
          ? 'bg-brand-purple text-white' 
          : 'hover:bg-brand-gray hover:bg-opacity-50 text-brand-blue'
      }`}
      onClick={onClick}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  
  return content;
};

export const Sidebar = () => {
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="w-64 h-screen bg-white border-r border-brand-gray flex flex-col">
      <div className="p-4 border-b border-brand-gray flex items-center gap-3">
        <Award className="h-8 w-8 text-brand-green" />
        <div>
          <h1 className="font-bold text-brand-blue">Sua Arena</h1>
          <p className="text-xs text-brand-purple">Admin</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/eventos" icon={Calendar} label="Eventos" />
        <NavItem to="/participantes" icon={Users} label="Participantes" />
        <NavItem to="/financeiro" icon={DollarSign} label="Financeiro" />
        <NavItem to="/relatorios" icon={BarChart3} label="Relatórios" />
        <NavItem to="/configuracoes" icon={Settings} label="Configurações" />
      </nav>
      
      <div className="p-4 border-t border-brand-gray">
        <NavItem icon={LogOut} label="Sair" onClick={handleSignOut} />
      </div>
    </div>
  );
};
