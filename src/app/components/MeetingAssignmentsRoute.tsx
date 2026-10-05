import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { AssignmentsPage } from './AssignmentsPage';
import { PublisherMeetingsPage } from './meeting-assignments/PublisherMeetingsPage';
import { getSafeReturnPath } from '../lib/auth-return-path';

export function MeetingAssignmentsRoute() {
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground" role="status">Carregando…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'publicador' && can('view_assignments')) return <PublisherMeetingsPage />;
  const target = new URLSearchParams(location.search);
  const personalTarget = target.get('view') === 'personal'
    && getSafeReturnPath(`${location.pathname}${location.search}`) === `/assignments/meetings?assignment=${target.get('assignment')}&revision=${target.get('revision')}&view=personal`;
  if ((user.role === 'coordenador' || user.role === 'designador') && can('view_assignments')) {
    return personalTarget ? <PublisherMeetingsPage /> : <AssignmentsPage />;
  }
  return <Navigate to="/dashboard" replace />;
}
