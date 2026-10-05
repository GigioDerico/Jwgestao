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

function renderRoute(path = '/assignments/meetings') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/assignments/meetings" element={<MeetingAssignmentsRoute />} />
    <Route path="/assignments/my-meetings" element={<MeetingAssignmentsRoute />} />
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
  it.each(['coordenador', 'designador', 'secretario'])('opens personal assignments for %s on the separate route', elevatedRole => {
    role = elevatedRole;
    renderRoute('/assignments/my-meetings');
    expect(screen.getByText('Designações pessoais')).toBeVisible();
    expect(screen.queryByText('Administração existente')).not.toBeInTheDocument();
  });
  it.each(['coordenador', 'designador'])('opens the personal recipient view for %s only on a validated versioned target', adminRole => {
    role = adminRole;
    renderRoute('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001&view=personal');
    expect(screen.getByText('Designações pessoais')).toBeVisible();
    expect(screen.queryByText('Administração existente')).not.toBeInTheDocument();
  });
  it('keeps administration as the default for an unmarked target', () => {
    role = 'coordenador';
    renderRoute('/assignments/meetings?assignment=123e4567-e89b-42d3-a456-426614174000&revision=123e4567-e89b-42d3-a456-426614174001');
    expect(screen.getByText('Administração existente')).toBeVisible();
  });
  it('redirects a Publicador without view permission', () => {
    canView = false;
    renderRoute();
    expect(screen.getByText('Painel')).toBeVisible();
  });
});
