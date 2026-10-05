import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssignmentResponseBadge } from './AssignmentResponseBadge';

describe('AssignmentResponseBadge', () => {
  it('shows the actual decline reason to the authorized manager', () => {
    render(<AssignmentResponseBadge status="declined" reason="Estou viajando nessa semana." />);

    expect(screen.getByText('Recusa enviada')).toBeVisible();
    expect(screen.getByText('Motivo: Estou viajando nessa semana.')).toBeVisible();
  });

  it('does not reveal an absent decline reason', () => {
    render(<AssignmentResponseBadge status="declined" />);

    expect(screen.getByText('Recusa enviada')).toBeVisible();
    expect(screen.queryByText(/Motivo:/)).not.toBeInTheDocument();
  });
});
