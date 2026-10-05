import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { AlertCircle, MessageSquareWarning } from 'lucide-react';
import type { PersonalMeetingAssignment } from '../../lib/meeting-assignments';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

export interface DeclineAssignmentDialogProps {
  open: boolean;
  assignment: PersonalMeetingAssignment;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => Promise<void>;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

export function DeclineAssignmentDialog({ open, assignment, onOpenChange, onSubmit, triggerRef }: DeclineAssignmentDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setError('');
      setSubmitting(false);
      submitInFlight.current = false;
    }
  }, [open]);

  const submit = async () => {
    if (submitInFlight.current) return;
    const clean = reason.trim();
    if (!clean) { setError('Informe o motivo da recusa.'); return; }
    if (clean.length > 500) { setError('O motivo deve ter no máximo 500 caracteres.'); return; }
    submitInFlight.current = true;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(clean);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a recusa. Tente novamente.');
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!submitting) onOpenChange(value); }}>
      <DialogContent onEscapeKeyDown={() => { if (!submitting) onOpenChange(false); }}
        onCloseAutoFocus={event => { if (triggerRef?.current) { event.preventDefault(); triggerRef.current.focus(); } }}>
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><MessageSquareWarning aria-hidden="true" /></div>
          <DialogTitle>Não poderá participar?</DialogTitle>
          <DialogDescription>Informe o motivo para ajudar o responsável a organizar a substituição.</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {new Date(`${assignment.date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} · {assignment.title}
        </div>
        <label htmlFor="decline-reason" className="text-sm font-medium">Motivo da recusa <span className="text-muted-foreground">(obrigatório)</span></label>
        <Textarea id="decline-reason" autoFocus value={reason} maxLength={501} rows={4}
          placeholder="Explique brevemente o que aconteceu…" aria-invalid={Boolean(error)}
          aria-describedby={error ? 'decline-error' : 'decline-hint'}
          onChange={event => { setReason(event.target.value); if (error) setError(''); }} />
        <div className="flex justify-between text-xs text-muted-foreground"><span id="decline-hint">O motivo será visível aos responsáveis pelas designações.</span><span>{reason.length}/500</span></div>
        {error && <p id="decline-error" role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={submitting} onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button type="button" variant="destructive" disabled={submitting} onClick={submit}>{submitting ? 'Enviando…' : 'Enviar recusa'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
