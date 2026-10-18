import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PkButton } from "./PkButton";
import { ThemePicker } from "./ThemePicker";
import { SlideCountPicker } from "./SlideCountPicker";
import { UploadAttach } from "./UploadAttach";
import { api, apiUrl } from "../api";
import {
  Deck,
  SLIDE_COUNT_DEFAULT,
  deckBusyLabel,
  findPendingBuildDeck,
  getInFlightBuild,
  rememberInFlightBuild,
  sanitizeDeckTheme,
} from "../decks";
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
  const [lockLabel, setLockLabel] = useState(() => {
    const inflight = getInFlightBuild();
    return inflight ? deckBusyLabel(inflight.status, inflight.activity) : "";
  });
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), { credentials: "include" });
        if (!res.ok) return;
        const data = await api<{ decks: Deck[] }>("/api/decks");
        if (cancelled) return;
        const found = findPendingBuildDeck(data.decks);
        if (found) {
          setLockLabel(deckBusyLabel(found.status));
        } else {
          if (getInFlightBuild()?.deckId !== "pending") rememberInFlightBuild(null);
          setLockLabel("");
        }
      } catch {
        /* landing stays a normal create form */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function goCreate(t: string) {
    if (lockLabel) {
      nav("/app");
      return;
    }
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
          disabled={Boolean(lockLabel)}
        />
        <div className="actions">
          <div className="prompt-card-actions-left">
            <UploadAttach files={files} onChange={setFiles} disabled={busy || Boolean(lockLabel)} />
            <SlideCountPicker value={slideCount} onChange={setSlideCount} disabled={Boolean(lockLabel)} />
          </div>
          <PkButton
            data-pk="cta-create"
            disabled={!lockLabel && (topic.trim().length < 5 || busy)}
            type="submit"
          >
            {lockLabel || (busy ? "Создаём…" : "Создать")}
          </PkButton>
        </div>
        {files.length ? (
          <p className="upload-attach-hint">
            Прикреплено: {files.map((f) => f.name).join(", ")}
          </p>
        ) : null}
      </form>
      <ThemePicker value={theme} onChange={setTheme} disabled={Boolean(lockLabel)} />
    </>
  );
}
