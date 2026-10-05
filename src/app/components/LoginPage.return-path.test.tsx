import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

const auth = vi.hoisted(() => ({ user: null as any, login: vi.fn(async () => null), loading: false }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
const target = '/assignments/meetings/respond/123e4567-e89b-42d3-a456-426614174000?revision=123e4567-e89b-42d3-a456-426614174001';
function renderLogin(entry: string) {
  return render(<MemoryRouter initialEntries={[entry]}><Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/assignments/meetings/respond/:id" element={<div>Destino da designação</div>} />
    <Route path="/dashboard" element={<div>Painel</div>} />
  </Routes></MemoryRouter>);
}
describe('LoginPage return destination', () => {
  beforeEach(() => { auth.user = null; auth.login.mockClear(); auth.login.mockResolvedValue(null); });
  it('returns to the validated response path after successful login', async () => {
    renderLogin(`/?returnTo=${encodeURIComponent(target)}`);
    fireEvent.change(document.querySelector('[name=username]') as HTMLInputElement, { target: { value: '11999999999' } });
    fireEvent.change(document.querySelector('[name=password]') as HTMLInputElement, { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Destino da designação')).toBeVisible());
  });
  it('returns an already authenticated user to that path', async () => {
    auth.user = { id: 'member' };
    renderLogin(`/?returnTo=${encodeURIComponent(target)}`);
    expect(await screen.findByText('Destino da designação')).toBeVisible();
  });
  it('sends malformed and external return destinations to the dashboard after login', async () => {
    renderLogin('/?returnTo=%2F%2Fevil.test');
    fireEvent.change(document.querySelector('[name=username]') as HTMLInputElement, { target: { value: '11999999999' } });
    fireEvent.change(document.querySelector('[name=password]') as HTMLInputElement, { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(screen.getByText('Painel')).toBeVisible());
  });
});
