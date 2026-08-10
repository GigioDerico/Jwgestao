import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearReadCache } from '../lib/offline-cache';
import { supabase } from '../lib/supabase';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

vi.mock('../lib/offline-cache', () => ({ clearReadCache: vi.fn() }));

const userId = '10000000-0000-0000-0000-000000000002';
const supaUser = { id: userId, email: '11999999999@jwgestao.app' };
const session = { user: supaUser };

const auth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
};
const rpc = vi.mocked(supabase.rpc) as ReturnType<typeof vi.fn>;
const from = vi.mocked(supabase.from) as ReturnType<typeof vi.fn>;
const clearReadCacheMock = vi.mocked(clearReadCache);

let authStateCallback: (event: string, nextSession: typeof session | null) => void;
let unsubscribe: ReturnType<typeof vi.fn>;

function cacheUser(name = 'Membro em cache') {
  localStorage.setItem(`auth_user_cache:${userId}`, JSON.stringify({
    id: userId,
    phone: '11999999999',
    role: 'publicador',
    name,
  }));
}

function mockProfile(name = 'Membro ativo') {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [{ system_role: 'publicador', member_id: 'member-id' }],
      error: null,
    }),
  };
  const memberQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: [{ full_name: name, spiritual_status: 'ativo' }],
      error: null,
    }),
  };
  from.mockImplementation((table: string) => {
    if (table === 'user_profiles') return profileQuery as never;
    if (table === 'members') return memberQuery as never;
    throw new Error(`Tabela inesperada: ${table}`);
  });
}

function Consumer() {
  const { user, session: currentSession, loading, login, refreshUser } = useAuth();
  return (
    <>
      <output data-testid="auth-state">
        {loading ? 'loading' : `${user?.name ?? 'anonymous'}:${currentSession ? 'session' : 'no-session'}`}
      </output>
      <button
        type="button"
        onClick={() => void login('11999999999', 'senha').then(message => {
          const target = document.querySelector('[data-testid="login-result"]');
          if (target) target.textContent = message ?? 'ok';
        })}
      >
        login
      </button>
      <output data-testid="login-result" />
      <button type="button" onClick={() => void refreshUser()}>refresh</button>
    </>
  );
}

function renderAuth(children: ReactNode = <Consumer />) {
  return render(<AuthProvider>{children}</AuthProvider>);
}

