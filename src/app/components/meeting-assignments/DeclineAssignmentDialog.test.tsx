import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeclineAssignmentDialog } from './DeclineAssignmentDialog';

const assignment = { title: 'Iniciando conversas', date: '2026-10-08' } as any;

describe('DeclineAssignmentDialog', () => {
  it('requires trimmed text and accepts 500 characters, while rejecting 501', async () => {
    const submit = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(<DeclineAssignmentDialog open assignment={assignment} onOpenChange={vi.fn()} onSubmit={submit} />);
    const field = screen.getByRole('textbox', { name: /motivo da recusa/i });
    const send = screen.getByRole('button', { name: 'Enviar recusa' });
    fireEvent.change(field, { target: { value: '   ' } });
    await user.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o motivo da recusa.');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: 'a'.repeat(501) } });
    expect(field).toHaveValue('a'.repeat(501));
    await user.click(send);
    expect(screen.getByRole('alert')).toHaveTextContent('no máximo 500');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: 'a'.repeat(500) } });
    expect(screen.getByText('500/500')).toBeVisible();
    await user.click(send);
    await waitFor(() => expect(submit).toHaveBeenCalledWith('a'.repeat(500)));
  });

  it('preserves the reason when submission fails and blocks duplicate submissions', async () => {
    let resolveSubmit!: () => void;
    const submit = vi.fn(() => new Promise<void>((_resolve, reject) => {
      resolveSubmit = () => reject(new Error('Falha de rede'));
    }));
    const user = userEvent.setup();
    render(<DeclineAssignmentDialog open assignment={assignment} onOpenChange={vi.fn()} onSubmit={submit} />);
    const field = screen.getByRole('textbox', { name: /motivo da recusa/i });
    fireEvent.change(field, { target: { value: 'Compromisso familiar' } });
    const send = screen.getByRole('button', { name: 'Enviar recusa' });
    await user.click(send);
    await user.click(send);
    expect(submit).toHaveBeenCalledTimes(1);
    resolveSubmit();
    expect(await screen.findByText('Falha de rede')).toBeVisible();
    expect(field).toHaveValue('Compromisso familiar');
    expect(screen.getByRole('button', { name: 'Enviar recusa' })).toBeEnabled();
  });

  it('closes and clears the reason after a successful response', async () => {
    const submit = vi.fn(async () => undefined);
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return <><button onClick={() => setOpen(true)}>Abrir recusa</button>
        <DeclineAssignmentDialog open={open} assignment={assignment} onOpenChange={setOpen} onSubmit={submit} /></>;
    }
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir recusa' }));
    const field = screen.getByRole('textbox', { name: /motivo da recusa/i });
    fireEvent.change(field, { target: { value: 'Motivo inicial' } });
    await user.click(screen.getByRole('button', { name: 'Enviar recusa' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(submit).toHaveBeenCalledWith('Motivo inicial');
    await user.click(screen.getByRole('button', { name: 'Abrir recusa' }));
    expect(screen.getByRole('textbox', { name: /motivo da recusa/i })).toHaveValue('');
  });

  it('allows Escape and Voltar to close without sending, then restores focus to the trigger', async () => {
    const submit = vi.fn();
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = React.useState(false);
      const trigger = React.useRef<HTMLButtonElement>(null);
      return <><button ref={trigger} onClick={() => setOpen(true)}>Abrir recusa</button>
        <DeclineAssignmentDialog open={open} assignment={assignment} triggerRef={trigger} onOpenChange={setOpen} onSubmit={submit} /></>;
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir recusa' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(submit).not.toHaveBeenCalled();
    await user.click(trigger);
    await user.click(await screen.findByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(submit).not.toHaveBeenCalled();
  });
});
