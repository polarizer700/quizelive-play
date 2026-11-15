import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

import { useGame } from "@entities/game";

export function TvPage() {
  const [draft, setDraft] = useState("");
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? localStorage.getItem("quizelive.hostResume") ?? "");
  const hello = useMemo(() => (token ? { create_room: { host_token: token } } : null), [token]);
  const { view, send } = useGame(hello);
  const [qr, setQr] = useState("");

  // Протухший/чужой resume-токен не крутим вечно: чистим и показываем ввод токена.
  // Чистим только если упал именно сохранённый resume — ошибка нового токена
  // из ссылки не должна сносить resume живой комнаты
  useEffect(() => {
    if (view.error && !view.code && token === localStorage.getItem("quizelive.hostResume")) {
      localStorage.removeItem("quizelive.hostResume");
    }
  }, [view.error, view.code, token]);

  function startFresh() {
    localStorage.removeItem("quizelive.hostResume");
    const url = new URL(window.location.href);
    if (url.searchParams.has("token")) {
      url.searchParams.delete("token");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setDraft("");
    setToken("");
    setQr("");
  }

  useEffect(() => {
    if (!view.code) return undefined;
    const url = `${window.location.origin}/join?code=${view.code}`;
    let cancelled = false;
    void QRCode.toDataURL(url, { margin: 1, width: 320, color: { dark: "#0c0a09", light: "#f6f3ee" } }).then((value) => {
      if (!cancelled) setQr(value);
    });
    return () => {
      cancelled = true;
    };
  }, [view.code]);

  if (!token) {
    return (
      <main className="panel">
        <p className="mark">Экран</p>
        <h1>Токен ведущего</h1>
        <p className="muted">Выпустите его в студии у опубликованной викторины и вставьте сюда. Он действует 12 часов после выпуска.</p>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Вставьте токен" />
        <button className="primary" type="button" onClick={() => setToken(draft.trim())}>
          Открыть комнату
        </button>
      </main>
    );
  }

  if (view.error && !view.code) {
    return (
      <main className="panel">
        <p className="mark">Экран</p>
        <h1>Не удалось открыть комнату</h1>
        <p className="error">{view.error}</p>
        <button className="primary" type="button" onClick={startFresh}>
          Ввести новый токен
        </button>
      </main>
    );
  }

  if (!view.code) {
    return (
      <main className="panel">
        <p className="mark">Экран</p>
        <h1>Открываем комнату…</h1>
        <p className="muted">{view.connected ? "Ждём ответ сервера" : "Нет связи"}</p>
        <button className="choice" type="button" onClick={startFresh}>
          Другой токен
        </button>
      </main>
    );
  }

  const livePhase = view.phase === "question" || view.phase === "reveal";
  if (livePhase && view.question) {
    return (
      <main className="stage-live">
        {view.error ? <p className="error">{view.error}</p> : null}
        <QuestionBoard
          question={view.question}
          reveal={view.phase === "reveal" ? view.reveal : undefined}
          players={view.players}
          answeredIds={view.answeredIds}
          answeredCount={view.answeredCount}
          answeredTotal={view.answeredTotal}
          onNext={() => send({ next_step: {} })}
          action={view.phase === "question" ? "Показать ответ" : "Дальше"}
        />
      </main>
    );
  }

  return (
    <main className="stage-page">
      <header className="topbar">
        <div>
          <p className="mark">Эфир</p>
          <p className="muted">{label(view.phase, view.connected)}</p>
        </div>
        <p className="code">{view.code}</p>
        <button className="choice" type="button" onClick={startFresh}>
          Новая игра
        </button>
      </header>
      {view.error ? <p className="error">{view.error}</p> : null}
      {view.phase === "lobby" || !view.phase ? <Lobby qr={qr} players={view.players} onStart={() => send({ start_game: {} })} /> : null}
      {view.phase === "break" ? <BreakScreen onNext={() => send({ next_step: {} })} /> : null}
      {view.phase === "leaderboard" || view.phase === "finished" ? (
        <Board
          entries={view.board}
          finished={view.phase === "finished"}
          onNext={() => send({ next_step: {} })}
          onNewGame={startFresh}
        />
      ) : null}
    </main>
  );
}

function Lobby({ qr, players, onStart }: { qr: string; players: { id: string; nickname: string; connected: boolean }[]; onStart: () => void }) {
  return (
    <section className="lobby">
      {qr ? <img alt="QR для входа в комнату" src={qr} /> : <div className="qr-empty" />}
      <div>
        <h1>Ждём пульты</h1>
        <ul>
          {players.length === 0 ? <li className="muted">Пока никого</li> : null}
          {players.map((player) => (
            <li key={player.id}>
              {player.nickname}
              {player.connected ? "" : " · отошёл"}
            </li>
          ))}
        </ul>
        <p className="rules">
          Пока все подключаются — как считаются баллы: верный ответ даёт половину очков вопроса, вторая половина
          достаётся за скорость. Чем быстрее отвечаете, тем больше баллов.
        </p>
        <button className="primary" type="button" onClick={onStart}>
          Начать
        </button>
      </div>
    </section>
  );
}

