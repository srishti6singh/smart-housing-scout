import { useEffect, useRef, type ReactNode } from 'react';
import { IconX } from './icons';

/** Native <dialog>: focus trap, Escape and backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={`m-auto max-h-[90vh] w-[calc(100%-32px)] overflow-auto rounded-card bg-white p-0 text-ink shadow-float backdrop:bg-midnight/60 ${wide ? 'max-w-5xl' : 'max-w-lg'}`}
    >
      {open && (
        <div>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-white px-6 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-mist">
              <IconX size={18} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
