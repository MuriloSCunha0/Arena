import React, { useState, useEffect, useRef } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  cpf?: string;
}

interface UserSelectorProps {
  onSelect: (user: UserData | null) => void;
  onCancel?: () => void;
  excludeId?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ 
  onSelect, 
  onCancel,
  excludeId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Search users when search term changes
  useEffect(() => {
    if (searchTerm.length < 3) {
      setUsers([]);
      return;
    }
    
    const searchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, phone, cpf')
          .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(10);
        
        if (error) throw error;
        
        // Filter out current user if excludeId is provided
        const filteredData = excludeId 
          ? data.filter(user => user.id !== excludeId)
          : data;
          
        setUsers(filteredData);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const debounceTimer = setTimeout(() => {
      searchUsers();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, excludeId]);
  
  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelectUser = (user: UserData) => {
    setSelectedUser(user);
    setSearchTerm('');
    setShowResults(false);
    onSelect(user);
  };
  
  const handleClear = () => {
    setSelectedUser(null);
    setSearchTerm('');
    onSelect(null);
  };
  
  return (
    <div className="w-full">
      {selectedUser ? (
        <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-md">
          <User className="text-brand-blue mr-2" size={18} />
          <div className="flex-1">
            <div className="font-medium">{selectedUser.full_name}</div>
            <div className="text-sm text-gray-600">{selectedUser.email}</div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 rounded-full hover:bg-blue-100"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>
      ) : (
        <div ref={resultsRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar usuário por nome ou email..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowResults(true)}
            />
            
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 size={18} className="text-gray-400 animate-spin" />
              </div>
            )}
          </div>
          
          {showResults && searchTerm.length >= 3 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                    {user.phone && (
                      <div className="text-xs text-gray-500">Tel: {user.phone}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          )}
          
          {showResults && searchTerm.length > 0 && searchTerm.length < 3 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-center text-gray-500">
              Digite pelo menos 3 caracteres para buscar
            </div>
          )}
        </div>
      )}
      
      {onCancel && !selectedUser && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-brand-blue hover:text-brand-blue/70"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
};
