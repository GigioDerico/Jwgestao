import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Member } from '../types';
import type { MemberTransferImpact, TransferMemberInput } from '../lib/member-transfer';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Loader2 } from 'lucide-react';

interface MemberTransferDialogProps {
  member: Pick<Member, 'id' | 'full_name' | 'activeTransfer'> | null;
  open: boolean;
  mode: 'transfer' | 'cancel';
  loading: boolean;
  impact: MemberTransferImpact | null;
  onOpenChange: (open: boolean) => void;
  onTransfer: (input: TransferMemberInput) => Promise<void>;
  onCancelTransfer: (transferId: string) => Promise<void>;
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatLocalDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function impactMessage(count: number) {
  if (count === 0) return 'Nenhuma designação futura será removida.';
  if (count === 1) return '1 designação futura será removida.';
  return `${count} designações futuras serão removidas.`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
}

export function MemberTransferDialog({
  member,
  open,
  mode,
  loading,
  impact,
  onOpenChange,
  onTransfer,
  onCancelTransfer,
}: MemberTransferDialogProps) {
  const online = useOnlineStatus();
  const today = localDateString();
  const [transferredAt, setTransferredAt] = useState(today);
  const [destinationCongregation, setDestinationCongregation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    setTransferredAt(localDateString());
    setDestinationCongregation('');
    setSubmitting(false);
    submittingRef.current = false;
    setError(null);
  }, [member?.id, mode, open]);

  const busy = loading || submitting;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && submittingRef.current) return;
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!member || busy || submittingRef.current || !online) return;

    if (mode === 'transfer') {
      const destination = destinationCongregation.trim();
      if (!transferredAt || transferredAt > today) {
        setError('Informe uma data válida, igual ou anterior a hoje.');
        return;
      }
      if (destination.length > 150) {
        setError('A congregação de destino deve ter no máximo 150 caracteres.');
        return;
      }
      if (!impact) return;

      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      try {
        await onTransfer({
          memberId: member.id,
          transferredAt,
          destinationCongregation: destination || undefined,
        });
      } catch (submitError) {
        setError(errorMessage(submitError));
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
      return;
    }

    if (!member.activeTransfer) {
      setError('A transferência ativa não foi encontrada.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await onCancelTransfer(member.activeTransfer.id);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const confirmDisabled = busy
    || !online
    || !member
    || (mode === 'transfer' && impact === null)
    || (mode === 'cancel' && !member?.activeTransfer);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-busy={busy}
        onEscapeKeyDown={event => submittingRef.current && event.preventDefault()}
        onPointerDownOutside={event => submittingRef.current && event.preventDefault()}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>
              {mode === 'transfer' ? 'Transferir de congregação' : 'Cancelar transferência'}
            </DialogTitle>
            <DialogDescription>
              {member?.full_name ?? 'Selecione um membro para continuar.'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'transfer' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="member-transfer-date" className="text-sm font-medium text-foreground">
                  Data da transferência
                </label>
                <input
                  id="member-transfer-date"
                  type="date"
                  required
                  max={today}
                  value={transferredAt}
                  onChange={event => setTransferredAt(event.target.value)}
                  disabled={busy}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="member-transfer-destination" className="text-sm font-medium text-foreground">
                  Congregação de destino
                </label>
                <input
                  id="member-transfer-destination"
                  type="text"
                  maxLength={150}
                  value={destinationCongregation}
                  onChange={event => setDestinationCongregation(event.target.value)}
                  disabled={busy}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
                />
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                    Verificando designações futuras...
                  </span>
                ) : impact ? (
                  impactMessage(impact.futureAssignmentCount)
                ) : (
                  'Não foi possível carregar o impacto da transferência. Tente novamente.'
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                O acesso ao sistema será bloqueado. As designações removidas não serão restauradas automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {member?.activeTransfer && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  <dt className="font-medium">Data</dt>
                  <dd>{formatLocalDate(member.activeTransfer.transferredAt)}</dd>
                  <dt className="font-medium">Destino</dt>
                  <dd>{member.activeTransfer.destinationCongregation || 'Não informado'}</dd>
                </dl>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
                O status, grupo e acesso ao sistema serão restaurados. As designações removidas não serão restauradas.
              </div>
            </div>
          )}

          {!online && (
            <p role="status" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              Você precisa estar online para concluir esta operação.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={confirmDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting
                ? mode === 'transfer' ? 'Transferindo...' : 'Cancelando...'
                : mode === 'transfer' ? 'Confirmar transferência' : 'Cancelar transferência'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
