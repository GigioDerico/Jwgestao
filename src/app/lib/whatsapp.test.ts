import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getAppSetting: vi.fn(async (key: string) => key === 'uazapi_instance' ? 'instance' : 'token'),
  invoke: vi.fn(async () => ({ data: {}, error: null })),
}));
vi.mock('./api', () => ({ api: { getAppSetting: mocks.getAppSetting } }));
vi.mock('./supabase', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
import { buildDesignationMessage, openDesignationInWhatsAppWithLink, sendDesignationWhatsApp } from './whatsapp';

const url = 'https://jwgestao.vercel.app/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001';
const data = { studentName: 'Ana', date: '06/10', partNumber: 3, location: 'Sala principal', phone: '11999999999' };

describe('meeting designation WhatsApp modes', () => {
  beforeEach(() => { mocks.getAppSetting.mockClear(); mocks.invoke.mockClear(); });
  it('sends the recipient link through the integrated WhatsApp API', async () => {
    await sendDesignationWhatsApp({ ...data, assignmentUrl: url });
    const body = mocks.invoke.mock.calls[0][1]?.body as any;
    expect(body.payload.text).toContain(url);
    expect(body.payload.number).toBe('5511999999999');
  });
  it('reserves a browser window synchronously before awaiting the assignment link', async () => {
    const popup = { location: { href: '' }, close: vi.fn(), opener: {} } as any;
    const open = vi.spyOn(window, 'open').mockReturnValue(popup);
    let supplyUrl!: (value: string) => void;
    const resolve = vi.fn(() => new Promise<string | undefined>(done => { supplyUrl = done; }));
    const operation = openDesignationInWhatsAppWithLink(data, resolve);
    expect(open).toHaveBeenCalledOnce();
    expect(resolve).toHaveBeenCalledOnce();
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(resolve.mock.invocationCallOrder[0]);
    supplyUrl(url);
    await operation;
    expect(popup.location.href).toMatch(/^https:\/\/wa\.me\//);
    expect(decodeURIComponent(popup.location.href)).toContain(url);
    open.mockRestore();
  });
  it('closes the reserved window when preparing the link fails', async () => {
    const popup = { location: { href: '' }, close: vi.fn(), opener: {} } as any;
    vi.spyOn(window, 'open').mockReturnValue(popup);
    await expect(openDesignationInWhatsAppWithLink(data, async () => { throw new Error('no notification'); })).rejects.toThrow('no notification');
    expect(popup.close).toHaveBeenCalledOnce();
    vi.mocked(window.open).mockRestore();
  });
  it('keeps non-meeting WhatsApp copy unchanged without an assignment URL', () => {
    expect(buildDesignationMessage(data)).not.toContain('confirme sua participação');
  });
});
