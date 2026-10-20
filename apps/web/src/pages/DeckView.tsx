import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocation, useParams } from "react-router-dom";
import { PkHeader } from "../components/PkHeader";
import { apiUrl } from "../api";
import { embedDeckUrl, slidevNavigateMessage, slidevPageForOutlineIndex } from "../deck-view";
import {
  isPresentChromeRevealZone,
  isTypingTarget,
  PRESENT_CHROME_HIDE_MS,
  shouldAdvanceKey,
  shouldRetreatKey,
} from "../deck-present";
import {
  isDeckId,
  progressiveSlideReveal,
  shouldClearRewriteBusy,
  shouldPollDeckView,
  VIEW_NOT_FOUND_ERR,
  VIEW_WAITING_NOTE,
} from "../deck-view-poll";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  changeDeckTheme,
  deleteDeckSlide,
  focusAfterStructure,
  insertDeckSlide,
  moveDeckSlide,
  structureErrorMessage,
  themeErrorMessage,
  thumbMoveTarget,
} from "../deck-structure";
import {
  EDITABLE_DECK_THEMES,
  SLIDE_COUNT_MAX,
  SLIDE_COUNT_MIN,
  canRethemeDeck,
  sanitizeEditableDeckTheme,
} from "../decks";
import { thumbCoverPath, thumbReactKey } from "../deck-thumb-preview";
import {
  DECK_THUMBS_WIDTH_MAX,
  DECK_THUMBS_WIDTH_MIN,
  clampDeckThumbsWidth,
  readDeckThumbsWidth,
  writeDeckThumbsWidth,
} from "../deck-thumbs-width";
import { DeckThumbPreview } from "./DeckThumbPreview";
import { SpeechModal } from "./SpeechModal";
import { BuildLoader } from "../components/BuildLoader";
import { ThemePicker } from "../components/ThemePicker";
import { shouldShowBuildLoader } from "../deck-ws";
import { useDeckSocket } from "../useDeckSocket";

type Me = { id: string; email: string; name: string };
type Slide = {
  index: number;
  heading: string;
  image?: string | null;
  imageThumb?: string | null;
  slidevIndex?: number;
};
type ViewMeta = {
  topic: string;
  slides: Slide[];
  embedBase: string;
  status?: string;
  building?: boolean;
  activity?: string | null;
  rewritingSlide?: number;
  rewriteError?: string;
};

const WAIT_TIMEOUT_MS = 20 * 60 * 1000;
const POLL_MS = 1000;
/** Matches `@media (max-width: 800px)` — thumbs-only overview, no stage. */
const MOBILE_DECK_MQ = "(max-width: 800px)";

function useMobileDeckOverview() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_DECK_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_DECK_MQ);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mobile;
}

