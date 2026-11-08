import { useMemo, useState } from "react";

import { useGame, type Question } from "@entities/game";

type SavedPlayer = { code: string; nickname: string; player_token?: string };

export function JoinPage() {
  const saved = readPlayer();
  const preset = new URLSearchParams(window.location.search).get("code") ?? saved?.code ?? "";
  const [code, setCode] = useState(preset);
  const [nickname, setNickname] = useState(saved?.nickname ?? "");
  const [session, setSession] = useState<SavedPlayer | null>(saved?.player_token ? saved : null);
  const hello = useMemo(
    () =>
      session
        ? { join_room: { code: session.code, nickname: session.nickname, player_token: session.player_token ?? "" } }
        : null,
    [session],
  );
  const { view, send } = useGame(hello);

  if (!session) {
    return (
      <main className="panel">
        <p className="mark">Пульт</p>
        <h1>Войти в комнату</h1>
        <input inputMode="numeric" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Код" />
        <input maxLength={20} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Имя" />
        <button
          className="primary"
          type="button"
          onClick={() => setSession({ code, nickname: nickname.trim() })}
        >
          Войти
        </button>
      </main>
    );
  }

  const question = view.question;
  const correct = new Set(view.reveal?.correct_option_ids ?? []);

  return (
    <main className="panel">
      <p className="mark">{view.code || session.code}</p>
      {view.error ? <p className="error">{view.error}</p> : null}
      {!view.connected ? <p className="muted">Подключаемся…</p> : null}
      {view.phase === "lobby" ? <h1>Вы в комнате. Ждём старт.</h1> : null}
      {view.phase === "question" && question && !view.accepted ? (
        <AnswerForm
          key={question.question_id}
          question={question}
          onSubmit={(optionIds, answer) =>
            send({
              submit_answer: {
                question_id: question.question_id,
                option_ids: optionIds,
                text: answer,
              },
            })
          }
        />
      ) : null}
      {view.accepted && view.phase === "question" ? <h1>Ответ принят</h1> : null}
      {view.phase === "reveal" && question ? (
        <section>
          <h1>{question.text}</h1>
          <div className="choices">
            {(question.options ?? []).map((option) => (
              <p className={correct.has(option.id) ? "choice correct" : "choice"} key={option.id}>
                {option.text}
              </p>
            ))}
            {view.reveal?.correct_texts?.map((item) => (
              <p className="choice correct" key={item}>
                {item}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      {view.phase === "leaderboard" || view.phase === "finished" ? <Place board={view.board} nickname={session.nickname} finished={view.phase === "finished"} /> : null}
    </main>
  );
}

function AnswerForm({ question, onSubmit }: { question: Question; onSubmit: (optionIds: string[], text: string) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(question.type === "text" ? [] : picked, question.type === "text" ? text : "");
      }}
    >
      <p className="kicker">
        {question.index} / {question.total}
      </p>
      <h1>{question.text}</h1>
      {question.type === "text" ? (
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ответ" />
      ) : (
        <div className="choices">
          {(question.options ?? []).map((option) => (
            <button
              className={picked.includes(option.id) ? "choice picked" : "choice"}
              key={option.id}
              type="button"
              onClick={() => setPicked((current) => toggle(current, option.id, question.type === "single"))}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}
      <button className="primary" type="submit">
        Ответить
      </button>
    </form>
  );
}

function Place({ board, nickname, finished }: { board: { nickname: string; score: number; rank: number }[]; nickname: string; finished: boolean }) {
  const mine = board.find((entry) => entry.nickname === nickname);
  return (
    <section>
      <h1>{finished ? "Итог" : "Пока так"}</h1>
      {mine ? (
        <p className="place">
          {mine.rank} место · {mine.score}
        </p>
      ) : (
        <p className="muted">Счёт появится на экране</p>
      )}
    </section>
  );
}

function toggle(current: string[], id: string, single: boolean) {
  if (single) return [id];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

function readPlayer(): SavedPlayer | null {
  const raw = sessionStorage.getItem("quizelive.player");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedPlayer;
    if (!parsed.code || !parsed.nickname) return null;
    return parsed;
  } catch {
    return null;
  }
}
