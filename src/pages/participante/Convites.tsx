import React, { useEffect, useState } from 'react';
import { useParticipant } from '../../hooks/useParticipant';
import { useAuth } from '../../hooks/useAuth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Loader, Users, CheckCircle, Clock, Send, Calendar, MapPin, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';

import type { PartnerInvite } from '../../types';

const InviteCard = ({ invite, type }: { invite: any; type: 'sent' | 'pending' | 'confirmed' }) => {
  const getStatusColor = () => {
    switch (type) {
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      case 'confirmed': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = () => {
    switch (type) {
      case 'pending': return <Clock size={20} className="text-yellow-600" />;
      case 'confirmed': return <CheckCircle size={20} className="text-green-600" />;
      default: return <Send size={20} className="text-blue-600" />;
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getStatusColor()} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {invite.eventName || invite.event_name || 'Evento'}
            </h3>
            <p className="text-sm text-gray-600">
              {type === 'sent' 
                ? `Para: ${invite.receiverName || invite.receiver_name || invite.receiverId || invite.receiver_id}`
                : type === 'pending'
                ? `De: ${invite.senderName || invite.sender_name || invite.senderId || invite.sender_id}`
                : `Parceiro: ${invite.senderName || invite.sender_name || invite.receiverName || invite.receiver_name}`
              }
            </p>
          </div>
        </div>
      </div>
      
      {invite.event_date && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
          <Calendar size={14} />
          <span>{formatDate(invite.event_date)}</span>
        </div>
      )}
      
      {invite.event_location && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
          <MapPin size={14} />
          <span>{invite.event_location}</span>
        </div>
      )}
    </div>
  );
};

export const Convites = () => {
  const { user } = useAuth();
  const { fetchSentInvites, fetchPendingInvites, fetchConfirmedInvites } = useParticipant();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sent, setSent] = useState<PartnerInvite[]>([]);
  const [pending, setPending] = useState<PartnerInvite[]>([]);
  const [confirmed, setConfirmed] = useState<PartnerInvite[]>([]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sentInv, pendInv, confInv] = await Promise.all([
        fetchSentInvites(user.id),
        fetchPendingInvites(user.id),
        fetchConfirmedInvites(user.id)
      ]);
      setSent(sentInv || []);
      setPending(pendInv || []);
      setConfirmed(confInv || []);
    } catch (e) {
      console.error('Error fetching invites:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAll();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-brand-green animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando seus convites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meus Convites</h1>
            <p className="text-gray-600 mt-1">Gerencie seus convites de parceria para eventos</p>
          </div>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send size={20} className="text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Enviados</p>
                <p className="text-2xl font-bold text-gray-900">{sent.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Confirmados</p>
                <p className="text-2xl font-bold text-gray-900">{confirmed.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Tabs defaultValue="pending" className="w-full">
            <div className="border-b border-gray-200">
              <TabsList className="w-full justify-start p-0 bg-transparent h-auto">
                <TabsTrigger 
                  value="pending" 
                  className="flex-1 sm:flex-none px-6 py-4 data-[state=active]:bg-yellow-50 data-[state=active]:border-b-2 data-[state=active]:border-yellow-500"
                >
                  <Clock size={16} className="mr-2" />
                  <span className="hidden sm:inline">Pendentes</span>
                  <span className="sm:hidden">Pendentes</span>
                  {pending.length > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      {pending.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="sent" 
                  className="flex-1 sm:flex-none px-6 py-4 data-[state=active]:bg-blue-50 data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
                >
                  <Send size={16} className="mr-2" />
                  <span className="hidden sm:inline">Enviados</span>
                  <span className="sm:hidden">Enviados</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="confirmed" 
                  className="flex-1 sm:flex-none px-6 py-4 data-[state=active]:bg-green-50 data-[state=active]:border-b-2 data-[state=active]:border-green-500"
                >
                  <CheckCircle size={16} className="mr-2" />
                  <span className="hidden sm:inline">Confirmados</span>
                  <span className="sm:hidden">Confirmados</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-6">
              <TabsContent value="pending" className="mt-0">
                <div className="space-y-4">
                  {pending.map((invite: any) => (
                    <InviteCard key={invite.id} invite={invite} type="pending" />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="sent" className="mt-0">
                <div className="space-y-4">
                  {sent.map((invite: any) => (
                    <InviteCard key={invite.id} invite={invite} type="sent" />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="confirmed" className="mt-0">
                <div className="space-y-4">
                  {confirmed.map((invite: any) => (
                    <InviteCard key={invite.id} invite={invite} type="confirmed" />
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Convites;
