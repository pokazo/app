import { useEffect } from "react";

type Props = {
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  title,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <div className="confirm-actions">
          <button type="button" className="pk ghost" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="pk" disabled={busy} onClick={onConfirm}>
            {busy ? "Удаляю…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
