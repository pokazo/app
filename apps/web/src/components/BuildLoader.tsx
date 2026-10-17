type Props = {
  label?: string | null;
  /** When true, render as absolute corner on the stage (no rewrite form). */
  corner?: boolean;
};

/** Compact build chip — theme tokens, next to «изменить» or stage corner. */
export function BuildLoader({ label, corner = false }: Props) {
  const text = (label ?? "").trim() || "Собираю показ";
  return (
    <div
      className={`deck-build-loader${corner ? " is-corner" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <span className="deck-build-loader-ring" aria-hidden />
      <span className="deck-build-loader-label">{text}</span>
    </div>
  );
}
