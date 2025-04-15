import React from 'react';
import { CalendarClock, DollarSign, Users, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { EventSummary as EventSummaryType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface EventSummaryProps {
  summary: EventSummaryType;
  loading?: boolean;
}

export const EventSummary: React.FC<EventSummaryProps> = ({
  summary,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="h-6 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-36 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4 border border-brand-green/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-500 text-sm font-medium">Receita Total</h3>
          <DollarSign className="text-green-500" size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatCurrency(summary.totalRevenue)}
        </div>
        <div className="text-xs text-gray-500">
          {summary.confirmedParticipants} inscrições pagas
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border border-brand-red/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-500 text-sm font-medium">Despesas</h3>
          <TrendingDown className="text-red-500" size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatCurrency(summary.totalExpenses)}
        </div>
        <div className="text-xs text-gray-500">
          Inclui materiais e comissões
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border border-brand-purple/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-500 text-sm font-medium">Lucro Líquido</h3>
          <TrendingUp className="text-purple-500" size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatCurrency(summary.netProfit)}
        </div>
        <div className="text-xs text-gray-500">
          {summary.netProfit > 0 ? 'Evento lucrativo' : 'Evento com prejuízo'}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border border-brand-blue/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-500 text-sm font-medium">Comissão</h3>
          <Award className="text-blue-500" size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatCurrency(summary.organizerCommission)}
        </div>
        {summary.organizer && (
          <div className="text-xs text-gray-500">
            Para {summary.organizer.name}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-500 text-sm font-medium">Participantes</h3>
          <Users className="text-gray-400" size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {summary.confirmedParticipants}/{summary.registeredParticipants}
        </div>
        <div className="text-xs text-gray-500">
          {((summary.confirmedParticipants / summary.registeredParticipants) * 100).toFixed(0)}% de confirmação
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-500 text-sm font-medium">Ocupação</h3>
          <CalendarClock className="text-gray-400" size={20} />
        </div>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {summary.confirmedParticipants}/{summary.maxParticipants}
        </div>
        <div className="text-xs text-gray-500">
          {((summary.confirmedParticipants / summary.maxParticipants) * 100).toFixed(0)}% da capacidade
        </div>
      </div>
    </div>
  );
};
