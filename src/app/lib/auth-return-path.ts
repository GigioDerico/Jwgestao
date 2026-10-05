const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const assignmentRoute = new RegExp(`^/assignments/meetings/respond/(${UUID})$`, 'i');
const uuid = new RegExp(`^${UUID}$`, 'i');

export function getSafeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 2048 || value !== value.trim()) return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\u0000-\u001f\u007f]/.test(value)) return '/dashboard';
  let decoded: string;
  try { decoded = decodeURIComponent(value); } catch { return '/dashboard'; }
  if (decoded.includes('\\') || decoded.startsWith('//') || /[\u0000-\u001f\u007f]/.test(decoded)) return '/dashboard';
  const queryIndex = value.indexOf('?');
  const pathname = queryIndex < 0 ? value : value.slice(0, queryIndex);
  const query = queryIndex < 0 ? '' : value.slice(queryIndex + 1);
  const match = pathname.match(assignmentRoute);
  if (match) {
    if (decodeURIComponent(pathname) !== pathname || !query) return '/dashboard';
    const params = new URLSearchParams(query);
    const revision = params.get('revision');
    if (!revision || !uuid.test(revision) || [...params.keys()].some(key => key !== 'revision') || params.getAll('revision').length !== 1) return '/dashboard';
    return `${pathname}?revision=${encodeURIComponent(revision)}`;
  }
  if (pathname === '/dashboard') return query ? '/dashboard' : pathname;
  if (pathname === '/assignments/meetings') {
    if (!query) return pathname;
    const params = new URLSearchParams(query);
    const assignment = params.get('assignment');
    const notificationId = params.get('notificationId');
    const revision = params.get('revision');
    const id = assignment || notificationId;
    const expectedIdKey = assignment ? 'assignment' : 'notificationId';
    if (id && !(assignment && notificationId) && revision && uuid.test(id) && uuid.test(revision)
      && params.getAll(expectedIdKey).length === 1 && params.getAll('revision').length === 1
      && [...params.keys()].every(key => key === expectedIdKey || key === 'revision')) {
      return `${pathname}?assignment=${encodeURIComponent(id)}&revision=${encodeURIComponent(revision)}`;
    }
    return '/dashboard';
  }
  return '/dashboard';
}
