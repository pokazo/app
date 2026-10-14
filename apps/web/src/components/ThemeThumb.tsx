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
      {p === "ocean" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Ocean</span>
          <span className="theme-thumb__title">Спокойный свет</span>
          <span className="theme-thumb__line">Корпоративный cool</span>
        </>
      )}
      {p === "forest" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Moss</span>
          <span className="theme-thumb__title">Природа</span>
          <span className="theme-thumb__line">ESG и продукт</span>
        </>
      )}
      {p === "slate" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Slate</span>
          <span className="theme-thumb__title">Техно-тёмный</span>
          <span className="theme-thumb__line">SaaS без красного</span>
        </>
      )}
      {p === "amber" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Amber</span>
          <span className="theme-thumb__title">Премиум</span>
          <span className="theme-thumb__line">Тёмный + золото</span>
        </>
      )}
      {p === "frost" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Frost</span>
          <span className="theme-thumb__title">Холодный свет</span>
          <span className="theme-thumb__line">Nordic minimal</span>
        </>
      )}
      {p === "wine" && (
        <>
          <span className="theme-thumb__bar" />
          <span className="theme-thumb__kicker">Wine</span>
          <span className="theme-thumb__title">Редакция</span>
          <span className="theme-thumb__line">Бордо акцент</span>
        </>
      )}
    </span>
  );
}
