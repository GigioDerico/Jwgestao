import React, { useState } from 'react';
import type { Member, FieldServiceGroup } from '../types';

export interface ExportOptions {
  format: 'pdf' | 'excel';
  groupByFieldService: boolean;
}

interface MemberExportDialogProps {
  open: boolean;
  onClose: () => void;
  members: Member[];
  groups: FieldServiceGroup[];
  onExport: (options: ExportOptions) => void;
  exporting: boolean;
}

export function MemberExportDialog({
  open,
  onClose,
  onExport,
  exporting,
}: MemberExportDialogProps) {
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [groupByFieldService, setGroupByFieldService] = useState(false);

  if (!open) return null;

  const handleConfirm = () => {
    onExport({ format, groupByFieldService });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-medium text-foreground">Exportar Lista de Membros</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Formato</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="excel"
                  checked={format === 'excel'}
                  onChange={() => setFormat('excel')}
                  className="accent-primary"
                />
                <span className="text-sm text-foreground">Excel</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByFieldService}
              onChange={(e) => setGroupByFieldService(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            <span className="text-sm text-foreground">Agrupar por grupos de campo</span>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={exporting}
            className="flex-1 px-4 py-2.5 bg-card border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={exporting}
            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Gerando...' : 'Exportar'}
          </button>
        </div>
      </div>
    </div>
  );
}
