import { BUILD_PHASES, buildPhaseIndex } from "../build-stage";

type Props = {
  label?: string | null;
  /** Absolute corner chip on the stage. */
  corner?: boolean;
  /** stage fills the 16:9 frame; bar sits on a visible slide; chip is the compact mark. */
  variant?: "chip" | "bar" | "stage";
};

function Mark() {
  return (
    <span className="build-mark" aria-hidden>
      <span />
      <span />
      <span />
    </span>
  );
}

function StageCard({ kind }: { kind: "a" | "b" | "c" }) {
  return (
    <div className={`build-card build-card--${kind}`}>
      <span className="build-card-accent" />
      <span className="build-skel is-kicker" />
      <span className="build-skel is-title" />
      <span className="build-skel is-line" />
      <span className="build-skel is-line is-short" />
      <span className="build-skel is-photo" />
    </div>
  );
}

/** Compact build chip — theme tokens, next to «изменить» or the stage corner. */
export function BuildLoader({ label, corner = false, variant = "chip" }: Props) {
  const text = (label ?? "").trim() || "Думаю…";
  if (variant === "stage") return <BuildStage label={text} />;
  if (variant === "bar") return <BuildBar label={text} />;
  return (
    <div
      className={`deck-build-loader${corner ? " is-corner" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <Mark />
      <span className="deck-build-loader-label">{text}</span>
    </div>
  );
}

function BuildBar({ label }: { label: string }) {
  return (
    <div className="deck-assemble-bar" role="status" aria-live="polite" aria-label={label}>
      <Mark />
      <span className="deck-assemble-label">{label}</span>
      <span className="deck-assemble-sweep" aria-hidden />
    </div>
  );
}

function BuildStage({ label }: { label: string }) {
  const phase = buildPhaseIndex(label);
  return (
    <div className="build-stage" role="status" aria-live="polite" aria-label={label}>
      <div className="build-deck" aria-hidden>
        <StageCard kind="a" />
        <StageCard kind="b" />
        <StageCard kind="c" />
      </div>
      <p className="build-stage-label">{label}</p>
      <ol className="build-phases">
        {BUILD_PHASES.map((step, i) => (
          <li
            key={step.id}
            className={i < phase ? "is-done" : i === phase ? "is-now" : ""}
            aria-current={i === phase ? "step" : undefined}
          >
            {step.title}
          </li>
        ))}
      </ol>
      <p className="build-stage-hint">
        Обычно это несколько минут. Оставь вкладку открытой — слайды появятся здесь сами.
      </p>
    </div>
  );
}