describe('AuthProvider active-access validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    unsubscribe = vi.fn();
    auth.getSession.mockResolvedValue({ data: { session }, error: null });
    auth.onAuthStateChange.mockImplementation((callback: typeof authStateCallback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    });
    auth.signOut.mockResolvedValue({ error: null });
    auth.signInWithPassword.mockResolvedValue({ data: { session, user: supaUser }, error: null });
    clearReadCacheMock.mockResolvedValue(undefined);
    mockProfile();
  });

  it('signs out and purges only the authenticated user cache when init finds inactive access', async () => {
    cacheUser();
    localStorage.setItem('auth_user_cache:another-user', 'keep');
    rpc.mockResolvedValue({ data: false, error: null });

    renderAuth();

    expect(screen.getByTestId('auth-state')).toHaveTextContent('loading');
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(clearReadCacheMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).toBeNull();
    expect(localStorage.getItem('auth_user_cache:another-user')).toBe('keep');
    expect(from).not.toHaveBeenCalled();
  });

  it('loads and caches the profile when access is active', async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('Membro ativo:session'));
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(clearReadCacheMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(`auth_user_cache:${userId}`) ?? '{}')).toMatchObject({
      id: userId,
      name: 'Membro ativo',
    });
  });

  it('preserves the offline profile and session when access validation has a network error', async () => {
    cacheUser();
    rpc.mockResolvedValue({ data: null, error: new Error('Failed to fetch') });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('Membro em cache:session'));
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(clearReadCacheMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).not.toBeNull();
  });

  it.each([
    { message: 'Invalid JWT', status: 401 },
    { message: 'permission denied', code: '42501', status: 403 },
    { message: 'Internal Server Error', status: 500 },
    { message: 'Could not find the function', code: 'PGRST202' },
  ])('fails closed instead of exposing cached access for a server error: %j', async error => {
    cacheUser();
    rpc.mockResolvedValue({ data: null, error });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));
    expect(screen.getByTestId('auth-state')).not.toHaveTextContent('Membro em cache');
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).not.toBeNull();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(clearReadCacheMock).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('does not disguise an explicit HTTP authorization response as offline when navigator is offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    cacheUser();
    rpc.mockResolvedValue({ data: null, error: { message: 'Invalid JWT', status: 401 } });

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));
    expect(screen.getByTestId('auth-state')).not.toHaveTextContent('Membro em cache');
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('returns a server validation error from login without exposing or deleting cached access', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    cacheUser();
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'Acesso não autorizado', code: 'PGRST301', status: 401 },
    });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('login-result')).toHaveTextContent('Acesso não autorizado'));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session');
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).not.toBeNull();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(clearReadCacheMock).not.toHaveBeenCalled();
  });

  it.each([false, null])('rejects an inactive login response (%s) and clears local access', async access => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    cacheUser();
    rpc.mockResolvedValue({ data: access, error: null });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(screen.getByTestId('login-result')).toHaveTextContent(
      'Seu acesso a esta congregação foi encerrado.',
    ));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session');
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(clearReadCacheMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).toBeNull();
  });

  it('blocks an inactive auth-state callback without exposing its cached profile', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    cacheUser();
    rpc.mockResolvedValue({ data: false, error: null });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));

    act(() => authStateCallback('SIGNED_IN', session));

    expect(screen.getByTestId('auth-state')).not.toHaveTextContent('Membro em cache');
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session');
    expect(clearReadCacheMock).toHaveBeenCalledTimes(1);
  });

  it('blocks an active session as soon as refresh discovers inactive access', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('Membro ativo:session'));
    rpc.mockResolvedValueOnce({ data: false, error: null });

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(clearReadCacheMock).toHaveBeenCalledTimes(1);
  });

  it('keeps local access blocked even if read-cache purge and remote sign-out fail', async () => {
    cacheUser();
    rpc.mockResolvedValue({ data: false, error: null });
    clearReadCacheMock.mockRejectedValue(new Error('IndexedDB unavailable'));
    auth.signOut.mockRejectedValue(new Error('network unavailable'));

    renderAuth();

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).toBeNull();
    expect(clearReadCacheMock).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('detects a resolved sign-out error and retries on a later authenticated callback', async () => {
    cacheUser();
    rpc.mockResolvedValue({ data: false, error: null });
    auth.signOut.mockResolvedValue({ error: new Error('remote sign-out failed') });
    renderAuth();

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session');
    expect(localStorage.getItem(`auth_user_cache:${userId}`)).toBeNull();

    act(() => authStateCallback('TOKEN_REFRESHED', session));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(2));
    expect(clearReadCacheMock).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session');
  });

  it('deduplicates repeated inactive callbacks for the same session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));

    act(() => {
      authStateCallback('SIGNED_IN', session);
      authStateCallback('SIGNED_IN', session);
    });

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    expect(clearReadCacheMock).toHaveBeenCalledTimes(1);
  });

  it('signs out again when the same inactive member starts a new login attempt', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));

    fireEvent.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(2));
    expect(clearReadCacheMock).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes and ignores async state work after unmount', async () => {
    let resolveStatus: (value: { data: boolean; error: null }) => void = () => undefined;
    rpc.mockReturnValue(new Promise(resolve => { resolveStatus = resolve; }));
    const view = renderAuth();

    view.unmount();
    await act(async () => resolveStatus({ data: true, error: null }));

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('remains anonymous when there is no session', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    renderAuth();

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('anonymous:no-session'));
    expect(rpc).not.toHaveBeenCalled();
  });
});
