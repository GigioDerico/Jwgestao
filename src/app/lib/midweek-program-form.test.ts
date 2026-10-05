import { describe, expect, it } from 'vitest';
import { mapChristianLifeDraftsForSave, mapMinistryDraftsForSave } from './midweek-program-form';

describe('midweek meeting edit form serialization', () => {
  it('keeps ministry part IDs through the reorder and save mapping', () => {
    const parts = mapMinistryDraftsForSave([
      { id: 'part-b', time: '20:05', title: ' Parte B ', duration: '5', studentId: 'student-b', assistantId: '' },
      { id: 'part-a', time: '20:10', title: 'Parte A', duration: '4', studentId: '', assistantId: '' },
      { time: '20:14', title: 'Nova', duration: '3', studentId: '', assistantId: '' },
    ]);

    expect(parts).toEqual([
      { id: 'part-b', time: '20:05', title: 'Parte B', duration: '5', studentId: 'student-b', assistantId: '' },
      { id: 'part-a', time: '20:10', title: 'Parte A', duration: '4', studentId: '', assistantId: '' },
      { id: undefined, time: '20:14', title: 'Nova', duration: '3', studentId: '', assistantId: '' },
    ]);
  });

  it('keeps Christian life part IDs through the save mapping', () => {
    expect(mapChristianLifeDraftsForSave([
      { id: 'life-part', time: '20:20', title: ' Consideração ', duration: '10', speakerId: 'speaker-id' },
      { time: '20:30', title: 'Nova parte', duration: '5', speakerId: '' },
    ])).toEqual([
      { id: 'life-part', time: '20:20', title: 'Consideração', duration: '10', speakerId: 'speaker-id' },
      { id: undefined, time: '20:30', title: 'Nova parte', duration: '5', speakerId: '' },
    ]);
  });
});