function QuestionBoard({
  question,
  reveal,
  players,
  answeredIds,
  answeredCount,
  answeredTotal,
  onNext,
  action,
}: {
  question: NonNullable<ReturnType<typeof useGame>["view"]["question"]>;
  reveal?: ReturnType<typeof useGame>["view"]["reveal"];
  players: { id: string; nickname: string }[];
  answeredIds: string[];
  answeredCount: number;
  answeredTotal: number;
  onNext: () => void;
  action: string;
}) {
  const left = useSecondsLeft(question.deadline_unix_ms);
  const correct = new Set(reveal?.correct_option_ids ?? []);
  const answered = new Set(answeredIds);
  const answeredNames = players.filter((player) => answered.has(player.id)).map((player) => player.nickname);
  const fitRef = useFitText(question.text);
  const [mediaOrientation, setMediaOrientation] = useState<"portrait" | "landscape">("portrait");

  return (
    <section
      className={question.image_url ? `question-live with-image with-image--${mediaOrientation}` : "question-live"}
    >
      {/* Раунд и таймер — всегда вверху экрана, вне колонки с текстом */}
      <div className="question-meta">
        <p className="kicker">
          {question.round && question.round_total ? `Раунд ${question.round} / ${question.round_total}` : null}
          {question.round && question.round_total && question.category ? " · " : null}
          {question.category || null}
          {question.category || (question.round && question.round_total) ? " · " : null}
          {question.index} / {question.total} · до {question.points} б.
        </p>
        <p className="timer">{left}</p>
      </div>
      {question.image_url ? (
        <div className="question-media">
          <img
            alt=""
            src={question.image_url}
            onLoad={(event) =>
              setMediaOrientation(
                event.currentTarget.naturalHeight > event.currentTarget.naturalWidth ? "portrait" : "landscape",
              )
            }
          />
        </div>
      ) : null}
      <div className="question-body">
        <h1 ref={fitRef} className="question-text">{question.text}</h1>
        {!reveal && answeredTotal > 0 ? (
          <p className="muted">
            Ответили {answeredCount} из {answeredTotal}
            {answeredNames.length ? `: ${answeredNames.join(", ")}` : ""}
          </p>
        ) : null}
        {reveal ? (
          <div className="options">
            {(question.options ?? []).map((option) => (
              <p className={correct.has(option.id) ? "option correct" : "option"} key={option.id}>
                {option.text}
              </p>
            ))}
            {reveal.correct_texts?.length ? <p className="option correct">{reveal.correct_texts.join(" · ")}</p> : null}
          </div>
        ) : null}
        <div className="question-actions">
          <button className="primary" type="button" onClick={onNext}>
            {action}
          </button>
          {reveal ? <p className="muted">Или подождите — дальше само</p> : null}
        </div>
      </div>
    </section>
  );
}

function useFitText(text: string) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const fit = () => {
      el.style.fontSize = "";
      let size = parseFloat(window.getComputedStyle(el).fontSize);
      const min = 18;
      while (size > min && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)) {
        size -= 2;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return ref;
}

function BreakScreen({ onNext }: { onNext: () => void }) {
  return (
    <section className="board">
      <p className="mark">Пауза</p>
      <h1>Перерыв</h1>
      <p className="muted">Налейте чаю, обсудите тактику — дальше будет ещё интереснее.</p>
      <button className="primary" type="button" onClick={onNext}>
        Продолжить
      </button>
    </section>
  );
}

function Board({
  entries,
  finished,
  onNext,
  onNewGame,
}: {
  entries: { nickname: string; score: number; rank: number }[];
  finished: boolean;
  onNext: () => void;
  onNewGame: () => void;
}) {
  return (
    <section className="board">
      <h1>{finished ? "Итог" : "Счёт"}</h1>
      <ol>
        {entries.map((entry) => (
          <li key={entry.nickname}>
            <span>{entry.rank}</span>
            <strong>{entry.nickname}</strong>
            <em>{entry.score}</em>
          </li>
        ))}
      </ol>
      {finished ? (
        <button className="primary" type="button" onClick={onNewGame}>
          Новая игра
        </button>
      ) : (
        <button className="primary" type="button" onClick={onNext}>
          Дальше
        </button>
      )}
      {!finished ? <p className="muted">Или подождите — дальше само</p> : null}
    </section>
  );
}

function useSecondsLeft(deadline: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [deadline]);

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function label(phase: string, connected: boolean) {
  if (!connected) return "Нет связи";
  if (phase === "question") return "Вопрос";
  if (phase === "reveal") return "Ответ";
  if (phase === "leaderboard") return "Промежуточный счёт";
  if (phase === "break") return "Перерыв";
  if (phase === "finished") return "Конец";
  return "Лобби";
}
