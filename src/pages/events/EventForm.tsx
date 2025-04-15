import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Calendar, ChevronLeft, Info, MapPin, Clock, 
  DollarSign, Users, Trophy, Tag, Eye, Loader2, Link,
  Percent, List, ShieldCheck, Save, X, Plus, Trash2
} from 'lucide-react';
import { Event, EventType, TeamFormationType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useEventsStore, useCourtsStore, useOrganizersStore } from '../../store';
import { useNotificationStore } from '../../components/ui/Notification';
import { Modal } from '../../components/ui/Modal';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea'; // Ensure this path and export are correct
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox'; // Ensure this path and export are correct
import { PageHeader } from '../../components/layout/PageHeader'; // Ensure this path and export are correct
import { TournamentCard } from '../../components/tournaments/TournamentCards'; // For preview

// Update Zod schema to include new fields
const eventSchema = z.object({
  type: z.nativeEnum(EventType),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  location: z.string().min(3, 'Localização deve ter pelo menos 3 caracteres'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  price: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().min(0, 'Preço não pode ser negativo')
  ),
  maxParticipants: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val) : val),
    z.number().int().min(2, 'Mínimo de 2 participantes')
  ),
  prize: z.string().optional(),
  rules: z.string().optional(),
  teamFormation: z.nativeEnum(TeamFormationType),
  categories: z.array(z.string()).optional(),
  bannerImageUrl: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  organizerId: z.string().uuid('Organizador inválido').optional().nullable(), // Added
  organizerCommissionRate: z.preprocess( // Added
    (val) => (typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val),
    z.number().min(0).max(100, 'Comissão deve ser entre 0 e 100').optional().nullable()
  ),
  courtIds: z.array(z.string().uuid()).optional().nullable(), // Added
});

type EventFormValues = z.infer<typeof eventSchema>;


