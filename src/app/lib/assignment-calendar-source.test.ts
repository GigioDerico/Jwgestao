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
    getMidweekMeetingByDate: vi.fn().mockResolvedValue(null),
    getWeekendMeetingByDate: vi.fn().mockResolvedValue(null),
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
    const weekendMeeting = {
      id: 'weekend-1',
      date: '2026-09-20',
      start_time: '18:30:00',
      end_time: '20:15:00',
    };
    const api = createApi({
      getAudioVideoAssignmentById: vi.fn().mockResolvedValue({
        id: 'audio-1',
        date: '2026-09-19',
        weekday: 'Sábado',
        time: '17:00',
      }),
      getMidweekMeetingByDate: vi.fn().mockResolvedValue(null),
      getWeekendMeetingByDate: vi.fn().mockResolvedValue(weekendMeeting),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      category: 'audio_video',
      sourceType: 'audio_video_role',
      sourceId: 'audio-1',
      assignmentDate: '2026-09-20',
      slotKey: 'sound',
    }), api, { weekendTime: '18:00' });

    expect(result).toMatchObject({
      kind: 'meeting',
      roleLabel: 'Som',
      date: '2026-09-20',
      startTime: '18:30',
      endTime: '20:15',
    });
    expect(api.getMidweekMeetingByDate).toHaveBeenCalledWith('2026-09-20');
    expect(api.getWeekendMeetingByDate).toHaveBeenCalledWith('2026-09-20');
  });

  it('falls back to the audio/video row date and the configured meeting time', async () => {
    const api = createApi({
      getAudioVideoAssignmentById: vi.fn().mockResolvedValue({
        id: 'audio-1',
        date: '2026-09-16',
        time: '17:00',
      }),
      getMidweekMeetingByDate: vi.fn().mockResolvedValue({
        id: 'midweek-1',
        closing_comments_time: '21:10:00',
        closing_comments_duration: 5,
      }),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      category: 'audio_video',
      sourceType: 'audio_video_role',
      sourceId: 'audio-1',
      assignmentDate: null,
      slotKey: 'image',
    }), api, { midweekTime: '19:15', weekendTime: null });

    expect(result).toMatchObject({
      kind: 'meeting',
      date: '2026-09-16',
      startTime: '19:15',
      endTime: '21:15',
    });
    expect(result.startTime).not.toBe('17:00');
  });

  it.each([
    ['president', 'Presidente', 'midweek_meeting_role'],
    ['opening_prayer', 'Oração Inicial', 'midweek_meeting_role'],
    ['closing_prayer', 'Oração Final', 'midweek_meeting_role'],
    ['treasure_talk_speaker_id', 'Tesouros da Palavra', 'midweek_meeting_role'],
    ['treasure_gems_speaker_id', 'Joias Espirituais', 'midweek_meeting_role'],
    ['treasure_reading_student_id', 'Leitura da Bíblia', 'midweek_meeting_role'],
    ['cbs_conductor_id', 'Dirigente do Estudo', 'midweek_meeting_role'],
    ['cbs_reader_id', 'Leitor do Estudo', 'midweek_meeting_role'],
    ['student_id', 'Estudante', 'midweek_ministry_part'],
    ['assistant_id', 'Ajudante', 'midweek_ministry_part'],
    ['speaker_id', 'Orador', 'midweek_christian_life_part'],
    ['sound', 'Som', 'audio_video_role'],
    ['image', 'Imagem', 'audio_video_role'],
    ['stage', 'Palco', 'audio_video_role'],
    ['roving_mic_1', 'Microfone Volante 1', 'audio_video_role'],
    ['roving_mic_2', 'Microfone Volante 2', 'audio_video_role'],
    ['attendant:0', 'Indicador 1', 'audio_video_role'],
    ['attendant:2', 'Indicador 3', 'audio_video_role'],
    ['responsible', 'Responsável', 'field_service_assignment'],
    ['responsible_2', 'Responsável', 'field_service_assignment'],
    ['publisher1', 'Publicador 1', 'cart_assignment'],
    ['publisher2', 'Publicador 2', 'cart_assignment'],
  ] as const)('maps slot %s to %s', async (slotKey, expected, sourceType) => {
    const api = createApi({
      getMidweekMeetingById: vi.fn().mockResolvedValue(midweekMeeting),
      getMidweekMinistryPartCalendarSource: vi.fn().mockResolvedValue({
        id: 'part-1', meeting: midweekMeeting,
      }),
      getMidweekChristianLifePartCalendarSource: vi.fn().mockResolvedValue({
        id: 'part-1', meeting: midweekMeeting,
      }),
      getAudioVideoAssignmentById: vi.fn().mockResolvedValue({
        id: 'audio-1', date: '2026-09-16',
      }),
      getMidweekMeetingByDate: vi.fn().mockResolvedValue(midweekMeeting),
      getFieldServiceAssignmentById: vi.fn().mockResolvedValue({
        id: 'field-1', date: '2026-09-16', year: 2026, month: 9,
        weekday: 'Quarta-feira', time: '08:45', location: '',
      }),
      getCartAssignmentById: vi.fn().mockResolvedValue({
        id: 'cart-1', year: 2026, month: 9, day: 16,
        time: '09:00 às 11:00', location: '',
      }),
    });

    const result = await resolveAssignmentCalendarSource(notification({
      sourceType,
      sourceId: sourceType === 'midweek_meeting_role' ? 'midweek-1' : 'source-1',
      slotKey,
    }), api, {});

    expect(result.roleLabel).toBe(expected);
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

  it('rejects audio/video assignments with missing dates or meetings', async () => {
    const missingDateApi = createApi({
      getAudioVideoAssignmentById: vi.fn().mockResolvedValue({ id: 'audio-1', date: null }),
    });
    const missingMeetingApi = createApi({
      getAudioVideoAssignmentById: vi.fn().mockResolvedValue({ id: 'audio-1', date: '2026-09-16' }),
    });

    await expect(resolveAssignmentCalendarSource(notification({
      sourceType: 'audio_video_role', assignmentDate: null,
    }), missingDateApi, {})).rejects.toThrow('data');
    await expect(resolveAssignmentCalendarSource(notification({
      sourceType: 'audio_video_role', assignmentDate: null,
    }), missingMeetingApi, {})).rejects.toThrow('reunião');
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

  it('rejects a field-service source without a weekday with a clear error', async () => {
    const api = createApi({
      getFieldServiceAssignmentById: vi.fn().mockResolvedValue({
        id: 'field-1', date: null, year: 2026, month: 9,
        weekday: null, time: '08:30', location: '',
      }),
    });

    await expect(resolveAssignmentCalendarSource(notification({
      sourceType: 'field_service_assignment', sourceId: 'field-1', slotKey: 'responsible',
    }), api, {})).rejects.toThrow('Defina o dia da semana');
  });
});
