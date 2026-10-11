import { SLIDE_COUNT_OPTIONS } from "../decks";

export function SlideCountPicker(props: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="slide-count-picker">
      <span className="slide-count-label">Страниц</span>
      <select
        className="pk slide-count-select"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
        aria-label="Количество страниц"
      >
        {SLIDE_COUNT_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