export const EventForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const { createEvent, updateEvent, currentEvent, fetchEventById, clearCurrent, loading, error } = useEventsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  const { organizers, loading: loadingOrganizers, fetchOrganizers } = useOrganizersStore(); // Use organizers store
  const { courts, loading: loadingCourts, fetchCourts } = useCourtsStore(); // Use courts store

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  // No need for separate formData state, use react-hook-form's state via watch or getValues

  const {
    register,
    handleSubmit,
    control, // Use Controller for multi-select/checkboxes
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: EventType.TOURNAMENT,
      title: '',
      description: '',
      location: 'Arena Conexão',
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
      price: 0,
      maxParticipants: 0,
      prize: '',
      rules: '',
      teamFormation: TeamFormationType.FORMED,
      categories: [],
      bannerImageUrl: '',
      organizerId: null, // Default to null
      organizerCommissionRate: null, // Default to null
      courtIds: [], // Default to empty array
    }
  });

  // Watch form values for dynamic updates (preview, commission rate)
  const watchedFormData = watch();

  // Fetch event data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      fetchEventById(id).catch(() => {
        addNotification({ type: 'error', message: 'Falha ao carregar dados do evento' });
        navigate('/eventos');
      });
    } else {
      reset(); // Reset form if creating new
    }
    return () => {
      clearCurrent();
    };
  }, [isEditMode, id, fetchEventById, clearCurrent, addNotification, navigate, reset]);

  // Populate form with event data when available (using reset)
  useEffect(() => {
    if (currentEvent) {
      reset({
        ...currentEvent,
        // Ensure correct types for react-hook-form
        price: currentEvent.price ?? 0,
        maxParticipants: currentEvent.maxParticipants ?? 0,
        organizerId: currentEvent.organizerId ?? null,
        organizerCommissionRate: currentEvent.organizerCommissionRate ?? null,
        courtIds: currentEvent.courtIds ?? [],
        categories: currentEvent.categories ?? [],
        bannerImageUrl: currentEvent.bannerImageUrl ?? '',
      });
    }
  }, [currentEvent, reset]);

  // Show errors from store
  useEffect(() => {
    if (error) {
      addNotification({ type: 'error', message: error });
      // Optionally clear the store error after showing
    }
  }, [error, addNotification]);

  // Fetch organizers and courts
  useEffect(() => {
    fetchOrganizers().catch(() => addNotification({ type: 'error', message: 'Falha ao carregar organizadores' }));
    fetchCourts().catch(() => addNotification({ type: 'error', message: 'Falha ao carregar quadras' }));
  }, [fetchOrganizers, fetchCourts, addNotification]);

  // Update commission rate when organizer changes
  const selectedOrganizerId = watch('organizerId');
  useEffect(() => {
    if (selectedOrganizerId) {
      const selectedOrganizer = organizers.find(o => o.id === selectedOrganizerId);
      if (selectedOrganizer) {
        // Set commission rate only if it's not already set or if it differs
        // This prevents overwriting a manually entered commission rate
        const currentCommission = watch('organizerCommissionRate');
        if (currentCommission === null || currentCommission === undefined) {
           setValue('organizerCommissionRate', selectedOrganizer.defaultCommissionRate);
        }
      }
    } else {
       // Optionally clear commission if organizer is deselected
       // setValue('organizerCommissionRate', null);
    }
  }, [selectedOrganizerId, organizers, setValue, watch]);


  const addCategory = () => {
    if (newCategory.trim()) {
      const currentCategories = watch('categories') || [];
      if (!currentCategories.includes(newCategory.trim())) {
        setValue('categories', [...currentCategories, newCategory.trim()]);
        setNewCategory('');
      }
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    const currentCategories = watch('categories') || [];
    setValue('categories', currentCategories.filter(cat => cat !== categoryToRemove));
  };

  const onSubmit = async (data: EventFormValues) => {
    try {
      const eventData: Partial<Event> = {
        ...data,
        // Ensure numbers are numbers
        price: Number(data.price),
        maxParticipants: Number(data.maxParticipants),
        // Change null to undefined for optional properties
        organizerCommissionRate: data.organizerCommissionRate !== null && data.organizerCommissionRate !== undefined ? Number(data.organizerCommissionRate) : undefined,
        organizerId: data.organizerId || undefined,
        bannerImageUrl: data.bannerImageUrl || undefined,
        courtIds: data.courtIds || [],
        categories: data.categories || [],
      };

      if (isEditMode && id) {
        await updateEvent(id, eventData);
        addNotification({ type: 'success', message: 'Evento atualizado com sucesso!' });
      } else {
        await createEvent(eventData);
        addNotification({ type: 'success', message: 'Evento criado com sucesso!' });
      }
      navigate('/eventos');
    } catch (err) {
      addNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao salvar evento'
      });
    }
  };

  // Loading state for form submission or initial data load
  const formLoading = loading || isSubmitting || (isEditMode && !currentEvent);

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title={isEditMode ? 'Editar Evento' : 'Novo Evento'}
        description={isEditMode ? 'Atualize os detalhes do evento' : 'Preencha as informações para criar um novo evento'}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 bg-white p-6 rounded-lg shadow border border-brand-gray space-y-6">

        {/* Basic Info Section */}
        <fieldset className="border border-brand-gray p-4 rounded-lg">
          <legend className="text-sm font-medium text-brand-blue px-2 flex items-center"><Info size={16} className="mr-1" />Informações Básicas</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* ... Title, Type, Location ... */}
             <div>
              <Label htmlFor="title">Título do Evento</Label>
              <Input id="title" {...register('title')} error={errors.title?.message} />
            </div>
             <div>
              <Label htmlFor="type">Tipo</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select id="type" {...field} error={!!errors.type}>
                    <option value={EventType.TOURNAMENT}>Torneio</option>
                    <option value={EventType.POOL}>Bolão</option>
                  </Select>
                )}
              />
            </div>
             <div>
              <Label htmlFor="location">Localização</Label>
              <Input id="location" {...register('location')} error={errors.location?.message} />
            </div>
          </div>
           <div className="mt-4">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register('description')} rows={3} error={errors.description?.message} />
            </div>
        </fieldset>

        {/* Date & Time Section */}
        <fieldset className="border border-brand-gray p-4 rounded-lg">
           <legend className="text-sm font-medium text-brand-blue px-2 flex items-center"><Calendar size={16} className="mr-1" />Data e Hora</legend>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register('date')} error={errors.date?.message} />
            </div>
            <div>
              <Label htmlFor="time">Hora</Label>
              <Input id="time" type="time" {...register('time')} error={errors.time?.message} />
            </div>
          </div>
        </fieldset>

        {/* Details Section */}
        <fieldset className="border border-brand-gray p-4 rounded-lg">
          <legend className="text-sm font-medium text-brand-blue px-2 flex items-center"><List size={16} className="mr-1" />Detalhes</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {/* ... Price, Max Participants, Prize ... */}
             <div>
              <Label htmlFor="price">Preço da Inscrição (R$)</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} error={errors.price?.message} />
            </div>
            <div>
              <Label htmlFor="maxParticipants">Máx. Participantes</Label>
              <Input id="maxParticipants" type="number" {...register('maxParticipants')} error={errors.maxParticipants?.message} />
            </div>
             <div>
              <Label htmlFor="prize">Premiação</Label>
              <Input id="prize" {...register('prize')} error={errors.prize?.message} />
            </div>
          </div>
           <div className="mt-4">
              <Label htmlFor="rules">Regras</Label>
              <Textarea id="rules" {...register('rules')} rows={3} error={errors.rules?.message} />
            </div>
           <div className="mt-4">
              <Label htmlFor="bannerImageUrl">URL da Imagem do Banner</Label>
              <Input id="bannerImageUrl" {...register('bannerImageUrl')} error={errors.bannerImageUrl?.message} />
            </div>
        </fieldset>

        {/* Configuration Section */}
        <fieldset className="border border-brand-gray p-4 rounded-lg">
          <legend className="text-sm font-medium text-brand-blue px-2 flex items-center"><ShieldCheck size={16} className="mr-1" />Configurações</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* ... Team Formation ... */}
             <div>
              <Label htmlFor="teamFormation">Formação de Times</Label>
              <Controller
                name="teamFormation"
                control={control}
                render={({ field }) => (
                  <Select id="teamFormation" {...field} error={!!errors.teamFormation}>
                    <option value={TeamFormationType.FORMED}>Duplas Formadas</option>
                    <option value={TeamFormationType.RANDOM}>Duplas Aleatórias</option>
                  </Select>
                )}
              />
            </div>

            {/* Organizer Selection */}
            <div>
              <Label htmlFor="organizerId">Organizador</Label>
              <Controller
                name="organizerId"
                control={control}
                render={({ field }) => (
                  <Select
                    id="organizerId"
                    {...field}
                    value={field.value ?? ''} // Handle null value for select
                    error={!!errors.organizerId}
                    disabled={loadingOrganizers}
                  >
                    <option value="">Nenhum (Admin)</option>
                    {organizers.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </Select>
                )}
              />
            </div>

            {/* Organizer Commission */}
            <div>
              <Label htmlFor="organizerCommissionRate">Comissão do Organizador (%)</Label>
              <Input
                id="organizerCommissionRate"
                type="number"
                step="0.1"
                {...register('organizerCommissionRate')}
                error={errors.organizerCommissionRate?.message}
                disabled={!selectedOrganizerId} // Disable if no organizer selected
              />
            </div>
          </div>

           {/* Categories */}
           <div className="mt-4">
              <Label>Categorias</Label>
              <div className="flex items-center gap-2 mb-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nova categoria"
                  className="flex-grow"
                />
                <Button type="button" variant="outline" onClick={addCategory}><Plus size={16} /></Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(watch('categories') || []).map(cat => (
                  <span key={cat} className="flex items-center bg-brand-purple/10 text-brand-purple text-xs px-3 py-1 rounded-full">
                    {cat}
                    <button type="button" onClick={() => removeCategory(cat)} className="ml-1.5 text-brand-purple/70 hover:text-brand-purple">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

          {/* Court Selection */}
          <div className="mt-4">
            <Label>Quadras Disponíveis para o Evento</Label>
            {loadingCourts ? (
              <p className="text-sm text-gray-500">Carregando quadras...</p>
            ) : courts.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma quadra cadastrada.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border p-2 rounded-md">
                <Controller
                  name="courtIds"
                  control={control}
                  render={({ field }) => (
                    <>
                      {courts.map(court => (
                        <label key={court.id} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                          <Checkbox
                            id={`court-${court.id}`}
                            checked={field.value?.includes(court.id)}
                            // Add explicit type for checked parameter
                            onCheckedChange={(checked: boolean | 'indeterminate') => {
                              const currentIds = field.value || [];
                              if (checked) {
                                field.onChange([...currentIds, court.id]);
                              } else {
                                field.onChange(currentIds.filter(id => id !== court.id));
                              }
                            }}
                          />
                          <span className="text-sm">{court.name} ({court.location})</span>
                        </label>
                      ))}
                    </>
                  )}
                />
              </div>
            )}
             {errors.courtIds && <p className="text-red-500 text-xs mt-1">{errors.courtIds.message}</p>}
          </div>
        </fieldset>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-brand-gray">
          <Button type="button" variant="outline" onClick={() => setShowPreviewModal(true)}>
            <Eye size={18} className="mr-1" /> Pré-visualizar
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/eventos')}>
            <X size={18} className="mr-1" /> Cancelar
          </Button>
          <Button type="submit" disabled={formLoading}>
            {formLoading ? <Loader2 size={18} className="mr-1 animate-spin" /> : <Save size={18} className="mr-1" />}
            {isEditMode ? 'Salvar Alterações' : 'Criar Evento'}
          </Button>
        </div>
      </form>

      {/* Preview Modal */}
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title="Pré-visualização do Evento">
        <TournamentCard
          tournament={{ ...watchedFormData, id: id || 'preview-id' } as Event} // Cast watched data to Event for preview
          showActions={false}
        />
      </Modal>
    </div>
  );
};
