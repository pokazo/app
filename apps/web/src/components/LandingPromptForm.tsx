import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PkButton } from "./PkButton";
import { ThemePicker } from "./ThemePicker";
import { SlideCountPicker } from "./SlideCountPicker";
import { apiUrl } from "../safe";
import { sanitizeDeckTheme, SLIDE_COUNT_DEFAULT } from "../decks";

export function LandingPromptForm(props: { placeholder: string }) {
  const [topic, setTopic] = useState("");
  const [theme, setTheme] = useState("auto");
  const [slideCount, setSlideCount] = useState(SLIDE_COUNT_DEFAULT);
  const nav = useNavigate();

  async function goCreate(t: string) {
    const text = t.trim();
    if (text.length < 5) return;
    const pick = sanitizeDeckTheme(theme);
    const q = `topic=${encodeURIComponent(text)}&theme=${encodeURIComponent(pick)}&slides=${slideCount}`;
    const dest = `/app?${q}`;
    try {
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (res.ok) nav(dest);
      else nav(`/login?next=/app&${q}`);
    } catch {
      nav(`/login?next=/app&${q}`);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await goCreate(topic);
  }

  return (
    <>
      <form className="prompt-card" onSubmit={onSubmit}>
        <textarea
          className="pk"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={props.placeholder}
        />
        <div className="actions">
          <SlideCountPicker value={slideCount} onChange={setSlideCount} />
          <PkButton data-pk="cta-create" disabled={topic.trim().length < 5} type="submit">
            Создать
          </PkButton>
        </div>
      </form>
      <ThemePicker value={theme} onChange={setTheme} />
    </>
  );
}
