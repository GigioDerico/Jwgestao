import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { AudioVideoAssignments } from './AudioVideoAssignments';
import { CartAssignments } from './CartAssignments';
import { FieldServiceAssignments } from './FieldServiceAssignments';

function AssignmentTypePage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-foreground">{title}</h1>
        <p className="text-muted-foreground" style={{ fontSize: '0.85rem' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function AudioVideoAssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canManageAssignments = user?.role === 'coordenador' || user?.role === 'designador';
  const canAccess = can('view_assignments') && (canManageAssignments || Boolean(user?.approved_audio_video) || Boolean(user?.approved_indicadores));
  const canDownloadAssignments = can('download_assignments');

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AssignmentTypePage
      title="Designações de Áudio e Vídeo"
      description="Organize a escala mensal de som, imagem, palco, microfones e indicadores."
    >
      <AudioVideoAssignments
        canCreate={canManageAssignments && can('create_assignments')}
        canEdit={canManageAssignments && can('edit_assignments')}
        canExportImage={canDownloadAssignments}
        canExportPdf={canDownloadAssignments}
      />
    </AssignmentTypePage>
  );
}

export function FieldServiceAssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canManageAssignments = user?.role === 'coordenador' || user?.role === 'designador';
  const canDownloadAssignments = can('download_assignments');

  if (!canManageAssignments || !can('view_assignments')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AssignmentTypePage
      title="Designações de Saída de Campo"
      description="Separe os arranjos por mês, com responsáveis, horários, locais e grupos."
    >
      <FieldServiceAssignments
        canCreate={can('create_assignments')}
        canEdit={can('edit_assignments')}
        canExportImage={canDownloadAssignments}
        canExportPdf={canDownloadAssignments}
      />
    </AssignmentTypePage>
  );
}

export function CartAssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canManageAssignments = user?.role === 'coordenador' || user?.role === 'designador';
  const canAccess = can('view_assignments') && (canManageAssignments || Boolean(user?.approved_carrinho));
  const canDownloadAssignments = can('download_assignments');

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AssignmentTypePage
      title="Designações de Carrinho"
      description="Gerencie as escalas por semana com local, horário e publicadores designados."
    >
      <CartAssignments
        canCreate={canManageAssignments && can('create_assignments')}
        canEdit={canManageAssignments && can('edit_assignments')}
        canExportImage={canDownloadAssignments}
        canExportPdf={canDownloadAssignments}
      />
    </AssignmentTypePage>
  );
}
