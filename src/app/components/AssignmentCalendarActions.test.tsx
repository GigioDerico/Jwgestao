import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import type { AssignmentNotification } from '../types';
import type { AssignmentCalendarSource } from '../lib/assignment-calendar-source';
import { resolveAssignmentCalendarSource } from '../lib/assignment-calendar-source';
import { deliverCalendarEvents } from '../lib/calendar-delivery';
import { AssignmentCalendarActions } from './AssignmentCalendarActions';

vi.mock('../lib/api', () => ({ api: {} }));
vi.mock('../lib/assignment-calendar-source', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/assignment-calendar-source')>();
  return { ...actual, resolveAssignmentCalendarSource: vi.fn() };
});
vi.mock('../lib/calendar-delivery', () => ({ deliverCalendarEvents: vi.fn() }));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const confirmedCart: AssignmentNotification = {
  id: 'notification-1',
  memberId: 'member-1',
  category: 'cart',
  sourceType: 'cart_assignment',
  sourceId: 'cart-1',
  slotKey: 'publisher1',
  title: 'Carrinho',
  message: 'Hospital, 09:00 às 11:00',
  assignmentDate: '2026-09-15',
  status: 'confirmed',
  isRead: true,
  createdAt: '2026-09-01T12:00:00Z',
};

const cartSource: AssignmentCalendarSource = {
  kind: 'cart',
  notificationId: 'notification-1',
  sourceId: 'cart-1',
  slotKey: 'publisher1',
  roleLabel: 'Publicador 1',
  date: '2026-09-15',
  timeRange: '09:00 às 11:00',
  location: 'Hospital',
  description: 'Carrinho de testemunho público',
};

const recurringFieldSource: AssignmentCalendarSource = {
  kind: 'field_service',
  recurring: true,
  notificationId: 'notification-field',
  sourceId: 'field-1',
  slotKey: 'responsible',
  roleLabel: 'Responsável',
  year: 2026,
  month: 9,
  weekday: 1,
  startTime: '08:30',
  location: 'Salão do Reino',
  description: 'Saída de campo',
};

const datedFieldSource: AssignmentCalendarSource = {
  kind: 'field_service',
  recurring: false,
  notificationId: 'notification-dated-field',
  sourceId: 'field-dated-1',
  slotKey: 'responsible',
  roleLabel: 'Responsável',
  year: 2026,
  month: 9,
  weekday: 0,
  startTime: '08:30',
  location: 'Salão do Reino',
  description: 'Saída de campo',
  date: '2026-09-15',
};

const confirmedField: AssignmentNotification = {
  ...confirmedCart,
  id: 'notification-field',
  category: 'field_service',
  sourceType: 'field_service_assignment',
  sourceId: 'field-1',
  slotKey: 'responsible',
  title: 'Saída de campo',
};

