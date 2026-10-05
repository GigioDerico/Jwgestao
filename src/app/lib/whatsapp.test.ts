import { describe, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ api: {} }));
vi.mock('./supabase', () => ({ supabase: {} }));
import { buildDesignationMessage } from './whatsapp';

describe('meeting designation WhatsApp copy', () => {
  it.each(['integrated send', 'manual open'])('includes the recipient-specific response link for %s', mode => {
    const url = 'https://jwgestao.vercel.app/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001';
    const text = buildDesignationMessage({ studentName: 'Ana', date: '06/10', partNumber: 3, location: 'Sala principal', phone: '11999999999', assignmentUrl: url });
    expect(text).toContain('Confira os detalhes e confirme sua participação ou informe se não puder participar:');
    expect(text).toContain(url);
  });
  it('preserves the existing message when no meeting link is supplied', () => {
    expect(buildDesignationMessage({ studentName: 'Ana', date: '06/10', partNumber: 3, location: 'Sala principal', phone: '11999999999' }))
      .not.toContain('confirme sua participação');
  });
});