function DeckSideIcon({ name }: { name: "link" | "full" | "theme" | "speech" | "facts" }) {
  const paths: Record<typeof name, string[]> = {
    link: [
      "M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L10.7 6.24",
      "M14 11a5 5 0 0 0-7.54-.54L4.54 12.38a5 5 0 0 0 7.07 7.07l1.69-1.69",
    ],
    full: [
      "M8 3H5a2 2 0 0 0-2 2v3",
      "M16 3h3a2 2 0 0 1 2 2v3",
      "M21 16v3a2 2 0 0 1-2 2h-3",
      "M3 16v3a2 2 0 0 0 2 2h3",
    ],
    theme: [
      "M12 3a9 9 0 1 0 0 18h1.2a1.6 1.6 0 0 0 1.1-2.75 1.6 1.6 0 0 1 1.15-2.75H17a5 5 0 0 0 5-5A9 9 0 0 0 12 3z",
    ],
    speech: ["M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 1 1 18 0z"],
    facts: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5", "M8 13h8", "M8 17h5"],
  };
  return (
    <svg
      className="deck-side-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function DeckView() {
  const { id = "" } = useParams();
  const location = useLocation();
  /** Only from create→view navigation; lost on refresh so the soft waiting copy stays off. */
  const awaitingPreview = Boolean(
    (location.state as { awaitingPreview?: boolean } | null)?.awaitingPreview,
  );
  const mobileOverview = useMobileDeckOverview();
  const layoutRef = useRef<HTMLDivElement>(null);
  const [thumbsWidth, setThumbsWidth] = useState(() =>
    readDeckThumbsWidth(typeof localStorage !== "undefined" ? localStorage : null),
  );
  const thumbsWidthRef = useRef(thumbsWidth);
  const [thumbsResizing, setThumbsResizing] = useState(false);
  const stageRef = useRef<HTMLIFrameElement>(null);
  /** Avoid re-posting the same Slidev page when effect deps churn (meta.slides, etc.). */
  const lastPostedSlidevPageRef = useRef<number | null>(null);
  const stageHostRef = useRef<HTMLDivElement>(null);
  const presentChromeHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presentChromeVisible, setPresentChromeVisible] = useState(false);
  /** True only when signed-in user owns this deck (GET /api/decks/:id). */
  const [isOwner, setIsOwner] = useState(false);
  const [deckTheme, setDeckTheme] = useState("default");
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeBusy, setThemeBusy] = useState(false);
  const [themeErr, setThemeErr] = useState("");

  const [meta, setMeta] = useState<ViewMeta | null>(null);
  const [err, setErr] = useState("");
  const [waiting, setWaiting] = useState(true);
  const [current, setCurrent] = useState(1);
  /** Mobile: list by default; tap thumb opens real Slidev stage fullscreen. */
  const [mobilePresent, setMobilePresent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "pptx" | "facts" | null>(null);
  const [exportErr, setExportErr] = useState("");
  const [speechOpen, setSpeechOpen] = useState(false);
  const [embedKey, setEmbedKey] = useState(0);
  const [building, setBuilding] = useState(false);
  const [activity, setActivity] = useState("");
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteFiles, setRewriteFiles] = useState<File[]>([]);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteErr, setRewriteErr] = useState("");
  const [rewritingSlide, setRewritingSlide] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [structureErr, setStructureErr] = useState("");
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const forcePollRef = useRef(false);
  const rewriteBusyRef = useRef(false);
  /** Set once /api/view reports building after we start an edit — gates busy clear. */
  const seenServerBuildingRef = useRef(false);
  const busyHoldLoggedRef = useRef(false);
  const stayOnSlideRef = useRef<number | null>(null);
  const rewriteFileRef = useRef<HTMLInputElement>(null);

  const markRewriteBusy = (busy: boolean) => {
    rewriteBusyRef.current = busy;
    if (busy) {
      seenServerBuildingRef.current = false;
      busyHoldLoggedRef.current = false;
    }
    setRewriteBusy(busy);
  };

  const deckSocket = useDeckSocket(isDeckId(id) ? id : undefined, Boolean(id));
  useEffect(() => {
    if (mobileOverview) return;
    const onResize = () => {
      if (document.body.classList.contains("is-deck-thumbs-resizing")) return;
      const layoutW = layoutRef.current?.getBoundingClientRect().width;
      setThumbsWidth((w) => {
        const next = clampDeckThumbsWidth(w, layoutW);
        thumbsWidthRef.current = next;
        return next;
      });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOverview]);
  useEffect(() => () => {
    document.body.classList.remove("is-deck-thumbs-resizing");
  }, []);
  useEffect(() => {
    if (deckSocket.activity != null && deckSocket.activity.trim()) {
      setActivity(deckSocket.activity.trim());
    }
  }, [deckSocket.activity]);
  const liveActivity = (deckSocket.activity ?? activity).trim();
  // Until meta arrives, keep assemble labels visible; once ready+idle, drop stale ones.
  const deckBusyForLoader = Boolean(
    !meta ||
      building ||
      rewriteBusy ||
      meta.status === "preview" ||
      meta.status === "generating" ||
      meta.status === "building",
  );
  const showBuildLoader = shouldShowBuildLoader({
    buildLive: deckSocket.buildLive,
    activity: liveActivity || activity,
    deckBusy: deckBusyForLoader,
  });
  const buildLoaderLabel = liveActivity || activity || "Собираю показ";
  const showRewriteForm = Boolean(
    meta && isOwner && meta.status === "ready" && !mobilePresent && !presenting,
  );

  const embedBase = apiUrl(`/p/${id}/`);
  const idOk = isDeckId(id);

  useEffect(() => {
    fetch(apiUrl("/api/auth/me"), { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Me | null) => {
        if (data?.email) setMe(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!idOk || !me) {
      setIsOwner(false);
      return;
    }
    let cancelled = false;
    void fetch(apiUrl(`/api/decks/${id}`), { credentials: "include" })
      .then(async (r) => {
        if (cancelled) return;
        setIsOwner(r.ok);
        if (!r.ok) return;
        try {
          const body = (await r.json()) as { theme?: string };
          setDeckTheme(sanitizeEditableDeckTheme(body.theme));
        } catch {
          /* keep default */
        }
      })
      .catch(() => {
        if (!cancelled) setIsOwner(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, idOk, me]);

  const loadView = useCallback(async () => {
    const r = await fetch(apiUrl(`/api/view/${id}`), { credentials: "include" });
    if (!r.ok) throw new Error("not ready");
    return r.json() as Promise<ViewMeta>;
  }, [id]);

  // Wait for first preview dist, then poll until compose finishes (remount iframe on ready).
  useEffect(() => {
    setMeta(null);
    setErr("");
    setWaiting(true);
    setCurrent(1);
    setStageReady(false);
    setBuilding(false);
    setEmbedKey(0);
    setSpeechOpen(false);
    setRewriteText("");
    markRewriteBusy(false);
    setRewriteErr("");
    setRewritingSlide(null);
    setDeleteConfirm(null);
    setStructureErr("");
    setDragFrom(null);
    setDragOver(null);
    forcePollRef.current = false;
    seenServerBuildingRef.current = false;
    busyHoldLoggedRef.current = false;
    stayOnSlideRef.current = null;

    if (!idOk) {
      setWaiting(false);
      setErr(VIEW_NOT_FOUND_ERR);
      return;
    }

    let cancelled = false;
    let stopped = false;
    let hasMeta = false;
    let isBuilding = false;
    let slideCount = 0;
    const started = Date.now();

    const stopWithError = (message: string) => {
      stopped = true;
      setWaiting(false);
      setErr(message);
    };

    const tick = async () => {
      if (cancelled || stopped) return;
      if (
        !shouldPollDeckView({
          hasMeta,
          building: isBuilding,
          forcePoll: forcePollRef.current,
          rewriteBusy: rewriteBusyRef.current,
        })
      ) {
        return;
      }

      try {
        const data = await loadView();
        if (cancelled || stopped) return;
        const firstMeta = !hasMeta;
        const wasBuilding = hasMeta && isBuilding;
        const nextCount = data.slides.length;
        const serverBuilding = Boolean(data.building);
        const serverRewritingSlide =
          typeof data.rewritingSlide === "number" ? data.rewritingSlide : null;
        const reveal = progressiveSlideReveal({
          prevCount: slideCount,
          nextCount,
          building: serverBuilding,
        });
        hasMeta = true;
        isBuilding = serverBuilding;
        slideCount = nextCount;
        if (isBuilding) {
          forcePollRef.current = true;
          if (!seenServerBuildingRef.current) {
            const awaitingEdit = rewriteBusyRef.current;
            seenServerBuildingRef.current = true;
            if (awaitingEdit) {
              console.info("[edit] rewrite_server_building", {
                deckId: id,
                slide: serverRewritingSlide,
              });
            }
          }
        }
        const rewriteDone = shouldClearRewriteBusy({
          rewriteBusy: rewriteBusyRef.current,
          serverBuilding,
          rewritingSlide: serverRewritingSlide,
          seenServerBuilding: seenServerBuildingRef.current,
        });
        if (
          rewriteBusyRef.current &&
          !serverBuilding &&
          !seenServerBuildingRef.current &&
          !busyHoldLoggedRef.current &&
          (serverRewritingSlide == null || serverRewritingSlide === undefined)
        ) {
          busyHoldLoggedRef.current = true;
          console.info("[edit] rewrite_busy_hold", {
            deckId: id,
            reason: "await_server_building",
          });
        }
        if (!isBuilding && !rewriteBusyRef.current) forcePollRef.current = false;
        setMeta(data);
        setWaiting(false);
        setErr("");
        setBuilding(isBuilding || rewriteBusyRef.current);
        setActivity((data.activity ?? "").trim());
        setRewritingSlide(serverRewritingSlide);
        if (data.rewriteError && !isBuilding) {
          const failed = data.rewriteError;
          console.warn("[edit] rewrite_status_failed", {
            deckId: id,
            slide: serverRewritingSlide,
            error: failed,
          });
          if (/min slides|max slides|bad move|bad slide|structure:/i.test(failed)) {
            setStructureErr(structureErrorMessage(failed));
          } else if (/^theme:/i.test(failed) || /theme/i.test(failed)) {
            setThemeErr(themeErrorMessage(failed));
            setThemeBusy(false);
          } else {
            setRewriteErr(failed);
          }
          markRewriteBusy(false);
          forcePollRef.current = false;
          setBuilding(false);
          setRewritingSlide(null);
        }
        if (firstMeta) {
          setCurrent(data.slides[0]?.index ?? 1);
        } else if (reveal.remount) {
          setStageReady(false);
          setEmbedKey((k) => k + 1);
          if (reveal.focusSlide != null) setCurrent(reveal.focusSlide);
        }
        if ((wasBuilding && !isBuilding) || rewriteDone) {
          if (rewriteDone) {
            console.info("[edit] rewrite_busy_clear", {
              deckId: id,
              via: wasBuilding && !isBuilding ? "building_edge" : "poll_idle_after_seen",
              slide: serverRewritingSlide,
            });
          }
          setStageReady(false);
          setEmbedKey((k) => k + 1);
          markRewriteBusy(false);
          setThemeBusy(false);
          seenServerBuildingRef.current = false;
          forcePollRef.current = false;
          setBuilding(false);
          setActivity("");
          if (!data.rewriteError) {
            setStructureErr("");
            setRewriteText("");
            setRewriteFiles([]);
            if (rewriteFileRef.current) rewriteFileRef.current.value = "";
          }
          const stay = stayOnSlideRef.current;
          stayOnSlideRef.current = null;
          const max = data.slides.length || 1;
          if (stay != null) {
            setCurrent(Math.min(max, Math.max(1, stay)));
          } else {
            // Keep the page the user is on after progressive reveal / final remount.
            setCurrent((c) => Math.min(max, Math.max(1, c)));
          }
        }
      } catch {
        if (cancelled || stopped || hasMeta) return;
        try {
          const dr = await fetch(apiUrl(`/api/decks/${id}`), { credentials: "include" });
          if (cancelled || stopped) return;
          if (dr.status === 404) {
            stopWithError(VIEW_NOT_FOUND_ERR);
            return;
          }
          if (dr.ok) {
            const d = (await dr.json()) as {
              status?: string;
              error?: string;
              activity?: string | null;
            };
            if (d.activity) setActivity(d.activity.trim());
            if (d.status === "failed") {
              stopWithError(d.error || "Не собралось");
              return;
            }
          }
        } catch {
          /* public link — keep waiting for /api/view */
        }
        if (Date.now() - started > WAIT_TIMEOUT_MS) {
          stopWithError(VIEW_NOT_FOUND_ERR);
        }
      }
    };

    void tick();
    const t = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [id, idOk, loadView]);

  const last = meta?.slides.length ?? 1;
  const go = useCallback(
    (n: number) => {
      setCurrent(Math.min(last, Math.max(1, n)));
    },
    [last],
  );

  useEffect(() => {
    if (!mobileOverview) setMobilePresent(false);
  }, [mobileOverview]);

  const showStage = !mobileOverview || mobilePresent;

  useEffect(() => {
    if (!stageReady) {
      lastPostedSlidevPageRef.current = null;
      return;
    }
    if (!showStage) return;
    const page = slidevPageForOutlineIndex(meta?.slides ?? [], current);
    if (lastPostedSlidevPageRef.current === page) return;
    lastPostedSlidevPageRef.current = page;
    stageRef.current?.contentWindow?.postMessage(slidevNavigateMessage(page), "*");
  }, [current, stageReady, meta?.slides, showStage]);

  useEffect(() => {
    function onAnimLog(ev: MessageEvent) {
      const data = ev.data;
      if (!data || data.target !== "pokazo" || data.type !== "anim-log") return;
      console.log("[pk-anim]", ...(Array.isArray(data.args) ? data.args : []));
    }
    window.addEventListener("message", onAnimLog);
    return () => window.removeEventListener("message", onAnimLog);
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setPresenting(document.fullscreenElement === stageHostRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const clearPresentChromeHide = useCallback(() => {
    if (presentChromeHideRef.current != null) {
      clearTimeout(presentChromeHideRef.current);
      presentChromeHideRef.current = null;
    }
  }, []);

  const schedulePresentChromeHide = useCallback(() => {
    clearPresentChromeHide();
    presentChromeHideRef.current = setTimeout(() => {
      presentChromeHideRef.current = null;
      setPresentChromeVisible(false);
    }, PRESENT_CHROME_HIDE_MS);
  }, [clearPresentChromeHide]);

  const revealPresentChrome = useCallback(() => {
    setPresentChromeVisible(true);
    schedulePresentChromeHide();
  }, [schedulePresentChromeHide]);

  useEffect(() => {
    if (!presenting) {
      clearPresentChromeHide();
      setPresentChromeVisible(false);
      return;
    }
    revealPresentChrome();
    return () => clearPresentChromeHide();
  }, [presenting, revealPresentChrome, clearPresentChromeHide]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (shouldAdvanceKey(e.key)) {
        e.preventDefault();
        go(current + 1);
      } else if (shouldRetreatKey(e.key)) {
        e.preventDefault();
        go(current - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, go]);

  useEffect(() => {
    document.querySelector(`[data-thumb="${current}"]`)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [current]);

  async function onOut() {
    await fetch(apiUrl("/api/auth/sign-out"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    setMe(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function downloadExport(format: "pdf" | "pptx" | "facts") {
    if (!id || !isOwner || exporting || building) return;
    setExporting(format);
    setExportErr("");
    try {
      const res = await fetch(apiUrl(`/api/decks/${id}/export/${format}`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
      const plain = /filename="([^"]+)"/i.exec(cd);
      const fallbackExt = format === "facts" ? "zip" : format;
      const name = star
        ? decodeURIComponent(star[1])
        : plain?.[1] || `${meta?.topic || "presentation"}.${fallbackExt}`;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setExportErr("Не удалось сохранить файл. Попробуйте ещё раз.");
    } finally {
      setExporting(null);
    }
  }

  const structureReady = Boolean(
    me && isOwner && meta && meta.status === "ready" && !building && !rewriteBusy,
  );
  const rethemeReady = canRethemeDeck({
    isOwner: Boolean(me && isOwner),
    status: meta?.status,
    building: building || rewriteBusy || themeBusy,
  });

  const onChangeTheme = async (next: string) => {
    if (!id || !rethemeReady || themeBusy) return;
    const theme = sanitizeEditableDeckTheme(next);
    if (theme === deckTheme) {
      setThemeOpen(false);
      return;
    }
    setThemeErr("");
    setThemeBusy(true);
    markRewriteBusy(true);
    forcePollRef.current = true;
    seenServerBuildingRef.current = false;
    try {
      await changeDeckTheme(id, theme);
      setDeckTheme(theme);
      setThemeOpen(false);
      setBuilding(true);
    } catch (e) {
      markRewriteBusy(false);
      forcePollRef.current = false;
      setThemeBusy(false);
      setThemeErr(themeErrorMessage(String(e instanceof Error ? e.message : e)));
    }
  };

  async function runStructure(
    focusSlide: number,
    activityLabel: string,
    request: () => Promise<{ slide: number }>,
  ) {
    if (!id || !structureReady) return;
    setStructureErr("");
    markRewriteBusy(true);
    setActivity(activityLabel);
    stayOnSlideRef.current = focusSlide;
    forcePollRef.current = true;
    setBuilding(true);
    setRewritingSlide(focusSlide);
    try {
      const accepted = await request();
      stayOnSlideRef.current = focusAfterStructure(accepted.slide, Math.max(last, accepted.slide));
    } catch (err) {
      markRewriteBusy(false);
      forcePollRef.current = false;
      setBuilding(false);
      setRewritingSlide(null);
      setActivity("");
      console.warn("[edit] structure_failed", {
        deckId: id,
        slide: focusSlide,
        err: err instanceof Error ? err.message : String(err),
      });
      setStructureErr(
        structureErrorMessage(err instanceof Error ? err.message : String(err)),
      );
    }
  }

  async function onMoveSlideTo(from: number, to: number) {
    if (from === to) return;
    await runStructure(to, "Правлю слайды…", () => moveDeckSlide(id, from, to));
  }

  async function onMoveSlide(n: number, direction: "up" | "down") {
    const to = thumbMoveTarget(n, direction, last);
    if (to == null) return;
    await onMoveSlideTo(n, to);
  }

  async function onDeleteSlide(n: number) {
    setDeleteConfirm(null);
    await runStructure(n, "Правлю слайды…", () => deleteDeckSlide(id, n));
  }

  async function onAddSlide() {
    await runStructure(current + 1, "Добавляю слайд…", () => insertDeckSlide(id, current));
  }

  async function submitRewrite() {
    // Use ref so a second click cannot start another POST before React re-renders.
    if (!id || !me || building || rewriteBusyRef.current) {
      console.warn("[edit] rewrite_submit_skipped", {
        deckId: id,
        slide: current,
        reason: !id ? "no_id" : !me ? "no_me" : building ? "building" : "rewrite_busy",
      });
      return;
    }
    const instruction = rewriteText.trim();
    if (instruction.length < 2 && rewriteFiles.length === 0) {
      setRewriteErr("Напишите, что переделать, или прикрепите картинку.");
      return;
    }
    setRewriteErr("");
    markRewriteBusy(true);
    setActivity("Правлю слайд…");
    stayOnSlideRef.current = current;
    forcePollRef.current = true;
    setBuilding(true);
    setRewritingSlide(current);
    console.info("[edit] rewrite_submit", {
      deckId: id,
      slide: current,
      instruction: instruction.slice(0, 120),
      files: rewriteFiles.length,
    });
    try {
      let res: Response;
      if (rewriteFiles.length > 0) {
        const form = new FormData();
        form.set("instruction", instruction || "Замени картинку на этом слайде на прикреплённое фото.");
        for (const f of rewriteFiles.slice(0, 5)) form.append("files", f);
        res = await fetch(apiUrl(`/api/decks/${id}/slides/${current}/rewrite`), {
          method: "POST",
          credentials: "include",
          body: form,
        });
      } else {
        res = await fetch(apiUrl(`/api/decks/${id}/slides/${current}/rewrite`), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        });
      }
      if (res.status === 202) {
        console.info("[edit] rewrite_accepted", { deckId: id, slide: current });
        // Keep instruction text visible while «Пересобираем…» — clear after success.
        return;
      }
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        reason?: string;
        status?: string;
      };
      if (res.status === 401) {
        forcePollRef.current = false;
        setBuilding(false);
        markRewriteBusy(false);
        setRewritingSlide(null);
        stayOnSlideRef.current = null;
        console.warn("[edit] rewrite_rejected", { deckId: id, slide: current, status: 401 });
        setRewriteErr("Войдите, чтобы пересобрать слайд.");
        return;
      }
      if (res.status === 409) {
        // Server may still be rewriting — keep polling; do not pretend we are idle.
        forcePollRef.current = true;
        console.warn("[edit] rewrite_rejected", {
          deckId: id,
          slide: current,
          status: 409,
          reason: body.reason ?? body.status ?? body.error ?? "busy",
        });
        setRewriteErr("Сейчас идёт сборка — подождите и попробуйте снова.");
        return;
      }
      forcePollRef.current = false;
      setBuilding(false);
      markRewriteBusy(false);
      setRewritingSlide(null);
      stayOnSlideRef.current = null;
      console.warn("[edit] rewrite_rejected", {
        deckId: id,
        slide: current,
        status: res.status,
        error: body.error,
      });
      setRewriteErr(body.error || "Не удалось запустить пересборку.");
    } catch (err) {
      forcePollRef.current = false;
      setBuilding(false);
      markRewriteBusy(false);
      setRewritingSlide(null);
      stayOnSlideRef.current = null;
      console.warn("[edit] rewrite_network_failed", { deckId: id, slide: current, err });
      setRewriteErr("Не удалось запустить пересборку.");
    }
  }

  const slides = meta?.slides ?? [];
  const rewriteReady = Boolean(
    me && isOwner && meta && meta.status === "ready" && !building && !rewriteBusy,
  );
  const shellClass = [
    "deck-shell",
    mobileOverview ? "is-mobile-overview" : "",
    mobileOverview && mobilePresent ? "is-mobile-present" : "",
  ]
    .filter(Boolean)
    .join(" ");

  function openSlide(n: number) {
    go(n);
    if (mobileOverview) {
      setStageReady(false);
      setMobilePresent(true);
    }
  }

  function onThumbsResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (mobileOverview || e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const startX = e.clientX;
    const startW = thumbsWidthRef.current;
    handle.setPointerCapture(e.pointerId);
    setThumbsResizing(true);
    document.body.classList.add("is-deck-thumbs-resizing");

    const widthAt = (clientX: number) => {
      const layoutW = layoutRef.current?.getBoundingClientRect().width;
      return clampDeckThumbsWidth(startW + clientX - startX, layoutW);
    };
    const apply = (clientX: number) => {
      const next = widthAt(clientX);
      thumbsWidthRef.current = next;
      layoutRef.current?.style.setProperty("--deck-thumbs-w", `${next}px`);
      handle.setAttribute("aria-valuenow", String(next));
      return next;
    };
    const end = (ev: PointerEvent) => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      if (handle.hasPointerCapture(ev.pointerId)) handle.releasePointerCapture(ev.pointerId);
      const next = ev.type === "pointercancel" ? thumbsWidthRef.current : apply(ev.clientX);
      document.body.classList.remove("is-deck-thumbs-resizing");
      setThumbsWidth(next);
      setThumbsResizing(false);
      writeDeckThumbsWidth(next, localStorage);
    };
    const onMove = (ev: PointerEvent) => {
      apply(ev.clientX);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  async function enterPresent() {
    const el = stageHostRef.current;
    if (!el || typeof el.requestFullscreen !== "function") return;
    try {
      await el.requestFullscreen();
    } catch {
      /* denied / unavailable — stay in normal view */
    }
  }

  async function exitPresent() {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }

  function onPresentHostMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!presenting) return;
    const host = stageHostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (isPresentChromeRevealZone(e.clientY, { top: rect.top, height: rect.height })) {
      revealPresentChrome();
    }
  }

  return (
    <div className={shellClass}>
      <PkHeader me={me} onOut={me ? onOut : undefined} />
      <div className="deck-toolbar">
        {mobileOverview && mobilePresent ? (
          <>
            <button
              type="button"
              className="pk ghost deck-mobile-back"
              onClick={() => setMobilePresent(false)}
            >
              ← Слайды
            </button>
            <span className="deck-pos">
              {current} / {last}
            </span>
          </>
        ) : (
          <p className="deck-title">{meta?.topic || "Презентация"}</p>
        )}
      </div>
      {err ? <p className="err app-note">{err}</p> : null}
      {exportErr ? <p className="err app-note">{exportErr}</p> : null}
      {themeErr ? <p className="err app-note">{themeErr}</p> : null}
      {themeOpen && isOwner && meta?.status === "ready" ? (
        <div className="deck-theme-panel" role="dialog" aria-label="Сменить тему">
          <ThemePicker
            value={deckTheme}
            onChange={(id) => void onChangeTheme(id)}
            disabled={!rethemeReady}
            themes={EDITABLE_DECK_THEMES}
            name="deck-retheme"
          />
        </div>
      ) : null}
      {waiting && !err && !showStage && (activity || awaitingPreview || showBuildLoader) ? (
        <div className="deck-waiting-build">
          {showBuildLoader ? <BuildLoader label={buildLoaderLabel} /> : null}
          {!showBuildLoader ? (
            <p className="app-note deck-building">{activity || VIEW_WAITING_NOTE}</p>
          ) : null}
        </div>
      ) : null}
      {building && meta && !showBuildLoader ? (
        <p className="app-note deck-building">
          {rewritingSlide != null
            ? activity || `Правлю слайд ${rewritingSlide}…`
            : activity || "Собираем остальные слайды…"}
        </p>
      ) : null}
      {speechOpen && id && isOwner && !building ? (
        <SpeechModal
          deckId={id}
          topic={meta?.topic ?? "Презентация"}
          onClose={() => setSpeechOpen(false)}
        />
      ) : null}
      {deleteConfirm != null ? (
        <ConfirmDialog
          title={`Удалить слайд ${deleteConfirm}?`}
          busy={rewriteBusy}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => void onDeleteSlide(deleteConfirm)}
        />
      ) : null}
      <div
        className="deck-layout"
        ref={layoutRef}
        style={
          mobileOverview
            ? undefined
            : ({ "--deck-thumbs-w": `${thumbsResizing ? thumbsWidthRef.current : thumbsWidth}px` } as CSSProperties)
        }
      >
        <nav className="deck-thumbs" aria-label="Страницы">
          {slides.map((s) => {
            const cover = thumbCoverPath(s);
            const canEdit = structureReady;
            const itemClass = [
              "deck-thumb-item",
              s.index === current ? "is-current" : "",
              dragFrom === s.index ? "is-dragging" : "",
              dragOver === s.index && dragFrom != null && dragFrom !== s.index ? "is-drag-over" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
            <div
              key={s.index}
              data-thumb={s.index}
              className={itemClass}
              onDragOver={(e) => {
                if (!canEdit || dragFrom == null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOver !== s.index) setDragOver(s.index);
              }}
              onDragLeave={() => {
                if (dragOver === s.index) setDragOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = Number(e.dataTransfer.getData("text/plain") || dragFrom);
                setDragFrom(null);
                setDragOver(null);
                if (!canEdit || !Number.isInteger(from) || from < 1) return;
                void onMoveSlideTo(from, s.index);
              }}
            >
              <button
                type="button"
                className={`deck-thumb${s.index === current ? " is-current" : ""}`}
                draggable={canEdit}
                aria-label={s.heading ? `${s.index}. ${s.heading}` : `Страница ${s.index}`}
                aria-current={s.index === current ? "true" : undefined}
                title={canEdit ? "Перетащите, чтобы поменять порядок" : undefined}
                onDragStart={(e) => {
                  if (!canEdit) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData("text/plain", String(s.index));
                  e.dataTransfer.effectAllowed = "move";
                  setDragFrom(s.index);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onClick={() => openSlide(s.index)}
              >
                <DeckThumbPreview
                  key={thumbReactKey(s.index)}
                  embedBase={embedBase}
                  embedCacheKey={embedKey}
                  index={s.slidevIndex ?? s.index}
                  heading={s.heading || `Слайд ${s.index}`}
                  imageUrl={
                    cover
                      ? `${apiUrl(`/p/${id}${cover}`)}${embedKey ? `?_r=${embedKey}` : ""}`
                      : null
                  }
                  enabled={mobileOverview || stageReady}
                  active={s.index === current}
                />
              </button>
              {isOwner && meta?.status === "ready" ? (
                <div className="deck-thumb-actions">
                  <button
                    type="button"
                    className="deck-thumb-action"
                    aria-label={`Слайд ${s.index} вверх`}
                    disabled={!canEdit || thumbMoveTarget(s.index, "up", last) == null}
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMoveSlide(s.index, "up");
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="deck-thumb-action"
                    aria-label={`Слайд ${s.index} вниз`}
                    disabled={!canEdit || thumbMoveTarget(s.index, "down", last) == null}
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMoveSlide(s.index, "down");
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="deck-thumb-action danger"
                    aria-label={`Удалить слайд ${s.index}`}
                    disabled={!canEdit || last <= SLIDE_COUNT_MIN}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(s.index);
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : null}
            </div>
            );
          })}
          {isOwner && meta?.status === "ready" ? (
            <button
              type="button"
              className="deck-thumb-add"
              disabled={!structureReady || last >= SLIDE_COUNT_MAX}
              onClick={() => void onAddSlide()}
            >
              Добавить слайд
            </button>
          ) : null}
          {structureErr ? <p className="err deck-thumb-err">{structureErr}</p> : null}
        </nav>
        <div
          className={`deck-thumbs-resizer${thumbsResizing ? " is-dragging" : ""}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Ширина списка слайдов"
          aria-valuemin={DECK_THUMBS_WIDTH_MIN}
          aria-valuemax={DECK_THUMBS_WIDTH_MAX}
          aria-valuenow={thumbsWidth}
          onPointerDown={onThumbsResizePointerDown}
        />
        {thumbsResizing ? <div className="deck-thumbs-resize-shield" /> : null}
        {showStage ? (
          <div
            className={`deck-stage${isOwner && meta?.status === "ready" && !mobilePresent && !presenting ? " has-rewrite" : ""}`}
          >
            <div
              className="deck-stage-host"
              ref={stageHostRef}
              onMouseMove={onPresentHostMouseMove}
            >
              <div className="deck-stage-frame">
                {id && meta && !err ? (
                  <iframe
                    key={embedKey}
                    ref={stageRef}
                    title={meta.topic ?? "Презентация"}
                    src={`${embedDeckUrl(embedBase)}${embedKey ? `&_r=${embedKey}` : ""}`}
                    fetchPriority="high"
                    onLoad={() => setStageReady(true)}
                  />
                ) : null}
                <div className="deck-stage-nav" aria-hidden>
                  {presenting ? (
                    <button
                      type="button"
                      className="deck-hit deck-hit-advance"
                      onClick={() => go(current + 1)}
                    />
                  ) : (
                    <>
                      <button type="button" className="deck-hit left" onClick={() => go(current - 1)} />
                      <button type="button" className="deck-hit right" onClick={() => go(current + 1)} />
                    </>
                  )}
                </div>
              </div>
              {presenting ? (
                <div
                  className={`deck-present-chrome${presentChromeVisible ? "" : " is-hidden"}`}
                  onMouseEnter={clearPresentChromeHide}
                  onMouseLeave={schedulePresentChromeHide}
                >
                  <button
                    type="button"
                    className="pk ghost deck-present-nav"
                    aria-label="Предыдущий слайд"
                    disabled={current <= 1}
                    onClick={() => go(current - 1)}
                  >
                    ←
                  </button>
                  <span className="deck-pos">
                    {current} / {last}
                  </span>
                  <button
                    type="button"
                    className="pk ghost deck-present-nav"
                    aria-label="Следующий слайд"
                    disabled={current >= last}
                    onClick={() => go(current + 1)}
                  >
                    →
                  </button>
                  <button type="button" className="pk ghost" onClick={() => void exitPresent()}>
                    Выйти
                  </button>
                </div>
              ) : null}
              {!showRewriteForm && showBuildLoader ? (
                <BuildLoader label={buildLoaderLabel} corner />
              ) : null}
            </div>
            {showRewriteForm ? (
              <form
                className="deck-rewrite"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitRewrite();
                }}
              >
                <div className="deck-rewrite-row">
                  <input
                    id="deck-rewrite-input"
                    className="deck-rewrite-input"
                    type="text"
                    value={rewriteText}
                    disabled={!rewriteReady}
                    placeholder="Что переделать на этом слайде…"
                    aria-label={`Что переделать на слайде ${current}`}
                    onChange={(e) => setRewriteText(e.target.value)}
                  />
                  <label
                    className="deck-rewrite-file"
                    title={
                      rewriteFiles.length
                        ? `Прикреплено: ${rewriteFiles.map((f) => f.name).join(", ")}`
                        : "Прикрепить картинку"
                    }
                  >
                    <span className="deck-rewrite-file-btn" aria-hidden>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                      {rewriteFiles.length ? (
                        <span className="upload-attach-badge">{rewriteFiles.length}</span>
                      ) : null}
                    </span>
                    <input
                      ref={rewriteFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={!rewriteReady}
                      aria-label="Прикрепить картинку для этого слайда"
                      onChange={(e) =>
                        setRewriteFiles(Array.from(e.target.files ?? []).slice(0, 5))
                      }
                    />
                  </label>
                  <button type="submit" className="pk ghost" disabled={!rewriteReady}>
                    {rewriteBusy || (building && rewritingSlide != null)
                      ? activity || "Правлю слайд…"
                      : "изменить"}
                  </button>
                  {showBuildLoader ? <BuildLoader label={buildLoaderLabel} /> : null}
                </div>
                {rewriteFiles.length ? (
                  <p className="deck-rewrite-hint">
                    Прикреплено: {rewriteFiles.map((f) => f.name).join(", ")}
                  </p>
                ) : null}
                {rewriteErr ? <p className="err app-note">{rewriteErr}</p> : null}
              </form>
            ) : null}
          </div>
        ) : null}
        <aside className="deck-side" aria-label="Действия с презентацией">
          {meta ? (
            <p className="deck-side-pos">
              {current} / {last}
            </p>
          ) : null}
          <h3>Показ</h3>
          <button type="button" className="deck-side-item" onClick={() => void copyLink()}>
            <DeckSideIcon name="link" />
            {copied ? "Скопировано" : "Скопировать ссылку"}
          </button>
          {meta && meta.status === "ready" && !presenting ? (
            <button type="button" className="deck-side-item" onClick={() => void enterPresent()}>
              <DeckSideIcon name="full" />
              На весь экран
            </button>
          ) : null}
          {meta && isOwner ? (
            <>
              <h3>Колода</h3>
              {meta.status === "ready" ? (
                <button
                  type="button"
                  className={`deck-side-item${themeOpen ? " is-open" : ""}`}
                  disabled={building && !themeOpen}
                  title="Сменить тему (пересборка)"
                  onClick={() => setThemeOpen((o) => !o)}
                >
                  <DeckSideIcon name="theme" />
                  Тема
                </button>
              ) : null}
              <button
                type="button"
                className="deck-side-item"
                disabled={building}
                title={building ? "Дождитесь окончания сборки" : undefined}
                onClick={() => setSpeechOpen(true)}
              >
                <DeckSideIcon name="speech" />
                Спич
              </button>
              <button
                type="button"
                className="deck-side-item"
                disabled={!!exporting || building}
                onClick={() => void downloadExport("facts")}
              >
                <DeckSideIcon name="facts" />
                {exporting === "facts" ? "Собираем архив…" : "Факты"}
              </button>
              <h3>Скачать</h3>
              <button
                type="button"
                className="deck-side-item"
                disabled={!!exporting || building}
                onClick={() => void downloadExport("pdf")}
              >
                {exporting === "pdf" ? "Сохраняем PDF…" : "Скачать PDF"}
              </button>
              <button
                type="button"
                className="deck-side-item"
                disabled={!!exporting || building}
                onClick={() => void downloadExport("pptx")}
              >
                {exporting === "pptx" ? "Сохраняем PPTX…" : "Скачать PPTX"}
              </button>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
