import { describe, expect, it, vi } from 'vitest';
import type { AssignmentNotification } from '../types';
import {
  resolveAssignmentCalendarSource,
  type AssignmentCalendarApi,
} from './assignment-calendar-source';

const notification = (overrides: Partial<AssignmentNotification> = {}): AssignmentNotification => ({
  id: 'notification-1',
  memberId: 'member-1',
  category: 'midweek',
  sourceType: 'midweek_meeting_role',
  sourceId: 'source-1',
  slotKey: 'president_id',
  title: 'Nova designação',
  message: 'Você foi designado para esta atividade.',
  assignmentDate: '2026-09-16',
  status: 'confirmed',
  isRead: true,
  createdAt: '2026-09-01T12:00:00Z',
  confirmedAt: '2026-09-01T13:00:00Z',
  ...overrides,
});

const midweekMeeting = {
  id: 'midweek-1',
  date: '2026-09-16',
  opening_song_time: '19:30:00',
  closing_comments_time: '21:10:00',
  closing_comments_duration: 5,
  ministry_parts: [],
  christian_life_parts: [],
};

function createApi(overrides: Partial<AssignmentCalendarApi> = {}): AssignmentCalendarApi {
  return {
    getAudioVideoAssignmentById: vi.fn().mockResolvedValue(null),
    getFieldServiceAssignmentById: vi.fn().mockResolvedValue(null),
    getCartAssignmentById: vi.fn().mockResolvedValue(null),
    getMidweekMinistryPartCalendarSource: vi.fn().mockResolvedValue(null),
    getMidweekChristianLifePartCalendarSource: vi.fn().mockResolvedValue(null),
    getMidweekMeetingById: vi.fn().mockResolvedValue(null),
    getWeekendMeetingById: vi.fn().mockResolvedValue(null),
    getAppSetting: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('resolveAssignmentCalendarSource', () => {
  it('resolves a midweek meeting role with the complete stored period', async () => {
    const api = createApi({
      getMidweekMeetingById: vi.fn().mockResolvedValue(midweekMeeting),
    });

    const result = await resolveAssignmentCalendarSource(notification(), api, {});

    expect(result).toMatchObject({
      kind: 'meeting',
      notificationId: 'notification-1',
      sourceId: 'source-1',
      slotKey: 'president_id',
      roleLabel: 'Presidente',
      date: '2026-09-16',
      startTime: '19:30',
      endTime: '21:15',
    });
    expect(result.description).toContain('Presidente');
    expect(result.description).toContain(notification().message);
  });

  it('resolves ministry and christian-life parts through their parent meeting', async () => {
    const ministryApi = createApi({
      getMidweekMinistryPartCalendarSource: vi.fn().mockResolvedValue({
        id: 'ministry-1',
        title: 'Iniciando conversas',
        room: 'Sala B',
        meeting: midweekMeeting,
      }),
    });
    const lifeApi = createApi({
      getMidweekChristianLifePartCalendarSource: vi.fn().mockResolvedValue({
        id: 'life-1',
        title: 'Necessidades locais',
        meeting: midweekMeeting,
      }),
    });

    const ministry = await resolveAssignmentCalendarSource(notification({
      sourceType: 'midweek_ministry_part',
      sourceId: 'ministry-1',
      slotKey: 'assistant_id',
    }), ministryApi, {});
    const christianLife = await resolveAssignmentCalendarSource(notification({
      sourceType: 'midweek_christian_life_part',
      sourceId: 'life-1',
      slotKey: 'speaker_id',
    }), lifeApi, {});

    expect(ministry).toMatchObject({
      kind: 'meeting',
      roleLabel: 'Iniciando conversas — Ajudante',
      date: '2026-09-16',
      startTime: '19:30',
      endTime: '21:15',
      location: 'Sala B',
    });
    expect(christianLife).toMatchObject({
      kind: 'meeting',
      roleLabel: 'Necessidades locais — Orador',
      date: '2026-09-16',
      startTime: '19:30',
      endTime: '21:15',
    });
  });

  it('falls back to meeting settings when a meeting has no stored start', async () => {
    const midweekApi = createApi({
      getMidweekMeetingById: vi.fn().mockResolvedValue({ id: 'midweek-1', date: '2026-09-16' }),
    });
    const weekendApi = createApi({
      getWeekendMeetingById: vi.fn().mockResolvedValue({ id: 'weekend-1', date: '2026-09-20' }),
    });

    const midweek = await resolveAssignmentCalendarSource(notification(), midweekApi, {
      midweekTime: '19:15',
    });
    const weekend = await resolveAssignmentCalendarSource(notification({
      category: 'weekend',
      sourceType: 'weekend_meeting_role',
      sourceId: 'weekend-1',
      slotKey: 'watchtower_reader_id',
    }), weekendApi, { weekendTime: '18:00' });

    expect(midweek).toMatchObject({ startTime: '19:15', endTime: undefined });
    expect(weekend).toMatchObject({
      kind: 'meeting',
      roleLabel: 'Leitor da Sentinela',
      date: '2026-09-20',
      startTime: '18:00',
      endTime: undefined,
    });
  });

  it('associates audio/video with the meeting on the assignment date', async () => {
    const api = createApi({
      getAudioVideoAssignmentById: vi.fn().mockResolvedValue({
        id: 'audio-1',
        date: '2026-09-16',
        weekday: 'Quarta',
        midweek_meeting: midweekMeeting,
        weekend_meeting: null,
      }),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      category: 'audio_video',
      sourceType: 'audio_video_role',
      sourceId: 'audio-1',
      slotKey: 'sound',
    }), api, { midweekTime: '19:00' });

    expect(result).toMatchObject({
      kind: 'meeting',
      roleLabel: 'Som',
      date: '2026-09-16',
      startTime: '19:30',
      endTime: '21:15',
    });
  });

  it('derives the cart date and preserves its interval and location', async () => {
    const api = createApi({
      getCartAssignmentById: vi.fn().mockResolvedValue({
        id: 'cart-1',
        year: 2026,
        month: 9,
        day: 15,
        time: '09:00 às 11:00',
        location: 'Hospital',
      }),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      category: 'cart',
      sourceType: 'cart_assignment',
      sourceId: 'cart-1',
      slotKey: 'publisher2',
    }), api, {});

    expect(result).toMatchObject({
      kind: 'cart',
      roleLabel: 'Publicador 2',
      date: '2026-09-15',
      timeRange: '09:00 às 11:00',
      location: 'Hospital',
    });
  });

  it('preserves field-service recurrence data and maps Portuguese weekdays', async () => {
    const api = createApi({
      getFieldServiceAssignmentById: vi.fn().mockResolvedValue({
        id: 'field-1',
        date: null,
        year: 2026,
        month: 9,
        weekday: 'Segunda-feira',
        time: '08:45',
        location: 'Salão do Reino',
      }),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      category: 'field_service',
      sourceType: 'field_service_assignment',
      sourceId: 'field-1',
      slotKey: 'responsible',
    }), api, {});

    expect(result).toMatchObject({
      kind: 'field_service',
      recurring: true,
      roleLabel: 'Responsável',
      year: 2026,
      month: 9,
      weekday: 1,
      startTime: '08:45',
      location: 'Salão do Reino',
    });
  });

  it('marks an explicitly dated field-service assignment as non-recurring', async () => {
    const api = createApi({
      getFieldServiceAssignmentById: vi.fn().mockResolvedValue({
        id: 'field-1',
        date: '2026-09-19',
        year: 2026,
        month: 9,
        weekday: 'Sábado',
        time: '16:30',
        location: 'Praça',
      }),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      category: 'field_service',
      sourceType: 'field_service_assignment',
      sourceId: 'field-1',
      slotKey: 'responsible',
    }), api, {});

    expect(result).toMatchObject({ recurring: false, weekday: 6 });
  });

  it('fails with user-facing errors for missing, unsupported and incomplete sources', async () => {
    await expect(resolveAssignmentCalendarSource(notification(), createApi(), {}))
      .rejects.toThrow('Não foi possível encontrar a designação');
    await expect(resolveAssignmentCalendarSource(notification({ sourceType: 'unknown' }), createApi(), {}))
      .rejects.toThrow('não é compatível com o calendário');
    await expect(resolveAssignmentCalendarSource(notification({
      category: 'weekend',
      sourceType: 'weekend_meeting_role',
    }), createApi({
      getWeekendMeetingById: vi.fn().mockResolvedValue({ id: 'weekend-1', date: '2026-09-20' }),
    }), {})).rejects.toThrow('Defina o horário da reunião');
  });

  it('rejects missing and ambiguous assignment times', async () => {
    const missingCartTime = createApi({
      getCartAssignmentById: vi.fn().mockResolvedValue({
        id: 'cart-1', year: 2026, month: 9, day: 15, time: '', location: 'Hospital',
      }),
    });
    const ambiguousFieldTime = createApi({
      getFieldServiceAssignmentById: vi.fn().mockResolvedValue({
        id: 'field-1', date: null, year: 2026, month: 9,
        weekday: 'Domingo', time: '08:30 / 08:45', location: '',
      }),
    });

    await expect(resolveAssignmentCalendarSource(notification({
      sourceType: 'cart_assignment', sourceId: 'cart-1', slotKey: 'publisher1',
    }), missingCartTime, {})).rejects.toThrow('Defina o horário da designação de carrinho');
    await expect(resolveAssignmentCalendarSource(notification({
      sourceType: 'field_service_assignment', sourceId: 'field-1', slotKey: 'responsible',
    }), ambiguousFieldTime, {})).rejects.toThrow('Defina um único horário');
  });
});
