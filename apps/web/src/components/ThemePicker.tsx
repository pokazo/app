import { DECK_THEMES, type DeckTheme } from "../decks";
import { ThemeThumb } from "./ThemeThumb";

export function ThemePicker(props: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Defaults to full create-time catalog (includes auto). */
  themes?: DeckTheme[];
  name?: string;
}) {
  const themes = props.themes ?? DECK_THEMES;
  const name = props.name ?? "deck-theme";
  return (
    <fieldset className="theme-picker" disabled={props.disabled}>
      <div className="theme-grid" role="radiogroup" aria-label="Тема презентации">
        {themes.map((t) => {
          const on = t.id === props.value;
          return (
            <label key={t.id} className={`theme-card${on ? " is-on" : ""}`}>
              <input
                type="radio"
                name={name}
                value={t.id}
                checked={on}
                onChange={() => props.onChange(t.id)}
              />
              <ThemeThumb preview={t.preview} />
              <span className="theme-card-copy">
                <span className="theme-card-title">{t.title}</span>
                <span className="theme-card-hint">{t.hint}</span>
              </span>
              <span className="theme-dots" aria-hidden>
                {t.colors.map((c) => (
                  <span key={c} className="theme-dot" style={{ background: c }} />
                ))}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
