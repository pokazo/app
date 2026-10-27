export type ExampleThumbId =
  | "photosynthesis"
  | "pdd"
  | "fractions"
  | "report"
  | "cosmos"
  | "volcano"
  | "war1812"
  | "pitch"
  | "kpi"
  | "hire"
  | "ai"
  | "city-family"
  | "class-hour"
  | "eco"
  | "defense"
  | "seminar-ai"
  | "med"
  | "lesson";

type Tone =
  | "moss"
  | "volt"
  | "candy"
  | "ink"
  | "neon"
  | "sunset"
  | "amber"
  | "split"
  | "coral"
  | "ocean"
  | "defense"
  | "night"
  | "bricks"
  | "wine";

type ThumbSpec = {
  tone: Tone;
  kicker: string;
  title: string;
  sub: string;
  chips?: string[];
  steps?: string[];
};

const SPECS: Record<ExampleThumbId, ThumbSpec> = {
  photosynthesis: {
    tone: "moss",
    kicker: "Биология · 8 класс",
    title: "Фотосинтез",
    sub: "Свет → энергия растения",
  },
  pdd: {
    tone: "volt",
    kicker: "ОБЖ · 2 класс",
    title: "ПДД",
    sub: "Правила, знаки, безопасный путь",
    chips: ["Знак", "Переход", "Тест"],
  },
  fractions: {
    tone: "candy",
    kicker: "Математика · 5 класс",
    title: "Дроби",
    sub: "Пицца, доли и сравнение",
    chips: ["½", "⅓", "¾"],
  },
  report: {
    tone: "bricks",
    kicker: "Школа",
    title: "Как сделать доклад",
    sub: "Тема → план → ссылка",
    steps: ["Тема", "План", "Ссылка"],
  },
  cosmos: {
    tone: "neon",
    kicker: "Доклад · 6 класс",
    title: "Космос",
    sub: "Планеты, орбиты, вывод",
  },
  volcano: {
    tone: "sunset",
    kicker: "География",
    title: "Вулканы",
    sub: "Магма, извержение, карта",
  },
  war1812: {
    tone: "amber",
    kicker: "История",
    title: "1812 год",
    sub: "Причины → ход → итог",
  },
  pitch: {
    tone: "ink",
    kicker: "Работа",
    title: "Одна идея — один слайд",
    sub: "Без PowerPoint",
  },
  kpi: {
    tone: "bricks",
    kicker: "Отчёт",
    title: "Цифры недели",
    sub: "Рост, конверсия, next step",
    chips: ["+18%", "OKR", "Go"],
  },
  hire: {
    tone: "ocean",
    kicker: "HR",
    title: "Найм команды",
    sub: "Роль → стек → оффер",
  },
  ai: {
    tone: "split",
    kicker: "Показо",
    title: "Нейросеть собирает слайды",
    sub: "По теме за минуты",
  },
  "city-family": {
    tone: "coral",
    kicker: "Проект",
    title: "Город моей семьи",
    sub: "История, место, вывод",
  },
  "class-hour": {
    tone: "neon",
    kicker: "Классный час",
    title: "Дружба в классе",
    sub: "Ситуации и правила общения",
  },
  eco: {
    tone: "moss",
    kicker: "Экопроект",
    title: "Меньше пластика",
    sub: "Факт → действие → результат",
  },
  defense: {
    tone: "defense",
    kicker: "Вуз · защита",
    title: "Курсовая",
    sub: "Структура на 10 минут",
    chips: ["Цель", "Метод", "Вывод"],
  },
  "seminar-ai": {
    tone: "volt",
    kicker: "Семинар",
    title: "ИИ в науке",
    sub: "Гипотеза → данные → спор",
  },
  med: {
    tone: "wine",
    kicker: "Мед · доклад",
    title: "Клинический случай",
    sub: "Анамнез, диагноз, план",
  },
  lesson: {
    tone: "night",
    kicker: "За один вечер",
    title: "Урок готов",
    sub: "Открыть в браузере",
    chips: ["Тема", "Слайды", "Ссылка"],
  },
};

export function ExampleThumb(props: { id: ExampleThumbId; title: string }) {
  const { id, title } = props;
  const spec = SPECS[id];
  if (!spec) {
    return (
      <div className="example-thumb" aria-label={title}>
        <div className="example-thumb__inner example-thumb__pad">
          <span className="example-thumb__title">{title}</span>
        </div>
      </div>
    );
  }

  const label = title || spec.title;

  if (spec.tone === "split") {
    return (
      <div className={`example-thumb example-thumb--${id}`} aria-label={label}>
        <div className="example-thumb__inner example-thumb__split">
          <div className="example-thumb__split-text">
            <span className="example-thumb__kicker">{spec.kicker}</span>
            <span className="example-thumb__title">{spec.title}</span>
            <span className="example-thumb__sub">{spec.sub}</span>
          </div>
          <div className="example-thumb__stack" aria-hidden>
            <i />
            <i />
            <i />
          </div>
        </div>
      </div>
    );
  }

  if (spec.steps) {
    return (
      <div className={`example-thumb example-thumb--${id}`} aria-label={label}>
        <div className={`example-thumb__inner example-thumb__pad example-thumb__tone-${spec.tone}`}>
          <span className="example-thumb__kicker">{spec.kicker}</span>
          <span className="example-thumb__title">{spec.title}</span>
          <ol className="example-thumb__steps">
            {spec.steps.map((step, i) => (
              <li key={step}>
                <span className="example-thumb__n">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className={`example-thumb example-thumb--${id}`} aria-label={label}>
      <div className={`example-thumb__inner example-thumb__pad example-thumb__tone-${spec.tone}`}>
        <span className="example-thumb__kicker">{spec.kicker}</span>
        <span className="example-thumb__title example-thumb__title--lg">{spec.title}</span>
        <span className="example-thumb__sub">{spec.sub}</span>
        {spec.chips ? (
          <div className="example-thumb__chips">
            {spec.chips.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
