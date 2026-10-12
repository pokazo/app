export type ExampleThumbId =
  | "photosynthesis"
  | "report"
  | "pitch"
  | "ai"
  | "defense"
  | "lesson";

export function ExampleThumb(props: { id: ExampleThumbId; title: string }) {
  const { id, title } = props;
  return (
    <div className={`example-thumb example-thumb--${id}`} aria-label={title}>
      {id === "photosynthesis" && (
        <div className="example-thumb__inner example-thumb__hero-green">
          <span className="example-thumb__kicker">Биология · 8 класс</span>
          <span className="example-thumb__title">Фотосинтез</span>
          <span className="example-thumb__sub">Свет → энергия растения</span>
        </div>
      )}
      {id === "report" && (
        <div className="example-thumb__inner example-thumb__pad">
          <span className="example-thumb__title">Как сделать доклад</span>
          <ol className="example-thumb__steps">
            <li>
              <span className="example-thumb__n">1</span>Тема
            </li>
            <li>
              <span className="example-thumb__n">2</span>План
            </li>
            <li>
              <span className="example-thumb__n">3</span>Ссылка
            </li>
          </ol>
        </div>
      )}
      {id === "pitch" && (
        <div className="example-thumb__inner example-thumb__dark example-thumb__pad">
          <span className="example-thumb__kicker">Работа</span>
          <span className="example-thumb__title example-thumb__title--lg">
            Одна идея —
            <br />
            один слайд
          </span>
          <span className="example-thumb__sub">Без PowerPoint</span>
        </div>
      )}
      {id === "ai" && (
        <div className="example-thumb__inner example-thumb__split">
          <div className="example-thumb__split-text">
            <span className="example-thumb__kicker">Показо</span>
            <span className="example-thumb__title">Нейросеть собирает слайды</span>
            <span className="example-thumb__sub">По теме за минуты</span>
          </div>
          <div className="example-thumb__stack" aria-hidden>
            <i />
            <i />
            <i />
          </div>
        </div>
      )}
      {id === "defense" && (
        <div className="example-thumb__inner example-thumb__defense">
          <div>
            <span className="example-thumb__kicker">Вуз · защита</span>
            <span className="example-thumb__title">Курсовая</span>
            <span className="example-thumb__sub">Структура на 10 минут</span>
          </div>
          <div className="example-thumb__pills">
            <span>Цель</span>
            <span>Метод</span>
            <span>Вывод</span>
          </div>
        </div>
      )}
      {id === "lesson" && (
        <div className="example-thumb__inner example-thumb__night">
          <span className="example-thumb__kicker">За один вечер</span>
          <div>
            <span className="example-thumb__title">Урок готов</span>
            <span className="example-thumb__sub">Открыть в браузере</span>
            <div className="example-thumb__chips">
              <span>Тема</span>
              <span>Слайды</span>
              <span>Ссылка</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
