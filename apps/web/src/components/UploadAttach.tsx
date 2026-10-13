type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  ariaLabel?: string;
};

const PAPERCLIP = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export function UploadAttach(props: Props) {
  const max = props.maxFiles ?? 20;
  const label = props.ariaLabel ?? "Картинки (опционально)";
  return (
    <label
      className="upload-attach"
      title={
        props.files.length
          ? `Прикреплено: ${props.files.map((f) => f.name).join(", ")}`
          : "Прикрепить картинки"
      }
    >
      <span className="upload-attach-icon" aria-hidden>
        {PAPERCLIP}
      </span>
      {props.files.length ? (
        <span className="upload-attach-badge">{props.files.length}</span>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={props.disabled}
        aria-label={label}
        onChange={(e) =>
          props.onChange(Array.from(e.target.files ?? []).slice(0, max))
        }
      />
    </label>
  );
}
