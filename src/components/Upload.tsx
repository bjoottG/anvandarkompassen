import { useRef, useState, type ReactNode } from 'react';

interface Props {
  onFile: (file: File) => void;
  children?: ReactNode;
  variant?: 'hero' | 'button';
}

/** Uppladdning av .xlsx via knapp eller drag-and-drop. */
export function Upload({ onFile, children, variant = 'button' }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  const hidden = (
    <input
      ref={input}
      type="file"
      accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      className="hidden"
      onChange={(e) => {
        pick(e.target.files);
        e.target.value = '';
      }}
    />
  );

  if (variant === 'button') {
    return (
      <>
        <button type="button" onClick={() => input.current?.click()} className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10">
          Ladda upp Excel
        </button>
        {hidden}
      </>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${over ? 'border-accent bg-accent-soft' : 'border-line bg-surface'}`}
    >
      {children}
      <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-md bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-strong">
        Välj Excel-fil
      </button>
      <p className="mt-2 text-sm text-ink-muted">…eller dra och släpp filen här</p>
      {hidden}
    </div>
  );
}
