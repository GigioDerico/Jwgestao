import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { usePermissions } from '../hooks/usePermissions';
import { isMeetingAssignmentUuid, resolvePersonalAssignment, type AssignmentResolution, type MeetingResponseInput } from '../lib/meeting-assignments';
import { getSafeReturnPath } from '../lib/auth-return-path';
import { MeetingAssignmentCard } from './meeting-assignments/MeetingAssignmentCard';

export function MeetingAssignmentLinkRoute() {
  const { notificationId = '' } = useParams();
  const [params] = useSearchParams();
  const revision = params.get('revision') || '';
  const { user, loading } = useAuth();
  const { can } = usePermissions();
  const { respondToMeetingAssignment, hideNotification } = useNotifications();
  const [resolution, setResolution] = useState<{ key: string; result?: AssignmentResolution; failed?: boolean }>({ key: '' });
  const [refreshKey, setRefreshKey] = useState(0);
  const identityKey = `${user?.id || ''}:${user?.member_id || ''}:${notificationId}:${revision}`;
  const resolutionIsCurrent = resolution.key === identityKey;
  const result = resolutionIsCurrent ? resolution.result ?? null : null;
  const failed = resolutionIsCurrent && Boolean(resolution.failed);
  useEffect(() => {
    let active = true;
    if (!user || !isMeetingAssignmentUuid(notificationId) || !isMeetingAssignmentUuid(revision)) {
      setResolution({ key: identityKey, result: { kind: 'unavailable' } });
      return () => { active = false; };
    }
    setResolution({ key: identityKey });
    void resolvePersonalAssignment(notificationId, revision).then(value => {
      if (active) setResolution({ key: identityKey, result: value });
    }).catch(() => { if (active) setResolution({ key: identityKey, failed: true }); });
    return () => { active = false; };
  }, [identityKey, notificationId, revision, refreshKey, user?.id, user?.member_id]);
  if (loading) return <main className="mx-auto max-w-3xl p-6" role="status">Carregando…</main>;
  if (!user) return null;
  if (!can('view_assignments') || !['publicador', 'coordenador', 'designador'].includes(user.role)) return <Link to="/dashboard">Voltar ao Painel</Link>;
  if (!result && !failed) return <main className="mx-auto max-w-3xl p-6" role="status">Verificando sua designação…</main>;
  if (failed) return <main className="mx-auto max-w-3xl p-6"><p role="alert">Não foi possível verificar este link. Tente novamente.</p><button onClick={() => setRefreshKey(k => k + 1)}>Tentar novamente</button></main>;
  if (result?.kind === 'changed') return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Esta designação foi atualizada</h1><p className="my-3">O link é de uma versão anterior. Confira a designação atual antes de responder.</p><Link className="text-sky-700 underline" to={getSafeReturnPath(result.currentPath)}>Ver designação atual</Link></main>;
  if (result?.kind !== 'current') return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Designação indisponível</h1><p className="my-3">Não foi possível localizar esta designação para sua conta.</p><Link className="text-sky-700 underline" to="/assignments/meetings">Ir para Reunião</Link></main>;
  const assignment = result.assignment;
  if (assignment.notification?.memberId !== user.member_id) return <main className="mx-auto max-w-3xl p-6"><h1 className="text-xl font-semibold">Designação indisponível</h1><p className="my-3">Não foi possível localizar esta designação para sua conta.</p><Link className="text-sky-700 underline" to="/assignments/meetings">Ir para Reunião</Link></main>;
  const onRespond = (input: MeetingResponseInput) => respondToMeetingAssignment(input);
  return <main className="mx-auto max-w-3xl p-4 sm:p-8"><Link className="text-sm text-sky-700 underline" to="/assignments/meetings">← Reuniões</Link><h1 className="my-5 text-2xl font-semibold">Sua designação para {new Date(`${assignment.date}T12:00:00`).toLocaleDateString('pt-BR')}</h1><MeetingAssignmentCard assignment={assignment} onRespond={onRespond} onHide={hideNotification} /></main>;
}
