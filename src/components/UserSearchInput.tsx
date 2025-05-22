import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserSearchInputProps {
  onUserSelect: (user: any | null) => void;
  excludeUserId?: string;
  placeholder?: string;
}

export const UserSearchInput: React.FC<UserSearchInputProps> = ({
  onUserSelect,
  excludeUserId,
  placeholder = 'Buscar usuário por nome ou email'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Buscar usuários quando o termo de busca mudar
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 3) {
        setUsers([]);
        return;
      }
      
      setLoading(true);
      try {
        // Buscar usuários por nome ou email
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10);
        
        if (error) throw error;
        
        // Filtrar usuário atual da lista
        const filteredUsers = excludeUserId 
          ? data.filter(user => user.id !== excludeUserId) 
          : data;
          
        setUsers(filteredUsers);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 3) {
        searchUsers();
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, excludeUserId]);
  
  // Fechar o dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setSearchTerm('');
    setShowResults(false);
    onUserSelect(user);
  };
  
  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchTerm('');
    onUserSelect(null);
  };
  
  const handleFocus = () => {
    if (searchTerm.length >= 3) {
      setShowResults(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {!selectedUser ? (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          
          {loading && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-brand-blue"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center p-2 border border-gray-300 rounded-md bg-blue-50">
          <User size={18} className="text-brand-blue mr-2" />
          <span className="flex-1">{selectedUser.full_name}</span>
          <button
            type="button"
            onClick={handleClearSelection}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      {/* Dropdown de resultados */}
      {showResults && users.length > 0 && !selectedUser && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {users.map(user => (
            <div
              key={user.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelectUser(user)}
            >
              <div className="font-medium">{user.full_name}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
            </div>
          ))}
        </div>
      )}
      
      {showResults && searchTerm.length >= 3 && users.length === 0 && !loading && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-2">
          <p className="text-sm text-gray-500">Nenhum usuário encontrado</p>
        </div>
      )}
      
      {searchTerm.length > 0 && searchTerm.length < 3 && (
        <div className="mt-1 text-xs text-gray-500">
          Digite pelo menos 3 caracteres para buscar
        </div>
      )}
    </div>
  );
};
