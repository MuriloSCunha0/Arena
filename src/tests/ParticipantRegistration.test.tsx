import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventRegistration from '../pages/public/EventRegistration';
import EventsList from '../pages/events/EventsList';
import UserProfilePage from '../pages/profile/UserProfilePage';

// Mock de dados e funções de navegação/usuário
jest.mock('../store', () => ({
  useEventsStore: () => ({
    events: [
      { id: '1', title: 'Super 8 Teste', type: 'SUPER8', format: 'SUPER8', ...{} },
    ],
    fetchEvents: jest.fn(),
  }),
  useUserStore: () => ({
    user: { id: 'user1', name: 'Participante Teste' },
  }),
}));

describe('Inscrição do participante', () => {
  it('permite inscrição pelo link público', () => {
    render(<EventRegistration eventId="1" />);
    const btn = screen.getByRole('button', { name: /inscrever/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByText(/inscrição realizada/i)).toBeInTheDocument();
  });

  it('permite inscrição pela aba de torneios no perfil do usuário', () => {
    render(<UserProfilePage />);
    // Simula navegação até aba de torneios
    const tab = screen.getByRole('tab', { name: /torneios/i });
    fireEvent.click(tab);
    // Botão de inscrição deve aparecer
    const btn = screen.getByRole('button', { name: /inscrever/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.getByText(/inscrição realizada/i)).toBeInTheDocument();
  });
});
