// Mock data for GitHub Pages demos
import { Event, Participant, Tournament, Match, FinancialTransaction, EventType, TeamFormationType } from '../types';

// Helper to generate random IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Sample events data
export const sampleEvents: Event[] = [
  {
    id: '1',
    type: EventType.TOURNAMENT,
    title: 'Torneio de Beach Tennis Verão 2023',
    description: 'O maior torneio de beach tennis da temporada de verão.',
    location: 'Arena Beach Club - Av. Beira Mar, 1500',
    date: '2023-12-15',
    time: '09:00',
    price: 120,
    maxParticipants: 32,
    prize: 'R$ 2.000,00 em premiações + brindes dos patrocinadores',
    rules: 'Duplas masculinas e femininas. Formato eliminatório simples.',
    bannerImageUrl: 'https://images.unsplash.com/photo-1562552476-8ac59b2a2e46?ixlib=rb-4.0.3',
    teamFormation: TeamFormationType.FORMED,
    categories: ['Beach Tennis', 'Duplas', 'Adulto'],
    createdAt: '2023-11-01T10:00:00',
    updatedAt: '2023-11-10T14:30:00',
  },
  // Add more sample events as needed
];

// Sample participants data
export const sampleParticipants: Participant[] = [
  {
    id: '101',
    eventId: '1',
    eventName: 'Torneio de Beach Tennis Verão 2023',
    name: 'Carlos Silva',
    email: 'carlos.silva@example.com',
    phone: '(11) 98765-4321',
    partnerId: '102',
    paymentStatus: 'CONFIRMED',
    paymentId: 'pix_123456',
    paymentDate: '2023-11-15T09:30:00',
    registeredAt: '2023-11-10T15:20:00',
  },
  {
    id: '102',
    eventId: '1',
    eventName: 'Torneio de Beach Tennis Verão 2023',
    name: 'Ana Oliveira',
    email: 'ana.oliveira@example.com',
    phone: '(11) 98765-1234',
    partnerId: '101',
    paymentStatus: 'CONFIRMED',
    paymentId: 'pix_123457',
    paymentDate: '2023-11-15T10:15:00',
    registeredAt: '2023-11-10T15:20:00',
  },
  // Add more sample participants as needed
];

// You can add more mock data for tournaments, matches, financial transactions, etc.

// Helper function to determine if we're running on GitHub Pages
export const isGitHubPages = () => window.location.hostname.includes('github.io');

// Export a mock data service that mimics the API responses
export const mockDataService = {
  getEvents: () => Promise.resolve(sampleEvents),
  getEventById: (id: string) => Promise.resolve(sampleEvents.find(e => e.id === id) || null),
  getParticipantsByEvent: (eventId: string) => 
    Promise.resolve(sampleParticipants.filter(p => p.eventId === eventId)),
  // Add more mock methods as needed
};
