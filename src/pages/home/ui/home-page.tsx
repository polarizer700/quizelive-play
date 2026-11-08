export function HomePage() {
  return (
    <main className="home">
      <p className="mark">QuizeLive</p>
      <h1>Куда садимся?</h1>
      <div className="home-links">
        <a className="home-card" href="/tv">
          <span>Экран</span>
          <strong>Телевизор в зале</strong>
        </a>
        <a className="home-card" href="/join">
          <span>Пульт</span>
          <strong>Телефон игрока</strong>
        </a>
      </div>
    </main>
  );
}
