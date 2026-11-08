import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { useGame } from "@entities/game";

export function TvPage() {
  const [draft, setDraft] = useState("");
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? sessionStorage.getItem("quizelive.hostResume") ?? "");
  const hello = useMemo(() => (token ? { create_room: { host_token: token } } : null), [token]);
  const { view, send } = useGame(hello);
  const [qr, setQr] = useState("");

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
        <p className="muted">Выпустите его в студии у опубликованной викторины и вставьте сюда. Он действует около двух минут.</p>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Вставьте токен" />
        <button className="primary" type="button" onClick={() => setToken(draft.trim())}>
          Открыть комнату
        </button>
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
        {view.code ? <p className="code">{view.code}</p> : null}
      </header>
      {view.error ? <p className="error">{view.error}</p> : null}
      {!view.code ? (
        <button
          className="choice"
          type="button"
          onClick={() => {
            sessionStorage.removeItem("quizelive.hostResume");
            setToken("");
          }}
        >
          Другой токен
        </button>
      ) : null}
      {view.phase === "lobby" || !view.phase ? <Lobby qr={qr} players={view.players} onStart={() => send({ start_game: {} })} /> : null}
      {view.phase === "question" && view.question ? (
        <QuestionBoard question={view.question} onNext={() => send({ next_step: {} })} action="Показать ответ" />
      ) : null}
      {view.phase === "reveal" && view.question ? (
        <QuestionBoard question={view.question} reveal={view.reveal} onNext={() => send({ next_step: {} })} action="Таблица" />
      ) : null}
      {view.phase === "leaderboard" || view.phase === "finished" ? (
        <Board entries={view.board} finished={view.phase === "finished"} onNext={() => send({ next_step: {} })} />
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
  onNext,
  action,
}: {
  question: NonNullable<ReturnType<typeof useGame>["view"]["question"]>;
  reveal?: ReturnType<typeof useGame>["view"]["reveal"];
  onNext: () => void;
  action: string;
}) {
  const left = useSecondsLeft(question.deadline_unix_ms);
  const correct = new Set(reveal?.correct_option_ids ?? []);

  return (
    <section className="question">
      <p className="kicker">
        {question.index} / {question.total}
        {question.type === "text" ? "" : ""}
      </p>
      <h1>{question.text}</h1>
      <p className="timer">{left}</p>
      <div className="options">
        {(question.options ?? []).map((option) => (
          <p className={correct.has(option.id) ? "option correct" : "option"} key={option.id}>
            {option.text}
          </p>
        ))}
        {question.type === "text" ? <p className="option">Игроки вписывают ответ</p> : null}
        {reveal?.correct_texts?.length ? <p className="option correct">{reveal.correct_texts.join(" · ")}</p> : null}
      </div>
      <button className="primary" type="button" onClick={onNext}>
        {action}
      </button>
    </section>
  );
}

function Board({ entries, finished, onNext }: { entries: { nickname: string; score: number; rank: number }[]; finished: boolean; onNext: () => void }) {
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
      {finished ? null : (
        <button className="primary" type="button" onClick={onNext}>
          Дальше
        </button>
      )}
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
  if (phase === "leaderboard") return "Таблица";
  if (phase === "finished") return "Конец";
  return "Лобби";
}