describe('AssignmentCalendarActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date(2026, 8, 14, 12));
    vi.mocked(resolveAssignmentCalendarSource).mockResolvedValue(cartSource);
    vi.mocked(deliverCalendarEvents).mockResolvedValue({
      mode: 'native',
      created: 1,
      failed: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the confirmed badge, calendar action and mobile-safe action layout', () => {
    const { container } = render(
      <AssignmentCalendarActions notification={confirmedCart} onHide={vi.fn()} />,
    );

    expect(screen.getByText('Confirmado ✓')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Adicionar ao calendário' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ocultar do painel' })).toBeVisible();
    expect(container.firstChild).toHaveClass('flex', 'flex-wrap');
  });

  it('renders nothing for a pending notification', () => {
    const { container } = render(
      <AssignmentCalendarActions
        notification={{ ...confirmedCart, status: 'pending_confirmation' }}
        onHide={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /adicionar ao calendário/i })).not.toBeInTheDocument();
  });

  it('disables the calendar action and prevents a double submit', async () => {
    let resolveDelivery!: (value: { mode: 'native'; created: number; failed: [] }) => void;
    vi.mocked(deliverCalendarEvents).mockImplementation(
      () => new Promise(resolve => { resolveDelivery = resolve; }),
    );
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedCart} onHide={vi.fn()} />);

    const addButton = screen.getByRole('button', { name: 'Adicionar ao calendário' });
    await user.click(addButton);
    fireEvent.click(addButton);

    expect(deliverCalendarEvents).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Adicionando...' })).toBeDisabled();

    resolveDelivery({ mode: 'native', created: 1, failed: [] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar ao calendário' })).toBeEnabled());
  });

  it('opens recurring field-service choices and reports the monthly count before delivery', async () => {
    vi.mocked(resolveAssignmentCalendarSource).mockResolvedValue(recurringFieldSource);
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedField} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));

    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Somente a próxima' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Todas deste mês' })).toBeVisible();
    expect(screen.getByText(/3 eventos serão adicionados/i)).toBeVisible();
    expect(deliverCalendarEvents).not.toHaveBeenCalled();
  });

  it('cancels the recurring choice without creating events', async () => {
    vi.mocked(resolveAssignmentCalendarSource).mockResolvedValue(recurringFieldSource);
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedField} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deliverCalendarEvents).not.toHaveBeenCalled();
  });

  it('delivers a direct event and shows the singular success toast', async () => {
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedCart} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));

    await waitFor(() => expect(deliverCalendarEvents).toHaveBeenCalledOnce());
    expect(toast.success).toHaveBeenCalledWith('Evento adicionado ao calendário.');
  });

  it('delivers the explicit field-service date as one event', async () => {
    vi.mocked(resolveAssignmentCalendarSource).mockResolvedValue(datedFieldSource);
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedField} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));

    await waitFor(() => expect(deliverCalendarEvents).toHaveBeenCalledOnce());
    expect(deliverCalendarEvents).toHaveBeenCalledWith([
      expect.objectContaining({ uid: expect.stringContaining('2026-09-15') }),
    ]);
  });

  it('delivers all recurring events and shows the plural success toast', async () => {
    vi.mocked(resolveAssignmentCalendarSource).mockResolvedValue(recurringFieldSource);
    vi.mocked(deliverCalendarEvents).mockResolvedValue({
      mode: 'native',
      created: 3,
      failed: [],
    });
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedField} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));
    await user.click(await screen.findByRole('button', { name: 'Todas deste mês' }));

    await waitFor(() => expect(deliverCalendarEvents).toHaveBeenCalledOnce());
    expect(deliverCalendarEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ uid: expect.stringContaining('2026-09-14') }),
      expect.objectContaining({ uid: expect.stringContaining('2026-09-21') }),
      expect.objectContaining({ uid: expect.stringContaining('2026-09-28') }),
    ]));
    expect(toast.success).toHaveBeenCalledWith('3 eventos adicionados ao calendário.');
  });

  it('shows failed dates when native delivery is partially successful', async () => {
    vi.mocked(resolveAssignmentCalendarSource).mockResolvedValue(recurringFieldSource);
    vi.mocked(deliverCalendarEvents).mockResolvedValue({
      mode: 'native',
      created: 2,
      failed: [{
        uid: 'notification-field:field-1:responsible:2026-09-21@jwgestao',
        message: 'Calendário somente leitura',
      }],
    });
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedField} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));
    await user.click(await screen.findByRole('button', { name: 'Todas deste mês' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/2 eventos adicionados.*21\/09\/2026.*calendário somente leitura/i),
    ));
  });

  it('reports ICS fallback with the event dates', async () => {
    vi.mocked(deliverCalendarEvents).mockResolvedValue({ mode: 'ics', created: 0, failed: [] });
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedCart} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(
      expect.stringMatching(/arquivo.*15\/09\/2026/i),
    ));
  });

  it('shows validation errors without attempting delivery', async () => {
    vi.mocked(resolveAssignmentCalendarSource).mockRejectedValue(
      new Error('Defina um único horário antes de adicionar ao calendário.'),
    );
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedCart} onHide={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar ao calendário' }));

    expect(toast.error).toHaveBeenCalledWith('Defina um único horário antes de adicionar ao calendário.');
    expect(deliverCalendarEvents).not.toHaveBeenCalled();
  });

  it('keeps the hide action working for the confirmed notification', async () => {
    const onHide = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<AssignmentCalendarActions notification={confirmedCart} onHide={onHide} />);

    await user.click(screen.getByRole('button', { name: 'Ocultar do painel' }));

    expect(onHide).toHaveBeenCalledWith('notification-1');
  });
});
