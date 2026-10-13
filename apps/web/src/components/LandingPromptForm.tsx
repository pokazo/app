import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PkButton } from "./PkButton";
import { ThemePicker } from "./ThemePicker";
import { SlideCountPicker } from "./SlideCountPicker";
import { UploadAttach } from "./UploadAttach";
import { apiUrl } from "../safe";
import { sanitizeDeckTheme, SLIDE_COUNT_DEFAULT } from "../decks";
import { sanitizeAudience, type AudienceSlug } from "../audience-pages";
import { stashPendingUploadFiles } from "../pending-uploads";

export function LandingPromptForm(props: {
  placeholder: string;
  /** Landing path slug, e.g. shkola from /shkola — shapes create prompts. */
  audience?: AudienceSlug;
}) {
  const [topic, setTopic] = useState("");
  const [theme, setTheme] = useState("auto");
  const [slideCount, setSlideCount] = useState(SLIDE_COUNT_DEFAULT);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function goCreate(t: string) {
    const text = t.trim();
    if (text.length < 5 || busy) return;
    setBusy(true);
    const pick = sanitizeDeckTheme(theme);
    const audience = sanitizeAudience(props.audience);
    const q = `topic=${encodeURIComponent(text)}&theme=${encodeURIComponent(pick)}&slides=${slideCount}&audience=${encodeURIComponent(audience)}`;
    const dest = `/app?${q}`;
    try {
      if (files.length) await stashPendingUploadFiles(files);
      const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
      if (res.ok) nav(dest);
      else nav(`/login?next=/app&${q}`);
    } catch {
      nav(`/login?next=/app&${q}`);
    } finally {
      setBusy(false);
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
          <div className="prompt-card-actions-left">
            <UploadAttach files={files} onChange={setFiles} disabled={busy} />
            <SlideCountPicker value={slideCount} onChange={setSlideCount} />
          </div>
          <PkButton data-pk="cta-create" disabled={topic.trim().length < 5 || busy} type="submit">
            Создать
          </PkButton>
        </div>
        {files.length ? (
          <p className="upload-attach-hint">
            Прикреплено: {files.map((f) => f.name).join(", ")}
          </p>
        ) : null}
      </form>
      <ThemePicker value={theme} onChange={setTheme} />
    </>
  );
}
