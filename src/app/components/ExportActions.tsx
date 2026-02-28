import React from 'react';
import { Download, FileText } from 'lucide-react';

export function ExportActions({
  onExportImage,
  onExportPdf,
  exporting,
  disabled = false,
  imageDisabled = false,
  pdfDisabled = false,
}: {
  onExportImage: () => Promise<void> | void;
  onExportPdf: () => Promise<void> | void;
  exporting: 'image' | 'pdf' | null;
  disabled?: boolean;
  imageDisabled?: boolean;
  pdfDisabled?: boolean;
}) {
  const imageIsDisabled = disabled || imageDisabled || exporting !== null;
  const pdfIsDisabled = disabled || pdfDisabled || exporting !== null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onExportImage()}
        disabled={imageIsDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
        style={{ fontSize: '0.82rem' }}
      >
        <Download size={14} />
        {exporting === 'image' ? 'Gerando JPG...' : 'Baixar JPG'}
      </button>
      <button
        type="button"
        onClick={() => onExportPdf()}
        disabled={pdfIsDisabled}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
        style={{ fontSize: '0.82rem' }}
      >
        <FileText size={14} />
        {exporting === 'pdf' ? 'Gerando PDF...' : 'Baixar PDF'}
      </button>
    </div>
  );
}
