// Exportações simplificadas das stores
import { useEventsStore } from './eventsStore';
import { useParticipantsStore } from './participantsStore';
import { useFinancialsStore } from './financialsStore';
import { useTournamentStore } from './tournamentStore';
import { useAuthStore } from './authStore';
import { useCourtsStore } from './courtsStore';
import { useOrganizersStore } from './organizersStore';
import { useNotificationStore } from '../components/ui/Notification';

export {
  useEventsStore,
  useParticipantsStore,
  useFinancialsStore,
  useTournamentStore,
  useAuthStore,
  useCourtsStore,
  useOrganizersStore,
  useNotificationStore
};
