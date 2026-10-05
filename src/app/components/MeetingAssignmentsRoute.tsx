import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { AssignmentsPage } from './AssignmentsPage';
import { PublisherMeetingsPage } from './meeting-assignments/PublisherMeetingsPage';

export function MeetingAssignmentsRoute() {
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground" role="status">Carregando…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'publicador' && can('view_assignments')) return <PublisherMeetingsPage />;
  if ((user.role === 'coordenador' || user.role === 'designador') && can('view_assignments')) return <AssignmentsPage />;
  return <Navigate to="/dashboard" replace />;
}
