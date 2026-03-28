import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../lib/api';
import { AudioVideoAssignments } from './AudioVideoAssignments';
import { AssignmentHistory } from './AssignmentHistory';
import { CartAssignments } from './CartAssignments';
import { FieldServiceAssignments } from './FieldServiceAssignments';

type AssignmentInnerView = 'scale' | 'history';

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

function AssignmentInnerMenu({
  view,
  setView,
}: {
  view: AssignmentInnerView;
  setView: (value: AssignmentInnerView) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1">
      <button
        type="button"
        onClick={() => setView('scale')}
        className={`rounded-lg px-3 py-1.5 transition-colors ${view === 'scale'
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
          }`}
        style={{ fontSize: '0.82rem' }}
      >
        Escala
      </button>
      <button
        type="button"
        onClick={() => setView('history')}
        className={`rounded-lg px-3 py-1.5 transition-colors ${view === 'history'
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
          }`}
        style={{ fontSize: '0.82rem' }}
      >
        Histórico
      </button>
    </div>
  );
}

export function AudioVideoAssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [view, setView] = useState<AssignmentInnerView>('scale');
  const [members, setMembers] = useState<any[]>([]);
  const canManageAssignments = user?.role === 'coordenador' || user?.role === 'designador';
  const canAccess = can('view_assignments') && (
    canManageAssignments ||
    Boolean(user?.approved_audio_video) ||
    Boolean((user as any)?.approved_sound) ||
    Boolean((user as any)?.approved_image) ||
    Boolean((user as any)?.approved_stage) ||
    Boolean((user as any)?.approved_roving_mic) ||
    Boolean(user?.approved_indicadores)
  );
  const canDownloadAssignments = can('download_assignments');

  useEffect(() => {
    if (view !== 'history') return;
    api.getMembers().then(setMembers).catch(() => {});
  }, [view]);

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AssignmentTypePage
      title="Designações de Áudio e Vídeo"
      description="Organize a escala mensal de som, imagem, palco, microfones e indicadores."
    >
      <AssignmentInnerMenu view={view} setView={setView} />
      {view === 'scale' ? (
        <AudioVideoAssignments
          canCreate={canManageAssignments && can('create_assignments')}
          canEdit={canManageAssignments && can('edit_assignments')}
          canExportImage={canDownloadAssignments}
          canExportPdf={canDownloadAssignments}
        />
      ) : (
        <AssignmentHistory
          allowedSources={['audio_video']}
          title="Histórico de Áudio e Vídeo"
          description="Últimas designações de som, imagem, palco, volantes e indicadores."
          enableDesignationFilter
          designationFilterLabel="Designação"
          members={members}
        />
      )}
    </AssignmentTypePage>
  );
}

export function FieldServiceAssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [view, setView] = useState<AssignmentInnerView>('scale');
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
      <AssignmentInnerMenu view={view} setView={setView} />
      {view === 'scale' ? (
        <FieldServiceAssignments
          canCreate={can('create_assignments')}
          canEdit={can('edit_assignments')}
          canExportImage={canDownloadAssignments}
          canExportPdf={canDownloadAssignments}
        />
      ) : (
        <AssignmentHistory
          allowedSources={['field_service']}
          title="Histórico de Saída de Campo"
          description="Histórico por responsável e arranjo mensal de saída de campo."
        />
      )}
    </AssignmentTypePage>
  );
}

export function CartAssignmentsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [view, setView] = useState<AssignmentInnerView>('scale');
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
      <AssignmentInnerMenu view={view} setView={setView} />
      {view === 'scale' ? (
        <CartAssignments
          canCreate={canManageAssignments && can('create_assignments')}
          canEdit={canManageAssignments && can('edit_assignments')}
          canExportImage={canDownloadAssignments}
          canExportPdf={canDownloadAssignments}
        />
      ) : (
        <AssignmentHistory
          allowedSources={['cart']}
          title="Histórico de Carrinho"
          description="Histórico das últimas designações de publicador 1 e 2 no carrinho."
        />
      )}
    </AssignmentTypePage>
  );
}
