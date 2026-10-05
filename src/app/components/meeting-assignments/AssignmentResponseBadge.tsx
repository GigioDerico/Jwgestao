import { Check, Clock3, RotateCcw, X } from 'lucide-react';
import type { MeetingResponseStatus } from '../../lib/meeting-assignments';

const statusCopy: Record<MeetingResponseStatus, string> = {
  pending_confirmation: 'Aguardando resposta',
  confirmed: 'Participação confirmada',
  declined: 'Recusa enviada',
  revoked: 'Designação substituída',
};

export function AssignmentResponseBadge({ status, reason }: { status: MeetingResponseStatus; reason?: string | null }) {
  const Icon = status === 'confirmed' ? Check : status === 'declined' ? X : status === 'revoked' ? RotateCcw : Clock3;
  const colors = status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
    : status === 'declined' ? 'bg-rose-50 text-rose-700'
      : status === 'revoked' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-800';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors}`}>
        <Icon aria-hidden="true" size={14} />{statusCopy[status]}
      </span>
      {status === 'declined' && reason && <p className="w-full text-sm text-muted-foreground">Motivo enviado ao responsável.</p>}
    </div>
  );
}
