import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Award,
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  Users, 
  Settings, 
  LogOut,
  BarChart3,
  MapPin,
  TestTube,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface NavItemProps {
  to?: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isCollapsed?: boolean;
  badge?: string | number;
}

const NavItem: React.FC<NavItemProps> = ({ 
  to, 
  icon: Icon, 
  label, 
  onClick,
  isCollapsed = false,
  badge
}) => {
  const location = useLocation();
  const isActive = to && location.pathname.startsWith(to);
  
  const content = (
    <div 
      className={`
        group relative flex items-center px-3 py-2.5 rounded-xl cursor-pointer 
        transition-all duration-200 ease-in-out transform hover:scale-[1.02]
        ${isActive 
          ? 'bg-gradient-to-r from-brand-purple to-purple-600 text-white shadow-lg shadow-purple-500/25' 
          : 'hover:bg-gray-50 text-gray-700 hover:text-brand-purple'
        }
        ${isCollapsed ? 'justify-center' : 'space-x-3'}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={label}
    >
      <Icon 
        size={20} 
        className={`
          transition-all duration-200
          ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-purple'}
        `} 
      />
      
      {!isCollapsed && (
        <>
          <span className="font-medium text-sm flex-1">{label}</span>
          {badge && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {badge}
            </span>
          )}
        </>
      )}
      
      {/* Tooltip para modo colapsado */}
      {isCollapsed && (
        <div className="
          absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200 whitespace-nowrap z-50
          before:content-[''] before:absolute before:right-full before:top-1/2 
          before:-translate-y-1/2 before:border-4 before:border-transparent 
          before:border-r-gray-900
        ">
          {label}
          {badge && <span className="ml-2 bg-red-500 px-1.5 py-0.5 rounded-full text-xs">{badge}</span>}
        </div>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} className="block">{content}</Link>;
  }
  
  return content;
};

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Mock data para badges - em produção viria do estado global
  const notificationCounts = {
    eventos: 3,
    participantes: 7,
    financeiro: 2
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 
        transform transition-all duration-300 ease-in-out flex flex-col
        shadow-xl lg:shadow-none
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className={`
          p-4 border-b border-gray-100 flex items-center relative
          ${isCollapsed ? 'justify-center' : 'gap-3'}
        `}>
          {!isCollapsed && (
            <>
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-brand-green to-green-600 rounded-xl shadow-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-gray-900 text-lg">Arena Sports</h1>
                <p className="text-xs text-brand-purple font-medium">Administração</p>
              </div>
            </>
          )}
          
          {isCollapsed && (
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-brand-green to-green-600 rounded-xl shadow-lg">
              <Award className="h-6 w-6 text-white" />
            </div>
          )}

          {/* Collapse toggle - apenas desktop */}
          <button
            onClick={toggleCollapse}
            className={`
              hidden lg:flex items-center justify-center w-8 h-8 
              rounded-lg hover:bg-gray-100 transition-colors
              ${isCollapsed ? 'absolute -right-4 bg-white border border-gray-200 shadow-md' : ''}
            `}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="space-y-1">
            <NavItem 
              to="/" 
              icon={LayoutDashboard} 
              label="Dashboard" 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/eventos" 
              icon={Calendar} 
              label="Eventos" 
              isCollapsed={isCollapsed}
              badge={notificationCounts.eventos}
            />
            <NavItem 
              to="/participantes" 
              icon={Users} 
              label="Participantes" 
              isCollapsed={isCollapsed}
              badge={notificationCounts.participantes}
            />
            
            <NavItem 
              to="/financeiro" 
              icon={DollarSign} 
              label="Financeiro" 
              isCollapsed={isCollapsed}
              badge={notificationCounts.financeiro}
            />
            <NavItem 
              to="/relatorios" 
              icon={BarChart3} 
              label="Relatórios" 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/quadras" 
              icon={MapPin} 
              label="Quadras" 
              isCollapsed={isCollapsed}
            />
          </div>

          {/* Seção de Desenvolvimento */}
          {!isCollapsed && (
            <div className="pt-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                Desenvolvimento
              </div>
            </div>
          )}
          <NavItem 
            to="/testes" 
            icon={TestTube} 
            label="Ambiente de Testes" 
            isCollapsed={isCollapsed}
          />
          
          {/* Seção de Sistema */}
          {!isCollapsed && (
            <div className="pt-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                Sistema
              </div>
            </div>
          )}
          <NavItem 
            to="/configuracoes" 
            icon={Settings} 
            label="Configurações" 
            isCollapsed={isCollapsed}
          />
        </nav>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <NavItem 
            icon={LogOut} 
            label="Sair" 
            onClick={handleSignOut}
            isCollapsed={isCollapsed}
          />
          
          {!isCollapsed && (
            <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div className="text-xs text-gray-600">
                <div className="font-medium">Arena Sports v2.0</div>
                <div className="text-gray-500">Ambiente: Produção</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
