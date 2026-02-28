import React from 'react';
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
  return (
    <AssignmentTypePage
      title="Designações de Áudio e Vídeo"
      description="Organize a escala mensal de som, imagem, palco, microfones e indicadores."
    >
      <AudioVideoAssignments />
    </AssignmentTypePage>
  );
}

export function FieldServiceAssignmentsPage() {
  return (
    <AssignmentTypePage
      title="Designações de Saída de Campo"
      description="Separe os arranjos por mês, com responsáveis, horários, locais e grupos."
    >
      <FieldServiceAssignments />
    </AssignmentTypePage>
  );
}

export function CartAssignmentsPage() {
  return (
    <AssignmentTypePage
      title="Designações de Carrinho"
      description="Gerencie as escalas por semana com local, horário e publicadores designados."
    >
      <CartAssignments />
    </AssignmentTypePage>
  );
}
