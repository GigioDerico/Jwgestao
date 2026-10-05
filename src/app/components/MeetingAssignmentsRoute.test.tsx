import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingAssignmentsRoute } from './MeetingAssignmentsRoute';

let role = 'publicador';
let canView = true;
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role }, loading: false }) }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => ({ can: () => canView }) }));
vi.mock('./AssignmentsPage', () => ({ AssignmentsPage: () => <div>Administração existente</div> }));
vi.mock('./meeting-assignments/PublisherMeetingsPage', () => ({ PublisherMeetingsPage: () => <div>Designações pessoais</div> }));

function renderRoute() {
  return render(<MemoryRouter initialEntries={['/assignments/meetings']}><Routes>
    <Route path="/assignments/meetings" element={<MeetingAssignmentsRoute />} />
    <Route path="/dashboard" element={<div>Painel</div>} />
  </Routes></MemoryRouter>);
}

describe('MeetingAssignmentsRoute', () => {
  beforeEach(() => { role = 'publicador'; canView = true; });
  it('uses the personal experience for a Publicador with permission', () => {
    renderRoute();
    expect(screen.getByText('Designações pessoais')).toBeVisible();
    expect(screen.queryByText('Administração existente')).not.toBeInTheDocument();
  });
  it.each(['coordenador', 'designador'])('preserves existing administration for %s', adminRole => {
    role = adminRole;
    renderRoute();
    expect(screen.getByText('Administração existente')).toBeVisible();
    expect(screen.queryByText('Designações pessoais')).not.toBeInTheDocument();
  });
  it('redirects a Publicador without view permission', () => {
    canView = false;
    renderRoute();
    expect(screen.getByText('Painel')).toBeVisible();
  });
});
