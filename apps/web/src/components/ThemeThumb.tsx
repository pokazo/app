import type { ThemePreviewId } from "../decks";

export function ThemeThumb(props: { preview: ThemePreviewId }) {
  const p = props.preview;
  return (
    <span className={`theme-thumb theme-thumb--${p}`} aria-hidden>
      {p === "auto" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Авто</span>
          <span className="theme-thumb__title">Тема под бриф</span>
          <span className="theme-thumb__line">Нейросеть выберет стиль</span>
        </>
      )}
      {p === "default" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Clean</span>
          <span className="theme-thumb__title">Чистый свет</span>
          <span className="theme-thumb__line">Универсальный слайд</span>
        </>
      )}
      {p === "seriph" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__title">Доклад</span>
          <span className="theme-thumb__line">Serif · наука</span>
          <span className="theme-thumb__rule" />
          <span className="theme-thumb__line">Колонка текста…</span>
        </>
      )}
      {p === "apple-basic" && (
        <>
          <span className="theme-thumb__title">Keynote</span>
          <span className="theme-thumb__line">Минимум · бизнес</span>
        </>
      )}
      {p === "bricks" && (
        <>
          <span className="theme-thumb__kicker">Bricks</span>
          <span className="theme-thumb__title">Яркие блоки</span>
          <span className="theme-thumb__chips">
            <span className="theme-thumb__chip" />
            <span className="theme-thumb__chip" />
            <span className="theme-thumb__chip" />
          </span>
        </>
      )}
      {p === "shibainu" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Warm</span>
          <span className="theme-thumb__title">Школа и рассказ</span>
          <span className="theme-thumb__line">Тёплый тон бумаги</span>
        </>
      )}
      {p === "ink-dark" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Ink</span>
          <span className="theme-thumb__title">Редакционный</span>
          <span className="theme-thumb__line">Тёмный + акцент</span>
        </>
      )}
      {p === "brand-auto" && (
        <>
          <span className="theme-thumb__brand-row">
            <span className="theme-thumb__stack">
              <span className="theme-thumb__bar" />
              <span className="theme-thumb__kicker">Brand</span>
              <span className="theme-thumb__title">Автобренд</span>
            </span>
            <span className="theme-thumb__mark" />
          </span>
          <span className="theme-thumb__line">Тёмный + красный</span>
        </>
      )}
    </span>
  );
}
