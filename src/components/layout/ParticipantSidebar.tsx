import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Award,
  Calendar, 
  LogOut,
  User,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

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

export const ParticipantSidebar = () => {
  const { logout } = useAuth();

  const handleSignOut = async () => {
    try {
      await logout();
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
          <p className="text-xs text-brand-purple">Participante</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Apenas as opções que participantes podem acessar */}
        <NavItem to="/" icon={User} label="Meu Perfil" />
        <NavItem to="/meus-torneios" icon={Trophy} label="Meus Torneios" />
        <NavItem to="/eventos-disponiveis" icon={Calendar} label="Eventos Disponíveis" />
      </nav>
      
      <div className="p-4 border-t border-brand-gray">
        <NavItem icon={LogOut} label="Sair" onClick={handleSignOut} />
      </div>
    </div>
  );
};
