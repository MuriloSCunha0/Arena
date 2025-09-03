import React from 'react';

interface ManualModeToggleProps {
  isManual: boolean;
  onToggle: (isManual: boolean) => void;
  disabled?: boolean;
}

export const ManualModeToggle: React.FC<ManualModeToggleProps> = ({
  isManual,
  onToggle,
  disabled = false
}) => {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(!isManual);
    }
  };

  return (
    <div className="flex items-center space-x-3">
      <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        Modo Automático
      </span>
      
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isManual ? 'bg-blue-600' : 'bg-gray-200'}
        `}
        role="switch"
        aria-checked={isManual}
        aria-label="Alternar modo manual"
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
            transition duration-200 ease-in-out
            ${isManual ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      
      <span className={`text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        Modo Manual
      </span>
    </div>
  );
};
